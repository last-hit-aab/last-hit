import {
	Button,
	Colors,
	Drawer,
	FormGroup,
	InputGroup,
	Tab,
	Tabs,
	TextArea
} from '@blueprintjs/core';
import { remote } from 'electron';
import fs from 'fs';
import { Flow, Step, Story, FlowParameterValueType } from 'last-hit-types';
import path from 'path';
import React from 'react';
import styled from 'styled-components';
import UIContext from '../../common/context';
import IDESettings from '../../common/ide-settings';
import { EventTypes } from '../../events';

enum TabIds {
	SUMMARY = 'summary',
	ERROR = 'error',
	SCREENSHOT = 'screenshot',
	SLOW_AJAX = 'slow-ajax',
	SCRIPT_TESTS = 'script-tests',
	PARAMS = 'params'
}

const {
	padding: { body, vertical },
	gap
} = IDESettings.getStyles();
const drawerHeaderHeight = 40;

const Container = styled.div`
	display: grid;
	grid-template-columns: 1fr;
	grid-template-rows: 1fr;
	height: calc(70vh - ${() => `${drawerHeaderHeight}px`});
	padding: ${() => `0 ${body}px ${body}px`};
`;
const SummaryTabs = styled(Tabs)`
	height: calc(70vh - ${() => `${drawerHeaderHeight + body}px`});
	display: flex;
	flex-direction: column;
	> .bp3-tab-list {
		overflow-x: auto;
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
		overflow-x: hidden;
		overflow-y: auto;
		border-top: 1px solid ${() => Colors.DARK_GRAY5};
		margin-top: 0;
		margin-left: -${() => `${body}px`};
		margin-right: -${() => `${body}px`};
		padding-left: ${() => `${body}px`};
		padding-right: ${() => `${body}px`};
		padding-top: ${() => `${body}px`};
	}
`;

const SummaryContainer = styled.div`
	height: 100%;
`;
const ErrorContainer = styled.div`
	height: 100%;
	display: flex;
	flex-direction: column;
	> div:first-child {
		flex-grow: 1;
		> .bp3-form-content {
			height: 100%;
			> textarea {
				height: 100%;
				resize: none;
			}
		}
	}
`;
const ScreenshotContainer = styled.div`
	display: grid;
	grid-template-columns: 1fr;
	grid-row-gap: ${() => `${body}px`};
	height: 100%;
`;
const ScreenshotItem = styled.div`
	display: grid;
	height: 100px;
	grid-template-columns: auto 1fr auto 1fr auto 1fr;
	> div {
		text-align: center;
		height: 100px;
		> img {
			height: 100%;
			cursor: pointer;
		}
	}
`;
const SlowAjaxContainer = styled.div`
	display: flex;
	flex-direction: column;
	height: 100%;
`;
const SlowAjaxItem = styled.div`
	min-height: 30px;
	height: auto;
	padding-top: ${() => `${vertical}px`};
	padding-bottom: ${() => `${vertical}px`};
	&:first-child {
		padding-top: 0;
	}
	&:last-child {
		padding-bottom: 0;
	}
	> span:first-child {
		flex-grow: 1;
		margin-right: ${() => `${body}px`};
		white-space: nowrap;
		overflow-x: hidden;
		text-overflow: ellipsis;
		width: calc(100vw - 120px);
	}
	> span:last-child {
		white-space: nowrap;
	}
`;
const ScriptTestsContainer = styled.div`
	display: flex;
	flex-direction: column;
	height: 100%;
`;
const ScriptTestsItem = styled.div`
	min-height: 30px;
	height: auto;
	padding-top: ${() => `${vertical}px`};
	padding-bottom: ${() => `${vertical}px`};
	> span:first-child {
		flex-grow: 1;
		margin-right: ${() => `${body}px`};
		white-space: nowrap;
		overflow-x: hidden;
		text-overflow: ellipsis;
		${(): string => {
			return new Array(20)
				.fill(1)
				.map(index => {
					return `
					&[data-indent=${index}] {
						padding-left: ${20 * index}px;
					}
				`;
				})
				.join();
		}}
	}
	> span:last-child {
		white-space: nowrap;
	}
`;
const ParamsContainer = styled.div`
	display: flex;
	flex-direction: column;
	height: 100%;
`;
const ParamsItem = styled.div`
	min-height: 30px;
	height: auto;
	padding-top: ${() => `${vertical}px`};
	padding-bottom: ${() => `${vertical}px`};
	> span {
		flex-grow: 1;
		margin-right: ${() => `${body}px`};
		white-space: nowrap;
		overflow-x: hidden;
		text-overflow: ellipsis;
	}
`;

