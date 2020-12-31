const puppeteer = require('puppeteer');
const readlineSync = require('readline-sync');
const fs = require('fs');

// const nock = require('nock')
const got = require('got');
const { exit } = require('process');
const { time } = require('console');

const AMAZON_SIGNIN_URL = 'https://www.amazon.com/ap/signin';
const AMAZON_PHOTOS_URL = 'https://www.amazon.com/photos/all';
const INPUT_DELAY_IN_MILLISECONDS = 50;

const COOKIES_FILENAME = 'cookies.json';
const CREDENTIALS_FILENAME = 'credentials.json';
const METADATA_FILENAME = 'all-metadata.json';

const CAPTURED_REQS_FILENAME = 'dev-captured-requests.json';
const SCREENSHOT_FILENAME = 'dev-screenshot.png';

const sleep = (millis) => new Promise((resolve) => setTimeout(resolve, millis));

// https://www.amazon.com/drive/v1/search search endpoint

// const delayTime = () => { return 1; }
const delayTime = () => Math.floor(Math.random() * INPUT_DELAY_IN_MILLISECONDS);

let username = '';
let password = '';

const isAtLoginScreen = (page) => page.url().startsWith(AMAZON_SIGNIN_URL);
const isAtPhotosScreen = (page) => page.url().startsWith(AMAZON_PHOTOS_URL);

// TODO: DRY this up its fucking garbage
const loadCredentials = () => {
  if (fs.existsSync('./' + CREDENTIALS_FILENAME)) {
    const data = JSON.parse(fs.readFileSync('./' + CREDENTIALS_FILENAME, { encoding: 'utf8' }));
    username = data.username;
    password = data.password;
    if (!username || !password) {
      console.log('No credentials found - set credentials and rerun the application');
      exit(1);
    }
  } else {
    const data = JSON.stringify({ username: '', password: '' });
    fs.writeFileSync('./' + CREDENTIALS_FILENAME, data);
    console.log('No credentials found - set credentials and rerun the application');
    exit(1);
  }
};

const login = async (page, username, password) => {
  console.log('Logging in...');
  await page.goto(AMAZON_PHOTOS_URL);
  if (isAtLoginScreen(page)) {
    // login logic
    await page.type('[type=email]', username, { delay: delayTime() });
    await page.type('[type=password]', password, { delay: delayTime() });
    await Promise.all([
      page.waitForNavigation(),
      page.click('[type=submit]', { delay: delayTime() }),
    ]);

    console.log('Waiting for Login to complete...');
    // delete this
    await sleep(2000);
    await page.screenshot({ path: './' + SCREENSHOT_FILENAME });

    let waitTimer = 0;
    while (!isAtPhotosScreen(page)) {
      if (waitTimer == -1) {
        await sleep(100);
        continue; // quick and dirty way to prevent stdout spam
      }
      // TODO: refactor into function that parses error messages from the page elements
      let warningBox = await page.$('#auth-warning-message-box')
      if (warningBox != null) {
        console.log('\tWarning detected...')
        warningMessage = await warningBox.$('.a-list-item')
        // TODO: When capture the captcha image so the browser can run in headless mode
        if (warningMessage.evaluate(node => node.innerText.startsWith('To better protect your account, please re-enter your password'))) {
          console.log('\t\tCaptcha challenge required...')
        } else {
          console.log('\t\tNot sure what the issue is')
        }
        console.log('\t\tWaiting for manual override')
        waitTimer = -1; // Reset wait timer and infinitely wait for user to take the wheel
        continue;
      }
      let alertBox = await page.$('#auth-error-message-box')
      if (alertBox != null) {
        console.log('\tError detected...')
      }
      await sleep(100);
      waitTimer++;
      if (waitTimer == 100) {
        console.log(`I've been waiting for ${100 * waitTimer}ms ... something's probably gone wrong...`);
      }
    }
    console.log('Login complete');
    // const captcha = reareadlineSyncder.question("Input Captcha: ");
    // if (captcha.toLowerCase() === 'quit') {
    //   await browser.close();
    // }
    // await page.type('[type=password]', 'letmein', { delay: delayTime()})
    // await page.type('[name=guess]', captcha, { delay: delayTime() });

    // await Promise.all([
    //   page.waitForNavigation(),
    //   page.click('[type=submit]', { delay: delayTime() }),
    // ]);

    // <button class="upload-files-link"><span class="label">Upload photos</span><span>Add photos and videos</span></button>
  } else {
    console.error('login function called but page is not @ login url');
  }

  // await shouldQuit = reader.question()
};

const uploadPage = async (page, filepath) => {
  console.log('Starting upload routine');
  await Promise.all([
    page.click('.toggle', { delay: delayTime() }),
  ]);

  // await sleep(1000)
  console.log('Waiting for menu to be show');
  await page.waitFor('.expandable-nav.add-button.open', { visible: true });

  console.log('Clicking on upload');
  const [fileChooser] = await Promise.all([
    page.waitForFileChooser(),
    page.click('.upload-files-link', { delay: delayTime() }),
  ]);

  await fileChooser.accept([filepath]);

  console.log('I clicked on the upload button');
  // TODO: Still need to figure out how to wait for the upload to finish.
};

