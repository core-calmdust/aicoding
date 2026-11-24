/* =====================================================================
   Patolli on the portal (claude/patolli-spec.md).
   · The board card: levels Lv.1–20 (ratings = the game's RT_LV, patolli/app.js; descriptions = its lvd lines), who starts,
     種目 = the full game's two rule sets (size 1 Bell's reconstruction — the default · 2 the popular rules; the full game
     takes it as &size=, atlas/skin/patolli.js).
   · Table play (ちゃぶ台で遊ぶ): the game's own engine and AI (../patolli/engine.js on the page, ../patolli/worker.js for the
     AI — the same files and cache keys as patolli/index.html), vs the AI or two players on one device. You are always the near
     side (red, engine side 0). Throw the five beans, tap a piece (or its destination): every piece has one move per throw.
     The stakes are heaps of beads with their numbers; a payment flies from heap to heap. Extra throws, passes, the round
     change and bankruptcy of the popular rules, 待った · ヒント · 投了.
   · Rated games, lessons and puzzles: the full game (patolli/?skin=atlas; no online play yet, so レート戦 = vs the AI there).
   The words below (TX) are the full game's own (patolli/i18n.js, patolli/tour.js — copied per key, 14 languages), so both
   say the same thing; change them there first.
   ===================================================================== */
