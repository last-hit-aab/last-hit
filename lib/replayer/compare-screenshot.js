"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var node_resemble_js_1 = __importDefault(require("node-resemble-js"));
var errorSettings = {
    errorColor: {
        red: 255,
        green: 0,
        blue: 255
    },
    errorType: 'flat',
    transparency: 0.3
};
node_resemble_js_1.default.outputSettings(errorSettings);
exports.default = (function (baselineImageOnBase64, replayImageOnBase64) {
    return node_resemble_js_1.default(Buffer.from(baselineImageOnBase64, 'base64')).compareTo(Buffer.from(replayImageOnBase64, 'base64'));
});
//# sourceMappingURL=compare-screenshot.js.map