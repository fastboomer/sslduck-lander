'use client';

import React, { useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { Loader2, ArrowRight, CheckCircle2, Zap, Target, Rocket } from 'lucide-react';

interface PostGloCloseProps {
    firstName: string;
    email?: string;
}

export const PostGloClose: React.FC<PostGloCloseProps> = ({ firstName, email }) => {
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleCheckout = async (priceId: string) => {
        setLoadingId(priceId);
        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priceId, email, firstName })
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                console.error("No checkout URL returned", data.error);
                alert("Sorry, checkout is temporarily unavailable. Please try again later.");
                setLoadingId(null);
            }
        } catch (err) {
            console.error("Checkout error", err);
            alert("Something went wrong navigating to checkout. Please try again.");
            setLoadingId(null);
        }
    };

    const cards = [
        {
            id: 'fix',
            title: 'The Fix',
            priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FIX || 'price_123_placeholder',
            icon: Target,
            description: 'A rapid, professional overhaul of your current resume to bypass ATS filters.',
            features: [
                'Complete ATS optimization',
                'Keyword gap closure',
                'Formats that pass parsing engines',
                'Delivered in 48 hours'
            ],
            color: 'from-blue-500 to-blue-700',
            buttonText: 'Get The Fix',
            popular: false
        },
        {
            id: 'advantage',
            title: 'The Advantage',
            priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ADVANTAGE || 'price_456_placeholder',
            icon: Zap,
            description: 'Our most popular tier. A full rewrite emphasizing your hard value and accomplishments.',
            features: [
                'Everything in The Fix',
                'Deep dive achievement rewriting',
                'Custom tailored to your target job',
                'Includes Cover Letter outline'
            ],
            color: 'from-red-500 to-red-700',
            buttonText: 'Get The Advantage',
            popular: true
        },
        {
            id: 'acceleration',
            title: 'The Acceleration',
            priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ACCELERATION || 'price_789_placeholder',
            icon: Rocket,
            description: 'The ultimate package. A highly aggressive executive-level portfolio.',
            features: [
                'Everything in The Advantage',
                'LinkedIn profile optimization',
                'Post-interview thank you templates',
                'Direct phone consultation'
            ],
            color: 'from-amber-500 to-orange-600',
            buttonText: 'Get The Acceleration',
            popular: false
        }
    ];

    const containerVariants: Variants = {
        hidden: { opacity: 0, y: 50 },
        show: {
            opacity: 1,
            y: 0,
            transition: {
                staggerChildren: 0.15,
                duration: 0.6,
                ease: 'easeOut'
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, scale: 0.95, y: 20 },
        show: { opacity: 1, scale: 1, y: 0 }
    };

    return (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="w-full max-w-6xl mx-auto py-8 sm:py-12 px-4"
        >
            <div className="text-center mb-10 sm:mb-16">
                <motion.h2 variants={itemVariants} className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">
                    Which version of your job search do you want, <span className="text-red-600 capitalize">{firstName}</span>?
                </motion.h2>
                <motion.p variants={itemVariants} className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
                    Choose the level of intervention that aligns with your career goals and timeline.
                </motion.p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch justify-center">
                {cards.map((card) => {
                    const isPopular = card.popular;
                    const Icon = card.icon;
                    return (
                        <motion.div 
                            key={card.id} 
                            variants={itemVariants}
                            whileHover={{ y: -8 }}
                            className={`relative rounded-3xl p-[2px] h-full flex transform-gpu ${isPopular ? 'bg-gradient-to-b ' + card.color : 'bg-gray-200'}`}
                        >
                            {isPopular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider shadow-lg">
                                    Most Popular
                                </div>
                            )}
                            <div className="bg-white w-full rounded-[23px] flex flex-col p-6 sm:p-8 h-full shadow-xl">
                                <div className="mb-6 flex-1">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br ${card.color} text-white shadow-md`}>
                                        <Icon size={28} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{card.title}</h3>
                                    <p className="text-gray-600 text-sm h-14">{card.description}</p>
                                    
                                    <div className="my-8 space-y-4">
                                        {card.features.map((feature, i) => (
                                            <div key={i} className="flex items-start text-sm">
                                                <CheckCircle2 size={18} className="text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                                                <span className="text-gray-700 font-medium">{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-auto pt-6 border-t border-gray-100">
                                    <button
                                        onClick={() => handleCheckout(card.priceId)}
                                        disabled={loadingId !== null}
                                        className={`w-full py-4 px-6 rounded-xl text-white font-bold text-lg transition-all shadow-md hover:shadow-xl flex items-center justify-center group ${isPopular ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-900 hover:bg-gray-800'}`}
                                    >
                                        {loadingId === card.priceId ? (
                                            <Loader2 className="animate-spin" size={24} />
                                        ) : (
                                            <>
                                                {card.buttonText}
                                                <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );
};
