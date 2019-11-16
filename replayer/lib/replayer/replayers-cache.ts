import Replayer from './replayer';

export type ReplayerCache = { [key in string]: Replayer };

const cache: ReplayerCache = {};

export default cache;
