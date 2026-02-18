'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export const GloVideo: React.FC = () => {
    const [isMobile, setIsMobile] = useState(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const checkDevice = () => {
            const width = window.innerWidth;
            setIsMobile(width < 768);

            // Robust iPad/Touch detection:
            // Modern iPads often report as "MacIntel" but have touch points.
            const isIPad = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

            setIsTouchDevice(isIPad || 'ontouchstart' in window || navigator.maxTouchPoints > 0);
        };

        checkDevice();
        window.addEventListener('resize', checkDevice);
        return () => window.removeEventListener('resize', checkDevice);
    }, []);

    const toggleMute = () => {
        if (videoRef.current) {
            const newMuted = !videoRef.current.muted;
            videoRef.current.muted = newMuted;
            setIsMuted(newMuted);

            // Lip Sync Fix: When unmuting, briefly recalibrate the stream
            if (!newMuted) {
                const currentTime = videoRef.current.currentTime;
                videoRef.current.pause();
                videoRef.current.currentTime = currentTime;
                videoRef.current.play().catch(e => console.log("Sync handled", e));
            }
        }
    };

    const landscapeUrl = "https://firebasestorage.googleapis.com/v0/b/fasth-lander-2026-v2.firebasestorage.app/o/GLO%20VIDEOS%2FThe%20Obvious%20Choice%20with%20Glo%20(Landscape)_1080p_caption.mp4?alt=media&token=673d0623-cc18-4c76-9229-dfdf6f4da67d&v=2.2";
    const portraitUrl = "https://firebasestorage.googleapis.com/v0/b/fasth-lander-2026-v2.firebasestorage.app/o/GLO%20VIDEOS%2F1-The%20Obvious%20Choice%20with%20Glo_1080p_caption.mp4?alt=media&token=26b0fc2d-bc32-4544-9878-9e6e75e206a3&v=2.2";

    return (
        <div className="glass max-w-4xl mx-auto p-2 overflow-hidden rounded-3xl flex items-center justify-center relative group">
            {/* Version Tag - Blue/Bold for v2.3 differentiation */}
            <div className="absolute top-6 left-6 z-50 bg-blue-600 text-white px-3 py-1.5 rounded-full text-[12px] font-black shadow-2xl pointer-events-none">
                DEPLOY-V2.3-ULTRASONIC
            </div>

            <video
                ref={videoRef}
                key={isMobile ? 'portrait' : 'landscape'}
                controls
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                className={`w-full h-auto ${isMobile ? 'max-w-[320px] md:max-w-none' : ''} rounded-xl shadow-2xl transition-all duration-300`}
                src={isMobile ? portraitUrl : landscapeUrl}
            >
                Your browser does not support the video tag.
            </video>

            {/* Unmute Overlay Button - Pushed further left for verification */}
            <button
                id="unmute-btn-v23"
                onClick={toggleMute}
                className={`absolute bottom-10 right-32 md:right-48 bg-green-500 hover:bg-green-400 text-black p-3 rounded-full transition-all duration-300 z-50 shadow-2xl border-2 border-white
                    ${isTouchDevice ? 'opacity-100 scale-125' : 'opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95'}`}
                title={isMuted ? "Unmute" : "Mute"}
            >
                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>

            {/* Pulsing Hint - Shows only when muted */}
            {isMuted && (
                <div
                    onClick={toggleMute}
                    className="absolute inset-0 flex items-center justify-center cursor-pointer pointer-events-none z-40"
                >
                    <div className="bg-royal-blue/90 border-2 border-white/40 backdrop-blur-md text-white px-6 py-3 rounded-full text-base font-black animate-pulse pointer-events-auto opacity-0 group-hover:opacity-100 transition-all duration-500 shadow-2xl">
                        CONFIRM UNMUTE (V2.3)
                    </div>
                </div>
            )}
        </div>
    );
};

