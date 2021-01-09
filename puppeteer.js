const { Command } = require('commander');
const program = new Command();

program
  .option('-d, --download <name.photo.extention>', 'download photos from Amazon via provided filenames')
  .option('-l, --list', 'list all index photos')
  .option('-r, --reset', 'use if app is behaving in unexpected ways, removes all app relevant saved data')
  .option('-u, --upload <name.photo.extention>', 'upload photos via provided filenames')
  .option('-xd, --delete <name.photo.extention>', 'delete photos on Amazon via provided filenames')

const puppeteer = require('puppeteer');
const readlineSync = require('readline-sync');
const fs = require('fs');

// const nock = require('nock')
const got = require('got');
const stream = require('stream');
const {promisify} = require('util');
const pipeline = promisify(stream.pipeline);
const cliProgress = require('cli-progress');
const logUpdate = require('log-update');

const { exit } = require('process');
const { time } = require('console');
const { stringify } = require('querystring');
const { STATUS_CODES } = require('http');

const AMAZON_SIGNIN_URL = 'https://www.amazon.com/ap/signin';
const AMAZON_PHOTOS_URL = 'https://www.amazon.com/photos/all';
// Requires the file id as $1 and owner id as $2 
const AMAZON_DOWNLOAD_URL = 'https://www.amazon.com/drive/v1/nodes/$1/contentRedirection?querySuffix=%3Fdownload%3Dtrue&ownerId=$2';

const INPUT_DELAY_IN_MILLISECONDS = 50;

const COOKIES_FILENAME = 'cookies.json';
const CREDENTIALS_FILENAME = 'credentials.json';
const HEADERS_FILENAME = 'headers.json';
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
  await page.goto(AMAZON_PHOTOS_URL);
  if (isAtLoginScreen(page)) {
    console.log('Logging in...');
    // login logic
    // email box could be missing if amazon remebers the user
    if (await page.$('[type=email') != null) {
      await page.type('[type=email]', username, { delay: delayTime() });
    }
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

const uploadPage = async (page, filepaths) => {
  console.time('Upload time: ');
  await Promise.all([
    page.click('.toggle', { delay: delayTime() }),
  ]);

  // console.log('Waiting for menu to be shown');
  await page.waitFor('.expandable-nav.add-button.open', { visible: true });

  // console.log('Clicking on upload');
  const [fileChooser] = await Promise.all([
    page.waitForFileChooser(),
    page.click('.upload-files-link', { delay: delayTime() }),
  ]);
  // console.log('Clicked on the upload button');

  await fileChooser.accept(filepaths);
  await sleep(1000);
  
  do {
    logUpdate(await getUploadStatus(page));
    await sleep(250);
  } while (await isCurrentlyUploading(page))
  console.timeEnd('Upload time: ');
};

const STATUS_DONE = "done";

const getUploadStatus = async (page) => {
  try {
    const uploadDiv = await page.$('.queue-text');
    if (uploadDiv == null) {
      console.error('did not find ".uploader-complete" nor ".queue-text" meaning browser is neither uploading nor finished with the upload');
      return STATUS_DONE;
    }
    const uploadSpan = await uploadDiv.$('.primary');
    if (uploadSpan == null) {
      console.error('found ".queue-text" but could not find its child ".primary"');
      return STATUS_DONE;
    }
    return await uploadSpan.evaluate(node => node.innerText);
  } catch (error) {
    console.error(error);
    return STATUS_DONE;
  }
}

const isCurrentlyUploading = async (page) => {
  if (page.isClosed()) { // TODO: turn this into a listener
    console.error('page has been closed while in use');
    return false;
  }
  try {
    const completedUploadSection = await page.$('.uploader-complete');
    return (completedUploadSection == null);
  } catch (error) {
    console.error(error);
  }
  return false;
}

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

const loadHeadersFromFile = () => {
  if (fs.existsSync('./' + HEADERS_FILENAME)) {
    return JSON.parse(fs.readFileSync('./' + HEADERS_FILENAME, { encoding: 'utf8'} ));
  }
}

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
  console.time('Indexing time');
  let done = false;
  let numberOfFiles;
  let page = 0;
  const data = [];
  console.log('Downloading photo metadata from Amazon Photos...');
  // Write output but don't hide the cursor
  do {
    logUpdate('Indexing ' + numberOfFiles + ' photos...');
    const payload = await mimicSearchRequest(page, headers);
    data.push(payload.data);
    numberOfFiles = payload.count;
    page += 1;
    if (payload.data.length == 0) {
      done = true;
    }
  } while (!done);
  fs.writeFileSync('./' + METADATA_FILENAME, JSON.stringify({ data, count: numberOfFiles }, null, 4));
  console.timeEnd('Indexing time');
};

