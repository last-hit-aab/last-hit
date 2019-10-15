import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Divider } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import { makeStyles } from '@material-ui/core/styles';
import DevicesOtherIcon from '@material-ui/icons/DevicesOther';
// import HelpIcon from '@material-ui/icons/HelpOutline';
import KeyboardArrowLeftRoundedIcon from '@material-ui/icons/KeyboardArrowLeftRounded';
import KeyboardArrowRightRoundedIcon from '@material-ui/icons/KeyboardArrowRightRounded';
import StoryAddIcon from '@material-ui/icons/LibraryAdd';
// import StoryPlayIcon from '@material-ui/icons/PlayCircleOutline';
// import SettingsIcon from '@material-ui/icons/Settings';
import React from 'react';
import { getTheme } from '../../global-settings';
import { Flow, Story } from '../../workspace-settings';
import SearchDialog from './search-dialog';
import EnvsDialog from './envs-dialog';

const myTheme = getTheme();

const useVerticalIconBarStyles = makeStyles(theme => ({
	verticalIconBar: {
		width: 48,
		height: '100%',
		boxShadow: myTheme.outlineBoxShadow,
		'& > button': {
			opacity: 0.5
		}
	},
	verticalIconBarPlaceholder: {
		flexGrow: 1
	}
}));
export default (props: {
	onToggle: () => void;
	collapsed: boolean;
	createStory: () => void;
	openFlow: (story: Story, flow: Flow) => void;
}): JSX.Element => {
	const { onToggle, collapsed, createStory, openFlow } = props;
	const classes = useVerticalIconBarStyles({});

	const [state, setState] = React.useState({
		searchOpen: false,
		envsOpen: false
	});

	return (
		<Grid item className={classes.verticalIconBar} container direction="column">
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
			{/* <IconButton color="inherit" aria-label="outline story play" title="Play Story">
				<StoryPlayIcon />
			</IconButton> */}
			<Divider />
			<IconButton
				color="inherit"
				aria-label="outline search"
				title="Flow Search"
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
			{/* <IconButton color="inherit" aria-label="outline settings" title="Workspace Settings">
				<SettingsIcon />
			</IconButton> */}
			{/* <IconButton color="inherit" aria-label="outline help" title="Help">
				<HelpIcon />
			</IconButton> */}
			<SearchDialog
				open={state.searchOpen}
				close={() => setState({ ...state, searchOpen: false })}
				openFlow={openFlow}
			/>
			<EnvsDialog open={state.envsOpen} close={() => setState({ ...state, envsOpen: false })} />
		</Grid>
	);
};
