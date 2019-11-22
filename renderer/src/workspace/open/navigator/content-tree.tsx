import { ContextMenu, ITreeProps, Menu, MenuItem, Tree } from '@blueprintjs/core';
import React from 'react';
import styled from 'styled-components';
import UIContext from '../../../common/context';
import { EventTypes } from '../../../events';
import { Flow, Story } from '../../../types';
import { selectNode, TreeNode, TreeNodeData } from './utils';

const ScrolledTree = styled(Tree)`
	overflow: auto;
	flex-grow: 1;
`;

export default (props: { contents: Array<TreeNode> }): JSX.Element => {
	const { contents } = props;
	const { emitter } = React.useContext(UIContext);

	// force render
	const [ignored, forceUpdate] = React.useReducer(x => x + 1, 0);

	const onCreateStoryClicked = (): void => {
		emitter.emit(EventTypes.ASK_CREATE_STORY);
	};
	const onRenameStoryClicked = (story: Story): void => {
		emitter.emit(EventTypes.ASK_RENAME_STORY, story);
	};
	const onDeleteStoryClicked = (story: Story): void => {
		emitter.emit(EventTypes.ASK_DELETE_STORY, story);
	};
	const onCreateFlowClicked = (story: Story): void => {
		emitter.emit(EventTypes.ASK_CREATE_FLOW, story);
	};
	const onRenameFlowClicked = (story: Story, flow: Flow): void => {
		emitter.emit(EventTypes.ASK_RENAME_FLOW, story, flow);
	};
	const onDeleteFlowClicked = (story: Story, flow: Flow): void => {
		emitter.emit(EventTypes.ASK_DELETE_FLOW, story, flow);
	};

	const onNodeCollapse = (node: TreeNode): void => {
		node.isExpanded = false;
		(node.childNodes || []).forEach(flowNode => (flowNode.isSelected = false));
		forceUpdate(ignored);
	};
	const onNodeExpand = (node: TreeNode): void => {
		node.isExpanded = true;
		forceUpdate(ignored);
	};
	const createStoryContextMenu = (story: Story): JSX.Element => {
		return (
			<Menu>
				<MenuItem text="New Story" onClick={onCreateStoryClicked} />
				<MenuItem text="New Flow" onClick={() => onCreateFlowClicked(story)} />
				<Menu.Divider />
				<MenuItem text="Rename" onClick={() => onRenameStoryClicked(story)} />
				<MenuItem text="Delete" onClick={() => onDeleteStoryClicked(story)} />
			</Menu>
		);
	};
	const createFlowContextMenu = (data: { story: Story; flow: Flow }): JSX.Element => {
		const { story, flow } = data;
		return (
			<Menu>
				<MenuItem text="New Flow" onClick={() => onCreateFlowClicked(story)} />
				<Menu.Divider />
				<MenuItem text="Rename" onClick={() => onRenameFlowClicked(story, flow)} />
				<MenuItem text="Delete" onClick={() => onDeleteFlowClicked(story, flow)} />
			</Menu>
		);
	};
	const onNodeContextMenu = (
		node: TreeNode,
		nodePath: number[],
		e: React.MouseEvent<HTMLElement>
	): void => {
		e.preventDefault();
		selectNode(contents, node);
		forceUpdate(ignored);
		if (node.hasCaret) {
			// is story
			// mouse position is available on event
			ContextMenu.show(createStoryContextMenu(node.nodeData as Story), {
				left: e.clientX,
				top: e.clientY
			});
		} else {
			// is flow
			ContextMenu.show(createFlowContextMenu(node.nodeData as { story: Story; flow: Flow }), {
				left: e.clientX,
				top: e.clientY
			});
		}
	};
	const onNodeDoubleClick = (node: TreeNode): void => {
		if (!node.hasCaret) {
			selectNode(contents, node);
			forceUpdate(ignored);
			const { story, flow } = node.nodeData as { story: Story; flow: Flow };
			emitter.emit(EventTypes.ASK_OPEN_FLOW, story, flow);
		}
	};

	const treeProps: ITreeProps<TreeNodeData> = {
		contents,
		onNodeCollapse,
		onNodeExpand,
		onNodeContextMenu,
		onNodeDoubleClick
	};
	return <ScrolledTree {...(treeProps as any)} />;
};
