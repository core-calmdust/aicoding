/* =====================================================================
   Backgammon on the portal: the board card (levels, modes). Start opens the
   full game with the portal skin (backgammon/?skin=atlas), so there is no
   in-portal play loop here — just what the card needs. Level names and
   descriptions come from the game (backgammon/i18n.js 'lv' / 'lvd'). Who starts
   is decided by the opening roll, so there is no side to pick; no rated mode.
   ===================================================================== */
(function () {
  'use strict';
  const LVN = {"ja":[["入門","初級","初級+","中級","中級+","上級","上級+","達人","名人","最強"],["でたらめに動かす","大きな見落としが多い","ときどき見落とす","少しミスをする","小さなミス","まれに小さなミス","ニューラルネットの最善手","相手の全ダイスを1手読む","2手読み","2手読み（広く深く）・キューブも最強"]],"en":[["Beginner","Novice","Novice+","Intermediate","Intermediate+","Advanced","Advanced+","Expert","Master","Strongest"],["moves at random","makes big mistakes","misses things now and then","makes some errors","small errors","rare small slips","neural-net best play","looks at every reply roll","2-ply search","wide 2-ply search, strongest cube"]],"zh":[["入门","初级","初级+","中级","中级+","高级","高级+","达人","名人","最强"],["随机走子","经常大失误","偶尔漏看","有些失误","小失误","偶有小失误","神经网络最佳着","考虑对手每种骰子","2层搜索","宽幅2层搜索・最强加倍判断"]],"ko":[["입문","초급","초급+","중급","중급+","상급","상급+","달인","명인","최강"],["무작위로 움직임","큰 실수가 많음","가끔 놓침","약간 실수함","작은 실수","드물게 작은 실수","신경망 최선수","상대의 모든 주사위를 읽음","2수 탐색","넓은 2수 탐색・최강 큐브 판단"]],"es":[["Principiante","Novato","Novato+","Intermedio","Intermedio+","Avanzado","Avanzado+","Experto","Maestro","Máximo"],["mueve al azar","comete grandes errores","a veces se le escapa algo","comete algunos errores","pequeños errores","rara vez se equivoca","mejor jugada de la red neuronal","mira todas las tiradas de respuesta","búsqueda a 2 niveles","búsqueda amplia a 2 niveles, mejor cubo"]],"fr":[["Débutant","Novice","Novice+","Intermédiaire","Intermédiaire+","Avancé","Avancé+","Expert","Maître","Maximum"],["joue au hasard","grosses erreurs","rate des choses parfois","quelques erreurs","petites erreurs","rares petites erreurs","meilleur coup du réseau neuronal","examine chaque lancer adverse","recherche à 2 niveaux","recherche large à 2 niveaux, meilleur videau"]],"pt":[["Iniciante","Novato","Novato+","Intermediário","Intermediário+","Avançado","Avançado+","Especialista","Mestre","Máximo"],["joga ao acaso","comete erros grandes","às vezes deixa passar","comete alguns erros","erros pequenos","raros erros pequenos","melhor lance da rede neural","considera cada rolagem de resposta","busca de 2 níveis","busca ampla de 2 níveis, melhor cubo"]],"de":[["Einsteiger","Anfänger","Anfänger+","Mittel","Mittel+","Fortgeschritten","Fortgeschritten+","Experte","Meister","Stärkste"],["zieht zufällig","macht grobe Fehler","übersieht manchmal etwas","macht einige Fehler","kleine Fehler","seltene kleine Fehler","bester Zug des neuronalen Netzes","prüft jeden Antwortwurf","2-Ply-Suche","breite 2-Ply-Suche, stärkster Würfel"]],"hi":[["शुरुआती","नौसिखिया","नौसिखिया+","मध्यम","मध्यम+","उन्नत","उन्नत+","विशेषज्ञ","मास्टर","सबसे मज़बूत"],["बेतरतीब चलता है","बड़ी गलतियाँ करता है","कभी-कभी चूक जाता है","कुछ गलतियाँ","छोटी गलतियाँ","कभी-कभार छोटी गलती","न्यूरल नेट की सर्वश्रेष्ठ चाल","हर जवाबी पासे को देखता है","2-स्तरीय खोज","चौड़ी 2-स्तरीय खोज, सबसे मज़बूत क्यूब"]],"ar":[["مبتدئ","مستجد","مستجد+","متوسط","متوسط+","متقدم","متقدم+","خبير","أستاذ","الأقوى"],["يتحرك عشوائيًا","يرتكب أخطاء كبيرة","يفوته شيء أحيانًا","يرتكب بعض الأخطاء","أخطاء صغيرة","أخطاء صغيرة نادرة","أفضل نقلة للشبكة العصبية","يفحص كل رمية رد","بحث بمستويين","بحث واسع بمستويين وأقوى قرار مكعب"]]};
  const W = (a, b, c, d, e) => [a, a, b, b, c, c, d, d, e, e];
  const WHO = {
    ja: W('はじめての人に', 'ルールを覚えた人に', '少し慣れてきた人に', '上級者に', '最強レベル'),
    en: W('for first-timers', 'once you know the rules', 'getting the hang of it', 'for strong players', 'the very strongest'),
    zh: W('适合初次玩', '适合学会规则的人', '适合渐渐上手', '适合高手', '最强等级'),
    ko: W('처음 하는 사람에게', '규칙을 익힌 사람에게', '조금 익숙해진 사람에게', '상급자에게', '최강 레벨'),
    es: W('para principiantes', 'si ya sabes las reglas', 'si ya le vas pillando el truco', 'para jugadores fuertes', 'el más fuerte'),
    fr: W('pour débuter', 'si tu connais les règles', 'si tu prends le coup de main', 'pour les bons joueurs', 'le plus fort'),
    pt: W('para iniciantes', 'para quem já sabe as regras', 'para quem está pegando o jeito', 'para jogadores fortes', 'o mais forte'),
    de: W('für Einsteiger', 'wenn du die Regeln kennst', 'wenn du den Dreh raus hast', 'für starke Spieler', 'die stärkste Stufe'),
    hi: W('पहली बार खेलने वालों के लिए', 'नियम सीख चुके लोगों के लिए', 'जिन्हें आदत हो रही है उनके लिए', 'मज़बूत खिलाड़ियों के लिए', 'सबसे मज़बूत स्तर'),
    ar: W('لمن يلعب أول مرة', 'لمن تعلّم القواعد', 'لمن بدأ يعتاد اللعب', 'للاعبين الأقوياء', 'أقوى مستوى'),
  };
  function levelInfo(n, lang) {   // n = 1..10 (the game's level)
    const L = LVN[lang] || LVN.en, Wh = WHO[lang] || WHO.en;
    return { name: L[0][n - 1], desc: L[1][n - 1], who: Wh[n - 1] };
  }
  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.backgammon = { levels: 10, sides: false, modes: ['ai', 'pvp'], levelInfo, start() { return { stop() {} }; } };
})();
