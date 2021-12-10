// This was a dumb idea, just use a database
/**
 * Keeps records of file to photo conversions to help with photo retrieval and conversion back to files
 * current runs syncronously handling one file at a time. This should be rewritten around an async so that multiple files can be handled at a given time
 */

const fs = require('fs');
const {createHash} = require('crypto');
const path = require('path');

// TODO: pass this from a configuration file
const LEDGER_WORKING_DIRECTORY = './';
const LEDGER_FILE_NAME = 'dev-ledger.json'; 
const LEDGER_FILE_PATH = LEDGER_WORKING_DIRECTORY + LEDGER_FILE_NAME;

const ERROR_NO_ACTIVE_FILE = 'no filename provided. use select(...) to set a file';

class Ledger {
    constructor(logger) {
        this.logger = logger.child({ module: 'ledger' });
        this.ledger = this.loadLedger();
    }

    hasActiveRecord() { return this.current != null; }

    hasConversions() { return this.hasActiveRecord() && this.ledger[this.current].conversion != null; }

    // hasUploaded(filename) {
    //     return this.hasActiveRecord() && this.ledger[this.current].upload != null;
    // }

    loadLedger() {
        if (fs.existsSync(LEDGER_FILE_PATH)) {
            this.ledger = JSON.parse(fs.readFileSync(LEDGER_FILE_PATH));
        }
        this.logger.warn('creating new ledger file', LEDGER_FILE_PATH);
        fs.writeFileSync(LEDGER_FILE_PATH, {}, 'utf8');
        this.ledger = {};
    }

    getConversions() {
        if (this.hasActiveRecord() && this.hasConversions()) { return this.ledger[this.current].conversion; }
        return {};
    }

    getEntryFor(filename) { return this.ledger[filename]; }

    select(filename) { 
        this.current = filename;
        if (!this.ledger[this.current]) {
            this.ledger[this.current] = { filename: filename };
        } 
    }

    recordConversion(newFilepath) {
        if (this.hasActiveRecord()) { throw ERROR_NO_ACTIVE_FILE; }
        if (!this.hasConversions()) { this.ledger[this.current].conversion = []; }
        previousConversion = this.ledger[this.current].conversion;
        const newFile = {
            filename: path.basename(newFilepath),
            sha256: computeSHA256(newFilepath),
        };
        // previousConversion.push(newFile);
        this.commitEntry();
    }

    commitLedger() {
        fs.writeFileSync(LEDGER_FILE_PATH, this.ledger, 'utf8');
    }

}

// credit: https://stackoverflow.com/a/55223767
const computeSHA256 = (filepath) => {
    const hash = createHash('sha256');
    const file = fs.readFileSync(filepath, { encoding: 'utf8' });
    hash.write(file);
    return hash.digest('base64'); // returns hash as string
};