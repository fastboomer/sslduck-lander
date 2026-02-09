import React from 'react';

export const Hero: React.FC = () => {
    return (
        <section className="pt-32 pb-16 px-6">
            <div className="max-w-7xl mx-auto text-center">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6">
                    Premium Content for <br />
                    <span className="text-royal-blue">Elite Career Growth</span>
                </h1>
                <p className="text-xl text-foreground/60 max-w-2xl mx-auto mb-10">
                    Unlocking professional excellence through expert-led articles and data-driven career analysis.
                </p>
                <div className="flex justify-center gap-4">
                    <button className="bg-royal-blue text-white px-8 py-4 rounded-full font-semibold hover:bg-royal-blue/90 transition-all shadow-lg hover:shadow-royal-blue/20">
                        Read Articles
                    </button>
                    <button className="bg-white text-royal-blue border border-royal-blue px-8 py-4 rounded-full font-semibold hover:bg-royal-blue/5 transition-all">
                        Join Membership
                    </button>
                </div>
            </div>
        </section>
    );
};
