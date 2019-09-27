import { faFolderOpen } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Button from '@material-ui/core/Button';
import FormControl from '@material-ui/core/FormControl';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import Input from '@material-ui/core/Input';
import InputAdornment from '@material-ui/core/InputAdornment';
import InputLabel from '@material-ui/core/InputLabel';
import { makeStyles } from '@material-ui/core/styles';
import { remote } from 'electron';
import fs from 'fs';
import path from 'path';
import React from 'react';
import history from '../common/history';
import paths from '../paths';
import { createWorkspace } from '../workspace-settings';

const useStyles = makeStyles(theme => ({
	root: {
		height: `calc(100vh - ${theme.spacing(4)}px)`,
		width: `calc(100vw - ${theme.spacing(4)}px)`,
		margin: theme.spacing(2),
		'& > div': {
			width: '100%'
		}
	},
	inputEndButton: {
		fontSize: '1rem'
	},
	placeholder: {
		flexGrow: 1
	},
	buttonBar: {
		textAlign: 'right'
	},
	button: {
		margin: theme.spacing(1),
		'&:first-child': {
			marginLeft: 0
		},
		'&:last-child': {
			marginRight: 0
		}
	}
}));

export default (): JSX.Element => {
	const classes = useStyles();
	const [values, setValues] = React.useState({
		name: '',
		location: ''
	});
	const handleChange = (prop: string) => (event: any) => {
		setValues({ ...values, [prop]: event.target.value });
	};
	const onLocationSelected = async () => {
		const ret = await remote.dialog.showOpenDialog({
			title: 'Workspace location selection',
			properties: ['openDirectory', 'createDirectory', 'promptToCreate', 'showHiddenFiles']
		});
		if (!(ret as any).canceled) {
			const path = ret.filePaths![0];
			setValues({ ...values, location: path });
		}
	};
	const trimValues = () =>
		Object.keys(values).reduce((all: any, key) => {
			all[key] = (values as any)[key].trim();
			return all;
		}, {});
	const validateData = async () => {
		// trim property values
		const { name, location } = trimValues();
		if (name.length === 0) {
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Invalid Input',
				message: 'Please, specify workspace name.'
			});
			return Promise.reject();
		}
		if (location.length === 0) {
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Invalid Input',
				message: 'Please, specify workspace location.'
			});
			return Promise.reject();
		}
		if (!path.isAbsolute(location)) {
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Invalid Input',
				message: 'Please, specify an absolute workspace location.'
			});
			return Promise.reject();
		}
		if (fs.existsSync(location) && fs.readdirSync(location).length !== 0) {
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Invalid Input',
				message: 'Please, specify an empty workspace location.'
			});
			return Promise.reject();
		}
		return Promise.resolve();
	};
	const onCancelClicked = () => {
		history.replace(paths.SPLASH);
	};
	const onFinishClicked = async () => {
		try {
			await validateData();
		} catch {
			return;
		}
		const { name, location } = trimValues();
		try {
			createWorkspace(location, name, { name });
		} catch (e) {
			console.error(e);
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Failure',
				message: `Failed to create workspace at "${location}".`
			});
		}
	};

	return (
		<Grid container className={classes.root} spacing={1} direction="column">
			<Grid item>
				<FormControl fullWidth>
					<InputLabel htmlFor="workspace-name" required>
						Workspace name
					</InputLabel>
					<Input onChange={handleChange('name')} value={values.name} id="workspace-name" />
				</FormControl>
			</Grid>
			<Grid item>
				<FormControl fullWidth>
					<InputLabel htmlFor="workspace-location" required>
						Workspace location
					</InputLabel>
					<Input
						onChange={handleChange('location')}
						value={values.location}
						id="workspace-location"
						endAdornment={
							<InputAdornment position="end">
								<IconButton className={classes.inputEndButton} onClick={onLocationSelected}>
									<FontAwesomeIcon icon={faFolderOpen} />
								</IconButton>
							</InputAdornment>
						}
					/>
				</FormControl>
			</Grid>
			<Grid item className={classes.placeholder} />
			<Grid item className={classes.buttonBar} container justify="space-between">
				<Button variant="contained" className={classes.button} onClick={onCancelClicked}>
					Cancel
				</Button>
				<Button variant="contained" color="primary" className={classes.button} onClick={onFinishClicked}>
					Finish
				</Button>
			</Grid>
		</Grid>
	);
};
