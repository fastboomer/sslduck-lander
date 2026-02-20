"use client";

import React from 'react';
import Link from 'next/link';

export const GAPExplanation: React.FC = () => {
    return (
        <section className="py-12 bg-white text-center">
            <div className="max-w-4xl mx-auto px-6">
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
        </section>
    );
};
