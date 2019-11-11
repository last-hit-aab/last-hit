import { Button, ButtonGroup, Grid, InputBase, makeStyles } from '@material-ui/core';
import MoveDownIcon from '@material-ui/icons/ArrowDownward';
import MoveUpIcon from '@material-ui/icons/ArrowUpward';
import ConditionIcon from '@material-ui/icons/CallSplit';
import CaptureScreenIcon from '@material-ui/icons/CameraEnhance';
import AssertIcon from '@material-ui/icons/ControlCamera';
import DeleteIcon from '@material-ui/icons/DeleteForever';
import EditIcon from '@material-ui/icons/Edit';
import FreeMoveIcon from '@material-ui/icons/ImportExport';
import BreakpointIcon from '@material-ui/icons/PauseCircleFilled';
import { ipcRenderer, remote } from 'electron';
import React, { Fragment } from 'react';
import { generateKeyByObject } from '../../common/flow-utils';
import { getTheme } from '../../global-settings';
import { Flow, saveFlow, Step, StepType, Story } from '../../workspace-settings';
import StepAssertionDialog from './step-assertion';
import StepConditionDialog from './step-condition';
import {
	ASSERTABLE_STEPS,
	CONDITIONABLE_STEPS,
	getStepFork,
	IRRELEVANT_STEPS,
	ReplayType,
	StepIcon
} from './step-definition';
import ThumbnailDialog from './thumbnail-view-dialog';

const myTheme = getTheme();
const useStyles = makeStyles(theme => ({
	root: {
		display: 'grid',
		gridTemplateColumns: `${theme.spacing(6)}px 1fr auto auto`,
		height: theme.spacing(6),
		marginBottom: theme.spacing(1),
		border: `1px solid ${myTheme.stepFocusColor}`,
		borderRadius: 2,
		cursor: 'pointer',
		position: 'relative',
		'&:before, &:after': {
			position: 'absolute',
			display: 'block',
			fontSize: '0.5rem',
			color: theme.palette.secondary.light,
			width: 'auto',
			minWidth: 14,
			height: 14,
			border: `1px solid ${theme.palette.secondary.light}`,
			borderRadius: '7px',
			textAlign: 'center',
			lineHeight: '14px',
			overflow: 'hidden',
			whiteSpace: 'nowrap',
			left: 2,
			padding: '0 2px'
		},
		'&:before': {
			content: 'attr(data-index)',
			top: 2
		},
		'&[data-is-breakpoint=true]:after': {
			content: '"b"',
			bottom: 2
		},
		'&[data-is-irrelevant=true]': {
			marginLeft: theme.spacing(4),
			width: `calc(100% - ${theme.spacing(4)}px)`
		},
		'&:focus, &:focus-within': {
			outline: 'none',
			boxShadow: `-2px -2px 2px 0 ${myTheme.stepFocusColor}, -2px 2px 2px 0 ${myTheme.stepFocusColor}, 2px 2px 2px 0 ${myTheme.stepFocusColor}, 2px -2px 2px 0 ${myTheme.stepFocusColor}`
		},
		'&[data-on-replay=true]': {
			transition: 'all 200ms ease-in-out',
			boxShadow: `-2px -2px 2px 0 ${theme.palette.primary.dark}, -2px 2px 2px 0 ${theme.palette.primary.dark}, 2px 2px 2px 0 ${theme.palette.primary.dark}, 2px -2px 2px 0 ${theme.palette.primary.dark}`
		},
		'&[data-on-replaying=true]': {
			boxShadow: `-2px -2px 2px 0 ${theme.palette.secondary.dark}, -2px 2px 2px 0 ${theme.palette.secondary.dark}, 2px 2px 2px 0 ${theme.palette.secondary.dark}, 2px -2px 2px 0 ${theme.palette.secondary.dark}`
		},
		'&:last-child': {
			marginBottom: 0
		},
		'& > span:first-child': {
			color: myTheme.stepIconColor,
			opacity: myTheme.opacityForFontColor,
			fontSize: theme.spacing(2.5),
			textAlign: 'center',
			width: theme.spacing(6),
			lineHeight: `${theme.spacing(6)}px`
		}
	},
	buttons: {
		placeSelf: 'center stretch',
		boxShadow: 'none',
		justifyContent: 'flex-end',
		marginRight: theme.spacing(1),
		marginLeft: theme.spacing(1),
		'& > button': {
			opacity: 0.7,
			minWidth: theme.spacing(3.5),
			'&:first-child': {
				borderTopLeftRadius: theme.spacing(0.25),
				borderBottomLeftRadius: theme.spacing(0.25)
			},
			'&:last-child': {
				borderTopRightRadius: theme.spacing(0.25),
				borderBottomRightRadius: theme.spacing(0.25)
			},
			'&[data-has-assertion=true], &[data-has-condition=true]': {
				backgroundColor: theme.palette.primary.light
			},
			'& > span': {
				'& > svg': {
					fontSize: '0.8rem'
				}
			}
		}
	},
	human: {
		opacity: myTheme.opacityForFontColor,
		fontSize: '0.8rem',
		height: `${theme.spacing(6) - 2}px`,
		lineHeight: `${theme.spacing(6) - 2}px`,
		'& > input': {
			padding: 0,
			height: '100%'
		}
	},
	image: {
		padding: `3px 8px`,
		'& > img': {
			height: theme.spacing(5),
			cursor: 'pointer'
		}
	}
}));

