/* =====================================================================
   Online3D — online play for the flick games on the portal's 3D table (carrom, crokinole; 2026-11-16).
   Two people over Firebase Realtime Database, rated (Elo, the anti-tamper settlement of shared/onlinesec.js) or in rooms.
   · Database: the "flick games" group (claude/online-security-setup.md 0.0) — each game under its own node (<game>/firebase-config.js:
     window.FIREBASE_ROOT), rules shared/flick.database.rules.json (shared/tools/secrules.py, host 'flick'). Until they are
     published the node's probe (<node>secv) is refused: 'not-configured' → the online option says 準備中.
   · Physics are not bit-identical between devices (Math.hypot / trig differ between JS engines), so the shooter's client is
     authoritative: one write per shot appends the shot to moves (x, angle, speed — quantised, the shooter plays the quantised shot
     itself) and puts the resulting state in s (JSON: { st, m: message codes, a: again, f: foul, b: board / round no. }); nt names
     the next shooter (extra turns: carrom's own man in, crokinole's rounds). The other client simulates the same shot from the
     same start (the animation) and then takes s — normally no visible jump. Both clients use the record's k (the men's scale).
   · Time: every shot has DELAY (45 s) free, no reserve (mb = mw = 0); the opponent claims a timeout after DELAY + GRACE, an
     abandonment when the shooter is not in presence for ABANDON_MS on its turn. Game over is written by the last shooter
     (status 'over', win 1 = b / 2 = w / 0 = draw); both report their own result (res/<uid>) and settle.
   · ?mock=1: an in-browser database (localStorage, shared between tabs) for tests; &olsoon=1 shows the 準備中 state;
     &delay=<ms> / &abandon=<ms> shorten the clocks.
   Per game: Online3D.net(game) → the backend; Online3D.match(net, gid) → one game for the adapter; Online3D.open(o) → the lobby.
   ===================================================================== */
