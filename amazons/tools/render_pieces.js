// Dev tool: renders tools/pieces3d.html (three.js) for every set and side and saves img/pc-<set>-<w|b>.webp
// node tools/render_pieces.js [set …]   (needs a local server on :8765 at the repo root, playwright-core, Chrome, cwebp or Pillow)
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const PW = process.env.PW || '/opt/node-tools/node_modules/playwright-core', CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const THREE_LOCAL = process.env.THREE_LOCAL;   // (a local copy of three.min.js r128 when the CDN is out of reach)
const { chromium } = require(PW);
const SETS = process.argv.slice(2).length ? process.argv.slice(2) : ['statue', 'bronze', 'vase', 'archer'];
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage();
  if (THREE_LOCAL) await p.route(/three\.min\.js/, r => r.fulfill({ path: THREE_LOCAL, contentType: 'application/javascript' }));
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  for (const set of SETS) for (const side of ['w', 'b']) {
    await p.goto(`http://localhost:8765/amazons/tools/pieces3d.html?set=${set}&side=${side}&size=640`);
    await p.waitForFunction(() => window.SHOT, null, { timeout: 120000 });
    const png = Buffer.from((await p.evaluate(() => window.SHOT)).split(',')[1], 'base64');
    const tmp = path.join(require('os').tmpdir(), `pc-${set}-${side}.png`), out = path.join(__dirname, '..', 'img', `pc-${set}-${side}.webp`);
    fs.writeFileSync(tmp, png);
    execFileSync('python3', ['-c', `from PIL import Image\nim=Image.open('${tmp}').convert('RGBA')\nbb=im.getbbox()\nim=im.crop(bb)\nw,h=im.size\ns=max(w,h)\nc=Image.new('RGBA',(s,s),(0,0,0,0))\nc.paste(im,((s-w)//2,s-h))\nc=c.resize((256,256),Image.LANCZOS)\nc.save('${out}','WEBP',quality=90,method=6)`]);
    console.log(set, side, fs.statSync(out).size);
  }
  await b.close();
})();
