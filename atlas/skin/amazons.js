/* =====================================================================
   Amazons — portal skin (amazons/?skin=atlas)
   The full page keeps every feature (AI in 23 levels, rated games, two players, lessons, puzzles, the daily puzzle,
   review / analysis, the coach…). This file:
     • draws the 3D board (atlas/models/amazons.js: 'temple' — the Temple of Themiscyra on its stylobate, or 'ruins' — the
       jungle ruins' dressed stones) with the 3D table; the camera is aligned to the DOM board, which stays on top
       (transparent) for taps, destinations, arrows, hints and labels
     • the layout of chess's skin (no perspective on the page): only the board is 3D; the amazons are the page's own pieces drawn
       as 3/4 renders of the sculpted figures (amazons/img/pc3-<set>-<w|b>.webp: statue / archer / bronze, chosen in a 「3D駒」
       row under the 3D boards, 'atlas-amazons-pc3'), the arrows and their fire are the page's own (the 3D figures move in
       the portal's 3D view, atlas/games/amazons.js)
     • lesson / puzzle text → the guide's speech bubble (shared AtlasSkin)
   Rendering is on demand (Table3D.kick); nothing is drawn while idle.
   ===================================================================== */
(function () {
  'use strict';
  const THREE = window.THREE, T3 = window.Table3D, E = window.AmazonsEngine, A3 = T3 && T3.amazons;
  if (!THREE || !T3 || !A3 || !E || !window.AtlasSkin || typeof window.syncPieces !== 'function' || typeof window.animateMove !== 'function') return;
  const boardDom = document.getElementById('board'), piecesDom = document.getElementById('pieces'), de = document.documentElement;
  de.classList.add('atlas-amazons');
  const pc3 = () => A3.pcSet();
  const setPc3Attr = () => { de.dataset.pc3 = pc3(); };
  setPc3Attr();

  /* ---------- page: the DOM board's pictures become invisible (taps and marks stay) ---------- */
  const st = document.createElement('style');
  st.textContent = `
html.atlas-amazons .frame{background:transparent!important;box-shadow:none!important;border:0!important}
html.atlas-amazons .frame::before,html.atlas-amazons .frame::after,html.atlas-amazons .board::after,html.atlas-amazons .board::before{display:none!important}
html.atlas-amazons .board{background:none!important;box-shadow:none!important}
html.atlas-amazons[data-pc3=statue]{--pcW:url(img/pc3-statue-w.webp)!important;--pcB:url(img/pc3-statue-b.webp)!important}
html.atlas-amazons[data-pc3=archer]{--pcW:url(img/pc3-archer-w.webp)!important;--pcB:url(img/pc3-archer-b.webp)!important}
html.atlas-amazons[data-pc3=bronze]{--pcW:url(img/pc3-bronze-w.webp)!important;--pcB:url(img/pc3-bronze-b.webp)!important}
html.atlas-amazons .lines{overflow:visible!important}
html.atlas-amazons .lines .num{fill:rgba(255,246,226,.85)!important;stroke:rgba(0,0,0,.55)!important;font-weight:700}
html.atlas-amazons .frame > .reserve.bot{transform:translateY(calc(var(--cell) * .1))}html.atlas-amazons .frame > .reserve.top{transform:translateY(calc(var(--cell) * -.08))}
html.atlas-amazons .pieces .pc{width:calc(var(--cell) * 1.02);height:calc(var(--cell) * 1.02);margin:calc(var(--cell) * -.66) 0 0 calc(var(--cell) * -.51)}   /* the figures: 3/4 renders standing on their squares (as chess) */
html.atlas-amazons .reserve .rsv-plate{background:rgba(20,16,12,.82)!important;box-shadow:0 0 0 1px rgba(226,182,96,.45),0 2px 6px rgba(0,0,0,.35)!important;color:#f0e2c4!important}
html.atlas-amazons #fPieces{display:none!important}
html.atlas-skin #f3D{margin:12px 0 0;padding:10px 12px 12px;border-radius:14px;background:#f6f1e4;border:2px solid #e2cf9e}
html.atlas-skin #f3D > label{display:block;font-weight:700;font-size:13px;color:#7a5a1c;margin:0 0 8px}
html.atlas-skin #f3D > label.pc3l{margin-top:12px}
html.atlas-skin #f3D .bdrow button img{display:block;width:100%;aspect-ratio:1/1;object-fit:contain;border-radius:8px}
html.atlas-skin #f3D .bdrow.pc3 button img{background:radial-gradient(80% 80% at 50% 40%,#5a6a5c,#26302a);padding:6%;box-sizing:border-box}
`;
  document.head.appendChild(st);

  const skin = AtlasSkin.init({
    margin: .16,
    persp: 2.6,   // (straight down with a near lens, as chess: the figures show their sides toward the edges; no tilt, so the page keeps its full layout)
    board: boardDom,
    pc: { vars: ['--cell'], extras: '.frame > .reserve' },
    outer: r => { const Hh = r.height * A3.H / 10; return { top: r.top + r.height / 2 - Hh / 2, height: Hh }; },
    guide: '../images/atlas/amazons.webp', guideFallback: '../images/atlas/amazons.webp',
    bubbles: [['lsPrompt', 'lsFb'], ['pzGoal', 'pzStatus']],
    skip: 'lines|\\.pc|\\.arw|\\.rv|reserve|rsv|sqfx|\\.dest|\\.mark|\\.hov|fxsvg|hintlbl|frame|prompt|spark|flare',
    start(lv, side, mode) {
      if (typeof openNewDialog !== 'function' || typeof draft !== 'object' || typeof segSync !== 'function' || !document.getElementById('btnStart')) return null;
      openNewDialog();
      draft.mode = mode === 'rated' || mode === 'pvp' ? mode : 'ai';
      if (side === 1 || side === 2) draft.color = side;
      if (lv >= 1 && lv <= 23) draft.level = lv;
      segSync(); document.getElementById('btnStart').click();
      return true;
    },
  });
  if (!skin) return;

  /* ---------- the board ---------- */
  const holder = new THREE.Group();
  let root = null, U = null, built = '';
  function build() {
    const look = T3.BOARDS && T3.BOARDS.amazons ? T3.BOARDS.amazons.get() : 'temple';
    if (look === built && root) return false;
    built = look;
    if (root) holder.remove(root);
    root = A3.board(look); U = root.userData; holder.add(root);
    T3.show('amazons', holder, { still: true });
    skin.alignTo(10, U.top);
    dispatchEvent(new Event('resize'));
    T3.kick(600);
    return true;
  }
  build();
  const V = skin.view && skin.view({ key: 'atlas-amazons-view', cls: ['atlas-amazons'] });
  T3.kick(800);
  { let last = ''; const app = document.querySelector('.app');
    const chk = () => { const r = boardDom.getBoundingClientRect(), k = Math.round(r.left) + ',' + Math.round(r.top + scrollY) + ',' + Math.round(r.width); if (k !== last) { last = k; dispatchEvent(new Event('resize')); } };
    if (app && window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(chk)).observe(app); setTimeout(chk, 3000); setTimeout(chk, 6000); }

  /* ---------- the new-game dialog: 「3D盤」 (boards) and 「3D駒」 (figures) under the 2D boards ---------- */
  const T3L = { ja: '3D盤', en: '3D boards', zh: '3D棋盘', ko: '3D 판', es: 'Tableros 3D', fr: 'Plateaux 3D', pt: 'Tabuleiros 3D', de: '3D-Bretter', hi: '3D बोर्ड', ar: 'رقع ثلاثية الأبعاد', ru: '3D-доски', 'zh-TW': '3D棋盤', id: 'Papan 3D', tr: '3D tahtalar' };
  const P3L = { ja: '3D駒', en: '3D pieces', zh: '3D棋子', ko: '3D 말', es: 'Piezas 3D', fr: 'Pièces 3D', pt: 'Peças 3D', de: '3D-Figuren', hi: '3D मोहरे', ar: 'قطع ثلاثية الأبعاد', ru: '3D-фигуры', 'zh-TW': '3D棋子', id: 'Bidak 3D', tr: '3D taşlar' };
  const PN = {
    statue: { ja: '大理石の女戦士像', en: 'Marble warriors', zh: '大理石女战士像', 'zh-TW': '大理石女戰士像', ko: '대리석 여전사상', es: 'Guerreras de mármol', fr: 'Guerrières de marbre', pt: 'Guerreiras de mármore', de: 'Marmorkriegerinnen', ru: 'Мраморные воительницы', tr: 'Mermer savaşçılar', id: 'Prajurit marmer', hi: 'संगमरमर की योद्धा', ar: 'محاربات من الرخام' },
    archer: { ja: '象牙と黒檀の弓兵', en: 'Ivory & ebony archers', zh: '象牙与乌木弓手', 'zh-TW': '象牙與烏木弓手', ko: '상아와 흑단 궁수', es: 'Arqueras de marfil y ébano', fr: 'Archères ivoire et ébène', pt: 'Arqueiras de marfim e ébano', de: 'Bogenschützinnen aus Elfenbein & Ebenholz', ru: 'Лучницы из слоновой кости и эбена', tr: 'Fildişi ve abanoz okçular', id: 'Pemanah gading & eboni', hi: 'हाथीदाँत और आबनूस की धनुर्धर', ar: 'رامياتٌ من العاج والأبنوس' },
    bronze: { ja: 'ブロンズと鉄のクイーン', en: 'Bronze & iron queens', zh: '青铜与铁女王', 'zh-TW': '青銅與鐵女王', ko: '청동과 철의 여왕', es: 'Reinas de bronce y hierro', fr: 'Reines de bronze et de fer', pt: 'Rainhas de bronze e ferro', de: 'Königinnen aus Bronze & Eisen', ru: 'Королевы из бронзы и железа', tr: 'Bronz ve demir kraliçeler', id: 'Ratu perunggu & besi', hi: 'काँसे और लोहे की रानियाँ', ar: 'ملكاتٌ من البرونز والحديد' },
  };
  const lng = () => (l => /^zh-(tw|hk|mo|hant)/i.test(l) ? 'zh-TW' : String(l).slice(0, 2))((document.getElementById('langSel') || {}).value || (typeof LANG !== 'undefined' ? LANG : 'ja'));
  const is3 = () => !V || V.is3d();
  function setLook(k) {
    if (!T3.BOARDS || !T3.BOARDS.amazons) return;
    if (T3.setBoard) T3.setBoard('amazons', k); else T3.BOARDS.amazons.set(k);
    if (V && !V.is3d()) V.set(true);
    build();
    paint3();
  }
  function setSet(k) {
    try { localStorage.setItem('atlas-amazons-pc3', k); } catch (e) {}
    setPc3Attr();
    if (V && !V.is3d()) V.set(true);
    build();
    paint3();
  }
  let f3 = null;
  function paint3() {
    const B = T3.BOARDS && T3.BOARDS.amazons; if (!f3 || !B) return;
    const l = lng(), cur = B.get(), on = is3(), cs = pc3();
    const [lb, lp] = f3.querySelectorAll('label'); lb.textContent = T3L[l] || T3L.en; lp.textContent = P3L[l] || P3L.en;
    const [row, prow] = f3.querySelectorAll('.bdrow');
    if (!row.children.length) B.list.forEach(k => {
      const bt = document.createElement('button'); bt.type = 'button'; bt.dataset.look = k;
      const im = document.createElement('img'); im.src = T3.boardIcon ? T3.boardIcon('amazons', k) : ''; im.alt = ''; im.draggable = false;
      bt.append(im, document.createElement('span')); bt.onclick = () => setLook(k); row.appendChild(bt);
    });
    if (!prow.children.length) A3.SETS.forEach(k => {
      const bt = document.createElement('button'); bt.type = 'button'; bt.dataset.set = k;
      const im = document.createElement('img'); im.src = 'img/pc3-' + k + '-w.webp'; im.alt = ''; im.draggable = false;
      bt.append(im, document.createElement('span')); bt.onclick = () => setSet(k); prow.appendChild(bt);
    });
    row.querySelectorAll('button').forEach(bt => { const k = bt.dataset.look, sel = on && cur === k; bt.querySelector('span').textContent = T3.boardName ? T3.boardName(k, l) : k; bt.classList.toggle('sel', sel); bt.setAttribute('aria-pressed', String(sel)); });
    prow.querySelectorAll('button').forEach(bt => { const k = bt.dataset.set, sel = cs === k; bt.querySelector('span').textContent = (PN[k] || {})[l] || PN[k].en; bt.classList.toggle('sel', sel); bt.setAttribute('aria-pressed', String(sel)); });
    const r2 = document.getElementById('bdRow');
    if (r2 && on) r2.querySelectorAll('button').forEach(b => { if (b.classList.contains('sel')) b.classList.remove('sel'); if (b.getAttribute('aria-pressed') === 'true') b.setAttribute('aria-pressed', 'false'); });
  }
  const fd = document.getElementById('fDesign');
  if (fd) {
    f3 = document.createElement('div'); f3.id = 'f3D';
    f3.innerHTML = '<label></label><div class="bdrow"></div><label class="pc3l"></label><div class="bdrow pc3"></div>'; fd.appendChild(f3);
    paint3(); const ls = document.getElementById('langSel'); if (ls) ls.addEventListener('change', () => setTimeout(paint3, 30));
    const r2 = document.getElementById('bdRow');
    if (r2) r2.addEventListener('click', e => { if (e.target.closest('button') && V) { V.set(false); setTimeout(paint3, 0); } }, true);
    if (typeof window.designPickers === 'function') { const od = window.designPickers; window.designPickers = function () { const r = od.apply(this, arguments); try { paint3(); } catch (e) {} return r; }; }
  }
  addEventListener('storage', e => { if (e.key === 'atlas-amazons-look' || e.key === 'atlas-amazons-pc3') { setPc3Attr(); build(); paint3(); } });


  window.__amSkin = { look: () => built };
})();
