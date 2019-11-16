import { generateKeyByString } from '../utils';
import Replayer from './replayer';
import { ReplayerCache } from './replayers-cache';

export type ReplayerAbandoner = (storyName: string, flowName: string) => Replayer | undefined;

const abandon = (replayers: ReplayerCache, storyName: string, flowName: string): Replayer => {
	const key = generateKeyByString(storyName, flowName);
	const replayer = replayers[key];
	delete replayers[key];
	return replayer;
};

export default (replayers: ReplayerCache): ReplayerAbandoner => {
	return (storyName: string, flowName: string): Replayer | undefined =>
		abandon(replayers, storyName, flowName);
};
