/**
 * Encode is used to convert a provided file into an equivalent .PNG file
 * During conversion, small amounts of padding is added onto the image for metadata
 *
 * Metadata is used to record:
 *  - the original byte size of the files
 *  - hashes
 *  - indices which Specify what part of the original file the image composes. In cases where the original file was too big and was split apart
 */

const sharp = require('sharp')
const fs = require('fs')
const buffer = require('buffer')
const es = require('event-stream')
const crypto = require('crypto')
const constants = require('./constants.js')

/**
 * Converts provided file to an image
 * @param {string} fileName
 */
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

  fs.createReadStream(fileName, { highWaterMark: constants.MAX_FILE_SIZE })
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
  let modifiedSize = input.length + constants.BYTES_HOLDING_FILE_SIZE + constants.BYTES_HOLDING_FILE_INDEX + constants.BYTES_HOLDING_CHECKSUM

  // The length of the data needs to be divisible by the channel size since each pixel is composed of a combination of bytes equal to the channel size
  // A requirement to create the image is a width and length value, aesthetically a square like image a lot nicer than a strip like 1x40000000000

  // Find the Optimal File Size as a square
  // bad variable name TOOD: rename
  sqrtOfFileSize = Math.ceil(Math.sqrt(modifiedSize / constants.NUMBER_OF_CHANNELS_IN_IMAGE))
  // Ensure one of the dimensions is divisible by the channel size, its then guaranteed to be divisible by the channel size when
  // width = (sqrtOfFileSize % NUMBER_OF_CHANNELS_IN_IMAGE == 0 ? sqrtOfFileSize : sqrtOfFileSize + (NUMBER_OF_CHANNELS_IN_IMAGE - sqrtOfFileSize % NUMBER_OF_CHANNELS_IN_IMAGE))
  // height = sqrtOfFileSize
  width = sqrtOfFileSize
  height = sqrtOfFileSize
  modifiedSize = constants.NUMBER_OF_CHANNELS_IN_IMAGE * width * height

  console.log('original file size: ', ORIGINAL_FILE_SIZE)
  console.log('new file size: ', modifiedSize)
  console.log('square root of file size: ', sqrtOfFileSize)

  // The file sizes now need to be converted from the type number to a byte array so they can be appended to the image data
  ogByteArray = new Uint8Array(getIntAs8Bytes(ORIGINAL_FILE_SIZE)) // Original file size represented in bytes
  indexByteArray = new Uint8Array(getIntAs2Bytes(index)) // Index number represented in bytes
  // padding which is calculated to ensure the image's height * width * channel is equal to the buffer we provided
  paddedBufferSize = new Uint8Array(modifiedSize - ORIGINAL_FILE_SIZE - constants.TOTAL_PADDING_SIZE)

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

  console.log(newBuffer.slice(newBuffer.length-constants.TOTAL_PADDING_SIZE))

  console.log('Width size: ', width)
  console.log('Height size: ', height)
  console.log('newBuffer: ', newBuffer.length)
  console.log('encoding data ...')

  let options = {
    raw: {
      width: width,
      height: height,
      channels: constants.NUMBER_OF_CHANNELS_IN_IMAGE,
    },
    // sequentialRead: true,
  }

  console.log(newBuffer)
  console.log('output buffer: ', newBuffer)
  let pngImageData = await sharp(newBuffer, options)
    .png(
      {
        compressionLevel: 0,
      }
    )
    .toFile(fileName + '-' + index + '.png')
}

/**
 * Provide an integer that will be returned as an array of unsigned bytes of length 2
 * @param {Number} x
 */
const getIntAs2Bytes = (x) => {
  return [(x<<16), (x<<24)].map(z => z>>>24)
}

/**
 * Provide an integer that will be returned as an array of unsigned bytes of length 8
 * @param {Number} x
 */
const getIntAs8Bytes = (x) => {
  let y= Math.floor(x/2**32);
  return [y,(y<<8),(y<<16),(y<<24), x,(x<<8),(x<<16),(x<<24)].map(z=> z>>>24)
}