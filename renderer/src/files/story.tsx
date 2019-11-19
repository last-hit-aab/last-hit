import fs from 'fs';
import path from 'path';
import { Story, WorkspaceSettings } from '../types';

export const asStoryFileName = (name: string): string => {
	return `${name}.story.json`;
};
const getStoryFolder = (settings: WorkspaceSettings, story: Story): string => {
	return path.join(path.parse(settings.workspaceFile).dir, story.name);
};
const getStoryFilePath = (settings: WorkspaceSettings, story: Story): string => {
	return path.join(getStoryFolder(settings, story), asStoryFileName(story.name));
};
export const isStoryFileExists = (settings: WorkspaceSettings, story: Story): boolean => {
	const storyFilePath = getStoryFilePath(settings, story);
	return fs.existsSync(storyFilePath) && fs.statSync(storyFilePath).isFile();
};
