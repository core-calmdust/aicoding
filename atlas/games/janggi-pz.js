/* =====================================================================
   Janggi puzzles on the 3D table (2026-11-24, 担当D) — the guide's own words and the small board for the list.
   The puzzles are the full game's (janggi/puzzles.json: mate in 1–3, checks-only mate in 4 and 5+), played by atlas/puzzles.js
   (BOOK.janggi, the same runner as xiangqi's mates, kind 'xq') on the janggi table (atlas/games/janggi.js ctx.pz). Loaded with the
   game's files (atlas/lazy.js). Checked by tools/lesson-verify-janggi.js (the board facts behind each line).
   · AtlasPuzzleLines.janggi.ja — ショウギツネ (the janggi rules tour's guide: わたし, casual, コン now and then). Other languages use
     the runner's plain lines and the game's own texts (janggi/i18n.js), as the xiangqi mates do.
   · AtlasJanggiPz.ja — ショウギツネ's wording of the game's puzzle texts (janggi/i18n.js pz.*, polite in the 2D page) on the 3D table.
     Each says only what the board shows: pz.bl.lose = after the move the opponent mates at once; pz.bl.nock = the move is not a check
     in a checks-only puzzle; pz.failWhy = the last move of the count that does not mate; pz.stray = off the line, the defender answers (the 2D's line; the 3D says the reply's fact instead: AtlasJanggiPz.why, 追42).
   · AtlasMini.janggi — a small janggi board (no river, the palaces' diagonals, 楚 green · 漢 red) for the puzzle list.
   ===================================================================== */
