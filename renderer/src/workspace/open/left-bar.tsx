import { Button } from '@blueprintjs/core';
import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
	display: flex;
	flex-direction: column;
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
	return (
		<Container>
			<Segment title="Navigator">
				<Button minimal={true} icon="inbox" large={true} />
			</Segment>
			<Segment title="Step Search">
				<Button minimal={true} icon="search" large={true} />
			</Segment>
			<Segment title="Environments">
				<Button minimal={true} icon="heat-grid" large={true} />
			</Segment>
			<Placeholder />
		</Container>
	);
};

/* <Grid item className={classes.verticalIconBar} container direction="column">
<IconButton
	color="inherit"
	aria-label="outline toogle"
	title={collapsed ? 'Expand Outline' : 'Collapse Outline'}
	onClick={onToggle}
>
	{collapsed ? <KeyboardArrowRightRoundedIcon /> : <KeyboardArrowLeftRoundedIcon />}
</IconButton>
<Divider />
<IconButton color="inherit" aria-label="outline story add" title="New Story" onClick={createStory}>
	<StoryAddIcon />
</IconButton>
<Divider />
<IconButton
	color="inherit"
	aria-label="outline search"
	title="Step Search"
	onClick={() => setState({ ...state, searchOpen: true })}
>
	<FontAwesomeIcon icon={faSearch} />
</IconButton>
<IconButton
	color="inherit"
	aria-label="outline environments"
	title="Environments"
	onClick={() => setState({ ...state, envsOpen: true })}
>
	<DevicesOtherIcon />
</IconButton>
<Grid item className={classes.verticalIconBarPlaceholder} />
<SearchDialog
	open={state.searchOpen}
	close={() => {
		setState({ ...state, searchOpen: false });
		forceUpdateAll();
	}}
/>
<EnvsDialog open={state.envsOpen} close={() => setState({ ...state, envsOpen: false })} />
</Grid> */
