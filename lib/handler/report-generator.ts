import path from "path";
import fs from "fs";
import handlebars from "handlebars";

const DEFAULT_TEMPLATE = "report-default.hbs";
const FILE_READ_OPTIONS = { encoding: "utf8" };

handlebars.registerHelper("len", function(list) {
  return (list || []).length.toString();
});

handlebars.registerHelper("ms", function(spent) {
  return `${Math.round(parseInt((spent || "").split(" ")[1].split("ms")[0]))}`;
});

handlebars.registerHelper("rate", function(numberOfSuccess, numberOfStep) {
  return ((numberOfSuccess / numberOfStep) * 100).toFixed(2);
});

handlebars.registerHelper("screenlist", function(results) {
  //   console.log(JSON.stringify(results));
  const itemsAsHtml = results.map(result => {
    return (result.screenCompareList || []).map(step => {
      return (
        "<td class='test-result-step-command-cell'>" +
        result.storyName +
        "</td>  \n" +
        "<td class='test-result-step-command-cell'>" +
        result.flowName +
        "</td> \n" +
        "<td class='test-result-step-command-cell'>" +
        step.stepIndex +
        "</td> \n" +
        `<td class="test-result-step-command-cell"><img
		src="screen-record\\${result.storyName}\\${result.flowName}\\${step.stepUuid}_baseline.png"
		style="width:500px;height:300px;" /></td> \n` +
        `<td class="test-result-step-command-cell"><img
		src="screen-record\\${result.storyName}\\${result.flowName}\\${step.stepUuid}_replay.png"
		style="width:500px;height:300px;" /></td> \n` +
        `<td class="test-result-step-command-cell"><img
		src="screen-record\\${result.storyName}\\${result.flowName}\\${step.stepUuid}_diff.png"
		style="width:500px;height:300px;" /></td> \n`
      );
    });
  });

  return "<tr>\n" + itemsAsHtml.join("\n") + "\n</tr>";
});

export const generateReport = (options: {
  filename: string;
  results: any;
}): void => {
  var htmlTemplate = path.join(__dirname, DEFAULT_TEMPLATE),
    compiler = handlebars.compile(
      fs.readFileSync(htmlTemplate, FILE_READ_OPTIONS)
    );

  try {
    const content = compiler({
      results: options.results
    });

    fs.writeFileSync(path.join(process.cwd()) + "/report.html", content);
  } catch (err) {
    console.error(err);
  }
};
