import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@material-ui/core';
import React from 'react';
import { generateKeyByObject } from '../../common/flow-utils';
import { Flow, Story } from '../../workspace-settings';

export default (props: {
	open: boolean;
	story: Story;
	flow: Flow;
	close: (onReplay: boolean) => void;
}): JSX.Element => {
	const { open, story, flow, close } = props;
	const onConfirmClicked = (): void => close(true);

	return (
		<Dialog open={open} onClose={() => close(false)} fullWidth={true} disableBackdropClick={true}>
			<DialogTitle>Start replay</DialogTitle>
			<DialogContent>
				<DialogContentText>Do you want to start replay {generateKeyByObject(story, flow)}?</DialogContentText>
			</DialogContent>
			<DialogActions>
				<Button onClick={() => close(false)} variant="contained">
					Cancel
				</Button>
				<Button onClick={onConfirmClicked} color="primary" variant="contained">
					OK
				</Button>
			</DialogActions>
		</Dialog>
	);
};
