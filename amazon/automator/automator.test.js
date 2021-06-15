
// functions to test
// authenticate()
// getHeaders()
// uploadPhotos(...filenames)

const Automator = require('./automator.js');

test('login', async () => {
  const mockedLogger = {
    child: jest.fn().mockImplementation(() => {
        return mockedLogger;
    }),
    error: jest.fn().mockReturnValue(null),
    timeStart: jest.fn().mockReturnValue(null),
    timeEnd: jest.fn().mockReturnValue(null),
    warn: jest.fn().mockReturnValue(null),
  };

  const automator = new Automator(mockedLogger, true);

  await automator.init();
  await automator.authenticate();
});