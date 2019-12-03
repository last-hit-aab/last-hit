"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var pngjs_1 = require("pngjs");
var image_ssim_1 = __importDefault(require("image-ssim"));
var fs_1 = __importDefault(require("fs"));
var loadImage = function (file1, file2, done) {
    var images = [];
    var onLoad = function (img) {
        images.push(img);
        if (images.length === 2) {
            done(images);
        }
    };
    var load = function (filePath, done) {
        fs_1.default.createReadStream(filePath)
            .pipe(new pngjs_1.PNG())
            .on('parsed', function () {
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
var isSameSize = function (baseline, replay) {
    return baseline.width == replay.width && baseline.height == replay.height;
};
exports.default = (function (baselineFilename, replayFilename) {
    return new Promise(function (resolve) {
        loadImage(baselineFilename, replayFilename, function (images) {
            var baseline = images[0];
            var replay = images[1];
            if (isSameSize(baseline, replay)) {
                var res = image_ssim_1.default.compare(baseline, replay);
                resolve(res);
            }
            else {
                resolve({ ssim: 0.1, mcs: 0.1 });
            }
        });
    });
});
//# sourceMappingURL=ssim.js.map