import { EventEmitter } from 'events';
import { Flow, Step, Story } from 'last-hit-types';
import React from 'react';
import { EventTypes } from '../events';
import { FlowUIStatusEnum } from '../types';

export type FlowKey = { storyName: string; flowName: string };
type GenericListener = (...args: any[]) => void;
export type NoArgListener = () => void;
export type BooleanListener = (value: boolean) => void;
export type StoryListener = (story: Story) => void;
export type FlowListener = (story: Story, flow: Flow) => void;
export type FlowOpenListener = (story: Story, flow: Flow, open: boolean) => void;
export type FlowUIStatusListener = (story: Story, flow: Flow, status: FlowUIStatusEnum) => void;
export type FlowReplayListener = (
	story: Story,
	flow: Flow,
	stepping: boolean,
	forRecordForceDependency: boolean
) => void;
export type FlowRecordListener = (story: Story, flow: Flow, isSwitchedFromReplay: boolean) => void;
export type FlowSummaryListener = (story: Story, flow: Flow, data: any) => void;
export type StepListener = (story: Story, flow: Flow, step: Step) => void;
export type StepSearchItemListener = (story: any, flow: any, step: any, match: any) => void;

export interface IUIEventEmitter {
	emit(event: EventTypes.ASK_TOGGLE_NAVIGATOR): boolean;
	emit(event: EventTypes.NAVIGATOR_TOGGLED, opened: boolean): boolean;
	emit(event: EventTypes.ASK_OPEN_ENV): boolean;
	emit(event: EventTypes.CLOSE_ENV_DIALOG): boolean;

	emit(event: EventTypes.ASK_CREATE_STORY): boolean;
	emit(event: EventTypes.ASK_RENAME_STORY, story: Story): boolean;
	emit(event: EventTypes.ASK_DELETE_STORY, story: Story): boolean;
	emit(event: EventTypes.CLOSE_STORY_CREATE_DIALOG): boolean;
	emit(event: EventTypes.CLOSE_STORY_RENAME_DIALOG): boolean;
	emit(event: EventTypes.STORY_CREATED, story: Story): boolean;
	emit(event: EventTypes.STORY_RENAMED, story: Story): boolean;
	emit(event: EventTypes.STORY_DELETED, story: Story): boolean;

	emit(event: EventTypes.ASK_CREATE_FLOW, story: Story): boolean;
	emit(event: EventTypes.ASK_RENAME_FLOW, story: Story, flow: Flow): boolean;
	emit(event: EventTypes.ASK_DELETE_FLOW, story: Story, flow: Flow): boolean;
	emit(event: EventTypes.ASK_OPEN_FLOW, story: Story, flow: Flow): boolean;
	emit(event: EventTypes.ASK_SAVE_FLOW, story: Story, flow: Flow): boolean;
	emit(event: EventTypes.ASK_FLOW_SETTINGS, story: Story, flow: Flow): boolean;
	emit(
		event: EventTypes.ASK_FLOW_REPLAY,
		story: Story,
		flow: Flow,
		stepping: boolean,
		forRecordForceDependency: boolean
	): boolean;
	emit(
		event: EventTypes.ASK_FLOW_RECORD,
		story: Story,
		flow: Flow,
		isSwitchedFromReplay: boolean
	): boolean;
	emit(event: EventTypes.ASK_FLOW_RELOAD, story: Story, flow: Flow): boolean;
	emit(event: EventTypes.ASK_REPLAY_SUMMARY_SHOW, story: Story, flow: Flow, data: any): boolean;
	emit(event: EventTypes.CLOSE_FLOW_CREATE_DIALOG): boolean;
	emit(event: EventTypes.CLOSE_FLOW_RENAME_DIALOG): boolean;
	emit(event: EventTypes.CLOSE_FLOW_SETTINGS_DIALOG, story: Story, flow: Flow): boolean;
	emit(event: EventTypes.CLOSE_FLOW_REPLAY_DIALOG, story: Story, flow: Flow): boolean;
	emit(event: EventTypes.CLOSE_FLOW_RECORD_DIALOG, story: Story, flow: Flow): boolean;
	emit(event: EventTypes.CLOSE_REPLAY_SUMMARY_DRAWER): boolean;
	emit(event: EventTypes.FLOW_CREATED, story: Story, flow: Flow): boolean;
	emit(event: EventTypes.FLOW_RENAMED, story: Story, flow: Flow): boolean;
	emit(event: EventTypes.FLOW_DELETED, story: Story, flow: Flow): boolean;

