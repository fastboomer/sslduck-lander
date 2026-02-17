# Implementation Plan - Phase 2: Glo Interactive Voice

This plan covers the transition from traditional GAP analysis to the "shock-value" interactive experience with Glo.

## User Review Required

> [!IMPORTANT]
> **Browser Audio Restrictions**: Modern browsers (Chrome, Safari, etc.) strictly forbid "un-muted autoplay" unless the user has interacted with the page first. We must ensure a click event happens *before* Holly's video with sound fires.
> 
> **Microphone Permissions**: The browser will always prompt the user for microphone access. To avoid "Glo" standing there awkwardly while the user looks for the "Allow" button, we will implement a "Pre-flight Check".

## Proposed Architecture

### 1. Video Hand-off Logic
- **Transition States**: `IDLE` -> `AUDIT_RUNNING` -> `RECEPTION_VIDEO` (Holly) -> `INTRO_VIDEO` (Glo) -> `LIVE_CHAT`.
- **Pre-loading**: We will use a "Video Manager" component that pre-buffers the next video in the background while the previous one is playing.

### 2. Audio & Mic Stability
- **Sync Check**: A "Sound Check" step will be integrated into the initial "Start Audit" or "Stand-By" phase to ensure speakers are active and mic permissions are granted *before* Glo appears live.

### 3. Real-Time Engine
- **Technology**: Gemini Multimodal Live API via WebSockets.
- **Latency Mitigation**: We will use "Streamed Response" patterns to ensure Glo responds with minimum delay.

## Verification Plan

### Manual Verification
- Test autoplay behavior across Chrome, Edge, and mobile browsers.
- Verify transition timing from pre-recorded video to live WebSocket stream.
- Test mic permission "edge cases" (e.g. user denies permission initially).
