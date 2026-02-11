import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Header: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    const navLinks = [
        { name: 'Articles', href: '#' },
        { name: 'Resume Audit', href: '#audit' },
        { name: 'Career Prep', href: '#' },
    ];

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-silver/20">
            <div className="max-w-7xl mx-auto px-6 py-6 md:py-8 flex items-center justify-between relative z-10">
                <div className="flex flex-col items-start leading-none group">
                    <div className="relative">
                        <img
                            src="/logo.png"
                            alt="SSLDUCK"
                            className="h-16 md:h-24 w-auto block transition-all duration-300"
                        />
                    </div>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex gap-8 text-sm font-medium text-foreground/60">
                    {navLinks.map((link) => (
                        <a key={link.name} href={link.href} className="hover:text-royal-blue transition-colors">
                            {link.name}
                        </a>
                    ))}
                </nav>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden p-2 text-foreground/60 hover:text-royal-blue transition-colors"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Navigation Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-full left-0 right-0 bg-background border-b border-silver/20 md:hidden"
                    >
                        <nav className="flex flex-col p-6 gap-4">
                            {navLinks.map((link) => (
                                <a
                                    key={link.name}
                                    href={link.href}
                                    className="text-lg font-medium text-foreground/60 hover:text-royal-blue py-2 border-b border-silver/5 last:border-0"
                                    onClick={() => setIsOpen(false)}
                                >
                                    {link.name}
                                </a>
                            ))}
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};
