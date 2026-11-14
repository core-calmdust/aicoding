/* =====================================================================
   Peg Solitaire on the portal's 3D table (2026-11-11, user: 3Dで遊べるように).
   · The board card: no AI, no sides — the board to play (英国式 / 欧州式 / 三角 / ダイヤ / ドイツ式) in the size row
     (adapter.sizes 1..5 = PegEngine.IDS; adapter.solo: the card shows no level and the end card no Lv.).
   · start(ctx) plays the free game of peg/ on the table: the board's classic start hole is empty, the goal is its ◎ hole
     (the classic goal, PegEngine.goalHole) — one marble left = success, on ◎ = perfect. Input as on the page: tap a marble,
     then the hole it jumps to (the holes it can reach glow). The jumped marble rolls off into the groove.
     The action bar: 待った (any number of jumps back) and ヒント (the page's solver, ../peg/engine.js as a Worker).
     Texts: the 2D page's own strings (../peg/i18n.js → window.PEG_I18N, loaded with this file by atlas/lazy.js).
     Board and marbles: atlas/models/peg.js (the board / marble designs chosen in the portal = the 2D page's settings).
   Rendering is on demand: animations kick Table3D; nothing loops while idle.
   ===================================================================== */
(function () {
  'use strict';
  const ENG = '../peg/engine.js?v=2';
  const loadEngine = () => window.PegEngine ? Promise.resolve(window.PegEngine) : new Promise((res, rej) => { const s = document.createElement('script'); s.src = ENG; s.onload = () => window.PegEngine ? res(window.PegEngine) : rej(new Error('engine')); s.onerror = () => rej(new Error('engine')); document.head.appendChild(s); });
  const IDS = ['english', 'french', 'triangle', 'diamond', 'german', 'pyramid'];   // (pyramid: 3D only, 2026-11-14)
  const PT = (k, lang, v) => { const D = window.PEG_I18N && PEG_I18N[k]; let s = D ? D[lang] || D.en || '' : ''; if (v) for (const x in v) s = s.split('{' + x + '}').join(v[x]); return s; };
  const BEST = { ja: 'ベスト', en: 'Best', zh: '最佳', 'zh-TW': '最佳', ko: '베스트', es: 'Mejor', fr: 'Record', pt: 'Melhor', de: 'Bestwert', ru: 'Лучший', tr: 'En iyi', id: 'Terbaik', hi: 'सर्वश्रेष्ठ', ar: 'الأفضل' };
  const BOARD_LBL = { ja: '盤', en: 'Board', zh: '棋盘', 'zh-TW': '棋盤', ko: '판', es: 'Tablero', fr: 'Plateau', pt: 'Tabuleiro', de: 'Brett', ru: 'Доска', tr: 'Tahta', id: 'Papan', hi: 'बोर्ड', ar: 'اللوحة' };
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

  /* ---------- little sounds (the portal's sound switch): a clack, a roll, a chime ---------- */
  const SFX = (() => {
    const on = () => { try { return localStorage.getItem('atlas-sfx') !== '0'; } catch (e) { return true; } };
    const ac = () => { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    function tone(f0, f1, dur, vol, type, d = 0) {
      const C = on() && ac(); if (!C) return; const t = C.currentTime + d, o = C.createOscillator(), g = C.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g).connect(C.destination); o.start(t); o.stop(t + dur + .02);
    }
    return {
      lift: () => tone(620, 900, .06, .05, 'triangle'),
      clack: () => { tone(2400, 1800, .04, .08, 'triangle'); tone(1300, 900, .05, .05, 'sine', .01); },
      roll: () => { for (let k = 0; k < 6; k++) tone(900 - k * 60, 0, .03, .03, 'triangle', k * .05); },
      nope: () => tone(300, 220, .09, .05, 'triangle'),
    };
  })();
  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement('style');
    s.textContent = `.pgtoast{position:fixed;left:50%;bottom:calc(var(--tbclear,18px) + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:90;max-width:min(92vw,520px);padding:10px 18px;border-radius:99px;background:#5a3b8c;color:#fff;font-weight:700;font-size:14px;text-align:center;box-shadow:0 10px 24px -10px rgba(0,0,0,.5);pointer-events:none}
.pgrw{position:fixed;left:50%;top:50%;transform:translate(-50%,-46%) scale(.94);opacity:0;transition:opacity .35s,transform .35s;z-index:120;width:min(88vw,380px);padding:14px 16px;border-radius:18px;background:#fffaf2;color:#2a2238;box-shadow:0 24px 60px -18px rgba(20,10,40,.6);cursor:pointer}
.pgrw.on{opacity:1;transform:translate(-50%,-50%) scale(1)}
.pgrw .it{display:flex;align-items:center;gap:12px}.pgrw .it+.it{margin-top:8px;padding-top:8px;border-top:1px solid rgba(0,0,0,.08)}
.pgrw img{width:72px;height:72px;flex:none;border-radius:14px;background:radial-gradient(circle at 50% 40%,#fff,#efe6f8)}
.pgrw b{display:block;font-size:14px;line-height:1.4}.pgrw .r{display:inline-block;margin-bottom:3px;padding:1px 8px;border-radius:99px;font:800 11px/1.5 system-ui;color:#fff;background:#8a8f9a}
.pgrw .r1{background:#3a8be0}.pgrw .r2{background:linear-gradient(90deg,#b06ae8,#f0a030)}`;
    document.head.appendChild(s);
  }

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, P3 = T3.peg, lang = ctx.lang, tx = (k, v) => PT(k, lang, v);
    // ctx.pz (atlas/puzzles.js, 2026-11-13): a puzzle — its cells 'board:pegs:goal' (peg/puzzles.json b · p · t); no end card, each
    // finished jump goes to ctx.pz.moved(u, { over, left, onGoal }) (u = 'from.to'); the puzzle's flow drives the rest
    const PZ = ctx.pz || null, pzParse = c => { const [b, p, t] = String(c || '').split(':'); return { b: IDS.includes(b) ? b : 'english', p: p || '', t: t === undefined || t === '' ? -1 : +t }; };
    let bid = PZ ? pzParse(PZ.cells).b : IDS[(ctx.size || 1) - 1] || 'english';
    let E = null, B = null, board = null, U = null, TOP = .5;
    let a = null, a0 = null, goal = -1, hist = [], pcs = {}, taken = [], sel = -1, over = false, busy = true, stopped = false, ply = 0;
    let worker = null, jid = 0, toastEl = null, toastT = 0, hinted = false;
    const Y = i => (U && U.y ? U.y(i) : 0);   // a hole's height (the pyramid's layers; 0 on the flat boards)
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const kick = ms => { if (T3.kick) T3.kick(ms || 150); };
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const count = () => a.reduce((s, v) => s + v, 0);

    /* ---------- marks: the ◎ goal, the chosen marble, the holes it can reach, the last jump, a hint ---------- */
    const hl = new TH.Group(), basic = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    const MAT = { sel: basic(0xffc94a, .95), goal: basic(0xf1c879, .85), dest: basic(0x3fe0c4, .9), last: basic(0xffc94a, .3), hint: basic(0xff7a1a, .95) };
    const GEO = { ring: new TH.TorusGeometry(.42, .035, 8, 44), dot: new TH.CylinderGeometry(.13, .13, .012, 24), cup: new TH.CircleGeometry(.4, 36) };
    GEO.ring.rotateX(Math.PI / 2); GEO.cup.rotateX(-Math.PI / 2);
    function mark(geo, mat, i, y) { const m = new TH.Mesh(geo, mat), [x, z] = U.pt(i); m.position.set(x, TOP + Y(i) + y, z); m.renderOrder = 2; hl.add(m); kick(); return m; }
    let pulseOn = false;
    function pulse() { if (stopped) return; const k = .5 + .5 * Math.sin(performance.now() / 260); let any = false; hl.children.forEach(m => { if (m.userData.p) { any = true; const s = .88 + k * .24; m.scale.set(s, 1, s); } }); if (any) { kick(80); requestAnimationFrame(pulse); } else pulseOn = false; }
    const pulsing = m => { m.userData.p = true; if (!pulseOn) { pulseOn = true; requestAnimationFrame(pulse); } return m; };
    // the pyramid's empty places (2026-11-14, user: 空いている部分がわかりにくい): a faint glass ghost of a marble in each one,
    // seen through the marbles in front (no depth write, drawn last) — one InstancedMesh, updated with the position
    let ghost = null;
    function ghosts() {
      if (!(U && U.pyr) || !a) { if (ghost) ghost.count = 0; return; }
      if (!ghost || ghost.parent !== board) {
        if (ghost && ghost.parent) ghost.parent.remove(ghost);
        const m = new TH.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .9, side: TH.DoubleSide, depthWrite: false, depthTest: false, toneMapped: false });
        // a flat disc of light where a marble can sit (user: 玉より置ける面を半透明の水色の面で — a ball was mistaken for a marble), the rim a little brighter
        // (2026-11-14, user: ゲーミング・レインボーな感じ) a rainbow wheel that spins: the hues round the disc, a bright rim, a softer middle
        const tx = document.createElement('canvas'); tx.width = tx.height = 128; const c2 = tx.getContext('2d');
        for (let d = 0; d < 360; d += 2) { c2.fillStyle = `hsl(${d},100%,55%)`; c2.beginPath(); c2.moveTo(64, 64); c2.arc(64, 64, 63, d * Math.PI / 180, (d + 2.6) * Math.PI / 180); c2.closePath(); c2.fill(); }
        const gr = c2.createRadialGradient(64, 64, 6, 64, 64, 63); gr.addColorStop(0, 'rgba(0,0,0,.5)'); gr.addColorStop(.68, 'rgba(0,0,0,.35)'); gr.addColorStop(.8, 'rgba(0,0,0,0)'); gr.addColorStop(.9, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
        c2.globalCompositeOperation = 'destination-out'; c2.fillStyle = gr; c2.fillRect(0, 0, 128, 128);
        m.map = new TH.CanvasTexture(tx); m.map.center.set(.5, .5); if (TH.sRGBEncoding) m.map.encoding = TH.sRGBEncoding;
        const dg = new TH.CircleGeometry(.36, 32); dg.rotateX(-Math.PI / 2);
        ghost = new TH.InstancedMesh(dg, m, B.n); ghost.renderOrder = 5; ghost.frustumCulled = false; board.add(ghost);
      }
      const M4 = new TH.Matrix4(); let k = 0;
      for (let i = 0; i < B.n; i++) if (!a[i]) { const [x, z] = U.pt(i); M4.makeTranslation(x, TOP + Y(i) + .03, z); ghost.setMatrixAt(k++, M4); }
      ghost.count = k; ghost.instanceMatrix.needsUpdate = true; kick(120);
      // the colour goes slowly round the hues (user: 青一色だと青い玉と重なって見にくい — gently, not flashy): ~10 s a turn, a few steps a second
      // (2026-11-14: faster and brighter — 4 s a turn, a soft breathing of its strength)
      if (!hueT) hueT = setInterval(() => { if (stopped || !ghost || !ghost.count) return; const t = performance.now(); ghost.material.map.rotation = -(t / 1600) % (Math.PI * 2); ghost.material.opacity = .85 + .15 * Math.sin(t / 380); kick(40); }, 50);
    }
    let hueT = 0;
    function marks(hint) {
      ghosts();
      while (hl.children.length) hl.remove(hl.children[0]);
      if (goal >= 0 && !over) mark(GEO.ring, MAT.goal, goal, .02);
      const last = hist[hist.length - 1]; if (last && sel < 0 && !hint) { mark(GEO.cup, MAT.last, last[2], .006); }
      if (sel >= 0) mark(GEO.ring, MAT.sel, sel, .02);
      if (sel >= 0) E.moves(B, a).filter(j => j[0] === sel).forEach(j => pulsing(mark(GEO.dot, MAT.dest, j[2], .03)));
      if (hint) { pulsing(mark(GEO.ring, MAT.hint, hint[0], .06)); pulsing(mark(GEO.dot, MAT.hint, hint[2], .03)); }
      kick(200);
    }

    /* ---------- the HUD and a toast ---------- */
    function hud(msg) {
      if (PZ) return;
      const n = a ? count() : 0;
      ctx.hud(`<span class="hs on"><b>${n}</b>${tx('st.unit')}</span><span class="hm">${msg == null ? (goal >= 0 ? tx('st.goal') : tx('st.any')) : msg}</span><span class="hs">${tx('st.moves', { n: hist.length })}</span>`);
    }
    function toast(msg, ms) {
      css(); if (toastEl) toastEl.remove(); clearTimeout(toastT);
      toastEl = document.createElement('div'); toastEl.className = 'pgtoast'; toastEl.textContent = msg; document.body.appendChild(toastEl);
      const el = toastEl; toastT = setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, ms || 2400);
    }
    const turn = () => { if (ctx.onTurn) ctx.onTurn(over ? -1 : 0, { human: true, ply }); };

    // the Atlamo a goal gave: a card in the middle of the screen (tap to close), one line per avatar
    function rewardCard(ids, n = 0) {
      if (stopped) return;
      const ach = document.querySelector('.newach');   // (the portal's 実績を達成！ sheet first: the card comes after it is closed)
      if (ach && ach.offsetParent && n < 150) { setTimeout(() => rewardCard(ids, n + 1), 400); return; }
      css(); const N = window.AtlasNPC, el = document.createElement('div'); el.className = 'pgrw'; el.setAttribute('role', 'status');
      el.innerHTML = ids.map(id => { const m = /^av-boss-peg-(\d)-(\d)$/.exec(id), b = N && N.BOSSES && N.BOSSES.peg && N.BOSSES.peg[+m[1] - 1], nm = b ? (b.n[lang] || b.n.en) : '', r = ['N', 'R', 'SR'][+m[2]];
        return `<div class="it"><img src="../images/atlas/av/${id.slice(3)}.webp?v=1" alt=""><div><span class="r r${m[2]}">${r}</span><b>${String(tx('rw.got', { name: nm, r })).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))}</b></div></div>`; }).join('');
      document.body.appendChild(el); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
      const close = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 400); }; el.onclick = close; setTimeout(close, 6500);
      try { if (window.SFX && SFX.win) SFX.win(); } catch (e) {}
    }

    /* ---------- marbles ---------- */
    function mkMarble(i) { const m = P3.marble(i), sh = T3.contact(P3.R * 1.05, .5); sh.position.y = .014; m.add(sh); m.userData.sh = sh; board.add(m); return m; }
    function lift(g, h) { g.position.y = TOP + (g.userData.by || 0) + h; g.userData.h0 = h; const sh = g.userData.sh; if (sh) { sh.position.y = .014 - h; const s = 1 + h * .6; sh.scale.set(s, s, s); sh.material.opacity = .5 / (1 + h * 1.6); } }
    function drop(g) { if (g.userData.sh) g.userData.sh.material.dispose(); board.remove(g); }
    function land(g) { anim(160, k => { const s = 1 + Math.sin(k * Math.PI) * .05; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1)); }
    function inGroove(v, k) { const sh = v.userData.sh; if (sh) { v.remove(sh); sh.material.dispose(); v.userData.sh = null; } const [gx, gy, gz] = U.groove(k); v.position.set(gx, gy - P3.R * .78, gz); v.scale.setScalar(.85); v.rotation.set(0, 0, 0); }
    // the whole position at once (the start, 待った): marbles keep their own colour by the hole they started in
    function rebuild(intro) {
      Object.values(pcs).forEach(drop); taken.forEach(drop); pcs = {}; taken = [];
      // replay the history on the starting marbles so every marble keeps its colour
      const who = {}; for (let i = 0; i < B.n; i++) if (a0[i]) who[i] = i;
      const gone = [];
      hist.forEach(([f, o, t]) => { who[t] = who[f]; delete who[f]; gone.push(who[o]); delete who[o]; });
      let n = 0; const tot = Object.keys(who).length, gap = Math.min(40, 1100 / Math.max(1, tot));
      for (const k in who) {
        const i = +k, g = mkMarble(who[i]), [x, z] = U.pt(i); g.userData.by = Y(i); g.position.set(x, TOP + Y(i), z); pcs[i] = g;
        if (intro) { g.visible = false; const d = 60 + (n++) * gap; later(() => { g.visible = true; anim(260, q => lift(g, (1 - q) * (1 - q) * 1.4), () => { lift(g, 0); land(g); if (n < 12 || Math.random() < .3) SFX.clack(); }); }, d); }
      }
      gone.forEach((i0, k) => { const v = P3.marble(i0); board.add(v); inGroove(v, k); taken.push(v); });
      kick(300);
      return intro ? 60 + n * gap + 300 : 0;
    }

    /* ---------- a jump: the marble hops over in an arc, the one jumped over rolls off into the groove ---------- */
    function select(i) { deselect(); sel = i; const g = pcs[i]; if (g) anim(130, k => lift(g, .22 * io(k))); SFX.lift(); marks(); }
    function deselect() { if (sel >= 0 && pcs[sel]) { const g = pcs[sel], h0 = g.userData.h0 || 0; if (h0 > 0) anim(120, k => lift(g, h0 * (1 - k))); } sel = -1; }
    function jump(j) {
      busy = true; jid++; const [f, o, t] = j, g = pcs[f], v = pcs[o]; sel = -1;
      delete pcs[f]; delete pcs[o]; pcs[t] = g; a = E.apply(a, j); hist.push(j); ply++; ghosts();
      while (hl.children.length) hl.remove(hl.children[0]);
      const [x0, z0] = U.pt(f), [x1, z1] = U.pt(t), h0 = g.userData.h0 || 0, y0 = Y(f), y1 = Y(t);
      anim(420, k => { const q = io(k); g.position.x = x0 + (x1 - x0) * q; g.position.z = z0 + (z1 - z0) * q; g.userData.by = y0 + (y1 - y0) * q; lift(g, Math.sin(k * Math.PI) * .95 + h0 * (1 - k)); g.rotation.z = -q * Math.PI * 1.2 * Math.sign(x1 - x0 || 1); },
        () => { g.rotation.z = 0; g.userData.by = y1; lift(g, 0); land(g); SFX.clack(); });
      if (v) later(() => {
        const [vx, vz] = U.pt(o), vy = Y(o), [gx, gy, gz] = U.groove(taken.length); taken.push(v); SFX.roll();
        const sh = v.userData.sh; if (sh) { v.remove(sh); sh.material.dispose(); v.userData.sh = null; }
        anim(620, k => { const q = io(k); v.position.x = vx + (gx - vx) * q; v.position.z = vz + (gz - vz) * q; v.position.y = TOP + vy + (gy - P3.R * .78 - TOP - vy) * q + Math.sin(k * Math.PI) * (.45 + vy * .3); const s = 1 - .15 * q; v.scale.set(s, s, s); v.rotation.x = q * 6; });
      }, 260);
      hud(); later(after, 520);
    }
    function after() {
      if (PZ) {   // a puzzle: its flow decides (and calls wait())
        const over0 = !E.moves(B, a).length, left = count(), last = hist[hist.length - 1];
        if (over0) { over = true; marks(); }
        if (pzRes) { const r = pzRes; pzRes = null; r(true); }
        if (pzOwn) { pzOwn = false; PZ.moved(last[0] + '.' + last[2], { over: over0, left, onGoal: left === 1 && (goal < 0 || !!a[goal]) }); }
        return;
      }
      busy = false;
      if (E.moves(B, a).length) { marks(); hud(); turn(); return; }
      // no jump left: the game is over
      over = true; marks(); turn();
      const left = count(), perfect = left === 1 && goal >= 0 && !!a[goal];
      // the best record (the same store as the 2D page: 'aicoding-peg' recs['<board>:<start hole>'] = { best, perfect }, 2026-11-13)
      let rec = null, nb = false;
      try { const d = JSON.parse(localStorage.getItem('aicoding-peg') || '{}') || {}, R = d.recs = d.recs || {}, k = bid + ':' + E.startHole(bid), r = R[k] || {};
        nb = r.best === undefined || left < r.best || (left === r.best && perfect && !r.perfect);
        const day = (d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'))(new Date());
        if (nb) R[k] = { best: left, perfect: perfect || !!r.perfect, date: day }; else if (perfect && !r.perfect) R[k].date = day; else if (perfect) R[k].perfect = true;
        localStorage.setItem('aicoding-peg', JSON.stringify(d)); rec = R[k]; } catch (e) {}
      // goals & rewards (2026-11-14, a game without hints): 3 or fewer left · one left · one on ◎ — kept per board for the awards
      // (shared/atlas.js: coins), and each gives an Atlamo once: the flat boards Princess Soubise's N / R / SR, the pyramid Kepler's
      // (atlas/npc/roster.js BOSSES.peg). The portal adds res.grant to the wallet after its own save of the game.
      let gl = null; const grant = [];
      if (!hinted) try {
        const d = JSON.parse(localStorage.getItem('aicoding-peg') || '{}') || {}, G = d.goal = d.goal || {}, r = G[bid] || {};
        gl = G[bid] = { b: Math.min(r.b === undefined ? 99 : r.b, left), pf: !!r.pf || perfect };
        localStorage.setItem('aicoding-peg', JSON.stringify(d));
        const W = window.Atlas && Atlas.load ? Atlas.load() : null, bi = bid === 'pyramid' ? 2 : 1;
        [left <= 3, left === 1, perfect].forEach((ok, t) => { const id = `av-boss-peg-${bi}-${t}`; if (ok && W && !(W.owned || []).includes(id)) grant.push(id); });
      } catch (e) {}
      const BL = BEST[lang] || BEST.en, bestTx = rec ? (nb && hist.length ? '🏅 ' + tx('res.best') + ' · ' : '') + BL + ': ' + tx('res.left', { n: rec.best }) + (rec.perfect ? ' · 👑 ' + tx('rec.perfect') : '') : '';
      const title = left === 1 ? (perfect ? tx('res.perfect') : tx('res.one')) : left === 2 ? tx('res.two') : left === 3 ? tx('res.three') : left <= 5 ? tx('res.five') : tx('res.many');
      const score = tx('res.left', { n: left }) + (left === 1 && !perfect && goal >= 0 ? ' · ' + tx('res.goalHint') : '');
      hud(left === 1 ? tx('st.done1') : tx('st.done', { n: left }));
      if (left === 1) Object.values(pcs).forEach(g => anim(700, k => lift(g, Math.sin(k * Math.PI) * .7)));
      const ck = ok => ok ? ' ✓' : ' —', goalTx = gl ? '🎯 ' + tx('rw.g3') + ck(gl.b <= 3) + ' · ' + tx('rw.g1') + ck(gl.b === 1) + ' · ' + tx('rw.pf') + ck(gl.pf) : hinted ? '🎯 ' + tx('rw.hint') : '';
      later(() => {
        ctx.onEnd({ win: left === 1, draw: false, solo: true, level: 0, title: (perfect ? '👑 ' : '') + title, score, best: bestTx, goal: goalTx, opp: tx('bd.' + bid), key: bid, why: title + ' · ' + tx('res.left', { n: left }), left, perfect, grant });
        if (grant.length) later(() => rewardCard(grant), 900);
      }, 700);
    }

    /* ---------- input: a marble, then the hole it lands in ---------- */
    // the hole under the pointer. The flat boards: the nearest hole on the board's face. The pyramid: the ray through the pointer
    // against every hole (its marble, or the cup), the nearest to the eye winning; holes a chosen marble can jump to come first.
    function cellOf(e, prefer) {
      if (!(U && U.pyr)) {
        const p = T3.pick(e, TOP); if (!p) return -1;
        let best = -1, bd = .5; for (let i = 0; i < B.n; i++) { const [x, z] = U.pt(i), d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = i; } }
        return best;
      }
      const p0 = toB(T3.pick(e, TOP)), p1 = toB(T3.pick(e, TOP + 3)); if (!p0 || !p1) return -1;
      const ax = p0.x, ay = TOP, az = p0.z, dx = p1.x - p0.x, dy = 3, dz = p1.z - p0.z, dl = Math.hypot(dx, dy, dz);
      const hit = (i, r) => {   // → [distance from the ray, height on the ray] or null
        const [x, z] = U.pt(i), y = TOP + Y(i) + (a[i] ? P3.R * .7 : .05), wx = x - ax, wy = y - ay, wz = z - az, t = (wx * dx + wy * dy + wz * dz) / (dl * dl);
        const d = Math.hypot(wx - dx * t, wy - dy * t, wz - dz * t); return d < r ? [d, ay + dy * t] : null;
      };
      if (prefer && prefer.length) {   // (the holes a chosen marble can reach: the nearest to the ray; the marbles that can jump: the nearest to the eye)
        let best = -1, bs = -1e9; prefer.forEach(i => { const h = hit(i, .42), sc = h && (a[i] ? h[1] - h[0] * .5 : -h[0]); if (h && sc > bs) { bs = sc; best = i; } }); if (best >= 0) return best;
      }
      // (behind: the movable marbles under the pointer, nearest to the eye first — a second tap on the chosen one takes the next)
      const all = []; for (let i = 0; i < B.n; i++) { const h = hit(i, a[i] ? .36 : .3); if (h) all.push([i, h[1] - h[0] * .5]); }
      all.sort((p, q) => q[1] - p[1]); behind = all.map(x => x[0]).filter(i => a[i]);
      return all.length ? all[0][0] : -1;
    }
    // the pyramid turns on the table (drag sideways): the pointer's points come in the table's frame, the holes are in the board's
    let behind = [], spinA = 0, drag = null, dragT = 0;
    const toB = p => { if (!p) return null; const c = Math.cos(spinA), s = Math.sin(spinA); return { x: p.x * c - p.z * s, z: p.x * s + p.z * c }; };
    const fromB = (x, z) => { const c = Math.cos(spinA), s = Math.sin(spinA); return [x * c + z * s, -x * s + z * c]; };
    function onDown(e) { if (!(U && U.pyr) || (e.pointerType === 'mouse' && e.button)) return; drag = { x: e.clientX, a: spinA, moved: false }; }
    function onMove(e) {
      if (!drag) return; const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 9) drag.moved = true;
      if (drag.moved) { spinA = drag.a + dx * .009; board.rotation.y = spinA; kick(120); }
    }
    function onUp() { if (drag && drag.moved) dragT = performance.now(); drag = null; }
    ctx.el.addEventListener('pointerdown', onDown); addEventListener('pointermove', onMove); addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp);
    function onClick(e) {
      if (busy || over || !E || (T3.wasDrag && T3.wasDrag()) || performance.now() - dragT < 250) return;
      const ms = E.moves(B, a), i = cellOf(e, sel >= 0 ? ms.filter(j => j[0] === sel).map(j => j[2]) : ms.map(j => j[0])); if (i < 0) { if (sel >= 0) { deselect(); marks(); } return; }
      if (a[i]) {
        if (sel === i) {   // (the pyramid: a marble hidden behind the chosen one, when there is one that can jump)
          const nx = U.pyr ? behind.filter(k => k !== i && ms.some(j => j[0] === k)) : [];
          if (nx.length) { select(nx[0]); return; }
          deselect(); marks(); return;
        }
        if (!E.moves(B, a).some(j => j[0] === i)) { SFX.nope(); toast(tx('msg.stuck')); return; }
        select(i); return;
      }
      if (sel < 0) return;
      const j = E.moves(B, a).find(m => m[0] === sel && m[2] === i);
      if (!j) { SFX.nope(); deselect(); marks(); return; }
      if (PZ) pzOwn = true;
      jump(j);
    }
    ctx.el.addEventListener('click', onClick);

    /* ---------- the hint: the page's solver in a worker (the same file) ---------- */
    function solve() {
      return new Promise(res => {
        try { if (!worker) worker = new Worker(ENG); } catch (e) { worker = null; }
        if (!worker) { res(E.findPath(B, a, { target: goal, time: 3000 })); return; }
        const id = ++jid; const on = e => { if (e.data.id !== id) return; worker.removeEventListener('message', on); res(e.data); };
        worker.addEventListener('message', on); worker.postMessage({ id, board: bid, pegs: a, target: goal, time: 6000 });
      });
    }

    /* ---------- set up ---------- */
    function frame() {   // the camera: the whole board (the pyramid: a lower look, its height in view)
      if (!T3.fit) return; const tall = innerHeight > innerWidth * 1.15, h = U.tall || 0;
      if (U.pyr) T3.fit(tall ? { w: U.W - .3, d: U.H, y: TOP + h * .35, pitch: .74 } : { w: U.W + .2, d: U.H + .6, y: TOP + h * .35, pitch: .8 });
      else T3.fit(tall ? { w: U.W + .6, d: U.H + 1.6, y: TOP + .3, pitch: 1.0 } : { w: U.W + .4, d: U.H + 1.0, y: TOP + .3, pitch: 1.0 });
    }
    function setup(e) {
      if (stopped) return; E = e; B = E.BOARDS[bid];
      board = P3.board(bid); U = board.userData; TOP = U.top; board.add(hl);
      T3.show('peg', board);
      frame();
      if (PZ) { pzSet(PZ.cells, true); return; }
      const s = E.startHole(bid); a0 = E.startPos(B, s); a = a0.slice(); goal = E.goalHole(bid);
      hud(); const ms = rebuild(true);
      later(() => { busy = false; marks(); turn(); }, ms);
    }
    /* ---------- puzzle mode (ctx.pz) ---------- */
    let pzOwn = false, pzRes = null;
    function pzSet(cells, first) {   // a puzzle's position (a new board when the puzzle is on another one)
      const q = pzParse(cells);
      timers.forEach(clearTimeout); timers.length = 0; jid++; sel = -1; over = false; busy = true; hist = []; pzOwn = false;
      if (q.b !== bid || !board) {
        if (board) { board.remove(hl); }
        bid = q.b; B = E.BOARDS[bid]; board = P3.board(bid); spinA = 0; U = board.userData; TOP = U.top; board.add(hl); T3.show('peg', board);
        frame();
      }
      a0 = q.p.split('').map(Number); if (a0.length !== B.n) a0 = E.startPos(B, E.startHole(bid)); a = a0.slice(); goal = q.t;
      const ms = rebuild(true);
      later(() => { marks(); if (PZ.ready) PZ.ready(); }, ms + 100);
    }
    const jOf = u => { const [f, t] = String(u || '').split('.').map(Number); return E && B ? E.moves(B, a).find(j => j[0] === f && j[2] === t) || null : null; };
    const pz = {
      load: cells => { if (!E) { PZ.cells = cells; return; } pzSet(cells); },
      wait: () => { busy = false; marks(); },
      play: u => new Promise(res => { const j = jOf(u); if (!j) return res(false); pzRes = res; deselect(); jump(j); }),
      moves: () => hist.map(j => j[0] + '.' + j[2]),
      undo(n = 1) { timers.forEach(clearTimeout); timers.length = 0; jid++; sel = -1; hist.splice(Math.max(0, hist.length - n)); over = false; a = a0.slice(); hist.forEach(j => { a = E.apply(a, j); }); rebuild(false); marks(); },
      mark(u) { if (!u) { marks(); return; } const j = jOf(u); if (j) marks(j); },
      best: () => solve().then(r => r && r.ok && r.path && r.path.length ? r.path[0][0] + '.' + r.path[0][2] : null),
      state: () => ({ left: a ? count() : 0, over, onGoal: a && count() === 1 && (goal < 0 || !!a[goal]) }),
    };

    // (the engine is normally loaded with this file: set up at once, so the camera framing comes before the portal's play())
    if (window.PegEngine) setup(window.PegEngine);
    else loadEngine().then(setup).catch(() => { hud('⚠ ' + tx('msg.loadfail')); });

    const api = {
      human: 0, noResign: true, pz,
      canUndo: () => !busy && !!hist.length,
      undo() { if (!api.canUndo()) return; jid++; sel = -1; hist.pop(); ply++; over = false; a = a0.slice(); hist.forEach(j => { a = E.apply(a, j); }); rebuild(false); marks(); hud(); turn(); },
      canHint: () => !busy && !over && !!E,
      hint() {
        if (!api.canHint()) return Promise.resolve(false);
        const n0 = hist.length; deselect();
        if (!hinted && !PZ) { hinted = true; toast(tx('rw.hint'), 3000); }   // (a game with hints: no goals, no rewards)
        return solve().then(r => {
          if (stopped || over || hist.length !== n0) return true;
          if (r && r.ok && r.path && r.path.length) { marks(r.path[0]); return true; }
          toast(r && r.sure ? tx('msg.dead') : tx('msg.unknown'), 3600); return true;
        });
      },
      canDraw: () => false,
      canResign: () => false,
      resign() {},
      timeout() {},
      stop() {
        stopped = true; jid++;
        timers.forEach(clearTimeout); clearTimeout(toastT); if (toastEl) toastEl.remove();
        ctx.el.removeEventListener('click', onClick); ctx.el.removeEventListener('pointerdown', onDown); removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onUp);
        if (worker) worker.terminate(); worker = null;
        clearInterval(hueT); if (ghost) { ghost.geometry.dispose(); if (ghost.material.map) ghost.material.map.dispose(); ghost.material.dispose(); }
        Object.values(MAT).forEach(m => m.dispose()); Object.values(GEO).forEach(g => g.dispose());
        if (window.__pgPlay === dbg) delete window.__pgPlay;
      },
    };
    const dbg = { state: () => ({ a, hist: hist.length, over, busy, sel, left: a ? count() : 0 }), at: i => { const [x, z] = fromB(...U.pt(i)); return T3.project ? T3.project(x, z, TOP + Y(i) + (a[i] ? P3.R * .7 : .05)) : null; }, spin: r => { spinA = r; board.rotation.y = r; kick(200); }, moves: () => E.moves(B, a), board: () => B, play: j => jump(j), own: j => { if (PZ) pzOwn = true; jump(j); } };
    window.__pgPlay = dbg; api._debug = dbg;
    return api;
  }

  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.peg = {
    levels: 0, solo: true, table: false, sizes: [1, 2, 3, 4, 5, 6], size0: 1,
    sizeLabel: () => '',   // (no 「盤」 caption before the board tabs, 2026-11-13)
    sizeName: (z, lang) => PT('bd.' + IDS[z - 1], lang) || IDS[z - 1],
    start,
  };
})();
