// increase number of stack frames(from 10, https://github.com/v8/v8/wiki/Stack-Trace-API)
Error.stackTraceLimit = 100;

//#region Add support for redirecting the loading of node modules
export const injectNodeModuleLookupPath = (injectPath: string): void => {
	if (!injectPath) {
		throw new Error('Missing injectPath');
	}

	// @ts-ignore
	const Module = require('module');
	const path = require('path');

	const nodeModulesPath = path.join(__dirname, '../node_modules');

	// @ts-ignore
	const originalResolveLookupPaths = Module._resolveLookupPaths;

	// @ts-ignore
	Module._resolveLookupPaths = function(moduleName, parent) {
		const paths = originalResolveLookupPaths(moduleName, parent);
		for (let i = 0, len = paths.length; i < len; i++) {
			if (paths[i] === nodeModulesPath) {
				paths.splice(i, 0, injectPath);
				break;
			}
		}

		return paths;
	};
};
//#endregion

//#region URI helpers
export const uriFromPath = (aPath: string): string => {
	const path = require('path');

	let pathName = path.resolve(aPath).replace(/\\/g, '/');
	if (pathName.length > 0 && pathName.charAt(0) !== '/') {
		pathName = '/' + pathName;
	}

	/** @type {string} */
	let uri: string;
	if (process.platform === 'win32' && pathName.startsWith('//')) {
		// specially handle Windows UNC paths
		uri = encodeURI('file:' + pathName);
	} else {
		uri = encodeURI('file://' + pathName);
	}

	return uri.replace(/#/g, '%23');
};
//#endregion

//#region FS helpers
export const readFile = (file: string): Promise<string> => {
	const fs = require('fs');

	return new Promise(function(resolve, reject) {
		fs.readFile(file, 'utf8', function(err, data) {
			if (err) {
				reject(err);
				return;
			}
			resolve(data);
		});
	});
};

/**
 * @param {string} file
 * @param {string} content
 * @returns {Promise<void>}
 */
exports.writeFile = function(file, content) {
	const fs = require('fs');

	return new Promise(function(resolve, reject) {
		fs.writeFile(file, content, 'utf8', function(err) {
			if (err) {
				reject(err);
				return;
			}
			resolve();
		});
	});
};

const mkdir = (dir: string): Promise<string> => {
	const fs = require('fs');

	return new Promise((resolve, reject) =>
		fs.mkdir(dir, (err: Error) =>
			err && (err as any).code !== 'EEXIST' ? reject(err) : resolve(dir)
		)
	);
};

const mkdirp = (dir: string): Promise<string> => {
	const path = require('path');

	return mkdir(dir).then(null, (err: Error) => {
		if (err && (err as any).code === 'ENOENT') {
			const parent = path.dirname(dir);

			if (parent !== dir) {
				// if not arrived at root
				return mkdirp(parent).then(() => mkdir(dir));
			}
		}

		throw err;
	});
};
//#endregion
