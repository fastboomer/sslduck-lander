'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle, Home, BookOpen } from 'lucide-react';

export default function ThankYouPage() {
    return (
        <>
            <style>{`
                * { box-sizing: border-box; margin: 0; padding: 0; }
                .thank-you-page {
                    min-height: 100vh;
                    background: radial-gradient(ellipse at 40% 0%, rgba(46,76,255,0.2) 0%, transparent 55%),
                                radial-gradient(ellipse at 80% 90%, rgba(59,130,246,0.1) 0%, transparent 50%),
                                #080712;
                    display: flex; align-items: center; justify-content: center;
                    padding: 24px;
                    font-family: 'Inter', system-ui, sans-serif;
                    color: #e2e8f0;
                }
                .thank-you-card {
                    width: 100%; max-width: 560px;
                    background: rgba(15,10,30,0.85);
                    backdrop-filter: blur(24px);
                    border: 1px solid rgba(46,76,255,0.2);
                    border-radius: 24px;
                    padding: 56px 40px;
                    box-shadow: 0 0 80px rgba(46,76,255,0.15), 0 32px 64px rgba(0,0,0,0.6);
                    text-align: center;
                }
                .icon-container {
                    position: relative;
                    width: 80px;
                    height: 80px;
                    margin: 0 auto 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .pulse-ring {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    background: rgba(46,76,255,0.15);
                    border-radius: 50%;
                    animation: pulse-ring 2s infinite;
                }
                @keyframes pulse-ring {
                    0% { transform: scale(0.95); opacity: 1; }
                    100% { transform: scale(1.4); opacity: 0; }
                }
                .icon-circle {
                    position: relative;
                    width: 64px;
                    height: 64px;
                    background: linear-gradient(135deg, #2e4cff, #5b82f6);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    box-shadow: 0 8px 16px rgba(46,76,255,0.3);
                }
                .headline {
                    font-size: 32px; font-weight: 800;
                    background: linear-gradient(135deg, #ffffff, #85a2ff);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                    margin-bottom: 16px; line-height: 1.2;
                }
                .body-text {
                    font-size: 16px; color: #94a3b8; line-height: 1.7; margin-bottom: 40px;
                }
                .btn-primary {
                    display: flex; align-items: center; justify-content: center; gap: 10px;
                    width: 100%; padding: 16px 24px;
                    background: linear-gradient(135deg, #2e4cff, #5b82f6);
                    color: white; border: none; border-radius: 14px;
                    font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
                    cursor: pointer; text-decoration: none;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    margin-bottom: 14px;
                    box-shadow: 0 4px 14px rgba(46,76,255,0.4);
                }
                .btn-primary:hover {
                    opacity: 0.95;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(46,76,255,0.6);
                }
                .btn-primary:active { transform: translateY(0); }
                .btn-secondary {
                    display: flex; align-items: center; justify-content: center; gap: 10px;
                    width: 100%; padding: 14px 24px;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(46,76,255,0.25);
                    color: #94a3b8; border-radius: 14px;
                    font-size: 15px; font-weight: 600;
                    cursor: pointer; text-decoration: none;
                    transition: all 0.2s;
                }
                .btn-secondary:hover {
                    background: rgba(255,255,255,0.07);
                    color: #ffffff;
                    border-color: rgba(46,76,255,0.4);
                }
                .note {
                    font-size: 12px; color: #475569; margin-top: 28px; line-height: 1.6;
                }
            `}</style>

            <div className="thank-you-page">
                <div className="thank-you-card">
                    <div className="icon-container">
                        <div className="pulse-ring" />
                        <div className="icon-circle">
                            <CheckCircle size={32} />
                        </div>
                    </div>
                    
                    <h1 className="headline">
                        You&apos;re on the list! 🚀
                    </h1>
                    
                    <p className="body-text">
                        We&apos;ve sent a quick confirmation link to your inbox. Please click it to verify your email and ensure our weekly insights and strategies don&apos;t get lost in your spam folder.
                    </p>

                    <Link href="/articles" className="btn-primary" id="thank-you-articles-btn">
                        <BookOpen size={18} /> Read Our Editorials
                    </Link>
                    
                    <Link href="/" className="btn-secondary" id="thank-you-home-btn">
                        <Home size={18} /> Return Home
                    </Link>

                    <p className="note">
                        📧 Note: The verification link will expire in 24 hours. If you don&apos;t receive it within a few minutes, please check your promotion or junk folder.
                    </p>
                </div>
            </div>
        </>
    );
}
