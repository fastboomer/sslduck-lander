'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * useGeminiLive Hook - HD Version (AudioWorklet + Gemini 2.5 Bidi)
 * Uses v1alpha BidiGenerateContent endpoint with Gemini 2.5 Native Audio.
 * Implements strict camelCase for WebSocket protocol compatibility.
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
    const binary = String.fromCharCode(...new Uint8Array(output.buffer));
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
    const audioQueueRef = useRef<Float32Array[]>([]);
    const isProcessingQueueRef = useRef(false);
    const statusRef = useRef<string>('IDLE');
    const handshakeTimeoutRef = useRef<any>(null);

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
        if (!keepError) setError(null);
    }, [log, updateStatus]);

    const processAudioQueue = useCallback(async () => {
        if (isProcessingQueueRef.current || audioQueueRef.current.length === 0 || !audioContextRef.current) return;
        isProcessingQueueRef.current = true;

        try {
            const pcmData = audioQueueRef.current.shift()!;
            const buffer = audioContextRef.current.createBuffer(1, pcmData.length, 24000);
            buffer.getChannelData(0).set(pcmData);

            const source = audioContextRef.current.createBufferSource();
            source.buffer = buffer;

            const analyser = audioContextRef.current.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyser.connect(audioContextRef.current.destination);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateVol = () => {
                if (!isProcessingQueueRef.current) return;
                analyser.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
                setVolume(avg / 255);
                requestAnimationFrame(updateVol);
            };
            updateVol();

            source.onended = () => {
                isProcessingQueueRef.current = false;
                processAudioQueue();
            };
            source.start();
        } catch (e: any) {
            log(`Audio Output Err: ${e.message}`);
            isProcessingQueueRef.current = false;
        }
    }, [log]);

    const startSession = useCallback(async (selectedDeviceId?: string) => {
        if (!apiKey) { log('API Key missing.'); setError('API Key missing.'); return; }
        try {
            setError(null);
            updateStatus('INIT_AUDIO');

            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            const nativeRate = audioContextRef.current.sampleRate;
            log(`AudioContext at ${nativeRate}Hz`);

            let workletSuccess = false;
            try {
                const workletUrl = new URL('/worklets/pcm-processor.js', window.location.origin).href;
                await audioContextRef.current.audioWorklet.addModule(workletUrl);
                log('HD Worklet loaded.');
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
                log('Worklet connected.');
            } else {
                scriptNodeRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
                source.connect(scriptNodeRef.current);
                scriptNodeRef.current.connect(audioContextRef.current.destination);
                log('Legacy processor connected.');
            }

            updateStatus('CONNECTING_WS');
            // Using v1alpha BidiGenerateContent - The definitive real-time service for Feb 2026
            const liveUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

            const setupWsListeners = (ws: WebSocket) => {
                ws.onopen = () => {
                    if (wsRef.current !== ws) return;
                    updateStatus('HANDSHAKING');
                    log('WebSocket Open. Sending Setup (2.5 Native Audio)...');

                    // CRITICAL: WebSocket Bidi API requires camelCase for all setup and input fields
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
                                parts: [{ text: `You are Glo, a high-performing career strategist. Context: ${context?.jobDescription?.slice(0, 100) || 'Competitive Professional'}. Be brisk, punchy, and professional. Help ${context?.candidateName || 'the candidate'} optimize their career path. RESPONSE STYLE: Brisk, conversational, concise.` }]
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

                        if (response.setupComplete) {
                            if (handshakeTimeoutRef.current) clearTimeout(handshakeTimeoutRef.current);
                            updateStatus('ACTIVE');
                            setIsActive(true);
                            log('V2026 Handshake Confirmed. Link Active.');

                            const handleInputBuffer = (rawData: Float32Array, peak: number) => {
                                if (ws.readyState === WebSocket.OPEN && statusRef.current === 'ACTIVE') {
                                    setMicPeak(peak);
                                    const resampledData = resample(rawData, nativeRate, 16000);
                                    const { base64 } = floatTo16BitPCM(resampledData);

                                    // Use camelCase realtimeInput for Bidi protocol
                                    ws.send(JSON.stringify({
                                        realtimeInput: {
                                            mediaChunks: [{ mimeType: 'audio/pcm;rate=16000', data: base64 }]
                                        }
                                    }));
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

                        // Robust parsing for both snake_case (legacy) and camelCase (Standard)
                        const serverContent = response.serverContent || response.server_content;
                        const audioBase64 = serverContent?.modelTurn?.parts?.[0]?.inlineData?.data || serverContent?.model_turn?.parts?.[0]?.inline_data?.data;

                        if (audioBase64) {
                            audioQueueRef.current.push(base64ToFloat32(audioBase64));
                            processAudioQueue();
                        }

                        if (serverContent?.interrupted) {
                            log('Glo Interrupted.');
                            audioQueueRef.current = [];
                            isProcessingQueueRef.current = false;
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
    }, [apiKey, context, stopSession, processAudioQueue, log, updateStatus, isActive]);

    return { isActive, startSession, stopSession, volume, micPeak, error, geminiStatus };
};
