const { ipcMain, BrowserWindow } = require('electron');
const puppeteer = require('puppeteer');
const uuidv4 = require('uuid/v4');

const getChromiumExecPath = () => {
	return puppeteer.executablePath().replace('app.asar', 'app.asar.unpacked');
};

/**
 * @param {string} storyName
 * @param {string} flowName
 * @returns {string}
 */
const generateKeyByString = (storyName, flowName) => {
	return `[${flowName}@${storyName}]`;
};

class AllPagesCache {
	constructor() {
		this.pages = {};
		this.ready = {};
	}
	/**
	 * @param {string} uuid
	 * @param {Page} page
	 */
	add(uuid, page) {
		this.pages[uuid] = page;
		this.prepare[uuid] = [];
	}
	/**
	 * @param {string} uuid
	 * @param {Function} preparation
	 */
	prepare(uuid, preparation) {
		const chain = this.prepare[uuid];
		if (chain && chain.length === 0) {
			chain.push(true);
			preparation();
		}
	}
	exists(page) {
		return this.findUuidByPage(page) != null;
	}
	findUuidByPage(page) {
		return Object.keys(this.pages).find(uuid => this.pages[uuid] === page);
	}
	/**
	 * @param {string} uuid
	 */
	removeByUuid(uuid) {
		delete this.pages[uuid];
		delete this.prepare[uuid];
	}
	/**
	 * @param {Page} page
	 * @returns {string}
	 */
	removeByPage(page) {
		const uuid = this.findUuidByPage(page);
		if (uuid) {
			this.removeByUuid(uuid);
			return uuid;
		} else {
			return null;
		}
	}
}

/** stop pick dom from page */
const createPageWindowEventRecorder = flowKey => eventJsonStr => {
	if (!eventJsonStr) {
		console.warn('Argument is null.');
		return;
	}
	try {
		const windows = BrowserWindow.getAllWindows();
		const jsonEvent = JSON.parse(eventJsonStr);
		jsonEvent.stepUuid = uuidv4();
		windows[0].webContents.send(`message-captured-${flowKey}`, jsonEvent);
	} catch (e) {
		console.error(e);
	}
};
const captureScreenshot = async page => {
	// wait for ui render
	// await page.waitForNavigation({ waitUntil: 'networkidle2' });
	return await page.screenshot({ encoding: 'base64' });
};
/**
 * expose function to given page
 * @param {Page} page
 * @param {string} flowKey
 * @param {AllPagesCache} allPages
 */
const exposeFunctionToPage = async (page, flowKey, allPages) => {
	const uuid = allPages.findUuidByPage(page);

	// may already installed by replayer
	let exists = await page.evaluate(() => window.$lhGetUuid != null);
	if (!exists) {
		await page.exposeFunction('$lhGetUuid', () => uuid);
	}
	await page.exposeFunction('$lhGetFlowKey', () => flowKey);
	await page.exposeFunction('$lhRecordEvent', createPageWindowEventRecorder(flowKey));
};
/**
 * install listeners on given page
 * @param {Page} page
 */
