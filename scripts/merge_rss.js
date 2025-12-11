
import fs from 'fs';
import path from 'path';

const rssFiles = [
    'tc_rss.xml',
    'n8n_rss.xml',
    'cube_rss.xml',
    'ia_news_rss.xml',
];
const target = 'public/temp_rss.xml';
const baseFile = 'bbc_rss.xml';

// Helper to extract items using basic string manipulation to avoid XML dependencies
function extractItems(content) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(content)) !== null) {
        items.push(match[0]);
    }
    return items;
}

try {
    // Read master URL (Base is BBC)
    if (!fs.existsSync(baseFile)) {
        throw new Error(`Base file ${baseFile} not found.`);
    }
    let masterContent = fs.readFileSync(baseFile, 'utf-8');

    // Find insertion point (before </channel>)
    const endChannelValue = '</channel>';
    const insertIndex = masterContent.lastIndexOf(endChannelValue);

    if (insertIndex === -1) {
        throw new Error(`Could not find </channel> in ${baseFile}`);
    }

    let newItemsString = '';

    for (const file of rssFiles) {
        if (!fs.existsSync(file)) {
            console.log(`Skipping ${file} - not found`);
            continue;
        }

        const content = fs.readFileSync(file, 'utf-8');
        const items = extractItems(content);
        console.log(`Found ${items.length} items in ${file} `);

        newItemsString += '\n' + items.join('\n');
    }

    const newContent = masterContent.slice(0, insertIndex) + newItemsString + masterContent.slice(insertIndex);

    fs.writeFileSync(target, newContent);
    console.log('Successfully merged content.');

} catch (error) {
    console.error('Merge failed:', error);
}
