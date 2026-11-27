// UI text (ja / en). Other languages fall back to English for now.
(function (root) {
'use strict';
const S = {
  ja: {
    title: '雀華', sub: '〜艶やかなる姫君の雀宴〜', series: 'CALMDUST COLLECTION',
    play: '対局', bot: 'BOT戦', rated: '段位戦', freePlay: 'フリー対局', fsEnter: 'フルスクリーン', fsExit: 'フルスクリーン解除', record: '戦績', rkLadder: '段位表', history: '対局履歴', psYakuName: '役', psYakuAll: '全役を見る', psYakuList: '役一覧', ycat1: '一翻役', ycat2: '二翻役', ycat3: '三翻・六翻役', ycatY: '役満', psYakuN: '回数', psYakuP: '出現率', psYakuOf: '総局数 {n} に対して', ptsUnit: '点', rkLocked: '段位戦で「{r}」に到達すると仲間に', rkNext: '次の「{r}」まで あと {n} pt', rkTop: '最高位に到達', rkGain: '段位 {n} pt', rkDown: '降段', rkUp: '昇段！', rkGames: '{n} 戦', rkNextGift: '次の報酬キャラ', rkGiftAt: '「{r}」で獲得・あと {n} pt', rkPl: '位', rkRule: 'スキルあり。相手は段位が上がるにつれて強くなります。級のうちはポイントは減りません。初段からは3位・4位で減り、降段もあります（初段より下には落ちません）。2段階上がるごとに報酬キャラ', rkGiftGet: '報酬キャラ獲得！', lesson: 'レッスン', rules: 'ルール', soon: '準備中',
    east: '東風戦', south: '半荘戦', skillOn: 'スキル戦', skillOff: '標準戦', strength: 'BOTの強さ',
    lv: ['入門', '初級', '中級', '上級', '達人'], start: '対局開始', gacha: 'ガチャ', chars: 'キャラ', coins: 'コイン',
    skill: 'スキル', free: '無料', cost: '{n}点', used: '使用済み', partner: 'パートナー', select: 'えらぶ', selected: '選択中',
    tsumo: 'ツモ', ron: 'ロン', riichi: 'リーチ', pon: 'ポン', chi: 'チー', kan: 'カン', skip: 'スキップ', kyuushu: '九種九牌', cancel: 'やめる',
    round: ['東', '南', '西', '北'], wind: ['東', '南', '西', '北'], kyoku: '{w}{n}局', honba: '{n}本場', dealerOf: '親 {n}', left: '残り{n}', dora: 'ドラ',
    ryuukyoku: '流局', tenpai: 'テンパイ', noten: 'ノーテン', next: '次へ', toHome: 'ホームへ', again: 'もう一局',
    fu: '{n}符', han: '{n}翻', yakuman: '役満', dbl_yakuman: 'ダブル役満', mangan: '満貫', haneman: '跳満', baiman: '倍満', sanbaiman: '三倍満', kazoe: '数え役満',
    final: '最終結果', rank: ['1位', '2位', '3位', '4位'], earned: '+{n} コイン', rarBonus: '{r}ボーナス +{p}%（+{n}）', scoreBonus: '大勝ちボーナス +{n}（{k}点ぶん）', exit: '退出', exitQ: '対局をやめてホームに戻りますか？', yes: 'はい', no: 'いいえ',
    pull1: '1回 ({n})', pull10: '10回 ({n})', notEnough: 'コインが足りません', newChar: 'NEW!', dupe: '同じスキル → +{n} コイン',
    skillUse: 'スキルを使う', skillCostQ: '{n}点を供託に払ってスキルを使いますか？',
    peekT: '次の3回のツモ', peekClose: '覚えたらタップ', mindT: '他家の手', shanten: '{n}向聴', waitsOn: '待ち', handPart: '手の内', abort: { kyuushu: '九種九牌', sanchahou: '三家和', suukaikan: '四開槓', suufon: '四風連打', suucha: '四家立直' }, nagashi: '流し満貫', pao: '包（責任払い）',
    you: 'あなた', yourTurn: 'あなたの番', noArt: 'イラスト準備中', collection: 'コレクション', owned: '所持', close: '閉じる',
    rotate: '横向きにすると遊びやすくなります', landTitle: 'このゲームは横画面で遊びます', landSub: 'スマホを横向きにしてください。\n横にすると対局が始まります。', landNote: '対局はスマホを横向きにして遊びます', loading: '読み込み中…', guide: 'タップで選択、もう一度タップで捨てる',
    timing_deal: '配牌時', timing_turn: '手番で', costLine: '1回目 無料 ・ 2回目 {n}点 ・ 以降は倍', costLineNF: '1回目 {h}点 ・ 2回目 {n}点 ・ 以降は倍', setPartner: 'パートナーにする', isPartner: 'パートナー', lead: '許婚', setLead: '許婚にする', isLead: '許婚（対局に出るキャラ）', ptnPick: 'パートナーを選択してください', ptnHowC: '姉妹のアイコンをクリック', ptnHowT: '姉妹のアイコンをタップ', ptnHome: 'パートナーを選択', ptnNote: '姉妹を1人パートナーにすると、そのスキルも対局で使えます', ptnNone: '姉妹が仲間になると、パートナーに選べます', ptnCost: 'コストはスキルごとに倍増 ・ 無料は2人で最初の1回だけ（封じを除く）', ptnSame: '許婚と同じスキルは持ち込めません', ptnOff: 'はずす', ptnRest: 'ほか{n}人は未加入', notOwned: '未解放：ガチャで解放されます', lockedT: '未解放', mystery: 'このキャラは謎に満ちている', rkVeil: 'この上には何が……？', lockedS: 'ガチャで{r}キャラとして登場します', toGacha: 'ガチャを引く', keys: '<b>1〜0 - ^ ¥</b> 手牌を左から切る　<b>Space</b> ツモ切り<br><b>Enter</b> アガリ　<b>X</b> リーチ　<b>C</b> チー　<b>V</b> ポン　<b>B</b> カン<br><b>Space</b> スキップ　<b>S</b> スキル　<b>D</b> パートナーのスキル', liteOn: '軽量モード：オン（影・常時アニメを止めて描画を軽く）', liteOff: '軽量モード：オフ',
    keysT: 'キー操作', settings: '設定', resetData: 'データをリセット', resetQ: '本当にデータを消して最初からやり直しますか？', resetWarn: '集めたキャラ・スキル・コイン・段位・戦績がすべて消えます。元に戻せません（音や言語などの設定は残ります）。', resetGo: 'リセットする', language: '言語', tapMode: '捨て牌のタップ', tapSingle: 'シングル', tapDouble: 'ダブル', sound: 'サウンド', se: '効果音', music: '音楽', mute: 'ミュート', lite: '軽量モード', on: 'オン', off: 'オフ', liteNote: '軽量モード：影や常時アニメを止めて描画を軽くします',
    kyotakuT: '供託（1000点棒の本数）', honbaT: '積み棒（本場）',
    stats: 'スタッツ', psAll: 'すべて', psGame: 'この対局', psGames: '対局数', psGamesN: '{n}戦', psHands: '局数', psNow: '現在の順位', psAvgRank: '平均順位', psWin: '和了率', psDealin: '放銃率',
    psTop: 'トップ率', psRentai: '連対率', psLastAvoid: 'ラス回避率', psAvgScore: '平均持ち点', psBust: 'トビ率', psRiichi: '立直率', psCall: '副露率', psTsumo: 'ツモ率', psRiichiWin: '立直後の和了率',
    psAvgWin: '平均打点', psAvgDeal: '平均放銃点', psDrawTen: '流局時の聴牌率', psSkill: 'スキル使用（1戦あたり）', psSkillN: 'スキル使用回数', psYakuman: '役満',
    psRanks: '順位の分布', psMaxWin: '最高打点', psYaku: '和了った役', psChars: 'よく使うキャラ', psEmpty: 'まだ記録がありません。対局を最後まで打つと記録されます。', psEmptyG: 'この対局はまだ始まったばかりです。',
    psNoData: '記録を読み込めませんでした。', psNote: '記録はこのブラウザに保存されます（最後まで打った対局のみ）。', psBotNote: 'BOTはこの対局の成績を表示しています。',
    lineH: '台詞', dealQ: 'この局で「{name}」を使いますか？', use: '使う', notUse: '使わない', dealOnly: '配牌時に選択', tapChange: 'タップでキャラ変更', back: '戻る', riichiNo: 'リーチ不可', useThis: 'この対局で使うスキルを選ぶ', ownedSkills: '所持スキル', newSkill: '新スキル!', charRates: 'キャラ', skillRates: 'スキル', tenth: '10連の10回目はSR以上のキャラ確定。持っているキャラが出ると新しいスキルを覚えます', sisters: '姉妹', riichiWhy_sealed: '他家の「封じ」で、この局はリーチできません', riichiWhy_points: '持ち点が1000点未満なのでリーチできません', riichiWhy_wall: '山の残りが4枚未満なのでリーチできません',
  },
  en: {
    title: 'JANKA', sub: 'The Princesses\' Mahjong Banquet', series: 'CALMDUST COLLECTION',
    play: 'Play', bot: 'vs BOT', rated: 'Ranked', freePlay: 'Free play', fsEnter: 'Full screen', fsExit: 'Exit full screen', record: 'Record', rkLadder: 'Ladder', history: 'Game log', psYakuName: 'Yaku', psYakuAll: 'All yaku', psYakuList: 'Yaku list', ycat1: '1-han yaku', ycat2: '2-han yaku', ycat3: '3- and 6-han yaku', ycatY: 'Yakuman', psYakuN: 'Times', psYakuP: 'Rate', psYakuOf: 'over {n} hands played', ptsUnit: 'pts', rkLocked: 'Joins you when you reach “{r}” in Ranked', rkNext: '{n} pt to “{r}”', rkTop: 'Top rank reached', rkGain: 'Rank {n} pt', rkDown: 'Demoted', rkUp: 'Promoted!', rkGames: '{n} games', rkNextGift: 'Next reward', rkGiftAt: 'At “{r}” · {n} pt to go', rkPl: '', rkRule: 'Skills on. Your opponents grow stronger as you climb. In the kyu ranks points never go down; from 1 Dan, 3rd and 4th lose points and you can be demoted (never below 1 Dan). A reward character every second rank.', rkGiftGet: 'Reward character!', lesson: 'Lessons', rules: 'Rules', soon: 'Soon',
    east: 'East only', south: 'Half game', skillOn: 'Skills', skillOff: 'Standard', strength: 'BOT strength',
    lv: ['Novice', 'Easy', 'Normal', 'Hard', 'Master'], start: 'Start', gacha: 'Gacha', chars: 'Characters', coins: 'Coins',
    skill: 'Skill', free: 'Free', cost: '{n} pts', used: 'Used', partner: 'Partner', select: 'Select', selected: 'Selected',
    tsumo: 'Tsumo', ron: 'Ron', riichi: 'Riichi', pon: 'Pon', chi: 'Chi', kan: 'Kan', skip: 'Skip', kyuushu: 'Nine terminals', cancel: 'Cancel',
    round: ['East', 'South', 'West', 'North'], wind: ['E', 'S', 'W', 'N'], kyoku: '{w} {n}', honba: '{n} honba', dealerOf: 'Dealer: {n}', left: '{n} left', dora: 'Dora',
    ryuukyoku: 'Draw', tenpai: 'Tenpai', noten: 'No-ten', next: 'Next', toHome: 'Home', again: 'Play again',
    fu: '{n} fu', han: '{n} han', yakuman: 'Yakuman', dbl_yakuman: 'Double yakuman', mangan: 'Mangan', haneman: 'Haneman', baiman: 'Baiman', sanbaiman: 'Sanbaiman', kazoe: 'Counted yakuman',
    final: 'Final result', rank: ['1st', '2nd', '3rd', '4th'], earned: '+{n} coins', rarBonus: '{r} bonus +{p}% (+{n})', scoreBonus: 'Big-win bonus +{n} ({k} pts over)', exit: 'Leave', exitQ: 'Leave this game and go home?', yes: 'Yes', no: 'No',
    pull1: '×1 ({n})', pull10: '×10 ({n})', notEnough: 'Not enough coins', newChar: 'NEW!', dupe: 'Same skill → +{n} coins',
    skillUse: 'Use skill', skillCostQ: 'Pay {n} points into the pot to use the skill?',
    peekT: 'Your next 3 draws', peekClose: 'Tap when memorised', mindT: 'Opponents', shanten: '{n} away', waitsOn: 'Waits', handPart: 'In hand', abort: { kyuushu: 'Nine terminals', sanchahou: 'Triple ron', suukaikan: 'Four kans', suufon: 'Four winds', suucha: 'Four riichi' }, nagashi: 'Nagashi mangan', pao: 'Pao (liability)',
    you: 'You', yourTurn: 'Your turn', noArt: 'Art coming soon', collection: 'Collection', owned: 'Owned', close: 'Close',
    rotate: 'Landscape is easier to play', landTitle: 'This game is played in landscape', landSub: 'Turn your phone sideways.\nThe game starts when you do.', landNote: 'Games are played with the phone held sideways', loading: 'Loading…', guide: 'Tap to pick, tap again to discard',
    timing_deal: 'At the deal', timing_turn: 'On your turn', costLine: '1st use free · 2nd {n} pts · doubles after', costLineNF: '1st {h} pts · 2nd {n} pts · doubles after', setPartner: 'Make partner', isPartner: 'Partner', lead: 'Fiancée', setLead: 'Make her your fiancée', isLead: 'Fiancée (plays the game)', ptnPick: 'Choose a partner', ptnHowC: 'Click a sister\'s icon', ptnHowT: 'Tap a sister\'s icon', ptnHome: 'Choose a partner', ptnNote: 'Take one sister as partner to use her skill in the game too', ptnNone: 'When a sister joins you, she can be your partner', ptnCost: 'Each skill doubles on its own · one free use for the two (not Seal)', ptnSame: 'The same skill as your fiancée\'s cannot be brought', ptnOff: 'Remove', ptnRest: '{n} more not yet met', notOwned: 'Locked: unlock her from the gacha', lockedT: 'Locked', mystery: 'This character is shrouded in mystery', rkVeil: 'What lies beyond…?', lockedS: 'Appears in the gacha as a {r} character', toGacha: 'Open gacha', keys: '<b>1…0 - ^ ¥</b> discard left to right　<b>Space</b> tsumogiri<br><b>Enter</b> win　<b>X</b> riichi　<b>C</b> chi　<b>V</b> pon　<b>B</b> kan<br><b>Space</b> skip　<b>S</b> skill　<b>D</b> partner\'s skill', liteOn: 'Light mode on (no shadows or looping effects)', liteOff: 'Light mode off',
    keysT: 'Keyboard controls', settings: 'Settings', resetData: 'Reset data', resetQ: 'Erase your data and start over from the beginning?', resetWarn: 'All characters, skills, coins, rank and records will be lost. This cannot be undone (settings such as sound and language are kept).', resetGo: 'Reset', language: 'Language', tapMode: 'Tap to discard', tapSingle: 'Single', tapDouble: 'Double', sound: 'Sound', se: 'Sound effects', music: 'Music', mute: 'Mute', lite: 'Light mode', on: 'On', off: 'Off', liteNote: 'Light mode turns off shadows and looping effects for smoother play',
    kyotakuT: 'Riichi sticks in the pot (1000 pts each)', honbaT: 'Counters (honba)',
    stats: 'Stats', psAll: 'All', psGame: 'This game', psGames: 'Games', psGamesN: '{n} games', psHands: 'Hands', psNow: 'Place now', psAvgRank: 'Avg. place', psWin: 'Win rate', psDealin: 'Deal-in rate',
    psTop: '1st place', psRentai: 'Top two', psLastAvoid: 'Avoid 4th', psAvgScore: 'Avg. final score', psBust: 'Busted', psRiichi: 'Riichi rate', psCall: 'Call rate', psTsumo: 'Tsumo share', psRiichiWin: 'Win after riichi',
    psAvgWin: 'Avg. win', psAvgDeal: 'Avg. deal-in', psDrawTen: 'Tenpai at draws', psSkill: 'Skills per game', psSkillN: 'Skills used', psYakuman: 'Yakuman',
    psRanks: 'Places', psMaxWin: 'Biggest win', psYaku: 'Yaku made', psChars: 'Most played', psEmpty: 'No games yet. A game is recorded when it is played to the end.', psEmptyG: 'This game has only just started.',
    psNoData: 'The record could not be loaded.', psNote: 'Your record is kept in this browser (finished games only).', psBotNote: 'BOTs show this game only.',
    lineH: 'Lines', dealQ: 'Use “{name}” this hand?', use: 'Use', notUse: 'Skip', dealOnly: 'Chosen at the deal', tapChange: 'Tap to change', back: 'Back', riichiNo: 'No riichi', useThis: 'Pick the skill for this game', ownedSkills: 'Skills', newSkill: 'New skill!', charRates: 'Characters', skillRates: 'Skills', tenth: '10th pull of ×10: SR or better character. A character you already have learns a new skill', sisters: 'Sisters', riichiWhy_sealed: 'An opponent used Seal: no riichi this hand', riichiWhy_points: 'You need at least 1000 points to riichi', riichiWhy_wall: 'Fewer than 4 tiles left: no riichi',
  },
};
// ルールコース・レッスン（2026-11-18）
Object.assign(S.ja, { lsNow: '得点 {n}', lsQn: '全{n}問', lsNextQ: '次の問題', lsExample: '例題', lsQ: '問題', lsDrillsGo: 'ここからは練習問題です！ {n}問、だんだんむずかしくなっていきますよ。正解したら、小町がわけを解説しますね♪', lsHint: 'ヒント', lsNext: '次へ', lsStart: 'はじめる', lsQuit: 'レッスンをやめる', lsRules: 'ルール', lsLessons: 'レッスン', lsPass: '合格です！', lsFail: 'もうちょっと！', lsScore: '{n}点',
  lsAgain: 'もう一度', lsNextL: '次へ進む', lsList: '一覧へ', lsCourse: 'ルールコース', lsCourseD: '麻雀の遊び方を、実際の卓で1つずつ覚えます。上から順に進めましょう。', lsNew: '未挑戦', lsWrong: 'あれれ、ちょっと違うみたいです…！ もう一回いきましょっ。',
  lsListT: 'ルール・レッスン', lsListD: '小町といっしょに、実際の卓で遊びながら覚えます', lsPassN: '{a} / {b} 合格', lsPassLine: '75点以上で合格', lsHand: '局の結果を見たら、レッスンのまとめに進みます', lsPassed: '合格', lsSay100: 'かんぺきです！ さすがですね♪', lsSayPass: 'やりましたね、合格です！ この調子で次もいきましょっ。', lsSayFail: 'だいじょうぶ、もう一回やればきっとできますよ！ わたしも最初はそうでした。' });
Object.assign(S.en, { lsNow: 'Score {n}', lsQn: '{n} problems', lsNextQ: 'Next problem', lsExample: 'Example', lsQ: 'Problem', lsDrillsGo: 'Now some practice: {n} problems, getting harder as you go. After each, Komachi explains why.', lsHint: 'Hint', lsNext: 'Next', lsStart: 'Start', lsQuit: 'Quit lesson', lsRules: 'Rules', lsLessons: 'Lessons', lsPass: 'Passed!', lsFail: 'Almost!', lsScore: '{n} pts',
  lsAgain: 'Again', lsNextL: 'Next', lsList: 'List', lsCourse: 'Rules course', lsCourseD: 'Learn how mahjong works step by step at a real table. Go from the top.', lsNew: 'New', lsWrong: 'Close! Think again.',
  lsListT: 'Rules & lessons', lsListD: 'Learn by playing at a real table with Komachi', lsPassN: '{a} / {b} passed', lsPassLine: '75 or more to pass', lsHand: 'After the result, the lesson summary follows', lsPassed: 'passed', lsSay100: 'Perfect! You\'re amazing♪', lsSayPass: 'You did it — passed! Let\'s keep going.', lsSayFail: 'Don\'t worry, you\'ll get it next time! I was the same at first.' });
// クラウド連携（2026-11-18）
Object.assign(S.ja, { cloudT: '進行状況をクラウドに保存', cloudD: 'Google アカウントで連携すると、機種変更や別の端末でも続きから遊べます', cloudBtn: 'Google で連携', cloudOn: '連携中', cloudSync: '今すぐ同期', cloudOff: '解除',
  cloudBusy: '同期中…', cloudLast: '同期 {t}', cloudErr_rules: 'クラウド連携は準備中です', cloudErr_net: '通信できませんでした。あとでもう一度お試しください', cloudErr_fail: '連携できませんでした',
  cloudOffQ: '連携を解除しますか？（この端末のデータはそのまま残ります）', cloudAskT: 'どちらのデータで遊びますか？', cloudAskD: 'この端末とクラウドで進行が違います。選ばなかった方のデータは上書きされます。',
  cloudLocal: 'この端末', cloudCloud: 'クラウド', cloudUse: 'これで遊ぶ', cloudLater: 'あとで決める', sumChars: 'キャラ', sumGames: '対局数', sumCoins: 'コイン', sumPt: '段位pt', cloudSaved: '{t} に保存', cloudShort: 'データ連携', cloudErr_tamper: 'セーブデータが書き換えられているため、クラウドに保存できません', tamperNote: 'セーブデータがゲームの外で書き換えられています。クラウド保存は使えません' });
Object.assign(S.en, { cloudT: 'Save your progress', cloudD: 'Link your Google account to keep playing on a new phone or another device', cloudBtn: 'Link with Google', cloudOn: 'Linked', cloudSync: 'Sync now', cloudOff: 'Unlink',
  cloudBusy: 'Syncing…', cloudLast: 'Synced {t}', cloudErr_rules: 'Cloud saving is not ready yet', cloudErr_net: 'Could not connect. Please try again later', cloudErr_fail: 'Could not link',
  cloudOffQ: 'Unlink? (The data on this device stays as it is)', cloudAskT: 'Which data do you want to play with?', cloudAskD: 'This device and the cloud have different progress. The one you do not pick is overwritten.',
  cloudLocal: 'This device', cloudCloud: 'Cloud', cloudUse: 'Play with this', cloudLater: 'Decide later', sumChars: 'Characters', sumGames: 'Games', sumCoins: 'Coins', sumPt: 'Rank pt', cloudSaved: 'Saved {t}', cloudShort: 'Cloud save', cloudErr_tamper: 'This save was edited outside the game and cannot be saved to the cloud', tamperNote: 'This save was edited outside the game. Cloud saving is disabled' });
// 世界のボドゲ大百科の麻雀（riichi/、2026-11-27）：キャラ・スキルなしの言い方
if (root.JANKA_CLASSIC) {
  Object.assign(S.ja, { title: '麻雀', sub: 'リーチ麻雀', series: '世界のボドゲ大百科', rkRuleC: '標準ルール（スキルなし）。相手は段位が上がるにつれて強くなります。級のうちはポイントは減りません。初段からは3位・4位で減り、降段もあります（初段より下には落ちません）。',
    lsDrillsGo: 'ここからは練習問題！ {n}問、だんだんむずかしくなっていくよ。正解したら、わけはぼくが話すね♪', lsListD: 'クジャクパイといっしょに、実際の卓で遊びながら覚えよう', lsSay100: 'かんぺき！ ぼくのしっぽも、うれしくて広がっちゃった♪', lsSayPass: 'やったね、合格クジャ！ この調子で次もいこう。', lsSayFail: 'だいじょうぶ、もう一回やればきっとできる！ ぼくもいっしょに見てるからね。', lsWrong: 'あれれ、ちょっと違うみたい…！ もう一回いってみよう。', bot: 'CPU戦', psBotNote: 'CPUはこの対局の成績を表示しています。', clGift: '🎁 {name}（{r}）をゲット！ 大百科のきせかえで使えます', clGiftGuide: '🎁 ルールコース完走！ クジャクパイ（N）をゲット！ 大百科のきせかえで使えます' });
  Object.assign(S.en, { title: 'Mahjong', sub: 'Riichi Mahjong', series: 'World Board Game Atlas', rkRuleC: 'Standard rules (no skills). Your opponents grow stronger as you climb. In the kyu ranks points never go down; from 1 Dan, 3rd and 4th lose points and you can be demoted (never below 1 Dan).',
    lsDrillsGo: 'Now some practice: {n} problems, getting harder as you go. After each one, I\'ll tell you why.', lsListD: 'Learn by playing at a real table with Peacotile', bot: 'vs CPU', psBotNote: 'For a CPU, this game\'s record is shown.', clGift: '🎁 You got {name} ({r})! Wear it in the Atlas\' dress-up', clGiftGuide: '🎁 Rules course complete! You got Peacotile (N) — wear it in the Atlas\' dress-up' });
}
const YAKU = {
  ja: { riichi: '立直', dbl_riichi: 'ダブル立直', ippatsu: '一発', tsumo: '門前清自摸和', pinfu: '平和', tanyao: '断幺九', iipeikou: '一盃口',
    haku: '役牌 白', hatsu: '役牌 發', chun: '役牌 中', seat_wind: '自風牌', round_wind: '場風牌', haitei: '海底摸月', houtei: '河底撈魚', rinshan: '嶺上開花', chankan: '槍槓',
    chiitoi: '七対子', chanta: '混全帯幺九', ittsu: '一気通貫', sanshoku: '三色同順', sanshoku_k: '三色同刻', toitoi: '対々和', sanankou: '三暗刻', sankantsu: '三槓子',
    shousangen: '小三元', honroutou: '混老頭', honitsu: '混一色', junchan: '純全帯幺九', ryanpeikou: '二盃口', chinitsu: '清一色',
    dora: 'ドラ', aka: '赤ドラ', ura: '裏ドラ', skill_han: 'スキル',
    kokushi: '国士無双', suuankou: '四暗刻', daisangen: '大三元', shousuushii: '小四喜', daisuushii: '大四喜', tsuuiisou: '字一色', ryuuiisou: '緑一色',
    chinroutou: '清老頭', chuuren: '九蓮宝燈', suukantsu: '四槓子', tenhou: '天和', chiihou: '地和' },
  en: { riichi: 'Riichi', dbl_riichi: 'Double riichi', ippatsu: 'Ippatsu', tsumo: 'Menzen tsumo', pinfu: 'Pinfu', tanyao: 'All simples', iipeikou: 'Pure double sequence',
    haku: 'White dragon', hatsu: 'Green dragon', chun: 'Red dragon', seat_wind: 'Seat wind', round_wind: 'Round wind', haitei: 'Last tile draw', houtei: 'Last tile claim', rinshan: 'After a kan', chankan: 'Robbing a kan',
    chiitoi: 'Seven pairs', chanta: 'Outside hand', ittsu: 'Pure straight', sanshoku: 'Mixed triple sequence', sanshoku_k: 'Triple triplets', toitoi: 'All triplets', sanankou: 'Three concealed triplets', sankantsu: 'Three kans',
    shousangen: 'Little three dragons', honroutou: 'All terminals & honors', honitsu: 'Half flush', junchan: 'Terminal in each set', ryanpeikou: 'Twice pure double sequence', chinitsu: 'Full flush',
    dora: 'Dora', aka: 'Red five', ura: 'Ura dora', skill_han: 'Skill',
    kokushi: 'Thirteen orphans', suuankou: 'Four concealed triplets', daisangen: 'Big three dragons', shousuushii: 'Little four winds', daisuushii: 'Big four winds', tsuuiisou: 'All honors', ryuuiisou: 'All green',
    chinroutou: 'All terminals', chuuren: 'Nine gates', suukantsu: 'Four kans', tenhou: 'Blessing of heaven', chiihou: 'Blessing of earth' },
};
let lang = 'ja';
try { const l = localStorage.getItem('janka-lang'); if (l) lang = l; else if (!/^ja/.test(navigator.language)) lang = 'en'; } catch (e) {}
function t(key, vars) {
  const d = S[lang] || S.en;
  let v = key.split('.').reduce((o, k) => o == null ? o : o[k], d);
  if (v == null) v = key.split('.').reduce((o, k) => o == null ? o : o[k], S.en);
  if (typeof v === 'string' && vars) v = v.replace(/\{(\w+)\}/g, (_, k) => vars[k]);
  return v == null ? key : v;
}
root.I18N = {
  t, yaku: k => (YAKU[lang] || YAKU.en)[k] || k, yakuKeys: () => Object.keys(YAKU.ja),
  get lang() { return lang; },
  set(l) { lang = S[l] ? l : 'en'; try { localStorage.setItem('janka-lang', lang); } catch (e) {} document.documentElement.lang = lang; },
  L: o => o ? (o[lang] || o.en || o.ja) : '',
};
})(window);
