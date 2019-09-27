import { faChrome, faNodeJs, faReact } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Grid from '@material-ui/core/Grid';
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import { ipcRenderer, remote } from 'electron';
import React from 'react';
import { isFlowOnRecording, isFlowsOnRecording, generateKeyByString } from '../common/flow-utils';
import history from '../common/history';
import { getTheme } from '../global-settings';
import paths from '../paths';
import { closeCurrentWorkspace, Flow, getCurrentWorkspace, Story } from '../workspace-settings';
import Outline from './outline';
import WorkArea from './workarea';

const myTheme = getTheme();
const useStyles = makeStyles(theme => ({
	root: {
		height: '100vh',
		overflow: 'hidden'
	},
	top: {
		width: '100%'
	},
	center: {
		width: '100%',
		flexGrow: 1,
		overflow: 'hidden'
	}
}));
const useBottomStyles = makeStyles(theme => ({
	bottom: {
		width: '100%',
		padding: `0 ${theme.spacing(2)}px`,
		backgroundColor: myTheme.workareaBottomBackgroundColor,
		transition: 'background-color 300ms ease-in-out'
	},
	bottomPlaceholder: {
		flexGrow: 1
	},
	bottomSegment: {
		backgroundColor: myTheme.workareaBottomBackgroundColor,
		padding: `0 5px`,
		borderRadius: 2,
		'&:first-child': {
			paddingLeft: 0
		},
		'&:last-child': {
			paddingRight: 0
		},
		'&:hover': {
			backgroundColor: myTheme.workareaBottomSegmentHoverBackgroundColor
		},
		'& > svg': {
			opacity: 0.2,
			marginRight: 5
		},
		'& > span': {
			opacity: 0.2,
			userSelect: 'none'
		}
	}
}));

const BottomBar = () => {
	const classes = useBottomStyles();
	return (
		<Grid item className={classes.bottom} container>
			<Grid item className={classes.bottomPlaceholder} />
			<Grid item className={classes.bottomSegment}>
				<FontAwesomeIcon icon={faNodeJs} />
				<Typography variant="caption">{process.versions.node}</Typography>
			</Grid>
			<Grid item className={classes.bottomSegment}>
				<FontAwesomeIcon icon={faChrome} />
				<Typography variant="caption">{process.versions.chrome}</Typography>
			</Grid>
			<Grid item className={classes.bottomSegment}>
				<FontAwesomeIcon icon={faReact} />
				<Typography variant="caption">{process.versions.electron}</Typography>
			</Grid>
		</Grid>
	);
};

