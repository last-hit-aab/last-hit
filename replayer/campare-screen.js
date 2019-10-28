const resemble = require('node-resemble-js');

// import Jimp from 'jimp';

const compareScreen = async (record, replay) => {


	const errorSettings = {
		errorColor: {
			red: 255,
			green: 0,
			blue: 255
		},
		errorType: 'flat',
		transparency: 0.3
	}

	resemble.outputSettings(errorSettings);


	var record_screenshot = Buffer.from(record, 'base64');
	var replay_screenshot = Buffer.from(replay, 'base64');
	var diff = resemble(record_screenshot).compareTo(replay_screenshot)

	return diff
};

module.exports = compareScreen;



// const fs = require('fs');
// const PNG = require('pngjs').PNG;
// const pixelmatch = require('pixelmatch');




// const compareScreen = async (record_path, replay_path) => {

// 	const img1 = PNG.sync.read(fs.readFileSync(record_path));
// 	const img2 = PNG.sync.read(fs.readFileSync(replay_path));
// 	const { width, height } = img1;
// 	const diff = new PNG({ width, height });

// 	pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold: 0.3 });

// 	console.log(diff)

// 	fs.writeFileSync("diff-test.png", PNG.sync.write(diff));
// 	return diff
// };

// module.exports = compareScreen;



// const diff = compareScreen("/Users/yifeng/Documents/github_last-hit/last-hit/replayer/screen_record/test-pa2/4357094f-8682-4e26-b800-d8f732570629_baseline.png", "/Users/yifeng/Documents/github_last-hit/last-hit/replayer/screen_record/test-pa2/4357094f-8682-4e26-b800-d8f732570629_replay.png")




