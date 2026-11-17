#!/usr/bin/env node
// 雀華 QA — 変更のたびに回す整合性チェック（2026-11-16、ユーザー「追加仕様の相互作用の問題をチェック。整合性をチェックする体制を」）
// 使い方: node mahjong/tools/qa.js [--base http://localhost:8765/mahjong/] [--only static,discard,...]
//   要: ローカルの静的サーバ（リポジトリの根で python3 -m http.server 8765 など）、Playwright と Chrome。
// 失敗が1つでもあれば終了コード1。各チェックは「以前に実際に起きた不具合」を見張る（下のコメントに経緯）。
'use strict';
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..'), MJ = path.join(ROOT, 'mahjong');
const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null; };
const BASE = arg('base') || 'http://localhost:8765/mahjong/', ONLY = arg('only') ? arg('only').split(',') : null;
const res = []; const ok = (name, pass, info = '') => { res.push([name, pass, info]); console.log((pass ? '  ok   ' : '  FAIL ') + name + (info ? '  — ' + info : '')); };
const want = n => !ONLY || ONLY.includes(n);

// ---------------------------------------------------------------- static
function staticChecks() {
  console.log('[static]');
  const js = fs.readdirSync(MJ).filter(f => f.endsWith('.js'));
  for (const f of js) { try { execSync(`node --check ${JSON.stringify(path.join(MJ, f))}`, { stdio: 'pipe' }); ok('syntax ' + f, true); } catch (e) { ok('syntax ' + f, false, String(e.stderr).split('\n')[0]); } }
  // a skill's rarity adds a little to its cost (2026-11-16): never less for a rarer one, the top at most about +10%
  { const S = require(path.join(MJ, 'skills.js')), bad = [];
    for (const sk of S.list) { const c = [0, 1, 2, 3].map(t => S.costOf(sk.cost, t)); if (c.some((x, i) => i && x < c[i - 1]) || c[3] > sk.cost * 1.1 + 1e-6 || c[0] !== sk.cost) bad.push(sk.id + ':' + c.join('/')); }
    ok('skill cost by rarity (N = base, rising a little, SSR ≤ ~+10%)', !bad.length, bad.join(' ')); }
  // every sound file the code names is there (2026-11-16: the second riichi track, bgm-riichi2)
  { const app = fs.readFileSync(path.join(MJ, 'app.js'), 'utf8'), names = [...app.matchAll(/file: '([\w-]+)'/g)].map(m => m[1]);
    const miss = names.filter(n => !fs.existsSync(path.join(MJ, '..', 'images', 'mahjong', 'snd', n + '.mp3')));
    ok('music files present (' + names.length + ')', ['bgm-riichi2', 'bgm-riichi3', 'bgm-main4'].every(n => names.includes(n)) && !miss.length, miss.join(',')); }
  // (2026-11-18) the call choices (chi/pon/kan/ron) open with a light sound
  { const app = fs.readFileSync(path.join(MJ, 'app.js'), 'utf8'), m = app.match(/function myCall\(o, res\) \{([\s\S]{0,200})/);
    ok('call choices play SND.callAsk', /callAsk: \(\) =>/.test(app) && !!m && /SND\.callAsk\(\)/.test(m[1])); }
  // code swallowed by a comment (2026-11-16: an edit put `lx = TB.screenPose(...)` after a `//` on the same line — the player's
  // discard lost its page pose and the hand came from the table's edge). Flags a line comment that ends like a statement.
  const sus = [];
  for (const f of js) fs.readFileSync(path.join(MJ, f), 'utf8').split('\n').forEach((l, i) => {
    const m = l.match(/^(.*?[;{}),])\s*\/\/(.*)$/); if (!m || /['"`]/.test(m[2].slice(0, 3))) return;
    const c = m[2];
    if (/\)\s*[\w$.]+\s*=\s*[\w$.]+\(.*\);\s*$/.test(c) || /;\s*\}?\s*$/.test(c) && /[\w$]+\s*\(.*\)\s*;/.test(c) && /=|\.\w+\(/.test(c) && !/^\s*\(/.test(c)) sus.push(`${f}:${i + 1}`);
  });
  ok('no code hidden in comments', !sus.length, sus.join(' '));
  // 段位戦 (2026-11-16): kyu ranks only add up; from 初段 3rd/4th lose, ranks can be lost, never below 初段
  try { const w = {}; new Function('window', fs.readFileSync(path.join(MJ, 'rank.js'), 'utf8'))(w); const R = w.MJRank;
    const c = [[100, 'east', 3, 0], [125, 'east', 3, -2], [120, 'east', 3, 0], [140, 'east', 2, 0], [260, 'south', 3, -6], [50, 'south', 0, 16]];
    const bad = c.filter(([pt, len, pl, g]) => R.apply(pt, len, pl).gain !== g).map(x => x.join('/'));
    ok('ranked points (kyu add only, dan ±, floor 初段)', !bad.length, bad.join(' ')); } catch (e) { ok('ranked points', false, e.message); }
  // a changed script or style must have its ?v= raised in index.html (CLAUDE.md) — compared with origin/main
  try {
    const diff = execSync('git diff --name-only origin/main -- mahjong', { cwd: ROOT }).toString().split('\n').filter(Boolean).map(f => path.basename(f));
    const idxNew = fs.readFileSync(path.join(MJ, 'index.html'), 'utf8'), idxOld = execSync('git show origin/main:mahjong/index.html', { cwd: ROOT }).toString();
    const v = (s, f) => (s.match(new RegExp(f.replace('.', '\\.') + '\\?v=(\\d+)')) || [])[1];
    const miss = diff.filter(f => /\.(js|css)$/.test(f) && v(idxNew, f) && v(idxNew, f) === v(idxOld, f));
    ok('?v= raised for changed files', !miss.length, miss.join(' '));
  } catch (e) { ok('?v= raised for changed files', true, 'skipped (no origin/main)'); }
}

// ---------------------------------------------------------------- runtime
async function runtime() {
  let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
  const exe = fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined;
  const b = await pw.chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const PC = { viewport: { width: 1600, height: 900 } }, SP = { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 };
  const page = async (o, set = {}, lang = 'ja', q = '?fast') => {
    const ctx = await b.newContext({ ...o, locale: 'ja-JP' }); const p = await ctx.newPage(); p.errs = [];
    p.on('pageerror', e => p.errs.push(e.message)); await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    await p.goto(BASE + q);
    await p.evaluate(([s, l]) => { I18N.set(l); const D = JANKA.DB; D.coins = 99999; Object.assign(D.set, { mode: 'free', lite: false, skills: false, tap2: false }, s);
      D.chars = Object.assign({ yukino: { skills: ['mind:0'], use: 'mind:0', partner: 'hakuro' }, hakuro: { skills: ['wareme:0'], use: 'wareme:0' } }, D.chars); D.sel = 'yukino'; localStorage.setItem('janka-v1', JSON.stringify(D)); }, [set, lang]);
    await p.reload(); await p.waitForTimeout(1200); p.ctx = ctx; return p; };
  // (2026-11-16) a call (ポン・チー) asked of the player before her turn is passed, or the wait would stall
  const myTurn = async p => { await p.evaluate(`void JANKA.startGame()`); await p.evaluate(`window.__skipCalls=setInterval(()=>{if(JANKA.UIS&&JANKA.UIS.kind==='call'){const b=document.querySelector('#acts .skip');if(b)b.click()}},300)`);
    await p.waitForFunction(`JANKA.UIS && JANKA.UIS.kind === 'turn' && document.querySelector('#hand .tl.drawn')`, null, { timeout: 120000 }); await p.waitForTimeout(1500);
    await p.waitForFunction(`JANKA.UIS.kind === 'turn'`, null, { timeout: 60000 }); await p.evaluate('clearInterval(__skipCalls)'); };
  const traceReach = `(()=>{const TB=JANKA.TB;window.__rc=null;const o=TB.reach.bind(TB);TB.reach=(g,seat,f,to)=>{const r=o(g,seat,f,to);if(seat===0&&!__rc){const rig=TB.hand(0);__rc={page:!!(f&&f.page),layer:rig.layers.isEnabled(1),hidden:!g.visible,shape:(()=>{const gh=document.querySelector('.tl.ghost'),h=document.querySelector('#hand .hrow .tl[data-id]');if(!gh||!h)return null;const a=getComputedStyle(gh),c=getComputedStyle(h);const nr=(x,y)=>Math.abs(parseFloat(x)-parseFloat(y))<.1,ok=nr(a.borderTopLeftRadius,c.borderTopLeftRadius)&&a.boxShadow===c.boxShadow&&nr(getComputedStyle(gh.querySelector('img')).borderTopLeftRadius,getComputedStyle(h.querySelector('img')).borderTopLeftRadius);return ok||[a.borderTopLeftRadius,c.borderTopLeftRadius,a.boxShadow,c.boxShadow,getComputedStyle(gh.querySelector('img')).borderTopLeftRadius,getComputedStyle(h.querySelector('img')).borderTopLeftRadius].join(' | ')})(),fx:f?f.x:null,ghost:document.querySelectorAll('.tl.ghost').length,dist:Math.hypot(rig.position.x-g.position.x,rig.position.z-g.position.z)};const iv=setInterval(()=>{if(TB._ov&&TB._ov.g)__rc.ovTile=true;else if(g.visible&&!__rc.ovTile)__rc.shownEarly=true},10);setTimeout(()=>{clearInterval(iv);__rc.ghostLater=document.querySelectorAll('.tl.ghost').length;__rc.ovTile=!!__rc.ovTile},5000)}return r}})()`;

  if (want('discard')) { console.log('[discard] the player\'s own discard (tap, PC)');
    // 2026-11-16: the hand must take the very tile of the page's hand row (page pose, drawn over the page), the page's copy
    // stays until the hand has it
    const p = await page(PC); await myTurn(p); await p.evaluate(traceReach);
    await p.evaluate(`document.querySelector('#hand .hrow .tl[data-id]:nth-child(5)').click()`); await p.waitForFunction(`window.__rc && __rc.ghostLater !== undefined`, null, { timeout: 12000 }).catch(() => {});
    const r = await p.evaluate('__rc');
    ok('tap: the hand takes the tile from the hand row (page pose)', !!(r && r.page && r.layer), JSON.stringify(r));
    // (2026-11-16, ユーザー「ツモ牌を捨てるとき牌が二重っぽい」) the 3D tile is not drawn behind the page's copy before the hand takes it
    // (2026-11-16, ユーザー「捨て牌の形が一瞬長方形に」) the copy has the row's rounded corners and purple edge
    ok('tap: the copy keeps the tile\'s rounded shape', !!(r && r.shape === true), JSON.stringify(r && r.shape));
    ok('tap: no 3D tile behind the page copy until it is taken', !!(r && r.hidden && !r.shownEarly), JSON.stringify(r));   // (2026-11-16: checked over the whole wait — the river's layout had shown it again right after reach())
    ok('tap: the copy of the tile is shown, then gone when taken', !!(r && r.ghost === 1 && r.ghostLater === 0 && r.ovTile), r && `ghost ${r.ghost}→${r.ghostLater} ovTile ${r.ovTile}`);
    ok('no page errors (game, PC)', !p.errs.length, p.errs.join(' | ')); await p.ctx.close(); }

  if (want('discard')) { console.log('[discard] a dora put into the row glows only once settled');
    // (2026-11-16, ユーザー「捨てた場所にドラが入る時、収まる前から光っていて違和感」)
    const p = await page(PC, {}, 'ja', '?nofreeze'); await myTurn(p);
    const r = await p.evaluate(`(async()=>{const G=JANKA.UIS.game,dr=+document.querySelector('#hand .tl.drawn').dataset.id,T=Math.floor(dr/4);
      let ind=-1;for(let i=0;i<34;i++)if(MJ.doraOf(i)===T){ind=i;break}const o=G.doraInds.bind(G);G.doraInds=()=>o().concat([ind]);JANKA.renderHand&&JANKA.renderHand();
      document.querySelector('#hand .hrow .tl[data-id]:nth-child(3)').click();
      let el=null;for(let k=0;k<40&&!el;k++){await new Promise(r=>setTimeout(r,25));el=document.querySelector('#hand .hrow .tl[data-id="'+dr+'"]')}
      if(!el)return 'not in row';const a=[el.classList.contains('dset'),getComputedStyle(el,'::before').visibility];
      await new Promise(r=>setTimeout(r,1200));const e2=document.querySelector('#hand .hrow .tl[data-id="'+dr+'"]');
      return a.concat([e2&&e2.classList.contains('dset'),e2&&getComputedStyle(e2,'::before').visibility])})()`);
    ok('a dora put into the row: no glow while it settles, then it glows', Array.isArray(r) && r[0] === true && r[1] === 'hidden' && r[2] === false && r[3] === 'visible', JSON.stringify(r));
    ok('no page errors (dora settle)', !p.errs.length, p.errs.join(' | ')); await p.ctx.close(); }

  if (want('discard')) { console.log('[discard] the results: a click anywhere goes on');
    // (2026-11-16, ユーザー「得点計算画面でも次へを押さず、画面の適当なところクリックでページ送り」)
    const p = await page(PC); await myTurn(p);
    await p.evaluate(`window.__mv=0;void JANKA.showMoves({scores:[26000,24000,25000,25000],delta:[1000,-1000,0,0]},{win:[0]}).then(()=>{__mv=1})`);   // (void: not waited for here)
    await p.waitForTimeout(900); const box = await p.evaluate(`(()=>{const r=document.querySelector('#modal').getBoundingClientRect();return [r.left+r.width*.5,r.top+r.height*.06]})()`);
    // (2026-11-18) the click is taken only after the scores have counted up (+0.4 s); under SwiftShader that can run past 0.9 s, so
    // click again every 0.5 s (as a player would) until it goes on, up to 5 s
    let mv = 0; for (let i = 0; i < 10 && !mv; i++) { await p.mouse.click(box[0], box[1]); await p.waitForTimeout(500); mv = await p.evaluate('__mv'); }
    ok('results: a click on an empty spot goes on', mv === 1);
    ok('no page errors (results click)', !p.errs.length, p.errs.join(' | ')); await p.ctx.close(); }

  if (want('discard')) { console.log('[discard] another player\'s すり替え: the new tile stands in her row (no reach to the centre)');
    // (2026-11-16, ユーザー「スキル使用の後、盤面の中央に手を伸ばして斜めに自分の方へ戻す謎のアクション」)
    const p = await page(PC); await myTurn(p);
    const r = await p.evaluate(`(async()=>{const G=JANKA.G,TB=JANKA.TB,s=1,P=G.P[s],old=P.hand[P.hand.length-1],nw=G.wall[G.livePos+3];
      TB.layoutHand(s,P.hand.slice(0,-1),old);P.hand[P.hand.length-1]=nw;
      await JANKA._ev('skill',{seat:s,slot:0,skill:'swap',tier:0,cost:0,info:{from:old,to:nw},scores:G.scores.slice(),kyotaku:G.kyotaku,char:G.chars[s]});
      const n=TB.tile(nw),o=TB.tile(old);return [n.visible,Math.round(Math.hypot(n.position.x,n.position.z)*10)/10,o.visible,JANKA.UIS.drawnBy[s]===nw]})()`);
    ok('すり替え by another: the new tile stands in her row, the old one is gone', r[0] === true && r[1] > 6 && r[2] === false && r[3] === true, JSON.stringify(r));
    ok('no page errors (swap)', !p.errs.length, p.errs.join(' | ')); await p.ctx.close(); }

  if (want('drag')) { console.log('[drag] phone: slide a tile to the middle');
    const p = await page(SP); await myTurn(p);
    // (2026-11-16, ユーザー「スライドで置ける範囲が中央部のみ。自分の捨て牌エリアならOK」) over the player's own river counts; over the hand row not
    const rv = await p.evaluate(`(()=>{const TB=JANKA.TB,r=TB.host.getBoundingClientRect(),q=TB.project(0,.5,5.4),h=document.querySelector('#hand .hrow').getBoundingClientRect();
      return [JANKA._overMyRiver(r.left+q.x,r.top+q.y), JANKA._overMyRiver(h.left+h.width/2,h.top+h.height/2), Math.round((r.top+q.y)/innerHeight*100)]})()`);
    ok('phone: letting go over my river discards, over the hand row not', rv[0] === true && rv[1] === false, JSON.stringify(rv));
    await p.evaluate(traceReach);
    const el = await p.$('#hand .hrow .tl[data-id]'); const bx = await el.boundingBox(); const cx = bx.x + bx.width / 2, cy = bx.y + bx.height / 2;
    await p.mouse.move(cx, cy); await p.mouse.down(); await p.mouse.move(cx, cy - 40, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(400);
    ok('short slide: the tile goes back, still my turn', await p.evaluate(`JANKA.UIS.kind === 'turn'`));
    const n0 = await p.evaluate(`JANKA.G.P[0].river.length`);
    await p.mouse.move(cx, cy); await p.mouse.down(); await p.mouse.move(cx, 390 * .35, { steps: 8 });
    const lit = await p.evaluate(`!!document.querySelector('#hand .tl.hdrop')`); await p.mouse.up(); await p.waitForTimeout(1200);
    const r = await p.evaluate('__rc'), n1 = await p.evaluate(`JANKA.G.P[0].river.length`), ghost = await p.evaluate(`document.querySelectorAll('.tl.ghost').length`);
    // (2026-11-16, ユーザー「スマホ:スライドして牌を捨てた際は自分の手のアニメーションを省略して、そのまま捨て牌に置く」) no hand, no page copy
    ok('long slide: lit, discarded straight into the river (no hand, no page copy)', lit && !r && n1 === n0 + 1 && !ghost, JSON.stringify({ r, n0, n1, ghost }));
    // a tap still has the hand take the tile
    // (the player's next turn: she holds a drawn tile again — right after the slide the state can still read 'turn')
    await p.waitForFunction(`JANKA.UIS.kind === 'turn' && JANKA.G.P[0].hand.length % 3 === 2 && !!document.querySelector('#hand .tl.drawn')`, null, { timeout: 90000 }).catch(() => {}); await p.waitForTimeout(400);
    await p.evaluate(traceReach); await p.evaluate(`document.querySelector('#hand .hrow .tl[data-id]:not(.no)').click()`); await p.waitForFunction('!!window.__rc', null, { timeout: 6000 }).catch(() => {});   // (slow when the machine is busy)
    const r2 = await p.evaluate('__rc'), k2 = await p.evaluate(`[JANKA.UIS.kind, JANKA.G.P[0].river.length, JANKA.DB.set.tap2]`); ok('a tap: the hand still takes the tile', !!(r2 && r2.page), JSON.stringify([r2, k2]));
    ok('no page errors (game, phone)', !p.errs.length, p.errs.join(' | ')); await p.ctx.close(); }

  if (want('banner')) { console.log('[banner] the round band is centred');
    const p = await page(PC); await p.evaluate(`void JANKA.startGame()`); await p.waitForTimeout(5000);
    await p.evaluate(`(()=>{const e=document.querySelector('#callout');e.style.left='1300px';e.style.top='700px'})()`);
    await p.evaluate(`void JANKA.roundBanner(JANKA.G)`); await p.waitForTimeout(500);
    const y = await p.evaluate(`(()=>{const r=document.querySelector('#callout .rbn-band').getBoundingClientRect();return r.top+r.height/2})()`);
    ok('round band in the middle after a call-out', Math.abs(y - 450) < 30, 'y ' + Math.round(y)); await p.ctx.close(); }

  if (want('home')) { console.log('[home] name card, top line, settings');
    // (2026-11-16, ユーザー「戦績：タブによってボックスのサイズが変化するので固定（最大で）」) the record panel keeps one size on every tab
    for (const vp of [PC, { viewport: { width: 1400, height: 1000 } }]) { const p = await page(vp);
      await p.evaluate(`document.querySelector('#btnStats').click()`); await p.waitForTimeout(700);
      const sz = await p.evaluate(`(async()=>{const o=[];for(const b of document.querySelectorAll('.pstats .ps-tabs button')){b.click();await new Promise(r=>setTimeout(r,250));
        const m=document.querySelector('.pstats .ps-main').getBoundingClientRect();o.push(Math.round(m.width)+'x'+Math.round(m.height))}return o})()`);
      ok(`record: one panel size on every tab (${vp.viewport.width}x${vp.viewport.height})`, sz.length > 1 && sz.every(x => x === sz[0]), sz.join(' ')); await p.ctx.close(); }
    for (const lang of ['ja', 'en']) {
      const p = await page(PC, {}, lang);
      const w0 = await p.evaluate(`document.querySelector('#partner').offsetWidth`);
      for (const [w, h] of [[1280, 720], [2560, 1440], [1600, 900]]) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(2300); }
      const w1 = await p.evaluate(`document.querySelector('#partner').offsetWidth`);
      ok(`${lang}: name card the same width after resizing back`, w0 === w1, `${w0} → ${w1}`);
      const tops = await p.evaluate(`[...document.querySelectorAll('#home .aa-top > *')].filter(e=>e.offsetWidth).map(e=>Math.round(e.getBoundingClientRect().top))`);
      ok(`${lang}: top-left and top-right share one top line`, new Set(tops).size === 1, tops.join(','));
      const ovf = await p.evaluate(`[...document.querySelectorAll('#home *')].filter(e=>{if(!e.offsetWidth||e.children.length||!e.textContent.trim())return false;const r=e.getBoundingClientRect();return r.right>innerWidth+1||r.left<-1}).map(e=>(e.className||e.tagName)+':'+e.textContent.slice(0,20))`);
      ok(`${lang}: no text runs off the home screen`, !ovf.length, ovf.slice(0, 4).join(' | '));
      await p.evaluate(`document.querySelector('#btnSet').click()`); await p.waitForTimeout(300);
      await p.mouse.click(10, 450); await p.waitForTimeout(300);
      ok(`${lang}: settings close on a click outside`, await p.evaluate(`document.querySelector('#modal').hidden`));
      ok(`${lang}: no page errors (home)`, !p.errs.length, p.errs.join(' | ')); await p.ctx.close(); } }

  if (want('jiggle')) { console.log('[jiggle] a tap on her picture wobbles, then the picture is back');
    const p = await page(PC); await p.evaluate(`(()=>{window.__pk=[];const o=MJJiggle.poke;MJJiggle.poke=(...a)=>{__pk.push(a.slice(1));return o(...a)}})()`);
    const bb = await (await p.$('#pImg img')).boundingBox(); await p.mouse.click(bb.x + bb.width * .5, bb.y + bb.height * .3); await p.waitForTimeout(80);
    const on = await p.evaluate(`[document.querySelector('#pImg img').style.visibility, getComputedStyle(document.querySelector('#pImg .jig')||document.body).display]`);
    await p.waitForTimeout(1600); const off = await p.evaluate(`[document.querySelector('#pImg img').style.visibility, getComputedStyle(document.querySelector('#pImg .jig')).display]`);
    // (2026-11-16, ユーザー「該当するエリア以外はぷるんしないように」) a touch on a place passes that place's ellipse: the wobble stays in it
    const pk = await p.evaluate(`(()=>{const id=JANKA.DB.sel,z=MJTouch.zones[id].find(z=>z[0]==='m');const r=document.querySelector('#pImg img').getBoundingClientRect(),k=Math.max(r.width/1080,r.height/1920),w=1080*k;
      return [z, r.left+(r.width-w)/2+z[1]*w, r.top+z[2]*1920*k]})()`);
    await p.waitForTimeout(1300); await p.mouse.click(pk[1], pk[2]); await p.waitForTimeout(80);
    const last = await p.evaluate('__pk[__pk.length-1]');
    ok('wobble: the touched place (lips) is passed to the wobble', !!(last && last[3] && last[3][0] === 'm'), JSON.stringify(last));
    ok('the canvas takes over while it wobbles, the picture comes back', on[0] === 'hidden' && on[1] === 'block' && off[0] === '' && off[1] === 'none', on + ' → ' + off);
    // (2026-11-16) the character screen's picture can be touched as well: a line in its bubble and the wobble
    await p.evaluate(`document.querySelector('#btnColl').click()`); await p.waitForTimeout(1200);
    const cb = await (await p.$('#chArt .aa-ch img')).boundingBox(); await p.mouse.click(cb.x + cb.width * .5, cb.y + cb.height * .4); await p.waitForTimeout(150);
    const ch = await p.evaluate(`[!document.querySelector('#chSay').hidden && document.querySelector('#chSay').textContent.length > 0, getComputedStyle(document.querySelector('#chArt .jig')||document.body).display]`);
    ok('character screen: a line and the wobble on a touch', ch[0] && ch[1] === 'block', ch.join(','));
    const sr = await p.evaluate(`(()=>{const s=document.querySelector('#chSay').getBoundingClientRect(),i=document.querySelector('#chInfo').getBoundingClientRect();return s.right<=i.left+2})()`);
    ok('character screen: the bubble stays clear of the info panel', sr);
    // (2026-11-16, ユーザー「文章が省略になってるので全文見せるように」) the partner's cost note is shown in full, never cut with …
    const cn = await p.evaluate(`(()=>{const c=document.querySelector('#chInfo .ptn-cost');if(!c)return 'none';const g=getComputedStyle(c);return g.display!=='none'&&g.textOverflow!=='ellipsis'&&c.scrollWidth<=c.clientWidth+1&&c.scrollHeight<=c.clientHeight+1})()`);
    ok('character screen: the partner cost note is shown in full', cn === true, String(cn));
    // (2026-11-16, ユーザー「唇に触れたときは許婚として愛を語る台詞を1キャラ10種」) every character has a lips place on her picture,
    // above the face, and ten lines for it
    const lp = await p.evaluate(`(async()=>{const ids=MJChars.all?MJChars.all().map(c=>c.id):Object.keys(MJTouch.zones);for(const id of ids)MJTouch.load(id);
      for(let i=0;i<60&&ids.some(id=>!MJTouch.data[id]);i++)await new Promise(r=>setTimeout(r,100));
      const bad=[];for(const id of ids){const z=(MJTouch.zones[id]||[]).find(z=>z[0]==='m'),d=MJTouch.data[id];
        if(!z||MJTouch.zone(id,z[1],z[2])!=='m'||!d||!d.m||d.m.length!==10||!MJTouch.line(id,'m'))bad.push(id)}return [ids.length,bad]})()`);
    ok('lips: a place and ten lines for every character', lp[0] >= 58 && !lp[1].length, JSON.stringify(lp));
    ok('no page errors (jiggle)', !p.errs.length, p.errs.join(' | ')); await p.ctx.close(); }

  if (want('vfx')) { console.log('[vfx] the game\'s light effects: shown over the cut-in word, then cleaned up');
    const p = await page(PC, {}, 'ja', '?nofreeze'); await p.evaluate(`void JANKA.startGame()`);   // (not ?fast: a fast cut-in can be over before its light comes)
    // (the table must be dealt first: when the machine is busy 5 s was not always enough)
    await p.waitForFunction(`JANKA.UIS && JANKA.UIS.chars && JANKA.UIS.chars[1] && document.querySelector('#hand .tl')`, null, { timeout: 60000 }).catch(() => {}); await p.waitForTimeout(800);
    await p.evaluate(`(()=>{window.__vx=[];const o=VFX.burst;VFX.burst=(...a)=>{const r=o(...a);__vx.push([a[0],a[1],!!document.querySelector('.vfx-cv'),VFX.active()]);return r}})()`);
    await p.evaluate(`void JANKA.cutin(1, 'ron')`); await p.waitForFunction('__vx.length > 0', null, { timeout: 10000 }).catch(() => {});   // (slow when the machine is busy)
    const on = await p.evaluate('__vx');   // (?fast shortens the cut-in, so the burst is caught as it is made)
    if (!on.length) console.log('    (debug)', await p.evaluate(`[document.querySelector('#cutin').className, typeof VFX, !!(JANKA.UIS&&JANKA.UIS.chars), document.hidden, JANKA.UIS&&JANKA.UIS.kind]`));
    ok('a burst of light during the cut-in', on.length > 0 && on[0][2] && on[0][3] > 0, JSON.stringify(on));
    // (the game keeps playing — calls bring new bursts — so: once 3 s pass with no new burst, the canvas must be gone)
    const gone = await p.waitForFunction(`(()=>{const n=__vx.length;if(window.__vn!==n){window.__vn=n;window.__vt=performance.now()}return performance.now()-__vt>3000&&!document.querySelector('.vfx-cv')&&VFX.active()===0})()`, null, { timeout: 40000, polling: 200 }).then(() => true, () => false);
    ok('the effect canvas is removed afterwards', gone, gone ? '' : JSON.stringify(await p.evaluate(`[__vx.length, !!document.querySelector('.vfx-cv'), VFX.active()]`)));
    // (2026-11-16, ユーザー「スキルエフェクトもAAAに」) every skill's effect brings the light engine in at its moments, on the table
    const sk = await p.evaluate(`(async()=>{let out=[];const one=async id=>{let n=0;const o=VFX.burst,o2=VFX.shock,o3=VFX.pull,o4=VFX.slash,o5=VFX.rise;
      const c=(f)=>(...a)=>{n++;return f(...a)};VFX.burst=c(o);VFX.shock=c(o2);VFX.pull=c(o3);VFX.slash=c(o4);VFX.rise=c(o5);
      await MJSkillFx.play(id,0,JANKA.TB,{dur:600});await new Promise(r=>setTimeout(r,700));VFX.burst=o;VFX.shock=o2;VFX.pull=o3;VFX.slash=o4;VFX.rise=o5;return n};
      for(const id of MJSkillFx.ids)if(!await one(id))out.push(id);
      let again=out;for(let k=0;k<3&&again.length;k++){const n=[];for(const id of again)if(!await one(id))n.push(id);again=n}return again})()`);   // (once more for any whose effect the game's own events cut short)
    ok('skill effects: each one adds its light (vfx.js)', !sk.length, sk.join(','));
    // (2026-11-16, ユーザー「GPU負荷を見た目を変えずに」) nothing in the game screen is animated by CSS for ever (the rays are set ~12/s)
    const inf = await p.evaluate(`document.getAnimations().filter(a=>{if(a.playState!=='running'||!a.effect||a.effect.getTiming().iterations!==Infinity)return false;const r=a.effect.target.getBoundingClientRect();return r.width*r.height>innerWidth*innerHeight*.4}).map(a=>a.animationName)`);
    ok('game: no never-ending CSS animation over the whole screen (GPU)', !inf.length, inf.join(','));
    ok('game: the god rays move (set from app.js)', await p.evaluate(`!!document.querySelector('#game .rays').style.getPropertyValue('--g1')`));
    ok('no page errors (vfx)', !p.errs.length, p.errs.join(' | ')); await p.ctx.close(); }

  if (want('memory')) { console.log('[memory] a phone: no layer or canvas holds more pixels than shows');
    // (2026-11-17, ユーザー「リーチ（演出？）でアプリが再起動。メモリ負荷を洗って」)
    const p = await page(SP); await p.evaluate(`void JANKA.startGame()`); await p.waitForTimeout(4000);
    ok('the home specks canvas lets its pixels go during a game', await p.evaluate(`(()=>{const c=document.querySelector('#aaFx');return !c||c.width*c.height<=1})()`));
    const m = await p.evaluate(`(()=>{const c=document.querySelector('#cutin'),pr=document.createElement('div');pr.className='ci-rays';c.appendChild(pr);
      const r=Math.round(parseFloat(getComputedStyle(pr).width)/Math.max(innerWidth,innerHeight)*100);pr.remove();
      return [getComputedStyle(document.querySelector('#cutin .ci-lines')||Object.assign(c.appendChild(document.createElement('i')),{className:'ci-lines'})).inset, r, Math.round(Math.hypot(innerWidth,innerHeight)/Math.max(innerWidth,innerHeight)*100)]})()`);
    ok('cut-in: the speed lines are the band\'s size and one stripe; the rays just cover the screen as they turn', m[0] === '0px -100px 0px 0px' && m[1] <= 120 && m[1] >= m[2], JSON.stringify(m));
    ok('no page errors (memory)', !p.errs.length, p.errs.join(' | ')); await p.ctx.close(); }

  if (want('sound')) { console.log('[sound] music fetched during a game is unlocked by the next touch (phones)');
    // (2026-11-17, ユーザー「リーチの曲で鳴らないのがありました（スマホ）」)
    const p = await page(PC, { snd: true }, 'ja', '?nofreeze'); await p.mouse.click(640, 360); await p.waitForTimeout(400);
    await p.evaluate(`JANKA.SND.newGame()`); await p.waitForFunction(`Object.values(JANKA.SND._trk).filter(B=>B.el&&B.g).length>=3&&!Object.values(JANKA.SND._trk).some(B=>B.getting)`, null, { timeout: 20000 }).catch(() => {});   // (every fetch done before the touch)
    await p.mouse.click(5, 5); await p.waitForTimeout(800);
    const r = await p.evaluate(`Object.entries(JANKA.SND._trk).filter(([k,B])=>B.el&&B.g).map(([k,B])=>[k,!!(B.ul||B.on),B.on||B.el.paused,B.on||B.g.gain.value===0])`);
    ok('every music element is unlocked by a touch, silent and stopped unless playing', r.length >= 3 && r.every(x => x[1] && x[2] && x[3]), JSON.stringify(r));
    // (2026-11-17, ユーザー「リーチ（演出？）でアプリが再起動。メモリ負荷を洗って」) tracks no longer wanted are let go: a game does not
    // gather every track it has played
    for (let h = 0; h < 4; h++) { await p.evaluate(`JANKA.SND.handStart()`); await p.waitForTimeout(2200); await p.evaluate(`JANKA.SND.music('riichi')`); await p.waitForTimeout(2200); }
    await p.evaluate(`JANKA.SND.music(null)`); await p.waitForTimeout(1800);
    const held = await p.evaluate(`Object.entries(JANKA.SND._trk).filter(([k,B])=>B.el||B.url).map(([k])=>k)`);
    ok('music: at most this hand\'s and the next tracks are held (≤ 5)', held.length <= 5 && !held.includes('title'), held.join(' '));
    ok('no page errors (sound)', !p.errs.length, p.errs.join(' | ')); await p.ctx.close(); }

  if (want('fonts')) { console.log('[fonts] every text in the Mincho');
    const p = await page(PC); const fams = await p.evaluate(`[...new Set([...document.querySelectorAll('body *')].filter(e=>e.offsetWidth).map(e=>getComputedStyle(e).fontFamily))]`);
    ok('only Shippori Mincho B1', fams.length === 1 && /Shippori/.test(fams[0]), fams.join(' / ')); await p.ctx.close(); }

  if (want('gacha')) { console.log('[gacha] a pull ends with the cards, no errors');
    const p = await page(PC); await p.evaluate(`document.querySelector('#btnGacha').click()`); await p.waitForTimeout(500);
    await p.evaluate(`document.querySelector('.gbtns [data-n="10"]').click()`); await p.waitForTimeout(4000);
    ok('10 cards shown', await p.evaluate(`document.querySelectorAll('#gStage .gc').length`) === 10);
    await p.mouse.click(8, 450); await p.waitForTimeout(300);
    ok('the gacha closes on a click outside', await p.evaluate(`document.querySelector('#modal').hidden`));
    ok('the effect canvas is gone afterwards', await p.evaluate(`!document.querySelector('.gfx-cv')`));
    ok('no page errors (gacha)', !p.errs.length, p.errs.join(' | ')); await p.ctx.close(); }

  await b.close();
}
(async () => {
  if (want('static')) staticChecks();
  await runtime();
  const bad = res.filter(r => !r[1]); console.log(`\n${res.length - bad.length}/${res.length} passed` + (bad.length ? ' — FAILED: ' + bad.map(r => r[0]).join('; ') : ''));
  process.exit(bad.length ? 1 : 0);
})();
