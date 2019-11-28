import net from 'net';
import * as rpc from 'vscode-jsonrpc';

export type RPC = {
	reader: rpc.MessageReader;
	writer: rpc.MessageWriter;
	port: number;
};
type RPCOperator = Omit<RPC, 'port'>;
export type RPCHelper = { onConnected: () => Promise<RPC> };

export const createClientSocketTransport = async (
	port: number = 0,
	encoding: string = 'utf-8'
): Promise<RPCHelper> => {
	let connectResolve: (options: RPCOperator) => void;
	const connected = new Promise<RPCOperator>(resolve => (connectResolve = resolve));
	let portResolve: (port: number) => void;
	const listened = new Promise<number>(resolve => (portResolve = resolve));

	return new Promise((resolve, reject) => {
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
				onConnected: async (): Promise<RPC> => {
					return new Promise<RPC>(resolve => {
						Promise.all<RPCOperator, number>([connected, listened]).then(
							(values: [RPCOperator, number]) => {
								resolve({
									reader: values[0].reader,
									writer: values[0].writer,
									port: values[1]
								});
							}
						);
					});
				}
			} as RPCHelper);
		});
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
