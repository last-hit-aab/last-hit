import { Step, EnvironmentOptions, IncludingFilters, IncludingFilter } from '../types';
import os from 'os';

type Wrapper = (step: Step) => Step;

class Environment {
	private constructed: boolean;
	/** environment name */
	private name: string;
	/** workspace folder */
	private workspace: string;
	private urlReplaceRegexps: RegExp[];
	private urlReplaceTos: string[];
	private sleepAfterChange?: number;
	private slowAjaxTime?: number;
	private includes?: IncludingFilters;
	private parallel?: number;
	private child?: boolean;

	private wrappers: Wrapper[];

	private originalOptions: EnvironmentOptions;

	constructor(options: EnvironmentOptions) {
		this.constructed = false;
		if (!options) {
			return;
		}

		this.constructed = true;
		this.originalOptions = options;

		this.name = options.name;
		this.workspace = options.workspace;

		if (options.urlReplaceRegexp) {
			this.urlReplaceRegexps = options.urlReplaceRegexp
				.split('&&')
				.map(text => new RegExp(text));
			this.urlReplaceTos = (options.urlReplaceTo || '').split('&&');
			this.urlReplaceTos.length = this.urlReplaceRegexps.length;
			this.urlReplaceTos = this.urlReplaceTos.map(to => (to ? to : ''));
		}

		this.sleepAfterChange = options.sleepAfterChange;
		this.slowAjaxTime = options.slowAjaxTime;

		this.includes = options.includes;

		this.parallel = this.computeParallel(options.parallel);
		this.child = options.child || false;

		this.wrappers = [this.wrapUrl];
	}
	wrap(step: Step): Step {
		if (!this.isConstructed()) {
			return step;
		}
		return this.getWrappers().reduce((step, wrapper) => wrapper.call(this, step), step);
	}
	private wrapUrl(step: Step): Step {
		const regexps = this.getUrlReplaceRegexps();
		if (step.url && regexps) {
			step.url = regexps.reduce((url, regexp, index) => {
				return url.replace(regexp, this.getUrlReplaceTos()[index] || '');
			}, step.url);
		}
		return step;
	}
	private getWrappers(): Wrapper[] {
		return this.wrappers;
	}
	isConstructed(): boolean {
		return this.constructed;
	}
	getWorkspace(): string {
		return this.workspace;
	}
	getUrlReplaceRegexps(): RegExp[] {
		return this.urlReplaceRegexps;
	}
	getUrlReplaceTos(): string[] {
		return this.urlReplaceTos;
	}
	getSleepAfterChange(): number | undefined {
		return this.sleepAfterChange;
	}
	getSlowAjaxTime(): number {
		return this.slowAjaxTime || 500;
	}
	isIncluded(storyName: string, flowName: string): boolean {
		return (
			// no filters, including all
			!this.includes ||
			this.includes.some((filter: IncludingFilter): boolean => {
				// story name must match
				// no flow name appointed or flow name matched
				return filter.story === storyName && (!filter.flow || filter.flow === flowName);
			})
		);
	}
	isExcluded(storyName: string, flowName: string): boolean {
		// TODO not supported yet, always returns false
		return false;
	}
	getParallel(): number {
		return this.parallel;
	}
	isOnParallel(): boolean {
		return this.getParallel() !== 1;
	}
	private computeParallel(parallel: number = 1): number {
		parallel = Math.abs(parallel);
		if (parseInt(`${parallel}`) !== parallel) {
			return Math.round(os.cpus().length * parallel);
		} else {
			return parallel;
		}
	}
	isOnChildProcess(): boolean {
		return this.child;
	}
	exposeForSingleProcess(replacement: { includes: IncludingFilters }): EnvironmentOptions {
		const options = Object.assign({}, this.originalOptions);
		delete options.parallel;
		delete options.workspace;

		options.child = true;
		Object.keys(replacement).forEach(key => (options[key] = replacement[key]));

		return options;
	}
	static exposeNoop(): EnvironmentOptions {
		return {
			name: 'NO-ENVIRONMENT'
		} as EnvironmentOptions;
	}
}

export default Environment;
