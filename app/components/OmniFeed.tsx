'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Type, Clock, Lock, ShieldCheck, Link as LinkIcon, Check, Edit2, Bold, Italic, Heading2 } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';
import { db } from '../lib/firebase';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    orderBy,
    setDoc
} from 'firebase/firestore';

interface Article {
    id: string;
    headline: string;
    subtitle: string;
    content: string;
    imageUrl: string;
    imageUrl2?: string;
    publishedDate: string;
    isPinned?: boolean;
}

const SEED_ARTICLES: Article[] = [
    {
        id: '1',
        headline: 'The Silence of Strategy: Why Elite Careers are Built in the Shadows',
        subtitle: 'Navigating the unseen corridors of corporate power and the art of the strategic pause.',
        content: "The modern professional landscape is loud. Between the incessant notification pings and the 'hustle culture' that permeates every social feed, there is a mounting pressure to be perpetually visible. Yet, the most resilient and elite careers are often built on the opposite: the silence of strategy.\n\nIn this editorial, we explore the concept of the 'Shadow Strategist'—those who move within the corporate architecture with precision, choosing impact over noise. Strategic silence isn't just about not speaking; it's about the deliberate allocation of presence and the timing of intervention.\n\nWhen we look at the trajectory of C-suite executives who have survived multiple leadership transitions, a common thread emerges: they mastery of the strategic pause. They are the ones who listen in meetings until the very end, who don't feel the need to respond to every email instantly, and who build their internal networks through quiet, meaningful connection rather than broadcast-style self-promotion.",
        imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200',
        imageUrl2: 'https://images.unsplash.com/photo-1507679799987-c7377ec48696?auto=format&fit=crop&q=80&w=1200',
        publishedDate: 'February 11, 2026'
    },
    {
        id: '2',
        headline: 'The Architecture of Influence: Beyond the Job Description',
        subtitle: 'How to map the informal power structures that actually drive decision-making.',
        content: "You were hired for a role, but you are evaluated on your influence. In most high-stakes environments, the organizational chart provided by HR is a polite fiction. The real work—the decisions that shift budgets, trigger reorganizations, and determine promotions—happens in the informal networks that exist between the boxes.\n\nTo master the architecture of influence, one must become a cartographer of corporate power. This involves identifying the 'Knowledge Brokers' (those who have access to information before it's official) and the 'Trust Nodes' (those whom the decision-makers consult before pulling the trigger).\n\nInfluence is not about authority; it's about being the person others want to say 'yes' to. By mapping these informal structures, you can align your efforts with the true velocity of the organization, ensuring your contributions are seen by the people who matter most.",
        imageUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=1200',
        publishedDate: 'February 10, 2026'
    },
    {
        id: '3',
        headline: 'The Gap Analysis: Reclaiming the Narrative of Your Career',
        subtitle: 'Transforming technical shortcomings into strategic advantages through AI-driven auditing.',
        content: "Most professionals treat their resume as a history book. Elite professionals treat it as a pitch deck. The difference lies in the Gap Analysis.\n\nA gap is not a failure; it is a coordinate. By identifying the distance between your current profile and your target role, you gain the power to build a strategic bridge. Using AI-driven auditing tools allows you to strip away the emotional weight of 'not being qualified' and replaces it with a technical checklist of requirements.\n\nThis editorial breaks down the three stages of a narrative reclamation: The Audit, The Translation (turning past experience into future value), and The Injection (placing your new narrative into the market with surgical precision).",
        imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1200',
        publishedDate: 'February 9, 2026',
        isPinned: true
    }
];

