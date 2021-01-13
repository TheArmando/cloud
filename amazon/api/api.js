// const got = require('got');
const download = require('./download.js');
const Metadata = require('./metadata.js');

module.exports = class AmazonAPI {
    constructor(headers, isDebug) {
        this.headers = headers;
        this.isDebug = isDebug;
        this.metadata = new Metadata(headers, isDebug);
    }

    async downloadPhotoWithFilename(filename, downloadProgressCallback) {
        await download.fetch(headers, filename, fileId, ownderId, downloadProgressCallback);
    }

    async downloadPhotosWithFilenames(filenames, downloadProgressCallback) {
        if (filenames.length == 0) {
            // todo: throw error?
        } else if (filenames.length == 1) {
            await this.downloadPhotoWithFilename(filenames[0], downloadProgressCallback);
        } else {
            await download.fetchBatch();
        }
    }

    async downloadNewPhotoMetadata(progressCallback) {
        await this.metadata.fetchAllFileMetaData(progressCallback);
    }
}
