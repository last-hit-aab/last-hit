import { Device, PageCreatedStep, DialogCloseStep } from 'last-hit-types';
import { Page } from 'puppeteer';
import { shorternUrl } from '../utils';
import ci from './ci-helper';
import Replayer from './replayer';

const installListenersOnPage = async (page: Page) => {
	const god = () => {
		console.log(
			'%c last-hit: %c evaluate on new document start...',
			'color:red',
			'color:brown'
		);

		// wechat related
		(window => {
			if (!/MicroMessenger/i.test(navigator.userAgent)) {
				return;
			}
			const WeixinJSBridgeData = {};
			let imageData: string | null = null;
			const transformPNG2JPEG = (base64Image: string): Promise<string> => {
				return new Promise(resolve => {
					const canvas = document.createElement('canvas');
					const ctx = canvas.getContext('2d')!;

					const image = new Image();
					image.crossOrigin = 'anonymous';
					image.onload = function() {
						const { width, height } = image;
						canvas.width = width;
						canvas.height = height;
						ctx.fillStyle = '#fff';
						ctx.fillRect(0, 0, width, height);
						ctx.drawImage(image, 0, 0, width, height);
						resolve(canvas.toDataURL('image/jpeg', 1.0));
					};
					image.src = base64Image;
				});
			};
			window.WeixinJSBridge = {
				invoke: (event, data, func) => {
					// console.info(event, data);
					switch (event) {
						case 'sendAppMessage':
						case 'shareTimeline':
							console.log('%c Ready for share', 'color:red', data);
							WeixinJSBridgeData[event] = data;
							WeixinJSBridgeData[event]._callback = func;
							break;
						case 'preVerifyJSAPI':
							func({});
							break;
						case 'chooseImage':
							const input = document.createElement('input');
							input.setAttribute('type', 'file');
							input.style.visibility = 'hidden';
							input.onchange = evt => {
								const file = input.files![0];
								const reader = new FileReader();
								reader.onload = evt => {
									const base64Image = evt.target!.result;
									if (
										typeof base64Image === 'string' &&
										base64Image.startsWith('data:image/png;')
									) {
										// 是PNG, 转成JPEG
										transformPNG2JPEG(base64Image).then(base64Image => {
											imageData = base64Image;
											func({ localIds: [0], errMsg: 'chooseImage:ok' });
										});
									} else {
										imageData = base64Image as string;
										func({ localIds: [0], errMsg: 'chooseImage:ok' });
									}
								};
								reader.readAsDataURL(file);
							};
							document.body.append(input);
							// don't click, replayer will invoke change event
							// input.click();
							break;
						case 'getLocalImgData':
							func({ localData: imageData, errMsg: 'getLocalImgData:ok' });
							break;
					}
					// console.log(WeixinJSBridgeData);
				},
				on: (event, func) => {
					func({});
				}
			};
			window.addEventListener('DOMContentLoaded', event => {
				if (document.getElementById('last-hit-bars') != null) {
					return;
				}
				const div = document.createElement('div');
				div.id = 'last-hit-bars';
				div.style.position = 'fixed';
				div.style.display = 'flex';
				div.style.top = '0';
				div.style.right = '0';
				div.style.backgroundColor = 'transparent';
				div.style.zIndex = '100000';
				const span = document.createElement('span');
				span.id = 'last-hit-wechat-share';
				span.style.height = '24px';
				span.style.width = '24px';
				// span.style.border = '1px solid red';
				span.style.backgroundColor = 'burlywood';
				span.style.opacity = '0.7';
				span.style.borderRadius = '100%';
				span.style.margin = '3px';
				span.style.boxSizing = 'border-box';
				span.style.cursor = 'pointer';
				span.style.fontWeight = 'bold';
				span.style.lineHeight = '24px';
				span.style.fontSize = '12px';
				span.style.color = '#fff';
				// span.style.transform = 'scale(0.8)';
				const textSpan = document.createElement('span');
				textSpan.textContent = 'Share';
				textSpan.style.lineHeight = '24px';
				textSpan.style.transform = 'scale(0.7)';
				textSpan.style.display = 'block';
				textSpan.style.transformOrigin = 'left';
				textSpan.style.whiteSpace = 'nowrap';
				span.append(textSpan);
				span.onclick = () => {
					const data = WeixinJSBridgeData['sendAppMessage'];
					// console.info(data);
					if (data && data.link) {
						// use prepared share data
						console.log(`%c Share to: %c ${data.link}`, 'color:red', 'color:brown');
						window.open(data.link);
						data._callback && data._callback({ errMsg: 'sendAppMessage:ok' });
					} else {
						// use current url
						console.log(`%c Share to: %c ${location.href}`, 'color:red', 'color:brown');
						window.open(location.href);
					}
				};
				div.append(span);
				document.body.append(div);
			});
		})(window);

		console.log('%c last-hit: %c evaluate on new document end...', 'color:red', 'color:brown');
	};
	// some pages postpones the page created or popup event. so evaluateOnNewDocument doesn't work.
	// in this case, run evaluate for ensuring the god logic should be install into page
	// anyway, monitors cannot be installed twice, so add varaiable $lhGod on window to prevent
	await page.evaluateOnNewDocument(god);
	await page.evaluate(god);
};

