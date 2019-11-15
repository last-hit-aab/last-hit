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
				{ label: 'Undo', accelerator: 'CmdOrCtrl+Z' },
				{ label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z' },
				{ type: 'separator' },
				{ label: 'Cut', accelerator: 'CmdOrCtrl+X' },
				{ label: 'Copy', accelerator: 'CmdOrCtrl+C' },
				{ label: 'Paste', accelerator: 'CmdOrCtrl+V' },
				{ label: 'Select All', accelerator: 'CmdOrCtrl+A' }
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
