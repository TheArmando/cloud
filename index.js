const sharp = require('sharp')
const fs = require('fs')
const buffer = require('buffer')
const es = require('event-stream')
const crypto = require('crypto')

const BYTES_HOLDING_CHECKSUM = 32
const BYTES_HOLDING_FILE_SIZE = 8
const BYTES_HOLDING_FILE_INDEX = 2
const TOTAL_PADDING_SIZE = BYTES_HOLDING_FILE_SIZE + BYTES_HOLDING_FILE_INDEX + BYTES_HOLDING_CHECKSUM

const NUMBER_OF_CHANNELS_IN_IMAGE = 4 // the decoder currently doesn't support channel sizes below 3. 4 gives best data density
const MAX_BUFFER_SIZE = buffer.constants.MAX_LENGTH
const MAX_FILE_SIZE = 256000000 // 256 MB

let convertFiles2Images = async (fileName) => {
  // buffers = splitBuffer(input)
  // for (buffer of buffers) {
  //   convertFile2Image(buffer)
  // }

  // let callback = (idk, data) => {
  //   console.log(data)
  // }

  // mapSync doesn't pass in index, so it has to be done manually
  index = 0


  fs.createReadStream(fileName, { highWaterMark: MAX_FILE_SIZE })
  .pipe(es.mapSync((data) => {
    console.log(data, index)
    convertFile2Image(fileName, data, index)
    index++
  }))
  .on('error', (err) => {
    console.log('Error while reading file.', err);
  })
  .on('close', () => {
    console.log('closed')
  })
  // await p
}

let convertFile2Image = async (fileName, input, index) => {
  const hash = crypto.createHash('sha256');
  hash.update(input);

  // console.log(input)
  const ORIGINAL_FILE_SIZE = input.length
  // Going to allocate space to save the original file size at the end of the file
  let modifiedSize = input.length + BYTES_HOLDING_FILE_SIZE + BYTES_HOLDING_FILE_INDEX + BYTES_HOLDING_CHECKSUM

  // The length of the data needs to be divisible by the channel size since each pixel is composed of a combination of bytes equal to the channel size
  // A requirement to create the image is a width and length value,  aesthetically a square like image a lot nicer than a strip like 1x40000000000

  // Find the Optimal File Size as a square
  // bad variable name TOOD: rename
  sqrtOfFileSize = Math.ceil(Math.sqrt(modifiedSize / NUMBER_OF_CHANNELS_IN_IMAGE))
  // Ensure one of the dimensions is divisible by the channel size, its then guaranteed to be divisible by the channel size when
  // width = (sqrtOfFileSize % NUMBER_OF_CHANNELS_IN_IMAGE == 0 ? sqrtOfFileSize : sqrtOfFileSize + (NUMBER_OF_CHANNELS_IN_IMAGE - sqrtOfFileSize % NUMBER_OF_CHANNELS_IN_IMAGE))
  // height = sqrtOfFileSize
  width = sqrtOfFileSize
  height = sqrtOfFileSize
  modifiedSize = NUMBER_OF_CHANNELS_IN_IMAGE * width * height

  console.log('original file size: ', ORIGINAL_FILE_SIZE)
  console.log('new file size: ', modifiedSize)
  console.log('square root of file size: ', sqrtOfFileSize)


  ogByteArray = new Uint8Array(getInt64Bytes(ORIGINAL_FILE_SIZE))
  indexByteArray = new Uint8Array(getInt16Bytes(index))
  paddedBufferSize = new Uint8Array(modifiedSize - ORIGINAL_FILE_SIZE - TOTAL_PADDING_SIZE)

  console.log(ogByteArray)
  console.log(indexByteArray)
  console.log(paddedBufferSize.length)

  // paddedBufferSize = modifiedSize - ORIGINAL_FILE_SIZE
  // paddedBuffer = new Uint8Array(paddedBufferSize)
  // console.log('length of padded buffer is: ', paddedBuffer.length)

  // for (i = 0; i < BYTES_HOLDING_FILE_SIZE + 1; i++) {
  //   paddedBuffer[paddedBuffer.length-i-1] = ogByteArray[BYTES_HOLDING_FILE_SIZE-i-1]
  // }

  // for (i = BYTES_HOLDING_FILE_SIZE; i < BYTES_HOLDING_FILE_SIZE + BYTES_HOLDING_FILE_INDEX + 1; i++) {
  //   paddedBuffer[paddedBuffer.length-i-1] = indexByteArray[BYTES_HOLDING_FILE_INDEX-i-1]
  // }

  // newBuffer = Buffer.concat([input, paddedBuffer, hash.digest()])
  newBuffer = Buffer.concat([input, paddedBufferSize, ogByteArray, indexByteArray, hash.digest()])

  console.log(newBuffer.slice(newBuffer.length-TOTAL_PADDING_SIZE))

  console.log('Width size: ', width)
  console.log('Height size: ', height)
  console.log('newBuffer: ', newBuffer.length)

  console.log('encoding data ...')

  let options = {
    raw: {
      width: width,
      height: height,
      channels: NUMBER_OF_CHANNELS_IN_IMAGE,
    },
    // sequentialRead: true,
  }

  console.log(newBuffer)

  console.log('output buffer: ', newBuffer)
  let jpegImageData = await sharp(newBuffer, options)
    .png(
      {
        compressionLevel: 0,
      }
    )
    .toFile(fileName + '-' + index + '.png')
}

