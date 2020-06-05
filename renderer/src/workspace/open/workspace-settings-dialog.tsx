import {
	Button,
	Classes,
	Colors,
	FormGroup,
	InputGroup,
	Overlay,
	Tab,
	Tabs
} from '@blueprintjs/core';
import React from 'react';
import styled from 'styled-components';
import uuidv4 from 'uuid/v4';
import { getActiveWorkspace } from '../../active';
import UIContext from '../../common/context';
import IDESettings from '../../common/ide-settings';
import { EventTypes } from '../../events';
import { saveWorkspace } from '../../files';

const {
	gap,
	padding: { body }
} = IDESettings.getStyles();

const TheDialog = (): JSX.Element => {
	const { emitter } = React.useContext(UIContext);
	const close = () => {
		emitter.emit(EventTypes.CLOSE_WORKSPACE_SETTINGS_DIALOG);
	};

	let dataAttrNameRef: HTMLInputElement | null;
	const onConfirmClicked = (): void => {
		const settings = getActiveWorkspace()!.getSettings();
		settings.dataAttrName = dataAttrNameRef!.value.trim();
		saveWorkspace();
		close();
	};

	return (
		<Overlay
			isOpen={true}
			className={`${Classes.OVERLAY_CONTAINER} medium`}
			canEscapeKeyClose={false}
			canOutsideClickClose={false}
			autoFocus={true}>
			<div className={`${Classes.CARD} ${Classes.ELEVATION_2}`}>
				<h3 className="bp3-heading">Workspace Settings</h3>
				<FormGroup label="Attribute name for capture data path">
					<InputGroup
						fill={true}
						inputRef={ref => (dataAttrNameRef = ref)}
						defaultValue={getActiveWorkspace()!.getSettings().dataAttrName || ''}
					/>
				</FormGroup>
				<div className="overlay-placeholder"/>
				<div className={Classes.DIALOG_FOOTER_ACTIONS}>
					<Button onClick={close}>Cancel</Button>
					<Button onClick={onConfirmClicked} intent="primary">
						OK
					</Button>
				</div>
			</div>
		</Overlay>
	);
};

export default (): JSX.Element => {
	const { emitter } = React.useContext(UIContext);

	const [ opened, setOpened ] = React.useState(false);
	React.useEffect(() => {
		const openMe = (): void => setOpened(true);
		const closeMe = (): void => setOpened(false);

		emitter.on(EventTypes.ASK_OPEN_WORKSPACE_SETTINGS, openMe).on(EventTypes.CLOSE_WORKSPACE_SETTINGS_DIALOG, closeMe);

		return () => {
			emitter.off(EventTypes.ASK_OPEN_WORKSPACE_SETTINGS, openMe).off(EventTypes.CLOSE_WORKSPACE_SETTINGS_DIALOG, closeMe);
		};
	});

	if (opened) {
		return <TheDialog/>;
	} else {
		return <React.Fragment/>;
	}
};