export const controlPage = async (replayer: Replayer, page: Page, device: Device, uuid: string) => {
	await installListenersOnPage(page);
	await page.emulate(device);
	await page.emulateMedia('screen');
	const setBackground = () =>
		(document.documentElement.style.backgroundColor = 'rgba(25,25,25,0.8)');
	await page.evaluate(setBackground);
	await page.exposeFunction('$lhGetUuid', () => uuid);
	const client = await page.target().createCDPSession();
	if (device.viewport.isMobile) {
		await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
		// refer to puppeteer.js
		// await client.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
		// await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
	}
	await client.detach();

	await ci.startCoverage(page);

	page.on('load', async () => {
		if (replayer.isOnRecord()) {
			// do nothing when on record
			return;
		}
		await page.evaluate(setBackground);
	});
	page.on('close', async () => {
		if (replayer.isOnRecord()) {
			// do nothing when on record
			return;
		}
		replayer.removePage(page);
	});

	// page created by window.open or anchor
	page.on('popup', async (newPage: Page) => {
		if (replayer.isOnRecord()) {
			// do nothing when on record
			return;
		}
		const newUrl = shorternUrl(newPage.url());
		// find steps from next step of current step, the closest page-created event
		const steps = replayer.getSteps();
		const currentIndex = replayer.getCurrentIndex();
		const currentStep = steps[currentIndex];
		// IMPORTANT do not compare url here, since might have random token. only path compare is necessary
		const pageCreateStep = steps
			.filter((step, index) => index >= currentIndex)
			.find(step => {
				return (
					step.type === 'page-created' &&
					((step as PageCreatedStep).forStepUuid === currentStep.stepUuid ||
						newUrl === shorternUrl((step as PageCreatedStep).url!))
				);
			});
		if (pageCreateStep == null) {
			replayer
				.getLogger()
				.error(
					new Error(
						'Cannot find page created step for current popup, flow is broken for replay.'
					)
				);
			return;
		}

		replayer.putPage(pageCreateStep.uuid, newPage, true);
		await controlPage(replayer, newPage, device, pageCreateStep.uuid);
	});
	page.on('dialog', async dialog => {
		if (replayer.isOnRecord()) {
			// do nothing when on record
			return;
		}
		const dialogType = dialog.type();
		if (dialogType === 'alert') {
			// accept is the only way to alert dialog
			await dialog.accept('success');
		} else if (['confirm', 'prompt'].includes(dialogType)) {
			const currentIndex = replayer.getCurrentIndex();
			const steps = replayer.getSteps();
			const uuid = replayer.findUuid(page);
			// find the first dialog close step, it must be confirm step
			const step = steps
				.filter((step, index) => index > currentIndex)
				.filter(step => step.type === 'dialog-close')
				.find(step => step.uuid === uuid);
			if (step == null) {
				throw new Error(
					`Cannot find dialog close step for current dialog "${dialogType}" open, flow is broken for replay.`
				);
			}
			const dialogCloseStep = step as DialogCloseStep;
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
		if (replayer.isOnRecord()) {
			// do nothing when on record
			return;
		}
		replayer.putRequest(replayer.findUuid(page)!, request);
	});
	page.on('requestfinished', request => {
		if (replayer.isOnRecord()) {
			// do nothing when on record
			return;
		}
		replayer.offsetRequest(replayer.findUuid(page)!, request, true);
	});
	page.on('requestfailed', request => {
		if (replayer.isOnRecord()) {
			// do nothing when on record
			return;
		}
		replayer.offsetRequest(replayer.findUuid(page)!, request, false);
	});
};
