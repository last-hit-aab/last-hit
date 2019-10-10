const { URL } = require('url');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const uuidv4 = require('uuid/v4');
const atob = require('atob');
const util = require('util');
const ReplayResult = require('./replay-result');
const ThirdStepSupport = require('./3rd-comps/support');

const inElectron = !!process.versions.electron;

class CI {
	async startCoverage(page) {
		if (!inElectron) {
			// Enable both JavaScript and CSS coverage only in CI
			await page.coverage.startJSCoverage();
			await page.coverage.startCSSCoverage();
		}
	}
	async gatherCoverage(pages) {
		if (!inElectron) {
			return await pages.reduce(async (coverages, page) => {
				try {
					let jsCoverage = [];
					let cssCoverage = [];
					try {
						jsCoverage = await page.coverage.stopJSCoverage();
					} catch (e) {
						console.error(e);
					}
					try {
						cssCoverage = await page.coverage.stopCSSCoverage();
					} catch (e) {
						console.error(e);
					}
					return coverages.concat(jsCoverage).concat(cssCoverage);
				} catch {
					return coverages;
				}
			}, []);
		} else {
			return [];
		}
	}
}
const ci = new CI();

const generateKeyByString = (storyName, flowName) => {
	return `[${flowName}@${storyName}]`;
};
const getChromiumExecPath = () => {
	return puppeteer.executablePath().replace('app.asar', 'app.asar.unpacked');
};
const getUrlPath = url => {
	const parsed = new URL(url);
	parsed.search = '';
	parsed.hash = '';
	return parsed.href;
};

/**
 * @param {Replayer} replayer
 * @param {Page} page
 * @param {*} device
 */
const controlPage = async (replayer, page, device) => {
	await page.emulate(device);
	await page.emulateMedia('screen');
	const setBackground = () => (document.documentElement.style.backgroundColor = 'rgba(25,25,25,0.8)');
	await page.evaluate(setBackground);

	await ci.startCoverage(page);

	page.on('load', async () => {
		await page.evaluate(setBackground);
	});
	page.on('close', async () => {
		replayer.removePage(page);
	});

	// page created by window.open or anchor
	page.on('popup', async newPage => {
		const newUrl = getUrlPath(newPage.url());
		// find steps from next step of current step, the closest page-created event
		const steps = replayer.getSteps();
		const currentIndex = replayer.getCurrentIndex();
		// IMPORTANT do not compare url here, since might have random token. only path compare is necessary
		const pageCreateStep = steps
			.filter((step, index) => index > currentIndex)
			.find(step => step.type === 'page-created' && newUrl === getUrlPath(step.url));
		if (pageCreateStep == null) {
			throw new Error('Cannot find page created step for current popup, flow is broken for replay.');
		}

		replayer.putPage(pageCreateStep.uuid, newPage);
		await controlPage(replayer, newPage, device);
	});
	page.on('dialog', async dialog => {
		const dialogType = dialog.type();
		if (dialogType === 'alert') {
			// accept is the only way to alert dialog
			await dialog.accept('success');
		} else if (['confirm', 'prompt'].includes(dialogType)) {
			const currentIndex = replayer.getCurrentIndex();
			const steps = replayer.getSteps();
			const uuid = replayer.findUuid(page);
			// find the first dialog close step, it must be confirm step
			const dialogCloseStep = steps
				.filter((step, index) => index > currentIndex)
				.filter(step => step.type === 'dialog-close')
				.find(step => step.uuid === uuid);
			if (dialogCloseStep == null) {
				throw new Error(
					`Cannot find dialog close step for current dialog "${dialogType}" open, flow is broken for replay.`
				);
			}
			if (dialogCloseStep.dialog !== dialogType) {
				throw new Error(
					`Cannot match dialog type, should be "${dialogType}", but is "${dialogCloseStep.dialog}", flow is broken for replay.`
				);
			}
			const returnValue = dialogCloseStep.returnValue;
			if (typeof returnValue === 'string') {
				// handle click yes for prompt dialog
				dialog.accept(returnValue);
			} else if (returnValue) {
				// handle click yes for confirm dialog
				dialog.accept();
			} else {
				// handle click no for both confirm and prompt dialog
				dialog.dismiss();
			}
		} else if ('beforeunload' === dialogType) {
			const currentIndex = replayer.getCurrentIndex();
			const steps = replayer.getSteps();
			const uuid = replayer.findUuid(page);
			const nextStep = steps
				.filter((step, index) => index > currentIndex)
				// must same uuid
				.filter(step => step.uuid === uuid)
				// unload is not captured, but must be filtered, 20191006
				.filter(step => step.type !== 'unload')
				// the first step which with same page uuid and isn't unload step
				.find((step, index) => index === 0);
			if (nextStep == null) {
				throw new Error(
					`Cannot find next step for current dialog "${dialogType}" open, flow is broken for replay.`
				);
			}
			if (nextStep.type === 'page-closed' || nextStep.type === 'page-switched') {
				// seems unload had been performed
				dialog.accept();
			} else {
				// seems unload had been cancelled
				dialog.dismiss();
			}
		}
	});
	page.on('request', request => {
		replayer.putRequest(replayer.findUuid(page), request);
	});
	page.on('requestfinished', request => {
		replayer.offsetRequest(replayer.findUuid(page), request);
	});
	page.on('requestfailed', request => {
		replayer.offsetRequest(replayer.findUuid(page), request);
	});
};

