import { Drawer } from '@blueprintjs/core';
import React from 'react';
import styled from 'styled-components';
import UIContext from '../../common/context';
import IDESettings from '../../common/ide-settings';
import { EventTypes } from '../../events';

const {
	padding: { body }
} = IDESettings.getStyles();
const drawerHeaderHeight = 40;

const Container = styled.div`
	display: grid;
	grid-template-columns: 1fr;
	grid-template-rows: 1fr;
	height: calc(90vh - ${() => `${drawerHeaderHeight}px`});
	padding: 0;
`;

const IFrame = styled.iframe`
	width: 100%;
	height: 100%;
	border: 0;
	background-color: #fff;
`;

const TheDialog = (): JSX.Element => {
	const { emitter } = React.useContext(UIContext);
	const close = () => {
		emitter.emit(EventTypes.CLOSE_SCRIPTS_HELP_DRAWER);
	};

	return (
		<Drawer
			isOpen={true}
			onClose={close}
			autoFocus={true}
			isCloseButtonShown={true}
			position="bottom"
			size="90vh"
			title="Workspace Extension Help">
			<Container>
				<IFrame title="doc" src="https://www.last-hit.com/workspace-extension" />
			</Container>
		</Drawer>
	);
};

export default (): JSX.Element => {
	const { emitter } = React.useContext(UIContext);

	const [shown, setShown] = React.useState(false);
	React.useEffect(() => {
		const openMe = (): void => setShown(true);
		const closeMe = (): void => setShown(false);

		emitter
			.on(EventTypes.ASK_SCRIPTS_HELP_SHOW, openMe)
			.on(EventTypes.CLOSE_SCRIPTS_HELP_DRAWER, closeMe);

		return () => {
			emitter
				.off(EventTypes.ASK_SCRIPTS_HELP_SHOW, openMe)
				.off(EventTypes.CLOSE_SCRIPTS_HELP_DRAWER, closeMe);
		};
	});

	if (shown) {
		return <TheDialog />;
	} else {
		return <React.Fragment />;
	}
};
