import { faBan, faShoePrints } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, ButtonGroup, Grid, TextField } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import SmartPlayIcon from '@material-ui/icons/FastForward';
import RecordIcon from '@material-ui/icons/FiberManualRecord';
import PauseIcon from '@material-ui/icons/Pause';
import PlayIcon from '@material-ui/icons/PlayArrow';
import StopIcon from '@material-ui/icons/Stop';
import FlowIcon from '@material-ui/icons/Subscriptions';
import PlayStepIcon from '@material-ui/icons/WrapText';
import { ipcRenderer, remote } from 'electron';
import React, { Fragment } from 'react';
import uuidv4 from 'uuid/v4';
import { generateKeyByObject } from '../../common/flow-utils';
import { getTheme } from '../../global-settings';
import { Flow, saveFlow, StartStep, Step, StepType, Story } from '../../workspace-settings';
import FlowStep from './flow-step';
import StartRecordDialog from './start-record';
import StartReplayDialog from './start-replay';
import { getStepFork, IRRELEVANT_STEPS, ReplayType } from './step-definition';
import StepFreeMoveDialog from './step-free-move';
// a hint step for start recording
const NO_STEPS = [
	{
		type: StepType.START,
		url: "where? Let's go!"
	} as StartStep
];
const END_STEP = { type: StepType.END };

