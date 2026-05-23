'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export const GapCircleCTA: React.FC = () => {
    return (
        <div className="flex justify-center items-center py-12">
            <Link href="/fulfillment/gap-analysis">
                <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                    className="relative w-48 h-48 cursor-pointer group"
                >
                    {/* The 65% Transparent Red Circle */}
                    <div className="absolute inset-0 bg-red-600/65 rounded-full shadow-2xl backdrop-blur-sm border-4 border-white/20 flex items-center justify-center transition-all group-hover:bg-red-600/80">
                        <span className="text-4xl font-black text-white tracking-tighter">GAP</span>
                    </div>

                    {/* SVG for Curved Text */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                        <defs>
                            <path
                                id="topCurve"
                                d="M 20,50 A 30,30 0 1,1 80,50"
                                fill="transparent"
                            />
                            <path
                                id="bottomCurve"
                                d="M 20,50 A 30,30 0 1,0 80,50"
                                fill="transparent"
                            />
                        </defs>
                        <text className="text-[8px] font-black uppercase tracking-[0.2em] fill-white/90">
                            <textPath href="#topCurve" startOffset="50%" textAnchor="middle">
                                Get Your
                            </textPath>
                        </text>
                        <text className="text-[10px] font-black uppercase tracking-[0.3em] fill-white">
                            <textPath href="#bottomCurve" startOffset="50%" textAnchor="middle">
                                FREE
                            </textPath>
                        </text>
                    </svg>

                    {/* Outer Rings */}
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-[-10px] border border-red-600/20 rounded-full"
                    />
                    <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-[-20px] border border-royal-blue/10 rounded-full"
                    />
                </motion.div>
            </Link>
        </div>
    );
};
