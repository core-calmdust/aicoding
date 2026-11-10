/* =====================================================================
   ミッション (2026-11-11) — a fixed button at the bottom right of the portal; its popup has three tabs:
     スターター   16 first steps in a 4 × 4 bingo card: each square pays, each full line (rows, columns, diagonals) pays more,
                 the whole card pays the most
     マンスリー   this month's missions (picked from a pool by the month, so everyone has the same ones); progress counts
                 from the month's start (a snapshot taken the first time the month is seen)
     レジェンダリー long challenges with big rewards
   Everything is read from what the portal already knows (atlas-v1 W: plays on the 3D table, gacha pulls, logins; the games'
   progress P: puzzles, lessons, daily, rated; the achievements) plus the pages opened here (AtlasMissions.page(name)).
   A reward is claimed by hand (受け取る) and added to W.bonus — coins are derived (shared/atlas.js coins), so a claim is kept
   in W.ms.c and can never pay twice. The guide: ホシマル, a star of the missions (drawn here).
   Contract: AtlasMissions.init(ctx) · page(name) · sync() · open(tab)
     ctx = { t, lang(), W(), P(), ACH(), save(W), refresh(), games, gname(g), esc, sfx(kind), confetti(n), canPlay(id), levels(id) }
   ===================================================================== */
