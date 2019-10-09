const args = require('yargs').argv;
const fs = require('fs');
const path = require('path');
const colors = require('colors');
const jsonfile = require('jsonfile');
const ReplayEmitter = require('./replay-emitter');
const replay = require('./replay');
const console = require('console');

const workspace = args.workspace;
if (!workspace) {
	console.error(`Please specify workspace folder via [--workspace=folder].`);
	process.exit(1);
}

const env = args.env;
if (env) {
	// TODO environment appointment
}

// story and flow name can be specified
// if story is not given, flow name should be ingored
// if story is given and flow is not given, run all flows under given story
const story = args.story;
const flow = args.flow;
const flows = fs
	.readdirSync(workspace)
	.filter(dir => fs.statSync(path.join(workspace, dir)).isDirectory())
	.filter(name => !story || story === name)
	.map(storyName => {
		return fs
			.readdirSync(path.join(workspace, storyName))
			.filter(flowName => fs.statSync(path.join(workspace, storyName, flowName)).isFile())
			.filter(flowName => flowName.endsWith('.flow.json'))
			.filter(flowName => {
				if (!story) {
					// story is not given, ignore given flow
					return true;
				} else if (!flow) {
					// story is given , flow is not given
					// story already filtered
					return true;
				} else {
					return `${flow}.flow.json` === flowName;
				}
			})
			.map(flowName => flowName.replace(/^(.*)\.flow\.json$/, '$1'))
			.map(flowName => ({ story: storyName, flow: flowName }));
	})
	.flat();

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
				console.error(`Replay flow ${key} failed on step ${index}.`.bold.red, error);
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
				console.info(`Replay flow ${key} finished.`.bold.green);
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

// start
const parallel = args.parallel || 1;

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

	console.info(`Start to replay [${flowKey}].`.italic.blue.underline);
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
		console.info(`Flow ${flowKey} has no steps, ignored.`.red);
		return;
	}

	const startStep = flow.steps[0];
	if (startStep.type !== 'start') {
		console.info(`Flow ${flowKey} has no start step, ignored.`.red);
		return;
	}
	if (!startStep.url) {
		console.info(`Flow ${flowKey} has no start url, ignored.`.red);
		return;
	}

	const emitter = new ReplayEmitter();
	let replayer;
	try {
		replayer = replay({
			emitter,
			logger
		}).initialize();
	} catch (e) {
		logger.error(e);
		return;
	}

	const promise = new Promise(resolve => {
		handleReplayStepEnd(emitter, { name: storyName }, flow, () => {
			const summary = replayer.current.getSummary();
			timeLogger.timeEnd(flowKey);
			if (summary == null || Object.keys(summary).length === 0) {
				report.push({
					storyName: storyName,
					flowName: flow.name,
					numberOfStep: flow.steps.length,
					numberOfUIBehavior: '-',
					numberOfSuccess: 0,
					numberOfFailed: flow.steps.length,
					ignoreErrorList: [],
					numberOfAjax: '-',
					slowAjaxRequest: [],
					spent: timeSpent
				});
			} else {
				report.push({ ...summary, spent: timeSpent });
			}
			resolve();
		});
	});
	emitter.send('launch-replay', { flow, index: 0, storyName });
	return promise;
};

const report = [];

flows
	.reduce(async (promise, flowObject) => {
		await promise;
		try {
			await hanldeFlowObject(flowObject);
		} catch {
			// do nothing
		}
	}, Promise.resolve())
	.finally(() => {
		console.table(
			report.map(item => {
				return {
					Story: item.storyName,
					Flow: item.flowName,
					Steps: item.numberOfStep,
					'UI Behavior': item.numberOfUIBehavior,
					Passed: item.numberOfSuccess,
					Failed: item.numberOfFailed,
					'Ignored Errors': item.ignoreErrorList,
					'Ajax calls': item.numberOfAjax,
					'Slow ajax calls': item.slowAjaxRequest,
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
	});
