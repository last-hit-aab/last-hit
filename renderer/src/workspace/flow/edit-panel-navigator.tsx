import { Button, Colors, ITreeNode, ITreeProps, Tree } from '@blueprintjs/core';
import { Flow, Step, Story } from 'last-hit-types';
import React from 'react';
import styled from 'styled-components';
import UIContext from '../../common/context';
import { EventTypes } from '../../events';
import { getStepIcon, getStepText } from '../step/utils';

export type TreeNode = ITreeNode<Step>;

const Container = styled.div`
	display: flex;
	border-right: 1px solid ${() => Colors.DARK_GRAY5};
	height: 100%;
	overflow: auto;
`;
const ScrolledTree = styled(Tree)`
	overflow: auto;
	flex-grow: 1;
	.bp3-tree-node {
		> .bp3-tree-node-content {
			> .bp3-tree-node-label {
				text-transform: capitalize;
			}
			> .bp3-tree-node-secondary-label {
				> button:last-child {
					border: 1px solid;
					font-size: 0.7rem;
					border-radius: 25%;
					transform: scale(0.7);
					padding: 4px;
				}
				> button {
					border-radius: 100%;
					transform: scale(0.8);
					width: 32px;
					&.move-up,
					&.move-down,
					&.break-me {
						display: none;
					}
				}
			}
			&:hover {
				> .bp3-tree-node-secondary-label {
					> button {
						&.move-up,
						&.move-down {
							display: inline-flex;
						}
					}
				}
			}
		}
		&.breakpoint {
			> .bp3-tree-node-content {
				> .bp3-tree-node-secondary-label {
					> button {
						&.break-me {
							display: inline-flex;
						}
					}
				}
			}
		}
	}
`;

const getNodeClassName = (step: Step): string => {
	const classes: Array<string> = [];
	if (step.breakpoint) {
		classes.push('breakpoint');
	}
	return classes.join(' ');
};

const canMoveUp = (node: TreeNode, allNodes: Array<TreeNode>): boolean => {
	const index = allNodes.indexOf(node);
	if (index === 0) {
		return false;
	} else if (index === 1) {
		return allNodes[0].nodeData!.type !== 'start';
	} else {
		return node.nodeData!.type !== 'end';
	}
};
const canMoveDown = (node: TreeNode, allNodes: Array<TreeNode>): boolean => {
	const lastIndex = allNodes.length - 1;
	const index = allNodes.indexOf(node);
	if (index === lastIndex) {
		return false;
	} else if (index === lastIndex - 1) {
		return allNodes[lastIndex].nodeData!.type !== 'end';
	} else {
		return node.nodeData!.type !== 'start';
	}
};

const buildSecondLabels = (
	contents: Array<TreeNode>,
	onMoveUpClicked: (step: Step) => void,
	onMoveDownClicked: (step: Step) => void
): Array<TreeNode> => {
	const buildSecondLabelForNode = (
		node: TreeNode,
		index: number,
		allNodes: Array<TreeNode>
	): void => {
		const canUp = canMoveUp(node, allNodes);
		const canDown = canMoveDown(node, allNodes);
		if (canUp || canDown) {
			node.secondaryLabel = (
				<React.Fragment>
					{canUp ? (
						<Button
							minimal={true}
							intent="danger"
							icon="arrow-up"
							className="move-up"
							title="Move Up"
							onClick={(event: React.MouseEvent<HTMLElement, MouseEvent>): void => {
								event.preventDefault();
								event.stopPropagation();
								onMoveUpClicked(node.nodeData!);
							}}
						/>
					) : null}
					{canDown ? (
						<Button
							minimal={true}
							intent="danger"
							icon="arrow-down"
							className="move-down"
							title="Move Down"
							onClick={(event: React.MouseEvent<HTMLElement, MouseEvent>): void => {
								event.preventDefault();
								event.stopPropagation();
								onMoveDownClicked(node.nodeData!);
							}}
						/>
					) : null}
					<Button minimal={true} intent="danger" icon="pause" className="break-me" />
					<Button minimal={true} intent="primary" text={index} />
				</React.Fragment>
			);
		} else {
			node.secondaryLabel = (
				<React.Fragment>
					<Button minimal={true} intent="danger" icon="pause" className="break-me" />
					<Button minimal={true} intent="primary" text={index} />
				</React.Fragment>
			);
		}
	};
	let globalIndex: number = 1;
	contents.forEach((node: TreeNode, index: number, allNodes: Array<TreeNode>) => {
		buildSecondLabelForNode(node, globalIndex++, allNodes);
		(node.childNodes || []).forEach(
			(node: TreeNode, index: number, allNodes: Array<TreeNode>) => {
				buildSecondLabelForNode(node, globalIndex++, allNodes);
			}
		);
	});
	return contents;
};

