/**
 * for each step execution
 * return true means already done or ignored
 * return false means not handled
 */
module.exports = class Select2 {
	/**
	 * @param {ThirdStepSupportOptions} options
	 */
	async mousedown(options) {
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
	/**
	 * @param {ThirdStepSupportOptions} options
	 */
	async click(options) {
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
};
