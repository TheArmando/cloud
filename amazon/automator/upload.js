const uploadPage = async (page, filepath) => {
  console.log('Starting upload routine');
  await Promise.all([
    page.click('.toggle', { delay: delayTime()})
  ])

  // await sleep(1000)
  console.log('Waiting for menu to be show');
  await page.waitFor('.expandable-nav.add-button.open', { visible: true });

  console.log('Clicking on upload')
  const [fileChooser] = await Promise.all([
    page.waitForFileChooser(),
    page.click('.upload-files-link', { delay: delayTime() }),
  ]);

  await fileChooser.accept([filepath]);

  console.log('I clicked on the upload button')
  // TODO: Still need to figure out how to wait for the upload to finish.
}

const isAtPhotosScreen = (page) => { return page.url().startsWith('https://www.amazon.com/photos/all'); }