import { Device } from "last-hit-types";
import { CDPSession, Page, ResourceType } from "puppeteer";
import uuidv4 from "uuid/v4";
import BrowserHelper from "./browser-helper";

const staticResourceTypes: ResourceType[] = [
	"document",
	"stylesheet",
	"image",
	"media",
	"font",
	"script",
	"texttrack",
	"eventsource",
	"manifest",
	"other",
];
const dynamicResourceTypes: ResourceType[] = ["xhr", "fetch", "websocket"];
const ignoredIdRegexps = [
	/^md-.+-.{6,16}$/,
	/^select2-.+$/,
	/^.+\d{10,}$/,
	/^\s*$/,
	/^.+-\d{2,10}--value$/,
	/^.+-\d{1,}$/,
	/^.+_\d{1,}$/,
	/^react-select.+-.+$/,
];
const idShouldIgnore = (id: string): boolean => ignoredIdRegexps.some((regexp) => regexp.test(id));
export default class PageHelper {
	private static dataAttrName: string | null | undefined = null;

	public static setDataAttrName(dataAttrName?: string): void {
		PageHelper.dataAttrName = dataAttrName;
	}

	private static async createCDPClient(page: Page): Promise<CDPSession> {
		return await page.target().createCDPSession();
	}

	static async captureScreenshot(page: Page): Promise<string> {
		return await page.screenshot({ encoding: "base64" });
	}

	static async isAllRelatedPagesClosed(page: Page): Promise<boolean> {
		const pages = await page.browser().pages();
		return pages.filter((p) => page !== p).length === 0;
	}

	static shouldIgnore(id: string): boolean {
		return idShouldIgnore(id);
	}

	private static async emulate(page: Page, device: Device, client: CDPSession): Promise<void> {
		if (device.wechat && (device.userAgent || "").indexOf("MicroMessenger") === -1) {
			device.userAgent = `${device.userAgent} MicroMessenger/6.5.7`;
		}
		await page.emulate(device);
		await page.emulateMedia("screen");
		const setBackground = () => (document.documentElement.style.backgroundColor = "rgba(25,25,25,0.8)");
		await page.evaluate(setBackground);
		page.on("load", async () => await page.evaluate(setBackground));

		if (device.viewport.isMobile) {
			await client.send("Emulation.setFocusEmulationEnabled", { enabled: true });
			// IMPORTANT emit as touch events will introduce many problems
			// such as touch on a button and scroll
			// replayer cannot know it is a click/tap or a scroll when touch end
			// await client.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
			// await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
		}
	}

	private static async exposeFunctionToPage(browserHelper: BrowserHelper, page: Page): Promise<void> {
		const uuid = browserHelper.getAllPages().findUuidByPage(page);
		const flowKey = browserHelper.getFlowKey();
		const eventRecorder = browserHelper.getEventRecorder();

		// may already installed by replayer
		let exists = await page.evaluate(() => window.$lhGetUuid != null);
		if (!exists) {
			await page.exposeFunction("$lhGetUuid", () => uuid);
		}
		await page.exposeFunction("$lhGetFlowKey", () => flowKey);
		await page.exposeFunction("$lhRecordEvent", eventRecorder.record);
	}

