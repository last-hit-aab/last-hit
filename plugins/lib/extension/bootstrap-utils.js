"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// increase number of stack frames(from 10, https://github.com/v8/v8/wiki/Stack-Trace-API)
Error.stackTraceLimit = 100;
//#region Add support for redirecting the loading of node modules
exports.injectNodeModuleLookupPath = function (injectPath) {
    if (!injectPath) {
        throw new Error('Missing injectPath');
    }
    // @ts-ignore
    var Module = require('module');
    var path = require('path');
    var nodeModulesPath = path.join(__dirname, '../node_modules');
    // @ts-ignore
    var originalResolveLookupPaths = Module._resolveLookupPaths;
    // @ts-ignore
    Module._resolveLookupPaths = function (moduleName, parent) {
        var paths = originalResolveLookupPaths(moduleName, parent);
        for (var i = 0, len = paths.length; i < len; i++) {
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
exports.uriFromPath = function (aPath) {
    var path = require('path');
    var pathName = path.resolve(aPath).replace(/\\/g, '/');
    if (pathName.length > 0 && pathName.charAt(0) !== '/') {
        pathName = '/' + pathName;
    }
    /** @type {string} */
    var uri;
    if (process.platform === 'win32' && pathName.startsWith('//')) {
        // specially handle Windows UNC paths
        uri = encodeURI('file:' + pathName);
    }
    else {
        uri = encodeURI('file://' + pathName);
    }
    return uri.replace(/#/g, '%23');
};
//#endregion
//#region FS helpers
exports.readFile = function (file) {
    var fs = require('fs');
    return new Promise(function (resolve, reject) {
        fs.readFile(file, 'utf8', function (err, data) {
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
exports.writeFile = function (file, content) {
    var fs = require('fs');
    return new Promise(function (resolve, reject) {
        fs.writeFile(file, content, 'utf8', function (err) {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
};
var mkdir = function (dir) {
    var fs = require('fs');
    return new Promise(function (resolve, reject) {
        return fs.mkdir(dir, function (err) {
            return err && err.code !== 'EEXIST' ? reject(err) : resolve(dir);
        });
    });
};
var mkdirp = function (dir) {
    var path = require('path');
    return mkdir(dir).then(null, function (err) {
        if (err && err.code === 'ENOENT') {
            var parent_1 = path.dirname(dir);
            if (parent_1 !== dir) {
                // if not arrived at root
                return mkdirp(parent_1).then(function () { return mkdir(dir); });
            }
        }
        throw err;
    });
};
//#endregion
//# sourceMappingURL=bootstrap-utils.js.map