(function () {
  'use strict';
  const Q = new URLSearchParams(location.search);
  const MOCK = Q.has('mock'), SOONQ = Q.has('olsoon');
  const FB_VER = '10.12.2', INITIAL = 1500;
  const DELAY = MOCK && +Q.get('delay') > 0 ? +Q.get('delay') : 45000;   // free time per shot (no reserve)
  const GRACE = 3000;
  const ABANDON_MS = MOCK && +Q.get('abandon') > 0 ? +Q.get('abandon') : 45000;
  const ROOM_TTL = 10 * 60000, HIST_N = 50;
  const LIVE_BEAT = 60000, LIVE_STALE = 180000, LEGACY_STALE = 3600000, PRES_GONE = 300000, SWEEP_MARGIN = 20000, PRES_BEAT = 60000, PRES_STALE = 150000;
  // per game: the game lengths offered online (record v = tc), the default
  const GAMES = { carrom: { V: ['b1', 'm25'], def: 'b1' }, crokinole: { V: ['r4', 'p100'], def: 'r4' } };

  // the lobby's words (14 languages; most of them the 2D games' online strings, konane/i18n-online.js, and their panel titles)
  const OLT = {
    ja: {"soon":"準備中","title":"オンライン","rank":"ランキング","connecting":"接続中…","error":"接続できませんでした。","retry":"もう一度","record":"{w}勝 {l}敗 {d}分","find":"対戦相手を探す","findDesc":"レーティングの近い人と自動で組まれます（レート対局）。","searching":"対戦相手を探しています…","searchInfo":"待っている人 {w}人 · レート差 ±{r} まで","cancel":"やめる","rooms":"部屋","noRooms":"開いている部屋はありません","noRank":"まだレート対局の記録がありません","codePh":"部屋コード","join":"参加","openRoom":"公開の部屋","keyRoom":"鍵付きの部屋","openDesc":"一覧に表示される","keyDesc":"コードを知る人だけ","makeRoom":"部屋を作る","roomCode":"部屋コード","roomInfoKey":"コードかリンクを知っている人だけが参加できます。","roomKeep":"部屋の残り時間","roomLeft":"あと{t}","closeRoom":"部屋を閉じる","myRoom":"自分の部屋","showRoom":"表示","noRoom":"その部屋は見つからないか、もう始まっています","setup1":"オンライン対戦は準備中です。","roomExpired":"部屋の時間が切れたので閉じました","rated":"レート対局","friendly":"部屋の対局","illegal":"不正な手を受け取りました","moveFail":"手を送れませんでした。盤面を合わせ直します","youResigned":"投了しました","oppResigned":"相手が投了しました","youTimeout":"時間切れ負け","oppTimeout":"相手の時間切れ","youAbandon":"接続が切れたため負け","oppAbandon":"相手が対局を離れました","hist":"レーティングの推移","resW":"勝","resL":"負","resD":"分","gone":"対局が見つかりません","rename":"名前の変更","st.play":"対局中","paneRated":"レート戦","paneRatedSub":"近いレートの相手と自動で対局","paneRoom":"部屋で対戦","paneRoomSub":"友達と・レート変動なし","rulesMore":"マッチングとレートのしくみ","toLobby":"ロビーに戻る","roomInfoOpen":"一覧に表示されます。コードやリンクを送っても参加できます。","copyLink":"リンクをコピー","copied":"リンクをコピーしました","ngDesc":"世界中の人と対戦します。自動マッチでレーティングの近い人と、または部屋を作って友だちと。","soon2":"AI対戦・レート戦（AI）・二人対戦はこのまま遊べます。","shot":"1打{s}秒","rules":"1打ごとに{s}秒。時間切れ・接続切れは負けになります。部屋の対局はレートが変わりません。","back":"もどる","resume":"続きの対局に戻ります"},
    en: {"soon":"Coming soon","title":"Online","rank":"Ranking","connecting":"Connecting…","error":"Could not connect.","retry":"Try again","record":"{w}W {l}L {d}D","find":"Find an opponent","findDesc":"You are paired with someone of similar rating (rated game).","searching":"Looking for an opponent…","searchInfo":"{w} waiting · rating gap up to ±{r}","cancel":"Cancel","rooms":"Rooms","noRooms":"No open rooms","noRank":"No rated games yet","codePh":"Room code","join":"Join","openRoom":"Open room","keyRoom":"Private room","openDesc":"Shown in the list","keyDesc":"Code only","makeRoom":"Create room","roomCode":"Room code","roomInfoKey":"Only people with the code or link can join.","roomKeep":"Room closes in","roomLeft":"{t}","closeRoom":"Close room","myRoom":"My room","showRoom":"Show","noRoom":"Room not found or already started","setup1":"Online play is being prepared.","roomExpired":"The room timed out and was closed","rated":"Rated game","friendly":"Room game","illegal":"Received an illegal move","moveFail":"Move not sent. Re-syncing the board","youResigned":"You resigned","oppResigned":"Opponent resigned","youTimeout":"Lost on time","oppTimeout":"Opponent ran out of time","youAbandon":"Lost — you were disconnected","oppAbandon":"Your opponent left the game","hist":"Rating history","resW":"W","resL":"L","resD":"D","gone":"Game not found","rename":"Change name","st.play":"playing","paneRated":"Rated game","paneRatedSub":"Matched automatically with a player near your rating","paneRoom":"Play in a room","paneRoomSub":"With friends · no rating change","rulesMore":"How matching and rating work","toLobby":"Back to lobby","roomInfoOpen":"Shown in the list. You can also send the code or link.","copyLink":"Copy link","copied":"Link copied","ngDesc":"Play people from around the world: automatic pairing with someone of similar rating, or create a room for a friend.","soon2":"Games against the AI, rated games against the AI and two-player games are all still here.","shot":"{s} s a shot","rules":"{s} seconds for every shot. Running out of time or leaving the game loses. Games in rooms do not change your rating.","back":"Back","resume":"Back to your game in progress"},
    zh: {"soon":"准备中","title":"在线","rank":"排行榜","connecting":"连接中…","error":"无法连接。","retry":"重试","record":"{w}胜 {l}负 {d}平","find":"寻找对手","findDesc":"自动匹配等级分相近的对手（等级分对局）。","searching":"正在寻找对手…","searchInfo":"等待中 {w}人 · 分差 ±{r} 以内","cancel":"取消","rooms":"房间","noRooms":"没有开放的房间","noRank":"还没有计分对局记录","codePh":"房间码","join":"加入","openRoom":"公开房间","keyRoom":"私密房间","openDesc":"显示在列表中","keyDesc":"仅凭房间码","makeRoom":"创建房间","roomCode":"房间码","roomInfoKey":"只有知道房间码或链接的人才能加入。","roomKeep":"房间剩余时间","roomLeft":"{t}","closeRoom":"关闭房间","myRoom":"我的房间","showRoom":"查看","noRoom":"找不到该房间，或对局已开始","setup1":"在线对战正在准备中。","roomExpired":"房间已超时关闭","rated":"计分对局","friendly":"房间对局","illegal":"收到了非法着法","moveFail":"着法未能发送，正在重新同步棋盘","youResigned":"你认输了","oppResigned":"对手认输","youTimeout":"超时负","oppTimeout":"对手超时","youAbandon":"因断线判负","oppAbandon":"对手已离开对局","hist":"等级分走势","resW":"胜","resL":"负","resD":"和","gone":"找不到对局","rename":"修改名字","st.play":"对局中","paneRated":"等级分对局","paneRatedSub":"自动匹配等级分相近的对手","paneRoom":"房间对局","paneRoomSub":"和朋友 · 不计等级分","rulesMore":"匹配与等级分说明","toLobby":"返回大厅","roomInfoOpen":"会显示在列表中，也可以发送房间码或链接。","copyLink":"复制链接","copied":"链接已复制","ngDesc":"与世界各地的玩家对战：自动匹配等级分相近的对手，或创建房间与朋友对战。","soon2":"AI对战、AI等级分对局和双人对战照常可玩。","shot":"每杆{s}秒","rules":"每杆{s}秒。超时或断线判负。房间对局不影响等级分。","back":"返回","resume":"回到进行中的对局"},
    'zh-TW': {"soon":"即將推出","title":"線上","rank":"排行榜","connecting":"連線中…","error":"無法連線。","retry":"重試","record":"{w}勝 {l}敗 {d}和","find":"尋找對手","findDesc":"自動配對積分相近的對手（積分對局）。","searching":"正在尋找對手…","searchInfo":"等待中 {w} 人 · 積分差 ±{r} 以內","cancel":"取消","rooms":"房間","noRooms":"沒有公開房間","noRank":"還沒有積分對局","codePh":"房號","join":"加入","openRoom":"公開房間","keyRoom":"私人房間","openDesc":"顯示在列表中","keyDesc":"僅限房號","makeRoom":"建立房間","roomCode":"房號","roomInfoKey":"只有知道房號或連結的人才能加入。","roomKeep":"房間關閉倒數","roomLeft":"{t}","closeRoom":"關閉房間","myRoom":"我的房間","showRoom":"顯示","noRoom":"找不到房間，或對局已開始","setup1":"線上對戰準備中。","roomExpired":"房間逾時已關閉","rated":"積分對局","friendly":"房間對局","illegal":"收到不合規則的一步","moveFail":"這步沒有送出，正在重新同步棋盤","youResigned":"你認輸了","oppResigned":"對手認輸","youTimeout":"超時落敗","oppTimeout":"對手時間用完","youAbandon":"斷線判負","oppAbandon":"對手離開了對局","hist":"積分走勢","resW":"勝","resL":"敗","resD":"和","gone":"找不到對局","rename":"更改名稱","st.play":"對局中","paneRated":"積分對局","paneRatedSub":"自動配對積分相近的對手","paneRoom":"房間對局","paneRoomSub":"和朋友 · 不計積分","rulesMore":"配對與積分說明","toLobby":"返回大廳","roomInfoOpen":"會顯示在列表中。也可以傳送房號或連結。","copyLink":"複製連結","copied":"已複製連結","ngDesc":"與世界各地的玩家對戰：自動配對積分相近的對手，或建立房間與朋友對戰。","soon2":"AI對戰、AI積分對局和雙人對戰照常可玩。","shot":"每桿{s}秒","rules":"每桿{s}秒。超時或斷線判負。房間對局不影響積分。","back":"返回","resume":"回到進行中的對局"},
    ko: {"soon":"준비 중","title":"온라인","rank":"랭킹","connecting":"연결 중…","error":"연결할 수 없습니다.","retry":"다시 시도","record":"{w}승 {l}패 {d}무","find":"상대 찾기","findDesc":"레이팅이 비슷한 사람과 자동으로 매칭됩니다(레이팅 대국).","searching":"상대를 찾는 중…","searchInfo":"대기 {w}명 · 레이팅 차 ±{r}까지","cancel":"취소","rooms":"방","noRooms":"열린 방이 없습니다","noRank":"아직 레이팅 대국 기록이 없습니다","codePh":"방 코드","join":"참가","openRoom":"공개 방","keyRoom":"비공개 방","openDesc":"목록에 표시됨","keyDesc":"코드를 아는 사람만","makeRoom":"방 만들기","roomCode":"방 코드","roomInfoKey":"코드나 링크를 아는 사람만 참가할 수 있습니다.","roomKeep":"방 남은 시간","roomLeft":"{t}","closeRoom":"방 닫기","myRoom":"내 방","showRoom":"보기","noRoom":"방을 찾을 수 없거나 이미 시작되었습니다","setup1":"온라인 대전은 준비 중입니다.","roomExpired":"시간이 지나 방이 닫혔습니다","rated":"레이팅 대국","friendly":"방 대국","illegal":"잘못된 수를 받았습니다","moveFail":"수를 보내지 못했습니다. 보드를 다시 맞춥니다","youResigned":"기권했습니다","oppResigned":"상대가 기권했습니다","youTimeout":"시간 초과 패","oppTimeout":"상대 시간 초과","youAbandon":"연결이 끊겨 패배","oppAbandon":"상대가 대국을 떠났습니다","hist":"레이팅 추이","resW":"승","resL":"패","resD":"무","gone":"대국을 찾을 수 없습니다","rename":"이름 변경","st.play":"대국 중","paneRated":"레이팅전","paneRatedSub":"비슷한 레이팅의 상대와 자동 매칭","paneRoom":"방에서 대국","paneRoomSub":"친구와 · 레이팅 변동 없음","rulesMore":"매칭과 레이팅 안내","toLobby":"로비로 돌아가기","roomInfoOpen":"목록에 표시됩니다. 코드나 링크를 보내도 참가할 수 있습니다.","copyLink":"링크 복사","copied":"링크를 복사했습니다","ngDesc":"전 세계 사람들과 대전합니다. 레이팅이 비슷한 사람과 자동 매칭하거나, 방을 만들어 친구와 둡니다.","soon2":"AI 대전, AI 레이팅전, 2인 대전은 그대로 즐길 수 있어요.","shot":"한 번에 {s}초","rules":"한 번 칠 때마다 {s}초. 시간 초과나 접속 끊김은 패배입니다. 방 대국은 레이팅이 바뀌지 않습니다.","back":"돌아가기","resume":"진행 중인 대국으로 돌아갑니다"},
    es: {"soon":"Próximamente","title":"En línea","rank":"Clasificación","connecting":"Conectando…","error":"No se pudo conectar.","retry":"Reintentar","record":"{w}G {l}P {d}E","find":"Buscar rival","findDesc":"Te emparejamos con alguien de puntuación similar (partida puntuada).","searching":"Buscando rival…","searchInfo":"{w} esperando · diferencia hasta ±{r}","cancel":"Cancelar","rooms":"Salas","noRooms":"No hay salas abiertas","noRank":"Aún no hay partidas puntuadas","codePh":"Código de sala","join":"Entrar","openRoom":"Sala abierta","keyRoom":"Sala privada","openDesc":"Aparece en la lista","keyDesc":"Solo con código","makeRoom":"Crear sala","roomCode":"Código de sala","roomInfoKey":"Solo quien tenga el código o el enlace puede entrar.","roomKeep":"La sala se cierra en","roomLeft":"{t}","closeRoom":"Cerrar sala","myRoom":"Mi sala","showRoom":"Mostrar","noRoom":"Sala no encontrada o ya empezada","setup1":"El juego en línea se está preparando.","roomExpired":"La sala caducó y se cerró","rated":"Partida puntuada","friendly":"Partida en sala","illegal":"Se recibió una jugada ilegal","moveFail":"No se envió la jugada. Resincronizando","youResigned":"Abandonaste","oppResigned":"Tu rival abandonó","youTimeout":"Derrota por tiempo","oppTimeout":"Tu rival se quedó sin tiempo","youAbandon":"Derrota: te desconectaste","oppAbandon":"Tu rival abandonó la partida","hist":"Evolución de la puntuación","resW":"V","resL":"D","resD":"T","gone":"Partida no encontrada","rename":"Cambiar nombre","st.play":"jugando","paneRated":"Partida puntuada","paneRatedSub":"Emparejamiento automático con un rival de nivel parecido","paneRoom":"Jugar en una sala","paneRoomSub":"Con amigos · sin cambio de puntuación","rulesMore":"Cómo funcionan el emparejamiento y la puntuación","toLobby":"Volver al vestíbulo","roomInfoOpen":"Aparece en la lista. También puedes enviar el código o el enlace.","copyLink":"Copiar enlace","copied":"Enlace copiado","ngDesc":"Juega contra gente de todo el mundo: emparejamiento automático con alguien de puntuación parecida, o crea una sala para un amigo.","soon2":"Las partidas contra la IA, las puntuadas contra la IA y las de dos jugadores siguen disponibles.","shot":"{s} s por tiro","rules":"{s} segundos por tiro. Quedarse sin tiempo o abandonar la partida es derrota. Las partidas en salas no cambian tu puntuación.","back":"Volver","resume":"Volviendo a tu partida en curso"},
    fr: {"soon":"Bientôt","title":"En ligne","rank":"Classement","connecting":"Connexion…","error":"Connexion impossible.","retry":"Réessayer","record":"{w}V {l}D {d}N","find":"Trouver un adversaire","findDesc":"Vous êtes apparié à un joueur de classement proche (partie classée).","searching":"Recherche d’un adversaire…","searchInfo":"{w} en attente · écart jusqu’à ±{r}","cancel":"Annuler","rooms":"Salons","noRooms":"Aucun salon ouvert","noRank":"Pas encore de parties classées","codePh":"Code du salon","join":"Rejoindre","openRoom":"Salon public","keyRoom":"Salon privé","openDesc":"Visible dans la liste","keyDesc":"Avec le code seulement","makeRoom":"Créer un salon","roomCode":"Code du salon","roomInfoKey":"Seuls ceux qui ont le code ou le lien peuvent entrer.","roomKeep":"Le salon ferme dans","roomLeft":"{t}","closeRoom":"Fermer le salon","myRoom":"Mon salon","showRoom":"Afficher","noRoom":"Salon introuvable ou déjà commencé","setup1":"Le jeu en ligne est en préparation.","roomExpired":"Le salon a expiré et a été fermé","rated":"Partie classée","friendly":"Partie en salon","illegal":"Coup illégal reçu","moveFail":"Coup non envoyé. Resynchronisation du plateau","youResigned":"Vous avez abandonné","oppResigned":"L’adversaire a abandonné","youTimeout":"Perdu au temps","oppTimeout":"L’adversaire a dépassé le temps","youAbandon":"Défaite : vous avez été déconnecté","oppAbandon":"Votre adversaire a quitté la partie","hist":"Évolution du classement","resW":"V","resL":"D","resD":"N","gone":"Partie introuvable","rename":"Changer de nom","st.play":"en partie","paneRated":"Partie classée","paneRatedSub":"Appariement automatique avec un joueur de niveau proche","paneRoom":"Jouer dans un salon","paneRoomSub":"Entre amis · sans effet sur le classement","rulesMore":"Appariement et classement","toLobby":"Retour au salon","roomInfoOpen":"Affiché dans la liste. Vous pouvez aussi envoyer le code ou le lien.","copyLink":"Copier le lien","copied":"Lien copié","ngDesc":"Jouez contre des gens du monde entier : appariement automatique avec un joueur de classement proche, ou créez une salle pour un ami.","soon2":"Les parties contre l’IA, les parties classées contre l’IA et à deux restent disponibles.","shot":"{s} s par coup","rules":"{s} secondes par coup. Le temps écoulé ou une déconnexion fait perdre. Les parties en salon ne changent pas le classement.","back":"Retour","resume":"Retour à votre partie en cours"},
    pt: {"soon":"Em breve","title":"Online","rank":"Ranking","connecting":"Conectando…","error":"Não foi possível conectar.","retry":"Tentar de novo","record":"{w}V {l}D {d}E","find":"Procurar adversário","findDesc":"Você é pareado com alguém de pontuação parecida (partida valendo pontos).","searching":"Procurando adversário…","searchInfo":"{w} esperando · diferença até ±{r}","cancel":"Cancelar","rooms":"Salas","noRooms":"Nenhuma sala aberta","noRank":"Ainda não há partidas ranqueadas","codePh":"Código da sala","join":"Entrar","openRoom":"Sala aberta","keyRoom":"Sala privada","openDesc":"Aparece na lista","keyDesc":"Só com o código","makeRoom":"Criar sala","roomCode":"Código da sala","roomInfoKey":"Só quem tem o código ou o link pode entrar.","roomKeep":"A sala fecha em","roomLeft":"{t}","closeRoom":"Fechar sala","myRoom":"Minha sala","showRoom":"Mostrar","noRoom":"Sala não encontrada ou já iniciada","setup1":"O jogo online está sendo preparado.","roomExpired":"A sala expirou e foi fechada","rated":"Partida ranqueada","friendly":"Partida em sala","illegal":"Lance ilegal recebido","moveFail":"Lance não enviado. Ressincronizando o tabuleiro","youResigned":"Você desistiu","oppResigned":"O adversário desistiu","youTimeout":"Derrota por tempo","oppTimeout":"O tempo do adversário acabou","youAbandon":"Derrota: você foi desconectado","oppAbandon":"Seu adversário saiu da partida","hist":"Histórico da pontuação","resW":"V","resL":"D","resD":"E","gone":"Partida não encontrada","rename":"Mudar nome","st.play":"jogando","paneRated":"Partida ranqueada","paneRatedSub":"Pareamento automático com alguém de rating próximo","paneRoom":"Jogar em uma sala","paneRoomSub":"Com amigos · sem mudar o rating","rulesMore":"Como funcionam o pareamento e o rating","toLobby":"Voltar ao saguão","roomInfoOpen":"Aparece na lista. Você também pode enviar o código ou o link.","copyLink":"Copiar link","copied":"Link copiado","ngDesc":"Jogue contra pessoas do mundo todo: pareamento automático com alguém de pontuação parecida, ou crie uma sala para um amigo.","soon2":"Partidas contra a IA, ranqueadas contra a IA e de dois jogadores continuam disponíveis.","shot":"{s} s por tacada","rules":"{s} segundos por tacada. Estourar o tempo ou sair da partida é derrota. Partidas em salas não mudam o rating.","back":"Voltar","resume":"Voltando à sua partida em andamento"},
    de: {"soon":"Demnächst","title":"Online","rank":"Rangliste","connecting":"Verbinde…","error":"Keine Verbindung möglich.","retry":"Erneut versuchen","record":"{w}S {l}N {d}R","find":"Gegner suchen","findDesc":"Du wirst mit jemandem ähnlicher Wertung gepaart (gewertete Partie).","searching":"Suche Gegner…","searchInfo":"{w} warten · Wertungsabstand bis ±{r}","cancel":"Abbrechen","rooms":"Räume","noRooms":"Keine offenen Räume","noRank":"Noch keine gewerteten Partien","codePh":"Raumcode","join":"Beitreten","openRoom":"Offener Raum","keyRoom":"Privater Raum","openDesc":"In der Liste sichtbar","keyDesc":"Nur mit Code","makeRoom":"Raum erstellen","roomCode":"Raumcode","roomInfoKey":"Nur wer Code oder Link kennt, kann beitreten.","roomKeep":"Raum schließt in","roomLeft":"{t}","closeRoom":"Raum schließen","myRoom":"Mein Raum","showRoom":"Anzeigen","noRoom":"Raum nicht gefunden oder schon gestartet","setup1":"Online-Spiel wird vorbereitet.","roomExpired":"Der Raum ist abgelaufen und wurde geschlossen","rated":"Gewertete Partie","friendly":"Raumpartie","illegal":"Ungültigen Zug erhalten","moveFail":"Zug nicht gesendet. Brett wird neu abgeglichen","youResigned":"Du hast aufgegeben","oppResigned":"Gegner hat aufgegeben","youTimeout":"Zeit überschritten","oppTimeout":"Gegner hat die Zeit überschritten","youAbandon":"Verloren – Verbindung getrennt","oppAbandon":"Dein Gegner hat die Partie verlassen","hist":"Wertungsverlauf","resW":"S","resL":"N","resD":"R","gone":"Partie nicht gefunden","rename":"Namen ändern","st.play":"spielt","paneRated":"Gewertete Partie","paneRatedSub":"Automatisch gegen einen Gegner mit ähnlicher Wertung","paneRoom":"In einem Raum spielen","paneRoomSub":"Mit Freunden · ohne Wertung","rulesMore":"So funktionieren Zuordnung und Wertung","toLobby":"Zurück zur Lobby","roomInfoOpen":"Wird in der Liste angezeigt. Du kannst auch Code oder Link schicken.","copyLink":"Link kopieren","copied":"Link kopiert","ngDesc":"Spiele gegen Menschen aus aller Welt: automatische Paarung mit jemandem ähnlicher Wertung oder ein eigener Raum für Freunde.","soon2":"Partien gegen die KI, gewertete Partien gegen die KI und Partien zu zweit gehen weiterhin.","shot":"{s} s pro Stoß","rules":"{s} Sekunden pro Stoß. Zeitüberschreitung oder Verlassen der Partie verliert. Partien in Räumen ändern die Wertung nicht.","back":"Zurück","resume":"Zurück zu deiner laufenden Partie"},
    hi: {"soon":"जल्द आ रहा है","title":"ऑनलाइन","rank":"रैंकिंग","connecting":"कनेक्ट हो रहा है…","error":"कनेक्ट नहीं हो सका।","retry":"फिर कोशिश करें","record":"{w}जीत {l}हार {d}ड्रॉ","find":"प्रतिद्वंद्वी खोजें","findDesc":"आपको मिलती-जुलती रेटिंग वाले खिलाड़ी से जोड़ा जाता है (रेटेड खेल)।","searching":"प्रतिद्वंद्वी खोजा जा रहा है…","searchInfo":"{w} प्रतीक्षा में · रेटिंग अंतर ±{r} तक","cancel":"रद्द करें","rooms":"रूम","noRooms":"कोई खुला रूम नहीं","noRank":"अभी कोई रेटेड खेल नहीं","codePh":"रूम कोड","join":"जुड़ें","openRoom":"खुला रूम","keyRoom":"निजी रूम","openDesc":"सूची में दिखेगा","keyDesc":"सिर्फ़ कोड से","makeRoom":"रूम बनाएँ","roomCode":"रूम कोड","roomInfoKey":"सिर्फ़ कोड या लिंक जानने वाले ही जुड़ सकते हैं।","roomKeep":"रूम बंद होने में","roomLeft":"{t}","closeRoom":"रूम बंद करें","myRoom":"मेरा रूम","showRoom":"दिखाएँ","noRoom":"रूम नहीं मिला या खेल शुरू हो चुका है","setup1":"ऑनलाइन खेल की तैयारी चल रही है।","roomExpired":"रूम का समय खत्म होकर बंद हो गया","rated":"रेटेड खेल","friendly":"रूम खेल","illegal":"अवैध चाल मिली","moveFail":"चाल नहीं भेजी जा सकी। बोर्ड फिर से मिलाया जा रहा है","youResigned":"आपने हार मानी","oppResigned":"प्रतिद्वंद्वी ने हार मानी","youTimeout":"समय खत्म — हार","oppTimeout":"प्रतिद्वंद्वी का समय खत्म","youAbandon":"हार — आपका कनेक्शन टूट गया","oppAbandon":"प्रतिद्वंद्वी गेम छोड़कर चले गए","hist":"रेटिंग इतिहास","resW":"जी","resL":"हा","resD":"ड्रॉ","gone":"खेल नहीं मिला","rename":"नाम बदलें","st.play":"खेल रहे","paneRated":"रेटेड खेल","paneRatedSub":"मिलती-जुलती रेटिंग वाले खिलाड़ी से अपने-आप मुकाबला","paneRoom":"कमरे में खेलें","paneRoomSub":"दोस्तों के साथ · रेटिंग में बदलाव नहीं","rulesMore":"मिलान और रेटिंग कैसे काम करते हैं","toLobby":"लॉबी पर लौटें","roomInfoOpen":"सूची में दिखेगा। आप कोड या लिंक भी भेज सकते हैं।","copyLink":"लिंक कॉपी करें","copied":"लिंक कॉपी हुआ","ngDesc":"दुनिया भर के लोगों से खेलें: मिलती-जुलती रेटिंग वाले खिलाड़ी से अपने-आप जोड़ी, या दोस्त के लिए कमरा बनाएँ।","soon2":"AI के ख़िलाफ़ खेल, AI के साथ रेटेड खेल और दो खिलाड़ियों वाला खेल पहले जैसे उपलब्ध हैं।","shot":"हर शॉट {s} सेकंड","rules":"हर शॉट के लिए {s} सेकंड। समय ख़त्म होने या खेल छोड़ने पर हार। कमरे के खेल से रेटिंग नहीं बदलती।","back":"वापस","resume":"चल रहे खेल पर लौट रहे हैं"},
    ar: {"soon":"قريبًا","title":"عبر الإنترنت","rank":"الترتيب","connecting":"جارٍ الاتصال…","error":"تعذّر الاتصال.","retry":"أعد المحاولة","record":"{w} فوز · {l} خسارة · {d} تعادل","find":"ابحث عن خصم","findDesc":"تُقرن بلاعب بتصنيف قريب (مباراة مصنّفة).","searching":"جارٍ البحث عن خصم…","searchInfo":"{w} ينتظرون · فارق حتى ±{r}","cancel":"إلغاء","rooms":"الغرف","noRooms":"لا توجد غرف مفتوحة","noRank":"لا توجد مباريات مصنّفة بعد","codePh":"رمز الغرفة","join":"انضم","openRoom":"غرفة عامة","keyRoom":"غرفة خاصة","openDesc":"يظهر في القائمة","keyDesc":"بالرمز فقط","makeRoom":"أنشئ غرفة","roomCode":"رمز الغرفة","roomInfoKey":"يمكن فقط لمن يعرف الرمز أو الرابط الانضمام.","roomKeep":"تُغلق الغرفة بعد","roomLeft":"{t}","closeRoom":"أغلق الغرفة","myRoom":"غرفتي","showRoom":"عرض","noRoom":"الغرفة غير موجودة أو بدأت المباراة","setup1":"اللعب عبر الإنترنت قيد التجهيز.","roomExpired":"انتهت مهلة الغرفة فأُغلقت","rated":"مباراة مصنّفة","friendly":"مباراة غرفة","illegal":"وصلت نقلة غير صالحة","moveFail":"لم تُرسل النقلة. جارٍ إعادة مزامنة اللوح","youResigned":"لقد استسلمت","oppResigned":"استسلم خصمك","youTimeout":"خسارة بانتهاء الوقت","oppTimeout":"انتهى وقت خصمك","youAbandon":"خسارة — انقطع اتصالك","oppAbandon":"غادر خصمك المباراة","hist":"تطوّر التصنيف","resW":"ف","resL":"خ","resD":"ت","gone":"المباراة غير موجودة","rename":"تغيير الاسم","st.play":"يلعب","paneRated":"مباراة مصنّفة","paneRatedSub":"مطابقة تلقائية مع لاعب قريب من تصنيفك","paneRoom":"اللعب في غرفة","paneRoomSub":"مع الأصدقاء · دون تغيير التصنيف","rulesMore":"كيف تعمل المطابقة والتصنيف","toLobby":"العودة إلى الردهة","roomInfoOpen":"تظهر في القائمة. يمكنك أيضًا إرسال الرمز أو الرابط.","copyLink":"انسخ الرابط","copied":"تم نسخ الرابط","ngDesc":"العب ضد أشخاص من حول العالم: مطابقة تلقائية مع لاعب بتصنيف قريب، أو أنشئ غرفة لصديق.","soon2":"اللعب ضد الذكاء الاصطناعي والمباريات المصنّفة ضده واللعب لشخصين متاحة كما هي.","shot":"{s} ث لكل ضربة","rules":"{s} ثانية لكل ضربة. نفاد الوقت أو مغادرة المباراة خسارة. مباريات الغرف لا تغيّر تصنيفك.","back":"رجوع","resume":"العودة إلى مباراتك الجارية"},
    ru: {"soon":"Скоро","title":"Онлайн","rank":"Рейтинг","connecting":"Подключение…","error":"Не удалось подключиться.","retry":"Повторить","record":"{w}В {l}П {d}Н","find":"Найти соперника","findDesc":"Подбирается соперник с близким рейтингом (рейтинговая партия).","searching":"Ищем соперника…","searchInfo":"Ждут: {w} · разница рейтинга до ±{r}","cancel":"Отмена","rooms":"Комнаты","noRooms":"Открытых комнат нет","noRank":"Рейтинговых партий пока нет","codePh":"Код комнаты","join":"Войти","openRoom":"Открытая","keyRoom":"Закрытая","openDesc":"Видна в списке","keyDesc":"Только по коду","makeRoom":"Создать комнату","roomCode":"Код комнаты","roomInfoKey":"Войти могут только те, у кого есть код или ссылка.","roomKeep":"Комната закроется через","roomLeft":"{t}","closeRoom":"Закрыть комнату","myRoom":"Моя комната","showRoom":"Показать","noRoom":"Комната не найдена или игра уже началась","setup1":"Онлайн-игра готовится.","roomExpired":"Время ожидания истекло, комната закрыта","rated":"Рейтинговая партия","friendly":"Партия в комнате","illegal":"Получен недопустимый ход","moveFail":"Ход не отправлен. Синхронизируем доску","youResigned":"Вы сдались","oppResigned":"Соперник сдался","youTimeout":"Поражение по времени","oppTimeout":"У соперника кончилось время","youAbandon":"Поражение — связь потеряна","oppAbandon":"Соперник покинул партию","hist":"История рейтинга","resW":"В","resL":"П","resD":"Н","gone":"Партия не найдена","rename":"Сменить имя","st.play":"играет","paneRated":"Рейтинговая партия","paneRatedSub":"Автоподбор соперника близкого рейтинга","paneRoom":"Игра в комнате","paneRoomSub":"С друзьями · без изменения рейтинга","rulesMore":"Как работают подбор и рейтинг","toLobby":"В лобби","roomInfoOpen":"Комната видна в списке. Можно также отправить код или ссылку.","copyLink":"Копировать ссылку","copied":"Ссылка скопирована","ngDesc":"Играйте с людьми со всего мира: автоподбор соперника с близким рейтингом или комната для друга.","soon2":"Игры с ИИ, рейтинговые партии с ИИ и игра вдвоём по-прежнему доступны.","shot":"{s} с на удар","rules":"{s} секунд на каждый удар. Истекшее время или выход из партии — поражение. Партии в комнатах не меняют рейтинг.","back":"Назад","resume":"Возвращаемся к начатой партии"},
    id: {"soon":"Segera hadir","title":"Online","rank":"Peringkat","connecting":"Menghubungkan…","error":"Tidak dapat terhubung.","retry":"Coba lagi","record":"{w}M {l}K {d}S","find":"Cari lawan","findDesc":"Kamu dipasangkan dengan pemain ber-rating mirip (permainan rating).","searching":"Mencari lawan…","searchInfo":"{w} menunggu · selisih rating hingga ±{r}","cancel":"Batal","rooms":"Ruang","noRooms":"Tidak ada ruang terbuka","noRank":"Belum ada permainan rating","codePh":"Kode ruang","join":"Masuk","openRoom":"Ruang terbuka","keyRoom":"Ruang privat","openDesc":"Tampil di daftar","keyDesc":"Hanya dengan kode","makeRoom":"Buat ruang","roomCode":"Kode ruang","roomInfoKey":"Hanya yang punya kode atau tautan yang bisa masuk.","roomKeep":"Ruang ditutup dalam","roomLeft":"{t}","closeRoom":"Tutup ruang","myRoom":"Ruang saya","showRoom":"Lihat","noRoom":"Ruang tidak ditemukan atau sudah dimulai","setup1":"Permainan online sedang disiapkan.","roomExpired":"Waktu habis, ruang ditutup","rated":"Permainan rating","friendly":"Permainan ruang","illegal":"Menerima langkah yang tidak sah","moveFail":"Langkah tidak terkirim. Menyinkronkan ulang papan","youResigned":"Kamu menyerah","oppResigned":"Lawan menyerah","youTimeout":"Kalah waktu","oppTimeout":"Waktu lawan habis","youAbandon":"Kalah — koneksi terputus","oppAbandon":"Lawan meninggalkan permainan","hist":"Riwayat rating","resW":"M","resL":"K","resD":"S","gone":"Permainan tidak ditemukan","rename":"Ganti nama","st.play":"bermain","paneRated":"Permainan berperingkat","paneRatedSub":"Dipasangkan otomatis dengan pemain berperingkat mirip","paneRoom":"Main di ruang","paneRoomSub":"Dengan teman · peringkat tetap","rulesMore":"Cara kerja pencocokan dan peringkat","toLobby":"Kembali ke lobi","roomInfoOpen":"Tampil di daftar. Kamu juga bisa mengirim kode atau tautan.","copyLink":"Salin tautan","copied":"Tautan disalin","ngDesc":"Main dengan orang dari seluruh dunia: pemasangan otomatis dengan pemain ber-rating mirip, atau buat ruang untuk teman.","soon2":"Main melawan AI, permainan berperingkat melawan AI, dan main berdua tetap tersedia.","shot":"{s} dtk per sentilan","rules":"{s} detik untuk setiap sentilan. Kehabisan waktu atau keluar dari permainan berarti kalah. Permainan di ruang tidak mengubah peringkat.","back":"Kembali","resume":"Kembali ke permainan yang sedang berjalan"},
    tr: {"soon":"Yakında","title":"Çevrimiçi","rank":"Sıralama","connecting":"Bağlanıyor…","error":"Bağlanılamadı.","retry":"Tekrar dene","record":"{w}G {l}M {d}B","find":"Rakip bul","findDesc":"Puanı yakın biriyle eşleşirsiniz (puanlı oyun).","searching":"Rakip aranıyor…","searchInfo":"{w} bekliyor · puan farkı ±{r}'e kadar","cancel":"İptal","rooms":"Odalar","noRooms":"Açık oda yok","noRank":"Henüz puanlı oyun yok","codePh":"Oda kodu","join":"Katıl","openRoom":"Açık oda","keyRoom":"Özel oda","openDesc":"Listede görünür","keyDesc":"Yalnızca kodla","makeRoom":"Oda kur","roomCode":"Oda kodu","roomInfoKey":"Yalnızca kodu veya bağlantısı olanlar katılabilir.","roomKeep":"Odanın kapanmasına","roomLeft":"{t}","closeRoom":"Odayı kapat","myRoom":"Odam","showRoom":"Göster","noRoom":"Oda bulunamadı ya da oyun başladı","setup1":"Çevrimiçi oyun hazırlanıyor.","roomExpired":"Süre doldu, oda kapatıldı","rated":"Puanlı oyun","friendly":"Oda oyunu","illegal":"Geçersiz bir hamle alındı","moveFail":"Hamle gönderilemedi. Tahta yeniden eşitleniyor","youResigned":"Terk ettiniz","oppResigned":"Rakip terk etti","youTimeout":"Süreden kaybettiniz","oppTimeout":"Rakibin süresi bitti","youAbandon":"Kaybettiniz — bağlantı koptu","oppAbandon":"Rakip oyunu bıraktı","hist":"Puan geçmişi","resW":"G","resL":"M","resD":"B","gone":"Oyun bulunamadı","rename":"Adı değiştir","st.play":"oynuyor","paneRated":"Puanlı oyun","paneRatedSub":"Yakın puanlı bir rakiple otomatik eşleşme","paneRoom":"Odada oyna","paneRoomSub":"Arkadaşlarla · puan değişmez","rulesMore":"Eşleşme ve puan nasıl işler","toLobby":"Lobiye dön","roomInfoOpen":"Listede görünür. Kodu veya bağlantıyı da gönderebilirsiniz.","copyLink":"Bağlantıyı kopyala","copied":"Bağlantı kopyalandı","ngDesc":"Dünyanın her yerinden insanlarla oynayın: puanı yakın biriyle otomatik eşleşme ya da bir arkadaş için oda.","soon2":"Yapay zekâya karşı oyun, yapay zekâyla puanlı oyun ve iki kişilik oyun aynen oynanabilir.","shot":"Atış başına {s} sn","rules":"Her atış için {s} saniye. Süre dolarsa ya da oyundan çıkarsan kaybedersin. Oda oyunları puanını değiştirmez.","back":"Geri","resume":"Süren oyununa dönülüyor"},
  };

  function loadScript(src) { const C = window.__fbScripts = window.__fbScripts || {}; return C[src] || (C[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load ' + src)); document.head.appendChild(s); })); }   // (shared with shared/atlas-account.js and the games' online.js)

  // ---------------------------------------------------------------- the game's Firebase settings (<game>/firebase-config.js)
  // The config files set window globals; each is read right after it ran (the portal can open both games in one page).
  const CFGS = {};
  const snap = game => { if (window.FIREBASE_ROOT === game + '/' && window.FIREBASE_CONFIG) CFGS[game] = { cfg: window.FIREBASE_CONFIG, root: game + '/', key: window.FIREBASE_APPCHECK_SITE_KEY || null }; return CFGS[game]; };
  async function config(game) {
    if (CFGS[game] || snap(game)) return CFGS[game];
    await loadScript('../' + game + '/firebase-config.js?v=1');
    return snap(game) || (CFGS[game] = { cfg: null, root: game + '/', key: null });
  }

  // ---------------------------------------------------------------- the shot on the wire
  // x (cm, ±50), angle (rad, ±π), v (cm/s) as three base-36 integers: "x,a,v;" — the shooter plays the decoded shot itself
  const Qx = x => Math.round((x + 50) * 1000), Qa = a => Math.round((Math.atan2(Math.sin(a), Math.cos(a)) + 4) * 100000), Qv = v => Math.round(v * 100);
  const enc = s => [Qx(s.x), Qa(s.ang), Qv(s.v)].map(n => Math.max(0, n).toString(36)).join(',') + ';';
  function dec(tok) {
    const p = String(tok || '').split(','); if (p.length !== 3) return null;
    const n = p.map(x => parseInt(x, 36)); if (n.some(x => !isFinite(x) || x < 0)) return null;
    return { x: n[0] / 1000 - 50, ang: n[1] / 100000 - 4, v: n[2] / 100 };
  }
  const quant = s => dec(enc(s).slice(0, -1));
  const toks = moves => String(moves || '').split(';').filter(Boolean);
  // a state with its numbers rounded (both clients keep exactly what was written)
  const round4 = (k, v) => typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 1e4) / 1e4 : v;
  const pack = o => JSON.stringify(o, round4);

  // ---------------------------------------------------------------- the backend (one per game)
  const NETS = {};
  function net(game) {
    if (NETS[game]) return NETS[game];
    const GI = GAMES[game] || { V: ['std'], def: 'std' };
    const varOk = v => GI.V.includes(v);
    let C = snap(game) || CFGS[game] || null;
    let db = null, uid = null, profile = null, ready = null, authUser = null;
    const SEC = window.OnlineSec ? OnlineSec.make({ db: () => db, uid: () => uid, mock: MOCK, initial: INITIAL, opts: { draw: false, abandon: true },
      decorate: (...a) => secDecorate(...a), onProfile: p => { profile = p; cacheRt(); if (presOn) db.update('presence/' + uid, { rating: p.rating }).catch(() => {}); } }) : null;
    const secure = () => !!(SEC && SEC.secure());

    function firebaseDB(root) {
      const f = firebase.database();
      const at = p => root + p;
      let offset = 0;
      f.ref('.info/serverTimeOffset').on('value', s => { offset = s.val() || 0; });
      const disc = new Set(), recon = new Set(); let wasUp = false;
      f.ref('.info/connected').on('value', s => {
        const up = !!s.val();
        if (up && wasUp === 'down') { disc.forEach(p => f.ref(p).onDisconnect().remove()); recon.forEach(cb => { try { cb(); } catch (e) {} }); }
        wasUp = up ? true : (wasUp ? 'down' : false);
      });
      return {
        on(path, cb) { const r = f.ref(at(path)), h = s => cb(s.val()); r.on('value', h); return () => r.off('value', h); },
        get: async p => (await f.ref(at(p)).get()).val(),
        set: (p, v) => f.ref(at(p)).set(v),
        update: (p, v) => f.ref(at(p)).update(v),
        remove: p => f.ref(at(p)).remove(),
        async txn(p, fn) {   // one transaction at a time per path (as the games' online.js)
          const Qt = window.__fbTxq || (window.__fbTxq = {}), k = at(p), run = (Qt[k] || Promise.resolve()).then(() => f.ref(k).transaction(fn)), tail = Qt[k] = run.catch(() => {});
          try { const r = await run; return { committed: r.committed, value: r.snapshot.val() }; } finally { if (Qt[k] === tail) delete Qt[k]; }
        },
        onDisconnectRemove: p => { disc.add(at(p)); return f.ref(at(p)).onDisconnect().remove(); },
        cancelDisconnect: p => { disc.delete(at(p)); return f.ref(at(p)).onDisconnect().cancel(); },
        onReconnect: cb => recon.add(cb),
        stamp: () => firebase.database.ServerValue.TIMESTAMP,
        now: () => Date.now() + offset,
        push: p => f.ref(at(p)).push().key,
      };
    }
    // in-browser mock with the same surface (tree in localStorage, sharded by the first two path segments, change events across tabs)
    function mockDB() {
      const PFX = 'atlas-ol-' + game + '-mockdb:';
      const parts = p => p.split('/').filter(Boolean);
      const shardOf = ks => PFX + ks.slice(0, 2).join('/');
      const readKey = k => { try { const v = localStorage.getItem(k); return v === null ? null : JSON.parse(v); } catch (e) { return null; } };
      function getPath(p) {
        const ks = parts(p);
        if (ks.length < 2) {
          const out = {}; const pre = PFX + (ks[0] ? ks[0] + '/' : '');
          for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(pre)) { const v = readKey(k); if (v !== null) { const sub = k.slice(PFX.length).split('/'); if (ks.length) out[sub[1]] = v; else { (out[sub[0]] = out[sub[0]] || {})[sub[1]] = v; } } } }
          return Object.keys(out).length ? out : null;
        }
        let x = readKey(shardOf(ks));
        for (const k of ks.slice(2)) { if (x == null || typeof x !== 'object') return null; x = x[k]; }
        return x === undefined ? null : x;
      }
      function setPath(p, v) {
        const ks = parts(p);
        if (ks.length < 2) { for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k.startsWith(PFX + ks[0] + '/')) localStorage.removeItem(k); } if (v) for (const [c, x] of Object.entries(v)) setPath(ks[0] + '/' + c, x); return; }
        const key = shardOf(ks);
        if (ks.length === 2) { if (v === null || v === undefined) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); return; }
        let rt = readKey(key) || {}, x = rt;
        for (let i = 2; i < ks.length - 1; i++) { if (x[ks[i]] == null || typeof x[ks[i]] !== 'object') x[ks[i]] = {}; x = x[ks[i]]; }
        if (v === null || v === undefined) delete x[ks[ks.length - 1]]; else x[ks[ks.length - 1]] = JSON.parse(JSON.stringify(v));
        localStorage.setItem(key, JSON.stringify(rt));
      }
      const listeners = new Set();
      const fire = () => { for (const l of listeners) { const v = JSON.stringify(getPath(l.path)); if (v !== l.last) { l.last = v; l.cb(JSON.parse(v)); } } };
      window.addEventListener('storage', e => { if (!e.key || e.key.startsWith(PFX)) fire(); });
      const write = fn => { fn(); setTimeout(fire, 0); };
      const disc = new Set();
      window.addEventListener('pagehide', () => { disc.forEach(p => setPath(p, null)); });
      let n = 0;
      return {
        on(path, cb) { const l = { path, cb, last: undefined }; listeners.add(l); setTimeout(fire, 0); return () => listeners.delete(l); },
        get: async p => getPath(p),
        set: async (p, v) => write(() => setPath(p, v)),
        update: async (p, v) => write(() => { for (const [k, x] of Object.entries(v)) setPath(p === '/' ? k : p + '/' + k, x); }),
        remove: async p => write(() => setPath(p, null)),
        async txn(p, fn) { let out; write(() => { const cur = getPath(p); const nv = fn(cur === null ? null : JSON.parse(JSON.stringify(cur))); if (nv !== undefined) { setPath(p, nv); out = { committed: true, value: nv }; } else out = { committed: false, value: cur }; }); return out; },
        onDisconnectRemove: p => { disc.add(p); },
        cancelDisconnect: p => { disc.delete(p); },
        stamp: () => Date.now(),
        now: () => Date.now(),
        push: () => Date.now().toString(36) + (n++).toString(36) + Math.random().toString(36).slice(2, 6),
      };
    }

    async function init() {
      if (ready) return ready;
      ready = (async () => {
        if (MOCK) {
          if (SOONQ) throw new Error('not-configured');
          db = db || mockDB();
          const MK = 'atlas-ol-mock-uid';
          uid = sessionStorage.getItem(MK) || ('u' + Math.random().toString(36).slice(2, 10));
          sessionStorage.setItem(MK, uid);
        } else {
          C = C || await config(game);
          if (!C || !C.cfg) throw new Error('not-configured');
          const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
          if (!window.firebase || !firebase.auth || !firebase.database) {
            await loadScript(base + 'firebase-app-compat.js');
            await Promise.all([loadScript(base + 'firebase-auth-compat.js'), loadScript(base + 'firebase-database-compat.js')]);
          }
          if (!firebase.apps.some(a => a.name === '[DEFAULT]')) firebase.initializeApp(C.cfg);   // (the shared account's app is 'atlas')
          if (window.OnlineSec && C.key) await OnlineSec.appCheck(firebase.app(), C.key, FB_VER);
          const auth = firebase.auth();
          const cur = await (window.OnlineSec && OnlineSec.authStart ? OnlineSec.authStart(auth) : new Promise(res => { const off = auth.onAuthStateChanged(u => { off(); res(u); }); }));
          authUser = auth.currentUser || cur || (await auth.signInAnonymously()).user;
          uid = authUser.uid;
          // the node's probe: readable only once the flick rules are published (no previous project to go back to)
          try { await firebase.database().ref(C.root + 'secv').get(); }
          catch (e) { if (/permission/i.test(String((e && e.code) || '') + ' ' + String((e && e.message) || e))) throw new Error('not-configured'); throw e; }
          db = db || firebaseDB(C.root);
        }
        await loadProfile();
        if (SEC) await SEC.init();
        return { uid, profile };
      })();
      ready.catch(() => { ready = null; });
      return ready;
    }
    const NAME_KEY = 'atlas-online-name';
    const localName = () => { try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; } };
    function defaultName() { const n = localName(); if (n) return n; const d = 'Player' + Math.floor(1000 + Math.random() * 9000); try { localStorage.setItem(NAME_KEY, d); } catch (e) {} return d; }
    const cleanName = s => String(s || '').replace(/[\u0000-\u001f\u007f<>&"']/g, '').replace(/\s+/g, ' ').trim().slice(0, 16) || defaultName();
    async function loadProfile() {
      profile = await db.get('players/' + uid);
      if (!profile || typeof profile.rating !== 'number' || typeof profile.name !== 'string' || !profile.name) {
        profile = Object.assign({ games: 0, wins: 0, losses: 0, draws: 0 }, profile || {}, { name: cleanName(profile && profile.name), rating: profile && typeof profile.rating === 'number' ? profile.rating : INITIAL });
        await db.set('players/' + uid, profile);
      }
      const ln = localName();
      if (ln && ln !== profile.name) { profile.name = ln; await db.update('players/' + uid, { name: ln }); }
      db.set('profiles/' + uid, { n: profile.name }).catch(() => {});
      cacheRt();
    }
    // the portal's card shows the online rating (atlas/app.js olNowTxt: '<game>-online-rt')
    function cacheRt() { try { if (profile) localStorage.setItem(game + '-online-rt', JSON.stringify({ r: profile.rating, n: profile.games || 0 })); } catch (e) {} }
    async function setName(name) {
      name = cleanName(name);
      try { localStorage.setItem(NAME_KEY, name); } catch (e) {}
      if (!profile) return name;
      profile.name = name; if (presOn) db.update('presence/' + uid, { name }).catch(() => {});
      await db.update('players/' + uid, { name });
      db.set('profiles/' + uid, { n: name }).catch(() => {});
      return name;
    }

    // ---- presence (heartbeat), stale records (as the games' online.js)
    let presOn = false, presState = 'idle';
    async function setPresence(st) {
      if (!db || !uid || !profile) return;
      presState = st || presState;
      await db.set('presence/' + uid, { name: profile.name, rating: profile.rating, st: presState, t: db.stamp() });
      if (!presOn) {
        db.onDisconnectRemove('presence/' + uid); presOn = true;
        if (db.onReconnect) db.onReconnect(() => setPresence().catch(() => {}));
        setInterval(() => { if (presOn) setPresence().catch(() => {}); }, PRES_BEAT);
      }
    }
    const recOld = (x, base, now, margin) => { if (!x || typeof x !== 'object') return true; if (typeof x.hb === 'number') return now - x.hb > LIVE_STALE + margin; return typeof base === 'number' ? now - base > LEGACY_STALE + margin : true; };
    const roomStale = (r, now) => recOld(r, r && r.created, now == null ? db.now() : now, 0);
    const lobbyStale = (x, now) => recOld(x, x && x.since, now == null ? db.now() : now, 0);
    const roomDead = (r, now) => recOld(r, r && r.created, now, SWEEP_MARGIN) || (!r.game && typeof r.expires === 'number' && now - r.expires > 60000 + SWEEP_MARGIN);
    const lobbyDead = (x, now) => recOld(x, x && x.since, now, SWEEP_MARGIN);
    const swept = new Map();
    function sweep(node, v, dead) {
      if (!v || typeof v !== 'object' || !db || !(MOCK || secure())) return v;
      const now = db.now();
      for (const [id, x] of Object.entries(v)) {
        if (node === 'rooms' ? id === roomCode : id === uid) continue;
        if (!dead(x, now)) continue;
        const p = node + '/' + id; if (swept.get(p) > now) continue;
        swept.set(p, now + 300000); db.remove(p).catch(() => {});
      }
      return v;
    }
    window.addEventListener('pagehide', () => {
      if (!db || !uid) return;
      try { if (roomCode) db.remove('rooms/' + roomCode).catch(() => {}); if (lobbyState) db.remove('lobby/' + uid).catch(() => {}); if (presOn) db.remove('presence/' + uid).catch(() => {}); } catch (e) {}
    });
    const listOf = v => Object.entries(v || {}).map(([id, x]) => ({ id, ...x, me: id === uid }));
    const presLive = x => x && typeof x.t === 'number' && !!x.name && db.now() - x.t < PRES_STALE;

    // ---- the men's scale: phones play with 1.35× men (CarromEngine DIM.K); a game uses the larger of the two players'
    const myK = () => game === 'carrom' && window.CarromEngine ? CarromEngine.DIM.K0 || CarromEngine.DIM.K || 1 : 1;
    const kOf = (a, b) => Math.max(1, Math.min(1.5, Math.max(+a || 1, +b || 1)));

    // ---- lobby & matchmaking (rated; the same game length only)
    let lobbyUnsub = null, selfUnsub = null, matchTimer = 0, lobbyState = null;
    const windowFor = waitMs => Math.min(400, 100 + 50 * Math.floor(waitMs / 10000));
    async function enterLobby({ onMatched, onStatus, v }) {
      await leave();
      setPresence('lobby').catch(() => {});
      v = varOk(v) ? v : GI.def;
      const since = db.now();
      lobbyState = { since, onMatched, onStatus, v };
      await secPrepare(lobbyState);
      await db.set('lobby/' + uid, { name: profile.name, rating: profile.rating, v, k: myK(), since: db.stamp(), hb: db.stamp(), game: null });
      db.onDisconnectRemove('lobby/' + uid);
      lobbyUnsub = db.on('lobby', x => { const list = listOf(sweep('lobby', x, lobbyDead)).filter(y => y.me || !lobbyStale(y)).sort((a, b) => b.rating - a.rating); if (lobbyState) lobbyState.list = list; });
      selfUnsub = db.on('lobby/' + uid + '/game', gid => { if (gid && lobbyState) { const cb = lobbyState.onMatched; leave(true); cb(gid); } });
      matchTimer = setInterval(tryMatch, 2000);
      setTimeout(tryMatch, 600);
    }
    async function secPrepare(st) {
      if (!secure()) return;
      try { const p = await db.get('players/' + uid); if (p && typeof p.rating === 'number') profile.rating = p.rating; } catch (e) {}
      st.blocked = !(await SEC.resolve().catch(() => false));
      if (st.blocked) OnlineSec.notice('open', 6000);
    }
    const skip = new Map();
    function lobbyBeat(st) { if (db.now() - (st.hbAt || st.since) < LIVE_BEAT) return; st.hbAt = db.now(); db.txn('lobby/' + uid, cur => (cur === null ? null : Object.assign(cur, { hb: db.stamp() }))).catch(() => {}); }
    async function tryMatch() {
      const st = lobbyState; if (st) lobbyBeat(st); if (!st || !st.list || st.busy) return;
      if (st.blocked) {
        st.busy = true;
        try { if (db.now() - (st.lastTry || 0) > 10000) { st.lastTry = db.now(); if (await SEC.resolve().catch(() => false)) { st.blocked = false; const p = await db.get('players/' + uid); if (p) { profile.rating = p.rating; await db.update('lobby/' + uid, { rating: p.rating }); } } } } finally { st.busy = false; }
        if (st.blocked) return;
      }
      const now = db.now(), myWait = now - st.since;
      const others = st.list.filter(x => !x.me && !x.game && !lobbyStale(x) && typeof x.rating === 'number' && x.v === st.v);
      let best = null;
      for (const o of others) {
        const w = windowFor(Math.max(myWait, now - (o.since || now))), d = Math.abs(o.rating - profile.rating);
        if (d <= w && (!best || d < best.d) && !(skip.get(o.id) > now)) best = { ...o, d };
      }
      st.onStatus && st.onStatus({ same: others.length, window: windowFor(myWait), wait: myWait, v: st.v });
      if (!best || uid > best.id) return;   // the smaller uid creates the game
      st.busy = true;
      try {
        if (secure()) {
          if (await SEC.blocked(best.id)) { skip.set(best.id, now + 30000); return; }
          const [pm, po] = await Promise.all([db.get('players/' + uid), db.get('players/' + best.id)]);
          if (!pm || !po) return;
          profile.rating = pm.rating; best.rating = po.rating;
        }
        const gid = db.push('games');
        const first = Math.random() < 0.5 ? uid : best.id, second = first === uid ? best.id : uid;
        const names = { [uid]: profile.name, [best.id]: best.name }, rates = { [uid]: profile.rating, [best.id]: best.rating };
        const rec = { b: first, w: second, bn: names[first], wn: names[second], br: rates[first], wr: rates[second], moves: '', status: 'play', rated: true, v: st.v, tc: st.v, mb: 0, mw: 0, k: kOf(myK(), best.k), created: db.stamp(), t: db.stamp() };
        await (SEC ? SEC.createRated(gid, rec) : db.set('games/' + gid, rec));
        const r = await db.txn('lobby/' + best.id, cur => { if (cur === null) return null; if (cur.game) return; cur.game = gid; return cur; });
        if (r.committed && r.value && r.value.game === gid) await db.update('lobby/' + uid, { game: gid });
        else { await db.remove('games/' + gid); if (secure()) SEC.resolve().catch(() => {}); }
      } catch (e) { console.warn(e); skip.set(best.id, db.now() + 15000); } finally { if (lobbyState === st) st.busy = false; }
    }

    // ---- rooms (unrated; open = listed, priv = joined with the code). One game per room: the host closes it when the game starts.
    let roomCode = null, roomV = GI.def, roomPriv = false, roomExpires = 0, roomUnsub = null, roomTimer = 0, roomCbs = null, roomBeatAt = 0;
    const roomListeners = new Set();
    const room = () => (roomCode ? { code: roomCode, priv: roomPriv, v: roomV, expires: roomExpires, left: Math.max(0, roomExpires - db.now()) } : null);
    const roomEmit = ev => roomListeners.forEach(f => { try { f(ev, room()); } catch (e) { console.warn(e); } });
    const onRoom = f => { roomListeners.add(f); return () => roomListeners.delete(f); };
    const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const roomExp = r => (typeof r.expires === 'number' ? r.expires : (typeof r.created === 'number' ? r.created : 0) + ROOM_TTL);
    const roomLive = (r, now) => { now = now == null ? db.now() : now; return !!r && !r.game && roomExp(r) > now && !roomStale(r, now); };
    function roomBeat() { if (db.now() - roomBeatAt < LIVE_BEAT) return; roomBeatAt = db.now(); db.txn('rooms/' + roomCode, cur => (cur === null ? null : cur.host === uid ? Object.assign(cur, { hb: db.stamp() }) : undefined)).catch(() => {}); }
    async function roomDrop(c) { try { await db.txn('rooms/' + c, cur => (cur === null ? null : cur.host === uid ? null : undefined)); db.cancelDisconnect('rooms/' + c); } catch (e) { console.warn(e); } }
    function roomEnd(keepDisc) { roomUnsub && roomUnsub(); roomUnsub = null; clearInterval(roomTimer); roomTimer = 0; if (roomCode && !keepDisc) db.cancelDisconnect('rooms/' + roomCode); roomCode = null; roomCbs = null; roomExpires = 0; }
    async function createRoom({ onMatched, onExpired, priv, v }) {
      v = varOk(v) ? v : GI.def;
      await leave();
      for (let tries = 0; tries < 6; tries++) {
        const code = Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
        const expires = db.now() + ROOM_TTL;
        const r = await db.txn('rooms/' + code, cur => cur === null ? { host: uid, name: profile.name, rating: profile.rating, v, k: myK(), created: db.stamp(), hb: db.stamp(), expires, game: null, priv: !!priv } : undefined);
        if (!r.committed || !r.value || r.value.host !== uid || r.value.expires !== expires) continue;
        roomBeatAt = 0; roomCode = code; roomV = v; roomPriv = !!priv; roomExpires = expires; roomCbs = { onMatched, onExpired };
        setPresence('room').catch(() => {});
        db.onDisconnectRemove('rooms/' + code);
        roomUnsub = db.on('rooms/' + code, x => {
          if (roomCode !== code) return;
          if (x && x.host === uid && x.game) { const cb = roomCbs && roomCbs.onMatched, gid = x.game; roomEnd(true); roomDrop(code); roomEmit('matched'); cb && cb(gid); }
          else if (!x) { roomEnd(); roomEmit('gone'); }
        });
        roomTimer = setInterval(() => { if (!roomCode) return; roomBeat(); if (db.now() < roomExpires) return; const cb = roomCbs && roomCbs.onExpired; closeRoom('expired').then(() => cb && cb()); }, 5000);
        roomEmit('open');
        return code;
      }
      throw new Error('room');
    }
    async function closeRoom(why) { if (!roomCode) return; const c = roomCode; roomEnd(true); if (presOn && presState === 'room') setPresence('idle').catch(() => {}); await roomDrop(c); roomEmit(why === 'expired' ? 'expired' : 'closed'); }
    async function extendRoom() { if (!roomCode) return; roomExpires = db.now() + ROOM_TTL; await db.update('rooms/' + roomCode, { expires: roomExpires }); }
    const normCode = code => String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    async function joinRoom(code) {
      code = normCode(code); if (!code) return null;
      const rm = await db.get('rooms/' + code);
      if (!roomLive(rm) || rm.host === uid || !varOk(rm.v)) return null;
      await leave();
      const gid = db.push('games');
      const first = Math.random() < 0.5 ? uid : rm.host, second = first === uid ? rm.host : uid;
      const names = { [uid]: profile.name, [rm.host]: rm.name }, rates = { [uid]: profile.rating, [rm.host]: rm.rating };
      await db.set('games/' + gid, { b: first, w: second, bn: names[first], wn: names[second], br: rates[first], wr: rates[second], moves: '', status: 'play', rated: false, room: code, host: rm.host, v: rm.v, tc: rm.v, mb: 0, mw: 0, k: kOf(myK(), rm.k), created: db.stamp(), t: db.stamp() });
      const r = await db.txn('rooms/' + code, cur => { if (cur === null) return null; if (!roomLive(cur) || cur.host !== rm.host) return; cur.game = gid; cur.guest = uid; cur.gname = profile.name; return cur; });
      if (!(r.committed && r.value && r.value.game === gid)) { await db.remove('games/' + gid); return null; }
      return gid;
    }
    function watchRooms(cb) {
      let last = null;
      const emit = () => cb(listOf(last).filter(r => !r.priv && !roomStale(r) && roomLive(r) && varOk(r.v)).sort((a, b) => (a.created || 0) - (b.created || 0)));
      const off = db.on('rooms', v => { last = sweep('rooms', v, roomDead); emit(); });
      const iv = setInterval(() => { if (last) emit(); }, 15000);
      return () => { off(); clearInterval(iv); };
    }
    async function leaveLobby() {
      clearInterval(matchTimer); matchTimer = 0; lobbyUnsub && lobbyUnsub(); selfUnsub && selfUnsub(); lobbyUnsub = selfUnsub = null;
      if (lobbyState) { lobbyState = null; const p = 'lobby/' + uid; try { await db.remove(p); db.cancelDisconnect(p); } catch (e) { console.warn(e); } if (presOn && presState === 'lobby') setPresence(roomCode ? 'room' : 'idle').catch(() => {}); }
    }
    async function leave(keepMatched) {
      if (!keepMatched && presOn) setPresence('idle').catch(() => {});
      await leaveLobby();
      if (roomCode) await closeRoom();
    }

    // ---- games
    const sideNo = (g, u) => (g.b === u ? 1 : g.w === u ? 2 : 0);
    const nextUid = g => (g.nt ? g.nt : (!g.moves ? g.b : null));
    function watchGame(gid, cb) { setPresence('play').catch(() => {}); if (SEC) SEC.join(gid); return db.on('games/' + gid, cb); }
    // one shot: n = shots already in the record, tok = enc(shot), s = the state after it (pack), nt = the engine side to shoot next,
    // end = { win: 1 | 2 | 0, why } when this shot ends the game
    async function act(gid, n, tok, s, nt, end) {
      const r = await db.txn('games/' + gid, g => {
        if (g === null) return null;
        if (g.status !== 'play' || !sideNo(g, uid) || toks(g.moves).length !== n || nextUid(g) !== uid) return;
        if (db.now() - (g.t || 0) > DELAY + 4000) return;     // my time is up (the rules would refuse it)
        g.moves = String(g.moves || '') + tok; g.s = s; g.t = db.stamp(); g.lm = uid; g.mb = 0; g.mw = 0;
        if (end) { g.status = 'over'; g.win = end.win; g.why = end.why || 'board'; g.nt = null; }
        else g.nt = nt === 0 ? g.b : g.w;
        return g;
      });
      return !!r.committed;
    }
    const resign = gid => db.txn('games/' + gid, g => { if (g === null) return null; if (g.status !== 'play' || !sideNo(g, uid)) return; g.status = 'resign'; g.loser = uid; return g; });
    const claimTimeout = (gid, opp) => db.txn('games/' + gid, g => { if (g === null) return null; if (g.status !== 'play' || nextUid(g) !== opp || db.now() - g.t < DELAY + GRACE) return; g.status = 'timeout'; g.loser = opp; return g; });
    async function claimAbandon(gid, opp) {
      if (await db.get('presence/' + opp)) return { committed: false };
      return db.txn('games/' + gid, g => { if (g === null) return null; if (g.status !== 'play' || nextUid(g) !== opp || db.now() - g.t < ABANDON_MS) return; g.status = 'abandon'; g.loser = opp; return g; });
    }
    // the receiving side found the record's data broken (a modified client): the game ends as disputed — both report, the
    // reports disagree and the rated game is void (claude/online-security-setup.md §3)
    const dispute = gid => db.txn('games/' + gid, g => { if (g === null) return null; if (g.status !== 'play' || !sideNo(g, uid)) return; g.status = 'over'; g.why = 'bad'; g.nt = null; return g; });
    function winnerOf(g) {
      if (!g || g.status === 'play') return null;
      if (g.status === 'resign' || g.status === 'timeout' || g.status === 'abandon') return g.loser === g.b ? 2 : 1;
      return typeof g.win === 'number' ? g.win : 0;
    }
    function secDecorate(np, p, G, s, nr) {
      const hist = Array.isArray(p.hist) ? p.hist.slice() : (p.hist && typeof p.hist === 'object' ? Object.values(p.hist) : []);
      const opp = G.b === uid ? G.wr : G.br, oppName = G.b === uid ? G.wn : G.bn;
      hist.push({ g: np.last, t: db.now(), v: G.v || GI.def, o: String(oppName || '?').slice(0, 16), or: typeof opp === 'number' ? opp : INITIAL, s, d: nr - p.rating, r: nr, why: G.status === 'over' ? (G.why || 'board') : G.status });
      np.hist = hist.slice(-HIST_N);
    }
    // settle a finished game for me: own = my own result of a game that ended on the board (1 / 0.5 / 0; null = disputed)
    async function applyResult(gid, g, score, own) {
      if (!g || !g.rated) return { old: profile.rating, now: profile.rating, rated: false };
      if (secure()) {
        const r = await SEC.settle(gid, g, g.status === 'over' ? (own === undefined ? score : own) : score);
        if (r.rated) { profile = (await db.get('players/' + uid)) || profile; cacheRt(); }
        return r;
      }
      return { old: profile.rating, now: profile.rating, rated: false, note: 'legacy' };
    }
    const history = () => { const h = profile && profile.hist; return (Array.isArray(h) ? h : h && typeof h === 'object' ? Object.values(h) : []).filter(x => x && typeof x.r === 'number').sort((a, b) => (a.t || 0) - (b.t || 0)); };
    async function topPlayers(n) {
      const all = await db.get('players') || {};
      return Object.entries(all).filter(([, p]) => p && p.games > 0).map(([id, p]) => ({ id, ...p, me: id === uid })).sort((a, b) => b.rating - a.rating).slice(0, n || 10);
    }
    // one live game per player and game: a reload / reopening the lobby goes back into it
    const LIVE = 'atlas-ol-live:' + game;
    const live = { get: () => { try { return localStorage.getItem(LIVE + ':' + uid) || null; } catch (e) { return null; } }, set: gid => { try { if (gid) localStorage.setItem(LIVE + ':' + uid, gid); else localStorage.removeItem(LIVE + ':' + uid); } catch (e) {} } };

    return NETS[game] = {
      game, mock: MOCK, DELAY, GRACE, ABANDON_MS, ROOM_TTL, INITIAL, V: GI.V, def: GI.def,
      get configured() { return MOCK ? !SOONQ : !!(C && C.cfg); }, get uid() { return uid; }, get profile() { return profile; }, get ready() { return !!(db && uid && profile); },
      get room() { return db ? room() : null; }, get secure() { return secure(); },
      now: () => (db ? db.now() : Date.now()), init, setName, cleanName, setPresence, enterLobby, leaveLobby, leave, createRoom, closeRoom, extendRoom, joinRoom, onRoom, watchRooms,
      watchGame, getGame: gid => db.get('games/' + gid), act, resign, claimTimeout, claimAbandon, dispute, winnerOf, sideNo, nextUid, applyResult, history, topPlayers,
      presenceOf: u => db.get('presence/' + u), presLive, live, myK,
    };
  }

  // ---------------------------------------------------------------- one game on the table (for the adapters)
  // m = match(net, gid, g0): m.g (the record), m.me (0 = b, the first shooter; 1 = w), m.names, m.n (shots in the record),
  // m.shot(i) (the decoded shot i), m.payload() (the parsed s of the last shot), m.toMove() (engine side to shoot, -1 none),
  // m.left() (ms of the shot's time left, server time), m.send(i, shot, payload, nt, end) → Promise<bool>, m.resign(),
  // m.on(fn) (every record change), m.finish(score) → Promise<settlement>, m.stop(). Claims a timeout / abandonment by itself.
  function match(N, gid, g0) {
    const uid = N.uid;
    let g = g0, stopped = false, claimT = 0, lastClaim = 0;
    const fns = new Set();
    const me = g0.b === uid ? 0 : 1, opp = me === 0 ? g0.w : g0.b;
    const m = {
      gid, me, net: N, get g() { return g; },
      names: [g0.bn || '?', g0.wn || '?'], ratings: [g0.br, g0.wr], k: +g0.k || 1, v: g0.v, rated: !!g0.rated,
      get n() { return toks(g && g.moves).length; },
      shot: i => dec(toks(g && g.moves)[i]),
      payload() { try { return g && g.s ? JSON.parse(g.s) : null; } catch (e) { return null; } },
      toMove() { if (!g || g.status !== 'play') return -1; const u = N.nextUid(g); return u === g.b ? 0 : u === g.w ? 1 : -1; },
      left() { return g ? Math.max(0, N.DELAY - (N.now() - (g.t || 0))) : 0; },
      quant, pack,
      async send(i, shot, payload, nt, end) { try { return await N.act(gid, i, enc(shot), pack(payload), nt, end); } catch (e) { console.warn(e); return false; } },
      resign: () => N.resign(gid).catch(e => console.warn(e)),
      dispute: () => N.dispute(gid).catch(e => console.warn(e)),
      on(f) { fns.add(f); return () => fns.delete(f); },
      winner: () => N.winnerOf(g),   // 1 = b, 2 = w, 0 = draw, null = still playing
      // my result: { s (1 / 0.5 / 0), why: 'resign' | 'timeout' | 'abandon' | 'board' | 'bad', mine: the loser was me }
      result() { const w = N.winnerOf(g); if (w === null) return null; return { s: w === 0 ? .5 : w === me + 1 ? 1 : 0, why: g.status === 'over' ? g.why || 'board' : g.status, mine: g.loser === uid }; },
      async finish(own) { N.live.set(null); const r = m.result(); try { return await N.applyResult(gid, g, r ? r.s : 0, g.status === 'over' ? (g.why === 'bad' ? null : own) : undefined); } catch (e) { console.warn(e); return { rated: false, note: 'pending' }; } },
      stop() { stopped = true; clearInterval(claimT); off(); },
    };
    N.live.set(gid);
    const off = N.watchGame(gid, x => { if (stopped || !x) return; g = x; fns.forEach(f => { try { f(g); } catch (e) { console.warn(e); } }); });
    // the opponent's time: claim a timeout once it has run out (+ GRACE); gone from presence on its turn → abandonment
    claimT = setInterval(() => {
      if (stopped || !g || g.status !== 'play' || N.nextUid(g) !== opp) return;
      const el = N.now() - (g.t || 0), now = Date.now();
      if (now - lastClaim < 2500) return;
      if (el >= N.DELAY + N.GRACE) { lastClaim = now; N.claimTimeout(gid, opp).catch(() => {}); }
      else if (el >= N.ABANDON_MS) { lastClaim = now; N.claimAbandon(gid, opp).catch(() => {}); }
    }, 1000);
    return m;
  }

  // ---------------------------------------------------------------- the lobby (the online screen of 2026-11-12 on the portal)
  // A card over the 3D view: the name and rating band, then two boxes — 「レート戦」 (the game length, how matching works, the rating
  // history, the ranking, 探す at the foot) and 「部屋で対戦」 (open rooms, a room code, the room's kind, 作る at the foot).
  // o: { game, lang, title (the game's name), color, lens: [[v, name]], onStart(m) (a matched / resumed game), onClose(), join (a room code) }
  const tr = (lang, k, o) => { let s = (OLT[lang] && OLT[lang][k]) || OLT.en[k] || k; if (o) for (const q in o) s = s.split('{' + q + '}').join(o[q]); return s; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clock = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const CSS = `.o3{position:fixed;inset:0;z-index:96;display:flex;align-items:center;justify-content:center;padding:14px;background:rgba(18,16,30,.46);-webkit-user-select:none;user-select:none;opacity:0;transition:opacity .2s;font-family:'Zen Maru Gothic',system-ui,sans-serif;letter-spacing:-.01em}
.o3.on{opacity:1}.o3 *{box-sizing:border-box}
.o3-c{position:relative;background:#fffdf7;border:2px solid #efe3c8;border-radius:24px;box-shadow:0 6px 0 #efe3c8,0 22px 60px rgba(0,0,0,.35);width:min(1000px,100%);max-height:100%;display:flex;flex-direction:column;color:#2b3044;transform:translateY(10px) scale(.985);transition:transform .26s cubic-bezier(.2,.9,.3,1.2)}
.o3.on .o3-c{transform:none}
.o3-h{display:flex;align-items:center;gap:10px;padding:16px 20px 0}.o3-h h2{margin:0;font-size:22px;font-weight:900;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.o3-h h2 small{font-size:14px;color:var(--o3c,#c23a7a);margin-left:8px;font-weight:900}
.o3-x{flex:none;width:38px;height:38px;border-radius:50%;border:2px solid #ead9b6;background:#fff;color:#5b6074;font-size:18px;font-weight:900;cursor:pointer;box-shadow:0 3px 0 #efe3c8}
.o3-b{padding:12px 20px 18px;overflow:auto;min-height:0;flex:1}
.o3-me{display:flex;align-items:center;gap:14px;padding:10px 14px;border-radius:18px;background:#fff6e2;border:2px solid #efe3c8;margin-bottom:12px}
.o3-me input{flex:1;min-width:0;font:inherit;font-size:17px;font-weight:800;padding:9px 14px;border-radius:99px;border:2px solid #ead9b6;background:#fff;color:#2b3044;-webkit-user-select:text;user-select:text}
.o3-r{display:flex;align-items:baseline;gap:6px;flex:none}.o3-r small{font-size:13px;font-weight:900;color:#8a8070}.o3-r b{font-family:Fredoka,'Zen Maru Gothic',sans-serif;font-size:38px;line-height:1;font-weight:600;color:#2b3044}.o3-r em{font-style:normal;font-size:12.5px;font-weight:800;color:#6a7088;margin-left:6px}
.o3-g{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.o3-p{display:flex;flex-direction:column;gap:9px;padding:13px 14px 14px;border-radius:18px;background:#fffaf0;border:1.5px solid #ead9b6;box-shadow:0 3px 0 #efe3c8;min-width:0}
.o3-p h3{margin:0;font-size:18px;font-weight:900;display:flex;flex-direction:column;gap:1px}.o3-p h3 small{font-size:12px;font-weight:700;color:#6a7088}
.o3-l{font-size:12.5px;font-weight:900;color:#8a8070;margin-top:2px}
.o3-seg{display:flex;gap:4px;padding:4px;border-radius:99px;background:#f3ead6}.o3-seg button{flex:1;font:inherit;font-size:14px;font-weight:800;padding:8px 6px;border:0;border-radius:99px;background:transparent;color:#6a6458;cursor:pointer}.o3-seg button.on{background:#fff;color:#2b3044;box-shadow:0 2px 0 #e2d4b4}
.o3-d{font-size:12.5px;font-weight:700;color:#5b6074}.o3-d summary{cursor:pointer;font-weight:900;color:#4a5068}.o3-d p{margin:6px 0 0;line-height:1.5}
.o3-ls{display:flex;flex-direction:column;gap:5px;max-height:132px;overflow:auto;padding-right:2px}
.o3-ls>div,.o3-ls>button{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:12px;background:#fff;border:1.5px solid #efe3c8;font:inherit;font-size:13.5px;font-weight:800;color:#2b3044;text-align:left;min-height:34px}
.o3-ls>button{cursor:pointer;flex-direction:column;align-items:stretch;gap:0}.o3-ls>button:hover{border-color:var(--o3c,#c23a7a)}.o3-ls>button span{display:flex;justify-content:space-between;gap:8px}.o3-ls>button small{font-size:11.5px;color:#6a7088;font-weight:700}
.o3-ls .me{border-color:var(--o3c,#c23a7a)}.o3-ls b{margin-left:auto;font-family:Fredoka,sans-serif;font-weight:600}.o3-ls .e{color:#8a8070;font-weight:700;font-size:12.5px;justify-content:center;background:transparent;border-style:dashed}
.o3-ls .w{color:#1f9d55}.o3-ls .l{color:#e5533f}.o3-ls .dd{color:#8a8070}
.o3-j{display:flex;gap:8px}.o3-j input{flex:1;min-width:0;font:inherit;font-size:16px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;padding:8px 14px;border-radius:99px;border:2px solid #ead9b6;background:#fff;-webkit-user-select:text;user-select:text}
.o3-k{display:grid;grid-template-columns:1fr 1fr;gap:8px}.o3-k button{font:inherit;text-align:left;padding:8px 10px;border-radius:14px;border:2px solid #ead9b6;background:#fff;cursor:pointer;color:#2b3044}.o3-k button b{display:block;font-size:14px;font-weight:900}.o3-k button small{display:block;font-size:11.5px;font-weight:700;color:#6a7088}.o3-k button.on{border-color:var(--o3c,#c23a7a);box-shadow:0 2px 0 var(--o3c,#c23a7a)}
.o3-sp{flex:1}
.o3-btn{font:inherit;font-size:16px;font-weight:900;padding:11px 18px;border-radius:99px;border:2px solid #ead9b6;background:#fff;color:#2b3044;cursor:pointer;box-shadow:0 3px 0 #efe3c8}.o3-btn:disabled{opacity:.5;cursor:default}
.o3-btn.go{background:#ff5d5d;border-color:#ff5d5d;color:#fff;box-shadow:0 3px 0 #c23b3b}.o3-btn.warn{color:#e5533f}.o3-btn.wide{width:100%}
.o3-my{display:flex;align-items:center;gap:8px;padding:6px 8px 6px 12px;border-radius:12px;background:#fff6e2;border:1.5px dashed var(--o3c,#c23a7a);font-size:13px;font-weight:800}.o3-my .cd{font-family:Fredoka,sans-serif;font-size:17px;letter-spacing:.1em}.o3-my small{color:#6a7088}.o3-my button{margin-left:auto;padding:5px 12px;font-size:13px}
.o3-w{display:flex;flex-direction:column;align-items:center;gap:10px;padding:26px 10px 18px;text-align:center}
.o3-w b{font-size:19px;font-weight:900}.o3-w small{font-size:13px;font-weight:700;color:#5b6074;max-width:460px;line-height:1.5}
.o3-spin{width:46px;height:46px;border-radius:50%;border:5px solid #f1e6cf;border-top-color:var(--o3c,#c23a7a);animation:o3s .9s linear infinite}@keyframes o3s{to{transform:rotate(360deg)}}
.o3-code{font-family:Fredoka,sans-serif;font-size:52px;font-weight:600;letter-spacing:.16em;color:var(--o3c,#c23a7a);line-height:1.05;-webkit-user-select:text;user-select:text}
.o3-tag{display:inline-block;padding:3px 12px;border-radius:99px;background:#fff6e2;border:1.5px solid #ead9b6;font-size:12.5px;font-weight:900;color:#6a6458}
.o3-ic{font-size:44px;line-height:1}
.o3-acts{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:6px}
.o3-f{display:flex;justify-content:center;padding:0 20px 16px}
.o3-t{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);background:#2b3044;color:#fff;font-size:13.5px;font-weight:800;padding:8px 16px;border-radius:99px;pointer-events:none;white-space:nowrap;max-width:90%;overflow:hidden;text-overflow:ellipsis}
.o3[dir=rtl] .o3-ls b{margin-left:0;margin-right:auto}
@media (max-width:760px){.o3{padding:8px;align-items:stretch}.o3-c{border-radius:20px}.o3-g{grid-template-columns:1fr;gap:10px}.o3-h{padding:12px 14px 0}.o3-h h2{font-size:19px}.o3-b{padding:10px 12px 14px}
.o3-me{gap:10px;padding:8px 10px}.o3-me input{font-size:16px;padding:7px 12px}.o3-r b{font-size:32px}.o3-r em{display:none}.o3-ls{max-height:120px}.o3-f{padding:0 12px 12px}.o3-code{font-size:44px}}`;
  function open(o) {
    const lang = o.lang || 'ja', T = (k, x) => tr(lang, k, x), N = net(o.game);
    if (!document.getElementById('o3Css')) { const c = document.createElement('style'); c.id = 'o3Css'; c.textContent = CSS; document.head.appendChild(c); }
    const el = document.createElement('div'); el.className = 'o3'; el.dir = lang === 'ar' ? 'rtl' : 'ltr'; if (o.color) el.style.setProperty('--o3c', o.color);
    el.innerHTML = `<div class="o3-c" role="dialog" aria-modal="true"><div class="o3-h"><h2>${esc(o.title)}<small>${esc(T('title'))}</small></h2><button type="button" class="o3-x" aria-label="${esc(T('back'))}">✕</button></div><div class="o3-b"></div><div class="o3-f"><button type="button" class="o3-btn o3-back">${esc(T('back'))}</button></div></div>`;
    ['pointerdown', 'pointermove', 'pointerup', 'wheel', 'keydown'].forEach(k => el.addEventListener(k, e => e.stopPropagation()));
    document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('on'));
    const B = el.querySelector('.o3-b'), $ = s => el.querySelector(s);
    const VK = 'atlas-ol-v:' + o.game, RK = 'atlas-ol-rk';
    let view = 'loading', st = null, rooms = [], closed = false, offRooms = null, tick = 0, toastT = 0;
    const getV = () => { let v = null; try { v = localStorage.getItem(VK); } catch (e) {} return N.V.includes(v) ? v : N.def; };
    const setV = v => { try { localStorage.setItem(VK, v); } catch (e) {} };
    const rk = () => { try { return localStorage.getItem(RK) === 'key' ? 'key' : 'open'; } catch (e) { return 'open'; } };
    const lenName = v => { const L = o.lens || []; const x = L.find(y => y[0] === v); return x ? x[1] : v; };
    const tcTxt = () => T('shot', { s: Math.round(N.DELAY / 1000) });
    function toast(m, ms) { let t = $('.o3-t'); if (!t) { t = document.createElement('div'); t.className = 'o3-t'; $('.o3-c').appendChild(t); } t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { if (t) t.hidden = true; }, ms || 2200); }
    function close(silent) {
      if (closed) return; closed = true; clearInterval(tick); offRooms && offRooms(); offRoom && offRoom();
      if (N.ready) N.leave().catch(() => {});
      el.classList.remove('on'); setTimeout(() => el.remove(), 200);
      if (!silent && o.onClose) o.onClose();
    }
    function startGame(gid) {
      N.getGame(gid).then(g => {
        if (closed || !g) return;
        if (g.status !== 'play' || !N.sideNo(g, N.uid)) { N.live.set(null); render('menu'); return; }
        closed = true; clearInterval(tick); offRooms && offRooms(); offRoom && offRoom();
        el.classList.remove('on'); setTimeout(() => el.remove(), 200);
        o.onStart(match(N, gid, g));
      }).catch(e => { console.warn(e); render('error'); });
    }
    el.querySelector('.o3-x').onclick = () => close();
    el.querySelector('.o3-back').onclick = () => { if (view === 'search') { N.leaveLobby().catch(() => {}); render('menu'); } else close(); };
    const offRoom = N.onRoom(ev => { if (closed) return; if ((ev === 'closed' || ev === 'expired' || ev === 'gone') && view === 'room') { if (ev === 'expired') toast(T('roomExpired')); render('menu'); } });
    function histHtml() {
      const h = N.history().slice(-6).reverse();
      if (!h.length) return '';
      return `<div class="o3-l">${esc(T('hist'))}</div><div class="o3-ls">${h.map(x => `<div><span class="${x.s === 1 ? 'w' : x.s === 0 ? 'l' : 'dd'}">${esc(T(x.s === 1 ? 'resW' : x.s === 0 ? 'resL' : 'resD'))}</span><span>${esc(x.o || '?')}</span><b>${x.r}<small class="${x.d >= 0 ? 'w' : 'l'}"> ${x.d >= 0 ? '+' : '−'}${Math.abs(x.d || 0)}</small></b></div>`).join('')}</div>`;
    }
    const roomRows = () => rooms.length ? rooms.map(r => `<button type="button" data-code="${esc(r.id)}"><span><span>${esc(r.name || '?')}</span><b>R ${esc(r.rating)}</b></span><small>${esc(lenName(r.v))} · ${esc(tcTxt())}</small></button>`).join('') : `<div class="e">${esc(T('noRooms'))}</div>`;
    function render(v) {
      if (closed) return;
      if (v) view = v;
      el.querySelector('.o3-back').hidden = view === 'room';
      if (view === 'loading') { B.innerHTML = `<div class="o3-w"><div class="o3-spin"></div><small>${esc(T('connecting'))}</small></div>`; return; }
      if (view === 'soon') { B.innerHTML = `<div class="o3-w"><div class="o3-ic">⌛</div><b>${esc(T('setup1'))}</b><small>${esc(T('soon2'))}</small></div>`; return; }
      if (view === 'error') { B.innerHTML = `<div class="o3-w"><div class="o3-ic">⚠️</div><b>${esc(T('error'))}</b><div class="o3-acts"><button type="button" class="o3-btn go" id="o3Retry">${esc(T('retry'))}</button></div></div>`; $('#o3Retry').onclick = boot; return; }
      if (view === 'resume') { B.innerHTML = `<div class="o3-w"><div class="o3-spin"></div><b>${esc(T('resume'))}</b></div>`; return; }
      const P = N.profile;
      if (view === 'search') {
        const s = st || {}, sv = s.v || getV();
        B.innerHTML = `<div class="o3-w"><div class="o3-spin"></div><b>${esc(T('searching'))}</b><span class="o3-tag">${esc(lenName(sv))} · ${esc(tcTxt())}</span><small>${esc(T('searchInfo', { w: s.same || 0, r: s.window || 100 }))}</small><div class="o3-acts"><button type="button" class="o3-btn" id="o3Cancel">${esc(T('cancel'))}</button></div></div>`;
        $('#o3Cancel').onclick = () => { N.leaveLobby().catch(() => {}); render('menu'); };
        return;
      }
      if (view === 'room') {
        const R = N.room; if (!R) { render('menu'); return; }
        B.innerHTML = `<div class="o3-w"><span class="o3-tag">🔑 ${esc(T(R.priv ? 'keyRoom' : 'openRoom'))}</span><small>${esc(T('roomCode'))}</small><div class="o3-code">${esc(R.code)}</div><span class="o3-tag">${esc(lenName(R.v))} · ${esc(tcTxt())}</span><small>${esc(T(R.priv ? 'roomInfoKey' : 'roomInfoOpen'))}</small><small>${esc(T('roomKeep'))} <b class="o3-left">${esc(T('roomLeft', { t: clock(R.left) }))}</b></small>
          <div class="o3-acts"><button type="button" class="o3-btn go" id="o3Copy">${esc(T('copyLink'))}</button><button type="button" class="o3-btn warn" id="o3CloseRoom">${esc(T('closeRoom'))}</button></div></div>`;
        $('#o3Copy').onclick = async () => { const url = location.origin + location.pathname + '?room=' + R.code + (N.mock ? '&mock=1' : '') + '#games/' + o.game; try { if (navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share({ url }); return; } await navigator.clipboard.writeText(url); toast(T('copied')); } catch (e) { if (e && e.name === 'AbortError') return; toast(url, 4000); } };
        $('#o3CloseRoom').onclick = () => { N.closeRoom().catch(() => {}); render('menu'); };
        return;
      }
      // the menu
      const R = N.room, cv = getV();
      B.innerHTML = `<div class="o3-me"><input id="o3Name" maxlength="16" value="${esc(P.name)}" aria-label="${esc(T('rename'))}"><div class="o3-r"><small>R</small><b>${P.rating}</b><em>${esc(T('record', { w: P.wins || 0, l: P.losses || 0, d: P.draws || 0 }))}</em></div></div>
        <div class="o3-g"><section class="o3-p"><h3>${esc(T('paneRated'))}<small>${esc(T('paneRatedSub'))}</small></h3>
          <div class="o3-l">${esc(o.lenLabel || '')}</div><div class="o3-seg" role="radiogroup">${N.V.map(v => `<button type="button" data-v="${v}" class="${v === cv ? 'on' : ''}">${esc(lenName(v))}</button>`).join('')}</div>
          <details class="o3-d"><summary>${esc(T('rulesMore'))}</summary><p>${esc(T('findDesc'))} ${esc(T('rules', { s: Math.round(N.DELAY / 1000) }))}</p></details>
          ${histHtml()}
          <div class="o3-l">${esc(T('rank'))}</div><div class="o3-ls" id="o3Rank"><div class="e">…</div></div>
          <div class="o3-sp"></div><button type="button" class="o3-btn go wide" id="o3Find">${esc(T('find'))}</button></section>
        <section class="o3-p"><h3>${esc(T('paneRoom'))}<small>${esc(T('paneRoomSub'))}</small></h3>
          <div class="o3-l">${esc(T('rooms'))}</div><div class="o3-ls" id="o3Rooms">${roomRows()}</div>
          <div class="o3-j"><input id="o3Code" maxlength="8" placeholder="${esc(T('codePh'))}" autocomplete="off" spellcheck="false"><button type="button" class="o3-btn" id="o3Join">${esc(T('join'))}</button></div>
          ${R ? `<div class="o3-my"><span>${esc(T('myRoom'))}</span><span class="cd">${esc(R.code)}</span><small class="o3-left">${esc(T('roomLeft', { t: clock(R.left) }))}</small><button type="button" class="o3-btn" id="o3ShowRoom">${esc(T('showRoom'))}</button></div>` : ''}
          <div class="o3-k" role="radiogroup"><button type="button" data-rk="open" class="${rk() === 'open' ? 'on' : ''}"><b>${esc(T('openRoom'))}</b><small>${esc(T('openDesc'))}</small></button><button type="button" data-rk="key" class="${rk() === 'key' ? 'on' : ''}"><b>${esc(T('keyRoom'))}</b><small>${esc(T('keyDesc'))}</small></button></div>
          <div class="o3-sp"></div><button type="button" class="o3-btn wide" id="o3Make">${esc(T('makeRoom'))}</button></section></div>`;
      $('#o3Name').onchange = async e => { try { e.target.value = await N.setName(e.target.value); } catch (x) {} };
      el.querySelectorAll('.o3-seg [data-v]').forEach(b => b.onclick = () => { setV(b.dataset.v); el.querySelectorAll('.o3-seg [data-v]').forEach(x => x.classList.toggle('on', x === b)); });
      el.querySelectorAll('[data-rk]').forEach(b => b.onclick = () => { try { localStorage.setItem(RK, b.dataset.rk); } catch (x) {} el.querySelectorAll('[data-rk]').forEach(x => x.classList.toggle('on', x === b)); });
      $('#o3Find').onclick = search;
      $('#o3Make').onclick = async () => { $('#o3Make').disabled = true; try { await N.createRoom({ onMatched: startGame, onExpired: () => {}, priv: rk() === 'key', v: getV() }); render('room'); } catch (e) { console.warn(e); toast(T('error')); if ($('#o3Make')) $('#o3Make').disabled = false; } };
      $('#o3Join').onclick = () => join($('#o3Code').value);
      $('#o3Code').onkeydown = e => { if (e.key === 'Enter') join($('#o3Code').value); };
      $('#o3Rooms').onclick = e => { const b = e.target.closest('[data-code]'); if (b) join(b.dataset.code, b); };
      const sr = $('#o3ShowRoom'); if (sr) sr.onclick = () => { N.extendRoom().catch(() => {}); render('room'); };
      N.topPlayers(10).then(list => { const r = $('#o3Rank'); if (r) r.innerHTML = list.length ? list.map((p, i) => `<div class="${p.me ? 'me' : ''}"><span>${i + 1}.</span><span>${esc(p.name)}</span><b>${p.rating}</b></div>`).join('') : `<div class="e">${esc(T('noRank'))}</div>`; }).catch(() => {});
    }
    async function search() {
      st = { v: getV() }; render('search');
      try { await N.enterLobby({ v: getV(), onMatched: startGame, onStatus: s => { st = s; if (view === 'search' && !closed) { const i = B.querySelector('.o3-w > small'); if (i) i.textContent = T('searchInfo', { w: s.same || 0, r: s.window || 100 }); } } }); }
      catch (e) { console.warn(e); render('error'); }
    }
    async function join(code, btn) {
      code = String(code || '').trim(); if (!code) return;
      if (btn) btn.disabled = true;
      try { const gid = await N.joinRoom(code); if (gid) { startGame(gid); return; } toast(T('noRoom')); }
      catch (e) { console.warn(e); toast(T('error')); }
      if (btn) btn.disabled = false;
    }
    async function boot() {
      render('loading');
      try { await N.init(); }
      catch (e) { render(/not-configured/.test(String(e && e.message || e)) ? 'soon' : 'error'); return; }
      if (closed) return;
      // a game still running (a reload, the table left by accident): straight back into it
      const lv = N.live.get();
      if (lv) { const g = await N.getGame(lv).catch(() => null); if (g && g.status === 'play' && N.sideNo(g, N.uid)) { render('resume'); setTimeout(() => startGame(lv), 600); return; } N.live.set(null); }
      render('menu');
      offRooms = N.watchRooms(list => { rooms = list; const r = $('#o3Rooms'); if (r && view === 'menu') r.innerHTML = roomRows(); });
      tick = setInterval(() => { const R = N.room, l = el.querySelector('.o3-left'); if (l && R) l.textContent = T('roomLeft', { t: clock(R.left) }); }, 1000);
      if (o.join) join(o.join);
    }
    boot();
    return { close: () => close(true), el };
  }
  // the card asks before it offers the online option: 'ok' | 'soon' | 'error' (cached for the page)
  const PROBE = {};
  function probe(game) {
    if (PROBE[game]) return PROBE[game];
    return PROBE[game] = net(game).init().then(() => 'ok', e => /not-configured/.test(String(e && e.message || e)) ? 'soon' : (delete PROBE[game], 'error'));
  }
  window.Online3D = { net, match, open, probe, tr, enc, dec, quant, pack, toks, GAMES, MOCK, DELAY };
})();
