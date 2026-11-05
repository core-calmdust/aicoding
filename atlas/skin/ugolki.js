/* =====================================================================
   Ugolki — portal skin (ugolki/?skin=atlas)
   The full page keeps every feature (AI in 20 levels, rated games, two players, online,
   lessons, openings, puzzles, review / analysis, the coach, the 3×3 / 3×4 / 4×4 / diagonal
   rules…). This file:
     • draws the Gzhel porcelain board (atlas/models/ugolki.js: the 2D page's white-and-cobalt
       tiles and painted frame under a glossy glaze) with the 3D table; the camera is aligned to
       the DOM board, which stays on top (transparent) for taps, the destinations, the houses'
       dashed outlines, arrows, hints and labels. The DOM frame (8.5 × 9.5 squares) is the slab
       itself; the count plates above / below it sit on the porcelain band
     • mirrors the page's pieces (syncPieces / animateMove) into glazed porcelain pucks: a step
       lifts, glides and sets down; a jump chain hops over each piece it passes; the selected
       piece is lifted
     • lesson / puzzle text → the guide's speech bubble (shared AtlasSkin)
   Rendering is on demand (Table3D.kick); nothing is drawn while idle.
   ===================================================================== */
(function () {
  'use strict';
  const THREE = window.THREE, T3 = window.Table3D, E = window.UgolkiEngine, U3 = T3 && T3.ugolki;
  if (!THREE || !T3 || !U3 || !E || !window.AtlasSkin || typeof window.syncPieces !== 'function' || typeof window.animateMove !== 'function') return;
  const boardDom = document.getElementById('board'), piecesDom = document.getElementById('pieces'), de = document.documentElement;
  de.classList.add('atlas-ugolki');
  const root = U3.board(), U = root.userData, S = U.S, Y = U.top;

  /* ---------- page: the DOM board's pictures become invisible (taps, houses and marks stay) ---------- */
  const st = document.createElement('style');
  st.textContent = `
html.atlas-ugolki .frame{background:transparent!important;box-shadow:none!important;border:0!important}
html.atlas-ugolki .frame::before,html.atlas-ugolki .frame::after,html.atlas-ugolki .board::after,html.atlas-ugolki .board::before{display:none!important}
html.atlas-ugolki .board{background:none!important;box-shadow:none!important}
html.atlas-ugolki .lines :is(.sqd,.sql,.hm){fill:transparent!important;stroke:none!important}
html.atlas-ugolki .lines .house{stroke:#1d3f9a!important;stroke-opacity:.8!important}
html.atlas-ugolki .lines .num{fill:rgba(29,63,154,.5)!important}
html.atlas-ugolki .pieces .pc:not(.hov){background:none!important;box-shadow:none!important;filter:none!important;opacity:1!important;border:0!important}
html.atlas-ugolki .pieces .pc:not(.hov)::before,html.atlas-ugolki .pieces .pc:not(.hov)::after,html.atlas-ugolki .pieces .pc:not(.hov) .orn{display:none!important}
html.atlas-ugolki .pieces .pc.sel{box-shadow:0 0 0 3px rgba(255,214,100,.95),0 0 18px rgba(255,200,80,.75)!important}
html.atlas-ugolki .pieces .pc.threat{box-shadow:0 0 0 2.5px rgba(255,90,70,.9),0 0 12px rgba(255,90,70,.6)!important}
html.atlas-ugolki .pieces .pc.arrived{animation:ugArr .9s ease-out!important}
@keyframes ugArr{0%{box-shadow:0 0 0 0 rgba(255,214,100,.9)}100%{box-shadow:0 0 0 18px rgba(255,214,100,0)}}
html.atlas-ugolki .pieces .hov{opacity:.4!important;box-shadow:none!important}
html.atlas-ugolki .pieces .hov::before,html.atlas-ugolki .pieces .hov::after,html.atlas-ugolki .pieces .hov .orn{display:none!important}
html.atlas-ugolki .pieces .hov.p1{background:radial-gradient(circle at 40% 35%,#fff,#e2e8f5 60%,#b8c4de)!important}
html.atlas-ugolki .pieces .hov.p2{background:radial-gradient(circle at 40% 35%,#3a66cc,#1d3f9a 60%,#11275f)!important}
html.atlas-ugolki .reserve .rsv-plate{background:rgba(255,255,255,.88)!important;box-shadow:0 2px 6px rgba(20,40,100,.18)!important}
html.atlas-ugolki #fPieces{display:none!important}
html.atlas-ugolki .ug3dnote{margin:8px 0 0;padding:12px 14px;border-radius:14px;background:#f2f5fc;border:2px solid #d5def3;font-size:13px;line-height:1.6;color:#3d4a6e}
html.atlas-2d .ug3dnote{display:none!important}
html.atlas-ugolki .ug3dnote b{display:block;font-size:14px;color:#1d3f9a;margin-bottom:2px}
`;
  document.head.appendChild(st);

  const skin = AtlasSkin.init({
    margin: .16,
    persp: 10,   // a long lens: the pucks stand on their squares (the DOM rings stay round them)
    board: boardDom,
    pc: { vars: ['--cell'], extras: '.frame > .reserve' },   // PC: board + info column laid out from the 3D slab (AtlasSkin pcFit)
    outer: r => { const H = r.height * U3.H / S; return { top: r.top + r.height / 2 - H / 2, height: H }; },   // slab edge to slab edge
    guide: '../images/atlas/g-owl.webp', guideFallback: '../images/atlas/ugolki.webp',
    bubbles: [['lsPrompt', 'lsFb'], ['pzGoal', 'pzStatus']],
    skip: 'lines|\\.pc|\\.rv|reserve|rsv|sqfx|\\.dest|\\.mark|\\.hov|fxsvg|hintlbl|frame|prompt|orn',
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
  T3.show('ugolki', root, { still: true });
  skin.alignTo(S, Y);
  if (skin.view) skin.view({ key: 'atlas-ugolki-view', row: document.getElementById('bdRow'), img: '../images/atlas/ugolki.webp', cls: ['atlas-ugolki'] });
  T3.kick(800);
  { let last = ''; const app = document.querySelector('.app');   // the online dock / header bar can move the board without resizing it
    const chk = () => { const r = boardDom.getBoundingClientRect(), k = Math.round(r.left) + ',' + Math.round(r.top + scrollY) + ',' + Math.round(r.width); if (k !== last) { last = k; dispatchEvent(new Event('resize')); } };
    if (app && window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(chk)).observe(app); setTimeout(chk, 3000); setTimeout(chk, 6000); }

  /* ---------- the new-game dialog: the 3D set replaces the 2D board / piece designs ---------- */
  const NOTE = {
    ja: ['3D グジェリ磁器の盤', '白と藍のタイルを艶やかな釉で仕上げたグジェリ焼きの盤と、花を描いた磁器の駒（白＝白磁、黒＝藍）で表示しています。'],
    en: ['Gzhel porcelain 3D board', 'A Gzhel porcelain board of white and cobalt tiles under a glossy glaze, with painted porcelain pieces (White: white, Black: cobalt).'],
    zh: ['3D格热利瓷盘', '白色与钴蓝瓷砖覆以光亮釉面的格热利瓷棋盘，配手绘花纹的瓷质棋子（白方＝白瓷，黑方＝钴蓝）。'],
    ko: ['3D 그젤 자기 판', '흰색과 코발트 타일에 윤기 나는 유약을 입힌 그젤 자기 판과, 꽃을 그린 자기 말(백=백자, 흑=코발트)로 표시합니다.'],
    es: ['Tablero 3D de porcelana de Gzhel', 'Un tablero de porcelana de Gzhel con baldosas blancas y cobalto bajo un esmalte brillante, y piezas de porcelana pintadas (blancas: blanco, negras: cobalto).'],
    fr: ['Plateau 3D en porcelaine de Gjel', 'Un plateau en porcelaine de Gjel aux carreaux blancs et cobalt sous un émail brillant, avec des pions en porcelaine peints (Blancs : blanc, Noirs : cobalt).'],
    pt: ['Tabuleiro 3D de porcelana de Gzhel', 'Um tabuleiro de porcelana de Gzhel com azulejos brancos e cobalto sob um esmalte brilhante, e peças de porcelana pintadas (brancas: branco, pretas: cobalto).'],
    de: ['Gschel-Porzellanbrett in 3D', 'Ein Brett aus Gschel-Porzellan mit weißen und kobaltblauen Fliesen unter glänzender Glasur, mit bemalten Porzellansteinen (Weiß: weiß, Schwarz: kobalt).'],
    hi: ['3D ग्ज़ेल पोर्सिलेन बोर्ड', 'चमकदार ग्लेज़ के नीचे सफ़ेद और कोबाल्ट टाइलों वाला ग्ज़ेल पोर्सिलेन बोर्ड, और फूल बने पोर्सिलेन मोहरे (सफ़ेद: सफ़ेद, काला: कोबाल्ट)।'],
    ar: ['رقعة خزف غجيل ثلاثية الأبعاد', 'رقعة من خزف غجيل ببلاطات بيضاء وكوبالتية تحت طلاء لامع، مع قطع خزفية مرسومة (الأبيض: أبيض، الأسود: كوبالت).'],
  };
  const fd = document.getElementById('fDesign');
  if (fd) {
    const p = document.createElement('p'); p.className = 'ug3dnote'; fd.appendChild(p);
    const paint = () => { const l = (document.getElementById('langSel') || {}).value || 'ja', n = NOTE[l] || NOTE.en; p.innerHTML = ''; const b = document.createElement('b'); b.textContent = n[0]; p.append(b, n[1]); };
    paint(); const ls = document.getElementById('langSel'); if (ls) ls.addEventListener('change', () => setTimeout(paint, 30));
  }

  /* ---------- 3D pieces mirrored from the page's pieces ---------- */
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const P3 = new Map();   // square → { g, k }
  let tok = 0;            // a full re-sync cancels running animations
  const xz = i => { let rc; try { rc = dRC(i); } catch (e) { rc = E.RC[i]; } return U.pt(rc[1], rc[0]); };
  const colOf = k => k <= 2 ? 1 : 2;
  const animOk = () => { try { return typeof animOn === 'function' ? animOn() : true; } catch (e) { return true; } };
  const anim = (dur, f, done, my) => { const t0 = performance.now(); (function s(n) { if (my !== undefined && my !== tok) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
  function mk(k, sq) {
    const g = U.piece(colOf(k));
    const sh = T3.contact(U3.R * .95, .5); sh.position.y = .002; g.add(sh); g.userData.sh = sh;
    const [x, z] = xz(sq); g.position.set(x, Y, z); root.add(g); return g;
  }
  function lift(g, h) {
    g.position.y = Y + h; g.userData.h0 = h;
    const sh = g.userData.sh; if (sh) { sh.position.y = .002 - h; const s = 1 + h * .5; sh.scale.set(s, s, s); sh.material.opacity = .5 / (1 + h * 1.4); }
  }
  const hOf = g => g.userData.h0 || 0;
  function drop(g) { if (g.userData.sh) g.userData.sh.material.dispose(); root.remove(g); }
  function land(g, my) { anim(160, k => { const s = 1 + Math.sin(k * Math.PI) * .05; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1), my); }
  function applySel() {
    let els; try { els = pcEls; } catch (e) { return; }
    for (const [i, o] of P3) {
      const el = els.get(i), on = !!(el && el.classList.contains('sel')), g = o.g;
      if (g.userData.moving || on === !!g.userData.up) continue;
      g.userData.up = on; const h0 = hOf(g), h1 = on ? .24 : 0;
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
    applySel(); T3.kick(300);
  }
  // a move as the page animates it: a step glides; a jump chain hops square by square over the pieces it passes
  function travel(m, before) {
    const f = E.mFrom(m), to = E.mTo(m), o = P3.get(f); if (!o) return false;
    const path = E.path(before, m), jump = E.isJump(before, m);
    const my = tok, g = o.g; P3.delete(f); P3.set(to, o);
    g.userData.moving = true; g.userData.up = false;
    const pts = path.map(xz), H = .3, h0 = hOf(g);
    const legT = jump ? path.slice(1).map(() => 230) : [300], dur = legT.reduce((a, b) => a + b, 0);
    anim(dur, k => {
      let r = k * dur, i = 0; while (i < legT.length - 1 && r > legT[i]) { r -= legT[i]; i++; }
      const q = Math.min(1, r / legT[i]), e = jump ? q : io(q), [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
      g.position.x = x0 + (x1 - x0) * e; g.position.z = z0 + (z1 - z0) * e;
      const hh = jump ? Math.sin(q * Math.PI) * .55 + (i === 0 ? h0 * (1 - q) : 0) : (h0 + (H - h0) * Math.min(1, q / .2)) * (q > .8 ? 1 - (q - .8) / .2 : 1);
      lift(g, Math.max(0, hh));
    }, () => { g.userData.moving = false; lift(g, 0); land(g, my); }, my);
    return true;
  }
  const oSync = window.syncPieces;
  window.syncPieces = function () { const r = oSync.apply(this, arguments); try { mirror(); } catch (e) {} return r; };
  const oAnim = window.animateMove;
  window.animateMove = function (m, before) {
    const ok = oAnim.apply(this, arguments);
    if (ok && m !== E.PASS) { try { if (!animOk() || !travel(m, before)) mirror(); } catch (e) { try { mirror(); } catch (x) {} } }
    return ok;
  };
  if (piecesDom) new MutationObserver(() => applySel()).observe(piecesDom, { subtree: true, attributes: true, attributeFilter: ['class'] });
  try { mirror(); } catch (e) {}

  window.__ugSkin = { pieces: () => P3.size, at: i => { const [x, z] = xz(i); return T3.project(x, z, Y); } };
})();
