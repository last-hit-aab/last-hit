import { Button, Classes, Overlay } from '@blueprintjs/core';
import { ipcRenderer, remote } from 'electron';
import { Flow, FlowParameters, Story } from 'last-hit-types';
import React from 'react';
import styled from 'styled-components';
import { getActiveWorkspace } from '../../active';
import UIContext, { asFlowKeyByName } from '../../common/context';
import { EventTypes } from '../../events';
import { asFlowKey, findAndMergeForceDependencyFlows, mergeFlowInput } from '../../files';
import { getStepTypeText } from '../step/utils';
import ParamsDialog from './replay-params-dialog';
import { loopCheck } from './utils';

const Placeholder = styled.div`
	flex-grow: 1;
`;

const buildReplayFlow = async (
	story: Story,
	flow: Flow,
	forRecordForceDependency: boolean
): Promise<Flow> => {
	let replayFlow: Flow;
	const workspaceStructure = getActiveWorkspace()!.getStructure();
	const forceDepends = (flow.settings || {}).forceDepends;
	if (forRecordForceDependency || forceDepends) {
		// force dependency exists, run replay first
		if (
			!loopCheck(
				workspaceStructure,
				forceDepends!.story,
				forceDepends!.flow,
				story.name,
				flow.name
			)
		) {
			return Promise.reject();
		}
		// merge all force depending flows
		replayFlow = findAndMergeForceDependencyFlows(workspaceStructure, story, flow);
		if (!forRecordForceDependency) {
			// simply replaying, remove end step of force depending flows
			// add my steps
			replayFlow.steps!.length = replayFlow.steps!.length - 1;
			// remove my start step
			flow.steps!.filter((step, index) => index !== 0).forEach((step, index) =>
				replayFlow.steps!.push({
					...step,
					origin: {
						story: story.name,
						flow: flow.name,
						stepIndex: step.stepIndex,
						index: index + 1
					} as any
				})
			);
			// merge flow input from me to replay flow
			mergeFlowInput(flow, replayFlow);
		}
	} else {
		replayFlow = flow;
	}
	return replayFlow;
};

