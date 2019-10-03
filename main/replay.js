const { ipcMain } = require('electron');
const { logger } = require('./logger');
const replayer = require('../replayer/replay');

const funcs = replayer({ emitter: ipcMain, logger });
module.exports = funcs;
