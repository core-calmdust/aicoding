'use strict';
// 囲碁コーチ (common spec: shared/COACH.md, model: shogi/coach.js) — shown while the player is to move against the AI (and in
// local two-player games): the position at a glance (形勢・アゲハマ・局面・布石の型・隅と弱い石), the recommended plan with its reason,
// the candidate directions (分かれ道: the AI's top candidates classified into plans — 石を取る・助ける・アタリ・切る・つなぐ・空き隅・
// シマリ・カカリ・三々入り・ヒラキ・大場・攻め・補強・ヨセ …, each titled with where it is played; the points are shown on demand and
// numbered on the board), prioritized "how to think" tips read from the position (アタリ・ダメ2つの石・コウ・空き隅・格言 …) and the
// verdict on the previous move (◎○△✕ with the AI's first choice and a 💡 tip from the review coach). The first moves are taught
// from opening theory (the first move's standard points, then the fuseki lines of openings.json) instead of raw evaluation.
// Texts: TX[lang] (en fallback); the other languages live in coach-i18n.js (GoCoach.merge).
// Hooks into app.js (classic-script globals): renderInfo → render, renderFx → board marks, afterPosition → candidate analysis.
(() => {
const TX = {
ja: {
  head: 'コーチ', sw: 'コーチ', swT: 'コーチ（考え方の解説）のオン／オフ', on: 'コーチ ON', off: 'コーチ OFF',
  offNote: 'コーチ機能はオフになっています。右上のスイッチをオンにすると、局面の考え方や候補手の解説が表示されます。',
  overRv: '対局が終わりました。分析すると、この欄に一手ごとの振り返り（最善手・悪手とその理由）が表示されます。',
  oppTurn: '相手の手番です。相手が次にどこに打ってくるか、予想してみよう。予想が当たるほど読みの力がつきます。', over: '対局が終わりました。棋譜の［分析］で一局を振り返れます。', viewing: '過去の局面を表示中です。最新の局面に戻るとコーチが再開します。', counting: '終局の確認中です。死に石を確かめてから「OK」を押しましょう。',
  calc: '候補手を考えています…', form: '形勢', caps: 'アゲハマ', stage: '局面', fuseki: '布石', who: '{k}（{w}）', meC: 'あなた', opC: '相手', area: '陣地', weak: '弱い石',
  'st.open': '序盤', 'st.mid': '中盤', 'st.end': '終盤（ヨセ）',
  'f.win': '勝勢', 'f.big': '優勢', 'f.adv': '有利', 'f.sl': 'やや有利', 'f.even': '互角', 'f.sld': 'やや不利', 'f.dis': '不利', 'f.bad': '劣勢', 'f.lost': '敗勢',
  lead: '{x}目リード', behind: '{x}目ビハインド',
  corners: '隅{a}（シマリ{b}）', weakN: '{n}か所', weak0: 'なし',
  moyo: '{n}模様', fixed: '{n}',
  'fk.sanrensei': '三連星', 'fk.nirensei': '二連星', 'fk.chinese': '中国流', 'fk.hchinese': '高中国流', 'fk.tasuki': 'たすき型', 'fk.tengen': '天元打ち', 'fk.54': '5の4', 'fk.33': '3の3',
  recWhy: 'この局面の第一候補は「{c}」の方針です。形勢は{f}（{l}）。',
  recSharp: '2番目の候補との差が大きく（{x}目）、ここは正確に打ちたい局面です。',
  recBranch: '候補どうしの差が小さい分かれ道です。下の候補から好きな方針を選べます。',
  recOnly: 'ほかの手は大きく損をします。迷わず打ちたい局面です。',
  brH: '分かれ道 — 選べる方針', brIntro: 'どれを選んでも大差はありません。自分の好きな方針で打つのが上達の近道です。',
  cdH: '候補手と方針', cdIntro: '上位の候補を、方針ごとに解説します。',
  'gap.best': '最善', 'gap.eq': 'ほぼ同じ', 'gap.lt': '少し劣る', 'gap.bad': '劣る', 'gap.pts': '−{x}目',
  // areas
  'a.tl': '左上の隅', 'a.tr': '右上の隅', 'a.bl': '左下の隅', 'a.br': '右下の隅', 'a.t': '上辺', 'a.b': '下辺', 'a.l': '左辺', 'a.r': '右辺', 'a.c': '中央',
  black: '黒', white: '白', at: '{a}（{s}）',
  // opening (first move / fuseki book)
  opH: '序盤の分かれ道 — 最初の一手', opIntro: '序盤は評価値の小さな差より、布石の考え方が大切です。まずは定番の2つを覚え、慣れたら変わり種も試してみよう。', 'op.main': '定番', 'op.alt': '変わり種',
  'op.hoshi.t': '{a}の星（4の4）に打つ', 'op.hoshi.x': '星は一手で隅を大まかに占められるので、シマリを急がずに次の大場へ向かえます。その代わり三々が空いているので、三々入りやカカリには「どちらに厚みを作るか」を考えて受けます。',
  'op.komoku.t': '{a}の小目（3の4）に打つ', 'op.komoku.x': '小目は星より低く地に辛い着点。シマリを一手打てば隅が堅くなります。シマリの向き（どちらの辺を向くか）が布石の方向を決めます。',
  'op.sansan.t': '{a}の三々（3の3）に打つ', 'op.sansan.x': '三々は一手で隅の地を確保できる、最も地に辛い着点。そのぶん位置が低く、外側から押さえ込まれて相手に厚みを与えやすいのが弱点です。',
  'op.takamoku.t': '{a}の高目（4の5）に打つ', 'op.takamoku.x': '高目は隅の地より外側の勢力を重視した着点。隅が空いているので、相手は小目や三々に入ってきます。',
  'op.tengen.t': '天元（中央の点）に打つ', 'op.tengen.x': '9路盤では初手の天元が最善とされます。盤が小さいので中央の一手が四隅すべてに働き、相手が打った反対側を守る・攻めるという選択ができます。',
  'op.54.t': '天元の一つ下（5の4）に打つ', 'op.54.x': '天元より少し辺寄りで、地を意識しながら中央にも働く、地と勢力のバランス型です。',
  'op.33.t': '{a}の3の3に打つ', 'op.33.x': '9路盤の星にあたる点。隅は確保できますが、天元を相手に取られると外から圧迫されがちで、AIの評価では天元より少し損とされます。',
  bkH: '布石の定番 — この進行の続き', bkIntro: 'この局面は、布石集（［レッスン］の定石・布石）に収録された進行の途中です。序盤は評価値の小さな差より、布石の考え方どおりに打つことが大切です。', 'bk.n': '布石集{n}件',
  'bk.t': '{a}に打つ（{s}）', bkWhy: 'この局面は布石集の範囲です。「{s}」では次に{a}に打ちます。',
  prevBook: '布石集どおりの手です（{s}）。', prevOpen: '序盤の一手です。序盤は「一隅、二シマリ・カカリ、三ヒラキ」の順で大きいところを考えよう。',
  // categories: tag / badge / explanation
  'c.cap': '石を取る', 'b.cap': '石を取る', 'x.cap': '{a}の相手の石を取る方針。取った石はアゲハマになり、取った跡は確実な地になります。取ったあとに自分の石の形が弱くならないかも確かめよう。',
  'c.save': '助ける', 'b.save': '石を助ける', 'x.save': 'アタリやダメの少ない自分の石を、ノビたりつないだりしてダメを増やす方針。大事な石なら助け、小さな石なら取らせて他の大きな手に回る判断もあります。',
  'c.atari': 'アタリ', 'b.atari': 'アタリをかける', 'x.atari': '相手の石のダメを残り1つにする方針。相手は逃げるか取られるかを選ばなければなりません。ただ、意味のないアタリは相手を強くするだけなので、取れるか・形を崩せるかを確かめてから。',
  'c.cut': '切る', 'b.cut': '切る', 'x.cut': '相手の石の間に打って、つながりを断つ方針。分断された相手の石はそれぞれ眼を作る必要があり、攻めの目標になります。切った自分の石が取られないかも読もう。',
  'c.connect': 'つなぐ', 'b.connect': 'つなぐ', 'x.connect': '自分の石どうしをつなげて一つにまとめる方針。つながった石はダメが増えて取られにくくなります。「一石に負けなし」――石がつながっていれば大きく負けることはありません。',
  'c.corner': '空き隅', 'b.corner': '空き隅を占める', 'x.corner': 'まだ誰も打っていない隅を占める方針。隅は二辺に囲まれていて地を作りやすいので、「一隅、二シマリ・カカリ、三ヒラキ」と言われる最優先の場所です。',
  'c.shimari': 'シマリ', 'b.shimari': '隅をシマる', 'x.shimari': '隅の自分の石にもう一手加えて、隅の地を固める方針（シマリ）。相手のカカリを防ぎ、辺に向かう足場にもなります。',
  'c.kakari': 'カカリ', 'b.kakari': 'カカる', 'x.kakari': '相手の隅の石に近づいて、シマリを妨げる方針（カカリ）。布石の格言ではシマリと同じくらい大きな手とされます。',
  'c.invade': '三々入り', 'b.invade': '三々に入る', 'x.invade': '相手の星の下の三々に入り、隅の地を取る方針。今ではAIの影響で序盤からよく打たれますが、相手に外側の厚みを与えるので、その厚みが働かない場面で打つのがコツです。',
  'c.extend': 'ヒラキ', 'b.extend': 'ヒラく', 'x.extend': '辺に向かって間を空けて打ち、石の根拠と勢力圏を広げる方針（ヒラキ）。「二立三析」――二子の壁からは三間ヒラくのが目安です。',
  'c.big': '大場', 'b.big': '大場に打つ', 'x.big': 'まだ広く空いている大きな場所（大場）に先に打つ方針。ただし弱い石や切断の危険があるときは「大場より急場」で、そちらが先です。',
  'c.contact': '接近戦', 'b.contact': 'ツケて戦う', 'x.contact': '相手の石に直接くっつけて（ツケ・ハネなど）、形を決めにいく方針。接触した戦いでは石のダメと形が大事。「ツケにはハネよ、ハネにはノビよ」が基本です。',
  'c.attack': '攻め', 'b.attack': '攻める', 'x.attack': '相手の弱い石（ダメが少ない・眼がない石）に迫る方針。攻めながら自分の地や厚みを作るのが理想です。「攻めは地にあり」――取ることより、攻めの過程で得をすることを考えよう。',
  'c.defend': '補強', 'b.defend': '補強する', 'x.defend': '自分の弱い石を補強して、攻められないようにする方針。弱い石が二つ以上できると両方は守りきれません。早めの手入れが大切です。',
  'c.center': '中央へ', 'b.center': '中央に出る', 'x.center': '石を中央に向けて進め、相手に封鎖されないようにする方針。「一間トビに悪手なし」――中央へは一間トビが速くて切られにくい手です。',
  'c.yose': 'ヨセ', 'b.yose': 'ヨセる', 'x.yose': '地の境界を決めていく方針（ヨセ）。相手が受けないといけない先手のヨセから、そして大きい順に打つのが基本です。',
  'c.shape': '整える', 'b.shape': '形を整える', 'x.shape': '石の形を整えて、次の戦いに備える方針。急ぐ場所がないときは、一手の価値が高い場所を選ぼう。',
  'c.pass': 'パス', 'b.pass': 'パスする', 'x.pass': 'もう打つべきところが残っていないときはパスします。両者が続けてパスすると終局です。',
  // titles: where
  'tt.cap': '{a}の{c}石{n}子を取る', 'tt.save': '{a}の自分の石{n}子を助ける', 'tt.atari': '{a}の{c}石にアタリをかける', 'tt.cut': '{a}で{c}石を切る', 'tt.connect': '{a}で自分の石をつなぐ',
  'tt.corner': '{a}の空き隅を占める', 'tt.shimari': '{a}をシマる', 'tt.kakari': '{a}の{c}石にカカる', 'tt.invade': '{a}の三々に入る', 'tt.extend': '{a}にヒラく', 'tt.big': '{a}の大場に打つ',
  'tt.contact': '{a}で{c}石にツケる', 'tt.attack': '{a}の{c}石を攻める', 'tt.defend': '{a}の自分の石を補強する', 'tt.center': '{a}に向かって打つ', 'tt.yose': '{a}のヨセ', 'tt.shape': '{a}で形を整える', 'tt.pass': 'パスする',
  // tips
  tipsH: '考え方のヒント', more: 'ほかのヒント（{n}）', less: 'たたむ',
  'tp.myAtari': '{a}のあなたの石{n}子がアタリです（ダメが残り1つ）。逃げる（ノビる・つなぐ）か、取らせて別の大きな手に回るかを判断しよう。',
  'tp.oppAtari': '{a}の相手の石{n}子がアタリです。取れば確実な得になります。逃げられる前に取るか、他にもっと大きな手があるか比べよう。',
  'tp.myWeak': '{a}のあなたの石{n}子はダメが2つしかありません。次にアタリをかけられる前に、ダメを増やす手を考えよう。',
  'tp.oppWeak': '{a}の相手の石{n}子はダメが2つ。アタリをかけたり逃げ道をふさいだりして攻めるチャンスです。',
  'tp.ko': 'コウができています。取られた直後に取り返すことはできません。他に相手が受けないといけない手（コウダテ）を打ってから取り返そう。',
  'tp.oppPass': '相手がパスしました。打つところが残っていなければ、あなたもパスすると終局（地の計算）です。まだ境界が決まっていない場所があれば打ちましょう。',
  'tp.emptyCorner': 'まだ空いている隅が{n}つあります。「一隅、二シマリ・カカリ、三ヒラキ」――隅は辺より、辺は中央より地を作りやすい場所です。',
  'tp.order': '布石の順序は「隅 → 辺 → 中央」。隅は二辺、辺は一辺に守られているので、少ない石で地が作れます。',
  'tp.lines': '「四線は勢力、三線は地」。三線に打つと地になり、四線に打つと外側への勢力（厚み）になります。二線は生きるための手です。',
  'tp.urgent': '「大場より急場」。広い場所（大場）より、弱い石の補強や切断の防ぎ（急場）が先です。',
  'tp.atsumi': '「厚みに近寄るな」。相手の厚い石の近くに打つと攻められます。逆に自分の厚みは地を囲うより、相手の石を攻めるのに使おう。',
  'tp.ikken': '「一間トビに悪手なし」。中央へ逃げたり進出したりするときは、一間トビが速くて切られにくい手です。',
  'tp.chase': '「追うはケイマ、逃げは一間」。相手の石を追うときはケイマ、自分が逃げるときは一間トビが基本です。',
  'tp.shicho': '「シチョウ知らずに碁を打つな」。アタリをかけ続けて取るシチョウは、先の石（シチョウアタリ）があると失敗します。最後まで読んでから。',
  'tp.yose1': 'ヨセは相手が受けないといけない先手の手から、そして大きい順に打つのが基本です。',
  'tp.yose2': '「ダメのツマリが身のつまり」。自分の石のダメを無理に詰めると、思わぬ手が生まれて損をします。',
  'tp.winning': '優勢です。無理に戦わず、自分の弱い石をなくす堅い手で差を守ろう。',
  'tp.losing': '劣勢です。普通の手では差が縮まりません。相手の地に打ち込む・弱い石を攻めるなど、勝負の手を探そう。',
  'tp.capsUp': 'アゲハマはあなたが{x}個多く取っています（日本ルールでは1個＝1目）。',
  'tp.branch': '候補手の差が小さい「分かれ道」です。地を取るか、厚みを取るか、方針を先に決めてから手を選ぶのが上達のコツ。',
  'tp.sharp': '最善手と2番目の手の差が大きい局面です（{x}目）。ここを正確に打てるかが勝負の分かれ目。',
  'tp.small': '小さな碁盤では序盤からすぐに石がぶつかります。「相手の石は分断し、自分の石はつなげる」が基本です。',
  // verdict
  prev: '前の手 {m}：{q}', q0: '最善', q1: '好手', q2: '疑問手', q3: '悪手',
  prevBest: '{c}の方針で、AIの第一候補と同じ手です。', prevAlt: 'AIの第一候補は {m}（{c}）でした。', prevAltOk: 'AIの第一候補 {m}（{c}）と同じくらい良い手です。', prevLoss: '約{x}目の損です。',
  gl: {
    atari: { m: ['アタリ'], t: 'アタリ', d: 'ダメ（呼吸点）が残り1つになり、次に取られそうな状態。' },
    dame: { m: ['ダメ'], t: 'ダメ（呼吸点）', d: '石のとなり（上下左右）の空いている点。全部ふさがれると石は取られます。' },
    shimari: { m: ['シマリ', 'シマる'], t: 'シマリ', d: '隅の自分の石にもう一手加えて、隅の地を固める手。' },
    kakari: { m: ['カカリ', 'カカる'], t: 'カカリ', d: '相手の隅の石に近づいて、シマリを妨げる手。' },
    hiraki: { m: ['ヒラキ', 'ヒラく'], t: 'ヒラキ', d: '辺に向かって間を空けて打ち、石の根拠と勢力圏を広げる手。' },
    sansan: { m: ['三々'], t: '三々（さんさん）', d: '隅から数えて3の3の点。一手で隅の地を確保できます。' },
    hoshi: { m: ['星'], t: '星', d: '隅から数えて4の4の点（9路盤では3の3）。盤上の黒い点の位置です。' },
    komoku: { m: ['小目'], t: '小目（こもく）', d: '隅から数えて3の4の点。星より低く、地に辛い着点です。' },
    takamoku: { m: ['高目'], t: '高目（たかもく）', d: '隅から数えて4の5の点。外側の勢力を重視した着点です。' },
    tengen: { m: ['天元'], t: '天元', d: '碁盤のまん中の点。' },
    ooba: { m: ['大場'], t: '大場（おおば）', d: 'まだ広く空いている、価値の大きい場所。' },
    kyuba: { m: ['急場'], t: '急場（きゅうば）', d: '弱い石の補強や切断の防ぎなど、急いで打つべき場所。大場より優先します。' },
    atsumi: { m: ['厚み'], t: '厚み', d: '外側に向いた、取られる心配のない強い石の集まり。攻めや模様作りに働きます。' },
    ko: { m: ['コウダテ', 'コウ'], t: 'コウ', d: '一子を取り合える形。取られた直後には取り返せないので、先に別の場所に相手が受けるべき手（コウダテ）を打ちます。' },
    yose: { m: ['ヨセ'], t: 'ヨセ', d: '終盤に地の境界を決めていく手。' },
    sente: { m: ['先手'], t: '先手', d: '相手が受けないといけない手。打ったあとも自分の番が続きます。' },
    agehama: { m: ['アゲハマ'], t: 'アゲハマ', d: '取った相手の石。日本ルールでは終局時に相手の地を1個につき1目減らします。' },
    jiban: { m: ['根拠'], t: '根拠', d: '辺で眼を作れる足場。根拠のある石は攻められにくくなります。' },
    ikken: { m: ['一間トビ'], t: '一間トビ', d: '自分の石から一つ間を空けてまっすぐ打つ手。' },
    keima: { m: ['ケイマ'], t: 'ケイマ', d: '将棋の桂馬のように、一つ横・二つ前に打つ形。' },
    shicho: { m: ['シチョウ'], t: 'シチョウ', d: 'アタリをかけ続けて、階段状に追いかけて取る手筋。' },
    fuseki: { m: ['布石'], t: '布石', d: '序盤の石の配置。二連星・三連星・中国流などの型があります。' },
    tsuke: { m: ['ツケ'], t: 'ツケ', d: '相手の石に直接くっつけて打つ手。' },
    kiru: { m: ['切る', '切断'], t: '切る', d: '相手の石のつながりを断つ手。' },
  },
},
en: {
  head: 'Coach', sw: 'Coach', swT: 'Turn the coach (how-to-think tips) on / off', on: 'Coach ON', off: 'Coach OFF',
  offNote: 'The coach is switched off. Turn on the switch at the top right to see how to think about the position and the candidate moves explained.',
  overRv: 'The game is over. Analyze it to see a move-by-move review here (best moves, mistakes and why).',
  oppTurn: "It's your opponent's turn. Try to guess where they will play next — the more often you guess right, the stronger your reading gets.", over: 'The game is over. Use [Analyze] in the record to review it.', viewing: 'You are looking at an earlier position. The coach resumes at the latest position.', counting: 'Counting the result. Check the dead stones, then press OK.',
  calc: 'Thinking about candidate moves…', form: 'Position', caps: 'Prisoners', stage: 'Phase', fuseki: 'Opening', who: '{k} ({w})', meC: 'you', opC: 'opponent', area: 'Corners', weak: 'Weak groups',
  'st.open': 'Opening', 'st.mid': 'Middle game', 'st.end': 'Endgame',
  'f.win': 'winning', 'f.big': 'clearly better', 'f.adv': 'better', 'f.sl': 'slightly better', 'f.even': 'equal', 'f.sld': 'slightly worse', 'f.dis': 'worse', 'f.bad': 'clearly worse', 'f.lost': 'losing',
  lead: 'ahead by {x}', behind: 'behind by {x}',
  corners: '{a} corners ({b} enclosed)', weakN: '{n}', weak0: 'none',
  moyo: 'heading for {n}', fixed: '{n}',
  'fk.sanrensei': 'Sanrensei', 'fk.nirensei': 'Nirensei', 'fk.chinese': 'Chinese', 'fk.hchinese': 'High Chinese', 'fk.tasuki': 'Diagonal', 'fk.tengen': 'Tengen opening', 'fk.54': '5-4 point', 'fk.33': '3-3 point',
  recWhy: 'The first choice here is the "{c}" plan. Your position: {f} ({l}).',
  recSharp: 'The gap to the second choice is large ({x} points) — a moment to play precisely.',
  recBranch: 'The candidates are close: a branching position. Pick the plan you like from the list below.',
  recOnly: 'Every other move loses a lot here — play it without hesitating.',
  brH: 'Branching point — plans to choose from', brIntro: 'None of these is much worse than the others. Playing the plan that suits you is the fastest way to improve.',
  cdH: 'Candidates and their plans', cdIntro: 'The top candidates, explained plan by plan.',
  'gap.best': 'best', 'gap.eq': 'about equal', 'gap.lt': 'a bit worse', 'gap.bad': 'worse', 'gap.pts': '−{x} pts',
  'a.tl': 'the top-left corner', 'a.tr': 'the top-right corner', 'a.bl': 'the bottom-left corner', 'a.br': 'the bottom-right corner', 'a.t': 'the top side', 'a.b': 'the bottom side', 'a.l': 'the left side', 'a.r': 'the right side', 'a.c': 'the centre',
  black: 'Black', white: 'White', at: '{a} ({s})',
  opH: 'Opening crossroads — the first move', opIntro: 'In the opening, the ideas of the fuseki matter more than small evaluation differences. Learn the two standard choices first, then try the unusual ones.', 'op.main': 'Standard', 'op.alt': 'Unusual',
  'op.hoshi.t': 'Star point (4-4) in {a}', 'op.hoshi.x': 'The 4-4 point claims a corner roughly in one move, so you can head for the next big point without enclosing. The 3-3 point stays open, so when the opponent invades or approaches, decide which way your thickness should face.',
  'op.komoku.t': '3-4 point in {a}', 'op.komoku.x': 'The 3-4 point is lower than the star and more territorial: one enclosure makes the corner solid. The direction of the enclosure decides which side your opening faces.',
  'op.sansan.t': '3-3 point in {a}', 'op.sansan.x': 'The 3-3 point secures the corner territory in one move — the most territorial point. Being low, it can be blocked from outside, giving the opponent thickness.',
  'op.takamoku.t': '5-4 point (takamoku) in {a}', 'op.takamoku.x': 'The 5-4 point values outside influence over corner territory. The corner stays open, so the opponent will come in at the 3-4 or 3-3 point.',
  'op.tengen.t': 'The centre point (tengen)', 'op.tengen.x': 'On 9×9 the centre point is considered the best first move. The board is so small that a central stone works toward all four corners: wherever the opponent plays, you can defend or attack on the other side.',
  'op.54.t': 'One below the centre (5-4)', 'op.54.x': 'Slightly toward a side: it keeps territory in mind while still working in the centre — a balance of territory and influence.',
  'op.33.t': '3-3 point in {a}', 'op.33.x': "The star point of a 9×9 board. It secures a corner, but if the opponent takes the centre you tend to be pressed from outside; AI rates it a little below tengen.",
  bkH: 'Standard fuseki — how this line continues', bkIntro: 'This position is in the middle of a line from the opening collection ([Lessons] → joseki & fuseki). In the opening, following the ideas of the fuseki matters more than small evaluation differences.', 'bk.n': '{n} book lines',
  'bk.t': 'Play in {a} ({s})', bkWhy: 'This position is still in the opening collection. In "{s}" the next move goes to {a}.',
  prevBook: 'A move from the opening collection ({s}).', prevOpen: 'An opening move. In the opening think in this order: empty corners, then enclosures and approaches, then extensions.',
  'c.cap': 'Capture', 'b.cap': 'Capture', 'x.cap': 'Capture the opponent stones in {a}. Captured stones become prisoners and the empty points left behind become sure territory. Check that your own shape is not weakened afterwards.',
  'c.save': 'Save', 'b.save': 'Save stones', 'x.save': 'Extend or connect your stones that are in atari or short of liberties. Save them if they are important; if they are small, letting them go and playing a bigger move elsewhere can be better.',
  'c.atari': 'Atari', 'b.atari': 'Atari', 'x.atari': "Reduce an opponent group to one liberty: they must run or lose it. Pointless ataris only strengthen the opponent, so make sure you can capture or spoil their shape.",
  'c.cut': 'Cut', 'b.cut': 'Cut', 'x.cut': "Play between the opponent's stones to cut them apart. Separated stones each need eyes and become targets. Read whether your cutting stone can be captured.",
  'c.connect': 'Connect', 'b.connect': 'Connect', 'x.connect': 'Join your stones into one group. Connected stones have more liberties and are harder to capture — keep your stones connected.',
  'c.corner': 'Empty corner', 'b.corner': 'Take a corner', 'x.corner': 'Take a corner nobody has played in yet. Corners are bounded by two edges, so territory is easiest to make there: "empty corner, then enclosure or approach, then extension".',
  'c.shimari': 'Enclosure', 'b.shimari': 'Enclose', 'x.shimari': 'Add a second stone to your corner stone to secure the corner (an enclosure). It prevents an approach and becomes a base toward the sides.',
  'c.kakari': 'Approach', 'b.kakari': 'Approach', 'x.kakari': "Approach the opponent's corner stone to stop it from enclosing. The opening proverb treats an approach as about as big as an enclosure.",
  'c.invade': '3-3 invasion', 'b.invade': 'Invade at 3-3', 'x.invade': "Invade at the 3-3 point under the opponent's star point and take the corner. Since AI it is played early and often, but it gives the opponent outside thickness — play it where that thickness will not work well.",
  'c.extend': 'Extension', 'b.extend': 'Extend', 'x.extend': 'Extend along the side, leaving space, to make a base and widen your area. "From two stones, extend three" is a reliable default.',
  'c.big': 'Big point', 'b.big': 'Big point', 'x.big': 'Play a big open area first. But when you have a weak group or a cutting point, "urgent points before big points".',
  'c.contact': 'Contact fight', 'b.contact': 'Attach', 'x.contact': 'Touch the opponent stones (attach, hane) to settle the shape. In contact fights liberties and shape decide: "answer the attachment with a hane".',
  'c.attack': 'Attack', 'b.attack': 'Attack', 'x.attack': "Press the opponent's weak group (few liberties, no eyes). Ideally you build territory or thickness while attacking — gain from the attack rather than trying to capture.",
  'c.defend': 'Reinforce', 'b.defend': 'Reinforce', 'x.defend': 'Strengthen your own weak group before it gets attacked. With two weak groups you cannot defend both, so mend them early.',
  'c.center': 'Toward the centre', 'b.center': 'Head out', 'x.center': 'Move your stones toward the centre so they are not sealed in. A one-point jump is fast and hard to cut.',
  'c.yose': 'Endgame', 'b.yose': 'Endgame move', 'x.yose': 'Settle the borders of the territories (endgame). Play the sente moves first (those the opponent must answer), then the biggest ones.',
  'c.shape': 'Shape', 'b.shape': 'Improve shape', 'x.shape': 'Tidy your shape and get ready for the next fight. When nothing is urgent, choose the move worth the most.',
  'c.pass': 'Pass', 'b.pass': 'Pass', 'x.pass': 'Pass when no useful move is left. Two passes in a row end the game.',
  'tt.cap': 'Capture {n} {c} stone(s) in {a}', 'tt.save': 'Save your {n} stone(s) in {a}', 'tt.atari': 'Atari on the {c} stones in {a}', 'tt.cut': 'Cut the {c} stones in {a}', 'tt.connect': 'Connect your stones in {a}',
  'tt.corner': 'Take {a}', 'tt.shimari': 'Enclose {a}', 'tt.kakari': 'Approach the {c} stone in {a}', 'tt.invade': 'Invade the 3-3 point in {a}', 'tt.extend': 'Extend on {a}', 'tt.big': 'Big point on {a}',
  'tt.contact': 'Attach to the {c} stones in {a}', 'tt.attack': 'Attack the {c} stones in {a}', 'tt.defend': 'Reinforce your stones in {a}', 'tt.center': 'Head toward {a}', 'tt.yose': 'Endgame move on {a}', 'tt.shape': 'Improve your shape in {a}', 'tt.pass': 'Pass',
  tipsH: 'How to think', more: 'More tips ({n})', less: 'Show less',
  'tp.myAtari': 'Your {n} stone(s) in {a} are in atari (one liberty left). Decide: run (extend / connect) or let them go and play a bigger move.',
  'tp.oppAtari': 'The opponent\'s {n} stone(s) in {a} are in atari. Capturing is a sure gain — take them, or compare with an even bigger move.',
  'tp.myWeak': 'Your {n} stones in {a} have only two liberties. Add liberties before they get put in atari.',
  'tp.oppWeak': "The opponent's {n} stones in {a} have only two liberties — a chance to attack with an atari or by blocking their way out.",
  'tp.ko': 'There is a ko. You cannot retake right after being captured: first play a move the opponent must answer (a ko threat), then retake.',
  'tp.oppPass': 'Your opponent passed. If nothing is left to play, pass too and the game is counted. If a border is still open, play there first.',
  'tp.emptyCorner': '{n} corner(s) are still empty. Empty corner, then enclosure or approach, then extension — corners are easier than sides, sides easier than the centre.',
  'tp.order': 'Opening order: corners → sides → centre. A corner is protected by two edges and a side by one, so fewer stones make territory there.',
  'tp.lines': 'Fourth line for influence, third line for territory, second line for emergencies.',
  'tp.urgent': 'Urgent points before big points: strengthen weak groups and prevent cuts before taking a big open area.',
  'tp.atsumi': "Don't approach thickness — stones near the opponent's strong wall get attacked. Use your own thickness to attack, not to enclose territory.",
  'tp.ikken': 'The one-point jump is rarely bad: to run or head for the centre, it is fast and hard to cut.',
  'tp.chase': 'Chase with a knight\'s move, run with a one-point jump.',
  'tp.shicho': 'If you don\'t know ladders, don\'t play Go: a ladder fails when a stone of the defender stands in its path (a ladder breaker). Read it to the end.',
  'tp.yose1': 'Endgame: play sente moves first (the ones the opponent must answer), then the biggest.',
  'tp.yose2': 'Don\'t fill your own liberties needlessly — short liberties create tricks against you.',
  'tp.winning': 'You are ahead. No need to fight: play solid moves that leave you no weak groups.',
  'tp.losing': 'You are behind. Normal moves won\'t close the gap — invade the opponent\'s area or attack a weak group.',
  'tp.capsUp': 'You have captured {x} more stones (in Japanese rules each prisoner is one point).',
  'tp.branch': 'The candidates are close — a branching point. Decide your plan first (territory or thickness), then pick the move.',
  'tp.sharp': 'The best move is much better than the second ({x} points). Finding it may decide the game.',
  'tp.small': 'On a small board stones meet at once: separate the opponent\'s stones and keep your own connected.',
  prev: 'Previous move {m}: {q}', q0: 'Best', q1: 'Good', q2: 'Doubtful', q3: 'Mistake',
  prevBest: 'A "{c}" move — the same as the AI\'s first choice.', prevAlt: "The AI's first choice was {m} ({c}).", prevAltOk: "About as good as the AI's first choice, {m} ({c}).", prevLoss: 'About {x} points lost.',
  gl: {
    atari: { m: ['atari'], t: 'Atari', d: 'A group with only one liberty left: it can be captured next move.' },
    dame: { m: ['liberties', 'liberty'], t: 'Liberties', d: 'The empty points next to a group (up, down, left, right). When all are filled, the group is captured.' },
    shimari: { m: ['enclosure', 'Enclose'], t: 'Enclosure (shimari)', d: 'A second stone added to your corner stone to secure the corner.' },
    kakari: { m: ['approach', 'Approach'], t: 'Approach (kakari)', d: "A move next to the opponent's corner stone that stops it from enclosing." },
    hiraki: { m: ['extension', 'Extend'], t: 'Extension (hiraki)', d: 'A move along the side, leaving space, that widens your base.' },
    sansan: { m: ['3-3 point'], t: '3-3 point', d: 'The point three lines from both edges: it takes the corner territory in one move.' },
    hoshi: { m: ['4-4 point', 'star point'], t: 'Star point', d: 'The 4-4 point (3-3 on 9×9): the dots on the board.' },
    tengen: { m: ['tengen'], t: 'Tengen', d: 'The centre point of the board.' },
    ooba: { m: ['big point'], t: 'Big point', d: 'A large open area of high value.' },
    kyuba: { m: ['urgent points', 'Urgent points'], t: 'Urgent point', d: 'A move that must be played now — mending a weak group, preventing a cut. It comes before big points.' },
    atsumi: { m: ['thickness'], t: 'Thickness', d: 'A strong wall of stones facing outward, in no danger of capture: it helps you attack and build frameworks.' },
    ko: { m: ['ko threat', 'ko'], t: 'Ko', d: 'A shape where one stone can be captured back and forth. You cannot retake at once: first play a threat the opponent must answer.' },
    sente: { m: ['sente'], t: 'Sente', d: 'A move the opponent must answer, so you keep the initiative.' },
    prisoners: { m: ['prisoner'], t: 'Prisoners', d: "Captured stones. In Japanese rules each one takes a point off the opponent's score." },
    ladder: { m: ['ladder'], t: 'Ladder', d: 'Capturing by giving atari again and again in a zigzag across the board.' },
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
const ptsS = x => { x = Math.round(Math.abs(x) * 10) / 10; return x % 1 ? x.toFixed(1) : String(x); };

// --------------------------------------------------------------------------------------------- position facts
const xy = (i, n) => [i % n, (i / n) | 0];
const line = (i, n) => { const [x, y] = xy(i, n); return Math.min(x, y, n - 1 - x, n - 1 - y) + 1; };
const band = n => n >= 19 ? 6 : n >= 13 ? 5 : 3;
// the area of a point: corner / side / centre
function areaOf(i, n) {
  const [x, y] = xy(i, n), b = band(n), h = x < b ? 'l' : x > n - 1 - b ? 'r' : '', v = y < b ? 't' : y > n - 1 - b ? 'b' : '';
  return h && v ? v + h : h || v || 'c';
}
const aName = (i, n) => tx('a.' + areaOf(i, n));
const cName = c => tx(c === 1 ? 'black' : 'white');
function groupsOf(pos) {
  const n = pos.n, seen = new Uint8Array(n * n), out = [];
  for (let i = 0; i < n * n; i++) { if (!pos.b[i] || seen[i]) continue; const g = pos.group(i); for (const q of g.stones) seen[q] = 1; g.c = pos.b[i]; g.id = out.length; out.push(g); }
  const gid = new Int16Array(n * n).fill(-1); out.forEach(g => g.stones.forEach(q => (gid[q] = g.id)));
  return { list: out, gid };
}
// the most representative point of a group (closest to its centre of mass)
function midOf(g, n) { let sx = 0, sy = 0; for (const q of g.stones) { const [x, y] = xy(q, n); sx += x; sy += y; } sx /= g.stones.length; sy /= g.stones.length; let best = g.stones[0], bd = 1e9; for (const q of g.stones) { const [x, y] = xy(q, n), d = (x - sx) ** 2 + (y - sy) ** 2; if (d < bd) { bd = d; best = q; } } return best; }
// corners: 'tl' 'tr' 'bl' 'br' → stones of each colour in the corner box (lines ≤ 5 / smaller boards ≤ band)
function cornerStones(pos, k) {
  const n = pos.n, b = n >= 19 ? 6 : n >= 13 ? 5 : 4, out = { 1: [], 2: [] };
  for (let y = 0; y < b; y++) for (let x = 0; x < b; x++) {
    const X = k[1] === 'l' ? x : n - 1 - x, Y = k[0] === 't' ? y : n - 1 - y, i = Y * n + X, c = pos.b[i];
    if (c) out[c].push(i);
  }
  return out;
}
const CORNERS = ['tl', 'tr', 'bl', 'br'];
function cornerOf(i, n) { const a = areaOf(i, n); return a.length === 2 ? a : null; }
// the type of a corner point: hoshi (4-4) / komoku (3-4) / sansan (3-3) / takamoku (4-5) / hazushi (3-5)
function ptType(i, n) {
  const [x, y] = xy(i, n), a = Math.min(x, n - 1 - x) + 1, b = Math.min(y, n - 1 - y) + 1, lo = Math.min(a, b), hi = Math.max(a, b);
  return lo === 4 && hi === 4 ? 'hoshi' : lo === 3 && hi === 4 ? 'komoku' : lo === 3 && hi === 3 ? 'sansan' : lo === 4 && hi === 5 ? 'takamoku' : lo === 3 && hi === 5 ? 'hazushi' : '';
}
// named fuseki (19x19: 三連星・二連星・中国流・たすき; 9x9: the first move) of colour c
function fusekiOf(pos, c, ply) {
  const n = pos.n;
  if (n === 9) {
    if (c !== 1 || !moves.length || startSpec) return null;
    const m = moves[0]; if (m === R.PASS) return null;
    const [x, y] = xy(m, n), a = Math.min(x, 8 - x) + 1, b = Math.min(y, 8 - y) + 1;
    return a === 5 && b === 5 ? 'tengen' : (a === 5 && b === 4) || (a === 4 && b === 5) ? '54' : a === 3 && b === 3 ? '33' : null;
  }
  if (n !== 19 || startSpec) return null;
  const ct = {};
  for (const k of CORNERS) { const s = cornerStones(pos, k); if (s[c].length && !s[3 - c].length) { const tp = s[c].map(i => ptType(i, n)).find(Boolean); if (tp) ct[k] = tp; } }
  const own = i => pos.b[i] === c;
  const sides = { t: ['tl', 'tr'], b: ['bl', 'br'], l: ['tl', 'bl'], r: ['tr', 'br'] };
  const sidePt = (s, ln, along) => { // the point on side s at line ln, `along` counted from the start corner (1-based)
    const p = along - 1;
    return s === 't' ? (ln - 1) * n + p : s === 'b' ? (n - ln) * n + p : s === 'l' ? p * n + (ln - 1) : p * n + (n - ln);
  };
  const mid = (n + 1) / 2;
  for (const s in sides) { const [a, b] = sides[s]; if (ct[a] === 'hoshi' && ct[b] === 'hoshi' && (own(sidePt(s, 4, mid)) || own(sidePt(s, 3, mid)))) return 'sanrensei'; }
  for (const s in sides) {
    const [a, b] = sides[s], ta = ct[a], tb = ct[b];
    if (!((ta === 'hoshi' && tb === 'komoku') || (ta === 'komoku' && tb === 'hoshi'))) continue;
    // the side stone sits 9–10 lines from the komoku's edge (中国流 R9 with Q16・Q3)
    const fromK = ta === 'komoku';
    for (const ln of [3, 4]) for (const d of [9, 10]) { const along = fromK ? d : n + 1 - d; if (own(sidePt(s, ln, along))) return ln === 3 ? 'chinese' : 'hchinese'; }
  }
  for (const s in sides) { const [a, b] = sides[s]; if (ct[a] === 'hoshi' && ct[b] === 'hoshi') return 'nirensei'; }
  const has = k => !!ct[k];
  const opp = {}; for (const k of CORNERS) { const s = cornerStones(pos, k); if (s[3 - c].length && !s[c].length) opp[k] = 1; }
  if ((has('tl') && has('br') && opp.tr && opp.bl) || (has('tr') && has('bl') && opp.tl && opp.br)) return 'tasuki';
  return null;
}
function stageOf(n, ply) {
  const o = n >= 19 ? 40 : n >= 13 ? 22 : 8;
  if (ply < o) return 'open';
  return ply >= n * n * 0.48 ? 'end' : 'mid';
}
function facts(pos, ply) {
  const n = pos.n, me = pos.turn, op = 3 - me, f = { n, me, op, ply, pos };
  const G = groupsOf(pos); f.G = G;
  const by = (c, libs, min) => G.list.filter(g => g.c === c && g.libs === libs && g.stones.length >= (min || 1)).sort((a, b) => b.stones.length - a.stones.length);
  f.myAtari = by(me, 1); f.opAtari = by(op, 1); f.myWeak = by(me, 2, 2); f.opWeak = by(op, 2, 2);
  f.stage = stageOf(n, ply);
  f.ko = pos.ko >= 0;
  f.oppPass = ply > 0 && moves[ply - 1] === R.PASS;
  f.caps = [pos.caps[me], pos.caps[op]];
  f.empty = 0; f.held = { 1: 0, 2: 0 }; f.shim = { 1: 0, 2: 0 };
  if (n >= 13) for (const k of CORNERS) {
    const s = cornerStones(pos, k);
    if (!s[1].length && !s[2].length) f.empty++;
    for (const c of [1, 2]) if (s[c].length && !s[3 - c].length) { f.held[c]++; if (s[c].length >= 2) f.shim[c]++; }
  }
  f.weakN = { 1: 0, 2: 0 }; for (const g of G.list) if (g.libs <= 2 && g.stones.length >= 2) f.weakN[g.c]++;
  try { f.fk = [null, fusekiOf(pos, 1, ply), fusekiOf(pos, 2, ply)]; } catch (e) { f.fk = [null, null, null]; }
  return f;
}
// what a candidate move is about: { k, a (area), c (colour name of the stones concerned), n (stones) }
function classify(f, m) {
  const pos = f.pos, n = pos.n, me = f.me, op = f.op;
  if (m === R.PASS) return { k: 'pass' };
  const r = pos.tryPlay(m); if (!r) return { k: 'shape', a: aName(m, n) };
  const nb = R.nbrs(n), adjOwn = new Set(), adjOpp = new Set(), G = f.G;
  for (let k = 0; k < 4; k++) { const q = nb[m * 4 + k]; if (q < 0 || !pos.b[q]) continue; (pos.b[q] === me ? adjOwn : adjOpp).add(G.gid[q]); }
  // where: the area, with the stone it is about (the group's stone, or the nearest stone; never the move itself)
  const near0 = c => { let best = -1, bd = 99; const [mx, my] = xy(m, n); for (let i = 0; i < n * n; i++) { if (!pos.b[i] || (c && pos.b[i] !== c)) continue; const [x, y] = xy(i, n), d = Math.max(Math.abs(x - mx), Math.abs(y - my)); if (d < bd) { bd = d; best = i; } } return bd <= 4 ? best : -1; };
  const at = (k, g, extra) => { const ref = g != null ? midOf(G.list[g], n) : near0({ kakari: op, contact: op, cut: op, invade: op, shimari: me, extend: me, connect: me }[k]); return Object.assign({ k, a: ref >= 0 ? tx('at', { a: aName(ref, n), s: R.coord(ref, n) }) : aName(m, n) }, extra || {}); };
  if (r.captured.length) { const g = G.gid[r.captured[0]]; return at('cap', g, { c: cName(op), n: r.captured.length }); }
  const after = r.pos, myLibs = after.group(m).libs;
  for (const g of adjOwn) { const G0 = G.list[g]; if ((G0.libs === 1 || (G0.libs === 2 && G0.stones.length >= 2)) && myLibs > G0.libs) return at('save', g, { n: G0.stones.length }); }
  for (const g of adjOpp) { const q = G.list[g].stones[0]; if (after.b[q] === op && after.group(q).libs === 1) return at('atari', g, { c: cName(op) }); }
  if (adjOpp.size >= 2) return at('cut', null, { c: cName(op) });
  if (adjOwn.size >= 2) return at('connect', null);
  const ck = cornerOf(m, n);
  if (f.stage === 'open' && n >= 13 && ck) {
    const s = cornerStones(pos, ck), o = s[me].length, p = s[op].length;
    if (!o && !p) return at('corner', null);
    if (p && !o && !adjOpp.size) { const tp = ptType(m, n); return tp === 'sansan' && s[op].some(i => ptType(i, n) === 'hoshi') && p === 1 ? at('invade', null) : at('kakari', null, { c: cName(op) }); }
    if (o && !p) return at('shimari', null);
  }
  if (adjOpp.size) return at('contact', null, { c: cName(op) });
  // near weak groups (within 2 points)
  const [mx, my] = xy(m, n);
  const near = (g, d) => g.stones.some(q => { const [x, y] = xy(q, n); return Math.abs(x - mx) <= d && Math.abs(y - my) <= d; });
  const wOp = G.list.find(g => g.c === op && g.libs <= 3 && near(g, 2)); if (wOp) return at('attack', wOp.id, { c: cName(op) });
  const wMe = G.list.find(g => g.c === me && g.libs <= 3 && g.stones.length >= 2 && near(g, 2)); if (wMe) return at('defend', wMe.id);
  const ln = line(m, n);
  if (f.stage === 'end' && ln <= 2) return at('yose', null);
  if (f.stage === 'open' && (ln === 3 || ln === 4) && !ck) { const ownNear = G.list.some(g => g.c === me && near(g, 5)); return at(ownNear ? 'extend' : 'big', null); }
  if (f.stage === 'end') return at('yose', null);
  if (ln >= 4 && areaOf(m, n) === 'c') return at('center', null);
  return at('shape', null);
}
const CCLS = { cap: 'c-mat', atari: 'c-atk', cut: 'c-atk', attack: 'c-atk', contact: 'c-atk', invade: 'c-atk', kakari: 'c-atk', save: 'c-def', connect: 'c-def', defend: 'c-def', shimari: 'c-def', corner: 'c-dev', extend: 'c-dev', big: 'c-dev', center: 'c-dev', yose: 'c-mat', shape: 'c-calm', pass: 'c-calm' };
const RCLS = { save: 'r-def', connect: 'r-def', defend: 'r-def', shimari: 'r-def' };
function formOf(w) { return w >= .9 ? 'win' : w >= .75 ? 'big' : w >= .62 ? 'adv' : w >= .54 ? 'sl' : w > .46 ? 'even' : w > .38 ? 'sld' : w > .25 ? 'dis' : w > .1 ? 'bad' : 'lost'; }
const scaleOf = n => { const n2 = n * n; return n2 >= 300 ? 1 : n2 >= 150 ? 0.8 : 0.6; };

// --------------------------------------------------------------------------------------------- opening book (openings.json fuseki lines, 8 symmetries)
let bookC = null;
function bookLines(n) {
  if (typeof OPEN === 'undefined' || !OPEN || !OPEN.sets) return [];
  if (bookC && bookC.n === n && bookC.src === OPEN) return bookC.list;
  const list = OPEN.sets.filter(g => (g.n || 19) === n && !g.start && !g.handi && (g.cat === 'basic' || g.cat === 'small')).map(g => ({ g, line: g.line.map(s => R.parseCoord(s, n)) })).filter(x => x.line.every(m => m != null && m >= 0));
  bookC = { n, src: OPEN, list };
  return list;
}
const SYM = [(x, y, n) => [x, y], (x, y, n) => [n - 1 - x, y], (x, y, n) => [x, n - 1 - y], (x, y, n) => [n - 1 - x, n - 1 - y], (x, y, n) => [y, x], (x, y, n) => [n - 1 - y, x], (x, y, n) => [y, n - 1 - x], (x, y, n) => [n - 1 - y, n - 1 - x]];
const symPt = (s, i, n) => { const [x, y] = SYM[s](i % n, (i / n) | 0, n); return y * n + x; };
// the book continuations of the game's first `ply` moves: [{ m, sets: [set], n }]
function bookAt(ply) {
  if (startSpec || game.ha || ply > 24) return null;
  const n = game.n, L0 = bookLines(n); if (!L0.length) return null;
  const pre = moves.slice(0, ply); if (pre.some(m => m === R.PASS)) return null;
  const nx = new Map();
  for (const { g, line } of L0) {
    if (line.length <= ply) continue;
    for (let s = 0; s < 8; s++) {
      let ok = true; for (let j = 0; j < ply; j++) if (symPt(s, line[j], n) !== pre[j]) { ok = false; break; }
      if (!ok) continue;
      const m = symPt(s, line[ply], n); const e = nx.get(m) || { m, sets: [] };
      if (!e.sets.includes(g)) e.sets.push(g); nx.set(m, e);
    }
  }
  if (!nx.size) return null;
  return [...nx.values()].sort((a, b) => b.sets.length - a.sets.length);
}
const LLx = o => o ? (typeof o === 'string' ? o : o[LANG] !== undefined ? o[LANG] : o.en !== undefined ? o.en : o.ja) : '';
// the first move of an even game: standard points (one corner shown: top right, as most books do)
function firstMoves() {
  if (startSpec || game.ha || cur !== 0 || moves.length) return null;
  const n = game.n, P = (r, d) => (d - 1) * n + (n - r);   // r: lines from the right edge, d: lines from the top
  if (n === 9) return [['tengen', 'main', 40], ['54', 'main', 39], ['33', 'alt', P(3, 3)]].map(([k, kind, m]) => ({ k, kind, m }));
  if (n < 13) return null;
  return [['hoshi', 'main', P(4, 4)], ['komoku', 'main', P(3, 4)], ['sansan', 'alt', P(3, 3)], ['takamoku', 'alt', P(4, 5)]].map(([k, kind, m]) => ({ k, kind, m }));
}

// --------------------------------------------------------------------------------------------- candidates (engine 'analyze', shared with the hint cache)
let reqKey = '';
function candsFor(i) { const c = anaCache.get(keyOf(i)); return c && c.list ? c : null; }
function want() {
  const idx = cur, key = keyOf(idx);
  if (!active() || !myTurn() || anaCache.has(key) || reqKey === key) return;
  if (settings.hint) return;   // the hint analysis (app.js analyzeCurrent) fills the same cache
  if (firstMoves()) return;
  reqKey = key;
  const sign = toMoveAt(idx) === P1 ? 1 : -1;
  request({ type: 'analyze', ...jobBase(startSpec, moves.slice(0, idx)), net: strongNet() ? 'strong' : 'light', visits: COARSE ? 40 : 90, time: COARSE ? 1800 : 2500 }).then(r => {
    if (reqKey === key) reqKey = '';
    if (!r || !r.list) return;
    anaCache.set(key, { lead: r.lead, wr: r.wr, list: r.list });
    if (keyOf(idx) === key && (!evals[idx] || evals[idx].src === 'raw')) evals[idx] = { wr: sign > 0 ? r.wr : 1 - r.wr, lead: r.lead * sign, src: 'search' };
    if (cur === idx) renderInfo();
  });
}
function candInfo(f, an) {
  if (!an || !an.list || !an.list.length) return null;
  if (S.cls && S.cls.an === an) return S.cls;
  const L0 = an.list.filter(c => c.n > 0), tot = L0.reduce((a, c) => a + c.n, 0) || 1, best = L0[0];
  const items = [];
  for (const c of L0.slice(0, 6)) {
    if (items.length && c.n / tot < 0.02) continue;
    let k = { k: 'shape' }; try { k = classify(f, c.m); } catch (e) {}
    items.push({ m: c.m, k, drop: Math.max(0, best.lead - c.lead), lead: c.lead, wr: c.wr });
  }
  const seen = new Set(), dirs = [];
  for (const it of items) { if (seen.has(it.k.k) && dirs.length) continue; seen.add(it.k.k); dirs.push(it); if (dirs.length >= 4) break; }
  // fewer than 3 different plans: fill with the next candidates (same plan, other place)
  const tt = new Set(dirs.map(d => ttl(d.k)));
  for (const it of items) { if (dirs.length >= 3) break; if (!dirs.includes(it) && !tt.has(ttl(it.k)) && it.drop <= 6 * scaleOf(f.n)) { dirs.push(it); tt.add(ttl(it.k)); } }
  dirs.sort((a, b) => a.drop - b.drop);
  const sc = scaleOf(f.n), second = items[1] ? items[1].drop : null;
  const r = { an, items, dirs, best: items[0], branch: dirs.filter(d => d.drop <= 1 * sc).length >= 2, sharp: second != null && second >= 3 * sc ? ptsS(second) : '', only: second != null && second >= 7 * sc };
  S.cls = r; return r;
}
function gapOf(d, i, n) { const sc = scaleOf(n); return i === 0 ? ['gap.best', 'g0'] : d <= 1 * sc ? ['gap.eq', 'g1'] : d <= 3 * sc ? ['gap.lt', 'g2'] : ['gap.bad', 'g3']; }
const ttl = k => tx('tt.' + k.k, { a: k.a || '', c: k.c || '', n: k.n || '' });
const catTxt = k => tx('x.' + k.k, { a: k.a || '' });

// --------------------------------------------------------------------------------------------- previous move verdict
function verdictHtml() {
  const N0 = moves.length; if (!N0) return '';
  // the last move of the player (pvp: the last move)
  let i = N0 - 1;
  if (settings.mode === 'ai' && toMoveAt(i) !== humanColor) i--;
  if (i < 0) return '';
  const m = moves[i], name = '<bdi>' + esc(mvName(m)) + '</bdi>';
  const bk = bookAt(i);
  if (bk) {
    const e = bk.find(x => x.m === m);
    if (e) return CoachKit.verdict(0, tx('prev', { m: name, q: tx('q0') }), esc(tx('prevBook', { s: LLx(e.sets[0].title) })));
  }
  const an = candsFor(i), sign = toMoveAt(i) === P1 ? 1 : -1, sc = scaleOf(game.n);
  let loss = null, best = null, soft = false;
  if (an && an.list && an.list.length) {
    best = an.list[0].m;
    const c = an.list.find(x => x.m === m && x.n >= 2);
    if (c) loss = an.list[0].lead - c.lead;
    else if (evals[i + 1]) loss = an.lead - evals[i + 1].lead * sign;
  } else if (evals[i] && evals[i + 1]) { loss = (evals[i].lead - evals[i + 1].lead) * sign; soft = true; }
  if (loss == null) return '';
  loss = Math.max(0, loss);
  let g = best === m || loss < 0.6 ? 0 : loss < 2.5 * sc ? 1 : loss < 6 * sc ? 2 : 3;
  if (soft && g >= 2) g = loss >= 9 * sc ? 3 : 2;
  if (stageOf(game.n, i) === 'open' && g === 2 && !soft) g = 1;   // the opening: small evaluation differences are not called mistakes
  let body = '';
  const pos = posAt(i), f = facts(pos, i);
  if (best != null && best !== m) {
    let k = { k: 'shape' }; try { k = classify(f, best); } catch (e) {}
    body = esc(tx(g <= 1 ? 'prevAltOk' : 'prevAlt', { m: mvName(best), c: tx('c.' + k.k) }));
    if (g >= 2) body += ' ' + esc(tx('prevLoss', { x: ptsS(loss) }));
    if (g >= 2 && typeof crExplain === 'function') {
      try { const x = crExplain(i, { q: g === 3 ? 'bad' : 'dubious', ok: false, loss, best, m, desc: t('rv.loss', { p: ptsS(loss) }) }); if (x.kind) body += '<br>' + t('cr.tip.' + x.kind); } catch (e) {}
    }
  } else if (best === m) {
    let k = { k: 'shape' }; try { k = classify(f, m); } catch (e) {}
    body = esc(tx('prevBest', { c: tx('c.' + k.k) }));
  }
  if (stageOf(game.n, i) === 'open' && g >= 1 && best !== m) body += ' ' + esc(tx('prevOpen'));
  return CoachKit.verdict(g, tx('prev', { m: name, q: tx('q' + g) }), gl(body));
}

// --------------------------------------------------------------------------------------------- tips
function tipsOf(f, wr, cl) {
  const out = [], add = (k, pr, v, hi) => out.push({ k, pr, v, hi }), n = f.n;
  const ga = g => aName(midOf(g, n), n);
  if (f.myAtari[0]) add('tp.myAtari', 96, { a: ga(f.myAtari[0]), n: f.myAtari[0].stones.length }, 1);
  if (f.opAtari[0]) add('tp.oppAtari', 90, { a: ga(f.opAtari[0]), n: f.opAtari[0].stones.length }, 1);
  if (f.ko) add('tp.ko', 84);
  if (f.oppPass) add('tp.oppPass', 82, null, 1);
  if (f.myWeak[0]) add('tp.myWeak', 76, { a: ga(f.myWeak[0]), n: f.myWeak[0].stones.length });
  if (f.opWeak[0]) add('tp.oppWeak', 66, { a: ga(f.opWeak[0]), n: f.opWeak[0].stones.length });
  if (cl && cl.branch) add('tp.branch', 58);
  if (cl && cl.sharp) add('tp.sharp', 56, { x: cl.sharp });
  if (wr != null) { if (wr >= .85) add('tp.winning', 48); else if (wr <= .2) add('tp.losing', 48); }
  if (f.caps[0] - f.caps[1] >= 3 && game.rule === 'jp') add('tp.capsUp', 28, { x: f.caps[0] - f.caps[1] });
  if (f.stage === 'open') {
    if (n <= 9) add('tp.small', 44);
    if (f.empty) add('tp.emptyCorner', 50, { n: f.empty });
    if (n >= 13) { add('tp.order', 40); add('tp.lines', 34); }
    add('tp.urgent', 30);
  } else if (f.stage === 'mid') {
    add('tp.urgent', 42); add('tp.atsumi', 32); add('tp.ikken', 30); add('tp.chase', 26); add('tp.shicho', 22);
  } else { add('tp.yose1', 44); add('tp.yose2', 30); add('tp.urgent', 26); }
  return out.sort((a, b) => b.pr - a.pr);
}

// --------------------------------------------------------------------------------------------- state / rendering
const S = { open: false, cls: null, marks: null, hov: null, fk: '', f: null };
let card = null;
function usable() {
  return !!((settings.mode === 'ai' || settings.mode === 'pvp') && !rgame && !lesson && !puzzle && !rbS);
}
function active() { return !!(settings.coach && usable()); }
function myTurn() {
  return !gameOver(cur) && cur === moves.length && !reviewing && !isCounting(cur) && !thinking && (settings.mode === 'pvp' || toMoveAt(cur) === humanColor);
}
function factsNow() {
  const key = keyOf(cur) + '|' + LANG;
  if (S.fk === key && S.f) return S.f;
  S.fk = key; S.cls = null; S.f = facts(posAt(cur), cur);
  return S.f;
}
function render() {
  if (!card) return;
  if (GoCoach.sw) GoCoach.sw.sync();
  const rv = !!document.querySelector('#reviewCard.show'), over = gameOver(moves.length);
  // the coach is for the game in progress: after the game (or while browsing earlier moves) it steps aside and the coach tab
  // shows the review instead; before the review exists, a short note with a button to start it (shared/COACH.md §5)
  const playing = !over && cur === moves.length && !reviewing;
  const on = active(), can = usable() && (playing || (over && !rv));
  card.classList.toggle('hidden', !can);
  card.classList.toggle('ck-off', can && !on && !over);
  document.body.classList.toggle('ck-tab', (usable() && can) || (rv && !lesson && !puzzle));
  if (rv && !S.rvWas) { const b = document.querySelector('#mtabs [data-it=coach]'); if (b && getComputedStyle(b).display !== 'none' && document.body.dataset.it !== 'coach') b.click(); }
  S.rvWas = rv;
  S.marks = null;
  if (!can) return put('');
  if (over) {
    put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('overRv'))}</p><div class="ck-sec"><button type="button" class="ck-rvgo" data-ck="rv">${esc(t('rv.btn'))}</button></div>` + (on ? verdictHtml() : ''));
    const b = card.querySelector('[data-ck=rv]'); if (b) b.onclick = () => { if (typeof runReview === 'function') runReview(); };
    return;
  }
  if (!on) return put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('offNote'))}</p>`);
  let h = `<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span><small>${esc(tx('st.' + stageOf(game.n, cur)))}</small></h3>`;
  if (isCounting(cur)) { h += `<p class="ck-muted">${esc(tx('counting'))}</p>`; return put(h); }
  if (!myTurn()) { h += `<p class="ck-muted">${esc(tx('oppTurn'))}</p>` + verdictHtml(); return put(h); }
  const f = factsNow(), an = candsFor(cur);
  const cl = candInfo(f, an), wr = an ? an.wr : null, lead = an ? an.lead : null;
  // summary chips
  const chips = [];
  if (wr != null && settings.eval) chips.push({ k: tx('form'), v: esc(tx('f.' + formOf(wr)) + ' · ' + tx(lead >= 0 ? 'lead' : 'behind', { x: ptsS(lead) })), cls: wr >= .54 ? 'pos' : wr <= .46 ? 'neg' : '' });
  const fk = f.fk[f.me] || f.fk[f.op];
  if (fk && f.stage !== 'end') { const settled = cur >= 12 || game.n === 9; chips.push({ k: tx('fuseki'), v: esc(tx(settled ? 'fixed' : 'moyo', { n: tx('fk.' + fk) }) + (f.fk[f.me] ? '' : ' · ' + tx('opC'))) }); }
  if (game.n >= 13 && f.stage === 'open') {
    chips.push({ k: tx('who', { k: tx('area'), w: tx('meC') }), v: esc(tx('corners', { a: f.held[f.me], b: f.shim[f.me] })) });
    chips.push({ k: tx('who', { k: tx('area'), w: tx('opC') }), v: esc(tx('corners', { a: f.held[f.op], b: f.shim[f.op] })) });
  } else {
    const w = c => f.weakN[c] ? tx('weakN', { n: f.weakN[c] }) : tx('weak0');
    chips.push({ k: tx('who', { k: tx('weak'), w: tx('meC') }), v: esc(w(f.me)), cls: f.weakN[f.me] ? 'neg' : '' });
    chips.push({ k: tx('who', { k: tx('weak'), w: tx('opC') }), v: esc(w(f.op)), cls: f.weakN[f.op] ? 'pos' : '' });
  }
  chips.push({ k: tx('caps'), v: esc(f.caps[0] + ' : ' + f.caps[1]), cls: f.caps[0] > f.caps[1] ? 'pos' : f.caps[0] < f.caps[1] ? 'neg' : '' });
  h += CoachKit.summary(chips);
  const fm = firstMoves(), bk = !fm && bookAt(cur);
  if (fm) {
    S.marks = fm.map((d, j) => ({ m: d.m, label: String(j + 1) }));
    h += CoachKit.branches({ head: tx('opH'), intro: esc(tx('opIntro')), reveal: true,
      items: fm.map(d => ({ tag: tx('op.' + d.kind), cls: d.kind === 'main' ? 'c-mat' : 'c-dev', title: gl(esc(tx('op.' + d.k + '.t', { a: aName(d.m, game.n) }))), text: gl(esc(tx('op.' + d.k + '.x'))), move: String(d.m), mvName: mvName(d.m) })) });
  } else if (bk) {
    const items = bk.slice(0, 4);
    S.marks = items.map((d, j) => ({ m: d.m, label: String(j + 1) }));
    const b = items[0], s0 = LLx(b.sets[0].title);
    h += CoachKit.rec(tx('op.main'), gl(esc(tx('bkWhy', { s: s0, a: aName(b.m, game.n) }))), '');
    h += CoachKit.branches({ head: tx('bkH'), intro: esc(tx('bkIntro')), reveal: true,
      items: items.map((d, j) => { let k = { k: 'big' }; try { k = classify(f, d.m); } catch (e) {} return { tag: tx('c.' + k.k), cls: CCLS[k.k] || '', title: esc(tx('bk.t', { a: aName(d.m, game.n), s: d.sets.map(g => LLx(g.title)).slice(0, 2).join(' / ') })), text: gl(esc(LLx(d.sets[0].short) + ' — ' + catTxt(k))), gap: tx('bk.n', { n: d.sets.length }), gcls: j === 0 ? 'g0' : 'g1', move: String(d.m), mvName: mvName(d.m) }; }) });
  }
  if (!fm && !bk && cl && cl.best) {
    const b = cl.best;
    let why = esc(tx('recWhy', { c: tx('c.' + b.k.k), f: tx('f.' + formOf(wr)), l: tx(lead >= 0 ? 'lead' : 'behind', { x: ptsS(lead) }) }));
    if (cl.only) why += ' ' + esc(tx('recOnly')); else if (cl.sharp) why += ' ' + esc(tx('recSharp', { x: cl.sharp })); else if (cl.branch) why += ' ' + esc(tx('recBranch'));
    h += CoachKit.rec(tx('b.' + b.k.k), gl(why), RCLS[b.k.k] || '');
    S.marks = cl.dirs.map((d, j) => ({ m: d.m, label: String(j + 1) }));
    h += CoachKit.branches({ head: tx(cl.branch ? 'brH' : 'cdH'), intro: esc(tx(cl.branch ? 'brIntro' : 'cdIntro')),
      items: cl.dirs.map((d, j) => { const g = gapOf(d.drop, j, game.n); return { tag: tx('c.' + d.k.k), cls: CCLS[d.k.k] || '', title: esc(ttl(d.k)), text: gl(esc(catTxt(d.k))), gap: tx(g[0]) + (j && d.drop >= 0.1 ? ' ' + tx('gap.pts', { x: ptsS(d.drop) }) : ''), gcls: g[1], move: String(d.m), mvName: mvName(d.m) }; }) });
  } else if (!fm && !bk) h += `<p class="ck-calc">${esc(tx('calc'))}</p>`;
  const tl = tipsOf(f, wr, cl);
  h += CoachKit.tips({ head: tx('tipsH'), list: tl.map(x => ({ html: gl(esc(tx(x.k, x.v || {}))), hi: x.hi })), open: S.open, more: tx('more', { n: Math.max(0, tl.length - 3) }), less: tx('less') });
  h += verdictHtml();
  put(h);
}
function put(h) {
  const mk = JSON.stringify(S.marks);
  if (card.dataset.h === h && card.dataset.mk === mk) return;
  const keep = card.scrollTop; card.dataset.h = h; card.dataset.mk = mk; card.innerHTML = h; card.scrollTop = keep;
  CoachKit.bind(card, {
    onMore: () => { S.open = !S.open; render(); },
    onHover: u => { S.hov = u == null ? null : +u; renderFx(); },
  });
  renderFx();
}
// the hovered / tapped candidate's point on the board (numbered)
function marks() {
  if (!S.marks || !active() || !myTurn()) return;
  const gH = document.getElementById('gHints'); if (!gH) return;
  const pos = posAt(cur);
  for (const d of S.marks) {
    if (d.m == null || d.m < 0 || pos.b[d.m]) continue;
    if (S.hov !== d.m) continue;
    const [x, y] = xyOf(d.m), g = el('g', { class: 'hint ck-mk' }, gH);
    // common rule: green coach marks — translucent here (a ghost stone), so the board keeps its look
    const hv = S.hov === d.m;
    el('circle', { cx: x, cy: y, r: 0.47, fill: 'none', stroke: '#08120c', 'stroke-width': 0.05, opacity: 0.35 }, g);
    el('circle', { cx: x, cy: y, r: 0.43, class: 'hc', fill: '#3df59a', 'fill-opacity': hv ? 0.55 : 0.36, stroke: hv ? '#ffffff' : '#2fd683', 'stroke-width': hv ? 0.07 : 0.05, 'stroke-opacity': 0.9 }, g);
    const t0 = el('text', { x, y: y + 0.02, 'font-size': 0.44, fill: '#05301a', 'font-weight': 700 }, g); t0.textContent = d.label;
  }
}
function setOn(v) {
  settings.coach = !!v; save();
  CoachKit.flash(tx(v ? 'on' : 'off'));
  render(); renderFx();
  if (v) want();
}
function init() {
  if (!window.CoachKit) return;
  CoachKit.css(); CoachKit.glossBind(() => (TX[L()] || TX.en).gl);
  card = document.getElementById('coachCard');
  if (settings.coach === undefined) settings.coach = true;
  GoCoach.sw = CoachKit.sw({ mount: '.brand-r', get: () => !!settings.coach, set: v => setOn(v), label: on => ({ text: tx('sw'), title: tx('swT') + ' — ' + tx(on ? 'on' : 'off') }) });
  { const rc = document.getElementById('reviewCard'); if (rc && window.MutationObserver) new MutationObserver(() => render()).observe(rc, { attributes: true, attributeFilter: ['class'] }); }
  render();
}
function relabel() { if (GoCoach.sw) GoCoach.sw.sync(); S.fk = ''; render(); }
function merge(more) { for (const l in more) TX[l] = Object.assign({}, TX[l] || {}, more[l], { gl: Object.assign({}, (TX[l] || {}).gl || {}, more[l].gl || {}) }); }

// hooks into app.js (function declarations are global bindings: wrap them)
{
  const ri = renderInfo, rf = renderFx, ap = afterPosition;
  renderInfo = function () { ri.apply(this, arguments); try { render(); } catch (e) { console.warn(e); } };
  renderFx = function () { rf.apply(this, arguments); try { marks(); } catch (e) {} };
  afterPosition = function () { ap.apply(this, arguments); S.hov = null; try { want(); } catch (e) {} };
}
window.GoCoach = { init, render, relabel, merge, tx, TX, active, usable, want };
})();
