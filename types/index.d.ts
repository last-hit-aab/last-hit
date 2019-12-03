declare module 'last-hit-types' {
	export type Device = {
		name: string;
		userAgent: string;
		wechat?: boolean;
		viewport: {
			width: number;
			height: number;
			deviceScaleFactor: number;
			isMobile: boolean;
			hasTouch: boolean;
			isLandscape: boolean;
		};
	};
}
