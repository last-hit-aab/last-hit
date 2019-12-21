import { Button, Label } from '@blueprintjs/core';
import React from 'react';
import styled from 'styled-components';
import uuidv4 from 'uuid/v4';
import IDESettings from '../common/ide-settings';
import { openWorkspaceByFolder } from '../files';
import { Workspace } from '../types';

const {
	padding: { vertical, horizontal }
} = IDESettings.getStyles();

const List = styled.div`
	display: flex;
	flex-direction: column;
	overflow-x: hidden;
	overflow-y: auto;
`;

const ListItem = styled.div`
	flex-shrink: 0;
	display: grid;
	grid-template-columns: 1fr auto;
	grid-template-rows: auto auto;
	overflow: hidden;
	padding: ${() => `${vertical}px 0 ${vertical}px ${horizontal}px`};
	cursor: pointer;
	transition: all 200ms ease-in-out;
	&:hover {
		box-shadow: inset 0 0 100px 100px rgba(255, 255, 255, 0.1);
		& > button {
			visibility: visible;
			opacity: 1;
		}
	}
	& > label {
		cursor: pointer;
	}
`;
const RemoveButton = styled(Button)`
	visibility: hidden;
	opacity: 0;
	transition: all 300ms ease-in-out;
	grid-column: 2;
	grid-row: 1 / span 2;
	width: 32px;
	height: 32px;
`;

export default (): JSX.Element => {
	const [ignored, forceUpdate] = React.useReducer(x => x + 1, 0);
	const onWorkspaceOpenClicked = (workspace: Workspace): void => {
		openWorkspaceByFolder(workspace.path);
	};
	const onRemoveWorkspaceClicked = (workspace: Workspace): void => {
		IDESettings.removeWorkspace(workspace);
		forceUpdate(ignored);
	};

	if (!IDESettings.hasWorkspace()) {
		return <List />;
	} else {
		return (
			<List>
				{IDESettings.getWorkspaces().map(workspace => {
					return (
						<ListItem
							key={uuidv4()}
							onClick={() => onWorkspaceOpenClicked(workspace)}
							title={workspace.path}>
							<Label className="bp3-text-large margin-bottom-0">
								{workspace.name}
							</Label>
							<Label className="bp3-text-small bp3-text-muted bp3-text-overflow-ellipsis margin-bottom-0">
								{workspace.path}
							</Label>
							<RemoveButton
								className="round"
								icon="cross"
								minimal={true}
								onClick={(event: React.MouseEvent<any, MouseEvent>) => {
									event.stopPropagation();
									onRemoveWorkspaceClicked(workspace);
								}}
							/>
						</ListItem>
					);
				})}
			</List>
		);
	}
};
