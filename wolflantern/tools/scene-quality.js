// 狼影灯 — 背景（影絵の書き割り）の採点。
// 使い方: node wolflantern/tools/scene-quality.js [--shots] [--write]
//   --shots  場面ごとの見え方（PC・スマホ・夜）を /tmp/wl-scenes/ に書き出す（目で見る審査のため）
//   --write  合格した場面だけを scenes-pass.js に書く（ゲームはここに載った場面だけを使う）
// 機械の採点（100点から減点、合格90点）と、目で見た審査（claude/wolflantern-scene-review.md）の両方に通ったものだけが合格。
// 目の審査は場面のハッシュに結びつく。絵を直すとハッシュが変わり、審査をやり直すまで合格にならない。
const fs = require('fs'), path = require('path');
const puppeteer = require(process.env.PUPPETEER || '/opt/npm-tools/node_modules/puppeteer-core');
const DIR = path.resolve(__dirname, '..');
const W = require('./load.js');
global.window = global; require(path.join(DIR, 'art.js')); require(path.join(DIR, 'scenes.js'));
const ART = global.WLArt, SC = global.WLScenes;
const KINDS = { alps: 'kirigane', train: 'hokushin', island: 'tomoshibi' };
const args = process.argv.slice(2);
const REVIEW = path.resolve(DIR, '../claude/wolflantern-scene-review.md');

const FILEHASH = require('crypto').createHash('sha1').update(fs.readFileSync(path.join(DIR, 'scenes.js'))).digest('hex').slice(0, 10);
function readReview() {
  const out = {};
  if (!fs.existsSync(REVIEW)) return out;
  const txt = fs.readFileSync(REVIEW, 'utf8');
  const fh = (txt.match(/scenes\.js のハッシュ：(\w+)/) || [])[1];
  if (fh !== FILEHASH) { console.log(`scenes.js が審査のあとに変わった（審査 ${fh || 'なし'} / 今 ${FILEHASH}）。目の審査をやり直す。`); return out; }
  for (const line of txt.split('\n')) {
    const m = line.match(/^\|\s*(\w+\/\w+)\s*\|\s*(\w+)\s*\|\s*(OK|NG)\s*\|(.*)\|/);
    if (m) out[m[1]] = { hash: m[2], ok: m[3] === 'OK', note: m[4].trim() };
  }
  return out;
}

