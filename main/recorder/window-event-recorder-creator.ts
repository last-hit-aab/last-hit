import { BrowserWindow } from 'electron';
import uuidv4 from 'uuid/v4';

export type PageWindowEventRecorder = {
	record: (eventJsonStr: string) => void;
};

export const createPageWindowEventRecorder = (flowKey: string): PageWindowEventRecorder => {
	return {
		record: (eventJsonStr: string): void => {
			if (!eventJsonStr) {
				console.warn('Argument is null.');
				return;
			}
			try {
				const windows = BrowserWindow.getAllWindows();
				const jsonEvent = JSON.parse(eventJsonStr);
				jsonEvent.stepUuid = uuidv4();
				windows[0].webContents.send(`message-captured-${flowKey}`, jsonEvent);
			} catch (e) {
				console.error(e);
			}
		}
	};
};
