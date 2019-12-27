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
		forceBlur?: boolean;
	};
	export type DomChangeStep = Step & { type: 'dom-change' };
	export type AnimationStep = Step & { type: 'animation'; duration: number };

	export type FlowParameterType = 'in' | 'out' | 'both';
	export type FlowParameterValueType = null | string | number | boolean;
	export type FlowParameter = {
		name: string;
		value: FlowParameterValueType;
		type: FlowParameterType;
	};
	export type FlowParameters = Array<FlowParameter>;
	export type Flow = {
		name: string;
		description: string;
		steps?: Step[];
		params?: FlowParameters;
		settings?: {
			forceDepends?: {
				story: string;
				flow: string;
			};
			dataDepends?: [
				{
					story: string;
					flow: string;
				}
			];
		};
	};
	export type Story = {
		name: string;
		description: string;
		flows?: Flow[];
	};
	export type Environment = {
		name?: string;
		/** url replacement regexp */
		urlReplaceRegexp?: string | string[];
		/** url replacement */
		urlReplaceTo?: string | string[];
		/** sleep time after change step, in millisecond */
		sleepAfterChange?: number;
		/** threshold of slow ajax, in millisecond */
		slowAjaxTime?: number;
	};

	export namespace Extensions {
		export type ExtensionTypes = 'workspace' | 'tbd';
		export type BrowserOperationEventTypes =
			| 'get-element-attr-value'
			| 'get-element-prop-value'
			| 'wait'
			| 'wait-element';

		export interface IExtensionEntryPoint {
			activate(): Promise<void>;
			getType(): ExtensionTypes;
		}
	}
	export namespace WorkspaceExtensions {
		export type SimpleStory = Omit<Story, 'flows'>;
		export type SimpleFlow = Omit<Flow, 'steps' | 'settings'>;

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
		export interface FlowEvent extends WorkspaceEvent {
			story: SimpleStory;
			flow: SimpleFlow;
		}
		export interface FlowShouldStartEvent extends FlowEvent {
			type: 'flow-should-start';
		}
		export interface FlowAccomplishedEvent extends FlowEvent {
			type: 'flow-accomplished';
		}

		export interface StepEvent extends WorkspaceEvent {
			story: SimpleStory;
			flow: SimpleFlow;
			step: Step;
		}
		export interface StepShouldStartEvent extends StepEvent {
			type: 'step-should-start';
		}
		export interface StepOnErrorEvent extends StepEvent {
			type: 'step-on-error';
			error: Error;
		}
		export interface StepAccomplishedEvent extends StepEvent {
			type: 'step-accomplished';
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
			flow: SimpleFlow;
		}
		export interface ReloadStepHandlerEvent extends ReloadHandlerEvent {
			type: 'reload-step-handler';
			story: SimpleStory;
			flow: SimpleFlow;
			step: Step;
		}

		export interface ReturnedData {}
		export interface PreparedEnvironment extends ReturnedData, Environment {}
		export interface PreparedStory extends ReturnedData, Omit<Story, 'flows'> {}
		export interface ReturnedFlow extends ReturnedData, Omit<Flow, 'steps' | 'settings'> {}
		export type FlowParameterValues = { [key in string]: FlowParameterValueType };
		export interface PreparedFlow extends ReturnedFlow {
			_?: { input: FlowParameterValues };
		}
		export interface AccomplishedFlow extends ReturnedFlow {
			_?: { output: FlowParameterValues };
		}
		export interface ReturnedStep extends ReturnedData, Step {
			_?: object;
		}
		export interface PreparedStep extends ReturnedStep {}
		export interface FixedStep extends ReturnedStep {
			_: { fixed: boolean };
		}
		export interface AccomplishedStep extends ReturnedStep {
			_: {
				passed: boolean;
				/** error when not passed */
				error?: Error;
			};
		}

		export interface IWorkspaceExtensionTestHelper {
			test(title: string, fn: () => void | Promise<void>): Promise<this>;
		}

		export interface IWorkspaceExtensionBrowserHelper {
			getElementAttrValue(
				csspath: string,
				attrName: string,
				pageUuid?: string
			): Promise<string | null>;
			getElementPropValue(
				csspath: string,
				propName: string,
				pageUuid?: string
			): Promise<string | null>;
			waitForElement(
				selector: string,
				time: number,
				pageUuid?: string,
				options?: { visible: boolean; hidden: boolean }
			): Promise<void>;
			isInIDE(): boolean;
		}

		export type HandlerTestHelper = { test: IWorkspaceExtensionTestHelper };
		export type HandlerBrowserHelper = { browser: IWorkspaceExtensionBrowserHelper };
		export type HandlerHelpers = HandlerTestHelper & HandlerBrowserHelper;

		export interface IWorkspaceExtensionEntryPoint extends Extensions.IExtensionEntryPoint {
			handleEnvironmentPrepare(
				event: EnvironmentPrepareEvent,
				helpers: HandlerTestHelper
			): Promise<PreparedEnvironment>;

			handleStoryPrepare(
				event: StoryPrepareEvent,
				helpers: HandlerTestHelper
			): Promise<PreparedStory>;

			handleFlowShouldStart(
				event: FlowShouldStartEvent,
				helpers: HandlerTestHelper
			): Promise<PreparedFlow>;
			handleFlowAccomplished(
				event: FlowAccomplishedEvent,
				helpers: HandlerHelpers
			): Promise<AccomplishedFlow>;

			handleStepShouldStart(
				event: StepShouldStartEvent,
				helpers: HandlerHelpers
			): Promise<PreparedStep>;
			handleStepOnError(event: StepOnErrorEvent, helpers: HandlerHelpers): Promise<FixedStep>;
			handleStepAccomplished(
				event: StepAccomplishedEvent,
				helpers: HandlerHelpers
			): Promise<AccomplishedStep>;

			handleReloadAllHandlers(event: ReloadAllHandlersEvent): Promise<void>;
			handleReloadStoryHandler(event: ReloadStoryHandlerEvent): Promise<void>;
			handleReloadFlowHandler(event: ReloadFlowHandlerEvent): Promise<void>;
			handleReloadStepHandler(event: ReloadStepHandlerEvent): Promise<void>;
		}
	}
}
