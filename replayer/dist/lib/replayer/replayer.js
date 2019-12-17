"use strict";
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = __importDefault(require("fs"));
var last_hit_extensions_1 = require("last-hit-extensions");
var path_1 = __importDefault(require("path"));
var puppeteer_1 = __importDefault(require("puppeteer"));
var util_1 = __importDefault(require("util"));
var v4_1 = __importDefault(require("uuid/v4"));
var support_1 = __importDefault(require("../3rd-comps/support"));
var utils_1 = require("../utils");
var ci_helper_1 = __importDefault(require("./ci-helper"));
var compare_screenshot_1 = __importDefault(require("./compare-screenshot"));
var page_controller_1 = require("./page-controller");
var replay_summary_1 = __importDefault(require("./replay-summary"));
var request_counter_1 = __importDefault(require("./request-counter"));
var ssim_1 = __importDefault(require("./ssim"));
var getChromiumExecPath = function () {
    return puppeteer_1.default.executablePath().replace('app.asar', 'app.asar.unpacked');
};
var launchBrowser = function (replayer) { return __awaiter(void 0, void 0, void 0, function () {
    var step, _a, url, device, uuid, _b, width, height, browserArgs, browser, pages, page, accomplishedStep;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                step = replayer.getCurrentStep();
                return [4 /*yield*/, replayer
                        .getRegistry()
                        .stepShouldStart(replayer.getStoryName(), simplifyFlow(replayer.getFlow()), step)];
            case 1:
                // send step-should-start to extension, replace step when successfully return
                step = _c.sent();
                _a = step, url = _a.url, device = _a.device, uuid = _a.uuid;
                _b = device.viewport, width = _b.width, height = _b.height;
                browserArgs = [];
                browserArgs.push("--window-size=" + width + "," + (height + 150));
                browserArgs.push('--disable-infobars');
                browserArgs.push('--ignore-certificate-errors');
                browserArgs.push('--no-sandbox');
                browserArgs.push('--disable-extensions');
                return [4 /*yield*/, puppeteer_1.default.launch({
                        headless: !utils_1.inElectron,
                        executablePath: getChromiumExecPath(),
                        args: browserArgs,
                        defaultViewport: null,
                        slowMo: 20
                    })];
            case 2:
                browser = _c.sent();
                return [4 /*yield*/, browser.pages()];
            case 3:
                pages = _c.sent();
                if (!(pages != null && pages.length > 0)) return [3 /*break*/, 4];
                page = pages[0];
                return [3 /*break*/, 6];
            case 4: return [4 /*yield*/, browser.newPage()];
            case 5:
                page = _c.sent();
                _c.label = 6;
            case 6:
                // set back to replayer
                replayer.setBrowser(browser);
                replayer.putPage(uuid, page, true);
                replayer.setDevice(device);
                // add control into page
                return [4 /*yield*/, page_controller_1.controlPage(replayer, page, device, uuid)];
            case 7:
                // add control into page
                _c.sent();
                // open url, timeout to 2 mins
                return [4 /*yield*/, page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 })];
            case 8:
                // open url, timeout to 2 mins
                _c.sent();
                return [4 /*yield*/, replayer
                        .getRegistry()
                        .stepAccomplished(replayer.getStoryName(), simplifyFlow(replayer.getFlow()), step)];
            case 9:
                accomplishedStep = _c.sent();
                if (!accomplishedStep._.passed) {
                    // extension says failed
                    throw accomplishedStep._.error;
                }
                return [2 /*return*/, page];
        }
    });
}); };
var simplifyFlow = function (flow) {
    var name = flow.name, description = flow.description;
    return { name: name, description: description };
};
var Replayer = /** @class */ (function () {
    function Replayer(options) {
        var _this = this;
        this.device = null;
        this.browser = null;
        /** key is uuid, value is page */
        this.pages = {};
        this.currentIndex = 0;
        /** key is uuid, value is request counter */
        this.requests = {};
        this.coverages = [];
        /** true when switch to record, never turn back to false again */
        this.onRecord = false;
        this.flowInput = {};
        this.flowOutput = {};
        this.testLogs = [];
        this.handleExtensionLog = function (event) {
            _this.getLogger().log(event);
        };
        this.handleExtensionErrorLog = function (event) {
            _this.getLogger().error(event);
        };
        this.handlerBrowserOperation = function (event) {
            var data = event.data;
            switch (data.type) {
                case 'get-element-attr-value':
                    _this.tryToGetElementAttrValue(data);
                    break;
                case 'get-element-prop-value':
                    _this.tryToGetElementPropValue(data);
                    break;
                default:
                    var registry = _this.getRegistry();
                    registry.sendBrowserOperation(registry.getWorkspaceExtensionId(), null);
            }
        };
        this.handleTestLog = function (event) {
            // console.log(event);
            _this.testLogs.push(event.data);
        };
        var storyName = options.storyName, flow = options.flow, env = options.env, logger = options.logger, replayers = options.replayers, registry = options.registry;
        this.storyName = storyName;
        this.flow = (function () {
            var _a = flow.steps, steps = _a === void 0 ? [] : _a, rest = __rest(flow, ["steps"]);
            return __assign(__assign({}, rest), { steps: steps.map(function (step) { return env.wrap(step); }) });
        })();
        this.logger = logger;
        this.summary = new replay_summary_1.default({ storyName: storyName, flow: flow, env: env });
        this.replayers = replayers;
        this.env = env;
        this.registry = registry;
        this.registry
            .on(last_hit_extensions_1.ExtensionEventTypes.LOG, this.handleExtensionLog)
            .on(last_hit_extensions_1.ExtensionEventTypes.ERROR_LOG, this.handleExtensionErrorLog)
            .on(last_hit_extensions_1.ExtensionEventTypes.BROWSER_OPERATION, this.handlerBrowserOperation)
            .on(last_hit_extensions_1.ExtensionEventTypes.TEST_LOG, this.handleTestLog);
    }
    Replayer.prototype.getFlowInput = function () {
        return this.flowInput;
    };
    Replayer.prototype.getFlowOutput = function () {
        return this.flowOutput;
    };
    Replayer.prototype.getTestLogs = function () {
        return this.testLogs;
    };
    Replayer.prototype.findCurrentPage = function (uuid) {
        return __awaiter(this, void 0, void 0, function () {
            var page, pages;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!uuid) return [3 /*break*/, 1];
                        page = this.getPage(uuid);
                        if (!page) {
                            throw new Error("page[" + uuid + "] not found");
                        }
                        return [2 /*return*/, page];
                    case 1: return [4 /*yield*/, this.getBrowser().pages()];
                    case 2:
                        pages = _a.sent();
                        if (pages.length === 0) {
                            throw new Error("No page now");
                        }
                        else {
                            return [2 /*return*/, pages[0]];
                        }
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    Replayer.prototype.tryToGetElementAttrValue = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var csspath, attrName, pageUuid, registry, page, element, value, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        csspath = data.csspath, attrName = data.attrName, pageUuid = data.pageUuid;
                        registry = this.getRegistry();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 6]);
                        return [4 /*yield*/, this.findCurrentPage(pageUuid)];
                    case 2:
                        page = _a.sent();
                        return [4 /*yield*/, page.$(csspath)];
                    case 3:
                        element = _a.sent();
                        if (!element) {
                            throw new Error("element[" + csspath + "] not found");
                        }
                        return [4 /*yield*/, element.evaluate(function (node, attrName) { return node.getAttribute(attrName); }, attrName)];
                    case 4:
                        value = _a.sent();
                        registry.sendBrowserOperation(registry.getWorkspaceExtensionId(), value);
                        return [3 /*break*/, 6];
                    case 5:
                        e_1 = _a.sent();
                        registry.sendBrowserOperation(registry.getWorkspaceExtensionId(), e_1);
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    Replayer.prototype.tryToGetElementPropValue = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var csspath, propName, pageUuid, registry, page, element, value, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        csspath = data.csspath, propName = data.propName, pageUuid = data.pageUuid;
                        registry = this.getRegistry();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 6]);
                        return [4 /*yield*/, this.findCurrentPage(pageUuid)];
                    case 2:
                        page = _a.sent();
                        return [4 /*yield*/, page.$(csspath)];
                    case 3:
                        element = _a.sent();
                        if (!element) {
                            throw new Error("element[" + csspath + "] not found");
                        }
                        return [4 /*yield*/, element.evaluate(function (node, propName) { return node[propName]; }, propName)];
                    case 4:
                        value = _a.sent();
                        registry.sendBrowserOperation(registry.getWorkspaceExtensionId(), value);
                        return [3 /*break*/, 6];
                    case 5:
                        e_2 = _a.sent();
                        registry.sendBrowserOperation(registry.getWorkspaceExtensionId(), e_2);
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    Replayer.prototype.getRegistry = function () {
        return this.registry;
    };
    Replayer.prototype.switchToRecord = function () {
        this.onRecord = true;
        return this.browser;
    };
    Replayer.prototype.isOnRecord = function () {
        return this.onRecord;
    };
    Replayer.prototype.getLogger = function () {
        return this.logger;
    };
    Replayer.prototype.getEnvironment = function () {
        return this.env;
    };
    Replayer.prototype.getStoryName = function () {
        return this.storyName;
    };
    Replayer.prototype.getFlow = function () {
        return this.flow;
    };
    Replayer.prototype.getIdentity = function () {
        return utils_1.generateKeyByString(this.getStoryName(), this.getFlow().name);
    };
    /**
     * @returns summary object
     */
    Replayer.prototype.getSummary = function () {
        return this.summary;
    };
    Replayer.prototype.getSummaryData = function () {
        return this.summary.getSummary();
    };
    Replayer.prototype.getCoverageData = function () {
        return this.coverages;
    };
    Replayer.prototype.getSteps = function () {
        return this.flow.steps || [];
    };
    Replayer.prototype.getCurrentIndex = function () {
        return this.currentIndex;
    };
    Replayer.prototype.getCurrentStep = function () {
        return this.getSteps()[this.getCurrentIndex()];
    };
    /**
     * @returns null only if not start
     */
    Replayer.prototype.getBrowser = function () {
        return this.browser;
    };
    Replayer.prototype.setBrowser = function (browser) {
        this.browser = browser;
    };
    Replayer.prototype.getDevice = function () {
        return this.device;
    };
    Replayer.prototype.setDevice = function (device) {
        this.device = device;
    };
    Replayer.prototype.findUuid = function (page) {
        var _this = this;
        return Object.keys(this.pages).find(function (id) { return _this.pages[id] === page; });
    };
    Replayer.prototype.getPage = function (uuid) {
        return this.pages[uuid];
    };
    /**
     * get page by given uuid, throw error when not found
     */
    Replayer.prototype.getPageOrThrow = function (uuid) {
        return __awaiter(this, void 0, void 0, function () {
            var page;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        page = this.getPage(uuid);
                        if (page == null) {
                            throw new Error('Page not found.');
                        }
                        return [4 /*yield*/, page.bringToFront()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, page];
                }
            });
        });
    };
    /**
     * sometimes page speed is very slow, the page-create, page-switch, popup events are not always in correct order on recording.
     *
     * @param force force close exists page when true, force close myself when false
     * @returns true when successfully put, false means given page has been closed forcely
     */
    Replayer.prototype.putPage = function (uuid, page, force) {
        if (this.pages[uuid] != null) {
            // already exists
            if (force) {
                // force is true means given is from popup, then exists is from page-created or page-switched
                // force close exists and put given to cache
                var exists = this.pages[uuid];
                delete this.pages[uuid];
                delete this.requests[uuid];
                exists.close();
                this.pages[uuid] = page;
                this.requests[uuid] = new request_counter_1.default(page, this.getSummary(), this.getLogger());
                return true;
            }
            else {
                // force is true means given is from page-created or page-switched, then force close given itself
                // keep cache
                page.close();
                return false;
            }
        }
        else {
            // not found, put into cache
            this.pages[uuid] = page;
            this.requests[uuid] = new request_counter_1.default(page, this.getSummary(), this.getLogger());
            return true;
        }
    };
    /**
     * @return removed page or null if not exists
     */
    Replayer.prototype.removePage = function (uuidOrPage) {
        if (typeof uuidOrPage === 'string') {
            var page = this.pages[uuidOrPage];
            delete this.pages[uuidOrPage];
            delete this.requests[uuidOrPage];
            return page;
        }
        else {
            var uuid = this.findUuid(uuidOrPage);
            delete this.pages[uuid];
            delete this.requests[uuid];
            return uuidOrPage;
        }
    };
    Replayer.prototype.putRequest = function (uuid, request) {
        var requests = this.requests[uuid];
        if (requests) {
            this.requests[uuid].create(request);
        }
    };
    Replayer.prototype.offsetRequest = function (uuid, request, success) {
        var requests = this.requests[uuid];
        if (requests) {
            requests.offset(request, success);
        }
    };
    Replayer.prototype.isRemoteFinsihed = function (page) {
        return __awaiter(this, void 0, void 0, function () {
            var uuid, requests, type, currentStepIndex, nextStep;
            return __generator(this, function (_a) {
                uuid = this.findUuid(page);
                requests = this.requests[uuid];
                type = this.getCurrentStep().type;
                if (['page-switched', 'page-created'].includes(type)) {
                    return [2 /*return*/, requests.waitForAllDone()];
                }
                if (['scroll'].includes(type)) {
                    return [2 /*return*/, new Promise(function (resolve) { return setTimeout(resolve, 30); })];
                }
                currentStepIndex = this.getCurrentIndex();
                nextStep = this.getSteps()[currentStepIndex + 1];
                if (nextStep && nextStep.type === 'ajax') {
                    return [2 /*return*/, requests.waitForAllDone()];
                }
                else {
                    // wait for several milliseconds, maybe there is some animation or dom changes
                    return [2 /*return*/, new Promise(function (resolve) { return setTimeout(resolve, 30); })];
                }
                return [2 /*return*/];
            });
        });
    };
    Replayer.prototype.sleepAfterStep = function (step) {
        return __awaiter(this, void 0, void 0, function () {
            var sleep, wait;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sleep = step.sleep;
                        if (!(sleep && sleep > 0)) return [3 /*break*/, 2];
                        wait = util_1.default.promisify(setTimeout);
                        return [4 /*yield*/, wait(sleep)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    Replayer.prototype.prepareFlow = function () {
        return __awaiter(this, void 0, void 0, function () {
            var preparedFlow, _a, _b, input, _c, params;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, this.getRegistry().flowShouldStart(this.getStoryName(), simplifyFlow(this.getFlow()))];
                    case 1:
                        preparedFlow = _d.sent();
                        _a = (preparedFlow || { _: { input: {} } })._, _b = (_a === void 0 ? { input: {} } : _a).input, input = _b === void 0 ? {} : _b;
                        if (Object.keys(input).length === 0) {
                            _c = this.getFlow().params, params = _c === void 0 ? [] : _c;
                            this.flowInput = params
                                .filter(function (param) { return ['in', 'both'].includes(param.type); })
                                .reduce(function (input, param) {
                                input[param.name] = param.value;
                                return input;
                            }, {});
                        }
                        else {
                            this.flowInput = input;
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    Replayer.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var preparedStory, page;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getRegistry().prepareStory(this.getStoryName())];
                    case 1:
                        preparedStory = _a.sent();
                        return [4 /*yield*/, this.prepareFlow()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, launchBrowser(this)];
                    case 3:
                        page = _a.sent();
                        return [4 /*yield*/, this.isRemoteFinsihed(page)];
                    case 4:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Replayer.prototype.accomplishFlow = function () {
        return __awaiter(this, void 0, void 0, function () {
            var accomplishedFlow, _a, _b, output, _c, params;
            var _this = this;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, this.getRegistry().flowAccomplished(this.getStoryName(), simplifyFlow(this.getFlow()))];
                    case 1:
                        accomplishedFlow = _d.sent();
                        _a = (accomplishedFlow || { _: { output: {} } })._, _b = (_a === void 0 ? { output: {} } : _a).output, output = _b === void 0 ? {} : _b;
                        if (Object.keys(output).length === 0) {
                            _c = this.getFlow().params, params = _c === void 0 ? [] : _c;
                            this.flowOutput = params
                                .filter(function (param) { return ['out', 'both'].includes(param.type); })
                                .reduce(function (output, param) {
                                output[param.name] = _this.flowInput[param.name];
                                if (typeof output[param.name] === 'undefined') {
                                    // not found in flow input, find in definition
                                    output[param.name] = param.value;
                                }
                                return output;
                            }, {});
                        }
                        else {
                            this.flowOutput = output;
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * only called in CI
     */
    Replayer.prototype.end = function (close) {
        return __awaiter(this, void 0, void 0, function () {
            var browser, pages, _a, e_3, e_4;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        browser = this.getBrowser();
                        if (!(browser == null)) return [3 /*break*/, 1];
                        return [3 /*break*/, 11];
                    case 1: return [4 /*yield*/, this.accomplishFlow()];
                    case 2:
                        _b.sent();
                        this.getSummary().handleFlowParameters(this.getFlowInput(), this.getFlowOutput());
                        this.getSummary().handleScriptTests(this.getTestLogs());
                        _b.label = 3;
                    case 3:
                        _b.trys.push([3, 6, , 7]);
                        return [4 /*yield*/, browser.pages()];
                    case 4:
                        pages = _b.sent();
                        _a = this;
                        return [4 /*yield*/, ci_helper_1.default.gatherCoverage(pages)];
                    case 5:
                        _a.coverages = _b.sent();
                        browser.disconnect();
                        return [3 /*break*/, 7];
                    case 6:
                        e_3 = _b.sent();
                        this.getLogger().error('Failed to disconnect from brwoser.');
                        this.getLogger().error(e_3);
                        return [3 /*break*/, 7];
                    case 7:
                        if (!close) return [3 /*break*/, 11];
                        _b.label = 8;
                    case 8:
                        _b.trys.push([8, 10, , 11]);
                        return [4 /*yield*/, browser.close()];
                    case 9:
                        _b.sent();
                        delete this.replayers[this.getIdentity()];
                        return [3 /*break*/, 11];
                    case 10:
                        e_4 = _b.sent();
                        this.getLogger().error('Failed to close browser.');
                        this.getLogger().error(e_4);
                        return [3 /*break*/, 11];
                    case 11:
                        this.registry
                            .off(last_hit_extensions_1.ExtensionEventTypes.LOG, this.handleExtensionLog)
                            .off(last_hit_extensions_1.ExtensionEventTypes.ERROR_LOG, this.handleExtensionErrorLog);
                        return [2 /*return*/];
                }
            });
        });
    };
    Replayer.prototype.replaceWithFlowParams = function (step) {
        var _this = this;
        var newStep = __assign({}, step);
        ['checked', 'value'].forEach(function (propName) {
            var value = step[propName];
            if (!value || typeof value !== 'string') {
                return;
            }
            var flowInput = _this.getFlowInput();
            newStep[propName] = Object.keys(flowInput).reduce(function (value, key) {
                return value.replace("${" + key + "}", "" + (flowInput[key] || ''));
            }, value);
        });
        return newStep;
    };
    /**
     * do next step
     */
    Replayer.prototype.next = function (flow, index, storyName) {
        return __awaiter(this, void 0, void 0, function () {
            var step, ret, page, screenshotPath, flowPath, replayImage, replayImageFilename, currentImageFilename, ssimData, diffImage, diffImageFilename_1, e_5, stepOnError, accomplishedStep;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.flow = flow;
                        this.currentIndex = index;
                        step = this.getCurrentStep();
                        if (step.type === 'end') {
                            return [2 /*return*/];
                        }
                        step = this.replaceWithFlowParams(step);
                        return [4 /*yield*/, this.getRegistry().stepShouldStart(this.getStoryName(), simplifyFlow(this.getFlow()), step)];
                    case 1:
                        // send step-should-start to extension, replace step when successfully return
                        step = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 10, , 13]);
                        return [4 /*yield*/, (function () { return __awaiter(_this, void 0, void 0, function () {
                                var _a;
                                var _this = this;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _a = step.type;
                                            switch (_a) {
                                                case 'change': return [3 /*break*/, 1];
                                                case 'click': return [3 /*break*/, 3];
                                                case 'focus': return [3 /*break*/, 5];
                                                case 'keydown': return [3 /*break*/, 7];
                                                case 'mousedown': return [3 /*break*/, 9];
                                                case 'animation': return [3 /*break*/, 11];
                                                case 'ajax': return [3 /*break*/, 13];
                                                case 'scroll': return [3 /*break*/, 15];
                                                case 'dialog-open': return [3 /*break*/, 17];
                                                case 'dialog-close': return [3 /*break*/, 19];
                                                case 'page-created': return [3 /*break*/, 21];
                                                case 'page-switched': return [3 /*break*/, 23];
                                                case 'page-closed': return [3 /*break*/, 25];
                                                case 'end': return [3 /*break*/, 27];
                                            }
                                            return [3 /*break*/, 28];
                                        case 1: return [4 /*yield*/, this.executeChangeStep(step)];
                                        case 2: return [2 /*return*/, _b.sent()];
                                        case 3: return [4 /*yield*/, this.executeClickStep(step)];
                                        case 4: return [2 /*return*/, _b.sent()];
                                        case 5: return [4 /*yield*/, this.executeFocusStep(step)];
                                        case 6: return [2 /*return*/, _b.sent()];
                                        case 7: return [4 /*yield*/, this.executeKeydownStep(step)];
                                        case 8: return [2 /*return*/, _b.sent()];
                                        case 9: return [4 /*yield*/, this.executeMousedownStep(step)];
                                        case 10: return [2 /*return*/, _b.sent()];
                                        case 11: return [4 /*yield*/, this.executeAnimationStep(step)];
                                        case 12: return [2 /*return*/, _b.sent()];
                                        case 13: return [4 /*yield*/, (function () { return __awaiter(_this, void 0, void 0, function () {
                                                return __generator(this, function (_a) {
                                                    switch (_a.label) {
                                                        case 0: return [4 /*yield*/, this.executeAjaxStep(step)];
                                                        case 1:
                                                            _a.sent();
                                                            return [2 /*return*/, Promise.resolve({ wait: false })];
                                                    }
                                                });
                                            }); })()];
                                        case 14: return [2 /*return*/, _b.sent()];
                                        case 15: return [4 /*yield*/, this.executeScrollStep(step)];
                                        case 16: return [2 /*return*/, _b.sent()];
                                        case 17: return [4 /*yield*/, this.executeDialogOpenStep(step)];
                                        case 18: return [2 /*return*/, _b.sent()];
                                        case 19: return [4 /*yield*/, this.executeDialogCloseStep(step)];
                                        case 20: return [2 /*return*/, _b.sent()];
                                        case 21: return [4 /*yield*/, this.executePageCreatedStep(step)];
                                        case 22: return [2 /*return*/, _b.sent()];
                                        case 23: return [4 /*yield*/, this.executePageSwitchedStep(step)];
                                        case 24: return [2 /*return*/, _b.sent()];
                                        case 25: return [4 /*yield*/, (function () { return __awaiter(_this, void 0, void 0, function () {
                                                return __generator(this, function (_a) {
                                                    switch (_a.label) {
                                                        case 0: return [4 /*yield*/, this.executePageClosedStep(step)];
                                                        case 1:
                                                            _a.sent();
                                                            return [2 /*return*/, Promise.resolve({ wait: false })];
                                                    }
                                                });
                                            }); })()];
                                        case 26: return [2 /*return*/, _b.sent()];
                                        case 27: return [2 /*return*/, Promise.resolve({ wait: false })];
                                        case 28:
                                            this.getLogger().log("Step[" + step.type + "] is not implemented yet.");
                                            return [2 /*return*/, Promise.resolve()];
                                    }
                                });
                            }); })()];
                    case 3:
                        ret = _a.sent();
                        page = this.getPage(step.uuid);
                        if (!((!ret || ret.wait !== false) && page != null)) return [3 /*break*/, 5];
                        // const page = await this.getPageOrThrow(step.uuid);
                        return [4 /*yield*/, this.isRemoteFinsihed(page)];
                    case 4:
                        // const page = await this.getPageOrThrow(step.uuid);
                        _a.sent();
                        _a.label = 5;
                    case 5: return [4 /*yield*/, this.sleepAfterStep(step)];
                    case 6:
                        _a.sent();
                        if (!(step.image && page != null && !page.isClosed())) return [3 /*break*/, 9];
                        screenshotPath = path_1.default.join(utils_1.getTempFolder(process.cwd()), 'screen-record');
                        if (!fs_1.default.existsSync(screenshotPath)) {
                            fs_1.default.mkdirSync(screenshotPath, { recursive: true });
                        }
                        flowPath = path_1.default.join(screenshotPath, storyName, flow.name);
                        if (!fs_1.default.existsSync(flowPath)) {
                            fs_1.default.mkdirSync(flowPath, { recursive: true });
                        }
                        return [4 /*yield*/, page.screenshot({ encoding: 'base64' })];
                    case 7:
                        replayImage = _a.sent();
                        replayImageFilename = path_1.default.join(flowPath, step.stepUuid + '_replay.png');
                        fs_1.default.writeFileSync(replayImageFilename, Buffer.from(replayImage, 'base64'));
                        currentImageFilename = path_1.default.join(flowPath, step.stepUuid + '_baseline.png');
                        fs_1.default.writeFileSync(currentImageFilename, Buffer.from(step.image, 'base64'));
                        return [4 /*yield*/, ssim_1.default(currentImageFilename, replayImageFilename)];
                    case 8:
                        ssimData = _a.sent();
                        if (ssimData.ssim < 0.96 || ssimData.mcs < 0.96) {
                            diffImage = compare_screenshot_1.default(step.image, replayImage);
                            diffImageFilename_1 = path_1.default.join(flowPath, step.stepUuid + '_diff.png');
                            diffImage.onComplete(function (data) {
                                _this.getSummary().compareScreenshot(step);
                                data.getDiffImage()
                                    .pack()
                                    .pipe(fs_1.default.createWriteStream(diffImageFilename_1));
                            });
                        }
                        _a.label = 9;
                    case 9: return [3 /*break*/, 13];
                    case 10:
                        e_5 = _a.sent();
                        // console.error(e);
                        return [4 /*yield*/, this.handleStepError(step, e_5)];
                    case 11:
                        // console.error(e);
                        _a.sent();
                        return [4 /*yield*/, this.getRegistry().stepOnError(this.getStoryName(), simplifyFlow(this.getFlow()), step, e_5)];
                    case 12:
                        stepOnError = _a.sent();
                        if (!stepOnError._.fixed) {
                            // extension says not fixed, throw error
                            throw e_5;
                        }
                        else {
                            // extension says fixed, ignore error and continue replay
                            return [2 /*return*/];
                        }
                        return [3 /*break*/, 13];
                    case 13: return [4 /*yield*/, this.getRegistry().stepAccomplished(this.getStoryName(), simplifyFlow(this.getFlow()), step)];
                    case 14:
                        accomplishedStep = _a.sent();
                        if (!!accomplishedStep._.passed) return [3 /*break*/, 16];
                        // extension says failed
                        return [4 /*yield*/, this.handleStepError(step, accomplishedStep._.error)];
                    case 15:
                        // extension says failed
                        _a.sent();
                        throw accomplishedStep._.error;
                    case 16: return [2 /*return*/];
                }
            });
        });
    };
    Replayer.prototype.handleStepError = function (step, e) {
        return __awaiter(this, void 0, void 0, function () {
            var page, file_path;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        page = this.getPage(step.uuid);
                        this.getSummary().handleError(step, e);
                        file_path = utils_1.getTempFolder(process.cwd()) + "/error-" + step.uuid + "-" + this.getSteps().indexOf(step) + ".png";
                        if (!page) return [3 /*break*/, 2];
                        return [4 /*yield*/, page.screenshot({ path: file_path, type: 'png' })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        this.getLogger().log("page don't exsit ");
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    Replayer.prototype.executeChangeStep = function (step) {
        return __awaiter(this, void 0, void 0, function () {
            var page, xpath, element, elementTagName, elementType, isFileUpload, value, segments, filename, dir, filepath, byteString, ab, ia, i, fileChooser, env, wait;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getPageOrThrow(step.uuid)];
                    case 1:
                        page = _a.sent();
                        xpath = this.transformStepPathToXPath(step.path);
                        this.getLogger().log("Execute change, step path is " + xpath + ", step value is " + step.value + ".");
                        return [4 /*yield*/, this.findElement(step, page)];
                    case 2:
                        element = _a.sent();
                        return [4 /*yield*/, this.getElementTagName(element)];
                    case 3:
                        elementTagName = _a.sent();
                        return [4 /*yield*/, this.getElementType(element)];
                    case 4:
                        elementType = _a.sent();
                        isFileUpload = false;
                        if (elementTagName === 'INPUT') {
                            if (elementType === 'file') {
                                isFileUpload = true;
                            }
                        }
                        if (!isFileUpload) return [3 /*break*/, 7];
                        value = step.value;
                        segments = value.split('\\');
                        segments = segments[segments.length - 1].split('/');
                        filename = segments[segments.length - 1];
                        dir = path_1.default.join(utils_1.getTempFolder(process.cwd()), 'upload-temp', v4_1.default());
                        filepath = path_1.default.join(dir, filename);
                        byteString = atob(step.file.split(',')[1]);
                        ab = new ArrayBuffer(byteString.length);
                        ia = new Uint8Array(ab);
                        // set the bytes of the buffer to the correct values
                        for (i = 0; i < byteString.length; i++) {
                            ia[i] = byteString.charCodeAt(i);
                        }
                        // write the ArrayBuffer to a blob, and you're done
                        fs_1.default.mkdirSync(dir, { recursive: true });
                        fs_1.default.writeFileSync(filepath, Buffer.from(ia));
                        return [4 /*yield*/, Promise.all([
                                page.waitForFileChooser(),
                                element.evaluate(function (node) { return node.click(); })
                            ])];
                    case 5:
                        fileChooser = (_a.sent())[0];
                        return [4 /*yield*/, fileChooser.accept([filepath])];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 12];
                    case 7: 
                    // change is change only, cannot use type
                    return [4 /*yield*/, this.setValueToElement(element, step.value)];
                    case 8:
                        // change is change only, cannot use type
                        _a.sent();
                        env = this.getEnvironment();
                        if (!env.getSleepAfterChange()) return [3 /*break*/, 10];
                        wait = util_1.default.promisify(setTimeout);
                        return [4 /*yield*/, wait(env.getSleepAfterChange())];
                    case 9:
                        _a.sent();
                        _a.label = 10;
                    case 10:
                        if (!step.forceBlur) return [3 /*break*/, 12];
                        return [4 /*yield*/, element.evaluate(function (node) {
                                node.focus && node.focus();
                                var event = document.createEvent('HTMLEvents');
                                event.initEvent('blur', true, true);
                                node.dispatchEvent(event);
                            })];
                    case 11:
                        _a.sent();
                        _a.label = 12;
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    Replayer.prototype.executeClickStep = function (step) {
        return __awaiter(this, void 0, void 0, function () {
            var page, xpath, element, elementTagName, wait, support, done, elementType, value, checked, visible;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getPageOrThrow(step.uuid)];
                    case 1:
                        page = _a.sent();
                        xpath = this.transformStepPathToXPath(step.path);
                        this.getLogger().log("Execute click, step path is " + xpath + ".");
                        return [4 /*yield*/, this.findElement(step, page)];
                    case 2:
                        element = _a.sent();
                        return [4 /*yield*/, this.getElementTagName(element)];
                    case 3:
                        elementTagName = _a.sent();
                        if (!(step.csspath || '').startsWith('#last-hit-wechat-share')) return [3 /*break*/, 6];
                        wait = util_1.default.promisify(setTimeout);
                        return [4 /*yield*/, wait(5000)];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, element.click()];
                    case 5:
                        _a.sent();
                        return [2 /*return*/];
                    case 6:
                        support = this.createThirdStepSupport(page, element);
                        return [4 /*yield*/, support.click()];
                    case 7:
                        done = _a.sent();
                        if (done) {
                            return [2 /*return*/];
                        }
                        if (!(elementTagName === 'INPUT')) return [3 /*break*/, 12];
                        return [4 /*yield*/, this.getElementType(element)];
                    case 8:
                        elementType = _a.sent();
                        if (!(elementType && ['checkbox', 'radio'].includes(elementType.toLowerCase()))) return [3 /*break*/, 11];
                        return [4 /*yield*/, this.getElementValue(element)];
                    case 9:
                        value = _a.sent();
                        return [4 /*yield*/, this.getElementChecked(element)];
                    case 10:
                        checked = _a.sent();
                        if (value == step.value && checked == step.checked) {
                            // ignore this click, the value and checked is already same as step does
                            this.getLogger().log('Click excution is ignored because of value and checked are matched, it was invoked by javascript or something else already.');
                            return [2 /*return*/];
                        }
                        return [3 /*break*/, 12];
                    case 11:
                        if (elementType === 'file') {
                            // click on a input[type=file] will introduce a file chooser dialog
                            // which cannot be resolved programatically
                            // ignore it
                            return [2 /*return*/];
                        }
                        _a.label = 12;
                    case 12: return [4 /*yield*/, this.isElementVisible(element)];
                    case 13:
                        visible = _a.sent();
                        if (!visible) return [3 /*break*/, 15];
                        return [4 /*yield*/, element.click()];
                    case 14:
                        _a.sent();
                        return [3 /*break*/, 17];
                    case 15: return [4 /*yield*/, element.evaluate(function (node) { return node.click(); })];
                    case 16:
                        _a.sent();
                        _a.label = 17;
                    case 17: return [2 /*return*/];
                }
            });
        });
    };
    Replayer.prototype.executeFocusStep = function (step) {
        return __awaiter(this, void 0, void 0, function () {
            var page, xpath, element;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getPageOrThrow(step.uuid)];
                    case 1:
                        page = _a.sent();
                        xpath = this.transformStepPathToXPath(step.path);
                        this.getLogger().log("Execute focus, step path is " + xpath + ".");
                        return [4 /*yield*/, this.findElement(step, page)];
                    case 2:
                        element = _a.sent();
                        return [4 /*yield*/, element.evaluate(function (node) {
                                node.focus && node.focus();
                                var event = document.createEvent('HTMLEvents');
                                event.initEvent('focus', true, true);
                                node.dispatchEvent(event);
                            })];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Replayer.prototype.executeKeydownStep = function (step) {
        return __awaiter(this, void 0, void 0, function () {
            var page, xpath, value, steps, currentIndex, element, elementTagName, elementType, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.getPageOrThrow(step.uuid)];
                    case 1:
                        page = _b.sent();
                        xpath = this.transformStepPathToXPath(step.path);
                        value = step.value;
                        this.getLogger().log("Execute keydown, step path is " + xpath + ", key is " + value);
                        steps = this.getSteps();
                        currentIndex = this.getCurrentIndex();
                        if (!(steps[currentIndex + 1].type === 'change')) return [3 /*break*/, 5];
                        if (!(step.target === steps[currentIndex + 1].target)) return [3 /*break*/, 5];
                        if (!(steps[currentIndex + 2].type === 'click')) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.findElement(steps[currentIndex + 2], page)];
                    case 2:
                        element = _b.sent();
                        return [4 /*yield*/, this.getElementTagName(element)];
                    case 3:
                        elementTagName = _b.sent();
                        return [4 /*yield*/, this.getElementType(element)];
                    case 4:
                        elementType = _b.sent();
                        if (elementTagName === 'INPUT' && elementType === 'submit') {
                            this.getLogger().debug("find the pattern: enter->change->submit, then skip the enter step. the step path is " + xpath);
                            return [2 /*return*/];
                        }
                        _b.label = 5;
                    case 5:
                        _a = step.value;
                        switch (_a) {
                            case 'Enter': return [3 /*break*/, 6];
                        }
                        return [3 /*break*/, 8];
                    case 6: return [4 /*yield*/, page.keyboard.press('Enter')];
                    case 7:
                        _b.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        this.getLogger().log("keydown [" + value + "] is not implemented yet.");
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    Replayer.prototype.executeMousedownStep = function (step) {
        return __awaiter(this, void 0, void 0, function () {
            var page, xpath, element, support, done, currentIndex_1, currentPath_1, avoidClick;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getPageOrThrow(step.uuid)];
                    case 1:
                        page = _a.sent();
                        xpath = this.transformStepPathToXPath(step.path);
                        this.getLogger().log("Execute mouse down, step path is " + xpath);
                        return [4 /*yield*/, this.findElement(step, page)];
                    case 2:
                        element = _a.sent();
                        support = this.createThirdStepSupport(page, element);
                        return [4 /*yield*/, support.mousedown()];
                    case 3:
                        done = _a.sent();
                        if (!!done) return [3 /*break*/, 5];
                        currentIndex_1 = this.getCurrentIndex();
                        currentPath_1 = step.path;
                        avoidClick = this.getSteps()
                            .filter(function (step, index) { return index > currentIndex_1; })
                            .some(function (step) { return step.type === 'click' && step.path === currentPath_1; });
                        if (avoidClick) {
                            this.getLogger().log("found click for this mousedown, just skip this mousedown");
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, element.click()];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    Replayer.prototype.executeAnimationStep = function (step) {
        return __awaiter(this, void 0, void 0, function () {
            var wait;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        wait = util_1.default.promisify(setTimeout);
                        return [4 /*yield*/, wait(step.duration)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Replayer.prototype.executeScrollStep = function (step) {
        return __awaiter(this, void 0, void 0, function () {
            var page, scrollTop, scrollLeft, element;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getPageOrThrow(step.uuid)];
                    case 1:
                        page = _a.sent();
                        scrollTop = step.scrollTop || 0;
                        scrollLeft = step.scrollLeft || 0;
                        if (!(step.target === 'document')) return [3 /*break*/, 3];
                        return [4 /*yield*/, page.evaluate(function (scrollTop, scrollLeft) {
                                document.documentElement.scrollTo({ top: scrollTop, left: scrollLeft });
                            }, scrollTop, scrollLeft)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 3: return [4 /*yield*/, this.findElement(step, page)];
                    case 4:
                        element = _a.sent();
                        return [4 /*yield*/, element.evaluate(function (node, scrollTop, scrollLeft) {
                                node.scrollTo({ top: scrollTop, left: scrollLeft });
                            }, scrollTop, scrollLeft)];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    Replayer.prototype.executeDialogOpenStep = function (step) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // dialog open is invoked by javascript anyway, ignore it
                this.getLogger().log("Execute " + step.dialog + " open, step url is " + step.url + ".");
                return [2 /*return*/];
            });
        });
    };
    Replayer.prototype.executeDialogCloseStep = function (step) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // dialog close is invoked manually anyway, should be handled in page popup event, ignore it
                this.getLogger().log("Execute " + step.dialog + " close, step url is " + step.url + ".");
                return [2 /*return*/];
            });
        });
    };
    Replayer.prototype.executeAjaxStep = function (step) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.getLogger().log("Execute ajax, step url is " + (step.request && step.request.url) + ".");
                return [2 /*return*/];
            });
        });
    };
    Replayer.prototype.executePageCreatedStep = function (step) {
        return __awaiter(this, void 0, void 0, function () {
            var page, sleep, page_1, newPage, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.getLogger().debug("Execute page created, step url is " + step.url + ".");
                        page = this.getPage(step.uuid);
                        if (!page) return [3 /*break*/, 1];
                        //do nothing
                        this.getLogger().debug("pop up page created, page uuid is " + step.uuid + ".");
                        return [3 /*break*/, 9];
                    case 1:
                        sleep = util_1.default.promisify(setTimeout);
                        return [4 /*yield*/, sleep(1000)];
                    case 2:
                        _b.sent();
                        page_1 = this.getPage(step.uuid);
                        if (!page_1) return [3 /*break*/, 3];
                        this.getLogger().debug("double check, pop up page created, page uuid is " + step.uuid + ".");
                        return [3 /*break*/, 9];
                    case 3:
                        this.getLogger().debug("To creat pop up page, and add page uuid is " + step.uuid + ".");
                        return [4 /*yield*/, this.browser.newPage()];
                    case 4:
                        newPage = _b.sent();
                        if (!this.putPage(step.uuid, newPage, false)) return [3 /*break*/, 9];
                        _b.label = 5;
                    case 5:
                        _b.trys.push([5, 8, , 9]);
                        return [4 /*yield*/, page_controller_1.controlPage(this, newPage, this.device, step.uuid)];
                    case 6:
                        _b.sent();
                        return [4 /*yield*/, Promise.all([
                                newPage.waitForNavigation(),
                                newPage.goto(step.url, { waitUntil: 'domcontentloaded' }) // Go to the url will indirectly cause a navigation
                            ])];
                    case 7:
                        _b.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        _a = _b.sent();
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    Replayer.prototype.executePageSwitchedStep = function (step) {
        return __awaiter(this, void 0, void 0, function () {
            var page, url, newUrl, sleep, url_1, sleep, page_2, newPage, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.getLogger().debug("Execute page switched, step url is " + step.url + ".");
                        page = this.getPage(step.uuid);
                        if (!page) return [3 /*break*/, 4];
                        url = utils_1.shorternUrl(page.url());
                        newUrl = utils_1.shorternUrl(step.url);
                        if (!(newUrl !== url)) return [3 /*break*/, 3];
                        sleep = util_1.default.promisify(setTimeout);
                        return [4 /*yield*/, sleep(1000)];
                    case 1:
                        _b.sent();
                        url_1 = utils_1.shorternUrl(page.url());
                        if (!(newUrl !== url_1)) return [3 /*break*/, 3];
                        return [4 /*yield*/, Promise.all([
                                page.waitForNavigation(),
                                page.goto(step.url, { waitUntil: 'domcontentloaded' })
                            ])];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3: return [3 /*break*/, 12];
                    case 4:
                        sleep = util_1.default.promisify(setTimeout);
                        return [4 /*yield*/, sleep(1000)];
                    case 5:
                        _b.sent();
                        page_2 = this.getPage(step.uuid);
                        if (!page_2) return [3 /*break*/, 6];
                        return [3 /*break*/, 12];
                    case 6:
                        this.getLogger().debug("To creat switched page, and add page uuid is " + step.uuid + ".");
                        return [4 /*yield*/, this.browser.newPage()];
                    case 7:
                        newPage = _b.sent();
                        if (!this.putPage(step.uuid, newPage, false)) return [3 /*break*/, 12];
                        _b.label = 8;
                    case 8:
                        _b.trys.push([8, 11, , 12]);
                        return [4 /*yield*/, page_controller_1.controlPage(this, newPage, this.device, step.uuid)];
                    case 9:
                        _b.sent();
                        return [4 /*yield*/, Promise.all([
                                newPage.waitForNavigation(),
                                newPage.goto(step.url, { waitUntil: 'domcontentloaded' })
                            ])];
                    case 10:
                        _b.sent();
                        return [3 /*break*/, 12];
                    case 11:
                        _a = _b.sent();
                        return [3 /*break*/, 12];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    Replayer.prototype.executePageClosedStep = function (step) {
        return __awaiter(this, void 0, void 0, function () {
            var page;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.getLogger().debug("Execute page closed, step url is " + step.url + ".");
                        page = this.getPage(step.uuid);
                        if (!page) return [3 /*break*/, 2];
                        return [4 /*yield*/, page.close()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    Replayer.prototype.createThirdStepSupport = function (page, element) {
        return new support_1.default({
            page: page,
            element: element,
            tagNameRetrieve: this.createElementTagNameRetriever(),
            elementTypeRetrieve: this.createElementTypeRetriever(),
            classNamesRetrieve: this.createElementClassNamesRetriever(),
            attrValueRetrieve: this.createElementAttrValueRetriever(),
            steps: this.getSteps(),
            currentStepIndex: this.getCurrentIndex(),
            logger: this.getLogger()
        });
    };
    Replayer.prototype.findElement = function (step, page) {
        return __awaiter(this, void 0, void 0, function () {
            var xpath, elements, csspath, count, element, custompath, count, element, frames, index, frame, element, paths;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        xpath = this.transformStepPathToXPath(step.path);
                        return [4 /*yield*/, page.$x(xpath)];
                    case 1:
                        elements = _a.sent();
                        if (elements && elements.length === 1) {
                            return [2 /*return*/, elements[0]];
                        }
                        csspath = step.csspath;
                        if (!csspath) return [3 /*break*/, 4];
                        return [4 /*yield*/, page.evaluate(function (csspath) { return document.querySelectorAll(csspath).length; }, csspath)];
                    case 2:
                        count = _a.sent();
                        if (!(count === 1)) return [3 /*break*/, 4];
                        return [4 /*yield*/, page.$(csspath)];
                    case 3:
                        element = _a.sent();
                        if (element) {
                            return [2 /*return*/, element];
                        }
                        _a.label = 4;
                    case 4:
                        custompath = step.custompath;
                        if (!custompath) return [3 /*break*/, 7];
                        return [4 /*yield*/, page.evaluate(function (csspath) { return document.querySelectorAll(csspath).length; }, custompath)];
                    case 5:
                        count = _a.sent();
                        if (!(count === 1)) return [3 /*break*/, 7];
                        return [4 /*yield*/, page.$(custompath)];
                    case 6:
                        element = _a.sent();
                        if (element) {
                            return [2 /*return*/, element];
                        }
                        _a.label = 7;
                    case 7:
                        frames = page.frames();
                        if (!(frames.length > 0)) return [3 /*break*/, 11];
                        index = 0;
                        _a.label = 8;
                    case 8:
                        if (!(index < frames.length)) return [3 /*break*/, 11];
                        frame = frames[index];
                        return [4 /*yield*/, frame.$x(xpath)];
                    case 9:
                        element = _a.sent();
                        if (element.length === 1) {
                            return [2 /*return*/, element[0]];
                        }
                        _a.label = 10;
                    case 10:
                        index++;
                        return [3 /*break*/, 8];
                    case 11:
                        paths = (function () {
                            var paths = { xpath: xpath, csspath: csspath, custompath: custompath };
                            return Object.keys(paths)
                                .filter(function (key) { return paths[key]; })
                                .map(function (key) { return key + "[" + paths[key] + "]"; })
                                .join(' or ');
                        })();
                        throw new Error("Cannot find element by " + paths + ".");
                }
            });
        });
    };
    Replayer.prototype.createElementTagNameRetriever = function () {
        var _this = this;
        var tagName;
        return function (element) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!tagName) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.getElementTagName(element)];
                    case 1:
                        tagName = _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/, tagName];
                }
            });
        }); };
    };
    Replayer.prototype.getElementTagName = function (element) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, element.evaluate(function (node) { return node.tagName; })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    Replayer.prototype.createElementTypeRetriever = function () {
        var _this = this;
        var elementType;
        return function (element) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!elementType) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.getElementType(element)];
                    case 1:
                        elementType = _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/, elementType];
                }
            });
        }); };
    };
    Replayer.prototype.getElementType = function (element) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, element.evaluate(function (node) { return node.getAttribute('type'); })];
                    case 1: return [2 /*return*/, (_a.sent()) || ''];
                }
            });
        });
    };
    Replayer.prototype.getElementChecked = function (element) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, element.evaluate(function (node) { return node.checked; })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    Replayer.prototype.createElementClassNamesRetriever = function () {
        var _this = this;
        var classNames;
        return function (element) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!classNames) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.getElementAttrValue(element, 'class')];
                    case 1:
                        classNames = (_a.sent()) || '';
                        _a.label = 2;
                    case 2: return [2 /*return*/, classNames];
                }
            });
        }); };
    };
    Replayer.prototype.createElementAttrValueRetriever = function () {
        var _this = this;
        var values = {};
        return function (element, attrName) { return __awaiter(_this, void 0, void 0, function () {
            var value;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!Object.keys(values).includes(attrName)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.getElementAttrValue(element, attrName)];
                    case 1:
                        value = _a.sent();
                        if (typeof value === 'undefined') {
                            values[attrName] = null;
                        }
                        else {
                            values[attrName] = value;
                        }
                        _a.label = 2;
                    case 2: return [2 /*return*/, values[attrName]];
                }
            });
        }); };
    };
    Replayer.prototype.getElementAttrValue = function (element, attrName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, element.evaluate(function (node, attr) { return node.getAttribute(attr); }, attrName)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    Replayer.prototype.getElementValue = function (element) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, element.evaluate(function (node) { return node.value; })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    Replayer.prototype.isElementVisible = function (element) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, element.evaluate(function (node) {
                            return node.offsetWidth > 0 && node.offsetHeight > 0;
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    Replayer.prototype.setValueToElement = function (element, value) {
        return __awaiter(this, void 0, void 0, function () {
            var tagName, type;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getElementTagName(element)];
                    case 1:
                        tagName = _a.sent();
                        if (!(tagName === 'INPUT' || tagName === 'TEXTAREA')) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.getElementType(element)];
                    case 2:
                        type = _a.sent();
                        if (!(!type ||
                            ['text', 'password', 'url', 'search', 'email', 'hidden', 'number', 'tel'].includes(type.toLowerCase()))) return [3 /*break*/, 6];
                        // sometimes key event was bound in input
                        // force trigger change event cannot cover this scenario
                        // in this case, as the following steps
                        // 1. force clear input value
                        // 2. invoke type
                        // 3. force trigger change event
                        return [4 /*yield*/, element.evaluate(function (node) { return (node.value = ''); })];
                    case 3:
                        // sometimes key event was bound in input
                        // force trigger change event cannot cover this scenario
                        // in this case, as the following steps
                        // 1. force clear input value
                        // 2. invoke type
                        // 3. force trigger change event
                        _a.sent();
                        return [4 /*yield*/, element.type(value)];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, element.evaluate(function (node) {
                                // node.value = value;
                                var event = document.createEvent('HTMLEvents');
                                event.initEvent('change', true, true);
                                node.dispatchEvent(event);
                            })];
                    case 5:
                        _a.sent();
                        return [2 /*return*/];
                    case 6: 
                    // other
                    return [4 /*yield*/, element.evaluate(function (node, value) {
                            var element = node;
                            if (!['checkbox', 'radio'].includes((element.getAttribute('type') || '').toLowerCase()) ||
                                element.value != value) {
                                element.value = value;
                                var event_1 = document.createEvent('HTMLEvents');
                                event_1.initEvent('change', true, true);
                                node.dispatchEvent(event_1);
                            }
                        }, value)];
                    case 7:
                        // other
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Replayer.prototype.transformStepPathToXPath = function (stepPath) {
        return stepPath.replace(/"/g, "'");
    };
    return Replayer;
}());
exports.default = Replayer;

//# sourceMappingURL=replayer.js.map
