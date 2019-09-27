import { makeStyles } from '@material-ui/core/styles';
import { getTheme } from '../../global-settings';

const myTheme = getTheme();

export default makeStyles(theme => ({
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
