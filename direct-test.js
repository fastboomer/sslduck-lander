const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;
if (!apiKey) {
    console.error("❌ Error: Set GOOGLE_GENERATIVE_AI_API_KEY environment variable.");
    process.exit(1);
}
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

const data = {
    contents: [{
        parts: [{ text: "Hello" }]
    }]
};

fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
})
    .then(res => res.json())
    .then(json => {
        if (json.candidates) {
            console.log('✅ API Key is working! Gemini says:', json.candidates[0].content.parts[0].text);
        } else {
            console.error('❌ API Key failed or returned error:', json);
        }
    })
    .catch(err => console.error('❌ Fetch error:', err));
