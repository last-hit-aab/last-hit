export type ExtensionPointId = string;
export interface IExtensionPoint {
	getId(): ExtensionPointId;
	getName(): string;
	getDescription(): string;
	getFolder(): string;
}

export enum ExtensionEventTypes {
	REGISTERED = 'registered',
	DATA_TRANSMITTED = 'data-transmitted'
}

export type ExtensionRegisteredEvent = {
	type: ExtensionEventTypes.REGISTERED;
	extensionId: ExtensionPointId;
	port: number;
	error?: any;
};
export type ExtensionDataTransmittedEvent = {
	type: ExtensionEventTypes.DATA_TRANSMITTED;
	extensionId: ExtensionPointId;
	data: any;
};
export type ExtensionRegisteredHandler = (event: ExtensionRegisteredEvent) => void;
export type ExtensionDataTransmittedHandler = (event: ExtensionDataTransmittedEvent) => void;

export interface IExtensionRegistry {
	on(event: ExtensionEventTypes.REGISTERED, handler: ExtensionRegisteredHandler): this;
	off(event: ExtensionEventTypes.REGISTERED, handler: ExtensionRegisteredHandler): this;

	on(event: ExtensionEventTypes.DATA_TRANSMITTED, handler: ExtensionDataTransmittedHandler): this;
	off(
		event: ExtensionEventTypes.DATA_TRANSMITTED,
		handler: ExtensionDataTransmittedHandler
	): this;
}

export interface ExtensionEntryPoint {
	activate(): Promise<void>;
	handle(data: any): void;
}
