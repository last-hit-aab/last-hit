"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// puppeteer-to-istanbul 1.2.2
var clone_1 = __importDefault(require("clone"));
var fs_1 = __importDefault(require("fs"));
var jsonfile_1 = __importDefault(require("jsonfile"));
var mkdirp_1 = __importDefault(require("mkdirp"));
var path_1 = __importDefault(require("path"));
var v8_to_istanbul_1 = __importDefault(require("v8-to-istanbul"));
var utils_1 = require("../utils");
var nycFolder = path_1.default.join(process.cwd(), '.nyc_output');
var storageFolder = path_1.default.join(nycFolder, 'js');
var nycOutFilename = path_1.default.join(nycFolder, 'out.json');
var OutputFiles = /** @class */ (function () {
    function OutputFiles(coverages) {
        this.iterator = 0;
        // Clone coverageInfo to prevent mutating the passed in data
        this.coverages = clone_1.default(coverages);
        this.parseAndIsolate();
    }
    OutputFiles.prototype.rewritePath = function (path) {
        // generate a new path relative to ./coverage/js.
        // this would be around where you'd use mkdirp.
        path = utils_1.shorternUrl(path);
        // Get the last element in the path name
        var truncatedPath = path_1.default.basename(path);
        // Special case: when html present, strip and return specialized string
        if (truncatedPath.includes('.html')) {
            truncatedPath = path_1.default.resolve(storageFolder, truncatedPath) + '.puppeteerTemp-inline';
        }
        else {
            truncatedPath = truncatedPath.split('.js')[0];
            truncatedPath = path_1.default.resolve(storageFolder, truncatedPath);
        }
        mkdirp_1.default.sync(storageFolder);
        if (fs_1.default.existsSync(truncatedPath + '.js')) {
            this.iterator++;
            return truncatedPath + "-" + this.iterator + ".js";
        }
        else {
            return truncatedPath + ".js";
        }
    };
    OutputFiles.prototype.parseAndIsolate = function () {
        var _this = this;
        (this.coverages || []).forEach(function (coverage) {
            var path = _this.rewritePath(coverage.url);
            coverage.url = path;
            fs_1.default.writeFileSync(path, coverage.text);
        });
    };
    OutputFiles.prototype.getTransformedCoverage = function () {
        return this.coverages;
    };
    return OutputFiles;
}());
var PuppeteerToV8 = /** @class */ (function () {
    function PuppeteerToV8(coverages) {
        this.coverages = coverages;
    }
    PuppeteerToV8.prototype.convertCoverage = function () {
        var _this = this;
        // Iterate through coverage info and create IDs
        return this.coverages.map(function (coverage, index) {
            return {
                scriptId: index,
                url: "file://" + coverage.url,
                functions: [
                    {
                        ranges: coverage.ranges.map(_this.convertRange),
                        isBlockCoverage: true
                    }
                ]
            };
        });
    };
    // Takes in a Puppeteer range object with start and end properties and
    // converts it to a V8 range with startOffset, endOffset, and count properties
    PuppeteerToV8.prototype.convertRange = function (range) {
        return {
            startOffset: range.start,
            endOffset: range.end,
            count: 1
        };
    };
    return PuppeteerToV8;
}());
var PuppeteerToIstanbul = /** @class */ (function () {
    function PuppeteerToIstanbul(coverages) {
        this.puppeteerToV8Info = new PuppeteerToV8(new OutputFiles(coverages).getTransformedCoverage()).convertCoverage();
    }
    PuppeteerToIstanbul.prototype.writeIstanbulFormat = function () {
        var fullJson = {};
        this.puppeteerToV8Info.forEach(function (jsFile) {
            var script = v8_to_istanbul_1.default(jsFile.url);
            script.applyCoverage(jsFile.functions);
            var istanbulCoverage = script.toIstanbul();
            var keys = Object.keys(istanbulCoverage);
            fullJson[keys[0]] = istanbulCoverage[keys[0]];
        });
        mkdirp_1.default.sync(nycFolder);
        jsonfile_1.default.writeFileSync(nycOutFilename, fullJson);
    };
    return PuppeteerToIstanbul;
}());
exports.write = function (puppeteerFormat) {
    var pti = new PuppeteerToIstanbul(puppeteerFormat);
    pti.writeIstanbulFormat();
};
//# sourceMappingURL=index.js.map