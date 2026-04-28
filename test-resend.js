const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
env.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].replace(/\r$/, '').replace(/^"(.*)"$/, '$1');
});

const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function testResend() {
  try {
    const data = await resend.emails.send({
      from: 'SSLDUCK <members@sslduck.net>',
      to: 'fastboomer@gmail.com', // sending a test email to the user!
      subject: 'Test Resend API',
      html: '<h1>Hello</h1>'
    });
    console.log(data);
  } catch(e) {
    console.error("Resend Error:", e);
  }
}
testResend();
