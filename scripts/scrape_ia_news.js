import fs from 'fs';
import https from 'https';

const url = 'https://www.ia-news.fr/';
const outputFile = 'ia_news_rss.xml';

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Bot/1.0)' } }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
    });
}

function parseFrenchDate(dateStr) {
    // Format: "10 décembre 2025" or "10 déc 2025" or similar
    // Remove leading "- " if present
    dateStr = dateStr.replace(/^-\s+/, '').trim();

    const parts = dateStr.split(' ');
    if (parts.length < 3) return new Date();

    const day = parseInt(parts[0]);
    let monthStr = parts[1].toLowerCase();
    const year = parseInt(parts[2]);

    const months = {
        'janvier': 0, 'jan': 0, 'janv': 0,
        'fevrier': 1, 'février': 1, 'fév': 1, 'fev': 1,
        'mars': 2, 'mar': 2,
        'avril': 3, 'avr': 3,
        'mai': 4,
        'juin': 5,
        'juillet': 6, 'juil': 6,
        'aout': 7, 'août': 7,
        'septembre': 8, 'sept': 8,
        'octobre': 9, 'oct': 9,
        'novembre': 10, 'nov': 10,
        'decembre': 11, 'décembre': 11, 'déc': 11, 'dec': 11
    };

    const month = months[monthStr] !== undefined ? months[monthStr] : 0;

    return new Date(year, month, day, 12, 0, 0); // Noon to avoid timezone shifts shifting date
}

async function scrape() {
    process.stdout.write('Fetching ' + url + '... ');
    try {
        const html = await fetchUrl(url);
        console.log('Done.');

        const items = [];
        // Split by class="item " to process each card individually
        // Note: The HTML has nested "item" classes, so we need to be careful.
        // Or we can regex find all items throughout the string.

        // Generate XML
        let xml = '<?xml version="1.0" encoding="UTF-8" ?>\n';
        xml += '<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/">\n';
        xml += '<channel>\n';
        xml += '<title>IA News</title>\n';
        xml += '<link>https://www.ia-news.fr/</link>\n';
        xml += '<description>Actualités IA</description>\n';

        // Split by <div class="item " to get chunks.
        // The "item" class seems consistent for article cards.
        // We use <div to avoid li items which are just ticker text without images.
        const parts = html.split(/<div class=["']item\s/);
        console.log(`Split into ${parts.length} parts.`);

        const uniqueLinks = new Set();
        let lastValidDate = new Date(); // Initialize to now, will update as we parse items

        for (const part of parts.slice(1)) {
            try {
                // Extract Title and Link (standard format in all observed blocks)
                // Look for class="item-title"
                const titleMatch = part.match(/class="item-title"><a href="([^"]+)" title="([^"]+)">/);

                if (!titleMatch) {
                    // console.log("No title in part");
                    continue;
                }

                const link = titleMatch[1];
                const title = titleMatch[2];

                // Deduplicate
                if (uniqueLinks.has(link)) continue;
                uniqueLinks.add(link);

                // Extract Date
                // class="item-date-time" href="...">- 10 décembre 2025</a>
                const dateMatch = part.match(/class="item-date-time"[^>]*>(?:-\s*)?([^<]+)<\/a>/);
                let dateStr = dateMatch ? dateMatch[1] : '';

                let pubDate = parseFrenchDate(dateStr);

                // If dateStr was empty or parse failed (defaulted to today for empty string in parseFrenchDate?), 
                // we want to use lastValidDate to keep order.
                // parseFrenchDate('') returns new Date() which is Today. We want to avoid that if the article is likely older.

                if (!dateStr && lastValidDate) {
                    pubDate = new Date(lastValidDate);
                } else {
                    lastValidDate = pubDate;
                }

                // Extract Snippet
                const snipMatch = part.match(/class="item-snippet"><span>([^<]+)<\/span>/);
                const description = snipMatch ? snipMatch[1] : '';

                // Extract Image from data-ss (lazy load) or data-s or src
                // data-ss="url 150w, url 400w..."
                const imgMatch = part.match(/data-ss="([^"]+)"/);
                let image = '';
                if (imgMatch) {
                    const srcSet = imgMatch[1];
                    const sources = srcSet.split(',');
                    const lastSource = sources[sources.length - 1].trim();
                    image = lastSource.split(' ')[0];
                } else {
                    const imgMatchS = part.match(/data-s="([^"]+)"/);
                    if (imgMatchS) image = imgMatchS[1];
                    else {
                        // Fallback to src if valid
                        const srcMatch = part.match(/src="([^"]+)"/);
                        if (srcMatch && !srcMatch[1].startsWith('data:')) {
                            image = srcMatch[1];
                        }
                    }
                }

                // Clean description
                const cleanDesc = description.replace(/&nbsp;/g, ' ').trim();

                items.push({
                    title,
                    link,
                    description: cleanDesc,
                    date: pubDate.toUTCString(),
                    image,
                    source: 'IA News'
                });
            } catch (e) {
                console.error('Error parsing part:', e);
            }
        }

        console.log(`Found ${items.length} items.`);

        for (const item of items) {
            xml += '<item>\n';
            xml += `  <title><![CDATA[${item.title}]]></title>\n`;
            xml += `  <link>${item.link}</link>\n`;
            xml += `  <description><![CDATA[${item.description}]]></description>\n`;
            xml += `  <pubDate>${item.date}</pubDate>\n`;
            if (item.image) {
                xml += `  <media:content url="${item.image}" medium="image" />\n`;
                xml += `  <media:thumbnail url="${item.image}" />\n`;
                xml += `  <content:encoded><![CDATA[<img src="${item.image}" /> <p>${item.description}</p>]]></content:encoded>\n`;
            } else {
                xml += `  <content:encoded><![CDATA[<p>${item.description}</p>]]></content:encoded>\n`;
            }
            xml += '</item>\n';
        }

        xml += '</channel>\n';
        xml += '</rss>';

        fs.writeFileSync(outputFile, xml);
        console.log(`Saved to ${outputFile}`);

    } catch (err) {
        console.error('Scrape failed:', err);
    }
}

scrape();
