import { Button, ButtonGroup } from '@blueprintjs/core';
import { remote } from 'electron';
import { Flow, StartStep, Story } from 'last-hit-types';
import React from 'react';
import styled from 'styled-components';
import UIContext from '../../common/context';
import { EventTypes } from '../../events';

const Container = styled.div`
	display: flex;
`;
const Placeholder = styled.div`
	flex-grow: 1;
`;

export default (props: { story: Story; flow: Flow }): JSX.Element => {
	const { story, flow } = props;
	const { emitter } = React.useContext(UIContext);

	const onFlowSettingsClicked = (): void => {
		emitter.emit(EventTypes.ASK_FLOW_SETTINGS, story, flow);
	};
	const onFlowRecordClicked = (): void => {
		if (flow.settings && flow.settings.forceDepends) {
			// start replay force dependencies first
			emitter.emit(EventTypes.ASK_FLOW_REPLAY, story, flow, false, true);
		} else {
			// start replay directly
			const steps = flow.steps;
			if (!steps || steps.length === 0 || !(steps[0] as StartStep).url) {
				remote.dialog.showMessageBox(remote.getCurrentWindow(), {
					type: 'error',
					title: 'Invalid Input',
					message: 'Please, specify start url.'
				});
				return;
			}
			emitter.emit(EventTypes.ASK_FLOW_RECORD, story, flow, false);
		}
	};
	const onFlowReplayClicked = (): void => {
		emitter.emit(EventTypes.ASK_FLOW_REPLAY, story, flow, false, false);
	};
	const onFlowSteppingReplayClicked = (): void => {
		emitter.emit(EventTypes.ASK_FLOW_REPLAY, story, flow, true, false);
	};
	const onReloadClicked = (): void => {
		emitter.emit(EventTypes.ASK_FLOW_RELOAD, story, flow);
	};

	return (
		<Container>
			<ButtonGroup minimal={true}>
				<Button icon="cog" title="Flow settings" onClick={onFlowSettingsClicked} />
				<Button icon="refresh" title="Reload from file" onClick={onReloadClicked} />
			</ButtonGroup>
			<Placeholder />
			<ButtonGroup minimal={true}>
				<Button
					icon="record"
					title="Start record"
					intent="danger"
					onClick={onFlowRecordClicked}
				/>
				<Button
					icon="play"
					title="Start replay"
					intent="primary"
					onClick={onFlowReplayClicked}
				/>
				<Button
					icon="step-forward"
					title="Start replay, step by step"
					intent="primary"
					onClick={onFlowSteppingReplayClicked}
				/>
			</ButtonGroup>
		</Container>
	);
};
