// patolli/i18n.js を作る（node tools/gen_i18n.js）。共通の文言は ur/i18n.js から引き、パトリ独自の文言をここで上書き・追加する。
// いまは ja / en だけ。残り12言語（zh zh-TW ko es fr pt de ru tr id hi ar）は OVER に同じキーで足し、LANGS に加える
// （そろった言語だけ app.js の SUPPORTED と index.html の #langSel に出す）。
const fs = require('fs'), path = require('path');
global.window = {}; require('../../ur/i18n.js'); const UR = window.I18N;
const LANGS = ['ja', 'en'];
const DROP = k => /^(land\.|lv\.|rule\.(finkel|blitz|masters)|bd\.(museum|restored|wood|clay)|pcs\.(orig|ivory|wood|gold)|fx\.(rosette|capAgain|passZero)|lsc\.|tray\.)/.test(k);
const OVER = {
ja: {
  'meta.title': 'パトリ — 世界のボドゲ大百科', title: 'パトリ', side0: '赤', side1: '青',
  'pn.pebble': ['赤', '青'], 'pn.maize': ['赤', '青'], 'pn.obsidian': ['白', '黒'], 'pn.jade': ['赤', '緑'], 'pn.clay': ['茶', '灰'], 'pn.gold': ['金', '青'],
  'tray.start': '待ち', 'tray.goal': '上がり', 'tray.pool': '場', 'tray.gold': '{s}の宝', 'tray.goldYou': 'あなたの宝',
  roll: '豆を投げる', rollPill: '投げる', 'dice.n': '= {n}', 'dice.zero': '= 0',
  'pl.board': '盤上', 'pl.left': '残り', 'pl.home': '上がり',
  'st.roll': '{s}の番です。豆を投げてください', 'st.rollSub': '［豆を投げる］・スペースキー・盤の左の豆で投げられます',
  'st.move': '{n}マス進めます。動かす駒を選んでください', 'st.moveSub': '駒をタップ（緑の印が行き先）。動かせる駒が1つなら自動で動きます',
  'st.noMove': '{n}マス進める駒がありません', 'st.zero': '印は0個：進めません',
  'fx.pass': 'パス', 'fx.passZero': '印のある豆は0個', 'fx.passNoMove': '動かせる駒がありません',
  'fx.again': 'もう一度！', 'fx.againSub': '腕の先のマス：もう一度投げられます', 'fx.pen': '印のマス', 'fx.give': '{s}へ宝を{a}払います', 'fx.get': '{s}から宝を{a}もらいます',
  'fx.home': '上がり！', 'fx.cap': '取った！', 'fx.round': '第{n}回', 'fx.roundSub': '{s}が6個上げました。宝を持ち越して次の回へ',
  'ev.pool': '場へ{a}', 'ev.offer': '供え物として場へ{a}', 'ev.pay': '{s}へ{a}', 'ev.pot': '場の{a}を獲得', 'ev.round': '第{n}回へ', 'round.n': '第{n}回',
  'rec.gold': '宝：{a} {x}・{b} {y}・場 {p}',
  'tip.cant': 'その駒は今の目では動かせません', 'tip.cantEnter': '今は駒を入れられません（盤に駒があるときは「1」の目だけ）',
  'k.enter': '入場', 'k.home': '上がり', 'k.cap': '取り', 'k.pass': 'パス',
  'hint.roll': '先に豆を投げてください',
  'res.sub': '{n}手', 'res.why.home': '6個すべて上がり', 'res.why.broke': '相手の宝がなくなりました',
  'ng.first': '先手（あなた）', 'ng.second': '後手（AIが先）', 'ng.level1': '手前（赤）のAI', 'ng.level2': '奥（青）のAI',
  'ng.dir': '進む向き（ベルの復元）', 'ng.dirSame': '同じ向き', 'ng.dirOpp': '逆向き',
  'opt.autoRoll': '自動で豆を投げる', 'opt.danger': '取られる危険を表示（コーチON・広く知られたルール）',
  'rule.bell': 'ベルの復元', 'rule.popular': '広く知られたルール', 'rule.std': '標準',
  'rule.bell.d': 'R.C.ベル（1960）の提案。60マス。宝を賭けて場に出し、印のマスや動けないときに払う。取りはなし。先に6個上げた方が場を取る。',
  'rule.popular.d': '現代に広まっているルール。52マス。入るのは「1」の目だけ。中央の4マスでだけ相手の駒を取れる。相手の宝をなくせば勝ち。',
  'bd.title': '盤', 'bd.petate': 'ござ', 'bd.hide': '鹿革', 'bd.stone': '石板', 'bd.codex': '絵文書', 'bd.mosaic': 'トルコ石', 'bd.night': '夜',
  'pcs.title': '駒', 'pcs.pebble': '赤と青の小石', 'pcs.maize': 'とうもろこし', 'pcs.obsidian': '黒曜石と貝', 'pcs.jade': 'ひすいと赤い石', 'pcs.clay': '素焼き', 'pcs.gold': '金とトルコ石',
  lvd: ['入門：目に任せて動かす', '初級〜中級：もう一度のマスと印のマスを考える', '上級：1投げ先の勝率を読む', '最上級：2投げ先まで読む'],
  'rt.desc': 'AIとのレーティング戦（ベルの復元・1手30秒・待ったなし）。あなたのレートに近い強さのAIと対局します。',
  'ls.desc': '考え方 → 例題 → 練習 → 採点問題の順に学びます。各問20点、5問で75点以上なら合格。',
  'lsc.basic': '豆の確率、もう一度のマス、「1」での入場、ちょうどの上がり。まずはここから。', 'lsc.vari': '宝がなくなると負けるルール：印のマス、中央の取り合い。',
  'pz.desc': '局面と豆の目から、いちばん良い一手を選ぼう。', 'pz.goal': '{s}のいちばん良い手は？',
  'ng.credit': 'ルールは R.C.ベル（1960）の復元と、現代に広まっているルール。当時のルールは伝わっていません。',
  'tip.race': '残り {a}マス・相手 {b}マス',
  'ol.desc': 'オンライン対戦は準備中です。公開までもうしばらくお待ちください。AI対戦・二人対戦・レート戦・レッスン・パズルはこのまま遊べます。',
},
en: {
  'meta.title': 'Patolli — World Board Game Atlas', title: 'Patolli', side0: 'Red', side1: 'Blue',
  'pn.pebble': ['Red', 'Blue'], 'pn.maize': ['Red', 'Blue'], 'pn.obsidian': ['White', 'Black'], 'pn.jade': ['Red', 'Green'], 'pn.clay': ['Brown', 'Grey'], 'pn.gold': ['Gold', 'Blue'],
  'tray.start': 'Waiting', 'tray.goal': 'Home', 'tray.pool': 'Pool', 'tray.gold': '{s}’s stake', 'tray.goldYou': 'Your stake',
  roll: 'Throw', rollPill: 'Throw', 'dice.n': '= {n}', 'dice.zero': '= 0',
  'pl.board': 'On board', 'pl.left': 'Left', 'pl.home': 'home',
  'st.roll': '{s} to throw the beans', 'st.rollSub': 'Press Throw, the space bar, or the beans left of the board',
  'st.move': 'Move {n}: choose a piece', 'st.moveSub': 'Tap a piece (the green mark is where it lands). A single possible move is played for you',
  'st.noMove': 'No piece can move {n}', 'st.zero': 'No marked beans: no move',
  'fx.pass': 'Pass', 'fx.passZero': 'No marked beans', 'fx.passNoMove': 'No piece can move',
  'fx.again': 'Again!', 'fx.againSub': 'Arm-end square: throw again', 'fx.pen': 'Marked square', 'fx.give': 'Pay {a} to {s}', 'fx.get': 'Take {a} from {s}',
  'fx.home': 'Home!', 'fx.cap': 'Captured!', 'fx.round': 'Round {n}', 'fx.roundSub': '{s} brought all six home. Stakes carry over',
  'ev.pool': '{a} to the pool', 'ev.offer': '{a} to the pool as an offering', 'ev.pay': '{a} to {s}', 'ev.pot': 'takes the pool ({a})', 'ev.round': 'round {n}', 'round.n': 'Round {n}',
  'rec.gold': 'Stakes: {a} {x} · {b} {y} · pool {p}',
  'tip.cant': 'That piece cannot move with this throw', 'tip.cantEnter': 'You cannot enter a piece now (with pieces on the board, only a 1 enters)',
  'k.enter': 'enter', 'k.home': 'home', 'k.cap': 'capture', 'k.pass': 'pass',
  'hint.roll': 'Throw the beans first',
  'res.sub': '{n} moves', 'res.why.home': 'All six pieces home', 'res.why.broke': 'The rival ran out of stakes',
  'ng.first': 'You first', 'ng.second': 'AI first', 'ng.level1': 'Near (Red) AI', 'ng.level2': 'Far (Blue) AI',
  'ng.dir': 'Direction (Bell’s rules)', 'ng.dirSame': 'Same way', 'ng.dirOpp': 'Opposite ways',
  'opt.autoRoll': 'Throw automatically', 'opt.danger': 'Show capture risk (coach on, popular rules)',
  'rule.bell': 'Bell’s reconstruction', 'rule.popular': 'Popular rules', 'rule.std': 'Standard',
  'rule.bell.d': 'Proposed by R. C. Bell (1960). 60 squares. Stakes go into a pool; you pay on marked squares and when stuck. No captures. The first to bring six home takes the pool.',
  'rule.popular.d': 'The rules most often seen today. 52 squares. Only a 1 enters. Captures only on the four centre squares. Win by taking all of your rival’s stakes.',
  'bd.title': 'Board', 'bd.petate': 'Reed mat', 'bd.hide': 'Deerskin', 'bd.stone': 'Stone slab', 'bd.codex': 'Codex', 'bd.mosaic': 'Turquoise', 'bd.night': 'Night',
  'pcs.title': 'Pieces', 'pcs.pebble': 'Red & blue pebbles', 'pcs.maize': 'Maize kernels', 'pcs.obsidian': 'Obsidian & shell', 'pcs.jade': 'Jade & red stone', 'pcs.clay': 'Fired clay', 'pcs.gold': 'Gold & turquoise',
  lvd: ['Beginner: moves by luck', 'Novice to intermediate: thinks about extra throws and marked squares', 'Advanced: reads win chances one throw ahead', 'Expert: reads two throws ahead'],
  'rt.desc': 'Rated games against the AI (Bell’s rules, 30 s per move, no undo). You play an AI near your rating.',
  'ls.desc': 'Idea → example → practice → scored problems. 20 points each; 75 of 100 to pass.',
  'lsc.basic': 'Bean chances, arm ends, entering with a 1, going home exactly. Start here.', 'lsc.vari': 'The rules where running out of stakes loses: marked squares and the fight for the centre.',
  'pz.desc': 'From the position and the throw, find the best move.', 'pz.goal': '{s}’s best move?',
  'ng.credit': 'Rules: R. C. Bell’s reconstruction (1960) and the rules common today. The original rules have not survived.',
  'tip.race': '{a} squares left · rival {b}',
  'ol.desc': 'Online play is being prepared. Please wait a little longer. Play vs the AI, two players, rated games, lessons and puzzles work as usual.',
},
};
const out = {};
for (const l of LANGS) { out[l] = {}; for (const k in UR[l]) if (!DROP(k)) out[l][k] = UR[l][k]; Object.assign(out[l], OVER[l]); }
// ウルの言い回し（サイコロ・ゴール）が残っていないか、言語どうしでキーがそろっているかを確かめる
for (const l of LANGS) { for (const k in out.ja) if (!(k in out[l])) throw new Error(l + ' missing ' + k); for (const k in out[l]) { const v = JSON.stringify(out[l][k]); if (/サイコロ|ロゼット|ウル|フィンケル|rosette|Finkel|\bUr\b|dice/i.test(v)) console.warn('check wording', l, k, v); } }
let s = '// patolli/i18n.js — パトリの画面の文言（tools/gen_i18n.js が作る。直接書き換えない）。いまは ja / en。\nwindow.I18N = {\n';
for (const l of LANGS) s += JSON.stringify(l) + ': ' + JSON.stringify(out[l]) + ',\n';
fs.writeFileSync(path.join(__dirname, '..', 'i18n.js'), s + '};\n');
console.log('i18n.js', LANGS.join(' '), Object.keys(out.ja).length, 'keys');
