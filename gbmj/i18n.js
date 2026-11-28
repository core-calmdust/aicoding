// 国標麻将の文言。I18N.t(key, vars)、I18N.fan(id)（番種名）、I18N.fanDesc(id)（図鑑の説明）。
// 言語メニューに出すのは、その言語の文言がそろったものだけ（LANGS）。足りない言葉は英語、図鑑の説明は日本語の原文へ。
(function (root) {
'use strict';
const S = {
  ja: {
    title: '国標麻将', sub: '中国の公式ルール（MCR）の麻雀。81の番種で8点以上を作って上がろう。',
    mFree: 'CPU戦', mFreeS: '相手 Lv.{lv}', mRated: 'レート戦', mRatedPl: '予備選から', mTut: 'チュートリアル', mTutS: '盤面で遊びながら覚える', done: '修了',
    mDex: '番種図鑑', mDexS: '81の番種と例の手', mLs: 'レッスン', mLsS: '8点を作るコツ', mOnline: 'オンライン', soon: '準備中', onlineSoon: 'オンライン対戦は準備中です。',
    homeNote: '立直・ドラ・符・フリテンはありません。花牌は1枚1点（8点縛りには数えません）。',
    lang: '言語', close: '閉じる', settings: '設定', sSound: '効果音', sCoach: 'コーチ（目標の番と待ちの点）',
    tGame: 'ゲーム', tRule: 'ルール', start: '対局開始', ratedNote: 'あなたのレートに合わせて CPU の強さが決まります。順位でレートが上下します。',
    length: '対局の長さ', hands: '{n}局', ratedFixed: 'レート戦は8局（東・南の2圏）・既定ルールで固定です。', opp: '相手の強さ', rating: 'レート',
    lvDesc1: '入門：形を見ずに捨てることがよくあります。', lvDesc2: '初級：目標の番を追いますが、ときどき見落とします。', lvDesc3: '中級：8点の目標を立てて、危ない相手も気にします。',
    lvDesc4: '上級：受け入れと守りのバランスが良く、鳴きの判断も的確です。', lvDesc5: '最上級：次のツモまで読んで打ちます。',
    tiersT: '強さの目安', rateScale: 'Lv.1 が 300、Lv.20 が 2100（大百科の共通の目盛り）。',
    lenNote: '16局で正式な1試合（東南西北の4圏）。毎局、親が交代します。',
    tjName: '天津2006の追加裁定', tjDesc: '2006年10月の天津の審判講習で足された2つの扱い：七対子と緑一色・清么九を合わせたときは四帰一を数えない／組合龍は辺張・嵌張と合わせて数えない。オフなら2006年版ルールブックの本文どおりです。',
    tjRated: 'レート戦では選べません（既定ルール）。', tjShort: '天津裁定', ruleBase: '基本ルール（2006年版）', ruleBaseDesc: '144枚（花牌8枚）・8点縛り・ロンは放銃者が「点＋8」、ほかの2人が8点ずつ、ツモは3人が「点＋8」ずつ払います。8点未満の和了宣言は誤和了（ほかの3人に10点ずつ、その局は和了できません）。',
    you: 'あなた', cpu: 'CPU {n}', lowTitle: '8点に足りません', lowBody: 'この和了は {n}点（花牌を除く）で、8点に届きません。宣言すると誤和了になり、ほかの3人に10点ずつ払い、この局は和了できなくなります。', lowYes: 'それでも宣言する', cancel: 'やめる',
    flowerToast: '{who}：花牌を補充', call_chi: 'チー', call_pon: 'ポン', call_kan: 'カン', falseHu: '誤和了', falseHuToast: '{who}が8点未満（{n}点）で和了を宣言：誤和了', tsumo: 'ツモ', ron: 'ロン', exhaust: '流局',
    roundName: '{w}{n}局', wind0: '東', wind1: '南', wind2: '西', wind3: '北', handNo: '{n} / {of}局', windS0: '東', windS1: '南', windS2: '西', windS3: '北',
    flowersN: '花 {n}', dead: '和了不可', ptsN: '{n}点', lowShort: '8点未満（{n}点）', ankan: '暗槓', kakan: '加槓', pass: 'パス',
    coach: 'コーチ', tenpai: '聴牌：待ちと点（ロン）', lowWaitWarn: '赤い待ちは8点に届きません（上がれません）。', shantenN: 'あと{n}枚で聴牌', recDiscard: 'おすすめの捨て牌', targets: '近い目標の番', ptsUnit: '点', ready: '聴牌', awayN: 'あと{n}',
    total: '合計', byTsumo: 'ツモ和了', byRob: '{from}の加槓で搶槓', byRon: '{from}からロン', winTitle: '{who}の和了', payTsumo: 'ほかの3人が {n}＋8 点ずつ払います。', payRon: '放銃者が {n}＋8 点、ほかの2人が 8 点ずつ払います。',
    exhaustNote: '山がなくなりました。点の移動はありません。', seeFinal: '最終結果へ', nextHand: '次の局へ', rankN: '{n}位', finalTitle: '最終結果', tableP: '順位点 {n}', toHome: 'ホームへ', again: 'もう一度',
    dexNote: '点の高い順。例の手はすべて実際に計算して、その番が付き8点以上で上がれることを確かめています。',
    exitTitle: '対局をやめますか？', exitBody: 'この対局は記録されません。', exitYes: 'やめる', yes: 'はい', no: 'いいえ',
  },
  en: {
    title: 'Chinese Official Mahjong', sub: 'Mahjong by the Chinese official rules (MCR). Build 8 points or more out of 81 scoring patterns to win.',
    mFree: 'vs CPU', mFreeS: 'Opponents Lv.{lv}', mRated: 'Rated', mRatedPl: 'Placement first', mTut: 'Tutorial', mTutS: 'Learn by playing on the table', done: 'Done',
    mDex: 'Fan Guide', mDexS: 'All 81 fan with example hands', mLs: 'Lessons', mLsS: 'How to reach 8 points', mOnline: 'Online', soon: 'Coming soon', onlineSoon: 'Online play is coming soon.',
    homeNote: 'No riichi, dora, fu or furiten. Each flower is 1 point (flowers do not count toward the 8-point minimum).',
    lang: 'Language', close: 'Close', settings: 'Settings', sSound: 'Sound effects', sCoach: 'Coach (target fan and wait points)',
    tGame: 'Game', tRule: 'Rules', start: 'Start', ratedNote: 'The CPU strength follows your rating. Your placing moves your rating.',
    length: 'Length', hands: '{n} hands', ratedFixed: 'Rated games are 8 hands (East and South rounds) with the standard rules.', opp: 'Opponents', rating: 'Rating',
    lvDesc1: 'Beginner: often discards without looking at the hand.', lvDesc2: 'Novice: aims at a fan but sometimes misses things.', lvDesc3: 'Intermediate: plans an 8-point hand and watches dangerous players.',
    lvDesc4: 'Advanced: balances speed and defence, and calls well.', lvDesc5: 'Expert: looks ahead to the next draw.',
    tiersT: 'Strength guide', rateScale: 'Lv.1 is 300 and Lv.20 is 2100 (the common scale of the Atlas).',
    lenNote: '16 hands is a full official game (four rounds: East, South, West, North). The dealer changes every hand.',
    tjName: 'Tianjin 2006 rulings', tjDesc: 'Two rulings added at the Tianjin referee seminar (October 2006): Tile Hog is not counted with Seven Pairs plus All Green or All Terminals, and Knitted Straight does not combine with Edge or Closed Wait. Off = the 2006 rulebook text.',
    tjRated: 'Not available in rated games (standard rules).', tjShort: 'Tianjin', ruleBase: 'Basic rules (2006 edition)', ruleBaseDesc: '144 tiles (8 flowers), 8-point minimum. On a discard win the discarder pays points + 8 and the other two pay 8 each; on a self-drawn win all three pay points + 8. Declaring a win under 8 points is a false win (10 points to each other player, no win this hand).',
    you: 'You', cpu: 'CPU {n}', lowTitle: 'Below 8 points', lowBody: 'This win is worth {n} points (without flowers), below the 8-point minimum. Declaring it is a false win: you pay 10 points to each other player and cannot win this hand.', lowYes: 'Declare anyway', cancel: 'Cancel',
    flowerToast: '{who}: flower replaced', call_chi: 'Chow', call_pon: 'Pung', call_kan: 'Kong', falseHu: 'False win', falseHuToast: '{who} declared a win under 8 points ({n}): false win', tsumo: 'Self-drawn', ron: 'Win', exhaust: 'Draw',
    roundName: '{w} {n}', wind0: 'East', wind1: 'South', wind2: 'West', wind3: 'North', handNo: 'Hand {n} / {of}', windS0: 'E', windS1: 'S', windS2: 'W', windS3: 'N',
    flowersN: 'Flowers {n}', dead: 'Cannot win', ptsN: '{n} pts', lowShort: 'Under 8 ({n})', ankan: 'Concealed kong', kakan: 'Add to kong', pass: 'Pass',
    coach: 'Coach', tenpai: 'Ready: waits and points (on a discard)', lowWaitWarn: 'Red waits are below 8 points (you cannot win on them).', shantenN: '{n} away from ready', recDiscard: 'Suggested discard', targets: 'Closest fan', ptsUnit: ' pts', ready: 'Ready', awayN: '{n} away',
    total: 'Total', byTsumo: 'Self-drawn', byRob: 'Robbing {from}\'s kong', byRon: 'On {from}\'s discard', winTitle: '{who} won', payTsumo: 'The other three pay {n} + 8 each.', payRon: 'The discarder pays {n} + 8; the other two pay 8 each.',
    exhaustNote: 'The wall ran out. No points change hands.', seeFinal: 'Final result', nextHand: 'Next hand', rankN: '#{n}', finalTitle: 'Final result', tableP: 'Table points {n}', toHome: 'Home', again: 'Play again',
    dexNote: 'Highest first. Every example hand is scored by the game to check it has that fan and reaches 8 points.',
    exitTitle: 'Quit this game?', exitBody: 'This game will not be recorded.', exitYes: 'Quit', yes: 'Yes', no: 'No',
  },
};
// 言語メニュー（文言がそろった言語だけ）
const ALL = [['ja', '日本語'], ['en', 'English'], ['zh', '简体中文'], ['zh-TW', '繁體中文'], ['ko', '한국어'], ['es', 'Español'], ['fr', 'Français'], ['pt', 'Português'], ['de', 'Deutsch'], ['ru', 'Русский'], ['tr', 'Türkçe'], ['id', 'Indonesian'], ['hi', 'हिन्दी'], ['ar', 'العربية']];
const LANGS = ALL.filter(([k]) => S[k]);
// 番種名：言語ごと（ない言語は英語の定訳）。ja・zh・en は fan.js の表
const FAN = {};
const DESC = {};
let lang = 'ja';
function detect() {
  const ls = (navigator.languages || [navigator.language || 'en']).map(x => String(x));
  for (const x of ls) {
    const l = x.toLowerCase();
    if (l.startsWith('zh')) { const k = /tw|hk|hant|mo/.test(l) ? 'zh-TW' : 'zh'; if (S[k]) return k; continue; }
    const k = l.slice(0, 2); if (S[k]) return k;
  }
  return 'en';
}
const I18N = {
  S, FAN, DESC, LANGS,
  get lang() { return lang; },
  init(pref) { lang = pref && S[pref] ? pref : detect(); },
  set(l) { if (S[l]) lang = l; },
  t(k, v) { let x = (S[lang] && S[lang][k]) != null ? S[lang][k] : S.en[k] != null ? S.en[k] : S.ja[k]; if (x == null) return k; if (v) x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] != null ? v[y] : ''); return x; },
  fan(id) {
    if (FAN[lang] && FAN[lang][id]) return FAN[lang][id];
    const f = GBFan.FANS[id];
    return lang === 'ja' ? f[4] : lang === 'zh' ? f[2] : f[3];
  },
  fanDesc(id) { return (DESC[lang] && DESC[lang][id]) || (lang !== 'ja' && DESC.en && DESC.en[id]) || GBFandex[id].d; },
};
root.I18N = I18N;
})(window);
