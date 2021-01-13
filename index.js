const { Command } = require('commander');
const program = new Command();

const main = async () => {
    program
        .option('-d, --download <name.photo.extention...>', 'download photos from Amazon via provided filenames')
        .option('-l, --list', 'lists all files')
        .option('-r, --reset', 'resets file cache')
        .option('-u, --upload <name.photo.extention...>', 'upload photos via provided filenames')
        .option('-xd, --delete <name.photo.extention...>', 'delete photos on Amazon via provided filenames')
    
    await program.parseAsync(process.argv);
    const args = program.opts();
    
    if (program.reset) await goReset();
    if (program.download) await goDownload(args.download);
    if (program.list) await listAllAmazonPhotos(metadata);
    if (program.upload) await goUpload(args.upload);
    // if (program.delete) TBD

}

main();