// download page
//  "id": "GAbH6DhuT-2amcULxwk9fg",
// "ownerId": "A1RQVN0A1VQKPI",
// that will download the file
// https://www.amazon.com/drive/v1/nodes/GAbH6DhuT-2amcULxwk9fg/contentRedirection?querySuffix=%3Fdownload%3Dtrue&ownerId=A1RQVN0A1VQKPI

// TODO: Figure out how to do batch downloads. Also figure out if you can batch download only 1 file
const initiateDownload = async (page) => {

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
  fs.writeFileSync('./headers.json', JSON.stringify(headers, null, 4));
  return headers;
};

const loadMetaDataFile = () => {
  if (fs.existsSync('./' + METADATA_FILENAME)) {
    return JSON.parse(fs.readFileSync('./' + METADATA_FILENAME, { encoding: 'utf8' }));
  } else {
    console.log('local metadata file not found');
  }
}

const listAllAmazonPhotos = (metadata) => {
  metadata.data.forEach(unknownArray => {
    unknownArray.forEach(photo => {
      console.log(photo.name);
    });
  });
  console.log("Number of photos: " + metadata.count);
}

const getAllFileMetaData = async (headers) => {
  let done = false;
  let numberOfFiles;
  let page = 0;
  const data = [];
  do {
    // const { body } = await mimicSearchRequest(page, headers);
    // payload = JSON.parse(body);
    const payload = await mimicSearchRequest(page, headers);
    data.push(payload.data);
    numberOfFiles = payload.count;
    page += 1;
    if (payload.data.length == 0) {
      done = true;
    }
  } while (!done);
  fs.writeFileSync('./' + METADATA_FILENAME, JSON.stringify({ data, count: numberOfFiles }, null, 4));
  console.log(console.timeEnd('metadata'));
  // Old code snippet that would scroll down to attempt to trigger all the requests
  // way too slow... if revisiting this implementation look into using the newly added mouse.wheel function
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
};

const mimicSearchRequest = async (page, headers) => {
  resp = {};
  try {
    let url = 'https://www.amazon.com/drive/v1/search?asset=NONE&filters=type%3A(PHOTOS+OR+VIDEOS)&limit=1&searchContext=customer&sort=%5B%27contentProperties.contentDate+DESC%27%5D&tempLink=false&resourceVersion=V2&ContentType=JSON&_=';
    url += Date.now().toString();
    url = url.replace('&limit=1', '&limit=200');
    if (page > 0) {
      url = url.replace('&tempLink=false', `&tempLink=false&offset=${200 * page}`);
    }
    resp = await got.get(url, {
      headers
    }).json();
  } catch (error) {
    console.log(error.response);
    resp = error;
  }
  fs.writeFileSync('./dev-captured-response-' + page + '.json', JSON.stringify(resp));
  return resp;
};

const mimicDownloadRequest = (headers) => {};
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

  // Initiate login
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

let commandArguments = {
  'list': 'lists the files that have been uploaded',
  'reset': 'deletes the cookies and metadata saved from previous launches',
  'upload': 'upload [filename].png to upload file (must be in project directory). To upload a file split between multiple images e.g. [filename]-3.png just omit the number and the application will auto upload all the files',
  'download': 'download [filename] to download a file that is in the project directory',
  'help': 'shows all commands'
};

let page = null;
let headers = null;

const main = async () => {
  const myArgs = process.argv.slice(2);

  loadCredentials();
  const metadata = loadMetaDataFile();
  
  switch (myArgs[0]) {
    case 'init':
      await getAllFileMetaData(headers);
      break;
    case 'list':
      await listAllAmazonPhotos(metadata);
      break;
    case 'login':
      // TODO: If the cookies don't exist or have expired then launch normally, if not headless mode should work fine
      const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
      });
      const {page, headers} = await setupPage(browser);
      await browser.close();
      break;
    case 'reset':
      console.log('to be implemented');
      break;
    case 'upload':
      console.log('to be implemented');
      // await uploadPage(page, './' + myArgs[1]); // TODO: add support for relative filepaths
      // await sleep(5000); // manual sleep until I figure out how to continue once the page is done loading
      break;
    case 'download':
      // download the provided file
      console.log('to be implemented');
      break;
    case 'help':
      console.log(`Here are the commands available:` + JSON.stringify(commandArguments));
      break;
    default:
      console.log('Error while parsing commands use help for usage examples')
  }
}

// (async () => {
//   let headers = fs.readFileSync('./headers.json');
//   console.log(headers.toString());
//   headers = JSON.parse(headers.toString());
//   await getAllFileMetaData(headers);
// })();

main();

// const [fileChooser] = await Promise.all([
//   page.waitForFileChooser(),
//   page.click('#upload-file-button'), // some button that triggers file selection
// ]);
// await fileChooser.accept(['/tmp/myfile.pdf']);

// page.click(selector, clickOptions);