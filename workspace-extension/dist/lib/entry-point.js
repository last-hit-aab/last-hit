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
var path_1 = __importDefault(require("path"));
var decache_1 = __importDefault(require("decache"));
var IgnoreHandler = function () {
    return Promise.resolve({ ignore: true });
};
var AbstractWorkspaceExtensionEntryPoint = /** @class */ (function () {
    function AbstractWorkspaceExtensionEntryPoint() {
        this.handlers = {};
    }
    AbstractWorkspaceExtensionEntryPoint.prototype.findHandler = function (key, type, relativePath) {
        var handler = this.handlers[key];
        if (!handler) {
            var modulePath = path_1.default.join(this.getHandlerLocation(), relativePath);
            this.handlers[key] = { modulePath: modulePath, type: type };
            this.doReloadHandler(this.handlers[key]);
            handler = this.handlers[key];
            if (!handler.handle) {
                handler.handle = IgnoreHandler;
            }
        }
        return handler;
    };
    AbstractWorkspaceExtensionEntryPoint.prototype.handleEnvironmentPrepare = function (event, helpers) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.findHandler('env-prepare', 'env-prepare', 'env-prepare').handle(event, helpers)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    AbstractWorkspaceExtensionEntryPoint.prototype.handleStoryPrepare = function (event, helpers) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.findHandler("story-prepare@" + event.story.name, 'story-prepare', event.story.name + "/story-prepare").handle(event, helpers)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    AbstractWorkspaceExtensionEntryPoint.prototype.handleFlowShouldStart = function (event, helpers) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.findHandler("flow-should-start@" + event.flow.name + "@" + event.story.name, 'flow-should-start', event.story.name + "/" + event.flow.name + "/flow-should-start").handle(event, helpers)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    AbstractWorkspaceExtensionEntryPoint.prototype.handleFlowAccomplished = function (event, helpers) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.findHandler("flow-accomplished@" + event.flow.name + "@" + event.story.name, 'flow-accomplished', event.story.name + "/" + event.flow.name + "/flow-accomplished").handle(event, helpers)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    AbstractWorkspaceExtensionEntryPoint.prototype.handleStepShouldStart = function (event, helpers) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.findHandler("step-should-start@" + event.step.stepUuid + "@" + event.flow.name + "@" + event.story.name, 'step-should-start', event.story.name + "/" + event.flow.name + "/" + event.step.stepUuid + "/step-should-start").handle(event, helpers)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    AbstractWorkspaceExtensionEntryPoint.prototype.handleStepOnError = function (event, helpers) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.findHandler("step-on-error@" + event.step.stepUuid + "@" + event.flow.name + "@" + event.story.name, 'step-on-error', event.story.name + "/" + event.flow.name + "/" + event.step.stepUuid + "/step-on-error").handle(event, helpers)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    AbstractWorkspaceExtensionEntryPoint.prototype.handleStepAccomplished = function (event, helpers) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.findHandler("step-accomplished@" + event.step.stepUuid + "@" + event.flow.name + "@" + event.story.name, 'step-accomplished', event.story.name + "/" + event.flow.name + "/" + event.step.stepUuid + "/step-accomplished").handle(event, helpers)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    AbstractWorkspaceExtensionEntryPoint.prototype.handleReloadAllHandlers = function (event) {
        var _this = this;
        Object.values(this.handlers).forEach(function (handler) {
            _this.doReloadHandler(handler);
        });
        return Promise.resolve();
    };
    AbstractWorkspaceExtensionEntryPoint.prototype.handleReloadStoryHandler = function (event) {
        var _this = this;
        Object.values(this.handlers)
            .filter(function (handler) {
            return handler.story === event.story.name;
        })
            .forEach(function (handler) {
            _this.doReloadHandler(handler);
        });
        return Promise.resolve();
    };
    AbstractWorkspaceExtensionEntryPoint.prototype.handleReloadFlowHandler = function (event) {
        var _this = this;
        Object.values(this.handlers)
            .filter(function (handler) {
            return handler.story === event.story.name && handler.flow === event.flow.name;
        })
            .forEach(function (handler) {
            _this.doReloadHandler(handler);
        });
        return Promise.resolve();
    };
    AbstractWorkspaceExtensionEntryPoint.prototype.handleReloadStepHandler = function (event) {
        var _this = this;
        Object.values(this.handlers)
            .filter(function (handler) {
            return (handler.story === event.story.name &&
                handler.flow === event.flow.name &&
                handler.stepUuid === event.step.stepUuid);
        })
            .forEach(function (handler) {
            _this.doReloadHandler(handler);
        });
        return Promise.resolve();
    };
    AbstractWorkspaceExtensionEntryPoint.prototype.doReloadHandler = function (handler) {
        try {
            decache_1.default(handler.modulePath);
            var scripts = require(handler.modulePath);
            if (scripts && scripts.default) {
                handler.handle = scripts.default;
            }
            else {
                handler.handle = scripts;
            }
        }
        catch (e) {
            delete handler.handle;
            if (e.stack && e.stack.indexOf("'MODULE_NOT_FOUND'")) {
                // module not found, ignored
            }
            else {
                console.error("failed to reload handler[" + handler.modulePath + "]", e);
            }
        }
    };
    AbstractWorkspaceExtensionEntryPoint.prototype.activate = function () {
        if (this.getHandlerLocation()) {
            return Promise.resolve();
        }
        else {
            return Promise.reject(new Error('Handler location not defined.'));
        }
    };
    AbstractWorkspaceExtensionEntryPoint.prototype.getType = function () {
        return 'workspace';
    };
    return AbstractWorkspaceExtensionEntryPoint;
}());
exports.AbstractWorkspaceExtensionEntryPoint = AbstractWorkspaceExtensionEntryPoint;

//# sourceMappingURL=entry-point.js.map
