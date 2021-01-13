const puppeteer = require('puppeteer');
const fs = require('fs');
const { Authentication } = require('./auth.js');
const { Photos } = require('./photos.js');
module.exports = class Automator {
  constructor(isDebug) {
    this.isDebug = isDebug;
    this.didInitialization = false;
  }

  // get isDebug() {
  //   return this.isDebug;
  // }

  async init() {
    this.browser = await puppeteer.launch({
      headless: !isDebug,
      defaultViewport: null,
    });
    const pages = await this.browser.pages();
    this.page = pages[0];

    this.auth = new Authentication(page, this.isDebug);
    await this.auth.init();
    await this.auth.login();

    this.photos = new Photos(page, this.isDebug);
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
      console.log('not logged in');
      return; // TODO: try login in instead of exiting
      // await this.auth.login()
    }
    await this.photos.upload(...filenames);
  }

}

// Old code snippet that would scroll down to attempt to trigger all the requests
  // hella slow... if revisiting this implementation look into using the newly added mouse.wheel function
  // let oC = 0;
  // while (stillRecievingFiles.well(counter)) {
  //   if (oC != counter) {
  //     oC = counter;
  //     console.log(counter);
  //   }
  //   page.keyboard.press('PageDown');
  //   // page.mouse.wheel({ y: 100 });
  //   await sleep(1);
  // }

  // const stillRecievingFiles = {
  //   currentCount: 0,
  //   tries: 0,
  //   well: (counter) => {
  //     if (stillRecievingFiles.currentCount == counter) {
  //       stillRecievingFiles.tries += 1;
  //     } else {
  //       stillRecievingFiles.tries = 0;
  //     }
  //     if (stillRecievingFiles.tries == 320 * 25) {
  //       console.log('No change in payload number detected....')
  //       return false;
  //     }
  //     stillRecievingFiles.currentCount = counter;
  //     return true;
  //   }
  // };