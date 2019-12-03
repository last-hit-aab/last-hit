import { Button, Classes, Overlay } from '@blueprintjs/core';
import { Flow, Step, Story } from 'last-hit-types';
import path from 'path';
import React from 'react';
import styled from 'styled-components';
import UIContext from '../../common/context';
import IDESettings from '../../common/ide-settings';
import { EventTypes } from '../../events';

const { gap } = IDESettings.getStyles();

const ImageContainer = styled.div`
	flex-grow: 1;
	text-align: center;
	margin-bottom: ${() => `${gap}px`};
	overflow: auto;
	height: 100%;
`;
const Image = styled.img`
	width: 100%;
`;

const TheDialog = (props: { story: Story; flow: Flow; step: Step }): JSX.Element => {
	const { story, flow, step } = props;
	const { emitter } = React.useContext(UIContext);
	const close = () => {
		emitter.emit(EventTypes.CLOSE_THUMBNAIL_DIALOG, story, flow, step);
	};

	let image = step.image;
	image = image ? (path.isAbsolute(image) ? image : `data:image/png;base64,${image}`) : image;

	return (
		<Overlay
			isOpen={true}
			onClose={close}
			className={`${Classes.OVERLAY_CONTAINER} thumbnail`}
			autoFocus={true}>
			<div className={`${Classes.CARD} ${Classes.ELEVATION_2}`}>
				<h3 className="bp3-heading">Thumbnail View</h3>
				<ImageContainer>
					<Image src={image} alt="" />
				</ImageContainer>
				<div className={Classes.DIALOG_FOOTER_ACTIONS}>
					<Button onClick={close}>Close</Button>
				</div>
			</div>
		</Overlay>
	);
};

export default (): JSX.Element => {
	const { emitter } = React.useContext(UIContext);

	const [data, setData] = React.useState(null as { story: Story; flow: Flow; step: Step } | null);
	React.useEffect(() => {
		const openMe = (story: Story, flow: Flow, step: Step): void =>
			setData({ story, flow, step });
		const closeMe = (): void => setData(null);

		emitter
			.on(EventTypes.ASK_SHOW_THUMBNAIL, openMe)
			.on(EventTypes.CLOSE_THUMBNAIL_DIALOG, closeMe);

		return () => {
			emitter
				.off(EventTypes.ASK_SHOW_THUMBNAIL, openMe)
				.off(EventTypes.CLOSE_THUMBNAIL_DIALOG, closeMe);
		};
	});

	if (data != null) {
		return <TheDialog {...data} />;
	} else {
		return <React.Fragment />;
	}
};
