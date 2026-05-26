"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { GloVideo } from './GloVideo';

export const Hero: React.FC = () => {
    return (
        <section className="pt-48 pb-16 px-6">
            <div className="max-w-7xl mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-3xl md:text-5xl font-bold text-royal-blue tracking-tight mb-4">
                        Stop Losing Jobs You're Actually Qualified For!
                    </h1>
                    <p className="text-xl md:text-2xl text-royal-blue/70 italic mb-6">
                        "Here is exactly why you need our free GAP Analysis:"
                    </p>
                    <div className="mt-6">
                        <h3 className="text-2xl md:text-3xl font-bold text-royal-blue mb-2">
                            What is a 3 Stage GAP Analysis?
                        </h3>
                        <Link
                            href="/articles?article=3"
                            className="text-lg md:text-xl text-royal-blue/70 italic hover:text-royal-blue transition-colors underline decoration-royal-blue/20 underline-offset-4"
                        >
                            Audit, Translation, and Injection explained.
                        </Link>
                    </div>
                </motion.div>

                {/* Aesthetic spacing and Glo Video */}
                <div className="mt-16">
                    <GloVideo />
                </div>
            </div>
        </section>
    );
};