	emit(event: EventTypes.FLOW_OPEN_CHECK, story: Story, flow: Flow): boolean;
	emit(
		event: EventTypes.FLOW_OPEN_CHECK_RESULT,
		story: Story,
		flow: Flow,
		open: boolean
	): boolean;
	emit(event: EventTypes.FLOW_STATUS_CHECK, story: Story, flow: Flow): boolean;
	emit(
		event: EventTypes.FLOW_STATUS_CHECK_RESULT,
		story: Story,
		flow: Flow,
		status: FlowUIStatusEnum
	): boolean;

	emit(event: EventTypes.STEP_SELECTED, story: Story, flow: Flow, step: Step): boolean;
	emit(event: EventTypes.STEP_BREAKPOINT_CHANGED, story: Story, flow: Flow, step: Step): boolean;
	emit(event: EventTypes.STEP_DELETED, story: Story, flow: Flow, step: Step): boolean;
	emit(event: EventTypes.ASK_SHOW_THUMBNAIL, story: Story, flow: Flow, step: Step): boolean;
	emit(event: EventTypes.ASK_STEP_SEARCH): boolean;
	emit(
		event: EventTypes.ASK_REMOVE_STEP_SEARCH_ITEM,
		story: any,
		flow: any,
		step: any,
		match: any
	): boolean;
	emit(
		event: EventTypes.ASK_REPLACE_STEP_SEARCH_ITEM,
		story: any,
		flow: any,
		step: any,
		match: any
	): boolean;
	emit(event: EventTypes.CLOSE_THUMBNAIL_DIALOG, story: Story, flow: Flow, step: Step): boolean;
	emit(event: EventTypes.CLOSE_STEP_SEARCH_DRAWER): boolean;

	on(event: EventTypes.ASK_TOGGLE_NAVIGATOR, listener: NoArgListener): this;
	on(event: EventTypes.NAVIGATOR_TOGGLED, listener: BooleanListener): this;
	on(event: EventTypes.ASK_OPEN_ENV, listener: NoArgListener): this;
	on(event: EventTypes.CLOSE_ENV_DIALOG, listener: NoArgListener): this;

	on(event: EventTypes.ASK_CREATE_STORY, listener: NoArgListener): this;
	on(event: EventTypes.ASK_RENAME_STORY, listener: StoryListener): this;
	on(event: EventTypes.ASK_DELETE_STORY, listener: StoryListener): this;
	on(event: EventTypes.CLOSE_STORY_CREATE_DIALOG, listener: NoArgListener): this;
	on(event: EventTypes.CLOSE_STORY_RENAME_DIALOG, listener: NoArgListener): this;
	on(event: EventTypes.STORY_CREATED, listener: StoryListener): this;
	on(event: EventTypes.STORY_RENAMED, listener: StoryListener): this;
	on(event: EventTypes.STORY_DELETED, listener: StoryListener): this;

