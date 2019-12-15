import { Extensions, WorkspaceExtensions } from 'last-hit-types';
import path from 'path';
import decache from 'decache';

type HandlerType =
	| 'env-prepare'
	| 'story-prepare'
	| 'flow-should-start'
	| 'flow-accomplished'
	| 'step-should-start'
	| 'step-on-error'
	| 'step-accomplished';
type Handler = {
	modulePath: string;
	type: HandlerType;
	story?: string;
	flow?: string;
	stepUuid?: string;
	handle?: (
		event: WorkspaceExtensions.WorkspaceEvent,
		helpers: WorkspaceExtensions.HandlerTestHelper | WorkspaceExtensions.HandlerBrowserHelper
	) => Promise<any>;
};
type Handlers = { [key in string]: Handler };

const IgnoreHandler = (): Promise<any> => {
	return Promise.resolve({ ignore: true });
};

export abstract class AbstractWorkspaceExtensionEntryPoint
	implements WorkspaceExtensions.IWorkspaceExtensionEntryPoint {
	private handlers: Handlers = {};
	/**
	 * get handler location, is a folder.
	 * normally relative to entry point file
	 */
	abstract getHandlerLocation(): string;
	protected findHandler(key: string, type: HandlerType, relativePath: string): Handler {
		let handler = this.handlers[key];
		if (!handler) {
			const modulePath = path.join(this.getHandlerLocation(), relativePath);
			this.handlers[key] = { modulePath, type } as Handler;
			this.doReloadHandler(this.handlers[key]);
			handler = this.handlers[key];
			if (!handler.handle) {
				handler.handle = IgnoreHandler;
			}
		}
		return handler;
	}
	async handleEnvironmentPrepare(
		event: WorkspaceExtensions.EnvironmentPrepareEvent,
		helpers: WorkspaceExtensions.HandlerTestHelper
	): Promise<WorkspaceExtensions.PreparedEnvironment> {
		return await this.findHandler('env-prepare', 'env-prepare', 'env-prepare').handle!(
			event,
			helpers
		);
	}

	async handleStoryPrepare(
		event: WorkspaceExtensions.StoryPrepareEvent,
		helpers: WorkspaceExtensions.HandlerTestHelper
	): Promise<WorkspaceExtensions.PreparedStory> {
		return await this.findHandler(
			`story-prepare@${event.story.name}`,
			'story-prepare',
			`${event.story.name}/story-prepare`
		).handle!(event, helpers);
	}

	async handleFlowShouldStart(
		event: WorkspaceExtensions.FlowShouldStartEvent,
		helpers: WorkspaceExtensions.HandlerTestHelper
	): Promise<WorkspaceExtensions.PreparedFlow> {
		return await this.findHandler(
			`flow-should-start@${event.flow.name}@${event.story.name}`,
			'flow-should-start',
			`${event.story.name}/${event.flow.name}/flow-should-start`
		).handle!(event, helpers);
	}
	async handleFlowAccomplished(
		event: WorkspaceExtensions.FlowAccomplishedEvent,
		helpers: WorkspaceExtensions.HandlerHelpers
	): Promise<WorkspaceExtensions.AccomplishedFlow> {
		return await this.findHandler(
			`flow-accomplished@${event.flow.name}@${event.story.name}`,
			'flow-accomplished',
			`${event.story.name}/${event.flow.name}/flow-accomplished`
		).handle!(event, helpers);
	}
	
	async handleStepShouldStart(
		event: WorkspaceExtensions.StepShouldStartEvent,
		helpers: WorkspaceExtensions.HandlerHelpers
	): Promise<WorkspaceExtensions.PreparedStep> {
		return await this.findHandler(
			`step-should-start@${event.step.stepUuid}@${event.flow.name}@${event.story.name}`,
			'step-should-start',
			`${event.story.name}/${event.flow.name}/${event.step.stepUuid}/step-should-start`
		).handle!(event, helpers);
	}
	async handleStepOnError(
		event: WorkspaceExtensions.StepOnErrorEvent,
		helpers: WorkspaceExtensions.HandlerHelpers
	): Promise<WorkspaceExtensions.FixedStep> {
		return await this.findHandler(
			`step-on-error@${event.step.stepUuid}@${event.flow.name}@${event.story.name}`,
			'step-on-error',
			`${event.story.name}/${event.flow.name}/${event.step.stepUuid}/step-on-error`
		).handle!(event, helpers);
	}
	async handleStepAccomplished(
		event: WorkspaceExtensions.StepAccomplishedEvent,
		helpers: WorkspaceExtensions.HandlerHelpers
	): Promise<WorkspaceExtensions.AccomplishedStep> {
		return await this.findHandler(
			`step-accomplished@${event.step.stepUuid}@${event.flow.name}@${event.story.name}`,
			'step-accomplished',
			`${event.story.name}/${event.flow.name}/${event.step.stepUuid}/step-accomplished`
		).handle!(event, helpers);
	}

	handleReloadAllHandlers(event: WorkspaceExtensions.ReloadAllHandlersEvent): Promise<void> {
		Object.values(this.handlers).forEach(handler => {
			this.doReloadHandler(handler);
		});
		return Promise.resolve();
	}
	handleReloadStoryHandler(event: WorkspaceExtensions.ReloadStoryHandlerEvent): Promise<void> {
		Object.values(this.handlers)
			.filter(handler => {
				return handler.story === event.story.name;
			})
			.forEach(handler => {
				this.doReloadHandler(handler);
			});
		return Promise.resolve();
	}
	handleReloadFlowHandler(event: WorkspaceExtensions.ReloadFlowHandlerEvent): Promise<void> {
		Object.values(this.handlers)
			.filter(handler => {
				return handler.story === event.story.name && handler.flow === event.flow.name;
			})
			.forEach(handler => {
				this.doReloadHandler(handler);
			});
		return Promise.resolve();
	}
	handleReloadStepHandler(event: WorkspaceExtensions.ReloadStepHandlerEvent): Promise<void> {
		Object.values(this.handlers)
			.filter(handler => {
				return (
					handler.story === event.story.name &&
					handler.flow === event.flow.name &&
					handler.stepUuid === event.step.stepUuid
				);
			})
			.forEach(handler => {
				this.doReloadHandler(handler);
			});
		return Promise.resolve();
	}
	protected doReloadHandler(handler: Handler) {
		try {
			decache(handler.modulePath);
			const scripts = require(handler.modulePath);
			if (scripts && scripts.default) {
				handler.handle = scripts.default;
			} else {
				handler.handle = scripts;
			}
		} catch (e) {
			delete handler.handle;
			if (e.stack && e.stack.indexOf("'MODULE_NOT_FOUND'")) {
				// module not found, ignored
			} else {
				console.error(`failed to reload handler[${handler.modulePath}]`, e);
			}
		}
	}
	activate(): Promise<void> {
		if (this.getHandlerLocation()) {
			return Promise.resolve();
		} else {
			return Promise.reject(new Error('Handler location not defined.'));
		}
	}
	getType(): Extensions.ExtensionTypes {
		return 'workspace';
	}
}
