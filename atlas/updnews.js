/* =====================================================================
   すべての更新 (the updates sheet, atlas/app.js openUpdSheet) — news extras
   • FACTS  'MM-DD' → one short "what was this day?" line in all 10 languages,
            shown under each date header. Only well-established, checkable facts;
            each entry keeps its source. A date without an entry simply shows no line —
            add one whenever a new date appears in shared/atlas.js UPDATES.
   • LABEL  the small caption in front of the line
   • TAGS   labels for the tags derived from each changelog line (rules in app.js updTags)
   ===================================================================== */
(function () {
  'use strict';
  const FACTS = {
    // あかりの日: Edison's incandescent lamp test succeeded on 21 Oct 1879 — bestcalendar.jp/dates/kinenbi/4355, precious.jp/articles/-/63542
    '10-21': {
      ja: '「あかりの日」。1879年のこの日、エジソンが白熱電球の点灯実験に成功したことにちなむ記念日です。',
      en: 'Japan\'s "Day of Light": on this day in 1879, Edison\'s incandescent lamp test lit up successfully.',
      zh: '日本的“灯光之日”：1879年的这一天，爱迪生的白炽灯点亮实验获得成功。',
      ko: '일본의 \'빛의 날\'. 1879년 오늘, 에디슨의 백열전구 점등 실험이 성공했어요.',
      es: '«Día de la Luz» en Japón: tal día como hoy de 1879, la lámpara incandescente de Edison se encendió con éxito.',
      fr: '« Journée de la lumière » au Japon : ce jour de 1879, la lampe à incandescence d\'Edison s\'allumait avec succès.',
      pt: '«Dia da Luz» no Japão: neste dia, em 1879, a lâmpada incandescente de Edison acendeu com sucesso.',
      de: 'Japans „Tag des Lichts“: An diesem Tag im Jahr 1879 leuchtete Edisons Glühlampe im Test erfolgreich auf.',
      hi: 'जापान का "प्रकाश दिवस": 1879 में आज ही के दिन एडिसन का तापदीप्त बल्ब परीक्षण में सफलतापूर्वक जला था।',
      ar: '«يوم الضوء» في اليابان: في مثل هذا اليوم من عام 1879 أضاء مصباح إديسون المتوهّج بنجاح في التجربة.' },
    // first xerographic copy "10-22-38 ASTORIA", 22 Oct 1938 — aps.org/apsnews/2003/10/october-1938-invention-xerography, thehenryford.org/collections/explore/articles/xerox
    '10-22': {
      ja: '1938年のこの日、カールソンが世界初の電子写真（コピー機の原理）で「10-22-38 ASTORIA」の文字を写しました。',
      en: 'On this day in 1938, Chester Carlson made the first xerographic copy — "10-22-38 ASTORIA". The photocopier was born.',
      zh: '1938年的这一天，卡尔森用静电复印术复印出第一份文字“10-22-38 ASTORIA”——复印机由此诞生。',
      ko: '1938년 오늘, 칼슨이 최초의 제로그래피 복사로 \'10-22-38 ASTORIA\'를 찍어 냈어요. 복사기의 시작이에요.',
      es: 'Tal día como hoy de 1938, Chester Carlson hizo la primera copia xerográfica: «10-22-38 ASTORIA». Así nació la fotocopiadora.',
      fr: 'Ce jour de 1938, Chester Carlson réalisait la première copie xérographique : « 10-22-38 ASTORIA ». La photocopieuse était née.',
      pt: 'Neste dia, em 1938, Chester Carlson fez a primeira cópia xerográfica: «10-22-38 ASTORIA». Nascia a fotocopiadora.',
      de: 'An diesem Tag im Jahr 1938 fertigte Chester Carlson die erste xerografische Kopie an: „10-22-38 ASTORIA“. Die Geburtsstunde des Kopierers.',
      hi: '1938 में आज ही के दिन चेस्टर कार्लसन ने पहली ज़ेरोग्राफ़िक कॉपी बनाई — "10-22-38 ASTORIA"। यहीं से फ़ोटोकॉपी मशीन की शुरुआत हुई।',
      ar: 'في مثل هذا اليوم من عام 1938 صنع تشستر كارلسون أول نسخة بالتصوير الجاف: «10-22-38 ASTORIA». هكذا وُلدت آلة النسخ.' },
    // United Nations Day: the UN Charter entered into force on 24 Oct 1945 — un.org (UN Day)
    '10-24': {
      ja: '「国連デー」。1945年のこの日、国際連合憲章が発効し、国連が正式に発足しました。',
      en: 'United Nations Day: the UN Charter came into force on this day in 1945, officially founding the UN.',
      zh: '联合国日：1945年的这一天，《联合国宪章》生效，联合国正式成立。',
      ko: '유엔의 날. 1945년 오늘 유엔 헌장이 발효되어 국제연합이 정식으로 출범했어요.',
      es: 'Día de las Naciones Unidas: tal día como hoy de 1945 entró en vigor la Carta de la ONU y nació oficialmente la organización.',
      fr: 'Journée des Nations unies : ce jour de 1945, la Charte des Nations unies entrait en vigueur, fondant officiellement l\'ONU.',
      pt: 'Dia das Nações Unidas: neste dia, em 1945, a Carta da ONU entrou em vigor e a organização nasceu oficialmente.',
      de: 'Tag der Vereinten Nationen: An diesem Tag im Jahr 1945 trat die UN-Charta in Kraft – die UNO war offiziell gegründet.',
      hi: 'संयुक्त राष्ट्र दिवस: 1945 में आज ही के दिन संयुक्त राष्ट्र चार्टर लागू हुआ और संयुक्त राष्ट्र की औपचारिक स्थापना हुई।',
      ar: 'يوم الأمم المتحدة: في مثل هذا اليوم من عام 1945 دخل ميثاق الأمم المتحدة حيّز التنفيذ وتأسست المنظمة رسميًا.' },
    // Pablo Picasso born 25 Oct 1881 in Málaga — sparknotes.com/biography/picasso/timeline, spain.info/picasso-2023
    '10-25': {
      ja: '1881年のこの日、画家パブロ・ピカソがスペインのマラガで生まれました。',
      en: 'Pablo Picasso was born on this day in 1881, in Málaga, Spain.',
      zh: '1881年的这一天，画家巴勃罗·毕加索出生于西班牙马拉加。',
      ko: '1881년 오늘, 화가 파블로 피카소가 스페인 말라가에서 태어났어요.',
      es: 'Tal día como hoy de 1881 nació Pablo Picasso en Málaga.',
      fr: 'Pablo Picasso est né ce jour de 1881, à Malaga, en Espagne.',
      pt: 'Pablo Picasso nasceu neste dia, em 1881, em Málaga, na Espanha.',
      de: 'An diesem Tag im Jahr 1881 wurde Pablo Picasso im spanischen Málaga geboren.',
      hi: '1881 में आज ही के दिन चित्रकार पाब्लो पिकासो का जन्म स्पेन के मालागा में हुआ था।',
      ar: 'في مثل هذا اليوم من عام 1881 وُلد الرسّام بابلو بيكاسو في مالقة بإسبانيا.' },
    // Statue of Liberty dedicated 28 Oct 1886 — history.com/this-day-in-history/October-28/statue-of-liberty-dedicated
    '10-28': {
      ja: '1886年のこの日、ニューヨークで自由の女神像の除幕式が行われました。フランスからアメリカへの贈り物です。',
      en: 'The Statue of Liberty, a gift from France to the United States, was dedicated in New York on this day in 1886.',
      zh: '1886年的这一天，法国赠送给美国的自由女神像在纽约举行了揭幕仪式。',
      ko: '1886년 오늘, 프랑스가 미국에 선물한 자유의 여신상 제막식이 뉴욕에서 열렸어요.',
      es: 'Tal día como hoy de 1886 se inauguró en Nueva York la Estatua de la Libertad, un regalo de Francia a Estados Unidos.',
      fr: 'Ce jour de 1886, la statue de la Liberté, offerte par la France aux États-Unis, était inaugurée à New York.',
      pt: 'Neste dia, em 1886, a Estátua da Liberdade, presente da França aos EUA, foi inaugurada em Nova York.',
      de: 'An diesem Tag im Jahr 1886 wurde in New York die Freiheitsstatue eingeweiht – ein Geschenk Frankreichs an die USA.',
      hi: '1886 में आज ही के दिन न्यूयॉर्क में स्टैच्यू ऑफ़ लिबर्टी का अनावरण हुआ — यह फ़्रांस की ओर से अमेरिका को एक उपहार थी।',
      ar: 'في مثل هذا اليوم من عام 1886 أُزيح الستار في نيويورك عن تمثال الحرية، هدية فرنسا إلى الولايات المتحدة.' },
    // first ARPANET message UCLA→SRI, 29 Oct 1969: "LOGIN" crashed after "LO" — historyofinformation.com/detail.php?id=882, livescience.com (science history, Oct 29 1969)
    '10-29': {
      ja: '1969年のこの日、インターネットの祖先ARPANETで初のメッセージが送られました。「LOGIN」のはずが、届いたのは「LO」だけ。',
      en: 'On this day in 1969, ARPANET — the internet\'s ancestor — sent its first message. It was meant to be "LOGIN", but only "LO" got through.',
      zh: '1969年的这一天，互联网的前身ARPANET发出了第一条消息。本想发送“LOGIN”，却只传过去了“LO”。',
      ko: '1969년 오늘, 인터넷의 조상 ARPANET으로 첫 메시지가 전송됐어요. \'LOGIN\'을 보내려 했지만 \'LO\'까지만 도착했죠.',
      es: 'Tal día como hoy de 1969, ARPANET, antecesora de internet, envió su primer mensaje. Iba a ser «LOGIN», pero solo llegó «LO».',
      fr: 'Ce jour de 1969, l\'ARPANET, ancêtre d\'Internet, transmettait son premier message. Il devait dire « LOGIN », mais seul « LO » est passé.',
      pt: 'Neste dia, em 1969, a ARPANET, ancestral da internet, enviou sua primeira mensagem. Era para ser «LOGIN», mas só chegou «LO».',
      de: 'An diesem Tag im Jahr 1969 schickte das ARPANET, der Vorläufer des Internets, seine erste Nachricht. Geplant war „LOGIN“ – an kam nur „LO“.',
      hi: '1969 में आज ही के दिन इंटरनेट के पूर्वज ARPANET पर पहला संदेश भेजा गया। भेजना था "LOGIN", पर पहुँचा सिर्फ़ "LO"।',
      ar: 'في مثل هذا اليوم من عام 1969 أرسلت شبكة ARPANET، سلف الإنترنت، أول رسالة لها. كان يُفترض أن تكون «LOGIN»، لكن لم يصل سوى «LO».' },
    // 犬の日 (Japan): 1 Nov, ワンワンワン pun, set in 1987 by ペットフード協会 — bestcalendar.jp/dates/kinenbi/4474, pref.saitama.lg.jp/b0716/doubutu-inunohi1.html
    '11-01': {
      ja: '日本では「犬の日」。ワン（1）ワン（1）ワン（1）の語呂合わせで、1987年に制定されました。',
      en: 'In Japan it\'s Dog Day: 1-1-1 read as "one, one, one" sounds like "wan wan wan", the Japanese "woof woof woof". Set up in 1987.',
      zh: '日本的“狗狗日”：1·1·1读作英语“one one one”，谐音日语狗叫“汪汪汪（wan wan wan）”。1987年设立。',
      ko: '일본에서는 \'개의 날\'. 1·1·1을 영어 \'one\'으로 읽으면 일본어 개 짖는 소리 \'왕왕왕\'과 같아서, 1987년에 제정됐어요.',
      es: 'En Japón es el Día del Perro: 1-1-1 se lee «one, one, one», como «wan wan wan», el «guau guau» japonés. Se creó en 1987.',
      fr: 'Au Japon, c\'est la Journée du chien : 1-1-1 se lit « one, one, one », comme « wan wan wan », le « ouaf ouaf » japonais. Créée en 1987.',
      pt: 'No Japão é o Dia do Cachorro: 1-1-1 se lê «one, one, one», como «wan wan wan», o «au au» japonês. Criado em 1987.',
      de: 'In Japan ist Hundetag: 1-1-1 klingt wie „one, one, one“ – „wan wan wan“, das japanische „Wau wau“. Eingeführt 1987.',
      hi: 'जापान में आज "कुत्ता दिवस" है: 1-1-1 को "वन, वन, वन" पढ़ें तो यह जापानी में कुत्ते की "वान वान वान" (भौं-भौं) जैसा लगता है। 1987 में शुरू हुआ।',
      ar: 'في اليابان هو «يوم الكلب»: يُقرأ 1-1-1 «وَن وَن وَن»، مثل «وان وان وان»، نباح الكلب باليابانية. أُقرّ عام 1987.' },
    // Howard Carter found the first step to Tutankhamun's tomb, 4 Nov 1922 — history.com/this-day-in-history/November-4/entrance-to-king-tuts-tomb-discovered, en.wikipedia.org/wiki/Howard_Carter
    '11-04': {
      ja: '1922年のこの日、エジプトでハワード・カーターがツタンカーメン王墓へ続く階段の最初の一段を発見しました。',
      en: 'On this day in 1922, Howard Carter found the first step leading down to Tutankhamun\'s tomb in Egypt.',
      zh: '1922年的这一天，霍华德·卡特在埃及发现了通往图坦卡蒙墓的第一级台阶。',
      ko: '1922년 오늘, 하워드 카터가 이집트에서 투탕카멘 왕묘로 이어지는 계단의 첫 단을 발견했어요.',
      es: 'Tal día como hoy de 1922, Howard Carter halló en Egipto el primer escalón que bajaba a la tumba de Tutankamón.',
      fr: 'Ce jour de 1922, Howard Carter découvrait en Égypte la première marche menant au tombeau de Toutânkhamon.',
      pt: 'Neste dia, em 1922, Howard Carter encontrou no Egito o primeiro degrau que levava ao túmulo de Tutancâmon.',
      de: 'An diesem Tag im Jahr 1922 entdeckte Howard Carter in Ägypten die erste Stufe hinab zum Grab des Tutanchamun.',
      hi: '1922 में आज ही के दिन हॉवर्ड कार्टर ने मिस्र में तूतनख़ामुन की क़ब्र तक जाने वाली पहली सीढ़ी खोजी थी।',
      ar: 'في مثل هذا اليوم من عام 1922 عثر هوارد كارتر في مصر على أول درجة تقود إلى مقبرة توت عنخ آمون.' },
    // Guy Fawkes Night, 5 Nov: bonfires & fireworks for the foiled Gunpowder Plot of 1605 — learnenglish.britishcouncil.org (Bonfire Night), newworldencyclopedia.org/entry/Guy_Fawkes_Night
    '11-05': {
      ja: 'イギリスの「ガイ・フォークス・ナイト」。1605年の火薬陰謀事件にちなみ、各地で焚き火と花火が上がります。',
      en: 'Guy Fawkes Night in Britain: bonfires and fireworks recall the foiled Gunpowder Plot of 1605.',
      zh: '英国的“盖伊·福克斯之夜”：人们燃起篝火、放烟花，纪念1605年被挫败的火药阴谋。',
      ko: '영국의 \'가이 포크스 나이트\'. 1605년 화약 음모 사건에서 유래해, 곳곳에서 모닥불과 불꽃놀이를 즐겨요.',
      es: 'Noche de Guy Fawkes en el Reino Unido: hogueras y fuegos artificiales recuerdan la fallida Conspiración de la Pólvora de 1605.',
      fr: 'Guy Fawkes Night au Royaume-Uni : feux de joie et feux d\'artifice rappellent la Conspiration des poudres déjouée en 1605.',
      pt: 'Noite de Guy Fawkes no Reino Unido: fogueiras e fogos de artifício lembram a frustrada Conspiração da Pólvora de 1605.',
      de: 'Guy Fawkes Night in Großbritannien: Freudenfeuer und Feuerwerk erinnern an die vereitelte Pulververschwörung von 1605.',
      hi: 'ब्रिटेन में "गाय फ़ॉक्स नाइट": 1605 के विफल बारूद षड्यंत्र की याद में अलाव जलते हैं और आतिशबाज़ी होती है।',
      ar: '«ليلة غاي فوكس» في بريطانيا: نيران المخيّمات والألعاب النارية تُحيي ذكرى إحباط مؤامرة البارود عام 1605.' },
    // James Naismith, inventor of basketball, born 6 Nov 1861 — britannica.com/biography/James-Naismith, kansashistory.gov/kansapedia/james-naismith/12154
    '11-06': {
      ja: '1861年のこの日、バスケットボールを考案したジェームズ・ネイスミスが生まれました。',
      en: 'James Naismith, who invented basketball, was born on this day in 1861.',
      zh: '1861年的这一天，篮球的发明者詹姆斯·奈史密斯出生。',
      ko: '1861년 오늘, 농구를 고안한 제임스 네이스미스가 태어났어요.',
      es: 'Tal día como hoy de 1861 nació James Naismith, el inventor del baloncesto.',
      fr: 'James Naismith, l\'inventeur du basket-ball, est né ce jour de 1861.',
      pt: 'James Naismith, o inventor do basquete, nasceu neste dia, em 1861.',
      de: 'An diesem Tag im Jahr 1861 wurde James Naismith geboren, der Erfinder des Basketballs.',
      hi: '1861 में आज ही के दिन बास्केटबॉल के आविष्कारक जेम्स नाइस्मिथ का जन्म हुआ था।',
      ar: 'في مثل هذا اليوم من عام 1861 وُلد جيمس نايسميث، مخترع كرة السلة.' },
  };
  const LABEL = { ja: 'この日は？', en: 'On this day', zh: '这一天', ko: '이날은', es: 'Un día como hoy', fr: 'Ce jour-là', pt: 'Neste dia', de: 'An diesem Tag', hi: 'इस दिन', ar: 'في مثل هذا اليوم' };
  const TAGS = {
    new: { ja: '新作', en: 'New game', zh: '新作', ko: '신작', es: 'Nuevo juego', fr: 'Nouveau jeu', pt: 'Novo jogo', de: 'Neues Spiel', hi: 'नया गेम', ar: 'لعبة جديدة' },
    '3d': { ja: '3D', en: '3D', zh: '3D', ko: '3D', es: '3D', fr: '3D', pt: '3D', de: '3D', hi: '3D', ar: '3D' },
    online: { ja: 'オンライン', en: 'Online', zh: '在线', ko: '온라인', es: 'En línea', fr: 'En ligne', pt: 'Online', de: 'Online', hi: 'ऑनलाइन', ar: 'عبر الإنترنت' },
    rules: { ja: 'ルール', en: 'Rules', zh: '规则', ko: '규칙', es: 'Reglas', fr: 'Règles', pt: 'Regras', de: 'Regeln', hi: 'नियम', ar: 'القواعد' },
  };
  window.AtlasNews = { FACTS, LABEL, TAGS };
})();
