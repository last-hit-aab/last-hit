import { Divider, ListItem, ListItemIcon, ListItemText, makeStyles, MenuItem, Typography } from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Clear';
import RenameIcon from '@material-ui/icons/Gesture';
import PlayIcon from '@material-ui/icons/PlayCircleOutline';
import PlayListIcon from '@material-ui/icons/PlaylistPlay';
import FlowIcon from '@material-ui/icons/Subscriptions';
import { remote } from 'electron';
import React, { Fragment } from 'react';
import { isFlowOnRecording } from '../../common/flow-utils';
import { getTheme } from '../../global-settings';
import { Flow, Story } from '../../workspace-settings';
import PopMenus, { usePopoverStyles } from '../pop-menus';

const myTheme = getTheme();

const PopMenu = (props: {
	anchorOptions: { open: boolean; top: number; left: number };
	story: Story;
	flow: Flow;
	closeMenu: () => void;
	createFlow: (story: Story) => void;
	renameFlow: (story: Story, flow: Flow) => void;
	deleteFlow: (story: Story, flow: Flow) => void;
}): JSX.Element => {
	const { anchorOptions, story, flow, closeMenu, createFlow, renameFlow, deleteFlow } = props;
	const classes = usePopoverStyles({});

	const onRenameClicked = async () => {
		closeMenu();

		try {
			const onRecord = await isFlowOnRecording(story, flow);
			if (onRecord) {
				// on recording
				remote.dialog.showMessageBox(remote.getCurrentWindow(), {
					type: 'error',
					title: 'On recording.',
					message: `Cannot rename flow [${flow.name}@${story.name}] when it is on recording. Please stop recording manually, and then rename it.`
				});
			} else {
				renameFlow(story, flow);
			}
		} catch {}
	};
	const onDeleteClicked = async () => {
		closeMenu();

		try {
			const onRecord = await isFlowOnRecording(story, flow);
			if (onRecord) {
				remote.dialog.showMessageBox(remote.getCurrentWindow(), {
					type: 'error',
					title: 'On recording.',
					message: `Cannot delete flow [${flow.name}@${story.name}] when it is on recording. Please stop recording manually, and then delete it.`
				});
			} else {
				deleteFlow(story, flow);
			}
		} catch {}
	};
	const onCreateFlowClicked = () => {
		closeMenu();
		createFlow(story);
	};
	return (
		<PopMenus {...anchorOptions} close={closeMenu}>
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
	item: {
		paddingLeft: theme.spacing(3),
		paddingTop: 0,
		paddingBottom: 0,
		'& > .MuiListItemIcon-root': {
			minWidth: theme.spacing(3),
			'& > svg': {
				fontSize: '1rem',
				opacity: myTheme.opacityForFontColor
			}
		},
		'& > .MuiListItemText-root': {
			overflowX: 'hidden',
			whiteSpace: 'nowrap',
			textOverflow: 'ellipsis',
			'& > span': {
				fontSize: '0.8rem',
				opacity: myTheme.opacityForFontColor
			}
		}
	},
	icon: {
		color: myTheme.flowIconColor
	}
}));

export default (props: {
	story: Story;
	flow: Flow;
	openFlow: (story: Story, flow: Flow) => void;
	deleteFlow: (story: Story, flow: Flow) => void;
	renameFlow: (story: Story, flow: Flow) => void;
	createFlow: (story: Story) => void;
}): JSX.Element => {
	const { story, flow, openFlow, ...operations } = props;
	const classes = useStyles();
	const flowItemRef = React.createRef<HTMLDivElement>();

	const [anchorOptions, setAnchorOptions] = React.useState({ open: false, top: 0, left: 0 });
	const closeMenu = () => setAnchorOptions({ open: false, top: 0, left: 0 });
	const onFlowClicked = (event: React.MouseEvent): void => openFlow(story, flow);
	const onMouseUp = (event: React.MouseEvent): void => {
		if (event.button === 2) {
			setAnchorOptions({ open: true, top: event.clientY, left: event.clientX });
		}
	};

	const menusProps = { anchorOptions, story, flow, closeMenu, ...operations };

	return (
		<Fragment>
			<ListItem
				button
				key={flow.name}
				className={classes.item}
				onClick={onFlowClicked}
				onMouseUp={onMouseUp}
				ref={flowItemRef}
			>
				<ListItemIcon>
					<FlowIcon className={classes.icon} />
				</ListItemIcon>
				<ListItemText primary={flow.name} />
			</ListItem>
			<PopMenu {...menusProps} />
		</Fragment>
	);
};
