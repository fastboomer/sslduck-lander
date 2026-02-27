# Migration Guide for A/B Test B (Ed on sslduck-lander1)

This brief documents the critical fixes made on the A-Test (`sslduck-lander`) that MUST be replicated in the B-Test codebase (`sslduck-lander1`) by the AI handling that thread. The goal is to avoid repeating the "2 Days of Agony" debugging communication problems and API crashes.

**If you are the AI reading this on the `sslduck-lander1` thread, follow these steps precisely:**

### 1. Fix the 500 Vercel Server Crash (FileSystem Write Error)
- **The Problem:** The `gap-analysis/process` API endpoint on Vercel crashed with an `EROFS: read-only file system` error.
- **The Fix:** Ensure that absolutely ALL file-writing operations in backend API routes (e.g., generating DOCX, PDF parsing, or logging files like `debug-api-log.txt`) are written to `os.tmpdir()` and NOT to the root project directory (`process.cwd()`). Do a full codebase search for `fs.writeFileSync` to guarantee nothing writes outside `/tmp`.

### 2. Live Audio Dropdown and Permissions
- **The Problem:** Users whose microphones were natively blocked by their browser saw cryptic permission errors, and the dropdown list of mics would not populate correctly. 
- **The Fix:** 
  - Update `GloLiveHub.tsx` (or your equivalent `EdLiveHub.tsx` component) to explicitly trap `NotAllowedError`. 
  - Display clear, step-by-step instructions in the UI telling the user: "Click the 🔒 lock icon in the browser address bar. Change Microphone to Allow. Refresh the page." (Do NOT assume you can automatically unblock the mic from the code).

### 3. Native TTS (Instead of Web Audio API)
- **The Problem:** The initial "Intro" robotic voice was using `window.speechSynthesis`.
- **The Fix:** We implemented a `playGeminiLiveTTS` helper function in the frontend that opens a direct Websocket to `wss://generativelanguage.googleapis.com/...` using a predefined Gemini Multimodal model `models/gemini-2.5-flash-native-audio-latest`. 
- **Note for Test B:** You must implement this same direct TTS logic for Ed's intro video overlay, using a male voice (e.g., "Charon" or the "Ed" voice).

### 4. Vercel Deployment OOM and Caching
- **The Problem:** Vercel builds were stalling or running out of memory (JavaScript heap out of memory / OOM 137 exit code) or Git was refusing to push data because it was 200MB+.
- **The Fix:** Check the `.gitignore` immediately to ensure `.next/` is present. If there are duplicate backup files (`_ed.tsx`, `_glo.tsx`), delete them. The Next.js TS compiler will crash attempting to parse redundant conflicting modules in the tree. 

### What to DO Next for Test B (Ed):
1. **Ensure the Name Change:** Switch references in the `sslduck-lander1` context to "Ed", and use an appropriate male actor avatar image instead of Glo.
2. **Setup the Voice Tests:** Prepare to swap/test between the "Ed" native Gemini voice and the "Charon" voice, as requested by the user, inside your newly migrated `playGeminiLiveTTS` function call.
