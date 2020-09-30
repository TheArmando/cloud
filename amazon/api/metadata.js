/**
 * Returns an object representing the headers that were used to query Amazon's photos API
 * @param {Object} cdpRequestDataRaw returned from setupLoggingOfAllNetworkData(...)
 *
 */
const loadHeaders = (cdpRequestDataRaw) => {
  const headers = {};
  // Parse through to get some of that good headers
  for (const [requestID, entry] of Object.entries(cdpRequestDataRaw)) {
    if (entry['Network.requestWillBeSent'] && entry['Network.requestWillBeSent']['request']['url'].startsWith('https://www.amazon.com/drive/v1/search')) {
      const h = entry['Network.requestWillBeSentExtraInfo']['headers'];
      for (const [header, value] of Object.entries(h)) {
        // Only save valid headers
        if (!header.startsWith(':')) {
          headers[header] = value;
        }
      }
    }
  }
  fs.writeFileSync('./headers.json', JSON.stringify(headers, null, 4)); // TODO only for testing
  return headers;
}

/**
 * Retrieves metadata for all the photos in the account
 * This data is used to show what files are available and to easily download or delete specific files
 * @param {Object} headers
 */
const getAllFileMetaData = async (headers) => {
  console.time('metadata');
  let done = false;
  let numberOfFiles;
  let page = 0;
  let data = [];
  do {
    const { body } = await mimicSearchRequest(page, headers);
    // fs.writeFileSync('./captured-response-' + page + '.json', body);
    payload = JSON.parse(body);
    data.push(payload.data);
    numberOfFiles = payload.count;
    page += 1;
    if (payload.data.length == 0) {
      done = true;
    }
  } while (!done);
  fs.writeFileSync('./all-metadata.json', JSON.stringify({ data: data, count: numberOfFiles}, null, 4));
  console.log(console.timeEnd('metadata'));
  // Old code snippet that would scroll down to attempt to trigger all the requests
  // hella slow... if revisiting this implementation look into using the newly added mouse.wheel function
  // let oC = 0;
  // while (stillRecievingFiles.well(counter)) {
  //   if (oC != counter) {
  //     oC = counter;
  //     console.log(counter);
  //   }
  //   page.keyboard.press('PageDown');
  //   // page.mouse.wheel({ y: 100 });
  //   await sleep(1);
  // }

  // const stillRecievingFiles = {
  //   currentCount: 0,
  //   tries: 0,
  //   well: (counter) => {
  //     if (stillRecievingFiles.currentCount == counter) {
  //       stillRecievingFiles.tries += 1;
  //     } else {
  //       stillRecievingFiles.tries = 0;
  //     }
  //     if (stillRecievingFiles.tries == 320 * 25) {
  //       console.log('No change in payload number detected....')
  //       return false;
  //     }
  //     stillRecievingFiles.currentCount = counter;
  //     return true;
  //   }
  // };
}

/**
 * Constructs and executes a GET call to search Amazon's Photo API
 * @param {Object} page sets how far from the beginning of the photos list to pull from. Since we can only get 200 photos at a time
 * @param {Object} headers
 */
const mimicSearchRequest = (page, headers) => {
  let url = 'https://www.amazon.com/drive/v1/search?asset=NONE&filters=type%3A(PHOTOS+OR+VIDEOS)&limit=1&searchContext=customer&sort=%5B%27contentProperties.contentDate+DESC%27%5D&tempLink=false&resourceVersion=V2&ContentType=JSON&_='
  url += Date.now().toString();
  url = url.replace('&limit=1', '&limit=200');
  if (page > 0) {
    url = url.replace('&tempLink=false', '&tempLink=false&offset=' + 200 * page);
  }
  return got.get(url, {
        headers: headers,
        responseType: 'json',
        resolveBodyOnly: true,
    });
}