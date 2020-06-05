import cssesc from 'cssesc';
import { BrowserWindow, ipcMain, IpcMainEvent } from 'electron';
import { Device } from 'last-hit-types';
import puppeteer, { Browser } from 'puppeteer';
import { ReplayerHelper } from '../replayer/types';
import BrowserHelper from './browser-helper';
import PageHelper from './page-helper';
import AllPagesCache from './pages-cache';
import { BrowsersCache, CDPNode, CDPNodePseudoType } from './types';

class MyNode {
	nodeId: number;
	backendNodeId: number;
	nodeType: number;
	pseudoType?: CDPNodePseudoType;
	localName: string;
	nodeName: string;
	attributes: { [key in string]: string } = {};
	children: MyNode[];
	parentNode?: MyNode;
	previousSibling?: MyNode;
	nextSibling?: MyNode;
	pseudoElements: MyNode[];

	constructor(node: CDPNode, nodesMap: NodesMap) {
		this.nodeId = node.nodeId;
		this.backendNodeId = node.backendNodeId;
		this.nodeType = node.nodeType;
		this.pseudoType = node.pseudoType;
		this.localName = node.localName;
		this.nodeName = node.nodeName;

		if (node.attributes && node.attributes.length > 0) {
			for (
				let index = 0, count = node.attributes.length / 2;
				index < count;
				index = index + 2
			) {
				this.attributes[node.attributes[index]] = node.attributes[index + 1];
			}
		}
		this.children = (node.children || []).map(child => {
			const childNode = new MyNode(child, nodesMap);
			childNode.parentNode = this;
			return childNode;
		});
		for (let index = 0, count = this.children.length - 1; index < count; index++) {
			const prev = this.children[index];
			const next = this.children[index + 1];
			next.previousSibling = prev;
			prev.nextSibling = next;
		}
		this.pseudoElements = (node.pseudoElements || []).map(pseudo => {
			const pseudoNode = new MyNode(pseudo, nodesMap);
			pseudoNode.parentNode = this;
			return pseudoNode;
		});
		nodesMap.put(this);
	}

	hasAttribute(name: string): boolean {
		return typeof this.attributes[name] !== 'undefined';
	}

	getAttribute(name: string): string {
		return this.attributes[name] || '';
	}
}

class NodesMap {
	private attrIdMap = new Map<string, Array<MyNode>>();
	private nodeIdMap = new Map<number, MyNode>();

	shouldIgnore(id: string): boolean {
		return PageHelper.shouldIgnore(id);
	}

	put(node: MyNode): void {
		const attrIdValue = node.getAttribute('id');
		if (attrIdValue) {
			let data = this.attrIdMap.get(attrIdValue);
			if (!data) {
				data = [];
				this.attrIdMap.set(attrIdValue, data);
			}
			data.push(node);
		}
		this.nodeIdMap.set(node.nodeId, node);
	}

	get(nodeId: number): MyNode {
		return this.nodeIdMap.get(nodeId);
	}

	isIdAttrUnique(attrIdValue: string): boolean {
		const data = this.attrIdMap.get(attrIdValue);
		return data && data.length === 1;
	}
}

const Node = {
	ELEMENT_NODE: 1,
	ATTRIBUTE_NODE: 2,
	TEXT_NODE: 3,
	CDATA_SECTION_NODE: 4,
	PROCESSING_INSTRUCTION_NODE: 7,
	COMMENT_NODE: 8,
	DOCUMENT_NODE: 9
};

class StepPath {
	private value: string;
	optimized: boolean;

	constructor(value: string, optimized: boolean = false) {
		this.value = value;
		this.optimized = optimized;
	}

	toString() {
		return this.value;
	}
}

class Recorder {
	private replayer: ReplayerHelper;
	private browsers: BrowsersCache = {};

	initialize(replayer: ReplayerHelper) {
		this.replayer = replayer;
		this.launch();
	}

	private getChromiumExecPath(): string {
		return puppeteer.executablePath().replace('app.asar', 'app.asar.unpacked');
	}

	private generateKeyByString(storyName: string, flowName: string) {
		return `[${flowName}@${storyName}]`;
	}

