'use client';

import React, { useState, useRef } from 'react';
import { Volume2, VolumeX, Play, RotateCcw, RotateCw } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION — Update VIDEO_URL after uploading to Firebase Storage
// Thumbnail is served from /public/six-mistakes-thumbnail.png
// ─────────────────────────────────────────────────────────────────────────────
const VIDEO_URL = 'https://firebasestorage.googleapis.com/v0/b/fasth-lander-2026-v2.firebasestorage.app/o/GLO%20VIDEOS%2Fsix-resume-mistakes-avoid-like-plague-shortened-thumbnail.mp4?alt=media&token=327daa2c-7b9e-464f-a2c6-b4c2c8b152ce';
const THUMBNAIL_URL = '/six-mistakes-thumbnail.png.png';

export const SixMistakesVideo: React.FC = () => {
    const [hasStarted, setHasStarted] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const handlePlay = () => {
        setHasStarted(true);
        setIsPlaying(true);
        if (videoRef.current) {
            videoRef.current.muted = isMuted;
            videoRef.current.play().catch(() => {});
        }
    };

    const togglePlayPause = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
                setIsPlaying(false);
            } else {
                videoRef.current.play().catch(() => {});
                setIsPlaying(true);
            }
        }
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
            const newMuted = !videoRef.current.muted;
            videoRef.current.muted = newMuted;
            setIsMuted(newMuted);
        }
    };

    const skipBack = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
        }
    };

    const skipForward = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
            videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 10);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-6 pb-12">
            <div className="bg-white rounded-[40px] p-8 md:p-12 border border-royal-blue/10 shadow-xl relative overflow-hidden">

                {/* Section label — same style as "Today's Free Feature!" card */}
                <style dangerouslySetInnerHTML={{__html: `
                    @import url('https://fonts.googleapis.com/css2?family=Rubik:ital,wght@1,900&display=swap');
                `}} />

                <h2 style={{
                    color: '#FF0000',
                    fontSize: '24px',
                    fontStyle: 'italic',
                    fontWeight: 900,
                    fontFamily: "'Rubik', system-ui, sans-serif",
                    letterSpacing: '-0.02em',
                    marginBottom: '8px',
                }}>
                    Must-Watch Before Sending Your Resume!
                </h2>

                <p style={{
                    fontSize: '15px',
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    color: '#444',
                    marginBottom: '24px',
                    lineHeight: '1.5',
                }}>
                    Six resume mistakes that silently kill your chances — even when you&apos;re the most qualified candidate in the room.
                </p>

                {/* Responsive video container */}
                <div
                    className="relative w-full rounded-2xl overflow-hidden shadow-2xl cursor-pointer group"
                    style={{ aspectRatio: '16/9', background: '#000' }}
                    onClick={!hasStarted ? handlePlay : togglePlayPause}
                >
                    {/* ── Video is always in the DOM so the browser pre-buffers it ── */}
                    <video
                        ref={videoRef}
                        controls={false}
                        playsInline
                        preload="auto"
                        className="w-full h-full object-cover"
                        src={VIDEO_URL}
                        poster={THUMBNAIL_URL}
                        style={{ display: hasStarted ? 'block' : 'none' }}
                    >
                        Your browser does not support the video tag.
                    </video>

                    {/* ── Thumbnail + play button overlay (shown until clicked) ── */}
                    {!hasStarted && (
                        <>
                            <img
                                src={THUMBNAIL_URL}
                                alt="Six Resume Mistakes to Avoid Like the Plague"
                                className="w-full h-full object-cover"
                            />
                            {/* Dark overlay */}
                            <div className="absolute inset-0 bg-black/30 hover:bg-black/20 transition-colors duration-300" />
                            {/* Play button */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div
                                    className="w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-transform duration-200 hover:scale-110 active:scale-95"
                                    style={{
                                        background: 'linear-gradient(135deg, #1a3a8f, #2563eb)',
                                        border: '3px solid rgba(255,255,255,0.6)',
                                    }}
                                >
                                    {/* Triangle play icon */}
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="white"
                                        className="w-9 h-9 ml-1"
                                    >
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </div>
                            </div>
                            {/* Title badge */}
                            <div className="absolute bottom-4 left-4 right-4">
                                <div
                                    className="inline-block text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
                                    style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
                                >
                                    Free Training Video
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── Centered Play icon overlay when paused during playback ── */}
                    {hasStarted && !isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-300">
                            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-xl animate-pulse">
                                <Play className="w-8 h-8 text-white fill-white ml-1" />
                            </div>
                        </div>
                    )}

                    {/* ── Custom Floating Control Bar ── */}
                    {hasStarted && (
                        <div 
                            className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full z-10 shadow-lg border border-white/10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Skip Back 10s */}
                            <button
                                onClick={skipBack}
                                className="text-white/80 hover:text-white p-1.5 rounded-full transition-all duration-200 hover:bg-white/10 active:scale-90 flex items-center justify-center"
                                title="Back 10 seconds"
                            >
                                <RotateCcw className="w-4.5 h-4.5" />
                            </button>

                            {/* Sound Mute/Unmute */}
                            <button
                                onClick={toggleMute}
                                className="text-white hover:text-white/90 p-1.5 rounded-full transition-all duration-200 hover:bg-white/10 active:scale-90 flex items-center justify-center border-x border-white/10 px-2.5"
                                title={isMuted ? "Unmute" : "Mute"}
                            >
                                {isMuted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
                            </button>

                            {/* Skip Forward 10s */}
                            <button
                                onClick={skipForward}
                                className="text-white/80 hover:text-white p-1.5 rounded-full transition-all duration-200 hover:bg-white/10 active:scale-90 flex items-center justify-center"
                                title="Forward 10 seconds"
                            >
                                <RotateCw className="w-4.5 h-4.5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Subtle background blobs — matches the ResumeOfferCard style */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-royal-blue/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-royal-blue/5 rounded-full blur-3xl" />
            </div>
        </div>
    );
};
