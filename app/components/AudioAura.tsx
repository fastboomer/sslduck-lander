'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AudioAuraProps {
    isActive: boolean;
    volume: number; // 0 to 1
}

export const AudioAura: React.FC<AudioAuraProps> = ({ isActive, volume }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: { x: number; y: number; size: number; speedX: number; speedY: number; opacity: number }[] = [];

        const initParticles = () => {
            particles = [];
            for (let i = 0; i < 50; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 2 + 1,
                    speedX: (Math.random() - 0.5) * 1,
                    speedY: (Math.random() - 0.5) * 1,
                    opacity: Math.random() * 0.5 + 0.1
                });
            }
        };

        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            initParticles();
        };

        window.addEventListener('resize', resize);
        resize();

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (!isActive) {
                animationFrameId = requestAnimationFrame(draw);
                return;
            }

            // Layered central glow for depth
            const gradient1 = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, 0,
                canvas.width / 2, canvas.height / 2, (canvas.width / 2) * (0.4 + volume * 0.6)
            );
            gradient1.addColorStop(0, 'rgba(46, 76, 255, 0.5)'); // Royal Blue
            gradient1.addColorStop(0.5, 'rgba(147, 51, 234, 0.2)'); // Purple hint
            gradient1.addColorStop(1, 'rgba(46, 76, 255, 0)');

            ctx.fillStyle = gradient1;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Reactive pulse rings
            [0.8, 1.1, 1.4].forEach((scale, i) => {
                ctx.beginPath();
                const radius = (canvas.width / 3.5) * (scale + volume * 0.3);
                ctx.arc(canvas.width / 2, canvas.height / 2, radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(46, 76, 255, ${0.15 + volume * (0.4 / (i + 1))})`;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            });

            // Energetic Particles
            particles.forEach(p => {
                p.x += p.speedX * (1 + volume * 8);
                p.y += p.speedY * (1 + volume * 8);

                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                const opacity = p.opacity * (0.3 + volume * 0.7);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * (1 + volume * 0.5), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                ctx.fill();

                // Subtle tail for moving particles
                if (volume > 0.2) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x - p.speedX * 10 * volume, p.y - p.speedY * 10 * volume);
                    ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.5})`;
                    ctx.stroke();
                }
            });

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [isActive, volume]);

    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-[40px]">
            <canvas
                ref={canvasRef}
                className="w-full h-full"
            />

            {/* Apple Intelligence style perimeter glow */}
            <AnimatePresence>
                {isActive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 rounded-[40px]"
                    >
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-blue-600/30 via-purple-600/10 to-transparent blur-2xl animate-pulse" />
                        <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-[1px]" />
                        <motion.div
                            animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 10, repeat: Infinity }}
                            className="absolute -inset-10 border-[10px] border-royal-blue/10 rounded-full blur-3xl"
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
