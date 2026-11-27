/* Agon puzzles ("win within N"): what happened on the board after a move off the solution (2026-11-27 担当F).
   Shared by the 2D (agon/app.js puzzleMove, the neutral words below in 14 languages) and the 3D table (atlas/puzzles.js,
   キンダイスン's words in atlas/games/agon-pz.js). Checked by tools/lesson-verify-agon.js (⑦⑧⑨).
   The 詰め rule (claude/game-conventions-addendum.md): a move off the solution is not taken back and the right move is not shown;
   the defender answers with its most stubborn reply (engine.js duelReply — the 2D and the 3D ask the same engine) and the result
   says what is on the board:
     wEmpty — the move itself put your six guards round the empty throne: you lose
     wLastQ / wLastG — the last move: your queen is not on the throne ({g} of 6 guards on the inner ring) / it is, but only {g} of 6
     wLose  — the reply completed the opponent's guard round the throne: you lose
     wTookQ — the reply sandwiched your queen (it must be placed again); {n} moves left
     wTookG — the reply sandwiched {r} of your guards (back to the outer ring); {n}
     wReloc — the reply placed one of its captured pieces back on the board; {n}
     wBlock — the reply stepped into the ring round the throne (or onto it); {n}
     wRun   — any other step; {n} · wPass — the opponent could not move; {n}
   facts(o) with o = { E, me, mid (after the move off the solution), after (after the reply, or null on the last move), reply, left
   (own moves left after the reply), last } → { k, v, mark } (mark: the cell of the red mark, or -1).
   window.AgonPzWhy = { facts, text, T, KEYS } · module.exports the same. */
