import { Menu, MenuItemConstructorOptions } from 'electron';

export const buildMenu = (): void => {
	const isMac = process.platform === 'darwin';
	const menuTemplate: MenuItemConstructorOptions[] = [
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
						] as MenuItemConstructorOptions[]
					}
			  ]
			: []),
		{
			label: 'File',
			submenu: [isMac ? { role: 'close' } : { role: 'quit' }] as MenuItemConstructorOptions[]
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
			] as MenuItemConstructorOptions[]
		},
		{
			label: 'View',
			submenu: [
				{ role: 'reload' },
				{ role: 'forcereload' },
				{ role: 'toggledevtools' }
			] as MenuItemConstructorOptions[]
		}
	];
	Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
};