const myTheme = getTheme();
const useStyles = makeStyles(theme => ({
	root: {
		padding: `${theme.spacing(2)}px ${theme.spacing(2)}px ${theme.spacing(1)}px`,
		flexGrow: 1,
		height: '100%'
	},
	heading: {
		display: 'grid',
		gridTemplateColumns: '8rem 1fr',
		gridTemplateRows: 'auto auto 1fr',
		height: '100%'
	},
	headIcon: {
		opacity: myTheme.opacityForFontColor,
		fontSize: '4rem',
		width: '4rem',
		color: myTheme.flowIconColor,
		boxShadow: `0 2px 2px 0 transparent, 2px 2px 2px 4px ${myTheme.flowIconColor}`,
		borderRadius: '100%',
		justifySelf: 'center',
		alignSelf: 'center'
	},
	headName: {
		opacity: myTheme.opacityForFontColor,
		justifySelf: 'stretch'
	},
	headDesc: {
		justifySelf: 'stretch',
		marginTop: 0,
		marginBottom: 0,
		'& textarea': {
			fontSize: '0.75rem',
			opacity: myTheme.opacityForFontColor,
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
		}
	},
	buttonBars: {
		marginTop: theme.spacing(1),
		marginBottom: theme.spacing(1),
		gridColumn: '1 / span 2',
		justifySelf: 'stretch',
		display: 'grid',
		gridTemplateColumns: 'auto auto auto 1fr auto',
		gridColumnGap: theme.spacing(1)
	},
	statusButton: {
		minWidth: 300,
		backgroundColor: 'transparent',
		color: theme.palette.secondary.light
	},
	steps: {
		gridColumn: 'span 2',
		display: 'flex',
		flexWrap: 'nowrap',
		flexDirection: 'column',
		overflowX: 'hidden',
		overflowY: 'auto',
		padding: theme.spacing(0.25),
		'&[data-on-record=true]': {
			'& > div': {
				outline: 'none',
				boxShadow: 'none'
			},
			'& > div:last-child': {
				boxShadow: `-2px -2px 2px 0 ${theme.palette.secondary.dark}, -2px 2px 2px 0 ${theme.palette.secondary.dark}, 2px 2px 2px 0 ${theme.palette.secondary.dark}, 2px -2px 2px 0 ${theme.palette.secondary.dark}`
			}
		},
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
	showAllSteps: {
		'& > span:first-child': {
			'& > svg:last-child:not(:first-child)': {
				position: 'absolute',
				color: theme.palette.error.main,
				transform: 'scale(1.8)',
				opacity: 0.7
			}
		}
	}
}));

export default (props: { story: Story; flow: Flow; show: boolean }): JSX.Element => {
	const { story, flow, show } = props;
	const { steps = [] } = flow;
	const classes = useStyles();
	const [ignored, forceUpdate] = React.useReducer((x: number): number => x + 1, 0);

	const stepContainerRef = React.useRef<HTMLDivElement>(null);
	const [state, setState] = React.useState({
		openStartRecord: false,
		openStartReplay: ReplayType.NONE as ReplayType,
		showAllSteps: false,
		onReplay: ReplayType.NONE as ReplayType,
		onRecord: false,
		onPause: false,
		openStepFreeMove: false,
		freeMoveStep: null as Step | null
	});
	const [currentReplayStepIndex, setCurrentReplayStepIndex] = React.useState(-1);
	const [stepReplaying, setStepReplaying] = React.useState(false);
	React.useEffect(() => {
		ipcRenderer.on(`message-captured-${generateKeyByObject(story, flow)}`, (evt, arg) => {
			// add the tail anyway
			flow.steps = flow.steps || [];
			switch (arg.type) {
				case StepType.END:
					if (flow.steps.length > 0 && flow.steps[flow.steps.length - 1].type === StepType.END) {
						// end step already exists
						// may be stop record triggered, and choose the stop and close
						// then puppeteer will disconnect browser manually
						// but browser 'disconnect' event should be invoked anyway, for chromium close/crash or disconnected by puppeteer itself
						return;
					} else {
						setTimeout(() => {
							setState({ ...state, onRecord: false, onPause: false });
							ipcRenderer.send('disconnect-puppeteer', { flowKey: generateKeyByObject(story, flow) });
							remote.dialog.showMessageBox(remote.getCurrentWindow(), {
								type: 'warning',
								title: 'Unexpected interruption',
								message:
									'Chromium was closed or crashed, recording stopped. You can play from start and restart recording at last step.'
							});
						}, 300);
					}
					break;
				case StepType.PAGE_CLOSED:
					flow.steps.push(arg);
					if (arg.allClosed) {
						// all related pages were closed, disconnect browser and stop recording
						setTimeout(() => {
							stopRecording();
							ipcRenderer.send('disconnect-puppeteer', { flowKey: generateKeyByObject(story, flow) });
							remote.dialog.showMessageBox(remote.getCurrentWindow(), {
								type: 'warning',
								title: 'Unexpected interruption',
								message:
									'All related pages were closed, recording stopped. You can play from start and restart recording at last step.'
							});
						}, 300);
					}
					break;
				default:
					flow.steps.push(arg);
					break;
			}
			forceUpdate(ignored);
			saveFlow(story, flow);
		});
		ipcRenderer.on(`flow-on-record-check-${generateKeyByObject(story, flow)}`, (evt, arg) => {
			ipcRenderer.send(`flow-on-record-check-result-${generateKeyByObject(story, flow)}`, onRecord);
		});
		return () => {
			ipcRenderer.removeAllListeners(`message-captured-${generateKeyByObject(story, flow)}`);
			ipcRenderer.removeAllListeners(`flow-on-record-check-${generateKeyByObject(story, flow)}`);
		};
	}, [story, flow]);
	React.useEffect(() => {
		if (onRecord) {
			const div = stepContainerRef.current!;
			div.scrollTop = div.scrollHeight - div.clientHeight;
		} else if (onReplay) {
			const div = stepContainerRef.current!;
			div.children[currentReplayStepIndex].scrollIntoView(true);
			div.scrollTop = div.scrollTop - 10;
		}
	});

	if (!show) {
		return <Fragment />;
	}

	const stopRecording = () => {
		flow.steps!.push(JSON.parse(JSON.stringify(END_STEP)));
		setState({ ...state, onRecord: false, onPause: false });
		saveFlow(story, flow);
	};
	const onFlowDescriptionChange = (event: any): void => {
		flow.description = event.target.value;
		forceUpdate(ignored);
		saveFlow(story, flow);
	};
	const onShowAllStepsClicked = () => {
		setState({ ...state, showAllSteps: !showAllSteps });
	};

	/**
	 * states as below,
	 * 1. onRecord == false
	 * 		can:		record
	 * 		cannot:		pause, stop
	 * 2. onRecord == true
	 * 		can: 		pause, stop
	 * 		cannot:		record, play, smart play, step play
	 * 3. not steps
	 * 		cannot:		play, smart play, step play
	 */

	const showAllSteps = state.showAllSteps;
	const onRecord = state.onRecord;
	const onReplay = state.onReplay;
	const onPause = state.onPause;
	// can start to play only when steps exists and not on recording
	const canStartPlay = steps.length !== 0 && !onRecord && onReplay === ReplayType.NONE;
	// can start to record only when not on recording
	const canStartRecord = !onRecord && onReplay === ReplayType.NONE;
	// step by step button can click when not replaying or on step by step replaying
	const canStartStepReplay = !onRecord && [ReplayType.NONE, ReplayType.STEP].includes(onReplay);
	const status = (() => {
		if (onPause) {
			return 'Record Paused';
		} else if (onRecord) {
			return 'Recording...';
		} else if (onReplay) {
			return 'Replaying...';
		} else {
			return null;
		}
	})();
	const onStartRegularReplayClicked = (): void => {
		setCurrentReplayStepIndex(-1);
		setState({
			...state,
			openStartReplay: ReplayType.REGULAR,
			onReplay: ReplayType.NONE
		});
	};
	const onStartSmartReplayClicked = (): void => {
		setCurrentReplayStepIndex(-1);
		setState({
			...state,
			openStartReplay: ReplayType.SMART,
			onReplay: ReplayType.NONE
		});
	};
	const onStartStepReplayClicked = (): void => {
		if (onReplay === ReplayType.NONE) {
			// not on replay, start it
			setCurrentReplayStepIndex(-1);
			setState({
				...state,
				openStartReplay: ReplayType.STEP,
				onReplay: ReplayType.NONE
			});
		} else {
			replayNextStep(story, flow, onReplay, currentReplayStepIndex);
		}
	};
	const replayNextStep = (story: Story, flow: Flow, type: ReplayType, index: number): void => {
		setCurrentReplayStepIndex(index + 1);
		// set as step replaying anyway, it will disable the step play button
		setStepReplaying(true);
		handleReplayStepEnd(story, flow, type);
		ipcRenderer.send(`continue-replay-step-${generateKeyByObject(story, flow)}`, {
			storyName: story.name,
			flow,
			index: index + 1
		});
	};
	const handleReplayStepEnd = (story: Story, flow: Flow, type: ReplayType): void => {
		ipcRenderer.once(`replay-step-end-${generateKeyByObject(story, flow)}`, (event, arg) => {
			const { error, index } = arg;
			if (error) {
				// TODO
				(async () => {
					await remote.dialog.showMessageBox(remote.getCurrentWindow(), {
						type: 'error',
						title: 'Replay fail',
						message: error
					});
					// disconnect
					ipcRenderer.send(`continue-replay-step-${generateKeyByObject(story, flow)}`, {
						command: 'disconnect'
					});
					// recover state
					setState({
						...state,
						openStartReplay: ReplayType.NONE,
						onReplay: ReplayType.NONE
					});
					setCurrentReplayStepIndex(-1);
					setStepReplaying(false);
				})();
			} else if (flow.steps![index].type === StepType.END) {
				// the end step is finished
				(async () => {
					const ret: Electron.MessageBoxReturnValue = await remote.dialog.showMessageBox(
						remote.getCurrentWindow(),
						{
							type: 'info',
							title: 'Replay finished',
							message: 'Mission Accomplished. Congratulations!',
							buttons: ['Disconnect only', 'Disconnect & close Chromium']
						}
					);
					switch (ret.response) {
						case 0:
							ipcRenderer.send(`continue-replay-step-${generateKeyByObject(story, flow)}`, {
								command: 'disconnect'
							});
							break;
						case 1:
							ipcRenderer.send(`continue-replay-step-${generateKeyByObject(story, flow)}`, {
								command: 'abolish'
							});
							break;
					}
					setState({
						...state,
						openStartReplay: ReplayType.NONE,
						onReplay: ReplayType.NONE
					});
					setCurrentReplayStepIndex(-1);
					setStepReplaying(false);
				})();
			} else if (type === ReplayType.STEP) {
				// set step replaying to false, enable the step play button
				setStepReplaying(false);
			} else {
				// go on
				replayNextStep(story, flow, type, index);
			}
		});
	};
	const onStartReplayDialogClose = (onReplay: boolean): void => {
		const replayType = state.openStartReplay;
		setState({
			...state,
			openStartReplay: ReplayType.NONE,
			onReplay: onReplay ? replayType : ReplayType.NONE,
			showAllSteps: onReplay
		});
		setCurrentReplayStepIndex(onReplay ? 0 : -1);
		if (onReplay) {
			// set as step replaying anyway, it will disable the step play button
			setStepReplaying(true);
			handleReplayStepEnd(story, flow, replayType);
			ipcRenderer.send('launch-replay', { flow, index: 0, storyName: story.name });
		}
	};
	const onStartRecordClicked = (): void => {
		setState({ ...state, openStartRecord: true, onRecord: false });
	};
	const onStartRecordDialogClose = (onRecord: boolean): void => {
		// show all steps when on record
		setState({ ...state, openStartRecord: false, onRecord, showAllSteps: onRecord });
	};
	const onPauseRecordClicked = (): void => {
		// toggle pause state
		// no need to notify puppeteer chromium
		setState({ ...state, onPause: !onPause });
	};
	const onStopRecordClicked = (): void => {
		remote.dialog
			.showMessageBox(remote.getCurrentWindow(), {
				type: 'question',
				title: 'Stop recording',
				message: 'Are you sure to stop recording?',
				buttons: ['Stop only ', 'Stop & close Chromium', 'Cancel']
			})
			.then((ret: Electron.MessageBoxReturnValue) => {
				switch (ret.response) {
					case 0:
						// stop only
						// reset onRecord and onPause to false
						// disconnect puppeteer, this chromium cannot be reuse again
						stopRecording();
						ipcRenderer.send('disconnect-puppeteer', { flowKey: generateKeyByObject(story, flow) });
						break;
					case 1:
						// stop and close chromium
						// reset onRecord and onPause to false
						// notify puppeteer to close chromium browser, no matter what there is
						stopRecording();
						ipcRenderer.send('abolish-puppeteer', { flowKey: generateKeyByObject(story, flow) });
						break;
					case 2:
						// cancel, do nothing
						break;
				}
			});
	};

	const canMoveUp = (flow: Flow, step: Step): boolean => {
		const steps = flow.steps || [];
		const { type } = step;
		return steps.indexOf(step) > 1 && type !== StepType.END;
	};
	const canMoveDown = (flow: Flow, step: Step): boolean => {
		const steps = flow.steps || [];
		const { type } = step;
		return steps.indexOf(step) < steps.length - 2 && type !== StepType.START;
	};
	const handleStepMoveUp = (step: Step): void => {
		const steps = flow.steps!;
		const index = steps.indexOf(step);
		const previousStep = steps[index - 1];
		steps[index - 1] = step;
		steps[index] = previousStep;
		forceUpdate(ignored);
		saveFlow(story, flow);
	};
	const handleStepMoveDown = (step: Step): void => {
		const steps = flow.steps!;
		const index = steps.indexOf(step);
		const nextStep = steps[index + 1];
		steps[index + 1] = step;
		steps[index] = nextStep;
		forceUpdate(ignored);
		saveFlow(story, flow);
	};
	const handleStepFreeMove = (step: Step): void => setState({ ...state, openStepFreeMove: true, freeMoveStep: step });
	const onStepFreeMoveDialogClose = (): void => setState({ ...state, openStepFreeMove: false, freeMoveStep: null });
	const handleStepDelete = (step: Step): void => {
		remote.dialog
			.showMessageBox(remote.getCurrentWindow(), {
				type: 'question',
				title: 'Step delete',
				message: `Are you sure to delete step "${getStepFork(step).label(step)}"?`,
				detail: 'All contents will be deleted.',
				buttons: ['OK', 'Cancel']
			})
			.then((ret: Electron.MessageBoxReturnValue) => {
				switch (ret.response) {
					case 0:
						const steps = flow.steps!;
						const index = steps.indexOf(step);
						steps.splice(index, 1);
						forceUpdate(ignored);
						saveFlow(story, flow);
						break;
					case 1:
						// cancel, do nothing
						break;
				}
			});
	};

	return (
		<Fragment>
			<Grid item container direction="column" className={classes.root}>
				<Grid item className={classes.heading}>
					<FlowIcon className={classes.headIcon} />
					<TextField
						multiline
						rowsMax="2"
						rows="2"
						label={`${flow.name} @ ${story.name}`}
						value={flow.description || ''}
						onChange={onFlowDescriptionChange}
						className={classes.headDesc}
						margin="normal"
						variant="outlined"
						placeholder="No description yet."
					/>
					<Grid item className={classes.buttonBars}>
						<ButtonGroup variant="contained" color="primary" size="small">
							<Button title="Smart play" onClick={onStartSmartReplayClicked} disabled={!canStartPlay}>
								<SmartPlayIcon />
							</Button>
							<Button title="Play" onClick={onStartRegularReplayClicked} disabled={!canStartPlay}>
								<PlayIcon />
							</Button>
							<Button
								title="Step by step"
								onClick={onStartStepReplayClicked}
								disabled={!canStartStepReplay || stepReplaying}
							>
								<PlayStepIcon />
							</Button>
						</ButtonGroup>
						<ButtonGroup variant="contained" color="primary" size="small">
							<Button title="Start record" onClick={onStartRecordClicked} disabled={!canStartRecord}>
								<RecordIcon />
							</Button>
							<Button title="Pause record" onClick={onPauseRecordClicked} disabled={!onRecord}>
								<PauseIcon />
							</Button>
							<Button title="Stop record" onClick={onStopRecordClicked} disabled={!onRecord}>
								<StopIcon />
							</Button>
						</ButtonGroup>
						<ButtonGroup variant="contained" color="primary" size="small">
							<Button
								title={showAllSteps ? 'Hide irrelevant steps' : 'Show all steps'}
								onClick={onShowAllStepsClicked}
								className={classes.showAllSteps}
								disabled={onRecord || onReplay !== ReplayType.NONE}
							>
								<FontAwesomeIcon icon={faShoePrints} />
								{showAllSteps ? <FontAwesomeIcon icon={faBan} /> : null}
							</Button>
						</ButtonGroup>
						<div />
						{status ? (
							<ButtonGroup variant="contained" size="small">
								<Button className={classes.statusButton}>{status}</Button>
							</ButtonGroup>
						) : null}
					</Grid>
					<Grid
						item
						container
						className={classes.steps}
						ref={stepContainerRef}
						data-on-record={onRecord && !onPause}
					>
						{(flow.steps || NO_STEPS).map((step, index) => {
							return (
								<FlowStep
									key={uuidv4()}
									{...{
										story,
										flow,
										step,
										onRecord,
										onPause,
										onReplay,
										replayStepIndex: currentReplayStepIndex,
										stepReplaying: stepReplaying,
										myIndex: index
									}}
									irrelevant={IRRELEVANT_STEPS.includes(step.type)}
									irrelevantShow={showAllSteps}
									canMoveUp={canMoveUp(flow, step)}
									canMoveDown={canMoveDown(flow, step)}
									onMoveUp={handleStepMoveUp}
									onMoveDown={handleStepMoveDown}
									onFreeMove={handleStepFreeMove}
									onDelete={handleStepDelete}
								/>
							);
						})}
					</Grid>
				</Grid>
			</Grid>
			{state.openStartRecord ? (
				<StartRecordDialog
					open={state.openStartRecord}
					story={story}
					flow={flow}
					close={onStartRecordDialogClose}
				/>
			) : null}
			{state.openStepFreeMove ? (
				<StepFreeMoveDialog
					open={state.openStepFreeMove}
					story={story}
					flow={flow}
					step={state.freeMoveStep}
					close={onStepFreeMoveDialogClose}
				/>
			) : null}
			{state.openStartReplay !== ReplayType.NONE ? (
				<StartReplayDialog open={true} story={story} flow={flow} close={onStartReplayDialogClose} />
			) : null}
		</Fragment>
	);
};