(function () {
  'use strict';
  const KEYS = ['wEmpty', 'wLastQ', 'wLastG', 'wLose', 'wTookQ', 'wTookG', 'wReloc', 'wBlock', 'wRun', 'wPass'];
  function facts(o) {
    const E = o.E, me = o.me, opp = 3 - me, mid = o.mid;
    const jm = E.judge(mid);
    if (jm.over && jm.winner === opp) return { k: 'wEmpty', v: {}, mark: -1 };
    if (o.last || !o.after) return mid.onThrone(me) ? { k: 'wLastG', v: { g: mid.ringCount(me) }, mark: -1 } : { k: 'wLastQ', v: { g: mid.ringCount(me) }, mark: -1 };
    const r = o.reply, n = o.left, after = o.after;
    if (r === E.PASS || r == null) return { k: 'wPass', v: { n }, mark: -1 };
    const to = E.mTo(r), ja = E.judge(after);
    if (ja.over && ja.winner === opp) return { k: 'wLose', v: {}, mark: to };
    const kind = E.kindOfMove(mid, r);
    if (kind === 'step') {
      const caps = mid.capsOf(r);
      if (caps.some(i => mid.isQueen(i))) return { k: 'wTookQ', v: { n }, mark: to };
      if (caps.length) return { k: 'wTookG', v: { r: caps.length, n }, mark: to };
    }
    if (kind === 'reloc' || kind === 'place') return { k: 'wReloc', v: { n }, mark: to };
    if (to === E.CENTER || E.RING[to] === 1) return { k: 'wBlock', v: { n }, mark: to };
    return { k: 'wRun', v: { n }, mark: to };
  }
  const T = {
    ja: { answer: '「答えを見る」で正解の手順を見られます。',
      wEmpty: 'その手で、あなたのガード6枚が空の王座を囲んでしまいました。空の王座を囲んだ側の負けです。',
      wLastQ: 'その手のあとも、あなたの女王は王座にいません（内側の輪のガードは{g}/6枚）。勝ちの形になっていません。',
      wLastG: '女王は王座にいますが、内側の輪のガードは{g}/6枚で、まだ囲めていません。',
      wLose: '相手は赤い印の手で、王座のまわりを自分の駒で完成させました。あなたの負けです。',
      wTookQ: '相手は赤い印の手で、あなたの女王をはさんで捕まえました。女王は置き直しになり、残り{n}手では勝ち切れません。',
      wTookG: '相手は赤い印の手で、あなたのガードを{r}枚はさんで捕まえました。外の輪へ置き直しになり、残り{n}手では勝ち切れません。',
      wReloc: '相手は捕まっていた駒を赤い印のマスへ置き直しました。そこで道がふさがり、残り{n}手では勝ち切れません。',
      wBlock: '相手は赤い印のマス（王座のまわり）に入りこみました。相手にしっかり守られると、残り{n}手では勝ち切れません。',
      wRun: '相手は赤い印のマスへ動きました。相手にしっかり守られると、残り{n}手では勝ち切れません。',
      wPass: '相手は動ける駒がなくパスしました。それでも残り{n}手では勝ち切れません。' },
    en: { answer: 'Press “Show answer” to see the solution.',
      wEmpty: 'That move put your six guards round the empty throne — the side that surrounds an empty throne loses.',
      wLastQ: 'After that move your queen is still not on the throne (guards on the inner ring: {g} of 6). It is not a win.',
      wLastG: 'Your queen is on the throne, but only {g} of your 6 guards are on the inner ring — the guard is not complete.',
      wLose: 'The opponent answered at the red mark and completed its own guard round the throne — you lose.',
      wTookQ: 'The opponent answered at the red mark and sandwiched your queen. She must be placed again, and the moves left ({n}) are not enough to win.',
      wTookG: 'The opponent answered at the red mark and sandwiched your guards ({r}). They go back to the outer ring, and the moves left ({n}) are not enough to win.',
      wReloc: 'The opponent placed its captured piece back at the red mark. That blocks your way, and the moves left ({n}) are not enough to win.',
      wBlock: 'The opponent stepped into the red mark, in the ring round the throne. Against that defence the moves left ({n}) are not enough to win.',
      wRun: 'The opponent stepped to the red mark. Against that defence the moves left ({n}) are not enough to win.',
      wPass: 'The opponent had no move and passed. Even so, the moves left ({n}) are not enough to win.' },
    zh: { answer: '按“看答案”可以看到正解。',
      wEmpty: '这步让你的6枚卫兵围住了空王座。围住空王座的一方输。',
      wLastQ: '这步之后，你的女王仍不在王座上（内圈卫兵{g}/6枚），没有形成胜形。',
      wLastG: '女王在王座上，但内圈卫兵只有{g}/6枚，还没有围成。',
      wLose: '对手在红色标记处应对，用自己的棋子围成了王座。你输了。',
      wTookQ: '对手在红色标记处应对，夹住了你的女王。女王要重新放置，剩下{n}步赢不了。',
      wTookG: '对手在红色标记处应对，夹住了你{r}枚卫兵。它们要放回外圈，剩下{n}步赢不了。',
      wReloc: '对手把被捉的棋子重新放到红色标记处，挡住了你的路，剩下{n}步赢不了。',
      wBlock: '对手走进了红色标记处（王座周围）。在这样的防守下，剩下{n}步赢不了。',
      wRun: '对手走到了红色标记处。在这样的防守下，剩下{n}步赢不了。',
      wPass: '对手无子可动，只能停一手。即便如此，剩下{n}步也赢不了。' },
    'zh-TW': { answer: '按「看答案」可以看到正解。',
      wEmpty: '這步讓你的6枚衛兵圍住了空王座。圍住空王座的一方輸。',
      wLastQ: '這步之後，你的女王仍不在王座上（內圈衛兵{g}/6枚），沒有形成勝形。',
      wLastG: '女王在王座上，但內圈衛兵只有{g}/6枚，還沒有圍成。',
      wLose: '對手在紅色標記處應對，用自己的棋子圍成了王座。你輸了。',
      wTookQ: '對手在紅色標記處應對，夾住了你的女王。女王要重新放置，剩下{n}步贏不了。',
      wTookG: '對手在紅色標記處應對，夾住了你{r}枚衛兵。它們要放回外圈，剩下{n}步贏不了。',
      wReloc: '對手把被捉的棋子重新放到紅色標記處，擋住了你的路，剩下{n}步贏不了。',
      wBlock: '對手走進了紅色標記處（王座周圍）。在這樣的防守下，剩下{n}步贏不了。',
      wRun: '對手走到了紅色標記處。在這樣的防守下，剩下{n}步贏不了。',
      wPass: '對手無子可動，只能停一手。即便如此，剩下{n}步也贏不了。' },
    ko: { answer: '“정답 보기”로 정답 수순을 볼 수 있습니다.',
      wEmpty: '그 수로 당신의 근위병 6개가 빈 왕좌를 둘러쌌습니다. 빈 왕좌를 둘러싼 쪽이 집니다.',
      wLastQ: '그 수 뒤에도 당신의 여왕은 왕좌에 없습니다(안쪽 고리의 근위병 {g}/6개). 승리 모양이 아닙니다.',
      wLastG: '여왕은 왕좌에 있지만 안쪽 고리의 근위병은 {g}/6개로, 아직 다 둘러싸지 못했습니다.',
      wLose: '상대가 빨간 표시의 수로 받아, 자기 말로 왕좌 둘레를 완성했습니다. 당신의 패배입니다.',
      wTookQ: '상대가 빨간 표시의 수로 받아 당신의 여왕을 끼워 잡았습니다. 여왕은 다시 놓아야 하고, 남은 {n}수로는 이길 수 없습니다.',
      wTookG: '상대가 빨간 표시의 수로 받아 당신의 근위병 {r}개를 끼워 잡았습니다. 바깥 고리로 다시 놓아야 하고, 남은 {n}수로는 이길 수 없습니다.',
      wReloc: '상대가 잡혀 있던 말을 빨간 표시의 칸에 다시 놓았습니다. 길이 막혀 남은 {n}수로는 이길 수 없습니다.',
      wBlock: '상대가 빨간 표시의 칸(왕좌 둘레)으로 들어왔습니다. 이렇게 막으면 남은 {n}수로는 이길 수 없습니다.',
      wRun: '상대가 빨간 표시의 칸으로 움직였습니다. 이렇게 막으면 남은 {n}수로는 이길 수 없습니다.',
      wPass: '상대는 움직일 말이 없어 패스했습니다. 그래도 남은 {n}수로는 이길 수 없습니다.' },
    es: { answer: 'Pulsa «Solución» para ver la solución completa.',
      wEmpty: 'Con esa jugada tus seis guardias rodean el trono vacío: quien rodea el trono vacío pierde.',
      wLastQ: 'Tras esa jugada tu reina sigue fuera del trono (guardias en el anillo interior: {g} de 6). No es una victoria.',
      wLastG: 'Tu reina está en el trono, pero solo hay {g} de tus 6 guardias en el anillo interior: la guardia no está completa.',
      wLose: 'El rival respondió en la marca roja y completó su propia guardia alrededor del trono: pierdes.',
      wTookQ: 'El rival respondió en la marca roja y atrapó a tu reina entre dos piezas. Hay que volver a colocarla y con las jugadas que quedan ({n}) no alcanza para ganar.',
      wTookG: 'El rival respondió en la marca roja y atrapó guardias tuyos ({r}). Vuelven al anillo exterior y con las jugadas que quedan ({n}) no alcanza para ganar.',
      wReloc: 'El rival volvió a colocar su pieza capturada en la marca roja. Eso te cierra el paso y con las jugadas que quedan ({n}) no alcanza para ganar.',
      wBlock: 'El rival entró en la marca roja, en el anillo que rodea el trono. Con esa defensa, las jugadas que quedan ({n}) no alcanzan para ganar.',
      wRun: 'El rival se movió a la marca roja. Con esa defensa, las jugadas que quedan ({n}) no alcanzan para ganar.',
      wPass: 'El rival no tenía jugada y pasó. Aun así, las jugadas que quedan ({n}) no alcanzan para ganar.' },
    fr: { answer: 'Appuie sur « Solution » pour voir la suite gagnante.',
      wEmpty: 'Ce coup place tes six gardes autour du trône vide : le camp qui entoure le trône vide perd.',
      wLastQ: 'Après ce coup, ta reine n’est toujours pas sur le trône (gardes sur l’anneau intérieur : {g} sur 6). Ce n’est pas gagné.',
      wLastG: 'Ta reine est sur le trône, mais seuls {g} de tes 6 gardes sont sur l’anneau intérieur : la garde n’est pas complète.',
      wLose: 'L’adversaire a répondu sur la marque rouge et complété sa propre garde autour du trône : perdu.',
      wTookQ: 'L’adversaire a répondu sur la marque rouge et pris ta reine en tenaille. Elle doit être replacée, et les coups restants ({n}) ne suffisent plus pour gagner.',
      wTookG: 'L’adversaire a répondu sur la marque rouge et pris en tenaille de tes gardes ({r}). Ils retournent sur l’anneau extérieur, et les coups restants ({n}) ne suffisent plus.',
      wReloc: 'L’adversaire a replacé sa pièce capturée sur la marque rouge. Cela te barre la route, et les coups restants ({n}) ne suffisent plus pour gagner.',
      wBlock: 'L’adversaire est entré sur la marque rouge, dans l’anneau autour du trône. Face à cette défense, les coups restants ({n}) ne suffisent plus.',
      wRun: 'L’adversaire s’est déplacé sur la marque rouge. Face à cette défense, les coups restants ({n}) ne suffisent plus.',
      wPass: 'L’adversaire n’avait aucun coup et a passé. Même ainsi, les coups restants ({n}) ne suffisent pas pour gagner.' },
    pt: { answer: 'Toque em “Solução” para ver a sequência certa.',
      wEmpty: 'Com esse lance seus seis guardas cercam o trono vazio — quem cerca o trono vazio perde.',
      wLastQ: 'Depois desse lance sua rainha ainda não está no trono (guardas no anel interno: {g} de 6). Não é vitória.',
      wLastG: 'Sua rainha está no trono, mas só {g} dos seus 6 guardas estão no anel interno — a guarda não está completa.',
      wLose: 'O rival respondeu na marca vermelha e completou a própria guarda em volta do trono — derrota.',
      wTookQ: 'O rival respondeu na marca vermelha e prendeu sua rainha entre duas peças. Ela precisa ser recolocada, e os lances restantes ({n}) não bastam para vencer.',
      wTookG: 'O rival respondeu na marca vermelha e prendeu guardas seus ({r}). Eles voltam ao anel externo, e os lances restantes ({n}) não bastam para vencer.',
      wReloc: 'O rival recolocou sua peça capturada na marca vermelha. Isso fecha o seu caminho, e os lances restantes ({n}) não bastam para vencer.',
      wBlock: 'O rival entrou na marca vermelha, no anel em volta do trono. Contra essa defesa, os lances restantes ({n}) não bastam para vencer.',
      wRun: 'O rival foi para a marca vermelha. Contra essa defesa, os lances restantes ({n}) não bastam para vencer.',
      wPass: 'O rival não tinha lance e passou. Mesmo assim, os lances restantes ({n}) não bastam para vencer.' },
    de: { answer: 'Mit „Lösung“ siehst du die richtige Zugfolge.',
      wEmpty: 'Mit diesem Zug umringen deine sechs Wachen den leeren Thron – wer den leeren Thron umringt, verliert.',
      wLastQ: 'Nach diesem Zug steht deine Königin noch nicht auf dem Thron (Wachen im inneren Ring: {g} von 6). Das ist kein Sieg.',
      wLastG: 'Deine Königin steht auf dem Thron, aber nur {g} deiner 6 Wachen stehen im inneren Ring – die Wache ist nicht vollständig.',
      wLose: 'Der Gegner antwortete auf der roten Markierung und schloss seine eigene Wache um den Thron – verloren.',
      wTookQ: 'Der Gegner antwortete auf der roten Markierung und nahm deine Königin in die Zange. Sie muss neu gesetzt werden, und die übrigen Züge ({n}) reichen nicht mehr zum Sieg.',
      wTookG: 'Der Gegner antwortete auf der roten Markierung und nahm Wachen von dir in die Zange ({r}). Sie kommen auf den äußeren Ring, und die übrigen Züge ({n}) reichen nicht mehr.',
      wReloc: 'Der Gegner setzte seinen gefangenen Stein auf die rote Markierung zurück. Das versperrt dir den Weg, und die übrigen Züge ({n}) reichen nicht mehr.',
      wBlock: 'Der Gegner zog auf die rote Markierung, in den Ring um den Thron. Gegen diese Abwehr reichen die übrigen Züge ({n}) nicht mehr.',
      wRun: 'Der Gegner zog auf die rote Markierung. Gegen diese Abwehr reichen die übrigen Züge ({n}) nicht mehr.',
      wPass: 'Der Gegner hatte keinen Zug und passte. Trotzdem reichen die übrigen Züge ({n}) nicht zum Sieg.' },
    ru: { answer: 'Нажмите «Показать ответ», чтобы увидеть решение.',
      wEmpty: 'Этим ходом ваши шесть стражей окружили пустой трон — сторона, окружившая пустой трон, проигрывает.',
      wLastQ: 'После этого хода ваша королева всё ещё не на троне (стражей во внутреннем кольце: {g} из 6). Это не победа.',
      wLastG: 'Королева на троне, но во внутреннем кольце только {g} из 6 ваших стражей — стража не собрана.',
      wLose: 'Соперник ответил на красной отметке и собрал свою стражу вокруг трона — поражение.',
      wTookQ: 'Соперник ответил на красной отметке и зажал вашу королеву. Её нужно ставить заново, и оставшихся ходов ({n}) уже не хватает для победы.',
      wTookG: 'Соперник ответил на красной отметке и зажал ваших стражей ({r}). Они уходят на внешнее кольцо, и оставшихся ходов ({n}) уже не хватает.',
      wReloc: 'Соперник поставил свою захваченную фишку на красную отметку. Это перекрыло вам путь, и оставшихся ходов ({n}) уже не хватает.',
      wBlock: 'Соперник вошёл на красную отметку, в кольцо вокруг трона. При такой защите оставшихся ходов ({n}) не хватает для победы.',
      wRun: 'Соперник пошёл на красную отметку. При такой защите оставшихся ходов ({n}) не хватает для победы.',
      wPass: 'У соперника не было хода, и он пропустил. И всё же оставшихся ходов ({n}) не хватает для победы.' },
    tr: { answer: 'Çözümü görmek için “Cevabı göster”e dokun.',
      wEmpty: 'Bu hamleyle altı muhafızın boş tahtı çevirdi — boş tahtı çeviren taraf kaybeder.',
      wLastQ: 'Bu hamleden sonra kraliçen hâlâ tahtta değil (iç halkadaki muhafız: {g}/6). Bu bir galibiyet değil.',
      wLastG: 'Kraliçen tahtta ama iç halkada 6 muhafızından yalnızca {g} tanesi var — muhafız halkası tamam değil.',
      wLose: 'Rakip kırmızı işaretle karşılık verdi ve tahtın çevresini kendi taşlarıyla tamamladı — kaybettin.',
      wTookQ: 'Rakip kırmızı işaretle karşılık verdi ve kraliçeni iki taş arasına aldı. Kraliçe yeniden yerleştirilmeli; kalan hamleler ({n}) kazanmaya yetmez.',
      wTookG: 'Rakip kırmızı işaretle karşılık verdi ve muhafızlarını iki taş arasına aldı ({r}). Dış halkaya dönüyorlar; kalan hamleler ({n}) kazanmaya yetmez.',
      wReloc: 'Rakip yakalanan taşını kırmızı işarete yeniden koydu. Bu yolunu kapattı; kalan hamleler ({n}) kazanmaya yetmez.',
      wBlock: 'Rakip tahtın çevresindeki halkada kırmızı işarete girdi. Bu savunmaya karşı kalan hamleler ({n}) kazanmaya yetmez.',
      wRun: 'Rakip kırmızı işarete gitti. Bu savunmaya karşı kalan hamleler ({n}) kazanmaya yetmez.',
      wPass: 'Rakibin hamlesi yoktu ve pas geçti. Yine de kalan hamleler ({n}) kazanmaya yetmez.' },
    id: { answer: 'Tekan “Lihat jawaban” untuk melihat solusinya.',
      wEmpty: 'Langkah itu membuat enam pengawalmu mengepung takhta kosong — pihak yang mengepung takhta kosong kalah.',
      wLastQ: 'Setelah langkah itu ratumu masih belum di takhta (pengawal di cincin dalam: {g} dari 6). Belum menang.',
      wLastG: 'Ratumu di takhta, tetapi hanya {g} dari 6 pengawalmu di cincin dalam — kepungannya belum lengkap.',
      wLose: 'Lawan membalas di tanda merah dan melengkapi pengawalnya sendiri di sekeliling takhta — kamu kalah.',
      wTookQ: 'Lawan membalas di tanda merah dan menjepit ratumu. Ratu harus ditempatkan ulang, dan sisa langkah ({n}) tidak cukup untuk menang.',
      wTookG: 'Lawan membalas di tanda merah dan menjepit pengawalmu ({r}). Mereka kembali ke cincin luar, dan sisa langkah ({n}) tidak cukup untuk menang.',
      wReloc: 'Lawan menempatkan kembali bidaknya yang tertangkap di tanda merah. Jalanmu tertutup, dan sisa langkah ({n}) tidak cukup untuk menang.',
      wBlock: 'Lawan masuk ke tanda merah, di cincin sekeliling takhta. Dengan pertahanan itu, sisa langkah ({n}) tidak cukup untuk menang.',
      wRun: 'Lawan pindah ke tanda merah. Dengan pertahanan itu, sisa langkah ({n}) tidak cukup untuk menang.',
      wPass: 'Lawan tidak punya langkah dan melewatkan giliran. Meski begitu, sisa langkah ({n}) tidak cukup untuk menang.' },
    hi: { answer: 'हल देखने के लिए “हल” दबाएँ।',
      wEmpty: 'इस चाल से आपके छह रक्षकों ने खाली सिंहासन को घेर लिया — खाली सिंहासन घेरने वाला हारता है।',
      wLastQ: 'इस चाल के बाद भी आपकी रानी सिंहासन पर नहीं है (भीतरी घेरे में रक्षक: 6 में से {g})। यह जीत नहीं है।',
      wLastG: 'रानी सिंहासन पर है, पर भीतरी घेरे में आपके 6 में से केवल {g} रक्षक हैं — घेरा पूरा नहीं हुआ।',
      wLose: 'विरोधी ने लाल निशान पर जवाब दिया और सिंहासन के चारों ओर अपना घेरा पूरा कर लिया — आप हारे।',
      wTookQ: 'विरोधी ने लाल निशान पर जवाब दिया और आपकी रानी को दो गोटियों के बीच पकड़ लिया। रानी को फिर से रखना होगा, और बची चालों ({n}) में जीत नहीं मिलेगी।',
      wTookG: 'विरोधी ने लाल निशान पर जवाब दिया और आपके रक्षकों ({r}) को बीच में पकड़ लिया। वे बाहरी घेरे में लौटेंगे, और बची चालों ({n}) में जीत नहीं मिलेगी।',
      wReloc: 'विरोधी ने अपनी पकड़ी गई गोटी लाल निशान पर फिर से रख दी। इससे आपका रास्ता बंद हुआ, और बची चालों ({n}) में जीत नहीं मिलेगी।',
      wBlock: 'विरोधी सिंहासन के चारों ओर के घेरे में लाल निशान पर आ गया। इस बचाव के सामने बची चालों ({n}) में जीत नहीं मिलेगी।',
      wRun: 'विरोधी लाल निशान पर चला गया। इस बचाव के सामने बची चालों ({n}) में जीत नहीं मिलेगी।',
      wPass: 'विरोधी के पास कोई चाल नहीं थी, उसने बारी छोड़ी। फिर भी बची चालों ({n}) में जीत नहीं मिलेगी।' },
    ar: { answer: 'اضغط «الحل» لترى خطوات الحل.',
      wEmpty: 'بهذه النقلة أحاط حراسك الستة بالعرش الفارغ — ومن يحيط بالعرش الفارغ يخسر.',
      wLastQ: 'بعد هذه النقلة ما زالت ملكتك خارج العرش (الحراس في الحلقة الداخلية: {g} من 6). ليس هذا فوزًا.',
      wLastG: 'ملكتك على العرش، لكن في الحلقة الداخلية {g} فقط من حراسك الستة — لم تكتمل الحراسة.',
      wLose: 'ردّ الخصم عند العلامة الحمراء وأكمل حراسته حول العرش — خسرت.',
      wTookQ: 'ردّ الخصم عند العلامة الحمراء وحاصر ملكتك بين قطعتين. يجب وضعها من جديد، ولا تكفي النقلات الباقية ({n}) للفوز.',
      wTookG: 'ردّ الخصم عند العلامة الحمراء وحاصر بعض حراسك ({r}). يعودون إلى الحلقة الخارجية، ولا تكفي النقلات الباقية ({n}) للفوز.',
      wReloc: 'أعاد الخصم قطعته المأسورة إلى العلامة الحمراء. هذا يسد طريقك، ولا تكفي النقلات الباقية ({n}) للفوز.',
      wBlock: 'دخل الخصم العلامة الحمراء في الحلقة حول العرش. أمام هذا الدفاع لا تكفي النقلات الباقية ({n}) للفوز.',
      wRun: 'انتقل الخصم إلى العلامة الحمراء. أمام هذا الدفاع لا تكفي النقلات الباقية ({n}) للفوز.',
      wPass: 'لم يكن لدى الخصم نقلة فمرّر دوره. ومع ذلك لا تكفي النقلات الباقية ({n}) للفوز.' },
  };
  const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => v && v[k] != null ? v[k] : '');
  function text(lang, k, v) { const L = T[lang] || T.en; const s = L[k] != null ? L[k] : T.en[k]; return s == null ? '' : fill(s, v); }
  const API = { facts, text, T, KEYS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.AgonPzWhy = API;
})();
