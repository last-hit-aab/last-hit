import { Device } from 'last-hit-types';
import { Browser } from 'puppeteer';

export interface Replayer {
	getBrowser: () => Browser;
	getDevice: () => Device;
	getTestLogs: () => Array<{ title: string; passed: boolean; level?: number }>;
}
export interface ReplayerHelper {
	abandon: (storyName: string, flowName: string) => Replayer;
}
