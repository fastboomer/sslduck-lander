const fs = require('fs');
const path = require('path');

// Try to load key from .env.local
let apiKey = '';
try {
    const env = fs.readFileSync('.env.local', 'utf8');
    const match = env.match(/NEXT_PUBLIC_GOOGLE_AI_API_KEY=(.*)/);
    if (match) apiKey = match[1].trim();
} catch (e) { }

if (!apiKey) {
    console.error('❌ No API key found in .env.local');
    process.exit(1);
}

console.log('Testing Key:', apiKey.substring(0, 5) + '...' + apiKey.substring(apiKey.length - 5));

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

fetch(url)
    .then(res => res.json())
    .then(json => {
        if (json.models) {
            console.log('✅ Key is valid!');
            const liveModels = json.models.filter(m => m.name.includes('flash'));
            console.log('Flash Models found:', liveModels.map(m => m.name));

            const expModel = json.models.find(m => m.name.includes('gemini-2.0-flash-exp'));
            if (expModel) {
                console.log('🚀 gemini-2.0-flash-exp is AVAILABLE');
            } else {
                console.warn('⚠️ gemini-2.0-flash-exp NOT found in list.');
            }
        } else {
            console.error('❌ API Key Error:', json);
        }
    })
    .catch(err => console.error('❌ Fetch error:', err));