(function () {
  'use strict';
  const L = window.AtlasPuzzleLines = window.AtlasPuzzleLines || {};
  L.janggi = {
    ja: {
      hi: ['やあ、ショウギツネだよ！ チャンギの詰めで読みをきたえよう。', 'ショウギツネだコン。きょうは漢の将を追いつめる練習だよ。', 'いらっしゃい！ 九宮の斜めの線も使って詰ませてみて。'],
      intro: ['次の問題、いってみよう！', 'さあ、どんどんいこう。', 'この形、ちょっとおもしろいコン。', 'じっくり読んでみてね。', '将の逃げ道を数えてから指すのがコツだよ。'],
      mid: ['相手はそう受けたのね。続きをどうぞ！', '将が逃げ道を探してる。次の一手は？', 'コンコン、相手が動いたよ。きみの番！', 'まだ詰みは見えてるはず。落ち着いて！', '受けが来たね。さあ、決めにいこう！', '残りの逃げ道はどこかな？ 数えてみて。'],
      solved: ['お見事！ 将が動けなくなって詰みだコン！', 'やったね！ きれいに詰んだ！', 'すごい！ 九宮のすみまで読み切ったね。', '漢の将、まいりましたって。'],
      streak: ['{n}問連続クリア！ 冴えてるコン！', 'もう{n}連続！ チャンギ名人みたい！', '{n}連続！ しっぽのふりふりが止まらないよ。'],
      help: ['クリア！ 次はヒントなしでいってみよう。', '詰ませられたね！ 筋が見えてきたかな？', 'できたね！ 一歩ずつ強くなってるよ。'],
      out: ['{n}手では詰みまで届かなかったね。', '将に{n}手のうちに逃げられちゃった。', '{n}手のうちには詰まなかったコン。'],
      stuck: ['あら、ここで手が止まっちゃった。', 'うーん、ここからは詰まないみたい。'],
      retry: ['もう一度やってみよう！', 'リベンジしようコン！', 'ほかの王手も考えてみて。'],
      hint: ['金の輪の駒、気にならない？', 'こっそり教えるね。金の輪の駒に注目コン！', '金の輪の駒から考えてみて。'],
      again: ['はじめからやり直しね！', '深呼吸して、もう一度！', '仕切り直しコン！'],
      allDone: ['用意した問題はぜんぶ解いちゃったね！ すごすぎるコン！'],
    },
  };
  // ショウギツネ's wording of janggi/i18n.js pz.* on the 3D table ({m} 赤い印の手 · {b} 緑の手 · {n} · {c} 楚／漢)
  window.AtlasJanggiPz = {
    ja: {
      // (a list: the runner says them in turn — atlas/puzzles.js BOOK.janggi.tx)
      'pz.goal': ['{c}の番だよ。{n}手以内に相手の将を詰ませよう！', '{c}の手番。{n}手で詰む筋があるコン、見つけられるかな？', '{c}が指す番だね。相手の将を{n}手以内につかまえてみて！', '{c}の番。将の逃げ道を数えて、{n}手以内に詰ませてね！', '{c}からいこう！ {n}手以内の詰み、読み切れる？'],
      'pz.goalCk': ['{c}の番だよ。毎回王手をかけて、{n}手以内に詰ませよう！', '{c}の手番。王手、王手で追いかけて、{n}手以内に詰ませてみて！', '{c}が指す番だね。王手をゆるめずに、{n}手以内で詰ませられるかな？', '{c}の番。ずっと王手のまま、{n}手以内の詰みを探そうコン！', '{c}からいこう！ 王手の連続で、{n}手以内に詰ませてね。'],
      'pz.checking': 'うーん、読んでるコン…',
      'pz.good': ['いい手！ その調子で、相手の受けを見てみよう…', 'さすが、正解の筋だコン！ 次の受けはどう来るかな…', 'ばっちり！ どんどんいこう、相手はどう受ける？', 'いいね、この調子！ 相手の受けを読んでみて…', 'お見事、ねらいどおり！ 次も読み切っちゃおう…', 'そうそう、その1手！ 相手がどう逃げるか見ててね…'],
      'pz.stray': '正解の手順から外れちゃった。相手はいちばん粘る手で受けるよ。',
      'pz.failWhy': '{m}では詰みにならないコン。正解は{b}だったよ。',
      'pz.bl.lose': 'その手のあと、相手に次の1手で詰まされちゃう！',
      'pz.bl.nock': 'その手は王手じゃないよ。この問題は毎回王手をかけないといけないの。',
      'pz.best': '正解は{b}だったよ。',
      'pz.hintText': ['金の輪の駒を動かしてみて。そこから詰みが見えてくるよ。', 'こっそり教えるね。光っている金の輪の駒から始めるのがコツだコン！', '金の輪の駒に注目！ その駒で将の逃げ道をどうふさぐか考えてみて。', '動かすのは金の輪の駒。行き先を1つずつ試して、相手の受けを数えてみてね。', 'ヒントは金の輪の駒。その駒の行き先から、将が動ける点を減らせないかな？'],
      'pz.showing': '正解の手順を見せるね。',
      'pz.answerDone': 'これが正解の手順だよ。「もう一度」で自分でも指してみて！',
    },
  };
  // (追42) ショウギツネ's words for the defender's reply after a move off the solution (janggi/pzwhy.js classes; {b} the reply's piece,
  // {p} yours it took, {n} the moves left) — the fact on the board (the red point), then whether a mate is still there in n
  window.AtlasJanggiPz.why = {
    ja: {
      cap: ['あっ、相手の{b}に、赤い印のきみの{p}を取られちゃった。', '相手は{b}で、赤い印のきみの{p}を取ったの。', '赤い印のところで、きみの{p}が相手の{b}に取られちゃったコン。', '痛い！ 赤い印のきみの{p}が、相手の{b}に取られたね。'],
      esc: ['王手は、将が赤い印の点へ逃げてかわされちゃった。', '相手の将は、赤い印の点へ逃げていったの。', '将に赤い印の点へ逃げられちゃったコン。', 'するりと、将が赤い印の点へ逃げ出したの。'],
      block: ['王手は、相手が{b}を赤い印の点へ動かして防いだの。', '相手は{b}を赤い印の点に入れて、王手を止めたね。', '赤い印の点へ{b}を動かされて、王手が防がれちゃったコン。'],
      run: ['王手じゃなかったから、将は赤い印の点へ一歩動けたの。', '将が赤い印の点へ動いて、逃げ道を広げられちゃったコン。', 'ひと息ついた相手は、将を赤い印の点へ寄せたよ。'],
      move: ['相手は{b}を赤い印の点へ動かしたね。', '王手じゃなかったから、相手は自由に{b}を赤い印の点へ動かせたの。', '赤い印の点へ、相手の{b}が動いたコン。', 'そのすきに、相手は{b}を赤い印の点へ回したよ。'],
      pass: ['相手はパスしたね。'],
      reach: ['でも大丈夫、残り{n}手で詰む道はまだあるから、読んでみて！', '平気平気、残り{n}手で詰む手順はまだ残ってるコン。次の1手を探そう！', 'まだ大丈夫！ 残り{n}手で詰む形は、まだ盤にあるからね。', 'まだいけるよ。{n}手で詰ませる筋が残ってるの、見つけて！'],
      noreach: ['この受けだと、残り{n}手ではもう詰まないの。でも大丈夫、最後まで指して形を覚えよう！', 'これで残り{n}手の詰みは消えちゃった。よくある見落としだから、次は最初の1手をじっくり読もう！', 'ここからは{n}手で詰む筋がなくなったコン。ドンマイ、最後まで指して確かめてみて！', '残念、あと{n}手ではもう届かないね。次は相手の受けを先に数えてみよう！', 'こうなると{n}手以内の詰みはないの。気にしないで、今度は最初の1手から読み直そうコン。'],
    },
  };
  // the small board: a FEN (janggi/puzzles.json s), the side to move at the bottom
  const JG = { r: { k: '楚', a: '士', b: '象', e: '象', n: '馬', h: '馬', r: '車', c: '包', p: '卒' }, b: { k: '漢', a: '士', b: '象', e: '象', n: '馬', h: '馬', r: '車', c: '包', p: '兵' } };
  window.AtlasMini = window.AtlasMini || {};
  window.AtlasMini.janggi = fen => {
    const [bd, tm] = String(fen || '').split(' '), rows = (bd || '').split('/'); if (rows.length !== 10) return '';
    const fl = tm === 'b', k = 8.6, X = c => 7 + (fl ? 8 - c : c) * k, Y = r => 7 + (fl ? 9 - r : r) * k, f = v => v.toFixed(1);
    let o = `<svg viewBox="0 0 84.8 91.4" aria-hidden="true"><rect width="84.8" height="91.4" rx="5" fill="#e8c98e"/><g stroke="#7a4f24" stroke-width=".6">`;
    for (let r = 0; r < 10; r++) o += `<line x1="7" y1="${f(7 + r * k)}" x2="${f(7 + 8 * k)}" y2="${f(7 + r * k)}"/>`;
    for (let c = 0; c < 9; c++) o += `<line x1="${f(7 + c * k)}" y1="7" x2="${f(7 + c * k)}" y2="${f(7 + 9 * k)}"/>`;
    for (const r0 of [0, 7]) o += `<line x1="${f(7 + 3 * k)}" y1="${f(7 + r0 * k)}" x2="${f(7 + 5 * k)}" y2="${f(7 + (r0 + 2) * k)}"/><line x1="${f(7 + 5 * k)}" y1="${f(7 + r0 * k)}" x2="${f(7 + 3 * k)}" y2="${f(7 + (r0 + 2) * k)}"/>`;
    o += '</g>';
    rows.forEach((row, r) => { let c = 0; for (const ch of row) { if (/\d/.test(ch)) { c += +ch; continue; } const cho = ch === ch.toUpperCase(), g = JG[cho ? 'r' : 'b'][ch.toLowerCase()] || '', col = cho ? '#13705c' : '#c8261d', rr = ch.toLowerCase() === 'k' ? 4.3 : /[ap]/.test(ch.toLowerCase()) ? 3.3 : 3.9;
      const pts = [...Array(8)].map((_, i) => { const a = Math.PI / 8 + i * Math.PI / 4; return f(X(c) + Math.cos(a) * rr) + ',' + f(Y(r) + Math.sin(a) * rr); }).join(' ');
      o += `<polygon points="${pts}" fill="#fbf3e2" stroke="${col}" stroke-width=".8"/><text x="${f(X(c))}" y="${f(Y(r) + rr * .5)}" font-size="${f(rr * 1.3)}" text-anchor="middle" fill="${col}" font-weight="700">${g}</text>`; c++; } });
    return o + '</svg>';
  };
})();
