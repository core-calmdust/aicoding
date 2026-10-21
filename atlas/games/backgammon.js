/* =====================================================================
   Backgammon on the portal.
   • The board card (levels, modes). フル機能 opens the full game with the portal
     skin (backgammon/?skin=atlas); level names / descriptions come from the game
     (backgammon/i18n.js 'lv' / 'lvd'). Who starts is decided by the opening roll,
     so there is no side to pick (ctx.side 2 = play the second colour); no rated mode.
   • ちゃぶ台で遊ぶ (table: true): a single game vs the AI on the 3D chabudai, with
     the game's own rules (../backgammon/bg.js) and AI worker (../backgammon/engine.js:
     the same nets, bear-off database and level 1..10 search as the full game).
     The tour's board, checkers and dice (atlas/models/backgammon.js) are used;
     board look and checker colours follow the game's saved settings. No doubling
     cube in table play. Rendering is on demand (Table3D.kick while animating).
   ===================================================================== */
(function () {
  'use strict';
  /* ================= table play (ちゃぶ台で遊ぶ) ================= */
  const BASE = '../backgammon/', BV = '20261021op';   // same files (and cache keys) as the full game
  let bgLoad = null;
  function loadBG() {   // the game's rules on the main thread (legal moves, pips, winner) — window.BG
    if (window.BG && window.BG.genPlays) return Promise.resolve();
    return bgLoad || (bgLoad = new Promise((res, rej) => { const s = document.createElement('script'); s.src = BASE + 'bg.js?v=' + BV; s.onload = res; s.onerror = rej; document.head.appendChild(s); }));
  }
  const TX = {
    ja: { roll: 'サイコロを振る', undo: '戻す', ok: '確定', tapCk: '光る駒をタップ', tapDest: '行き先をタップ', noMove: '動かせる駒がありません', aiNoMove: 'AIは動けません', youFirst: 'あなたが先攻！', aiFirst: 'AIが先攻', k1: 'シングル（1点）', k2: 'ギャモン（2点）', k3: 'バックギャモン（3点）' },
    en: { roll: 'Roll', undo: 'Undo', ok: 'Done', tapCk: 'Tap a glowing checker', tapDest: 'Tap where to go', noMove: 'No legal move', aiNoMove: 'AI cannot move', youFirst: 'You go first!', aiFirst: 'AI goes first', k1: 'Single (1 pt)', k2: 'Gammon (2 pts)', k3: 'Backgammon (3 pts)' },
    zh: { roll: '掷骰子', undo: '撤销', ok: '确定', tapCk: '点击发光的棋子', tapDest: '点击目的地', noMove: '没有可走的棋', aiNoMove: 'AI无法移动', youFirst: '你先走！', aiFirst: 'AI先走', k1: '单赢（1分）', k2: '全胜（2分）', k3: '完胜（3分）' },
    ko: { roll: '주사위 굴리기', undo: '되돌리기', ok: '확정', tapCk: '빛나는 말을 탭', tapDest: '갈 곳을 탭', noMove: '움직일 수 있는 말이 없어요', aiNoMove: 'AI가 움직일 수 없어요', youFirst: '내가 먼저!', aiFirst: 'AI가 먼저', k1: '싱글 (1점)', k2: '개먼 (2점)', k3: '백개먼 (3점)' },
    es: { roll: 'Tirar', undo: 'Deshacer', ok: 'Listo', tapCk: 'Toca una ficha brillante', tapDest: 'Toca el destino', noMove: 'Sin movimientos', aiNoMove: 'La IA no puede mover', youFirst: '¡Empiezas tú!', aiFirst: 'Empieza la IA', k1: 'Simple (1 pt)', k2: 'Gammon (2 pts)', k3: 'Backgammon (3 pts)' },
    fr: { roll: 'Lancer', undo: 'Annuler', ok: 'Valider', tapCk: 'Touchez un pion lumineux', tapDest: 'Touchez la destination', noMove: 'Aucun coup possible', aiNoMove: 'L’IA ne peut pas jouer', youFirst: 'Vous commencez !', aiFirst: 'L’IA commence', k1: 'Simple (1 pt)', k2: 'Gammon (2 pts)', k3: 'Backgammon (3 pts)' },
    pt: { roll: 'Rolar', undo: 'Desfazer', ok: 'Pronto', tapCk: 'Toque numa peça brilhante', tapDest: 'Toque no destino', noMove: 'Nenhum lance possível', aiNoMove: 'A IA não pode mover', youFirst: 'Você começa!', aiFirst: 'A IA começa', k1: 'Simples (1 pt)', k2: 'Gammon (2 pts)', k3: 'Backgammon (3 pts)' },
    de: { roll: 'Würfeln', undo: 'Zurück', ok: 'Fertig', tapCk: 'Leuchtenden Stein antippen', tapDest: 'Ziel antippen', noMove: 'Kein Zug möglich', aiNoMove: 'Die KI kann nicht ziehen', youFirst: 'Du beginnst!', aiFirst: 'Die KI beginnt', k1: 'Einfach (1 Pkt.)', k2: 'Gammon (2 Pkt.)', k3: 'Backgammon (3 Pkt.)' },
    hi: { roll: 'पासा फेंकें', undo: 'वापस', ok: 'पक्का', tapCk: 'चमकती गोटी छुएँ', tapDest: 'जगह छुएँ', noMove: 'कोई चाल नहीं', aiNoMove: 'AI चल नहीं सकता', youFirst: 'आप पहले!', aiFirst: 'AI पहले', k1: 'सिंगल (1 अंक)', k2: 'गैमन (2 अंक)', k3: 'बैकगैमन (3 अंक)' },
    ar: { roll: 'ارمِ النرد', undo: 'تراجع', ok: 'تأكيد', tapCk: 'المس قطعة مضيئة', tapDest: 'المس الوجهة', noMove: 'لا توجد نقلة', aiNoMove: 'الذكاء لا يستطيع التحرك', youFirst: 'أنت تبدأ!', aiFirst: 'الذكاء يبدأ', k1: 'فوز عادي (1)', k2: 'غامون (2)', k3: 'باكغامون (3)' },
  };
  const DOT = { gold: 'radial-gradient(circle,#e9dfc8 52%,#d8b25e 56%)', black: 'radial-gradient(circle,#1c1c1f 52%,#d6d8dc 56%)', white: 'radial-gradient(circle,#f5f2ea 52%,#c9ccd2 56%)', red: 'radial-gradient(circle,#a8141d 52%,#d8b25e 56%)' };
  const NOSFX = { tok() {}, rattle() {}, blip() {}, chime() {} };

  function tableStart(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, M3 = T3.backgammon, t = ctx.t;
    const L = Object.assign({}, TX.en, TX[ctx.lang] || {}, { you: t('p.you'), ai: t('p.ai'), turn: t('p.turn'), think: t('p.think'), win: t('res.win'), lose: t('res.lose') });
    const SFX = (window.AtlasRules && AtlasRules.backgammon && AtlasRules.backgammon.SFX) || NOSFX;
    const level = Math.max(1, Math.min(10, +ctx.level || 6));
    // the game's saved look and checker colours (backgammon/app.js settings, the skin's board-design choice)
    let look = 'marq', ck = ['gold', 'black'];
    try {
      const v = localStorage.getItem('atlas-bg-look'), st = (JSON.parse(localStorage.getItem('aicoding-backgammon-v2') || '{}') || {}).settings || {};
      look = v === 'scarlet' ? 'scarlet' : v === 'marq' ? 'marq' : st.skin === 'scarlet' ? 'scarlet' : 'marq';
      if (st.ck && M3.CKL[st.ck[0]] && M3.CKL[st.ck[1]] && st.ck[0] !== st.ck[1]) ck = st.ck.slice();
    } catch (e) {}
    const CID = ctx.side === 2 ? [ck[1], ck[0]] : [ck[0], ck[1]];   // engine side 0 = you (bottom, 24 → 1), side 1 = the AI

    const board = T3.MODELS.backgammon(true, { look }); T3.show('backgammon', board); T3.play(true);
    const g = M3.geom(12), Y = board.userData.top, W2 = g.W / 2, H2 = g.H / 2, SC = .62;
    board.scale.setScalar(SC);
    const bvEl = ctx.el.parentNode;
    let turned = false;
    const FR = M3.frameOn(board, T3, { SC, Y, g, band: 64, onChange: m => { turned = m === 'turn'; if (bvEl) { bvEl.classList.toggle('land', turned); bvEl.classList.toggle('bgwide', m === 'wide'); }   // the page's UI turns with the view
      setTimeout(() => { if (!stopped) { placeLater(); T3.kick(300); } }, 0); } });   // the whole case, large; turned 90° on a portrait phone
    const marks = new TH.Group(); board.add(marks);
    let stopped = false, timers = [], cks = [], dice = [], phase = 'wait', over = false, toMove = -1, msg = '';
    let pos = null, T = null, sel = null, dests = null, worker = null, jid = 0, seed = '', stream = null, nRoll = 0, busy = false;
    const jobs = new Map();
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const sleep = ms => new Promise(r => later(r, ms));
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, (n - t0) / dur); f(k); T3.kick(120); if (k < 1) requestAnimationFrame(s); else { if (done) done(); T3.kick(200); } })(t0); };
    const animP = (dur, f) => new Promise(r => anim(dur, f, r));
    const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const locOf = (s, p) => p === 25 ? 'bar' : p === 0 ? 'off' : s ? 25 - p : p;   // engine point of side s → view location (your numbering)

    /* ---------- checkers ---------- */
    function spot(c) {   // c = { side, at: view point | 'bar' | 'off', k, n }
      if (c.at === 'bar') { const st = c.n <= 1 ? g.C : Math.min(g.C, (g.MID - g.TOP - 1.6 - g.C) / (c.n - 1)); const uy = c.side ? g.MID + 1.02 + c.k * st : g.MID - 1.02 - c.k * st; return { x: g.BX + g.B / 2 - W2, y: Y, z: uy - H2, edge: false }; }
      if (c.at === 'off') { const st = Math.min(.28, (g.MID - g.TOP - .55) / 15), uy = c.side ? g.TOP + .17 + c.k * st + .125 : g.BOT - .17 - c.k * st - .125; return { x: g.TX + g.TW / 2 - W2, y: Y + M3.CK_R, z: uy - H2, edge: true }; }
      const [x, z] = M3.stackXZ(c.at, c.k, c.n, g); return { x, y: Y, z, edge: false };
    }
    function place(c, p) { T3.kick(200); p = p || spot(c); c.m.position.set(p.x, p.y, p.z + (p.edge ? -M3.CK_H / 2 : 0)); c.m.rotation.set(p.edge ? Math.PI / 2 : 0, 0, 0); }
    function mk(side) { const m = M3.checker(CID[side]); const sh = T3.contact(.47, .45); sh.position.y = .002; sh.userData.contact = true; m.add(sh); board.add(m); return m; }
    function restack() { const grp = {}; cks.forEach(c => { const key = c.side + ':' + c.at; (grp[key] = grp[key] || []).push(c); }); Object.values(grp).forEach(a => a.forEach((c, i) => { c.k = i; c.n = a.length; })); }
    const shadow = c => c.m.children.forEach(ch => { if (ch.userData.contact) ch.visible = c.at !== 'off'; });
    function setBoard() {   // the starting position, dropped in one by one
      const P = { 24: 2, 13: 5, 8: 3, 6: 5 };
      [0, 1].forEach(side => Object.keys(P).forEach(p => { for (let i = 0; i < P[p]; i++) cks.push({ side, at: locOf(side, +p), m: mk(side) }); }));
      restack();
      cks.forEach((c, i) => { place(c); shadow(c); const y0 = c.m.position.y; c.m.visible = false; later(() => { c.m.visible = true; anim(240, k => { c.m.position.y = y0 + (1 - k) * (1 - k) * 1.2; }, () => { c.m.position.y = y0; if (i % 4 === 0) SFX.tok(.3, 1.2); }); }, 420 + i * 14); });
    }
    const topOf = (side, at) => { let r = null; cks.forEach(c => { if (c.side === side && c.at === at && (!r || c.k > r.k)) r = c; }); return r; };
    function landXZ(side, at) { const n = cks.filter(c => c.side === side && c.at === at).length, s = spot({ side, at, k: n, n: n + 1 }); return [s.x, s.z + (s.edge ? -M3.CK_H / 2 : 0)]; }
    function land(c) { anim(150, k => { const s = 1 + Math.sin(k * Math.PI) * .07; c.m.scale.set(s, 1 / s, s); }, () => c.m.scale.set(1, 1, 1)); }
    function moveTo(c, at, hopH, fast) {   // lifted, carried and set down
      return new Promise(done => {
        const p0 = c.m.position.clone(), r0 = c.m.rotation.x; c.at = at; restack();
        const s = spot(c), p1 = new TH.Vector3(s.x, s.y, s.z + (s.edge ? -M3.CK_H / 2 : 0)), d = p0.distanceTo(p1), dur = (fast ? 200 : 260) + d * (fast ? 30 : 45), lift = hopH || Math.min(1.4, .35 + d * .12);
        c.m.children.forEach(ch => { if (ch.userData.contact) ch.visible = false; });
        anim(dur, k => { const e = io(k); c.m.position.lerpVectors(p0, p1, e); c.m.position.y += Math.sin(k * Math.PI) * lift; c.m.rotation.x = r0 + ((s.edge ? Math.PI / 2 : 0) - r0) * e; },
          () => { place(c); shadow(c); SFX.tok(1, at === 'off' ? 1.3 : 1); land(c); cks.filter(o => o !== c).forEach(o => place(o)); done(); });
      });
    }
    // one die's step of side s (engine numbering); you: hop point by point, the AI: one arc. A blot there goes to the bar.
    async function stepAnim(s, from, to, hop) {
      const fl = locOf(s, from), tl = locOf(s, to), c = topOf(s, fl); if (!c) return;
      const victim = typeof tl === 'number' ? cks.find(o => o.side !== s && o.at === tl) : null;
      if (hop) {
        const P = []; for (let v = from - 1; v > Math.max(to, 0); v--) P.push(locOf(s, v));
        const hd = Math.max(90, Math.min(200, 650 / (P.length + 1)));
        for (let i = 0; i < P.length; i++) {
          const [x, z] = landXZ(s, P[i]), p0 = c.m.position.clone(), p1 = new TH.Vector3(x, Y + .3, z);
          c.m.children.forEach(ch => { if (ch.userData.contact) ch.visible = false; });
          await animP(hd, k => { c.m.position.lerpVectors(p0, p1, io(k)); c.m.position.y += Math.sin(k * Math.PI) * .4; });
          SFX.tok(.4, 1 + i * .06);
        }
        await moveTo(c, tl, .5, true);
      } else await moveTo(c, tl);
      if (victim && !stopped) { SFX.tok(.9, .8); await moveTo(victim, 'bar', 1.2); }
    }

    /* ---------- dice ---------- */
    const halfX = side => (side ? g.LX + 3 : g.RX + 3) - W2;   // you roll in the right half, the AI in the left
    function clearDice() { dice.forEach(d => board.remove(d)); dice = []; T3.kick(200); }
    function diceSpots(n, side) { const dbl = n === 4, xs = dbl ? [-1.38, -.46, .46, 1.38] : [-.55, .55]; return xs.map((x, i) => ({ x: halfX(side) + x, z: dbl ? 0 : (i ? .25 : -.2), y: Y + (dbl ? .35 : .4) })); }
    function makeDie(id, v, size, yaw) { const d = M3.die(id, size); M3.dieRot(d, v, yaw); d.userData.v = v; board.add(d); dice.push(d); return d; }
    function throwDice(specs) {   // [{id, v, x, y, z, size, dir}] — thrown in from the side, tumbling, two bounces, then at rest
      clearDice(); SFX.rattle();
      const ds = specs.map((s, i) => { const d = makeDie(s.id, s.v, s.size || .8, (i % 2 ? -.25 : .3) * (s.size < .8 ? .2 : 1)); d.position.set(s.x, s.y, s.z); return d; });
      const ends = ds.map(d => ({ p: d.position.clone(), r: d.rotation.clone() })), spin = ds.map(() => [6 + Math.random() * 4, 5 + Math.random() * 4, 3 + Math.random() * 3]);
      return animP(900, k => ds.forEach((d, i) => {
        const e = ends[i], kk = Math.min(1, k * 1.05 + i * .02), r = 1 - io(kk), hop = Math.abs(Math.sin(kk * Math.PI * 2.5)) * (1 - kk) * 1.6;
        d.position.set(e.p.x + r * 3.2 * specs[i].dir, e.p.y + hop, e.p.z + r * (i % 2 ? .8 : -.9));
        d.rotation.set(e.r.x + r * spin[i][0], e.r.y + r * spin[i][1], e.r.z + r * spin[i][2], 'YXZ');
      })).then(() => { ds.forEach((d, i) => { d.position.copy(ends[i].p); d.rotation.copy(ends[i].r); }); T3.kick(200); SFX.tok(.6, 1.8); });
    }
    function rollFor(side, v) {   // a turn's roll: two dice in the roller's colour (doubles: four)
      const vals = v[0] === v[1] ? [v[0], v[0], v[0], v[0]] : v, sp = diceSpots(vals.length, side);
      return throwDice(vals.map((x, i) => ({ id: CID[side], v: x, x: sp[i].x, y: sp[i].y, z: sp[i].z, size: vals.length === 4 ? .7 : .8, dir: side ? -1 : 1 })));
    }
    function dimDice(left) {   // used dice turn translucent
      const rest = left.slice();
      dice.forEach(d => { const i = rest.indexOf(d.userData.v), used = i < 0; if (!used) rest.splice(i, 1);
        d.traverse(o => { if (!o.isMesh) return; if (!o.userData.m0) { o.userData.m0 = o.material; o.userData.m1 = o.material.clone(); o.userData.m1.transparent = true; o.userData.m1.opacity = .3; } o.material = used ? o.userData.m1 : o.userData.m0; }); });
      T3.kick(120);
    }
    const nextRoll = () => stream.get(nRoll++);

    /* ---------- marks ---------- */
    const triGeo = (() => { const s = new TH.Shape(); s.moveTo(-.46, 0); s.lineTo(.46, 0); s.lineTo(0, g.PL); s.closePath(); return new TH.ShapeGeometry(s); })();
    const ringGeo = new TH.TorusGeometry(.33, .05, 10, 40);
    function clearMarks() { while (marks.children.length) marks.remove(marks.children[0]); T3.kick(120); }
    function glowPt(vp, color, op) {
      const top = vp >= 13, m = new TH.Mesh(triGeo, new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false, side: TH.DoubleSide }));
      m.rotation.x = -Math.PI / 2; if (top) m.rotation.z = Math.PI;
      m.position.set(M3.slotX(vp, g) - W2, Y + .006, (top ? g.TOP : g.BOT) - H2); marks.add(m); T3.kick(200); return m;
    }
    function ring(x, y, z, color) { const m = new TH.Mesh(ringGeo, new TH.MeshBasicMaterial({ color, transparent: true, opacity: .95, toneMapped: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); marks.add(m); T3.kick(200); return m; }
    function trayGlow() { const h = g.MID - g.TOP - .15, m = new TH.Mesh(new TH.PlaneGeometry(g.TW - .1, h), new TH.MeshBasicMaterial({ color: 0x2fd17a, transparent: true, opacity: .45, toneMapped: false, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(g.TX + g.TW / 2 - W2, Y + .006, g.MID + .1 + h / 2 - H2); marks.add(m); T3.kick(200); }
    const numTex = {};
    function numSprite(n) {
      if (!numTex[n]) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.beginPath(); x.arc(64, 64, 58, 0, 7); x.fill(); x.lineWidth = 9; x.strokeStyle = '#1f9d5a'; x.stroke(); x.fillStyle = '#2b3044'; x.font = '900 74px Fredoka, "Zen Maru Gothic", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(n), 64, 70); numTex[n] = new TH.CanvasTexture(c); numTex[n].encoding = TH.sRGBEncoding; }
      const sp = new TH.Sprite(new TH.SpriteMaterial({ map: numTex[n], depthTest: false, toneMapped: false })); sp.scale.set(.62, .62, 1); sp.renderOrder = 5; return sp;
    }
    function popIn(o, s1) { o.scale.set(.01, .01, .01); anim(200, k => { const s = s1 * (k < .7 ? k / .7 * 1.15 : 1.15 - (k - .7) / .3 * .15); o.scale.set(s, s, o.isSprite ? 1 : s); }); }
    let lifted = null;
    function drop() { if (!lifted) return; const c = lifted; lifted = null; if (!stopped && c.m.parent) place(c); T3.kick(120); }

    /* ---------- your turn ---------- */
    const legalNow = () => T ? BG.legalSteps(T.pos, 0, T.left, T.dice, T.steps.length) : [];
    function destsFrom(from) {   // the game's own search (backgammon/app.js destsFrom): dest → steps, shortest, most hits
      const res = new Map();
      const dfs = (q, left, used, pt, path) => {
        for (const x of BG.legalSteps(q, 0, left, T.dice, used).filter(y => y.from === pt)) {
          const r = q.slice(), code = BG.apply(r, 0, x.from, x.to), np = path.concat([{ from: x.from, to: x.to, die: x.die, hit: BG.mvHit(code) }]);
          const prev = res.get(x.to), hits = np.filter(y => y.hit).length;
          if (!prev || np.length < prev.length || (np.length === prev.length && hits > prev.filter(y => y.hit).length)) res.set(x.to, np);
          if (x.to !== 0) { const i = left.indexOf(x.die); dfs(r, left.slice(0, i).concat(left.slice(i + 1)), used + 1, x.to, np); }
        }
      };
      dfs(T.pos, T.left, T.steps.length, from, []);
      return res;
    }
    function showSources() {   // a gold ring under the top checker of every point you may move from
      drop(); clearMarks(); sel = null; dests = null;
      const srcs = [...new Set(legalNow().map(x => x.from))];
      srcs.forEach(p => { const c = topOf(0, locOf(0, p)); if (c) popIn(ring(c.m.position.x, c.m.position.y + M3.CK_H + .02, c.m.position.z, 0xffc928), 1); });
      return srcs;
    }
    function select(p) {
      showSources(); sel = p; dests = destsFrom(p);
      const c = topOf(0, locOf(0, p)); if (c) { lifted = c; const y0 = c.m.position.y; anim(160, k => { c.m.position.y = y0 + (Y + .4 - y0) * io(k); }); SFX.tok(.6, 1.6); }
      for (const [to, path] of dests) {
        const pips = path.reduce((a, s) => a + s.die, 0), at = locOf(0, to), [x, z] = landXZ(0, at);
        if (to === 0) trayGlow(); else glowPt(at, 0x2fd17a, .42);
        popIn(ring(x, Y + .03, z, path.some(s => s.hit) ? 0xff5d5d : 0x2fd17a), 1);
        const sp = numSprite(pips); sp.position.set(x, Y + .8, z); marks.add(sp); popIn(sp, .62); T3.kick(200);
      }
      say(L.tapDest);
    }
    async function doPath(path) {
      busy = true; drop(); clearMarks(); say('');
      for (const st of path) {
        if (stopped || !T) return;
        await stepAnim(0, st.from, st.to, true);
        const q = T.pos.slice(), code = BG.apply(q, 0, st.from, st.to);
        T.pos = q; T.steps.push({ code, die: st.die, from: st.from, to: st.to, hit: BG.mvHit(code) });
        T.left.splice(T.left.indexOf(st.die), 1); dimDice(T.left);
      }
      busy = false; afterStep();
    }
    function afterStep() {
      if (stopped || !T) return;
      const srcs = legalNow().length ? showSources() : (clearMarks(), []);
      if (!srcs.length) { hud(); return; }
      if (srcs.length === 1) select(srcs[0]); else say(L.tapCk);
    }
    async function undo() {
      if (!T || busy || !T.steps.length) return;
      busy = true; drop(); clearMarks(); say('');
      const st = T.steps.pop();
      const c = topOf(0, locOf(0, st.to)); if (c) await moveTo(c, locOf(0, st.from), null, true);
      if (st.hit) { const v = topOf(1, 'bar'); if (v) await moveTo(v, locOf(0, st.to), null, true); }
      const q = T.start.slice(); T.left = T.dice[0] === T.dice[1] ? [T.dice[0], T.dice[0], T.dice[0], T.dice[0]] : T.dice.slice();
      for (const s of T.steps) { BG.apply(q, 0, s.from, s.to); T.left.splice(T.left.indexOf(s.die), 1); }
      T.pos = q; dimDice(T.left); busy = false; afterStep();
    }
    function commit() {
      if (!T || busy || legalNow().length) return;
      if (!T.plays.some(x => BG.key(x.pos) === BG.key(T.pos))) return;   // safety: must be one of the legal plays
      pos = T.pos; T = null; clearMarks(); SFX.tok(.5, 1.5);
      if (!checkEnd()) aiTurn();
    }
    function beginMove(d) {
      toMove = 0; T = { dice: d, left: d[0] === d[1] ? [d[0], d[0], d[0], d[0]] : d.slice(), steps: [], pos: pos.slice(), start: pos.slice(), plays: BG.genPlays(pos, 0, d[0], d[1]) };
      if (T.plays.length === 1 && !T.plays[0].moves.length) { T = null; say(L.noMove); later(() => { dimDice([]); aiTurn(); }, 1700); return; }
      phase = 'move'; afterStep();
    }
    async function humanRoll() {
      if (phase !== 'roll' || stopped) return;
      phase = 'anim'; say('');
      const d = nextRoll(); await rollFor(0, d); if (stopped) return;
      beginMove(d);
    }

    /* ---------- the AI's turn (the game's worker, same level) ---------- */
    function ask(m) {
      if (!worker) {
        try { worker = new Worker(BASE + 'engine.js?v=' + BV); } catch (e) { worker = null; }
        if (worker) { worker.onmessage = e => { const j = jobs.get(e.data.id); if (j) { jobs.delete(e.data.id); j(e.data); } }; worker.onerror = () => { jobs.forEach(j => j({})); jobs.clear(); }; }
      }
      if (!worker) return Promise.resolve({});
      return new Promise(r => { const id = ++jid; jobs.set(id, r); worker.postMessage(Object.assign({}, m, { id })); });
    }
    async function aiTurn(d0) {
      if (stopped) return;
      toMove = 1; phase = 'ai'; say('');
      const k = nRoll, d = d0 || nextRoll();
      if (!d0) { await sleep(350); await rollFor(1, d); if (stopped) return; }
      const plays = BG.genPlays(pos, 1, d[0], d[1]);
      if (plays.length === 1 && !plays[0].moves.length) { say(L.aiNoMove); await sleep(1500); if (stopped) return; dimDice([]); return yourTurn(); }
      say(L.think);
      const t0 = Date.now();
      const r = await ask({ type: 'move', pos: Array.from(pos), side: 1, dice: d, level, tag: seed + '0:' + (d0 ? 0 : k) });
      if (stopped) return;
      let moves = r && r.moves;
      const ok = moves && plays.some(x => { const q = pos.slice(); moves.forEach(c => BG.apply(q, 1, BG.mvFrom(c), BG.mvTo(c))); return BG.key(q) === BG.key(x.pos); });
      if (!ok) moves = plays[0].moves;   // (the worker failed to load: still a legal play)
      const wait = 450 - (Date.now() - t0); if (wait > 0) await sleep(wait);
      say('');
      const left = d[0] === d[1] ? [d[0], d[0], d[0], d[0]] : d.slice();
      for (const c of moves) {
        if (stopped) return;
        const from = BG.mvFrom(c), to = BG.mvTo(c);
        await stepAnim(1, from, to, false); BG.apply(pos, 1, from, to);
        const dd = from - to, i = left.indexOf(dd) >= 0 ? left.indexOf(dd) : left.indexOf(Math.min(...left.filter(v => v > dd)));
        if (i >= 0) left.splice(i, 1); else left.pop();
        dimDice(left); hud(); await sleep(140);
      }
      if (stopped || checkEnd()) return;
      await sleep(250); yourTurn();
    }
    function yourTurn() { if (stopped) return; toMove = 0; phase = 'roll'; say(''); }

    /* ---------- the end ---------- */
    function checkEnd() {
      const w = BG.winner(pos); if (w < 0) return false;
      over = true; phase = 'over'; toMove = -1; clearMarks();
      const kind = BG.winKind(pos, w), kt = L['k' + Math.min(3, kind)];
      say((w === 0 ? L.win : L.lose) + ' · ' + kt); SFX.chime();
      ctx.onEnd({ win: w === 0, draw: false, level, score: kt });
      return true;
    }

    /* ---------- HUD: you · buttons · AI (one line); messages in a speech bubble next to it ---------- */
    const css = document.createElement('style');
    css.textContent = '.hud .bgk{width:18px;height:18px;border-radius:50%;display:inline-block;flex:none;box-shadow:0 1px 2px rgba(0,0,0,.35)}.hud .bgm{display:flex;align-items:center;gap:6px;flex:none}.hud .bgb{padding:8px 16px;font-size:15px;white-space:nowrap;box-shadow:0 3px 0 var(--coral2)}.hud .bgb.go{font-size:16px;padding:9px 20px}.hud .bgb.ghost2{background:#fff;color:var(--ink2,#555);box-shadow:0 3px 0 #d9d2bf;border:2px solid #eee4cf}'
      + '.bgbub{position:absolute;z-index:3;left:50%;transform:translateX(-50%);max-width:min(340px,calc(100% - 40px));padding:8px 16px;border-radius:16px;background:#fffdf7;border:2px solid #fff;box-shadow:0 8px 20px -10px rgba(80,40,0,.55);font-weight:900;font-size:14px;color:var(--ink2,#4a4f66);text-align:center;line-height:1.35;pointer-events:none;opacity:0;transition:opacity .2s}.bgbub.on{opacity:1}'
      + '.bgbub::after{content:"";position:absolute;left:50%;margin-left:-8px;border:8px solid transparent}.bgbub.up::after{top:100%;border-top-color:#fffdf7}.bgbub.dn::after{bottom:100%;border-bottom-color:#fffdf7}'
      // the turned page (portrait phone, board sideways): bar along the left edge, buttons in the corners, all read in landscape
      + '.bv.land .hud,.bv.playing.land .hud{top:50%;bottom:auto;left:calc(6px + env(safe-area-inset-left));right:auto;transform-origin:0 0;transform:rotate(90deg) translate(-50%,-100%);max-width:none}'
      + '.bv.land .quit{inset-inline-start:auto;inset-inline-end:auto;left:calc(100% - 12px);right:auto;top:calc(14px + env(safe-area-inset-top));transform-origin:0 0;transform:rotate(90deg)}'
      + '.bv.land .x{inset-inline-start:auto;inset-inline-end:auto;left:calc(100% - 12px);right:auto;top:calc(100% - 14px - env(safe-area-inset-bottom));transform-origin:0 0;transform:rotate(90deg) translate(-100%,0)}'
      + '.bv.land .bgbub{right:auto;bottom:auto;transform-origin:0 0;transform:rotate(90deg) translate(0,-50%)}.bgbub.lt::after{top:50%;left:auto;right:100%;margin:-8px 0 0;border-right-color:#fffdf7}'
      + '.bv.bgwide .hud,.bv.playing.bgwide .hud{top:auto;bottom:calc(6px + env(safe-area-inset-bottom));left:50%;right:auto;transform:translateX(-50%);max-width:none}.bv.bgwide .bgbub{right:auto;top:auto;transform:none}'
      + '.bv.land .endc{transform:translate(-50%,-50%) rotate(90deg);max-width:calc(100vh - 40px)}.bv.land .endc h3{white-space:nowrap}.bv.land .endc.on{animation:bgpopL .4s cubic-bezier(.3,1.5,.5,1)}@keyframes bgpopL{from{transform:translate(-50%,-50%) rotate(90deg) scale(.7);opacity:0}}'
      + '@media (max-width:560px){.hud .bgb{padding:7px 10px;font-size:13px}.hud .bgb.go{font-size:14px;padding:8px 12px}.hud .bgm{gap:5px}.bgbub{font-size:13px;padding:7px 13px}}';
    document.head.appendChild(css);
    const host = ctx.el.parentNode || document.body, bub = document.createElement('div'); bub.className = 'bgbub'; host.appendChild(bub);
    function placeBub() {   // above the bar when it sits at the bottom (phones), below it when it is at the top (PC)
      if (stopped) return;
      const h = document.getElementById('hud'); if (!h || !bub.textContent) { bub.classList.remove('on'); return; }
      const wide = bvEl && bvEl.classList.contains('bgwide');
      if (turned || wide) {   // a landscape view: on the bar's line, to its (landscape) right, the tail pointing at it
        bub.classList.remove('up', 'dn'); bub.classList.add('lt', 'on');
        const hw = h.offsetWidth, hh = h.offsetHeight, LW = turned ? host.clientHeight : host.clientWidth, x0 = LW / 2 + hw / 2 + 14;
        bub.style.maxWidth = Math.max(110, LW - x0 - 10) + 'px';
        if (turned) { bub.style.left = (6 + hh / 2) + 'px'; bub.style.top = x0 + 'px'; bub.style.bottom = ''; }
        else { bub.style.left = x0 + 'px'; bub.style.top = ''; bub.style.bottom = (6 + Math.max(0, (hh - bub.offsetHeight) / 2)) + 'px'; }
        return;
      }
      bub.classList.remove('lt'); bub.style.left = ''; bub.style.maxWidth = '';
      const t0 = h.offsetTop, hh = h.offsetHeight, H = host.clientHeight, up = t0 + hh / 2 > H / 2;   // layout box (the bar slides in with a transform)
      bub.classList.toggle('up', up); bub.classList.toggle('dn', !up);
      bub.style.top = up ? '' : (t0 + hh + 12) + 'px'; bub.style.bottom = up ? (H - t0 + 12) + 'px' : '';
      bub.classList.add('on');
    }
    const placeLater = () => { placeBub(); later(placeBub, 520); };
    addEventListener('resize', placeLater);
    function say(m) { msg = m || ''; hud(); }
    function hud() {
      if (stopped) return;
      const P = T ? T.pos : pos, pips = s => P && window.BG ? BG.pips(P, s) : 167;
      const side = s => `<span class="hs ${toMove === s ? 'on' : ''}"><i class="bgk" style="background:${DOT[CID[s]] || DOT.gold}"></i>${s ? L.ai : L.you}<b>${pips(s)}</b></span>`;
      const b = []; let m = msg;
      if (phase === 'roll') { b.push(`<button type="button" class="btn bgb go" data-bgt="roll">🎲 ${L.roll}</button>`); m = ''; }
      else if (phase === 'move' && T && !busy) {
        const done = !legalNow().length;
        if (T.steps.length) b.push(`<button type="button" class="btn bgb ghost2" data-bgt="undo">↶ ${L.undo}</button>`);
        if (done) { b.push(`<button type="button" class="btn bgb go" data-bgt="ok">✓ ${L.ok}</button>`); m = ''; }
      }
      ctx.hud(`${side(0)}${b.length ? `<span class="bgm">${b.join('')}</span>` : ''}${side(1)}`);
      if (bub.innerHTML !== m) { bub.innerHTML = m; placeLater(); } else placeBub();   // (the bar's width changes with its buttons)
    }
    function onHud(e) {
      const b = e.target.closest && e.target.closest('[data-bgt]'); if (!b || stopped) return;
      e.stopPropagation();
      const a = b.dataset.bgt;
      if (a === 'roll') humanRoll(); else if (a === 'undo') undo(); else if (a === 'ok') commit();
    }
    document.addEventListener('click', onHud, true);

    /* ---------- taps on the board ---------- */
    function hitOf(e) {   // which point / bar / tray was tapped → your engine numbering (25 bar, 0 tray)
      const p0 = T3.pick(e, Y * SC); if (!p0) return null;
      const p = FR.toBoard(p0), ux = p.x + W2, uy = p.z + H2;
      if (uy < g.TOP - .5 || uy > g.BOT + .5) return null;
      if (ux >= g.TX - .15 && ux <= g.TX + g.TW + .3) return 0;
      if (ux >= g.BX && ux < g.RX) return 25;
      const top = uy < g.MID;
      if (ux >= g.LX && ux < g.BX) { const col = Math.floor(ux - g.LX); return top ? 13 + col : 12 - col; }
      if (ux >= g.RX && ux < g.RE) { const col = Math.floor(ux - g.RX); return top ? 19 + col : 6 - col; }
      return null;
    }
    function onClick(e) {
      if (stopped || T3.wasDrag()) return;
      if (phase === 'roll') { humanRoll(); return; }   // tapping the board rolls too
      if (phase !== 'move' || busy || !T) return;
      const q = hitOf(e);
      if (sel !== null && q !== null && dests && dests.has(q)) { doPath(dests.get(q)); return; }
      const srcs = new Set(legalNow().map(x => x.from));
      if (q !== null && q !== 0 && srcs.has(q) && q !== sel) select(q);
      else if (srcs.size) { showSources(); say(L.tapCk); }
    }
    ctx.el.addEventListener('click', onClick);

    /* ---------- go ---------- */
    setBoard();
    const cube = M3.cube(64); cube.position.set(g.BX + g.B / 2 - W2, M3.FY + M3.RH + .43, 0); cube.rotation.y = .1; board.add(cube); T3.kick(400);   // decoration: no doubling in table play
    say('');
    (async () => {
      try { await loadBG(); } catch (e) { say('…'); return; }
      if (stopped) return;
      ask({ type: 'eval', pos: Array.from(BG.initial()), side: 0 });   // starts the worker now: nets + bear-off database load while you roll
      pos = BG.initial(); seed = BG.randomSeed(); stream = new BG.DiceStream(seed, 0); hud();
      await sleep(900 + 30 * 14);
      // the opening roll: one die each; the higher one starts and plays both
      const d = nextRoll();
      await throwDice([{ id: CID[0], v: d[0], x: halfX(0), y: Y + .4, z: 0, size: .8, dir: 1 }, { id: CID[1], v: d[1], x: halfX(1), y: Y + .4, z: 0, size: .8, dir: -1 }]);
      if (stopped) return;
      const s = d[0] > d[1] ? 0 : 1; toMove = s;
      say(`${s ? L.aiFirst : L.youFirst} ${d[0]}–${d[1]}`);
      await sleep(1300); if (stopped) return;
      const sp = diceSpots(2, s), p0 = dice.map(o => o.position.clone());   // both dice slide over to the starter
      await animP(380, k => dice.forEach((o, i) => { o.position.set(p0[i].x + (sp[i].x - p0[i].x) * io(k), p0[i].y + Math.sin(k * Math.PI) * .5, p0[i].z + (sp[i].z - p0[i].z) * io(k)); }));
      if (stopped) return;
      if (s === 0) { say(''); beginMove(d); } else aiTurn(d);
    })();

    const api = {
      stop() {
        stopped = true; timers.forEach(clearTimeout); timers = [];
        ctx.el.removeEventListener('click', onClick); document.removeEventListener('click', onHud, true);
        if (worker) worker.terminate(); worker = null; jobs.clear(); css.remove(); bub.remove(); if (bvEl) bvEl.classList.remove('land', 'bgwide'); removeEventListener('resize', placeLater); FR.stop();
      },
      _debug: { hit: (x, y) => hitOf({ clientX: x, clientY: y }), st: () => ({ phase, busy, toMove, over, sel, pos: pos && Array.from(pos), T: T && { left: T.left.slice(), steps: T.steps.length, legal: legalNow(), pos: Array.from(T.pos) }, dests: dests && [...dests.keys()] }),
        pt: p => { const at = locOf(0, p), c = topOf(0, at); const [x, z] = c && p !== 0 ? [c.m.position.x, c.m.position.z] : landXZ(0, at); const v = FR.toCur(x, Y, z); return T3.project(v.x, v.z, v.y); },
        dst: p => { const [x, z] = landXZ(0, locOf(0, p)); const v = FR.toCur(x, Y, z); return T3.project(v.x, v.z, v.y); } },
    };
    window.__bgTable = api;   // (tests)
    return api;
  }
  const LVN = {"ja":[["入門","初級","初級+","中級","中級+","上級","上級+","達人","名人","最強"],["でたらめに動かす","大きな見落としが多い","ときどき見落とす","少しミスをする","小さなミス","まれに小さなミス","ニューラルネットの最善手","相手の全ダイスを1手読む","2手読み","2手読み（広く深く）・キューブも最強"]],"en":[["Beginner","Novice","Novice+","Intermediate","Intermediate+","Advanced","Advanced+","Expert","Master","Strongest"],["moves at random","makes big mistakes","misses things now and then","makes some errors","small errors","rare small slips","neural-net best play","looks at every reply roll","2-ply search","wide 2-ply search, strongest cube"]],"zh":[["入门","初级","初级+","中级","中级+","高级","高级+","达人","名人","最强"],["随机走子","经常大失误","偶尔漏看","有些失误","小失误","偶有小失误","神经网络最佳着","考虑对手每种骰子","2层搜索","宽幅2层搜索・最强加倍判断"]],"ko":[["입문","초급","초급+","중급","중급+","상급","상급+","달인","명인","최강"],["무작위로 움직임","큰 실수가 많음","가끔 놓침","약간 실수함","작은 실수","드물게 작은 실수","신경망 최선수","상대의 모든 주사위를 읽음","2수 탐색","넓은 2수 탐색・최강 큐브 판단"]],"es":[["Principiante","Novato","Novato+","Intermedio","Intermedio+","Avanzado","Avanzado+","Experto","Maestro","Máximo"],["mueve al azar","comete grandes errores","a veces se le escapa algo","comete algunos errores","pequeños errores","rara vez se equivoca","mejor jugada de la red neuronal","mira todas las tiradas de respuesta","búsqueda a 2 niveles","búsqueda amplia a 2 niveles, mejor cubo"]],"fr":[["Débutant","Novice","Novice+","Intermédiaire","Intermédiaire+","Avancé","Avancé+","Expert","Maître","Maximum"],["joue au hasard","grosses erreurs","rate des choses parfois","quelques erreurs","petites erreurs","rares petites erreurs","meilleur coup du réseau neuronal","examine chaque lancer adverse","recherche à 2 niveaux","recherche large à 2 niveaux, meilleur videau"]],"pt":[["Iniciante","Novato","Novato+","Intermediário","Intermediário+","Avançado","Avançado+","Especialista","Mestre","Máximo"],["joga ao acaso","comete erros grandes","às vezes deixa passar","comete alguns erros","erros pequenos","raros erros pequenos","melhor lance da rede neural","considera cada rolagem de resposta","busca de 2 níveis","busca ampla de 2 níveis, melhor cubo"]],"de":[["Einsteiger","Anfänger","Anfänger+","Mittel","Mittel+","Fortgeschritten","Fortgeschritten+","Experte","Meister","Stärkste"],["zieht zufällig","macht grobe Fehler","übersieht manchmal etwas","macht einige Fehler","kleine Fehler","seltene kleine Fehler","bester Zug des neuronalen Netzes","prüft jeden Antwortwurf","2-Ply-Suche","breite 2-Ply-Suche, stärkster Würfel"]],"hi":[["शुरुआती","नौसिखिया","नौसिखिया+","मध्यम","मध्यम+","उन्नत","उन्नत+","विशेषज्ञ","मास्टर","सबसे मज़बूत"],["बेतरतीब चलता है","बड़ी गलतियाँ करता है","कभी-कभी चूक जाता है","कुछ गलतियाँ","छोटी गलतियाँ","कभी-कभार छोटी गलती","न्यूरल नेट की सर्वश्रेष्ठ चाल","हर जवाबी पासे को देखता है","2-स्तरीय खोज","चौड़ी 2-स्तरीय खोज, सबसे मज़बूत क्यूब"]],"ar":[["مبتدئ","مستجد","مستجد+","متوسط","متوسط+","متقدم","متقدم+","خبير","أستاذ","الأقوى"],["يتحرك عشوائيًا","يرتكب أخطاء كبيرة","يفوته شيء أحيانًا","يرتكب بعض الأخطاء","أخطاء صغيرة","أخطاء صغيرة نادرة","أفضل نقلة للشبكة العصبية","يفحص كل رمية رد","بحث بمستويين","بحث واسع بمستويين وأقوى قرار مكعب"]]};
  const W = (a, b, c, d, e) => [a, a, b, b, c, c, d, d, e, e];
  const WHO = {
    ja: W('はじめての人に', 'ルールを覚えた人に', '少し慣れてきた人に', '上級者に', '最強レベル'),
    en: W('for first-timers', 'once you know the rules', 'getting the hang of it', 'for strong players', 'the very strongest'),
    zh: W('适合初次玩', '适合学会规则的人', '适合渐渐上手', '适合高手', '最强等级'),
    ko: W('처음 하는 사람에게', '규칙을 익힌 사람에게', '조금 익숙해진 사람에게', '상급자에게', '최강 레벨'),
    es: W('para principiantes', 'si ya sabes las reglas', 'si ya le vas pillando el truco', 'para jugadores fuertes', 'el más fuerte'),
    fr: W('pour débuter', 'si tu connais les règles', 'si tu prends le coup de main', 'pour les bons joueurs', 'le plus fort'),
    pt: W('para iniciantes', 'para quem já sabe as regras', 'para quem está pegando o jeito', 'para jogadores fortes', 'o mais forte'),
    de: W('für Einsteiger', 'wenn du die Regeln kennst', 'wenn du den Dreh raus hast', 'für starke Spieler', 'die stärkste Stufe'),
    hi: W('पहली बार खेलने वालों के लिए', 'नियम सीख चुके लोगों के लिए', 'जिन्हें आदत हो रही है उनके लिए', 'मज़बूत खिलाड़ियों के लिए', 'सबसे मज़बूत स्तर'),
    ar: W('لمن يلعب أول مرة', 'لمن تعلّم القواعد', 'لمن بدأ يعتاد اللعب', 'للاعبين الأقوياء', 'أقوى مستوى'),
  };
  function levelInfo(n, lang) {   // n = 1..10 (the game's level)
    const L = LVN[lang] || LVN.en, Wh = WHO[lang] || WHO.en;
    return { name: L[0][n - 1], desc: L[1][n - 1], who: Wh[n - 1] };
  }
  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.backgammon = { levels: 10, sides: false, modes: ['ai', 'pvp'], table: true, tableModes: ['ai'], levelInfo, start: tableStart };   // table: start() plays on the chabudai itself
})();
