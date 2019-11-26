import { Button, Colors } from '@blueprintjs/core';
import React from 'react';
import styled from 'styled-components';
import UIContext from '../../common/context';
import { EventTypes } from '../../events';

const Container = styled.div`
	display: flex;
	flex-direction: column;
	border-right: 1px solid ${() => Colors.DARK_GRAY5};
`;
const Placeholder = styled.div`
	flex-grow: 1;
`;
const Segment = styled.div`
	opacity: 0.7;
	> svg {
		height: 24px;
		width: 24px;
	}
`;

export default () => {
	const { emitter } = React.useContext(UIContext);
	const onToggleNagivatorClicked = (): void => {
		emitter.emit(EventTypes.ASK_TOGGLE_NAVIGATOR);
	};
	const onStepSearchClicked = (): void => {
		emitter.emit(EventTypes.ASK_STEP_SEARCH);
	};
	const onEnvClicked = (): void => {
		emitter.emit(EventTypes.ASK_OPEN_ENV);
	};

	return (
		<Container>
			<Segment title="Navigator">
				<Button
					minimal={true}
					icon="inbox"
					large={true}
					onClick={onToggleNagivatorClicked}
				/>
			</Segment>
			<Segment title="Step Search">
				<Button minimal={true} icon="search" large={true} onClick={onStepSearchClicked} />
			</Segment>
			<Segment title="Environments">
				<Button minimal={true} icon="heat-grid" large={true} onClick={onEnvClicked} />
			</Segment>
			<Placeholder />
		</Container>
	);
};
