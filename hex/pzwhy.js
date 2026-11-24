/* Hex puzzles (詰めヘックス): the defender's reply and what happened on the board after a move off the solution
   (2026-11-25 担当A, claude/lesson-quality.md 追88). Shared by the 2D (hex/app.js puzzleMove / blockMove, the neutral words T below in
   14 languages) and the 3D table (atlas/puzzles.js hxMoved, ゴイシペン's own words OWN.ja; the other languages use T).
   The 詰め rule (claude/game-conventions-addendum.md): nothing is judged on the way, a move off the solution is not taken back and the
   right move is not shown (only 「答えを見る」); the defender answers and the result says what is on the board:
     connect in N — wLast (the last move: stones still needed {k}) · wLost (the reply joined the opponent's edges) ·
                    wFar (after the reply: stones needed {k} > moves left {n}) · wCut ({k} <= {n}, but the solver finds no forced
                    connection in {n}: the opponent blocks every try)
     stop         — bWin (the opponent connected at once at the red mark) · bLine (the opponent played the red mark; whatever the
                    player does now, it connects — opponent moves needed {j})
   pick(pos, list, me) — the defender's reply among the engine's puzzle(defend) list [{ m, need }] (need 0 = the attacker no longer
   connects in time): the longest resistance, then the reply that leaves the attacker the most stones to place (pos.need), then the
   one that leaves the defender the fewest, then the lowest cell — deterministic, so the 2D and the 3D play the same reply and
   tools/lesson-verify-hexpz.js replays it. reply(pos, list, me): a cell that joins the defender's own edges at once comes first.
   attack(list, k): the quickest connecting move of the opponent in a "stop" puzzle (lowest cell on ties).
   window.HexPzWhy = { pick, reply, attack, facts, block, text, own, T, OWN } · module.exports the same (Node). */
