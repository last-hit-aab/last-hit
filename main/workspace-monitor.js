const { ipcMain } = require('electron');
const puppeteer = require('./puppeteer');
const replay = require('./replay');
// const { startupWebapp } = require('./express');
const fsWathcer = require('watchr');
const path = require('path');

let state = {
	// workspaceName: null,
};
// const generateKeyByObject = (story, flow) => {
// 	return `[${flow.name}@${story.name}]`;
// };
const generateKeyByString = (storyName, flowName) => {
	return `[${flowName}@${storyName}]`;
};

/**
 * start to watch file system for given workspace
 * @param {string} workspaceFile
 * @returns {Stalker}
 */
const startFileSystemWatch = workspaceFile => {
	const parsedPath = path.parse(workspaceFile);
	const rootFolder = path.resolve(parsedPath.root, parsedPath.dir);
	console.log(rootFolder);
	const listener = (changeType, fullPath, currentStat, previousStat) => {
		switch (changeType) {
			case 'update':
				console.log('the file', fullPath, 'was updated'); //, currentStat, previousStat);
				break;
			case 'create':
				console.log('the file', fullPath, 'was created'); //, currentStat);
				break;
			case 'delete':
				console.log('the file', fullPath, 'was deleted'); //, previousStat);
				break;
		}
	};
	const next = err => {
		if (err) {
			console.log('watch failed on', rootFolder, 'with error', err);
		} else {
			console.log('watch successful on', rootFolder);
		}
	};
	const stalker = fsWathcer.create(rootFolder);
	stalker.on('change', listener);
	// stalker.on('log', console.log);
	stalker.once('close', function(reason) {
		console.log('closed because', reason);
		stalker.removeAllListeners(); // as it is closed, no need for our change or log listeners any more
	});
	stalker.setConfig({
		stat: null,
		interval: 5007,
		persistent: true,
		catchupDelay: 2000,
		preferredMethods: ['watch', 'watchFile'],
		followLinks: true,
		ignorePaths: false,
		ignoreHiddenFiles: false,
		ignoreCommonPatterns: true,
		ignoreCustomPatterns: null
	});
	stalker.watch(next);
	return stalker;
};

module.exports = {
	initialize: () => {
		// let webapp = null;
		ipcMain.on('workspace-closed', (event, arg) => {
			// shut down express when start up
			// webapp && webapp.close();
			const { workspaceFile } = state;
			puppeteer.destory();
			replay.destory();
			state.stalker && state.stalker.close();
			state = {};
			console.log(`Workspace[${workspaceFile}] closed.`);
		});
		ipcMain.on('workspace-opened', (event, arg) => {
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
		ipcMain.on('flow-on-record-check', (event, arg) => {
			const { storyName, flowName } = arg;
			// ③ receive flow on recrod check result from renderer
			ipcMain.once(`flow-on-record-check-result-${generateKeyByString(storyName, flowName)}`, (event, arg) => {
				// ④ reply to renderer which send the first request
				event.reply(`flow-on-record-check-result-${generateKeyByString(storyName, flowName)}`, arg);
			});
			// ② send on record check request to renderer
			event.reply(`flow-on-record-check-${generateKeyByString(storyName, flowName)}`);
		});
		// ① handle the flow open check from renderer,
		// message from any component in renderer which doesn't know flow is open or not
		ipcMain.on('flow-open-check', (event, arg) => {
			const { storyName, flowName } = arg;
			// ③ handle the reply from rendererer
			ipcMain.once(`flow-open-check-result-${generateKeyByString(storyName, flowName)}`, (event, arg) => {
				// ④ reply to renderer which send the first request
				event.reply(`flow-open-check-result-${generateKeyByString(storyName, flowName)}`, arg);
			});
			// ② send to renderer, to check the flow is open or not
			event.reply('flow-open-check', arg);
		});
	}
};
