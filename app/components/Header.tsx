import React from 'react';

export const Header: React.FC = () => {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-silver/20">
            <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
                <div className="flex flex-col items-start leading-none group">
                    <div className="relative">
                        <img
                            src="/logo.png"
                            alt="SSLDUCK"
                            className="h-20 md:h-24 w-auto block"
                        />
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
