import { WorkspaceExtensions } from 'last-hit-types';
import {
	AbstractExtensionEntryPointWrapper,
	IExtensionEntryPointHelper,
	ExtensionEventTypes
} from '../../types';

export type EventHandler<E extends WorkspaceExtensions.WorkspaceEvent> =
	| ((event: E) => Promise<any>)
	| ((
			event: E,
			browserHelper: WorkspaceExtensions.IWorkspaceExtensionBrowserHelper
	  ) => Promise<any>);

class BrowserHelper implements WorkspaceExtensions.IWorkspaceExtensionBrowserHelper {
	private helper: IExtensionEntryPointHelper;
	constructor(helper: IExtensionEntryPointHelper) {
		this.helper = helper;
	}
	getHelper(): IExtensionEntryPointHelper {
		return this.helper;
	}
	getElementAttrValue(
		csspath: string,
		attrName: string,
		pageUuid?: string
	): Promise<string | null> {
		return new Promise((resolve, reject) => {
			let timeout;
			const onValue = (value: string | null) => {
				if (timeout) {
					clearTimeout(timeout);
				}
				resolve(value);
			};
			this.helper.once(ExtensionEventTypes.BROWSER_OPERATION, onValue);
			this.helper.sendBrowserOperation({
				type: 'get-element-attr-value',
				csspath,
				attrName,
				pageUuid
			});
			timeout = setTimeout(() => {
				this.helper.off(ExtensionEventTypes.BROWSER_OPERATION, onValue);
				reject(new Error('Timeout'));
			}, 5000);
		});
	}
	getElementPropValue(
		csspath: string,
		propName: string,
		pageUuid?: string
	): Promise<string | null> {
		return new Promise((resolve, reject) => {
			let timeout;
			const onValue = (value: string | null) => {
				if (timeout) {
					clearTimeout(timeout);
				}
				resolve(value);
			};
			this.helper.once(ExtensionEventTypes.BROWSER_OPERATION, onValue);
			this.helper.sendBrowserOperation({
				type: 'get-element-prop-value',
				csspath,
				propName,
				pageUuid
			});
			timeout = setTimeout(() => {
				this.helper.off(ExtensionEventTypes.BROWSER_OPERATION, onValue);
				reject(new Error('Timeout'));
			}, 5000);
		});
	}
}

export class WorkspaceExtensionEntryPointWrapper extends AbstractExtensionEntryPointWrapper<
	WorkspaceExtensions.IWorkspaceExtensionEntryPoint
> {
	private handlers: {
		[key in WorkspaceExtensions.WorkspaceEventTypes]: EventHandler<
			WorkspaceExtensions.WorkspaceEvent
		>;
	};
	private browserHelper: WorkspaceExtensions.IWorkspaceExtensionBrowserHelper;

	constructor(
		entrypoint: WorkspaceExtensions.IWorkspaceExtensionEntryPoint,
		helper: IExtensionEntryPointHelper
	) {
		super(entrypoint, helper);
		this.browserHelper = new BrowserHelper(helper);

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
			try {
				const result = await handler.call(this.getEntrypoint(), event, this.browserHelper);
				return this.getHelper().sendMessage(result);
			} catch (e) {
				return this.getHelper().sendError(e);
			}
		} else {
			// console.error(`Handler not found for event[${event.type}]`);
			// console.error(event);
			return this.getHelper().sendIgnore();
		}
	}
}
