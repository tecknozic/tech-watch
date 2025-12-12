
import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import { useStore } from '../store/useStore';
import { Sparkles, Loader2, Calendar, AlertTriangle } from 'lucide-react';

export default function DailyRecap() {
    const { contentItems, fetchContent } = useStore();
    const [summary, setSummary] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
À partir du lot d'articles (${relevantItems.length} articles) fournis ci-dessous, rédige une synthèse structurée et pédagogique. Ton objectif est de rendre ces informations techniques (IA et n8n) accessibles à un public non-expert, tout en conservant la précision du fond. Ne fais pas un résumé article par article, mais une fusion thématique des informations.

FORMAT DE SORTIE REQUIS (Respecte scrupuleusement cette structure) :

1. CONTEXTE GLOBAL & ENJEUX
- En 2-3 phrases simples, explique de quoi parlent ces articles globalement.
- Pourquoi est-ce important maintenant ? (Le "Big Picture").

2. ANALYSE DES AVANCÉES & FONCTIONNALITÉS
- Détaille les nouveautés ou concepts clés mentionnés.
- Explique les termes techniques complexes (ex: nœuds, agents, LLM, API) entre parenthèses ou via des analogies simples.
- Mets en **gras** les entités importantes (outils, entreprises, modèles d'IA).

3. FAITS vs PERSPECTIVES
- Distingue clairement les annonces concrètes (ce qui est sorti/prouvé) des promesses ou opinions (ce que l'on espère pour le futur).
- Utilise une liste à puces pour cette section.

4. CONCLUSION & IMPACT PRATIQUE
- Résume l'impact concret pour un utilisateur de n8n ou d'IA.
- Une phrase de clôture engageante.

TON ET STYLE :
- Vulgarisé et Éducatif : Parle comme un mentor bienveillant qui explique une nouveauté à un collègue curieux.
- Engageant : Utilise des phrases actives. Évite le jargon corporatif froid.
- Langue : Français impeccable.

CONTENU À ANALYSER :
${articlesText}
`;

            const modelsToTry = [
                { id: "gemini-3-pro-preview", name: "Gemini 3 Pro (Preview)" },
                { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" }
            ];

            let resultText = '';
            let usedModelName = '';
            const errors: string[] = [];

            for (const modelInfo of modelsToTry) {
                const modelName = modelInfo.id;
                try {
                    console.log(`Trying model: ${modelName}`);

                    if (modelName === "gemini-3-pro-preview") {
                        const ai = new GoogleGenAI({ apiKey });
                        const response = await ai.models.generateContent({
                            model: modelName,
                            contents: prompt,
                            config: {
                                thinkingConfig: {
                                    thinkingLevel: "low" as any,
                                },
                            },
                        });
                        resultText = response.text || '';
                        if (typeof resultText !== 'string') resultText = JSON.stringify(resultText);
                    } else {
                        const genAI = new GoogleGenerativeAI(apiKey);
                        const model = genAI.getGenerativeModel({ model: modelName });
                        const result = await model.generateContent(prompt);
                        const response = await result.response;
                        resultText = response.text();
                    }

                    if (resultText) {
                        usedModelName = modelInfo.name;
                        break;
                    }
                } catch (e: any) {
                    console.warn(`Model ${modelName} failed:`, e.message);
                    errors.push(e.message);
                }
            }

            if (!resultText) {
                throw new Error(errors.join('\n\n') || "Impossible de générer le résumé.");
            }

            // If we used the second model (fallback), and there were errors, show a warning
            if (usedModelName !== modelsToTry[0].name && errors.length > 0) {
                setError(`Note: Le modèle principal a échoué (${errors[0]}). Résumé généré avec ${usedModelName}.`);
            }

            setSummary(resultText);

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Une erreur est survenue.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto text-white">
            <header className="mb-8">
                <h1 className="text-3xl font-bold font-display text-primary mb-2 flex items-center gap-3">
                    <Sparkles className="w-8 h-8" />
                    Récapitulatif IA
                </h1>
                <p className="text-gray-400">Générez un résumé des actualités de la veille avec Gemini.</p>
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
                    <div className="prose prose-invert max-w-none mt-6 bg-[#1F2026] p-8 rounded-2xl border border-white/5 shadow-inner">
                        <ReactMarkdown
                            components={{
                                h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-primary mt-8 mb-4 border-b border-white/10 pb-2" {...props} />,
                                h2: ({ node, ...props }) => <h2 className="text-xl font-semibold text-white mt-8 mb-4 flex items-center gap-2" {...props} />,
                                h3: ({ node, ...props }) => <h3 className="text-lg font-medium text-gray-200 mt-6 mb-3" {...props} />,
                                p: ({ node, ...props }) => <p className="text-gray-300 leading-relaxed mb-4" {...props} />,
                                ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-6 space-y-2 mb-6 text-gray-300" {...props} />,
                                ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-6 space-y-2 mb-6 text-gray-300" {...props} />,
                                li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                strong: ({ node, ...props }) => <strong className="text-white font-semibold" {...props} />,
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
