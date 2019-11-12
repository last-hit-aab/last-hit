const args = require('yargs').argv;
const fs = require('fs');
const path = require('path');
const colors = require('colors');
const jsonfile = require('jsonfile');
const ReplayEmitter = require('./lib/replay-emitter');
const replay = require('./lib/replay');
const console = require('console');
const pti = require('./lib/pti-rewrite');
const { spawn } = require('child_process');
const spawnSync = require('child_process').spawnSync;
const { generate_report } = require('./lib/result-report');
const compose = require('./lib/compose');
const uuidv4 = require('uuid/v4');

const processId = `${process.pid}`;
console.info(`Process[${processId}] started.`.bold.green);

const workspace = args.workspace;
if (!workspace) {
	console.error(`Process[${processId}] Please specify workspace folder via [--workspace=folder].`.bold.red);
	process.exit(1);
}

const configFile = args['config-file'];
delete args['config-file'];
let config = args;
if (configFile) {
	config = jsonfile.readFileSync(path.join(workspace, configFile));
	config.workspace = workspace;
}

const workspaceSettingsFile = fs.readdirSync(workspace).find(name => name.endsWith('.lhw'));
let workspaceSettings;
if (workspaceSettingsFile) {
	workspaceSettings = jsonfile.readFileSync(path.join(workspace, workspaceSettingsFile));
} else {
	// workspace file not found
	workspaceSettings = {
		envs: []
	};
}

let env;
const envName = config.env;
if (envName) {
	env = (workspaceSettings.envs || []).find(env => env.name === envName);
	if (env == null) {
		console.error(`Process[${processId}] Given environment[${envName}] not found.`.bold.red);
		process.exit(1);
	}
} else {
	env = {};
}

const settings = Object.keys(config)
	.filter(key => key.startsWith('settings-'))
	.reduce((all, key) => {
		all[key.replace('settings-', '')] = config[key];
		return all;
	}, {});
// mix settings to environment
env = Object.assign(env, settings);
const Environment = require('./lib/env');
env = new Environment(env);

// story and flow name can be specified
// if story is not given, flow name should be ingored
// if story is given and flow is not given, run all flows under given story
const flows = compose({
	workspaceFolder: workspace,
	data: config.data || [{ story: config.story, flow: config.flow }]
});

const output = fs.createWriteStream('./stdout.log');
const errorOutput = fs.createWriteStream('./stderr.log');
const logger = new console.Console({ stdout: output, stderr: errorOutput });
const generateKeyByObject = (story, flow) => {
	return `[${flow.name}@${story.name}]`;
};

const replayNextStep = (emitter, story, flow, index, resolve) => {
	handleReplayStepEnd(emitter, story, flow, resolve);
	emitter.send(`continue-replay-step-${generateKeyByObject(story, flow)}`, {
		storyName: story.name,
		flow,
		index: index + 1
	});
};
const handleReplayStepEnd = (emitter, story, flow, resolve) => {
	const key = generateKeyByObject(story, flow);
	emitter.once(`replay-step-end-${key}`, (event, arg) => {
		const { error, index } = arg;
		if (error) {
			(async () => {
				console.error(`Process[${processId}] Replay flow ${key} failed on step ${index}.`.bold.red, error);
				emitter.once(`replay-browser-abolish-${key}`, (event, arg) => {
					resolve();
				});
				// abolish anyway
				emitter.send(`continue-replay-step-${key}`, {
					command: 'abolish'
				});
			})();
		} else if (flow.steps[index].type === 'end' || index >= flow.steps.length - 1) {
			// the end or last step is finished
			(async () => {
				console.info(`Process[${processId}] Replay flow ${key} finished.`.bold.green);
				emitter.once(`replay-browser-abolish-${key}`, (event, arg) => {
					resolve();
				});
				emitter.send(`continue-replay-step-${key}`, {
					command: 'abolish'
				});
			})();
		} else {
			// go on
			replayNextStep(emitter, story, flow, index, resolve);
		}
	});
};

/**
 * @param {string} story
 * @param {string} flow
 * @param {{story: string, flow: string}[]} dependsChain
 * @returns {boolean}
 */
