class ReplaySummary {
	/**
	 * @param {Object} options
	 * @param {string} options.storyName
	 * @param {Flow} options.flow
	 * @param {Environment} options.env
	 */
	constructor(options) {
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
	async compareScreenshot(step) {
		this.summary.screenCompareList.push(step);
	}
	async handleError(step, error) {
		if (step.type == 'ajax') {
			// ignore
		} else {
			this.summary.numberOfFailed += 1;
		}
		return Promise.resolve(true);
	}
	async handle(step) {
		if (step.type == 'ajax') {
			// ignore
			this.summary.numberOfSuccess += 1;
		} else {
			this.summary.numberOfUIBehavior += 1;
			this.summary.numberOfSuccess += 1;
		}
		return Promise.resolve(true);
	}
	async handleAjaxSuccess(url, usedTime) {
		this.summary.numberOfAjax++;
		if (usedTime >= this.getEnvironment().getSlowAjaxTime()) {
			this.summary.slowAjaxRequest.push({ url, time: usedTime });
		}
	}
	async handleAjaxFail(url, usedTime) {
		this.summary.numberOfAjax++;
		if (usedTime >= this.getEnvironment().getSlowAjaxTime()) {
			this.summary.slowAjaxRequest.push({ url, time: usedTime });
		}
	}
	async print() {
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

module.exports = ReplaySummary;
