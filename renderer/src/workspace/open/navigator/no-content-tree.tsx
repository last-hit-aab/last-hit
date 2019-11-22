import { AnchorButton, Label } from '@blueprintjs/core';
import React from 'react';
import styled from 'styled-components';
import UIContext from '../../../common/context';
import { EventTypes } from '../../../events';

const NoContentContainer = styled.div`
	display: flex;
	align-items: center;
	flex-grow: 1;
	> label {
		flex-grow: 1;
		text-align: right;
	}
	> a {
		flex-grow: 1;
		justify-content: flex-start;
		text-decoration: underline;
		&.bp3-button.bp3-intent-primary.bp3-minimal {
			&:hover,
			&:active {
				text-decoration: underline;
				background-color: transparent;
			}
		}
	}
`;

export default () => {
	const { emitter } = React.useContext(UIContext);
	const onCreateStoryClicked = (): void => {
		emitter.emit(EventTypes.OPEN_STORY_CREATE_DIALOG);
	};
	
	return (
		<NoContentContainer>
			<Label className="margin-bottom-0">No story yet, </Label>
			<AnchorButton
				text="create new one"
				onClick={onCreateStoryClicked}
				minimal={true}
				intent="primary"
			/>
		</NoContentContainer>
	);
};