const launchBrowser = async replayer => {
	const step = replayer.getCurrentStep();
	const { url, device, uuid } = step;
	const {
		viewport: { width, height }
	} = device;
	const chrome = { x: 0, y: 200 };
	const browserArgs = [];
	browserArgs.push(`--window-size=${width + chrome.x},${height + chrome.y}`);
	browserArgs.push('--disable-infobars');

	const browser = await puppeteer.launch({
		headless: !inElectron,
		executablePath: getChromiumExecPath(),
		args: browserArgs,
		defaultViewport: null
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
	replayer.putPage(uuid, page);
	replayer.setDevice(device);
	// add control into page
	await controlPage(replayer, page, device);
	// open url, timeout to 2 mins
	await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
	// RESEARCH too much time, remove
	// try {
	// 	await page.waitForNavigation();
	// } catch (e) {
	// 	logger.error(e);
	// }

	//you can try this solution about wait for navigateion
	/*
	const [response] = await Promise.all([
		page.waitForNavigation(), // The promise resolves after navigation has finished
		await page.goto(step.url, { waitUntil: 'domcontentloaded' }), // Go to the url will indirectly cause a navigation
	]);
	*/
	return page;
};

class LoggedRequests {
	constructor(page) {
		this.page = page;
		this.timeout = 60000;
		this.requests = [];
		this.offsets = [];
	}
	getPage() {
		return this.page;
	}
	create(request) {
		// logger.log(`Request ${request.url()} created.`);
		this.requests.push(request);
		// reset used time to 0, ensure timeout is begin from the last created request
		this.used = 0;
	}
	offset(request) {
		// logger.log(`Request ${request.url()} offsetted.`);
		this.offsets.push(request);
	}
	clear() {
		this.requests = [];
		this.offsets = [];
		this.used = 0;
	}
	async poll(resolve, reject, canResolve) {
		await this.getPage().waitFor(1000);
		this.used += 1000;

		for (var i = 0, len = this.requests.length; i < len; i++) {
			const url = this.requests[i].url();
			logger.debug(`reqeusts check, the request index is ${i}, request url is ${url}`);
		}

		for (var i = 0, len = this.offsets.length; i < len; i++) {
			const url = this.offsets[i].url();
			logger.debug(`offsets check, the request index is ${i}, request url is ${url}`);
		}

		logger.debug(
			`Check all requests are done, currently ${this.requests.length} created and ${this.offsets.length} offsetted.`
		);
		//when the page pop up, the page has been loaded before request interception, then requests length will less than offsets length
		if (this.requests.length <= this.offsets.length) {
			if (canResolve) {
				this.clear();
				resolve();
			} else {
				this.poll(resolve, reject, true);
			}
		} else if (this.used > this.timeout) {
			const usedTime = this.used;
			this.clear();
			reject(new Error(`Wait for all requests done, timeout after ${usedTime}ms.`));
		} else {
			this.poll(resolve, reject);
		}
	}
	waitForAllDone() {
		this.used = 0;
		return new Promise((resolve, reject) => this.poll(resolve, reject));
	}
}

class Replayer {
	constructor(options) {
		const { storyName, flow } = options;
		this.storyName = storyName;
		this.flow = flow;
		this.currentIndex = 0;
		this.browser = null;
		// key is uuid, value is page
		this.pages = {};
		// key is uuid, value is LoggedRequests
		this.requests = {};
		this.summary = new ReplayResult({ storyName, flow });
		this.coverages = [];
	}
	getStoryName() {
		return this.storyName;
	}
	getFlow() {
		return this.flow;
	}
	getIdentity() {
		return `[${this.getFlow().name}@${this.getStoryName()}]`;
	}
	/**
	 * @returns summary object
	 */
	getSummary() {
		return this.summary;
	}
	getSummaryData() {
		return this.summary.getSummary();
	}
	getCoverageData() {
		return this.coverages;
	}
	getSteps() {
		return this.flow.steps || [];
	}
	getCurrentIndex() {
		return this.currentIndex;
	}
	getCurrentStep() {
		return this.getSteps()[this.getCurrentIndex()];
	}
	/**
	 * @returns null only if not start
	 */
	getBrowser() {
		return this.browser;
	}
	setBrowser(browser) {
		this.browser = browser;
	}
	getDevice() {
		return this.device;
	}
	setDevice(device) {
		this.device = device;
	}
	/**
	 * @param {Page} page
	 * @returns null when not found
	 */
	findUuid(page) {
		return Object.keys(this.pages).find(id => this.pages[id] === page);
	}

	/**
	 * @param {string} uuid
	 * @returns null when not found
	 */
	getPage(uuid) {
		return this.pages[uuid];
	}
	/**
	 * get page by given uuid, throw error when not found
	 * @param {string} uuid
	 * @returns page
	 */
	async getPageOrThrow(uuid) {
		const page = this.getPage(uuid);
		if (page == null) {
			throw new Error('Page not found.');
		}
		await page.bringToFront();
		return page;
	}
	/**
	 * @param {string} uuid
	 * @param {Page} page
	 */
	putPage(uuid, page) {
		this.pages[uuid] = page;
		this.requests[uuid] = new LoggedRequests(page);
	}
	/**
	 * @param {string|Page} uuidOrPage
	 * @return removed page or null if not exists
	 */
	removePage(uuidOrPage) {
		if (typeof uuidOrPage === 'string') {
			const page = this.pages[uuid];
			delete this.pages[uuid];
			delete this.requests[uuid];
			return page;
		} else {
			const uuid = this.findUuid(uuidOrPage);
			delete this.pages[uuid];
			delete this.requests[uuid];
			return uuidOrPage;
		}
	}
	putRequest(uuid, request) {
		const requests = this.requests[uuid];
		if (requests) {
			this.requests[uuid].create(request);
		}
	}
	offsetRequest(uuid, request) {
		const requests = this.requests[uuid];
		if (requests) {
			requests.offset(request);
		}
	}
	async isRemoteFinsihed(page) {
		const uuid = this.findUuid(page);
		const requests = this.requests[uuid];
		// return requests.waitForAllDone();

		// peep next step, if not ajax step, resolve directly to speed up
		const { type } = this.getCurrentStep();
		if (['page-switched', 'page-created', 'scroll'].includes(type)) {
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
			return Promise.resolve();
		}
	}
	async start() {
		const page = await launchBrowser(this);
		await this.isRemoteFinsihed(page);
	}
	/**
	 * only called in CI
	 * @param {boolean} close
	 */
	async end(close) {
		const browser = this.getBrowser();
		if (browser == null) {
			// do nothing, seems not start
		} else {
			try {
				const pages = await browser.pages();
				this.coverages = await ci.gatherCoverage(pages);
				await browser.disconnect();
			} catch (e) {
				logger.error('Failed to disconnect from brwoser.');
				logger.error(e);
			}
			if (close) {
				try {
					await browser.close();
					delete browsers[generateKeyByString(this.getStoryName(), this.getFlow().name)];
				} catch (e) {
					logger.error('Failed to close browser.');
					logger.error(e);
				}
			}
		}
	}
	async next(flow, index) {
		this.flow = flow;
		this.currentIndex = index;
		const step = this.getCurrentStep();
		if (step.type === 'end') {
			return;
		}

		const ret = await (async () => {
			switch (step.type) {
				case 'change':
					return await this.executeChangeStep(step);
				case 'click':
					return await this.executeClickStep(step);
				case 'focus':
					return await this.executeFocusStep(step);
				case 'keydown':
					return await this.executeKeydownStep(step);
				case 'mousedown':
					return await this.executeMousedownStep(step);
				case 'ajax':
					return await (async () => {
						await this.executeAjaxStep(step);
						return Promise.resolve({ wait: false });
					})();
				case 'scroll':
					return await this.executeScrollStep(step);
				case 'dialog-open':
					return await this.executeDialogOpenStep(step);
				case 'dialog-close':
					return await this.executeDialogCloseStep(step);
				case 'page-created':
					return await this.executePageCreatedStep(step);
				case 'page-switched':
					return await this.executePageSwitchedStep(step);
				case 'page-closed':
					return await (async () => {
						await this.executePageClosedStep(step);
						return Promise.resolve({ wait: false });
					})();
				case 'end':
					return Promise.resolve({ wait: false });
				default:
					logger.log(`Step[${step.type}] is not implemented yet.`);
					return Promise.resolve();
			}
		})();
		if (!ret || ret.wait !== false) {
			const page = await this.getPageOrThrow(step.uuid);
			await this.isRemoteFinsihed(page);
		}
	}
	async executeChangeStep(step) {
		const page = await this.getPageOrThrow(step.uuid);
		const xpath = step.path.replace(/"/g, "'");
		logger.log(`Execute change, step path is ${xpath}, step value is ${step.value}.`);

		const elements = await page.$x(xpath);
		const element = elements[0];
		const elementTagName = await this.getElementTagName(element);
		const elementType = await this.getElementType(element);

		let isFileUpload = false;
		if (elementTagName === 'INPUT') {
			if (elementType === 'file') {
				isFileUpload = true;
			}
		}

		if (isFileUpload) {
			const value = step.value;
			let segments = value.split('\\');
			segments = segments[segments.length - 1].split('/');
			const filename = segments[segments.length - 1];
			const dir = path.join(__dirname, 'upload-temp', uuidv4());
			const filepath = path.join(dir, filename);
			const byteString = atob(step.file.split(',')[1]);
			// separate out the mime component
			const mimeString = step.file
				.split(',')[0]
				.split(':')[1]
				.split(';')[0];

			// write the bytes of the string to an ArrayBuffer
			const ab = new ArrayBuffer(byteString.length);
			// create a view into the buffer
			const ia = new Uint8Array(ab);
			// set the bytes of the buffer to the correct values
			for (let i = 0; i < byteString.length; i++) {
				ia[i] = byteString.charCodeAt(i);
			}
			// write the ArrayBuffer to a blob, and you're done
			// const blob = new Blob([ab], { type: mimeString });
			fs.mkdirSync(dir, { recursive: true });
			fs.writeFileSync(filepath, Buffer.from(ia));

			// file upload
			const [fileChooser] = await Promise.all([
				page.waitForFileChooser(),
				element.evaluate(node => node.click())
			]);
			await fileChooser.accept([filepath]);
		} else {
			// change is change only, cannot use type
			await this.setValueToElement(element, step.value);
		}
	}
	async executeClickStep(step) {
		const page = await this.getPageOrThrow(step.uuid);
		const xpath = step.path.replace(/"/g, "'");
		logger.log(`Execute click, step path is ${xpath}.`);

		const elements = await page.$x(xpath);
		const element = elements[0];
		const elementTagName = await this.getElementTagName(element);

		const support = this.createThirdStepSupport(element);
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
					logger.log(
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
			await elements[0].click();
		} else {
			await element.evaluate(node => node.click());
		}
	}
	async executeFocusStep(step) {
		const page = await this.getPageOrThrow(step.uuid);
		const xpath = step.path.replace(/"/g, "'");
		logger.log(`Execute focus, step path is ${xpath}.`);

		const elements = await page.$x(xpath);
		const element = elements[0];
		await element.evaluate(node => {
			node.focus();
			const event = document.createEvent('HTMLEvents');
			event.initEvent('focus', true, true);
			node.dispatchEvent(event);
		});
	}
	async executeKeydownStep(step) {
		const page = await this.getPageOrThrow(step.uuid);
		const xpath = step.path.replace(/"/g, "'");
		const value = step.value;
		logger.log(`Execute keydown, step path is ${xpath}, key is ${value}`);

		const steps = this.getSteps();
		const currentIndex = this.getCurrentIndex();

		// check the pattern: keydown(key=enter)->change->click(element type=submit)
		if (steps[currentIndex].type === 'keydown' && steps[currentIndex + 1].type === 'change') {
			if (steps[currentIndex].target === steps[currentIndex + 1].target) {
				if (steps[currentIndex + 2].type === 'click') {
					const elements = await page.$x(steps[currentIndex + 2].path.replace(/"/g, "'"));
					const element = elements[0];
					const elementTagName = await this.getElementTagName(element);
					const elementType = await this.getElementType(element);
					if (elementTagName === 'INPUT' && elementType === 'submit') {
						logger.debug(
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
				logger.log(`keydown [${value}] is not implemented yet.`);
				break;
		}
	}
	async executeMousedownStep(step) {
		const page = await this.getPageOrThrow(step.uuid);
		const xpath = step.path.replace(/"/g, "'");
		logger.log(`Execute mouse down, step path is ${xpath}`);

		const elements = await page.$x(xpath);
		const element = elements[0];

		const support = this.createThirdStepSupport(element);
		const done = await support.mousedown();

		console.log("done", done)
		if (!done) {
			const currentIndex = this.getCurrentIndex();
			const currentPath = step.path;
			console.log("currentPath", currentPath)
			const avoidClick = this.getSteps()
				.filter((step, index) => index > currentIndex)
				.some(step => step.type === 'click' && step.path === currentPath);
			console.log("avoidClick", avoidClick)
			if (avoidClick) {
				logger.log(`found click for this mousedown, just skip this mousedown`);
				return;
			}
			await element.click();
		}
	}
	async executeScrollStep(step) {
		const page = await this.getPageOrThrow(step.uuid);

		const scrollTop = step.scrollTop || 0;
		const scrollLeft = step.scrollLeft || 0;
		logger.log(scrollTop, scrollLeft);

		if (step.target === 'document') {
			await page.evaluate(
				(scrollTop, scrollLeft) => {
					document.documentElement.scrollTo({ top: scrollTop, left: scrollLeft });
				},
				scrollTop,
				scrollLeft
			);
		} else {
			const xpath = step.path.replace(/"/g, "'");
			const elements = await page.$x(xpath);
			const element = elements[0];
			await element.evaluate(
				(node, scrollTop, scrollLeft) => {
					node.scrollTo({ top: scrollTop, left: scrollLeft });
				},
				scrollTop,
				scrollLeft
			);
		}
	}
	async executeDialogOpenStep(step) {
		// dialog open is invoked by javascript anyway, ignore it
		logger.log(`Execute ${step.dialog} open, step url is ${step.url}.`);
	}
	async executeDialogCloseStep(step) {
		// dialog close is invoked manually anyway, should be handled in page popup event, ignore it
		logger.log(`Execute ${step.dialog} close, step url is ${step.url}.`);
	}
	async executeAjaxStep(step) {
		// TODO do nothing now
		logger.log(`Execute ajax, step url is ${step.url}.`);
	}
	async executePageCreatedStep(step) {
		logger.debug(`Execute page created, step url is ${step.url}.`);
		const page = this.getPage(step.uuid);
		if (page) {
			//do nothing
			logger.debug(`pop up page created, page uuid is ${step.uuid}.`);
		} else {
			// TODO really 1s?
			const sleep = util.promisify(setTimeout);
			await sleep(1000);
			const page = this.getPage(step.uuid);
			if (page) {
				logger.debug(`double check, pop up page created, page uuid is ${step.uuid}.`);
			} else {
				logger.debug(`To creat pop up page, and add page uuid is ${step.uuid}.`);
				const newPage = await this.browser.newPage();
				this.putPage(step.uuid, newPage);
				await controlPage(this, newPage, this.device);
				await Promise.all([
					newPage.waitForNavigation(), // The promise resolves after navigation has finished
					newPage.goto(step.url, { waitUntil: 'domcontentloaded' }) // Go to the url will indirectly cause a navigation
				]);
			}
		}
	}
	async executePageSwitchedStep(step) {
		logger.debug(`Execute page switched, step url is ${step.url}.`);
		const page = this.getPage(step.uuid);
		if (page) {
			const url = getUrlPath(page.url());
			const newUrl = getUrlPath(step.url);
			if (newUrl !== url) {
				setTimeout(async () => {
					const url = getUrlPath(page.url());
					if (newUrl !== url) {
						await Promise.all([
							page.waitForNavigation(),
							page.goto(step.url, { waitUntil: 'domcontentloaded' })
						]);
					}
				}, 1000);
			}
		} else {
			// TODO really 1s?
			const sleep = util.promisify(setTimeout);
			await sleep(1000);
			const page = this.getPage(step.uuid);
			if (page) {
				// await page.bringToFront();
			} else {
				logger.debug(`To creat switched page, and add page uuid is ${step.uuid}.`);
				const newPage = await this.browser.newPage();
				this.putPage(step.uuid, newPage);
				await controlPage(this, newPage, this.device);
				await Promise.all([
					newPage.waitForNavigation(),
					newPage.goto(step.url, { waitUntil: 'domcontentloaded' })
				]);
			}
		}
	}
	async executePageClosedStep(step) {
		logger.debug(`Execute page closed, step url is ${step.url}.`);
		const page = this.getPage(step.uuid);
		if (page) {
			await page.close();
		}
	}
	createThirdStepSupport(element) {
		return new ThirdStepSupport({
			element,
			tagNameRetrieve: this.createElementTagNameRetriever(),
			elementTypeRetrieve: this.createElementTypeRetriever(),
			classNamesRetrieve: this.createElementClassNamesRetriever(),
			attrValueRetrieve: this.createElementAttrValueRetriever(),
			steps: this.getSteps(),
			currentStepIndex: this.getCurrentIndex(),
			logger
		});
	}
	createElementTagNameRetriever() {
		let tagName;
		return async element => {
			if (!tagName) {
				tagName = await this.getElementTagName(element);
			}
			return tagName;
		};
	}
	async getElementTagName(element) {
		return await element.evaluate(node => node.tagName);
	}
	createElementTypeRetriever() {
		let elementType;
		return async element => {
			if (!elementType) {
				elementType = await this.getElementType(element);
			}
			return elementType;
		};
	}
	async getElementType(element) {
		return await element.evaluate(node => node.getAttribute('type'));
	}
	async getElementChecked(element) {
		return await element.evaluate(node => node.checked);
	}
	createElementClassNamesRetriever() {
		let classNames;
		return async element => {
			if (!classNames) {
				classNames = (await this.getElementAttrValue(element, 'class')) || '';
			}
			return classNames;
		};
	}
	createElementAttrValueRetriever() {
		const values = {};
		return async (element, attrName) => {
			if (!Object.keys(values).includes(attrName)) {
				const value = await this.getElementAttrValue(element, attrName);
				if (typeof value === 'undefined') {
					values[attrName] = null;
				} else {
					values[attrName] = value;
				}
			}
			return values[attrName];
		};
	}
	async getElementAttrValue(element, attrName) {
		return await element.evaluate((node, attr) => node.getAttribute(attr), attrName);
	}
	async getElementValue(element) {
		return await element.evaluate(node => node.value);
	}
	async isElementVisible(element) {
		return await element.evaluate(node => node.offsetWidth > 0 && node.offsetHeight > 0);
	}
	async setValueToElement(element, value) {
		await element.evaluate((node, value) => {
			node.value = value;
			const event = document.createEvent('HTMLEvents');
			event.initEvent('change', true, true);
			node.dispatchEvent(event);
		}, value);
	}
}

const browsers = {};
const launch = () => {
	const waitForNextStep = options => {
		const { storyName, flowName, replayer } = options;
		emitter.once(`continue-replay-step-${generateKeyByString(storyName, flowName)}`, async (event, arg) => {
			const { flow, index, command } = arg;
			const step = replayer.getCurrentStep();
			switch (command) {
				case 'disconnect':
					await replayer.end(false);
					event.reply(`replay-browser-disconnect-${generateKeyByString(storyName, flowName)}`, {});
					break;
				case 'abolish':
					await replayer.end(true);
					event.reply(`replay-browser-abolish-${generateKeyByString(storyName, flowName)}`, {});
					break;
				default:
					try {
						logger.log(`Continue step[${index}]@${generateKeyByString(storyName, flowName)}.`);
						replayer.getSummary().handle(step);
						await replayer.next(flow, index);
						waitForNextStep({ event, replayer, storyName, flowName, index });
					} catch (e) {
						logger.error(e);
						console.log(e)
						// failed, prepare for next step
						// send back
						replayer.getSummary().handleError(step, e);
						waitForNextStep({ event, replayer, storyName, flowName, index, error: e.message });
					}
			}
		});
		logger.log(
			`Reply message step[${options.index}]@[replay-step-end-${generateKeyByString(storyName, flowName)}].`
		);
		options.event.reply(`replay-step-end-${generateKeyByString(storyName, flowName)}`, {
			index: options.index,
			error: options.error
		});
	};
	const handle = {};
	emitter.on('launch-replay', async (event, arg) => {
		const { storyName, flow, index } = arg;
		const replayer = new Replayer({ storyName, flow });
		handle.current = replayer;
		try {
			await replayer.start();
			// put into cache
			browsers[generateKeyByString(storyName, flow.name)] = replayer.getBrowser();

			// successful, prepare for next step
			// send back
			waitForNextStep({ event, replayer, storyName, flowName: flow.name, index });
		} catch (e) {
			logger.error(e);
			// failed, prepare for next step
			// send back
			waitForNextStep({ event, replayer, storyName, flowName: flow.name, index, error: e.message });
		}
	});
	return handle;
};

const destory = () => {
	logger.info('destory all puppeteer browsers.');
	Object.keys(browsers).forEach(async key => {
		logger.info(`destory puppeteer browser[${key}]`);
		const browser = browsers[key];
		delete browsers[key];
		try {
			await browser.disconnect();
		} catch {
			// ignore
		}
		try {
			await browser.close();
		} catch {
			// ignore
		}
	});
};

let emitter;
let logger;

module.exports = options => {
	emitter = options.emitter;
	logger = options.logger;

	return {
		initialize: () => launch(),
		destory
	};
};