const findInDependencyChain = (story, flow, dependsChain) => {
	return dependsChain.some(node => node.story === story && node.flow === flow);
};
/**
 *
 * @param {string} dependsStoryName
 * @param {string} dependsFlowName
 * @param {{story: string, flow: string}[]} dependsChain
 * @returns {boolean} true when pass check
 */
const doLoopCheck = (dependsStoryName, dependsFlowName, dependsChain) => {
	if (findInDependencyChain(dependsStoryName, dependsFlowName, dependsChain)) {
		dependsChain.push({ story: dependsStoryName, flow: dependsFlowName });
		const chain = dependsChain.map(({ story, flow }) => `${flow}@${story}`).join(' -> ');
		throw new Error(`Loop dependency[${chain}] found.`);
	}

	const dependsStoryFolder = path.join(workspace, dependsStoryName);
	if (!fs.existsSync(dependsStoryFolder) || !fs.statSync(dependsStoryFolder).isDirectory()) {
		throw new Error(`Dependency story[${dependsStoryName}] not found.`);
	}
	const dependsFlowFilename = path.join(dependsStoryFolder, `${dependsFlowName}.flow.json`);
	if (!fs.existsSync(dependsFlowFilename) || !fs.statSync(dependsFlowFilename).isFile()) {
		throw new Error(`Dependency flow[${dependsFlowName}@${dependsStoryName}] not found.`);
	}

	const dependsFlow = jsonfile.readFileSync(dependsFlowFilename);
	const { forceDepends = null } = dependsFlow.settings || {};
	if (forceDepends) {
		if (findInDependencyChain(forceDepends.story, forceDepends.flow, dependsChain)) {
			dependsChain.push({ story: dependsStoryName, flow: dependsFlowName });
			const chain = dependsChain.map(({ story, flow }) => `${flow}@${story}`).join(' -> ');
			throw new Error(`Loop dependency[${chain}] found.`);
		} else {
			// push dependency to chain
			dependsChain.push({ story: dependsStoryName, flow: dependsFlowName });
			return doLoopCheck(forceDepends.story, forceDepends.flow, dependsChain);
		}
	}
	return true;
};

/**
 * only check loop. return true even dependency flow not found.
 * @param {string} dependsStoryName
 * @param {string} dependsFlowName
 * @param {string} myStoryName
 * @param {string} myFlowName
 * @returns {boolean} return true when pass the loop check
 */
const loopCheck = (dependsStoryName, dependsFlowName, myStoryName, myFlowName) => {
	return doLoopCheck(dependsStoryName, dependsFlowName, [{ story: myStoryName, flow: myFlowName }]);
};

/**
 * find all force dependencies, and merge steps to one flow
 * @param {Flow} flow
 * @returns {Flow}
 */
const findAndMergeForceDependencyFlows = flow => {
	const forceDependencyFlow = { name: flow.name, description: `Merged force dependency flows`, steps: [] };

	let currentFlow = flow;
	while (currentFlow.settings && currentFlow.settings.forceDepends) {
		const { story: storyName, flow: flowName } = currentFlow.settings.forceDepends;
		const dependsFlowFilename = path.join(workspace, storyName, `${flowName}.flow.json`);
		if (!fs.existsSync(dependsFlowFilename) || !fs.statSync(dependsFlowFilename).isFile()) {
			throw new Error(`Dependency flow[${flowName}@${storyName}] not found.`);
		}
		const dependsFlow = jsonfile.readFileSync(dependsFlowFilename);

		const steps = dependsFlow.steps || [];

		forceDependencyFlow.steps.splice(
			0,
			0,
			...steps.map(step => ({
				...step,
				origin: { story: storyName, flow: dependsFlow.name, stepIndex: step.stepIndex }
			}))
		);
		currentFlow = dependsFlow;
	}

	forceDependencyFlow.steps = forceDependencyFlow.steps.filter((step, index) => {
		return index === 0 || (step.type !== 'start' && step.type !== 'end');
	});
	forceDependencyFlow.steps.push({ type: 'end' });
	forceDependencyFlow.steps.forEach((step, index) => (step.stepIndex = index));

	return forceDependencyFlow;
};

