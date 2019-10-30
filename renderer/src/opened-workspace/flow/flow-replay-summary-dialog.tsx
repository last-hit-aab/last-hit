import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	makeStyles,
	TextField,
	Grid
} from '@material-ui/core';
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
	summary: {
		display: 'grid',
		gridTemplateColumns: '50% 50%'
	},
	error: {
		gridColumn: 'span 2'
	}
}));

export default (props: { data: { summary: any | null; error: string | null }; close: () => void }): JSX.Element => {
	const { data, close } = props;
	const classes = useStyles({});

	if (!data || !data.summary) {
		return <Fragment />;
	}

	const title = `Replay Summary, ${data.error ? 'Failed' : 'Done'}`;
	let errorDisplay;
	if (data.error) {
		errorDisplay = (
			<TextField
				id="standard-read-only-input"
				label="Error"
				defaultValue={data.error}
				className={classes.error}
				margin="dense"
				InputProps={{
					readOnly: true
				}}
			/>
		);
	}

	return (
		<Dialog open={true} onClose={() => close()} fullWidth={true} disableBackdropClick={true}>
			<DialogTitle>{title}</DialogTitle>
			<DialogContent className={classes.root}>
				<Grid container className={classes.summary}>
					{errorDisplay}
				</Grid>
			</DialogContent>
			<DialogActions>
				<Button onClick={() => close()} variant="contained">
					Close
				</Button>
			</DialogActions>
		</Dialog>
	);
};
