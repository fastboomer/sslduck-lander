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
    const [salesContent] = useState({
        headline: "Your Report is In Glenn's Inbox.",
        subheadline: "Accelerate your transition with our Elite Narrative Reclamation Service.",
        salesCopy: "Our team takes the GAP data and manually crafts a bespoke resume and cover letter package that removes every hurdle identified in the audit.",
        buttonText: "Schedule Strategy Call",
        buttonLink: "#"
    });

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
                    className="bg-white border border-gray-200 shadow-xl rounded-3xl p-12 flex flex-col items-center gap-8 text-center"
                >
                    <div className="bg-emerald-500 text-white p-6 rounded-full shadow-lg">
                        <CheckCircle2 size={48} />
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-4xl font-serif font-bold text-royal-blue">Analysis Dispatched!</h2>
                        <p className="text-xl text-royal-blue/70 font-sans max-w-2xl leading-relaxed">
                            Your comprehensive GAP report has been successfully generated and sent to our team for final verification.
                        </p>
                        <div className="bg-royal-blue/5 p-6 rounded-2xl border border-royal-blue/10 mt-8">
                            <p className="text-royal-blue font-bold uppercase tracking-widest text-sm mb-2">What Happens Next?</p>
                            <p className="text-royal-blue/60 text-sm">
                                Check your email inbox. You will receive the full narrative audit and your strategic roadmap within 24 hours.
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Return Home */}
                <div className="text-center pt-8">
                    <a
                        href="/"
                        className="inline-flex items-center gap-2 text-royal-blue font-bold uppercase tracking-widest hover:gap-4 transition-all group"
                    >
                        Return to Dashboard
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </a>
                </div>

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
