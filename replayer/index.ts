import 'colors';
import console from 'console';
import { loadConfig } from './lib/config';
import { doOnMultipleProcesses, doOnSingleProcess } from './lib/handler';
import { findFlows, getProcessId } from './lib/utils';
import { createReplayer } from './lib/replayer';
import Environment from './lib/config/env';

const run = () => {
	const processId = getProcessId();
	console.info((`Process[${processId}] started.`.bold as any).green);

	(async (): Promise<void> => {
		try {
			const env = await loadConfig();
			const flows = findFlows(env);
			if (env.isOnParallel()) {
				await doOnMultipleProcesses(flows, env);
			} else {
				await doOnSingleProcess(flows, env);
			}
		} catch (e) {
			console.error(e);
			return Promise.reject(e);
		}
	})()
		.then(() => {
			// console.log(`process[${processId}] exit on 0.`);
			process.exit(0);
		})
		.catch((reason: string) => {
			if (reason === 'jammed') {
				// console.log(`process[${processId}] exit on 1024.`);
				process.exit(2);
			} else {
				// console.log(`process[${processId}] exit on 1.`);
				process.exit(1);
			}
		});
};

export default run;
export { createReplayer, Environment };
