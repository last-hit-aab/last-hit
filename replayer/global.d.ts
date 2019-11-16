declare module NodeJS {
	interface ProcessVersions {
		readonly electron: string;
	}
}

interface Window {
	$lhGetUuid: () => Promise<string>;
	$lhGod?: boolean;
	$lhUuid: string;
	$lhRecordEvent: (event: string) => void;
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