(function () {
  'use strict';
  const TX = {
    ja: { title: 'ミッション', st: 'スターター', mo: 'マンスリー', lg: 'レジェンダリー', claim: '受け取る', got: '受取済み', line: '1列そろうと +{n}', card: 'ぜんぶそろうと +{n}', bingo: 'ビンゴ！', left: 'あと{n}日', month: '{m}月のミッション', all: 'ぜんぶ達成で +{n}', done: 'クリア！', name: 'ホシマル',
      hi: ['ミッションをクリアしてコインをもらおう！', 'できたところから受け取ってね。', 'ビンゴを狙ってみよう！'], moHi: '毎月かわるミッションだよ。月末までにいくつクリアできるかな？', lgHi: 'とっておきの大挑戦。達成したら大きなごほうび！',
      page: '「{p}」を開く', news: 'NEW（更新情報）を見る', rules: '3D盤でルールを見る', historia: 'ヒストリアを見る', play: '{g}で遊ぶ', playN: '{g}で{n}回遊ぶ', games: '{n}種類のゲームで遊ぶ', pz: 'パズルを{n}問解く', ls: 'レッスンに{n}回合格する', win: '3D盤でAIに{n}回勝つ', login: '{n}日ログインする', pull: 'ガチャを{n}回引く', beat: '{g}でLv.{n}以上のAIに勝つ', beatN: '{n}種類のゲームでLv.{l}以上のAIに勝つ', ach: '実績を{n}個達成する', top: 'どれかのゲームで最強のAIに勝つ', allG: 'すべてのゲームで遊ぶ' },
    en: { title: 'Missions', st: 'Starter', mo: 'Monthly', lg: 'Legendary', claim: 'Claim', got: 'Claimed', line: 'Each line +{n}', card: 'Full card +{n}', bingo: 'Bingo!', left: '{n} days left', month: 'Missions for {M}', all: 'All done +{n}', done: 'Clear!', name: 'Hoshimaru',
      hi: ['Clear missions and earn coins!', 'Claim whatever you have finished.', 'Go for a bingo!'], moHi: 'New missions every month. How many can you clear by the end?', lgHi: 'The big challenges — with big rewards!',
      page: 'Open "{p}"', news: 'Look at NEW (updates)', rules: 'Watch the rules on the 3D board', historia: 'Open a Historia', play: 'Play {g}', playN: 'Play {g} {n} times', games: 'Play {n} different games', pz: 'Solve {n} puzzles', ls: 'Pass {n} lessons', win: 'Beat the AI {n} times on the 3D board', login: 'Log in on {n} days', pull: 'Pull the gacha {n} times', beat: 'Beat an AI of Lv.{n}+ in {g}', beatN: 'Beat an AI of Lv.{l}+ in {n} games', ach: 'Earn {n} achievements', top: 'Beat the strongest AI of any game', allG: 'Play every game' },
    zh: { title: '任务', st: '新手', mo: '每月', lg: '传说', claim: '领取', got: '已领取', line: '每连一行 +{n}', card: '全部完成 +{n}', bingo: '宾果！', left: '还剩{n}天', month: '{m}月的任务', all: '全部完成 +{n}', done: '完成！', name: '星丸',
      hi: ['完成任务赚金币吧！', '完成的部分记得领取哦。', '试着连成一行吧！'], moHi: '每月更换的任务。月底前能完成几个呢？', lgHi: '压轴的大挑战，完成有大奖励！',
      page: '打开「{p}」', news: '查看NEW（更新信息）', rules: '在3D棋盘上看规则', historia: '查看历史', play: '玩{g}', playN: '玩{g}{n}次', games: '玩{n}种游戏', pz: '解{n}道谜题', ls: '通过{n}次课程', win: '在3D棋盘上赢AI {n}次', login: '登录{n}天', pull: '扭蛋{n}次', beat: '在{g}中战胜Lv.{n}以上的AI', beatN: '在{n}种游戏中战胜Lv.{l}以上的AI', ach: '达成{n}个成就', top: '在任意游戏中战胜最强AI', allG: '玩遍所有游戏' },
    ko: { title: '미션', st: '스타터', mo: '먼슬리', lg: '레전더리', claim: '받기', got: '받음', line: '한 줄마다 +{n}', card: '전부 채우면 +{n}', bingo: '빙고!', left: '{n}일 남음', month: '{m}월 미션', all: '모두 달성 +{n}', done: '클리어!', name: '호시마루',
      hi: ['미션을 클리어하고 코인을 받자!', '완료한 것부터 받아 가.', '빙고를 노려 보자!'], moHi: '매달 바뀌는 미션이야. 월말까지 몇 개나 클리어할까?', lgHi: '특별한 대도전. 달성하면 큰 보상!',
      page: '「{p}」 열기', news: 'NEW(업데이트) 보기', rules: '3D 보드에서 규칙 보기', historia: '히스토리아 보기', play: '{g} 플레이', playN: '{g} {n}회 플레이', games: '{n}종류의 게임 플레이', pz: '퍼즐 {n}문제 풀기', ls: '레슨 {n}회 합격', win: '3D 보드에서 AI에게 {n}승', login: '{n}일 로그인', pull: '가챠 {n}회 뽑기', beat: '{g}에서 Lv.{n} 이상 AI 이기기', beatN: '{n}종류 게임에서 Lv.{l} 이상 AI 이기기', ach: '업적 {n}개 달성', top: '아무 게임에서나 최강 AI 이기기', allG: '모든 게임 플레이' },
    es: { title: 'Misiones', st: 'Inicial', mo: 'Mensual', lg: 'Legendaria', claim: 'Cobrar', got: 'Cobrado', line: 'Cada línea +{n}', card: 'Cartón completo +{n}', bingo: '¡Bingo!', left: 'Quedan {n} días', month: 'Misiones de {M}', all: 'Todas +{n}', done: '¡Hecho!', name: 'Hoshimaru',
      hi: ['¡Cumple misiones y gana monedas!', 'Cobra lo que ya hayas completado.', '¡Ve a por un bingo!'], moHi: 'Misiones nuevas cada mes. ¿Cuántas completarás?', lgHi: 'Los grandes retos, ¡con grandes premios!',
      page: 'Abrir «{p}»', news: 'Ver NEW (novedades)', rules: 'Ver las reglas en el tablero 3D', historia: 'Abrir una Historia', play: 'Jugar a {g}', playN: 'Jugar a {g} {n} veces', games: 'Jugar a {n} juegos distintos', pz: 'Resolver {n} problemas', ls: 'Aprobar {n} lecciones', win: 'Ganar a la IA {n} veces en 3D', login: 'Entrar {n} días', pull: 'Tirar del gacha {n} veces', beat: 'Ganar a una IA Nv.{n}+ en {g}', beatN: 'Ganar a una IA Nv.{l}+ en {n} juegos', ach: 'Lograr {n} logros', top: 'Ganar a la IA más fuerte de un juego', allG: 'Jugar a todos los juegos' },
    fr: { title: 'Missions', st: 'Débutant', mo: 'Mensuelles', lg: 'Légendaires', claim: 'Récupérer', got: 'Récupéré', line: 'Chaque ligne +{n}', card: 'Carte complète +{n}', bingo: 'Bingo !', left: 'Encore {n} j', month: 'Missions de {M}', all: 'Tout réussi +{n}', done: 'Réussi !', name: 'Hoshimaru',
      hi: ['Réussis des missions et gagne des pièces !', 'Récupère ce que tu as déjà fini.', 'Vise le bingo !'], moHi: 'De nouvelles missions chaque mois. Combien en réussiras-tu ?', lgHi: 'Les grands défis, avec de grandes récompenses !',
      page: 'Ouvrir « {p} »', news: 'Voir NEW (nouveautés)', rules: 'Voir les règles sur le plateau 3D', historia: 'Ouvrir une Historia', play: 'Jouer à {g}', playN: 'Jouer {n} fois à {g}', games: 'Jouer à {n} jeux différents', pz: 'Résoudre {n} problèmes', ls: 'Réussir {n} leçons', win: 'Battre l’IA {n} fois en 3D', login: 'Se connecter {n} jours', pull: 'Tirer {n} fois au gacha', beat: 'Battre une IA Nv.{n}+ à {g}', beatN: 'Battre une IA Nv.{l}+ dans {n} jeux', ach: 'Obtenir {n} succès', top: 'Battre l’IA la plus forte d’un jeu', allG: 'Jouer à tous les jeux' },
    pt: { title: 'Missões', st: 'Inicial', mo: 'Mensais', lg: 'Lendárias', claim: 'Resgatar', got: 'Resgatado', line: 'Cada linha +{n}', card: 'Cartela cheia +{n}', bingo: 'Bingo!', left: 'Faltam {n} dias', month: 'Missões de {M}', all: 'Todas +{n}', done: 'Feito!', name: 'Hoshimaru',
      hi: ['Cumpra missões e ganhe moedas!', 'Resgate o que já concluiu.', 'Tente um bingo!'], moHi: 'Missões novas todo mês. Quantas você cumpre?', lgHi: 'Os grandes desafios, com grandes prêmios!',
      page: 'Abrir «{p}»', news: 'Ver NEW (novidades)', rules: 'Ver as regras no tabuleiro 3D', historia: 'Abrir uma Historia', play: 'Jogar {g}', playN: 'Jogar {g} {n} vezes', games: 'Jogar {n} jogos diferentes', pz: 'Resolver {n} problemas', ls: 'Passar em {n} lições', win: 'Vencer a IA {n} vezes em 3D', login: 'Entrar em {n} dias', pull: 'Girar o gacha {n} vezes', beat: 'Vencer uma IA Nv.{n}+ em {g}', beatN: 'Vencer uma IA Nv.{l}+ em {n} jogos', ach: 'Conquistar {n} conquistas', top: 'Vencer a IA mais forte de um jogo', allG: 'Jogar todos os jogos' },
    de: { title: 'Missionen', st: 'Einstieg', mo: 'Monatlich', lg: 'Legendär', claim: 'Abholen', got: 'Abgeholt', line: 'Jede Reihe +{n}', card: 'Ganze Karte +{n}', bingo: 'Bingo!', left: 'Noch {n} Tage', month: 'Missionen im {M}', all: 'Alle geschafft +{n}', done: 'Geschafft!', name: 'Hoshimaru',
      hi: ['Erfülle Missionen und sammle Münzen!', 'Hol dir ab, was du geschafft hast.', 'Versuch ein Bingo!'], moHi: 'Jeden Monat neue Missionen. Wie viele schaffst du?', lgHi: 'Die großen Herausforderungen – mit großen Belohnungen!',
      page: '„{p}“ öffnen', news: 'NEW (Neuigkeiten) ansehen', rules: 'Regeln auf dem 3D-Brett ansehen', historia: 'Eine Historia öffnen', play: '{g} spielen', playN: '{g} {n}-mal spielen', games: '{n} verschiedene Spiele spielen', pz: '{n} Aufgaben lösen', ls: '{n} Lektionen bestehen', win: 'Die KI {n}-mal in 3D schlagen', login: 'An {n} Tagen einloggen', pull: '{n}-mal Gacha ziehen', beat: 'Eine KI ab Lv.{n} in {g} schlagen', beatN: 'Eine KI ab Lv.{l} in {n} Spielen schlagen', ach: '{n} Erfolge erreichen', top: 'Die stärkste KI eines Spiels schlagen', allG: 'Jedes Spiel spielen' },
    hi: { title: 'मिशन', st: 'स्टार्टर', mo: 'मासिक', lg: 'लेजेंडरी', claim: 'लें', got: 'लिया', line: 'हर पंक्ति +{n}', card: 'पूरा कार्ड +{n}', bingo: 'बिंगो!', left: '{n} दिन बाकी', month: '{M} के मिशन', all: 'सब पूरे +{n}', done: 'पूरा!', name: 'होशीमारु',
      hi: ['मिशन पूरे करो और सिक्के पाओ!', 'जो पूरा हुआ, वह ले लो।', 'बिंगो की कोशिश करो!'], moHi: 'हर महीने नए मिशन। कितने पूरे करोगे?', lgHi: 'बड़ी चुनौतियाँ, बड़े इनाम!',
      page: '“{p}” खोलें', news: 'NEW (अपडेट) देखें', rules: '3D बोर्ड पर नियम देखें', historia: 'हिस्टोरिया खोलें', play: '{g} खेलें', playN: '{g} {n} बार खेलें', games: '{n} अलग खेल खेलें', pz: '{n} पहेलियाँ हल करें', ls: '{n} पाठ पास करें', win: '3D पर AI को {n} बार हराएँ', login: '{n} दिन लॉग इन करें', pull: 'गाचा {n} बार खींचें', beat: '{g} में Lv.{n}+ AI को हराएँ', beatN: '{n} खेलों में Lv.{l}+ AI को हराएँ', ach: '{n} उपलब्धियाँ पाएँ', top: 'किसी खेल का सबसे मज़बूत AI हराएँ', allG: 'हर खेल खेलें' },
    ar: { title: 'المهام', st: 'المبتدئ', mo: 'الشهرية', lg: 'الأسطورية', claim: 'استلم', got: 'تم الاستلام', line: 'كل صف +{n}', card: 'البطاقة كاملة +{n}', bingo: 'بينغو!', left: 'باقي {n} يوم', month: 'مهام {M}', all: 'الكل +{n}', done: 'تم!', name: 'هوشيمارو',
      hi: ['أنجز المهام واربح العملات!', 'استلم ما أنجزته.', 'جرّب البينغو!'], moHi: 'مهام جديدة كل شهر. كم ستنجز؟', lgHi: 'التحديات الكبرى بجوائز كبرى!',
      page: 'افتح «{p}»', news: 'شاهد NEW (التحديثات)', rules: 'شاهد القواعد على اللوحة ثلاثية الأبعاد', historia: 'افتح هيستوريا', play: 'العب {g}', playN: 'العب {g} {n} مرات', games: 'العب {n} ألعاب مختلفة', pz: 'حل {n} ألغاز', ls: 'انجح في {n} دروس', win: 'اهزم الذكاء الاصطناعي {n} مرات', login: 'سجّل الدخول {n} أيام', pull: 'اسحب الغاتشا {n} مرات', beat: 'اهزم ذكاءً اصطناعيًا Lv.{n}+ في {g}', beatN: 'اهزم ذكاءً اصطناعيًا Lv.{l}+ في {n} ألعاب', ach: 'احصل على {n} إنجازًا', top: 'اهزم أقوى ذكاء اصطناعي في أي لعبة', allG: 'العب كل الألعاب' },
    ru: { title: 'Миссии', st: 'Старт', mo: 'Месяц', lg: 'Легенды', claim: 'Забрать', got: 'Получено', line: 'Каждый ряд +{n}', card: 'Вся карточка +{n}', bingo: 'Бинго!', left: 'Осталось {n} дн.', month: 'Миссии: {M}', all: 'Все выполнены +{n}', done: 'Готово!', name: 'Хосимару',
      hi: ['Выполняй миссии и получай монеты!', 'Забирай награды за выполненное.', 'Попробуй собрать бинго!'], moHi: 'Каждый месяц новые миссии. Сколько успеешь?', lgHi: 'Большие испытания — большие награды!',
      page: 'Открыть «{p}»', news: 'Посмотреть NEW (новости)', rules: 'Посмотреть правила на 3D-доске', historia: 'Открыть Историю', play: 'Сыграть в {g}', playN: 'Сыграть в {g} {n} раз', games: 'Сыграть в {n} разных игр', pz: 'Решить {n} задач', ls: 'Сдать {n} уроков', win: 'Победить ИИ {n} раз в 3D', login: 'Заходить {n} дней', pull: 'Крутить гачу {n} раз', beat: 'Победить ИИ ур. {n}+ в {g}', beatN: 'Победить ИИ ур. {l}+ в {n} играх', ach: 'Получить {n} достижений', top: 'Победить сильнейший ИИ в любой игре', allG: 'Сыграть во все игры' },
    'zh-TW': { title: '任務', st: '新手', mo: '每月', lg: '傳說', claim: '領取', got: '已領取', line: '每連一行 +{n}', card: '全部完成 +{n}', bingo: '賓果！', left: '還剩{n}天', month: '{m}月的任務', all: '全部完成 +{n}', done: '完成！', name: '星丸',
      hi: ['完成任務賺金幣吧！', '完成的部分記得領取喔。', '試著連成一行吧！'], moHi: '每月更換的任務。月底前能完成幾個呢？', lgHi: '壓軸的大挑戰，完成有大獎勵！',
      page: '打開「{p}」', news: '查看NEW（更新資訊）', rules: '在3D棋盤上看規則', historia: '查看歷史', play: '玩{g}', playN: '玩{g}{n}次', games: '玩{n}種遊戲', pz: '解{n}道謎題', ls: '通過{n}次課程', win: '在3D棋盤上贏AI {n}次', login: '登入{n}天', pull: '轉蛋{n}次', beat: '在{g}中戰勝Lv.{n}以上的AI', beatN: '在{n}種遊戲中戰勝Lv.{l}以上的AI', ach: '達成{n}個成就', top: '在任一遊戲中戰勝最強AI', allG: '玩遍所有遊戲' },
    id: { title: 'Misi', st: 'Pemula', mo: 'Bulanan', lg: 'Legendaris', claim: 'Ambil', got: 'Diambil', line: 'Tiap baris +{n}', card: 'Kartu penuh +{n}', bingo: 'Bingo!', left: '{n} hari lagi', month: 'Misi {M}', all: 'Semua +{n}', done: 'Selesai!', name: 'Hoshimaru',
      hi: ['Selesaikan misi dan dapatkan koin!', 'Ambil hadiah yang sudah selesai.', 'Coba dapatkan bingo!'], moHi: 'Misi baru tiap bulan. Berapa yang bisa kamu selesaikan?', lgHi: 'Tantangan besar dengan hadiah besar!',
      page: 'Buka “{p}”', news: 'Lihat NEW (pembaruan)', rules: 'Lihat aturan di papan 3D', historia: 'Buka Historia', play: 'Main {g}', playN: 'Main {g} {n} kali', games: 'Main {n} game berbeda', pz: 'Selesaikan {n} teka-teki', ls: 'Lulus {n} pelajaran', win: 'Kalahkan AI {n} kali di 3D', login: 'Masuk {n} hari', pull: 'Tarik gacha {n} kali', beat: 'Kalahkan AI Lv.{n}+ di {g}', beatN: 'Kalahkan AI Lv.{l}+ di {n} game', ach: 'Raih {n} pencapaian', top: 'Kalahkan AI terkuat di game mana pun', allG: 'Main semua game' },
    tr: { title: 'Görevler', st: 'Başlangıç', mo: 'Aylık', lg: 'Efsanevi', claim: 'Al', got: 'Alındı', line: 'Her sıra +{n}', card: 'Tüm kart +{n}', bingo: 'Tombala!', left: '{n} gün kaldı', month: '{M} görevleri', all: 'Hepsi +{n}', done: 'Tamam!', name: 'Hoshimaru',
      hi: ['Görevleri tamamla, jeton kazan!', 'Bitirdiklerini al.', 'Tombala yapmayı dene!'], moHi: 'Her ay yeni görevler. Kaçını bitireceksin?', lgHi: 'Büyük meydan okumalar, büyük ödüller!',
      page: '“{p}” aç', news: 'NEW’e (yenilikler) bak', rules: 'Kuralları 3D tahtada izle', historia: 'Bir Historia aç', play: '{g} oyna', playN: '{g} {n} kez oyna', games: '{n} farklı oyun oyna', pz: '{n} bulmaca çöz', ls: '{n} dersi geç', win: '3D’de YZ’yi {n} kez yen', login: '{n} gün giriş yap', pull: 'Gacha’yı {n} kez çek', beat: '{g} oyununda Sv.{n}+ YZ’yi yen', beatN: '{n} oyunda Sv.{l}+ YZ’yi yen', ach: '{n} başarım kazan', top: 'Herhangi bir oyunun en güçlü YZ’sini yen', allG: 'Her oyunu oyna' },
  };
  const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => v[k] != null ? v[k] : '');
  let C = null;
  const X = () => TX[C.lang()] || TX.en;
  const ym = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  // a small seeded random (the month's missions are the same for everyone)
  const rng = seed => { let s = 0; for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

  /* ---------- what the player has done (read from the portal's state) ---------- */
  function ST() {
    const W = C.W(), P = C.P() || {}, ACH = C.ACH() || [], ids = C.games.map(g => g.id);
    const p3 = id => (W.plays && W.plays[id]) || { n: 0, w: 0, best: 0 };
    const playM = id => { const r = P[id] || {}; return (r.dl ? r.dl.days : 0) + (r.rt ? r.rt.n : 0) + p3(id).n; };
    return {
      W, P, ids, p3, playM,
      touched: id => !!(P[id] && P[id].touched) || p3(id).n > 0,
      pz: ids.reduce((a, id) => a + ((P[id] && P[id].pz) || 0), 0),
      ls: ids.reduce((a, id) => a + ((P[id] && P[id].ls) || 0), 0),
      wins: ids.reduce((a, id) => a + p3(id).w, 0),
      login: (W.login && W.login.total) || 0, pulls: W.pulls || 0, ach: ACH.filter(a => a.done).length,
      pages: (W.ms && W.ms.pg) || {},
    };
  }
  const ms = () => { const W = C.W(); W.ms = W.ms || {}; W.ms.c = W.ms.c || {}; W.ms.pg = W.ms.pg || {}; W.ms.b = W.ms.b || {}; return W.ms; };
  // the month's start: a snapshot of the counters the monthly missions count from (taken the first time the month is seen)
  function base(S) {
    const M = ms(), k = ym();
    if (!M.b[k]) {
      const pm = {}; S.ids.forEach(id => { pm[id] = S.playM(id); });
      const best = {}; S.ids.forEach(id => { best[id] = S.p3(id).best; });
      M.b[k] = { pm, best, pz: S.pz, ls: S.ls, wins: S.wins, login: S.login, pulls: S.pulls, pg: {} };
      Object.keys(M.b).sort().slice(0, -3).forEach(x => delete M.b[x]);   // (the last three months are kept)
      C.save(C.W());
    }
    return M.b[k];
  }
  const G = id => C.games.find(g => g.id === id);
  const gn = id => { const g = G(id); return g ? C.gname(g) : id; };

  /* ---------- the missions ---------- */
  // each: { id, tx (text), have, need, coins, ic }
  const mk = (id, tx, have, need, coins, ic) => ({ id, tx, have: Math.min(have, need), need, coins, ic, ok: have >= need });
  function starter(S) {
    const x = X(), pg = p => S.pages[p] ? 1 : 0, page = p => fill(x.page, { p: C.t('tab.' + p) });
    return [
      mk('s-map', page('map'), pg('map'), 1, 50, '🗺️'), mk('s-news', x.news, pg('news'), 1, 50, '🆕'), mk('s-gacha', page('gacha'), pg('gacha'), 1, 50, '🎁'), mk('s-dress', page('dress'), pg('dress'), 1, 50, '👕'),
      mk('s-reversi', fill(x.play, { g: gn('reversi') }), S.touched('reversi') ? 1 : 0, 1, 50, '⚫'), mk('s-shogi', fill(x.play, { g: gn('shogi') }), S.touched('shogi') ? 1 : 0, 1, 50, '☗'),
      mk('s-chess', fill(x.play, { g: gn('chess') }), S.touched('chess') ? 1 : 0, 1, 50, '♞'), mk('s-games3', fill(x.games, { n: 3 }), S.ids.filter(S.touched).length, 3, 50, '🎲'),
      mk('s-rules', x.rules, pg('rules'), 1, 50, '📖'), mk('s-hist', x.historia, pg('historia'), 1, 50, '🏛️'), mk('s-pz', fill(x.pz, { n: 1 }), S.pz, 1, 50, '🧩'), mk('s-ls', fill(x.ls, { n: 1 }), S.ls, 1, 50, '🎓'),
      mk('s-win', fill(x.win, { n: 1 }), S.wins, 1, 50, '🏆'), mk('s-login', fill(x.login, { n: 3 }), S.login, 3, 50, '📅'), mk('s-pull', fill(x.pull, { n: 1 }), S.pulls, 1, 50, '🎰'),
      mk('s-boss', fill(x.beat, { g: gn('reversi'), n: 4 }), S.p3('reversi').best, 4, 50, '👑'),
    ];
  }
  const LINES = (() => { const L = []; for (let i = 0; i < 4; i++) { L.push([0, 1, 2, 3].map(j => i * 4 + j)); L.push([0, 1, 2, 3].map(j => j * 4 + i)); } L.push([0, 5, 10, 15], [3, 6, 9, 12]); return L; })();
  const LINE_COINS = 200, CARD_COINS = 1000, MONTH_ALL = 500;
  function monthly(S) {
    const x = X(), B = base(S), k = ym(), r = rng('atlas-ms-' + k), play = (C.playable() || []).filter(id => G(id));
    const pickG = (avoid, cond) => { const L = play.filter(id => !avoid.includes(id) && (!cond || cond(id))); return L.length ? L[Math.floor(r() * L.length)] : play[0]; };
    if (!B.g || !B.g[0]) { const a = pickG([]), b = pickG([a]), c = pickG([a, b], id => (B.best[id] || 0) < 7 && (C.levels(id) || 0) >= 7); if (a && b && c) { B.g = [a, b, c]; C.save(C.W()); } }   // (the month's games, fixed once picked)
    const [g1, g2, g3] = B.g || [play[0], play[1], play[2]];
    const diff = (a, b) => Math.max(0, (a || 0) - (b || 0)), M = ms(), mpg = (M.b[k] && M.b[k].pg) || {};
    const L = [
      mk(`m-${k}-p1`, fill(x.playN, { g: gn(g1), n: 3 }), diff(S.playM(g1), B.pm[g1]), 3, 150, '🎲'),
      mk(`m-${k}-p2`, fill(x.playN, { g: gn(g2), n: 3 }), diff(S.playM(g2), B.pm[g2]), 3, 150, '🎲'),
      mk(`m-${k}-boss`, fill(x.beat, { g: gn(g3), n: 7 }), S.p3(g3).best >= 7 ? 1 : 0, 1, 300, '👑'),
      mk(`m-${k}-games`, fill(x.games, { n: 5 }), S.ids.filter(id => S.playM(id) > (B.pm[id] || 0)).length, 5, 250, '🌍'),
      mk(`m-${k}-pz`, fill(x.pz, { n: 10 }), diff(S.pz, B.pz), 10, 200, '🧩'),
      mk(`m-${k}-ls`, fill(x.ls, { n: 2 }), diff(S.ls, B.ls), 2, 200, '🎓'),
      mk(`m-${k}-win`, fill(x.win, { n: 5 }), diff(S.wins, B.wins), 5, 200, '🏆'),
      mk(`m-${k}-login`, fill(x.login, { n: 10 }), diff(S.login, B.login), 10, 250, '📅'),
      mk(`m-${k}-map`, fill(x.page, { p: C.t('tab.map') }), mpg.map ? 1 : 0, 1, 100, '🗺️'),
    ];
    L.push(Object.assign(mk(`m-${k}-all`, fill(x.all, { n: MONTH_ALL }), L.filter(m => M.c[m.id]).length, L.length, MONTH_ALL, '⭐'), { all: true }));
    return L;
  }
  function legend(S) {
    const x = X(), top = S.ids.some(id => { const n = C.levels(id); return n && S.p3(id).best >= n; });
    return [
      mk('l-all', x.allG, S.ids.filter(S.touched).length, S.ids.length, 3000, '🌏'),
      mk('l-boss10', fill(x.beatN, { n: 10, l: 7 }), S.ids.filter(id => S.p3(id).best >= 7).length, 10, 2000, '👑'),
      mk('l-top', x.top, top ? 1 : 0, 1, 3000, '🐉'),
      mk('l-ach', fill(x.ach, { n: 100 }), S.ach, 100, 1500, '🏅'),
      mk('l-pz', fill(x.pz, { n: 500 }), S.pz, 500, 2000, '🧩'),
      mk('l-ls', fill(x.ls, { n: 50 }), S.ls, 50, 2000, '🎓'),
      mk('l-win', fill(x.win, { n: 100 }), S.wins, 100, 2000, '🏆'),
      mk('l-login', fill(x.login, { n: 30 }), S.login, 30, 1500, '📅'),
      mk('l-pull', fill(x.pull, { n: 100 }), S.pulls, 100, 1500, '🎰'),
    ];
  }
  // what can be claimed now
  function state() {
    const S = ST(), M = ms(), st = starter(S), mo = monthly(S), lg = legend(S);
    const stClaimed = i => !!M.c[st[i].id];
    const lines = LINES.map((L, i) => ({ id: 'sl-' + i, L, ok: L.every(stClaimed) }));
    const card = { id: 'sc-all', ok: st.every((_, i) => stClaimed(i)) };
    const can = m => m.ok && !M.c[m.id];
    const n = { st: st.filter(can).length + lines.filter(can).length + (can(card) ? 1 : 0), mo: mo.filter(can).length, lg: lg.filter(can).length };
    return { S, M, st, mo, lg, lines, card, can, n };
  }
  function claim(id, coins) {
    const M = ms(); if (M.c[id]) return; M.c[id] = Date.now();
    const W = C.W(); W.bonus = (W.bonus || 0) + coins; C.save(W);
    try { C.sfx('coin'); } catch (e) {}
    try { C.confetti(coins >= 500 ? 90 : 36); } catch (e) {}
    C.refresh(); sync();
  }

  /* ---------- the button and the popup ---------- */
  // ホシマル: a little star with a ribbon (the missions' own guide)
  const HOSHI = `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="msS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe066"/><stop offset="1" stop-color="#ffb21e"/></linearGradient></defs>
    <path d="M50 6l12.6 25.5 28.2 4.1-20.4 19.9 4.8 28.1L50 70.4 24.8 83.6l4.8-28.1L9.2 35.6l28.2-4.1z" fill="url(#msS)" stroke="#e08a00" stroke-width="3" stroke-linejoin="round"/>
    <ellipse cx="41" cy="47" rx="3.6" ry="4.6" fill="#3a2a1a"/><ellipse cx="59" cy="47" rx="3.6" ry="4.6" fill="#3a2a1a"/><circle cx="42.2" cy="45.4" r="1.2" fill="#fff"/><circle cx="60.2" cy="45.4" r="1.2" fill="#fff"/>
    <path d="M44 56q6 5 12 0" fill="none" stroke="#3a2a1a" stroke-width="2.6" stroke-linecap="round"/><circle cx="35" cy="55" r="3.4" fill="#ff8a7a" opacity=".6"/><circle cx="65" cy="55" r="3.4" fill="#ff8a7a" opacity=".6"/>
    <path d="M62 14q8-6 14 0q-7 2-8 9z" fill="#ff5d5d"/></svg>`;
  let btn = null, ov = null, tab = 'st';
  function css() {
    if (document.getElementById('msCss')) return;
    const s = document.createElement('style'); s.id = 'msCss';
    s.textContent = `
.msbtn{position:fixed;z-index:40;right:max(18px,env(safe-area-inset-right));bottom:calc(84px + env(safe-area-inset-bottom));width:66px;height:66px;border-radius:50%;border:3px solid #fff;background:radial-gradient(circle at 35% 30%,#fff7d6,#ffd65a 70%);box-shadow:0 5px 0 #e9b23a,0 14px 26px -10px rgba(120,70,0,.55);cursor:pointer;display:grid;place-items:center;padding:0;transition:transform .15s}
.msbtn:hover{transform:translateY(-2px) rotate(-4deg)}.msbtn:active{transform:translateY(2px)}
.msbtn svg{width:46px;height:46px;animation:msBob 3.2s ease-in-out infinite}
@keyframes msBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
.msbtn b{position:absolute;top:-6px;right:-6px;min-width:24px;height:24px;padding:0 6px;border-radius:99px;background:#ff5d5d;color:#fff;font:900 13px/24px var(--font,sans-serif);box-shadow:0 2px 0 #c43a3a;border:2px solid #fff}
.msbtn b:empty{display:none}.msbtn span{position:absolute;bottom:-9px;left:50%;transform:translateX(-50%);background:#2b3044;color:#fff;font:900 10.5px/1 var(--font,sans-serif);padding:4px 8px;border-radius:99px;white-space:nowrap}
@media (max-width:600px){.msbtn{width:56px;height:56px;bottom:calc(76px + env(safe-area-inset-bottom))}.msbtn svg{width:38px;height:38px}}
.msov{position:fixed;inset:0;z-index:120;background:rgba(30,20,10,.42);display:grid;place-items:center;padding:16px;opacity:0;pointer-events:none;transition:opacity .2s}
.msov.on{opacity:1;pointer-events:auto}
.msp{width:min(720px,100%);max-height:calc(100dvh - 32px);display:flex;flex-direction:column;background:#fffaf0;border-radius:26px;border:3px solid #fff;box-shadow:0 30px 60px -20px rgba(60,30,0,.55);overflow:hidden;transform:translateY(20px) scale(.97);transition:transform .25s cubic-bezier(.3,1.4,.5,1);font-family:var(--font,sans-serif);color:var(--ink,#2b3044)}
.msov.on .msp{transform:none}
.mshd{display:flex;align-items:center;gap:12px;padding:14px 16px 10px;background:linear-gradient(180deg,#fff1c9,#fffaf0)}
.mshd .pic{flex:none;width:64px;height:64px;filter:drop-shadow(0 3px 3px rgba(120,70,0,.25))}.mshd .pic svg{width:100%;height:100%}
.mshd .say{flex:1;min-width:0}.mshd .say small{font-size:12px;font-weight:900;color:#c98a2a}.mshd .say p{margin:2px 0 0;font-size:14px;font-weight:800;line-height:1.5}
.mshd h3{margin:0;font-size:20px;font-weight:900}.msx{flex:none;width:40px;height:40px;border-radius:50%;border:0;background:#f1e6cf;font-size:18px;cursor:pointer;color:var(--ink,#2b3044)}
.mstabs{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin:0 16px;padding:4px;border-radius:99px;background:#f1e6cf}
.mstabs button{position:relative;border:0;border-radius:99px;background:transparent;padding:9px 6px;font:900 14px var(--font,sans-serif);color:#6b7088;cursor:pointer}
.mstabs button.on{background:#fff;color:var(--ink,#2b3044);box-shadow:0 3px 0 #e3cfa4}.mstabs button i{position:absolute;top:-4px;right:8px;min-width:18px;height:18px;border-radius:99px;background:#ff5d5d;color:#fff;font:900 11px/18px var(--font,sans-serif);font-style:normal;padding:0 5px}
.mstabs button[data-t=lg].on{background:linear-gradient(90deg,#fff3c4,#ffe2f4,#dff3ff)}
.msbd{flex:1;min-height:0;overflow:auto;padding:14px 16px 18px}
.msnote{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12.5px;font-weight:800;color:#a07a48;margin:0 2px 10px}
.msgrid{display:grid;grid-template-columns:repeat(4,1fr) 46px;gap:8px;align-items:stretch}
.mscell{position:relative;min-height:104px;border-radius:16px;border:2px solid #efe3c8;background:#fff;padding:8px 6px 8px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;gap:4px;text-align:center;box-shadow:0 3px 0 #efe3c8;font:inherit;color:inherit;cursor:default}
.mscell .ic{font-size:24px;line-height:1}.mscell .tx{font-size:11.5px;font-weight:800;line-height:1.35;color:#4a5068}.mscell .pr{font-size:11px;font-weight:900;color:#a07a48}
.mscell.can{border-color:#ffb21e;background:#fff7dc;box-shadow:0 3px 0 #f0c25a;cursor:pointer;animation:msGlow 1.6s ease-in-out infinite}
@keyframes msGlow{0%,100%{box-shadow:0 3px 0 #f0c25a,0 0 0 0 rgba(255,178,30,.5)}50%{box-shadow:0 3px 0 #f0c25a,0 0 0 6px rgba(255,178,30,0)}}
.mscell.got{background:#f2fbf6;border-color:#bfe8d2;box-shadow:0 3px 0 #bfe8d2}.mscell.got::after{content:'✓';position:absolute;inset:0;display:grid;place-items:center;font-size:52px;font-weight:900;color:rgba(30,163,108,.28);transform:rotate(-12deg)}
.mscell .cn{font-size:11px;font-weight:900;color:#c98a2a}.mscell.can .cn{color:#d17c00}
.msln{display:grid;place-items:center;border-radius:14px;border:2px dashed #efe3c8;font:900 11px var(--font,sans-serif);color:#c9b48a;background:transparent;padding:0}
.msln.ok{border:2px solid #ffb21e;background:#fff3c4;color:#c46c00;cursor:pointer;animation:msGlow 1.6s ease-in-out infinite}.msln.got{border-style:solid;border-color:#bfe8d2;background:#f2fbf6;color:#1ea36c}
.mscard{margin-top:12px;display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:16px;background:linear-gradient(90deg,#fff3c4,#ffe9f2);border:2px solid #f6d79a;font-weight:900}
.mscard span{flex:1;font-size:14px}.mslist{display:flex;flex-direction:column;gap:10px}
.msrow{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:16px;background:#fff;border:2px solid #efe3c8;box-shadow:0 3px 0 #efe3c8}
.msrow .ic{flex:none;width:42px;height:42px;border-radius:12px;background:#fff3d8;display:grid;place-items:center;font-size:22px}
.msrow .md{flex:1;min-width:0}.msrow .md b{display:block;font-size:14px;font-weight:900;line-height:1.35}.msrow .bar{display:block;height:8px;margin-top:6px;border-radius:99px;background:#efe6d3;overflow:hidden}.msrow .bar i{display:block;height:100%;border-radius:99px;background:#ffb21e}
.msrow .md small{display:block;margin-top:3px;font-size:11.5px;font-weight:800;color:#a07a48}
.msrow.lgd{border-color:#f0d3ff;background:linear-gradient(100deg,#fff,#fbf4ff);box-shadow:0 3px 0 #ead7f7}.msrow.lgd .ic{background:linear-gradient(135deg,#fff3c4,#f6defe)}
.msrow.all{border-color:#f6d79a;background:linear-gradient(90deg,#fff8e0,#fff)}
.msget{flex:none;min-width:96px;height:40px;padding:0 12px;border-radius:99px;border:0;font:900 13px var(--font,sans-serif);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:4px;background:#f1e6cf;color:#a08a64}
.msget.can{background:#ff5d5d;color:#fff;box-shadow:0 3px 0 #c43a3a}.msget.got{background:#e3f6ec;color:#1ea36c;cursor:default}.msget:disabled{cursor:default}
.msget .cc{display:inline-grid;place-items:center;width:16px;height:16px;border-radius:50%;background:#ffc928;color:#8a5a00;font-size:10px}
@media (max-width:600px){.msgrid{grid-template-columns:repeat(4,1fr) 34px;gap:5px}.mscell{min-height:92px;padding:6px 3px}.mscell .tx{font-size:10.5px}.mscell .ic{font-size:20px}.mshd .pic{width:52px;height:52px}}
`;
    document.head.appendChild(s);
  }
  const coin = '<span class="cc">¢</span>';
  function getBtn(m, coins) {
    const s0 = state(), got = !!s0.M.c[m.id], can = s0.can(m);
    return `<button type="button" class="msget ${got ? 'got' : can ? 'can' : ''}" data-c="${m.id}" data-n="${coins}" ${can ? '' : 'disabled'}>${got ? '✓ ' + C.esc(X().got) : `${coin}+${coins}`}</button>`;
  }
  function render() {
    if (!ov) return;
    const x = X(), s = state(), esc = C.esc;
    const say = tab === 'st' ? x.hi[Math.floor(Date.now() / 60000) % x.hi.length] : tab === 'mo' ? x.moHi : x.lgHi;
    let body = '';
    if (tab === 'st') {
      const cell = (m, i) => { const got = !!s.M.c[m.id], can = s.can(m); return `<button type="button" class="mscell ${got ? 'got' : can ? 'can' : ''}" ${can ? `data-c="${m.id}" data-n="${m.coins}"` : 'tabindex="-1"'}><span class="ic">${m.ic}</span><span class="tx">${esc(m.tx)}</span><span class="${can || got ? 'cn' : 'pr'}">${got ? '' : can ? x.claim : m.need > 1 ? m.have + '/' + m.need : '+' + m.coins}</span></button>`; };
      const ln = i => { const L = s.lines[i], got = !!s.M.c[L.id]; return `<button type="button" class="msln ${got ? 'got' : L.ok ? 'ok' : ''}" ${L.ok && !got ? `data-c="${L.id}" data-n="${LINE_COINS}"` : 'tabindex="-1"'}>${got ? '✓' : '+' + LINE_COINS}</button>`; };
      let g = '';
      for (let r = 0; r < 4; r++) { for (let c = 0; c < 4; c++) g += cell(s.st[r * 4 + c], r * 4 + c); g += ln(r * 2); }
      for (let c = 0; c < 4; c++) g += ln(c * 2 + 1);
      g += `<div style="display:grid;grid-template-rows:1fr 1fr;gap:4px">${ln(8)}${ln(9)}</div>`;
      const cardGot = !!s.M.c[s.card.id];
      body = `<div class="msnote"><span>🎯 ${esc(fill(x.line, { n: LINE_COINS }))}</span><span>🌟 ${esc(fill(x.card, { n: CARD_COINS }))}</span><span>✓ ${s.lines.filter(l => s.M.c[l.id]).length}/${s.lines.length}</span></div>
        <div class="msgrid">${g}</div>
        <div class="mscard"><span>🌟 ${esc(x.bingo)} ${esc(fill(x.card, { n: CARD_COINS }))}</span>${getBtn(s.card, CARD_COINS)}</div>`;
    } else {
      const L = tab === 'mo' ? s.mo : s.lg, d = new Date(), last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const M2 = new Intl.DateTimeFormat(C.lang(), { month: 'long' }).format(d);
      body = (tab === 'mo' ? `<div class="msnote"><span>📅 ${esc(fill(x.month, { m: d.getMonth() + 1, M: M2 }))}</span><span>⏳ ${esc(fill(x.left, { n: last - d.getDate() + 1 }))}</span></div>` : '') +
        `<div class="mslist">${L.map(m => `<div class="msrow ${tab === 'lg' ? 'lgd' : ''} ${m.all ? 'all' : ''}"><span class="ic">${m.ic}</span><span class="md"><b>${esc(m.tx)}</b><span class="bar"><i style="width:${Math.round(m.have / m.need * 100)}%"></i></span><small>${m.have.toLocaleString()} / ${m.need.toLocaleString()}</small></span>${getBtn(m, m.coins)}</div>`).join('')}</div>`;
    }
    ov.innerHTML = `<div class="msp" role="dialog" aria-modal="true" aria-label="${esc(x.title)}">
      <div class="mshd"><span class="pic">${HOSHI}</span><div class="say"><small>${esc(x.name)}</small><h3>${esc(x.title)}</h3><p>${esc(say)}</p></div><button type="button" class="msx" aria-label="close">✕</button></div>
      <div class="mstabs" role="tablist">${[['st', x.st], ['mo', x.mo], ['lg', x.lg]].map(([k, lb]) => `<button type="button" role="tab" data-t="${k}" class="${k === tab ? 'on' : ''}" aria-selected="${k === tab}">${esc(lb)}${s.n[k] ? `<i>${s.n[k]}</i>` : ''}</button>`).join('')}</div>
      <div class="msbd">${body}</div></div>`;
  }
  function open(t2) {
    css(); if (t2) tab = t2;
    if (!ov) {
      ov = document.createElement('div'); ov.className = 'msov'; document.body.appendChild(ov);
      ov.addEventListener('click', e => {
        if (e.target === ov || e.target.closest('.msx')) return close();
        const tb = e.target.closest('[data-t]'); if (tb) { tab = tb.dataset.t; try { C.sfx('tap'); } catch (x) {} render(); return; }
        const c = e.target.closest('[data-c]'); if (c && !c.disabled) { claim(c.dataset.c, +c.dataset.n); render(); }
      });
      addEventListener('keydown', e => { if (e.key === 'Escape' && ov.classList.contains('on')) close(); });
    }
    render(); requestAnimationFrame(() => ov.classList.add('on'));
  }
  function close() { if (ov) ov.classList.remove('on'); }
  function sync() {
    if (!C) return;
    css();
    if (!btn) {
      btn = document.createElement('button'); btn.type = 'button'; btn.className = 'msbtn'; btn.innerHTML = HOSHI + '<b></b><span></span>';
      btn.onclick = () => { try { C.sfx('tap'); } catch (e) {} open(); };
      document.body.appendChild(btn);
    }
    const s = state(), n = s.n.st + s.n.mo + s.n.lg, x = X();
    btn.querySelector('b').textContent = n ? String(n) : '';
    btn.querySelector('span').textContent = x.title; btn.setAttribute('aria-label', x.title); btn.title = x.title;
    if (ov && ov.classList.contains('on')) render();
  }
  // a page / view opened in the portal (the map, NEW, gacha, rules on the table, a Historia …)
  function page(name) {
    if (!C) return; const M = ms(); let ch = false;
    if (!M.pg[name]) { M.pg[name] = Date.now(); ch = true; }
    const S = ST(), B = base(S); if (!B.pg[name]) { B.pg[name] = 1; ch = true; }
    if (ch) { C.save(C.W()); sync(); }
  }
  function show(on) { if (btn) btn.hidden = !on; }
  window.AtlasMissions = { init(ctx) { C = ctx; sync(); }, page, sync, open, show };
})();
