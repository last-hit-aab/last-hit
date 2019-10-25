/**
 * This callback is displayed as a global member.
 * @callback ElementRetriever
 * @param {ElementHandle} element
 * @returns {string}
 */

const Select2 = require('./select2');

const thirdParties = [new Select2()];

class ThirdStepSupport {
	/**
	 *
	 * @param {Object} options
	 * @param {Page} options.page
	 * @param {ElementHandle} options.element
	 * @param {ElementRetriever} options.tagNameRetrieve
	 * @param {ElementRetriever} options.elementTypeRetrieve
	 * @param {ElementRetriever} options.classNamesRetrieve
	 * @param {ElementRetriever} options.attrValueRetrieve
	 * @param {Step[]} options.steps
	 * @param {number} options.currentStepIndex
	 * @param {Console} options.logger
	 */
	constructor(options) {
		this.page = options.page;
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
	 * get page
	 * @returns {Page} puppeteer page
	 */
	getPage() {
		return this.page;
	}
	/**
	 * get element
	 * @returns {ElementHandle} puppeteer element handle
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
	getCurrentStep() {
		return this.steps[this.getCurrentStepIndex()];
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
