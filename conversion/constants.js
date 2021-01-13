const buffer = require('buffer');

const BYTES_HOLDING_CHECKSUM = 32;
const BYTES_HOLDING_FILE_SIZE = 8;
const BYTES_HOLDING_FILE_INDEX = 2;
const TOTAL_PADDING_SIZE = BYTES_HOLDING_FILE_SIZE + BYTES_HOLDING_FILE_INDEX + BYTES_HOLDING_CHECKSUM;

const NUMBER_OF_CHANNELS_IN_IMAGE = 4; // the decoder currently doesn't support channel sizes below 3. 4 gives best data density
const MAX_BUFFER_SIZE = buffer.constants.MAX_LENGTH;
const MAX_FILE_SIZE = 256 * 1024 * 1024; // 256 MB

const FOO = 5;

module.exports = {
    BYTES_HOLDING_CHECKSUM,
    BYTES_HOLDING_FILE_SIZE,
    BYTES_HOLDING_FILE_INDEX,
    TOTAL_PADDING_SIZE,
    NUMBER_OF_CHANNELS_IN_IMAGE,
    MAX_BUFFER_SIZE,
    MAX_FILE_SIZE
};
