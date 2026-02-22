'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * useGeminiLive Hook - Pro Audio Version (2026)
 * Uses v1alpha BidiGenerateContent + Gemini 2.0 Native Audio.
 * Implements Sample-Accurate Scheduling & Jitter Buffering for zero-gap playback.
 */

function resample(buffer: Float32Array, from: number, to: number) {
    if (from === to) return buffer;
    const ratio = from / to;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
        const floatPos = i * ratio;
        const index = Math.floor(floatPos);
        const weight = floatPos - index;
        if (index + 1 < buffer.length) {
            result[i] = buffer[index] * (1 - weight) + buffer[index + 1] * weight;
        } else {
            result[i] = buffer[index];
        }
    }
    return result;
}

function floatTo16BitPCM(input: Float32Array) {
    const output = new Int16Array(input.length);
    let peak = 0;
    for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        const absS = Math.abs(s);
        if (absS > peak) peak = absS;
        output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Robust binary string conversion for btoa (prevents recursion limits)
    const bytes = new Uint8Array(output.buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return { base64: btoa(binary), peak };
}

function base64ToFloat32(base64: string) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768.0;
    return float32;
}

export const useGeminiLive = (apiKey: string, context: any, onLog?: (msg: string) => void) => {
    const [isActive, setIsActive] = useState(false);
    const [volume, setVolume] = useState(0);
    const [micPeak, setMicPeak] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [geminiStatus, setGeminiStatus] = useState<string>('IDLE');

    const log = useCallback((msg: string) => {
        if (onLog) onLog(msg);
        console.log(`[GEMINI_HOOK] ${msg}`);
    }, [onLog]);

    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const scriptNodeRef = useRef<ScriptProcessorNode | null>(null);
    const outAnalyserRef = useRef<AnalyserNode | null>(null);
    const outGainRef = useRef<GainNode | null>(null);

    // Pro Audio State
    const audioQueueRef = useRef<Float32Array[]>([]);
    const nextScheduleTimeRef = useRef<number>(0);
    const jitterBufferThreshold = 3; // Increased to 3 chunks to prevent crackling from network jitter

    const statusRef = useRef<string>('IDLE');
    const handshakeTimeoutRef = useRef<any>(null);
    const lastGloSpeechTimeRef = useRef<number>(0);

    const updateStatus = useCallback((s: string) => {
        log(`Status: ${s}`);
        statusRef.current = s;
        setGeminiStatus(s);
    }, [log]);

    const stopSession = useCallback((keepError = false) => {
        log('Session cleaning up...');
        setIsActive(false);
        setVolume(0);
        setMicPeak(0);
        updateStatus('IDLE');

        if (handshakeTimeoutRef.current) {
            clearTimeout(handshakeTimeoutRef.current);
            handshakeTimeoutRef.current = null;
        }

        if (wsRef.current) {
            wsRef.current.onclose = null;
            wsRef.current.onerror = null;
            wsRef.current.onmessage = null;
            wsRef.current.close();
            wsRef.current = null;
        }
        if (streamRef.current) {
            log('Stopping tracks.');
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => { });
            audioContextRef.current = null;
        }
        workletNodeRef.current = null;
        scriptNodeRef.current = null;
        outAnalyserRef.current = null;
        outGainRef.current = null;

        // Reset Pro Audio state
        audioQueueRef.current = [];
        nextScheduleTimeRef.current = 0;

        if (!keepError) setError(null);
    }, [log, updateStatus]);

    // Sample-Accurate Scheduling Loop
    const scheduleAudio = useCallback(() => {
        if (!audioContextRef.current || audioQueueRef.current.length === 0 || !outGainRef.current) return;

        // Initial jitter buffer: Wait for a few chunks to arrive before starting the first segment
        if (nextScheduleTimeRef.current === 0 && audioQueueRef.current.length < jitterBufferThreshold) {
            return;
        }

        while (audioQueueRef.current.length > 0) {
            const pcmData = audioQueueRef.current.shift()!;
            const buffer = audioContextRef.current.createBuffer(1, pcmData.length, 24000);
            buffer.getChannelData(0).set(pcmData);

            const source = audioContextRef.current.createBufferSource();
            source.buffer = buffer;

            const now = audioContextRef.current.currentTime;

            // If we've fallen behind (gap in network), reset schedule time
            if (nextScheduleTimeRef.current < now) {
                // Buffer by 50ms to allow for browser processing jitter
                nextScheduleTimeRef.current = now + 0.05;
            }

            // Connect to persistent gain node (which connects to analyser and destination)
            source.connect(outGainRef.current);
            source.start(nextScheduleTimeRef.current);

            // Increment schedule time by exact duration of this buffer
            nextScheduleTimeRef.current += buffer.duration;
        }
    }, [jitterBufferThreshold]);

    // Volume Meter Loop (Shared persistent Analyser)
    useEffect(() => {
        let rafId: number;
        const dataArray = new Uint8Array(256); // persistent allocation

        const updateMeter = () => {
            if (outAnalyserRef.current && statusRef.current === 'ACTIVE') {
                outAnalyserRef.current.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
                setVolume(avg / 255);
            }
            rafId = requestAnimationFrame(updateMeter);
        };

        rafId = requestAnimationFrame(updateMeter);
        return () => cancelAnimationFrame(rafId);
    }, []);

    const startSession = useCallback(async (selectedDeviceId?: string) => {
        if (!apiKey) { log('API Key missing.'); setError('API Key missing.'); return; }
        try {
            setError(null);
            updateStatus('INIT_AUDIO');

            // Initialize with latencyHint prioritized for stability and speed
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
                latencyHint: 'interactive',
                sampleRate: 48000
            });
            const nativeRate = audioContextRef.current.sampleRate;
            log(`Pro AudioContext at ${nativeRate}Hz (interactive)`);

            let workletSuccess = false;
            try {
                const workletUrl = new URL('/worklets/pcm-processor.js', window.location.origin).href;
                await audioContextRef.current.audioWorklet.addModule(workletUrl);
                log('Pro Worklet loaded.');
                workletSuccess = true;
            } catch (e: any) {
                log(`Worklet fail: ${e.message}. Fallback mode.`);
            }

            streamRef.current = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: selectedDeviceId && selectedDeviceId !== 'default' ? { exact: selectedDeviceId } : undefined,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            log(`Mic stream: ${streamRef.current.getAudioTracks()[0].label}`);

            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            const source = audioContextRef.current.createMediaStreamSource(streamRef.current);

            if (workletSuccess) {
                workletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'pcm-processor');
                source.connect(workletNodeRef.current);
                log('Pro Worklet connected.');
            } else {
                scriptNodeRef.current = audioContextRef.current.createScriptProcessor(2048, 1, 1);
                source.connect(scriptNodeRef.current);
                scriptNodeRef.current.connect(audioContextRef.current.destination);
                log('Legacy processor connected.');
            }

            // Persistent Output Chain
            outGainRef.current = audioContextRef.current.createGain();
            outAnalyserRef.current = audioContextRef.current.createAnalyser();
            outAnalyserRef.current.fftSize = 256;

            outGainRef.current.connect(outAnalyserRef.current);
            outAnalyserRef.current.connect(audioContextRef.current.destination);
            log('Pro Output Chain (Gain -> Analyser -> Dest) established.');

            updateStatus('CONNECTING_WS');
            const liveUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

            const setupWsListeners = (ws: WebSocket) => {
                ws.onopen = () => {
                    if (wsRef.current !== ws) return;
                    updateStatus('HANDSHAKING');
                    log('WebSocket Open. Sending Setup (Glo 2.0)...');

                    ws.send(JSON.stringify({
                        setup: {
                            model: 'models/gemini-2.5-flash-native-audio-preview-12-2025',
                            generationConfig: {
                                responseModalities: ['AUDIO'],
                                speechConfig: {
                                    voiceConfig: {
                                        prebuiltVoiceConfig: {
                                            voiceName: 'Aoede'
                                        }
                                    }
                                }
                            },
                            systemInstruction: {
                                parts: [{
                                    text: `You are Glo, a high-performing career strategist. STRICT MODALITY RULE: Output ONLY audio. No text or thoughts. 
                                
You must lead the conversation with strategic confidence. Listen carefully to the candidate and respond with insightful career advice.

Context: ${context?.analysis || 'Evaluation'}
Target: ${context?.jobDescription || 'Professional Role'}
Candidate Name: ${context?.candidateName || 'the candidate'}
`
                                }]
                            }
                        }
                    }));

                    handshakeTimeoutRef.current = setTimeout(() => {
                        if (!isActive && wsRef.current === ws) {
                            log('Session Timeout during Handshake.');
                            setError('Handshake timed out. Check API Key regional restrictions.');
                            stopSession(true);
                        }
                    }, 10000);
                };

                ws.onmessage = async (event) => {
                    if (wsRef.current !== ws) return;
                    try {
                        const data = event.data instanceof Blob ? await event.data.text() : event.data;
                        const response = JSON.parse(data);

                        const isSetupComplete = response.setupComplete || response.setup_complete;
                        if (isSetupComplete) {
                            if (handshakeTimeoutRef.current) clearTimeout(handshakeTimeoutRef.current);
                            updateStatus('ACTIVE');
                            setIsActive(true);
                            log('V2026 Handshake Confirmed. Link Active.');

                            // Kickstart
                            setTimeout(() => {
                                if (ws.readyState === WebSocket.OPEN) {
                                    ws.send(JSON.stringify({
                                        clientContent: {
                                            turns: [{ role: 'user', parts: [{ text: "Hi Glo, I'm here for my career evaluation. Please greet me and share your first strategic insight." }] }],
                                            turnComplete: true
                                        }
                                    }));
                                    log('Kickstart sent (Strategic).');
                                }
                            }, 100);

                            let sentChunks = 0;
                            const handleInputBuffer = (rawData: Float32Array, peak: number) => {
                                if (ws.readyState === WebSocket.OPEN && statusRef.current === 'ACTIVE') {
                                    setMicPeak(peak);

                                    // Interruption Lock: Ignore mic input if Glo recently started speaking (prevents echo loop)
                                    const timeSinceGloSpoke = Date.now() - lastGloSpeechTimeRef.current;
                                    if (timeSinceGloSpoke < 500) return;

                                    // Calibrated Noise Gate to 0.010 (Balanced for sensitivity vs echo-suppression)
                                    if (peak < 0.010) return;

                                    const resampledData = resample(rawData, nativeRate, 16000);
                                    const { base64 } = floatTo16BitPCM(resampledData);

                                    ws.send(JSON.stringify({
                                        realtimeInput: {
                                            mediaChunks: [{
                                                mimeType: 'audio/pcm;rate=16000',
                                                data: base64
                                            }]
                                        }
                                    }));
                                    sentChunks++;
                                    if (sentChunks === 1) log("Signal Stream established.");
                                    if (sentChunks % 100 === 0) log(`WSS Activity: Uploading PCM Data (Peak: ${peak.toFixed(4)})...`);
                                }
                            };

                            if (workletNodeRef.current) {
                                workletNodeRef.current.port.onmessage = (e) => {
                                    const { buffer, peak } = e.data;
                                    handleInputBuffer(buffer, peak);
                                };
                            } else if (scriptNodeRef.current) {
                                scriptNodeRef.current.onaudioprocess = (e) => {
                                    const raw = e.inputBuffer.getChannelData(0);
                                    let p = 0; for (let i = 0; i < raw.length; i++) { const a = Math.abs(raw[i]); if (a > p) p = a; }
                                    handleInputBuffer(raw, p);
                                };
                            }
                        }

                        const serverContent = response.serverContent || response.server_content;
                        if (serverContent) {
                            // Enhanced Telemetry
                            const modelTurn = serverContent.modelTurn || serverContent.model_turn;
                            if (modelTurn) {
                                if (modelTurn.parts?.length > 0) {
                                    const hasAudio = modelTurn.parts.some((p: any) => p.inlineData || p.inline_data);
                                    if (!hasAudio) log(`AI Turn Meta: ${JSON.stringify(modelTurn.parts)}`);
                                }
                            }

                            const turnComplete = serverContent.turnComplete || serverContent.turn_complete;
                            if (turnComplete) log("AI Turn Complete.");

                            if (!serverContent.modelTurn && !serverContent.model_turn && !turnComplete) {
                                log(`AI Feed: ${JSON.stringify(serverContent)}`);
                            }
                        }

                        const modelTurn = serverContent?.modelTurn || serverContent?.model_turn;

                        // Check for text responses (Gemini Live sometimes responds with text + audio)
                        const textPart = modelTurn?.parts?.find((p: any) => p.text);
                        if (textPart?.text) {
                            log(`AI TEXT: ${textPart.text}`);
                        }

                        const audioBase64Part = modelTurn?.parts?.find((p: any) => p.inlineData?.data || p.inline_data?.data);
                        const audioData = audioBase64Part?.inlineData?.data || audioBase64Part?.inline_data?.data;

                        if (audioData) {
                            if (audioQueueRef.current.length === 0) {
                                log('Receiving Glo Audio Stream...');
                                lastGloSpeechTimeRef.current = Date.now();
                            }
                            const pcm = base64ToFloat32(audioData);
                            audioQueueRef.current.push(pcm);
                            scheduleAudio();
                        }

                        if (serverContent?.interrupted) {
                            // Only log if we had audio in the queue (actual interruption)
                            if (audioQueueRef.current.length > 0) {
                                log('Glo Interrupted (Queue Cleared).');
                                audioQueueRef.current = [];
                            }
                            nextScheduleTimeRef.current = 0;
                            setVolume(0);
                        }

                        const geminiErr = response.error || serverContent?.error;
                        if (geminiErr) {
                            log(`AI ERROR: ${JSON.stringify(geminiErr)}`);
                        }
                    } catch (err: any) { log(`Msg Parse Error: ${err.message}`); }
                };

                ws.onerror = (e) => {
                    if (wsRef.current === ws) {
                        log('WebSocket Link Error.');
                        setError('Handshake rejected or network interrupt.');
                    }
                };

                ws.onclose = (e) => {
                    if (wsRef.current === ws) {
                        log(`WS Closed: ${e.code} ${e.reason || ''}`);
                        if (!isActive && statusRef.current !== 'ERROR') {
                            setError(`Session Terminated (Code ${e.code}): ${e.reason || 'Handshake rejected by endpoint'}`);
                        }
                        stopSession(true);
                    }
                };
            };

            wsRef.current = new WebSocket(liveUrl);
            setupWsListeners(wsRef.current);

        } catch (err: any) {
            log(`Fatal Link Error: ${err.message}`);
            setError(err.message || 'Hardware/Link failure.');
            stopSession(true);
        }
    }, [apiKey, context, stopSession, scheduleAudio, log, updateStatus, isActive]);

    return { isActive, startSession, stopSession, volume, micPeak, error, geminiStatus };
};
