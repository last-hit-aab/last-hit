import { remote } from 'electron';
import fs from 'fs';
import jsonfile from 'jsonfile';
import { merge } from 'lodash';
import path from 'path';

const { app } = remote;
const userDataPath = app.getPath('userData');
const settingsFile = path.join(userDataPath, '.settings');
console.log(`%cSettings File:%c ${settingsFile}`, 'color:red', 'color:unset');

const DEFAULT_DARK_THEME_NAME = 'last-hit-dark';
export type Theme = {
	name: string;
	paletteType: 'dark' | 'light';
	splashOutlineBackgroundColor: string;
	splashOutlineHoverBackgroundColor: string;
	splashOperationColor: string;
	linkHoverColor: string;
	outlineBoxShadow: string;
	outlineTopBarBoxShadow: string;
	outlineScrollBarThumbBackgroundColor: string;
	workareaBottomBackgroundColor: string;
	workareaBottomSegmentHoverBackgroundColor: string;
	opacityForFontColor: number;
	workareaTabsIndicatorBackgroundColor: string;
	textScrollBarThumbBackgroundColor: string;
	flowIconColor: string;
	storyIconColor: string;
	stepIconColor: string;
	stepFocusColor: string;
};
export interface Workspaces {
	getWorkspaces: () => Workspace[];
	hasWorkspace: () => boolean;
	removeWorkspace: (workspace: Workspace) => boolean;
}
export type Workspace = {
	name: string;
	path: string;
};
export type Settings = {
	theme: Theme;
	workspaces: Workspace[];
	server: {
		port: number;
	};
};

const defaultSettings = {
	theme: {
		name: DEFAULT_DARK_THEME_NAME,
		paletteType: 'dark',
		splashOutlineBackgroundColor: '#2b2b2b',
		splashOutlineHoverBackgroundColor: '#3a57a2',
		splashOperationColor: '#adadad',
		linkHoverColor: '#ac5c14',
		outlineBoxShadow: '0 1px 2px 0 rgba(0,0,0,0.5)',
		outlineTopBarBoxShadow: '0 4px 3px -4px rgba(0,0,0,0.8)',
		outlineScrollBarThumbBackgroundColor: 'rgba(29, 29, 29, 0.3)',
		workareaBottomBackgroundColor: '#2b2b2b',
		workareaBottomSegmentHoverBackgroundColor: '#3a57a2',
		opacityForFontColor: 0.9,
		workareaTabsIndicatorBackgroundColor: 'rgba(109,194,184,1)',
		textScrollBarThumbBackgroundColor: 'rgba(29, 29, 29, 0.3)',
		flowIconColor: 'rgba(121,134,203,1)',
		storyIconColor: 'rgba(255,64,129,1)',
		stepIconColor: 'rgba(121,134,203,1)',
		stepFocusColor: 'rgba(121,134,203,0.2)'
	} as Theme,
	workspaces: [],
	server: 6789
};
let settings: Settings;

const saveSettings = () => {
	if (settings.theme.name === DEFAULT_DARK_THEME_NAME) {
		const { theme, ...rest } = settings;
		jsonfile.writeFileSync(settingsFile, { ...rest }, { spaces: '\t', encoding: 'UTF-8' });
	} else {
		jsonfile.writeFileSync(settingsFile, settings, { spaces: '\t', encoding: 'UTF-8' });
	}
};
const loadSettings = () => {
	if (fs.existsSync(settingsFile)) {
		// settings file exists
		try {
			settings = merge({}, defaultSettings, jsonfile.readFileSync(settingsFile) as Settings);
		} catch {
			settings = JSON.parse(JSON.stringify(defaultSettings));
		}
	} else {
		// settings file not exists
		settings = JSON.parse(JSON.stringify(defaultSettings));
	}
	// replace file anyway
	saveSettings();
};

export const getTheme = (): Theme => {
	return settings.theme;
};
class WorkspacesImpl implements Workspaces {
	getWorkspaces(): Workspace[] {
		return settings.workspaces;
	}
	hasWorkspace(): boolean {
		return this.getWorkspaces().length !== 0;
	}
	/**
	 * return true when given workspace found and removed
	 */
	removeWorkspace(workspace: Workspace): boolean {
		const workspaces = this.getWorkspaces();
		const index = workspaces.findIndex(ws => ws === workspace);
		if (index !== -1) {
			workspaces.splice(index, 1);
			saveSettings();
			return true;
		} else {
			return false;
		}
	}
	addWorkspace(workspace: Workspace): boolean {
		const workspaces = this.getWorkspaces();
		const index = workspaces.findIndex(ws => ws.name === workspace.name && ws.path === workspace.path);
		if (index !== -1) {
			workspaces.splice(index, 1);
		}
		workspaces.unshift(workspace);
		saveSettings();
		return true;
	}
}

export const workspaces = new WorkspacesImpl();
export const WorkspaceFileExt = 'lhw';

loadSettings();
