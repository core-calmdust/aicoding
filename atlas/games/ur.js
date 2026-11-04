/* =====================================================================
   The Royal Game of Ur on the portal.
   · The board card (levels, sides, modes): level names = the game's 15 kyu … 5 dan (ur/i18n.js),
     ratings = the game's RT_LV (ur/app.js), descriptions = its lvd lines.
   · No table play on the chabudai: "Play" opens the full game in its 3D skin (ur/?skin=atlas,
     atlas/skin/ur.js) with the level / side / mode picked here (FULL_SKIN in atlas/app.js).
   ===================================================================== */
(function () {
  'use strict';
  const KYU = { ja: '{n}級', en: '{n} kyu', zh: '{n}级', ko: '{n}급', es: '{n} kyu', fr: '{n} kyu', pt: '{n} kyu', de: '{n}. Kyu', hi: '{n} क्यू', ar: '{n} كيو' };
  const DAN = {
    ja: ['初段', '二段', '三段', '四段', '五段'], en: ['1 dan', '2 dan', '3 dan', '4 dan', '5 dan'], zh: ['初段', '二段', '三段', '四段', '五段'], ko: ['초단', '2단', '3단', '4단', '5단'],
    es: ['1 dan', '2 dan', '3 dan', '4 dan', '5 dan'], fr: ['1 dan', '2 dan', '3 dan', '4 dan', '5 dan'], pt: ['1 dan', '2 dan', '3 dan', '4 dan', '5 dan'], de: ['1. Dan', '2. Dan', '3. Dan', '4. Dan', '5. Dan'],
    hi: ['1 दान', '2 दान', '3 दान', '4 दान', '5 दान'], ar: ['1 دان', '2 دان', '3 دان', '4 دان', '5 دان'],
  };
  const LVD = {
    ja: ['入門：目に任せて動かす', '初級〜中級：ロゼットと取りを考える', '上級：危険と勝率を読む', '有段：期待値を読み切る（最強はほぼ最善）'],
    en: ['Beginner: moves by luck', 'Novice to intermediate: thinks about rosettes and captures', 'Advanced: weighs risks and win chances', 'Dan: reads the expectations through (the top level is nearly perfect)'],
    zh: ['入门：凭运气走', '初级～中级：会考虑花格和吃子', '高级：权衡风险与胜率', '段位：算尽期望值（最强接近最佳）'],
    ko: ['입문: 운에 맡겨 둔다', '초급~중급: 로제트와 잡기를 생각한다', '상급: 위험과 승률을 읽는다', '유단: 기댓값을 끝까지 읽는다(최강은 거의 최선)'],
    es: ['Principiante: mueve al azar', 'Inicial a intermedio: piensa en rosetas y capturas', 'Avanzado: sopesa riesgos y probabilidades', 'Dan: calcula las esperanzas (el máximo es casi perfecto)'],
    fr: ['Débutant : joue au hasard', 'Novice à intermédiaire : pense aux rosaces et aux prises', 'Avancé : pèse risques et chances', 'Dan : calcule les espérances (le sommet est presque parfait)'],
    pt: ['Iniciante: joga ao acaso', 'Básico a intermediário: pensa em rosetas e capturas', 'Avançado: pesa riscos e chances', 'Dan: calcula as expectativas (o topo é quase perfeito)'],
    de: ['Einsteiger: zieht nach Glück', 'Anfänger bis Mittel: denkt an Rosetten und Schlagen', 'Fortgeschritten: wägt Risiko und Chancen ab', 'Dan: rechnet die Erwartung durch (die Spitze ist fast perfekt)'],
    hi: ['शुरुआती: किस्मत से चलता है', 'नौसिखिया से मध्यम: रोज़ेट और पकड़ के बारे में सोचता है', 'उन्नत: जोखिम और संभावना तौलता है', 'दान: अपेक्षाएँ पूरी गणना करता है (सबसे ऊपर लगभग सर्वोत्तम)'],
    ar: ['مبتدئ: يتحرك بالحظ', 'مبتدئ إلى متوسط: يفكر في الورود والأسر', 'متقدم: يوازن المخاطر والفرص', 'دان: يحسب التوقعات حتى النهاية (الأقوى شبه مثالي)'],
  };
  const WHO = {
    ja: ['はじめて', 'ルールを覚えた人', '何局か遊んだ人', '慣れた人', '強い人', '上級者', '達人'],
    en: ['First game', 'Knows the rules', 'Has played a few games', 'Regular player', 'Strong player', 'Expert', 'Master'],
    zh: ['第一次玩', '刚学会规则', '玩过几局', '熟练玩家', '强手', '高手', '大师'],
    ko: ['처음', '규칙을 익힌 사람', '몇 판 둬 본 사람', '익숙한 사람', '강한 사람', '고수', '달인'],
    es: ['Primera partida', 'Conoce las reglas', 'Ha jugado algunas partidas', 'Jugador habitual', 'Jugador fuerte', 'Experto', 'Maestro'],
    fr: ['Première partie', 'Connaît les règles', 'A joué quelques parties', 'Joueur régulier', 'Joueur fort', 'Expert', 'Maître'],
    pt: ['Primeira partida', 'Conhece as regras', 'Já jogou algumas partidas', 'Jogador habitual', 'Jogador forte', 'Especialista', 'Mestre'],
    de: ['Erste Partie', 'Kennt die Regeln', 'Hat ein paar Partien gespielt', 'Geübter Spieler', 'Starker Spieler', 'Experte', 'Meister'],
    hi: ['पहला खेल', 'नियम जानता है', 'कुछ खेल खेले हैं', 'नियमित खिलाड़ी', 'मज़बूत खिलाड़ी', 'विशेषज्ञ', 'उस्ताद'],
    ar: ['أول مباراة', 'يعرف القواعد', 'لعب بضع مباريات', 'لاعب معتاد', 'لاعب قوي', 'خبير', 'أستاذ'],
  };
  // the game's measured rating of each AI level (ur/app.js RT_LV)
  const RATING = [0, 600, 660, 715, 725, 735, 800, 865, 930, 990, 1070, 1155, 1240, 1325, 1375, 1430, 1485, 1535, 1550, 1570, 1610];
  function levelInfo(n, lang) {
    const name = n <= 15 ? (KYU[lang] || KYU.en).replace('{n}', 16 - n) : (DAN[lang] || DAN.en)[n - 16];
    const d = LVD[lang] || LVD.en, w = WHO[lang] || WHO.en;
    return { name, desc: d[n <= 4 ? 0 : n <= 9 ? 1 : n <= 15 ? 2 : 3], rating: RATING[n], who: w[n <= 2 ? 0 : n <= 5 ? 1 : n <= 8 ? 2 : n <= 11 ? 3 : n <= 15 ? 4 : n <= 18 ? 5 : 6] };
  }
  window.Atlas3D = window.Atlas3D || {};
  // table: false — no chabudai game; the card's Play opens the full 3D game (ur/?skin=atlas)
  window.Atlas3D.ur = { levels: 20, sides: true, modes: ['ai', 'rated', 'pvp'], table: false, levelInfo };
})();