const ReplayDialog = (props: {
	story: Story;
	flow: Flow;
	stepping: boolean;
	forRecordForceDependency?: boolean;
}): JSX.Element => {
	const { story, flow, stepping, forRecordForceDependency = false } = props;
	const { emitter } = React.useContext(UIContext);

	const close = () => {
		emitter.emit(EventTypes.CLOSE_FLOW_REPLAY_DIALOG, story, flow);
	};
	const [paramsFlow, setParamsFlow] = React.useState(null as null | Flow);
	const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
	const [paused, setPaused] = React.useState(false);
	const [replayFlow, setReplayFlow] = React.useState(null as null | Flow);

	const setReplaySummary = (options: {
		story: Story;
		flow: Flow;
		summary: any;
		error: Error | null;
		errorStack: string | null;
		stepIndex: number | null;
	}): void => {
		const { story, flow, ...rest } = options;
		emitter.emit(EventTypes.ASK_REPLAY_SUMMARY_SHOW, story, flow, rest);
		close();
	};
	const doSwitchToRecord = (length?: number): void => {
		const flowKey = asFlowKey(flow, story);
		ipcRenderer.once(`replay-browser-ready-to-switch-${flowKey}`, () => {
			ipcRenderer.once(`puppeteer-switched-${flowKey}`, async () => {
				if (flow.steps) {
					if (length === 1) {
						flow.steps.length = 1;
					} else if (replayFlow!.steps!.length === flow.steps.length) {
						// no force depending flows
						flow.steps.length = currentStepIndex + 1;
					} else {
						// force depending flows exists
						flow.steps.length =
							(replayFlow!.steps![currentStepIndex].origin as any).index + 1;
					}
				}
				emitter.emit(EventTypes.ASK_SAVE_FLOW, story, flow);

				// recover state
				await remote.dialog.showMessageBox(remote.getCurrentWindow(), {
					type: 'info',
					title: 'Switch to record',
					message: 'Switch successfully, enjoy record again.',
					buttons: ['OK']
				});
				emitter.emit(EventTypes.ASK_FLOW_RECORD, story, flow, true);
				close();
			});
			ipcRenderer.send('switch-puppeteer', { storyName: story.name, flowName: flow.name });
		});
		ipcRenderer.send(`continue-replay-step-${flowKey}`, {
			command: 'switch-to-record'
		});
	};
	const replayNextStep = (
		story: Story,
		replayFlow: Flow,
		index: number,
		pauseOnDone: boolean = false
	): void => {
		setPaused(false);
		setCurrentStepIndex(index + 1);
		handleReplayStepEnd(story, replayFlow, pauseOnDone);
		ipcRenderer.send(`continue-replay-step-${asFlowKey(replayFlow, story)}`, {
			storyName: story.name,
			flow: replayFlow,
			index: index + 1
		});
	};
	const doEndReplay = async (flowKey: String) => {
		const ret: Electron.MessageBoxReturnValue = await remote.dialog.showMessageBox(
			remote.getCurrentWindow(),
			{
				type: 'info',
				title: 'Replay finished',
				message: 'Mission Accomplished. Congratulations!',
				buttons: ['Disconnect only', 'Disconnect & close Chromium']
			}
		);
		switch (ret.response) {
			case 0:
				ipcRenderer.once(`replay-browser-disconnect-${flowKey}`, (event, arg) =>
					setReplaySummary({
						story,
						flow,
						summary: arg.summary,
						error: null,
						errorStack: null,
						stepIndex: null
					})
				);
				ipcRenderer.send(`continue-replay-step-${flowKey}`, {
					command: 'disconnect'
				});
				break;
			case 1:
				ipcRenderer.once(`replay-browser-abolish-${flowKey}`, (event, arg) =>
					setReplaySummary({
						story,
						flow,
						summary: arg.summary,
						error: null,
						errorStack: null,
						stepIndex: null
					})
				);
				ipcRenderer.send(`continue-replay-step-${flowKey}`, {
					command: 'abolish'
				});
				break;
		}
		emitter.emit(EventTypes.CLOSE_FLOW_REPLAY_DIALOG, story, flow);
	};
	const handleReplayStepEnd = (story: Story, flow: Flow, pauseOnDone: boolean = false): void => {
		const flowKey = asFlowKey(flow, story);
		ipcRenderer.once(`replay-step-end-${flowKey}`, (event, arg) => {
			const { error, errorStack, index } = arg;
			if (error) {
				(async () => {
					await remote.dialog.showMessageBox(remote.getCurrentWindow(), {
						type: 'error',
						title: 'Replay fail',
						message: error
					});
					ipcRenderer.once(`replay-browser-disconnect-${flowKey}`, (event, arg) =>
						setReplaySummary({
							story,
							flow,
							summary: arg.summary,
							error,
							errorStack,
							stepIndex: index
						})
					);
					// disconnect
					ipcRenderer.send(`continue-replay-step-${flowKey}`, {
						command: 'disconnect'
					});
				})();
			} else if (flow.steps![index].type === 'end' || index >= flow.steps!.length - 1) {
				// the end or last step is finished
				if (!forRecordForceDependency) {
					doEndReplay(flowKey);
				} else {
					// leave the start step
					doSwitchToRecord(1);
				}
			} else if (stepping || pauseOnDone) {
				// check is force dependency or not
				const step = flow.steps![index]!;
				// when has force dependency, all step has origin field.
				// otherwise, no origin field
				const { flow: flowName = null } = step.origin || {};
				if (flowName && flowName !== flow.name) {
					// in force dependency step, continue
					replayNextStep(story, flow, index);
				} else {
					// has force dependency, but step is my step
					// or has no force dependency
					// set step replaying to false, enable the step play button
					setPaused(true);
				}
			} else {
				const nextStep = flow.steps![index + 1];
				if (nextStep && nextStep.breakpoint) {
					// breakpoint on next step, pause here
					setPaused(true);
				} else {
					// go on
					replayNextStep(story, flow, index);
				}
			}
		});
	};
	const doStartReplay = (replayFlow: Flow): void => {
		setReplayFlow(replayFlow);
		handleReplayStepEnd(story, replayFlow);
		ipcRenderer.send('launch-replay', {
			flow: replayFlow,
			index: currentStepIndex,
			storyName: story.name
		});
	};
	const startReplay = async () => {
		try {
			const replayFlow: Flow = await buildReplayFlow(story, flow, forRecordForceDependency);
			if (replayFlow.params && replayFlow.params.length !== 0) {
				// has inputs
				setParamsFlow(replayFlow);
			} else {
				doStartReplay(replayFlow);
			}
		} catch {
			await remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Failed to start replay',
				message: 'Loop dependencies found, check flow settings please.'
			});
		}
	};
	React.useEffect(() => {
		startReplay();
		// eslint-disable-next-line
	}, [0]);

	const getCurrentStepText = (): string => {
		if (replayFlow) {
			const step = replayFlow.steps![currentStepIndex];
			const text = getStepTypeText(step);
			if (step.origin) {
				const { story: storyName, flow: flowName, stepIndex } = step.origin;
				return `${asFlowKeyByName(flowName, storyName)}#${stepIndex} ${text}`;
			} else {
				return text;
			}
		} else {
			return 'Preparing...';
		}
	};
	const onContinueClicked = () => {
		replayNextStep(story, replayFlow!, currentStepIndex);
	};
	const onRunOneStepClicked = () => {
		replayNextStep(story, replayFlow!, currentStepIndex, true);
	};
	const onSwitchToRecordClicked = async () => {
		let ret: Electron.MessageBoxReturnValue = await remote.dialog.showMessageBox(
			remote.getCurrentWindow(),
			{
				type: 'info',
				title: 'Switch to record',
				message:
					'Are you sure to switch to record? Cannot recover replay again, steps after breakpoint will be replaced and cannot be recovered.',
				buttons: ['OK', 'Cancel']
			}
		);
		switch (ret.response) {
			case 0:
				doSwitchToRecord();
				break;
			case 1:
				break;
		}
	};
	const onStopReplayClicked = (): void => {
		(async () => {
			const ret: Electron.MessageBoxReturnValue = await remote.dialog.showMessageBox(
				remote.getCurrentWindow(),
				{
					type: 'info',
					title: 'Stop replay',
					message: 'Do you want to stop step by step replay?',
					buttons: ['OK & disconnect only', 'OK & disconnect & close Chromium', 'Cancel']
				}
			);
			const flowKey = asFlowKey(flow, story);
			switch (ret.response) {
				case 0:
					ipcRenderer.send(`continue-replay-step-${flowKey}`, {
						command: 'disconnect'
					});
					break;
				case 1:
					ipcRenderer.send(`continue-replay-step-${flowKey}`, {
						command: 'abolish'
					});
					break;
				case 2:
					// cancel stop
					return;
			}
			close();
		})();
	};

	const onParamsDialogConfirmed = (params: FlowParameters): void => {
		const flow = paramsFlow!;
		flow.params = params;
		setParamsFlow(null);
		doStartReplay(flow);
	};
	if (paramsFlow != null) {
		return (
			<ParamsDialog flow={paramsFlow} onConfirm={onParamsDialogConfirmed} onCancel={close} />
		);
	}

	return (
		<Overlay
			isOpen={true}
			canEscapeKeyClose={false}
			canOutsideClickClose={false}
			className={`${Classes.OVERLAY_CONTAINER} small`}
			autoFocus={true}>
			<div className={`${Classes.CARD} ${Classes.ELEVATION_2}`}>
				<h3 className="bp3-heading">
					{paused ? 'Flow replaying, paused' : 'Flow replaying'}
				</h3>
				<div>
					<h4 className="bp3-heading">
						#{currentStepIndex} {getCurrentStepText()}
					</h4>
				</div>
				<div className="overlay-placeholder" />
				<div className={Classes.DIALOG_FOOTER_ACTIONS}>
					<Button onClick={onStopReplayClicked} intent="danger" disabled={!paused}>
						Stop
					</Button>
					<Button onClick={onSwitchToRecordClicked} intent="danger" disabled={!paused}>
						Switch to record
					</Button>
					<Placeholder />
					<Button onClick={onRunOneStepClicked} intent="primary" disabled={!paused}>
						Run one step
					</Button>
					<Button onClick={onContinueClicked} intent="primary" disabled={!paused}>
						Continue
					</Button>
				</div>
			</div>
		</Overlay>
	);
};

export default (): JSX.Element => {
	const { emitter } = React.useContext(UIContext);

	const [data, setData] = React.useState(
		null as {
			story: Story;
			flow: Flow;
			stepping: boolean;
			forRecordForceDependency: boolean;
		} | null
	);
	React.useEffect(() => {
		const openMe = (
			story: Story,
			flow: Flow,
			stepping: boolean,
			forRecordForceDependency: boolean
		): void => setData({ story, flow, stepping, forRecordForceDependency });
		const closeMe = (): void => setData(null);
		emitter
			.on(EventTypes.ASK_FLOW_REPLAY, openMe)
			.on(EventTypes.CLOSE_FLOW_REPLAY_DIALOG, closeMe);

		return () => {
			emitter
				.off(EventTypes.ASK_FLOW_REPLAY, openMe)
				.off(EventTypes.CLOSE_FLOW_REPLAY_DIALOG, closeMe);
		};
	});

	if (data != null) {
		return <ReplayDialog {...data} />;
	} else {
		return <React.Fragment />;
	}
};
