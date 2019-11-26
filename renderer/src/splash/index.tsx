import React from 'react';
import styled from 'styled-components';
import Operations from './operations';
import WorkspaceList from './workspace-list';

const Container = styled.div`
	display: grid;
	grid-template-columns: 300px 1fr;
	justify-items: stretch;
	height: 100vh;
`;

export default (): JSX.Element => {
	return (
		<Container>
			<WorkspaceList />
			<Operations />
		</Container>
	);
};
