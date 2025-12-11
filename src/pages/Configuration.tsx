import { useState } from 'react';
import { Plus, Trash2, Youtube, Globe, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../utils/cn';
import type { SourceType } from '../types';

export function Configuration() {
    const { sources, addSource, removeSource } = useStore();
    const [url, setUrl] = useState('');
    const [type, setType] = useState<SourceType>('youtube');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!url.trim()) {
            setError('Please enter a valid URL');
            return;
        }

        try {
            new URL(url);
        } catch {
            setError('Invalid URL format');
            return;
        }

        addSource(url, type);
        setUrl('');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-4xl font-normal text-white">Configuration</h1>
                <p className="text-gray-400 mt-1">Manage your content sources</p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                {/* Ad Source Form */}
                <div className="rounded-3xl bg-surface p-8 shadow-sm">
                    <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                        <Plus className="h-5 w-5 text-primary" />
                        Add New Source
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Source Type
                            </label>
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setType('youtube')}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border transition-all",
                                        type === 'youtube'
                                            ? "bg-red-500/10 border-red-500/50 text-red-500 shadow-lg shadow-red-500/10"
                                            : "border-gray-700 bg-background/50 text-gray-400 hover:border-gray-600"
                                    )}
                                >
                                    <Youtube className="h-4 w-4" />
                                    YouTube
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('web')}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border transition-all",
                                        type === 'web'
                                            ? "bg-blue-500/10 border-blue-500/50 text-blue-500 shadow-lg shadow-blue-500/10"
                                            : "border-gray-700 bg-background/50 text-gray-400 hover:border-gray-600"
                                    )}
                                >
                                    <Globe className="h-4 w-4" />
                                    Web Page
                                </button>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="url" className="block text-sm font-medium text-gray-400 mb-2">
                                URL
                            </label>
                            <input
                                id="url"
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder={type === 'youtube' ? "https://youtube.com/..." : "https://example.com/..."}
                                className="w-full rounded-2xl bg-background border border-transparent px-5 py-3 text-white placeholder-gray-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 p-4 rounded-2xl">
                                <AlertCircle className="h-4 w-4" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-3 px-4 rounded-2xl transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
                        >
                            <Plus className="h-5 w-5" />
                            Add Source
                        </button>
                    </form>
                </div>

                {/* Info / Instructions */}
                <div className="rounded-3xl bg-surface p-8 shadow-sm">
                    <h2 className="text-xl font-semibold text-white mb-6">How it works</h2>
                    <ul className="space-y-4 text-gray-400 text-sm">
                        <li className="flex gap-4">
                            <span className="h-8 w-8 rounded-full bg-background text-white flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-inner">1</span>
                            <span className="py-1">Add a YouTube channel URL or a website URL (RSS/Blog).</span>
                        </li>
                        <li className="flex gap-4">
                            <span className="h-8 w-8 rounded-full bg-background text-white flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-inner">2</span>
                            <span className="py-1">The system will automatically scrape the latest content.</span>
                        </li>
                        <li className="flex gap-4">
                            <span className="h-8 w-8 rounded-full bg-background text-white flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-inner">3</span>
                            <span className="py-1">New items will appear in your Dashboard immediately.</span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Source List */}
            <div className="rounded-3xl bg-surface overflow-hidden shadow-sm">
                <div className="border-b border-gray-800/50 px-8 py-6">
                    <h2 className="text-lg font-semibold text-white">Active Sources</h2>
                </div>

                {sources.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        No sources added yet. Add your first source above.
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-800/50">
                        {sources.map((source) => (
                            <li key={source.id} className="flex items-center justify-between p-6 hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg",
                                        source.type === 'youtube' ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
                                    )}>
                                        {source.type === 'youtube' ? <Youtube className="h-6 w-6" /> : <Globe className="h-6 w-6" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-white text-lg">{source.name}</p>
                                        <p className="text-sm text-gray-500 truncate max-w-xs md:max-w-md">{source.url}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => removeSource(source.id)}
                                    className="h-10 w-10 flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                    title="Remove Source"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
