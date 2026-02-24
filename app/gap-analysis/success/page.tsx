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
    const [hasOptedIn, setHasOptedIn] = useState(false);
    const [userName, setUserName] = useState('');
    const [userConsent, setUserConsent] = useState(false);

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

    useEffect(() => {
        if (candidateName && candidateName !== 'Candidate') {
            setUserName(candidateName);
        }
    }, [candidateName]);

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

                                {/* Glo Opt-in Box */}
                                {!hasOptedIn ? (
                                    <div className="bg-royal-blue/5 border-2 border-royal-blue/10 p-8 rounded-3xl space-y-6">
                                        <div className="flex items-center gap-3 text-royal-blue">
                                            <Sparkles className="animate-pulse" />
                                            <h3 className="text-lg font-bold uppercase tracking-widest">Connect with Glo</h3>
                                        </div>
                                        <p className="text-sm text-royal-blue/70 leading-relaxed">
                                            As I review your report, my AI assistant, **Glo**, is standing by. She's already analyzed your profile against the job requirements and has some instant insights for you.
                                        </p>
                                        <div className="space-y-4">
                                            <div className="bg-white p-6 rounded-2xl border border-royal-blue/5 space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-royal-blue/50 uppercase tracking-widest">Your Name</label>
                                                    <input
                                                        type="text"
                                                        value={userName}
                                                        onChange={(e) => setUserName(e.target.value)}
                                                        className="w-full bg-slate-50 border border-royal-blue/10 p-3 rounded-xl outline-none focus:ring-2 focus:ring-royal-blue/20"
                                                        placeholder="Enter your name"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        id="glo-consent"
                                                        checked={userConsent}
                                                        onChange={(e) => setUserConsent(e.target.checked)}
                                                        className="w-5 h-5 rounded border-royal-blue/20 text-royal-blue focus:ring-royal-blue/20"
                                                    />
                                                    <label htmlFor="glo-consent" className="text-xs text-royal-blue/60 font-medium">
                                                        I'd like to talk with Glo about my GAP analysis
                                                    </label>
                                                </div>
                                            </div>
                                            <button
                                                disabled={!userConsent}
                                                onClick={() => setHasOptedIn(true)}
                                                className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${userConsent
                                                        ? 'bg-royal-blue text-white hover:bg-royal-blue/90 shadow-lg'
                                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                    }`}
                                            >
                                                Start Conversation <ArrowRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="prose prose-slate bg-royal-blue/[0.02] p-8 rounded-2xl border border-royal-blue/5 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-royal-blue/20" />
                                        <div className="space-y-4 text-royal-blue/80 leading-relaxed font-sans">
                                            <p className="font-bold text-royal-blue uppercase tracking-tighter text-xs">Memo: From Glenn; To: {userName || firstName}</p>
                                            <p>Hi {userName || firstName}, we have received your resume and target job. The full GAP analysis is a product of both AI and my personal review.</p>
                                            <p>I will be in touch in the next 24-48 hours. In the meantime, enjoy your conversation with Glo!</p>
                                            <p className="font-serif font-bold">Positive thoughts, Glenn</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="w-full md:w-[400px]">
                                {reportId && hasOptedIn ? (
                                    <GloLiveHub reportId={reportId} />
                                ) : (
                                    <div className="aspect-square md:aspect-[4/3] rounded-[40px] bg-royal-blue/5 border border-dashed border-royal-blue/20 flex flex-col items-center justify-center text-royal-blue/30 gap-4">
                                        <MessageSquare size={48} />
                                        <p className="text-xs font-bold uppercase tracking-widest">Awaiting Consent</p>
                                    </div>
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
                                    desc: "We rewrite your history to satisfy the algorithms while compelling the humans.",
                                    price: "$199"
                                },
                                {
                                    title: "Narrative Strategy",
                                    desc: "Direct-to-CEO storytelling that positions you as the solution, not just a hire.",
                                    price: "$299"
                                },
                                {
                                    title: "Full Executive Rebrand",
                                    desc: "LinkedIn, Resume, and Bio overhaul for the serious career climber.",
                                    price: "$499"
                                }
                            ].map((pkg, i) => (
                                <motion.div
                                    key={i}
                                    whileHover={{ y: -10 }}
                                    className="bg-white border border-royal-blue/10 p-8 rounded-[40px] shadow-xl space-y-6 flex flex-col"
                                >
                                    <h3 className="text-xl font-bold text-royal-blue">{pkg.title}</h3>
                                    <p className="text-sm text-royal-blue/60 leading-relaxed flex-1">{pkg.desc}</p>
                                    <div className="pt-6 border-t border-royal-blue/5 flex items-center justify-between">
                                        <span className="text-2xl font-serif font-bold text-royal-blue">{pkg.price}</span>
                                        <button className="bg-royal-blue text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-royal-blue/80 transition-all">Select</button>
                                    </div>
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
                                    <button className="bg-white text-royal-blue px-12 py-5 rounded-full font-bold text-xl hover:scale-105 active:scale-95 transition-all shadow-2xl">Book My Rewrite</button>
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
