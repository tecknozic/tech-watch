import { create } from 'zustand';
import type { ContentItem, Source, SourceType } from '../types';

interface State {
    sources: Source[];
    contentItems: ContentItem[];
    selectedSources: string[];
    searchQuery: string;
    addSource: (url: string, type: SourceType) => void;
    removeSource: (id: string) => void;
    toggleSource: (source: string) => void;
    setSearchQuery: (query: string) => void;
    fetchContent: () => void;
}


export const useStore = create<State>((set, get) => ({
    sources: [
        {
            id: 'n8n-blog',
            url: 'https://blog.n8n.io/rss/',
            type: 'web',
            name: 'n8n Blog',
            active: true
        }
    ],
    contentItems: [], // Start empty, let fetch populate
    selectedSources: [], // Empty means "Tous"
    searchQuery: '',

    addSource: (url, type) => {
        const newSource: Source = {
            id: crypto.randomUUID(),
            url,
            type,
            name: type === 'youtube' ? 'YouTube Channel' : 'Web Source',
            active: true,
        };

        set((state) => ({ sources: [...state.sources, newSource] }));
        get().fetchContent();
    },

    removeSource: (id) => {
        set((state) => ({ sources: state.sources.filter((s) => s.id !== id) }));
    },

    toggleSource: (source) => {
        set((state) => {
            if (source === 'Tous') {
                return { selectedSources: [] };
            }
            const isSelected = state.selectedSources.includes(source);
            if (isSelected) {
                return { selectedSources: state.selectedSources.filter(s => s !== source) };
            } else {
                return { selectedSources: [...state.selectedSources, source] };
            }
        });
    },
    setSearchQuery: (query) => set({ searchQuery: query }),

    fetchContent: async () => {
        try {
            const response = await fetch('/temp_rss.xml?v=' + Date.now());
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            const items = xml.querySelectorAll('item');

            const decodeHtml = (html: string) => {
                const txt = document.createElement("textarea");
                txt.innerHTML = html;
                return txt.value;
            };

            const newItems: ContentItem[] = Array.from(items)
                .sort((a, b) => {
                    const dateA = new Date(a.querySelector('pubDate')?.textContent || '');
                    const dateB = new Date(b.querySelector('pubDate')?.textContent || '');
                    return dateB.getTime() - dateA.getTime();
                })
                .map((item) => {
                    const rawTitle = item.querySelector('title')?.textContent || 'No Title';
                    const title = decodeHtml(rawTitle);
                    const link = item.querySelector('link')?.textContent || '#';
                    const description = item.querySelector('description')?.textContent || '';
                    const pubDate = item.querySelector('pubDate')?.textContent || new Date().toISOString();
                    const contentEncoded = item.getElementsByTagName('content:encoded')[0]?.textContent || '';

                    // 1. Determine Source
                    let source = 'Unknown Source';
                    let tags = ['News'];

                    // Filter out unwanted sources
                    if (link.includes('bbc.co') || link.includes('bbci.co') || link.includes('techcrunch.com')) {
                        return null;
                    }

                    if (link.includes('blogdumoderateur.com')) {
                        source = 'BDM';
                        tags = ['Tech', 'News', 'BDM'];
                    } else if (link.includes('n8n.io')) {
                        source = 'n8n Blog';
                        tags = ['Automation', 'n8n', 'Blog'];
                    } else if (link.includes('ecole.cube.fr')) {
                        source = 'École Cube';
                        tags = ['NoCode', 'Formation', 'IA'];
                    } else if (link.includes('ia-news.fr')) {
                        source = 'IA News';
                        tags = ['News', 'IA', 'France'];
                    }

                    // 2. Extract Image
                    let thumbnail = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80'; // Default fallback

                    const mediaThumbnail = item.getElementsByTagName('media:thumbnail')[0];
                    const mediaContent = item.getElementsByTagName('media:content')[0]; // Common in n8n/others
                    const enclosure = item.querySelector('enclosure[type^="image"]');
                    const image = item.querySelector('image > url'); // RSS standard

                    if (mediaThumbnail) {
                        thumbnail = mediaThumbnail.getAttribute('url') || thumbnail;
                    } else if (mediaContent) {
                        thumbnail = mediaContent.getAttribute('url') || thumbnail;
                    } else if (enclosure) {
                        thumbnail = enclosure.getAttribute('url') || thumbnail;
                    } else if (image) {
                        thumbnail = image.textContent || thumbnail;
                    } else {
                        // Fallback: Try to find img src in description or content:encoded
                        // Matches src="url" or src='url'
                        const imgRegex = /src=["']([^"']+)["']/;
                        const descMatch = description.match(imgRegex);
                        const contentMatch = contentEncoded.match(imgRegex);

                        if (contentMatch) {
                            thumbnail = contentMatch[1];
                        } else if (descMatch) {
                            thumbnail = descMatch[1];
                        }
                    }

                    // specific fallbacks if still using default
                    if (thumbnail.includes('unsplash') || !thumbnail) {
                        if (source === 'TechCrunch') {
                            thumbnail = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/TechCrunch_logo.svg/1200px-TechCrunch_logo.svg.png';
                        } else if (source === 'n8n Blog') {
                            thumbnail = 'https://n8n.io/n8n-logo.png'; // Or a relevant n8n generic image
                        } else if (source === 'IA News') {
                            thumbnail = 'https://www.ia-news.fr/wp-content/uploads/2024/01/logo-ia-news.png'; // Fallback logo if available (guessed)
                        }
                    }

                    // 3. Clean Summary
                    // Prefer description, but clean HTML
                    let summary = description.replace(/<[^>]*>/g, '').substring(0, 150) + '...';
                    // If description is short/empty (often true if it was just an image), try contentEncoded
                    if (summary.length < 20 && contentEncoded) {
                        summary = contentEncoded.replace(/<[^>]*>/g, '').substring(0, 150) + '...';
                    }

                    summary = decodeHtml(summary);

                    return {
                        id: crypto.randomUUID(),
                        title,
                        thumbnail,
                        source,
                        sourceUrl: link,
                        date: new Date(pubDate).toISOString().split('T')[0],
                        summary,
                        tags,
                        type: 'web',
                    } as ContentItem;
                })
                .filter((item): item is ContentItem => item !== null);

            set(() => ({ contentItems: newItems }));
        } catch (error) {
            console.error('Failed to fetch RSS feed:', error);
            // Fallback to initial state or keep existing if fetch fails
        }
    }
}));
