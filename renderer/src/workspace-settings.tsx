import { remote } from 'electron';
import fs from 'fs';
import fse from 'fs-extra';
import jsonfile from 'jsonfile';
import path from 'path';
import history from './common/history';
import { WorkspaceFileExt, workspaces } from './global-settings';
import paths from './paths';

export type ExecuteEnv = {
	name?: string;
	urlReplaceRegexp?: string;
	urlReplaceTo?: string;
};
export type WorkspaceSettings = {
	name: string;
	workspaceFile: string;
	envs?: ExecuteEnv[];
};
export enum StepType {
	START = 'start', // done in replay
	CLICK = 'click', // done in replay
	CHANGE = 'change', // done in replay
	AJAX = 'ajax', // ignore in replay 20191001
	DOM_CHANGE = 'dom-change', // ignore on capture 20190925
	SUBMIT = 'submit', // ignore on replay 20191005
	END = 'end', // done in replay
	PAGE_CLOSED = 'page-closed', // done in replay
	PAGE_CREATED = 'page-created', // done in replay
	PAGE_ERROR = 'page-error', // ignore in replay 20190925
	PAGE_SWITCHED = 'page-switched', // done in replay
	DIALOG_OPEN = 'dialog-open', // ignored on replay 20190925
	DIALOG_CLOSE = 'dialog-close', // done in replay
	RESOURCE_LOAD = 'resource-load', // ignore on capture 20190925
	LOAD = 'load', // ignore on capture 20190925
	MOUSE_DOWN = 'mousedown', // done in replay
	KEY_DOWN = 'keydown', // done in replay
	FOCUS = 'focus', // done in replay
	SCROLL = 'scroll', // done in replay
	UNLOAD = 'unload', // ignore on capture 20190925
	VALUE_CHANGE = 'valuechange', // ignore on capture 20190925
	ANIMATION = 'animation' // done in replay
}
export type StepAssertion = {
	element?: string;
	attribute?: string;
	operator: StepAssertOperator;
	value?: string;
};
export type StepCondition = {
	element?: string;
	attribute?: string;
	operator: StepAssertOperator;
	value?: string;
};
export type StepConditions = (StepCondition | { conj: 'or' | 'and'; conditions: StepConditions })[];
export type Step = {
	/** step type */
	type: StepType;
	/** human reading text */
	human?: string;
	/** page uuid */
	uuid: string;
	stepIndex: number;
	stepUuid: string;
	/** xpath */
	path?: string;
	/** css path */
	csspath?: string;
	/** screenshot, base64 */
	image?: string;
	/** breakpoint */
	breakpoint?: boolean;
	assertions?: StepAssertion[];
	conditions?: StepConditions;
};
export type Device = {
	name: string;
	userAgent: string;
	viewport: {
		width: number;
		height: number;
		deviceScaleFactor: number;
		isMobile: boolean;
		hasTouch: boolean;
		isLandscape: boolean;
	};
};
export type StartStep = Step & { type: StepType.START; url: string; device: Device };
export type AjaxStep = Step & {
	type: StepType.AJAX;
	request: {
		url: string;
		method: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH' | 'OPTION';
		headers: { [key in string]: string };
		body: any;
		resourceType: string;
	};
	response: {
		statusCode: number;
		statusMessage: string;
		headers: { [key in string]: string };
		body: string;
	};
};
export type ResourceLoadStep = Step & {
	type: StepType.RESOURCE_LOAD;
	request: {
		url: string;
		method: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH' | 'OPTION';
		resourceType: string;
	};
	response: {
		statusCode: number;
		statusMessage: string;
	};
};
export type LoadStep = Step & { type: StepType.LOAD; target: string };
export type UnloadStep = Step & { type: StepType.UNLOAD; target: string };
export type PageClosedStep = Step & { type: StepType.PAGE_CLOSED; url: string };
export type PageCreatedStep = Step & { type: StepType.PAGE_CREATED; url: string };
export type PageErrorStep = Step & { type: StepType.PAGE_ERROR; url: string };
export type PageSwitchStep = Step & { type: StepType.PAGE_SWITCHED; url: string };
export type DialogOpenStep = Step & {
	type: StepType.DIALOG_OPEN;
	url: string;
	dialog: 'alert' | 'prompt' | 'confirm' | 'beforeunload';
	message?: string;
};
export type DialogCloseStep = Step & {
	type: StepType.DIALOG_CLOSE;
	url: string;
	dialog: 'alert' | 'prompt' | 'confirm' | 'beforeunload';
	message?: string;
};
export type EndStep = Step & { type: StepType.END };
export type DomEventStep = Step & { target: string };
export type ClickStep = DomEventStep & { type: StepType.CLICK };
export type MouseDownStep = DomEventStep & { type: StepType.MOUSE_DOWN };
export type ScrollStep = DomEventStep & { type: StepType.SCROLL; scrollTop: number; scrollLeft: number };
export type TextChangeEvent = DomEventStep & { type: StepType.CHANGE };
export type FocusStep = DomEventStep & { type: StepType.FOCUS };
export type ChangeStep = DomEventStep & { type: StepType.CHANGE; value: string };
export type DomChangeStep = Step & { type: StepType.DOM_CHANGE };
export type AnimationStep = Step & { type: StepType.ANIMATION };
export enum StepAssertOperator {
	EQUALS = '==',
	NOT_EQUALS = '<>',
	MORE_THAN = '>',
	MORE_THAN_OR_EQUALS = '>=',
	LESS_THAN = '<',
	LESS_THAN_OR_EQUALS = '<=',
	REGEXP = 'Regexp',
	STARTS_WITH = 'Starts with',
	NOT_STARTS_WITH = 'Not starts with',
	ENDS_WITH = 'Ends with',
	NOT_ENDS_WITH = 'Not ends with',
	CONTAINS = 'Contains',
	NOT_CONTAINS = 'Not contains',
	EXISTS = 'Exists',
	NOT_EXISTS = 'Not Exists'
}
export type Flow = {
	name: string;
	description: string;
	steps?: Step[];
	settings?: {
		forceDepends?: {
			story: string;
			flow: string;
		};
		softDepends?: {
			story: string;
			flow: string;
		};
	};
};
export type Story = {
	name: string;
	description: string;
	flows?: Flow[];
};
export type WorkspaceStructure = {
	stories: Story[];
};

