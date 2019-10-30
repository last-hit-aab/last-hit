const PNG = require('pngjs').PNG;
const ssim = require('image-ssim');
const fs = require('fs');

const loadImage = (file1, file2, done) => {
	var images = [];
	const loaded = img => {
		// console.log(img)
		images.push(img);
		if (images.length === 2) {
			done(images);
		}

	};

	const load = (filePath, done) => {
		fs.createReadStream(filePath)
			.pipe(new PNG())
			.on('parsed', function () {
				// console.log(this.width)
				done({
					data: this.data,
					width: this.width,
					height: this.height,
					channels: 4
				});
			});
	};

	load(file1, loaded);
	load(file2, loaded);
};

const similer = (baseline_path, replay_path) => {
	return new Promise(resolve => {
		loadImage(baseline_path, replay_path, images => {
			const res = ssim.compare(images[0], images[1])
			resolve(res);
		});
	});
};

// fs.createReadStream("/Users/yifeng/Documents/github_last-hit/last-hit/replayer/lib/error-1a9b03ac-f270-4b94-8d0d-10df939ff667-173.png")
// 	.pipe(new PNG())
// 	.on('parsed', function () {
// 		console.log(this.data)
// 		// done({
// 		// 	data: this.data,
// 		// 	width: this.width,
// 		// 	height: this.height,
// 		// 	channels: 4
// 		// });
// 	});


//similer("/Users/yifeng/Documents/github_last-hit/last-hit/replayer/lib/screen-record/insureMO/pa/33a31d5f-7ce6-45b0-a891-e3a611d3b6e7_baseline.png", "/Users/yifeng/Documents/github_last-hit/last-hit/replayer/lib/screen-record/insureMO/pa/33a31d5f-7ce6-45b0-a891-e3a611d3b6e7_baseline.png")


module.exports = similer;