const hanldeFlowObject = flowObject => {
	const { story: storyName, flow: flowName } = flowObject;
	const flowKey = `${flowName}@${storyName}`;

	const timeLoggerStream = new require('stream').Transform();
	let timeSpent;
	timeLoggerStream._transform = function(chunk, encoding, done) {
		this.push(chunk);
		timeSpent = typeof chunk === 'string' ? chunk : chunk.toString();
		done();
	};
	const timeLogger = new console.Console({ stdout: timeLoggerStream });
	timeLogger.time(flowKey);

	console.info(`Process[${processId}] Start to replay [${flowKey}].`.italic.blue.underline);
	const file = path.join(workspace, storyName, `${flowName}.flow.json`);
	let flow = null;
	try {
		flow = jsonfile.readFileSync(file);
	} catch (e) {
		logger.error(e);
		return;
	}
	flow.name = flowName;

	if (flow.steps == null || flow.steps.length === 0) {
		console.info(`Process[${processId}] Flow ${flowKey} has no steps, ignored.`.red);
		return;
	}

	if (flow.settings && flow.settings.forceDepends) {
		// has force dependency
		const { story: dependsStoryName, flow: dependsFlowName } = flow.settings.forceDepends;
		try {
			loopCheck(dependsStoryName, dependsFlowName, storyName, flowName);
		} catch (e) {
			logger.error(e);
			console.info(`Process[${processId}] Flow ${flowKey} failed on force dependency loop check, ignored.`.red);
			return;
		}
		const forceDependsFlow = findAndMergeForceDependencyFlows(flow);
		// remove end step
		forceDependsFlow.steps.length = forceDependsFlow.steps.length - 1;
		flow.steps
			.filter((step, index) => index !== 0)
			.forEach(step =>
				forceDependsFlow.steps.push({
					...step,
					origin: {
						story: storyName,
						flow: flow.name,
						stepIndex: step.stepIndex
					}
				})
			);
		flow = forceDependsFlow;
	}

	const startStep = flow.steps[0];
	if (startStep.type !== 'start') {
		console.info(`Process[${processId}] Flow ${flowKey} has no start step, ignored.`.red);
		return;
	}
	if (!startStep.url) {
		console.info(`Process[${processId}] Flow ${flowKey} has no start url, ignored.`.red);
		return;
	}

	const emitter = new ReplayEmitter();
	let replayer;
	try {
		replayer = replay({
			emitter,
			logger,
			env
		}).initialize();
	} catch (e) {
		logger.error(e);
		return;
	}

	const promise = new Promise(resolve => {
		handleReplayStepEnd(emitter, { name: storyName }, flow, () => {
			const summary = replayer.current.getSummaryData();

			//TODO merge
			coverages.push(...replayer.current.getCoverageData());
			timeLogger.timeEnd(flowKey);
			report.push({ ...summary, spent: timeSpent });
			resolve();
		});
	});
	emitter.send('launch-replay', { flow, index: 0, storyName });
	return promise;
};

const report = [];
const coverages = [];

