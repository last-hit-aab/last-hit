import Grid from '@material-ui/core/Grid';
import { styled } from '@material-ui/styles';
import React from 'react';
import { Workspace, workspaces, Workspaces } from '../global-settings';
import Operations from './operations';
import WorkspaceList from './workspace-list';

const TopGrid = styled(Grid)({
	minHeight: '100vh'
});

class WorkspacesWrapper implements Workspaces {
	private workspaces: Workspaces;
	private state: number;
	private stateHook: React.Dispatch<React.SetStateAction<number>>;
	constructor(workspaces: Workspaces, state: number, stateHook: React.Dispatch<React.SetStateAction<number>>) {
		this.workspaces = workspaces;
		this.state = state;
		this.stateHook = stateHook;
	}
	getWorkspaces(): Workspace[] {
		return this.workspaces.getWorkspaces();
	}
	hasWorkspace(): boolean {
		return this.workspaces.hasWorkspace();
	}
	removeWorkspace(workspace: Workspace): boolean {
		const ret = this.workspaces.removeWorkspace(workspace);
		if (ret) {
			this.state++;
			this.stateHook(this.state);
		}
		return ret;
	}
}

export default (): JSX.Element => {
	const [changeCount, setChangeCount] = React.useState(0);
	const workspacesWrapper = new WorkspacesWrapper(workspaces, changeCount, setChangeCount);

	return (
		<TopGrid container spacing={0} alignItems="stretch">
			<WorkspaceList workspaces={workspacesWrapper} />
			<Operations stretch={!workspacesWrapper.hasWorkspace()} />
		</TopGrid>
	);
};
