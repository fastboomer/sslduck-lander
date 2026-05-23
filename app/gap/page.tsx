'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GapIntake } from '@/app/components/GapIntake';
import { Footer } from '@/app/components/Footer';
import { motion } from 'framer-motion';
import { ShieldCheck, Search, FileText, Zap } from 'lucide-react';

export default function GapAnalysisPage() {
    const router = useRouter();

    const handleSuccess = (data: { reportId: string }) => {
        router.push(`/gap/success?reportId=${data.reportId}`);
    };

    return (
        <main className="min-h-screen bg-background">
            <nav className="flex items-center justify-center px-10 py-4 border-b-2 border-royal-blue bg-white sticky top-0 z-50">
                <a href="https://sslduck-lander.vercel.app" className="flex items-center gap-2.5 no-underline cursor-pointer">
                    <img src="/logo.png" alt="SSLDuck Logo" className="h-10 w-auto" />
                    <div className="flex flex-col">
                        <span className="text-[17px] font-black text-royal-blue tracking-tighter leading-none font-serif">SSLDUCK</span>
                        <span className="text-[8px] font-bold text-royal-blue/40 tracking-[0.2em] uppercase mt-0.5">VERSION 12-PRO</span>
                    </div>
                </a>
            </nav>
            <div className="pt-16 pb-20 px-6">
                <div className="max-w-7xl mx-auto">
                    {/* Header Section */}
                    <div className="text-center mb-20 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 bg-royal-blue/10 px-4 py-2 rounded-full text-royal-blue text-xs font-bold uppercase tracking-widest border border-royal-blue/10"
                        >
                            <ShieldCheck size={14} />
                            Elite Career Auditing
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-5xl md:text-7xl font-serif font-bold text-royal-blue leading-tight"
                        >
                            The Gap Analysis <br />
                            <span className="italic text-royal-blue/60">Narrative Reclamation</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-xl text-royal-blue/60 font-sans max-w-2xl mx-auto leading-relaxed"
                        >
                            Transform technical shortcomings into strategic advantages. Our AI-driven audit
                            maps the distance between your current profile and your target C-suite role.
                        </motion.p>
                    </div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
                        {[
                            { icon: <Search size={24} />, title: "Search Grounded", desc: "Live research into target company goals, problems, and recent financials." },
                            { icon: <FileText size={24} />, title: "Pattern Analysis", desc: "Surgical comparison between your history and their requirements." },
                            { icon: <Zap size={24} />, title: "Pivot Strategies", desc: "Specific talking points to turn missing skills into transferable wins." }
                        ].map((feat, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + (i * 0.1) }}
                                className="bg-white/50 backdrop-blur-md border border-royal-blue/10 rounded-2xl p-8 hover:shadow-xl transition-all border-b-4 border-b-royal-blue/20"
                            >
                                <div className="text-royal-blue mb-4">{feat.icon}</div>
                                <h3 className="text-lg font-serif font-bold text-royal-blue mb-2">{feat.title}</h3>
                                <p className="text-sm text-royal-blue/60 leading-relaxed font-sans">{feat.desc}</p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Intake Form */}
                    <GapIntake onSuccess={handleSuccess} />

                    {/* Trust Footer */}
                    <div className="mt-20 text-center space-y-4">
                        <p className="text-[10px] text-royal-blue/40 font-mono uppercase tracking-[0.2em]">
                            Processed via Gemini 1.5 Pro • SSLDUCK Intelligence • Blue Ridge Tech Family
                        </p>
                    </div>
                </div>
            </div>
            <Footer />
        </main>
    );
}
