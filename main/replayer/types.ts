import { Device } from 'last-hit-types';
import { Browser } from 'puppeteer';

export interface Replayer {
	getBrowser: () => Browser;
	getDevice: () => Device;
}
export interface ReplayerHelper {
	abandon: (storyName: string, flowName: string) => Replayer;
}
