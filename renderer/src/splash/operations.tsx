// import { openWorkspace } from '../workspace-settings';
import { Button, Label } from '@blueprintjs/core';
import { OpenDialogReturnValue, remote } from 'electron';
import React from 'react';
import styled from 'styled-components';
import history from '../common/history';
import IDESettings, { WorkspaceFileExt } from '../common/ide-settings';
import paths from '../common/paths';
import { openWorkspace } from '../files';
import logo from '../images/LH-LOGO.png';

const app = remote.app;
const appVersion = app.getVersion();
const {
	padding: { horizontal }
} = IDESettings.getStyles();

const Container = styled.div`
	display: flex;
	flex-direction: column;
	height: 100vh;
	padding: ${() => `0 ${horizontal}px`};
	> div {
		text-align: center;
		&:first-child {
			margin-top: 40px;
		}
		&:nth-child(2) {
			margin-bottom: 40px;
			opacity: 0.5;
		}
		> img {
			width: 160px;
		}
	}
`;

export default (): JSX.Element => {
	const onCreateWorkspaceClicked = (): void => {
		history.replace(paths.CREATE_WORKSPACE);
	};
	const onOpenWorkspaceClicked = async () => {
		const ret: OpenDialogReturnValue = await remote.dialog.showOpenDialog(
			remote.getCurrentWindow(),
			{
				title: 'Workspace selection',
				filters: [{ name: 'Workspace', extensions: [WorkspaceFileExt] }],
				properties: ['openFile', 'showHiddenFiles']
			}
		);
		if (!ret.canceled) {
			const path = ret.filePaths![0];
			openWorkspace(path);
		}
	};

	return (
		<Container>
			<div>
				<img src={logo} alt="" />
			</div>
			<div>
				<Label className="bp3-text-small bp3-text-muted">Version {appVersion}</Label>
			</div>
			<div>
				<Button minimal={true} icon="add" fill={true} onClick={onCreateWorkspaceClicked}>
					Create New Workspace
				</Button>
			</div>
			<div>
				<Button
					minimal={true}
					icon="folder-open"
					fill={true}
					onClick={onOpenWorkspaceClicked}>
					Open
				</Button>
			</div>
		</Container>
	);
};
