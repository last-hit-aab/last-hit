import {
	Button,
	Colors,
	ContextMenuTarget,
	Icon,
	Menu,
	MenuItem,
	Tab,
	Tabs
} from '@blueprintjs/core';
import { remote } from 'electron';
import React from 'react';
import styled from 'styled-components';
import UIContext from '../../../common/context';
import IDESettings from '../../../common/ide-settings';
import { EventTypes } from '../../../events';
import { asFlowKey, saveFlow } from '../../../files';
import { Flow, Story } from '../../../types';
import FlowEditPanel from '../../flow/edit-panel';
import { getFlowIcon, getUIStatusOfFlows, isFlowsAllOnIdle, isIdle } from '../../flow/utils';

const {
	margin: { body },
	gap
} = IDESettings.getStyles();

const Container = styled.div`
	flex-grow: 1;
	max-width: calc(100vw - 340px);
	&[data-navigator-opened='false'] {
		max-width: calc(100vw - 41px);
	}
`;
const FlowTabs = styled(Tabs)`
	height: 100%;
	display: flex;
	flex-direction: column;
	> .bp3-tab-list {
		overflow-x: auto;
		margin: ${() => `0 ${body}px`};
		> .bp3-tab {
			padding: ${() => `0 ${gap}px`};
			> div {
				> .bp3-icon {
					margin-right: ${() => `${gap}px`};
				}
				> span {
					user-select: none;
				}
				> button.bp3-button:not([class*='bp3-intent-']) {
					margin-left: ${() => `${gap}px`};
					border-radius: 100%;
					> span.bp3-icon {
						color: inherit;
					}
				}
			}
		}
	}
	> .bp3-tab-panel {
		flex-grow: 1;
		height: 100%;
		overflow: hidden;
		border-top: 1px solid ${() => Colors.DARK_GRAY5};
		margin-top: 0;
	}
`;

const asTabTitle = (flow: Flow, story: Story): string => {
	return `${flow.name} @ ${story.name}`;
};

