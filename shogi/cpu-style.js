'use strict';
// Shogi — the CPU's chosen opening strategy (戦型指定). Copyright 2026 core-calmdust — Apache License 2.0
// The new-game dialog lets the player pick what the CPU plays (四間飛車, 矢倉, 棒銀 …). In the opening the CPU then
//   1. plays book moves (Floodgate frequencies) that are consistent with the plan, preferring the plan's own moves;
//   2. out of book, plays the plan's next scripted move (pieces walk along "chains" of squares) when it is legal and
//      the engine thinks it costs at most TOL centipawns compared with the best move;
//   3. otherwise leaves the move to the engine.
// It stops once every chain is finished (or broken) or after LIMIT plies. Squares are written from sente's view
// ('7g' = 7七) and mirrored for gote. Strategies that need the opponent's cooperation (角換わり, 相掛かり) are best-effort.
(function (root) {
const LIMIT = 40, TOL = 150, NODES = 30000, BOOK_PLY = 30;
const EVEN = 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b -';
const STYLES = ['auto', 'ibisha', 'furi', 'shiken', 'sanken', 'naka', 'mukai', 'yagura', 'kaku', 'gangi', 'bougin', 'aig', 'ana'];
const FURI_PICK = [['shiken', 4], ['sanken', 2.5], ['naka', 2.5], ['mukai', 1]];   // 振り飛車（おまかせ）
const TYPE = { P: 1, L: 2, N: 3, S: 4, B: 5, R: 6, G: 7, K: 8 };
// Mino castle for the ranging rook: king 4八-3八-2八, silver 3八, gold 5八, edge pawn
const MINO = [['K', '5i', '4h', '3h', '2h'], ['S', '3i', '3h'], ['G', '6i', '5h'], ['P', '1g', '1f']];
// fam: 'furi' (the rook swings to `file`) or 'static'. no: side-relative moves (prefix match) never taken from the book.
// shut: keep the bishop diagonal closed (no 7六歩 before 6六歩 while the opponent's diagonal is open) — avoids a bishop exchange.
const PLANS = {
  ibisha: { fam: 'static', chains: [['P', '2g', '2f', '2e']] },
  shiken: { fam: 'furi', file: 6, shut: 1, chains: [['P', '6g', '6f'], ['R', '2h', '6h'], ['P', '7g', '7f'], ...MINO] },
  sanken: { fam: 'furi', file: 7, shut: 1, chains: [['P', '6g', '6f'], ['R', '2h', '7h'], ['P', '7g', '7f'], ...MINO] },
  naka: { fam: 'furi', file: 5, chains: [['P', '5g', '5f'], ['R', '2h', '5h'], ['P', '7g', '7f'], ['K', '5i', '4h', '3h', '2h'], ['S', '3i', '3h'], ['P', '1g', '1f']], no: ['7g7f'] },
  mukai: { fam: 'furi', file: 8, shut: 1, chains: [['P', '6g', '6f'], ['P', '7g', '7f'], ['B', '8h', '7g'], ['R', '2h', '8h'], ...MINO] },
  ana: { fam: 'furi', file: 6, shut: 1, chains: [['P', '6g', '6f'], ['R', '2h', '6h'], ['P', '7g', '7f'], ['K', '5i', '4h', '3h', '2h', '1i'], ['L', '1i', '1h'], ['S', '3i', '2h'], ['G', '4i', '3i']] },   // the king walks past 3八 / 2八 with the silver still on 3九 (no Mino on the way)
  yagura: { fam: 'static', shut: 1, chains: [['P', '6g', '6f'], ['P', '7g', '7f'], ['S', '7i', '6h', '7g'], ['G', '6i', '7h'], ['G', '4i', '5h', '6g'], ['K', '5i', '6i', '7i'], ['P', '2g', '2f']] },
  gangi: { fam: 'static', shut: 1, chains: [['P', '6g', '6f'], ['S', '7i', '6h', '6g'], ['P', '4g', '4f'], ['S', '3i', '4h', '4g'], ['G', '6i', '7h'], ['K', '5i', '6i'], ['P', '2g', '2f']], no: ['6h7g', '8h7g'] },
  kaku: { fam: 'static', chains: [['P', '7g', '7f'], ['P', '2g', '2f', '2e'], ['X'], ['S', '7i', '8h']], no: ['6g6f', '8h7g', '8h9g'] },
  bougin: { fam: 'static', chains: [['P', '2g', '2f', '2e'], ['G', '6i', '7h'], ['S', '3i', '3h', '2g', '2f'], ['P', '7g', '7f']], no: ['3i4h'], early: ['2e2d'] },
  aig: { fam: 'static', chains: [['P', '2g', '2f', '2e'], ['G', '6i', '7h'], ['K', '5i', '6h']], early: ['7g7f', '2e2d'] },
};

// ---- coordinates (side-relative 'fr' strings ↔ board squares / USI)
const fileOf = s => +s[0], rankOf = s => s.charCodeAt(1) - 96;
const mir = (s, c) => c ? String(10 - fileOf(s)) + String.fromCharCode(96 + 10 - rankOf(s)) : s;
const relUsi = (u, c) => !c ? u : u[1] === '*' ? u.slice(0, 2) + mir(u.slice(2, 4), 1) : mir(u.slice(0, 2), 1) + mir(u.slice(2, 4), 1) + u.slice(4);
const sqOf = (E, s, c) => { const m = mir(s, c); return E.makeSq(fileOf(m), rankOf(m)); };
const ownAt = (E, p, c, s, T) => p.board[sqOf(E, s, c)] === TYPE[T] + (c ? E.WF : 0);

function isEven(start) { return (start || '').split(' ').slice(0, 3).join(' ') === EVEN; }
function pickFuri() { let tot = 0; for (const x of FURI_PICK) tot += x[1]; let r = Math.random() * tot; for (const x of FURI_PICK) { r -= x[1]; if (r <= 0) return x[0]; } return 'shiken'; }
const resolve = s => s === 'furi' ? pickFuri() : PLANS[s] ? s : null;

// game.cs = [style of sente, style of gote] (null = engine's own choice); set when a game starts
function attach(game, settings) {
  if (!game || game.rated || !isEven(game.start)) return;
  const cs = [null, null];
  if (settings.mode === 'ai') cs[game.human ^ 1] = resolve(settings.cstyle);
  else if (settings.mode === 'watch') { cs[0] = resolve(settings.cstyle); cs[1] = resolve(settings.cstyle2); }
  if (cs[0] || cs[1]) game.cs = cs;
}
function styleOf(game, side) { return game && game.cs && PLANS[game.cs[side]] ? game.cs[side] : null; }

// next move of a chain: { u (real USI) } / 'done' / null (broken or not playable now)
function chainNext(E, p, c, ch, legal) {
  if (ch[0] === 'X') {   // bishop exchange
    const opp = c ^ 1;
    if (p.hand[c * 8 + E.KA] || p.hand[opp * 8 + E.KA]) return 'done';
    if (!ownAt(E, p, c, '8h', 'B') || p.board[sqOf(E, '2b', c)] !== E.KA + (opp ? E.WF : 0)) return null;
    const u = relUsi('8h2b+', c);
    return legal.has(u) ? { u } : null;
  }
  const T = ch[0], path = ch.slice(1);
  let k = -1;
  for (let i = path.length - 1; i >= 0; i--) if (ownAt(E, p, c, path[i], T)) { k = i; break; }
  if (k === path.length - 1) return 'done';
  if (k < 0) return null;
  const u = relUsi(path[k] + path[k + 1], c);
  return legal.has(u) ? { u } : null;
}
function planState(E, p, c, plan, legal) {
  let open = 0; const next = [], ci = new Map(), doneTo = new Set();
  for (let i = 0; i < plan.chains.length; i++) {
    const ch = plan.chains[i];
    const r = chainNext(E, p, c, ch, legal);
    if (r === 'done') { if (ch[0] !== 'X') doneTo.add(ch[ch.length - 1]); continue; }
    if (ch[0] !== 'X') { let k = -1; for (let i = ch.length - 1; i >= 1; i--) if (ownAt(E, p, c, ch[i], ch[0])) { k = i; break; } if (k < 0) continue; }
    open++;
    if (r) { next.push(r.u); ci.set(r.u, i); }
  }
  return { open, next, ci, doneTo };
}
// squares the open chains still need that hold own pieces (a sliding rook also needs the squares on its way): ['i:sq', …]
function blocks(E, p, c, plan) {
  const out = [];
  plan.chains.forEach((ch, i) => {
    if (ch[0] === 'X') return;
    const T = ch[0], path = ch.slice(1);
    let k = -1; for (let j = path.length - 1; j >= 0; j--) if (ownAt(E, p, c, path[j], T)) { k = j; break; }
    if (k < 0 || k === path.length - 1) return;
    const need = path.slice(k + 1);
    if (T === 'R') { const r = path[k][1], a = fileOf(path[k]), b = fileOf(path[k + 1]); for (let f = Math.min(a, b) + 1; f < Math.max(a, b); f++) need.push(f + r); }
    for (const q of need) { const pc = p.board[sqOf(E, q, c)]; if (pc && E.colorOf(pc) === c) out.push(i + ':' + q); }
  });
  return out;
}
// does move u newly stand in the way of a chain? A plan move of chain ci may only hold up later chains (the king passing
// a square the silver will use); any other move may hold up none.
function getsInWay(E, p, c, plan, u, ci) {
  const b0 = new Set(blocks(E, p, c, plan));
  p.doMove(p.fromUsi(u)); const b1 = blocks(E, p, c, plan); p.undoMove();
  return b1.some(x => !b0.has(x) && +x.split(':')[0] < ci);
}
// moves that would turn the game into another opening (rook swing for a static rook, the wrong file, a bishop trade …)
function breaks(E, p, c, plan, u, ply) {
  const r = relUsi(u, c);
  if (r[1] === '*') return false;
  const from = r.slice(0, 2), to = r.slice(2, 4), pc = p.board[sqOf(E, from, c)], T = pc & 15;
  if (plan.no && plan.no.some(x => r.startsWith(x))) return true;
  if (plan.early && ply < 24 && plan.early.some(x => r.startsWith(x))) return true;
  if (T === E.HI && rankOf(from) === 8 && rankOf(to) === 8) {
    if (plan.fam === 'static') return true;                         // static rook never swings
    if (fileOf(to) !== plan.file) return true;                        // ranging rook: only to the chosen file
  }
  if (plan.fam === 'furi' && T === E.FU && fileOf(from) === 2 && ownAt(E, p, c, '2h', 'R')) return true;   // no rook-pawn push before the swing
  if (T === E.KA && (p.board[sqOf(E, to, c)] & 15) === E.KA && !plan.chains.some(ch => ch[0] === 'X')) return true;   // no bishop trade
  if (plan.shut && r === '7g7f' && ownAt(E, p, c, '6g', 'P') && !ownAt(E, p, c ^ 1, '7g', 'P')) return true;
  return false;
}
// is a book move consistent with the plan?
function consistent(E, p, c, plan, u, st, ply) {
  if (breaks(E, p, c, plan, u, ply)) return false;
  const r = relUsi(u, c);
  if (r[1] === '*') return true;
  const from = r.slice(0, 2), T = p.board[sqOf(E, from, c)] & 15;
  if (st.doneTo.has(from) && !st.next.includes(u)) return false;   // keep finished pieces where they are
  if (getsInWay(E, p, c, plan, u, st.ci.has(u) ? st.ci.get(u) : 1e9)) return false;   // a book move must not stand in the way of the plan
  return true;
}

function active(game, side, ply) { return !!styleOf(game, side) && ply < LIMIT; }

// choose the CPU's move for the plan. o = { E, P (position to move), game, side, ply, book (object or null), think(moves, opts) → Promise<{move, score}> }
// returns { u, src: 'book' | 'plan' } or null (= let the engine choose). A null from think (cancelled) → null.
async function move(o) {
  const { E, P: p, game, side: c, ply } = o;
  const s = styleOf(game, c); if (!s) return null;
  const plan = PLANS[s];
  const legal = new Set(p.legalMoves(false).map(m => p.toUsi(m)));
  const st = planState(E, p, c, plan, legal);
  const pick = list => {   // weighted by the book's game counts
    let tot = 0; for (const x of list) tot += x[1]; let r = Math.random() * tot;
    for (const x of list) { r -= x[1]; if (r <= 0) return x[0]; } return list[0][0];
  };
  // book moves (Floodgate) that keep the plan
  let ok = [];
  if (o.book && ply <= BOOK_PLY) {
    const e = o.book[p.sfen().replace(/ \d+$/, '')];
    if (e) ok = e.filter(x => legal.has(x[0]) && consistent(E, p, c, plan, x[0], st, ply));
  }
  // 1) the plan's next move is a book move: play it
  const inBook = ok.filter(x => st.next.includes(x[0]));
  if (inBook.length) return { u: pick(inBook), src: 'book' };
  // 2) the plan's next move, if the engine does not mind it (and it does not stand in the way of the other chains)
  if (st.next.length) {
    const cand = st.next.filter(u => !getsInWay(E, p, c, plan, u, st.ci.get(u))).slice(0, 2);
    if (cand.length) {
      const moves = game.moves.slice(0, ply);
      const base = await o.think(moves, { nodes: NODES });
      if (!base || base.error) return null;
      for (const u of cand) {
        if (u === base.move) return { u, src: 'plan' };
        const r = await o.think(moves.concat([u]), { nodes: NODES });
        if (!r || r.error) return null;
        if (base.score + r.score <= TOL) return { u, src: 'plan' };
      }
    }
  }
  // 3) any book move that keeps the plan; else the engine
  if (ok.length) return { u: pick(ok), src: 'book' };
  return null;
}
// the engine's own move would leave the strategy (e.g. a static rook swinging after the formation is built, or a piece
// standing in the way of the castle): play the best move that keeps it instead, if it costs at most TOL.
// o = move()'s argument + move (engine USI) and analyze(moves, opts) → Promise<{list:[{move, score}]}>. Returns a USI move or null.
async function guard(o) {
  const { E, P: p, game, side: c, ply } = o;
  const s = styleOf(game, c); if (!s || !o.move) return null;
  const plan = PLANS[s];
  const legal = new Set(p.legalMoves(false).map(m => p.toUsi(m)));
  const st = planState(E, p, c, plan, legal);
  const bad = u => breaks(E, p, c, plan, u, ply) || getsInWay(E, p, c, plan, u, st.ci.has(u) ? st.ci.get(u) : 1e9);
  if (!bad(o.move)) return null;
  const moves = game.moves.slice(0, ply);
  const a = await o.analyze(moves, { depth: 1 });
  if (!a || !a.list) return null;
  const cand = a.list.slice().sort((x, y) => y.score - x.score).filter(x => !bad(x.move)).slice(0, 3);
  if (!cand.length) return null;
  const base = await o.think(moves, { nodes: NODES }); if (!base || base.error) return null;
  let best = null, bs = -Infinity;
  for (const x of cand) { const r = await o.think(moves.concat([x.move]), { nodes: NODES }); if (!r || r.error) return null; if (-r.score > bs) { bs = -r.score; best = x.move; } }
  return best && base.score - bs <= TOL ? best : null;
}
function tag(game, side, t) { const s = styleOf(game, side); return s ? ' · ' + t('cs.s.' + s) : ''; }

// ---- new-game dialog: a strategy dropdown next to each AI level (AI vs AI: one per side); even games only
function dlgUpdate(dlg, settings, t) {
  const even = !dlg.handicap;
  [['#csWrap1', 'cstyle'], ['#csWrap2', 'cstyle2']].forEach(([id, key]) => {
    const w = document.querySelector(id); if (!w) return;
    const sel = w.querySelector('select');
    const v = sel.dataset.ready ? sel.value : (STYLES.includes(settings[key]) ? settings[key] : 'auto');
    sel.innerHTML = STYLES.map(s => `<option value="${s}">${t('cs.s.' + s)}</option>`).join('');
    sel.value = v; sel.dataset.ready = '1';
    w.querySelector('span').textContent = t('cs.label');
    w.classList.toggle('hidden', !even || (dlg.mode !== 'ai' && dlg.mode !== 'watch'));
  });
}
function dlgOpen() { document.querySelectorAll('#csWrap1 select, #csWrap2 select').forEach(s => { delete s.dataset.ready; }); }
function dlgRead(settings) {
  const a = document.querySelector('#csWrap1 select'), b = document.querySelector('#csWrap2 select');
  if (a) settings.cstyle = a.value; if (b) settings.cstyle2 = b.value;
}

// ---- strings (merged into the page's I18N)
const NAMES = {
  ja: ['おまかせ', '居飛車', '振り飛車（おまかせ）', '四間飛車', '三間飛車', '中飛車', '向かい飛車', '矢倉', '角換わり', '雁木', '棒銀', '相掛かり', '穴熊（四間飛車）'],
  en: ['Auto', 'Static Rook', 'Ranging Rook (any)', 'Fourth-file Rook', 'Third-file Rook', 'Central Rook', 'Opposing Rook', 'Yagura', 'Bishop Exchange', 'Gangi', 'Climbing Silver', 'Double Wing Attack', 'Anaguma (Ranging Rook)'],
  zh: ['自动', '居飞车', '振飞车（随机）', '四间飞车', '三间飞车', '中飞车', '向飞车', '矢仓', '角换', '雁木', '棒银', '相挂', '穴熊（四间飞车）'],
  ko: ['자동', '이비샤', '후리비샤 (자동)', '시켄비샤', '산켄비샤', '나카비샤', '무카이비샤', '야구라', '가쿠가와리', '간기', '보긴', '아이가카리', '아나구마 (시켄비샤)'],
  es: ['Automático', 'Torre estática', 'Torre móvil (cualquiera)', 'Torre en la 4.ª columna', 'Torre en la 3.ª columna', 'Torre central', 'Torre opuesta', 'Yagura', 'Cambio de alfiles', 'Gangi', 'Plata trepadora', 'Doble ataque de ala', 'Anaguma (torre móvil)'],
  fr: ['Auto', 'Tour statique', 'Tour mobile (au choix)', 'Tour en 4e colonne', 'Tour en 3e colonne', 'Tour centrale', 'Tour opposée', 'Yagura', 'Échange de fous', 'Gangi', 'Argent grimpeur', 'Double attaque d’aile', 'Anaguma (tour mobile)'],
  pt: ['Automático', 'Torre estática', 'Torre móvel (qualquer)', 'Torre na 4.ª coluna', 'Torre na 3.ª coluna', 'Torre central', 'Torre oposta', 'Yagura', 'Troca de bispos', 'Gangi', 'Prata escaladora', 'Duplo ataque de ala', 'Anaguma (torre móvel)'],
  de: ['Automatisch', 'Statischer Turm', 'Wandernder Turm (beliebig)', 'Turm auf Linie 4', 'Turm auf Linie 3', 'Zentraler Turm', 'Gegenturm', 'Yagura', 'Läufertausch', 'Gangi', 'Kletternder Silber', 'Doppelflügelangriff', 'Anaguma (wandernder Turm)'],
  hi: ['स्वचालित', 'स्थिर रूक', 'घूमता रूक (कोई भी)', 'चौथे स्तंभ का रूक', 'तीसरे स्तंभ का रूक', 'केंद्रीय रूक', 'आमने-सामने रूक', 'यागुरा', 'बिशप अदला-बदली', 'गांगी', 'चढ़ता सिल्वर', 'दोहरा विंग आक्रमण', 'अनागुमा (घूमता रूक)'],
  ar: ['تلقائي', 'الرخ الثابت', 'الرخ المتنقل (أي نوع)', 'الرخ في العمود الرابع', 'الرخ في العمود الثالث', 'الرخ المركزي', 'الرخ المقابل', 'ياغورا', 'تبادل الفيلين', 'غانغي', 'الفضي المتسلق', 'هجوم الجناحين المزدوج', 'أناغوما (الرخ المتنقل)'],
};
const LABEL = { ja: '戦型', en: 'Opening', zh: '战型', ko: '전법', es: 'Apertura', fr: 'Ouverture', pt: 'Abertura', de: 'Eröffnung', hi: 'ओपनिंग', ar: 'الافتتاح' };
const PLAN = { ja: '作戦', en: 'Plan', zh: '作战', ko: '작전', es: 'Plan', fr: 'Plan', pt: 'Plano', de: 'Plan', hi: 'योजना', ar: 'خطة' };
const CS_I18N = {};
for (const l in NAMES) { const o = CS_I18N[l] = { 'cs.label': LABEL[l], 'cs.plan': PLAN[l] }; STYLES.forEach((s, i) => { o['cs.s.' + s] = NAMES[l][i]; }); }
if (typeof I18N !== 'undefined') for (const l in CS_I18N) if (I18N[l]) Object.assign(I18N[l], CS_I18N[l]);

const api = { STYLES, PLANS, LIMIT, TOL, attach, styleOf, active, move, guard, tag, dlgUpdate, dlgOpen, dlgRead, I18N: CS_I18N, isEven, relUsi };
root.CpuStyle = api;
if (typeof module !== 'undefined') module.exports = api;
})(typeof self !== 'undefined' ? self : this);
