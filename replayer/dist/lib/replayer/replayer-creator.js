"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var env_1 = __importDefault(require("../config/env"));
var replayer_abandoner_1 = __importDefault(require("./replayer-abandoner"));
var replayer_destoryor_1 = __importDefault(require("./replayer-destoryor"));
var replayer_launcher_1 = __importDefault(require("./replayer-launcher"));
var replayers_cache_1 = __importDefault(require("./replayers-cache"));
exports.createReplayer = function (options) {
    var emitter = options.emitter;
    var logger = options.logger;
    var env = options.env ||
        (function () {
            var options = env_1.default.exposeNoop();
            return new env_1.default(options);
        })();
    return {
        initialize: replayer_launcher_1.default(emitter, replayers_cache_1.default, logger, env),
        destory: replayer_destoryor_1.default(replayers_cache_1.default, logger),
        abandon: replayer_abandoner_1.default(replayers_cache_1.default)
    };
};

//# sourceMappingURL=replayer-creator.js.map
