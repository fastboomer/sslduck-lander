
const { extractTextFromFile } = require('./lib/gap-utils');
const fs = require('fs');

async function test() {
    // Create a dummy text file
    fs.writeFileSync('test.txt', 'This is a test resume.');

    try {
        // We'll simulate a File object if possible, or just test the logic
        // In Node, we don't have a global File object by default in older versions
        // but let's see if we can use a Blob or just mock it.

        console.log("Testing text extraction...");
        const content = fs.readFileSync('test.txt');
        const fileMock = {
            arrayBuffer: () => Promise.resolve(content),
            type: 'text/plain',
            name: 'test.txt'
        };

        const text = await extractTextFromFile(fileMock);
        console.log("Extracted:", text);

        // Try to test PDF if available
        if (fs.existsSync('test.pdf')) {
            const pdfContent = fs.readFileSync('test.pdf');
            const pdfMock = {
                arrayBuffer: () => Promise.resolve(pdfContent),
                type: 'application/pdf',
                name: 'test.pdf'
            };
            const pdfText = await extractTextFromFile(pdfMock);
            console.log("PDF Extracted length:", pdfText.length);
        }
    } catch (err) {
        console.error("Extraction Test Failed:");
        console.error(err);
    }
}

test();
