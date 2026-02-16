'use client';

import React, { useState, useEffect } from 'react';
import { Menu, X, Lock as LockIcon, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const [isAdminOpen, setIsAdminOpen] = useState(false);
    const pathname = usePathname();

    // Listen for admin state changes from OmniFeed
    useEffect(() => {
        const handleAdminChange = (e: any) => {
            setIsAdminOpen(e.detail.isOpen);
        };
        window.addEventListener('sslduck-admin-state', handleAdminChange);
        return () => window.removeEventListener('sslduck-admin-state', handleAdminChange);
    }, []);

    const toggleAdmin = () => {
        const event = new CustomEvent('sslduck-toggle-admin');
        window.dispatchEvent(event);
        setIsOpen(false); // Close mobile menu when toggling
    };

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
                if (isAdminOpen) toggleAdmin();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isAdminOpen]);

    // Scroll lock
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
    }, [isOpen]);

    const navLinks = [
        { name: 'Articles', href: '/articles' },
        { name: 'Resume Audit', href: '/#audit' },
        { name: 'Career Prep', href: '#' },
    ];

    const isArticlesPage = pathname?.includes('articles');

    return (
        <>
            <header className="fixed top-0 left-0 right-0 h-20 md:h-28 bg-white border-b border-silver/30 z-[1000] shadow-sm">
                <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between relative">
                    {/* Logo Section */}
                    <a href="/" className="flex-shrink-0 flex items-center gap-3">
                        <img
                            src="/logo.png"
                            alt="SSLDUCK Logo"
                            className="h-12 md:h-16 w-auto transition-all duration-300"
                        />
                        <div className="flex flex-col">
                            <span className="text-xl font-serif font-black text-royal-blue leading-none">SSLDUCK</span>
                            <span className="text-[8px] font-bold text-royal-blue/40 tracking-[0.2em]">VERSION 12-PRO</span>
                        </div>
                    </a>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-10">
                        {navLinks.map((link) => (
                            <a
                                key={link.name}
                                href={link.href}
                                className="text-sm font-bold uppercase tracking-widest text-[#002366]/80 hover:text-[#002366] transition-colors relative group"
                            >
                                {link.name}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#002366] transition-all duration-300 group-hover:w-full" />
                            </a>
                        ))}
                        {isArticlesPage && (
                            <button
                                onClick={toggleAdmin}
                                className="text-sm font-bold uppercase tracking-widest text-royal-blue bg-royal-blue/5 px-4 py-2 rounded-lg hover:bg-royal-blue/10 transition-all border border-royal-blue/20"
                            >
                                {isAdminOpen ? 'Close Portal' : 'Admin'}
                            </button>
                        )}
                    </nav>

                    {/* Mobile Menu Toggle */}
                    <div className="md:hidden flex items-center">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="p-3 text-[#002366] active:scale-90 transition-all focus:outline-none"
                            type="button"
                            aria-label="Toggle Menu"
                        >
                            {isOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Navigation Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[999] md:hidden"
                    >
                        {/* Overlay */}
                        <div
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Drawer Content */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'tween', duration: 0.3 }}
                            className="absolute top-0 right-0 bottom-0 w-[85%] max-w-xs bg-white shadow-2xl p-8 pt-24"
                        >
                            <div className="flex flex-col gap-10 h-full">
                                <div className="space-y-6">
                                    <p className="text-[10px] font-bold text-silver uppercase tracking-[0.2em] border-b border-silver/10 pb-2">Navigation</p>
                                    <nav className="flex flex-col gap-6">
                                        {navLinks.map((link) => (
                                            <a
                                                key={link.name}
                                                href={link.href}
                                                className="text-2xl font-black text-[#002366] flex items-center justify-between group"
                                                onClick={() => setIsOpen(false)}
                                            >
                                                <span>{link.name}</span>
                                                <ChevronRight className="text-silver/40 group-hover:text-royal-blue transition-colors" size={20} />
                                            </a>
                                        ))}

                                        {/* Streamlined Admin Toggle */}
                                        <button
                                            onClick={toggleAdmin}
                                            className="text-2xl font-black text-royal-blue flex items-center justify-between pt-6 border-t border-silver/10 mt-2"
                                        >
                                            <span className="flex items-center gap-3">
                                                {isAdminOpen ? 'Close Portal' : 'Admin Portal'}
                                                {!isAdminOpen && <LockIcon size={18} className="opacity-40" />}
                                            </span>
                                            <ChevronRight className="text-royal-blue/40" size={20} />
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