const onBeforeUnload = (evt: BeforeUnloadEvent) => {
	remote.dialog
		.showMessageBox(remote.getCurrentWindow(), {
			type: 'question',
			title: 'Close workspace',
			message: 'Are you sure to close current workspace?',
			buttons: ['OK', 'Cancel']
		})
		.then((ret: Electron.MessageBoxReturnValue) => {
			if (ret.response === 0) {
				// ok clicked
				window.onbeforeunload = null;
				ipcRenderer.send('workspace-closed', getCurrentWorkspace().settings.name);
				closeCurrentWorkspace();
				history.replace(paths.ROOT);
			}
		});
	evt.returnValue = false;
};
export default (): JSX.Element => {
	const classes = useStyles();

	React.useEffect(() => {
		window.onbeforeunload = onBeforeUnload;
		return () => {
			window.onbeforeunload = null;
		};
	});

	React.useEffect(() => {
		const { settings } = getCurrentWorkspace();
		const { name, workspaceFile } = settings;
		ipcRenderer.send('workspace-opened', { name, workspaceFile });
		// handle the flow open check request
		ipcRenderer.on('flow-open-check', (event, arg) => {
			const { storyName, flowName } = arg;
			// reply
			ipcRenderer.send(
				`flow-open-check-result-${generateKeyByString(storyName, flowName)}`,
				state.openedFlows.some(item => item.story.name === storyName && item.flow.name === flowName)
			);
		});
		return () => {
			ipcRenderer.removeAllListeners('flow-open-check');
		};
		// eslint-disable-next-line
	}, [0]);
	const [state, setState] = React.useState({
		openedFlows: [] as { story: Story; flow: Flow }[],
		activeFlow: null as { story: Story; flow: Flow } | null
	});

	const openFlow = (story: Story, flow: Flow): void => {
		const alreadyOpened = state.openedFlows.find(item => item.story === story && item.flow === flow);
		if (!alreadyOpened) {
			setState({ ...state, openedFlows: [...state.openedFlows, { story, flow }], activeFlow: { story, flow } });
		} else {
			setState({ ...state, activeFlow: { story, flow } });
		}
	};
	const changeActiveFlow = (story: Story, flow: Flow): void => setState({ ...state, activeFlow: { story, flow } });
	const removeOpenedFlow = async (story: Story, flow: Flow) => {
		try {
			const onRecord = await isFlowOnRecording(story, flow);
			if (onRecord) {
				remote.dialog.showMessageBox(remote.getCurrentWindow(), {
					type: 'error',
					title: 'On recording.',
					message: `Cannot close flow [${flow.name}@${story.name}] when it is on recording. Please stop recording manually, and then close it.`
				});
			} else {
				const { openedFlows, activeFlow } = state;
				const index = openedFlows.findIndex(item => item.story === story && item.flow === flow);
				if (index !== -1) {
					let nextActiveFlow = activeFlow;
					if (activeFlow != null && activeFlow.story === story && activeFlow.flow === flow) {
						// active one removed
						if (index !== openedFlows.length - 1) {
							// not last one, set next one as active
							nextActiveFlow = openedFlows[index + 1];
						} else if (index !== 0) {
							// not first one, set previous one as active
							nextActiveFlow = openedFlows[index - 1];
						} else {
							// last one removed
							nextActiveFlow = null;
						}
					}
					setState({
						...state,
						openedFlows: openedFlows.filter(item => !(item.story === story && item.flow === flow)),
						activeFlow: nextActiveFlow
					});
				}
			}
		} catch {}
	};
	const removeOtherFlows = async (story: Story, flow: Flow) => {
		const { openedFlows } = state;

		try {
			const { canRemove: flowsCanRemove, onRecord: flowsOnRecord } = await isFlowsOnRecording(
				openedFlows.filter(item => item.story !== story || item.flow !== flow)
			);
			if (flowsOnRecord.length !== 0) {
				await remote.dialog.showMessageBox(remote.getCurrentWindow(), {
					type: 'error',
					title: 'Some flows on recording.',
					message: `Cannot close all other flows when some of them are on recording. Those flows are not on recoding should be closed, the others need to stop recording manually first.`
				});
			}
			setState({
				...state,
				openedFlows: openedFlows.filter(item => {
					// filter flows which can be found in removed set
					return (
						null ==
						flowsCanRemove.find(removed => removed.story === item.story && removed.flow === item.flow)
					);
				}),
				activeFlow: { story, flow }
			});
		} catch (e) {
			console.error(e);
		}
	};
	const removeAllOpenedFlows = async (story: Story, flow: Flow) => {
		const { openedFlows } = state;

		try {
			const { canRemove: flowsCanRemove, onRecord: flowsOnRecord } = await isFlowsOnRecording(openedFlows);
			if (flowsOnRecord.length !== 0) {
				await remote.dialog.showMessageBox(remote.getCurrentWindow(), {
					type: 'error',
					title: 'Some flows on recording.',
					message: `Cannot close all flows when some of them are on recording. Those flows are not on recoding should be closed, the others need to stop recording manually first.`
				});
				const isGivenRemoved = flowsCanRemove.some(removed => removed.story === story && removed.flow === flow);
				setState({
					...state,
					openedFlows: openedFlows.filter(item => {
						// filter flows which can be found in removed set
						return (
							null ==
							flowsCanRemove.find(removed => removed.story === item.story && removed.flow === item.flow)
						);
					}),
					activeFlow: isGivenRemoved
						? flowsOnRecord.length === 0
							? null
							: { story: flowsOnRecord[0].story, flow: flowsOnRecord[0].flow }
						: { story, flow }
				});
			} else {
				// close all flows, no recording now
				setState({ ...state, openedFlows: [], activeFlow: null });
			}
		} catch (e) {
			console.error(e);
		}
	};

	return (
		<Grid container className={classes.root} direction="column" wrap="nowrap">
			<Grid item className={classes.top} />
			<Grid item className={classes.center} container>
				<Outline openFlow={openFlow} onFlowRenamed={openFlow} onFlowDeleted={removeOpenedFlow} />
				<WorkArea
					openedFlows={state.openedFlows}
					activeFlow={state.activeFlow}
					changeActiveFlow={changeActiveFlow}
					removeOpenedFlow={removeOpenedFlow}
					removeOtherFlows={removeOtherFlows}
					removeAllOpenedFlows={removeAllOpenedFlows}
				/>
			</Grid>
			<BottomBar />
		</Grid>
	);
};
