var PNG = require('pngjs').PNG;
const ssim = require('image-ssim');
const fs = require('fs');

const loadImage = function (file1, file2, done) {
    var images = [];
    function loaded(img) {
        images.push(img);

        if (images.length === 2) {
            done(images)
        }
    }

    function load(filePath, done) {
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
    }

    load(file1, loaded);
    load(file2, loaded);
};


const similer = (baseline_path, replay_path) => {
    return new Promise(resolve => {
        loadImage(baseline_path, replay_path, function (images) {
            resolve(ssim.compare(images[0], images[1]));
        });
    });
}

module.exports = similer

// similer("/Users/yifeng/Documents/github_last-hit/last-hit/replayer/screen_record/test-pa2/9179b84d-e8b4-440f-9545-3881e0cd5359_baseline.png", "/Users/yifeng/Documents/github_last-hit/last-hit/replayer/screen_record/test-pa2/ab35a8b0-ab9a-4ae9-9e1d-daa0b6f99a2f_baseline.png").then((data) => {
//     console.log(data)
// })
// , function (images) {
//     var diff_ssim = ssim.compare(images[0], images[1]);
//     console.log(diff_ssim)
// });
