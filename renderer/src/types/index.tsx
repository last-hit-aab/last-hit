export type Device = {
	name: string;
	userAgent: string;
	wechat?: boolean;
	viewport: {
		width: number;
		height: number;
		deviceScaleFactor: number;
		isMobile: boolean;
		hasTouch: boolean;
		isLandscape: boolean;
	};
};

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
export type PageCreatedStep = Step & {
	type: StepType.PAGE_CREATED;
	url: string;
	/** for install uuid of popup, manually input */
	forStepUuid: string;
};
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
export type ScrollStep = DomEventStep & {
	type: StepType.SCROLL;
	scrollTop: number;
	scrollLeft: number;
};
export type TextChangeEvent = DomEventStep & { type: StepType.CHANGE };
export type FocusStep = DomEventStep & { type: StepType.FOCUS };
export type ChangeStep = DomEventStep & { type: StepType.CHANGE; value: string };
export type DomChangeStep = Step & { type: StepType.DOM_CHANGE };
export type AnimationStep = Step & { type: StepType.ANIMATION };

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

export enum FlowUIStatusEnum {
	ON_RECORD = 'on-record',
	ON_REPLAY = 'on-replay',
	IDLE = 'idle',
	NOT_OPEN = 'not-open'
}

export type FlowUIStatus = {
	story: Story;
	flow: Flow;
	status: FlowUIStatusEnum;
};
