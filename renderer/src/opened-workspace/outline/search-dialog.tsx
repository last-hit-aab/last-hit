import {
	Button,
	Checkbox,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	FormControlLabel,
	IconButton,
	List,
	ListItem,
	ListItemSecondaryAction,
	ListItemText,
	makeStyles,
	TextField
} from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/HighlightOff';
import DoIcon from '@material-ui/icons/OfflinePin';
import React, { Fragment } from 'react';
import { getTheme } from '../../global-settings';
import { Flow, getCurrentWorkspace, Step, Story } from '../../workspace-settings';

const myTheme = getTheme();
const useStyles = makeStyles(theme => ({
	dialogContent: {
		overflowY: 'hidden',
		display: 'grid',
		gridTemplateColumns: 'auto auto',
		gridColumnGap: theme.spacing(2)
	},
	dialogContentText: {
		gridColumn: 'span 2'
	},
	statusBar: {
		gridColumn: 'span 2',
		display: 'grid',
		gridTemplateColumns: 'auto auto 1fr auto auto',
		'& > .MuiFormControlLabel-root > span:first-child': {
			paddingTop: 4,
			paddingBottom: 4
		},
		'& > button:last-child': {
			marginLeft: theme.spacing(2)
		}
	},
	list: {
		gridColumn: 'span 2',
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
	itemButton: {
		transform: 'scale(0.7)',
		opacity: 0.7
	},
	story: {
		paddingTop: 0,
		paddingBottom: 0,
		paddingRight: theme.spacing(10),
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
		paddingRight: theme.spacing(10),
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
		paddingRight: theme.spacing(10),
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

export default (props: { open: boolean; close: () => void }): JSX.Element => {
	const { open, close } = props;
	const classes = useStyles({});

	const [text, setText] = React.useState('');
	const [status, setStatus] = React.useState({ caseSensitive: false, regexp: false });
	const [replacement, setReplacement] = React.useState('');
	const [items, setItems] = React.useState([] as SearchResult);
	if (!open) {
		return <Fragment />;
	}

	const handleTextChange = (event: any): void => {
		const text = event.target.value;
		setText(text);
	};
	const handleStatusChange = (name: string) => (evt: any): void => {
		const checked = evt.target.checked;
		setStatus({ ...status, [name]: checked });
	};
	const handleReplacementChange = (evt: any): void => {
		setReplacement(evt.target.value);
	};

	const { structure } = getCurrentWorkspace();
	let searchHandler: NodeJS.Timeout | null = null;
	const onSearchClicked = () => {
		if (searchHandler) {
			clearTimeout(searchHandler);
		}

		searchHandler = setTimeout(() => {
			let items: SearchResult = [];
			if (text.trim().length > 1) {
				let test: RegExp | string = text;
				if (status.regexp) {
					if (status.caseSensitive) {
						// regexp and case not sensitive
						test = new RegExp(text);
					} else {
						// regexp and case sensitive
						test = new RegExp(text, 'i');
					}
				} else if (!status.caseSensitive) {
					// case not sensitive
					test = text.toLowerCase();
				}

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
								if (status.regexp) {
									return (test as RegExp).test(content);
								} else if (status.caseSensitive) {
									return (content || '').indexOf(test as string) !== -1;
								} else {
									return (content || '').toLowerCase().indexOf(test as string) !== -1;
								}
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
	};
	const removeStory = (matchedStory: MatchedStory): void => {
		setItems(items.filter(story => story !== matchedStory));
	};
	const removeFlow = (matchedStory: MatchedStory, matchedFlow: MatchedFlow): void => {
		setItems(
			items.filter(story => {
				story.flows = story.flows.filter(flow => flow !== matchedFlow);
				return story.flows.length !== 0;
			})
		);
	};
	const removeStep = (matchedStory: MatchedStory, matchedFlow: MatchedFlow, matchedStep: MatchedStep): void => {
		setItems(
			items.filter(story => {
				story.flows = story.flows.filter(flow => {
					flow.steps = flow.steps.filter(step => step !== matchedStep);
					return flow.steps.length !== 0;
				});
				return story.flows.length !== 0;
			})
		);
	};
	const replaceStory = (matchedStory: MatchedStory): void => {
		removeStory(matchedStory);
	};
	const replaceFlow = (matchedStory: MatchedStory, matchedFlow: MatchedFlow): void => {
		removeFlow(matchedStory, matchedFlow);
	};
	const replaceStep = (matchedStory: MatchedStory, matchedFlow: MatchedFlow, matchedStep: MatchedStep): void => {
		removeStep(matchedStory, matchedFlow, matchedStep);
	};
	const replaceAll = (): void => {
		items.forEach((story: MatchedStory) => replaceStory(story));
	};

	return (
		<Dialog open={open} onClose={() => close()} fullWidth={true} disableBackdropClick={true} maxWidth="lg">
			<DialogTitle>Step Search</DialogTitle>
			<DialogContent className={classes.dialogContent}>
				<DialogContentText className={classes.dialogContentText}>
					Please, specify search text.
				</DialogContentText>
				<TextField label="Search By" value={text} margin="dense" onChange={handleTextChange} autoFocus />
				<TextField label="Replace To" value={replacement} margin="dense" onChange={handleReplacementChange} />
				<div className={classes.statusBar}>
					<FormControlLabel
						control={
							<Checkbox
								checked={status.caseSensitive}
								onChange={handleStatusChange('caseSensitive')}
								color="primary"
							/>
						}
						label="Case sensitive"
					/>
					<FormControlLabel
						control={
							<Checkbox checked={status.regexp} onChange={handleStatusChange('regexp')} color="primary" />
						}
						label="Use regexp"
					/>
					<span></span>
					<Button
						onClick={onSearchClicked}
						variant="contained"
						size="small"
						disabled={(text || '').trim().length === 0}
						color="primary"
					>
						Search
					</Button>
					<Button
						onClick={replaceAll}
						variant="contained"
						size="small"
						disabled={items.length === 0}
						color="primary"
					>
						Replace
					</Button>
				</div>
				<List dense className={classes.list}>
					{items.map((matchedStory: MatchedStory) => {
						const { story, flows } = matchedStory;
						return (
							<Fragment key={story.name}>
								<ListItem alignItems="flex-start" dense disableGutters className={classes.story}>
									<span>S</span>
									<ListItemText primary={story.name} secondary={story.description} />
									<ListItemSecondaryAction>
										<IconButton
											edge="end"
											size="small"
											title="Replace"
											onClick={() => replaceStory(matchedStory)}
											color="secondary"
											className={classes.itemButton}
										>
											<DoIcon />
										</IconButton>
										<IconButton
											edge="end"
											size="small"
											title="Remove from search list"
											onClick={() => removeStory(matchedStory)}
											color="secondary"
											className={classes.itemButton}
										>
											<DeleteIcon />
										</IconButton>
									</ListItemSecondaryAction>
								</ListItem>
								{flows.map((matchedFlow: MatchedFlow) => {
									const { flow, steps } = matchedFlow;
									return (
										<Fragment key={flow.name}>
											<ListItem
												key={flow.name}
												alignItems="flex-start"
												dense
												disableGutters
												className={classes.flow}
											>
												<span>F</span>
												<ListItemText primary={flow.name} secondary={flow.description} />
												<ListItemSecondaryAction>
													<IconButton
														edge="end"
														size="small"
														title="Replace"
														onClick={() => replaceFlow(matchedStory, matchedFlow)}
														color="secondary"
														className={classes.itemButton}
													>
														<DoIcon />
													</IconButton>
													<IconButton
														edge="end"
														size="small"
														title="Remove from search list"
														onClick={() => removeFlow(matchedStory, matchedFlow)}
														color="secondary"
														className={classes.itemButton}
													>
														<DeleteIcon />
													</IconButton>
												</ListItemSecondaryAction>
											</ListItem>
											{steps.map((matchedStep: MatchedStep) => {
												const { step, matchTypes } = matchedStep;
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
														>
															<span>S</span>
															<ListItemText primary={matched} />
															<ListItemSecondaryAction>
																<IconButton
																	edge="end"
																	size="small"
																	title="Replace"
																	onClick={() =>
																		replaceStep(
																			matchedStory,
																			matchedFlow,
																			matchedStep
																		)
																	}
																	color="secondary"
																	className={classes.itemButton}
																>
																	<DoIcon />
																</IconButton>
																<IconButton
																	edge="end"
																	size="small"
																	title="Remove from search list"
																	onClick={() =>
																		removeStep(
																			matchedStory,
																			matchedFlow,
																			matchedStep
																		)
																	}
																	color="secondary"
																	className={classes.itemButton}
																>
																	<DeleteIcon />
																</IconButton>
															</ListItemSecondaryAction>
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
