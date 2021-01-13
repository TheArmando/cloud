const Photos = require('./photos.js');

test('upload a single photo', async () => {
    const mockedFileChooser = {
            accept: jest.fn().mockResolvedValue(null),
    };
    const resolveFileChooser = jest.fn().mockResolvedValue(mockedFileChooser);
    const mockedEvalPrimary = jest.fn().mockImplementation(() => {
        return {
            evaluate: jest.fn().mockResolvedValue(null),
        }
    });
    const mockedEvalQueueText = jest.fn().mockImplementation(() => {
        return {
            $: mockedEvalPrimary,
        };
    });

    const mockedPage = {
        url: 'https://www.amazon.com/photos/all',
        goto: jest.fn().mockResolvedValue(null),
        click: jest.fn().mockResolvedValue(null),
        waitFor: jest.fn().mockResolvedValue(null),
        waitForFileChooser: resolveFileChooser,
        $: mockedEvalQueueText,
        isClosed: jest.fn().mockReturnValue(false),
    };


    const photos = new Photos(mockedPage, true);
    const mockCallback = jest.fn();

    await photos.upload('./test.png', mockCallback);

    expect(mockedPage.goto.mock.calls.length).toBe(0);
    expect(mockedPage.click.mock.calls.length).toBe(2);
    expect(mockedPage.click.mock.calls[0][0]).toBe('.toggle');
    expect(mockedPage.click.mock.calls[1][0]).toBe('.upload-files-link');
    expect(mockedPage.waitFor.mock.calls.length).toBe(1);
    expect(mockedPage.waitFor.mock.calls[0][0]).toBe('.expandable-nav.add-button.open');
    expect(mockedPage.waitForFileChooser.mock.calls.length).toBe(1);
    expect(mockedPage.$.mock.calls.length).toBe(2);
    expect(mockedPage.$.mock.calls[0][0]).toBe('.queue-text');
    expect(mockedPage.$.mock.calls[1][0]).toBe('.uploader-complete');
    expect(mockedPage.isClosed.mock.calls.length).toBe(1);
});