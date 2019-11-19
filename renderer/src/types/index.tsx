export type Workspace = {
	name: string;
	path: string;
};

export type ExecuteEnv = {
	name?: string;
	urlReplaceRegexp?: string | string[];
	urlReplaceTo?: string | string[];
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
	/** originial step, only exists when step is merged from force dependency flows */
	origin?: {
		story: string;
		flow: string;
		stepIndex: number;
	};
	/** sleep for given time(in ms) after step executed */
	sleep?: number;
};

export type Flow = {
	name: string;
	description: string;
	steps?: Step[];
	settings?: {
		forceDepends?: {
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
