import { Workspace, WorkspaceSettings, WorkspaceStructure } from '../types';

export class ActiveWorkspace {
	private workspace: Workspace;
	private settings: WorkspaceSettings;
	private structure: WorkspaceStructure;

	constructor(workspace: Workspace, settings: WorkspaceSettings, structure: WorkspaceStructure) {
		this.workspace = workspace;
		this.settings = settings;
		this.structure = structure;
	}
	getWorkspace(): Workspace {
		return this.workspace;
	}
	getSettings(): WorkspaceSettings {
		return this.settings;
	}
	getStructure(): WorkspaceStructure {
		return this.structure;
	}
}

let actived: ActiveWorkspace | null = null;

export const activeWorkspace = (
	workspace: Workspace,
	settings: WorkspaceSettings,
	structure: WorkspaceStructure
): void => {
	actived = new ActiveWorkspace(workspace, settings, structure);
};

export const getActiveWorkspace = (): ActiveWorkspace | null => {
	return actived;
};

export const hasActiveWorkspace = (): boolean => {
	return actived != null;
};

export const deactiveWorkspace = (): ActiveWorkspace | null => {
	const previousActived = actived;
	actived = null;
	return previousActived;
};
