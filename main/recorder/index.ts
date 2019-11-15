import { BrowserWindow, ipcMain, IpcMainEvent } from 'electron';
import puppeteer, { Browser } from 'puppeteer';
import { Replayer } from '../replayer/types';
import { Device } from '../types';
import BrowserHelper from './browser-helper';
import PageHelper from './page-helper';
import AllPagesCache from './pages-cache';
import { BrowsersCache, CDPNode, CDPNodePseudoType } from './types';

class Node {
	nodeId: number;
	backendNodeId: number;
	nodeType: number;
	pseudoType?: CDPNodePseudoType;
	localName: string;
	attributes: { [key in string]: string } = {};
	children: Node[];
	parentNode?: Node;
	previousSibling?: Node;
	nextSibling?: Node;
	pseudoElements: Node[];

	constructor(node: CDPNode, nodesMap: NodesMap) {
		this.nodeId = node.nodeId;
		this.backendNodeId = node.backendNodeId;
		this.nodeType = node.nodeType;
		this.pseudoType = node.pseudoType;
		this.localName = node.localName;

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
			const childNode = new Node(child, nodesMap);
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
			const pseudoNode = new Node(pseudo, nodesMap);
			pseudoNode.parentNode = this;
			return pseudoNode;
		});
		nodesMap.put(this);
	}
	hasAttribute(name) {
		return typeof this.attributes[name] !== 'undefined';
	}
	getAttribute(name) {
		return this.attributes[name] || '';
	}
}
class NodesMap {
	private attrIdMap = new Map();
	private nodeIdMap = new Map();
	shouldIgnore(id): boolean {
		return PageHelper.shouldIgnore(id);
	}
	put(node): void {
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
	get(nodeId) {
		return this.nodeIdMap.get(nodeId);
	}
	isIdAttrUnique(attrIdValue) {
		const data = this.attrIdMap.get(attrIdValue);
		return data && data.length === 1;
	}
}

class Recorder {
	private replayer: Replayer;
	private browsers: BrowsersCache = {};
	initialize(replayer: Replayer) {
		this.replayer = replayer;
		this.launch();
	}
	private getChromiumExecPath(): string {
		return puppeteer.executablePath().replace('app.asar', 'app.asar.unpacked');
	}
	private generateKeyByString(storyName, flowName) {
		return `[${flowName}@${storyName}]`;
	}
	private getReplayer(): Replayer {
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
	private createXPathFromNode(node: Node, nodesMap: NodesMap): string | null {
		let segs = [];
		for (; node && node.nodeType == 1; node = node.parentNode) {
			const attrIdValue = node.getAttribute('id');
			if (node.hasAttribute('id') && !nodesMap.shouldIgnore(attrIdValue)) {
				if (nodesMap.isIdAttrUnique(attrIdValue)) {
					segs.unshift(`//*[@id="${attrIdValue}"]`);
					return segs.join('/');
				} else {
					segs.unshift(`${node.localName.toLowerCase()}[@id="${attrIdValue}"]`);
				}
			} else {
				let index = 1;
				let sib;
				for (index = 1, sib = node.previousSibling; sib; sib = sib.previousSibling) {
					if (sib.localName == node.localName) {
						index++;
					}
				}
				if (index > 1) {
					segs.unshift(`${node.localName.toLowerCase()}[${index}]`);
				} else {
					segs.unshift(node.localName.toLowerCase());
				}
			}
		}
		return segs.length ? '/' + segs.join('/') : null;
	}
	private handleLaunch() {
		ipcMain.on(
			'launch-puppeteer',
			async (
				event: IpcMainEvent,
				arg: { url: string; device: Device; flowKey: string; uuid: string }
			) => {
				const { url, device, flowKey, uuid } = arg;
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
				await PageHelper.control(browserHelper, page);
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
			async (event: IpcMainEvent, arg: { storyName: string; flowName: string }) => {
				const { storyName, flowName } = arg;
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
					await PageHelper.control(browserHelper, page);
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
							new Node(root, nodesMap);
							const {
								nodeIds: [nodeId]
							} = (await client.send('DOM.pushNodesByBackendIdsToFrontend', {
								backendNodeIds: [backendNodeId]
							})) as { nodeIds: number[] };
							let node = nodesMap.get(nodeId);
							if (node.pseudoType) {
								node = node.parentNode;
							}
							const xpath = this.createXPathFromNode(node, nodesMap);
							const windows = BrowserWindow.getAllWindows();
							windows[0].show();
							windows[0].focus();
							windows[0].focusOnWebView();
							event.reply(`dom-on-page-picked`, { path: xpath });
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
