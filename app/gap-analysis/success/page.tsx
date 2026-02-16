'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, MessageSquare, ArrowRight, Play, Sparkles } from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

import { Suspense } from 'react';

function GapSuccessContent() {
    const searchParams = useSearchParams();
    const reportId = searchParams.get('reportId');

    const [gloName, setGloName] = useState('');
    const [gloConsent, setGloConsent] = useState(false);
    const [salesContent, setSalesContent] = useState({
        headline: "Your Report is In Glenn's Inbox.",
        subheadline: "Accelerate your transition with our Elite Narrative Reclamation Service.",
        salesCopy: "Our team takes the GAP data and manually crafts a bespoke resume and cover letter package that removes every hurdle identified in the audit.",
        buttonText: "Schedule Strategy Call",
        buttonLink: "#"
    });

    // Listen to Admin-controlled sales content
    useEffect(() => {
        if (!db) return;
        const unsubscribe = onSnapshot(doc(db, 'settings', 'gapSuccessPage'), (snapshot) => {
            if (snapshot.exists()) {
                setSalesContent(snapshot.data() as any);
            }
        });
        return () => unsubscribe();
    }, []);

    const handleGloConnect = () => {
        if (!gloConsent || !gloName) return;
        // Logic to initiate Glo (Vapi/Retell) would go here
        alert(`Connecting ${gloName} with Glo... (Vapi/Retell Bridge Active)`);
    };

    return (
        <main className="min-h-screen bg-background pt-32 pb-20 px-6">
            <div className="max-w-4xl mx-auto space-y-12">

                {/* Success Banner */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white border border-gray-200 shadow-sm rounded-3xl p-8 flex flex-col md:flex-row items-center gap-6 text-center md:text-left"
                >
                    <div className="bg-royal-blue text-white p-4 rounded-full shadow-lg">
                        <CheckCircle2 size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-serif font-bold text-royal-blue">Analysis Complete!</h2>
                        <p className="text-royal-blue/60 font-sans">Your report has been sent to Glenn for review. You will receive an email at the address provided within 24 hours with your full roadmap to winning this role.</p>
                    </div>
                </motion.div>

                {/* Glo Connection Box */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-royal-blue text-white rounded-3xl p-10 shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <MessageSquare size={120} />
                    </div>

                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-3">
                            <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">Limited Offer</span>
                            <Sparkles size={16} className="text-yellow-400" />
                        </div>

                        <h3 className="text-3xl font-serif font-bold">Talk to Glo: Your AI Career Liaison</h3>
                        <p className="text-soft-lavender/80 font-sans text-lg max-w-xl">
                            Our super smart (but somewhat quirky) spokes-avatar is ready to discuss your specific GAP report.
                            Interactive voice session—no typing required.
                        </p>

                        <div className="flex flex-col md:flex-row gap-4 pt-4">
                            <input
                                value={gloName}
                                onChange={(e) => setGloName(e.target.value)}
                                placeholder="Your first name"
                                className="bg-white/10 border border-white/20 px-6 py-4 rounded-xl outline-none focus:ring-2 focus:ring-white/30 text-white placeholder:text-white/40 md:w-64"
                            />
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="gloConsent"
                                    checked={gloConsent}
                                    onChange={(e) => setGloConsent(e.target.checked)}
                                    className="w-5 h-5 rounded border-white/20 bg-white/10"
                                />
                                <label htmlFor="gloConsent" className="text-xs text-soft-lavender/60">Connect me with Glo over voice</label>
                            </div>
                            <button
                                onClick={handleGloConnect}
                                disabled={!gloConsent || !gloName}
                                className="bg-white text-royal-blue px-8 py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-soft-lavender transition-all disabled:opacity-30 flex items-center gap-2 ml-auto"
                            >
                                <Play size={16} fill="currentColor" />
                                Initiate Session
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Sales Presentation */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white/50 backdrop-blur-md border border-royal-blue/10 rounded-3xl p-12 shadow-xl  text-center space-y-8"
                >
                    <div className="space-y-4">
                        <h3 className="text-3xl md:text-4xl font-serif font-bold text-royal-blue leading-tight">
                            {salesContent.headline}
                        </h3>
                        <p className="text-lg text-royal-blue/60 font-sans max-w-2xl mx-auto">
                            {salesContent.subheadline}
                        </p>
                    </div>

                    <div className="prose prose-royal-blue mx-auto text-royal-blue/70">
                        <p>{salesContent.salesCopy}</p>
                    </div>

                    <div className="pt-8">
                        <a
                            href={salesContent.buttonLink}
                            className="inline-flex items-center gap-3 bg-royal-blue text-white px-10 py-5 rounded-2xl font-bold uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all"
                        >
                            {salesContent.buttonText}
                            <ArrowRight size={20} />
                        </a>
                    </div>
                </motion.div>

            </div>
        </main>
    );
}

export default function GapSuccessPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>}>
            <GapSuccessContent />
        </Suspense>
    );
}
