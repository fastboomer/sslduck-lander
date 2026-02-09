const apiKey = 'AIzaSyA0mWgmLpXFshAzKCVkA7wnqJIhsY2SSH4';
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
