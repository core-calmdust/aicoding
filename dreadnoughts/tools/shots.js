// node dreadnoughts/tools/shots.js out_dir battleship,carrier,destroyer [w]x[h]  — close-ups of ships through tools/ship.html
const { chromium } = require('playwright');
(async () => { const [out, list, size] = process.argv.slice(2); const [w, h] = (size || '900x450').split('x').map(Number);
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: w, height: h } });
  for (const k of list.split(',')) { const [key, q] = k.split('?'); await p.goto(`http://localhost:8765/dreadnoughts/tools/ship.html?k=${key}&${q || ''}`); await p.waitForFunction(() => window.ready, null, { timeout: 60000 }); console.log(key, JSON.stringify(await p.evaluate(() => window.stat))); await p.screenshot({ path: `${out}/${key}.png` }); }
  await b.close(); })();
