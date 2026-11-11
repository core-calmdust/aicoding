'use strict';
// アマゾンズのコーチ (common spec: shared/COACH.md, model: konane/coach.js) — shown while the player is to move against the AI
// (and in two-player games on one device): the position at a glance (形勢・陣地・動けるマス・局面), the recommended plan with its
// reason, the candidate directions (分かれ道: each candidate's plan with the territory it leaves, shown on hover / tap on the
// board), prioritized "how to think" tips read from the position (閉じ込めのチャンス・囲まれそうなアマゾン・部屋の分かれ方…),
// and the verdict on the previous move (◎○△✕).
// Ideas checked 2026-11: Wikipedia "Game of the Amazons" (territory, defective territories), Müller & Tegos "Experiments in
// Computer Amazons" (phases: the board splits into independent areas; blockers; an amazon that shoots back to its origin square
// can cut itself off; defects). Every number shown is counted from the position (Pos.terr / mobility); nothing is guessed.
// Texts: TX[lang] (en fallback); the other languages live in coach-i18n.js (AmazonsCoach.merge).
(() => {
const TX = {
ja: {
  head: 'コーチ', sw: 'コーチ', swT: 'コーチ（考え方の解説）のオン／オフ', on: 'コーチ ON', off: 'コーチ OFF',
  rest: 'レッスン・観戦・レーティング戦などの間、コーチはお休みです。自分の力で考えてみよう。AIとの対局や二人対戦に戻ると、コーチが再開します。',
  offNote: 'コーチ機能はオフになっています。右上のスイッチをオンにすると、局面の考え方や候補手の解説が表示されます。',
  overRv: '対局が終わりました。分析すると、この欄に一手ごとの振り返り（最善手・悪手とその理由）が表示されます。',
  oppTurn: '相手の手番です。相手のアマゾンが動けるマスは{n}。どこに矢を撃ってくるか予想してみよう。',
  calc: '候補手を考えています…', form: '形勢', terr: '陣地', mob: '動けるマス', stage: '局面',
  'st.open': '序盤', 'st.mid': '中盤', 'st.end': '終盤（部屋が分かれた）',
  'f.win': '勝勢', 'f.big': '優勢', 'f.adv': '有利', 'f.sl': 'やや有利', 'f.even': '互角', 'f.sld': 'やや不利', 'f.dis': '不利', 'f.bad': '劣勢', 'f.lost': '敗勢',
  'v.ab': '自分{a}・相手{b}',
  recWhy: 'この局面の第一候補は「{c}」の方針です。形勢は{f}（勝率{p}%）。',
  recSharp: '2番目の候補との差が大きく（勝率で{x}）、ここは正確に指したい局面です。',
  recBranch: '候補どうしの差が小さい分かれ道です。下の候補から好きな方針を選べます。',
  recOnly: 'ほかの手は大きく形勢を損ねます。迷わず指したい局面です。', recForced: '指せる手はこれだけです。',
  brH: '分かれ道 — 選べる方針', brIntro: 'どれを選んでも大差はありません。自分の得意な進め方を選ぶのが上達の近道です。',
  cdH: '候補手と方針', cdIntro: '上位の候補を、方針ごとに解説します（数字はその手のあとの陣地の目安）。',
  'gap.best': '最善', 'gap.eq': 'ほぼ同じ', 'gap.lt': '少し劣る', 'gap.bad': '劣る',
  'q.best': '最善', 'q.good': '良い手', 'q.dubious': '疑問手', 'q.bad': '悪手',
  tt: '{sq}のアマゾンを{to}へ、矢は{ar}',
  'c.win': '勝ち筋', 'b.win': '勝ちを決める', 'x.win': 'AIの読みでは、ここから最後まで動けるのは自分です。陣地は自分{a}・相手{b}。むだなく埋めていこう。',
  'c.mate': '動けなくする', 'b.mate': '最後の一手', 'x.mate': 'この手のあと、相手のアマゾンはどれも動けません。この一手で勝ちです。',
  'c.trap': '閉じ込める', 'b.trap': '相手のアマゾンを閉じ込める', 'x.trap': '{e}の相手のアマゾンの最後の出口をふさぎます。動けないアマゾンは、陣地を取る役に立ちません。陣地は自分{a}・相手{b}。',
  'c.escape': '逃げる', 'b.escape': '囲まれる前に逃げる', 'x.escape': '{sq}のアマゾンはまわりが狭くなっていました。広い{to}へ移って、閉じ込められるのを防ぎます。陣地は自分{a}・相手{b}。',
  'c.block': '道をふさぐ', 'b.block': '相手の動きを狭める', 'x.block': '矢で{e}の相手のアマゾンのすぐ隣をふさぎ、動ける範囲を狭めます。陣地は自分{a}・相手{b}。',
  'c.wall': '壁を作る', 'b.wall': '矢で壁を作る', 'x.wall': '矢で相手が入ってこられない壁を作り、自分だけの部屋を広げます。陣地は自分{a}・相手{b}。',
  'c.center': '中央へ', 'b.center': 'アマゾンを中央へ', 'x.center': '{to}は盤の中央寄り。中央のアマゾンはどの方向にも届きやすく、序盤に強い形です。陣地は自分{a}・相手{b}。',
  'c.terr': '陣地を広げる', 'b.terr': '陣地を広げる', 'x.terr': 'この手のあと、陣地は自分{a}・相手{b}（どちらのアマゾンが先に届くかで数えた目安）。',
  tipsH: '考え方のヒント', more: 'ほかのヒント（{n}）', less: 'たたむ',
  prev: '前の手 {m}：{q}', prevBest: '「{c}」の方針で、AIの第一候補と同じ手です。', prevAlt: 'AIの第一候補は {m}（{c}）でした。', prevAltOk: 'AIの第一候補 {m}（{c}）と同じくらいの手です。',
  'lp.trap': '💡コツ：自分のアマゾンのまわりの空きマスを数えよう。2つ以下なら、閉じ込められる前に広い場所へ。',
  'lp.terr': '💡コツ：矢は「相手が入ってこられない壁」になる場所に。自分の部屋の中に撃つと、自分の陣地を減らしてしまいます。',
  'lp.block': '💡コツ：出口が1つしかない相手のアマゾンを見つけたら、そこに矢を撃てば閉じ込められます。',
  'tp.mate': '相手を1手も動けなくする手があります。探してみよう。',
  'tp.trapChance': '{e}の相手のアマゾンは出口が1つだけ。そこをふさげば閉じ込められます。',
  'tp.danger': '{sq}のアマゾンはまわりの空きが{n}つだけ。次の矢で閉じ込められるかもしれません。',
  'tp.stuck': '{sq}のアマゾンはもう動けません。残りのアマゾンで陣地を確保しよう。',
  'tp.sep': '盤がいくつかの部屋に分かれました。自分だけの部屋では、マスをむだにしないよう1マスずつ埋めていきます。',
  'tp.defect': '部屋の中で矢の撃ち方をまちがえると、使えないマスができて手数が減ります。端から順に埋めよう。',
  'tp.behind': '陣地で負けています（自分{a}・相手{b}）。相手の部屋に割り込むか、相手のアマゾンを閉じ込めよう。', 'tp.ahead': '陣地でリード（自分{a}・相手{b}）。相手が入ってこられないよう、壁を固めよう。',
  'tp.center': '序盤はアマゾンを中央寄りに。端や隅のアマゾンは囲まれやすくなります。',
  'tp.rule': 'アマゾンズは最後に動けた人の勝ち。最後は「どちらの部屋が広いか」で決まります。',
  'tp.shootBack': '矢は元いたマスにも撃てます。来た道をふさいで、後ろに相手を入れない手もあります。',
  'tp.oneTwo': '1体のアマゾンで相手の2体を足止めできれば、そのぶん有利になります。',
  'tp.branch': '候補どうしの差は小さい分かれ道です。', 'tp.sharp': '最善とほかの差が大きい（勝率{x}）局面です。慎重に。',
  'tp.winning': '有利です。相手のアマゾンが自分の部屋に入ってこないよう、出入り口を確かめよう。', 'tp.losing': '苦しい局面。相手の部屋に入り込めるすき間を探そう。',
  sep: '、',
  gl: {
    terr: { m: ['陣地'], t: '陣地', d: 'どちらのアマゾンが先に（少ない手数で）届くかで分けた空きマスの数。部屋が分かれたら、それぞれが自分の部屋で動ける手数になります。' },
    mob: { m: ['動けるマス'], t: '動けるマス', d: '自分のアマゾンがいま1手で動けるマスの合計。自分の番に0なら負けです。' },
  },
},
en: {
  head: 'Coach', sw: 'Coach', swT: 'Coach (how-to-think explanations) on / off', on: 'Coach ON', off: 'Coach OFF',
  rest: 'The coach rests during lessons, watching, rated games and similar. Think for yourself! It comes back in games against the AI or two-player games.',
  offNote: 'The coach is off. Turn the switch at the top right on to see how to think about the position and what the candidates mean.',
  overRv: 'The game is over. Analyse it to see a move-by-move review here (best moves, mistakes and why).',
  oppTurn: 'Your opponent is to move; their amazons can reach {n} squares. Guess where the arrow will land.',
  calc: 'Looking at the candidates…', form: 'Position', terr: 'Territory', mob: 'Squares to move', stage: 'Phase',
  'st.open': 'Opening', 'st.mid': 'Middlegame', 'st.end': 'Endgame (rooms split)',
  'f.win': 'Winning', 'f.big': 'Much better', 'f.adv': 'Better', 'f.sl': 'Slightly better', 'f.even': 'Even', 'f.sld': 'Slightly worse', 'f.dis': 'Worse', 'f.bad': 'Much worse', 'f.lost': 'Losing',
  'v.ab': 'you {a} · them {b}',
  recWhy: 'The first choice here is “{c}”. The position is {f} ({p}% to win).',
  recSharp: 'The second choice is clearly worse ({x} less), so play precisely here.',
  recBranch: 'The candidates are close: pick the plan you like below.',
  recOnly: 'Every other move spoils the position. Play this one.', recForced: 'This is your only move.',
  brH: 'Crossroads — plans to choose from', brIntro: 'None of these is much worse. Choosing the plan you understand best is how you improve.',
  cdH: 'Candidates and plans', cdIntro: 'The top candidates, explained by plan (numbers are the territory each side has afterwards, roughly).',
  'gap.best': 'Best', 'gap.eq': 'About equal', 'gap.lt': 'A little worse', 'gap.bad': 'Worse',
  'q.best': 'Best', 'q.good': 'Good', 'q.dubious': 'Dubious', 'q.bad': 'Mistake',
  tt: 'Amazon {sq} to {to}, arrow on {ar}',
  'c.win': 'Winning line', 'b.win': 'Finish the win', 'x.win': 'The AI sees you moving last from here. Territory: you {a}, them {b}. Fill it without waste.',
  'c.mate': 'No moves left', 'b.mate': 'The last move', 'x.mate': 'After this move none of the opponent’s amazons can move. This move wins.',
  'c.trap': 'Trap', 'b.trap': 'Trap an enemy amazon', 'x.trap': 'Blocks the last way out of the enemy amazon on {e}. An amazon that cannot move claims no territory. Territory: you {a}, them {b}.',
  'c.escape': 'Escape', 'b.escape': 'Escape before you are boxed in', 'x.escape': 'The amazon on {sq} was running out of room. Moving it to open {to} keeps it from being trapped. Territory: you {a}, them {b}.',
  'c.block': 'Block', 'b.block': 'Hem them in', 'x.block': 'The arrow lands right next to the enemy amazon on {e} and shrinks its room. Territory: you {a}, them {b}.',
  'c.wall': 'Build a wall', 'b.wall': 'Wall off with arrows', 'x.wall': 'The arrow builds a wall the opponent cannot get through and widens your own room. Territory: you {a}, them {b}.',
  'c.center': 'To the centre', 'b.center': 'Centralize an amazon', 'x.center': '{to} is near the centre. A central amazon reaches every direction — a strong shape early on. Territory: you {a}, them {b}.',
  'c.terr': 'Claim territory', 'b.terr': 'Claim territory', 'x.terr': 'Territory afterwards: you {a}, them {b} (counted by whose amazon reaches each square first).',
  tipsH: 'How to think', more: 'More tips ({n})', less: 'Fewer',
  prev: 'Last move {m}: {q}', prevBest: '“{c}” — the AI’s first choice too.', prevAlt: 'The AI’s first choice was {m} ({c}).', prevAltOk: 'About as good as the AI’s first choice {m} ({c}).',
  'lp.trap': '💡Tip: count the empty squares around your amazons. Two or fewer? Move to open space before you are boxed in.',
  'lp.terr': '💡Tip: shoot arrows where they wall the opponent out. An arrow inside your own room only shrinks your territory.',
  'lp.block': '💡Tip: an enemy amazon with one way out is trapped by an arrow on that square.',
  'tp.mate': 'One move leaves your opponent with no move at all. Find it!',
  'tp.trapChance': 'The enemy amazon on {e} has only one way out. Block it and it is trapped.',
  'tp.danger': 'Your amazon on {sq} has only {n} empty neighbour(s). The next arrow may trap it.',
  'tp.stuck': 'Your amazon on {sq} can no longer move. Claim territory with the others.',
  'tp.sep': 'The board has split into rooms. In a room of your own, fill it one square at a time without wasting any.',
  'tp.defect': 'A badly placed arrow inside a room can leave squares you can never use. Fill from the far end.',
  'tp.behind': 'You are behind on territory (you {a}, them {b}). Break into their room or trap one of their amazons.', 'tp.ahead': 'You lead on territory (you {a}, them {b}). Seal the walls so they cannot get in.',
  'tp.center': 'Early on, keep your amazons near the centre. Amazons on the edge or in a corner are easier to box in.',
  'tp.rule': 'In Amazons the last player able to move wins — in the end it comes down to whose rooms are bigger.',
  'tp.shootBack': 'An arrow may land on the square the amazon just left — closing the way behind it.',
  'tp.oneTwo': 'If one of your amazons can hold back two of theirs, you are ahead by that much.',
  'tp.branch': 'The candidates are close here.', 'tp.sharp': 'The best move is clearly better ({x}). Take care.',
  'tp.winning': 'You are ahead. Check the doorways so their amazons cannot get into your room.', 'tp.losing': 'A hard position. Look for a gap into their room.',
  sep: ', ',
  gl: {
    terr: { m: ['territory', 'Territory'], t: 'Territory', d: 'Empty squares split by whose amazon reaches them first (in fewer moves). Once the board splits into rooms, it is the moves each side can still make in its own rooms.' },
    mob: { m: ['squares to move'], t: 'Squares to move', d: 'How many squares your amazons can move to right now. None on your turn means you lose.' },
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
const freeN = (pos, i) => { let n = 0; for (const x of E.NB[i]) if (!pos.sq[x]) n++; return n; };
const amazonsOf = (pos, p) => { const o = []; for (let k = 0; k < 8; k++) { const f = pos.q[k]; if (f >= 0 && pos.sq[f] === p) o.push(f); } return o; };
const central = i => { const [r, c] = E.RC[i]; return r >= 3 && r <= 6 && c >= 3 && c <= 6; };
const mine = (T, p) => p === P1 ? [T.a, T.b] : [T.b, T.a];
function facts(pos, n) {
  const us = pos.turn, them = 3 - us, f = { us, n };
  const T = pos.terr(); f.terr = mine(T, us); f.sep = T.sep;
  f.mob = [pos.mobility(us), pos.mobility(them)];
  f.arrows = pos.arrows();
  f.stage = T.sep ? 'end' : f.arrows < 10 ? 'open' : 'mid';
  f.danger = amazonsOf(pos, us).map(a => ({ a, n: freeN(pos, a) })).filter(x => x.n > 0 && x.n <= 2).sort((x, y) => x.n - y.n)[0] || null;
  f.stuck = amazonsOf(pos, us).find(a => freeN(pos, a) === 0);
  f.chance = amazonsOf(pos, them).find(a => freeN(pos, a) === 1);
  f.trappedOpp = amazonsOf(pos, them).filter(a => freeN(pos, a) === 0).length;
  return f;
}
// the plan of a move: what it does to the amazons' room and to the territory
function classify(pos, m, f, v) {
  const us = pos.turn, them = 3 - us, fr = E.mFrom(m), to = E.mTo(m), ar = E.mArrow(m);
  const base = { sq: SQN(fr), to: SQN(to), ar: SQN(ar), m };
  const q = pos.clone().play(m), T = mine(q.terr(), us);
  Object.assign(base, { a: T[0], b: T[1] });
  if (!q.canMove(them)) return Object.assign(base, { k: 'mate' });
  if (v != null && v > WINT) return Object.assign(base, { k: 'win' });
  const near = amazonsOf(pos, them).filter(e => E.NB[e].includes(ar));
  const trapped = near.find(e => freeN(pos, e) > 0 && freeN(q, e) === 0);
  if (trapped != null) return Object.assign(base, { k: 'trap', e: SQN(trapped) });
  if (freeN(pos, fr) <= 2 && freeN(q, to) >= 4) return Object.assign(base, { k: 'escape' });
  if (near.length) return Object.assign(base, { k: 'block', e: SQN(near[0]) });
  if (f.stage === 'open' && central(to) && !central(fr)) return Object.assign(base, { k: 'center' });
  if (T[0] - T[1] > f.terr[0] - f.terr[1] + 2) return Object.assign(base, { k: 'wall' });
  return Object.assign(base, { k: 'terr' });
}
const RCLS = { win: 'c-win', mate: 'c-win', trap: 'c-mat', escape: 'c-def', block: 'c-mat', wall: 'c-def', center: 'c-dev', terr: 'c-dev' };
function formOf(w) { return w >= .9 ? 'win' : w >= .75 ? 'big' : w >= .62 ? 'adv' : w >= .54 ? 'sl' : w > .46 ? 'even' : w > .38 ? 'sld' : w > .25 ? 'dis' : w > .1 ? 'bad' : 'lost'; }
const catTxt = k => tx('x.' + k.k, k);
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
  try { S.f = facts(posAt(cur).pos.clone(), cur); } catch (e) { S.f = { n: cur, terr: [0, 0], mob: [0, 0], stage: 'mid' }; }
  return S.f;
}
function candInfo(list, f, pos) {
  if (!list || !list.length) return null;
  const Ls = list.slice().sort((a, b) => b.v - a.v), best = Ls[0].v, wb = wr(best);
  const items = [];
  for (const c of Ls.slice(0, 8)) {
    let k; try { k = classify(pos, c.m, f, c.v); } catch (e) { continue; }
    items.push({ u: c.m, k, drop: Math.max(0, wb - wr(c.v)), v: c.v, nm: E.name(pos, c.m) });
  }
  const seen = new Set(), dirs = [];
  for (const it of items) { if (seen.has(it.k.k) && dirs.length) continue; seen.add(it.k.k); dirs.push(it); if (dirs.length >= 3) break; }
  const close = dirs.filter(d => d.drop <= 0.05), second = items[1] ? items[1].drop : null;
  return { items, dirs, best: items[0], branch: close.length >= 2 && best < WINT, sharp: second != null && second >= 0.12 && best < WINT ? pctS(second) : '', only: second != null && second >= 0.25, forced: Ls.length === 1 };
}
function gapOf(d, i) { return i === 0 ? ['gap.best', 'g0'] : d <= 0.05 ? ['gap.eq', 'g1'] : d <= 0.12 ? ['gap.lt', 'g2'] : ['gap.bad', 'g3']; }
function tipsOf(f, w, cl) {
  const out = [], add = (k, pr, v, hi) => out.push({ k, pr, v, hi });
  if (cl && cl.best && cl.best.k.k === 'mate') add('tp.mate', 100, {}, 1);
  if (f.chance != null) add('tp.trapChance', 90, { e: SQN(f.chance) }, 1);
  if (f.danger) add('tp.danger', 88, { sq: SQN(f.danger.a), n: f.danger.n }, 1);
  if (f.stuck != null) add('tp.stuck', 70, { sq: SQN(f.stuck) });
  if (f.sep) { add('tp.sep', 80, {}, 1); add('tp.defect', 64); }
  if (f.terr[0] + 4 <= f.terr[1]) add('tp.behind', 66, { a: f.terr[0], b: f.terr[1] });
  else if (f.terr[0] >= f.terr[1] + 6) add('tp.ahead', 60, { a: f.terr[0], b: f.terr[1] });
  if (f.stage === 'open') add('tp.center', 62);
  if (w != null) { if (w >= .8) add('tp.winning', 46); else if (w <= .25) add('tp.losing', 46); }
  if (cl && cl.branch) add('tp.branch', 58);
  if (cl && cl.sharp) add('tp.sharp', 56, { x: cl.sharp });
  if (f.trappedOpp) add('tp.oneTwo', 34);
  add('tp.rule', f.stage === 'open' ? 40 : 20);
  add('tp.shootBack', f.stage === 'end' ? 30 : 24);
  return out.sort((a, b) => b.pr - a.pr);
}
function verdictHtml() {
  const N = moves.length; if (!N) return '';
  let i = N - 1;
  if (settings.mode === 'ai') { while (i >= 0 && N - i <= 2 && toMoveAt(i) !== humanColor) i--; if (i < 0 || N - i > 2) return ''; }
  const pos = posAt(i).pos.clone(), m = moves[i], nm = E.name(pos, m);
  const mv = (i + 1) + '. ' + nm;
  const Ls = listAt(i);
  if (!Ls || !Ls.length) return '';
  const me = Ls.find(e => e.m === m); if (!me) return '';
  let best = Ls[0]; for (const e of Ls) if (e.v > best.v) best = e;
  const loss = sOfV(best.v) - sOfV(me.v);
  let q = 'good';
  if ((best.v > WINT - 1000 && me.v <= WINT - 1000) || (best.v >= -(WINT - 1000) && me.v < -(WINT - 1000)) || loss >= 0.3) q = 'bad';
  else if (loss >= 0.12) q = 'dubious';
  else if (me.v >= best.v - 10) q = 'best';
  if (Ls.length === 1) q = 'best';
  const g = { best: 0, good: 1, dubious: 2, bad: 3 }[q];
  let body = '';
  try {
    const ff = facts(pos.clone(), i);
    if (best.m !== m && q !== 'best') {
      const k = classify(pos.clone(), best.m, ff, best.v), mk = classify(pos.clone(), m, ff, me.v);
      body = esc(tx(q === 'good' ? 'prevAltOk' : 'prevAlt', { m: E.name(pos, best.m), c: tx('c.' + k.k) }));
      if (q === 'dubious' || q === 'bad') {
        const after = pos.clone().play(m), lowFree = amazonsOf(after, pos.turn).some(a => freeN(after, a) <= 1);
        body += '<br>' + esc(tx(lowFree ? 'lp.trap' : (k.k === 'trap' || k.k === 'block') ? 'lp.block' : 'lp.terr'));
      }
    } else { const k = classify(pos.clone(), m, ff, me.v); body = esc(tx('prevBest', { c: tx('c.' + k.k) })); }
  } catch (e) {}
  return CoachKit.verdict(g, esc(tx('prev', { m: mv, q: tx('q.' + q) })), gl(body));
}
function restNow(rv, can) {
  if (can || !card) return false;
  const b = document.body.classList, st = typeof settings !== 'undefined' ? settings : {};
  if (b.contains('in-online') || st.mode === 'online') return false;
  const ls = (typeof lesson !== 'undefined' && !!lesson) || b.contains('in-lesson') || b.contains('in-puzzle');
  if (rv && !ls) return false;
  if (ls || b.contains('rated-live') || st.mode === 'watch') return true;
  return !usable();
}
function render() {
  if (!card) return;
  if (window.SeqPrac && SeqPrac.active() && SeqPrac.paint()) return;   // the 3-move opening practice (shared/seqprac.js, 2026-11-10)
  if (AmazonsCoach.sw) AmazonsCoach.sw.sync();
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
  const w = bv != null ? wr(bv) : null;
  const chips = [];
  if (w != null && settings.eval) chips.push({ k: tx('form'), v: esc(tx('f.' + formOf(w)) + ' ' + pctS(w)), cls: w >= .54 ? 'pos' : w <= .46 ? 'neg' : '' });
  chips.push({ k: tx('terr'), v: esc(tx('v.ab', { a: f.terr[0], b: f.terr[1] })), cls: f.terr[0] > f.terr[1] ? 'pos' : f.terr[0] < f.terr[1] ? 'neg' : '' });
  chips.push({ k: tx('mob'), v: esc(tx('v.ab', { a: f.mob[0], b: f.mob[1] })) });
  h += CoachKit.summary(chips);
  const cl = candInfo(list, f, pos);
  if (cl && cl.best) {
    const b = cl.best;
    let why = esc(tx('recWhy', { c: tx('c.' + b.k.k), f: tx('f.' + formOf(wr(b.v))), p: Math.round(wr(b.v) * 100) }));
    if (cl.forced) why = esc(tx('recForced'));
    else if (cl.only) why += ' ' + esc(tx('recOnly')); else if (cl.sharp) why += ' ' + esc(tx('recSharp', { x: cl.sharp })); else if (cl.branch) why += ' ' + esc(tx('recBranch'));
    h += CoachKit.rec(tx('b.' + b.k.k), gl(why), RCLS[b.k.k] || '');
    h += CoachKit.branches({
      head: tx(cl.branch ? 'brH' : 'cdH'), intro: gl(esc(tx(cl.branch ? 'brIntro' : 'cdIntro'))),
      items: cl.dirs.map((d, i) => { const g = gapOf(d.drop, i); return { tag: tx('c.' + d.k.k), cls: RCLS[d.k.k] || '', title: esc(tx('tt', d.k)), text: gl(esc(catTxt(d.k))), gap: tx(g[0]) + (d.drop > 0.005 ? ' −' + pctS(d.drop) : ''), gcls: g[1], move: String(d.u), mvName: d.nm }; }),
    });
  } else { S.items = null; h += `<p class="ck-calc">${esc(tx('calc'))}</p>`; }
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
    onPlay: u => { try { if (!active() || !myTurn() || !canHumanPlay()) return; const m = +u; if (!posAt(cur).pos.isLegal(m)) return; S.hov = null; commit(m); } catch (e) {} },
  });
}
function fx(svg, pos) {
  if (!active() || !myTurn() || sel || S.hov == null) return;
  if (pos.isLegal(S.hov)) { drawMove(svg, S.hov, 'ck'); fxDiv('sqfx lasta', E.mArrow(S.hov)); }
}
function cands(key, list) { if (list && list.length) { S.lists.set(key, list); if (S.lists.size > 400) S.lists.delete(S.lists.keys().next().value); } }
function init() {
  if (!window.CoachKit) return;
  if (settings.coach === undefined) settings.coach = true;
  CoachKit.css(); CoachKit.glossBind(() => (TX[L()] || TX.en).gl);
  card = document.getElementById('coachCard');
  if (window.MutationObserver) { let k = ''; const mo = () => { const b = document.body.classList, n = ['in-lesson', 'in-puzzle', 'in-online', 'rated-live'].map(c => b.contains(c) ? 1 : 0).join(''); if (n !== k) { k = n; render(); } }; new MutationObserver(mo).observe(document.body, { attributes: true, attributeFilter: ['class'] }); }
  { const rc = document.getElementById('reviewCard'); if (rc && window.MutationObserver) new MutationObserver(() => render()).observe(rc, { attributes: true, attributeFilter: ['class'] }); }
  AmazonsCoach.sw = CoachKit.sw({ mount: '.brand-r', get: () => !!settings.coach, set: v => setOn(v), label: on => ({ text: tx('sw'), title: tx('swT') + ' — ' + tx(on ? 'on' : 'off') }) });
}
function setOn(v) {
  settings.coach = !!v; save();
  CoachKit.flash(tx(v ? 'on' : 'off'));
  S.hov = null; render(); renderFx();
  if (v && !listAt(cur)) analyzeCurrent(busyToken);
}
function relabel() { if (AmazonsCoach.sw) AmazonsCoach.sw.sync(); S.key = ''; render(); }
function merge(more) { for (const l in more) TX[l] = Object.assign({}, TX[l] || {}, more[l], { gl: Object.assign({}, (TX[l] || {}).gl || {}, more[l].gl || {}) }); }
window.AmazonsCoach = { init, render, relabel, merge, tx, TX, active, usable, cands, fx };
})();
