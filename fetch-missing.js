// Downloads URLs that verify.js reported as missing straight from the live
// site and adds them to the archive (for files the page loads in ways
// capture.js doesn't trigger, e.g. lazy images far down the page).
// Usage: node fetch-missing.js [verify-report.txt]   or   node fetch-missing.js /path?query ...
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ORIGIN = 'https://www.artisan.co';
const ARCHIVE = path.join(__dirname, 'archive');
const MANIFEST = path.join(ARCHIVE, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

const args = process.argv.slice(2);
const report = args.length === 1 && !args[0].startsWith('/') ? args[0] : !args.length ? 'verify-report.txt' : null;
const paths = report
  ? [...new Set([...fs.readFileSync(path.join(__dirname, report), 'utf8').matchAll(/missing \d+ (\S+)/g)].map((m) => m[1]))]
  : args;

(async () => {
  let added = 0;
  for (const p of paths) {
    const res = await fetch(ORIGIN + p, { headers: { 'user-agent': 'Mozilla/5.0', accept: 'image/avif,image/webp,*/*' } });
    if (!res.ok) { console.log(`  ! ${res.status} ${p}`); continue; }
    const key = new URL(ORIGIN + p).host + p;
    const file = crypto.createHash('sha1').update(key).digest('hex');
    fs.writeFileSync(path.join(ARCHIVE, 'files', file), Buffer.from(await res.arrayBuffer()));
    manifest[key] = { file, status: 200, type: res.headers.get('content-type') || '' };
    console.log(`  + ${p}`);
    added++;
  }
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
  console.log(`Added ${added}/${paths.length}. Restart server.js to serve them.`);
})();
