import { Device } from 'last-hit-types';
import { Browser, Target } from 'puppeteer';
import uuidv4 from 'uuid/v4';
import PageHelper from './page-helper';
import AllPagesCache from './pages-cache';
import {
	createPageWindowEventRecorder,
	PageWindowEventRecorder
} from './window-event-recorder-creator';

export default class BrowserHelper {
	private browser: Browser;
	private flowKey: string;
	private allPages: AllPagesCache;
	private device: Device;

	private eventRecorder: PageWindowEventRecorder;

	constructor(browser: Browser, allPages: AllPagesCache, device: Device, flowKey: string) {
		this.browser = browser;
		this.flowKey = flowKey;
		this.allPages = allPages;
		this.device = device;

		this.eventRecorder = createPageWindowEventRecorder(this.flowKey);
	}
	monitorDisconnected(): void {
		this.getBrowser().on('disconnected', () => this.recordPageWindowEvent({ type: 'end' }));
	}
	monitorTargetCreated(): void {
		this.getBrowser().on('targetcreated', async (newTarget: Target) => {
			if (newTarget.type() === 'page') {
				console.log('browser event target created caught');
				const newPage = await newTarget.page();
				const allPages = this.getAllPages();
				if (!allPages.exists(newPage)) {
					// not found in pages
					const uuid = uuidv4();
					allPages.add(uuid, newPage);
					await PageHelper.control(this, newPage);
					const base64 = await PageHelper.captureScreenshot(newPage);
					this.recordPageWindowEvent({
						type: 'page-created',
						url: newPage.url(),
						image: base64,
						uuid
					});
				}
			}
		});
	}
	monitorTargetChanged(): void {
		this.getBrowser().on('targetchanged', async (target: Target) => {
			if (target.type() === 'page') {
				console.log('browser event target changed caught');
				// RESEARCH the url is old when target changed event is catched, so must wait the new url.
				// don't know the mechanism
				const page = await target.page();
				const uuid = this.getAllPages().findUuidByPage(page);
				const url = page.url();
				this.recordPageWindowEvent({ type: 'page-switched', url, uuid });
				let times = 0;
				// wait for 10 times
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
							this.recordPageWindowEvent({ type: 'page-switched', url: anUrl, uuid });
						}
					}, 100);
				};
				handle();
			}
		});
	}
	monitorTargetDestoryed(): void {
		this.getBrowser().on('targetdestroyed', async target => {
			if (target.type() === 'page') {
				console.log('browser event target destroyed caught');
				const page = await target.page();
				const allClosed = await PageHelper.isAllRelatedPagesClosed(page);
				const uuid = this.getAllPages().removeByPage(page);
				if (uuid) {
					this.recordPageWindowEvent({
						type: 'page-closed',
						url: page.url(),
						uuid,
						allClosed
					});
				}
			}
		});
	}
	monitorAll(): void {
		this.monitorDisconnected();
		this.monitorTargetCreated();
		this.monitorTargetChanged();
		this.monitorTargetDestoryed();
	}
	recordPageWindowEvent(event: any): void {
		this.getEventRecorder().record(JSON.stringify(event));
	}
	getBrowser(): Browser {
		return this.browser;
	}
	getFlowKey(): string {
		return this.flowKey;
	}
	getDevice(): Device {
		return this.device;
	}
	getAllPages(): AllPagesCache {
		return this.allPages;
	}
	getEventRecorder(): PageWindowEventRecorder {
		return this.eventRecorder;
	}
}
