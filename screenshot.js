const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const screenshotsDir = path.join(process.cwd(), 'screenshots');
if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir);

const pages = [
  { name: 'home', path: '' },
  { name: 'all', path: '/all' },
  { name: 'jeans', path: '/jeans' },
  { name: 'corsets', path: '/corsets' },
  { name: 'about', path: '/about' },
  { name: 'sale', path: '/sale' },
];

async function run() {
  const browser = await chromium.launch({
    headless: false,
    executablePath: 'C:\\Users\\panvo\\AppData\\Local\\ms-playwright\\chromium-1217\\chrome-win64\\chrome.exe',
    args: ['--no-sandbox'],
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  for (const pg of pages) {
    const url = 'https://rishi-store.com' + pg.path;
    console.log(`📸 ${pg.name} — ${url}`);
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    // Full page screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, `${pg.name}-full.png`),
      fullPage: true,
    });

    // Above the fold
    await page.screenshot({
      path: path.join(screenshotsDir, `${pg.name}-viewport.png`),
      fullPage: false,
    });

    // Mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(screenshotsDir, `${pg.name}-mobile.png`),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.close();
    console.log(`   ✅ saved`);
  }

  await browser.close();
  console.log('\n✅ All screenshots saved to ./screenshots/');
}

run().catch(console.error);
