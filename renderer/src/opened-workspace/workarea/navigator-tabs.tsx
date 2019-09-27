import { Button, MenuItem, Tab, Tabs, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import CloseTabIcon from '@material-ui/icons/Clear';
import FlowIcon from '@material-ui/icons/Subscriptions';
import React, { Fragment } from 'react';
import { getTheme } from '../../global-settings';
import { Flow, getCurrentWorkspaceSettings, getFlowFilePath, Story } from '../../workspace-settings';
import PopMenus, { usePopoverStyles } from '../pop-menus';

const myTheme = getTheme();

const PopMenu = (props: {
	open: boolean;
	top: number;
	left: number;
	story: null | Story;
	flow: null | Flow;
	closeMenu: () => void;
	closeMe: (story: Story, flow: Flow) => void;
	closeOthers: (story: Story, flow: Flow) => void;
	closeAll: (story: Story, flow: Flow) => void;
}): JSX.Element => {
	const { open, top, left, story, flow, closeMenu, closeMe, closeOthers, closeAll } = props;
	const classes = usePopoverStyles({});

	const onCloseMeClicked = () => {
		closeMe(story!, flow!);
		closeMenu();
	};
	const onCloseOthersClicked = () => {
		closeOthers(story!, flow!);
		closeMenu();
	};
	const onCloseAllClicked = () => {
		closeAll(story!, flow!);
		closeMenu();
	};
	return (
		<PopMenus open={open} top={top} left={left} close={closeMenu}>
			<MenuItem dense onClick={onCloseMeClicked}>
				<Typography variant="inherit" className={classes.menuText}>
					Close
				</Typography>
			</MenuItem>
			<MenuItem dense onClick={onCloseOthersClicked}>
				<Typography variant="inherit" className={classes.menuText}>
					Close Others
				</Typography>
			</MenuItem>
			<MenuItem dense onClick={onCloseAllClicked}>
				<Typography variant="inherit" className={classes.menuText}>
					Close All
				</Typography>
			</MenuItem>
		</PopMenus>
	);
};

const useTabStyles = makeStyles(theme => ({
	root: {
		minHeight: theme.spacing(4),
		width: '100%',
		'& .MuiTabs-indicator': {
			backgroundColor: myTheme.workareaTabsIndicatorBackgroundColor,
			height: 1
		}
	},
	tab: {
		minHeight: theme.spacing(4),
		maxWidth: theme.spacing(20),
		paddingTop: 0,
		paddingBottom: 0,
		paddingRight: 0,
		fontSize: '0.7rem',
		fontWeight: 400,
		'& .MuiTab-wrapper': {
			flexDirection: 'row',
			'& > *:first-child': {
				marginBottom: 0,
				marginRight: 10,
				fontSize: '0.7rem',
				color: theme.palette.primary.main
			},
			'& > span:nth-child(2)': {
				flexGrow: 1,
				textTransform: 'none',
				textAlign: 'left',
				overflowX: 'hidden',
				whiteSpace: 'nowrap',
				textOverflow: 'ellipsis'
			},
			'& > span:last-child': {
				padding: 0,
				height: theme.spacing(3),
				minWidth: theme.spacing(3),
				opacity: 0,
				transition: 'opacity 200ms ease-in-out',
				'& svg': {
					fontSize: '0.8rem',
					opacity: myTheme.opacityForFontColor
				}
			}
		},
		'&:hover': {
			'& .MuiTab-wrapper': {
				'& > span:last-child': {
					opacity: 1
				}
			}
		}
	},
	flowIcon: {
		color: myTheme.flowIconColor
	}
}));
export default (props: {
	flows: { story: Story; flow: Flow }[];
	activeFlow: { story: Story; flow: Flow } | null;
	changeActiveFlow: (story: Story, flow: Flow) => void;
	removeOpenedFlow: (story: Story, flow: Flow) => void;
	removeOtherFlows: (story: Story, flow: Flow) => void;
	removeAllOpenedFlows: (story: Story, flow: Flow) => void;
}): JSX.Element => {
	const { flows, activeFlow, changeActiveFlow, removeOpenedFlow, removeOtherFlows, removeAllOpenedFlows } = props;
	const classes = useTabStyles({});

	const [anchorOptions, setAnchorOptions] = React.useState({
		open: false,
		top: 0,
		left: 0,
		story: null as Story | null,
		flow: null as Flow | null
	});

	if (flows.length === 0) {
		return <Fragment />;
	}

	const activeTabIndex = flows.findIndex(
		item => activeFlow != null && item.story === activeFlow.story && item.flow === activeFlow.flow
	);
	const isCloseButton = (event: React.SyntheticEvent): boolean => {
		const target = event.target as HTMLElement;
		return (
			target.getAttribute('data-role') === 'close-button' ||
			target.parentElement!.getAttribute('data-role') === 'close-button'
		);
	};
	const onTabChange = (event: React.ChangeEvent<{}>, newTabIndex: any): void => {
		if (isCloseButton(event as any)) {
			return;
		}
		const newActiveFlow = flows[newTabIndex as number];
		changeActiveFlow(newActiveFlow.story, newActiveFlow.flow);
	};
	const onTabCloseClicked = (story: Story, flow: Flow): void => removeOpenedFlow(story, flow);
	const onTabClicked = (event: React.MouseEvent, story: Story, flow: Flow): void => {
		if (isCloseButton(event)) {
			return;
		}
		if (event.button === 2) {
			setAnchorOptions({ open: true, top: event.clientY, left: event.clientX, story, flow });
		}
	};

	const closeMenu = () => setAnchorOptions({ open: false, top: 0, left: 0, story: null, flow: null });
	const closeMe = (story: Story, flow: Flow): void => removeOpenedFlow(story, flow);
	const closeOthers = (story: Story, flow: Flow): void => removeOtherFlows(story, flow);
	const closeAll = (story: Story, flow: Flow): void => removeAllOpenedFlows(story, flow);
	const menusProps = { ...anchorOptions, closeMenu, closeMe, closeOthers, closeAll };

	return (
		<Tabs
			value={activeTabIndex}
			onChange={onTabChange}
			variant="scrollable"
			scrollButtons="on"
			className={classes.root}
		>
			{flows.map(({ story, flow }) => {
				return (
					<Tab
						component="span"
						label={
							<Fragment>
								<span>
									{flow.name}@{story.name}
								</span>
								<Button
									component="span"
									onClick={() => onTabCloseClicked(story, flow)}
									title="Close"
									data-role="close-button"
								>
									<CloseTabIcon data-role="close-button" />
								</Button>
							</Fragment>
						}
						className={classes.tab}
						icon={<FlowIcon className={classes.flowIcon} />}
						title={getFlowFilePath(getCurrentWorkspaceSettings()!, story, flow)}
						onMouseUp={(event: React.MouseEvent) => onTabClicked(event, story, flow)}
					/>
				);
			})}
			<PopMenu {...menusProps} />
		</Tabs>
	);
};
