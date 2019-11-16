import EventEmitter from 'events';

export type CallbackEvent = {
	reply: (event: string | symbol, arg: any) => void;
};
export type Callback = (event: CallbackEvent, arg: any) => void;

class AnEmitter extends EventEmitter {}

class ReplayEmitter {
	private emitter = new AnEmitter();
	send(event: string | symbol, arg: any): void {
		this.emitter.emit(event, arg);
	}
	on(event: string | symbol, callback: Callback): void {
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
	once(event: string | symbol, callback: Callback) {
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

export default ReplayEmitter;
