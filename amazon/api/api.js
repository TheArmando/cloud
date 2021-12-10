// const got = require('got');
const download = require('./download.js');
const Metadata = require('./metadata.js');

module.exports = class AmazonAPI {
    constructor(logger, headers) {
        this.logger = logger;
        this.headers = headers;
        this.metadata = new Metadata(logger, headers);
    }

    findAllPhotosWithFilename(filename, numberOfPhotos, searchProgressCallback) {
        photonames = [];
        for (let i = 0; i < numberOfPhotos; i++) {
            photonames.push(filename + '-' + i + '.png');
        }
        photosFound = this.metadata.findMetaDataForFilenames(photonames, searchProgressCallback);
        return photosFound.map(photo => photo.name);
    }

    async downloadPhotoWithPhotoname(photoname, downloadProgressCallback) {
        await download.fetch(headers, photoname, fileId, ownderId, downloadProgressCallback);
    }

    async downloadPhotosWithPhotonames(photonames, downloadProgressCallback) {
        if (photonames.length == 0) {
            // TODO: throw error?
        } else if (photonames.length == 1) {
            await this.downloadPhotoWithPhotoname(photonames[0], downloadProgressCallback);
        } else {
            await download.fetchBatch();
        }
    }

    async downloadNewPhotoMetadata(progressCallback) {
        await this.metadata.fetchAllFileMetaData(progressCallback);
    }
}
