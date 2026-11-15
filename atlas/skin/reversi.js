/* =====================================================================
   Reversi — portal skin (reversi/?skin=atlas)
   The full Reversi V4 page keeps all of its features (AI, lessons, openings,
   puzzles, daily, rated, review, online play with the 2D version, chat…).
   This file only:
     • draws the board with the 3D table, the camera aligned to the DOM board
       (the DOM board stays on top, transparent, for clicks / hints / marks)
     • mirrors every disc change (setDisc) into 3D discs with real flips
     • turns lesson / puzzle text into the guide character's speech bubbles
   ===================================================================== */
(function () {
  'use strict';
  const THREE = window.THREE, T3 = window.Table3D;
  if (!THREE || !T3 || !window.AtlasSkin || typeof window.setDisc !== 'function') return;
  document.documentElement.classList.add('atlas-reversi');
  const boardDom = document.getElementById('board');
  const board = T3.MODELS.reversi(true), S = board.userData.S, Y = board.userData.top;
  const skin = AtlasSkin.init({
    hold: true,   // 盤面反転: the 3D stones keep the board's own places — the table stays turned round while flipped
    margin: 0.16,   // canvas margin around the board (less = fewer pixels to draw; enough for the bezel and its shadow)
    board: boardDom,
    pc: { vars: ['--board'] },   // PC: board + info column laid out from the 3D frame (AtlasSkin pcFit)
    outer: r => { const H = r.height * (S + 1.1) / S; return { top: r.top + r.height / 2 - H / 2, height: H }; },   // bezel to bezel
    guide: '../images/atlas/g-disc.webp', guideFallback: '../images/atlas/reversi.webp',
    bubbles: [['lsPrompt', 'lsFb'], ['pzGoal', 'pzStatus']],
    start(lv, side, mode) {
      if (typeof openNew !== 'function' || typeof draft !== 'object' || !document.getElementById('btnStart')) return null;
      // the portal: straight to the puzzles / lessons / online match search (reversi/index.html AtlasDeep, 2026-11-12)
      if (/^(puzzle|lesson|online)$/.test(mode)) { if (!window.AtlasDeep) return null; const q = new URLSearchParams(location.search); return AtlasDeep(mode, q.get('sub'), q.get('tc')); }
      openNew(); draft.mode = mode === 'rated' || mode === 'pvp' ? mode : 'ai';
      if (lv >= 1 && lv <= 20) draft.level = lv;
      if (side === 1 || side === 2) draft.color = side;
      segSync(); document.getElementById('btnStart').click();
      return true;
    },
  });
  if (!skin) return;
  T3.show('reversi', board, { still: true });
  skin.alignTo(S, Y);
  // デザイン: the game's own 2D boards (shown as the plain 2D page), and under them 「3D盤」 (six boards) / 「3D石」 (six disc sets)
  const V = skin.view ? skin.view({ key: 'atlas-reversi-view', cls: ['atlas-reversi'] }) : null;

  /* ---------- 3D discs mirrored from the page's setDisc() ---------- */
  let RM = T3.rvMats();
  const DH = T3.rvDisc.H / 2;   // the disc's half thickness (its centre sits DH above the felt)
  const pos = sq => [T3.cellPos(8, S, sq & 7), T3.cellPos(8, S, sq >> 3)];
  const discs = {};
  const anim = (dur, f, done) => { T3.kick(dur + 200); const t0 = performance.now(); (function s(n) { const k = Math.min(1, (n - t0) / dur); f(k); if (k < 1) { T3.kick(150); requestAnimationFrame(s); } else { T3.kick(150); if (done) done(); } })(t0); };
  function make(sq, color) {
    const inner = new THREE.Group(); inner.add(T3.rvDisc(RM)); const outer = new THREE.Group(); outer.add(inner); const ao = T3.contact(.42); ao.position.y = -DH + .002; outer.add(ao);
    const [x, z] = pos(sq); outer.position.set(x, Y + DH, z); inner.rotation.x = color === 1 ? Math.PI : 0;
    board.add(outer); return (discs[sq] = { outer, inner, color });
  }
  function mirror(s, color, a) {
    const d = discs[s];
    if (!color) { if (d) { board.remove(d.outer); delete discs[s]; T3.kick(200); } return; }
    if (!d) { T3.kick(400); const n = make(s, color); if (a === 'drop') anim(260, k => { n.outer.position.y = Y + DH + (1 - k) * (1 - k) * 2.2; }); return; }
    if (d.color === color) return;
    d.color = color;
    const from = d.inner.rotation.x, to = color === 1 ? Math.PI : 0;
    if (typeof a === 'number' && a >= 0) setTimeout(() => anim(380, k => { const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; d.inner.rotation.x = from + (to - from) * e; d.outer.position.y = Y + DH + Math.sin(k * Math.PI) * .7; }), a);
    else d.inner.rotation.x = to;
    T3.kick(300);
  }
  const orig = window.setDisc;
  window.setDisc = function (s, color, a) { orig(s, color, a); try { mirror(s, color, a); } catch (e) {} };
  try { const c = window.positions && window.positions[window.cur] && window.positions[window.cur].cells; if (c) for (let s = 0; s < 64; s++) if (c[s]) mirror(s, c[s], false); } catch (e) {}
  // the page script may have drawn discs before we hooked in: sync from the DOM too
  document.querySelectorAll('#board .cell').forEach((cell, s) => { const w = cell.querySelector('.disc'); if (w && !discs[s]) mirror(s, w.classList.contains('white') ? 2 : 1, false); });

  /* ---------- the new-game dialog: 「3D盤」 and 「3D石」 under the 2D boards (as checkers, 2026-11-15) ---------- */
  function redisc() {   // a new disc set: every disc made again, in place
    RM = T3.rvMats();
    for (const s in discs) { const d = discs[s]; board.remove(d.outer); delete discs[s]; make(+s, d.color); }
    T3.kick(400);
  }
  const T3L = { ja: '3D盤', en: '3D boards', zh: '3D棋盘', ko: '3D 판', es: 'Tableros 3D', fr: 'Plateaux 3D', pt: 'Tabuleiros 3D', de: '3D-Bretter', hi: '3D बोर्ड', ar: 'رقع ثلاثية الأبعاد', ru: '3D-доски', 'zh-TW': '3D棋盤', id: 'Papan 3D', tr: '3D tahtalar' };
  const P3L = { ja: '3D石', en: '3D discs', zh: '3D棋子', ko: '3D 돌', es: 'Fichas 3D', fr: 'Pions 3D', pt: 'Peças 3D', de: '3D-Steine', hi: '3D गोटियाँ', ar: 'أقراص ثلاثية الأبعاد', ru: '3D-фишки', 'zh-TW': '3D棋子', id: 'Keping 3D', tr: '3D pullar' };
  const lng = () => (l => /^zh-(tw|hk|mo|hant)/i.test(l) ? 'zh-TW' : String(l).slice(0, 2))((document.getElementById('langSel') || {}).value || (typeof LANG !== 'undefined' ? LANG : 'ja'));
  const is3 = () => !V || V.is3d();
  let f3 = null;
  function setLook(k) {
    if (T3.setBoard) T3.setBoard('reversi', k); else T3.BOARDS.reversi.set(k);
    if (V && !V.is3d()) V.set(true);
    if (board.userData.setLook) board.userData.setLook(k);
    paint3();
  }
  function setSet(k) {
    if (T3.setPieces) T3.setPieces('reversi', k); else T3.PIECES.reversi.set(k);
    if (V && !V.is3d()) V.set(true);
    redisc(); paint3();
  }
  function paint3() {
    const B = T3.BOARDS.reversi, P = T3.PIECES.reversi; if (!f3 || !B || !P) return;
    const l = lng(), cur = B.get(), on = is3(), cs = P.get();
    const [lb, lp] = f3.querySelectorAll('label'); lb.textContent = T3L[l] || T3L.en; lp.textContent = P3L[l] || P3L.en;
    const [row, prow] = f3.querySelectorAll('.bdrow');
    const tile = (src, fn) => { const bt = document.createElement('button'); bt.type = 'button'; const im = document.createElement('img'); im.src = src; im.alt = ''; im.draggable = false; bt.append(im, document.createElement('span')); bt.onclick = fn; return bt; };
    if (!row.children.length) B.list.forEach(k => { const bt = tile(T3.boardIcon('reversi', k), () => setLook(k)); bt.dataset.look = k; row.appendChild(bt); });
    if (!prow.children.length) P.list.forEach(k => { const bt = tile(P.thumb(k), () => setSet(k)); bt.dataset.set = k; prow.appendChild(bt); });
    row.querySelectorAll('button').forEach(bt => { const k = bt.dataset.look, sel = on && cur === k; bt.querySelector('span').textContent = T3.boardName(k, l, 'reversi'); bt.classList.toggle('sel', sel); bt.setAttribute('aria-pressed', String(sel)); });
    prow.querySelectorAll('button').forEach(bt => { const k = bt.dataset.set, sel = on && cs === k; bt.querySelector('span').textContent = T3.pieceName('reversi', k, l); bt.classList.toggle('sel', sel); bt.setAttribute('aria-pressed', String(sel)); });
    const r2 = document.getElementById('bdRow');
    if (r2 && on) r2.querySelectorAll('button').forEach(b => { if (b.classList.contains('sel')) b.classList.remove('sel'); if (b.getAttribute('aria-pressed') === 'true') b.setAttribute('aria-pressed', 'false'); });
  }
  const fd = document.getElementById('fDesign');
  if (fd && T3.BOARDS.reversi && T3.PIECES.reversi) {
    f3 = document.createElement('div'); f3.id = 'f3D';
    f3.innerHTML = '<label></label><div class="bdrow"></div><label class="pc3l"></label><div class="bdrow pc3"></div>'; fd.appendChild(f3);
    paint3(); const ls = document.getElementById('langSel'); if (ls) ls.addEventListener('change', () => setTimeout(paint3, 30));
    const r2 = document.getElementById('bdRow');
    if (r2) r2.addEventListener('click', e => { if (e.target.closest('button') && V) { V.set(false); setTimeout(paint3, 0); } }, true);   // a 2D board: the plain 2D page
    for (const fn of ['designPickers', 'renderBoards', 'buildBoards']) if (typeof window[fn] === 'function') { const od = window[fn]; window[fn] = function () { const r = od.apply(this, arguments); try { paint3(); } catch (e) {} return r; }; }
    const st = document.createElement('style'); st.textContent = `
html.atlas-skin #f3D{margin:12px 0 0;padding:10px 12px 12px;border-radius:14px;background:#f6f1e4;border:2px solid #e2cf9e}
html.atlas-skin #f3D > label{display:block;font-weight:700;font-size:13px;color:#7a5a1c;margin:0 0 8px}
html.atlas-skin #f3D > label.pc3l{margin-top:12px}
html.atlas-skin #f3D .bdrow button img{display:block;width:100%;aspect-ratio:1/1;object-fit:contain;border-radius:8px}
html.atlas-skin #f3D .bdrow.pc3 button img{aspect-ratio:3/2;background:radial-gradient(80% 80% at 50% 40%,#6a5e52,#2a231d);padding:4%;box-sizing:border-box}`;
    document.head.appendChild(st);
  }
  addEventListener('storage', e => { if (e.key === 'atlas-reversi-look' && board.userData.setLook) { board.userData.setLook(T3.BOARDS.reversi.get()); paint3(); } if (e.key === 'atlas-reversi-pc3') { redisc(); paint3(); } });
})();