export default () => {
	const { emitter } = React.useContext(UIContext);

	// force render
	const [ignored, forceUpdate] = React.useReducer(x => x + 1, 0);
	const [data, setData] = React.useState({
		flows: [] as Array<{ story: Story; flow: Flow }>,
		activeId: undefined as string | undefined
	});
	const [navigatorOpened, setNavigatorOpened] = React.useState(true);

	React.useEffect(() => {
		const onFlowOpenCheck = (theStory: Story, theFlow: Flow): void => {
			emitter.emit(
				EventTypes.FLOW_OPEN_CHECK_RESULT,
				theStory,
				theFlow,
				data.flows.some(({ story, flow }) => story === theStory && flow === theFlow)
			);
		};

		const onStoryRenamed = (story: Story): void => forceUpdate(ignored);
		const onStoryDeleted = (story: Story): void => {
			const newFlows = data.flows.filter(data => data.story !== story);
			const activeIdExists = newFlows.some(
				({ story, flow }) => asFlowKey(flow, story) === data.activeId
			);
			setData({
				flows: newFlows,
				activeId: activeIdExists
					? data.activeId
					: newFlows.length === 0
					? undefined
					: asFlowKey(newFlows[0].flow, newFlows[0].story)
			});
		};
		const onFlowCreated = (story: Story, flow: Flow): void => openFlow(story, flow);
		const onFlowRenamed = (story: Story, flow: Flow): void => forceUpdate(ignored);
		const onFlowDeleted = (story: Story, flow: Flow): void => closeFlows([{ story, flow }]);
		const onNavigatorToggled = (opened: boolean): void => setNavigatorOpened(opened);

		emitter
			.on(EventTypes.FLOW_OPEN_CHECK, onFlowOpenCheck)
			.on(EventTypes.ASK_OPEN_FLOW, openFlow)
			.on(EventTypes.STORY_RENAMED, onStoryRenamed)
			.on(EventTypes.STORY_DELETED, onStoryDeleted)
			.on(EventTypes.FLOW_CREATED, onFlowCreated)
			.on(EventTypes.FLOW_RENAMED, onFlowRenamed)
			.on(EventTypes.FLOW_DELETED, onFlowDeleted)
			.on(EventTypes.ASK_SAVE_FLOW, onSaveFlowAsked)
			.on(EventTypes.NAVIGATOR_TOGGLED, onNavigatorToggled)
			.on(EventTypes.CLOSE_FLOW_SETTINGS_DIALOG, onFlowSettingsDialogClosed)
			.on(EventTypes.ASK_FLOW_RELOAD, onFlowReloadAsked);

		return () => {
			emitter
				.off(EventTypes.FLOW_OPEN_CHECK, onFlowOpenCheck)
				.off(EventTypes.ASK_OPEN_FLOW, openFlow)
				.off(EventTypes.STORY_RENAMED, onStoryRenamed)
				.off(EventTypes.STORY_DELETED, onStoryDeleted)
				.off(EventTypes.FLOW_CREATED, onFlowCreated)
				.off(EventTypes.FLOW_RENAMED, onFlowRenamed)
				.off(EventTypes.FLOW_DELETED, onFlowDeleted)
				.off(EventTypes.ASK_SAVE_FLOW, onSaveFlowAsked)
				.off(EventTypes.NAVIGATOR_TOGGLED, onNavigatorToggled)
				.off(EventTypes.CLOSE_FLOW_SETTINGS_DIALOG, onFlowSettingsDialogClosed)
				.off(EventTypes.ASK_FLOW_RELOAD, onFlowReloadAsked);
		};
	});

	const openFlow = (story: Story, flow: Flow): void => {
		const opened = data.flows.find(opened => opened.story === story && opened.flow === flow);
		if (!opened) {
			setData({
				flows: data.flows.concat({ story, flow }),
				activeId: asFlowKey(flow, story)
			});
		} else {
			setData({ flows: data.flows, activeId: asFlowKey(flow, story) });
		}
	};
	const flowSaver: { [key in string]: number } = {};
	const onSaveFlowAsked = (story: Story, flow: Flow): void => {
		const flowKey = asFlowKey(flow, story);
		const handler = flowSaver[flowKey];
		if (handler) {
			clearTimeout(handler);
		}
		flowSaver[flowKey] = setTimeout(() => saveFlow(story, flow), 500);
	};
	const onFlowReloadAsked = (story: Story, flow: Flow): void => {
		remote.dialog.showMessageBox(remote.getCurrentWindow(), {
			type: 'info',
			title: 'Coming soon',
			message: `Coming soon.`
		});
	};
	const closeFlows = (closeFlows: Array<{ story: Story; flow: Flow }>): void => {
		const flows = closeFlows.map(({ flow }) => flow);
		const newFlows = data.flows.filter(({ flow }) => !flows.includes(flow));
		const activeIdExists = newFlows.some(
			({ story, flow }) => data.activeId === asFlowKey(flow, story)
		);
		setData({
			flows: newFlows,
			activeId: activeIdExists
				? data.activeId
				: newFlows.length === 0
				? undefined
				: asFlowKey(newFlows[0].flow, newFlows[0].story)
		});
	};
	const handleTabChange = (newTabId: React.ReactText): void => {
		setData({ flows: data.flows, activeId: newTabId as string });
	};
	const onCloseClicked = async (
		story: Story,
		flow: Flow,
		event: React.MouseEvent<HTMLElement, MouseEvent>
	): Promise<void> => {
		event.preventDefault();
		return await tryToCloseFlow(story, flow);
	};
	const tryToCloseFlow = async (story: Story, flow: Flow): Promise<void> => {
		const canClose = await isFlowsAllOnIdle(emitter, [{ story, flow }]);
		if (!canClose) {
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Flow on operating.',
				message: `Cannot close flow "${flow.name}@${story.name}" when it is on operating, need to cancel operating manually first.`
			});
		} else {
			closeFlows([{ story, flow }]);
		}
	};
	const tryToCloseOtherFlows = async (story: Story, flow: Flow): Promise<void> => {
		closeFlows(
			(
				await getUIStatusOfFlows(
					emitter,
					data.flows.filter(({ flow: existsFlow }) => flow !== existsFlow)
				)
			).filter(({ status }) => isIdle(status))
		);
	};
	const tryToCloseAllFlows = async (): Promise<void> => {
		closeFlows(
			(await getUIStatusOfFlows(emitter, data.flows)).filter(({ status }) => isIdle(status))
		);
	};
	const onFlowSettingsDialogClosed = (): void => forceUpdate(ignored);

	return (
		<Container data-navigator-opened={navigatorOpened}>
			<FlowTabs
				id="work-area-tab"
				animate={true}
				onChange={handleTabChange}
				selectedTabId={data.activeId}
				renderActiveTabPanelOnly={true}>
				{data.flows.map(opened => {
					const { story, flow } = opened;
					const key = asFlowKey(flow, story);
					return (
						<Tab id={key} key={key} panel={<FlowEditPanel {...opened} />}>
							<TabTitleContextMenuWrapper
								{...opened}
								closeMe={tryToCloseFlow}
								closeOthers={tryToCloseOtherFlows}
								closeAll={tryToCloseAllFlows}>
								<Icon icon={getFlowIcon(flow)} />
								<span>{asTabTitle(flow, story)}</span>
								<Button
									minimal={true}
									icon="cross"
									onClick={(event: React.MouseEvent<HTMLElement, MouseEvent>) =>
										onCloseClicked(story, flow, event)
									}
								/>
							</TabTitleContextMenuWrapper>
						</Tab>
					);
				})}
				<Tabs.Expander />
			</FlowTabs>
		</Container>
	);
};

const TabTitleContextMenuWrapper = ContextMenuTarget(
	class RightClickMeWithContext extends React.Component<
		{
			story: Story;
			flow: Flow;
			closeMe: (story: Story, flow: Flow) => Promise<void>;
			closeOthers: (story: Story, flow: Flow) => Promise<void>;
			closeAll: () => Promise<void>;
		},
		{}
	> {
		public render() {
			return <div>{this.props.children}</div>;
		}
		public renderContextMenu() {
			// return a single element, or nothing to use default browser behavior
			return (
				<Menu>
					<MenuItem onClick={this.onCloseClicked} text="Close" />
					<MenuItem onClick={this.onCloseOthersClicked} text="Close Others" />
					<MenuItem onClick={this.onCloseAllClicked} text="Close All" />
				</Menu>
			);
		}
		public onContextMenuClose() {}
		private onCloseClicked = () => {
			this.props.closeMe(this.props.story, this.props.flow);
		};
		private onCloseOthersClicked = () => {
			this.props.closeOthers(this.props.story, this.props.flow);
		};
		private onCloseAllClicked = () => {
			this.props.closeAll();
		};
	}
);
