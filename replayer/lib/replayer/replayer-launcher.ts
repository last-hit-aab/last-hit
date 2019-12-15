import { Flow, Step } from 'last-hit-types';
import Environment from '../config/env';
import { generateKeyByString } from '../utils';
import ReplayEmitter, { CallbackEvent } from './replay-emitter';
import Replayer from './replayer';
import { WorkspaceExtensionRegistry } from './replayer-extension-registry';
import { ReplayerCache } from './replayers-cache';

export type ReplayerHandle = { current?: Replayer; env: Environment };
export type ReplayerLauncher = () => ReplayerHandle;
type NextStepHandlerOptions = {
	storyName: string;
	flowName: string;
	replayer: Replayer;
	index: number;
	event: CallbackEvent;
	error?: Error;
	errorStack?: string;
};
type NextStepHandler = (options: NextStepHandlerOptions) => void;

const createNextStepHandler = (emitter: ReplayEmitter, logger: Console): NextStepHandler => {
	const waitForNextStep = (options: NextStepHandlerOptions): void => {
		const { storyName, flowName, replayer } = options;
		emitter.once(
			`continue-replay-step-${generateKeyByString(storyName, flowName)}`,
			async (
				event: CallbackEvent,
				arg: {
					flow: Flow;
					index: number;
					command?: 'disconnect' | 'abolish' | 'switch-to-record';
				}
			) => {
				const { flow, index, command } = arg;
				const step = replayer.getSteps()[index];
				switch (command) {
					case 'disconnect':
						await replayer.end(false);
						event.reply(
							`replay-browser-disconnect-${generateKeyByString(storyName, flowName)}`,
							{
								summary: replayer.getSummaryData()
							}
						);
						break;
					case 'abolish':
						await replayer.end(true);
						event.reply(
							`replay-browser-abolish-${generateKeyByString(storyName, flowName)}`,
							{
								summary: replayer.getSummaryData()
							}
						);
						break;
					case 'switch-to-record':
						// keep replayer instance in replayers map
						replayer.switchToRecord();
						event.reply(
							`replay-browser-ready-to-switch-${generateKeyByString(
								storyName,
								flowName
							)}`,
							{}
						);
						break;
					default:
						try {
							logger.log(
								`Continue step[${index}]@${generateKeyByString(
									storyName,
									flowName
								)}.`
							);
							replayer.getSummary().handle(step);
							await replayer.next(flow, index, storyName);

							waitForNextStep({ event, replayer, storyName, flowName, index });
						} catch (e) {
							logger.error('Step execution failed, failed step as below:');
							logger.error(step);
							logger.error(e);
							// failed, prepare for next step
							// send back
							// replayer.getSummary().handleError(step, e);
							waitForNextStep({
								event,
								replayer,
								storyName,
								flowName,
								index,
								error: e.message,
								errorStack: e.stack
							});
						}
				}
			}
		);
		logger.log(
			`Reply message step[${options.index}]@[replay-step-end-${generateKeyByString(
				storyName,
				flowName
			)}].`
		);

		options.event.reply(`replay-step-end-${generateKeyByString(storyName, flowName)}`, {
			index: options.index,
			error: options.error,
			errorStack: options.errorStack,
			summary: replayer.getSummaryData()
		});
	};
	return waitForNextStep;
};

const launch = (
	emitter: ReplayEmitter,
	replayers: ReplayerCache,
	logger: Console,
	env: Environment
): ReplayerHandle => {
	const waitForNextStep = createNextStepHandler(emitter, logger);

	const handle: ReplayerHandle = { env };
	emitter.on(
		'launch-replay',
		async (event: CallbackEvent, arg: { storyName: string; flow: Flow; index: number }) => {
			const { storyName, flow, index } = arg;
			const registry = new WorkspaceExtensionRegistry({ env: handle.env });
			await registry.launch();

			const replayer = new Replayer({
				storyName,
				flow,
				logger,
				replayers,
				env: handle.env,
				registry
			});
			handle.current = replayer;

			try {
				await replayer.start();
				replayer.getSummary().handle((flow.steps || [])[0] || ({} as Step));
				// put into cache
				replayers[generateKeyByString(storyName, flow.name)] = replayer;

				// successful, prepare for next step
				// send back
				waitForNextStep({ event, replayer, storyName, flowName: flow.name, index });
			} catch (e) {
				logger.error(e);
				replayer.getSummary().handleError((flow.steps || [])[0] || ({} as Step), e);
				// failed, prepare for next step
				// send back
				waitForNextStep({
					event,
					replayer,
					storyName,
					flowName: flow.name,
					index,
					error: e.message,
					errorStack: e.stack
				});
			}
		}
	);
	return handle;
};

export default (
	emitter: ReplayEmitter,
	replayers: ReplayerCache,
	logger: Console,
	env: Environment
): ReplayerLauncher => {
	return (): ReplayerHandle => launch(emitter, replayers, logger, env);
};
