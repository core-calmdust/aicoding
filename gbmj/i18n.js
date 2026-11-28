// 国標麻将の文言。I18N.t(key, vars)、I18N.fan(id)（番種名）、I18N.fanDesc(id)（図鑑の説明）。
// ja・en はこのファイル、ほかの12言語は i18n/<lang>.js（I18N.add で登録。選んだ言語だけ読む）。足りない言葉は英語へ。
(function (root) {
'use strict';
const S = {
  ja: {
    title: '国標麻将', sub: '中国の公式ルール（MCR）の麻雀。81の番種で8点以上を作って上がろう。',
    mFree: 'CPU戦', mFreeS: '相手 Lv.{lv}', mRated: 'レート戦', mRatedPl: '予備選から', mTut: 'チュートリアル', mTutS: '1局打ちながら覚える', done: '修了',
    mDex: '番種図鑑', mDexS: '81の番種と例の手', mLs: 'レッスン', mLsS: '8点を作るコツ', mOnline: 'オンライン', soon: '準備中', onlineSoon: 'オンライン対戦は準備中です。',
    homeNote: '立直・ドラ・符・フリテンはありません。花牌は1枚1点（8点縛りには数えません）。',
    lang: '言語', close: '閉じる', settings: '設定', sSound: '効果音', sMusic: 'BGM', sMute: 'ミュート', sCoach: 'コーチ（目標の番と待ちの点）',
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
    next: '次へ', tu_play: '対局してみる',
    tu_intro: '国標麻将へようこそ！中国の公式ルールの麻雀です。4面子＋1雀頭（または七対子など）をそろえ、番種の点の合計が8点以上なら上がれます。この1局で、実際に打ちながら覚えましょう。',
    tu_hand: 'これがあなたの手牌です。あなたは親（東）なので14枚あり、最初に1枚捨てます。牌に触れると、卓の上の同じ牌が光ります。',
    tu_goal: '萬子の123・筒子の456・索子の78があります。3つの色で123・456・789を1組ずつそろえると「花龍」で8点。これだけで8点縛りを満たせます。',
    tu_flower: '配牌にあった花牌（春）は、名札の横に出して山の後ろから1枚補充しました。花牌は1枚1点ですが、8点縛りには数えません。',
    tu_d1: '北を捨てましょう。字牌の北と西は、花龍にも雀頭にも使わない牌です。光っている北をクリック（タップ）。',
    tu_d1_no: 'その牌は花龍の組か雀頭（五索の対子）に使います。いらないのは北と西。まずは光っている北を。',
    tu_d1_ok: 'いい捨て牌です。CPU の番が回ります。',
    tu_chi: '上家（左の人）が九索を捨てました。手の七八索と合わせると789索——花龍の最後の1組です。チーは上家の捨て牌だけでできます。「チー」を押しましょう。',
    tu_chi_no: 'パスすると、花龍の最後の1組がそろいません。ここはチーです。',
    tu_chi_ok: '789索ができて、花龍がそろいました！',
    tu_d2: '鳴いたら1枚捨てます。西を捨てると、あと1枚で上がれる「聴牌」です。',
    tu_d2_no: 'その牌を捨てると形が崩れます。いらないのは西です。',
    tu_d2_ok: '聴牌！あとは二三索の両側、一索か四索を待ちます。',
    tu_waits: 'コーチ欄に、待ちの牌とそれで上がったときの点が出ます。一索なら11点、四索なら10点——どちらも8点以上なので上がれます。8点に届かない待ちは赤く出ます（上がれません）。',
    tu_ron: '右の人が四索を捨てました！ロンで上がりましょう。国標麻将にはフリテンがないので、自分が前に捨てた牌でもロンできます。',
    tu_ron_no: '見逃すと、次はいつ来るかわかりません。ここはロンです。',
    tu_ron_ok: '和了！点を見てみましょう。',
    tu_fans: '和了の内訳です。花龍8点・平和（4面子とも順子で字牌なし）2点で10点（8点以上なのでOK）、花牌1点を足して合計11点。8点に足りない和了を宣言すると誤和了で、ほかの3人に10点ずつ払います。',
    tu_pay: '支払い：ロンなら放銃した人が「点＋8」、ほかの2人も8点ずつ払います。ツモなら3人が「点＋8」ずつ。立直・ドラ・符はありません。',
    tu_end: 'これで遊べます！ほかにもポン・カン（暗槓は伏せる）、七対子・十三么・全不靠など81の番種があります。番種図鑑で例の手を見ながら、8点の作り方を覚えていきましょう。',
    tu_m_d1: '花龍まで', tu_m_chi: '花龍まで', tu_m_d2: '聴牌まで', tu_m_ron: 'この和了の点（8点で合格）',
    exitTitle: '対局をやめますか？', exitBody: 'この対局は記録されません。', exitYes: 'やめる', yes: 'はい', no: 'いいえ', leftShort: '余', minRule: '8点縛り', stats: '戦績',
  },
  en: {
    title: 'Chinese Official Mahjong', sub: 'Mahjong by the Chinese official rules (MCR). Build 8 points or more out of 81 scoring patterns to win.',
    mFree: 'vs CPU', mFreeS: 'Opponents Lv.{lv}', mRated: 'Rated', mRatedPl: 'Placement first', mTut: 'Tutorial', mTutS: 'Learn by playing a hand', done: 'Done',
    mDex: 'Fan Guide', mDexS: 'All 81 fan with example hands', mLs: 'Lessons', mLsS: 'How to reach 8 points', mOnline: 'Online', soon: 'Coming soon', onlineSoon: 'Online play is coming soon.',
    homeNote: 'No riichi, dora, fu or furiten. Each flower is 1 point (flowers do not count toward the 8-point minimum).',
    lang: 'Language', close: 'Close', settings: 'Settings', sSound: 'Sound effects', sMusic: 'Music', sMute: 'Mute', sCoach: 'Coach (target fan and wait points)',
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
    next: 'Next', tu_play: 'Play a game',
    tu_intro: 'Welcome to Chinese Official Mahjong! Collect four sets and a pair (or seven pairs and a few special hands); you can win when your fan add up to 8 points or more. Let\'s learn by playing this hand.',
    tu_hand: 'This is your hand. You are the dealer (East), so you hold 14 tiles and discard first. Point at a tile and the same tile lights up on the table.',
    tu_goal: 'You have 1-2-3 Characters, 4-5-6 Dots and 7-8 Bamboo. One 1-2-3, one 4-5-6 and one 7-8-9, each in a different suit, is Mixed Straight: 8 points, enough for the minimum on its own.',
    tu_flower: 'The flower you were dealt (Spring) was set aside by your name plate and replaced from the back of the wall. A flower is 1 point, but flowers do not count toward the 8-point minimum.',
    tu_d1: 'Discard North. The honors North and West help neither the Mixed Straight nor the pair. Click (tap) the glowing North.',
    tu_d1_no: 'That tile belongs to the Mixed Straight or the pair (the two 5 Bamboo). North and West are the spare tiles. Start with the glowing North.',
    tu_d1_ok: 'Good discard. Now the CPUs play.',
    tu_chi: 'The player on your left discarded 9 Bamboo. With your 7-8 Bamboo it makes 7-8-9, the last set of the Mixed Straight. You can chow only the left player\'s discard. Press Chow.',
    tu_chi_no: 'If you pass, the Mixed Straight stays one set short. Chow here.',
    tu_chi_ok: '7-8-9 Bamboo: the Mixed Straight is complete!',
    tu_d2: 'After a call you discard one tile. Discard West and you are ready: one tile away from winning.',
    tu_d2_no: 'Discarding that breaks your hand. West is the spare tile.',
    tu_d2_ok: 'Ready! You wait on either side of 2-3 Bamboo: 1 or 4 Bamboo.',
    tu_waits: 'The coach panel shows your waits and the points each would score. 1 Bamboo gives 11 points, 4 Bamboo 10: both reach 8, so both can win. A wait below 8 points is shown in red (you cannot win on it).',
    tu_ron: 'The player on your right discarded 4 Bamboo! Win on it. There is no furiten in this game: you may win even on a tile you discarded before.',
    tu_ron_no: 'If you let it go, you do not know when the next one comes. Win here.',
    tu_ron_ok: 'You won! Let\'s look at the score.',
    tu_fans: 'The fan of your win: Mixed Straight 8 and All Chows 2 (four chows, no honors) make 10 (8 or more, so it counts), plus 1 for the flower: 11 in total. Declaring a win below 8 points is a false win: you pay 10 to each other player.',
    tu_pay: 'Payment: on a discard win the discarder pays points + 8 and the other two pay 8 each. On a self-drawn win all three pay points + 8. There is no riichi, dora or fu.',
    tu_end: 'You are ready to play! There is more: pungs, kongs (a concealed kong lies face down), Seven Pairs, Thirteen Orphans, Knitted hands and 81 fan in all. Use the Fan Guide and its example hands to learn how to reach 8 points.',
    tu_m_d1: 'Toward Mixed Straight', tu_m_chi: 'Toward Mixed Straight', tu_m_d2: 'Toward ready', tu_m_ron: 'Points of this win (8 to pass)',
    exitTitle: 'Quit this game?', exitBody: 'This game will not be recorded.', exitYes: 'Quit', yes: 'Yes', no: 'No', leftShort: 'left', minRule: '8-point minimum', stats: 'Record',
  },
};
// 言語メニュー（14言語）
const ALL = [['ja', '日本語'], ['en', 'English'], ['zh', '简体中文'], ['zh-TW', '繁體中文'], ['ko', '한국어'], ['es', 'Español'], ['fr', 'Français'], ['pt', 'Português'], ['de', 'Deutsch'], ['ru', 'Русский'], ['tr', 'Türkçe'], ['id', 'Bahasa Indonesia'], ['hi', 'हिन्दी'], ['ar', 'العربية']];
const LANGS = ALL;
// 番種名：言語ごと（ない言語は英語の定訳）。ja・zh・en は fan.js の表
const FAN = {};
const DESC = {};
// 番種名：zh-TW は簡体字の名前を繁体字に（么・槓・於・和。出典と方針は claude/gbmj-spec.md）。
// ko は韓国語版ナムウィキ「국표마작/역」の表記（漢字音。番の名前の杠は「공」、副露の槓子は「깡」。推不倒は추부도）。
// es・fr・pt・de・ru・tr・id・hi・ar は定訳がないので WMO 英語版の名前（画面では中国語原名を添える）。
  FAN['zh-TW'] = {"1": "大四喜", "2": "大三元", "3": "綠一色", "4": "九蓮寶燈", "5": "四槓", "6": "連七對", "7": "十三么", "8": "清么九", "9": "小四喜", "10": "小三元", "11": "字一色", "12": "四暗刻", "13": "一色雙龍會", "14": "一色四同順", "15": "一色四節高", "16": "一色四步高", "17": "三槓", "18": "混么九", "19": "七對", "20": "七星不靠", "21": "全雙刻", "22": "清一色", "23": "一色三同順", "24": "一色三節高", "25": "全大", "26": "全中", "27": "全小", "28": "清龍", "29": "三色雙龍會", "30": "一色三步高", "31": "全帶五", "32": "三同刻", "33": "三暗刻", "34": "全不靠", "35": "組合龍", "36": "大於五", "37": "小於五", "38": "三風刻", "39": "花龍", "40": "推不倒", "41": "三色三同順", "42": "三色三節高", "43": "無番和", "44": "妙手回春", "45": "海底撈月", "46": "槓上開花", "47": "搶槓和", "48": "雙暗槓", "49": "碰碰和", "50": "混一色", "51": "三色三步高", "52": "五門齊", "53": "全求人", "54": "雙箭刻", "55": "全帶么", "56": "不求人", "57": "雙明槓", "58": "和絕張", "59": "箭刻", "60": "圈風刻", "61": "門風刻", "62": "門前清", "63": "平和", "64": "四歸一", "65": "雙同刻", "66": "雙暗刻", "67": "暗槓", "68": "斷么", "69": "一般高", "70": "喜相逢", "71": "連六", "72": "老少副", "73": "么九刻", "74": "明槓", "75": "缺一門", "76": "無字", "77": "邊張", "78": "嵌張", "79": "單釣將", "80": "自摸", "81": "花牌"};
  FAN.ko = {"1": "대사희", "2": "대삼원", "3": "녹일색", "4": "구련보등", "5": "사공", "6": "연칠대", "7": "십삼요", "8": "청요구", "9": "소사희", "10": "소삼원", "11": "자일색", "12": "사암각", "13": "일색쌍룡회", "14": "일색사동순", "15": "일색사절고", "16": "일색사보고", "17": "삼공", "18": "혼요구", "19": "칠대", "20": "칠성불고", "21": "전쌍각", "22": "청일색", "23": "일색삼동순", "24": "일색삼절고", "25": "전대", "26": "전중", "27": "전소", "28": "청룡", "29": "삼색쌍룡회", "30": "일색삼보고", "31": "전대오", "32": "삼동각", "33": "삼암각", "34": "전불고", "35": "조합룡", "36": "대어오", "37": "소어오", "38": "삼풍각", "39": "화룡", "40": "추부도", "41": "삼색삼동순", "42": "삼색삼절고", "43": "무번화", "44": "묘수회춘", "45": "해저로월", "46": "공상개화", "47": "창공화", "48": "쌍암공", "49": "팽팽화", "50": "혼일색", "51": "삼색삼보고", "52": "오문제", "53": "전구인", "54": "쌍전각", "55": "전대요", "56": "불구인", "57": "쌍명공", "58": "화절장", "59": "전각", "60": "권풍각", "61": "문풍각", "62": "문전청", "63": "평화", "64": "사귀일", "65": "쌍동각", "66": "쌍암각", "67": "암공", "68": "단요", "69": "일반고", "70": "희상봉", "71": "연륙", "72": "노소부", "73": "요구각", "74": "명공", "75": "결일문", "76": "무자", "77": "변장", "78": "감장", "79": "단조장", "80": "자모", "81": "화패"};

// 図鑑の説明（英語。ほかの言語は英語→日本語の順に代わりに出す）
  DESC.en = {
    1: 'Pungs (or kongs) of all four winds.', 2: 'Pungs (or kongs) of all three dragons.', 3: 'Only 2, 3, 4, 6, 8 Bamboo and Green Dragon.',
    4: 'Concealed 1112345678999 of one suit, waiting on any of the nine tiles, and winning on one of them.', 5: 'Four kongs (concealed or melded).',
    6: 'Seven pairs in one suit, one after another (for example 2 to 8).', 7: 'One each of the 1s, 9s and seven honors, with a pair of one of them.',
    8: 'Only 1s and 9s of the suits (no honors).', 9: 'Pungs of three winds and a pair of the fourth.', 10: 'Pungs of two dragons and a pair of the third.',
    11: 'Only honor tiles.', 12: 'Four pungs (or kongs) made without calling.', 13: '1-2-3, 1-2-3, 7-8-9, 7-8-9 and a pair of 5s, all in one suit.',
    14: 'Four identical chows in one suit.', 15: 'Four pungs in one suit, each one up from the last (for example 333, 444, 555, 666).',
    16: 'Four chows in one suit, each shifted up by one, or each by two.', 17: 'Three kongs.', 18: 'Only 1s, 9s and honors, in pungs and the pair.',
    19: 'Seven pairs (four identical tiles may count as two pairs).', 20: 'All seven honors, one each, plus seven suit tiles from 1-4-7, 2-5-8 and 3-6-9 in three different suits.',
    21: 'Four pungs of 2, 4, 6 or 8 and an even pair.', 22: 'Only tiles of one suit.', 23: 'Three identical chows in one suit.',
    24: 'Three pungs in one suit, each one up from the last.', 25: 'Only 7, 8 and 9 of the suits.', 26: 'Only 4, 5 and 6 of the suits.', 27: 'Only 1, 2 and 3 of the suits.',
    28: '1-2-3, 4-5-6 and 7-8-9 in one suit.', 29: '1-2-3 and 7-8-9 in two suits, and a pair of 5s in the third.',
    30: 'Three chows in one suit, each shifted up by one, or each by two.', 31: 'Every set and the pair contain a 5.', 32: 'Pungs of the same number in all three suits.',
    33: 'Three pungs made without calling.', 34: 'Fourteen single tiles: honors and suit tiles from 1-4-7, 2-5-8 and 3-6-9 in three different suits (no sets).',
    35: '1-4-7, 2-5-8 and 3-6-9, one in each suit (nine tiles), plus one set and a pair.', 36: 'Only suit tiles from 6 to 9.', 37: 'Only suit tiles from 1 to 4.',
    38: 'Pungs of three winds (the fourth wind is not the pair).', 39: '1-2-3, 4-5-6 and 7-8-9, each in a different suit.',
    40: 'Only tiles that look the same upside down: Dots 1234589, Bamboo 245689 and White Dragon.', 41: 'The same chow in all three suits.',
    42: 'Pungs in three suits, each one up from the last (for example 3 Characters, 4 Dots, 5 Bamboo).', 43: 'A hand with no other fan (0 points without flowers). Worth 8.',
    44: 'Winning on the last tile of the wall by drawing it (Self-Drawn is not added).', 45: 'Winning on the last discard of the hand.',
    46: 'Winning on the replacement tile after a kong (Self-Drawn is not added).', 47: 'Winning on the tile another player adds to a pung to make a kong (Last Tile is not added).',
    48: 'Two concealed kongs.', 49: 'Four pungs (or kongs) and a pair.', 50: 'Only tiles of one suit plus honors.', 51: 'Chows in three suits, each one up from the last (for example 123 Characters, 234 Dots, 345 Bamboo).',
    52: 'Characters, Dots, Bamboo, winds and dragons all appear in the hand.', 53: 'All four sets are called, and you win on the last tile (the pair) from a discard.',
    54: 'Two pungs of dragons.', 55: 'Every set and the pair contain a 1, a 9 or an honor.', 56: 'No calls (a concealed kong is fine) and a self-drawn win (Self-Drawn and Concealed Hand are not added).',
    57: 'Two melded kongs (one melded and one concealed kong: 6 points).', 58: 'Winning on a tile whose other three copies are already visible on the table.',
    59: 'A pung (or kong) of a dragon.', 60: 'A pung of the wind of the current round.', 61: 'A pung of your own seat wind (the dealer is East).',
    62: 'No calls (a concealed kong is fine) and winning on a discard.', 63: 'Four chows and a suit-tile pair (no honors).', 64: 'All four of one tile used without making a kong.',
    65: 'Pungs of the same number in two suits.', 66: 'Two pungs made without calling.', 67: 'One concealed kong.', 68: 'No 1s, 9s or honors.',
    69: 'Two identical chows in one suit.', 70: 'The same chow in two suits.', 71: 'Two chows in one suit that run on, like 1-2-3 and 4-5-6.', 72: '1-2-3 and 7-8-9 in one suit.',
    73: 'A pung of 1s or 9s, or of a wind that is neither the round wind nor your seat wind.', 74: 'One melded kong (called or added).', 75: 'One of the three suits is missing.',
    76: 'No honor tiles.', 77: 'Waiting only on 3 with 1-2, or only on 7 with 8-9.', 78: 'Waiting only on the middle tile of a chow, like 2 with 1-3.',
    79: 'Waiting only on the pair tile.', 80: 'Winning on a tile you draw yourself.', 81: '1 point per flower. Flowers do not count toward the 8-point minimum.',
  };
let lang = 'ja';
const CODES = ALL.map(x => x[0]);
const V = 3;   // 言語ファイル（i18n/<lang>.js）の版。文言を変えたら上げる
function detect() {
  const ls = (navigator.languages || [navigator.language || 'en']).map(x => String(x));
  for (const x of ls) {
    const l = x.toLowerCase();
    if (l.startsWith('zh')) return /tw|hk|hant|mo/.test(l) ? 'zh-TW' : 'zh';
    const k = l.slice(0, 2); if (CODES.includes(k)) return k;
  }
  return 'en';
}
function stored() { try { const d = JSON.parse(localStorage.getItem('gbmj-v1') || '{}'); return d.set && d.set.lang; } catch (e) { return null; } }
const want = (l => CODES.includes(l) ? l : null)(stored()) || detect();
// ja・en 以外は言語ファイルを読む（最初はページの読み込み中に同期で、切り替えは後から）
const src = l => 'i18n/' + l + '.js?v=' + V;
if (!S[want] && document.readyState === 'loading') document.write('<script src="' + src(want) + '"><\/script>');
const loading = {};
const I18N = {
  S, FAN, DESC, LANGS, CODES,
  get lang() { return lang; },
  add(l, pack) { S[l] = pack.S; if (pack.DESC) DESC[l] = pack.DESC; if (pack.FAN) FAN[l] = pack.FAN; },
  load(l) {
    if (S[l] || !CODES.includes(l)) return Promise.resolve();
    return loading[l] || (loading[l] = new Promise(res => { const el = document.createElement('script'); el.src = src(l); el.onload = el.onerror = () => res(); document.head.appendChild(el); }));
  },
  init(pref) { const l = pref && CODES.includes(pref) ? pref : detect(); lang = S[l] ? l : S[want] ? want : 'en'; },
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
