import { MenuList } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import React from 'react';
import { getTheme } from '../../global-settings';

const myTheme = getTheme();

const useMenuStyles = makeStyles(theme => ({
	menuList: {
		minWidth: 200,
		maxWidth: 300,
		maxHeight: 316, //`calc(80vh + ${theme.spacing(2)}px)`,
		overflowY: 'auto',
		'&::-webkit-scrollbar': {
			backgroundColor: 'transparent',
			width: 0
		},
		'&:before': {
			content: "''",
			display: 'block',
			position: 'sticky',
			top: -5,
			left: '50%',
			width: 0,
			height: 0,
			transform: 'translateX(-50%)',
			borderLeft: '10px solid transparent',
			borderRight: '10px solid transparent',
			borderBottom: '3px solid #fff',
			opacity: 0,
			transition: 'opacity 200ms ease-in-out'
		},
		'&:after': {
			content: "''",
			display: 'block',
			position: 'sticky',
			bottom: -5,
			left: '50%',
			width: 0,
			height: 0,
			transform: 'translateX(-50%)',
			borderLeft: '10px solid transparent',
			borderRight: '10px solid transparent',
			borderTop: '3px solid #fff',
			opacity: 0,
			transition: 'opacity 200ms ease-in-out'
		},
		'&[data-top-arrow=true]:before': {
			opacity: 0.3
		},
		'&[data-bottom-arrow=true]:after': {
			opacity: 0.3
		}
	},
	menuIcon: {
		minWidth: theme.spacing(4),
		'&> svg': {
			fontSize: '1rem',
			opacity: myTheme.opacityForFontColor
		}
	},
	menuText: {
		fontSize: '0.8rem',
		opacity: myTheme.opacityForFontColor,
		overflowX: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap'
	}
}));
export default (props: { children: any }): JSX.Element => {
	const classes = useMenuStyles({});
	const onMenuScroll = (event: any) => {
		const target = event.target as HTMLElement;
		const top = target.scrollTop;
		if (top !== 0) {
			// show top arrow
			target.setAttribute('data-top-arrow', 'true');
		} else {
			target.setAttribute('data-top-arrow', 'false');
		}
		if (top + target.clientHeight < target.scrollHeight) {
			// show bottom arrow
			target.setAttribute('data-bottom-arrow', 'true');
		} else {
			target.setAttribute('data-bottom-arrow', 'false');
		}
	};
	const menuListRef = React.createRef<HTMLUListElement>();
	// only run once
	React.useEffect(() => {
		const menus = menuListRef.current!;
		if (menus.scrollHeight > menus.clientHeight) {
			// show bottom arrow
			menus.setAttribute('data-bottom-arrow', 'true');
		}
	});

	return (
		<MenuList className={classes.menuList} onScroll={onMenuScroll} ref={menuListRef}>
			{props.children}
		</MenuList>
	);
};
