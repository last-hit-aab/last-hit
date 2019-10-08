const uuidv4 = require('uuid/v4');

class ReplaySummary {
	constructor(options) {
		const { storyName, flowName, replayId } = options;
		this.storyName = storyName;
		this.flowName = flowName;
		this.replayId = replayId;
		this.numberOfStep = 0;
		this.numberOfUIBehaver = 0
		this.numberOfSuccess = 0;
		this.numberOfFailed = 0;
		this.numberOfAssert = 0;
		this.ignoreErrorList = [];
		this.numberOfAjax = 0;
		this.slowAjaxRequest = [];
	}
}

const replayRecords = new Map();
var currentReplayId = '';
var replaySummary = null;

const recordReplayEventError = async (storyName, flowName, replayType, data, e) => {
	return new Promise((resolve, reject) => {
		try {
			const replayKey = _buildKey(storyName, flowName, currentReplayId);
			if (replayType == 'ajax') {
				replaySummary.numberOfAjax += 1
			} else {
				console.log('replayKey', replayKey);
				replaySummary.numberOfFailed += 1
				// replayRecords.get(replayKey).push(data)
			}

			resolve(true);
		} catch (e) {
			console.error(e);
			reject(e);
		}
	});
};

const recordReplayEvent = async (storyName, flowName, replayType, data) => {
	return new Promise((resolve, reject) => {
		try {
			const replayKey = _buildKey(storyName, flowName, currentReplayId);
			if (replayType == 'ajax') {
				replaySummary.numberOfAjax += 1
				replaySummary.numberOfSuccess += 1;
			} else {
				replaySummary.numberOfUIBehaver += 1
				replaySummary.numberOfSuccess += 1;
			}

			resolve(true);
		} catch (e) {
			console.error(e);
			reject(e);
		}
	});
};

const initReplayRecord = (storyName, flow) => {
	const flowName = flow.name;
	const numberOfStep = flow.steps.length - 1;
	console.log(this.replayRecords);
	replayRecords.clear();
	const replayId = uuidv4();
	replaySummary = new ReplaySummary({ storyName, flowName, replayId });
	replaySummary.numberOfStep = numberOfStep;
	currentReplayId = replayId;
	const key = _buildKey(storyName, flowName, replayId);
	console.log('key', key);
	replayRecords.set(key, []);
};

const _buildKey = (storyName, flow, replayId) => {
	return `${storyName}+${flow}+${replayId}`;
};

const getReplayRecords = (storyName, flowName) => {
	const replayKey = _buildKey(storyName, flowName, currentReplayId);
	return replayRecords.get(replayKey);
};

const printRecords = (storyName, flowName) => {
	const replayKey = _buildKey(storyName, flowName, currentReplayId);
	console.table([replaySummary], ["storyName", "flowName", "numberOfStep", "numberOfUIBehaver", "numberOfSuccess", "numberOfFailed", "ignoreErrorList", "numberOfAjax", "slowAjaxRequest"]);
};

const destory = () => {
	replayRecords.clear();
};

module.exports = {
	initReplayRecord,
	recordReplayEvent,
	getReplayRecords,
	destory,
	printRecords,
	recordReplayEventError
};
