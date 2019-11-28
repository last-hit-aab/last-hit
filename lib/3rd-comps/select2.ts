import ThirdStepSupport from './support';

/**
 * for each step execution
 * return true means already done or ignored
 * return false means not handled
 */
export default class Select2 {
	async mousedown(options: ThirdStepSupport): Promise<boolean> {
		//check select2 for mousedown
		if ((await options.getTagName()) === 'SPAN') {
			const elementClass = await options.getClassNames();
			if (elementClass.search('select2-') !== -1) {
				options.getLogger().log(`found select2 for this mousedown, need execute mousedown`);
				await options.getElement().click();
				return true;
			}
		}

		return false;
	}
	async click(options: ThirdStepSupport): Promise<boolean> {
		//check select2 for mousedown
		if ((await options.getTagName()) === 'SPAN') {
			const elementClass = await options.getClassNames();
			if (elementClass.search('select2-') !== -1) {
				options.getLogger().log(`found select2 for this click, need skip click`);
				return true;
			}
		}
		return false;
	}
}
