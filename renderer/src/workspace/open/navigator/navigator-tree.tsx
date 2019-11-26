import React from 'react';
import { getActiveWorkspace } from '../../../active';
import UIContext from '../../../common/context';
import { EventTypes } from '../../../events';
import { asFlowKey } from '../../../files';
import { Flow, Story, WorkspaceStructure } from '../../../types';
import ContentTree from './content-tree';
import NoContentTree from './no-content-tree';
import { selectNode, TreeNode } from './utils';
import { getFlowIcon } from '../../flow/utils';

const buildFlowNode = (story: Story, flow: Flow): TreeNode => {
	return {
		id: `flow:${asFlowKey(flow, story)}`,
		icon: getFlowIcon(flow),
		hasCaret: false,
		label: flow.name,
		nodeData: { story, flow }
	} as TreeNode;
};

const buildFlowNodes = (story: Story): Array<TreeNode> => {
	return (story.flows || []).map((flow: Flow) => buildFlowNode(story, flow)).sort(sorter);
};

const buildStoryNode = (story: Story): TreeNode => {
	return {
		id: `story:${story.name}`,
		icon: 'heatmap',
		isExpanded: false,
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
		emitter
			.on(EventTypes.STORY_CREATED, onStoryCreated)
			.on(EventTypes.STORY_RENAMED, onStoryRenamed)
			.on(EventTypes.STORY_DELETED, onStoryDeleted)
			.on(EventTypes.FLOW_CREATED, onFlowCreated)
			.on(EventTypes.FLOW_RENAMED, onFlowRenamed)
			.on(EventTypes.FLOW_DELETED, onFlowDeleted)
			.on(EventTypes.CLOSE_FLOW_SETTINGS_DIALOG, onFlowSettingsDialogClosed);

		return () => {
			emitter
				.off(EventTypes.STORY_CREATED, onStoryCreated)
				.off(EventTypes.STORY_RENAMED, onStoryRenamed)
				.off(EventTypes.STORY_DELETED, onStoryDeleted)
				.off(EventTypes.FLOW_CREATED, onFlowCreated)
				.off(EventTypes.FLOW_RENAMED, onFlowRenamed)
				.off(EventTypes.FLOW_DELETED, onFlowDeleted)
				.off(EventTypes.CLOSE_FLOW_SETTINGS_DIALOG, onFlowSettingsDialogClosed);
		};
	});

	const onStoryCreated = (story: Story): void => {
		const newContents = [...contents];
		const storyNode = buildStoryNode(story);
		newContents.push(storyNode);
		selectNode(newContents, storyNode);
		setContents(newContents.sort(sorter));
	};
	const onStoryRenamed = (story: Story): void => {
		const newContents = [...contents];
		const node = newContents.find(node => node.nodeData === story);

		if (node) {
			node.label = story.name;
			node.id = `story:${story.name}`;
			selectNode(newContents, node);
			(node.childNodes || []).forEach(flowNode => {
				const nodeData = flowNode.nodeData! as { story: Story; flow: Flow };
				flowNode.id = `flow:${asFlowKey(nodeData.flow, story)}`;
			});
			setContents(newContents.sort(sorter));
		}
	};
	const onStoryDeleted = (story: Story): void => {
		const newContents = contents.filter(node => node.nodeData !== story);
		setContents(newContents);
	};
	const onFlowCreated = (story: Story, flow: Flow): void => {
		const newContents = [...contents];
		const storyNode = newContents.find(node => node.nodeData === story);
		if (storyNode) {
			const flowNode = buildFlowNode(story, flow);
			storyNode.childNodes!.push(flowNode);
			storyNode.childNodes!.sort(sorter);
			selectNode(newContents, flowNode);
			setContents(newContents);
		}
	};
	const onFlowRenamed = (story: Story, flow: Flow): void => {
		const newContents = [...contents];
		const storyNode = newContents.find(node => node.nodeData === story);
		if (storyNode) {
			const flowNode = storyNode.childNodes!.find(
				node => (node.nodeData as { story: Story; flow: Flow }).flow === flow
			);
			if (flowNode) {
				flowNode.label = flow.name;
				flowNode.id = `flow:${asFlowKey(flow, story)}`;
				storyNode.childNodes!.sort(sorter);
				selectNode(newContents, flowNode);
				setContents(newContents);
			}
		}
	};
	const onFlowDeleted = (story: Story, flow: Flow): void => {
		const newContents = [...contents];
		const storyNode = newContents.find(node => node.nodeData === story);
		if (storyNode) {
			storyNode.childNodes = storyNode.childNodes!.filter(
				node => (node.nodeData as { story: Story; flow: Flow }).flow !== flow
			);
			setContents(newContents);
		}
	};
	const onFlowSettingsDialogClosed = (story: Story, flow: Flow): void => {
		contents.some(storyNode => {
			if (storyNode.nodeData === story) {
				return (storyNode.childNodes || []).some(flowNode => {
					if ((flowNode.nodeData! as { story: Story; flow: Flow }).flow === flow) {
						flowNode.icon = getFlowIcon(flow);
						return true;
					} else {
						return false;
					}
				});
			} else {
				return false;
			}
		});
		setContents([...contents]);
	};

	if (!contents || contents.length === 0) {
		return <NoContentTree />;
	} else {
		return <ContentTree contents={contents} />;
	}
};
