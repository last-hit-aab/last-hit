const Select2 = require('./select2');

const thirdParties = [new Select2()];

class ThirdStepSupport {
	constructor(options) {
		this.element = options.element;
		this.tagNameRetrieve = options.tagNameRetrieve;
		this.elementTypeRetrieve = options.elementTypeRetrieve;
		this.classNamesRetrieve = options.classNamesRetrieve;
		this.steps = options.steps;
		this.currentStepIndex = options.currentStepIndex;
		this.logger = logger;
	}
	getElement() {
		return this.element;
	}
	async getTagName() {
		return await this.tagNameRetrieve(this.element);
	}
	async getElementType() {
		return await this.elementTypeRetrieve(this.element);
	}
	async getClassNames() {
		return await this.classNamesRetrieve(this.element);
	}
	getSteps() {
		return this.steps;
	}
	getCurrentStepIndex() {
		return this.currentStepIndex;
	}
	getLogger() {
		return this.logger;
	}

	// step execution
	async mousedown() {
		return await this.do('mousedown');
	}
	async click() {
		return await this.do('click');
	}

	/**
	 * @param {string} methodName
	 */
	async do(methodName) {
		// starts with a resolved promise
		// if any third-party support handled step execution, should return a resolved promise with true
		// otherwise return a resolved promise with false
		// any previous third-party support handled, ignored the left third-party supports
		return await thirdParties.reduce(async (promise, third) => {
			const done = await promise;
			if (done) {
				return Promise.resolve(true);
			}
			if (third[methodName]) {
				const done = await third[methodName](this);
				if (done) {
					return Promise.resolve(true);
				}
			}
			return Promise.resolve(false);
		}, Promise.resolve());
	}
}

module.exports = ThirdStepSupport;
