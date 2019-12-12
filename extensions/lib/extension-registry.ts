import Emitter from 'events';
import ExtensionWorker, { WorkerEvents } from './extension-worker';
import {
	ExtensionDataTransmittedEvent,
	ExtensionErrorEvent,
	ExtensionErrorLogEvent,
	ExtensionEventTypes,
	ExtensionLogEvent,
	ExtensionPointId,
	ExtensionUnregisteredEvent,
	IExtensionPoint,
	IExtensionRegistry,
	ExtensionRegisteredEvent,
	ExtensionBrowserOperationEvent
} from './types';

export type GenericEventHandler = (...args: any[]) => void;
type RegisteredExtension = {
	definition: IExtensionPoint;
	worker: ExtensionWorker;
	started: boolean;
};
class ExtensionRegistry implements IExtensionRegistry {
	private emitter: Emitter = new Emitter();
	private extensions: Array<RegisteredExtension> = [];

	constructor() {
		process
			.once('exit', () => this.shutdownAllExtensions())
			.once('SIGINT', () => this.shutdownAllExtensions());
		// .once('SIGTERM', () => this.shutdownAllExtensions());
	}
	protected getEmitter(): Emitter {
		return this.emitter;
	}
	findExtensionById(extensionId: ExtensionPointId): RegisteredExtension | undefined {
		return this.extensions.find(extension => extension.definition.getId() === extensionId);
	}
	isExtensionStarted(extensionId: ExtensionPointId): boolean {
		const extension = this.extensions.find(
			extension => extension.definition.getId() === extensionId
		);
		if (!extension) {
			// not found, not started
			return false;
		} else {
			return !!extension.started;
		}
	}
	async startup(extensionPoints: Array<IExtensionPoint>): Promise<void> {
		// build registered extensions
		this.extensions = extensionPoints.map(extensionPoint => {
			return {
				definition: extensionPoint,
				worker: new ExtensionWorker(),
				started: false
			} as RegisteredExtension;
		});

		// listen all child processes
		// console.log(`main process pid[${process.pid}]`);
		await Promise.all(this.extensions.map(this.doStartupExtension));
	}
	async startupExtension(extensionPoint: IExtensionPoint): Promise<void> {
		let extension: RegisteredExtension | undefined = this.findExtensionById(
			extensionPoint.getId()
		);
		if (!extension) {
			extension = {
				definition: extensionPoint,
				worker: new ExtensionWorker(),
				started: false
			} as RegisteredExtension;
			this.extensions.push(extension);
		}
		if (!extension.started) {
			return await this.doStartupExtension(extension);
		} else {
			return Promise.resolve();
		}
	}
	private doStartupExtension = async (extension: RegisteredExtension): Promise<void> => {
		const { definition, worker } = extension;
		const extensionId = definition.getId();
		worker
			.on(WorkerEvents.REGISTERED, (error?: Error) => {
				const extension = this.extensions.find(
					extension => extension.definition.getId() === extensionId
				);
				if (!extension) {
					console.error(
						`Unknown extension[id=${extensionId}] register request received, ignored.`
					);
				} else if (error) {
					// failed to activate extension, shutdown worker
					console.error('registered on error', error);
					extension.worker.terminate();
					extension.started = false;
					this.getEmitter().emit(ExtensionEventTypes.REGISTERED, {
						type: ExtensionEventTypes.REGISTERED,
						extensionId,
						error
					} as ExtensionRegisteredEvent);
				} else {
					extension.started = true;
					this.getEmitter().emit(ExtensionEventTypes.REGISTERED, {
						type: ExtensionEventTypes.REGISTERED,
						extensionId
					} as ExtensionRegisteredEvent);
				}
			})
			.on(WorkerEvents.EXITED, (code: number, signal: string, expected: boolean): void => {
				console.log(
					`Extension[id=${extensionId}, name=${definition.getName()}] terminated[code=${code}, signal=${signal}].`
				);
				extension.started = false;
				this.getEmitter().emit(ExtensionEventTypes.UNREGISTERED, {
					type: ExtensionEventTypes.UNREGISTERED,
					extensionId
				} as ExtensionUnregisteredEvent);
			})
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
			})
			.on(WorkerEvents.DATA, (data: any): void => {
				this.getEmitter().emit(ExtensionEventTypes.DATA_TRANSMITTED, {
					type: ExtensionEventTypes.DATA_TRANSMITTED,
					extensionId,
					data
				} as ExtensionDataTransmittedEvent);
			})
			.on(WorkerEvents.BROWSER, (data: any): void => {
				this.getEmitter().emit(ExtensionEventTypes.BROWSER_OPERATION, {
					type: ExtensionEventTypes.BROWSER_OPERATION,
					extensionId,
					data
				} as ExtensionBrowserOperationEvent);
			});
		await worker.start(definition);
		console.log(`Extension[${extensionId}] started successfully by worker.`);
	};

	shutdownExtension(extensionId: ExtensionPointId): void {
		const extension = this.findExtensionById(extensionId);
		if (extension) {
			extension.worker.terminate();
			extension.started = false;
		}
	}
	shutdownAllExtensions(): void {
		this.extensions.forEach(extension => {
			extension.worker.terminate();
			extension.started = false;
		});
	}
	destroy(): void {
		this.shutdownAllExtensions();
	}
	once(event: ExtensionEventTypes, handler: GenericEventHandler): this {
		this.getEmitter().once(event, handler);
		return this;
	}
	on(event: ExtensionEventTypes, handler: GenericEventHandler): this {
		this.getEmitter().on(event, handler);
		return this;
	}
	off(event: ExtensionEventTypes, handler: GenericEventHandler): this {
		this.getEmitter().off(event, handler);
		return this;
	}
	sendMessage(extensionId: ExtensionPointId, data: any): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			const extension = this.findExtensionById(extensionId);
			if (extension) {
				const worker = extension.worker;
				if (worker) {
					worker
						.sendMessage(extensionId, data)
						.then(() => resolve())
						.catch((e: Error) => reject(e));
				}
			} else {
				reject(new Error(`Worker not found of extension[${extensionId}].`));
			}
		});
	}
	sendBrowserOperation(extensionId: ExtensionPointId, value: any): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			const extension = this.findExtensionById(extensionId);
			if (extension) {
				const worker = extension.worker;
				if (worker) {
					worker
						.sendBrowserOperation(extensionId, value)
						.then(() => resolve())
						.catch((e: Error) => reject(e));
				}
			} else {
				reject(new Error(`Worker not found of extension[${extensionId}].`));
			}
		});
	}
}

export default ExtensionRegistry;
