const { Command } = require('commander');
const program = new Command();

const Amazon = require('./amazon/amazon.js');
const encoder = require('./conversion/encode.js');
const decoder = require('./conversion/decode.js');
const { decode } = require('jpeg-js');

const app = {};

const main = async () => {
    program
        .option('-d, --download <name.photo.extention...>', 'download photos from Amazon via provided filenames')
        .option('-l, --list', 'lists all files')
        .option('-r, --reset', 'resets file cache')
        .option('-u, --upload <name.photo.extention...>', 'upload photos via provided filenames')
        .option('-xd, --delete <name.photo.extention...>', 'delete photos on Amazon via provided filenames')
        .option('-s --safe-mode', 'used for development')
    
    await program.parseAsync(process.argv);
    const args = program.opts();

    app.safe = (program.s ? true : false);
    app.amazon = new Amazon(app.safe);

    if (program.reset) await goReset();
    if (program.download) await goDownload(args.download);
    if (program.list) await listAllPhotos();
    if (program.upload) await goUpload(args.upload);
    // if (program.delete) TBD

}


const goReset = async () => {};

const goDownload = async (files) => {
    if (app.safe) {
        await app.amazon.init();
    }
    for (file of files) {
        photos = app.amazon.findAllPhotosWithFilename(files);
        await app.amazon.downloadPhotos(photos);
        photopaths = photos.map(photo => './downloads/'+photo);
        await decoder.convertImagesToFileWithFilename(photopaths, './downloads/'+file)
    }
};

const listAllPhotos = async () => {};

const goUpload = async (files) => {
    if (app.safe) {
        await app.amazon.init();
    }
    const filePaths = files.map(filepath => './uploads/'+filepath);
    const indices = {}
    for (file of files) {
        indices[file] = 0;
        await encoder.convertFilesToImages(filePaths, (i) => indices[file] = i);
        const photopaths = [];
        for (i = 0; i < indices[file]; i++) {
            photopaths.push('./uploads/'+filepath+'-'+i+'.png');
        }
    }
    
    await app.amazon.uploadPhotos(photopaths);
};

main();