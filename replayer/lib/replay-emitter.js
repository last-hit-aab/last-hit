const EventEmitter = require('events');

class AnEmitter extends EventEmitter {}

class ReplayEmitter {
	constructor() {
		this.emitter = new AnEmitter();
	}
	send(event, arg) {
		this.emitter.emit(event, arg);
	}
	on(event, callback) {
		this.emitter.on(event, arg => {
			callback(
				{
					reply: (event, arg) => {
						this.send(event, arg);
					}
				},
				arg
			);
		});
	}
	once(event, callback) {
		this.emitter.once(event, arg => {
			callback(
				{
					reply: (event, arg) => {
						this.send(event, arg);
					}
				},
				arg
			);
		});
	}
}

module.exports = ReplayEmitter;
