const METADATA_FILENAME = 'all-metadata.json';
const AMAZON_SEARCH_URL = 'https://www.amazon.com/drive/v1/search?asset=NONE&filters=type%3A(PHOTOS+OR+VIDEOS)&limit=1&searchContext=customer&sort=%5B%27contentProperties.contentDate+DESC%27%5D&tempLink=false&resourceVersion=V2&ContentType=JSON&_=';

module.exports = class Metadata {
	constructor(headers, isDebug) {
		this.headers = headers;
		this.isDebug = isDebug;
		this.metadata = loadMetaDataFile();
	}

	/**
	 * Retrieves metadata for all the photos in the account
	 * This data is used to show what files are available and to easily download or delete specific files
	 * @param {*} progressCallback optional callback for the function to report the number of photos it has pulled metadata on
	 */
	async fetchAllFileMetaData(progressCallback) {
		console.time('Indexing time');
		if (progressCallback == null) {
			progressCallback = () => {};
		}
		let done = false;
		let numberOfFiles;
		let page = 0;
		const data = [];
		do {
			progressCallback(numberOfFiles);
			const payload = await this.#mimicSearchRequest(page);
			data.push(payload.data);
			numberOfFiles = payload.count;
			page += 1;
			if (payload.data.length == 0) {
				done = true;
			}
		} while (!done);
		fs.writeFileSync('./' + METADATA_FILENAME, JSON.stringify({ data, count: numberOfFiles }, null, 4));
		this.metadata = data;
		console.timeEnd('Indexing time');
	};

	findMetaDataForFilenames(filenames, progressCallback) {
		const foundFilesWithMetadata = {};
		for (const filename of filenames) {
			foundFilesWithMetadata[filename] = null;
		}
		foundFilesWithMetadata.count = 0;
		progressCallback([0, this.metadata.count, null]);
		for (const group of this.metadata.data) {
			for (const file of group) {
				if (foundFilesWithMetadata.hasOwnProperty(file.name)) {
					foundFilesWithMetadata[file.name] = file;
					foundFilesWithMetadata += 1;
					if (filenames.length == foundFilesWithMetadata.count) {
						return foundFilesWithMetadata;
					}
				}
			}
		}
		reportFilesNotFound(foundFilesWithMetadata, filenames);
		return foundFilesWithMetadata;
	};

	/**
	 * Constructs and executes a GET call to search Amazon's Photo API
	 * @param {Object} page sets how far from the beginning of the photos list to pull from. Since we can only get 200 photos at a time
	 */
	async #mimicSearchRequest(page) {
		let resp = {};
		try {
			let url = AMAZON_SEARCH_URL;
			url += Date.now().toString();
			url = url.replace('&limit=1', '&limit=200');
			if (page > 0) {
				url = url.replace('&tempLink=false', `&tempLink=false&offset=${200 * page}`);
			}
			resp = await got.get(url, {
				headers: this.headers
			}).json();
		} catch (error) {
			console.log(error.response);
			resp = error;
		}
		if (this.isDebug) {
			fs.writeFileSync('./dev-captured-response-' + page + '.json', JSON.stringify(resp));
		}
		return resp;
	};

	
}

const reportFilesNotFound = (foundFiles, filenames) => {
	for (const filename of filenames) {
		if (foundFiles[filename] == null) {
			console.warn(filename, ' was not found');
		}
	}
}

const loadMetaDataFile = () => {
	if (fs.existsSync('./' + METADATA_FILENAME)) {
	  return JSON.parse(fs.readFileSync('./' + METADATA_FILENAME, { encoding: 'utf8' }));
	} else {
	  console.log('local metadata file not found');
	}
  }