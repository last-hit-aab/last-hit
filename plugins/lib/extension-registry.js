"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var events_1 = __importDefault(require("events"));
var rpc = __importStar(require("vscode-jsonrpc"));
var extension_rpc_1 = require("./extension-rpc");
var extension_worker_1 = __importDefault(require("./extension-worker"));
var types_1 = require("./types");
var ExtensionRegistry = /** @class */ (function () {
    function ExtensionRegistry() {
        var _this = this;
        this.emitter = new events_1.default();
        this.port = null;
        this.started = false;
        this.connection = null;
        this.extensions = [];
        process.once('exit', function () { return _this.shutdownAllExtensions(); });
        process.once('SIGINT', function () { return _this.shutdownAllExtensions(); });
    }
    ExtensionRegistry.prototype.getEmitter = function () {
        return this.emitter;
    };
    ExtensionRegistry.prototype.getPort = function () {
        return this.port;
    };
    ExtensionRegistry.prototype.isStarted = function () {
        return this.started;
    };
    ExtensionRegistry.prototype.findExtensionById = function (extensionId) {
        return this.extensions.find(function (extension) { return extension.definition.getId() === extensionId; });
    };
    ExtensionRegistry.prototype.startup = function (extensions) {
        return __awaiter(this, void 0, void 0, function () {
            var helper, _a, e_1;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        // build registered extensions
                        this.extensions = extensions.map(function (extensionPoint) {
                            return {
                                definition: extensionPoint,
                                worker: new extension_worker_1.default(),
                                started: false,
                                port: null
                            };
                        });
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, extension_rpc_1.createClientSocketTransport()];
                    case 2:
                        helper = _b.sent();
                        _a = this;
                        return [4 /*yield*/, helper.onPortOccuried()];
                    case 3:
                        _a.port = _b.sent();
                        helper.onConnected().then(function (_a) {
                            var reader = _a.reader, writer = _a.writer;
                            var connection = rpc.createMessageConnection(reader, writer);
                            // listen start signal
                            connection.onRequest(types_1.ExtensionEventTypes.REGISTERED, function (event) {
                                var extensionId = event.extensionId, port = event.port, error = event.error;
                                var extension = _this.extensions.find(function (extension) { return extension.definition.getId() === extensionId; });
                                if (!extension) {
                                    console.error("Unknown extension[id=" + extensionId + ", port=" + port + "] register request received, ignored.");
                                }
                                else if (error) {
                                    // failed to activate extension, shutdown worker
                                    console.error(error);
                                    extension.worker.terminate();
                                }
                                else {
                                    extension.port = port;
                                    extension.started = true;
                                    _this.getEmitter().emit(types_1.ExtensionEventTypes.REGISTERED, {
                                        type: types_1.ExtensionEventTypes.REGISTERED,
                                        port: port,
                                        extensionId: extensionId
                                    });
                                }
                            });
                            // listen data
                            connection.onRequest(types_1.ExtensionEventTypes.DATA_TRANSMITTED, function (event) {
                                var data = event.data, extensionId = event.extensionId;
                                _this.getEmitter().emit(types_1.ExtensionEventTypes.DATA_TRANSMITTED, {
                                    type: types_1.ExtensionEventTypes.DATA_TRANSMITTED,
                                    extensionId: extensionId,
                                    data: data
                                });
                            });
                            // start listen
                            connection.listen();
                        });
                        return [3 /*break*/, 5];
                    case 4:
                        e_1 = _b.sent();
                        return [2 /*return*/, Promise.reject(e_1)];
                    case 5: return [4 /*yield*/, Promise.all(this.extensions.map(function (extension) { return __awaiter(_this, void 0, void 0, function () {
                            var definition, worker, extensionId;
                            var _this = this;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        definition = extension.definition, worker = extension.worker;
                                        extensionId = definition.getId();
                                        worker
                                            .on("child-process-exited" /* CHILD_PROCESS_EXITED */, function (code, signal, expected) {
                                            console.log("Extension[id=" + extensionId + ", name=" + definition.getName() + "] on port[" + extension.port + "] terminated[code=" + code + ", signal=" + signal + "].");
                                            _this.getEmitter().emit(types_1.ExtensionEventTypes.UNREGISTERED, {
                                                type: types_1.ExtensionEventTypes.UNREGISTERED,
                                                extensionId: extensionId
                                            });
                                        })
                                            .on("log" /* LOG */, function (data) {
                                            _this.getEmitter().emit(types_1.ExtensionEventTypes.LOG, {
                                                type: types_1.ExtensionEventTypes.LOG,
                                                extensionId: extensionId,
                                                data: data
                                            });
                                        })
                                            .on("error-log" /* ERROR_LOG */, function (data) {
                                            _this.getEmitter().emit(types_1.ExtensionEventTypes.ERROR_LOG, {
                                                type: types_1.ExtensionEventTypes.ERROR_LOG,
                                                extensionId: extensionId,
                                                data: data
                                            });
                                        })
                                            .on("error" /* ERROR */, function (error) {
                                            _this.getEmitter().emit(types_1.ExtensionEventTypes.ERROR, {
                                                type: types_1.ExtensionEventTypes.ERROR,
                                                extensionId: extensionId,
                                                error: error
                                            });
                                        });
                                        return [4 /*yield*/, worker.start(this.port, definition)];
                                    case 1:
                                        _a.sent();
                                        console.log("Extension[" + extensionId + "] started successfully by worker.");
                                        return [2 /*return*/];
                                }
                            });
                        }); }))];
                    case 6:
                        _b.sent();
                        this.started = true;
                        return [2 /*return*/];
                }
            });
        });
    };
    ExtensionRegistry.prototype.shutdownExtension = function (extensionId) {
        var extension = this.findExtensionById(extensionId);
        if (extension) {
            extension.worker.terminate();
            extension.started = false;
            extension.port = 0;
        }
    };
    ExtensionRegistry.prototype.shutdownAllExtensions = function () {
        this.extensions.forEach(function (extension) {
            extension.worker.terminate();
            extension.started = false;
            extension.port = null;
        });
    };
    ExtensionRegistry.prototype.destroy = function () {
        this.shutdownAllExtensions();
        this.started = false;
        this.connection && this.connection.dispose();
    };
    ExtensionRegistry.prototype.once = function (event, handler) {
        this.getEmitter().once(event, handler);
        return this;
    };
    ExtensionRegistry.prototype.on = function (event, handler) {
        this.getEmitter().on(event, handler);
        return this;
    };
    ExtensionRegistry.prototype.off = function (event, handler) {
        this.getEmitter().off(event, handler);
        return this;
    };
    ExtensionRegistry.prototype.publishMessage = function (extensionId, data) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var extension = _this.extensions.find(function (extension) { return extension.definition.getId() === extensionId; });
            var _a = extension_rpc_1.createServerSocketTransport(extension.port), reader = _a.reader, writer = _a.writer;
            var connection = rpc.createMessageConnection(reader, writer);
            connection.onError(function (e) {
                console.error(e);
                reject(e);
            });
            connection.listen();
            connection
                .sendRequest(types_1.ExtensionEventTypes.DATA_TRANSMITTED, {
                type: types_1.ExtensionEventTypes.DATA_TRANSMITTED,
                extensionId: extensionId,
                data: data
            })
                .then(function () {
                connection.dispose();
                resolve();
            }, function (e) {
                connection.dispose();
                reject(e);
            });
        });
    };
    return ExtensionRegistry;
}());
exports.default = ExtensionRegistry;
//# sourceMappingURL=extension-registry.js.map