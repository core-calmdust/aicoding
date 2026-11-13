/* =====================================================================
   Shanghai (mahjong solitaire) on the portal's 3D table (2026-11-13, 3D only — the peg-solitaire format).
   · The card: フリー (a board by size, atlas/games/shanghai-core.js FREE, adapter.sizes 1..10) · ステージ (120 stages on
     12 constellations: each cleared stage lights a star; the stage's mission — clear all, clear in time, N pairs in time,
     the golden tiles, no hints / shuffles). The 星座マップ is a full-screen sheet of this file (stageMap).
   · Play: tap a free tile, then another free tile with the same face (flowers with flowers, seasons with seasons) — the two
     lift and go. A free tile: nothing on it, and its left or its right side open. Blocked tiles are a shade darker.
     The action bar: 待った (any number) and ヒント (a pair that keeps the board clearable when one exists). No pairs left:
     a sheet offers a shuffle (the tiles left dealt again, always clearable).
   · Tiles: atlas/models/shanghai.js (one InstancedMesh — one draw call for the whole layout).
   · Records: 'aicoding-shanghai' { settings: { back }, free: { <layout>: { best, n, date } }, st: { <s>: stars }, bt: { <s>: secs } }
   Rendering is on demand: animations kick Table3D; nothing loops while idle (the clock is a DOM timer).
   ===================================================================== */
