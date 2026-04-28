const fs = require('fs');

async function testUpload() {
  console.log("Starting test upload...");
  
  const formData = new FormData();
  
  // Create File for resume
  const resumeBlob = new Blob([fs.readFileSync('test_resume.txt')], { type: 'text/plain' });
  formData.append('resumes', resumeBlob, 'test_resume.txt');
  
  // Target job
  formData.append('reqText', `
EMPLOYER: BigTech Inc.
JOB TITLE: Senior Frontend Engineer
JOB DESCRIPTION:
We are looking for an experienced frontend engineer with 5+ years of React and Next.js experience.
You will lead our frontend transition and mentor junior developers.
  `);
  
  console.log("Sending POST to http://localhost:3000/api/gap-analysis/process...");
  
  const start = Date.now();
  try {
      const response = await fetch('http://localhost:3000/api/gap-analysis/process', {
        method: 'POST',
        body: formData,
      });
      console.log("Finished in " + (Date.now() - start) + "ms");
      console.log("Status:", response.status);
      const text = await response.text();
      console.log("Response Preview:", text.substring(0, 300));
  } catch(e) {
      console.error("Fetch failed:", e);
  }
}

testUpload();
