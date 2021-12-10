const { Command } = require('commander');
const program = new Command();

const Amazon = require('./amazon.js');
const Logger = require('../logger/logger.js');

const app = {};

(async () => {
  program
    .option('-d, --download <name.photo.extention...>', 'download photos from Amazon via provided filenames')
    .option('-r, --reset', 'redownlaods metadata cached from amazon')
    .option('-u, --upload <name.photo.extention...>', 'upload photos via provided filenames');

  await program.parseAsync(process.argv);
  const parameters = program.opts();

  const debugMode = true;
  app.logger = new Logger(debugMode);
  app.amazon = new Amazon(app.logger, debugMode);
  await app.amazon.init();

  if (program.reset) await goReset();
  if (program.download) await goDownload(parameters.download);
  if (program.upload) await goUpload(parameters.upload);
})();

const goDownload = async (photoname) => {
  await app.amazon.downloadPhotos(photoname);
};

const goReset = async () => {
  await app.amazon.resetMetadata();
};

const goUpload = async (photopath) => {
  await app.amazon.uploadPhotos(photopath);
};
