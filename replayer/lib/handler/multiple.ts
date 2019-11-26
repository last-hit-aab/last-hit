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

	const composeTempFolder = path.join(workspace, 'compose-temp');
	if (fs.existsSync(composeTempFolder)) {
		// clear
		fs.rmdirSync(composeTempFolder, { recursive: true });
	}
	// recreate
	fs.mkdirSync(composeTempFolder);

	const resultTempFolder = path.join(workspace, 'result-temp');
	if (fs.existsSync(resultTempFolder)) {
		fs.rmdirSync(resultTempFolder, { recursive: true });
	}
	// recreate
	fs.mkdirSync(resultTempFolder);

	return {
		composeTempFolder,
		resultTempFolder
	};
};

export const doOnMultipleProcesses = async (flows: FlowFile[], env: Environment): Promise<void> => {
	const resolves: Array<() => void> = [];
	Promise.all(flows.map(() => new Promise(resolve => resolves.push(resolve)))).finally(() => {
		print(env);
		console.info((`Process[${processId}] finished`.bold as any).green);
	});

	const { composeTempFolder } = createTemporaryFolders(env);

	const actions = flows.map((flow, index) => {
		return () => {
			return new Promise(resolve => {
				try {
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
					child.on('exit', () => {
						resolve();
						resolves[index]();
					});
				} catch {
					resolve();
					resolves[index]();
				}
			});
		};
	});

	/**
	 * get first action of actions queue.
	 * when exists, do action and do next when action accomplished.
	 * when not exists, do nothing and quit
	 */
	const next = () => {
		const action = actions.shift();
		action && action().then(() => next());
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
};
