const PNG = require('pngjs').PNG;
const ssim = require('image-ssim');
const fs = require('fs');

const loadImage = (file1, file2, done) => {
	var images = [];
	const loaded = img => {
		images.push(img);

		if (images.length === 2) {
			done(images);
		}
	};

	const load = (filePath, done) => {
		fs.createReadStream(filePath)
			.pipe(new PNG())
			.on('parsed', () => {
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
			resolve(ssim.compare(images[0], images[1]));
		});
	});
};

module.exports = similer;
