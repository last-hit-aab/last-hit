import React from 'react';
import styled from 'styled-components';
import UIContext from '../../common/context';
import { EventTypes } from '../../events';
import { Flow, FlowUIStatusEnum, StartStep, Step, StepType, Story } from '../../types';
import EditPanelActionBar from './edit-panel-action-bar';
import EditPanelDetailPanel from './edit-panel-detail-panel';
import EditPanelNavigator from './edit-panel-navigator';

const Container = styled.div`
	height: 100%;
	display: grid;
	grid-template-rows: auto 1fr;
	grid-template-columns: 300px 1fr;
`;

export default (props: { story: Story; flow: Flow }): JSX.Element => {
	const { story, flow } = props;

	const { emitter } = React.useContext(UIContext);
	// force render
	const [ignored, forceUpdate] = React.useReducer(x => x + 1, 0);

	React.useEffect(() => {
		const onFlowStatusCheck = (theStory: Story, theFlow: Flow): void => {
			if (story === theStory && flow === theFlow) {
				emitter.emit(EventTypes.FLOW_STATUS_CHECK_RESULT, story, flow, flowStatus);
			}
		};
		const onAskFlowReplay = (theStory: Story, theFlow: Flow, stepping: boolean): void => {
			if (story === theStory && flow === theFlow) {
				setFlowStatus(FlowUIStatusEnum.ON_REPLAY);
			}
		};
		const onFlowReplayDialogClose = (theStory: Story, theFlow: Flow): void => {
			if (story === theStory && flow === theFlow) {
				setFlowStatus(FlowUIStatusEnum.IDLE);
			}
		};
		const onAskFlowRecord = (theStory: Story, theFlow: Flow): void => {
			if (story === theStory && flow === theFlow) {
				setFlowStatus(FlowUIStatusEnum.ON_RECORD);
			}
		};
		const onFlowRecordDialogClose = (theStory: Story, theFlow: Flow): void => {
			if (story === theStory && flow === theFlow) {
				setFlowStatus(FlowUIStatusEnum.IDLE);
			}
			forceUpdate(ignored);
		};
		const onStepSelected = (story: Story, flow: Flow, step: Step): void =>
			setEditStep({ step });

		emitter
			.on(EventTypes.FLOW_STATUS_CHECK, onFlowStatusCheck)
			.on(EventTypes.ASK_FLOW_REPLAY, onAskFlowReplay)
			.on(EventTypes.CLOSE_FLOW_REPLAY_DIALOG, onFlowReplayDialogClose)
			.on(EventTypes.ASK_FLOW_RECORD, onAskFlowRecord)
			.on(EventTypes.CLOSE_FLOW_RECORD_DIALOG, onFlowRecordDialogClose)
			.on(EventTypes.STEP_SELECTED, onStepSelected);
		return () => {
			emitter
				.off(EventTypes.FLOW_STATUS_CHECK, onFlowStatusCheck)
				.off(EventTypes.ASK_FLOW_REPLAY, onAskFlowReplay)
				.off(EventTypes.CLOSE_FLOW_REPLAY_DIALOG, onFlowReplayDialogClose)
				.off(EventTypes.ASK_FLOW_RECORD, onAskFlowRecord)
				.off(EventTypes.CLOSE_FLOW_RECORD_DIALOG, onFlowRecordDialogClose)
				.off(EventTypes.STEP_SELECTED, onStepSelected);
		};
	});

	const steps = flow.steps;
	if (!steps || steps.length === 0) {
		flow.steps = [{ type: StepType.START } as StartStep];
	}
	const [editStep, setEditStep] = React.useState({ step: flow.steps![0] });
	const [flowStatus, setFlowStatus] = React.useState(FlowUIStatusEnum.IDLE);

	return (
		<Container>
			<EditPanelActionBar story={story} flow={flow} />
			<EditPanelNavigator story={story} flow={flow} />
			<EditPanelDetailPanel story={story} flow={flow} step={editStep.step} />
		</Container>
	);
};
