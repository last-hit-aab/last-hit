import { Button, Classes, FormGroup, InputGroup, Overlay } from '@blueprintjs/core';
import { remote } from 'electron';
import React from 'react';
import UIContext from '../../common/context';
import { EventTypes } from '../../events';
import { createStory } from '../../files';

const TheDialog = (): JSX.Element => {
	const { emitter } = React.useContext(UIContext);
	const close = () => {
		emitter.emit(EventTypes.CLOSE_STORY_CREATE_DIALOG);
	};

	let storyNameInput: HTMLInputElement | null;
	const onConfirmClicked = async () => {
		const name = storyNameInput!.value.trim();
		if (name.length === 0) {
			remote.dialog
				.showMessageBox(remote.getCurrentWindow(), {
					type: 'error',
					title: 'Invalid Input',
					message: 'Please, specify story name.'
				})
				.finally(() => storyNameInput!.focus());
			return;
		}

		try {
			const story = await createStory({ name });
			emitter.emit(EventTypes.STORY_CREATED, story);
			close();
		} catch (e) {
			console.error(e);
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Invalid Input',
				message: `Failed to create story "${name}".`,
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
				<h3 className="bp3-heading">Story create</h3>
				<FormGroup label="Please, specify story name.">
					<InputGroup
						fill={true}
						onKeyPress={handleKeyPress}
						inputRef={ref => (storyNameInput = ref)}
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

	const [opened, setOpened] = React.useState(false);
	React.useEffect(() => {
		const openMe = (): void => setOpened(true);
		const closeMe = (): void => setOpened(false);
		emitter
			.on(EventTypes.ASK_CREATE_STORY, openMe)
			.on(EventTypes.CLOSE_STORY_CREATE_DIALOG, closeMe);

		return () => {
			emitter
				.off(EventTypes.ASK_CREATE_STORY, openMe)
				.off(EventTypes.CLOSE_STORY_CREATE_DIALOG, closeMe);
		};
	});

	if (opened) {
		return <TheDialog />;
	} else {
		return <React.Fragment />;
	}
};
