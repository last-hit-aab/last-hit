import Environment from '../config/env';
import ReplayEmitter from './replay-emitter';
import createAbandoner from './replayer-abandoner';
import createDestoryer from './replayer-destoryor';
import createLauncher from './replayer-launcher';
import replayers from './replayers-cache';

export const createReplayer = (options: {
	emitter: ReplayEmitter;
	logger: Console;
	env?: Environment;
}) => {
	const emitter = options.emitter;
	const logger = options.logger;
	const env =
		options.env ||
		(() => {
			const options = Environment.exposeNoop();
			return new Environment(options);
		})();

	return {
		initialize: createLauncher(emitter, replayers, logger, env),
		destory: createDestoryer(replayers, logger),
		abandon: createAbandoner(replayers)
	};
};
