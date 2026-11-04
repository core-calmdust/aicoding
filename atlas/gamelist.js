/* Games tab: a visual game list — a real play screenshot per game, the name and a few feature icons,
   grouped by category. The long description lives in the board sheet that opens on tap.
   Thumbnails: atlas/shots/<id>.webp (520×390), made by tools/shots.js — add the id to SHOTS when a new one lands. */
(function () {
  'use strict';
  const SHOTS = new Set(['shogi', 'chess', 'checkers', 'ugolki', 'fanorona', 'alquerque', 'xiangqi', 'tafl', 'reversi', 'go', 'gomoku', 'dots', 'connect4', 'morris', 'hex',
    'mancala', 'backgammon', 'sudoku', 'speedsudoku', 'samegame', 'jailbreak', 'poker', 'baccarat', 'blackjack', 'solitaire']);
  const SHOT_V = 1;                                   // bump after regenerating the thumbnails
  const FX = ['ai', 'online', 'lessons', 'puzzles'];  // the feature icons shown on a card (labels come from the tag.* strings)

  /* c: { t, esc, gname, about(g) → the long description (hover tooltip), art(g), badge(g) → html, pct(g) → 0..100, tags (A_.TAGS), cats (category order), group (bool) } */
  function card(g, c) {
    const fx = FX.filter(k => g.tags.includes(k) && c.tags[k]).map(k => { const T = c.tags[k], l = c.esc(c.t('tag.' + k));
      return `<i class="fx" style="--c:${T.c}" role="img" aria-label="${l}" title="${l}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${T.i}"/></svg></i>`; }).join('');
    const pct = c.pct(g), b = c.badge(g), shot = SHOTS.has(g.id);
    const about = c.about ? c.about(g) : '';
    return `<a class="glc" href="../${g.href}" data-open="${g.id}" style="--c:${g.color}"${about ? ` title="${c.esc(about)}"` : ''}>
      <span class="sh${shot ? '' : ' noshot'}">${shot ? `<img class="ss" src="shots/${g.id}.webp?v=${SHOT_V}" width="520" height="390" alt="" loading="lazy" decoding="async">` : ''}
        <span class="g3m">${c.art(g)}</span>${b ? `<span class="bd">${b}</span>` : ''}${pct > 0 ? `<span class="pr"><i style="width:${pct}%"></i></span>` : ''}</span>
      <span class="mt"><b class="n">${c.esc(c.gname(g))}</b>${fx ? `<span class="fxs">${fx}</span>` : ''}</span></a>`;
  }
  function render(root, list, c) {
    root.className = 'glist';
    const grp = g => g.tags.includes('card') ? 'card' : g.cat;   // solitaire sits with the card games here
    const cats = [...c.cats, ...new Set(list.map(grp).filter(k => !c.cats.includes(k)))];
    const groups = cats.map(k => [k, list.filter(g => grp(g) === k)]).filter(([, a]) => a.length);
    const head = c.group && groups.length > 1;
    root.innerHTML = groups.map(([k, a]) => `<section class="glg">${head ? `<h3 class="glh"><span>${c.esc(c.t('cat.' + k))}</span><em>${a.length}</em></h3>` : ''}
      <div class="glgrid">${a.map(g => card(g, c)).join('')}</div></section>`).join('');
  }
  window.AtlasGameList = { render, SHOTS };
})();
