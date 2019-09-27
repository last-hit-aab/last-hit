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
import { createFlowOnCurrentWorkspace, Flow, Story } from '../../workspace-settings';

export default (props: {
	story: Story | null;
	close: () => void;
	onCreated: (story: Story, flow: Flow) => void;
}): JSX.Element => {
	const { story, close, onCreated } = props;

	const flowNameRef = React.createRef();

	const onConfirmClicked = async () => {
		const nameInput = flowNameRef.current as HTMLInputElement;
		const name = nameInput.value.trim();
		if (name.length === 0) {
			remote.dialog
				.showMessageBox(remote.getCurrentWindow(), {
					type: 'error',
					title: 'Invalid Input',
					message: 'Please, specify flow name.'
				})
				.finally(() => nameInput.focus());
			return;
		}

		try {
			const flow = await createFlowOnCurrentWorkspace(story!, { name });
			onCreated(story!, flow);
		} catch (e) {
			console.log(e);
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Invalid Input',
				message: `Failed to create flow "${name}".`,
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
		<Dialog open={story != null} onClose={() => close()} fullWidth={true} disableBackdropClick={true}>
			<DialogTitle>Flow create</DialogTitle>
			<DialogContent>
				<DialogContentText>Please, specify flow name, on story {story && story.name}.</DialogContentText>
				<TextField
					autoFocus
					margin="dense"
					label="Flow name"
					fullWidth
					inputRef={flowNameRef}
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
