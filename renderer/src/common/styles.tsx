import { createGlobalStyle } from 'styled-components';
import { Colors } from '@blueprintjs/core';

export default {
	padding: {
		vertical: 4,
		horizontal: 16,
		body: 16
	},
	margin: {
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
		height: 4px;
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

	/** overlay */
	div.bp3-overlay {
		> div.bp3-card {
			min-height: 200px;
			max-height: calc(100vh - 200px);
			top: 50%;
			transform: translateY(-50%);
			display: flex;
			flex-direction: column;
			> div.overlay-placeholder {
				flex-grow: 1;
			}
		}
		&.thumbnail {
			> div.bp3-card {
				min-height: 90vh;
				max-height: 90vh;
				top: 5vh;
				transform: none;
				width: 80vw;
				left: 10vw;
			}
		}
		&.medium {
			> div.bp3-card {
				width: 70vw;
				left: 15vw;
			}
		}
		&.small {
			> div.bp3-card {
				width: 600px;
				left: calc(50vw - 300px);
			}
		}
	}

	.bp3-select-popover .bp3-menu {
		max-width: 400px;
		max-height: 200px;
		overflow: auto;
		padding: 0;
	}
`;
