"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = __importDefault(require("path"));
var fs_1 = __importDefault(require("fs"));
var handlebars_1 = __importDefault(require("handlebars"));
var DEFAULT_TEMPLATE = "report-default.hbs";
var FILE_READ_OPTIONS = { encoding: "utf8" };
handlebars_1.default.registerHelper("len", function (list) {
    return (list || []).length.toString();
});
handlebars_1.default.registerHelper("ms", function (spent) {
    return "" + Math.round(parseInt((spent || "").split(" ")[1].split("ms")[0]));
});
handlebars_1.default.registerHelper("rate", function (numberOfSuccess, numberOfStep) {
    return ((numberOfSuccess / numberOfStep) * 100).toFixed(2);
});
handlebars_1.default.registerHelper("screenlist", function (results) {
    //   console.log(JSON.stringify(results));
    var itemsAsHtml = results.map(function (result) {
        return (result.screenCompareList || []).map(function (step) {
            return ("<td class='test-result-step-command-cell'>" +
                result.storyName +
                "</td>  \n" +
                "<td class='test-result-step-command-cell'>" +
                result.flowName +
                "</td> \n" +
                "<td class='test-result-step-command-cell'>" +
                step.stepIndex +
                "</td> \n" +
                ("<td class=\"test-result-step-command-cell\"><img\n\t\tsrc=\"screen-record\\" + result.storyName + "\\" + result.flowName + "\\" + step.stepUuid + "_baseline.png\"\n\t\tstyle=\"width:500px;height:300px;\" /></td> \n") +
                ("<td class=\"test-result-step-command-cell\"><img\n\t\tsrc=\"screen-record\\" + result.storyName + "\\" + result.flowName + "\\" + step.stepUuid + "_replay.png\"\n\t\tstyle=\"width:500px;height:300px;\" /></td> \n") +
                ("<td class=\"test-result-step-command-cell\"><img\n\t\tsrc=\"screen-record\\" + result.storyName + "\\" + result.flowName + "\\" + step.stepUuid + "_diff.png\"\n\t\tstyle=\"width:500px;height:300px;\" /></td> \n"));
        });
    });
    return "<tr>\n" + itemsAsHtml.join("\n") + "\n</tr>";
});
exports.generateReport = function (options) {
    var htmlTemplate = path_1.default.join(__dirname, DEFAULT_TEMPLATE), compiler = handlebars_1.default.compile(fs_1.default.readFileSync(htmlTemplate, FILE_READ_OPTIONS));
    try {
        var content = compiler({
            results: options.results
        });
        fs_1.default.writeFileSync(path_1.default.join(process.cwd()) + "/report.html", content);
    }
    catch (err) {
        console.error(err);
    }
};
//# sourceMappingURL=report-generator.js.map