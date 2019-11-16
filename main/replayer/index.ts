import { ipcMain } from 'electron';
import { logger } from '../logger';
import { createReplayer } from '../../replayer/lib/replayer';

export default createReplayer({ emitter: ipcMain as any, logger: logger as any });
