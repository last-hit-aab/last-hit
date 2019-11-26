import { Button, Classes, FormGroup, InputGroup, Overlay } from '@blueprintjs/core';
import { remote } from 'electron';
import React from 'react';
import UIContext from '../../common/context';
import { EventTypes } from '../../events';
import { createFlow } from '../../files';
import { Story } from '../../types';

const TheDialog = (props: { story: Story }): JSX.Element => {
	const { story } = props;
	const { emitter } = React.useContext(UIContext);
	const close = () => {
		emitter.emit(EventTypes.CLOSE_FLOW_CREATE_DIALOG);
	};

	let flowNameInput: HTMLInputElement | null;
	const onConfirmClicked = async () => {
		const name = flowNameInput!.value.trim();
		if (name.length === 0) {
			remote.dialog
				.showMessageBox(remote.getCurrentWindow(), {
					type: 'error',
					title: 'Invalid Input',
					message: 'Please, specify story name.'
				})
				.finally(() => flowNameInput!.focus());
			return;
		}

		try {
			const flow = await createFlow(story, { name });
			emitter.emit(EventTypes.FLOW_CREATED, story, flow);
			close();
		} catch (e) {
			console.error(e);
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Invalid Input',
				message: `Failed to create flow "${name}".`,
				detail: typeof e === 'string' ? e : e.message
			});
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
				<h3 className="bp3-heading">Flow create</h3>
				<FormGroup label={`Please, specify flow name, on story "${story.name}".`}>
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

	const [story, setStory] = React.useState(null as Story | null);
	React.useEffect(() => {
		const openMe = (story: Story): void => setStory(story);
		const closeMe = (): void => setStory(null);
		emitter
			.on(EventTypes.ASK_CREATE_FLOW, openMe)
			.on(EventTypes.CLOSE_FLOW_CREATE_DIALOG, closeMe);

		return () => {
			emitter
				.off(EventTypes.ASK_CREATE_FLOW, openMe)
				.off(EventTypes.CLOSE_FLOW_CREATE_DIALOG, closeMe);
		};
	});

	if (story != null) {
		return <TheDialog story={story} />;
	} else {
		return <React.Fragment />;
	}
};
