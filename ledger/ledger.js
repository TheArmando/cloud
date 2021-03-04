/**
 * Keeps records of file to photo conversions to help with photo retrieval and conversion back to files
 * current runs syncronously handling one file at a time. This should be rewritten around an async so that multiple files can be handled at a given time
 */

const fs = require('fs');

// TODO: pass this from a configuration file
const LEDGER_WORKING_DIRECTORY = './';
const LEDGER_FILE_NAME = 'dev-ledger.json'; 
const LEDGER_FILE_PATH = LEDGER_WORKING_DIRECTORY + LEDGER_FILE_NAME;

// const recordEntry = () => {};

class Ledger {
    constructor(logger) {
        this.logger = logger.child({ module: 'ledger' });
        this.ledger = this.loadLedger();
    }

    hasActiveRecord() { return this.current != null; }

    hasUploaded() {
        return this.hasActiveRecord() && this.ledger[this.current].upload != null;
    }

    loadLedger() {
        if (fs.existsSync(LEDGER_FILE_PATH)) {
            return fs.readFileSync(LEDGER_FILE_PATH);
        }
        this.logger.warn('creating new ledger file', LEDGER_FILE_PATH);
        fs.writeFileSync(LEDGER_FILE_PATH, {}, 'utf8');
        return {};
    }

    getEntryFor(filename) { return this.ledger[filename]; }

    select(filename) { 
        this.current = filename;
        if (!this.ledger[this.current]) {
            this.ledger[this.current] = { filename: filename };
        } 
    }

    // recordConversion(...newFile) { 
    //     previousConversion = this.ledger[this.current].conversion;
    //     if (!previousConversion) { previousConversion = {};  }
    //     previousConversion.
    // }

    // recordUpload(...transfer) {}
    
}
