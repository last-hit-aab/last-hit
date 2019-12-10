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
var select2_1 = __importDefault(require("./select2"));
var thirdParties = [new select2_1.default()];
var ThirdStepSupport = /** @class */ (function () {
    function ThirdStepSupport(options) {
        this.page = options.page;
        this.element = options.element;
        this.tagNameRetrieve = options.tagNameRetrieve;
        this.elementTypeRetrieve = options.elementTypeRetrieve;
        this.classNamesRetrieve = options.classNamesRetrieve;
        this.attrValueRetrieve = options.attrValueRetrieve;
        this.steps = options.steps;
        this.currentStepIndex = options.currentStepIndex;
        this.logger = options.logger;
    }
    ThirdStepSupport.prototype.getPage = function () {
        return this.page;
    };
    ThirdStepSupport.prototype.getElement = function () {
        return this.element;
    };
    ThirdStepSupport.prototype.getTagName = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.tagNameRetrieve(this.element)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    ThirdStepSupport.prototype.getElementType = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.elementTypeRetrieve(this.element)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    ThirdStepSupport.prototype.getClassNames = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.classNamesRetrieve(this.element)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    ThirdStepSupport.prototype.getAttrValue = function (attrName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.attrValueRetrieve(this.element, attrName)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    ThirdStepSupport.prototype.getSteps = function () {
        return this.steps;
    };
    ThirdStepSupport.prototype.getCurrentStep = function () {
        return this.steps[this.getCurrentStepIndex()];
    };
    ThirdStepSupport.prototype.getCurrentStepIndex = function () {
        return this.currentStepIndex;
    };
    ThirdStepSupport.prototype.getLogger = function () {
        return this.logger;
    };
    // step execution
    ThirdStepSupport.prototype.mousedown = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.do('mousedown')];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    ThirdStepSupport.prototype.click = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.do('click')];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    ThirdStepSupport.prototype.do = function (methodName) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, thirdParties.reduce(function (promise, third) { return __awaiter(_this, void 0, void 0, function () {
                            var done, done_1;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, promise];
                                    case 1:
                                        done = _a.sent();
                                        if (done) {
                                            return [2 /*return*/, Promise.resolve(true)];
                                        }
                                        if (!third[methodName]) return [3 /*break*/, 3];
                                        return [4 /*yield*/, third[methodName](this)];
                                    case 2:
                                        done_1 = _a.sent();
                                        if (done_1) {
                                            return [2 /*return*/, Promise.resolve(true)];
                                        }
                                        _a.label = 3;
                                    case 3: return [2 /*return*/, Promise.resolve(false)];
                                }
                            });
                        }); }, Promise.resolve(false))];
                    case 1: 
                    // starts with a resolved promise
                    // if any third-party support handled step execution, should return a resolved promise with true
                    // otherwise return a resolved promise with false
                    // any previous third-party support handled, ignored the left third-party supports
                    return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return ThirdStepSupport;
}());
exports.default = ThirdStepSupport;

//# sourceMappingURL=support.js.map