const buildContents = (
	flow: Flow,
	onMoveUpClicked: (step: Step) => void,
	onMoveDownClicked: (step: Step) => void
): Array<TreeNode> => {
	const contents = (flow.steps || [])
		.map((step: Step, index: number) => {
			return {
				id: step.stepUuid || index,
				label: getStepText(step, flow),
				nodeData: step,
				icon: getStepIcon(step),
				className: getNodeClassName(step)
			} as TreeNode;
		})
		.reduce((all, node) => {
			if (node.nodeData!.type === 'ajax') {
				const parent = all[all.length - 1];
				if (!parent.childNodes) {
					parent.childNodes = [];
				}
				parent.childNodes.push(node);
			} else {
				all.push(node);
			}
			return all;
		}, [] as Array<TreeNode>);

	if (contents.length !== 0) {
		contents[0].isSelected = true;
	}
	buildSecondLabels(contents, onMoveUpClicked, onMoveDownClicked);
	return contents;
};

const unselectOtherNodes = (contents: Array<TreeNode>, selection: TreeNode): void => {
	contents.forEach(node => {
		if (node !== selection) {
			node.isSelected = false;
		}
		if (node.childNodes) {
			unselectOtherNodes(node.childNodes, selection);
		}
	});
};

const rebuildNodeClassName = (node: TreeNode, step: Step): boolean => {
	if (node.nodeData === step) {
		node.className = getNodeClassName(step);
		return true;
	} else {
		return false;
	}
};

const rebuildSteps = (contents: Array<TreeNode>): Array<Step> => {
	const steps: Array<Step> = [];
	contents.forEach(node => {
		steps.push(node.nodeData!);
		(node.childNodes || []).forEach(node => steps.push(node.nodeData!));
	});
	return steps;
};

/**
 * 1 means move down, -1 means move up
 */
const swapStep = (contents: Array<TreeNode>, step: Step, how: 1 | -1): Array<TreeNode> => {
	contents.some((node: TreeNode, nodeIndex: number) => {
		if (node.nodeData === step) {
			// swap
			// remove me from contents
			contents.splice(nodeIndex, 1);
			// add me after next
			contents.splice(nodeIndex + how, 0, node);

			if (!node.isSelected) {
				node.isSelected = true;
				unselectOtherNodes(contents, node);
			}
			return true;
		} else {
			return (node.childNodes || []).some(
				(subNode: TreeNode, subIndex: number, nodes: Array<TreeNode>) => {
					if (subNode.nodeData === step) {
						// swap
						// remove me from nodes
						nodes.splice(subIndex, 1);
						// add me after next
						nodes.splice(subIndex + how, 0, subNode);

						if (!subNode.isSelected) {
							subNode.isSelected = true;
							unselectOtherNodes(contents, subNode);
						}
						return true;
					} else {
						return false;
					}
				}
			);
		}
	});
	return [...contents];
};

