
import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown';
import { useStore } from '../store/useStore';
import { Sparkles, Loader2, Calendar, AlertTriangle, Volume2, StopCircle } from 'lucide-react';
import { TTSManager } from '../utils/tts';

export default function DailyRecap() {
    const { contentItems, fetchContent } = useStore();
    const [summary, setSummary] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);

    // Fetch content on mount if empty
    React.useEffect(() => {
        if (contentItems.length === 0) {
            fetchContent();
        }
    }, [contentItems.length, fetchContent]);

    // Restore from localStorage
    React.useEffect(() => {
        const saved = localStorage.getItem('dailyRecap');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Check if it's from today or relevant? User said "jusqu'au moment où un nouveau récap est généré".
                // So we just load it regardless of date.
                if (parsed.summary) {
                    setSummary(parsed.summary);
                    setLastGeneratedAt(parsed.date);
                }
            } catch (e) {
                console.error("Failed to parse saved recap", e);
            }
        }
    }, []);

    const generateRecap = async () => {
        setLoading(true);
        setError(null);
        // Don't clear summary immediately if you want to keep showing old one while generating?
        // User said "until a new recap is generated".
        // But usually refreshing UI state is better. Let's keep it visible until success?
        // Actually standard UX is to show loading state. 
        // Let's keep the old summary visible but maybe dimmed or just show loading overlay?
        // Simpler: clear it to avoid confusion between old and new.
        setSummary('');
        setLastGeneratedAt(null);

        try {
            const apiKey = import.meta.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY;
            if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
                throw new Error('Clé API manquante. Ajoutez VITE_GOOGLE_GENERATIVE_AI_API_KEY dans le fichier .env.');
            }

            // Filter for news from last 48h to ensure we have content
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            const todayStr = today.toISOString().split('T')[0];
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            console.log('Filtering dates:', { todayStr, yesterdayStr });
            console.log('Available items:', contentItems.map(i => ({ t: i.title, d: i.date })));

            const relevantItems = contentItems.filter(item => {
                return item.date === yesterdayStr || item.date === todayStr;
            });

            if (relevantItems.length === 0) {
                setSummary(`Aucune actualité trouvée pour la période du ${yesterdayStr} au ${todayStr}.`);
                setLoading(false);
                return;
            }

            // Prepare prompt
            const articlesText = relevantItems.map(item => `- ${item.title} (${item.source}): ${item.summary}`).join('\n');
            const prompt = `
tu es un Expert en Automatisation et en Veille Technologique, spécialisé dans l'écosystème "No-Code/Low-Code" et l'Intelligence Artificielle.

TA MISSION:
À partir des articles ci - dessous, rédige une synthèse détaillée et rigoureuse.Ton but est d'apporter de la valeur et de l'analyse à un public de professionnels.

        RÈGLES DE FORMATAGE:
- Utilise des emojis ** uniquement ** pour les grands titres de section(H1).N'en mets pas dans le texte.
        - Fais des ** paragraphes détaillés ** : explique le fond des choses, ne reste pas en surface.Développe les implications techniques.
- ** TRES IMPORTANT ** : Pour aérer le texte, insère systématiquement une ligne vide entre chaque paragraphe(double saut de ligne) pour garantir la lisibilité.

STRUCTURE ATTENDUE:

# 🌍 Contexte & Enjeux
        (Une analyse approfondie du paysage actuel basé sur les articles.Relie les points entre eux.)

# 🚀 Les Nouveautés à Retenir

### Modèles & IA
        (Développe les annonces.Si un nouveau modèle sort, explique ses specs, ses cas d'usage, et ses différences avec les précédents.)

### Outils & NoCode
            (Détaille les mises à jour.Concrètement, qu'est-ce qu'on peut faire de nouveau ?)

# 🔮 Analyse Prospective
            (Au - delà de l'annonce, quel est l'impact à moyen terme pour les développeurs et les entreprises ?)

# 💡 Conclusion
            (Une synthèse finale pertinente)

CONTENU À ANALYSER :
            ${articlesText}
            `;

            const modelsToTry = ["gemini-3-pro-preview", "gemini-2.5-flash"];
            let resultText = '';
            let lasterror = null;

            for (const modelName of modelsToTry) {
                try {
                    console.log(`Trying model: ${modelName}`);
                    const genAI = new GoogleGenerativeAI(apiKey);
                    const model = genAI.getGenerativeModel({ model: modelName });

                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    resultText = response.text();

                    if (resultText) break; // Success
                } catch (e: any) {
                    console.warn(`Model ${modelName} failed: `, e.message);
                    lasterror = e;
                    // Continue to next model
                }
            }

            if (!resultText && lasterror) {
                throw lasterror;
            }

            setSummary(resultText);
            const now = new Date().toISOString();
            setLastGeneratedAt(now);

            // Persist
            localStorage.setItem('dailyRecap', JSON.stringify({
                summary: resultText,
                date: now
            }));

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Une erreur est survenue lors de la génération (Quota ou API).");
        } finally {
            setLoading(false);
        }
    };

    const [ttsManager] = useState(() => {
        const key = import.meta.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY;
        return key ? new TTSManager(key) : null;
    });

    React.useEffect(() => {
        if (ttsManager) {
            ttsManager.setOnStateChange(setIsSpeaking);
            ttsManager.setOnPlaybackStart(() => setIsBuffering(false));
        }
        return () => {
            if (ttsManager) {
                ttsManager.stop();
            }
        };
    }, [ttsManager]);


    const speakSummary = () => {
        if (!summary || !ttsManager) return;

        if (isSpeaking) {
            ttsManager.stop();
            setIsBuffering(false);
            return;
        }

        setIsBuffering(true);
        ttsManager.speak(summary);
    };

    return (
        <div className="p-8 max-w-4xl mx-auto text-white">
            <header className="mb-8">
                <h1 className="text-3xl font-bold font-display text-primary mb-2 flex items-center gap-3">
                    <Sparkles className="w-8 h-8" />
                    Récapitulatif IA
                </h1>
                <p className="text-gray-400">Générez un résumé des actualités de la veille avec Gemini 3 Pro.</p>
                {lastGeneratedAt && (
                    <p className="text-xs text-gray-500 mt-2">
                        Dernière génération : {new Date(lastGeneratedAt).toLocaleString('fr-FR')}
                    </p>
                )}
            </header>

            <div className="bg-surface rounded-3xl p-6 border border-white/5 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-gray-300">
                        <Calendar className="w-5 h-5 text-primary" />
                        <span>Actualités de la veille</span>
                    </div>
                    <div className="flex gap-2">
                        {summary && ttsManager && (
                            <button
                                onClick={speakSummary}
                                disabled={isBuffering && isSpeaking}
                                className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 border ${isSpeaking
                                    ? isBuffering
                                        ? "bg-surface border-white/10 text-gray-400 cursor-wait"
                                        : "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
                                    : "bg-surface border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
                                    }`}
                            >
                                {isSpeaking ? (
                                    isBuffering ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />
                                ) : (
                                    <Volume2 className="w-4 h-4" />
                                )}
                                {isSpeaking ? (isBuffering ? "Veuillez patienter..." : "Arrêter la lecture") : "Écouter le résumé"}
                            </button>
                        )}
                        <button
                            onClick={generateRecap}
                            disabled={loading}
                            className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                            {loading ? 'Génération...' : 'Générer le résumé'}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3 mb-4">
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p>{error}</p>
                    </div>
                )}

                {summary && (
                    <div className="mt-6 bg-[#1F2026] p-8 rounded-2xl border border-white/5 relative">
                        <ReactMarkdown
                            components={{
                                h1: (props) => <h1 className="text-2xl md:text-3xl font-bold text-primary mt-10 mb-6 border-b border-white/10 pb-4" {...props} />,
                                h2: (props) => <h2 className="text-xl md:text-2xl font-semibold text-white mt-8 mb-4" {...props} />,
                                h3: (props) => <h3 className="text-lg md:text-xl font-medium text-blue-300 mt-6 mb-3" {...props} />,
                                p: (props) => <p className="text-gray-300 leading-loose mb-6 text-base md:text-lg" {...props} />,
                                ul: (props) => <ul className="list-disc pl-6 mb-6 space-y-3 text-gray-300" {...props} />,
                                li: (props) => <li className="leading-relaxed" {...props} />,
                                strong: (props) => <strong className="text-white font-bold" {...props} />,
                                blockquote: (props) => <blockquote className="border-l-4 border-primary/50 pl-4 italic text-gray-400 my-6" {...props} />
                            }}
                        >
                            {summary}
                        </ReactMarkdown>
                    </div>
                )}

                {!summary && !loading && !error && (
                    <div className="text-center py-12 text-gray-500 italic">
                        Cliquez sur "Générer" pour lancer l'analyse des flux de la veille.
                    </div>
                )}
            </div>
        </div>
    );
}
