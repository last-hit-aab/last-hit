import { ITreeNode } from '@blueprintjs/core';
import React from 'react';
import { getActiveWorkspace } from '../../../active';
import UIContext from '../../../common/context';
import { asFlowKey } from '../../../files';
import { Flow, Story, WorkspaceStructure } from '../../../types';
import ContentTree from './content-tree';
import NoContentTree from './no-content-tree';
import { EventTypes } from '../../../events';

type TreeNode = ITreeNode<Story | { story: Story; flow: Flow }>;

const buildFlowNodes = (story: Story): Array<TreeNode> => {
	return (story.flows || []).map((flow: Flow) => {
		return {
			id: `flow:${asFlowKey(flow, story)}`,
			icon: 'document',
			hasCaret: false,
			label: flow.name,
			nodeData: { story, flow }
		} as TreeNode;
	});
};

const buildStoryNode = (story: Story, selected: boolean = false): TreeNode => {
	return {
		id: `story:${story.name}`,
		icon: 'folder-close',
		isExpanded: false,
		isSelected: selected,
		hasCaret: true,
		label: story.name,
		nodeData: story,
		childNodes: buildFlowNodes(story)
	} as TreeNode;
};

const buildContents = (workspace: WorkspaceStructure): Array<TreeNode> => {
	return (workspace.stories || []).map((story: Story) => buildStoryNode(story)).sort(sorter);
};

const sorter = (a: TreeNode, b: TreeNode): number => {
	return (a.label as string).localeCompare(b.label as string);
};

export default () => {
	const [contents, setContents] = React.useState(
		buildContents(getActiveWorkspace()!.getStructure())
	);
	const { emitter } = React.useContext(UIContext);
	React.useEffect(() => {
		emitter.on(EventTypes.STORY_CREATED, onStoryCreated);
		emitter.on(EventTypes.STORY_RENAMED, onStoryRenamed);

		return () => {
			emitter.off(EventTypes.STORY_CREATED, onStoryCreated);
			emitter.off(EventTypes.STORY_RENAMED, onStoryRenamed);
		};
	});

	const onStoryCreated = (story: Story): void => {
		const newContents = [...contents];
		newContents.push(buildStoryNode(story, true));
		setContents(newContents.sort(sorter));
	};
	const onStoryRenamed = (story: Story): void => {
		const newContents = [...contents];
		const node = newContents.find(node => node.nodeData === story);

		if (node) {
			node.label = story.name;
			node.id = `story:${story.name}`;
			(node.childNodes || []).forEach(flowNode => {
				const nodeData = flowNode.nodeData! as { story: Story; flow: Flow };
				flowNode.id = `flow:${asFlowKey(nodeData.flow, story)}`;
			});
			setContents(newContents.sort(sorter));
		}
	};

	if (!contents || contents.length === 0) {
		return <NoContentTree />;
	} else {
		return <ContentTree contents={contents} />;
	}
};
