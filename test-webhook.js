
async function testWebhook() {
    const webhookUrl = 'https://script.google.com/macros/s/AKfycbztlk4VOMWB8A6Wh_IUobjZ5dho_KYp-EgtLTE-mWogE26FNjmKzM8C1vxqpHqcMvLb/exec';

    const payload = {
        name: "Test Candidate",
        jobLink: "Test Job",
        styledReport: "<h1>Test Report</h1><p>This is a test of the GAP analysis webhook.</p>"
    };

    console.log("Sending payload to webhook...");
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });
        console.log("Status:", response.status);
        const text = await response.text();
        console.log("Response Text:", text);
    } catch (err) {
        console.error("Webhook test failed:", err);
    }
}

testWebhook();
