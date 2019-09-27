import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	TextField
} from '@material-ui/core';
import { remote } from 'electron';
import React from 'react';
import { createStoryOnCurrentWorkspace, Story } from '../../workspace-settings';

export default (props: { opened: boolean; close: () => void; onCreated: (story: Story) => void }): JSX.Element => {
	const { opened, close, onCreated } = props;

	const storyNameRef = React.createRef();
	const onConfirmClicked = async () => {
		const nameInput = storyNameRef.current as HTMLInputElement;
		const name = nameInput.value.trim();
		if (name.length === 0) {
			remote.dialog
				.showMessageBox(remote.getCurrentWindow(), {
					type: 'error',
					title: 'Invalid Input',
					message: 'Please, specify story name.'
				})
				.finally(() => nameInput.focus());
			return;
		}

		try {
			const story = await createStoryOnCurrentWorkspace({ name });
			onCreated(story);
		} catch (e) {
			console.log(e);
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Invalid Input',
				message: `Failed to create story "${name}".`,
				detail: typeof e === 'string' ? e : e.message
			});
		}
	};

	const handleKeyPress = (e: any) => {
		if (e.key === 'Enter') {
			onConfirmClicked();
		}
	};

	return (
		<Dialog open={opened} onClose={() => close()} fullWidth={true} disableBackdropClick={true}>
			<DialogTitle>Story create</DialogTitle>
			<DialogContent>
				<DialogContentText>Please, specify story name.</DialogContentText>
				<TextField
					autoFocus
					margin="dense"
					label="Story name"
					fullWidth
					inputRef={storyNameRef}
					onKeyPress={handleKeyPress}
				/>
			</DialogContent>
			<DialogActions>
				<Button onClick={() => close()} variant="contained">
					Cancel
				</Button>
				<Button onClick={onConfirmClicked} color="primary" variant="contained">
					OK
				</Button>
			</DialogActions>
		</Dialog>
	);
};
