const sharp = require('sharp');
const fs = require('fs');
const buffer = require('buffer');
const es = require('event-stream');
const crypto = require('crypto');
const path = require('path');
const {
  once,
} = require('events');

const constants = require('./constants.js');

// TODO: check to see if the destination file already exists to prevent overwrite
const convertImagesToFile = async (imagepaths, filepath, logger) => {
  if (!exists(filepath) || !allImagesExist(imagepaths) || !allImagesHaveValidNames(imagepaths)) {
    return;
  }
  await convertImagesToFileWithFilename(imagepaths, filepath, determineFilename(imagepaths), logger);
};

const allImagesExist = (imagepaths) => {
  for (imagepath of imagepaths) {
    if (!exists(imagepath)) {
      // logger.error({
      //   'image does not exist': imagepath,
      // });
      return false;
    }
  }
  return true;
};

const exists = (path) => {
  return fs.existsSync(path)
};

const allImagesHaveValidNames = (imagepaths) => {
  const firstImageName = path.basename(imagepaths[0], '.png');
  for (imagepath of imagepaths) {
    if (firstImageName != path.basename(imagepath, '.png').slice(0, -2)) { // e.g. my-og-filename.mp4-0.png
      return false;
    }
  }
  return true;
};

const determineFilename = (imagepaths) => {
  const imagenameWithIndex = path.basename(imagepaths[0], '.png');
  const indexOfDelimeter = imagenameWithIndex.lastIndexOf('-');
  return imagenameWithIndex.slice(0, indexOfDelimeter);
};

const determineIndex = (imagepath) => {
  const imagenameWithIndex = path.basename(imagepath, '.png');
  const indexOfDelimeter = imagenameWithIndex.lastIndexOf('-');
  return imagenameWithIndex.slice(indexOfDelimeter + 1);
}

const convertImagesToFileWithFilename = async (imagepaths, filepath, filename, logger) => {
  const buffers = [];
  const childLogger = logger.child({
    filename,
  });
  await Promise.all(imagepaths.map(async (imagepath, index) => {
    buffers[index] = await convertImage2File(imagepath, childLogger);
  }));
  await createFile(filepath, filename, buffers, childLogger);
};

const createFile = async (filepath, filename, buffers, logger) => {
  const writeStream = fs.createWriteStream(filepath + filename);
  await once(writeStream, 'open');
  let i = 0;
  const write = async () => {
    let ok = true;
    do {
      if (i === buffers.length) {
        // ...
        break;
      } else {
        // See if we should continue, or wait
        // Don't pass the callback, because we're not done yet
        logger.info(`size of blob ${i}`, buffers[i].length);
        ok = writeStream.write(buffers[i]);
      }
      i++;
    } while (i < buffers.length && ok);
    if (i < buffers.length) {
      // had to stop early
      // write some more once it drains
      writeStream.once('drain', write);
    }
  };
  await write();
};

let convertImage2File = async (imagepath, logger) => {
  logger = logger.child({
    imagepath
  });
  const {
    err,
    data,
    info
  } = await loadImage(imagepath);
  if (err != null) {
    logger.error(err);
    return;
  }

  logger.info('parsing embedded metadata');
  o = new Uint8Array(constants.TOTAL_PADDING_SIZE);
  for (i = 0; i < constants.TOTAL_PADDING_SIZE + 1; i++) {
    o[i] = data[data.length - constants.TOTAL_PADDING_SIZE + i];
  }

  const originalFileSize = intFromBytes(o.slice(0, constants.BYTES_HOLDING_FILE_SIZE));
  const fileIndex = intFromBytes(o.slice(constants.BYTES_HOLDING_FILE_SIZE, constants.BYTES_HOLDING_FILE_SIZE + constants.BYTES_HOLDING_FILE_INDEX));
  const checksumAsUint8Array = o.slice(constants.BYTES_HOLDING_FILE_SIZE + constants.BYTES_HOLDING_FILE_INDEX, constants.BYTES_HOLDING_FILE_SIZE + constants.BYTES_HOLDING_FILE_INDEX + constants.BYTES_HOLDING_CHECKSUM);
  const embeddedChecksum = Buffer.from(checksumAsUint8Array).toString('hex');
  const actualData = data.slice(0, originalFileSize);

  logger = logger.child({
    'image': {
      'size': data.length,
      'width': info.width,
      'length': info.length,
    },
    'file': {
      'size': actualData.length,
      'metadata': {
        'original': o,
        'parsed': {
          'checksum': embeddedChecksum,
          'size': originalFileSize,
          'index': fileIndex,
        }
      },
    }
  });

  if (originalFileSize != actualData.length) {
    logger.error({
      'actual file size': actualData.length
    });
  }
  const actualDataChecksum = crypto.createHash('sha256').update(actualData).digest('hex');
  if (actualDataChecksum != embeddedChecksum) {
    logger.error({
      'actual checksum': actualDataChecksum
    });
  }
  const imageIndex = determineIndex(imagepath);
  if (imageIndex != fileIndex) {
    logger.error({
      'image index from image name': imageIndex
    });
  }

  logger.info('conversion of image finished');
  return actualData;
};

const loadImage = (imagepath) => {
  return sharp(imagepath)
    .raw()
    .toBuffer({
      resolveWithObject: true
    });
};

const intFromBytes = (byteArr) => byteArr.reduce((a, c, i) => a + c * 2 ** (56 - i * 8), 0);

module.exports = {
  convertImagesToFile,
  convertImagesToFileWithFilename
};