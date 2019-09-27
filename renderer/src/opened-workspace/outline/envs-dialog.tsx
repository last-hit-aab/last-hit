import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Grid,
	makeStyles,
	Tab,
	Tabs,
	TextField
} from '@material-ui/core';
import { remote } from 'electron';
import React, { Fragment } from 'react';
import { ExecuteEnv, getCurrentWorkspace, saveCurrentWorkspace } from '../../workspace-settings';

const useStyles = makeStyles(theme => ({
	dialogContent: {
		overflowY: 'hidden',
		'& > div': {
			flexGrow: 1,
			display: 'flex',
			flexDirection: 'column'
		}
	},
	tabs: {
		minHeight: 'unset',
		height: theme.spacing(4),
		'& .MuiTabs-flexContainer > button': {
			minWidth: theme.spacing(15),
			paddingTop: 0,
			paddingBottom: 0,
			minHeight: 'unset',
			height: theme.spacing(4),
			'& > .MuiTab-wrapper': {
				textOverflow: 'ellipsis',
				overflowX: 'hidden',
				whiteSpace: 'nowrap',
			}
		},
		'& .MuiTabs-indicator': {
			backgroundColor: theme.palette.primary.light
		}
	}
}));
const useTabPanelStyles = makeStyles(theme => ({
	root: {
		flexGrow: 1,
		width: 'unset',
		height: theme.spacing(40),
		'&[data-hidden=true]': {
			display: 'none'
		}
	}
}));

const TabPanel = (props: {
	index: number;
	currentIndex: number;
	tab: ExecuteEnv;
	nameChanged: () => void;
}): JSX.Element => {
	const { index, currentIndex, tab, nameChanged } = props;
	const classes = useTabPanelStyles({});

	const [ignored, forceUpdate] = React.useReducer((x: number): number => x + 1, 0);
	const onNameChange = (event: any) => {
		tab.name = event.target.value;
		forceUpdate(ignored);
		nameChanged();
	};
	const onUrlReplacementRegexpChange = (event: any) => {
		tab.urlReplaceRegexp = event.target.value;
		forceUpdate(ignored);
	};
	const onUrlReplacementToChange = (event: any) => {
		tab.urlReplaceTo = event.target.value;
		forceUpdate(ignored);
	};
	return (
		<Grid item data-hidden={currentIndex !== index} role="tabpanel" className={classes.root}>
			<TextField
				autoFocus
				margin="dense"
				label="Environment Name"
				fullWidth
				onChange={onNameChange}
				value={tab.name}
			/>
			<TextField
				autoFocus
				margin="dense"
				label="URL Replacement Regexp"
				fullWidth
				onChange={onUrlReplacementRegexpChange}
				value={tab.urlReplaceRegexp}
			/>
			<TextField
				autoFocus
				margin="dense"
				label="URL Replacement To"
				fullWidth
				onChange={onUrlReplacementToChange}
				value={tab.urlReplaceTo}
			/>
		</Grid>
	);
};

export default (props: { open: boolean; close: () => void }): JSX.Element => {
	const { open, close } = props;
	const classes = useStyles({});

	const [ignored, forceUpdate] = React.useReducer((x: number): number => x + 1, 0);
	const [state, setState] = React.useState(() => {
		const { settings } = getCurrentWorkspace();
		return {
			tabIndex: 0,
			// clone
			tabs: JSON.parse(JSON.stringify(settings.envs || [{}])) as ExecuteEnv[]
		};
	});

	if (!open) {
		return <Fragment />;
	}

	const handleTabChange = (event: any, newValue: number): void => {
		setState({ ...state, tabIndex: newValue });
	};
	const onMoreEnvClicked = (): void => {
		if (state.tabs.length >= 3) {
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'info',
				title: 'Pro',
				message: 'More than 3 environments is a coming soon feature in PRO version.'
			});
			return;
		}
		state.tabs.push({});
		setState({ ...state, tabIndex: state.tabs.length - 1, tabs: state.tabs });
	};
	const onConfirmClicked = (): void => {
		const { settings } = getCurrentWorkspace();
		settings.envs = state.tabs;
		saveCurrentWorkspace();
		setState({ ...state, tabIndex: 0 });
		close();
	};
	const onCancel = (): void => {
		const { settings } = getCurrentWorkspace();
		setState({
			tabIndex: 0,
			tabs: JSON.parse(JSON.stringify(settings.envs || [{}])) as ExecuteEnv[]
		});
		close();
	};

	return (
		<Dialog open={open} onClose={onCancel} fullWidth={true} maxWidth="md" disableBackdropClick={true}>
			<DialogTitle>Environments Settings</DialogTitle>
			<DialogContent className={classes.dialogContent}>
				<div>
					<Tabs
						variant="scrollable"
						value={state.tabIndex}
						onChange={handleTabChange}
						className={classes.tabs}
					>
						{state.tabs.map((tab: ExecuteEnv, index: number) => {
							return <Tab label={tab.name || `Environment ${index + 1}`} key={`env-${index + 1}`} />;
						})}
					</Tabs>
					{state.tabs.map((tab: ExecuteEnv, index: number) => {
						return (
							<TabPanel
								key={`env-${index + 1}`}
								index={index}
								currentIndex={state.tabIndex}
								tab={tab}
								nameChanged={() => forceUpdate(ignored)}
							/>
						);
					})}
				</div>
			</DialogContent>
			<DialogActions>
				<Button onClick={onCancel} variant="contained">
					Cancel
				</Button>
				<Button onClick={onMoreEnvClicked} variant="contained" color="primary">
					More Env
				</Button>
				<Button onClick={onConfirmClicked} variant="contained" color="primary">
					OK
				</Button>
			</DialogActions>
		</Dialog>
	);
};
