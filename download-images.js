const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const imgDir = path.join(process.cwd(), 'img');
if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir);

const products = require('./clean-products.json');
const urls = [...new Set(products.map(p => p.image).filter(Boolean))];

// Also add some category/editorial images we used
const extra = [
  'https://static.tildacdn.com/stor6538-3534-4836-b430-643966663064/19769aff7b64f3e13aad04e6fe6a0ae8.jpg',
  'https://static.tildacdn.com/stor6661-6164-4633-b939-663664343736/9a177c1a4fb1e7f5bac24a9de7196e71.jpg',
  'https://static.tildacdn.com/stor3838-6664-4235-b033-306361316563/21bb3fb96e16fc9b3acdf4a3ea7e3060.jpg',
  'https://static.tildacdn.com/stor3432-3633-4266-b462-636535623836/73861c7b9a1f9b3c2f4b8d5e1a2c3f4d.jpg',
];
extra.forEach(u => { if (!urls.includes(u)) urls.push(u); });

function download(url) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const filename = path.basename(u.pathname);
    const dest = path.join(imgDir, filename);
    if (fs.existsSync(dest)) { process.stdout.write('.'); return resolve(filename); }

    const proto = u.protocol === 'https:' ? https : http;
    const file = fs.createWriteStream(dest);
    const req = proto.get(url, {
      headers: {
        'Referer': 'https://rishi-store.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120',
      }
    }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close(); fs.unlinkSync(dest);
        return download(res.headers.location).then(resolve);
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); process.stdout.write('✓'); resolve(filename); });
    });
    req.on('error', () => { file.close(); try { fs.unlinkSync(dest); } catch(e){} process.stdout.write('✗'); resolve(null); });
    req.setTimeout(10000, () => { req.destroy(); process.stdout.write('T'); resolve(null); });
  });
}

async function main() {
  console.log(`Downloading ${urls.length} images...`);
  for (let i = 0; i < urls.length; i += 5) {
    await Promise.all(urls.slice(i, i+5).map(download));
  }
  console.log('\n\nDone! Files in ./img/');
  console.log('Count:', fs.readdirSync(imgDir).length);
}
main();
