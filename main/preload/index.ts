// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
	['chrome', 'node', 'electron'].forEach(type => {
		console.log(`%c${type}:%c ${process.versions[type]}`, 'color:red', 'color:unset');
	});
});
