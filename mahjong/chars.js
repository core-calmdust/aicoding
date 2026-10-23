// Characters: 43 sisters in 10 families (same hair colour = sisters). Each character has her own art:
//   images/mahjong/chara/<id>.webp (1080x1920), <id>-t.webp (thumb), <id>-face.webp, <id>-bust.webp
// Characters have no fixed skill: a skill (with its own rarity) is rolled when the character is pulled from the gacha.
(function (root) {
'use strict';
const L = (ja, en) => ({ ja, en });
const FAMILIES = {
  violet: { color: '#8a5cff', color2: '#2a1650', name: L('紫宮の姉妹', 'Violet Palace Sisters'),
    profile: L('紫の宮殿で卓を囲む姉妹。冷静沈着、勝負どころを決して外さない。', 'Sisters of the violet palace. Cool-headed, they never miss the decisive moment.'),
    lines: { riichi: L('この手…いただくわ。リーチ。', 'This hand is mine. Riichi.'), tsumo: L('ふふ、引き寄せたわ。', 'Mm. It came to me.'), ron: L('それ、いただくわね。', 'I\'ll take that.'), skill: L('見せてあげる。', 'Let me show you.') } },
  snow: { color: '#d9dde8', color2: '#5a1a24', name: L('白峰の姉妹', 'Shiramine Sisters'),
    profile: L('雪のように白い衣の姉妹。守りが堅く、静かに好機を待つ。', 'Sisters in snow-white robes. Solid in defence, they wait quietly for their chance.'),
    lines: { riichi: L('静かに、リーチ。', 'Quietly — riichi.'), tsumo: L('ツモ。凍えるでしょう？', 'Tsumo. Chilly, isn\'t it?'), ron: L('ロン。', 'Ron.'), skill: L('凍てつけ。', 'Freeze.') } },
  peach: { color: '#ff8fc4', color2: '#4a1430', name: L('桃園の姉妹', 'Peach Garden Sisters'),
    profile: L('桃の花の庭で育った華やかな姉妹。明るく大胆に打ち回す。', 'Bright sisters raised in a peach-blossom garden. They play boldly and cheerfully.'),
    lines: { riichi: L('リーチっ！', 'Riichi!'), tsumo: L('ほらね、来たでしょ？', 'See? Told you!'), ron: L('ロンだよっ！', 'That\'s ron!'), skill: L('とっておき、いくよ！', 'Here comes my best!') } },
  amber: { color: '#ffbf3d', color2: '#4a3006', name: L('琥珀堂の姉妹', 'Amber House Sisters'),
    profile: L('宝石商・琥珀堂の姉妹。きらめく牌には目がない。', 'Sisters of the Amber House jewellers. They can\'t resist a sparkling tile.'),
    lines: { riichi: L('きらっとリーチ♪', 'Sparkle riichi♪'), tsumo: L('ツモ！宝物みーつけた！', 'Tsumo! Found treasure!'), ron: L('ロン！いただきっ♪', 'Ron! Mine♪'), skill: L('きらきらにしちゃお♪', 'Let\'s make it sparkle!') } },
  crimson: { color: '#e0334f', color2: '#3e0a14', name: L('紅椿の姉妹', 'Crimson Camellia Sisters'),
    profile: L('賭場「紅椿」を仕切る派手好きな姉妹。積み上がった点棒はまとめていただく。', 'Flashy sisters who run the Crimson Camellia gambling hall. They sweep up every stick on the table.'),
    lines: { riichi: L('全部いただくよ、リーチ。', 'I\'m taking it all. Riichi.'), tsumo: L('総取りだね。', 'Jackpot.'), ron: L('ロン、ごちそうさま。', 'Ron. Thanks for the meal.'), skill: L('場の点棒、ぜーんぶ私の！', 'Every stick on the table is mine!') } },
  chestnut: { color: '#b98552', color2: '#3a2414', name: L('栗原雀荘の姉妹', 'Kurihara Parlor Sisters'),
    profile: L('老舗の雀荘を切り盛りする姉妹。手先が器用で、場の空気を読むのがうまい。', 'Sisters who run an old mahjong parlor. Nimble fingers, and they read the table well.'),
    lines: { riichi: L('リーチ、いきます！', 'Riichi, here I go!'), tsumo: L('やった、ツモです！', 'Yay, tsumo!'), ron: L('ロンです！', 'Ron!'), skill: L('えいっ！', 'Hup!') } },
  jade: { color: '#2fc58a', color2: '#0b3a2a', name: L('翡翠の姉妹', 'Jade Sisters'),
    profile: L('翡翠の簪をさした物静かな姉妹。欲しい牌が向こうから寄ってくる。', 'Quiet sisters with jade hairpins. The tiles they want come to them.'),
    lines: { riichi: L('…リーチ、です。', '…Riichi.'), tsumo: L('来てくれました。', 'You came.'), ron: L('ロン、です。', 'Ron.'), skill: L('おいで…', 'Come here…') } },
  gold: { color: '#ffd24a', color2: '#4a3a06', name: L('金色の姉妹', 'Golden Sisters'),
    profile: L('大店を営む金色の髪の姉妹。商売も麻雀も、取れるものは全部取る。', 'Golden-haired sisters who run a great trading house. In business and mahjong, they take all they can.'),
    lines: { riichi: L('商談成立、リーチ。', 'Deal struck. Riichi.'), tsumo: L('毎度あり。', 'Pleasure doing business.'), ron: L('ロン。お代はこちら。', 'Ron. The bill, please.'), skill: L('ご祝儀、はずんでね。', 'Be generous.') } },
  lapis: { color: '#4b6bff', color2: '#101a4a', name: L('瑠璃の姉妹', 'Lapis Sisters'),
    profile: L('水晶玉をのぞく占い師の姉妹。相手の手の内はお見通し。', 'Fortune-teller sisters with a crystal ball. They see right through everyone\'s hands.'),
    lines: { riichi: L('運命は決まりました。リーチ。', 'Fate is sealed. Riichi.'), tsumo: L('見えていましたよ。', 'I saw this coming.'), ron: L('ロン。占いどおり。', 'Ron. As foretold.'), skill: L('あなたの心、読ませて。', 'Let me read your heart.') } },
  flame: { color: '#ff7a3d', color2: '#4a1608', name: L('緋色の姉妹', 'Scarlet Sisters'),
    profile: L('炎のような髪の陽気な勝負師の姉妹。押すときは迷わず押す。', 'Cheerful gambler sisters with flame-coloured hair. When they push, they push all the way.'),
    lines: { riichi: L('いっくよー、リーチ！', 'Here goes — riichi!'), tsumo: L('はい、ツモっ！', 'Tsumo, there it is!'), ron: L('ロン！もらった！', 'Ron! Got you!'), skill: L('燃えてきたっ！', 'Now I\'m fired up!') } },
};
const ROSTER = {
  violet: [['shion', '紫苑', 'Shion', 'UR'], ['sumire', '菫', 'Sumire', 'SR'], ['fujino', '藤乃', 'Fujino', 'SR'], ['kikyo', '桔梗', 'Kikyo', 'R'], ['ayame', '菖蒲', 'Ayame', 'R'], ['rindo', '竜胆', 'Rindo', 'N']],
  snow: [['yukino', '雪乃', 'Yukino', 'SSR'], ['mashiro', '真白', 'Mashiro', 'SR'], ['hyouka', '氷華', 'Hyouka', 'SR'], ['koyuki', '小雪', 'Koyuki', 'R'], ['hakuro', '白露', 'Hakuro', 'R'], ['rikka', '六花', 'Rikka', 'N']],
  peach: [['momoka', '桃華', 'Momoka', 'SSR'], ['sakurako', '桜子', 'Sakurako', 'SR'], ['botan', '牡丹', 'Botan', 'SR'], ['nadeshiko', '撫子', 'Nadeshiko', 'R'], ['shakuyaku', '芍薬', 'Shakuyaku', 'R'], ['haruka', '春香', 'Haruka', 'N']],
  amber: [['kohaku', '琥珀', 'Kohaku', 'SSR'], ['anzu', '杏', 'Anzu', 'SR'], ['yuzu', '柚子', 'Yuzu', 'R'], ['mitsu', '蜜', 'Mitsu', 'R'], ['nana', '菜々', 'Nana', 'N']],
  crimson: [['tsubaki', '椿', 'Tsubaki', 'SSR'], ['momiji', '紅葉', 'Momiji', 'SR'], ['akane', '茜', 'Akane', 'R'], ['shuon', '朱音', 'Shuon', 'N']],
  chestnut: [['shiori', '栞', 'Shiori', 'SSR'], ['kaede', '楓', 'Kaede', 'SR'], ['kurumi', '胡桃', 'Kurumi', 'R'], ['komachi', '小町', 'Komachi', 'N']],
  jade: [['midori', '翠', 'Midori', 'SSR'], ['wakaba', '若葉', 'Wakaba', 'R'], ['moegi', '萌黄', 'Moegi', 'N']],
  gold: [['kinka', '金華', 'Kinka', 'SSR'], ['yamabuki', '山吹', 'Yamabuki', 'R'], ['himawari', '向日葵', 'Himawari', 'N']],
  lapis: [['ruri', '瑠璃', 'Ruri', 'SSR'], ['ai', '藍', 'Ai', 'R'], ['sora', '空', 'Sora', 'N']],
  flame: [['akari', '緋莉', 'Akari', 'UR'], ['hina', '陽菜', 'Hina', 'SR'], ['matsuri', '茉莉', 'Matsuri', 'R']],
};
const ORDER = [L('長女', 'eldest'), L('次女', 'second'), L('三女', 'third'), L('四女', 'fourth'), L('五女', 'fifth'), L('六女', 'sixth')];
const CHARS = [];
for (const fid in ROSTER) {
  const F = FAMILIES[fid];
  ROSTER[fid].forEach(([id, ja, en, rarity], k) => {
    CHARS.push({ id, family: fid, rarity, art: true, color: F.color, color2: F.color2,
      name: L(ja, en), title: L(`${F.name.ja}・${ORDER[k].ja}`, `${F.name.en}, ${ORDER[k].en}`),
      profile: F.profile, lines: F.lines });
  });
}
const BY = {}; for (const c of CHARS) BY[c.id] = c;
const RANKS = ['N', 'R', 'SR', 'SSR', 'UR'];
// gacha weights (%) for character rarity
const RARITY = { N: { w: 45 }, R: { w: 35 }, SR: { w: 15 }, SSR: { w: 4 }, UR: { w: 1 } };
// the starter character and old (v0.x) characters' fixed skills, for save migration
const LEGACY = { shion: 'wareme', akari: 'hanup', midori: 'lure', yukino: 'guard', kohaku: 'doraplus', ruri: 'mind', momoka: 'peek', tsubaki: 'pot', kinka: 'shugi', komachi: 'swap' };
root.MJChars = { list: CHARS, get: id => BY[id], families: FAMILIES, RARITY, RANKS, LEGACY, starter: { id: 'komachi', skill: 'swap', tier: 0 } };
})(window);
