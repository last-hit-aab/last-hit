import fs from 'fs';
import fse from 'fs-extra';
import jsonfile from 'jsonfile';
import path from 'path';
import { getActiveWorkspace } from '../active';
import { asFlowKeyByName } from '../common/context';
import { Flow, Story, WorkspaceSettings, WorkspaceStructure, StepType, Step } from '../types';
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
		steps: []
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
		currentFlow = dependsFlow;
	}

	forceDependencyFlow.steps = forceDependencyFlow.steps!.filter((step, index) => {
		return index === 0 || (step.type !== StepType.START && step.type !== StepType.END);
	});
	forceDependencyFlow.steps.push({ type: StepType.END } as Step);
	forceDependencyFlow.steps.forEach((step, index) => (step.stepIndex = index));

	return forceDependencyFlow;
};
