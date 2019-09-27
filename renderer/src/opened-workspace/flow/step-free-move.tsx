import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	makeStyles,
	MenuItem,
	TextField
} from '@material-ui/core';
import { remote } from 'electron';
import React, { Fragment } from 'react';
import { getTheme } from '../../global-settings';
import { Flow, saveFlow, Step, StepType, Story } from '../../workspace-settings';
import { getStepFork } from './step-definition';

const myTheme = getTheme();
const useStyles = makeStyles(theme => ({
	select: {
		'& .MuiSelect-select:focus': {
			backgroundColor: 'transparent'
		}
	},
	selectPopupMenu: {
		width: 300,
		'&:hover::-webkit-scrollbar-thumb': {
			opacity: 1
		},
		'&::-webkit-scrollbar': {
			backgroundColor: 'transparent',
			width: 8
		},
		'&::-webkit-scrollbar-thumb': {
			backgroundColor: myTheme.outlineScrollBarThumbBackgroundColor
		},
		'& > ul > li': {
			height: theme.spacing(3),
			fontSize: '0.7rem',
			opacity: myTheme.opacityForFontColor
		}
	}
}));

export default (props: {
	open: boolean;
	story: Story;
	flow: Flow;
	step: Step | null;
	close: () => void;
}): JSX.Element => {
	const { open, story, flow, step, close } = props;
	const classes = useStyles({});

	const [values, setValues] = React.useState({
		position: 'before',
		stepIndex: -1
	});
	if (!open) {
		return <Fragment />;
	}

	const handlePositionChange = (event: any): void => {
		setValues({ ...values, position: event.target.value });
	};
	const handleStepChange = (event: any): void => {
		setValues({ ...values, stepIndex: event.target.value });
	};
	const onCloseClicked = (): void => {
		setValues({ position: 'before', stepIndex: -1 });
		close();
	};
	const onConfirmClicked = (): void => {
		if (values.stepIndex === -1) {
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Invalid input',
				message: 'Please, specify the step which you want to move to.'
			});
			return;
		}

		const { stepIndex, position } = values;
		const index = flow.steps!.indexOf(step!);
		flow.steps!.splice(index, 1);
		if (index > stepIndex) {
			// move step will not impact the move to index
			switch (position) {
				case 'before':
					flow.steps!.splice(stepIndex, 0, step!);
					break;
				case 'after':
					flow.steps!.splice(stepIndex + 1, 0, step!);
					break;
			}
		} else {
			// move to index needs to be minus 1, since step is removed
			switch (position) {
				case 'before':
					flow.steps!.splice(stepIndex - 1, 0, step!);
					break;
				case 'after':
					flow.steps!.splice(stepIndex - 1 + 1, 0, step!);
					break;
			}
		}
		onCloseClicked();
		saveFlow(story, flow);
	};

	return (
		<Dialog open={open} onClose={onCloseClicked} fullWidth={true} disableBackdropClick={true}>
			<DialogTitle>Step Free Move</DialogTitle>
			<DialogContent>
				<DialogContentText>Please, specify where step should be moved.</DialogContentText>
				<TextField
					autoFocus
					select
					label="Move To"
					margin="dense"
					fullWidth
					required
					value={values.stepIndex}
					onChange={handleStepChange}
					className={classes.select}
					SelectProps={{ MenuProps: { PaperProps: { className: classes.selectPopupMenu } } }}
				>
					{flow
						.steps!.map((s, index) => {
							if (s.type === StepType.START || s.type === StepType.END || s === step) {
								return null;
							}
							return (
								<MenuItem key={index} value={index} dense>
									{s.human || getStepFork(s).label(s as any)}
								</MenuItem>
							);
						})
						.filter(item => item != null)}
				</TextField>
				<TextField
					select
					label="On"
					margin="dense"
					fullWidth
					required
					value={values.position}
					onChange={handlePositionChange}
					className={classes.select}
					SelectProps={{ MenuProps: { PaperProps: { className: classes.selectPopupMenu } } }}
				>
					<MenuItem value="before" dense>
						Before
					</MenuItem>
					<MenuItem value="after" dense>
						After
					</MenuItem>
				</TextField>
			</DialogContent>
			<DialogActions>
				<Button onClick={onCloseClicked} variant="contained">
					Cancel
				</Button>
				<Button onClick={onConfirmClicked} color="primary" variant="contained">
					OK
				</Button>
			</DialogActions>
		</Dialog>
	);
};
