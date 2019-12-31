import { Classes, Overlay } from '@blueprintjs/core';
import { remote } from 'electron';
import { Flow, Story } from 'last-hit-types';
import React from 'react';
import UIContext from '../../common/context';
import { EventTypes } from '../../events';
import { reloadFlow } from '../../files';

const TheDialog = (props: {
	story: Story;
	flow: Flow;
	close: (data?: { story: Story; flow: Flow }) => void;
}): JSX.Element => {
	const { story, flow, close } = props;

	React.useEffect(() => {
		setTimeout(reload, 3000);
	}, [flow]);

	const reload = async () => {
		try {
			await reloadFlow(story, flow);
			close({ story, flow });
		} catch (e) {
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Failed to reload flow',
				message: e.message
			});
			close();
		}
	};
	return (
		<Overlay
			isOpen={true}
			canEscapeKeyClose={false}
			canOutsideClickClose={false}
			// onClose={() => close}
			className={`${Classes.OVERLAY_CONTAINER} small`}
			autoFocus={true}>
			<div className={`${Classes.CARD} ${Classes.ELEVATION_2}`}>
				<h3 className="bp3-heading">Flow reloading...</h3>
				<span>
					Reloading content of {flow.name}@{story.name}...
				</span>
			</div>
		</Overlay>
	);
};

export default (): JSX.Element => {
	const { emitter } = React.useContext(UIContext);

	const [data, setData] = React.useState(null as null | { story: Story; flow: Flow });
	const openMe = (story: Story, flow: Flow): void => setData({ story, flow });
	const closeMe = (data?: { story: Story; flow: Flow }): void => {
		setData(null);
		if (data) {
			emitter.emit(EventTypes.CLOSE_FLOW_RELOAD_DIALOG, data.story, data.flow);
		}
	};
	React.useEffect(() => {
		emitter.on(EventTypes.ASK_FLOW_RELOAD, openMe);

		return () => {
			emitter.off(EventTypes.ASK_FLOW_RELOAD, openMe);
		};
	});

	if (data != null) {
		return <TheDialog {...data} close={closeMe} />;
	} else {
		return <React.Fragment />;
	}
};
