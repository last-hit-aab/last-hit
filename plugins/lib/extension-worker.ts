import { ChildProcess, fork } from 'child_process';
import Emitter from 'events';
import * as Consts from './extension/consts';
import { IExtensionPoint } from './types';
import * as objects from './utils/objects';
import * as platform from './utils/platform';

export const enum WorkerEvents {
	CHILD_PROCESS_EXITED = 'child-process-exited',
	LOG = 'log',
	ERROR_LOG = 'error-log',
	ERROR = 'error'
}
type GenericListener = (...args: any[]) => void;
export type ChildProcessExistListener = (code: number, signal: string, unexcepted: boolean) => void;
export type LogListener = (data: any) => void;
export type ErrorListener = (error: Error) => void;
export interface IExtensionWorker {
	once(event: WorkerEvents.CHILD_PROCESS_EXITED, listener: ChildProcessExistListener): this;
	on(event: WorkerEvents.LOG | WorkerEvents.ERROR_LOG, listener: LogListener): this;
	off(event: WorkerEvents.LOG | WorkerEvents.ERROR_LOG, listener: LogListener): this;
	on(event: WorkerEvents.ERROR, listener: ErrorListener): this;
	off(event: WorkerEvents.ERROR, listener: ErrorListener): this;
}

class ExtensionWorker implements IExtensionWorker {
	private emitter: Emitter = new Emitter();
	private terminating: boolean = false;
	private childProcess: ChildProcess | null = null;

	public async start(registryPort: number, extension: IExtensionPoint): Promise<void> {
		if (this.terminating) {
			// .terminate() was called
			return Promise.reject('Terminating...');
		}

		const opts = {
			env: objects.mixin(objects.deepClone(process.env), {
				// IMPORTANT relative path to "./extension/bootstrap"
				[Consts.ARG_ENTRY_POINT]: './index.js',
				[Consts.ARG_REGISTRY_PORT]: registryPort,
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
		this.childProcess = fork('lib/extension/bootstrap', ['--type=extension'], opts);

		// Lifecycle
		this.childProcess.on('error', this.onChildProcessError);
		this.childProcess.on('exit', this.onChildProcessExit);
		this.childProcess.stdout!.on('data', this.onChildProcessStdout);
		this.childProcess.stderr!.on('data', this.onChildProcessStderr);
	}
	private onChildProcessError = (error: Error): void => {
		this.getEmitter().emit(WorkerEvents.ERROR, error);
	};
	private onChildProcessExit = (code: number, signal: string): void => {
		if (this.terminating) {
			this.getEmitter().emit(WorkerEvents.CHILD_PROCESS_EXITED, code, signal, false);
		} else {
			this.getEmitter().emit(WorkerEvents.CHILD_PROCESS_EXITED, code, signal, true);
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
}

export default ExtensionWorker;
