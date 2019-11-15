import { Browser } from 'puppeteer';

export type BrowsersCache = { [key in string]: Browser };
export type CDPNodePseudoType =
	| 'first-line'
	| 'first-letter'
	| 'before'
	| 'after'
	| 'backdrop'
	| 'selection'
	| 'first-line-inherited'
	| 'scrollbar'
	| 'scrollbar-thumb'
	| 'scrollbar-button'
	| 'scrollbar-track'
	| 'scrollbar-track-piece'
	| 'scrollbar-corner'
	| 'resizer'
	| 'input-list-button';
export type CDPNode = {
	nodeId: number;
	parentId?: number;
	backendNodeId: number;
	nodeType: number;
	nodeName: string;
	localName: string;
	attributes?: string[];
	pseudoType?: CDPNodePseudoType;
	children?: CDPNode[];
	pseudoElements?: CDPNode[];
};
