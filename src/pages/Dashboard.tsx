import { useEffect } from 'react';
import { Search } from 'lucide-react';
import { useStore } from '../store/useStore';
import { ContentCard } from '../components/ContentCard';
import { cn } from '../utils/cn';

export function Dashboard() {
    const { contentItems, selectedSources, toggleSource, searchQuery, setSearchQuery, fetchContent } = useStore();

    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

    // Extract unique sources from content items
    const availableSources = Array.from(new Set(contentItems.map(item => item.source))).filter(Boolean).sort();

    const filteredItems = contentItems.filter((item) => {
        // Source Filter
        if (selectedSources.length > 0 && !selectedSources.includes(item.source)) {
            return false;
        }

        // Search Filter
        if (searchQuery) {
            if (!item.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
                !item.summary.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }
        }
        return true;
    });

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-4xl font-normal text-white">Overview</h1>
                </div>

                <div className="flex items-center gap-4">
                    {/* Search Pill */}
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search content..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-12 w-64 rounded-full bg-surface text-sm text-white placeholder-gray-500 pl-12 pr-6 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Filters & Content */}
            <div className="flex flex-col space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                    {/* 'Tous' Button */}
                    <button
                        onClick={() => toggleSource('Tous')}
                        className={cn(
                            "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300",
                            selectedSources.length === 0
                                ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105"
                                : "bg-surface text-gray-400 hover:bg-surface/80 hover:text-white"
                        )}
                    >
                        Tous
                    </button>

                    {/* Source Buttons */}
                    {availableSources.map((source) => (
                        <button
                            key={source}
                            onClick={() => toggleSource(source)}
                            className={cn(
                                "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300",
                                selectedSources.includes(source)
                                    ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105"
                                    : "bg-surface text-gray-400 hover:bg-surface/80 hover:text-white"
                            )}
                        >
                            {source}
                        </button>
                    ))}
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                    {filteredItems.map((item) => (
                        <ContentCard key={item.id} item={item} />
                    ))}
                </div>

                {filteredItems.length === 0 && (
                    <div className="flex h-64 items-center justify-center rounded-3xl bg-surface border border-dashed border-gray-700">
                        <p className="text-gray-500">No content found matching your criteria.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

