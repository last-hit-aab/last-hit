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
Object.defineProperty(exports, "__esModule", { value: true });
var types_1 = require("../../types");
var BrowserHelper = /** @class */ (function () {
    function BrowserHelper(helper) {
        this.helper = helper;
    }
    BrowserHelper.prototype.getHelper = function () {
        return this.helper;
    };
    BrowserHelper.prototype.isInIDE = function () {
        return this.getHelper().isInIDE();
    };
    BrowserHelper.prototype.buildTimeout = function (time, handler, reject) {
        var _this = this;
        if (time === void 0) { time = 5000; }
        return setTimeout(function () {
            _this.helper.off(types_1.ExtensionEventTypes.BROWSER_OPERATION, handler);
            reject(new Error('Timeout'));
        }, time);
    };
    BrowserHelper.prototype.getElementAttrValue = function (csspath, attrName, pageUuid) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var timeout;
            var onValue = function (value) {
                if (timeout) {
                    clearTimeout(timeout);
                }
                resolve(value);
            };
            _this.helper.once(types_1.ExtensionEventTypes.BROWSER_OPERATION, onValue);
            _this.helper.sendBrowserOperation({
                type: 'get-element-attr-value',
                csspath: csspath,
                attrName: attrName,
                pageUuid: pageUuid
            });
            timeout = _this.buildTimeout(5000, onValue, reject);
        });
    };
    BrowserHelper.prototype.getElementPropValue = function (csspath, propName, pageUuid) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var timeout;
            var onValue = function (value) {
                if (timeout) {
                    clearTimeout(timeout);
                }
                resolve(value);
            };
            _this.helper.once(types_1.ExtensionEventTypes.BROWSER_OPERATION, onValue);
            _this.helper.sendBrowserOperation({
                type: 'get-element-prop-value',
                csspath: csspath,
                propName: propName,
                pageUuid: pageUuid
            });
            timeout = _this.buildTimeout(5000, onValue, reject);
        });
    };
    BrowserHelper.prototype.wait = function (time) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var timeout;
            var onValue = function () {
                if (timeout) {
                    clearTimeout(timeout);
                }
                resolve();
            };
            _this.helper.once(types_1.ExtensionEventTypes.BROWSER_OPERATION, onValue);
            _this.helper.sendBrowserOperation({ type: 'wait', time: time });
            timeout = _this.buildTimeout(5000, onValue, reject);
        });
    };
    BrowserHelper.prototype.waitForElement = function (selector, time, pageUuid, options) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var timeout;
            var onValue = function () {
                if (timeout) {
                    clearTimeout(timeout);
                }
                resolve();
            };
            _this.helper.once(types_1.ExtensionEventTypes.BROWSER_OPERATION, onValue);
            _this.helper.sendBrowserOperation({
                type: 'wait-element',
                csspath: selector,
                pageUuid: pageUuid,
                time: time,
                options: options
            });
            timeout = _this.buildTimeout(time + 1000, onValue, reject);
        });
    };
    return BrowserHelper;
}());
var TestNode = /** @class */ (function () {
    function TestNode(title, passed, parent) {
        this.passed = false;
        this.level = -1;
        this.children = [];
        this.parent = null;
        this.title = title;
        this.passed = passed;
        if (parent) {
            this.parent = parent;
            this.parent.children.push(this);
            this.level = parent.level + 1;
        }
    }
    TestNode.prototype.getTitle = function () {
        return this.title;
    };
    TestNode.prototype.getMessage = function () {
        return this.message || '';
    };
    TestNode.prototype.setMessage = function (message) {
        this.message = message;
    };
    TestNode.prototype.getLevel = function () {
        return this.level;
    };
    TestNode.prototype.isPassed = function () {
        return this.passed;
    };
    TestNode.prototype.setPassed = function (passed) {
        this.passed = passed;
    };
    TestNode.prototype.getChildren = function () {
        return this.children;
    };
    TestNode.prototype.getParent = function () {
        return this.parent;
    };
    return TestNode;
}());
var TestHelper = /** @class */ (function () {
    function TestHelper(helper) {
        this.rootTestNode = new TestNode('root', true);
        this.currentTestNode = this.rootTestNode;
        this.helper = helper;
    }
    TestHelper.prototype.getHelper = function () {
        return this.helper;
    };
    TestHelper.prototype.sendTestLog = function (node, sendAnyway) {
        if (sendAnyway === void 0) { sendAnyway = false; }
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(node.getLevel() === 0 || sendAnyway)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.getHelper().sendTestLog(node.getTitle(), node.isPassed(), node.getLevel(), node.getMessage())];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, Promise.all((node.getChildren() || []).map(function (child) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, this.sendTestLog(child, true)];
                                    case 1: return [2 /*return*/, _a.sent()];
                                }
                            }); }); }))];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    TestHelper.prototype.test = function (title, fn) {
        return __awaiter(this, void 0, void 0, function () {
            var node, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        node = new TestNode(title, false, this.currentTestNode);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 6]);
                        this.currentTestNode = node;
                        return [4 /*yield*/, fn.call(this)];
                    case 2:
                        _a.sent();
                        node.setPassed(true);
                        return [4 /*yield*/, this.sendTestLog(node)];
                    case 3:
                        _a.sent();
                        this.currentTestNode = node.getParent();
                        return [3 /*break*/, 6];
                    case 4:
                        e_1 = _a.sent();
                        node.setPassed(false);
                        node.setMessage(e_1.message);
                        return [4 /*yield*/, this.sendTestLog(node)];
                    case 5:
                        _a.sent();
                        this.currentTestNode = node.getParent();
                        throw e_1;
                    case 6: return [2 /*return*/, this];
                }
            });
        });
    };
    return TestHelper;
}());
var WorkspaceExtensionEntryPointWrapper = /** @class */ (function (_super) {
    __extends(WorkspaceExtensionEntryPointWrapper, _super);
    function WorkspaceExtensionEntryPointWrapper(entrypoint, helper) {
        var _this = _super.call(this, entrypoint, helper) || this;
        _this.browserHelper = new BrowserHelper(helper);
        _this.testHelper = new TestHelper(helper);
        _this.handlers = {
            'env-prepare': entrypoint.handleEnvironmentPrepare,
            'story-prepare': entrypoint.handleStoryPrepare,
            'flow-should-start': entrypoint.handleFlowShouldStart,
            'flow-accomplished': entrypoint.handleFlowAccomplished,
            'step-should-start': entrypoint.handleStepShouldStart,
            'step-on-error': entrypoint.handleStepOnError,
            'step-accomplished': entrypoint.handleStepAccomplished,
            'reload-all-handlers': entrypoint.handleReloadAllHandlers,
            'reload-story-handler': entrypoint.handleReloadStoryHandler,
            'reload-flow-handler': entrypoint.handleReloadFlowHandler,
            'reload-step-handler': entrypoint.handleReloadStepHandler
        };
        return _this;
    }
    WorkspaceExtensionEntryPointWrapper.prototype.handle = function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var handler, result, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        handler = this.handlers[event.type];
                        if (!handler) return [3 /*break*/, 5];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, handler.call(this.getEntrypoint(), event, {
                                browser: this.browserHelper,
                                test: this.testHelper
                            })];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, this.getHelper().sendMessage(result)];
                    case 3:
                        e_2 = _a.sent();
                        return [2 /*return*/, this.getHelper().sendError(e_2)];
                    case 4: return [3 /*break*/, 6];
                    case 5: 
                    // console.error(`Handler not found for event[${event.type}]`);
                    // console.error(event);
                    return [2 /*return*/, this.getHelper().sendIgnore()];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    return WorkspaceExtensionEntryPointWrapper;
}(types_1.AbstractExtensionEntryPointWrapper));
exports.WorkspaceExtensionEntryPointWrapper = WorkspaceExtensionEntryPointWrapper;

//# sourceMappingURL=workspace.js.map