const print = () => {
	const shorternUrl = url => {
		try {
			const parsed = new URL(url);
			parsed.search = '';
			parsed.hash = '';
			return parsed.href;
		} catch {
			// parse fail, not a valid url, return directly
			return url;
		}
	};
	const binarySearch = (target, array) => {
		let firstIndex = 0;
		let lastIndex = array.length - 1;
		let middleIndex = Math.floor((lastIndex + firstIndex) / 2);
		while (firstIndex <= lastIndex) {
			console.log(firstIndex, middleIndex, lastIndex);
			const item = array[middleIndex];
			if (item.start === target.start && item.end === target.end) {
				return middleIndex;
			} else if (target.start > item.end) {
				firstIndex = middleIndex + 1;
			} else if (target.end < item.start) {
				lastIndex = middleIndex - 1;
			} else {
				break;
			}
			middleIndex = Math.floor((lastIndex + firstIndex) / 2);
		}
		return 0 - middleIndex;
	};
	const report = [];
	const coverageMap = {};
	const allCoverageData = [];
	const threads = fs.readdirSync(path.join(workspace, 'result-temp'));
	threads.forEach(threadFolder => {
		const summaryFilename = path.join(path.join(workspace, 'result-temp', threadFolder, 'summary.json'));
		const data = jsonfile.readFileSync(summaryFilename);
		(data || []).forEach(item => report.push(item));
		const coverageFilename = path.join(path.join(workspace, 'result-temp', threadFolder, 'coverages.json'));
		if (fs.existsSync(coverageFilename)) {
			const coverageData = jsonfile.readFileSync(coverageFilename);
			coverageData.reduce((map, item) => {
				const { ranges, text } = item;
				const url = shorternUrl(item.url);
				let data = map[url];
				if (!data) {
					data = { url, ranges, text };
					allCoverageData.push(data);
					map[url] = data;
				} else {
					(ranges || []).forEach(range => {
						const index = binarySearch(range, data);
						if (index < 0) {
							data.splice(index * -1 + 1, 0, range);
						}
					});
				}
				return map;
			}, coverageMap);
		}
	});
	generate_report({ file_name: 'report.html', results: report });
	pti.write(allCoverageData);
	spawnSync('nyc', ['report', '--reporter=html'], { stdio: 'inherit' });
	
	console.table(
		report.map(item => {
			return {
				Story: item.storyName,
				Flow: item.flowName,
				Steps: item.numberOfStep,
				'UI Behavior': item.numberOfUIBehavior,
				Passed: item.numberOfSuccess,
				Failed: item.numberOfFailed,
				'Ignored Errors': (item.ignoreErrorList || []).length,
				'Ajax calls': item.numberOfAjax,
				'Slow ajax calls': (item.slowAjaxRequest || []).length,
				'Spent (ms)': Math.round((item.spent || '').split(' ')[1].split('ms')[0]),
				'Pass Rate(%)': ((item.numberOfSuccess / item.numberOfStep) * 100).toFixed(2).toString()
			};
		}),
		[
			'Story',
			'Flow',
			'Steps',
			'UI Behavior',
			'Passed',
			'Failed',
			'Ignored Errors',
			'Ajax calls',
			'Slow ajax calls',
			'Spent (ms)',
			'Pass Rate(%)'
		]
	);
};
// start
let parallel = config.parallel;

if (parallel == null) {
	parallel = 1;
} else if (parallel <= 1) {
	parallel = Math.round(require('os').cpus().length * parallel);
}

if (parallel === 1) {
	flows
		.reduce(async (promise, flowObject) => {
			await promise;
			try {
				await hanldeFlowObject(flowObject);
			} catch (e) {
				logger.error(e);
			} finally {
				// do nothing
				return Promise.resolve();
			}
		}, Promise.resolve())
		.finally(() => {
			const isChildProcess = config.child === 'true' || config.child;

			const resultTempFolder = path.join(workspace, 'result-temp');
			if (!isChildProcess) {
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
			jsonfile.writeFileSync(path.join(threadTempFolder, 'summary.json'), report);
			jsonfile.writeFileSync(path.join(resultTempFolder, processId, 'coverages.json'), coverages);

			// print when not child process
			!isChildProcess && print();
			console.info(`Process[${processId}] finished`.bold.green);
		});
} else {
	const composeTempFolder = path.join(workspace, 'compose-temp');
	if (fs.existsSync(composeTempFolder)) {
		fs.rmdirSync(composeTempFolder, { recursive: true });
	}
	const resultTempFolder = path.join(workspace, 'result-temp');
	if (fs.existsSync(resultTempFolder)) {
		fs.rmdirSync(resultTempFolder, { recursive: true });
	}

	const resolves = [];
	Promise.all(flows.map(() => new Promise(resolve => resolves.push(resolve)))).finally(() => {
		print();
		console.info(`Process[${processId}] finished`.bold.green);
	});

	const actions = flows.map((flow, index) => {
		return () => {
			return new Promise(resolve => {
				try {
					if (!fs.existsSync(composeTempFolder)) {
						fs.mkdirSync(composeTempFolder);
					}

					const filename = path.join('compose-temp', `compose-${uuidv4()}.json`);
					const childConfig = Object.keys(config)
						.filter(key => !['workspace', 'story', 'flow', 'config-file', 'parallel'].includes(key))
						.reduce(
							(all, key) => {
								all[key] = config[key];
								return all;
							},
							{ data: [flow], child: true }
						);
					jsonfile.writeFileSync(path.join(workspace, filename), childConfig);
					const child = spawn(
						'node',
						[process.argv[1], `--config-file=${filename}`, `--workspace=${workspace}`],
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
		if (init == parallel) {
			break;
		}
	}
}
