import { AbstractExtensionEntryPointWrapper, IExtensionEntryPoint } from '../../types';

export enum WorkspaceEventTypes {
	ENV_PREPARE = 'env-prepare',
	STORY_PREPARE = 'story-prepare',
	FLOW_SHOULD_START = 'flow-should-start',
	FLOW_ACCOMPLISHED = 'flow-accomplished',
	STEP_SHOULD_START = 'step-should-start',
	STEP_ON_ERROR = 'step-on-error',
	STEP_ACCOMPLISHED = 'step-accomplished',
	RELOAD_ALL_HANDLERS = 'reload-all-handlers',
	RELOAD_STORY_HANDLER = 'reload-story-handler',
	RELOAD_FLOW_HANDLER = 'reload-flow-handler',
	RELOAD_STEP_HANDLER = 'reload-step-handler'
}
export interface WorkspaceEvent {
	type: WorkspaceEventTypes;
}
export interface EnvironmentEvent extends WorkspaceEvent {}
export interface EnvironmentPrepareEvent extends EnvironmentEvent {
	type: WorkspaceEventTypes.ENV_PREPARE;
}
export interface StoryEvent extends WorkspaceEvent {}
export interface StoryPrepareEvent extends StoryEvent {
	type: WorkspaceEventTypes.STORY_PREPARE;
}
export interface FlowEvent extends WorkspaceEvent {}
export interface FlowShouldStartEvent extends FlowEvent {
	type: WorkspaceEventTypes.FLOW_SHOULD_START;
}
export interface FlowAccomplishedEvent extends FlowEvent {
	type: WorkspaceEventTypes.FLOW_ACCOMPLISHED;
}
export interface StepEvent extends WorkspaceEvent {}
export interface StepShouldStartEvent extends StepEvent {
	type: WorkspaceEventTypes.STEP_SHOULD_START;
}
export interface StepOnErrorEvent extends StepEvent {
	type: WorkspaceEventTypes.STEP_ON_ERROR;
}
export interface StepAccomplishedEvent extends StepEvent {
	type: WorkspaceEventTypes.STEP_ACCOMPLISHED;
}

export interface ReloadHandlerEvent extends WorkspaceEvent {}
export interface ReloadAllHandlersEvent extends ReloadHandlerEvent {
	type: WorkspaceEventTypes.RELOAD_ALL_HANDLERS;
}
export interface ReloadStoryHandlerEvent extends ReloadHandlerEvent {
	type: WorkspaceEventTypes.RELOAD_STEP_HANDLER;
}
export interface ReloadFlowHandlerEvent extends ReloadHandlerEvent {
	type: WorkspaceEventTypes.RELOAD_FLOW_HANDLER;
}
export interface ReloadStepHandlerEvent extends ReloadHandlerEvent {
	type: WorkspaceEventTypes.RELOAD_STEP_HANDLER;
}

export type EventHandler<E extends WorkspaceEvent> = (event: E) => void;

export interface IWorkspaceExtensionEntryPoint extends IExtensionEntryPoint {
	handleEnvironmentPrepare(event: EnvironmentPrepareEvent): void;
	handleStoryPrepare(event: StoryPrepareEvent): void;
	handleFlowShouldStart(event: FlowShouldStartEvent): void;
	handleFlowAccomplished(event: FlowAccomplishedEvent): void;
	handleStepShouldStart(event: StepShouldStartEvent): void;
	handleStepOnError(event: StepOnErrorEvent): void;
	handleStepAccomplished(event: StepAccomplishedEvent): void;
	handleReloadAllHandlers(event: ReloadAllHandlersEvent): void;
	handleReloadStoryHandler(event: ReloadStoryHandlerEvent): void;
	handleReloadFlowHandler(event: ReloadFlowHandlerEvent): void;
	handleReloadStepHandler(event: ReloadStepHandlerEvent): void;
}

export class WorkspaceExtensionEntryPointWrapper extends AbstractExtensionEntryPointWrapper<
	IWorkspaceExtensionEntryPoint
> {
	private handlers: { [key in WorkspaceEventTypes]: EventHandler<any> };

	constructor(entrypoint: IWorkspaceExtensionEntryPoint) {
		super(entrypoint);

		this.handlers = {
			[WorkspaceEventTypes.ENV_PREPARE]: entrypoint.handleEnvironmentPrepare,
			[WorkspaceEventTypes.STORY_PREPARE]: entrypoint.handleStoryPrepare,
			[WorkspaceEventTypes.FLOW_SHOULD_START]: entrypoint.handleFlowShouldStart,
			[WorkspaceEventTypes.FLOW_ACCOMPLISHED]: entrypoint.handleFlowAccomplished,
			[WorkspaceEventTypes.STEP_SHOULD_START]: entrypoint.handleStepShouldStart,
			[WorkspaceEventTypes.STEP_ON_ERROR]: entrypoint.handleStepOnError,
			[WorkspaceEventTypes.STEP_ACCOMPLISHED]: entrypoint.handleStepAccomplished,
			[WorkspaceEventTypes.RELOAD_ALL_HANDLERS]: entrypoint.handleReloadAllHandlers,
			[WorkspaceEventTypes.RELOAD_STORY_HANDLER]: entrypoint.handleReloadStoryHandler,
			[WorkspaceEventTypes.RELOAD_FLOW_HANDLER]: entrypoint.handleReloadFlowHandler,
			[WorkspaceEventTypes.RELOAD_STEP_HANDLER]: entrypoint.handleReloadStepHandler
		};
	}
	handle(event: WorkspaceEvent): void {
		const handler: EventHandler<any> = this.handlers[event.type];
		if (handler) {
			handler.call(this.getEntrypoint(), event);
		} else {
			console.error(`Handler not found for event[${event.type}]`);
			console.error(event);
		}
	}
}
