/* Shanghai (atlas/games/shanghai.js): the texts in the portal's 14 languages — window.SHANGHAI_I18N[key][lang] */
(function () {
  'use strict';
  const L = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
  const D = {};
  const add = (k, ...v) => { D[k] = {}; L.forEach((l, i) => { D[k][l] = v[i] != null ? v[i] : v[1]; }); };
  // the modes
  add('m.free', 'フリー', 'Free play', '自由模式', '自由模式', '프리', 'Libre', 'Libre', 'Livre', 'Frei', 'Свободно', 'Serbest', 'Bebas', 'फ़्री', 'حر');
  add('m.stage', 'ステージ', 'Stages', '关卡', '關卡', '스테이지', 'Etapas', 'Étapes', 'Fases', 'Stufen', 'Этапы', 'Bölümler', 'Tahap', 'स्टेज', 'المراحل');
  // the layouts
  add('lay.petit', 'はじめの一歩', 'First Steps', '第一步', '第一步', '첫걸음', 'Primeros pasos', 'Premiers pas', 'Primeiros passos', 'Erste Schritte', 'Первые шаги', 'İlk Adım', 'Langkah Pertama', 'पहला कदम', 'الخطوة الأولى');
  add('lay.pyramid', 'ピラミッド', 'Pyramid', '金字塔', '金字塔', '피라미드', 'Pirámide', 'Pyramide', 'Pirâmide', 'Pyramide', 'Пирамида', 'Piramit', 'Piramida', 'पिरामिड', 'الهرم');
  add('lay.twin', 'ふたご島', 'Twin Isles', '双子岛', '雙子島', '쌍둥이 섬', 'Islas gemelas', 'Îles jumelles', 'Ilhas gêmeas', 'Zwillingsinseln', 'Острова-близнецы', 'İkiz Adalar', 'Pulau Kembar', 'जुड़वाँ द्वीप', 'الجزيرتان التوأم');
  add('lay.cross', '十字路', 'Crossroads', '十字路', '十字路', '십자로', 'Encrucijada', 'Carrefour', 'Encruzilhada', 'Kreuzweg', 'Перекрёсток', 'Kavşak', 'Persimpangan', 'चौराहा', 'مفترق الطرق');
  add('lay.tower', '塔', 'Tower', '高塔', '高塔', '탑', 'Torre', 'Tour', 'Torre', 'Turm', 'Башня', 'Kule', 'Menara', 'मीनार', 'البرج');
  add('lay.fortress', '城塞', 'Fortress', '城塞', '城塞', '성채', 'Fortaleza', 'Forteresse', 'Fortaleza', 'Festung', 'Крепость', 'Kale', 'Benteng', 'किला', 'الحصن');
  add('lay.bridge', '石橋', 'Stone Bridge', '石桥', '石橋', '돌다리', 'Puente de piedra', 'Pont de pierre', 'Ponte de pedra', 'Steinbrücke', 'Каменный мост', 'Taş Köprü', 'Jembatan Batu', 'पत्थर का पुल', 'الجسر الحجري');
  add('lay.butterfly', '蝶', 'Butterfly', '蝴蝶', '蝴蝶', '나비', 'Mariposa', 'Papillon', 'Borboleta', 'Schmetterling', 'Бабочка', 'Kelebek', 'Kupu-kupu', 'तितली', 'الفراشة');
  add('lay.dragon', '竜', 'Dragon', '龙', '龍', '용', 'Dragón', 'Dragon', 'Dragão', 'Drache', 'Дракон', 'Ejderha', 'Naga', 'ड्रैगन', 'التنين');
  add('lay.turtle', '亀（定番）', 'Turtle (classic)', '乌龟（经典）', '烏龜（經典）', '거북（정석）', 'Tortuga (clásico)', 'Tortue (classique)', 'Tartaruga (clássico)', 'Schildkröte (klassisch)', 'Черепаха (классика)', 'Kaplumbağa (klasik)', 'Kura-kura (klasik)', 'कछुआ (क्लासिक)', 'السلحفاة (كلاسيكي)');
  add('tiles', '{n}枚', '{n} tiles', '{n}张', '{n}張', '{n}개', '{n} fichas', '{n} tuiles', '{n} peças', '{n} Steine', '{n} костей', '{n} taş', '{n} ubin', '{n} टाइलें', '{n} قطعة');
  // the constellations
  add('ar.aries', 'おひつじ座', 'Aries', '白羊座', '白羊座', '양자리', 'Aries', 'Bélier', 'Áries', 'Widder', 'Овен', 'Koç', 'Aries', 'मेष', 'الحمل');
  add('ar.taurus', 'おうし座', 'Taurus', '金牛座', '金牛座', '황소자리', 'Tauro', 'Taureau', 'Touro', 'Stier', 'Телец', 'Boğa', 'Taurus', 'वृषभ', 'الثور');
  add('ar.gemini', 'ふたご座', 'Gemini', '双子座', '雙子座', '쌍둥이자리', 'Géminis', 'Gémeaux', 'Gêmeos', 'Zwillinge', 'Близнецы', 'İkizler', 'Gemini', 'मिथुन', 'الجوزاء');
  add('ar.cancer', 'かに座', 'Cancer', '巨蟹座', '巨蟹座', '게자리', 'Cáncer', 'Cancer', 'Câncer', 'Krebs', 'Рак', 'Yengeç', 'Cancer', 'कर्क', 'السرطان');
  add('ar.leo', 'しし座', 'Leo', '狮子座', '獅子座', '사자자리', 'Leo', 'Lion', 'Leão', 'Löwe', 'Лев', 'Aslan', 'Leo', 'सिंह', 'الأسد');
  add('ar.virgo', 'おとめ座', 'Virgo', '处女座', '處女座', '처녀자리', 'Virgo', 'Vierge', 'Virgem', 'Jungfrau', 'Дева', 'Başak', 'Virgo', 'कन्या', 'العذراء');
  add('ar.libra', 'てんびん座', 'Libra', '天秤座', '天秤座', '천칭자리', 'Libra', 'Balance', 'Libra', 'Waage', 'Весы', 'Terazi', 'Libra', 'तुला', 'الميزان');
  add('ar.scorpius', 'さそり座', 'Scorpius', '天蝎座', '天蠍座', '전갈자리', 'Escorpio', 'Scorpion', 'Escorpião', 'Skorpion', 'Скорпион', 'Akrep', 'Scorpius', 'वृश्चिक', 'العقرب');
  add('ar.sagittarius', 'いて座', 'Sagittarius', '人马座', '人馬座', '궁수자리', 'Sagitario', 'Sagittaire', 'Sagitário', 'Schütze', 'Стрелец', 'Yay', 'Sagittarius', 'धनु', 'القوس');
  add('ar.capricornus', 'やぎ座', 'Capricorn', '摩羯座', '摩羯座', '염소자리', 'Capricornio', 'Capricorne', 'Capricórnio', 'Steinbock', 'Козерог', 'Oğlak', 'Capricorn', 'मकर', 'الجدي');
  add('ar.aquarius', 'みずがめ座', 'Aquarius', '水瓶座', '水瓶座', '물병자리', 'Acuario', 'Verseau', 'Aquário', 'Wassermann', 'Водолей', 'Kova', 'Aquarius', 'कुंभ', 'الدلو');
  add('ar.pisces', 'うお座', 'Pisces', '双鱼座', '雙魚座', '물고기자리', 'Piscis', 'Poissons', 'Peixes', 'Fische', 'Рыбы', 'Balık', 'Pisces', 'मीन', 'الحوت');
  // the missions
  add('mi.clear', 'すべての牌を取ろう', 'Clear every tile', '取走所有牌', '取走所有牌', '모든 패를 없애자', 'Retira todas las fichas', 'Retirez toutes les tuiles', 'Retire todas as peças', 'Räume alle Steine ab', 'Уберите все кости', 'Tüm taşları topla', 'Ambil semua ubin', 'सारी टाइलें हटाओ', 'أزل كل القطع');
  add('mi.time', '{t}以内にすべて取ろう', 'Clear every tile within {t}', '{t}内取走所有牌', '{t}內取走所有牌', '{t} 안에 모두 없애자', 'Retira todas en {t}', 'Tout retirer en {t}', 'Retire todas em {t}', 'Alle in {t} abräumen', 'Уберите все за {t}', '{t} içinde hepsini topla', 'Ambil semua dalam {t}', '{t} में सब हटाओ', 'أزل الكل خلال {t}');
  add('mi.pairs', '{t}以内に{n}組取ろう', 'Take {n} pairs within {t}', '{t}内取走{n}对', '{t}內取走{n}對', '{t} 안에 {n}쌍을 없애자', 'Retira {n} parejas en {t}', 'Retirez {n} paires en {t}', 'Retire {n} pares em {t}', '{n} Paare in {t}', 'Уберите {n} пар за {t}', '{t} içinde {n} çift', 'Ambil {n} pasang dalam {t}', '{t} में {n} जोड़े', 'أزل {n} أزواج خلال {t}');
  add('mi.gold', '金の牌を{n}枚すべて取ろう', 'Take all {n} golden tiles', '取走全部{n}张金牌', '取走全部{n}張金牌', '금색 패 {n}개를 모두 없애자', 'Retira las {n} fichas doradas', 'Retirez les {n} tuiles dorées', 'Retire as {n} peças douradas', 'Räume alle {n} goldenen Steine ab', 'Уберите все {n} золотых костей', '{n} altın taşın hepsini topla', 'Ambil semua {n} ubin emas', 'सारी {n} सुनहरी टाइलें हटाओ', 'أزل كل القطع الذهبية الـ{n}');
  add('mi.pure', 'ヒントとシャッフルなしで全部取ろう', 'Clear it all without hints or shuffles', '不用提示和洗牌取走全部', '不用提示和洗牌取走全部', '힌트와 셔플 없이 모두 없애자', 'Despéjalo sin pistas ni barajar', 'Tout retirer sans indice ni mélange', 'Limpe tudo sem dicas nem embaralhar', 'Ohne Tipp und Mischen abräumen', 'Без подсказок и перемешивания', 'İpucu ve karıştırma olmadan bitir', 'Tanpa petunjuk dan acak', 'बिना संकेत और फेंट के सब हटाओ', 'أنهِ دون تلميح أو خلط');
  add('star2', '★★ {t}以内', '★★ within {t}', '★★ {t}内', '★★ {t}內', '★★ {t} 이내', '★★ en {t}', '★★ en {t}', '★★ em {t}', '★★ in {t}', '★★ за {t}', '★★ {t} içinde', '★★ dalam {t}', '★★ {t} में', '★★ خلال {t}');
  add('star3', '★★★ さらにヒント・シャッフルなし', '★★★ and no hints or shuffles', '★★★ 且不用提示和洗牌', '★★★ 且不用提示和洗牌', '★★★ 거기에 힌트·셔플 없이', '★★★ y sin pistas ni barajar', '★★★ et sans indice ni mélange', '★★★ e sem dicas nem embaralhar', '★★★ und ohne Tipp/Mischen', '★★★ и без подсказок', '★★★ ve ipucu/karıştırma yok', '★★★ dan tanpa petunjuk/acak', '★★★ और बिना संकेत/फेंट', '★★★ ودون تلميح أو خلط');
  // the HUD
  add('h.left', '残り', 'Left', '剩余', '剩餘', '남은 패', 'Quedan', 'Reste', 'Restam', 'Übrig', 'Осталось', 'Kalan', 'Sisa', 'बाकी', 'المتبقي');
  add('h.pairs', '取れる組 {n}', '{n} pairs open', '可取 {n} 对', '可取 {n} 對', '가능 {n}쌍', '{n} parejas libres', '{n} paires libres', '{n} pares livres', '{n} Paare frei', 'Доступно пар: {n}', '{n} çift açık', '{n} pasang bisa', '{n} जोड़े खुले', '{n} أزواج متاحة');
  add('h.time', 'タイム', 'Time', '用时', '用時', '시간', 'Tiempo', 'Temps', 'Tempo', 'Zeit', 'Время', 'Süre', 'Waktu', 'समय', 'الوقت');
  add('h.limit', '残り時間', 'Time left', '剩余时间', '剩餘時間', '남은 시간', 'Tiempo restante', 'Temps restant', 'Tempo restante', 'Restzeit', 'Осталось', 'Kalan süre', 'Sisa waktu', 'बचा समय', 'الوقت المتبقي');
  add('h.gold', '金の牌 {a}/{b}', 'Gold {a}/{b}', '金牌 {a}/{b}', '金牌 {a}/{b}', '금색 {a}/{b}', 'Oro {a}/{b}', 'Or {a}/{b}', 'Ouro {a}/{b}', 'Gold {a}/{b}', 'Золото {a}/{b}', 'Altın {a}/{b}', 'Emas {a}/{b}', 'सोना {a}/{b}', 'ذهب {a}/{b}');
  add('h.got', '{a}/{b}組', '{a}/{b} pairs', '{a}/{b}对', '{a}/{b}對', '{a}/{b}쌍', '{a}/{b} parejas', '{a}/{b} paires', '{a}/{b} pares', '{a}/{b} Paare', '{a}/{b} пар', '{a}/{b} çift', '{a}/{b} pasang', '{a}/{b} जोड़े', '{a}/{b} أزواج');
  // results and messages
  add('r.clear', '全部取れた！', 'All clear!', '全部取完！', '全部取完！', '올 클리어!', '¡Todo despejado!', 'Tout est dégagé !', 'Tudo limpo!', 'Alles abgeräumt!', 'Всё убрано!', 'Hepsi bitti!', 'Bersih semua!', 'सब साफ़!', 'تم المسح بالكامل!');
  add('r.stuck', '手詰まり', 'No more pairs', '没有可取的牌', '沒有可取的牌', '더 이상 없음', 'Sin parejas', 'Plus de paires', 'Sem pares', 'Keine Paare mehr', 'Пар больше нет', 'Çift kalmadı', 'Tidak ada pasangan', 'जोड़े खत्म', 'لا أزواج');
  add('r.stage', 'ステージクリア！', 'Stage clear!', '过关！', '過關！', '스테이지 클리어!', '¡Etapa superada!', 'Étape réussie !', 'Fase concluída!', 'Stufe geschafft!', 'Этап пройден!', 'Bölüm geçildi!', 'Tahap selesai!', 'स्टेज पार!', 'اجتزت المرحلة!');
  add('r.fail', 'ミッション失敗…', 'Mission failed…', '任务失败…', '任務失敗…', '미션 실패…', 'Misión fallida…', 'Mission ratée…', 'Missão falhou…', 'Mission gescheitert…', 'Миссия провалена…', 'Görev başarısız…', 'Misi gagal…', 'मिशन विफल…', 'فشلت المهمة…');
  add('r.timeup', '時間切れ', 'Time is up', '时间到', '時間到', '시간 초과', 'Se acabó el tiempo', 'Temps écoulé', 'Tempo esgotado', 'Zeit abgelaufen', 'Время вышло', 'Süre doldu', 'Waktu habis', 'समय समाप्त', 'انتهى الوقت');
  add('r.left', '残り{n}枚', '{n} tiles left', '剩余{n}张', '剩餘{n}張', '{n}개 남음', 'Quedan {n}', '{n} restantes', 'Restam {n}', '{n} übrig', 'Осталось {n}', '{n} kaldı', 'Sisa {n}', '{n} बाकी', 'بقي {n}');
  add('r.time', 'タイム {t}', 'Time {t}', '用时 {t}', '用時 {t}', '시간 {t}', 'Tiempo {t}', 'Temps {t}', 'Tempo {t}', 'Zeit {t}', 'Время {t}', 'Süre {t}', 'Waktu {t}', 'समय {t}', 'الوقت {t}');
  add('r.best', 'ベスト {t}', 'Best {t}', '最佳 {t}', '最佳 {t}', '베스트 {t}', 'Mejor {t}', 'Record {t}', 'Melhor {t}', 'Bestzeit {t}', 'Лучшее {t}', 'En iyi {t}', 'Terbaik {t}', 'सर्वश्रेष्ठ {t}', 'الأفضل {t}');
  add('r.newBest', '自己ベスト更新！', 'New personal best!', '刷新个人最佳！', '刷新個人最佳！', '자기 최고 기록!', '¡Nuevo récord!', 'Nouveau record !', 'Novo recorde!', 'Neue Bestzeit!', 'Новый рекорд!', 'Yeni rekor!', 'Rekor baru!', 'नया रिकॉर्ड!', 'رقم شخصي جديد!');
  add('b.next', '次のステージ', 'Next stage', '下一关', '下一關', '다음 스테이지', 'Siguiente', 'Suivante', 'Próxima', 'Weiter', 'Дальше', 'Sonraki', 'Berikutnya', 'अगला', 'التالية');
  add('b.shuffle', 'シャッフル', 'Shuffle', '洗牌', '洗牌', '셔플', 'Barajar', 'Mélanger', 'Embaralhar', 'Mischen', 'Перемешать', 'Karıştır', 'Acak', 'फेंटो', 'خلط');
  add('b.map', '星座マップ', 'Star map', '星座地图', '星座地圖', '별자리 지도', 'Mapa estelar', 'Carte du ciel', 'Mapa estelar', 'Sternkarte', 'Звёздная карта', 'Yıldız haritası', 'Peta bintang', 'तारा मानचित्र', 'خريطة النجوم');
  add('b.start', 'スタート', 'Start', '开始', '開始', '시작', 'Empezar', 'Commencer', 'Começar', 'Start', 'Старт', 'Başla', 'Mulai', 'शुरू', 'ابدأ');
  add('b.close', '閉じる', 'Close', '关闭', '關閉', '닫기', 'Cerrar', 'Fermer', 'Fechar', 'Schließen', 'Закрыть', 'Kapat', 'Tutup', 'बंद', 'إغلاق');
  add('b.later', 'あとで', 'Not now', '稍后', '稍後', '나중에', 'Ahora no', 'Plus tard', 'Agora não', 'Später', 'Позже', 'Sonra', 'Nanti', 'बाद में', 'لاحقًا');
  add('msg.blocked', 'その牌はまだ取れません（上か左右がふさがっています）', 'That tile is blocked (something on it, or both sides closed)', '这张牌还不能取（上方或左右被挡）', '這張牌還不能取（上方或左右被擋）', '그 패는 아직 못 없애요 (위나 양옆이 막힘)', 'Esa ficha está bloqueada', 'Cette tuile est bloquée', 'Essa peça está bloqueada', 'Dieser Stein ist blockiert', 'Эта кость заблокирована', 'Bu taş kapalı', 'Ubin itu terhalang', 'वह टाइल अटकी है', 'هذه القطعة محجوبة');
  add('msg.stuck', '取れる組がありません。シャッフルしますか？', 'No pairs left to take. Shuffle the tiles?', '没有可取的牌了。要洗牌吗？', '沒有可取的牌了。要洗牌嗎？', '없앨 쌍이 없어요. 셔플할까요?', 'No quedan parejas. ¿Barajar?', 'Plus de paires. Mélanger ?', 'Sem pares. Embaralhar?', 'Keine Paare mehr. Mischen?', 'Пар нет. Перемешать?', 'Çift yok. Karıştırılsın mı?', 'Tidak ada pasangan. Acak?', 'जोड़े नहीं बचे। फेंटें?', 'لا أزواج. هل تخلط؟');
  add('msg.unsafe', 'このままだと全部は取れなさそう… 待ったかシャッフルを', "From here it can't all be cleared… try undo or a shuffle", '照这样取不完…试试悔牌或洗牌', '照這樣取不完…試試悔牌或洗牌', '이대로는 다 못 없애요… 무르기나 셔플을', 'Así no se puede despejar… deshaz o baraja', 'Impossible de tout dégager… annulez ou mélangez', 'Assim não dá para limpar… desfaça ou embaralhe', 'So geht es nicht auf … zurück oder mischen', 'Так не разобрать… отмените или перемешайте', 'Böyle bitmez… geri al ya da karıştır', 'Begini tak bisa bersih… urungkan atau acak', 'ऐसे पूरा नहीं होगा… वापस लें या फेंटें', 'لن تُمسح كلها… تراجع أو اخلط');
  add('msg.pure', 'このミッションではヒントは使えません', 'No hints in this mission', '本任务不能用提示', '本任務不能用提示', '이 미션에서는 힌트를 못 써요', 'Sin pistas en esta misión', "Pas d'indice dans cette mission", 'Sem dicas nesta missão', 'Keine Tipps in dieser Mission', 'В этой миссии без подсказок', 'Bu görevde ipucu yok', 'Tanpa petunjuk di misi ini', 'इस मिशन में संकेत नहीं', 'لا تلميحات في هذه المهمة');
  add('msg.noshuf', 'シャッフルはもう使えません', 'No shuffles left', '洗牌次数用完了', '洗牌次數用完了', '셔플을 더 못 써요', 'No quedan barajadas', 'Plus de mélange', 'Sem embaralhadas', 'Kein Mischen mehr', 'Перемешиваний больше нет', 'Karıştırma hakkı bitti', 'Acak habis', 'फेंट खत्म', 'لا خلط متبقٍ');
  add('msg.shufPen', 'シャッフルはタイム +{n}秒', 'A shuffle adds +{n}s to your time', '洗牌会使用时 +{n}秒', '洗牌會使用時 +{n}秒', '셔플하면 시간 +{n}초', 'Barajar suma +{n} s al tiempo', 'Mélanger ajoute +{n} s au temps', 'Embaralhar soma +{n} s ao tempo', 'Mischen kostet +{n} s Zeit', 'Перемешивание: +{n} с ко времени', 'Karıştırma süreye +{n} sn ekler', 'Mengacak menambah waktu +{n} dtk', 'फेंटने पर समय +{n} सेकंड', 'الخلط يضيف +{n} ث إلى الوقت');
  add('msg.shufLeft', 'シャッフル（あと{n}回）', 'Shuffle ({n} left)', '洗牌（还剩{n}次）', '洗牌（還剩{n}次）', '셔플 (남은 {n}회)', 'Barajar (quedan {n})', 'Mélanger ({n} restant)', 'Embaralhar ({n})', 'Mischen (noch {n})', 'Перемешать (ещё {n})', 'Karıştır ({n} kaldı)', 'Acak (sisa {n})', 'फेंटो ({n} बाकी)', 'خلط ({n} متبقٍ)');
  add('st.stage', 'ステージ {a}-{b}', 'Stage {a}-{b}', '第{a}-{b}关', '第{a}-{b}關', '스테이지 {a}-{b}', 'Etapa {a}-{b}', 'Étape {a}-{b}', 'Fase {a}-{b}', 'Stufe {a}-{b}', 'Этап {a}-{b}', 'Bölüm {a}-{b}', 'Tahap {a}-{b}', 'स्टेज {a}-{b}', 'المرحلة {a}-{b}');
  add('st.progress', '{c}/{n}ステージ · ★{s}/{t}', '{c}/{n} stages · ★{s}/{t}', '{c}/{n}关 · ★{s}/{t}', '{c}/{n}關 · ★{s}/{t}', '{c}/{n} 스테이지 · ★{s}/{t}', '{c}/{n} etapas · ★{s}/{t}', '{c}/{n} étapes · ★{s}/{t}', '{c}/{n} fases · ★{s}/{t}', '{c}/{n} Stufen · ★{s}/{t}', '{c}/{n} этапов · ★{s}/{t}', '{c}/{n} bölüm · ★{s}/{t}', '{c}/{n} tahap · ★{s}/{t}', '{c}/{n} स्टेज · ★{s}/{t}', '{c}/{n} مراحل · ★{s}/{t}');
  add('st.next', '次：{s}', 'Next: {s}', '下一关：{s}', '下一關：{s}', '다음: {s}', 'Siguiente: {s}', 'Suivante : {s}', 'Próxima: {s}', 'Nächste: {s}', 'Далее: {s}', 'Sonraki: {s}', 'Berikutnya: {s}', 'अगला: {s}', 'التالية: {s}');
  add('st.lock', 'ひとつ前のステージをクリアすると挑戦できます', 'Clear the stage before it to unlock', '通过上一关即可挑战', '通過上一關即可挑戰', '이전 스테이지를 클리어하면 열려요', 'Supera la anterior para desbloquear', "Réussissez l'étape précédente", 'Conclua a anterior para liberar', 'Schaffe die vorige Stufe', 'Пройдите предыдущий этап', 'Öncekini geçince açılır', 'Selesaikan tahap sebelumnya', 'पिछला स्टेज पार करें', 'اجتز المرحلة السابقة');
  add('st.all', '全天の星座を結んだ！', 'Every constellation joined!', '连起了全天星座！', '連起了全天星座！', '모든 별자리를 이었어요!', '¡Todas las constelaciones unidas!', 'Toutes les constellations reliées !', 'Todas as constelações ligadas!', 'Alle Sternbilder verbunden!', 'Все созвездия собраны!', 'Tüm takımyıldızlar birleşti!', 'Semua rasi tersambung!', 'सारे तारामंडल जुड़ गए!', 'اكتملت كل الأبراج!');
  add('st.title', '星座をつなぐ上海', 'Shanghai of the Stars', '星座上海', '星座上海', '별자리 상하이', 'Shanghai de las estrellas', 'Shanghai des étoiles', 'Shanghai das estrelas', 'Sternen-Shanghai', 'Звёздный Шанхай', 'Yıldızların Shanghai’ı', 'Shanghai Bintang', 'तारों का शंघाई', 'شنغهاي النجوم');
  add('st.intro', 'ステージをクリアするたびに星がつながり、星座ができあがります。', 'Each stage you clear lights a star and draws its constellation.', '每通过一关就点亮一颗星，连成星座。', '每通過一關就點亮一顆星，連成星座。', '스테이지를 깰 때마다 별이 이어져 별자리가 완성돼요.', 'Cada etapa enciende una estrella y dibuja su constelación.', 'Chaque étape allume une étoile de la constellation.', 'Cada fase acende uma estrela da constelação.', 'Jede Stufe lässt einen Stern des Sternbilds leuchten.', 'Каждый этап зажигает звезду созвездия.', 'Her bölüm bir yıldızı yakar.', 'Setiap tahap menyalakan satu bintang.', 'हर स्टेज एक तारा जलाता है।', 'كل مرحلة تُضيء نجمة من البرج.');
  add('best', 'ベスト', 'Best', '最佳', '最佳', '베스트', 'Mejor', 'Record', 'Melhor', 'Bestzeit', 'Лучшее', 'En iyi', 'Terbaik', 'सर्वश्रेष्ठ', 'الأفضل');
  add('back', '牌の背', 'Tile backs', '牌背', '牌背', '패 뒷면', 'Dorso', 'Dos', 'Verso', 'Rückseite', 'Рубашка', 'Taş sırtı', 'Punggung', 'पीठ', 'الظهر');
  add('bk.jade', '翡翠', 'Jade', '翡翠', '翡翠', '비취', 'Jade', 'Jade', 'Jade', 'Jade', 'Нефрит', 'Yeşim', 'Giok', 'जेड', 'يشم');
  add('bk.lapis', '瑠璃', 'Lapis', '琉璃', '琉璃', '청금석', 'Lapislázuli', 'Lapis', 'Lápis-lazúli', 'Lapis', 'Лазурит', 'Lapis', 'Lapis', 'लाजवर्द', 'لازورد');
  add('bk.ebony', '黒檀', 'Ebony', '乌木', '烏木', '흑단', 'Ébano', 'Ébène', 'Ébano', 'Ebenholz', 'Эбен', 'Abanoz', 'Eboni', 'आबनूस', 'أبنوس');
  add('bk.coral', '珊瑚', 'Coral', '珊瑚', '珊瑚', '산호', 'Coral', 'Corail', 'Coral', 'Koralle', 'Коралл', 'Mercan', 'Koral', 'मूंगा', 'مرجان');
  window.SHANGHAI_I18N = D;
})();
