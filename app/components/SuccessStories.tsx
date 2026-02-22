"use client";

import React from 'react';
import { motion } from 'framer-motion';

const testimonials = [
    {
        quote: "I walked in knowing their business better than some of their own employees",
        subhead: "GAP Employer Intel",
        image: "https://firebasestorage.googleapis.com/v0/b/fasth-lander-2026-v2.firebasestorage.app/o/Paul%20S.png?alt=media&token=10da569c-7be2-4691-bdcf-5b6fb3450749",
        name: "Paul S."
    },
    {
        quote: "My résumé had the skills, it just wasn't saying them",
        subhead: "Gap Audit + Rewrite",
        image: "https://firebasestorage.googleapis.com/v0/b/fasth-lander-2026-v2.firebasestorage.app/o/simone%20R.png?alt=media&token=641dfd55-3664-45ac-84b7-3c15eef634e6",
        name: "Jabari R."
    },
    {
        quote: "They handed me the hard questions - and the answers",
        subhead: "GAP Interview Prep",
        image: "https://firebasestorage.googleapis.com/v0/b/fasth-lander-2026-v2.firebasestorage.app/o/Russ%20G.png?alt=media&token=59e5b4e9-4c3c-4055-b46b-56163d211b70",
        name: "Russ G."
    }
];

export const SuccessStories: React.FC = () => {
    return (
        <section className="py-24 bg-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-6">
                {/* Main Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-20"
                >
                    <h2 className="text-3xl md:text-5xl font-bold text-royal-blue tracking-tight mb-4">
                        Stop Losing Jobs You're Actually Qualified For!
                    </h2>
                    <p className="text-xl md:text-2xl text-royal-blue/70 italic">
                        "Here is exactly why you need our free GAP Analysis:"
                    </p>
                </motion.div>

                {/* Testimonial Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
                    {testimonials.map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="flex flex-col items-center text-center"
                        >
                            {/* Quote and Subhead */}
                            <div className="mb-6 h-24 flex flex-col justify-end">
                                <p className="text-royal-blue/90 italic text-lg mb-2 leading-tight px-4">
                                    "{item.quote}"
                                </p>
                                <p className="text-royal-blue font-bold uppercase tracking-widest text-sm">
                                    {item.subhead}
                                </p>
                            </div>

                            {/* Image Wrapper */}
                            <div className="relative group mb-4">
                                <div className="absolute inset-0 bg-royal-blue/10 rounded-2xl blur-xl group-hover:bg-royal-blue/20 transition-all duration-500 scale-90" />
                                <div className="relative aspect-square w-64 md:w-full max-w-[300px] overflow-hidden rounded-2xl border border-royal-blue/5 shadow-2xl">
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                </div>
                            </div>

                            {/* Centered Name */}
                            <p className="text-royal-blue/60 text-sm font-medium">
                                {item.name}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};
