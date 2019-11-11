import Grid from '@material-ui/core/Grid';
import { makeStyles } from '@material-ui/core/styles';
import { remote } from 'electron';
import React from 'react';
import { getTheme } from '../../global-settings';
import { deleteFlowFromCurrentWorkspace, deleteStoryFromCurrentWorkspace, Flow, Story } from '../../workspace-settings';
import { FlowCreate, FlowRename } from '../flow';
import { StoryCreate, StoryRename } from '../story';
import OultineContent from './outline-content';
import OutlineIconBar from './outline-icon-bar';

const myTheme = getTheme();
const useStyles = makeStyles(theme => ({
	outline: {
		width: 350,
		height: '100%',
		boxShadow: myTheme.outlineBoxShadow
	},
	outlineCollapsed: {
		width: 48
	}
}));

export default (props: {
	openFlow: (story: Story, flow: Flow) => void;
	onFlowRenamed: (story: Story, flow: Flow) => void;
	onFlowDeleted: (story: Story, flow: Flow) => void;
	forceUpdateAll: () => void;
}): JSX.Element => {
	const { openFlow, forceUpdateAll } = props;

	const classes = useStyles({});

	const [ignored, forceUpdate] = React.useReducer((x: number): number => x + 1, 0);
	const [state, setState] = React.useState({
		collapsed: false as boolean,
		expandedStory: false as (false | Story),
		storyCreateDialogOpened: false as boolean,
		renamingStory: null as (Story | null),
		storyToCreateFlow: null as (Story | null),
		renamingFlow: null as ({ story: Story; flow: Flow } | null)
	});
	const onOutlineCollapseToggleClicked = () => setState({ ...state, collapsed: !state.collapsed });
	const toggleExpandedStory = (story: Story): void =>
		setState({ ...state, expandedStory: state.expandedStory === story ? false : story });
	const createStory = (): void => setState({ ...state, storyCreateDialogOpened: true });
	const onStoryCreated = (story: Story): void =>
		setState({ ...state, expandedStory: story, storyCreateDialogOpened: false });
	const renameStory = (story: Story): void => setState({ ...state, renamingStory: story });
	const onStoryRenamed = (story: Story): void => setState({ ...state, renamingStory: null });
	const deleteStory = async (story: Story) => {
		remote.dialog
			.showMessageBox(remote.getCurrentWindow(), {
				type: 'question',
				title: 'Story delete',
				message: `Are you sure to delete story "${story.name}"?`,
				detail: 'All contents will be deleted.',
				buttons: ['OK', 'Cancel']
			})
			.then(({ response }) => {
				if (response === 0) {
					try {
						deleteStoryFromCurrentWorkspace(story);
						if (story === state.expandedStory) {
							setState({ ...state, storyCreateDialogOpened: false });
						} else {
							forceUpdate(ignored);
						}
					} catch (e) {
						console.log(e);
						remote.dialog.showMessageBox(remote.getCurrentWindow(), {
							type: 'error',
							title: 'Invalid Input',
							message: `Failed to delete story "${story.name}".`,
							detail: typeof e === 'string' ? e : e.message
						});
					}
				}
			});
	};
	const createFlow = (story: Story): void => setState({ ...state, storyToCreateFlow: story });
	const onFlowCreated = (story: Story, flow: Flow): void => {
		setState({ ...state, expandedStory: story, storyToCreateFlow: null });
		openFlow(story, flow);
	};
	const renameFlow = (story: Story, flow: Flow): void => setState({ ...state, renamingFlow: { story, flow } });
	const onFlowRenamed = (story: Story, flow: Flow): void => {
		// console.log(flow.name);
		props.onFlowRenamed(story, flow);
		setState({ ...state, renamingFlow: null });
	};
	const deleteFlow = async (story: Story, flow: Flow) => {
		remote.dialog
			.showMessageBox(remote.getCurrentWindow(), {
				type: 'question',
				title: 'Flow delete',
				message: `Are you sure to delete flow "${flow.name} @ ${story.name}"?`,
				detail: 'All contents will be deleted.',
				buttons: ['OK', 'Cancel']
			})
			.then(({ response }) => {
				if (response === 0) {
					try {
						deleteFlowFromCurrentWorkspace(story, flow);
						forceUpdate(ignored);
						props.onFlowDeleted(story, flow);
					} catch (e) {
						console.log(e);
						remote.dialog.showMessageBox(remote.getCurrentWindow(), {
							type: 'error',
							title: 'Invalid Input',
							message: `Failed to delete flow "${flow.name} @ ${story.name}".`,
							detail: typeof e === 'string' ? e : e.message
						});
					}
				}
			});
	};

	return (
		<Grid item className={state.collapsed ? classes.outlineCollapsed : classes.outline} container>
			<OutlineIconBar
				onToggle={onOutlineCollapseToggleClicked}
				collapsed={state.collapsed}
				createStory={createStory}
				forceUpdateAll={forceUpdateAll}
			/>
			<OultineContent
				collapsed={state.collapsed}
				expandedStory={state.expandedStory}
				toggleExpandedStory={toggleExpandedStory}
				createStory={createStory}
				renameStory={renameStory}
				deleteStory={deleteStory}
				openFlow={openFlow}
				createFlow={createFlow}
				renameFlow={renameFlow}
				deleteFlow={deleteFlow}
			/>
			<StoryCreate
				opened={state.storyCreateDialogOpened}
				close={() => setState({ ...state, storyCreateDialogOpened: false })}
				onCreated={onStoryCreated}
			/>
			<StoryRename
				renamingStory={state.renamingStory}
				close={() => setState({ ...state, renamingStory: null })}
				onRenamed={onStoryRenamed}
			/>
			<FlowCreate
				story={state.storyToCreateFlow}
				close={() => setState({ ...state, storyToCreateFlow: null })}
				onCreated={onFlowCreated}
			/>
			<FlowRename
				renamingStory={state.renamingFlow && state.renamingFlow.story}
				renamingFlow={state.renamingFlow && state.renamingFlow.flow}
				close={() => setState({ ...state, renamingFlow: null })}
				onRenamed={onFlowRenamed}
			/>
		</Grid>
	);
};
