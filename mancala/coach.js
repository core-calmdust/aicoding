'use strict';
// マンカラ・コーチ (common spec: shared/COACH.md, model: shogi/coach.js) — shown while the player is to move against the AI
// (and in local two-player games): the position at a glance (形勢・ストア差・局面・定跡／陣形), the recommended plan with its
// reason, the candidate directions of the position (分かれ道: each candidate's plan, the pit named; where the last seed lands
// is revealed on demand, with the sowing preview on the board), prioritized "how to think" tips read from the position
// (横取りの脅威・もう一回・終盤の数え・空き穴 …), and the verdict on the previous move. Glossary terms are dotted.
// Opening guidance (Kalah 4 / 6 seeds from the standard start): the perfect-play results published by Mark Rawlings
// (Mancala World, "Kalah research by Mark Rawlings"; also cited on Wikipedia "Kalah") instead of raw evaluation.
// Texts: TX[lang] (en fallback); zh ko es fr pt de hi ar live in coach-i18n.js (MancalaCoach.merge).
// app.js: MancalaCoach.render() at the end of renderInfo(); the candidates are the per-pit analysis anaLists[cur].
(() => {
const TX = {
ja: {
  head: 'コーチ', sw: 'コーチ', swT: 'コーチ（考え方の解説）のオン／オフ', on: 'コーチ ON', off: 'コーチ OFF',
  offNote: 'コーチ機能はオフになっています。上のスイッチ（電球のマーク）をオンにすると、局面の考え方や候補手の解説が表示されます。',
  overRv: '対局が終わりました。分析すると、この欄に一手ごとの振り返り（最善手・悪手とその理由）が表示されます。', oppTurn: '相手の手番です。相手がどの穴をまくか予想してみよう。相手の「もう一回」と「横取り」の穴を探すのがコツです。', over: '対局が終わりました。棋譜の［分析］で一局を振り返れます。', viewing: '過去の局面を表示中です。最新の局面に戻るとコーチが再開します。',
  calc: '候補手を読んでいます…', form: '形勢', store: 'ストア', stage: '局面', side: '盤上の種',
  'st.open': '序盤', 'st.mid': '中盤', 'st.end': '終盤',
  'f.win': '勝勢', 'f.big': '優勢', 'f.adv': '有利', 'f.even': '互角', 'f.dis': '不利', 'f.bad': '劣勢', 'f.lost': '敗勢',
  'f.xw': '読み切りで{n}粒差勝ち', 'f.xl': '読み切りで{n}粒差負け', 'f.xd': '読み切りで引き分け', 'f.v': '{f} {v}',
  'sd.v': '{a}対{b}', 'st.v': '{a}対{b}',
  recWhy: 'この局面の第一候補は「{c}」の方針です。形勢は{f}。', recSharp: '2番目の候補との差が大きく（{x}粒）、ここは正確に指したい局面です。', recBranch: '候補どうしの差が小さい分かれ道です。下の候補から好きな方針を選べます。', recOnly: 'ほかの手は大きく損をします。迷わず指したい局面です。', recOne: '指せる穴はここだけです。',
  brH: '分かれ道 — 選べる方針', brIntro: 'どれを選んでも大差はありません。自分の得意な方針で指すのが上達の近道です。', cdH: '候補手と方針', cdIntro: '上位の候補を方針ごとに解説します（差は最終的な粒差の読み）。',
  show: '手を見る', hide: '手を隠す',
  pit: '穴{n}', 'mv.store': '穴{n} → ストア', 'mv.mine': '穴{n} → 穴{l}', 'mv.opp': '穴{n} → 相手の穴{l}', 'mv.gain': ' (+{g})',
  'tt.end': '穴{p}で終局させる', 'tt.extra': '穴{p}の{n}粒でストアへぴったり', 'tt.cap': '穴{p}から相手の{c}粒を横取り', 'tt.defend': '穴{p}をまいて横取りを防ぐ', 'tt.setup': '穴{p}をまいて横取りを仕込む', 'tt.keep': '穴{p}の{n}粒を自陣でまく', 'tt.sow': '穴{p}の{n}粒をまく',
  'gap.best': '最善', 'gap.eq': 'ほぼ同じ', 'gap.lt': '少し劣る', 'gap.bad': '劣る', 'gap.n': ' −{x}粒',
  'c.end': '決着', 'b.end': '終局させる', 'x.end': '自分か相手の列が空になって対局が終わる手です。盤に残った種はそれぞれの側の持ち主のものになるので、終わらせる前に数えて勝ちを確かめよう。',
  'c.extra': 'もう一回', 'b.extra': 'もう一回', 'x.extra': '最後の1粒を自分のストアに入れて、もう一回指す方針。得点しながら手番も続くのがマンカラの基本の攻めです。ストアに近い穴から先に使うと、遠い穴のぴったりを崩さずに連続できます。',
  'c.cap': '横取り', 'b.cap': '横取り', 'x.cap': '最後の1粒を自分の空の穴に止めて、向かいの{c}粒を横取りする方針。大きな得点ですが、そのあと相手にどんな手が残るかも確かめよう。',
  'c.defend': '守り', 'b.defend': '守る', 'x.defend': '相手がねらっている横取りを防ぐ方針。狙われた山を動かす・空き穴を埋める・相手の最後の1粒が止まる穴を変える、のどれかで守ります。',
  'c.setup': '仕込み', 'b.setup': '仕込む', 'x.setup': '次の手番で横取りできる形を作る方針。相手が受ければ空振りになるので、ほかの得とくらべて選ぼう。',
  'c.keep': '種を残す', 'b.keep': '種を残す', 'x.keep': '種を相手の側に渡さない方針。終局時に盤に残った種はその側の持ち主のものになるので、自陣の種は終盤の得点の貯金になります。',
  'c.sow': '展開', 'b.sow': 'まいて整える', 'x.sow': '種をまいて形を整える方針。相手の側に種が渡ると、相手の選択肢と終盤の取り分が増える点も考えよう。',
  opH: '序盤の分かれ道 — 定跡', opIntro: '序盤は評価値より定跡で。数字は完全読みでの最終的な粒差です（M. Rawlings によるカラハの完全解析）。まず定番を覚え、慣れたら変わり種も試そう。', opIntroG: '序盤は「もう一回」で手数を得するのが基本です。', 'op.main': '定番', 'op.alt': '変わり種',
  'op.res.w': '完全読みで{n}粒差勝ち', 'op.res.w2': '完全読みで{n}粒差以上の勝ち', 'op.res.l': '完全読みで{n}粒差負け', 'op.res.d': '完全読みで引き分け',
  'op.o3': '4粒のカラハで、ただ一つストアにぴったり入る初手。もう一回のあとの2手目で結果が分かれ、穴6へ続ける「3→6」が完全読みで8粒差勝ちの最善です。初手で穴1・2・5をまくと、完全読みでは負けになります。',
  'op.o6': 'もう一回はありませんが、完全読みでも4粒差勝ちが残る変わり種。ストアの隣の穴を空にしておくと、のちの手でぴったりを作りやすくなります。',
  'op.o36': '穴3のもう一回に続けて、5粒になった穴6をまく手。完全読みでの最善（8粒差勝ち）です。',
  'op.o35': '穴5をまく手。完全読みでは4粒差勝ちで、穴6に次ぐ2番目の手です。',
  'op.o34': '穴4をまく手。完全読みでは2粒差勝ち。穴2なら引き分け、穴1なら負けになります。',
  'op.s1': '6粒のカラハで、ただ一つストアにぴったり入る初手（穴1）。完全読みで先手の勝ちが示されています。', 'op.s13': '穴1のもう一回に続けて穴3をまく手。完全読みで4粒差以上の勝ち。', 'op.s12': '穴2をまく手。完全読みで2粒差以上の勝ち。初手で穴6をまくと、完全読みでは負けになります。',
  'op.rep': '先手の「{l}」に対する完全読みの最善の受け（それでも先手の{n}粒差勝ち）。定跡を知っておくと、差を最小限にできます。', 'op.repX': 'ここも完全読みの受けの続きです。',
  'op.gx': '穴{p}は種の数がストアまでの距離と同じなので、ぴったりストアに入ってもう一回指せます。初手の「もう一回」は手数の得になります。',
  bkWhy: 'この局面は定跡の範囲です。定跡の第一候補は穴{p}（{r}）。下の定跡から選び、手の意味を覚えよう。', bkWhyR: 'この局面は定跡の範囲です。完全読みの受けは穴{p}（{r}）。',
  bkName: '{l}（定跡）', bkMoyo: '{l}模様', bkOut: '定跡外', senkei: '定跡', fmH: '陣形', meC: 'あなた', opC: '相手', who: '{k}（{w}）',
  'fm.chain': '連続手の形', 'fm.hoard': '穴{p}に貯め込み', 'fm.heavy': '種が多い', 'fm.light': '種が少ない', 'fm.gaps': '空き穴が多い', 'fm.even': '均等', fixed: '{n}', moyo: '{n}模様',
  prev: '前の手 穴{m}：{q}', prevBest: '「{c}」の方針で、AIの第一候補と同じ手です。', prevAlt: 'AIの第一候補は穴{m}（{c}）でした。', prevAltOk: 'AIの第一候補・穴{m}（{c}）と同じくらい良い手です。', prevBook: '定跡どおりの手です（{r}）。', prevLoss: '最善との差は約{x}粒です。',
  'q.best': '最善手', 'q.good': '好手', 'q.dubious': '疑問手', 'q.bad': '悪手',
  'tip.extra': '💡コツ：まく前に「種の数＝ストアまでの距離」の穴を探そう（穴6は1粒、穴5は2粒…）。', 'tip.cap': '💡コツ：自分の空の穴に最後の1粒が止まる手と、その向かいの山を探そう。', 'tip.def': '💡コツ：まく前に、相手の空き穴の向かいにある自分の大きな山を確かめよう。', 'tip.gen': '💡コツ：自分の手のあと、相手が次の手番でどれだけ得をするかも確かめよう。',
  tipsH: '考え方のヒント', more: 'ほかのヒント（{n}）', less: 'たたむ',
  'tp.threat': '相手は次に穴{x}から、あなたの穴{y}の{n}粒を横取りできます。山を動かすか、空き穴を埋めるか、それ以上の得を取りにいこう。',
  'tp.capNow': '穴{x}から、相手の穴{y}の{n}粒を横取りできます（+{g}）。取ったあと相手に残る手もくらべよう。',
  'tp.extras': '穴{list}はストアにぴったりで、もう一回指せます。ストアに近い穴から順に使うと連続できます。',
  'tp.oppExtra': '相手には穴{list}の「もう一回」があります。次の相手の手番で連続されるかもしれません。',
  'tp.clinch': 'あなたのストアはすでに{w}粒以上。勝ちが確定しています。',
  'tp.count': '盤の種は残り{n}粒。勝つにはストアに{w}粒（全体の半分を超える数）が必要で、あなたはあと{x}粒です。数えて勝ち筋を確かめよう。',
  'tp.oppClinch': '相手のストアがすでに{w}粒以上で、勝敗は決まっています。差を縮めることを目標にしよう。',
  'tp.starve': '相手の側は残り{n}粒です。相手の列が空になると終局し、あなたの側の{m}粒はすべてあなたのものになります。',
  'tp.low': 'あなたの側は残り{n}粒です。あなたの列が空になると終局し、相手の側の{m}粒は相手のものになります。',
  'tp.hoard': '穴{p}に{n}粒を貯めています。最後まで持てば得点になりますが、向かいの穴が空くと横取りの的になります。',
  'tp.gaps': '相手の空き穴の向かいに、あなたの山があります（穴{list}）。相手の最後の1粒がそこに止まらないか見張ろう。',
  'tp.winning': '優勢です。無理に横取りを狙わず、相手に「もう一回」や横取りを与えない安全な手で勝ちに近づこう。',
  'tp.losing': '劣勢です。相手の種が少ない列を空にさせない・大きな横取りを狙うなど、逆転の筋を探そう。',
  'tp.branch': '候補手の差が小さい「分かれ道」です。方針（攻める・守る・種を残す）を先に決めてから穴を選ぶのが上達のコツ。',
  'tp.sharp': '最善と2番目の差が大きい局面です（{x}粒）。ここを正確に指せるかが勝負の分かれ目。',
  'tp.open1': '序盤はまず「もう一回」。種の数がストアまでの距離と同じ穴を探そう。',
  'tp.open2': '序盤の一手が数粒の差になります。もう一回のあとは、相手に横取りやもう一回を与えない穴を選ぼう。',
  'tp.mid1': '自分の大きな山の向かいに相手の空き穴があると、横取りの的になります（相手の空き穴の向かいに種をためない）。',
  'tp.mid2': '目先の得だけで選ばず、自分の手のあとに相手が次の手番でどれだけ得をするかも確かめよう。',
  'tp.end1': '終盤は数えるのが勝負。どちらかの列が空になると、残りの種はその側の持ち主のものになります。',
  'tp.end2': '種が少ない側は、列が空になる前に「もう一回」でストアへ入れられる種を確かめよう。',
  'tp.easy': 'イージールールは横取りがありません。もう一回と、終局時に自分の側に残る種が勝負を決めます。',
  'tp.relay': 'スンカは止まった穴に種があるとリレーでまき続けます。最後の1粒がどこで止まるか、プレビューで確かめよう。',
  'tp.greed': '「欲張りは身を滅ぼす（Greed ruins gentlemen）」——大きな横取りに飛びつく前に、相手の次の一手を確かめよう。',
  gl: {
    store: { m: ['ストア'], t: 'ストア', d: '両端の大きな穴。自分のストアに入った種が得点です。種をまくとき自分のストアには入れ、相手のストアは飛ばします。' },
    extra: { m: ['もう一回'], t: 'もう一回', d: '最後の1粒が自分のストアに入ると、もう一度自分の番になります。種の数がストアまでの距離と同じ穴で起こります。' },
    cap: { m: ['横取り'], t: '横取り', d: '最後の1粒が自分の空の穴に止まると、向かいの相手の穴の種を取れます（カラハ・スンカは止まった1粒も一緒にストアへ。ノーマルは1粒が穴に残る）。' },
    exact: { m: ['完全読み', '読み切り'], t: '完全読み', d: '終局まですべての手を読み切った結果。最善を尽くし合ったときの最終的な粒差です。' },
    hoard: { m: ['貯め込み', '貯めて'], t: '貯め込み', d: '一つの穴に種をためておく作戦。最後まで持てば得点になりますが、横取りの的にもなります。' },
    sweep: { m: ['終局'], t: '終局', d: 'どちらかの列の種がなくなると対局が終わり、盤に残った種はそれぞれの側の持ち主のストアに入ります。' },
    joseki: { m: ['定跡'], t: '定跡', d: '序盤の決まった指し方。カラハは4粒・6粒とも完全解析されていて、先手が最善を尽くせば勝ちになります。' },
    gaps: { m: ['空き穴'], t: '空き穴', d: '種のない穴。自分の空き穴は横取りのチャンス、相手の空き穴の向かいの自分の山は横取りの的です。' },
  },
},
en: {
  head: 'Coach', sw: 'Coach', swT: 'Turn the coach (how-to-think tips) on / off', on: 'Coach ON', off: 'Coach OFF',
  offNote: 'The coach is switched off. Turn on the switch at the top (the light bulb) to see how to think about the position and the candidate moves explained.',
  overRv: 'The game is over. Analyze it to see a move-by-move review here (best moves, mistakes and why).', oppTurn: "It's your opponent's turn. Try to guess which pit they will sow — look for their extra-turn pits and captures.", over: 'The game is over. Use [Analyze] in the record to review it.', viewing: 'You are looking at an earlier position. The coach resumes at the latest position.',
  calc: 'Reading the candidate moves…', form: 'Position', store: 'Stores', stage: 'Phase', side: 'Seeds on board',
  'st.open': 'Opening', 'st.mid': 'Middlegame', 'st.end': 'Endgame',
  'f.win': 'winning', 'f.big': 'clearly better', 'f.adv': 'better', 'f.even': 'even', 'f.dis': 'worse', 'f.bad': 'clearly worse', 'f.lost': 'losing',
  'f.xw': 'solved: win by {n}', 'f.xl': 'solved: loss by {n}', 'f.xd': 'solved: draw', 'f.v': '{f} {v}',
  'sd.v': '{a} vs {b}', 'st.v': '{a} vs {b}',
  recWhy: 'The first choice here is the "{c}" plan. Your position: {f}.', recSharp: 'The gap to the second choice is large ({x} seeds) — a moment to play precisely.', recBranch: 'The candidates are close: a branching position. Pick the plan you like from the list below.', recOnly: 'Every other move loses a lot here — play it without hesitating.', recOne: 'This is the only pit you can play.',
  brH: 'Branching point — plans to choose from', brIntro: "None of these is much worse than the others. Playing the plan that suits you is the fastest way to improve.", cdH: 'Candidates and their plans', cdIntro: 'The top candidates, explained plan by plan (gaps are in final seeds).',
  show: 'Show moves', hide: 'Hide moves',
  pit: 'pit {n}', 'mv.store': 'pit {n} → store', 'mv.mine': 'pit {n} → pit {l}', 'mv.opp': "pit {n} → opponent's pit {l}", 'mv.gain': ' (+{g})',
  'tt.end': 'End the game with pit {p}', 'tt.extra': 'Pit {p}: {n} seeds reach the store', 'tt.cap': "Pit {p} captures {c} seeds", 'tt.defend': 'Pit {p} stops a capture', 'tt.setup': 'Pit {p} sets up a capture', 'tt.keep': 'Pit {p}: sow {n} on your side', 'tt.sow': 'Sow the {n} seeds of pit {p}',
  'gap.best': 'best', 'gap.eq': 'about equal', 'gap.lt': 'a bit worse', 'gap.bad': 'worse', 'gap.n': ' −{x}',
  'c.end': 'Finish', 'b.end': 'End the game', 'x.end': "This move empties a row and ends the game. The seeds left on each side go to that side's owner, so count first and make sure it wins.",
  'c.extra': 'Extra turn', 'b.extra': 'Extra turn', 'x.extra': 'Drop the last seed in your own store and move again. Scoring while keeping the turn is the basic attack in mancala. Use the pits closest to the store first: that keeps the exact counts of the farther pits intact for a chain.',
  'c.cap': 'Capture', 'b.cap': 'Capture', 'x.cap': 'Stop the last seed in an empty pit on your side and capture the {c} seeds opposite. A big gain — but also check what the opponent can do afterwards.',
  'c.defend': 'Defence', 'b.defend': 'Defend', 'x.defend': "Stop the capture the opponent is aiming at: move the threatened pile, fill the empty pit, or change where their last seed lands.",
  'c.setup': 'Set-up', 'b.setup': 'Set up', 'x.setup': 'Build a capture for your next turn. If the opponent sees it and defends, it misses, so compare it with the other gains.',
  'c.keep': 'Keep seeds', 'b.keep': 'Keep seeds', 'x.keep': "Don't give seeds to the opponent's side. At the end the seeds left on each side go to that side's owner, so seeds on your side are savings for the endgame.",
  'c.sow': 'Development', 'b.sow': 'Develop', 'x.sow': "Sow to improve your position. Seeds that cross to the opponent's side give them more options and more seeds at the end.",
  opH: 'Opening crossroads — book moves', opIntro: 'In the opening, follow the book rather than the evaluation. The numbers are perfect-play results in final seeds (Mark Rawlings\' solution of Kalah). Learn the standard moves first, then try the unusual ones.', opIntroG: 'In the opening, gaining tempo with extra turns is the basic idea.', 'op.main': 'Standard', 'op.alt': 'Unusual',
  'op.res.w': 'perfect play: win by {n}', 'op.res.w2': 'perfect play: win by {n}+', 'op.res.l': 'perfect play: loss by {n}', 'op.res.d': 'perfect play: draw',
  'op.o3': 'With 4 seeds this is the only first move that ends exactly in the store. The result depends on the second move after the extra turn: continuing with pit 6 ("3→6") is best, a win by 8 with perfect play. Opening with pit 1, 2 or 5 loses with perfect play.',
  'op.o6': 'No extra turn, but still a win by 4 with perfect play — an unusual choice. Emptying the pit next to the store makes exact counts easier later.',
  'op.o36': 'After the extra turn from pit 3, sow pit 6 (now 5 seeds). The perfect-play best: a win by 8.',
  'op.o35': 'Sow pit 5: a win by 4 with perfect play, the second-best choice after pit 6.',
  'op.o34': 'Sow pit 4: a win by 2 with perfect play. Pit 2 draws and pit 1 loses.',
  'op.s1': 'With 6 seeds this is the only first move that ends exactly in the store (pit 1). Perfect-play analysis shows a win for the first player.', 'op.s13': 'After the extra turn from pit 1, sow pit 3: a win by 4 or more with perfect play.', 'op.s12': 'Sow pit 2: a win by 2 or more with perfect play. Opening with pit 6 loses with perfect play.',
  'op.rep': 'The perfect-play defence against "{l}" (the first player still wins by {n}). Knowing the book keeps the loss as small as possible.', 'op.repX': 'This continues the perfect-play defence.',
  'op.gx': 'Pit {p} holds exactly as many seeds as its distance to the store, so it ends in the store for an extra turn. An extra turn on move one gains tempo.',
  bkWhy: 'This position is still in the book. The first book choice is pit {p} ({r}). Pick from the book moves below and learn what they do.', bkWhyR: 'This position is still in the book. The perfect-play defence is pit {p} ({r}).',
  bkName: '{l} (book)', bkMoyo: 'heading for {l}', bkOut: 'out of book', senkei: 'Opening', fmH: 'Shape', meC: 'you', opC: 'opponent', who: '{k} ({w})',
  'fm.chain': 'extra-turn chain', 'fm.hoard': 'hoarding in pit {p}', 'fm.heavy': 'many seeds', 'fm.light': 'few seeds', 'fm.gaps': 'many empty pits', 'fm.even': 'balanced', fixed: '{n}', moyo: '{n} forming',
  prev: 'Previous move pit {m}: {q}', prevBest: 'A "{c}" move — the same as the AI\'s first choice.', prevAlt: "The AI's first choice was pit {m} ({c}).", prevAltOk: "About as good as the AI's first choice, pit {m} ({c}).", prevBook: 'A book move ({r}).', prevLoss: 'About {x} seeds worse than the best.',
  'q.best': 'Best move', 'q.good': 'Good', 'q.dubious': 'Inaccuracy', 'q.bad': 'Mistake',
  'tip.extra': '💡 Tip: before sowing, look for a pit whose seeds equal its distance to the store (pit 6: 1 seed, pit 5: 2 seeds…).', 'tip.cap': '💡 Tip: look for a move whose last seed stops in your own empty pit, and the pile opposite it.', 'tip.def': "💡 Tip: before sowing, check your big piles opposite the opponent's empty pits.", 'tip.gen': '💡 Tip: after choosing your move, check how much the opponent can gain on their next turn.',
  tipsH: 'How to think', more: 'More tips ({n})', less: 'Show less',
  'tp.threat': 'Next turn the opponent can capture the {n} seeds in your pit {y} by playing pit {x}. Move the pile, fill the empty pit, or go for a bigger gain.',
  'tp.capNow': "Pit {x} captures the {n} seeds in the opponent's pit {y} (+{g}). Compare what the opponent has left afterwards.",
  'tp.extras': 'Pit {list} ends exactly in the store: an extra turn. Play them from the one closest to the store to chain them.',
  'tp.oppExtra': 'The opponent has an extra turn in pit {list}. They may chain moves on their next turn.',
  'tp.clinch': 'Your store already holds {w} or more: the win is certain.',
  'tp.count': '{n} seeds are left on the board. Winning needs {w} in the store (more than half of all seeds); you need {x} more. Count to check the win.',
  'tp.oppClinch': "The opponent's store already holds {w} or more, so the result is decided. Aim to make the margin smaller.",
  'tp.starve': "Only {n} seeds are left on the opponent's side. When their row empties the game ends and the {m} seeds on your side are all yours.",
  'tp.low': "Only {n} seeds are left on your side. When your row empties the game ends and the {m} seeds on the opponent's side go to them.",
  'tp.hoard': 'You are hoarding {n} seeds in pit {p}. Kept to the end they count for you, but if the pit opposite empties, the pile becomes a capture target.',
  'tp.gaps': "You have piles opposite the opponent's empty pits (pit {list}). Watch that their last seed can't stop there.",
  'tp.winning': "You are ahead. No need to chase captures: play safe moves that give the opponent no extra turns or captures.",
  'tp.losing': "You are behind. Look for a comeback: a big capture, or keeping the game going while the opponent's row is short.",
  'tp.branch': 'The candidates are close — a branching point. Decide your plan first (attack, defend, keep seeds), then pick the pit.',
  'tp.sharp': 'The best move is much better than the second ({x} seeds). Finding it may decide the game.',
  'tp.open1': 'Opening: extra turn first. Look for a pit whose seeds equal its distance to the store.',
  'tp.open2': 'One opening move can be worth several seeds. After the extra turn, choose a pit that gives the opponent no capture or extra turn.',
  'tp.mid1': "A big pile of yours opposite an empty pit of the opponent is a capture target — don't build piles opposite their empty pits.",
  'tp.mid2': "Don't choose only by the immediate gain: check how much the opponent can gain on their next turn too.",
  'tp.end1': "The endgame is about counting. When a row empties, the seeds left on each side go to that side's owner.",
  'tp.end2': 'With few seeds on your side, check which seeds can still reach your store with extra turns before your row empties.',
  'tp.easy': 'Easy rules have no captures: extra turns and the seeds left on your side at the end decide the game.',
  'tp.relay': 'In Sunka a seed landing in a full pit picks it up and keeps sowing. Use the preview to see where the last seed really stops.',
  'tp.greed': '"Greed ruins gentlemen" — before grabbing a big capture, check the opponent\'s next move.',
  gl: {
    store: { m: ['store'], t: 'Store', d: 'The big pits at both ends. Seeds in your store are your points. When sowing you drop seeds into your own store and skip the opponent\'s.' },
    extra: { m: ['extra turn'], t: 'Extra turn', d: 'If the last seed lands in your own store you move again. It happens with a pit whose seeds equal its distance to the store.' },
    cap: { m: ['capture'], t: 'Capture', d: "If the last seed stops in an empty pit on your side, you take the seeds in the opponent's pit opposite (Kalah / Sunka take the last seed too; in Normal it stays)." },
    exact: { m: ['perfect play', 'solved'], t: 'Perfect play', d: 'The result when every move to the end is read and both sides play their best: the final margin in seeds.' },
    hoard: { m: ['hoarding'], t: 'Hoarding', d: 'Keeping many seeds in one pit. Kept to the end they count for you, but the pile is also a capture target.' },
    sweep: { m: ['ends the game', 'game ends'], t: 'End of the game', d: "When one row runs out of seeds the game ends, and the seeds left on each side go into that side's store." },
    joseki: { m: ['book'], t: 'Opening book', d: 'Standard opening moves. Kalah with 4 and 6 seeds has been solved: with best play the first player wins.' },
    gaps: { m: ['empty pits', 'empty pit'], t: 'Empty pits', d: "Pits without seeds. Your empty pits are capture chances; your piles opposite the opponent's empty pits are capture targets." },
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
const r1 = x => Math.round(x * 10) / 10;
const sepL = () => (L() === 'ja' || L() === 'zh') ? '・' : ', ';

// ------------------------------------------------------------------------------------------ opening book
// Kalah (capture includes the capturing seed) from the standard start, Mark Rawlings' perfect-play results (pits 1-6 from the
// left = from the mover's first pit; moves here are 0-based pits). [pit, kind, text key, result kind, n]
const BOOK = {
  4: {
    '': [[2, 'main', 'o3', 'w', 8], [5, 'alt', 'o6', 'w', 4]],
    '2': [[5, 'main', 'o36', 'w', 8], [4, 'main', 'o35', 'w', 4], [3, 'alt', 'o34', 'w', 2]],
    // second player's perfect-play replies (first moves of the published continuations)
    '2 5': [[1, 'main', 'rep', 'l', 8, '3→6']], '2 5 1': [[0, 'main', 'repX', 'l', 8, '3→6']],
    '2 4': [[1, 'main', 'rep', 'l', 4, '3→5']], '2 4 1': [[2, 'main', 'repX', 'l', 4, '3→5']],
    '2 3': [[2, 'main', 'rep', 'l', 2, '3→4']], '2 3 2': [[1, 'main', 'repX', 'l', 2, '3→4']], '2 3 2 1': [[5, 'main', 'repX', 'l', 2, '3→4']],
    '5': [[1, 'main', 'rep', 'l', 4, '6']], '5 1': [[4, 'main', 'repX', 'l', 4, '6']],
  },
  6: {
    '': [[0, 'main', 's1', 'w2', 4]],
    '0': [[2, 'main', 's13', 'w2', 4], [1, 'main', 's12', 'w2', 2]],
  },
};
// book names of the first player's opening (shown as the 定跡 chip)
const BOOKNAME = { 4: { '2 5': '3→6', '2 4': '3→5', '2 3': '3→4', '2 1': '3→2', '2 0': '3→1', '5': '6', '3': '4', '4': '5', '1': '2', '0': '1' }, 6: { '0 2': '1→3', '0 1': '1→2', '5': '6' } };
function bookOk() { return game && game.rules === 'kalah' && !game.setup && (game.seeds === 4 || game.seeds === 6); }
function resTxt(k, n) { return tx(k === 'w' ? 'op.res.w' : k === 'w2' ? 'op.res.w2' : k === 'l' ? 'op.res.l' : 'op.res.d', { n }); }
// the first player's opening so far: { key, done } (done when the first player's first turn is over)
function firstTurn() {
  const out = [];
  for (let i = 0; i < game.moves.length && i < 6; i++) { if (P[i].side !== 0) break; out.push(game.moves[i]); }
  const done = game.moves.length > out.length;
  return { key: out.join(' '), done };
}

// ------------------------------------------------------------------------------------------ position facts
function formOfSide(b, s, rules) {
  const base = s ? 7 : 0, opp = 1 - s;
  let n = 0, mx = 0, mi = 0, empty = 0;
  for (let k = 0; k < 6; k++) { const v = b[base + k]; n += v; if (v > mx) { mx = v; mi = k; } if (!v) empty++; }
  const on = E.sideSum(b, opp);
  const ex = rules === 'sunka' ? [] : mcExtras(b, s, rules);
  if (ex.length >= 2) return { k: 'chain', set: ex.length >= 3 };
  if (mx >= 8) return { k: 'hoard', p: mi + 1, set: mx >= 12 };
  if (n <= 4) return { k: 'light', set: true };
  if (n >= on + 6) return { k: 'heavy', set: n >= on + 10 };
  if (empty >= 3) return { k: 'gaps', set: empty >= 4 };
  return { k: 'even', set: true };
}
function facts(at) {
  const p = P[at], b = p.b, me = p.side, opp = 1 - me, rules = game.rules, R = E.RULES[rules];
  const f = { me, opp, rules, n: at, at };
  f.total = 0; for (let i = 0; i < 14; i++) f.total += b[i];
  f.mySide = E.sideSum(b, me); f.oppSide = E.sideSum(b, opp); f.onBoard = f.mySide + f.oppSide;
  f.myStore = b[E.storeOf(me)]; f.oppStore = b[E.storeOf(opp)];
  f.w = Math.floor(f.total / 2) + 1;
  f.stage = (f.onBoard <= f.total * 0.35 || Math.min(f.mySide, f.oppSide) <= 3) ? 'end' : (at < 6 && f.onBoard >= f.total * 0.8) ? 'open' : 'mid';
  f.threat = R.cap ? mcBestCap(b, opp, rules) : { n: 0 };
  f.myCap = R.cap ? mcBestCap(b, me, rules) : { n: 0 };
  f.extras = rules === 'sunka' ? [] : mcExtras(b, me, rules);
  f.oppExtras = rules === 'sunka' ? [] : mcExtras(b, opp, rules);
  // own piles opposite the opponent's empty pits
  f.exposed = [];
  if (R.cap) for (let k = 0; k < 6; k++) { const i = (me ? 7 : 0) + k, o = 12 - i; if (b[i] >= 3 && !b[o]) f.exposed.push(k); }
  let mx = 0, mi = 0; for (let k = 0; k < 6; k++) { const v = b[(me ? 7 : 0) + k]; if (v > mx) { mx = v; mi = k; } }
  f.hoard = mx >= 10 && rules !== 'sunka' ? { n: mx, p: mi + 1 } : null;
  f.fm = [formOfSide(b, me, rules), formOfSide(b, opp, rules)];
  return f;
}
// what a candidate is about
function classify(k, f) {
  const p = P[f.at], F = mcFeatures(p.b, p.side, k, game.rules), n = p.b[(p.side ? 7 : 0) + k];
  let c = 'sow';
  if (F.over) c = 'end';
  else if (F.extra) c = 'extra';
  else if (F.cap) c = 'cap';
  else if (f.threat.n >= 2 && F.threatAfter && F.threatAfter.n < f.threat.n) c = 'defend';
  else if (F.myCapNext && F.myCapNext.n >= 3 && !(F.threatAfter && F.threatAfter.n >= F.myCapNext.n)) c = 'setup';
  else if (F.give === 0) c = 'keep';
  // where the last seed lands (revealed on demand)
  const land = F.land, ms = E.storeOf(p.side), mine = p.side ? land >= 7 && land <= 12 : land <= 5;
  const mv = land === ms ? tx('mv.store', { n: k + 1 }) : tx(mine ? 'mv.mine' : 'mv.opp', { n: k + 1, l: (land % 7) + 1 });
  return { k: c, pit: k, n, F, cap: F.cap, mv: mv + (F.gain > 0 ? tx('mv.gain', { g: F.gain }) : '') };
}
const CCLS = { end: 'c-mate', extra: 'c-atk', cap: 'c-mat', defend: 'c-def', setup: 'c-dev', keep: 'c-calm', sow: 'c-dev' };
const RCLS = { end: 'r-mate', defend: 'r-def' };
function formOf(v) { return v >= 8 ? 'win' : v >= 4 ? 'big' : v >= 1.5 ? 'adv' : v > -1.5 ? 'even' : v > -4 ? 'dis' : v > -8 ? 'bad' : 'lost'; }
function formTxt(v, exact) {
  if (exact) { const r = Math.round(v); return r > 0 ? tx('f.xw', { n: r }) : r < 0 ? tx('f.xl', { n: -r }) : tx('f.xd'); }
  return tx('f.v', { f: tx('f.' + formOf(v)), v: (v >= 0 ? '+' : '−') + Math.abs(r1(v)) });
}
function ttl(d) {
  const v = { p: d.pit + 1, n: d.n, c: d.cap };
  return tx('tt.' + d.k, v);
}

// ------------------------------------------------------------------------------------------ state / rendering
const S = { open: false, reveal: false, key: '', f: null, cls: null, op: null };
let card = null;
function usable() {
  return !!(game && P.length && !lesson && !puzzle && (settings.mode === 'ai' || settings.mode === 'pvp') && !(typeof inStudy === 'function' && inStudy()));
}
function active() { return !!(settings.coach && usable()); }
function overNow() { return P[game.moves.length].over || game.resigned != null; }
function myTurn() {
  if (!usable() || overNow() || cur !== game.moves.length || reviewing || thinking >= 0) return false;
  return settings.mode === 'pvp' || P[cur].side === game.human;
}
function factsNow() {
  const key = game.rules + game.seeds + '|' + game.moves.slice(0, cur).join(' ') + '|' + LANG;
  if (S.key === key && S.f) return S.f;
  S.key = key; S.cls = null;
  try { S.f = facts(cur); } catch (e) { console.warn(e); S.f = null; }
  return S.f;
}
// candidates from the per-pit analysis (anaLists[cur]: [{m, v (seeds, mover's view), exact}])
function candInfo(f) {
  const list = anaLists[cur]; if (!list || !list.length) return null;
  if (S.cls && S.cls.list === list) return S.cls;
  const sorted = list.slice().sort((a, b) => b.v - a.v);
  const best = sorted[0];
  const items = sorted.slice(0, 4).map(x => Object.assign(classify(x.m, f), { v: x.v, exact: x.exact, drop: Math.max(0, best.v - x.v) }));
  // one candidate per plan, at most 3 directions
  const seen = new Set(), dirs = [];
  for (const it of items) { if (seen.has(it.k) && dirs.length) continue; seen.add(it.k); dirs.push(it); if (dirs.length >= 3) break; }
  const second = items[1] ? items[1].drop : null;
  const r = { list, items, dirs, best: items[0], one: list.length === 1, branch: dirs.filter(d => d.drop <= 1).length >= 2, sharp: second != null && second >= 3 ? r1(second) : 0, only: second != null && second >= 6 };
  S.cls = r; return r;
}
function gapOf(d, i) { return i === 0 ? ['gap.best', 'g0'] : d <= 0.5 ? ['gap.eq', 'g1'] : d <= 2 ? ['gap.lt', 'g2'] : ['gap.bad', 'g3']; }
function openingItems() {
  if (!bookOk()) return null;
  const e = BOOK[game.seeds][game.moves.slice(0, cur).join(' ')]; if (!e) return null;
  const p = P[cur], f = factsNow();
  return e.filter(([k]) => p.b[(p.side ? 7 : 0) + k] > 0).map(([k, kind, key, rk, n, line]) => {
    const c = classify(k, f);
    return { k, kind, key, line, res: resTxt(rk, n), rk, n, c };
  });
}
function genericOpening() {
  // the first move of a game (not covered by the book): the exact-count pit gives an extra turn
  if (cur !== 0 || game.setup || game.rules === 'sunka' || bookOk()) return null;
  const f = factsNow(); if (!f || !f.extras.length) return null;
  return f.extras.map(k => ({ k, kind: 'main', key: 'gx', c: classify(k, f) }));
}
function verdictHtml() {
  // the last move of the player (pvp: the last move) graded from the analysis of the position before it
  let i = game.moves.length - 1;
  if (settings.mode === 'ai') while (i >= 0 && P[i].side !== game.human) i--;
  if (i < 0 || i < game.moves.length - 6) return '';
  const k = game.moves[i];
  // book move?
  if (bookOk()) {
    const e = BOOK[game.seeds][game.moves.slice(0, i).join(' ')];
    const hit = e && e.find(x => x[0] === k);
    if (hit) return CoachKit.verdict(0, esc(tx('prev', { m: k + 1, q: tx('q.best') })), gl(esc(tx('prevBook', { r: resTxt(hit[3], hit[4]) }))));
  }
  const Lst = anaLists[i]; if (!Lst || Lst.length < 1) return '';
  let best = Lst[0]; for (const x of Lst) if (x.v > best.v) best = x;
  const mine = Lst.find(x => x.m === k); if (!mine) return '';
  const loss = Math.max(0, best.v - mine.v), flips = mine.exact && Math.sign(Math.round(best.v)) > Math.sign(Math.round(mine.v));
  const q = loss < 0.3 ? 'best' : flips || loss >= 4 ? 'bad' : loss < 1.5 ? 'good' : 'dubious', g = { best: 0, good: 1, dubious: 2, bad: 3 }[q];
  let body = '', tip = '';
  try {
    const f = facts(i);
    const cb = classify(best.m, f), cm = classify(k, f);
    if (best.m === k || loss < 0.3) body = tx('prevBest', { c: tx('c.' + cm.k) });
    else {
      body = tx(q === 'good' ? 'prevAltOk' : 'prevAlt', { m: best.m + 1, c: tx('c.' + cb.k) });
      if (q !== 'good') body += ' ' + tx('prevLoss', { x: r1(loss) });
      if (q === 'bad' || q === 'dubious') tip = cb.k === 'extra' ? 'tip.extra' : cb.k === 'cap' ? 'tip.cap' : cb.k === 'defend' ? 'tip.def' : 'tip.gen';
    }
  } catch (e) {}
  return CoachKit.verdict(g, esc(tx('prev', { m: k + 1, q: tx('q.' + q) })), gl(esc(body)) + (tip ? '<br>' + gl(esc(tx(tip))) : ''));
}
function tipsOf(f, cl) {
  const out = [], add = (k, pr, v, hi) => out.push({ k, pr, v, hi });
  const pits = a => a.map(k => k + 1).join(sepL());
  if (f.myStore >= f.w) add('tp.clinch', 99, { w: f.w }, 1);
  else if (f.oppStore >= f.w) add('tp.oppClinch', 95, { w: f.w });
  if (f.threat.n >= 3) add('tp.threat', 92, { x: f.threat.by + 1, y: (f.threat.from % 7) + 1, n: f.threat.n }, 1);
  if (f.myCap.n >= 2) add('tp.capNow', 90, { x: f.myCap.by + 1, y: (f.myCap.from % 7) + 1, n: f.myCap.n, g: f.myCap.g }, f.myCap.n >= 4);
  if (f.extras.length) add('tp.extras', f.stage === 'open' ? 88 : 84, { list: pits(f.extras) });
  if (f.stage === 'end' && f.myStore < f.w && f.oppStore < f.w) add('tp.count', 80, { n: f.onBoard, w: f.w, x: f.w - f.myStore });
  if (f.oppSide <= 3 && f.mySide >= 6) add('tp.starve', 78, { n: f.oppSide, m: f.mySide });
  else if (f.mySide <= 3 && f.oppSide >= 6) add('tp.low', 78, { n: f.mySide, m: f.oppSide }, 1);
  if (f.oppExtras.length && f.stage !== 'end') add('tp.oppExtra', 60, { list: pits(f.oppExtras) });
  if (f.exposed.length && f.threat.n < 3) add('tp.gaps', 58, { list: pits(f.exposed) });
  if (f.hoard) add('tp.hoard', 50, f.hoard);
  if (cl && cl.best && !cl.best.exact) { const v = cl.best.v; if (v >= 6) add('tp.winning', 48); else if (v <= -6) add('tp.losing', 48); }
  if (cl && cl.branch) add('tp.branch', 56);
  if (cl && cl.sharp) add('tp.sharp', 57, { x: cl.sharp });
  if (game.rules === 'easy') add('tp.easy', 40);
  if (game.rules === 'sunka') add('tp.relay', 62);
  if (f.myCap.n >= 4) add('tp.greed', 30);
  if (f.stage === 'open') { add('tp.open1', 22); add('tp.open2', 18); }
  else if (f.stage === 'mid') { if (E.RULES[game.rules].cap) add('tp.mid1', 20); add('tp.mid2', 16); }
  else { add('tp.end1', 26); add('tp.end2', 15); }
  return out.sort((a, b) => b.pr - a.pr);
}
function render() {
  if (!card) return;
  if (MancalaCoach.sw) MancalaCoach.sw.sync();
  // the coach is for the game in progress: after the game (or while browsing earlier moves) it steps aside and the
  // coach tab shows the review instead; before the review exists, a short note with a button to start it
  const rvOn = !!document.querySelector('#reviewCard.show');
  const playing = !!(usable() && !overNow() && cur === game.moves.length && !reviewing);
  const can = usable() && (playing || (overNow() && !rvOn)), on = active();
  card.classList.toggle('hidden', !can);
  card.classList.toggle('ck-off', can && !on && playing);
  document.body.classList.toggle('ck-tab', can || rvOn);
  document.body.classList.toggle('ck-live', can && on && playing);
  if (rvOn && !S.rvWas) { const b = document.querySelector('#mtabs [data-it=coach]'); if (b && getComputedStyle(b).display !== 'none' && document.body.dataset.it !== 'coach') b.click(); }
  S.rvWas = rvOn;
  if (!can) { hi(-1); return; }
  if (!playing) {
    hi(-1);
    put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('overRv'))}</p><div class="ck-sec"><button type="button" class="ck-rvgo" data-ck="rv">${esc(t('rv.btn'))}</button></div>` + (on ? verdictHtml() : ''));
    const b = card.querySelector('[data-ck=rv]'); if (b) b.onclick = () => { if (typeof runReview === 'function') runReview(); };
    return;
  }
  if (!on) { hi(-1); return put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('offNote'))}</p>`); }
  const f0 = !overNow() ? factsNow() : null;
  let h = `<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span>${f0 ? `<small>${esc(tx('st.' + f0.stage))}</small>` : ''}</h3>`;
  if (overNow()) { hi(-1); h += `<p class="ck-muted">${esc(tx('over'))}</p>` + verdictHtml(); return put(h); }
  if (cur !== game.moves.length || reviewing) { hi(-1); h += `<p class="ck-muted">${esc(tx('viewing'))}</p>`; return put(h); }
  if (!myTurn()) { hi(-1); h += `<p class="ck-muted">${esc(tx('oppTurn'))}</p>` + verdictHtml(); return put(h); }
  const f = f0; if (!f) return put(h);
  const cl = candInfo(f), best = cl && cl.best;
  // summary chips
  const chips = [];
  if (best && settings.eval) chips.push({ k: tx('form'), v: esc(formTxt(best.v, best.exact)), cls: best.v >= 1.5 ? 'pos' : best.v <= -1.5 ? 'neg' : '' });
  const sd = f.myStore - f.oppStore;
  chips.push({ k: tx('store'), v: esc(tx('st.v', { a: f.myStore, b: f.oppStore })), cls: sd > 0 ? 'pos' : sd < 0 ? 'neg' : '' });
  chips.push({ k: tx('side'), v: esc(tx('sd.v', { a: f.mySide, b: f.oppSide })) });
  if (bookOk() && cur < 16) {
    const ft = firstTurn(), nm = BOOKNAME[game.seeds][ft.key];
    let v = '';
    if (!ft.done) v = ft.key ? tx('bkMoyo', { l: ft.key.split(' ').map(x => +x + 1).join('→') + '→…' }) : '';
    else v = nm ? tx('bkName', { l: nm }) : tx('bkOut');
    if (v) chips.push({ k: tx('senkei'), v: esc(v) });
  }
  if (cur >= 2 || !bookOk()) {
    const fm = x => tx(x.set ? 'fixed' : 'moyo', { n: tx('fm.' + x.k, { p: x.p }) });
    chips.push({ k: tx('who', { k: tx('fmH'), w: tx('meC') }), v: esc(fm(f.fm[0])) });
    chips.push({ k: tx('who', { k: tx('fmH'), w: tx('opC') }), v: esc(fm(f.fm[1])) });
  }
  h += CoachKit.summary(chips);
  // opening: the book (or the extra-turn principle) instead of raw evaluation
  const op = openingItems() || genericOpening();
  S.op = null;
  if (op && op.length) {
    S.op = op;
    const book = op[0].key !== 'gx';
    const b0 = op[0];
    h += CoachKit.rec(tx('b.' + b0.c.k), gl(esc(book ? tx(b0.key === 'rep' || b0.key === 'repX' ? 'bkWhyR' : 'bkWhy', { p: b0.k + 1, r: b0.res }) : tx('op.gx', { p: b0.k + 1 }))), RCLS[b0.c.k] || '');
    h += CoachKit.branches({
      head: tx('opH'), intro: gl(esc(tx(book ? 'opIntro' : 'opIntroG'))), reveal: true,
      items: op.map(d => ({ tag: tx('op.' + d.kind), cls: d.kind === 'main' ? 'c-mat' : 'c-dev', title: esc(ttl(d.c)), text: gl(esc(book ? tx('op.' + d.key, { l: d.line, n: d.n }) : tx('op.gx', { p: d.k + 1 }))), gap: d.res || '', gcls: d.rk ? (/^w|d/.test(d.rk) ? 'g0' : 'g2') : '', move: String(d.k), mvName: d.c.mv })),
    });
  } else if (cl && best) {
    let why = esc(tx('recWhy', { c: tx('c.' + best.k), f: formTxt(best.v, best.exact) }));
    if (cl.one) why += ' ' + esc(tx('recOne')); else if (cl.only) why += ' ' + esc(tx('recOnly')); else if (cl.sharp) why += ' ' + esc(tx('recSharp', { x: cl.sharp })); else if (cl.branch) why += ' ' + esc(tx('recBranch'));
    h += CoachKit.rec(tx('b.' + best.k), gl(why), RCLS[best.k] || '');
    h += CoachKit.branches({
      head: tx(cl.branch ? 'brH' : 'cdH'), intro: esc(tx(cl.branch ? 'brIntro' : 'cdIntro')), reveal: S.reveal, show: tx('show'), hide: tx('hide'),
      items: cl.dirs.map((d, i) => { const g = gapOf(d.drop, i); return { tag: tx('c.' + d.k), cls: CCLS[d.k] || '', title: esc(ttl(d)), text: gl(esc(tx('x.' + d.k, { c: d.cap }))), gap: tx(g[0]) + (d.drop >= 0.1 ? tx('gap.n', { x: r1(d.drop) }) : ''), gcls: g[1], move: String(d.pit), mvName: d.mv }; }),
    });
  } else h += `<p class="ck-calc">${esc(tx('calc'))}</p>`;
  const tl = tipsOf(f, cl);
  h += CoachKit.tips({ head: tx('tipsH'), list: tl.map(x => ({ html: gl(esc(tx(x.k, x.v || {}))), hi: x.hi })), open: S.open, more: tx('more', { n: Math.max(0, tl.length - 3) }), less: tx('less') });
  h += verdictHtml();
  put(h);
}
function put(h) {
  if (card.dataset.h === h) return;
  const keep = card.scrollTop; card.dataset.h = h; card.innerHTML = h; card.scrollTop = keep;
  CoachKit.bind(card, {
    onMore: () => { S.open = !S.open; render(); },
    onReveal: () => { S.reveal = !S.reveal; try { settings.coachReveal = S.reveal; save(); } catch (e) {} hi(-1); render(); },
    onHover: u => hi(u == null ? -1 : +u),
  });
}
// a hovered candidate: ring the pit and show the sowing preview (landing pit, captures) on the board
let hiPit = -1;
function hi(k) {
  if (k === hiPit) return;
  hiPit = k;
  try {
    if (k < 0 || !myTurn()) { hiPit = -1; renderFx(); return; }
    const i = pitIndex(P[cur].side, k);
    renderFx(); fxRing(i, 'ok'); drawPreview(i);
  } catch (e) {}
}
function init() {
  if (!window.CoachKit) return;
  CoachKit.css(); CoachKit.glossBind(() => (TX[L()] || TX.en).gl);
  card = document.getElementById('coachCard');
  { const rc = document.getElementById('reviewCard'); if (rc && window.MutationObserver) new MutationObserver(() => render()).observe(rc, { attributes: true, attributeFilter: ['class'] }); }
  try { S.reveal = !!settings.coachReveal; } catch (e) {}
  MancalaCoach.sw = CoachKit.sw({ mount: '.brand-r', get: () => !!settings.coach, set: v => setOn(v), label: on => ({ text: tx('sw'), title: tx('swT') + ' — ' + tx(on ? 'on' : 'off') }) });
}
function setOn(v) {
  settings.coach = !!v; save();
  try { const o = document.getElementById('optCoach'); if (o) o.checked = settings.coach; } catch (e) {}
  if (typeof toast === 'function') toast(tx(v ? 'on' : 'off'));
  hi(-1);
  render();
  if (v && myTurn() && !anaLists[cur] && typeof analyzeCurrent === 'function') analyzeCurrent(busyToken);
}
function relabel() { if (MancalaCoach.sw) MancalaCoach.sw.sync(); S.key = ''; render(); }
function merge(more) { for (const l in more) TX[l] = Object.assign({}, TX[l] || {}, more[l], { gl: Object.assign({}, (TX[l] || {}).gl || {}, more[l].gl || {}) }); }
window.MancalaCoach = { init, render, relabel, merge, tx, TX, active, usable };
})();
