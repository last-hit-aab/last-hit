import fs from 'fs';
import fse from 'fs-extra';
import jsonfile from 'jsonfile';
import { Flow, Step, Story } from 'last-hit-types';
import path from 'path';
import { getActiveWorkspace } from '../active';
import { asFlowKeyByName } from '../common/context';
import { WorkspaceSettings, WorkspaceStructure } from '../types';
import { getStoryFolder, isStoryFolderExists } from './story';

/**
 * add ".flow.json"
 */
export const isFlowFile = (filename: string): boolean => {
	return filename.endsWith('.flow.json');
};

/**
 * remove ".flow.json"
 */
export const asFlowName = (filename: string): string => {
	return filename.substr(0, filename.length - 10);
};

export const asFlowKey = (flow: Flow, story: Story): string => {
	return asFlowKeyByName(flow.name, story.name);
};

const asFlowFileName = (name: string): string => {
	return `${name}.flow.json`;
};

export const getFlowFilePath = (settings: WorkspaceSettings, story: Story, flow: Flow): string => {
	return path.join(getStoryFolder(settings, story), asFlowFileName(flow.name));
};

const isFlowFileExists = (settings: WorkspaceSettings, story: Story, flow: Flow): boolean => {
	const flowFilePath = getFlowFilePath(settings, story, flow);
	return fs.existsSync(flowFilePath) && fs.statSync(flowFilePath).isFile();
};

/**
 * always on active workspace
 */
export const createFlow = async (
	story: Story,
	options: { name: string; description?: string }
): Promise<Flow> => {
	const { name, description } = options;
	const flow = { name, description } as Flow;

	const settings = getActiveWorkspace()!.getSettings();
	if (!isStoryFolderExists(settings, story)) {
		// story not exists
		return Promise.reject('Story folder not exists.');
	}
	if (isFlowFileExists(settings, story, flow)) {
		// flow already exists
		return Promise.reject('Flow file exists.');
	}

	jsonfile.writeFileSync(
		getFlowFilePath(settings, story, flow),
		{ description },
		{ encoding: 'UTF-8', spaces: '\t' }
	);

	story.flows = story.flows || [];
	story.flows.push(flow);
	story.flows.sort((a, b) => a.name.localeCompare(b.name));

	return Promise.resolve(flow);
};

/**
 * always on active workspace
 */
export const renameFlow = (story: Story, flow: Flow, newname: string): void => {
	const settings = getActiveWorkspace()!.getSettings();

	const storyFolder = getStoryFolder(settings, story);
	if (isFlowFileExists(settings, story, flow)) {
		fse.renameSync(
			getFlowFilePath(settings, story, flow),
			path.join(storyFolder, asFlowFileName(newname))
		);
	}

	flow.name = newname;
	story.flows!.sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * always on active workspace
 */
export const deleteFlow = (story: Story, flow: Flow): void => {
	const settings = getActiveWorkspace()!.getSettings();

	if (isFlowFileExists(settings, story, flow)) {
		fse.removeSync(getFlowFilePath(settings, story, flow));
	}

	const index = story.flows!.indexOf(flow);
	if (index !== -1) {
		story.flows!.splice(index, 1);
	}
};

export const reloadFlow = (story: Story, flow: Flow): Promise<Flow> => {
	const settings = getActiveWorkspace()!.getSettings();

	const flowFile = getFlowFilePath(settings, story, flow);
	if (!fs.existsSync(flowFile)) {
		// flow file must exists
		return Promise.reject(
			new Error(`Failed to reload flow file[${flowFile}] because it is not exists.`)
		);
	}
	if (fs.statSync(flowFile).isDirectory()) {
		// flow file must  is file
		return Promise.reject(
			new Error(`Failed to reload flow file[${flowFile}] because it is not a file.`)
		);
	}
	// properties name and state are no need to persist
	try {
		// const { name } = flow;
		const flowFileData = jsonfile.readFileSync(flowFile);
		Object.keys(flow)
			.filter(key => key !== 'name')
			.forEach(key => delete (flow as any)[key]);
		Object.keys(flowFileData).forEach(key => ((flow as any)[key] = flowFileData[key]));
		return Promise.resolve(flow);
	} catch (e) {
		console.error(e);
		return Promise.reject(
			new Error(`Failed to reload flow file[${flowFile}] because ${e.message}.`)
		);
	}
};

/**
 * always on active workspace
 */
export const saveFlow = (story: Story, flow: Flow): void => {
	const settings = getActiveWorkspace()!.getSettings();

	const flowFile = getFlowFilePath(settings, story, flow);
	if (!fs.existsSync(flowFile) || fs.statSync(flowFile).isDirectory()) {
		// flow file must exists and is file
		return;
	}
	// properties name and state are no need to persist
	const { name, steps, ...rest } = flow;
	jsonfile.writeFileSync(
		flowFile,
		{
			steps: (steps || []).map((step, index) => {
				step.stepIndex = index;
				return step;
			}),
			...rest
		},
		{ encoding: 'UTF-8', spaces: '\t' }
	);
};

/**
 * find all force dependencies, and merge steps to one flow
 */
export const findAndMergeForceDependencyFlows = (
	workspace: WorkspaceStructure,
	story: Story,
	flow: Flow
): Flow => {
	const forceDependencyFlow: Flow = {
		name: flow.name,
		description: `Merged force dependency flows`,
		steps: [],
		params: []
	};

	let currentFlow = flow;
	while (currentFlow.settings && currentFlow.settings.forceDepends) {
		const { story: storyName, flow: flowName } = currentFlow.settings.forceDepends;
		const dependsStory = (workspace.stories || [])!.find(story => story.name === storyName);
		if (dependsStory == null) {
			throw new Error(`Dependency story[${storyName}] not found.`);
		}
		const dependsFlow = (dependsStory.flows || []).find(flow => flow.name === flowName);
		if (dependsFlow == null) {
			throw new Error(`Dependency flow[${flowName}@${storyName}] not found.`);
		}

		const steps = dependsFlow.steps || [];

		forceDependencyFlow.steps!.splice(
			0,
			0,
			...steps.map(step => ({
				...step,
				breakpoint: false,
				origin: {
					story: dependsStory.name,
					flow: dependsFlow.name,
					stepIndex: step.stepIndex
				}
			}))
		);
		mergeFlowInput(dependsFlow, forceDependencyFlow);
		currentFlow = dependsFlow;
	}

	forceDependencyFlow.steps = forceDependencyFlow.steps!.filter((step, index) => {
		return index === 0 || (step.type !== 'start' && step.type !== 'end');
	});
	forceDependencyFlow.steps.push({ type: 'end' } as Step);
	forceDependencyFlow.steps.forEach((step, index) => (step.stepIndex = index));

	return forceDependencyFlow;
};

export const mergeFlowInput = (source: Flow, target: Flow): void => {
	if (source.params && source.params.length !== 0) {
		target.params = target.params || [];
		const existsParamNames = target.params!.reduce((names, param) => {
			names[param.name] = true;
			return names;
		}, {} as { [key in string]: true });
		source.params
			.filter(param => param.type !== 'out')
			.filter(param => existsParamNames[param.name] !== true)
			.forEach(param => target.params!.push(param));
	}
};
