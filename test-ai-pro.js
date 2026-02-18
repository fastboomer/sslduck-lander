
const { google } = require('@ai-sdk/google');
const { generateText } = require('ai');

async function testAI() {
    try {
        console.log("Model: gemini-1.5-pro");
        const { text } = await generateText({
            model: google('gemini-1.5-pro'),
            prompt: "Say hello.",
        });
        console.log("AI Response:", text);
    } catch (e) {
        console.error("AI Test failed:", e.message);
    }
}

testAI();
