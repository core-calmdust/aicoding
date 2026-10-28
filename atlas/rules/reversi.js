/* =====================================================================
   Reversi rules — a guided tour on the 3D table, told by the guide
   character (Flipturtle). Built from the full game's illustrated rules
   (reversi/i18n.js rl.*), turned into a short hands-on scenario.
   Contract: AtlasRules[id] = { start(ctx) → { stop() } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart(), onClose() }
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/g-disc.webp';
  const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const flipsOf = (cells, sq, color) => {
    if (cells[sq]) return [];
    const opp = 3 - color, r0 = sq >> 3, c0 = sq & 7, out = [];
    for (const [dr, dc] of DIRS) {
      let r = r0 + dr, c = c0 + dc; const line = [];
      while (r >= 0 && r < 8 && c >= 0 && c < 8 && cells[r * 8 + c] === opp) { line.push(r * 8 + c); r += dr; c += dc; }
      if (line.length && r >= 0 && r < 8 && c >= 0 && c < 8 && cells[r * 8 + c] === color) out.push(...line);
    }
    return out;
  };
  const legal = (cells, color) => { const m = []; for (let s = 0; s < 64; s++) if (!cells[s] && flipsOf(cells, s, color).length) m.push(s); return m; };
  const sq = n => (+n[1] - 1) * 8 + (n.charCodeAt(0) - 97);
  const pos = rows => rows.join('').split('').map(ch => ch === 'B' ? 1 : ch === 'W' ? 2 : 0);
  const INIT = pos(['........', '........', '........', '...WB...', '...BW...', '........', '........', '........']);
  const RL = {   // same diagrams as the full game's rules page
    flip: pos(['........', '........', '........', '..BWWW..', '........', '........', '........', '........']),
    multi: pos(['........', '...B....', '...W....', '....WB..', '..WW....', '.B......', '........', '........']),
    no: pos(['........', '.BW.W...', '........', '..BWW...', '........', '...WW...', '........', '........']),
    pass: pos(['........', '...W....', '...W.W..', '..WWW.W.', '...WBW.B', '.B.BBBBB', '..BBBBBB', '..BBBBBB']),
    end: pos(['BBBBBBBW', 'BBWWWBBW', 'BBBBBBBW', 'BBBBWWBW', 'BWBBWBBW', 'BBWWWWWW', 'BBBWWWBW', 'WWWWWWBW']),
  };

  /* the scenario. say = before, done = after the player's move (interactive steps) */
  const TXT = {
    ja: {
      name: 'リバガメ', title: 'リバーシのルール', next: 'つぎへ', back: 'もどる', skip: 'とじる', start: 'あそんでみる', again: 'もういちど',
      tap: '光っているマスをタップ', nope: 'そこは はさめないよ〜。✕のマスは打てないんだ。',
      s: [
        { say: 'やあ、ぼくは<b>リバガメ</b>！ リバーシのルールを、この盤でいっしょにたしかめよう。' },
        { say: '盤は 8×8 の<b>64マス</b>。まん中に黒と白を2個ずつ、ななめに置いてスタート。先に打つのは<b>黒</b>だよ。' },
        { say: '打てるのは、相手の石を<b>1個以上はさめる</b>マスだけ。光っている4か所のどれかをタップしてみて！', done: 'やったね！ はさまれた白が、黒にクルッとひっくり返ったよ。' },
        { say: '一直線に何個ならんでいても、はさめば<b>全部</b>返るんだ。光っているマスに打ってみよう！', done: '3個まとめてクルクルッ！ 気持ちいいでしょ？' },
        { say: '縦・横・ななめ、はさめた方向が<b>いくつあっても</b>同時に返るよ。ここに打つとどうなるかな？', done: 'いろんな方向が一度に返ったね。はさんでいない石は返らないよ。' },
        { say: '自分の石が先にないときや、間に<b>空きマス</b>があるときは、はさめないから打てない（✕）。返った石で連鎖することもないよ。' },
        { say: '打てる場所がないときは<b>パス</b>。この盤では白がどこにも打てないから、黒がもう1回打つんだ。' },
        { say: '盤が埋まるか、どちらも打てなくなったら<b>おしまい</b>。石が多いほうの勝ち！ 同じ数なら引き分けだよ。' },
        { say: 'さいごにコツ。<b>隅</b>（金）は二度と返されない最強のマス。空いた隅のとなりの<b>X</b>（赤）と<b>C</b>（オレンジ）は、隅をとられやすいから気をつけて。' },
        { say: 'これでルールはばっちり！ さっそく遊んでみよう。わからなくなったら、いつでもまた聞いてね。' },
      ],
    },
    en: {
      name: 'Flipturtle', title: 'Reversi rules', next: 'Next', back: 'Back', skip: 'Close', start: 'Let\'s play', again: 'Again',
      tap: 'Tap a glowing square', nope: 'Nothing to sandwich there! You can\'t play on the ✕ squares.',
      s: [
        { say: 'Hi, I\'m <b>Flipturtle</b>! Let\'s go through the rules of Reversi together, right here on the board.' },
        { say: 'The board has <b>64 squares</b> (8×8). Two black and two white discs start diagonally in the middle, and <b>Black</b> moves first.' },
        { say: 'You can only play where you <b>sandwich at least one</b> of your opponent\'s discs. Tap one of the four glowing squares!', done: 'Nice! The sandwiched white disc flipped over to black.' },
        { say: 'However many discs are in the line, <b>all</b> of them flip when you sandwich them. Try the glowing square!', done: 'Three at once — flip, flip, flip!' },
        { say: 'Across, up and down, diagonal — <b>every</b> direction you sandwich flips at the same time. What happens here?', done: 'Lots of directions flipped together. Discs that aren\'t sandwiched stay put.' },
        { say: 'If there\'s no disc of yours at the far end, or an <b>empty square</b> in between, nothing is sandwiched and you can\'t play there (✕). Flips never chain.' },
        { say: 'With no legal move you must <b>pass</b>. Here White can\'t move anywhere, so Black plays again.' },
        { say: 'The game <b>ends</b> when the board is full or nobody can move. More discs wins — the same number is a draw.' },
        { say: 'One last tip: <b>corners</b> (gold) can never be flipped. The <b>X</b> (red) and <b>C</b> (orange) squares next to an empty corner often give it away.' },
        { say: 'That\'s all the rules! Let\'s play a game. Ask me again any time.' },
      ],
    },
    zh: {"name": "翻翻龟", "title": "黑白棋规则", "next": "下一步", "back": "返回", "skip": "关闭", "start": "来玩吧", "again": "再来一次", "tap": "点击发光的格子", "nope": "那里夹不到哦～。✕的格子不能下。", "s": [{"say": "你好，我是<b>翻翻龟</b>！一起在这个棋盘上看看黑白棋的规则吧。"}, {"say": "棋盘有 8×8 共<b>64格</b>。中间斜着各放2颗黑子和白子开始，<b>黑方</b>先下哦。"}, {"say": "只能下在能<b>夹住至少1颗</b>对方棋子的格子。点一下发光的4个格子中的一个吧！", "done": "成功了！被夹住的白子，咕噜一下翻成黑子啦。"}, {"say": "不管一条线上排了几颗，只要夹住就<b>全部</b>翻过来。下在发光的格子试试！", "done": "3颗一起咕噜咕噜！很爽吧？"}, {"say": "横、竖、斜，不管夹住了<b>几个方向</b>，都会同时翻过来。下在这里会怎样呢？", "done": "好几个方向一起翻了。没被夹住的棋子不会翻哦。"}, {"say": "另一头没有自己的棋子，或者中间有<b>空格</b>时，夹不住，所以不能下（✕）。翻过来的棋子也不会连锁哦。"}, {"say": "没有地方可下时就要<b>停一手</b>（PASS）。这个棋盘上白方哪里都下不了，所以黑方再下一次。"}, {"say": "棋盘下满，或者双方都不能下时就<b>结束</b>。棋子多的一方获胜！一样多就是平局。"}, {"say": "最后教你个窍门。<b>角</b>（金色）是永远不会被翻的最强格子。空角旁边的<b>X</b>（红色）和<b>C</b>（橙色）容易让对方拿到角，要小心哦。"}, {"say": "规则全都懂啦！马上来玩吧。不明白的时候，随时再来问我哦。"}]},
    ko: {"name": "뒤집거북", "title": "리버시 규칙", "next": "다음", "back": "이전", "skip": "닫기", "start": "놀아 보기", "again": "한 번 더", "tap": "빛나는 칸을 탭하세요", "nope": "거기는 끼울 수 없어~. ✕ 칸에는 둘 수 없어.", "s": [{"say": "안녕, 나는 <b>뒤집거북</b>! 이 판에서 리버시 규칙을 같이 알아보자."}, {"say": "판은 8×8, <b>64칸</b>이야. 가운데에 흑과 백을 2개씩 대각선으로 놓고 시작해. 먼저 두는 쪽은 <b>흑</b>이야."}, {"say": "상대 돌을 <b>1개 이상 끼울 수 있는</b> 칸에만 둘 수 있어. 빛나는 4곳 중 하나를 탭해 봐!", "done": "잘했어! 끼인 백이 흑으로 휙 뒤집혔어."}, {"say": "한 줄에 몇 개가 있어도, 끼우면 <b>전부</b> 뒤집혀. 빛나는 칸에 둬 보자!", "done": "3개가 한꺼번에 휙휙휙! 기분 좋지?"}, {"say": "가로・세로・대각선, 끼운 방향이 <b>몇 개든</b> 동시에 뒤집혀. 여기에 두면 어떻게 될까?", "done": "여러 방향이 한 번에 뒤집혔지. 끼이지 않은 돌은 그대로야."}, {"say": "반대쪽 끝에 내 돌이 없거나, 사이에 <b>빈칸</b>이 있으면 끼울 수 없어서 못 둬(✕). 뒤집힌 돌로 연쇄되지도 않아."}, {"say": "둘 곳이 없으면 <b>패스</b>. 이 판에서는 백이 아무 데도 못 두니까 흑이 한 번 더 둬."}, {"say": "판이 꽉 차거나 둘 다 못 두게 되면 <b>끝</b>. 돌이 많은 쪽이 이겨! 같은 수면 무승부야."}, {"say": "마지막으로 요령 하나. <b>구석</b>(금색)은 절대 뒤집히지 않는 최강의 칸. 빈 구석 옆의 <b>X</b>(빨강)와 <b>C</b>(주황)는 구석을 뺏기기 쉬우니 조심해."}, {"say": "이제 규칙은 완벽해! 바로 놀아 보자. 모르는 게 생기면 언제든 다시 물어봐."}]},
    es: {"name": "Volteruga", "title": "Reglas del Reversi", "next": "Siguiente", "back": "Atrás", "skip": "Cerrar", "start": "¡A jugar!", "again": "Otra vez", "tap": "Toca una casilla brillante", "nope": "¡Ahí no atrapas nada! No puedes jugar en las casillas ✕.", "s": [{"say": "¡Hola, soy <b>Volteruga</b>! Vamos a ver juntos las reglas del Reversi aquí mismo, en el tablero."}, {"say": "El tablero tiene <b>64 casillas</b> (8×8). Se empieza con dos fichas negras y dos blancas en diagonal en el centro, y mueven primero las <b>negras</b>."}, {"say": "Solo puedes jugar donde <b>atrapes al menos una</b> ficha rival entre dos tuyas. ¡Toca una de las cuatro casillas brillantes!", "done": "¡Genial! La ficha blanca atrapada se ha volteado a negra."}, {"say": "Da igual cuántas fichas haya en la línea: si las atrapas, se voltean <b>todas</b>. ¡Prueba en la casilla brillante!", "done": "¡Tres de golpe! Vuelta, vuelta y vuelta. ¡Qué gusto!"}, {"say": "En horizontal, vertical o diagonal: se voltean a la vez <b>todas</b> las direcciones que atrapes. ¿Qué pasará aquí?", "done": "Se han volteado varias direcciones a la vez. Las fichas que no están atrapadas no cambian."}, {"say": "Si al otro lado no hay una ficha tuya, o hay una <b>casilla vacía</b> en medio, no atrapas nada y no puedes jugar ahí (✕). Las fichas volteadas no hacen cadena."}, {"say": "Si no tienes ninguna jugada, debes <b>pasar</b>. Aquí las blancas no pueden jugar en ningún sitio, así que las negras vuelven a jugar."}, {"say": "La partida <b>termina</b> cuando el tablero se llena o nadie puede jugar. ¡Gana quien tenga más fichas! Si hay las mismas, es empate."}, {"say": "Un último truco: las <b>esquinas</b> (doradas) nunca se pueden voltear. Cuidado con las casillas <b>X</b> (rojas) y <b>C</b> (naranjas) junto a una esquina vacía: suelen regalarla."}, {"say": "¡Ya sabes todas las reglas! Vamos a jugar una partida. Pregúntame otra vez cuando quieras."}]},
    fr: {"name": "Retortue", "title": "Règles du Reversi", "next": "Suivant", "back": "Retour", "skip": "Fermer", "start": "On joue !", "again": "Encore", "tap": "Touche une case qui brille", "nope": "Rien à encadrer ici ! On ne peut pas jouer sur les cases ✕.", "s": [{"say": "Salut, moi c’est <b>Retortue</b> ! Découvrons ensemble les règles du Reversi, directement sur le plateau."}, {"say": "Le plateau compte <b>64 cases</b> (8×8). On commence avec deux pions noirs et deux blancs en diagonale au centre, et ce sont les <b>Noirs</b> qui jouent en premier."}, {"say": "On ne peut jouer que là où l’on <b>encadre au moins un</b> pion adverse. Touche l’une des quatre cases qui brillent !", "done": "Bravo ! Le pion blanc encadré s’est retourné en noir."}, {"say": "Peu importe le nombre de pions sur la ligne : s’ils sont encadrés, ils se retournent <b>tous</b>. Essaie la case qui brille !", "done": "Trois d’un coup — hop, hop, hop ! Ça fait plaisir, non ?"}, {"say": "Horizontale, verticale, diagonale : <b>toutes</b> les directions encadrées se retournent en même temps. Que se passe-t-il ici ?", "done": "Plusieurs directions se sont retournées ensemble. Les pions non encadrés ne bougent pas."}, {"say": "S’il n’y a pas de pion à toi au bout, ou une <b>case vide</b> au milieu, rien n’est encadré et tu ne peux pas jouer là (✕). Les retournements ne font jamais de réaction en chaîne."}, {"say": "Sans coup possible, on doit <b>passer</b>. Ici, les Blancs ne peuvent jouer nulle part, alors les Noirs rejouent."}, {"say": "La partie se <b>termine</b> quand le plateau est plein ou que personne ne peut jouer. Celui qui a le plus de pions gagne ! À égalité, c’est match nul."}, {"say": "Une dernière astuce : les <b>coins</b> (dorés) ne peuvent jamais être retournés. Attention aux cases <b>X</b> (rouges) et <b>C</b> (orange) près d’un coin vide : elles le donnent souvent à l’adversaire."}, {"say": "Tu connais toutes les règles ! Allez, on fait une partie. Redemande-moi quand tu veux."}]},
    pt: {"name": "Viratuga", "title": "Regras do Reversi", "next": "Próximo", "back": "Voltar", "skip": "Fechar", "start": "Vamos jogar", "again": "De novo", "tap": "Toque numa casa brilhante", "nope": "Não dá para cercar nada aí! Não se pode jogar nas casas ✕.", "s": [{"say": "Oi, eu sou a <b>Viratuga</b>! Vamos ver juntos as regras do Reversi, aqui mesmo no tabuleiro."}, {"say": "O tabuleiro tem <b>64 casas</b> (8×8). Começa com duas peças pretas e duas brancas na diagonal, no meio, e as <b>Pretas</b> jogam primeiro."}, {"say": "Você só pode jogar onde <b>cercar pelo menos uma</b> peça do adversário. Toque numa das quatro casas brilhantes!", "done": "Boa! A peça branca cercada virou preta."}, {"say": "Não importa quantas peças tenha na linha: se você cercar, <b>todas</b> viram. Tente a casa brilhante!", "done": "Três de uma vez — vira, vira, vira! Que gostoso, né?"}, {"say": "Na horizontal, vertical ou diagonal: <b>todas</b> as direções cercadas viram ao mesmo tempo. O que acontece aqui?", "done": "Várias direções viraram juntas. As peças que não estão cercadas ficam como estão."}, {"say": "Se não tiver uma peça sua na outra ponta, ou tiver uma <b>casa vazia</b> no meio, nada é cercado e você não pode jogar ali (✕). As viradas nunca fazem efeito em cadeia."}, {"say": "Sem jogada possível, você precisa <b>passar</b>. Aqui as Brancas não podem jogar em lugar nenhum, então as Pretas jogam de novo."}, {"say": "O jogo <b>termina</b> quando o tabuleiro enche ou ninguém pode jogar. Quem tiver mais peças vence! Com o mesmo número, é empate."}, {"say": "Uma última dica: os <b>cantos</b> (dourados) nunca podem ser virados. Cuidado com as casas <b>X</b> (vermelhas) e <b>C</b> (laranja) ao lado de um canto vazio: elas costumam entregá-lo."}, {"say": "Pronto, você já sabe todas as regras! Vamos jogar uma partida. Pode me perguntar de novo quando quiser."}]},
    de: {"name": "Wendeschildi", "title": "Reversi-Regeln", "next": "Weiter", "back": "Zurück", "skip": "Schließen", "start": "Los geht’s", "again": "Nochmal", "tap": "Tippe auf ein leuchtendes Feld", "nope": "Da gibt es nichts einzuschließen! Auf ✕-Felder kannst du nicht setzen.", "s": [{"say": "Hallo, ich bin <b>Wendeschildi</b>! Lass uns die Reversi-Regeln gemeinsam direkt hier auf dem Brett anschauen."}, {"say": "Das Brett hat <b>64 Felder</b> (8×8). Zu Beginn liegen je zwei schwarze und weiße Steine diagonal in der Mitte, und <b>Schwarz</b> beginnt."}, {"say": "Du darfst nur dort setzen, wo du <b>mindestens einen</b> Stein des Gegners einschließt. Tippe auf eines der vier leuchtenden Felder!", "done": "Super! Der eingeschlossene weiße Stein wurde auf Schwarz gewendet."}, {"say": "Egal wie viele Steine in der Reihe liegen – eingeschlossen werden <b>alle</b> gewendet. Probier das leuchtende Feld!", "done": "Drei auf einmal – wende, wende, wende! Toll, oder?"}, {"say": "Waagrecht, senkrecht, diagonal – <b>alle</b> eingeschlossenen Richtungen werden gleichzeitig gewendet. Was passiert hier?", "done": "Mehrere Richtungen auf einmal! Steine, die nicht eingeschlossen sind, bleiben liegen."}, {"say": "Liegt am anderen Ende kein eigener Stein oder ist dazwischen ein <b>leeres Feld</b>, wird nichts eingeschlossen – dort darfst du nicht setzen (✕). Gewendete Steine lösen keine Kettenreaktion aus."}, {"say": "Hast du keinen gültigen Zug, musst du <b>passen</b>. Hier kann Weiß nirgends setzen, also ist Schwarz noch einmal dran."}, {"say": "Das Spiel <b>endet</b>, wenn das Brett voll ist oder niemand mehr setzen kann. Wer mehr Steine hat, gewinnt! Bei Gleichstand ist es unentschieden."}, {"say": "Noch ein Tipp zum Schluss: <b>Ecken</b> (gold) können nie gewendet werden. Vorsicht bei den <b>X</b>-Feldern (rot) und <b>C</b>-Feldern (orange) neben einer leeren Ecke – sie verschenken sie oft."}, {"say": "Jetzt kennst du alle Regeln! Lass uns eine Partie spielen. Frag mich jederzeit wieder."}]},
    hi: {"name": "पलटू कछुआ", "title": "रिवर्सी के नियम", "next": "आगे", "back": "पीछे", "skip": "बंद करें", "start": "खेलें!", "again": "फिर से", "tap": "चमकते खाने पर टैप करें", "nope": "वहाँ कुछ नहीं घिरता! ✕ वाले खानों पर चाल नहीं चल सकते।", "s": [{"say": "नमस्ते, मैं हूँ <b>पलटू कछुआ</b>! चलो, इसी बोर्ड पर मिलकर रिवर्सी के नियम देखते हैं।"}, {"say": "बोर्ड में 8×8 यानी <b>64 खाने</b> हैं। बीच में दो काली और दो सफ़ेद गोटियाँ तिरछी रखकर खेल शुरू होता है, और पहली चाल <b>काला</b> चलता है।"}, {"say": "तुम सिर्फ़ वहीं चाल चल सकते हो जहाँ विरोधी की <b>कम से कम एक</b> गोटी घिर जाए। चार चमकते खानों में से किसी एक पर टैप करो!", "done": "शाबाश! घिरी हुई सफ़ेद गोटी पलटकर काली हो गई।"}, {"say": "लाइन में कितनी भी गोटियाँ हों, घिर जाएँ तो <b>सारी</b> पलट जाती हैं। चमकते खाने पर चलकर देखो!", "done": "एक साथ तीन — पलट, पलट, पलट! मज़ा आया ना?"}, {"say": "आड़ी, खड़ी या तिरछी — जितनी भी <b>दिशाओं</b> में गोटियाँ घिरें, सब एक साथ पलटती हैं। यहाँ चलने पर क्या होगा?", "done": "कई दिशाएँ एक साथ पलट गईं। जो गोटियाँ नहीं घिरीं, वे वैसी ही रहती हैं।"}, {"say": "अगर दूसरे छोर पर तुम्हारी गोटी न हो, या बीच में <b>खाली खाना</b> हो, तो कुछ नहीं घिरता और वहाँ चाल नहीं चल सकते (✕)। पलटी गोटियों से आगे कोई सिलसिला नहीं बनता।"}, {"say": "कोई सही चाल न हो तो <b>पास</b> करना पड़ता है। यहाँ सफ़ेद कहीं नहीं चल सकता, इसलिए काला फिर से चलेगा।"}, {"say": "बोर्ड भर जाए या कोई भी चाल न चल सके, तो खेल <b>ख़त्म</b>। जिसकी गोटियाँ ज़्यादा, वही जीता! बराबर हों तो ड्रॉ।"}, {"say": "आख़िरी टिप: <b>कोने</b> (सुनहरे) कभी नहीं पलटते — ये सबसे ताक़तवर खाने हैं। ख़ाली कोने के पास वाले <b>X</b> (लाल) और <b>C</b> (नारंगी) खानों से सावधान, इनसे अक्सर कोना हाथ से निकल जाता है।"}, {"say": "अब तुम्हें सारे नियम आ गए! चलो, एक बाज़ी खेलते हैं। कभी भी दोबारा पूछ लेना।"}]},
    ar: {"name": "قلّوب", "title": "قواعد ريفيرسي", "next": "التالي", "back": "رجوع", "skip": "إغلاق", "start": "هيا نلعب", "again": "مرة أخرى", "tap": "انقر على مربع مضيء", "nope": "لا يوجد ما تحاصره هنا! لا يمكنك اللعب في مربعات ✕.", "s": [{"say": "مرحبًا، أنا السلحفاة <b>قلّوب</b>! هيا نتعرّف معًا على قواعد ريفيرسي هنا على اللوحة."}, {"say": "في اللوحة <b>64 مربعًا</b> (8×8). نبدأ بقطعتين سوداوين وقطعتين بيضاوين بشكل قطري في المنتصف، ويبدأ <b>الأسود</b> أولًا."}, {"say": "يمكنك اللعب فقط حيث <b>تحاصر قطعة واحدة على الأقل</b> من قطع خصمك. انقر على أحد المربعات الأربعة المضيئة!", "done": "أحسنت! انقلبت القطعة البيضاء المحاصَرة إلى الأسود."}, {"say": "مهما كان عدد القطع في الخط، إذا حاصرتها تنقلب <b>كلها</b>. جرّب المربع المضيء!", "done": "ثلاث دفعة واحدة — قلبة، قلبة، قلبة! ممتع، أليس كذلك؟"}, {"say": "أفقيًا أو عموديًا أو قطريًا — تنقلب <b>كل</b> الاتجاهات المحاصَرة في الوقت نفسه. ماذا سيحدث هنا؟", "done": "انقلبت عدة اتجاهات معًا. القطع غير المحاصَرة تبقى كما هي."}, {"say": "إذا لم تكن لديك قطعة في الطرف الآخر، أو كان بينهما <b>مربع فارغ</b>، فلا حصار ولا يمكنك اللعب هناك (✕). والقطع المقلوبة لا تسبب سلسلة."}, {"say": "إذا لم تكن لديك نقلة صحيحة فعليك أن <b>تمرّر</b>. هنا لا يستطيع الأبيض اللعب في أي مكان، لذا يلعب الأسود مرة أخرى."}, {"say": "<b>تنتهي</b> اللعبة عندما تمتلئ اللوحة أو لا يستطيع أحد اللعب. صاحب القطع الأكثر يفوز! وإذا تساوى العدد فهو تعادل."}, {"say": "نصيحة أخيرة: <b>الزوايا</b> (الذهبية) لا يمكن قلبها أبدًا. احذر مربعات <b>X</b> (الحمراء) و<b>C</b> (البرتقالية) بجوار زاوية فارغة، فهي غالبًا تمنحها لخصمك."}, {"say": "صرت تعرف كل القواعد! هيا نلعب مباراة. اسألني مرة أخرى في أي وقت."}]},
  };
  // board, marks and interactivity of each step
  const STEPS = [
    { cells: INIT },
    { cells: INIT, glow: ['d4', 'e4', 'd5', 'e5'] },
    { cells: INIT, play: 'any' },
    { cells: RL.flip, play: ['g4'] },
    { cells: RL.multi, play: ['d4'] },
    { cells: RL.no, xs: ['f2', 'c6', 'f6'], rings: true },
    { cells: RL.pass, tag: 'PASS' },
    { cells: RL.end, count: true },
    { cells: Array(64).fill(0), tips: true },
    { cells: INIT, last: true },
  ];

  /* ---------- little sounds: wooden "tok" when a disc lands, a click per flip, and a chirpy voice while the guide talks ---------- */
  const SFX = (() => {
    let on = true; try { on = localStorage.getItem('atlas-sfx') !== '0'; } catch (e) {}
    const ac = () => { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    let noiseBuf = null;
    const noise = C => { if (noiseBuf) return noiseBuf; const b = C.createBuffer(1, C.sampleRate * .08, C.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); return (noiseBuf = b); };
    function tok(vol = 1, pitch = 1) {   // disc on felt-on-wood: a filtered knock + a low body thump
      const C = on && ac(); if (!C) return; const t = C.currentTime;
      const n = C.createBufferSource(); n.buffer = noise(C); const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900 * pitch; bp.Q.value = 1.4;
      const g = C.createGain(); g.gain.setValueAtTime(.55 * vol, t); g.gain.exponentialRampToValueAtTime(.001, t + .07); n.connect(bp).connect(g).connect(C.destination); n.start(t);
      const o = C.createOscillator(), og = C.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(190 * pitch, t); o.frequency.exponentialRampToValueAtTime(90 * pitch, t + .09);
      og.gain.setValueAtTime(.35 * vol, t); og.gain.exponentialRampToValueAtTime(.001, t + .12); o.connect(og).connect(C.destination); o.start(t); o.stop(t + .14);
    }
    function blip() {   // one syllable of the guide's voice
      const C = on && ac(); if (!C) return; const t = C.currentTime, f = 560 + Math.random() * 260;
      const o = C.createOscillator(), g = C.createGain(), lp = C.createBiquadFilter(); o.type = 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (Math.random() < .5 ? 1.25 : .82), t + .05);
      lp.type = 'lowpass'; lp.frequency.value = 2400; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.07, t + .008); g.gain.exponentialRampToValueAtTime(.001, t + .06);
      o.connect(lp).connect(g).connect(C.destination); o.start(t); o.stop(t + .07);
    }
    return { tok, blip, get on() { return on; }, toggle() { on = !on; try { localStorage.setItem('atlas-sfx', on ? '1' : '0'); } catch (e) {} if (on) ac(); return on; } };
  })();
  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, L = TXT[ctx.lang] || TXT.en;
    const board = T3.MODELS.reversi(true); T3.show('reversi', board); T3.play(true);
    const S = board.userData.S, Y = board.userData.top, cs = S / 8;
    const W = T3.M({ color: 0xf3f0e6, roughness: .32, clearcoat: .6, clearcoatRoughness: .25 }), B = T3.M({ color: 0x111215, roughness: .3, clearcoat: .7, clearcoatRoughness: .2 });
    const P = q => [T3.cellPos(8, S, q & 7), T3.cellPos(8, S, q >> 3)];
    const marks = new TH.Group(); board.add(marks);
    let discs = {}, cells = [], step = 0, stopped = false, busy = false, played = false, timers = [], epoch = 0;
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const anim = (dur, f, done) => { const ep = epoch, t0 = performance.now(); (function s(n) { if (stopped || ep !== epoch) return; const k = Math.min(1, (n - t0) / dur); f(k); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };

    function makeDisc(q, color) {
      const g = new TH.Group(), top = T3.bevelDisc(.42, .1, W), bot = T3.bevelDisc(.42, .1, B);
      top.position.y = .1; g.add(bot, top); g.position.y = -.1;
      const inner = new TH.Group(); inner.add(g); const outer = new TH.Group(); outer.add(inner); const ao = T3.contact(.42); ao.position.y = -.098; outer.add(ao);
      const [x, z] = P(q); outer.position.set(x, Y + .1, z); inner.rotation.x = color === 1 ? Math.PI : 0; outer.userData.disc = 1;
      board.add(outer); return (discs[q] = { outer, inner, color });
    }
    function dropIn(d, delay, h, snd) { d.outer.visible = false; later(() => { d.outer.visible = true; anim(280, k => { d.outer.position.y = Y + .1 + (1 - k) * (1 - k) * h; }, () => { d.outer.position.y = Y + .1; if (snd) SFX.tok(1, 1); }); }, delay); }
    function drop(q, color, delay = 0, h = 2.2, snd = false) { dropIn(makeDisc(q, color), delay, h, snd); }
    function flip(q, color, delay) {
      const d = discs[q]; d.color = color; const from = d.inner.rotation.x, to = color === 1 ? Math.PI : 0;
      later(() => anim(420, k => { const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; d.inner.rotation.x = from + (to - from) * e; d.outer.position.y = Y + .1 + Math.sin(k * Math.PI) * .8; }, () => SFX.tok(.45, 1.35 + Math.random() * .15)), delay);
    }
    function clearMarks() { while (marks.children.length) marks.remove(marks.children[0]); }
    function tile(q, color, op = .5, h = .02) { const m = new TH.Mesh(new TH.BoxGeometry(cs * .92, h, cs * .92), new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false })); const [x, z] = P(q); m.position.set(x, Y + .012, z); marks.add(m); return m; }
    function ring(q) { const m = new TH.Mesh(new TH.CylinderGeometry(.17, .17, .02, 24), new TH.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: .8 })); const [x, z] = P(q); m.position.set(x, Y + .02, z); m.userData.pulse = true; marks.add(m); return m; }
    function cross(q) { const g = new TH.Group(), mat = new TH.MeshBasicMaterial({ color: 0xff4d4d }); [1, -1].forEach(s => { const b = new TH.Mesh(new TH.BoxGeometry(cs * .62, .03, .07), mat); b.rotation.y = s * Math.PI / 4; g.add(b); }); const [x, z] = P(q); g.position.set(x, Y + .03, z); marks.add(g); return g; }
    // pulse the glowing marks
    (function pulse() { if (stopped) return; const k = .5 + .5 * Math.sin(performance.now() / 260); marks.children.forEach(m => { if (m.userData.pulse) { m.scale.setScalar(.85 + k * .3); m.material.opacity = .45 + k * .45; } }); requestAnimationFrame(pulse); })();

    function setBoard(next) {   // diff against the discs already down: the same colour stays exactly as it is, the other colour
      // turns over, a disc on an emptied square lifts away and only new ones drop in → ms until the board has settled
      const old = discs, live = new Set(Object.values(old).map(d => d.outer));
      board.children.slice().forEach(o => { if (o.userData.disc && !live.has(o)) board.remove(o); });   // leftovers of an interrupted step
      discs = {}; cells = next.slice(); let nNew = 0, nFlip = 0, moved = 0, gone = 0;
      cells.forEach((c, q) => {
        const d = old[q]; delete old[q];
        if (!c) { if (d) { liftOut(d); gone++; } return; }
        if (!d) { drop(q, c, 40 + (nNew++) * 14, 1.2); return; }
        discs[q] = d; const o = d.outer, [x, z] = P(q);
        if (!o.visible) { d.color = c; d.inner.rotation.x = c === 1 ? Math.PI : 0; o.scale.set(1, 1, 1); o.position.set(x, Y + .1, z); dropIn(d, 40 + (nNew++) * 14, 1.2); return; }
        if (d.color !== c) { o.scale.set(1, 1, 1); flip(q, c, 40 + (nFlip++) * 40); return; }
        const to = c === 1 ? Math.PI : 0, y0 = o.position.y, r0 = d.inner.rotation.x, s0 = o.scale.x;
        if (Math.abs(y0 - Y - .1) + Math.abs(r0 - to) + Math.abs(s0 - 1) < 1e-3) return;   // untouched
        moved++; anim(200, k => { o.position.y = y0 + (Y + .1 - y0) * k; d.inner.rotation.x = r0 + (to - r0) * k; o.scale.setScalar(s0 + (1 - s0) * k); });
      });
      Object.values(old).forEach(d => { liftOut(d); gone++; });
      return Math.max(nNew ? 300 + nNew * 14 : 0, nFlip ? 480 + nFlip * 40 : 0, moved ? 220 : 0, gone ? 280 : 0);
    }
    function liftOut(d) { const o = d.outer, y0 = o.position.y; if (!o.visible) { board.remove(o); return; } anim(260, k => { o.position.y = y0 + k * .8; o.scale.setScalar(Math.max(.01, 1 - k)); }, () => board.remove(o)); }

    /* ---------- guide panel ---------- */
    const el = document.createElement('div'); el.className = 'rgd';
    el.innerHTML = `<div class="rgd-in"><div class="pic"><img src="${GUIDE}" alt=""></div><div class="bub"><div class="nm">${L.name}<span class="pg"></span></div><div class="tx"></div><div class="cnt"></div></div></div>
      <div class="rgd-act"><button type="button" class="btn ghost sm" data-a="back">◀ ${L.back}</button><button type="button" class="sfx" data-a="sfx" aria-label="Sound"></button><span class="dots"></span><button type="button" class="btn big" data-a="next">${L.next} ▶</button></div>`;
    ctx.panel.appendChild(el);
    const $ = s => el.querySelector(s);
    $('.dots').innerHTML = STEPS.map(() => '<i></i>').join('');
    let typeT = 0;
    function say(html) {   // typed speech, tap the bubble to finish
      const tx = $('.tx'); tx.innerHTML = html; clearInterval(typeT);
      const nodes = []; (function walk(n) { n.childNodes.forEach(c => { if (c.nodeType === 3) nodes.push([c, c.textContent]); else walk(c); }); })(tx);
      nodes.forEach(([n]) => { n.textContent = ''; });
      let ni = 0, ci = 0, said = 0;
      typeT = setInterval(() => { if (stopped) return clearInterval(typeT); for (let k = 0; k < 2; k++) { if (ni >= nodes.length) return clearInterval(typeT); const [n, s] = nodes[ni]; n.textContent = s.slice(0, ++ci); const ch = s[ci - 1]; if (ch && !/[\s、。！？!?,.：:（）()「」]/.test(ch) && (said++ % 3 === 0)) SFX.blip(); if (ci >= s.length) { ni++; ci = 0; } } }, 24);
      tx.onclick = () => { clearInterval(typeT); nodes.forEach(([n, s]) => { n.textContent = s; }); };
      const pic = $('.pic'); pic.classList.remove('talk'); void pic.offsetWidth; pic.classList.add('talk');
    }
    function buttons() {
      const st = STEPS[step], wait = st.play && !played;
      $('[data-a=back]').style.visibility = step ? '' : 'hidden';
      const nx = $('[data-a=next]');
      nx.textContent = st.last ? L.start + ' ▶' : wait ? L.tap : L.next + ' ▶';
      nx.disabled = wait; nx.classList.toggle('wait', wait);
      $('.dots').querySelectorAll('i').forEach((d, i) => d.className = i === step ? 'on' : i < step ? 'done' : '');
      $('.pg').textContent = `${step + 1} / ${STEPS.length}`;
      let ag = el.querySelector('[data-a=again]');
      if (st.last && !ag) { ag = document.createElement('button'); ag.type = 'button'; ag.className = 'btn ghost sm'; ag.dataset.a = 'again'; ag.textContent = '↻ ' + L.again; $('.rgd-act').insertBefore(ag, nx); ag.onclick = () => go(0); }
      if (!st.last && ag) ag.remove();
    }
    function go(n) {
      step = Math.max(0, Math.min(STEPS.length - 1, n)); played = false; busy = false;
      timers.forEach(clearTimeout); timers = []; epoch++;
      const st = STEPS[step]; clearMarks(); $('.cnt').innerHTML = '';
      const intro = setBoard(st.cells) + 60;
      later(() => {
        if (st.glow) st.glow.forEach(n => { const m = tile(sq(n), 0xffe27a, .5); m.userData.pulse = true; });
        if (st.play) (st.play === 'any' ? legal(cells, 1) : st.play.map(sq)).forEach(ring);
        if (st.rings) legal(cells, 1).forEach(ring);
        if (st.xs) st.xs.forEach(n => cross(sq(n)));
        if (st.tips) { ['a1', 'h1', 'a8', 'h8'].forEach(n => tile(sq(n), 0xffc928, .92)); ['b2', 'g2', 'b7', 'g7'].forEach(n => tile(sq(n), 0xff4040, .85)); ['b1', 'a2', 'g1', 'h2', 'a7', 'b8', 'h7', 'g8'].forEach(n => tile(sq(n), 0xff8a1e, .8)); }
        if (st.tag) $('.cnt').innerHTML = `<span class="tag">○ ${st.tag}</span>`;
        if (st.count) { const b = cells.filter(c => c === 1).length, w = cells.filter(c => c === 2).length; $('.cnt').innerHTML = `<span class="sc"><i class="dk b"></i><b data-n="${b}">0</b></span><span class="vs">:</span><span class="sc"><i class="dk w"></i><b data-n="${w}">0</b></span>`; $('.cnt').querySelectorAll('b').forEach(x => { const N = +x.dataset.n; anim(900, k => { x.textContent = Math.round(N * (1 - Math.pow(1 - k, 3))); }); }); }
      }, intro);
      say(L.s[step].say); buttons();
    }
    function onClick(e) {
      if (busy || T3.wasDrag() || e.target.closest('.rgd')) return;
      const st = STEPS[step]; const p = T3.pick(e, Y); if (!p) return;
      const c = Math.floor((p.x + S / 2) / cs), r = Math.floor((p.z + S / 2) / cs); if (c < 0 || c > 7 || r < 0 || r > 7) return;
      const q = r * 8 + c;
      if (st.xs && st.xs.map(sq).includes(q)) { say(L.nope); return; }
      if (!(st.play || st.rings) || played) return;
      const ok = st.play && st.play !== 'any' ? st.play.map(sq) : legal(cells, 1);
      if (!ok.includes(q)) return;
      const fl = flipsOf(cells, q, 1); busy = true; played = true; clearMarks();
      cells[q] = 1; fl.forEach(s => { cells[s] = 1; });
      drop(q, 1, 0, 2.2, true);
      fl.sort((a, b) => Math.hypot((a & 7) - c, (a >> 3) - r) - Math.hypot((b & 7) - c, (b >> 3) - r)).forEach((s, i) => flip(s, 1, 240 + i * 90));
      later(() => { busy = false; if (L.s[step].done) say(L.s[step].done); buttons(); if (!st.play) played = false; }, 400 + fl.length * 90 + 400);
    }
    $('[data-a=next]').onclick = () => { if (STEPS[step].last) ctx.onStart(); else go(step + 1); };
    $('[data-a=back]').onclick = () => { if (STEPS[step].last && ctx.onExit) ctx.onExit(); else go(step - 1); };
    const sfxBtn = $('[data-a=sfx]'), paintSfx = () => { sfxBtn.classList.toggle('off', !SFX.on); sfxBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/>${SFX.on ? '<path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>' : '<path d="M16 9l6 6M22 9l-6 6"/>'}</svg>`; };
    sfxBtn.onclick = () => { SFX.toggle(); paintSfx(); }; paintSfx();
    ctx.el.addEventListener('click', onClick);
    // keyboard: Space / → next, ← back (the next button's rules apply: an interactive step waits for the move)
    const onKey = e => {
      if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
      if (document.activeElement && document.activeElement !== document.body && (e.key === 'Enter' || e.key === ' ')) document.activeElement.blur();   // Enter/Space must not re-press a focused button (e.g. the Rules button → restart)
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.stopPropagation(); e.preventDefault(); const nx = $('[data-a=next]'); if (nx.disabled || (e.key === 'ArrowRight' && STEPS[step].last)) return; nx.click(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); if (step) go(step - 1); }
    };
    document.addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => el.classList.add('on'));
    later(() => go(0), 350);
    return {
      stop() { stopped = true; clearInterval(typeT); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey, true); el.remove(); },
      panel: el,
    };
  }

  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.reversi = { start };
})();
