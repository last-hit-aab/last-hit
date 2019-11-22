import { remote } from 'electron';
import React from 'react';
import UIContext, { IUIEventEmitter } from '../../common/context';
import { EventTypes } from '../../events';
import { deleteStory } from '../../files';
import { Story } from '../../types';
import { isFlowsAllOnIdle } from '../flow/utils';

const createRemover = (emitter: IUIEventEmitter) => async (story: Story): Promise<void> => {
	try {
		const canRemove = await isFlowsAllOnIdle(
			emitter,
			(story.flows || []).map(flow => ({ story, flow }))
		);
		if (!canRemove) {
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Flows on operating.',
				message: `Cannot delete story "${story.name}" when some of flows under current story are on operating, need to cancel operating manually first.`
			});
		} else {
			remote.dialog
				.showMessageBox(remote.getCurrentWindow(), {
					type: 'question',
					title: 'Story delete',
					message: `Are you sure to delete story "${story.name}"?`,
					detail: 'All contents will be deleted.',
					buttons: ['OK', 'Cancel']
				})
				.then(({ response }) => {
					if (response === 0) {
						try {
							deleteStory(story);
							emitter.emit(EventTypes.STORY_DELETED, story);
						} catch (e) {
							console.error(e);
							remote.dialog.showMessageBox(remote.getCurrentWindow(), {
								type: 'error',
								title: 'Invalid Input',
								message: `Failed to delete story "${story.name}".`,
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
		emitter.on(EventTypes.ASK_DELETE_STORY, remover);

		return () => {
			emitter.off(EventTypes.ASK_DELETE_STORY, remover);
		};
	});

	return <React.Fragment />;
};