const installListenersOnPage = async page => {
	console.log('install listener on page');
	const god = () => {
		if (window.$lhGod) {
			return;
		}

		window.$lhGod = true;
		console.log('%c last-hit: %c evaluate on new document start...', 'color:red', 'color:brown');
		const ignoredIdRegexps = [/^md-.+-.{6,16}$/, /^select2-.+$/, /^.+\d{10,}$/, /^\s*$/];
		const shouldIgnore = id => ignoredIdRegexps.some(regexp => regexp.test(id));
		// here we are in the browser context

		// css path createor copy from chrome dev-tools, and make some changes
		const StepPath = class {
			/**
			 * @param {string} value
			 * @param {boolean} optimized
			 */
			constructor(value, optimized) {
				this.value = value;
				this.optimized = optimized || false;
			}

			/**
			 * @override
			 * @return {string}
			 */
			toString() {
				return this.value;
			}
		};
		/**
		 * @param {string} id
		 * @return {string}
		 */
		const idSelector = id => {
			return '#' + CSS.escape(id);
		};
		/**
		 * @param {HTMLElement} elm
		 * @return {string}
		 */
		const nodeNameInCorrectCase = elm => {
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
		};
		/**
		 * @param {HTMLElement} left
		 * @param {HTMLElement} right
		 * @return {boolean}
		 */
		const areNodesSimilar = (left, right) => {
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
			const rightType = right.nodeType === Node.CDATA_SECTION_NODE ? Node.TEXT_NODE : right.nodeType;
			return leftType === rightType;
		};
		/**
		 * @param {HTMLElement} elm
		 * @return {number} -1 in case of error,
		 * 0 if no siblings matching the same expression,
		 * <XPath index among the same expression-matching sibling nodes> otherwise.
		 */
		const getNodeIndexForXPath = elm => {
			const siblings = elm.parentNode ? elm.parentNode.children : null;
			if (!siblings) {
				return 0;
			} // Root node - no siblings.
			let hasSameNamedElements;
			for (let i = 0; i < siblings.length; ++i) {
				if (areNodesSimilar(elm, siblings[i]) && siblings[i] !== elm) {
					hasSameNamedElements = true;
					break;
				}
			}
			if (!hasSameNamedElements) {
				return 0;
			}
			let ownIndex = 1; // XPath indices start with 1.
			for (let i = 0; i < siblings.length; ++i) {
				if (areNodesSimilar(elm, siblings[i])) {
					if (siblings[i] === elm) {
						return ownIndex;
					}
					++ownIndex;
				}
			}
			return -1; // An error occurred: |node| not found in parent's children.
		};
		/**
		 * @param {HTMLElement} elm
		 * @param {boolean} optimized
		 * @return {StepPath}
		 */
		const createXPathStep = (elm, optimized) => {
			let ownValue;
			const ownIndex = getNodeIndexForXPath(elm);
			if (ownIndex === -1) {
				return null;
			} // Error.

			switch (elm.nodeType) {
				case Node.ELEMENT_NODE:
					const id = elm.getAttribute('id');
					if (optimized && id && !shouldIgnore(id)) {
						return new StepPath('//*[@id="' + id + '"]', true);
					}
					ownValue = elm.localName;
					break;
				case Node.ATTRIBUTE_NODE:
					ownValue = '@' + elm.nodeName;
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

			return new StepPath(ownValue, elm.nodeType === Node.DOCUMENT_NODE);
		};
		const createXPathFromElement = (elm, optimized) => {
			if (elm.nodeType === Node.DOCUMENT_NODE) {
				return '/';
			}

			const steps = [];
			let contextNode = elm;
			while (contextNode) {
				const step = createXPathStep(contextNode, optimized);
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
		};
		/**
		 * @param {HTMLElement} elm
		 * @return {string[]}
		 */
		const prefixedElementClassNames = elm => {
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
		};
		/**
		 * @param {HTMLElement} elm
		 * @param {boolean} optimized
		 * @param {boolean} isTargetNode
		 * @return {StepPath}
		 */
		const createCssPathStep = (elm, optimized, isTargetNode) => {
			if (elm.nodeType !== Node.ELEMENT_NODE) {
				return null;
			}

			const id = elm.getAttribute('id');
			if (optimized) {
				if (id && !shouldIgnore(id)) {
					return new StepPath(idSelector(id), true);
				}
				const nodeNameLower = elm.nodeName.toLowerCase();
				if (nodeNameLower === 'body' || nodeNameLower === 'head' || nodeNameLower === 'html') {
					return new StepPath(nodeNameInCorrectCase(elm), true);
				}
			}
			const nodeName = nodeNameInCorrectCase(elm);

			if (id && !shouldIgnore(id)) {
				return new StepPath(nodeName + idSelector(id), true);
			}
			const parent = elm.parentNode;
			if (!parent || parent.nodeType === Node.DOCUMENT_NODE) {
				return new StepPath(nodeName, true);
			}

			const prefixedOwnClassNamesArray = prefixedElementClassNames(elm);
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
				if (nodeNameInCorrectCase(sibling) !== nodeName) {
					continue;
				}

				needsClassNames = true;
				const ownClassNames = new Set(prefixedOwnClassNamesArray);
				if (!ownClassNames.size) {
					needsNthChild = true;
					continue;
				}
				const siblingClassNamesArray = prefixedElementClassNames(sibling);
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
				(!id || shouldIgnore(id)) &&
				!elm.getAttribute('class')
			) {
				result += '[type=' + CSS.escape(elm.getAttribute('type')) + ']';
			}
			if (needsNthChild) {
				result += ':nth-child(' + (ownIndex + 1) + ')';
			} else if (needsClassNames) {
				for (const prefixedName of prefixedOwnClassNamesArray) {
					result += '.' + CSS.escape(prefixedName.slice(1));
				}
			}

			return new StepPath(result, false);
		};
		/**
		 * @param {HTMLElement} elm
		 * @param {boolean} optimized
		 * @return {string}
		 */
		const createCssPathFromElement = (elm, optimized) => {
			if (elm.nodeType !== Node.ELEMENT_NODE) {
				return '';
			}

			const steps = [];
			let contextNode = elm;
			while (contextNode) {
				const step = createCssPathStep(contextNode, !!optimized, contextNode === elm);
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
		};

		const transformEvent = (e, element) => {
			let xpath = createXPathFromElement(element, true);
			let csspath = createCssPathFromElement(element, true);
			if ((e.type === 'click' || e.type === 'mousedown') && xpath.indexOf('/svg') !== -1) {
				console.log('xpath contains svg dom node.');
				const newXpath = xpath.replace(/^(.*button.*)\/svg.*$/, '$1');
				const newCssPaath = csspath.replace(/^(.*button.*)\s>\ssvg.*$/, '$1');
				console.log(`new xpath after svg cut-off is ${newXpath}.`);
				if (newXpath !== xpath) {
					// replaced
					let parent = element;
					while (parent.tagName !== 'BUTTON') {
						parent = parent.parentElement;
					}
					element = parent;
					xpath = newXpath;
					csspath = newCssPaath;
				}
			}

			return {
				// keys
				altKey: e.altKey,
				ctrlKey: e.ctrlKey,
				metaKey: e.metaKey,
				shiftKey: e.shiftKey,
				// mouse buttons
				button: e.button,
				buttons: e.buttons,
				detail: e.detail,
				/** positions */
				clientX: e.clientX,
				clientY: e.clientY,
				pageX: e.pageX,
				pageY: e.pageY,
				screenX: e.screenX,
				screenY: e.screenY,
				scrollTop: element === document ? document.documentElement.scrollTop : element.scrollTop,
				scrollLeft: element === document ? document.documentElement.scrollLeft : element.scrollLeft,
				timeStamp: e.timeStamp,
				type: e.type,
				// event source. true: generated by user action; false: generated by scripts
				isTrusted: e.isTrusted,
				value: e.type !== 'keydown' ? element.value : e.key,
				// computed
				path: xpath,
				csspath: csspath,
				target:
					element === document
						? 'document'
						: `<${element.tagName.toLowerCase()} ${element
								.getAttributeNames()
								.map(name => `${name}="${element.getAttribute(name)}"`)
								.join(' ')}>`
				// bubbles: e.bubbles,
				// cancelBubble: e.cancelBubble,
				// cancelable: e.cancelable,
				// composed: e.composed,
				// currentTarget: e.currentTarget && e.currentTarget.outerHTML,
				// defaultPrevented: e.defaultPrevented,
				// eventPhase: e.eventPhase,
				// fromElement: e.fromElement && e.fromElement.outerHTML,
				// layerX: e.layerX,
				// layerY: e.layerY,
				// movementX: e.movementX,
				// movementY: e.movementY,
				// offsetX: e.offsetX,
				// offsetY: e.offsetY,
				// relatedTarget: e.relatedTarget && e.relatedTarget.outerHTML,

				// sourceCapabilities: e.sourceCapabilities && e.sourceCapabilities.toString(),
				// toElement: e.toElement && e.toElement.outerHTML,
				// view: e.view && e.view.toString(),
				// which: e.which,
				// x: e.x,
				// y: e.y,
			};
		};
		let scrollTimeoutHandle;
		const eventHandler = e => {
			if (!e) {
				return;
			}
			if (['STYLE'].includes(e.target && e.target.tagName)) {
				// inline style tag, ignored
				return;
			}
			if (e.type === 'keydown' && e.key !== 'Enter') {
				//just record Enter
				return;
			}

			let element = e.target;
			const data = transformEvent(e, element);
			data.uuid = window.$lhUuid;
			if (e.type === 'scroll') {
				if (scrollTimeoutHandle) {
					clearTimeout(scrollTimeoutHandle);
				}
				scrollTimeoutHandle = setTimeout(() => {
					window.$lhRecordEvent(JSON.stringify(data));
					scrollTimeoutHandle = null;
				}, 100);
			} else if (
				e.type === 'change' &&
				element.tagName === 'INPUT' &&
				(element.getAttribute('type') || '').toLowerCase() === 'file'
			) {
				// catch upload file
				const file = element.files[0];
				if (file) {
					const reader = new FileReader();
					reader.onload = () => {
						data.file = reader.result;
						window.$lhRecordEvent(JSON.stringify(data));
					};
					reader.readAsDataURL(file);
				}
			} else if (
				element.tagName === 'INPUT' &&
				['checkbox', 'radio'].indexOf((element.getAttribute('type') || '').toLowerCase()) != -1
			) {
				// record checked
				data.checked = element.checked;
				window.$lhRecordEvent(JSON.stringify(data));
			} else {
				window.$lhRecordEvent(JSON.stringify(data));
			}
		};

		window.$lhGetUuid().then(uuid => {
			window.$lhUuid = uuid;
		});

		Object.values({
			CLICK: 'click',
			// DBLCLICK: 'dblclick',
			CHANGE: 'change',
			KEYDOWN: 'keydown',
			// SELECT: 'select'
			FOCUS: 'focus',
			SCROLL: 'scroll',
			// onchange:"on-change",
			MOUSE_DOWN: 'mousedown',
			SUBMIT: 'submit'
			// LOAD: 'load',
			// UNLOAD: 'unload',
			// VALUE_CHANGE: 'valuechange'
		}).forEach(eventType => document.addEventListener(eventType, eventHandler, { capture: true }));

		const recordDialogEvent = options => {
			const { message, defaultMessage, returnValue, eventType, dialogType } = options;
			window.$lhRecordEvent(
				JSON.stringify({
					uuid: window.$lhUuid,
					type: eventType,
					dialog: dialogType,
					message,
					defaultMessage,
					returnValue,
					target: 'document',
					url: window.location.href
				}),
				false
			);
		};
		// take over native dialog, 4 types: alert, prompt, confirm and beforeunload
		//
		const nativeAlert = window.alert;
		window.alert = message => {
			recordDialogEvent({ message, eventType: 'dialog-open', dialogType: 'alert' });
			nativeAlert(message);
			recordDialogEvent({ message, eventType: 'dialog-close', dialogType: 'alert' });
		};
		const nativeConfirm = window.confirm;
		window.confirm = message => {
			recordDialogEvent({ message, eventType: 'dialog-open', dialogType: 'confirm' });
			const ret = nativeConfirm(message);
			recordDialogEvent({ message, eventType: 'dialog-close', dialogType: 'confirm', returnValue: ret });
			return ret;
		};
		const nativePrompt = window.prompt;
		window.prompt = (message, defaultMessage) => {
			recordDialogEvent({ message, defaultMessage, eventType: 'dialog-open', dialogType: 'prompt' });
			const ret = nativePrompt(message, defaultMessage);
			recordDialogEvent({
				message,
				defaultMessage,
				eventType: 'dialog-close',
				dialogType: 'prompt',
				returnValue: ret
			});
			return ret;
		};

		console.log('%c last-hit: %c evaluate on new document end...', 'color:red', 'color:brown');
	};
	// some pages postpones the page created or popup event. so evaluateOnNewDocument doesn't work.
	// in this case, run evaluate for ensuring the god logic should be install into page
	// anyway, monitors cannot be installed twice, so add varaiable $lhGod on window to prevent
	await page.evaluateOnNewDocument(god);
	await page.evaluate(god);
};

const staticResourceTypes = [
	'document',
	'stylesheet',
	'image',
	'media',
	'font',
	'script',
	'texttrack',
	'eventsource',
	'manifest',
	'other'
];
const dynamicResourceTypes = ['xhr', 'fetch', 'websocket'];
const isDynamicResource = resourceType => dynamicResourceTypes.includes(resourceType);
/**
 *
 * @param {Page} page
 * @param {string} flowKey
 * @param {AllPagesCache} allPages
 */
const recordRemoteRequests = async (page, flowKey, allPages) => {
	const sendRecordedEvent = createPageWindowEventRecorder(flowKey);
	page.on('requestfinished', async request => {
		const url = request.url();
		const response = request.response();
		const resourceType = request.resourceType();

		if (isDynamicResource(resourceType)) {
			// dynamic resources
			const sendEvent = body => {
				try {
					sendRecordedEvent(
						JSON.stringify({
							type: 'ajax',
							uuid: allPages.findUuidByPage(page),
							request: {
								url,
								method: request.method(),
								headers: request.headers(),
								body: request.postData(),
								resourceType
							},
							response: {
								statusCode: response.status(),
								statusMessage: response.statusText(),
								headers: response.headers(),
								body
							}
						})
					);
				} catch (err) {
					console.error(`Failed getting data from: ${url}`);
					console.error(err);
				}
			};
			try {
				sendEvent(await response.text());
			} catch {
				setTimeout(async () => {
					try {
						sendEvent(await response.text());
					} catch {
						sendEvent();
					}
				}, 1000);
			}
		} else {
			// static resource
			// IMPORTANT IGNORED NOW, BECAUSE OF PREFORMANCE ISSUE IN RENDERERING
			// try {
			// 	sendRecordedEvent(
			// 		JSON.stringify({
			// 			type: 'resource-load',
			// 			request: { url, method: request.method(), resourceType },
			// 			response: {
			// 				statusCode: response.status(),
			// 				statusMessage: response.statusText()
			// 			}
			// 		})
			// 	);
			// } catch (err) {
			// 	console.error(`Failed getting data from: ${url}`);
			// 	console.error(err);
			// }
		}
	});
	page.on('requestfailed', async request => {
		const url = request.url();
		const resourceType = request.resourceType();

		if (isDynamicResource(resourceType)) {
			// dynamic resources
			try {
				sendRecordedEvent(
					JSON.stringify({
						type: 'ajax',
						uuid: allPages.findUuidByPage(page),
						failed: true,
						request: {
							url,
							method: request.method(),
							headers: request.headers(),
							body: request.postData(),
							resourceType
						}
					})
				);
			} catch (err) {
				console.error(`Failed getting data from: ${url}`);
				console.error(err);
			}
		} else {
		}
	});
};

/**
 * @param {Page} page
 * @param {string} flowKey
 */
const isAllRelatedPagesClosed = async (page, flowKey) => {
	const pages = await page.browser().pages();
	return pages.filter(p => page !== p).length === 0;
};
/**
 *
 * @param {Page} page
 * @param {Object} options
 * @param {Object} options.device
 * @param {string} options.device.name
 * @param {string} options.device.userAgent
 * @param {Object} options.device.viewport
 * @param {number} options.device.viewport.width
 * @param {number} options.device.viewport.height
 * @param {number} options.device.viewport.deviceScaleFactor
 * @param {boolean} options.device.viewport.isMobile
 * @param {boolean} options.device.viewport.hasTouch
 * @param {boolean} options.device.viewport.isLandscape
 * @param {string} options.flowKey
 * @param {AllPagesCache} allPages
 */
const controlPage = async (page, options, allPages) => {
	const { device, flowKey } = options;
	const sendRecordedEvent = createPageWindowEventRecorder(flowKey);
	await exposeFunctionToPage(page, flowKey, allPages);
	await installListenersOnPage(page, flowKey);
	await page.emulate(device);
	await page.emulateMedia('screen');
	const setBackground = () => (document.documentElement.style.backgroundColor = 'rgba(25,25,25,0.8)');
	await page.evaluate(setBackground);

	const client = await page.target().createCDPSession();
	if (device.viewport.isMobile) {
		await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
		await client.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
		await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
	}
	// await client.send('Animation.enable');
	// client.on('Animation.animationStarted', ({ animation }) => {
	// 	sendRecordedEvent(
	// 		JSON.stringify({
	// 			type: 'animation',
	// 			duration: (animation.source || {}).duration,
	// 			uuid: allPages.findUuidByPage(page)
	// 		})
	// 	);
	// });

	page.on('load', async () => {
		await page.evaluate(setBackground);
	});
	page.on('close', async () => {
		// RESEARCH already closed? seems like this.
		// traverse all pages to check all related pages were closed or not
		const allClosed = await isAllRelatedPagesClosed(page, flowKey);
		const uuid = allPages.removeByPage(page);
		if (uuid) {
			sendRecordedEvent(JSON.stringify({ type: 'page-closed', url: page.url(), allClosed, uuid }));
		}

		try {
			client.detach();
		} catch {}
	});
	// page created by window.open or anchor
	page.on('popup', async newPage => {
		console.log('page event popup caught');
		if (!allPages.exists(newPage)) {
			// not found in pages
			const uuid = uuidv4();
			allPages.add(uuid, newPage);
			allPages.prepare(uuid, async () => {
				await controlPage(newPage, { device, flowKey }, allPages);
			});
			const base64 = await captureScreenshot(newPage);
			sendRecordedEvent(JSON.stringify({ type: 'page-created', url: newPage.url(), image: base64, uuid }));
		}
	});
	// use scripts interception
	page.on('dialog', async dialog => {
		console.log(`page event dialog caught`);
		if (dialog.type() === 'beforeunload') {
			const base64 = await captureScreenshot(page);
			const uuid = allPages.findUuidByPage(page);
			sendRecordedEvent(
				JSON.stringify({ type: 'dialog-open', dialog: 'beforeunload', url: page.url(), image: base64, uuid })
			);
		}
	});
	page.on('pageerror', async () => {
		console.log(`page event pageerror caught`);
		const base64 = await captureScreenshot(page);
		const uuid = allPages.findUuidByPage(page);
		sendRecordedEvent(JSON.stringify({ type: 'page-error', url: page.url(), image: base64, uuid }));
	});
};

const browsers = {};
const launch = () => {
	const initializeBrowser = async (browser, allPages, device, flowKey) => {
		const sendRecordedEvent = createPageWindowEventRecorder(flowKey);
		browser.on('disconnected', () => {
			sendRecordedEvent(JSON.stringify({ type: 'end' }));
		});
		browser.on('targetcreated', async newTarget => {
			if (newTarget.type() === 'page') {
				console.log('browser event target created caught');
				const newPage = await newTarget.page();
				if (!allPages.exists(newPage)) {
					// not found in pages
					const uuid = uuidv4();
					allPages.add(uuid, newPage);
					allPages.prepare(uuid, async () => {
						await controlPage(newPage, { device, flowKey }, allPages);
					});
					const base64 = await captureScreenshot(newPage);
					sendRecordedEvent(
						JSON.stringify({ type: 'page-created', url: newPage.url(), image: base64, uuid })
					);
				}
			}
		});
		browser.on('targetchanged', async target => {
			if (target.type() === 'page') {
				console.log('browser event target changed caught');
				// RESEARCH the url is old when target changed event is catched, so must wait the new url.
				// don't know the mechanism
				const page = await target.page();
				const uuid = allPages.findUuidByPage(page);
				const url = page.url();
				// allPages.prepare(uuid, async () => {
				// 	await controlPage(page, { device, flowKey }, allPages);
				// });
				sendRecordedEvent(JSON.stringify({ type: 'page-switched', url, uuid }));
				let times = 0;
				const handle = () => {
					setTimeout(() => {
						times++;
						const anUrl = page.url();
						if (url === anUrl) {
							if (times < 10) {
								// max 10 times
								handle();
							}
						} else {
							sendRecordedEvent(JSON.stringify({ type: 'page-switched', url: anUrl, uuid }));
						}
					}, 100);
				};
				handle();
			}
		});
		browser.on('targetdestroyed', async target => {
			if (target.type() === 'page') {
				console.log('browser event target destroyed caught');
				const page = await target.page();
				const allClosed = await isAllRelatedPagesClosed(page, flowKey);
				const uuid = allPages.removeByPage(page);
				if (uuid) {
					sendRecordedEvent(JSON.stringify({ type: 'page-closed', url: page.url(), uuid, allClosed }));
				}
			}
		});
	};

	ipcMain.on('launch-puppeteer', (event, arg) => {
		(async () => {
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
				executablePath: getChromiumExecPath(),
				args: browserArgs,
				defaultViewport: null
			});
			// cache browser on global
			browsers[flowKey] = browser;
			// check which page will be used
			const pages = await browser.pages();
			if (pages != null && pages.length > 0) {
				await pages[0].close();
			}
			const page = await browser.newPage();
			// give uuid to pages
			const allPages = new AllPagesCache();
			allPages.add(uuid, page);

			initializeBrowser(browser, allPages, device, flowKey);

			await recordRemoteRequests(page, flowKey, allPages);
			await page.goto(url, { waitUntil: 'domcontentloaded' });
			allPages.prepare(uuid, async () => {
				await controlPage(page, { device, flowKey }, allPages);
			});
			try {
				await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
			} catch (e) {
				console.error('Failed to wait for navigation dom content loaded.');
				console.error(e);
			}
		})();
	});
	const disconnectPuppeteer = async (flowKey, close) => {
		const browser = browsers[flowKey];
		try {
			await browser.disconnect();
		} catch (e) {
			console.error('Failed to disconnect from brwoser.');
			console.error(e);
		}
		if (close) {
			try {
				await browser.close();
				delete browsers[flowKey];
			} catch (e) {
				console.error('Failed to close brwoser.');
				console.error(e);
			}
		}
	};
	ipcMain.on('disconnect-puppeteer', (event, arg) => {
		(async () => {
			const { flowKey } = arg;
			await disconnectPuppeteer(flowKey);
		})();
	});
	ipcMain.on('abolish-puppeteer', (event, arg) => {
		(async () => {
			const { flowKey } = arg;
			await disconnectPuppeteer(flowKey, true);
		})();
	});
	ipcMain.on('switch-puppeteer', async (event, arg) => {
		const { storyName, flowName } = arg;
		const flowKey = generateKeyByString(storyName, flowName);
		const replayer = replayers.abandon(storyName, flowName);
		const browser = replayer.getBrowser();
		browsers[flowKey] = browser;
		const device = replayer.getDevice();

		const pages = await browser.pages();
		const allPages = new AllPagesCache();
		for (let index = 0, count = pages.length; index < count; index++) {
			const page = pages[index];
			const uuid = await page.evaluate(() => $lhGetUuid());
			allPages.add(uuid, page);
			await recordRemoteRequests(page, flowKey, allPages);
			await controlPage(page, { device, flowKey }, allPages);
		}
		await initializeBrowser(browser, allPages, device, flowKey);
		event.reply(`puppeteer-switched-${flowKey}`);
	});
	ipcMain.on('capture-screen', (event, arg) => {
		(async () => {
			const { flowKey, uuid } = arg;
			const browser = browsers[flowKey];
			if (browser == null) {
				event.reply(`screen-captured-${flowKey}`, { error: 'Browser not found.' });
				return;
			}
			const pages = await browser.pages();
			const page = pages.find(async page => {
				return uuid === (await page.evaluate(() => window.$lhGetUuid()));
			});
			if (page == null) {
				event.reply(`screen-captured-${flowKey}`, { error: 'Page not found.' });
			} else {
				try {
					const base64 = await page.screenshot({ encoding: 'base64' });
					event.reply(`screen-captured-${flowKey}`, { image: base64 });
				} catch (e) {
					console.error(e);
					event.reply(`screen-captured-${flowKey}`, { error: e.message });
				}
			}
		})();
	});

	class NodesMap {
		constructor() {
			this.ignoredIdRegexps = [/^md-.+-.{6,16}$/, /^select2-.+$/, /^.+\d{10,}$/, /^\s*$/];
			this.attrIdMap = new Map();
			this.nodeIdMap = new Map();
		}
		shouldIgnore(id) {
			return this.ignoredIdRegexps.some(regexp => regexp.test(id));
		}
		put(node) {
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
	class Node {
		/**
		 * @param {*} node
		 * @param {NodesMap} nodesMap
		 */
		constructor(node, nodesMap) {
			this.nodeId = node.nodeId;
			this.backendNodeId = node.backendNodeId;
			this.nodeType = node.nodeType;
			this.pseudoType = node.pseudoType;
			this.localName = node.localName;

			this.attributes = {};
			if (node.attributes && node.attributes.length > 0) {
				for (let index = 0, count = node.attributes.length / 2; index < count; index = index + 2) {
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
	/**
	 * @param {Node} node
	 * @param {NodesMap} nodesMap
	 */
	const createXPathFromNode = (node, nodesMap) => {
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
	};
	ipcMain.on('start-pick-dom', (event, arg) => {
		(async () => {
			const { flowKey, uuid } = arg;
			const browser = browsers[flowKey];
			if (browser == null) {
				event.reply('dom-on-page-picked', { error: 'browser not found.' });
				return;
			}
			const pages = await browser.pages();
			const page = pages.find(async page => {
				return uuid === (await page.evaluate(() => window.$lhGetUuid()));
			});
			if (page == null) {
				event.reply('dom-on-page-picked', { error: 'page not found.' });
			} else {
				const client = await page.target().createCDPSession();
				await client.send('DOM.enable');
				await client.send('Overlay.enable');
				client.on('Overlay.inspectNodeRequested', async data => {
					const { backendNodeId } = data;
					if (backendNodeId) {
						const { root } = await client.send('DOM.getDocument', { depth: -1 });
						const nodesMap = new NodesMap();
						new Node(root, nodesMap);
						const {
							nodeIds: [nodeId]
						} = await client.send('DOM.pushNodesByBackendIdsToFrontend', {
							backendNodeIds: [backendNodeId]
						});
						let node = nodesMap.get(nodeId);
						if (node.pseudoType) {
							node = node.parentNode;
						}
						const xpath = createXPathFromNode(node, nodesMap);
						const windows = BrowserWindow.getAllWindows();
						windows[0].show();
						windows[0].focus();
						windows[0].focusOnWebView();
						event.reply(`dom-on-page-picked`, { path: xpath });
					}
					await client.send('Overlay.setInspectMode', { mode: 'none', highlightConfig: {} });
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
		})();
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

let replayers;

module.exports = {
	initialize: replay => {
		replayers = replay;
		launch();
	},
	destory
};
