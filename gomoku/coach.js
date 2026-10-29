'use strict';
// 五目並べ・連珠コーチ (common spec: shared/COACH.md, model: shogi/coach.js) — shown while the player is to move against the AI
// (and in local two-player games): the position at a glance (形勢・珠型・双方の形), the recommended plan with its reason,
// the candidate directions (分かれ道: each candidate's plan explained — which line / stones it works on; the point itself is
// revealed on demand and marked on the board), prioritized "how to think" tips read from the position (五・四・四三・三々・
// 禁手・四追い …), and the verdict on the previous move (◎○△✕ with the AI's first choice and the reason).
// Opening: the first three moves are taught from opening theory (天元 → 直接打ち／間接打ち → 珠型, evaluations as published
// for the old RIF rule) and later moves from the opening study lines of openings.json (研究手順), not from raw evaluations.
// Texts: TX[lang] (en fallback); the other languages live in coach-i18n.js (GomokuCoach.merge).
// app.js: GomokuCoach.render() after every renderInfo(); GomokuCoach.fx() at the end of renderFx(); the candidate list is the
// analysis list of analyzeCurrent() (anaCache / anaLast).
(() => {
const TX = {
ja: {
  head: 'コーチ', sw: 'コーチ', swT: 'コーチ（考え方の解説）のオン／オフ', on: 'コーチ ON', off: 'コーチ OFF',
  offNote: 'コーチ機能はオフになっています。右上のスイッチをオンにすると、局面の考え方や候補手の解説が表示されます。',
  oppTurn: '相手の手番です。相手が次にどこに打つか予想してみよう。相手の三や四の狙いを先に読めると、守りが楽になります。', over: '対局が終わりました。棋譜の［解析］で一局を振り返れます。', overRv: '対局が終わりました。分析すると、この欄に一手ごとの振り返り（最善手・悪手とその理由）が表示されます。', viewing: '過去の局面を表示中です。最新の局面に戻るとコーチが再開します。',
  calc: '候補手を考えています…', form: '形勢', you: 'あなた',
  'st.open': '序盤', 'st.mid': '中盤', 'st.end': '終盤',
  'f.win': '勝勢', 'f.big': '優勢', 'f.adv': '有利', 'f.sl': 'やや有利', 'f.even': '互角', 'f.sld': 'やや不利', 'f.dis': '不利', 'f.bad': '劣勢', 'f.lost': '敗勢',
  recWhy: 'この局面の第一候補は「{c}」の方針です。形勢は{f}（勝率{p}%）。',
  recSharp: '2番目の候補との差が大きく（勝率で{x}）、ここは正確に打ちたい局面です。',
  recBranch: '候補どうしの差が小さい分かれ道です。下の候補から好きな方針を選べます。',
  recOnly: 'ほかの手は大きく損をします。迷わず打ちたい局面です。',
  brH: '分かれ道 — 選べる方針', brIntro: 'どれを選んでも大差はありません。自分の得意な方針で打つのが上達の近道です。',
  cdH: '候補手と方針', cdIntro: '上位の候補を、方針ごとに解説します。',
  show: '手を見る', hide: '手を隠す',
  'gap.best': '最善', 'gap.eq': 'ほぼ同じ', 'gap.lt': '少し劣る', 'gap.bad': '劣る',
  // opening
  opH: '序盤の分かれ道 — 打ち方の選び方', opIntro: '連珠の序盤は、最初の3手の形（珠型）で戦いの性格が決まります。まずは定番を覚え、慣れたら変わり種も試してみよう。', op3Intro: '黒の3手目で珠型（最初の3手の形、全26種）が決まります。研究で黒の必勝とされる珠型（旧RIF規定での評価）から選ぶのが定番です。', 'op.main': '定番', 'op.alt': '変わり種',
  'op.center.t': '天元（中央）に打つ', 'op.center.x': '初手は盤の中央（天元）に打つのが基本です。中央からはどの方向にも石を伸ばせます（連珠のルールでは、黒の初手は天元と決まっています）。',
  'op.direct.t': '黒石の縦か横に打つ（直接打ち）', 'op.direct.x': '白の2手目を黒の初手の縦・横に接して打つのが直接打ち。このあと黒の3手目で、花月・寒星など13種類の珠型に分かれます。',
  'op.indirect.t': '黒石の斜めに打つ（間接打ち）', 'op.indirect.x': '白の2手目を黒の初手の斜めに接して打つのが間接打ち。このあと黒の3手目で、浦月・恒星など13種類の珠型に分かれます。',
  'op.jt': '珠型「{n}」にする',
  bkH: '研究手順 — 定石の候補', bkIntro: 'この局面は、この珠型の研究手順（定石）の中にあります。序盤は評価値の小さな差より、研究された手順どおりに打つことが大切です。', 'bk.tag': '定石', 'bk.alt': '研究手', bkWhy: '珠型「{n}」の研究手順では、ここは {m}（{c}）が定石です。', prevBook: '珠型「{n}」の研究手順どおりの手です。',
  jugata: '珠型', moyo: '{n}模様', 'dir.d': '直接打ち', 'dir.i': '間接打ち',
  shapeH: '形', meC: 'あなた', opC: '相手', who: '{k}（{w}）',
  'sh.four': '四あり（次に五）', 'sh.win': '勝ち筋あり（四三・達四の点）', 'sh.three': '三を作れる点 {n}', 'sh.none': 'まだ攻め筋なし',
  // lines and stones
  d0: '横', d1: '縦', d2: '斜め（／）', d3: '斜め（＼）', st1: '{a}の石', stN: '{a}〜{b}の石',
  'tt.five': '{d}の{s}を五にする', 'tt.win': '{d}の{s}から四三・達四を作る', 'tt.block4': '相手の{d}の四（{s}）を止める', 'tt.blockwin': '相手の{d}の三（{s}）を止める',
  'tt.counter': '相手の{d}の{s}を止めつつ攻める', 'tt.four': '{d}の{s}を四にする', 'tt.three': '{d}の{s}を三にする', 'tt.block3': '相手の{d}の{s}を先に止める',
  'tt.build': '{d}の{s}を伸ばす', 'tt.shape': '{s}の近くに打つ', 'tt.shape0': '新しい場所に打つ',
  // categories: tag / badge / explanation
  'c.five': '五連', 'b.five': '五を作る', 'x.five': '五を完成させて勝ちです。',
  'c.win': '勝ち筋', 'b.win': '勝ちを決める', 'x.win': '四三（四と三を同時に作る手）や達四（両端が空いた四）を作る方針。相手は一手で両方を止められないので、勝ちが決まります。',
  'c.block4': '四止め', 'b.block4': '四を止める', 'x.block4': '相手の四を止める手です。四を止める点は1つしかなく、止めなければ次に五を作られて負けます。',
  'c.blockwin': '三止め', 'b.blockwin': '三を止める', 'x.blockwin': '相手の三（または四三の点）を止める方針。放っておくと達四や四三を作られて防げなくなります。止める場所（両端か間か）で、その後の形が変わります。',
  'c.counter': 'ノリ手', 'b.counter': '止めながら攻める', 'x.counter': '相手の筋を止めながら、自分の三や四も作る方針（ノリ手）。守りと同時に先手が取れる、理想的な防ぎ方です。',
  'c.four': '四で先手', 'b.four': '四を作る', 'x.four': '四を作る方針。相手は必ず止めなければならないので、先手を保ったまま形を変えられます。ただし四は一度使うと消えるので、四三につながるかを読んでから打とう。',
  'c.three': '三で攻める', 'b.three': '三を作る', 'x.three': '三を作る方針。放っておくと達四になるので、相手は止めるしかありません。三で先手を取りながら、自分の石を増やしていけます。',
  'c.block3': '先回りの守り', 'b.block3': '先に守る', 'x.block3': '相手の石の並びが三や四三に育つ前に、先回りして止める方針。急ぎの脅威がない局面では、相手のいちばん良い点に打つのも有力です。',
  'c.build': '形を作る', 'b.build': '二を伸ばす', 'x.build': '自分の石を並べて、次に三や四を作れる形を増やす方針。いくつもの筋が交わる点を作ると、のちの四三・三々につながります。',
  'c.shape': '布石', 'b.shape': '形を整える', 'x.shape': '急ぎの攻めも守りもない局面で、石の連携を良くする方針。自分の石の近く、相手の石の連携を邪魔する場所を選ぼう。',
  // tips
  'tp.five': '五を完成できる点があります！ 盤をよく見て探そう。',
  'tp.block4': '相手に四があります（{sq}に打たれると五）。必ず止めよう — ただし、自分が先に五を作れるなら話は別です。',
  'tp.win': '四三（または達四）を作れる点があります！ 自分の三と四の筋が交わる点を探そう。',
  'tp.33': '三を2つ同時に作れる点（三々）があります。相手は両方を同時には止められないので、強力な攻めです。',
  'tp.opWin': '相手は次に{sq}に打つと四三（または達四）を作れます。先に止めるか、四や三を打って先手を取りながら防ごう。',
  'tp.vcf': '四を作れる点が{n}か所あります。四は必ず止めてもらえるので、四を続けて（四追い）四三に持ち込めないか読んでみよう。',
  'tp.forbid': '黒の禁手点（三々・四々・長連になる点）が{n}か所あります。黒はそこに打てません。白は禁手点を利用して攻めてきます。',
  'tp.wForbid': '黒に禁手点が{n}か所あります。「白を持ったら禁手をネラエ」── 黒が止めたい点が禁手なら、黒はそこを止められません。',
  'tp.free': 'このルール（{r}）では黒（先手）が非常に有利で、理論上は黒の必勝であることが証明されています（Allis, 1993）。',
  'tp.jugata': '珠型「{n}」：{e}',
  'tp.winning': '優勢です。無理に攻めず、相手の三や四の芽を確実につみながら勝ちに近づこう。',
  'tp.losing': '劣勢です。相手の攻めを止めつつ、ノリ手（止めながら三や四になる手）で反撃のきっかけを作ろう。',
  'tp.branch': '候補手の差が小さい「分かれ道」です。攻めるか守るか、方針を先に決めてから手を選ぶのが上達のコツ。',
  'tp.sharp': '最善手と2番目の手の差が大きい局面です（勝率で{x}）。ここを正確に打てるかが勝負の分かれ目。',
  'tp.open1': '序盤は中央の近くに打ち、自分の石どうしをつなげながら、相手の石の連携を邪魔しよう。',
  'tp.open2': '黒は先に打てるぶん攻めやすく、白は守りながら反撃を狙うのが基本です。',
  'tp.mid1': '三を作ると相手は止めるしかありません。三や四で先手を取りながら、自分の形を広げていこう。',
  'tp.mid2': '「ミセ手は勝ちを生む」── 次に四三を作るぞと見せる手（ミセ手）は、相手に受けを強います。',
  'tp.end1': '相手の三を止めるときは、止めた石がそのまま自分の三や四になる手（ノリ手）を探そう。守りながら先手が取れます。',
  'tp.end2': '四を止める点は1つだけですが、三は両端か間のどこで止めるかで、その後の形が変わります。止めた後の相手の手も読もう。',
  tipsH: '考え方のヒント', more: 'ほかのヒント（{n}）', less: 'たたむ',
  prev: '前の手 {m}：{q}', prevBest: '{c}の方針で、AIの第一候補と同じ手です。', prevAlt: 'AIの第一候補は {m}（{c}）でした。', prevAltOk: 'AIの第一候補 {m}（{c}）と同じくらい良い手です。',
  sep: '・',
  gl: {
    tasshi: { m: ['達四'], t: '達四（たっし）', d: '両端が空いていて、どちらに打っても五になる四。止められないので、できた時点で勝ちが決まります。' },
    shisan: { m: ['四三'], t: '四三（しさん）', d: '一手で四と三を同時に作る形。四を止めると三が達四になるので、勝ちが決まります。黒にも白にも使える勝ちの基本形です。' },
    sansan: { m: ['三々'], t: '三々（さんさん）', d: '一手で三を2つ同時に作る形。連珠では黒の禁手で、白は使えます。' },
    shishi: { m: ['四々'], t: '四々（しし）', d: '一手で四を2つ同時に作る形。連珠では黒の禁手です。' },
    choren: { m: ['長連'], t: '長連（ちょうれん）', d: '6個以上並ぶこと。連珠では黒の禁手、白は長連でも勝ちです。' },
    kinte: { m: ['禁手'], t: '禁手（きんて）', d: '連珠で黒だけに適用される反則（三々・四々・長連）。白には禁手がありません。' },
    shioi: { m: ['四追い'], t: '四追い（しおい）', d: '四を連続して打つこと。四追いで五や四三に導いて勝つことを「四追い勝ち」と呼びます。' },
    norite: { m: ['ノリ手'], t: 'ノリ手', d: '相手の追い手を防ぐ手が、同時に自分の三や四になっている手。防ぎながら先手が取れます。' },
    misete: { m: ['ミセ手'], t: 'ミセ手', d: '次に四三を作るぞ、と示す手。相手はそれを防がなければなりません。' },
    jugata: { m: ['珠型'], t: '珠型（たまがた）', d: '連珠の最初の3手の形。直接打ち13種・間接打ち13種の全26種があり、花月・浦月などの名前がついています。' },
    direct: { m: ['直接打ち'], t: '直接打ち', d: '白の2手目を、黒の初手の縦か横に接して打つこと。' },
    indirect: { m: ['間接打ち'], t: '間接打ち', d: '白の2手目を、黒の初手の斜めに接して打つこと。' },
    tengen: { m: ['天元'], t: '天元（てんげん）', d: '盤の中央の点。連珠では黒の初手は天元に打ちます。' },
    sente: { m: ['先手'], t: '先手', d: '相手に受けを強いて、次も自分の都合で打てる状態。三や四を作ると先手が取れます。' },
  },
},
en: {
  head: 'Coach', sw: 'Coach', swT: 'Turn the coach (how-to-think tips) on / off', on: 'Coach ON', off: 'Coach OFF',
  offNote: 'The coach is switched off. Turn on the switch at the top right to see how to think about the position and the candidate moves explained.',
  oppTurn: "It's your opponent's turn. Try to guess where they will play — reading their threes and fours in advance makes defending much easier.", over: 'The game is over. Use [Analyze] in the record to review it.', overRv: 'The game is over. Analyze it to see a move-by-move review here (best moves, mistakes and why).', viewing: 'You are looking at an earlier position. The coach resumes at the latest position.',
  calc: 'Thinking about candidate moves…', form: 'Position', you: 'you',
  'st.open': 'Opening', 'st.mid': 'Middlegame', 'st.end': 'Endgame',
  'f.win': 'winning', 'f.big': 'clearly better', 'f.adv': 'better', 'f.sl': 'slightly better', 'f.even': 'equal', 'f.sld': 'slightly worse', 'f.dis': 'worse', 'f.bad': 'clearly worse', 'f.lost': 'losing',
  recWhy: 'The first choice here is the "{c}" plan. Your position: {f} (win chance {p}%).',
  recSharp: 'The gap to the second choice is large ({x} in win chance) — a moment to play precisely.',
  recBranch: 'The candidates are close: a branching position. Pick the plan you like from the list below.',
  recOnly: 'Every other move loses a lot here — play it without hesitating.',
  brH: 'Branching point — plans to choose from', brIntro: 'None of these is much worse than the others. Playing the plan that suits you is the fastest way to improve.',
  cdH: 'Candidates and their plans', cdIntro: 'The top candidates, explained plan by plan.',
  show: 'Show moves', hide: 'Hide moves',
  'gap.best': 'best', 'gap.eq': 'about equal', 'gap.lt': 'a bit worse', 'gap.bad': 'worse',
  opH: 'Opening crossroads — how to start', opIntro: 'In renju the shape of the first three stones (the opening pattern) sets the character of the game. Learn the standard choices first, then try the unusual ones.', op3Intro: "Black's third stone decides the opening pattern (26 in all). The standard choice is one of the patterns known from analysis to be a win for Black (evaluations under the old RIF rule).", 'op.main': 'Standard', 'op.alt': 'Unusual',
  'op.center.t': 'Play in the centre', 'op.center.x': 'The first stone normally goes in the centre of the board, where lines can grow in every direction (under renju rules Black\'s first move must be the centre).',
  'op.direct.t': 'Next to the black stone, straight (direct)', 'op.direct.x': "White's second stone touching Black's first one vertically or horizontally is a direct opening. Black's third stone then chooses one of 13 direct patterns, such as Kagetsu or Kansei.",
  'op.indirect.t': 'Next to the black stone, diagonally (indirect)', 'op.indirect.x': "White's second stone touching Black's first one diagonally is an indirect opening. Black's third stone then chooses one of 13 indirect patterns, such as Hogetsu or Kosei.",
  'op.jt': 'Go for the {n} opening',
  bkH: 'Study line — book moves', bkIntro: 'This position is part of the study line of this opening pattern. In the opening, following the studied line matters more than small evaluation differences.', 'bk.tag': 'Book', 'bk.alt': 'Studied', bkWhy: 'In the study line of {n}, the book move here is {m} ({c}).', prevBook: 'A book move from the study line of {n}.',
  jugata: 'Opening', moyo: 'heading for {n}', 'dir.d': 'direct opening', 'dir.i': 'indirect opening',
  shapeH: 'Shape', meC: 'you', opC: 'opponent', who: '{k} ({w})',
  'sh.four': 'has a four (five next)', 'sh.win': 'has a winning point (4-3 / straight four)', 'sh.three': '{n} points make a three', 'sh.none': 'no attack yet',
  d0: 'horizontal', d1: 'vertical', d2: 'diagonal (/)', d3: 'diagonal (\\)', st1: 'the stone on {a}', stN: 'the stones {a}–{b}',
  'tt.five': 'Turn the {d} line of {s} into five', 'tt.win': 'Make a four-three / straight four from the {d} line of {s}', 'tt.block4': "Block the opponent's {d} four ({s})", 'tt.blockwin': "Block the opponent's {d} three ({s})",
  'tt.counter': "Block the opponent's {d} line ({s}) and attack", 'tt.four': 'Make a four from the {d} line of {s}', 'tt.three': 'Make a three from the {d} line of {s}', 'tt.block3': "Cut the opponent's {d} line ({s}) early",
  'tt.build': 'Extend the {d} line of {s}', 'tt.shape': 'Play near {s}', 'tt.shape0': 'Play in a new area',
  'c.five': 'Five', 'b.five': 'Make five', 'x.five': 'Complete five in a row — that wins.',
  'c.win': 'Winning line', 'b.win': 'Decide the game', 'x.win': 'Make a four-three (a four and a three at once) or a straight four (a four open at both ends). The opponent cannot stop both, so the game is decided.',
  'c.block4': 'Block the four', 'b.block4': 'Block the four', 'x.block4': "Block the opponent's four. There is only one point that stops it — if you don't, they make five next move.",
  'c.blockwin': 'Block the three', 'b.blockwin': 'Block the three', 'x.blockwin': "Block the opponent's three (or their four-three point). Left alone it becomes a straight four or a four-three you can't stop. Where you block (either end or the gap) changes the shape that follows.",
  'c.counter': 'Counter-block', 'b.counter': 'Block and attack', 'x.counter': "Block the opponent's line while making a three or four of your own. You defend and take the initiative at the same time — the ideal kind of defence.",
  'c.four': 'Four (forcing)', 'b.four': 'Make a four', 'x.four': 'Make a four: the opponent must block it, so you keep the initiative while changing the shape. But a four is used up once played — read whether it leads to a four-three first.',
  'c.three': 'Attack with a three', 'b.three': 'Make a three', 'x.three': 'Make a three: left alone it becomes a straight four, so the opponent has to block. Threes let you add stones while keeping the initiative.',
  'c.block3': 'Early defence', 'b.block3': 'Defend early', 'x.block3': "Cut the opponent's line before it grows into a three or a four-three. When nothing is urgent, playing on the opponent's best point is often strong.",
  'c.build': 'Build shape', 'b.build': 'Extend a two', 'x.build': 'Line up your stones so you have more ways to make threes and fours next. Points where several of your lines cross lead to four-threes later.',
  'c.shape': 'Development', 'b.shape': 'Improve the shape', 'x.shape': 'Nothing urgent in attack or defence: improve how your stones work together. Choose points near your stones that also disturb the opponent\'s connections.',
  'tp.five': 'You can complete five! Look carefully.',
  'tp.block4': 'The opponent has a four (five on {sq}). Block it — unless you can make five first.',
  'tp.win': 'There is a point that makes a four-three (or a straight four)! Look for where your threes and fours cross.',
  'tp.33': 'There is a point that makes two threes at once (double three). The opponent cannot block both — a powerful attack.',
  'tp.opWin': 'Next move the opponent can make a four-three (or straight four) on {sq}. Block it first, or defend while taking the initiative with a four or three.',
  'tp.vcf': 'You can make a four on {n} points. Fours must be blocked, so read whether a series of fours (VCF) leads to a four-three.',
  'tp.forbid': 'Black has {n} forbidden points (they would make a double three, double four or overline). Black cannot play there — and White will use them in the attack.',
  'tp.wForbid': 'Black has {n} forbidden points. "With White, aim at the forbidden points": if the point Black needs to block is forbidden, Black cannot block there.',
  'tp.free': 'Under this rule ({r}) Black, who moves first, has a big advantage — it has been proven to be a win for Black (Allis, 1993).',
  'tp.jugata': 'Opening {n}: {e}',
  'tp.winning': "You are ahead. No need to force things: stop the opponent's threes and fours early and close in safely.",
  'tp.losing': 'You are behind. Stop the attack while looking for counter-blocks (blocks that also make your three or four) to turn the game.',
  'tp.branch': 'The candidates are close — a branching point. Decide your plan first (attack or defend), then pick the move.',
  'tp.sharp': 'The best move is much better than the second ({x} in win chance). Finding it may decide the game.',
  'tp.open1': "In the opening play near the centre, connect your stones and disturb the opponent's connections.",
  'tp.open2': 'Black moves first and attacks more easily; White usually defends while waiting for a chance to counter-attack.',
  'tp.mid1': 'A three forces the opponent to block. Use threes and fours to keep the initiative while you spread your shape.',
  'tp.mid2': 'A move that shows the opponent you will make a four-three next forces them to respond — threats like this create wins.',
  'tp.end1': "When you block a three, look for a counter-block: a blocking stone that also makes your own three or four. You defend and take the initiative.",
  'tp.end2': 'A four has only one blocking point, but a three can be blocked at either end or in the gap — and the choice changes what follows. Read the opponent\'s reply too.',
  tipsH: 'How to think', more: 'More tips ({n})', less: 'Show less',
  prev: 'Previous move {m}: {q}', prevBest: 'A "{c}" move — the same as the AI\'s first choice.', prevAlt: "The AI's first choice was {m} ({c}).", prevAltOk: "About as good as the AI's first choice, {m} ({c}).",
  sep: ', ',
  gl: {
    tasshi: { m: ['straight four'], t: 'Straight four', d: 'A four open at both ends: whichever end the opponent blocks, the other makes five. It wins as soon as it is made.' },
    shisan: { m: ['four-three'], t: 'Four-three', d: 'A move that makes a four and a three at once. Blocking the four lets the three become a straight four, so it wins. The basic winning shape for both colours.' },
    sansan: { m: ['double three'], t: 'Double three', d: 'A move that makes two threes at once. Forbidden for Black in renju; White may use it.' },
    shishi: { m: ['double four'], t: 'Double four', d: 'A move that makes two fours at once. Forbidden for Black in renju.' },
    choren: { m: ['overline'], t: 'Overline', d: 'Six or more in a row. Forbidden for Black in renju; for White it still wins.' },
    kinte: { m: ['forbidden points', 'forbidden'], t: 'Forbidden moves', d: 'In renju only Black has forbidden moves: double three, double four and overline. White has none.' },
    shioi: { m: ['VCF', 'series of fours'], t: 'VCF (victory by continuous fours)', d: 'Playing four after four — each one must be blocked — until a five or a four-three wins.' },
    norite: { m: ['counter-blocks', 'counter-block'], t: 'Counter-block', d: "A block against the opponent's threat that also makes your own three or four, so you defend and take the initiative together." },
    jugata: { m: ['opening pattern', 'patterns'], t: 'Opening pattern', d: 'The shape of the first three stones in renju: 13 direct and 13 indirect patterns, 26 in all, each with a name (Kagetsu, Hogetsu …).' },
    direct: { m: ['direct opening', 'direct'], t: 'Direct opening', d: "White's second stone placed vertically or horizontally next to Black's first stone." },
    indirect: { m: ['indirect opening', 'indirect'], t: 'Indirect opening', d: "White's second stone placed diagonally next to Black's first stone." },
    initiative: { m: ['initiative'], t: 'Initiative', d: 'Making threats the opponent must answer, so you keep choosing where the game goes. Threes and fours give you the initiative.' },
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
const RE = window.RenjuEngine, C = RE.C, PS = 20, DIRS = [1, PS, PS + 1, PS - 1];
const wrOf = v => 0.5 + 0.5 * sOfV(v);
const pctS = x => Math.round(x * 100) + '%';
function formOf(w) { return w >= .9 ? 'win' : w >= .75 ? 'big' : w >= .62 ? 'adv' : w >= .54 ? 'sl' : w > .46 ? 'even' : w > .38 ? 'sld' : w > .25 ? 'dis' : w > .1 ? 'bad' : 'lost'; }

// --------------------------------------------------------------------------------------------- position facts
const okFor = (pos, m, c) => !(c === P1 && pos.renju && pos.forbidden(m));
// the line of colour c through empty cell m that a stone there would improve most: direction and the stones of c on it
function lineOf(pos, m, c) {
  const i = RE.M2I[m], pk = pos.pat[c][i];
  let bd = 0, bv = -1;
  for (let d = 0; d < 4; d++) { const v = (pk >> (4 * d)) & 15; if (v > bv) { bv = v; bd = d; } }
  const D = DIRS[bd], st = [];
  for (const s of [-1, 1]) { let q = i; for (let k = 1; k <= 4; k++) { q += s * D; const x = pos.b[q]; if (x === c) st.push(RE.I2M[q]); else if (x !== 0) break; } }
  st.sort((a, b) => (a % 15) - (b % 15) || a - b);
  return { d: bd, st };
}
function stLabel(st) {
  if (!st.length) return '';
  return st.length === 1 ? tx('st1', { a: sqName(st[0]) }) : tx('stN', { a: sqName(st[0]), b: sqName(st[st.length - 1]) });
}
function nearest(pos, m, c) {
  let best = -1, bd = 99;
  for (let q = 0; q < 225; q++) if (pos.at(q) === c) { const d = Math.max(Math.abs(q % 15 - m % 15), Math.abs(((q / 15) | 0) - ((m / 15) | 0))); if (d < bd) { bd = d; best = q; } }
  return bd <= 3 ? best : -1;
}
function shapeOf(pos, c) {
  const k = pos.cls[c], r = { five: -1, win: -1, three: 0, four: 0, s33: -1 };
  for (let m = 0; m < 225; m++) {
    const i = RE.M2I[m]; if (pos.b[i] !== 0) continue;
    const x = k[i];
    if (x === C.FIVE) { r.five = m; continue; }
    if (!okFor(pos, m, c)) continue;
    if ((x === C.F4 || x === C.F43) && r.win < 0) r.win = m;
    else if (x === C.F33 && r.s33 < 0) r.s33 = m;
    if (x === C.B4 || x === C.F43) r.four++;
    if (x >= C.F3) r.three++;
  }
  return r;
}
function facts() {
  const pos = posAt(cur), me = pos.side, op = 3 - me, f = { me, op, n: cur };
  f.sMe = shapeOf(pos, me); f.sOp = shapeOf(pos, op);
  f.renju = pos.renju;
  f.forb = pos.renju ? pos.forbiddenList().length : 0;
  const hot = f.sMe.five >= 0 || f.sOp.five >= 0 || f.sMe.win >= 0 || f.sOp.win >= 0;
  f.stage = hot || cur >= 40 ? 'end' : cur < 8 ? 'open' : 'mid';
  return f;
}
// what a candidate move is about (from the side to move)
function classify(pos, m) {
  const me = pos.side, op = 3 - me, i = RE.M2I[m], a = pos.cls[me][i], d = pos.cls[op][i];
  const mine = () => lineOf(pos, m, me), theirs = () => lineOf(pos, m, op);
  const mk = (k, ln) => ({ k, d: ln ? ln.d : -1, st: ln ? ln.st : [], m });
  if (a === C.FIVE) return mk('five', mine());
  if (d === C.FIVE) return mk('block4', theirs());
  if (a === C.F4 || a === C.F43 || (a === C.F33 && okFor(pos, m, me))) return mk('win', mine());
  if (d === C.F4 || d === C.F43) return mk(a === C.B4 || a === C.F3 ? 'counter' : 'blockwin', theirs());
  if (d === C.F3 || d === C.F33) return mk(a === C.B4 || a === C.F3 ? 'counter' : 'block3', theirs());
  if (a === C.B4) return mk('four', mine());
  if (a === C.F3) return mk('three', mine());
  if (d >= C.T3 && d > a) return mk('block3', theirs());
  if (a >= C.F2) return mk('build', mine());
  const n = nearest(pos, m, me);
  return { k: 'shape', d: -1, st: n >= 0 ? [n] : [], m };
}
function ttl(k) {
  if (k.k === 'shape') return k.st.length ? tx('tt.shape', { s: stLabel(k.st) }) : tx('tt.shape0');
  if (!k.st.length) return tx('b.' + k.k);
  return tx('tt.' + k.k, { d: tx('d' + k.d), s: stLabel(k.st) });
}
const CCLS = { five: 'c-mate', win: 'c-mate', block4: 'c-def', blockwin: 'c-def', block3: 'c-def', counter: 'c-atk', four: 'c-atk', three: 'c-atk', build: 'c-dev', shape: 'c-calm' };
const RCLS = { five: 'r-mate', win: 'r-mate', block4: 'r-def', blockwin: 'r-def', block3: 'r-def' };

// --------------------------------------------------------------------------------------------- opening theory / opening book
const CENTER = RE.CENTER;
const setById = id => OPEN && OPEN.sets.find(s => s.id === id);
// the 珠型 of this game (renju from the empty board, first three moves) and the symmetry that maps it onto the board
function jugataOf() {
  if (startPos || rule !== 'renju' || !OPEN || moves.length < 3 || moves[0] !== CENTER) return null;
  for (const g of OPEN.sets) {
    const ln = g.line.split(' ').map(sqOf);
    for (let k = 0; k < 8; k++) if (RE.sym(ln[1], k) === moves[1] && RE.sym(ln[2], k) === moves[2]) return { g, k };
  }
  return null;
}
// book moves at ply `ply` (>= 3): the study line of the 珠型 (and the studied candidates of a matching position)
function bookAt(ply) {
  if (ply < 3 || ply > 22) return null;
  const J = jugataOf(); if (!J) return null;
  const { g } = J;
  for (let k = 0; k < 8; k++) {
    const map = x => RE.sym(sqOf(x), k);
    let ok = true;
    for (let j = 0; j < 3; j++) if (map(g.study[j][0]) !== moves[j]) { ok = false; break; }
    if (!ok) continue;
    const pos = posAt(ply), side = pos.side;
    // a studied position: its candidates with their evaluations (black's view)
    const bs = new Set(), ws = new Set();
    for (let j = 0; j < ply; j++) (j % 2 ? ws : bs).add(moves[j]);
    for (const P of g.problems || []) {
      if (P.side !== side) continue;
      const pb = P.b.split(' ').map(map), pw = P.w.split(' ').map(map);
      if (pb.length !== bs.size || pw.length !== ws.size || !pb.every(x => bs.has(x)) || !pw.every(x => ws.has(x))) continue;
      const list = P.sc.map(([c, v]) => ({ m: map(c), v: side === P1 ? v : -v })).filter(x => pos.isLegal(x.m)).sort((a, b) => b.v - a.v);
      if (list.length) return { g, list, prob: true };
    }
    let same = ply < g.study.length;
    for (let j = 3; same && j < ply; j++) if (map(g.study[j][0]) !== moves[j]) same = false;
    if (same) { const m = map(g.study[ply][0]); if (pos.isLegal(m)) return { g, list: [{ m, v: null }], prob: false }; }
  }
  return null;
}
// the first three moves: centre → direct / indirect → 珠型 (shown with their moves: they are knowledge, not a hint)
const OP3 = { d: [['kagetsu', 'main'], ['kansei', 'main'], ['zuisei', 'alt']], i: [['hogetsu', 'main'], ['kosei', 'main'], ['shagetsu', 'alt']] };
function openingOf() {
  if (startPos || cur > 2 || cur !== moves.length) return null;
  if (cur === 0) return { intro: 'opIntro', items: [{ m: CENTER, kind: 'main', t: tx('op.center.t'), x: tx('op.center.x') }] };
  if (moves[0] !== CENTER) return null;
  const w = moves[1];
  if (cur === 1) return { intro: 'opIntro', items: [{ m: CENTER + 15, kind: 'main', t: tx('op.direct.t'), x: tx('op.direct.x') }, { m: CENTER + 16, kind: 'main', t: tx('op.indirect.t'), x: tx('op.indirect.x') }] };
  if (rule !== 'renju' || !OPEN) return null;
  const dx = Math.abs(w % 15 - 7), dy = Math.abs(((w / 15) | 0) - 7); if (Math.max(dx, dy) !== 1) return null;
  const items = [];
  for (const [id, kind] of OP3[dx && dy ? 'i' : 'd']) {
    const g = setById(id); if (!g) continue;
    const ln = g.line.split(' ').map(sqOf);
    let m = -1; for (let k = 0; k < 8 && m < 0; k++) if (RE.sym(ln[1], k) === w) m = RE.sym(ln[2], k);
    if (m < 0) continue;
    items.push({ m, kind, t: tx('op.jt', { n: opName(g) }), x: t('op.ev.' + g.ev), gap: t('ev.' + g.ev + 'x'), gcls: g.ev === 'bw' || g.ev === 'ba' ? 'g0' : 'g1' });
  }
  return { intro: 'op3Intro', items };
}

// --------------------------------------------------------------------------------------------- state / rendering
const S = { open: false, reveal: false, key: '', f: null, cls: null, op: null, hov: -1 };
let card = null;
function usable() {
  return !!(!lesson && !puzzle && !net && !rgame && (settings.mode === 'ai' || settings.mode === 'pvp') && !(ken && kenOk()));
}
function active() { return !!(settings.coach && usable()); }
function myTurnAt(i) { return !statusAt(i).over && (settings.mode === 'pvp' || toMoveAt(i) === humanColor); }
function myTurn() { return cur === moves.length && !reviewing && myTurnAt(cur); }
function wants(i) { return active() && i === moves.length && myTurnAt(i); }
function listAt(i) { const k = keyOf(i); return anaCache.get(k) || (anaLast && anaLast.key === k ? anaLast.list : null); }
function factsNow() {
  const key = keyOf(cur) + '|' + LANG;
  if (S.key === key && S.f) return S.f;
  S.key = key; S.cls = null;
  try { S.f = facts(); } catch (e) { S.f = { n: cur, stage: 'mid', sMe: {}, sOp: {} }; }
  return S.f;
}
function candInfo(list) {
  if (!list || !list.length) return null;
  if (S.cls && S.cls.list === list) return S.cls;
  const L0 = list.slice().sort((a, b) => b.v - a.v), pos = posAt(cur);
  const wb = wrOf(L0[0].v), items = [];
  for (const c of L0.slice(0, 5)) {
    if (!pos.isLegal(c.m)) continue;
    let k; try { k = classify(pos, c.m); } catch (e) { k = { k: 'shape', st: [], m: c.m }; }
    items.push({ m: c.m, k, v: c.v, drop: Math.max(0, wb - wrOf(c.v)) });
  }
  const seen = new Set(), dirs = [];
  for (const it of items) { const sig = it.k.k + '|' + it.k.d + '|' + it.k.st.join(','); if (seen.has(sig) && dirs.length) continue; seen.add(sig); dirs.push(it); if (dirs.length >= 3) break; }
  const close = dirs.filter(d => d.drop <= 0.05), second = items[1] ? items[1].drop : null, decided = Math.abs(L0[0].v) > WINT;
  const r = { list, items, dirs, best: items[0], branch: close.length >= 2 && !decided, sharp: second != null && second >= 0.12 && !decided ? pctS(second) : '', only: second != null && second >= 0.25 };
  S.cls = r; return r;
}
function gapOf(d, i) { return i === 0 ? ['gap.best', 'g0'] : d <= 0.05 ? ['gap.eq', 'g1'] : d <= 0.12 ? ['gap.lt', 'g2'] : ['gap.bad', 'g3']; }
function tipsOf(f, wr, cl) {
  const out = [], add = (k, pr, v, hi) => out.push({ k, pr, v, hi });
  const a = f.sMe, o = f.sOp;
  if (a.five >= 0) add('tp.five', 100, null, 1);
  if (o.five >= 0) add('tp.block4', 98, { sq: sqName(o.five) }, 1);
  if (a.win >= 0 && a.five < 0) add('tp.win', 94, null, 1);
  if (a.s33 >= 0 && a.win < 0 && a.five < 0) add('tp.33', 88, null, 1);
  if (o.win >= 0 && o.five < 0) add('tp.opWin', 90, { sq: sqName(o.win) }, 1);
  if (a.four && a.five < 0 && a.win < 0 && f.stage !== 'open') add('tp.vcf', 70, { n: a.four });
  if (f.forb && f.me === P1) add('tp.forbid', 62, { n: f.forb });
  if (f.forb && f.me === P2) add('tp.wForbid', 58, { n: f.forb });
  const J = f.n >= 3 && f.n < 14 ? jugataOf() : null;
  if (J) add('tp.jugata', 54, { n: opName(J.g), e: t('op.ev.' + J.g.ev) });
  if (rule !== 'renju' && f.stage === 'open') add('tp.free', 50, { r: t('rule.' + rule) });
  if (wr != null) { if (wr >= .8) add('tp.winning', 48); else if (wr <= .25) add('tp.losing', 48); }
  if (cl && cl.branch) add('tp.branch', 57);
  if (cl && cl.sharp) add('tp.sharp', 56, { x: cl.sharp });
  if (f.stage === 'open') { add('tp.open1', 22); add('tp.open2', 18); }
  else if (f.stage === 'mid') { add('tp.mid1', 20); add('tp.mid2', 16); }
  else { add('tp.end1', 26); add('tp.end2', 18); }
  return out.sort((x, y) => y.pr - x.pr);
}
// the previous move of the player (pvp: the last move), graded from the analysis of the position before it
function lastMineIdx() {
  for (let i = moves.length - 1; i >= 0 && i >= moves.length - 2; i--) if (settings.mode === 'pvp' || toMoveAt(i) === humanColor) return i;
  return -1;
}
function verdictHtml() {
  const i = lastMineIdx(); if (i < 0) return '';
  const m = moves[i], mv = `${i + 1}. ${sqName(m)}`;
  const bk = bookAt(i);
  if (bk) {
    const hit = bk.list.find(x => x.m === m), top = bk.list[0];
    if (hit && (hit.v == null || top.v == null || wrOf(top.v) - wrOf(hit.v) <= 0.05)) return CoachKit.verdict(hit === top ? 0 : 1, esc(tx('prev', { m: mv, q: t('cq.' + (hit === top ? 'best' : 'good')) })), gl(esc(tx('prevBook', { n: opName(bk.g) }))));
  }
  if (i < 3 && !startPos) return '';   // the first three moves are opening theory, not graded
  const list = listAt(i); if (!list || !list.length) return '';
  let best = list[0]; for (const e of list) if (e.v > best.v) best = e;
  let mine = list.find(e => e.m === m);
  if (!mine) { const nx = listAt(i + 1); if (!nx || !nx.length) return ''; let b2 = -Infinity; for (const e of nx) b2 = Math.max(b2, e.v); mine = { m, v: -b2 }; }
  const cq = settings.mode === 'ai' && coachQ.get(i), q = cq && cq.m === m ? cq.q : gradeVals(best, mine, m);
  const g = { best: 0, good: 1, dubious: 2, bad: 3 }[q];
  let body = '';
  try {
    const pos = posAt(i), kb = classify(pos, best.m);
    if (best.m === m) body = esc(tx('prevBest', { c: tx('c.' + kb.k) }));
    else body = esc(tx(q === 'best' || q === 'good' ? 'prevAltOk' : 'prevAlt', { m: sqName(best.m), c: tx('c.' + kb.k) }));
    if ((q === 'dubious' || q === 'bad') && typeof plainWhy === 'function') body += '<br>💡 ' + plainWhy(i, { best: best.m, m, bv: best.v, mv: mine.v });
  } catch (e) {}
  return CoachKit.verdict(g, esc(tx('prev', { m: mv, q: t('cq.' + q) })), gl(body));
}
function render() {
  if (!card) return;
  if (GomokuCoach.sw) GomokuCoach.sw.sync();
  // the coach is for the game in progress: after the game (or while browsing earlier moves) it steps aside and the
  // coach tab shows the review instead; before the review exists, a short note with a button to start it
  const rv = !!document.querySelector('#reviewCard.show'), over = statusAt(moves.length).over;
  const playing = !over && cur === moves.length && !reviewing;
  const on = active(), can = usable() && (playing || (over && !rv && moves.length > 0));
  card.classList.toggle('hidden', !can);
  card.classList.toggle('ck-off', can && !on);
  document.body.classList.toggle('ck-tab', can || rv);
  if (rv && !S.rvWas) { const b = document.querySelector('#mtabs [data-it=coach]'); if (b && getComputedStyle(b).display !== 'none' && document.body.dataset.it !== 'coach') b.click(); }
  S.rvWas = rv;
  if (!can) { S.op = null; return; }
  if (over) {
    S.op = null;
    put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('overRv'))}</p><div class="ck-sec"><button type="button" class="ck-rvgo" data-ck="rv">${esc(t('rv.btn'))}</button></div>` + (on ? verdictHtml() : ''));
    const b = card.querySelector('[data-ck=rv]'); if (b) b.onclick = () => { if (typeof runReview === 'function') runReview(); };
    return;
  }
  if (!on) { S.op = null; return put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('offNote'))}</p>`); }
  const f = factsNow();
  let h = `<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span>${!over ? `<small>${esc(tx('st.' + (f.stage || 'mid')))}</small>` : ''}</h3>`;
  S.op = null;
  if (over) { h += `<p class="ck-muted">${esc(tx('over'))}</p>` + verdictHtml(); return put(h); }
  if (cur !== moves.length || reviewing) { h += `<p class="ck-muted">${esc(tx('viewing'))}</p>`; return put(h); }
  if (!myTurn()) { h += `<p class="ck-muted">${esc(tx('oppTurn'))}</p>` + verdictHtml(); return put(h); }
  const list = listAt(cur), cl = candInfo(list);
  const wr = list && list.length ? wrOf(Math.max(...list.map(e => e.v))) : null;
  // summary chips
  const chips = [];
  if (wr != null && settings.eval) chips.push({ k: tx('form'), v: esc(tx('f.' + formOf(wr)) + ' ' + pctS(wr)), cls: wr >= .54 ? 'pos' : wr <= .46 ? 'neg' : '' });
  const J = jugataOf();
  if (J) chips.push({ k: tx('jugata'), v: esc(opName(J.g) + ' · ' + t('ev.' + J.g.ev + 'x')) });
  else if (!startPos && moves.length === 2 && moves[0] === CENTER) { const w = moves[1], dx = Math.abs(w % 15 - 7), dy = Math.abs(((w / 15) | 0) - 7); if (Math.max(dx, dy) === 1) chips.push({ k: tx('jugata'), v: esc(tx('moyo', { n: tx(dx && dy ? 'dir.i' : 'dir.d') })) }); }
  if (cur >= 3) {
    const sh = s => s.five >= 0 ? tx('sh.four') : s.win >= 0 ? tx('sh.win') : s.three ? tx('sh.three', { n: s.three }) : tx('sh.none');
    chips.push({ k: tx('who', { k: tx('shapeH'), w: tx('meC') }), v: esc(sh(f.sMe)), cls: f.sMe.five >= 0 || f.sMe.win >= 0 ? 'pos' : '' });
    chips.push({ k: tx('who', { k: tx('shapeH'), w: tx('opC') }), v: esc(sh(f.sOp)), cls: f.sOp.five >= 0 || f.sOp.win >= 0 ? 'neg' : '' });
  }
  h += CoachKit.summary(chips);
  const op = openingOf();
  if (op && op.items.length) {
    S.op = op.items.map(d => ({ m: d.m }));
    h += CoachKit.branches({ head: tx('opH'), intro: gl(esc(tx(op.intro))), reveal: true,
      items: op.items.map(d => ({ tag: tx('op.' + d.kind), cls: d.kind === 'main' ? 'c-mat' : 'c-dev', title: esc(d.t), text: gl(esc(d.x)), gap: d.gap || '', gcls: d.gcls || '', move: String(d.m), mvName: sqName(d.m) })) });
  }
  const bk = !op && bookAt(cur);
  if (bk) {
    const pos = posAt(cur), top = bk.list[0];
    const items = bk.list.slice(0, 3).filter(x => x === top || x.v == null || wrOf(top.v) - wrOf(x.v) <= 0.12).map(x => ({ m: x.m, v: x.v, k: classify(pos, x.m) }));
    S.op = items.map(d => ({ m: d.m }));
    const b = items[0];
    h += CoachKit.rec(tx('b.' + b.k.k), gl(esc(tx('bkWhy', { n: opName(bk.g), m: sqName(b.m), c: tx('c.' + b.k.k) }))), RCLS[b.k.k] || '');
    h += CoachKit.branches({ head: tx('bkH'), intro: gl(esc(tx('bkIntro'))), reveal: true,
      items: items.map((d, i) => ({ tag: tx('c.' + d.k.k), cls: CCLS[d.k.k] || '', title: esc(ttl(d.k)), text: gl(esc(tx('x.' + d.k.k))), gap: i === 0 ? tx('bk.tag') : tx('bk.alt'), gcls: i === 0 ? 'g0' : 'g1', move: String(d.m), mvName: sqName(d.m) })) });
  }
  if (!op && !bk && cl && cl.best) {
    const b = cl.best;
    let why = esc(tx('recWhy', { c: tx('c.' + b.k.k), f: tx('f.' + formOf(wrOf(b.v))), p: Math.round(wrOf(b.v) * 100) }));
    if (cl.only) why += ' ' + esc(tx('recOnly')); else if (cl.sharp) why += ' ' + esc(tx('recSharp', { x: cl.sharp })); else if (cl.branch) why += ' ' + esc(tx('recBranch'));
    h += CoachKit.rec(tx('b.' + b.k.k), gl(why), RCLS[b.k.k] || '');
    h += CoachKit.branches({ head: tx(cl.branch ? 'brH' : 'cdH'), intro: esc(tx(cl.branch ? 'brIntro' : 'cdIntro')), reveal: S.reveal, show: tx('show'), hide: tx('hide'),
      items: cl.dirs.map((d, i) => { const g = gapOf(d.drop, i); return { tag: tx('c.' + d.k.k), cls: CCLS[d.k.k] || '', title: esc(ttl(d.k)), text: gl(esc(tx('x.' + d.k.k))), gap: tx(g[0]) + (d.drop > 0.005 ? ' −' + pctS(d.drop) : ''), gcls: g[1], move: String(d.m), mvName: sqName(d.m) }; }) });
  } else if (!op && !bk) h += `<p class="ck-calc">${esc(tx('calc'))}</p>`;
  const tl = tipsOf(f, wr, cl);
  h += CoachKit.tips({ head: tx('tipsH'), list: tl.map(x => ({ html: gl(esc(tx(x.k, x.v || {}))), hi: x.hi })), open: S.open, more: tx('more', { n: Math.max(0, tl.length - 3) }), less: tx('less') });
  h += verdictHtml();
  put(h);
}
function put(h) {
  if (card.dataset.h === h) return;
  const keep = card.scrollTop; card.dataset.h = h; card.innerHTML = h; card.scrollTop = keep;
  CoachKit.bind(card, {
    onMore: () => { S.open = !S.open; render(); },
    onReveal: () => { S.reveal = !S.reveal; try { settings.coachReveal = S.reveal; save(); } catch (e) {} render(); renderFx(); },
    onHover: u => { S.hov = u == null ? -1 : +u; renderFx(); },
  });
  if (S.hov >= 0 && !card.querySelector(`.ck-bi[data-mv="${S.hov}"]`)) { S.hov = -1; renderFx(); }
  else if (S.reveal) renderFx();
}
// board marks (called at the end of renderFx): revealed candidates numbered, the hovered one as a ghost stone
function fx() {
  if (!card || !active() || !myTurn()) return;
  const pos = posAt(cur);
  const shown = S.op ? [] : S.reveal && S.cls ? S.cls.dirs.map(d => d.m) : [];
  const hinted = new Set([...fxEl.querySelectorAll('.hintlbl:not(.ck-mk)')].map(d => d.style.left + '|' + d.style.top));   // (a hint value already marks the point)
  shown.forEach((m, i) => { if (m !== S.hov && !pos.at(m) && !hinted.has(((1 + m % 15 - .5) / 16 * 100) + '%|' + ((15 - Math.floor(m / 15) - .5) / 16 * 100) + '%')) { const d = document.createElement('div'); d.className = 'hintlbl ck-mk' + (i === 0 ? ' best' : ''); placeAt(d, m); d.innerHTML = `<b>${i + 1}</b>`; fxEl.appendChild(d); } });
  if (S.hov >= 0 && !pos.at(S.hov)) { ghost(S.hov, pos.side, 'ghost'); mk('ck', S.hov); }
}
function init() {
  if (!window.CoachKit) return;
  CoachKit.css(); CoachKit.glossBind(() => (TX[L()] || TX.en).gl);
  card = document.getElementById('coachCard');
  { const rc = document.getElementById('reviewCard'); if (rc && window.MutationObserver) new MutationObserver(() => render()).observe(rc, { attributes: true, attributeFilter: ['class'] }); }
  try { S.reveal = !!settings.coachReveal; } catch (e) {}
  GomokuCoach.sw = CoachKit.sw({ mount: '.brand-r', get: () => !!settings.coach, set: v => setOn(v), label: on => ({ text: tx('sw'), title: tx('swT') + ' — ' + tx(on ? 'on' : 'off') }) });
}
function setOn(v) {
  settings.coach = !!v; save();
  try { const o = document.getElementById('optCoach'); if (o) o.checked = settings.coach; } catch (e) {}
  if (typeof toast === 'function') toast(tx(v ? 'on' : 'off'));
  S.hov = -1;
  render(); renderFx();
  if (v && wants(cur) && !listAt(cur)) analyzeCurrent(busyToken);
}
function relabel() { if (GomokuCoach.sw) GomokuCoach.sw.sync(); S.key = ''; S.cls = null; render(); }
function merge(more) { for (const l in more) TX[l] = Object.assign({}, TX[l] || {}, more[l], { gl: Object.assign({}, (TX[l] || {}).gl || {}, more[l].gl || {}) }); }
window.GomokuCoach = { init, render, relabel, merge, tx, TX, active, wants, fx, bookAt };
})();
