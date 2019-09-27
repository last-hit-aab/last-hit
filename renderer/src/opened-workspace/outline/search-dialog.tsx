import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	List,
	ListItem,
	ListItemText,
	makeStyles,
	TextField
} from '@material-ui/core';
import React, { Fragment } from 'react';
import { getTheme } from '../../global-settings';
import { Flow, getCurrentWorkspace, Story } from '../../workspace-settings';

const myTheme = getTheme();
const useStyles = makeStyles(theme => ({
	dialogContent: {
		overflowY: 'hidden'
	},
	list: {
		paddingTop: 0,
		paddingBottom: 0,
		overflowY: 'auto',
		height: theme.spacing(36),
		'&:hover::-webkit-scrollbar-thumb': {
			opacity: 1
		},
		'&::-webkit-scrollbar': {
			backgroundColor: 'transparent',
			width: 8
		},
		'&::-webkit-scrollbar-thumb': {
			backgroundColor: myTheme.textScrollBarThumbBackgroundColor
		}
	},
	item: {
		paddingTop: 0,
		paddingBottom: 0,
		cursor: 'pointer',
		fontSize: '0.8rem',
		'&:hover': {
			color: theme.palette.primary.light,
			'& p': {
				color: theme.palette.primary.light
			}
		}
	}
}));

export default (props: {
	open: boolean;
	openFlow: (story: Story, flow: Flow) => void;
	close: () => void;
}): JSX.Element => {
	const { open, openFlow, close } = props;
	const classes = useStyles({});

	const [state, setState] = React.useState({
		text: '',
		items: [] as { story: Story; flow: Flow }[]
	});
	if (!open) {
		return <Fragment />;
	}

	const handleTextChange = (event: any): void => {
		const text = event.target.value;
		let items: { story: Story; flow: Flow }[] = [];
		if (text.trim().length !== 0) {
			const { structure } = getCurrentWorkspace();
			const str = text.toLowerCase();
			items = (structure.stories || [])
				.map(story => {
					return (story.flows || [])
						.filter(flow => {
							return (
								story.name.toLowerCase().indexOf(str) !== -1 ||
								flow.name.toLowerCase().indexOf(str) !== -1 ||
								(flow.description || '').toLowerCase().indexOf(str) !== -1
							);
						})
						.map(flow => ({ story, flow }));
				})
				.flat();
		}
		setState({ text, items });
	};
	const handleItemClicked = (story: Story, flow: Flow): void => {
		openFlow(story, flow);
		setState({ text: '', items: [] });
		close();
	};

	return (
		<Dialog open={open} onClose={() => close()} fullWidth={true} disableBackdropClick={true}>
			<DialogTitle>Flow Search</DialogTitle>
			<DialogContent className={classes.dialogContent}>
				<DialogContentText>Please, specify search text.</DialogContentText>
				<TextField
					label="Search Text"
					value={state.text}
					margin="dense"
					fullWidth
					onChange={handleTextChange}
					autoFocus
				/>
				<List dense className={classes.list}>
					{state.items.map(({ story, flow }) => {
						const name = `${flow.name} @ ${story.name}`;
						return (
							<ListItem
								alignItems="flex-start"
								dense
								key={name}
								disableGutters
								className={classes.item}
								onClick={() => handleItemClicked(story, flow)}
							>
								<ListItemText primary={name} secondary={flow.description} />
							</ListItem>
						);
					})}
				</List>
			</DialogContent>
			<DialogActions>
				<Button onClick={() => close()} variant="contained">
					Close
				</Button>
			</DialogActions>
		</Dialog>
	);
};