(function () {
  'use strict';
  const KEY = 'aicoding-shanghai';
  const C = () => window.ShanghaiCore;
  const TX = (k, lang, v) => { const D = window.SHANGHAI_I18N && SHANGHAI_I18N[k]; let s = D ? D[lang] || D.en || '' : k; if (v) for (const x in v) s = s.split('{' + x + '}').join(v[x]); return s; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
  const save = d => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} };
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const mmss = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const SHUF_MAX = 3;   // shuffles a stage allows (a free game: any number)

  /* ---------- sounds (the portal's switch): a soft click of ivory, a pair going, a shuffle ---------- */
  const SFX = (() => {
    const on = () => { try { return localStorage.getItem('atlas-sfx') !== '0'; } catch (e) { return true; } };
    const ac = () => { try { const A = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (A.state === 'suspended') A.resume(); return A; } catch (e) { return null; } };
    function tone(f0, f1, dur, vol, type, d = 0) {
      const A = on() && ac(); if (!A) return; const t = A.currentTime + d, o = A.createOscillator(), g = A.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .004); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g).connect(A.destination); o.start(t); o.stop(t + dur + .02);
    }
    return {
      tap: () => { tone(2600, 2100, .035, .07, 'triangle'); tone(1400, 1100, .05, .04, 'sine', .005); },
      pair: () => { tone(880, 1320, .12, .05, 'sine'); tone(1320, 1760, .14, .04, 'sine', .07); },
      nope: () => tone(260, 200, .1, .05, 'triangle'),
      shuf: () => { for (let k = 0; k < 8; k++) tone(1800 + (k % 3) * 300, 1400, .03, .03, 'triangle', k * .04); },
    };
  })();

  /* ---------- styles: toasts, the stuck sheet, the card's stage panel, the star map ---------- */
  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement('style');
    s.textContent = `
.shtoast{position:fixed;left:50%;bottom:calc(var(--tbclear,18px) + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:90;max-width:min(92vw,560px);padding:11px 20px;border-radius:99px;background:#163a2e;color:#fff;font-weight:700;font-size:16px;text-align:center;box-shadow:0 10px 24px -10px rgba(0,0,0,.5);pointer-events:none}
.shask{position:fixed;inset:0;z-index:95;display:grid;place-items:center;background:rgba(10,14,24,.35)}
.shask>div{background:#fffdf7;color:#1d2433;border-radius:20px;padding:22px 24px 18px;width:min(88vw,420px);box-shadow:0 24px 60px -20px rgba(0,0,0,.6);text-align:center}
.shask b{display:block;font-size:22px;margin-bottom:8px}.shask p{margin:0 0 16px;font-size:17px;line-height:1.5}
.shask .r{display:flex;gap:10px}.shask button{flex:1;font:inherit;font-weight:800;font-size:17px;padding:12px 8px;border-radius:14px;border:0;cursor:pointer;white-space:nowrap}
.shask .y{background:#1f6a4c;color:#fff}.shask .n{background:#ece6d8;color:#3a3f4c}
.shstg{display:flex;flex-direction:column;gap:10px;align-items:stretch}
.shstg .pg{font-size:16px;font-weight:700;color:var(--ink,#2a2f3a)}
.shstg .nx{font-size:15px;opacity:.8}
.shstg .mapb{display:flex;align-items:center;justify-content:center;gap:10px;font:inherit;font-weight:800;font-size:18px;padding:14px;border-radius:16px;border:0;cursor:pointer;color:#fff;background:linear-gradient(135deg,#1b2350,#3a2a6e 60%,#5a3a8a);box-shadow:0 8px 20px -10px rgba(30,20,80,.8);white-space:nowrap}
.shstg .mapb i{font-style:normal;font-size:22px}
.shbest{display:flex;align-items:baseline;gap:10px;margin-top:6px;font-size:16px}.shbest b{font-size:22px;color:#b3222c}.shbest small{opacity:.7}
.shmap{position:fixed;inset:0;z-index:120;color:#eef0ff;display:flex;flex-direction:column;font-family:inherit;opacity:0;transition:opacity .25s;background:#070a1c}
.shmap.on{opacity:1}
.shmap .sky{position:absolute;inset:0;pointer-events:none;background:radial-gradient(60% 50% at 70% 30%,rgba(110,60,180,.35),transparent 70%),radial-gradient(50% 45% at 20% 75%,rgba(40,90,190,.35),transparent 70%),radial-gradient(40% 35% at 45% 50%,rgba(200,80,160,.16),transparent 70%),linear-gradient(#070a1c,#0d1238 60%,#151040)}
.shmap .sky canvas{position:absolute;inset:0;width:100%;height:100%}
.shmap .hd{position:relative;display:flex;align-items:center;gap:12px;padding:calc(12px + env(safe-area-inset-top)) 16px 8px}
.shmap .hd h2{margin:0;font-size:22px;letter-spacing:.04em;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.shmap .hd .tot{font-size:17px;font-weight:800;color:#ffd76a;white-space:nowrap}
.shmap .x{font:inherit;font-size:22px;width:46px;height:46px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;cursor:pointer}
.shmap .ars{position:relative;display:flex;gap:8px;overflow-x:auto;padding:4px 16px 10px;scrollbar-width:none}.shmap .ars::-webkit-scrollbar{display:none}
.shmap .ar{flex:none;font:inherit;font-size:15px;font-weight:700;padding:9px 14px;border-radius:99px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#dfe3ff;cursor:pointer;white-space:nowrap}
.shmap .ar.on{background:#ffd76a;color:#241a05;border-color:#ffd76a}.shmap .ar.lk{opacity:.45}
.shmap .ar em{font-style:normal;font-size:13px;margin-left:6px;opacity:.85}
.shmap .fld{position:relative;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:6px 16px}
.shmap .cst{position:relative;width:min(100%,calc((100vh - 300px) * 100 / 64),980px);aspect-ratio:100/64}
.shmap .cst.port{aspect-ratio:64/100;width:min(100%,calc((100vh - 330px) * 64 / 100))}
.shmap .cst svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.shmap .nm{position:absolute;left:0;top:-4px;font-size:clamp(26px,5vw,44px);font-weight:900;letter-spacing:.06em;color:rgba(255,255,255,.14);pointer-events:none;white-space:nowrap}
.shmap .nd{position:absolute;transform:translate(-50%,-50%);width:clamp(44px,6.4vw,62px);height:clamp(44px,6.4vw,62px);border-radius:50%;border:2px solid rgba(255,255,255,.35);background:radial-gradient(circle at 40% 35%,#3a4580,#141a40);color:#fff;font:inherit;font-weight:900;font-size:clamp(16px,2vw,21px);cursor:pointer;display:grid;place-items:center;padding:0}
.shmap .nd.ok{background:radial-gradient(circle at 40% 35%,#fff6c8,#f2c24a 55%,#b9851a);color:#3a2604;border-color:#fff3b0;box-shadow:0 0 18px 4px rgba(255,214,106,.55)}
.shmap .nd.cur{border-color:#9fe8ff;box-shadow:0 0 0 0 rgba(159,232,255,.7);animation:shpulse 1.6s infinite}
.shmap .nd.lk{opacity:.4;cursor:default}
.shmap .nd .sr{position:absolute;top:100%;left:50%;transform:translateX(-50%);font-size:13px;letter-spacing:-1px;color:#ffd76a;white-space:nowrap;margin-top:3px;text-shadow:0 1px 3px #000}
@keyframes shpulse{0%{box-shadow:0 0 0 0 rgba(159,232,255,.7)}70%{box-shadow:0 0 0 16px rgba(159,232,255,0)}100%{box-shadow:0 0 0 0 rgba(159,232,255,0)}}
.shmap .sh{position:relative;margin:0 auto calc(14px + env(safe-area-inset-bottom));width:min(94vw,640px);background:rgba(16,20,52,.92);border:1px solid rgba(255,255,255,.18);border-radius:22px;padding:16px 18px;display:flex;gap:14px;align-items:center;backdrop-filter:blur(6px)}
.shmap .sh .tx{flex:1;min-width:0}
.shmap .sh h3{margin:0 0 4px;font-size:20px}.shmap .sh .mi{font-size:18px;font-weight:800;color:#ffe7a0;line-height:1.35}
.shmap .sh .sub{font-size:15px;opacity:.8;margin-top:4px;line-height:1.45}
.shmap .sh .go{flex:none;font:inherit;font-weight:900;font-size:19px;padding:16px 22px;border-radius:16px;border:0;background:#ffd76a;color:#241a05;cursor:pointer;white-space:nowrap}
.shmap .sh .go:disabled{opacity:.4;cursor:default}
.shmap .nav{position:absolute;top:50%;transform:translateY(-50%);font:inherit;font-size:26px;width:46px;height:46px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;cursor:pointer}
.shmap .nav.l{left:8px}.shmap .nav.r{right:8px}.shmap .nav:disabled{opacity:.2}
@media (max-width:600px){.shmap .sh{flex-direction:column;align-items:stretch}.shmap .sh .go{width:100%}.shmap .nav{display:none}.shmap .cst{width:100%}}
`;
    document.head.appendChild(s);
  }

  /* ---------- the constellations: 10 stars each (x 0..100, y 0..64) and their lines ---------- */
  const CON = {
    aries: { p: [[8, 40], [18, 33], [28, 28], [39, 26], [50, 28], [60, 33], [68, 40], [77, 45], [86, 43], [93, 35]] },
    taurus: { p: [[8, 10], [18, 18], [30, 26], [42, 32], [52, 36], [60, 30], [66, 20], [72, 10], [70, 44], [88, 54]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [4, 8], [8, 9]] },
    gemini: { p: [[22, 58], [26, 46], [30, 34], [34, 22], [38, 10], [56, 8], [60, 20], [64, 32], [68, 44], [72, 56]] },
    cancer: { p: [[50, 6], [50, 18], [48, 30], [38, 40], [28, 50], [18, 58], [58, 40], [68, 48], [78, 54], [88, 58]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [2, 6], [6, 7], [7, 8], [8, 9]] },
    leo: { p: [[24, 10], [14, 18], [14, 30], [24, 36], [34, 30], [32, 20], [50, 38], [70, 34], [88, 42], [70, 52]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [3, 6], [6, 7], [7, 8], [8, 9], [9, 6]] },
    virgo: { p: [[10, 18], [20, 24], [32, 28], [44, 27], [54, 33], [64, 41], [76, 47], [56, 48], [44, 57], [90, 52]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [4, 7], [7, 8], [6, 9]] },
    libra: { p: [[50, 6], [34, 22], [66, 22], [50, 22], [28, 38], [72, 38], [22, 54], [78, 54], [40, 38], [60, 38]], e: [[0, 3], [1, 3], [3, 2], [1, 4], [2, 5], [4, 6], [5, 7], [4, 8], [5, 9]] },
    scorpius: { p: [[86, 8], [80, 17], [72, 24], [62, 29], [52, 35], [44, 43], [38, 51], [30, 57], [19, 58], [11, 51]] },
    sagittarius: { p: [[20, 26], [32, 18], [44, 22], [54, 14], [64, 22], [60, 36], [48, 42], [34, 42], [24, 36], [80, 30]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 0], [2, 6], [4, 9]] },
    capricornus: { p: [[10, 14], [22, 21], [34, 29], [46, 37], [58, 43], [72, 47], [88, 40], [80, 29], [62, 23], [38, 16]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 0]] },
    aquarius: { p: [[10, 20], [22, 12], [34, 20], [46, 12], [58, 20], [50, 32], [62, 40], [54, 52], [68, 58], [84, 50]] },
    pisces: { p: [[8, 12], [17, 21], [27, 30], [38, 39], [50, 47], [62, 40], [73, 32], [84, 24], [92, 13], [80, 10]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 7]] },
  };
  const edges = a => CON[a].e || CON[a].p.slice(1).map((_, i) => [i, i + 1]);

  /* ---------- progress ---------- */
  const prog = () => { const d = load(); return { st: d.st || {}, bt: d.bt || {} }; };
  const cleared = (P, s) => (P.st[s] || 0) > 0;
  const unlocked = (P, s) => s === 0 || cleared(P, s - 1);
  const nextStage = P => { for (let s = 0; s < 120; s++) if (!cleared(P, s)) return s; return 119; };
  const stageName = (s, lang) => TX('st.stage', lang, { a: Math.floor(s / 10) + 1, b: s % 10 + 1 });
  function missionText(st, lang) {
    const n = st.type === 'gold' ? st.gold : st.goal;
    return TX('mi.' + st.type, lang, { n, t: st.limit ? mmss(st.limit) : '' });
  }
  const parOf = st => st.limit ? Math.round(st.limit * .75) : st.par;
  function starsText(st, lang) { return TX('star2', lang, { t: mmss(parOf(st)) }) + ' · ' + TX('star3', lang); }

  /* ---------- the game on the table ---------- */
  function start(ctx) {
    const T3 = ctx.Table3D, TH3 = window.THREE, M3 = T3.shanghai, lang = ctx.lang, tx = (k, v) => TX(k, lang, v), K = C();
    const AD = window.Atlas3D.shanghai;
    // the stage: one picked on the map / 次のステージ (adapter.pending), else the one played last, else the next to clear
    let ST = null;
    if (ctx.mode === 'stage') { const s = AD.pending != null ? AD.pending : AD.last != null ? AD.last : nextStage(prog()); AD.pending = null; AD.last = s; ST = K.stage(s); }
    const lay = ST ? ST.lay : K.FREE[(ctx.size || 1) - 1] || 'petit';
    const P = K.LAYOUTS[lay], n = P.length;
    const dl = K.deal(P, ST ? ST.seed : 0), G = dl.G;
    let face = dl.face.slice(), alive = new Array(n).fill(1), plan = dl.order.map(p => p.slice());
    const gold = new Set(ST && ST.type === 'gold' ? K.goldTiles(dl, ST.gold) : []);
    let sel = -1, busy = true, over = false, stopped = false, ply = 0, hist = [], hints = 0, shufs = 0, got = 0, goldGot = 0, hintPair = null;
    let t0 = 0, tEnd = 0, pen = 0, clockT = 0, toastEl = null, toastT = 0, askEl = null;
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const kick = ms => { if (T3.kick) T3.kick(ms || 150); };
    const anim = (dur, f, done) => { const a0 = performance.now(); (function s(now) { if (stopped) return; const k = Math.min(1, Math.max(0, (now - a0) / dur)); f(k); kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(a0); };
    const left = () => alive.reduce((s, v) => s + v, 0);
    const SHUF_PEN = 10;   // a shuffle costs time: +10 s on the clock each (ユーザー 2026-11-14). It stays even if the shuffle is undone.
    const elapsed = () => t0 ? ((tEnd || performance.now()) - t0) / 1000 + pen : 0;

    /* the board: the mat and the tiles (one InstancedMesh) */
    const TW = M3.TW, TD = M3.TD, THh = M3.TH;
    const xs = P.map(p => p[0]), ys = P.map(p => p[1]), zMax = Math.max(...P.map(p => p[2]));
    const W = (Math.max(...xs) / 2 + 1) * TW, D = (Math.max(...ys) / 2 + 1) * TD;
    const g = new TH3.Group(), mat = M3.mat(W, D), base = mat.userData.top; g.add(mat);
    const im = M3.tiles(n); g.add(im);
    const shI = P.map((p, i) => p[2] > 0 ? i : -1).filter(i => i >= 0), shOf = {}; shI.forEach((i, k) => { shOf[i] = k; });
    const shm = M3.shades(Math.max(1, shI.length)); if (!shI.length) shm.count = 0; g.add(shm);   // (the soft shade each upper tile throws on the ones below)
    const pos = P.map(([x, y, z]) => [(x / 2 + .5) * TW - W / 2, base + z * THh, (y / 2 + .5) * TD - D / 2]);
    const st8 = P.map(() => ({ lift: 0, s: 1, dx: 0, dz: 0, dy: 0, rz: 0 }));
    const o3 = new TH3.Object3D(), col = new TH3.Color();
    const o4 = new TH3.Object3D();
    function place(i) { const S = st8[i], [x, y, z] = pos[i]; o3.position.set(x + S.dx, y + S.lift + S.dy, z + S.dz); o3.rotation.set(0, 0, S.rz); o3.scale.setScalar(S.s); o3.updateMatrix(); im.setMatrixAt(i, o3.matrix);
      const k = shOf[i]; if (k === undefined) return;
      // the shade stays on the tile below while the tile sits; it spreads and goes as the tile rises
      const on = alive[i] && S.s > .5 && S.dy < .05, sp = 1 + Math.min(.6, S.lift * 1.2);
      o4.position.set(x + .05, y + .003, z + .07); o4.scale.setScalar(on && S.lift < .45 ? sp : .0001); o4.updateMatrix(); shm.setMatrixAt(k, o4.matrix); shm.instanceMatrix.needsUpdate = true; }
    function tint(i) {
      const fr = st8[i].fly || (alive[i] && K.isFree(G, alive, i));   // (a tile in the air keeps its bright face until it is gone)
      let r = 1, gg = 1, b = 1;
      if (gold.has(i) && alive[i]) { r = 1.05; gg = .86; b = .46; }
      if (i === sel) { r *= 1.04; gg *= .93; b *= .66; }
      if (hintPair && hintPair.includes(i)) { r *= 1.05; gg *= .78; b *= .52; }
      const k = fr ? 1 : .6;
      col.setRGB(r * k, gg * k, b * k); im.setColorAt(i, col);
    }
    function paintAll() { for (let i = 0; i < n; i++) { place(i); tint(i); } im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; kick(200); }
    function faces() { for (let i = 0; i < n; i++) im.userData.setFace(i, face[i]); }
    faces();
    g.userData = { top: base + THh * (zMax + 1), _rb: Math.max(W, D) / 2 };
    T3.show('shanghai', g);
    const tall = innerHeight > innerWidth * 1.15;
    if (T3.fit) T3.fit(tall ? { w: W + 1.1, d: D + 1.6, y: base + THh, pitch: 1.28 } : { w: W + 1.0, d: D + 1.1, y: base + THh, pitch: 1.12 });   // (a little room round the mat: never touching the edges)

    /* the HUD: tiles left · the mission / pairs open · the clock */
    function hud() {
      const nl = left(), mv = K.moves(G, alive, face).length, tt = elapsed();
      let mid = tx('h.pairs', { n: mv });
      if (ST) { mid = ST.type === 'pairs' ? tx('h.got', { a: got, b: ST.goal }) : ST.type === 'gold' ? tx('h.gold', { a: goldGot, b: ST.gold }) : missionText(ST, lang); }
      const clk = ST && ST.limit ? `<span class="hs${ST.limit - tt <= 10 ? ' on' : ''}">${esc(tx('h.limit'))} <b>${mmss(ST.limit - tt)}</b></span>` : `<span class="hs">${esc(tx('h.time'))} <b>${mmss(tt)}</b></span>`;
      ctx.hud(`<span class="hs on"><b>${nl}</b>${esc(tx('h.left'))}</span><span class="hm">${esc(mid)}</span>${clk}`);
    }
    function clock() { clearInterval(clockT); clockT = setInterval(() => { if (stopped || over) { clearInterval(clockT); return; } hud(); if (ST && ST.limit && elapsed() >= ST.limit) fail('timeup'); }, 500); }
    function toast(msg, ms) {
      css(); if (toastEl) toastEl.remove(); clearTimeout(toastT);
      toastEl = document.createElement('div'); toastEl.className = 'shtoast'; toastEl.textContent = msg; document.body.appendChild(toastEl);
      const el = toastEl; toastT = setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, ms || 2600);
    }
    const turn = () => { if (ctx.onTurn) ctx.onTurn(over ? -1 : 0, { human: true, ply }); };

    /* the deal comes down: the layers one after another, each tile dropping into place */
    function intro() {
      const order = P.map((p, i) => i).sort((a, b) => P[a][2] - P[b][2] || P[a][1] - P[b][1] || P[a][0] - P[b][0]);
      const gap = Math.min(9, 700 / n), T0 = performance.now(), dur = 300, total = gap * n + dur;
      order.forEach((i, k) => { st8[i].dy = 3; st8[i].s = .001; st8[i].k0 = k * gap; });
      paintAll();
      (function step(now) {
        if (stopped) return; const tt = now - T0;
        order.forEach(i => { const q = Math.min(1, Math.max(0, (tt - st8[i].k0) / dur)); const e = 1 - Math.pow(1 - q, 3); st8[i].dy = (1 - e) * 2.4; st8[i].s = q > 0 ? 1 : .001; place(i); });
        im.instanceMatrix.needsUpdate = true; kick(120);
        if (tt < total) requestAnimationFrame(step); else { order.forEach(i => { st8[i].dy = 0; st8[i].s = 1; }); paintAll(); begin(); }
      })(T0);
      let tick = 0; const iv = setInterval(() => { if (stopped || ++tick > 10) { clearInterval(iv); return; } SFX.tap(); }, 70);
    }
    function begin() { busy = false; t0 = performance.now(); hud(); clock(); turn(); checkStuck(); }

    /* ---------- input ---------- */
    function tileAt(e) {
      for (let z = zMax; z >= 0; z--) {
        const p = T3.pick(e, base + (z + 1) * THh); if (!p) continue;
        let best = -1, bd = 9;
        for (let i = 0; i < n; i++) { if (!alive[i] || P[i][2] !== z) continue; const [x, , zz] = pos[i], dx = Math.abs(p.x - x), dz = Math.abs(p.z - zz); if (dx < TW * .5 && dz < TD * .5 && dx + dz < bd) { bd = dx + dz; best = i; } }
        if (best >= 0) return best;
      }
      return -1;
    }
    function lift(i, h, ms) { const S = st8[i], h0 = S.lift; anim(ms || 120, k => { if (!alive[i]) return; S.lift = h0 + (h - h0) * io(k); place(i); im.instanceMatrix.needsUpdate = true; }); }
    function wiggle(i) { const S = st8[i]; anim(260, k => { S.rz = Math.sin(k * Math.PI * 4) * .06 * (1 - k); place(i); im.instanceMatrix.needsUpdate = true; }, () => { S.rz = 0; place(i); im.instanceMatrix.needsUpdate = true; }); }
    function onClick(e) {
      if (busy || over || (T3.wasDrag && T3.wasDrag())) return;
      const i = tileAt(e);
      if (i < 0) { if (sel >= 0) { const s0 = sel; sel = -1; lift(s0, 0); tint(s0); im.instanceColor.needsUpdate = true; kick(); } return; }
      if (!K.isFree(G, alive, i)) { SFX.nope(); wiggle(i); toast(tx('msg.blocked'), 2200); return; }
      if (sel === i) { sel = -1; lift(i, 0); tint(i); im.instanceColor.needsUpdate = true; kick(); return; }
      if (sel >= 0 && K.cls(face[sel]) === K.cls(face[i])) { take(sel, i, true); return; }
      if (sel >= 0) { const s0 = sel; lift(s0, 0); sel = -1; tint(s0); }
      sel = i; SFX.tap(); lift(i, .14); tint(i); im.instanceColor.needsUpdate = true; kick();
    }
    ctx.el.addEventListener('click', onClick);

    /* ---------- taking a pair: both lift, glide together and vanish ----------
       The game is a race against the clock (ユーザー 2026-11-14), so the board never waits for the flourish: the pair is out of the
       game the moment it is tapped (the tiles under it are free at once, the next pair can be tapped while this one is still in
       the air) and the flight itself is short (TAKE_MS). Each flying tile carries a ticket (st8.fly); an undo that puts the tile
       back tears the ticket up, so a flight still in the air leaves the restored tile alone. */
    const TAKE_MS = 200;
    let flyN = 0;
    function take(a, b, own) {
      sel = -1; hintPair = null; ply++;
      alive[a] = alive[b] = 0; hist.push({ t: 'p', a, b });
      if (plan) plan = K.patch(plan, a, b);
      got++; if (gold.has(a)) goldGot++; if (gold.has(b)) goldGot++;
      SFX.pair();
      const A = st8[a], B = st8[b], ax = pos[a], bx = pos[b], mx = (ax[0] + bx[0]) / 2, mz = (ax[2] + bx[2]) / 2, my = Math.max(ax[1], bx[1]) + 1.1;
      const la = A.lift, lb = B.lift, tk = ++flyN; A.fly = B.fly = tk;
      const end = (S, i) => { if (S.fly !== tk) return; S.fly = 0; S.lift = 0; S.dx = S.dz = 0; S.rz = 0; S.s = .001; place(i); };
      anim(TAKE_MS, k => {
        const q = io(k), m = Math.max(0, (k - .25) / .75), s = Math.max(.001, 1 - Math.max(0, (k - .5) / .5));
        if (A.fly === tk) { A.lift = la + (my - ax[1] - la) * Math.min(1, k * 1.8); A.dx = (mx - ax[0]) * io(m) * .7; A.dz = (mz - ax[2]) * io(m) * .7; A.s = s; A.rz = q * .4; place(a); }
        if (B.fly === tk) { B.lift = lb + (my - bx[1] - lb) * Math.min(1, k * 1.8); B.dx = (mx - bx[0]) * io(m) * .7; B.dz = (mz - bx[2]) * io(m) * .7; B.s = s; B.rz = -q * .4; place(b); }
        im.instanceMatrix.needsUpdate = true;
      }, () => { end(A, a); end(B, b); im.instanceMatrix.needsUpdate = true; kick(); });
      for (let i = 0; i < n; i++) tint(i); im.instanceColor.needsUpdate = true;
      after();
    }
    function after() {
      busy = false; hud(); turn();
      if (!left()) { win(); return; }
      if (ST && ST.type === 'pairs' && got >= ST.goal) { win(); return; }
      if (ST && ST.type === 'gold' && goldGot >= ST.gold) { win(); return; }
      checkStuck();
    }
    function checkStuck() {
      if (over || K.moves(G, alive, face).length) return;
      if (ST && (ST.type === 'pure' || shufs >= SHUF_MAX)) { later(() => fail('stuck'), 500); return; }
      later(ask, 420);
    }
    function ask() {
      css(); if (askEl) askEl.remove();
      const el = askEl = document.createElement('div'); el.className = 'shask';
      const lbl = ST ? tx('msg.shufLeft', { n: SHUF_MAX - shufs }) : tx('b.shuffle');
      el.innerHTML = `<div><b>${esc(tx('r.stuck'))}</b><p>${esc(tx('msg.stuck'))}<br><small style="opacity:.8">${esc(tx('msg.shufPen', { n: SHUF_PEN }))}</small></p><div class="r"><button class="n">${esc(tx('b.later'))}</button><button class="y">${esc(lbl)}</button></div></div>`;
      document.body.appendChild(el);
      el.querySelector('.n').onclick = () => { el.remove(); askEl = null; };
      el.querySelector('.y').onclick = () => { el.remove(); askEl = null; shuffle(); };
    }
    function shuffle() {
      if (busy || over) return;
      if (ST && (ST.type === 'pure' || shufs >= SHUF_MAX)) { toast(tx('msg.noshuf')); return; }
      const r = K.reshuffle(G, alive, face); if (!r) return;
      busy = true; shufs++; pen += SHUF_PEN; ply++; hist.push({ t: 's', face: face.slice() }); SFX.shuf(); toast(tx('msg.shufPen', { n: SHUF_PEN }), 2200); hud();
      if (sel >= 0) { st8[sel].lift = 0; sel = -1; } hintPair = null;
      const idx = []; alive.forEach((v, i) => { if (v) idx.push(i); });
      anim(520, k => { const h = Math.sin(k * Math.PI) * .45; idx.forEach((i, j) => { st8[i].lift = h; st8[i].rz = Math.sin(k * Math.PI * 2 + j) * .08 * Math.sin(k * Math.PI); place(i); }); im.instanceMatrix.needsUpdate = true;
        if (k > .5 && face !== r.face) { face = r.face; plan = r.order; faces(); } },
      () => { idx.forEach(i => { st8[i].lift = 0; st8[i].rz = 0; }); face = r.face; plan = r.order; faces(); paintAll(); busy = false; hud(); turn(); checkStuck(); });
    }

    /* ---------- the end ---------- */
    function win() {
      if (over) return; over = true; tEnd = performance.now(); clearInterval(clockT); turn();
      const tt = Math.round(elapsed()), d = load();
      // the rest of the tiles (a pairs / gold mission ends early) rise and fade as a flourish
      const idx = []; alive.forEach((v, i) => { if (v) idx.push(i); });
      if (idx.length) anim(700, k => { idx.forEach(i => { st8[i].lift = Math.sin(k * Math.PI) * .5; place(i); }); im.instanceMatrix.needsUpdate = true; });
      if (!ST) {
        const F = d.free = d.free || {}, r = F[lay] || {}, nb = r.best === undefined || tt < r.best;
        F[lay] = { best: nb ? tt : r.best, n: (r.n || 0) + 1, date: nb ? today() : r.date }; save(d);
        later(() => ctx.onEnd({ win: true, draw: false, solo: true, level: 0, title: tx('r.clear'), score: tx('r.time', { t: mmss(tt) }), best: (nb ? '🏅 ' + tx('r.newBest') + ' · ' : '') + tx('r.best', { t: mmss(F[lay].best) }), opp: tx('lay.' + lay), key: lay, why: tx('r.clear') + ' · ' + mmss(tt) }), 800);
        return;
      }
      let stars = 1; if (tt <= parOf(ST)) { stars = 2; if (!hints && !shufs) stars = 3; }
      const S = d.st = d.st || {}, B = d.bt = d.bt || {}, s = ST.s, nb = B[s] === undefined || tt < B[s];
      S[s] = Math.max(S[s] || 0, stars); if (nb) B[s] = tt; save(d);
      const nx = s + 1 < 120 ? s + 1 : null;
      later(() => ctx.onEnd({ win: true, draw: false, solo: true, level: 0,
        title: tx('r.stage') + ' ' + '★'.repeat(stars) + '☆'.repeat(3 - stars), score: stageName(s, lang) + ' · ' + tx('r.time', { t: mmss(tt) }),
        best: (nb && S[s] ? tx('r.best', { t: mmss(B[s]) }) : tx('r.best', { t: mmss(B[s]) })) + ' · ' + '★'.repeat(S[s]),
        opp: stageName(s, lang), key: 'st' + s, why: tx('r.stage') + ' ' + stars + '★',
        next: nx != null ? { label: tx('b.next'), go: () => { AD.pending = nx; AD.last = nx; } } : null }), 800);
    }
    function fail(why) {
      if (over) return; over = true; tEnd = performance.now(); clearInterval(clockT); turn();
      if (askEl) { askEl.remove(); askEl = null; }
      later(() => ctx.onEnd({ win: false, draw: false, solo: true, level: 0, title: tx('r.fail'), score: (why === 'timeup' ? tx('r.timeup') : tx('r.stuck')) + ' · ' + tx('r.left', { n: left() }),
        best: ST ? stageName(ST.s, lang) + ' · ' + missionText(ST, lang) : '', opp: ST ? stageName(ST.s, lang) : tx('lay.' + lay), key: ST ? 'st' + ST.s : lay, why: tx('r.fail') }), 600);
    }

    /* ---------- set up ---------- */
    hud();
    M3.ready().then(() => { if (!stopped) intro(); });

    const api = {
      human: 0, noResign: true,
      canUndo: () => !busy && !over && !!hist.length,
      undo() {
        if (!api.canUndo()) return; const h = hist.pop(); ply++; hintPair = null;
        if (sel >= 0) { st8[sel].lift = 0; sel = -1; }
        if (h.t === 'p') { alive[h.a] = alive[h.b] = 1; [h.a, h.b].forEach(i => { const S = st8[i]; S.fly = 0; S.lift = 0; S.dx = S.dz = 0; S.rz = 0; S.s = 1; }); got--; if (gold.has(h.a)) goldGot--; if (gold.has(h.b)) goldGot--; }
        else { face = h.face; faces(); }
        plan = null; paintAll(); hud(); turn(); SFX.tap();
      },
      canHint: () => !busy && !over && !(ST && ST.type === 'pure'),
      hint() {
        if (ST && ST.type === 'pure') { toast(tx('msg.pure')); return Promise.resolve(false); }
        if (!api.canHint()) return Promise.resolve(false);
        const h = K.hint(G, alive, face, plan, 400);
        if (!h) { ask(); return Promise.resolve(true); }
        hints++; plan = h.plan; hintPair = h.pair;
        if (sel >= 0 && !h.pair.includes(sel)) { st8[sel].lift = 0; place(sel); sel = -1; }
        for (let i = 0; i < n; i++) tint(i); im.instanceColor.needsUpdate = true; im.instanceMatrix.needsUpdate = true;
        h.pair.forEach(i => { const S = st8[i]; anim(900, k => { if (!alive[i]) return; S.lift = Math.sin(k * Math.PI * 3) * .1 * (1 - k * .6); place(i); im.instanceMatrix.needsUpdate = true; }, () => { if (!alive[i]) return; S.lift = i === sel ? .14 : 0; place(i); im.instanceMatrix.needsUpdate = true; }); });
        if (!h.safe) toast(tx('msg.unsafe'), 3600);
        return Promise.resolve(true);
      },
      canDraw: () => false, canResign: () => false, resign() {}, timeout() {},
      stop() {
        stopped = true; clearInterval(clockT); timers.forEach(clearTimeout); clearTimeout(toastT);
        if (toastEl) toastEl.remove(); if (askEl) askEl.remove();
        ctx.el.removeEventListener('click', onClick);
        if (im.userData.dispose) im.userData.dispose(); if (shm.userData.dispose) shm.userData.dispose();
        if (window.__shPlay === dbg) delete window.__shPlay;
      },
    };
    const dbg = { state: () => ({ left: left(), over, busy, sel, hints, shufs, got, goldGot, t: elapsed(), lay, stage: ST }), moves: () => K.moves(G, alive, face), take: (a, b) => take(a, b), shuffle, at: i => T3.project ? T3.project(pos[i][0], pos[i][2], pos[i][1] + THh) : null, solveAll() { let h; while (!over && (h = K.hint(G, alive, face, plan, 400)) && h.safe) { const [a, b] = h.pair; alive[a] = alive[b] = 0; st8[a].s = st8[b].s = .001; if (plan) plan = K.patch(plan, a, b); got++; } paintAll(); after(); } };
    window.__shPlay = dbg; api._debug = dbg;
    return api;
  }

  /* ---------- the card: the free tab's best time, the stage tab's panel ---------- */
  function freeBind(host, lang) {
    css(); const el = document.createElement('div'); el.className = 'pgbest'; host.appendChild(el);
    const paint = () => { const z = document.getElementById('bvSize') ? +document.getElementById('bvSize').value : 1, lay = C().FREE[z - 1] || 'petit', r = (load().free || {})[lay];
      el.innerHTML = `<span>${esc(TX('best', lang))}</span><b>${r ? mmss(r.best) : '—'}</b>${r && r.date ? `<small class="pgd">${esc(new Date(r.date + 'T12:00:00').toLocaleDateString(lang, { year: 'numeric', month: 'short', day: 'numeric' }))}</small>` : ''}`; };
    paint(); const s = document.getElementById('bvSize'); if (s) s.addEventListener('change', paint);
  }
  function stagePanel(lang) {
    css(); const P = prog(), c = Object.keys(P.st).filter(s => P.st[s] > 0).length, s = Object.values(P.st).reduce((a, v) => a + v, 0), nx = nextStage(P);
    return `<div class="pg">${esc(TX('st.progress', lang, { c, n: 120, s, t: 360 }))}</div><div class="nx">${esc(TX('st.next', lang, { s: stageName(nx, lang) + ' ' + TX('ar.' + C().AREAS[Math.floor(nx / 10)], lang) }))}</div><button type="button" class="mapb" data-shmap><i>✦</i>${esc(TX('b.map', lang))}</button>`;
  }
  function stageBind(host, lang, play) {
    host.addEventListener('click', e => { if (e.target.closest('[data-shmap]')) stageMap({ lang, play }); });
  }

  /* ---------- the star map ---------- */
  function stars(cv) {   // a field of small stars (drawn once per open)
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); cv.width = r.width * dpr; cv.height = r.height * dpr;
    const c = cv.getContext('2d'); let s = 99; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 260; i++) { const x = R() * cv.width, y = R() * cv.height, a = R(); c.fillStyle = `rgba(255,255,255,${.15 + a * .7})`; c.beginPath(); c.arc(x, y, (.3 + a * a * 1.3) * dpr, 0, 7); c.fill(); }
  }
  function stageMap(o) {
    css(); const lang = o.lang, K = C(), AR = K.AREAS;
    let P = prog(), area = Math.floor(nextStage(P) / 10), pick = nextStage(P);
    const el = document.createElement('div'); el.className = 'shmap';
    el.innerHTML = `<div class="sky"><canvas></canvas></div><div class="hd"><h2></h2><span class="tot"></span><button type="button" class="x" aria-label="${esc(TX('b.close', lang))}">✕</button></div><div class="ars"></div><div class="fld"><button type="button" class="nav l">‹</button><div class="cst"></div><button type="button" class="nav r">›</button></div><div class="sh"></div>`;
    document.body.appendChild(el); requestAnimationFrame(() => { el.classList.add('on'); stars(el.querySelector('canvas')); });
    const $ = q => el.querySelector(q);
    const close = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 260); removeEventListener('keydown', key); };
    const key = e => { if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') go(area - 1); if (e.key === 'ArrowRight') go(area + 1); };
    addEventListener('keydown', key);
    $('.x').onclick = close;
    const areaOpen = a => unlocked(P, a * 10);
    function go(a) { if (a < 0 || a > 11) return; area = a; const fs = a * 10; pick = Array.from({ length: 10 }, (_, k) => fs + k).find(s => unlocked(P, s) && !cleared(P, s)); if (pick == null) pick = fs; paint(); }
    function paint() {
      const tot = Object.values(P.st).reduce((a, v) => a + v, 0);
      $('h2').textContent = TX('st.title', lang); $('.tot').textContent = '★ ' + tot + ' / 360';
      $('.ars').innerHTML = AR.map((a, i) => { const st = Array.from({ length: 10 }, (_, k) => P.st[i * 10 + k] || 0).reduce((x, v) => x + v, 0); return `<button type="button" class="ar${i === area ? ' on' : ''}${areaOpen(i) ? '' : ' lk'}" data-a="${i}">${esc(TX('ar.' + a, lang))}<em>★${st}</em></button>`; }).join('');
      const on = $('.ar.on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      // a tall screen (phones): the figure turned a quarter (x ↔ y) so it fills the height rather than a thin strip
      const port = innerHeight > innerWidth * 1.1, a = AR[area], pts = CON[a].p.map(([x, y]) => port ? [y, x] : [x, y]), fs = area * 10, VW = port ? 64 : 100, VH = port ? 100 : 64;
      $('.cst').classList.toggle('port', port);
      const lit = ([i, j]) => cleared(P, fs + i) && cleared(P, fs + j);
      $('.cst').innerHTML = `<div class="nm">${esc(TX('ar.' + a, lang))}</div><svg viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="none">${edges(a).map(e => { const [x1, y1] = pts[e[0]], [x2, y2] = pts[e[1]]; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${lit(e) ? '#ffd76a' : 'rgba(180,200,255,.28)'}" stroke-width="${lit(e) ? .7 : .35}" stroke-linecap="round" ${lit(e) ? 'filter="drop-shadow(0 0 1.2px #ffd76a)"' : 'stroke-dasharray="1 1.2"'}/>`; }).join('')}</svg>` +
        pts.map(([x, y], k) => { const s = fs + k, ok = cleared(P, s), ul = unlocked(P, s), sr = P.st[s] || 0;
          return `<button type="button" class="nd${ok ? ' ok' : ''}${ul && !ok ? ' cur' : ''}${ul ? '' : ' lk'}" style="left:${x / VW * 100}%;top:${y / VH * 100}%${s === pick ? ';outline:3px solid #fff;outline-offset:3px' : ''}" data-s="${s}">${k + 1}${sr ? `<span class="sr">${'★'.repeat(sr)}${'☆'.repeat(3 - sr)}</span>` : ''}</button>`; }).join('');
      $('.nav.l').disabled = area === 0; $('.nav.r').disabled = area === 11;
      sheet();
    }
    function sheet() {
      const s = pick, st = K.stage(s), ul = unlocked(P, s), sr = P.st[s] || 0, bt = P.bt[s];
      $('.sh').innerHTML = `<div class="tx"><h3>${esc(stageName(s, lang))} · ${esc(TX('lay.' + st.lay, lang))} <small style="opacity:.7;font-size:15px">${esc(TX('tiles', lang, { n: st.n }))}</small></h3><div class="mi">${esc(missionText(st, lang))}</div><div class="sub">${ul ? esc(starsText(st, lang)) + (sr ? '<br>' + '★'.repeat(sr) + '☆'.repeat(3 - sr) + (bt != null ? ' · ' + esc(TX('r.best', lang, { t: mmss(bt) })) : '') : '') : esc(TX('st.lock', lang))}</div></div><button type="button" class="go"${ul ? '' : ' disabled'}>${esc(TX('b.start', lang))} ▶</button>`;
      $('.go').onclick = () => { if (!ul) return; close(); o.play(s); };
    }
    el.addEventListener('click', e => {
      const a = e.target.closest('[data-a]'); if (a) { go(+a.dataset.a); return; }
      const n = e.target.closest('.nd'); if (n) { pick = +n.dataset.s; paint(); return; }
      if (e.target.closest('.nav.l')) go(area - 1); else if (e.target.closest('.nav.r')) go(area + 1);
    });
    // swipe between the constellations (phones)
    let sx = null; el.addEventListener('touchstart', e => { if (e.target.closest('.ars,.sh')) { sx = null; return; } sx = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 60) go(area + (dx < 0 ? 1 : -1)); sx = null; });
    paint();
    return { close };
  }

  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.shanghai = {
    levels: 0, solo: true, table: false, sizes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], size0: 1,
    sizeLabel: () => '',
    sizeName: (z, lang) => { const k = C() && C().FREE[z - 1]; return k ? TX('lay.' + k, lang) + ' · ' + TX('tiles', lang, { n: C().LAYOUTS[k].length }) : String(z); },
    stages: true, modeName: (m, lang) => TX(m === 'stage' ? 'm.stage' : 'm.free', lang),
    stagePanel, stageBind, freeBind, stageMap, pending: null, last: null, nextStage: () => nextStage(prog()),
    start,
  };
})();
