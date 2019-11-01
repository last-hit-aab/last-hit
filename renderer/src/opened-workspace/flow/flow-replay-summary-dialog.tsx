import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Grid,
	List,
	ListItem,
	ListItemText,
	makeStyles,
	Tab,
	Tabs,
	TextField,
	Typography
} from '@material-ui/core';
import { remote } from 'electron';
import path from 'path';
import React, { Fragment } from 'react';
import { getTheme } from '../../global-settings';
import { Flow, Story } from '../../workspace-settings';
import ThumbnailDialog from './thumbnail-view-dialog';

const myTheme = getTheme();
const useStyles = makeStyles(theme => ({
	root: {
		overflow: 'hidden'
	},
	summary: {
		display: 'grid',
		gridTemplateColumns: 'auto auto auto auto auto',
		gridColumnGap: theme.spacing(2)
	},
	tabs: {
		gridColumn: 'span 5',
		minHeight: 'unset',
		height: theme.spacing(4),
		'& .MuiTabs-flexContainer > button': {
			minWidth: theme.spacing(15),
			paddingTop: 0,
			paddingBottom: 0,
			minHeight: 'unset',
			height: theme.spacing(4),
			'& > .MuiTab-wrapper': {
				textOverflow: 'ellipsis',
				overflowX: 'hidden',
				whiteSpace: 'nowrap'
			}
		},
		'& .MuiTabs-indicator': {
			backgroundColor: theme.palette.primary.light
		}
	},
	errorTab: {
		gridColumn: 'span 5',
		width: 'unset',
		height: theme.spacing(50),
		paddingTop: theme.spacing(1),
		paddingBottom: theme.spacing(1),
		'&[data-hidden=true]': {
			display: 'none'
		},
		'& > *': {
			flexGrow: 1,
			'& > div': {
				height: '100%',
				alignItems: 'stretch',
				'&:before, &:after': {
					display: 'none'
				}
			}
		}
	},
	screenshotTab: {
		gridColumn: 'span 5',
		width: 'unset',
		height: theme.spacing(50),
		paddingTop: theme.spacing(1),
		paddingBottom: theme.spacing(1),
		overflow: 'auto',
		'&:hover::-webkit-scrollbar-thumb': {
			opacity: 1
		},
		'&::-webkit-scrollbar': {
			backgroundColor: 'transparent',
			width: 8
		},
		'&::-webkit-scrollbar-thumb': {
			backgroundColor: myTheme.textScrollBarThumbBackgroundColor
		},
		'&[data-hidden=true]': {
			display: 'none'
		},
		'& > ul': {
			width: '100%',
			'& > div.MuiListItem-root': {
				'& > span:not(.MuiTouchRipple-root)': {
					marginLeft: theme.spacing(2),
					marginRight: theme.spacing(2),
					'&:first-child': {
						marginLeft: 0
					}
				},
				'& > img': {
					height: 60
				}
			}
		}
	},
	ajaxTab: {
		gridColumn: 'span 5',
		width: 'unset',
		height: theme.spacing(50),
		paddingTop: theme.spacing(1),
		paddingBottom: theme.spacing(1),
		overflow: 'auto',
		'&:hover::-webkit-scrollbar-thumb': {
			opacity: 1
		},
		'&::-webkit-scrollbar': {
			backgroundColor: 'transparent',
			width: 8
		},
		'&::-webkit-scrollbar-thumb': {
			backgroundColor: myTheme.textScrollBarThumbBackgroundColor
		},
		'&[data-hidden=true]': {
			display: 'none'
		},
		'& > ul': {
			width: '100%',
			'& > div': {
				paddingTop: 0,
				paddingBottom: 0,
				'& > div': {
					marginTop: 0,
					marginBottom: 0,
					display: 'flex',
					'& > span': {
						flexGrow: 1,
						overflow: 'hidden',
						marginRight: theme.spacing(2),
						whiteSpace: 'nowrap',
						textOverflow: 'ellipsis'
					}
				}
			}
		}
	}
}));

