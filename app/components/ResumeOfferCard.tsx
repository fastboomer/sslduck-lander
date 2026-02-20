"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const ResumeOfferCard: React.FC = () => {
    const [jobDescription, setJobDescription] = useState('');
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        console.log("[DEBUG] ResumeOfferCard submission started. Version: 12");
        e.preventDefault();
        if (!resumeFile || !jobDescription) return;

        setIsProcessing(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('resumes', resumeFile);
            formData.append('reqText', jobDescription);

            console.log("[DEBUG] Sending request to /api/gap-analysis/process...");
            const response = await fetch('/api/gap-analysis/process', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("[DEBUG] API Error:", errorData);
                throw new Error(errorData.error || "Processing failed.");
            }

            const result = await response.json();
            console.log("[DEBUG] Success! Redirecting to:", `/gap-analysis/success?reportId=${result.reportId}`);
            router.push(`/gap-analysis/success?reportId=${result.reportId}`);
        } catch (err: any) {
            console.error("[DEBUG] Submit error:", err);
            setError(err.message || "Failed to process analysis. Please try again.");
        } finally {
            setIsProcessing(false);
        }
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
            setResumeFile(files[0]);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-6 py-20" id="audit">
            <div
                className="rounded-3xl p-8 md:p-12 relative overflow-hidden group animate-glow border border-royal-blue/10 shadow-xl"
                style={{ backgroundColor: '#ffffff' }}
            >
                <div className="relative z-10 text-royal-blue">
                    <h2 className="text-3xl font-bold mb-2">In a rush? (v12)</h2>
                    <p className="text-lg text-royal-blue/70 mb-8">
                        Get a Free Professional Resume Audit & GAP Analysis delivered in under 48 hours!
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Resume Box - Distinct Ice Blue Background */}
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={cn(
                                "relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 flex flex-col items-center justify-center text-center",
                                isDragging ? "border-royal-blue bg-royal-blue/10 scale-[1.02]" : "border-royal-blue/30"
                            )}
                            style={{ backgroundColor: '#f0f7ff' }}
                        >
                            <Upload className={cn("w-12 h-12 mb-4", resumeFile ? "text-royal-blue" : "text-royal-blue/50")} />
                            <div className="mb-2 font-bold text-royal-blue">
                                {resumeFile ? `Resume: ${resumeFile.name}` : "Drop your primary resume here"}
                            </div>
                            {!resumeFile ? (
                                <>
                                    <p className="text-sm text-royal-blue/60 mb-4 font-medium">
                                        PDF or Word documents only
                                    </p>
                                    <input
                                        type="file"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) setResumeFile(file);
                                        }}
                                    />
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="text-xs text-royal-blue bg-white px-4 py-2 rounded-full flex items-center gap-2 font-bold shadow-sm ring-1 ring-royal-blue/10">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={3} />
                                        Resume Verified & Ready
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setResumeFile(null);
                                        }}
                                        className="text-xs font-bold text-red-500 hover:text-red-700 underline px-3 py-1 rounded-full hover:bg-red-50 transition-colors"
                                    >
                                        Remove & Change File
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Job Description Box - Pure White Background */}
                        <div className="space-y-3 bg-white border border-royal-blue/10 p-6 rounded-2xl shadow-sm">
                            <label className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-royal-blue">
                                <FileText className="w-4 h-4" />
                                Target Job Link or Description
                            </label>
                            <textarea
                                rows={5}
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                placeholder="Place employer's complete job description or link here..."
                                className="w-full bg-[#fcfcfc] border border-royal-blue/10 rounded-xl p-4 focus:ring-2 focus:ring-royal-blue/20 focus:border-royal-blue outline-none transition-all placeholder:text-royal-blue/30 text-sm"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-700 text-sm font-bold">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <button
                            disabled={isProcessing || !resumeFile || !jobDescription}
                            className={cn(
                                "w-full text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl disabled:cursor-not-allowed",
                                jobDescription ? "bg-royal-blue hover:bg-royal-blue/90 hover:shadow-royal-blue/20" : "bg-royal-blue/40 opacity-80"
                            )}
                        >
                            {isProcessing ? (
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
                </div>


                <div className="absolute -top-24 -right-24 w-64 h-64 bg-royal-blue/5 rounded-full blur-3xl group-hover:bg-royal-blue/10 transition-colors duration-700" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-royal-blue/5 rounded-full blur-3xl group-hover:bg-royal-blue/10 transition-colors duration-700" />
            </div>
        </div>
    );
};
