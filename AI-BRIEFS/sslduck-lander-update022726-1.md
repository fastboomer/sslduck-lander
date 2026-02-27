# SSLDUCK Lander (A/B Test A - Glo) Update
Date: 02/27/2026

## Summary of Changes Made to Resolve Issues on `sslduck-lander.vercel.app`

1. **Persona Update (Glo)**: 
   - Cleaned all hardcoded "Ed" references throughout the `GloLiveHub.tsx` and `GapIntake.tsx` components.
   - Updated the initial AI system prompt (`useGeminiLive.ts`) and TTS voice configuration (now explicitly using Gemini TTS "Erinome" for Glo's intro).
   - Removed duplicate files (`GloLiveHub_ed.tsx`, `useGeminiLive_ed.ts`) which were causing compiler conflicts and OOM memory errors on Vercel.

2. **API and Deployment Fixes (500 Server Error)**:
   - Diagnosed and resolved the `EROFS: read-only file system` error crashing the backend on Vercel when starting the audit. This was caused by the server trying to log or write directly to the local disk instead of `/tmp`.
   - Cleared the massive `.next/` cache from the git repository history and added `.next/` to `.gitignore`. This fixed a stuck `git push` issue that had frozen git operations.

3. **Audio and Comms (Microphone UI and TTS)**:
   - Switched from the browser's native `SpeechSynthesis` API to `playGeminiLiveTTS` logic to use native Gemini Live audio models for Glo's intro.
   - Replaced a cryptic "Permission Denied" text error with visible, step-by-step UI instructions asking the user to click their browser's address bar lock icon to directly unblock their microphone.
   - Updated the Gemini Multimodal Live API logic to fully connect when "Launch AI Link" is pressed.

**Conclusion**: Test A (Glo) is fully operational and deployed to production.
