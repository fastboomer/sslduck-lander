'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, PhoneOff, Loader2, Sparkles, AlertCircle, Info, Settings, Settings2, CheckCircle2, X, RefreshCw, Zap } from 'lucide-react';
import { AudioAura } from './AudioAura';
import { useGeminiLive } from '../hooks/useGeminiLive';

interface GloLiveHubProps {
    reportId: string;
}

type SessionStatus = 'IDLE' | 'PREFLIGHT' | 'CONNECTING' | 'ACTIVE' | 'ERROR';

export const GloLiveHub: React.FC<GloLiveHubProps> = ({ reportId }) => {
    const [status, setStatus] = useState<SessionStatus>('IDLE');
    const [context, setContext] = useState<any>(null);
    const [localError, setLocalError] = useState<string | null>(null);
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const [preflightUserMicLevel, setPreflightUserMicLevel] = useState(0);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

    const addLog = useCallback((msg: string) => {
        console.log(`[GLO_UI] ${msg}`);
        setDebugLogs(prev => {
            if (msg.startsWith("HD Pulse") && prev[0]?.startsWith("HD Pulse")) {
                return [msg, ...prev.slice(1)];
            }
            return [msg, ...prev].slice(0, 30);
        });
    }, []);

    const apiKey = (process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY || '').trim();
    const { isActive, startSession: startGemini, stopSession, volume, micPeak, error: geminiError, geminiStatus } = useGeminiLive(apiKey || '', context, addLog);

    // Fetch context on mount
    useEffect(() => {
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

    // Mic Management & Pre-flight
    const micMeterRef = useRef<AudioContext | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);

    const stopMicResources = useCallback(() => {
        if (micMeterRef.current) {
            micMeterRef.current.close().catch(() => { });
            micMeterRef.current = null;
        }
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(t => t.stop());
            micStreamRef.current = null;
        }
    }, []);

    const enumerateMics = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const devs = await navigator.mediaDevices.enumerateDevices();
            const audioIn = devs.filter(d => d.kind === 'audioinput');
            setDevices(audioIn);
            if (audioIn.length > 0 && !selectedDeviceId) {
                setSelectedDeviceId(audioIn[0].deviceId);
            }
            micStreamRef.current = stream;
        } catch (e: any) {
            addLog(`Enum Error: ${e.message}`);
            setLocalError("Microphone access denied.");
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

            const check = () => {
                if (!micMeterRef.current || status !== 'PREFLIGHT') return;
                analyzer.getByteFrequencyData(data);
                const avg = data.reduce((a, b) => a + b) / data.length;
                setPreflightUserMicLevel(avg / 255);
                requestAnimationFrame(check);
            };
            check();
        } catch (e: any) {
            addLog(`Meter Error: ${e.message}`);
        }
    };

    const enterPreflight = () => {
        setLocalError(null);
        setStatus('PREFLIGHT');
        enumerateMics();
        startMicMeter();
    };

    // State Sync - ONLY UPGRADE OR SHOW ERROR. NEVER AUTO-IDLE.
    useEffect(() => {
        if (isActive) {
            setStatus('ACTIVE');
        } else if (geminiError) {
            setStatus('ERROR');
            addLog(`Error detected: ${geminiError}`);
        }
        // Removed the auto-reset to 'IDLE'. The user must manually 'Close' or 'End' to return to IDLE.
    }, [isActive, geminiError, addLog]);

    const handleStartSession = async () => {
        stopMicResources();
        setLocalError(null);
        addLog("AI handshake initiated...");
        setStatus('CONNECTING');
        await startGemini(selectedDeviceId);
    };

    const handleEndSession = useCallback(() => {
        addLog("Manual session termination.");
        stopMicResources();
        stopSession();
        setStatus('IDLE');
        setPreflightUserMicLevel(0);
        setLocalError(null);
    }, [stopSession, stopMicResources, addLog]);

    const handleResetOnError = useCallback(() => {
        addLog("User cleared error state.");
        stopSession();
        setStatus('IDLE');
        setLocalError(null);
    }, [stopSession, addLog]);

    useEffect(() => {
        return () => stopMicResources();
    }, [stopMicResources]);

    const displayError = geminiError || localError;
    const isShowingSessionUI = status === 'CONNECTING' || status === 'ACTIVE' || status === 'ERROR';

    // Mic level is either preflight meter or real-time peak from worklet
    const currentMicLevel = status === 'PREFLIGHT' ? preflightUserMicLevel : (isActive ? micPeak : 0);

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4">
            <div className="relative aspect-square md:aspect-[4/3] rounded-[40px] overflow-hidden bg-royal-blue/10 border border-white/20 shadow-2xl glass group">

                <div className="absolute inset-0">
                    <img
                        src="https://firebasestorage.googleapis.com/v0/b/fasth-lander-2026-v2.firebasestorage.app/o/glo-3-female-human.png?alt=media&token=0ab75fba-deeb-41c4-b62c-2635057b4a8f"
                        alt="Glo"
                        className={`w-full h-full object-cover transition-all duration-1000 ${isActive ? 'scale-105 brightness-110' : 'grayscale-[20%] brightness-90'}`}
                    />
                    <AudioAura isActive={isActive} volume={volume} />

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 z-10">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="text-white font-serif text-2xl font-bold flex items-center gap-2">
                                    Glo <Sparkles size={20} className="text-yellow-400 animate-pulse" />
                                </h3>
                                <p className="text-white/60 text-xs font-medium uppercase tracking-widest flex items-center gap-2">
                                    {isActive ? (
                                        <> <Zap size={10} className="text-emerald-400" /> HD Live Link Active </>
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
                </div>

                <AnimatePresence>
                    {status === 'IDLE' && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm gap-4 z-20"
                        >
                            <button
                                onClick={enterPreflight}
                                className="group relative bg-white text-royal-blue px-10 py-5 rounded-full font-bold text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                            >
                                <Mic size={28} className="group-hover:animate-bounce" />
                                Start AI Link
                                <div className="absolute -inset-2 bg-white/20 rounded-full blur animate-ping pointer-events-none" />
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
                            className="absolute inset-0 flex flex-col items-center justify-center bg-royal-blue/80 backdrop-blur-lg text-white p-8 gap-6 text-center z-20"
                        >
                            <div className="bg-white/10 p-5 rounded-3xl border border-white/20 w-full max-w-sm space-y-4 shadow-3xl">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 text-emerald-300 font-bold uppercase tracking-widest text-[10px]">
                                        <CheckCircle2 size={14} /> Link Calibration
                                    </div>
                                    <button onClick={() => setStatus('IDLE')} className="text-white/40 hover:text-white transition-colors"><X size={20} /></button>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1 text-left">
                                        <label className="text-[10px] font-bold text-white/50 uppercase ml-1">Hardware Input</label>
                                        <select
                                            value={selectedDeviceId}
                                            onChange={(e) => { setSelectedDeviceId(e.target.value); startMicMeter(e.target.value); }}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-emerald-400 appearance-none cursor-pointer hover:bg-black/60 transition-colors"
                                        >
                                            {devices.map(d => (
                                                <option key={d.deviceId} value={d.deviceId} className="bg-slate-900">{d.label || 'Default Sound Input'}</option>
                                            ))}
                                        </select>
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
                                    className="group px-12 py-5 rounded-full font-bold text-lg shadow-2xl transition-all flex items-center gap-3 bg-white text-royal-blue hover:scale-105 active:scale-95"
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
                            className="absolute inset-0 flex flex-col items-center justify-center bg-royal-blue/30 backdrop-blur-sm text-white gap-4 p-8 text-center z-20"
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
                            className="absolute inset-0 flex flex-col items-center justify-center bg-red-600/90 backdrop-blur-2xl text-white p-8 text-center gap-8 z-20"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <div className="bg-gray-100/90 backdrop-blur-sm border-2 border-emerald-500/30 rounded-3xl p-6 shadow-lg space-y-5">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-gray-300'}`} />
                            Live Signal Monitors
                        </span>
                        <div className="flex gap-2 text-[8px] font-bold text-gray-400">
                            <span className={isActive ? 'text-emerald-500' : ''}>PCM_CAPTURE</span>
                            <span>|</span>
                            <span className={isActive ? 'text-blue-500' : ''}>WSS_STREAM</span>
                        </div>
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
        </div>
    );
};
