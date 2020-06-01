declare module NodeJS {
	interface Global {
		logger: any;
	}
}

interface Window {
	$lhGetUuid: () => Promise<string>;
	$lhGod?: boolean;
	$lhOnSwitchFromReplayToRecord?: boolean;
	$lhUuid: string;
	$lhRecordEvent: (event: string) => void;
	$lhDataAttrName?: string;
	WeixinJSBridge: {
		invoke: (
			event:
				| 'sendAppMessage'
				| 'shareTimeline'
				| 'preVerifyJSAPI'
				| 'chooseImage'
				| 'getLocalImgData',
			data: any,
			func: (arg: any) => void
		) => void;
		on: (event, func: (arg: any) => void) => void;
	};
}

declare module 'watchr' {
	export enum WatchrEvent {
		CHANGE = 'change',
		CLOSE = 'close'
	}
	export enum WatchrChangeType {
		CREATE = 'create',
		UPDATE = 'update',
		DELETE = 'delete'
	}

	export type WatchrChangeEventListener = (
		changeType: WatchrChangeType,
		fullPath: string,
		currentStat: any,
		previousStat: any
	) => void;
	export type WatchrCloseEventListener = (reason: string) => void;

	export enum WatchrConfigPreferredMethod {
		WATCH = 'watch',
		WATCH_FILE = 'watchFile'
	}
	export type WatchrConfig = {
		stat?: any;
		interval?: number;
		persistent?: boolean;
		catchupDelay?: number;
		preferredMethods?: WatchrConfigPreferredMethod[];
		followLinks?: boolean;
		ignorePaths?: boolean;
		ignoreHiddenFiles?: boolean;
		ignoreCommonPatterns?: boolean;
		ignoreCustomPatterns?: RegExp;
	};
	export type WatchrStartCallback = (err: Error) => void;
	export interface WatchrStalker {
		setConfig: (config: WatchrConfig) => this;

		on: (event: WatchrEvent.CHANGE, listener: WatchrChangeEventListener) => void;
		once: (event: WatchrEvent.CLOSE, listener: WatchrCloseEventListener) => void;
		removeAllListeners: () => void;

		watch: (next: WatchrStartCallback) => this;
	}

	export function create(root: string): WatchrStalker;
}
