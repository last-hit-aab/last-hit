import { ipcRenderer } from 'electron';
import { Story, Flow } from '../workspace-settings';

export const generateKeyByObject = (story: Story, flow: Flow): string => {
	return `[${flow.name}@${story.name}]`;
};
export const generateKeyByString = (storyName: string, flowName: string): string => {
	return `[${flowName}@${storyName}]`;
};
/**
 * reject when not on recording, resolve when on recording
 */
export const isFlowOnRecording = (story: Story, flow: Flow): Promise<boolean> => {
	return new Promise(resolve => {
		const key = generateKeyByObject(story, flow);
		ipcRenderer.once(`flow-open-check-result-${key}`, (event, arg) => {
			if (arg === false) {
				// flow not open, of course not on recording
				resolve(false);
			} else {
				ipcRenderer.once(`flow-on-record-check-result-${key}`, (event, arg1) => {
					if (arg1 === false) {
						// appointed flow is not on recording
						console.log(`flow-open-check-result-${key} resolved since not record`);
						resolve(false);
					} else {
						// appointed flow is on recording
						resolve(true);
					}
				});
				ipcRenderer.send('flow-on-record-check', { storyName: story.name, flowName: flow.name });
			}
		});
		ipcRenderer.send('flow-open-check', { storyName: story.name, flowName: flow.name });
	});
};
export const isFlowsOnRecording = (
	flows: { story: Story; flow: Flow }[]
): Promise<{
	canRemove: { story: Story; flow: Flow; onRecord: boolean }[];
	onRecord: { story: Story; flow: Flow; onRecord: boolean }[];
}> => {
	return new Promise(resolve => {
		Promise.all(
			flows.map(item => {
				return new Promise(resolveMe => {
					isFlowOnRecording(item.story, item.flow).then(onRecord => resolveMe({ onRecord, ...item }));
				});
			})
		)
			.then(results => {
				const items = results as { story: Story; flow: Flow; onRecord: boolean }[];
				resolve({
					canRemove: items.filter(item => item.onRecord === false),
					onRecord: items.filter(item => item.onRecord === true)
				});
			})
			.catch(e => {
				// never occurred
				console.error(e);
			});
	});
};
