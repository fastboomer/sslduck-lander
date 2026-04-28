'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Header from '../../components/Header';
import { Footer } from '../../components/Footer';
import { PostGloClose } from '../../components/PostGloClose';
import { Loader2, Sparkles } from 'lucide-react';

function OfferPageContent() {
    const searchParams = useSearchParams();
    const reportId = searchParams.get('reportId');
    const [firstName, setFirstName] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!reportId) {
            setIsLoading(false);
            setError('No report ID provided.');
            return;
        }

        const fetchContext = async () => {
            try {
                const res = await fetch(`/api/gap-analysis/context/${reportId}`);
                if (res.ok) {
                    const data = await res.json();
                    const name = data.candidateName || '';
                    setFirstName(name.split(' ')[0] || 'there');
                    setEmail(data.email || '');
                } else {
                    // Still show the page — just without a personalized name
                    setFirstName('there');
                }
            } catch (err: any) {
                console.error('Failed to fetch report context:', err);
                setFirstName('there');
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
                <PostGloClose firstName="there" />
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-background">
            <Header />
            <div className="pt-24 pb-20 px-4">
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
