import fs from 'fs';
import jsonfile from 'jsonfile';
import path from 'path';
import Environment from '../config/env';
import { Coverages, FlowFile, Report } from '../types';
import { getLogger, getProcessId } from '../utils';
import { print } from './print';
import { handleFlow } from './single-flow';

const logger = getLogger();
const processId = getProcessId();

const createTemporaryFolders = async (
	env: Environment
): Promise<{
	resultTempFolder: string;
	threadTempFolder: string;
}> => {
	const workspace = env.getWorkspace();
	const resultTempFolder = path.join(workspace, 'result-temp');
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

	return {
		resultTempFolder,
		threadTempFolder
	};
};

export const doOnSingleProcess = async (flows: FlowFile[], env: Environment): Promise<void> => {
	const reports: Report[] = [];
	const allCoverages: Coverages = [];
	try {
		await flows.reduce(async (promise, flow) => {
			await promise;
			try {
				const { report, coverages } = await handleFlow(flow, env);
				reports.push(report);
				allCoverages.push(...coverages);
			} catch (e) {
				logger.error(e);
			} finally {
				// do nothing
				return Promise.resolve();
			}
		}, Promise.resolve());
	} finally {
		const isChildProcess = env.isOnChildProcess();
		const { resultTempFolder, threadTempFolder } = await createTemporaryFolders(env);

		jsonfile.writeFileSync(path.join(threadTempFolder, 'summary.json'), reports);
		jsonfile.writeFileSync(
			path.join(resultTempFolder, processId, 'coverages.json'),
			allCoverages
		);

		// print when not child process
		!isChildProcess && print(env);
		console.info((`Process[${processId}] finished`.bold as any).green);
	}
};
