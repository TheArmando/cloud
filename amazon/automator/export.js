const puppeteer = require('puppeteer');
const fs = require('fs');

module.exports = {
  ...require('./browser.js'),
  // ...require('../api/download.js'),
  ...require('./login.js'),
  // ...require('../api/metadata.js'),
  ...require('./upload.js'),
};
