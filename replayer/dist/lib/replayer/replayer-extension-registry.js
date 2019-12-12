"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var last_hit_extensions_1 = require("last-hit-extensions");
var path_1 = __importDefault(require("path"));
var v4_1 = __importDefault(require("uuid/v4"));
var DEFAULT_EVENT_HANDLER_TIMEOUT = 3000;
var asStory = function (storyName) {
    return {
        name: storyName,
        description: ''
    };
};
var WorkspaceExtensionRegistry = /** @class */ (function (_super) {
    __extends(WorkspaceExtensionRegistry, _super);
    function WorkspaceExtensionRegistry(options) {
        var _this = _super.call(this) || this;
        var env = options.env;
        _this.workspaceExtensionId = v4_1.default();
        _this.workspaceExtensionFolder = path_1.default.join(env.getWorkspace(), '.scripts');
        _this.env = env;
        return _this;
    }
    WorkspaceExtensionRegistry.prototype.getWorkspaceExtensionId = function () {
        return this.workspaceExtensionId;
    };
    WorkspaceExtensionRegistry.prototype.getWorkspaceExtensionFolder = function () {
        return this.workspaceExtensionFolder;
    };
    WorkspaceExtensionRegistry.prototype.getEnvironment = function () {
        return this.env;
    };
    WorkspaceExtensionRegistry.prototype.sendWorkspaceEvent = function (event) {
        var _this = this;
        return new Promise(function (resolve) {
            _this.once(last_hit_extensions_1.ExtensionEventTypes.DATA_TRANSMITTED, function (evt) {
                var data = evt.data;
                if (data.ignore) {
                    // ignore event, do nothing
                    // console.log(`[${event.type}] is ignored by workspace extension scripts`);
                    resolve({ ignored: true });
                }
                else if (data.error) {
                    // error occurred
                    // console.error(
                    // 	`error occurred on [${event.type}] via workspace extension scripts, ignored`
                    // );
                    // console.error(data.error);
                    resolve({ ignored: false, error: data.error });
                }
                else {
                    // console.log(
                    // 	`data returned on [${event.type}] from workspace extension scripts`,
                    // 	data
                    // );
                    // merge
                    resolve({ ignored: false, data: data });
                }
            }, DEFAULT_EVENT_HANDLER_TIMEOUT, function () {
                console.log("Timeout on [" + event.type + "] via workspace extension scripts, ignored");
                resolve({ ignored: true, timeout: true });
            });
            _this.sendMessage(_this.getWorkspaceExtensionId(), event);
        });
    };
    /**
     * quick send step-should-start to extension,
     * return data when success, otherwise return nothing(void)
     */
    WorkspaceExtensionRegistry.prototype.quickSendWorkspaceEvent = function (eventType, data) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.sendWorkspaceEvent(__assign({ type: eventType }, data))];
                    case 1:
                        result = _a.sent();
                        if (!result.ignored) {
                            if (result.error) {
                                // error thrown from extension
                                throw result.error;
                            }
                            else {
                                // everything is ok
                                return [2 /*return*/, result.data];
                            }
                        }
                        else {
                            // extension returns ignored or extension timeout
                            return [2 /*return*/, null];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * send step-accomplished to extension, return data when success
     */
    WorkspaceExtensionRegistry.prototype.stepAccomplished = function (storyName, flow, step) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.quickSendWorkspaceEvent('step-accomplished', {
                            story: asStory(storyName),
                            flow: flow,
                            step: step
                        })];
                    case 1: return [2 /*return*/, ((_a.sent()) || __assign(__assign({}, step), { _: { passed: true } }))];
                }
            });
        });
    };
    /**
     * send step-accomplished to extension, return data when success
     */
    WorkspaceExtensionRegistry.prototype.stepOnError = function (storyName, flow, step, error) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.quickSendWorkspaceEvent('step-on-error', {
                            story: asStory(storyName),
                            flow: flow,
                            step: step,
                            error: {
                                name: error.name,
                                message: error.message,
                                stack: error.stack
                            }
                        })];
                    case 1: return [2 /*return*/, ((_a.sent()) || __assign(__assign({}, step), { _: { fixed: false } }))];
                }
            });
        });
    };
    /**
     * send step-should-start to extension, return data when success
     */
    WorkspaceExtensionRegistry.prototype.stepShouldStart = function (storyName, flow, step) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.quickSendWorkspaceEvent('step-should-start', {
                            story: asStory(storyName),
                            flow: flow,
                            step: step
                        })];
                    case 1: return [2 /*return*/, ((_a.sent()) || step)];
                }
            });
        });
    };
    /**
     * send flow-accomplished to extension, return data when success
     */
    WorkspaceExtensionRegistry.prototype.flowAccomplished = function (storyName, flow) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.quickSendWorkspaceEvent('flow-accomplished', {
                            story: asStory(storyName),
                            flow: flow
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * send flow-should-start to extension, return data when success
     */
    WorkspaceExtensionRegistry.prototype.flowShouldStart = function (storyName, flow) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.quickSendWorkspaceEvent('flow-should-start', {
                            story: asStory(storyName),
                            flow: flow
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * send story-prepare to extension, return data anyway
     */
    WorkspaceExtensionRegistry.prototype.prepareStory = function (storyName) {
        return __awaiter(this, void 0, void 0, function () {
            var story, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        story = asStory(storyName);
                        return [4 /*yield*/, this.quickSendWorkspaceEvent('story-prepare', {
                                story: story
                            })];
                    case 1:
                        data = _a.sent();
                        return [2 /*return*/, data || story];
                }
            });
        });
    };
    WorkspaceExtensionRegistry.prototype.once = function (event, handler, timeout, onTimeout) {
        var _this = this;
        var timeoutHanlder;
        _super.prototype.once.call(this, event, function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            if (timeoutHanlder) {
                clearTimeout(timeoutHanlder);
            }
            handler.apply(void 0, args);
        });
        if (onTimeout) {
            timeoutHanlder = setTimeout(function () {
                _this.off(event, handler);
                onTimeout();
            }, timeout);
        }
        return this;
    };
    WorkspaceExtensionRegistry.prototype.launch = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                        var onRegistered, onUnregistered, onLog, onErrorLog, off;
                        var _this = this;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    onRegistered = function (event) { return __awaiter(_this, void 0, void 0, function () {
                                        var error;
                                        var _this = this;
                                        return __generator(this, function (_a) {
                                            off();
                                            error = event.error;
                                            if (error) {
                                                // register failed
                                                console.log('register failed', error);
                                                resolve();
                                            }
                                            else {
                                                // register successfully
                                                this.once(last_hit_extensions_1.ExtensionEventTypes.DATA_TRANSMITTED, function (event) {
                                                    var data = event.data;
                                                    if (data.ignore) {
                                                        // ignore event, do nothing
                                                        console.log('environment prepare is ignored by workspace extension scripts');
                                                        resolve();
                                                    }
                                                    else if (data.error) {
                                                        // error occurred
                                                        console.error('error occurred on environment prepare via workspace extension scripts, ignored');
                                                        console.error(data.error);
                                                        resolve();
                                                    }
                                                    else {
                                                        console.log('data returned on environment prepare from workspace extension scripts', data);
                                                        // merge
                                                        _this.getEnvironment().mergeFrom(data);
                                                        resolve();
                                                    }
                                                }, DEFAULT_EVENT_HANDLER_TIMEOUT, function () {
                                                    console.log('Timeout on environment prepare via workspace extension scripts, ignored');
                                                    resolve();
                                                });
                                                this.sendMessage(this.getWorkspaceExtensionId(), {
                                                    type: 'env-prepare',
                                                    env: this.getEnvironment().expose()
                                                });
                                            }
                                            return [2 /*return*/];
                                        });
                                    }); };
                                    onUnregistered = function (event) {
                                        off();
                                        resolve();
                                    };
                                    onLog = function (event) {
                                        console.log('log on extension register');
                                        console.log(event);
                                    };
                                    onErrorLog = function (event) {
                                        console.error('error occurred on extension register');
                                        console.error(event);
                                    };
                                    this.once(last_hit_extensions_1.ExtensionEventTypes.REGISTERED, onRegistered)
                                        .once(last_hit_extensions_1.ExtensionEventTypes.UNREGISTERED, onUnregistered)
                                        .on(last_hit_extensions_1.ExtensionEventTypes.LOG, onLog)
                                        .on(last_hit_extensions_1.ExtensionEventTypes.ERROR_LOG, onErrorLog);
                                    off = function () {
                                        _this.off(last_hit_extensions_1.ExtensionEventTypes.REGISTERED, onRegistered)
                                            .off(last_hit_extensions_1.ExtensionEventTypes.UNREGISTERED, onUnregistered)
                                            .off(last_hit_extensions_1.ExtensionEventTypes.LOG, onLog)
                                            .off(last_hit_extensions_1.ExtensionEventTypes.ERROR_LOG, onErrorLog);
                                    };
                                    return [4 /*yield*/, this.startupExtension(new last_hit_extensions_1.ExtensionPoint({
                                            id: this.getWorkspaceExtensionId(),
                                            name: 'temp-workspace-extension',
                                            description: '',
                                            folder: this.getWorkspaceExtensionFolder()
                                        }))];
                                case 1:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    return WorkspaceExtensionRegistry;
}(last_hit_extensions_1.ExtensionRegistry));
exports.WorkspaceExtensionRegistry = WorkspaceExtensionRegistry;

//# sourceMappingURL=replayer-extension-registry.js.map