export default (props: {
	story: Story;
	flow: Flow;
	data: { summary: any | null; error: string | null; errorStack: string | null };
	close: () => void;
}): JSX.Element => {
	const {
		story: { name: storyName },
		flow: { name: flowName },
		data,
		close
	} = props;
	const { error = null, errorStack = null, summary = null } = data || {};
	const classes = useStyles({});

	const [tabIndex, setTabIndex] = React.useState(0);
	const handleTabChange = (event: any, newValue: number): void => setTabIndex(newValue);
	const [thumbnail, setThumbnail] = React.useState(null as string | null);
	const onThumbnailDialogClose = () => setThumbnail(null);

	if (!summary) {
		return <Fragment />;
	}

	const title = `Replay Summary, ${error ? 'Error Occurred' : 'Successfully'}`;

	return (
		<Fragment>
			<Dialog open={true} onClose={() => close()} fullWidth={true} disableBackdropClick={true} maxWidth="lg">
				<DialogTitle>{title}</DialogTitle>
				<DialogContent className={classes.root}>
					<Grid container className={classes.summary}>
						<TextField
							label="Step Count"
							defaultValue={summary.numberOfStep}
							margin="dense"
							InputProps={{
								readOnly: true
							}}
						/>
						<TextField
							label="Total Passed Step Count"
							defaultValue={summary.numberOfUIBehavior}
							margin="dense"
							InputProps={{
								readOnly: true
							}}
						/>
						<TextField
							label="Passed UI Step Count"
							defaultValue={summary.numberOfUIBehavior}
							margin="dense"
							InputProps={{
								readOnly: true
							}}
						/>
						<TextField
							label="Ajax Count"
							defaultValue={summary.numberOfAjax}
							margin="dense"
							InputProps={{
								readOnly: true
							}}
						/>
						<TextField
							label="Slow Ajax Count"
							defaultValue={(summary.slowAjaxRequest || []).length}
							margin="dense"
							InputProps={{
								readOnly: true
							}}
						/>
						<Tabs value={tabIndex} onChange={handleTabChange} className={classes.tabs}>
							<Tab label="Error" key="error" />
							<Tab label="Screenshot Comparison" key="screenshot" />
							<Tab label="Slow Ajax" key="ajax" />
						</Tabs>
						<Grid item container data-hidden={tabIndex !== 0} role="tabpanel" className={classes.errorTab}>
							<TextField
								multiline
								defaultValue={errorStack ? errorStack : 'Everything is OK.'}
								margin="dense"
								fullWidth
								InputProps={{ readOnly: true, 'aria-label': 'naked' }}
							/>
						</Grid>
						<Grid
							item
							container
							data-hidden={tabIndex !== 1}
							role="tabpanel"
							className={classes.screenshotTab}
						>
							{(summary.screenCompareList || {}).length === 0 ? (
								<Typography variant="body2" gutterBottom>
									No screenshot comparison or all comparisons are passed.
								</Typography>
							) : (
								<List dense={true}>
									{summary.screenCompareList.map((item: { stepUuid: string; stepIndex: number }) => {
										const { stepUuid } = item;
										const folder = path.join(
											remote.app.getPath('logs'),
											'screen-record',
											storyName,
											flowName
										);
										return (
											<ListItem key={stepUuid} button={true}>
												<span>Record:</span>
												<img
													src={`${path.join(folder, `${stepUuid}_baseline.png`)}`}
													alt=""
													onClick={() =>
														setThumbnail(path.join(folder, `${stepUuid}_baseline.png`))
													}
												/>
												<span>Replay:</span>
												<img
													src={`${path.join(folder, `${stepUuid}_replay.png`)}`}
													alt=""
													onClick={() =>
														setThumbnail(path.join(folder, `${stepUuid}_replay.png`))
													}
												/>
												<span>Compare:</span>
												<img
													src={`${path.join(folder, `${stepUuid}_diff.png`)}`}
													alt=""
													onClick={() =>
														setThumbnail(path.join(folder, `${stepUuid}_diff.png`))
													}
												/>
											</ListItem>
										);
									})}
								</List>
							)}
						</Grid>
						<Grid item container data-hidden={tabIndex !== 2} role="tabpanel" className={classes.ajaxTab}>
							{(summary.slowAjaxRequest || []).length === 0 ? (
								<Typography variant="body2" gutterBottom>
									No slow ajax requests.
								</Typography>
							) : (
								<List dense={true}>
									{summary.slowAjaxRequest.map(
										(item: { url: string; time: number }, index: number) => {
											const { url, time } = item;
											return (
												<ListItem key={`${url}-${index}`} button={true}>
													<ListItemText primary={url} secondary={`${time}ms`} />
												</ListItem>
											);
										}
									)}
								</List>
							)}
						</Grid>
					</Grid>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => close()} variant="contained">
						Close
					</Button>
				</DialogActions>
			</Dialog>
			{thumbnail ? (
				<ThumbnailDialog open={thumbnail != null} close={onThumbnailDialogClose} image={thumbnail} />
			) : null}
		</Fragment>
	);
};
