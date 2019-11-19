import React from 'react';
import styled from 'styled-components';
import LeftBar from './left-bar';
import Navigator from './navigator';

const Container = styled.div`
	flex-grow: 1;
	display: flex;
	height: calc(100vh - 20px);
`;

export default () => {
	return (
		<Container>
			<LeftBar />
			<Navigator />
		</Container>
	);
};
