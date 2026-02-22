const fs = require('fs');
const apiKey = 'AIzaSyA0mWgmLpXFshAzKCVkA7wnqJIhsY2SSH4';
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
