import {
	ExtensionDataTransmittedEvent,
	ExtensionErrorLogEvent,
	ExtensionEventTypes,
	ExtensionLogEvent,
	ExtensionPoint,
	ExtensionRegisteredEvent,
	ExtensionRegistry,
	ExtensionUnregisteredEvent,
	GenericEventHandler
} from 'last-hit-extensions';
import { Environment as Env, Flow, Step, WorkspaceExtensions } from 'last-hit-types';
import path from 'path';
import uuidv4 from 'uuid/v4';
import Environment from '../config/env';

const DEFAULT_EVENT_HANDLER_TIMEOUT = 3000;
const asStory = (storyName: string): WorkspaceExtensions.SimpleStory => {
	return {
		name: storyName,
		description: ''
	};
};

export class WorkspaceExtensionRegistry extends ExtensionRegistry {
	private workspaceExtensionId: string;
	private workspaceExtensionFolder: string;
	private env: Environment;

	constructor(options: { env: Environment }) {
		super();

		const { env } = options;
		this.workspaceExtensionId = uuidv4();
		this.workspaceExtensionFolder = path.join(env.getWorkspace(), '.scripts');
		this.env = env;
	}
	getWorkspaceExtensionId(): string {
		return this.workspaceExtensionId;
	}
	getWorkspaceExtensionFolder(): string {
		return this.workspaceExtensionFolder;
	}
	getEnvironment(): Environment {
		return this.env;
	}
	sendWorkspaceEvent<T extends WorkspaceExtensions.ReturnedData>(
		event: WorkspaceExtensions.WorkspaceEvent
	): Promise<{
		ignored: boolean;
		timeout?: true;
		error?: Error;
		data?: T;
	}> {
		return new Promise(resolve => {
			this.once(
				ExtensionEventTypes.DATA_TRANSMITTED,
				(evt: ExtensionDataTransmittedEvent): void => {
					const { data } = evt;
					if (data.ignore) {
						// ignore event, do nothing
						// console.log(`[${event.type}] is ignored by workspace extension scripts`);
						resolve({ ignored: true });
					} else if (data.error) {
						// error occurred
						// console.error(
						// 	`error occurred on [${event.type}] via workspace extension scripts, ignored`
						// );
						// console.error(data.error);
						resolve({ ignored: false, error: data.error });
					} else {
						// console.log(
						// 	`data returned on [${event.type}] from workspace extension scripts`,
						// 	data
						// );
						// merge
						resolve({ ignored: false, data: data as T });
					}
				},
				DEFAULT_EVENT_HANDLER_TIMEOUT,
				() => {
					console.log(
						`Timeout on [${event.type}] via workspace extension scripts, ignored`
					);
					resolve({ ignored: true, timeout: true });
				}
			);
			this.sendMessage(this.getWorkspaceExtensionId(), event);
		});
	}
	/**
	 * quick send step-should-start to extension,
	 * return data when success, otherwise return nothing(void)
	 */
	async quickSendWorkspaceEvent<T extends WorkspaceExtensions.ReturnedData>(
		eventType: WorkspaceExtensions.WorkspaceEventTypes,
		data: object
	): Promise<T | null> {
		const result = await this.sendWorkspaceEvent<T>({
			type: eventType,
			...data
		} as WorkspaceExtensions.StepShouldStartEvent);
		if (!result.ignored) {
			if (result.error) {
				// error thrown from extension
				throw result.error;
			} else {
				// everything is ok
				return result.data!;
			}
		} else {
			// extension returns ignored or extension timeout
			return null;
		}
	}
	/**
	 * send step-accomplished to extension, return data when success
	 */
	async stepAccomplished(
		storyName: string,
		flow: Flow,
		step: Step
	): Promise<WorkspaceExtensions.AccomplishedStep> {
		return (
			(await this.quickSendWorkspaceEvent('step-accomplished', {
				story: asStory(storyName),
				flow,
				step
			})) || { ...step, _: { passed: true } }
		);
	}
	/**
	 * send step-accomplished to extension, return data when success
	 */
	async stepOnError(
		storyName: string,
		flow: Flow,
		step: Step,
		error: Error
	): Promise<WorkspaceExtensions.FixedStep> {
		return (
			(await this.quickSendWorkspaceEvent('step-on-error', {
				story: asStory(storyName),
				flow,
				step,
				error: {
					name: error.name,
					message: error.message,
					stack: error.stack
				}
			})) || { ...step, _: { fixed: false } }
		);
	}
	/**
	 * send step-should-start to extension, return data when success
	 */
	async stepShouldStart(
		storyName: string,
		flow: Flow,
		step: Step
	): Promise<WorkspaceExtensions.PreparedStep> {
		return (
			(await this.quickSendWorkspaceEvent('step-should-start', {
				story: asStory(storyName),
				flow,
				step
			})) || step
		);
	}
	/**
	 * send flow-accomplished to extension, return data when success
	 */
	async flowAccomplished(
		storyName: string,
		flow: Flow
	): Promise<WorkspaceExtensions.AccomplishedFlow | null> {
		return await this.quickSendWorkspaceEvent('flow-accomplished', {
			story: asStory(storyName),
			flow
		});
	}
	/**
	 * send flow-should-start to extension, return data when success
	 */
	async flowShouldStart(
		storyName: string,
		flow: Flow
	): Promise<WorkspaceExtensions.PreparedFlow | null> {
		return await this.quickSendWorkspaceEvent('flow-should-start', {
			story: asStory(storyName),
			flow
		});
	}
	/**
	 * send story-prepare to extension, return data anyway
	 */
	async prepareStory(storyName: string): Promise<WorkspaceExtensions.PreparedStory> {
		const story = asStory(storyName);
		const data = await this.quickSendWorkspaceEvent<WorkspaceExtensions.PreparedStory>(
			'story-prepare',
			{
				story
			}
		);
		return data || story;
	}
	once(
		event: ExtensionEventTypes,
		handler: GenericEventHandler,
		timeout?: number,
		onTimeout?: () => void
	): this {
		let timeoutHanlder: number;
		super.once(event, (...args: Array<any>) => {
			if (timeoutHanlder) {
				clearTimeout(timeoutHanlder);
			}
			handler(...args);
		});
		if (onTimeout) {
			timeoutHanlder = setTimeout(() => {
				this.off(event, handler);
				onTimeout();
			}, timeout);
		}
		return this;
	}
	async launch(): Promise<void> {
		return new Promise(async (resolve, reject) => {
			const onRegistered = async (event: ExtensionRegisteredEvent) => {
				off();
				const { error } = event;
				if (error) {
					// register failed
					console.log('register failed', error);
					resolve();
				} else {
					// register successfully
					this.once(
						ExtensionEventTypes.DATA_TRANSMITTED,
						(event: ExtensionDataTransmittedEvent): void => {
							const { data } = event;
							if (data.ignore) {
								// ignore event, do nothing
								console.log(
									'environment prepare is ignored by workspace extension scripts'
								);
								resolve();
							} else if (data.error) {
								// error occurred
								console.error(
									'error occurred on environment prepare via workspace extension scripts, ignored'
								);
								console.error(data.error);
								resolve();
							} else {
								console.log(
									'data returned on environment prepare from workspace extension scripts',
									data
								);
								// merge
								this.getEnvironment().mergeFrom(data);
								resolve();
							}
						},
						DEFAULT_EVENT_HANDLER_TIMEOUT,
						() => {
							console.log(
								'Timeout on environment prepare via workspace extension scripts, ignored'
							);
							resolve();
						}
					);
					this.sendMessage(this.getWorkspaceExtensionId(), {
						type: 'env-prepare',
						env: this.getEnvironment().expose() as Env
					} as WorkspaceExtensions.EnvironmentPrepareEvent);
				}
			};
			const onUnregistered = (event: ExtensionUnregisteredEvent) => {
				off();
				resolve();
			};
			const onLog = (event: ExtensionLogEvent) => {
				console.log('log on extension register');
				console.log(event);
			};
			const onErrorLog = (event: ExtensionErrorLogEvent) => {
				console.error('error occurred on extension register');
				console.error(event);
			};
			this.once(ExtensionEventTypes.REGISTERED, onRegistered)
				.once(ExtensionEventTypes.UNREGISTERED, onUnregistered)
				.on(ExtensionEventTypes.LOG, onLog)
				.on(ExtensionEventTypes.ERROR_LOG, onErrorLog);

			const off = () => {
				this.off(ExtensionEventTypes.REGISTERED, onRegistered)
					.off(ExtensionEventTypes.UNREGISTERED, onUnregistered)
					.off(ExtensionEventTypes.LOG, onLog)
					.off(ExtensionEventTypes.ERROR_LOG, onErrorLog);
			};
			await this.startupExtension(
				new ExtensionPoint({
					id: this.getWorkspaceExtensionId(),
					name: 'temp-workspace-extension',
					description: '',
					folder: this.getWorkspaceExtensionFolder()
				})
			);
		});
	}
}
