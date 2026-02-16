
try {
    const pdf = require('pdf-parse');
    console.log("pdf-parse loaded successfully.");
} catch (err) {
    console.error("pdf-parse failed to load:", err.message);
}

try {
    const mammoth = require('mammoth');
    console.log("mammoth loaded successfully.");
} catch (err) {
    console.error("mammoth failed to load:", err.message);
}
