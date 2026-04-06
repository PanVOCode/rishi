const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple static server
function startServer(port = 3939) {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(process.cwd(), decodeURIComponent(req.url === '/' ? '/index.html' : req.url));
      const ext = path.extname(filePath);
      const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(port, () => resolve(server));
  });
}

async function forceVisible(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.fade-up, .product-card, .collection-card, .category-card').forEach(el => el.classList.add('visible'));
    document.querySelectorAll('img[loading="lazy"]').forEach(img => { img.loading = 'eager'; });
  });
  await page.waitForFunction(() => Array.from(document.images).every(img => img.complete), { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(600);
}

async function shot(page, hash, filename, fullPage = true) {
  await page.evaluate(h => { location.hash = h; }, hash);
  await page.waitForTimeout(800);
  await forceVisible(page);
  await page.screenshot({ path: `screenshots/${filename}`, fullPage });
  console.log(`✓ ${filename}`);
}

async function run() {
  const server = await startServer(3939);
  console.log('Server started on :3939');

  const browser = await chromium.launch({
    headless: false,
    executablePath: 'C:\\Users\\panvo\\AppData\\Local\\ms-playwright\\chromium-1217\\chrome-win64\\chrome.exe',
    args: ['--no-sandbox'],
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto('http://localhost:3939/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  await shot(page, '#/', 'spa-home-hero.png', false);
  await shot(page, '#/', 'spa-home-full.png', true);
  await shot(page, '#/jeans', 'spa-jeans.png', true);
  await shot(page, '#/catalog', 'spa-catalog.png', true);
  await shot(page, '#/about', 'spa-about.png', true);
  await shot(page, '#/contacts', 'spa-contacts.png', true);

  // Mobile home
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { location.hash = '#/'; });
  await page.waitForTimeout(800);
  await forceVisible(page);
  await page.screenshot({ path: 'screenshots/spa-mobile-home.png', fullPage: true });
  console.log('✓ spa-mobile-home.png');

  // Mobile category
  await page.evaluate(() => { location.hash = '#/jeans'; });
  await page.waitForTimeout(800);
  await forceVisible(page);
  await page.screenshot({ path: 'screenshots/spa-mobile-jeans.png', fullPage: true });
  console.log('✓ spa-mobile-jeans.png');

  await browser.close();
  server.close();
  console.log('\n✅ All done');
}
run().catch(console.error);
