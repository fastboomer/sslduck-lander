'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Footer } from '@/app/components/Footer';
import { PostGloClose } from '@/app/components/PostGloClose';
import { Loader2, Sparkles } from 'lucide-react';

function OfferPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const reportId = searchParams.get('reportId');
    const [firstName, setFirstName] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!reportId) {
            // No ID: still show the offer page with a generic greeting
            setIsLoading(false);
            return;
        }

        const fetchContext = async () => {
            try {
                const res = await fetch(`/api/gap-analysis/context/${reportId}`);
                if (res.ok) {
                    const data = await res.json();
                    const name = data.candidateName || '';
                    setFirstName(name.split(' ')[0] || '');
                    setEmail(data.email || '');
                } else {
                    // Still show the page — just without a personalized name
                    setFirstName('');
                }
            } catch (err: any) {
                console.error('Failed to fetch report context:', err);
                setFirstName('');
            } finally {
                setIsLoading(false);
            }
        };

        fetchContext();
    }, [reportId]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-royal-blue/20 rounded-full blur-2xl animate-pulse" />
                    <Loader2 size={56} className="animate-spin text-royal-blue relative z-10" />
                </div>
                <p className="text-royal-blue/60 text-sm font-mono uppercase tracking-widest animate-pulse">
                    Loading your personalized offers...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
                <p className="text-royal-blue/60 text-center max-w-md">
                    We couldn&apos;t load your report details. You can still explore our packages below.
                </p>
                <PostGloClose firstName="" />
            </div>
        );
    }

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
            <div className="pt-16 pb-20 px-4">
                {/* Branded top label */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center mb-2"
                >
                    <span className="inline-flex items-center gap-2 bg-royal-blue/8 border border-royal-blue/10 text-royal-blue text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full">
                        <Sparkles size={11} className="text-yellow-500" />
                        SSLDUCK Career Intelligence
                    </span>
                </motion.div>

                <PostGloClose firstName={firstName} email={email} />
            </div>
            <Footer />
        </main>
    );
}

export default function GapOfferPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-background flex items-center justify-center">
                    <Loader2 size={40} className="animate-spin text-royal-blue" />
                </div>
            }
        >
            <OfferPageContent />
        </Suspense>
    );
}
