'use client';

import React, { useState, useRef } from 'react';
import { Volume2, VolumeX, Play } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION — Update VIDEO_URL after uploading to Firebase Storage
// Thumbnail is served from /public/six-mistakes-thumbnail.png
// ─────────────────────────────────────────────────────────────────────────────
const VIDEO_URL = 'https://firebasestorage.googleapis.com/v0/b/fasth-lander-2026-v2.firebasestorage.app/o/GLO%20VIDEOS%2Fsix-mistakes-to-avoid-like-the-plague.mp4?alt=media&token=0fd4f8fa-c9be-4731-8ecc-4569be60388d';
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

                    {/* ── Custom Floating Mute/Unmute Speaker Icon ── */}
                    {hasStarted && (
                        <button
                            onClick={toggleMute}
                            className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/85 backdrop-blur-md text-white p-2.5 rounded-full transition-all duration-300 z-10 shadow-lg border border-white/10 hover:scale-110 active:scale-95 flex items-center justify-center"
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                    )}
                </div>

                {/* Subtle background blobs — matches the ResumeOfferCard style */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-royal-blue/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-royal-blue/5 rounded-full blur-3xl" />
            </div>
        </div>
    );
};