	private getReplayer(): ReplayerHelper {
		return this.replayer;
	}

	private getBrowsers(): BrowsersCache {
		return this.browsers;
	}

	private addBrowser(browser: Browser, flowKey: string): void {
		this.getBrowsers()[flowKey] = browser;
	}

	private getBrowser(flowKey: string): Browser | undefined {
		return this.getBrowsers()[flowKey];
	}

	private releaseBrowser(flowKey: string): void {
		delete this.browsers[flowKey];
	}

	private async disconnectPuppeteer(flowKey: string, close: boolean = false): Promise<void> {
		const browser = this.getBrowser(flowKey);
		try {
			await browser.disconnect();
		} catch (e) {
			console.error('Failed to disconnect from brwoser.');
			console.error(e);
		}
		if (close) {
			try {
				await browser.close();
				this.releaseBrowser(flowKey);
			} catch (e) {
				console.error('Failed to close brwoser.');
				console.error(e);
			}
		}
	}

	private areNodesSimilar(left: MyNode, right: MyNode): boolean {
		if (left === right) {
			return true;
		}

		if (left.nodeType === Node.ELEMENT_NODE && right.nodeType === Node.ELEMENT_NODE) {
			return left.localName === right.localName;
		}

		if (left.nodeType === right.nodeType) {
			return true;
		}

		// XPath treats CDATA as text nodes.
		const leftType = left.nodeType === Node.CDATA_SECTION_NODE ? Node.TEXT_NODE : left.nodeType;
		const rightType =
			right.nodeType === Node.CDATA_SECTION_NODE ? Node.TEXT_NODE : right.nodeType;
		return leftType === rightType;
	}

	private getNodeIndexForXPath(element: MyNode): number {
		const siblings = element.parentNode ? element.parentNode.children : null;
		if (!siblings) {
			return 0;
		} // Root node - no siblings.
		let hasSameNamedElements: boolean;
		for (let i = 0; i < siblings.length; ++i) {
			if (this.areNodesSimilar(element, siblings[i]) && siblings[i] !== element) {
				hasSameNamedElements = true;
				break;
			}
		}
		if (!hasSameNamedElements) {
			return 0;
		}
		let ownIndex = 1; // XPath indices start with 1.
		for (let i = 0; i < siblings.length; ++i) {
			if (this.areNodesSimilar(element, siblings[i])) {
				if (siblings[i] === element) {
					return ownIndex;
				}
				++ownIndex;
			}
		}
		return -1; // An error occurred: |node| not found in parent's children.
	}

	private createXPathStep(element: MyNode, nodesMap: NodesMap, optimized: boolean): StepPath {
		let ownValue: string;
		const ownIndex = this.getNodeIndexForXPath(element);
		if (ownIndex === -1) {
			return null;
		} // Error.

		switch (element.nodeType) {
			case Node.ELEMENT_NODE:
				const id = element.getAttribute('id');
				if (optimized && id && !nodesMap.shouldIgnore(id)) {
					return new StepPath('//*[@id="' + id + '"]', true);
				}
				ownValue = element.localName;
				break;
			case Node.ATTRIBUTE_NODE:
				ownValue = '@' + element.nodeName;
				break;
			case Node.TEXT_NODE:
			case Node.CDATA_SECTION_NODE:
				ownValue = 'text()';
				break;
			case Node.PROCESSING_INSTRUCTION_NODE:
				ownValue = 'processing-instruction()';
				break;
			case Node.COMMENT_NODE:
				ownValue = 'comment()';
				break;
			case Node.DOCUMENT_NODE:
				ownValue = '';
				break;
			default:
				ownValue = '';
				break;
		}

		if (ownIndex > 0) {
			ownValue += '[' + ownIndex + ']';
		}

		return new StepPath(ownValue, element.nodeType === Node.DOCUMENT_NODE);
	}

