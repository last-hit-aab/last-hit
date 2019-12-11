"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = function () {
    console.log('test-one-extension actived.');
};
exports.handle = function (data) {
    console.log(data);
};
exports.getType = function () {
    return 'workspace';
};

//# sourceMappingURL=index.js.map
