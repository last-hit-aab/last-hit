import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	MenuItem,
	TextField
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { ipcRenderer, remote } from 'electron';
import React from 'react';
import devices from '../../common/device-descriptors';
import { generateKeyByObject } from '../../common/flow-utils';
import { getTheme } from '../../global-settings';
import { Flow, saveFlow, StartStep, StepType, Story } from '../../workspace-settings';
import uuidv4 from 'uuid/v4';

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
	close: (onRecord: boolean) => void;
}): JSX.Element => {
	const { open, story, flow, close } = props;
	const { steps } = flow;
	const classes = useStyles();

	let url = '';
	let device = null;
	if (steps && steps.length > 0) {
		const startStep: StartStep = steps[0] as StartStep;
		url = startStep.url;
		if (!url.startsWith('http')) {
			url = '';
		} else {
			device = startStep.device.name;
		}
	}
	const [values, setValues] = React.useState({ url, device });
	const handleChange = (name: string) => (evt: any): void => {
		setValues({ ...values, [name]: evt.target.value });
	};
	const onConfirmClicked = (): void => {
		const { url, device } = values;
		if (!url || url.trim().length === 0) {
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Invalid Input',
				message: 'Please, specify start url.'
			});
			return;
		}
		if (device == null) {
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Invalid Input',
				message: 'Please, specify device.'
			});
			return;
		}

		const options = {
			url,
			device: devices.find(d => d.name === values.device),
			uuid: uuidv4()
		};
		ipcRenderer.send('launch-puppeteer', { ...options, flowKey: generateKeyByObject(story, flow) });
		flow.steps = [{ type: StepType.START, ...options }];
		saveFlow(story, flow);
		close(true);
	};

	return (
		<Dialog open={open} onClose={() => close(false)} fullWidth={true} disableBackdropClick={true}>
			<DialogTitle>Start record</DialogTitle>
			<DialogContent>
				<DialogContentText>
					Please, specify parameters for start record {flow && flow.name}@{story && story.name}.
				</DialogContentText>
				<TextField
					autoFocus
					margin="dense"
					label="Start Url"
					fullWidth
					required
					placeholder="https://"
					value={values.url}
					onChange={handleChange('url')}
				/>
				<TextField
					select
					margin="dense"
					label="Device"
					fullWidth
					required
					value={values.device}
					onChange={handleChange('device')}
					className={classes.select}
					SelectProps={{ MenuProps: { PaperProps: { className: classes.selectPopupMenu } } }}
				>
					{devices
						.sort((a, b) => a.name.localeCompare(b.name))
						.map(device => {
							return (
								<MenuItem key={device.name} value={device.name} dense>
									{device.name}
								</MenuItem>
							);
						})}
				</TextField>
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
