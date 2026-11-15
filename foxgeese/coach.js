'use strict';
// 狐とガチョウのコーチ (common spec: shared/COACH.md, model: shogi/coach.js via latrunculi/coach.js) — shown while the player
// is to move against the AI (and in two-player games on one device): the position at a glance (形勢・残りのガチョウ・狐の動ける点),
// the recommended plan with its reason, the candidate directions (分かれ道), prioritized "how to think" tips read from the
// position (取れるガチョウ・後ろが空いたガチョウ・狐の逃げ道の数…), and the verdict on the previous move (◎○△✕).
// The two sides play different games, so the plans differ: the fox takes / attacks two at once / runs for open ground;
// the geese cover / close in / shut in. Every fact shown is counted from the position; nothing is guessed.
// Texts: TX[lang] (en fallback); the other languages live in coach-i18n.js (FoxCoach.merge).
(() => {
const TX = {
ja: {
  head: 'コーチ', sw: 'コーチ', swT: 'コーチ（考え方の解説）のオン／オフ', on: 'コーチ ON', off: 'コーチ OFF',
  rest: 'レッスン・パズル・観戦などの間、コーチはお休みです。自分の力で考えてみよう。AIとの対局や二人対戦に戻ると、コーチが再開します。',
  offNote: 'コーチ機能はオフになっています。右上のスイッチをオンにすると、局面の考え方や候補手の解説が表示されます。',
  overRv: '対局が終わりました。分析すると、この欄に一手ごとの振り返り（最善手・悪手とその理由）が表示されます。',
  oppTurn: '相手の手番です。相手がどこを狙ってくるか、予想してみよう。',
  calc: '候補手を考えています…', form: '形勢', cap: 'ガチョウ', stones: '狐の動ける点', stage: '局面',
  'st.open': '序盤', 'st.mid': '中盤', 'st.end': '終盤',
  'f.win': '勝勢', 'f.big': '優勢', 'f.adv': '有利', 'f.sl': 'やや有利', 'f.even': '互角', 'f.sld': 'やや不利', 'f.dis': '不利', 'f.bad': '劣勢', 'f.lost': '敗勢',
  'cap.v': '残り{a}（あと{b}で狐の勝ち）', 'st.v': '1歩で{a}・歩いて{b}',
  recWhy: 'この局面の第一候補は「{c}」の方針です。形勢は{f}（勝率{p}%）。',
  recSharp: '2番目の候補との差が大きく（勝率で{x}）、ここは正確に指したい局面です。',
  recBranch: '候補どうしの差が小さい分かれ道です。下の候補から好きな方針を選べます。',
  recOnly: 'ほかの手は大きく形勢を損ねます。迷わず指したい局面です。', recForced: '指せる手はこれだけです。',
  brH: '分かれ道 — 選べる方針', brIntro: 'どれを選んでも大差はありません。自分の得意な進め方を選ぶのが上達の近道です。',
  cdH: '候補手と方針', cdIntro: '上位の候補を、方針ごとに解説します。', plH: '候補手と方針', plIntro: '上位の候補を、方針ごとに解説します。',
  'gap.best': '最善', 'gap.eq': 'ほぼ同じ', 'gap.lt': '少し劣る', 'gap.bad': '劣る',
  'q.best': '最善', 'q.good': '良い手', 'q.dubious': '疑問手', 'q.bad': '悪手',
  'tt.move': '{sq}から{to}へ', 'tt.leap': '{sq}から跳んで{to}へ', 'tt.place': '{to}', 'tt.rm': '{to}',
  'c.win': '勝ち筋', 'b.win': '勝ちを決める', 'x.win': 'AIの読みでは、ここから勝ち切れます。相手のいちばん粘る受けを確かめながら進めよう。',
  'c.dbl': '続けて取る', 'b.dbl': '続けて取る', 'x.dbl': '1手で{n}羽取ります。着地した{to}のまわりで、すぐ囲まれないかも見ておこう。',
  'c.hit': '取る', 'b.hit': 'ガチョウを取る', 'x.hit': 'ガチョウを1羽跳び越えて取り、{to}に着地します。このあと狐が1歩で動ける点は{a}つ。',
  'c.fork': '2羽を狙う', 'b.fork': '2羽を同時に狙う', 'x.fork': '{to}に動くと、取れるガチョウが{t}羽できます。両方は守れないので、次に1羽取れる見込みです。',
  'c.threat': '狙う', 'b.threat': 'ガチョウを狙う', 'x.threat': '{to}から、後ろの空いたガチョウを1羽狙います。守られたら、次の狙いを探そう。',
  'c.run': '広い所へ', 'b.run': '広い所へ出る', 'x.run': '{to}へ。動ける点が{a}つに増え、囲まれにくくなります。',
  'c.adv': '位置を変える', 'b.adv': '位置を変える', 'x.adv': '{to}へ。このあと狐が1歩で動ける点は{a}つ、歩いて行ける点は{r}つ。',
  'c.trap': '閉じ込める', 'b.trap': '狐を閉じ込める', 'x.trap': 'この手で狐は1歩も動けず、跳ぶこともできません。ガチョウの勝ちです。',
  'c.guard': '守る', 'b.guard': '狙われた駒を守る', 'x.guard': '跳び越されそうなガチョウを守ります。この手のあと、狐が取れるガチョウはありません。',
  'c.close': '詰める', 'b.close': '狐を追いつめる', 'x.close': '狐が歩いて行ける点を{b}から{r}に減らします。跳ばれる駒はありません。',
  'c.wall': '形を整える', 'b.wall': '形を整える', 'x.wall': '{to}へ。後ろの空いたガチョウをなくし、列をそろえて次の前進に備えます。',
  'c.risk': '誘う', 'b.risk': '1羽を差し出す', 'x.risk': 'この手のあと、狐は1羽取れます。取らせて囲む狙いがあるかを確かめてから選ぼう。',
  tipsH: '考え方のヒント', more: 'ほかのヒント（{n}）', less: 'たたむ',
  prev: '前の手 {m}：{q}', prevBest: '「{c}」の方針で、AIの第一候補と同じ手です。', prevAlt: 'AIの第一候補は {m}（{c}）でした。', prevAltOk: 'AIの第一候補 {m}（{c}）と同じくらいの手です。',
  'lp.hit': '💡コツ：となりのガチョウの真後ろが空いていたら、跳び越えて取れます。', 'lp.safe': '💡コツ：ガチョウを動かす前に、その駒と、元いた場所のとなりの駒の真後ろが空かないかを確かめよう。',
  'lp.place': '💡コツ：盤上の矢印が最善手です。', 'lp.room': '💡コツ：狐は、囲まれる前に広い側へ出よう。動ける点の数を数えて。',
  'tp.take': 'いま取れるガチョウがあります。', 'tp.multi': '1手で2羽以上取れる跳び方があります。', 'tp.fork': '2羽を同時に狙える点があります。',
  'tp.tight': '動ける点が少なくなっています（1歩で{a}つ）。囲まれる前に広い側へ。', 'tp.fewLeft': 'あと{n}羽取れば勝ちです。',
  'tp.gHang': '{sq}のガチョウが狙われています。真後ろを埋めるか、逃がそう。', 'tp.gTrap': '1手で狐を閉じ込められます。探してみよう。',
  'tp.gClose': '狐が1歩で動ける点はあと{a}つ。跳ばれない駒でふさいでいこう。', 'tp.gLine': 'ガチョウは横1列にそろえて、少しずつ前へ。列にすき間を作らないのがコツ。',
  'tp.gBack': '真後ろに仲間がいるガチョウは跳び越されません。', 'tp.gFew': 'ガチョウは残り{n}羽。5羽以下になると負けです。1羽も渡さないつもりで。',
  'tp.gNoBack': '17羽のルールでは、ガチョウは後ろに下がれません。進める前によく確かめて。',
  'tp.rule': '狐は取る、ガチョウは囲む。ガチョウが5羽以下になれば狐の勝ち、狐が動けなければガチョウの勝ちです。',
  'tp.quiet': '取り合いのないまま80手ずつ進むと引き分けです。',
  'tp.branch': '候補どうしの差は小さい分かれ道です。', 'tp.sharp': '最善とほかの差が大きい（勝率{x}）局面です。慎重に。',
  'tp.winning': '有利です。相手の反撃がないかだけ確かめて、着実に。', 'tp.losing': '苦しい局面。まずは目の前の損を防ごう。',
  sep: '、',
  gl: {
    back: { m: ['真後ろ'], t: '真後ろ', d: '狐から見て、ガチョウの向こう側のとなりの点。ここが空いていると、そのガチョウは跳び越されます。' },
  },
},
en: {
  head: 'Coach', sw: 'Coach', swT: 'Coach (how-to-think explanations) on / off', on: 'Coach ON', off: 'Coach OFF',
  rest: 'The coach rests during lessons, puzzles, watching and similar. Think for yourself! It comes back in games against the AI or two-player games.',
  offNote: 'The coach is off. Turn the switch at the top right on to see how to think about the position and what the candidates mean.',
  overRv: 'The game is over. Analyse it to see a move-by-move review here (best moves, mistakes and why).',
  oppTurn: 'Your opponent is to move. Guess what they will go for.',
  calc: 'Looking at the candidates…', form: 'Position', cap: 'Geese', stones: 'Fox’s room', stage: 'Phase',
  'st.open': 'Opening', 'st.mid': 'Middlegame', 'st.end': 'Endgame',
  'f.win': 'Winning', 'f.big': 'Much better', 'f.adv': 'Better', 'f.sl': 'Slightly better', 'f.even': 'Even', 'f.sld': 'Slightly worse', 'f.dis': 'Worse', 'f.bad': 'Much worse', 'f.lost': 'Losing',
  'cap.v': '{a} left ({b} more and the fox wins)', 'st.v': '{a} steps · {b} points in reach',
  recWhy: 'The first choice here is “{c}”. The position is {f} ({p}% to win).',
  recSharp: 'The second choice is clearly worse ({x} less), so play precisely here.',
  recBranch: 'The candidates are close: pick the plan you like below.',
  recOnly: 'Every other move spoils the position. Play this one.', recForced: 'This is your only move.',
  brH: 'Crossroads — plans to choose from', brIntro: 'None of these is much worse. Choosing the plan you understand best is how you improve.',
  cdH: 'Candidates and plans', cdIntro: 'The top candidates, explained by plan.', plH: 'Candidates and plans', plIntro: 'The top candidates, explained by plan.',
  'gap.best': 'Best', 'gap.eq': 'About equal', 'gap.lt': 'A little worse', 'gap.bad': 'Worse',
  'q.best': 'Best', 'q.good': 'Good', 'q.dubious': 'Dubious', 'q.bad': 'Mistake',
  'tt.move': '{sq} to {to}', 'tt.leap': 'Jump from {sq} to {to}', 'tt.place': '{to}', 'tt.rm': '{to}',
  'c.win': 'Winning line', 'b.win': 'Finish the win', 'x.win': 'The AI sees a win from here. Go on, checking the most stubborn reply each time.',
  'c.dbl': 'Several jumps', 'b.dbl': 'Take several', 'x.dbl': 'Takes {n} geese in one move. Check that the fox is not netted where it lands, on {to}.',
  'c.hit': 'Take', 'b.hit': 'Take a goose', 'x.hit': 'Jumps a goose and lands on {to}. Afterwards the fox has {a} steps.',
  'c.fork': 'Attack two', 'b.fork': 'Attack two at once', 'x.fork': 'From {to} the fox can jump {t} geese. They cannot cover both, so one should fall next move.',
  'c.threat': 'Attack', 'b.threat': 'Attack a goose', 'x.threat': 'From {to} the fox attacks a goose with an empty point behind it. If it is covered, look for the next target.',
  'c.run': 'Open ground', 'b.run': 'Head for open ground', 'x.run': 'To {to}: the fox has {a} steps there and is harder to net.',
  'c.adv': 'Shift', 'b.adv': 'Change position', 'x.adv': 'To {to}. Afterwards the fox has {a} steps and {r} points within reach.',
  'c.trap': 'Shut in', 'b.trap': 'Shut the fox in', 'x.trap': 'After this move the fox can neither step nor jump. The geese win.',
  'c.guard': 'Cover', 'b.guard': 'Cover a goose', 'x.guard': 'Covers a goose that could be jumped. Afterwards the fox can take nothing.',
  'c.close': 'Close in', 'b.close': 'Close in on the fox', 'x.close': 'Cuts the points within the fox’s reach from {b} to {r}, with no goose left to jump.',
  'c.wall': 'Tidy the line', 'b.wall': 'Tidy the line', 'x.wall': 'To {to}: no goose is left with an empty point behind it, ready for the next step forward.',
  'c.risk': 'Bait', 'b.risk': 'Offer a goose', 'x.risk': 'After this move the fox can take a goose. Choose it only if the net closes afterwards.',
  tipsH: 'How to think', more: 'More tips ({n})', less: 'Fewer',
  prev: 'Last move {m}: {q}', prevBest: '“{c}” — the AI’s first choice too.', prevAlt: 'The AI’s first choice was {m} ({c}).', prevAltOk: 'About as good as the AI’s first choice {m} ({c}).',
  'lp.hit': '💡Tip: a goose next to the fox with the point straight behind it empty can be jumped.', 'lp.safe': '💡Tip: before moving a goose, check the point straight behind it — and behind the neighbours of the point it leaves.',
  'lp.place': '💡Tip: the arrow on the board is the best move.', 'lp.room': '💡Tip: the fox should reach open ground before the net closes. Count its steps.',
  'tp.take': 'A goose can be taken right now.', 'tp.multi': 'One way of jumping takes two geese or more.', 'tp.fork': 'There is a point from which two geese are attacked at once.',
  'tp.tight': 'The fox is short of room ({a} steps). Head for the open side before the net closes.', 'tp.fewLeft': '{n} more geese and the fox wins.',
  'tp.gHang': 'The goose on {sq} is under attack. Fill the point behind it, or move it away.', 'tp.gTrap': 'One move shuts the fox in. Find it!',
  'tp.gClose': 'The fox has only {a} steps left. Close them with geese that cannot be jumped.', 'tp.gLine': 'Keep the geese in a line and advance little by little. Leave no gap in the line.',
  'tp.gBack': 'A goose with a friend straight behind it cannot be jumped.', 'tp.gFew': '{n} geese left: at five they lose. Do not give away a single one.',
  'tp.gNoBack': 'With 17 geese they can never move backwards. Check before every advance.',
  'tp.rule': 'The fox takes, the geese surround. Five geese or fewer and the fox wins; a fox that cannot move loses.',
  'tp.quiet': 'After 80 moves each without a capture the game is a draw.',
  'tp.branch': 'The candidates are close here.', 'tp.sharp': 'The best move is clearly better ({x}). Take care.',
  'tp.winning': 'You are ahead. Just check for counterplay and play steadily.', 'tp.losing': 'A hard position. First stop the immediate loss.',
  sep: ', ',
  gl: {
    back: { m: ['straight behind'], t: 'Straight behind', d: 'The next point beyond a goose as seen from the fox. If it is empty, the goose can be jumped.' },
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
// the geese the fox could jump right now (first jumps only), whoever is to move
function jumpable(pos) { const out = []; for (const [x, b] of E.NBR[pos.fox]) if (b >= 0 && pos.owner(x) === 2 && !pos.owner(b)) out.push(x); return out; }
function facts(pos, n) {
  const us = pos.turn, f = { us, n, fox: us === 1 };
  f.legal = pos.moves();
  f.geese = pos.geese; f.left = pos.geese - E.FOX_WINS_AT; f.room = pos.foxRoom(); f.area = E.foxArea(pos); f.hang = jumpable(pos);
  f.cap = [f.geese, f.left]; f.st = [f.room, f.area]; f.inc = [0, 0];
  f.stage = pos.ply < 12 && !pos.cap ? 'open' : f.left <= 3 || f.area <= 6 ? 'end' : 'mid';
  f.hit = null; f.hitN = 0; f.trap = null; f.fork = null;
  for (const m of f.legal) {
    const k = E.jumped(m).length;
    if (f.fox) { if (k > f.hitN) { f.hitN = k; f.hit = m; } else if (!k && !f.fork) { const q = pos.clone().play(m); if (jumpable(q).length >= 2) f.fork = m; } }
    else if (!f.trap) { const q = pos.clone().play(m); if (E.judge(q).winner === 2) f.trap = m; }
  }
  return f;
}
// the plan of a move: what it does on the board
function classify(pos, m, f, v) {
  const fr = E.mFrom(m), to = E.mTo(m), q = pos.clone().play(m), n = E.jumped(m).length;
  const base = { sq: SQN(fr), to: SQN(to), m, n, a: q.foxRoom(), r: E.foxArea(q), b: f.area, t: jumpable(q).length };
  if (f.fox) {
    if (v != null && v > WINT) return Object.assign(base, { k: 'win' });
    if (n >= 2) return Object.assign(base, { k: 'dbl' });
    if (n === 1) return Object.assign(base, { k: 'hit' });
    if (base.t >= 2) return Object.assign(base, { k: 'fork' });
    if (base.t === 1) return Object.assign(base, { k: 'threat' });
    if (base.a > f.room) return Object.assign(base, { k: 'run' });
    return Object.assign(base, { k: 'adv' });
  }
  if (E.judge(q).winner === 2) return Object.assign(base, { k: 'trap' });
  if (v != null && v > WINT) return Object.assign(base, { k: 'win' });
  if (base.t > 0) return Object.assign(base, { k: 'risk' });
  if (f.hang.length) return Object.assign(base, { k: 'guard' });
  if (base.r < f.area) return Object.assign(base, { k: 'close' });
  return Object.assign(base, { k: 'wall' });
}
const RCLS = { win: 'c-win', dbl: 'c-win', hit: 'c-mat', fork: 'c-mat', threat: 'c-dev', run: 'c-def', adv: 'c-dev', trap: 'c-win', guard: 'c-def', close: 'c-mat', wall: 'c-dev', risk: 'c-dev' };
const CCLS = RCLS;
function formOf(w) { return w >= .9 ? 'win' : w >= .75 ? 'big' : w >= .62 ? 'adv' : w >= .54 ? 'sl' : w > .46 ? 'even' : w > .38 ? 'sld' : w > .25 ? 'dis' : w > .1 ? 'bad' : 'lost'; }
function ttl(k) { return tx(k.n ? 'tt.leap' : 'tt.move', k); }
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
  try { S.f = facts(posAt(cur).pos.clone(), cur); } catch (e) { S.f = { n: cur, legal: [], cap: [0, 0], inc: [0, 0], st: [0, 0], stage: 'mid', hang: [], hit: null, hitN: 0, trap: null, fork: null, fox: true, room: 0, area: 0, geese: 0, left: 0 }; }
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
function tipsOf(f, w, cl, pos) {
  const out = [], add = (k, pr, v, hi) => out.push({ k, pr, v, hi });
  if (f.fox) {
    if (f.hitN >= 2) add('tp.multi', 100, {}, 1); else if (f.hit != null) add('tp.take', 98, {}, 1);
    if (f.hit == null && f.fork != null) add('tp.fork', 92, {}, 1);
    if (f.room <= 2) add('tp.tight', 94, { a: f.room }, 1);
    if (f.left <= 3) add('tp.fewLeft', 70, { n: f.left });
  } else {
    if (f.trap != null) add('tp.gTrap', 100, {}, 1);
    if (f.hang.length) add('tp.gHang', 98, { sq: f.hang.slice(0, 3).map(SQN).join(tx('sep')) }, 1);
    if (f.room <= 3 && f.trap == null) add('tp.gClose', 80, { a: f.room });
    if (f.left <= 3) add('tp.gFew', 76, { n: f.geese }, 1);
    add('tp.gBack', 44); add('tp.gLine', f.stage === 'open' ? 60 : 30);
    if (!E.R.back) add('tp.gNoBack', 50);
  }
  if (pos.quiet >= E.QUIET_MAX - 40) add('tp.quiet', 64);
  if (w != null) { if (w >= .8) add('tp.winning', 46); else if (w <= .25) add('tp.losing', 46); }
  if (cl && cl.branch) add('tp.branch', 58);
  if (cl && cl.sharp) add('tp.sharp', 56, { x: cl.sharp });
  add('tp.rule', 20);
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
  const g = { best: 0, good: 1, dubious: 2, bad: 3 }[q];
  let body = '';
  try {
    const ff = facts(pos.clone(), i);
    if (best.m !== m && q !== 'best') {
      const k = classify(pos.clone(), best.m, ff, best.v), mk = classify(pos.clone(), m, ff, mine.v);
      body = esc(tx(q === 'good' ? 'prevAltOk' : 'prevAlt', { m: E.name(pos, best.m), c: tx('c.' + k.k) }));
      if (q === 'dubious' || q === 'bad') body += '<br>' + esc(tx(ff.fox ? (k.n > mk.n ? 'lp.hit' : 'lp.room') : 'lp.safe'));
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
  if (FoxCoach.sw) FoxCoach.sw.sync();
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
  if (!myTurn()) { S.items = null; h += `<p class="ck-muted">${esc(tx('oppTurn'))}</p>` + verdictHtml(); return put(h); }
  const pos = posAt(cur).pos.clone(), list = listAt(cur);
  let bv = null; if (list && list.length) { bv = -Infinity; for (const e of list) bv = Math.max(bv, e.v); }
  const w = bv != null ? wr(bv) : null;
  const chips = [];
  if (w != null && settings.eval) chips.push({ k: tx('form'), v: esc(tx('f.' + formOf(w)) + ' ' + pctS(w)), cls: w >= .54 ? 'pos' : w <= .46 ? 'neg' : '' });
  if (!pos.placing) chips.push({ k: tx('cap'), v: esc(tx('cap.v', { a: f.geese, b: Math.max(0, f.left) })) });
  chips.push({ k: tx('stones'), v: esc(tx('st.v', { a: f.st[0], b: f.st[1] })) });
  h += CoachKit.summary(chips);
  let cl = null;
  {
    cl = candInfo(list, f, pos);
    if (cl && cl.best) {
      const b = cl.best;
      let why = esc(tx('recWhy', { c: tx('c.' + b.k.k), f: tx('f.' + formOf(wr(b.v))), p: Math.round(wr(b.v) * 100) }));
      if (cl.forced) why = esc(tx('recForced'));
      else if (cl.only) why += ' ' + esc(tx('recOnly')); else if (cl.sharp) why += ' ' + esc(tx('recSharp', { x: cl.sharp })); else if (cl.branch) why += ' ' + esc(tx('recBranch'));
      h += CoachKit.rec(tx('b.' + b.k.k), gl(why), RCLS[b.k.k] || '');
      h += CoachKit.branches({
        head: tx(pos.placing ? 'plH' : cl.branch ? 'brH' : 'cdH'), intro: gl(esc(tx(pos.placing ? 'plIntro' : cl.branch ? 'brIntro' : 'cdIntro'))),
        items: cl.dirs.map((d, i) => { const g = gapOf(d.drop, i); return { tag: tx('c.' + d.k.k), cls: CCLS[d.k.k] || '', title: esc(ttl(d.k)), text: gl(esc(catTxt(d.k))), gap: tx(g[0]) + (d.drop > 0.005 ? ' −' + pctS(d.drop) : ''), gcls: g[1], move: String(d.u), mvName: d.nm }; }),
      });
    } else { S.items = null; h += `<p class="ck-calc">${esc(tx('calc'))}</p>`; }
  }
  const tl = tipsOf(f, w, cl, pos);
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
  for (const m of L) if (legal.includes(m)) {
    const pth = E.path(pos, m);
    if (pth.length > 1) svgArrow(svg, pth, 'ck');
    else { const [r, c] = dRC(E.mTo(m)), o = document.createElementNS(NS, 'circle'); o.setAttribute('cx', c + 0.5); o.setAttribute('cy', r + 0.5); o.setAttribute('r', 0.42); o.setAttribute('class', 'ring ck'); o.setAttribute('fill', 'none'); o.setAttribute('stroke-width', 0.07); svg.appendChild(o); }
  }
}
function cands(key, list) { if (list && list.length) { S.lists.set(key, list); if (S.lists.size > 400) S.lists.delete(S.lists.keys().next().value); } }
function init() {
  if (!window.CoachKit) return;
  if (settings.coach === undefined) settings.coach = true;
  CoachKit.css(); CoachKit.glossBind(() => (TX[L()] || TX.en).gl);
  card = document.getElementById('coachCard');
  if (window.MutationObserver) { let k = ''; const mo = () => { const b = document.body.classList, n = ['in-lesson', 'in-puzzle', 'in-online', 'in-edit', 'in-study', 'rated-live', 'in-watch'].map(c => b.contains(c) ? 1 : 0).join(''); if (n !== k) { k = n; render(); } }; new MutationObserver(mo).observe(document.body, { attributes: true, attributeFilter: ['class'] }); }
  { const rc = document.getElementById('reviewCard'); if (rc && window.MutationObserver) new MutationObserver(() => render()).observe(rc, { attributes: true, attributeFilter: ['class'] }); }
  FoxCoach.sw = CoachKit.sw({ mount: '.brand-r', get: () => !!settings.coach, set: v => setOn(v), label: on => ({ text: tx('sw'), title: tx('swT') + ' — ' + tx(on ? 'on' : 'off') }) });
}
function setOn(v) {
  settings.coach = !!v; save();
  CoachKit.flash(tx(v ? 'on' : 'off'));
  S.hov = null; render(); renderFx();
  if (v && !listAt(cur)) analyzeCurrent(busyToken);
}
function relabel() { if (FoxCoach.sw) FoxCoach.sw.sync(); S.key = ''; render(); }
function merge(more) { for (const l in more) TX[l] = Object.assign({}, TX[l] || {}, more[l], { gl: Object.assign({}, (TX[l] || {}).gl || {}, more[l].gl || {}) }); }
window.FoxCoach = { init, render, relabel, merge, tx, TX, active, usable, cands, fx };
})();
