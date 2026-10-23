// UI text (ja / en). Other languages fall back to English for now.
(function (root) {
'use strict';
const S = {
  ja: {
    title: '雀華', sub: '〜姫たちの麻雀〜', series: 'CALMDUST COLLECTION',
    play: '対局', bot: 'BOT戦', rated: 'レート戦', lesson: 'レッスン', rules: 'ルール', soon: '準備中',
    east: '東風戦', south: '半荘戦', skillOn: 'スキル戦', skillOff: '標準戦', strength: 'BOTの強さ',
    lv: ['入門', '初級', '中級', '上級', '達人'], start: '対局開始', gacha: 'ガチャ', chars: 'キャラ', coins: 'コイン',
    skill: 'スキル', free: '無料', cost: '{n}点', used: '使用済み', partner: 'パートナー', select: 'えらぶ', selected: '選択中',
    tsumo: 'ツモ', ron: 'ロン', riichi: 'リーチ', pon: 'ポン', chi: 'チー', kan: 'カン', skip: 'スキップ', kyuushu: '九種九牌', cancel: 'やめる',
    round: ['東', '南', '西', '北'], wind: ['東', '南', '西', '北'], kyoku: '{w}{n}局', honba: '{n}本場', left: '残り{n}', dora: 'ドラ',
    ryuukyoku: '流局', tenpai: 'テンパイ', noten: 'ノーテン', next: '次へ', toHome: 'ホームへ', again: 'もう一局',
    fu: '{n}符', han: '{n}翻', yakuman: '役満', dbl_yakuman: 'ダブル役満', mangan: '満貫', haneman: '跳満', baiman: '倍満', sanbaiman: '三倍満', kazoe: '数え役満',
    final: '最終結果', rank: ['1位', '2位', '3位', '4位'], earned: '+{n} コイン', exit: '退出', exitQ: '対局をやめてホームに戻りますか？', yes: 'はい', no: 'いいえ',
    pull1: '1回 ({n})', pull10: '10回 ({n})', notEnough: 'コインが足りません', newChar: 'NEW!', dupe: '同じスキル → +{n} コイン',
    skillUse: 'スキルを使う', skillCostQ: '{n}点を供託に払ってスキルを使いますか？',
    peekT: '次の3回のツモ', mindT: '他家の手', shanten: '{n}向聴', waitsOn: '待ち', abort: { kyuushu: '九種九牌', sanchahou: '三家和', suukaikan: '四開槓' },
    you: 'あなた', yourTurn: 'あなたの番', noArt: 'イラスト準備中', collection: 'コレクション', owned: '所持', close: '閉じる',
    rotate: '横向きにすると遊びやすくなります', landTitle: 'このゲームは横画面で遊びます', landSub: 'スマホを横向きにしてください。\n横にすると対局が始まります。', landNote: '対局はスマホを横向きにして遊びます', loading: '読み込み中…', guide: 'タップで選択、もう一度タップで捨てる',
    timing_deal: '配牌時', timing_turn: '手番で', costLine: '1回目 無料 ・ 2回目 {n}点 ・ 以降は倍', setPartner: 'パートナーにする', isPartner: 'パートナー', notOwned: '未解放：ガチャで解放されます', lockedT: '未解放', lockedS: 'ガチャで{r}キャラとして登場します', toGacha: 'ガチャを引く', keys: '<b>1〜0 - ^ ¥</b> 手牌を左から切る　<b>Space</b> ツモ切り<br><b>Z X C V B</b> 下のボタンを左から　<b>Esc</b> スキップ<br><b>S</b> スキル　<b>← →</b>＋<b>Enter</b> 選んで切る', liteOn: '軽量モード：オン（影・常時アニメを止めて描画を軽く）', liteOff: '軽量モード：オフ',
    lineH: '台詞', dealQ: 'この局で「{name}」を使いますか？', use: '使う', notUse: '使わない', dealOnly: '配牌時に選択', tapChange: 'タップでキャラ変更', back: '戻る', riichiNo: 'リーチ不可', useThis: 'この対局で使うスキルを選ぶ', ownedSkills: '所持スキル', newSkill: '新スキル!', charRates: 'キャラ', skillRates: 'スキル', tenth: '10連の10回目はSR以上のキャラ確定。持っているキャラが出ると新しいスキルを覚えます', sisters: '姉妹', riichiWhy_sealed: '他家の「封じ」で、この局はリーチできません', riichiWhy_points: '持ち点が1000点未満なのでリーチできません', riichiWhy_wall: '山の残りが4枚未満なのでリーチできません',
  },
  en: {
    title: 'JANKA', sub: 'Mahjong of the Princesses', series: 'CALMDUST COLLECTION',
    play: 'Play', bot: 'vs BOT', rated: 'Rated', lesson: 'Lessons', rules: 'Rules', soon: 'Soon',
    east: 'East only', south: 'Half game', skillOn: 'Skills', skillOff: 'Standard', strength: 'BOT strength',
    lv: ['Novice', 'Easy', 'Normal', 'Hard', 'Master'], start: 'Start', gacha: 'Gacha', chars: 'Characters', coins: 'Coins',
    skill: 'Skill', free: 'Free', cost: '{n} pts', used: 'Used', partner: 'Partner', select: 'Select', selected: 'Selected',
    tsumo: 'Tsumo', ron: 'Ron', riichi: 'Riichi', pon: 'Pon', chi: 'Chi', kan: 'Kan', skip: 'Skip', kyuushu: 'Nine terminals', cancel: 'Cancel',
    round: ['East', 'South', 'West', 'North'], wind: ['E', 'S', 'W', 'N'], kyoku: '{w} {n}', honba: '{n} honba', left: '{n} left', dora: 'Dora',
    ryuukyoku: 'Draw', tenpai: 'Tenpai', noten: 'No-ten', next: 'Next', toHome: 'Home', again: 'Play again',
    fu: '{n} fu', han: '{n} han', yakuman: 'Yakuman', dbl_yakuman: 'Double yakuman', mangan: 'Mangan', haneman: 'Haneman', baiman: 'Baiman', sanbaiman: 'Sanbaiman', kazoe: 'Counted yakuman',
    final: 'Final result', rank: ['1st', '2nd', '3rd', '4th'], earned: '+{n} coins', exit: 'Leave', exitQ: 'Leave this game and go home?', yes: 'Yes', no: 'No',
    pull1: '×1 ({n})', pull10: '×10 ({n})', notEnough: 'Not enough coins', newChar: 'NEW!', dupe: 'Same skill → +{n} coins',
    skillUse: 'Use skill', skillCostQ: 'Pay {n} points into the pot to use the skill?',
    peekT: 'Your next 3 draws', mindT: 'Opponents', shanten: '{n} away', waitsOn: 'Waits', abort: { kyuushu: 'Nine terminals', sanchahou: 'Triple ron', suukaikan: 'Four kans' },
    you: 'You', yourTurn: 'Your turn', noArt: 'Art coming soon', collection: 'Collection', owned: 'Owned', close: 'Close',
    rotate: 'Landscape is easier to play', landTitle: 'This game is played in landscape', landSub: 'Turn your phone sideways.\nThe game starts when you do.', landNote: 'Games are played with the phone held sideways', loading: 'Loading…', guide: 'Tap to pick, tap again to discard',
    timing_deal: 'At the deal', timing_turn: 'On your turn', costLine: '1st use free · 2nd {n} pts · doubles after', setPartner: 'Make partner', isPartner: 'Partner', notOwned: 'Locked: unlock her from the gacha', lockedT: 'Locked', lockedS: 'Appears in the gacha as a {r} character', toGacha: 'Open gacha', keys: '<b>1…0 - ^ ¥</b> discard tiles left to right　<b>Space</b> tsumogiri<br><b>Z X C V B</b> buttons left to right　<b>Esc</b> skip<br><b>S</b> skill　<b>← →</b>+<b>Enter</b> pick and discard', liteOn: 'Light mode on (no shadows or looping effects)', liteOff: 'Light mode off',
    lineH: 'Lines', dealQ: 'Use “{name}” this hand?', use: 'Use', notUse: 'Skip', dealOnly: 'Chosen at the deal', tapChange: 'Tap to change', back: 'Back', riichiNo: 'No riichi', useThis: 'Pick the skill for this game', ownedSkills: 'Skills', newSkill: 'New skill!', charRates: 'Characters', skillRates: 'Skills', tenth: '10th pull of ×10: SR or better character. A character you already have learns a new skill', sisters: 'Sisters', riichiWhy_sealed: 'An opponent used Seal: no riichi this hand', riichiWhy_points: 'You need at least 1000 points to riichi', riichiWhy_wall: 'Fewer than 4 tiles left: no riichi',
  },
};
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
  t, yaku: k => (YAKU[lang] || YAKU.en)[k] || k,
  get lang() { return lang; },
  set(l) { lang = S[l] ? l : 'en'; try { localStorage.setItem('janka-lang', lang); } catch (e) {} document.documentElement.lang = lang; },
  L: o => o ? (o[lang] || o.en || o.ja) : '',
};
})(window);
