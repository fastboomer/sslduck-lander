"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Sparkles, AlertCircle } from 'lucide-react';

export const NewsletterSignup: React.FC = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Client-side email validation
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            setStatus('error');
            setErrorMessage('Please enter an email address.');
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            setStatus('error');
            setErrorMessage('Please enter a valid email address.');
            return;
        }

        try {
            setStatus('loading');
            setErrorMessage('');
            
            const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: trimmedEmail }),
            });

            if (response.ok) {
                router.push('/thank-you');
            } else {
                const data = await response.json();
                setStatus('error');
                setErrorMessage(data.error || 'Failed to subscribe. Please try again.');
            }
        } catch (error) {
            setStatus('error');
            setErrorMessage('An unexpected error occurred. Please check your connection.');
        }
    };

    return (
        <section id="subscribe" className="py-24 bg-royal-blue/5 border-t border-royal-blue/10 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-72 h-72 bg-royal-blue/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-royal-blue/10 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-royal-blue/5 border border-royal-blue/10 rounded-full text-xs font-bold uppercase tracking-widest text-royal-blue mb-6">
                    <Sparkles size={12} className="animate-pulse" /> Weekly Strategy & Insights
                </div>
                
                <h2 className="text-3xl md:text-5xl font-bold text-royal-blue tracking-tight mb-4">
                    Subscribe to the SSLDUCK Newsletter
                </h2>
                
                <p className="text-lg md:text-xl text-royal-blue/70 max-w-2xl mx-auto mb-10 leading-relaxed">
                    Join the ranks of elite professionals. Get data-driven career hacks, narrative design blueprints, and modern resume audits delivered straight to your inbox.
                </p>

                <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-royal-blue/40 group-focus-within:text-royal-blue transition-colors">
                            <Mail size={18} />
                        </div>
                        <input
                            type="email"
                            required
                            disabled={status === 'loading'}
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (status === 'error') setStatus('idle');
                            }}
                            placeholder="Enter your professional email address"
                            className="w-full pl-12 pr-4 py-4 bg-white border border-royal-blue/15 rounded-full outline-none focus:ring-2 focus:ring-royal-blue/20 transition-all font-sans text-foreground placeholder:text-royal-blue/35 text-center md:text-left disabled:opacity-50"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="w-full bg-royal-blue text-white py-4 rounded-full font-bold uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-3"
                    >
                        {status === 'loading' ? (
                            <>
                                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent animate-spin" />
                                Joining...
                            </>
                        ) : (
                            'Subscribe'
                        )}
                    </button>

                    {status === 'error' && (
                        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-red-600 animate-fadeIn pt-2">
                            <AlertCircle size={16} />
                            <span>{errorMessage}</span>
                        </div>
                    )}
                </form>
            </div>
        </section>
    );
};
