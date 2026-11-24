const { chromium } = require('playwright');
(async () => { const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const p = await b.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
 await p.goto('http://localhost:8765/dreadnoughts/tools/_zf.html'); await p.waitForFunction(() => window.R, null, { timeout: 240000 });
 const r = await p.evaluate(() => window.R); r.sort((a, b) => b.area - a.area); for (const x of r) console.log(x.k.padEnd(12), x.hits, x.area, x.pairs); console.log('types with overlap:', r.length); await b.close(); })();
