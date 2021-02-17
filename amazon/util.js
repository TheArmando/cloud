const fs = require('fs');

const RUNTIME_DIRECTORY = `${__dirname}/../runtime/amazon/`;

const COOKIES_FILENAME = 'amazon-cookies.json';
const CREDENTIALS_FILENAME = 'amazon-credentials.json';
const HEADERS_FILENAME = 'amazon-headers.json';
const METADATA_FILENAME = 'all-metadata.json';

const COOKIES_FILEPATH = `${RUNTIME_DIRECTORY}${COOKIES_FILENAME}`;
const CREDENTIALS_FILEPATH = `${RUNTIME_DIRECTORY}${CREDENTIALS_FILENAME}`;
const HEADERS_FILEPATH = `${RUNTIME_DIRECTORY}${HEADERS_FILENAME}`;
const METADATA_FILEPATH = `${RUNTIME_DIRECTORY}${METADATA_FILENAME}`;

const INPUT_DELAY_IN_MILLISECONDS = 50;
// TODO: rename function
exports.delayTime = () => Math.floor(Math.random() * INPUT_DELAY_IN_MILLISECONDS);

exports.loadCookies = () => {
  if (fileExists(COOKIES_FILEPATH)) {
    return parseFile(COOKIES_FILEPATH);
  }
}

// move to automator?
exports.loadCredentials = () => {
  if (fileExists(CREDENTIALS_FILEPATH)) {
    const credentials = parseFile(CREDENTIALS_FILEPATH);
    if (!credentials.username) { // TODO: would be nice to throw both errors if neither are set
      throw new Error(`username not set in ${CREDENTIALS_FILENAME}`)
    }
    if (!credentials.password) {
      throw new Error(`password not set in ${CREDENTIALS_FILENAME}`);
    }
    return credentials;
  }
  const credentialsNotFoundMessage = `${CREDENTIALS_FILEPATH} not found!`;
  try {
    initializeCredentialsFile();
  } catch (initEx) {
    throw new Error(`${credentialsNotFoundMessage} attempt to create a new one failed: ` + initEx.message);
  }
  throw new Error(`${credentialsNotFoundMessage} set credentials in ${CREDENTIALS_FILEPATH} and relaunch app`);
}

exports.loadHeaders = () => {
  if (this.fileExists(HEADERS_FILEPATH)) {
    return parseFile(HEADERS_FILEPATH);
  }
}

exports.loadMetadata = () => {
  if (this.fileExists(METADATA_FILEPATH)) {
    return this.parseFile(METADATA_FILEPATH);
  }
}


exports.fileExists = (filepath) => {
  return fs.existsSync(filepath);
}

exports.parseFile = (filepath) => {
  return JSON.parse(fs.readFileSync(filepath, { encoding: 'utf-8' }));
}


// move to amazon.js?
const initializeCredentialsFile = () => {
  if (!fs.existsSync(CREDENTIALS_FILEPATH)) {
    fs.writeFileSync(CREDENTIALS_FILEPATH, JSON.stringify({ username: '', password: '' }));
  }
}

exports.sleep = (millis) => new Promise((resolve) => setTimeout(resolve, millis));

// move to amazon.js?
exports.writeHeaders = (headers) => {
  fs.writeFileSync(HEADERS_FILEPATH, JSON.stringify(headers, null, 4));
};

exports.writeMetadata = (metadata) => {
  fs.writeFileSync(METADATA_FILEPATH, JSON.stringify(metadata, null, 4))
}