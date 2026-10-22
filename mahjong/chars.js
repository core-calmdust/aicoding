// Character roster. art: true when images/mahjong/chara/<id>.webp, <id>-bust.webp, <id>-face.webp exist;
// otherwise a painted placeholder is used (drop the three images in and set art: true).
(function (root) {
'use strict';
const L = (ja, en) => ({ ja, en });
const CHARS = [
  { id: 'shion', rarity: 'SSR', art: true, skill: 'wareme', color: '#8a5cff', color2: '#2a1650',
    name: L('紫苑', 'Shion'), title: L('割れ目の女王', 'Queen of the Crack'),
    profile: L('紫の宮殿で卓を囲む冷静な女王。勝負どころで「割れ目」を開き、点棒の流れを倍にする。', 'A cool-headed queen of the violet palace. At the decisive moment she opens the Crack and doubles every point that moves.'),
    lines: { riichi: L('この手…割らせてもらうわ。', 'Let me crack this hand open.'), tsumo: L('ふふ、引き寄せたわ。', 'Mm. It came to me.'), ron: L('それ、いただくわね。', 'I\'ll take that.'), skill: L('割れ目、開帳。', 'The Crack — open.') } },
  { id: 'akari', rarity: 'SSR', art: true, skill: 'hanup', color: '#ff7a3d', color2: '#4a1608',
    name: L('緋莉', 'Akari'), title: L('紅蓮の勝負師', 'Crimson Gambler'),
    profile: L('炎のような髪の陽気な勝負師。押すときは迷わず押し、紅蓮の一翻で打点を跳ね上げる。', 'A cheerful gambler with flame-red hair. When she pushes, she pushes all the way — and her Crimson Han makes it hurt.'),
    lines: { riichi: L('いっくよー、リーチ！', 'Here goes — riichi!'), tsumo: L('はい、ツモっ！', 'Tsumo, there it is!'), ron: L('ロン！もらった！', 'Ron! Got you!'), skill: L('燃えてきたっ！', 'Now I\'m fired up!') } },
  { id: 'midori', rarity: 'SR', art: false, skill: 'lure', color: '#2fc58a', color2: '#0b3a2a',
    name: L('翠', 'Midori'), title: L('翡翠の引き寄せ手', 'Jade Lure'),
    profile: L('翡翠の簪をさした物静かな娘。欲しい牌が向こうから寄ってくる。', 'A quiet girl with a jade hairpin. The tiles she wants come to her.'),
    lines: { riichi: L('…リーチ、です。', '…Riichi.'), tsumo: L('来てくれました。', 'You came.'), ron: L('ロン、です。', 'Ron.'), skill: L('おいで…', 'Come here…') } },
  { id: 'yukino', rarity: 'SR', art: false, skill: 'guard', color: '#7fc8ff', color2: '#0e2a44',
    name: L('雪乃', 'Yukino'), title: L('氷の鉄壁', 'Ice Wall'),
    profile: L('雪のような白い衣の守りの名手。鉄壁を張れば、放銃しても痛くない。', 'A defensive master in snow-white robes. Behind her Iron Wall, even a deal-in barely stings.'),
    lines: { riichi: L('静かに、リーチ。', 'Quietly — riichi.'), tsumo: L('ツモ。凍えるでしょう？', 'Tsumo. Chilly, isn\'t it?'), ron: L('ロン。', 'Ron.'), skill: L('凍てつけ。', 'Freeze.') } },
  { id: 'kohaku', rarity: 'SR', art: false, skill: 'doraplus', color: '#ffbf3d', color2: '#4a3006',
    name: L('琥珀', 'Kohaku'), title: L('琥珀の宝石商', 'Amber Jeweler'),
    profile: L('宝石に目がない商人の娘。ドラを増やして卓をきらきらにする。', 'A merchant\'s daughter who loves gems. She makes the table sparkle with extra dora.'),
    lines: { riichi: L('きらっとリーチ♪', 'Sparkle riichi♪'), tsumo: L('ツモ！宝物みーつけた！', 'Tsumo! Found treasure!'), ron: L('ロン！いただきっ♪', 'Ron! Mine♪'), skill: L('ドラ、追加しちゃお♪', 'More dora!') } },
  { id: 'ruri', rarity: 'SR', art: false, skill: 'mind', color: '#4b6bff', color2: '#101a4a',
    name: L('瑠璃', 'Ruri'), title: L('瑠璃色の占い師', 'Lapis Seer'),
    profile: L('水晶玉をのぞく占い師。他家の手の内はお見通し。', 'A fortune-teller with a crystal ball. She sees right through everyone\'s hands.'),
    lines: { riichi: L('運命は決まりました。リーチ。', 'Fate is sealed. Riichi.'), tsumo: L('見えていましたよ。', 'I saw this coming.'), ron: L('ロン。占いどおり。', 'Ron. As foretold.'), skill: L('あなたの心、読ませて。', 'Let me read your heart.') } },
  { id: 'momoka', rarity: 'R', art: false, skill: 'peek', color: '#ff8fc4', color2: '#4a1430',
    name: L('桃華', 'Momoka'), title: L('桃色の先読み', 'Peach Foresight'),
    profile: L('ちょっぴり先の未来が見える元気な女の子。', 'A lively girl who can see a little way into the future.'),
    lines: { riichi: L('リーチっ！', 'Riichi!'), tsumo: L('ほらね、来たでしょ？', 'See? Told you!'), ron: L('ロンだよっ！', 'That\'s ron!'), skill: L('ちょっとだけ、未来見ちゃお。', 'Just a peek at the future.') } },
  { id: 'tsubaki', rarity: 'R', art: false, skill: 'pot', color: '#e0334f', color2: '#3e0a14',
    name: L('椿', 'Tsubaki'), title: L('椿の総取り', 'Camellia Jackpot'),
    profile: L('派手好きな賭場の看板娘。積み上がった供託はまとめていただく。', 'The flashy star of the gambling hall. She sweeps up the whole pot.'),
    lines: { riichi: L('全部いただくよ、リーチ。', 'I\'m taking it all. Riichi.'), tsumo: L('総取りだね。', 'Jackpot.'), ron: L('ロン、ごちそうさま。', 'Ron. Thanks for the meal.'), skill: L('場の点棒、ぜーんぶ私の！', 'Every stick on the table is mine!') } },
  { id: 'suzuran', rarity: 'R', art: false, skill: 'seal', color: '#b996ff', color2: '#24164a',
    name: L('鈴蘭', 'Suzuran'), title: L('鈴の封じ手', 'Bell of Silence'),
    profile: L('鈴の音で場を鎮める巫女。彼女の捨て牌には誰も手を出せない。', 'A shrine maiden who quiets the table with her bell. No one can call her discards.'),
    lines: { riichi: L('リーチ。お静かに。', 'Riichi. Silence, please.'), tsumo: L('ツモ。', 'Tsumo.'), ron: L('ロン。', 'Ron.'), skill: L('ちりん…封じます。', 'Ring… I seal it.') } },
  { id: 'kinka', rarity: 'SR', art: false, skill: 'shugi', color: '#ffd24a', color2: '#4a3a06',
    name: L('金華', 'Kinka'), title: L('黄金の祝儀', 'Golden Bounty'),
    profile: L('大店の女主人。赤も裏も一発も、ぜんぶ祝儀にして回収する。', 'Mistress of a great trading house. Reds, ura, ippatsu — she cashes them all in as bounties.'),
    lines: { riichi: L('商談成立、リーチ。', 'Deal struck. Riichi.'), tsumo: L('毎度あり。', 'Pleasure doing business.'), ron: L('ロン。お代はこちら。', 'Ron. The bill, please.'), skill: L('ご祝儀、はずんでね。', 'Be generous with the bounty.') } },
  { id: 'komachi', rarity: 'N', art: false, skill: 'swap', color: '#5ad1c8', color2: '#0c3532', starter: true,
    name: L('小町', 'Komachi'), title: L('見習い雀士', 'Apprentice'),
    profile: L('雀荘で働く見習いの看板娘。手先が器用で、ツモ牌をこっそりすり替える。', 'An apprentice at the mahjong parlor. Nimble fingers — she can quietly switch the tile she drew.'),
    lines: { riichi: L('り、リーチです！', 'R-riichi!'), tsumo: L('やった、ツモです！', 'Yay, tsumo!'), ron: L('ロンです！', 'Ron!'), skill: L('えいっ、すり替え！', 'Switcheroo!') } },
];
const BY = {}; for (const c of CHARS) BY[c.id] = c;
const RARITY = { N: { w: 50, col: '#9aa3b2' }, R: { w: 33, col: '#5ab0ff' }, SR: { w: 13, col: '#c27bff' }, SSR: { w: 4, col: '#ffcf4a' } };
root.MJChars = { list: CHARS, get: id => BY[id], RARITY };
})(window);
