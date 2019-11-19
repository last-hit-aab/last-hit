import { createGlobalStyle } from 'styled-components';
import { Colors } from '@blueprintjs/core';

export default {
	padding: {
		vertical: 4,
		horizontal: 16,
		body: 16
	},
	gap: 10
};

export const GlobalStyles = createGlobalStyle`
	*,
	*:after,
	*:before {
		box-sizing: border-box;
	}

	/* *::hover::-webkit-scrollbar-thumb {
		opacity: 1
	} */
	*::-webkit-scrollbar {
		background-color: transparent;
		width: 8px;
	}
	*::-webkit-scrollbar-thumb {
		background-color: ${() => Colors.DARK_GRAY5};
	}

	/** card */
	.bp3-card.rectangle {
		border-radius: 0;
	}

	/** button */
	.bp3-button.round {
		border-radius: 50%;
	}

	/** label */
	label.bp3-label.margin-bottom-0 {
		margin-bottom: 0;
	}
`;
