const API = require('./api/api.js');
const Automator = require('./automator/automator.js');

const util = require('./util.js');

module.exports = class Amazon {
    constructor(logger) {
        this.didInitialization = false;
        this.logger = logger;
        // TODO: find out if headers even need to be saved to file and subsequently loaded during startup
        this.headers = util.loadHeaders();
        this.automator = new Automator(logger);
        this.api = new API(logger);
    }

    async init() {
        await this.automator.init();
        this.api = new API(this.automator.getHeaders());
        this.didInitialization = true;
    }

    async uploadPhotos(...photopaths) {
        if (!this.didInitialization) {
            await this.init();
        }
        await this.automator.uploadPhotos(photopaths);
    }

    async downloadPhotos(...photonames) {
        if (!this.didInitialization) {
            await this.init();
        }
        await this.api.downloadPhotosWithPhotonames(photonames);
    }

    async resetMetadata(progressCallback) {
        await this.api.downloadNewPhotoMetadata(progressCallback);
    }

};