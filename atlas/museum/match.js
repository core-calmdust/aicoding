/* World Board Game Atlas — 博物館の「名局選」 (great games room, 2026-11-27 ユーザー: 名局・名勝負を、ミュゼフクの一手ごとの解説つきで).
   A wall of famous games; one opens on a board of its own (2D, the pieces slide), with the museum's Atlamo ミュゼフク (musowl) explaining the
   moves, the moves' list beside it (tap any move), and buttons to step, jump to the start or the end, play on by itself, or skip to the next note.
   Texts: museum/match-i18n.js (MUSEUM_MATCH_T[lang][id] = { t, w, b, ev, d, pl, lead, c: { ply: note } }); facts and rules: claude/museum-spec.md (名局選).
   Each kind of game is a KIND below: init() → the start; play(state, move) → { st, from, to, cap, … } (throws on a move that cannot be played,
   so tools/museum-match-check.js can test every game's record); label(…) → the move as written in the list; the board's look.
   AtlasMatch.render(box, ctx) — the museum (atlas/museum.js) calls it. */
(function () {
  'use strict';
  const V = 1, GUIDE = '../images/atlas/av/musowl-2.webp';
  /* the games. kind · moves: the record (chess: SAN; shogi: USI, 7g7f / P*5e / 8h2b+; go: SGF points, pd, '' = pass) · res: w | b | d | s | g
     (go: 'B+R', 'W+2.5' as written) · mk: { ply: { a: [[from, to], …] arrows, s: [squares] } } what the note points at · orient: 'b' to see the board from Black */
  const GAMES = [
    // (2026-11-27) Morphy v. Duke Karl of Brunswick & Count Isouard, Paris 1858, the Opera Game
    { id: 'opera', kind: 'chess', res: 'w',
      moves: 'e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6 Bg5 b5 Nxb5 cxb5 Bxb5+ Nbd7 O-O-O Rd8 Rxd7 Rxd7 Rd1 Qe6 Bxd7+ Nxd7 Qb8+ Nxb8 Rd8#',
      mk: { 11: { a: [['c4', 'f7'], ['f3', 'f7']] }, 12: { a: [['f3', 'f7']], s: ['f6'] }, 13: { a: [['b3', 'f7'], ['b3', 'b7']] }, 17: { a: [['g5', 'f6'], ['f6', 'e7']] },
        21: { s: ['e8'] }, 23: { a: [['d1', 'd7']] }, 27: { a: [['d1', 'd7'], ['b5', 'd7']] }, 31: { a: [['b3', 'b8']] }, 33: { a: [['g5', 'd8']], s: ['e8'] } } }
  ];

  /* ---------- the kinds ---------- */
  const FIG = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘' };   // figurines (the list reads the same in every language); U+FE0E keeps them text
  const CHESS = (() => {
    const sq = s => (s.charCodeAt(0) - 97) + (s.charCodeAt(1) - 49) * 8, nm = i => 'abcdefgh'[i & 7] + ((i >> 3) + 1), BACK = 'RNBQKBNR';
    function init() { const b = Array(64).fill(null); let id = 0;
      for (let f = 0; f < 8; f++) { b[f] = { id: id++, c: 'w', t: BACK[f] }; b[8 + f] = { id: id++, c: 'w', t: 'P' }; b[48 + f] = { id: id++, c: 'b', t: 'P' }; b[56 + f] = { id: id++, c: 'b', t: BACK[f] }; }
      return { b, turn: 'w', cr: 'KQkq', ep: -1 }; }
    function hits(b, from, to) {   // the piece on from attacks to (pins aside)
      const p = b[from], df = (to & 7) - (from & 7), dr = (to >> 3) - (from >> 3), ad = Math.abs(df), ar = Math.abs(dr);
      if (!df && !dr) return false;
      if (p.t === 'P') return dr === (p.c === 'w' ? 1 : -1) && ad === 1;
      if (p.t === 'N') return (ad === 1 && ar === 2) || (ad === 2 && ar === 1);
      if (p.t === 'K') return Math.max(ad, ar) === 1;
      const line = !df || !dr, diag = ad === ar;
      if ((p.t === 'R' && !line) || (p.t === 'B' && !diag) || (p.t === 'Q' && !line && !diag)) return false;
      const sf = Math.sign(df), sr = Math.sign(dr); let f = (from & 7) + sf, r = (from >> 3) + sr;
      while (f !== (to & 7) || r !== (to >> 3)) { if (b[f + r * 8]) return false; f += sf; r += sr; } return true; }
    const under = (b, s, by) => b.some((p, i) => p && p.c === by && hits(b, i, s));
    const king = (b, c) => b.findIndex(p => p && p.c === c && p.t === 'K');
    const opp = c => c === 'w' ? 'b' : 'w';
    function can(st, from, to) { const b = st.b, p = b[from], q = b[to]; if (!p || p.c !== st.turn || (q && q.c === p.c)) return false;
      if (p.t !== 'P') return hits(b, from, to);
      const d = p.c === 'w' ? 1 : -1, df = (to & 7) - (from & 7), dr = (to >> 3) - (from >> 3);
      if (!df) return !q && (dr === d || (dr === 2 * d && (from >> 3) === (p.c === 'w' ? 1 : 6) && !b[from + 8 * d]));
      return Math.abs(df) === 1 && dr === d && (!!q || to === st.ep); }
    function step(st, from, to, promo) {
      const b = st.b.slice(), p = b[from]; let cap = b[to], cs = to, rook = null;
      if (p.t === 'P' && to === st.ep && !cap) { cs = to + (p.c === 'w' ? -8 : 8); cap = b[cs]; b[cs] = null; }
      b[to] = promo ? { id: p.id, c: p.c, t: promo } : p; b[from] = null;
      if (p.t === 'K' && Math.abs((to & 7) - (from & 7)) === 2) { const r = to > from ? from + 3 : from - 4, rt = to > from ? from + 1 : from - 1; b[rt] = b[r]; b[r] = null; rook = [r, rt]; }
      let cr = st.cr; if (p.t === 'K') cr = cr.replace(p.c === 'w' ? /[KQ]/g : /[kq]/g, '');
      [[0, 'Q'], [7, 'K'], [56, 'q'], [63, 'k']].forEach(([s, ch]) => { if (from === s || to === s) cr = cr.replace(ch, ''); });
      return { st: { b, turn: opp(st.turn), cr, ep: p.t === 'P' && Math.abs(to - from) === 16 ? (from + to) / 2 : -1 }, cap: cap ? { id: cap.id, at: cs } : null, rook }; }
    const safe = (st, from, to, promo) => { const r = step(st, from, to, promo); return !under(r.st.b, king(r.st.b, st.turn), r.st.turn); };
    const anyMove = st => { for (let i = 0; i < 64; i++) if (st.b[i] && st.b[i].c === st.turn) for (let j = 0; j < 64; j++) if (can(st, i, j) && safe(st, i, j, st.b[i].t === 'P' && ((j >> 3) % 7 === 0) ? 'Q' : null)) return true; return false; };
    function play(st, san) {
      const s = san.replace(/[+#!?]/g, '');
      let from, to, promo = null;
      if (/^(O-O|O-O-O)$/.test(s)) { const long = s === 'O-O-O'; from = st.turn === 'w' ? 4 : 60; to = from + (long ? -2 : 2);
        const right = st.turn === 'w' ? (long ? 'Q' : 'K') : (long ? 'q' : 'k'), p = st.b[from];
        if (!p || p.t !== 'K' || !st.cr.includes(right)) throw new Error('cannot castle: ' + san);
        if ((long ? [from - 1, from - 2, from - 3] : [from + 1, from + 2]).some(i => st.b[i])) throw new Error('castling blocked: ' + san);
        if ([from, from + (long ? -1 : 1), to].some(i => under(st.b, i, opp(st.turn)))) throw new Error('castling through check: ' + san);
      } else {
        const m = s.match(/^([KQRBN])?([a-h])?([1-8])?(x)?([a-h][1-8])(?:=([QRBN]))?$/); if (!m) throw new Error('bad move: ' + san);
        const t = m[1] || 'P'; to = sq(m[5]); promo = m[6] || null;
        const c = []; st.b.forEach((p, i) => { if (p && p.c === st.turn && p.t === t && (!m[2] || (i & 7) === m[2].charCodeAt(0) - 97) && (!m[3] || (i >> 3) === +m[3] - 1) && can(st, i, to) && safe(st, i, to, promo)) c.push(i); });
        if (c.length !== 1) throw new Error((c.length ? 'ambiguous: ' : 'no such move: ') + san);
        from = c[0];
        const capt = !!st.b[to] || (t === 'P' && to === st.ep); if (capt !== !!m[4]) throw new Error('capture mark wrong: ' + san);
        if (t === 'P' && (to >> 3) % 7 === 0 && !promo) throw new Error('promotion missing: ' + san);
      }
      const r = step(st, from, to, promo), chk = under(r.st.b, king(r.st.b, r.st.turn), st.turn), mate = chk && !anyMove(r.st);
      if (/#/.test(san) !== mate || (/\+/.test(san) && !chk) || (chk && !mate && !/\+/.test(san))) throw new Error('check mark wrong: ' + san);
      return Object.assign(r, { from: nm(from), to: nm(to), side: st.turn, rook: r.rook && r.rook.map(nm), capAt: r.cap && nm(r.cap.at) });
    }
    const label = (mv, i) => mv.replace(/^[KQRBN]/, c => FIG[c] + '︎').replace(/=([QRBN])/, (_, c) => '=' + FIG[c] + '︎');
    const pieces = st => st.b.map((p, i) => p && { id: p.id, at: nm(i), k: p.c + p.t }).filter(Boolean);
    return { init, play, label, pieces, cols: 8, rows: 8, sides: ['w', 'b'], first: 'w', pair: true,
      xy: (s, flip) => { const f = s.charCodeAt(0) - 97, r = s.charCodeAt(1) - 49; return flip ? [7 - f, r] : [f, 7 - r]; } };
  })();

  // shogi: USI. Board files 9…1 from the left (as seen by sente), ranks a…i (一…九) from the top. Pieces: K R B G S N L P, '+' promoted.
  const SHOGI = (() => {
    const KAN = { K: '玉', R: '飛', B: '角', G: '金', S: '銀', N: '桂', L: '香', P: '歩', '+R': '龍', '+B': '馬', '+S': '全', '+N': '圭', '+L': '杏', '+P': 'と' };
    const KN = ['一', '二', '三', '四', '五', '六', '七', '八', '九'], ZEN = '０１２３４５６７８９';
    const key = (f, r) => f + ',' + r, at = s => [+s[0], s.charCodeAt(1) - 96];
    function init() { const b = {}; let id = 0; const put = (f, r, t, c) => { b[key(f, r)] = { id: id++, t, c }; };
      'LNSGKGSNL'.split('').forEach((t, i) => { put(9 - i, 9, t, 's'); put(9 - i, 1, t, 'g'); });
      put(8, 8, 'B', 's'); put(2, 8, 'R', 's'); put(8, 2, 'R', 'g'); put(2, 2, 'B', 'g');
      for (let f = 1; f <= 9; f++) { put(f, 7, 'P', 's'); put(f, 3, 'P', 'g'); }
      return { b, h: { s: [], g: [] }, turn: 's', last: null }; }
    const base = t => t.replace('+', '');
    function reach(st, p, f0, r0, f1, r1) {   // the piece's move fits its kind (pins and the rest aside)
      const fw = p.c === 's' ? -1 : 1, df = f1 - f0, dr = r1 - r0, adf = Math.abs(df), adr = Math.abs(dr);
      const gold = (adf <= 1 && adr <= 1) && !(dr === -fw && adf === 1) && (adf || adr);
      const clear = () => { const sf = Math.sign(df), sr = Math.sign(dr); let f = f0 + sf, r = r0 + sr; while (f !== f1 || r !== r1) { if (st.b[key(f, r)]) return false; f += sf; r += sr; } return true; };
      switch (p.t) {
        case 'K': return adf <= 1 && adr <= 1 && (adf || adr);
        case 'G': case '+S': case '+N': case '+L': case '+P': return !!gold;
        case 'S': return adf <= 1 && adr <= 1 && (dr === fw || (adr === 1 && adf === 1)) && (adf || adr);
        case 'N': return adf === 1 && dr === 2 * fw;
        case 'L': return !df && Math.sign(dr) === fw && clear();
        case 'P': return !df && dr === fw;
        case 'R': return (!df || !dr) && (adf || adr) && clear();
        case 'B': return adf === adr && adf && clear();
        case '+R': return ((!df || !dr) && (adf || adr) && clear()) || (adf === 1 && adr === 1);
        case '+B': return (adf === adr && adf && clear()) || (adf + adr === 1);
      } return false; }
    function play(st, mv) {
      const b = Object.assign({}, st.b), h = { s: st.h.s.slice(), g: st.h.g.slice() }, me = st.turn, you = me === 's' ? 'g' : 's';
      let out;
      if (mv[1] === '*') { const t = mv[0], [f, r] = at(mv.slice(2)), i = h[me].findIndex(x => x.t === t);
        if (i < 0 || b[key(f, r)]) throw new Error('cannot drop: ' + mv);
        const p = h[me].splice(i, 1)[0]; b[key(f, r)] = { id: p.id, t, c: me };
        out = { from: null, to: mv.slice(2), drop: t, t, side: me };
      } else {
        const [f0, r0] = at(mv), [f1, r1] = at(mv.slice(2, 4)), pr = mv[4] === '+', p = b[key(f0, r0)], q = b[key(f1, r1)];
        if (!p || p.c !== me) throw new Error('no piece to move: ' + mv); if (q && q.c === me) throw new Error('own piece in the way: ' + mv);
        if (!reach(st, p, f0, r0, f1, r1)) throw new Error('the piece cannot go there: ' + mv);
        const zone = r => me === 's' ? r <= 3 : r >= 7;
        if (pr && (p.t[0] === '+' || 'KG'.includes(p.t) || !(zone(r0) || zone(r1)))) throw new Error('cannot promote: ' + mv);
        if (q) h[me].push({ id: q.id, t: base(q.t) });
        b[key(f0, r0)] = undefined; delete b[key(f0, r0)]; b[key(f1, r1)] = { id: p.id, t: pr ? '+' + p.t : p.t, c: me };
        out = { from: mv.slice(0, 2), to: mv.slice(2, 4), t: p.t, pr, cap: q ? { id: q.id } : null, side: me, could: !pr && p.t[0] !== '+' && !'KG'.includes(p.t) && (zone(r0) || zone(r1)) };
      }
      h[me].sort((a, c) => 'RBGSNLP'.indexOf(a.t) - 'RBGSNLP'.indexOf(c.t));
      out.same = st.last === out.to; out.st = { b, h, turn: you, last: out.to }; return out;
    }
    // the list: Japanese style (▲7六歩, 同, 成, 不成, 打) in the CJK languages; elsewhere western (P-7f, Bx2b+, P*5e, =)
    function label(mv, i, r, lang) {
      const cjk = /^(ja|zh|zh-TW|ko)$/.test(lang), mark = r.side === 's' ? '▲' : '△', [f, rk] = at(r.to);
      if (cjk) return mark + (r.same ? '同' + '　' : ZEN[f] + KN[rk - 1]) + (r.t === 'K' && r.side === 'g' ? '王' : KAN[r.t]) + (r.pr ? '成' : r.could ? '不成' : '') + (r.drop ? '打' : '');
      const L = r.t.replace('+', '+'); return mark + (r.drop ? r.drop + '*' + r.to : L + (r.cap ? 'x' : '-') + r.to + (r.pr ? '+' : r.could ? '=' : ''));
    }
    const pieces = st => Object.entries(st.b).map(([k, p]) => { const [f, r] = k.split(',').map(Number); return { id: p.id, at: f + String.fromCharCode(96 + r), k: p.c + p.t, glyph: p.t === 'K' && p.c === 'g' ? '王' : KAN[p.t], up: p.c === 's', red: p.t[0] === '+' }; });
    return { init, play, label, pieces, cols: 9, rows: 9, sides: ['s', 'g'], first: 's', hands: st => st.h, KAN,
      xy: (s, flip) => { const f = +s[0], r = s.charCodeAt(1) - 97; return flip ? [f - 1, 8 - r] : [9 - f, r]; } };
  })();

  // go: SGF points (aa = the top left), '' or 'tt' = pass. Captures follow the rules (a group with no liberty is taken off).
  const GO = (() => {
    const LET = 'ABCDEFGHJKLMNOPQRST';
    function init(G) { return { n: G.size || 19, s: {}, turn: 'B', id: 0, cap: { B: 0, W: 0 } }; }
    function play(st, mv) {
      const n = st.n, s = Object.assign({}, st.s), me = st.turn, you = me === 'B' ? 'W' : 'B';
      if (!mv || mv === 'tt') return { st: Object.assign({}, st, { turn: you }), pass: true, side: me, to: null };
      const x = mv.charCodeAt(0) - 97, y = mv.charCodeAt(1) - 97;
      if (x < 0 || y < 0 || x >= n || y >= n || s[mv]) throw new Error('point taken or off the board: ' + mv);
      const id = st.id; s[mv] = { c: me, id };
      const nb = p => { const a = p.charCodeAt(0) - 97, b = p.charCodeAt(1) - 97; return [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]].filter(([u, v]) => u >= 0 && v >= 0 && u < n && v < n).map(([u, v]) => String.fromCharCode(97 + u, 97 + v)); };
      const group = p => { const c = s[p].c, seen = new Set([p]), q = [p]; let lib = 0; const libs = new Set();
        while (q.length) { const a = q.pop(); nb(a).forEach(b => { if (!s[b]) libs.add(b); else if (s[b].c === c && !seen.has(b)) { seen.add(b); q.push(b); } }); } return { g: [...seen], lib: libs.size }; };
      const off = [];
      nb(mv).forEach(b => { if (s[b] && s[b].c === you) { const G = group(b); if (!G.lib) G.g.forEach(p => { if (s[p]) { off.push(s[p].id); delete s[p]; } }); } });
      if (!group(mv).lib) throw new Error('suicide: ' + mv);
      const cap = Object.assign({}, st.cap); cap[me] += off.length;
      return { st: { n, s, turn: you, id: id + 1, cap }, to: mv, side: me, off };
    }
    const name = (p, n) => LET[p.charCodeAt(0) - 97] + (n - (p.charCodeAt(1) - 97));
    const label = (mv, i, r, lang, st0) => r.pass ? '—' : name(r.to, st0.n);
    const pieces = st => Object.entries(st.s).map(([p, v]) => ({ id: v.id, at: p, k: v.c }));
    return { init, play, label, pieces, sides: ['B', 'W'], first: 'B', go: true, name,
      xy: (p, flip, n) => { const x = p.charCodeAt(0) - 97, y = p.charCodeAt(1) - 97; return flip ? [n - 1 - x, n - 1 - y] : [x, y]; } };
  })();
  const KINDS = { chess: CHESS, shogi: SHOGI, go: GO };

  // every position of a game, worked out once (the record → states[0…n]; recs[i] = what move i did)
  const cache = {};
  function line(G) {
    if (cache[G.id]) return cache[G.id];
    const K = KINDS[G.kind], mv = Array.isArray(G.moves) ? G.moves : G.moves.trim().split(/\s+/);
    const st = [K.init(G)], recs = [];
    mv.forEach((m, i) => { const r = K.play(st[i], G.kind === 'go' && m === '-' ? '' : m); recs.push(r); st.push(r.st); });
    return (cache[G.id] = { K, mv, st, recs });
  }

  /* ---------- the room ---------- */
  const T = () => window.MUSEUM_MATCH_T || {};
  let host = null, ctx = null, lang = 'ja', el = {}, kind = (() => { try { return localStorage.getItem('atlas-match-kind') || 'all'; } catch (e) { return 'all'; } })();
  let cur = null, ply = 0, timer = null;
  const tx = () => T()[lang] || T().en || {};
  const u = k => (tx().ui && tx().ui[k]) || ((T().en || {}).ui || {})[k] || k;
  const gt = id => Object.assign({}, (T().en || {})[id] || {}, tx()[id] || {});
  const note = (id, i) => { const a = (tx()[id] || {}).c, b = ((T().en || {})[id] || {}).c; return (a && a[i] != null ? a[i] : b && b[i] != null ? b[i] : null); };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MK = (ids, n) => { if (window.AtlasMuseum && AtlasMuseum.mark) AtlasMuseum.mark('match', ids, n); };
  const IC = {
    start: '<path d="M7 5v14M18 6l-8 6 8 6z"/>', prev: '<path d="M15 6l-6 6 6 6"/>', next: '<path d="M9 6l6 6-6 6"/>', end: '<path d="M17 5v14M6 6l8 6-8 6z"/>',
    play: '<path d="M8 5.5v13l11-6.5z"/>', pause: '<path d="M8 5.5v13M16 5.5v13"/>', back: '<path d="M15 6l-6 6 6 6"/>', note: '<path d="M5 12h12M13 7l5 5-5 5"/>' };
  const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${IC[k]}</svg>`;

  /* the board: one SVG (lines, squares, marks) under a layer of pieces that slide (each piece keeps its element from move to move) */
  const PIMG = '../chess/pieces/cburnett/';
  function geom(G, K) {   // in board units: the playing area starts at (ox, oy); one cell = 1
    if (K.go) { const n = G.size || 19; return { W: n + 1, H: n + 1, ox: 1, oy: 1, n, cell: 1, pt: true }; }
    if (K === SHOGI) return { W: 9.9, H: 9.9 + 2.4, ox: 0.45, oy: 1.2 + 0.45, cell: 1, hands: true };
    return { W: 8.7, H: 8.7, ox: 0.6, oy: 0.1, cell: 1 };
  }
  function boardSVG(G, K, g, flip) {
    const P = [];
    if (K.go) {
      const n = g.n; P.push(`<rect x="0" y="0" width="${g.W}" height="${g.H}" rx=".3" class="mxwood"/>`);
      for (let i = 0; i < n; i++) { P.push(`<line x1="1" y1="${1 + i}" x2="${n}" y2="${1 + i}"/><line x1="${1 + i}" y1="1" x2="${1 + i}" y2="${n}"/>`); }
      const hs = n === 19 ? [3, 9, 15] : n === 13 ? [3, 6, 9] : [2, 4, 6]; hs.forEach(a => hs.forEach(b => { if (n !== 9 || (a + b) % 4 === 0 || (a === 4 && b === 4)) P.push(`<circle cx="${1 + a}" cy="${1 + b}" r=".12" class="mxhoshi"/>`); }));
      return `<g class="mxgo">${P.join('')}</g>`;
    }
    if (K === SHOGI) {
      P.push(`<rect x="0" y="1.2" width="9.9" height="9.9" rx=".2" class="mxwood"/>`);
      for (let i = 0; i <= 9; i++) P.push(`<line x1="${g.ox}" y1="${g.oy + i}" x2="${g.ox + 9}" y2="${g.oy + i}"/><line x1="${g.ox + i}" y1="${g.oy}" x2="${g.ox + i}" y2="${g.oy + 9}"/>`);
      [[3, 3], [6, 3], [3, 6], [6, 6]].forEach(([a, b]) => P.push(`<circle cx="${g.ox + a}" cy="${g.oy + b}" r=".07" class="mxhoshi"/>`));
      for (let i = 0; i < 9; i++) { P.push(`<text x="${(g.ox + i + .5) * 100}" y="${(g.oy - .12) * 100}" class="mxcoord" transform="scale(.01)">${flip ? i + 1 : 9 - i}</text>`); }
      return `<g class="mxsh">${P.join('')}</g>`;
    }
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) P.push(`<rect x="${g.ox + f}" y="${g.oy + r}" width="1" height="1" class="${(r + f) % 2 ? 'mxdk' : 'mxlt'}"/>`);
    for (let i = 0; i < 8; i++) { P.push(`<text x="${(g.ox + i + .5) * 100}" y="${(g.oy + 8.45) * 100}" class="mxcoord" transform="scale(.01)">${'abcdefgh'[flip ? 7 - i : i]}</text><text x="${(g.ox - .3) * 100}" y="${(g.oy + i + .62) * 100}" class="mxcoord" transform="scale(.01)">${flip ? i + 1 : 8 - i}</text>`); }
    return `<g class="mxch">${P.join('')}</g>`;
  }
  function pieceHTML(K, p, g) {
    if (K.go) return `<span class="mxst ${p.k === 'B' ? 'b' : 'w'}"></span>`;
    if (K === SHOGI) return `<span class="mxsg${p.up ? '' : ' dn'}${p.red ? ' pr' : ''}"><svg viewBox="0 0 100 110" aria-hidden="true"><path d="M50 4 82 18 94 106H6L18 18z"/></svg><b>${p.glyph}</b></span>`;
    return `<img src="${PIMG}${p.k}.svg" alt="" draggable="false">`;
  }
  // where a point sits, as % of the board's box
  function spot(G, K, g, at, flip) { const [x, y] = K.xy(at, flip, g.n); return K.go ? [(g.ox + x) / g.W * 100, (g.oy + y) / g.H * 100] : [(g.ox + x + .5) / g.W * 100, (g.oy + y + .5) / g.H * 100]; }
  function draw(anim) {
    const G = cur, L = line(G), K = L.K, g = geom(G, K), st = L.st[ply], r = ply ? L.recs[ply - 1] : null, flip = G.orient === 'b' || G.orient === 'g';
    const box = el.board;
    if (box._g !== G.id) { box._g = G.id; box.innerHTML = `<svg class="mxbg" viewBox="0 0 ${g.W} ${g.H}" aria-hidden="true">${boardSVG(G, K, g, flip)}<g class="mxmk"></g></svg><div class="mxpcs"></div>${g.hands ? '<div class="mxhand g"></div><div class="mxhand s"></div>' : ''}`;
      box.style.aspectRatio = `${g.W} / ${g.H}`; box._el = {}; box.classList.toggle('go', !!K.go); box.classList.toggle('sh', K === SHOGI); box.classList.toggle('ch', K === CHESS); }
    box.classList.toggle('still', !anim);
    const sz = (K.go ? 1 : 1) / g.W * 100, szh = 1 / g.H * 100;
    const lay = box.querySelector('.mxpcs'), seen = new Set();
    K.pieces(st).forEach(p => { seen.add(p.id); let e = box._el[p.id];
      if (!e) { e = document.createElement('i'); e.className = 'mxp'; lay.appendChild(e); box._el[p.id] = e; e._k = ''; e.classList.add('new'); requestAnimationFrame(() => requestAnimationFrame(() => e.classList.remove('new'))); }
      if (e._k !== p.k + (p.glyph || '') + (p.up ? 1 : 0)) { e._k = p.k + (p.glyph || '') + (p.up ? 1 : 0); e.innerHTML = pieceHTML(K, p, g); }
      const [x, y] = spot(G, K, g, p.at, flip); e.style.left = x + '%'; e.style.top = y + '%'; e.style.width = sz + '%'; e.style.height = szh + '%';
      e.classList.toggle('last', !!(K.go && r && r.to === p.at)); });
    Object.keys(box._el).forEach(id => { if (!seen.has(+id)) { const e = box._el[id]; delete box._el[id]; e.classList.add('gone'); setTimeout(() => e.remove(), anim ? 260 : 0); } });
    // the hands (shogi): what each side holds
    if (g.hands) { const H = K.hands(st), cnt = side => { const c = {}; H[side].forEach(x => c[x.t] = (c[x.t] || 0) + 1); return Object.entries(c); };
      ['g', 's'].forEach(side => { const h = box.querySelector('.mxhand.' + side), top = (side === 'g') !== flip;
        h.style.top = top ? '0' : ''; h.style.bottom = top ? '' : '0'; h.classList.toggle('top', top);
        h.innerHTML = `<em>${side === 's' ? '▲' : '△'}${esc(u('side_' + side))}</em>` + cnt(side).map(([t, n]) => `<span class="mxsg${top ? ' dn' : ''}"><svg viewBox="0 0 100 110" aria-hidden="true"><path d="M50 4 82 18 94 106H6L18 18z"/></svg><b>${SHOGI.KAN[t]}</b>${n > 1 ? `<u>${n}</u>` : ''}</span>`).join(''); }); }
    // the marks: the last move's squares, then what the note points at (arrows, squares)
    const mk = box.querySelector('.mxmk'), M = (G.mk || {})[ply] || {}, out = [];
    const c = at => { const [x, y] = K.xy(at, flip, g.n); return K.go ? [g.ox + x, g.oy + y] : [g.ox + x + .5, g.oy + y + .5]; };
    const sqr = (at, cls) => { const [x, y] = c(at); out.push(`<rect x="${x - .5}" y="${y - .5}" width="1" height="1" class="${cls}"/>`); };
    if (r && !K.go) { if (r.from) sqr(r.from, 'mxlm'); if (r.to) sqr(r.to, 'mxlm'); }
    (M.s || []).forEach(a => K.go ? (() => { const [x, y] = c(a); out.push(`<circle cx="${x}" cy="${y}" r=".42" class="mxsq"/>`); })() : sqr(a, 'mxsq'));
    (M.a || []).forEach(([a, b]) => { const [x1, y1] = c(a), [x2, y2] = c(b), d = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / d, uy = (y2 - y1) / d, ex = x2 - ux * .38, ey = y2 - uy * .38;
      out.push(`<path class="mxar" d="M${(x1 + ux * .3).toFixed(2)} ${(y1 + uy * .3).toFixed(2)}L${ex.toFixed(2)} ${ey.toFixed(2)}"/><path class="mxah" d="M${(x2 - ux * .12).toFixed(2)} ${(y2 - uy * .12).toFixed(2)}L${(ex - uy * .26).toFixed(2)} ${(ey + ux * .26).toFixed(2)}L${(ex + uy * .26).toFixed(2)} ${(ey - ux * .26).toFixed(2)}z"/>`); });
    mk.innerHTML = out.join('');
  }

  /* ---------- the wall ---------- */
  function thumb(G) {   // the last position, small (a picture of the board, no sliding)
    const L = line(G), K = L.K, g = geom(G, K), st = L.st[L.st.length - 1], flip = G.orient === 'b' || G.orient === 'g', P = [];
    K.pieces(st).forEach(p => { const [x, y] = K.xy(p.at, flip, g.n), cx = K.go ? g.ox + x : g.ox + x + .5, cy = K.go ? g.oy + y : g.oy + y + .5;
      if (K.go) P.push(`<circle cx="${cx}" cy="${cy}" r=".47" class="${p.k === 'B' ? 'mxtb' : 'mxtw'}"/>`);
      else if (K === SHOGI) P.push(`<g transform="translate(${cx} ${cy})${p.up ? '' : ' rotate(180)'}"><path d="M0 -.44 .32 -.3 .4 .42H-.4L-.32 -.3z" class="mxtk"/><text y="20" transform="scale(.01)" class="mxtg${p.red ? ' pr' : ''}">${p.glyph}</text></g>`);
      else P.push(`<image href="${PIMG}${p.k}.svg" x="${cx - .5}" y="${cy - .5}" width="1" height="1"/>`); });
    return `<svg viewBox="0 0 ${g.W} ${g.H}" aria-hidden="true">${boardSVG(G, K, g, flip)}${P.join('')}</svg>`;
  }
  function wall() {
    stop(); cur = null; host.querySelector('.mxx').classList.remove('on');
    el.wall.hidden = false; el.view.hidden = true;
    const kinds = ['all', ...Object.keys(KINDS).filter(k => GAMES.some(G => G.kind === k))];
    if (!kinds.includes(kind)) kind = 'all';
    el.chips.innerHTML = kinds.length > 2 ? kinds.map(k => `<button type="button" class="chip cat" data-k="${k}" aria-pressed="${k === kind}">${esc(u(k === 'all' ? 'all' : 'k_' + k))}<em>${k === 'all' ? GAMES.length : GAMES.filter(G => G.kind === k).length}</em></button>`).join('') : '';
    el.chips.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { kind = b.dataset.k; try { localStorage.setItem('atlas-match-kind', kind); } catch (e) {} wall(); const c = el.chips.querySelector(`[data-k="${kind}"]`); if (c) c.focus(); });
    el.grid.innerHTML = GAMES.filter(G => kind === 'all' || G.kind === kind).map(G => { const x = gt(G.id);
      return `<button type="button" class="mxc" data-g="${G.id}"><span class="mxth k-${G.kind}">${thumb(G)}</span><span class="mxcl"><i>${esc(u('k_' + G.kind))}</i><b>${esc(x.t)}</b><small>${esc(x.w)} — ${esc(x.b)}</small><small>${esc(x.d)} · ${esc(x.pl)}</small></span></button>`; }).join('');
    el.grid.querySelectorAll('[data-g]').forEach(b => b.onclick = () => show(b.dataset.g, true));
    el.lead.textContent = u('lead'); el.credit.textContent = u('credit');
    if (window.AtlasMuseum && AtlasMuseum.catalog) AtlasMuseum.catalog('match', GAMES.map(G => ({ id: G.id, t: gt(G.id).t })));
    MK(null, GAMES.length);
  }

  /* ---------- a game ---------- */
  function show(id, user) {
    const G = GAMES.find(x => x.id === id); if (!G || !host) return;
    el.pushed = !!(user && ctx && ctx.hist); if (el.pushed) ctx.hist({ room: 'match', game: id });
    stop(); cur = G; ply = 0; const L = line(G), x = gt(G.id), n = L.mv.length;
    el.wall.hidden = true; el.view.hidden = false; host.querySelector('.mxx').classList.add('on');
    const K = L.K, side = s => u('side_' + s), res = G.res && (G.kind === 'go' ? G.res : u('res_' + G.res));
    el.view.innerHTML = `<button type="button" class="mxback">${svg('back')}${esc(u('back'))}</button>
      <div class="mxhd"><i>${esc(u('k_' + G.kind))}</i><h3>${esc(x.t)}</h3>
        <p class="mxvs"><span><u class="mxdot ${K.sides[0]}"></u>${esc(x.w)}</span><em>vs</em><span><u class="mxdot ${K.sides[1]}"></u>${esc(x.b)}</span></p>
        <p class="mxmeta">${esc(x.d)} · ${esc(x.pl)}${x.ev ? ' · ' + esc(x.ev) : ''}${res ? ` · <b>${esc(u('result'))}: ${esc(res)}</b>` : ''}</p></div>
      <div class="mxmain"><div class="mxleft k-${G.kind}"><div class="mxboard" dir="ltr" role="img"></div>
        <div class="mxctl" dir="ltr"><button type="button" data-c="start" aria-label="${esc(u('start'))}" title="${esc(u('start'))}">${svg('start')}</button><button type="button" data-c="prev" aria-label="${esc(u('prev'))}" title="${esc(u('prev'))}">${svg('prev')}</button>
          <button type="button" data-c="play" class="pl" aria-label="${esc(u('play'))}" title="${esc(u('play'))}">${svg('play')}</button><button type="button" data-c="next" aria-label="${esc(u('next'))}" title="${esc(u('next'))}">${svg('next')}</button><button type="button" data-c="end" aria-label="${esc(u('end'))}" title="${esc(u('end'))}">${svg('end')}</button></div>
        <p class="mxpos" aria-live="polite"></p></div>
        <div class="mxside"><div class="mxsay"><img src="${GUIDE}" alt="" class="mxowl"><div class="mxbub"><b class="mxwho">${esc(u('guide'))}</b><p class="mxtxt"></p><button type="button" class="mxnext" hidden></button></div></div>
          <div class="mxlog"><h4>${esc(u('moves'))}</h4><div class="mxlist" dir="ltr" role="list"></div></div></div></div>
      <p class="mxlead">${esc(x.lead || '')}</p><p class="mxcredit">${esc(u('credit'))}</p>`;
    el.board = el.view.querySelector('.mxboard'); el.say = el.view.querySelector('.mxtxt'); el.list = el.view.querySelector('.mxlist'); el.pos = el.view.querySelector('.mxpos'); el.nx = el.view.querySelector('.mxnext');
    el.view.querySelector('.mxback').onclick = () => { if (el.pushed) history.back(); else wall(); };
    // the moves' list: chess as numbered pairs; the others one move a row, numbered
    const lab = i => K.label(L.mv[i], i, L.recs[i], lang, L.st[0]);
    const btn = i => `<button type="button" data-p="${i + 1}" class="${note(G.id, i + 1) != null ? 'nt' : ''}">${esc(lab(i))}</button>`;
    const rows = [`<div class="mxrow st" role="listitem"><button type="button" data-p="0" class="${note(G.id, 0) != null ? 'nt' : ''}">${esc(u('startpos'))}</button></div>`];
    if (K.pair) for (let i = 0; i < n; i += 2) rows.push(`<div class="mxrow pr" role="listitem"><span>${i / 2 + 1}.</span>${btn(i)}${i + 1 < n ? btn(i + 1) : '<b></b>'}</div>`);
    else for (let i = 0; i < n; i++) rows.push(`<div class="mxrow" role="listitem"><span>${i + 1}</span>${K.go ? `<u class="mxdot ${L.recs[i].side}"></u>` : ''}${btn(i)}</div>`);
    el.list.innerHTML = rows.join(''); el.list.classList.toggle('alln', Array.from({ length: n + 1 }, (_, i) => note(G.id, i) != null).every(Boolean));
    el.list.onclick = e => { const b = e.target.closest('[data-p]'); if (b) { stop(); go(+b.dataset.p, true); } };
    el.view.querySelector('.mxctl').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; const c = b.dataset.c;
      if (c === 'play') { timer ? stop() : run(); return; } stop(); go(c === 'start' ? 0 : c === 'end' ? n : c === 'prev' ? ply - 1 : ply + 1, c === 'next' || c === 'prev'); };
    el.nx.onclick = () => { stop(); go(+el.nx.dataset.p, true); };
    go(0, false); el.view.querySelector('.mxback').focus({ preventScroll: true });
    if (user) { const t = host.getBoundingClientRect().top + scrollY - 80; if (scrollY > t) scrollTo({ top: Math.max(0, t) }); }
  }
  function go(p, anim) {
    const G = cur; if (!G) return; const L = line(G), n = L.mv.length; p = Math.max(0, Math.min(n, p));
    const near = Math.abs(p - ply) === 1; ply = p; draw(anim && near);
    const K = L.K, r = p ? L.recs[p - 1] : null, x = note(G.id, p);
    el.say.textContent = x != null ? x : u('quiet'); el.say.classList.toggle('quiet', x == null);
    // the next note further on (long games: most moves have none)
    let nn = -1; if (x == null) for (let i = p + 1; i <= n; i++) if (note(G.id, i) != null) { nn = i; break; }
    el.nx.hidden = nn < 0; if (nn >= 0) { el.nx.dataset.p = nn; el.nx.innerHTML = esc(u('nextnote').replace('{n}', nn)) + svg('note'); }
    const lb = p ? K.label(L.mv[p - 1], p - 1, r, lang, L.st[0]) : ''; el.pos.innerHTML = p ? esc(u('move').replace('{n}', p)) + ' · <bdi dir="ltr">' + esc(lb) + '</bdi>' : esc(u('startpos'));
    el.board.setAttribute('aria-label', el.pos.textContent);
    el.list.querySelectorAll('[aria-current]').forEach(b => b.removeAttribute('aria-current'));
    const on = el.list.querySelector(`[data-p="${p}"]`); if (on) { on.setAttribute('aria-current', 'step'); const lr = el.list.getBoundingClientRect(), br = on.getBoundingClientRect();
      if (br.top < lr.top || br.bottom > lr.bottom) el.list.scrollTop += br.top - lr.top - lr.height / 2 + br.height / 2; }
    const ctl = el.view.querySelector('.mxctl'); ctl.querySelector('[data-c=start]').disabled = ctl.querySelector('[data-c=prev]').disabled = !p;
    ctl.querySelector('[data-c=end]').disabled = ctl.querySelector('[data-c=next]').disabled = p >= n;
    if (p >= n) { MK(G.id, GAMES.length); if (timer) stop(); }
  }
  function run() { const n = line(cur).mv.length; if (ply >= n) go(0, false); timer = setInterval(() => { if (!cur || ply >= line(cur).mv.length) return stop(); go(ply + 1, true); }, cur.kind === 'go' ? 1100 : 1700); playBtn(); }
  function stop() { if (timer) { clearInterval(timer); timer = null; } playBtn(); }
  function playBtn() { const b = el.view && el.view.querySelector('[data-c=play]'); if (!b) return; b.innerHTML = svg(timer ? 'pause' : 'play'); b.setAttribute('aria-label', u(timer ? 'pause' : 'play')); b.title = u(timer ? 'pause' : 'play'); b.setAttribute('aria-pressed', !!timer); }
  addEventListener('keydown', e => {
    if (!cur || !host || !host.isConnected || !host.closest('.muroom.on') || el.view.hidden || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest && e.target.closest('input,textarea,[contenteditable],.mxlist')) { if (!(e.target.closest('.mxlist') && /^Arrow(Left|Right)$/.test(e.key))) return; }
    if (document.querySelector('.ov.on, #ov.on, .lvsheet')) return;
    const n = line(cur).mv.length, k = e.key;
    if (k === 'ArrowRight') { stop(); go(ply + 1, true); } else if (k === 'ArrowLeft') { stop(); go(ply - 1, true); } else if (k === 'Home') { stop(); go(0, false); } else if (k === 'End') { stop(); go(n, false); } else return;
    e.preventDefault();
  });

  function render(box, c) {
    ctx = c; lang = T()[c.lang] ? c.lang : 'en';
    if (host !== box || !box.querySelector('.mxx')) { host = box; box.innerHTML = `<div class="mxx"><div class="mxwall"><p class="chlead mxwl"></p><div class="chips cats mxchips" role="group"></div><div class="mxgrid"></div><p class="mxcredit mxwc"></p></div><div class="mxview" hidden></div></div>`;
      el = { wall: box.querySelector('.mxwall'), view: box.querySelector('.mxview'), lead: box.querySelector('.mxwl'), chips: box.querySelector('.mxchips'), grid: box.querySelector('.mxgrid'), credit: box.querySelector('.mxwc') }; }
    if (cur && !el.view.hidden) { const id = cur.id, p = ply, pu = el.pushed; show(id, false); el.pushed = pu; go(p, false); } else wall();
  }
  window.AtlasMatch = { render, GAMES, KINDS, V, line, show: id => show(id, false), wall: () => host && wall(), current: () => cur && !el.view.hidden ? cur.id : null, _go: p => go(p, false) };
})();
