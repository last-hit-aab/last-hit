import fs from 'fs';
import jsonfile from 'jsonfile';
import net from 'net';
import path from 'path';
import {
	ExtensionDataTransmittedEvent,
	ExtensionEventTypes,
	ExtensionPointId,
	ExtensionTypes,
	IExtensionEntryPoint,
	IExtensionEntryPointWrapper
} from '../types';
import { URI } from '../utils/uri';
import {
	IWorkspaceExtensionEntryPoint,
	WorkspaceExtensionEntryPointWrapper
} from './wrappers/workspace';

// With Electron 2.x and node.js 8.x the "natives" module
// can cause a native crash (see https://github.com/nodejs/node/issues/19891 and
// https://github.com/electron/electron/issues/10905). To prevent this from
// happening we essentially blocklist this module from getting loaded in any
// extension by patching the node require() function.
(() => {
	const Module = require('module') as any;
	const originalLoad = Module._load;

	Module._load = function(request: string) {
		if (request === 'natives') {
			throw new Error(
				'Either the extension or a NPM dependency is using the "natives" node module which is unsupported as it can cause a crash of the extension host. Click [here](https://go.microsoft.com/fwlink/?linkid=871887) to find out more'
			);
		}

		return originalLoad.apply(this, arguments);
	};
})();

class ExtensionEntryPointHelper {
	private extensionId: ExtensionPointId;
	private packageFolder: string | undefined;

	private extension: IExtensionEntryPointWrapper<any> | null = null;

	constructor(options: { extensionId: ExtensionPointId; packageFolder: string }) {
		const { extensionId, packageFolder } = options;

		this.extensionId = extensionId;
		this.packageFolder = packageFolder;
	}
	private getExtensionId(): ExtensionPointId {
		return this.extensionId;
	}
	private getPackageFolder(): string {
		return this.packageFolder;
	}
	private onMainProcessMessageReceived = (
		message: any,
		sendHandle: net.Socket | net.Server
	): void => {
		if (!message) {
			console.log('Empty message received, ignore.');
			return;
		}
		const data = message as ExtensionDataTransmittedEvent;
		if (data.extensionId && data.type === ExtensionEventTypes.DATA_TRANSMITTED) {
			if (data.extensionId !== this.getExtensionId()) {
				// do nothing, return
				return;
			}
			this.extension.handle(data.data);
		} else {
			console.error('Neither extension id nor type declared via message, ignore.');
			console.error(data);
		}
	};
	private onStartSuccessful() {
		process.send(
			{
				type: ExtensionEventTypes.REGISTERED,
				extensionId: this.getExtensionId()
			},
			undefined,
			undefined,
			(error: Error) => {
				if (error) {
					console.error('Failed to send registration message.');
					console.error(error);
				}
			}
		);
	}
	private onStartFailed(e: Error) {
		process.send(
			{
				type: ExtensionEventTypes.REGISTERED,
				extensionId: this.getExtensionId(),
				error: e
			},
			undefined,
			undefined,
			(error: Error) => {
				if (error) {
					console.error(`Failed to start extension[${this.getExtensionId()}]`);
					console.error(e);
					console.error('Failed to send registration message.');
					console.error(error);
				}
			}
		);
	}
	async activate() {
		try {
			process.on('message', this.onMainProcessMessageReceived);

			const packageFilename = path.join(this.getPackageFolder(), 'package.json');
			if (!fs.existsSync(packageFilename)) {
				throw new Error(`Package file[${packageFilename}] not found.`);
			}
			if (!fs.statSync(packageFilename).isFile()) {
				throw new Error(`Package file[${packageFilename}] is not a file.`);
			}
			let { main } = jsonfile.readFileSync(packageFilename) as { main: string };
			if (!main) {
				main = 'index.js';
			}
			const mainfile = path.join(this.getPackageFolder(), main);
			if (!fs.existsSync(mainfile)) {
				throw new Error(`Main entry file[${mainfile}] not found.`);
			}
			if (!fs.statSync(mainfile).isFile()) {
				throw new Error(`Main entry file[${mainfile}] is not a file.`);
			}
			const module: URI = URI.file(mainfile);
			const extension: IExtensionEntryPointWrapper<any> = this.createWrapper(
				require(module.fsPath)
			);
			await extension.activate();
			this.extension = extension;
			this.onStartSuccessful();
		} catch (e) {
			this.onStartFailed(e);
			return Promise.reject();
		}
	}
	createWrapper(entrypoint: IExtensionEntryPoint): IExtensionEntryPointWrapper<any> {
		switch (entrypoint.getType()) {
			case ExtensionTypes.WORKSPACE:
				return new WorkspaceExtensionEntryPointWrapper(
					entrypoint as IWorkspaceExtensionEntryPoint
				);
			default:
				throw new Error(`Extension type[${entrypoint.getType()}] is not supported.`);
		}
	}
	sendMessage(data: any): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			process.send(
				{
					extensionId: this.extensionId,
					type: ExtensionEventTypes.DATA_TRANSMITTED,
					data
				} as ExtensionDataTransmittedEvent,
				undefined,
				undefined,
				(error: Error) => {
					if (error) {
						reject(error);
					} else {
						resolve();
					}
				}
			);
		});
	}
}

export const activate = async (options: {
	extensionId: ExtensionPointId;
	packageFolder: string;
}): Promise<void> => {
	new ExtensionEntryPointHelper(options).activate();
};
