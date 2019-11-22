import { remote } from 'electron';
import fs from 'fs';
import jsonfile from 'jsonfile';
import path from 'path';
import { activeWorkspace, deactiveWorkspace, getActiveWorkspace } from '../active';
import history from '../common/history';
import IDESettings, { WorkspaceFileExt } from '../common/ide-settings';
import paths from '../common/paths';
import { Flow, Story, WorkspaceSettings, WorkspaceStructure } from '../types';
import { asFlowName, isFlowFile } from './flow';
import { asStoryFileName, isStoryFileExists } from './story';

export const createWorkspace = (
	folder: string,
	filename: string,
	options: { name: string }
): void => {
	const { name } = options;
	fs.mkdirSync(folder, { recursive: true });
	const file = path.join(folder, filename + '.' + WorkspaceFileExt);
	jsonfile.writeFileSync(file, { name }, { spaces: '\t', encoding: 'UTF-8' });
	openWorkspace(file);
};

export const openWorkspace = (file: string): void => {
	const settings = loadWorkspace(file);
	const workspace = { name: settings.name, path: path.parse(file).dir };
	const structure = loadWorkspaceStructure(settings);

	IDESettings.addWorkspace(workspace);
	activeWorkspace(workspace, settings, structure);

	const current = remote.getCurrentWindow();
	history.replace(paths.OPENED_WORKSPACE);
	current.setTitle(`${settings.name} - ${path.parse(file).dir}`);
	current.resizable = true;
	current.maximizable = true;
	current.maximize();
};
export const openWorkspaceByFolder = async (folder: string) => {
	const files = fs.readdirSync(folder);
	const workspaceFile = files.find(file => path.parse(file).ext === `.${WorkspaceFileExt}`);
	if (!workspaceFile) {
		remote.dialog.showMessageBox(remote.getCurrentWindow(), {
			type: 'error',
			title: 'Invalid workspace',
			message: 'Workspace file not found.'
		});
		return Promise.reject();
	} else {
		openWorkspace(path.join(folder, workspaceFile));
		return Promise.resolve();
	}
};

const loadWorkspace = (file: string): WorkspaceSettings => {
	try {
		const settings = jsonfile.readFileSync(file) as WorkspaceSettings;
		settings.workspaceFile = file;
		return settings;
	} catch {
		return {
			name: path.parse(file).name,
			workspaceFile: file
		} as WorkspaceSettings;
	}
};

const loadWorkspaceStructure = (settings: WorkspaceSettings): WorkspaceStructure => {
	const structure = { stories: [] } as WorkspaceStructure;
	const workspaceFile = settings.workspaceFile;
	const folder = path.parse(workspaceFile).dir;
	const files = fs.readdirSync(folder);
	structure.stories = files
		.map(file => {
			let story: Story | null = null;
			const storyFolder = path.join(folder, file);
			const stat = fs.statSync(storyFolder);
			if (stat.isDirectory()) {
				const storyFile = asStoryFileName(file);
				if (isStoryFileExists(settings, { name: file } as Story)) {
					try {
						const storyFilePath = path.join(storyFolder, storyFile);
						const storyFileData = jsonfile.readFileSync(storyFilePath);
						const { description, ...rest } = storyFileData;
						story = { name: file, description, ...rest };
					} catch {
						// cannot read story file data, ignored
						story = { name: file, description: '' };
					}
				} else {
					// story file not exists
					story = { name: file, description: '' };
				}

				story!.flows = fs
					.readdirSync(storyFolder)
					.map(file => {
						let flow: Flow | null = null;
						if (
							isFlowFile(file) &&
							fs.statSync(path.join(storyFolder, file)).isFile()
						) {
							// if flow file
							try {
								const flowFileData = jsonfile.readFileSync(
									path.join(storyFolder, file)
								);
								const { description, ...rest } = flowFileData;
								flow = { name: asFlowName(file), description, ...rest };
							} catch (e) {
								console.error(e);
								flow = {
									name: asFlowName(file),
									description: 'File is broken! But never mind, just go on!'
								};
							}
						} else {
						}
						return flow;
					})
					.filter(story => story != null)
					.sort((a, b) => a!.name.localeCompare(b!.name)) as Flow[];
			}
			return story;
		})
		.filter(story => story != null)
		.sort((a, b) => a!.name.localeCompare(b!.name)) as Story[];

	return structure;
};

export const closeCurrentWorkspace = (): void => {
	deactiveWorkspace();

	history.replace(paths.ROOT);

	const current = remote.getCurrentWindow();
	current.setTitle('Welcome to LastHit');
	current.resizable = false;
	current.maximizable = false;
	current.setSize(780, 480, true);
	current.center();
};

/**
 * always on active workspace
 */
export const saveWorkspace = (): void => {
	const settings = getActiveWorkspace()!.getSettings();
	const { workspaceFile: file, ...rest } = settings;
	jsonfile.writeFileSync(file, rest, { spaces: '\t', encoding: 'UTF-8' });
};
