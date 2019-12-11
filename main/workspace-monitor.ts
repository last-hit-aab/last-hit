import { ipcMain, IpcMainEvent } from 'electron';
import path from 'path';
import fsWathcer, { WatchrChangeEventListener, WatchrStalker, WatchrStartCallback } from 'watchr';
import recorder from './recorder';
import replayer from './replayer';
import { Environment } from 'last-hit-replayer';

// IMPORTANT: following enumerations are declared in global.d.ts
// IMPORTANT: typescript compiler treats them as from the original module, which they are not
// IMPORTANT: copy from global.d.ts to ensure enumeration effects in compiled js file
enum WatchrEvent {
	CHANGE = 'change',
	CLOSE = 'close'
}
enum WatchrChangeType {
	CREATE = 'create',
	UPDATE = 'update',
	DELETE = 'delete'
}
enum WatchrConfigPreferredMethod {
	WATCH = 'watch',
	WATCH_FILE = 'watchFile'
}

type State = {
	workspaceFile?: string;
	stalker?: any;
};

let state: State = {};
const generateKeyByString = (storyName: string, flowName: string): string => {
	return `[${flowName}@${storyName}]`;
};

const getWorkspaceRootFolder = (workspaceFile: string): string => {
	const parsedPath = path.parse(workspaceFile);
	const rootFolder = path.resolve(parsedPath.root, parsedPath.dir);
	console.log(rootFolder);
	return rootFolder;
};

/**
 * start to watch file system for given workspace
 */
const startFileSystemWatch = (workspaceFile: string): WatchrStalker => {
	const rootFolder = getWorkspaceRootFolder(workspaceFile);
	const listener: WatchrChangeEventListener = (
		changeType,
		fullPath,
		currentStat,
		previousStat
	) => {
		switch (changeType) {
			case WatchrChangeType.UPDATE:
				console.log('the file', fullPath, 'was updated'); //, currentStat, previousStat);
				break;
			case WatchrChangeType.CREATE:
				console.log('the file', fullPath, 'was created'); //, currentStat);
				break;
			case WatchrChangeType.DELETE:
				console.log('the file', fullPath, 'was deleted'); //, previousStat);
				break;
		}
	};
	const stalker = fsWathcer.create(rootFolder);
	stalker.on(WatchrEvent.CHANGE, listener);
	// stalker.on('log', console.log);
	stalker.once(WatchrEvent.CLOSE, (reason: string): void => {
		console.log('closed because', reason);
		stalker.removeAllListeners(); // as it is closed, no need for our change or log listeners any more
	});
	stalker.setConfig({
		stat: null,
		interval: 5007,
		persistent: true,
		catchupDelay: 2000,
		preferredMethods: [
			WatchrConfigPreferredMethod.WATCH,
			WatchrConfigPreferredMethod.WATCH_FILE
		],
		followLinks: true,
		ignorePaths: false,
		ignoreHiddenFiles: false,
		ignoreCommonPatterns: true,
		ignoreCustomPatterns: null
	});
	const next: WatchrStartCallback = err => {
		if (err) {
			console.log('watch failed on', rootFolder, 'with error', err);
		} else {
			console.log('watch successful on', rootFolder);
		}
	};
	stalker.watch(next);
	return stalker;
};

export const initialize = (): void => {
	ipcMain.on('workspace-closed', () => {
		const { workspaceFile } = state;

		recorder.destory();
		replayer.destory();

		state.stalker && state.stalker.close();
		state = {};
		console.log(`Workspace[${workspaceFile}] closed.`);
	});
	ipcMain.on('workspace-opened', (event: IpcMainEvent, arg: { workspaceFile: string }): void => {
		state = arg;
		const { workspaceFile } = state;
		const env = new Environment({
			name: 'IDE',
			workspace: getWorkspaceRootFolder(workspaceFile)
		});
		replayer.swtichEnv(env);

		state.stalker = startFileSystemWatch(workspaceFile);
		console.log(`Workspace[${workspaceFile}] opened.`);
	});
};
