const logUpdate = require('log-update');

const sleep = (millis) => new Promise((resolve) => setTimeout(resolve, millis));

const UploadPhotosViaPage = async (page, filepaths) => {
  console.time('Upload time: ');
  await Promise.all([
    page.click('.toggle', { delay: delayTime() }),
  ]);

  await page.waitFor('.expandable-nav.add-button.open', { visible: true });

  const [fileChooser] = await Promise.all([
    page.waitForFileChooser(),
    page.click('.upload-files-link', { delay: delayTime() }),
  ]);

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

