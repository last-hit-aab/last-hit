import { Button, Classes, FormGroup, InputGroup, Overlay } from '@blueprintjs/core';
import { remote } from 'electron';
import React from 'react';
import UIContext from '../../common/context';
import { EventTypes } from '../../events';
import { renameFlow } from '../../files';
import { Flow, Story } from '../../types';
import { isFlowsAllOnIdle } from './utils';

const TheDialog = (props: { story: Story; flow: Flow }): JSX.Element => {
	const { story, flow } = props;
	const { emitter } = React.useContext(UIContext);
	const close = () => {
		emitter.emit(EventTypes.CLOSE_FLOW_RENAME_DIALOG);
	};

	let flowNameInput: HTMLInputElement | null;
	const onConfirmClicked = async () => {
		const name = flowNameInput!.value.trim();
		if (name.length === 0) {
			remote.dialog
				.showMessageBox(remote.getCurrentWindow(), {
					type: 'error',
					title: 'Invalid Input',
					message: 'Please, specify new flow name.'
				})
				.finally(() => flowNameInput!.focus());
			return;
		}

		const canRename = await isFlowsAllOnIdle(emitter, [{ story, flow }]);
		if (!canRename) {
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Flows on operating.',
				message: `Cannot rename flow "${flow.name} @ ${story.name}" when some of flows under current flow are on operating, need to cancel operating manually first.`
			});
		} else {
			try {
				renameFlow(story, flow, name);
				emitter.emit(EventTypes.FLOW_RENAMED, story, flow);
				close();
			} catch (e) {
				console.error(e);
				remote.dialog.showMessageBox(remote.getCurrentWindow(), {
					type: 'error',
					title: 'Invalid Input',
					message: `Failed to rename flow "${flow.name}" to "${name}".`,
					detail: typeof e === 'string' ? e : e.message
				});
			}
		}
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
				<h3 className="bp3-heading">Flow rename</h3>
				<FormGroup
					label={`Please, specify new flow name instead of "${flow.name} @ ${story.name}".`}>
					<InputGroup
						fill={true}
						onKeyPress={handleKeyPress}
						inputRef={ref => (flowNameInput = ref)}
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

	const [flow, setFlow] = React.useState(null as null | { story: Story; flow: Flow });
	React.useEffect(() => {
		const openMe = (story: Story, flow: Flow): void => setFlow({ story, flow });
		const closeMe = (): void => setFlow(null);
		emitter
			.on(EventTypes.ASK_RENAME_FLOW, openMe)
			.on(EventTypes.CLOSE_FLOW_RENAME_DIALOG, closeMe);

		return () => {
			emitter
				.off(EventTypes.ASK_RENAME_FLOW, openMe)
				.off(EventTypes.CLOSE_FLOW_RENAME_DIALOG, closeMe);
		};
	});

	if (flow != null) {
		return <TheDialog {...flow} />;
	} else {
		return <React.Fragment />;
	}
};
