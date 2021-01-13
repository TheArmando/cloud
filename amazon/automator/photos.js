const logUpdate = require('log-update');

const INPUT_DELAY_IN_MILLISECONDS = 50;
const AMAZON_PHOTOS_URL = 'https://www.amazon.com/photos/all';

const isAtPhotosScreen = (url) => url.startsWith(AMAZON_PHOTOS_URL);

const sleep = (millis) => new Promise((resolve) => setTimeout(resolve, millis));
const delayTime = () => Math.floor(Math.random() * INPUT_DELAY_IN_MILLISECONDS);

const STATUS_DONE = "done";

module.exports = class Photos {
  constructor(page, isDebug) {
    this.page = page;
    this.isDebug = isDebug;
  }

  async upload(filepaths, statusCallback) {
    if (!isAtPhotosScreen(this.page.url)) {
      await this.page.goto(AMAZON_PHOTOS_URL);
    }
    console.time('upload');
    await this.#navigateToUploadView();
    await this.#openFileChooserAndSubmitFiles(filepaths);
    do {
      // logUpdate(await this.getUploadStatus());
      statusCallback(await this.getUploadStatus());
    } while (await this.isCurrentlyUploading());
    console.timeEnd('upload');
  }

  async isCurrentlyUploading() {
    if (this.page.isClosed()) { // TODO: turn this into a listener
      console.error('page has been closed while in use');
      return false;
    }
    try {
      const completedUploadSection = await this.page.$('.uploader-complete');
      return (completedUploadSection == null);
    } catch (error) {
      console.error(error);
    }
    return false;
  }
  
  async getUploadStatus() {
    try {
      const uploadDiv = await this.page.$('.queue-text');
      if (uploadDiv == null) {
        console.error('did not find ".queue-text" meaning browser is neither uploading nor finished with the upload');
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
    }
    return STATUS_DONE;
  }

  async #navigateToUploadView() {
    await Promise.all([
      this.page.click('.toggle', { delay: delayTime( )}),
    ]);
    await this.page.waitFor('.expandable-nav.add-button.open', { visible: true });
  }

  async #openFileChooserAndSubmitFiles(filepaths) {
    const [fileChooser] = await Promise.all([
      this.page.waitForFileChooser(),
      this.page.click('.upload-files-link', { delay: delayTime() }),
    ]);
    await fileChooser.accept(filepaths);
  }

}