const SummaryPanel = (props: { summary: any }): JSX.Element => {
	const {
		summary: {
			numberOfStep = 0,
			numberOfUIBehavior = 0,
			numberOfSuccess = 0,
			numberOfAjax = 0,
			slowAjaxRequest = []
		} = {}
	} = props;

	return (
		<SummaryContainer>
			<FormGroup label="Step Count">
				<InputGroup fill={true} defaultValue={numberOfStep} readOnly />
			</FormGroup>
			<FormGroup label="Total Passed Step Count">
				<InputGroup fill={true} defaultValue={numberOfSuccess} readOnly />
			</FormGroup>
			<FormGroup label="Passed UI Step Count">
				<InputGroup fill={true} defaultValue={numberOfUIBehavior} readOnly />
			</FormGroup>
			<FormGroup label="Ajax Count">
				<InputGroup fill={true} defaultValue={numberOfAjax} readOnly />
			</FormGroup>
			<FormGroup label="Slow Ajax Count">
				<InputGroup fill={true} defaultValue={slowAjaxRequest.length} readOnly />
			</FormGroup>
		</SummaryContainer>
	);
};

const ErrorPanel = (props: {
	story: Story;
	flow: Flow;
	error: Error | null;
	errorStack: string | null;
	stepIndex: number | null;
}): JSX.Element => {
	const { story, flow, error, errorStack, stepIndex } = props;
	const { emitter } = React.useContext(UIContext);

	let errorStep = null;
	if (error) {
		errorStep = flow!.steps![stepIndex!];
	}

	let errorThumbnail = error
		? `${remote.app.getPath('logs')}/error-${errorStep!.uuid}-${stepIndex}.png`
		: null;
	if (errorThumbnail && !fs.existsSync(errorThumbnail)) {
		errorThumbnail = null;
	}

	const text = errorStack ? errorStack : 'Everything is OK.';
	const onThumbnailClicked = (): void => {
		emitter.emit(EventTypes.ASK_SHOW_THUMBNAIL, story, flow, { image: errorThumbnail } as Step);
	};

	return (
		<ErrorContainer>
			<FormGroup label="Error Stacktrace">
				<TextArea fill={true} defaultValue={text} readOnly growVertically={false} />
			</FormGroup>
			{errorThumbnail ? (
				<Button onClick={onThumbnailClicked} intent="primary" fill={true}>
					Error Screenshot
				</Button>
			) : null}
		</ErrorContainer>
	);
};

