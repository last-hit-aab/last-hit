import { ContextMenu, ITreeNode, Menu, MenuItem, Tree } from '@blueprintjs/core';
import React from 'react';
import styled from 'styled-components';
import UIContext from '../../../common/context';
import { EventTypes } from '../../../events';
import { Flow, Story } from '../../../types';

const ScrolledTree = styled(Tree)`
	overflow: auto;
	flex-grow: 1;
`;

export default (props: {
	contents: Array<ITreeNode<Story | { story: Story; flow: Flow }>>;
}): JSX.Element => {
	const { contents } = props;
	const { emitter } = React.useContext(UIContext);

	// force render
	const [ignored, forceUpdate] = React.useReducer(x => x + 1, 0);

	const onCreateStoryClicked = (): void => {
		emitter.emit(EventTypes.OPEN_STORY_CREATE_DIALOG);
	};
	const onRenameStoryClicked = (story: Story): void => {
		emitter.emit(EventTypes.OPEN_STORY_RENAME_DIALOG, story);
	};
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
	const createStoryContextMenu = (story: Story): JSX.Element => {
		return (
			<Menu>
				<MenuItem text="New Story" onClick={onCreateStoryClicked} />
				<MenuItem text="New Flow" onClick={onCreateFlowClicked} />
				<Menu.Divider />
				<MenuItem text="Rename" onClick={() => onRenameStoryClicked(story)} />
				<MenuItem text="Delete" onClick={onDeleteStoryClicked} />
			</Menu>
		);
	};
	const createFlowContextMenu = (data: { story: Story; flow: Flow }): JSX.Element => {
		return (
			<Menu>
				<MenuItem text="New Flow" onClick={onCreateFlowClicked} />
				<Menu.Divider />
				<MenuItem text="Rename" onClick={onRenameFlowClicked} />
				<MenuItem text="Delete" onClick={onDeleteFlowClicked} />
			</Menu>
		);
	};
	const onNodeContextMenu = (
		node: ITreeNode<any>,
		nodePath: number[],
		e: React.MouseEvent<HTMLElement>
	): void => {
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

	return (
		<ScrolledTree
			contents={contents}
			onNodeCollapse={onNodeCollapse}
			onNodeExpand={onNodeExpand}
			onNodeContextMenu={onNodeContextMenu}
		/>
	);
};
