const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class RishiStoreScraper {
  constructor() {
    this.baseURL = 'https://rishi-store.com';
    this.data = {
      scrapedAt: new Date().toISOString(),
      store: 'RISHI Store',
      baseURL: this.baseURL,
      pages: []
    };
    this.browser = null;
  }

  async init() {
    this.browser = await chromium.launch({
      headless: true,
      executablePath: 'C:\\Users\\panvo\\AppData\\Local\\ms-playwright\\chromium-1217\\chrome-win64\\chrome.exe',
      args: ['--no-sandbox']
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async scrapePage(pageName, pagePath) {
    const context = await this.browser.newContext();
    const page = await context.newPage();

    try {
      const fullURL = this.baseURL + pagePath;
      console.log(`\n📄 Scraping: ${pageName}`);
      console.log(`   URL: ${fullURL}`);

      // Navigate with timeout
      await page.goto(fullURL, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      // Wait for dynamic content
      await page.waitForTimeout(2000);

      // Scroll to load lazy-loaded content
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });
      await page.waitForTimeout(1000);

      // Extract all data from the page
      const pageData = await page.evaluate(() => {
        const result = {
          title: document.title,
          url: window.location.href,
          meta: {
            description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
            keywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content') || ''
          },
          products: [],
          categories: [],
          collections: [],
          links: [],
          headings: [],
          text: ''
        };

        // Get all text content
        result.text = document.body.innerText.substring(0, 5000); // First 5000 chars

        // Get all headings
        document.querySelectorAll('h1, h2, h3, h4').forEach(h => {
          const text = h.textContent.trim();
          if (text) result.headings.push({
            level: h.tagName,
            text: text
          });
        });

        // Find products - try multiple selectors
        const productElements = document.querySelectorAll(
          '[class*="product"], [class*="item"], [class*="card"], article, [data-product], li'
        );

        const seenProducts = new Set();

        productElements.forEach((el) => {
          // Get product info
          const nameEl = el.querySelector('h2, h3, h4, [class*="name"], [class*="title"]');
          const priceEl = el.querySelector('[class*="price"]');
          const linkEl = el.querySelector('a[href*="/product"], a[href*="/item"]');
          const imgEl = el.querySelector('img');

          const name = nameEl?.textContent?.trim() || el.getAttribute('data-name');
          const price = priceEl?.textContent?.trim() ||
                       el.innerText.match(/[₽р]?\s*(\d+(?:\s*\d+)*)\s*(?:₽|р|руб)/i)?.[0];
          const link = linkEl?.href || el.querySelector('a')?.href;
          const image = imgEl?.src || imgEl?.getAttribute('data-src');

          if (name && !seenProducts.has(name)) {
            seenProducts.add(name);
            result.products.push({
              name: name,
              price: price || null,
              image: image || null,
              link: link || null
            });
          }
        });

        // Get navigation links
        const navLinks = document.querySelectorAll('nav a, header a, [role="navigation"] a');
        navLinks.forEach(a => {
          const text = a.textContent.trim();
          const href = a.href;
          if (text && href && !result.links.some(l => l.href === href)) {
            result.links.push({
              text: text,
              href: href
            });
          }
        });

        return result;
      });

      console.log(`   ✅ Title: ${pageData.title}`);
      console.log(`   📦 Products found: ${pageData.products.length}`);
      console.log(`   🔗 Links found: ${pageData.links.length}`);

      this.data.pages.push({
        name: pageName,
        path: pagePath,
        ...pageData
      });

      return pageData;

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      return null;
    } finally {
      await context.close();
    }
  }

  async scrapeAll() {
    const pages = [
      // Main sections
      { name: 'Home', path: '' },
      { name: 'All Products', path: '/all' },

      // Categories
      { name: 'Jeans', path: '/jeans' },
      { name: 'Dresses', path: '/dresses' },
      { name: 'Shirts', path: '/shirts' },
      { name: 'Tops', path: '/tops' },
      { name: 'Hoodies', path: '/hoodies' },
      { name: 'Longsleeves', path: '/longsleaves' },
      { name: 'Corsets', path: '/corsets' },
      { name: 'Coats', path: '/coats' },
      { name: 'Skirts', path: '/skirts' },
      { name: 'Accessories', path: '/accessories' },
      { name: 'Men Only', path: '/menonly' },

      // Collections
      { name: 'AW 25', path: '/aw25' },
      { name: 'RISHI x ONLY ME', path: '/rishixonlyme' },
      { name: 'RISHI x bitte ruhe', path: '/bitte' },
      { name: 'RISHI x Не просто вещь', path: '/neprostovesh' },

      // Special sections
      { name: 'Sale', path: '/sale' },
      { name: 'New Arrivals', path: '/new' },

      // Info pages
      { name: 'About', path: '/about' },
      { name: 'Contacts', path: '/contacts' },
      { name: 'Customer Info', path: '/customer' }
    ];

    console.log('🚀 Starting RISHI Store scraper (Playwright)...');
    console.log(`📍 Base URL: ${this.baseURL}\n`);

    for (const page of pages) {
      await this.scrapePage(page.name, page.path);
      // Throttle requests
      await new Promise(r => setTimeout(r, 1000));
    }

    return this.data;
  }

  saveResults(filename = 'rishi-store-data.json') {
    const filepath = path.join(process.cwd(), filename);
    fs.writeFileSync(filepath, JSON.stringify(this.data, null, 2));
    return filepath;
  }

  generateReport() {
    const totalProducts = this.data.pages.reduce((sum, p) => sum + (p.products?.length || 0), 0);
    const totalLinks = this.data.pages.reduce((sum, p) => sum + (p.links?.length || 0), 0);

    console.log('\n' + '='.repeat(50));
    console.log('📊 SCRAPE REPORT');
    console.log('='.repeat(50));
    console.log(`⏰ Scraped at: ${this.data.scrapedAt}`);
    console.log(`📄 Pages processed: ${this.data.pages.length}`);
    console.log(`🛍️  Total products found: ${totalProducts}`);
    console.log(`🔗 Total links found: ${totalLinks}`);
    console.log('='.repeat(50));

    // Show products by category
    console.log('\n📦 Products by category:');
    this.data.pages.forEach(page => {
      if (page.products && page.products.length > 0) {
        console.log(`   ${page.name}: ${page.products.length} items`);
      }
    });

    console.log('\n💾 Data saved to: rishi-store-data.json');
  }
}

async function main() {
  const scraper = new RishiStoreScraper();

  try {
    await scraper.init();
    await scraper.scrapeAll();
    scraper.saveResults();
    scraper.generateReport();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await scraper.close();
  }
}

main();
