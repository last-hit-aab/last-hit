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
		gridTemplateColumns: 'auto auto auto auto auto',
		gridColumnGap: theme.spacing(2)
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

	const summary = data.summary;

	return (
		<Dialog open={true} onClose={() => close()} fullWidth={true} disableBackdropClick={true} maxWidth="lg">
			<DialogTitle>{title}</DialogTitle>
			<DialogContent className={classes.root}>
				<Grid container className={classes.summary}>
					{errorDisplay}
					<TextField
						label="Step Count"
						defaultValue={summary.numberOfStep}
						margin="dense"
						InputProps={{
							readOnly: true
						}}
					/>
					<TextField
						label="Total Passed Step Count"
						defaultValue={summary.numberOfUIBehavior}
						margin="dense"
						InputProps={{
							readOnly: true
						}}
					/>
					<TextField
						label="Passed UI Step Count"
						defaultValue={summary.numberOfUIBehavior}
						margin="dense"
						InputProps={{
							readOnly: true
						}}
					/>
					<TextField
						label="Ajax Count"
						defaultValue={summary.numberOfAjax}
						margin="dense"
						InputProps={{
							readOnly: true
						}}
					/>
					<TextField
						label="Slow Ajax Count"
						defaultValue={(summary.slowAjaxRequest || []).length}
						margin="dense"
						InputProps={{
							readOnly: true
						}}
					/>
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
