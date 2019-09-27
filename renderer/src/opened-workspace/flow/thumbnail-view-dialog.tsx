import { Button, Dialog, DialogActions, DialogContent, DialogTitle, makeStyles } from '@material-ui/core';
import React, { Fragment } from 'react';
import { getTheme } from '../../global-settings';

const myTheme = getTheme();
const useStyles = makeStyles(theme => ({
	root: {
		'&:hover::-webkit-scrollbar-thumb': {
			opacity: 1
		},
		'&::-webkit-scrollbar': {
			backgroundColor: 'transparent',
			width: 8
		},
		'&::-webkit-scrollbar-thumb': {
			backgroundColor: myTheme.textScrollBarThumbBackgroundColor
		}
	},
	image: {
		width: '100%'
	}
}));

export default (props: { open: boolean; image: string; close: () => void }): JSX.Element => {
	const { open, image, close } = props;
	const classes = useStyles({});

	if (!open) {
		return <Fragment />;
	}

	return (
		<Dialog open={open} onClose={() => close()} fullWidth={true} disableBackdropClick={true}>
			<DialogTitle>Thumbnail View</DialogTitle>
			<DialogContent className={classes.root}>
				<img src={image} alt="" className={classes.image} />
			</DialogContent>
			<DialogActions>
				<Button onClick={() => close()} variant="contained">
					Close
				</Button>
			</DialogActions>
		</Dialog>
	);
};
