const { Command } = require('commander');
const program = new Command();

const Amazon = require('./amazon/amazon.js');
const encoder = require('./converter/encode.js');
const decoder = require('./converter/decode.js');
const { decode } = require('jpeg-js');
const Logger = require('./logger/logger.js');

const app = {};

(async () => {
    program
        .option('-d, --download <name.photo.extention...>', 'download photos from Amazon via provided filenames')
        .option('-l, --list', 'lists all files')
        .option('-r, --reset', 'resets file cache')
        .option('-u, --upload <name.photo.extention...>', 'upload photos via provided filenames')
        .option('-xd, --delete <name.photo.extention...>', 'delete photos on Amazon via provided filenames')
        .option('-s --safe-mode', 'used for development'); 
    
    await program.parseAsync(process.argv);
    const parameters = program.opts();

    app.safe = (program.s ? true : false);
    app.logger = new Logger(app.safe);
    app.amazon = new Amazon(app.logger);

    if (program.reset) await goReset();
    if (program.download) await goDownload(parameters.download);
    if (program.list) await listAllPhotos();
    if (program.upload) await goUpload(parameters.upload);
    // if (program.delete) TBD

})();

// TODO: 
const goReset = async () => {
    // await app.amazon.resetMetadata((x) => console.log(x));
    // console.log('done reset');
};

const goDownload = async (files) => {
    if (app.safe) {
        await app.amazon.init(); // ???? wtf
    }
    for (let file of files) {
        // photos = app.amazon.findAllPhotosWithFilename(files);
        await app.amazon.downloadPhotos(file);
        photopaths = photos.map(photo => './downloads/'+photo);
        await decoder.convertImagesToFileWithFilename(photopaths, './downloads/'+file);
    }
};

// TODO: 
const listAllPhotos = async () => {};

const goUpload = async (files) => {
    if (app.safe) {
        await app.amazon.init();
    }
    const filePaths = files.map(filepath => './uploads/'+filepath);
    const indices = {};
    for (let file of files) {
        indices[file] = 0;
        await encoder.convertFilesToImages(filePaths, (i) => indices[file] = i);
        const photopaths = [];
        for (i = 0; i < indices[file]; i++) {
            photopaths.push('./uploads/'+filepath+'-'+i+'.png');
        }
    }
    
    await app.amazon.uploadPhotos(photopaths);
};
