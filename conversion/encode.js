/**
 * Encode is used to convert a provided file into an equivalent .PNG file
 * During conversion, small amounts of padding is added onto the image for metadata
 *
 * Metadata is used to record:
 *  - the original byte size of the files
 *  - hashes
 *  - indices which Specify what part of the original file the image composes. In cases where the original file was too big and was split apart
 */

const sharp = require('sharp');
const fs = require('fs');
const buffer = require('buffer');
const es = require('event-stream');
const crypto = require('crypto');
const constants = require('./constants.js');

const { once } = require('events');

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, prettyPrint } = format;
const logger = createLogger({
  level: 'info',
  format: combine(
    // label({ label:  }),
    timestamp(),
    prettyPrint(),
  ),
  defaultMeta: { service: 'encoder' },
  transports: [
    //
    // - Write all logs with level `error` and below to `error.log`
    // - Write all logs with level `info` and below to `combined.log`
    //
    new transports.File({ filename: 'dev-error.log', level: 'error' }),
    new transports.File({ filename: 'dev-combined.log' }),
  ],
});

const convertFilesToImages = async (filepaths, callback) => {
  if (filepaths.length == 0) {
    return;
  }
  if (filepaths.length == 1) {
    await convertFileToImages(filepaths[0], callback, logger);
  } else {
    await Promise.all(filepaths.map(async (filepath) => {
      await convertFileToImages(filepath, callback, logger);
    }));
  }

};

/**
 * Converts provided file to an image
 * @param {string} filepath
 */
const convertFileToImages = async (filepath, callback, logger) => {
  logger = logger.child({ filepath });
  const profiler = logger.startTimer();
  // mapSync doesn't pass in index, so it has to be done manually
  index = 0;
  const readStream = fs.createReadStream(filepath, { highWaterMark: constants.MAX_FILE_SIZE })
    .pipe(es.mapSync((data) => {
      convertFileToImage(filepath, data, index, logger);
      callback(index++);
    }))
    .on('error', (err) => {
      logger.error('error while reading file.', err);
    })
    .on('close', () => {
      logger.info('file read stream closed');
    });
  await once(readStream, 'end');
  profiler.done();
};

const convertFileToImage = async (fileName, input, index, logger) => {
  const newImageName = `${fileName}-${index}.png`;
  logger = logger.child({
    image: newImageName,
  });
  const profiler = logger.startTimer();
  const hash = crypto.createHash('sha256');
  hash.update(input);

  // console.log(input)
  const ORIGINAL_FILE_SIZE = input.length;
  // Going to allocate space to save the original file size at the end of the file
  let modifiedSize = input.length + constants.BYTES_HOLDING_FILE_SIZE + constants.BYTES_HOLDING_FILE_INDEX + constants.BYTES_HOLDING_CHECKSUM;

  // The length of the data needs to be divisible by the channel size since each pixel is composed of a combination of bytes equal to the channel size
  // A requirement to create the image is a width and length value, aesthetically a square like image a lot nicer than a strip like 1x40000000000

  // Find the Optimal File Size as a square
  // bad variable name TOOD: rename
  sqrtOfFileSize = Math.ceil(Math.sqrt(modifiedSize / constants.NUMBER_OF_CHANNELS_IN_IMAGE));
  // Ensure one of the dimensions is divisible by the channel size, its then guaranteed to be divisible by the channel size when
  // width = (sqrtOfFileSize % NUMBER_OF_CHANNELS_IN_IMAGE == 0 ? sqrtOfFileSize : sqrtOfFileSize + (NUMBER_OF_CHANNELS_IN_IMAGE - sqrtOfFileSize % NUMBER_OF_CHANNELS_IN_IMAGE))
  // height = sqrtOfFileSize
  width = sqrtOfFileSize;
  height = sqrtOfFileSize;
  modifiedSize = constants.NUMBER_OF_CHANNELS_IN_IMAGE * width * height;

  logger.info({
    'original file size': ORIGINAL_FILE_SIZE,
    'new file size': modifiedSize,
    'square root of file size': sqrtOfFileSize,
  });

  // The file sizes now need to be converted from the type number to a byte array so they can be appended to the image data
  ogByteArray = new Uint8Array(getIntAs8Bytes(ORIGINAL_FILE_SIZE)); // Original file size represented in bytes
  indexByteArray = new Uint8Array(getIntAs2Bytes(index)); // Index number represented in bytes
  // padding which is calculated to ensure the image's height * width * channel is equal to the buffer we provided
  paddedBufferSize = new Uint8Array(modifiedSize - ORIGINAL_FILE_SIZE - constants.TOTAL_PADDING_SIZE);

  logger.info({
    'filesize byte array': ogByteArray,
    'index byte array': indexByteArray,
    'metadata buffer size in bytes': paddedBufferSize.length,
  });
  newBuffer = Buffer.concat([input, paddedBufferSize, ogByteArray, indexByteArray, hash.digest()]);
  // console.log(newBuffer.slice(newBuffer.length - constants.TOTAL_PADDING_SIZE));

  logger.info({
    'image pixel width': width,
    'image pixel height': height,
    'new image file size': newBuffer.length,
  });

  const options = {
    raw: {
      width,
      height,
      channels: constants.NUMBER_OF_CHANNELS_IN_IMAGE,
    },
    // sequentialRead: true,
  };

  const pngImageData = await sharp(newBuffer, options)
    .png(
      {
        compressionLevel: 0,
      },
    )
    .toFile(newImageName);
  profiler.done();
};

/**
 * Provide an integer that will be returned as an array of unsigned bytes of length 2
 * @param {Number} x
 */
const getIntAs2Bytes = (x) => [(x << 16), (x << 24)].map((z) => z >>> 24);

/**
 * Provide an integer that will be returned as an array of unsigned bytes of length 8
 * @param {Number} x
 */
const getIntAs8Bytes = (x) => {
  const y = Math.floor(x / 2 ** 32);
  return [y, (y << 8), (y << 16), (y << 24), x, (x << 8), (x << 16), (x << 24)].map((z) => z >>> 24);
};

module.exports = {
  convertFilesToImages,
};