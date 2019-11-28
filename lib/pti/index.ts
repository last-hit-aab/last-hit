// puppeteer-to-istanbul 1.2.2
import clone from 'clone';
import fs from 'fs';
import jsonfile from 'jsonfile';
import mkdirp from 'mkdirp';
import pathLib from 'path';
import v8toIstanbul from 'v8-to-istanbul';
import { CoverageEntryRange, Coverages } from '../types';
import { shorternUrl } from '../utils';

type V8CoverageEntryRange = { startOffset: number; endOffset: number; count: number };
type V8CoverageEntry = {
	scriptId: number;
	url: string;
	functions: Array<{ ranges: Array<V8CoverageEntryRange>; isBlockCoverage: boolean }>;
};

const nycFolder = pathLib.join(process.cwd(), '.nyc_output');
const storageFolder = pathLib.join(nycFolder, 'js');
const nycOutFilename = pathLib.join(nycFolder, 'out.json');

class OutputFiles {
	private iterator: number = 0;
	private coverages: Coverages;
	constructor(coverages: Coverages) {
		// Clone coverageInfo to prevent mutating the passed in data
		this.coverages = clone(coverages);
		this.parseAndIsolate();
	}
	private rewritePath(path: string): string {
		// generate a new path relative to ./coverage/js.
		// this would be around where you'd use mkdirp.
		path = shorternUrl(path);
		// Get the last element in the path name
		var truncatedPath = pathLib.basename(path);

		// Special case: when html present, strip and return specialized string
		if (truncatedPath.includes('.html')) {
			truncatedPath = pathLib.resolve(storageFolder, truncatedPath) + '.puppeteerTemp-inline';
		} else {
			truncatedPath = truncatedPath.split('.js')[0];
			truncatedPath = pathLib.resolve(storageFolder, truncatedPath);
		}
		mkdirp.sync(storageFolder);
		if (fs.existsSync(truncatedPath + '.js')) {
			this.iterator++;
			return `${truncatedPath}-${this.iterator}.js`;
		} else {
			return `${truncatedPath}.js`;
		}
	}
	private parseAndIsolate() {
		(this.coverages || []).forEach(coverage => {
			const path = this.rewritePath(coverage.url);
			coverage.url = path;
			fs.writeFileSync(path, coverage.text);
		});
	}
	getTransformedCoverage(): Coverages {
		return this.coverages;
	}
}

class PuppeteerToV8 {
	private coverages: Coverages;
	constructor(coverages: Coverages) {
		this.coverages = coverages;
	}
	convertCoverage(): Array<V8CoverageEntry> {
		// Iterate through coverage info and create IDs
		return this.coverages.map((coverage, index) => {
			return {
				scriptId: index,
				url: `file://${coverage.url}`,
				functions: [
					{
						ranges: coverage.ranges.map(this.convertRange),
						isBlockCoverage: true
					}
				]
			} as V8CoverageEntry;
		});
	}
	// Takes in a Puppeteer range object with start and end properties and
	// converts it to a V8 range with startOffset, endOffset, and count properties
	convertRange(range: CoverageEntryRange): V8CoverageEntryRange {
		return {
			startOffset: range.start,
			endOffset: range.end,
			count: 1
		};
	}
}

class PuppeteerToIstanbul {
	private puppeteerToV8Info: Array<V8CoverageEntry>;
	constructor(coverages: Coverages) {
		this.puppeteerToV8Info = new PuppeteerToV8(
			new OutputFiles(coverages).getTransformedCoverage()
		).convertCoverage();
	}
	writeIstanbulFormat() {
		const fullJson = {};

		this.puppeteerToV8Info.forEach(jsFile => {
			const script = v8toIstanbul(jsFile.url);
			script.applyCoverage(jsFile.functions);

			const istanbulCoverage = script.toIstanbul();
			const keys = Object.keys(istanbulCoverage);

			fullJson[keys[0]] = istanbulCoverage[keys[0]];
		});

		mkdirp.sync(nycFolder);
		jsonfile.writeFileSync(nycOutFilename, fullJson);
	}
}

export const write = (puppeteerFormat: Coverages): void => {
	const pti = new PuppeteerToIstanbul(puppeteerFormat);
	pti.writeIstanbulFormat();
};
