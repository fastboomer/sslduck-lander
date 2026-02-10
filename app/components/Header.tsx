import React from 'react';

export const Header: React.FC = () => {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-silver/20">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                <div className="flex flex-col items-start leading-none group">
                    <div className="flex items-baseline font-bold text-2xl tracking-tight">
                        <div className="flex flex-col items-start">
                            <div className="flex items-baseline">
                                <span className="text-foreground">SSLDUCK</span>
                                <span className="text-royal-blue">.</span>
                            </div>
                            {/* Logo container aligned from S to . */}
                            <div className="mt-1 w-full overflow-hidden">
                                <img
                                    src="/logo.png"
                                    alt="THE UNPOPULAR OPINION"
                                    className="w-full h-auto block"
                                />
                            </div>
                        </div>
                        <span className="text-royal-blue">COM</span>
                    </div>
                </div>
                <nav className="hidden md:flex gap-8 text-sm font-medium text-foreground/60">
                    <a href="#" className="hover:text-royal-blue transition-colors">Articles</a>
                    <a href="#" className="hover:text-royal-blue transition-colors">Resume Audit</a>
                    <a href="#" className="hover:text-royal-blue transition-colors">Career Prep</a>
                </nav>
            </div>
        </header>
    );
};
