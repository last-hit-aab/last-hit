const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const pino = require('pino');

const construct = () => {
	app.setAppLogsPath();
	const logFolder = path.join(app.getPath('logs'));
	console.log(logFolder);
	const logFile = 'console.log';
	const logFilePath = path.join(logFolder, logFile);
	if (!fs.existsSync(logFolder)) {
		fs.mkdirSync(logFolder, { recursive: true });
	}
	fs.appendFileSync(logFilePath, '\n');
	const logger = pino({ prettyPrint: true }, logFilePath);
	logger.level = 'debug';
	logger.log = logger.debug;
	return logger;
};

global.logger = construct();

module.exports = { logger };