const ScreenshotPanel = (props: { story: Story; flow: Flow; summary: any }): JSX.Element => {
	const {
		story,
		flow,
		summary: { screenCompareList = [] }
	} = props;
	const { emitter } = React.useContext(UIContext);

	const onThumbnailClicked = (filename: string): void => {
		emitter.emit(EventTypes.ASK_SHOW_THUMBNAIL, story, flow, { image: filename } as Step);
	};

	if (screenCompareList.length === 0) {
		return (
			<ScreenshotContainer>
				<h2 className="bp3-heading">
					No screenshot comparison or all comparisons are passed.
				</h2>
			</ScreenshotContainer>
		);
	} else {
		return (
			<ScreenshotContainer>
				{screenCompareList.map((item: { stepUuid: string; stepIndex: number }) => {
					const { stepUuid } = item;
					const folder = path.join(
						remote.app.getPath('logs'),
						'screen-record',
						story.name,
						flow.name
					);
					const step = flow!.steps!.find(step => step.stepUuid === stepUuid);
					const location = step
						? (() => {
								const origin = step!.origin;
								if (origin) {
									return `Step#${origin.stepIndex}@${origin.flow}@${origin.story}`;
								}
						  })()
						: '';
					return (
						<ScreenshotItem key={stepUuid} className="bp3-tree-node-content">
							<span>Record:</span>
							<div>
								<img
									src={`${path.join(folder, `${stepUuid}_baseline.png`)}`}
									alt=""
									onClick={() =>
										onThumbnailClicked(
											path.join(folder, `${stepUuid}_baseline.png`)
										)
									}
								/>
							</div>
							<span>Replay:</span>
							<div>
								<img
									src={`${path.join(folder, `${stepUuid}_replay.png`)}`}
									alt=""
									onClick={() =>
										onThumbnailClicked(
											path.join(folder, `${stepUuid}_replay.png`)
										)
									}
								/>
							</div>
							<span>Compare:</span>
							<div>
								<img
									src={`${path.join(folder, `${stepUuid}_diff.png`)}`}
									alt=""
									onClick={() =>
										onThumbnailClicked(
											path.join(folder, `${stepUuid}_diff.png`)
										)
									}
								/>
							</div>
							<span>{location}</span>
						</ScreenshotItem>
					);
				})}
			</ScreenshotContainer>
		);
	}
};

const SlowAjaxPanel = (props: { summary: any }): JSX.Element => {
	const {
		summary: { slowAjaxRequest = [] }
	} = props;

	if (slowAjaxRequest.length === 0) {
		return (
			<SlowAjaxContainer>
				<h2 className="bp3-heading">No slow ajax requests.</h2>
			</SlowAjaxContainer>
		);
	} else {
		return (
			<SlowAjaxContainer>
				{slowAjaxRequest.map((item: { url: string; time: number }, index: number) => {
					const { url, time } = item;
					return (
						<SlowAjaxItem key={`${url}-${index}`} className="bp3-tree-node-content">
							<span>{url}</span>
							<span>{time}ms</span>
						</SlowAjaxItem>
					);
				})}
			</SlowAjaxContainer>
		);
	}
};

const ScriptTestsPanel = (props: { summary: any }): JSX.Element => {
	const {
		summary: { testLogs = [] }
	} = props;

	if (testLogs.length === 0) {
		return (
			<ScriptTestsContainer>
				<h2 className="bp3-heading">No tests from scripts.</h2>
			</ScriptTestsContainer>
		);
	} else {
		return (
			<ScriptTestsContainer>
				{testLogs.map(
					(
						item: { title: string; passed: boolean; level: number; message: string },
						index: number
					) => {
						const { title, passed, level, message } = item;
						return (
							<ScriptTestsItem
								key={`${title}-${index}`}
								className="bp3-tree-node-content">
								<span data-indent={level}>{`${title}, ${message || ''}`}</span>
								<span>{passed ? 'PASS' : 'FAIL'}</span>
							</ScriptTestsItem>
						);
					}
				)}
			</ScriptTestsContainer>
		);
	}
};

const ParamsPanel = (props: { summary: any }): JSX.Element => {
	const {
		summary: { flowParams = [] }
	} = props;

	if (flowParams.length === 0) {
		return (
			<ParamsContainer>
				<h2 className="bp3-heading">No flow parameter.</h2>
			</ParamsContainer>
		);
	} else {
		const asValueText = (value: FlowParameterValueType): string => {
			return !value ? '' : `${value}`;
		};

		return (
			<ParamsContainer>
				{flowParams.map(
					(
						item: { name: string; value: FlowParameterValueType; type: 'in' | 'out' },
						index: number
					) => {
						const { name, value, type } = item;
						return (
							<ParamsItem key={`${name}-${index}`} className="bp3-tree-node-content">
								<span>{`[${(type || 'IN').toUpperCase()}] ${name}: [${asValueText(
									value
								)}]`}</span>
							</ParamsItem>
						);
					}
				)}
			</ParamsContainer>
		);
	}
};

