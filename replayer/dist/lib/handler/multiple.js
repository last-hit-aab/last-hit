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
var cross_spawn_1 = __importDefault(require("cross-spawn"));
var fs_1 = __importDefault(require("fs"));
var jsonfile_1 = __importDefault(require("jsonfile"));
var path_1 = __importDefault(require("path"));
var v4_1 = __importDefault(require("uuid/v4"));
var utils_1 = require("../utils");
var print_1 = require("./print");
var processId = utils_1.getProcessId();
var createTemporaryFolders = function (env) {
    var workspace = env.getWorkspace();
    var composeTempFolder = path_1.default.join(workspace, 'compose-temp');
    if (fs_1.default.existsSync(composeTempFolder)) {
        // clear
        fs_1.default.rmdirSync(composeTempFolder, { recursive: true });
    }
    // recreate
    fs_1.default.mkdirSync(composeTempFolder);
    var resultTempFolder = path_1.default.join(workspace, 'result-temp');
    if (fs_1.default.existsSync(resultTempFolder)) {
        fs_1.default.rmdirSync(resultTempFolder, { recursive: true });
    }
    // recreate
    fs_1.default.mkdirSync(resultTempFolder);
    return {
        composeTempFolder: composeTempFolder,
        resultTempFolder: resultTempFolder
    };
};
exports.doOnMultipleProcesses = function (flows, env) { return __awaiter(void 0, void 0, void 0, function () {
    var resolves, composeTempFolder, actions, next, init;
    return __generator(this, function (_a) {
        resolves = [];
        Promise.all(flows.map(function () { return new Promise(function (resolve) { return resolves.push(resolve); }); })).finally(function () {
            print_1.print(env);
            console.info(("Process[" + processId + "] finished").bold.green);
        });
        composeTempFolder = createTemporaryFolders(env).composeTempFolder;
        actions = flows.map(function (flow, index) {
            return function () {
                return new Promise(function (resolve) {
                    try {
                        if (!fs_1.default.existsSync(composeTempFolder)) {
                            fs_1.default.mkdirSync(composeTempFolder);
                        }
                        var filename = path_1.default.join(composeTempFolder, "compose-" + v4_1.default() + ".json");
                        var childConfig = env.exposeForSingleProcess({ includes: [flow] });
                        childConfig.env = childConfig.name;
                        delete childConfig.name;
                        jsonfile_1.default.writeFileSync(filename, childConfig);
                        var child = cross_spawn_1.default('node', [
                            process.argv[1],
                            "--config-file=" + filename,
                            "--workspace=" + env.getWorkspace()
                        ], {
                            stdio: ['ignore', 'inherit', 'inherit']
                        });
                        child.on('exit', function () {
                            resolve();
                            resolves[index]();
                        });
                    }
                    catch (_a) {
                        resolve();
                        resolves[index]();
                    }
                });
            };
        });
        next = function () {
            var action = actions.shift();
            action && action().then(function () { return next(); });
        };
        init = 0;
        while (true) {
            init++;
            next();
            if (init == env.getParallel()) {
                break;
            }
        }
        return [2 /*return*/];
    });
}); };

//# sourceMappingURL=multiple.js.map
