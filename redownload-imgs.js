const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Broken images — 90 byte files
const broken = [
  'https://static.tildacdn.com/stor6538-3534-4836-b430-643966663064/19769aff7b64f3e13aad04e6fe6a0ae8.jpg',
  'https://static.tildacdn.com/stor6236-3930-4165-a363-373063633131/19880c0da16fb7cdb99cfab5c741e91a.jpg',
  'https://static.tildacdn.com/stor3838-6664-4235-b033-306361316563/21bb3fb96e16fc9b3acdf4a3ea7e3060.jpg',
  'https://static.tildacdn.com/stor6363-3662-4464-b062-666664316633/25637a12804b02cb4d62fefaba45af97.jpg',
  'https://static.tildacdn.com/stor6434-3532-4463-b138-323361646362/45167c0ab34f0c5dc1dac8e75f9deb28.jpg',
  'https://static.tildacdn.com/stor3162-3137-4233-b339-616132346437/85996c5e0f0f2caed00a2f673b3dd012.jpg',
  'https://static.tildacdn.com/stor3162-3137-4233-b339-616132346437/8b05bdb7a5f1eb4ec1a1ce38ff07fae4.jpg',
  'https://static.tildacdn.com/stor6661-6164-4633-b939-663664343736/9a177c1a4fb1e7f5bac24a9de7196e71.jpg',
  'https://static.tildacdn.com/stor3733-3066-4530-b034-623663326137/72786c7b67a93f18a3aeefa92e48d6ef.jpg',
  'https://static.tildacdn.com/stor3234-3962-4639-b938-363364323530/76357c04b3f7a8d8b01e3d5a65b4cf5e.jpg',
  'https://static.tildacdn.com/stor3363-6436-4136-b364-366331633238/ce87a8b04f5b8d65d78069c437e32c78.jpg',
  'https://static.tildacdn.com/stor3366-3232-4564-a361-633031386530/01ece50b0f7c7c10bb3ebe3def09e9f3.jpg',
  'https://static.tildacdn.com/stor3862-3333-4839-a139-393362666632/9f014ffd9571c67b51a27b2bfdf89a46.jpg',
];

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Users\\panvo\\AppData\\Local\\ms-playwright\\chromium-1217\\chrome-win64\\chrome.exe',
    args: ['--no-sandbox'],
  });

  // First visit the site to get cookies/session
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://rishi-store.com/', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);

  for (const url of broken) {
    const filename = url.split('/').pop();
    const dest = path.join('img', filename);

    const response = await context.request.get(url, {
      headers: {
        'Referer': 'https://rishi-store.com/',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      }
    }).catch(() => null);

    if (response && response.ok()) {
      const body = await response.body();
      if (body.length > 1000) {
        fs.writeFileSync(dest, body);
        console.log(`✓ ${filename} (${body.length} bytes)`);
      } else {
        console.log(`✗ ${filename} — too small: ${body.length} bytes`);
        // Try direct page download
        const imgPage = await context.newPage();
        const dl = await imgPage.waitForResponse(r => r.url() === url, { timeout: 8000 }).catch(() => null);
        await imgPage.goto(url).catch(() => {});
        if (dl) {
          const b = await dl.body();
          if (b.length > 1000) { fs.writeFileSync(dest, b); console.log(`  ↳ got ${b.length} bytes via page`); }
        }
        await imgPage.close();
      }
    } else {
      console.log(`✗ ${filename} — request failed`);
    }
  }

  await browser.close();
  console.log('\nDone');
}
run().catch(console.error);
