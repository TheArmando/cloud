const fs = require('fs');

module.exports = class Automator {
  constructor(isDebug) {
    this.isDebug = isDebug;
  }

  get isDebug() {
    return this.isDebug;
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: !isDebug,
      defaultViewport: null,
    });
    const pages = await this.browser.pages();
    this.page = pages[0];
    this.networkData = await setupLoggingOfAllNetworkData(this.page);
  }

  async login(username, password) {
    
  }
}

const setupPage = async (browser) => {
  // const page = await browser.newPage();
  const pages = await browser.pages();
  const page = pages[0];

  loadCookiesFromFileToPage(page);

  // Setup request interception
  const cdpRequestDataRaw = await setupLoggingOfAllNetworkData(page);

  // Setup response interception
  // page.on("response", async (httpResponse) => {
  //   if (httpResponse.url().startsWith('https://www.amazon.com/drive/v1/search')) {
  //     let payload = await httpResponse.json();
  //     fs.writeFileSync('./payload-' + counter + '.json', JSON.stringify(payload));
  //     counter += 1;
  //   }
  // });

  await login(page, username, password);

  // Save captured request data... for debugging
  fs.writeFileSync('./' + CAPTURED_REQS_FILENAME, JSON.stringify(cdpRequestDataRaw, null, 4));

  const headers = loadHeaders(cdpRequestDataRaw);
  // console.log(JSON.stringify(headers));

  const gimmeTheCookies = await page.cookies();
  // console.log(JSON.stringify(gimmeTheCookies));
  fs.writeFileSync('./' + COOKIES_FILENAME, JSON.stringify(gimmeTheCookies, null, 4));

  return {
    page,
    headers
  }
};

const loadCookiesFromFileToPage = async (page) => {
  if (fs.existsSync('./' + COOKIES_FILENAME)) {
    try {
      const cookies = JSON.parse(fs.readFileSync('./' + COOKIES_FILENAME));
      for (const cookie of cookies) { // setting the cookies individually seems to make puppeteer happy
        page.setCookie(cookie);
      }
    } catch (error) {
      console.log(error);
      exit(1);
    }
  } else {
    console.log('previous cookies not found...');
  }
};

const loadHeaders = (cdpRequestDataRaw) => {
  const headers = {};
  // Parse through to get some of that good headers
  for (const [requestID, entry] of Object.entries(cdpRequestDataRaw)) {
    if (entry['Network.requestWillBeSent'] && entry['Network.requestWillBeSent'].request.url.startsWith('https://www.amazon.com/drive/v1/search')) {
      const h = entry['Network.requestWillBeSentExtraInfo'].headers;
      for (const [header, value] of Object.entries(h)) {
        // Only save valid headers
        if (!header.startsWith(':')) {
          headers[header] = value;
        }
      }
    }
  }
  fs.writeFileSync('./' + HEADERS_FILENAME, JSON.stringify(headers, null, 4));
  return headers;
};



// Credit: https://stackoverflow.com/questions/47078655/missing-request-headers-in-puppeteer/62232903#62232903
// Returns map of request ID to raw CDP request data. This will be populated as requests are made.
// NOTE: This is not saving request/response payloads - Don't know why | may be trapped behind a function call...
const setupLoggingOfAllNetworkData = async (page) => {
  const cdpSession = await page.target().createCDPSession();
  await cdpSession.send('Network.enable');
  const cdpRequestDataRaw = {};
  const addCDPRequestDataListener = (eventName) => {
    cdpSession.on(eventName, (request) => {
      cdpRequestDataRaw[request.requestId] = cdpRequestDataRaw[request.requestId] || {};
      Object.assign(cdpRequestDataRaw[request.requestId], { [eventName]: request });
    });
  };
  addCDPRequestDataListener('Network.requestWillBeSent');
  addCDPRequestDataListener('Network.requestWillBeSentExtraInfo');
  addCDPRequestDataListener('Network.responseReceived');
  addCDPRequestDataListener('Network.responseReceivedExtraInfo');
  return cdpRequestDataRaw;
};
