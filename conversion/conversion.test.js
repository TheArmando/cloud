const fs = require('fs');
const encode = require('./encode.js');
const decode = require('./decode.js');
const buffer = require('buffer');

const data = 'In astronomy, reflection nebulae are clouds of interstellar dust which might reflect the light of a nearby star or stars. The energy from the nearby stars is insufficient to ionize the gas of the nebula to create an emission nebula, but is enough to give sufficient scattering to make the dust visible. Thus, the frequency spectrum shown by reflection nebulae is similar to that of the illuminating stars. Among the microscopic particles responsible for the scattering are carbon compounds (e. g. diamond dust) and compounds of other elements such as iron and nickel. The latter two are often aligned with the galactic magnetic field and cause the scattered light to be slightly polarized.'

const generateTestData = () => {
    if (fs.existsSync('./dev-test-file.txt')) {
        fs.unlinkSync('./dev-test-file.txt');
    }
    fs.writeFileSync('./dev-test-file.txt', data)
};

test('convert file to image and back again', async () => {
    generateTestData();

    await encode.convertFiles2Images('./dev-test-file.txt');
    await decode.convertImages2Files('dev-test-file.txt');

    const decodedFile = fs.readFileSync('./decoded-dev-test-file.txt', { encoding: 'utf8' });
    expect(decodedFile).toEqual(data);
});


test('convert data to image file and back to file', async () => {
    generateTestData();

    await encode.convertFile2Image('./dev-test-file.txt', buffer.Buffer.from(data), 0);
    await decode.convertImages2Files('dev-test-file.txt');

    const decodedFile = fs.readFileSync('./decoded-dev-test-file.txt', { encoding: 'utf8' });
    expect(decodedFile).toEqual(data);
});