class Environment {
	/**
	 * @param {Object} options
	 * @param {string=} options.urlReplaceRegexp
	 * @param {string=} options.urlReplaceTo
	 * @param {number=} options.sleepAfterChange
	 * @param {number=} options.slowAjaxTime
	 */
	constructor(options) {
		this.constructed = false;
		if (!options) {
			return;
		}

		this.constructed = true;
		if (options.urlReplaceRegexp) {
			this.urlReplaceRegexps = options.urlReplaceRegexp.split('&&').map(text => new RegExp(text));
			this.urlReplaceTos = (options.urlReplaceTo || '').split('&&');
			this.urlReplaceTos.length = this.urlReplaceRegexps.length;
			this.urlReplaceTos = this.urlReplaceTos.map(to => (to ? to : ''));
		}

		this.sleepAfterChange = options.sleepAfterChange;
		this.slowAjaxTime = options.slowAjaxTime;

		this.wrappers = [this.wrapUrl];
	}
	/**
	 * @param {Step} step
	 * @returns {Step}
	 */
	wrap(step) {
		if (!this.isConstructed()) {
			return step;
		}
		return this.getWrappers().reduce((step, wrapper) => wrapper.call(this, step), step);
	}
	wrapUrl(step) {
		const regexps = this.getUrlReplaceRegexps();
		if (step.url && regexps) {
			step.url = regexps.reduce((url, regexp, index) => {
				return url.replace(regexp, this.getUrlReplaceTos(index) || '');
			}, step.url);
		}
		return step;
	}
	getWrappers() {
		return this.wrappers;
	}
	isConstructed() {
		return this.constructed;
	}
	/**
	 * @returns {RegExp[]}
	 */
	getUrlReplaceRegexps() {
		return this.urlReplaceRegexps;
	}
	/**
	 * @returns {string[]}
	 */
	getUrlReplaceTos() {
		return this.urlReplaceTos;
	}
	getSleepAfterChange() {
		return this.sleepAfterChange;
	}
	getSlowAjaxTime() {
		return this.slowAjaxTime || 500;
	}
}

module.exports = Environment;
