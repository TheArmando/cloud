module.exports = class MockLogger {
  constructor() {}
  child(options) {
      return this;
  }
  error(...params) {}
  info(...params) {}
  startTimer() {
      return {
          done: () => {},
      };
  }
  timeStart() {}
  timeEnd() {}
};