import fs from 'fs';
import path from 'path';
import Environment from '../config/env';
import { FlowFile, Story, Flow } from '../types';

const output = fs.createWriteStream(path.join(process.cwd(), 'stdout.log'));
const errorOutput = fs.createWriteStream(path.join(process.cwd(), 'stderr.log'));
const logger = new console.Console({ stdout: output, stderr: errorOutput });

export const inElectron = !!process.versions.electron;

export const getTempFolder = (fallbackFolder?: string): string | undefined => {
	if (inElectron) {
		// IMPORTANT donot move to import block, electron might not exists
		const { app } = require('electron');
		return app.getPath('logs');
	} else {
		return fallbackFolder;
	}
};

/**
 * get process id
 */
export const getProcessId = (): string => `${process.pid}`;

/**
 * rewrite log files, note only be called in CI
 */
export const getLogger = (): Console => logger;

export const shorternUrl = (url: string): string => {
	try {
		const parsed = new URL(url);
		parsed.search = '';
		parsed.hash = '';
		return parsed.href;
	} catch {
		// parse fail, not a valid url, return directly
		return url;
	}
};

/**
 * generate flow key
 */
export const generateKeyByObject = (story: Story, flow: Flow): string =>
	`[${flow.name}@${story.name}]`;
export const generateKeyByString = (storyName: string, flowName: string): string =>
	`[${flowName}@${storyName}]`;

/**
 * build flows array of given workspace
 */
export const findFlows = (env: Environment): FlowFile[] => {
	const workspace = env.getWorkspace();
	return fs
		.readdirSync(workspace)
		.filter(dir => fs.statSync(path.join(workspace, dir)).isDirectory())
		.map(storyName => {
			return fs
				.readdirSync(path.join(workspace, storyName))
				.filter(flowFilename =>
					fs.statSync(path.join(workspace, storyName, flowFilename)).isFile()
				)
				.filter(flowFilename => flowFilename.endsWith('.flow.json'))
				.map(flowFilename => flowFilename.replace(/^(.*)\.flow\.json$/, '$1'))
				.filter(
					flowName =>
						env.isIncluded(storyName, flowName) && !env.isExcluded(storyName, flowName)
				)
				.map(flowName => ({ story: storyName, flow: flowName }));
		})
		.reduce((flows, array) => {
			flows.push(...array);
			return flows;
		}, [] as FlowFile[]);
};
