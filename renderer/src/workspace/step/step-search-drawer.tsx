import {
	Button,
	Colors,
	ControlGroup,
	Drawer,
	InputGroup,
	ITreeNode,
	ITreeProps,
	Tree
} from '@blueprintjs/core';
import { Flow, Step, Story } from 'last-hit-types';
import React from 'react';
import styled from 'styled-components';
import uuidv4 from 'uuid/v4';
import { getActiveWorkspace } from '../../active';
import UIContext from '../../common/context';
import IDESettings from '../../common/ide-settings';
import { EventTypes } from '../../events';
import { getFlowIcon } from '../flow/utils';
import { getStepIcon, getStepTypeText } from './utils';

enum MatchType {
	HUMAN = 0,
	URL = 1,
	XPATH = 2,
	'CSS-PATH' = 3,
	'CUSTOM-PATH' = 4,
	TARGET = 5
}
type MatchedChunk = { highlight: boolean; start: number; end: number };
type Matched = { matchType: MatchType; chunks: MatchedChunk[] };
type MatchedStep = { step: Step; matches: Matched[] };
type MatchedFlow = { flow: Flow; steps: MatchedStep[] };
type MatchedStory = { story: Story; flows: MatchedFlow[] };
type SearchResult = MatchedStory[];
type TreeNode = ITreeNode<MatchedStory | MatchedFlow | MatchedStep | Matched>;

const {
	padding: { body },
	gap
} = IDESettings.getStyles();

const Container = styled.div`
	padding: ${() => `${body}px`};
	display: grid;
	grid-template-columns: 1fr;
	grid-template-rows: auto auto 1fr;
	height: 100%;
	> div:first-child {
		padding-bottom: ${() => `${gap}px`};
	}
	> .hidden {
		display: none;
	}
`;
const ScrolledTree = styled(Tree)`
	overflow: auto;
	height: calc(100% - ${() => `${gap}px`});
	margin-top: ${() => `${gap}px`};
	.bp3-tree-node {
		> .bp3-tree-node-content {
			> .bp3-tree-node-secondary-label {
				display: flex;
				> button {
					border-radius: 100%;
					transform: scale(0.8);
					width: 32px;
					display: none;
				}
			}
			.replace-to {
				display: none;
			}
			&:hover {
				> .bp3-tree-node-secondary-label {
					> button[data-remove='true'] {
						display: inline-flex;
					}
				}
			}
		}
	}
	&.show-replacement {
		.bp3-tree-node {
			> .bp3-tree-node-content {
				&:hover {
					> .bp3-tree-node-secondary-label {
						> button[data-replace='true'] {
							display: inline-flex;
						}
					}
				}
				.replace-from {
					text-decoration: line-through;
				}
				.replace-to {
					display: inline;
				}
			}
		}
	}
	.matched-count {
		font-size: 0.8em;
		margin-left: ${() => `${gap}px`};
	}
`;
const MatchLabel = styled.span`
	> .match-type {
		color: ${() => Colors.BLUE3};
	}
	> span:not(:last-child) {
		margin-right: 4px;
	}
	> span:last-child > .highlight {
		padding: 0 4px;
		border-radius: 2px;
		&.replace-from {
			background-color: ${() => Colors.VERMILION4};
		}
		&.replace-to {
			background-color: ${() => Colors.FOREST4};
		}
	}
`;

const generateSearchRegexp = (text: string, caseSensitive: boolean, useRegexp: boolean): RegExp => {
	let test: RegExp;
	if (useRegexp) {
		if (caseSensitive) {
			// regexp and case not sensitive
			test = new RegExp(text, 'g');
		} else {
			// regexp and case sensitive
			test = new RegExp(text, 'gi');
		}
	} else {
		// escape to regexp string
		// eslint-disable-next-line
		const escapedText = text.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
		if (caseSensitive) {
			// case not sensitive
			test = new RegExp(escapedText, 'g');
		} else {
			test = new RegExp(escapedText, 'gi');
		}
	}
	return test;
};

