// export.js 
const upload = require('./upload.js');
const login = require('./login.js');

module.exports = Object.assign({}, upload, login);