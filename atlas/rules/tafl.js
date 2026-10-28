/* =====================================================================
   Hnefatafl rules — a guided tour on the 3D table, told by the guide
   character (Taflin, a puffin in a horned helmet). Built from the full
   game's illustrated rules (tafl/app.js TOUR_PAGES: shared/ruletour.js),
   turned into a short hands-on scenario on the Copenhagen 11 × 11 board.
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart(), onExit() }
   Squares are given in the game's notation ('e4': files a–k from the left, rank 1 at the bottom).
   Every scenario was checked against tafl/engine.js (legal move, captures, the result).
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/g-puffin.webp', N = 11;
  const at = s => [s.charCodeAt(0) - 97, N - (+s.slice(1))];   // 'e4' → [column 0..10 left→right, row 0 = top (rank 11)]
  const nm = (c, r) => String.fromCharCode(97 + c) + (N - r);
  const START = '...aaaaa........a................a....d....aa...ddd...aaa.ddkdd.aaa...ddd...aa....d....a................a........aaaaa...';
  const INIT = [...START].map((ch, i) => ch === '.' ? null : [ch, nm(i % N, i / N | 0)]).filter(Boolean);
  const CORNERS = ['a1', 'k1', 'a11', 'k11'];
  // rook-like moves of the piece on s (stops before any piece; only the king may stop on a corner or the throne)
  function rays(pos, s) {
    const occ = new Set(pos.map(p => p[1])), king = pos.find(p => p[1] === s)[0] === 'k', out = [];
    const [c0, r0] = at(s);
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dc, dr]) => {
      for (let c = c0 + dc, r = r0 + dr; c >= 0 && c < N && r >= 0 && r < N; c += dc, r += dr) {
        const q = nm(c, r); if (occ.has(q)) break;
        if (!king && (CORNERS.includes(q) || q === 'f6')) continue;
        out.push(q);
      }
    });
    return out;
  }

  const TXT = {
    ja: {"name": "タフリン", "next": "つぎへ", "back": "もどる", "start": "指してみる", "again": "もういちど", "tap": "光っているマスをタップ", "nope": "そこへは動けないよ〜", "cap": "王さまをつかまえた！", "esc": "脱出成功！", "fort": "とりでの完成！", "s": [{"say": "やあ、ぼくは<b>タフリン</b>！ ヴァイキングが遊んだ盤上遊戯<b>ネファタフル</b>のルールを、この樫の盤でいっしょにたしかめよう。"}, {"say": "盤は11×11。こい色の<b>攻め手24枚</b>が四方を囲み、白い<b>守り手12枚</b>が真ん中の<b>王さま</b>（光っている駒）を守る。<b>攻め手が先手</b>で、1手ずつ交互に指すよ。"}, {"say": "守り手は<b>王さまを四すみのどれかに逃がせば勝ち</b>！ 攻め手は<b>王さまをつかまえれば勝ち</b>。光っている四すみが王さまのゴールだよ。"}, {"say": "駒はみんな<b>チェスのルークのように</b>、タテ・ヨコに何マスでも進める。駒は飛び越えられないし、<b>すみと真ん中の玉座には王さましか止まれない</b>んだ。守り手を動かしてみて！", "done": "スーッ！ 相手の駒の手前でちゃんと止まったね。"}, {"say": "相手の駒を<b>タテかヨコで2枚ではさむ</b>と取れる。取れるのは<b>動いた側だけ</b>だよ。攻め手で守り手をはさんでみて！", "done": "はさんで取った！ 動いてはさまれに行った駒は取られないんだ。"}, {"say": "<b>すみ</b>と<b>空いた玉座</b>は「敵」のかわりになる。すみのとなりの駒は、反対側に1枚置くだけで取れるよ。攻め手で取ってみて！", "done": "すみを使って取ったね！"}, {"say": "王さまが盤のはしにいて、すみまでの道が空いていたら一気に逃げられる。王さまをすみへ！", "done": "王さま、脱出〜！ 守り手の勝ちだよ。"}, {"say": "王さまは<b>4方向をぜんぶ囲まれる</b>とつかまる（玉座のとなりでは3方向と玉座）。はしにいる王さまはつかまらないよ。最後の1枚を置いて！", "done": "かこんだ！ 攻め手の勝ち。王さまも武器を持っていて、はさむのを手伝えるよ。"}, {"say": "はしに並んだ守り手の列は、両端をふさいで、前にぜんぶ敵がいると<b>まとめて取れる</b>（<b>シールドウォール</b>）。すみも端のふたになる。列のふたをして！", "done": "シールドウォール！ 3枚まとめて取ったね。"}, {"say": "王さまがはしにいて動ける状態で、<b>絶対にくずせない守り手のとりで</b>に入ったら、守り手の勝ち（<b>エッジフォート</b>）。最後の1枚でとりでを閉じて！", "done": "くずせないとりでの完成！ 守り手の勝ちだよ。"}, {"say": "コツ：王さまに<b>逃げ道が2本</b>できると、攻め手は1手で1本しかふさげない（<b>トゥイチ</b>）。王さまをはしへ動かして、両方のすみをねらおう！", "done": "逃げ道が2本！ 次の手でどちらかのすみへ逃げられる。"}, {"say": "ほかに、攻め手が<b>守り手をぜんぶ囲いこむ</b>と攻め手の勝ち、同じ局面が3回出ると守り手の負け、動ける手がない側も負けだよ。攻め手はまず四すみの前を固めて、守り手は早めに道をひらくのがコツ。さあ、指してみよう！"}]},
    en: {"name": "Taflin", "next": "Next", "back": "Back", "start": "Let's play", "again": "Again", "tap": "Tap a glowing square", "nope": "It can't go there!", "cap": "The king is captured!", "esc": "Escaped!", "fort": "Fort complete!", "s": [{"say": "Hi, I'm <b>Taflin</b>! Let's go through the rules of <b>Hnefatafl</b>, the Vikings' board game, together on this oak board."}, {"say": "The board is 11×11. The <b>24 dark attackers</b> surround the board, and the <b>12 light defenders</b> guard the <b>king</b> in the middle (the glowing piece). <b>The attackers move first</b>, then you take turns."}, {"say": "The defenders win by <b>bringing the king to any corner</b>! The attackers win by <b>capturing the king</b>. The four glowing corners are the king's goal."}, {"say": "Every piece moves <b>like a chess rook</b>: any distance straight along a row or column. No jumping, and <b>only the king may stop on a corner or the central throne</b>. Move the defender!", "done": "Whoosh! It stopped right before the enemy piece."}, {"say": "<b>Sandwich</b> an enemy piece <b>between two of yours</b> in a row or column to capture it. Only <b>the side that moves</b> captures. Sandwich the defender with an attacker!", "done": "Captured! A piece that moves between two enemies is safe, though."}, {"say": "The <b>corners</b> and the <b>empty throne</b> act as enemies. A piece next to a corner falls to just one piece on its other side. Capture it with the attacker!", "done": "You used the corner!"}, {"say": "When the king stands on the edge and the way to a corner is clear, it escapes in one move. Take the king to the corner!", "done": "The king escaped! The defenders win."}, {"say": "The king is captured when attackers <b>surround it on all four sides</b> (next to the throne: three sides and the throne). A king on the edge can't be captured. Place the last attacker!", "done": "Surrounded! The attackers win. The king is armed, too: it helps sandwich attackers."}, {"say": "A row of defenders on the edge is captured <b>all at once</b> when both ends are closed and an enemy stands in front of each (<b>shieldwall</b>). A corner can close an end. Close the row!", "done": "Shieldwall! Three taken in one move."}, {"say": "If the king is on the edge, can move, and sits in a <b>fort of defenders that can never be broken</b>, the defenders win (<b>edge fort</b>). Close the fort with the last defender!", "done": "An unbreakable fort! The defenders win."}, {"say": "Tip: when the king has <b>two open roads</b> at once, the attackers can block only one per move (<b>tuichi</b>). Move the king to the edge and aim at both corners!", "done": "Two roads! Next move the king reaches a corner."}, {"say": "Also: the attackers win if they <b>enclose every defender</b>; a position repeated three times loses for the defenders; a side with no legal move loses. Attackers: guard the corners first. Defenders: open roads early. Let's play!"}]},
    zh: {"name": "塔芙林", "next": "下一步", "back": "返回", "start": "开始下棋", "again": "再来一次", "tap": "点击发光的格子", "nope": "那里走不了哦！", "cap": "国王被擒！", "esc": "逃脱成功！", "fort": "要塞完成！", "s": [{"say": "你好，我是<b>塔芙林</b>！一起在这张橡木棋盘上看看维京人的棋类游戏<b>维京棋（Hnefatafl）</b>的规则吧。"}, {"say": "棋盘是11×11。深色的<b>24枚攻方</b>包围四周，浅色的<b>12枚守方</b>守护中央的<b>国王</b>（发光的棋子）。<b>攻方先走</b>，然后轮流各走一步。"}, {"say": "守方只要<b>把国王送到任意一个角</b>就赢！攻方<b>擒住国王</b>就赢。发光的四个角就是国王的目标。"}, {"say": "所有棋子都<b>像国际象棋的车</b>一样，横竖走任意格，不能越过棋子，而且<b>只有国王能停在角上和中央的王座</b>。走一步守方吧！", "done": "嗖！正好停在对方棋子前面。"}, {"say": "在横线或竖线上用<b>两枚棋子夹住</b>对方的棋子就能吃掉它。只有<b>走棋的一方</b>能吃子。用攻方夹住守方吧！", "done": "吃掉了！不过自己走进两枚敌子之间是安全的。"}, {"say": "<b>角</b>和<b>空的王座</b>可以当作敌子。角旁边的棋子，只要在另一侧放一枚就能吃掉。用攻方吃掉它！", "done": "利用角吃子成功！"}, {"say": "国王在边上、通往角的路畅通时，一步就能逃脱。把国王走到角上！", "done": "国王逃脱了！守方获胜。"}, {"say": "攻方<b>从四面包围</b>国王就能擒住它（在王座旁边：三面加王座）。在边上的国王不会被擒。放下最后一枚攻方！", "done": "包围成功！攻方获胜。国王也能参与夹吃攻方。"}, {"say": "边上排成一列的守方，两端被堵住且每枚前面都有敌子时，会<b>一起被吃掉</b>（<b>盾墙</b>）。角也能堵住一端。封住这一列吧！", "done": "盾墙！一步吃掉三枚。"}, {"say": "国王在边上、还能移动，并处在<b>永远无法攻破的守方要塞</b>中，守方获胜（<b>边缘要塞</b>）。用最后一枚守方封闭要塞！", "done": "坚不可摧的要塞！守方获胜。"}, {"say": "诀窍：国王同时有<b>两条逃路</b>时，攻方一步只能堵一条（<b>tuichi</b>）。把国王走到边上，同时瞄准两个角！", "done": "两条逃路！下一步国王就能到达角落。"}, {"say": "另外：攻方<b>包围全部守方</b>也能获胜；同一局面出现三次判守方负；无棋可走的一方判负。攻方先守住四角，守方尽早打开道路。开始下棋吧！"}]},
    ko: {"name": "타플린", "next": "다음", "back": "이전", "start": "두어 보기", "again": "다시", "tap": "빛나는 칸을 탭하세요", "nope": "거기로는 갈 수 없어!", "cap": "왕을 잡았다!", "esc": "탈출 성공!", "fort": "요새 완성!", "s": [{"say": "안녕, 나는 <b>타플린</b>! 바이킹의 보드게임 <b>흐네파타플</b> 규칙을 이 참나무 판에서 함께 알아보자."}, {"say": "판은 11×11이야. 어두운 <b>공격 측 24개</b>가 사방을 둘러싸고, 밝은 <b>수비 측 12개</b>가 가운데의 <b>왕</b>(빛나는 말)을 지켜. <b>공격 측이 먼저</b> 두고 한 수씩 번갈아 둬."}, {"say": "수비 측은 <b>왕을 네 구석 중 하나로 보내면 승리</b>! 공격 측은 <b>왕을 잡으면 승리</b>야. 빛나는 네 구석이 왕의 목표야."}, {"say": "모든 말은 <b>체스의 룩처럼</b> 가로·세로로 몇 칸이든 가. 뛰어넘을 수 없고, <b>구석과 가운데 왕좌에는 왕만 멈출 수 있어</b>. 수비 말을 움직여 봐!", "done": "슝! 상대 말 앞에서 딱 멈췄네."}, {"say": "가로나 세로로 상대 말을 <b>내 말 두 개 사이에 끼우면</b> 잡을 수 있어. 잡는 건 <b>움직인 쪽만</b>이야. 공격 말로 수비 말을 끼워 봐!", "done": "잡았다! 스스로 두 적 사이로 들어간 말은 안전해."}, {"say": "<b>구석</b>과 <b>비어 있는 왕좌</b>는 적 역할을 해. 구석 옆의 말은 반대편에 하나만 놓으면 잡혀. 공격 말로 잡아 봐!", "done": "구석을 이용했네!"}, {"say": "왕이 가장자리에 있고 구석까지 길이 비어 있으면 한 번에 탈출해. 왕을 구석으로!", "done": "왕 탈출! 수비 측 승리야."}, {"say": "왕은 공격 말에 <b>네 방향을 모두 둘러싸이면</b> 잡혀(왕좌 옆에서는 세 방향과 왕좌). 가장자리의 왕은 잡히지 않아. 마지막 말을 놓아 봐!", "done": "포위했다! 공격 측 승리. 왕도 무기를 들고 끼우기를 도와."}, {"say": "가장자리에 늘어선 수비 말 줄은 양 끝이 막히고 앞마다 적이 있으면 <b>한꺼번에 잡혀</b>(<b>실드월</b>). 구석도 끝을 막을 수 있어. 줄의 끝을 막아 봐!", "done": "실드월! 한 번에 세 개를 잡았어."}, {"say": "왕이 가장자리에서 움직일 수 있고 <b>절대 깨지지 않는 수비 요새</b> 안에 있으면 수비 측 승리(<b>엣지 포트</b>). 마지막 말로 요새를 닫아 봐!", "done": "깨지지 않는 요새! 수비 측 승리야."}, {"say": "요령: 왕에게 <b>탈출로가 두 개</b> 생기면 공격 측은 한 수에 하나만 막을 수 있어(<b>투이치</b>). 왕을 가장자리로 옮겨 두 구석을 노려 봐!", "done": "탈출로 두 개! 다음 수에 구석으로 갈 수 있어."}, {"say": "그 밖에: 공격 측이 <b>수비 말을 모두 포위</b>하면 공격 측 승리, 같은 국면이 세 번 나오면 수비 측 패배, 둘 수가 없는 쪽도 패배야. 공격 측은 먼저 구석을 지키고, 수비 측은 일찍 길을 열자. 자, 둬 보자!"}]},
    es: {"name": "Taflín", "next": "Siguiente", "back": "Atrás", "start": "A jugar", "again": "Otra vez", "tap": "Toca una casilla brillante", "nope": "¡No puede ir ahí!", "cap": "¡Rey capturado!", "esc": "¡Escapó!", "fort": "¡Fuerte completo!", "s": [{"say": "¡Hola, soy <b>Taflín</b>! Repasemos juntos las reglas del <b>Hnefatafl</b>, el juego de los vikingos, en este tablero de roble."}, {"say": "El tablero es de 11×11. Los <b>24 atacantes oscuros</b> rodean el tablero y los <b>12 defensores claros</b> protegen al <b>rey</b> del centro (la pieza que brilla). <b>Empiezan los atacantes</b> y se juega por turnos."}, {"say": "Los defensores ganan si <b>llevan al rey a cualquier esquina</b>. Los atacantes ganan si <b>capturan al rey</b>. Las cuatro esquinas brillantes son la meta del rey."}, {"say": "Todas las piezas se mueven <b>como la torre del ajedrez</b>: en línea recta las casillas que quieran. No saltan, y <b>solo el rey puede detenerse en una esquina o en el trono central</b>. ¡Mueve al defensor!", "done": "¡Zas! Se paró justo antes de la pieza rival."}, {"say": "<b>Encierra</b> una pieza rival <b>entre dos tuyas</b> en fila o columna para capturarla. Solo captura <b>el bando que mueve</b>. ¡Encierra al defensor con un atacante!", "done": "¡Capturada! Pero una pieza que entra sola entre dos rivales está a salvo."}, {"say": "Las <b>esquinas</b> y el <b>trono vacío</b> hacen de enemigo. Una pieza junto a una esquina cae con una sola pieza al otro lado. ¡Captúrala con el atacante!", "done": "¡Usaste la esquina!"}, {"say": "Si el rey está en el borde y el camino a una esquina está libre, escapa de un solo movimiento. ¡Lleva al rey a la esquina!", "done": "¡El rey escapó! Ganan los defensores."}, {"say": "El rey es capturado cuando los atacantes lo <b>rodean por los cuatro lados</b> (junto al trono: tres lados y el trono). Un rey en el borde no puede ser capturado. ¡Pon el último atacante!", "done": "¡Rodeado! Ganan los atacantes. El rey también está armado: ayuda a encerrar atacantes."}, {"say": "Una fila de defensores en el borde se captura <b>entera</b> si ambos extremos están cerrados y hay un enemigo delante de cada una (<b>muro de escudos</b>). Una esquina puede cerrar un extremo. ¡Cierra la fila!", "done": "¡Muro de escudos! Tres de golpe."}, {"say": "Si el rey está en el borde, puede moverse y está en un <b>fuerte de defensores que nunca puede romperse</b>, ganan los defensores (<b>fuerte de borde</b>). ¡Cierra el fuerte con el último defensor!", "done": "¡Un fuerte inquebrantable! Ganan los defensores."}, {"say": "Consejo: si el rey tiene <b>dos caminos abiertos</b> a la vez, los atacantes solo pueden cerrar uno por turno (<b>tuichi</b>). ¡Lleva al rey al borde y apunta a las dos esquinas!", "done": "¡Dos caminos! En la próxima jugada el rey llega a una esquina."}, {"say": "Además: los atacantes ganan si <b>encierran a todos los defensores</b>; repetir tres veces una posición hace perder a los defensores; quien no puede mover pierde. Atacantes: guardad las esquinas. Defensores: abrid caminos pronto. ¡A jugar!"}]},
    fr: {"name": "Taflin", "next": "Suivant", "back": "Retour", "start": "Jouer", "again": "Encore", "tap": "Touche une case lumineuse", "nope": "Elle ne peut pas aller là !", "cap": "Le roi est pris !", "esc": "Évadé !", "fort": "Fort terminé !", "s": [{"say": "Salut, je suis <b>Taflin</b> ! Découvrons ensemble les règles du <b>Hnefatafl</b>, le jeu des Vikings, sur ce plateau de chêne."}, {"say": "Le plateau fait 11×11. Les <b>24 attaquants sombres</b> encerclent le plateau, les <b>12 défenseurs clairs</b> protègent le <b>roi</b> au centre (la pièce lumineuse). <b>Les attaquants commencent</b>, puis on joue chacun son tour."}, {"say": "Les défenseurs gagnent en <b>menant le roi dans un coin</b> ! Les attaquants gagnent en <b>capturant le roi</b>. Les quatre coins lumineux sont le but du roi."}, {"say": "Toutes les pièces se déplacent <b>comme la tour aux échecs</b> : en ligne droite, aussi loin qu'elles veulent. Pas de saut, et <b>seul le roi peut s'arrêter sur un coin ou sur le trône central</b>. Déplace le défenseur !", "done": "Zoum ! Il s'arrête juste devant la pièce adverse."}, {"say": "<b>Prends en tenaille</b> une pièce adverse <b>entre deux des tiennes</b> sur une ligne ou une colonne pour la capturer. Seul <b>le camp qui joue</b> capture. Prends le défenseur en tenaille avec un attaquant !", "done": "Capturé ! Une pièce qui se place elle-même entre deux ennemis reste sauve."}, {"say": "Les <b>coins</b> et le <b>trône vide</b> comptent comme des ennemis. Une pièce à côté d'un coin tombe avec une seule pièce de l'autre côté. Capture-la avec l'attaquant !", "done": "Tu as utilisé le coin !"}, {"say": "Quand le roi est sur le bord et que la route vers un coin est libre, il s'évade d'un seul coup. Mène le roi au coin !", "done": "Le roi s'est évadé ! Les défenseurs gagnent."}, {"say": "Le roi est capturé quand les attaquants l'<b>entourent sur ses quatre côtés</b> (à côté du trône : trois côtés et le trône). Un roi sur le bord ne peut pas être pris. Pose le dernier attaquant !", "done": "Encerclé ! Les attaquants gagnent. Le roi est armé aussi : il aide à prendre des attaquants."}, {"say": "Une rangée de défenseurs sur le bord est prise <b>d'un seul coup</b> si ses deux bouts sont fermés et qu'un ennemi se tient devant chacune (<b>mur de boucliers</b>). Un coin peut fermer un bout. Ferme la rangée !", "done": "Mur de boucliers ! Trois prises d'un coup."}, {"say": "Si le roi est sur le bord, peut bouger et se trouve dans un <b>fort de défenseurs impossible à briser</b>, les défenseurs gagnent (<b>fort de bord</b>). Ferme le fort avec le dernier défenseur !", "done": "Un fort imprenable ! Les défenseurs gagnent."}, {"say": "Astuce : quand le roi a <b>deux routes ouvertes</b> à la fois, les attaquants ne peuvent en fermer qu'une par coup (<b>tuichi</b>). Mène le roi au bord et vise les deux coins !", "done": "Deux routes ! Au prochain coup, le roi atteint un coin."}, {"say": "Aussi : les attaquants gagnent s'ils <b>encerclent tous les défenseurs</b> ; une position répétée trois fois fait perdre les défenseurs ; un camp sans coup légal perd. Attaquants : gardez les coins. Défenseurs : ouvrez des routes tôt. À toi de jouer !"}]},
    pt: {"name": "Taflin", "next": "Próximo", "back": "Voltar", "start": "Jogar", "again": "De novo", "tap": "Toque numa casa brilhante", "nope": "Não pode ir para lá!", "cap": "O rei foi capturado!", "esc": "Fugiu!", "fort": "Forte completo!", "s": [{"say": "Oi, eu sou o <b>Taflin</b>! Vamos ver juntos as regras do <b>Hnefatafl</b>, o jogo dos vikings, neste tabuleiro de carvalho."}, {"say": "O tabuleiro é 11×11. Os <b>24 atacantes escuros</b> cercam o tabuleiro e os <b>12 defensores claros</b> protegem o <b>rei</b> no centro (a peça que brilha). <b>Os atacantes começam</b> e depois cada um joga na sua vez."}, {"say": "Os defensores vencem <b>levando o rei a qualquer canto</b>! Os atacantes vencem <b>capturando o rei</b>. Os quatro cantos brilhantes são o objetivo do rei."}, {"say": "Todas as peças andam <b>como a torre do xadrez</b>: em linha reta, quantas casas quiserem. Não pulam, e <b>só o rei pode parar num canto ou no trono central</b>. Mova o defensor!", "done": "Zum! Parou bem antes da peça adversária."}, {"say": "<b>Prenda</b> uma peça adversária <b>entre duas suas</b> numa fileira ou coluna para capturá-la. Só captura <b>o lado que joga</b>. Prenda o defensor com um atacante!", "done": "Capturada! Mas uma peça que entra sozinha entre dois inimigos fica a salvo."}, {"say": "Os <b>cantos</b> e o <b>trono vazio</b> fazem papel de inimigo. Uma peça ao lado de um canto cai com uma só peça do outro lado. Capture-a com o atacante!", "done": "Você usou o canto!"}, {"say": "Quando o rei está na borda e o caminho até um canto está livre, ele foge num lance. Leve o rei ao canto!", "done": "O rei fugiu! Os defensores vencem."}, {"say": "O rei é capturado quando os atacantes o <b>cercam pelos quatro lados</b> (ao lado do trono: três lados e o trono). Um rei na borda não pode ser capturado. Coloque o último atacante!", "done": "Cercado! Os atacantes vencem. O rei também é armado: ajuda a prender atacantes."}, {"say": "Uma fileira de defensores na borda é capturada <b>de uma vez</b> quando as duas pontas estão fechadas e há um inimigo à frente de cada uma (<b>parede de escudos</b>). Um canto pode fechar uma ponta. Feche a fileira!", "done": "Parede de escudos! Três de uma vez."}, {"say": "Se o rei está na borda, pode se mover e está num <b>forte de defensores que nunca pode ser rompido</b>, os defensores vencem (<b>forte de borda</b>). Feche o forte com o último defensor!", "done": "Um forte inquebrável! Os defensores vencem."}, {"say": "Dica: quando o rei tem <b>dois caminhos abertos</b> ao mesmo tempo, os atacantes só fecham um por lance (<b>tuichi</b>). Leve o rei à borda e mire nos dois cantos!", "done": "Dois caminhos! No próximo lance o rei chega a um canto."}, {"say": "Também: os atacantes vencem se <b>cercarem todos os defensores</b>; uma posição repetida três vezes faz os defensores perderem; quem não pode mover perde. Atacantes: guardem os cantos. Defensores: abram caminhos cedo. Vamos jogar!"}]},
    de: {"name": "Taflin", "next": "Weiter", "back": "Zurück", "start": "Spielen", "again": "Nochmal", "tap": "Tippe auf ein leuchtendes Feld", "nope": "Dorthin geht es nicht!", "cap": "Der König ist gefangen!", "esc": "Entkommen!", "fort": "Festung fertig!", "s": [{"say": "Hallo, ich bin <b>Taflin</b>! Lass uns die Regeln von <b>Hnefatafl</b>, dem Brettspiel der Wikinger, zusammen auf diesem Eichenbrett anschauen."}, {"say": "Das Brett hat 11×11 Felder. Die <b>24 dunklen Angreifer</b> umringen das Brett, die <b>12 hellen Verteidiger</b> schützen den <b>König</b> in der Mitte (die leuchtende Figur). <b>Die Angreifer beginnen</b>, dann zieht man abwechselnd."}, {"say": "Die Verteidiger gewinnen, wenn sie <b>den König in eine Ecke bringen</b>! Die Angreifer gewinnen, wenn sie <b>den König fangen</b>. Die vier leuchtenden Ecken sind das Ziel des Königs."}, {"say": "Alle Steine ziehen <b>wie der Turm im Schach</b>: beliebig weit gerade. Springen geht nicht, und <b>nur der König darf auf einer Ecke oder dem Thron in der Mitte stehen</b>. Zieh den Verteidiger!", "done": "Zisch! Er hält direkt vor dem gegnerischen Stein."}, {"say": "<b>Klemm</b> einen gegnerischen Stein in Reihe oder Spalte <b>zwischen zwei eigene</b>, dann ist er geschlagen. Nur <b>die ziehende Seite</b> schlägt. Klemm den Verteidiger mit einem Angreifer ein!", "done": "Geschlagen! Wer selbst zwischen zwei Feinde zieht, bleibt aber sicher."}, {"say": "Die <b>Ecken</b> und der <b>leere Thron</b> wirken als Feind. Ein Stein neben einer Ecke fällt schon durch einen Stein auf der anderen Seite. Schlag ihn mit dem Angreifer!", "done": "Du hast die Ecke genutzt!"}, {"say": "Steht der König am Rand und ist der Weg zu einer Ecke frei, entkommt er in einem Zug. Bring den König in die Ecke!", "done": "Der König ist entkommen! Die Verteidiger gewinnen."}, {"say": "Der König ist gefangen, wenn Angreifer ihn <b>von allen vier Seiten</b> umgeben (neben dem Thron: drei Seiten und der Thron). Ein König am Rand kann nicht gefangen werden. Setz den letzten Angreifer!", "done": "Umzingelt! Die Angreifer gewinnen. Der König ist bewaffnet: Er hilft beim Einklemmen."}, {"say": "Eine Reihe von Verteidigern am Rand wird <b>auf einmal</b> geschlagen, wenn beide Enden zu sind und vor jedem ein Feind steht (<b>Schildwall</b>). Eine Ecke kann ein Ende schließen. Schließ die Reihe!", "done": "Schildwall! Drei auf einen Streich."}, {"say": "Steht der König am Rand, kann ziehen und sitzt in einer <b>Festung aus Verteidigern, die nie zu brechen ist</b>, gewinnen die Verteidiger (<b>Randfestung</b>). Schließ die Festung mit dem letzten Verteidiger!", "done": "Eine unzerstörbare Festung! Die Verteidiger gewinnen."}, {"say": "Tipp: Hat der König <b>zwei offene Wege</b> zugleich, können die Angreifer pro Zug nur einen sperren (<b>Tuichi</b>). Zieh den König an den Rand und ziele auf beide Ecken!", "done": "Zwei Wege! Im nächsten Zug erreicht der König eine Ecke."}, {"say": "Außerdem: Die Angreifer gewinnen, wenn sie <b>alle Verteidiger einschließen</b>; dreimal dieselbe Stellung verlieren die Verteidiger; wer nicht ziehen kann, verliert. Angreifer: zuerst die Ecken bewachen. Verteidiger: früh Wege öffnen. Los geht's!"}]},
    hi: {"name": "टैफ़लिन", "next": "आगे", "back": "पीछे", "start": "खेलें", "again": "फिर से", "tap": "चमकते खाने पर टैप करें", "nope": "वहाँ नहीं जा सकता!", "cap": "राजा पकड़ा गया!", "esc": "बच निकला!", "fort": "क़िला पूरा!", "s": [{"say": "नमस्ते, मैं <b>टैफ़लिन</b> हूँ! आओ इस ओक के बोर्ड पर मिलकर वाइकिंग्स के खेल <b>ह्नेफ़ाटाफ़ल</b> के नियम देखें।"}, {"say": "बोर्ड 11×11 है। गहरे रंग के <b>24 आक्रमणकारी</b> चारों ओर से घेरते हैं, और हल्के रंग के <b>12 रक्षक</b> बीच के <b>राजा</b> (चमकती गोटी) की रक्षा करते हैं। <b>आक्रमणकारी पहले चलते हैं</b>, फिर बारी-बारी से।"}, {"say": "रक्षक <b>राजा को किसी भी कोने तक पहुँचाकर</b> जीतते हैं! आक्रमणकारी <b>राजा को पकड़कर</b> जीतते हैं। चमकते चार कोने राजा का लक्ष्य हैं।"}, {"say": "हर गोटी <b>शतरंज के हाथी की तरह</b> सीधी रेखा में कितने भी खाने चलती है। कूद नहीं सकती, और <b>कोनों व बीच के सिंहासन पर सिर्फ़ राजा रुक सकता है</b>। रक्षक को चलाइए!", "done": "सर्र! विरोधी गोटी के ठीक पहले रुक गई।"}, {"say": "पंक्ति या स्तंभ में विरोधी गोटी को <b>अपनी दो गोटियों के बीच फँसाएँ</b>, तो वह पकड़ी जाती है। सिर्फ़ <b>चाल चलने वाला पक्ष</b> पकड़ता है। आक्रमणकारी से रक्षक को फँसाइए!", "done": "पकड़ ली! पर ख़ुद दो दुश्मनों के बीच जाने वाली गोटी सुरक्षित रहती है।"}, {"say": "<b>कोने</b> और <b>खाली सिंहासन</b> दुश्मन का काम करते हैं। कोने के बगल की गोटी दूसरी ओर एक ही गोटी से गिर जाती है। आक्रमणकारी से पकड़िए!", "done": "आपने कोने का इस्तेमाल किया!"}, {"say": "राजा किनारे पर हो और कोने तक का रास्ता खाली हो, तो वह एक चाल में बच निकलता है। राजा को कोने तक ले जाइए!", "done": "राजा बच निकला! रक्षक जीते।"}, {"say": "आक्रमणकारी राजा को <b>चारों ओर से घेर लें</b> तो वह पकड़ा जाता है (सिंहासन के बगल में: तीन ओर और सिंहासन)। किनारे का राजा पकड़ा नहीं जा सकता। आख़िरी आक्रमणकारी रखिए!", "done": "घेर लिया! आक्रमणकारी जीते। राजा भी हथियारबंद है: वह फँसाने में मदद करता है।"}, {"say": "किनारे पर कतार में खड़े रक्षक <b>एक साथ</b> पकड़े जाते हैं, जब दोनों सिरे बंद हों और हर एक के सामने दुश्मन हो (<b>ढाल-दीवार</b>)। कोना भी एक सिरा बंद कर सकता है। कतार बंद कीजिए!", "done": "ढाल-दीवार! एक चाल में तीन।"}, {"say": "राजा किनारे पर हो, चल सके और <b>रक्षकों के ऐसे क़िले में हो जो कभी न टूटे</b>, तो रक्षक जीतते हैं (<b>किनारे का क़िला</b>)। आख़िरी रक्षक से क़िला बंद कीजिए!", "done": "अटूट क़िला! रक्षक जीते।"}, {"say": "सुझाव: राजा के पास एक साथ <b>दो खुले रास्ते</b> हों, तो आक्रमणकारी एक चाल में एक ही रोक सकते हैं (<b>तुइची</b>)। राजा को किनारे पर ले जाकर दोनों कोनों का निशाना लगाइए!", "done": "दो रास्ते! अगली चाल में राजा कोने पर।"}, {"say": "और: आक्रमणकारी <b>सभी रक्षकों को घेर लें</b> तो वे जीतते हैं; एक ही स्थिति तीन बार आए तो रक्षक हारते हैं; जिसके पास चाल न हो वह हारता है। आक्रमणकारी पहले कोने सँभालें, रक्षक जल्दी रास्ते खोलें। चलिए खेलें!"}]},
    ar: {"name": "تافلين", "next": "التالي", "back": "رجوع", "start": "لنلعب", "again": "مرة أخرى", "tap": "اضغط مربعًا مضيئًا", "nope": "لا يمكنها الذهاب إلى هناك!", "cap": "أُسر الملك!", "esc": "هرب!", "fort": "اكتمل الحصن!", "s": [{"say": "مرحبًا، أنا <b>تافلين</b>! لنتعرّف معًا على قواعد <b>هنفتافل</b>، لعبة الفايكنغ، على هذه الرقعة من خشب البلوط."}, {"say": "الرقعة 11×11. يطوّق <b>24 مهاجمًا داكنًا</b> الرقعة، ويحرس <b>12 مدافعًا فاتحًا</b> <b>الملك</b> في الوسط (القطعة المضيئة). <b>يبدأ المهاجمون</b> ثم يتناوب الطرفان."}, {"say": "يفوز المدافعون <b>بإيصال الملك إلى أي زاوية</b>! ويفوز المهاجمون <b>بأسر الملك</b>. الزوايا الأربع المضيئة هي هدف الملك."}, {"say": "تتحرك كل القطع <b>مثل رخ الشطرنج</b>: في خط مستقيم أي مسافة. لا قفز، و<b>لا يقف على الزاوية أو العرش في الوسط إلا الملك</b>. حرّك المدافع!", "done": "ووش! توقف أمام قطعة الخصم تمامًا."}, {"say": "<b>احصر</b> قطعة للخصم <b>بين قطعتين لك</b> على صف أو عمود لتأسرها. لا يأسر إلا <b>الطرف الذي يلعب</b>. احصر المدافع بمهاجم!", "done": "أُسرت! لكن القطعة التي تدخل بنفسها بين عدوين تبقى آمنة."}, {"say": "<b>الزوايا</b> و<b>العرش الخالي</b> تعمل كعدو. القطعة المجاورة لزاوية تسقط بقطعة واحدة من الجهة الأخرى. اأسرها بالمهاجم!", "done": "استعملت الزاوية!"}, {"say": "إذا كان الملك على الحافة والطريق إلى زاوية خاليًا، يهرب بنقلة واحدة. خذ الملك إلى الزاوية!", "done": "هرب الملك! فاز المدافعون."}, {"say": "يُؤسر الملك إذا <b>أحاط به المهاجمون من الجهات الأربع</b> (بجوار العرش: ثلاث جهات مع العرش). لا يمكن أسر ملك على الحافة. ضع المهاجم الأخير!", "done": "طُوّق! فاز المهاجمون. الملك مسلّح أيضًا: يساعد في حصر المهاجمين."}, {"say": "صف المدافعين على الحافة يُؤسر <b>دفعة واحدة</b> إذا أُغلق طرفاه وكان أمام كل منهم عدو (<b>جدار الدروع</b>). يمكن لزاوية أن تُغلق طرفًا. أغلق الصف!", "done": "جدار الدروع! ثلاث قطع دفعة واحدة."}, {"say": "إذا كان الملك على الحافة وقادرًا على الحركة وداخل <b>حصن من المدافعين لا يمكن كسره أبدًا</b>، فاز المدافعون (<b>حصن الحافة</b>). أغلق الحصن بالمدافع الأخير!", "done": "حصن لا يُكسر! فاز المدافعون."}, {"say": "نصيحة: إذا صار للملك <b>طريقان مفتوحان</b> معًا، لا يسدّ المهاجمون إلا واحدًا في النقلة (<b>تويتشي</b>). خذ الملك إلى الحافة واستهدف الزاويتين!", "done": "طريقان! في النقلة التالية يبلغ الملك زاوية."}, {"say": "وأيضًا: يفوز المهاجمون إذا <b>طوّقوا جميع المدافعين</b>؛ وتكرار الوضع نفسه ثلاث مرات يُخسر المدافعين؛ ومن لا يملك نقلة يخسر. المهاجمون: احرسوا الزوايا أولًا. المدافعون: افتحوا الطرق مبكرًا. هيا نلعب!"}]},
  };

  /* board, marks and interactivity of each step.
     pos: [kind a|d|k, square]   glow: pulsing tiles (+ the pieces there bob)   blue: static blue tiles   gold: soft gold tiles
     sel: the piece that moves   act: { to: [squares], all (every legal square shown), capture: [squares], kingcap, escape, fort: [wall], lines: [[squares]] } */
  const P = (...a) => a.map(s => [s[0], s.slice(1)]);
  const STEPS = [
    { pos: INIT },
    { pos: INIT, glow: ['f6'] },
    { pos: INIT, gold: CORNERS },
    { pos: P('kf6', 'dd4', 'ad9', 'ah4'), sel: 'd4', act: { all: true } },
    { pos: P('kf6', 'dd7', 'ad6', 'ah8'), sel: 'h8', act: { to: ['d8'], capture: ['d7'] } },
    { pos: P('kf6', 'db1', 'ac5'), sel: 'c5', blue: ['a1', 'f6'], act: { to: ['c1'], capture: ['b1'] } },
    { pos: P('kk5', 'ak9', 'ah3'), sel: 'k5', act: { to: ['k1'], escape: true } },
    { pos: P('ke8', 'ad8', 'af8', 'ae9', 'ah7'), sel: 'h7', act: { to: ['e7'], kingcap: true } },
    { pos: P('kf6', 'dd1', 'de1', 'df1', 'ad2', 'ae2', 'af2', 'ac1', 'ag5'), sel: 'g5', act: { to: ['g1'], capture: ['d1', 'e1', 'f1'] } },
    { pos: P('kf1', 'de1', 'de2', 'df3', 'dg2', 'dh1', 'ac4', 'aj5'), sel: 'f3', act: { to: ['f2'], fort: ['f1', 'e1', 'e2', 'f2', 'g2', 'h1'] } },
    { pos: P('kd3', 'ac7', 'ah6', 'aj4'), sel: 'd3', act: { to: ['d1'], lines: [['c1', 'b1', 'a1'], ['e1', 'f1', 'g1', 'h1', 'i1', 'j1', 'k1']] } },
    { pos: INIT, last: true },
  ];
  STEPS.forEach(st => { if (st.act && st.act.all) st.act.to = rays(st.pos, st.sel); });

  /* ---------- little sounds: a turned piece on oak, a horn, and a chirpy voice while the guide talks ---------- */
  const SFX = (() => {
    let on = true; try { on = localStorage.getItem('atlas-sfx') !== '0'; } catch (e) {}
    const ac = () => { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    function tok(vol = 1, pitch = 1) {
      const C = on && ac(); if (!C) return; const t = C.currentTime;
      const o = C.createOscillator(), g = C.createGain(), lp = C.createBiquadFilter(); o.type = 'triangle'; o.frequency.setValueAtTime(220 * pitch, t); o.frequency.exponentialRampToValueAtTime(95 * pitch, t + .08);
      lp.type = 'lowpass'; lp.frequency.value = 1500; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.2 * vol, t + .004); g.gain.exponentialRampToValueAtTime(.001, t + .12);
      o.connect(lp).connect(g).connect(C.destination); o.start(t); o.stop(t + .14);
    }
    function blip() {
      const C = on && ac(); if (!C) return; const t = C.currentTime, f = 520 + Math.random() * 240;
      const o = C.createOscillator(), g = C.createGain(), lp = C.createBiquadFilter(); o.type = 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (Math.random() < .5 ? 1.25 : .82), t + .05);
      lp.type = 'lowpass'; lp.frequency.value = 2400; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.07, t + .008); g.gain.exponentialRampToValueAtTime(.001, t + .06);
      o.connect(lp).connect(g).connect(C.destination); o.start(t); o.stop(t + .07);
    }
    function horn() {
      const C = on && ac(); if (!C) return; const t = C.currentTime;
      [[147, 0, .5], [196, .32, .8]].forEach(([f, d, len]) => { const o = C.createOscillator(), g = C.createGain(), lp = C.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 700;
        g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(.09, t + d + .08); g.gain.setValueAtTime(.09, t + d + len - .15); g.gain.exponentialRampToValueAtTime(.001, t + d + len); o.connect(lp).connect(g).connect(C.destination); o.start(t + d); o.stop(t + d + len + .05); });
    }
    return { tok, blip, horn, get on() { return on; }, toggle() { on = !on; try { localStorage.setItem('atlas-sfx', on ? '1' : '0'); } catch (e) {} if (on) ac(); return on; } };
  })();

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, L = TXT[ctx.lang] || TXT.en;
    const board = T3.MODELS.tafl(true, { n: N }); T3.show('tafl', board); T3.play(true);
    const U = board.userData, Y = U.top, S = U.S, cs = U.cs;
    if (T3.fit) T3.fit({ w: S + 1.3, d: S + 1.8, y: Y + .3, pitch: 1.0 });
    const marks = new TH.Group(); board.add(marks);
    let pcs = {}, step = 0, stopped = false, busy = false, played = false, timers = [], epoch = 0;
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const anim = (dur, f, done) => { const ep = epoch, t0 = performance.now(); (function s(n) { if (stopped || ep !== epoch) return; const k = Math.min(1, (n - t0) / dur); f(k); T3.kick && T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const xz = s => U.cell(...at(s));

    function mk(kind) { const g = U.piece(kind === 'a' ? 1 : kind === 'd' ? 2 : 3); g.userData.ry0 = g.rotation.y; const sh = T3.contact(cs * .36, .5); sh.position.y = .002; g.add(sh); return g; }
    /* ---------- position changes: diffed against the pieces already on the board — a piece already on its square stays
       exactly where it is, one that only changed squares glides there (the nearest of the same kind), a vanished one
       lifts away and only new ones drop in; an identical position leaves the board untouched ---------- */
    function fall(g, y, delay, h = 1.4) { g.visible = false; g.position.y = y; later(() => { g.visible = true; anim(260, k => { g.position.y = y + (1 - k) * (1 - k) * h; }, () => { g.position.y = y; }); }, delay); }
    function liftOut(g) { const y0 = g.position.y, s0 = g.scale.x; if (!g.visible) { board.remove(g); return; } anim(260, k => { g.position.y = y0 + k * .9; g.scale.setScalar(Math.max(.01, s0 * (1 - k))); }, () => board.remove(g)); }
    function settle(g, x, y, z, mv) {   // back to its resting pose on (x, y, z); false if it already rests there
      const p = g.position, r = g.rotation, s = g.scale, ry = g.userData.ry0 || 0; g.userData.bob = false;
      if (!g.visible) { p.set(x, y, z); r.set(0, ry, 0); s.set(1, 1, 1); fall(g, y, 40); return true; }
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < 1e-3 && Math.abs(p.y - y) < 1e-3 && Math.abs(r.x) + Math.abs(r.y - ry) + Math.abs(r.z) < 1e-3 && Math.abs(s.x - 1) + Math.abs(s.y - 1) + Math.abs(s.z - 1) < 1e-3) return false;
      const f = p.clone(), r0 = r.clone(), s0 = s.clone(), lift = mv ? Math.min(1, .3 + d * .08) : 0;
      anim(mv ? Math.min(620, 300 + d * 45) : 200, k => { const e = io(k); p.set(f.x + (x - f.x) * e, f.y + (y - f.y) * e + Math.sin(k * Math.PI) * lift, f.z + (z - f.z) * e); r.set(r0.x * (1 - e), r0.y + (ry - r0.y) * e, r0.z * (1 - e)); s.set(s0.x + (1 - s0.x) * e, s0.y + (1 - s0.y) * e, s0.z + (1 - s0.z) * e); },
        () => { p.set(x, y, z); r.set(0, ry, 0); s.set(1, 1, 1); if (mv) SFX.tok(.5, 1.05); });
      return true;
    }
    // cur: [{ g, k, at }] on the board now; want: [{ k, at, … }]; spot(w) → [x, z, y?]; make(w) → a new piece. → { list: [{ g, w }], wait (ms until settled) }
    function morph(cur, want, spot, make) {
      const live = new Set(cur.map(c => c.g));
      board.children.slice().forEach(o => { if (o.userData.pc && !live.has(o)) board.remove(o); });   // leftovers of an interrupted capture
      const got = want.map(() => null), pool = cur.slice(), mv = new Set(), pairs = [];
      want.forEach((w, i) => { const j = pool.findIndex(c => c.k === w.k && c.at === w.at); if (j >= 0) got[i] = pool.splice(j, 1)[0].g; });
      want.forEach((w, i) => { if (got[i]) return; const [x, z] = spot(w); pool.forEach(c => { if (c.k === w.k) pairs.push([Math.hypot(c.g.position.x - x, c.g.position.z - z), i, c]); }); });
      pairs.sort((a, b) => a[0] - b[0]).forEach(([, i, c]) => { if (got[i] || c.used) return; c.used = true; got[i] = c.g; mv.add(c.g); });
      let nNew = 0, moved = 0;
      const list = want.map((w, i) => {
        const [x, z, y = Y] = spot(w); let g = got[i];
        if (!g) { g = make(w); g.userData.pc = 1; g.position.set(x, y, z); board.add(g); fall(g, y, 40 + (nNew++) * 16); }
        else if (settle(g, x, y, z, mv.has(g))) moved++;
        return { g, w };
      });
      const gone = pool.filter(c => !c.used); gone.forEach(c => liftOut(c.g));
      return { list, wait: Math.max(nNew ? 320 + nNew * 16 : 0, moved ? 640 : 0, gone.length ? 280 : 0) };
    }
    function setBoard(st) {   // → ms until the board has settled
      const cur = Object.keys(pcs).map(at => ({ g: pcs[at], at, k: pcs[at].userData.kind }));
      const r = morph(cur, st.pos.map(([kd, at]) => ({ k: kd === 'a' ? 1 : kd === 'd' ? 2 : 3, at, kd })), w => xz(w.at), w => mk(w.kd));
      pcs = {}; r.list.forEach(({ g, w }) => { pcs[w.at] = g; });
      return r.wait;
    }
    /* ---------- marks ---------- */
    function clearMarks() { while (marks.children.length) { const m = marks.children[0]; marks.remove(m); if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); } Object.values(pcs).forEach(p => { p.userData.bob = false; }); }
    function tile(s, color, op = .5, pulse = false) {
      const m = new TH.Mesh(new TH.BoxGeometry(cs * .92, .02, cs * .92), new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false }));
      const [x, z] = xz(s); m.position.set(x, Y + .012, z); m.userData.pulse = pulse; marks.add(m); return m;
    }
    function ring(s) { const m = new TH.Mesh(new TH.CylinderGeometry(cs * .16, cs * .16, .02, 28), new TH.MeshBasicMaterial({ color: 0x2fd17a, transparent: true, opacity: .85, toneMapped: false })); const [x, z] = xz(s); m.position.set(x, Y + .02, z); m.userData.pulse = true; marks.add(m); return m; }
    function cross(s) { const g = new TH.Group(), mat = new TH.MeshBasicMaterial({ color: 0xff3b3b, toneMapped: false }); [1, -1].forEach(k => { const b = new TH.Mesh(new TH.BoxGeometry(cs * .62, .03, cs * .09), mat); b.rotation.y = k * Math.PI / 4; g.add(b); }); const [x, z] = xz(s); g.position.set(x, Y + .05, z); marks.add(g); return g; }
    (function pulse() { if (stopped) return; const k = .5 + .5 * Math.sin(performance.now() / 260); let any = false; marks.children.forEach(m => { if (m.userData.pulse) { any = true; if (m.geometry && m.geometry.type === 'CylinderGeometry') m.scale.set(.85 + k * .3, 1, .85 + k * .3); m.material.opacity = .4 + k * .5; } }); Object.values(pcs).forEach(p => { if (p.userData.bob) { any = true; p.position.y = Y + .05 + .2 * k; } }); if (any && T3.kick) T3.kick(60); requestAnimationFrame(pulse); })();

    /* ---------- moves ---------- */
    function land(g) { anim(160, k => { const s = 1 + Math.sin(k * Math.PI) * .06; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1)); }
    function moveTo(g, s, done) {
      const x0 = g.position.x, y0 = g.position.y, z0 = g.position.z, [x1, z1] = xz(s), d = Math.hypot(x1 - x0, z1 - z0), dur = 240 + d * 70;
      anim(dur, k => { const e = io(k); g.position.x = x0 + (x1 - x0) * e; g.position.z = z0 + (z1 - z0) * e; g.position.y = Y + Math.sin(k * Math.PI) * .3 + (y0 - Y) * (1 - e); },
        () => { g.position.y = Y; SFX.tok(); land(g); if (done) done(); });
    }
    function capture(g, done) {   // the taken piece hops off the board and shrinks away
      const x0 = g.position.x, z0 = g.position.z, x1 = x0 + (x0 > 0 ? 1 : -1) * 1.2, z1 = z0 - .4;
      anim(520, k => { g.position.x = x0 + (x1 - x0) * k; g.position.z = z0 + (z1 - z0) * k; g.position.y = Y + Math.sin(k * Math.PI) * 1.4; g.scale.setScalar(Math.max(.01, 1 - k * k)); g.rotation.z = k * 1.2; }, () => { board.remove(g); if (done) done(); });
    }
    function shake(g, done) { const r0 = g.rotation.z; anim(700, k => { g.rotation.z = r0 + Math.sin(k * Math.PI * 7) * .14 * (1 - k); }, () => { g.rotation.z = r0; if (done) done(); }); }
    function hop(g, done) { anim(700, k => { g.position.y = Y + Math.sin(k * Math.PI) * .8; g.rotation.y = k * Math.PI * 2; }, () => { g.position.y = Y; g.rotation.y = 0; land(g); if (done) done(); }); }

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
      typeT = setInterval(() => { if (stopped) return clearInterval(typeT); for (let k = 0; k < 2; k++) { if (ni >= nodes.length) return clearInterval(typeT); const [n, s] = nodes[ni]; n.textContent = s.slice(0, ++ci); const ch = s[ci - 1]; if (ch && !/[\s、。！？!?,.：:（）()「」—–・]/.test(ch) && (said++ % 3 === 0)) SFX.blip(); if (ci >= s.length) { ni++; ci = 0; } } }, 24);
      tx.onclick = () => { clearInterval(typeT); nodes.forEach(([n, s]) => { n.textContent = s; }); };
      const pic = $('.pic'); pic.classList.remove('talk'); void pic.offsetWidth; pic.classList.add('talk');
    }
    function buttons() {
      const st = STEPS[step], wait = st.act && !played;
      $('[data-a=back]').style.visibility = step ? '' : 'hidden';
      const nx = $('[data-a=next]');
      nx.textContent = st.last ? L.start + ' ▶' : wait ? L.tap : L.next + ' ▶';
      nx.disabled = !!wait; nx.classList.toggle('wait', !!wait);
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
      const wait = setBoard(st);
      later(() => {
        (st.blue || []).forEach(q => tile(q, 0x1f6fe8, .45));
        (st.gold || []).forEach(q => tile(q, 0xffb020, .55, true));
        (st.glow || []).forEach(q => { const p = pcs[q]; if (p) p.userData.bob = true; tile(q, p ? 0xffc928 : 0xe0501e, .5, true); });
        if (st.sel) { tile(st.sel, 0x2fd17a, .6, true); const sp = pcs[st.sel]; anim(240, k => { sp.position.y = Y + .2 * io(k); }); }
        if (st.act) st.act.to.forEach(q => ring(q));
      }, wait + 60);
      say(L.s[step].say); buttons();
    }
    function cellOf(e) {
      const p = T3.pick(e, Y); if (!p) return null;
      const c = Math.floor((p.x + S / 2) / cs), r = Math.floor((p.z + S / 2) / cs);
      return c < 0 || c >= N || r < 0 || r >= N ? null : nm(c, r);
    }
    function finish(extra) { busy = false; if (L.s[step].done) say(L.s[step].done); if (extra) extra(); buttons(); }
    function onClick(e) {
      if (busy || T3.wasDrag() || e.target.closest('.rgd')) return;
      const st = STEPS[step], q = cellOf(e); if (!q || !st.act || played) return;
      if (!st.act.to.includes(q)) { if (q !== st.sel) say(L.nope); return; }
      busy = true; played = true; clearMarks();
      const g = pcs[st.sel], stepNow = step, A = st.act;
      delete pcs[st.sel]; pcs[q] = g;
      moveTo(g, q, () => {
        if (step !== stepNow) return;
        if (A.capture) {
          A.capture.forEach((c, i) => { const v = pcs[c]; delete pcs[c]; if (v) later(() => capture(v), 80 + i * 90); });
          later(() => finish(), 650 + A.capture.length * 90); return;
        }
        if (A.kingcap) {
          const k = Object.entries(pcs).find(([, p]) => p.userData.kind === 3);
          if (k) tile(k[0], 0xff3030, .6, true);
          shake(k[1], () => { SFX.horn(); finish(() => { cross(k[0]); $('.cnt').innerHTML = `<span class="tag">${L.cap}</span>`; }); });
          return;
        }
        if (A.escape) { tile(q, 0xffd24a, .7, true); SFX.horn(); hop(g, () => finish(() => { $('.cnt').innerHTML = `<span class="tag">${L.esc}</span>`; })); return; }
        if (A.fort) { A.fort.forEach(s => tile(s, s === 'f1' ? 0xffd24a : 0x3fa8ff, .5, true)); SFX.horn(); later(() => finish(() => { $('.cnt').innerHTML = `<span class="tag">${L.fort}</span>`; }), 500); return; }
        if (A.lines) { A.lines.forEach(line => line.forEach(s => tile(s, 0x3fa8ff, .5, true))); later(() => finish(), 300); return; }
        later(() => finish(), 250);
      });
    }
    $('[data-a=next]').onclick = () => { if (STEPS[step].last) ctx.onStart(); else go(step + 1); };
    $('[data-a=back]').onclick = () => { if (STEPS[step].last && ctx.onExit) ctx.onExit(); else go(step - 1); };
    const sfxBtn = $('[data-a=sfx]'), paintSfx = () => { sfxBtn.classList.toggle('off', !SFX.on); sfxBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/>${SFX.on ? '<path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>' : '<path d="M16 9l6 6M22 9l-6 6"/>'}</svg>`; };
    sfxBtn.onclick = () => { SFX.toggle(); paintSfx(); }; paintSfx();
    ctx.el.addEventListener('click', onClick);
    // keyboard: Space / Enter / → next, ← back (an interactive step waits for the move)
    const onKey = e => {
      if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
      if (document.activeElement && document.activeElement !== document.body && (e.key === 'Enter' || e.key === ' ')) document.activeElement.blur();
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.stopPropagation(); e.preventDefault(); const nx = $('[data-a=next]'); if (nx.disabled || (e.key === 'ArrowRight' && STEPS[step].last)) return; nx.click(); }
      else if (e.key === 'ArrowLeft') { e.stopPropagation(); e.preventDefault(); if (step) go(step - 1); }
    };
    document.addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => el.classList.add('on'));
    later(() => go(0), 350);
    return {
      stop() { stopped = true; clearInterval(typeT); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey, true); clearMarks(); el.remove(); },
      panel: el,
      _debug: { sq: s => { const [x, z] = xz(s); return [x, z, Y]; }, at: s => { const [x, z] = xz(s); return T3.project(x, z, Y); }, step: () => step, steps: STEPS.length, act: () => STEPS[step].act ? STEPS[step].act.to.slice() : null },
    };
  }

  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.tafl = { start };
})();