const fileName2fileNames = (fileName) => {
  let i = 0
  fileNames = []
  while (fs.existsSync('./' + fileName + '-' + i + '.png')) {
    // console.log(fileName + '-' + i + '.png')
    fileNames.push(fileName + '-' + i + '.png')
    i++
  }
  console.log(fileNames)
  return fileNames
  // if (fs.existsSync('./fileName')) {
  //   console.log('The path exists.');
  // }
}

const validateImageFileNames = (fileNames) => {
  prevFileName = fileNames[0].substring(0, fileNames[0].length-4)
  for (fileName of FileNames) {
    nextFileName = fileName.substring(0, fileName.length-4)
    if (prevFileName != nextFileName) {
      return false
    }
    prevFileName = nextFileName
  }
  return true
}

// TODO: check to see if the destination file already exists to prevent overwrite
let convertImages2Files = async (fileName) => {
  fileNames = fileName2fileNames(fileName)
  buffers = []
  const writeStream = fs.createWriteStream('./decoded-' + fileNames[0].substring(0, fileNames[0].length-6));
  // for (fileName of fileNames) {
  //   buffer = await convertImage2File(fileName)
  // }

  // this assumes that filenames are provided in order, which may not be true
  await Promise.all(fileNames.map(async (fileName, index) => {
    // buffer = await convertImage2File(fileName)

    buffers[index] = await convertImage2File(fileName)
    // const input = await fs.readFile(fileName)
    // buffers[index] = input
  }));
  // for (buffer of buffers) {
  // }

  console.log('done converting now saving the file')
  console.log('length of buffers: ', buffers.length)

  let i = 0
  const write = () => {
    let ok = true;
    do {
      if (i === buffers.length) {
        // ...
        break
      } else {
        // See if we should continue, or wait
        // Don't pass the callback, because we're not done yet
        ok = writeStream.write(buffers[i])
      }
      i++
    } while (i < buffers.length && ok)
    if (i < buffers.length) {
      // had to stop early
      // write some more once it drains
      writeStream.once('drain', write)
    }
  }
  write()

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

}

let convertImage2File = async (fileName) => {
  const { err, data, info } = await sharp(fileName)
    .raw()
    .toBuffer({ resolveWithObject: true });

  console.log(data.length)
  console.log(data)

  o = new Uint8Array(TOTAL_PADDING_SIZE)
  for (i = 0; i < TOTAL_PADDING_SIZE + 1; i++) {
    o[i] = data[data.length - TOTAL_PADDING_SIZE + i]
  }
  console.log(o)
  const ORIGINAL_FILE_SIZE = intFromBytes(o.slice(0, BYTES_HOLDING_FILE_SIZE))
  const FILE_INDEX = intFromBytes(o.slice(BYTES_HOLDING_FILE_SIZE, BYTES_HOLDING_FILE_SIZE + BYTES_HOLDING_FILE_INDEX))
  const CHECK_SUM = intFromBytes(o.slice(BYTES_HOLDING_FILE_SIZE + BYTES_HOLDING_FILE_INDEX, BYTES_HOLDING_FILE_SIZE + BYTES_HOLDING_FILE_INDEX + BYTES_HOLDING_CHECKSUM))
  actualData = data.slice(0, ORIGINAL_FILE_SIZE)
  console.log(CHECK_SUM)

  console.log('actual size: ', ORIGINAL_FILE_SIZE)
  console.log('width: ', info.width, ' height: ', info.height)

  return actualData

  // fs.writeFileSync(fileName.substring(0, fileName.length-4), data, { encoding: null })
}

let splitFile2Buffers = async (fileName) => {
  fileBuffer = fs.readFileSync(fileName)
  newBuffers = []
  i = 0;
  while (fileBuffer.length > MAX_BUFFER_SIZE) {
    newBuffer.push(fileBuffer.subarray(i, i + MAX_BUFFER_SIZE))
    i = i + MAX_BUFFER_SIZE
    fileBuffer = fileBuffer.subarray(i)
  }
  newBuffer.push(fileBuffer.subarray(i))
  return newBuffers
}

function toHexString(byteArray) {
  return Array.from(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('')
}

const getInt16Bytes = (x) => {
  return [(x<<16), (x<<24)].map(z => z>>>24)
}

function getInt64Bytes(x) {
  let y= Math.floor(x/2**32);
  return [y,(y<<8),(y<<16),(y<<24), x,(x<<8),(x<<16),(x<<24)].map(z=> z>>>24)
}

function intFromBytes(byteArr) {
    return byteArr.reduce((a,c,i)=> a+c*2**(56-i*8),0)
}


let main = async () => {
  // TODO: make this not awful
  var myArgs = process.argv.slice(2);
  console.log('myArgs: ', myArgs);
  switch (myArgs[0]) {
    case 'encode':
      await convertFiles2Images(myArgs[1])
      break;
    case 'decode':
      // await convertImages2Files(myArgs.subarray(1))
      await convertImages2Files(myArgs[1])
      break;
    case 'help':
      console.log('use encode or decode followed by the filename. e.g. node index.js encode dogFacts.txt')
      break;
    default:
      console.log('Error while parsing commands use help for usage examples');
    }
}

console.time('main')
main()
console.timeEnd('main')