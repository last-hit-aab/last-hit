const Select2 = require('./select2');

const thirdParties = [new Select2()];

class ThirdStepSupport {
	/**
	 *
	 * @param {{
	 * 	element: HTMLElement,
	 * 	tagNameRetrieve: (element: HTMLElement) => string,
	 * 	elementTypeRetrieve: (element: HTMLElement) => string,
	 * 	classNamesRetrieve: (element: HTMLElement) => string,
	 * 	attrValueRetrieve: (element: HTMLElement) => string,
	 * 	steps: Step[],
	 * 	currentStepIndex: number,
	 * 	logger: console
	 * }} options
	 */
	constructor(options) {
		this.element = options.element;
		this.tagNameRetrieve = options.tagNameRetrieve;
		this.elementTypeRetrieve = options.elementTypeRetrieve;
		this.classNamesRetrieve = options.classNamesRetrieve;
		this.attrValueRetrieve = options.attrValueRetrieve;
		this.steps = options.steps;
		this.currentStepIndex = options.currentStepIndex;
		this.logger = options.logger;
	}
	/**
	 * get element
	 * @returns {HTMLElement}
	 */
	getElement() {
		return this.element;
	}
	/**
	 * get tag name
	 * @returns {string}
	 */
	async getTagName() {
		return await this.tagNameRetrieve(this.element);
	}
	/**
	 * get element type
	 * @returns {string}
	 */
	async getElementType() {
		return await this.elementTypeRetrieve(this.element);
	}
	/**
	 * get class names
	 * @returns {string}
	 */
	async getClassNames() {
		return await this.classNamesRetrieve(this.element);
	}
	/**
	 * get attribute value
	 * @param {string} attrName
	 * @returns {string}
	 */
	async getAttrValue(attrName) {
		return await this.attrValueRetrieve(this.element, attrName);
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
