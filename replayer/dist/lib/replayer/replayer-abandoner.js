"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var utils_1 = require("../utils");
var abandon = function (replayers, storyName, flowName) {
    var key = utils_1.generateKeyByString(storyName, flowName);
    var replayer = replayers[key];
    delete replayers[key];
    return replayer;
};
exports.default = (function (replayers) {
    return function (storyName, flowName) {
        return abandon(replayers, storyName, flowName);
    };
});

//# sourceMappingURL=replayer-abandoner.js.map
