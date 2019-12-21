import fs from 'fs';
import {
	ExtensionBrowserOperationData,
	ExtensionBrowserOperationEvent,
	ExtensionErrorLogEvent,
	ExtensionEventTypes,
	ExtensionLogEvent,
	ExtensionTestLogEvent,
	GetElementAttrValueData,
	GetElementPropValueData
} from 'last-hit-extensions';
import {
	AjaxStep,
	AnimationStep,
	ChangeStep,
	ClickStep,
	Device,
	DialogCloseStep,
	DialogOpenStep,
	Flow,
	FlowParameter,
	FlowParameters,
	FocusStep,
	KeydownStep,
	MousedownStep,
	PageClosedStep,
	PageCreatedStep,
	PageSwitchStep,
	ScrollStep,
	StartStep,
	Step,
	WorkspaceExtensions
} from 'last-hit-types';
import path from 'path';
import puppeteer, { Browser, CoverageEntry, ElementHandle, Page, Request } from 'puppeteer';
import util from 'util';
import uuidv4 from 'uuid/v4';
import ThirdStepSupport, {
	ElementAttributeValueRetriever,
	ElementRetriever
} from '../3rd-comps/support';
import Environment from '../config/env';
import { Summary } from '../types';
import { generateKeyByString, getTempFolder, inElectron, shorternUrl } from '../utils';
import ci from './ci-helper';
import compareScreenshot from './compare-screenshot';
import { controlPage } from './page-controller';
import ReplaySummary from './replay-summary';
import { WorkspaceExtensionRegistry } from './replayer-extension-registry';
import { ReplayerCache } from './replayers-cache';
import RequestCounter from './request-counter';
import ssim from './ssim';

export type ReplayerOptions = {
	storyName: string;
	flow: Flow;
	env: Environment;
	logger: Console;
	replayers: ReplayerCache;
	registry: WorkspaceExtensionRegistry;
};

const getChromiumExecPath = () => {
	return puppeteer.executablePath().replace('app.asar', 'app.asar.unpacked');
};

const launchBrowser = async (
	replayer: Replayer,
	input: WorkspaceExtensions.FlowParameterValues
) => {
	let step = replayer.getCurrentStep();
	// send step-should-start to extension, replace step when successfully return
	step = await replayer
		.getRegistry()
		.stepShouldStart(replayer.getStoryName(), simplifyFlow(replayer.getFlow(), input), step);

	const { url, device, uuid } = step as StartStep;
	const {
		viewport: { width, height }
	} = device!;
	const browserArgs: Array<string> = [];
	browserArgs.push(`--window-size=${width},${height + 150}`);
	browserArgs.push('--disable-infobars');
	browserArgs.push('--ignore-certificate-errors');
	browserArgs.push('--no-sandbox');
	browserArgs.push('--disable-extensions');
	// browserArgs.push('–-no-zygote')

	const browser = await puppeteer.launch({
		headless: !inElectron,
		executablePath: getChromiumExecPath(),
		args: browserArgs,
		defaultViewport: null,
		slowMo: 20
	});
	const pages = await browser.pages();
	let page;
	if (pages != null && pages.length > 0) {
		page = pages[0];
	} else {
		page = await browser.newPage();
	}
	// set back to replayer
	replayer.setBrowser(browser);
	replayer.putPage(uuid, page, true);
	replayer.setDevice(device!);
	// add control into page
	await controlPage(replayer, page, device!, uuid);
	// open url, timeout to 2 mins
	await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });

	// RESEARCH waste too much time, remove
	// try {
	// 	await page.waitForNavigation();
	// } catch (e) {
	// 	logger.error(e);
	// }

	// you can try this solution about wait for navigateion
	/*
	const [response] = await Promise.all([
		page.waitForNavigation(), // The promise resolves after navigation has finished
		await page.goto(step.url, { waitUntil: 'domcontentloaded' }), // Go to the url will indirectly cause a navigation
	]);
	*/
	// send step-accomplished to extension
	// accomplished only triggerred when step has not error on replaying
	const accomplishedStep = await replayer
		.getRegistry()
		.stepAccomplished(replayer.getStoryName(), simplifyFlow(replayer.getFlow(), input), step);
	if (!accomplishedStep._.passed) {
		// extension says failed
		throw accomplishedStep._.error!;
	}
	return page;
};

const simplifyFlow = (
	flow: Flow,
	input?: WorkspaceExtensions.FlowParameterValues
): WorkspaceExtensions.SimpleFlow => {
	const { name, description, params } = flow;
	return {
		name,
		description,
		params: !input
			? params
			: (Object.keys(input).map(key => {
					return { name: key, type: 'in', value: input[key] } as FlowParameter;
			  }) as FlowParameters)
	};
};

class Replayer {
	private storyName: string;
	private flow: Flow;

	private device: Device | null = null;

	private browser: Browser | null = null;
	/** key is uuid, value is page */
	private pages: { [key in string]: Page } = {};
	private currentIndex: number = 0;
	/** key is uuid, value is request counter */
	private requests: { [key in string]: RequestCounter } = {};

