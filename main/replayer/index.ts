import { ipcMain } from 'electron';
import { logger } from '../logger';
import replayer from '../../replayer/lib/replay';

export default replayer({ emitter: ipcMain, logger });
