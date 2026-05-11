'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { Suspense } from 'react';
import { GloLiveHub } from '../../components/GloLiveHub';
import Header from '../../components/Header';
import { Footer } from '../../components/Footer';

function GapSuccessContent() {
    const searchParams = useSearchParams();
    const reportId = searchParams.get('reportId');
    const [candidateName, setCandidateName] = useState('Candidate');
    const [isLoading, setIsLoading] = useState(true);
    // Full context passed to GloLiveHub so it skips its own duplicate fetch
    const [gloContext, setGloContext] = useState<any>(null);

    useEffect(() => {
        if (!reportId) return;
        const fetchReport = async () => {
            try {
                const res = await fetch(`/api/gap-analysis/context/${reportId}`);
                if (res.ok) {
                    const data = await res.json();
                    setCandidateName(data.candidateName || 'Candidate');
                    setGloContext(data); // Pass full context to GloLiveHub
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
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
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

                                <div className="prose prose-slate bg-royal-blue/[0.02] p-8 rounded-3xl border-2 border-royal-blue/10 relative overflow-hidden shadow-inner">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-royal-blue/20" />
                                    <div className="space-y-6 text-royal-blue/80 leading-relaxed font-sans text-sm">
                                        <div className="space-y-1">
                                            <p className="font-bold text-royal-blue uppercase tracking-widest text-[10px] opacity-60">Memo: From Glenn; To: {firstName}</p>
                                            <div className="h-px w-full bg-royal-blue/10" />
                                        </div>

                                        <p>Hi <span className="font-bold text-royal-blue">{firstName}</span>, we have received your resume and target job. The full GAP analysis is a product of both AI and my personal review. Watch your email!</p>

                                        <p>You can also access very valuable <span className="font-bold text-royal-blue underline italic">instant information</span> right now! Just watch your screen!</p>

                                        <p>Click the &ldquo;Talk to Glo&rdquo; button and you can talk with my super smart AI assistant, Glo. As you read this, Glo is already evaluating your professional profile against the job narrative. She&apos;s looking for any key gaps you can exploit!</p>

                                        <div className="pt-4">
                                            <p className="font-serif font-bold text-royal-blue text-lg italic">Positive thoughts,<br />Glenn</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full md:w-[450px] shrink-0">
                                {reportId && (
                                    <GloLiveHub reportId={reportId} initialContext={gloContext} />
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* Sales Presentation Section */}
                    <div className="space-y-16 py-12">
                        <div className="text-center space-y-4">
                            <h2 className="text-4xl md:text-5xl font-serif font-bold text-royal-blue">Your Career is Too Important <br /><span className="italic text-royal-blue/60">to Leave to Chance.</span></h2>
                            <p className="text-lg text-royal-blue/60 max-w-2xl mx-auto">While you wait for your GAP analysis, consider our premium resume reconstruction service.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                {
                                    title: "ATS Optimization",
                                    desc: "We rewrite your history to satisfy the algorithms while compelling the humans."
                                },
                                {
                                    title: "Narrative Strategy",
                                    desc: "Direct-to-CEO storytelling that positions you as the solution, not just a hire."
                                },
                                {
                                    title: "Full Executive Rebrand",
                                    desc: "LinkedIn, Resume, and Bio overhaul for the serious career climber."
                                }
                            ].map((pkg, i) => (
                                <motion.div
                                    key={i}
                                    whileHover={{ y: -10 }}
                                    className="bg-white border border-royal-blue/10 p-8 rounded-[40px] shadow-xl space-y-6 flex flex-col"
                                >
                                    <h3 className="text-xl font-bold text-royal-blue">{pkg.title}</h3>
                                    <p className="text-sm text-royal-blue/60 leading-relaxed flex-1">{pkg.desc}</p>
                                </motion.div>
                            ))}
                        </div>

                        <div className="bg-royal-blue text-white rounded-[50px] p-12 overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                            <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                                <div className="space-y-6 flex-1 text-center md:text-left">
                                    <h3 className="text-3xl md:text-4xl font-serif font-bold">Why SSLDUCK?</h3>
                                    <p className="text-white/80 leading-relaxed">We don't just "fix formatting." We perform surgical gap analysis to ensure your value proposition is undeniable to the world's most elite employers.</p>
                                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                        {["98% Success Rate", "48hr Turnaround", "Elite Strategists"].map((tag, i) => (
                                            <span key={i} className="bg-white/10 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="shrink-0">
                                    <a
                                        href={reportId ? `/gap-analysis/offer?reportId=${reportId}` : '/gap-analysis/offer'}
                                        className="bg-white text-royal-blue px-12 py-5 rounded-full font-bold text-xl hover:scale-105 active:scale-95 transition-all shadow-2xl inline-block text-center"
                                    >Book My Rewrite</a>
                                </div>
                            </div>
                        </div>
                    </div>

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
