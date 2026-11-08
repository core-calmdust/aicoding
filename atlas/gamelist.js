/* Games tab: a visual game list — a real play screenshot per game, the name and a few feature icons,
   grouped by category, with a one-line tagline and ルール / ヒストリア buttons. The long description is in the board sheet a tap opens.
   Thumbnails: atlas/shots/<id>.webp (520×390), made by tools/shots.js — add the id to SHOTS when a new one lands. */
(function () {
  'use strict';
  const SHOTS = new Set(['shogi', 'chess', 'checkers', 'ugolki', 'fanorona', 'alquerque', 'xiangqi', 'janggi', 'tafl', 'reversi', 'go', 'gomoku', 'dots', 'connect4', 'morris', 'hex',
    'mancala', 'backgammon', 'sudoku', 'speedsudoku', 'samegame', 'jailbreak', 'poker', 'baccarat', 'blackjack', 'solitaire', 'ur', 'agon', 'konane', 'senet', 'ludo', 'carrom']);
  const SHOT_V = 8;                                   // bump after regenerating the thumbnails
  const FX = ['ai', 'online', 'lessons', 'puzzles'];  // the feature icons shown on a card (labels come from the tag.* strings)

  const IC = {   // small line icons for the footer buttons
    rules: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5zM12 6v13.5"/></svg>',
    hist: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20h14M6 20V10M10 20V10M14 20V10M18 20V10M4 10h16M12 3l8 4.5H4z"/></svg>',
  };
  /* c: { t, esc, gname, about(g) → the long description (hover tooltip), tl(g) → one-line tagline, art(g), badge(g) → html, pct(g) → 0..100,
          tags (A_.TAGS), cats (category order), group (false = no headings), hasRules(g), onRules(id), onHistoria(id) } */
  function card(g, c) {
    const fx = FX.filter(k => g.tags.includes(k) && c.tags[k]).map(k => { const T = c.tags[k], l = c.esc(c.t('tag.' + k));
      return `<i class="fx" style="--c:${T.c}" role="img" aria-label="${l}" title="${l}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${T.i}"/></svg></i>`; }).join('');
    const pct = c.pct(g), b = c.badge(g), shot = SHOTS.has(g.id);
    const about = c.about ? c.about(g) : '', tl = c.tl ? c.tl(g) : '';
    // ルール (the 3D rules tour, or the 2D game opened on its rules via ?rules=1) · ヒストリア (once window.Historia exists)
    const btn = (k, ic, lbl) => `<button type="button" class="glb" data-${k}="${g.id}">${ic}<span>${c.esc(lbl)}</span></button>`;
    const btns = (c.hasRules && c.hasRules(g) ? btn('rules', IC.rules, c.t('bv.rules')) : '') + (window.Historia && (!Historia.has || Historia.has(g.id)) ? btn('hist', IC.hist, c.t('gl.historia')) : '');
    return `<div class="glc" style="--c:${g.color}"><a class="glk" href="../${g.href}" data-open="${g.id}"${about ? ` title="${c.esc(about)}"` : ''}>
      <span class="sh${shot ? '' : ' noshot'}">${shot ? `<img class="ss" src="shots/${g.id}.webp?v=${SHOT_V}" width="520" height="390" alt="" loading="lazy" decoding="async">` : ''}
        <span class="g3m">${c.art(g)}</span>${b ? `<span class="bd">${b}</span>` : ''}${pct > 0 ? `<span class="pr"><i style="width:${pct}%"></i></span>` : ''}</span>
      <span class="mt"><b class="n">${c.esc(c.gname(g))}</b>${tl ? `<span class="tl">${c.esc(tl)}</span>` : ''}</span></a>
      <div class="ft"><span class="fxs">${fx}</span>${btns ? `<span class="glbs">${btns}</span>` : ''}</div></div>`;
  }
  function render(root, list, c) {
    root.className = 'glist';
    const grp = g => g.tags.includes('card') ? 'card' : g.cat;   // solitaire sits with the card games here
    const cats = [...c.cats, ...new Set(list.map(grp).filter(k => !c.cats.includes(k)))];
    const groups = cats.map(k => [k, list.filter(g => grp(g) === k)]).filter(([, a]) => a.length);
    // a category heading over every group, whatever the chip or search (counts are of the shown games); group: false turns them off
    const head = c.group !== false && groups.length > 0;
    root.innerHTML = groups.map(([k, a]) => `<section class="glg">${head ? `<h3 class="glh"><span>${c.esc(c.t('cat.' + k))}</span><em>${a.length}</em></h3>` : ''}
      <div class="glgrid">${a.map(g => card(g, c)).join('')}</div></section>`).join('');
    // the footer buttons act on their own (the card's link is a sibling, so they never open it)
    root.querySelectorAll('[data-rules]').forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); c.onRules && c.onRules(b.dataset.rules); });
    root.querySelectorAll('[data-hist]').forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); if (window.Historia) (c.onHistoria ? c.onHistoria(b.dataset.hist) : Historia.open(b.dataset.hist)); });
    if (root.offsetParent) watchFit(root); else requestAnimationFrame(() => root.offsetParent && watchFit(root));
  }
  // keep every name and tagline on one line: tighter letter-spacing, then a smaller size, then (last resort) the CSS ellipsis.
  // Reads all, then writes all (two passes per step), so it costs a few layouts per render / resize, not one per card.
  const FIT = ['fit1', 'fit2', 'fit3', 'fit4'];
  const PAREN = /\s*[(（].*[)）]\s*$/;   // 「シャンチー（中国象棋）」→「シャンチー」 when even the smallest step does not fit
  // cut = the text is wider than its box (measured on the text itself: scrollWidth rounds away the sub-pixel overflow that still shows "…")
  const RNG = document.createRange();
  const cut = e => { if (e.scrollWidth > e.clientWidth + 1) return true; RNG.selectNodeContents(e); return RNG.getBoundingClientRect().width > e.clientWidth + .25; };
  function steps(over) {   // tighter → smaller, in batches
    for (const k of FIT) {
      if (!over.length) break;
      over.forEach(e => { e.classList.remove(...FIT); e.classList.add(k); });
      over = over.filter(cut);
    }
    return over;
  }
  function fit(root) {
    const els = [...root.querySelectorAll('.glc .n, .glc .tl, .glc .glb span')];
    els.forEach(e => { e.classList.remove(...FIT); if (e.dataset.full) { e.textContent = e.dataset.full; e.removeAttribute('title'); delete e.dataset.full; } });
    let over = steps(els.filter(cut));
    const sh = over.filter(e => PAREN.test(e.textContent));
    sh.forEach(e => { e.dataset.full = e.title = e.textContent; e.textContent = e.textContent.replace(PAREN, ''); e.classList.remove(...FIT); });
    if (sh.length) steps(sh.filter(cut));
    return over.filter(cut);   // still cut (ellipsis)
  }
  let fitRoot = null, rzT = 0;
  function watchFit(root) {
    if (fitRoot) { fit(root); return; }
    fitRoot = root; fit(root);
    addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => fitRoot.isConnected && fit(fitRoot), 150); });
    if (document.fonts) {   // web fonts change the widths (the Arabic / Devanagari faces load only when a language first needs them)
      if (document.fonts.ready) document.fonts.ready.then(() => fit(fitRoot));
      document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', () => { clearTimeout(rzT); rzT = setTimeout(() => fitRoot.isConnected && fit(fitRoot), 50); });
    }
  }
  /* a game's name as a heading (the board sheet): always shown in full — step the size down to fit one line,
     then (still too long) two balanced lines at a smaller size; never an ellipsis. Refits when its width changes. */
  const TRO = window.ResizeObserver && new ResizeObserver(es => es.forEach(e => { const w = Math.round(e.contentRect.width); if (w && w !== e.target._tw) { e.target._tw = w; fitTitleNow(e.target); } }));
  function fitTitleNow(el) {
    if (!el || !el.isConnected) return;
    el.classList.remove('tf2'); el.style.fontSize = '';
    const base = parseFloat(getComputedStyle(el).fontSize), min = Math.max(12, base * .66);
    if (!(el.clientWidth > 0)) return;
    let f = base;
    while (el.scrollWidth > el.clientWidth + 1 && f > min) { f = Math.max(min, f - Math.max(1, base * .05)); el.style.fontSize = f + 'px'; }
    if (el.scrollWidth > el.clientWidth + 1) { el.style.fontSize = Math.max(12, base * .78) + 'px'; el.classList.add('tf2'); }
  }
  let lastT = null;
  function fitTitle(el) {
    if (!el) return; el.classList.add('tfit'); fitTitleNow(el);
    if (TRO) { if (lastT && lastT !== el) TRO.unobserve(lastT); lastT = el; el._tw = 0; TRO.observe(el); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitTitleNow(el));
  }
  // small clamped labels (the home icon grid): a step or two smaller, then the name without its bracketed gloss — no "…"
  function fitLabels(els) {
    const over = e => e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 2;
    [...els].forEach(e => {
      e.style.fontSize = ''; if (e.dataset.full) { e.textContent = e.dataset.full; delete e.dataset.full; }
      if (!e.offsetParent || !over(e)) return;
      const base = parseFloat(getComputedStyle(e).fontSize);
      for (let f = base - .5; f >= Math.max(8, base * .78) && over(e); f -= .5) e.style.fontSize = f + 'px';
      if (over(e) && PAREN.test(e.textContent)) { e.dataset.full = e.textContent; e.textContent = e.textContent.replace(PAREN, ''); e.style.fontSize = ''; if (over(e)) for (let f = base - .5; f >= Math.max(8, base * .78) && over(e); f -= .5) e.style.fontSize = f + 'px'; }
    });
  }
  /* a paragraph that fills the height its box is given (flex): all of it when it fits, otherwise as many whole lines as fit, then "…".
     Refits when the box changes size (window, fonts, the card next to it). */
  const CRO = window.ResizeObserver && new ResizeObserver(es => es.forEach(e => { const k = Math.round(e.contentRect.width) + 'x' + Math.round(e.contentRect.height); if (k !== e.target._ck) { e.target._ck = k; clampNow(e.target); } }));
  let lastC = null;
  function clampNow(el) {
    if (!el || !el.isConnected) return;
    el.style.webkitLineClamp = ''; el.classList.remove('clamp');
    if (el.scrollHeight <= el.clientHeight + 1) return;
    const lh = parseFloat(getComputedStyle(el).lineHeight) || 20, n = Math.max(1, Math.floor((el.clientHeight + 1) / lh));
    el.classList.add('clamp'); el.style.webkitLineClamp = String(n);
  }
  function clampFit(el) {
    if (!el) return; clampNow(el);
    if (CRO) { if (lastC && lastC !== el) CRO.unobserve(lastC); lastC = el; el._ck = ''; CRO.observe(el); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => clampNow(el));
  }
  /* board sheet (PC): ヒストリア leaves the feature-tag row and sits under ルール + the progress ring, spanning that block,
     so the two read as the actions next to the title; the tags become a quiet single line with "+N" (tap to show all). */
  function sheetActions(bvi, t) {
    if (!bvi) return;
    const row = bvi.querySelector('.L .row'), hs = bvi.querySelector('.L .tags .hstag'), tags = bvi.querySelector('.L .tags');
    // games played on their own page (no 3D board: only 「あそぶ」 on the right): ヒストリアを見る goes right under あそぶ, full width,
    // on PC and phone alike (on phones it replaces the top-left pill there)
    const play = bvi.querySelector('.R .act > a.btn.big'), solo = play && !bvi.querySelector('#bvStart, #bvFull, #bvTable');
    const pill = document.getElementById('bvHist'), hasH = window.Historia && pill && pill.style.display !== 'none';
    document.getElementById('bv') && document.getElementById('bv').classList.toggle('hsin', !!(solo && hasH));
    if (solo) {
      if (hs) hs.remove();
      if (hasH && !bvi.querySelector('.hsplay')) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn big2 hsplay';
        b.innerHTML = `<span class="hb-ic">${(pill.querySelector('.hb-ic') || {}).innerHTML || ''}</span><b>${(window.ATLAS_I18N && t ? t('gl.histSee') : '') || (pill.querySelector('b') || {}).textContent || 'Historia'}</b>`;
        b.setAttribute('aria-label', pill.getAttribute('aria-label') || '');
        b.onclick = () => pill.click();
        play.parentNode.classList.add('act-hs'); play.after(b);
      }
      return sheetTags(tags);
    }
    if (row && hs && !row.querySelector('.bvact')) {
      const act = document.createElement('div'), top = document.createElement('div'); act.className = 'bvact'; top.className = 'bvact-t';
      const rules = row.querySelector('#bvRules'), ring = row.querySelector('.ring');
      if (rules) top.appendChild(rules); if (ring) top.appendChild(ring);
      act.append(top, hs); row.appendChild(act);
    }
    sheetTags(tags);
  }
  function sheetTags(tags) {
    if (tags && !tags.dataset.one && matchMedia('(min-width: 820px)').matches) {
      tags.dataset.one = '1'; tags.classList.add('one');
      const all = [...tags.children], more = document.createElement('button'); more.type = 'button'; more.className = 'tgmore';
      const lay = () => {
        all.forEach(e => { e.hidden = false; }); more.remove(); tags.classList.remove('open');
        if (tags.scrollWidth <= tags.clientWidth + 1) return;
        tags.appendChild(more); let n = 0;
        for (let i = all.length - 1; i > 0 && tags.scrollWidth > tags.clientWidth + 1; i--) { all[i].hidden = true; n++; more.textContent = '+' + n; }
        more.setAttribute('aria-label', all.filter(e => e.hidden).map(e => e.textContent.trim()).join(', '));
        more.title = more.getAttribute('aria-label');
      };
      more.onclick = e => { e.stopPropagation(); all.forEach(x => { x.hidden = false; }); more.remove(); tags.classList.add('open'); };
      lay(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!tags.classList.contains('open')) lay(); });
    }
  }
  window.AtlasGameList = { render, fit, fitTitle, fitLabels, clampFit, sheetActions, SHOTS };
})();
