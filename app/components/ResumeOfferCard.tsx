"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { SixMistakesVideo } from './SixMistakesVideo';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const ResumeOfferCard: React.FC = () => {
    const [jobDescription, setJobDescription] = useState('');
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isProcessing && progress < 100) {
            interval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 100) return 100;
                    // Extended timeline for Gemini 2.5 Pro
                    if (prev < 20) return prev + Math.random() * 3 + 1;       // Fast start
                    if (prev < 50) return prev + Math.random() * 1.5 + 0.5;   // Moderate processing
                    if (prev < 80) return prev + Math.random() * 0.5 + 0.2;   // Heavy AI context mapping
                    if (prev < 95) return prev + Math.random() * 0.1 + 0.05;  // Core Generation phase
                    if (prev < 99.5) return prev + Math.random() * 0.02 + 0.01; // Finalizing output
                    return 99.5;
                });
            }, 800);
        }
        return () => clearInterval(interval);
    }, [isProcessing, progress]);

    const handleSubmit = async (e: React.FormEvent) => {
        console.log("[DEBUG] ResumeOfferCard submission started. Version: 12");
        e.preventDefault();
        if (!resumeFile || !jobDescription) return;

        setIsProcessing(true);
        setProgress(0);
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

            const responseText = await response.text();

            if (!response.ok) {
                let errorMsg = "Processing failed.";
                try {
                    const errorData = JSON.parse(responseText);
                    errorMsg = errorData.error || errorMsg;
                } catch (e) {
                    errorMsg = `Server error (${response.status}): The server returned a webpage instead of data. This often means a crash or timeout.`;
                    console.error("[DEBUG] Non-JSON error response detected:", responseText.substring(0, 200));
                }
                throw new Error(errorMsg);
            }

            let result: { reportId: string };
            try {
                result = JSON.parse(responseText);
                setProgress(100);
                console.log("[DEBUG] Success! Redirecting to:", `/gap-analysis/success?reportId=${result.reportId}`);
                // Add a small delay so user sees 100% and success message
                setTimeout(() => {
                    router.push(`/gap-analysis/success?reportId=${result.reportId}`);
                }, 800);
                // Return here so we don't set isProcessing(false) -> avoids resetting progress bar
                return;
            } catch (e) {
                console.error("[DEBUG] JSON parse failure on success:", e);
                throw new Error("Invalid response format from server. Please check terminal logs.");
            }
        } catch (err: any) {
            console.error("[DEBUG] Submit error:", err);
            setError(err.message || "Failed to process analysis. Please try again.");
            setIsProcessing(false);
            setProgress(0);
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
                        Get a Free Professional Resume Audit & GAP Analysis delivered Right Now, On The Spot!
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
                                        suppressHydrationWarning
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

                        {/* Job Description Box - Matching dashed border style */}
                        <div className="space-y-3 border-2 border-dashed border-royal-blue/30 p-6 rounded-2xl" style={{ backgroundColor: '#f0f7ff' }}>
                            <label className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-royal-blue">
                                <FileText className="w-4 h-4" />
                                Copy/Paste Target Job Description
                            </label>
                            <textarea
                                rows={5}
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                placeholder="Paste employer's complete job description here. PRO TIP: Make sure you include employer's name and complete job title."
                                className="w-full bg-white border border-royal-blue/10 rounded-xl p-4 focus:ring-2 focus:ring-royal-blue/20 focus:border-royal-blue outline-none transition-all placeholder:text-royal-blue/55 text-sm"
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

                        {isProcessing && (
                            <div className="w-full pt-2 space-y-3">
                                <div className="h-2 w-full bg-royal-blue/10 rounded-full overflow-hidden relative shadow-inner">
                                    <div 
                                        className="h-full bg-royal-blue absolute top-0 left-0 transition-all duration-300 ease-out"
                                        style={{ width: `${progress}%` }}
                                    >
                                        {/* Optional subtle shimmer over the filled portion */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full -translate-x-full animate-[shimmer_1.5s_infinite]" />
                                    </div>
                                </div>
                                 <div className="flex justify-between items-center text-xs font-bold text-royal-blue/60 tracking-widest uppercase">
                                    <p className="animate-pulse">
                                        {progress < 20 ? "Extracting contact details & skills..." :
                                         progress < 50 ? "Analyzing resume structure & formatting..." :
                                         progress < 80 ? "Comparing candidate to job description..." :
                                         progress < 95 ? "Drafting Cover Letter & Action Plan..." :
                                         progress < 100 ? "Validating Output (Please wait up to 60s)..." :
                                         "Success! Redirecting..."}
                                    </p>
                                    <p>{Math.floor(progress)}%</p>
                                </div>
                                <style>{`
                                    @keyframes shimmer {
                                        100% { transform: translateX(100%); }
                                    }
                                `}</style>
                            </div>
                        )}
                    </form>
                </div>


                <div className="absolute -top-24 -right-24 w-64 h-64 bg-royal-blue/5 rounded-full blur-3xl group-hover:bg-royal-blue/10 transition-colors duration-700" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-royal-blue/5 rounded-full blur-3xl group-hover:bg-royal-blue/10 transition-colors duration-700" />
            </div>

            {/* Suitability Study Features Card */}
            <div className="mt-8 bg-white rounded-[40px] p-8 md:p-12 border border-royal-blue/10 shadow-xl relative overflow-hidden">
                <style dangerouslySetInnerHTML={{__html: `
                    @import url('https://fonts.googleapis.com/css2?family=Rubik:ital,wght@1,900&display=swap');
                `}} />
                
                <h1 style={{ color: '#FF0000', fontSize: '24px', fontStyle: 'italic', fontWeight: 900, fontFamily: "'Rubik', system-ui, sans-serif", letterSpacing: '-0.02em', marginBottom: '24px' }}>
                    Today's Free Feature!
                </h1>

                <h2 style={{ fontSize: '19px', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif', color: '#000', marginBottom: '20px' }}>
                    Applicant Suitability Study
                </h2>

                <p style={{ fontSize: '16px', fontStyle: 'italic', fontFamily: 'Arial, Helvetica, sans-serif', color: '#000', marginBottom: '32px' }}>
                    Here's what you receive in today's free custom Applicant Suitability Study:
                </p>

                <div className="space-y-6 text-black">
                    <div className="flex flex-col">
                        <h3 style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif', color: '#333', margin: 0, padding: 0, lineHeight: '1.2' }}>
                            1. Hard and Soft Skills Analysis
                        </h3>
                        <p style={{ fontSize: '11px', fontFamily: 'Arial, Helvetica, sans-serif', color: '#000', margin: 0, padding: 0, lineHeight: '1.4', marginTop: '2px' }}>
                            An inventory of your hard, soft, and implied skills based on your resume, so that you can see how they match up with the specific requirements of your target job. (You may have valuable sought after skills you simply failed to include in your resume.)
                        </p>
                    </div>

                    <div className="flex flex-col">
                        <h3 style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif', color: '#333', margin: 0, padding: 0, lineHeight: '1.2' }}>
                            2. Target Job Requirements. 
                        </h3>
                        <p style={{ fontSize: '11px', fontFamily: 'Arial, Helvetica, sans-serif', color: '#000', margin: 0, padding: 0, lineHeight: '1.4', marginTop: '2px' }}>
                            A close look at your target employer's job requirements (wish list) This provides a good idea of what is actually important to them for a specific position. Do you look like a good "fit?"
                        </p>
                    </div>

                    <div className="flex flex-col">
                        <h3 style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif', color: '#333', margin: 0, padding: 0, lineHeight: '1.2' }}>
                            3. Probable ATS Diagnosis
                        </h3>
                        <p style={{ fontSize: '11px', fontFamily: 'Arial, Helvetica, sans-serif', color: '#000', margin: 0, padding: 0, lineHeight: '1.4', marginTop: '2px' }}>
                            Using your resume and your target position, we discover if ghosting problems are related to ATS.
                        </p>
                    </div>

                    <div className="flex flex-col">
                        <h3 style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif', color: '#333', margin: 0, padding: 0, lineHeight: '1.2' }}>
                            4. Probable Interview Questions Based on Your Resume vs Job Requirements
                        </h3>
                        <p style={{ fontSize: '11px', fontFamily: 'Arial, Helvetica, sans-serif', color: '#000', margin: 0, padding: 0, lineHeight: '1.4', marginTop: '2px' }}>
                            Includes suggested answers to mitigate resume shortcomings vs employer's requirements.
                        </p>
                    </div>

                    <div className="flex flex-col">
                        <h3 style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif', color: '#333', margin: 0, padding: 0, lineHeight: '1.2' }}>
                            5. Bonus 1 - Best Practices Audit
                        </h3>
                        <p style={{ fontSize: '11px', fontFamily: 'Arial, Helvetica, sans-serif', color: '#000', margin: 0, padding: 0, lineHeight: '1.4', marginTop: '2px' }}>
                            Resume Best Practices audit. We determine if your resume is failing any best practices.
                        </p>
                    </div>

                    <div className="flex flex-col">
                        <h3 style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif', color: '#333', margin: 0, padding: 0, lineHeight: '1.2' }}>
                            6. Bonus 2 - Other Jobs You Are Qualified For
                        </h3>
                        <p style={{ fontSize: '11px', fontFamily: 'Arial, Helvetica, sans-serif', color: '#000', margin: 0, padding: 0, lineHeight: '1.4', marginTop: '2px' }}>
                            There may be other, equally attractive jobs you are qualified for, but are unaware of. Insertion of new keywords in your LinkedIn profile may result in surprising search results and offers!
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Six Resume Mistakes Video Card ─────────────────── */}
            <SixMistakesVideo />

        </div>
    );
};
