const resemble = require('node-resemble-js');

const compareScreen = async (record, replay) => {


	resemble.outputSettings({
		errorColor: {
			red: 255,
			green: 0,
			blue: 0
		},
		errorType: 'movement',
		transparency: 0.8,
		largeImageThreshold: 1200,
	});

	var record_screenshot = Buffer.from(record, 'base64');
	var replay_screenshot = Buffer.from(replay, 'base64');
	var diff = resemble(record_screenshot).compareTo(replay_screenshot)
	return diff
};

module.exports = compareScreen;




