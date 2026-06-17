'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, PhoneOff, Loader2, Sparkles, AlertCircle, Info, CheckCircle2, X, RefreshCw, Zap, Volume2, ChevronDown } from 'lucide-react';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { PostGloClose } from './PostGloClose';

interface GloLiveHubProps {
    reportId: string;
    initialContext?: any; // Pre-fetched context from parent — skips duplicate Firestore call
}

type SessionStatus = 'IDLE' | 'PREFLIGHT' | 'CONNECTING' | 'ACTIVE' | 'ERROR';

// --- Dynamic TTS Helper for Simone Intro via Gemini Live API ---
const playGeminiLiveTTS = async (text: string, voiceName: string, apiKey: string, onStart: () => void, onEnd: () => void, onLog: (msg: string) => void, cancelRef?: React.MutableRefObject<(() => void) | null>) => {
    try {
        if (!apiKey) throw new Error("API Key missing");
        onLog(`Requesting Live TTS for voice: ${voiceName}...`);
        
        const isApiKey = apiKey.startsWith('AIzaSy');
        const authParam = isApiKey ? `key=${apiKey}` : `access_token=${apiKey}`;
        // v1beta is required for all 2.5+ native audio models; v1alpha only supported 2.0
        const liveUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?${authParam}`;
        const ws = new WebSocket(liveUrl);
        let actx: AudioContext | null = null;
        let nextScheduleTime = 0;
        let isSetupComplete = false;
        let hasStarted = false;
        let idleTimeout: NodeJS.Timeout | null = null;
        let actualCompletionTimeout: NodeJS.Timeout | null = null;

        const clearTimeouts = () => {
            if (idleTimeout) clearTimeout(idleTimeout);
            if (actualCompletionTimeout) clearTimeout(actualCompletionTimeout);
        };

        const scheduleEnd = () => {
            const timeRemaining = nextScheduleTime - (actx?.currentTime || 0);
            actualCompletionTimeout = setTimeout(() => {
                onLog('TTS Audio playback finished.');
                cleanup();
                onEnd();
                actx?.close().catch(() => {});
            }, Math.max(0, timeRemaining * 1000) + 200);
        };

        const resetIdleTimer = () => {
            clearTimeouts();
            idleTimeout = setTimeout(() => {
                onLog('TTS Stream Idle, scheduling playback completion...');
                scheduleEnd();
            }, 600); // 600ms idle = faster stream-done detection
        };

        const cleanup = () => {
            clearTimeouts();
            if (ws.readyState === WebSocket.OPEN) ws.close();
        };
        if (cancelRef) {
            cancelRef.current = () => {
                cleanup();
                if (actx) actx.close().catch(() => { });
            };
        }
        ws.onopen = () => {
            onLog('TTS WS Open. Sending Setup...');
            ws.send(JSON.stringify({
                setup: {
                    model: 'models/gemini-3.1-flash-live-preview',
                    generationConfig: {
                        temperature: 0.1,
                        topP: 0.05,
                        responseModalities: ['AUDIO'],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: voiceName
                                }
                            }
                        }
                    },
                    systemInstruction: {
                        parts: [{
                            text: "You are a professional Text-To-Speech engine. Speak the user's text exactly once with a natural, professional tone. Do not repeat phrases, do not hallucinate, and do not add conversational filler. Speak the text and immediately stop."
                        }]
                    }
                }
            }));
        };
        ws.onmessage = async (event) => {
            try {
                const data = event.data instanceof Blob ? await event.data.text() : event.data;
                const response = JSON.parse(data);
                if ((response.setupComplete || response.setup_complete) && !isSetupComplete) {
                    isSetupComplete = true;
                    onLog('TTS Setup Complete. Sending text...');
                    ws.send(JSON.stringify({
                        clientContent: {
                            turns: [{ role: 'user', parts: [{ text: `Speak this verbatim, exactly once:\n\n${text}` }] }],
                            turnComplete: true
                        }
                    }));
                }
                const serverContent = response.serverContent || response.server_content;
                if (serverContent) {
                    const modelTurn = serverContent.modelTurn || serverContent.model_turn;
                    const parts = modelTurn?.parts || [];

                    for (const part of parts) {
                        const inlineData = part.inlineData || part.inline_data;
                        if (inlineData?.data) {
                            if (!actx) {
                                actx = new (window.AudioContext || (window as any).webkitAudioContext)({
                                    sampleRate: 24000 // Gemini outputs 24kHz PCM
                                });
                            }
                            if (!hasStarted) {
                                hasStarted = true;
                                onStart();
                            }
                            // Decode base64 to float32
                            const binary = atob(inlineData.data);
                            const bytes = new Uint8Array(binary.length);
                            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                            const int16 = new Int16Array(bytes.buffer);
                            const float32 = new Float32Array(int16.length);
                            for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768.0;
                            const buffer = actx.createBuffer(1, float32.length, 24000);
                            buffer.getChannelData(0).set(float32);
                            const source = actx.createBufferSource();
                            source.buffer = buffer;
                            source.connect(actx.destination);
                            const now = actx.currentTime;
                            if (nextScheduleTime < now) nextScheduleTime = now + 0.05;
                            source.start(nextScheduleTime);
                            nextScheduleTime += buffer.duration;
                            resetIdleTimer();
                        }
                    }
                    const turnComplete = serverContent.turnComplete || serverContent.turn_complete;
                    if (turnComplete) {
                        onLog('Explicit TTS Turn Complete received.');
                        clearTimeouts();
                        scheduleEnd();
                    }
                }

                if (response.error || serverContent?.error) {
                    throw new Error(JSON.stringify(response.error || serverContent.error));
                }
            } catch (err: any) {
                onLog(`TTS WS Error: ${err.message}`);
                cleanup();
                onEnd();
            }
        };
        ws.onerror = () => {
            onLog('TTS WS Network Error.');
            cleanup();
            onEnd();
        };
    } catch (err: any) {
        onLog(`TTS Init Error: ${err.message}`);
        onEnd();
    }
};


export const GloLiveHub: React.FC<GloLiveHubProps> = ({ reportId, initialContext }) => {
    const [status, setStatus] = useState<SessionStatus>('IDLE');
    // Use pre-fetched context from parent if available; otherwise fetch ourselves
    const [context, setContext] = useState<any>(initialContext || null);
    const [localError, setLocalError] = useState<string | null>(null);
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const [preflightUserMicLevel, setPreflightUserMicLevel] = useState(0);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default');
    const [isSiteB] = useState(false); // Designation for Site B
    const [hasSessionEnded, setHasSessionEnded] = useState(false);

    useEffect(() => {
        if (hasSessionEnded && reportId) {
            sessionStorage.setItem(`gloSessionEnded_${reportId}`, 'true');
        }
    }, [hasSessionEnded, reportId]);

    // Pre-talk State
    const [isPreTalk, setIsPreTalk] = useState(true);
    const [preTalkCaption, setPreTalkCaption] = useState('Connecting to Simone...');
    const hasPlayedIntroRef = useRef(false);

    // Sync state from sessionStorage after initial mount to avoid hydration mismatch
    useEffect(() => {
        if (typeof window !== 'undefined' && reportId) {
            const ended = sessionStorage.getItem(`gloSessionEnded_${reportId}`) === 'true';
            if (ended) {
                setHasSessionEnded(true);
                setIsPreTalk(false);
                hasPlayedIntroRef.current = true;
            }
        }
    }, [reportId]);

    const cancelTTSRef = useRef<(() => void) | null>(null);

    const skipIntro = useCallback(() => {
        if (cancelTTSRef.current) {
            cancelTTSRef.current();
            cancelTTSRef.current = null;
        }
        setIsPreTalk(false);
        hasPlayedIntroRef.current = true;
    }, []);

    const addLog = useCallback((msg: string) => {
        console.log(`[GLO_UI] ${msg}`);
        setDebugLogs(prev => {
            if (msg.startsWith("HD Pulse") && prev[0]?.startsWith("HD Pulse")) {
                return [msg, ...prev.slice(1)];
            }
            return [msg, ...prev].slice(0, 30);
        });
    }, []);

    const [accessToken, setAccessToken] = useState<string | null>(null);
    const apiKey = (process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY || '').trim();
    const { isActive, startSession: startGemini, stopSession, reset: resetGeminiError, volume, micPeak, error: geminiError, geminiStatus } = useGeminiLive(
        accessToken || apiKey || '',
        context,
        addLog,
        // onNaturalEnd: Gemini closed the session cleanly (code 1000/1001) — treat as normal end
        () => {
            addLog('Natural session end received from hook. Triggering offer page.');
            setTimeout(() => setHasSessionEnded(true), 1500);
        }
    );

    // Fetch secure session token on mount
    useEffect(() => {
        if (!reportId) return;
        const fetchToken = async () => {
            try {
                addLog("Fetching secure session credentials...");
                const res = await fetch(`/api/glo/session-token?reportId=${reportId}`);
                if (res.ok) {
                    const data = await res.json();
                    setAccessToken(data.accessToken);
                    addLog("Secure session token obtained.");
                } else {
                    addLog("Failed to fetch secure session token, fallback to local client key.");
                }
            } catch (err: any) {
                addLog(`Token fetch error: ${err.message}`);
            }
        };
        fetchToken();
    }, [reportId, addLog]);

    // Fetch context on mount — skipped if parent already provided initialContext
    useEffect(() => {
        if (context) {
            addLog('Context provided by parent — skipping duplicate fetch.');
            return;
        }
        const fetchContext = async () => {
            try {
                addLog(`Fetching context for ${reportId}...`);
                const res = await fetch(`/api/gap-analysis/context/${reportId}`);
                if (!res.ok) {
                    setContext({ candidateName: "Professional", resumeText: "", jobDescription: "", analysis: "" });
                } else {
                    const data = await res.json();
                    setContext(data);
                }
            } catch (err: any) {
                addLog(`Context Error: ${err.message}`);
                setLocalError('Report context link failed.');
            }
        };
        fetchContext();
    }, [reportId, addLog]);

    // ── Simone Intro via Web Speech API (no user-gesture required) ──
    const ttsUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        if (!context || hasPlayedIntroRef.current) return;
        if (status !== 'IDLE' && status !== 'PREFLIGHT') return;
        // Wait for credentials (either secure accessToken or fallback apiKey) to be loaded
        if (!accessToken && !apiKey) return;

        const timer = setTimeout(() => {
            if (hasPlayedIntroRef.current || !isPreTalk) return;

            const firstName = context.candidateName?.split(' ')[0] || 'there';
            const text = `Hey ${firstName}, it's Simone! I've forwarded your resume to Glenn. I also have Glo on the line, with comments on your resume profile. If you would like to talk just click the Talk to Glo Button.`;

            addLog('Simone Intro: Initiating dynamic TTS (Aoede)...');
            hasPlayedIntroRef.current = true;
            setIsPreTalk(true);
            setPreTalkCaption(text);

            // Trigger the High-Quality TTS Generation and Playback
            playGeminiLiveTTS(
                text,
                'Erinome',
                accessToken || apiKey || '',
                () => addLog('Simone TTS: Speaking.'),
                () => {
                    addLog('Simone TTS: Finished.');
                    setIsPreTalk(false);
                },
                addLog,
                cancelTTSRef
            );
        }, 50); // 50ms: fire almost immediately after context is ready
        return () => clearTimeout(timer);
    }, [context, status, isPreTalk, addLog, apiKey, accessToken]);

    // Mic Management & Pre-flight
    const micMeterRef = useRef<AudioContext | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);

    const stopMicResources = useCallback(() => {
        if (micMeterRef.current) {
            // Cancel the animation frame loop via the ref we attached
            if ((micMeterRef.current as any).__activeRef) {
                (micMeterRef.current as any).__activeRef.active = false;
            }
            micMeterRef.current.close().catch(() => { });
            micMeterRef.current = null;
        }
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(t => t.stop());
            micStreamRef.current = null;
        }
    }, []);

    const [hasPermission, setHasPermission] = useState(false);
    const [isRefreshingMics, setIsRefreshingMics] = useState(false);

    const requestPermission = async () => {
        try {
            setIsRefreshingMics(true);
            addLog("Requesting mic permission...");
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setHasPermission(true);

            // Critical: Enumerate while the stream is still active
            await enumerateMics();

            stream.getTracks().forEach(t => t.stop());
            setIsRefreshingMics(false);
            startMicMeter(); // Start the meter after getting permission and enumerating
        } catch (e: any) {
            setIsRefreshingMics(false);
            addLog(`Permission Error: ${e.message}`);

            if (e.name === 'NotFoundError') {
                setLocalError("No microphone found. Please connect a microphone.");
            } else if (e.name === 'NotAllowedError' || (e.message || '').toLowerCase().includes('denied')) {
                setLocalError("Permission Denied. Please click the lock icon 🔒 in your browser's address bar to enable microphone access.");
            } else {
                setLocalError(`Mic Error: ${e.message}`);
            }
        }
    };

    const enumerateMics = async (retryCount = 0): Promise<void> => {
        try {
            addLog(`Enumerating devices (Attempt ${retryCount + 1})...`);
            const devs = await navigator.mediaDevices.enumerateDevices();
            const audioIn = devs.filter(d => d.kind === 'audioinput' && d.deviceId !== '');

            addLog(`Found ${audioIn.length} mic(s). Labels: ${audioIn.map(d => d.label || 'NONE').join(', ')}`);

            // If labels are missing and we haven't retried too much, wait and try again
            if (audioIn.length > 0 && audioIn.some(d => d.label === '') && retryCount < 3) {
                await new Promise(r => setTimeout(r, 500));
                return enumerateMics(retryCount + 1);
            }

            if (audioIn.length === 0) {
                const fallback = { deviceId: 'default', label: 'System Default Microphone', kind: 'audioinput', groupId: '' } as MediaDeviceInfo;
                setDevices([fallback]);
                if (!selectedDeviceId) setSelectedDeviceId('default');
            } else {
                setDevices(audioIn);
                if (!selectedDeviceId) {
                    setSelectedDeviceId(audioIn[0].deviceId);
                }
            }
        } catch (e: any) {
            addLog(`Enum Error: ${e.message}`);
            const fallback = { deviceId: 'default', label: 'System Default Microphone', kind: 'audioinput', groupId: '' } as MediaDeviceInfo;
            setDevices([fallback]);
            if (!selectedDeviceId) setSelectedDeviceId('default');
        }
    };

    const startMicMeter = async (devId?: string) => {
        try {
            if (micMeterRef.current) {
                micMeterRef.current.close().catch(() => { });
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: devId ? { deviceId: { exact: devId } } : true
            });
            micStreamRef.current = stream;
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            micMeterRef.current = audioContext;
            const source = audioContext.createMediaStreamSource(stream);
            const analyzer = audioContext.createAnalyser();
            analyzer.fftSize = 256;
            source.connect(analyzer);
            const data = new Uint8Array(analyzer.frequencyBinCount);

            const activeRef = { active: true };
            const check = () => {
                if (!activeRef.active || !micMeterRef.current) return;
                analyzer.getByteFrequencyData(data);
                const avg = data.reduce((a, b) => a + b) / data.length;
                setPreflightUserMicLevel(avg / 255);
                requestAnimationFrame(check);
            };
            check();
            // Expose cancellation so stopMicResources can terminate the loop
            (micMeterRef.current as any).__activeRef = activeRef;
        } catch (e: any) {
            addLog(`Meter Error: ${e.message}`);
        }
    };

    const enterPreflight = async () => {
        window.speechSynthesis.cancel();
        if (cancelTTSRef.current) {
            cancelTTSRef.current();
            cancelTTSRef.current = null;
        }
        setIsPreTalk(false);
        setLocalError(null);
        setStatus('PREFLIGHT');

        // Check if we already have labels (permission likely granted)
        const devs = await navigator.mediaDevices.enumerateDevices();
        const hasLabels = devs.some(d => d.kind === 'audioinput' && d.label !== '');

        if (hasLabels) {
            setHasPermission(true);
            await enumerateMics();
            startMicMeter();
        } else {
            setHasPermission(false);
            // Default item while waiting
            setDevices([{ deviceId: 'default', label: 'Identifying...', kind: 'audioinput' } as MediaDeviceInfo]);
            // Removed automatic prompt to prevent browser popup overriding UI
            // await requestPermission();
            // startMicMeter();
        }
    };

    // State Sync 
    const wasActiveRef = useRef(false);
    useEffect(() => {
        if (isActive) {
            wasActiveRef.current = true;
            setStatus('ACTIVE');
        } else if (geminiError) {
            setStatus('ERROR');
            addLog(`Error detected: ${geminiError}`);
        } else if (!isActive && wasActiveRef.current && status === 'ACTIVE') {
            addLog("AI connection naturally terminated.");
            wasActiveRef.current = false;
            setTimeout(() => setHasSessionEnded(true), 3000);
        }
    }, [isActive, geminiError, addLog, status]);

    const handleStartSession = async () => {
        stopMicResources();
        setLocalError(null);
        addLog("AI handshake initiated...");
        setStatus('CONNECTING');
        hasPlayedIntroRef.current = true; // Block intro if user starts session early
        await startGemini(selectedDeviceId);
    };

    const handleEndSession = useCallback(() => {
        addLog("Manual session termination.");
        stopMicResources();
        stopSession();
        resetGeminiError();
        setStatus('IDLE');
        setPreflightUserMicLevel(0);
        setLocalError(null);
        setTimeout(() => setHasSessionEnded(true), 3000);
    }, [stopSession, resetGeminiError, stopMicResources, addLog]);

    const handleResetOnError = useCallback(() => {
        addLog("User cleared error state.");
        stopSession();
        resetGeminiError();
        setStatus('IDLE');
        setLocalError(null);
    }, [stopSession, resetGeminiError, addLog]);

    useEffect(() => {
        return () => {
            stopMicResources();
            window.speechSynthesis.cancel();
        };
    }, [stopMicResources]);

    // 90-Second Abandonment Prompt (reduced from 3 min for faster recovery UX)
    useEffect(() => {
        if (!hasSessionEnded) return;

        const timer = setTimeout(() => {
            const firstName = context?.candidateName?.split(' ')[0] || 'there';
            const abandonText = `Hey ${firstName}, are you still there? Let know if you need any help deciding on a package.`;
            
            playGeminiLiveTTS(
                abandonText,
                'Kore',
                accessToken || apiKey || '',
                () => addLog('Abandonment TTS: Speaking.'),
                () => addLog('Abandonment TTS: Finished.'),
                addLog
            );
        }, 90 * 1000); // 90 seconds

        return () => clearTimeout(timer);
    }, [hasSessionEnded, apiKey, accessToken, addLog, context]);

    const displayError = geminiError || localError;
    const isShowingSessionUI = status === 'CONNECTING' || status === 'ACTIVE' || status === 'ERROR';

    // Mic level is either preflight meter or real-time peak from worklet
    const currentMicLevel = status === 'PREFLIGHT' ? preflightUserMicLevel : (isActive ? micPeak : 0);

    const mainContainerClass = hasSessionEnded 
        ? "fixed top-20 md:top-28 left-4 md:left-6 w-14 h-14 md:w-[72px] md:h-[72px] z-[200] transition-all duration-1000 ease-in-out" 
        : "w-full max-w-2xl mx-auto space-y-4 transition-all duration-1000 ease-in-out";

    return (
        <>
        <div className={mainContainerClass}>
            <div className={`relative aspect-square overflow-hidden bg-royal-blue/10 border border-white/20 shadow-2xl glass group ${hasSessionEnded ? 'rounded-2xl shadow-xl' : 'rounded-[40px]'}`}>

                <div className="absolute inset-0">
                    <AnimatePresence mode="wait">
                        {isPreTalk ? (
                            <motion.div
                                key="intro-tts"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="w-full h-full relative bg-slate-950 flex flex-col items-center justify-start pt-12"
                            >
                                {/* Caption */}
                                <div className="px-8 max-w-sm text-center z-10">
                                    <p className="text-[10px] font-bold text-royal-blue/50 uppercase tracking-widest mb-3">Simone ┬╖ SSLDUCK</p>
                                    <motion.p
                                        initial={{ y: 10, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className="text-white/90 text-base font-serif italic text-center leading-relaxed drop-shadow-2xl"
                                    >
                                        "{preTalkCaption}"
                                    </motion.p>
                                </div>

                                {/* Animated voice pulse */}
                                <div className="relative flex flex-1 items-center justify-center w-full mt-8 mb-20">
                                    <div className="absolute w-32 h-32 bg-royal-blue/20 rounded-full animate-ping" />
                                    <div className="absolute w-24 h-24 bg-royal-blue/30 rounded-full animate-pulse" />
                                    <div className="w-16 h-16 bg-royal-blue/60 rounded-full flex items-center justify-center">
                                        <Volume2 size={28} className="text-white animate-pulse" />
                                    </div>
                                </div>

                                {/* SKIP INTRO BUTTON */}
                                <div className="absolute bottom-6 right-6 z-20">
                                    <button
                                        onClick={skipIntro}
                                        className="bg-white/10 hover:bg-white/20 text-white/70 hover:text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/20 transition-all flex items-center gap-2 group/skip"
                                    >
                                        Skip
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 group-hover/skip:opacity-100 group-hover/skip:translate-x-0.5 transition-all"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
                                    </button>
                                </div>

                            </motion.div>
                        ) : (
                            <motion.img
                                key="photo"
                                initial={{ opacity: 0, scale: 1.1 }}
                                animate={{ opacity: 1, scale: 1.05 }}
                                exit={{ opacity: 0, scale: 1.1 }}
                                src="https://firebasestorage.googleapis.com/v0/b/fasth-lander-2026-v2.firebasestorage.app/o/glo-3-female-human.png?alt=media&token=0ab75fba-deeb-41c4-b62c-2635057b4a8f"
                                alt="Glo"
                                className={`w-full h-full object-cover brightness-110 ${hasSessionEnded ? 'object-[center_18%]' : 'object-top'}`}
                            />
                        )}
                    </AnimatePresence>


                    {/* Name bar hidden in mini-mode — shows only Glo's face */}
                    {!hasSessionEnded && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 z-10">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="text-white font-serif text-2xl font-bold flex items-center gap-2">
                                    Glo <Sparkles size={20} className="text-yellow-400 animate-pulse" />
                                </h3>
                                <p className="text-white/60 text-xs font-medium uppercase tracking-widest flex items-center gap-2">
                                    {isActive ? (
                                        <> <Zap size={10} className="text-emerald-400" /> HD Live Link Active </>
                                    ) : isPreTalk ? (
                                        <> <Sparkles size={10} className="text-royal-blue animate-spin" /> Satellite Transmission... </>
                                    ) : status === 'CONNECTING' ? (
                                        <> <Loader2 size={10} className="animate-spin" /> Handshaking... </>
                                    ) : status === 'ERROR' ? (
                                        <> <AlertCircle size={10} className="text-red-400" /> Connection Broken </>
                                    ) : 'Satellite Offline'}
                                </p>
                            </div>
                            {isShowingSessionUI && (
                                <button
                                    onClick={handleEndSession}
                                    className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-full shadow-lg transition-all active:scale-95 flex items-center gap-2 group/btn"
                                >
                                    <PhoneOff size={20} />
                                    <span className="hidden sm:inline text-xs font-bold uppercase pr-2">End Link</span>
                                </button>
                            )}
                        </div>
                    </div>
                    )}
                </div>

                <AnimatePresence>
                    {(status === 'IDLE' && !isPreTalk && !hasSessionEnded) && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-[2px] gap-4 z-20"
                        >
                            <button
                                onClick={enterPreflight}
                                className="group relative bg-white text-royal-blue px-10 py-5 rounded-full font-bold text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 overflow-hidden"
                            >
                                <span className="relative z-10 flex items-center gap-3">
                                    <Mic size={28} className="group-hover:animate-bounce" />
                                    Talk to Glo
                                </span>
                                <div className="absolute inset-0 bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors" />
                                <div className="absolute -inset-2 bg-emerald-400/30 rounded-full blur-xl animate-pulse pointer-events-none" />
                                <div className="absolute -inset-4 bg-emerald-500/20 rounded-full blur-2xl animate-ping pointer-events-none" />
                            </button>
                            {displayError && (
                                <div className="flex items-center gap-2 text-red-300 bg-red-900/50 px-4 py-2 rounded-lg text-[10px] font-mono max-w-[80%] text-center uppercase tracking-tighter">
                                    <AlertCircle size={12} className="shrink-0" /> Previous Failure: {displayError}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {status === 'PREFLIGHT' && (
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="absolute inset-0 flex flex-col items-center justify-center bg-royal-blue/90 backdrop-blur-xl text-white p-8 gap-6 text-center z-[100]"
                        >
                            <div className="bg-white/10 p-5 rounded-3xl border border-white/20 w-full max-w-sm space-y-4 shadow-3xl relative z-[110]">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 text-emerald-300 font-bold uppercase tracking-widest text-[10px]">
                                        <CheckCircle2 size={14} /> Link Calibration
                                        {isSiteB && <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded text-[8px] border border-emerald-500/30">SITE B (BETA)</span>}
                                    </div>
                                    <button onClick={handleEndSession} className="text-white/40 hover:text-white transition-colors"><X size={20} /></button>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1 text-left">
                                        <label className="text-[10px] font-bold text-white/50 uppercase ml-1">Hardware Input</label>
                                        {(geminiError || localError) && (
                                            <div className="bg-red-900/40 border border-red-500/50 p-3 rounded-xl text-[11px] text-red-100 mb-4 flex flex-col gap-2">
                                                <div className="flex items-start gap-2">
                                                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                                    <span className="leading-tight font-bold">{geminiError || localError}</span>
                                                </div>
                                                {((localError || '').includes('Permission Denied') || (localError || '').includes('lock icon')) && (
                                                    <div className="bg-black/40 p-3 rounded-lg border border-red-500/30 mt-1 space-y-2 text-left">
                                                        <p className="font-bold text-[10px] text-red-300 uppercase tracking-widest">How to fix this:</p>
                                                        <ol className="list-decimal list-inside space-y-1.5 text-white/80 pl-1">
                                                            <li>Look at the top URL address bar.</li>
                                                            <li>Click the <span className="inline-block bg-white/10 px-1 rounded mx-0.5 shadow-sm">🔒 lock icon</span> left of the URL.</li>
                                                            <li>Find <strong>Microphone</strong> &amp; change to <strong>Allow</strong>.</li>
                                                            <li>Refresh this page.</li>
                                                        </ol>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {!hasPermission ? (
                                            <button
                                                onClick={requestPermission}
                                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                                            >
                                                <Mic size={16} /> Grant Mic Permission
                                            </button>
                                        ) : (
                                            <div className="space-y-4">
                                                {isRefreshingMics ? (
                                                    <div className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[10px] flex items-center gap-2 text-white/40 italic">
                                                        <Loader2 size={12} className="animate-spin" />
                                                        Refreshing hardware list...
                                                    </div>
                                                ) : null}

                                                <div className="relative group">
                                                    <select
                                                        value={selectedDeviceId || 'default'}
                                                        onChange={(e) => {
                                                            const newVal = e.target.value;
                                                            addLog(`Mic change: ${newVal}`);
                                                            setSelectedDeviceId(newVal);
                                                            startMicMeter(newVal);
                                                        }}
                                                        className="w-full bg-slate-800 text-white px-4 py-3 rounded-xl border border-white/20 text-sm focus:outline-none focus:border-emerald-400 min-h-[50px] cursor-pointer appearance-none shadow-inner"
                                                        style={{ display: 'block', minHeight: '50px', backgroundColor: '#1e293b' }}
                                                    >
                                                        <option value="default" className="bg-slate-800 text-white">System Default Microphone</option>
                                                        {devices && devices.filter((d: any) => d.deviceId && d.deviceId !== 'default').map((d: any) => (
                                                            <option key={d.deviceId} value={d.deviceId} className="bg-slate-800 text-white">
                                                                {d.label || `Microphone (${String(d.deviceId).slice(0, 4)})`}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">
                                                        <ChevronDown size={16} />
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={requestPermission}
                                                    className="w-full text-[10px] text-white/40 hover:text-white flex items-center justify-center gap-1 py-1 uppercase tracking-widest font-bold"
                                                >
                                                    <RefreshCw size={10} /> Full Hardware Refresh
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Signal Test</span>
                                            <span className={`text-[10px] font-bold ${preflightUserMicLevel > 0.01 ? 'text-emerald-400' : 'text-red-400 animate-pulse'}`}>
                                                {preflightUserMicLevel > 0.01 ? 'DETECTED' : 'QUIET'}
                                            </span>
                                        </div>
                                        <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/10 relative">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                                animate={{ width: `${preflightUserMicLevel * 100}%` }}
                                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={handleStartSession}
                                    className="group px-12 py-5 rounded-full font-bold text-lg shadow-2xl transition-all flex items-center gap-3 bg-white text-royal-blue hover:scale-105 active:scale-95 relative z-[110]"
                                >
                                    <Sparkles size={20} className="group-hover:animate-spin" />
                                    Launch AI Link
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {status === 'CONNECTING' && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 flex flex-col items-center justify-center bg-royal-blue/90 backdrop-blur-xl text-white gap-4 p-8 text-center z-[110]"
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl animate-pulse" />
                                <Loader2 size={64} className="animate-spin text-white relative z-10" />
                            </div>
                            <div className="space-y-2">
                                <p className="font-serif italic text-3xl drop-shadow-lg">Handshaking...</p>
                                <p className="text-[10px] uppercase tracking-[0.4em] text-white/70 font-mono animate-pulse">{geminiStatus}</p>
                            </div>
                        </motion.div>
                    )}

                    {status === 'ERROR' && (
                        <motion.div
                            initial={{ scale: 1.1, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.1, opacity: 0 }}
                            className="absolute inset-0 flex flex-col items-center justify-center bg-red-600/90 backdrop-blur-2xl text-white p-8 text-center gap-8 z-[120]"
                        >
                            <div className="bg-white/10 p-6 rounded-full ring-8 ring-white/5 animate-bounce">
                                <AlertCircle size={64} />
                            </div>
                            <div className="space-y-4 max-w-md">
                                <h4 className="text-3xl font-bold tracking-tight uppercase">Link Failed</h4>
                                <div className="bg-black/30 p-5 rounded-2xl border border-white/10 text-xs font-mono break-words leading-relaxed text-red-100">
                                    {displayError || "Fatal handshake disconnect."}
                                </div>
                            </div>
                            <button
                                onClick={handleResetOnError}
                                className="group flex items-center gap-3 bg-white text-red-600 px-12 py-4 rounded-full font-bold text-xl hover:bg-white/90 shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all active:scale-95"
                            >
                                <RefreshCw size={24} className="group-hover:rotate-180 transition-transform duration-500" />
                                Reset & Re-Attempt
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Diagnostic Panel */}
            {!hasSessionEnded && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <div className="bg-gray-100/90 backdrop-blur-sm border-2 border-emerald-500/30 rounded-3xl p-6 shadow-lg space-y-5">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-gray-300'}`} />
                            Live Signal Monitors
                        </span>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                <span className="flex items-center gap-1.5"><Info size={10} /> Glo (Output)</span>
                                <span className="text-royal-blue">{(volume * 100).toFixed(0)}%</span>
                            </div>
                            <div className="h-4 bg-gray-200/50 rounded-full overflow-hidden border border-black/5 p-0.5">
                                <motion.div
                                    className="h-full bg-royal-blue shadow-[0_0_15px_rgba(46,76,255,0.4)] rounded-full"
                                    animate={{ width: `${volume * 100}%` }}
                                    transition={{ type: 'spring', damping: 15 }}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                <span className="flex items-center gap-1.5"><Mic size={10} /> Your (Input)</span>
                                <span className="text-emerald-600">{(currentMicLevel * 100).toFixed(0)}%</span>
                            </div>
                            <div className="h-4 bg-gray-200/50 rounded-full overflow-hidden border border-black/5 p-0.5">
                                <motion.div
                                    className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] rounded-full"
                                    animate={{ width: `${currentMicLevel * 100}%` }}
                                    transition={{ type: 'spring', damping: 15 }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col h-[220px]">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
                        <div className="flex items-center gap-2">
                            <Info size={12} className="text-royal-blue" />
                            <span className="text-[11px] font-bold text-white/70 uppercase tracking-widest">System Telemetry</span>
                        </div>
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500/50 animate-pulse" />
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 animate-pulse" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto space-y-1.5 font-mono text-[10px] text-emerald-400/80 scrollbar-hide">
                        {debugLogs.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-white/10 space-y-2">
                                <Loader2 size={24} className="animate-spin-slow opacity-20" />
                                <p className="italic text-[10px]">Ready for link...</p>
                            </div>
                        )}
                        {debugLogs.map((log, i) => (
                            <div key={i} className="flex gap-3 border-l-2 border-emerald-500/20 pl-3 py-0.5 hover:bg-white/5 transition-colors group/log">
                                <span className="text-white/10 select-none font-bold group-hover/log:text-white/30">{debugLogs.length - i}</span>
                                <span className="break-words leading-tight uppercase font-light">{log}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            )}
        </div>

            {hasSessionEnded && (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    transition={{ delay: 0.5, duration: 1 }} 
                    className="fixed inset-0 z-[150] bg-[#f8fafc] overflow-y-auto w-full h-[100dvh]"
                >
                    <div className="min-h-screen pt-40 pb-20 px-4 md:px-0 relative z-10 w-full flex items-start justify-center">
                        <PostGloClose firstName={context?.candidateName?.split(' ')[0] || 'there'} />
                    </div>
                </motion.div>
            )}
        </>
    );
};
