import { Button, ButtonGroup } from '@blueprintjs/core';
import { remote } from 'electron';
import { Flow, Step, Story } from 'last-hit-types';
import React from 'react';
import styled from 'styled-components';
import UIContext from '../../common/context';
import IDESettings from '../../common/ide-settings';
import { EventTypes } from '../../events';

const {
	padding: { body },
	gap
} = IDESettings.getStyles();

const Container = styled.div`
	display: flex;
	padding: ${() => `${body}px`};
	> .bp3-button-group + .bp3-button-group {
		margin-left: ${() => `${gap}px`};
	}
`;
const Placeholder = styled.div`
	flex-grow: 1;
`;

export default (props: { story: Story; flow: Flow; step: Step }): JSX.Element => {
	const { story, flow, step } = props;
	const { emitter } = React.useContext(UIContext);

	// force render
	const [ignored, forceUpdate] = React.useReducer(x => x + 1, 0);

	// const stepIndex = flow.steps!.indexOf(step);
	// const stepCount = flow.steps!.length;

	// const canFreeMove = stepIndex !== 0 && stepIndex !== stepCount - 1;
	const canAsBreakpoint = !['start', 'end'].includes(step.type);
	const isBreakpoint = !!step.breakpoint;
	const canDelete = !['start', 'end'].includes(step.type);

	const onDeleteClicked = (): void => {
		// do not modify flow, just send event
		emitter.emit(EventTypes.STEP_DELETED, story, flow, step);
	};
	const onBreakpointClicked = (): void => {
		step.breakpoint = !isBreakpoint;
		emitter.emit(EventTypes.STEP_BREAKPOINT_CHANGED, story, flow, step);
		forceUpdate(ignored);
	};
	const onScreenshotClicked = (): void => {
		emitter.emit(EventTypes.ASK_SHOW_THUMBNAIL, story, flow, step);
	};
	const onScriptsClicked = (): void => {
		remote.dialog.showMessageBox(remote.getCurrentWindow(), {
			type: 'info',
			title: 'Coming soon',
			message: `Coming soon.`
		});
	};

	const deleteButton = canDelete ? (
		<Button icon="delete" text="Delete" intent="danger" onClick={onDeleteClicked} />
	) : null;
	const screenshotButton = step.image ? (
		<Button icon="media" text="Screenshot" intent="primary" onClick={onScreenshotClicked} />
	) : null;

	return (
		<Container>
			<ButtonGroup>{deleteButton}</ButtonGroup>
			<Placeholder />
			<ButtonGroup>
				<Button
					icon="merge-links"
					text={isBreakpoint ? 'Remove breakpoint' : 'Set as breakpoint'}
					disabled={!canAsBreakpoint}
					intent={isBreakpoint ? 'danger' : 'primary'}
					onClick={onBreakpointClicked}
				/>
				{screenshotButton}
			</ButtonGroup>
			<ButtonGroup>
				<Button icon="code" text="Scripts" intent="warning" onClick={onScriptsClicked} />
			</ButtonGroup>
		</Container>
	);
};
