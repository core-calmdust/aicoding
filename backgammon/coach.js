'use strict';
// バックギャモン・コーチ (common spec: shared/COACH.md, model: shogi/coach.js) — shown while the player is to move against
// the AI (and in local two-player games): the position at a glance (形勢・ピップ・局面・作戦（ゲームプラン）・陣形),
// the recommended plan with its reason, the candidate plays of the roll classified into backgammon plans (ヒット・ポイント作り・
// プライム・アンカー・ランニング・スプリット・スロット・ビルダー・安全策 …; moves revealed on demand, arrows on the board),
// prioritized "how to think" tips read from the position, and the verdict on the previous play (◎○△✕).
// The first two plays of a game are taught from the opening book (openings.json: rollouts of the 15 opening rolls and the
// key replies, the same data as the 定跡 pages) instead of raw evaluations; book plays are never called mistakes.
// Cube: before the roll (cube available) and when a double is offered, the coach explains the cube decision.
// Texts: TX[lang] (en fallback); zh ko es fr pt de hi ar live in coach-i18n.js (BGCoach.merge).
// app.js: BGCoach.init() before HeaderBar.init; BGCoach.render() after renderInfo(); BGCoach.rated(...) from coachRate().
(() => {
const TX = {
ja: {
  head: 'コーチ', sw: 'コーチ', swT: 'コーチ（考え方の解説）のオン／オフ', on: 'コーチ ON', off: 'コーチ OFF',
  offNote: 'コーチ機能はオフになっています。右上のスイッチをオンにすると、局面の考え方や候補手の解説が表示されます。',
  overRv: 'この対局は終わりました。分析すると、コーチの欄に一手ごとの振り返り（最善手・悪手とその理由）が表示されます。',
  oppTurn: '相手の手番です。相手がどう動かしてくるか、予想してみよう。自分のブロット（1枚だけの駒）が打たれる目は何通りあるかも数えてみよう。',
  over: 'この対局は終わりました。棋譜の［分析］で一局を振り返れます。', viewing: '過去の局面を表示中です。最新の局面に戻るとコーチが再開します。',
  roll: 'サイコロを振る番です。振る前に、ダブル（キューブ）するかどうかを考えよう。', wait: 'サイコロを振っています…',
  calc: '候補手を考えています…', form: '形勢', pip: 'ピップ', stage: '局面', plan: '作戦', fmH: '陣形', meC: 'あなた', opC: '相手', who: '{k}（{w}）',
  'st.open': '序盤', 'st.mid': '中盤', 'st.race': 'レース', 'st.bear': 'ベアオフ', 'st.bearc': '接触のあるベアオフ',
  'f.win': '勝勢', 'f.big': '優勢', 'f.adv': '有利', 'f.sl': 'やや有利', 'f.even': '互角', 'f.sld': 'やや不利', 'f.dis': '不利', 'f.bad': '劣勢', 'f.lost': '敗勢',
  'pip.even': '{a}対{b}（互角）', 'pip.up': '{a}対{b}（{n}リード）', 'pip.down': '{a}対{b}（{n}遅れ）',
  moyo: '{n}模様', fixed: '{n}',
  'pl.race': 'レース', 'pl.run': 'ランニングゲーム', 'pl.hold': 'ホールディングゲーム', 'pl.prime': 'プライミングゲーム', 'pl.blitz': 'ブリッツ', 'pl.back': 'バックゲーム', 'pl.build': 'ポイント作り',
  'fm.prime': '{n}連プライム（{lo}〜{hi}）', 'fm.home': 'ホーム{n}ポイント', 'fm.anchor': '{p}ポイントにアンカー', 'fm.none': 'まだポイントなし', sep: '・',
  recWhy: 'この目の第一候補は「{c}」の方針です。形勢は{f}（勝率{p}%）。',
  recSharp: '2番目の候補との差が大きく（勝率で{x}）、ここは正確に動かしたい局面です。',
  recBranch: '候補どうしの差が小さい分かれ道です。下の候補から好きな方針を選べます。',
  recOnly: 'ほかの手は大きく損をします。迷わず指したい局面です。',
  brH: '分かれ道 — 選べる方針', brIntro: 'どれを選んでも大差はありません。自分の得意な方針で動かすのが上達の近道です。',
  cdH: '候補手と方針', cdIntro: '上位の候補を、方針ごとに解説します。',
  show: '手を見る', hide: '手を隠す',
  'gap.best': '最善', 'gap.eq': 'ほぼ同じ', 'gap.lt': '少し劣る', 'gap.bad': '劣る',
  // opening book
  opH: '定跡 — 最初のロールの選び方', opIntro: '最初の数手は、評価値の細かな差より定跡（ロールアウトで確かめられた手）を覚えるのが近道です。定番の手を先に、変わり種を後に並べています。',
  rpH: '定跡 — 2手目の応手', rpIntro: '相手のオープニングに対する2手目です。同じ目でも、相手の形によって最善手が変わります。',
  'op.main': '定番', 'op.alt': '変わり種', 'op.ev': '最善との差 {d}', bkWhy: '定跡の範囲です。{t}——{k}',
  prevBook: '定跡どおりの手です（ロールアウトで最善との差 {d}）。', prevBookOff: 'この目の定跡は {m} でした。',
  // candidates: tag / badge / explanation / title
  'c.hit': 'ヒット', 'b.hit': '打つ', 'x.hit': '{p}ポイントで相手のブロットを打つ方針。打たれた駒はバーからやり直しになり、相手は{n}ピップ遅れます。打ち返される危険（相手の当たり目）とくらべて選ぼう。', 't.hit': '{p}ポイントのブロットを打つ',
  'c.blitz': 'ブリッツ', 'b.blitz': '攻める', 'x.blitz': '相手をバーに置いたまま打ち続け、ホームボードを閉じにいく攻め（ブリッツ）。始めたら中途半端にせず、攻め切るのがコツです。', 't.blitz': '{p}ポイントで打って攻め続ける',
  'c.prime': 'プライム', 'b.prime': '閉じ込める', 'x.prime': '{n}つ続きのブロック（プライム）を作る方針。相手の後ろの駒が抜けにくくなり、6つ続けば完全に閉じ込められます。', 't.prime': '{lo}〜{hi}ポイントの{n}連プライムを作る',
  'c.point': 'ポイント作り', 'b.point': 'ポイントを作る', 'x.point': '{p}ポイントを作る方針。2枚以上いるポイントには相手が止まれず、打たれることもありません。5・4・バー（7）ポイントなど、相手の後ろの駒をふさぐポイントほど価値があります。', 't.point': '{p}ポイントを作る',
  'c.anchor': 'アンカー', 'b.anchor': '足場を作る', 'x.anchor': '相手のホームボード（{p}ポイント）に2枚そろえてアンカーを作る方針。打たれても戻れる足場になり、守りが安定します。20・21ポイントのアンカーが特に強力です。', 't.anchor': '{p}ポイントにアンカーを作る',
  'c.run': 'ランニング', 'b.run': '逃げる', 'x.run': '後ろの駒（{f}ポイント）を逃がす方針（ランニング）。ピップでリードしているときや、相手のブロックが固まる前に有効です。', 't.run': '{f}ポイントの後ろの駒を逃がす',
  'c.split': 'スプリット', 'b.split': '分ける', 'x.split': '後ろの駒を{p}ポイントへ分ける方針（スプリット）。相手がポイントを作りにくくなり、アンカーを作る候補も増えます。', 't.split': '後ろの駒を{p}ポイントへ分ける',
  'c.slot': 'スロット', 'b.slot': '1枚置く', 'x.slot': '{p}ポイントに1枚だけ置く方針（スロット）。打たれなければ次にポイントにしやすくなりますが、打たれる危険もあります。', 't.slot': '{p}ポイントに1枚置く（スロット）',
  'c.build': 'ビルダー', 'b.build': '材料を下ろす', 'x.build': '中盤から{p}ポイントへ駒を下ろす方針。次にポイントを作るための材料（ビルダー）が増えます。', 't.build': '{p}ポイントにビルダーを下ろす',
  'c.safe': '安全策', 'b.safe': '安全に', 'x.safe': 'ブロット（1枚だけの駒）を減らして打たれにくくする方針。相手のホームボードが強いときほど大切です。', 't.safe': 'ブロットを減らして安全に',
  'c.enter': 'エンター', 'b.enter': '入る', 'x.enter': 'バーの駒を相手のホームボードに入れる手（エンター）。入らない限りほかの駒は動かせません。', 't.enter': 'バーから入る',
  'c.race': 'レース', 'b.race': '進める', 'x.race': '接触のないレース。ピップを無駄なく使い、ホームボードに空きを作らないように運びます。', 't.race': 'ホームへ運ぶ',
  'c.off': 'ベアオフ', 'b.off': '上げる', 'x.off': '{n}枚をベアオフする方針。レースでは1枚でも多く上げるのが基本です。', 't.off': '{n}枚ベアオフ',
  'c.quiet': '整える', 'b.quiet': '整える', 'x.quiet': '駒の配置を整える方針。次の目でポイントを作りやすい形をめざします。', 't.quiet': '配置を整える',
  // cube
  cubeH: 'キューブの判断', 'cb.dt': 'ダブル', 'cb.dp': 'ダブル', 'cb.nd': 'ノーダブル', 'cb.tg': 'ノーダブル', 'cb.take': 'テイク', 'cb.pass': 'パス',
  // tips
  tipsH: '考え方のヒント', more: 'ほかのヒント（{n}）', less: 'たたむ',
  'tp.bar': 'バーに駒があります。まずエンターしないと、ほかの駒は動かせません（相手のホームボードは{n}ポイント閉鎖、2つの目とも入れない確率は{p}%）。',
  'tp.blitz': '相手がバーにいて、あなたのホームボードは{n}ポイント閉じています。ブリッツの好機——打ち続けて閉じにいこう。',
  'tp.primeEdge': '相手の駒があなたのプライムの後ろにいます。「プライムの端を攻めよ」「まずプライムを作り、それから逃げよ」が格言です。',
  'tp.trapped': 'あなたの後ろの駒が相手の{n}連プライムの後ろにいます。5連ならプライムの先頭まで出れば6の目で抜けられますが、6連は抜けられません。',
  'tp.three': '毎手、①打てるか ②ポイントを作れるか ③ブロットを安全にできるか、の3つを確かめよう。',
  'tp.make5': '5ポイントを作れる手があります。序盤なら、5ポイントを作れるときはたいていそれが正解です。',
  'tp.canHit': '相手のブロットを打てる手があります。打つ手と、打たずに形を整える手をくらべよう。',
  'tp.golden': '相手の5ポイント（あなたの20ポイント）は「ゴールデンポイント」。ここにアンカーを作ると、打たれても安心な足場になります。',
  'tp.splitVs': '相手が序盤にホームボードのポイントを作りました。こういうときは、ビルダーを下ろすより後ろの駒を分ける（スプリット）手が良いことが多いです。',
  'tp.bold': 'ホームボードはあなたの方が強い（{a}対{b}ポイント）。こういうときは大胆に（ブロットを残しても）攻めてよい局面です。',
  'tp.safeP': '相手のホームボードの方が強い（{b}対{a}ポイント）。打たれると痛いので、安全な手を優先しよう。',
  'tp.raceAhead': 'ピップで{n}リードしています（約{p}%）。接触を外して走れればレースで有利です。',
  'tp.raceBehind': 'ピップで{n}遅れています。レースでは不利なので、アンカーを残して相手のブロットを待つ（ホールディング）戦い方を考えよう。',
  'tp.hold': 'アンカーを持ちながらレースで遅れている、ホールディングゲームの形です。相手が駒をホームへ運ぶときに残すブロットを待ちます。',
  'tp.back': 'アンカーが2つあり、レースで大きく遅れている、バックゲームの形です。タイミング（ほかの駒を崩さずに待てる手数）が勝負です。',
  'tp.stack': '1つのポイントに{n}枚も積まれています。積みすぎると形が柔らかくなくなるので、余った駒をほかの場所に回そう。',
  'tp.raceGap': 'レースでは、ホームボードの4・5ポイントの空きは損になりやすく、1〜3ポイントの空きはそれほど問題になりません。',
  'tp.bearc': '相手の駒が後ろに残っている間のベアオフでは、打たれないことが最優先です。',
  'tp.cube': 'ダブルを迷ったら——「テイクかパスか迷う局面なら、それは確実にダブルの局面」（ウールジーの法則）。',
  'tp.winning': '優勢です。無理に攻めず、打たれにくい安全な手で勝ちに近づこう。',
  'tp.losing': '劣勢です。安全な手だけでは差が縮まりません。相手を打つチャンスを残す手を選ぼう。',
  'tp.branch': '候補の差が小さい「分かれ道」です。攻めるか、守るか、走るか——方針を先に決めてから手を選ぶのが上達のコツ。',
  'tp.sharp': '最善手と2番目の手の差が大きい局面です（勝率で{x}）。ここを正確に動かせるかが勝負の分かれ目。',
  'tp.open1': '序盤のねらいは、5ポイント・バーポイント・4ポイントなど大事なポイントを作り、後ろの駒の足場（アンカー）を確保することです。',
  'tp.mid1': '中盤は、打つ・ポイントを作る・安全にする、のバランス。相手の後ろの駒をブロックできる形をめざそう。',
  'tp.race1': 'レースでは1ピップも無駄にしないこと。大きな目は後ろの駒を進めるのに使います。',
  'tp.bear1': 'ベアオフでは、上げられるときは1枚でも多く上げるのが基本です。',
  prev: '前の手 {m}：{q}', prevBest: '「{c}」の方針で、AIの第一候補と同じ手です。', prevAlt: 'AIの第一候補は {m}（{c}）でした。', prevAltOk: 'AIの第一候補 {m}（{c}）と同じくらい良い手です。',
  tipBad: '💡 コツ：動かす前に「打てるか・ポイントを作れるか・ブロットを安全にできるか」を確かめ、候補を2つ以上くらべてから決めよう。',
  gl: {
    blot: { m: ['ブロット'], t: 'ブロット', d: 'ポイントに1枚だけいる駒。相手の駒が止まると打たれて（ヒットされて）バーに戻されます。' },
    hit: { m: ['ヒット', '打たれ', '打つ'], t: 'ヒット（打つ）', d: '相手のブロットがいるポイントに止まり、その駒をバーに戻すこと。戻された駒はスタートからやり直しです。' },
    anchor: { m: ['アンカー'], t: 'アンカー', d: '相手のホームボードの中に自分の駒を2枚以上そろえて作ったポイント。打たれても戻れる足場になります。' },
    prime: { m: ['プライム'], t: 'プライム', d: '自分のポイントが続けて並んだ壁。6つ続けば相手の駒は通り抜けられません。' },
    pip: { m: ['ピップ'], t: 'ピップ', d: 'すべての駒をゴールまで運ぶのに必要な目の合計。少ない方がレースで先行しています。' },
    barpt: { m: ['バーポイント'], t: 'バーポイント', d: '自分の7ポイント。6ポイントと並べると、相手の後ろの駒は6の目で逃げられなくなります。' },
    bar: { m: ['バー'], t: 'バー', d: '盤の中央の仕切り。打たれた駒はここに置かれ、相手のホームボードに入る（エンター）まで他の駒を動かせません。' },
    enter: { m: ['エンター'], t: 'エンター', d: 'バーの駒を、出た目の数で相手のホームボードに入れること。入るポイントがふさがっていると入れません（ダンス）。' },
    split: { m: ['スプリット'], t: 'スプリット', d: '一緒にいる後ろの2枚を別々のポイントに分けること。' },
    slot: { m: ['スロット'], t: 'スロット', d: '作りたいポイントにまず1枚だけ置き、次の手で2枚目を重ねてポイントにするねらいの手。' },
    builder: { m: ['ビルダー'], t: 'ビルダー', d: 'ポイントを作るための材料として、作りたい場所から6つ以内に置いた駒。' },
    blitz: { m: ['ブリッツ'], t: 'ブリッツ', d: '相手の駒をバーに置いたまま打ち続け、ホームボードを閉じてしまう激しい攻め。' },
    holding: { m: ['ホールディング'], t: 'ホールディングゲーム', d: 'レースで遅れているとき、相手陣のアンカーを足場に残し、相手がブロットを残すのを待つ戦い方。' },
    backgame: { m: ['バックゲーム'], t: 'バックゲーム', d: '相手のホームボードにアンカーを2つ持ち、大きく遅れたレースから終盤の一発のヒットをねらう戦い方。' },
    bearoff: { m: ['ベアオフ'], t: 'ベアオフ', d: 'すべての駒がホームボードに入ってから、駒を盤の外へ上げていくこと。先に15枚上げた方の勝ちです。' },
    golden: { m: ['ゴールデンポイント'], t: 'ゴールデンポイント', d: '相手の5ポイント（自分から数えて20ポイント）。アンカーを作る場所として最も価値が高いと言われます。' },
    home: { m: ['ホームボード'], t: 'ホームボード', d: '自分の1〜6ポイント。ここにポイントが多いほど、打たれた相手の駒が入りにくくなります。' },
    race: { m: ['レース'], t: 'レース', d: 'お互いの駒がすれ違い、もう打ち合うことのない局面。ピップの少ない方が有利です。' },
    double: { m: ['ダブル', 'キューブ'], t: 'ダブル（キューブ）', d: '得点を倍にしようと相手に申し込むこと。相手はテイク（受けて続ける）かパス（その時点の点数で負けを認める）を選びます。' },
  },
},
en: {
  head: 'Coach', sw: 'Coach', swT: 'Turn the coach (how-to-think tips) on / off', on: 'Coach ON', off: 'Coach OFF',
  offNote: 'The coach is switched off. Turn on the switch at the top right to see how to think about the position and the candidate plays explained.',
  overRv: 'This game is over. Analyse it to see a move-by-move review here (best plays, mistakes and why).',
  oppTurn: "It's your opponent's turn. Try to guess how they will play — and count how many rolls hit your blots (single checkers).",
  over: 'This game is over. Use [Analyze] in the record to review it.', viewing: 'You are looking at an earlier position. The coach resumes at the latest position.',
  roll: 'Your turn to roll. Before rolling, think about whether to double.', wait: 'Rolling the dice…',
  calc: 'Thinking about candidate plays…', form: 'Position', pip: 'Pips', stage: 'Phase', plan: 'Game plan', fmH: 'Structure', meC: 'you', opC: 'opponent', who: '{k} ({w})',
  'st.open': 'Opening', 'st.mid': 'Middle game', 'st.race': 'Race', 'st.bear': 'Bear-off', 'st.bearc': 'Bear-off with contact',
  'f.win': 'winning', 'f.big': 'clearly better', 'f.adv': 'better', 'f.sl': 'slightly better', 'f.even': 'equal', 'f.sld': 'slightly worse', 'f.dis': 'worse', 'f.bad': 'clearly worse', 'f.lost': 'losing',
  'pip.even': '{a} vs {b} (even)', 'pip.up': '{a} vs {b} ({n} ahead)', 'pip.down': '{a} vs {b} ({n} behind)',
  moyo: 'heading for {n}', fixed: '{n}',
  'pl.race': 'race', 'pl.run': 'running game', 'pl.hold': 'holding game', 'pl.prime': 'priming game', 'pl.blitz': 'blitz', 'pl.back': 'back game', 'pl.build': 'point-making',
  'fm.prime': '{n}-point prime ({lo}–{hi})', 'fm.home': 'home board: {n} points', 'fm.anchor': 'anchor on {p}', 'fm.none': 'no points yet', sep: ', ',
  recWhy: 'The first choice for this roll is the "{c}" plan. Your position: {f} (win chance {p}%).',
  recSharp: 'The gap to the second choice is large ({x} in win chance) — a moment to play precisely.',
  recBranch: 'The candidates are close: a branching point. Pick the plan you like from the list below.',
  recOnly: 'Every other play loses a lot here — play it without hesitating.',
  brH: 'Branching point — plans to choose from', brIntro: 'None of these is much worse than the others. Playing the plan that suits you is the fastest way to improve.',
  cdH: 'Candidates and their plans', cdIntro: 'The top candidates, explained plan by plan.',
  show: 'Show plays', hide: 'Hide plays',
  'gap.best': 'best', 'gap.eq': 'about equal', 'gap.lt': 'a bit worse', 'gap.bad': 'worse',
  opH: 'Opening book — playing the first roll', opIntro: 'For the first plays, learning the book (plays checked by rollouts) beats chasing small evaluation differences. Standard plays come first, the unusual ones after.',
  rpH: 'Opening book — the reply', rpIntro: "Your reply to the opponent's opening. With the same roll, the best play can change with the opponent's position.",
  'op.main': 'Standard', 'op.alt': 'Unusual', 'op.ev': '{d} vs best', bkWhy: 'This is still opening book. {t} — {k}',
  prevBook: 'A book play (rollout: {d} from the best).', prevBookOff: 'The book play for this roll was {m}.',
  'c.hit': 'Hit', 'b.hit': 'Hit', 'x.hit': "Hit the opponent's blot on your {p}-point. The hit checker must start again from the bar and the opponent loses {n} pips. Weigh it against the return shots.", 't.hit': 'Hit the blot on the {p}-point',
  'c.blitz': 'Blitz', 'b.blitz': 'Attack', 'x.blitz': 'Keep hitting while the opponent is on the bar and close your home board (a blitz). Once you start, commit to it — half-hearted attacks fail.', 't.blitz': 'Hit on the {p}-point and keep attacking',
  'c.prime': 'Prime', 'b.prime': 'Block', 'x.prime': "Build a {n}-point prime (a wall of points in a row). The opponent's back checkers get stuck behind it; six in a row cannot be passed at all.", 't.prime': 'Build a {n}-point prime ({lo}–{hi})',
  'c.point': 'Make a point', 'b.point': 'Make a point', 'x.point': 'Make your {p}-point. The opponent cannot land on a point with two or more of your checkers, and it cannot be hit. Blocking points (5, 4 and the bar point, 7) are worth the most.', 't.point': 'Make the {p}-point',
  'c.anchor': 'Anchor', 'b.anchor': 'Anchor', 'x.anchor': "Put two checkers together in the opponent's home board ({p}-point) to make an anchor: a safe landing spot if you are hit. Anchors on the 20- and 21-points are the strongest.", 't.anchor': 'Make an anchor on the {p}-point',
  'c.run': 'Run', 'b.run': 'Run', 'x.run': 'Run a back checker (from the {f}-point) — the running game. Good when you lead in pips, or before the opponent builds a blockade.', 't.run': 'Run the back checker from the {f}-point',
  'c.split': 'Split', 'b.split': 'Split', 'x.split': 'Split a back checker to the {p}-point. It makes it harder for the opponent to make points and gives you more chances to anchor.', 't.split': 'Split a back checker to the {p}-point',
  'c.slot': 'Slot', 'b.slot': 'Slot', 'x.slot': 'Put a single checker on the {p}-point (a slot). If it is not hit, you can cover it next turn and make the point — but it can be hit.', 't.slot': 'Slot the {p}-point',
  'c.build': 'Builder', 'b.build': 'Bring builders', 'x.build': 'Bring a checker down to the {p}-point. It becomes a builder: material for making a point next turn.', 't.build': 'Bring a builder to the {p}-point',
  'c.safe': 'Safe play', 'b.safe': 'Play safe', 'x.safe': "Reduce your blots (single checkers) so you are harder to hit. The stronger the opponent's home board, the more this matters.", 't.safe': 'Clean up blots and play safe',
  'c.enter': 'Enter', 'b.enter': 'Enter', 'x.enter': "Bring the checker on the bar into the opponent's home board. No other checker may move until it has entered.", 't.enter': 'Enter from the bar',
  'c.race': 'Race', 'b.race': 'Race', 'x.race': 'A race without contact: use every pip and bring checkers home without leaving gaps in your home board.', 't.race': 'Bring checkers home',
  'c.off': 'Bear off', 'b.off': 'Bear off', 'x.off': 'Bear off {n} checker(s). In a race, taking off as many as possible is the basic rule.', 't.off': 'Bear off {n}',
  'c.quiet': 'Improve', 'b.quiet': 'Improve', 'x.quiet': 'Rearrange your checkers into a shape that makes points more easily with the next roll.', 't.quiet': 'Improve the position',
  cubeH: 'Cube decision', 'cb.dt': 'Double', 'cb.dp': 'Double', 'cb.nd': 'No double', 'cb.tg': 'No double', 'cb.take': 'Take', 'cb.pass': 'Pass',
  tipsH: 'How to think', more: 'More tips ({n})', less: 'Show less',
  'tp.bar': "You have a checker on the bar. It must enter before anything else can move (the opponent's home board has {n} points closed; the chance that neither die enters is {p}%).",
  'tp.blitz': 'The opponent is on the bar and your home board has {n} points closed. A chance to blitz — keep hitting and close the board.',
  'tp.primeEdge': 'Opposing checkers are stuck behind your prime. The proverbs: "Attack at the edge of the prime" and "Build your prime first, then escape."',
  'tp.trapped': "Your back checkers are behind the opponent's {n}-point prime. Against a 5-point prime, get to its front edge so a 6 escapes; a 6-point prime cannot be passed.",
  'tp.three': 'Every turn, ask: (1) Can I hit? (2) Can I make a point? (3) Can I make my blots safe?',
  'tp.make5': 'You can make your 5-point. In the early game, making the 5-point is right most of the time.',
  'tp.canHit': "You can hit an opposing blot. Compare hitting with the quiet plays that improve your shape.",
  'tp.golden': "The opponent's 5-point (your 20-point) is the \"golden point\". An anchor there is the best safe landing spot.",
  'tp.splitVs': 'The opponent made a home-board point early. In such positions it is usually better to split your back checkers than to bring down builders.',
  'tp.bold': 'Your home board is stronger ({a} vs {b} points). You can afford bold plays, even leaving blots.',
  'tp.safeP': "The opponent's home board is stronger ({b} vs {a} points). Getting hit would hurt — prefer safe plays.",
  'tp.raceAhead': 'You lead by {n} pips (about {p}%). If you can break contact and run, the race favours you.',
  'tp.raceBehind': 'You are {n} pips behind. The race is against you, so keep an anchor and wait for a shot (a holding game).',
  'tp.hold': 'You hold an anchor and trail in the race: a holding game. Wait for the blots the opponent leaves while bringing checkers home.',
  'tp.back': 'Two anchors and far behind in the race: a back game. Timing (how long you can wait without breaking your position) is everything.',
  'tp.stack': '{n} checkers are stacked on one point. Heavy stacks make you inflexible — use the spares elsewhere.',
  'tp.raceGap': 'In a race, gaps on your 4- and 5-points are bad; gaps on the 1-, 2- and 3-points matter much less.',
  'tp.bearc': 'While opposing checkers are still back, the first rule of bearing off is: do not get hit.',
  'tp.cube': '"If you are not sure whether it is a take or a pass, then it is surely a double" (Woolsey\'s law).',
  'tp.winning': 'You are ahead. No need to force things: choose safe plays that are hard to hit.',
  'tp.losing': 'You are behind. Safe plays alone will not catch up — keep chances to hit the opponent.',
  'tp.branch': 'The candidates are close — a branching point. Decide your plan first (attack, defend or run), then pick the play.',
  'tp.sharp': 'The best play is much better than the second ({x} in win chance). Finding it may decide the game.',
  'tp.open1': 'Opening goals: make key points (5-point, bar point, 4-point) and find a safe landing spot (an anchor) for your back checkers.',
  'tp.mid1': 'Middle game: balance hitting, making points and safety. Aim for a shape that blocks the opponent\'s back checkers.',
  'tp.race1': 'In a race, do not waste pips. Use big numbers to move your rearmost checkers.',
  'tp.bear1': 'When bearing off, take off as many checkers as you can.',
  prev: 'Previous play {m}: {q}', prevBest: 'A "{c}" play — the same as the AI\'s first choice.', prevAlt: "The AI's first choice was {m} ({c}).", prevAltOk: "About as good as the AI's first choice, {m} ({c}).",
  tipBad: '💡 Tip: before moving, ask "can I hit, can I make a point, can I make my blots safe?" and compare at least two candidates.',
  gl: {
    blot: { m: ['blots', 'blot'], t: 'Blot', d: 'A single checker on a point. If an opposing checker lands there, it is hit and sent to the bar.' },
    hit: { m: ['hitting', 'Hit', 'hit'], t: 'Hit', d: "Landing on a point with a single opposing checker; that checker goes to the bar and must start again." },
    anchor: { m: ['anchor'], t: 'Anchor', d: "A point (two or more of your checkers) in the opponent's home board. A safe landing spot when you are hit." },
    prime: { m: ['prime'], t: 'Prime', d: 'Several made points in a row. Six in a row cannot be passed.' },
    pip: { m: ['pips'], t: 'Pip count', d: 'The total of the numbers needed to bring all your checkers home and off. Lower is ahead in the race.' },
    barpt: { m: ['bar point'], t: 'Bar point', d: 'Your 7-point. Together with the 6-point it stops the opponent\'s back checkers from escaping with a 6.' },
    enter: { m: ['enter'], t: 'Entering', d: "A checker on the bar comes in on the opponent's home board with a die number; if that point is blocked it cannot enter (it 'dances')." },
    split: { m: ['Split', 'split'], t: 'Split', d: 'Moving one of your two back checkers so they stand on different points.' },
    slot: { m: ['slot'], t: 'Slot', d: 'Putting a single checker on a point you want to make, hoping to cover it next turn.' },
    builder: { m: ['builder'], t: 'Builder', d: 'A checker placed within six pips of a point you want to make — material for making it.' },
    blitz: { m: ['blitz'], t: 'Blitz', d: "An all-out attack that keeps hitting and closes the home board while the opponent is on the bar." },
    holding: { m: ['holding game'], t: 'Holding game', d: 'Trailing in the race, you keep an advanced anchor and wait for the opponent to leave a shot.' },
    backgame: { m: ['back game'], t: 'Back game', d: "Holding two anchors in the opponent's home board, far behind in the race, waiting for a late hit." },
    bearoff: { m: ['bearing off', 'Bear off', 'bear off'], t: 'Bearing off', d: 'Once all your checkers are home, you take them off the board. The first to take off all 15 wins.' },
    golden: { m: ['golden point'], t: 'Golden point', d: "The opponent's 5-point (your 20-point): the most valuable point for an anchor." },
    home: { m: ['home board'], t: 'Home board', d: 'Your 1- to 6-points. The more points you make there, the harder it is for hit checkers to enter.' },
    double: { m: ['double'], t: 'Double (cube)', d: 'Offering to double the stakes. The opponent takes (plays on for twice the points) or passes (resigns the game at the current value).' },
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
const eqS = d => (d >= 0 ? '+' : '−') + Math.abs(d).toFixed(3);
function formOf(w) { return w >= .9 ? 'win' : w >= .75 ? 'big' : w >= .62 ? 'adv' : w >= .54 ? 'sl' : w > .46 ? 'even' : w > .38 ? 'sld' : w > .25 ? 'dis' : w > .1 ? 'bad' : 'lost'; }
const PT_V = { 5: 10, 4: 8, 7: 8, 6: 6, 3: 6, 20: 7, 21: 6, 18: 5, 19: 4, 8: 4, 9: 3, 2: 3, 22: 3, 1: 1, 10: 2, 11: 2 };

// --------------------------------------------------------------------------------------------- position facts
const F = (q, s) => BGX.feat(q, s);
function stageOf(q, s, nRolls) {
  const f = F(q, s), o = F(q, 1 - s);
  if (!f.contact) return f.allHome && o.allHome ? 'bear' : 'race';
  if (f.allHome) return 'bearc';
  if (nRolls <= 6 && f.pip >= 140 && f.opip >= 140) return 'open';
  return 'mid';
}
// the game plan of side s (for the chip): [key, settled]
function planOf(q, s, stage) {
  const f = F(q, s), lead = f.opip - f.pip;
  if (!f.contact) return ['race', true];
  if (f.oBar > 0 && f.home >= 3) return ['blitz', f.home >= 4];
  if (f.prime.len >= 4 && f.trapped > 0) return ['prime', f.prime.len >= 5];
  if (f.anchors >= 2 && lead <= -50) return ['back', lead <= -70];
  if (f.anchors >= 1 && lead <= -20) return ['hold', lead <= -40];
  if (lead >= 25) return ['run', lead >= 45];
  if (stage === 'open') return ['build', false];
  return null;
}
function formation(q, s) {
  const f = F(q, s), parts = [];
  if (f.prime.len >= 3) parts.push(tx('fm.prime', { n: f.prime.len, lo: f.prime.lo, hi: f.prime.hi }));
  else if (f.home) parts.push(tx('fm.home', { n: f.home }));
  const anc = f.made.filter(i => i >= 19 && i <= 23).sort((a, b) => a - b)[0];   // (advanced anchors: the starting 24-point is not shown)
  if (anc && f.contact) parts.push(tx('fm.anchor', { p: anc }));
  return parts.length ? parts.join(tx('sep')) : tx('fm.none');
}
// what a play is about (side s plays `moves` from position p)
function classify(p, s, moves) {
  const q = p.slice(); for (const c of moves) BG.apply(q, s, BG.mvFrom(c), BG.mvTo(c));
  const f0 = F(p, s), f1 = F(q, s);
  const r = k => Object.assign(r.v, { k });
  r.v = {};
  if (!moves.length) return r('quiet');
  const hits = moves.filter(c => BG.mvHit(c)).map(c => BG.mvTo(c));
  if (f1.off > f0.off) { r.v.n = f1.off - f0.off; return r('off'); }
  if (!f0.contact) return r('race');
  if (hits.length) { r.v.p = Math.max(...hits); r.v.n = hits.reduce((a, b) => a + b, 0); return r((f1.oBar >= 2 || f0.oBar > 0) && f1.home >= 3 ? 'blitz' : 'hit'); }
  const newPts = f1.made.filter(i => !f0.made.includes(i));
  if (f1.prime.len >= 4 && f1.prime.len > f0.prime.len) { Object.assign(r.v, { n: f1.prime.len, lo: f1.prime.lo, hi: f1.prime.hi }); return r('prime'); }
  const anc = newPts.filter(i => i >= 19);
  if (anc.length && f1.anchors > f0.anchors) { r.v.p = anc[0]; return r('anchor'); }
  const own = newPts.filter(i => i <= 18);
  if (own.length) { r.v.p = own.sort((a, b) => (PT_V[b] || 1) - (PT_V[a] || 1))[0]; return r('point'); }
  if (f0.bar > 0 && moves.every(c => BG.mvFrom(c) === 25)) return r('enter');
  // back checkers (on the opponent's home board, own points 19..24)
  const backMv = moves.filter(c => BG.mvFrom(c) >= 19 && BG.mvFrom(c) <= 25);
  const runMv = backMv.find(c => BG.mvTo(c) <= 17 || moves.some(d => BG.mvFrom(d) === BG.mvTo(c) && BG.mvTo(d) <= 17));
  if (runMv) { r.v.f = BG.mvFrom(runMv) === 25 ? 24 : BG.mvFrom(runMv); return r('run'); }
  const splitMv = backMv.find(c => BG.mvTo(c) >= 18 && q[s * 26 + BG.mvTo(c)] === 1);
  if (splitMv) { r.v.p = BG.mvTo(splitMv); return r('split'); }
  if (f1.blots.length < f0.blots.length) return r('safe');
  const slot = moves.map(c => BG.mvTo(c)).find(i => i >= 3 && i <= 7 && q[s * 26 + i] === 1 && p[s * 26 + i] === 0);
  if (slot) { r.v.p = slot; return r('slot'); }
  const bld = moves.map(c => BG.mvTo(c)).find(i => i >= 7 && i <= 11 && q[s * 26 + i] >= 1 && p[s * 26 + i] < q[s * 26 + i]);
  if (bld) { r.v.p = bld; return r('build'); }
  if (f1.blots.length <= f0.blots.length && f0.blots.length) return r('safe');
  return r('quiet');
}
const CCLS = { hit: 'c-atk', blitz: 'c-mate', prime: 'c-mat', point: 'c-mat', anchor: 'c-def', safe: 'c-def', enter: 'c-def', run: 'c-dev', split: 'c-dev', slot: 'c-dev', build: 'c-dev', race: 'c-calm', off: 'c-calm', quiet: 'c-calm' };
const RCLS = { anchor: 'r-def', safe: 'r-def', enter: 'r-def', blitz: 'r-mate' };
const ttl = k => tx('t.' + k.k, k);
const catTxt = k => tx('x.' + k.k, k);

// --------------------------------------------------------------------------------------------- state
const S = { open: false, reveal: false, cands: new Map(), pend: new Set(), vd: null };
let card = null, arrow = null;
function usable() {
  return !!(typeof match !== 'undefined' && match && !lesson && !puzzle && (settings.mode === 'ai' || settings.mode === 'pvp') && !(typeof inStudy === 'function' && inStudy()));
}
function active() { return !!(settings.coach && usable()); }
// AI同士 (watch): the coach computes nothing during the game; when it is over, the coach tab offers the review as usual
const watching = () => !!(typeof match !== 'undefined' && match && !lesson && !puzzle && settings.mode === 'watch' && !(typeof inStudy === 'function' && inStudy()));
const human = s => settings.mode === 'pvp' || s === humanSide;
function live() {   // latest position of the current game
  const [g, a] = curGA();
  return { g, a, st: stateAt(g, a), latest: isLatest() && !reviewing };
}
const tKey = (pos, side, d) => BG.key(pos) + side + d.join('');

// --------------------------------------------------------------------------------------------- opening book (openings.json, op.js)
function bookAt(g, start, side, dice, nRolls) {
  if (typeof OPB === 'undefined' || !OPB || typeof decMoves !== 'function' || nRolls > 1) return null;
  const hi = Math.max(dice[0], dice[1]), lo = Math.min(dice[0], dice[1]);
  const ini = BG.initial();
  if (nRolls === 0) {
    const it = OPB.items['o' + hi + lo]; if (!it || BG.key(start) !== BG.key(ini)) return null;
    return { it, kind: 'open', plays: it.plays, lines: it.lines };
  }
  // the reply: find a line whose opening play leads to this position and whose second roll is ours
  for (const id in OPB.items) {
    const it = OPB.items[id]; if (it.kind !== 'rep') continue;
    for (const ln of it.lines) {
      const s0 = ln.seq[0], s1 = ln.seq[1]; if (!s1) continue;
      const d1 = [Math.max(...s1.d), Math.min(...s1.d)]; if (d1[0] !== hi || d1[1] !== lo) continue;
      let pos; try { pos = decMoves(ini, 1 - side, s0.m).pos; } catch (e) { continue; }
      if (BG.key(pos) !== BG.key(start)) continue;
      return { it, ln, kind: 'rep', plays: ln.plays || it.plays, lines: [ln] };
    }
  }
  return null;
}
function bookPlays(bk, start, side) {
  const R = opRank(bk.plays).filter(x => x.ro != null).sort((a, b) => b.e - a.e);
  const best = R[0]; if (!best) return [];
  return R.map(x => { const d = decMoves(start, side, x.m); return { m: x.m, e: x.e, diff: x.e - best.e, moves: d.moves, key: BG.key(d.pos) }; });
}
// verdict for a played position: a book play within the tolerance is never a mistake
function bookVerdict(start, side, dice, nRolls, playedKey) {
  const bk = bookAt(0, start, side, dice, nRolls); if (!bk) return null;
  const L = bookPlays(bk, start, side); if (!L.length) return null;
  const x = L.find(y => y.key === playedKey), tol = (OPB.tol || 0.02);
  return { in: !!(x && x.diff >= -tol), best: L[0], diff: x ? x.diff : null, bk };
}

// --------------------------------------------------------------------------------------------- candidates
function wantCands(key, start, side, dice) {
  if (S.cands.has(key) || S.pend.has(key)) return;
  S.pend.add(key);
  request('ana', { type: 'analyze', pos: Array.from(start), side, dice: dice.slice(), ply: 1, keep: 8, max: 6, time: 1500 }).then(r => {
    S.pend.delete(key);
    if (!r || !r.list) return;
    S.cands.set(key, r.list); if (S.cands.size > 60) S.cands.delete(S.cands.keys().next().value);
    render();
  });
}
function candInfo(list, start, side) {
  if (!list || !list.length) return null;
  const best = list[0], wb = best.v[0];
  const items = list.slice(0, 5).map(c => ({ c, k: classify(start, side, c.moves), drop: Math.max(0, wb - c.v[0]), win: c.v[0] }));
  const seen = new Set(), dirs = [];
  for (const it of items) { if (seen.has(it.k.k) && dirs.length) continue; seen.add(it.k.k); dirs.push(it); if (dirs.length >= 3) break; }
  const close = dirs.filter(d => d.drop <= 0.03);
  const second = items[1] ? items[1].drop : null;
  return { items, dirs, best: items[0], branch: close.length >= 2, sharp: second != null && second >= 0.08 ? pctS(second) : '', only: second != null && second >= 0.2 };
}
function gapOf(d, i) { return i === 0 ? ['gap.best', 'g0'] : d <= 0.03 ? ['gap.eq', 'g1'] : d <= 0.08 ? ['gap.lt', 'g2'] : ['gap.bad', 'g3']; }
// cube advice (before the roll / a double offered)
function wantCube(key, st, g, side) {
  if (S.cands.has(key) || S.pend.has(key)) return;
  S.pend.add(key);
  request('ana', { type: 'cubeinfo', pos: Array.from(st.pos), side, depth: 1, ctx: ctxFor(g, side) }).then(r => {
    S.pend.delete(key); if (!r || !r.cube) return;
    S.cands.set(key, r); render();
  });
}

// --------------------------------------------------------------------------------------------- tips
function tipsOf(start, side, stage, cl, wr, plays) {
  const out = [], add = (k, pr, v, hi) => out.push({ k, pr, v, hi });
  const f = F(start, side), o = F(start, 1 - side), lead = f.opip - f.pip;
  if (f.bar > 0) add('tp.bar', 100, { n: f.ohome, p: Math.round((f.ohome / 6) ** 2 * 100) }, 1);
  if (f.contact) {
    if (f.oBar > 0 && f.home >= 3) add('tp.blitz', 80, { n: f.home }, 1);
    if (f.prime.len >= 4 && f.trapped > 0) add('tp.primeEdge', 70, null);
    let myBehind = 0; if (o.prime.len >= 4) for (let x = 25 - o.prime.lo + 1; x <= 25; x++) myBehind += start[side * 26 + x];
    if (o.prime.len >= 4 && myBehind > 0) add('tp.trapped', 74, { n: o.prime.len }, o.prime.len >= 5);
    const after = plays || [];
    if (stage !== 'bearc') {
      if (after.some(pl => pl.pos[side * 26 + 5] >= 2 && start[side * 26 + 5] < 2) && stage === 'open') add('tp.make5', 66);
      if (after.some(pl => pl.moves.some(c => BG.mvHit(c)))) add('tp.canHit', 62);
    }
    if (stage === 'open' && start[side * 26 + 24] === 2 && o.made.some(i => i >= 2 && i <= 5)) add('tp.splitVs', 58);
    if ((stage === 'open' || stage === 'mid') && !f.made.includes(20) && f.back > 0) add('tp.golden', 34);
    if (stage === 'mid' || stage === 'open') {
      if (f.home - o.home >= 2) add('tp.bold', 44, { a: f.home, b: o.home });
      else if (o.home - f.home >= 2) add('tp.safeP', 46, { a: f.home, b: o.home });
    }
    if (f.anchors >= 2 && lead <= -50) add('tp.back', 52);
    else if (f.anchors >= 1 && lead <= -20) add('tp.hold', 48);
    else if (lead <= -20 && stage !== 'open') add('tp.raceBehind', 42, { n: -lead });
    else if (lead >= Math.max(10, f.pip * 0.1) && stage !== 'open') add('tp.raceAhead', 42, { n: lead, p: Math.round(lead / f.pip * 100) });
    if (f.maxStack >= 6) add('tp.stack', 40, { n: f.maxStack });
    if (stage === 'bearc') add('tp.bearc', 64, null, 1);
    add('tp.three', 30);
  } else {
    if (stage === 'race') { add('tp.race1', 30); add('tp.raceGap', 28); }
    else add('tp.bear1', 30);
  }
  if (stage === 'open') add('tp.open1', 26); else if (stage === 'mid') add('tp.mid1', 20);
  if (wr != null) { if (wr >= .8) add('tp.winning', 50); else if (wr <= .25) add('tp.losing', 50); }
  if (cl && cl.branch) add('tp.branch', 56);
  if (cl && cl.sharp) add('tp.sharp', 54, { x: cl.sharp });
  return out.sort((a, b) => b.pr - a.pr);
}

// --------------------------------------------------------------------------------------------- previous-play verdict (from coachRate)
// v: { g, a (action index of the play), side, dice, moves, cls, loss, best (moves), start, key }
function rated(v) {
  try {
    const bv = bookVerdict(v.start, v.side, v.dice, v.nRolls, v.key);
    if (bv && bv.in) { v.cls = bv.diff >= -0.002 ? 'best' : 'good'; v.book = bv; }
    else if (bv) v.bookOff = bv;
  } catch (e) {}
  S.vd = v; render();
  return v.cls;
}
function verdictHtml(g) {
  const v = S.vd; if (!v || v.g !== g || !match || v.m !== match) return '';
  const gm = match.games[g]; if (!gm || gm.actions.length - v.a > 3) return '';
  const q = v.cls, gi = { best: 0, good: 1, dubious: 2, bad: 3 }[q];
  const mv = v.dice.join('') + ' ' + BG.notation(v.moves);
  let body = '';
  if (v.book) body = esc(tx('prevBook', { d: eqS(v.book.diff || 0) }));
  else {
    if (v.bookOff) body += esc(tx('prevBookOff', { m: BG.notation(v.bookOff.best.moves) })) + ' ';
    if (v.bestMoves) {
      const k = classify(v.start, v.side, v.bestMoves);
      if (q === 'best') body += esc(tx('prevBest', { c: tx('c.' + k.k) }));
      else body += esc(tx(q === 'good' ? 'prevAltOk' : 'prevAlt', { m: BG.notation(v.bestMoves), c: tx('c.' + k.k) }));
      if (q === 'dubious' || q === 'bad') body += '<br>' + esc(tx('tipBad'));
    }
  }
  return CoachKit.verdict(gi, esc(tx('prev', { m: mv, q: t('q.' + q) })), gl(body));
}

// --------------------------------------------------------------------------------------------- render
function winFor(side) {
  if (!settings.eval) return null;
  const [g, a] = curGA(), ev = evalOf(g, a);
  if (!ev || ev.final || ev.p == null) return null;
  return side === 0 ? ev.p : 1 - ev.p;
}
function chips(start, side, stage) {
  const c = [], wr = winFor(side), f = F(start, side);
  if (wr != null) c.push({ k: tx('form'), v: esc(tx('f.' + formOf(wr)) + ' ' + pctS(wr)), cls: wr >= .54 ? 'pos' : wr <= .46 ? 'neg' : '' });
  const lead = f.opip - f.pip;
  c.push({ k: tx('pip'), v: esc(tx(Math.abs(lead) < 5 ? 'pip.even' : lead > 0 ? 'pip.up' : 'pip.down', { a: f.pip, b: f.opip, n: Math.abs(lead) })), cls: lead >= 10 ? 'pos' : lead <= -10 ? 'neg' : '' });
  const pl = planOf(start, side, stage);
  if (pl) c.push({ k: tx('plan'), v: esc(tx(pl[1] ? 'fixed' : 'moyo', { n: tx('pl.' + pl[0]) })) });
  if (f.contact) {
    c.push({ k: tx('who', { k: tx('fmH'), w: tx('meC') }), v: esc(formation(start, side)), cls: f.prime.len >= 4 ? 'pos' : '' });
    c.push({ k: tx('who', { k: tx('fmH'), w: tx('opC') }), v: esc(formation(start, 1 - side)) });
  }
  return c;
}
function render() {
  if (!card) return;
  if (BGCoach.sw) BGCoach.sw.sync();
  // the coach is for the game in progress: after the game (or while browsing earlier positions) it steps aside and the
  // phones' coach tab shows the review (#reviewCard, data-itc="coach") instead; before a review exists, a short note with
  // a button that starts it
  const rv = !!document.querySelector('#reviewCard.show');
  const L0 = usable() || watching() ? live() : null, playing = !!(usable() && L0 && L0.latest && !L0.st.over);
  const can = (usable() && (playing || (L0 && L0.latest && L0.st.over && !rv))) || !!(watching() && L0 && L0.latest && L0.st.over && !rv), on = active();
  const was = card.className;
  card.classList.toggle('hidden', !can);
  card.classList.toggle('ck-off', can && !on && playing);
  if (was !== card.className && typeof pcwRefit === 'function') pcwRefit();
  document.body.classList.toggle('ck-tab', !!can || rv);
  if (rv && !S.rvWas) { const b = document.querySelector('#mtabs [data-it=coach]'); if (b && getComputedStyle(b).display !== 'none' && document.body.dataset.it !== 'coach') b.click(); }
  S.rvWas = rv;
  if (!can) return setArrow(null);
  if (!playing) {
    setArrow(null);
    put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('overRv'))}</p><div class="ck-sec"><button type="button" class="ck-rvgo" data-ck="rv">${esc(t('rv.btn'))}</button></div>` + (on ? verdictHtml(L0.g) : ''));
    const b = card.querySelector('[data-ck=rv]'); if (b) b.onclick = () => { if (typeof runReview === 'function') runReview(); };
    return;
  }
  if (!on) { setArrow(null); return put(`<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span></h3><p class="ck-muted">${esc(tx('offNote'))}</p>`); }
  const { g, st } = L0;
  let stage = 'mid', side = st.turn;
  const tt = typeof turn !== 'undefined' && turn && !turn.ai && L0.latest ? turn : null;
  const start = tt ? tt.start : st.pos;
  if (tt) side = tt.side;
  if (!st.over && side >= 0) stage = stageOf(start, side, st.nRolls);
  let h = `<h3 class="ck-h">${CoachKit.ICON.coach}<span>${esc(tx('head'))}</span>${!st.over && side >= 0 ? `<small>${esc(tx('st.' + stage))}</small>` : ''}</h3>`;
  if (!L0.latest) { setArrow(null); return put(h + `<p class="ck-muted">${esc(tx('viewing'))}</p>`); }
  if (st.over) { setArrow(null); return put(h + `<p class="ck-muted">${esc(tx('over'))}</p>` + verdictHtml(g)); }
  // a double offered to the human: take / pass
  if (st.offered && human(st.turn)) {
    const key = 'c|' + BG.key(st.pos) + st.doubler + st.cube + g;
    wantCube(key, st, g, st.doubler);
    h += CoachKit.summary(chips(st.pos, st.turn, stage));
    const r = S.cands.get(key);
    if (r) {
      const R = BGX.cube(r.v, r.cube, r.cube.take ? 'take' : 'pass');
      h += `<div class="ck-sec"><div class="ck-sec-h"><span>${esc(tx('cubeH'))}</span></div></div>` + CoachKit.rec(tx(r.cube.take ? 'cb.take' : 'cb.pass'), gl(R.map(x => esc(t(x.k, x.a))).join(' ')), r.cube.take ? '' : 'r-def');
    } else h += `<p class="ck-calc">${esc(tx('calc'))}</p>`;
    setArrow(null); return put(h + verdictHtml(g));
  }
  if (!tt) {
    // before the roll (the human's turn) or the opponent / AI is busy
    if (!st.offered && st.turn >= 0 && human(st.turn) && st.nRolls > 0 && !(typeof busyRolling !== 'undefined' && busyRolling) && thinking < 0) {
      h += CoachKit.summary(chips(st.pos, st.turn, stageOf(st.pos, st.turn, st.nRolls)));
      if (match.cube && BG.cubeAvailable(st, ctxFor(g, st.turn), st.turn)) {
        const key = 'd|' + BG.key(st.pos) + st.turn + st.cube + g;
        wantCube(key, st, g, st.turn);
        const r = S.cands.get(key);
        if (r) {
          const c = r.cube, R = BGX.cube(r.v, c), k = c.double ? (c.take ? 'cb.dt' : 'cb.dp') : (!c.take ? 'cb.tg' : 'cb.nd');
          h += `<div class="ck-sec"><div class="ck-sec-h"><span>${esc(tx('cubeH'))}</span></div></div>` + CoachKit.rec(tx(k), gl(R.map(x => esc(t(x.k, x.a))).join(' ')), c.double ? 'r-mate' : '');
          h += CoachKit.tips({ head: tx('tipsH'), list: [{ html: gl(esc(tx('tp.cube'))) }] });
        } else h += `<p class="ck-calc">${esc(tx('calc'))}</p>`;
      } else h += `<p class="ck-muted">${esc(tx('roll'))}</p>`;
      setArrow(null); return put(h + verdictHtml(g));
    }
    setArrow(null);
    const mine = st.turn >= 0 && human(st.turn);
    return put(h + `<p class="ck-muted">${esc(tx(mine ? 'wait' : 'oppTurn'))}</p>` + verdictHtml(g));
  }
  // the human's play: summary, book or candidates, tips, verdict
  side = tt.side;
  h += CoachKit.summary(chips(start, side, stage));
  const key = tKey(start, side, tt.dice);
  S.cur = { start, side, key };
  let bk = null; try { bk = bookAt(g, start, side, tt.dice, st.nRolls); } catch (e) { bk = null; }
  let cl = null; S.rows = null;
  if (tt.plays.length <= 1) h += `<p class="ck-muted">${esc(t(tt.plays.length && tt.plays[0].moves.length ? 'forced' : 'nomove'))}</p>`;
  else if (bk) {
    const L = bookPlays(bk, start, side), tol = OPB.tol || 0.02;
    const rows = L.slice(0, 4).map(x => {
      const k = classify(start, side, x.moves);
      const ln = bk.kind === 'open' ? bk.lines.find(l => l.m === x.m) : (bk.ln.m === x.m ? bk.ln : null);
      let aim = '';
      if (ln) { try { aim = opLineAim(bk.it, ln); } catch (e) {} }
      if (!aim) aim = catTxt(k);
      return { x, k, aim, main: x.diff >= -tol };
    }).sort((a, b) => (a.main === b.main ? b.x.e - a.x.e : a.main ? -1 : 1));
    S.rows = rows.map(r => ({ moves: r.x.moves }));
    const b = rows[0];
    h += CoachKit.rec(tx('b.' + b.k.k), gl(esc(tx('bkWhy', { t: opT(bk.it, 't'), k: opT(bk.it, 'k') }))), RCLS[b.k.k] || '');
    h += CoachKit.branches({
      head: tx(bk.kind === 'open' ? 'opH' : 'rpH'), intro: esc(tx(bk.kind === 'open' ? 'opIntro' : 'rpIntro')), reveal: true,
      items: rows.map((r, i) => ({ tag: tx(r.main ? 'op.main' : 'op.alt'), cls: r.main ? 'c-mat' : 'c-dev', title: esc(ttl(r.k)), text: gl(esc(plainText(r.aim))), gap: i === 0 ? tx('gap.best') : tx('op.ev', { d: eqS(r.x.diff) }), gcls: r.main ? (i === 0 ? 'g0' : 'g1') : 'g2', move: String(i), mvName: BG.notation(r.x.moves) })),
    });
  } else {
    wantCands(key, start, side, tt.dice);
    cl = candInfo(S.cands.get(key), start, side);
    if (cl) {
      const b = cl.best;
      let why = esc(tx('recWhy', { c: tx('c.' + b.k.k), f: tx('f.' + formOf(b.win)), p: Math.round(b.win * 100) }));
      if (cl.only) why += ' ' + esc(tx('recOnly')); else if (cl.sharp) why += ' ' + esc(tx('recSharp', { x: cl.sharp })); else if (cl.branch) why += ' ' + esc(tx('recBranch'));
      h += CoachKit.rec(tx('b.' + b.k.k), gl(why), RCLS[b.k.k] || '');
      S.rows = cl.dirs.map(d => ({ moves: d.c.moves }));
      h += CoachKit.branches({
        head: tx(cl.branch ? 'brH' : 'cdH'), intro: esc(tx(cl.branch ? 'brIntro' : 'cdIntro')), reveal: S.reveal, show: tx('show'), hide: tx('hide'),
        items: cl.dirs.map((d, i) => { const gp = gapOf(d.drop, i); return { tag: tx('c.' + d.k.k), cls: CCLS[d.k.k] || '', title: esc(ttl(d.k)), text: gl(esc(catTxt(d.k))), gap: tx(gp[0]) + (d.drop > 0.005 ? ' −' + pctS(d.drop) : ''), gcls: gp[1], move: String(i), mvName: BG.notation(d.c.moves) }; }),
      });
    } else h += `<p class="ck-calc">${esc(tx('calc'))}</p>`;
  }
  const tl = tipsOf(start, side, stage, cl, winFor(side), tt.plays);
  h += CoachKit.tips({ head: tx('tipsH'), list: tl.map(x => ({ html: gl(esc(tx(x.k, x.v || {}))), hi: x.hi })), open: S.open, more: tx('more', { n: Math.max(0, tl.length - 3) }), less: tx('less') });
  h += verdictHtml(g);
  put(h);
}
function put(h) {
  if (card.dataset.h === h) return;
  const keep = card.scrollTop; card.dataset.h = h; card.innerHTML = h; card.scrollTop = keep;
  CoachKit.bind(card, {
    onMore: () => { S.open = !S.open; render(); },
    onReveal: () => { S.reveal = !S.reveal; try { settings.coachReveal = S.reveal; save(); } catch (e) {} render(); },
    onHover: i => setArrow(i == null ? null : +i),
  });
}
// candidate arrows on the board (hovered / tapped row)
function setArrow(i) {
  const was = arrow;
  arrow = i != null && S.rows && S.rows[i] && S.cur && turn && !turn.ai ? { side: S.cur.side, start: S.cur.start, moves: S.rows[i].moves, cls: 'cand' } : null;
  if (was !== arrow && (was || arrow) && typeof renderArrows === 'function') renderArrows();
}
function init() {
  if (!window.CoachKit) return;
  CoachKit.css(); CoachKit.glossBind(() => (TX[L()] || TX.en).gl);
  card = document.getElementById('coachCard');
  { const rc = document.getElementById('reviewCard'); if (rc && window.MutationObserver) new MutationObserver(() => render()).observe(rc, { attributes: true, attributeFilter: ['class'] }); }
  try { S.reveal = !!settings.coachReveal; } catch (e) {}
  BGCoach.sw = CoachKit.sw({ mount: '.brand-r', get: () => !!settings.coach, set: v => setOn(v), label: on => ({ text: tx('sw'), title: tx('swT') + ' — ' + tx(on ? 'on' : 'off') }) });
}
function setOn(v) {
  settings.coach = !!v; save();
  try { const o = document.getElementById('optCoach'); if (o) o.checked = settings.coach; } catch (e) {}
  CoachKit.flash(tx(v ? 'on' : 'off'));
  if (!v) setArrow(null);
  render();
}
function relabel() { if (BGCoach.sw) BGCoach.sw.sync(); render(); }
function merge(more) { for (const l in more) TX[l] = Object.assign({}, TX[l] || {}, more[l], { gl: Object.assign({}, (TX[l] || {}).gl || {}, more[l].gl || {}) }); }
window.BGCoach = { init, render, relabel, merge, rated, tx, TX, active, classify, get arrow() { return arrow; } };
})();
