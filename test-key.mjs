import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testKey() {
    try {
        const { text } = await generateText({
            model: google('gemini-1.5-flash'),
            prompt: 'Hello, are you working?',
        });
        console.log('Gemini Response:', text);
        console.log('✅ API Key is working!');
    } catch (error) {
        console.error('❌ API Key failed:', error);
    }
}

testKey();
