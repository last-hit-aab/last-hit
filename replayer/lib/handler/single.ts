import fs from 'fs';
import jsonfile from 'jsonfile';
import path from 'path';
import Environment from '../config/env';
import { Coverages, FlowFile, Report } from '../types';
import { getLogger, getProcessId } from '../utils';
import { print } from './print';
import { handleFlow } from './single-flow';

const processId = getProcessId();

const createTemporaryFolders = async (
	env: Environment
): Promise<{
	resultTempFolder: string;
	threadTempFolder: string;
}> => {
	const workspace = env.getWorkspace();
	const resultTempFolder = path.join(workspace, '.result-temp');
	if (!env.isOnChildProcess()) {
		// not in child process, delete the result temp folder
		fs.rmdirSync(resultTempFolder, { recursive: true });
	}
	if (!fs.existsSync(resultTempFolder)) {
		fs.mkdirSync(resultTempFolder);
	}
	const threadTempFolder = path.join(resultTempFolder, processId);
	if (!fs.existsSync(threadTempFolder)) {
		fs.mkdirSync(threadTempFolder);
	}

	const resultParamsTempFolder = path.join(workspace, '.result-params-temp');
	if (!env.isOnChildProcess()) {
		// not in child process, delete the result temp folder
		fs.rmdirSync(resultParamsTempFolder, { recursive: true });
	}
	if (!fs.existsSync(resultParamsTempFolder)) {
		fs.mkdirSync(resultParamsTempFolder);
	}

	return {
		resultTempFolder,
		threadTempFolder
	};
};

export const doOnSingleProcess = async (flows: FlowFile[], env: Environment): Promise<void> => {
	const { threadTempFolder } = await createTemporaryFolders(env);
	let jammed = false;

	const logger = getLogger();
	const reports: Report[] = [];
	const allCoverages: Coverages = [];
	try {
		const pendingFlows: Array<FlowFile> = flows;
		const run = async (flows: Array<FlowFile>) => {
			await flows.reduce(async (promise, flow) => {
				await promise;
				try {
					const { report, coverages, code } = await handleFlow(flow, env);
					if (code === 'pending') {
						pendingFlows.push(flow);
					} else {
						reports.push(report);
						allCoverages.push(...coverages);
					}
				} catch (e) {
					logger.error(e);
				} finally {
					// do nothing
					return Promise.resolve();
				}
			}, Promise.resolve());
		};
		const countLeft = pendingFlows.length;
		while (pendingFlows.length !== 0) {
			const flows = [...pendingFlows];
			pendingFlows.length = 0;
			await run(flows);
			if (countLeft === pendingFlows.length) {
				// nothing can be run
				jammed = true;
				break;
			}
		}
	} finally {
		const isChildProcess = env.isOnChildProcess();

		jsonfile.writeFileSync(path.join(threadTempFolder, 'summary.json'), reports);
		jsonfile.writeFileSync(path.join(threadTempFolder, 'coverages.json'), allCoverages);

		// print when not child process
		!isChildProcess && print(env);
		console.info((`Process[${processId}] finished`.bold as any).green);

		if (jammed && isChildProcess) {
			return Promise.reject('jammed');
		}
	}
};
