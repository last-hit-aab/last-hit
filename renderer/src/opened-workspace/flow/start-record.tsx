import {
	Button,
	Checkbox,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	FormControlLabel,
	MenuItem,
	TextField
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { remote } from 'electron';
import React from 'react';
import uuidv4 from 'uuid/v4';
import devices from '../../common/device-descriptors';
import { getTheme } from '../../global-settings';
import { Device, Flow, saveFlow, StartStep, StepType, Story } from '../../workspace-settings';

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
	close: (onRecord: boolean, options?: { url: string; device: Device; uuid: string }) => void;
}): JSX.Element => {
	const { open, story, flow, close } = props;
	const { steps } = flow;
	const classes = useStyles();

	let url = '';
	let device = null;
	let wechat = false;
	if (steps && steps.length > 0) {
		const startStep: StartStep = steps[0] as StartStep;
		url = startStep.url;
		device = (startStep.device || {}).name;
		wechat = startStep.device.wechat || false;
	}
	const [values, setValues] = React.useState({ url, device, wechat });
	const handleChange = (name: string) => (evt: any): void => {
		setValues({ ...values, [name]: evt.target.value });
	};
	const handleCheckBoxChange = (name: string) => (evt: any): void => {
		setValues({ ...values, [name]: evt.target.checked });
	};
	const hasForceDependency = (): boolean => {
		return (flow.settings || {}).forceDepends != null;
	};
	const onConfirmClicked = (): void => {
		const { url, device } = values;
		if (!hasForceDependency()) {
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
		}

		const options = {
			url,
			device: (() => {
				const device = devices.find(d => d.name === values.device)!;
				if (values.wechat) {
					device.userAgent += ' MicroMessenger/6.5.7';
				}
				device.wechat = true;
				return device;
			})(),
			uuid: uuidv4()
		};
		flow.steps = [{ type: StepType.START, stepIndex: 0, stepUuid: uuidv4(), ...options }];
		saveFlow(story, flow);
		close(true, options);
	};

	const createDependency = (): JSX.Element => {
		return (
			<DialogContentText>
				Force dependency defind, run replayer first and switch to record when force dependency finished.
			</DialogContentText>
		);
	};
	const createNoDependency = (): JSX.Element => (
		<React.Fragment>
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
			<FormControlLabel
				control={<Checkbox checked={values.wechat} onChange={handleCheckBoxChange('wechat')} color="primary" />}
				label="Wechat"
			/>
		</React.Fragment>
	);
	return (
		<Dialog open={open} onClose={() => close(false)} fullWidth={true} disableBackdropClick={true}>
			<DialogTitle>Start record</DialogTitle>
			<DialogContent>{hasForceDependency() ? createDependency() : createNoDependency()}</DialogContent>
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