export const OmniFeed: React.FC = () => {
    const [articles, setArticles] = useState<Article[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [showAdmin, setShowAdmin] = useState(false);
    const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
    const [copied, setCopied] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [adminTab, setAdminTab] = useState<'articles' | 'gap'>('articles');
    const [gapSettings, setGapSettings] = useState({
        headline: "Your Report is In Glenn's Inbox.",
        subheadline: "Accelerate your transition with our Elite Narrative Reclamation Service.",
        salesCopy: "Our team takes the GAP data and manually crafts a bespoke resume and cover letter package that removes every hurdle identified in the audit.",
        buttonText: "Schedule Strategy Call",
        buttonLink: "#"
    });

    const [debugLog, setDebugLog] = useState<string[]>([]);
    const addLog = useCallback((msg: string) => {
        console.log(`[FIREBASE] ${msg}`);
        setDebugLog(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${msg}`]);
    }, []);

    // Cloud Sync logic: Listen to Firestore in real-time
    useEffect(() => {
        let isTimedOut = false;
        const keyPrefix = (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "NONE").substring(0, 4);

        // Wrap initial log in setTimeout to avoid cascading render warning
        const logTimeout = setTimeout(() => {
            addLog(`☁️ Sync Start (Key: ${keyPrefix}...)`);
        }, 0);

        const forceLoadTimeout = setTimeout(() => {
            if (!isLoaded) {
                addLog("⚠️ Connection Timeout. Entering Fallback Mode.");
                isTimedOut = true;
                setArticles(SEED_ARTICLES);
                setIsLoaded(true);
            }
        }, 10000);

        if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY === "NONE") {
            setTimeout(() => {
                addLog("❌ ERROR: Missing API Configuration.");
                setIsLoaded(true);
                setArticles(SEED_ARTICLES);
            }, 0);
            clearTimeout(forceLoadTimeout);
            clearTimeout(logTimeout);
            return;
        }

        try {
            const q = query(collection(db, 'articles'), orderBy('publishedDate', 'desc'));

            addLog("📡 Listening for Cloud Updates...");
            const unsubscribe = onSnapshot(q, (snapshot) => {
                if (isTimedOut) return;
                clearTimeout(forceLoadTimeout);

                addLog(`✅ Data Received! Count: ${snapshot.size}`);
                const cloudArticles: Article[] = [];
                snapshot.forEach((doc) => {
                    cloudArticles.push({ id: doc.id, ...doc.data() } as Article);
                });

                if (cloudArticles.length > 0) {
                    setArticles(cloudArticles);
                } else {
                    addLog("🌱 Cloud empty. Ready for first post.");
                    setArticles(SEED_ARTICLES);
                }
                setIsLoaded(true);
            }, (error) => {
                if (isTimedOut) return;
                clearTimeout(forceLoadTimeout);
                addLog(`❌ CLOUD SYNC FAIL: ${error.code}`);
                setArticles(SEED_ARTICLES);
                setIsLoaded(true);

                if (error.code === 'permission-denied') {
                    alert("SECURITY BLOCK: Rules are locked. Set them to 'allow read, write: if true;' in Firebase console.");
                }
            });

            return () => {
                clearTimeout(forceLoadTimeout);
                clearTimeout(logTimeout);
                unsubscribe();
            };
        } catch (err: unknown) {
            const error = err as Error;
            setTimeout(() => {
                addLog(`❌ CRITICAL: ${error.message}`);
                setIsLoaded(true);
                setArticles(SEED_ARTICLES);
            }, 0);
            clearTimeout(forceLoadTimeout);
            clearTimeout(logTimeout);
        }
    }, [addLog, isLoaded]);

    // Load GAP Settings
    useEffect(() => {
        if (!db) return;
        const unsubscribe = onSnapshot(doc(db, 'settings', 'gapSuccessPage'), (snapshot) => {
            if (snapshot.exists()) {
                setGapSettings(snapshot.data() as {
                    headline: string;
                    subheadline: string;
                    salesCopy: string;
                    buttonText: string;
                    buttonLink: string;
                });
            }
        });
        return () => unsubscribe();
    }, []);

    const handleSaveGapSettings = async () => {
        if (!db) return;
        try {
            addLog("💾 Saving GAP Success Settings...");
            await setDoc(doc(db, 'settings', 'gapSuccessPage'), gapSettings);
            addLog("✅ GAP Settings Saved.");
            alert("Success Page Settings Updated!");
        } catch (err: unknown) {
            const error = err as Error;
            addLog(`❌ Save Error: ${error.message}`);
        }
    };

    // Helper to sync changes to cloud
    const saveArticleToCloud = async (articleData: Partial<Article>, id?: string) => {
        console.log("💾 Attempting cloud save...", { id, data: articleData });
        try {
            if (id) {
                const docRef = doc(db, 'articles', id);
                await updateDoc(docRef, articleData);
                console.log("✅ Update successful");
            } else {
                const colRef = collection(db, 'articles');
                await addDoc(colRef, {
                    ...articleData,
                    publishedDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                });
                console.log("✅ New post successful");
            }
        } catch (error: unknown) {
            const err = error as Error;
            console.error("❌ Cloud save failed:", err);
            alert(`Cloud Save Failed: ${err.message}\n\nPlease check if your Firebase Security Rules allow writing.`);
            throw err;
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const articleId = params.get('article');

        if (articleId && !selectedArticle) {
            const article = articles.find(a => a.id === articleId);
            if (article) {
                // Non-blocking state update to satisfy lint
                setTimeout(() => setSelectedArticle(article), 0);
            }
        }
    }, [articles, selectedArticle]);

    const handleSelectArticle = (article: Article | null) => {
        setSelectedArticle(article);
        const url = new URL(window.location.href);
        if (article) {
            url.searchParams.set('article', article.id);
        } else {
            url.searchParams.delete('article');
        }
        window.history.pushState({}, '', url);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Admin Form State
    const [newHeadline, setNewHeadline] = useState('');
    const [newSubtitle, setNewSubtitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newImageUrl, setNewImageUrl] = useState('');
    const [newImageUrl2, setNewImageUrl2] = useState('');
    const [newIsPinned, setNewIsPinned] = useState(false);
    const [newDate, setNewDate] = useState(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));

    // Event-driven Admin Toggle from Header
    useEffect(() => {
        const handleToggle = () => setShowAdmin(prev => !prev);
        window.addEventListener('sslduck-toggle-admin', handleToggle);
        return () => window.removeEventListener('sslduck-toggle-admin', handleToggle);
    }, []);

    // Notify Header of state changes
    useEffect(() => {
        const event = new CustomEvent('sslduck-admin-state', { detail: { isOpen: showAdmin } });
        window.dispatchEvent(event);
    }, [showAdmin]);

    const handleAuth = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordInput === 'sslduck2026') {
            setIsAdminAuthenticated(true);
        } else {
            alert('Access Denied');
        }
    };

    const handlePublish = async () => {
        console.log('📝 Attempting to publish...', { headline: newHeadline, image: newImageUrl });

        if (!newHeadline.trim()) {
            alert('Wait! Your editorial needs a Headline.');
            return;
        }
        if (!newImageUrl.trim()) {
            alert('Error: You must provide a Hero Image URL (e.g., /images/photo.jpg)');
            return;
        }
        if (!newContent.trim()) {
            alert('Content Missing: Please paste your article text or HTML.');
            return;
        }

        try {
            const articleData = {
                headline: newHeadline,
                subtitle: newSubtitle,
                content: newContent,
                imageUrl: newImageUrl,
                imageUrl2: newImageUrl2,
                isPinned: newIsPinned,
                publishedDate: newDate,
            };

            if (editingId) {
                await saveArticleToCloud(articleData, editingId);
                setEditingId(null);
                alert('Success: Article updated in Cloud!');
            } else {
                await saveArticleToCloud(articleData);
                alert('Success: Article published to Cloud Gallery!');
            }
            resetForm();
            setShowAdmin(false);
        } catch (error) {
            console.error('❌ Critical failure in publishing:', error);
            alert('Something went wrong while saving. Please try again.');
        }
    };

    const handleEdit = (article: Article) => {
        setEditingId(article.id);
        setNewHeadline(article.headline);
        setNewSubtitle(article.subtitle);
        setNewContent(article.content);
        setNewImageUrl(article.imageUrl);
        setNewImageUrl2(article.imageUrl2 || '');
        setNewIsPinned(article.isPinned || false);
        setNewDate(article.publishedDate);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setEditingId(null);
        setNewHeadline('');
        setNewSubtitle('');
        setNewContent('');
        setNewImageUrl('');
        setNewImageUrl2('');
        setNewIsPinned(false);
        setNewDate(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
    };

    const getRenderedContent = (content: string = '') => {
        if (!content) return { __html: '' };

        try {
            const rawHtml = marked.parse(content, {
                gfm: true,
                breaks: true
            }) as string;

            if (typeof window !== 'undefined') {
                return { __html: DOMPurify.sanitize(rawHtml) };
            }
            return { __html: rawHtml };
        } catch (e) {
            console.error('Render error:', e);
            return { __html: content.replace(/\n/g, '<br />') };
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const html = e.clipboardData.getData('text/html');
        if (html) {
            e.preventDefault();
            try {
                // Determine the correct Turndown constructor based on import style
                type TurndownConstructor = new (options?: { headingStyle?: string; codeBlockStyle?: string }) => {
                    addRule: (name: string, rule: any) => void;
                    turndown: (html: string) => string;
                };

                const Turndown = ((TurndownService as unknown as { default?: TurndownConstructor }).default || (TurndownService as unknown as TurndownConstructor)) as TurndownConstructor;
                const turndownService = new Turndown({
                    headingStyle: 'atx',
                    codeBlockStyle: 'fenced'
                });

                turndownService.addRule('strikethrough', {
                    filter: ['del', 's', 'strike'],
                    replacement: (content: string) => '~~' + content + '~~'
                });

                const markdown = turndownService.turndown(html);

                const textarea = e.currentTarget as HTMLTextAreaElement;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const text = textarea.value;
                const before = text.substring(0, start);
                const after = text.substring(end);

                const cursorPosition = start + markdown.length;
                setNewContent(before + markdown + after);

                setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(cursorPosition, cursorPosition);
                }, 0);
            } catch (err) {
                console.error('Markdown conversion error:', err);
                const text = e.clipboardData.getData('text/plain');
                const textarea = e.currentTarget as HTMLTextAreaElement;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const currentText = textarea.value;
                setNewContent(currentText.substring(0, start) + text + currentText.substring(end));
            }
        }
    };

    return (
        <section id="articles" className="bg-background min-h-screen py-20 px-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-end mb-16 border-b border-royal-blue/10 pb-8">
                    <div>
                        <h2 className="text-4xl md:text-5xl font-serif font-bold text-royal-blue mb-4">Editorial Gallery</h2>
                        <p className="text-lg text-royal-blue/60 font-sans max-w-xl">Curated insights and long-form analysis for the modern professional.</p>
                    </div>
                </div>

                {/* Admin Input Portal */}
                <AnimatePresence>
                    {showAdmin && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden mb-16"
                        >
                            {!isAdminAuthenticated ? (
                                <div className="bg-white/50 backdrop-blur-md border border-royal-blue/10 rounded-3xl p-12 shadow-xl text-center max-w-md mx-auto">
                                    <ShieldCheck className="mx-auto text-royal-blue mb-4" size={48} />
                                    <h3 className="text-2xl font-serif font-bold text-royal-blue mb-6">Restricted Access</h3>
                                    <form onSubmit={handleAuth} className="space-y-4">
                                        <input
                                            type="password"
                                            value={passwordInput}
                                            onChange={(e) => setPasswordInput(e.target.value)}
                                            placeholder="Enter Administrator Password"
                                            className="w-full bg-background/50 border border-royal-blue/10 p-4 rounded-xl outline-none focus:ring-2 focus:ring-royal-blue/20 text-center"
                                        />
                                        <button className="w-full bg-royal-blue text-soft-lavender py-4 rounded-xl font-bold uppercase tracking-widest shadow-lg">
                                            Authenticate
                                        </button>
                                    </form>
                                </div>
                            ) : (
                                <div className="bg-white/50 backdrop-blur-md border border-royal-blue/10 rounded-3xl p-8 shadow-xl">
                                    <div className="flex flex-col gap-8 mb-8 border-b border-royal-blue/10 pb-8">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-3xl font-serif font-bold text-royal-blue">Content Engine</h3>
                                                    <span className={`${process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'bg-green-600' : 'bg-orange-500'} text-white text-[10px] px-2 py-0.5 rounded-full font-bold`}>
                                                        {process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'CLOUD CONNECTED' : 'OFFLINE MODE'}
                                                    </span>
                                                </div>
                                                <div className="space-y-1">
                                                    {debugLog.map((log, i) => (
                                                        <p key={i} className={`text-[9px] font-mono uppercase tracking-tighter ${log.includes('❌') ? 'text-red-500' : 'text-royal-blue/30'}`}>
                                                            {log}
                                                        </p>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-4 items-center">
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Disconnecting may reset current view. PROCEED?')) {
                                                            window.location.reload();
                                                        }
                                                    }}
                                                    className="text-[10px] font-bold text-royal-blue/30 hover:text-royal-blue uppercase tracking-widest border border-royal-blue/10 px-3 py-1 rounded-full transition-colors"
                                                >
                                                    Active Cloud Sync
                                                </button>
                                                <span className="text-[10px] font-bold text-royal-blue/40 uppercase tracking-widest bg-royal-blue/5 px-3 py-1 rounded-full">Management Mode</span>
                                            </div>
                                        </div>

                                        {/* TAB NAVIGATION - Redesigned for Maximum Visibility */}
                                        <div className="flex p-1 bg-royal-blue/5 border border-royal-blue/10 rounded-2xl w-fit">
                                            <button
                                                onClick={() => setAdminTab('articles')}
                                                className={`px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${adminTab === 'articles' ? 'bg-royal-blue text-white shadow-xl scale-105' : 'text-royal-blue/40 hover:text-royal-blue'}`}
                                            >
                                                Editorial Articles
                                            </button>
                                            <button
                                                onClick={() => setAdminTab('gap')}
                                                className={`px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${adminTab === 'gap' ? 'bg-royal-blue text-white shadow-xl scale-105' : 'text-royal-blue/40 hover:text-royal-blue'}`}
                                            >
                                                GAP Success Page Editor
                                            </button>
                                        </div>
                                    </div>

                                    {adminTab === 'articles' ? (
                                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
                                            {/* Entry Form */}
                                            <div className="xl:col-span-2 space-y-8">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div className="space-y-6">
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-bold text-royal-blue uppercase tracking-widest flex items-center gap-2">
                                                                <Type size={16} /> Headline
                                                            </label>
                                                            <input
                                                                value={newHeadline}
                                                                onChange={(e) => setNewHeadline(e.target.value)}
                                                                className="w-full bg-background/50 border border-royal-blue/10 p-4 rounded-xl outline-none focus:ring-2 focus:ring-royal-blue/20 font-serif text-xl"
                                                                placeholder="Enter full headline..."
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="text-sm font-bold text-royal-blue uppercase tracking-widest flex items-center gap-2">
                                                                Sub-headline
                                                            </label>
                                                            <input
                                                                value={newSubtitle}
                                                                onChange={(e) => setNewSubtitle(e.target.value)}
                                                                className="w-full bg-background/50 border border-royal-blue/10 p-4 rounded-xl outline-none focus:ring-2 focus:ring-royal-blue/20"
                                                                placeholder="A brief context for the editorial..."
                                                            />
                                                        </div>

                                                        <div className="grid grid-cols-1 gap-4">
                                                            <div className="space-y-2">
                                                                <label className="text-sm font-bold text-royal-blue uppercase tracking-widest flex items-center gap-2">
                                                                    <ImageIcon size={16} /> Primary Hero
                                                                </label>
                                                                <input
                                                                    value={newImageUrl}
                                                                    onChange={(e) => setNewImageUrl(e.target.value)}
                                                                    className="w-full bg-background/50 border border-royal-blue/10 p-4 rounded-xl outline-none focus:ring-2 focus:ring-royal-blue/20 text-sm"
                                                                    placeholder="/images/photo1.jpg"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-sm font-bold text-royal-blue uppercase tracking-widest flex items-center gap-2">
                                                                    <ImageIcon size={16} /> Secondary Plot
                                                                </label>
                                                                <input
                                                                    value={newImageUrl2}
                                                                    onChange={(e) => setNewImageUrl2(e.target.value)}
                                                                    className="w-full bg-background/50 border border-royal-blue/10 p-4 rounded-xl outline-none focus:ring-2 focus:ring-royal-blue/20 text-sm"
                                                                    placeholder="/images/photo2.jpg"
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-4 pt-4 border-t border-royal-blue/5">
                                                                <label className="relative inline-flex items-center cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={newIsPinned}
                                                                        onChange={(e) => setNewIsPinned(e.target.checked)}
                                                                        className="sr-only peer"
                                                                    />
                                                                    <div className="w-11 h-6 bg-royal-blue/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-royal-blue"></div>
                                                                    <span className="ml-3 text-sm font-bold text-royal-blue uppercase tracking-widest">Pin to Top</span>
                                                                </label>
                                                                <span className="text-[10px] text-royal-blue/40">(Featured slots available)</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2 flex flex-col h-full">
                                                        <label className="text-sm font-bold text-royal-blue uppercase tracking-widest flex items-center justify-between">
                                                            <span className="flex items-center gap-2">Editorial Content</span>
                                                            <span className="text-[10px] text-royal-blue/40 font-mono">Supports HTML & Markdown</span>
                                                        </label>

                                                        <div className="flex flex-wrap gap-2 p-2 bg-royal-blue/5 border border-royal-blue/10 rounded-t-xl border-b-0">
                                                            <button
                                                                onClick={() => {
                                                                    const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
                                                                    const start = textarea.selectionStart;
                                                                    const end = textarea.selectionEnd;
                                                                    const text = textarea.value;
                                                                    const selection = text.substring(start, end);
                                                                    const result = `<strong>${selection || 'Bold Text'}</strong>`;
                                                                    setNewContent(text.substring(0, start) + result + text.substring(end));
                                                                }}
                                                                className="flex items-center gap-1 px-2 py-1.5 hover:bg-royal-blue/10 rounded-md text-royal-blue/60 transition-colors text-xs font-bold" title="Bold">
                                                                <Bold size={14} /> <span>BOLD</span>
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
                                                                    const start = textarea.selectionStart;
                                                                    const end = textarea.selectionEnd;
                                                                    const text = textarea.value;
                                                                    const selection = text.substring(start, end);
                                                                    const result = `<em>${selection || 'Italic Text'}</em>`;
                                                                    setNewContent(text.substring(0, start) + result + text.substring(end));
                                                                }}
                                                                className="flex items-center gap-1 px-2 py-1.5 hover:bg-royal-blue/10 rounded-md text-royal-blue/60 transition-colors text-xs font-bold" title="Italic">
                                                                <Italic size={14} /> <span>ITALIC</span>
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
                                                                    const start = textarea.selectionStart;
                                                                    const end = textarea.selectionEnd;
                                                                    const text = textarea.value;
                                                                    const selection = text.substring(start, end);
                                                                    const result = `<h2>${selection || 'Article Heading'}</h2>`;
                                                                    setNewContent(text.substring(0, start) + result + text.substring(end));
                                                                }}
                                                                className="flex items-center gap-1 px-2 py-1.5 hover:bg-royal-blue/10 rounded-md text-royal-blue/60 transition-colors text-xs font-bold" title="Heading">
                                                                <Heading2 size={14} /> <span>H2 TAG</span>
                                                            </button>
                                                            <div className="w-px bg-royal-blue/10 mx-1" />
                                                            <p className="text-[10px] text-royal-blue/30 flex items-center px-2 italic">Tip: Buttons now insert HTML tags directly</p>
                                                        </div>

                                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
                                                            <textarea
                                                                id="content-editor"
                                                                value={newContent}
                                                                onChange={(e) => setNewContent(e.target.value)}
                                                                onPaste={handlePaste}
                                                                className="min-h-[400px] w-full bg-background/50 border border-royal-blue/10 p-6 rounded-b-xl lg:rounded-bl-xl lg:rounded-tr-none outline-none focus:ring-2 focus:ring-royal-blue/20 font-serif leading-relaxed resize-none text-sm"
                                                                placeholder="Type here..."
                                                            />
                                                            <div className="hidden lg:block bg-white/30 border border-royal-blue/10 p-6 rounded-br-xl rounded-tr-xl overflow-y-auto max-h-[400px]">
                                                                <p className="text-[10px] font-bold text-royal-blue/30 uppercase mb-4 tracking-widest">Live Preview</p>
                                                                <div
                                                                    className="editorial-content font-serif text-royal-blue/70"
                                                                    dangerouslySetInnerHTML={getRenderedContent(newContent)}
                                                                />
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={handlePublish}
                                                            className="mt-4 w-full bg-royal-blue text-soft-lavender py-4 rounded-xl font-bold uppercase tracking-widest shadow-lg hover:opacity-90 transition-all font-sans"
                                                        >
                                                            {editingId ? 'Update Article' : 'Publish Article'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Management List */}
                                            <div className="bg-royal-blue/5 rounded-2xl p-6 border border-royal-blue/10">
                                                <h4 className="text-sm font-bold text-royal-blue uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                                    <ShieldCheck size={16} /> Live Inventory
                                                </h4>
                                                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {articles.map(art => (
                                                        <div key={art.id} className="bg-white p-4 rounded-xl shadow-sm border border-royal-blue/5 flex items-center justify-between gap-4">
                                                            <div className="min-w-0">
                                                                <p className="font-serif font-bold text-royal-blue truncate text-sm">{art.headline}</p>
                                                                <p className="text-[10px] text-royal-blue/40 uppercase font-bold">{art.publishedDate}</p>
                                                            </div>
                                                            <div className="flex gap-1 shrink-0">
                                                                <button
                                                                    onClick={() => handleEdit(art)}
                                                                    className="p-2 rounded-lg bg-royal-blue/5 text-royal-blue/40 hover:bg-royal-blue/10 hover:text-royal-blue transition-colors"
                                                                    title="Edit"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        await updateDoc(doc(db, 'articles', art.id), { isPinned: !art.isPinned });
                                                                    }}
                                                                    className={`p-2 rounded-lg transition-colors ${art.isPinned ? 'bg-royal-blue text-white' : 'bg-royal-blue/5 text-royal-blue/40 hover:bg-royal-blue/10'}`}
                                                                    title={art.isPinned ? 'Unpin' : 'Pin'}
                                                                >
                                                                    <Lock size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        if (confirm('Delete this article from CLOUD?')) {
                                                                            await deleteDoc(doc(db, 'articles', art.id));
                                                                        }
                                                                    }}
                                                                    className="p-2 rounded-lg bg-red-500/5 text-red-500/40 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-6">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-bold text-royal-blue uppercase tracking-widest">Success Headline</label>
                                                        <input
                                                            value={gapSettings.headline}
                                                            onChange={(e) => setGapSettings({ ...gapSettings, headline: e.target.value })}
                                                            className="w-full bg-background/50 border border-royal-blue/10 p-4 rounded-xl outline-none focus:ring-2 focus:ring-royal-blue/20"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-bold text-royal-blue uppercase tracking-widest">Sub-headline</label>
                                                        <input
                                                            value={gapSettings.subheadline}
                                                            onChange={(e) => setGapSettings({ ...gapSettings, subheadline: e.target.value })}
                                                            className="w-full bg-background/50 border border-royal-blue/10 p-4 rounded-xl outline-none focus:ring-2 focus:ring-royal-blue/20"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-bold text-royal-blue uppercase tracking-widest">CTA Button Text</label>
                                                            <input
                                                                value={gapSettings.buttonText}
                                                                onChange={(e) => setGapSettings({ ...gapSettings, buttonText: e.target.value })}
                                                                className="w-full bg-background/50 border border-royal-blue/10 p-4 rounded-xl outline-none focus:ring-2 focus:ring-royal-blue/20"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-bold text-royal-blue uppercase tracking-widest">CTA Link</label>
                                                            <input
                                                                value={gapSettings.buttonLink}
                                                                onChange={(e) => setGapSettings({ ...gapSettings, buttonLink: e.target.value })}
                                                                className="w-full bg-background/50 border border-royal-blue/10 p-4 rounded-xl outline-none focus:ring-2 focus:ring-royal-blue/20"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-royal-blue uppercase tracking-widest">Main Sales Body Copy</label>
                                                    <textarea
                                                        value={gapSettings.salesCopy}
                                                        onChange={(e) => setGapSettings({ ...gapSettings, salesCopy: e.target.value })}
                                                        className="w-full bg-background/50 border border-royal-blue/10 p-4 rounded-xl outline-none focus:ring-2 focus:ring-royal-blue/20 min-h-[250px] resize-none"
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleSaveGapSettings}
                                                className="w-full bg-royal-blue text-white py-4 rounded-xl font-bold uppercase tracking-widest shadow-xl hover:opacity-90 transition-all font-sans"
                                            >
                                                Save Success Page Configuration
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Article Grid */}
                {!isLoaded ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal-blue" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {[...articles].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)).map((article) => (
                            <motion.div
                                layoutId={article.id}
                                key={article.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ scale: 1.02 }}
                                onClick={() => handleSelectArticle(article)}
                                className={`group cursor-pointer bg-white/30 backdrop-blur-sm border rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-500 ${article.isPinned ? 'border-royal-blue/20 ring-1 ring-royal-blue/5 shadow-royal-blue/5' : 'border-royal-blue/5'}`}
                            >
                                <div className="aspect-video overflow-hidden relative">
                                    {article.isPinned && (
                                        <div className="absolute top-4 left-4 bg-royal-blue text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest z-10 shadow-lg flex items-center gap-1">
                                            <Lock size={10} /> Featured
                                        </div>
                                    )}
                                    <img
                                        src={article.imageUrl}
                                        alt={article.headline}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                </div>
                                <div className="p-8">
                                    <div className="flex items-center gap-4 text-xs font-bold text-royal-blue/50 uppercase tracking-widest mb-4">
                                        <span className="flex items-center gap-1"><Clock size={12} /> {article.isPinned ? 'Priority' : 'Insight'}</span>
                                        <span>•</span>
                                        <span>{article.publishedDate}</span>
                                    </div>
                                    <h4 className="text-2xl font-serif font-bold text-royal-blue mb-3 group-hover:text-royal-blue/80 transition-colors leading-snug">{article.headline}</h4>
                                    <p className="text-royal-blue/60 line-clamp-2 leading-relaxed">{article.subtitle}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Reading Mode Modal */}
            <AnimatePresence>
                {selectedArticle && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[2000] flex items-center justify-center p-0 md:p-6"
                    >
                        <div
                            className="absolute inset-0 bg-background/95 backdrop-blur-xl"
                            onClick={() => setSelectedArticle(null)}
                        />

                        <motion.div
                            layoutId={selectedArticle.id}
                            className="relative w-full max-w-4xl h-full md:h-[90vh] bg-background md:rounded-3xl shadow-2xl overflow-y-auto"
                        >
                            <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-50">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleSelectArticle(null)}
                                        className="p-2 bg-royal-blue text-soft-lavender rounded-full shadow-lg hover:scale-110 transition-transform"
                                    >
                                        <X size={24} />
                                    </button>
                                    <button
                                        onClick={copyToClipboard}
                                        className="flex items-center gap-2 px-6 py-3 bg-royal-blue text-white border border-white/20 rounded-full shadow-2xl font-bold text-sm hover:scale-105 active:scale-95 transition-all"
                                    >
                                        {copied ? <Check size={18} className="text-green-300" /> : <LinkIcon size={18} />}
                                        {copied ? 'Link Copied' : 'Share Article'}
                                    </button>
                                </div>
                            </div>

                            <div className="p-8 md:p-16">
                                <header className="max-w-2xl mx-auto mb-16 text-center">
                                    <div className="text-sm font-bold text-royal-blue/40 uppercase tracking-[0.3em] mb-6">
                                        {selectedArticle.publishedDate}
                                    </div>
                                    <h1 className="text-4xl md:text-6xl font-serif font-black text-royal-blue mb-8 leading-[1.1]">
                                        {selectedArticle.headline}
                                    </h1>
                                    <p className="text-xl md:text-2xl text-royal-blue/60 font-medium italic">
                                        {selectedArticle.subtitle}
                                    </p>
                                </header>

                                <div className="w-full aspect-video rounded-3xl overflow-hidden mb-16 shadow-2xl">
                                    <img
                                        src={selectedArticle.imageUrl}
                                        alt={selectedArticle.headline}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                <article className="max-w-2xl mx-auto">
                                    <div
                                        className="prose prose-xl font-serif text-royal-blue/80 leading-[1.8] editorial-content prose-headings:text-royal-blue prose-strong:text-royal-blue prose-a:text-royal-blue"
                                        dangerouslySetInnerHTML={getRenderedContent(selectedArticle.content)}
                                    />

                                    <p className="mt-8 text-sm italic text-royal-blue/40 border-t border-royal-blue/5 pt-4">
                                        Note: This editorial supports embedded media and specialized formatting via HTML.
                                    </p>
                                </article>

                                {selectedArticle.imageUrl2 && (
                                    <div className="max-w-2xl mx-auto mt-16">
                                        <div className="w-full aspect-video rounded-3xl overflow-hidden shadow-xl">
                                            <img
                                                src={selectedArticle.imageUrl2}
                                                alt="Supporting image"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </div>
                                )}

                                <footer className="max-w-2xl mx-auto mt-20 pt-10 border-t border-royal-blue/10 text-center">
                                    <p className="text-sm font-bold text-royal-blue/30 uppercase tracking-[0.2em]">End of Editorial</p>
                                    <div className="mt-8">
                                        <button
                                            onClick={() => handleSelectArticle(null)}
                                            className="bg-royal-blue text-soft-lavender px-10 py-4 rounded-full font-bold shadow-xl hover:opacity-90 transition-all"
                                        >
                                            Return to Gallery
                                        </button>
                                    </div>
                                </footer>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <style jsx global>{`
                .editorial-content h2 {
                    font-size: 1.8rem;
                    font-weight: 700;
                    color: #003366;
                    margin-top: 2rem;
                    margin-bottom: 1rem;
                    font-family: serif;
                    line-height: 1.2;
                }
                .editorial-content strong {
                    font-weight: 800;
                    color: #003366;
                }
                .editorial-content em {
                    font-style: italic;
                    opacity: 0.9;
                }
                .editorial-content p {
                    margin-bottom: 1.5rem;
                }
            `}</style>
        </section>
    );
};
