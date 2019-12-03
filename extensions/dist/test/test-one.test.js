"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = __importDefault(require("path"));
var index_1 = __importDefault(require("../index"));
var types_1 = require("../lib/types");
var extension_point_1 = require("../lib/types/extension-point");
var extensionPonits = [
    new extension_point_1.ExtensionPoint({
        id: 'id-1',
        name: 'name-1',
        description: 'desc-1',
        folder: path_1.default.join(process.cwd(), '../test-one-extension')
    })
];
// let registrationResolve =
// const registrationPromise =
// test('test register extensions', async () => {
var onRegistered = function (event) {
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
    var extensionId = 'id-1';
    index_1.default.sendMessage(extensionId, 'hello').finally(function () {
        index_1.default.sendMessage(extensionId, 'hello world');
    });
};
var onLog = function (event) {
    console.log(event);
    // expect.assertions(1);
    // expect(event.data).toBe('test-one-extension actived.');
    // ExtensionRegistry.off(ExtensionEventTypes.LOG, onLog);
};
var onErrorLog = function (event) {
    console.log(event);
};
var onError = function (event) {
    console.log(event);
};
index_1.default.on(types_1.ExtensionEventTypes.LOG, onLog)
    .on(types_1.ExtensionEventTypes.ERROR_LOG, onErrorLog)
    .on(types_1.ExtensionEventTypes.ERROR, onError)
    .on(types_1.ExtensionEventTypes.REGISTERED, onRegistered);
index_1.default.startup(extensionPonits);
// });
// test('wait 10 seconds', () => {
// 	const x = 1;
// 	setTimeout(() => {
// 		expect(x).toBe(1);
// 	}, 10000);
// });
// test('test shutdown', () => {});
//# sourceMappingURL=test-one.test.js.map