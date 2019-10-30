const resemble = require('node-resemble-js');

const compareScreen = async (record, replay) => {
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

	var record_screenshot = Buffer.from(record, 'base64');
	var replay_screenshot = Buffer.from(replay, 'base64');

	var diff = resemble(record_screenshot).compareTo(replay_screenshot);

	return diff;
};

module.exports = compareScreen;
