import AppBar from '@material-ui/core/AppBar';
import Grid from '@material-ui/core/Grid';
import Link from '@material-ui/core/Link';
import { makeStyles } from '@material-ui/core/styles';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import React, { Fragment } from 'react';
import { getTheme } from '../../global-settings';
import { getCurrentWorkspace, Story, Flow } from '../../workspace-settings';
import OutlineStory from './outline-story';

const myTheme = getTheme();

const useOutlineStyles = makeStyles(theme => ({
	outlineContent: {
		width: 'calc(100% - 48px)',
		height: '100%'
	},
	outlineTopBar: {
		boxShadow: myTheme.outlineTopBarBoxShadow,
		backgroundColor: 'transparent'
	},
	outlineTitle: {
		flexGrow: 1
	},
	outlineMenuButton: {
		marginLeft: theme.spacing(2)
	},
	outlineNavigator: {
		flexGrow: 1,
		marginTop: 2,
		marginLeft: 2,
		// marginRight: 1,
		overflowY: 'scroll',
		'&:hover::-webkit-scrollbar-thumb': {
			opacity: 1
		},
		'&::-webkit-scrollbar': {
			backgroundColor: 'transparent',
			width: 8
		},
		'&::-webkit-scrollbar-thumb': {
			backgroundColor: myTheme.outlineScrollBarThumbBackgroundColor
		}
	},
	createLinkContainer: {
		padding: theme.spacing(2),
		opacity: myTheme.opacityForFontColor,
		height: '100%',
		userSelect: 'none',
		'& a': {
			cursor: 'pointer',
			filter: 'brightness(150%)'
		}
	}
}));

export default (props: {
	collapsed: boolean;
	expandedStory: false | Story;
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
		collapsed,
		expandedStory,
		toggleExpandedStory,
		createStory,
		renameStory,
		deleteStory,
		openFlow,
		createFlow,
		renameFlow,
		deleteFlow
	} = props;
	if (collapsed) {
		return <Fragment />;
	}

	const flowOperations = { openFlow, createFlow, renameFlow, deleteFlow };
	const storyOperations = { createStory, renameStory, deleteStory };
	const classes = useOutlineStyles({});
	const workspace = getCurrentWorkspace();

	return (
		<Grid item className={classes.outlineContent} container direction="column" wrap="nowrap">
			<AppBar position="relative" className={classes.outlineTopBar}>
				<Toolbar>
					<Typography variant="h6" className={classes.outlineTitle}>
						{workspace.settings.name}
					</Typography>
				</Toolbar>
			</AppBar>
			<Grid item className={classes.outlineNavigator}>
				{workspace.structure.stories.length === 0 ? (
					<Grid container className={classes.createLinkContainer} alignItems="center" justify="center">
						<Typography>
							No story yet,{' '}
							<Link underline="always" onClick={createStory}>
								create new one
							</Link>
						</Typography>
					</Grid>
				) : (
					workspace.structure.stories
						.sort((a, b) => a.name.localeCompare(b.name))
						.map(story => {
							return (
								<OutlineStory
									expanded={story === expandedStory}
									key={story.name}
									story={story}
									toggleExpandedStory={toggleExpandedStory}
									{...storyOperations}
									{...flowOperations}
								/>
							);
						})
				)}
			</Grid>
		</Grid>
	);
};
