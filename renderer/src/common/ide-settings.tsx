import { remote } from 'electron';
import fs from 'fs';
import jsonfile from 'jsonfile';
import path from 'path';
import { Workspace } from '../types';
import Styles from './styles';

const { app } = remote;
const userDataPath = app.getPath('userData');
const settingsFile = path.join(userDataPath, '.settings');
console.log(`%cSettings File:%c ${settingsFile}`, 'color:red', 'color:unset');

class Settings {
	private workspaces: Array<Workspace> = [];
	private themeName: string = 'dark';

	constructor() {
		this.load();
	}
	private load(): void {
		if (fs.existsSync(settingsFile)) {
			// settings file exists
			try {
				const settings = Object.assign({}, jsonfile.readFileSync(settingsFile));
				this.initialize(settings);
			} catch (e) {
				console.log('failed to load ide settings.', e);
			}
		}
		// replace file anyway
		this.save();
	}
	private initialize(settings: any): void {
		this.readWorkspaces(settings);
		this.readTheme(settings);
	}
	private readWorkspaces(settings: any) {
		if (settings.workspaces && Array.isArray(settings.workspaces)) {
			const exists = {} as { [key in string]: Workspace };
			this.workspaces = settings.workspaces
				.map((workspace: any): Workspace | null => {
					if (workspace.name && workspace.path && !exists[workspace.path]) {
						const ws = {
							name: workspace.name,
							path: workspace.path
						} as Workspace;
						exists[workspace.path] = ws;
						return ws;
					} else {
						return null;
					}
				})
				.filter((workspace: Workspace | null) => workspace != null);
		}
	}
	private readTheme(settings: any) {
		if (settings.theme) {
			this.themeName = settings.theme;
		}
		this.changeTheme('', this.themeName);
	}
	private save() {
		jsonfile.writeFileSync(
			settingsFile,
			{
				workspaces: this.getWorkspaces()
			},
			{ spaces: '\t', encoding: 'UTF-8' }
		);
	}
	getWorkspaces(): Array<Workspace> {
		return this.workspaces;
	}
	hasWorkspace(): boolean {
		return this.workspaces.length !== 0;
	}
	removeWorkspace(workspace: Workspace): Workspace | null {
		const index = this.workspaces.findIndex(exists => exists === workspace);
		if (index === -1) {
			return null;
		} else {
			const found = this.workspaces.splice(index, 1)[0];
			this.save();
			return found;
		}
	}
	addWorkspace(workspace: Workspace): void {
		const index = this.workspaces.findIndex(exist => exist.path === workspace.path);
		if (index !== -1) {
			// remove old one
			this.workspaces.splice(index, 1, workspace);
		} else {
			this.workspaces.push(workspace);
		}
		this.save();
	}
	getThemeName(): string {
		return this.themeName;
	}
	setThemeName(themeName: string): void {
		this.changeTheme(this.themeName, themeName);
		this.themeName = themeName;
		this.save();
	}
	getStyles() {
		return Styles;
	}
	private changeTheme(previous: string, next: string) {
		document.body.classList.remove(`bp3-${previous}`);
		document.body.classList.add(`bp3-${next}`);
	}
}

export default new Settings();
export const WorkspaceFileExt = 'lhw';
