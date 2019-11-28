import fs from 'fs';
import jsonfile from 'jsonfile';
import path from 'path';
import * as rpc from 'vscode-jsonrpc';
import {
	createClientSocketTransport,
	RPC,
	RPCHelper,
	createServerSocketTransport
} from '../extension-rpc';
import {
	ExtensionEntryPoint,
	ExtensionPointId,
	ExtensionEventTypes,
	ExtensionDataTransmittedEvent
} from '../types';
import { URI } from '../utils/uri';

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

// const active = () => {
// 	const module = URI.file('d:/last-hit-plugin/dist/main.js');
// 	let r = require(module.fsPath);
// 	return r.activate.apply();
// };

// const startExtensionHostProcess = async (): Promise<void> => {
// 	const extensionService = new ExtensionEntryPoint();
// 	const extension = extensionService.active();
// 	let registerExtensionService = new RegisterExtensionService(10086);
// 	registerExtensionService.registerExtension(extension.id, extension.kind, extension.handler);
// 	registerExtensionService.registerGenericRequestHandler();
// 	new RegisterExtensionService(10085).sendRequest('sub.process.start', true);
// };

// startExtensionHostProcess().catch(err => console.log(err));

class ExtensionEntryPointHelper {
	private extensionId: ExtensionPointId;
	private packageFolder: string | undefined;
	private registryPort: number;

	private extension: ExtensionEntryPoint | null = null;
	private port: number | null = null;

	constructor(options: {
		extensionId: ExtensionPointId;
		packageFolder: string;
		registryPort: number;
	}) {
		const { extensionId, packageFolder, registryPort } = options;

		this.extensionId = extensionId;
		this.packageFolder = packageFolder;
		this.registryPort = registryPort;
	}
	private getExtensionId(): ExtensionPointId {
		return this.extensionId;
	}
	private getPackageFolder(): string {
		return this.packageFolder;
	}
	private getRegistryPort(): number {
		return this.registryPort;
	}
	private async startup() {
		const helper: RPCHelper = await createClientSocketTransport();
		const { reader, writer, port }: RPC = await helper.onConnected();
		const connection = rpc.createMessageConnection(reader, writer);
		connection.onRequest(
			ExtensionEventTypes.DATA_TRANSMITTED,
			(event: ExtensionDataTransmittedEvent): void => {
				const { data, extensionId } = event;
				if (extensionId !== this.getExtensionId()) {
					// do nothing, return
					return;
				}
				this.extension.handle(data);
			}
		);
		this.port = port;
	}
	private onStartSuccessful() {
		const { reader, writer } = createServerSocketTransport(this.getRegistryPort());
		const connection = rpc.createMessageConnection(reader, writer);
		connection.listen();
		connection.sendRequest(ExtensionEventTypes.REGISTERED, {
			type: ExtensionEventTypes.REGISTERED,
			extensionId: this.getExtensionId(),
			port: this.port
		});
	}
	private onStartFailed(e: Error) {
		const { reader, writer } = createServerSocketTransport(this.getRegistryPort());
		const connection = rpc.createMessageConnection(reader, writer);
		connection.listen();
		connection.sendRequest(ExtensionEventTypes.REGISTERED, {
			type: ExtensionEventTypes.REGISTERED,
			extensionId: this.getExtensionId(),
			port: this.port,
			error: e
		});
	}
	async activate() {
		try {
			await this.startup();
		} catch (e) {}

		try {
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
			const extension: ExtensionEntryPoint = require(module.fsPath);
			await extension.activate();
			this.extension = extension;
			this.onStartSuccessful();
		} catch (e) {
			this.onStartFailed(e);
		}
	}
}

export const activate = async (options: {
	extensionId: ExtensionPointId;
	packageFolder: string;
	registryPort: number;
}): Promise<void> => {
	new ExtensionEntryPointHelper(options).activate();
};
