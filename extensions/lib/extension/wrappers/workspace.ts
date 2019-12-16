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

class TestNode {
	private title: string;
	private message?: string;
	private passed: boolean = false;
	private level: number = -1;
	private children: Array<TestNode> = [];
	private parent: TestNode | null = null;
	constructor(title: string, passed: boolean, parent?: TestNode) {
		this.title = title;
		this.passed = passed;
		if (parent) {
			this.parent = parent;
			this.parent.children.push(this);
			this.level = parent.level + 1;
		}
	}
	getTitle(): string {
		return this.title;
	}
	getMessage(): string {
		return this.message || '';
	}
	setMessage(message: string) {
		this.message = message;
	}
	getLevel(): number {
		return this.level;
	}
	isPassed(): boolean {
		return this.passed;
	}
	setPassed(passed: boolean): void {
		this.passed = passed;
	}
	getChildren(): Array<TestNode> {
		return this.children;
	}
	getParent(): TestNode | null {
		return this.parent;
	}
}
class TestHelper implements WorkspaceExtensions.IWorkspaceExtensionTestHelper {
	private helper: IExtensionEntryPointHelper;
	private rootTestNode = new TestNode('root', true);
	private currentTestNode: TestNode = this.rootTestNode;

	constructor(helper: IExtensionEntryPointHelper) {
		this.helper = helper;
	}
	private getHelper(): IExtensionEntryPointHelper {
		return this.helper;
	}
	private async sendTestLog(node: TestNode, sendAnyway: boolean = false): Promise<void> {
		if (node.getLevel() === 0 || sendAnyway) {
			await this.getHelper().sendTestLog(node.getTitle(), node.isPassed(), node.getLevel(), node.getMessage());
			await Promise.all(
				(node.getChildren() || []).map(async child => await this.sendTestLog(child, true))
			);
		}
	}
	async test(title: string, fn: () => void | Promise<void>): Promise<this> {
		const node = new TestNode(title, false, this.currentTestNode);
		try {
			this.currentTestNode = node;
			await fn.call(this);
			node.setPassed(true);
			await this.sendTestLog(node);
			this.currentTestNode = node.getParent();
		} catch (e) {
			node.setPassed(false);
			node.setMessage(e.message);
			await this.sendTestLog(node);
			this.currentTestNode = node.getParent();
			throw e;
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
