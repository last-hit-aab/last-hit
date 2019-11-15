// Modules to control application life and create native browser window
import { app, BrowserWindow } from 'electron';
import path from 'path';
import * as Menus from './menus';
import * as WorkspaceMonitors from './workspace-monitor';
import recorder from './recorder';
import replayer from './replayer';
import packageFile from '../package.json';

if (process.platform !== 'win32') {
	app.setAboutPanelOptions({
		applicationName: 'Last Hit',
		applicationVersion: packageFile.version,
		iconPath: path.join(__dirname, '../icons/64x64.png')
	});
}

// build app menus
Menus.buildMenu();
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

const createWindow = () => {
	// Create the browser window.
	mainWindow = new BrowserWindow({
		width: 780,
		height: 480,
		icon: path.join(__dirname, '../icons/64x64.png'),
		show: false,
		resizable: false,
		maximizable: false,
		title: 'Welcome to LastHit',
		webPreferences: {
			preload: path.join(__dirname, '../preload/index.js'),
			plugins: true,
			nodeIntegration: true,
			webviewTag: true
		}
	});

	// and load the index.html of the app.
	mainWindow.loadFile('renderer/build/index.html');

	// Open the DevTools.
	// mainWindow.webContents.openDevTools()

	mainWindow.once('ready-to-show', () => mainWindow.show());
	// Emitted when the window is closed.
	mainWindow.on('closed', () => {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null;
	});
};

WorkspaceMonitors.initialize();
recorder.initialize(replayer);
replayer.initialize();

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => createWindow());

// Quit when all windows are closed.
app.on('window-all-closed', () => {
	// On macOS it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', () => {
	// On macOS it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (mainWindow === null) {
		createWindow();
	}
});
