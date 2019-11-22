import { ITreeNode } from '@blueprintjs/core';
import { Flow, Story } from '../../../types';

export type TreeNodeData = Story | { story: Story; flow: Flow };
export type TreeNode = ITreeNode<TreeNodeData>;

export const selectNode = (contents: Array<TreeNode>, selection: TreeNode): void => {
	contents.forEach(storyNode => {
		if (storyNode === selection) {
			storyNode.isSelected = true;
			storyNode.isExpanded = true;
		} else {
			storyNode.isSelected = false;
		}
		(storyNode.childNodes || []).forEach(flowNode => {
			if (flowNode === selection) {
				flowNode.isSelected = true;
				storyNode.isExpanded = true;
			} else {
				flowNode.isSelected = false;
			}
		});
	});
};
