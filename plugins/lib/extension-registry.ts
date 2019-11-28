import Emitter from 'events';
import * as rpc from 'vscode-jsonrpc';
import { createClientSocketTransport, RPC, RPCHelper } from './extension-rpc';
import ExtensionWorker, { WorkerEvents } from './extension-worker';
import {
	ExtensionDataTransmittedEvent,
	ExtensionEventTypes,
	ExtensionPointId,
	ExtensionRegisteredEvent,
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

		const helper: RPCHelper = await createClientSocketTransport();
		const { reader, writer, port }: RPC = await helper.onConnected();
		const connection = rpc.createMessageConnection(reader, writer);
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
		this.port = port;

		await Promise.all(
			this.extensions.map(
				async (extension): Promise<void> => {
					const { definition, worker } = extension;
					const extensionId = definition.getId();
					worker.on(
						WorkerEvents.CHILD_PROCESS_EXITED,
						(code: number, signal: string, expected: boolean): void => {
							console.log(
								`Extension[id=${extensionId}, name=${definition.getName()}] on port[${
									extension.port
								}] terminated[code=${code}, signal=${signal}].`
							);
						}
					);
					await worker.start(this.port, definition);
				}
			)
		);

		this.started = true;
	}
	shutdown(extensionId: ExtensionPointId): void {
		const extension = this.findExtensionById(extensionId);
		if (extension) {
			extension.worker.terminate();
			extension.started = false;
			extension.port = 0;
		}
	}
	shutdownAll(): void {
		this.started = false;
		this.extensions.forEach(extension => {
			extension.worker.terminate();
			extension.started = false;
			extension.port = null;
		});
		this.extensions.length = 0;
		this.connection && this.connection.dispose();
	}
	on(event: ExtensionEventTypes, handler: GenericHandler): this {
		this.getEmitter().on(event, handler);
		return this;
	}
	off(event: ExtensionEventTypes, handler: GenericHandler): this {
		this.getEmitter().off(event, handler);
		return this;
	}
}

export default ExtensionRegistry;
