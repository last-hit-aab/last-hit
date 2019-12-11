import { ipcMain } from 'electron';
import { logger } from '../logger';
import { createReplayer, Environment } from 'last-hit-replayer';
import { Replayer, ReplayerHelper } from './types';

export type ReplayerHandle = { current?: Replayer; env: Environment };

class ReplayerWrapper implements ReplayerHelper {
	private replayer: {
		initialize: () => ReplayerHandle;
		destory: () => void;
		abandon: (storyName: string, flowName: string) => Replayer | undefined;
	};
	private replayHandle: ReplayerHandle;
	constructor() {
		this.replayer = createReplayer({ emitter: ipcMain as any, logger: logger as any });
	}
	initialize() {
		this.replayHandle = this.replayer.initialize();
	}
	destory() {
		this.replayer.destory();
	}
	abandon(storyName: string, flowName: string): Replayer {
		return this.replayer.abandon(storyName, flowName);
	}
	swtichEnv(env: Environment): void {
		this.replayHandle.env = env;
	}
}
export default new ReplayerWrapper();
