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
    const scheduledSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const jitterBufferThreshold = 6; // Increased from 3 to 6 to prevent static/crackling from network jitter

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
        scheduledSourcesRef.current.forEach(source => {
            try { source.stop(); } catch(e) {}
        });
        scheduledSourcesRef.current.clear();

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
                // Buffer by 150ms to allow for browser processing jitter and avoid static
                nextScheduleTimeRef.current = now + 0.15;
            }

            // Connect to persistent gain node (which connects to analyser and destination)
            source.connect(outGainRef.current);

            source.onended = () => {
                scheduledSourcesRef.current.delete(source);
            };
            scheduledSourcesRef.current.add(source);

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

    const reset = useCallback(() => {
        setError(null);
        updateStatus('IDLE');
    }, [updateStatus]);

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

            // Connection Watchdog
            const connectionTimeout = setTimeout(() => {
                if (wsRef.current?.readyState !== WebSocket.OPEN && statusRef.current === 'CONNECTING_WS') {
                    log('Watchdog: WebSocket failed to reach OPEN state in 5s.');
                    setError('Connection timed out. Check network or API key permissions.');
                    stopSession(true);
                }
            }, 5000);

            const setupWsListeners = (ws: WebSocket) => {
                ws.onopen = () => {
                    clearTimeout(connectionTimeout);
                    if (wsRef.current !== ws) return;
                    updateStatus('HANDSHAKING');
                    log('WebSocket Open. Sending Setup (Glo 2.0)...');

                    ws.send(JSON.stringify({
                        setup: {
                            model: 'models/gemini-2.5-flash-native-audio-latest',
                            generationConfig: {
                                responseModalities: ['AUDIO'],
                                speechConfig: {
                                    voiceConfig: {
                                        prebuiltVoiceConfig: {
                                            voiceName: 'Kore'
                                        }
                                    }
                                }
                            },
                            systemInstruction: {
                                parts: [{
                                    text: `${context?.gloPersona || 'You are Glo, a high-performing career strategist.'}

${context?.gloAudioInstructions || 'Follow your strategic conversation script.'}

${context?.gloFacts ? `### FACTUAL REFERENCE DATA\n${context.gloFacts}` : ''}

### DATA MAPPING FOR VARIABLES
To follow the script in 'glo-audio-discussion.md', map the following data to the variables:
- **{{first_name}}**: Use "${context?.candidateName?.split(' ')[0] || 'Candidate'}".
- **{{job_title}}**: Use "${context?.jobLink || 'Target Role'}".
- **{{target_company}}**: Infer this from the Job Description or Analysis.
- **{{trait-1, 2, 3}}**: Extract the 3 most important employer requirements from the **Evaluation Analysis** below.
- **{{trait_1, 2, 3}}**: Extract the 3 best matching traits from the resume/analysis that match the above requirements.

### SESSION DATA
- **Full Candidate Name**: ${context?.candidateName || 'the candidate'}
- **Target Role/Title**: ${context?.jobLink || 'Professional Role'}
- **Job Description Snippet**: ${context?.jobDescription?.substring(0, 1000) || 'See analysis for requirements.'}
- **Evaluation Analysis (Source for Traits)**: ${context?.analysis || 'Analysis pending.'}

STRICT MODALITY RULE: Output ONLY audio. Speak naturally according to the persona and script provided.
`
                                }]
                            }
                        }
                    }));

                    handshakeTimeoutRef.current = setTimeout(() => {
                        if (statusRef.current === 'HANDSHAKING' && wsRef.current === ws) {
                            log('Handshake Timeout: AI server did not confirm session.');
                            setError('AI Session Handshake failed (Timeout).');
                            stopSession(true);
                        }
                    }, 10000);
                };

                ws.onmessage = async (event) => {
                    if (wsRef.current !== ws) return;
                    try {
                        const data = event.data instanceof Blob ? await event.data.text() : event.data;
                        const response = JSON.parse(data);

                        // Catch ANY error from Gemini immediately
                        if (response.error) {
                            const errMsg = response.error.message || JSON.stringify(response.error);
                            log(`AI PROTOCOL ERROR: ${errMsg}`);
                            setError(`AI Engine Error: ${errMsg}`);
                            stopSession(true);
                            return;
                        }

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
                                            turns: [{ role: 'user', parts: [{ text: "Hi Glo, I’m here for my career evaluation. Please greet me and share your first strategic insight." }] }],
                                            turnComplete: true
                                        }
                                    }));
                                    log('Kickstart sent (Strategic).');
                                }
                            }, 300);

                            let sentChunks = 0;
                            let silenceStart = Date.now();
                            let hasSpokenThisTurn = false;

                            const handleInputBuffer = (rawData: Float32Array, peak: number) => {
                                if (ws.readyState === WebSocket.OPEN && statusRef.current === 'ACTIVE') {
                                    setMicPeak(peak);

                                    const timeSinceGloSpoke = Date.now() - lastGloSpeechTimeRef.current;
                                    const isEchoGuardActive = timeSinceGloSpoke < 2000;
                                    
                                    // 0.04 represents a reasonable noise floor for typical laptop mics
                                    if (peak > 0.04 && !isEchoGuardActive) {
                                        silenceStart = Date.now();
                                        hasSpokenThisTurn = true;
                                    }
                                    
                                    const msSinceLastLoudSound = Date.now() - silenceStart;
                                    
                                    // Let native VAD have the unaltered audio (no zero-padding)
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
                                    
                                    // CLIENT VAD: If the user spoke, and has been quiet for 1.25s, FORCE turn complete
                                    if (hasSpokenThisTurn && msSinceLastLoudSound > 1250) {
                                        log("User paused for 1.25s. Forcing TurnComplete to reduce latency.");
                                        ws.send(JSON.stringify({
                                            clientContent: { turnComplete: true }
                                        }));
                                        hasSpokenThisTurn = false; // reset until they speak again
                                    }

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

                        const serverContent = response.server_content || response.serverContent;
                        if (serverContent) {
                            // Check for server-side errors
                            if (serverContent.error) {
                                log(`AI SERVER CONTENT ERROR: ${JSON.stringify(serverContent.error)}`);
                                setError(`AI Server Content Error: ${serverContent.error.message || 'Unknown'}`);
                                stopSession(true);
                                return;
                            }

                            // Enhanced Telemetry
                            const modelTurn = serverContent.model_turn || serverContent.modelTurn;
                            if (modelTurn) {
                                if (modelTurn.parts?.length > 0) {
                                    const hasAudio = modelTurn.parts.some((p: any) => p.inline_data || p.inlineData);
                                    if (!hasAudio) log(`AI Turn Meta: ${JSON.stringify(modelTurn.parts)}`);
                                }
                            }

                            const turnComplete = serverContent.turn_complete || serverContent.turnComplete;
                            if (turnComplete) log("AI Turn Complete.");

                            if (!serverContent.model_turn && !serverContent.modelTurn && !turnComplete) {
                                log(`AI Feed: ${JSON.stringify(serverContent)}`);
                            }
                        }

                        const modelTurn = serverContent?.model_turn || serverContent?.modelTurn;

                        // Check for text responses
                        const textPart = modelTurn?.parts?.find((p: any) => p.text);
                        if (textPart?.text) {
                            log(`AI TEXT: ${textPart.text}`);
                        }

                        const audioBase64Part = modelTurn?.parts?.find((p: any) => p.inline_data?.data || p.inlineData?.data);
                        const audioData = audioBase64Part?.inline_data?.data || audioBase64Part?.inlineData?.data;

                        if (audioData) {
                            if (audioQueueRef.current.length === 0) {
                                log('Receiving Glo Audio Stream...');
                            }
                            // Stamp on EVERY chunk so the full response stays protected
                            lastGloSpeechTimeRef.current = Date.now();
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
                            // IMMEDIATELY stop currently playing audio nodes to prevent double voices overlap
                            scheduledSourcesRef.current.forEach(source => {
                                try { source.stop(); } catch(e) {}
                            });
                            scheduledSourcesRef.current.clear();
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
                    clearTimeout(connectionTimeout);
                    if (wsRef.current === ws) {
                        log('WebSocket Link Error.');
                        setError('Handshake rejected or network interrupt.');
                    }
                };

                ws.onclose = (e) => {
                    clearTimeout(connectionTimeout);
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

    return { isActive, startSession, stopSession, reset, volume, micPeak, error, geminiStatus };
};
