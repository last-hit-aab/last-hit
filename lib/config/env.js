"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var os_1 = __importDefault(require("os"));
var Environment = /** @class */ (function () {
    function Environment(options) {
        this.constructed = false;
        this.constructed = true;
        this.originalOptions = options;
        this.name = options.name;
        this.workspace = options.workspace;
        if (options.urlReplaceRegexp) {
            this.urlReplaceRegexps = options.urlReplaceRegexp
                .split('&&')
                .map(function (text) { return new RegExp(text); });
            this.urlReplaceTos = (options.urlReplaceTo || '').split('&&');
            this.urlReplaceTos.length = this.urlReplaceRegexps.length;
            this.urlReplaceTos = this.urlReplaceTos.map(function (to) { return (to ? to : ''); });
        }
        else {
            this.urlReplaceRegexps = [];
            this.urlReplaceTos = [];
        }
        this.sleepAfterChange = options.sleepAfterChange;
        this.slowAjaxTime = options.slowAjaxTime;
        this.includes = options.includes;
        this.parallel = this.computeParallel(options.parallel);
        this.child = options.child || false;
        this.wrappers = [this.wrapUrl];
    }
    Environment.prototype.wrap = function (step) {
        var _this = this;
        if (!this.isConstructed()) {
            return step;
        }
        return this.getWrappers().reduce(function (step, wrapper) { return wrapper.call(_this, step); }, step);
    };
    Environment.prototype.wrapUrl = function (step) {
        var _this = this;
        var regexps = this.getUrlReplaceRegexps();
        if (step.url && regexps) {
            step.url = regexps.reduce(function (url, regexp, index) {
                return url.replace(regexp, _this.getUrlReplaceTos()[index] || '');
            }, step.url);
        }
        return step;
    };
    Environment.prototype.getWrappers = function () {
        return this.wrappers;
    };
    Environment.prototype.isConstructed = function () {
        return this.constructed;
    };
    Environment.prototype.getWorkspace = function () {
        return this.workspace;
    };
    Environment.prototype.getUrlReplaceRegexps = function () {
        return this.urlReplaceRegexps;
    };
    Environment.prototype.getUrlReplaceTos = function () {
        return this.urlReplaceTos;
    };
    Environment.prototype.getSleepAfterChange = function () {
        return this.sleepAfterChange;
    };
    Environment.prototype.getSlowAjaxTime = function () {
        return this.slowAjaxTime || 500;
    };
    Environment.prototype.isIncluded = function (storyName, flowName) {
        return (
        // no filters, including all
        !this.includes ||
            this.includes.some(function (filter) {
                // story name must match
                // no flow name appointed or flow name matched
                return filter.story === storyName && (!filter.flow || filter.flow === flowName);
            }));
    };
    Environment.prototype.isExcluded = function (storyName, flowName) {
        // TODO not supported yet, always returns false
        return false;
    };
    Environment.prototype.getParallel = function () {
        return this.parallel || 1;
    };
    Environment.prototype.isOnParallel = function () {
        return this.getParallel() !== 1;
    };
    Environment.prototype.computeParallel = function (parallel) {
        if (parallel === void 0) { parallel = 1; }
        parallel = Math.abs(parallel);
        if (parseInt("" + parallel) !== parallel) {
            return Math.round(os_1.default.cpus().length * parallel);
        }
        else {
            return parallel;
        }
    };
    Environment.prototype.isOnChildProcess = function () {
        return this.child;
    };
    Environment.prototype.exposeForSingleProcess = function (replacement) {
        var options = Object.assign({}, this.originalOptions);
        delete options.parallel;
        delete options.workspace;
        options.child = true;
        Object.keys(replacement).forEach(function (key) { return (options[key] = replacement[key]); });
        return options;
    };
    Environment.exposeNoop = function () {
        return {
            name: 'NO-ENVIRONMENT'
        };
    };
    return Environment;
}());
exports.default = Environment;
//# sourceMappingURL=env.js.map