/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as bootstrap from './bootstrap-utils';
import * as Consts from './consts';

console.log(`child process pid[${process.pid}]`);

if (process.env[Consts.ARG_INJECT_NODE_MODULE_LOOKUP_PATH]) {
	bootstrap.injectNodeModuleLookupPath(process.env[Consts.ARG_INJECT_NODE_MODULE_LOOKUP_PATH]);
}

// Handle Exceptions
if (process.env[Consts.ARG_HANDLES_UNCAUGHT_ERRORS]) {
	(() => {
		// Handle uncaught exceptions
		// @ts-ignore
		process.on('uncaughtException', (err: Error) => {
			console.error('Uncaught Exception: ', err);
		});

		// Handle unhandled promise rejections
		// @ts-ignore
		process.on('unhandledRejection', (reason: {} | null | undefined) => {
			console.error('Unhandled Promise Rejection: ', reason);
		});
	})();
}

// Terminate when parent terminates
if (process.env[Consts.ARG_PARENT_PID]) {
	(() => {
		const parentPid = Number(process.env[Consts.ARG_PARENT_PID]);

		if (typeof parentPid === 'number' && !isNaN(parentPid)) {
			setInterval(() => {
				try {
					process.kill(parentPid, 0); // throws an exception if the main process doesn't exist anymore.
				} catch (e) {
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
	const entrypoint = require(process.env[Consts.ARG_ENTRY_POINT]);
	const packageFolder = process.env[Consts.ARG_PACKAGE_FOLDER];
	const extensionId = process.env[Consts.ARG_EXTENSION_ID];
	entrypoint.activate({ extensionId, packageFolder });
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
