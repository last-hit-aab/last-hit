"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var events_1 = __importDefault(require("events"));
var AnEmitter = /** @class */ (function (_super) {
    __extends(AnEmitter, _super);
    function AnEmitter() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return AnEmitter;
}(events_1.default));
var ReplayEmitter = /** @class */ (function () {
    function ReplayEmitter() {
        this.emitter = new AnEmitter();
    }
    ReplayEmitter.prototype.send = function (event, arg) {
        this.emitter.emit(event, arg);
    };
    ReplayEmitter.prototype.on = function (event, callback) {
        var _this = this;
        this.emitter.on(event, function (arg) {
            callback({
                reply: function (event, arg) {
                    _this.send(event, arg);
                }
            }, arg);
        });
    };
    ReplayEmitter.prototype.once = function (event, callback) {
        var _this = this;
        this.emitter.once(event, function (arg) {
            callback({
                reply: function (event, arg) {
                    _this.send(event, arg);
                }
            }, arg);
        });
    };
    return ReplayEmitter;
}());
exports.default = ReplayEmitter;

//# sourceMappingURL=replay-emitter.js.map
