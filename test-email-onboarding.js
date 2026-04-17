const { Resend } = require('resend');
const resend = new Resend('re_cQ9jEVtZ_FYjQdGLwZTCrTYo6da6kTsUq');

async function run() {
    try {
        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: ['glenn@sslduck.net'],
            subject: 'Test Resend API',
            html: '<p>Testing Resend API capability.</p>'
        });
        if (error) {
            console.error('CRITICAL ERROR From Resend:', error);
        } else {
            console.log('SUCCESS, Email sent!', data);
        }
    } catch(e) {
        console.error('Exception caught:', e);
    }
}
run();