const TheDialog = (props: {
	story: Story;
	flow: Flow;
	data: {
		summary: any;
		error: Error | null;
		errorStack: string | null;
		stepIndex: number | null;
	};
}): JSX.Element => {
	const { emitter } = React.useContext(UIContext);
	const close = () => {
		emitter.emit(EventTypes.CLOSE_REPLAY_SUMMARY_DRAWER);
	};

	const {
		story,
		flow,
		data: { summary, error, errorStack, stepIndex }
	} = props;
	const [activeId, setActiveId] = React.useState(TabIds.SUMMARY);

	const handleTabChange = (newTabId: React.ReactText): void => {
		setActiveId(newTabId as TabIds);
	};

	let title = null;
	let errorStep = null;
	if (error) {
		errorStep = flow!.steps![stepIndex!];
		const origin = errorStep.origin;
		if (origin) {
			title = `Replay Summary, Error Occurred @ Step${origin.stepIndex}@${origin.flow}@${origin.story}`;
		} else {
			title = `Replay Summary, Error Occurred @ Step${stepIndex}@${flow.name}@${story.name}`;
		}
	} else {
		title = 'Replay Summary, Successfully';
	}

	return (
		<Drawer
			isOpen={true}
			onClose={close}
			autoFocus={true}
			isCloseButtonShown={true}
			position="bottom"
			size="70vh"
			title={title}>
			<Container>
				<SummaryTabs
					id="summary-tab"
					animate={true}
					onChange={handleTabChange}
					selectedTabId={activeId}
					renderActiveTabPanelOnly={true}>
					<Tab
						id={TabIds.SUMMARY}
						title="Summary"
						panel={<SummaryPanel summary={summary} />}
					/>
					<Tab
						id={TabIds.ERROR}
						title="Errors"
						panel={<ErrorPanel {...{ story, flow, error, errorStack, stepIndex }} />}
					/>
					<Tab
						id={TabIds.SCREENSHOT}
						title="Screenshots"
						panel={<ScreenshotPanel {...{ story, flow, summary }} />}
					/>
					<Tab
						id={TabIds.SLOW_AJAX}
						title="Slow Ajax"
						panel={<SlowAjaxPanel summary={summary} />}
					/>
					<Tab
						id={TabIds.SCRIPT_TESTS}
						title="Script Tests"
						panel={<ScriptTestsPanel summary={summary} />}
					/>
					<Tab
						id={TabIds.PARAMS}
						title="Flow Parameters"
						panel={<ParamsPanel summary={summary} />}
					/>
					<Tabs.Expander />
				</SummaryTabs>
			</Container>
		</Drawer>
	);
};

export default (): JSX.Element => {
	const { emitter } = React.useContext(UIContext);

	const [data, setData] = React.useState(
		null as {
			story: Story;
			flow: Flow;
			data: {
				summary: any;
				error: Error | null;
				errorStack: string | null;
				stepIndex: number | null;
			};
		} | null
	);
	React.useEffect(() => {
		const openMe = (story: Story, flow: Flow, data: any): void =>
			setData({ story, flow, data });
		const closeMe = (): void => setData(null);

		emitter
			.on(EventTypes.ASK_REPLAY_SUMMARY_SHOW, openMe)
			.on(EventTypes.CLOSE_REPLAY_SUMMARY_DRAWER, closeMe);

		return () => {
			emitter
				.off(EventTypes.ASK_REPLAY_SUMMARY_SHOW, openMe)
				.off(EventTypes.CLOSE_REPLAY_SUMMARY_DRAWER, closeMe);
		};
	});

	if (data != null) {
		return <TheDialog {...data} />;
	} else {
		return <React.Fragment />;
	}
};
