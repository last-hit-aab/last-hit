import fs from 'fs';
import jsonfile from 'jsonfile';
import { Flow, Step, Story, StartStep } from 'last-hit-types';
import path from 'path';
import stream from 'stream';
import Environment from '../config/env';
import { createReplayer, ReplayEmitter } from '../replayer';
import { CallbackEvent } from '../replayer/replay-emitter';
import { FlowFile, FlowResult } from '../types';
import { generateKeyByObject, getLogger, getProcessId } from '../utils';

const processId = getProcessId();

/**
 * find all force dependencies, and merge steps to one flow
 */
const findAndMergeForceDependencyFlows = (flow: Flow, env: Environment): Flow => {
	const forceDependencyFlow = {
		name: flow.name,
		description: `Merged force dependency flows`,
		steps: [] as Array<Step>
	};

	let currentFlow = flow;
	while (currentFlow.settings && currentFlow.settings.forceDepends) {
		const { story: storyName, flow: flowName } = currentFlow.settings.forceDepends;
		const dependsFlowFilename = path.join(
			env.getWorkspace(),
			storyName,
			`${flowName}.flow.json`
		);
		if (!fs.existsSync(dependsFlowFilename) || !fs.statSync(dependsFlowFilename).isFile()) {
			throw new Error(`Dependency flow[${flowName}@${storyName}] not found.`);
		}
		const dependsFlow: Flow = jsonfile.readFileSync(dependsFlowFilename);

		const steps = dependsFlow.steps || [];

		forceDependencyFlow.steps.splice(
			0,
			0,
			...steps.map(
				step =>
					({
						...step,
						origin: {
							story: storyName,
							flow: dependsFlow.name,
							stepIndex: step.stepIndex
						}
					} as Step)
			)
		);
		currentFlow = dependsFlow;
	}

	forceDependencyFlow.steps = forceDependencyFlow.steps.filter((step, index) => {
		return index === 0 || (step.type !== 'start' && step.type !== 'end');
	});
	forceDependencyFlow.steps.push({ type: 'end' } as Step);
	forceDependencyFlow.steps.forEach((step, index) => (step.stepIndex = index));

	return forceDependencyFlow;
};

const findInDependencyChain = (
	story: string,
	flow: string,
	dependsChain: { story: string; flow: string }[]
) => {
	return dependsChain.some(node => node.story === story && node.flow === flow);
};

const doLoopCheck = (
	dependsStoryName: string,
	dependsFlowName: string,
	dependsChain: { story: string; flow: string }[],
	env: Environment
): boolean => {
	if (findInDependencyChain(dependsStoryName, dependsFlowName, dependsChain)) {
		dependsChain.push({ story: dependsStoryName, flow: dependsFlowName });
		const chain = dependsChain.map(({ story, flow }) => `${flow}@${story}`).join(' -> ');
		throw new Error(`Loop dependency[${chain}] found.`);
	}

	const dependsStoryFolder = path.join(env.getWorkspace(), dependsStoryName);
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
			return doLoopCheck(forceDepends.story, forceDepends.flow, dependsChain, env);
		}
	}
	return true;
};

/**
 * only check loop. return true even dependency flow not found.
 */
const loopCheck = (
	dependsStoryName: string,
	dependsFlowName: string,
	myStoryName: string,
	myFlowName: string,
	env: Environment
): boolean => {
	return doLoopCheck(
		dependsStoryName,
		dependsFlowName,
		[{ story: myStoryName, flow: myFlowName }],
		env
	);
};

const replayNextStep = (
	emitter: ReplayEmitter,
	story: Story,
	flow: Flow,
	index: number,
	resolve: () => void
) => {
	handleReplayStepEnd(emitter, story, flow, resolve);
	emitter.send(`continue-replay-step-${generateKeyByObject(story, flow)}`, {
		storyName: story.name,
		flow,
		index: index + 1
	});
};

