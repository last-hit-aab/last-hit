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
import { Flow, renameFlow, Story } from '../../workspace-settings';

export default (props: {
	renamingStory: Story | null;
	renamingFlow: Flow | null;
	close: () => void;
	onRenamed: (story: Story, flow: Flow) => void;
}): JSX.Element => {
	const { renamingStory, renamingFlow, close, onRenamed } = props;

	const flowNameRef = React.createRef();
	const onConfirmClicked = async () => {
		const nameInput = flowNameRef.current as HTMLInputElement;
		const name = nameInput.value.trim();
		if (name.length === 0) {
			remote.dialog
				.showMessageBox(remote.getCurrentWindow(), {
					type: 'error',
					title: 'Invalid Input',
					message: 'Please, specify new flow name.'
				})
				.finally(() => nameInput.focus());
			return;
		}

		try {
			console.log(renamingFlow!.name);
			const renamedFlow = await renameFlow(renamingStory!, renamingFlow!, name);
			console.log(renamedFlow.name);
			
			onRenamed(renamingStory!, renamedFlow);
		} catch (e) {
			console.log(e);
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Invalid Input',
				message: `Failed to rename flow to "${name}".`,
				detail: typeof e === 'string' ? e : e.message
			});
		}
	};

	return (
		<Dialog
			open={renamingStory != null && renamingFlow != null}
			onClose={() => close()}
			fullWidth={true}
			disableBackdropClick={true}
		>
			<DialogTitle>Flow rename</DialogTitle>
			<DialogContent>
				<DialogContentText>
					Please, specify new flow name instead of "{renamingFlow && renamingFlow.name} @{' '}
					{renamingStory && renamingStory.name}".
				</DialogContentText>
				<TextField autoFocus margin="dense" label="New flow name" fullWidth inputRef={flowNameRef} />
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
