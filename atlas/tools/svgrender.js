// Dev tool for atlas/tools/skins_*.py: renders SVG files to PNG with headless Chrome (puppeteer). Set PUPPETEER_EXECUTABLE_PATH or edit executablePath.
// node svgrender.js jobs.json  — jobs: [{svg: path, out: path, w, h}]
const puppeteer = (() => { try { return require('puppeteer'); } catch (e) { return require('/opt/npm-tools/node_modules/puppeteer'); } })();
const fs = require('fs');
(async () => {
  const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const b = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage();
  for (const j of jobs) {
    await p.setViewport({ width: j.w, height: j.h, deviceScaleFactor: 1 });
    const svg = fs.readFileSync(j.svg, 'utf8');
    await p.setContent(`<html><body style="margin:0;background:#fff">${svg}</body></html>`);
    await p.screenshot({ path: j.out, clip: { x: 0, y: 0, width: j.w, height: j.h } });
  }
  await b.close();
})();
