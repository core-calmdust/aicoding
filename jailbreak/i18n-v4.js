/* だつごくスライダー！ — texts for the 2026-10 rules (laser / heavy safe / shutters / lights / vents) and 10-cell time attack. 10 languages; wins over earlier files. */
(function () {
'use strict';
const I = window.JB_I18N = window.JB_I18N || {};
const add = (l, o) => { I[l] = Object.assign(I[l] || {}, o); };
add('ja', {
  'mo.laser': 'レーザー', 'mo.laser.s': '赤い光線に囚人は入れない。', 'mo.laser.r': '壁の発射口から赤いレーザーが出ています。囚人はレーザーの上に入れません。ブロックや木箱を置けば光線をさえぎれます。',
  'mo.heavy': '重い金庫', 'mo.heavy.s': '金庫は1手に1マスしか動かない。', 'mo.heavy.r': '鉄の金庫はとても重く、1手で1マスしか動かせません。ほかのブロックは今までどおり何マスでも動かせます。',
  'mo.shutter': '交互シャッター', 'mo.shutter.s': '赤と青のシャッターが1手ごとに入れ替わる。', 'mo.shutter.r': '1手ごとに赤と青のシャッターが交互に閉まります（最初は赤が閉まっている）。閉まったマスには入れません。シャッターの上にいるブロックは閉じ込められず、そのまま動けます。',
  'mo.lights': '消灯スイッチ', 'mo.lights.s': 'スイッチを踏むと看守が回れ右。', 'mo.lights.r': 'ブロックや囚人がスイッチのマスに乗ると一瞬消灯！ 驚いた看守が全員その場で向きを反対にします。看守は1手ごとに歩きます。',
  'mo.vent': '通気ダクト', 'mo.vent.s': '小さな木箱はダクトでワープ。', 'mo.vent.r': '1マスの木箱がダクトの上で止まると、もう一方のダクトから出てきます（出口側がふさがっていなければ）。囚人は大きすぎて入れません。',
  'mo.ta': '10連タイムアタック', 'mo.ta.s': '10部屋を連続で脱出するタイムを競う。', 'mo.ta.r': 'だんだん難しくなる10部屋を続けて脱出し、合計タイムを競います。部屋は毎日変わり、全員同じ問題。ルール説明中は時間が止まります。',
  'in.laser': '囚人はレーザーに入れない。', 'in.heavy': '金庫は1手1マス。', 'in.shutter': '赤と青が1手ごとに入れ替わる。', 'in.lights': 'スイッチで看守が回れ右。', 'in.vent': '木箱はダクトでワープ。', 'in.ta': '10部屋をノンストップで！',
  'ex.laser': '木箱でレーザーをさえぎってから囚人を通そう。', 'ex.heavy': '金庫は1マスずつしか動かない。', 'ex.shutter': '赤が閉まっている間は、青のほうが通れる。', 'ex.lights': 'スイッチを踏むと看守が反対向きに。', 'ex.vent': '木箱がダクトに止まると反対側から出てくる。', 'ex.ta': '10部屋を脱出するまでのタイムを競う。',
  'tip.lights': '消灯！ 看守が回れ右した！', 'ta.q': '部屋', 'ach.ta1': '10連タイムアタックを完走', 'ach.ta60': '10連タイムアタックを60秒以内',
  'ach.modesAll': 'ルールモード全750問クリア',
});
add('en', {
  'mo.laser': 'Lasers', 'mo.laser.s': 'Inmates can’t step into the red beam.', 'mo.laser.r': 'Emitters in the walls fire red lasers. Inmates can’t step into a beam. Put a block or crate in the way to cut it.',
  'mo.heavy': 'Heavy Safe', 'mo.heavy.s': 'The safe moves only one cell a move.', 'mo.heavy.r': 'The steel safe is very heavy: each move shifts it just one cell. Other blocks still slide as far as you like.',
  'mo.shutter': 'Shutters', 'mo.shutter.s': 'Red and blue shutters swap every move.', 'mo.shutter.r': 'Red and blue shutters close in turn with every move (red starts closed). Nothing can enter a closed one; a block already standing in one is not trapped.',
  'mo.lights': 'Lights Out', 'mo.lights.s': 'Hit the switch and the guards turn round.', 'mo.lights.r': 'When a block or an inmate lands on the switch, the lights go out for a moment and every guard turns round where he stands. Guards walk with every move.',
  'mo.vent': 'Air Vents', 'mo.vent.s': 'Small crates warp through the vent.', 'mo.vent.r': 'A one-cell crate that stops on a vent comes out of the other vent (if it is free). Inmates are too big to fit.',
  'mo.ta': '10-Cell Time Attack', 'mo.ta.s': 'Race through 10 cells in a row.', 'mo.ta.r': 'Escape 10 cells in a row, each a little harder, as fast as you can. The cells change every day and are the same for everyone. The clock stops while a rule is explained.',
  'in.laser': 'Inmates can’t enter a beam.', 'in.heavy': 'The safe moves one cell a move.', 'in.shutter': 'Red and blue swap every move.', 'in.lights': 'The switch turns the guards round.', 'in.vent': 'Crates warp through vents.', 'in.ta': '10 cells, non-stop!',
  'ex.laser': 'Block the beam with the crate, then walk the inmate out.', 'ex.heavy': 'The safe moves only one cell at a time.', 'ex.shutter': 'While red is shut, blue is open.', 'ex.lights': 'Step on the switch and the guard turns round.', 'ex.vent': 'A crate stopping on a vent pops out of the other one.', 'ex.ta': 'Your time over 10 escapes.',
  'tip.lights': 'Lights out! The guards turned round!', 'ta.q': 'Cell', 'ach.ta1': 'Finish a 10-cell time attack', 'ach.ta60': '10-cell time attack under 60 s',
  'ach.modesAll': 'Clear all 750 rule-mode stages',
});
add('zh', {
  'mo.laser': '激光', 'mo.laser.s': '囚犯不能进入红色激光。', 'mo.laser.r': '墙上的发射口射出红色激光。囚犯不能走进激光。放一个方块或木箱就能挡住光线。',
  'mo.heavy': '沉重保险箱', 'mo.heavy.s': '保险箱每步只能移动1格。', 'mo.heavy.r': '铁保险箱非常重，每步只能移动1格。其他方块照常想滑多远都行。',
  'mo.shutter': '交替闸门', 'mo.shutter.s': '红蓝闸门每步交替开关。', 'mo.shutter.r': '每走一步，红色和蓝色闸门轮流关闭（一开始红色关闭）。关闭的格子不能进入；已经停在闸门上的方块不会被困住。',
  'mo.lights': '熄灯开关', 'mo.lights.s': '踩开关，看守就转身。', 'mo.lights.r': '方块或囚犯停到开关上时会瞬间熄灯，所有看守原地掉头。看守每步都会走。',
  'mo.vent': '通风管', 'mo.vent.s': '小木箱可以通过通风管传送。', 'mo.vent.r': '1格的木箱停在通风口上时，会从另一个通风口出来（如果那里空着）。囚犯太大钻不进去。',
  'mo.ta': '10连计时赛', 'mo.ta.s': '连续逃出10间牢房比速度。', 'mo.ta.r': '连续逃出10间逐渐变难的牢房，比较总用时。牢房每天更换，所有人题目相同。规则说明时计时暂停。',
  'in.laser': '囚犯不能进入激光。', 'in.heavy': '保险箱每步1格。', 'in.shutter': '红蓝每步交替。', 'in.lights': '开关让看守转身。', 'in.vent': '木箱通过通风管传送。', 'in.ta': '10间牢房不停歇！',
  'ex.laser': '先用木箱挡住激光，再让囚犯通过。', 'ex.heavy': '保险箱只能一格一格移动。', 'ex.shutter': '红色关闭时，蓝色是开着的。', 'ex.lights': '踩下开关，看守就会掉头。', 'ex.vent': '木箱停在通风口，会从另一头出来。', 'ex.ta': '比拼逃出10间牢房的时间。',
  'tip.lights': '熄灯！看守转身了！', 'ta.q': '牢房', 'ach.ta1': '完成10连计时赛', 'ach.ta60': '60秒内完成10连计时赛',
  'ach.modesAll': '通关全部750个规则模式关卡',
});
add('ko', {
  'mo.laser': '레이저', 'mo.laser.s': '죄수는 빨간 광선에 들어갈 수 없다.', 'mo.laser.r': '벽의 발사구에서 빨간 레이저가 나온다. 죄수는 레이저 위로 들어갈 수 없다. 블록이나 나무상자를 놓으면 광선을 막을 수 있다.',
  'mo.heavy': '무거운 금고', 'mo.heavy.s': '금고는 한 수에 한 칸만.', 'mo.heavy.r': '철 금고는 아주 무거워서 한 수에 한 칸만 움직인다. 다른 블록은 평소처럼 몇 칸이든 움직일 수 있다.',
  'mo.shutter': '교대 셔터', 'mo.shutter.s': '빨강・파랑 셔터가 한 수마다 바뀐다.', 'mo.shutter.r': '한 수마다 빨강과 파랑 셔터가 번갈아 닫힌다(처음엔 빨강이 닫힘). 닫힌 칸에는 들어갈 수 없다. 이미 셔터 위에 있는 블록은 갇히지 않는다.',
  'mo.lights': '소등 스위치', 'mo.lights.s': '스위치를 밟으면 간수가 뒤로 돈다.', 'mo.lights.r': '블록이나 죄수가 스위치 칸에 올라가면 순간 소등! 놀란 간수가 모두 제자리에서 방향을 바꾼다. 간수는 한 수마다 걷는다.',
  'mo.vent': '환기 덕트', 'mo.vent.s': '작은 상자는 덕트로 워프.', 'mo.vent.r': '1칸 나무상자가 덕트 위에 멈추면 다른 덕트로 나온다(비어 있을 때). 죄수는 너무 커서 못 들어간다.',
  'mo.ta': '10연속 타임어택', 'mo.ta.s': '10개 감방을 연속 탈출하는 시간 승부.', 'mo.ta.r': '점점 어려워지는 10개 감방을 연속으로 탈출해 합계 시간을 겨룬다. 감방은 매일 바뀌고 모두 같은 문제. 규칙 설명 중에는 시간이 멈춘다.',
  'in.laser': '죄수는 레이저에 못 들어간다.', 'in.heavy': '금고는 한 수에 한 칸.', 'in.shutter': '빨강・파랑이 한 수마다 교대.', 'in.lights': '스위치로 간수가 뒤로 돈다.', 'in.vent': '상자는 덕트로 워프.', 'in.ta': '10개 감방 논스톱!',
  'ex.laser': '상자로 레이저를 막고 죄수를 통과시키자.', 'ex.heavy': '금고는 한 칸씩만 움직인다.', 'ex.shutter': '빨강이 닫힌 동안 파랑은 열려 있다.', 'ex.lights': '스위치를 밟으면 간수가 반대로.', 'ex.vent': '상자가 덕트에 멈추면 반대편에서 나온다.', 'ex.ta': '10개 감방 탈출 시간 승부.',
  'tip.lights': '소등! 간수가 뒤로 돌았다!', 'ta.q': '감방', 'ach.ta1': '10연속 타임어택 완주', 'ach.ta60': '10연속 타임어택 60초 이내',
  'ach.modesAll': '규칙 모드 750스테이지 전부 클리어',
});
add('es', {
  'mo.laser': 'Láseres', 'mo.laser.s': 'Los presos no pueden entrar en el rayo rojo.', 'mo.laser.r': 'Emisores en las paredes disparan láseres rojos. Un preso no puede entrar en un rayo. Pon un bloque o una caja delante para cortarlo.',
  'mo.heavy': 'Caja fuerte', 'mo.heavy.s': 'La caja fuerte avanza una casilla por jugada.', 'mo.heavy.r': 'La caja fuerte de acero pesa muchísimo: cada jugada la mueve solo una casilla. Los demás bloques se deslizan lo que quieras.',
  'mo.shutter': 'Persianas', 'mo.shutter.s': 'Las persianas roja y azul se turnan.', 'mo.shutter.r': 'Con cada jugada se cierran por turnos las persianas rojas y azules (al principio, la roja). Nada entra en una cerrada; un bloque que ya está encima no queda atrapado.',
  'mo.lights': 'Apagón', 'mo.lights.s': 'Pisa el interruptor y los guardias se giran.', 'mo.lights.r': 'Cuando un bloque o un preso cae en el interruptor, se apagan las luces un instante y todos los guardias se dan la vuelta. Los guardias andan con cada jugada.',
  'mo.vent': 'Conductos', 'mo.vent.s': 'Las cajas pequeñas se teletransportan.', 'mo.vent.r': 'Una caja de una casilla que se para en un conducto sale por el otro (si está libre). Los presos no caben.',
  'mo.ta': 'Contrarreloj de 10', 'mo.ta.s': 'Escapa de 10 celdas seguidas a toda prisa.', 'mo.ta.r': 'Escapa de 10 celdas seguidas, cada una algo más difícil, lo más rápido posible. Cambian cada día y son iguales para todos. El reloj se para mientras se explica una regla.',
  'in.laser': 'Los presos no entran en un rayo.', 'in.heavy': 'La caja fuerte, una casilla por jugada.', 'in.shutter': 'Roja y azul se turnan cada jugada.', 'in.lights': 'El interruptor gira a los guardias.', 'in.vent': 'Las cajas viajan por los conductos.', 'in.ta': '¡10 celdas sin parar!',
  'ex.laser': 'Corta el rayo con la caja y saca al preso.', 'ex.heavy': 'La caja fuerte va casilla a casilla.', 'ex.shutter': 'Mientras la roja está cerrada, la azul está abierta.', 'ex.lights': 'Pisa el interruptor y el guardia se gira.', 'ex.vent': 'La caja que para en un conducto sale por el otro.', 'ex.ta': 'Tu tiempo en 10 fugas.',
  'tip.lights': '¡Apagón! ¡Los guardias se han girado!', 'ta.q': 'Celda', 'ach.ta1': 'Termina una contrarreloj de 10', 'ach.ta60': 'Contrarreloj de 10 en menos de 60 s',
  'ach.modesAll': 'Supera las 750 fases de modos',
});
add('fr', {
  'mo.laser': 'Lasers', 'mo.laser.s': 'Les détenus ne peuvent pas entrer dans le rayon rouge.', 'mo.laser.r': 'Des émetteurs dans les murs tirent des lasers rouges. Un détenu ne peut pas entrer dans un rayon. Place un bloc ou une caisse devant pour le couper.',
  'mo.heavy': 'Coffre-fort', 'mo.heavy.s': 'Le coffre n’avance que d’une case par coup.', 'mo.heavy.r': 'Le coffre en acier est très lourd : chaque coup ne le déplace que d’une case. Les autres blocs glissent aussi loin que tu veux.',
  'mo.shutter': 'Volets', 'mo.shutter.s': 'Les volets rouges et bleus alternent.', 'mo.shutter.r': 'À chaque coup, les volets rouges et bleus se ferment à tour de rôle (le rouge est fermé au début). Rien n’entre dans un volet fermé ; un bloc déjà dessus n’est pas coincé.',
  'mo.lights': 'Coupure de courant', 'mo.lights.s': 'L’interrupteur fait demi-tour aux gardes.', 'mo.lights.r': 'Quand un bloc ou un détenu arrive sur l’interrupteur, la lumière s’éteint un instant et tous les gardes font demi-tour. Les gardes marchent à chaque coup.',
  'mo.vent': 'Conduits d’aération', 'mo.vent.s': 'Les petites caisses passent par les conduits.', 'mo.vent.r': 'Une caisse d’une case qui s’arrête sur un conduit ressort par l’autre (s’il est libre). Les détenus sont trop gros.',
  'mo.ta': 'Contre-la-montre 10', 'mo.ta.s': 'Évade-toi de 10 cellules d’affilée, vite.', 'mo.ta.r': 'Évade-toi de 10 cellules d’affilée, de plus en plus dures, le plus vite possible. Elles changent chaque jour et sont les mêmes pour tous. Le chrono s’arrête pendant l’explication d’une règle.',
  'in.laser': 'Les détenus n’entrent pas dans un rayon.', 'in.heavy': 'Le coffre : une case par coup.', 'in.shutter': 'Rouge et bleu alternent à chaque coup.', 'in.lights': 'L’interrupteur retourne les gardes.', 'in.vent': 'Les caisses passent par les conduits.', 'in.ta': '10 cellules sans pause !',
  'ex.laser': 'Coupe le rayon avec la caisse, puis fais sortir le détenu.', 'ex.heavy': 'Le coffre avance case par case.', 'ex.shutter': 'Quand le rouge est fermé, le bleu est ouvert.', 'ex.lights': 'Marche sur l’interrupteur et le garde fait demi-tour.', 'ex.vent': 'Une caisse arrêtée sur un conduit ressort de l’autre.', 'ex.ta': 'Ton temps sur 10 évasions.',
  'tip.lights': 'Coupure ! Les gardes ont fait demi-tour !', 'ta.q': 'Cellule', 'ach.ta1': 'Finir un contre-la-montre 10', 'ach.ta60': 'Contre-la-montre 10 en moins de 60 s',
  'ach.modesAll': 'Réussir les 750 niveaux des modes',
});
add('pt', {
  'mo.laser': 'Lasers', 'mo.laser.s': 'Os presos não podem entrar no raio vermelho.', 'mo.laser.r': 'Emissores nas paredes disparam lasers vermelhos. Um preso não pode entrar num raio. Ponha um bloco ou caixa na frente para cortá-lo.',
  'mo.heavy': 'Cofre pesado', 'mo.heavy.s': 'O cofre anda só uma casa por jogada.', 'mo.heavy.r': 'O cofre de aço é muito pesado: cada jogada o move só uma casa. Os outros blocos deslizam quanto quiser.',
  'mo.shutter': 'Persianas', 'mo.shutter.s': 'Persianas vermelha e azul se alternam.', 'mo.shutter.r': 'A cada jogada, as persianas vermelhas e azuis fecham alternadamente (a vermelha começa fechada). Nada entra numa fechada; um bloco que já está nela não fica preso.',
  'mo.lights': 'Apagão', 'mo.lights.s': 'Pise no interruptor e os guardas se viram.', 'mo.lights.r': 'Quando um bloco ou preso para no interruptor, as luzes apagam por um instante e todos os guardas dão meia-volta. Os guardas andam a cada jogada.',
  'mo.vent': 'Dutos de ar', 'mo.vent.s': 'Caixas pequenas passam pelos dutos.', 'mo.vent.r': 'Uma caixa de uma casa que para num duto sai pelo outro (se estiver livre). Os presos são grandes demais.',
  'mo.ta': 'Contra o relógio 10', 'mo.ta.s': 'Fuja de 10 celas seguidas o mais rápido possível.', 'mo.ta.r': 'Fuja de 10 celas seguidas, cada uma um pouco mais difícil, o mais rápido possível. Mudam todo dia e são iguais para todos. O relógio para durante a explicação de uma regra.',
  'in.laser': 'Presos não entram num raio.', 'in.heavy': 'O cofre: uma casa por jogada.', 'in.shutter': 'Vermelha e azul se alternam.', 'in.lights': 'O interruptor vira os guardas.', 'in.vent': 'Caixas viajam pelos dutos.', 'in.ta': '10 celas sem parar!',
  'ex.laser': 'Corte o raio com a caixa e tire o preso.', 'ex.heavy': 'O cofre anda casa por casa.', 'ex.shutter': 'Enquanto a vermelha está fechada, a azul está aberta.', 'ex.lights': 'Pise no interruptor e o guarda se vira.', 'ex.vent': 'A caixa que para num duto sai pelo outro.', 'ex.ta': 'Seu tempo em 10 fugas.',
  'tip.lights': 'Apagão! Os guardas se viraram!', 'ta.q': 'Cela', 'ach.ta1': 'Termine um contra o relógio 10', 'ach.ta60': 'Contra o relógio 10 em menos de 60 s',
  'ach.modesAll': 'Passe as 750 fases dos modos',
});
add('de', {
  'mo.laser': 'Laser', 'mo.laser.s': 'Häftlinge dürfen nicht in den roten Strahl.', 'mo.laser.r': 'Sender in den Wänden schießen rote Laser. Häftlinge können nicht in einen Strahl gehen. Stell einen Block oder eine Kiste davor, um ihn zu unterbrechen.',
  'mo.heavy': 'Schwerer Tresor', 'mo.heavy.s': 'Der Tresor bewegt sich nur ein Feld pro Zug.', 'mo.heavy.r': 'Der Stahltresor ist sehr schwer: Jeder Zug schiebt ihn nur ein Feld. Andere Blöcke gleiten so weit du willst.',
  'mo.shutter': 'Rollgitter', 'mo.shutter.s': 'Rote und blaue Gitter wechseln jeden Zug.', 'mo.shutter.r': 'Mit jedem Zug schließen abwechselnd die roten und die blauen Gitter (zu Beginn das rote). In ein geschlossenes Gitter kommt nichts hinein; ein Block, der schon darauf steht, bleibt beweglich.',
  'mo.lights': 'Licht aus', 'mo.lights.s': 'Schalter drücken – die Wärter drehen um.', 'mo.lights.r': 'Landet ein Block oder Häftling auf dem Schalter, geht kurz das Licht aus und alle Wärter drehen auf der Stelle um. Wärter gehen mit jedem Zug.',
  'mo.vent': 'Lüftungsschacht', 'mo.vent.s': 'Kleine Kisten reisen durch den Schacht.', 'mo.vent.r': 'Eine 1-Feld-Kiste, die auf einem Schacht anhält, kommt aus dem anderen heraus (wenn er frei ist). Häftlinge sind zu groß.',
  'mo.ta': '10er-Zeitrennen', 'mo.ta.s': 'Flieh aus 10 Zellen hintereinander – auf Zeit.', 'mo.ta.r': 'Flieh aus 10 Zellen hintereinander, jede etwas schwerer, so schnell du kannst. Die Zellen wechseln täglich und sind für alle gleich. Während eine Regel erklärt wird, steht die Uhr.',
  'in.laser': 'Häftlinge nicht in den Strahl.', 'in.heavy': 'Tresor: ein Feld pro Zug.', 'in.shutter': 'Rot und Blau wechseln jeden Zug.', 'in.lights': 'Der Schalter dreht die Wärter um.', 'in.vent': 'Kisten reisen durch Schächte.', 'in.ta': '10 Zellen ohne Pause!',
  'ex.laser': 'Unterbrich den Strahl mit der Kiste, dann lauf raus.', 'ex.heavy': 'Der Tresor bewegt sich Feld für Feld.', 'ex.shutter': 'Solange Rot zu ist, ist Blau offen.', 'ex.lights': 'Tritt auf den Schalter und der Wärter dreht um.', 'ex.vent': 'Eine Kiste auf einem Schacht kommt aus dem anderen.', 'ex.ta': 'Deine Zeit für 10 Ausbrüche.',
  'tip.lights': 'Licht aus! Die Wärter haben umgedreht!', 'ta.q': 'Zelle', 'ach.ta1': 'Ein 10er-Zeitrennen beenden', 'ach.ta60': '10er-Zeitrennen unter 60 s',
  'ach.modesAll': 'Alle 750 Modusstufen lösen',
});
add('hi', {
  'mo.laser': 'लेज़र', 'mo.laser.s': 'कैदी लाल किरण में नहीं जा सकते।', 'mo.laser.r': 'दीवारों में लगे यंत्र लाल लेज़र छोड़ते हैं। कैदी किरण में नहीं जा सकता। किरण रोकने के लिए सामने कोई ब्लॉक या बक्सा रखो।',
  'mo.heavy': 'भारी तिजोरी', 'mo.heavy.s': 'तिजोरी एक चाल में सिर्फ़ एक खाना।', 'mo.heavy.r': 'स्टील की तिजोरी बहुत भारी है: हर चाल में वह सिर्फ़ एक खाना खिसकती है। बाकी ब्लॉक पहले की तरह जितना चाहो खिसकते हैं।',
  'mo.shutter': 'बदलते शटर', 'mo.shutter.s': 'लाल और नीले शटर हर चाल बदलते हैं।', 'mo.shutter.r': 'हर चाल पर लाल और नीले शटर बारी-बारी से बंद होते हैं (शुरू में लाल बंद)। बंद शटर में कुछ नहीं जा सकता; जो ब्लॉक पहले से उस पर है वह फँसता नहीं।',
  'mo.lights': 'बत्ती गुल', 'mo.lights.s': 'स्विच दबाओ, पहरेदार पलट जाएँगे।', 'mo.lights.r': 'जब कोई ब्लॉक या कैदी स्विच पर आता है तो पल भर बत्ती बुझती है और सारे पहरेदार वहीं पलट जाते हैं। पहरेदार हर चाल पर चलते हैं।',
  'mo.vent': 'हवा की नली', 'mo.vent.s': 'छोटे बक्से नली से निकल जाते हैं।', 'mo.vent.r': 'एक खाने का बक्सा नली पर रुके तो दूसरी नली से निकलता है (अगर वह खाली हो)। कैदी बहुत बड़े हैं।',
  'mo.ta': '10 कोठरी टाइम अटैक', 'mo.ta.s': 'लगातार 10 कोठरियों से भागो, समय के साथ।', 'mo.ta.r': 'लगातार 10 कोठरियों से, हर एक थोड़ी कठिन, जितनी जल्दी हो सके भागो। कोठरियाँ रोज़ बदलती हैं और सबके लिए एक जैसी। नियम समझाते समय घड़ी रुकी रहती है।',
  'in.laser': 'कैदी किरण में नहीं जाते।', 'in.heavy': 'तिजोरी: एक चाल, एक खाना।', 'in.shutter': 'लाल-नीला हर चाल बदलता है।', 'in.lights': 'स्विच पहरेदारों को पलटता है।', 'in.vent': 'बक्से नली से निकलते हैं।', 'in.ta': '10 कोठरियाँ, बिना रुके!',
  'ex.laser': 'बक्से से किरण रोको, फिर कैदी को निकालो।', 'ex.heavy': 'तिजोरी एक-एक खाना चलती है।', 'ex.shutter': 'जब लाल बंद हो, नीला खुला है।', 'ex.lights': 'स्विच दबाओ, पहरेदार पलट जाएगा।', 'ex.vent': 'नली पर रुका बक्सा दूसरी से निकलता है।', 'ex.ta': '10 भागने का कुल समय।',
  'tip.lights': 'बत्ती गुल! पहरेदार पलट गए!', 'ta.q': 'कोठरी', 'ach.ta1': '10 कोठरी टाइम अटैक पूरा करो', 'ach.ta60': '60 सेकंड में 10 कोठरी टाइम अटैक',
  'ach.modesAll': 'मोड के सभी 750 स्टेज पार करें',
});
add('ar', {
  'mo.laser': 'الليزر', 'mo.laser.s': 'لا يدخل السجين الشعاع الأحمر.', 'mo.laser.r': 'تطلق أجهزة في الجدران أشعة ليزر حمراء. لا يستطيع السجين دخول الشعاع. ضع كتلة أو صندوقًا أمامه لقطعه.',
  'mo.heavy': 'الخزنة الثقيلة', 'mo.heavy.s': 'الخزنة تتحرك خانة واحدة فقط كل حركة.', 'mo.heavy.r': 'الخزنة الفولاذية ثقيلة جدًا: كل حركة تزيحها خانة واحدة فقط. أما بقية الكتل فتنزلق كما تشاء.',
  'mo.shutter': 'البوابات المتناوبة', 'mo.shutter.s': 'البوابات الحمراء والزرقاء تتبادل كل حركة.', 'mo.shutter.r': 'مع كل حركة تُغلق البوابات الحمراء والزرقاء بالتناوب (الحمراء مغلقة في البداية). لا يدخل شيء بوابة مغلقة، والكتلة الواقفة عليها أصلًا لا تُحبس.',
  'mo.lights': 'إطفاء الأنوار', 'mo.lights.s': 'اضغط المفتاح فيستدير الحراس.', 'mo.lights.r': 'عندما تقف كتلة أو سجين على المفتاح تنطفئ الأنوار لحظة ويستدير كل الحراس في أماكنهم. يمشي الحراس مع كل حركة.',
  'mo.vent': 'فتحات التهوية', 'mo.vent.s': 'الصناديق الصغيرة تنتقل عبر الفتحات.', 'mo.vent.r': 'الصندوق ذو الخانة الواحدة إذا توقف على فتحة يخرج من الأخرى (إن كانت فارغة). السجناء أكبر من أن يدخلوها.',
  'mo.ta': 'تحدي الوقت ١٠', 'mo.ta.s': 'اهرب من ١٠ زنازين متتالية بأسرع وقت.', 'mo.ta.r': 'اهرب من ١٠ زنازين متتالية، كل واحدة أصعب قليلًا، بأسرع ما يمكن. تتغير يوميًا وهي نفسها للجميع. يتوقف المؤقت أثناء شرح القاعدة.',
  'in.laser': 'لا يدخل السجين الشعاع.', 'in.heavy': 'الخزنة: خانة لكل حركة.', 'in.shutter': 'الأحمر والأزرق يتبادلان كل حركة.', 'in.lights': 'المفتاح يدير الحراس.', 'in.vent': 'الصناديق تنتقل عبر الفتحات.', 'in.ta': '١٠ زنازين بلا توقف!',
  'ex.laser': 'اقطع الشعاع بالصندوق ثم أخرج السجين.', 'ex.heavy': 'الخزنة تتحرك خانة خانة.', 'ex.shutter': 'ما دام الأحمر مغلقًا فالأزرق مفتوح.', 'ex.lights': 'قف على المفتاح فيستدير الحارس.', 'ex.vent': 'الصندوق المتوقف على فتحة يخرج من الأخرى.', 'ex.ta': 'وقتك في ١٠ عمليات هروب.',
  'tip.lights': 'انطفأت الأنوار! استدار الحراس!', 'ta.q': 'زنزانة', 'ach.ta1': 'أكمل تحدي الوقت ١٠', 'ach.ta60': 'تحدي الوقت ١٠ في أقل من ٦٠ ث',
  'ach.modesAll': 'أنهِ مراحل الأوضاع الـ750 كلها',
});
})();
