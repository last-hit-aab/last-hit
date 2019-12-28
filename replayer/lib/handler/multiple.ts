import spawn from 'cross-spawn';
import fs from 'fs';
import jsonfile from 'jsonfile';
import path from 'path';
import uuidv4 from 'uuid/v4';
import Environment from '../config/env';
import { FlowFile, Config } from '../types';
import { getProcessId } from '../utils';
import { print } from './print';

const processId = getProcessId();

const createTemporaryFolders = (
	env: Environment
): {
	composeTempFolder: string;
	resultTempFolder: string;
} => {
	const workspace = env.getWorkspace();

	const composeTempFolder = path.join(workspace, '.compose-temp');
	if (fs.existsSync(composeTempFolder)) {
		// clear
		fs.rmdirSync(composeTempFolder, { recursive: true });
	}
	// recreate
	fs.mkdirSync(composeTempFolder);

	const resultTempFolder = path.join(workspace, '.result-temp');
	if (fs.existsSync(resultTempFolder)) {
		fs.rmdirSync(resultTempFolder, { recursive: true });
	}
	// recreate
	fs.mkdirSync(resultTempFolder);

	const resultParamsTempFolder = path.join(workspace, '.result-params-temp');
	if (!env.isOnChildProcess()) {
		// not in child process, delete the result temp folder
		fs.rmdirSync(resultParamsTempFolder, { recursive: true });
	}
	if (!fs.existsSync(resultParamsTempFolder)) {
		fs.mkdirSync(resultParamsTempFolder);
	}

	return {
		composeTempFolder,
		resultTempFolder
	};
};

type RunFlow = { flow: FlowFile; resolve: () => void };
export const doOnMultipleProcesses = async (flows: FlowFile[], env: Environment): Promise<void> => {
	const resolves: Array<() => void> = [];
	Promise.all(flows.map(() => new Promise(resolve => resolves.push(resolve)))).finally(() => {
		print(env);
		console.info((`Process[${processId}] finished`.bold as any).green);
	});

	const { composeTempFolder } = createTemporaryFolders(env);

	let childProcessCount = 0;
	const buildActions = (flows: Array<RunFlow>): Array<() => Promise<void | RunFlow>> => {
		return flows.map(data => {
			const { flow, resolve: resolveFlow } = data;
			return () => {
				return new Promise((resolve, reject) => {
					try {
						childProcessCount++;
						if (!fs.existsSync(composeTempFolder)) {
							fs.mkdirSync(composeTempFolder);
						}

						const filename = path.join(composeTempFolder, `compose-${uuidv4()}.json`);
						const childConfig = env.exposeForSingleProcess({ includes: [flow] });
						((childConfig as unknown) as Config).env = childConfig.name;
						delete childConfig.name;
						jsonfile.writeFileSync(filename, childConfig);
						const child = spawn(
							'node',
							[
								process.argv[1],
								`--config-file=${filename}`,
								`--workspace=${env.getWorkspace()}`
							],
							{
								stdio: ['ignore', 'inherit', 'inherit']
							}
						);
						const onMyselfExit = () => {
							try {
								child.kill();
							} finally {
								reject();
							}
						};
						process
							.once('exit', onMyselfExit)
							.once('SIGINT', onMyselfExit)
							.once('SIGTERM', onMyselfExit);
						child.on('exit', (code: number) => {
							// console.log(`child process[${child.pid}] exit on code ${code}.`);
							childProcessCount--;
							if (code === 2) {
								// jammed, resolve me directly, but keep the flow promise
								resolve({ flow, resolve: resolveFlow });
							} else {
								resolve();
								resolveFlow();
							}
						});
					} catch {
						childProcessCount--;
						resolve();
						resolveFlow();
					}
				});
			};
		});
	};

	const run = async (all: Array<RunFlow>) => {
		return new Promise(resolve => {
			const countLeft = all.length;
			if (countLeft === 0) {
				resolve();
				return;
			}

			const actions = buildActions(all);
			const jammedFlows: Array<RunFlow> = [];

			/**
			 * get first action of actions queue.
			 * when exists, do action and do next when action accomplished.
			 * when not exists, do nothing and quit
			 */
			const next = async () => {
				const action = actions.shift();
				if (action) {
					const ret = await action();
					if (ret) {
						jammedFlows.push(ret as RunFlow);
					}
					await next();
				} else if (childProcessCount === 0) {
					// no more action, and all child processed is finished
					if (countLeft === jammedFlows.length) {
						// nothing can be run
					} else if (jammedFlows.length !== 0) {
						// there are jammed flows, run again
						await run(jammedFlows);
					} else {
						// all done
					}
					resolve();
				}
			};

			/**
			 * do actions until reach the parallel count
			 */
			let init = 0;
			while (true) {
				init++;
				next();
				if (init == env.getParallel()) {
					break;
				}
			}
		});
	};
	await run(flows.map((flow, index) => ({ flow, resolve: resolves[index] })));
};
