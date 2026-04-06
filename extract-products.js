const { chromium } = require('playwright');
const fs = require('fs');

async function extractProducts(url, pageName) {
  const browser = await chromium.launch({
    headless: false,
    executablePath: 'C:\\Users\\panvo\\AppData\\Local\\ms-playwright\\chromium-1217\\chrome-win64\\chrome.exe',
    args: ['--no-sandbox'],
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Intercept Tilda store API
  const products = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('tildacdn.com') && url.includes('store') && response.status() === 200) {
      try {
        const ct = response.headers()['content-type'] || '';
        if (ct.includes('json')) {
          const json = await response.json();
          if (json.products || json.items) {
            const items = json.products || json.items || [];
            console.log(`  API: ${items.length} products from ${url.split('?')[0].split('/').slice(-2).join('/')}`);
            products.push(...items);
          }
        }
      } catch(e) {}
    }
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for store to load
  try {
    await page.waitForSelector('.t-store__card', { timeout: 10000 });
  } catch(e) {
    console.log('  No .t-store__card found, trying to wait...');
  }
  await page.waitForTimeout(5000);

  // Take screenshot after load
  await page.screenshot({
    path: `screenshots/${pageName}-loaded.png`,
    fullPage: true
  });

  // Extract from DOM
  const domProducts = await page.evaluate(() => {
    const cards = document.querySelectorAll('.t-store__card, .js-store-item');
    const results = [];

    cards.forEach(card => {
      const nameEl = card.querySelector('.t-store__card-title, [class*="title"], .t-name');
      const priceEl = card.querySelector('.t-store__card__price, [class*="price"]:not([class*="old"])');
      const priceOldEl = card.querySelector('.t-store__card__price_old, [class*="price_old"], [class*="price-old"]');
      const imgEl = card.querySelector('img');
      const linkEl = card.querySelector('a');

      // Try data attributes
      const dataObj = {};
      Array.from(card.attributes).forEach(attr => {
        if (attr.name.startsWith('data-')) {
          dataObj[attr.name] = attr.value;
        }
      });

      results.push({
        name: nameEl?.textContent?.trim() || dataObj['data-product-name'] || '',
        price: priceEl?.textContent?.trim() || '',
        priceOld: priceOldEl?.textContent?.trim() || '',
        image: imgEl?.src || imgEl?.dataset?.src || '',
        link: linkEl?.href || '',
        dataAttrs: dataObj
      });
    });

    return results;
  });

  console.log(`  DOM products: ${domProducts.length}`);
  if (domProducts.length > 0) {
    console.log('  Sample:', JSON.stringify(domProducts[0]));
  }

  await browser.close();

  return { apiProducts: products, domProducts };
}

async function main() {
  const pages = [
    { name: 'jeans', url: 'https://rishi-store.com/jeans' },
    { name: 'corsets', url: 'https://rishi-store.com/corsets' },
    { name: 'all', url: 'https://rishi-store.com/all' },
  ];

  const allData = {};

  for (const pg of pages) {
    console.log(`\n🔍 Extracting: ${pg.name}`);
    const data = await extractProducts(pg.url, pg.name);
    allData[pg.name] = data;
  }

  fs.writeFileSync('products-data.json', JSON.stringify(allData, null, 2));
  console.log('\n✅ Saved to products-data.json');
}

main().catch(console.error);
