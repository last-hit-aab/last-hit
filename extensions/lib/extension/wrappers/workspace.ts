import { WorkspaceExtensions } from 'last-hit-types';
import { AbstractExtensionEntryPointWrapper, IExtensionEntryPointHelper } from '../../types';

export type EventHandler<E extends WorkspaceExtensions.WorkspaceEvent> = (event: E) => Promise<any>;

export class WorkspaceExtensionEntryPointWrapper extends AbstractExtensionEntryPointWrapper<
	WorkspaceExtensions.IWorkspaceExtensionEntryPoint
> {
	private handlers: {
		[key in WorkspaceExtensions.WorkspaceEventTypes]: EventHandler<
			WorkspaceExtensions.WorkspaceEvent
		>;
	};

	constructor(
		entrypoint: WorkspaceExtensions.IWorkspaceExtensionEntryPoint,
		helper: IExtensionEntryPointHelper
	) {
		super(entrypoint, helper);

		this.handlers = {
			'env-prepare': entrypoint.handleEnvironmentPrepare,
			'story-prepare': entrypoint.handleStoryPrepare,
			'flow-should-start': entrypoint.handleFlowShouldStart,
			'flow-accomplished': entrypoint.handleFlowAccomplished,
			'step-should-start': entrypoint.handleStepShouldStart,
			'step-on-error': entrypoint.handleStepOnError,
			'step-accomplished': entrypoint.handleStepAccomplished,
			'reload-all-handlers': entrypoint.handleReloadAllHandlers,
			'reload-story-handler': entrypoint.handleReloadStoryHandler,
			'reload-flow-handler': entrypoint.handleReloadFlowHandler,
			'reload-step-handler': entrypoint.handleReloadStepHandler
		};
	}
	async handle(event: WorkspaceExtensions.WorkspaceEvent): Promise<void> {
		const handler: EventHandler<WorkspaceExtensions.WorkspaceEvent> = this.handlers[event.type];
		if (handler) {
			const result = await handler.call(this.getEntrypoint(), event);
			this.getHelper().sendMessage(result);
		} else {
			console.error(`Handler not found for event[${event.type}]`);
			console.error(event);
		}
	}
}
