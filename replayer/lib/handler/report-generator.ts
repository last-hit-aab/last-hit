import HTMLCreator from 'html-creator';
import path from 'path';
import { Report } from '../types';

type DataRow = {
	type: 'tr';
	attributes: {
		class: string;
	};
	content: Array<{
		type: 'td';
		attributes: {
			class: string;
		};
		content: string;
	}>;
};

const buildScreenshotRows = (reports: Report[]): DataRow[] => {
	return reports
		.map(report => {
			return (report.screenCompareList || []).map(step => {
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
										src: `screen-record\\${report.storyName}\\${report.flowName}\\${step.stepUuid}_baseline.png`,
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
										src: `screen-record\\${report.storyName}\\${report.flowName}\\${step.stepUuid}_replay.png`,
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
										src: `screen-record\\${report.storyName}\\${report.flowName}\\${step.stepUuid}_diff.png`,
										style: 'width:500px;height:300px;'
									}
								}
							]
						}
					]
				} as DataRow;
			});
		})
		.reduce((all, rows: DataRow[]) => {
			all.push(...rows);
			return all;
		}, [] as DataRow[]);
};

const buildDataRows = (reports: Report[]): DataRow[] => {
	return reports.map(row => {
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
					content: `${row.numberOfStep}`
				},
				{
					type: 'td',
					attributes: { class: 'test-result-step-command-cell' },
					content: `${row.numberOfUIBehavior}`
				},
				{
					type: 'td',
					attributes: { class: 'test-result-step-result-cell-ok' },
					content: `${row.numberOfSuccess}`
				},
				{
					type: 'td',
					attributes: { class: class_failed },
					content: `${row.numberOfFailed}`
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
					content: `${Math.round(
						parseInt((row.spent || '').split(' ')[1].split('ms')[0])
					)}`
				},
				{
					type: 'td',
					attributes: { class: 'test-result-step-command-cell' },
					content: ((row.numberOfSuccess / row.numberOfStep) * 100).toFixed(2)
				}
			]
		} as DataRow;
	});
};

const styles = `
.test-result-step-result-cell-failure {
	border-bottom: 1px solid gray;
	background-color: red;
}
.test-result-step-result-cell-ok {
	border-bottom: 1px solid gray;
	background-color: green;
}
.test-result-step-description-cell {
	border-bottom: 1px solid gray;
}
.test-result-table {
	border: 1px solid black;
	width: 800px;
	margin-bottom: 20px;
}
.test-result-table-header-cell {
	border-bottom: 1px solid black;
	background-color: silver;
}
.test-result-step-command-cell {
	border-bottom: 1px solid gray;
}
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
`;
const buildHtml = (dataRows: DataRow[], screenshotRows: DataRow[]) => {
	return new HTMLCreator([
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

export const generateReport = (options: { filename: string; results: Report[] }): void => {
	const { filename, results } = options;
	const rows = buildDataRows(results);
	const screenshotRows = buildScreenshotRows(results);

	const html = buildHtml(rows, screenshotRows);
	html.renderHTMLToFile(path.join(process.cwd(), filename));
};
