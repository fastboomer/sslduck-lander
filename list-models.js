const apiKey = 'AIzaSyA0mWgmLpXFshAzKCVkA7wnqJIhsY2SSH4';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

fetch(url)
    .then(res => res.json())
    .then(json => {
        if (json.models) {
            console.log('✅ Models available:', json.models.map(m => m.name));
        } else {
            console.error('❌ Failed to list models:', json);
        }
    })
    .catch(err => console.error('❌ Fetch error:', err));
