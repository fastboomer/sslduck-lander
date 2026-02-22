'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, MessageSquare, ArrowRight, Play, Sparkles } from 'lucide-react';
import { Suspense } from 'react';
import { GloLiveHub } from '../../components/GloLiveHub';
import Header from '../../components/Header';
import { Footer } from '../../components/Footer';
import { getDoc } from 'firebase/firestore';

function GapSuccessContent() {
    const searchParams = useSearchParams();
    const reportId = searchParams.get('reportId');
    const [candidateName, setCandidateName] = useState('Candidate');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!reportId) return;
        const fetchReport = async () => {
            try {
                const res = await fetch(`/api/gap-analysis/context/${reportId}`);
                if (res.ok) {
                    const data = await res.json();
                    setCandidateName(data.candidateName || 'Candidate');
                }
            } catch (err) {
                console.error("Error fetching report context:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchReport();
    }, [reportId]);

    const firstName = candidateName.split(' ')[0];

    // const handleGloConnect = () => {
    //     if (!gloConsent || !gloName) return;
    //     // Logic to initiate Glo (Vapi/Retell) would go here
    //     alert(`Connecting ${gloName} with Glo... (Vapi/Retell Bridge Active)`);
    // };

    return (
        <main className="min-h-screen bg-background">
            <Header />
            <div className="pt-32 pb-20 px-6">
                <div className="max-w-4xl mx-auto space-y-12">

                    {/* Success Banner */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white border border-gray-200 shadow-xl rounded-3xl p-8 md:p-12"
                    >
                        <div className="flex flex-col md:flex-row gap-10 items-start">
                            <div className="space-y-6 flex-1">
                                <div className="flex items-center gap-4">
                                    <div className="bg-emerald-500 text-white p-3 rounded-full shadow-lg">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <h2 className="text-3xl font-serif font-bold text-royal-blue">Analysis Dispatched!</h2>
                                </div>

                                <div className="prose prose-slate bg-royal-blue/[0.02] p-8 rounded-2xl border border-royal-blue/5 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-royal-blue/20" />
                                    <div className="space-y-4 text-royal-blue/80 leading-relaxed font-sans">
                                        <p className="font-bold text-royal-blue uppercase tracking-tighter text-xs">Memo: From Glenn; To: {firstName}</p>
                                        <p>Hi {firstName}, we have received your resume and target job. The full GAP analysis is a product of both AI and my personal review.</p>
                                        <p>On average you should hear from me in 24-48 hours as I limit the number of free offers in any given week. However, it's possible for you to access very valuable <strong>instant information</strong> right now!</p>
                                        <p>Click the green button and you can talk with my super smart AI assistant, Glo. As you read this, Glo is already evaluating your professional profile against the job requirements you submitted and your resume.</p>
                                        <p className="italic">"I have placed a time limitation on her conversation, but she has already signaled an internal ATS score and can definitely provide you with some interesting input."</p>
                                        <p>If you like, click the green button and enjoy your conversation. I will be in touch in the next 24-48 hours.</p>
                                        <p className="font-serif font-bold">Positive thoughts, Glenn</p>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full md:w-[400px]">
                                {reportId && <GloLiveHub reportId={reportId} />}
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
            </div>
            <Footer />
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
