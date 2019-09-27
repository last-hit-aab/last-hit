import { faFilm } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	Divider,
	ExpansionPanel,
	ExpansionPanelDetails,
	ExpansionPanelSummary,
	ListItemIcon,
	MenuItem,
	Typography
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import DeleteIcon from '@material-ui/icons/Clear';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import RenameIcon from '@material-ui/icons/Gesture';
import PlayIcon from '@material-ui/icons/PlayCircleOutline';
import PlayListIcon from '@material-ui/icons/PlaylistPlay';
import FlowIcon from '@material-ui/icons/Subscriptions';
import { remote } from 'electron';
import React, { Fragment } from 'react';
import { isFlowsOnRecording } from '../../common/flow-utils';
import { getTheme } from '../../global-settings';
import { Flow, Story } from '../../workspace-settings';
import PopMenus, { usePopoverStyles } from '../pop-menus';
import FlowList from './outline-flow-list';

const myTheme = getTheme();

const PopMenu = (props: {
	anchorOptions: { open: boolean; top: number; left: number };
	story: Story;
	closeMenu: () => void;
	createStory: () => void;
	deleteStory: (story: Story) => void;
	renameStory: (story: Story) => void;
	createFlow: (story: Story) => void;
}): JSX.Element => {
	const { anchorOptions, story, closeMenu, createStory, renameStory, deleteStory, createFlow } = props;
	const classes = usePopoverStyles({});

	const onRenameClicked = async () => {
		closeMenu();

		try {
			const { onRecord: flowsOnRecord } = await isFlowsOnRecording(
				(story.flows || []).map(flow => ({ story, flow }))
			);
			if (flowsOnRecord.length !== 0) {
				remote.dialog.showMessageBox(remote.getCurrentWindow(), {
					type: 'error',
					title: 'Some flows on recording.',
					message: `Cannot rename story when some of flows under current story are on recording, need to stop recording manually first.`
				});
			} else {
				renameStory(story);
			}
		} catch (e) {
			console.error(e);
		}
	};
	const onDeleteClicked = async () => {
		closeMenu();
		try {
			const { onRecord: flowsOnRecord } = await isFlowsOnRecording(
				(story.flows || []).map(flow => ({ story, flow }))
			);
			if (flowsOnRecord.length !== 0) {
				remote.dialog.showMessageBox(remote.getCurrentWindow(), {
					type: 'error',
					title: 'Some flows on recording.',
					message: `Cannot delete story when some of flows under current story are on recording, need to stop recording manually first.`
				});
			} else {
				deleteStory(story);
			}
		} catch {}
	};
	const onCreateStoryClicked = () => {
		closeMenu();
		createStory();
	};
	const onCreateFlowClicked = () => {
		closeMenu();
		createFlow(story);
	};
	return (
		<PopMenus {...anchorOptions} close={closeMenu}>
			<MenuItem dense onClick={onCreateStoryClicked}>
				<ListItemIcon className={classes.menuIcon}>
					<FontAwesomeIcon icon={faFilm} />
				</ListItemIcon>
				<Typography variant="inherit" className={classes.menuText}>
					New Story
				</Typography>
			</MenuItem>
			<MenuItem dense onClick={onCreateFlowClicked}>
				<ListItemIcon className={classes.menuIcon}>
					<FlowIcon />
				</ListItemIcon>
				<Typography variant="inherit" className={classes.menuText}>
					New Flow
				</Typography>
			</MenuItem>
			<Divider />
			<MenuItem dense>
				<ListItemIcon className={classes.menuIcon}>
					<PlayIcon />
				</ListItemIcon>
				<Typography variant="inherit" className={classes.menuText}>
					Play
				</Typography>
			</MenuItem>
			<MenuItem dense>
				<ListItemIcon className={classes.menuIcon}>
					<PlayListIcon />
				</ListItemIcon>
				<Typography variant="inherit" className={classes.menuText}>
					Play List
				</Typography>
			</MenuItem>
			<Divider />
			<MenuItem dense onClick={onRenameClicked}>
				<ListItemIcon className={classes.menuIcon}>
					<RenameIcon />
				</ListItemIcon>
				<Typography variant="inherit" className={classes.menuText}>
					Rename
				</Typography>
			</MenuItem>
			<MenuItem dense onClick={onDeleteClicked}>
				<ListItemIcon className={classes.menuIcon}>
					<DeleteIcon />
				</ListItemIcon>
				<Typography variant="inherit" className={classes.menuText}>
					Delete
				</Typography>
			</MenuItem>
		</PopMenus>
	);
};

