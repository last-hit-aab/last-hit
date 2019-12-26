import { ipcRenderer, remote } from 'electron';
import React from 'react';
import styled from 'styled-components';
import { getActiveWorkspace } from '../../active';
import { closeCurrentWorkspace } from '../../files';
import FlowCreateDialog from '../flow/create-dialog';
import FlowDelete from '../flow/delete';
import FlowParamsDialog from '../flow/params-dialog';
import FlowRecordDialog from '../flow/record-dialog';
import FlowRenameDialog from '../flow/rename-dialog';
import FlowReplayDialog from '../flow/replay-dialog';
import ReplaySummaryDrawer from '../flow/replay-summary-drawer';
import ScriptsHelperDrawer from '../flow/scripts-helper-drawer';
import FlowSettingsDialog from '../flow/settings-dialog';
import StepSearchDrawer from '../step/step-search-drawer';
import StepScreenshotDialog from '../step/thumbnail-dialog';
import StoryCreateDialog from '../story/create-dialog';
import StoryDelete from '../story/delete';
import StoryRenameDialog from '../story/rename-dialog';
import BottomBar from './bottom-bar';
import EnvDialog from './env-dialog';
import MainContent from './main-content';

const onBeforeUnload = (evt: BeforeUnloadEvent) => {
	remote.dialog
		.showMessageBox(remote.getCurrentWindow(), {
			type: 'question',
			title: 'Close workspace',
			message: 'Are you sure to close current workspace?',
			buttons: ['OK', 'Cancel']
		})
		.then((ret: Electron.MessageBoxReturnValue) => {
			if (ret.response === 0) {
				// ok clicked
				window.onbeforeunload = null;
				ipcRenderer.send('workspace-closed', getActiveWorkspace()!.getSettings().name);
				closeCurrentWorkspace();
			}
		});
	evt.returnValue = false;
};

const Container = styled.div`
	display: flex;
	flex-direction: column;
	height: 100vh;
`;

export default (): JSX.Element => {
	React.useEffect(() => {
		window.onbeforeunload = onBeforeUnload;
		return () => {
			window.onbeforeunload = null;
		};
	});
	React.useEffect(() => {
		const { name, workspaceFile } = getActiveWorkspace()!.getSettings();
		ipcRenderer.send('workspace-opened', { name, workspaceFile });
		// eslint-disable-next-line
	}, [0]);

	return (
		<Container>
			<MainContent />
			<BottomBar />
			<StoryCreateDialog />
			<StoryRenameDialog />
			<StoryDelete />
			<FlowCreateDialog />
			<FlowRenameDialog />
			<FlowDelete />
			<FlowSettingsDialog />
			<FlowParamsDialog />
			<FlowReplayDialog />
			<FlowRecordDialog />
			<StepScreenshotDialog />
			<ReplaySummaryDrawer />
			<ScriptsHelperDrawer />
			<StepSearchDrawer />
			<EnvDialog />
		</Container>
	);
};