const handleReplayStepEnd = (
	emitter: ReplayEmitter,
	story: Story,
	flow: Flow,
	resolve: () => void
): void => {
	const key = generateKeyByObject(story, flow);
	emitter.once(
		`replay-step-end-${key}`,
		(event: CallbackEvent, arg: { error?: any; index: number }): void => {
			const { error, index } = arg;
			if (error) {
				(async () => {
					console.error(
						(`Process[${processId}] Replay flow ${key} failed on step ${index}.`
							.bold as any).red,
						error
					);
					emitter.once(`replay-browser-abolish-${key}`, () => resolve());
					// abolish anyway
					emitter.send(`continue-replay-step-${key}`, { command: 'abolish' });
				})();
			} else if (flow.steps![index].type === 'end' || index >= flow.steps!.length - 1) {
				// the end or last step is finished
				(async () => {
					console.info(
						(`Process[${processId}] Replay flow ${key} finished.`.bold as any).green
					);
					emitter.once(`replay-browser-abolish-${key}`, () => resolve());
					emitter.send(`continue-replay-step-${key}`, { command: 'abolish' });
				})();
			} else {
				// go on
				replayNextStep(emitter, story, flow, index, resolve);
			}
		}
	);
};

export const handleFlow = (flowFile: FlowFile, env: Environment): Promise<FlowResult> => {
	const logger = getLogger();
	const { story: storyName, flow: flowName } = flowFile;
	const flowKey = `${flowName}@${storyName}`;
	const workspace = env.getWorkspace();

	const timeLoggerStream = new stream.Transform();
	let timeSpent;
	timeLoggerStream._transform = function(chunk, encoding, done) {
		this.push(chunk);
		timeSpent = typeof chunk === 'string' ? chunk : chunk.toString();
		done();
	};
	const timeLogger = new console.Console({ stdout: timeLoggerStream });
	timeLogger.time(flowKey);

	console.info(
		(`Process[${processId}] Start to replay [${flowKey}].` as any).italic.blue.underline
	);
	const file = path.join(workspace, storyName, `${flowName}.flow.json`);
	let flow: Flow;
	try {
		flow = jsonfile.readFileSync(file);
	} catch (e) {
		logger.error(e);
		return Promise.reject();
	}
	flow.name = flowName;

	if (flow.steps == null || flow.steps.length === 0) {
		console.info((`Process[${processId}] Flow ${flowKey} has no steps, ignored.` as any).red);
		return Promise.reject();
	}

	if (flow.settings && flow.settings.forceDepends) {
		// has force dependency
		const { story: dependsStoryName, flow: dependsFlowName } = flow.settings.forceDepends;
		try {
			loopCheck(dependsStoryName, dependsFlowName, storyName, flowName, env);
		} catch (e) {
			logger.error(e);
			console.info(
				(`Process[${processId}] Flow ${flowKey} failed on force dependency loop check, ignored.` as any)
					.red
			);
			return Promise.reject();
		}
		const forceDependsFlow = findAndMergeForceDependencyFlows(flow, env);
		// remove end step
		forceDependsFlow.steps!.length = forceDependsFlow.steps!.length - 1;
		flow.steps
			.filter((step, index) => index !== 0)
			.forEach(step =>
				forceDependsFlow.steps!.push({
					...step,
					origin: {
						story: storyName,
						flow: flow.name,
						stepIndex: step.stepIndex
					}
				} as Step)
			);
		flow = forceDependsFlow;
	}

	const startStep = flow.steps![0] as StartStep;
	if (startStep.type !== 'start') {
		console.info(
			(`Process[${processId}] Flow ${flowKey} has no start step, ignored.` as any).red
		);
		return Promise.reject();
	}
	if (!startStep.url) {
		console.info(
			(`Process[${processId}] Flow ${flowKey} has no start url, ignored.` as any).red
		);
		return Promise.reject();
	}

	const emitter = new ReplayEmitter();
	let replayer;
	try {
		replayer = createReplayer({ emitter, logger, env }).initialize();
	} catch (e) {
		logger.error(e);
		return Promise.reject();
	}

	const promise = new Promise<FlowResult>(resolve => {
		handleReplayStepEnd(emitter, { name: storyName } as Story, flow, () => {
			const summary = replayer.current.getSummaryData();
			timeLogger.timeEnd(flowKey);
			resolve({
				report: { ...summary, spent: timeSpent },
				coverages: replayer.current.getCoverageData()
			});
		});
	});
	emitter.send('launch-replay', { flow, index: 0, storyName });
	return promise;
};
