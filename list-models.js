const fs = require('fs');
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;
if (!apiKey) {
    console.error("❌ Error: Set GOOGLE_GENERATIVE_AI_API_KEY environment variable.");
    process.exit(1);
}
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

fetch(url)
    .then(res => res.json())
    .then(json => {
        if (json.models) {
            const bidiModels = json.models
                .filter(m => m.supportedGenerationMethods.includes('bidiGenerateContent'))
                .map(m => m.name);
            console.log('BIDI_MODELS:', JSON.stringify(bidiModels));
        }
    })
    .catch(err => console.error('❌ Fetch error:', err));
