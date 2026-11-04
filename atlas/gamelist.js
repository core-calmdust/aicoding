/* Games tab: a visual game list — a real play screenshot per game, the name and a few feature icons,
   grouped by category, with a one-line tagline and ルール / ヒストリア buttons. The long description is in the board sheet a tap opens.
   Thumbnails: atlas/shots/<id>.webp (520×390), made by tools/shots.js — add the id to SHOTS when a new one lands. */
(function () {
  'use strict';
  const SHOTS = new Set(['shogi', 'chess', 'checkers', 'ugolki', 'fanorona', 'alquerque', 'xiangqi', 'tafl', 'reversi', 'go', 'gomoku', 'dots', 'connect4', 'morris', 'hex',
    'mancala', 'backgammon', 'sudoku', 'speedsudoku', 'samegame', 'jailbreak', 'poker', 'baccarat', 'blackjack', 'solitaire']);
  const SHOT_V = 3;                                   // bump after regenerating the thumbnails
  const FX = ['ai', 'online', 'lessons', 'puzzles'];  // the feature icons shown on a card (labels come from the tag.* strings)

  const IC = {   // small line icons for the footer buttons
    rules: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5zM12 6v13.5"/></svg>',
    hist: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20h14M6 20V10M10 20V10M14 20V10M18 20V10M4 10h16M12 3l8 4.5H4z"/></svg>',
  };
  /* c: { t, esc, gname, about(g) → the long description (hover tooltip), tl(g) → one-line tagline, art(g), badge(g) → html, pct(g) → 0..100,
          tags (A_.TAGS), cats (category order), group (bool), hasRules(g), onRules(id), onHistoria(id) } */
  function card(g, c) {
    const fx = FX.filter(k => g.tags.includes(k) && c.tags[k]).map(k => { const T = c.tags[k], l = c.esc(c.t('tag.' + k));
      return `<i class="fx" style="--c:${T.c}" role="img" aria-label="${l}" title="${l}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${T.i}"/></svg></i>`; }).join('');
    const pct = c.pct(g), b = c.badge(g), shot = SHOTS.has(g.id);
    const about = c.about ? c.about(g) : '', tl = c.tl ? c.tl(g) : '';
    // ルール (the portal's rules tour, where the game has one) · ヒストリア (once window.Historia exists)
    const btn = (k, ic, lbl) => `<button type="button" class="glb" data-${k}="${g.id}">${ic}<span>${c.esc(lbl)}</span></button>`;
    const btns = (c.hasRules && c.hasRules(g) ? btn('rules', IC.rules, c.t('bv.rules')) : '') + (window.Historia ? btn('hist', IC.hist, c.t('gl.historia')) : '');
    return `<div class="glc" style="--c:${g.color}"><a class="glk" href="../${g.href}" data-open="${g.id}"${about ? ` title="${c.esc(about)}"` : ''}>
      <span class="sh${shot ? '' : ' noshot'}">${shot ? `<img class="ss" src="shots/${g.id}.webp?v=${SHOT_V}" width="520" height="390" alt="" loading="lazy" decoding="async">` : ''}
        <span class="g3m">${c.art(g)}</span>${b ? `<span class="bd">${b}</span>` : ''}${pct > 0 ? `<span class="pr"><i style="width:${pct}%"></i></span>` : ''}</span>
      <span class="mt"><b class="n">${c.esc(c.gname(g))}</b>${tl ? `<span class="tl">${c.esc(tl)}</span>` : ''}</span></a>
      ${fx || btns ? `<div class="ft">${fx ? `<span class="fxs">${fx}</span>` : ''}${btns ? `<span class="glbs">${btns}</span>` : ''}</div>` : ''}</div>`;
  }
  function render(root, list, c) {
    root.className = 'glist';
    const grp = g => g.tags.includes('card') ? 'card' : g.cat;   // solitaire sits with the card games here
    const cats = [...c.cats, ...new Set(list.map(grp).filter(k => !c.cats.includes(k)))];
    const groups = cats.map(k => [k, list.filter(g => grp(g) === k)]).filter(([, a]) => a.length);
    const head = c.group && groups.length > 1;
    root.innerHTML = groups.map(([k, a]) => `<section class="glg">${head ? `<h3 class="glh"><span>${c.esc(c.t('cat.' + k))}</span><em>${a.length}</em></h3>` : ''}
      <div class="glgrid">${a.map(g => card(g, c)).join('')}</div></section>`).join('');
    // the footer buttons act on their own (the card's link is a sibling, so they never open it)
    root.querySelectorAll('[data-rules]').forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); c.onRules && c.onRules(b.dataset.rules); });
    root.querySelectorAll('[data-hist]').forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); if (window.Historia) (c.onHistoria ? c.onHistoria(b.dataset.hist) : Historia.open(b.dataset.hist)); });
  }
  window.AtlasGameList = { render, SHOTS };
})();
