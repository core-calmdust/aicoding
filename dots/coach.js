'use strict';
// ドット＆ボックス コーチ (common spec shared/COACH.md, model: shogi/coach.js; look and behaviour: shared/coachkit.js)
// Shown while the player is to move against the AI (and in local two-player games): the position at a glance (見込み・箱・
// 局面・鎖の形「長い鎖◯本模様」・長鎖ルールのねらい for both sides), the recommended plan with its reason, the candidate
// lines classified into plans (安全な線・犠牲・取る・2つ残し・鎖を渡す…; revealed on demand, drawn on the board on hover),
// prioritized "how to think" tips read from the position, and the verdict on the previous move.
// Openings: for 3×3 / 4×4 the solver-verified lines of openings.json (the site's 定跡, with their own names) are shown
// instead of raw evaluation; 5×5 has no book. Theory: E. Berlekamp, The Dots-and-Boxes Game (long chain rule, double-dealing).
// Texts: TX[lang] (en fallback); zh ko es fr pt de hi ar live in coach-i18n.js (DotsCoach.merge).
// index.html: DotsCoach.init() before HeaderBar.init; it wraps refresh / renderInfo / renderBoard to follow the game.
(() => {
const TX = {
ja: {
  head: 'コーチ', sw: 'コーチ', swT: 'コーチ（考え方の解説）のオン／オフ', on: 'コーチ ON', off: 'コーチ OFF',
  offNote: 'コーチ機能はオフになっています。右上のスイッチをオンにすると、局面の考え方や候補の線の解説が表示されます。',
  oppTurn: '相手の手番です。相手がどの線を引くか予想してみよう。安全な線が何本残っているか数えておくと、先が読みやすくなります。',
  aiTurn: 'AIが考えています。どの線を引いてくるか予想してみよう。',
  overRv: '対局が終わりました。分析すると、この欄に一手ごとの振り返り（最善手・悪手とその理由、長い鎖の本数が決まった場面）が表示されます。',
  over: '対局が終わりました。棋譜の［分析］で一局を振り返れます（どこで鎖の本数が決まったかも解説します）。',
  viewing: '過去の局面を表示中です。最新の局面に戻るとコーチが再開します。',
  calc: '候補の線を考えています…',
  form: '見込み', boxes: '箱', stage: '局面', you: 'あなた', opp: '相手',
  'st.open': '序盤', 'st.mid': '中盤', 'st.end': '終盤', safeN: '安全な線 {n}本',
  'f.win': '{a}−{b}で勝ち', 'f.draw': '{a}−{b}で引き分け', 'f.loss': '{a}−{b}で負け', 'f.est': '≈{a}−{b}',
  chainH: '鎖の形', 'ch.moyo': '長い鎖{k}本模様', 'ch.moyo2': '長い鎖{a}〜{b}本模様', 'ch.fixed': '長い鎖{k}本', 'ch.loops': '＋ループ{l}', 'ch.blob': 'まだ決まらない',
  aimH: 'ねらい（{w}）', 'aim.even': '長い鎖を偶数本', 'aim.odd': '長い鎖を奇数本', 'aim.ok': '（いまは有利）', 'aim.ng': '（いまは不利）',
  ctrlH: '主導権', 'ctrl.me': 'あなた側', 'ctrl.opp': '相手側',
  recWhy: 'この局面の第一候補は「{c}」の方針です。', recF: '見込みは{f}。',
  recSharp: '2番目の候補とは{x}箱の差があり、ここは正確に引きたい局面です。',
  recBranch: '候補どうしの差がない分かれ道です。下の候補から好きな方針を選べます。',
  recOnly: 'ほかの線は箱を大きく損します。迷わず引きたい局面です。',
  recForced: '取れる箱は取って損がありません（取ったあと、もう1本引けます）。',
  brH: '分かれ道 — 選べる方針', brIntro: 'どれを選んでも結果は同じです。自分の得意な方針で引くのが上達の近道です。',
  cdH: '候補の線と方針', cdIntro: '上位の候補を、方針ごとに解説します。',
  show: '線を見る', hide: '線を隠す',
  'gap.best': '最善', 'gap.eq': '同じ結果', 'gap.lt': '{x}箱損', 'gap.bad': '{x}箱損', 'gap.book': '定石表',
  // opening (openings.json: the site's solver-verified lines)
  opH: '序盤の分かれ道 — 定跡の手順', opIntro: '序盤は評価値より定跡で学ぼう。ここに出る手順は、当サイトのソルバーで最善と確かめたものです。まずは定番2つ、慣れたら変わり種も。',
  'op.main': '定番', 'op.alt': '変わり種', 'op.trap': '罠', 'op.best': '最善',
  opWhy: 'まだ定跡の範囲です。{s}',
  'op3.v': '3×3は最善同士なら後手が6−3で勝ちます。初手はどれを選んでも結果は同じなので、形の違いを覚えよう。',
  'op4.v': '4×4は最善同士なら8−8の引き分けです。最初の数手はどの線でも引き分けを保てますが、早くも1箱損の罠があります。',
  'op5.v': '5×5には定跡データがありません。序盤は安全な線を引き合いながら、長い鎖の本数を意識しよう。',
  'o3.A.t': '外周の角寄りの線（a1–）', 'o3.A.x': '盤の角の外周。応手の自由度が大きく、穏やかに始められます。',
  'o3.B.t': '外周の中央の線（b1–）', 'o3.B.x': '外周の真ん中。こちらも応手が多い、落ち着いた初手です。',
  'o3.C.t': '内側の線（a2–）', 'o3.C.x': '盤の端から内側へ入る線。内側の線は2つの箱に関わるので、鎖の形に早く影響します。',
  'o3.D.t': '中央の箱の辺（b2–）', 'o3.D.x': '鋭い初手。後手の最善の応手は対称を除いて3通りだけで、まねの手（b3–）は後手が1箱損します。',
  'o4.J.t': '中央の点に触れる線（b3–）', 'o4.J.x': '定石表の本線。最初の4手は、先手はどの手でも引き分けを保てます。',
  'o4.I.t': '左の端の中段から（a3–）', 'o4.I.x': '端から中央へ。7手目に1箱損になる手が4本あり、そこから注意が必要です。',
  'o4.E.t': '端の上段から（a2–）', 'o4.E.x': '7手目に1箱損の手が8本と、先手の手順でいちばん罠が多い形です。',
  // plans: tag (c.) / badge (b.) / explanation (x.)
  'c.take': '箱を取る', 'b.take': '取る', 'x.take': '箱の4本目を引いて取る手。取ったらもう1本引けるので、つながった箱はまとめて取れます。',
  'c.dbl': 'ダブルクロス', 'b.dbl': '2箱を取る', 'x.dbl': '1本の線で2箱を同時に取る手（ダブルクロス）。相手が2つ残しをしたあとに現れます。取ったあとは自分が次の線を引く番です。',
  'c.decline': '2つ残し', 'b.decline': '2つ残し', 'x.decline': '鎖の最後の2箱（ループなら4箱）をわざと取らずに手番を渡す手。相手はその箱をもらう代わりに、次の鎖を開かなければなりません。残りに長い鎖があるとき、主導権を保つ基本技です。',
  'c.safeIn': '安全な線', 'b.safeIn': '安全な線', 'x.safeIn': 'どの箱にも3辺目を作らない内側の線。内側の線は2つの箱に関わるので、鎖をつなげたり切ったりして、長い鎖の本数を動かします。{est}',
  'c.safeOut': '安全な線', 'b.safeOut': '安全な線', 'x.safeOut': 'どの箱にも3辺目を作らない外周の線。外周の線は1つの箱にしか関わらないので、形を大きく変えずに手を進められます。{est}',
  'c.sac': '犠牲', 'b.sac': '犠牲', 'x.sac': '安全な線が残っているのに、あえて{k}箱を渡す手。手番の偶奇をひっくり返して、最後の長い鎖を取りにいく作戦です。小さく渡して大きく取るのがねらい。',
  'c.hard': '真ん中から渡す', 'b.hard': '2箱を渡す', 'x.hard': '2箱の鎖を真ん中の線で渡す手。2箱が別々の1箱ずつになり、相手は取るしかありません（2つ残しで返せない）。',
  'c.half': '端から渡す', 'b.half': '2箱を渡す', 'x.half': '2箱の鎖を端の線で渡す手。相手は「2箱とも取る」か「取らずに返す」かを選べるので、ふつうは真ん中から渡すほうが安全です。',
  'c.give': '鎖を渡す', 'b.give': '鎖を渡す', 'x.give': '安全な線がないので、{n}箱の鎖を開いて渡す手。渡すならふつうは一番短い鎖から。長い鎖を最初に開いた側はたいてい損をします。',
  'c.loop': 'ループを渡す', 'b.loop': 'ループを渡す', 'x.loop': '{n}箱のループを開いて渡す手。主導権を持つ側がループで主導権を保つには4箱を残す必要があるので、ループを先に開くと相手に大きな犠牲を強いられます。',
  'c.other': 'そのほか', 'b.other': '線を引く', 'x.other': '取れる箱を取らずに別の線を引く手。取れる箱は相手に取られる前に取るのが基本です。',
  'tt.take': '{r}の箱を取る', 'tt.dbl': '{r}の2箱を同時に取る', 'tt.decline': '{r}の鎖で最後の箱を残す',
  'tt.safeIn': '{r}の内側の線', 'tt.safeOut': '{r}の外周の線', 'tt.sac': '{r}で{k}箱を渡す', 'tt.hard': '{r}の2箱の鎖を真ん中から',
  'tt.half': '{r}の2箱の鎖を端から', 'tt.give': '{r}の{n}箱の鎖を開く', 'tt.loop': '{r}の{n}箱のループを開く', 'tt.other': '{r}の線',
  rg: ['左上', '上', '右上', '左', '中央', '右', '左下', '下', '右下'],
  est: 'このあと長い鎖は{k}本になりやすい形です（{w}のねらいは{p}本）。', 'p.even': '偶数', 'p.odd': '奇数',
  // tips
  tipsH: '考え方のヒント', more: 'ほかのヒント（{n}）', less: 'たたむ',
  'tp.cap': '取れる箱が{n}個あります。取ったらもう1本引けます。',
  'tp.capChoice': '相手が鎖を開きました。全部取るか、最後の2箱（ループなら4箱）を残して主導権を保つか――残りの長い鎖の大きさで決めよう。',
  'tp.capLast': '残りに長い鎖がないので、取れる箱は全部取り切るのが基本です。',
  'tp.noSafe': '安全な線はもう残っていません。どこに引いても箱を渡すので、渡すなら一番小さい鎖（{k}箱）から。',
  'tp.two': '2箱の鎖を渡すときは真ん中の線で。端から渡すと、相手に「取る／返す」の選択肢を与えます。',
  'tp.fewSafe': '安全な線は残り{n}本です。それが尽きたとき、どちらが最初に鎖を開くことになるか数えてみよう。',
  'tp.third': '3辺目を引かないこと。3本で囲まれた箱は、次の相手にそのまま取られてしまいます。',
  'tp.rule': '長鎖ルール：この盤は点が{d}個。先手は「点の数＋長い鎖の本数」を偶数に、後手は奇数にしたい。あなたは{side}なので、長い鎖を{p}本にしたい側です。',
  'tp.parityGood': 'いまの形のままだと長い鎖は{k}本になりやすく、長鎖ルールではあなたに有利です。鎖の本数を変えない線を選ぼう。',
  'tp.parityBad': 'いまの形のままだと長い鎖は{k}本になりやすく、長鎖ルールでは相手に有利です。内側の線で鎖をつなぐ・切る、または小さな犠牲で偶奇をひっくり返そう。',
  'tp.ctrlMe': '主導権はあなた側です。相手が長い鎖を開いたら、最後の2箱を残して（2つ残し）主導権を保ち、最後の鎖は取り切ろう。',
  'tp.ctrlOpp': '主導権は相手側です。短い鎖やループから先に開いて、相手に2つ残し（ループは4つ残し）の犠牲を何度も払わせよう。',
  'tp.loop': 'ループがあります。ループは長鎖ルールの本数に数えません。ループで主導権を保つには4箱を残す必要があります。',
  'tp.winning': '有利な見込みです。無理をせず、相手に箱を渡さない手を続けよう。',
  'tp.losing': '不利な見込みです。相手が間違えやすい形（鎖の本数が決まらない複雑な形）を残すのが逆転の近道です。',
  'tp.branch': '候補の差がない分かれ道です。鎖をどうしたいか（つなぐ・切る）を先に決めてから線を選ぼう。',
  'tp.sharp': '最善の線と2番目の線で{x}箱の差があります。ここを正確に引けるかが勝負の分かれ目。',
  'tp.open1': '序盤は、相手に箱を渡さない安全な線を引き合う時間です。本当の勝負は、安全な線が尽きたときに長い鎖が何本あるかです。',
  'tp.open2': 'まねの手（点対称の線を打ち返す）は必勝法ではありません。3×3で中央の箱をまねると後手が1箱損します。',
  'tp.mid1': '中盤は鎖の本数を整える時間。安全な線がなくなる前に、長い鎖が何本になるか数えておこう。',
  'tp.end1': '終盤は計算です。鎖とループの大きさを数え、どの順番で開くか、取るか残すかを決めよう。',
  'tp.end2': '主導権を持たない側は、損の少ない順（短い鎖・ループ）に開いていくのが基本です。',
  // verdict
  prev: '前の線 {m}：{q}', prevBest: '「{c}」の線で、AIの第一候補と同じ結果です。', prevAlt: 'AIの第一候補は {m}（{c}）でした。', prevLoss: '最善より{l}箱損しました。',
  prevBook: '定跡どおりの手です。', prevBookTrap: 'この手は定跡の罠で、最善より{l}箱損します。定跡の手は {m} など。',
  'tip.gave': '💡 安全な線が残っているうちは、箱を渡す線（3辺目）を引かないのが基本です。',
  'tip.decline': '💡 鎖を取るときは「全部取る」か「最後の2箱を残す」かを、残りの長い鎖の大きさで選ぼう。',
  'tip.parity': '💡 安全な線が尽きる前に、長い鎖の本数を数えて、自分に有利な本数に導こう。',
  'tip.order': '💡 終盤は短い鎖から渡し、長い鎖とループは後に回すのが基本です。',
  first: '先手', second: '後手',
  gl: {
    safe: { m: ['安全な線'], t: '安全な線', d: 'どの箱にも3辺目を作らない線。相手に箱を渡さないので、序盤はこれを引き合います。' },
    third: { m: ['3辺目'], t: '3辺目', d: '箱の3本目の線。引くと次の相手がその箱の4本目を引いて取れます。' },
    chain: { m: ['長い鎖'], t: '長い鎖', d: '3箱以上つながった鎖。開いた側はふつう大きく損をします。' },
    kusari: { m: ['鎖'], t: '鎖（チェーン）', d: '2辺ずつ囲まれた箱の列。どこかに線を引くと、相手はその鎖を丸ごと取れます。' },
    loop: { m: ['ループ'], t: 'ループ', d: '輪になった鎖。長鎖ルールの本数には数えず、主導権を保つには4箱を残す必要があります。' },
    rule: { m: ['長鎖ルール'], t: '長鎖ルール', d: 'Berlekamp の目安。先手は「点の数＋長い鎖の本数」を偶数に、後手は奇数にすると、最後の長い鎖を受け取る主導権を握れます。' },
    ctrl: { m: ['主導権'], t: '主導権（コントロール）', d: '相手に鎖を開かせ続けられる立場。2つ残しをくり返して、最後の長い鎖を取ります。' },
    dd: { m: ['2つ残し', '4つ残し'], t: '2つ残し（ダブルディール）', d: '鎖の最後の2箱（ループは4箱）をわざと取らずに手番を渡す手。相手は箱をもらう代わりに次の鎖を開かされます。' },
    dc: { m: ['ダブルクロス'], t: 'ダブルクロス', d: '1本の線で2箱を同時に取る手。2つ残しをされた側が取るときに現れます。' },
    sac: { m: ['犠牲'], t: '犠牲', d: '安全な線があるのに、あえて箱を渡して手番の偶奇を変える手。' },
    teiseki: { m: ['定跡', '定石表'], t: '定跡', d: '当サイトのソルバー（3×3は全探索、4×4は事前計算した定石表）で最善を確かめた序盤の手順。伝統的な定跡名はないので、名前は形の説明です。' },
  },
},
en: {
  head: 'Coach', sw: 'Coach', swT: 'Turn the coach (how-to-think tips) on / off', on: 'Coach ON', off: 'Coach OFF',
  offNote: 'The coach is switched off. Turn on the switch at the top right to see how to think about the position and the candidate lines explained.',
  oppTurn: "It's your opponent's turn. Try to guess which line they will draw — counting how many safe lines are left makes it easier to see ahead.",
  aiTurn: 'The AI is thinking. Try to guess which line it will draw.',
  overRv: 'The game is over. Analyse it to see a move-by-move review here (best moves, mistakes and why, and where the number of long chains was decided).',
  over: 'The game is over. Use [Review] in the record to look back at it (it also explains where the number of chains was decided).',
  viewing: 'You are looking at an earlier position. The coach resumes at the latest position.',
  calc: 'Thinking about candidate lines…',
  form: 'Outlook', boxes: 'Boxes', stage: 'Phase', you: 'you', opp: 'opponent',
  'st.open': 'Opening', 'st.mid': 'Middlegame', 'st.end': 'Endgame', safeN: '{n} safe lines',
  'f.win': 'win {a}–{b}', 'f.draw': 'draw {a}–{b}', 'f.loss': 'loss {a}–{b}', 'f.est': '≈{a}–{b}',
  chainH: 'Chains', 'ch.moyo': 'heading for {k} long chains', 'ch.moyo2': 'heading for {a}–{b} long chains', 'ch.fixed': '{k} long chains', 'ch.loops': ' + {l} loop(s)', 'ch.blob': 'not decided yet',
  aimH: 'Aim ({w})', 'aim.even': 'even no. of long chains', 'aim.odd': 'odd no. of long chains', 'aim.ok': ' (on track)', 'aim.ng': ' (off track)',
  ctrlH: 'Control', 'ctrl.me': 'yours', 'ctrl.opp': "opponent's",
  recWhy: 'The first choice here is the "{c}" plan.', recF: 'Outlook: {f}.',
  recSharp: 'The second choice is {x} box(es) worse — a moment to play precisely.',
  recBranch: 'The candidates give the same result: a branching point. Pick the plan you like from the list below.',
  recOnly: 'Every other line loses boxes here — draw it without hesitating.',
  recForced: 'Taking the box costs nothing (after taking it you draw another line).',
  brH: 'Branching point — plans to choose from', brIntro: 'All of these give the same result. Playing the plan that suits you is the fastest way to improve.',
  cdH: 'Candidate lines and their plans', cdIntro: 'The top candidates, explained plan by plan.',
  show: 'Show lines', hide: 'Hide lines',
  'gap.best': 'best', 'gap.eq': 'same result', 'gap.lt': '−{x} box', 'gap.bad': '−{x} boxes', 'gap.book': 'book',
  opH: 'Opening crossroads — book lines', opIntro: 'In the opening, learn the book lines rather than evaluations. These lines are checked as best by this site\'s solver. Learn the two standard choices first, then try the unusual ones.',
  'op.main': 'Standard', 'op.alt': 'Unusual', 'op.trap': 'Trap', 'op.best': 'best',
  opWhy: 'Still in the book. {s}',
  'op3.v': 'With best play 3×3 is a 6–3 win for the second player. Every first move gives the same result, so learn the differences in shape.',
  'op4.v': 'With best play 4×4 is an 8–8 draw. Any line keeps the draw for the first few moves, but traps that lose a box come early.',
  'op5.v': 'There is no book for 5×5. Draw safe lines and keep the number of long chains in mind.',
  'o3.A.t': 'Outer line near the corner (a1–)', 'o3.A.x': 'The corner of the outer edge. Many replies are fine — a quiet start.',
  'o3.B.t': 'Middle of the outer edge (b1–)', 'o3.B.x': 'The middle of the outer edge; another calm first move with many replies.',
  'o3.C.t': 'Inner line (a2–)', 'o3.C.x': 'A line going in from the edge. Inner lines touch two boxes, so they shape the chains early.',
  'o3.D.t': 'Side of the centre box (b2–)', 'o3.D.x': 'A sharp first move: the second player has only three best replies (up to symmetry), and copying it with b3– loses a box.',
  'o4.J.t': 'Line touching the centre dot (b3–)', 'o4.J.x': 'The book\'s main line. For the first four moves any move keeps the draw for the first player.',
  'o4.I.t': 'From the middle of the left edge (a3–)', 'o4.I.x': 'From the edge toward the centre. At move 7 four lines lose a box — care is needed from there.',
  'o4.E.t': 'From the upper edge (a2–)', 'o4.E.x': 'At move 7 eight lines lose a box — the first player\'s line with the most traps.',
  'c.take': 'Take', 'b.take': 'Take', 'x.take': 'Draw the fourth side and take the box. You then draw again, so connected boxes can be taken one after another.',
  'c.dbl': 'Double-cross', 'b.dbl': 'Take two', 'x.dbl': 'One line takes two boxes at once (a double-cross). It appears after the opponent left two boxes. After taking you draw the next line.',
  'c.decline': 'All but two', 'b.decline': 'All but two', 'x.decline': 'Leave the last two boxes of the chain (four in a loop) and hand over the turn. The opponent gets them but must then open the next chain — the basic way to keep control while long chains remain.',
  'c.safeIn': 'Safe line', 'b.safeIn': 'Safe line', 'x.safeIn': 'An inner line that makes no third side. Inner lines touch two boxes, so they join or cut chains and change the number of long chains. {est}',
  'c.safeOut': 'Safe line', 'b.safeOut': 'Safe line', 'x.safeOut': 'An outer line that makes no third side. It touches only one box, so the game moves on without changing the shape much. {est}',
  'c.sac': 'Sacrifice', 'b.sac': 'Sacrifice', 'x.sac': 'Give {k} box(es) on purpose while safe lines remain. It flips the parity of the turns so that you get the last long chain: give a little to win a lot.',
  'c.hard': 'Hand out in the middle', 'b.hard': 'Give two', 'x.hard': 'Give a two-box chain with its middle line (a hard-hearted handout). The boxes become two single boxes, so the opponent can only take them — they cannot hand them back.',
  'c.half': 'Hand out at the end', 'b.half': 'Give two', 'x.half': 'Give a two-box chain at its end (a half-hearted handout). The opponent may take both or decline them, so the middle line is usually safer.',
  'c.give': 'Open a chain', 'b.give': 'Open a chain', 'x.give': 'No safe lines are left, so open the {n}-box chain. Usually give the shortest chain first; whoever has to open the first long chain usually loses.',
  'c.loop': 'Open a loop', 'b.loop': 'Open a loop', 'x.loop': 'Open the {n}-box loop. To keep control in a loop the controller must leave four boxes, so opening loops early makes the controller pay a lot.',
  'c.other': 'Other', 'b.other': 'Draw a line', 'x.other': 'Draw elsewhere instead of taking the box. Usually take the boxes before the opponent does.',
  'tt.take': 'Take the box at the {r}', 'tt.dbl': 'Take two boxes at the {r}', 'tt.decline': 'Leave the last boxes of the chain at the {r}',
  'tt.safeIn': 'An inner line at the {r}', 'tt.safeOut': 'An outer line at the {r}', 'tt.sac': 'Give {k} box(es) at the {r}', 'tt.hard': 'The 2-box chain at the {r}, in the middle',
  'tt.half': 'The 2-box chain at the {r}, at its end', 'tt.give': 'Open the {n}-box chain at the {r}', 'tt.loop': 'Open the {n}-box loop at the {r}', 'tt.other': 'A line at the {r}',
  rg: ['top left', 'top', 'top right', 'left', 'centre', 'right', 'bottom left', 'bottom', 'bottom right'],
  est: 'Afterwards the board tends toward {k} long chain(s) (you want an {p} number).', 'p.even': 'even', 'p.odd': 'odd',
  tipsH: 'How to think', more: 'More tips ({n})', less: 'Show less',
  'tp.cap': 'You can take {n} box(es). After taking one you draw again.',
  'tp.capChoice': 'Your opponent opened a chain. Take everything, or leave the last two boxes (four in a loop) to keep control? Decide by how big the remaining long chains are.',
  'tp.capLast': 'No long chain remains, so take every box you can.',
  'tp.noSafe': 'No safe lines are left. Every line gives boxes away, so give the smallest chain ({k} box(es)) first.',
  'tp.two': 'Give a two-box chain with its middle line. Giving it at the end lets the opponent choose to take or decline.',
  'tp.fewSafe': 'Only {n} safe line(s) left. Count who will have to open the first chain when they run out.',
  'tp.third': 'Never draw a third side: a box with three sides is simply taken by the opponent.',
  'tp.rule': 'Long chain rule: this board has {d} dots. The first player wants dots + long chains to be even, the second player odd. You are the {side}, so you want an {p} number of long chains.',
  'tp.parityGood': 'As things stand the board tends toward {k} long chain(s) — good for you by the long chain rule. Choose lines that keep that number.',
  'tp.parityBad': 'As things stand the board tends toward {k} long chain(s) — good for your opponent by the long chain rule. Join or cut chains with inner lines, or flip the parity with a small sacrifice.',
  'tp.ctrlMe': 'Control is yours. When the opponent opens a long chain, leave the last two boxes to keep control — and take the last chain completely.',
  'tp.ctrlOpp': 'Control is your opponent\'s. Open the short chains and loops first so they must pay all-but-two (all-but-four in loops) again and again.',
  'tp.loop': 'There is a loop. Loops do not count for the long chain rule, and keeping control in a loop costs four boxes.',
  'tp.winning': 'You are ahead. No need to force things: keep drawing lines that give nothing away.',
  'tp.losing': 'You are behind. Keep the position complicated (the number of chains undecided) so the opponent can go wrong.',
  'tp.branch': 'The candidates give the same result. Decide first what you want (join or cut chains), then pick the line.',
  'tp.sharp': 'The best line is {x} box(es) better than the second. Finding it may decide the game.',
  'tp.open1': 'The opening is for drawing safe lines that give nothing away. The real fight is how many long chains there will be when the safe lines run out.',
  'tp.open2': 'Copying (the point-symmetric line) is not a winning strategy: on 3×3, copying in the centre box costs the second player a box.',
  'tp.mid1': 'The middlegame shapes the chains. Count how many long chains there will be before the safe lines run out.',
  'tp.end1': 'The endgame is counting. Count the chains and loops, then decide the order to open them and whether to take or leave boxes.',
  'tp.end2': 'Without control, open the chains that cost least first (short chains and loops).',
  prev: 'Previous line {m}: {q}', prevBest: 'A "{c}" line with the same result as the AI\'s first choice.', prevAlt: "The AI's first choice was {m} ({c}).", prevLoss: 'It lost {l} box(es) compared with the best.',
  prevBook: 'A book move.', prevBookTrap: 'This is a book trap: it loses {l} box(es). Book moves here include {m}.',
  'tip.gave': '💡 While safe lines remain, never draw a line that gives boxes away (a third side).',
  'tip.decline': '💡 When taking a chain, choose between taking all and leaving the last two by the size of the long chains that remain.',
  'tip.parity': '💡 Before the safe lines run out, count the long chains and steer toward the number that suits you.',
  'tip.order': '💡 In the endgame give the short chains first and keep long chains and loops for later.',
  first: 'first player', second: 'second player',
  gl: {
    safe: { m: ['safe line', 'Safe line'], t: 'Safe line', d: 'A line that makes no third side on any box, so it gives nothing away. In the opening both players draw these.' },
    third: { m: ['third side'], t: 'Third side', d: 'The third line of a box: the next player can draw the fourth and take it.' },
    chain: { m: ['long chain'], t: 'Long chain', d: 'A chain of three or more boxes. Whoever has to open one usually loses many boxes.' },
    loop: { m: ['loop'], t: 'Loop', d: 'A chain that closes on itself. It does not count for the long chain rule; keeping control in a loop costs four boxes.' },
    rule: { m: ['long chain rule'], t: 'Long chain rule', d: 'Berlekamp\'s rule: the first player wants dots + long chains to be even, the second player odd — then they get control of the last long chain.' },
    ctrl: { m: ['control'], t: 'Control', d: 'Being able to make the opponent open every chain. The controller keeps it with all-but-two and takes the last long chain.' },
    dd: { m: ['all-but-two', 'all-but-four', 'All but two'], t: 'All but two (double-dealing)', d: 'Leaving the last two boxes of a chain (four in a loop) for the opponent, who must then open the next chain.' },
    dc: { m: ['double-cross'], t: 'Double-cross', d: 'One line that takes two boxes at once; it follows a double-dealing move.' },
    sac: { m: ['sacrifice'], t: 'Sacrifice', d: 'Giving boxes on purpose while safe lines remain, to change the parity of the turns.' },
    hh: { m: ['hard-hearted handout'], t: 'Hard-hearted handout', d: 'Giving a two-box chain with its middle line, so the opponent can only take both boxes.' },
    hf: { m: ['half-hearted handout'], t: 'Half-hearted handout', d: 'Giving a two-box chain at its end; the opponent may decline it with a double-dealing move.' },
    book: { m: ['book'], t: 'Book', d: 'Opening lines checked as best by this site\'s solver (3×3: full search, 4×4: a precomputed table). Dots and Boxes has no traditional opening names; the names describe the shape.' },
  },
},
};
const L = () => (typeof LANG !== 'undefined' && TX[LANG]) ? LANG : 'en';
function tx(k, v) {
  let x = TX[L()][k]; if (x === undefined) x = TX.en[k]; if (x === undefined) x = TX.ja[k]; if (x === undefined) return k;
  if (v && typeof x === 'string') x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : '');
  return x;
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const gl = h => window.CoachKit ? CoachKit.gloss(h, (TX[L()] || TX.en).gl || TX.en.gl) : h;
const mv = e => `<bdi dir="ltr">${esc(edgeName(e))}</bdi>`;
const sp = () => (L() === 'ja' || L() === 'zh') ? '' : ' ';
const fmtB = x => String(Math.round(x * 10) / 10);

// --------------------------------------------------------------------------------------------- position facts
const safeList = p => { const o = []; for (let e = 0; e < p.G.E; e++) if (!p.drawn[e] && p.gives(e) === 0 && p.completes(e) === 0) o.push(e); return o; };
const outer = (G, e) => { const [r1, c1, r2, c2] = G.ed[e]; return r1 === r2 ? (r1 === 0 || r1 === G.R) : (c1 === 0 || c1 === G.C); };
// long chains / loops when the safe lines run out, from a few deterministic playouts (as the engine's evalH does)
const STEPS = [7, 11, 13, 17, 19, 23, 29, 31];
function chainEst(p) {
  const G = p.G, E = G.E, ks = [];
  for (let t = 0; t < 8; t++) {
    const q = p.clone(), step = STEPS[t], off = (t * 977 + 3) % E;
    for (let i = 0; i < E; i++) { const e = (off + i * step) % E; if (!q.drawn[e] && q.gives(e) === 0 && q.completes(e) === 0) q.play(e); }
    const cs = DotsEngine.components(q, false);
    ks.push(cs.filter(c => c.simple && !c.loop && c.n >= 3).length);
  }
  ks.sort((a, b) => a - b);
  const cnt = {}; ks.forEach(k => cnt[k] = (cnt[k] || 0) + 1);
  const mode = +Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a] || a - b)[0];
  return { lo: ks[0], hi: ks[ks.length - 1], mode, sure: cnt[mode] >= 6 };
}
// player 0 (moves first) wants dots + double-crosses so far + long chains even (Berlekamp's long chain rule)
function wantsEven(pl, n, dc) { const d = (n + 1) * (n + 1) + dc; return pl === 0 ? d % 2 === 0 : d % 2 === 1; }
function favoured(k, n, dc) { return ((n + 1) * (n + 1) + dc + k) % 2 === 0 ? 0 : 1; }
function facts(st) {
  const p = st.p, G = st.G, n = game.n, f = { me: st.turn, n };
  f.safe = safeList(p).length;
  f.caps = 0; for (let b = 0; b < G.B; b++) if (p.cnt[b] === 3) f.caps++;
  f.cm = f.caps ? DotsEngine.captureMoves(p) : null;
  f.dc = st.log.filter(x => x.k === 2).length;
  f.rem = G.B - p.filled;
  const comps = DotsEngine.components(p, true);
  f.comps = comps;
  f.loops = comps.filter(c => c.simple && c.loop).length;
  f.longNow = comps.filter(c => c.simple && !c.loop && c.n >= 3).length;
  f.minChain = comps.length ? Math.min(...comps.map(c => c.n)) : 0;
  f.twoChain = comps.some(c => c.simple && !c.loop && c.n === 2);
  f.settled = f.safe === 0;
  f.est = f.settled ? { lo: f.longNow, hi: f.longNow, mode: f.longNow, sure: true } : chainEst(p);
  const opened = game.moves.length;
  f.stage = f.safe === 0 ? 'end' : (opened < G.E * 0.3 && f.safe >= 8) ? 'open' : 'mid';
  f.even = wantsEven(f.me, n, f.dc);
  f.fav = f.est.sure ? favoured(f.est.mode, n, f.dc) : -1;
  // control (exact by definition): with no safe line and nothing to take, the side to move must open a chain or loop
  f.ctrl = f.settled && !f.caps && f.longNow + f.loops > 0 ? 1 - f.me : -1;
  return f;
}
// what a candidate line is about
function classify(p, e, f) {
  const G = p.G, k = p.completes(e);
  if (k === 2) return { k: 'dbl' };
  if (k === 1) return { k: 'take' };
  if (f.caps) { if (f.cm && f.cm.declines && f.cm.declines.includes(e)) return { k: 'decline' }; }
  const g = p.gives(e);
  if (g === 0) return f.caps ? { k: 'other' } : { k: outer(G, e) ? 'safeOut' : 'safeIn' };
  if (f.caps) return { k: 'other' };
  if (f.safe > 0) return { k: 'sac', n: DotsEngine.sacrificeSize(p, e) };
  const b0 = G.eb0[e], b1 = G.eb1[e], c = f.comps.find(x => x.boxes.includes(b0 >= 0 ? b0 : b1));
  if (!c) return { k: 'give', n: 1 };
  if (c.loop) return { k: 'loop', n: c.n };
  if (c.n === 2 && !c.loop) return { k: b0 >= 0 && b1 >= 0 && c.boxes.includes(b0) && c.boxes.includes(b1) ? 'hard' : 'half', n: 2 };
  return { k: 'give', n: c.n };
}
const CCLS = { take: 'c-mat', dbl: 'c-mat', decline: 'c-def', safeIn: 'c-dev', safeOut: 'c-calm', sac: 'c-atk', hard: 'c-def', half: 'c-mate', give: 'c-calm', loop: 'c-calm', other: 'c-mate' };
const RCLS = { decline: 'r-def', hard: 'r-def' };
// where a line is: one of nine regions of the board (from its midpoint)
function region(e) {
  const G = SF.G, [r1, c1, r2, c2] = G.ed[e], y = (r1 + r2) / 2 / G.R, x = (c1 + c2) / 2 / G.C;
  const b = v => v < 0.34 ? 0 : v > 0.66 ? 2 : 1, rg = tx('rg');
  return (Array.isArray(rg) ? rg : TX.en.rg)[b(y) * 3 + b(x)];
}
function ttl(d) { return esc(tx('tt.' + d.k.k, { r: region(d.u), k: d.k.n, n: d.k.n })); }
function catTxt(d, f) {
  let est = '';
  if ((d.k.k === 'safeIn' || d.k.k === 'safeOut') && d.after) est = tx('est', { k: d.after.mode, w: tx('you'), p: tx(f.even ? 'p.even' : 'p.odd') });
  return tx('x.' + d.k.k, { k: d.k.n, n: d.k.n, est });
}

