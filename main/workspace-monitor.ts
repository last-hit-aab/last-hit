import { ipcMain, IpcMainEvent } from 'electron';
import path from 'path';
import fsWathcer, { WatchrChangeEventListener, WatchrStalker, WatchrStartCallback } from 'watchr';
import recorder from './recorder';
import replayer from './replayer';

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

/**
 * start to watch file system for given workspace
 */
const startFileSystemWatch = (workspaceFile: string): WatchrStalker => {
	const parsedPath = path.parse(workspaceFile);
	const rootFolder = path.resolve(parsedPath.root, parsedPath.dir);
	console.log(rootFolder);
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
	// let webapp = null;
	ipcMain.on('workspace-closed', () => {
		// shut down express when start up
		// webapp && webapp.close();
		const { workspaceFile } = state;
		recorder.destory();
		replayer.destory();
		state.stalker && state.stalker.close();
		state = {};
		console.log(`Workspace[${workspaceFile}] closed.`);
	});
	ipcMain.on('workspace-opened', (event: IpcMainEvent, arg: { workspaceFile: string }): void => {
		// start express when not start up
		// webapp = webapp || startupWebapp();
		state = arg;
		const { workspaceFile } = state;
		state.stalker = startFileSystemWatch(workspaceFile);
		console.log(`Workspace[${workspaceFile}] opened.`);
	});
	// ① receive the flow on record check from renderer
	// might be send from any component in renderer which doesn't know flow is on recording or not
	// NOTE must check flow is open first, otherwise message should be blocked since no listener on renderer
	ipcMain.on(
		'flow-on-record-check',
		(event: IpcMainEvent, arg: { storyName: string; flowName: string }): void => {
			const { storyName, flowName } = arg;
			// ③ receive flow on recrod check result from renderer
			ipcMain.once(
				`flow-on-record-check-result-${generateKeyByString(storyName, flowName)}`,
				(event, arg) => {
					// ④ reply to renderer which send the first request
					event.reply(
						`flow-on-record-check-result-${generateKeyByString(storyName, flowName)}`,
						arg
					);
				}
			);
			// ② send on record check request to renderer
			event.reply(`flow-on-record-check-${generateKeyByString(storyName, flowName)}`);
		}
	);
	// ① handle the flow open check from renderer,
	// message from any component in renderer which doesn't know flow is open or not
	ipcMain.on(
		'flow-open-check',
		(event: IpcMainEvent, arg: { storyName: string; flowName: string }): void => {
			const { storyName, flowName } = arg;
			// ③ handle the reply from rendererer
			ipcMain.once(
				`flow-open-check-result-${generateKeyByString(storyName, flowName)}`,
				(event, arg) => {
					// ④ reply to renderer which send the first request
					event.reply(
						`flow-open-check-result-${generateKeyByString(storyName, flowName)}`,
						arg
					);
				}
			);
			// ② send to renderer, to check the flow is open or not
			event.reply('flow-open-check', arg);
		}
	);
};
