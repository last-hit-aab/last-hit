import { Browser } from 'puppeteer';
import { Device } from '../types';

export interface Replayer {
	abandon: (storyName: string, flowName: string) => this;
	getBrowser: () => Browser;
	getDevice: () => Device;
}