(function () {
  'use strict';
  const TX = {
    "ja": {"roll":"投げる","pass":"パス","zero":"印は0個：進めません","noMove":"動かせる駒がありません","move":"{n}マス進めます。動かす駒を選んでください","again":"もう一度！","againSub":"腕の先のマス：もう一度投げられます","pen":"印のマス","give":"{s}へ宝を{a}払います","get":"{s}から宝を{a}もらいます","homeX":"上がり！","cap":"取った！","capd":"取られた！","round":"第{n}回","roundSub":"{s}が6個上げました。宝を持ち越して次の回へ","toPool":"場へ{a}","offer":"供え物として場へ{a}","pot":"{s}が場の{a}を獲得","turn":"{s}の番","win":"{s}の勝ち","whyHome":"6個すべて上がり","whyBroke":"相手の宝がなくなりました","wait":"待ち","home":"上がり","pool":"場","gold":"{s}の宝","goldYou":"あなたの宝","cant":"その駒は今の目では動かせません","credit":"ルールは R.C.ベル（1960）の復元と、現代に広まっているルール。当時のルールは伝わっていません。","need1":"盤に自分の駒があるとき、入れるのは「1」の目だけです","treasure":"宝","rules":"ルール","rn":["ベルの復元","広く知られたルール"],"rd":["R.C.ベル（1960）の提案。60マス。宝を賭けて場に出し、印のマスや動けないときに払う。取りはなし。先に6個上げた方が場を取る。","現代に広まっているルール。52マス。入るのは「1」の目だけ。中央の4マスでだけ相手の駒を取れる。相手の宝をなくせば勝ち。"],"lvd":["入門：目に任せて動かす","初級〜中級：もう一度のマスや上がりを考える","上級：相手の次の一投げまで読む","最上級：2〜3投げ先まで読む"],"pn":{"pebble":["赤","青"],"maize":["赤","青"],"obsidian":["白","黒"],"jade":["赤","緑"],"clay":["茶","灰"],"gold":["金","青"]}},
    "en": {"roll":"Throw","pass":"Pass","zero":"No marked beans: no move","noMove":"No piece can move","move":"Move {n}: choose a piece","again":"Again!","againSub":"Arm-end square: throw again","pen":"Marked square","give":"Pay {a} to {s}","get":"Take {a} from {s}","homeX":"Home!","cap":"Captured!","capd":"Your piece was taken!","round":"Round {n}","roundSub":"{s} brought all six home. Stakes carry over","toPool":"{a} to the pool","offer":"{a} to the pool as an offering","pot":"{s} takes the pool ({a})","turn":"{s} to play","win":"{s} wins","whyHome":"All six pieces home","whyBroke":"The rival ran out of stakes","wait":"Waiting","home":"Home","pool":"Pool","gold":"{s}’s stake","goldYou":"Your stake","cant":"That piece cannot move with this throw","credit":"Rules: R. C. Bell’s reconstruction (1960) and the rules common today. The original rules have not survived.","need1":"With a piece on the board, only a 1 brings another one on","treasure":"Stakes","rules":"Rules","rn":["Bell’s reconstruction","Popular rules"],"rd":["Proposed by R. C. Bell (1960). 60 squares. Stakes go into a pool; you pay on marked squares and when stuck. No captures. The first to bring six home takes the pool.","The rules most often seen today. 52 squares. Only a 1 enters. Captures only on the four centre squares. Win by taking all of your rival’s stakes."],"lvd":["Beginner: moves by luck","Novice to intermediate: thinks about extra throws and going home","Advanced: reads your rival’s next throw","Expert: reads two or three throws ahead"],"pn":{"pebble":["Red","Blue"],"maize":["Red","Blue"],"obsidian":["White","Black"],"jade":["Red","Green"],"clay":["Brown","Grey"],"gold":["Gold","Blue"]}},
    "zh": {"roll":"掷豆","pass":"跳过","zero":"记号0个：不能前进","noMove":"没有可走的棋子","move":"可前进{n}格：选择要走的棋子","again":"再掷一次！","againSub":"臂端格：可以再掷一次","pen":"记号格","give":"向{s}支付财宝{a}","get":"从{s}获得财宝{a}","homeX":"到达终点！","cap":"吃子！","capd":"被吃了！","round":"第{n}轮","roundSub":"{s}的6枚已全部到达。财宝带入下一轮","toPool":"付给奖池{a}","offer":"作为供品放入奖池{a}","pot":"{s}获得奖池的{a}","turn":"轮到{s}","win":"{s}获胜","whyHome":"6枚全部到达终点","whyBroke":"对手的财宝用完了","wait":"待命","home":"终点","pool":"奖池","gold":"{s}的财宝","goldYou":"你的财宝","cant":"这枚棋子不能用这个点数走","credit":"规则采用R.C.贝尔（1960）的复原和现代流传的规则。当时的规则没有流传下来。","need1":"棋盘上有己方棋子时，只有掷出“1”才能入场","treasure":"财宝","rules":"规则","rn":["贝尔复原规则","流行规则"],"rd":["R.C.贝尔（1960）的提案。60格。把财宝押入奖池，停在记号格或无法走棋时要支付。没有吃子。先让6枚到达终点的一方拿走奖池。","现代流传的规则。52格。只有掷出“1”才能入场。只有在中央4格才能吃对手的棋子。让对手的财宝归零即获胜。"],"lvd":["入门：凭运气走","初级～中级：会考虑再掷格和到达终点","高级：算到对手的下一掷","最高级：算到2～3掷之后"],"pn":{"pebble":["红","蓝"],"maize":["红","蓝"],"obsidian":["白","黑"],"jade":["红","绿"],"clay":["棕","灰"],"gold":["金","蓝"]}},
    "zh-TW": {"roll":"擲豆","pass":"跳過","zero":"記號 0 個：無法前進","noMove":"沒有可走的棋子","move":"可前進{n}格：選擇要走的棋子","again":"再擲一次！","againSub":"臂端格：可以再擲一次","pen":"記號格","give":"向{s}支付財寶{a}","get":"從{s}獲得財寶{a}","homeX":"抵達終點！","cap":"吃子！","capd":"被吃了！","round":"第{n}輪","roundSub":"{s}的 6 枚已全部抵達。財寶帶入下一輪","toPool":"付給獎池{a}","offer":"作為供品放入獎池{a}","pot":"{s}獲得獎池的{a}","turn":"輪到{s}","win":"{s}獲勝","whyHome":"6 枚全部抵達終點","whyBroke":"對手的財寶用完了","wait":"待命","home":"終點","pool":"獎池","gold":"{s}的財寶","goldYou":"你的財寶","cant":"這枚棋子無法用這個點數走","credit":"規則採用 R.C.貝爾（1960）的復原和現代流傳的規則。當時的規則沒有流傳下來。","need1":"棋盤上有己方棋子時，只有擲出「1」才能入場","treasure":"財寶","rules":"規則","rn":["貝爾復原規則","流行規則"],"rd":["R.C.貝爾（1960）的提案。60 格。把財寶押入獎池，停在記號格或無法走棋時要支付。沒有吃子。先讓 6 枚抵達終點的一方拿走獎池。","現代流傳的規則。52 格。只有擲出「1」才能入場。只有在中央 4 格才能吃對手的棋子。讓對手的財寶歸零即獲勝。"],"lvd":["入門：憑運氣走","初級～中級：會考慮再擲格和抵達終點","高級：算到對手的下一擲","最高級：算到 2～3 擲之後"],"pn":{"pebble":["紅","藍"],"maize":["紅","藍"],"obsidian":["白","黑"],"jade":["紅","綠"],"clay":["棕","灰"],"gold":["金","藍"]}},
    "ko": {"roll":"던지기","pass":"패스","zero":"표시 0개: 갈 수 없습니다","noMove":"움직일 수 있는 말이 없습니다","move":"{n}칸 갈 수 있습니다. 움직일 말을 고르세요","again":"한 번 더!","againSub":"팔 끝 칸: 한 번 더 던질 수 있습니다","pen":"표시 칸","give":"{s}에게 보물 {a} 지불","get":"{s}에게서 보물 {a} 획득","homeX":"골인!","cap":"잡았다!","capd":"잡혔다!","round":"제{n}회","roundSub":"{s}: 6개 모두 골인. 보물을 그대로 가지고 다음 회로","toPool":"판돈으로 {a}","offer":"제물로 판돈에 {a}","pot":"{s}: 판돈 {a} 획득","turn":"{s} 차례","win":"{s} 승리","whyHome":"6개 모두 골인","whyBroke":"상대의 보물이 다 떨어졌습니다","wait":"대기","home":"골인","pool":"판돈","gold":"{s}의 보물","goldYou":"내 보물","cant":"그 말은 이 눈으로 움직일 수 없습니다","credit":"규칙은 R. C. 벨(1960)의 복원과 오늘날 널리 퍼진 규칙입니다. 당시의 규칙은 전해지지 않습니다.","need1":"판에 내 말이 있을 때는 '1'이 나와야만 넣을 수 있습니다","treasure":"보물","rules":"규칙","rn":["벨의 복원","널리 알려진 규칙"],"rd":["R. C. 벨(1960)의 제안. 60칸. 보물을 걸어 판돈에 내고, 표시 칸에 서거나 움직일 수 없을 때 지불합니다. 잡기는 없습니다. 먼저 6개를 골인시킨 쪽이 판돈을 가져갑니다.","오늘날 널리 퍼진 규칙. 52칸. '1'이 나와야만 들어갈 수 있습니다. 중앙 4칸에서만 상대 말을 잡을 수 있습니다. 상대의 보물을 다 없애면 승리합니다."],"lvd":["입문: 운에 맡겨 둔다","초급~중급: 한 번 더 칸과 골인을 생각함","상급: 상대의 다음 던지기까지 읽음","최상급: 2~3번 앞의 던지기까지 읽음"],"pn":{"pebble":["빨강","파랑"],"maize":["빨강","파랑"],"obsidian":["하양","검정"],"jade":["빨강","초록"],"clay":["갈색","회색"],"gold":["금색","파랑"]}},
    "es": {"roll":"Tirar","pass":"Pasar","zero":"0 marcas: no avanzas","noMove":"Ninguna ficha puede mover","move":"Avanzas {n}: elige una ficha","again":"¡Otra vez!","againSub":"Extremo de un brazo: tiras otra vez","pen":"Casilla marcada","give":"Paga {a} a {s}","get":"Recibe {a} de {s}","homeX":"¡A la meta!","cap":"¡Captura!","capd":"¡Te capturaron!","round":"Ronda {n}","roundSub":"{s}: las seis en la meta. Los tesoros pasan a la ronda siguiente","toPool":"{a} al pozo","offer":"{a} al pozo como ofrenda","pot":"{s}: pozo ganado ({a})","turn":"Turno de {s}","win":"Gana {s}","whyHome":"Las seis fichas en la meta","whyBroke":"El rival se quedó sin tesoro","wait":"En espera","home":"Meta","pool":"Pozo","gold":"Tesoro: {s}","goldYou":"Tu tesoro","cant":"Esa ficha no puede mover con esta tirada","credit":"Reglas: la reconstrucción de R. C. Bell (1960) y las reglas extendidas hoy. Las reglas de la época no se han conservado.","need1":"Con fichas propias en el tablero, solo se entra con un 1","treasure":"Tesoro","rules":"Reglas","rn":["Reconstrucción de Bell","Reglas populares"],"rd":["Propuesta de R. C. Bell (1960). 60 casillas. Se apuesta el tesoro en un pozo; se paga en las casillas marcadas y cuando no se puede mover. Sin capturas. Quien lleva antes las seis a la meta gana el pozo.","Las reglas extendidas hoy. 52 casillas. Solo se entra con un 1. Solo se captura en las cuatro casillas centrales. Ganas si dejas al rival sin tesoro."],"lvd":["Principiante: mueve al azar","Principiante a intermedio: piensa en las casillas de otra tirada y en llegar a la meta","Avanzado: calcula hasta la próxima tirada del rival","Experto: calcula dos o tres tiradas por delante"],"pn":{"pebble":["Rojas","Azules"],"maize":["Rojas","Azules"],"obsidian":["Blancas","Negras"],"jade":["Rojas","Verdes"],"clay":["Marrones","Grises"],"gold":["Doradas","Azules"]}},
    "fr": {"roll":"Lancer","pass":"Passer","zero":"0 marque : pas de déplacement","noMove":"Aucun pion ne peut bouger","move":"Avancez de {n} : choisissez un pion","again":"Encore !","againSub":"Bout de bras : vous relancez","pen":"Case marquée","give":"{a} payé aux {s}","get":"{a} reçu des {s}","homeX":"Arrivé !","cap":"Prise !","capd":"Pion pris !","round":"Manche {n}","roundSub":"{s} : six pions rentrés. Les trésors sont reportés à la manche suivante","toPool":"{a} au pot","offer":"{a} au pot en offrande","pot":"{s} : pot remporté ({a})","turn":"À {s}","win":"{s} gagnent","whyHome":"Les six pions sont arrivés","whyBroke":"L’adversaire n’a plus de trésor","wait":"En attente","home":"Arrivée","pool":"Pot","gold":"Trésor : {s}","goldYou":"Votre trésor","cant":"Ce pion ne peut pas bouger avec ce jet","credit":"Règles : la reconstitution de R. C. Bell (1960) et les règles répandues aujourd’hui. Les règles de l’époque ne nous sont pas parvenues.","need1":"Avec des pions à vous sur le plateau, seul un 1 permet d’entrer","treasure":"Trésor","rules":"Règles","rn":["Reconstitution de Bell","Règles populaires"],"rd":["Proposition de R. C. Bell (1960). 60 cases. On mise son trésor dans un pot ; on paie sur les cases marquées et quand on ne peut pas jouer. Pas de prise. Le premier à rentrer ses six pions remporte le pot.","Les règles répandues aujourd’hui. 52 cases. On n’entre qu’avec un 1. On ne prend que sur les quatre cases centrales. Vous gagnez quand l’adversaire n’a plus de trésor."],"lvd":["Débutant : joue au hasard","Débutant à intermédiaire : pense aux cases de relance et à l’arrivée","Avancé : calcule jusqu’au prochain lancer de l’adversaire","Expert : calcule deux ou trois lancers à l’avance"],"pn":{"pebble":["Rouges","Bleus"],"maize":["Rouges","Bleus"],"obsidian":["Blancs","Noirs"],"jade":["Rouges","Verts"],"clay":["Bruns","Gris"],"gold":["Dorés","Bleus"]}},
    "pt": {"roll":"Lançar","pass":"Passar","zero":"0 marcas: não avança","noMove":"Nenhuma peça pode mover","move":"Avance {n}: escolha uma peça","again":"De novo!","againSub":"Ponta de braço: lance de novo","pen":"Casa marcada","give":"Paga {a} a {s}","get":"Recebe {a} de {s}","homeX":"Chegou!","cap":"Captura!","capd":"Capturaram sua peça!","round":"Rodada {n}","roundSub":"{s}: as seis na chegada. Os tesouros passam para a próxima rodada","toPool":"{a} para o pote","offer":"{a} para o pote como oferenda","pot":"{s}: pote ganho ({a})","turn":"Vez de {s}","win":"{s} vencem","whyHome":"As seis peças na chegada","whyBroke":"O rival ficou sem tesouro","wait":"Em espera","home":"Chegada","pool":"Pote","gold":"Tesouro: {s}","goldYou":"Seu tesouro","cant":"Essa peça não pode mover com este lançamento","credit":"Regras: a reconstrução de R. C. Bell (1960) e as regras difundidas hoje. As regras da época não chegaram até nós.","need1":"Com peças suas no tabuleiro, só se entra com um 1","treasure":"Tesouro","rules":"Regras","rn":["Reconstrução de Bell","Regras populares"],"rd":["Proposta de R. C. Bell (1960). 60 casas. Aposta-se o tesouro num pote; paga-se nas casas marcadas e quando não dá para mover. Sem capturas. Quem levar primeiro as seis à chegada fica com o pote.","As regras difundidas hoje. 52 casas. Só se entra com um 1. Só se captura nas quatro casas centrais. Você vence se deixar o rival sem tesouro."],"lvd":["Iniciante: joga ao acaso","Iniciante a intermediário: pensa nas casas de novo lançamento e na chegada","Avançado: calcula até o próximo lançamento do rival","Especialista: calcula dois ou três lançamentos à frente"],"pn":{"pebble":["Vermelhas","Azuis"],"maize":["Vermelhas","Azuis"],"obsidian":["Brancas","Pretas"],"jade":["Vermelhas","Verdes"],"clay":["Marrons","Cinzas"],"gold":["Douradas","Azuis"]}},
    "de": {"roll":"Werfen","pass":"Passen","zero":"0 Markierungen: kein Zug","noMove":"Kein Stein kann ziehen","move":"{n} Felder ziehen: Stein wählen","again":"Nochmal!","againSub":"Armende: du wirfst noch einmal","pen":"Markiertes Feld","give":"{a} an {s} gezahlt","get":"{a} von {s} erhalten","homeX":"Im Ziel!","cap":"Geschlagen!","capd":"Du wurdest geschlagen!","round":"Runde {n}","roundSub":"{s}: alle sechs im Ziel. Die Schätze gehen in die nächste Runde mit","toPool":"{a} in den Pott","offer":"{a} als Opfergabe in den Pott","pot":"{s} gewinnt den Pott ({a})","turn":"{s} am Zug","win":"{s} gewinnt","whyHome":"Alle sechs Steine im Ziel","whyBroke":"Der Gegner hat keinen Schatz mehr","wait":"Wartend","home":"Ziel","pool":"Pott","gold":"Schatz: {s}","goldYou":"Dein Schatz","cant":"Dieser Stein kann mit diesem Wurf nicht ziehen","credit":"Regeln: die Rekonstruktion von R. C. Bell (1960) und die heute verbreiteten Regeln. Die damaligen Regeln sind nicht überliefert.","need1":"Mit eigenen Steinen auf dem Brett setzt nur eine 1 ein","treasure":"Schatz","rules":"Regeln","rn":["Bells Rekonstruktion","Verbreitete Regeln"],"rd":["Vorschlag von R. C. Bell (1960). 60 Felder. Man setzt seinen Schatz in einen Pott; gezahlt wird auf markierten Feldern und wenn man nicht ziehen kann. Kein Schlagen. Wer zuerst sechs Steine ins Ziel bringt, gewinnt den Pott.","Die heute verbreiteten Regeln. 52 Felder. Einsetzen nur mit einer 1. Schlagen nur auf den vier Mittelfeldern. Du gewinnst, wenn der Gegner keinen Schatz mehr hat."],"lvd":["Einsteiger: zieht nach Glück","Anfänger bis Mittelstufe: denkt an Nochmal-Felder und ans Ziel","Fortgeschritten: rechnet bis zum nächsten Wurf des Gegners","Experte: rechnet zwei bis drei Würfe voraus"],"pn":{"pebble":["Rot","Blau"],"maize":["Rot","Blau"],"obsidian":["Weiß","Schwarz"],"jade":["Rot","Grün"],"clay":["Braun","Grau"],"gold":["Gold","Blau"]}},
    "ru": {"roll":"Бросить","pass":"Пас","zero":"Меток 0: хода нет","noMove":"Ни одна фишка не может ходить","move":"Ход на {n}: выберите фишку","again":"Ещё раз!","againSub":"Конец луча: бросайте ещё раз","pen":"Клетка с меткой","give":"Плата {a}: получают {s}","get":"Получено {a}: платят {s}","homeX":"Дома!","cap":"Взятие!","capd":"Вашу фишку взяли!","round":"Раунд {n}","roundSub":"{s}: все шесть дома. Сокровища переходят в следующий раунд","toPool":"{a} в банк","offer":"{a} в банк как подношение","pot":"{s} забирают банк ({a})","turn":"Ход: {s}","win":"Победа: {s}","whyHome":"Все шесть фишек дома","whyBroke":"У соперника закончились сокровища","wait":"В запасе","home":"Дом","pool":"Банк","gold":"Клад: {s}","goldYou":"Ваш клад","cant":"Эта фишка не может пойти на это число","credit":"Правила: реконструкция Р. К. Белла (1960) и правила, распространённые в наше время. Правила того времени до нас не дошли.","need1":"Когда на доске есть ваши фишки, войти можно только при броске 1","treasure":"Сокровища","rules":"Правила","rn":["Реконструкция Белла","Распространённые правила"],"rd":["Предложение Р. К. Белла (1960). 60 клеток. Сокровища ставят в банк; платят на клетках с меткой и когда нет хода. Взятий нет. Кто первым приведёт домой шесть фишек, забирает банк.","Правила, распространённые в наше время. 52 клетки. Войти можно только при броске 1. Бить фишки соперника можно только на четырёх центральных клетках. Побеждает тот, кто оставит соперника без сокровищ."],"lvd":["Новичок: ходит как повезёт","Начальный–средний: думает о клетках «ещё раз» и о доме","Продвинутый: считает до следующего броска соперника","Эксперт: считает на два-три броска вперёд"],"pn":{"pebble":["Красные","Синие"],"maize":["Красные","Синие"],"obsidian":["Белые","Чёрные"],"jade":["Красные","Зелёные"],"clay":["Коричневые","Серые"],"gold":["Золотые","Синие"]}},
    "tr": {"roll":"At","pass":"Pas","zero":"0 işaret: ilerleme yok","noMove":"Oynayabilen taş yok","move":"{n} kare ilerle: bir taş seç","again":"Tekrar!","againSub":"Kol ucu: tekrar atarsın","pen":"İşaretli kare","give":"{s} tarafına {a} ödenir","get":"{s} tarafı {a} öder","homeX":"Bitişte!","cap":"Alındı!","capd":"Taşın alındı!","round":"{n}. tur","roundSub":"{s}: altı taş da bitişte. Hazineler sonraki tura aktarılır","toPool":"Pota {a}","offer":"Adak olarak pota {a}","pot":"{s}: pottaki {a} kazanıldı","turn":"Sıra: {s}","win":"Kazanan: {s}","whyHome":"Altı taşın hepsi bitişte","whyBroke":"Rakibin hazinesi tükendi","wait":"Bekleyen","home":"Bitiş","pool":"Pot","gold":"Hazine: {s}","goldYou":"Hazinen","cant":"Bu taş bu atışla oynayamaz","credit":"Kurallar: R. C. Bell’in rekonstrüksiyonu (1960) ve günümüzde yaygın olan kurallar. Dönemin kuralları günümüze ulaşmamıştır.","need1":"Tahtada taşın varken yalnızca 1 ile girilir","treasure":"Hazine","rules":"Kurallar","rn":["Bell’in rekonstrüksiyonu","Yaygın kurallar"],"rd":["R. C. Bell’in (1960) önerisi. 60 kare. Hazine pota konarak oynanır; işaretli karelerde ve hamle yapılamadığında ödenir. Taş alma yok. Altı taşı önce bitişe getiren potu alır.","Günümüzde yaygın olan kurallar. 52 kare. Yalnızca 1 ile girilir. Rakip taş yalnızca ortadaki dört karede alınabilir. Rakibin hazinesini tüketen kazanır."],"lvd":["Yeni başlayan: şansına göre oynar","Başlangıç–orta: tekrar atış karelerini ve bitişi düşünür","İleri: rakibin bir sonraki atışına kadar hesaplar","Uzman: iki üç atış ilerisini hesaplar"],"pn":{"pebble":["Kırmızı","Mavi"],"maize":["Kırmızı","Mavi"],"obsidian":["Beyaz","Siyah"],"jade":["Kırmızı","Yeşil"],"clay":["Kahverengi","Gri"],"gold":["Altın","Mavi"]}},
    "id": {"roll":"Lempar","pass":"Lewat","zero":"0 tanda: tidak bisa maju","noMove":"Tak ada bidak yang bisa jalan","move":"Maju {n} kotak: pilih bidak","again":"Lagi!","againSub":"Ujung lengan: boleh melempar lagi","pen":"Kotak bertanda","give":"Bayar {a} ke {s}","get":"Terima {a} dari {s}","homeX":"Finis!","cap":"Tangkap!","capd":"Bidakmu ditangkap!","round":"Babak {n}","roundSub":"{s}: keenam bidak finis. Harta dibawa ke babak berikutnya","toPool":"{a} ke pot","offer":"{a} ke pot sebagai persembahan","pot":"{s} mendapat pot ({a})","turn":"Giliran {s}","win":"{s} menang","whyHome":"Keenam bidak sudah finis","whyBroke":"Harta lawan habis","wait":"Menunggu","home":"Finis","pool":"Pot","gold":"Harta {s}","goldYou":"Hartamu","cant":"Bidak itu tak bisa jalan dengan lemparan ini","credit":"Aturan: rekonstruksi R. C. Bell (1960) dan aturan yang tersebar luas sekarang. Aturan pada masa itu tidak diwariskan.","need1":"Jika ada bidakmu di papan, hanya angka 1 yang bisa memasukkan bidak","treasure":"Harta","rules":"Aturan","rn":["Rekonstruksi Bell","Aturan populer"],"rd":["Usulan R. C. Bell (1960). 60 kotak. Harta dipertaruhkan ke pot; membayar di kotak bertanda dan saat tidak bisa jalan. Tanpa menangkap. Yang lebih dulu membawa enam bidak ke finis mengambil pot.","Aturan yang tersebar luas sekarang. 52 kotak. Hanya bisa masuk dengan angka 1. Bidak lawan hanya bisa ditangkap di empat kotak tengah. Menang jika harta lawan habis."],"lvd":["Pemula: jalan mengikuti keberuntungan","Pemula–menengah: memikirkan kotak lempar lagi dan finis","Mahir: menghitung sampai lemparan lawan berikutnya","Ahli: menghitung dua sampai tiga lemparan ke depan"],"pn":{"pebble":["Merah","Biru"],"maize":["Merah","Biru"],"obsidian":["Putih","Hitam"],"jade":["Merah","Hijau"],"clay":["Cokelat","Abu-abu"],"gold":["Emas","Biru"]}},
    "hi": {"roll":"फेंकें","pass":"पास","zero":"निशान 0: चाल नहीं","noMove":"कोई मोहरा नहीं चल सकता","move":"{n} खाने चल सकते हैं: मोहरा चुनें","again":"फिर से!","againSub":"भुजा के सिरे का खाना: फिर से फेंक सकते हैं","pen":"निशान वाला खाना","give":"{s} को खज़ाने से {a} का भुगतान","get":"{s} से खज़ाने में {a} प्राप्त","homeX":"घर पहुँचा!","cap":"पकड़ा!","capd":"आपका मोहरा पकड़ा गया!","round":"दौर {n}","roundSub":"{s}: छहों मोहरे घर पहुँचे। खज़ाना अगले दौर में साथ जाता है","toPool":"पॉट में {a}","offer":"भेंट के रूप में पॉट में {a}","pot":"{s} ने पॉट के {a} जीते","turn":"{s} की बारी","win":"{s} जीता","whyHome":"छहों मोहरे घर पहुँचे","whyBroke":"प्रतिद्वंद्वी का खज़ाना ख़त्म हो गया","wait":"प्रतीक्षा में","home":"घर","pool":"पॉट","gold":"खज़ाना: {s}","goldYou":"आपका खज़ाना","cant":"यह मोहरा इस अंक से नहीं चल सकता","credit":"नियम: आर. सी. बेल (1960) का पुनर्निर्माण और आजकल प्रचलित नियम। उस समय के नियम हम तक नहीं पहुँचे हैं।","need1":"बोर्ड पर अपना मोहरा हो तो केवल “1” से प्रवेश होता है","treasure":"खज़ाना","rules":"नियम","rn":["बेल का पुनर्निर्माण","प्रचलित नियम"],"rd":["आर. सी. बेल (1960) का प्रस्ताव। 60 खाने। खज़ाना दाँव पर लगाकर पॉट में डाला जाता है; निशान वाले खाने पर और चाल न होने पर भुगतान होता है। पकड़ना नहीं है। जो पहले छह मोहरे घर पहुँचाए, पॉट उसका।","आजकल प्रचलित नियम। 52 खाने। केवल “1” से प्रवेश। केवल बीच के चार खानों में प्रतिद्वंद्वी का मोहरा पकड़ा जा सकता है। प्रतिद्वंद्वी का खज़ाना ख़त्म कर दें तो जीत।"],"lvd":["शुरुआती: किस्मत से चलता है","शुरुआती से मध्यम: दोबारा फेंक वाले खानों और घर पहुँचने पर ध्यान देता है","उन्नत: प्रतिद्वंद्वी की अगली फेंक तक सोचता है","विशेषज्ञ: दो-तीन फेंक आगे तक सोचता है"],"pn":{"pebble":["लाल","नीला"],"maize":["लाल","नीला"],"obsidian":["सफ़ेद","काला"],"jade":["लाल","हरा"],"clay":["भूरा","स्लेटी"],"gold":["सुनहरा","नीला"]}},
    "ar": {"roll":"ارمِ","pass":"تمرير","zero":"العلامات 0: لا تقدّم","noMove":"لا قطعة تستطيع الحركة","move":"تتقدّم {n}: اختر قطعة","again":"مرة أخرى!","againSub":"مربع طرف الذراع: ترمي مرة أخرى","pen":"مربع معلَّم","give":"دفع {a} من الكنز إلى {s}","get":"أخذ {a} من كنز {s}","homeX":"وصلت!","cap":"أسر!","capd":"أُسِرت قطعتك!","round":"الجولة {n}","roundSub":"{s}: وصلت القطع الست كلها. تنتقل الكنوز إلى الجولة التالية","toPool":"{a} إلى الصندوق","offer":"{a} إلى الصندوق قرباناً","pot":"{s}: الفوز بما في الصندوق ({a})","turn":"دور {s}","win":"فاز {s}","whyHome":"وصلت القطع الست كلها","whyBroke":"نفد كنز الخصم","wait":"الانتظار","home":"النهاية","pool":"الصندوق","gold":"كنز {s}","goldYou":"كنزك","cant":"هذه القطعة لا تتحرك بهذه الرمية","credit":"القواعد: إعادة بناء آر. سي. بيل (1960) والقواعد المنتشرة اليوم. قواعد ذلك الزمن لم تصل إلينا.","need1":"عند وجود قطع لك على اللوحة لا يُدخِل إلا الرقم 1","treasure":"الكنز","rules":"القواعد","rn":["إعادة بناء بيل","القواعد الشائعة"],"rd":["اقتراح آر. سي. بيل (1960). 60 مربعاً. يُراهَن بالكنز ويوضع في الصندوق، ويُدفع عند المربعات المعلَّمة وعند تعذّر الحركة. لا أسر. من يُوصل ست قطع أولاً يأخذ الصندوق.","القواعد المنتشرة اليوم. 52 مربعاً. لا دخول إلا بالرقم 1. لا تُؤسر قطع الخصم إلا في المربعات الأربعة الوسطى. تفوز إذا نفد كنز الخصم."],"lvd":["مبتدئ: يتحرك بالحظ","مبتدئ إلى متوسط: يفكّر في مربعات الرمية الإضافية وفي الوصول","متقدّم: يحسب حتى رمية الخصم التالية","خبير: يحسب رميتين أو ثلاثاً مقدّماً"],"pn":{"pebble":["الأحمر","الأزرق"],"maize":["الأحمر","الأزرق"],"obsidian":["الأبيض","الأسود"],"jade":["الأحمر","الأخضر"],"clay":["البني","الرمادي"],"gold":["الذهبي","الأزرق"]}},
  };
  const WHO = {
    "ja": ["はじめて","ルールを覚えた人","何局か遊んだ人","慣れた人","強い人","上級者","達人"],
    "en": ["First game","Knows the rules","Has played a few games","Regular player","Strong player","Expert","Master"],
    "zh": ["第一次玩","刚学会规则","玩过几局","熟练玩家","强手","高手","大师"],
    "zh-TW": ["第一次玩","懂規則","玩過幾局","常玩的人","高手","專家","大師"],
    "ko": ["처음","규칙을 익힌 사람","몇 판 둬 본 사람","익숙한 사람","강한 사람","고수","달인"],
    "es": ["Primera partida","Conoce las reglas","Ha jugado algunas partidas","Jugador habitual","Jugador fuerte","Experto","Maestro"],
    "fr": ["Première partie","Connaît les règles","A joué quelques parties","Joueur régulier","Joueur fort","Expert","Maître"],
    "pt": ["Primeira partida","Conhece as regras","Já jogou algumas partidas","Jogador habitual","Jogador forte","Especialista","Mestre"],
    "de": ["Erste Partie","Kennt die Regeln","Hat ein paar Partien gespielt","Geübter Spieler","Starker Spieler","Experte","Meister"],
    "ru": ["Первая игра","Знает правила","Сыграл несколько партий","Постоянный игрок","Сильный игрок","Эксперт","Мастер"],
    "tr": ["İlk oyun","Kuralları biliyor","Birkaç oyun oynadı","Düzenli oyuncu","Güçlü oyuncu","Uzman","Usta"],
    "id": ["Permainan pertama","Tahu aturannya","Sudah main beberapa kali","Pemain rutin","Pemain kuat","Ahli","Master"],
    "hi": ["पहला खेल","नियम जानता है","कुछ खेल खेले हैं","नियमित खिलाड़ी","मज़बूत खिलाड़ी","विशेषज्ञ","उस्ताद"],
    "ar": ["أول مباراة","يعرف القواعد","لعب بضع مباريات","لاعب معتاد","لاعب قوي","خبير","أستاذ"],
  };
  // the game's measured rating of each AI level (patolli/app.js RT_LV)
  const RATING = [0, 500, 520, 540, 605, 625, 675, 700, 750, 780, 815, 895, 940, 1020, 1095, 1190, 1315, 1395, 1480, 1635, 1700];
  const tx = l => TX[l] || TX.en;
  function levelInfo(n, lang) {
    const d = tx(lang).lvd, w = WHO[lang] || WHO.en;
    return { name: 'Lv.' + n, desc: d[n <= 3 ? 0 : n <= 7 ? 1 : n <= 15 ? 2 : 3], rating: RATING[n], who: w[n <= 2 ? 0 : n <= 5 ? 1 : n <= 8 ? 2 : n <= 11 ? 3 : n <= 15 ? 4 : n <= 18 ? 5 : 6] };
  }
  const BASE = '../patolli/', EV = '?v=2';   // same files (and cache keys) as patolli/index.html
  let engP = null;
  function loadEngine() {
    if (window.PatolliEngine) return Promise.resolve(window.PatolliEngine);
    return engP || (engP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = BASE + 'engine.js' + EV; s.onload = () => window.PatolliEngine ? res(window.PatolliEngine) : rej(new Error('engine')); s.onerror = () => { engP = null; rej(new Error('engine')); }; document.head.appendChild(s); }));
  }
  // sounds (the portal's sound switch): pebble on a mat, the rattle of beans, beads
  const SND = (() => {
    let C = null;
    const ac = () => { try { if (localStorage.getItem('atlas-sfx') === '0') return null; } catch (e) {} try { C = C || window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    const tone = (a, t0, f0, f1, dur, vol, type) => { const o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .004); g.gain.exponentialRampToValueAtTime(.001, t0 + dur); o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + .02); };
    const noise = (a, t0, dur, vol, f) => { const n = a.createBufferSource(), b = a.createBuffer(1, Math.max(1, a.sampleRate * dur | 0), a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4); n.buffer = b; const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 1.3; const g = a.createGain(); g.gain.value = vol; n.connect(bp).connect(g).connect(a.destination); n.start(t0); };
    const at = f => { const a = ac(); if (a) try { f(a, a.currentTime + .005); } catch (e) {} };
    return {
      put: () => at((a, t) => { tone(a, t, 300, 140, .08, .14); noise(a, t, .03, .32, 2400); }),
      hop: () => at((a, t) => { noise(a, t, .018, .14, 3400); }),
      take: () => at((a, t) => { tone(a, t, 240, 90, .2, .2); noise(a, t, .06, .3, 1200); }),
      roll: () => at((a, t) => { for (let i = 0; i < 5; i++) noise(a, t + i * .06 + Math.random() * .03, .03, .2 + Math.random() * .15, 1800 + Math.random() * 1400); }),
      beanHit: () => at((a, t) => { noise(a, t, .02, .22, 2200 + Math.random() * 900); }),
      coin: () => at((a, t) => [1318, 1760].forEach((f, i) => tone(a, t + i * .06, f, 0, .22, .05, 'triangle'))),
      again: () => at((a, t) => [659.25, 987.77].forEach((f, i) => tone(a, t + i * .09, f, 0, .5, .08, 'triangle'))),
      home: () => at((a, t) => [523.25, 659.25, 783.99].forEach((f, i) => tone(a, t + i * .07, f, 0, .4, .07, 'triangle'))),
    };
  })();
  // the HUD's dots: the two colours of the chosen set of pieces (atlas/models/patolli.js SETS)
  const DOT = { pebble: ['#c8402c', '#2f6fb8'], maize: ['#c8402c', '#2f6fb8'], obsidian: ['#f1ead8', '#24262d'], jade: ['#b8452f', '#3f9a6a'], clay: ['#b56a3c', '#6f7378'], gold: ['#d9a92c', '#1f9aa8'] };
  const RIDS = ['bell', 'popular'];
  const fmt = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => v && v[k] != null ? v[k] : '');
  const PAT = { 0: [0, 0, 0, 0, 0], 1: [0, 0, 1, 0, 0], 2: [1, 0, 0, 0, 1], 3: [1, 0, 1, 0, 1], 4: [1, 1, 0, 1, 1], 10: [1, 1, 1, 1, 1] };

  /* ================= lesson mode (ctx.pz, 2026-11-24 担当C) =================
     A position from patolli/lessons.json (Bell's rules) on the 3D mat for atlas/lessons3d.js (DATA.patolli, atlas/ls-patolli.js):
     the five beans at rest showing the throw, the player moves one piece (tap it — or where it lands, the waiting tray to enter,
     the home tray to bear off), ctx.pz.moved(from, info) judges it.
       ctx.pz = { patolli: { s: { rule, pos }, n, marks, lock }, ready(), moved(from, info) }
       api.pz = { load(spec), wait(), mark(list), play([from, to]) → Promise, undo(), reset(), moves(), state(), legal() }
     Marks (lessons.json): { type: 'glow'|'ring'|'danger'|'text', r, c, text, color } and the answers { m: [from, to], cls: 'ok'|'ng' }
     (a chain of dots along your road, the square it lands on — the home tray when it bears off). No AI, no throwing. */
  function startPz(ctx) {
    const T3 = ctx.Table3D, PZ = ctx.pz, TH = window.THREE;
    const kit = window.PatolliKit.make(T3, { rule: 'bell', sfx: k => SND[k] && SND[k]() });
    let E = null, st = null, st0 = null, n = null, on = false, busy = false, sel = -1, stopped = false, spec = null, extra = [], hist = [], gen = 0, loading = false, pending = null;
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const COL = { ok: 0x3df59a, ng: 0xff5d5d };
    const hex = c => typeof c === 'number' ? c : parseInt(String(c || '#ffe27a').replace('#', ''), 16);
    const RL = () => E.RULES.bell;
    const rcOf = i => { const q = E.coords('bell', 0, i, 1); return q ? { r: q[0], c: q[1] } : null; };
    const idxAt = (side, r, c) => { for (const p of st.pos[side]) { if (p < 1 || p > RL().L) continue; const q = E.coords('bell', side, p, 1); if (q[0] === r && q[1] === c) return p; } return -1; };
    const legal = () => st && n ? E.legalMoves(st, n) : [];
    const kOf = from => st.pos[0].findIndex(p => p === from);
    const homeN = () => st0.pos[0].filter(p => p > RL().L).length;
    function label(r, c, text, color) {   // a number on a square, facing up
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const g = cv.getContext('2d'), big = String(text).length <= 2;
      g.font = '900 ' + (big ? 92 : 64) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 14; g.strokeStyle = 'rgba(30,20,10,.88)'; g.strokeText(text, 128, 68); g.fillStyle = '#' + hex(color).toString(16).padStart(6, '0'); g.fillText(text, 128, 68);
      const m = new TH.Mesh(new TH.PlaneGeometry(.9, .45), new TH.MeshBasicMaterial({ map: new TH.CanvasTexture(cv), transparent: true, depthWrite: false, depthTest: false, toneMapped: false }));
      m.rotation.x = -Math.PI / 2; const [x, z] = kit.cellXZ(r, c); m.position.set(x, kit.Y + .6, z); m.renderOrder = 9; kit.marks.group.add(m); T3.kick(120);
    }
    function drawAns(m, cls) {   // an answer: where the piece starts (a square or the waiting tray), the dots along the road, where it lands
      if (typeof m === 'number') { const x = E.legalMoves(st0, n || 0).find(y => y.from === m); if (!x) return; m = [x.from, x.to]; }
      const [from, to] = m, col = COL[cls] || COL.ok;
      if (from === 0) kit.marks.tray(0, 'start', col, 0); else { const q = rcOf(from); kit.marks.ring(q.r, q.c, col); }
      kit.marks.path(0, from + 1, Math.min(to, RL().L), col, 1);
      if (to > RL().L) kit.marks.tray(0, 'goal', col, homeN()); else { const q = rcOf(to); kit.marks.cell(q.r, q.c, col, .45); }
    }
    function marksNow() {
      kit.marks.clear();
      for (const x of (spec && spec.marks || []).concat(extra)) {
        if (x.m != null) { drawAns(x.m, x.cls); continue; }
        if (x.r == null) continue;
        if (x.type === 'danger') { kit.marks.cell(x.r, x.c, 0xff5d5d, .38); kit.marks.ring(x.r, x.c, 0xff5d5d); if (x.text) label(x.r, x.c, String(x.text), 0xffd0c8); }
        else if (x.type === 'glow') kit.marks.glow(x.r, x.c, hex(x.color || 0xffd65a), .5);
        else if (x.type === 'ring') kit.marks.ring(x.r, x.c, hex(x.color || '#ff9b7a'));
        else if (x.type === 'text') label(x.r, x.c, String(x.text), x.color || '#ffe27a');
      }
      if (on && !spec.lock) {   // the pieces that can move (and the selected one's landing square)
        for (const m of legal()) { if (m.from === 0) kit.marks.tray(0, 'start', 0xffd65a, 0); else { const q = rcOf(m.from); kit.marks.ring(q.r, q.c, 0xffd65a); } }
        for (const m of legal().filter(x => x.from === sel)) { const col = m.again ? 0x6ec8ff : m.pen ? 0xff5d5d : 0x3df59a; if (m.finish) kit.marks.tray(0, 'goal', col, homeN()); else { const q = rcOf(m.to); kit.marks.cell(q.r, q.c, col, .42); } }
      }
    }
    function setSel(from) {
      if (sel > 0 && kit.lift) { const k = kOf(sel); if (k >= 0) kit.lift(0, k, false); }
      sel = from; if (sel > 0 && kit.lift) { const k = kOf(sel); if (k >= 0) kit.lift(0, k, true); }
      marksNow();
    }
    const beans = () => kit.restBeans(n == null ? null : PAT[n].slice());
    function load(sp) {
      if (!E) { pending = sp || PZ.patolli; return; }   // (asked before the engine is ready: loaded then)
      spec = Object.assign({}, sp || PZ.patolli); extra = []; hist = []; on = false; sel = -1; busy = false; gen++; loading = true;   // (gen: a move still walking from the last position is dropped)
      kit.cancel();
      st = { rule: 'bell', pos: spec.s.pos.map(a => a.slice()), turn: 0, winner: -1, gold: [16, 16], pool: 8, dir: [1, 1], round: 1 }; st0 = E.clone(st); n = spec.n == null ? null : +spec.n;
      kit.sync(st); beans(); marksNow();
      later(() => { loading = false; if (PZ.ready) PZ.ready(); }, 160);
    }
    async function commit(m, judge) {
      busy = true; on = false; if (sel > 0 && kit.lift) { const k = kOf(sel); if (k >= 0) kit.lift(0, k, false); } sel = -1; extra = []; spec = Object.assign({}, spec, { marks: [] }); marksNow();
      const g0 = gen;
      await kit.move(0, m.from, m.to, { onStep: () => SND.hop && SND.hop(), onLand: () => { const f = m.finish ? SND.home : SND.put; if (f) f(); } });
      if (stopped) return false;
      if (g0 !== gen) { kit.sync(st); return false; }   // (another position was loaded while it walked)
      const r = E.apply(st, m, n); st = r.state; st.turn = 0; hist.push([m.from, m.to]); kit.sync(st); busy = false;
      if (m.again && SND.again) SND.again();
      if (judge && PZ.moved) PZ.moved(m.from, { to: m.to, again: !!m.again, finish: !!m.finish, enter: !!m.enter });
      return true;
    }
    function onClick(e) {
      if (stopped || T3.wasDrag() || busy || !on || !st) return;
      const h = kit.hit(e), ms = legal(); if (!h || h.dock) { if (sel >= 0) setSel(-1); return; }
      if (h.tray) {
        if (h.side !== 0) return;
        if (h.tray === 'start') { const m = ms.find(x => x.from === 0); if (m) commit(m, true); return; }
        if (h.tray === 'goal') { const c = ms.filter(x => x.finish && (sel < 0 || x.from === sel)); if (c.length === 1) commit(c[0], true); return; }
        return;
      }
      const i = idxAt(0, h.r, h.c);
      if (sel > 0 && i !== sel) { const m = ms.find(x => x.from === sel && !x.finish && (q => q.r === h.r && q.c === h.c)(rcOf(x.to))); if (m) { commit(m, true); return; } }
      if (i > 0 && ms.some(x => x.from === i)) { const m = ms.find(x => x.from === i); commit(m, true); return; }   // (one throw, one move per piece: a tap on the piece moves it)
      const c = ms.filter(x => !x.finish && (q => q.r === h.r && q.c === h.c)(rcOf(x.to)));   // its destination
      if (c.length === 1) { commit(c[0], true); return; }
      setSel(-1);
    }
    ctx.el.addEventListener('click', onClick);
    const pzApi = {
      load, wait() { if (!spec || spec.lock || !n) return; on = true; marksNow(); },
      mark(list) { extra = (list || []).map(x => !Array.isArray(x) ? x : x[0] && typeof x[0] === 'object' && !Array.isArray(x[0]) ? (x[0].type ? x[0] : { m: x[0].m, cls: x[1] }) : { m: x[0], cls: x[1] }); marksNow(); },
      async play(q) { const g0 = gen; for (let i = 0; i < 40 && (busy || loading); i++) await new Promise(r => setTimeout(r, 100)); if (g0 !== gen) return false; const f = Array.isArray(q) ? q[0] : q, m = legal().find(x => x.from === f && (!Array.isArray(q) || x.to === q[1])); if (!m || busy) return false; return commit(m, false); },
      undo() { if (busy) return; kit.cancel(); st = E.clone(st0); hist = []; sel = -1; kit.sync(st); beans(); marksNow(); },
      reset() { pzApi.undo(); }, moves: () => hist.slice(), state: () => st && { pos: st.pos.map(a => a.slice()), n },
      legal: () => legal().map(m => [m.from, m.to]),
      tap(from) { const m = legal().find(x => x.from === from); if (!m || !on || busy) return false; commit(m, true); return true; },   // (tests)
    };
    const api = {
      human: 0, pz: pzApi, canUndo: () => false, canHint: () => false, canResign: () => false,
      stop() { stopped = true; kit.stop(); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); },
      _debug: { st: () => st, kit: () => kit, cell: (r, c) => kit.projCell(r, c), slot: (s, kind, k) => kit.projSlot(s, kind, k) },
    };
    window.__ptTable = api;
    window.Atlas3D.patolli._dbg = { state: () => ({ busy: busy || loading || !E, over: false, legal: legal().length, pzOn: on }) };   // (tools/lesson-progress.js waits while a piece walks or a position loads)
    loadEngine().then(e => { if (stopped) return; E = e; load(pending || PZ.patolli); }).catch(err => console.error('[patolli pz]', err));
    return api;
  }
  function start(ctx) {
    if (ctx.pz) return startPz(ctx);   // (the lessons on the 3D board, atlas/lessons3d.js)
    const T3 = ctx.Table3D, t = ctx.t, X = Object.assign({}, TX.en, TX[ctx.lang] || {});
    const L = { you: t('p.you'), ai: t('p.ai'), think: t('p.think'), win: t('res.win'), lose: t('res.lose') };
    const pvp = ctx.mode === 'pvp', level = Math.max(1, Math.min(20, +ctx.level || 6));
    const rule = RIDS[(+ctx.size || 1) - 1] || 'bell';
    const first = pvp ? 0 : ctx.side === 2 ? 1 : 0;   // ctx.side: 1 = you start, 2 = the AI starts. You are always the near side (engine side 0)
    const setOf = () => { const P = T3.PIECES && T3.PIECES.patolli; const k = P ? P.get() : 'pebble'; return DOT[k] ? k : 'pebble'; };
    const kit = window.PatolliKit.make(T3, { rule, sfx: k => SND[k] && SND[k]() });
    const sideN = s => (X.pn[setOf()] || X.pn.pebble)[s];
    const pname = s => pvp ? sideN(s) : s === 0 ? L.you : L.ai;
    let E = null, st = null, roll = null, phase = 'wait', over = false, stopped = false, busy = false, ply = 0, worker = null, jid = 0, hist = [], hintMv = null, hintJ = 0, msg = '', shown = null, lastMv = null, forced = [], passTok = 0;
    const jobs = new Map(), timers = [];
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const sleep = ms => new Promise(r => later(r, ms));
    const onTurn = s => { ply++; if (ctx.onTurn) ctx.onTurn(s, { human: s >= 0 && (pvp || s === 0), ply }); };
    const mine = () => !!st && !over && (pvp || st.turn === 0);
    const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const RL = () => E.RULES[rule];
    const bvEl = ctx.el.parentNode, isPL = () => !!(bvEl && bvEl.classList.contains('pland'));
    let plWas = null;
    function frame() { if (stopped || over) return; if (T3.fit) T3.fit(isPL() ? { w: 10.4, d: 10.4, y: kit.Y, pitch: 1.5 } : kit.fit0); if (isPL() !== plWas) { plWas = isPL(); hud(); } place(); }
    const onPL = () => { frame(); setTimeout(frame, 350); };
    addEventListener('atlasland', onPL); addEventListener('resize', onPL);

    /* ---------- HUD ---------- */
    const dk = s => `<i class="dk" style="background:${DOT[setOf()][s]};width:18px;height:18px;border-radius:50%;display:inline-block;flex:none"></i>`;
    const homeN = s => st ? st.pos[s].filter(p => p > RL().L).length : 0;
    function hud() {
      if (stopped) return;   // (also after the end, as ur.js: the home counts, the last word and the result stay up to date)
      const can = mine() && !busy, act = phase === 'roll' && can ? 'roll' : phase === 'pass' && can ? 'pass' : '';
      if (isPL()) {
        const a = act ? `<button type="button" class="urb" data-ptt="${act}">${esc(act === 'roll' ? X.roll : X.pass)}</button>` : esc(msg);
        const card = s => `<div class="urc ${st && st.turn === s && !over ? 'on' : ''}"><div class="urc-h">${dk(s)}<span>${esc(pvp ? sideN(s) : s === 0 ? L.you : `${L.ai} Lv.${level}`)}</span><b>${homeN(s)}</b><small>/6 ${esc(X.home)}</small></div><div class="urc-b">${(st ? st.turn === s : s === first) || over ? a : ''}</div></div>`;
        // (popular rules: the round goes here on the phone held sideways — on that small board the pool's two-line label ran into
        // "your stakes" and the arm squares)
        const rnd = E && st && RL().rounds ? `<div class="ptrnd" style="align-self:center;padding:3px 12px;border-radius:99px;background:rgba(255,253,247,.96);border:2px solid #fff;box-shadow:0 3px 0 rgba(150,110,50,.3);font:800 12px var(--font,sans-serif);color:#5a4a2a;white-space:nowrap">${esc(fmt(X.round, { n: st.round }))}</div>` : '';
        ctx.hud(`${card(1)}${rnd}${card(0)}`);
      } else {
        const side = s => `<span class="hs ${st && st.turn === s && !over ? 'on' : ''}">${dk(s)}${esc(pname(s))}<b>${homeN(s)}</b></span>`;
        const mid = act ? `<button type="button" class="btn urb go" data-ptt="${act}">${esc(act === 'roll' ? X.roll : X.pass)}</button>` : `<span class="hm">${esc(msg)}</span>`;
        ctx.hud(`${side(0)}${mid}${side(1)}`);
      }
      chip(); labels();
    }
    const say = m => { msg = m || ''; hud(); };

    /* ---------- the words on the mat: the numbers of the three heaps, the names of the trays; the throw button beside the beans ---------- */
    const css = document.createElement('style');
    css.textContent = ''
      + '.ptdk{position:fixed;left:0;top:0;z-index:85;padding:12px 22px;min-height:42px;border:0;border-radius:999px;font:900 16px/1 var(--font,system-ui),sans-serif;color:#fff;background:linear-gradient(#ff7a6a,#ff5d5d);box-shadow:0 4px 0 #d93c3c,0 8px 18px rgba(0,0,0,.35);cursor:pointer;white-space:nowrap;animation:ptdkP 1.4s ease-in-out infinite}@keyframes ptdkP{50%{filter:brightness(1.12)}}'
      + '.hud .urb{padding:8px 16px;font-size:15px;white-space:nowrap;box-shadow:0 3px 0 var(--coral2)}'
      + '.pttoast{position:fixed;left:50%;top:calc(76px + var(--sat,env(safe-area-inset-top)));transform:translateX(-50%);z-index:90;max-width:min(92vw,560px);padding:9px 18px;border-radius:18px;background:#2b3044;color:#fff;font-weight:900;font-size:14px;line-height:1.35;box-shadow:0 8px 22px rgba(0,0,0,.3);pointer-events:none;animation:ptT .25s ease-out;text-align:center}@keyframes ptT{from{transform:translate(-50%,-8px);opacity:0}}'
      + '@media (max-width:560px){.hud .urb{padding:7px 11px;font-size:13px}.ptdk{padding:10px 16px;font-size:14px;min-height:38px}}';
    document.head.appendChild(css);
    function labels() {
      if (stopped || !st) return;
      const g = shown || st;
      kit.labels(bvEl, { gold0: [pvp ? fmt(X.gold, { s: sideN(0) }) : X.goldYou, g.gold[0]], gold1: [fmt(X.gold, { s: pvp ? sideN(1) : L.ai }), g.gold[1]],
        pool: isPL() ? [X.pool, g.pool, 'r'] : [(RL().rounds ? fmt(X.round, { n: st.round }) + '\n' : '') + X.pool, g.pool], start0: [X.wait], goal0: [X.home], start1: [X.wait], goal1: [X.home] });
    }
    const place = () => kit.place();
    kit.onPlace(() => chipAt());
    let chipEl = null;
    function chipAt() {
      if (!chipEl || stopped) return;
      const q = kit.U.spot('dock'), p = kit.projXZ(q[0], q[1] + 1.05);
      if (!p || !isFinite(p.x)) { chipEl.style.display = 'none'; return; }
      const r = chipEl.getBoundingClientRect(), x = Math.max(6, Math.min(innerWidth - r.width - 6, p.x - r.width / 2)), y = Math.max(70, Math.min(innerHeight - r.height - 90, p.y));
      chipEl.style.display = ''; chipEl.style.transform = `translate(${x | 0}px, ${y | 0}px)`;
    }
    function chip() {
      const want = !stopped && !over && !busy && !isPL() && mine() && (phase === 'roll' || phase === 'pass');
      if (!want) { if (chipEl) { chipEl.remove(); chipEl = null; } return; }
      if (!chipEl) { chipEl = document.createElement('button'); chipEl.type = 'button'; chipEl.className = 'ptdk'; document.body.appendChild(chipEl); }
      chipEl.dataset.ptt = phase; chipEl.textContent = phase === 'roll' ? X.roll : X.pass; chipAt();
    }
    let toastEl = null, toastT = 0;
    function toast(m, ms) { if (toastEl) toastEl.remove(); clearTimeout(toastT); if (!m || stopped) return; toastEl = document.createElement('div'); toastEl.className = 'pttoast'; toastEl.setAttribute('role', 'status'); toastEl.textContent = m; document.body.appendChild(toastEl); const el = toastEl; toastT = setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, ms || 1900); }

    /* ---------- marks ---------- */
    const legal = () => roll && roll.n && st ? E.legalMoves(st, roll.n) : [];
    const rcOf = (side, i) => { const q = E.coords(rule, side, i, st.dir[side]); return q ? { r: q[0], c: q[1] } : null; };
    const idxAt = (side, r, c) => { for (const p of st.pos[side]) { if (p < 1 || p > RL().L) continue; const q = rcOf(side, p); if (q.r === r && q.c === c) return p; } return -1; };
    function showMarks() {
      kit.marks.clear();
      if (lastMv) { if (lastMv.from) kit.marks.cell(lastMv.from.r, lastMv.from.c, 0xffd65a, .16); if (lastMv.to) kit.marks.cell(lastMv.to.r, lastMv.to.c, 0xffd65a, .3); }
      if (phase !== 'move' || !mine()) return;
      const s = st.turn;
      for (const m of legal()) {
        const hot = hintMv && hintMv.from === m.from, col = m.capture ? 0xffb020 : m.pen ? 0xff5d5d : m.again ? 0x6ec8ff : 0x3df59a;
        if (m.from === 0) kit.marks.tray(s, 'start', hot ? 0xff7a1a : 0xffd65a, 0); else { const q = rcOf(s, m.from); kit.marks.ring(q.r, q.c, hot ? 0xff7a1a : 0xffd65a); }
        if (m.finish) kit.marks.tray(s, 'goal', col, st.pos[s].filter(p => p > RL().L).length);
        else { const q = rcOf(s, m.to); kit.marks.cell(q.r, q.c, col, hot ? .62 : .42); if (hot) kit.marks.ring(q.r, q.c, 0xff7a1a); }
      }
    }

    /* ---------- the flow ---------- */
    function throwNow() {   // (tests: api._debug.force([n, …]) decides the next throws)
      if (forced.length) { const n = forced.shift(), d = PAT[n].slice().sort(() => Math.random() - .5); return { d, n }; }
      const r = E.rollDice(Math.random); return { d: r.dice, n: r.n };
    }
    async function doRoll() {
      if (phase !== 'roll' || busy || over || !mine()) return;
      busy = true; phase = 'anim'; hintMv = null; say('');
      const r = throwNow();
      await kit.roll(st.turn, r.d); if (stopped || over) return;
      roll = r; busy = false; afterRoll();
    }
    function afterRoll() {
      const ms = legal(), ai = !pvp && st.turn === 1;
      if (!ms.length) {
        phase = ai ? 'ai' : 'pass'; const m = roll.n ? X.noMove : X.zero; say(m); toast(m);
        const tk = ++passTok; later(() => { if (tk === passTok && (phase === 'pass' || phase === 'ai') && !busy) commit(null); }, ai ? 1200 : 1700);   // a pass goes over by itself (a tap does it at once)
        return;
      }
      if (ai) { aiMove(ms); return; }
      phase = 'move'; hintMv = null; showMarks(); say(fmt(X.move, { n: roll.n }));
    }
    const payText = (e, n) => {
      if (e.t === 'pot') return fmt(X.pot, { s: pname(e.to), a: e.amt });
      if (e.to === 'pool') return (pvp || e.from !== 0 ? pname(e.from) + ' — ' : '') + fmt(!n && RL().zeroOffer ? X.offer : X.toPool, { a: e.amt });
      if (!pvp && e.from === 0) return fmt(X.give, { s: pname(e.to), a: e.amt });
      if (!pvp && e.to === 0) return fmt(X.get, { s: pname(e.from), a: e.amt });
      return pname(e.from) + ' — ' + fmt(X.give, { s: pname(e.to), a: e.amt });
    };
    async function commit(m) {
      if (over || stopped || busy || (phase !== 'move' && phase !== 'pass' && phase !== 'ai')) return;
      busy = true; phase = 'anim'; hintMv = null; hintJ++; passTok++; hud();
      const s = st.turn, n = roll ? roll.n : 0, before = st;
      kit.marks.clear();
      if (m) {
        await kit.move(s, m.from, m.to, { capture: m.capture, onStep: () => SND.hop(), onHit: () => SND.take(), onLand: () => (m.finish ? SND.home : SND.put)() });
        if (stopped || over) return;
        if (pvp || s === 0) hist.push({ st: E.clone(before), roll: { d: roll.d.slice(), n: roll.n } });
      }
      const res = E.apply(before, m, n);
      const head = m ? (m.capture ? (!pvp && s === 1 ? X.capd : X.cap) : m.finish ? X.homeX : m.pen ? X.pen : '') : '';
      // the payments, one after another: the beads fly, then the numbers change
      shown = { gold: before.gold.slice(), pool: before.pool };
      const pays = res.ev.filter(e => e.t === 'pay' || e.t === 'pot'); let k = 0;
      if (head && !pays.length) toast(head);
      for (const e of pays) {
        const from = e.t === 'pot' ? 'pool' : e.from;
        toast((k++ === 0 && head ? head + '　' : '') + payText(e, n), 2400); SND.coin();
        await kit.pay(from, e.to, e.amt); if (stopped || over) return;
        if (from === 'pool') shown.pool -= e.amt; else shown.gold[from] -= e.amt;
        if (e.to === 'pool') shown.pool += e.amt; else shown.gold[e.to] += e.amt;
        kit.gems(shown.gold, shown.pool); labels();
        await sleep(pays.length > 1 ? 420 : 260); if (stopped || over) return;
      }
      const rnd = res.ev.find(e => e.t === 'round');
      if (rnd) { toast(fmt(X.round, { n: rnd.round }) + '　' + fmt(X.roundSub, { s: pname(rnd.winner) }), 3200); SND.home(); await sleep(1700); if (stopped || over) return; }
      st = res.state; roll = null; shown = null; busy = false;
      lastMv = m && !rnd ? { from: m.from > 0 ? (q => q && { r: q[0], c: q[1] })(E.coords(rule, s, m.from, before.dir[s])) : null, to: m.finish ? null : (q => q && { r: q[0], c: q[1] })(E.coords(rule, s, m.to, before.dir[s])) } : null;
      kit.sync(st); showMarks(); labels();
      if (st.winner >= 0) { const endEv = res.ev.find(e => e.t === 'end'); return end(st.winner, endEv ? endEv.why : 'home'); }
      if (res.again) { SND.again(); toast(X.again + '　' + X.againSub, 2200); }
      nextTurn();
    }
    function nextTurn() {
      if (over || stopped) return;
      onTurn(st.turn);
      if (!pvp && st.turn === 1) { phase = 'ai'; say(L.think); later(doAIRoll, 560); return; }
      phase = 'roll'; say(pvp ? fmt(X.turn, { s: sideN(st.turn) }) : '');
    }
    async function doAIRoll() {
      if (over || stopped || busy) return;
      busy = true; const r = throwNow();
      await kit.roll(1, r.d); if (stopped || over) return;
      roll = r; busy = false; afterRoll();
    }
    function ask(state, n) {
      if (worker === null) { try { worker = new Worker(BASE + 'worker.js' + EV); worker.onmessage = e => { const j = jobs.get(e.data.id); if (j) { jobs.delete(e.data.id); j(e.data); } }; worker.onerror = () => { const w = worker; worker = false; try { w.terminate(); } catch (x) {} jobs.forEach(j => j({})); jobs.clear(); }; } catch (e) { worker = false; } }
      if (!worker) return Promise.resolve({});
      return new Promise(r => { const id = ++jid; jobs.set(id, r); worker.postMessage({ id, type: 'think', state: E.clone(state), n, level }); });
    }
    async function aiMove(ms) {
      phase = 'ai'; say(L.think);
      const r = await ask(st, roll.n); if (stopped || over) return;
      let m = r && r.move ? ms.find(x => x.from === r.move.from && x.to === r.move.to) : null; if (!m) m = E.think(st, roll.n, level) || ms[0];
      say(''); commit(m);
    }
    function end(w, why) {
      over = true; phase = 'over'; busy = false; kit.marks.clear(); onTurn(-1); hud();
      // (whyBroke reads "the rival ran out of stakes": said for the winner, as on the 2D page — so not under "you lose")
      const reason = why === 'broke' ? (pvp || w === 0 ? X.whyBroke : '') : X.whyHome, gold = `${st.gold[0]} : ${st.gold[1]}`, score = (reason ? reason + ' · ' : '') + `${X.treasure} ${gold}`;
      SND.home();
      if (pvp) { const wt = fmt(X.win, { s: sideN(w) }); say(wt); return later(() => ctx.onEnd({ win: false, draw: false, level, score, pvp: true, winnerText: wt }), 900); }
      say(w === 0 ? L.win : L.lose);
      later(() => ctx.onEnd({ win: w === 0, draw: false, level, score }), 900);
    }

    /* ---------- taps ---------- */
    function onClick(e) {
      if (stopped || T3.wasDrag() || busy || !st) return;
      if (phase === 'roll' && mine()) { doRoll(); return; }
      if (phase === 'pass' && mine()) { commit(null); return; }
      if (phase !== 'move' || !mine()) return;
      const h = kit.hit(e), s = st.turn, ms = legal(); if (!h || h.dock) return;
      let m = null;
      if (h.tray) { if (h.side !== s) return; m = h.tray === 'start' ? ms.find(x => x.from === 0) : ms.find(x => x.finish); if (!m && h.tray === 'start' && st.pos[s].includes(0)) toast(roll.n !== 1 && st.pos[s].some(p => p >= 1 && p <= RL().L) ? X.need1 : X.cant); }
      else {
        const i = idxAt(s, h.r, h.c);
        if (i > 0) { m = ms.find(x => x.from === i); if (!m) toast(X.cant); }
        else m = ms.find(x => !x.finish && (q => q.r === h.r && q.c === h.c)(rcOf(s, x.to)));   // its destination (no two pieces land on one square)
      }
      if (m) commit(m);
    }
    function onBtn(e) {
      const b = e.target.closest && e.target.closest('[data-ptt]'); if (!b || stopped) return;
      e.stopPropagation(); e.preventDefault();
      if (b.dataset.ptt === 'roll') doRoll(); else if (phase === 'pass' && mine()) commit(null);
    }
    ctx.el.addEventListener('click', onClick);
    document.addEventListener('click', onBtn, true);
    const onKey = e => { if (e.key !== ' ' || e.repeat || stopped) return; if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return; if (phase === 'roll' && mine()) { e.preventDefault(); doRoll(); } else if (phase === 'pass' && mine()) { e.preventDefault(); commit(null); } };
    document.addEventListener('keydown', onKey);
    // the board view's 駒 row during a game: the pieces are rebuilt in the new set at once
    const onPcs = e => { if (!stopped && e.detail && e.detail.id === 'patolli') { kit.setSet(); hud(); } };
    addEventListener('atlas-pieces', onPcs);

    /* ---------- go ---------- */
    frame();
    loadEngine().then(e => {
      if (stopped || over) return; E = e;
      st = E.newGame(rule, { first }); kit.sync(st); kit.restBeans(null); labels();
      if (!pvp) ask(st, 2);   // warms the worker up while the board lands
      later(() => nextTurn(), 700);
    }).catch(e => { console.error('[patolli table]', e); say('⚠'); });

    /* ---------- 待った · ヒント · 投了 · time-out ---------- */
    function finish(loser, why) {
      if (over || !st) return;
      over = true; phase = 'over'; busy = false; kit.marks.clear(); onTurn(-1);
      // ended off the board (resign · time-out): the winner still takes the pool (spec §1, as the 2D page's potAward) — the
      // beads fly to the winner's heap, and the result says who took it and the stakes after it
      const w = 1 - loser, pot = st.pool, r = t(why === 'time' ? 'act.timeout' : 'act.resigned');
      const g0 = st.gold.slice(); st = E.clone(st); roll = null; shown = null;
      if (pot > 0) { st.gold[w] += pot; st.pool = 0; shown = { gold: g0, pool: pot }; SND.coin(); kit.pay('pool', w, pot).then(() => { if (!stopped) { shown = null; kit.gems(st.gold, st.pool); labels(); } }); toast(fmt(X.pot, { s: pname(w), a: pot }), 2400); }
      else { kit.gems(st.gold, st.pool); }
      hud();
      const tail = (pot > 0 ? ' · ' + fmt(X.pot, { s: pname(w), a: pot }) : '') + ` · ${X.treasure} ${st.gold[0]} : ${st.gold[1]}`;
      if (pvp) { const wt = fmt(X.win, { s: sideN(w) }); say(wt); return later(() => ctx.onEnd({ win: false, draw: false, level, score: t('act.pvpEnd', { p: sideN(loser), r, w: wt }) + tail, pvp: true, winnerText: wt }), 900); }
      say(L.lose); later(() => ctx.onEnd({ win: false, draw: false, level, score: r + tail }), 900);
    }
    const api = {
      human: 0,
      // 待った (as the full game): back to just before your last move of a piece, with the throw it was made on — choose again.
      // Passes are skipped (there was nothing to choose); vs the AI its turns after that move go too
      canUndo: () => !stopped && !over && !busy && mine() && (phase === 'roll' || phase === 'move' || phase === 'pass') && hist.length > 0,
      undo() {
        if (!api.canUndo()) return;
        const h = hist.pop(); passTok++; st = E.clone(h.st); roll = { d: h.roll.d.slice(), n: h.roll.n }; hintMv = null; hintJ++; lastMv = null; shown = null;
        kit.sync(st); kit.restBeans(roll.d); onTurn(st.turn); phase = 'move'; showMarks(); say(fmt(X.move, { n: roll.n }));
      },
      canHint: () => !stopped && !over && !busy && phase === 'move' && mine() && legal().length > 0,
      hint() {
        if (!api.canHint()) return Promise.resolve(false);
        const j = ++hintJ, best = E.evaluate(st, roll.n, 2)[0];
        if (j !== hintJ || !best) return Promise.resolve(false);
        hintMv = best.move; showMarks();
        return Promise.resolve(true);
      },
      canResign: () => !stopped && !over && !!st,
      resign() { if (!over && st) finish(pvp ? st.turn : 0, 'resign'); },
      timeout(side) { finish(side, 'time'); },
      stop() {
        stopped = true; if (chipEl) chipEl.remove(); kit.stop(); timers.forEach(clearTimeout); removeEventListener('atlasland', onPL); removeEventListener('resize', onPL); removeEventListener('atlas-pieces', onPcs);
        ctx.el.removeEventListener('click', onClick); document.removeEventListener('click', onBtn, true); document.removeEventListener('keydown', onKey);
        if (worker) worker.terminate(); worker = null; jobs.clear(); css.remove(); if (toastEl) toastEl.remove();
      },
      _debug: { st: () => st && E.clone(st), phase: () => phase, roll: () => roll, busy: () => busy, over: () => over, legal: () => E && st ? legal() : [], kit, rule, hint: () => hintMv, hist: () => hist.length,
        force: a => { forced = a.slice(); }, rc: (side, i) => rcOf(side, i),
        set: s => { if (busy || over) return false; st = E.clone(s); roll = null; lastMv = null; hist = []; kit.sync(st); labels(); phase = 'roll'; showMarks(); hud(); return true; },   // (tests: a position to go on from, the side to move throws)
        cell: (r, c) => kit.projCell(r, c), piece: (s, k) => kit.projPiece(s, k), slot: (s, kind, k) => kit.projSlot(s, kind, k) },
    };
    window.__ptTable = api;   // (tests)
    return api;
  }

  // 種目: a small picture of each rule set's track (60 / 52 squares; the popular rules' centre squares, where pieces are taken, in red)
  function kindArt(sid, v) {
    if (sid !== 'bvSize') return '';
    const a = +v === 2 ? 6 : 7, n = 2 * a + 2, u = 100 / (n + 2), o = u;
    let s = `<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="12" fill="#d8bd7c"/><g transform="rotate(45 50 50) translate(14.6 14.6) scale(.708)">`;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const row = r === a || r === a + 1, col = c === a || c === a + 1; if (!row && !col) continue;
      const centre = row && col, d = Math.min(row ? Math.min(c, n - 1 - c) : 99, col ? Math.min(r, n - 1 - r) : 99), end = !centre && d === 0, pen = !centre && d === 3;
      s += `<rect x="${(o + c * u).toFixed(2)}" y="${(o + r * u).toFixed(2)}" width="${u.toFixed(2)}" height="${u.toFixed(2)}" fill="${centre ? (+v === 2 ? '#d8452c' : '#12a4b8') : end ? '#f6ecd2' : pen ? '#3a2a1c' : '#efdcae'}" stroke="#1b120d" stroke-width=".7"/>`;
    }
    return s + `</g><text x="50" y="96" font-size="11" font-weight="800" text-anchor="middle" fill="#1b120d">${8 * a + 4}</text></svg>`;
  }

  window.Atlas3D = window.Atlas3D || {};
  // table: true — ちゃぶ台で遊ぶ (AI / two players, start() above); フル機能 and レート戦 open patolli/?skin=atlas
  window.Atlas3D.patolli = { levels: 20, sides: true, modes: ['ai', 'rated', 'pvp'], table: true, land: 'side', tableModes: ['ai', 'pvp'], clock: 'bg', kindFirst: true, sizes: [1, 2], size0: 1, sizeLabel: l => tx(l).rules,
    sizeName: (z, l) => tx(l).rn[(+z || 1) - 1], optInfo: (sid, v, l) => sid === 'bvSize' ? { sub: tx(l).rd[(+v || 1) - 1] } : null, kindArt, levelInfo, start, SND, TX };   // SND, TX: shared with the rules course (atlas/rules/patolli.js)
})();
