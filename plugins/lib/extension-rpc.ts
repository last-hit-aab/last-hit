import net from 'net';
import * as rpc from 'vscode-jsonrpc';

export type RPCOperator = {
	reader: rpc.MessageReader;
	writer: rpc.MessageWriter;
};
export type RPCHelper = {
	onConnected: () => Promise<RPCOperator>;
	onPortOccuried: () => Promise<number>;
};

export const createClientSocketTransport = async (
	port: number = 0,
	encoding: string = 'utf-8'
): Promise<RPCHelper> => {
	let connectResolve: (options: RPCOperator) => void;
	const connected = new Promise<RPCOperator>(resolve => (connectResolve = resolve));
	let portResolve: (port: number) => void;
	const listening = new Promise<number>(resolve => (portResolve = resolve));

	return new Promise((resolve, reject) => {
		try {
			const server = net.createServer((socket: net.Socket) => {
				server.close();
				connectResolve({
					reader: new rpc.SocketMessageReader(socket, encoding),
					writer: new rpc.SocketMessageWriter(socket, encoding)
				});
			});
			server.on('error', reject);
			server.once('listening', () => {
				portResolve((server.address() as net.AddressInfo).port);
			});
			server.listen(port, '127.0.0.1', () => {
				server.removeListener('error', reject);
				resolve({
					onConnected: async (): Promise<RPCOperator> => {
						return new Promise<RPCOperator>(resolve => {
							connected.then(({ reader, writer }) => resolve({ reader, writer }));
						});
					},
					onPortOccuried: async (): Promise<number> => {
						return new Promise<number>(resolve => {
							listening.then((port: number) => resolve(port));
						});
					}
				} as RPCHelper);
			});
		} catch (e) {
			console.error(e);
			reject(e);
		}
	});
};

export const createServerSocketTransport = (
	port: number,
	encoding: string = 'utf-8'
): RPCOperator => {
	const socket = net.createConnection(port, '127.0.0.1');
	return {
		reader: new rpc.SocketMessageReader(socket, encoding),
		writer: new rpc.SocketMessageWriter(socket, encoding)
	};
};