	private createXPathFromNode(node: MyNode, nodesMap: NodesMap): string | null {
		if (node.nodeType === Node.DOCUMENT_NODE) {
			return '/';
		}

		const steps = [];
		let contextNode = node;
		while (contextNode) {
			const step = this.createXPathStep(contextNode, nodesMap, true);
			if (!step) {
				break;
			} // Error - bail out early.
			steps.push(step);
			if (step.optimized) {
				break;
			}
			contextNode = contextNode.parentNode;
		}

		steps.reverse();
		return (steps.length && steps[0].optimized ? '' : '/') + steps.join('/');
	}

	private idSelector(id: string) {
		return `#${cssesc(id)}`;
	}

	private nodeNameInCorrectCase(elm: MyNode): string {
		// IMPORTANT shadow root is not concerned now, by last-hit-b 2019/10/24.
		// const shadowRootType = this.shadowRootType();
		// if (shadowRootType) {
		// 	return '#shadow-root (' + shadowRootType + ')';
		// }

		// If there is no local name, it's case sensitive
		if (!elm.localName) {
			return elm.nodeName;
		}

		// If the names are different lengths, there is a prefix and it's case sensitive
		if (elm.localName.length !== elm.nodeName.length) {
			return elm.nodeName;
		}

		// Return the localname, which will be case insensitive if its an html node
		return elm.localName;
	}

	private prefixedElementClassNames(elm: MyNode): string[] {
		const classNames = elm.getAttribute('class');
		if (!classNames) {
			return [];
		}

		return classNames
			.split(/\s+/g)
			.filter(Boolean)
			.map(name => {
				// The prefix is required to store "__proto__" in a object-based map.
				return '$' + name;
			});
	}

	private createCssPathStep(
		elm: MyNode,
		nodesMap: NodesMap,
		optimized: boolean,
		isTargetNode: boolean
	): StepPath {
		if (elm.nodeType !== Node.ELEMENT_NODE) {
			return null;
		}

		const id = elm.getAttribute('id');
		if (optimized) {
			if (id && !nodesMap.shouldIgnore(id)) {
				return new StepPath(this.idSelector(id), true);
			}
			const nodeNameLower = elm.nodeName.toLowerCase();
			if (nodeNameLower === 'body' || nodeNameLower === 'head' || nodeNameLower === 'html') {
				return new StepPath(this.nodeNameInCorrectCase(elm), true);
			}
		}
		const nodeName = this.nodeNameInCorrectCase(elm);

		if (id && !nodesMap.shouldIgnore(id)) {
			return new StepPath(nodeName + this.idSelector(id), true);
		}
		const parent = elm.parentNode;
		if (!parent || parent.nodeType === Node.DOCUMENT_NODE) {
			return new StepPath(nodeName, true);
		}

		const prefixedOwnClassNamesArray = this.prefixedElementClassNames(elm);
		let needsClassNames = false;
		let needsNthChild = false;
		let ownIndex = -1;
		let elementIndex = -1;
		const siblings = parent.children;
		for (let i = 0; (ownIndex === -1 || !needsNthChild) && i < siblings.length; ++i) {
			const sibling = siblings[i];
			if (sibling.nodeType !== Node.ELEMENT_NODE) {
				continue;
			}
			elementIndex += 1;
			if (sibling === elm) {
				ownIndex = elementIndex;
				continue;
			}
			if (needsNthChild) {
				continue;
			}
			if (this.nodeNameInCorrectCase(sibling) !== nodeName) {
				continue;
			}

			needsClassNames = true;
			const ownClassNames = new Set(prefixedOwnClassNamesArray);
			if (!ownClassNames.size) {
				needsNthChild = true;
				continue;
			}
			const siblingClassNamesArray = this.prefixedElementClassNames(sibling);
			for (let j = 0; j < siblingClassNamesArray.length; ++j) {
				const siblingClass = siblingClassNamesArray[j];
				if (!ownClassNames.has(siblingClass)) {
					continue;
				}
				ownClassNames.delete(siblingClass);
				if (!ownClassNames.size) {
					needsNthChild = true;
					break;
				}
			}
		}

		let result = nodeName;
		if (
			isTargetNode &&
			nodeName.toLowerCase() === 'input' &&
			elm.getAttribute('type') &&
			(!id || nodesMap.shouldIgnore(id)) &&
			!elm.getAttribute('class')
		) {
			result += '[type=' + cssesc(elm.getAttribute('type')) + ']';
		}
		if (needsNthChild) {
			result += ':nth-child(' + (ownIndex + 1) + ')';
		} else if (needsClassNames) {
			for (const prefixedName of prefixedOwnClassNamesArray) {
				result += '.' + cssesc(prefixedName.slice(1));
			}
		}

		return new StepPath(result, false);
	}

