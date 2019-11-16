import 'colors';
import console from 'console';
import { loadConfig } from './lib/config';
import { doOnMultipleProcesses, doOnSingleProcess } from './lib/handler';
import { findFlows, getProcessId } from './lib/utils';

const processId = getProcessId();
console.info(((`Process[${processId}] started.`.bold as unknown) as String).green);

(async (): Promise<void> => {
	try {
		const env = await loadConfig();
		const flows = findFlows(env);
		if (env.isOnParallel()) {
			await doOnMultipleProcesses(flows, env);
		} else {
			await doOnSingleProcess(flows, env);
		}
	} catch {
		return Promise.reject();
	}
})().catch(() => process.exit(1));
