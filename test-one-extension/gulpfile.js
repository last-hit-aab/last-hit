const gulp = require('gulp');
const ts = require('gulp-typescript');
const fs = require('fs');
const sourcemaps = require('gulp-sourcemaps');

const clean = cb => {
	if (fs.existsSync('dist') && fs.statSync('dist').isDirectory()) {
		fs.rmdirSync('dist', { recursive: true });
	}
	cb();
};
const compileTs = cb => {
	const tsProject = ts.createProject('tsconfig.json');
	tsProject
		.src()
		.pipe(sourcemaps.init())
		.pipe(tsProject())
		.js.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest('dist'));
	cb();
};

exports.default = gulp.series(clean, compileTs);
