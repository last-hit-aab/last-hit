import { Label } from '@blueprintjs/core';
import { faChrome, faNode, faReact } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import styled from 'styled-components';
import IDESettings from '../../common/ide-settings';

const {
	padding: { horizontal }
} = IDESettings.getStyles();

const Container = styled.div`
	display: flex;
`;
const Placeholder = styled.div`
	flex-grow: 1;
`;
const Segment = styled.div`
	padding: ${() => `0 ${horizontal / 2}px`};
	opacity: 0.7;
	> svg {
		margin-right: 4px;
	}
	> label {
		display: inline-block;
		line-height: 20px;
	}
	&:first-child {
		padding-left: ${() => `${horizontal}px`};
	}
	&:last-child {
		padding-right: ${() => `${horizontal}px`};
	}
`;

export default () => {
	return (
		<Container>
			<Placeholder />
			<Segment>
				<FontAwesomeIcon icon={faNode} />
				<Label muted={true} className="bp3-text-small margin-bottom-0">
					{process.versions.node}
				</Label>
			</Segment>
			<Segment>
				<FontAwesomeIcon icon={faChrome} />
				<Label muted={true} className="bp3-text-small margin-bottom-0">
					{(process.versions as any).chrome}
				</Label>
			</Segment>
			<Segment>
				<FontAwesomeIcon icon={faReact} />
				<Label muted={true} className="bp3-text-small margin-bottom-0">
					{(process.versions as any).electron}
				</Label>
			</Segment>
		</Container>
	);
};
