import { inElectron } from '../utils';
import { Page, CoverageEntry } from 'puppeteer';

class CI {
	constructor() {}
	async startCoverage(page: Page) {
		if (!inElectron) {
			// Enable both JavaScript coverage only in CI
			await page.coverage.startJSCoverage();
			// await page.coverage.startCSSCoverage();
		}
	}
	async gatherCoverage(pages: Array<Page>): Promise<Array<CoverageEntry>> {
		const coverages: Array<CoverageEntry> = [];
		if (!inElectron) {
			await pages.reduce(async (promise: Promise<void>, page: Page): Promise<void> => {
				await promise;
				try {
					let jsCoverage = [];
					// let cssCoverage = [];
					try {
						jsCoverage = await page.coverage.stopJSCoverage();
					} catch (e) {
						console.error(e);
					}
					// try {
					// 	cssCoverage = await page.coverage.stopCSSCoverage();
					// } catch (e) {
					// 	console.error(e);
					// }
					coverages.push(...jsCoverage);
				} catch {
					// ignore
				} finally {
					return Promise.resolve();
				}
			}, Promise.resolve());
		}
		return coverages;
	}
}
export default new CI();
