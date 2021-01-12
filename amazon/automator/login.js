const fs = require('fs');

const AMAZON_SIGNIN_URL = 'https://www.amazon.com/ap/signin';
const AMAZON_PHOTOS_URL = 'https://www.amazon.com/photos/all';

const DEBUG_DIR = './debug/'
const SCREENSHOT_FILENAME = 'screenshot.png';

const ONE_SECOND_IN_MS = 1000;

const isAtLoginScreen = (page) => page.url().startsWith(AMAZON_SIGNIN_URL);
const isAtPhotosScreen = (page) => page.url().startsWith(AMAZON_PHOTOS_URL);

const sleep = (millis) => new Promise((resolve) => setTimeout(resolve, millis));

const INPUT_DELAY_IN_MILLISECONDS = 50;
const delayTime = () => Math.floor(Math.random() * INPUT_DELAY_IN_MILLISECONDS);

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
    const timeWhenLoginStarted = Date.now();
    await fillCredentialsAndLogin(page, username, password);

    // TODO: if debug flag is on?
    // continuallyTakeScreenshots()

    while (!isAtPhotosScreen(page)) {
      await checkForWarningMessage(page);
      await sleep(ONE_SECOND_IN_MS);
      if (Date().now() - timeWhenLoginStarted > 10 * ONE_SECOND_IN_MS) {
        console.log(`I've been waiting for over ${10} seconds ... something's probably gone wrong...`);
      }
    }

  } else {
    console.warn('login function called but page is currently not at login url');
  }
  // await shouldQuit = reader.question()
};

const checkForWarningMessage = async (page) => {
  // TODO: refactor into function that parses error messages from the page elements
  let warningBox = await page.$('#auth-warning-message-box')
  if (warningBox != null) {
    console.log('found warning box');
    warningMessage = await warningBox.$('.a-list-item')
    // TODO: When capture the captcha image so the browser can run in headless mode
    if (warningMessage.evaluate(node => node.innerText.startsWith('To better protect your account, please re-enter your password'))) {
      console.warn('Captcha challenge required...');
    } else {
      console.error('unanticipated error');
    }
    console.log('Waiting for manual override');
    continue;
  }
  let alertBox = await page.$('#auth-error-message-box');
  if (alertBox != null) {
    console.log('Error detected...');
  }

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
}

// const continuallyTakeScreenshots = async (page) => {
//   while (true) {
//     await sleep(1000);
//     await page.screenshot({ path: DEBUG_DIR + SCREENSHOT_FILENAME });
//   }
// };

const EMAIL_ATTRIBUTE = '[type=email]';
const PASSWORD_ATTRIBUTE = '[type=password]';
const LOGIN_ATTRIBUTE = '[type=submit]';

const fillCredentialsAndLogin = async (page, username, password) => {
  // check if email text box is on page. could be missing if amazon remembers the user
  if (await page.$(EMAIL_ATTRIBUTE) != null) {
    await page.type(EMAIL_ATTRIBUTE, username, { delay: delayTime() });
  }

  await page.type(PASSWORD_ATTRIBUTE, password, { delay: delayTime() });
  await Promise.all([
    page.waitForNavigation(),
    page.click(LOGIN_ATTRIBUTE, { delay: delayTime() }),
  ]);

}; 

module.exports = {
  login
}