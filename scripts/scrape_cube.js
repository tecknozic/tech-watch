import fs from 'fs';
import https from 'https';

const url = 'https://www.ecole.cube.fr/blog';
const outputFile = 'cube_rss.xml';

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
            res.on('error', reject);
        }).on('error', reject);
    });
}

async function scrape() {
    process.stdout.write('Fetching ' + url + '... ');
    try {
        const html = await fetchUrl(url);
        console.log('Done.');

        const items = [];
        // Split by list item to process each card individually
        const rawItems = html.split('role="listitem"').slice(1);

        for (const raw of rawItems) {
            // Stop if we hit the end of the collection list (rough check)
            if (raw.includes('w-pagination-wrapper')) break;

            try {
                // Extract Link
                const linkMatch = raw.match(/href="(\/blog\/[^"]+)"/);
                if (!linkMatch) continue;
                const link = 'https://www.ecole.cube.fr' + linkMatch[1];

                // Extract Image
                const imgMatch = raw.match(/src="([^"]+)"/);
                const image = imgMatch ? imgMatch[1] : '';

                // Extract Category
                const catMatch = raw.match(/category-label">([^<]+)</);
                const category = catMatch ? catMatch[1].trim() : 'Blog';

                // Extract Title
                const titleMatch = raw.match(/faq_content_q-text big">([^<]+)</);
                const title = titleMatch ? titleMatch[1].trim() : 'No Title';

                // Extract Description
                const descMatch = raw.match(/text-size-semimedium">([^<]+)</);
                const description = descMatch ? descMatch[1].trim() : '';

                // Mock Date (randomized recent dates since we can't scrape exact date easily from list)
                // Or just set to today. Randomizing slightly to avoid all showing as same time.
                const date = new Date();
                date.setHours(date.getHours() - Math.floor(Math.random() * 240)); // Last 10 days

                items.push({
                    title,
                    link,
                    description,
                    content: description,
                    date: date.toUTCString(),
                    image,
                    category
                });
            } catch (e) {
                console.error('Error parsing item: ' + e);
            }
        }

        console.log(`Found ${items.length} items.`);

        // Generate XML
        let xml = '<?xml version="1.0" encoding="UTF-8" ?>\n';
        xml += '<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/">\n';
        xml += '<channel>\n';
        xml += '<title>École Cube Blog</title>\n';
        xml += '<link>https://www.ecole.cube.fr/blog</link>\n';
        xml += '<description>Latest updates from École Cube</description>\n';

        for (const item of items) {
            xml += '<item>\n';
            xml += `  <title><![CDATA[${item.title}]]></title>\n`;
            xml += `  <link>${item.link}</link>\n`;
            xml += `  <description><![CDATA[${item.description}]]></description>\n`;
            xml += `  <pubDate>${item.date}</pubDate>\n`;
            xml += `  <media:content url="${item.image}" medium="image" />\n`; // Best practice
            xml += `  <media:thumbnail url="${item.image}" />\n`; // Fallback
            // Add implicit image in content for robust parsing
            xml += `  <content:encoded><![CDATA[<img src="${item.image}" /> ${item.content}]]></content:encoded>\n`;
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
