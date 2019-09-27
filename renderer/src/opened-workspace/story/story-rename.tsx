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
import { renameStory, Story } from '../../workspace-settings';

export default (props: {
	renamingStory: Story | null;
	close: () => void;
	onRenamed: (story: Story) => void;
}): JSX.Element => {
	const { renamingStory, close, onRenamed } = props;

	const storyNameRef = React.createRef();
	const onConfirmClicked = async () => {
		const nameInput = storyNameRef.current as HTMLInputElement;
		const name = nameInput.value.trim();
		if (name.length === 0) {
			remote.dialog
				.showMessageBox(remote.getCurrentWindow(), {
					type: 'error',
					title: 'Invalid Input',
					message: 'Please, specify new story name.'
				})
				.finally(() => nameInput.focus());
			return;
		}

		try {
			const renamedStory = await renameStory(renamingStory!, name);

			onRenamed(renamedStory);
		} catch (e) {
			console.log(e);
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Invalid Input',
				message: `Failed to rename story to "${name}".`,
				detail: typeof e === 'string' ? e : e.message
			});
		}
	};

	return (
		<Dialog open={renamingStory != null} onClose={() => close()} fullWidth={true} disableBackdropClick={true}>
			<DialogTitle>Story rename</DialogTitle>
			<DialogContent>
				<DialogContentText>
					Please, specify new story name instead of "{renamingStory && renamingStory.name}".
				</DialogContentText>
				<TextField autoFocus margin="dense" label="New story name" fullWidth inputRef={storyNameRef} />
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
