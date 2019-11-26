import fs from 'fs';
import jsonfile from 'jsonfile';
import path from 'path';
import { getActiveWorkspace } from '../active';
import { Story, WorkspaceSettings } from '../types';
import fse from 'fs-extra';

export const asStoryFileName = (name: string): string => {
	return `${name}.story.json`;
};

export const getStoryFolder = (settings: WorkspaceSettings, story: Story): string => {
	return path.join(path.parse(settings.workspaceFile).dir, story.name);
};

const getStoryFilePath = (settings: WorkspaceSettings, story: Story): string => {
	return path.join(getStoryFolder(settings, story), asStoryFileName(story.name));
};

export const isStoryFileExists = (settings: WorkspaceSettings, story: Story): boolean => {
	const storyFilePath = getStoryFilePath(settings, story);
	return fs.existsSync(storyFilePath) && fs.statSync(storyFilePath).isFile();
};

export const isStoryFolderExists = (settings: WorkspaceSettings, story: Story): boolean => {
	const storyFolder = getStoryFolder(settings, story);
	return fs.existsSync(storyFolder) && fs.statSync(storyFolder).isDirectory();
};

/**
 * always on active workspace
 */
export const createStory = async (options: {
	name: string;
	description?: string;
}): Promise<Story> => {
	const { name, description } = options;
	const story = { name, description } as Story;

	const workspace = getActiveWorkspace()!;
	const settings = workspace.getSettings();
	const structure = workspace.getStructure();
	if (isStoryFolderExists(settings, story)) {
		// story already exists
		return Promise.reject('Story folder exists.');
	}

	fs.mkdirSync(getStoryFolder(settings, story));
	jsonfile.writeFileSync(
		getStoryFilePath(settings, story),
		{ description },
		{ encoding: 'UTF-8', spaces: '\t' }
	);

	structure.stories.push(story);
	structure.stories.sort((a, b) => a.name.localeCompare(b.name));

	return Promise.resolve(story);
};

/**
 * always on active workspace
 */
export const renameStory = (story: Story, newname: string) => {
	const workspace = getActiveWorkspace()!;
	const settings = workspace.getSettings();
	const structure = workspace.getStructure();
	const workspaceFile = settings.workspaceFile;
	const folder = path.parse(workspaceFile).dir;

	const storyFolder = getStoryFolder(settings, story);
	if (isStoryFileExists(settings, story)) {
		fse.renameSync(
			getStoryFilePath(settings, story),
			path.join(storyFolder, asStoryFileName(newname))
		);
	}
	if (isStoryFolderExists(settings, story)) {
		fse.renameSync(storyFolder, path.join(folder, newname));
	}

	story.name = newname;
	structure.stories.sort((a: Story, b: Story) => a.name.localeCompare(b.name));
};

/**
 * always on active workspace
 */
export const deleteStory = (story: Story) => {
	const workspace = getActiveWorkspace()!;
	const settings = workspace.getSettings();
	const structure = workspace.getStructure();

	if (isStoryFolderExists(settings, story)) {
		fse.removeSync(getStoryFolder(settings, story));
	}

	const index = structure.stories.indexOf(story);
	if (index !== -1) {
		structure.stories.splice(index, 1);
	}
};
