/* =====================================================================
   Agon — portal skin (agon/?skin=atlas)
   The full page keeps every feature (AI in 20 levels, rated games, two players, online,
   lessons, openings, puzzles, review / analysis, the coach…). This file:
     • draws one of two 3D boards (atlas/models/agon.js), picked in the new-game dialog's design tab:
         – the American folk-art panel (worn milk paint on a split, knocked pine board) with milk-painted pieces
         – the 1842 London parlour board (lithographed field in polished mahogany, gilt) with bone and ebony
       or the page's own 2D boards (any 2D board tile = the plain 2D page in the portal frame).
       The camera is aligned to the DOM board, which stays on top (transparent) for taps, the targets,
       the red "to relocate" rings, arrows, hints and labels; the side plates sit above / below the slab
     • mirrors the page's pieces (syncPieces / animateMove) into turned discs and hexagonal queens:
       a step glides, a relocation lifts the captured piece and carries it in an arc, a placement drops
       a guard onto its cell; a captured piece leans over until its owner moves it; the selected one is lifted
     • lesson / puzzle text → the guide's speech bubble (shared AtlasSkin)
   Rendering is on demand (Table3D.kick); nothing is drawn while idle.
   ===================================================================== */
(function () {
  'use strict';
  const THREE = window.THREE, T3 = window.Table3D, E = window.AgonEngine, A3 = T3 && T3.agon;
  if (!THREE || !T3 || !A3 || !E || !window.AtlasSkin || typeof window.syncPieces !== 'function' || typeof window.animateMove !== 'function') return;
  const boardDom = document.getElementById('board'), piecesDom = document.getElementById('pieces'), de = document.documentElement;
  const LK = 'atlas-agon-look';
  let look = 'victorian'; try { const v = localStorage.getItem(LK); if (v === 'folk' || v === 'victorian' || v === '2d') look = v; } catch (e) {}
  let last3 = look === '2d' ? 'victorian' : look;
  try { const v = localStorage.getItem(LK + '3'); if (v === 'folk' || v === 'victorian') last3 = look === '2d' ? v : look; } catch (e) {}
  let root = A3.board(last3), U = root.userData, Y = U.top;

  /* ---------- page: the DOM board's pictures become invisible (taps, rings and marks stay) ---------- */
  const st = document.createElement('style');
  st.textContent = `
html.atlas-agon3 .frame{background:transparent!important;box-shadow:none!important;border:0!important}
html.atlas-agon3 .frame::before,html.atlas-agon3 .frame::after,html.atlas-agon3 .board::after,html.atlas-agon3 .board::before{display:none!important}
html.atlas-agon3 .board{background:none!important;box-shadow:none!important}
html.atlas-agon3 .lines .num{fill:rgba(255,248,226,.55)!important}
html.atlas-agon3 .pieces .pc:not(.hov){filter:none!important;opacity:1!important}
html.atlas-agon3 .pieces .pc:not(.hov) .face{display:none!important}
html.atlas-agon3 .pieces .pc.sel{border-radius:50%;box-shadow:0 0 0 3px rgba(255,226,140,.95),0 0 18px rgba(255,214,110,.8)!important}
html.atlas-agon3 .pieces .pc.dim{background:rgba(0,0,0,.35)!important;border-radius:50%}
html.atlas-agon3 .pieces .pc.arrived{animation:agArr .9s ease-out!important}
@keyframes agArr{0%{border-radius:50%;box-shadow:0 0 0 0 rgba(255,214,110,.9)}100%{border-radius:50%;box-shadow:0 0 0 18px rgba(255,214,110,0)}}
html.atlas-agon3 .pieces .hov{opacity:.45!important}
html.atlas-agon3 #fPieces{display:none!important}
html.atlas-agon3 .reserve .rsv-plate{background:rgba(255,250,238,.9)!important;color:#4a3524!important;box-shadow:0 2px 6px rgba(60,30,10,.22)!important}
html.atlas-agon3 .reserve .rsv-plate b{color:#2b1a0e!important}
html.atlas-agon3 .reserve .rsv-plate .rsv-w{color:#6b4a2a!important}
html.atlas-agon3 .reserve .rsv-plate .rsv-w.hot{color:#c7362a!important}
#bdRow.ag3row{grid-template-columns:repeat(3,minmax(0,1fr))!important}
#bdRow button.ag3{position:relative}
#bdRow button.ag3 img{display:block;width:100%;aspect-ratio:1;object-fit:cover;border-radius:5px;box-shadow:0 3px 6px rgba(60,30,10,.3)}
#bdRow button.ag3::after{content:'3D';position:absolute;top:8px;inset-inline-start:8px;padding:1px 7px;border-radius:99px;background:linear-gradient(180deg,#ffcf5c,#e09a00);color:#fff;font:900 10.5px/1.5 'Fredoka',system-ui,sans-serif;letter-spacing:.06em;box-shadow:0 2px 0 #b97a00;pointer-events:none}
html.atlas-agon3 .ag3note{margin:8px 0 0;padding:12px 14px;border-radius:14px;background:#fbf3e2;border:2px solid #ecd9b4;font-size:13px;line-height:1.6;color:#5a4330}
html:not(.atlas-agon3) .ag3note{display:none!important}
html.atlas-agon3 .ag3note b{display:block;font-size:14px;color:#7a3a1c;margin-bottom:2px}
`;
  document.head.appendChild(st);

  const cell = () => boardDom.getBoundingClientRect().height / 8;
  const skin = AtlasSkin.init({
    margin: .16,
    persp: 10,   // a long lens: the pieces stand on their cells (the DOM rings stay round them)
    board: boardDom,
    pc: { vars: ['--cell'], extras: '.frame > .reserve' },
    outer: r => { const c = r.height / 8; return { top: r.top - c * .75, height: r.height + c * 1.5 }; },   // the plates above / below belong to the board group
    guide: '../images/atlas/g-gold.webp', guideFallback: '../images/atlas/agon.webp',
    bubbles: [['lsPrompt', 'lsFb'], ['pzGoal', 'pzStatus']],
    skip: 'lines|\\.pc|\\.rv|reserve|rsv|sqfx|\\.dest|\\.mark|\\.hov|fxsvg|hintlbl|frame|prompt|face',
    start(lv, side, mode) {
      if (typeof openNewDialog !== 'function' || typeof draft !== 'object' || typeof segSync !== 'function' || !document.getElementById('btnStart')) return null;
      openNewDialog();
      draft.mode = mode === 'rated' || mode === 'pvp' ? mode : 'ai';
      if (side === 1 || side === 2) draft.color = side;
      if (lv >= 1 && lv <= 20) draft.level = lv;
      segSync(); document.getElementById('btnStart').click();
      return true;
    },
  });
  if (!skin) return;
  T3.show('agon', root, { still: true });
  skin.alignTo(A3.B * 8 / 8, Y);
  T3.kick(800);
  { let lastK = ''; const app = document.querySelector('.app');   // the online dock / header bar can move the board without resizing it
    const chk = () => { const r = boardDom.getBoundingClientRect(), k = Math.round(r.left) + ',' + Math.round(r.top + scrollY) + ',' + Math.round(r.width); if (k !== lastK) { lastK = k; dispatchEvent(new Event('resize')); } };
    if (app && window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(chk)).observe(app); setTimeout(chk, 3000); setTimeout(chk, 6000); }

  /* ---------- the design tab: two 3D boards first, then the page's own 2D boards ---------- */
  const LBL = {
    folk: { ja: ['3D 民藝盤', 'ミルクペイントの松板・使い込み'], en: ['3D folk-art board', 'Milk paint on pine, well worn'], zh: ['3D 民间彩绘盘', '松木乳漆·久经使用'], ko: ['3D 민예 판', '소나무 우유 페인트·오래 쓴'], es: ['Tablero folk 3D', 'Pintura de leche sobre pino, muy usado'], fr: ['Plateau folk 3D', 'Peinture au lait sur pin, très usé'], pt: ['Tabuleiro folk 3D', 'Tinta de leite sobre pinho, bem gasto'], de: ['Volkskunst-Brett 3D', 'Milchfarbe auf Kiefer, abgegriffen'], hi: ['3D लोक-कला बोर्ड', 'चीड़ पर मिल्क पेंट, खूब घिसा'], ar: ['رقعة شعبية ثلاثية الأبعاد', 'طلاء حليبي على خشب الصنوبر، مستعملة كثيرًا'] },
    victorian: { ja: ['3D ヴィクトリア盤', '1842年ロンドン・マホガニーと金'], en: ['3D Victorian board', 'London 1842: mahogany and gilt'], zh: ['3D 维多利亚盘', '1842年伦敦·桃花心木与金饰'], ko: ['3D 빅토리아 판', '1842년 런던·마호가니와 금박'], es: ['Tablero victoriano 3D', 'Londres 1842: caoba y dorado'], fr: ['Plateau victorien 3D', 'Londres 1842 : acajou et dorure'], pt: ['Tabuleiro vitoriano 3D', 'Londres 1842: mogno e dourado'], de: ['Viktorianisches Brett 3D', 'London 1842: Mahagoni und Gold'], hi: ['3D विक्टोरियन बोर्ड', 'लंदन 1842: महोगनी और सोना'], ar: ['رقعة فيكتورية ثلاثية الأبعاد', 'لندن 1842: ماهوجني وتذهيب'] },
  };
  const NOTE = {
    ja: ['3D盤の駒', '民藝盤はミルクペイントの木駒（クリームに赤・黒にからし色）、ヴィクトリア盤は骨と黒檀の駒で表示します。女王は六角形の駒です。'],
    en: ['Pieces on the 3D boards', 'The folk-art board uses milk-painted wooden pieces (cream with red, black with mustard), the Victorian board bone and ebony. Queens are the hexagonal pieces.'],
    zh: ['3D棋盘的棋子', '民间彩绘盘使用乳漆木棋子（米色配红、黑色配芥黄），维多利亚盘使用骨与乌木棋子。六角形的是女王。'],
    ko: ['3D 판의 말', '민예 판은 우유 페인트 나무 말(크림에 빨강, 검정에 겨자색), 빅토리아 판은 뼈와 흑단 말입니다. 육각형 말이 여왕입니다.'],
    es: ['Piezas de los tableros 3D', 'El tablero folk usa piezas de madera pintadas (crema con rojo, negro con mostaza); el victoriano, hueso y ébano. Las reinas son las piezas hexagonales.'],
    fr: ['Pièces des plateaux 3D', 'Le plateau folk a des pièces en bois peintes (crème et rouge, noir et moutarde), le victorien des pièces en os et ébène. Les reines sont hexagonales.'],
    pt: ['Peças dos tabuleiros 3D', 'O tabuleiro folk usa peças de madeira pintadas (creme com vermelho, preto com mostarda); o vitoriano, osso e ébano. As rainhas são as peças hexagonais.'],
    de: ['Steine der 3D-Bretter', 'Das Volkskunst-Brett hat bemalte Holzsteine (Creme mit Rot, Schwarz mit Senfgelb), das viktorianische Bein und Ebenholz. Die Königinnen sind sechseckig.'],
    hi: ['3D बोर्ड के मोहरे', 'लोक-कला बोर्ड पर रंगे लकड़ी के मोहरे (क्रीम पर लाल, काले पर सरसों), विक्टोरियन पर हड्डी और आबनूस। षट्कोण मोहरे रानियाँ हैं।'],
    ar: ['قطع الرقعتين ثلاثيتي الأبعاد', 'الرقعة الشعبية بقطع خشبية مطلية (كريمي مع أحمر، أسود مع خردلي)، والفيكتورية بقطع من العظم والأبنوس. الملكات هي القطع السداسية.'],
  };
  const lang = () => ((document.getElementById('langSel') || {}).value || document.documentElement.lang || 'ja').slice(0, 2);
  function paintRow() {
    const row = document.getElementById('bdRow'); if (!row) return;
    row.classList.add('ag3row');
    ['victorian', 'folk'].reverse().forEach(k => {
      let b = row.querySelector(`button[data-a3="${k}"]`);
      if (!b) { b = document.createElement('button'); b.type = 'button'; b.className = 'ag3'; b.dataset.a3 = k; }
      if (row.firstElementChild !== b && !(k === 'folk' && row.firstElementChild && row.firstElementChild.dataset.a3 === 'victorian' && row.children[1] === b)) row.prepend(b);
      const L = LBL[k][lang()] || LBL[k].en, on = look === k;
      b.innerHTML = `<img src="img/bd-${k}.webp" alt="" draggable="false"><span></span>`;
      const sp = b.querySelector('span'); sp.textContent = L[0]; const sm = document.createElement('small'); sm.textContent = L[1]; sp.appendChild(sm);
      b.classList.toggle('sel', on); b.setAttribute('aria-pressed', String(on));
    });
    // order: victorian, folk, then the 2D boards
    const v = row.querySelector('button[data-a3="victorian"]'), f = row.querySelector('button[data-a3="folk"]'); if (v && f) { row.prepend(f); row.prepend(v); }
    if (look !== '2d') row.querySelectorAll('button:not([data-a3])').forEach(x => { x.classList.remove('sel'); x.setAttribute('aria-pressed', 'false'); });
    const fd = document.getElementById('fDesign');
    if (fd) { let p = fd.querySelector('.ag3note'); if (!p) { p = document.createElement('p'); p.className = 'ag3note'; fd.appendChild(p); } const n = NOTE[lang()] || NOTE.en; p.innerHTML = ''; const bb = document.createElement('b'); bb.textContent = n[0]; p.append(bb, n[1]); }
  }
  let V = null;
  function setLook(k) {
    look = k; try { localStorage.setItem(LK, k); if (k !== '2d') localStorage.setItem(LK + '3', k); } catch (e) {}
    if (k !== '2d' && k !== U.look) {   // a new board (and its pieces)
      for (const [, o] of P3) drop(o.g); P3.clear();
      root = A3.board(k); U = root.userData; Y = U.top;
      T3.show('agon', root, { still: true }); skin.alignTo(A3.B, Y);
      try { mirror(); } catch (e) {}
    }
    de.classList.toggle('atlas-agon3', k !== '2d');
    if (V) V.set(k !== '2d');
    paintRow(); T3.kick(600);
    [0, 150, 600].forEach(ms => setTimeout(() => dispatchEvent(new Event('resize')), ms));
  }
  {
    const row = document.getElementById('bdRow');
    if (row) row.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || !row.contains(b)) return;
      if (b.dataset.a3) { e.stopImmediatePropagation(); setLook(b.dataset.a3); return; }
      setTimeout(() => setLook('2d'), 0);   // a 2D board: the game's own handler picks it, the page shows its 2D board
    }, true);
    if (typeof window.designPickers === 'function') { const od = window.designPickers; window.designPickers = function () { const r = od.apply(this, arguments); try { paintRow(); } catch (e) {} return r; }; }
    const ls = document.getElementById('langSel'); if (ls) ls.addEventListener('change', () => setTimeout(paintRow, 30));
  }
  if (skin.view) V = skin.view({ key: 'atlas-agon-view', init: look !== '2d', cls: ['atlas-agon'], on() { setTimeout(() => dispatchEvent(new Event('resize')), 0); } });

  /* ---------- 3D pieces mirrored from the page's pieces ---------- */
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const P3 = new Map();   // cell → { g, k }
  let tok = 0;            // a full re-sync cancels running animations
  const xz = i => { let p; try { p = dXY(i); } catch (e) { p = [E.XC[i], E.YC[i]]; } return U.pt(p[0], p[1]); };
  const animOk = () => { try { return typeof animOn === 'function' ? animOn() : true; } catch (e) { return true; } };
  const anim = (dur, f, done, my) => { const t0 = performance.now(); (function s(n) { if (my !== undefined && my !== tok) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
  function mk(k, i) {
    const g = U.piece(k);
    const sh = T3.contact(A3.R * .95, .5); sh.position.y = .002; g.add(sh); g.userData.sh = sh;
    const [x, z] = xz(i); g.position.set(x, Y, z); root.add(g); return g;
  }
  function lift(g, h) {
    g.position.y = Y + h; g.userData.h0 = h;
    const sh = g.userData.sh; if (sh) { sh.position.y = .002 - h; const s = 1 + h * .5; sh.scale.set(s, s, s); sh.material.opacity = .5 / (1 + h * 1.4); }
  }
  const hOf = g => g.userData.h0 || 0;
  function drop(g) { if (g.userData.sh) g.userData.sh.material.dispose(); if (g.parent) g.parent.remove(g); }
  function land(g, my) { anim(160, k => { const s = 1 + Math.sin(k * Math.PI) * .05; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1), my); }
  // a captured piece leans over (towards the viewer's lower right) until its owner relocates it
  function lean(g, on) {
    if (!!g.userData.capd === on) return; g.userData.capd = on;
    const a0 = g.rotation.z, a1 = on ? -.22 : 0, b0 = g.rotation.x, b1 = on ? .12 : 0;
    anim(220, k => { const e = io(k); g.rotation.z = a0 + (a1 - a0) * e; g.rotation.x = b0 + (b1 - b0) * e; });
  }
  function applySel() {
    let els; try { els = pcEls; } catch (e) { return; }
    for (const [i, o] of P3) {
      const el = els.get(i), g = o.g; if (!el || g.userData.moving) continue;
      lean(g, el.classList.contains('capd'));
      const on = el.classList.contains('sel');
      if (on === !!g.userData.up) continue;
      g.userData.up = on; const h0 = hOf(g), h1 = on ? .22 : 0;
      anim(on ? 130 : 110, k => lift(g, h0 + (h1 - h0) * io(k)));
    }
  }
  function mirror() {
    let els; try { els = pcEls; } catch (e) { return; }
    tok++;
    const want = new Map(); for (const [i, el] of els) want.set(i, +el.dataset.k);
    for (const [i, o] of P3) if (want.get(i) !== o.k) { drop(o.g); P3.delete(i); }
    for (const [i, k] of want) {
      const o = P3.get(i);
      if (!o) { P3.set(i, { g: mk(k, i), k }); continue; }
      const g = o.g, [x, z] = xz(i); g.position.x = x; g.position.z = z; g.scale.set(1, 1, 1); g.userData.moving = false; g.userData.up = false; lift(g, 0);
    }
    for (const [i, o] of P3) { const el = els.get(i), c = !!(el && el.classList.contains('capd')); o.g.userData.capd = c; o.g.rotation.set(c ? .12 : 0, 0, c ? -.22 : 0); }
    applySel(); T3.kick(300);
  }
  // a move as the page animates it: a step glides, a relocation flies in an arc, a placement drops onto the cell
  function travel(m, before) {
    const f = E.mFrom(m), to = E.mTo(m), kind = E.kindOfMove(before, m), my = tok;
    if (kind === 'place') {
      const k = before.turn === 1 ? 1 : 3, old = P3.get(to); if (old) drop(old.g);
      const g = mk(k, to); P3.set(to, { g, k }); g.userData.moving = true;
      anim(360, q => { const e = 1 - Math.pow(1 - q, 3); lift(g, (1 - e) * 1.2); }, () => { g.userData.moving = false; lift(g, 0); land(g, my); }, my);
      return true;
    }
    const o = P3.get(f); if (!o) return false;
    const g = o.g; P3.delete(f); const old = P3.get(to); if (old && old !== o) drop(old.g); P3.set(to, o);
    g.userData.moving = true; g.userData.up = false;
    const [x0, z0] = xz(f), [x1, z1] = xz(to), h0 = hOf(g), d = Math.hypot(x1 - x0, z1 - z0);
    const r0x = g.rotation.x, r0z = g.rotation.z; g.userData.capd = false;
    if (kind === 'reloc') {
      const H = Math.min(2.2, .6 + d * .22);
      anim(620, q => { const e = io(q); g.position.x = x0 + (x1 - x0) * e; g.position.z = z0 + (z1 - z0) * e; lift(g, h0 * (1 - q) + Math.sin(q * Math.PI) * H); g.rotation.x = r0x * (1 - e); g.rotation.z = r0z * (1 - e); },
        () => { g.userData.moving = false; g.rotation.set(0, 0, 0); lift(g, 0); land(g, my); }, my);
    } else {
      anim(300, q => { const e = io(q); g.position.x = x0 + (x1 - x0) * e; g.position.z = z0 + (z1 - z0) * e; lift(g, (h0 + (.16 - h0) * Math.min(1, q / .2)) * (q > .8 ? 1 - (q - .8) / .2 : 1)); },
        () => { g.userData.moving = false; lift(g, 0); land(g, my); setTimeout(applySel, 40); }, my);
    }
    return true;
  }
  const oSync = window.syncPieces;
  window.syncPieces = function () { const r = oSync.apply(this, arguments); try { mirror(); } catch (e) {} return r; };
  const oAnim = window.animateMove;
  window.animateMove = function (m, before) {
    const ok = oAnim.apply(this, arguments);
    const pass = typeof window.isPass === 'function' ? isPass(m) : false;
    if (ok && !pass) { try { if (!animOk() || !travel(m, before)) mirror(); } catch (e) { try { mirror(); } catch (x) {} } }
    return ok;
  };
  if (piecesDom) new MutationObserver(() => applySel()).observe(piecesDom, { subtree: true, attributes: true, attributeFilter: ['class'] });
  try { mirror(); } catch (e) {}
  setLook(look);

  window.__agSkin = { pieces: () => P3.size, look: () => look, set: setLook, at: i => { const [x, z] = xz(i); return T3.project(x, z, Y); } };
})();
