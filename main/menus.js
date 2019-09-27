const { Menu, app } = require('electron');

module.exports = () => {
	const isMac = process.platform === 'darwin';
	const menuTemplate = [
		...(isMac
			? [
					{
						label: 'LastHit',
						submenu: [
							{ role: 'about' },
							{ type: 'separator' },
							{ role: 'services' },
							{ type: 'separator' },
							{ role: 'hide' },
							{ role: 'hideothers' },
							{ role: 'unhide' },
							{ type: 'separator' },
							{ role: 'quit' }
						]
					}
			  ]
			: []),
		{
			label: 'File',
			submenu: [isMac ? { role: 'close' } : { role: 'quit' }]
		},
		{
			label: 'Edit',
			submenu: [
				{ label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
				{ label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
				{ type: 'separator' },
				{ label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
				{ label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
				{ label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
				{ label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:' }
			]
		},
		{
			label: 'View',
			submenu: [{ role: 'reload' }, { role: 'forcereload' }, { role: 'toggledevtools' }]
		}
	];
	Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
};
