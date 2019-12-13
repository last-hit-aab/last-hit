import { WorkspaceExtensions } from 'last-hit-types';
import {
	AbstractExtensionEntryPointWrapper,
	ExtensionEventTypes,
	IExtensionEntryPointHelper
} from '../../types';

export type EventHandler<E extends WorkspaceExtensions.WorkspaceEvent> = (
	event: E,
	helpers: {
		browser: BrowserHelper;
		test: TestHelper;
	}
) => Promise<any>;

class BrowserHelper implements WorkspaceExtensions.IWorkspaceExtensionBrowserHelper {
	private helper: IExtensionEntryPointHelper;

	constructor(helper: IExtensionEntryPointHelper) {
		this.helper = helper;
	}
	getHelper(): IExtensionEntryPointHelper {
		return this.helper;
	}
	isInIDE(): boolean {
		return this.getHelper().isInIDE();
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

class TestHelper implements WorkspaceExtensions.IWorkspaceExtensionTestHelper {
	private helper: IExtensionEntryPointHelper;

	constructor(helper: IExtensionEntryPointHelper) {
		this.helper = helper;
	}
	private getHelper(): IExtensionEntryPointHelper {
		return this.helper;
	}
	private readTitle(
		title: string = 'Untitled test',
		level: number = 0
	): { title: string; level: number } {
		if (title.startsWith('-') && level === 0) {
			const chars = title.split('');
			let stop = false;
			level = chars.reduce((count, char) => {
				if (char === '-' && !stop) {
					count++;
				} else {
					stop = true;
				}
				return count;
			}, 0);
			return { title: title.substr(level), level };
		} else {
			return { title, level };
		}
	}
	async test(title: string, fn: () => void | Promise<void>): Promise<this> {
		const { title: newTitle, level } = this.readTitle(title, 0);
		try {
			await fn.call(this);
			this.getHelper().sendTestLog(newTitle, true, level);
		} catch {
			this.getHelper().sendTestLog(newTitle, false, level);
		}
		return this;
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
	private testHelper: WorkspaceExtensions.IWorkspaceExtensionTestHelper;

	constructor(
		entrypoint: WorkspaceExtensions.IWorkspaceExtensionEntryPoint,
		helper: IExtensionEntryPointHelper
	) {
		super(entrypoint, helper);
		this.browserHelper = new BrowserHelper(helper);
		this.testHelper = new TestHelper(helper);

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
				const result = await handler.call(this.getEntrypoint(), event, {
					browser: this.browserHelper,
					test: this.testHelper
				});
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