const mimicSearchRequest = async (page, headers) => {
  let resp = {};
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

// TODO: Figure out how to do batch downloads. Also figure out if you can batch download only 1 file
const initiateDownload = async (page) => {

};

const mimicDownloadRequest = async (headers, filename, fileId, ownerId) => {
  // console.log('downloading ' + filename);
  let progressBar;
  downloadLink = generateDownloadLink(fileId, ownerId);
  // console.log('using download link: ' + downloadLink);
  try {
    await pipeline(got.stream(downloadLink, {
          headers
        }).on('downloadProgress', progress => {
            // Report download progress
            if (progressBar == null) {
              progressBar = makeProgressBar(0, progress.total);
            }
            progressBar.update(progress.transferred);
            progressBar.updateETA();
      }),
      fs.createWriteStream('./'+filename)
    );
  } catch (error) {
    console.log(error);
  }
  progressBar.stop();
};

// Notes on file upload 
// 1. Make OPTIONS call
// https://content-na.drive.amazonaws.com/v2/upload?conflictResolution=RENAME&fileSize=16256251&name=DTS_Moodboard_07.jpg&parentNodeId=id9-5WljQjenREkrQ7SSvA
// authority: content-na.drive.amazonaws.com
// :method: OPTIONS
// :path: /v2/upload?conflictResolution=RENAME&fileSize=16256251&name=DTS_Moodboard_07.jpg&parentNodeId=id9-5WljQjenREkrQ7SSvA
// :scheme: https
// accept: */*
// accept-encoding: gzip, deflate, br
// accept-language: en-US,en;q=0.9
// access-control-request-headers: x-amz-access-token,x-amzn-file-md5
// access-control-request-method: POST
// origin: https://www.amazon.com
// referer: https://www.amazon.com/
// sec-fetch-dest: empty
// sec-fetch-mode: cors
// sec-fetch-site: cross-site
// user-agent: M
//
// 2. POST
// https://content-na.drive.amazonaws.com/v2/upload?conflictResolution=RENAME&fileSize=16256251&name=DTS_Moodboard_07.jpg&parentNodeId=id9-5WljQjenREkrQ7SSvA
// :authority: content-na.drive.amazonaws.com
// :method: POST
// :path: /v2/upload?conflictResolution=RENAME&fileSize=16256251&name=DTS_Moodboard_07.jpg&parentNodeId=id9-5WljQjenREkrQ7SSvA
// :scheme: https
// accept: application/json, text/plain, */*
// accept-encoding: gzip, deflate, br
// accept-language: en-US,en;q=0.9
// content-length: 16256251
// content-type: application/x-www-form-urlencoded
// origin: https://www.amazon.com
// referer: https://www.amazon.com/
// sec-fetch-dest: empty
// sec-fetch-mode: cors
// sec-fetch-site: cross-site
// user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 11_1_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36
// x-amz-access-token: Atza|IwEBIB9718H8e79ApdXwEI-ErPAU3oCqmDwW8syODA6IyhxuAsRkp5_VQualQQKUl8SKDct1kyHLKN-CJZgZ-V7Xc5bONe7XDcZXghMaFOEl0YiIRP3xiPOpS0W4jABWr2i3knBYUnwzXOOP1Zj6Yr-yBXYghPAmRmJVbF5nRs2WvOeXSwIojyyp1Y0Itwg2ELrs5LpKe41fezIiNWdjSu8qheXcYITkcL1hJQ47flFuHrbf1dpY11zclXaeVev5RuG0oulozVY-TpFx_7I-UH5V8gqRXt4XECOxhz2WWwNUSHcwsj0Jcusw7HjYvvWnj-t34zYl7Ky-PlyxEEl0-z8dWryUk8MMdgDXJUndDjFMYuxVp4ly3rHxzMuHfNfszb8EBos
// x-amzn-file-md5: d70563d294112662d46c2e9376782564
// 
// I don't know where x-amz-access-token comes from, source code might be generating it?
const mimicUploadRequest = async (headers, filename) => {

}

// download page
//  "id": "GAbH6DhuT-2amcULxwk9fg",
// "ownerId": "A1RQVN0A1VQKPI",
// that will download the file
// https://www.amazon.com/drive/v1/nodes/GAbH6DhuT-2amcULxwk9fg/contentRedirection?querySuffix=%3Fdownload%3Dtrue&ownerId=A1RQVN0A1VQKPI

const generateDownloadLink = (fileId, ownerId) => {
  let specificDownloadUrl = AMAZON_DOWNLOAD_URL.replace('$1', fileId);
  return specificDownloadUrl.replace('$2', ownerId);
}

const makeProgressBar = (start, max) => {
  // create a new progress bar instance and use shades_classic theme
  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  bar.start(max, start);
  return bar
}

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

const findMetaDataFileWithFilename = (metadata, filename) => {
  console.log('processing ' + metadata.count + ' files...');
  for (const group of metadata.data) {
    for (const file of group) {
      if (file.name == filename) {
        console.log('found ' + filename);
        return file;
      }
    }
  }
  return null;
};

let commandArguments = {
  'list': 'lists the files that have been uploaded',
  'reset': 'deletes the cookies and metadata saved from previous launches',
  'upload': 'upload [filename].png to upload file (must be in the uploads folder). To upload a file split between multiple images e.g. [filename]-3.png just omit the number and the application will auto upload all the files',
  'download': 'download [filename] to download a file into the project downloads folder',
  'help': 'shows all commands'
};

const main = async () => {
  const myArgs = process.argv.slice(2);
  loadCredentials(); // TODO: return credentials then pass in where needed instead of setting them as variables
  let headers = loadHeadersFromFile();
  let metadata = loadMetaDataFile();
  // TODO: If the cookies don't exist or have expired then launch normally, if not headless mode should work fine. Alternatively see if launch args can be run minimized
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });
  let page = null;

  
  switch (myArgs[0]) {
    case 'init': // is this needed?
      await getAllFileMetaData(headers); 
      break;
    case 'list':
      await listAllAmazonPhotos(metadata);
      break;
    case 'reset':
      console.log('to be implemented');
      break;
    case 'upload':
      pageAndHeaders = await setupPage(browser); // TODO: find a better way to get these instance variables
      headers = pageAndHeaders.headers;
      page = pageAndHeaders.page;
      let filenames = myArgs.slice(1);
      filenames.forEach((filename, index, array) => {
        array[index] = './uploads/' + filename;
      })
      await uploadPage(page, filenames); // TODO: add support for relative filepaths
      // await sleep(5000); // manual sleep until I figure out how to continue once the page is done loading
      break;
    case 'download':
      let filename = myArgs[1].trim();
      let file = findMetaDataFileWithFilename(metadata, filename);
      if (file != null) {
        mimicDownloadRequest(headers, './downloads/' + filename, file.id, file.ownerId);
      } else {
        console.log(file);
        console.log(filename + " not found. Ensure the filename is correct and contains the correct file extension, or reset the metadata file");
        // console.log(metadata.data[2][0].name == filename);
      }
      break;
    case 'help':
      console.log(`Here are the commands available:` + JSON.stringify(commandArguments));
      break;
    default:
      console.log('Error while parsing commands use help for usage examples');
  }
  await browser.close();
}

main();