const buildStepLabelText = (step: Step, match: Matched, replacement?: string): JSX.Element => {
	const { matchType, chunks } = match;
	let matched: string;
	switch (matchType) {
		case MatchType.HUMAN:
			matched = step.human!;
			break;
		case MatchType.URL:
			matched = (step as any).url;
			break;
		case MatchType.XPATH:
			matched = step.path!;
			break;
		case MatchType['CSS-PATH']:
			matched = step.csspath!;
			break;
		case MatchType['CUSTOM-PATH']:
			matched = (step as any).custompath;
			break;
		case MatchType.TARGET:
			matched = (step as any).target;
			break;
	}
	const matchedText = chunks
		.map(({ highlight, start, end }, index: number) => {
			const pair = [];
			const segment = matched.substr(start, end - start);
			if (index === 0) {
				if (start !== 0) {
					pair.push(<span>{matched.substr(0, start)}</span>);
				} else {
					// matched for first character, do nothing
				}
			} else {
				const previous = chunks[index - 1];
				if (start - previous.end > 1) {
					pair.push(<span>{matched.substr(previous.end, start - previous.end)}</span>);
				} else {
					// continue matched, do nothing
				}
			}
			if (replacement) {
				pair.push(<span className="highlight replace-from">{segment}</span>);
				pair.push(<span className="highlight replace-to">{replacement}</span>);
			} else {
				pair.push(<span className="highlight replace-from">{segment}</span>);
				pair.push(<span className="highlight replace-to"></span>);
			}
			return pair;
		})
		.flat();
	if (chunks[chunks.length - 1].end !== matched!.length - 1) {
		matchedText.push(<span>{matched!.substr(chunks[chunks.length - 1].end)}</span>);
	}
	return (
		<MatchLabel>
			<span className="match-type">[{MatchType[matchType]}]</span>
			<span className="match-text">[{matchedText}]</span>
		</MatchLabel>
	);
};

const doSearch = (options: {
	searchText: string;
	caseSensitive: boolean;
	useRegexp: boolean;
}): SearchResult => {
	const { searchText, caseSensitive, useRegexp } = options;

	const matchedItems: SearchResult = [];
	const structure = getActiveWorkspace()!.getStructure();
	const test = generateSearchRegexp(searchText, caseSensitive, useRegexp);

	(structure.stories || []).forEach(story => {
		let matchedStory: MatchedStory | null = null;
		(story.flows || []).forEach(flow => {
			let matchedFlow: MatchedFlow | null = null;
			(flow.steps || []).forEach(step => {
				const match = [
					step.human,
					(step as any).url,
					step.path,
					step.csspath,
					(step as any).custompath,
					(step as any).target
				].map((content: string) => {
					const chunks: MatchedChunk[] = [];
					let match;
					while ((match = test.exec(content))) {
						let start = match.index;
						let end = test.lastIndex;
						// We do not return zero-length matches
						if (end > start) {
							chunks.push({ highlight: true, start, end });
						}

						// Prevent browsers like Firefox from getting stuck in an infinite loop
						// See http://www.regexguru.com/2008/04/watch-out-for-zero-length-matches/
						if (match.index === test.lastIndex) {
							test.lastIndex++;
						}
					}

					return chunks;
				});
				if (match.some(chunks => chunks.length !== 0)) {
					// match anyone
					if (!matchedStory) {
						matchedStory = { story, flows: [] };
						matchedItems.push(matchedStory);
					}
					if (!matchedFlow) {
						matchedFlow = { flow, steps: [] };
						matchedStory.flows.push(matchedFlow);
					}
					matchedFlow.steps.push({
						step,
						matches: match
							.map((chunks: MatchedChunk[], index: number) => {
								return { matchType: index, chunks };
							})
							.filter(({ chunks }) => chunks.length !== 0)
					});
				}
			});
		});
	});
	return matchedItems;
};

