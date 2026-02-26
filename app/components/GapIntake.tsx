'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUp, Link as LinkIcon, Type, X, CheckCircle2, Loader2, AlertCircle, Info } from 'lucide-react';

interface GapIntakeProps {
    onSuccess: (data: { reportId: string }) => void;
}

export const GapIntake: React.FC<GapIntakeProps> = ({ onSuccess }) => {
    const [resumes, setResumes] = useState<File[]>([]);
    const [resumeMode, setResumeMode] = useState<'upload' | 'paste'>('upload');
    const [resumeText, setResumeText] = useState('');
    const [reqMode, setReqMode] = useState<'upload' | 'url' | 'text'>('text');
    const [reqFiles, setReqFiles] = useState<File[]>([]);
    const [reqUrl, setReqUrl] = useState('');
    const [reqText, setReqText] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resumeRef = useRef<HTMLInputElement>(null);
    const reqFileRef = useRef<HTMLInputElement>(null);

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

    const handleReqFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            if (reqFiles.length + files.length > 2) {
                setError("Maximum 2 requirement uploads allowed.");
                return;
            }
            setReqFiles(prev => [...prev, ...files]);
            setError(null);
        }
    };

    const removeFile = (type: 'resume' | 'req', index: number) => {
        if (type === 'resume') {
            setResumes(prev => prev.filter((_, i) => i !== index));
        } else {
            setReqFiles(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        console.log("[DEBUG] GapIntake submission started. Version: 10");
        e.preventDefault();
        if (resumeMode === 'upload' && resumes.length === 0) {
            setError("Please upload at least one resume.");
            return;
        }
        if (resumeMode === 'paste' && resumeText.trim() === '') {
            setError("Please paste your resume text.");
            return;
        }

        const hasRequirements = reqFiles.length > 0 || reqUrl.trim() !== '' || reqText.trim() !== '';
        if (!hasRequirements) {
            setError("Please provide job requirements (File, URL, or Text).");
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const formData = new FormData();
            resumes.forEach(f => formData.append('resumes', f));
            reqFiles.forEach(f => formData.append('reqFiles', f));
            formData.append('reqUrl', reqUrl);
            formData.append('reqText', reqText);
            formData.append('contactEmail', contactEmail);
            formData.append('resumeText', resumeText); // Paster resume content

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
                    <div className="flex bg-royal-blue/5 rounded-full p-1 border border-royal-blue/10 w-fit mx-auto">
                        {(['upload', 'paste'] as const).map(mode => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => {
                                    if (resumeMode === 'upload' && mode === 'upload') {
                                        resumeRef.current?.click();
                                    } else {
                                        setResumeMode(mode);
                                    }
                                }}
                                className={`px-6 py-2 rounded-full text-xs font-bold uppercase transition-all flex items-center gap-2 ${resumeMode === mode
                                    ? 'bg-royal-blue text-white shadow-lg'
                                    : 'text-royal-blue/60 hover:text-royal-blue'
                                    }`}
                            >
                                {mode === 'upload' && <FileUp size={14} />}
                                {mode}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        {resumeMode === 'upload' ? (
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
                                    <div className="flex items-center justify-center gap-2 bg-yellow-50 p-2 rounded-lg border border-yellow-100">
                                        <Info size={12} className="text-yellow-600 shrink-0" />
                                        <p className="text-[9px] text-yellow-700 font-medium leading-tight">
                                            <strong>USING ONEDRIVE?</strong> Ensure your file has a <span className="text-emerald-600 font-bold">green checkmark</span> before uploading, or toggle to "Paste" mode above if you encounter errors.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="paste"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <textarea
                                    value={resumeText}
                                    onChange={(e) => setResumeText(e.target.value)}
                                    className="w-full bg-white border border-royal-blue/10 p-4 rounded-2xl min-h-[200px] outline-none focus:ring-2 focus:ring-royal-blue/20 font-sans text-sm"
                                    placeholder="Paste your resume text here if you have trouble uploading files..."
                                />
                            </motion.div>
                        )}
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
                                        removeFile('resume', i);
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
                    <p className="text-[10px] text-royal-blue/50 font-medium leading-relaxed">
                        <span className="text-red-500 font-bold">WARNING:</span> Ensure you include the **Employer Name** and **Location** in your paste or upload. Limited data restricts Ed's ability to research the specific company culture and financials.
                    </p>

                    <div className="flex bg-royal-blue/5 rounded-full p-1 border border-royal-blue/10 w-fit mx-auto">
                        {(['text', 'url', 'upload'] as const).map(mode => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => {
                                    if (reqMode === 'upload' && mode === 'upload') {
                                        reqFileRef.current?.click();
                                    } else {
                                        setReqMode(mode);
                                    }
                                }}
                                className={`px-6 py-2 rounded-full text-xs font-bold uppercase transition-all flex items-center gap-2 ${reqMode === mode
                                    ? 'bg-royal-blue text-white shadow-lg'
                                    : 'text-royal-blue/60 hover:text-royal-blue'
                                    }`}
                            >
                                {mode === 'upload' && <FileUp size={14} />}
                                {mode === 'url' && <LinkIcon size={14} />}
                                {mode === 'text' && <Type size={14} />}
                                {mode}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        {reqMode === 'text' && (
                            <motion.textarea
                                key="text"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                value={reqText}
                                onChange={(e) => setReqText(e.target.value)}
                                className="w-full bg-white border border-royal-blue/10 p-4 rounded-2xl min-h-[350px] outline-none focus:ring-2 focus:ring-royal-blue/20 font-sans text-sm"
                                placeholder="..."
                            />
                        )}
                        {reqMode === 'url' && (
                            <motion.div
                                key="url"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="relative"
                            >
                                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-royal-blue/40" size={18} />
                                <input
                                    type="url"
                                    value={reqUrl}
                                    onChange={(e) => setReqUrl(e.target.value)}
                                    className="w-full bg-white border border-royal-blue/10 p-4 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-royal-blue/20"
                                    placeholder="https://company.com/jobs/..."
                                />
                            </motion.div>
                        )}
                        {reqMode === 'upload' && (
                            <motion.div
                                key="upload"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                <div
                                    className="border-2 border-dashed border-royal-blue/40 rounded-2xl p-8 text-center transition-all bg-royal-blue/5 shadow-inner"
                                >
                                    <input
                                        type="file"
                                        ref={reqFileRef}
                                        onChange={handleReqFileUpload}
                                        className="hidden"
                                        multiple
                                        accept=".pdf,.doc,.docx,.txt"
                                    />
                                    <div className="flex flex-col items-center gap-4">
                                        <p className="text-royal-blue/60 font-sans">Drag & Drop Documents Here</p>
                                        <button
                                            type="button"
                                            onClick={() => reqFileRef.current?.click()}
                                            className="bg-royal-blue/5 hover:bg-royal-blue/10 text-royal-blue px-6 py-2 rounded-full text-xs font-bold transition-all border border-royal-blue/10"
                                        >
                                            Browse Files
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-royal-blue/40 mt-3 uppercase tracking-tighter">Maximum 2 files</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {reqFiles.map((file, i) => (
                                        <div key={i} className="bg-royal-blue text-white px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium shadow-lg">
                                            <span className="truncate max-w-[150px]">{file.name}</span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    removeFile('req', i);
                                                }}
                                                className="hover:text-red-300 transition-colors bg-white/20 rounded-full p-0.5"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Email Section */}
                <div className="space-y-4">
                    <label className="text-sm font-bold text-royal-blue uppercase tracking-widest flex items-center gap-2">
                        <AlertCircle size={18} /> Contact Email (Optional)
                    </label>
                    <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="w-full bg-white border border-royal-blue/10 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-royal-blue/20 font-sans text-sm"
                        placeholder="prospect@example.com (To ensure your report arrives if contact info is missing from resume)"
                    />
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
