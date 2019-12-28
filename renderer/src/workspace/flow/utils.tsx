import { Flow, Story } from 'last-hit-types';
import { IUIEventEmitter } from '../../common/context';
import { EventTypes } from '../../events';
import { FlowUIStatus, FlowUIStatusEnum, WorkspaceStructure } from '../../types';

const getUIStatusOfFlow = async (
	emitter: IUIEventEmitter,
	story: Story,
	flow: Flow
): Promise<FlowUIStatusEnum> => {
	return new Promise(resolve => {
		emitter
			.on(
				EventTypes.FLOW_OPEN_CHECK_RESULT,
				(theStory: Story, theFlow: Flow, open: boolean): void => {
					if (!open) {
						resolve(FlowUIStatusEnum.NOT_OPEN);
					} else {
						const statusListener = (
							story: Story,
							flow: Flow,
							status: FlowUIStatusEnum
						): void => {
							if (story === theStory && flow === theFlow) {
								emitter.off(EventTypes.FLOW_STATUS_CHECK_RESULT, statusListener);
								resolve(status);
							}
						};
						emitter
							.on(EventTypes.FLOW_STATUS_CHECK_RESULT, statusListener)
							.emit(EventTypes.FLOW_STATUS_CHECK, theStory, theFlow);
					}
				}
			)
			.emit(EventTypes.FLOW_OPEN_CHECK, story, flow);
	});
};

export const getUIStatusOfFlows = async (
	emitter: IUIEventEmitter,
	flows: Array<{ story: Story; flow: Flow }>
): Promise<Array<FlowUIStatus>> => {
	return await Promise.all(
		flows.map(
			async (item): Promise<FlowUIStatus> => {
				const status = await getUIStatusOfFlow(emitter, item.story, item.flow);
				return { status, ...item };
			}
		)
	);
};

export const isIdle = (status: FlowUIStatusEnum): boolean =>
	[FlowUIStatusEnum.NOT_OPEN, FlowUIStatusEnum.IDLE].includes(status);

/**
 * returns true when all give flows are not open or idle
 */
export const isFlowsAllOnIdle = async (
	emitter: IUIEventEmitter,
	flows: Array<{ story: Story; flow: Flow }>
): Promise<boolean> => {
	try {
		const statusList = await getUIStatusOfFlows(emitter, flows);
		return statusList.every(({ status }) => isIdle(status));
	} catch {
		return false;
	}
};

export const getFlowIcon = (flow: Flow): 'layout' | 'layout-circle' => {
	if (flow.settings && flow.settings.forceDepends) {
		return 'layout';
	} else {
		return 'layout-circle';
	}
};

const findInDependencyChain = (
	story: string,
	flow: string,
	dependsChain: { story: string; flow: string }[]
): boolean => {
	return dependsChain.some(node => node.story === story && node.flow === flow);
};

const doLoopCheckForceDependency = (
	workspace: WorkspaceStructure,
	dependsStoryName: string,
	dependsFlowName: string,
	dependsChain: { story: string; flow: string }[]
): boolean => {
	if (findInDependencyChain(dependsStoryName, dependsFlowName, dependsChain)) {
		return false;
	}
	// find story
	const dependsStory = workspace.stories.find(story => story.name === dependsStoryName);
	if (!dependsStory) {
		return true;
	}
	// find flow
	const dependsFlow = (dependsStory.flows || []).find(flow => flow.name === dependsFlowName);
	if (!dependsFlow) {
		return true;
	}
	const { forceDepends = null } = dependsFlow.settings || {};
	if (forceDepends) {
		if (findInDependencyChain(forceDepends.story, forceDepends.flow, dependsChain)) {
			return false;
		} else {
			// push dependency to chain
			dependsChain.push({ story: dependsStoryName, flow: dependsFlowName });
			return doLoopCheckForceDependency(
				workspace,
				forceDepends.story,
				forceDepends.flow,
				dependsChain
			);
		}
	}
	return true;
};

/**
 * only check loop. return true even dependency flow not found.
 * @returns {boolean} return true when pass the loop check
 */
export const loopCheckForceDependency = (
	workspace: WorkspaceStructure,
	dependsStoryName: string,
	dependsFlowName: string,
	myStoryName: string,
	myFlowName: string
): boolean => {
	return doLoopCheckForceDependency(workspace, dependsStoryName, dependsFlowName, [
		{ story: myStoryName, flow: myFlowName }
	]);
};

type DataLoopCheckNode = {
	children: Array<DataLoopCheckNode>;
	parent: null | DataLoopCheckNode;
	story: string;
	flow: string;
};

const doLoopCheckDataDependency = (
	depends: Array<{ story: string; flow: string }>,
	node: DataLoopCheckNode,
	workspace: WorkspaceStructure
): boolean => {
	return depends.every(depend => {
		const { story: dependsStoryName, flow: dependsFlowName } = depend;
		// find story
		const dependsStory: Story | undefined = workspace.stories.find(
			story => story.name === dependsStoryName
		);
		if (!dependsStory) {
			return true;
		}
		// find flow
		const dependsFlow: Flow | undefined = (dependsStory.flows || []).find(
			flow => flow.name === dependsFlowName
		);
		if (!dependsFlow) {
			return true;
		}

		let parent: DataLoopCheckNode | null = node;
		while (parent != null) {
			if (dependsStoryName === parent.story && dependsFlowName === parent.flow) {
				return false;
			}
			parent = parent.parent;
		}

		const { dataDepends = [] } = dependsFlow.settings || {};

		const myself = {
			children: [] as Array<{ story: string; flow: string }>,
			parent: node,
			story: dependsStoryName,
			flow: dependsFlowName
		} as DataLoopCheckNode;
		node.children.push(myself);

		return doLoopCheckDataDependency(dataDepends, myself, workspace);
	});
};

export const loopCheckDataDependency = (
	workspace: WorkspaceStructure,
	dependsStoryName: string,
	dependsFlowName: string,
	myStoryName: string,
	myFlowName: string
): boolean => {
	return doLoopCheckDataDependency(
		[{ story: dependsStoryName, flow: dependsFlowName }],
		{
			story: myStoryName,
			flow: myFlowName,
			children: [] as Array<DataLoopCheckNode>,
			parent: null
		} as DataLoopCheckNode,
		workspace
	);
};
