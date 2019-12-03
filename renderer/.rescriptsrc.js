// const path = require('path');
const webpack = require('webpack');

const addProgress = config => {
	config.plugins.unshift(new webpack.ProgressPlugin());
	return config;
};

const changeTarget = config => {
	config.target = 'electron-renderer';
	return config;
};

module.exports = config =>
	[addProgress, changeTarget].reduce((config, func) => func(config), config);
