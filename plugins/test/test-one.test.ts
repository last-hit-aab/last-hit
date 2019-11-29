import path from 'path';
import ExtensionRegistry from '../index';
import {
	ExtensionEventTypes,
	ExtensionRegisteredEvent,
	IExtensionPoint,
	ExtensionUnregisteredEvent,
	ExtensionLogEvent,
	ExtensionErrorLogEvent,
	ExtensionErrorEvent
} from '../lib/types';
import { ExtensionPoint } from '../lib/types/extension-point';

const extensionPonits: Array<IExtensionPoint> = [
	new ExtensionPoint({
		id: 'id-1',
		name: 'name-1',
		description: 'desc-1',
		folder: path.join(process.cwd(), '../test-one-extension')
	})
];

// let registrationResolve =
// const registrationPromise =
// test('test register extensions', async () => {
const onRegistered = (event: ExtensionRegisteredEvent): void => {
	console.log('registered', event);
	// expect.assertions(1);
	// expect(event.extensionId).toBeOneOf(extensionPonits.map(ep => ep.getId()));
	// expect(event.port).toBeWithin(1, 65535);
	// const onUnregistered = (event: ExtensionUnregisteredEvent): void => {
	// 	// expect.assertions(1);
	// 	// expect(event.extensionId).toBeOneOf(extensionPonits.map(ep => ep.getId()));
	// 	console.log(event);
	// };
	// ExtensionRegistry.on(ExtensionEventTypes.UNREGISTERED, onUnregistered).shutdownAll();
	const extensionId = 'id-1';
	ExtensionRegistry.publishMessage(extensionId, 'hello').finally(() => {
		ExtensionRegistry.publishMessage(extensionId, 'hello world');
	});
};
const onLog = (event: ExtensionLogEvent): void => {
	console.log(event);
	// expect.assertions(1);
	// expect(event.data).toBe('test-one-extension actived.');
	// ExtensionRegistry.off(ExtensionEventTypes.LOG, onLog);
};
const onErrorLog = (event: ExtensionErrorLogEvent): void => {
	console.log(event);
};
const onError = (event: ExtensionErrorEvent): void => {
	console.log(event);
};
ExtensionRegistry.on(ExtensionEventTypes.LOG, onLog)
	.on(ExtensionEventTypes.ERROR_LOG, onErrorLog)
	.on(ExtensionEventTypes.ERROR, onError)
	.on(ExtensionEventTypes.REGISTERED, onRegistered);
ExtensionRegistry.startup(extensionPonits);
// });

// test('wait 10 seconds', () => {
// 	const x = 1;
// 	setTimeout(() => {
// 		expect(x).toBe(1);
// 	}, 10000);
// });
// test('test shutdown', () => {});
