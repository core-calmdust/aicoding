/* だつごくスライダー！ — texts for the 200-inmate / 50-floor / 50-frame locker (2026-10-28). 10 languages; wins over earlier files. */
(function () {
'use strict';
const I = window.JB_I18N = window.JB_I18N || {};
const add = (l, o) => { I[l] = Object.assign(I[l] || {}, o); };
add('ja', { 'g.time': 'タイム', 'bk.f': 'フレーム', 'pf.frame': '盤のフレーム', 'ach.col50': '囚人を50人あつめる', 'ach.col100': '囚人を100人あつめる',
  'ga.rate': 'N 55% ／ R 30% ／ SR 12% ／ SSR 3%。10回なら10個目はSR以上。中身は囚人200人・床のデザイン50種・盤のフレーム50種。' });
add('en', { 'g.time': 'Time', 'bk.f': 'Frames', 'pf.frame': 'Board frame', 'ach.col50': 'Collect 50 inmates', 'ach.col100': 'Collect 100 inmates',
  'ga.rate': 'N 55% / R 30% / SR 12% / SSR 3%. In a 10-pull the 10th is SR or better. Inside: 200 inmates, 50 floor designs and 50 board frames.' });
add('zh', { 'g.time': '用时', 'bk.f': '边框', 'pf.frame': '棋盘边框', 'ach.col50': '收集50个囚犯', 'ach.col100': '收集100个囚犯',
  'ga.rate': 'N 55% ／ R 30% ／ SR 12% ／ SSR 3%。10连的第10个保底SR以上。内容：囚犯200人、地板样式50种、棋盘边框50种。' });
add('ko', { 'g.time': '타임', 'bk.f': '프레임', 'pf.frame': '보드 프레임', 'ach.col50': '죄수 50명 모으기', 'ach.col100': '죄수 100명 모으기',
  'ga.rate': 'N 55% ／ R 30% ／ SR 12% ／ SSR 3%. 10회 뽑기의 10번째는 SR 이상. 내용물: 죄수 200명, 바닥 디자인 50종, 보드 프레임 50종.' });
add('es', { 'g.time': 'Tiempo', 'bk.f': 'Marcos', 'pf.frame': 'Marco del tablero', 'ach.col50': 'Reúne 50 presos', 'ach.col100': 'Reúne 100 presos',
  'ga.rate': 'N 55% / R 30% / SR 12% / SSR 3%. En una tirada de 10, la 10.ª es SR o mejor. Dentro: 200 presos, 50 suelos y 50 marcos de tablero.' });
add('fr', { 'g.time': 'Temps', 'bk.f': 'Cadres', 'pf.frame': 'Cadre du plateau', 'ach.col50': 'Réunis 50 détenus', 'ach.col100': 'Réunis 100 détenus',
  'ga.rate': 'N 55 % / R 30 % / SR 12 % / SSR 3 %. Sur 10 tirages, le 10e est SR ou mieux. Dedans : 200 détenus, 50 sols et 50 cadres de plateau.' });
add('pt', { 'g.time': 'Tempo', 'bk.f': 'Molduras', 'pf.frame': 'Moldura do tabuleiro', 'ach.col50': 'Junte 50 detentos', 'ach.col100': 'Junte 100 detentos',
  'ga.rate': 'N 55% / R 30% / SR 12% / SSR 3%. Num giro de 10, o 10º é SR ou melhor. Dentro: 200 detentos, 50 pisos e 50 molduras de tabuleiro.' });
add('de', { 'g.time': 'Zeit', 'bk.f': 'Rahmen', 'pf.frame': 'Brettrahmen', 'ach.col50': '50 Häftlinge sammeln', 'ach.col100': '100 Häftlinge sammeln',
  'ga.rate': 'N 55 % / R 30 % / SR 12 % / SSR 3 %. Beim 10er-Zug ist der 10. mindestens SR. Inhalt: 200 Häftlinge, 50 Böden und 50 Brettrahmen.' });
add('hi', { 'g.time': 'समय', 'bk.f': 'फ़्रेम', 'pf.frame': 'बोर्ड का फ़्रेम', 'ach.col50': '50 क़ैदी जमा करो', 'ach.col100': '100 क़ैदी जमा करो',
  'ga.rate': 'N 55% / R 30% / SR 12% / SSR 3%। 10 बार खींचने पर 10वाँ SR या बेहतर। अंदर: 200 क़ैदी, 50 फ़र्श डिज़ाइन और 50 बोर्ड फ़्रेम।' });
add('ar', { 'g.time': 'الوقت', 'bk.f': 'الإطارات', 'pf.frame': 'إطار اللوح', 'ach.col50': 'اجمع 50 سجينًا', 'ach.col100': 'اجمع 100 سجين',
  'ga.rate': 'N 55% / R 30% / SR 12% / SSR 3%. في سحب 10 مرات يكون العاشر SR أو أفضل. في الداخل: 200 سجين و50 تصميم أرضية و50 إطارًا للوح.' });
})();