(function () {
  'use strict';
  const sc = e => e.need === 0 ? 99 : e.need < 0 ? 50 : e.need;
  function pick(pos, list, me) {
    if (!list || !list.length) return null;
    const top = Math.max(...list.map(sc)), tied = list.filter(e => sc(e) === top);
    let best = null, bk = null;
    for (const e of tied) {
      if (!pos.legal || !pos.legal(e.m)) continue;
      const a = pos.clone(); a.play(e.m);
      const k = [a.need(me), -a.need(3 - me), -e.m];
      if (!best || k[0] > bk[0] || (k[0] === bk[0] && (k[1] > bk[1] || (k[1] === bk[1] && k[2] > bk[2])))) { best = e; bk = k; }
    }
    return best ? best.m : tied[0].m;
  }
  function reply(pos, list, me) {
    const w = pos.winCells(3 - me);
    if (w.length) return w[0];
    return pick(pos, list, me);
  }
  function attack(list, k) {
    let best = null;
    for (const e of list || []) if (e.need > 0 && e.need <= k && (!best || e.need < best.need || (e.need === best.need && e.m < best.m))) best = e;
    return best && best.m;
  }
  // o = { me, mid (after the move off the solution), after (after the reply, or null on the last move), left (own moves left
  // after the reply) } → { k, v }
  function facts(o) {
    const me = o.me, z = o.after || o.mid;
    if (!o.after) return { k: 'wLast', v: { k: o.mid.need(me) } };
    if (o.after.winner() === 3 - me) return { k: 'wLost', v: {} };
    const k = z.need(me);
    return k > o.left ? { k: 'wFar', v: { k, n: o.left } } : { k: 'wCut', v: { k, n: o.left } };
  }
  // a "stop" puzzle after the wrong move: o = { me, after (after the opponent's attacking move), j (the opponent's moves still
  // needed after it, from the solver) }
  function block(o) {
    if (o.after.winner() === 3 - o.me) return { k: 'bWin', v: {} };
    return { k: 'bLine', v: { j: o.j } };
  }
  // the 2D's neutral words (hex/app.js): {a} = the answer button's label
  const T = {
    ja: { answer: '「{a}」で正解の手順を見られます。', wLast: 'その手ではまだつながりません。つなぐのに要る石はあと{k}個で、もう手は残っていません。', wLost: '相手は赤い印の点に置いて、先に自分の2辺をつなぎました。', wFar: '相手は赤い印の点に置きました。つなぐのに要る石はあと{k}個、残りの手は{n}手なので足りません。', wCut: '相手は赤い印の点に置きました。石はあと{k}個でつながる形ですが、どこに置いても相手にふさがれ、残り{n}手ではつながりきれません。', bWin: 'その手では止まりません。相手は赤い印の点に置いて、自分の2辺をつなぎました。', bLine: 'その手では止まりません。相手は赤い印の点に置きました。ここからはどう受けても、相手はあと{j}手でつながります。' },
    en: { answer: 'Press “{a}” to see the solution.', wLast: 'That move does not connect yet. Stones still needed: {k}, and no moves are left.', wLost: 'The opponent played at the red mark and joined its own edges first.', wFar: 'The opponent played at the red mark. Stones still needed: {k}; moves left: {n} — not enough.', wCut: 'The opponent played at the red mark. Stones still needed: {k}, but wherever you play the opponent can block, so the moves left ({n}) are not enough.', bWin: 'That does not stop it. The opponent played at the red mark and joined its own edges.', bLine: 'That does not stop it. The opponent played at the red mark, and now it connects whatever you do (opponent moves needed: {j}).' },
    zh: { answer: '按“{a}”可以看到正解。', wLast: '这步还没有连通。还需要{k}颗棋子，已经没有剩余手数了。', wLost: '对手下在红色标记处，先连通了自己的两条边。', wFar: '对手下在红色标记处。连通还需要{k}颗棋子，剩余手数{n}，不够。', wCut: '对手下在红色标记处。还差{k}颗棋子就能连通，但无论下在哪里都会被对手堵住，剩余{n}手内连不通。', bWin: '这步挡不住。对手下在红色标记处，连通了自己的两条边。', bLine: '这步挡不住。对手下在红色标记处，之后无论你怎么应，对手都能再走{j}手连通。' },
    'zh-TW': { answer: '按「{a}」可以看到正解。', wLast: '這步還沒有連通。還需要{k}顆棋子，已經沒有剩餘手數了。', wLost: '對手下在紅色標記處，先連通了自己的兩條邊。', wFar: '對手下在紅色標記處。連通還需要{k}顆棋子，剩餘手數{n}，不夠。', wCut: '對手下在紅色標記處。還差{k}顆棋子就能連通，但無論下在哪裡都會被對手堵住，剩餘{n}手內連不通。', bWin: '這步擋不住。對手下在紅色標記處，連通了自己的兩條邊。', bLine: '這步擋不住。對手下在紅色標記處，之後無論你怎麼應，對手都能再走{j}手連通。' },
    ko: { answer: '“{a}”로 정답 수순을 볼 수 있습니다.', wLast: '그 수로는 아직 이어지지 않습니다. 필요한 돌: {k}개, 남은 수는 없습니다.', wLost: '상대가 빨간 표시의 칸에 두어 먼저 자기 두 변을 이었습니다.', wFar: '상대가 빨간 표시의 칸에 두었습니다. 필요한 돌: {k}개, 남은 수: {n} — 부족합니다.', wCut: '상대가 빨간 표시의 칸에 두었습니다. 돌 {k}개면 이어지는 모양이지만 어디에 두어도 상대가 막을 수 있어, 남은 수({n}) 안에는 이어지지 않습니다.', bWin: '그 수로는 막지 못합니다. 상대가 빨간 표시의 칸에 두어 자기 두 변을 이었습니다.', bLine: '그 수로는 막지 못합니다. 상대가 빨간 표시의 칸에 두었고, 이제 어떻게 받아도 상대가 이어집니다(상대에게 필요한 수: {j}).' },
    es: { answer: 'Pulsa «{a}» para ver la solución.', wLast: 'Esa jugada aún no conecta. Piedras que faltan: {k}, y no quedan jugadas.', wLost: 'El rival jugó en la marca roja y unió primero sus propios bordes.', wFar: 'El rival jugó en la marca roja. Piedras que faltan: {k}; jugadas restantes: {n}, no alcanza.', wCut: 'El rival jugó en la marca roja. Piedras que faltan: {k}, pero juegues donde juegues el rival puede bloquear, así que las jugadas restantes ({n}) no alcanzan.', bWin: 'Eso no lo detiene. El rival jugó en la marca roja y unió sus bordes.', bLine: 'Eso no lo detiene. El rival jugó en la marca roja y ahora conecta hagas lo que hagas (jugadas que necesita: {j}).' },
    fr: { answer: 'Appuie sur « {a} » pour voir la solution.', wLast: 'Ce coup ne connecte pas encore. Pierres encore nécessaires : {k}, et il ne reste plus de coup.', wLost: 'L’adversaire a joué sur la marque rouge et a relié ses bords en premier.', wFar: 'L’adversaire a joué sur la marque rouge. Pierres encore nécessaires : {k} ; coups restants : {n}, ce n’est pas assez.', wCut: 'L’adversaire a joué sur la marque rouge. Pierres encore nécessaires : {k}, mais où que tu joues il peut bloquer, donc les coups restants ({n}) ne suffisent pas.', bWin: 'Ça ne l’arrête pas. L’adversaire a joué sur la marque rouge et a relié ses bords.', bLine: 'Ça ne l’arrête pas. L’adversaire a joué sur la marque rouge et il connecte maintenant quoi que tu fasses (coups qu’il lui faut : {j}).' },
    pt: { answer: 'Toque em “{a}” para ver a solução.', wLast: 'Esse lance ainda não conecta. Pedras que faltam: {k}, e não restam lances.', wLost: 'O rival jogou na marca vermelha e uniu primeiro as próprias bordas.', wFar: 'O rival jogou na marca vermelha. Pedras que faltam: {k}; lances restantes: {n}, não basta.', wCut: 'O rival jogou na marca vermelha. Pedras que faltam: {k}, mas onde você jogar o rival pode bloquear, então os lances restantes ({n}) não bastam.', bWin: 'Isso não o detém. O rival jogou na marca vermelha e uniu as bordas.', bLine: 'Isso não o detém. O rival jogou na marca vermelha e agora conecta não importa o que você faça (lances de que precisa: {j}).' },
    de: { answer: 'Mit „{a}“ siehst du die Lösung.', wLast: 'Dieser Zug verbindet noch nicht. Noch nötige Steine: {k}, und es bleibt kein Zug mehr.', wLost: 'Der Gegner setzte auf die rote Markierung und verband zuerst seine eigenen Ränder.', wFar: 'Der Gegner setzte auf die rote Markierung. Noch nötige Steine: {k}; verbleibende Züge: {n} – das reicht nicht.', wCut: 'Der Gegner setzte auf die rote Markierung. Noch nötige Steine: {k}, aber wo du auch setzt, er kann blockieren – die verbleibenden Züge ({n}) reichen nicht.', bWin: 'Das hält ihn nicht auf. Der Gegner setzte auf die rote Markierung und verband seine Ränder.', bLine: 'Das hält ihn nicht auf. Der Gegner setzte auf die rote Markierung und verbindet jetzt, egal was du tust (Züge, die er braucht: {j}).' },
    ru: { answer: 'Нажмите «{a}», чтобы увидеть решение.', wLast: 'Этот ход ещё не соединяет. Нужно камней: {k}, а ходов больше нет.', wLost: 'Соперник сходил на красную отметку и первым соединил свои стороны.', wFar: 'Соперник сходил на красную отметку. Нужно камней: {k}; осталось ходов: {n} — не хватает.', wCut: 'Соперник сходил на красную отметку. Нужно камней: {k}, но куда бы вы ни пошли, соперник может перекрыть, и оставшихся ходов ({n}) не хватает.', bWin: 'Это не останавливает. Соперник сходил на красную отметку и соединил свои стороны.', bLine: 'Это не останавливает. Соперник сходил на красную отметку и теперь соединяет при любой вашей защите (ему нужно ходов: {j}).' },
    tr: { answer: 'Çözümü görmek için “{a}”e dokun.', wLast: 'Bu hamle henüz bağlamıyor. Gereken taş: {k}, ve hamle kalmadı.', wLost: 'Rakip kırmızı işarete oynadı ve önce kendi kenarlarını bağladı.', wFar: 'Rakip kırmızı işarete oynadı. Gereken taş: {k}; kalan hamle: {n} — yetmiyor.', wCut: 'Rakip kırmızı işarete oynadı. Gereken taş: {k}, ama nereye oynasan rakip kapatabilir; kalan hamleler ({n}) yetmiyor.', bWin: 'Bu durdurmuyor. Rakip kırmızı işarete oynadı ve kenarlarını bağladı.', bLine: 'Bu durdurmuyor. Rakip kırmızı işarete oynadı ve artık ne yaparsan yap bağlanıyor (rakibin gereken hamlesi: {j}).' },
    id: { answer: 'Tekan “{a}” untuk melihat solusinya.', wLast: 'Langkah itu belum menyambung. Batu yang masih perlu: {k}, dan tidak ada langkah tersisa.', wLost: 'Lawan bermain di tanda merah dan lebih dulu menyambung kedua sisinya.', wFar: 'Lawan bermain di tanda merah. Batu yang masih perlu: {k}; sisa langkah: {n} — tidak cukup.', wCut: 'Lawan bermain di tanda merah. Batu yang masih perlu: {k}, tetapi di mana pun kamu bermain lawan bisa menutup, jadi sisa langkah ({n}) tidak cukup.', bWin: 'Itu tidak menghentikannya. Lawan bermain di tanda merah dan menyambung kedua sisinya.', bLine: 'Itu tidak menghentikannya. Lawan bermain di tanda merah dan kini tersambung apa pun yang kamu lakukan (langkah yang ia perlukan: {j}).' },
    hi: { answer: 'हल देखने के लिए “{a}” दबाएँ।', wLast: 'यह चाल अभी नहीं जोड़ती। ज़रूरी पत्थर: {k}, और कोई चाल बाकी नहीं।', wLost: 'विरोधी ने लाल निशान पर रखा और पहले अपने दोनों किनारे जोड़ लिए।', wFar: 'विरोधी ने लाल निशान पर रखा। ज़रूरी पत्थर: {k}; बची चालें: {n} — काफ़ी नहीं।', wCut: 'विरोधी ने लाल निशान पर रखा। ज़रूरी पत्थर: {k}, पर आप कहीं भी रखें विरोधी रोक सकता है, इसलिए बची चालें ({n}) काफ़ी नहीं।', bWin: 'इससे नहीं रुकता। विरोधी ने लाल निशान पर रखा और अपने किनारे जोड़ लिए।', bLine: 'इससे नहीं रुकता। विरोधी ने लाल निशान पर रखा, अब आप कुछ भी करें वह जुड़ जाएगा (उसे चाहिए चालें: {j})।' },
    ar: { answer: 'اضغط «{a}» لرؤية الحل.', wLast: 'هذه النقلة لا تصل بعد. الأحجار المطلوبة: {k}، ولم تبقَ نقلات.', wLost: 'لعب الخصم عند العلامة الحمراء ووصل حافتيه أولًا.', wFar: 'لعب الخصم عند العلامة الحمراء. الأحجار المطلوبة: {k}؛ النقلات المتبقية: {n} — لا تكفي.', wCut: 'لعب الخصم عند العلامة الحمراء. الأحجار المطلوبة: {k}، لكن أينما لعبت يستطيع الخصم السدّ، فلا تكفي النقلات المتبقية ({n}).', bWin: 'هذا لا يوقفه. لعب الخصم عند العلامة الحمراء ووصل حافتيه.', bLine: 'هذا لا يوقفه. لعب الخصم عند العلامة الحمراء، والآن يصل مهما فعلت (النقلات التي يحتاجها: {j}).' },
  };
  // ゴイシペン's own words on the 3D table (一人称「ぼく」, 相手を「きみ」, おっとり): 3 lines per key, said in turn
  const OWN = {
    ja: {
      answer: ['「答え」を押すと、正解の手順を見せてあげるよ。', '正解の手順は「答え」ボタンで見られるよ。', 'もう一回やってみるか、「答え」で手順をのぞいてみてね。'],
      wLast: ['おしまいの1手だったけど、まだつながっていないんだ。つなぐのに要る石はあと{k}個、もう手が残っていないよ。', 'いっしょに盤を見てみよう。まだ道が途切れていて、あと{k}個の石が要るんだ。これで手を使い切っちゃった。', '大丈夫、次はいけるよ。この1手ではつながらなくて、あと{k}個の石が足りないんだ。'],
      wLost: ['あちゃー、でもこれで覚えれば平気！ 相手が赤い印の点に置いて、先に自分の2辺をつないじゃったんだ。', 'うわっ、でも大丈夫！ 赤い印の点で相手の道がつながっちゃった。自分の道より先に、相手の1手でつながる所を見てね。', 'むむっ、でも次はいけるさ！ 赤い印の点が相手の最後の1マスだったんだ。'],
      wFar: ['これで覚えよう！ 相手は赤い印の点に置いたよ。つなぐのに要る石はあと{k}個、残りは{n}手だから届かないんだ。', 'いっしょに盤を見てみよう。赤い印の点に相手の石が来て、きみの石はあと{k}個要るのに、手は{n}手しか残っていないんだ。', '大丈夫、次はいけるよ。相手の赤い印の1手のあと、つなぐにはあと{k}個の石が要る。残り{n}手では足りないね。'],
      wCut: ['ドンマイ、よくある見落としだよ！ 相手は赤い印の点に置いたんだ。石はあと{k}個でつながる形だけど、どこに置いても相手にふさがれて、残り{n}手ではつながりきれないよ。', '平気平気、ここから覚えよう！ 相手は赤い印の点に置いたよ。あと{k}個でつながりそうに見えても、きみが置くたびに相手がふさげるから、残り{n}手では届かないんだ。', 'これで覚えよう！ 赤い印の点に置かれたあとは、石はあと{k}個の形でも、残り{n}手のあいだ相手が毎回ふさげるんだ。'],
      bWin: ['あちゃー、でもこれで覚えれば平気！ その手では止まらなくて、相手は赤い印の点でつながっちゃった。', 'うわっ、でも大丈夫！ 相手の最後の1マスは赤い印の点だったんだ。そこをふさがないと止まらないよ。', 'むむっ、でも次はいけるさ！ 赤い印の点に置かれて、相手の2辺がつながったよ。'],
      bLine: ['これで覚えよう！ その手では止まらないんだ。相手が赤い印の点に置いたら、ここからはどう受けても相手はあと{j}手でつながるよ。', 'いっしょに盤を見てみよう。相手は赤い印の点に置いたよ。ここからは、きみがどこをふさいでも、相手はあと{j}手でつながるんだ。', '大丈夫、次はいけるよ。赤い印の1手のあと、どこをふさいでも相手はあと{j}手でつながっちゃうんだ。'],
    },
  };
  const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, q) => v && v[q] != null ? v[q] : '');
  const text = (lang, k, v) => fill((T[lang] || T.en)[k] || T.en[k] || '', v);
  const own = (lang, k, i, v) => { const L = OWN[lang] && OWN[lang][k]; return L ? fill(L[((i | 0) % L.length + L.length) % L.length], v) : text(lang, k, v); };
  const API = { pick, reply, attack, facts, block, text, own, T, OWN, sc };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.HexPzWhy = API;
})();
