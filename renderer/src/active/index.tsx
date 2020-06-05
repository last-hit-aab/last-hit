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

let active: ActiveWorkspace | null = null;

export const activeWorkspace = (
	workspace: Workspace,
	settings: WorkspaceSettings,
	structure: WorkspaceStructure
): void => {
	active = new ActiveWorkspace(workspace, settings, structure);
};

export const getActiveWorkspace = (): ActiveWorkspace | null => {
	return active;
};

export const hasActiveWorkspace = (): boolean => {
	return active != null;
};

export const deactivateWorkspace = (): ActiveWorkspace | null => {
	const previousActive = active;
	active = null;
	return previousActive;
};
