import { Page, Request } from 'puppeteer';
import ReplaySummary from './replay-summary';

class RequestCounter {
	private page: Page;
	private summary: ReplaySummary;

	private requests: Array<Request> = [];
	private offsets: Array<Request> = [];
	/** key is url, value is number array */
	private requestsCreateAt: { [key in string]: Array<number> } = {};
	/** key is url, value is number array */
	private requestsOffsetAt: { [key in string]: Array<number> } = {};

	private timeout: number = 60000;
	private used: number = 0;

	private logger: Console;

	constructor(page: Page, summary: ReplaySummary, logger: Console) {
		this.page = page;
		this.summary = summary;
		this.logger = logger;
	}
	getPage(): Page {
		return this.page;
	}
	create(request: Request): void {
		// logger.log(`Request ${request.url()} created.`);
		this.requests.push(request);
		if (['xhr', 'fetch', 'websocket'].includes(request.resourceType())) {
			const url = request.url();
			const createAt = this.requestsCreateAt[url];
			if (createAt) {
				createAt.push(new Date().getTime());
			} else {
				this.requestsCreateAt[url] = [new Date().getTime()];
			}
		}
		// reset used time to 0, ensure timeout is begin from the last created request
		this.used = 0;
	}
	offset(request: Request, success: boolean): void {
		// logger.log(`Request ${request.url()} offsetted.`);
		this.offsets.push(request);

		if (['xhr', 'fetch', 'websocket'].includes(request.resourceType())) {
			const url = request.url();
			const offsetAt = this.requestsOffsetAt[url];
			if (offsetAt) {
				offsetAt.push(new Date().getTime());
			} else {
				this.requestsOffsetAt[url] = [new Date().getTime()];
			}
			const startTime = (() => {
				const times = this.requestsCreateAt[url];
				return (times ? times[times.length - 1] : 0) || 0;
			})();
			const endTime = (() => {
				const times = this.requestsOffsetAt[url];
				return (times ? times[times.length - 1] : 0) || 0;
			})();
			const usedTime = endTime - startTime;
			// console.log(`Used ${usedTime}ms for url[${url}]`);
			if (success) {
				this.summary.handleAjaxSuccess(url, usedTime);
			} else {
				this.summary.handleAjaxFail(url, usedTime);
			}
		}
	}
	private clear(): void {
		this.requests = [];
		this.offsets = [];
		this.used = 0;
	}
	private async poll(
		resolve: () => void,
		reject: (error: Error) => void,
		canResolve: boolean = false
	) {
		await this.getPage().waitFor(1000);
		this.used += 1000;

		this.requests.forEach((request, index) =>
			this.logger.debug(
				`reqeusts check, the request index is ${index}, request url is ${request.url()}`
			)
		);
		this.offsets.forEach((request, index) =>
			this.logger.debug(
				`offsets check, the request index is ${index}, request url is ${request.url()}`
			)
		);
		this.logger.debug(
			`Check all requests are done, currently ${this.requests.length} created and ${this.offsets.length} offsetted.`
		);

		// when the page pop up, the page has been loaded before request interception, then requests length will less than offsets length
		// RESEARCH might lost one request, don't know why
		// add logic that gap requests count less or equals 2%, also pass
		if (
			this.requests.length <= this.offsets.length ||
			(this.requests.length - this.offsets.length) / this.requests.length <= 0.02
		) {
			if (canResolve) {
				this.clear();
				resolve();
			} else {
				this.poll(resolve, reject, true);
			}
		} else if (this.used > this.timeout) {
			const usedTime = this.used;
			const msg = `Wait for all requests done, ${this.requests.length} sent and ${this.offsets.length} received, timeout after ${usedTime}ms.`;
			this.clear();
			reject(new Error(msg));
		} else {
			this.poll(resolve, reject);
		}
	}
	waitForAllDone(): Promise<void> {
		this.used = 0;
		return new Promise((resolve, reject) => this.poll(resolve, reject));
	}
}

export default RequestCounter;
