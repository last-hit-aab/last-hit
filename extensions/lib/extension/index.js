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
var fs_1 = __importDefault(require("fs"));
var jsonfile_1 = __importDefault(require("jsonfile"));
var path_1 = __importDefault(require("path"));
var types_1 = require("../types");
var uri_1 = require("../utils/uri");
var workspace_1 = require("./wrappers/workspace");
// With Electron 2.x and node.js 8.x the "natives" module
// can cause a native crash (see https://github.com/nodejs/node/issues/19891 and
// https://github.com/electron/electron/issues/10905). To prevent this from
// happening we essentially blocklist this module from getting loaded in any
// extension by patching the node require() function.
(function () {
    var Module = require('module');
    var originalLoad = Module._load;
    Module._load = function (request) {
        if (request === 'natives') {
            throw new Error('Either the extension or a NPM dependency is using the "natives" node module which is unsupported as it can cause a crash of the extension host. Click [here](https://go.microsoft.com/fwlink/?linkid=871887) to find out more');
        }
        return originalLoad.apply(this, arguments);
    };
})();
var ExtensionEntryPointHelper = /** @class */ (function () {
    function ExtensionEntryPointHelper(options) {
        var _this = this;
        this.extension = null;
        this.onMainProcessMessageReceived = function (message, sendHandle) {
            console.log(message);
            if (!message) {
                console.log('Empty message received, ignore.');
                return;
            }
            var data = message;
            if (data.extensionId && data.type === types_1.ExtensionEventTypes.DATA_TRANSMITTED) {
                if (data.extensionId !== _this.getExtensionId()) {
                    // do nothing, return
                    return;
                }
                _this.extension.handle(data.data);
            }
            else {
                console.error('Neither extension id nor type declared via message, ignore.');
                console.error(data);
            }
        };
        var extensionId = options.extensionId, packageFolder = options.packageFolder;
        this.extensionId = extensionId;
        this.packageFolder = packageFolder;
    }
    ExtensionEntryPointHelper.prototype.getExtensionId = function () {
        return this.extensionId;
    };
    ExtensionEntryPointHelper.prototype.getPackageFolder = function () {
        return this.packageFolder;
    };
    ExtensionEntryPointHelper.prototype.onStartSuccessful = function () {
        process.send({
            type: types_1.ExtensionEventTypes.REGISTERED,
            extensionId: this.getExtensionId()
        }, undefined, { swallowErrors: false }, function (error) {
            if (error) {
                console.error('Failed to send registration message.');
                console.error(error);
            }
        });
    };
    ExtensionEntryPointHelper.prototype.onStartFailed = function (e) {
        var _this = this;
        process.send({
            type: types_1.ExtensionEventTypes.REGISTERED,
            extensionId: this.getExtensionId(),
            error: e
        }, undefined, undefined, function (error) {
            if (error) {
                console.error("Failed to start extension[" + _this.getExtensionId() + "]");
                console.error(e);
                console.error('Failed to send registration message.');
                console.error(error);
            }
        });
    };
    ExtensionEntryPointHelper.prototype.activate = function () {
        return __awaiter(this, void 0, void 0, function () {
            var packageFilename, main, mainfile, module_1, extension, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        process.on('message', this.onMainProcessMessageReceived);
                        packageFilename = path_1.default.join(this.getPackageFolder(), 'package.json');
                        if (!fs_1.default.existsSync(packageFilename)) {
                            throw new Error("Package file[" + packageFilename + "] not found.");
                        }
                        if (!fs_1.default.statSync(packageFilename).isFile()) {
                            throw new Error("Package file[" + packageFilename + "] is not a file.");
                        }
                        main = jsonfile_1.default.readFileSync(packageFilename).main;
                        if (!main) {
                            main = 'index.js';
                        }
                        mainfile = path_1.default.join(this.getPackageFolder(), main);
                        if (!fs_1.default.existsSync(mainfile)) {
                            throw new Error("Main entry file[" + mainfile + "] not found.");
                        }
                        if (!fs_1.default.statSync(mainfile).isFile()) {
                            throw new Error("Main entry file[" + mainfile + "] is not a file.");
                        }
                        module_1 = uri_1.URI.file(mainfile);
                        extension = this.createWrapper(require(module_1.fsPath));
                        return [4 /*yield*/, extension.activate()];
                    case 1:
                        _a.sent();
                        this.extension = extension;
                        this.onStartSuccessful();
                        return [3 /*break*/, 3];
                    case 2:
                        e_1 = _a.sent();
                        this.onStartFailed(e_1);
                        return [2 /*return*/, Promise.reject()];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ExtensionEntryPointHelper.prototype.createWrapper = function (entrypoint) {
        switch (entrypoint.getType()) {
            case types_1.ExtensionTypes.WORKSPACE:
                return new workspace_1.WorkspaceExtensionEntryPointWrapper(entrypoint);
            default:
                throw new Error("Extension type[" + entrypoint.getType() + "] is not supported.");
        }
    };
    ExtensionEntryPointHelper.prototype.sendMessage = function (data) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            process.send({
                extensionId: _this.extensionId,
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
        });
    };
    return ExtensionEntryPointHelper;
}());
exports.activate = function (options) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        new ExtensionEntryPointHelper(options).activate();
        return [2 /*return*/];
    });
}); };
//# sourceMappingURL=index.js.map