export enum ExtensionTypes {
	WORKSPACE = 'workspace'
}

export type ExtensionPointId = string;
export interface IExtensionPoint {
	getId(): ExtensionPointId;
	getName(): string;
	getDescription(): string;
	getFolder(): string;
}

export enum ExtensionEventTypes {
	REGISTERED = 'registered',
	UNREGISTERED = 'unregitered',
	DATA_TRANSMITTED = 'data-transmitted',
	LOG = 'log',
	ERROR_LOG = 'error-log',
	ERROR = 'error'
}

export interface ExtensionEvent {
	type: ExtensionEventTypes;
	extensionId: ExtensionPointId;
}
export interface ExtensionRegisteredEvent extends ExtensionEvent {
	type: ExtensionEventTypes.REGISTERED;
	error?: any;
}
export type ExtensionRegisteredHandler = (event: ExtensionRegisteredEvent) => void;

export interface ExtensionUnregisteredEvent extends ExtensionEvent {
	type: ExtensionEventTypes.UNREGISTERED;
}
export type ExtensionUnregisteredHandler = (event: ExtensionUnregisteredEvent) => void;

export interface ExtensionDataTransmittedEvent extends ExtensionEvent {
	type: ExtensionEventTypes.DATA_TRANSMITTED;
	data: any;
}
export type ExtensionDataTransmittedHandler = (event: ExtensionDataTransmittedEvent) => void;

export interface ExtensionLogEvent extends ExtensionEvent {
	type: ExtensionEventTypes.LOG;
	data: any;
}
export type ExtensionLogHandler = (event: ExtensionLogEvent) => void;

export interface ExtensionErrorLogEvent extends ExtensionEvent {
	type: ExtensionEventTypes.ERROR_LOG;
	data: any;
}
export type ExtensionErrorLogHandler = (event: ExtensionErrorLogEvent) => void;

export interface ExtensionErrorEvent extends ExtensionEvent {
	type: ExtensionEventTypes.ERROR;
	error: Error;
}
export type ExtensionErrorHandler = (event: ExtensionErrorEvent) => void;

export interface IExtensionRegistry {
	once(event: ExtensionEventTypes.REGISTERED, handler: ExtensionRegisteredHandler): this;
	on(event: ExtensionEventTypes.REGISTERED, handler: ExtensionRegisteredHandler): this;
	off(event: ExtensionEventTypes.REGISTERED, handler: ExtensionRegisteredHandler): this;

	once(event: ExtensionEventTypes.UNREGISTERED, handler: ExtensionUnregisteredHandler): this;
	on(event: ExtensionEventTypes.UNREGISTERED, handler: ExtensionUnregisteredHandler): this;
	off(event: ExtensionEventTypes.UNREGISTERED, handler: ExtensionUnregisteredHandler): this;

	once(
		event: ExtensionEventTypes.DATA_TRANSMITTED,
		handler: ExtensionDataTransmittedHandler
	): this;
	on(event: ExtensionEventTypes.DATA_TRANSMITTED, handler: ExtensionDataTransmittedHandler): this;
	off(
		event: ExtensionEventTypes.DATA_TRANSMITTED,
		handler: ExtensionDataTransmittedHandler
	): this;

	once(event: ExtensionEventTypes.LOG, handler: ExtensionLogHandler): this;
	on(event: ExtensionEventTypes.LOG, handler: ExtensionLogHandler): this;
	off(event: ExtensionEventTypes.LOG, handler: ExtensionLogHandler): this;

	once(event: ExtensionEventTypes.ERROR_LOG, handler: ExtensionErrorLogHandler): this;
	on(event: ExtensionEventTypes.ERROR_LOG, handler: ExtensionErrorLogHandler): this;
	off(event: ExtensionEventTypes.ERROR_LOG, handler: ExtensionErrorLogHandler): this;

	once(event: ExtensionEventTypes.ERROR, handler: ExtensionErrorHandler): this;
	on(event: ExtensionEventTypes.ERROR, handler: ExtensionErrorHandler): this;
	off(event: ExtensionEventTypes.ERROR, handler: ExtensionErrorHandler): this;
}

export interface IExtensionEntryPoint {
	activate(): Promise<void>;
	getType(): ExtensionTypes;
}

export interface IExtensionEntryPointWrapper<T extends IExtensionEntryPoint>
	extends IExtensionEntryPoint {
	handle(data: any): void;
	getEntrypoint(): T;
}

export abstract class AbstractExtensionEntryPointWrapper<T extends IExtensionEntryPoint>
	implements IExtensionEntryPointWrapper<T> {
	private entrypoint: T;
	constructor(entrypoint: T) {
		this.entrypoint = entrypoint;
	}
	activate(): Promise<void> {
		return this.entrypoint.activate();
	}
	getType(): ExtensionTypes {
		return this.entrypoint.getType();
	}
	getEntrypoint(): T {
		return this.entrypoint;
	}
	abstract handle(data: any): void;
}
