import { CoverageEntry } from "puppeteer";

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
export type Step = {
  url?: string;
  type:
    | "start"
    | "end"
    | "ajax"
    | "change"
    | "click"
    | "mousedown"
    | "keydown"
    | "focus"
    | "animation"
    | "scroll"
    | "dialog-open"
    | "dialog-close"
    | "page-created"
    | "page-switched"
    | "page-closed"
    | "unload";
  stepIndex?: number;
  stepUuid: string;
  /** only in page-created, manually */
  forStepUuid: string;
  /** page uuid */
  uuid: string;
  target: string;
  path: string;
  csspath: string;
  custompath?: string;
  human: string;
  sleep?: number;
  image?: string;
  dialog?: string;
  /** only in dialog step */
  returnValue?: string;
  value?: string;
  file?: string;
  checked?: boolean;
  duration?: number;
  scrollTop?: number;
  scrollLeft?: number;
  device?: Device;
  origin?: {
    story: string;
    flow: string;
    stepIndex: number;
  };
};
export type FlowFile = { story: string; flow: string };
export type Story = { name: string };
export type Flow = {
  name: string;
  settings?: { forceDepends?: { story: string; flow: string } };
  steps?: Step[];
};

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
};

export type Report = Summary & {
  /** format: "abc: 8748.3349609375ms" */
  spent: string;
};
export type CoverageEntryRange = { start: number; end: number };
export type Coverages = CoverageEntry[];
export type FlowResult = { report: Report; coverages: Coverages };
