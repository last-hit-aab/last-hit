const path = require('path');
const fs = require('fs');

const construct = () => {
    const logFolder = path.join(__dirname, '../log/path');
    const logFile = 'console.log'
    const logFilePath = path.join(logFolder, logFile);
    if (!fs.existsSync(logFolder)) {
        fs.mkdirSync(logFolder, { recursive: true });
    }
    fs.appendFileSync(logFilePath, '\n');
    const logger = require('pino')({ prettyPrint: true }, logFilePath);
    logger.level='debug';
    return logger;
};

global.logger = construct();

module.exports = { logger };