	on(event: EventTypes.ASK_CREATE_FLOW, listener: StoryListener): this;
	on(event: EventTypes.ASK_RENAME_FLOW, listener: FlowListener): this;
	on(event: EventTypes.ASK_DELETE_FLOW, listener: FlowListener): this;
	on(event: EventTypes.ASK_OPEN_FLOW, listener: FlowListener): this;
	on(event: EventTypes.ASK_SAVE_FLOW, listener: FlowListener): this;
	on(event: EventTypes.ASK_FLOW_SETTINGS, listener: FlowListener): this;
	on(event: EventTypes.ASK_FLOW_REPLAY, listener: FlowReplayListener): this;
	on(event: EventTypes.ASK_FLOW_RECORD, listener: FlowRecordListener): this;
	on(event: EventTypes.ASK_FLOW_RELOAD, listener: FlowListener): this;
	on(event: EventTypes.ASK_REPLAY_SUMMARY_SHOW, listener: FlowSummaryListener): this;
	on(event: EventTypes.CLOSE_FLOW_CREATE_DIALOG, listener: NoArgListener): this;
	on(event: EventTypes.CLOSE_FLOW_RENAME_DIALOG, listener: NoArgListener): this;
	on(event: EventTypes.CLOSE_FLOW_SETTINGS_DIALOG, listener: FlowListener): this;
	on(event: EventTypes.CLOSE_FLOW_REPLAY_DIALOG, listener: FlowListener): this;
	on(event: EventTypes.CLOSE_FLOW_RECORD_DIALOG, listener: FlowListener): this;
	on(event: EventTypes.CLOSE_REPLAY_SUMMARY_DRAWER, listener: NoArgListener): this;
	on(event: EventTypes.FLOW_CREATED, listener: FlowListener): this;
	on(event: EventTypes.FLOW_RENAMED, listener: FlowListener): this;
	on(event: EventTypes.FLOW_DELETED, listener: FlowListener): this;

	on(event: EventTypes.FLOW_OPEN_CHECK, listener: FlowListener): this;
	on(event: EventTypes.FLOW_OPEN_CHECK_RESULT, listener: FlowOpenListener): this;
	on(event: EventTypes.FLOW_STATUS_CHECK, listener: FlowListener): this;
	on(event: EventTypes.FLOW_STATUS_CHECK_RESULT, listener: FlowUIStatusListener): this;

	on(event: EventTypes.STEP_SELECTED, listener: StepListener): this;
	on(event: EventTypes.STEP_BREAKPOINT_CHANGED, listener: StepListener): this;
	on(event: EventTypes.STEP_DELETED, listener: StepListener): this;
	on(event: EventTypes.ASK_SHOW_THUMBNAIL, listener: StepListener): this;
	on(event: EventTypes.ASK_STEP_SEARCH, listener: NoArgListener): this;
	on(event: EventTypes.ASK_REMOVE_STEP_SEARCH_ITEM, listener: StepSearchItemListener): this;
	on(event: EventTypes.ASK_REPLACE_STEP_SEARCH_ITEM, listener: StepSearchItemListener): this;
	on(event: EventTypes.CLOSE_THUMBNAIL_DIALOG, listener: StepListener): this;
	on(event: EventTypes.CLOSE_STEP_SEARCH_DRAWER, listener: NoArgListener): this;

	off(event: EventTypes.ASK_TOGGLE_NAVIGATOR, listener: NoArgListener): this;
	off(event: EventTypes.NAVIGATOR_TOGGLED, listener: BooleanListener): this;
	off(event: EventTypes.ASK_OPEN_ENV, listener: NoArgListener): this;
	off(event: EventTypes.CLOSE_ENV_DIALOG, listener: NoArgListener): this;

	off(event: EventTypes.ASK_CREATE_STORY, listener: NoArgListener): this;
	off(event: EventTypes.ASK_RENAME_STORY, listener: StoryListener): this;
	off(event: EventTypes.ASK_DELETE_STORY, listener: StoryListener): this;
	off(event: EventTypes.CLOSE_STORY_CREATE_DIALOG, listener: NoArgListener): this;
	off(event: EventTypes.CLOSE_STORY_RENAME_DIALOG, listener: NoArgListener): this;
	off(event: EventTypes.STORY_CREATED, listener: StoryListener): this;
	off(event: EventTypes.STORY_RENAMED, listener: StoryListener): this;
	off(event: EventTypes.STORY_DELETED, listener: StoryListener): this;

