import { Page } from 'puppeteer';

export default class AllPagesCache {
	private pages: { [key in string]: Page } = {};

	add(uuid: string, page: Page): void {
		this.pages[uuid] = page;
	}
	exists(page: Page): boolean {
		return this.findUuidByPage(page) != null;
	}
	findUuidByPage(page): string | undefined {
		return Object.keys(this.pages).find(uuid => this.pages[uuid] === page);
	}
	removeByUuid(uuid): void {
		delete this.pages[uuid];
	}
	/**
	 * @returns {string} uuid when remove successfully, or null when not found
	 */
	removeByPage(page): string | null {
		const uuid = this.findUuidByPage(page);
		if (uuid) {
			this.removeByUuid(uuid);
			return uuid;
		} else {
			return null;
		}
	}
}
