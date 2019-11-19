import { Flow, Story } from '../types';

export const isFlowFile = (filename: string): boolean => {
	return filename.endsWith('.flow.json');
};
export const asFlowName = (filename: string): string => {
	return filename.substr(0, filename.length - 10);
};
export const asFlowKey = (flow: Flow, story: Story): string => {
	return `${flow.name}@${story.name}`;
};