// --------------------------------------------------------------------------------------------- analysis (own worker)
const S0 = { open: false, reveal: true, info: new Map(), job: null, w: null, hover: null, items: [] };
const keyAt = i => game.n + ':' + game.moves.slice(0, i).join(',');
function ask(i) {
  const key = keyAt(i);
  if (S0.info.has(key) || (S0.job && S0.job.key === key)) return;
  if (S0.job && S0.w) { S0.w.terminate(); S0.w = null; }
  if (!S0.w) S0.w = makeWorker(ev => { const m = ev.data, j = S0.job; if (!j || m.id !== j.id) return; S0.job = null; if (m.type === 'analyze') { S0.info.set(j.key, { list: m.list || [], exact: !!m.exact }); render(); } });
  const id = ++jobId, edges = game.moves.slice(0, i);
  S0.job = { id, key };
  S0.w.postMessage({ type: 'analyze', id, R: game.n, C: game.n, edges, ms: game.n === 3 ? 500 : game.n === 4 ? 900 : 1500 });
}
function cancel() { if (S0.job && S0.w) { S0.w.terminate(); S0.w = null; } S0.job = null; }

// --------------------------------------------------------------------------------------------- opening book (openings.json)
let OPB = null, opAsked = false;
function bookLines(i) {
  if (!OPB) { if (!opAsked && typeof openLoad === 'function') { opAsked = true; openLoad().then(d => { OPB = d; render(); }); } return null; }
  const set = OPB.sets && OPB.sets.find(s => s.n === game.n); if (!set) return null;
  const G = SF.G, out = [];
  for (const l of set.lines) {
    const ms = l._m || (l._m = decE(l.moves));
    if (ms.length <= i) continue;
    for (let s = 0; s < G.NS; s++) {
      const P = G.perms[s];
      let ok = true; for (let j = 0; j < i; j++) if (P[ms[j]] !== game.moves[j]) { ok = false; break; }
      if (!ok) continue;
      const vals = l.vals[i] ? new Map(decV(l.vals[i]).map(([e, v]) => [P[e], v])) : null;
      out.push({ l, u: P[ms[i]], vals });
      break;
    }
  }
  return out.length ? out : null;
}
// the opening branches at ply i (first moves only): {u, kind, t, x, v (value), best}
const OPEN0 = { 3: [['A', 0, 'main'], ['B', 1, 'main'], ['C', 3, 'alt'], ['D', 4, 'alt']], 4: [['J', 9, 'main'], ['I', 8, 'main'], ['E', 4, 'alt']] };
function openingAt(i) {
  if (game.setup || i > 5 || !OPEN0[game.n]) return null;
  const bl = bookLines(i); if (!bl && i > 0) return null;
  if (i === 0) return OPEN0[game.n].map(([c, u, kind]) => ({ u, kind, t: tx('o' + game.n + '.' + c + '.t'), x: tx('o' + game.n + '.' + c + '.x') }));
  if (typeof textReady === 'function' && t('op.L.' + bl[0].l.id) === 'op.L.' + bl[0].l.id) { textReady(LANG).then(() => render()); return null; }
  const vals = bl.find(x => x.vals) ? bl.find(x => x.vals).vals : null, best = vals ? Math.max(...vals.values()) : null;
  const seen = new Set(), out = [];
  for (const b of bl) {
    if (seen.has(b.u)) continue; seen.add(b.u);
    const v = vals ? vals.get(b.u) : null, trap = v != null && best != null && v < best;
    out.push({ u: b.u, kind: trap ? 'trap' : 'main', t: t('op.L.' + b.l.id), x: t('op.S.' + b.l.id), loss: trap ? (best - v) / 2 : 0 });
  }
  out.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'trap' ? 1 : -1));
  out.forEach((d, j) => { if (d.kind === 'main' && j >= 2) d.kind = 'alt'; });
  return out;
}
function bookVals(i) { const bl = i <= 12 ? bookLines(i) : null; const b = bl && bl.find(x => x.vals); return b ? b.vals : null; }

