"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var extension_registry_1 = __importDefault(require("./lib/extension-registry"));
exports.ExtensionRegistry = extension_registry_1.default;
var extension_point_1 = require("./lib/types/extension-point");
exports.ExtensionPoint = extension_point_1.ExtensionPoint;
__export(require("./lib/types"));
exports.default = new extension_registry_1.default();
//# sourceMappingURL=index.js.map