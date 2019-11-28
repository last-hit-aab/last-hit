import { PNG } from 'pngjs';
import ssim from 'image-ssim';
import fs from 'fs';

const loadImage = (file1: string, file2: string, done: (images: ssim.IImage[]) => void) => {
	const images: Array<ssim.IImage> = [];
	const onLoad = (img: ssim.IImage): void => {
		images.push(img);
		if (images.length === 2) {
			done(images);
		}
	};
	const load = (filePath: string, done: (image: ssim.IImage) => void) => {
		fs.createReadStream(filePath)
			.pipe(new PNG())
			.on('parsed', function(this: any) {
				done({
					data: this.data,
					width: this.width,
					height: this.height,
					channels: 4
				});
			});
	};

	load(file1, onLoad);
	load(file2, onLoad);
};

const isSameSize = (baseline: ssim.IImage, replay: ssim.IImage): boolean =>
	baseline.width == replay.width && baseline.height == replay.height;

export default (baselineFilename: string, replayFilename: string): Promise<ssim.IResult> => {
	return new Promise(resolve => {
		loadImage(baselineFilename, replayFilename, (images: ssim.IImage[]): void => {
			const baseline = images[0];
			const replay = images[1];
			if (isSameSize(baseline, replay)) {
				const res = ssim.compare(baseline, replay);
				resolve(res);
			} else {
				resolve({ ssim: 0.1, mcs: 0.1 });
			}
		});
	});
};
