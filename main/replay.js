const { ipcMain } = require('electron');
const { logger } = require('./logger');
const replayer = require('../replayer/lib/replay');

const funcs = replayer({ emitter: ipcMain, logger });
module.exports = funcs;
