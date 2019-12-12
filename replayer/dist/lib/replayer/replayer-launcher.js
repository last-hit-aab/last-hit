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
var utils_1 = require("../utils");
var replayer_1 = __importDefault(require("./replayer"));
var replayer_extension_registry_1 = require("./replayer-extension-registry");
var createNextStepHandler = function (emitter, logger) {
    var waitForNextStep = function (options) {
        var storyName = options.storyName, flowName = options.flowName, replayer = options.replayer;
        emitter.once("continue-replay-step-" + utils_1.generateKeyByString(storyName, flowName), function (event, arg) { return __awaiter(void 0, void 0, void 0, function () {
            var flow, index, command, step, _a, e_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        flow = arg.flow, index = arg.index, command = arg.command;
                        step = replayer.getSteps()[index];
                        _a = command;
                        switch (_a) {
                            case 'disconnect': return [3 /*break*/, 1];
                            case 'abolish': return [3 /*break*/, 3];
                            case 'switch-to-record': return [3 /*break*/, 5];
                        }
                        return [3 /*break*/, 6];
                    case 1: return [4 /*yield*/, replayer.end(false)];
                    case 2:
                        _b.sent();
                        event.reply("replay-browser-disconnect-" + utils_1.generateKeyByString(storyName, flowName), {
                            summary: replayer.getSummaryData()
                        });
                        return [3 /*break*/, 9];
                    case 3: return [4 /*yield*/, replayer.end(true)];
                    case 4:
                        _b.sent();
                        event.reply("replay-browser-abolish-" + utils_1.generateKeyByString(storyName, flowName), {
                            summary: replayer.getSummaryData()
                        });
                        return [3 /*break*/, 9];
                    case 5:
                        // keep replayer instance in replayers map
                        replayer.switchToRecord();
                        event.reply("replay-browser-ready-to-switch-" + utils_1.generateKeyByString(storyName, flowName), {});
                        return [3 /*break*/, 9];
                    case 6:
                        _b.trys.push([6, 8, , 9]);
                        logger.log("Continue step[" + index + "]@" + utils_1.generateKeyByString(storyName, flowName) + ".");
                        replayer.getSummary().handle(step);
                        return [4 /*yield*/, replayer.next(flow, index, storyName)];
                    case 7:
                        _b.sent();
                        waitForNextStep({ event: event, replayer: replayer, storyName: storyName, flowName: flowName, index: index });
                        return [3 /*break*/, 9];
                    case 8:
                        e_1 = _b.sent();
                        logger.error('Step execution failed, failed step as below:');
                        logger.error(step);
                        logger.error(e_1);
                        // failed, prepare for next step
                        // send back
                        // replayer.getSummary().handleError(step, e);
                        waitForNextStep({
                            event: event,
                            replayer: replayer,
                            storyName: storyName,
                            flowName: flowName,
                            index: index,
                            error: e_1.message,
                            errorStack: e_1.stack
                        });
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/];
                }
            });
        }); });
        logger.log("Reply message step[" + options.index + "]@[replay-step-end-" + utils_1.generateKeyByString(storyName, flowName) + "].");
        options.event.reply("replay-step-end-" + utils_1.generateKeyByString(storyName, flowName), {
            index: options.index,
            error: options.error,
            errorStack: options.errorStack,
            summary: replayer.getSummaryData()
        });
    };
    return waitForNextStep;
};
var launch = function (emitter, replayers, logger, env) {
    var waitForNextStep = createNextStepHandler(emitter, logger);
    var handle = { env: env };
    emitter.on('launch-replay', function (event, arg) { return __awaiter(void 0, void 0, void 0, function () {
        var storyName, flow, index, registry, replayer, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    storyName = arg.storyName, flow = arg.flow, index = arg.index;
                    registry = new replayer_extension_registry_1.WorkspaceExtensionRegistry({ env: handle.env });
                    return [4 /*yield*/, registry.launch()];
                case 1:
                    _a.sent();
                    replayer = new replayer_1.default({
                        storyName: storyName,
                        flow: flow,
                        logger: logger,
                        replayers: replayers,
                        env: handle.env,
                        registry: registry
                    });
                    handle.current = replayer;
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, replayer.start()];
                case 3:
                    _a.sent();
                    replayer.getSummary().handle((flow.steps || [])[0] || {});
                    // put into cache
                    replayers[utils_1.generateKeyByString(storyName, flow.name)] = replayer;
                    // successful, prepare for next step
                    // send back
                    waitForNextStep({ event: event, replayer: replayer, storyName: storyName, flowName: flow.name, index: index });
                    return [3 /*break*/, 5];
                case 4:
                    e_2 = _a.sent();
                    logger.error(e_2);
                    replayer.getSummary().handleError((flow.steps || [])[0] || {}, e_2);
                    // failed, prepare for next step
                    // send back
                    waitForNextStep({
                        event: event,
                        replayer: replayer,
                        storyName: storyName,
                        flowName: flow.name,
                        index: index,
                        error: e_2.message,
                        errorStack: e_2.stack
                    });
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); });
    return handle;
};
exports.default = (function (emitter, replayers, logger, env) {
    return function () { return launch(emitter, replayers, logger, env); };
});

//# sourceMappingURL=replayer-launcher.js.map
