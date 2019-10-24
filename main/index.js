// Modules to control application life and create native browser window
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const argv = require('yargs').argv;
const buildMenu = require('./menus');
const console = require('console');
const monitors = require('./workspace-monitor');
const puppeteer = require('./puppeteer');
const replay = require('./replay');
const package = require('../package.json');

if (process.platform !== 'win32') {
	app.setAboutPanelOptions({
		applicationName: 'Last Hit',
		applicationVersion: package.version,
		iconPath: path.join(__dirname, '../icons/64x64.png')
	});
}

// add console log
app.console = new console.Console(process.stdout, process.stderr);
// build app menus
buildMenu();
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

// Watch renderer source folder, auto compile and reload
if (argv['watch-renderer'] === 'true') {
	const spawn = require('cross-spawn');
	const debounce = (func, ms) => {
		let ts;
		return () => {
			clearTimeout(ts);
			ts = setTimeout(() => func(), ms);
		};
	};
	fs.watch(
		path.join(__dirname, '../renderer/src'),
		{ recursive: true },
		debounce(() => {
			new Promise(() => {
				spawn.sync('npm', ['run', 'build', '--prefix', 'renderer'], { stdio: 'inherit' });
				if (mainWindow) {
					mainWindow.reload();
				} else {
					createWindow();
				}
			});
		}, 5000)
	);
}

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
		// titleBarStyle: 'hidden',
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

	mainWindow.once('ready-to-show', () => {
		mainWindow.show();
	});
	// Emitted when the window is closed.
	mainWindow.on('closed', () => {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null;
	});
};

monitors.initialize();
puppeteer.initialize(replay);
replay.initialize();

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
	createWindow();
});

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
