'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUp, Link as LinkIcon, Type, X, CheckCircle2, Loader2, AlertCircle, Info } from 'lucide-react';

interface GapIntakeProps {
    onSuccess: (data: { reportId: string }) => void;
}

export const GapIntake: React.FC<GapIntakeProps> = ({ onSuccess }) => {
    const [resumes, setResumes] = useState<File[]>([]);
    const [reqText, setReqText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resumeRef = useRef<HTMLInputElement>(null);

    const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            if (resumes.length + files.length > 2) {
                setError("Maximum 2 resume uploads allowed.");
                return;
            }
            setResumes(prev => [...prev, ...files]);
            setError(null);
        }
    };

    const removeFile = (index: number) => {
        setResumes(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        console.log("[DEBUG] GapIntake submission started. Version: 10");
        e.preventDefault();
        if (resumes.length === 0) {
            setError("Please upload at least one resume.");
            return;
        }

        if (reqText.trim() === '') {
            setError("Please provide job requirements (Paste Target Job Description).");
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const formData = new FormData();
            resumes.forEach(f => formData.append('resumes', f));
            formData.append('reqText', reqText);

            console.log("[DEBUG] Sending request to /api/gap-analysis/process...");
            const response = await fetch('/api/gap-analysis/process', {
                method: 'POST',
                body: formData
            });

            const responseText = await response.text();
            console.log("[DEBUG] Raw Response received length:", responseText.length);

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

            let result;
            try {
                result = JSON.parse(responseText);
                console.log("[DEBUG] Success! Redirecting to success page with ID:", result.reportId);
                onSuccess(result);
            } catch (e) {
                console.error("[DEBUG] JSON parse failure on success:", e);
                throw new Error("Invalid response format from server. Please check terminal logs.");
            }
        } catch (err: any) {
            console.error("[DEBUG] Submit error:", err);
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-white border border-royal-blue/10 rounded-3xl p-8 md:p-12 shadow-2xl max-w-4xl mx-auto italic-fix">
            <h2 className="text-3xl font-serif font-bold text-royal-blue mb-8 text-center italic">Free GAP Analysis Intake (v12)</h2>

            <form onSubmit={handleSubmit} className="space-y-10">
                {/* Personal Information Removed for Frictionless Intake */}

                {/* Resume Section */}
                <div className="space-y-4">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="upload"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="border-2 border-dashed border-royal-blue/40 rounded-2xl p-4 text-center transition-all shadow-inner"
                            style={{ backgroundColor: '#edf2f7' }}
                        >
                            <input
                                type="file"
                                ref={resumeRef}
                                onChange={handleResumeUpload}
                                className="hidden"
                                multiple
                                accept=".pdf,.doc,.docx,.txt"
                            />
                            <div className="flex flex-col items-center gap-4">
                                <p className="text-royal-blue/60 font-sans font-medium">Drag & Drop Resumes Here</p>
                                <button
                                    type="button"
                                    onClick={() => resumeRef.current?.click()}
                                    className="bg-white hover:bg-royal-blue/5 text-royal-blue px-8 py-3 rounded-full text-xs font-bold transition-all border border-royal-blue/10 shadow-sm"
                                >
                                    Browse Files
                                </button>
                            </div>
                            <div className="mt-4 space-y-2">
                                <p className="text-[10px] text-royal-blue/40 uppercase tracking-tighter">Maximum 2 files (PDF, DOCX, TXT)</p>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    <div className="flex flex-wrap gap-2">
                        {resumes.map((file, i) => (
                            <div key={i} className="bg-royal-blue text-white px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium shadow-md">
                                <span className="truncate max-w-[150px]">{file.name}</span>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        removeFile(i);
                                    }}
                                    className="hover:text-red-300 transition-colors bg-white/20 rounded-full p-0.5"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Requirements Section */}
                <div className="space-y-6">
                    <label className="text-sm font-bold text-royal-blue uppercase tracking-widest flex items-center gap-2">
                        <Type size={18} /> Job Requirements <span className="text-red-500">*</span>
                    </label>

                    <AnimatePresence mode="wait">
                        <motion.textarea
                            key="text"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            value={reqText}
                            onChange={(e) => setReqText(e.target.value)}
                            className="w-full bg-white border border-royal-blue/10 p-4 rounded-2xl min-h-[250px] outline-none focus:ring-2 focus:ring-royal-blue/20 font-sans text-sm"
                            placeholder="Paste employer's complete job description here. PRO TIP: Make sure you include employer's name and complete job title."
                        />
                    </AnimatePresence>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-600 text-sm">
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                <button
                    disabled={isProcessing}
                    className="w-full bg-royal-blue text-white py-6 rounded-2xl font-bold uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-3"
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="animate-spin" size={20} />
                            Scanning Patterns...
                        </>
                    ) : (
                        "Generate GAP Analysis"
                    )}
                </button>

                <p className="text-[10px] text-center text-royal-blue/40 font-mono italic">
                    By submitting, you agree to our narrative audit protocol. Audit takes ~15-30 seconds.
                </p>
            </form>
        </div>
    );
};
