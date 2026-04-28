const { generateText } = require('ai');
const { anthropic } = require('@ai-sdk/anthropic');

async function test() {
    try {
        console.log("Starting test...");
        const response = await generateText({
            model: anthropic('claude-3-5-sonnet-20240620'),
            prompt: 'test',
        });
        console.log("Success! Text:", response.text);
    } catch (e) {
        console.error("Test failed!");
        console.error("Error instance of:", e.constructor.name);
        console.error("Message:", e.message);
        console.error("Full object:", JSON.stringify(e, null, 2));
    }
}
test();
