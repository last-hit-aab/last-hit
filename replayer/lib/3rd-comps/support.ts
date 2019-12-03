import { Step } from 'last-hit-types';
import { ElementHandle, Page } from 'puppeteer';
import Select2 from './select2';

export type ElementRetriever = (element: ElementHandle) => Promise<string>;
export type ElementAttributeValueRetriever = (
	element: ElementHandle,
	attributeName: string
) => Promise<string>;
export type ThirdStepSupportOptions = {
	page: Page;
	element: ElementHandle;
	tagNameRetrieve: ElementRetriever;
	elementTypeRetrieve: ElementRetriever;
	classNamesRetrieve: ElementRetriever;
	attrValueRetrieve: ElementAttributeValueRetriever;
	steps: Array<Step>;
	currentStepIndex: number;
	logger: Console;
};

const thirdParties = [new Select2()];

class ThirdStepSupport {
	private page: Page;
	private element: ElementHandle;
	private tagNameRetrieve: ElementRetriever;
	private elementTypeRetrieve: ElementRetriever;
	private classNamesRetrieve: ElementRetriever;
	private attrValueRetrieve: ElementAttributeValueRetriever;
	private steps: Array<Step>;
	private currentStepIndex: number;
	private logger: Console;

	constructor(options: ThirdStepSupportOptions) {
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
	getPage(): Page {
		return this.page;
	}
	getElement(): ElementHandle {
		return this.element;
	}
	async getTagName(): Promise<string> {
		return await this.tagNameRetrieve(this.element);
	}
	async getElementType(): Promise<string> {
		return await this.elementTypeRetrieve(this.element);
	}
	async getClassNames(): Promise<string> {
		return await this.classNamesRetrieve(this.element);
	}
	async getAttrValue(attrName: string): Promise<string> {
		return await this.attrValueRetrieve(this.element, attrName);
	}
	getSteps(): Array<Step> {
		return this.steps;
	}
	getCurrentStep(): Step {
		return this.steps[this.getCurrentStepIndex()];
	}
	getCurrentStepIndex(): number {
		return this.currentStepIndex;
	}
	getLogger(): Console {
		return this.logger;
	}
	// step execution
	async mousedown(): Promise<boolean> {
		return await this.do('mousedown');
	}
	async click(): Promise<boolean> {
		return await this.do('click');
	}
	async do(methodName: string): Promise<boolean> {
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
		}, Promise.resolve(false));
	}
}

export default ThirdStepSupport;
