const fs = require('fs');
const path = require('path');

/**
 * build flows array of given workspace
 * @param {{
 * 	workspaceFolder: string,
 * 	data: {story:string, flow:string}[]
 * }} options
 * @returns {{story: string, flow: string}[]}
 */
const compose = options => {
	const { workspaceFolder, data } = options;

	let shouldGoThrough = false;
	if (data.length === 0) {
		shouldGoThrough = true;
	} else if (data.length === 1) {
		if (!data[0].flow) {
			shouldGoThrough = true;
		}
	}

	if (shouldGoThrough) {
		const { story: storyName, flow: flowName } = data[0] || {};
		return (
			fs
				.readdirSync(workspaceFolder)
				.filter(dir => fs.statSync(path.join(workspaceFolder, dir)).isDirectory())
				// story name is not given or matched
				.filter(name => !storyName || storyName === name)
				.map(storyName => {
					return fs
						.readdirSync(path.join(workspaceFolder, storyName))
						.filter(name => fs.statSync(path.join(workspaceFolder, storyName, name)).isFile())
						.filter(name => name.endsWith('.flow.json'))
						.filter(name => {
							if (!storyName) {
								// story is not given, ignore given flow
								return true;
							} else if (!flowName) {
								// story is given , flow is not given
								// story already filtered
								return true;
							} else {
								return `${flowName}.flow.json` === name;
							}
						})
						.map(flowName => flowName.replace(/^(.*)\.flow\.json$/, '$1'))
						.map(flowName => ({ story: storyName, flow: flowName }));
				})
				.flat()
		);
	} else {
		return data;
	}
};

module.exports = compose;
