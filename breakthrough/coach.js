'use strict';
// ブレイクスルーのコーチ (common spec: shared/COACH.md, model: shogi/coach.js via konane/coach.js) — shown while the player is to
// move against the AI (and in two-player games on one device): the position at a glance (形勢・駒数・先頭の残り段数・自陣の守り・
// 局面), the recommended plan with its reason, the candidate directions (分かれ道: each candidate's plan explained with facts read off
// the board after it, moves shown on hover / tap with arrows), prioritized "how to think" tips read from the position (ゴール目前・
// 取らないと負け・止められない駒・ただで取られる駒…), and the verdict on the previous move (◎○△✕).
// The opening is taught from the designer's and Luna-Mota's advice, not from the evaluation (claude/breakthrough-spec.md「序盤」):
// keep the home row, occupy the centre (W. D. Troyka's strategy notes); White's sample opening builds a wall on the third row with
// the home row intact, Black's builds two solid 3×2 blocks (C. Luna-Mota, "Basic Introduction to Breakthrough", v0.9).
// Every number shown is counted from the position; nothing is guessed. Texts: TX[lang]; the other languages in coach-i18n.js.
(() => {
const TX = {
ja: {
  head: 'コーチ', sw: 'コーチ', swT: 'コーチ（考え方の解説）のオン／オフ', on: 'コーチ ON', off: 'コーチ OFF',
  rest: 'レッスン・パズル・観戦などの間、コーチはお休みです。自分の力で考えてみよう。AIとの対局や二人対戦に戻ると、コーチが再開します。',
  offNote: 'コーチ機能はオフになっています。右上のスイッチをオンにすると、局面の考え方や候補手の解説が表示されます。',
  overRv: '対局が終わりました。分析すると、この欄に一手ごとの振り返り（最善手・悪手とその理由）が表示されます。',
  oppTurn: '相手の手番です。相手の駒がどこを狙っているか、予想してみよう。',
  calc: '候補手を考えています…', form: '形勢', pcs: '駒', lead: '先頭', home: '自陣の奥', stage: '局面',
  'st.open': '序盤', 'st.mid': '中盤', 'st.end': '終盤',
  'f.win': '勝勢', 'f.big': '優勢', 'f.adv': '有利', 'f.sl': 'やや有利', 'f.even': '互角', 'f.sld': 'やや不利', 'f.dis': '不利', 'f.bad': '劣勢', 'f.lost': '敗勢',
  'pc.v': '自分{a}・相手{b}', 'ld.v': '自分あと{a}・相手あと{b}', 'hm.v': '自分{a}・相手{b}',
  recWhy: 'この局面の第一候補は「{c}」の方針です。形勢は{f}（勝率{p}%）。',
  recSharp: '2番目の候補との差が大きく（勝率で{x}）、ここは正確に指したい局面です。',
  recBranch: '候補どうしの差が小さい分かれ道です。下の候補から好きな方針を選べます。',
  recOnly: 'ほかの手は大きく形勢を損ねます。迷わず指したい局面です。', recForced: '指せる手はこれだけです。',
  brH: '分かれ道 — 選べる方針', brIntro: 'どれを選んでも大差はありません。自分の得意な進め方を選ぶのが上達の近道です。',
  cdH: '候補手と方針', cdIntro: '上位の候補を、方針ごとに解説します。',
  'gap.best': '最善', 'gap.eq': 'ほぼ同じ', 'gap.lt': '少し劣る', 'gap.bad': '劣る',
  'q.best': '最善', 'q.good': '良い手', 'q.dubious': '疑問手', 'q.bad': '悪手',
  'tt.mv': '{sq}の駒を{to}へ', 'tt.cap': '{sq}の駒で{to}を取る',
  'c.goal': 'ゴール', 'b.goal': '勝ちを決める', 'x.goal': '相手の奥の段に届きます。この一手で勝ちです。',
  'c.win': '勝ち筋', 'b.win': '勝ち切る', 'x.win': 'AIの読みでは、ここから相手の受けが間に合いません。相手の取り返しを1手ずつ確かめながら進めよう。',
  'c.stop': '侵入を止める', 'b.stop': '自陣に迫る駒を取る', 'x.stop': '{to}の駒は自陣まであと{d}段まで来ていました。取って突破の芽を摘みます。',
  'c.gain': '駒得', 'b.gain': 'ただで取る', 'x.gain': '{to}の駒を取ります。取った駒は取り返されません。',
  'c.trade': '交換', 'b.trade': '取って取られる', 'x.trade': '{to}の駒を取りますが、取り返されます。交換で相手の守りの形を崩す手です。',
  'c.run': '突破を狙う', 'b.run': '止められない駒を作る', 'x.run': '{to}の駒の前（斜め前に広がる範囲）には相手の駒がありません。あと{d}段で、もう止められません。',
  'c.press': '攻め', 'b.press': '相手の駒を狙う', 'x.press': '{to}へ進むと、斜め前の相手の駒を次に取れます。後ろに味方がいて、取られても取り返せる形です。',
  'c.wall': '守りを固める', 'b.wall': '壁を作る', 'x.wall': '{to}で横並び（または縦並び）の形を作ります。横や縦に並んだ駒の列は、相手がすり抜けられません。',
  'c.adv': '前進', 'b.adv': '陣地を広げる', 'x.adv': '{to}へ進んで中央の陣地を広げます。斜め前に相手の駒がなく、すぐには取られません。',
  'c.wait': '手待ち', 'b.wait': '形を崩さずに待つ', 'x.wait': '守りの形を崩さない手です。終盤は、先に形を崩した方が不利になることがあります（ツークツワンク）。',
  opH: '序盤 — 定番の方針', opIntro: 'ブレイクスルーには名前の付いた定跡はほとんどありませんが、考案者と上級者が勧める序盤の考え方があります。',
  'op.wall': '3段目に壁', 'op.wall.t': '{sq}の駒を{to}へ（2段目から前へ）', 'op.wall.x': '自陣の奥（1段目）は残したまま、2段目の駒を前へ出して3段目に横一列の壁を作り、中央を取りにいく進め方。上級者向けの、積極的な序盤の例として紹介されています。',
  'op.block': '3×2の塊', 'op.block.t': '{sq}の駒を{to}へ（両翼を固める）', 'op.block.x': '左右に3列×2段の塊を作る、堅い守りの序盤の例。攻められても崩れにくい反面、中央と主導権を相手に渡しやすい形です。',
  'op.edge': '変わり種', 'op.edge.t': '{sq}の駒を{to}へ（端から仕掛ける）', 'op.edge.x': '端の駒を早めに進める手。端の駒は取られにくい一方、守れるマスも少なくなります。',
  tipsH: '考え方のヒント', more: 'ほかのヒント（{n}）', less: 'たたむ',
  prev: '前の手 {m}：{q}', prevBest: '「{c}」の方針で、AIの第一候補と同じ手です。', prevAlt: 'AIの第一候補は {m}（{c}）でした。', prevAltOk: 'AIの第一候補 {m}（{c}）と同じくらいの手です。',
  'lp.hang': '💡コツ：斜め前に相手の駒があるマスへ進む前に、後ろから取り返せる味方がいるか確かめよう。',
  'lp.stop': '💡コツ：相手の駒が自陣の3段目まで来たら、取る手・止める手を最優先に。', 'lp.gen': '💡コツ：指す前に、その駒が次に取られないか、相手の駒がどこまで来ているかを確かめよう。',
  'tp.goal': '{sq}の駒はゴールの一歩手前。進めば勝ちです！', 'tp.must': '{sq}の相手の駒が自陣の一歩手前まで来ています。取らないと次にゴールされます。',
  'tp.two': '相手の駒が2つ、自陣の一歩手前にいます。両方は止められません。',
  'tp.near': '{sq}の相手の駒が自陣まであと2段。今のうちに取れるか、取り返せる形かを確かめよう。',
  'tp.run': '{sq}の駒の前には相手の駒がありません。あと{d}段で、もう止められない駒です。', 'tp.oppRun': '{sq}の相手の駒は、もう止められません（あと{d}段）。競走で先に着く手があるか数えよう。',
  'tp.free': '{sq}の相手の駒は、取っても取り返されません。', 'tp.hang': '{sq}の駒は、相手に取られて取り返せない位置です。',
  'tp.home': '自陣の奥（1段目）の駒は、複数の侵入路をまとめて守る大事な守り手です。なるべく動かさずに残そう。',
  'tp.centre': '中央の駒は斜め前の2マスを守れ、動ける範囲も広い。序盤は中央を取ろう。',
  'tp.single': '1つの駒だけでは相手の駒を止められません（横をすり抜けられます）。守りは2つ以上で組もう。',
  'tp.phalanx': '横並び・縦並びの列はすり抜けられない形。斜めに並んだ形はすり抜けやすいので注意。',
  'tp.tempo': '終盤は「手待ち」の数が勝負を分けます。守りの形を崩さずに指せる手が、相手より多いかを数えよう。',
  'tp.race': '守りが崩れたら競走です。ゴールまでの段数を数えて、先に着く方を選ぼう。',
  'tp.rule': '相手の奥の段に1つでも届けば勝ち。取れるのは斜め前の駒だけです。',
  'tp.branch': '候補どうしの差は小さい分かれ道です。', 'tp.sharp': '最善とほかの差が大きい（勝率{x}）局面です。慎重に。',
  'tp.winning': '有利です。相手の突破の筋がないか確かめながら進めよう。', 'tp.losing': '苦しい局面。相手の先頭の駒を止めることを最優先に。',
  sep: '、',
  gl: {
    run: { m: ['止められない'], t: '止められない駒（ランナー）', d: 'その駒の前に斜めに広がる範囲（取りに来られる範囲）に相手の駒が1つもない駒。もう誰にも止められません。' },
    zug: { m: ['ツークツワンク', '手待ち'], t: 'ツークツワンク', d: '指さなければならないことが不利になる状態。ブレイクスルーはパスができないので、終盤によく起こります。' },
    phal: { m: ['横並び'], t: '横並び（ファランクス）', d: '横に並んだ駒の列。すり抜けられないので守りに強い形です。' },
  },
},
en: {
  head: 'Coach', sw: 'Coach', swT: 'Coach (how-to-think explanations) on / off', on: 'Coach ON', off: 'Coach OFF',
  rest: 'The coach rests during lessons, puzzles, watching and similar. Think for yourself! It comes back in games against the AI or two-player games.',
  offNote: 'The coach is off. Turn the switch at the top right on to see how to think about the position and what the candidates mean.',
  overRv: 'The game is over. Analyse it to see a move-by-move review here (best moves, mistakes and why).',
  oppTurn: 'Your opponent is to move. Guess what their pieces are aiming at.',
  calc: 'Looking at the candidates…', form: 'Position', pcs: 'Pieces', lead: 'Lead piece', home: 'Home row', stage: 'Phase',
  'st.open': 'Opening', 'st.mid': 'Middlegame', 'st.end': 'Endgame',
  'f.win': 'Winning', 'f.big': 'Much better', 'f.adv': 'Better', 'f.sl': 'Slightly better', 'f.even': 'Even', 'f.sld': 'Slightly worse', 'f.dis': 'Worse', 'f.bad': 'Much worse', 'f.lost': 'Losing',
  'pc.v': 'you {a} · them {b}', 'ld.v': 'you {a} to go · them {b}', 'hm.v': 'you {a} · them {b}',
  recWhy: 'The first choice here is “{c}”. The position is {f} ({p}% to win).',
  recSharp: 'The second choice is clearly worse ({x} less), so play precisely here.',
  recBranch: 'The candidates are close: pick the plan you like below.',
  recOnly: 'Every other move spoils the position. Play this one.', recForced: 'This is your only move.',
  brH: 'Crossroads — plans to choose from', brIntro: 'None of these is much worse. Choosing the plan you understand best is how you improve.',
  cdH: 'Candidates and plans', cdIntro: 'The top candidates, explained by plan.',
  'gap.best': 'Best', 'gap.eq': 'About equal', 'gap.lt': 'A little worse', 'gap.bad': 'Worse',
  'q.best': 'Best', 'q.good': 'Good', 'q.dubious': 'Dubious', 'q.bad': 'Mistake',
  'tt.mv': '{sq} to {to}', 'tt.cap': '{sq} takes on {to}',
  'c.goal': 'Goal', 'b.goal': 'Win now', 'x.goal': 'This piece reaches the far row. This move wins.',
  'c.win': 'Winning line', 'b.win': 'Finish it', 'x.win': 'The AI sees the defence arriving too late from here. Check each recapture as you go.',
  'c.stop': 'Stop the intruder', 'b.stop': 'Take the piece near your home', 'x.stop': 'The piece on {to} was only {d} rows from your home row. Taking it nips the breakthrough in the bud.',
  'c.gain': 'Win a piece', 'b.gain': 'Take for free', 'x.gain': 'Take the piece on {to}. It cannot be taken back.',
  'c.trade': 'Exchange', 'b.trade': 'Take and be taken', 'x.trade': 'Take the piece on {to}; it will be taken back. The exchange breaks up their defensive shape.',
  'c.run': 'Go for the breakthrough', 'b.run': 'Make an unstoppable piece', 'x.run': 'No enemy piece stands in the widening cone in front of {to}. {d} rows to go, and nothing can stop it.',
  'c.press': 'Attack', 'b.press': 'Aim at an enemy piece', 'x.press': 'From {to} you threaten to take the piece diagonally in front next move, with a friend behind to take back.',
  'c.wall': 'Strengthen the defence', 'b.wall': 'Build a wall', 'x.wall': 'On {to} it forms a row (or a column) with a friend. Rows and columns of pieces cannot be slipped past.',
  'c.adv': 'Advance', 'b.adv': 'Gain space', 'x.adv': 'Step to {to} and gain space in the centre. No enemy piece is diagonally in front, so it is not taken at once.',
  'c.wait': 'Waiting move', 'b.wait': 'Wait without breaking shape', 'x.wait': 'A move that keeps your defensive shape. In the endgame the side that must break its shape first often loses (zugzwang).',
  opH: 'Opening — common plans', opIntro: 'Breakthrough has hardly any named openings, but the inventor and strong players recommend some opening ideas.',
  'op.wall': 'Third-row wall', 'op.wall.t': '{sq} to {to} (second row forward)', 'op.wall.x': 'Keep the home row intact, bring the second-row pieces forward and build a wall across the third row to take the centre — given as an example of an aggressive opening for strong players.',
  'op.block': '3×2 blocks', 'op.block.t': '{sq} to {to} (firm up a wing)', 'op.block.x': 'Build a solid 3-wide, 2-deep block on each wing — a sturdy defensive opening that resists attacks well but tends to concede the centre and the initiative.',
  'op.edge': 'Unusual', 'op.edge.t': '{sq} to {to} (start from the edge)', 'op.edge.x': 'Push an edge piece early. Edge pieces are hard to take, but they guard fewer squares.',
  tipsH: 'How to think', more: 'More tips ({n})', less: 'Fewer',
  prev: 'Last move {m}: {q}', prevBest: '“{c}” — the AI’s first choice too.', prevAlt: 'The AI’s first choice was {m} ({c}).', prevAltOk: 'About as good as the AI’s first choice {m} ({c}).',
  'lp.hang': '💡Tip: before stepping next to an enemy piece diagonally, make sure a friend behind can take back.',
  'lp.stop': '💡Tip: once an enemy piece reaches your third row, captures and stopping moves come first.', 'lp.gen': '💡Tip: before moving, check whether the piece can be taken and how far the enemy pieces have come.',
  'tp.goal': 'The piece on {sq} is one step from the goal. Step in and win!', 'tp.must': 'The enemy piece on {sq} is one step from your home row. Take it or it walks in next move.',
  'tp.two': 'Two enemy pieces are one step from your home row. You cannot stop both.',
  'tp.near': 'The enemy piece on {sq} is two rows from your home row. Check whether you can take it, or take back if it advances.',
  'tp.run': 'No enemy piece stands in front of the piece on {sq}. {d} rows to go and nothing can stop it.', 'tp.oppRun': 'The enemy piece on {sq} can no longer be stopped ({d} rows to go). Count whether you can win the race.',
  'tp.free': 'The enemy piece on {sq} can be taken and not taken back.', 'tp.hang': 'Your piece on {sq} can be taken and you cannot take back.',
  'tp.home': 'Home-row pieces guard several entry routes at once. Keep them back as long as you can.',
  'tp.centre': 'A centre piece guards two squares in front and has the most room. Take the centre in the opening.',
  'tp.single': 'One piece alone cannot stop an attacker (it slips past). Defend with two or more.',
  'tp.phalanx': 'Rows and columns of pieces cannot be slipped past; diagonal lines can, so take care with them.',
  'tp.tempo': 'In the endgame spare moves decide the game. Count the moves you can make without breaking your shape — do you have more than your opponent?',
  'tp.race': 'When the defences are gone it is a race: count the rows and choose the side that arrives first.',
  'tp.rule': 'One piece on the far row wins. Captures are diagonal only.',
  'tp.branch': 'The candidates are close here.', 'tp.sharp': 'The best move is clearly better ({x}). Take care.',
  'tp.winning': 'You are ahead. Keep checking that they have no way through.', 'tp.losing': 'A hard position. Stopping their leading piece comes first.',
  sep: ', ',
  gl: {
    run: { m: ['unstoppable', 'nothing can stop'], t: 'Unstoppable piece (runner)', d: 'A piece with no enemy piece in the widening cone in front of it — nothing can ever reach it.' },
    zug: { m: ['zugzwang', 'waiting move'], t: 'Zugzwang', d: 'Having to move is a disadvantage. There is no passing in Breakthrough, so it happens often in the endgame.' },
    phal: { m: ['rows'], t: 'Row (phalanx)', d: 'Pieces side by side. They cannot be slipped past, a strong defensive shape.' },
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
// --------------------------------------------------------------------------------------------- position facts (all counted)
const fwdDir = p => p === P1 ? -1 : 1;
function attackers(pos, i, p) { const [r, c] = E.RC[i], dr = fwdDir(p), op = 3 - p; let n = 0; for (const dc of [-1, 1]) { const q = E.sqAt(r + dr, c + dc); if (q >= 0 && pos.owner(q) === op) n++; } return n; }
function defenders(pos, i, p) { const [r, c] = E.RC[i], dr = -fwdDir(p); let n = 0; for (const dc of [-1, 1]) { const q = E.sqAt(r + dr, c + dc); if (q >= 0 && pos.owner(q) === p) n++; } return n; }
const hangs = (pos, i, p) => attackers(pos, i, p) > defenders(pos, i, p);
function isRunner(pos, i, p) {   // no enemy piece in the cone in front (C. Luna-Mota's "mutually unreachable")
  const [r, c] = E.RC[i], dr = fwdDir(p), op = 3 - p, N = E.N;
  for (let k = 1; k < N; k++) { const rr = r + dr * k; if (rr < 0 || rr >= N) break; for (let cc = c - k; cc <= c + k; cc++) { const q = E.sqAt(rr, cc); if (q >= 0 && pos.owner(q) === op) return false; } }
  return true;
}
function homeCount(pos, p) { const N = E.N, r = p === P1 ? N - 1 : 0; let n = 0; for (let c = 0; c < N; c++) if (pos.owner(r * N + c) === p) n++; return n; }
function facts(pos, n) {
  const us = pos.turn, them = 3 - us, f = { us, n };
  f.legal = pos.moves();
  f.pc = [pos.count(us), pos.count(them)];
  f.lead = [pos.lead(us), pos.lead(them)];
  f.home = [homeCount(pos, us), homeCount(pos, them)];
  const N = E.N, all = f.pc[0] + f.pc[1];
  f.stage = pos.ply < 2 * N - 2 && all >= 4 * N - 3 ? 'open' : all <= 2 * N || Math.min(f.lead[0], f.lead[1]) <= 2 ? 'end' : 'mid';
  f.goal = null; f.must = []; f.near = []; f.run = null; f.oppRun = null; f.free = null; f.hang = null;
  for (let i = 0; i < E.NN; i++) {
    const o = pos.owner(i); if (!o) continue;
    const d = E.distOf(i, o);
    if (o === us) {
      if (d === 1 && f.goal == null) f.goal = i;
      if (d > 1 && isRunner(pos, i, us) && (f.run == null || d < E.distOf(f.run, us))) f.run = i;
      if (hangs(pos, i, us) && f.hang == null) f.hang = i;
    } else {
      if (d === 1) f.must.push(i); else if (d === 2) f.near.push(i);
      if (d > 1 && isRunner(pos, i, them) && (f.oppRun == null || d < E.distOf(f.oppRun, them))) f.oppRun = i;
      if (attackers(pos, i, them) > defenders(pos, i, them) && f.free == null) f.free = i;
    }
  }
  return f;
}
// the plan of a move, from what it does on the board
function classify(pos, m, f, v) {
  const us = pos.turn, them = 3 - us, fr = E.mFrom(m), to = E.mTo(m);
  const base = { sq: SQN(fr), to: SQN(to), m, cap: E.isCap(pos, m) };
  const q = pos.clone().play(m);
  if (E.judge(q).winner === us) return Object.assign(base, { k: 'goal' });
  if (v != null && v > WINT) return Object.assign(base, { k: 'win' });
  if (base.cap) {
    const d = E.distOf(to, them);
    if (d <= 2) return Object.assign(base, { k: 'stop', d });
    return Object.assign(base, { k: hangs(q, to, us) ? 'trade' : 'gain' });
  }
  const d = E.distOf(to, us);
  if (isRunner(q, to, us) && d <= Math.max(2, E.N - 4)) return Object.assign(base, { k: 'run', d });
  // a threat: an enemy piece diagonally in front, and a friend behind to take back
  const [r, c] = E.RC[to], dr = fwdDir(us);
  const aims = [-1, 1].some(dc => { const x = E.sqAt(r + dr, c + dc); return x >= 0 && q.owner(x) === them; });
  if (aims && defenders(q, to, us) > 0) return Object.assign(base, { k: 'press' });
  // a row or a column with a friend
  const nb = [[0, -1], [0, 1], [-dr, 0]].some(([a, b]) => { const x = E.sqAt(r + a, c + b); return x >= 0 && q.owner(x) === us; });
  if (nb && E.distOf(to, us) >= E.N - 4) return Object.assign(base, { k: 'wall' });
  if (attackers(q, to, us) === 0 && f.stage !== 'end') return Object.assign(base, { k: 'adv' });
  return Object.assign(base, { k: 'wait' });
}
const RCLS = { goal: 'c-win', win: 'c-win', stop: 'c-def', gain: 'c-mat', trade: 'c-mat', run: 'c-atk', press: 'c-atk', wall: 'c-def', adv: 'c-dev', wait: 'c-dev' };
const CCLS = RCLS;
function formOf(w) { return w >= .9 ? 'win' : w >= .75 ? 'big' : w >= .62 ? 'adv' : w >= .54 ? 'sl' : w > .46 ? 'even' : w > .38 ? 'sld' : w > .25 ? 'dis' : w > .1 ? 'bad' : 'lost'; }
function ttl(k) { return tx(k.cap ? 'tt.cap' : 'tt.mv', k); }
const catTxt = k => tx('x.' + k.k, k);
// --------------------------------------------------------------------------------------------- the opening (advice, not evaluation)
function openItems(pos, list) {
  const me = pos.turn, N = E.N, ms = pos.moves();
  const second = i => E.distOf(i, me) === N - 2, straight = m => E.mFrom(m) % N === E.mTo(m) % N;
  const L = list && list.length ? list.slice().sort((a, b) => b.v - a.v) : null;
  const val = m => { if (!L) return 0; const e = L.find(x => x.m === m); return e ? e.v : -1e9; };
  const pick = (flt) => { const c = ms.filter(flt); c.sort((a, b) => val(b) - val(a)); return c[0]; };
  const cen = m => { const c = E.mFrom(m) % N; return c >= 2 && c <= N - 3; }, wing = m => { const c = E.mFrom(m) % N; return c >= 1 && c <= 2 || c >= N - 3 && c <= N - 2; }, edge = m => { const c = E.mFrom(m) % N; return c === 0 || c === N - 1; };
  const out = [];
  const add = (key, m) => { if (m == null || out.some(x => x.m === m)) return; const it = { tag: tx('op.' + key), cls: key === 'edge' ? 'c-dev' : key === 'wall' ? 'c-atk' : 'c-def', title: esc(tx('op.' + key + '.t', { sq: SQN(E.mFrom(m)), to: SQN(E.mTo(m)) })), text: gl(esc(tx('op.' + key + '.x'))), move: String(m), mvName: E.name(pos, m), m };
    if (L) { const e = L.find(x => x.m === m); if (e) { const d = Math.max(0, wr(L[0].v) - wr(e.v)), g = gapOf(d, e === L[0] ? 0 : 1); it.gap = tx(g[0]); it.gcls = g[1]; } } out.push(it); };
  add('wall', pick(m => second(E.mFrom(m)) && straight(m) && cen(m)));
  add('block', pick(m => second(E.mFrom(m)) && straight(m) && wing(m)));
  add('edge', pick(m => edge(m) && E.distOf(E.mFrom(m), me) >= N - 2));
  return out;
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
  try { S.f = facts(posAt(cur).pos.clone(), cur); } catch (e) { S.f = { n: cur, legal: [], pc: [0, 0], lead: [99, 99], home: [0, 0], must: [], near: [], stage: 'mid' }; }
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
  if (f.goal != null) add('tp.goal', 100, { sq: SQN(f.goal) }, 1);
  if (f.must.length > 1) add('tp.two', 98, {}, 1); else if (f.must.length) add('tp.must', 97, { sq: SQN(f.must[0]) }, 1);
  if (f.oppRun != null) add('tp.oppRun', 90, { sq: SQN(f.oppRun), d: E.distOf(f.oppRun, 3 - f.us) }, 1);
  if (f.run != null) add('tp.run', 88, { sq: SQN(f.run), d: E.distOf(f.run, f.us) }, 1);
  if (f.near.length) add('tp.near', 84, { sq: SQN(f.near[0]) }, 1);
  if (f.free != null) add('tp.free', 76, { sq: SQN(f.free) });
  if (f.hang != null) add('tp.hang', 74, { sq: SQN(f.hang) });
  if (f.stage === 'end') { add('tp.tempo', 64); add('tp.race', 60); }
  if (f.stage === 'open') { add('tp.home', 66); add('tp.centre', 62); }
  if (w != null) { if (w >= .8) add('tp.winning', 46); else if (w <= .25) add('tp.losing', 46); }
  if (cl && cl.branch) add('tp.branch', 58);
  if (cl && cl.sharp) add('tp.sharp', 56, { x: cl.sharp });
  add('tp.single', f.stage === 'end' ? 30 : 44);
  add('tp.phalanx', 40);
  if (f.stage !== 'open') add('tp.home', 34);
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
      const k = classify(pos.clone(), best.m, ff, best.v);
      body = esc(tx(q === 'good' ? 'prevAltOk' : 'prevAlt', { m: E.name(pos, best.m), c: tx('c.' + k.k) }));
      if (q === 'dubious' || q === 'bad') {
        const after = pos.clone().play(m);
        body += '<br>' + esc(tx(hangs(after, E.mTo(m), pos.turn) ? 'lp.hang' : k.k === 'stop' ? 'lp.stop' : 'lp.gen'));
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
  if (BtCoach.sw) BtCoach.sw.sync();
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
  if (!myTurn()) { S.items = null; h += `<p class="ck-muted">${esc(tx('oppTurn'))}</p>` + verdictHtml(); return put(h); }
  const pos = posAt(cur).pos.clone(), list = listAt(cur);
  let bv = null; if (list && list.length) { bv = -Infinity; for (const e of list) bv = Math.max(bv, e.v); }
  const w = bv != null ? wr(bv) : null;
  const chips = [];
  if (w != null && settings.eval) chips.push({ k: tx('form'), v: esc(tx('f.' + formOf(w)) + ' ' + pctS(w)), cls: w >= .54 ? 'pos' : w <= .46 ? 'neg' : '' });
  chips.push({ k: tx('pcs'), v: esc(tx('pc.v', { a: f.pc[0], b: f.pc[1] })), cls: f.pc[0] > f.pc[1] ? 'pos' : f.pc[0] < f.pc[1] ? 'neg' : '' });
  chips.push({ k: tx('lead'), v: esc(tx('ld.v', { a: f.lead[0], b: f.lead[1] })), cls: f.lead[0] < f.lead[1] ? 'pos' : f.lead[0] > f.lead[1] ? 'neg' : '' });
  chips.push({ k: tx('home'), v: esc(tx('hm.v', { a: f.home[0], b: f.home[1] })) });
  h += CoachKit.summary(chips);
  let cl = null;
  if (f.stage === 'open' && !f.must.length) {
    const items = openItems(pos, list);
    S.items = items.map(x => x.m);
    cl = candInfo(list, f, pos);
    if (cl && cl.best) h += CoachKit.rec(tx('b.' + cl.best.k.k), gl(esc(tx('recWhy', { c: tx('c.' + cl.best.k.k), f: tx('f.' + formOf(wr(cl.best.v))), p: Math.round(wr(cl.best.v) * 100) }))), RCLS[cl.best.k.k] || '');
    if (items.length) h += CoachKit.branches({ head: tx('opH'), intro: gl(esc(tx('opIntro'))), reveal: true, items });
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
  for (const m of L) if (legal.includes(m)) svgArrow(svg, E.path(pos, m), 'ck');
}
function cands(key, list) { if (list && list.length) { S.lists.set(key, list); if (S.lists.size > 400) S.lists.delete(S.lists.keys().next().value); } }
function init() {
  if (!window.CoachKit) return;
  if (settings.coach === undefined) settings.coach = true;
  CoachKit.css(); CoachKit.glossBind(() => (TX[L()] || TX.en).gl);
  card = document.getElementById('coachCard');
  if (window.MutationObserver) { let k = ''; const mo = () => { const b = document.body.classList, n = ['in-lesson', 'in-puzzle', 'in-online', 'in-edit', 'in-study', 'rated-live', 'in-watch'].map(c => b.contains(c) ? 1 : 0).join(''); if (n !== k) { k = n; render(); } }; new MutationObserver(mo).observe(document.body, { attributes: true, attributeFilter: ['class'] }); }
  { const rc = document.getElementById('reviewCard'); if (rc && window.MutationObserver) new MutationObserver(() => render()).observe(rc, { attributes: true, attributeFilter: ['class'] }); }
  BtCoach.sw = CoachKit.sw({ mount: '.brand-r', get: () => !!settings.coach, set: v => setOn(v), label: on => ({ text: tx('sw'), title: tx('swT') + ' — ' + tx(on ? 'on' : 'off') }) });
}
function setOn(v) {
  settings.coach = !!v; save();
  CoachKit.flash(tx(v ? 'on' : 'off'));
  S.hov = null; render(); renderFx();
  if (v && !listAt(cur)) analyzeCurrent(busyToken);
}
function relabel() { if (BtCoach.sw) BtCoach.sw.sync(); S.key = ''; render(); }
function merge(more) { for (const l in more) TX[l] = Object.assign({}, TX[l] || {}, more[l], { gl: Object.assign({}, (TX[l] || {}).gl || {}, more[l].gl || {}) }); }
window.BtCoach = { init, render, relabel, merge, tx, TX, active, usable, cands, fx, facts, classify, isRunner };
})();
