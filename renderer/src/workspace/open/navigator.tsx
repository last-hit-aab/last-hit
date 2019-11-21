import {
	AnchorButton,
	ContextMenu,
	ITreeNode,
	Label,
	Menu,
	MenuItem,
	Tree
} from '@blueprintjs/core';
import React from 'react';
import styled from 'styled-components';
import { getActiveWorkspace } from '../../active';
import IDESettings from '../../common/ide-settings';
import { asFlowKey } from '../../files';
import { Flow, Story, WorkspaceStructure } from '../../types';
import StoryCreateDialog from '../story/create-dialog';
import UIContext from '../../common/context';
import { EventTypes } from '../../events';

const {
	padding: { horizontal, vertical }
} = IDESettings.getStyles();

const Container = styled.div`
	display: flex;
	flex-direction: column;
	width: 300px;
`;
const Title = styled.h6`
	padding: ${() => `${horizontal}px ${vertical * 2}px 0 ${vertical * 2}px`};
`;

const ScrolledTree = styled(Tree)`
	overflow: auto;
	flex-grow: 1;
`;

const NoContentContainer = styled.div`
	display: flex;
	align-items: center;
	flex-grow: 1;
	> label {
		flex-grow: 1;
		text-align: right;
	}
	> a {
		flex-grow: 1;
		justify-content: flex-start;
		text-decoration: underline;
		&.bp3-button.bp3-intent-primary.bp3-minimal {
			&:hover,
			&:active {
				text-decoration: underline;
				background-color: transparent;
			}
		}
	}
`;

const WorkspaceTree = (props: { contents: Array<ITreeNode<Story>> }): JSX.Element => {
	const { contents } = props;

	const [storyCreateDialogOpened, setStoryCreateDialogOpened] = React.useState(false);
	const [ignored, forceUpdate] = React.useReducer(x => x + 1, 0);

	const onCreateStoryClicked = (): void => setStoryCreateDialogOpened(true);
	if (contents.length === 0) {
		return (
			<NoContentContainer>
				<Label className="margin-bottom-0">No story yet, </Label>
				<AnchorButton
					text="create new one"
					onClick={onCreateStoryClicked}
					minimal={true}
					intent="primary"
				/>
				<StoryCreateDialog
					open={storyCreateDialogOpened}
					close={() => setStoryCreateDialogOpened(false)}
				/>
			</NoContentContainer>
		);
	}

	const onRenameStoryClicked = (): void => {};
	const onDeleteStoryClicked = (): void => {};
	const onCreateFlowClicked = (): void => {};
	const onRenameFlowClicked = (): void => {};
	const onDeleteFlowClicked = (): void => {};

	const onNodeCollapse = (node: ITreeNode<any>): void => {
		node.isExpanded = false;
		node.icon = 'folder-close';
		forceUpdate(ignored);
	};
	const onNodeExpand = (node: ITreeNode<any>): void => {
		node.isExpanded = true;
		node.icon = 'folder-open';
		forceUpdate(ignored);
	};
	const onNodeContextMenu = (
		node: ITreeNode<any>,
		nodePath: number[],
		e: React.MouseEvent<HTMLElement>
	): void => {
		if (node.hasCaret) {
			// is story
			// mouse position is available on event
			ContextMenu.show(storyContextMenu, { left: e.clientX, top: e.clientY });
		} else {
			// is flow
			ContextMenu.show(flowContextMenu, { left: e.clientX, top: e.clientY });
		}
	};

	const storyContextMenu = (
		<Menu>
			<MenuItem text="New Story" onClick={onCreateStoryClicked} />
			<MenuItem text="New Flow" onClick={onCreateFlowClicked} />
			<Menu.Divider />
			<MenuItem text="Rename" onClick={onRenameStoryClicked} />
			<MenuItem text="Delete" onClick={onDeleteStoryClicked} />
		</Menu>
	);
	const flowContextMenu = (
		<Menu>
			<MenuItem text="New Flow" onClick={onCreateFlowClicked} />
			<Menu.Divider />
			<MenuItem text="Rename" onClick={onRenameFlowClicked} />
			<MenuItem text="Delete" onClick={onDeleteFlowClicked} />
		</Menu>
	);

	return (
		<React.Fragment>
			<ScrolledTree
				contents={contents}
				onNodeCollapse={onNodeCollapse}
				onNodeExpand={onNodeExpand}
				onNodeContextMenu={onNodeContextMenu}
			/>
			<StoryCreateDialog
				open={storyCreateDialogOpened}
				close={() => setStoryCreateDialogOpened(false)}
			/>
		</React.Fragment>
	);
};

const buildFlowNodes = (story: Story): Array<ITreeNode<Flow>> => {
	return (story.flows || []).map((flow: Flow) => {
		return {
			id: `flow:${asFlowKey(flow, story)}`,
			icon: 'document',
			hasCaret: false,
			label: flow.name,
			nodeData: flow
		} as ITreeNode<Flow>;
	});
};
const buildStoryNode = (story: Story): ITreeNode<Story> => {
	return {
		id: `story:${story.name}`,
		icon: 'folder-close',
		isExpanded: false,
		hasCaret: true,
		label: story.name,
		nodeData: story,
		childNodes: buildFlowNodes(story)
	} as ITreeNode<Story>;
};

const buildContents = (workspace: WorkspaceStructure): Array<ITreeNode<Story>> => {
	return (workspace.stories || []).map((story: Story) => buildStoryNode(story));
};

export default () => {
	const workspace = getActiveWorkspace()!.getStructure();
	const contents = buildContents(workspace);

	const { emitter } = React.useContext(UIContext);
	const [showMe, setShowMe] = React.useState(true);

	React.useEffect(() => {
		const toggleMe = () => setShowMe(!showMe);
		emitter.on(EventTypes.TOGGLE_NAVIGATOR, toggleMe);
		return () => {
			emitter.off(EventTypes.TOGGLE_NAVIGATOR, toggleMe);
		};
	});

	if (!showMe) {
		return <React.Fragment />;
	}

	return (
		<Container>
			<Title className="bp3-heading">Navigator</Title>
			<WorkspaceTree contents={contents} />
		</Container>
	);
};