const useStyles = makeStyles(theme => ({
	root: {
		boxShadow: 'none',
		// keep original background color when not expanded and not hover
		// otherwise change to transparent background
		'&:not(:hover)': {
			backgroundColor: 'transparent'
		},
		'&.Mui-expanded': {
			margin: 0,
			'&:before': {
				opacity: 1
			},
			'& + .MuiExpansionPanel-root:before': {
				display: 'block'
			}
		}
	},
	summary: {
		'&.Mui-expanded': {
			minHeight: theme.spacing(6),
			'& .MuiExpansionPanelSummary-content': {
				margin: `${theme.spacing(1.5)}px 0`
			}
		},
		'& > div': {
			overflowX: 'hidden',
			whiteSpace: 'nowrap',
			textOverflow: 'ellipsis',
			alignItems: 'center',
			'& > svg': {
				marginRight: theme.spacing(1.25)
			}
		},
		'& svg': {
			opacity: myTheme.opacityForFontColor
		}
	},
	name: {
		fontSize: theme.typography.pxToRem(15),
		flexShrink: 0,
		opacity: myTheme.opacityForFontColor
	},
	detail: {
		paddingTop: 0,
		paddingBottom: theme.spacing(1),
		paddingRight: theme.spacing(1),
		flexDirection: 'column'
	},
	desc: {
		opacity: myTheme.opacityForFontColor,
		fontSize: '0.8rem',
		overflowX: 'hidden',
		wordBreak: 'break-word',
		paddingRight: theme.spacing(1),
		paddingBottom: theme.spacing(1)
	}
}));
export default (props: {
	expanded: boolean;
	story: Story;
	toggleExpandedStory: (story: Story) => void;
	createStory: () => void;
	renameStory: (story: Story) => void;
	deleteStory: (story: Story) => void;
	openFlow: (story: Story, flow: Flow) => void;
	createFlow: (story: Story) => void;
	renameFlow: (story: Story, flow: Flow) => void;
	deleteFlow: (story: Story, flow: Flow) => void;
}): JSX.Element => {
	const {
		expanded,
		story,
		toggleExpandedStory,
		createStory,
		renameStory,
		deleteStory,
		openFlow,
		createFlow,
		renameFlow,
		deleteFlow
	} = props;
	const flowOperations = { openFlow, createFlow, renameFlow, deleteFlow };
	const storyOperations = { createStory, renameStory, deleteStory };

	const { name } = story;
	const classes = useStyles({});
	const onPanelCollapsedChange = () => toggleExpandedStory(story);

	const [anchorOptions, setAnchorOptions] = React.useState({ open: false, top: 0, left: 0 });
	const closeMenu = () => setAnchorOptions({ open: false, top: 0, left: 0 });
	const onPanelSummaryClicked = (event: React.MouseEvent): void => {
		if (event.button === 2) {
			setAnchorOptions({ open: true, top: event.clientY, left: event.clientX });
		}
	};

	const menusProps = { anchorOptions, story, closeMenu };

	return (
		<Fragment>
			<ExpansionPanel expanded={expanded} onChange={onPanelCollapsedChange} className={classes.root} square>
				<ExpansionPanelSummary
					expandIcon={<ExpandMoreIcon />}
					className={classes.summary}
					title={name}
					onMouseUp={onPanelSummaryClicked}
				>
					<FontAwesomeIcon icon={faFilm} color={myTheme.storyIconColor} />
					<Typography className={classes.name}>{name}</Typography>
				</ExpansionPanelSummary>
				<ExpansionPanelDetails className={classes.detail}>
					<Typography className={classes.desc}>{story.description || 'No description yet.'}</Typography>
					<FlowList story={story} {...flowOperations} />
				</ExpansionPanelDetails>
			</ExpansionPanel>
			<PopMenu {...menusProps} {...storyOperations} {...flowOperations} />
		</Fragment>
	);
};
