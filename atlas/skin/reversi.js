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
  if (!THREE || !T3 || typeof window.setDisc !== 'function') return;
  const BASE = '../atlas/', GUIDE = '../images/atlas/g-reversi.webp', GUIDE_FALLBACK = '../images/atlas/reversi.webp';

  /* ---------- 3D table behind the page ---------- */
  const host = document.createElement('div'); host.id = 'atlasGL'; document.body.prepend(host);
  try { T3.mount(host); } catch (e) { document.documentElement.classList.remove('atlas-skin'); host.remove(); return; }
  const board = T3.MODELS.reversi(true), S = board.userData.S, Y = board.userData.top;
  T3.show('reversi', board);
  const boardDom = document.getElementById('board');
  T3.align(() => { const r = boardDom.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, S, Y);

  /* ---------- 3D discs mirrored from the page's setDisc() ---------- */
  const W = T3.M({ color: 0xf3f0e6, roughness: .32, clearcoat: .6, clearcoatRoughness: .25 }), B = T3.M({ color: 0x111215, roughness: .3, clearcoat: .7, clearcoatRoughness: .2 });
  const pos = sq => [T3.cellPos(8, S, sq & 7), T3.cellPos(8, S, sq >> 3)];
  const discs = {};
  const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { const k = Math.min(1, (n - t0) / dur); f(k); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
  function make(sq, color) {
    const g = new THREE.Group(), bot = T3.bevelDisc(.42, .1, B), top = T3.bevelDisc(.42, .1, W);
    top.position.y = .1; g.add(bot, top); g.position.y = -.1;
    const inner = new THREE.Group(); inner.add(g); const outer = new THREE.Group(); outer.add(inner);
    const [x, z] = pos(sq); outer.position.set(x, Y + .1, z); inner.rotation.x = color === 1 ? Math.PI : 0;
    board.add(outer); return (discs[sq] = { outer, inner, color });
  }
  function mirror(s, color, a) {
    const d = discs[s];
    if (!color) { if (d) { board.remove(d.outer); delete discs[s]; } return; }
    if (!d) { const n = make(s, color); if (a === 'drop') anim(260, k => { n.outer.position.y = Y + .1 + (1 - k) * (1 - k) * 2.2; }); return; }
    if (d.color === color) return;
    d.color = color;
    const from = d.inner.rotation.x, to = color === 1 ? Math.PI : 0;
    if (typeof a === 'number' && a >= 0) setTimeout(() => anim(380, k => { const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; d.inner.rotation.x = from + (to - from) * e; d.outer.position.y = Y + .1 + Math.sin(k * Math.PI) * .7; }), a);
    else d.inner.rotation.x = to;
  }
  const orig = window.setDisc;
  window.setDisc = function (s, color, a) { orig(s, color, a); try { mirror(s, color, a); } catch (e) {} };
  try { const c = window.positions && window.positions[window.cur] && window.positions[window.cur].cells; if (c) for (let s = 0; s < 64; s++) if (c[s]) mirror(s, c[s], false); } catch (e) {}
  // the page script may have drawn discs before we hooked in: sync from the DOM too
  document.querySelectorAll('#board .cell').forEach((cell, s) => { const w = cell.querySelector('.disc'); if (w && !discs[s]) mirror(s, w.classList.contains('white') ? 2 : 1, false); });

  /* ---------- guide character: lesson / puzzle text as speech bubbles ---------- */
  const guide = new Image(); guide.src = GUIDE; guide.onerror = () => { guide.src = GUIDE_FALLBACK; };
  document.documentElement.style.setProperty('--atlas-guide', `url("${GUIDE}"), url("${GUIDE_FALLBACK}")`);
  function bubble(ids) {
    const first = document.getElementById(ids[0]); if (!first || first.closest('.atlas-guide')) return;
    const wrap = document.createElement('div'); wrap.className = 'atlas-guide';
    const pic = document.createElement('div'); pic.className = 'pic'; pic.appendChild(guide.cloneNode());
    pic.firstChild.onerror = function () { this.onerror = null; this.src = GUIDE_FALLBACK; };
    const bub = document.createElement('div'); bub.className = 'bub';
    first.parentNode.insertBefore(wrap, first); wrap.append(pic, bub);
    ids.forEach(id => { const e = document.getElementById(id); if (e) bub.appendChild(e); });
    // a little pop whenever the guide says something new
    new MutationObserver(() => { if (!bub.animate) return; bub.animate([{ transform: 'scale(.96)' }, { transform: 'scale(1.02)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' }); pic.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-6px)' }, { transform: 'translateY(0)' }], { duration: 300 }); })
      .observe(bub, { childList: true, characterData: true, subtree: true });
  }
  bubble(['lsPrompt', 'lsFb']);
  bubble(['pzGoal', 'pzStatus']);

  /* ---------- the per-game profile prompt is replaced by the portal's shared account ---------- */
  const pf = document.getElementById('profOverlay');
  if (pf) { const shut = () => { if (pf.classList.contains('show')) { const b = document.getElementById('pfLater'); if (b) b.click(); } }; new MutationObserver(shut).observe(pf, { attributes: true, attributeFilter: ['class'] }); shut(); }

  /* ---------- the page's home button goes back to the portal ---------- */
  document.querySelectorAll('a.snd.home, .brand a.series').forEach(a => { a.href = BASE; });
})();
