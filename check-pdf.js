
try {
    const pdfParser = require('pdf-parse');
    console.log("Type of pdfParser:", typeof pdfParser);
    if (typeof pdfParser === 'function') {
        console.log("SUCCESS: pdfParser is a function.");
    } else {
        console.log("Keys of pdfParser:", Object.keys(pdfParser));
        // Check if any key is the function
        for (const key in pdfParser) {
            if (typeof pdfParser[key] === 'function') {
                console.log(`Found function at key: ${key}`);
            }
        }
    }
} catch (err) {
    console.error("Load failed:", err.message);
}
