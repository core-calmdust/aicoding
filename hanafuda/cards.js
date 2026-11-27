/* 花札の札の絵 (hanafuda/cards.js)
   Finished art (img/cards/<name>.webp) for the cards whose design is done; the rest use a provisional face
   (month plant + card kind) until the full deck is approved. */
(function (root) {
  'use strict';
  const NAMES = ["matsu-tsuru", "jan-tanzaku", "jan-kasu1", "jan-kasu2", "feb-tane", "feb-tanzaku", "feb-kasu1", "feb-kasu2", "mar-hikari", "mar-tanzaku", "mar-kasu1", "mar-kasu2", "apr-tane", "apr-tanzaku", "apr-kasu1", "apr-kasu2", "may-tane", "may-tanzaku", "may-kasu1", "may-kasu2", "jun-tane", "jun-tanzaku", "jun-kasu1", "jun-kasu2", "jul-tane", "jul-tanzaku", "jul-kasu1", "jul-kasu2", "aug-hikari", "aug-tane", "aug-kasu1", "aug-kasu2", "kiku-sakazuki", "sep-tanzaku", "sep-kasu1", "sep-kasu2", "oct-tane", "oct-tanzaku", "oct-kasu1", "oct-kasu2", "yanagi-michikaze", "nov-tane", "nov-tanzaku", "nov-kasu", "kiri-houou", "dec-kasu1", "dec-kasu3", "dec-kasu2"];
  const READY = new Set(NAMES);   // pictures that exist (all 48 once the deck is done)
  const ART = {}; NAMES.forEach((n, i) => { if (READY.has(n)) ART[i] = n; });
  const V = 5;
  // provisional face colours per month (plant tint) and the plant glyph
  const PLANT = ['松', '梅', '桜', '藤', '菖', '牡', '萩', '芒', '菊', '紅', '柳', '桐'];
  const TINT = ['#2f5b45', '#b8323a', '#d9879a', '#6b5394', '#4d5fa0', '#c2464e', '#9c3e5c', '#8a7a3c', '#c99a2e', '#b5452a', '#4f7a3a', '#6b5a8a'];
  function artSrc(id, big) { const n = ART[id]; return n ? `img/cards/${n}${big ? '@2x' : ''}.webp?v=${V}` : null; }
  function provisional(id) {
    const HF = root.HF, c = HF.CARDS[id], m = c.m, col = TINT[m];
    const kind = c.type === 'hikari' ? '光' : c.type === 'tane' ? '種' : c.type === 'tan' ? '短' : '';
    let mid = '';
    if (c.type === 'tan') {
      const red = c.sub !== 'ao';
      mid = `<rect x="46" y="44" width="30" height="80" rx="2" fill="${red ? '#b93a2a' : '#2e4f86'}" transform="rotate(8 61 84)"/>` +
        (c.sub === 'aka' || c.sub === 'miyoshino' ? `<text x="61" y="90" font-size="13" fill="#f3e7cf" text-anchor="middle" writing-mode="tb" transform="rotate(8 61 84)">${c.sub === 'aka' ? 'あかよろし' : 'みよしの'}</text>` : '');
    } else if (c.type === 'hikari') mid = `<circle cx="60" cy="70" r="30" fill="#c23b2a" opacity=".9"/>`;
    else if (c.type === 'tane') mid = `<circle cx="60" cy="74" r="22" fill="none" stroke="#c23b2a" stroke-width="5"/>`;
    return `<svg viewBox="0 0 120 196" class="hf-prov" aria-hidden="true">
<rect width="120" height="196" rx="5" fill="#1c1a22"/><rect x="7" y="7" width="106" height="182" fill="#efe4cc"/>
<path d="M7 150 Q40 128 70 146 T113 138 V189 H7Z" fill="${col}" opacity=".85"/>
${mid}<text x="60" y="${c.type === 'tan' ? 176 : 132}" font-size="${c.type === 'tan' ? 26 : 40}" font-family="Shippori Mincho B1, serif" font-weight="800" fill="${c.type === 'tan' ? '#efe4cc' : '#23202a'}" text-anchor="middle">${PLANT[m]}</text>
${kind ? `<text x="16" y="28" font-size="17" font-family="Shippori Mincho B1, serif" font-weight="800" fill="#c23b2a">${kind}</text>` : ''}
<text x="104" y="28" font-size="14" font-family="Shippori Mincho B1, serif" fill="#7a6a58" text-anchor="end">${m + 1}</text></svg>`;
  }
  // a card element's inner HTML
  function face(id, big) {
    const s = artSrc(id, big);
    return s ? `<img class="hf-art" src="${s}" alt="" draggable="false">` : provisional(id);
  }
  root.HFCards = { face, artSrc, ART, PLANT };
})(typeof self !== 'undefined' ? self : this);