const TheDialog = (): JSX.Element => {
	const { emitter } = React.useContext(UIContext);
	const close = () => {
		emitter.emit(EventTypes.CLOSE_STEP_SEARCH_DRAWER);
	};

	let searchTextInputRef: HTMLInputElement | null = null;
	let replaceTextInputRef: HTMLInputElement | null = null;

	const [ignored, forceUpdate] = React.useReducer(x => x + 1, 0);
	const [caseSensitive, setCaseSensitive] = React.useState(false);
	const [useRegexp, setUseRegexp] = React.useState(false);
	const [showReplacement, setShowReplacement] = React.useState(false);
	const [matchedItems, setMatchedItems] = React.useState([] as Array<TreeNode>);
	React.useEffect(() => {
		emitter
			.on(EventTypes.ASK_REMOVE_STEP_SEARCH_ITEM, onRemoveFromListClicked)
			.on(EventTypes.ASK_REPLACE_STEP_SEARCH_ITEM, onReplaceItemClicked);
		return () => {
			emitter
				.off(EventTypes.ASK_REMOVE_STEP_SEARCH_ITEM, onRemoveFromListClicked)
				.off(EventTypes.ASK_REPLACE_STEP_SEARCH_ITEM, onReplaceItemClicked);
		};
	});

	const onCaseSensitiveClicked = (): void => setCaseSensitive(!caseSensitive);
	const onUseRegexpClicked = (): void => setUseRegexp(!useRegexp);
	const onShowReplacementClicked = (): void => {
		setShowReplacement(!showReplacement);
		repaintReplacementText();
	};

	const repaintReplacementText = (): void => {
		const replacement = replaceTextInputRef!.value;
		document.querySelectorAll('.highlight.replace-to').forEach(element => {
			element.innerHTML = replacement;
		});
	};

	const buildItemActions = (options: {
		story: MatchedStory;
		flow?: MatchedFlow;
		step?: MatchedStep;
		match?: Matched;
	}): JSX.Element => {
		const { story, flow, step, match } = options;
		return (
			<React.Fragment>
				<Button
					minimal={true}
					intent="danger"
					icon="form"
					title="Replace"
					onClick={(event: React.MouseEvent<HTMLElement, MouseEvent>): void => {
						event.preventDefault();
						event.stopPropagation();
						emitter.emit(
							EventTypes.ASK_REPLACE_STEP_SEARCH_ITEM,
							story,
							flow,
							step,
							match
						);
					}}
					data-replace="true"
				/>
				<Button
					minimal={true}
					intent="danger"
					icon="cross"
					title="Remove from list"
					onClick={(event: React.MouseEvent<HTMLElement, MouseEvent>): void => {
						event.preventDefault();
						event.stopPropagation();
						emitter.emit(
							EventTypes.ASK_REMOVE_STEP_SEARCH_ITEM,
							story,
							flow,
							step,
							match
						);
					}}
					data-remove="true"
				/>
			</React.Fragment>
		);
	};
	const buildStoryNode = (matchedStory: MatchedStory, replacement?: string): TreeNode => {
		const matchedCount = (matchedStory.flows || []).reduce(
			(times, flow) => times + (flow.steps || []).length,
			0
		);
		return {
			label: (
				<React.Fragment>
					<span>{matchedStory.story.name}</span>
					<span className="matched-count">({matchedCount} matched)</span>
				</React.Fragment>
			),
			icon: 'heatmap',
			id: uuidv4(),
			hasCaret: true,
			isExpanded: true,
			nodeData: matchedStory,
			secondaryLabel: buildSecondLabel(matchedStory),
			childNodes: (matchedStory.flows || []).map((matchedFlow: MatchedFlow) =>
				buildFlowNode(matchedStory, matchedFlow, replacement)
			)
		} as TreeNode;
	};

	const buildFlowNode = (
		matchedStory: MatchedStory,
		matchedFlow: MatchedFlow,
		replacement?: string
	): TreeNode => {
		return {
			label: (
				<React.Fragment>
					<span>{matchedFlow.flow.name}</span>
					<span className="matched-count">
						({(matchedFlow.steps || []).length} matched)
					</span>
				</React.Fragment>
			),
			icon: getFlowIcon(matchedFlow.flow),
			id: uuidv4(),
			hasCaret: true,
			isExpanded: true,
			nodeData: matchedFlow,
			secondaryLabel: buildSecondLabel(matchedStory, matchedFlow),
			childNodes: (matchedFlow.steps || []).map((matchedStep: MatchedStep) =>
				buildStepNode(matchedStory, matchedFlow, matchedStep, replacement)
			)
		} as TreeNode;
	};

	const buildStepNode = (
		matchedStory: MatchedStory,
		matchedFlow: MatchedFlow,
		matchedStep: MatchedStep,
		replacement?: string
	): TreeNode => {
		const { step, matches } = matchedStep;
		const stepIndex = 1 + matchedFlow.flow.steps!.indexOf(step);
		return {
			label: `#${stepIndex} ${getStepTypeText(step)}`,
			icon: getStepIcon(step),
			id: uuidv4(),
			hasCaret: true,
			isExpanded: true,
			nodeData: matchedStep,
			secondaryLabel: buildSecondLabel(matchedStory, matchedFlow, matchedStep),
			childNodes: (matches || []).map((match: Matched) =>
				buildMatchNode(matchedStory, matchedFlow, matchedStep, match, replacement)
			)
		} as TreeNode;
	};

	const buildMatchNode = (
		matchedStory: MatchedStory,
		matchedFlow: MatchedFlow,
		matchedStep: MatchedStep,
		match: Matched,
		replacement?: string
	): TreeNode => {
		return {
			label: buildStepLabelText(matchedStep.step, match, replacement),
			icon: 'right-join',
			id: uuidv4(),
			hasCaret: false,
			nodeData: match,
			secondaryLabel: buildSecondLabel(matchedStory, matchedFlow, matchedStep, match)
		} as TreeNode;
	};

	const buildSecondLabel = (
		story: MatchedStory,
		flow?: MatchedFlow,
		step?: MatchedStep,
		match?: Matched
	): JSX.Element => {
		return buildItemActions({ story, flow, step, match });
	};

	const rebuildContents = (): void => {
		const searchText = searchTextInputRef!.value;
		if (searchText.trim().length === 0) {
			setMatchedItems([]);
		} else {
			const replacement = showReplacement ? replaceTextInputRef!.value : undefined;
			// do search
			setMatchedItems(
				doSearch({
					searchText,
					useRegexp,
					caseSensitive
				}).map((matchedStory: MatchedStory) => buildStoryNode(matchedStory, replacement))
			);
		}
	};
	const onKeyPressed = (event: React.KeyboardEvent<HTMLInputElement>): void => {
		if (event.key !== 'Enter') {
			return;
		}
		rebuildContents();
	};
	let replacementChangeHandler: number;
	const onReplacementChanged = (): void => {
		if (replacementChangeHandler) {
			clearTimeout(replacementChangeHandler);
		}
		replacementChangeHandler = setTimeout(repaintReplacementText, 300);
	};
	const replaceMatch = (
		story: MatchedStory,
		flow: MatchedFlow,
		matchedStep: MatchedStep,
		match: Matched,
		removeFromList: boolean = false
	): void => {
		const regex = generateSearchRegexp(searchTextInputRef!.value, caseSensitive, useRegexp);
		const replacement = replaceTextInputRef!.value;
		const { step } = matchedStep;
		const { matchType } = match;
		switch (matchType) {
			case MatchType.HUMAN:
				step.human = step.human!.replace(regex, replacement);
				break;
			case MatchType.URL:
				(step as any).url = (step as any).url!.replace(regex, replacement);
				break;
			case MatchType.XPATH:
				step.path = step.path!.replace(regex, replacement);
				break;
			case MatchType['CSS-PATH']:
				step.csspath = step.csspath!.replace(regex, replacement);
				break;
			case MatchType['CUSTOM-PATH']:
				(step as any).custompath = (step as any).custompath!.replace(regex, replacement);
				break;
			case MatchType.TARGET:
				(step as any).target = (step as any).target!.replace(regex, replacement);
				break;
		}
		if (removeFromList) {
			removeMatchFromList(story, flow, matchedStep, match);
			emitter.emit(EventTypes.ASK_SAVE_FLOW, story.story, flow.flow);
		}
	};
	const replaceStep = (
		story: MatchedStory,
		flow: MatchedFlow,
		step: MatchedStep,
		removeFromList: boolean = false
	): void => {
		step.matches.forEach(match => replaceMatch(story, flow, step, match));
		if (removeFromList) {
			removeStepFromList(story, flow, step);
			emitter.emit(EventTypes.ASK_SAVE_FLOW, story.story, flow.flow);
		}
	};
	const replaceFlow = (
		story: MatchedStory,
		flow: MatchedFlow,
		removeFromList: boolean = false
	): void => {
		flow.steps.forEach(step => replaceStep(story, flow, step));
		removeFromList && removeFlowFromList(story, flow);
		emitter.emit(EventTypes.ASK_SAVE_FLOW, story.story, flow.flow);
	};
	const replaceStory = (story: MatchedStory, removeFromList: boolean = false): void => {
		story.flows.forEach(flow => replaceFlow(story, flow));
		removeFromList && removeStoryFromList(story);
	};
	const onReplaceAllClicked = (): void => {
		// console.log(matchedItems);
		matchedItems.forEach(story => replaceStory(story.nodeData as MatchedStory));
		setMatchedItems([]);
	};
	const onReplaceItemClicked = (
		story: MatchedStory,
		flow?: MatchedFlow,
		step?: MatchedStep,
		match?: Matched
	): void => {
		if (match) {
			replaceMatch(story, flow!, step!, match, true);
		} else if (step) {
			replaceStep(story, flow!, step, true);
		} else if (flow) {
			replaceFlow(story, flow, true);
		} else {
			replaceStory(story, true);
		}
	};
	const removeStoryFromList = (story: MatchedStory): void => {
		setMatchedItems(matchedItems.filter(storyNode => storyNode.nodeData !== story));
	};
	const removeFlowFromList = (story: MatchedStory, flow: MatchedFlow): void => {
		setMatchedItems(
			matchedItems.filter(storyNode => {
				if (storyNode.nodeData === story) {
					storyNode.childNodes = storyNode.childNodes!.filter(
						flowNode => flowNode.nodeData !== flow
					);
					if (storyNode.childNodes!.length === 0) {
						return false;
					} else {
						return true;
					}
				} else {
					return true;
				}
			})
		);
	};
	const removeStepFromList = (story: MatchedStory, flow: MatchedFlow, step: MatchedStep) => {
		setMatchedItems(
			matchedItems.filter(storyNode => {
				if (storyNode.nodeData === story) {
					storyNode.childNodes = storyNode.childNodes!.filter(flowNode => {
						if (flowNode.nodeData === flow) {
							flowNode.childNodes = flowNode.childNodes!.filter(
								stepNode => stepNode.nodeData !== step
							);
							if (flowNode.childNodes!.length === 0) {
								return false;
							} else {
								return true;
							}
						} else {
							return true;
						}
					});
					if (storyNode.childNodes!.length === 0) {
						return false;
					} else {
						return true;
					}
				} else {
					return true;
				}
			})
		);
	};
	const removeMatchFromList = (
		story: MatchedStory,
		flow: MatchedFlow,
		step: MatchedStep,
		match: Matched
	): void => {
		setMatchedItems(
			matchedItems.filter(storyNode => {
				if (storyNode.nodeData === story) {
					storyNode.childNodes = storyNode.childNodes!.filter(flowNode => {
						if (flowNode.nodeData === flow) {
							flowNode.childNodes = flowNode.childNodes!.filter(stepNode => {
								if (stepNode.nodeData === step) {
									stepNode.childNodes = stepNode.childNodes!.filter(
										matchNode => matchNode.nodeData !== match
									);
									if (stepNode.childNodes!.length === 0) {
										return false;
									} else {
										return true;
									}
								} else {
									return true;
								}
							});
							if (flowNode.childNodes!.length === 0) {
								return false;
							} else {
								return true;
							}
						} else {
							return true;
						}
					});
					if (storyNode.childNodes!.length === 0) {
						return false;
					} else {
						return true;
					}
				} else {
					return true;
				}
			})
		);
	};
	const onRemoveFromListClicked = (
		story: MatchedStory,
		flow?: MatchedFlow,
		step?: MatchedStep,
		match?: Matched
	): void => {
		if (!flow) {
			removeStoryFromList(story);
		} else if (!step) {
			removeFlowFromList(story, flow);
		} else if (!match) {
			removeStepFromList(story, flow, step);
		} else {
			removeMatchFromList(story, flow, step, match);
		}
	};
	const onNodeCollapsed = (node: TreeNode): void => {
		node.isExpanded = false;
		forceUpdate(ignored);
	};
	const onNodeExpanded = (node: TreeNode): void => {
		node.isExpanded = true;
		forceUpdate(ignored);
	};

	const treeProps: ITreeProps<MatchedStory | MatchedFlow | MatchedStep | Matched> = {
		onNodeCollapse: onNodeCollapsed,
		onNodeExpand: onNodeExpanded,
		contents: matchedItems
	};

	return (
		<Drawer
			isOpen={true}
			onClose={close}
			autoFocus={true}
			isCloseButtonShown={true}
			position="left"
			size="70%"
			title="Step search">
			<Container>
				<ControlGroup fill={true} vertical={false}>
					<InputGroup
						placeholder="Search"
						fill={true}
						rightElement={
							<React.Fragment>
								<Button
									icon="bold"
									minimal={true}
									title={caseSensitive ? 'Case insensitive' : 'Case sensitive'}
									active={caseSensitive}
									intent="warning"
									onClick={onCaseSensitiveClicked}
								/>
								<Button
									icon="send-to-graph"
									minimal={true}
									title={useRegexp ? 'Use text match' : 'Use regexp'}
									active={useRegexp}
									intent="warning"
									onClick={onUseRegexpClicked}
								/>
								<Button
									icon="refresh"
									minimal={true}
									title={
										showReplacement ? 'Hide replacement' : 'Show replacement'
									}
									active={showReplacement}
									intent="warning"
									onClick={onShowReplacementClicked}
								/>
							</React.Fragment>
						}
						inputRef={input => (searchTextInputRef = input)}
						onKeyPress={onKeyPressed}
					/>
				</ControlGroup>
				<ControlGroup
					fill={true}
					vertical={false}
					className={showReplacement ? '' : 'hidden'}>
					<InputGroup
						placeholder="Replacement"
						fill={true}
						rightElement={
							<React.Fragment>
								<Button
									icon="build"
									intent="primary"
									title="Rebuild replacement"
									onClick={rebuildContents}
								/>

								<Button
									icon="automatic-updates"
									intent="danger"
									title="Replace"
									onClick={onReplaceAllClicked}
								/>
							</React.Fragment>
						}
						inputRef={input => (replaceTextInputRef = input)}
						onKeyPress={onKeyPressed}
						onChange={onReplacementChanged}
					/>
				</ControlGroup>
				<ScrolledTree
					{...(treeProps as any)}
					className={showReplacement ? 'show-replacement' : ''}
				/>
			</Container>
		</Drawer>
	);
};

export default (): JSX.Element => {
	const { emitter } = React.useContext(UIContext);

	const [opened, setOpened] = React.useState(false);
	React.useEffect(() => {
		const openMe = (): void => setOpened(true);
		const closeMe = (): void => setOpened(false);

		emitter
			.on(EventTypes.ASK_STEP_SEARCH, openMe)
			.on(EventTypes.CLOSE_STEP_SEARCH_DRAWER, closeMe);

		return () => {
			emitter
				.off(EventTypes.ASK_STEP_SEARCH, openMe)
				.off(EventTypes.CLOSE_STEP_SEARCH_DRAWER, closeMe);
		};
	});

	if (opened) {
		return <TheDialog />;
	} else {
		return <React.Fragment />;
	}
};
