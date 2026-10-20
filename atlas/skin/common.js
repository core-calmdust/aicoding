/* =====================================================================
   World Board Game Atlas — shared part of the portal skins (<game>/?skin=atlas)
   AtlasSkin.init(opts) sets up everything that isn't game specific:
     • the 3D table behind the page (Table3D.mount, plain tabletop)
     • the guide character + speech bubbles for lesson / puzzle text
     • the portal's top bar (logo, coins, sound, language, home)
     • the dark → light colour conversion of the game's stylesheet
     • the side column fitted to the board, idle pausing, loading screen,
       and auto-start with the level / side picked on the portal
   opts = { board: <DOM board>, outer(r) → {top, height} of the 3D board on screen,
            guide: img url, guideFallback, bubbles: [[id, id], …], skip: RegExp,
            start(lv, side) → true when it started a game }
   ===================================================================== */
(function () {
  'use strict';
  const BASE = '../atlas/';
  function init(o) {
    const T3 = window.Table3D;
    const host = document.createElement('div'); host.id = 'atlasGL'; document.body.prepend(host);
    try { T3.mount(host, { plain: true }); } catch (e) { document.documentElement.classList.remove('atlas-skin'); host.remove(); if (window.AtlasLoading) AtlasLoading.hide(); return null; }
    const boardDom = o.board, GUIDE = o.guide, GUIDE_FALLBACK = o.guideFallback || o.guide;

  /* ---------- guide character: lesson / puzzle text as speech bubbles ---------- */
  const guide = new Image(); guide.src = GUIDE; guide.onerror = () => { guide.src = GUIDE_FALLBACK; };
  document.documentElement.style.setProperty('--atlas-guide', `url("${GUIDE}"), url("${GUIDE_FALLBACK}")`);
  function bubble(ids) {
    const first = document.getElementById(ids[0]); if (!first || first.closest('.atlas-guide')) return;
    const wrap = document.createElement('div'); wrap.className = 'atlas-guide';
    const pic = document.createElement('div'); pic.className = 'pic'; pic.appendChild(guide.cloneNode());
    pic.firstChild.onerror = function () { this.onerror = null; this.src = GUIDE_FALLBACK; };
    const bub = document.createElement('div'); bub.className = 'bub';
    // the bubble sits where the text was; the guide stands below it, in one footer row with all the card's buttons
    first.parentNode.insertBefore(wrap, first); wrap.append(bub);
    ids.forEach(id => { const e = document.getElementById(id); if (e) bub.appendChild(e); });
    const card = wrap.closest('.card'), rows = card ? [...card.querySelectorAll(':scope > .lesson-actions')] : [];
    const foot = document.createElement('div'); foot.className = 'atlas-foot';
    const btns = document.createElement('div'); btns.className = 'atlas-btns';
    rows.forEach(r => { [...r.children].forEach(b => btns.appendChild(b)); r.remove(); });
    foot.append(pic, btns); (card || wrap).appendChild(foot);
    // a little pop whenever the guide says something new
    new MutationObserver(() => { if (!bub.animate) return; if (!pic.getAnimations || !pic.getAnimations().some(x => x.id === 'talk')) { const an = pic.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-6px) scale(1.05,.95)' }, { transform: 'translateY(0) scale(1)' }], { duration: 320 }); an.id = 'talk'; } })
      .observe(bub, { childList: true, characterData: true, subtree: true });
  }
    (o.bubbles || []).forEach(bubble);

  /* ---------- the per-game profile prompt is replaced by the portal's shared account ---------- */
  const pf = document.getElementById('profOverlay');
  if (pf) { const shut = () => { if (pf.classList.contains('show')) { const b = document.getElementById('pfLater'); if (b) b.click(); } }; new MutationObserver(shut).observe(pf, { attributes: true, attributeFilter: ['class'] }); shut(); }

  /* ---------- idle: pause CSS/SVG animations while the tab is hidden or the window isn't focused ---------- */
  (function idle() {
    const st = document.createElement('style'); st.textContent = 'html.atlas-idle *,html.atlas-idle *::before,html.atlas-idle *::after{animation-play-state:paused!important}'; document.head.appendChild(st);
    const set = () => { const on = document.hidden || !document.hasFocus(); document.documentElement.classList.toggle('atlas-idle', on); document.querySelectorAll('svg').forEach(s => { try { on ? s.pauseAnimations() : s.unpauseAnimations(); } catch (e) {} }); };
    document.addEventListener('visibilitychange', set); addEventListener('blur', set); addEventListener('focus', set);
  })();
  /* ---------- light theme: convert the game's dark-theme colours rule by rule ---------- */
  (function retheme() {
    const SKIP = new RegExp('\\b(board|cell|disc|ghost|hint|star|last-mark|odot|sqlbl|edgeband|fx-|confetti|overlay\\b|coach|toast|atlas-' + (o.skip ? '|' + o.skip : '') + ')');
    const parse = v => { let m = v.match(/rgba?\(([^)]+)\)/); if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; } m = v.match(/^#([0-9a-f]{3,8})$/i); if (m) { let h = m[1]; if (h.length <= 4) h = h.split('').map(c => c + c).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length > 6 ? parseInt(h.slice(6, 8), 16) / 255 : 1]; } return null; };
    const lum = ([r, g, b]) => (.2126 * r + .7152 * g + .0722 * b) / 255, sat = ([r, g, b]) => (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    const rgba = (r, g, b, a) => `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${+a.toFixed(3)})`;
    const fg = c => { if (lum(c) < .5) return null; if (sat(c) > .25) return rgba(c[0] * .62, c[1] * .55, c[2] * .45, Math.max(.85, c[3])); return rgba(43, 48, 68, Math.max(.62, c[3])); };
    const bg = c => { const L = lum(c);
      if (L > .85 && c[3] < .35) return rgba(150, 100, 40, Math.min(.22, c[3] * 1.8 + .04));    // faint white tint → warm tint
      if (L < .3 && c[3] > .55) return rgba(255, 252, 244, c[3]);                                  // dark panel → cream
      if (L < .3 && c[3] <= .55) return rgba(120, 80, 30, c[3] * .35);                             // dark wash → light warm wash
      return null; };
    const bd = c => { if (lum(c) > .6 && c[3] < .5) return rgba(150, 110, 50, Math.min(.5, c[3] * 2 + .1)); if (lum(c) < .3) return rgba(220, 196, 150, Math.max(.6, c[3])); return null; };
    for (const sh of document.styleSheets) {
      let rules; try { rules = sh.cssRules; } catch (e) { continue; }
      if (!rules || (sh.href && /skin\.css/.test(sh.href))) continue;
      const walk = list => { for (const r of list) {
        if (r.cssRules && !r.selectorText) { walk(r.cssRules); continue; }
        if (!r.style || !r.selectorText || SKIP.test(r.selectorText)) continue;
        const st = r.style;
        const c = st.getPropertyValue('color'); if (c) { const p = parse(c.trim()); const n = p && fg(p); if (n) st.setProperty('color', n, st.getPropertyPriority('color')); }
        const b = st.getPropertyValue('background-color') || (/^\s*(rgba?\(|#)[^,]*$/.test(st.getPropertyValue('background')) ? st.getPropertyValue('background') : '');
        if (b) { const p = parse(b.trim()); const n = p && bg(p); if (n) st.setProperty('background', n, st.getPropertyPriority('background')); }
        ['border-color', 'border-top-color', 'border-bottom-color', 'border-left-color', 'border-right-color'].forEach(k => { const v = st.getPropertyValue(k); if (v) { const p = parse(v.trim()); const n = p && bd(p); if (n) st.setProperty(k, n); } });
      } };
      walk(rules);
    }
  })();

  /* ---------- side column = exactly the height of the 3D board; info line inside the kifu card ---------- */
  (function sideFit() {
    const side = document.querySelector('.side'), kc = document.querySelector('.kifu-card'), info = document.getElementById('infoLine');
    if (kc && info) kc.appendChild(info);
    if (!side || !o.outer) return;
    const fit = () => {
      side.style.top = ''; side.style.height = ''; side.style.maxHeight = '';
      const r = boardDom.getBoundingClientRect(), s = side.getBoundingClientRect();
      if (!r.width || s.left < r.right - 4 || getComputedStyle(side).display === 'contents') return;   // only when the column sits beside the board
      const B = o.outer(r);
      side.style.position = 'relative'; side.style.top = (B.top - s.top) + 'px'; side.style.height = B.height + 'px'; side.style.maxHeight = 'none';
    };
    addEventListener('resize', () => requestAnimationFrame(fit));
    if (window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(fit)).observe(boardDom);
    fit(); setTimeout(fit, 120); setTimeout(fit, 600); setTimeout(fit, 1200); if (document.fonts) document.fonts.ready.then(fit);
  })();
  // the board is drawn and the game is set up → lift the "loading" overlay (after a couple of rendered frames)
  function ready(waitStart) {
    const t0 = performance.now();
    const f = () => {   // wait until the new-game dialog has really closed (the start can take a moment), then a few settled frames
      if (waitStart && document.querySelector('#newOverlay.show') && performance.now() - t0 < 6000) return setTimeout(f, 120);
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => { if (window.AtlasLoading) AtlasLoading.hide(); }, 450)));
    };
    setTimeout(f, 250);
  }   // let fonts, the side column fit and the first frames settle
  /* ---------- opened from the portal with a level / side: start right away ---------- */
  (function autoStart() {
    const q = new URLSearchParams(location.search), lv = +q.get('lv'), side = +q.get('side');
    if ((!lv && !side) || !o.start) { ready(false); return; }
    let tries = 0;
    const go = () => {
      let ok = false; try { ok = o.start(lv, side); } catch (e) { ok = true; }
      if (ok === null && ++tries < 40) return setTimeout(go, 150);   // the page isn't ready yet
      ready(true);
      q.delete('lv'); q.delete('side'); history.replaceState(null, '', location.pathname + '?' + q.toString() + location.hash);   // a reload doesn't restart
    };
    setTimeout(go, 400);
  })();
  /* ---------- the portal's top bar: logo, coins, language, home (same layout as the portal) ---------- */
    const lang = () => (document.getElementById('langSel') || {}).value || 'ja';
    const TITLE = { ja: '世界のボドゲ大全', en: 'World Board Game Atlas', zh: '世界桌游大全', ko: '세계의 보드게임 대전', es: 'Atlas de Juegos de Mesa', fr: 'Atlas des jeux de société', pt: 'Atlas de Jogos de Tabuleiro', de: 'Brettspiel-Atlas', hi: 'विश्व बोर्ड गेम एटलस', ar: 'أطلس ألعاب الطاولة' };
    const bar = document.createElement('header'); bar.className = 'atlas-top';
    bar.innerHTML = `<a class="atlas-brand" href="${BASE}"><img src="${BASE}logo.svg" alt="" width="44" height="44"><span><b class="wmT"></b><small>World Board Game Atlas</small></span></a><span class="sp"></span>
      <span class="atlas-coin"><i>¢</i><b class="coinN">0</b></span>
      <button type="button" class="atlas-ic" id="atlasSnd" aria-label="Sound"></button>
      <button type="button" class="atlas-lbtn" id="atlasLang" aria-label="Language"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg><b class="lc">JA</b></button>
      <div class="atlas-lpop" id="atlasLangPop" hidden></div>
      <a class="atlas-ic" href="${BASE}" aria-label="Portal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5h4v5"/></svg></a>`;
    document.body.appendChild(bar);
    // sound: reuse the game's own button
    const snd = document.getElementById('btnSound'), mySnd = bar.querySelector('#atlasSnd');
    if (snd) { mySnd.innerHTML = snd.innerHTML; mySnd.onclick = () => { snd.click(); mySnd.className = 'atlas-ic ' + snd.className.replace(/\bsnd\b/, ''); }; mySnd.className = 'atlas-ic ' + snd.className.replace(/\bsnd\b/, ''); } else mySnd.remove();
    const sel = document.getElementById('langSel'), pop = bar.querySelector('#atlasLangPop'), lbtn = bar.querySelector('#atlasLang');
    const NAMES = { ja: 'Japanese', en: 'English', zh: 'Chinese', ko: 'Korean', es: 'Spanish', fr: 'French', pt: 'Portuguese', de: 'German', hi: 'Hindi', ar: 'Arabic' };
    const paint = () => { bar.querySelector('.wmT').textContent = TITLE[lang()] || TITLE.en; bar.querySelector('.atlas-brand small').hidden = lang() === 'en'; bar.querySelector('.lc').textContent = lang().toUpperCase(); };
    lbtn.onclick = e => { e.stopPropagation(); if (!pop.hidden) { pop.hidden = true; return; }
      pop.innerHTML = [...sel.options].map(o => `<button type="button" data-l="${o.value}" aria-selected="${o.value === lang()}"><b>${o.text}</b><small>${o.value.toUpperCase()} · ${NAMES[o.value]}</small></button>`).join('');
      pop.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { pop.hidden = true; if (sel.value !== b.dataset.l) { sel.value = b.dataset.l; sel.dispatchEvent(new Event('change')); } setTimeout(paint, 50); });
      pop.hidden = false; };
    document.addEventListener('click', e => { if (!pop.hidden && !pop.contains(e.target)) pop.hidden = true; });
    if (sel) sel.addEventListener('change', () => setTimeout(paint, 50));
    paint();
    // coins: same numbers as the portal (shared/atlas.js)
    const coins = () => { try { const A = window.Atlas; if (!A) return; const W = A.load(); bar.querySelector('.coinN').textContent = A.coins(W, A.achievements(A.allProgress(), W)).balance.toLocaleString(); } catch (e) {} };
    setTimeout(coins, 300); document.addEventListener('visibilitychange', () => { if (!document.hidden) coins(); });
    document.querySelectorAll('a.snd.home, .brand a.series').forEach(a => { a.href = BASE; });
    return { T3, ready };
  }
  window.AtlasSkin = { init };
})();
