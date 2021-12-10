const API = require('./api/api.js');
const Automator = require('./automator/automator.js');

const util = require('./util.js');

module.exports = class Amazon {
    constructor(logger, isDebug) {
        this.logger = logger;
        this.isDebug = isDebug;
        // TODO: find out if headers even need to be saved to file and subsequently loaded during startup
        this.headers = util.loadHeaders();
    }

    // TODO: find a better pattern than this, init() must be called after instantiating class because of async await
    async init() {
        this.automator = new Automator(this.logger, this.isDebug);
        await this.automator.init();
        const headers = await this.automator.getHeaders();
        this.api = new API(this.logger, headers);
    }

    async uploadPhotos(...photopaths) {
        await this.automator.uploadPhotos(photopaths);
    }

    async downloadPhotos(...photonames) {
        await this.api.downloadPhotosWithPhotonames(photonames);
    }

    async resetMetadata(progressCallback) {
        await this.api.downloadNewPhotoMetadata(progressCallback);
    }

};