let currentWorkspaceSettings: WorkspaceSettings | null = null;
let currentWorkspaceStructure: WorkspaceStructure | null = null;

export const isWorkspaceOpened = () => {
	return currentWorkspaceSettings != null && currentWorkspaceStructure != null;
};
export const getCurrentWorkspace = (): { settings: WorkspaceSettings; structure: WorkspaceStructure } => {
	return {
		settings: getCurrentWorkspaceSettings()!,
		structure: getCurrentWorkspaceStructure()!
	};
};
export const getCurrentWorkspaceSettings = (): WorkspaceSettings | null => {
	return currentWorkspaceSettings;
};
export const getCurrentWorkspaceStructure = (): WorkspaceStructure | null => {
	return currentWorkspaceStructure;
};
export const saveCurrentWorkspace = async () => {
	const { settings } = getCurrentWorkspace();
	const { workspaceFile: file, ...rest } = settings;
	await jsonfile.writeFile(file, rest, { spaces: '\t', encoding: 'UTF-8' });
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
						if (isFlowFile(file) && fs.statSync(path.join(storyFolder, file)).isFile()) {
							// if flow file
							try {
								const flowFileData = jsonfile.readFileSync(path.join(storyFolder, file));
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
const releaseCurrentWorkspace = () => {
	currentWorkspaceSettings = null;
	currentWorkspaceStructure = null;
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
export const openWorkspace = (file: string): void => {
	const settings = loadWorkspace(file);
	workspaces.addWorkspace({ name: settings.name, path: path.parse(file).dir });
	currentWorkspaceSettings = settings;
	const structure = loadWorkspaceStructure(settings);
	currentWorkspaceStructure = structure;

	const current = remote.getCurrentWindow();
	history.replace(paths.OPENED_WORKSPACE);
	current.setTitle(`${settings.name} - ${path.parse(file).dir}`);
	current.setResizable(true);
	current.setMaximizable(true);
	current.maximize();
};

export const createWorkspace = (folder: string, filename: string, options: { name: string }): void => {
	const { name } = options;
	fs.mkdirSync(folder, { recursive: true });
	const file = path.join(folder, filename + '.' + WorkspaceFileExt);
	jsonfile.writeFileSync(file, { name }, { spaces: '\t', encoding: 'UTF-8' });
	openWorkspace(file);
};
export const closeCurrentWorkspace = (): void => {
	releaseCurrentWorkspace();
	const current = remote.getCurrentWindow();
	current.setTitle('Welcome to LastHit');
	current.setResizable(false);
	current.setMaximizable(false);
	current.setSize(780, 480, true);
	current.center();
};

export const createStoryOnCurrentWorkspace = async (options: {
	name: string;
	description?: string;
}): Promise<Story> => {
	const { name, description } = options;
	const story = { name, description } as Story;

	const { settings, structure } = getCurrentWorkspace();
	if (isStoryFolderExists(settings, story)) {
		// story already exists
		return Promise.reject('Story folder exists.');
	}

	fs.mkdirSync(getStoryFolder(settings, story));
	jsonfile.writeFileSync(getStoryFilePath(settings, story), { description }, { encoding: 'UTF-8', spaces: '\t' });

	structure.stories.push(story);
	structure.stories.sort((a, b) => a.name.localeCompare(b.name));

	return Promise.resolve(story);
};

export const deleteStoryFromCurrentWorkspace = async (story: Story) => {
	const { settings, structure } = getCurrentWorkspace();

	if (isStoryFolderExists(settings, story)) {
		fse.removeSync(getStoryFolder(settings, story));
	}

	const index = structure.stories.indexOf(story);
	if (index !== -1) {
		structure.stories.splice(index, 1);
	}

	return Promise.resolve();
};

export const renameStory = (story: Story, newname: string): Promise<Story> => {
	const { settings, structure } = getCurrentWorkspace();
	const workspaceFile = settings.workspaceFile;
	const folder = path.parse(workspaceFile).dir;

	const storyFolder = getStoryFolder(settings, story);
	if (isStoryFileExists(settings, story)) {
		fse.renameSync(getStoryFilePath(settings, story), path.join(storyFolder, asStoryFileName(newname)));
	}
	if (isStoryFolderExists(settings, story)) {
		fse.renameSync(storyFolder, path.join(folder, newname));
	}

	story.name = newname;
	structure.stories.sort((a, b) => a.name.localeCompare(b.name));

	return Promise.resolve(story);
};

export const createFlowOnCurrentWorkspace = async (
	story: Story,
	options: { name: string; description?: string }
): Promise<Flow> => {
	const { name, description } = options;
	const flow = { name, description } as Flow;

	const { settings } = getCurrentWorkspace();
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
export const saveFlow = async (story: Story, flow: Flow) => {
	const { settings } = getCurrentWorkspace();

	// const storyFolder = getStoryFolder(settings, story);
	try {
		// properties name and state are no need to persist
		const { name, steps, ...rest } = flow;
		await jsonfile.writeFile(
			getFlowFilePath(settings, story, flow),
			{
				steps: (steps || []).map((step, index) => {
					step.stepIndex = index;
					return step;
				}),
				...rest
			},
			{ encoding: 'UTF-8', spaces: '\t' }
		);
		return Promise.resolve();
	} catch (e) {
		return Promise.reject(e);
	}
};
export const renameFlow = (story: Story, flow: Flow, newname: string): Promise<Flow> => {
	const { settings } = getCurrentWorkspace();

	const storyFolder = getStoryFolder(settings, story);
	if (isFlowFileExists(settings, story, flow)) {
		fse.renameSync(getFlowFilePath(settings, story, flow), path.join(storyFolder, asFlowFileName(newname)));
	}

	flow.name = newname;
	story.flows!.sort((a, b) => a.name.localeCompare(b.name));

	return Promise.resolve(flow);
};

export const deleteFlowFromCurrentWorkspace = async (story: Story, flow: Flow) => {
	const { settings } = getCurrentWorkspace();

	if (isFlowFileExists(settings, story, flow)) {
		fse.removeSync(getFlowFilePath(settings, story, flow));
	}

	const index = story.flows!.indexOf(flow);
	if (index !== -1) {
		story.flows!.splice(index, 1);
	}

	return Promise.resolve();
};

const asFlowFileName = (name: string): string => {
	return `${name}.flow.json`;
};
export const getFlowFilePath = (settings: WorkspaceSettings, story: Story, flow: Flow): string => {
	return path.join(getStoryFolder(settings, story), asFlowFileName(flow.name));
};
const asFlowName = (filename: string): string => {
	return filename.substr(0, filename.length - 10);
};
const isFlowFile = (filename: string): boolean => {
	return filename.endsWith('.flow.json');
};
const isFlowFileExists = (settings: WorkspaceSettings, story: Story, flow: Flow): boolean => {
	const flowFilePath = getFlowFilePath(settings, story, flow);
	return fs.existsSync(flowFilePath) && fs.statSync(flowFilePath).isFile();
};
const asStoryFileName = (name: string): string => {
	return `${name}.story.json`;
};
const getStoryFolder = (settings: WorkspaceSettings, story: Story): string => {
	return path.join(path.parse(settings.workspaceFile).dir, story.name);
};
const getStoryFilePath = (settings: WorkspaceSettings, story: Story): string => {
	return path.join(getStoryFolder(settings, story), asStoryFileName(story.name));
};
const isStoryFolderExists = (settings: WorkspaceSettings, story: Story): boolean => {
	const storyFolder = getStoryFolder(settings, story);
	return fs.existsSync(storyFolder) && fs.statSync(storyFolder).isDirectory();
};
const isStoryFileExists = (settings: WorkspaceSettings, story: Story): boolean => {
	const storyFilePath = getStoryFilePath(settings, story);
	return fs.existsSync(storyFilePath) && fs.statSync(storyFilePath).isFile();
};

const findInDependencyChain = (story: string, flow: string, dependsChain: { story: string; flow: string }[]) => {
	return dependsChain.some(node => node.story === story && node.flow === flow);
};
const doLoopCheck = (
	workspace: WorkspaceStructure,
	dependsStoryName: string,
	dependsFlowName: string,
	dependsChain: { story: string; flow: string }[]
): boolean => {
	if (findInDependencyChain(dependsStoryName, dependsFlowName, dependsChain)) {
		return false;
	}
	// find story
	const dependsStory = workspace.stories.find(story => story.name === dependsStoryName);
	if (!dependsStory) {
		return true;
	}
	// find flow
	const dependsFlow = (dependsStory.flows || []).find(flow => flow.name === dependsFlowName);
	if (!dependsFlow) {
		return true;
	}
	const { forceDepends = null, softDepends = null } = dependsFlow.settings || {};
	if (forceDepends) {
		if (findInDependencyChain(forceDepends.story, forceDepends.flow, dependsChain)) {
			return false;
		} else {
			dependsChain.push({ story: forceDepends.story, flow: forceDepends.flow });
			return doLoopCheck(workspace, forceDepends.story, forceDepends.flow, dependsChain);
		}
	}
	if (softDepends) {
		if (findInDependencyChain(softDepends.story, softDepends.flow, dependsChain)) {
			return false;
		} else {
			dependsChain.push({ story: softDepends.story, flow: softDepends.flow });
			return doLoopCheck(workspace, softDepends.story, softDepends.flow, dependsChain);
		}
	}
	return true;
};

/**
 * only check loop. return true even dependency flow not found.
 * @returns {boolean} return true when pass the loop check
 */
export const loopCheck = (
	workspace: WorkspaceStructure,
	dependsStoryName: string,
	dependsFlowName: string,
	myStoryName: string,
	myFlowName: string
): boolean => {
	return doLoopCheck(workspace, dependsStoryName, dependsFlowName, [{ story: myStoryName, flow: myFlowName }]);
};

/**
 * find all force dependencies, and merge steps to one flow
 */
export const findAndMergeForceDependencyFlows = (workspace: WorkspaceStructure, story: Story, flow: Flow): Flow => {
	const forceDependencyFlow: Flow = { name: flow.name, description: `Merged force dependency flows`, steps: [] };

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

		forceDependencyFlow.steps!.splice(0, 0, ...steps);
		currentFlow = dependsFlow;
	}

	forceDependencyFlow.steps = forceDependencyFlow.steps!.filter((step, index) => {
		return index === 0 || (step.type !== StepType.START && step.type !== StepType.END);
	});
	forceDependencyFlow.steps.push({ type: StepType.END } as Step);

	return forceDependencyFlow;
};