(async () => {
  const b = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.setContent('<canvas id="c"></canvas>');
  const review = readReview();
  const pass = {}; let fail = 0;
  for (const kind in SC) for (const loc in SC[kind]) {
    if (typeof SC[kind][loc] !== 'object') continue;
    const N = SC[kind][loc], key = kind + '/' + loc, hash = ART.sceneHash(kind, loc);
    const svg = ART.sceneNew(kind, loc, 3);
    const m = await p.evaluate(async svg => {
      const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src); });
      const W = 400, H = 225;
      const raster = async (css, keep) => {
        let s = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" ');
        s = s.replace(/<g transform="translate\(0 112\)">/, `<style>${css}</style><g transform="translate(0 112)">`);
        const img = await load(s);
        const c = document.getElementById('c'); c.width = W; c.height = H; const x = c.getContext('2d');
        x.fillStyle = '#efe3c8'; x.fillRect(0, 0, W, H); x.drawImage(img, 0, 0, W, H);
        return x.getImageData(0, 0, W, H).data;
      };
      const light = '.cut,.glow,.snow,.moonc,.ice,.snowland{fill:#efe3c8!important;stroke:none}[fill="none"].cut,.smokecut{stroke:#efe3c8!important}.pane{fill:#1b120c}';
      // near only, solid ink
      const near = await raster(`.far,.mid{display:none} .near{color:#1b120c} ${light}`);
      const ink = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) ink[i] = near[i * 4] < 120 ? 1 : 0;
      const frac = (x0, y0, x1, y1) => { let n = 0, t = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { t++; n += ink[y * W + x]; } return n / t; };
      const sx = v => Math.round(v / 4), sy = v => Math.round((v + 112) / 4);
      const all = frac(0, 0, W, H), center = frac(sx(440), sy(430), sx(1160), sy(752)), mobile = frac(sx(350), 0, sx(1250), H);
      // edge density: how much outline the ink has (a slab has little)
      let edge = 0, inkN = 0; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; if (!ink[i]) continue; inkN++; if (!ink[i - 1] || !ink[i + 1] || !ink[i - W] || !ink[i + W]) edge++; }
      // slabs: big solid blobs that fill their bounding box
      const seen = new Uint8Array(W * H), slabs = [];
      for (let i = 0; i < W * H; i++) {
        if (!ink[i] || seen[i]) continue;
        let st = [i], a = 0, x0 = W, x1 = 0, y0 = H, y1 = 0; seen[i] = 1;
        while (st.length) { const j = st.pop(), x = j % W, y = (j / W) | 0; a++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; for (const k of [j - 1, j + 1, j - W, j + W]) if (k >= 0 && k < W * H && ink[k] && !seen[k] && Math.abs((k % W) - x) <= 1) { seen[k] = 1; st.push(k); } }
        const box = (x1 - x0 + 1) * (y1 - y0 + 1);
        if (a > W * H * .015 && a / box > .86 && y1 < H - 6) slabs.push({ a: a / (W * H), sol: a / box, at: [x0 * 4, y0 * 4 - 112, x1 * 4, y1 * 4 - 112] });
      }
      // mid alone: is there a building to recognise the place by
      const mid = await raster(`.far,.near{display:none} .mid{color:#1b120c} ${light}`);
      let midInk = 0; for (let i = 0; i < W * H; i++) if (mid[i * 4] < 120) midInk++;
      // the whole composite as the screen shows it: how many tones
      const comp = await raster(`.far{opacity:.17}.mid{opacity:.42}.near{opacity:.94}.scn{color:#1b120c}.cut{fill:#efe3c8}.glow{fill:#ffcf86}.snow,.snowland,.ice{fill:#efe3c8}.moonc{fill:#fff4dc}.pane{fill:#8a92a8}`);
      const hist = new Array(16).fill(0); for (let i = 0; i < W * H; i++) hist[Math.min(15, (comp[i * 4] + comp[i * 4 + 1] + comp[i * 4 + 2]) / 3 / 16 | 0)]++;
      const tones = hist.filter(n => n > W * H * .01).length;
      return { all, center, mobile, edge: edge / Math.max(1, inkN), slabs, mid: midInk / (W * H), tones };
    }, svg);
    const cuts = (svg.match(/class="cut"[^>]*d="[^"]*"/g) || []).reduce((n, t) => n + (t.match(/M/g) || []).length, 0);   // every cut-out shape counts
    const ded = [], add = (n, w) => ded.push([n, w]);
    if (m.all < .06) add(10, `近景の墨が少なすぎる ${(m.all * 100).toFixed(1)}%`);
    if (m.all > .42) add(10, `近景の墨が多すぎる ${(m.all * 100).toFixed(1)}%`);
    if (m.center > .12) add(Math.round((m.center - .12) * 100), `人形の立つ中央に近景が重なる ${(m.center * 100).toFixed(1)}%（12%まで）`);
    if (m.mobile < .04) add(6, `スマホの幅（中央）で近景が見えない ${(m.mobile * 100).toFixed(1)}%`);
    if (m.edge < .07) add(Math.round((.07 - m.edge) * 300), `輪郭が少ない（のっぺりした塊）${m.edge.toFixed(3)}`);
    if (m.slabs.length) add(m.slabs.length * 8, `四角い大きな墨の塊 ${m.slabs.length}：${m.slabs.map(x => x.at.join(',')).join(' / ')}`);
    if (m.mid < .06) add(8, `中景に場所の顔になるものがない ${(m.mid * 100).toFixed(1)}%`);
    if (m.tones < 4) add((4 - m.tones) * 5, `濃淡の段が少ない ${m.tones}`);
    if (cuts < 12) add(4, `切り抜きの細部が少ない ${cuts}`);
    if (!N.props || N.props.length < 5) add(6, `小道具の宣言が少ない ${(N.props || []).length}`);
    const score = Math.max(0, Math.round(100 - ded.reduce((a, d) => a + d[0], 0)));
    const rv = review[key], seen = rv && rv.hash === hash;
    const ok = score >= 90 && seen && rv.ok;
    if (ok) pass[key] = hash; else fail++;
    console.log(`${ok ? 'OK ' : 'NG '} ${String(score).padStart(3)}  ${key.padEnd(15)} ${hash}  目の審査：${!rv ? 'まだ' : !seen ? '絵が変わった（やり直し）' : rv.ok ? '合格' : '不合格'}  ${(N.props || []).join('・')}`);
    for (const [n, w] of ded) console.log(`      -${n}  ${w}`);
    if (rv && seen && !rv.ok) console.log(`      審査：${rv.note}`);
  }
  if (args.includes('--shots')) {
    const out = '/tmp/wl-scenes'; fs.mkdirSync(out, { recursive: true });
    const q = await b.newPage();
    await q.goto(process.env.URL || 'http://localhost:8765/wolflantern/', { waitUntil: 'load' });
    for (const [w, h, mob, tag] of [[1280, 560, false, 'pc'], [390, 390, true, 'sp']]) {
      await q.setViewport({ width: w, height: h, isMobile: mob });
      for (const kind in SC) for (const loc in SC[kind]) for (const night of [false, true]) {
        if (night && tag === 'sp') continue;
        await q.evaluate((kind, loc, night, story) => {
          const st = window.WL_STORIES[story], R = document.documentElement.style;
          for (const k in st.pal) R.setProperty('--' + k, st.pal[k]);
          document.querySelectorAll('.scr').forEach(e => e.classList.add('hide'));
          document.body.classList.toggle('night', night);
          document.getElementById('scene').style.bottom = '0';
          document.getElementById('scene').innerHTML = window.WLArt.sceneNew(kind, loc, 3);
          document.getElementById('cast').innerHTML = '';
        }, kind, loc, night, KINDS[kind]);
        await new Promise(r => setTimeout(r, 150));
        await q.screenshot({ path: `${out}/${kind}-${loc}${night ? '-night' : ''}-${tag}.png` });
      }
    }
    console.log('見え方：' + out);
  }
  if (args.includes('--write')) {
    fs.writeFileSync(path.join(DIR, 'scenes-pass.js'), `/* 狼影灯 — 採点（tools/scene-quality.js）に合格した背景。ここに載った場面だけをゲームで使う。手で書き換えない。 */\nwindow.WL_SCENE_PASS = ${JSON.stringify(pass, null, 1)};\n`);
    console.log(`scenes-pass.js に ${Object.keys(pass).length} 場面を書いた`);
  }
  await b.close();
  process.exit(0);
})();
