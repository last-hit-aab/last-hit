import { faFolderOpen, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Theme } from '@material-ui/core';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import { makeStyles } from '@material-ui/core/styles';
import { remote } from 'electron';
import React from 'react';
import history from '../common/history';
import { getTheme, WorkspaceFileExt } from '../global-settings';
import logo from '../images/LH-LOGO.png';
import paths from '../paths';
import { openWorkspace } from '../workspace-settings';

type StyleProps = { stretch: boolean };
type ComponentProps = {} & StyleProps;

const myTheme = getTheme();
const app = remote.app;
const appVersion = app.getVersion();
const useStyles = makeStyles<Theme, StyleProps>(theme => ({
	logo: {
		paddingTop: 30,
		textAlign: 'center',
		'& img': {
			height: 200,
			width: 200,
			filter: 'invert(1)'
		}
	},
	title: {
		paddingTop: 10,
		textAlign: 'center',
		fontSize: '2rem',
		color: myTheme.splashOperationColor
	},
	version: {
		marginTop: -20,
		paddingBottom: 30,
		textAlign: 'center',
		fontWeight: 200,
		color: myTheme.splashOperationColor
	},
	operation: props => ({
		textAlign: 'center',
		// fontSize: Math.max(theme.typography.fontSize * 0.8, 12),

		padding: `0 ${props.stretch ? '38%' : '30%'}`,
		'& > button': {
			fontSize: 12,
			color: myTheme.splashOperationColor,
			whiteSpace: 'nowrap',
			textTransform: 'unset',
			width: '100%',
			'& > span': {
				justifyContent: 'flex-start',
				'& > span:first-child': {
					width: 20,
					display: 'inline-block',
					textAlign: 'left'
				}
			},
			'&:hover': {
				color: myTheme.linkHoverColor
			}
		}
	})
}));

export default (props: ComponentProps): JSX.Element => {
	const { stretch = false } = props;
	const classes = useStyles({ stretch });
	const onCreateWorkspaceClicked = (): void => {
		history.replace(paths.CREATE_WORKSPACE);
	};
	const onOpenWorkspaceClicked = async () => {
		const ret = await remote.dialog.showOpenDialog(remote.getCurrentWindow(), {
			title: 'Workspace selection',
			filters: [{ name: 'Workspace', extensions: [WorkspaceFileExt] }],
			properties: ['openFile', 'showHiddenFiles']
		});
		if (!(ret as any).canceled) {
			const path = ret.filePaths![0];
			openWorkspace(path);
		}
	};

	return (
		<Grid item xs={stretch ? 12 : 7} container direction="column">
			<Grid item className={classes.logo}>
				<img src={logo} alt="" />
			</Grid>
			{/* <Grid item className={classes.title}>
				<span>Last HIT</span>
			</Grid> */}
			<Grid item className={classes.version}>
				<span>Version {appVersion}</span>
			</Grid>
			<Grid item className={classes.operation} container alignItems="center">
				<Button onClick={onCreateWorkspaceClicked}>
					<span>
						<FontAwesomeIcon icon={faPlus} />
					</span>
					<span>Create New Workspace</span>
				</Button>
			</Grid>
			<Grid item className={classes.operation} container alignItems="center">
				<Button onClick={onOpenWorkspaceClicked}>
					<span>
						<FontAwesomeIcon icon={faFolderOpen} />
					</span>
					<span>Open</span>
				</Button>
			</Grid>
			{/* <Grid item className={classes.operation} container alignItems="center">
				<Button>
					<span>
						<FontAwesomeIcon icon={faCodeBranch} />
					</span>
					<span>Check out from Git</span>
				</Button>
			</Grid> */}
		</Grid>
	);
};
