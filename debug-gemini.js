
const { google } = require('@ai-sdk/google');
const { generateText } = require('ai');

async function test() {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'AIzaSyCYhZAXaX6yjDvhJC9uOUBf30Wh4o7T3FU';

    try {
        console.log("Testing Gemini 1.5 Flash...");
        const response = await generateText({
            model: google('gemini-1.5-flash'),
            prompt: 'Hello, are you there?',
        });
        console.log("Response:", response.text);
    } catch (err) {
        console.error("Gemini Test Failed:");
        console.error(JSON.stringify(err, null, 2));
        if (err.data) console.error("Error Data:", JSON.stringify(err.data, null, 2));
        if (err.message) console.error("Error Message:", err.message);
    }
}

test();
