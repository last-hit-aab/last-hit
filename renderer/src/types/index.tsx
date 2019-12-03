import { Flow, Story, Environment } from 'last-hit-types';

export type Workspace = {
	name: string;
	path: string;
};

export type ExecuteEnv = Environment;

export type WorkspaceSettings = {
	name: string;
	workspaceFile: string;
	envs?: ExecuteEnv[];
};

export type WorkspaceStructure = {
	stories: Story[];
};

export enum FlowUIStatusEnum {
	ON_RECORD = 'on-record',
	ON_REPLAY = 'on-replay',
	IDLE = 'idle',
	NOT_OPEN = 'not-open'
}

export type FlowUIStatus = {
	story: Story;
	flow: Flow;
	status: FlowUIStatusEnum;
};