export default (props: {
	story: Story;
	flow: Flow;
	step: Step;
	onRecord: boolean;
	onPause: boolean;
	onReplay: ReplayType;
	replayStepIndex: number;
	stepReplaying: boolean;
	myIndex: number;
	irrelevantShow: boolean;
	irrelevant: boolean;
	canMoveUp: boolean;
	canMoveDown: boolean;
	onMoveUp: (step: Step) => void;
	onMoveDown: (step: Step) => void;
	onFreeMove: (step: Step) => void;
	onEdit: (step: Step) => void;
	onDelete: (step: Step) => void;
}): JSX.Element => {
	const {
		story,
		flow,
		step,
		onRecord,
		onPause,
		onReplay,
		replayStepIndex,
		stepReplaying,
		myIndex,
		irrelevantShow,
		irrelevant,
		canMoveUp,
		canMoveDown,
		onMoveUp,
		onMoveDown,
		onFreeMove,
		onEdit,
		onDelete
	} = props;
	const { type } = step;
	const classes = useStyles();
	const [ignored, forceUpdate] = React.useReducer((x: number): number => x + 1, 0);
	const [state, setState] = React.useState({
		openStepAssertion: false,
		openStepCondition: false,
		openThumbnail: false
	});

	if (!irrelevantShow && irrelevant) {
		return <Fragment />;
	}

	const handleHumanTextChanged = (event: any): void => {
		step.human = event.target.value;
		forceUpdate(ignored);
		saveFlow(story, flow);
	};
	const onCaptureScreenClicked = (): void => {
		const flowKey = generateKeyByObject(story, flow);
		ipcRenderer.once(`screen-captured-${flowKey}`, (event, arg) => {
			const { error, image } = arg;
			if (error) {
				remote.dialog.showMessageBox(remote.getCurrentWindow(), {
					type: 'error',
					title: 'Capture screenshot',
					message: `Cannot find the page with uuid[${step.uuid}], have you close that?`
				});
			} else {
				step.image = image;
				forceUpdate(ignored);
				saveFlow(story, flow);
			}
		});
		ipcRenderer.send('capture-screen', { flowKey, uuid: step.uuid });
	};
	const onToggleBreakpointClicked = (): void => {
		step.breakpoint = !!!step.breakpoint;
		forceUpdate(ignored);
		saveFlow(story, flow);
	};
	const onStepAssertionClicked = (): void => setState({ ...state, openStepAssertion: true });
	const onStepAssertionDialogClose = (): void => setState({ ...state, openStepAssertion: false });
	const onStepConditionClicked = (): void => setState({ ...state, openStepCondition: true });
	const onStepConditionDialogClose = (): void => setState({ ...state, openStepCondition: false });

	const buttons = (
		<ButtonGroup variant="contained" color="primary" size="small" className={classes.buttons}>
			{[
				onRecord && myIndex === flow.steps!.length - 1 && myIndex !== 0 ? (
					<Button title="Capture Screenshot" key="capture screenshot" onClick={onCaptureScreenClicked}>
						<CaptureScreenIcon />
					</Button>
				) : null,
				ASSERTABLE_STEPS.includes(type) && (!onRecord || onPause) && onReplay === ReplayType.NONE ? (
					<Button
						title="Assertion"
						key="assertion"
						onClick={onStepAssertionClicked}
						data-has-assertion={step.assertions && step.assertions.length !== 0}
					>
						<AssertIcon />
					</Button>
				) : null,
				CONDITIONABLE_STEPS.includes(type) && (!onRecord || onPause) && onReplay === ReplayType.NONE ? (
					<Button
						title="Condition"
						key="condition"
						onClick={onStepConditionClicked}
						data-has-condition={step.conditions && step.conditions.length !== 0}
					>
						<ConditionIcon />
					</Button>
				) : null,
				!IRRELEVANT_STEPS.includes(type) && (!onRecord || onPause) && onReplay === ReplayType.NONE ? (
					<Button title="Toggle Breakpoint" key="toggle breakpoint" onClick={onToggleBreakpointClicked}>
						<BreakpointIcon />
					</Button>
				) : null,
				irrelevantShow && canMoveUp && !onRecord && onReplay === ReplayType.NONE ? (
					<Button title="Move Up" key="move-up" onClick={() => onMoveUp(step)}>
						<MoveUpIcon />
					</Button>
				) : null,
				irrelevantShow && canMoveDown && !onRecord && onReplay === ReplayType.NONE ? (
					<Button title="Move Down" key="move-down" onClick={() => onMoveDown(step)}>
						<MoveDownIcon />
					</Button>
				) : null,
				irrelevantShow && (canMoveUp || canMoveDown) && !onRecord && onReplay === ReplayType.NONE ? (
					<Button title="Free Move" key="free-move" onClick={() => onFreeMove(step)}>
						<FreeMoveIcon />
					</Button>
				) : null,
				<Button title="Edit" key="edit" onClick={() => onEdit(step)}>
					<EditIcon />
				</Button>,
				StepType.START !== type && !onRecord && onReplay === ReplayType.NONE ? (
					<Button title="Delete" key="delete" onClick={() => onDelete(step)}>
						<DeleteIcon />
					</Button>
				) : null
			].filter(btn => btn != null)}
		</ButtonGroup>
	);

	let image = (step as any).image;
	image = image ? `data:image/png;base64,${image}` : image;
	const onThumbnailClicked = (): void => setState({ ...state, openThumbnail: true });
	const onThumbnailDialogClose = (): void => setState({ ...state, openThumbnail: false });

	return (
		<Grid
			item
			container
			className={classes.root}
			tabIndex={0}
			data-step-type={type}
			data-step-uuid={step.stepUuid}
			data-index={myIndex + 1}
			data-is-irrelevant={irrelevant}
			data-on-replay={onReplay !== ReplayType.NONE && replayStepIndex === myIndex}
			data-on-replaying={onReplay !== ReplayType.NONE && replayStepIndex === myIndex && stepReplaying}
			data-is-breakpoint={step.breakpoint}
		>
			<StepIcon step={step} />
			<InputBase
				className={classes.human}
				placeholder={getStepFork(step).label(step as any, flow as any)}
				inputProps={{ 'aria-label': 'naked' }}
				value={step.human}
				onChange={handleHumanTextChanged}
				disabled={onRecord || onReplay !== ReplayType.NONE}
			/>
			{image ? (
				<div className={classes.image}>
					<img src={image} alt="" onClick={onThumbnailClicked} />
				</div>
			) : (
				<div />
			)}
			{buttons}
			{state.openStepAssertion ? (
				<StepAssertionDialog
					open={state.openStepAssertion}
					story={story}
					flow={flow}
					step={step}
					close={onStepAssertionDialogClose}
				/>
			) : null}
			{state.openStepCondition ? (
				<StepConditionDialog
					open={state.openStepCondition}
					story={story}
					flow={flow}
					step={step}
					close={onStepConditionDialogClose}
				/>
			) : null}
			{state.openThumbnail ? (
				<ThumbnailDialog open={state.openThumbnail} close={onThumbnailDialogClose} image={image} />
			) : null}
		</Grid>
	);
};
