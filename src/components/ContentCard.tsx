import { Calendar, Youtube, Globe, MoreHorizontal } from 'lucide-react';
import type { ContentItem } from '../types';

interface ContentCardProps {
    item: ContentItem;
}

export function ContentCard({ item }: ContentCardProps) {
    return (
        <div className="group relative flex flex-col overflow-hidden rounded-3xl bg-surface transition-all hover:-translate-y-1">
            {/* Top Image Section */}
            <div className="relative h-48 w-full overflow-hidden">
                <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80 group-hover:opacity-100"
                />
                <div className="absolute top-4 right-4 text-white">
                    <MoreHorizontal className="h-6 w-6 drop-shadow-md" />
                </div>

                {/* Source Badge */}
                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center text-white border border-white/10">
                        {item.type === 'youtube' ? <Youtube className="h-4 w-4 text-red-500" /> : <Globe className="h-4 w-4 text-blue-500" />}
                    </div>
                    <span className="text-xs font-medium text-white shadow-black drop-shadow-md">{item.source}</span>
                </div>
            </div>

            {/* Content Section */}
            <div className="flex flex-1 flex-col p-6">
                <div className="mb-3 flex items-center gap-2 text-xs font-medium text-secondary">
                    <Calendar className="h-3 w-3" />
                    <span>{item.date}</span>
                </div>

                <h3 className="mb-3 text-lg font-bold leading-tight text-white group-hover:text-primary transition-colors">
                    <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="focus:outline-none">
                        <span className="absolute inset-0" aria-hidden="true" />
                        {item.title}
                    </a>
                </h3>

                <p className="mb-4 line-clamp-2 text-sm text-gray-400">
                    {item.summary}
                </p>

                <div className="mt-auto flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                        <span
                            key={tag}
                            className="inline-flex items-center rounded-full bg-background px-3 py-1 text-xs font-semibold text-gray-300"
                        >
                            #{tag}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