export default (props: { story: Story; flow: Flow }): JSX.Element => {
	const { story, flow } = props;
	const { emitter } = React.useContext(UIContext);

	const onMoveUpClicked = (step: Step): void =>
		rebuildContents(swapStep(contents, step, -1), step);
	const onMoveDownClicked = (step: Step): void =>
		rebuildContents(swapStep(contents, step, 1), step);
	const onFlowRecordDialogClose = (theStory: Story, theFlow: Flow): void => {
		if (story === theStory && flow === theFlow) {
			setContents(buildContents(flow, onMoveUpClicked, onMoveDownClicked));
			emitter.emit(EventTypes.STEP_SELECTED, story, flow, flow.steps![0]);
		}
	};
	const onFlowReloadDialogClose = (theStory: Story, theFlow: Flow): void => {
		if (theStory === story && theFlow === flow) {
			setContents(buildContents(flow, onMoveUpClicked, onMoveDownClicked));
		}
	};

	// force render
	const [ignored, forceUpdate] = React.useReducer(x => x + 1, 0);
	const [contents, setContents] = React.useState(
		buildContents(flow, onMoveUpClicked, onMoveDownClicked)
	);
	React.useEffect(() => {
		emitter
			.on(EventTypes.STEP_BREAKPOINT_CHANGED, onStepBreakpointChanged)
			.on(EventTypes.STEP_DELETED, onStepDeleted)
			.on(EventTypes.CLOSE_FLOW_RECORD_DIALOG, onFlowRecordDialogClose)
			.on(EventTypes.CLOSE_FLOW_RELOAD_DIALOG, onFlowReloadDialogClose);
		return () => {
			emitter
				.off(EventTypes.STEP_BREAKPOINT_CHANGED, onStepBreakpointChanged)
				.off(EventTypes.STEP_DELETED, onStepDeleted)
				.off(EventTypes.CLOSE_FLOW_RECORD_DIALOG, onFlowRecordDialogClose)
				.off(EventTypes.CLOSE_FLOW_RELOAD_DIALOG, onFlowReloadDialogClose);
		};
	});

	const rebuildContents = (contents: Array<TreeNode>, selectedStep?: Step): void => {
		const newContents = buildSecondLabels(contents, onMoveUpClicked, onMoveDownClicked);
		flow.steps = rebuildSteps(newContents);
		setContents(newContents);
		if (selectedStep) {
			emitter.emit(EventTypes.STEP_SELECTED, story, flow, selectedStep);
		}
		emitter.emit(EventTypes.ASK_SAVE_FLOW, story, flow);
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
	const onNodeClick = (node: TreeNode): void => {
		node.isSelected = true;
		unselectOtherNodes(contents, node);
		forceUpdate(ignored);
		emitter.emit(EventTypes.STEP_SELECTED, story, flow, node.nodeData!);
	};
	const onStepBreakpointChanged = (theStory: Story, theFlow: Flow, theStep: Step): void => {
		if (flow !== theFlow) {
			return;
		}
		contents.some(
			node =>
				rebuildNodeClassName(node, theStep) ||
				(node.childNodes || []).some(node => rebuildNodeClassName(node, theStep))
		);
		forceUpdate(ignored);
		emitter.emit(EventTypes.ASK_SAVE_FLOW, story, flow);
	};
	const onStepDeleted = (theStory: Story, theFlow: Flow, theStep: Step): void => {
		if (flow !== theFlow) {
			return;
		}

		const newContents = contents.filter((node: TreeNode, nodeIndex: number) => {
			if (node.nodeData === theStep) {
				// remove it, and all sub nodes
				// select next node
				// there always a next node since next node cannot be deleted
				contents[nodeIndex + 1].isSelected = true;
				emitter.emit(
					EventTypes.STEP_SELECTED,
					story,
					flow,
					contents[nodeIndex + 1].nodeData!
				);
				return false;
			} else {
				// remove when sub node is the step
				node.childNodes = (node.childNodes || []).filter(
					(subNode: TreeNode, subNodeIndex: number, nodes: Array<TreeNode>) => {
						if (subNode.nodeData !== theStep) {
							return true;
						} else {
							if (subNodeIndex === nodes.length - 1) {
								contents[nodeIndex + 1].isSelected = true;
								emitter.emit(
									EventTypes.STEP_SELECTED,
									story,
									flow,
									contents[nodeIndex + 1].nodeData!
								);
							} else {
								nodes[subNodeIndex + 1].isSelected = true;
								emitter.emit(
									EventTypes.STEP_SELECTED,
									story,
									flow,
									nodes[subNodeIndex + 1].nodeData!
								);
							}
							return false;
						}
					}
				);
				if (node.childNodes.length === 0) {
					delete node.childNodes;
				}
				return true;
			}
		});
		rebuildContents(newContents);
	};

	const treeProps: ITreeProps<Step> = { contents, onNodeCollapse, onNodeExpand, onNodeClick };

	return (
		<Container>
			<ScrolledTree {...(treeProps as any)} />
		</Container>
	);
};
