import { Colors } from '@blueprintjs/core';
import React from 'react';
import styled from 'styled-components';
import UIContext from '../../../common/context';
import IDESettings from '../../../common/ide-settings';
import { EventTypes } from '../../../events';
import NavigatorTree from './navigator-tree';

const {
	padding: { horizontal, vertical }
} = IDESettings.getStyles();

const Container = styled.div`
	display: flex;
	flex-direction: column;
	width: 300px;
	overflow: hidden;
	border-right: 1px solid ${() => Colors.DARK_GRAY5};
	transition: width 300ms ease-in-out;
	&[data-hidden='true'] {
		width: 0;
	}
`;
const Title = styled.h6`
	padding: ${() => `${horizontal}px ${vertical * 2}px 0 ${vertical * 2}px`};
`;

export default () => {
	const { emitter } = React.useContext(UIContext);
	const [showMe, setShowMe] = React.useState(true);

	React.useEffect(() => {
		const toggleMe = () => {
			const show = !showMe;
			setShowMe(show);
			emitter.emit(EventTypes.NAVIGATOR_TOGGLED, show);
		};
		emitter.on(EventTypes.ASK_TOGGLE_NAVIGATOR, toggleMe);

		return () => {
			emitter.off(EventTypes.ASK_TOGGLE_NAVIGATOR, toggleMe);
		};
	});

	return (
		<Container data-hidden={!showMe}>
			<Title className="bp3-heading">Navigator</Title>
			<NavigatorTree />
		</Container>
	);
};
