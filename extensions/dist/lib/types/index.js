"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
    function AbstractExtensionEntryPointWrapper(entrypoint, helper) {
        this.entrypoint = entrypoint;
        this.helper = helper;
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
    AbstractExtensionEntryPointWrapper.prototype.getHelper = function () {
        return this.helper;
    };
    return AbstractExtensionEntryPointWrapper;
}());
exports.AbstractExtensionEntryPointWrapper = AbstractExtensionEntryPointWrapper;

//# sourceMappingURL=index.js.map
