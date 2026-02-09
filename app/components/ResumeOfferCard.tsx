"use client";

import React, { useState } from 'react';
import { useCompletion } from '@ai-sdk/react';
import { Upload, FileText, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const ResumeOfferCard: React.FC = () => {
    const [jobDescription, setJobDescription] = useState('');
    const [resumeText, setResumeText] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    const { complete, completion, isLoading, setCompletion } = useCompletion({
        api: '/api/analyze',
        body: {
            resumeText,
            jobDescription,
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resumeText || !jobDescription) return;
        complete('');
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files[0]) {
            // In a real app, we'd use a PDF/Docx parser here.
            // For this demo/landing page, we'll read it as text if possible or ask for copy-paste.
            const text = await files[0].text();
            setResumeText(text);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-6 py-20" id="audit">
            <div className="glass rounded-3xl p-8 md:p-12 relative overflow-hidden group animate-glow">
                <div className="relative z-10">
                    <h2 className="text-3xl font-bold mb-2">In a rush?</h2>
                    <p className="text-lg text-foreground/60 mb-8">
                        Get a professional resume audit & gap analysis delivered in under 48 hours.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={cn(
                                "relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 flex flex-col items-center justify-center text-center",
                                isDragging ? "border-royal-blue bg-royal-blue/5 scale-[1.02]" : "border-silver/20 bg-white/5",
                                resumeText ? "border-green-500/50 bg-green-500/5" : ""
                            )}
                        >
                            <Upload className={cn("w-12 h-12 mb-4", resumeText ? "text-green-500" : "text-royal-blue")} />
                            <div className="mb-2 font-medium">
                                {resumeText ? "Resume uploaded!" : "Drop your resume (PDF/Docx)"}
                            </div>
                            <p className="text-sm text-foreground/40 mb-4">
                                or click to browse from your computer
                            </p>
                            <input
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) setResumeText(await file.text());
                                }}
                            />
                            {resumeText && (
                                <div className="text-xs text-foreground/40 bg-white/50 px-3 py-1 rounded-full flex items-center gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                                    Ready to analyze
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold flex items-center gap-2">
                                <FileText className="w-4 h-4 text-royal-blue" />
                                Target Job Link or Description
                            </label>
                            <textarea
                                rows={4}
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                placeholder="Paste the job description or link here..."
                                className="w-full bg-white/50 border border-silver/20 rounded-xl p-4 focus:ring-2 focus:ring-royal-blue/20 focus:border-royal-blue outline-none transition-all"
                            />
                        </div>

                        <button
                            disabled={isLoading || !resumeText || !jobDescription}
                            className="w-full bg-royal-blue text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-royal-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-royal-blue/20"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Analyzing Resume...
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    Start Audit & Gap Analysis
                                </>
                            )}
                        </button>
                    </form>

                    {completion && (
                        <div className="mt-12 p-8 rounded-2xl bg-white/50 border border-royal-blue/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h3 className="text-xl font-bold mb-6 text-royal-blue flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-royal-blue animate-pulse" />
                                Analysis Results
                            </h3>
                            <div className="prose prose-sm max-w-none text-foreground/80 whitespace-pre-wrap leading-relaxed">
                                {completion}
                            </div>
                        </div>
                    )}
                </div>

                {/* Decorative elements for Resonant Stark feel */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-royal-blue/5 rounded-full blur-3xl group-hover:bg-royal-blue/10 transition-colors duration-700" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-royal-blue/5 rounded-full blur-3xl group-hover:bg-royal-blue/10 transition-colors duration-700" />
            </div>
        </div>
    );
};
