const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

function startServer(port = 3939) {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(process.cwd(), decodeURIComponent(req.url === '/' ? '/rishi-new.html' : req.url));
      const ext = path.extname(filePath);
      const types = { '.html': 'text/html', '.jpg': 'image/jpeg', '.png': 'image/png' };
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); return res.end('Not found: ' + req.url); }
        res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(port, () => resolve(server));
  });
}

async function run() {
  const server = await startServer(3939);
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Users\\panvo\\AppData\\Local\\ms-playwright\\chromium-1217\\chrome-win64\\chrome.exe',
    args: ['--no-sandbox'],
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', m => { if (m.type() === 'error') console.log('ERR:', m.text()); });
  page.on('response', r => { if (!r.ok() && r.url().includes('img/')) console.log('FAIL:', r.status(), r.url().split('/').slice(-2).join('/')); });

  await page.goto('http://localhost:3939/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const result = await page.evaluate(() => {
    const imgs = Array.from(document.images);
    return {
      total: imgs.length,
      complete: imgs.filter(i => i.complete && i.naturalWidth > 0).length,
      broken: imgs.filter(i => i.complete && i.naturalWidth === 0).map(i => i.src.split('/').pop()),
      pending: imgs.filter(i => !i.complete).length,
    };
  });
  console.log('Images:', JSON.stringify(result, null, 2));

  await browser.close();
  server.close();
}
run().catch(console.error);
