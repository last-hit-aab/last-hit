"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var bootstrap = __importStar(require("./bootstrap-utils"));
var Consts = __importStar(require("./consts"));
console.log("child process pid[" + process.pid + "]");
if (process.env[Consts.ARG_INJECT_NODE_MODULE_LOOKUP_PATH]) {
    bootstrap.injectNodeModuleLookupPath(process.env[Consts.ARG_INJECT_NODE_MODULE_LOOKUP_PATH]);
}
// Handle Exceptions
if (process.env[Consts.ARG_HANDLES_UNCAUGHT_ERRORS]) {
    (function () {
        // Handle uncaught exceptions
        // @ts-ignore
        process.on('uncaughtException', function (err) {
            console.error('Uncaught Exception: ', err);
        });
        // Handle unhandled promise rejections
        // @ts-ignore
        process.on('unhandledRejection', function (reason) {
            console.error('Unhandled Promise Rejection: ', reason);
        });
    })();
}
// Terminate when parent terminates
if (process.env[Consts.ARG_PARENT_PID]) {
    (function () {
        var parentPid = Number(process.env[Consts.ARG_PARENT_PID]);
        if (typeof parentPid === 'number' && !isNaN(parentPid)) {
            setInterval(function () {
                try {
                    process.kill(parentPid, 0); // throws an exception if the main process doesn't exist anymore.
                }
                catch (e) {
                    process.exit();
                }
            }, 5000);
        }
    })();
}
// Configure Crash Reporter
//configureCrashReporter();
// Load commonjs entry point
if (process.env[Consts.ARG_ENTRY_POINT]) {
    var entrypoint = require(process.env[Consts.ARG_ENTRY_POINT]);
    var packageFolder = process.env[Consts.ARG_PACKAGE_FOLDER];
    var extensionId = process.env[Consts.ARG_EXTENSION_ID];
    entrypoint.activate({ extensionId: extensionId, packageFolder: packageFolder });
}
/*
function configureCrashReporter() {
    const crashReporterOptionsRaw = process.env['CRASH_REPORTER_START_OPTIONS'];
    if (typeof crashReporterOptionsRaw === 'string') {
        try {
            const crashReporterOptions = JSON.parse(crashReporterOptionsRaw);
            if (crashReporterOptions) {
                process['crashReporter'].start(crashReporterOptions);
            }
        } catch (error) {
            console.error(error);
        }
    }
}
*/
//#endregion
//# sourceMappingURL=bootstrap.js.map