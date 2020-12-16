const sharp = require('sharp');
const fs = require('fs');
const buffer = require('buffer');
const es = require('event-stream');
const crypto = require('crypto');

const BYTES_HOLDING_CHECKSUM = 32;
const BYTES_HOLDING_FILE_SIZE = 8;
const BYTES_HOLDING_FILE_INDEX = 2;
const TOTAL_PADDING_SIZE = BYTES_HOLDING_FILE_SIZE + BYTES_HOLDING_FILE_INDEX + BYTES_HOLDING_CHECKSUM;

const NUMBER_OF_CHANNELS_IN_IMAGE = 4; // the decoder currently doesn't support channel sizes below 3. 4 gives best data density
const MAX_BUFFER_SIZE = buffer.constants.MAX_LENGTH;
const MAX_FILE_SIZE = 256 * 1024 * 1024; // 256 MB

// TODO: check to see if the destination file already exists to prevent overwrite
const convertImages2Files = async (fileName) => {
  fileNames = fileName2fileNames(fileName);
  buffers = [];
  const writeStream = fs.createWriteStream(`./decoded-${fileNames[0].substring(0, fileNames[0].length - 6)}`);
  // for (fileName of fileNames) {
  //   buffer = await convertImage2File(fileName)
  // }

  // this assumes that filenames are provided in order, which may not be true
  await Promise.all(fileNames.map(async (fileName, index) => {
    // buffer = await convertImage2File(fileName)

    buffers[index] = await convertImage2File(fileName);
    // const input = await fs.readFile(fileName)
    // buffers[index] = input
  }));
  // for (buffer of buffers) {
  // }

  console.log('done converting now saving the file');
  console.log('length of buffers: ', buffers.length);

  let i = 0;
  const write = () => {
    let ok = true;
    do {
      if (i === buffers.length) {
        // ...
        break;
      } else {
        // See if we should continue, or wait
        // Don't pass the callback, because we're not done yet
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
  write();

  // write();
  //   function write() {
  //     let ok = true;
  //     do {
  //       i--;
  //       if (i === 0) {
  //         // Last time!
  //         writer.write(data, encoding, callback);
  //       } else {
  //         // See if we should continue, or wait.
  //         // Don't pass the callback, because we're not done yet.
  //         ok = writer.write(data, encoding);
  //       }
  //     } while (i > 0 && ok);
  //     if (i > 0) {
  //       // Had to stop early!
  //       // Write some more once it drains.
  //       writer.once('drain', write);
  //     }
  //   }
};

const fileName2fileNames = (fileName) => {
  let i = 0;
  fileNames = [];
  while (fs.existsSync(`./${fileName}-${i}.png`)) {
    // console.log(fileName + '-' + i + '.png')
    fileNames.push(`${fileName}-${i}.png`);
    i++;
  }
  console.log(fileNames);
  return fileNames;
  // if (fs.existsSync('./fileName')) {
  //   console.log('The path exists.');
  // }
};

let convertImage2File = async (fileName) => {
  const { err, data, info } = await sharp(fileName)
    .raw()
    .toBuffer({ resolveWithObject: true });

  console.log(data.length);
  console.log(data);

  o = new Uint8Array(TOTAL_PADDING_SIZE);
  for (i = 0; i < TOTAL_PADDING_SIZE + 1; i++) {
    o[i] = data[data.length - TOTAL_PADDING_SIZE + i];
  }
  console.log(o);
  const ORIGINAL_FILE_SIZE = intFromBytes(o.slice(0, BYTES_HOLDING_FILE_SIZE));
  const FILE_INDEX = intFromBytes(o.slice(BYTES_HOLDING_FILE_SIZE, BYTES_HOLDING_FILE_SIZE + BYTES_HOLDING_FILE_INDEX));
  const CHECK_SUM = intFromBytes(o.slice(BYTES_HOLDING_FILE_SIZE + BYTES_HOLDING_FILE_INDEX, BYTES_HOLDING_FILE_SIZE + BYTES_HOLDING_FILE_INDEX + BYTES_HOLDING_CHECKSUM));
  actualData = data.slice(0, ORIGINAL_FILE_SIZE);
  console.log(CHECK_SUM);

  console.log('actual size: ', ORIGINAL_FILE_SIZE);
  console.log('width: ', info.width, ' height: ', info.height);

  return actualData;

  // fs.writeFileSync(fileName.substring(0, fileName.length-4), data, { encoding: null })
};

const intFromBytes = (byteArr) => byteArr.reduce((a, c, i) => a + c * 2 ** (56 - i * 8), 0);
