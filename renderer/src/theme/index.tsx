import { createMuiTheme } from '@material-ui/core/styles';
import { getTheme } from '../global-settings';

const globalSettings = getTheme();

// A custom theme for this app
const theme = createMuiTheme({
	palette: {
		type: globalSettings.paletteType
	}
});

export default theme;
