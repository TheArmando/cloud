const puppeteer = require('puppeteer');
const fs = require('fs');
const Authentication = require('./auth.js');
const Photos = require('./photos.js');
module.exports = class Automator {
  constructor(logger, isDebug) {
    this.logger = logger;
    this.isDebug = isDebug;
    this.didInitialization = false;
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: !this.isDebug,
      defaultViewport: null,
    });
    
    const pages = await this.browser.pages();
    this.page = pages[0];

    this.auth = new Authentication(this.page, this.logger);
    await this.auth.init();
    await this.auth.login();

    this.photos = new Photos(this.page, this.logger);
    this.didInitialization = true;
  }

  async authenticate() {
    await this.auth.login();
  }

  async getHeaders() {
    return await this.auth.getHeaders();
  }

  async uploadPhotos(...filenames) {
    if (!(await this.auth.isLoggedIn())) {
      return; // TODO: try login in instead of exiting?
      // await this.auth.login()
    }
    await this.photos.upload(...filenames);
  }

};
