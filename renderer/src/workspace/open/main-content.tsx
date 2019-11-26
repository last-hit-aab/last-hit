import React from 'react';
import styled from 'styled-components';
import LeftBar from './left-bar';
import Navigator from './navigator';
import Workarea from './workarea';
import { Colors } from '@blueprintjs/core';

const Container = styled.div`
	flex-grow: 1;
	display: flex;
	height: calc(100vh - 20px);
	border-bottom: 1px solid ${() => Colors.DARK_GRAY5};
`;

export default () => {
	return (
		<Container>
			<LeftBar />
			<Navigator />
			<Workarea />
		</Container>
	);
};
