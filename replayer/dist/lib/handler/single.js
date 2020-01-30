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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = __importDefault(require("fs"));
var jsonfile_1 = __importDefault(require("jsonfile"));
var path_1 = __importDefault(require("path"));
var utils_1 = require("../utils");
var print_1 = require("./print");
var single_flow_1 = require("./single-flow");
var processId = utils_1.getProcessId();
var createTemporaryFolders = function (env) { return __awaiter(void 0, void 0, void 0, function () {
    var workspace, resultTempFolder, threadTempFolder, resultParamsTempFolder;
    return __generator(this, function (_a) {
        workspace = env.getWorkspace();
        resultTempFolder = path_1.default.join(workspace, '.result-temp');
        if (!env.isOnChildProcess()) {
            // not in child process, delete the result temp folder
            if (fs_1.default.existsSync(resultTempFolder)) {
                fs_1.default.rmdirSync(resultTempFolder, { recursive: true });
            }
        }
        if (!fs_1.default.existsSync(resultTempFolder)) {
            fs_1.default.mkdirSync(resultTempFolder);
        }
        threadTempFolder = path_1.default.join(resultTempFolder, processId);
        if (!fs_1.default.existsSync(threadTempFolder)) {
            fs_1.default.mkdirSync(threadTempFolder);
        }
        resultParamsTempFolder = path_1.default.join(workspace, '.result-params-temp');
        if (!env.isOnChildProcess()) {
            // not in child process, delete the result temp folder
            if (fs_1.default.existsSync(resultParamsTempFolder)) {
                fs_1.default.rmdirSync(resultParamsTempFolder, { recursive: true });
            }
        }
        if (!fs_1.default.existsSync(resultParamsTempFolder)) {
            fs_1.default.mkdirSync(resultParamsTempFolder);
        }
        return [2 /*return*/, {
                resultTempFolder: resultTempFolder,
                threadTempFolder: threadTempFolder
            }];
    });
}); };
exports.doOnSingleProcess = function (flows, env) { return __awaiter(void 0, void 0, void 0, function () {
    var threadTempFolder, jammed, logger, reports, allCoverages, pendingFlows_1, run, countLeft, flows_1, isChildProcess;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, createTemporaryFolders(env)];
            case 1:
                threadTempFolder = (_a.sent()).threadTempFolder;
                jammed = false;
                logger = utils_1.getLogger();
                reports = [];
                allCoverages = [];
                _a.label = 2;
            case 2:
                _a.trys.push([2, , 6, 7]);
                pendingFlows_1 = flows;
                run = function (flows) { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, flows.reduce(function (promise, flow) { return __awaiter(void 0, void 0, void 0, function () {
                                    var _a, report, coverages, code, e_1;
                                    return __generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0: return [4 /*yield*/, promise];
                                            case 1:
                                                _b.sent();
                                                _b.label = 2;
                                            case 2:
                                                _b.trys.push([2, 4, 5, 6]);
                                                return [4 /*yield*/, single_flow_1.handleFlow(flow, env)];
                                            case 3:
                                                _a = _b.sent(), report = _a.report, coverages = _a.coverages, code = _a.code;
                                                if (code === 'pending') {
                                                    pendingFlows_1.push(flow);
                                                }
                                                else {
                                                    reports.push(report);
                                                    allCoverages.push.apply(allCoverages, coverages);
                                                }
                                                return [3 /*break*/, 6];
                                            case 4:
                                                e_1 = _b.sent();
                                                logger.error(e_1);
                                                return [3 /*break*/, 6];
                                            case 5: 
                                            // do nothing
                                            return [2 /*return*/, Promise.resolve()];
                                            case 6: return [2 /*return*/];
                                        }
                                    });
                                }); }, Promise.resolve())];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); };
                countLeft = pendingFlows_1.length;
                _a.label = 3;
            case 3:
                if (!(pendingFlows_1.length !== 0)) return [3 /*break*/, 5];
                flows_1 = __spreadArrays(pendingFlows_1);
                pendingFlows_1.length = 0;
                return [4 /*yield*/, run(flows_1)];
            case 4:
                _a.sent();
                if (countLeft === pendingFlows_1.length) {
                    // nothing can be run
                    jammed = true;
                    return [3 /*break*/, 5];
                }
                return [3 /*break*/, 3];
            case 5: return [3 /*break*/, 7];
            case 6:
                isChildProcess = env.isOnChildProcess();
                jsonfile_1.default.writeFileSync(path_1.default.join(threadTempFolder, 'summary.json'), reports);
                jsonfile_1.default.writeFileSync(path_1.default.join(threadTempFolder, 'coverages.json'), allCoverages);
                // print when not child process
                !isChildProcess && print_1.print(env);
                console.info(("Process[" + processId + "] finished").bold.green);
                if (jammed && isChildProcess) {
                    return [2 /*return*/, Promise.reject('jammed')];
                }
                return [7 /*endfinally*/];
            case 7: return [2 /*return*/];
        }
    });
}); };

//# sourceMappingURL=single.js.map
