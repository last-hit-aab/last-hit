import { ChildProcess, fork } from 'child_process';
import Emitter from 'events';
import net from 'net';
import * as Consts from './extension/consts';
import {
	IExtensionPoint,
	ExtensionEvent,
	ExtensionEventTypes,
	ExtensionDataTransmittedEvent,
	ExtensionRegisteredEvent,
	ExtensionPointId,
	ExtensionDataTransmittedIgnoreEvent
} from './types';
import * as objects from './utils/objects';
import * as platform from './utils/platform';

export const enum WorkerEvents {
	EXITED = 'exited',
	REGISTERED = 'registered',
	LOG = 'log',
	ERROR_LOG = 'error-log',
	ERROR = 'error',
	DATA = 'data'
}
type GenericListener = (...args: any[]) => void;
export type ChildProcessRegisteredListener = (error?: Error) => void;
export type ChildProcessExistListener = (code: number, signal: string, unexcepted: boolean) => void;
export type LogListener = (data: any) => void;
export type ErrorListener = (error: Error) => void;
export type DataListener = (data: any) => void;
export interface IExtensionWorker {
	once(event: WorkerEvents.REGISTERED, listener: ChildProcessRegisteredListener): this;
	once(event: WorkerEvents.EXITED, listener: ChildProcessExistListener): this;
	on(event: WorkerEvents.LOG | WorkerEvents.ERROR_LOG, listener: LogListener): this;
	off(event: WorkerEvents.LOG | WorkerEvents.ERROR_LOG, listener: LogListener): this;
	on(event: WorkerEvents.ERROR, listener: ErrorListener): this;
	off(event: WorkerEvents.ERROR, listener: ErrorListener): this;
	on(event: WorkerEvents.DATA, listener: DataListener): this;
	off(event: WorkerEvents.DATA, listener: DataListener): this;
}

class ExtensionWorker implements IExtensionWorker {
	private emitter: Emitter = new Emitter();
	private terminating: boolean = false;
	private childProcess: ChildProcess | null = null;

	public async start(extension: IExtensionPoint): Promise<void> {
		if (this.terminating) {
			// .terminate() was called
			return Promise.reject('Terminating...');
		}

		const opts = {
			env: objects.mixin(objects.deepClone(process.env), {
				// IMPORTANT relative path to "./extension/bootstrap"
				[Consts.ARG_ENTRY_POINT]: './index.js',
				[Consts.ARG_PACKAGE_FOLDER]: extension.getFolder(),
				[Consts.ARG_HANDLES_UNCAUGHT_ERRORS]: true,
				[Consts.ARG_EXTENSION_ID]: extension.getId()
			}),
			// We only detach the extension host on windows. Linux and Mac orphan by default
			// and detach under Linux and Mac create another process group.
			// We detach because we have noticed that when the renderer exits, its child processes
			// (i.e. extension host) are taken down in a brutal fashion by the OS
			detached: !!platform.isWindows,
			execArgv: undefined as string[] | undefined,
			silent: true
		};

		// IMPORTANT relative path to me
		this.childProcess = fork(`${__dirname}/extension/bootstrap`, ['--type=extension'], opts);

		// Lifecycle
		this.childProcess.on('error', this.onChildProcessError);
		this.childProcess.on('exit', this.onChildProcessExit);
		this.childProcess.on('message', this.onChildProcessMessageReceived);
		this.childProcess.stdout!.on('data', this.onChildProcessStdout);
		this.childProcess.stderr!.on('data', this.onChildProcessStderr);
	}
	private onChildProcessError = (error: Error): void => {
		this.getEmitter().emit(WorkerEvents.ERROR, {
			name: error.name,
			message: error.message,
			stack: error.stack
		} as Error);
	};
	private onChildProcessExit = (code: number, signal: string): void => {
		if (this.terminating) {
			this.getEmitter().emit(WorkerEvents.EXITED, code, signal, false);
		} else {
			this.getEmitter().emit(WorkerEvents.EXITED, code, signal, true);
		}
	};
	private onChildProcessMessageReceived = (
		message: any,
		sendHandle: net.Socket | net.Server
	): void => {
		if (!message) {
			console.log('Empty message received, ignore.');
			return;
		}
		const data = message as ExtensionEvent;
		switch (true) {
			case data.extensionId && data.type === ExtensionEventTypes.DATA_TRANSMITTED:
				this.emitter.emit(WorkerEvents.DATA, (data as ExtensionDataTransmittedEvent).data);
				break;
			case data.extensionId && data.type === ExtensionEventTypes.REGISTERED:
				const event = data as ExtensionRegisteredEvent;
				this.emitter.emit(WorkerEvents.REGISTERED, event.error);
				break;
			default:
				console.error('Neither extension id nor type declared via message, ignore.');
				console.error(data);
		}
	};
	private onChildProcessStdout = (data: any): void => {
		this.getEmitter().emit(WorkerEvents.LOG, this.asString(data));
	};
	private onChildProcessStderr = (data: any): void => {
		this.getEmitter().emit(WorkerEvents.ERROR_LOG, this.asString(data));
	};
	private asString(data: any) {
		if (data) {
			if (data.toString) {
				data = data.toString();
			}
			if (typeof data === 'string' && data.endsWith('\n')) {
				data = data.substr(0, data.length - 1);
			}
		}
		return data;
	}

	private getEmitter() {
		return this.emitter;
	}
	public terminate(): void {
		if (this.terminating) {
			return;
		}
		this.terminating = true;
		this.clean();
	}
	private clean(): void {
		this.emitter.removeAllListeners();
		if (this.childProcess) {
			this.childProcess.kill();
			this.childProcess = null;
		}
	}
	once(event: WorkerEvents, listener?: GenericListener): this {
		this.emitter.once(event, listener!);
		return this;
	}
	on(event: WorkerEvents, listener?: GenericListener): this {
		this.emitter.on(event, listener!);
		return this;
	}
	off(event: WorkerEvents, listener?: GenericListener): this {
		this.emitter.off(event, listener!);
		return this;
	}
	sendMessage(extensionId: ExtensionPointId, data: any): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.childProcess) {
				this.childProcess.send(
					{
						extensionId,
						type: ExtensionEventTypes.DATA_TRANSMITTED,
						data
					} as ExtensionDataTransmittedEvent,
					undefined,
					undefined,
					(error: Error | null) => {
						if (error) {
							reject(error);
						} else {
							resolve();
						}
					}
				);
			} else {
				resolve();
				this.getEmitter().emit(WorkerEvents.DATA, {
					type: ExtensionEventTypes.DATA_TRANSMITTED,
					extensionId,
					data: { ignore: true }
				} as ExtensionDataTransmittedIgnoreEvent);
			}
		});
	}
}

export default ExtensionWorker;
