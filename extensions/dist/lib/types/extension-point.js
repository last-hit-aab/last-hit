"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ExtensionPoint = /** @class */ (function () {
    function ExtensionPoint(options) {
        var id = options.id, name = options.name, description = options.description, folder = options.folder;
        this.id = id;
        this.name = name;
        this.description = description;
        this.folder = folder;
    }
    ExtensionPoint.prototype.getId = function () {
        return this.id;
    };
    ExtensionPoint.prototype.getName = function () {
        return this.name;
    };
    ExtensionPoint.prototype.getDescription = function () {
        return this.description;
    };
    ExtensionPoint.prototype.getFolder = function () {
        return this.folder;
    };
    return ExtensionPoint;
}());
exports.ExtensionPoint = ExtensionPoint;
//# sourceMappingURL=extension-point.js.map