import { Extensions } from 'last-hit-types';

export type ExtensionPointId = string;
export interface IExtensionPoint {
	getId(): ExtensionPointId;
	getName(): string;
	getDescription(): string;
	getFolder(): string;
}
export interface IExtensionEntryPointHelper {
	isInIDE(): boolean;
	sendMessage(data: any): Promise<void>;
	sendError(e: Error): Promise<void>;
	sendIgnore(): Promise<void>;
	sendBrowserOperation(data: any): Promise<void>;
	once(eventType: ExtensionEventTypes, handler: (value: any) => void): this;
	on(eventType: ExtensionEventTypes, handler: (value: any) => void): this;
	off(eventType: ExtensionEventTypes, handler: (value: any) => void): this;
}

export enum ExtensionEventTypes {
	REGISTERED = 'registered',
	UNREGISTERED = 'unregitered',
	DATA_TRANSMITTED = 'data-transmitted',
	BROWSER_OPERATION = 'browser-operation',
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
/** event is process by extension handler, and response data returned */
export interface ExtensionDataTransmittedEvent extends ExtensionEvent {
	type: ExtensionEventTypes.DATA_TRANSMITTED;
	data: any;
}
/** error occurs on extension handling */
export interface ExtensionDataTransmittedErrorEvent extends ExtensionDataTransmittedEvent {
	type: ExtensionEventTypes.DATA_TRANSMITTED;
	data: { error: Error };
}
/** event is ignored by extension */
export interface ExtensionDataTransmittedIgnoreEvent extends ExtensionDataTransmittedEvent {
	type: ExtensionEventTypes.DATA_TRANSMITTED;
	data: { ignore: true };
}
export type ExtensionDataTransmittedHandler = (event: ExtensionDataTransmittedEvent) => void;

export type ExtensionBrowserOperationData = { type: Extensions.BrowserOperationEventTypes };
export type GetElementAttrValueData = ExtensionBrowserOperationData & {
	csspath: string;
	attrName: string;
	pageUuid?: string;
};
export type GetElementPropValueData = ExtensionBrowserOperationData & {
	csspath: string;
	propName: string;
	pageUuid?: string;
};
export type BrowserOperationReturnData = string | null;
export type BrowserOperationError = {
	error: true;
	name: string;
	message: string;
};
export interface ExtensionBrowserOperationEvent extends ExtensionEvent {
	type: ExtensionEventTypes.BROWSER_OPERATION;
	data: // from extension to replayer
	| GetElementAttrValueData
		| GetElementPropValueData
		// from replayer to extension
		| BrowserOperationReturnData
		| BrowserOperationError;
}
export type ExtensionBrowserOperationHandler = (event: ExtensionBrowserOperationEvent) => void;

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

	once(
		event: ExtensionEventTypes.BROWSER_OPERATION,
		handler: ExtensionBrowserOperationHandler
	): this;
	on(
		event: ExtensionEventTypes.BROWSER_OPERATION,
		handler: ExtensionBrowserOperationHandler
	): this;
	off(
		event: ExtensionEventTypes.BROWSER_OPERATION,
		handler: ExtensionBrowserOperationHandler
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

export interface IExtensionEntryPointWrapper<T extends Extensions.IExtensionEntryPoint>
	extends Extensions.IExtensionEntryPoint {
	handle(data: any): void;
	getEntrypoint(): T;
}

export abstract class AbstractExtensionEntryPointWrapper<T extends Extensions.IExtensionEntryPoint>
	implements IExtensionEntryPointWrapper<T> {
	private entrypoint: T;
	private helper: IExtensionEntryPointHelper;

	constructor(entrypoint: T, helper: IExtensionEntryPointHelper) {
		this.entrypoint = entrypoint;
		this.helper = helper;
	}
	activate(): Promise<void> {
		return this.entrypoint.activate();
	}
	getType(): Extensions.ExtensionTypes {
		return this.entrypoint.getType();
	}
	getEntrypoint(): T {
		return this.entrypoint;
	}
	getHelper() {
		return this.helper;
	}
	abstract handle(data: any): void;
}
