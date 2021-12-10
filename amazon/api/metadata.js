const AMAZON_SEARCH_URL = 'https://www.amazon.com/drive/v1/search?asset=NONE&filters=type%3A(PHOTOS+OR+VIDEOS)&limit=1&searchContext=customer&sort=%5B%27contentProperties.contentDate+DESC%27%5D&tempLink=false&resourceVersion=V2&ContentType=JSON&_=';

const got = require('got');
const util = require('../util.js');
module.exports = class Metadata {
	constructor(logger, headers) {
		this.logger = logger;
		this.headers = headers;
		this.metadata = util.loadMetadata();
	}

	/**
	 * Retrieves metadata for all the photos in the account
	 * This data is used to show what files are available and to easily download or delete specific files
	 * @param {*} callback optional callback for the function to report the number of photos it has pulled metadata on
	 */
	async fetchAllFileMetaData(callback) {
		if (callback == null) { callback = () => {}; }
		const timestampLabel = 'metadata.fetchAllFileMetaData';
		this.logger.timeStart(timestampLabel);
		let numberOfFiles;
		let page = 0;
		const data = [];
		do {
			callback(numberOfFiles);
			const payload = await this.mimicSearchRequest(page);
			data.push(payload.data);
			numberOfFiles = payload.count;
			page += 1;
			// TODO: investigate whether this conditional break causes an erreonous search call (or at the very least a duplicate api call)
			// this repeats a query with the expectation that eventually the number of results will be 0
			// the reason the search request is repeated is because there is a hard limit on the result set, this causing the need for a page count
			// it stands to reason that you have already reached the last page when the number of results is less than the max results
			if (payload.data.length == 0) {
				break;
			}
		} while (true); // TODO: infinite loops are bad
		util.writeMetadata({ data, count: numberOfFiles })
		this.metadata = data;
		this.logger.timeEnd(timestampLabel);
	}

	findMetaDataForFilenames(filenames, progressCallback) {
		const timestampLabel = 'metadata.findMetaDataForFilenames';
		this.logger.timeStart(timestampLabel);
		const filesFound = {};
		progressCallback([0, this.metadata.count, null]);
		for (const group of this.metadata.data) {
			for (const file of group) {
				if (filesFound.hasOwnProperty(file.name)) {
					filesFound[file.name] = file;
					if (filenames.length == filesFound.entries().length) {
						return filesFound;
					}
				}
			}
		}
		this.logger.timeEnd(timestampLabel);
		return filesFound;
	}

	/**
	 * Constructs and executes a GET call to search Amazon's Photo API
	 * @param {Object} page sets how far from the beginning of the photos list to pull from. Since we can only get 200 photos at a time
	 */
	async mimicSearchRequest(page) {
		try {
			let url = AMAZON_SEARCH_URL;
			url += Date.now().toString();
			url = url.replace('&limit=1', '&limit=200');
			if (page > 0) {
				url = url.replace('&tempLink=false', `&tempLink=false&offset=${200 * page}`);
			}
			this.logger.info(url);
			return await got.get(url, {
				headers: this.headers
			}).json();
		} catch (ex) {
			this.logger.error(ex);
			return ex;
		}
	}

	reportFilesNotFound(filenames, foundFiles) {
		for (const filename of filenames) {
			if (foundFiles[filename] == null) {
				this.logger.warn(`${filename} was not found`);
			}
		}
	}

	setHeaders(headers) {
		this.headers = headers;
	}

};
