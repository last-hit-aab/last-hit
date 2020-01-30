"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = __importDefault(require("fs"));
var jsonfile_1 = __importDefault(require("jsonfile"));
var os_1 = __importDefault(require("os"));
var path_1 = __importDefault(require("path"));
var Environment = /** @class */ (function () {
    function Environment(options) {
        /** environment name */
        this.name = 'NO-ENVIRONMENT';
        this.urlReplaceRegexps = [];
        this.urlReplaceTos = [];
        this.originalOptions = options;
        this.workspace = options.workspace;
        this.mergeFrom(options);
        this.includes = options.includes;
        this.parallel = this.computeParallel(options.parallel);
        this.child = options.child || false;
        this.wrappers = [this.wrapUrl];
    }
    Environment.prototype.getOriginalOptions = function () {
        return this.originalOptions;
    };
    Environment.prototype.mergeFrom = function (options) {
        var _this = this;
        this.name = options.name || this.name;
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
        this.sleepAfterChange = options.sleepAfterChange || this.sleepAfterChange;
        this.slowAjaxTime = options.slowAjaxTime || this.slowAjaxTime;
        // set original options
        ['name', 'urlReplaceRegexp', 'urlReplaceTo', 'sleepAfterChange', 'slowAjaxTime'].forEach(function (prop) { return (_this.originalOptions[prop] = options[prop]); });
    };
    Environment.prototype.wrap = function (step) {
        var _this = this;
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
    Environment.prototype.getName = function () {
        return this.name;
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
    Environment.prototype.expose = function () {
        var options = Object.assign({}, this.originalOptions);
        delete options.parallel;
        delete options.workspace;
        delete options.includes;
        delete options.child;
        return options;
    };
    Environment.exposeNoop = function () {
        return {
        // name: 'NO-ENVIRONMENT'
        };
    };
    Environment.prototype.isStoryExists = function (storyName) {
        var dependsStoryFolder = path_1.default.join(this.getWorkspace(), storyName);
        return fs_1.default.existsSync(dependsStoryFolder) && fs_1.default.statSync(dependsStoryFolder).isDirectory();
    };
    Environment.prototype.isFlowExists = function (storyName, flowName) {
        var dependsStoryFolder = path_1.default.join(this.getWorkspace(), storyName);
        if (!this.isStoryExists(storyName)) {
            return false;
        }
        var dependsFlowFilename = path_1.default.join(dependsStoryFolder, flowName + ".flow.json");
        return fs_1.default.existsSync(dependsFlowFilename) && fs_1.default.statSync(dependsFlowFilename).isFile();
    };
    Environment.prototype.readFlowFile = function (storyName, flowName) {
        var dependsStoryFolder = path_1.default.join(this.getWorkspace(), storyName);
        var filename = path_1.default.join(dependsStoryFolder, flowName + ".flow.json");
        return jsonfile_1.default.readFileSync(filename);
    };
    return Environment;
}());
exports.default = Environment;

//# sourceMappingURL=env.js.map
