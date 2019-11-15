import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import pino from 'pino';

app.setAppLogsPath();
const logFolder = path.join(app.getPath('logs'));
console.log(logFolder);
const logFile = 'console.log';
const logFilePath = path.join(logFolder, logFile);
if (!fs.existsSync(logFolder)) {
	fs.mkdirSync(logFolder, { recursive: true });
}
fs.appendFileSync(logFilePath, '\n');

export const logger = pino({ prettyPrint: true }, logFilePath as any);
logger.level = 'debug';
logger.log = logger.debug;

global.logger = logger;
