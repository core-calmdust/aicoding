// Lesson warm-up texts (see bt_text.js): the other 12 languages.
module.exports = {
 "zh": {
  "b_cap": {
   "t": "寻找可以白吃的棋子",
   "body": "<p>能吃的棋子有两个以上时，要确认<b>吃了之后会不会被回吃</b>。落子格的斜前方有对方棋子，就会被回吃。</p><p>这里走 {m} 不会被回吃。</p>",
   "g": "选择不会被回吃的吃法。",
   "h": "吃完后，你所在格的斜前方有对方棋子吗？",
   "y": "{m} 不会被回吃，多得一子。"
  },
  "b_stop": {
   "t": "阻止入侵的棋子",
   "body": "<p>对方棋子逼近你的底线时，基本做法是<b>吃掉它</b>。放着不管，几步之内就会到达终点。</p><p>这里用 {m} 吃掉，是唯一的防守。</p>",
   "g": "走出阻止突破的一步。",
   "h": "用哪枚棋子吃掉入侵者，下一步还能继续防守？",
   "y": "{m} 挡住了。其他着法都会被突破。"
  },
  "b_win2": {
   "t": "两步突破",
   "body": "<p>离终点还有两行的棋子，只要<b>前进一步而不被吃</b>，下一步就能到达。要选对方吃不到的格子。</p><p>这里从 {m} 开始，{n} 步就能突破。</p>",
   "g": "走出两步突破的一步。",
   "h": "前方哪个格子的斜前方没有对方棋子？",
   "y": "{m} 不会被吃，下一步就到终点。"
  },
  "s_break": {
   "t": "攻击薄弱处",
   "body": "<p>防守需要两枚以上的棋子。<b>把进攻棋子集中到防守者不足的地方</b>，对方就挡不住全部。</p><p>这里从 {m} 开始，{n} 步就能突破。</p>",
   "g": "走出 {n} 步突破的第一步。",
   "h": "哪里能用比对方防守者更多的棋子进攻？",
   "y": "{m} 让进攻棋子多过了防守者。"
  },
  "s_wall": {
   "t": "用墙防守",
   "body": "<p>横排、纵列的棋子无法被绕过。防守不只是吃子，有时需要<b>堵住空出的入侵路线</b>。</p><p>这里 {m} 是唯一的防守。</p>",
   "g": "走出守得住的一步。",
   "h": "对方棋子能从哪里溜过去？把那里堵上。",
   "y": "{m} 堵住了入侵路线。"
  },
  "s_trade": {
   "t": "用交换打开通路",
   "body": "<p>即使是会被回吃的吃法，<b>通过交换减少防守者</b>，剩下的棋子也可能突破。</p><p>这里走 {m} 吃子，即使被回吃，也能在 {n} 步内突破。</p>",
   "g": "走出 {n} 步突破的第一步。",
   "h": "哪种吃法即使被回吃，之后也能打开通路？",
   "y": "{m} 交换后，对方的防守者不够了。"
  },
  "s_tempo": {
   "t": "等着，让对方先动",
   "body": "<p>突破棋不能停一手。走一步不破坏防守阵形的<b>等着</b>，对方就必须先破坏自己的阵形（楚茨文格）。</p><p>这里 {m} 是 {n} 步取胜的等着。如果对方能停一手，这个胜利就不存在。</p>",
   "g": "走出 {n} 步取胜的第一步。",
   "h": "走哪一步之后，对方无论怎么走都会破坏自己的阵形？",
   "y": "{m} 把走棋权交还对方，迫使对方破坏阵形。"
  },
  "s_race": {
   "t": "数到终点的行数",
   "body": "<p>防守崩溃后的残局是<b>竞速</b>：无法阻挡的棋子之间，离终点行数少的一方获胜。先数清楚，再选先到的着法。</p><p>这里从 {m} 开始，{n} 步取胜。</p>",
   "g": "走出 {n} 步取胜的第一步。",
   "h": "你和对方到终点各差几行？能阻止对方的棋子吗？",
   "y": "{m} 赢得了竞速。"
  },
  "_ui": {
   "step": "准备 {i}/{n}",
   "next": "下一步",
   "main": "进入正式题目",
   "skip": "跳过准备",
   "note": "（准备题不计分）",
   "look": "看看发光的棋子。",
   "ans": "答案：{m}",
   "ng": "好像不对。局面会退回，再想一想。"
  }
 },
 "ko": {
  "b_cap": {
   "t": "공짜로 잡을 말 찾기",
   "body": "<p>잡을 수 있는 말이 둘 이상이면 <b>잡은 뒤 되잡히는지</b> 확인합니다. 들어간 칸의 대각선 앞에 상대 말이 있으면 되잡힙니다.</p><p>여기서는 {m}이면 되잡히지 않습니다.</p>",
   "g": "되잡히지 않게 잡으세요.",
   "h": "잡은 뒤 그 칸의 대각선 앞에 상대 말이 있나요?",
   "y": "{m}은 되잡히지 않습니다. 말 하나 이득입니다."
  },
  "b_stop": {
   "t": "침입하는 말 막기",
   "body": "<p>상대 말이 내 홈 줄 가까이 오면 <b>잡아서 막는</b> 것이 기본입니다. 그냥 두면 몇 수 안에 골에 닿습니다.</p><p>여기서는 {m}으로 잡는 것이 유일한 수비입니다.</p>",
   "g": "돌파를 막는 수를 두세요.",
   "h": "어느 말로 침입자를 잡아야 다음에도 지킬 수 있을까요?",
   "y": "{m}으로 막았습니다. 다른 수는 돌파당합니다."
  },
  "b_win2": {
   "t": "2수 만에 돌파",
   "body": "<p>골까지 두 줄 남은 말은 <b>잡히지 않고 한 걸음 나가면</b> 다음 수에 골인합니다. 상대가 잡을 수 없는 칸을 고르는 것이 요령입니다.</p><p>여기서는 {m}부터 {n}수 만에 돌파합니다.</p>",
   "g": "2수 만에 돌파하는 수를 두세요.",
   "h": "앞 칸 중 대각선 앞에 상대 말이 없는 칸은?",
   "y": "{m}은 잡히지 않습니다. 다음에 골인합니다."
  },
  "s_break": {
   "t": "얇은 곳을 공격",
   "body": "<p>수비는 말 두 개 이상으로 합니다. <b>수비수가 모자란 곳에 공격 말을 모으면</b> 상대는 전부 막을 수 없습니다.</p><p>여기서는 {m}부터 {n}수 만에 돌파합니다.</p>",
   "g": "{n}수 돌파의 첫 수를 두세요.",
   "h": "상대 수비수보다 많은 말로 공격할 수 있는 곳은?",
   "y": "{m}으로 공격 말이 수비수보다 많아졌습니다."
  },
  "s_wall": {
   "t": "벽으로 지키기",
   "body": "<p>가로줄·세로줄의 말은 빠져나갈 수 없습니다. 잡는 것만이 수비가 아니라 <b>비어 있는 침입로를 막는</b> 수가 필요할 때도 있습니다.</p><p>여기서는 {m}이 유일한 수비입니다.</p>",
   "g": "버티는 수를 두세요.",
   "h": "상대 말이 빠져나갈 길은 어디인가요? 거기를 막으세요.",
   "y": "{m}으로 침입로를 막았습니다."
  },
  "s_trade": {
   "t": "교환으로 길 열기",
   "body": "<p>되잡히는 잡기라도 <b>교환으로 수비수를 줄이면</b> 남은 말이 돌파할 수 있습니다.</p><p>여기서는 {m}으로 잡으면 되잡혀도 {n}수 만에 돌파합니다.</p>",
   "g": "{n}수 돌파의 첫 수를 두세요.",
   "h": "되잡혀도 그 뒤 길이 열리는 잡기는?",
   "y": "{m}의 교환으로 상대 수비수가 모자라게 되었습니다."
  },
  "s_tempo": {
   "t": "기다려서 상대를 움직이게",
   "body": "<p>브레이크스루에는 패스가 없습니다. 수비 형태를 무너뜨리지 않는 <b>기다리는 수</b>를 두면 상대가 먼저 형태를 무너뜨려야 합니다(추크추방).</p><p>여기서는 {m}이 {n}수 만에 이기는 기다리는 수입니다. 상대가 패스할 수 있다면 이 승리는 없습니다.</p>",
   "g": "{n}수 만에 이기는 첫 수를 두세요.",
   "h": "어떤 수를 두면 상대가 무엇을 두든 자기 형태가 무너질까요?",
   "y": "{m}으로 차례를 넘겨 상대가 형태를 무너뜨리게 합니다."
  },
  "s_race": {
   "t": "골까지 줄 수 세기",
   "body": "<p>수비가 무너진 종반은 <b>경주</b>입니다. 막을 수 없는 말끼리라면 골까지 줄 수가 적은 쪽이 이깁니다. 세어 보고 먼저 닿는 수를 고르세요.</p><p>여기서는 {m}부터 {n}수 만에 이깁니다.</p>",
   "g": "{n}수 만에 이기는 첫 수를 두세요.",
   "h": "나와 상대는 골까지 각각 몇 줄? 상대 말을 막을 수 있나요?",
   "y": "{m}으로 경주에서 이깁니다."
  },
  "_ui": {
   "step": "준비 {i}/{n}",
   "next": "다음",
   "main": "본 문제로",
   "skip": "준비 건너뛰기",
   "note": "(준비 문제는 채점하지 않습니다)",
   "look": "빛나는 말을 보세요.",
   "ans": "정답: {m}",
   "ng": "아닌 것 같습니다. 국면을 되돌리니 다시 생각해 보세요."
  }
 },
 "es": {
  "b_cap": {
   "t": "Busca una pieza que se capture gratis",
   "body": "<p>Si puedes capturar más de una pieza, comprueba <b>si te recapturan</b>. Si hay una pieza rival en diagonal delante de la casilla a la que llegas, puede recapturar.</p><p>Aquí {m} no puede ser recapturada.</p>",
   "g": "Captura una pieza sin que te recapturen.",
   "h": "Tras capturar, ¿hay una pieza rival en diagonal delante de tu casilla?",
   "y": "{m} no puede ser recapturada: una pieza ganada."
  },
  "b_stop": {
   "t": "Frena la pieza que entra",
   "body": "<p>Cuando una pieza rival se acerca a tu fila de casa, <b>captúrala</b>. Si la dejas, llega a la meta en pocas jugadas.</p><p>Aquí capturar con {m} es la única defensa.</p>",
   "g": "Juega la jugada que frena la ruptura.",
   "h": "¿Con qué pieza debes capturar al intruso para seguir defendiendo después?",
   "y": "{m} la frena; cualquier otra jugada les deja pasar."
  },
  "b_win2": {
   "t": "Ruptura en dos",
   "body": "<p>Una pieza a dos filas de la meta gana si puede <b>avanzar sin ser capturada</b>: en la siguiente jugada entra. Elige una casilla donde el rival no pueda capturar.</p><p>Aquí {m} rompe en {n} jugadas.</p>",
   "g": "Juega la jugada que rompe en dos.",
   "h": "¿Qué casilla de delante no tiene pieza rival en diagonal delante?",
   "y": "{m} no puede ser capturada: la meta es lo siguiente."
  },
  "s_break": {
   "t": "Ataca donde están débiles",
   "body": "<p>Defender requiere dos o más piezas. <b>Lleva a tus atacantes donde faltan defensores</b> y no podrán frenarlos a todos.</p><p>Aquí {m} rompe en {n} jugadas.</p>",
   "g": "Juega la primera jugada de una ruptura en {n}.",
   "h": "¿Dónde puedes atacar con más piezas de las que defienden?",
   "y": "{m} reúne más atacantes que defensores."
  },
  "s_wall": {
   "t": "Defiende con un muro",
   "body": "<p>Las filas y columnas de piezas no se pueden esquivar. Defender no es solo capturar: a veces hay que <b>cerrar la vía de entrada abierta</b>.</p><p>Aquí {m} es la única defensa.</p>",
   "g": "Juega la jugada que aguanta.",
   "h": "¿Por dónde puede colarse la pieza rival? Ciérralo.",
   "y": "{m} cierra el paso."
  },
  "s_trade": {
   "t": "Abre camino con un cambio",
   "body": "<p>Incluso una captura que será recapturada puede ganar: <b>cambiar un defensor</b> puede dejar pasar a tu otra pieza.</p><p>Aquí {m}, aunque te recapturen, rompe en {n} jugadas.</p>",
   "g": "Juega la primera jugada de una ruptura en {n}.",
   "h": "¿Qué captura, aunque te recapturen, abre el camino?",
   "y": "Tras el cambio {m} les falta un defensor."
  },
  "s_tempo": {
   "t": "Espera y haz que muevan",
   "body": "<p>En Breakthrough no se puede pasar. Una <b>jugada de espera</b> que mantiene tu forma obliga al rival a romper la suya primero (zugzwang).</p><p>Aquí {m} es la jugada de espera que gana en {n}. Si pudieran pasar, no habría victoria.</p>",
   "g": "Juega la primera jugada de una victoria en {n}.",
   "h": "¿Tras qué jugada cualquier respuesta suya rompe su propia forma?",
   "y": "{m} devuelve el turno y les obliga a romper su forma."
  },
  "s_race": {
   "t": "Cuenta las filas hasta la meta",
   "body": "<p>Cuando ya no hay defensas es una <b>carrera</b>: entre piezas imparables gana la que tiene menos filas por delante. Cuenta y elige la jugada que llega antes.</p><p>Aquí {m} gana en {n}.</p>",
   "g": "Juega la primera jugada de una victoria en {n}.",
   "h": "¿Cuántas filas necesita cada bando? ¿Puedes frenar su pieza?",
   "y": "{m} gana la carrera."
  },
  "_ui": {
   "step": "Preparación {i}/{n}",
   "next": "Siguiente",
   "main": "A los problemas",
   "skip": "Saltar la preparación",
   "note": "(Las jugadas de preparación no puntúan)",
   "look": "Mira las piezas que brillan.",
   "ans": "Respuesta: {m}",
   "ng": "No es eso. La posición vuelve atrás: inténtalo otra vez."
  }
 },
 "pt": {
  "b_cap": {
   "t": "Ache uma peça para capturar de graça",
   "body": "<p>Quando pode capturar mais de uma peça, veja <b>se será recapturado</b>. Se houver uma peça adversária na diagonal à frente da casa onde você chega, ela pode recapturar.</p><p>Aqui {m} não pode ser recapturado.</p>",
   "g": "Capture uma peça que não possa ser recapturada.",
   "h": "Depois de capturar, há peça adversária na diagonal à frente da sua casa?",
   "y": "{m} não pode ser recapturado — uma peça ganha."
  },
  "b_stop": {
   "t": "Detenha a peça que está entrando",
   "body": "<p>Quando uma peça adversária se aproxima da sua fileira de casa, <b>capture-a</b>. Deixada em paz, ela chega em poucos lances.</p><p>Aqui capturar com {m} é a única defesa.</p>",
   "g": "Jogue o lance que impede a invasão.",
   "h": "Com qual peça você deve capturar o invasor para continuar defendendo depois?",
   "y": "{m} detém a invasão — qualquer outro lance deixa passar."
  },
  "b_win2": {
   "t": "Invasão em dois",
   "body": "<p>Uma peça a duas fileiras da chegada vence se puder <b>avançar sem ser capturada</b> — no lance seguinte ela entra. Escolha uma casa onde o adversário não possa capturar.</p><p>Aqui {m} invade em {n} lances.</p>",
   "g": "Jogue o lance que invade em dois.",
   "h": "Qual casa à frente não tem peça adversária na diagonal à frente?",
   "y": "{m} não pode ser capturado — a chegada é a seguir."
  },
  "s_break": {
   "t": "Ataque onde eles são fracos",
   "body": "<p>Defender exige duas ou mais peças. <b>Leve seus atacantes aonde faltam defensores</b> e eles não conseguem deter todos.</p><p>Aqui {m} invade em {n} lances.</p>",
   "g": "Jogue o primeiro lance de uma invasão em {n}.",
   "h": "Onde você pode atacar com mais peças do que eles têm defensores?",
   "y": "{m} traz mais atacantes do que defensores."
  },
  "s_wall": {
   "t": "Defenda com uma muralha",
   "body": "<p>Fileiras e colunas de peças não podem ser contornadas. Defender não é só capturar: às vezes é preciso <b>fechar a rota de entrada aberta</b>.</p><p>Aqui {m} é a única defesa.</p>",
   "g": "Jogue o lance que segura.",
   "h": "Por onde a peça adversária pode escapar? Feche ali.",
   "y": "{m} fecha a entrada."
  },
  "s_trade": {
   "t": "Abra caminho com uma troca",
   "body": "<p>Mesmo uma captura que será recapturada pode vencer: <b>trocar um defensor</b> pode deixar sua outra peça passar.</p><p>Aqui {m}, mesmo recapturado, invade em {n} lances.</p>",
   "g": "Jogue o primeiro lance de uma invasão em {n}.",
   "h": "Qual captura, mesmo recapturada, abre o caminho?",
   "y": "Depois da troca {m} falta-lhes um defensor."
  },
  "s_tempo": {
   "t": "Espere e faça-os mover",
   "body": "<p>Não se pode passar em Breakthrough. Um <b>lance de espera</b> que mantém sua forma obriga o adversário a desfazer a dele primeiro (zugzwang).</p><p>Aqui {m} é o lance de espera que vence em {n}. Se eles pudessem passar, não haveria vitória.</p>",
   "g": "Jogue o primeiro lance de uma vitória em {n}.",
   "h": "Depois de qual lance qualquer resposta deles desfaz a própria forma?",
   "y": "{m} devolve a vez e os obriga a desfazer a forma."
  },
  "s_race": {
   "t": "Conte as fileiras até a chegada",
   "body": "<p>Sem defesas, é uma <b>corrida</b>: entre peças imparáveis vence a que tem menos fileiras pela frente. Conte e escolha o lance que chega primeiro.</p><p>Aqui {m} vence em {n}.</p>",
   "g": "Jogue o primeiro lance de uma vitória em {n}.",
   "h": "Quantas fileiras cada lado precisa? Você pode deter a peça deles?",
   "y": "{m} vence a corrida."
  },
  "_ui": {
   "step": "Preparação {i}/{n}",
   "next": "Próximo",
   "main": "Aos problemas",
   "skip": "Pular a preparação",
   "note": "(Os lances de preparação não contam pontos)",
   "look": "Olhe as peças que brilham.",
   "ans": "Resposta: {m}",
   "ng": "Não é isso. A posição volta — tente de novo."
  }
 },
 "fr": {
  "b_cap": {
   "t": "Trouver un pion à prendre gratuitement",
   "body": "<p>Quand vous pouvez prendre plus d’un pion, vérifiez <b>si vous serez repris</b>. Si un pion adverse se trouve en diagonale devant la case d’arrivée, il peut reprendre.</p><p>Ici, {m} ne peut pas être repris.</p>",
   "g": "Prenez un pion qui ne peut pas être repris.",
   "h": "Après la prise, y a-t-il un pion adverse en diagonale devant votre case ?",
   "y": "{m} ne peut pas être repris : un pion de gagné."
  },
  "b_stop": {
   "t": "Arrêter le pion qui entre",
   "body": "<p>Quand un pion adverse approche de votre rangée de base, <b>prenez-le</b>. Laissé seul, il arrive en quelques coups.</p><p>Ici, prendre avec {m} est la seule défense.</p>",
   "g": "Jouez le coup qui arrête la percée.",
   "h": "Avec quel pion faut-il prendre l’intrus pour pouvoir encore défendre ensuite ?",
   "y": "{m} l’arrête ; tout autre coup les laisse passer."
  },
  "b_win2": {
   "t": "Percer en deux coups",
   "body": "<p>Un pion à deux rangées de l’arrivée gagne s’il peut <b>avancer sans être pris</b> : au coup suivant, il entre. Choisissez une case où l’adversaire ne peut pas prendre.</p><p>Ici, {m} perce en {n} coups.</p>",
   "g": "Jouez le coup qui perce en deux.",
   "h": "Quelle case devant n’a aucun pion adverse en diagonale devant elle ?",
   "y": "{m} ne peut pas être pris : l’arrivée est au coup suivant."
  },
  "s_break": {
   "t": "Attaquer là où ils sont peu nombreux",
   "body": "<p>Défendre demande deux pions ou plus. <b>Amenez vos attaquants là où les défenseurs manquent</b> et ils ne pourront pas tous les arrêter.</p><p>Ici, {m} perce en {n} coups.</p>",
   "g": "Jouez le premier coup d’une percée en {n}.",
   "h": "Où pouvez-vous attaquer avec plus de pions qu’ils n’ont de défenseurs ?",
   "y": "{m} amène plus d’attaquants que de défenseurs."
  },
  "s_wall": {
   "t": "Défendre avec un mur",
   "body": "<p>Les rangées et colonnes de pions ne se contournent pas. Défendre, ce n’est pas seulement prendre : il faut parfois <b>fermer la voie d’entrée ouverte</b>.</p><p>Ici, {m} est la seule défense.</p>",
   "g": "Jouez le coup qui tient.",
   "h": "Par où le pion adverse peut-il se faufiler ? Fermez ce passage.",
   "y": "{m} ferme l’entrée."
  },
  "s_trade": {
   "t": "Ouvrir la voie par un échange",
   "body": "<p>Même une prise qui sera reprise peut gagner : <b>échanger un défenseur</b> peut laisser passer votre autre pion.</p><p>Ici, {m}, même repris, perce en {n} coups.</p>",
   "g": "Jouez le premier coup d’une percée en {n}.",
   "h": "Quelle prise, même reprise, ouvre la voie ?",
   "y": "Après l’échange {m}, il leur manque un défenseur."
  },
  "s_tempo": {
   "t": "Attendre pour les forcer à bouger",
   "body": "<p>On ne peut pas passer à Breakthrough. Un <b>coup d’attente</b> qui garde votre forme oblige l’adversaire à casser la sienne le premier (zugzwang).</p><p>Ici, {m} est le coup d’attente qui gagne en {n}. S’ils pouvaient passer, il n’y aurait pas de gain.</p>",
   "g": "Jouez le premier coup d’un gain en {n}.",
   "h": "Après quel coup chacune de leurs réponses casse-t-elle leur propre forme ?",
   "y": "{m} leur rend le trait et les force à casser leur forme."
  },
  "s_race": {
   "t": "Compter les rangées jusqu’à l’arrivée",
   "body": "<p>Quand les défenses ont disparu, c’est une <b>course</b> : entre pions inarrêtables, celui qui a le moins de rangées à parcourir gagne. Comptez, puis choisissez le coup qui arrive en premier.</p><p>Ici, {m} gagne en {n}.</p>",
   "g": "Jouez le premier coup d’un gain en {n}.",
   "h": "Combien de rangées faut-il à chaque camp ? Pouvez-vous arrêter leur pion ?",
   "y": "{m} gagne la course."
  },
  "_ui": {
   "step": "Échauffement {i}/{n}",
   "next": "Suivant",
   "main": "Aux problèmes",
   "skip": "Passer l’échauffement",
   "note": "(Les coups d’échauffement ne sont pas notés)",
   "look": "Regardez les pions qui brillent.",
   "ans": "Réponse : {m}",
   "ng": "Ce n’est pas ça. La position revient en arrière : réessayez."
  }
 },
 "de": {
  "b_cap": {
   "t": "Einen Stein gratis schlagen",
   "body": "<p>Kannst du mehr als einen Stein schlagen, prüfe, <b>ob du zurückgeschlagen wirst</b>. Steht ein gegnerischer Stein schräg vor dem Zielfeld, kann er zurückschlagen.</p><p>Hier kann {m} nicht zurückgeschlagen werden.</p>",
   "g": "Schlage einen Stein, der nicht zurückgeschlagen werden kann.",
   "h": "Steht nach dem Schlagen ein gegnerischer Stein schräg vor deinem Feld?",
   "y": "{m} kann nicht zurückgeschlagen werden – ein Stein gewonnen."
  },
  "b_stop": {
   "t": "Den eindringenden Stein stoppen",
   "body": "<p>Kommt ein gegnerischer Stein nahe an deine Grundreihe, <b>schlag ihn</b>. Lässt du ihn, erreicht er in wenigen Zügen das Ziel.</p><p>Hier ist Schlagen mit {m} die einzige Verteidigung.</p>",
   "g": "Spiel den Zug, der den Durchbruch stoppt.",
   "h": "Mit welchem Stein musst du den Eindringling schlagen, damit du danach noch verteidigen kannst?",
   "y": "{m} stoppt ihn – jeder andere Zug lässt sie durch."
  },
  "b_win2": {
   "t": "Durchbruch in zwei Zügen",
   "body": "<p>Ein Stein zwei Reihen vor dem Ziel gewinnt, wenn er <b>vorrücken kann, ohne geschlagen zu werden</b> – im nächsten Zug zieht er hinein. Wähle ein Feld, auf dem der Gegner nicht schlagen kann.</p><p>Hier bricht {m} in {n} Zügen durch.</p>",
   "g": "Spiel den Zug, der in zwei Zügen durchbricht.",
   "h": "Vor welchem Feld steht schräg kein gegnerischer Stein?",
   "y": "{m} kann nicht geschlagen werden – als Nächstes das Ziel."
  },
  "s_break": {
   "t": "Dort angreifen, wo sie dünn sind",
   "body": "<p>Verteidigung braucht zwei oder mehr Steine. <b>Bring deine Angreifer dorthin, wo Verteidiger fehlen</b>, dann können sie nicht alle stoppen.</p><p>Hier bricht {m} in {n} Zügen durch.</p>",
   "g": "Spiel den ersten Zug eines Durchbruchs in {n}.",
   "h": "Wo kannst du mit mehr Steinen angreifen, als sie Verteidiger haben?",
   "y": "{m} bringt mehr Angreifer, als es Verteidiger gibt."
  },
  "s_wall": {
   "t": "Mit einer Mauer verteidigen",
   "body": "<p>Reihen und Spalten von Steinen lassen sich nicht umgehen. Verteidigen heißt nicht nur schlagen: Manchmal musst du <b>den offenen Einbruchsweg schließen</b>.</p><p>Hier ist {m} die einzige Verteidigung.</p>",
   "g": "Spiel den Zug, der hält.",
   "h": "Wo kann der gegnerische Stein durchschlüpfen? Schließ es.",
   "y": "{m} schließt den Weg hinein."
  },
  "s_trade": {
   "t": "Mit einem Tausch den Weg öffnen",
   "body": "<p>Auch ein Schlag, der zurückgeschlagen wird, kann gewinnen: <b>einen Verteidiger abtauschen</b> lässt vielleicht deinen anderen Stein durch.</p><p>Hier bricht {m} auch nach dem Zurückschlagen in {n} Zügen durch.</p>",
   "g": "Spiel den ersten Zug eines Durchbruchs in {n}.",
   "h": "Welcher Schlag öffnet den Weg, auch wenn zurückgeschlagen wird?",
   "y": "Nach dem Tausch {m} fehlt ihnen ein Verteidiger."
  },
  "s_tempo": {
   "t": "Warten und sie ziehen lassen",
   "body": "<p>In Breakthrough gibt es kein Passen. Ein <b>Wartezug</b>, der deine Form hält, zwingt den Gegner, seine zuerst zu brechen (Zugzwang).</p><p>Hier ist {m} der Wartezug, der in {n} gewinnt. Könnten sie passen, gäbe es keinen Gewinn.</p>",
   "g": "Spiel den ersten Zug eines Gewinns in {n}.",
   "h": "Nach welchem Zug bricht jede ihrer Antworten die eigene Form?",
   "y": "{m} gibt den Zug zurück und zwingt sie, ihre Form zu brechen."
  },
  "s_race": {
   "t": "Die Reihen bis zum Ziel zählen",
   "body": "<p>Sind die Verteidigungen weg, ist es ein <b>Rennen</b>: Zwischen unaufhaltsamen Steinen gewinnt der mit weniger Reihen vor sich. Zähle, dann wähle den Zug, der zuerst ankommt.</p><p>Hier gewinnt {m} in {n}.</p>",
   "g": "Spiel den ersten Zug eines Gewinns in {n}.",
   "h": "Wie viele Reihen braucht jede Seite? Kannst du ihren Stein stoppen?",
   "y": "{m} gewinnt das Rennen."
  },
  "_ui": {
   "step": "Aufwärmen {i}/{n}",
   "next": "Weiter",
   "main": "Zu den Aufgaben",
   "skip": "Aufwärmen überspringen",
   "note": "(Aufwärmzüge werden nicht gewertet)",
   "look": "Sieh dir die leuchtenden Steine an.",
   "ans": "Lösung: {m}",
   "ng": "Nicht ganz. Die Stellung geht zurück – versuch es noch einmal."
  }
 },
 "ru": {
  "b_cap": {
   "t": "Найдите фишку, которую можно взять даром",
   "body": "<p>Если можно взять несколько фишек, проверьте, <b>не возьмут ли в ответ</b>. Если по диагонали перед полем, куда вы встаёте, есть фишка соперника, она может взять в ответ.</p><p>Здесь {m} в ответ не взять.</p>",
   "g": "Возьмите фишку так, чтобы не взяли в ответ.",
   "h": "После взятия есть ли фишка соперника по диагонали перед вашим полем?",
   "y": "{m} не взять в ответ — фишка выиграна."
  },
  "b_stop": {
   "t": "Остановите входящую фишку",
   "body": "<p>Когда фишка соперника подходит к вашему домашнему ряду, <b>возьмите её</b>. Если оставить её, она дойдёт за несколько ходов.</p><p>Здесь взятие {m} — единственная защита.</p>",
   "g": "Сделайте ход, который останавливает прорыв.",
   "h": "Какой фишкой взять нарушителя, чтобы и потом продолжать защиту?",
   "y": "{m} останавливает её — любой другой ход пропускает."
  },
  "b_win2": {
   "t": "Прорыв в два хода",
   "body": "<p>Фишка в двух рядах от цели выигрывает, если может <b>шагнуть вперёд, не попав под взятие</b>, — следующим ходом она входит. Выбирайте поле, где соперник не может взять.</p><p>Здесь {m} прорывается за {n} хода.</p>",
   "g": "Сделайте ход, который прорывается за два хода.",
   "h": "Перед каким полем по диагонали нет фишки соперника?",
   "y": "{m} не взять — следующим ходом финиш."
  },
  "s_break": {
   "t": "Атакуйте, где защита тонка",
   "body": "<p>Для защиты нужны две фишки и больше. <b>Ведите атакующих туда, где не хватает защитников</b>, — всех им не остановить.</p><p>Здесь {m} ведёт к прорыву (ходов: {n}).</p>",
   "g": "Сделайте первый ход прорыва (ходов: {n}).",
   "h": "Где можно атаковать большим числом фишек, чем у них защитников?",
   "y": "После {m} атакующих больше, чем защитников."
  },
  "s_wall": {
   "t": "Защита стеной",
   "body": "<p>Ряды и колонны фишек обойти нельзя. Защита — это не только взятие: иногда нужно <b>закрыть открытый путь прорыва</b>.</p><p>Здесь {m} — единственная защита.</p>",
   "g": "Сделайте ход, который удерживает позицию.",
   "h": "Где фишка соперника может проскользнуть? Закройте это место.",
   "y": "{m} закрывает проход."
  },
  "s_trade": {
   "t": "Открыть путь разменом",
   "body": "<p>Даже взятие, на которое ответят взятием, может выиграть: <b>разменяв защитника</b>, вы можете пропустить другую фишку.</p><p>Здесь {m} даже после ответного взятия ведёт к прорыву (ходов: {n}).</p>",
   "g": "Сделайте первый ход прорыва (ходов: {n}).",
   "h": "Какое взятие открывает путь, даже если возьмут в ответ?",
   "y": "После размена {m} им не хватает защитника."
  },
  "s_tempo": {
   "t": "Выжидайте и заставьте ходить",
   "body": "<p>В «Прорыве» нельзя пропустить ход. <b>Выжидательный ход</b>, сохраняющий строй, заставляет соперника первым сломать свой (цугцванг).</p><p>Здесь {m} — выжидательный ход, выигрывающий (ходов: {n}). Если бы соперник мог пропустить ход, выигрыша бы не было.</p>",
   "g": "Сделайте первый ход выигрыша (ходов: {n}).",
   "h": "После какого хода любой ответ соперника ломает его собственный строй?",
   "y": "{m} передаёт ход и заставляет их сломать строй."
  },
  "s_race": {
   "t": "Считайте ряды до цели",
   "body": "<p>Когда защиты нет, начинается <b>гонка</b>: из неостановимых фишек побеждает та, которой осталось меньше рядов. Посчитайте и выберите ход, который приходит первым.</p><p>Здесь {m} выигрывает (ходов: {n}).</p>",
   "g": "Сделайте первый ход выигрыша (ходов: {n}).",
   "h": "Сколько рядов нужно каждой стороне? Можно ли остановить их фишку?",
   "y": "{m} выигрывает гонку."
  },
  "_ui": {
   "step": "Разминка {i}/{n}",
   "next": "Далее",
   "main": "К задачам",
   "skip": "Пропустить разминку",
   "note": "(Ходы разминки не оцениваются)",
   "look": "Посмотрите на светящиеся фишки.",
   "ans": "Ответ: {m}",
   "ng": "Не то. Позиция вернётся — попробуйте ещё раз."
  }
 },
 "tr": {
  "b_cap": {
   "t": "Bedavaya alınacak taşı bul",
   "body": "<p>Birden fazla taş alabiliyorsan <b>geri alınıp alınmayacağını</b> kontrol et. Vardığın karenin çapraz önünde rakip taş varsa geri alabilir.</p><p>Burada {m} geri alınamaz.</p>",
   "g": "Geri alınamayacak bir taş al.",
   "h": "Aldıktan sonra karenin çapraz önünde rakip taş var mı?",
   "y": "{m} geri alınamaz — bir taş kazandın."
  },
  "b_stop": {
   "t": "Giren taşı durdur",
   "body": "<p>Rakip taş ev sırana yaklaşınca <b>onu al</b>. Bırakırsan birkaç hamlede hedefe ulaşır.</p><p>Burada {m} ile almak tek savunmadır.</p>",
   "g": "Atılımı durduran hamleyi oyna.",
   "h": "Sonra da savunabilmek için davetsiz taşı hangi taşla almalısın?",
   "y": "{m} durdurur — başka her hamle geçit verir."
  },
  "b_win2": {
   "t": "İki hamlede atılım",
   "body": "<p>Hedefe iki sıra kalan taş, <b>alınmadan bir adım ilerleyebilirse</b> kazanır — sonraki hamlede girer. Rakibin alamayacağı bir kare seç.</p><p>Burada {m} {n} hamlede atılım yapar.</p>",
   "g": "İki hamlede atılım yapan hamleyi oyna.",
   "h": "Öndeki hangi karenin çapraz önünde rakip taş yok?",
   "y": "{m} alınamaz — sırada hedef var."
  },
  "s_break": {
   "t": "Zayıf yerden saldır",
   "body": "<p>Savunma iki ya da daha fazla taş ister. <b>Saldırganlarını savunmacının yetmediği yere topla</b>, hepsini durduramazlar.</p><p>Burada {m} {n} hamlede atılım yapar.</p>",
   "g": "{n} hamlelik atılımın ilk hamlesini oyna.",
   "h": "Nerede savunmacılarından daha çok taşla saldırabilirsin?",
   "y": "{m} savunmacılardan daha çok saldırgan getirir."
  },
  "s_wall": {
   "t": "Duvarla savun",
   "body": "<p>Sıra ve sütun hâlindeki taşların yanından geçilemez. Savunma yalnızca almak değildir: bazen <b>açık giriş yolunu kapatmak</b> gerekir.</p><p>Burada {m} tek savunmadır.</p>",
   "g": "Dayanan hamleyi oyna.",
   "h": "Rakip taş nereden sızabilir? Orayı kapat.",
   "y": "{m} giriş yolunu kapatır."
  },
  "s_trade": {
   "t": "Değişimle yol aç",
   "body": "<p>Geri alınacak bir alış bile kazandırabilir: <b>bir savunmacıyı değişmek</b> diğer taşına yol açabilir.</p><p>Burada {m}, geri alınsa da {n} hamlede atılım yapar.</p>",
   "g": "{n} hamlelik atılımın ilk hamlesini oyna.",
   "h": "Geri alınsa bile yolu açan alış hangisi?",
   "y": "{m} değişiminden sonra bir savunmacıları eksik."
  },
  "s_tempo": {
   "t": "Bekle ve onları oynat",
   "body": "<p>Breakthrough'da pas yoktur. Düzenini koruyan bir <b>bekleme hamlesi</b>, rakibi kendi düzenini önce bozmaya zorlar (zugzwang).</p><p>Burada {m}, {n} hamlede kazanan bekleme hamlesidir. Rakip pas geçebilseydi bu kazanç olmazdı.</p>",
   "g": "{n} hamlede kazanmanın ilk hamlesini oyna.",
   "h": "Hangi hamleden sonra rakibin her cevabı kendi düzenini bozar?",
   "y": "{m} sırayı geri verir ve onları düzenlerini bozmaya zorlar."
  },
  "s_race": {
   "t": "Hedefe kalan sıraları say",
   "body": "<p>Savunmalar bitince bu bir <b>yarıştır</b>: durdurulamaz taşlar arasında önünde daha az sıra olan kazanır. Say ve önce varan hamleyi seç.</p><p>Burada {m} {n} hamlede kazanır.</p>",
   "g": "{n} hamlede kazanmanın ilk hamlesini oyna.",
   "h": "Her tarafın kaç sıraya ihtiyacı var? Onların taşını durdurabilir misin?",
   "y": "{m} yarışı kazanır."
  },
  "_ui": {
   "step": "Isınma {i}/{n}",
   "next": "İleri",
   "main": "Sorulara geç",
   "skip": "Isınmayı atla",
   "note": "(Isınma hamleleri puanlanmaz)",
   "look": "Parlayan taşlara bak.",
   "ans": "Cevap: {m}",
   "ng": "Pek değil. Konum geri alınıyor — tekrar dene."
  }
 },
 "id": {
  "b_cap": {
   "t": "Cari bidak yang bisa dimakan gratis",
   "body": "<p>Jika bisa memakan lebih dari satu bidak, periksa <b>apakah kamu akan dimakan balik</b>. Jika ada bidak lawan di depan serong petak tujuanmu, ia bisa makan balik.</p><p>Di sini {m} tidak bisa dimakan balik.</p>",
   "g": "Makan bidak yang tidak bisa dimakan balik.",
   "h": "Setelah memakan, adakah bidak lawan di depan serong petakmu?",
   "y": "{m} tidak bisa dimakan balik — untung satu bidak."
  },
  "b_stop": {
   "t": "Hentikan bidak yang masuk",
   "body": "<p>Saat bidak lawan mendekati baris rumahmu, <b>makan bidak itu</b>. Jika dibiarkan, ia sampai dalam beberapa langkah.</p><p>Di sini memakan dengan {m} adalah satu-satunya pertahanan.</p>",
   "g": "Mainkan langkah yang menghentikan terobosan.",
   "h": "Dengan bidak mana kamu harus memakan penyusup agar masih bisa bertahan sesudahnya?",
   "y": "{m} menghentikannya — langkah lain membiarkan mereka lewat."
  },
  "b_win2": {
   "t": "Terobosan dalam dua langkah",
   "body": "<p>Bidak yang dua baris dari tujuan menang jika bisa <b>maju tanpa dimakan</b> — langkah berikutnya ia masuk. Pilih petak yang tidak bisa dimakan lawan.</p><p>Di sini {m} menembus dalam {n} langkah.</p>",
   "g": "Mainkan langkah yang menembus dalam dua langkah.",
   "h": "Petak depan mana yang tidak punya bidak lawan di depan serongnya?",
   "y": "{m} tidak bisa dimakan — berikutnya tujuan."
  },
  "s_break": {
   "t": "Serang di tempat yang tipis",
   "body": "<p>Bertahan butuh dua bidak atau lebih. <b>Kumpulkan penyerang di tempat yang kekurangan pembela</b> dan mereka tak bisa menghentikan semuanya.</p><p>Di sini {m} menembus dalam {n} langkah.</p>",
   "g": "Mainkan langkah pertama terobosan dalam {n}.",
   "h": "Di mana kamu bisa menyerang dengan bidak lebih banyak daripada pembela mereka?",
   "y": "{m} membawa penyerang lebih banyak daripada pembela."
  },
  "s_wall": {
   "t": "Bertahan dengan tembok",
   "body": "<p>Baris dan kolom bidak tidak bisa dilewati. Bertahan bukan hanya memakan: kadang kamu harus <b>menutup jalur masuk yang terbuka</b>.</p><p>Di sini {m} adalah satu-satunya pertahanan.</p>",
   "g": "Mainkan langkah yang bertahan.",
   "h": "Dari mana bidak lawan bisa menyelinap? Tutup di situ.",
   "y": "{m} menutup jalan masuk."
  },
  "s_trade": {
   "t": "Buka jalan dengan pertukaran",
   "body": "<p>Makan yang akan dimakan balik pun bisa menang: <b>menukar seorang pembela</b> bisa meloloskan bidakmu yang lain.</p><p>Di sini {m}, walau dimakan balik, menembus dalam {n} langkah.</p>",
   "g": "Mainkan langkah pertama terobosan dalam {n}.",
   "h": "Makan mana yang membuka jalan walau dimakan balik?",
   "y": "Setelah pertukaran {m}, mereka kekurangan satu pembela."
  },
  "s_tempo": {
   "t": "Menunggu dan memaksa mereka bergerak",
   "body": "<p>Tidak boleh pas di Breakthrough. <b>Langkah menunggu</b> yang menjaga bentukmu memaksa lawan merusak bentuknya lebih dulu (zugzwang).</p><p>Di sini {m} adalah langkah menunggu yang menang dalam {n}. Jika lawan boleh pas, kemenangan ini tidak ada.</p>",
   "g": "Mainkan langkah pertama kemenangan dalam {n}.",
   "h": "Setelah langkah mana setiap balasan lawan merusak bentuknya sendiri?",
   "y": "{m} mengembalikan giliran dan memaksa mereka merusak bentuk."
  },
  "s_race": {
   "t": "Hitung baris sampai tujuan",
   "body": "<p>Saat pertahanan habis, ini <b>balapan</b>: di antara bidak tak terhentikan, yang barisnya lebih sedikit menang. Hitung, lalu pilih langkah yang tiba lebih dulu.</p><p>Di sini {m} menang dalam {n}.</p>",
   "g": "Mainkan langkah pertama kemenangan dalam {n}.",
   "h": "Berapa baris yang dibutuhkan tiap pihak? Bisakah kamu menghentikan bidak mereka?",
   "y": "{m} memenangkan balapan."
  },
  "_ui": {
   "step": "Pemanasan {i}/{n}",
   "next": "Berikutnya",
   "main": "Ke soal",
   "skip": "Lewati pemanasan",
   "note": "(Langkah pemanasan tidak dinilai)",
   "look": "Lihat bidak yang bersinar.",
   "ans": "Jawaban: {m}",
   "ng": "Belum tepat. Posisi dikembalikan — coba lagi."
  }
 },
 "hi": {
  "b_cap": {
   "t": "मुफ़्त में ली जा सकने वाली गोटी खोजें",
   "body": "<p>जब एक से ज़्यादा गोटियाँ ले सकते हों, तो देखें कि <b>लेने के बाद वापस तो नहीं ली जाएगी</b>। जिस खाने पर आप पहुँचते हैं उसके तिरछे सामने विरोधी गोटी हो तो वह वापस ले सकती है।</p><p>यहाँ {m} को वापस नहीं लिया जा सकता।</p>",
   "g": "ऐसी गोटी लें जो वापस न ली जा सके।",
   "h": "लेने के बाद आपके खाने के तिरछे सामने कोई विरोधी गोटी है?",
   "y": "{m} वापस नहीं ली जा सकती — एक गोटी का फ़ायदा।"
  },
  "b_stop": {
   "t": "अंदर आती गोटी रोकें",
   "body": "<p>विरोधी गोटी आपकी घर की पंक्ति के पास आ जाए तो <b>उसे ले लें</b>। छोड़ देंगे तो कुछ ही चालों में वह पहुँच जाएगी।</p><p>यहाँ {m} से लेना ही एकमात्र बचाव है।</p>",
   "g": "वह चाल चलें जो सेंध रोके।",
   "h": "किस गोटी से घुसपैठिए को लें कि अगली बार भी बचाव कर सकें?",
   "y": "{m} उसे रोकती है — कोई भी दूसरी चाल रास्ता दे देती है।"
  },
  "b_win2": {
   "t": "दो चालों में सेंध",
   "body": "<p>मंज़िल से दो पंक्ति दूर की गोटी जीतती है अगर वह <b>बिना लिए आगे बढ़ सके</b> — अगली चाल में वह अंदर। ऐसा खाना चुनें जहाँ विरोधी ले न सके।</p><p>यहाँ {m} से {n} चालों में सेंध लगती है।</p>",
   "g": "दो चालों में सेंध लगाने वाली चाल चलें।",
   "h": "आगे के किस खाने के तिरछे सामने विरोधी गोटी नहीं है?",
   "y": "{m} ली नहीं जा सकती — अगली चाल मंज़िल।"
  },
  "s_break": {
   "t": "कमज़ोर जगह पर हमला करें",
   "body": "<p>बचाव के लिए दो या ज़्यादा गोटियाँ चाहिए। <b>हमलावर गोटियाँ वहाँ लाएँ जहाँ रक्षक कम हैं</b>, तो वे सबको नहीं रोक पाएँगे।</p><p>यहाँ {m} से {n} चालों में सेंध लगती है।</p>",
   "g": "{n} चालों की सेंध की पहली चाल चलें।",
   "h": "कहाँ आप उनके रक्षकों से ज़्यादा गोटियों से हमला कर सकते हैं?",
   "y": "{m} से हमलावर रक्षकों से ज़्यादा हो गए।"
  },
  "s_wall": {
   "t": "दीवार से बचाव",
   "body": "<p>गोटियों की पंक्ति और स्तंभ से बचकर नहीं निकला जा सकता। बचाव सिर्फ़ लेना नहीं है: कभी-कभी <b>खुला प्रवेश रास्ता बंद करना</b> पड़ता है।</p><p>यहाँ {m} ही एकमात्र बचाव है।</p>",
   "g": "वह चाल चलें जो टिके रहे।",
   "h": "विरोधी गोटी कहाँ से निकल सकती है? उसे बंद करें।",
   "y": "{m} अंदर का रास्ता बंद करती है।"
  },
  "s_trade": {
   "t": "अदला-बदली से रास्ता खोलें",
   "body": "<p>वापस ली जाने वाली पकड़ भी जीता सकती है: <b>एक रक्षक की अदला-बदली</b> आपकी दूसरी गोटी को निकलने दे सकती है।</p><p>यहाँ {m}, वापस लिए जाने पर भी, {n} चालों में सेंध लगाती है।</p>",
   "g": "{n} चालों की सेंध की पहली चाल चलें।",
   "h": "कौन-सी पकड़ वापस ली जाने पर भी रास्ता खोलती है?",
   "y": "{m} की अदला-बदली के बाद उनके पास एक रक्षक कम है।"
  },
  "s_tempo": {
   "t": "रुककर उन्हें चलने पर मजबूर करें",
   "body": "<p>ब्रेकथ्रू में चाल छोड़ नहीं सकते। आपकी बनावट बनाए रखने वाली <b>इंतज़ार की चाल</b> विरोधी को पहले अपनी बनावट तोड़ने पर मजबूर करती है (त्सुगत्स्वांग)।</p><p>यहाँ {m} वह इंतज़ार की चाल है जो {n} में जीतती है। अगर वे चाल छोड़ सकते, तो यह जीत नहीं होती।</p>",
   "g": "{n} में जीत की पहली चाल चलें।",
   "h": "किस चाल के बाद उनका हर जवाब उनकी अपनी बनावट तोड़ देता है?",
   "y": "{m} बारी लौटाकर उन्हें बनावट तोड़ने पर मजबूर करती है।"
  },
  "s_race": {
   "t": "मंज़िल तक की पंक्तियाँ गिनें",
   "body": "<p>बचाव ख़त्म होने पर यह <b>दौड़</b> है: न रुकने वाली गोटियों में जिसकी पंक्तियाँ कम बची हों, वह जीतती है। गिनिए, फिर पहले पहुँचने वाली चाल चुनिए।</p><p>यहाँ {m} से {n} में जीत।</p>",
   "g": "{n} में जीत की पहली चाल चलें।",
   "h": "हर पक्ष को कितनी पंक्तियाँ चाहिए? क्या आप उनकी गोटी रोक सकते हैं?",
   "y": "{m} दौड़ जीतती है।"
  },
  "_ui": {
   "step": "तैयारी {i}/{n}",
   "next": "आगे",
   "main": "मुख्य सवालों पर",
   "skip": "तैयारी छोड़ें",
   "note": "(तैयारी की चालों के अंक नहीं मिलते)",
   "look": "चमकती गोटियों को देखें।",
   "ans": "उत्तर: {m}",
   "ng": "ऐसा नहीं। स्थिति वापस जाती है — फिर कोशिश करें।"
  }
 },
 "ar": {
  "b_cap": {
   "t": "ابحث عن قطعة تأسرها مجانًا",
   "body": "<p>حين يمكنك أسر أكثر من قطعة، تحقّق <b>هل ستُؤسر في المقابل</b>. إن كانت قطعة للخصم قطريًا أمام المربع الذي تصل إليه، فيمكنها الأسر المضاد.</p><p>هنا لا يمكن الأسر المضاد بعد {m}.</p>",
   "g": "أسر قطعة لا يمكن الرد على أسرها.",
   "h": "بعد الأسر، هل توجد قطعة للخصم قطريًا أمام مربعك؟",
   "y": "لا يمكن الرد على {m} بالأسر — كسبت قطعة."
  },
  "b_stop": {
   "t": "أوقف القطعة الداخلة",
   "body": "<p>حين تقترب قطعة للخصم من صف بيتك، <b>أسرها</b>. إن تركتها وصلت خلال حركات قليلة.</p><p>هنا الأسر بـ {m} هو الدفاع الوحيد.</p>",
   "g": "العب الحركة التي توقف الاختراق.",
   "h": "بأي قطعة تأسر المتسلّل لتبقى قادرًا على الدفاع بعدها؟",
   "y": "{m} توقفها — أي حركة أخرى تسمح بالعبور."
  },
  "b_win2": {
   "t": "اختراق في حركتين",
   "body": "<p>القطعة التي تبعد صفين عن الهدف تفوز إن استطاعت <b>التقدّم دون أن تُؤسر</b> — في الحركة التالية تدخل. اختر مربعًا لا يستطيع الخصم الأسر فيه.</p><p>هنا {m} تخترق في {n} حركات.</p>",
   "g": "العب الحركة التي تخترق في حركتين.",
   "h": "أي مربع أمامك لا توجد قطعة للخصم قطريًا أمامه؟",
   "y": "لا يمكن أسر {m} — الهدف في الحركة التالية."
  },
  "s_break": {
   "t": "هاجم حيث الدفاع رقيق",
   "body": "<p>الدفاع يحتاج قطعتين أو أكثر. <b>اجمع مهاجميك حيث ينقص المدافعون</b> فلن يستطيعوا إيقافهم جميعًا.</p><p>هنا {m} تخترق في {n} حركات.</p>",
   "g": "العب أول حركة من اختراق في {n}.",
   "h": "أين يمكنك الهجوم بقطع أكثر من مدافعيهم؟",
   "y": "{m} تجلب مهاجمين أكثر من المدافعين."
  },
  "s_wall": {
   "t": "دافع بجدار",
   "body": "<p>لا يمكن الالتفاف حول صفوف القطع وأعمدتها. الدفاع ليس الأسر فقط: أحيانًا يجب <b>سدّ طريق الدخول المفتوح</b>.</p><p>هنا {m} هي الدفاع الوحيد.</p>",
   "g": "العب الحركة التي تصمد.",
   "h": "من أين يمكن لقطعة الخصم التسلّل؟ سدّ ذلك المكان.",
   "y": "{m} تسدّ طريق الدخول."
  },
  "s_trade": {
   "t": "افتح الطريق بالتبادل",
   "body": "<p>حتى الأسر الذي سيُرد عليه قد يفوز: <b>مبادلة مدافع</b> قد تفتح الطريق لقطعتك الأخرى.</p><p>هنا {m}، حتى مع الأسر المضاد، تخترق في {n} حركات.</p>",
   "g": "العب أول حركة من اختراق في {n}.",
   "h": "أي أسر يفتح الطريق حتى لو رُدّ عليه؟",
   "y": "بعد التبادل {m} ينقصهم مدافع."
  },
  "s_tempo": {
   "t": "انتظر واجعلهم يتحرّكون",
   "body": "<p>لا يوجد تمرير في «الاختراق». <b>حركة انتظار</b> تحافظ على شكلك تُجبر الخصم على كسر شكله أولًا (تسوغتسفانغ).</p><p>هنا {m} هي حركة الانتظار التي تفوز في {n}. لو استطاعوا التمرير لما كان هناك فوز.</p>",
   "g": "العب أول حركة من فوز في {n}.",
   "h": "بعد أي حركة يكسر كل رد منهم شكلهم بأنفسهم؟",
   "y": "{m} تعيد الدور وتُجبرهم على كسر شكلهم."
  },
  "s_race": {
   "t": "عدّ الصفوف حتى الهدف",
   "body": "<p>حين تزول الدفاعات يصبح الأمر <b>سباقًا</b>: بين القطع التي لا يمكن إيقافها تفوز صاحبة الصفوف الأقل. عدّ ثم اختر الحركة التي تصل أولًا.</p><p>هنا {m} تفوز في {n}.</p>",
   "g": "العب أول حركة من فوز في {n}.",
   "h": "كم صفًا يحتاج كل طرف؟ هل يمكنك إيقاف قطعتهم؟",
   "y": "{m} تفوز بالسباق."
  },
  "_ui": {
   "step": "تمهيد {i}/{n}",
   "next": "التالي",
   "main": "إلى المسائل",
   "skip": "تخطَّ التمهيد",
   "note": "(حركات التمهيد لا تُحتسب)",
   "look": "انظر إلى القطع المتوهّجة.",
   "ans": "الإجابة: {m}",
   "ng": "ليس تمامًا. يعود الوضع — حاول مرة أخرى."
  }
 },
 "zh-TW": {
  "b_cap": {
   "t": "尋找可以白吃的棋子",
   "body": "<p>能吃的棋子有兩個以上時，要確認<b>吃了之後會不會被回吃</b>。落子格的斜前方有對方棋子，就會被回吃。</p><p>這裡走 {m} 不會被回吃。</p>",
   "g": "選擇不會被回吃的吃法。",
   "h": "吃完後，你所在格的斜前方有對方棋子嗎？",
   "y": "{m} 不會被回吃，多得一子。"
  },
  "b_stop": {
   "t": "阻止入侵的棋子",
   "body": "<p>對方棋子逼近你的底線時，基本做法是<b>吃掉它</b>。放著不管，幾步之內就會到達終點。</p><p>這裡用 {m} 吃掉，是唯一的防守。</p>",
   "g": "走出阻止突破的一步。",
   "h": "用哪枚棋子吃掉入侵者，下一步還能繼續防守？",
   "y": "{m} 擋住了。其他著法都會被突破。"
  },
  "b_win2": {
   "t": "兩步突破",
   "body": "<p>離終點還有兩行的棋子，只要<b>前進一步而不被吃</b>，下一步就能到達。要選對方吃不到的格子。</p><p>這裡從 {m} 開始，{n} 步就能突破。</p>",
   "g": "走出兩步突破的一步。",
   "h": "前方哪個格子的斜前方沒有對方棋子？",
   "y": "{m} 不會被吃，下一步就到終點。"
  },
  "s_break": {
   "t": "攻擊薄弱處",
   "body": "<p>防守需要兩枚以上的棋子。<b>把進攻棋子集中到防守者不足的地方</b>，對方就擋不住全部。</p><p>這裡從 {m} 開始，{n} 步就能突破。</p>",
   "g": "走出 {n} 步突破的第一步。",
   "h": "哪裡能用比對方防守者更多的棋子進攻？",
   "y": "{m} 讓進攻棋子多過了防守者。"
  },
  "s_wall": {
   "t": "用牆防守",
   "body": "<p>橫排、縱列的棋子無法被繞過。防守不只是吃子，有時需要<b>堵住空出的入侵路線</b>。</p><p>這裡 {m} 是唯一的防守。</p>",
   "g": "走出守得住的一步。",
   "h": "對方棋子能從哪裡溜過去？把那裡堵上。",
   "y": "{m} 堵住了入侵路線。"
  },
  "s_trade": {
   "t": "用交換開啟通路",
   "body": "<p>即使是會被回吃的吃法，<b>通過交換減少防守者</b>，剩下的棋子也可能突破。</p><p>這裡走 {m} 吃子，即使被回吃，也能在 {n} 步內突破。</p>",
   "g": "走出 {n} 步突破的第一步。",
   "h": "哪種吃法即使被回吃，之後也能開啟通路？",
   "y": "{m} 交換後，對方的防守者不夠了。"
  },
  "s_tempo": {
   "t": "等著，讓對方先動",
   "body": "<p>突破棋不能停一手。走一步不破壞防守陣形的<b>等著</b>，對方就必須先破壞自己的陣形（楚茨文格）。</p><p>這裡 {m} 是 {n} 步取勝的等著。如果對方能停一手，這個勝利就不存在。</p>",
   "g": "走出 {n} 步取勝的第一步。",
   "h": "走哪一步之後，對方無論怎麼走都會破壞自己的陣形？",
   "y": "{m} 把走棋權交還對方，迫使對方破壞陣形。"
  },
  "s_race": {
   "t": "數到終點的行數",
   "body": "<p>防守崩潰後的殘局是<b>競速</b>：無法阻擋的棋子之間，離終點行數少的一方獲勝。先數清楚，再選先到的著法。</p><p>這裡從 {m} 開始，{n} 步取勝。</p>",
   "g": "走出 {n} 步取勝的第一步。",
   "h": "你和對方到終點各差幾行？能阻止對方的棋子嗎？",
   "y": "{m} 贏得了競速。"
  },
  "_ui": {
   "step": "準備 {i}/{n}",
   "next": "下一步",
   "main": "進入正式題目",
   "skip": "跳過準備",
   "note": "（準備題不計分）",
   "look": "看看發光的棋子。",
   "ans": "答案：{m}",
   "ng": "好像不對。局面會退回，再想一想。"
  }
 }
};
