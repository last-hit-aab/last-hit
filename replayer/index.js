const args = require('yargs').argv;
const fs = require('fs');
const path = require('path');
const colors = require('colors');
const jsonfile = require('jsonfile');
const ReplayEmitter = require('./replay-emitter');
const replay = require('./replay');
const console = require('console');
const pti = require('./pti-rewrite');
const { spawn } = require('child_process');
const { generate_report } = require('./result-report');
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

const env = config.env;
if (env) {
	// TODO environment appointment
}

const settings = Object.keys(config)
	.filter(key => key.startsWith('settings-'))
	.reduce((all, key) => {
		all[key.replace('settings-', '')] = config[key];
		return all;
	}, {});

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
			settings
		}).initialize();
	} catch (e) {
		logger.error(e);
		return;
	}

	const promise = new Promise(resolve => {
		handleReplayStepEnd(emitter, { name: storyName }, flow, () => {
			const summary = replayer.current.getSummaryData();
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
	const report = [];
	const threads = fs.readdirSync(path.join(workspace, 'result-temp'));
	threads.forEach(threadFolder => {
		const filename = path.join(path.join(workspace, 'result-temp', threadFolder, 'summary.json'));
		const data = jsonfile.readFileSync(filename);
		(data || []).forEach(item => report.push(item));
	});
	generate_report({ file_name: 'report.html', results: report });

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
				'Spent (ms)': Math.round((item.spent || '').split(' ')[1].split('ms')[0])
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
			'Spent (ms)'
		]
	);
};
// start
const parallel = config.parallel || 1;

if (parallel === 1) {
	flows
		.reduce(async (promise, flowObject) => {
			await promise;
			try {
				await hanldeFlowObject(flowObject);
			} finally {
				// do nothing
				return Promise.resolve();
			}
		}, Promise.resolve())
		.finally(() => {
			// pti.write(coverages);
			// spawn.sync('nyc', ['report', '--reporter=html'], { stdio: 'inherit' });
			const isChildProcess = config.child === 'true' || config.child;

			const resultTempFolder = path.join(workspace, 'result-temp');
			if (!isChildProcess) {
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
							{ data: Array.isArray(flow) ? flow : [flow], child: true }
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

	const next = () => {
		const action = actions.shift();
		action && action().then(() => next());
	};

	let init = 0;
	while (true) {
		init++;
		next();
		if (init == parallel) {
			break;
		}
	}
}
