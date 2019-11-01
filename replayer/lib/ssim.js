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

const isSameSize = (baseline, replay) => {
	if (baseline.width == replay.width && baseline.height == replay.height) {
		return true;

	} else {
		return false;
	}

}

const similer = (baseline_path, replay_path) => {
	return new Promise(resolve => {
		loadImage(baseline_path, replay_path, images => {
			const baseline = images[0]
			const replay = images[1]
			if (isSameSize(baseline, replay)) {
				const res = ssim.compare(images[0], images[1])
				resolve(res);
			} else {
				resolve({ ssim: 0.1, mcs: 0.1 })
			}
		});
	});
};



module.exports = similer;
