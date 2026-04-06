const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeStore() {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const baseURL = 'https://rishi-store.com';

    const pages = [
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
      { name: 'AW 25', url: '/aw25' },
      { name: 'RISHI x ONLY ME', url: '/rishixonlyme' },
      { name: 'RISHI x bitte ruhe', url: '/bitte' },
      { name: 'RISHI x Не просто вещь', url: '/neprostovesh' },
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

    console.log('🚀 Starting scrape with browser...\n');

    for (const page of pages) {
      const page_obj = await browser.newPage();
      try {
        console.log(`📄 Scraping: ${page.name} (${page.url})`);
        const fullURL = baseURL + page.url;

        await page_obj.goto(fullURL, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        // Wait for content to load
        await page_obj.waitForTimeout(2000);

        // Extract page data
        const pageData = await page_obj.evaluate(() => {
          const data = {
            title: document.title,
            url: window.location.href,
            products: [],
            description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
            headings: [],
            links: []
          };

          // Get all text content from page
          data.pageText = document.body.innerText;

          // Try to find products in various common structures
          // Look for elements with product-related classes
          const productSelectors = [
            '[class*="product"]',
            '[class*="item"]',
            '[class*="card"]',
            'article',
            '[data-product]'
          ];

          const seenNames = new Set();

          for (const selector of productSelectors) {
            document.querySelectorAll(selector).forEach((el) => {
              // Get product name
              const name = el.querySelector('h2, h3, h4, [class*="name"], [class*="title"]')?.textContent?.trim() ||
                          el.getAttribute('data-name') ||
                          el.getAttribute('aria-label');

              // Get price
              const priceText = el.innerText.match(/[₽р]?\s*(\d+(?:\s*\d+)*)\s*(?:₽|р|руб)/i)?.[0];

              // Get image
              const img = el.querySelector('img');
              const image = img?.src || img?.getAttribute('data-src');

              // Get link
              const link = el.querySelector('a')?.href;

              if (name && !seenNames.has(name)) {
                seenNames.add(name);
                data.products.push({
                  name: name,
                  price: priceText || null,
                  image: image || null,
                  link: link || null
                });
              }
            });
          }

          // Get all links on page
          data.links = Array.from(document.querySelectorAll('a'))
            .slice(0, 20)
            .map(a => ({
              text: a.textContent.trim(),
              href: a.href
            }));

          // Get headings
          data.headings = Array.from(document.querySelectorAll('h1, h2, h3'))
            .slice(0, 10)
            .map(h => h.textContent.trim());

          return data;
        });

        results.pages.push({
          name: page.name,
          path: page.url,
          ...pageData
        });

        console.log(`   ✅ Found ${pageData.products.length} items\n`);

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
      } finally {
        await page_obj.close();
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

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

scrapeStore().catch(console.error);
