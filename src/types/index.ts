export type SourceType = 'youtube' | 'web';

export interface Source {
    id: string;
    url: string;
    type: SourceType;
    name: string;
    active: boolean;
}

export interface ContentItem {
    id: string;
    title: string;
    thumbnail: string;
    source: string;
    sourceUrl: string;
    date: string;
    summary: string;
    fullContent?: string;
    tags: string[];
    type: SourceType;
}