	private createCssPathFromNode(node: MyNode, nodesMap: NodesMap): string {
		if (node.nodeType !== Node.ELEMENT_NODE) {
			return '';
		}

		const steps = [];
		let contextNode = node;
		while (contextNode) {
			const step = this.createCssPathStep(contextNode, nodesMap, true, contextNode === node);
			if (!step) {
				// Error - bail out early.
				break;
			}
			steps.push(step);
			if (step.optimized) {
				break;
			}
			contextNode = contextNode.parentNode;
		}

		steps.reverse();
		return steps.join(' > ');
	}

	private handleLaunch(): void {
		ipcMain.on(
			'launch-puppeteer',
			async (
				event: IpcMainEvent,
				arg: { url: string; device: Device; flowKey: string; uuid: string, dataAttrName?: string }
			) => {
				const { url, device, flowKey, uuid, dataAttrName } = arg;
				PageHelper.setDataAttrName(dataAttrName);
				const {
					viewport: { width, height }
				} = device;
				const browserArgs = [];
				browserArgs.push(`--window-size=${width},${height + 150}`);
				browserArgs.push('--disable-infobars');
				browserArgs.push('--ignore-certificate-errors');
				// browserArgs.push('--use-mobile-user-agent');

				// create browser
				const browser = await puppeteer.launch({
					headless: false,
					executablePath: this.getChromiumExecPath(),
					args: browserArgs,
					defaultViewport: null
				});
				// cache browser on global
				this.addBrowser(browser, flowKey);
				// check which page will be used
				const pages = await browser.pages();
				if (pages != null && pages.length > 0) {
					await pages[0].close();
				}
				const page = await browser.newPage();
				// give uuid to pages
				const allPages = new AllPagesCache();
				allPages.add(uuid, page);

				const browserHelper = new BrowserHelper(browser, allPages, device, flowKey);
				browserHelper.monitorAll();

				await PageHelper.monitorRequests(page, browserHelper);
				await page.goto(url, { waitUntil: 'domcontentloaded' });
				await PageHelper.control(browserHelper, page, false);
				try {
					await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
				} catch (e) {
					console.error('Failed to wait for navigation dom content loaded.');
					console.error(e);
				}
			}
		);
	}

	private handleDisconnect(): void {
		ipcMain.on(
			'disconnect-puppeteer',
			async (event: IpcMainEvent, arg: { flowKey: string }) => {
				const { flowKey } = arg;
				await this.disconnectPuppeteer(flowKey);
			}
		);
	}

	private handleAbolish(): void {
		ipcMain.on('abolish-puppeteer', async (event: IpcMainEvent, arg: { flowKey: string }) => {
			const { flowKey } = arg;
			await this.disconnectPuppeteer(flowKey, true);
		});
	}

	private handleSwitchToRecord(): void {
		ipcMain.on(
			'switch-puppeteer',
			async (event: IpcMainEvent, arg: { storyName: string; flowName: string, dataAttrName?: string }) => {
				const { storyName, flowName, dataAttrName } = arg;
				PageHelper.setDataAttrName(dataAttrName);
				const flowKey = this.generateKeyByString(storyName, flowName);
				const replayer = this.getReplayer().abandon(storyName, flowName);
				const browser = replayer.getBrowser();
				this.addBrowser(browser, flowKey);
				const device = replayer.getDevice();

				const allPages = new AllPagesCache();
				const browserHelper = new BrowserHelper(browser, allPages, device, flowKey);
				browserHelper.monitorAll();

				const pages = await browser.pages();
				for (let index = 0, count = pages.length; index < count; index++) {
					const page = pages[index];
					const uuid = await page.evaluate(() => window.$lhGetUuid());
					allPages.add(uuid, page);
					await PageHelper.monitorRequests(page, browserHelper);
					await PageHelper.control(browserHelper, page, true);
				}
				event.reply(`puppeteer-switched-${flowKey}`);
			}
		);
	}

