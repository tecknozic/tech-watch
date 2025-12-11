
import fs from 'fs';
import { execSync } from 'child_process';

const feeds = [
    { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', file: 'bbc_rss.xml' },
    { url: 'https://techcrunch.com/category/artificial-intelligence/feed/', file: 'tc_rss.xml' },
    { url: 'https://blog.n8n.io/rss/', file: 'n8n_rss.xml' }
];

async function downloadFeed(url, filepath) {
    try {
        console.log(`Downloading ${url}...`);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        const text = await response.text();
        fs.writeFileSync(filepath, text);
        console.log(`Saved to ${filepath}`);
    } catch (error) {
        console.error(`Error downloading ${url}:`, error);
    }
}

async function runScrapers() {
    try {
        console.log('Running Ecole Cube scraper...');
        execSync('node scripts/scrape_cube.js', { stdio: 'inherit' });

        console.log('Running IA News scraper...');
        execSync('node scripts/scrape_ia_news.js', { stdio: 'inherit' });
    } catch (error) {
        console.error('Error running scrapers:', error);
    }
}

async function mergeFeeds() {
    try {
        console.log('Merging feeds...');
        execSync('node scripts/merge_rss.js', { stdio: 'inherit' });
    } catch (error) {
        console.error('Error merging feeds:', error);
    }
}

async function main() {
    // 1. Download standard feeds
    await Promise.all(feeds.map(f => downloadFeed(f.url, f.file)));

    // 2. Run custom scrapers
    await runScrapers();

    // 3. Merge all
    await mergeFeeds();
}

main();
