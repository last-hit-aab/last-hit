"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ExtensionTypes;
(function (ExtensionTypes) {
    ExtensionTypes["WORKSPACE"] = "workspace";
})(ExtensionTypes = exports.ExtensionTypes || (exports.ExtensionTypes = {}));
var ExtensionEventTypes;
(function (ExtensionEventTypes) {
    ExtensionEventTypes["REGISTERED"] = "registered";
    ExtensionEventTypes["UNREGISTERED"] = "unregitered";
    ExtensionEventTypes["DATA_TRANSMITTED"] = "data-transmitted";
    ExtensionEventTypes["LOG"] = "log";
    ExtensionEventTypes["ERROR_LOG"] = "error-log";
    ExtensionEventTypes["ERROR"] = "error";
})(ExtensionEventTypes = exports.ExtensionEventTypes || (exports.ExtensionEventTypes = {}));
var AbstractExtensionEntryPointWrapper = /** @class */ (function () {
    function AbstractExtensionEntryPointWrapper(entrypoint) {
        this.entrypoint = entrypoint;
    }
    AbstractExtensionEntryPointWrapper.prototype.activate = function () {
        return this.entrypoint.activate();
    };
    AbstractExtensionEntryPointWrapper.prototype.getType = function () {
        return this.entrypoint.getType();
    };
    AbstractExtensionEntryPointWrapper.prototype.getEntrypoint = function () {
        return this.entrypoint;
    };
    return AbstractExtensionEntryPointWrapper;
}());
exports.AbstractExtensionEntryPointWrapper = AbstractExtensionEntryPointWrapper;
//# sourceMappingURL=index.js.map