import Emitter from 'events';
import * as rpc from 'vscode-jsonrpc';
import {
	createClientSocketTransport,
	createServerSocketTransport,
	RPCHelper
} from './extension-rpc';
import ExtensionWorker, { WorkerEvents } from './extension-worker';
import {
	ExtensionDataTransmittedEvent,
	ExtensionErrorEvent,
	ExtensionErrorLogEvent,
	ExtensionEventTypes,
	ExtensionLogEvent,
	ExtensionPointId,
	ExtensionRegisteredEvent,
	ExtensionUnregisteredEvent,
	IExtensionPoint,
	IExtensionRegistry
} from './types';

type GenericHandler = (...args: any[]) => void;
type RegisteredExtension = {
	definition: IExtensionPoint;
	worker: ExtensionWorker;
	started: boolean;
	port: number | null;
};
class ExtensionRegistry implements IExtensionRegistry {
	private emitter: Emitter = new Emitter();
	private port: number | null = null;
	private started: boolean = false;
	private connection: rpc.MessageConnection | null = null;
	private extensions: Array<RegisteredExtension> = [];

	constructor() {
		process.once('exit', () => this.shutdownAllExtensions());
		process.once('SIGINT', () => this.shutdownAllExtensions());
	}
	private getEmitter(): Emitter {
		return this.emitter;
	}
	getPort(): number | null {
		return this.port;
	}
	isStarted() {
		return this.started;
	}
	findExtensionById(extensionId: ExtensionPointId): RegisteredExtension | undefined {
		return this.extensions.find(extension => extension.definition.getId() === extensionId);
	}
	async startup(extensions: Array<IExtensionPoint>): Promise<void> {
		// build registered extensions
		this.extensions = extensions.map(extensionPoint => {
			return {
				definition: extensionPoint,
				worker: new ExtensionWorker(),
				started: false,
				port: null
			} as RegisteredExtension;
		});

		try {
			const helper: RPCHelper = await createClientSocketTransport();
			this.port = await helper.onPortOccuried();
			helper.onConnected().then(({ reader, writer }) => {
				const connection: rpc.MessageConnection = rpc.createMessageConnection(
					reader,
					writer
				);
				// listen start signal
				connection.onRequest(
					ExtensionEventTypes.REGISTERED,
					(event: ExtensionRegisteredEvent): void => {
						const { extensionId, port, error } = event;
						const extension = this.extensions.find(
							extension => extension.definition.getId() === extensionId
						);
						if (!extension) {
							console.error(
								`Unknown extension[id=${extensionId}, port=${port}] register request received, ignored.`
							);
						} else if (error) {
							// failed to activate extension, shutdown worker
							console.error(error);
							extension.worker.terminate();
						} else {
							extension.port = port;
							extension.started = true;
							this.getEmitter().emit(ExtensionEventTypes.REGISTERED, {
								type: ExtensionEventTypes.REGISTERED,
								port,
								extensionId
							} as ExtensionRegisteredEvent);
						}
					}
				);
				// listen data
				connection.onRequest(
					ExtensionEventTypes.DATA_TRANSMITTED,
					(event: ExtensionDataTransmittedEvent): void => {
						const { data, extensionId } = event;
						this.getEmitter().emit(ExtensionEventTypes.DATA_TRANSMITTED, {
							type: ExtensionEventTypes.DATA_TRANSMITTED,
							extensionId,
							data
						} as ExtensionDataTransmittedEvent);
					}
				);
				// start listen
				connection.listen();
			});
		} catch (e) {
			return Promise.reject(e);
		}

		await Promise.all(
			this.extensions.map(
				async (extension): Promise<void> => {
					const { definition, worker } = extension;
					const extensionId = definition.getId();
					worker
						.on(
							WorkerEvents.CHILD_PROCESS_EXITED,
							(code: number, signal: string, expected: boolean): void => {
								console.log(
									`Extension[id=${extensionId}, name=${definition.getName()}] on port[${
										extension.port
									}] terminated[code=${code}, signal=${signal}].`
								);
								this.getEmitter().emit(ExtensionEventTypes.UNREGISTERED, {
									type: ExtensionEventTypes.UNREGISTERED,
									extensionId
								} as ExtensionUnregisteredEvent);
							}
						)
						.on(WorkerEvents.LOG, (data: any): void => {
							this.getEmitter().emit(ExtensionEventTypes.LOG, {
								type: ExtensionEventTypes.LOG,
								extensionId,
								data
							} as ExtensionLogEvent);
						})
						.on(WorkerEvents.ERROR_LOG, (data: any): void => {
							this.getEmitter().emit(ExtensionEventTypes.ERROR_LOG, {
								type: ExtensionEventTypes.ERROR_LOG,
								extensionId,
								data
							} as ExtensionErrorLogEvent);
						})
						.on(WorkerEvents.ERROR, (error: Error): void => {
							this.getEmitter().emit(ExtensionEventTypes.ERROR, {
								type: ExtensionEventTypes.ERROR,
								extensionId,
								error
							} as ExtensionErrorEvent);
						});
					await worker.start(this.port, definition);
					console.log(`Extension[${extensionId}] started successfully by worker.`);
				}
			)
		);

		this.started = true;
	}
	shutdownExtension(extensionId: ExtensionPointId): void {
		const extension = this.findExtensionById(extensionId);
		if (extension) {
			extension.worker.terminate();
			extension.started = false;
			extension.port = 0;
		}
	}
	shutdownAllExtensions(): void {
		this.extensions.forEach(extension => {
			extension.worker.terminate();
			extension.started = false;
			extension.port = null;
		});
	}
	destroy(): void {
		this.shutdownAllExtensions();
		this.started = false;
		this.connection && this.connection.dispose();
	}
	once(event: ExtensionEventTypes, handler: GenericHandler): this {
		this.getEmitter().once(event, handler);
		return this;
	}
	on(event: ExtensionEventTypes, handler: GenericHandler): this {
		this.getEmitter().on(event, handler);
		return this;
	}
	off(event: ExtensionEventTypes, handler: GenericHandler): this {
		this.getEmitter().off(event, handler);
		return this;
	}
	publishMessage(extensionId: ExtensionPointId, data: any): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			const extension = this.extensions.find(
				extension => extension.definition.getId() === extensionId
			);

			const { reader, writer } = createServerSocketTransport(extension.port);
			const connection = rpc.createMessageConnection(reader, writer);
			connection.onError(e => {
				console.error(e);
				reject(e);
			});
			connection.listen();

			connection
				.sendRequest<void>(ExtensionEventTypes.DATA_TRANSMITTED, {
					type: ExtensionEventTypes.DATA_TRANSMITTED,
					extensionId,
					data
				})
				.then(
					() => {
						connection.dispose();
						resolve();
					},
					e => {
						connection.dispose();
						reject(e);
					}
				);
		});
	}
}

export default ExtensionRegistry;
