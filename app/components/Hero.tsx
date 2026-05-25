import React from 'react';
import { GloVideo } from './GloVideo';

export const Hero: React.FC = () => {
    return (
        <section className="pt-48 pb-16 px-6">
            <div className="max-w-7xl mx-auto text-center">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-royal-blue mb-6">
                    Premium Research for <br />
                    Elite Career Growth
                </h1>
                <p className="text-xl text-foreground/60 max-w-2xl mx-auto mb-10">
                    Unlocking professional excellence through expert-led articles and data-driven career analysis.
                </p>
                <div className="flex flex-col md:flex-row justify-center gap-4">
                    <a
                        href="/articles"
                        className="bg-royal-blue text-white px-8 py-4 rounded-full font-semibold hover:bg-royal-blue/90 transition-all shadow-lg hover:shadow-royal-blue/20 text-center"
                    >
                        Read Articles
                    </a>
                    <a
                        href="#subscribe"
                        className="bg-white text-royal-blue border border-royal-blue px-8 py-4 rounded-full font-semibold hover:bg-royal-blue/5 transition-all text-center"
                    >
                        Subscribe <span className="italic font-normal">(free)</span>
                    </a>
                </div>

                {/* Aesthetic spacing and Glo Video */}
                <div className="mt-16">
                    <GloVideo />
                </div>
            </div>
        </section>
    );
};
