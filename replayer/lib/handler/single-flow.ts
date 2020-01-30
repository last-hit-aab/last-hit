import fs from 'fs';
import jsonfile from 'jsonfile';
import { Flow, FlowParameter, FlowParameters, StartStep, Step, Story } from 'last-hit-types';
import path from 'path';
import stream from 'stream';
import Environment from '../config/env';
import { createReplayer, ReplayEmitter } from '../replayer';
import { CallbackEvent } from '../replayer/replay-emitter';
import { FlowFile, FlowResult, Summary } from '../types';
import { generateKeyByObject, getLogger, getProcessId } from '../utils';

const processId = getProcessId();

export const mergeFlowInput = (source: Flow, target: Flow): void => {
	if (source.params && source.params.length !== 0) {
		target.params = target.params || [];
		const existsParamNames = target.params!.reduce((names, param) => {
			names[param.name] = true;
			return names;
		}, {} as { [key in string]: true });
		source.params
			.filter(param => param.type !== 'out')
			.filter(param => existsParamNames[param.name] !== true)
			.forEach(param => target.params!.push(param));
	}
};
/**
 * find all force dependencies, and merge steps to one flow
 */
const findAndMergeForceDependencyFlows = (flow: Flow, env: Environment): Flow => {
	const forceDependencyFlow = {
		name: flow.name,
		description: `Merged force dependency flows`,
		steps: [] as Array<Step>,
		params: [] as FlowParameters
	};

	let currentFlow = flow;
	while (currentFlow.settings && currentFlow.settings.forceDepends) {
		const { story: storyName, flow: flowName } = currentFlow.settings.forceDepends;
		if (!env.isFlowExists(storyName, flowName)) {
			throw new Error(`Dependency flow[${flowName}@${storyName}] not found.`);
		}
		const dependsFlow: Flow = env.readFlowFile(storyName, flowName);

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
		mergeFlowInput(dependsFlow, forceDependencyFlow);
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

const doForceLoopCheck = (
	depends: FlowFile,
	dependsChain: Array<FlowFile>,
	env: Environment
): boolean => {
	const { story: dependsStoryName, flow: dependsFlowName } = depends;
	if (findInDependencyChain(dependsStoryName, dependsFlowName, dependsChain)) {
		dependsChain.push({ story: dependsStoryName, flow: dependsFlowName });
		const chain = dependsChain.map(({ story, flow }) => `${flow}@${story}`).join(' -> ');
		throw new Error(`Loop dependency[${chain}] found.`);
	}

	if (!env.isStoryExists(dependsStoryName)) {
		throw new Error(`Dependency story[${dependsStoryName}] not found.`);
	}
	if (!env.isFlowExists(dependsStoryName, dependsFlowName)) {
		throw new Error(`Dependency flow[${dependsFlowName}@${dependsStoryName}] not found.`);
	}

	const dependsFlow = env.readFlowFile(dependsStoryName, dependsFlowName);
	const { forceDepends = null } = dependsFlow.settings || {};
	if (forceDepends) {
		if (findInDependencyChain(forceDepends.story, forceDepends.flow, dependsChain)) {
			dependsChain.push({ story: dependsStoryName, flow: dependsFlowName });
			const chain = dependsChain.map(({ story, flow }) => `${flow}@${story}`).join(' -> ');
			throw new Error(`Loop dependency[${chain}] found.`);
		} else {
			// push dependency to chain
			dependsChain.push({ story: dependsStoryName, flow: dependsFlowName });
			return doForceLoopCheck(forceDepends, dependsChain, env);
		}
	}
	return true;
};

/**
 * only check loop. return true even dependency flow not found.
 */
const forceLoopCheck = (dependency: FlowFile, myself: FlowFile, env: Environment): boolean => {
	return doForceLoopCheck(dependency, [myself], env);
};

type DataLoopCheckNode = {
	children: Array<DataLoopCheckNode>;
	parent: null | DataLoopCheckNode;
	story: string;
	flow: string;
};
const dataLoopCheck = (
	depends: Array<{ story: string; flow: string }>,
	node: DataLoopCheckNode,
	env: Environment
): boolean => {
	return depends.every(depend => {
		const { story, flow } = depend;
		if (story === node.story && flow === node.flow) {
			throw new Error(
				`Loop dependency[${node.flow}@${node.story} -> ${flow}@${story}] found.`
			);
		}

		const chain: Array<DataLoopCheckNode> = [node];
		let parent = node.parent;
		while (parent != null) {
			chain.push(parent);
			if (story === parent.story && flow === parent.flow) {
				const chained = chain.map(({ story, flow }) => `${flow}@${story}`).join(' -> ');
				throw new Error(`Loop dependency[${chained}] found.`);
			}
			parent = parent.parent;
		}

		if (!env.isStoryExists(story)) {
			throw new Error(`Dependency story[${story}] not found.`);
		}
		if (!env.isFlowExists(story, flow)) {
			throw new Error(`Dependency flow[${flow}@${story}] not found.`);
		}
		const dependsFlow = env.readFlowFile(story, flow);
		const { dataDepends = [] } = dependsFlow.settings || {};

		const myself = { children: [], parent: node, story, flow };
		node.children.push(myself);

		return dataLoopCheck(dataDepends, myself, env);
	});
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
			// index: index of the finished step, starts from 0
			const { error, index } = arg;
			if (error) {
				(async () => {
					console.error(
						(`Process[${processId}] Replay flow ${key} failed on step ${index + 1}.`
							.bold as any).red.bold,
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
	let flow: Flow;
	try {
		flow = env.readFlowFile(storyName, flowName);
	} catch (e) {
		logger.error(e);
		return Promise.reject();
	}
	flow.name = flowName;

	if (flow.steps == null || flow.steps.length === 0) {
		console.info(
			(`Process[${processId}] Flow ${flowKey} has no steps, ignored.` as any).red.bold
		);
		return Promise.reject();
	}

	if (flow.settings && flow.settings.forceDepends) {
		// has force dependency
		const { story: dependsStoryName, flow: dependsFlowName } = flow.settings.forceDepends;
		try {
			forceLoopCheck(
				{ story: dependsStoryName, flow: dependsFlowName },
				{ story: storyName, flow: flowName },
				env
			);
		} catch (e) {
			logger.error(e);
			console.info(
				(`Process[${processId}] Flow ${flowKey} failed on force dependency loop check, ignored.` as any)
					.red.bold
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
		mergeFlowInput(flow, forceDependsFlow);
		flow = forceDependsFlow;
	}

	if (flow.settings && flow.settings.dataDepends) {
		// has data dependency
		const depends: Array<{ story: string; flow: string }> = flow.settings.dataDepends.filter(
			depend => depend.story && depend.flow
		);
		const root: DataLoopCheckNode = {
			children: [],
			parent: null,
			story: storyName,
			flow: flowName
		};
		try {
			dataLoopCheck(depends, root, env);
		} catch (e) {
			logger.error(e);
			console.info(
				(`Process[${processId}] Flow ${flowKey} failed on data dependency loop check, ignored.` as any)
					.red.bold
			);
			return Promise.reject();
		}
		// to check all data dependencies are finished
		const score = root.children.reduce((score: number, depend: DataLoopCheckNode) => {
			switch (score) {
				case 1:
					// dependency not finished yet
					return 1;
				case 2:
					// dependency failure
					return 2;
				default:
					// check dependency
					const { story: storyName, flow: flowName } = depend;
					const resultFile = path.join(
						env.getWorkspace(),
						'.result-params-temp',
						storyName,
						flowName,
						'params.json'
					);
					if (fs.existsSync(resultFile) && fs.statSync(resultFile).isFile()) {
						const result = jsonfile.readFileSync(resultFile);
						const { success, params = [] } = result || { success: false };
						if (!success) {
							// dependency failed
							return 2;
						} else {
							params
								.filter((param: FlowParameter) => {
									return ['out', 'both'].includes(param.type);
								})
								.forEach((param: FlowParameter) => {
									flow.params = flow.params || [];
									const defined = flow.params.find(
										defined =>
											['in', 'both'].includes(defined.type) &&
											defined.name === param.name
									);
									if (defined) {
										// pass value
										defined.value = param.value;
									} else {
										// create an input parameter
										flow.params.push({
											type: 'in',
											name: param.name,
											value: param.value
										});
									}
								});
							return 0;
						}
					} else {
						return 1;
					}
			}
		}, 0);
		switch (score) {
			case 1:
				console.info(
					(`Process[${processId}] Flow ${flowKey} pending on data dependency flow not ready.` as any)
						.yellow.underline
				);
				// dependency not finished yet
				return Promise.resolve({
					code: 'pending'
				} as FlowResult);
			case 2:
				// dependency failure
				console.info(
					(`Process[${processId}] Flow ${flowKey} failed on data dependency flow failure, ignored.` as any)
						.red.bold
				);
				return Promise.reject();
			default:
				// every is ready, let's go
				break;
		}
	}

	const startStep = flow.steps![0] as StartStep;
	if (startStep.type !== 'start') {
		console.info(
			(`Process[${processId}] Flow ${flowKey} has no start step, ignored.` as any).red.bold
		);
		return Promise.reject();
	}
	if (!startStep.url) {
		console.info(
			(`Process[${processId}] Flow ${flowKey} has no start url, ignored.` as any).red.bold
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
			const summary: Summary = replayer.current.getSummaryData();
			// write out parameters only
			const resultFolder = path.join(
				env.getWorkspace(),
				'.result-params-temp',
				storyName,
				flowName
			);
			fs.mkdirSync(resultFolder, { recursive: true });
			const result = {
				success: summary.numberOfStep === summary.numberOfSuccess,
				params: summary.flowParams
			};
			const resultFile = path.join(resultFolder, 'params.json');
			jsonfile.writeFileSync(resultFile, result, { encoding: 'UTF-8', spaces: '\t' });
			timeLogger.timeEnd(flowKey);
			resolve({
				report: { ...summary, spent: timeSpent },
				coverages: replayer.current.getCoverageData(),
				code: 'success'
			});
		});
	});
	emitter.send('launch-replay', { flow, index: 0, storyName });
	return promise;
};
