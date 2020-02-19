import { Button, Colors } from '@blueprintjs/core';
import { remote } from 'electron';
import React from 'react';
import styled, { keyframes } from 'styled-components';
import UIContext from '../../common/context';
import { EventTypes } from '../../events';

const Container = styled.div`
	display: flex;
	flex-direction: column;
	border-right: 1px solid ${() => Colors.DARK_GRAY5};
`;
const Placeholder = styled.div`
	flex-grow: 1;
`;
const Segment = styled.div`
	opacity: 0.7;
	> svg {
		height: 24px;
		width: 24px;
	}
`;
const scale = keyframes`
	0% {
		transform: scale(1);
	}
	50% {
		transform: scale(1.3);
	}
	100% {
		transform: scale(1);
	}
`;
const UpdateButton = styled(Button)`
	&[data-has-update='true'] {
		animation: ${scale} linear 500ms infinite;
		> span {
			color: ${Colors.RED5} !important;
		}
	}
`;

export default () => {
	const { emitter } = React.useContext(UIContext);
	const [myMajor, myMinor, myPatch] = remote.app
		.getVersion()
		.replace('v', '')
		.split('.')
		.map((x: string) => (x ? (x as any) * 1 : 0));
	const [update, setUpdate] = React.useState({
		has: false,
		current: `https://github.com/last-hit-aab/last-hit/releases/tag/v${myMajor}.${myMinor}.${myPatch}`,
		latest: ''
	});
	const checkUpdate = async () => {
		// console.log('current version', myMajor, myMinor, myPatch);
		try {
			const response = await fetch(
				'https://api.github.com/repos/last-hit-aab/last-hit/releases/latest'
			);
			const data = await response.json();
			const url = data.html_url || '';
			const [major, minor, patch] = url
				.substr(url.lastIndexOf('/') + 1)
				.replace('v', '')
				.split('.')
				.map((x: string) => (x ? (x as any) * 1 : 0));
			// console.log('latest veresion', major, minor, patch);
			if (
				myMajor < major ||
				(myMajor === major && myMinor < minor) ||
				(myMajor === major && myMinor === minor && myPatch < patch)
			) {
				setUpdate({ has: true, current: update.current, latest: url });
			} else {
				setUpdate({ has: false, current: update.current, latest: url });
			}
		} catch (e) {
			console.error(e);
		}
	};
	React.useEffect(() => {
		checkUpdate();
		// eslint-disable-next-line
	}, [0]);
	const onToggleNagivatorClicked = (): void => {
		emitter.emit(EventTypes.ASK_TOGGLE_NAVIGATOR);
	};
	const onStepSearchClicked = (): void => {
		emitter.emit(EventTypes.ASK_STEP_SEARCH);
	};
	const onEnvClicked = (): void => {
		emitter.emit(EventTypes.ASK_OPEN_ENV);
	};
	const onUpdateClicked = (): void => {
		if (update.has) {
			setUpdate({ has: false, current: update.current, latest: update.latest });
		}
		// console.log(update.current, update.latest);
		emitter.emit(EventTypes.ASK_OPEN_UPDATE, update.current, update.latest);
	};

	return (
		<Container>
			<Segment title="Navigator">
				<Button
					minimal={true}
					icon="inbox"
					large={true}
					onClick={onToggleNagivatorClicked}
				/>
			</Segment>
			<Segment title="Step Search">
				<Button minimal={true} icon="search" large={true} onClick={onStepSearchClicked} />
			</Segment>
			<Segment title="Environments">
				<Button minimal={true} icon="heat-grid" large={true} onClick={onEnvClicked} />
			</Segment>
			<Segment title="Update">
				<UpdateButton
					minimal={true}
					icon="automatic-updates"
					large={true}
					onClick={onUpdateClicked}
					data-has-update={update.has}
				/>
			</Segment>
			<Placeholder />
		</Container>
	);
};
