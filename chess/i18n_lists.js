// Lesson / opening list strings (category sub-tabs, group explanations, progress). Loaded after i18n_v2.js and merged into window.I18N.
(function () {
const S = {
ja: {
  'lx.prog': '{n}/{m} クリア', 'lx.tab.e4': '1.e4', 'lx.tab.d4': '1.d4', 'lx.tab.other': 'そのほか',
  'lx.grp.e4.d': 'キングの前のポーンを2マス進める、いちばん人気の初手。駒が早く働き、攻め合いになりやすい「開いた」戦いが多くなります。',
  'lx.grp.d4.d': 'クイーンの前のポーンから始める初手。ポーンががっちり組み合う「閉じた」形になりやすく、じっくり陣形を整える戦略的な戦いです。',
  'lx.grp.other.d': '1.e4・1.d4 以外の初手。すぐには中央を取りに行かず、相手の出方を見てから形を決める柔軟な戦い方です。',
},
en: {
  'lx.prog': '{n}/{m} cleared', 'lx.tab.e4': '1.e4', 'lx.tab.d4': '1.d4', 'lx.tab.other': 'Other',
  'lx.grp.e4.d': 'The most popular first move: the king’s pawn goes two squares. Pieces come out fast, and games tend to be open and tactical.',
  'lx.grp.d4.d': 'Starting with the queen’s pawn. The pawns often lock together into closed positions, leading to slower, strategic games.',
  'lx.grp.other.d': 'First moves other than 1.e4 and 1.d4. Flexible systems that don’t grab the centre at once and choose a setup after seeing the opponent’s reply.',
},
zh: {
  'lx.prog': '已完成 {n}/{m}', 'lx.tab.e4': '1.e4', 'lx.tab.d4': '1.d4', 'lx.tab.other': '其他',
  'lx.grp.e4.d': '最受欢迎的第一步：王前兵前进两格。子力出动快，常形成对攻激烈的“开放性”局面。',
  'lx.grp.d4.d': '从后前兵开始。双方兵链容易互相卡住，形成“封闭性”局面，是慢慢布阵的战略型对局。',
  'lx.grp.other.d': '1.e4 和 1.d4 以外的第一步。不急于占领中心，先看对手的应法再决定阵型，灵活多变。',
},
ko: {
  'lx.prog': '{n}/{m} 클리어', 'lx.tab.e4': '1.e4', 'lx.tab.d4': '1.d4', 'lx.tab.other': '기타',
  'lx.grp.e4.d': '가장 인기 있는 첫 수: 킹 앞의 폰을 두 칸 전진. 기물이 빨리 나오고, 서로 공격하는 ‘열린’ 대국이 되기 쉽습니다.',
  'lx.grp.d4.d': '퀸 앞의 폰으로 시작하는 첫 수. 폰끼리 단단히 맞물린 ‘닫힌’ 형태가 되기 쉬워, 차분히 진형을 갖추는 전략적인 싸움이 됩니다.',
  'lx.grp.other.d': '1.e4・1.d4 이외의 첫 수. 바로 중앙을 차지하지 않고, 상대의 응수를 본 뒤 형태를 정하는 유연한 전법입니다.',
},
es: {
  'lx.prog': '{n}/{m} superadas', 'lx.tab.e4': '1.e4', 'lx.tab.d4': '1.d4', 'lx.tab.other': 'Otras',
  'lx.grp.e4.d': 'La primera jugada más popular: el peón de rey avanza dos casillas. Las piezas salen rápido y las partidas suelen ser abiertas y tácticas.',
  'lx.grp.d4.d': 'Se empieza con el peón de dama. Los peones suelen bloquearse en posiciones cerradas, con partidas más lentas y estratégicas.',
  'lx.grp.other.d': 'Primeras jugadas distintas de 1.e4 y 1.d4. Sistemas flexibles que no ocupan el centro enseguida y eligen su plan según la respuesta rival.',
},
fr: {
  'lx.prog': '{n}/{m} réussies', 'lx.tab.e4': '1.e4', 'lx.tab.d4': '1.d4', 'lx.tab.other': 'Autres',
  'lx.grp.e4.d': 'Le premier coup le plus populaire : le pion du roi avance de deux cases. Les pièces sortent vite et les parties sont souvent ouvertes et tactiques.',
  'lx.grp.d4.d': 'On commence par le pion de la dame. Les pions se bloquent souvent en positions fermées : des parties plus lentes et stratégiques.',
  'lx.grp.other.d': 'Les premiers coups autres que 1.e4 et 1.d4. Des systèmes souples qui n’occupent pas tout de suite le centre et s’adaptent à la réponse adverse.',
},
pt: {
  'lx.prog': '{n}/{m} concluídas', 'lx.tab.e4': '1.e4', 'lx.tab.d4': '1.d4', 'lx.tab.other': 'Outras',
  'lx.grp.e4.d': 'O primeiro lance mais popular: o peão do rei avança duas casas. As peças saem rápido e as partidas costumam ser abertas e táticas.',
  'lx.grp.d4.d': 'Começa com o peão da dama. Os peões costumam travar em posições fechadas, com partidas mais lentas e estratégicas.',
  'lx.grp.other.d': 'Primeiros lances diferentes de 1.e4 e 1.d4. Sistemas flexíveis que não ocupam o centro de imediato e escolhem o plano conforme a resposta do rival.',
},
de: {
  'lx.prog': '{n}/{m} geschafft', 'lx.tab.e4': '1.e4', 'lx.tab.d4': '1.d4', 'lx.tab.other': 'Andere',
  'lx.grp.e4.d': 'Der beliebteste erste Zug: Der Königsbauer zieht zwei Felder. Die Figuren kommen schnell ins Spiel, die Partien werden oft offen und taktisch.',
  'lx.grp.d4.d': 'Start mit dem Damenbauern. Die Bauern verkeilen sich oft zu geschlossenen Stellungen – ruhigere, strategische Partien.',
  'lx.grp.other.d': 'Erste Züge außer 1.e4 und 1.d4. Flexible Systeme, die das Zentrum nicht sofort besetzen und ihren Aufbau nach der Antwort des Gegners wählen.',
},
hi: {
  'lx.prog': '{n}/{m} पूरे', 'lx.tab.e4': '1.e4', 'lx.tab.d4': '1.d4', 'lx.tab.other': 'अन्य',
  'lx.grp.e4.d': 'सबसे लोकप्रिय पहली चाल: राजा के आगे का प्यादा दो खाने आगे। मोहरे जल्दी बाहर आते हैं और खेल अक्सर खुला व आक्रामक होता है।',
  'lx.grp.d4.d': 'वज़ीर के आगे के प्यादे से शुरुआत। प्यादे अक्सर आपस में अटककर बंद स्थिति बनाते हैं, जिससे धीमा और रणनीतिक खेल होता है।',
  'lx.grp.other.d': '1.e4 और 1.d4 के अलावा पहली चालें। ये लचीली प्रणालियाँ तुरंत केंद्र नहीं लेतीं, बल्कि विरोधी का जवाब देखकर ढाँचा चुनती हैं।',
},
ar: {
  'lx.prog': '{n}/{m} مكتملة', 'lx.tab.e4': '1.e4', 'lx.tab.d4': '1.d4', 'lx.tab.other': 'أخرى',
  // keep "1.e4" / "1.d4" left-to-right inside Arabic text (U+2066 LRI … U+2069 PDI)
  'op.grp.e4': 'افتتاحيات بعد \u20661.e4\u2069', 'op.grp.d4': 'افتتاحيات بعد \u20661.d4\u2069',
  'lx.grp.e4.d': 'النقلة الأولى الأكثر شعبية: يتقدم بيدق الملك مربعين. تخرج القطع بسرعة، وتكون المباريات غالبًا مفتوحة وتكتيكية.',
  'lx.grp.d4.d': 'البداية ببيدق الوزير. كثيرًا ما تتشابك البيادق في أوضاع مغلقة، فتكون المباريات أبطأ وأكثر استراتيجية.',
  'lx.grp.other.d': 'نقلات أولى غير \u20661.e4\u2069 و\u20661.d4\u2069. أنظمة مرنة لا تحتل المركز فورًا، بل تختار تشكيلها بعد رؤية رد الخصم.',
},
};
for (const l in S) window.I18N[l] = Object.assign(window.I18N[l] || {}, S[l]);
})();
