// Dev tool: renders the 3D figures of atlas/models/amazons.js (atlas/tools/amzpiece.html) → amazons/img/pc3-<set>-<w|b>.webp (256 px)
// node amazons/tools/render_pc3.js   (a local server on :8765 at the repo root; THREE_LOCAL = a local three.min.js r128 if the CDN is out of reach)
const { chromium } = require('/opt/node-tools/node_modules/playwright-core');
const { execFileSync } = require('child_process');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const set of (process.argv[2] ? process.argv[2].split(',') : ['statue', 'archer', 'bronze', 'totem', 'jade', 'pottery'])) for (const [col, sd] of [[1, 'w'], [2, 'b']]) {
    const p = await b.newPage();
    if (process.env.THREE_LOCAL) await p.route(/three\.min\.js/, r => r.fulfill({ path: process.env.THREE_LOCAL, contentType: 'application/javascript' }));
    await p.goto(`http://localhost:8765/atlas/tools/amzpiece.html?game=amazons&set=${set}&col=${col}&el=12&w=640&h=640`);
    await p.waitForFunction(() => window.READY, null, { timeout: 180000 });
    const tmp = require('path').join(require('os').tmpdir(), `pc3-${set}-${sd}.png`), out = require('path').join(__dirname, '..', 'img', `pc3-${set}-${sd}.webp`);
    require('fs').writeFileSync(tmp, Buffer.from((await p.evaluate(() => window.ICON)).split(',')[1], 'base64'));
    execFileSync('python3', ['-c', `from PIL import Image\nim=Image.open('${tmp}').convert('RGBA')\nbb=im.getchannel('A').point(lambda v:255 if v>8 else 0).getbbox()\nim=im.crop(bb)\nw,h=im.size\ns=max(w,h)\nc=Image.new('RGBA',(s,s),(0,0,0,0))\nc.paste(im,((s-w)//2,s-h))\nc=c.resize((256,256),Image.LANCZOS)\nc.save('${out}','WEBP',quality=90,method=6)`]);
    console.log(set, sd); await p.close();
  }
  await b.close();
})();