	private summary: ReplaySummary;
	private coverages: Array<CoverageEntry> = [];

	/** true when switch to record, never turn back to false again */
	private onRecord: boolean = false;
	private logger: Console;
	private replayers: ReplayerCache;
	private env: Environment;

	private registry: WorkspaceExtensionRegistry;
	private flowInput: WorkspaceExtensions.FlowParameterValues = {};
	private flowOutput: WorkspaceExtensions.FlowParameterValues = {};
	private testLogs: Array<{
		title: string;
		passed: boolean;
		level: number;
		message?: string;
	}> = [];

	constructor(options: ReplayerOptions) {
		const { storyName, flow, env, logger, replayers, registry } = options;
		this.storyName = storyName;
		this.flow = (() => {
			const { steps = [] as Step[], ...rest } = flow;
			return {
				...rest,
				steps: steps.map((step: Step) => env.wrap(step))
			};
		})();
		this.logger = logger;
		this.summary = new ReplaySummary({ storyName, flow, env });
		this.replayers = replayers;
		this.env = env;
		this.registry = registry;
		this.registry
			.on(ExtensionEventTypes.LOG, this.handleExtensionLog)
			.on(ExtensionEventTypes.ERROR_LOG, this.handleExtensionErrorLog)
			.on(ExtensionEventTypes.BROWSER_OPERATION, this.handlerBrowserOperation)
			.on(ExtensionEventTypes.TEST_LOG, this.handleTestLog);
	}
	private handleExtensionLog = (event: ExtensionLogEvent): void => {
		this.getLogger().log(event);
	};
	private handleExtensionErrorLog = (event: ExtensionErrorLogEvent): void => {
		this.getLogger().error(event);
	};
	private handlerBrowserOperation = (event: ExtensionBrowserOperationEvent): void => {
		const { data } = event;
		switch ((data as ExtensionBrowserOperationData).type) {
			case 'get-element-attr-value':
				this.tryToGetElementAttrValue(data as GetElementAttrValueData);
				break;
			case 'get-element-prop-value':
				this.tryToGetElementPropValue(data as GetElementPropValueData);
				break;
			default:
				const registry = this.getRegistry();
				registry.sendBrowserOperation(registry.getWorkspaceExtensionId(), null);
		}
	};
	private handleTestLog = (event: ExtensionTestLogEvent): void => {
		// console.log(event);
		this.testLogs.push(event.data);
	};
	private getFlowInput(): WorkspaceExtensions.FlowParameterValues {
		return this.flowInput;
	}
	private getFlowOutput(): WorkspaceExtensions.FlowParameterValues {
		return this.flowOutput;
	}
	private getTestLogs() {
		return this.testLogs;
	}
	private async findCurrentPage(uuid?: string): Promise<Page> {
		if (uuid) {
			const page = this.getPage(uuid);
			if (!page) {
				throw new Error(`page[${uuid}] not found`);
			}
			return page;
		} else {
			// uuid not given, try to get first one
			const pages = await this.getBrowser()!.pages();
			if (pages.length === 0) {
				throw new Error(`No page now`);
			} else {
				return pages[0];
			}
		}
	}
	private async tryToGetElementAttrValue(data: GetElementAttrValueData): Promise<void> {
		const { csspath, attrName, pageUuid } = data;
		const registry = this.getRegistry();

		try {
			const page = await this.findCurrentPage(pageUuid);
			const element = await page.$(csspath);
			if (!element) {
				throw new Error(`element[${csspath}] not found`);
			}
			const value = await element.evaluate(
				(node, attrName: string) => node.getAttribute(attrName),
				attrName
			);
			registry.sendBrowserOperation(registry.getWorkspaceExtensionId(), value);
		} catch (e) {
			registry.sendBrowserOperation(registry.getWorkspaceExtensionId(), e);
		}
	}
	private async tryToGetElementPropValue(data: GetElementPropValueData): Promise<void> {
		const { csspath, propName, pageUuid } = data;
		const registry = this.getRegistry();

		try {
			const page = await this.findCurrentPage(pageUuid);
			const element = await page.$(csspath);
			if (!element) {
				throw new Error(`element[${csspath}] not found`);
			}
			const value = await element.evaluate(
				(node, propName: string) => node[propName],
				propName
			);
			registry.sendBrowserOperation(registry.getWorkspaceExtensionId(), value);
		} catch (e) {
			registry.sendBrowserOperation(registry.getWorkspaceExtensionId(), e);
		}
	}
	getRegistry(): WorkspaceExtensionRegistry {
		return this.registry;
	}
	switchToRecord(): Browser {
		this.onRecord = true;
		return this.browser!;
	}
	isOnRecord(): boolean {
		return this.onRecord;
	}
	getLogger(): Console {
		return this.logger;
	}
	private getEnvironment() {
		return this.env;
	}
	getStoryName(): string {
		return this.storyName;
	}
	getFlow(): Flow {
		return this.flow;
	}
	getIdentity(): string {
		return generateKeyByString(this.getStoryName(), this.getFlow().name);
	}
	/**
	 * @returns summary object
	 */
	getSummary(): ReplaySummary {
		return this.summary;
	}
	getSummaryData(): Summary {
		return this.summary.getSummary();
	}
	getCoverageData() {
		return this.coverages;
	}
	getSteps(): Array<Step> {
		return this.flow.steps || [];
	}
	getCurrentIndex(): number {
		return this.currentIndex;
	}
	getCurrentStep(): Step {
		return this.getSteps()[this.getCurrentIndex()];
	}
	/**
	 * @returns null only if not start
	 */
	getBrowser(): Browser | null {
		return this.browser;
	}
	setBrowser(browser: Browser): void {
		this.browser = browser;
	}
	getDevice(): Device | null {
		return this.device;
	}
	setDevice(device: Device): void {
		this.device = device;
	}
	findUuid(page: Page): string | undefined {
		return Object.keys(this.pages).find(id => this.pages[id] === page);
	}
	getPage(uuid: string): Page | null {
		return this.pages[uuid];
	}
	/**
	 * get page by given uuid, throw error when not found
	 */
	async getPageOrThrow(uuid: string): Promise<Page> {
		const page = this.getPage(uuid);
		if (page == null) {
			throw new Error('Page not found.');
		}
		await page.bringToFront();
		return page;
	}
	/**
	 * sometimes page speed is very slow, the page-create, page-switch, popup events are not always in correct order on recording.
	 *
	 * @param force force close exists page when true, force close myself when false
	 * @returns true when successfully put, false means given page has been closed forcely
	 */
	putPage(uuid: string, page: Page, force: boolean): boolean {
		if (this.pages[uuid] != null) {
			// already exists
			if (force) {
				// force is true means given is from popup, then exists is from page-created or page-switched
				// force close exists and put given to cache
				const exists = this.pages[uuid];
				delete this.pages[uuid];
				delete this.requests[uuid];
				exists.close();
				this.pages[uuid] = page;
				this.requests[uuid] = new RequestCounter(page, this.getSummary(), this.getLogger());
				return true;
			} else {
				// force is true means given is from page-created or page-switched, then force close given itself
				// keep cache
				page.close();
				return false;
			}
		} else {
			// not found, put into cache
			this.pages[uuid] = page;
			this.requests[uuid] = new RequestCounter(page, this.getSummary(), this.getLogger());
			return true;
		}
	}
	/**
	 * @return removed page or null if not exists
	 */
	removePage(uuidOrPage: string | Page): string | Page | null {
		if (typeof uuidOrPage === 'string') {
			const page = this.pages[uuidOrPage];
			delete this.pages[uuidOrPage];
			delete this.requests[uuidOrPage];
			return page;
		} else {
			const uuid = this.findUuid(uuidOrPage)!;
			delete this.pages[uuid];
			delete this.requests[uuid];
			return uuidOrPage;
		}
	}
	putRequest(uuid: string, request: Request): void {
		const requests = this.requests[uuid];
		if (requests) {
			this.requests[uuid].create(request);
		}
	}
	offsetRequest(uuid: string, request: Request, success: boolean): void {
		const requests = this.requests[uuid];
		if (requests) {
			requests.offset(request, success);
		}
	}
	private async isRemoteFinsihed(page: Page): Promise<void> {
		const uuid = this.findUuid(page)!;
		const requests = this.requests[uuid];
		// return requests.waitForAllDone();

		// peep next step, if not ajax step, resolve directly to speed up
		const { type } = this.getCurrentStep();
		if (['page-switched', 'page-created'].includes(type)) {
			return requests.waitForAllDone();
		}
		if (['scroll'].includes(type)) {
			return new Promise(resolve => setTimeout(resolve, 30));
		}

		const currentStepIndex = this.getCurrentIndex();
		const nextStep = this.getSteps()[currentStepIndex + 1];
		if (nextStep && nextStep.type === 'ajax') {
			return requests.waitForAllDone();
		} else {
			// wait for several milliseconds, maybe there is some animation or dom changes
			return new Promise(resolve => setTimeout(resolve, 30));
		}
	}
	private async sleepAfterStep(step: Step): Promise<void> {
		const sleep = step.sleep;
		if (sleep && sleep > 0) {
			const wait = util.promisify(setTimeout);
			await wait(sleep);
		}
	}
	private async prepareFlow(): Promise<void> {
		const preparedFlow: WorkspaceExtensions.PreparedFlow | null = await this.getRegistry().flowShouldStart(
			this.getStoryName(),
			simplifyFlow(this.getFlow())
		);
		const { _: { input = {} } = { input: {} } } = preparedFlow || { _: { input: {} } };
		if (Object.keys(input).length === 0) {
			// no input given by scripts
			// use definition
			const { params = [] } = this.getFlow();
			this.flowInput = params
				.filter(param => ['in', 'both'].includes(param.type))
				.reduce((input, param) => {
					input[param.name] = param.value;
					return input;
				}, {} as WorkspaceExtensions.FlowParameterValues);
		} else {
			this.flowInput = input;
		}
	}
	async start() {
		// TODO how to use prepared story? currently ignored
		const preparedStory: WorkspaceExtensions.PreparedStory = await this.getRegistry().prepareStory(
			this.getStoryName()
		);
		await this.prepareFlow();

		const page = await launchBrowser(this, this.getFlowInput());
		await this.isRemoteFinsihed(page);
	}
	private async accomplishFlow(): Promise<void> {
		const accomplishedFlow: WorkspaceExtensions.AccomplishedFlow | null = await this.getRegistry().flowAccomplished(
			this.getStoryName(),
			(() => {
				const flow = simplifyFlow(this.getFlow());
				let { params = [] } = flow;
				// clone
				params = JSON.parse(JSON.stringify(params));
				const input = this.getFlowInput() || {};
				// put instance data into params, and pass to extension
				Object.keys(input).forEach(key => {
					const param = params.find(param => param.name === key);
					if (!param) {
						params.push({ name: key, type: 'in', value: input[key] } as FlowParameter);
					} else {
						param.value = input[key];
					}
				});
				flow.params = params;
				return flow;
			})()
		);
		const { _: { output = {} } = { output: {} } } = accomplishedFlow || { _: { output: {} } };
		if (Object.keys(output).length === 0) {
			// no output given by scripts
			// read out/both from flow input
			const { params = [] } = this.getFlow();
			this.flowOutput = params
				.filter(param => ['out', 'both'].includes(param.type))
				.reduce((output, param) => {
					output[param.name] = this.flowInput[param.name];
					if (typeof output[param.name] === 'undefined') {
						// not found in flow input, find in definition
						output[param.name] = param.value;
					}
					return output;
				}, {} as WorkspaceExtensions.FlowParameterValues);
		} else {
			this.flowOutput = output;
		}
	}
	/**
	 * only called in CI
	 */
	async end(close: boolean): Promise<void> {
		const browser = this.getBrowser();
		if (browser == null) {
			// do nothing, seems not start
		} else {
			await this.accomplishFlow();
			this.getSummary().handleFlowParameters(this.getFlowInput(), this.getFlowOutput());
			this.getSummary().handleScriptTests(this.getTestLogs());
			try {
				const pages = await browser.pages();
				this.coverages = await ci.gatherCoverage(pages);
				browser.disconnect();
			} catch (e) {
				this.getLogger().error('Failed to disconnect from brwoser.');
				this.getLogger().error(e);
			}
			if (close) {
				try {
					await browser.close();
					delete this.replayers[this.getIdentity()];
				} catch (e) {
					this.getLogger().error('Failed to close browser.');
					this.getLogger().error(e);
				}
			}
		}
		this.registry
			.off(ExtensionEventTypes.LOG, this.handleExtensionLog)
			.off(ExtensionEventTypes.ERROR_LOG, this.handleExtensionErrorLog);
	}
	private replaceWithFlowParams(step: Step): Step {
		const newStep = { ...step } as any;

		['checked', 'value'].forEach(propName => {
			const value = step[propName];
			if (!value || typeof value !== 'string') {
				return;
			}
			const flowInput = this.getFlowInput();
			newStep[propName] = Object.keys(flowInput).reduce((value, key) => {
				return value.replace(`\${${key}}`, `${flowInput[key] || ''}`);
			}, value);
		});

		return newStep as Step;
	}
	/**
	 * do next step
	 */
	async next(flow: Flow, index: number, storyName: string) {
		this.flow = flow;
		this.currentIndex = index;
		let step: Step = this.getCurrentStep();
		if (step.type === 'end') {
			return;
		}

		step = this.replaceWithFlowParams(step);

		try {
			// send step-should-start to extension, replace step when successfully return
			step = await this.getRegistry().stepShouldStart(
				this.getStoryName(),
				simplifyFlow(this.getFlow(), this.getFlowInput()),
				step
			);

			const ret = await (async () => {
				switch (step.type) {
					case 'change':
						return await this.executeChangeStep(step as ChangeStep);
					case 'click':
						return await this.executeClickStep(step as ClickStep);
					case 'focus':
						return await this.executeFocusStep(step as FocusStep);
					case 'keydown':
						return await this.executeKeydownStep(step as KeydownStep);
					case 'mousedown':
						return await this.executeMousedownStep(step as MousedownStep);
					case 'animation':
						return await this.executeAnimationStep(step as AnimationStep);
					case 'ajax':
						return await (async () => {
							await this.executeAjaxStep(step as AjaxStep);
							return Promise.resolve({ wait: false });
						})();
					case 'scroll':
						return await this.executeScrollStep(step as ScrollStep);
					case 'dialog-open':
						return await this.executeDialogOpenStep(step as DialogOpenStep);
					case 'dialog-close':
						return await this.executeDialogCloseStep(step as DialogCloseStep);
					case 'page-created':
						return await this.executePageCreatedStep(step as PageCreatedStep);
					case 'page-switched':
						return await this.executePageSwitchedStep(step as PageSwitchStep);
					case 'page-closed':
						return await (async () => {
							await this.executePageClosedStep(step as PageClosedStep);
							return Promise.resolve({ wait: false });
						})();
					case 'end':
						return Promise.resolve({ wait: false });
					default:
						this.getLogger().log(`Step[${step.type}] is not implemented yet.`);
						return Promise.resolve();
				}
			})();

			const page = this.getPage(step.uuid);
			if ((!ret || ret.wait !== false) && page != null) {
				// const page = await this.getPageOrThrow(step.uuid);
				await this.isRemoteFinsihed(page);
			}
			await this.sleepAfterStep(step);

			if (step.image && page != null && !page.isClosed()) {
				const screenshotPath = path.join(getTempFolder(process.cwd())!, 'screen-record');
				if (!fs.existsSync(screenshotPath)) {
					fs.mkdirSync(screenshotPath, { recursive: true });
				}

				const flowPath = path.join(screenshotPath, storyName, flow.name);
				if (!fs.existsSync(flowPath)) {
					fs.mkdirSync(flowPath, { recursive: true });
				}

				const replayImage = await page.screenshot({ encoding: 'base64' });
				const replayImageFilename = path.join(flowPath, step.stepUuid + '_replay.png');
				fs.writeFileSync(replayImageFilename, Buffer.from(replayImage, 'base64'));
				const currentImageFilename = path.join(flowPath, step.stepUuid + '_baseline.png');
				fs.writeFileSync(currentImageFilename, Buffer.from(step.image, 'base64'));

				const ssimData = await ssim(currentImageFilename, replayImageFilename);
				if (ssimData.ssim < 0.96 || ssimData.mcs < 0.96) {
					const diffImage = compareScreenshot(step.image, replayImage);
					const diffImageFilename = path.join(flowPath, step.stepUuid + '_diff.png');
					diffImage.onComplete((data: any) => {
						this.getSummary().compareScreenshot(step);
						data.getDiffImage()
							.pack()
							.pipe(fs.createWriteStream(diffImageFilename));
					});
				}
			}
		} catch (e) {
			// console.error(e);
			await this.handleStepError(step, e);

			// send step-on-error to extension
			const stepOnError = await this.getRegistry().stepOnError(
				this.getStoryName(),
				simplifyFlow(this.getFlow(), this.getFlowInput()),
				step,
				e
			);
			if (!stepOnError._.fixed) {
				// extension says not fixed, throw error
				throw e;
			} else {
				// extension says fixed, ignore error and continue replay
				return;
			}
		}

		// send step-accomplished to extension
		// accomplished only triggerred when step has not error on replaying
		try {
			const accomplishedStep = await this.getRegistry().stepAccomplished(
				this.getStoryName(),
				simplifyFlow(this.getFlow(), this.getFlowInput()),
				step
			);
			if (!accomplishedStep._.passed) {
				// extension says failed
				throw accomplishedStep._.error ||
					new Error(`Fail on step cause by step accomplished extension.`);
			}
		} catch (e) {
			await this.handleStepError(step, e);
			throw e;
		}
	}
	private async handleStepError(step: Step, e: any) {
		const page = this.getPage(step.uuid);
		this.getSummary().handleError(step, e);
		const file_path = `${getTempFolder(process.cwd())}/error-${
			step.uuid
		}-${this.getSteps().indexOf(step)}.png`;
		if (page) {
			await page.screenshot({ path: file_path, type: 'png' });
		} else {
			this.getLogger().log("page don't exsit ");
		}
	}
	private async executeChangeStep(step: ChangeStep): Promise<void> {
		const page = await this.getPageOrThrow(step.uuid);
		const xpath = this.transformStepPathToXPath(step.path);
		this.getLogger().log(`Execute change, step path is ${xpath}, step value is ${step.value}.`);

		const element = await this.findElement(step, page);
		const elementTagName = await this.getElementTagName(element);
		const elementType = await this.getElementType(element);

		let isFileUpload = false;
		if (elementTagName === 'INPUT') {
			if (elementType === 'file') {
				isFileUpload = true;
			}
		}

		if (isFileUpload) {
			const value = step.value!;
			let segments = value.split('\\');
			segments = segments[segments.length - 1].split('/');
			const filename = segments[segments.length - 1];
			const dir = path.join(getTempFolder(process.cwd())!, 'upload-temp', uuidv4());
			const filepath = path.join(dir, filename);
			const byteString = atob(step.file!.split(',')[1]);

			// write the bytes of the string to an ArrayBuffer
			const ab = new ArrayBuffer(byteString.length);
			// create a view into the buffer
			const ia = new Uint8Array(ab);
			// set the bytes of the buffer to the correct values
			for (let i = 0; i < byteString.length; i++) {
				ia[i] = byteString.charCodeAt(i);
			}
			// write the ArrayBuffer to a blob, and you're done
			fs.mkdirSync(dir, { recursive: true });
			fs.writeFileSync(filepath, Buffer.from(ia));

			// file upload
			const [fileChooser] = await Promise.all([
				page.waitForFileChooser(),
				element.evaluate((node: Element) => (node as HTMLElement).click())
			]);
			await fileChooser.accept([filepath]);
		} else {
			// change is change only, cannot use type
			await this.setValueToElement(element, step.value!);

			const env = this.getEnvironment();
			if (env.getSleepAfterChange()) {
				const wait = util.promisify(setTimeout);
				await wait(env.getSleepAfterChange()!);
			}
			if (step.forceBlur) {
				await element.evaluate((node: Element) => {
					(node as any).focus && (node as HTMLElement).focus();
					const event = document.createEvent('HTMLEvents');
					event.initEvent('blur', true, true);
					node.dispatchEvent(event);
				});
			}
		}
	}
	private async executeClickStep(step: ClickStep): Promise<void> {
		const page = await this.getPageOrThrow(step.uuid);
		const xpath = this.transformStepPathToXPath(step.path);
		this.getLogger().log(`Execute click, step path is ${xpath}.`);

		const element = await this.findElement(step, page);
		const elementTagName = await this.getElementTagName(element);

		if ((step.csspath || '').startsWith('#last-hit-wechat-share')) {
			// wechat update share data may have delay time
			// according to experience, delay time might be 1000-5000ms
			// when detect the share button click, force wait for 5000ms, wait the share data updated if exists
			const wait = util.promisify(setTimeout);
			await wait(5000);
			await element.click();
			return;
		}

		const support = this.createThirdStepSupport(page, element);
		const done = await support.click();
		if (done) {
			return;
		}

		if (elementTagName === 'INPUT') {
			const elementType = await this.getElementType(element);
			if (elementType && ['checkbox', 'radio'].includes(elementType.toLowerCase())) {
				// there are some ui-repos, show a div/span/i etc instead of checkbox itself
				// and invoke click event by javascript when user click the visible component
				// it will causes record the click and change event
				// anyway replay change only changes the value of input, it's unaffected.
				// but the click leads value changing.
				// so here is the check, if value and checked are already same as which did by the click step, ignore the click step.
				const value = await this.getElementValue(element);
				const checked = await this.getElementChecked(element);
				if (value == step.value && checked == step.checked) {
					// ignore this click, the value and checked is already same as step does
					this.getLogger().log(
						'Click excution is ignored because of value and checked are matched, it was invoked by javascript or something else already.'
					);
					return;
				}
			} else if (elementType === 'file') {
				// click on a input[type=file] will introduce a file chooser dialog
				// which cannot be resolved programatically
				// ignore it
				return;
			}
		}
		const visible = await this.isElementVisible(element);
		if (visible) {
			await element.click();
		} else {
			await element.evaluate((node: Element) => (node as HTMLElement).click());
		}
	}
	private async executeFocusStep(step: FocusStep): Promise<void> {
		const page = await this.getPageOrThrow(step.uuid);
		const xpath = this.transformStepPathToXPath(step.path);
		this.getLogger().log(`Execute focus, step path is ${xpath}.`);

		const element = await this.findElement(step, page);
		await element.evaluate((node: Element) => {
			(node as any).focus && (node as HTMLElement).focus();
			const event = document.createEvent('HTMLEvents');
			event.initEvent('focus', true, true);
			node.dispatchEvent(event);
		});
	}
	private async executeKeydownStep(step: KeydownStep): Promise<void> {
		const page = await this.getPageOrThrow(step.uuid);
		const xpath = this.transformStepPathToXPath(step.path);
		const value = step.value;
		this.getLogger().log(`Execute keydown, step path is ${xpath}, key is ${value}`);

		const steps = this.getSteps();
		const currentIndex = this.getCurrentIndex();

		// check the pattern: keydown(key=enter)->change->click(element type=submit)
		if (steps[currentIndex + 1].type === 'change') {
			if (step.target === (steps[currentIndex + 1] as ChangeStep).target) {
				if (steps[currentIndex + 2].type === 'click') {
					const element = await this.findElement(steps[currentIndex + 2], page);
					const elementTagName = await this.getElementTagName(element);
					const elementType = await this.getElementType(element);
					if (elementTagName === 'INPUT' && elementType === 'submit') {
						this.getLogger().debug(
							`find the pattern: enter->change->submit, then skip the enter step. the step path is ${xpath}`
						);
						return;
					}
				}
			}
		}

		switch (step.value) {
			case 'Enter':
				await page.keyboard.press('Enter');
				break;
			default:
				this.getLogger().log(`keydown [${value}] is not implemented yet.`);
				break;
		}
	}
	private async executeMousedownStep(step: MousedownStep): Promise<void> {
		const page = await this.getPageOrThrow(step.uuid);
		const xpath = this.transformStepPathToXPath(step.path);
		this.getLogger().log(`Execute mouse down, step path is ${xpath}`);

		const element = await this.findElement(step, page);
		const support = this.createThirdStepSupport(page, element);
		const done = await support.mousedown();

		if (!done) {
			const currentIndex = this.getCurrentIndex();
			const currentPath = step.path;
			const avoidClick = this.getSteps()
				.filter((step, index) => index > currentIndex)
				.some(step => step.type === 'click' && step.path === currentPath);
			if (avoidClick) {
				this.getLogger().log(`found click for this mousedown, just skip this mousedown`);
				return;
			}
			await element.click();
		}
	}
	private async executeAnimationStep(step: AnimationStep): Promise<void> {
		const wait = util.promisify(setTimeout);
		await wait(step.duration!);
	}
	private async executeScrollStep(step: ScrollStep): Promise<void> {
		const page = await this.getPageOrThrow(step.uuid);

		const scrollTop = step.scrollTop || 0;
		const scrollLeft = step.scrollLeft || 0;
		// this.getLogger().log(scrollTop, scrollLeft);

		if (step.target === 'document') {
			await page.evaluate(
				(scrollTop, scrollLeft) => {
					document.documentElement.scrollTo({ top: scrollTop, left: scrollLeft });
				},
				scrollTop,
				scrollLeft
			);
		} else {
			const element = await this.findElement(step, page);
			await element.evaluate(
				(node, scrollTop, scrollLeft) => {
					node.scrollTo({ top: scrollTop, left: scrollLeft });
				},
				scrollTop,
				scrollLeft
			);
		}
	}
	private async executeDialogOpenStep(step: DialogOpenStep): Promise<void> {
		// dialog open is invoked by javascript anyway, ignore it
		this.getLogger().log(`Execute ${step.dialog} open, step url is ${step.url}.`);
	}
	private async executeDialogCloseStep(step: DialogCloseStep): Promise<void> {
		// dialog close is invoked manually anyway, should be handled in page popup event, ignore it
		this.getLogger().log(`Execute ${step.dialog} close, step url is ${step.url}.`);
	}
	private async executeAjaxStep(step: AjaxStep): Promise<void> {
		this.getLogger().log(`Execute ajax, step url is ${step.request && step.request.url}.`);
	}
	private async executePageCreatedStep(step: PageCreatedStep): Promise<void> {
		this.getLogger().debug(`Execute page created, step url is ${step.url}.`);
		const page = this.getPage(step.uuid);
		if (page) {
			//do nothing
			this.getLogger().debug(`pop up page created, page uuid is ${step.uuid}.`);
		} else {
			// TODO really 1s?
			const sleep = util.promisify(setTimeout);
			await sleep(1000);
			const page = this.getPage(step.uuid);
			if (page) {
				this.getLogger().debug(
					`double check, pop up page created, page uuid is ${step.uuid}.`
				);
			} else {
				this.getLogger().debug(`To creat pop up page, and add page uuid is ${step.uuid}.`);
				const newPage = await this.browser!.newPage();
				if (this.putPage(step.uuid, newPage, false)) {
					try {
						await controlPage(this, newPage, this.device!, step.uuid);
						await Promise.all([
							newPage.waitForNavigation(), // The promise resolves after navigation has finished
							newPage.goto(step.url!, { waitUntil: 'domcontentloaded' }) // Go to the url will indirectly cause a navigation
						]);
					} catch {
						// maybe force closed by popup
					}
				}
			}
		}
	}
	private async executePageSwitchedStep(step: PageSwitchStep): Promise<void> {
		this.getLogger().debug(`Execute page switched, step url is ${step.url}.`);
		const page = this.getPage(step.uuid);
		if (page) {
			// if query string or hash is different, treat as not changed
			// since sometimes they have random token
			const url = shorternUrl(page.url());
			const newUrl = shorternUrl(step.url!);
			if (newUrl !== url) {
				const sleep = util.promisify(setTimeout);
				await sleep(1000);
				const url = shorternUrl(page.url());
				if (newUrl !== url) {
					await Promise.all([
						page.waitForNavigation(),
						page.goto(step.url!, { waitUntil: 'domcontentloaded' })
					]);
				}
			}
		} else {
			// TODO really 1s?
			const sleep = util.promisify(setTimeout);
			await sleep(1000);
			const page = this.getPage(step.uuid);
			if (page) {
				// await page.bringToFront();
			} else {
				this.getLogger().debug(
					`To creat switched page, and add page uuid is ${step.uuid}.`
				);
				const newPage = await this.browser!.newPage();
				if (this.putPage(step.uuid, newPage, false)) {
					try {
						await controlPage(this, newPage, this.device!, step.uuid);
						await Promise.all([
							newPage.waitForNavigation(),
							newPage.goto(step.url!, { waitUntil: 'domcontentloaded' })
						]);
					} catch {
						// maybe force closed by popup
					}
				}
			}
		}
	}
	private async executePageClosedStep(step: PageClosedStep): Promise<void> {
		this.getLogger().debug(`Execute page closed, step url is ${step.url}.`);
		const page = this.getPage(step.uuid);
		if (page) {
			await page.close();
		}
	}
	private createThirdStepSupport(page: Page, element: ElementHandle): ThirdStepSupport {
		return new ThirdStepSupport({
			page,
			element,
			tagNameRetrieve: this.createElementTagNameRetriever(),
			elementTypeRetrieve: this.createElementTypeRetriever(),
			classNamesRetrieve: this.createElementClassNamesRetriever(),
			attrValueRetrieve: this.createElementAttrValueRetriever(),
			steps: this.getSteps(),
			currentStepIndex: this.getCurrentIndex(),
			logger: this.getLogger()
		});
	}
	private async findElement(step: Step, page: Page): Promise<ElementHandle> {
		const xpath = this.transformStepPathToXPath(step.path!);
		const elements = await page.$x(xpath);
		if (elements && elements.length === 1) {
			return elements[0];
		}

		// fallback to css path
		const csspath = step.csspath;
		if (csspath) {
			const count = await page.evaluate(
				csspath => document.querySelectorAll(csspath).length,
				csspath
			);
			if (count === 1) {
				const element = await page.$(csspath);
				if (element) {
					return element;
				}
			}
		}

		const custompath = step.custompath;
		if (custompath) {
			const count = await page.evaluate(
				csspath => document.querySelectorAll(csspath).length,
				custompath
			);
			if (count === 1) {
				const element = await page.$(custompath);
				if (element) {
					return element;
				}
			}
		}

		const frames = page.frames();

		if (frames.length > 0) {
			for (let index = 0; index < frames.length; index++) {
				const frame = frames[index];
				const element = await frame.$x(xpath);
				if (element.length === 1) {
					return element[0];
				}
			}
		}

		const paths = (() => {
			const paths = { xpath, csspath, custompath };
			return Object.keys(paths)
				.filter(key => paths[key])
				.map(key => `${key}[${paths[key]}]`)
				.join(' or ');
		})();

		throw new Error(`Cannot find element by ${paths}.`);
	}
	private createElementTagNameRetriever(): ElementRetriever {
		let tagName: string;
		return async (element: ElementHandle): Promise<string> => {
			if (!tagName) {
				tagName = await this.getElementTagName(element);
			}
			return tagName;
		};
	}
	private async getElementTagName(element: ElementHandle): Promise<string> {
		return await element.evaluate(node => node.tagName);
	}
	private createElementTypeRetriever(): ElementRetriever {
		let elementType: string;
		return async (element: ElementHandle): Promise<string> => {
			if (!elementType) {
				elementType = await this.getElementType(element);
			}
			return elementType;
		};
	}
	private async getElementType(element: ElementHandle): Promise<string> {
		return (await element.evaluate(node => node.getAttribute('type'))) || '';
	}
	private async getElementChecked(element: ElementHandle): Promise<boolean> {
		return await element.evaluate((node: Element) => (node as HTMLInputElement).checked);
	}
	private createElementClassNamesRetriever(): ElementRetriever {
		let classNames: string;
		return async (element: ElementHandle): Promise<string> => {
			if (!classNames) {
				classNames = (await this.getElementAttrValue(element, 'class')) || '';
			}
			return classNames;
		};
	}
	private createElementAttrValueRetriever(): ElementAttributeValueRetriever {
		const values: { [key in string]: string | null } = {};
		return async (element: ElementHandle, attrName: string): Promise<string> => {
			if (!Object.keys(values).includes(attrName)) {
				const value = await this.getElementAttrValue(element, attrName);
				if (typeof value === 'undefined') {
					values[attrName] = null;
				} else {
					values[attrName] = value;
				}
			}
			return values[attrName]!;
		};
	}
	private async getElementAttrValue(element: ElementHandle, attrName: string): Promise<string> {
		return await element.evaluate((node, attr) => node.getAttribute(attr)!, attrName);
	}
	private async getElementValue(element: ElementHandle): Promise<string> {
		return await element.evaluate(
			(node: Element) => (node as HTMLInputElement | HTMLSelectElement).value
		);
	}
	private async isElementVisible(element: ElementHandle): Promise<boolean> {
		return await element.evaluate(
			(node: Element) =>
				(node as HTMLElement).offsetWidth > 0 && (node as HTMLElement).offsetHeight > 0
		);
	}
	private async setValueToElement(element: ElementHandle, value: string) {
		const tagName = await this.getElementTagName(element);

		// console.log("tagName", tagName)
		if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
			const type = await this.getElementType(element);
			if (
				!type ||
				['text', 'password', 'url', 'search', 'email', 'hidden', 'number', 'tel'].includes(
					type.toLowerCase()
				)
			) {
				// sometimes key event was bound in input
				// force trigger change event cannot cover this scenario
				// in this case, as the following steps
				// 1. force clear input value
				// 2. invoke type
				// 3. force trigger change event
				await element.evaluate((node: Element) => ((node as HTMLInputElement).value = ''));
				await element.type(value);
				await element.evaluate(node => {
					// node.value = value;
					const event = document.createEvent('HTMLEvents');
					event.initEvent('change', true, true);
					node.dispatchEvent(event);
				});
				return;
			}
		}

		// other
		await element.evaluate((node: Element, value) => {
			const element = node as HTMLInputElement;
			if (
				!['checkbox', 'radio'].includes(
					(element.getAttribute('type') || '').toLowerCase()
				) ||
				element.value != value
			) {
				element.value = value;
				const event = document.createEvent('HTMLEvents');
				event.initEvent('change', true, true);
				node.dispatchEvent(event);
			}
		}, value);
	}
	private transformStepPathToXPath(stepPath: string): string {
		return stepPath.replace(/"/g, "'");
	}
}

export default Replayer;
