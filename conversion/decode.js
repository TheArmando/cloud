const sharp = require('sharp');
const fs = require('fs');
const buffer = require('buffer');
const es = require('event-stream');
const crypto = require('crypto');
// import { once } from 'events';
const { once } = require('events');

const constants = require('./constants.js');

// TODO: check to see if the destination file already exists to prevent overwrite
const convertImages2Files = async (fileName) => {
  fileNames = fileName2fileNames(fileName);
  buffers = [];
  const writeStream = fs.createWriteStream(`./decoded-${fileNames[0].substring(0, fileNames[0].length - 6)}`);
  await once(writeStream, 'open');
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

  console.log('length of buffers: ', buffers.length);
  console.log('done converting now saving the file');
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
        console.log(`size of blob ${i}`, buffers[i].length);
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
  console.log('done saving file');
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
  console.log('filenames to decode', fileNames);
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

  o = new Uint8Array(constants.TOTAL_PADDING_SIZE);
  for (i = 0; i < constants.TOTAL_PADDING_SIZE + 1; i++) {
    o[i] = data[data.length - constants.TOTAL_PADDING_SIZE + i];
  }
  console.log(o);
  const originalFileSize = intFromBytes(o.slice(0, constants.BYTES_HOLDING_FILE_SIZE));
  const fileIndex = intFromBytes(o.slice(constants.BYTES_HOLDING_FILE_SIZE, constants.BYTES_HOLDING_FILE_SIZE + constants.BYTES_HOLDING_FILE_INDEX));
  // const CHECK_SUM = intFromBytes(o.slice(constants.BYTES_HOLDING_FILE_SIZE + constants.BYTES_HOLDING_FILE_INDEX, constants.BYTES_HOLDING_FILE_SIZE + constants.BYTES_HOLDING_FILE_INDEX + constants.BYTES_HOLDING_CHECKSUM));
  const checksum = o.slice(constants.BYTES_HOLDING_FILE_SIZE + constants.BYTES_HOLDING_FILE_INDEX, constants.BYTES_HOLDING_FILE_SIZE + constants.BYTES_HOLDING_FILE_INDEX + constants.BYTES_HOLDING_CHECKSUM);
  // TODO: slicing this information doesn't properly set the length variable, thus the buffer must be written within the scope of this function. otherwise the file is written to fs with the additional metadata appended to the end
  const actualData = data.slice(0, originalFileSize);
  
  console.log('actual size: ', originalFileSize, actualData.length);
  console.log('width: ', info.width, ' height: ', info.height);
  console.log('checksum', checksum);

  const actualDataChecksum = crypto.createHash('sha256').update(actualData).digest();
  const embeddedChecksum = crypto.createHash('sha256').update(checksum).digest();
  if (actualDataChecksum != embeddedChecksum) {
    console.log('discrepency detected with checksum');
    console.log('expected checksum: ', embeddedChecksum);
    console.log('actual checksum: ', actualDataChecksum);
  }

  return actualData;

  // fs.writeFileSync(fileName.substring(0, fileName.length-4), data, { encoding: null })
};

const intFromBytes = (byteArr) => byteArr.reduce((a, c, i) => a + c * 2 ** (56 - i * 8), 0);

module.exports = {
  convertImages2Files
};