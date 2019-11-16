import { Browser } from 'puppeteer';
import { Device } from '../types';

export interface Replayer {
	getBrowser: () => Browser;
	getDevice: () => Device;
}
export interface ReplayerHelper {
	abandon: (storyName: string, flowName: string) => Replayer;
}
