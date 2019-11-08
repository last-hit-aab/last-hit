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
import { Flow, getCurrentWorkspace, Step, Story } from '../../workspace-settings';

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
	story: {
		paddingTop: 0,
		paddingBottom: 0,
		cursor: 'pointer',
		fontSize: '0.8rem',
		'&:hover': {
			color: theme.palette.primary.light,
			'& p': {
				color: theme.palette.primary.light
			}
		},
		'& > span:first-child': {
			borderRadius: '100%',
			width: theme.spacing(2),
			height: theme.spacing(2),
			textAlign: 'center',
			color: theme.palette.primary.contrastText,
			marginRight: 5,
			backgroundColor: theme.palette.primary.main,
			transform: 'scale(0.7)',
			fontWeight: 'bold',
			alignSelf: 'center'
		}
	},
	flow: {
		paddingTop: 0,
		paddingBottom: 0,
		cursor: 'pointer',
		fontSize: '0.8rem',
		'&:hover': {
			color: theme.palette.primary.light,
			'& p': {
				color: theme.palette.primary.light
			}
		},
		'& > span:first-child': {
			borderRadius: '100%',
			width: theme.spacing(2),
			height: theme.spacing(2),
			textAlign: 'center',
			color: theme.palette.primary.contrastText,
			marginLeft: 20,
			marginRight: 5,
			backgroundColor: theme.palette.primary.main,
			transform: 'scale(0.7)',
			fontWeight: 'bold',
			alignSelf: 'center'
		}
	},
	step: {
		paddingTop: 0,
		paddingBottom: 0,
		cursor: 'pointer',
		fontSize: '0.8rem',
		'&:hover': {
			color: theme.palette.primary.light,
			'& p': {
				color: theme.palette.primary.light
			}
		},
		'& > span:first-child': {
			borderRadius: '100%',
			width: theme.spacing(2),
			height: theme.spacing(2),
			textAlign: 'center',
			color: theme.palette.primary.contrastText,
			marginLeft: 40,
			marginRight: 5,
			backgroundColor: theme.palette.primary.main,
			transform: 'scale(0.7)',
			fontWeight: 'bold',
			alignSelf: 'center'
		}
	}
}));

enum MatchType {
	HUMAN = 0,
	URL = 1,
	XPATH = 2,
	CSSPATH = 3,
	TARGET = 4
}
type MatchedStep = { step: Step; matchTypes: MatchType[] };
type MatchedFlow = { flow: Flow; steps: MatchedStep[] };
type MatchedStory = { story: Story; flows: MatchedFlow[] };
type SearchResult = MatchedStory[];

export default (props: {
	open: boolean;
	close: () => void;
}): JSX.Element => {
	const { open, close } = props;
	const classes = useStyles({});

	const [text, setText] = React.useState('');
	const [items, setItems] = React.useState([] as SearchResult);
	if (!open) {
		return <Fragment />;
	}

	const { structure } = getCurrentWorkspace();
	let searchHandler: NodeJS.Timeout | null = null;

	const handleTextChange = (event: any): void => {
		const text = event.target.value;
		if (searchHandler) {
			clearTimeout(searchHandler);
		}
		searchHandler = setTimeout(() => {
			let items: SearchResult = [];
			if (text.trim().length > 1) {
				const str = text.toLowerCase();
				(structure.stories || []).forEach(story => {
					let matchedStory: MatchedStory | null = null;
					(story.flows || []).forEach(flow => {
						let matchedFlow: MatchedFlow | null = null;
						(flow.steps || []).forEach(step => {
							const match = [
								step.human,
								(step as any).url,
								step.path,
								step.csspath,
								(step as any).target
							].map((content: string) => {
								return (content || '').toLowerCase().indexOf(str) !== -1;
							});
							if (match.some(value => value === true)) {
								// match anyone
								if (!matchedStory) {
									matchedStory = { story, flows: [] };
									items.push(matchedStory);
								}
								if (!matchedFlow) {
									matchedFlow = { flow, steps: [] };
									matchedStory.flows.push(matchedFlow);
								}
								matchedFlow.steps.push({
									step,
									matchTypes: match
										.map((value: boolean, index: number) => (value ? index : -1))
										.filter(value => value !== -1)
								});
							}
						});
					});
				});
			}
			setItems(items);
		}, 500);
		setText(text);
	};
	// const handleItemClicked = (story: Story, flow: Flow): void => {
	// 	openFlow(story, flow);
	// 	setText('');
	// 	setItems([]);
	// 	close();
	// };

	return (
		<Dialog open={open} onClose={() => close()} fullWidth={true} disableBackdropClick={true} maxWidth="lg">
			<DialogTitle>Step Search</DialogTitle>
			<DialogContent className={classes.dialogContent}>
				<DialogContentText>Please, specify search text.</DialogContentText>
				<TextField
					label="Search Text"
					value={text}
					margin="dense"
					fullWidth
					onChange={handleTextChange}
					autoFocus
				/>
				<List dense className={classes.list}>
					{items.map(({ story, flows }) => {
						return (
							<Fragment key={story.name}>
								<ListItem
									alignItems="flex-start"
									dense
									disableGutters
									className={classes.story}
									// onClick={() => handleItemClicked(story, flow)}
								>
									<span>S</span>
									<ListItemText primary={story.name} secondary={story.description} />
								</ListItem>
								{flows.map(({ flow, steps }) => {
									return (
										<Fragment key={flow.name}>
											<ListItem
												key={flow.name}
												alignItems="flex-start"
												dense
												disableGutters
												className={classes.flow}
												// onClick={() => handleItemClicked(story, flow)}
											>
												<span>F</span>
												<ListItemText primary={flow.name} secondary={flow.description} />
											</ListItem>
											{steps.map(({ step, matchTypes }) => {
												return matchTypes.map(matchType => {
													let matched = null;
													switch (matchType) {
														case MatchType.HUMAN:
															matched = step.human;
															break;
														case MatchType.URL:
															matched = (step as any).url;
															break;
														case MatchType.XPATH:
															matched = step.path;
															break;
														case MatchType.CSSPATH:
															matched = step.csspath;
															break;
														case MatchType.TARGET:
															matched = (step as any).target;
															break;
													}
													matched = `#${step.stepIndex} [${step.type.toUpperCase()}] [${
														MatchType[matchType]
													}] ${matched}`;
													return (
														<ListItem
															key={`${step.stepUuid}-${matchType}`}
															alignItems="flex-start"
															dense
															disableGutters
															className={classes.step}
															// onClick={() => handleItemClicked(story, flow)}
														>
															<span>S</span>
															<ListItemText primary={matched} />
														</ListItem>
													);
												});
											})}
										</Fragment>
									);
								})}
							</Fragment>
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
