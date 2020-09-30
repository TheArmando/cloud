const sleep = (millis) => {
  return new Promise(resolve => setTimeout(resolve, millis));
}

const login = (page, username, password) => {
  if (isAtLoginScreen(page)) {
    // Type in password and hit submit
    await page.type('[type=email]', username, { delay: delayTime() });
    await page.type('[type=password]', password, { delay: delayTime() });
    await Promise.all([
      page.waitForNavigation(),
      page.click('[type=submit]', { delay: delayTime() }),
    ]);

    console.log('Waiting for Login to complete...')
    const waitTime = 50
    let waitTimer = 0;
    while (!isAtPhotosScreen(page)) {
      await sleep(waitTime)
      waitTimer++;
      if (waitTimer == 100) {
        console.log("I've been waiting for " + waitTime * waitTimer + "ms ... something's probably gone wrong...")
      }
    }
    console.log('Login complete')
  } else {
    console.error("login function called but page is not @ login url")
  }
}

const isAtLoginScreen = (page) => { return page.url().startsWith('https://www.amazon.com/ap/signin'); }
const isAtPhotosScreen = (page) => { return page.url().startsWith('https://www.amazon.com/photos/all'); }