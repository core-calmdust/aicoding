
'use strict';
// アルティメット三目並べのコーチ (common spec: shared/COACH.md, model: shogi/coach.js via konane/coach.js) — shown while the player
// is to move against the AI (and in two-player games on one device): the position at a glance (形勢・取った小盤・送り先・局面),
// the recommended plan with its reason, the candidate directions (分かれ道: each candidate's plan with the board facts after
// it — the small board it wins or blocks, where it sends the opponent and what the opponent can do there), prioritized
// "how to think" tips read from the position, and the verdict on the previous move (◎○△✕).
// Every fact shown is read from the position (lines of two, the board a move sends to, a free choice); nothing is guessed.
// Opening knowledge (sources checked 2026-11): the centre board lies on 4 of the 8 lines of the big board (geometry); a cell sends the
// opponent to the board of the same place, and a decided board gives a free choice (the rules; Orlin 2013, Wikipedia).
// Texts: TX[lang] (en fallback); the other languages live in coach-i18n.js (UtttCoach.merge).
(() => {
const TX = {
ja: {
  head: 'コーチ', sw: 'コーチ', swT: 'コーチ（考え方の解説）のオン／オフ', on: 'コーチ ON', off: 'コーチ OFF',
  rest: 'レッスン・パズル・観戦などの間、コーチはお休みです。自分の力で考えてみよう。AIとの対局や二人対戦に戻ると、コーチが再開します。',
  offNote: 'コーチ機能はオフになっています。右上のスイッチをオンにすると、局面の考え方や候補手の解説が表示されます。',
  overRv: '対局が終わりました。分析すると、この欄に一手ごとの振り返り（最善手・悪手とその理由）が表示されます。',
  oppTurn: '相手の手番です。相手が置けるマスは{n}か所。どこへ置いてくるか予想してみよう。',
  calc: '候補手を考えています…', form: '形勢', won: '取った小盤', where: '置ける所', stage: '局面',
  'st.open': '序盤', 'st.mid': '中盤', 'st.end': '終盤',
  'f.win': '勝勢', 'f.big': '優勢', 'f.adv': '有利', 'f.sl': 'やや有利', 'f.even': '互角', 'f.sld': 'やや不利', 'f.dis': '不利', 'f.bad': '劣勢', 'f.lost': '敗勢',
  'won.v': '自分{a}・相手{b}', 'where.free': 'どこでも', 'where.to': '{b}の小盤',
  recWhy: 'この局面の第一候補は「{c}」の方針です。形勢は{f}（勝率{p}%）。',
  recSharp: '2番目の候補との差が大きく（勝率で{x}）、ここは正確に打ちたい局面です。',
  recBranch: '候補どうしの差が小さい分かれ道です。下の候補から好きな方針を選べます。',
  recOnly: 'ほかの手は大きく形勢を損ねます。迷わず打ちたい局面です。', recForced: '置けるマスはここだけです。',
  brH: '分かれ道 — 選べる方針', brIntro: 'どれを選んでも大差はありません。自分の得意な進め方を選ぶのが上達の近道です。',
  cdH: '候補手と方針', cdIntro: '上位の候補を方針ごとに解説します。どれも「どの小盤へ相手を送るか」まで含めて選ばれた手です。',
  'gap.best': '最善', 'gap.eq': 'ほぼ同じ', 'gap.lt': '少し劣る', 'gap.bad': '劣る',
  'q.best': '最善', 'q.good': '良い手', 'q.dubious': '疑問手', 'q.bad': '悪手',
  tt: '{sq}（{b}の小盤）に置く',
  'c.win': '勝ちを決める', 'b.win': '大盤で3つ並べる', 'x.win': 'この手で{b}の小盤を取り、大盤に3つ並びます。勝ちです。',
  'c.force': '勝ち筋', 'b.force': '読み切りの勝ち', 'x.force': 'AIの読みでは、ここから相手がどう受けても勝てる筋です。',
  'c.take': '小盤を取る', 'b.take': '小盤を取る', 'x.take': '{b}の小盤を取ります（取った小盤は{n}つに）。',
  'c.block': '受ける', 'b.block': '相手の狙いを消す', 'x.block': '{b}の小盤で相手が狙っている3つ目のマスをふさぎます。',
  'c.build': '2つ並べる', 'b.build': '次の狙いを作る', 'x.build': '{b}の小盤で2つ並べ、次にそこを取る狙いを作ります。',
  'c.safe': '安全な送り先', 'b.safe': '送り先を選ぶ', 'x.safe': '置く位置で相手を送る先を選んだ手です。',
  'c.quiet': '形を整える', 'b.quiet': '静かな一手', 'x.quiet': '大きな得はありませんが、相手に良い送り先を与えない手です。',
  'to.free': '送り先が決着済みなので、相手はどこにでも置けます。', 'to.gift': '送り先の{t}の小盤では、相手がすぐ小盤を取れます。', 'to.ok': '相手は{t}の小盤へ。そこではすぐには小盤を取れません。', 'to.same': '相手は同じ{t}の小盤へ。',
  opH: '序盤 — 最初の一手', opIntro: '最初の一手だけはどこにでも置けます。置いたマスの位置が、そのまま相手の小盤になります。',
  'op.c': '中央の小盤', 'op.c.t': '{sq}（中央の小盤）に置く', 'op.c.x': '中央の小盤は大盤の8本の列のうち4本に入る、いちばん大事な小盤です。',
  'op.k': '隅の小盤', 'op.k.t': '{sq}（{b}の小盤）に置く', 'op.k.x': '隅の小盤は大盤の列3本に入ります。',
  'op.e': '辺の小盤', 'op.e.t': '{sq}（{b}の小盤）に置く', 'op.e.x': '辺の小盤は大盤の列2本に入ります。',
  rmWhy: 'AIは{m}を少し好みますが、最初の一手で勝負が決まることはありません。',
  tipsH: '考え方のヒント', more: 'ほかのヒント（{n}）', less: 'たたむ',
  prev: '前の手 {m}：{q}', prevBest: '「{c}」の方針で、AIの第一候補と同じ手です。', prevAlt: 'AIの第一候補は {m}（{c}）でした。', prevAltOk: 'AIの第一候補 {m}（{c}）と同じくらいの手です。',
  'lp.free': '💡コツ：決着した小盤へ送ると相手はどこにでも置けます。送り先がまだ空いているか確かめよう。',
  'lp.gift': '💡コツ：置く前に、送り先の小盤で相手に2つ並びがないか見よう。',
  'lp.take': '💡コツ：取れる小盤を見逃さないように。取ったあとの送り先も一緒に確かめよう。',
  'lp.gen': '💡コツ：置く位置は「自分の小盤」と「相手の行き先」の両方で選ぼう。',
  'tp.win': 'この手番で大盤の3つ並びを完成できます。どの小盤を取ればいいか探そう。',
  'tp.take': '{b}の小盤を今すぐ取れます。ただ、取ったあと相手がどこへ行くかも見よう。',
  'tp.free': 'いまはどこにでも置けます。いちばん大事な小盤（自分の狙い・相手の狙い）を選ぼう。',
  'tp.threat': '相手は{b}の小盤で2つ並んでいます。そこへ相手を送らないようにしよう。',
  'tp.bigThreat': '相手は大盤で2つ並んでいます。3つ目の{b}の小盤を相手に取らせないことが最優先です。',
  'tp.bigMine': 'あなたは大盤で2つ並んでいます。3つ目になる{b}の小盤を狙おう。',
  'tp.dead': '{b}の小盤は、もうどちらも3つ並べられません。そこへ送るのは、ほぼ「どこにも影響しない手」を相手に打たせることになります。',
  'tp.closed': '決着した小盤（{n}つ）に対応する位置に置くと、相手はどこにでも置けます。',
  'tp.center': '中央の小盤は大盤の列4本に入ります。序盤はここをめぐる送り合いが大切です。',
  'tp.rule': '置いたマスの位置＝相手が次に置く小盤。自分の小盤と相手の行き先を同時に考えるゲームです。',
  'tp.winning': '有利な局面です。相手にどこにでも置ける手番を与えないよう、送り先を丁寧に選ぼう。',
  'tp.losing': '苦しい局面です。相手の大盤の並びをふさぐ小盤を優先しよう。',
  'tp.branch': '候補の差が小さい局面。自分の狙いに合う送り先を選ぼう。', 'tp.sharp': '最善とそれ以外の差が大きい局面（勝率で{x}）。送り先を一つずつ確かめよう。',
  sep: '、',
  gl: {
    send: { m: ['送り先'], t: '送り先', d: '置いたマスの位置に対応する小盤。相手は次にそこへ置かなければならない。' },
    free: { m: ['どこにでも置け'], t: '自由な手番', d: '送り先の小盤が決着済みのとき、空いているどの小盤にも置けること。' },
  },
},
en: {
  head: 'Coach', sw: 'Coach', swT: 'Coach (how-to-think explanations) on / off', on: 'Coach ON', off: 'Coach OFF',
  rest: 'The coach rests during lessons, puzzles, watching and similar. Think for yourself! It comes back in games against the AI or two-player games.',
  offNote: 'The coach is off. Turn the switch at the top right on to see how to think about the position and what the candidates mean.',
  overRv: 'The game is over. Analyse it to see a move-by-move review here (best moves, mistakes and why).',
  oppTurn: 'Your opponent is to move and has {n} cells to choose from. Guess where they will play.',
  calc: 'Looking at the candidates…', form: 'Position', won: 'Boards won', where: 'You may play', stage: 'Phase',
  'st.open': 'Opening', 'st.mid': 'Middle game', 'st.end': 'Endgame',
  'f.win': 'winning', 'f.big': 'much better', 'f.adv': 'better', 'f.sl': 'slightly better', 'f.even': 'equal', 'f.sld': 'slightly worse', 'f.dis': 'worse', 'f.bad': 'much worse', 'f.lost': 'lost',
  'won.v': 'you {a} · them {b}', 'where.free': 'anywhere', 'where.to': 'the {b} board',
  recWhy: 'The first choice here is “{c}”. The position is {f} ({p}% to win).',
  recSharp: 'The second choice is clearly worse ({x} less), so play precisely here.',
  recBranch: 'The candidates are close: pick the plan you like below.',
  recOnly: 'Every other move spoils the position. Play this one.', recForced: 'This is the only cell you can play.',
  brH: 'Crossroads — plans to choose from', brIntro: 'None of these is much worse. Choosing the plan you understand best is how you improve.',
  cdH: 'Candidates and plans', cdIntro: 'The top candidates by plan — each chosen with the board it sends your opponent to in mind.',
  'gap.best': 'best', 'gap.eq': 'about equal', 'gap.lt': 'a bit worse', 'gap.bad': 'worse',
  'q.best': 'best', 'q.good': 'good', 'q.dubious': 'dubious', 'q.bad': 'mistake',
  tt: 'Play {sq} (the {b} board)',
  'c.win': 'Win the game', 'b.win': 'Three in a row', 'x.win': 'This wins the {b} board and completes three in a row on the big board.',
  'c.force': 'Winning line', 'b.force': 'A forced win', 'x.force': 'The AI has read a win from here, whatever your opponent does.',
  'c.take': 'Win a board', 'b.take': 'Win a small board', 'x.take': 'Wins the {b} board ({n} boards won).',
  'c.block': 'Defend', 'b.block': 'Stop their threat', 'x.block': 'Fills the cell your opponent needs for three in a row on the {b} board.',
  'c.build': 'Make two', 'b.build': 'Set up a threat', 'x.build': 'Makes two in a row on the {b} board, threatening to win it.',
  'c.safe': 'Safe sending', 'b.safe': 'Choose where to send', 'x.safe': 'Chosen for the board it sends your opponent to.',
  'c.quiet': 'Quiet move', 'b.quiet': 'A quiet move', 'x.quiet': 'No direct gain, but it gives your opponent no good board.',
  'to.free': 'The board it sends to is decided, so your opponent may play anywhere.', 'to.gift': 'In the {t} board it sends to, your opponent can win at once.', 'to.ok': 'Your opponent goes to the {t} board and cannot win it at once.', 'to.same': 'Your opponent stays in the {t} board.',
  opH: 'Opening — the first move', opIntro: 'Only the first move may go anywhere. The cell you choose becomes your opponent\'s board.',
  'op.c': 'Centre board', 'op.c.t': 'Play {sq} (the centre board)', 'op.c.x': 'The centre board lies on 4 of the 8 lines of the big board — the most important board.',
  'op.k': 'Corner board', 'op.k.t': 'Play {sq} (the {b} board)', 'op.k.x': 'A corner board lies on 3 lines of the big board.',
  'op.e': 'Edge board', 'op.e.t': 'Play {sq} (the {b} board)', 'op.e.x': 'An edge board lies on 2 lines of the big board.',
  rmWhy: 'The AI slightly prefers {m}, but the first move does not decide the game.',
  tipsH: 'How to think', more: 'More tips ({n})', less: 'Fewer',
  prev: 'Last move {m}: {q}', prevBest: '“{c}” — the AI’s first choice too.', prevAlt: 'The AI’s first choice was {m} ({c}).', prevAltOk: 'About as good as the AI’s first choice {m} ({c}).',
  'lp.free': '💡Tip: sending to a decided board lets your opponent play anywhere. Check that the board you send to is still open.',
  'lp.gift': '💡Tip: before you play, look for two in a row of theirs on the board you send them to.',
  'lp.take': '💡Tip: do not miss a board you can win — and check where taking it sends your opponent.',
  'lp.gen': '💡Tip: choose a cell for your own board and for your opponent\'s next board at the same time.',
  'tp.win': 'You can complete three in a row on the big board this turn. Find the board to win.',
  'tp.take': 'You can win the {b} board right now — but look where it sends your opponent.',
  'tp.free': 'You may play anywhere now. Pick the board that matters most (your threats or theirs).',
  'tp.threat': 'Your opponent has two in a row on the {b} board. Do not send them there.',
  'tp.bigThreat': 'Your opponent has two boards in a row on the big board. Keep them from winning the third, the {b} board.',
  'tp.bigMine': 'You have two boards in a row on the big board. Aim for the third, the {b} board.',
  'tp.dead': 'Nobody can make three in a row on the {b} board any more. Sending your opponent there gives them a move that hardly matters.',
  'tp.closed': '{n} boards are decided: a cell in their place sends your opponent to a free choice.',
  'tp.center': 'The centre board lies on 4 lines of the big board. In the opening, the sending fights are about it.',
  'tp.rule': 'The cell you play = the board your opponent plays next. Think of your board and theirs together.',
  'tp.winning': 'You are better. Choose where you send carefully so your opponent never gets a free move.',
  'tp.losing': 'You are under pressure. First take the boards that block their line on the big board.',
  'tp.branch': 'The candidates are close. Pick the board to send to that fits your plan.', 'tp.sharp': 'The best move is clearly better than the rest ({x}). Check each board you could send to.',
  sep: ', ',
  gl: {
    send: { m: ['send', 'sends'], t: 'Sending', d: 'The cell you play picks the small board your opponent must play next.' },
    free: { m: ['anywhere'], t: 'Free move', d: 'When the board you are sent to is decided, you may play in any open board.' },
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
const BN = b => (t('bname') || [])[b] || '';
// --------------------------------------------------------------------------------------------- position facts
// the cells of small board b where player p would complete a line (b open)
function winCells(pos, b, p) {
  if (pos.own[b]) return [];
  const out = [];
  for (let c = 0; c < 9; c++) { const m = b * 9 + c; if (pos.c[m]) continue; let mk = 0; for (let i = 0; i < 9; i++) if (pos.c[b * 9 + i] === p || i === c) mk |= 1 << i; if (E.W3[mk]) out.push(m); }
  return out;
}
const dead = (pos, b) => { if (pos.own[b]) return false; const x = pos.mask(b, 1), o = pos.mask(b, 2); return !E.LMASK.some(L => !(L & o)) && !E.LMASK.some(L => !(L & x)); };
// the third board of a line of the big board where p has two boards and the third is open
function bigThree(pos, p) {
  const out = []; const mine = b => pos.own[b] === p || (E.R.tie && pos.own[b] === 3);
  for (const L of E.LINES) { const n = L.filter(mine).length, open = L.filter(b => !pos.own[b]); if (n === 2 && open.length === 1) out.push(open[0]); }
  return [...new Set(out)];
}
function facts(pos, n) {
  const us = pos.turn, them = 3 - us, f = { us, n };
  f.legal = pos.moves();
  f.won = [pos.count(us), pos.count(them)];
  f.free = pos.forced < 0;
  const decided = pos.own.filter(x => x).length;
  f.stage = n < 8 && !decided ? 'open' : decided >= 4 || n >= 46 ? 'end' : 'mid';
  f.win = null; f.take = null;
  for (const m of f.legal) { const q = pos.clone().play(m); if (q.res === us && f.win == null) f.win = m; if (!pos.own[E.mB(m)] && q.own[E.mB(m)] === us && f.take == null) f.take = m; }
  f.threat = []; for (let b = 0; b < 9; b++) if (!pos.own[b] && winCells(pos, b, them).length) f.threat.push(b);
  f.bigThem = bigThree(pos, them); f.bigUs = bigThree(pos, us);
  f.dead = []; for (let b = 0; b < 9; b++) if (dead(pos, b)) f.dead.push(b);
  f.closed = decided;
  return f;
}
// the plan of a move and where it sends the opponent
function classify(pos, m, f, v) {
  const us = pos.turn, them = 3 - us, b = E.mB(m), c = E.mC(m);
  const q = pos.clone().play(m);
  const base = { sq: SQN(m), b: BN(b), m, t: q.forced >= 0 ? BN(q.forced) : '', n: q.count(us) };
  base.to = q.res >= 0 ? '' : q.forced < 0 ? 'free' : winCells(q, q.forced, them).length ? 'gift' : q.forced === b ? 'same' : 'ok';
  if (q.res === us) return Object.assign(base, { k: 'win' });
  if (v != null && v > WINT) return Object.assign(base, { k: 'force' });
  if (!pos.own[b] && q.own[b] === us) return Object.assign(base, { k: 'take' });
  if (winCells(pos, b, them).includes(m)) return Object.assign(base, { k: 'block' });
  if (!pos.own[b] && winCells(q, b, us).length > winCells(pos, b, us).length) return Object.assign(base, { k: 'build' });
  if (base.to === 'ok' || base.to === 'same') return Object.assign(base, { k: 'safe' });
  return Object.assign(base, { k: 'quiet' });
}
const RCLS = { win: 'c-win', force: 'c-win', take: 'c-mat', block: 'c-def', build: 'c-mat', safe: 'c-dev', quiet: 'c-dev' };
const CCLS = RCLS;
function formOf(w) { return w >= .9 ? 'win' : w >= .75 ? 'big' : w >= .62 ? 'adv' : w >= .54 ? 'sl' : w > .46 ? 'even' : w > .38 ? 'sld' : w > .25 ? 'dis' : w > .1 ? 'bad' : 'lost'; }
function ttl(k) { return tx('tt', k); }
const catTxt = k => tx('x.' + k.k, k) + (k.to ? ' ' + tx('to.' + k.to, k) : '');
// --------------------------------------------------------------------------------------------- the opening (the first move: anywhere)
const kindOfBoard = b => b === 4 ? 'c' : b % 2 === 0 ? 'k' : 'e';
function openItems(pos, list) {
  const L = list && list.length ? list.slice().sort((a, b) => b.v - a.v) : null;
  const pick = L ? L.slice(0, 3).map(e => e.m) : [40, 0, 4];
  return pick.map(m => {
    const key = kindOfBoard(E.mB(m)), sq = SQN(m), b = BN(E.mB(m));
    const it = { tag: tx('op.' + key), cls: key === 'c' ? 'c-mat' : 'c-dev', title: esc(tx('op.' + key + '.t', { sq, b })), text: gl(esc(tx('op.' + key + '.x') + ' ' + tx('to.ok', { t: BN(E.mC(m)) }))), move: String(m), mvName: sq, m };
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
  try { S.f = facts(posAt(cur).pos.clone(), cur); } catch (e) { S.f = { n: cur, legal: [], won: [0, 0], free: true, stage: 'mid', threat: [], bigThem: [], bigUs: [], dead: [], closed: 0 }; }
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
  if (f.n === 0) return out;
  if (f.win != null) add('tp.win', 100, {}, 1);
  if (f.bigThem.length) add('tp.bigThreat', 95, { b: f.bigThem.map(BN).join(tx('sep')) }, 1);
  if (f.bigUs.length) add('tp.bigMine', 85, { b: f.bigUs.map(BN).join(tx('sep')) });
  if (f.take != null && f.win == null) add('tp.take', 80, { b: BN(E.mB(f.take)) }, 1);
  if (f.free) add('tp.free', 78, {});
  if (f.threat.length) add('tp.threat', 70, { b: f.threat.map(BN).join(tx('sep')) });
  if (f.dead.length) add('tp.dead', 40, { b: f.dead.map(BN).join(tx('sep')) });
  if (f.closed) add('tp.closed', 50, { n: f.closed });
  if (w != null) { if (w >= .8) add('tp.winning', 46); else if (w <= .25) add('tp.losing', 46); }
  if (cl && cl.branch) add('tp.branch', 58);
  if (cl && cl.sharp) add('tp.sharp', 56, { x: cl.sharp });
  if (f.stage === 'open') add('tp.center', 45);
  add('tp.rule', f.stage === 'open' ? 44 : 20);
  return out.sort((a, b) => b.pr - a.pr);
}
function verdictHtml() {
  const N = moves.length; if (!N) return '';
  let i = N - 1;
  if (settings.mode === 'ai') { while (i >= 0 && N - i <= 2 && toMoveAt(i) !== humanColor) i--; if (i < 0 || N - i > 2) return ''; }
  const pos = posAt(i).pos.clone(), m = moves[i], nm = E.name(pos, m);
  const mv = (i + 1) + '. ' + nm;
  const L = listAt(i);
  if (!L || !L.length) return '';
  const mine = L.find(e => e.m === m); if (!mine) return '';
  let best = L[0]; for (const e of L) if (e.v > best.v) best = e;
  const loss = sOfV(best.v) - sOfV(mine.v);
  let q = 'good';
  if ((best.v > WINT - 1000 && mine.v <= WINT - 1000) || (best.v >= -(WINT - 1000) && mine.v < -(WINT - 1000)) || loss >= 0.3) q = 'bad';
  else if (loss >= 0.12) q = 'dubious';
  else if (mine.v >= best.v - 10) q = 'best';
  if (L.length === 1) q = 'best';
  if (i === 0 && !startSpec && q !== 'bad') q = mine.v >= best.v - 10 ? 'best' : 'good';
  const g = { best: 0, good: 1, dubious: 2, bad: 3 }[q];
  let body = '';
  try {
    const ff = facts(pos.clone(), i);
    if (best.m !== m && q !== 'best') {
      const k = classify(pos.clone(), best.m, ff, best.v), mk = classify(pos.clone(), m, ff, mine.v);
      body = esc(tx(q === 'good' ? 'prevAltOk' : 'prevAlt', { m: E.name(pos, best.m), c: tx('c.' + k.k) }));
      if (q === 'dubious' || q === 'bad') body += '<br>' + esc(tx(mk.to === 'free' ? 'lp.free' : mk.to === 'gift' ? 'lp.gift' : (k.k === 'take' || k.k === 'win') ? 'lp.take' : 'lp.gen'));
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
  if (UtttCoach.sw) UtttCoach.sw.sync();
  const rv = !!document.querySelector('#reviewCard.show');
  const over = moves.length > 0 && gameOver(moves.length), playing = !over && cur === moves.length && !reviewing;
  const on = active(), can = usable() && !rv && (playing || (over));
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
  if (!myTurn()) { S.items = null; h += `<p class="ck-muted">${esc(tx('oppTurn', { n: f.legal.length }))}</p>` + verdictHtml(); return put(h); }
  const pos = posAt(cur).pos.clone(), list = listAt(cur);
  let bv = null; if (list && list.length) { bv = -Infinity; for (const e of list) bv = Math.max(bv, e.v); }
  const w = bv != null && f.n > 0 ? wr(bv) : null;
  const chips = [];
  if (w != null && settings.eval) chips.push({ k: tx('form'), v: esc(tx('f.' + formOf(w)) + ' ' + pctS(w)), cls: w >= .54 ? 'pos' : w <= .46 ? 'neg' : '' });
  chips.push({ k: tx('won'), v: esc(tx('won.v', { a: f.won[0], b: f.won[1] })), cls: f.won[0] > f.won[1] ? 'pos' : f.won[0] < f.won[1] ? 'neg' : '' });
  chips.push({ k: tx('where'), v: esc(f.free ? tx('where.free') : tx('where.to', { b: BN(pos.forced) })) });
  h += CoachKit.summary(chips);
  let cl = null;
  if (f.n === 0 && !startSpec) {
    const items = openItems(pos, list);
    S.items = items.map(x => x.m);
    if (list && list.length) { let b = list[0]; for (const e of list) if (e.v > b.v) b = e; h += CoachKit.rec(tx('op.' + kindOfBoard(E.mB(b.m))), esc(tx('rmWhy', { m: E.name(pos, b.m) })), 'c-mat'); }
    h += CoachKit.branches({ head: tx('opH'), intro: gl(esc(tx('opIntro'))), reveal: true, items });
  } else {
    cl = candInfo(list, f, pos);
    if (cl && cl.best) {
      const b = cl.best;
      let why = esc(tx('recWhy', { c: tx('c.' + b.k.k), f: tx('f.' + formOf(wr(b.v))), p: Math.round(wr(b.v) * 100) }));
      if (cl.forced) why = esc(tx('recForced'));
      else if (cl.only) why += ' ' + esc(tx('recOnly')); else if (cl.sharp) why += ' ' + esc(tx('recSharp', { x: cl.sharp })); else if (cl.branch) why += ' ' + esc(tx('recBranch'));
      h += CoachKit.rec(tx('b.' + b.k.k), gl(why), RCLS[b.k.k] || '');
      S.items = cl.dirs.map(d => d.u);
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
  if (!active() || !myTurn()) return;
  if (S.hov == null || !pos.moves().includes(S.hov)) return;
  const m = S.hov; fxDiv('mark ok', m); svgArrow(svg, m, 'ck');
}
function cands(key, list) { if (list && list.length) { S.lists.set(key, list); if (S.lists.size > 400) S.lists.delete(S.lists.keys().next().value); } }
function init() {
  if (!window.CoachKit) return;
  if (settings.coach === undefined) settings.coach = true;
  CoachKit.css(); CoachKit.glossBind(() => (TX[L()] || TX.en).gl);
  card = document.getElementById('coachCard');
  if (window.MutationObserver) { let k = ''; const mo = () => { const b = document.body.classList, n = ['in-lesson', 'in-puzzle', 'in-online', 'in-edit', 'in-study', 'rated-live', 'in-watch'].map(c => b.contains(c) ? 1 : 0).join(''); if (n !== k) { k = n; render(); } }; new MutationObserver(mo).observe(document.body, { attributes: true, attributeFilter: ['class'] }); }
  { const rc = document.getElementById('reviewCard'); if (rc && window.MutationObserver) new MutationObserver(() => render()).observe(rc, { attributes: true, attributeFilter: ['class'] }); }
  UtttCoach.sw = CoachKit.sw({ mount: '.brand-r', get: () => !!settings.coach, set: v => setOn(v), label: on => ({ text: tx('sw'), title: tx('swT') + ' — ' + tx(on ? 'on' : 'off') }) });
}
function setOn(v) {
  settings.coach = !!v; save();
  CoachKit.flash(tx(v ? 'on' : 'off'));
  S.hov = null; render(); renderFx();
  if (v && !listAt(cur)) analyzeCurrent(busyToken);
}
function relabel() { if (UtttCoach.sw) UtttCoach.sw.sync(); S.key = ''; render(); }
function merge(more) { for (const l in more) TX[l] = Object.assign({}, TX[l] || {}, more[l], { gl: Object.assign({}, (TX[l] || {}).gl || {}, more[l].gl || {}) }); }
window.UtttCoach = { init, render, relabel, merge, tx, TX, active, usable, cands, fx };
})();
