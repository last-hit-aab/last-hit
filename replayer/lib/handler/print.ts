import { spawnSync } from 'child_process';
import fs from 'fs';
import jsonfile from 'jsonfile';
import path from 'path';
import { CoverageEntry } from 'puppeteer';
import Environment from '../config/env';
import * as pti from '../pti';
import { CoverageEntryRange, Coverages, Report } from '../types';
import { shorternUrl } from '../utils';
import { generateReport } from './report-generator';

const binarySearch = (target: CoverageEntryRange, array: Array<CoverageEntryRange>): number => {
	let firstIndex = 0;
	let lastIndex = array.length - 1;
	let middleIndex = Math.floor((lastIndex + firstIndex) / 2);
	while (firstIndex <= lastIndex) {
		// console.log(firstIndex, middleIndex, lastIndex);
		const item = array[middleIndex];
		if (item.start === target.start && item.end === target.end) {
			return middleIndex;
		} else if (target.start > item.end) {
			firstIndex = middleIndex + 1;
		} else if (target.end < item.start) {
			lastIndex = middleIndex - 1;
		} else {
			break;
		}
		middleIndex = Math.floor((lastIndex + firstIndex) / 2);
	}
	return 0 - middleIndex;
};

export const print = (env: Environment): void => {
	const reports: Array<Report> = [];
	const coverageMap = {};
	const allCoverageData: Coverages = [];
	const workspace = env.getWorkspace();

	const resultTempFolder = path.join(workspace, 'result-temp');

	(fs.readdirSync(resultTempFolder) || []).forEach(threadFolder => {
		const summaryFilename = path.join(
			path.join(resultTempFolder, threadFolder, 'summary.json')
		);
		const report: Report[] = jsonfile.readFileSync(summaryFilename);
		(report || []).forEach(item => reports.push(item));
		const coverageFilename = path.join(
			path.join(resultTempFolder, threadFolder, 'coverages.json')
		);
		if (fs.existsSync(coverageFilename)) {
			const coverageData: Coverages = jsonfile.readFileSync(coverageFilename);
			coverageData.reduce((map, item: CoverageEntry) => {
				const { ranges, text } = item;
				const url = shorternUrl(item.url);
				let data = map[url];
				if (!data) {
					data = { url, ranges, text };
					allCoverageData.push(data);
					map[url] = data;
				} else {
					(ranges || []).forEach(range => {
						const index = binarySearch(range, data);
						if (index < 0) {
							data.splice(index * -1 + 1, 0, range);
						}
					});
				}
				return map;
			}, coverageMap);
		}
	});
	generateReport({ filename: 'report.html', results: reports });
	pti.write(allCoverageData);
	spawnSync('nyc', ['report', '--reporter=html'], { stdio: 'inherit' });

	console.table(
		reports.map(item => {
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
				'Spent (ms)': Math.round(
					((item.spent || '').split(' ')[1].split('ms')[0] as unknown) as number
				),
				'Pass Rate(%)': ((item.numberOfSuccess / item.numberOfStep) * 100)
					.toFixed(2)
					.toString()
			};
		}),
		[
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
		]
	);
};
