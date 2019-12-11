const gulp = require('gulp');
const fs = require('fs');

const clean = cb => {
	if (fs.existsSync('runtime') && fs.statSync('runtime').isDirectory()) {
		fs.rmdirSync('runtime', { recursive: true });
	}
	cb();
};

exports.clean = clean;
