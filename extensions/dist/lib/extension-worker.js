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
var child_process_1 = require("child_process");
var events_1 = __importDefault(require("events"));
var Consts = __importStar(require("./extension/consts"));
var types_1 = require("./types");
var objects = __importStar(require("./utils/objects"));
var platform = __importStar(require("./utils/platform"));
var ExtensionWorker = /** @class */ (function () {
    function ExtensionWorker() {
        var _this = this;
        this.emitter = new events_1.default();
        this.terminating = false;
        this.childProcess = null;
        this.onChildProcessError = function (error) {
            _this.getEmitter().emit("error" /* ERROR */, {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
        };
        this.onChildProcessExit = function (code, signal) {
            if (_this.terminating) {
                _this.getEmitter().emit("exited" /* EXITED */, code, signal, false);
            }
            else {
                _this.getEmitter().emit("exited" /* EXITED */, code, signal, true);
            }
        };
        this.onChildProcessMessageReceived = function (message, sendHandle) {
            if (!message) {
                console.log('Empty message received, ignore.');
                return;
            }
            var data = message;
            switch (true) {
                case data.extensionId && data.type === types_1.ExtensionEventTypes.DATA_TRANSMITTED:
                    _this.emitter.emit("data" /* DATA */, data.data);
                    break;
                case data.extensionId && data.type === types_1.ExtensionEventTypes.REGISTERED:
                    _this.emitter.emit("registered" /* REGISTERED */, data.error);
                    break;
                case data.extensionId && data.type === types_1.ExtensionEventTypes.TEST_LOG:
                    _this.emitter.emit("test-log" /* TEST_LOG */, data.data);
                    break;
                case data.extensionId && data.type === types_1.ExtensionEventTypes.BROWSER_OPERATION:
                    _this.emitter.emit("browser" /* BROWSER */, data.data);
                    break;
                default:
                    console.error('Neither extension id nor type declared via message, ignore.');
                    console.error(data);
            }
        };
        this.onChildProcessStdout = function (data) {
            _this.getEmitter().emit("log" /* LOG */, _this.asString(data));
        };
        this.onChildProcessStderr = function (data) {
            _this.getEmitter().emit("error-log" /* ERROR_LOG */, _this.asString(data));
        };
    }
    ExtensionWorker.prototype.start = function (extension) {
        return __awaiter(this, void 0, void 0, function () {
            var opts;
            var _a;
            return __generator(this, function (_b) {
                if (this.terminating) {
                    // .terminate() was called
                    return [2 /*return*/, Promise.reject('Terminating...')];
                }
                opts = {
                    env: objects.mixin(objects.deepClone(process.env), (_a = {},
                        // IMPORTANT relative path to "./extension/bootstrap"
                        _a[Consts.ARG_ENTRY_POINT] = './index.js',
                        _a[Consts.ARG_PACKAGE_FOLDER] = extension.getFolder(),
                        _a[Consts.ARG_HANDLES_UNCAUGHT_ERRORS] = true,
                        _a[Consts.ARG_EXTENSION_ID] = extension.getId(),
                        _a[Consts.ARG_IN_IDE] = !!process.versions.electron,
                        _a)),
                    // We only detach the extension host on windows. Linux and Mac orphan by default
                    // and detach under Linux and Mac create another process group.
                    // We detach because we have noticed that when the renderer exits, its child processes
                    // (i.e. extension host) are taken down in a brutal fashion by the OS
                    detached: !!platform.isWindows,
                    execArgv: undefined,
                    silent: true
                };
                // IMPORTANT relative path to me
                this.childProcess = child_process_1.fork(__dirname + "/extension/bootstrap", ['--type=extension'], opts);
                // Lifecycle
                this.childProcess.on('error', this.onChildProcessError);
                this.childProcess.on('exit', this.onChildProcessExit);
                this.childProcess.on('message', this.onChildProcessMessageReceived);
                this.childProcess.stdout.on('data', this.onChildProcessStdout);
                this.childProcess.stderr.on('data', this.onChildProcessStderr);
                return [2 /*return*/];
            });
        });
    };
    ExtensionWorker.prototype.asString = function (data) {
        if (data) {
            if (data.toString) {
                data = data.toString();
            }
            if (typeof data === 'string' && data.endsWith('\n')) {
                data = data.substr(0, data.length - 1);
            }
        }
        return data;
    };
    ExtensionWorker.prototype.getEmitter = function () {
        return this.emitter;
    };
    ExtensionWorker.prototype.terminate = function () {
        if (this.terminating) {
            return;
        }
        this.terminating = true;
        this.clean();
    };
    ExtensionWorker.prototype.clean = function () {
        if (this.childProcess) {
            this.childProcess.kill();
            this.childProcess = null;
        }
    };
    ExtensionWorker.prototype.once = function (event, listener) {
        this.emitter.once(event, listener);
        return this;
    };
    ExtensionWorker.prototype.on = function (event, listener) {
        this.emitter.on(event, listener);
        return this;
    };
    ExtensionWorker.prototype.off = function (event, listener) {
        this.emitter.off(event, listener);
        return this;
    };
    ExtensionWorker.prototype.sendMessage = function (extensionId, data) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.childProcess) {
                _this.childProcess.send({
                    extensionId: extensionId,
                    type: types_1.ExtensionEventTypes.DATA_TRANSMITTED,
                    data: data
                }, undefined, undefined, function (error) {
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve();
                    }
                });
            }
            else {
                // child process not found, generate an ignore reply
                resolve();
                _this.getEmitter().emit("data" /* DATA */, { ignore: true });
            }
        });
    };
    ExtensionWorker.prototype.sendBrowserOperation = function (extensionId, value) {
        var _this = this;
        var data = value;
        if (data instanceof Error) {
            data = {
                error: true,
                name: data.name,
                message: data.message
                // stack is not necessary, error always sent from browser to extension
            };
        }
        return new Promise(function (resolve, reject) {
            if (_this.childProcess) {
                _this.childProcess.send({
                    extensionId: extensionId,
                    type: types_1.ExtensionEventTypes.BROWSER_OPERATION,
                    data: data
                }, undefined, undefined, function (error) {
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve();
                    }
                });
            }
            else {
                resolve();
            }
        });
    };
    return ExtensionWorker;
}());
exports.default = ExtensionWorker;

//# sourceMappingURL=extension-worker.js.map
