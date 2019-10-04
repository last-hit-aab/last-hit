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
					return;
				} else {
					return `${flow}.flow.json` === flowName;
				}
			})
			.map(flowName => flowName.replace(/^(.*)\.flow\.json$/, '$1'))
			.map(flowName => ({ story: storyName, flow: flowName }));
	})
	.flat();

const generateKeyByObject = (story, flow) => {
	return `[${flow.name}@${story.name}]`;
};

const replayNextStep = (emitter, story, flow, index) => {
	handleReplayStepEnd(emitter, story, flow);
	emitter.send(`continue-replay-step-${generateKeyByObject(story, flow)}`, {
		storyName: story.name,
		flow,
		index: index + 1
	});
};
const handleReplayStepEnd = (emitter, story, flow) => {
	const key = generateKeyByObject(story, flow);
	emitter.once(`replay-step-end-${key}`, (event, arg) => {
		const { error, index } = arg;
		if (error) {
			(async () => {
				console.error(`Replay flow ${key} failed.`, error);
				// disconnect
				emitter.send(`continue-replay-step-${key}`, {
					command: 'disconnect'
				});
			})();
		} else if (flow.steps[index].type === 'end' || index >= flow.steps.length - 1) {
			// the end or last step is finished
			(async () => {
				console.info(`Replay flow ${key} finished.`.green);
				emitter.send(`continue-replay-step-${generateKeyByObject(story, flow)}`, {
					command: 'abolish'
				});
			})();
		} else {
			// go on
			replayNextStep(emitter, story, flow, index);
		}
	});
};

// start
const parallel = args.parallel || 1;
flows.forEach(flowObject => {
	const { story: storyName, flow: flowName } = flowObject;
	const flowKey = `${flowName}@${storyName}`;
	console.info(`Start to replay ${flowKey}.`.bold.red);
	const file = path.join(workspace, storyName, `${flowName}.flow.json`);
	let flow = null;
	try {
		flow = jsonfile.readFileSync(file);
	} catch (e) {
		console.error(e);
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
	const replayer = replay({ emitter, logger: console });
	try {
		replayer.initialize();
	} catch (e) {
		console.error(e);
		return;
	}

	handleReplayStepEnd(emitter, { name: storyName }, flow);
	emitter.send('launch-replay', { flow, index: 0, storyName });
});