	off(event: EventTypes.ASK_CREATE_FLOW, listener: StoryListener): this;
	off(event: EventTypes.ASK_RENAME_FLOW, listener: FlowListener): this;
	off(event: EventTypes.ASK_DELETE_FLOW, listener: FlowListener): this;
	off(event: EventTypes.ASK_OPEN_FLOW, listener: FlowListener): this;
	off(event: EventTypes.ASK_SAVE_FLOW, listener: FlowListener): this;
	off(event: EventTypes.ASK_FLOW_SETTINGS, listener: FlowListener): this;
	off(event: EventTypes.ASK_FLOW_REPLAY, listener: FlowReplayListener): this;
	off(event: EventTypes.ASK_FLOW_RECORD, listener: FlowRecordListener): this;
	off(event: EventTypes.ASK_FLOW_RELOAD, listener: FlowListener): this;
	off(event: EventTypes.ASK_REPLAY_SUMMARY_SHOW, listener: FlowSummaryListener): this;
	off(event: EventTypes.CLOSE_FLOW_CREATE_DIALOG, listener: NoArgListener): this;
	off(event: EventTypes.CLOSE_FLOW_RENAME_DIALOG, listener: NoArgListener): this;
	off(event: EventTypes.CLOSE_FLOW_SETTINGS_DIALOG, listener: FlowListener): this;
	off(event: EventTypes.CLOSE_FLOW_REPLAY_DIALOG, listener: FlowListener): this;
	off(event: EventTypes.CLOSE_FLOW_RECORD_DIALOG, listener: FlowListener): this;
	off(event: EventTypes.CLOSE_REPLAY_SUMMARY_DRAWER, listener: NoArgListener): this;
	off(event: EventTypes.FLOW_CREATED, listener: FlowListener): this;
	off(event: EventTypes.FLOW_RENAMED, listener: FlowListener): this;
	off(event: EventTypes.FLOW_DELETED, listener: FlowListener): this;

	off(event: EventTypes.FLOW_OPEN_CHECK, listener: FlowListener): this;
	off(event: EventTypes.FLOW_OPEN_CHECK_RESULT, listener: FlowOpenListener): this;
	off(event: EventTypes.FLOW_STATUS_CHECK, listener: FlowListener): this;
	off(event: EventTypes.FLOW_STATUS_CHECK_RESULT, listener: FlowUIStatusListener): this;

	off(event: EventTypes.STEP_SELECTED, listener: StepListener): this;
	off(event: EventTypes.STEP_BREAKPOINT_CHANGED, listener: StepListener): this;
	off(event: EventTypes.STEP_DELETED, listener: StepListener): this;
	off(event: EventTypes.ASK_SHOW_THUMBNAIL, listener: StepListener): this;
	off(event: EventTypes.ASK_STEP_SEARCH, listener: NoArgListener): this;
	off(event: EventTypes.ASK_REMOVE_STEP_SEARCH_ITEM, listener: StepSearchItemListener): this;
	off(event: EventTypes.ASK_REPLACE_STEP_SEARCH_ITEM, listener: StepSearchItemListener): this;
	off(event: EventTypes.CLOSE_THUMBNAIL_DIALOG, listener: StepListener): this;
	off(event: EventTypes.CLOSE_STEP_SEARCH_DRAWER, listener: NoArgListener): this;
}

export const asFlowKeyByName = (flowName: string, storyName: string): string => {
	return `[${flowName}@${storyName}]`;
};

class UIEventEmitter implements IUIEventEmitter {
	private emitter = new EventEmitter();
	emit(event: EventTypes, ...args: any[]): boolean {
		return this.emitter.emit(event, ...args);
	}
	on(event: EventTypes, listener?: GenericListener): this {
		this.emitter.on(event, listener!);
		return this;
	}
	off(event: EventTypes, listener?: GenericListener): this {
		this.emitter.off(event, listener!);
		return this;
	}
}

export const context = {
	emitter: new UIEventEmitter() as IUIEventEmitter
};

const UIContext = React.createContext(context);
export default UIContext;
