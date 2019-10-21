// const express = require('express');
// const bodyParser = require('body-parser');

// const startupWebapp = () => {
// 	const webapp = express();
// 	webapp.use(bodyParser.json());
// 	webapp.get('/', (req, res) => {
// 		res.send('OK');
// 	});
// 	webapp.post('/flow', (req, res) => {
// 		mainWindow.webContents.send('flow-data', JSON.stringify(req.body));
// 		res.send('OK');
// 	});
// 	return webapp.listen(3000);
// };

// module.exports = { startupWebapp };
