# Phase 2: Glo Interactive Voice - Strategy & Technical Advice

This document outlines the strategic approach and technical recommendations for implementing Glo, the interactive AI assistant, on the SSLDUCK-LANDER success page.

## User Review Required

> [!IMPORTANT]
> **Gemini 3.1 Pro Integration**: Since Gemini 3.1 Pro was released yesterday (Feb 19, 2026), we should leverage its advanced reasoning to ensure Glo accurately evaluates resumes against job descriptions with "shocking" precision.
>
> **Voice Selection**: You mentioned a preference for ElevenLabs. While ElevenLabs offers premium quality, using Gemini's native Multimodal Live voices (Expressive/Real-time) will result in significantly lower latency (~500ms vs ~1500-2000ms with ElevenLabs). We should decide if "Voice Character" or "Response Speed" is the priority for the "Shock Value."

## Visual Strategy & Lip-Sync Assessment

> [!CAUTION]
> **The "Low Rent" Risk**: Achieving *flawless* sub-second lip-sync on a real-time AI stream is the "Holy Grail" of 2026 tech. While APIs exist (Sync.so, Tavus), they introduce a third "hop" in the network which risks breaking the sub-second response time. A 100ms glitch in lip-sync looks "low rent"; a 1s delay in response loses the sale.

### Recommended Approach: "The Premium AI Interface"
Instead of a potential "glitchy deepfake," we will implement a high-end **System Interface**:
1.  **Background**: A stunning, ultra-high-res static image of Glo (or a subtle 4K cinemagraph loop of her breathing/blinking).
2.  **Foreground**: A fluid, "Apple Intelligence" style **Audio Aura** or **Dynamic Waveform** that pulses in perfect sync with Gemini's audio output.
3.  **Handoff**: We will transition seamlessly from the "captioned video" (Holly/Intro) to this high-end "Interactive Console."

**Why this wins**: It feels like a premium, state-of-the-art tech product (like Siri/Iron Man's JARVIS) rather than an attempt to fake a human. It ensures 100% reliability and zero "uncanny valley" discomfort.

## Technical Q&A and Advice (Updated)

### Q1: Tech Stack - Vapi vs. Custom Vercel/Firebase
**Recommendation**: **Custom Vercel/Firebase Implementation**

*   **Why?**: Vapi is excellent for rapid prototyping without code, but for a premium, integrated experience like SSLDUCK, a custom implementation gives us:
    1.  **Lower Latency**: Direct connection to Gemini Multimodal Live via WebSockets on Vercel Edge.
    2.  **Deeper Integration**: Glo can instantly "read" the report data directly from your Firestore database the moment the success page loads.
    3.  **Cost Efficiency**: You avoid the Vapi "middleman" fee, paying only for the LLM and TTS usage.
    4.  **No "Make" Lag**: Coded logic (Node.js/Next.js) is orders of magnitude faster than Make.io workflows for real-time processing.

### Q2: Latency Mitigation
To ensure Glo feels "real," we will implement the following:
*   **Multimodal Live API (Bidi)**: We will use the Gemini 2.0/3.0/3.1 Live WebSocket protocol. This allows Gemini to hear and respond in one stream, avoiding the STT -> LLM -> TTS sequential lag.
*   **Vercel Edge Functions**: Placing the "handshake" logic on the edge reduces physical distance to the user.
*   **ElevenLabs Optimization**: If we stick with ElevenLabs, we must use their **WebSockets API with Turbo v2.5** and the `pcm_44100` format to start audio playback before the full sentence is generated.

### Q3 & Q4: Model Versions & Switchability
*   **Thread Persistence**: In code, the "conversation history" is a data object. We can swap the model (e.g., from Gemini 3.0 Flash to Gemini 3.1 Pro) between turns without losing context, as long as we pass the existing history to the new model instance.
*   **Flexible Architecture**: I will design the program using a **Provider Pattern**. Switching models will be as simple as changing a value in your `.env` file (e.g., `LLM_MODEL=gemini-3.1-pro`). This prevents "code bloat" and allows for real-time latency testing.

## Business Context & Constraints
*   **Objective**: Conversion to Resume Customer.
*   **Constraint**: Glo is restricted to "Professional Profile" advice and ATS scoring. She will be instructed to stop short of writing the resume, creating a "pull" toward the paid service.
*   **Data Integrity**: Glo will rely 100% on the submitted resume and job description stored in Firebase. She will be prompted to ask clarifying questions rather than assuming skills.

### Q5: Steering & Constraint Management
Glo will be given a "Friendly Guardian" persona. If a user tries to steer her into writing a resume or getting off-track:
*   **Tactic**: "I'd love to help you with that deeper level of detail, but my current analysis is focused on your profile strategy. For a full-rewrite like that, Glenn's personal review is the way to go—I've already flagged your profile for him!"
*   **Time Limit**: An on-screen countdown timer will reinforce the "Premium/Limited" nature of her input.

## Proposed Implementation Steps (Pending Approval)

### 1. Database & Context Loading [NEW]
*   Create a server-side route to fetch the `reportId` data and prepare the "Context Injection" for Glo.

### 2. Live Hub Component [NEW] [file basename](file:///c:/Users/fasth/OneDrive/SSLDUCK/SSLDUCK-LANDER1/app/components/GloLiveHub.tsx)
*   A centralized React component to manage Mic permissions, WebSocket state, and voice visualization.

### 3. Latency Monitoring [NEW]
*   Internal "Ping" utility to measure round-trip time and suggest a "Low Latency" fallback (e.g., switching from Pro to Flash) if the user's connection is slow.

## Verification Plan

### Automated Tests
*   `npm run test-gemini-connection`: Verify WebSocket handshake with Gemini 3.1.
*   `npm run test-context-injection`: Ensure Glo receives the correct Resume/JD data.

### Manual Verification
*   **Latency Test**: Measure the time from "User stops speaking" to "Glo starts speaking." Goal: < 1.2 seconds.
*   **Constraint Test**: Try to trick Glo into writing a full resume and ensure she redirects to the paid service.
