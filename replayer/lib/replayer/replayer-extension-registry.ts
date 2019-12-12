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
import { Environment as Env, WorkspaceExtensions } from 'last-hit-types';
import path from 'path';
import uuidv4 from 'uuid/v4';
import Environment from '../config/env';

const DEFAULT_EVENT_HANDLER_TIMEOUT = 5000;

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
	once(
		event: ExtensionEventTypes,
		handler: GenericEventHandler,
		timeout?: number,
		onTimeout?: () => void
	): this {
		super.once(event, handler);
		if (onTimeout) {
			setTimeout(() => {
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
									'environment returned from workspace extension scripts',
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
