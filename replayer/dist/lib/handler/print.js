"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var child_process_1 = require("child_process");
var fs_1 = __importDefault(require("fs"));
var jsonfile_1 = __importDefault(require("jsonfile"));
var path_1 = __importDefault(require("path"));
var pti = __importStar(require("../pti"));
var utils_1 = require("../utils");
var report_generator_1 = require("./report-generator");
var binarySearch = function (target, array) {
    var firstIndex = 0;
    var lastIndex = array.length - 1;
    var middleIndex = Math.floor((lastIndex + firstIndex) / 2);
    while (firstIndex <= lastIndex) {
        // console.log(firstIndex, middleIndex, lastIndex);
        var item = array[middleIndex];
        if (item.start === target.start && item.end === target.end) {
            return middleIndex;
        }
        else if (target.start > item.end) {
            firstIndex = middleIndex + 1;
        }
        else if (target.end < item.start) {
            lastIndex = middleIndex - 1;
        }
        else {
            break;
        }
        middleIndex = Math.floor((lastIndex + firstIndex) / 2);
    }
    return 0 - middleIndex;
};
exports.print = function (env) {
    var reports = [];
    var coverageMap = {};
    var allCoverageData = [];
    var workspace = env.getWorkspace();
    var resultTempFolder = path_1.default.join(workspace, 'result-temp');
    (fs_1.default.readdirSync(resultTempFolder) || []).forEach(function (threadFolder) {
        var summaryFilename = path_1.default.join(path_1.default.join(resultTempFolder, threadFolder, 'summary.json'));
        var report = jsonfile_1.default.readFileSync(summaryFilename);
        (report || []).forEach(function (item) { return reports.push(item); });
        var coverageFilename = path_1.default.join(path_1.default.join(resultTempFolder, threadFolder, 'coverages.json'));
        if (fs_1.default.existsSync(coverageFilename)) {
            var coverageData = jsonfile_1.default.readFileSync(coverageFilename);
            coverageData.reduce(function (map, item) {
                var ranges = item.ranges, text = item.text;
                var url = utils_1.shorternUrl(item.url);
                var data = map[url];
                if (!data) {
                    data = { url: url, ranges: ranges, text: text };
                    allCoverageData.push(data);
                    map[url] = data;
                }
                else {
                    (ranges || []).forEach(function (range) {
                        var index = binarySearch(range, data);
                        if (index < 0) {
                            data.splice(index * -1 + 1, 0, range);
                        }
                    });
                }
                return map;
            }, coverageMap);
        }
    });
    report_generator_1.generateReport({ filename: 'report.html', results: reports });
    pti.write(allCoverageData);
    child_process_1.spawnSync('nyc', ['report', '--reporter=html'], { stdio: 'inherit' });
    console.table(reports.map(function (item) {
        return {
            Story: item.storyName,
            Flow: item.flowName,
            Steps: item.numberOfStep,
            'UI Behavior': item.numberOfUIBehavior,
            Passed: item.numberOfSuccess,
            Failed: item.numberOfFailed,
            'Ignored Errors': (item.ignoreErrorList || []).length,
            'Ajax calls': item.numberOfAjax,
            'Slow ajax calls': (item.slowAjaxRequest || []).length,
            'Spent (ms)': Math.round((item.spent || '').split(' ')[1].split('ms')[0]),
            'Pass Rate(%)': ((item.numberOfSuccess / item.numberOfStep) * 100)
                .toFixed(2)
                .toString()
        };
    }), [
        'Story',
        'Flow',
        'Steps',
        'UI Behavior',
        'Passed',
        'Failed',
        'Ignored Errors',
        'Ajax calls',
        'Slow ajax calls',
        'Spent (ms)',
        'Pass Rate(%)'
    ]);
};
//# sourceMappingURL=print.js.map