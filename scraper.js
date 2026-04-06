const https = require('https');
const { URL } = require('url');
const fs = require('fs');

// Helper to fetch HTML
async function fetchHTML(urlString) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject).end();
  });
}

// Parse HTML and extract data
function parseHTML(html, pageUrl) {
  const data = {
    url: pageUrl,
    products: [],
    meta: {}
  };

  // Extract title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch) data.meta.title = titleMatch[1];

  // Extract description
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
  if (descMatch) data.meta.description = descMatch[1];

  // Extract products (looking for common patterns)
  // Product cards usually have class like "product", "item", "card"
  const productRegex = /<div[^>]*class="[^"]*product[^"]*"[^>]*>[\s\S]*?<\/div>/gi;
  const products = html.match(productRegex) || [];

  products.forEach((productHTML, idx) => {
    // Extract product name
    const nameMatch = productHTML.match(/<h[2-4][^>]*>([^<]+)<\/h[2-4]>/i) ||
                      productHTML.match(/<a[^>]*title="([^"]+)"/i) ||
                      productHTML.match(/<span[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)<\/span>/i);

    // Extract price
    const priceMatch = productHTML.match(/[₽р]?\s*(\d+(?:\s*\d+)*)\s*(?:₽|р)/i) ||
                       productHTML.match(/(\d+)\s*(?:₽|р|руб)/i);

    // Extract image
    const imgMatch = productHTML.match(/<img[^>]*src="([^"]+)"/i);

    // Extract link
    const linkMatch = productHTML.match(/<a[^>]*href="([^"]+)"/i);

    if (nameMatch) {
      data.products.push({
        id: idx,
        name: nameMatch[1].trim(),
        price: priceMatch ? priceMatch[1].trim() : null,
        image: imgMatch ? imgMatch[1] : null,
        link: linkMatch ? linkMatch[1] : null
      });
    }
  });

  return data;
}

// Main scraper
async function scrapeStore() {
  const baseURL = 'https://rishi-store.com';

  const pages = [
    // Categories
    { name: 'All Products', url: '/all' },
    { name: 'Jeans', url: '/jeans' },
    { name: 'Dresses', url: '/dresses' },
    { name: 'Shirts', url: '/shirts' },
    { name: 'Tops', url: '/tops' },
    { name: 'Hoodies', url: '/hoodies' },
    { name: 'Longsleeves', url: '/longsleaves' },
    { name: 'Corsets', url: '/corsets' },
    { name: 'Coats', url: '/coats' },
    { name: 'Skirts', url: '/skirts' },
    { name: 'Accessories', url: '/accessories' },
    { name: 'Mens Only', url: '/menonly' },
    { name: 'Sale', url: '/sale' },
    { name: 'New Arrivals', url: '/new' },

    // Collections
    { name: 'AW 25', url: '/aw25' },
    { name: 'RISHI x ONLY ME', url: '/rishixonlyme' },
    { name: 'RISHI x bitte ruhe', url: '/bitte' },
    { name: 'RISHI x Не просто вещь', url: '/neprostovesh' },

    // Info pages
    { name: 'About', url: '/about' },
    { name: 'Contacts', url: '/contacts' },
    { name: 'Customer Info', url: '/customer' }
  ];

  const results = {
    scrapedAt: new Date().toISOString(),
    store: 'RISHI Store',
    baseURL: baseURL,
    pages: []
  };

  console.log('🚀 Starting scrape of rishi-store.com...\n');

  for (const page of pages) {
    try {
      console.log(`📄 Scraping: ${page.name} (${page.url})`);
      const fullURL = baseURL + page.url;
      const html = await fetchHTML(fullURL);
      const pageData = parseHTML(html, fullURL);

      results.pages.push({
        name: page.name,
        path: page.url,
        ...pageData
      });

      console.log(`   ✅ Found ${pageData.products.length} items\n`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
  }

  // Save to JSON
  fs.writeFileSync('rishi-store-data.json', JSON.stringify(results, null, 2));

  // Generate summary
  const totalProducts = results.pages.reduce((sum, p) => sum + p.products.length, 0);
  console.log('\n=== SCRAPE COMPLETE ===');
  console.log(`📊 Total pages: ${results.pages.length}`);
  console.log(`🛍️  Total products found: ${totalProducts}`);
  console.log(`💾 Data saved to: rishi-store-data.json`);

  return results;
}

scrapeStore().catch(console.error);
