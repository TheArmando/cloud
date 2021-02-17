const got = require('got');
const stream = require('stream');
const {promisify} = require('util');
const pipeline = promisify(stream.pipeline);

// Requires the file id as $1 and owner id as $2 
const AMAZON_DOWNLOAD_URL = 'https://www.amazon.com/drive/v1/nodes/$1/contentRedirection?querySuffix=%3Fdownload%3Dtrue&ownerId=$2';
// URL to request batch downloads
const AMAZON_BATCH_DOWNLOAD_REQUEST = 'https://www.amazon.com/drive/v1/batchLink';
// common query params that are used on a couple of network requests during the batch download
const AMAZON_BATCH_DOWNLOAD_SUFFIX = '?resourceVersion=V2&ContentType=JSON&_='

const generateDownloadLink = (fileId, ownerId) => {
    let specificDownloadUrl = AMAZON_DOWNLOAD_URL.replace('$1', fileId);
    return specificDownloadUrl.replace('$2', ownerId);
}

// TODO: change this to stream the data into a pipeline
const fetch = async (headers, filename, fileId, ownerId, downloadStatusCallback) => {
    const downloadLink = generateDownloadLink(fileId, ownerId);
    await pipeline(got.stream(downloadLink, {
        headers
    }).on('downloadProgress', progress => {
        downloadStatusCallback(progress);
    }),
        fs.createWriteStream('./downloads/'+filename)
    );
}

const fetchBatch = async (headers, zipname, fileAndOwnerIds, downloadProgressCallback) => {  
    responseFromAmazon = await requestZipArchive(headers, fileAndOwnerIds);
    // await doMiscRequests(headers);
    await downloadZip(responseFromAmazon.links.content, zipname, downloadProgressCallback);
};

const requestZipArchive = async (headers, fileAndOwnerIds) => {
    // never set target to headers, it will change the original object
    // Object.assign(target, source);
    const batchRequestHeaders = {
        'authority': 'www.amazon.com',
        'origin': 'www.amazon.com',
        'ect': '4g',
        'downlink': '10g',
        'rtt': '50'
    };

    Object.assign(batchRequestHeaders, headers)
    // console.log(batchRequestHeaders);
    // console.log(generateBatchDownloadRequestPayload(ownerID, fileIds));
    // console.log(headers);
    
    const currentTimestamp = Date.now();
    // let temporaryBatchDownloadURL = null;
    // Should respond with a 201 and payload containing download URL
    response = await got.post(AMAZON_BATCH_DOWNLOAD_REQUEST, {
        headers: batchRequestHeaders,
        json: generateRequestBodyForZipArchive(fileAndOwnerIds),
        responseType: 'json'
    });
    // const responseBody = response.body;
    console.log(response.statusCode);
    console.log(response.body);
    if (currentTimestamp > response.body.expires) {
        console.error('download link expired ', response.body.expires);
    }
    if (response.body.status != 'AVAILABLE') {
        console.error('unexpected status in response body', response.body.status);
    }

    return response.body;
};

  // creates first download request when trying to download multiple files
const generateRequestBodyForZipArchive = (fileAndOwnerIds) => {
    const payload = {
      nodeIds: [],
      resourceVersion: 'V2',
      ContentType: 'JSON'
    };
    for (const o of fileAndOwnerIds) {
      payload.nodeIds.push(o.ownerId+':'+o.fileId);
    }
    return payload;
  };

const doMiscellaneousRequests = async (headers) => {
    const optionsRequestHeaders = {
        'authority': 'content-na.drive.amazonaws.com',
        'accept': '*/*',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'en-US,en;q=0.9',
        'access-control-request-headers': 'accept-language,content-type,x-amzn-sessionid,x-requested-with',
    'access-control-request-method': 'HEAD',
        'user-agent': headers['user-agent'],
        'origin': 'https://www.amazon.com',
        'referer': 'https://www.amazon.com/',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site'
        };
        const headRequestHeaders = {
        'authority': 'content-na.drive.amazonaws.com',
        'accept': 'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'en_US',
        'content-type': 'application/json',
        'origin': 'https://www.amazon.com',
        'referer': 'https://www.amazon.com/',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        'x-amzn-sessionid': headers['x-amzn-sessionid'],
        'user-agent': headers['user-agent'],
        'x-requested-with': 'XMLHttpRequest'
        };

    // Might want to do these to not alarm any monitors for abnormal behavior...
    try {
      const url = temporaryBatchDownloadURL+AMAZON_BATCH_DOWNLOAD_SUFFIX+currentTimestamp.toString();
      const responseFromOptionsToProvidedURL = await got(url, { headers: optionsRequestHeaders, method: 'OPTIONS' });
      console.log(responseFromOptionsToProvidedURL.statusCode);
    } catch (error) {
      // console.error('error while doing OPTIONS batch call');
      console.error(error.options);
    
    }

    try {
      const url = temporaryBatchDownloadURL+AMAZON_BATCH_DOWNLOAD_SUFFIX+currentTimestamp.toString();
      const responseFromHeadToProvidedURL = await got(url, { headers: headRequestHeaders, method: 'HEAD' });
      console.log(responseFromHeadToProvidedURL.statusCode);
    } catch (error) {
      // console.error('error while doing HEAD batch call');
      console.error(error.options);
    }
}

const downloadZip = async (url, zipname, downloadStatusCallback) => {
    const batchDownloadHeaders = {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'accept-language': 'en-US,en;q=0.9',
        'sec-fetch-dest': 'iframe',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'cross-site',
        'upgrade-insecure-requests': '1',
        'authority': 'content-na.drive.amazonaws.com',
        'referer': 'https://www.amazon.com/'
      };
    
      try {
        await pipeline(got.stream(url, {
              headers: batchDownloadHeaders,
          }).on('downloadProgress', progress => { downloadStatusCallback(progress) }),
              fs.createWriteStream('./' + zipname));
      } catch (error) {
        console.log(error.options);
      }
  
}

module.exports = {
  fetch,
  fetchBatch
};