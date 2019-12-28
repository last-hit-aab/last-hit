import { CoverageEntry } from 'puppeteer';
import { FlowParameters } from 'last-hit-types';

export type IncludingFilter = { story: string; flow?: string };
export type IncludingFilters = IncludingFilter[];
export type Config = {
	[key in string]: any;
} & {
	/** environment name */
	env: string;
	/** workspace folder */
	workspace: string;
	/** including */
	includes?: IncludingFilters;
	/** is in child process */
	child?: boolean;
};
export type WorkspaceConfig = {
	envs: { [key in string]: any };
};
export type EnvironmentOptions = {
	name: string;
	workspace: string;
	urlReplaceRegexp?: string;
	urlReplaceTo?: string;
	sleepAfterChange?: number;
	slowAjaxTime?: number;
	includes?: IncludingFilters;
	parallel?: number;
	child?: boolean;
};
export type FlowFile = { story: string; flow: string };

export type SlowAjax = {};
export type Summary = {
	numberOfFailed: number;
	storyName: string;
	flowName: string;
	numberOfStep: number;
	numberOfUIBehavior: number;
	numberOfSuccess: number;
	numberOfAjax: number;
	numberOfAssert: number;
	slowAjaxRequest?: Array<SlowAjax>;
	ignoreErrorList?: [];
	errorStack: String;
	screenCompareList?: Array<{
		stepIndex: number;
		stepUuid: string;
		target: string;
		path: string;
		csspath: string;
		custompath?: string;
		human: string;
		type: string;
	}>;
	testLogs?: Array<{ title: string; passed: boolean; level?: number }>;
	flowParams: FlowParameters;
};

export type Report = Summary & {
	/** format: "abc: 8748.3349609375ms" */
	spent: string;
};
export type CoverageEntryRange = { start: number; end: number };
export type Coverages = CoverageEntry[];
export type FlowResult = {
	report: Report;
	coverages: Coverages;
	code: 'success' | 'pending';
};