	private static async installListenersOnPage(
		browserHelper: BrowserHelper,
		page: Page,
		onSwitchFromReplayToRecord: boolean = false
	): Promise<void> {
		console.log("install listener on page");
		const god = () => {
			if (window.$lhGod) {
				return;
			}

			window.$lhGod = true;
			console.log("%c last-hit: %c evaluate on new document start...", "color:red", "color:brown");

			// here we are in the browser context
			const ignoredIdRegexps = [
				/^md-.+-.{6,16}$/,
				/^select2-.+$/,
				/^.+\d{10,}$/,
				/^\s*$/,
				/^.+-\d{2,10}--value$/,
				/^.+-\d{1,}$/,
				/^.+_\d{1,}$/,
				/^react-select.+-.+$/,
			];
			const idShouldIgnore = (id: string): boolean => ignoredIdRegexps.some((regexp) => regexp.test(id));
			const idSelector = (id) => `#${CSS.escape(id)}`;
			const nodeNameInCorrectCase = (elm: Node & Element): string => {
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
			const areNodesSimilar = (left: Element, right: Element): boolean => {
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
			 * @return {number} -1 in case of error,
			 * 0 if no siblings matching the same expression,
			 * <XPath index among the same expression-matching sibling nodes> otherwise.
			 */
			const getNodeIndexForXPath = (elm: Element): number => {
				const siblings = elm.parentNode ? elm.parentNode.children : null;
				if (!siblings) {
					return 0;
				} // Root node - no siblings.
				let hasSameNamedElements: boolean;
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
			const createXPathStep = (elm: Element, optimized: boolean): StepPath => {
				let ownValue;
				const ownIndex = getNodeIndexForXPath(elm);
				if (ownIndex === -1) {
					return null;
				} // Error.

				switch (elm.nodeType) {
					case Node.ELEMENT_NODE:
						const id = elm.getAttribute("id");
						if (optimized && id && !idShouldIgnore(id)) {
							return new StepPath('//*[@id="' + id + '"]', true);
						}
						ownValue = elm.localName;
						break;
					case Node.ATTRIBUTE_NODE:
						ownValue = "@" + elm.nodeName;
						break;
					case Node.TEXT_NODE:
					case Node.CDATA_SECTION_NODE:
						ownValue = "text()";
						break;
					case Node.PROCESSING_INSTRUCTION_NODE:
						ownValue = "processing-instruction()";
						break;
					case Node.COMMENT_NODE:
						ownValue = "comment()";
						break;
					case Node.DOCUMENT_NODE:
						ownValue = "";
						break;
					default:
						ownValue = "";
						break;
				}

				if (ownIndex > 0) {
					ownValue += "[" + ownIndex + "]";
				}

				return new StepPath(ownValue, elm.nodeType === Node.DOCUMENT_NODE);
			};
			const createXPathFromElement = (elm: Element, optimized: boolean): string => {
				if (elm.nodeType === Node.DOCUMENT_NODE) {
					return "/";
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
					contextNode = contextNode.parentNode as Element;
				}

				steps.reverse();
				return (steps.length && steps[0].optimized ? "" : "/") + steps.join("/");
			};
			const prefixedElementClassNames = (elm: Element): string[] => {
				const classNames = elm.getAttribute("class");
				if (!classNames) {
					return [];
				}

				return classNames
					.split(/\s+/g)
					.filter(Boolean)
					.map((name) => {
						// The prefix is required to store "__proto__" in a object-based map.
						return "$" + name;
					});
			};
			const createCssPathStep = (elm: Element, optimized: boolean, isTargetNode: boolean): StepPath => {
				if (elm.nodeType !== Node.ELEMENT_NODE) {
					return null;
				}

				const id = elm.getAttribute("id");
				if (optimized) {
					if (id && !idShouldIgnore(id)) {
						return new StepPath(idSelector(id), true);
					}
					const nodeNameLower = elm.nodeName.toLowerCase();
					if (nodeNameLower === "body" || nodeNameLower === "head" || nodeNameLower === "html") {
						return new StepPath(nodeNameInCorrectCase(elm), true);
					}
				}
				const nodeName = nodeNameInCorrectCase(elm);

				if (id && !idShouldIgnore(id)) {
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
					nodeName.toLowerCase() === "input" &&
					elm.getAttribute("type") &&
					(!id || idShouldIgnore(id)) &&
					!elm.getAttribute("class")
				) {
					result += "[type=" + CSS.escape(elm.getAttribute("type")) + "]";
				}
				if (needsNthChild) {
					result += ":nth-child(" + (ownIndex + 1) + ")";
				} else if (needsClassNames) {
					for (const prefixedName of prefixedOwnClassNamesArray) {
						result += "." + CSS.escape(prefixedName.slice(1));
					}
				}

				return new StepPath(result, false);
			};
			const createCssPathFromElement = (elm: Element, optimized: boolean): string => {
				if (elm.nodeType !== Node.ELEMENT_NODE) {
					return "";
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
					contextNode = contextNode.parentNode as Element;
				}

				steps.reverse();
				return steps.join(" > ");
			};
			const createDataPathFromElement = (elm: Element): string | null => {
				if (elm.nodeType === Node.DOCUMENT_NODE) {
					return "";
				}

				// detect data attribute name
				const attrName = `data-${window.$lhDataAttrName || "lh-key"}`;
				const paths = [];
				while (true) {
					const value = elm.getAttribute(attrName);
					if (value) {
						paths.push(`[${attrName}="${value}"]`);
						return paths.reverse().join(" > ");
					} else {
						const parent = elm.parentElement;
						if (!parent || parent == document.body) {
							return null;
						} else {
							const children = parent.children;
							for (let index = 0, count = children.length; index < count; index++) {
								const child = children.item(index);
								if (child == elm) {
									paths.push(`${elm.tagName}:nth-child(${index + 1})`);
									elm = parent;
									break;
								}
							}
						}
					}
				}
			};

			// css path creator copy from chrome dev-tools, and make some changes
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

			const transformEvent = (e: any, element: any): { [key in string]: any } => {
				let xpath = createXPathFromElement(element, true);
				let csspath = createCssPathFromElement(element, true);
				let datapath = createDataPathFromElement(element);
				if ((e.type === "click" || e.type === "mousedown") && xpath.indexOf("/svg") !== -1) {
					console.log("xpath contains svg dom node.");
					const newXpath = xpath.replace(/^(.*button.*)\/svg.*$/, "$1");
					const newCssPath = csspath.replace(/^(.*button.*)\s>\ssvg.*$/, "$1");
					console.log(`new xpath after svg cut-off is ${newXpath}.`);
					if (newXpath !== xpath) {
						// replaced
						let parent = element;
						while (parent.tagName !== "BUTTON") {
							parent = parent.parentElement;
						}
						element = parent;
						xpath = newXpath;
						csspath = newCssPath;
					}
				}

				const isDocument = element.nodeType === Node.DOCUMENT_NODE;

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
					value: e.type !== "keydown" ? element.value : e.key,
					// computed
					path: xpath,
					csspath: csspath,
					datapath: datapath,
					target: isDocument
						? "document"
						: `<${element.tagName.toLowerCase()} ${element
								.getAttributeNames()
								.map((name) => `${name}="${element.getAttribute(name)}"`)
								.join(" ")}>`,
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

			let scrollTimeoutHandle: NodeJS.Timeout;
			const eventHandler = (e: any) => {
				if (!e) {
					return;
				}
				if (["STYLE"].includes(e.target && e.target.tagName)) {
					// inline style tag, ignored
					return;
				}
				if (e.type === "keydown" && e.key !== "Enter") {
					//just record Enter
					return;
				}

				let element = e.target;
				const data = transformEvent(e, element);
				// console.log(data);
				data.uuid = window.$lhUuid;
				if (e.type === "scroll") {
					if (scrollTimeoutHandle) {
						clearTimeout(scrollTimeoutHandle);
					}
					scrollTimeoutHandle = setTimeout(() => {
						window.$lhRecordEvent(JSON.stringify(data));
						scrollTimeoutHandle = null;
					}, 100);
				} else if (
					e.type === "change" &&
					element.tagName === "INPUT" &&
					(element.getAttribute("type") || "").toLowerCase() === "file"
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
					element.tagName === "INPUT" &&
					["checkbox", "radio"].indexOf((element.getAttribute("type") || "").toLowerCase()) != -1
				) {
					// record checked
					data.checked = element.checked;
					window.$lhRecordEvent(JSON.stringify(data));
				} else {
					window.$lhRecordEvent(JSON.stringify(data));
				}
			};

			window.$lhGetUuid().then((uuid) => {
				window.$lhUuid = uuid;
			});

			Object.values({
				CLICK: "click",
				// DBLCLICK: 'dblclick',
				CHANGE: "change",
				KEYDOWN: "keydown",
				// SELECT: 'select'
				FOCUS: "focus",
				SCROLL: "scroll",
				// onchange:"on-change",
				MOUSE_DOWN: "mousedown",
				SUBMIT: "submit",
				// LOAD: 'load',
				// UNLOAD: 'unload',
				// VALUE_CHANGE: 'valuechange'
			}).forEach((eventType) => {
				document.addEventListener(eventType, eventHandler, { capture: true });
				if (window.$lhOnSwitchFromReplayToRecord) {
					document.querySelectorAll("iframe").forEach((frame) => {
						frame.contentDocument!.addEventListener(eventType, eventHandler, { capture: true });
					});
				}
			});

			const recordDialogEvent = (options) => {
				const { message, defaultMessage, returnValue, eventType, dialogType } = options;
				window.$lhRecordEvent(
					JSON.stringify({
						uuid: window.$lhUuid,
						type: eventType,
						dialog: dialogType,
						message,
						defaultMessage,
						returnValue,
						target: "document",
						url: window.location.href,
					})
				);
			};
			// take over native dialog, 4 types: alert, prompt, confirm and beforeunload
			//
			const nativeAlert = window.alert;
			window.alert = (message) => {
				recordDialogEvent({ message, eventType: "dialog-open", dialogType: "alert" });
				nativeAlert(message);
				recordDialogEvent({ message, eventType: "dialog-close", dialogType: "alert" });
			};
			const nativeConfirm = window.confirm;
			window.confirm = (message) => {
				recordDialogEvent({ message, eventType: "dialog-open", dialogType: "confirm" });
				const ret = nativeConfirm(message);
				recordDialogEvent({
					message,
					eventType: "dialog-close",
					dialogType: "confirm",
					returnValue: ret,
				});
				return ret;
			};
			const nativePrompt = window.prompt;
			window.prompt = (message, defaultMessage) => {
				recordDialogEvent({
					message,
					defaultMessage,
					eventType: "dialog-open",
					dialogType: "prompt",
				});
				const ret = nativePrompt(message, defaultMessage);
				recordDialogEvent({
					message,
					defaultMessage,
					eventType: "dialog-close",
					dialogType: "prompt",
					returnValue: ret,
				});
				return ret;
			};

			// wechat related
			((window) => {
				if (!/MicroMessenger/i.test(navigator.userAgent)) {
					return;
				}
				const WeixinJSBridgeData = {};
				let imageData = null;
				const transformPNG2JPEG = (base64Image) => {
					return new Promise((resolve) => {
						const canvas = document.createElement("canvas");
						const ctx = canvas.getContext("2d");

						const image = new Image();
						image.crossOrigin = "anonymous";
						image.onload = function () {
							const { width, height } = image;
							canvas.width = width;
							canvas.height = height;
							ctx.fillStyle = "#fff";
							ctx.fillRect(0, 0, width, height);
							ctx.drawImage(image, 0, 0, width, height);
							resolve(canvas.toDataURL("image/jpeg", 1.0));
						};
						image.src = base64Image;
					});
				};
				window.WeixinJSBridge = {
					invoke: (event, data, func): void => {
						// console.info(event, data);
						switch (event) {
							case "sendAppMessage":
							case "shareTimeline":
								console.log("%c Ready for share", "color:red", data);
								WeixinJSBridgeData[event] = data;
								WeixinJSBridgeData[event]._callback = func;
								break;
							case "preVerifyJSAPI":
								func({});
								break;
							case "chooseImage":
								const input = document.createElement("input");
								input.setAttribute("type", "file");
								input.style.visibility = "hidden";
								input.onchange = (evt) => {
									const file = input.files[0];
									const reader = new FileReader();
									reader.onload = (evt) => {
										const base64Image = evt.target.result;
										if (
											typeof base64Image === "string" &&
											base64Image.startsWith("data:image/png;")
										) {
											// 是PNG, 转成JPEG
											transformPNG2JPEG(base64Image).then((base64Image) => {
												imageData = base64Image;
												func({ localIds: [0], errMsg: "chooseImage:ok" });
											});
										} else {
											imageData = base64Image;
											func({ localIds: [0], errMsg: "chooseImage:ok" });
										}
									};
									reader.readAsDataURL(file);
								};
								document.body.append(input);
								input.click();
								break;
							case "getLocalImgData":
								func({ localData: imageData, errMsg: "getLocalImgData:ok" });
								break;
						}
						// console.log(WeixinJSBridgeData);
					},
					on: (event, func) => {
						func({});
					},
				};
				window.addEventListener("DOMContentLoaded", () => {
					if (document.getElementById("last-hit-bars") != null) {
						return;
					}
					const div = document.createElement("DIV");
					div.id = "last-hit-bars";
					div.style.position = "fixed";
					div.style.display = "flex";
					div.style.top = "0";
					div.style.right = "0";
					div.style.backgroundColor = "transparent";
					div.style.zIndex = "100000";
					const span = document.createElement("SPAN");
					span.id = "last-hit-wechat-share";
					span.style.height = "24px";
					span.style.width = "24px";
					// span.style.border = '1px solid red';
					span.style.backgroundColor = "burlywood";
					span.style.opacity = "0.7";
					span.style.borderRadius = "100%";
					span.style.margin = "3px";
					span.style.boxSizing = "border-box";
					span.style.cursor = "pointer";
					span.style.fontWeight = "bold";
					span.style.lineHeight = "24px";
					span.style.fontSize = "12px";
					span.style.color = "#fff";
					// span.style.transform = 'scale(0.8)';
					const textSpan = document.createElement("span");
					textSpan.textContent = "Share";
					textSpan.style.lineHeight = "24px";
					textSpan.style.transform = "scale(0.7)";
					textSpan.style.display = "block";
					textSpan.style.transformOrigin = "left";
					textSpan.style.whiteSpace = "nowrap";
					span.append(textSpan);
					span.onclick = () => {
						const data = WeixinJSBridgeData["sendAppMessage"];
						if (data && data.link) {
							// use prepared share data
							console.log(`%c Share to: %c ${data.link}`, "color:red", "color:brown");
							window.open(data.link);
							data._callback && data._callback({ errMsg: "sendAppMessage:ok" });
						} else {
							// use current url
							console.log(`%c Share to: %c ${location.href}`, "color:red", "color:brown");
							window.open(location.href);
						}
					};
					div.append(span);
					document.body.append(div);
				});
			})(window);

			console.log("%c last-hit: %c evaluate on new document end...", "color:red", "color:brown");
		};
		// some pages postpones the page created or popup event. so evaluateOnNewDocument doesn't work.
		// in this case, run evaluate for ensuring the god logic should be install into page
		// anyway, monitors cannot be installed twice, so add varaiable $lhGod on window to prevent
		if (onSwitchFromReplayToRecord) {
			await page.evaluate(() => (window.$lhOnSwitchFromReplayToRecord = true));
		}
		if (PageHelper.dataAttrName) {
			await page.evaluate(
				(dataAttrName: string) => (window.$lhDataAttrName = dataAttrName),
				PageHelper.dataAttrName
			);
		} else {
			// clear when not given
			await page.evaluate(() => (window.$lhDataAttrName = null));
		}
		await page.evaluateOnNewDocument(god);
		await page.evaluate(god);
	}

	static async control(browserHelper: BrowserHelper, page: Page, onSwitchFromReplayToRecord: boolean = false) {
		await PageHelper.exposeFunctionToPage(browserHelper, page);
		await PageHelper.installListenersOnPage(browserHelper, page, onSwitchFromReplayToRecord);

		const client = await PageHelper.createCDPClient(page);
		PageHelper.emulate(page, browserHelper.getDevice(), client);

		await PageHelper.monitorAnimation(client, browserHelper, page);
		PageHelper.monitorPageClosed(page, browserHelper, client);
		PageHelper.monitorPagePopuped(page, browserHelper);
		PageHelper.monitorPageErrorOccurred(page, browserHelper);
		PageHelper.monitorDialogOpened(page, browserHelper);
	}

	private static monitorDialogOpened(page: Page, browserHelper: BrowserHelper): void {
		page.on("dialog", async (dialog) => {
			console.log(`page event dialog caught`);
			if (dialog.type() === "beforeunload") {
				const base64 = await PageHelper.captureScreenshot(page);
				const uuid = browserHelper.getAllPages().findUuidByPage(page);
				browserHelper.recordPageWindowEvent({
					type: "dialog-open",
					dialog: "beforeunload",
					url: page.url(),
					image: base64,
					uuid,
				});
			}
		});
	}

	private static monitorPageErrorOccurred(page: Page, browserHelper: BrowserHelper): void {
		page.on("pageerror", async () => {
			console.log(`page event pageerror caught`);
			const base64 = await PageHelper.captureScreenshot(page);
			const uuid = browserHelper.getAllPages().findUuidByPage(page);
			browserHelper.recordPageWindowEvent({
				type: "page-error",
				url: page.url(),
				image: base64,
				uuid,
			});
		});
	}

	/**
	 * page created by window.open or anchor
	 */
	private static monitorPagePopuped(page: Page, browserHelper: BrowserHelper): void {
		page.on("popup", async (newPage) => {
			console.log("page event popup caught");
			const allPages = browserHelper.getAllPages();
			if (!allPages.exists(newPage)) {
				// not found in pages
				const uuid = uuidv4();
				allPages.add(uuid, newPage);
				await PageHelper.control(browserHelper, newPage, false);
				// const base64 = await PageHelper.captureScreenshot(newPage);
				browserHelper.recordPageWindowEvent({
					type: "page-created",
					url: newPage.url(),
					// image: base64,
					uuid,
				});
			}
		});
	}

	private static monitorPageClosed(page: Page, browserHelper: BrowserHelper, client: CDPSession): void {
		page.on("close", async () => {
			// RESEARCH already closed? seems like this.
			// traverse all pages to check all related pages were closed or not
			const allClosed = await PageHelper.isAllRelatedPagesClosed(page);
			const uuid = browserHelper.getAllPages().removeByPage(page);
			if (uuid) {
				browserHelper.recordPageWindowEvent({
					type: "page-closed",
					url: page.url(),
					allClosed,
					uuid,
				});
			}
			try {
				client.detach();
			} catch {}
		});
	}

	private static async monitorAnimation(client: CDPSession, browserHelper: BrowserHelper, page: Page): Promise<void> {
		// await client.send('Animation.enable');
		// client.on('Animation.animationStarted', ({ animation }) => {
		// 	browserHelper.recordPageWindowEvent({
		// 		type: 'animation',
		// 		duration: (animation.source || {}).duration,
		// 		uuid: browserHelper.getAllPages().findUuidByPage(page)
		// 	});
		// });
	}

	private static isDynamicResource(resourceType: ResourceType) {
		return dynamicResourceTypes.includes(resourceType);
	}

	static async monitorRequests(page: Page, browserHelper: BrowserHelper): Promise<void> {
		PageHelper.monitorRequestFinished(page, browserHelper);
		PageHelper.monitorRequestFailed(page, browserHelper);
	}

	private static monitorRequestFailed(page: Page, browserHelper: BrowserHelper) {
		page.on("requestfailed", async (request) => {
			const url = request.url();
			const resourceType = request.resourceType();
			if (PageHelper.isDynamicResource(resourceType)) {
				// dynamic resources
				try {
					browserHelper.recordPageWindowEvent({
						type: "ajax",
						uuid: browserHelper.getAllPages().findUuidByPage(page),
						failed: true,
						request: {
							url,
							method: request.method(),
							headers: request.headers(),
							body: request.postData(),
							resourceType,
						},
					});
				} catch (err) {
					console.error(`Failed getting data from: ${url}`);
					console.error(err);
				}
			} else {
			}
		});
	}

	private static monitorRequestFinished(page: Page, browserHelper: BrowserHelper) {
		page.on("requestfinished", async (request) => {
			const url = request.url();
			const response = request.response();
			const resourceType = request.resourceType();

			// console.log("request-url",request.url())
			// console.log("resourceType",resourceType)

			if (PageHelper.isDynamicResource(resourceType)) {
				// dynamic resources

				// console.log("resourceType",resourceType)
				const sendEvent = (body?: string) => {
					try {
						browserHelper.recordPageWindowEvent({
							type: "ajax",
							uuid: browserHelper.getAllPages().findUuidByPage(page),
							request: {
								url,
								method: request.method(),
								headers: request.headers(),
								body: request.postData(),
								resourceType,
							},
							response: {
								statusCode: response.status(),
								statusMessage: response.statusText(),
								headers: response.headers(),
								body,
							},
						});
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
	}
}
