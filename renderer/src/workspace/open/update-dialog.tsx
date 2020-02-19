import { Button, Classes, InputGroup, Overlay } from '@blueprintjs/core';
import { clipboard, remote } from 'electron';
import React from 'react';
import UIContext from '../../common/context';
import { EventTypes } from '../../events';

const TheDialog = (props: { current: string; latest: string }): JSX.Element => {
	const { current, latest } = props;
	const { emitter } = React.useContext(UIContext);
	const close = () => {
		emitter.emit(EventTypes.CLOSE_UPDATE_DIALOG);
	};
	const copy = () => {
		clipboard.writeText(latest || current);
		remote.dialog.showMessageBox(remote.getCurrentWindow(), {
			type: 'info',
			title: 'URL copied',
			message: 'Open browser, paste url and download latest version.'
		});
	};

	let msg = 'cannot detect';
	if (latest) {
		msg = latest === current ? 'is latest' : 'not latest';
	}

	return (
		<Overlay
			isOpen={true}
			className={`${Classes.OVERLAY_CONTAINER} small`}
			canEscapeKeyClose={false}
			canOutsideClickClose={false}
			autoFocus={true}>
			<div className={`${Classes.CARD} ${Classes.ELEVATION_2}`}>
				<h3 className="bp3-heading">Version Update</h3>
				<h5 className="bp3-heading">
					Currently {remote.app.getVersion()}, {msg}.
				</h5>
				<InputGroup
					value={latest || current}
					fill={true}
					readOnly={true}
					rightElement={
						<Button
							icon="clipboard"
							minimal={true}
							title={'Copy URL'}
							intent="primary"
							onClick={copy}
						/>
					}
				/>
				<div className="overlay-placeholder" />
				<div className={Classes.DIALOG_FOOTER_ACTIONS}>
					<Button onClick={close}>Close</Button>
				</div>
			</div>
		</Overlay>
	);
};

export default (): JSX.Element => {
	const { emitter } = React.useContext(UIContext);

	const [url, setUrl] = React.useState(null as null | { current: string; latest: string });
	React.useEffect(() => {
		const openMe = (current: string, latest: string): void => setUrl({ current, latest });
		const closeMe = (): void => setUrl(null);

		emitter.on(EventTypes.ASK_OPEN_UPDATE, openMe).on(EventTypes.CLOSE_UPDATE_DIALOG, closeMe);

		return () => {
			emitter
				.off(EventTypes.ASK_OPEN_UPDATE, openMe)
				.off(EventTypes.CLOSE_UPDATE_DIALOG, closeMe);
		};
	});

	if (url) {
		return <TheDialog current={url.current} latest={url.latest} />;
	} else {
		return <React.Fragment />;
	}
};
