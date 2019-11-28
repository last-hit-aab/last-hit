import { ReplayerCache } from './replayers-cache';

export type ReplayerDestroyer = () => void;

const destory = (replayers: ReplayerCache, logger: Console) => {
	logger.info('destory all puppeteer browsers.');
	Object.keys(replayers).forEach(async key => {
		logger.info(`destory puppeteer browser[${key}]`);
		const browser = replayers[key].getBrowser();
		delete replayers[key];

		if (browser) {
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
		}
	});
};

export default (replayers: ReplayerCache, logger: Console): ReplayerDestroyer => {
	return (): void => destory(replayers, logger);
};
