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
Object.defineProperty(exports, "__esModule", { value: true });
var events_1 = __importDefault(require("events"));
var extension_worker_1 = __importDefault(require("./extension-worker"));
var types_1 = require("./types");
var ExtensionRegistry = /** @class */ (function () {
    function ExtensionRegistry() {
        var _this = this;
        this.emitter = new events_1.default();
        this.started = false;
        this.extensions = [];
        process.once('exit', function () { return _this.shutdownAllExtensions(); });
        process.once('SIGINT', function () { return _this.shutdownAllExtensions(); });
    }
    ExtensionRegistry.prototype.getEmitter = function () {
        return this.emitter;
    };
    ExtensionRegistry.prototype.isStarted = function () {
        return this.started;
    };
    ExtensionRegistry.prototype.findExtensionById = function (extensionId) {
        return this.extensions.find(function (extension) { return extension.definition.getId() === extensionId; });
    };
    ExtensionRegistry.prototype.startup = function (extensions) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // build registered extensions
                        this.extensions = extensions.map(function (extensionPoint) {
                            return {
                                definition: extensionPoint,
                                worker: new extension_worker_1.default(),
                                started: false
                            };
                        });
                        // listen all child processes
                        // console.log(`main process pid[${process.pid}]`);
                        return [4 /*yield*/, Promise.all(this.extensions.map(function (extension) { return __awaiter(_this, void 0, void 0, function () {
                                var definition, worker, extensionId;
                                var _this = this;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            definition = extension.definition, worker = extension.worker;
                                            extensionId = definition.getId();
                                            worker
                                                .on("registered" /* REGISTERED */, function (error) {
                                                var extension = _this.extensions.find(function (extension) { return extension.definition.getId() === extensionId; });
                                                if (!extension) {
                                                    console.error("Unknown extension[id=" + extensionId + "] register request received, ignored.");
                                                }
                                                else if (error) {
                                                    // failed to activate extension, shutdown worker
                                                    console.error(error);
                                                    extension.worker.terminate();
                                                    extension.started = false;
                                                    _this.getEmitter().emit(types_1.ExtensionEventTypes.REGISTERED, {
                                                        type: types_1.ExtensionEventTypes.REGISTERED,
                                                        extensionId: extensionId,
                                                        error: error
                                                    });
                                                }
                                                else {
                                                    extension.started = true;
                                                    _this.getEmitter().emit(types_1.ExtensionEventTypes.REGISTERED, {
                                                        type: types_1.ExtensionEventTypes.REGISTERED,
                                                        extensionId: extensionId
                                                    });
                                                }
                                            })
                                                .on("exited" /* EXITED */, function (code, signal, expected) {
                                                console.log("Extension[id=" + extensionId + ", name=" + definition.getName() + "] terminated[code=" + code + ", signal=" + signal + "].");
                                                extension.started = false;
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
                                            })
                                                .on("data" /* DATA */, function (data) {
                                                _this.getEmitter().emit(types_1.ExtensionEventTypes.DATA_TRANSMITTED, {
                                                    type: types_1.ExtensionEventTypes.DATA_TRANSMITTED,
                                                    extensionId: extensionId,
                                                    data: data
                                                });
                                            });
                                            return [4 /*yield*/, worker.start(definition)];
                                        case 1:
                                            _a.sent();
                                            console.log("Extension[" + extensionId + "] started successfully by worker.");
                                            return [2 /*return*/];
                                    }
                                });
                            }); }))];
                    case 1:
                        // listen all child processes
                        // console.log(`main process pid[${process.pid}]`);
                        _a.sent();
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
        }
    };
    ExtensionRegistry.prototype.shutdownAllExtensions = function () {
        this.extensions.forEach(function (extension) {
            extension.worker.terminate();
            extension.started = false;
        });
    };
    ExtensionRegistry.prototype.destroy = function () {
        this.shutdownAllExtensions();
        this.started = false;
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
    ExtensionRegistry.prototype.sendMessage = function (extensionId, data) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var extension = _this.findExtensionById(extensionId);
            if (extension) {
                var worker = extension.worker;
                if (worker) {
                    worker
                        .sendMessage(extensionId, data)
                        .then(function () { return resolve(); })
                        .catch(function (e) { return reject(e); });
                }
            }
            else {
                reject(new Error("Worker not found of extension[" + extensionId + "]."));
            }
        });
    };
    return ExtensionRegistry;
}());
exports.default = ExtensionRegistry;
//# sourceMappingURL=extension-registry.js.map