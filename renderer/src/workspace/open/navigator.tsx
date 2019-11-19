import { ITreeNode, Tree, Menu, MenuItem, ContextMenu } from '@blueprintjs/core';
import React from 'react';
import styled from 'styled-components';
import { getActiveWorkspace } from '../../active';
import IDESettings from '../../common/ide-settings';
import { asFlowKey } from '../../files';
import { Flow, Story } from '../../types';

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

const WorkspaceTree = (props: { contents: Array<ITreeNode<Story>> }): JSX.Element => {
	const { contents } = props;
	const [ignored, forceUpdate] = React.useReducer(x => x + 1, 0);

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
			<MenuItem text="New Story" />
			<MenuItem text="New Flow" />
			<Menu.Divider />
			<MenuItem text="Rename" />
			<MenuItem text="Delete" />
		</Menu>
	);
	const flowContextMenu = (
		<Menu>
			<MenuItem text="New Flow" />
			<Menu.Divider />
			<MenuItem text="Rename" />
			<MenuItem text="Delete" />
		</Menu>
	);

	return (
		<ScrolledTree
			contents={contents}
			onNodeCollapse={onNodeCollapse}
			onNodeExpand={onNodeExpand}
			onNodeContextMenu={onNodeContextMenu}
		/>
	);
};

export default () => {
	const workspace = getActiveWorkspace()!.getStructure();
	const contents = (workspace.stories || []).map((story: Story) => {
		const node: ITreeNode<Story> = {
			id: `story:${story.name}`,
			icon: 'folder-close',
			isExpanded: false,
			hasCaret: true,
			label: story.name,
			nodeData: story,
			childNodes: (story.flows || []).map((flow: Flow) => {
				return {
					id: `flow:${asFlowKey(flow, story)}`,
					icon: 'document',
					hasCaret: false,
					label: flow.name,
					nodeData: flow
				} as ITreeNode<Flow>;
			})
		};
		return node;
	});

	return (
		<Container>
			<Title className="bp3-heading">Navigator</Title>
			<WorkspaceTree contents={contents} />
		</Container>
	);
};
