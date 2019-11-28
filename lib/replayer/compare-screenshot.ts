import resemble from 'node-resemble-js';

const errorSettings = {
	errorColor: {
		red: 255,
		green: 0,
		blue: 255
	},
	errorType: 'flat',
	transparency: 0.3
};
resemble.outputSettings(errorSettings);

export default (baselineImageOnBase64: string, replayImageOnBase64: string): any => {
	return resemble(Buffer.from(baselineImageOnBase64, 'base64')).compareTo(
		Buffer.from(replayImageOnBase64, 'base64')
	);
};
