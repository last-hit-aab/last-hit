// puppeteer-to-istanbul 1.2.2
const fs = require('fs');
const mkdirp = require('mkdirp');
const v8toIstanbul = require('v8-to-istanbul');
const clone = require('clone');
const pathLib = require('path');
const { URL } = require('url');

const storagePath = './.nyc_output/js';

const shorternUrl = url => {
	try {
		const parsed = new URL(url);
		parsed.search = '';
		parsed.hash = '';
		return parsed.href;
	} catch {
		// parse fail, not a valid url, return directly
		return url;
	}
};
class OutputFiles {
	constructor(coverageInfo) {
		// Clone coverageInfo to prevent mutating the passed in data
		this.coverageInfo = clone(coverageInfo);
		this.iterator = 0;
		this._parseAndIsolate();
	}

	rewritePath(path) {
		// generate a new path relative to ./coverage/js.
		// this would be around where you'd use mkdirp.

		var str = ``;

		path = shorternUrl(path);
		// Get the last element in the path name
		var truncatedPath = pathLib.basename(path);

		// Special case: when html present, strip and return specialized string
		if (truncatedPath.includes('.html')) {
			truncatedPath = pathLib.resolve(storagePath, truncatedPath) + '.puppeteerTemp-inline';
		} else {
			truncatedPath = truncatedPath.split('.js')[0];
			truncatedPath = pathLib.resolve(storagePath, truncatedPath);
		}
		mkdirp.sync(storagePath);
		if (fs.existsSync(truncatedPath + '.js')) {
			this.iterator++;
			str = `${truncatedPath}-${this.iterator}.js`;
			return str;
		} else {
			str = `${truncatedPath}.js`;
			return str;
		}
	}

	_parseAndIsolate() {
		for (var i = 0; i < this.coverageInfo.length; i++) {
			var path = this.rewritePath(this.coverageInfo[i].url);
			this.coverageInfo[i].url = path;
			fs.writeFileSync(path, this.coverageInfo[i].text);
		}
	}

	getTransformedCoverage() {
		return this.coverageInfo;
	}
}

class PuppeteerToV8 {
	constructor(coverageInfo) {
		this.coverageInfo = coverageInfo;
	}

	setCoverageInfo(coverageInfo) {
		this.coverageInfo = coverageInfo;
	}

	convertCoverage() {
		// Iterate through coverage info and create IDs
		let id = 0;

		return this.coverageInfo.map(coverageItem => {
			return {
				scriptId: id++,
				url: 'file://' + coverageItem.url,
				functions: [
					{
						ranges: coverageItem.ranges.map(this.convertRange),
						isBlockCoverage: true
					}
				]
			};
		});
	}

	// Takes in a Puppeteer range object with start and end properties and
	// converts it to a V8 range with startOffset, endOffset, and count properties
	convertRange(range) {
		return {
			startOffset: range.start,
			endOffset: range.end,
			count: 1
		};
	}
}

class PuppeteerToIstanbul {
	constructor(coverageInfo) {
		this.coverageInfo = coverageInfo;
		this.puppeteerToConverter = new OutputFiles(coverageInfo).getTransformedCoverage();
		this.puppeteerToV8Info = new PuppeteerToV8(this.puppeteerToConverter).convertCoverage();
	}

	setCoverageInfo(coverageInfo) {
		this.coverageInfo = coverageInfo;
	}

	writeIstanbulFormat() {
		var fullJson = {};

		this.puppeteerToV8Info.forEach(jsFile => {
			const script = v8toIstanbul(jsFile.url);
			script.applyCoverage(jsFile.functions);

			let istanbulCoverage = script.toIstanbul();
			let keys = Object.keys(istanbulCoverage);

			fullJson[keys[0]] = istanbulCoverage[keys[0]];
		});

		mkdirp.sync('./.nyc_output');
		fs.writeFileSync('./.nyc_output/out.json', JSON.stringify(fullJson), 'utf8');
	}
}

module.exports = {
	write: puppeteerFormat => {
		const pti = new PuppeteerToIstanbul(puppeteerFormat);
		pti.writeIstanbulFormat();
	}
};