	private handleCaptureScreen(): void {
		ipcMain.on(
			'capture-screen',
			async (event: IpcMainEvent, arg: { flowKey: string; uuid: string }) => {
				const { flowKey, uuid } = arg;
				const browser = this.getBrowser(flowKey);
				if (browser == null) {
					event.reply(`screen-captured-${flowKey}`, { error: 'Browser not found.' });
					return;
				}
				const pages = await browser.pages();
				const page = pages.find(
					async page => uuid === (await page.evaluate(() => window.$lhGetUuid()))
				);
				if (page == null) {
					event.reply(`screen-captured-${flowKey}`, { error: 'Page not found.' });
				} else {
					try {
						const base64 = await PageHelper.captureScreenshot(page);
						event.reply(`screen-captured-${flowKey}`, { image: base64 });
					} catch (e) {
						console.error(e);
						event.reply(`screen-captured-${flowKey}`, { error: e.message });
					}
				}
			}
		);
	}

	private handleStartPickDOM(): void {
		ipcMain.on(
			'start-pick-dom',
			async (event: IpcMainEvent, arg: { flowKey: string; uuid: string }) => {
				const { flowKey, uuid } = arg;
				const browser = this.getBrowser(flowKey);
				if (browser == null) {
					event.reply('dom-on-page-picked', { error: 'browser not found.' });
					return;
				}
				const pages = await browser.pages();
				const page = pages.find(
					async page => uuid === (await page.evaluate(() => window.$lhGetUuid()))
				);
				if (page == null) {
					event.reply('dom-on-page-picked', { error: 'page not found.' });
				} else {
					const client = await page.target().createCDPSession();
					await client.send('DOM.enable');
					await client.send('Overlay.enable');
					client.on('Overlay.inspectNodeRequested', async data => {
						const { backendNodeId } = data;
						if (backendNodeId) {
							const { root } = (await client.send('DOM.getDocument', {
								depth: -1
							})) as { root: CDPNode };
							const nodesMap = new NodesMap();
							new MyNode(root, nodesMap);
							const {
								nodeIds: [ nodeId ]
							} = (await client.send('DOM.pushNodesByBackendIdsToFrontend', {
								backendNodeIds: [ backendNodeId ]
							})) as { nodeIds: number[] };
							let node = nodesMap.get(nodeId);
							if (node.pseudoType) {
								node = node.parentNode;
							}
							const xpath = this.createXPathFromNode(node, nodesMap);
							const csspath = this.createCssPathFromNode(node, nodesMap);
							const windows = BrowserWindow.getAllWindows();
							windows[0].show();
							windows[0].focus();
							windows[0].focusOnWebView();
							event.reply(`dom-on-page-picked`, { path: { xpath, csspath } });
						}
						await client.send('Overlay.setInspectMode', {
							mode: 'none',
							highlightConfig: {}
						});
					});
					await client.send('Overlay.setInspectMode', {
						mode: 'searchForNode',
						highlightConfig: {
							showInfo: true,
							showStyles: true,
							contentColor: { r: 143, g: 184, b: 227, a: 0.7 },
							marginColor: { r: 246, g: 194, b: 141, a: 0.7 },
							paddingColor: { r: 184, g: 216, b: 169, a: 0.7 }
						}
					});
					await page.bringToFront();
				}
			}
		);
	}

	private launch(): void {
		this.handleLaunch();
		this.handleDisconnect();
		this.handleAbolish();
		this.handleSwitchToRecord();
		this.handleCaptureScreen();
		this.handleStartPickDOM();
	}

	destory(): void {
		console.info('destory all puppeteer browsers.');
		Object.keys(this.browsers).forEach(async (key: string) => {
			console.info(`destory puppeteer browser[${key}]`);
			const browser = this.browsers[key];
			delete this.browsers[key];
			try {
				browser.disconnect();
			} catch {
				// ignore
			}
			try {
				await browser.close();
			} catch {
				// ignore
			}
		});
	}
}

export default new Recorder();
