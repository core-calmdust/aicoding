'use strict';
// コナネのコーチ (common spec: shared/COACH.md, model: shogi/coach.js via ugolki/coach.js) — shown while the player is to
// move against the AI (and in two-player games on one device): the position at a glance (形勢・跳べる手の数・石の数・局面),
// the recommended plan with its reason, the candidate directions (分かれ道: each candidate's plan explained with the
// concrete numbers after it, moves shown on hover / tap with arrows on the board), prioritized "how to think" tips read
// from the position (勝ちの一手・残りの跳び・連続跳び・端の石…), and the verdict on the previous move (◎○△✕).
// The opening (the two removals) is taught from the rules, not from the evaluation: Black removes a centre or corner stone,
// White a stone next to the hole (sources checked 2026-11: Wikipedia "Kōnane", likonane.org, Board Game Arena).
// Every number shown is counted from the position (Pos.mobility = the jumps a side has); nothing is guessed.
// Texts: TX[lang] (en fallback); the other languages live in coach-i18n.js (KonaneCoach.merge).
(() => {
const TX = {
ja: {
  head: 'コーチ', sw: 'コーチ', swT: 'コーチ（考え方の解説）のオン／オフ', on: 'コーチ ON', off: 'コーチ OFF',
  rest: 'レッスン・パズル・観戦などの間、コーチはお休みです。自分の力で考えてみよう。AIとの対局や二人対戦に戻ると、コーチが再開します。',
  offNote: 'コーチ機能はオフになっています。右上のスイッチをオンにすると、局面の考え方や候補手の解説が表示されます。',
  overRv: '対局が終わりました。分析すると、この欄に一手ごとの振り返り（最善手・悪手とその理由）が表示されます。',
  oppTurn: '相手の手番です。相手が跳べる手は{n}通り。相手がどれを選ぶか、予想してみよう。',
  calc: '候補手を考えています…', form: '形勢', mob: '跳べる手', stones: '石', stage: '局面',
  'st.open': '序盤', 'st.mid': '中盤', 'st.end': '終盤',
  'f.win': '勝勢', 'f.big': '優勢', 'f.adv': '有利', 'f.sl': 'やや有利', 'f.even': '互角', 'f.sld': 'やや不利', 'f.dis': '不利', 'f.bad': '劣勢', 'f.lost': '敗勢',
  'mob.v': '自分{a}・相手{b}', 'st.v': '自分{a}・相手{b}',
  recWhy: 'この局面の第一候補は「{c}」の方針です。形勢は{f}（勝率{p}%）。',
  recSharp: '2番目の候補との差が大きく（勝率で{x}）、ここは正確に指したい局面です。',
  recBranch: '候補どうしの差が小さい分かれ道です。下の候補から好きな方針を選べます。',
  recOnly: 'ほかの手は大きく形勢を損ねます。迷わず指したい局面です。', recForced: '跳べる手はこれだけです。',
  brH: '分かれ道 — 選べる方針', brIntro: 'どれを選んでも大差はありません。自分の得意な進め方を選ぶのが上達の近道です。',
  cdH: '候補手と方針', cdIntro: '上位の候補を、方針ごとに解説します（数字は跳んだあとの跳べる手の数）。',
  'gap.best': '最善', 'gap.eq': 'ほぼ同じ', 'gap.lt': '少し劣る', 'gap.bad': '劣る',
  'q.best': '最善', 'q.good': '良い手', 'q.dubious': '疑問手', 'q.bad': '悪手',
  'tt.jump': '{sq}の石で{to}へ跳ぶ', 'tt.chain': '{sq}の石で{to}まで{n}個続けて取る', 'tt.rm': '{sq}の石を取り除く',
  'c.win': '勝ち筋', 'b.win': '勝ちを決める', 'x.win': 'AIの読みでは、ここから最後に跳ぶのは自分です。跳んだあと相手は{a}通り。最後まで相手の手を数えて。',
  'c.mate': '最後の跳び', 'b.mate': '相手を止める', 'x.mate': 'この跳びのあと、相手は1手も跳べません。この一手で勝ちです。',
  'c.chain': '連続跳び', 'b.chain': '続けて取る', 'x.chain': '同じ向きに{n}個続けて取ります。跳んだあと相手は{a}通り・自分は{c}通り。途中で止めた場合と比べて選ばれた手です。',
  'c.stop': '途中で止める', 'b.stop': '止めどころを選ぶ', 'x.stop': 'もっと先まで跳べますが、ここで止めます。跳んだあと相手は{a}通り・自分は{c}通り。跳びすぎると石が相手の踏み台になることがあります。',
  'c.cut': '相手の手を消す', 'b.cut': '相手の跳びを減らす', 'x.cut': '跳んだあと、相手の跳べる手は{b}通り→{a}通り。相手の手が先に尽きれば勝ちです。',
  'c.keep': '自分の手を残す', 'b.keep': '自分の跳びを残す', 'x.keep': '跳んだあとも自分の跳べる手が{c}通り残ります（相手は{a}通り）。あとで使える「貯金」を減らさない手です。',
  'c.edge': '端へ', 'b.edge': '端に寄せる', 'x.edge': '石を端の{to}へ。端の石は、端と直角の向きには跳び越されません。跳んだあと相手は{a}通り・自分は{c}通り。',
  'c.jump': '跳ぶ', 'b.jump': '1個取る', 'x.jump': '1個取ります。跳んだあと相手は{a}通り・自分は{c}通り。',
  opH: '序盤 — 最初の取り除き方', opIntro: 'コナネは盤いっぱいの石から始まり、最初の2手は自分の石を1個ずつ取り除くだけです。',
  'op.w0': '黒は中央の4マスか四隅の黒石を1個取ります。どれもルールどおりの始め方です。',
  'op.w1': '白は、黒が空けた{h}の上下左右どなりの白石を1個取ります。',
  'op.c': '中央', 'op.k': '隅', 'op.n': '隣',
  'op.c.t': '{sq}の石を取る（中央）', 'op.c.x': '中央を空けると、白は上下左右4つの隣から取る石を選べ、盤の真ん中から跳び合いが始まります。',
  'op.k.t': '{sq}の石を取る（隅）', 'op.k.x': '隅を空けると、白が取れる石は隣の2つだけ。盤の端から跳び合いが始まります。',
  'op.n.t': '{sq}の石を取る', 'op.n.x': '{h}の隣。空きが2つ並び、黒の最初の跳びの向きがここで決まります。',
  rmWhy: '最初の取り除きです。AIは{m}を少し好みますが、どれを選んでもルールどおりの始め方です。',
  prevOpen: '最初の取り除きです。どれもルールどおりの始め方です。', prevOpenAlt: 'AIは{m}を少し好みます。',
  tipsH: '考え方のヒント', more: 'ほかのヒント（{n}）', less: 'たたむ',
  prev: '前の手 {m}：{q}', prevBest: '「{c}」の方針で、AIの第一候補と同じ手です。', prevAlt: 'AIの第一候補は {m}（{c}）でした。', prevAltOk: 'AIの第一候補 {m}（{c}）と同じくらいの手です。',
  'lp.cut': '💡コツ：指す前に、跳んだあと相手が何通り跳べるかを数えよう。', 'lp.keep': '💡コツ：相手の手を減らすだけでなく、自分の跳べる手も残そう。',
  'lp.stop': '💡コツ：連続跳びはどこで止めてもよい。止めた石が相手の踏み台にならないか確かめよう。',
  'tp.mate': '跳んだあと相手が1手も跳べなくなる手があります。探してみよう。', 'tp.last': 'あなたの跳べる手は残り1つです。次に跳べる形を残せるかが勝負。',
  'tp.oppLast': '相手の跳べる手は{n}通りだけ。それを消す跳びがないか探そう。',
  'tp.chain': '{sq}の石は同じ向きに{n}個続けて取れます。ただし止める場所も選べます。',
  'tp.behind': '跳べる手の数で負けています（自分{a}・相手{b}）。相手の手を消す跳びを優先しよう。', 'tp.ahead': '跳べる手の数でリード（自分{a}・相手{b}）。自分の手を無駄に使わず残しておこう。',
  'tp.edge': '端の石は、端と直角の向きには跳び越されません。隅の石は取られにくい石です。',
  'tp.end': '石が少なくなりました。相手の応手を全部数えられる局面です。跳んだあとの両方の手の数を確かめよう。',
  'tp.rule': 'コナネは最後に跳んだ人の勝ち。取った石の数は関係ありません。',
  'tp.lane': '空きマスの並びが跳びの道になります。自分の石の隣に相手の石、その先に空き——この形を数えよう。',
  'tp.branch': '候補どうしの差は小さい分かれ道です。', 'tp.sharp': '最善とほかの差が大きい（勝率{x}）局面です。慎重に。',
  'tp.winning': '有利です。相手の跳べる手を数えて、逆転の筋がないか確かめよう。', 'tp.losing': '苦しい局面。相手の跳べる手を1つずつ消していこう。',
  sep: '、',
  gl: {
    mob: { m: ['跳べる手'], t: '跳べる手（モビリティ）', d: 'いま指せる跳びの数。自分の番に0なら負けです。' },
    chain: { m: ['連続跳び', '続けて'], t: '連続跳び', d: '同じ向きに2個以上続けて取る跳び。どこで止めてもよい。' },
  },
},
en: {
  head: 'Coach', sw: 'Coach', swT: 'Coach (how-to-think explanations) on / off', on: 'Coach ON', off: 'Coach OFF',
  rest: 'The coach rests during lessons, puzzles, watching and similar. Think for yourself! It comes back in games against the AI or two-player games.',
  offNote: 'The coach is off. Turn the switch at the top right on to see how to think about the position and what the candidates mean.',
  overRv: 'The game is over. Analyse it to see a move-by-move review here (best moves, mistakes and why).',
  oppTurn: 'Your opponent is to move and has {n} jumps. Guess which one they will choose.',
  calc: 'Looking at the candidates…', form: 'Position', mob: 'Jumps', stones: 'Stones', stage: 'Phase',
  'st.open': 'Opening', 'st.mid': 'Middlegame', 'st.end': 'Endgame',
  'f.win': 'Winning', 'f.big': 'Much better', 'f.adv': 'Better', 'f.sl': 'Slightly better', 'f.even': 'Even', 'f.sld': 'Slightly worse', 'f.dis': 'Worse', 'f.bad': 'Much worse', 'f.lost': 'Losing',
  'mob.v': 'you {a} · them {b}', 'st.v': 'you {a} · them {b}',
  recWhy: 'The first choice here is “{c}”. The position is {f} ({p}% to win).',
  recSharp: 'The second choice is clearly worse ({x} less), so play precisely here.',
  recBranch: 'The candidates are close: pick the plan you like below.',
  recOnly: 'Every other move spoils the position. Play this one.', recForced: 'This is your only jump.',
  brH: 'Crossroads — plans to choose from', brIntro: 'None of these is much worse. Choosing the plan you understand best is how you improve.',
  cdH: 'Candidates and plans', cdIntro: 'The top candidates, explained by plan (numbers are the jumps each side has afterwards).',
  'gap.best': 'Best', 'gap.eq': 'About equal', 'gap.lt': 'A little worse', 'gap.bad': 'Worse',
  'q.best': 'Best', 'q.good': 'Good', 'q.dubious': 'Dubious', 'q.bad': 'Mistake',
  'tt.jump': 'Jump {sq} to {to}', 'tt.chain': 'Take {n} in a row with {sq} to {to}', 'tt.rm': 'Remove the stone on {sq}',
  'c.win': 'Winning line', 'b.win': 'Finish the win', 'x.win': 'The AI sees you making the last jump from here. Afterwards they have {a}. Keep counting their jumps to the end.',
  'c.mate': 'Last jump', 'b.mate': 'Leave them stuck', 'x.mate': 'After this jump your opponent has no jump at all. This move wins.',
  'c.chain': 'Multiple jump', 'b.chain': 'Keep capturing', 'x.chain': 'Take {n} in a row in one direction. Afterwards they have {a} jumps and you {c} — chosen over stopping earlier.',
  'c.stop': 'Stop early', 'b.stop': 'Choose where to stop', 'x.stop': 'You could jump further but stop here. Afterwards they have {a} jumps and you {c}. Jumping too far can make your stone a stepping stone.',
  'c.cut': 'Cut their jumps', 'b.cut': 'Reduce their jumps', 'x.cut': 'After this jump the opponent’s jumps go from {b} to {a}. Whoever runs out first loses.',
  'c.keep': 'Keep your jumps', 'b.keep': 'Keep jumps of your own', 'x.keep': 'You still have {c} jumps afterwards (they have {a}). It keeps your savings for later.',
  'c.edge': 'To the edge', 'b.edge': 'Move to the edge', 'x.edge': 'Land on the edge at {to}. An edge stone cannot be jumped at right angles to the edge. Afterwards they have {a} jumps and you {c}.',
  'c.jump': 'Jump', 'b.jump': 'Take one', 'x.jump': 'Take one stone. Afterwards they have {a} jumps and you {c}.',
  opH: 'Opening — the first removals', opIntro: 'Kōnane starts with a full board; the first two moves only remove one of your own stones each.',
  'op.w0': 'Black removes a black stone from the four centre squares or a corner. Every one is a legal start.',
  'op.w1': 'White removes a white stone next to the hole Black made at {h} (up, down, left or right).',
  'op.c': 'Centre', 'op.k': 'Corner', 'op.n': 'Neighbour',
  'op.c.t': 'Remove {sq} (centre)', 'op.c.x': 'Emptying the centre gives White four neighbours to choose from, and the jumping starts in the middle of the board.',
  'op.k.t': 'Remove {sq} (corner)', 'op.k.x': 'Emptying a corner leaves White only the two neighbours to remove. The jumping starts from the edge.',
  'op.n.t': 'Remove {sq}', 'op.n.x': 'Next to {h}. Two empty squares now touch, which fixes the direction of Black’s first jump.',
  rmWhy: 'The first removal. The AI slightly prefers {m}, but every choice is a legal start.',
  prevOpen: 'The first removal — every choice is a legal start.', prevOpenAlt: 'The AI slightly prefers {m}.',
  tipsH: 'How to think', more: 'More tips ({n})', less: 'Fewer',
  prev: 'Last move {m}: {q}', prevBest: '“{c}” — the AI’s first choice too.', prevAlt: 'The AI’s first choice was {m} ({c}).', prevAltOk: 'About as good as the AI’s first choice {m} ({c}).',
  'lp.cut': '💡Tip: before moving, count how many jumps your opponent will have afterwards.', 'lp.keep': '💡Tip: do not only cut their jumps — keep some of your own.',
  'lp.stop': '💡Tip: a multiple jump may stop anywhere. Check the stone you stop with does not become a stepping stone.',
  'tp.mate': 'One of your jumps leaves the opponent with none. Find it!', 'tp.last': 'You have only one jump left. Can you keep a jump for next turn?',
  'tp.oppLast': 'Your opponent has only {n} jump(s). Look for a jump that removes them.',
  'tp.chain': 'The stone on {sq} can take {n} in a row in one direction — and you may stop anywhere.',
  'tp.behind': 'You have fewer jumps (you {a}, them {b}). Prefer jumps that remove theirs.', 'tp.ahead': 'You have more jumps (you {a}, them {b}). Do not waste your own.',
  'tp.edge': 'An edge stone cannot be jumped at right angles to the edge; corner stones are the hardest to take.',
  'tp.end': 'Few stones left: you can count every reply. Check both sides’ jumps after your move.',
  'tp.rule': 'In kōnane the last player to jump wins. The number of captures does not matter.',
  'tp.lane': 'Rows of empty squares are the jumping lanes: your stone, an enemy stone, then an empty square — count these shapes.',
  'tp.branch': 'The candidates are close here.', 'tp.sharp': 'The best move is clearly better ({x}). Take care.',
  'tp.winning': 'You are ahead. Count their jumps to make sure there is no comeback.', 'tp.losing': 'A hard position. Remove their jumps one by one.',
  sep: ', ',
  gl: {
    mob: { m: ['jumps', 'jump'], t: 'Jumps (mobility)', d: 'The captures you can make now. None on your turn means you lose.' },
    chain: { m: ['multiple jump', 'in a row'], t: 'Multiple jump', d: 'Taking two or more stones in a row in one direction. You may stop anywhere.' },
  },
},
};
const L = () => (typeof LANG !== 'undefined' && TX[LANG]) ? LANG : 'en';
function tx(k, v) {
  const l = L(); let x = TX[l][k]; if (x === undefined) x = TX.en[k]; if (x === undefined) x = TX.ja[k]; if (x === undefined) return k;
  if (v && typeof x === 'string') x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : '');
  return x;
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const gl = h => window.CoachKit ? CoachKit.gloss(h, (TX[L()] || TX.en).gl || TX.en.gl) : h;
const pctS = x => Math.round(x * 100) + '%';
const wr = v => (1 + sOfV(v)) / 2;
const SQN = i => E.sqName(i);
// --------------------------------------------------------------------------------------------- position facts
const onEdge = i => { const N = E.N, r = Math.floor(i / N), c = i % N; return r === 0 || c === 0 || r === N - 1 || c === N - 1; };
function facts(pos, n) {
  const us = pos.turn, them = 3 - us, f = { us, n };
  f.legal = pos.moves();
  f.mob = [pos.mobility(us), pos.mobility(them)];
  f.st = [pos.count(us), pos.count(them)];
  const all = f.st[0] + f.st[1];
  f.stage = pos.opening ? 'open' : all <= E.NN * 0.38 || f.mob[0] + f.mob[1] <= 6 ? 'end' : all >= E.NN * 0.82 ? 'open' : 'mid';
  f.mate = null; f.chain = null;
  if (!pos.opening) for (const m of f.legal) {
    const q = pos.clone().play(m);
    if (!q.mobility(them) && !f.mate) f.mate = m;
    if (E.hops(m) >= 2 && (!f.chain || E.hops(m) > E.hops(f.chain))) f.chain = m;
  }
  return f;
}
// the plan of a move: what it does to both sides' jumps
function classify(pos, m, f, v) {
  const us = pos.turn, them = 3 - us, fr = E.mFrom(m), to = E.mTo(m), n = E.hops(m);
  const base = { sq: SQN(fr), to: SQN(to), n, m };
  if (E.isRemove(m)) return Object.assign(base, { k: 'rm' });
  const q = pos.clone().play(m), a = q.mobility(them), c = q.mobility(us);
  Object.assign(base, { a, b: f.mob[1], c });
  if (!a) return Object.assign(base, { k: 'mate' });
  if (v != null && v > WINT) return Object.assign(base, { k: 'win' });
  const pth = E.path(pos, m), longer = f.legal.some(x => x !== m && E.mFrom(x) === fr && E.hops(x) > n && E.path(pos, x)[1] === pth[1]);
  if (n >= 2) return Object.assign(base, { k: 'chain' });
  if (longer) return Object.assign(base, { k: 'stop' });
  let minA = Infinity; for (const x of f.legal) minA = Math.min(minA, pos.clone().play(x).mobility(them));
  if (a <= minA && a < f.mob[1]) return Object.assign(base, { k: 'cut' });
  if (c >= f.mob[0] - 1 && c >= a) return Object.assign(base, { k: 'keep' });
  if (onEdge(to)) return Object.assign(base, { k: 'edge' });
  return Object.assign(base, { k: 'jump' });
}
const RCLS = { win: 'c-win', mate: 'c-win', chain: 'c-mat', stop: 'c-def', cut: 'c-mat', keep: 'c-def', edge: 'c-dev', jump: 'c-dev', rm: 'c-dev' };
const CCLS = RCLS;
function formOf(w) { return w >= .9 ? 'win' : w >= .75 ? 'big' : w >= .62 ? 'adv' : w >= .54 ? 'sl' : w > .46 ? 'even' : w > .38 ? 'sld' : w > .25 ? 'dis' : w > .1 ? 'bad' : 'lost'; }
function ttl(k) { return k.k === 'rm' ? tx('tt.rm', k) : k.n >= 2 ? tx('tt.chain', k) : tx('tt.jump', k); }
const catTxt = k => tx('x.' + k.k, k);
// --------------------------------------------------------------------------------------------- the opening (rules, not evaluation)
const isCentre = i => { const N = E.N, r = Math.floor(i / N), c = i % N, h = N / 2; return (r === h - 1 || r === h) && (c === h - 1 || c === h); };
function holeOf(pos) { for (let i = 0; i < E.NN; i++) if (!pos.owner(i)) return i; return -1; }
function openItems(pos, list) {
  const ms = pos.moves(), ply = pos.ply, h = ply === 1 ? holeOf(pos) : -1;
  const L = list && list.length ? list.slice().sort((a, b) => b.v - a.v) : null;
  const order = ms.slice().sort((a, b) => (isCentre(E.mFrom(b)) - isCentre(E.mFrom(a))) || a - b);
  return order.map(m => {
    const sq = SQN(E.mFrom(m)), key = ply === 0 ? (isCentre(E.mFrom(m)) ? 'c' : 'k') : 'n';
    const it = { tag: tx('op.' + key), cls: key === 'c' ? 'c-mat' : 'c-dev', title: esc(tx('op.' + key + '.t', { sq })), text: gl(esc(tx('op.' + key + '.x', { h: h >= 0 ? SQN(h) : '' }))), move: String(m), mvName: E.name(pos, m), m };
    if (L) { const e = L.find(x => x.m === m); if (e) { const d = Math.max(0, wr(L[0].v) - wr(e.v)), g = gapOf(d, e === L[0] ? 0 : 1); it.gap = tx(g[0]); it.gcls = g[1]; } }
    return it;
  });
}
// --------------------------------------------------------------------------------------------- state / rendering
const S = { open: false, key: '', f: null, lists: new Map(), hov: null, items: null };
let card = null;
function usable() { return !!(!lesson && !puzzle && !rgame && !ken && (settings.mode === 'ai' || settings.mode === 'pvp') && !document.body.classList.contains('in-online')); }
function active() { return !!(settings.coach && usable()); }
function myTurn() { return !gameOver(cur) && cur === moves.length && !reviewing && (settings.mode === 'pvp' || toMoveAt(cur) === humanColor); }
function listAt(i) { const k = keyOf(i); return anaCache.get(k) || S.lists.get(k) || null; }
function factsNow() {
  const key = keyOf(cur) + '|' + LANG;
  if (S.key === key && S.f) return S.f;
  S.key = key; S.f = null;
  try { S.f = facts(posAt(cur).pos.clone(), cur); } catch (e) { S.f = { n: cur, legal: [], mob: [0, 0], st: [0, 0], stage: 'mid' }; }
  return S.f;
}
function candInfo(list, f, pos) {
  if (!list || !list.length) return null;
  const L = list.slice().sort((a, b) => b.v - a.v), best = L[0].v, wb = wr(best);
  const items = [];
  for (const c of L.slice(0, 6)) {
    let k; try { k = classify(pos, c.m, f, c.v); } catch (e) { continue; }
    items.push({ u: c.m, k, drop: Math.max(0, wb - wr(c.v)), v: c.v, nm: E.name(pos, c.m) });
  }
  const seen = new Set(), dirs = [];
  for (const it of items) { if (seen.has(it.k.k) && dirs.length) continue; seen.add(it.k.k); dirs.push(it); if (dirs.length >= 3) break; }
  const close = dirs.filter(d => d.drop <= 0.05), second = items[1] ? items[1].drop : null;
  return { items, dirs, best: items[0], branch: close.length >= 2 && best < WINT, sharp: second != null && second >= 0.12 && best < WINT ? pctS(second) : '', only: second != null && second >= 0.25, forced: L.length === 1 };
}
function gapOf(d, i) { return i === 0 ? ['gap.best', 'g0'] : d <= 0.05 ? ['gap.eq', 'g1'] : d <= 0.12 ? ['gap.lt', 'g2'] : ['gap.bad', 'g3']; }
function tipsOf(f, w, cl) {
  const out = [], add = (k, pr, v, hi) => out.push({ k, pr, v, hi });
  if (f.stage === 'open' && f.n < 2) return out;
  if (f.mate != null) add('tp.mate', 100, {}, 1);
  if (f.mob[0] === 1) add('tp.last', 92, {}, 1);
  if (f.mob[1] <= 2 && f.mob[1] > 0) add('tp.oppLast', 88, { n: f.mob[1] }, 1);
  if (f.chain != null) add('tp.chain', 70, { sq: SQN(E.mFrom(f.chain)), n: E.hops(f.chain) });
  if (f.mob[0] + 2 <= f.mob[1]) add('tp.behind', 66, { a: f.mob[0], b: f.mob[1] });
  else if (f.mob[0] >= f.mob[1] + 3) add('tp.ahead', 60, { a: f.mob[0], b: f.mob[1] });
  if (f.stage === 'end') add('tp.end', 62);
  if (w != null) { if (w >= .8) add('tp.winning', 46); else if (w <= .25) add('tp.losing', 46); }
  if (cl && cl.branch) add('tp.branch', 58);
  if (cl && cl.sharp) add('tp.sharp', 56, { x: cl.sharp });
  add('tp.rule', f.stage === 'open' ? 40 : 20);
  add('tp.lane', f.stage === 'open' ? 38 : 22);
  if (f.stage !== 'end') add('tp.edge', 30);
  return out.sort((a, b) => b.pr - a.pr);
}
function verdictHtml() {
  const N = moves.length; if (!N) return '';
  let i = N - 1;
  if (settings.mode === 'ai') { while (i >= 0 && N - i <= 2 && toMoveAt(i) !== humanColor) i--; if (i < 0 || N - i > 2) return ''; }
  const pos = posAt(i).pos.clone(), m = moves[i], nm = E.name(pos, m);
  const mv = (i + 1) + '. ' + nm;
  const L = listAt(i);
  if (E.isRemove(m)) {
    let body = esc(tx('prevOpen'));
    if (L && L.length) { let best = L[0]; for (const e of L) if (e.v > best.v) best = e; if (best.m !== m) body += ' ' + esc(tx('prevOpenAlt', { m: E.name(pos, best.m) })); }
    return CoachKit.verdict(0, esc(tx('prev', { m: mv, q: tx('q.good') })), body);
  }
  if (!L || !L.length) return '';
  const mine = L.find(e => e.m === m); if (!mine) return '';
  let best = L[0]; for (const e of L) if (e.v > best.v) best = e;
  const loss = sOfV(best.v) - sOfV(mine.v);
  let q = 'good';
  if ((best.v > WINT - 1000 && mine.v <= WINT - 1000) || (best.v >= -(WINT - 1000) && mine.v < -(WINT - 1000)) || loss >= 0.3) q = 'bad';
  else if (loss >= 0.12) q = 'dubious';
  else if (mine.v >= best.v - 10) q = 'best';
  if (L.length === 1) q = 'best';
  const g = { best: 0, good: 1, dubious: 2, bad: 3 }[q];
  let body = '';
  try {
    const ff = facts(pos.clone(), i);
    if (best.m !== m && q !== 'best') {
      const k = classify(pos.clone(), best.m, ff, best.v), mk = classify(pos.clone(), m, ff, mine.v);
      body = esc(tx(q === 'good' ? 'prevAltOk' : 'prevAlt', { m: E.name(pos, best.m), c: tx('c.' + k.k) }));
      if (q === 'dubious' || q === 'bad') {
        const sameLine = E.mFrom(best.m) === E.mFrom(m) && E.path(pos, best.m)[1] === E.path(pos, m)[1];
        body += '<br>' + esc(tx(sameLine ? 'lp.stop' : (mk.c < k.c && mk.a <= k.a) ? 'lp.keep' : 'lp.cut'));
      }
    } else { const k = classify(pos.clone(), m, ff, mine.v); body = esc(tx('prevBest', { c: tx('c.' + k.k) })); }
  } catch (e) {}
  return CoachKit.verdict(g, esc(tx('prev', { m: mv, q: tx('q.' + q) })), gl(body));
}
function restNow(rv, can) {
  if (can || !card) return false;
  const b = document.body.classList, st = typeof settings !== 'undefined' ? settings : {};
  if (b.contains('in-online') || st.mode === 'online') return false;
  const ls = (typeof lesson !== 'undefined' && !!lesson) || (typeof puzzle !== 'undefined' && !!puzzle && typeof puzzle !== 'function') || b.contains('in-lesson') || b.contains('in-puzzle');
  if (rv && !ls) return false;
  if (ls || b.contains('in-edit') || b.contains('in-study') || b.contains('rated-live') || st.mode === 'watch') return true;
  return !usable();
}
function render() {
  if (!card) return;
  if (window.SeqPrac && SeqPrac.active() && SeqPrac.paint()) return;   // the 3-move opening practice (shared/seqprac.js, 2026-11-10)
  if (KonaneCoach.sw) KonaneCoach.sw.sync();
  const rv = !!document.querySelector('#reviewCard.show');
  const over = moves.length > 0 && gameOver(moves.length), playing = !over && cur === moves.length && !reviewing;
  const on = active(), can = usable() && (playing || (over && !rv));
  const resting = restNow(rv, can);
  card.classList.toggle('ck-rest', resting);
  if (resting) {
    card.classList.remove('hidden'); card.classList.add('ck-off'); document.body.classList.add('ck-tab'); S.rvWas = rv;
    S.items = null; S.hov = null;
    return put(CoachKit.lessonRest ? CoachKit.lessonRest(card, `<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('rest'))}</p>`) : `<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('rest'))}</p>`);
  }
  card.classList.toggle('hidden', !can);
  card.classList.toggle('ck-off', can && !on && !over);
  document.body.classList.toggle('ck-tab', can || rv);
  if (rv && !S.rvWas) { const b = document.querySelector('#mtabs [data-it=coach]'); if (b && getComputedStyle(b).display !== 'none' && document.body.dataset.it !== 'coach') b.click(); }
  S.rvWas = rv;
  if (!can) { S.items = null; return; }
  if (over) {
    S.items = null;
    put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('overRv'))}</p><div class="ck-sec"><button type="button" class="ck-rvgo" data-ck="rv">${esc(t('rv.btn'))}</button></div>` + (on ? verdictHtml() : ''));
    const b = card.querySelector('[data-ck=rv]'); if (b) b.onclick = () => { if (typeof runReview === 'function') runReview(); };
    return;
  }
  if (!on) { S.items = null; return put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('offNote'))}</p>`); }
  const f = factsNow();
  let h = `<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span>${!gameOver(cur) ? `<small>${esc(tx('st.' + (f.stage || 'mid')))}</small>` : ''}</h3>`;
  if (!myTurn()) { S.items = null; h += `<p class="ck-muted">${esc(tx('oppTurn', { n: f.mob[0] }))}</p>` + verdictHtml(); return put(h); }
  const pos = posAt(cur).pos.clone(), list = listAt(cur);
  let bv = null; if (list && list.length) { bv = -Infinity; for (const e of list) bv = Math.max(bv, e.v); }
  const w = bv != null && !pos.opening ? wr(bv) : null;
  const chips = [];
  if (w != null && settings.eval) chips.push({ k: tx('form'), v: esc(tx('f.' + formOf(w)) + ' ' + pctS(w)), cls: w >= .54 ? 'pos' : w <= .46 ? 'neg' : '' });
  if (!pos.opening) chips.push({ k: tx('mob'), v: esc(tx('mob.v', { a: f.mob[0], b: f.mob[1] })), cls: f.mob[0] > f.mob[1] ? 'pos' : f.mob[0] < f.mob[1] ? 'neg' : '' });
  chips.push({ k: tx('stones'), v: esc(tx('st.v', { a: f.st[0], b: f.st[1] })) });
  h += CoachKit.summary(chips);
  let cl = null;
  if (pos.opening) {
    const items = openItems(pos, list);
    S.items = items.map(x => x.m);
    let intro = esc(tx('opIntro')) + ' ' + esc(pos.ply === 0 ? tx('op.w0') : tx('op.w1', { h: SQN(holeOf(pos)) }));
    if (list && list.length) { let b = list[0]; for (const e of list) if (e.v > b.v) b = e; h += CoachKit.rec(tx('op.' + (pos.ply === 0 ? (isCentre(E.mFrom(b.m)) ? 'c' : 'k') : 'n')), esc(tx('rmWhy', { m: E.name(pos, b.m) })), 'c-dev'); }
    h += CoachKit.branches({ head: tx('opH'), intro: gl(intro), reveal: true, items });
  } else {
    cl = candInfo(list, f, pos);
    if (cl && cl.best) {
      const b = cl.best;
      let why = esc(tx('recWhy', { c: tx('c.' + b.k.k), f: tx('f.' + formOf(wr(b.v))), p: Math.round(wr(b.v) * 100) }));
      if (cl.forced) why = esc(tx('recForced'));
      else if (cl.only) why += ' ' + esc(tx('recOnly')); else if (cl.sharp) why += ' ' + esc(tx('recSharp', { x: cl.sharp })); else if (cl.branch) why += ' ' + esc(tx('recBranch'));
      h += CoachKit.rec(tx('b.' + b.k.k), gl(why), RCLS[b.k.k] || '');
      h += CoachKit.branches({
        head: tx(cl.branch ? 'brH' : 'cdH'), intro: gl(esc(tx(cl.branch ? 'brIntro' : 'cdIntro'))),
        items: cl.dirs.map((d, i) => { const g = gapOf(d.drop, i); return { tag: tx('c.' + d.k.k), cls: CCLS[d.k.k] || '', title: esc(ttl(d.k)), text: gl(esc(catTxt(d.k))), gap: tx(g[0]) + (d.drop > 0.005 ? ' −' + pctS(d.drop) : ''), gcls: g[1], move: String(d.u), mvName: d.nm }; }),
      });
    } else { S.items = null; h += `<p class="ck-calc">${esc(tx('calc'))}</p>`; }
  }
  const tl = tipsOf(f, w, cl);
  if (tl.length) h += CoachKit.tips({ head: tx('tipsH'), list: tl.map(x => ({ html: gl(esc(tx(x.k, x.v || {}))), hi: x.hi })), open: S.open, more: tx('more', { n: Math.max(0, tl.length - 3) }), less: tx('less') });
  h += verdictHtml();
  put(h);
}
function put(h) {
  if (card.dataset.h === h) return;
  const keep = card.scrollTop; card.dataset.h = h; card.innerHTML = h; card.scrollTop = keep;
  CoachKit.bind(card, {
    onMore: () => { S.open = !S.open; render(); },
    onHover: u => { const v = u == null ? null : +u; if (S.hov !== v) { S.hov = v; renderFx(); } },
    onPlay: u => { try { if (!active() || !myTurn() || !canHumanPlay()) return; const m = +u; if (!posAt(cur).pos.moves().includes(m)) return; S.hov = null; commit(m); } catch (e) {} },
  });
}
function fx(svg, pos) {
  if (!active() || !myTurn() || sel) return;
  const L = S.hov != null ? [S.hov] : [];
  const legal = pos.moves();
  for (const m of L) if (legal.includes(m)) { if (E.isRemove(m)) { const [r, c] = dRC(E.mFrom(m)), o = document.createElementNS(NS, 'circle'); o.setAttribute('cx', c + 0.5); o.setAttribute('cy', r + 0.5); o.setAttribute('r', 0.42); o.setAttribute('class', 'ring ck'); o.setAttribute('fill', 'none'); o.setAttribute('stroke-width', 0.07); svg.appendChild(o); } else svgArrow(svg, E.path(pos, m), 'ck'); }
}
function cands(key, list) { if (list && list.length) { S.lists.set(key, list); if (S.lists.size > 400) S.lists.delete(S.lists.keys().next().value); } }
function init() {
  if (!window.CoachKit) return;
  if (settings.coach === undefined) settings.coach = true;
  CoachKit.css(); CoachKit.glossBind(() => (TX[L()] || TX.en).gl);
  card = document.getElementById('coachCard');
  if (window.MutationObserver) { let k = ''; const mo = () => { const b = document.body.classList, n = ['in-lesson', 'in-puzzle', 'in-online', 'in-edit', 'in-study', 'rated-live', 'in-watch'].map(c => b.contains(c) ? 1 : 0).join(''); if (n !== k) { k = n; render(); } }; new MutationObserver(mo).observe(document.body, { attributes: true, attributeFilter: ['class'] }); }
  { const rc = document.getElementById('reviewCard'); if (rc && window.MutationObserver) new MutationObserver(() => render()).observe(rc, { attributes: true, attributeFilter: ['class'] }); }
  KonaneCoach.sw = CoachKit.sw({ mount: '.brand-r', get: () => !!settings.coach, set: v => setOn(v), label: on => ({ text: tx('sw'), title: tx('swT') + ' — ' + tx(on ? 'on' : 'off') }) });
}
function setOn(v) {
  settings.coach = !!v; save();
  CoachKit.flash(tx(v ? 'on' : 'off'));
  S.hov = null; render(); renderFx();
  if (v && !listAt(cur)) analyzeCurrent(busyToken);
}
function relabel() { if (KonaneCoach.sw) KonaneCoach.sw.sync(); S.key = ''; render(); }
function merge(more) { for (const l in more) TX[l] = Object.assign({}, TX[l] || {}, more[l], { gl: Object.assign({}, (TX[l] || {}).gl || {}, more[l].gl || {}) }); }
window.KonaneCoach = { init, render, relabel, merge, tx, TX, active, usable, cands, fx };
})();
