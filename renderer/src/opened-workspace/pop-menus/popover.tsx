import { Popover } from '@material-ui/core';
import React from 'react';
import Menus from './menus';

export default (props: {
	open: boolean;
	top: number;
	left: number;
	close: () => void;
	children: any;
}): JSX.Element => {
	const { open, top, left, close: closeMenu, children } = props;

	return (
		<Popover
			open={open}
			onClose={closeMenu}
			anchorReference="anchorPosition"
			anchorPosition={{ top, left }}
			anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
			transformOrigin={{ vertical: 'top', horizontal: 'left' }}
		>
			<Menus>{children}</Menus>
		</Popover>
	);
};
