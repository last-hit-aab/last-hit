import { IExtensionPoint, ExtensionPointId } from './index';

export class ExtensionPoint implements IExtensionPoint {
	private id: string;
	private name: string;
	private description: string;
	private folder: string;

	constructor(options: {
		id: ExtensionPointId;
		name: string;
		description: string;
		folder: string;
	}) {
		const { id, name, description, folder } = options;

		this.id = id;
		this.name = name;
		this.description = description;
		this.folder = folder;
	}
	getId(): ExtensionPointId {
		return this.id;
	}
	getName(): string {
		return this.name;
	}
	getDescription(): string {
		return this.description;
	}
	getFolder(): string {
		return this.folder;
	}
}
