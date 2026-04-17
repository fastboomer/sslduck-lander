require('dotenv').config({path: '.env.local'});
const WebSocket = require('ws');
global.WebSocket = WebSocket;

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;
const liveUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
const ws = new WebSocket(liveUrl);

ws.on('open', () => {
    console.log('WS Open');
    ws.send(JSON.stringify({
        setup: {
            model: 'models/gemini-2.5-flash-native-audio-latest',
        }
    }));
});
ws.on('message', (data) => {
    const response = JSON.parse(data.toString());
    if (response.setupComplete) {
        console.log('Setup complete, sending text...');
        ws.send(JSON.stringify({
            clientContent: {
                turns: [{ role: 'user', parts: [{ text: "Hello world" }] }],
                turnComplete: true
            }
        }));
    }
    const serverContent = response.serverContent || response.server_content;
    if (serverContent) {
        if (serverContent.turnComplete) {
            console.log('Turn complete!');
            process.exit(0);
        }
    }
});
