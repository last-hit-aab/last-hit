import { Link, List, makeStyles, Typography } from '@material-ui/core';
import React, { Fragment } from 'react';
import { getTheme } from '../../global-settings';
import { Flow, Story } from '../../workspace-settings';
import FlowItem from './outline-flow';

const myTheme = getTheme();
const useFlowListStyles = makeStyles(theme => ({
	root: {
		paddingTop: 0,
		paddingBottom: 0,
		marginLeft: -theme.spacing(3),
		marginRight: -theme.spacing(1)
	},
	link: {
		opacity: myTheme.opacityForFontColor,
		fontSize: '0.8rem',
		'& + a': {
			cursor: 'pointer',
			filter: 'brightness(150%)'
		}
	}
}));

export default (props: {
	story: Story;
	openFlow: (story: Story, flow: Flow) => void;
	createFlow: (story: Story) => void;
	renameFlow: (story: Story, flow: Flow) => void;
	deleteFlow: (story: Story, flow: Flow) => void;
}): JSX.Element => {
	const { story, openFlow, createFlow, renameFlow, deleteFlow } = props;
	const classes = useFlowListStyles({});
	if (!story.flows || story.flows.length === 0) {
		return (
			<span>
				<Typography variant="body2" className={classes.link} display="inline">
					No flow yet,{' '}
				</Typography>
				<Link underline="always" onClick={() => createFlow(story)}>
					create new one
				</Link>
			</span>
		);
	}

	return (
		<Fragment>
			<List className={classes.root}>
				{story.flows!.map(flow => {
					return <FlowItem story={story} flow={flow} {...{ openFlow, createFlow, renameFlow, deleteFlow }} />;
				})}
			</List>
		</Fragment>
	);
};
