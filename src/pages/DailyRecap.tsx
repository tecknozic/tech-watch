
import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown';
import { useStore } from '../store/useStore';
import { Sparkles, Loader2, Calendar, AlertTriangle, Volume2, StopCircle } from 'lucide-react';

export default function DailyRecap() {
    const { contentItems, fetchContent } = useStore();
    const [summary, setSummary] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Fetch content on mount if empty
    React.useEffect(() => {
        if (contentItems.length === 0) {
            fetchContent();
        }
    }, [contentItems.length, fetchContent]);

    const generateRecap = async () => {
        setLoading(true);
        setError(null);
        setSummary('');

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
Tu es un Expert en Automatisation et en Veille Technologique, spécialisé dans l'écosystème "No-Code/Low-Code" et l'Intelligence Artificielle.

TA MISSION :
À partir des articles ci-dessous, rédige une synthèse **très aérée** et **agréable à lire**. Ton but est d'informer un public tech non-expert sans l'ennuyer.

RÈGLES D'OR DE FORMATAGE :
- Utilise des **emojis** pour chaque titre de section et pour les points importants.
- Fais des **paragraphes courts** (max 3-4 lignes).
- Saute des lignes entre chaque idée.
- Utilise abondamment les **listes à puces** pour énumérer les nouveautés.

STRUCTURE ATTENDUE :

# 🌍 Contexte & Enjeux
(2-3 phrases simples pour introduire le sujet global et son importance aujourd'hui)

# 🚀 Les Nouveautés à Retenir

### 🧠 Modèles & IA
- Point clé 1
- Point clé 2

### 🛠️ Outils & NoCode (n8n, etc.)
- Point clé 1
- Point clé 2

# 🔮 Ce qu'il faut en penser
(Analyse rapide : Est-ce une révolution ou une évolution ? Qu'attendre pour la suite ?)

# 💡 Conclusion Pratique
(Une phrase d'impact pour l'utilisateur)

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
                    console.warn(`Model ${modelName} failed:`, e.message);
                    lasterror = e;
                    // Continue to next model
                }
            }

            if (!resultText && lasterror) {
                throw lasterror;
            }

            setSummary(resultText);

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Une erreur est survenue lors de la génération (Quota ou API).");
        } finally {
            setLoading(false);
        }
    };

    const speakSummary = () => {
        if (!summary) return;

        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(summary);
        utterance.lang = 'fr-FR';
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
    };

    return (
        <div className="p-8 max-w-4xl mx-auto text-white">
            <header className="mb-8">
                <h1 className="text-3xl font-bold font-display text-primary mb-2 flex items-center gap-3">
                    <Sparkles className="w-8 h-8" />
                    Récapitulatif IA
                </h1>
                <p className="text-gray-400">Générez un résumé des actualités de la veille avec Gemini 3 Pro.</p>
            </header>

            <div className="bg-surface rounded-3xl p-6 border border-white/5 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-gray-300">
                        <Calendar className="w-5 h-5 text-primary" />
                        <span>Actualités de la veille</span>
                    </div>
                    <button
                        onClick={generateRecap}
                        disabled={loading}
                        className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        {loading ? 'Génération...' : 'Générer le résumé'}
                    </button>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3 mb-4">
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p>{error}</p>
                    </div>
                )}

                {summary && (
                    <div className="prose prose-invert max-w-none mt-6 bg-[#1F2026] p-6 rounded-2xl border border-white/5 relative">
                        <button
                            onClick={speakSummary}
                            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-gray-300 hover:text-white transition-colors"
                            title={isSpeaking ? "Arrêter la lecture" : "Lire le résumé"}
                        >
                            {isSpeaking ? <StopCircle className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                        <ReactMarkdown>{summary}</ReactMarkdown>
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
