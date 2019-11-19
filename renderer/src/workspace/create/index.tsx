import { Button, ControlGroup, FormGroup, InputGroup } from '@blueprintjs/core';
import React from 'react';
import styled from 'styled-components';
import IDESettings from '../../common/ide-settings';
import { remote, OpenDialogReturnValue } from 'electron';
import history from '../../common/history';
import paths from '../../common/paths';
import fs from 'fs';
import path from 'path';
import { createWorkspace } from '../../files';

const {
	padding: { body },
	gap
} = IDESettings.getStyles();

const Container = styled.div`
	display: flex;
	flex-direction: column;
	height: 100vh;
	padding: ${() => `${body}px`};
	> div:last-child {
		flex-grow: 1;
		display: flex;
		justify-content: flex-end;
		align-items: flex-end;
		> button {
			margin-left: ${() => `${gap}px`};
		}
	}
`;

export default (): JSX.Element => {
	const [values, setValues] = React.useState({
		name: '',
		location: ''
	});
	const handleChange = (prop: string) => (event: any) => {
		setValues({ ...values, [prop]: event.target.value });
	};
	const onLocationSelected = async () => {
		const ret: OpenDialogReturnValue = await remote.dialog.showOpenDialog({
			title: 'Workspace location selection',
			properties: ['openDirectory', 'createDirectory', 'promptToCreate', 'showHiddenFiles']
		});
		if (!ret.canceled) {
			const path = ret.filePaths![0];
			setValues({ ...values, location: path });
		}
	};
	const trimValues = () =>
		Object.keys(values).reduce((all: any, key) => {
			all[key] = (values as any)[key].trim();
			return all;
		}, {});
	const validateData = async () => {
		// trim property values
		const { name, location } = trimValues();
		if (name.length === 0) {
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Invalid Input',
				message: 'Please, specify workspace name.'
			});
			return Promise.reject();
		}
		if (location.length === 0) {
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Invalid Input',
				message: 'Please, specify workspace location.'
			});
			return Promise.reject();
		}
		if (!path.isAbsolute(location)) {
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Invalid Input',
				message: 'Please, specify an absolute workspace location.'
			});
			return Promise.reject();
		}
		if (fs.existsSync(location) && fs.readdirSync(location).length !== 0) {
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Invalid Input',
				message: 'Please, specify an empty workspace location.'
			});
			return Promise.reject();
		}
		return Promise.resolve();
	};
	const onCancelClicked = () => {
		history.replace(paths.SPLASH);
	};
	const onFinishClicked = async () => {
		try {
			await validateData();
		} catch {
			return;
		}
		const { name, location } = trimValues();
		try {
			createWorkspace(location, name, { name });
		} catch (e) {
			console.error(e);
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Failure',
				message: `Failed to create workspace at "${location}".`
			});
		}
	};

	return (
		<Container>
			<h2 className="bp3-heading">Create Workspace</h2>
			<FormGroup label="Workspace Name" labelInfo="(required)">
				<InputGroup fill={true} onChange={handleChange('name')} value={values.name} />
			</FormGroup>
			<FormGroup label="Workspace Location" labelInfo="(required)">
				<ControlGroup fill={true} vertical={false}>
					<InputGroup onChange={handleChange('location')} value={values.location} />
					<Button
						icon="inbox-search"
						className="bp3-fixed"
						onClick={onLocationSelected}
					/>
				</ControlGroup>
			</FormGroup>
			<div>
				<Button text="Cancel" onClick={onCancelClicked} />
				<Button intent="primary" text="Create" onClick={onFinishClicked} />
			</div>
		</Container>
	);
};
