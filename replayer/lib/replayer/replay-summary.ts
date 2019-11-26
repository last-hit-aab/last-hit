import Environment from '../config/env';
import { Flow, Step, Summary } from '../types';

class ReplaySummary {
	private storyName: string;
	private flowName: string;
	private env: Environment;
	private summary: Summary;

	constructor(options: { storyName: string; flow: Flow; env: Environment }) {
		const { storyName, flow, env } = options;
		this.storyName = storyName;
		this.flowName = flow.name;
		this.env = env;
		this.summary = {
			storyName,
			flowName: flow.name,
			numberOfStep: (flow.steps || []).length,
			numberOfUIBehavior: 0,
			numberOfSuccess: 0,
			numberOfFailed: 0,
			numberOfAssert: 0,
			ignoreErrorList: [],
			numberOfAjax: 0,
			slowAjaxRequest: [],
			screenCompareList: []
		};
	}
	getEnvironment() {
		return this.env;
	}
	getSummary() {
		return this.summary;
	}
	compareScreenshot(step: Step): void {
		this.summary.screenCompareList!.push({
			stepUuid: step.stepUuid,
			stepIndex: step.stepIndex!,
			target: step.target,
			path: step.path,
			csspath: step.csspath,
			custompath: step.custompath,
			human: step.human,
			type: step.type
		});
	}
	async handleError(step: Step, error: Error): Promise<boolean> {
		if (step.type == 'ajax') {
			// ignore
		} else {
			this.summary.numberOfFailed += 1;
		}
		return Promise.resolve(true);
	}
	async handle(step: Step): Promise<boolean> {
		if (step.type == 'ajax') {
			// ignore
			this.summary.numberOfSuccess += 1;
		} else {
			this.summary.numberOfUIBehavior += 1;
			this.summary.numberOfSuccess += 1;
		}
		return Promise.resolve(true);
	}
	async handleAjaxSuccess(url: string, usedTime: number): Promise<void> {
		this.summary.numberOfAjax++;
		if (usedTime >= this.getEnvironment().getSlowAjaxTime()) {
			this.summary.slowAjaxRequest!.push({ url, time: usedTime });
		}
	}
	async handleAjaxFail(url: string, usedTime: number): Promise<void> {
		this.summary.numberOfAjax++;
		if (usedTime >= this.getEnvironment().getSlowAjaxTime()) {
			this.summary.slowAjaxRequest!.push({ url, time: usedTime });
		}
	}
	print() {
		console.table(
			[this.summary],
			[
				'storyName',
				'flowName',
				'numberOfStep',
				'numberOfUIBehavior',
				'numberOfSuccess',
				'numberOfFailed',
				'ignoreErrorList',
				'numberOfAjax',
				'slowAjaxRequest'
			]
		);
	}
}

export default ReplaySummary;
