const { URL } = require('url');
const puppeteer = require('puppeteer');
const { ipcMain } = require('electron');
const { logger } = require('./logger');

// const generateKeyByObject = (story, flow) => {
// 	return `[${flow.name}@${story.name}]`;
// };
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
		// do nohting now
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
		headless: false,
		executablePath: getChromiumExecPath(),
		args: browserArgs,
		slowMo: 100
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
	// open url
	await page.goto(url, { waitUntil: 'domcontentloaded' });
	// RESEARCH too much time, remove
	// try {
	// 	await page.waitForNavigation();
	// } catch (e) {
	// 	console.error(e);
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
		// console.log(`Request ${request.url()} created.`);
		this.requests.push(request);
		// reset used time to 0, ensure timeout is begin from the last created request
		this.used = 0;
	}
	offset(request) {
		// console.log(`Request ${request.url()} offsetted.`);
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

		console.log(
			`Check all requests are done, currently ${this.requests.length} created and ${this.offsets.length} offsetted.`
		);
		logger.debug(
			`Check all requests are done, currently ${this.requests.length} created and ${this.offsets.length} offsetted.`
		)
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
	}
	getStoryName() {
		return this.storyName;
	}
	getFlow() {
		return this.flow;
	}
	getIdentity() {
		`[${this.getFlow().name}@${this.getStoryName()}]`;
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
		this.requests[uuid].create(request);
	}
	offsetRequest(uuid, request) {
		this.requests[uuid].offset(request);
	}
	async isRemoteFinsihed(page) {
		const uuid = this.findUuid(page);
		const requests = this.requests[uuid];
		return requests.waitForAllDone();
	}
	async start() {
		const page = await launchBrowser(this);
		await this.isRemoteFinsihed(page);
	}
	async end(close) {
		const browser = this.getBrowser();
		if (browser == null) {
			// do nothing, seems not start
			return;
		}
		try {
			await browser.disconnect();
		} catch (e) {
			console.error('Failed to disconnect from brwoser.');
			console.error(e);
		}
		if (close) {
			try {
				await browser.close();
				delete browsers[generateKeyByString(this.getStoryName(), this.getFlow().name)];
			} catch (e) {
				console.error('Failed to close brwoser.');
				console.error(e);
			}
		}
	}
	async next(flow, index) {
		this.flow = flow;
		this.currentIndex = index;
		const step = this.getCurrentStep();
		switch (step.type) {
			case 'change':
				return await this.executeChangeStep(step);
			case 'click':
				return await this.executeClickStep(step);
			case 'focus':
				return await this.executeFocusStep(step);
			case 'ajax':
				return await this.executeAjaxStep(step);
			case 'page-created':
				return await this.executePageCreated(step);
			case 'page-switched':
				return await this.executePageSwitched(step);
			case 'end':
			default:
				console.log(`Step[${step.type}] is not implemented yet.`);
				return Promise.resolve();
		}
	}
	async executeChangeStep(step) {
		const page = await this.getPageOrThrow(step.uuid);
		const xpath = step.path.replace(/"/g, "'");
		console.log(`Execute change, step path is ${xpath}, step value is ${step.value}.`);

		const elements = await page.$x(xpath);
		const element = elements[0];
		const elementTagName = await this.getElementTagName(element);
		if (elementTagName === 'INPUT') {
			const elementType = await this.getElementType(element);
			if (['date', 'checkbox'].includes(elementType.toLowerCase())) {
				await this.setValueToElement(element, step.value);
			} else {
				await element.type(step.value);
			}
		} else if (elementTagName === 'SELECT') {
			await this.setValueToElement(element, step.value);
		} else {
			await element.type(step.value);
		}

		await this.isRemoteFinsihed(page);
	}
	async executeClickStep(step) {
		const page = await this.getPageOrThrow(step.uuid);
		const xpath = step.path.replace(/"/g, "'");
		console.log(`Execute click, step path is ${xpath}.`);

		const elements = await page.$x(xpath);
		const element = elements[0];
		const elementTagName = await this.getElementTagName(element);
		if (elementTagName === 'INPUT') {
			const elementType = await this.getElementType(element);
			if (elementType && ['checkbox'].includes(elementType.toLowerCase())) {
				const value = await this.getElementValue(element);
				if (value == step.value) {
					// ignore this click, it was invoked by javascript already
					console.log(
						'Click excution is ignored because of value is matched, it was invoked by javascript already.'
					);
					return;
				}
			}
		}
		const visible = await this.isElementVisible(element);
		if (visible) {
			await elements[0].click();
		} else {
			await element.evaluate(node => node.click());
		}

		await this.isRemoteFinsihed(page);
	}
	async executeFocusStep(step) {
		const page = await this.getPageOrThrow(step.uuid);
		const xpath = step.path.replace(/"/g, "'");
		console.log(`Execute focus, step path is ${xpath}.`);

		const elements = await page.$x(xpath);
		const element = elements[0];
		await element.evaluate(node => {
			node.focus();
			const event = document.createEvent('HTMLEvents');
			event.initEvent('focus', true, true);
			node.dispatchEvent(event);
		});
	}
	async executeAjaxStep(step) {
		// TODO do nothing now
		console.log(`Execute ajax, step url is ${step.url}.`);
	}
	async executePageCreated(step) {
		logger.debug(`Execute page created, step url is ${step.url}.`);
		const page = this.getPage(step.uuid);
		if (page) {
			//do nothing
			logger.debug(`pop up page created, page uuid is ${step.uuid}.`);
		} else {
			const sleep = require('util').promisify(setTimeout);
			await sleep(1000);
			const page = this.getPage(step.uuid);
			if (page) {
				logger.debug(`double check, pop up page created, page uuid is ${step.uuid}.`);
			} else {
				logger.debug(`To creat pop up page, and add page uuid is ${step.uuid}.`);
				const newPage = await this.browser.newPage();
				this.putPage(step.uuid, newPage);
				await controlPage(this, newPage, this.device);
				const [response] = await Promise.all([
					newPage.waitForNavigation(), // The promise resolves after navigation has finished
					await newPage.goto(step.url, { waitUntil: 'domcontentloaded' }), // Go to the url will indirectly cause a navigation
				]);
			}
		}
	}
	async executePageSwitched(step) {
		logger.debug(`Execute page switched, step url is ${step.url}.`);
		const page = this.getPage(step.uuid);
		if (page) {
			await page.bringToFront();
		} else {
			const sleep = require('util').promisify(setTimeout);
			await sleep(1000);
			const page = this.getPage(step.uuid);
			if (page) {
				await page.bringToFront();
			} else {
				logger.debug(`To creat switched page, and add page uuid is ${step.uuid}.`);
				const newPage = await this.browser.newPage();
				this.putPage(step.uuid, newPage);
				await controlPage(this, newPage, this.device);
				const [response] = await Promise.all([
					newPage.waitForNavigation(),
					await newPage.goto(step.url, { waitUntil: 'domcontentloaded' }),
				]);
			}
		}
	}
	getElementTagName = async element => await element.evaluate(node => node.tagName);
	getElementType = async element => await element.evaluate(node => node.getAttribute('type'));
	getElementValue = async element => await element.evaluate(node => node.value);
	isElementVisible = async element => await element.evaluate(node => node.offsetWidth > 0 && node.offsetHeight > 0);
	setValueToElement = async (element, value) => {
		await element.evaluate((node, value) => {
			node.value = value;
			const event = document.createEvent('HTMLEvents');
			event.initEvent('change', true, true);
			node.dispatchEvent(event);
		}, value);
	};
}

const browsers = {};
const launch = () => {
	const waitForNextStep = options => {
		const { storyName, flowName, replayer } = options;
		ipcMain.once(`continue-replay-step-${generateKeyByString(storyName, flowName)}`, async (event, arg) => {
			const { flow, index, command } = arg;
			switch (command) {
				case 'disconnect':
					replayer.end(false);
					break;
				case 'abolish':
					replayer.end(true);
					break;
				default:
					try {
						console.log(`Continue step[${index}]@${generateKeyByString(storyName, flowName)}.`);
						await replayer.next(flow, index);
						waitForNextStep({ event, replayer, storyName, flowName, index });
					} catch (e) {
						console.error(e);
						// failed, prepare for next step
						// send back
						waitForNextStep({ event, replayer, storyName, flowName, index, error: e.message });
					}
			}
		});
		console.log(
			`Reply message step[${options.index}]@[replay-step-end-${generateKeyByString(storyName, flowName)}].`
		);
		options.event.reply(`replay-step-end-${generateKeyByString(storyName, flowName)}`, {
			index: options.index,
			error: options.error
		});
	};
	ipcMain.on('launch-replay', async (event, arg) => {
		const { storyName, flow, index } = arg;
		const replayer = new Replayer({ storyName, flow });
		try {
			await replayer.start();
			// put into cache
			browsers[generateKeyByString(storyName, flow.name)] = replayer.getBrowser();
			// successful, prepare for next step
			// send back
			waitForNextStep({ event, replayer, storyName, flowName: flow.name, index });
		} catch (e) {
			console.error(e);
			// failed, prepare for next step
			// send back
			waitForNextStep({ event, replayer, storyName, flowName: flow.name, index, error: e.message });
		}
	});
};

const destory = () => {
	console.info('destory all puppeteer browsers.');
	Object.keys(browsers).forEach(async key => {
		console.info(`destory puppeteer browser[${key}]`);
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

module.exports = { initialize: () => launch(), destory };

// TODO original codes, backup here
// const readCase = async flowFilePath => {
// 	return new Promise((resolve, reject) => {
// 		const data = jsonfile.readFileSync(flowFilePath);
// 		const closeBrowser = data => {
// 			const { browser } = data;
// 			try {
// 				const windows = BrowserWindow.getAllWindows();
// 				if (windows != null && windows.length > 0) {
// 					windows[0].webContents.send('replay-close', 'done');
// 				}
// 			} catch (e) {
// 				console.error(e);
// 			} finally {
// 				browser.close();
// 			}
// 		};
// 		const errorHandler = error => {
// 			console.log(error);
// 		};
// 		data.steps
// 			.reduce(async (previousPromise, currentStep) => {
// 				try {
// 					const results = await previousPromise;
// 					const { browser, page } = await parseStep({ step: currentStep, ...results });
// 					return Promise.resolve({ browser, page });
// 				} catch (e) {
// 					return Promise.reject(e);
// 				}
// 			}, Promise.resolve({}))
// 			.then(closeBrowser, errorHandler);
// 	});
// };

// const executeReplayStep = async flowFilePath => {
// 	return new Promise((resolve, reject) => {
// 		const data = jsonfile.readFileSync(flowFilePath);
// 		const closeBrowser = data => {
// 			const { browser } = data;
// 			try {
// 				const windows = BrowserWindow.getAllWindows();
// 				if (windows != null && windows.length > 0) {
// 					windows[0].webContents.send('replay-close', 'done');
// 				}
// 			} catch (e) {
// 				console.error(e);
// 			} finally {
// 				browser.close();
// 			}
// 		};
// 		const errorHandler = error => {
// 			console.log(error);
// 		};
// 		data.steps
// 			.reduce(async (previousPromise, currentStep) => {
// 				try {
// 					const results = await previousPromise;
// 					return new Promise(async (resolve, reject) => {
// 						const { browser, page } = await parseStep({ step: currentStep, ...results });
// 						ipcMain.once('replay-step-by-step', (event, arg) => {
// 							if (arg === 'continue') {
// 								resolve({ browser, page });
// 							} else if (arg === 'stop') {
// 								reject({ browser, page });
// 							} else {
// 								console.error(`${arg} is not supported yet, stop replay.`);
// 								reject({ browser, page });
// 							}
// 						});
// 						const windows = BrowserWindow.getAllWindows();
// 						if (windows != null && windows.length > 0) {
// 							windows[0].webContents.send('replay-step-by-step', 'done');
// 						}
// 					}).catch(e => {
// 						console.log('stop replay step by step');
// 						const windows = BrowserWindow.getAllWindows();
// 						if (windows != null && windows.length > 0) {
// 							windows[0].webContents.send('replay-step-by-step-end', 'done');
// 						}
// 						throw 'stop replay step by step!';
// 					});
// 				} catch (e) {
// 					return Promise.reject(e);
// 				}
// 			}, Promise.resolve({}))
// 			.then(closeBrowser, errorHandler);
// 	});
// };
