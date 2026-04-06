const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

function startServer(port = 3940) {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      let fp = path.join(process.cwd(), decodeURIComponent(req.url === '/' ? '/rishi-new.html' : req.url));
      fs.readFile(fp, (err, data) => {
        if (err) { res.writeHead(404); return res.end(); }
        const ext = path.extname(fp);
        const types = { '.html':'text/html','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml' };
        res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(port, () => resolve(server));
  });
}

async function run() {
  const server = await startServer(3940);
  const browser = await chromium.launch({
    headless: false,
    executablePath: 'C:\\Users\\panvo\\AppData\\Local\\ms-playwright\\chromium-1217\\chrome-win64\\chrome.exe',
    args: ['--no-sandbox'],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto('http://localhost:3940/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Hover over Каталог to open mega menu
  await page.hover('#catalogTrigger');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'screenshots/new-mega.png', fullPage: false });

  // Mobile drawer
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.click('#burgerBtn');
  await page.waitForTimeout(500);
  // Open catalog accordion
  await page.click('#accCatalog .acc-trigger');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'screenshots/new-drawer.png', fullPage: false });

  await browser.close();
  server.close();
  console.log('✅ Done');
}
run().catch(console.error);
