const htmlCreator = require('html-creator');
const path = require('path');

const generate_report = options => {
	const { file_name, results } = options;
	const ci_results = buildResultRow(results)
	const screen_reports = buildCompareScreen(results)
	console.log(JSON.stringify(screen_reports))

	const html = buildHtml(ci_results, screen_reports);
	html.renderHTMLToFile(path.join(process.cwd(), file_name));
};

module.exports = { generate_report };


const buildCompareScreen = ci_results => {

	const compare_screens = []
	ci_results.map(ci_result => {
		ci_result.screen_compare_result.map(step_of_screem => {
			compare_screens.push({
				type: 'tr',
				attributes: { class: 'test-result-step-row test-result-step-row-altone' },
				content: [
					{
						type: 'td',
						attributes: { class: 'test-result-step-command-cell' },
						content: ci_result.storyName
					},
					{
						type: 'td',
						attributes: { class: 'test-result-step-command-cell' },
						content: ci_result.flowName
					},
					{
						type: 'td',
						attributes: { class: 'test-result-step-command-cell' },
						content: step_of_screem
					},
					{
						type: 'td',
						attributes: { class: 'test-result-step-command-cell' },
						content: [{
							type: 'img',
							attributes: {
								src: `screen_record\\${ci_result.flowName}\\${step_of_screem}_baseline.png`,
								style: "width:500px;height:300px;"
							}
						}]



					},
					{
						type: 'td',
						attributes: { class: 'test-result-step-command-cell' },
						content: [{
							type: 'img',
							attributes: {
								src: `screen_record\\${ci_result.flowName}\\${step_of_screem}_replay.png`,
								style: "width:500px;height:300px;"
							}
						}]
					},
					{
						type: 'td',
						attributes: { class: 'test-result-step-command-cell' },
						content: [{
							type: 'img',
							attributes: {
								src: `screen_record\\${ci_result.flowName}\\${step_of_screem}_diff.png`,
								style: "width:500px;height:300px;"
							}
						}]
					},
				]
			})
			// console.log("step_of_screem,", step_of_screem)
		})
	})


	// console.log()

	return compare_screens;
}

const buildResultRow = ci_results => {
	const rows = ci_results.map(ci_result => {
		var class_failed = 'test-result-step-result-cell-failure';
		if (ci_result.numberOfFailed <= 0) {
			class_failed = 'test-result-step-result-cell';
		}

		return {
			type: 'tr',
			attributes: { class: 'test-result-step-row test-result-step-row-altone' },
			content: [
				{
					type: 'td',
					attributes: { class: 'test-result-step-command-cell' },
					content: ci_result.storyName
				},
				{
					type: 'td',
					attributes: { class: 'test-result-step-command-cell' },
					content: ci_result.flowName
				},
				{
					type: 'td',
					attributes: { class: 'test-result-step-command-cell' },
					content: ci_result.numberOfStep.toString()
				},
				{
					type: 'td',
					attributes: { class: 'test-result-step-command-cell' },
					content: ci_result.numberOfUIBehavior.toString()
				},
				{
					type: 'td',
					attributes: { class: 'test-result-step-result-cell-ok' },
					content: ci_result.numberOfSuccess.toString()
				},
				{
					type: 'td',
					attributes: { class: class_failed },
					content: ci_result.numberOfFailed.toString()
				},
				{
					type: 'td',
					attributes: { class: 'test-result-step-command-cell' },
					content: (ci_result.ignoreErrorList || []).length.toString()
				},

				{
					type: 'td',
					attributes: { class: 'test-result-step-command-cell' },
					content: ci_result.numberOfAjax.toString()
				},
				{
					type: 'td',
					attributes: { class: 'test-result-step-command-cell' },
					content: (ci_result.slowAjaxRequest || []).length.toString()
				},
				{
					type: 'td',
					attributes: { class: 'test-result-step-command-cell' },
					content: Math.round((ci_result.spent || '').split(' ')[1].split('ms')[0]).toString()
				},
				{
					type: 'td',
					attributes: { class: 'test-result-step-command-cell' },
					content: ((ci_result.numberOfSuccess / ci_result.numberOfStep) * 100).toFixed(2).toString()
				}
			]
		};
	});

	return rows;
};

// generate_report()
function buildHtml(ci_results_content, screen_reports) {
	const html = new htmlCreator([
		{
			type: 'head',
			content: [
				{ type: 'title', content: 'CI Report' },
				{
					type: 'style',
					attributes: { type: 'text/css' },
					content: `.test-result-step-result-cell-failure {  border-bottom: 1px solid gray; background-color: red;} 
                    .test-result-step-result-cell-ok {   border-bottom: 1px solid gray;   background-color: green;} 
                    .test-result-step-description-cell {   border-bottom: 1px solid gray;} 
                    .test-result-table {border: 1px solid black; width: 800px;} 
                    .test-result-table-header-cell {   border-bottom: 1px solid black;  background-color: silver;} 
                    .test-result-step-command-cell {    border-bottom: 1px solid gray;}
                    .test-result-step-result-cell-notperformed {
                        border-bottom: 1px solid gray;
                        background-color: white;
                    }
                    .test-result-describe-cell {
                        background-color: tan;
                        font-style: italic;
                    }
            
                    .test-cast-status-box-ok {
                        border: 1px solid black;
                        float: left;
                        margin-right: 10px;
                        width: 45px;
                        height: 25px;
                        background-color: green;
                    }
                    .coverage-link {
                        margin-top: 20px;
                        display: inline-block;
                        font-size: 1.2em;
                    }
            
                    .coverage-link:active,
                    .coverage-link:link,
                    .coverage-link:visited {
                        color: darkslategray;
                    }
                    `
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
							content: ci_results_content
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
											content: 'Step Id'
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
							content: screen_reports
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

	return html;
}
