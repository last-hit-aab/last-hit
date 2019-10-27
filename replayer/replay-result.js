class ReplaySummary {
	constructor(options) {
		const { storyName, flow } = options;
		this.storyName = storyName;
		this.flowName = flow.name;
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
			screen_compare_result: []
		};
	}




	getSummary() {
		return this.summary;
	}

	async compareScreenshot(uuid) {
		this.summary.screen_compare_result.push(uuid)
	}

	async handleError(step, error) {
		if (step.type == 'ajax') {
			this.summary.numberOfAjax += 1;
		} else {
			this.summary.numberOfFailed += 1;
		}
		return Promise.resolve(true);
	}

	async handle(step) {
		if (step.type == 'ajax') {
			this.summary.numberOfAjax += 1;
			this.summary.numberOfSuccess += 1;
		} else {
			this.summary.numberOfUIBehavior += 1;
			this.summary.numberOfSuccess += 1;
		}
		return Promise.resolve(true);
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
