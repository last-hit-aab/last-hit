"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var html_creator_1 = __importDefault(require("html-creator"));
var path_1 = __importDefault(require("path"));
var buildScreenshotRows = function (reports) {
    return reports
        .map(function (report) {
        return (report.screenCompareList || []).map(function (step) {
            return {
                type: 'tr',
                attributes: { class: 'test-result-step-row test-result-step-row-altone' },
                content: [
                    {
                        type: 'td',
                        attributes: { class: 'test-result-step-command-cell' },
                        content: report.storyName
                    },
                    {
                        type: 'td',
                        attributes: { class: 'test-result-step-command-cell' },
                        content: report.flowName
                    },
                    {
                        type: 'td',
                        attributes: { class: 'test-result-step-command-cell' },
                        content: step.stepIndex
                    },
                    {
                        type: 'td',
                        attributes: { class: 'test-result-step-command-cell' },
                        content: [
                            {
                                type: 'img',
                                attributes: {
                                    src: "screen-record\\" + report.storyName + "\\" + report.flowName + "\\" + step.stepUuid + "_baseline.png",
                                    style: 'width:500px;height:300px;'
                                }
                            }
                        ]
                    },
                    {
                        type: 'td',
                        attributes: { class: 'test-result-step-command-cell' },
                        content: [
                            {
                                type: 'img',
                                attributes: {
                                    src: "screen-record\\" + report.storyName + "\\" + report.flowName + "\\" + step.stepUuid + "_replay.png",
                                    style: 'width:500px;height:300px;'
                                }
                            }
                        ]
                    },
                    {
                        type: 'td',
                        attributes: { class: 'test-result-step-command-cell' },
                        content: [
                            {
                                type: 'img',
                                attributes: {
                                    src: "screen-record\\" + report.storyName + "\\" + report.flowName + "\\" + step.stepUuid + "_diff.png",
                                    style: 'width:500px;height:300px;'
                                }
                            }
                        ]
                    }
                ]
            };
        });
    })
        .reduce(function (all, rows) {
        all.push.apply(all, rows);
        return all;
    }, []);
};
var buildDataRows = function (reports) {
    return reports.map(function (row) {
        var class_failed = 'test-result-step-result-cell-failure';
        if (row.numberOfFailed <= 0) {
            class_failed = 'test-result-step-result-cell';
        }
        return {
            type: 'tr',
            attributes: { class: 'test-result-step-row test-result-step-row-altone' },
            content: [
                {
                    type: 'td',
                    attributes: { class: 'test-result-step-command-cell' },
                    content: row.storyName
                },
                {
                    type: 'td',
                    attributes: { class: 'test-result-step-command-cell' },
                    content: row.flowName
                },
                {
                    type: 'td',
                    attributes: { class: 'test-result-step-command-cell' },
                    content: "" + row.numberOfStep
                },
                {
                    type: 'td',
                    attributes: { class: 'test-result-step-command-cell' },
                    content: "" + row.numberOfUIBehavior
                },
                {
                    type: 'td',
                    attributes: { class: 'test-result-step-result-cell-ok' },
                    content: "" + row.numberOfSuccess
                },
                {
                    type: 'td',
                    attributes: { class: class_failed },
                    content: "" + row.numberOfFailed
                },
                {
                    type: 'td',
                    attributes: { class: 'test-result-step-command-cell' },
                    content: (row.ignoreErrorList || []).length.toString()
                },
                {
                    type: 'td',
                    attributes: { class: 'test-result-step-command-cell' },
                    content: row.numberOfAjax.toString()
                },
                {
                    type: 'td',
                    attributes: { class: 'test-result-step-command-cell' },
                    content: (row.slowAjaxRequest || []).length.toString()
                },
                {
                    type: 'td',
                    attributes: { class: 'test-result-step-command-cell' },
                    content: "" + Math.round(parseInt((row.spent || '').split(' ')[1].split('ms')[0]))
                },
                {
                    type: 'td',
                    attributes: { class: 'test-result-step-command-cell' },
                    content: ((row.numberOfSuccess / row.numberOfStep) * 100).toFixed(2)
                }
            ]
        };
    });
};
var styles = "\n.test-result-step-result-cell-failure {\n\tborder-bottom: 1px solid gray;\n\tbackground-color: red;\n}\n.test-result-step-result-cell-ok {\n\tborder-bottom: 1px solid gray;\n\tbackground-color: green;\n}\n.test-result-step-description-cell {\n\tborder-bottom: 1px solid gray;\n}\n.test-result-table {\n\tborder: 1px solid black;\n\twidth: 800px;\n\tmargin-bottom: 20px;\n}\n.test-result-table-header-cell {\n\tborder-bottom: 1px solid black;\n\tbackground-color: silver;\n}\n.test-result-step-command-cell {\n\tborder-bottom: 1px solid gray;\n}\n.test-result-step-result-cell-notperformed {\n\tborder-bottom: 1px solid gray;\n\tbackground-color: white;\n}\n.test-result-describe-cell {\n\tbackground-color: tan;\n\tfont-style: italic;\n}\n.test-cast-status-box-ok {\n\tborder: 1px solid black;\n\tfloat: left;\n\tmargin-right: 10px;\n\twidth: 45px;\n\theight: 25px;\n\tbackground-color: green;\n}\n.coverage-link {\n\tmargin-top: 20px;\n\tdisplay: inline-block;\n\tfont-size: 1.2em;\n}\n\n.coverage-link:active,\n.coverage-link:link,\n.coverage-link:visited {\n\tcolor: darkslategray;\n}\n";
var buildHtml = function (dataRows, screenshotRows) {
    return new html_creator_1.default([
        {
            type: 'head',
            content: [
                { type: 'title', content: 'CI Report' },
                {
                    type: 'style',
                    attributes: { type: 'text/css' },
                    content: styles
                }
            ]
        },
        {
            type: 'body',
            // attributes: { style: 'padding: 1rem' },
            content: [
                {
                    type: 'h1',
                    attributes: { class: 'test-results-header' },
                    content: 'CI Report'
                },
                {
                    type: 'table',
                    attributes: { class: 'test-result-table', cellspacing: 0 },
                    content: [
                        {
                            type: 'thead',
                            content: [
                                {
                                    type: 'tr',
                                    content: [
                                        {
                                            type: 'td',
                                            attributes: { class: 'test-result-table-header-cell' },
                                            content: 'Story'
                                        },
                                        {
                                            type: 'td',
                                            attributes: { class: 'test-result-table-header-cell' },
                                            content: 'Flow'
                                        },
                                        {
                                            type: 'td',
                                            attributes: { class: 'test-result-table-header-cell' },
                                            content: 'Steps'
                                        },
                                        {
                                            type: 'td',
                                            attributes: { class: 'test-result-table-header-cell' },
                                            content: 'UI Behavior'
                                        },
                                        {
                                            type: 'td',
                                            attributes: { class: 'test-result-table-header-cell' },
                                            content: 'Passed'
                                        },
                                        {
                                            type: 'td',
                                            attributes: { class: 'test-result-table-header-cell' },
                                            content: 'Failed'
                                        },
                                        {
                                            type: 'td',
                                            attributes: { class: 'test-result-table-header-cell' },
                                            content: 'Ignore Errors'
                                        },
                                        {
                                            type: 'td',
                                            attributes: { class: 'test-result-table-header-cell' },
                                            content: 'Http calls'
                                        },
                                        {
                                            type: 'td',
                                            attributes: { class: 'test-result-table-header-cell' },
                                            content: 'Slow Http/Https Calls'
                                        },
                                        {
                                            type: 'td',
                                            attributes: { class: 'test-result-table-header-cell' },
                                            content: 'Spent (ms)'
                                        },
                                        {
                                            type: 'td',
                                            attributes: { class: 'test-result-table-header-cell' },
                                            content: 'Pass Rate (%)'
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            type: 'tbody',
                            content: dataRows
                        }
                    ]
                },
                {
                    type: 'table',
                    attributes: { class: 'test-result-table', cellspacing: 0 },
                    content: [
                        {
                            type: 'thead',
                            content: [
                                {
                                    type: 'tr',
                                    content: [
                                        {
                                            type: 'td',
                                            attributes: { class: 'test-result-table-header-cell' },
                                            content: 'Story Name'
                                        },
                                        {
                                            type: 'td',
                                            attributes: { class: 'test-result-table-header-cell' },
                                            content: 'Flow Name'
                                        },
                                        {
                                            type: 'td',
                                            attributes: { class: 'test-result-table-header-cell' },
                                            content: 'Step Number'
                                        },
                                        {
                                            type: 'td',
                                            attributes: { class: 'test-result-table-header-cell' },
                                            content: 'Baseline'
                                        },
                                        {
                                            type: 'td',
                                            attributes: { class: 'test-result-table-header-cell' },
                                            content: 'Replay'
                                        },
                                        {
                                            type: 'td',
                                            attributes: { class: 'test-result-table-header-cell' },
                                            content: 'Different'
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            type: 'tbody',
                            content: screenshotRows
                        }
                    ]
                },
                {
                    type: 'a',
                    attributes: { href: 'coverage/index.html', class: 'coverage-link' },
                    content: 'Javascript & StyleSheet Coverage Report'
                }
            ]
        }
    ]);
};
exports.generateReport = function (options) {
    var filename = options.filename, results = options.results;
    var rows = buildDataRows(results);
    var screenshotRows = buildScreenshotRows(results);
    var html = buildHtml(rows, screenshotRows);
    html.renderHTMLToFile(path_1.default.join(process.cwd(), filename));
};
//# sourceMappingURL=report-generator.js.map