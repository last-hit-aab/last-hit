import { Grid } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import React from 'react';
import { Flow, Story } from '../../workspace-settings';
import { FlowEditArea } from '../flow';
import NavigatorTabs from './navigator-tabs';

const useStyles = makeStyles(theme => ({
	root: {
		flexGrow: 1,
		height: '100%',
		width: 'calc(100vw - 350px)',
		flexWrap: 'nowrap'
	},
	main: {
		flexGrow: 1,
		overflow: 'hidden',
		alignItems: 'stretch',
		'& > *': {
			flexGrow: 1
		}
	}
}));
export default (props: {
	openedFlows: { story: Story; flow: Flow }[];
	activeFlow: { story: Story; flow: Flow } | null;
	changeActiveFlow: (story: Story, flow: Flow) => void;
	removeOpenedFlow: (story: Story, flow: Flow) => void;
	removeOtherFlows: (story: Story, flow: Flow) => void;
	removeAllOpenedFlows: (story: Story, flow: Flow) => void;
}): JSX.Element => {
	const {
		openedFlows = [],
		activeFlow,
		changeActiveFlow,
		removeOpenedFlow,
		removeOtherFlows,
		removeAllOpenedFlows
	} = props;
	const classes = useStyles({});

	return (
		<Grid container item className={classes.root} direction="column">
			<NavigatorTabs
				flows={openedFlows}
				activeFlow={activeFlow}
				changeActiveFlow={changeActiveFlow}
				removeOpenedFlow={removeOpenedFlow}
				removeOtherFlows={removeOtherFlows}
				removeAllOpenedFlows={removeAllOpenedFlows}
			/>
			<Grid item container className={classes.main}>
				{openedFlows.map(tab => {
					const show = tab.story === activeFlow!.story && tab.flow === activeFlow!.flow;
					return <FlowEditArea {...tab} show={show} key={`${tab.story.name}-${tab.flow.name}`} />;
				})}
			</Grid>
		</Grid>
	);
};
