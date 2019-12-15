import { remote } from 'electron';
import { Flow, Story } from 'last-hit-types';
import React from 'react';
import UIContext, { IUIEventEmitter } from '../../common/context';
import { EventTypes } from '../../events';
import { deleteFlow } from '../../files';
import { isFlowsAllOnIdle } from '../flow/utils';

const createRemover = (emitter: IUIEventEmitter) => async (
	story: Story,
	flow: Flow
): Promise<void> => {
	try {
		const canRemove = await isFlowsAllOnIdle(emitter, [{ story, flow }]);
		if (!canRemove) {
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Flows on operating.',
				message: `Cannot delete flow "${flow.name}@${story.name}" when it is on operating, need to cancel operating manually first.`
			});
		} else {
			remote.dialog
				.showMessageBox(remote.getCurrentWindow(), {
					type: 'question',
					title: 'Flow delete',
					message: `Are you sure to delete flow "${flow.name}@${story.name}"?`,
					detail: 'All contents will be deleted.',
					buttons: ['OK', 'Cancel']
				})
				.then(({ response }) => {
					if (response === 0) {
						try {
							deleteFlow(story, flow);
							emitter.emit(EventTypes.FLOW_DELETED, story, flow);
						} catch (e) {
							console.error(e);
							remote.dialog.showMessageBox(remote.getCurrentWindow(), {
								type: 'error',
								title: 'Invalid Input',
								message: `Failed to delete flow "${flow.name}@${story.name}".`,
								detail: typeof e === 'string' ? e : e.message
							});
						}
					}
				});
		}
	} catch {}
};

export default (): JSX.Element => {
	const { emitter } = React.useContext(UIContext);

	React.useEffect(() => {
		const remover = createRemover(emitter);
		emitter.on(EventTypes.ASK_DELETE_FLOW, remover);

		return () => {
			emitter.off(EventTypes.ASK_DELETE_FLOW, remover);
		};
	});

	return <React.Fragment />;
};