// --------------------------------------------------------------------------------------------- state / rendering
let card = null;
function usable() {
  return !!(game && SF && !lesson && !puzzle && !game.setup && (settings.mode === 'ai' || settings.mode === 'pvp') && !(window.rtGame && rtGame()) && !rbCons());
}
function active() { return !!(settings.coach && usable()); }
function myTurn() { return !SF.over && viewPly === null && !aiPending && (settings.mode === 'pvp' || SF.turn === game.human); }
function outlook(st, v, exact) {
  const me = st.turn, rem = st.G.B - st.p.filled, a = st.scores[me] + (rem + v) / 2, b = st.scores[1 - me] + (rem - v) / 2;
  if (!exact) return { s: tx('f.est', { a: fmtB(a), b: fmtB(b) }), cls: a > b + 0.4 ? 'pos' : a < b - 0.4 ? 'neg' : '', d: a - b };
  return { s: tx(a > b ? 'f.win' : a < b ? 'f.loss' : 'f.draw', { a, b }), cls: a > b ? 'pos' : a < b ? 'neg' : '', d: a - b };
}
function candInfo(info, f) {
  if (!info || !info.list || !info.list.length) return null;
  if (S0.cls && S0.cls.info === info) return S0.cls;
  const p = SF.p, best = info.list[0].v, items = [];
  for (const c of info.list.slice(0, 4)) {
    if (p.drawn[c.m]) continue;
    const k = classify(p, c.m, f), d = { u: c.m, k, v: c.v, drop: Math.max(0, (best - c.v) / 2), book: !!c.book };
    if ((k.k === 'safeIn' || k.k === 'safeOut')) { const q = p.clone(); q.play(c.m); d.after = chainEst(q); }
    items.push(d);
  }
  const dirs = items.slice(0, 3);
  const second = items[1] ? items[1].drop : null;
  const r = { info, items, dirs, best: items[0], exact: info.exact, branch: info.exact && items.length >= 2 && items[1].drop < 0.25, sharp: info.exact && second != null && second >= 1 ? fmtB(second) : '', only: info.exact && second != null && second >= 3 };
  S0.cls = r; return r;
}
function gapOf(d, i, exact) {
  if (i === 0) return [d.book ? tx('gap.book') : tx('gap.best'), 'g0'];
  const pre = exact ? '' : '≈';
  if (d.drop < 0.25) return [tx('gap.eq'), 'g1'];
  return [pre + tx(d.drop < 1.5 ? 'gap.lt' : 'gap.bad', { x: fmtB(d.drop) }), d.drop < 1.5 ? 'g2' : 'g3'];
}
function tipsOf(f, cl, ol) {
  const out = [], add = (k, pr, v, hi) => out.push({ k, pr, v, hi });
  const n = game.n, dots = (n + 1) * (n + 1);
  if (f.caps) {
    if (f.cm && f.cm.forced === undefined) add(f.longNow + f.loops > 0 ? 'tp.capChoice' : 'tp.capLast', 100, null, 1);
    else add('tp.cap', 96, { n: f.caps }, 1);
  } else if (f.safe === 0) {
    add('tp.noSafe', 90, { k: f.minChain }, 1);
    if (f.twoChain) add('tp.two', 80);
  } else {
    if (f.safe <= 6) add('tp.fewSafe', 70, { n: f.safe });
    add('tp.third', f.stage === 'open' ? 40 : 30);
  }
  if (f.stage !== 'end') add('tp.rule', f.stage === 'open' ? 50 : 60, { d: dots, side: tx(f.me === 0 ? 'first' : 'second'), p: tx(f.even ? 'p.even' : 'p.odd') });
  if (f.fav >= 0 && f.stage === 'mid') add(f.fav === f.me ? 'tp.parityGood' : 'tp.parityBad', f.fav === f.me ? 64 : 76, { k: f.est.mode }, f.fav !== f.me);
  if (f.ctrl >= 0) add(f.ctrl === f.me ? 'tp.ctrlMe' : 'tp.ctrlOpp', 74);
  if (f.loops) add('tp.loop', 44);
  if (ol) { const m = cl && cl.exact ? 1 : 3; if (ol.d >= m) add('tp.winning', 46); else if (ol.d <= -m) add('tp.losing', 46); }
  if (cl && cl.branch) add('tp.branch', 54);
  if (cl && cl.sharp) add('tp.sharp', 58, { x: cl.sharp });
  if (f.stage === 'open') { add('tp.open1', 52); if (n === 3 && game.moves.length < 4) add('tp.open2', 34); }
  else if (f.stage === 'mid') add('tp.mid1', 20);
  else { add('tp.end1', 26); add('tp.end2', 18); }
  return out.sort((a, b) => b.pr - a.pr);
}
// the last move of the player (pvp: the last move) graded with the analysis stored for the position before it
function verdictHtml() {
  const log = SF.log; if (!log.length) return '';
  let i = log.length - 1;
  if (settings.mode === 'ai') { while (i >= 0 && log[i].pl !== game.human) i--; if (i < 0) return ''; }
  const e = game.moves[i], m = mv(e);
  const bv = bookVals(i);
  if (bv && bv.has(e)) {
    const best = Math.max(...bv.values()), v = bv.get(e);
    if (v >= best) return CoachKit.verdict(0, tx('prev', { m, q: esc(t('q.best')) }), gl(esc(tx('prevBook'))));
    const bm = [...bv].filter(x => x[1] === best).map(x => x[0]).slice(0, 2).map(x => edgeName(x)).join(' / ');
    return CoachKit.verdict(3, tx('prev', { m, q: esc(t('q.bad')) }), gl(esc(tx('prevBookTrap', { l: fmtB((best - v) / 2), m: bm }))) + '<br>' + esc(tx('tip.parity')));
  }
  const info = S0.info.get(keyAt(i)); if (!info || !info.list.length) return '';
  const it = info.list.find(x => x.m === e); if (!it) return '';
  const top = info.list[0], loss = Math.max(0, (top.v - it.v) / 2);
  const st = compute({ n: game.n, moves: game.moves.slice(0, i), human: game.human, setup: null }), p = st.p, f0 = facts(st);
  const quiet = !info.exact && p.gives(e) === 0 && p.gives(top.m) === 0 && !f0.caps;
  let g;
  if (info.exact) { const diff = st.scores[st.turn] - st.scores[1 - st.turn], res = v => Math.sign(diff + v); g = loss < 0.25 ? 0 : (loss >= 2 || res(it.v) < res(top.v)) ? 3 : 2; }
  else g = quiet ? (e === top.m ? 0 : 1) : loss < 1 ? (e === top.m ? 0 : 1) : loss < 2 ? 1 : loss < 4 ? 2 : 3;
  const q = ['best', 'good', 'dubious', 'bad'][g];
  let body = '';
  if (e === top.m || (info.exact && loss < 0.25)) body = esc(tx('prevBest', { c: tx('c.' + classify(p, e, f0).k) }));
  else {
    body = tx('prevAlt', { m: mv(top.m), c: esc(tx('c.' + classify(p, top.m, f0).k)) });
    if (g >= 2) body += sp() + esc(tx('prevLoss', { l: (info.exact ? '' : '≈') + fmtB(loss) }));
    if (g >= 2) {
      const kind = f0.caps && f0.cm && f0.cm.forced === undefined ? 'decline' : f0.safe && p.gives(e) > 0 && p.gives(top.m) === 0 ? 'gave' : f0.safe ? 'parity' : 'order';
      body += '<br>' + esc(tx('tip.' + kind));
    }
  }
  return CoachKit.verdict(g, tx('prev', { m, q: esc(t('q.' + q)) }), gl(body));
}
function render() {
  if (!card || !SF) return;
  if (DotsCoach.sw) DotsCoach.sw.sync();
  // the coach is for the game in progress: after the game (or while browsing earlier moves) it steps aside and the coach
  // tab shows the review card instead; before the review exists, a short note with a button that starts it
  const rvShow = !!document.querySelector('#reviewCard.show') && !lesson && !puzzle;
  const playing = !SF.over && viewPly === null && !rvShow;
  const on = active(), can = usable() && (playing || (SF.over && !rvShow));
  card.classList.toggle('hidden', !can);
  card.classList.toggle('ck-off', can && !on && !SF.over);
  document.body.classList.toggle('ck-tab', can || rvShow);
  if (rvShow && !S0.rvWas) { const b = document.querySelector('#mtabs [data-it=coach]'); if (b && getComputedStyle(b).display !== 'none' && document.body.dataset.it !== 'coach') b.click(); }
  S0.rvWas = rvShow;
  if (!can) { cancel(); clearHover(); return; }
  if (SF.over) {
    clearHover();
    put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('overRv'))}</p><div class="ck-sec"><button type="button" class="ck-rvgo" data-ck="rv">${esc(t('rv.btn'))}</button></div>` + (on ? verdictHtml() : ''));
    const b = card.querySelector('[data-ck=rv]'); if (b) b.onclick = () => { if (typeof runReview === 'function' && canReview()) runReview(); };
    return;
  }
  if (!on) { clearHover(); return put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('offNote'))}</p>`); }
  let f = null; try { f = facts(SF); } catch (e) { console.warn(e); }
  let h = `<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span>${!SF.over && f ? `<small>${esc(tx('st.' + f.stage))}</small>` : ''}</h3>`;
  if (SF.over) { clearHover(); h += `<p class="ck-muted">${esc(tx('over'))}</p>` + verdictHtml(); return put(h); }
  if (viewPly !== null) { clearHover(); h += `<p class="ck-muted">${esc(tx('viewing'))}</p>`; return put(h); }
  if (!myTurn()) { clearHover(); h += `<p class="ck-muted">${esc(tx(settings.mode === 'ai' ? 'aiTurn' : 'oppTurn'))}</p>` + verdictHtml(); return put(h); }
  if (!f) return put(h);
  const cur = game.moves.length, info = S0.info.get(keyAt(cur));
  if (!info) ask(cur);
  const cl = candInfo(info, f);
  // (early heuristic estimates are rough parity guesses: shown only once exact, or past the opening)
  const ol = info && info.list.length && (info.exact || f.stage !== 'open') ? outlook(SF, info.list[0].v, info.exact) : null;
  // summary chips
  const chips = [];
  if (ol && settings.eval) chips.push({ k: tx('form'), v: esc(ol.s), cls: ol.cls });
  chips.push({ k: tx('boxes'), v: esc(SF.scores[f.me] + '–' + SF.scores[1 - f.me]) });
  chips.push({ k: tx('stage'), v: esc(tx('st.' + f.stage) + (f.safe ? ' · ' + tx('safeN', { n: f.safe }) : '')) });
  const loopS = f.loops ? tx('ch.loops', { l: f.loops }) : '';
  chips.push({ k: tx('chainH'), v: esc(f.settled ? tx('ch.fixed', { k: f.longNow }) + loopS : f.stage === 'open' && !f.est.sure ? tx('ch.blob') : f.est.lo === f.est.hi || f.est.sure ? tx('ch.moyo', { k: f.est.mode }) : tx('ch.moyo2', { a: f.est.lo, b: f.est.hi })) });
  const aim = pl => { const ev = wantsEven(pl, game.n, f.dc), ok = f.fav < 0 ? '' : tx(f.fav === pl ? 'aim.ok' : 'aim.ng'); return { k: tx('aimH', { w: tx(pl === f.me ? 'you' : 'opp') }), v: esc(tx(ev ? 'aim.even' : 'aim.odd') + ok), cls: f.fav < 0 ? '' : f.fav === pl ? 'pos' : 'neg' }; };
  if (f.stage !== 'end') { chips.push(aim(f.me)); chips.push(aim(1 - f.me)); }
  else if (f.ctrl >= 0) chips.push({ k: tx('ctrlH'), v: esc(tx(f.ctrl === f.me ? 'ctrl.me' : 'ctrl.opp')), cls: f.ctrl === f.me ? 'pos' : 'neg' });
  h += CoachKit.summary(chips);
  const op = openingAt(cur);
  S0.items = [];
  if (op) {
    S0.items = op.map(d => d.u);
    const v = tx('op' + game.n + '.v');
    h += CoachKit.rec(tx('op.main'), gl(esc(tx('opWhy', { s: v }))), '');
    h += CoachKit.branches({
      head: tx('opH'), intro: gl(esc(tx('opIntro'))), reveal: true,
      items: op.map(d => ({ tag: tx('op.' + d.kind), cls: d.kind === 'main' ? 'c-mat' : d.kind === 'trap' ? 'c-mate' : 'c-dev', title: esc(d.t), text: gl(esc(d.x)), gap: d.kind === 'trap' ? tx('gap.lt', { x: fmtB(d.loss) }) : cur > 0 ? tx('op.best') : '', gcls: d.kind === 'trap' ? 'g3' : 'g0', move: String(d.u), mvName: edgeName(d.u) })),
    });
  } else if (game.n === 5 && cur < 2 && !cl) h += CoachKit.rec(tx('b.safeIn'), gl(esc(tx('op5.v'))), '');
  if (!op && cl && cl.best) {
    S0.items = cl.dirs.map(d => d.u);
    const b = cl.best;
    let why = esc(tx('recWhy', { c: tx('c.' + b.k.k) }) + (ol ? sp() + tx('recF', { f: ol.s }) : ''));
    if (f.caps && f.cm && f.cm.forced !== undefined) why += sp() + esc(tx('recForced'));
    else if (cl.only) why += sp() + esc(tx('recOnly')); else if (cl.sharp) why += sp() + esc(tx('recSharp', { x: cl.sharp })); else if (cl.branch) why += sp() + esc(tx('recBranch'));
    h += CoachKit.rec(tx('b.' + b.k.k), gl(why), RCLS[b.k.k] || '');
    h += CoachKit.branches({
      head: tx(cl.branch ? 'brH' : 'cdH'), intro: esc(tx(cl.branch ? 'brIntro' : 'cdIntro')), reveal: true,
      items: cl.dirs.map((d, i) => { const g = gapOf(d, i, cl.exact), dup = cl.dirs.slice(0, i).some(x => x.k.k === d.k.k); return { tag: tx('c.' + d.k.k), cls: CCLS[d.k.k] || '', title: ttl(d), text: gl(esc(dup ? (d.after ? tx('est', { k: d.after.mode, w: tx('you'), p: tx(f.even ? 'p.even' : 'p.odd') }) : '') : catTxt(d, f))), gap: g[0], gcls: g[1], move: String(d.u), mvName: edgeName(d.u) }; }),
    });
  } else if (!op) h += `<p class="ck-calc">${esc(tx('calc'))}</p>`;
  const tl = tipsOf(f, cl, ol);
  h += CoachKit.tips({ head: tx('tipsH'), list: tl.map(x => ({ html: gl(esc(tx(x.k, x.v || {}))), hi: x.hi })), open: S0.open, more: tx('more', { n: Math.max(0, tl.length - 3) }), less: tx('less') });
  h += verdictHtml();
  put(h);
}
function put(h) {
  if (card.dataset.h === h) return;
  const keep = card.scrollTop; card.dataset.h = h; card.innerHTML = h; card.scrollTop = keep;
  CoachKit.bind(card, {
    onMore: () => { S0.open = !S0.open; render(); },
    onReveal: () => { S0.reveal = !S0.reveal; try { settings.coachReveal = S0.reveal; save(); } catch (e) {} S0.hover = null; render(); drawNow(); },
    onHover: u => { S0.hover = u == null ? null : +u; drawNow(); },
  });
}
// candidate lines on the board: the hovered one (or, revealed, all of them numbered)
function clearHover() { if (S0.hover !== null) { S0.hover = null; drawNow(); } }
function drawNow() { if (typeof renderBoard === 'function' && S) renderBoard(false); }
function draw() {
  if (!active() || !SF || SF.over || viewPly !== null || !myTurn() || S !== SF) return;
  const list = S0.hover !== null ? [S0.hover] : [];
  list.forEach(e => {
    if (S.p.drawn[e]) return;
    const [x1, y1, x2, y2] = edgeXY(e);
    el('line', { x1, y1, x2, y2, class: 'ckline' }, gFx);
    const k = S0.items.indexOf(e) + 1;
    if (k > 0) { const g = el('g', { class: 'bl-num p' + S.turn + ' first' }, gFx); el('circle', { cx: (x1 + x2) / 2, cy: (y1 + y2) / 2, r: 14 }, g); const tt = el('text', { x: (x1 + x2) / 2, y: (y1 + y2) / 2 + 1 }, g); tt.textContent = k; }
  });
}
function init() {
  if (!window.CoachKit) return;
  if (settings.coach === undefined) settings.coach = true;
  CoachKit.css(); CoachKit.glossBind(() => (TX[L()] || TX.en).gl);
  card = document.getElementById('coachCard');
  DotsCoach.sw = CoachKit.sw({ mount: '.brand-r', get: () => !!settings.coach, set: v => setOn(v), label: on => ({ text: tx('sw'), title: tx('swT') + ' — ' + tx(on ? 'on' : 'off') }) });
  // follow the game: wrap the main script's refresh / renderInfo / renderBoard (classic-script globals)
  const _refresh = refresh, _renderInfo = renderInfo, _renderBoard = renderBoard;
  refresh = function () { const r = _refresh.apply(this, arguments); render(); return r; };
  renderInfo = function () { const r = _renderInfo.apply(this, arguments); render(); return r; };
  renderBoard = function () { const r = _renderBoard.apply(this, arguments); try { draw(); } catch (e) {} return r; };
  document.getElementById('langSel').addEventListener('change', relabel);
  { const rc = document.getElementById('reviewCard'); if (rc && window.MutationObserver) new MutationObserver(() => render()).observe(rc, { attributes: true, attributeFilter: ['class'] }); }
}
function setOn(v) {
  settings.coach = !!v; save();
  if (typeof toast === 'function') toast(tx(v ? 'on' : 'off'));
  S0.hover = null; render(); drawNow();
}
function relabel() { if (DotsCoach.sw) DotsCoach.sw.sync(); S0.cls = null; card && (card.dataset.h = ''); render(); }
function merge(more) { for (const l in more) TX[l] = Object.assign({}, TX[l] || {}, more[l], { gl: Object.assign({}, (TX[l] || {}).gl || {}, more[l].gl || {}) }); }
window.DotsCoach = { init, render, relabel, merge, tx, TX, active };
})();
