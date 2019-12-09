declare module 'last-hit-types' {
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

	export type StepType =
		| 'start'
		| 'click'
		| 'change'
		| 'ajax'
		| 'dom-change'
		| 'end'
		| 'page-closed'
		| 'page-created'
		| 'page-error'
		| 'page-switched'
		| 'dialog-open'
		| 'dialog-close'
		| 'resource-load'
		| 'load'
		| 'keydown'
		| 'mousedown'
		| 'focus'
		| 'scroll'
		| 'unload'
		| 'animation';
	export type Step = {
		/** step type */
		type: StepType;
		/** human reading text */
		human?: string;
		/** page uuid, identify which page this step occurred */
		uuid: string;
		/** step index, starts from 0 */
		stepIndex: number;
		/** uuid of step, global unique */
		stepUuid: string;
		/** xpath */
		path?: string;
		/** css path */
		csspath?: string;
		/** custom path */
		custompath?: string;
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
	export type StartStep = Step & { type: 'start'; url?: string; device?: Device };
	export type AjaxStep = Step & {
		type: 'ajax';
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
		type: 'resouce-load';
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
	export type LoadStep = Step & { type: 'load'; target: string };
	export type UnloadStep = Step & { type: 'unload'; target: string };
	export type PageClosedStep = Step & { type: 'page-closed'; url: string };
	export type PageCreatedStep = Step & {
		type: 'page-created';
		url: string;
		/** for install uuid of popup, manually input */
		forStepUuid: string;
	};
	export type PageErrorStep = Step & { type: 'page-error'; url: string };
	export type PageSwitchStep = Step & { type: 'page-switched'; url: string };
	export type DialogOpenStep = Step & {
		type: 'dialog-open';
		url: string;
		dialog: 'alert' | 'prompt' | 'confirm' | 'beforeunload';
		message?: string;
	};
	export type DialogCloseStep = Step & {
		type: 'dialog-close';
		url: string;
		dialog: 'alert' | 'prompt' | 'confirm' | 'beforeunload';
		message?: string;
		returnValue?: string | unknown;
	};
	export type EndStep = Step & { type: 'end' };
	export type DomEventStep = Step & { target: string; path: string };
	/**
	 * value for all input element,
	 * checked for checkbox and radio element
	 */
	export type ClickStep = DomEventStep & {
		type: 'click';
		value?: string;
		checked?: boolean;
	};
	export type KeydownStep = DomEventStep & { type: 'keydown'; value: string };
	export type MousedownStep = DomEventStep & { type: 'mousedown' };
	export type ScrollStep = DomEventStep & {
		type: 'scroll';
		scrollTop: number;
		scrollLeft: number;
	};
	export type FocusStep = DomEventStep & { type: 'focus' };
	export type ChangeStep = DomEventStep & {
		type: 'change';
		value: string;
		file?: string;
		checked?: boolean;
	};
	export type DomChangeStep = Step & { type: 'dom-change' };
	export type AnimationStep = Step & { type: 'animation'; duration: number };

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
	export type Environment = {
		name?: string;
		urlReplaceRegexp?: string | string[];
		urlReplaceTo?: string | string[];
	};

	export namespace Extensions {
		export type ExtensionTypes = 'workspace' | 'tbd';
		export interface IExtensionEntryPoint {
			activate(): Promise<void>;
			getType(): ExtensionTypes;
		}
	}
	export namespace WorkspaceExtensions {
		export type SimpleStory = Omit<Story, 'flows'>;

		export type WorkspaceEventTypes =
			| 'env-prepare'
			| 'story-prepare'
			| 'flow-should-start'
			| 'flow-accomplished'
			| 'step-should-start'
			| 'step-on-error'
			| 'step-accomplished'
			| 'reload-all-handlers'
			| 'reload-story-handler'
			| 'reload-flow-handler'
			| 'reload-step-handler';

		export interface WorkspaceEvent {
			type: WorkspaceEventTypes;
		}
		export interface EnvironmentEvent extends WorkspaceEvent {}
		export interface EnvironmentPrepareEvent extends EnvironmentEvent {
			type: 'env-prepare';
			env: Environment;
		}

		export interface StoryEvent extends WorkspaceEvent {}
		export interface StoryPrepareEvent extends StoryEvent {
			type: 'story-prepare';
			story: SimpleStory;
		}
		export interface FlowEvent extends WorkspaceEvent {}
		export interface FlowShouldStartEvent extends FlowEvent {
			type: 'flow-should-start';
			story: SimpleStory;
			flow: Flow;
		}
		export interface FlowAccomplishedEvent extends FlowEvent {
			type: 'flow-accomplished';
			story: SimpleStory;
			flow: Flow;
		}

		export interface StepEvent extends WorkspaceEvent {}
		export interface StepShouldStartEvent extends StepEvent {
			type: 'step-should-start';
			story: SimpleStory;
			flow: Flow;
			step: Step;
		}
		export interface StepOnErrorEvent extends StepEvent {
			type: 'step-on-error';
			story: SimpleStory;
			flow: Flow;
			step: Step;
			error: Error;
		}
		export interface StepAccomplishedEvent extends StepEvent {
			type: 'step-accomplished';
			story: SimpleStory;
			flow: Flow;
			step: Step;
		}

		export interface ReloadHandlerEvent extends WorkspaceEvent {}
		export interface ReloadAllHandlersEvent extends ReloadHandlerEvent {
			type: 'reload-all-handlers';
		}
		export interface ReloadStoryHandlerEvent extends ReloadHandlerEvent {
			type: 'reload-story-handler';
			story: SimpleStory;
		}
		export interface ReloadFlowHandlerEvent extends ReloadHandlerEvent {
			type: 'reload-flow-handler';
			story: SimpleStory;
			flow: Flow;
		}
		export interface ReloadStepHandlerEvent extends ReloadHandlerEvent {
			type: 'reload-step-handler';
			story: SimpleStory;
			flow: Flow;
			step: Step;
		}

		export interface IWorkspaceExtensionEntryPoint extends Extensions.IExtensionEntryPoint {
			handleEnvironmentPrepare(event: EnvironmentPrepareEvent): Promise<any>;
			handleStoryPrepare(event: StoryPrepareEvent): Promise<any>;
			handleFlowShouldStart(event: FlowShouldStartEvent): Promise<any>;
			handleFlowAccomplished(event: FlowAccomplishedEvent): Promise<any>;
			handleStepShouldStart(event: StepShouldStartEvent): Promise<any>;
			handleStepOnError(event: StepOnErrorEvent): Promise<any>;
			handleStepAccomplished(event: StepAccomplishedEvent): Promise<any>;
			handleReloadAllHandlers(event: ReloadAllHandlersEvent): Promise<void>;
			handleReloadStoryHandler(event: ReloadStoryHandlerEvent): Promise<void>;
			handleReloadFlowHandler(event: ReloadFlowHandlerEvent): Promise<void>;
			handleReloadStepHandler(event: ReloadStepHandlerEvent): Promise<void>;
		}
	}
}
