import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import React from 'react';
import { getTheme, Workspace, Workspaces } from '../global-settings';
import { openWorkspaceByFolder } from '../workspace-settings';

const myTheme = getTheme();
const useStyles = makeStyles({
	root: {
		backgroundColor: myTheme.splashOutlineBackgroundColor
	},
	list: {
		paddingTop: 0,
		paddingBottom: 0,
		'& .MuiListItem-container': {
			'& .MuiListItemSecondaryAction-root': {
				visibility: 'hidden',
				opacity: 0,
				transition: 'opacity 300ms ease-in-out',
				'& > button': {
					color: myTheme.splashOperationColor,
					fontSize: '1rem',
					'&:hover': {
						backgroundColor: 'unset'
					}
				}
			},
			'&:hover': {
				backgroundColor: myTheme.splashOutlineHoverBackgroundColor,
				'& .MuiListItemSecondaryAction-root': {
					visibility: 'visible',
					opacity: 1
				}
			}
		}
	},
	item: {
		color: myTheme.splashOperationColor,
		paddingTop: 0,
		paddingBottom: 0,
		'& > .MuiListItemText-root': {
			'& > span:first-child': {
				whiteSpace: 'nowrap',
				overflowX: 'hidden',
				textOverflow: 'ellipsis'
			},
			'& > span:last-child': {
				display: 'block',
				whiteSpace: 'nowrap',
				overflowX: 'hidden',
				fontSize: '0.8rem',
				opacity: 0.5,
				textOverflow: 'ellipsis',
				width: '100%'
			}
		}
	}
});

export default (props: { workspaces: Workspaces }): JSX.Element => {
	const { workspaces } = props;
	const classes = useStyles();

	const onWorkspaceOpenClicked = (workspace: Workspace): void => {
		openWorkspaceByFolder(workspace.path);
	};
	const onRemoveWorkspaceClicked = (workspace: Workspace): void => {
		workspaces.removeWorkspace(workspace);
	};

	if (!workspaces.hasWorkspace()) {
		return <React.Fragment />;
	} else {
		return (
			<Grid item xs={5} className={classes.root}>
				<List component="nav" className={classes.list}>
					{workspaces.getWorkspaces().map((workspace, index) => {
						return (
							<ListItem
								button
								className={classes.item}
								key={`${workspace.name}-${index}`}
								title={workspace.path}
								onClick={() => onWorkspaceOpenClicked(workspace)}
							>
								<ListItemText
									primary={workspace.name}
									secondary={<Typography component="span">{workspace.path}</Typography>}
								/>
								<ListItemSecondaryAction onClick={() => onRemoveWorkspaceClicked(workspace)}>
									<IconButton edge="end" aria-label="delete">
										<FontAwesomeIcon icon={faTimes} />
									</IconButton>
								</ListItemSecondaryAction>
							</ListItem>
						);
					})}
				</List>
			</Grid>
		);
	}
};
