import { Button, Classes, FormGroup, InputGroup, Overlay } from '@blueprintjs/core';
import { remote } from 'electron';
import React from 'react';
import { getActiveWorkspace } from '../../active';
import UIContext from '../../common/context';
import { EventTypes } from '../../events';
import { Flow, Story } from '../../types';
import { loopCheck } from './utils';

const TheDialog = (props: { story: Story; flow: Flow }): JSX.Element => {
	const { story, flow } = props;
	const { emitter } = React.useContext(UIContext);
	const close = () => {
		emitter.emit(EventTypes.CLOSE_FLOW_SETTINGS_DIALOG, story, flow);
	};

	const asDependsString = (depends?: { story: string; flow: string }): string => {
		if (!depends) {
			return '';
		} else {
			const { story = '', flow = '' } = depends;
			return `${flow}@${story}`;
		}
	};
	const forceDepends = asDependsString((flow.settings || {}).forceDepends);

	const checkDependency = (
		value: string,
		type: string,
		ref: HTMLInputElement
	): { storyName?: string; flowName?: string; passed: boolean } => {
		if (value.trim().length === 0) {
			return { passed: true };
		}
		if (value === `${flow.name}@${story.name}`) {
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Invalid Input',
				message: `Cannot depend on myself.`
			});
			ref.focus();
			return { passed: false };
		}
		const names = value.split('@');
		if (names.length === 1) {
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Invalid Input',
				message: `Please, specify ${type} dependency with flow@story.`
			});
			ref.focus();
			return { passed: false };
		}
		const [flowName, storyName] = names;
		const workspace = getActiveWorkspace()!.getStructure();
		const found = workspace.stories.some(
			story => story.name === storyName && story.flows!.some(flow => flow.name === flowName)
		);
		if (found) {
			// loop check
			if (!loopCheck(workspace, storyName, flowName, story.name, flow.name)) {
				remote.dialog.showMessageBox(remote.getCurrentWindow(), {
					type: 'error',
					title: 'Invalid Input',
					message: `Loop dependency found, check settings please.`
				});
				ref.focus();
				return { passed: false };
			}

			return { storyName, flowName, passed: true };
		} else {
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Invalid Input',
				message: `Given flow@story not found.`
			});
			ref.focus();
			return { passed: false };
		}
	};

	let forceDependencyRef: HTMLInputElement | null;
	const onConfirmClicked = () => {
		const force = checkDependency(forceDependencyRef!.value, 'force', forceDependencyRef!);
		if (!force.passed) {
			return;
		}

		flow.settings = {
			forceDepends: (() => {
				if (force.storyName) {
					return { story: force.storyName, flow: force.flowName! };
				}
			})()
		};

		emitter.emit(EventTypes.ASK_SAVE_FLOW, story, flow);
		close();
	};
	const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
		if (e.key === 'Enter') {
			onConfirmClicked();
		}
	};

	return (
		<Overlay
			isOpen={true}
			onClose={close}
			className={`${Classes.OVERLAY_CONTAINER} small`}
			autoFocus={true}>
			<div className={`${Classes.CARD} ${Classes.ELEVATION_2}`}>
				<h3 className="bp3-heading">Flow settings</h3>
				<FormGroup label="Force Dependency (fill with flow@story)">
					<InputGroup
						fill={true}
						onKeyPress={handleKeyPress}
						inputRef={ref => (forceDependencyRef = ref)}
						defaultValue={forceDepends}
					/>
				</FormGroup>
				<div className="overlay-placeholder" />
				<div className={Classes.DIALOG_FOOTER_ACTIONS}>
					<Button onClick={close}>Cancel</Button>
					<Button onClick={onConfirmClicked} intent="primary">
						OK
					</Button>
				</div>
			</div>
		</Overlay>
	);
};

export default (): JSX.Element => {
	const { emitter } = React.useContext(UIContext);

	const [data, setData] = React.useState(null as null | { story: Story; flow: Flow });

	React.useEffect(() => {
		const openMe = (story: Story, flow: Flow): void => setData({ story, flow });
		const closeMe = (): void => setData(null);
		emitter
			.on(EventTypes.ASK_FLOW_SETTINGS, openMe)
			.on(EventTypes.CLOSE_FLOW_SETTINGS_DIALOG, closeMe);

		return () => {
			emitter
				.off(EventTypes.ASK_FLOW_SETTINGS, openMe)
				.off(EventTypes.CLOSE_FLOW_SETTINGS_DIALOG, closeMe);
		};
	});

	if (data != null) {
		return <TheDialog {...data} />;
	} else {
		return <React.Fragment />;
	}
};
