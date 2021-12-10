const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, prettyPrint } = format;

const WORKING_DIR = './runtime/logs/';
const LOG_FILE_EXTENSION = '.log';

module.exports = class Logger {
    constructor(isDebug) {
        this.isDebug = isDebug;
        this.logger = createLogger({
            level: 'info',
            format: combine(
                // label({ label:  }),
                timestamp(),
                prettyPrint(),
            ),
            defaultMeta: { service: 'encoder' },
            transports: [
                new transports.File({
                    filename: WORKING_DIR + 'errors' + LOG_FILE_EXTENSION,
                    level: 'error'
                }),
                new transports.File({
                    filename: WORKING_DIR + 'everything' + LOG_FILE_EXTENSION,
                }),
            ]
        });
    }

    child(options) {
        return this.logger.child(options);
    }

    debug(...params) {
        if (this.isDebug) {
            this.logger.info(params);
            console.log('debug', params);
        }
    }

    error(...params) {
        this.logger.error(params);
        if (this.isDebug) {
            console.error('error', params);
        }
    }

    info(...params) {
        this.logger.info(params);
        if (this.isDebug) {
            console.info('info', params);
        }
    }

    warn(...params) {
        this.logger.warn(params);
        if (this.isDebug) {
            console.warn('warn', params);
        }
    }

    startTimer() {
        return this.logger.startTimer();
    }

    // Addon function to mimic the console.time(...) functionality
    timeStart(name) {
        this[name] = this.logger.startTimer();
        if (this.isDebug) {
            console.time(name);
        }
    }

    // Addon function to mimic the console.timeEnd(...) functionality
    timeEnd(name) {
        this[name].done();
        if (this.isDebug) {
            console.timeEnd(name);
        }
    }
}