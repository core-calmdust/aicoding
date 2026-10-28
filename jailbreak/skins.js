/* だつごくスライダー！ — gacha floor designs (50) and board frames (50).
   Each design is data + a CSS generator, so a new one is one line. The first 8 floors are the original skins (their CSS lives in app.css).
   JBSkins.FLOORS / FRAMES: { id, rar (0 N … 3 SSR), n: { ja, en } } · JBSkins.css() → the style sheet for every design
   Floors paint #board .floor (body[data-floor=id]); frames paint #board::before (body[data-frame=id]) — the ring round the board. */
(function () {
'use strict';
const C = 'var(--cs)';
/* translations: id → [zh, ko, es, fr, pt, de, hi, ar] */
const NL = ['zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
const NT = {
  f_mint: ['薄荷瓷砖', '민트 타일', 'Azulejo menta', 'Carreau menthe', 'Azulejo menta', 'Mintfliesen', 'पुदीना टाइल', 'بلاط النعناع'],
  f_peach: ['桃色瓷砖', '복숭아 타일', 'Azulejo melocotón', 'Carreau pêche', 'Azulejo pêssego', 'Pfirsichfliesen', 'आड़ू टाइल', 'بلاط الخوخ'],
  f_cellchk: ['牢房格纹', '독방 체크', 'Cuadros celda', 'Damier cellule', 'Xadrez cela', 'Zellenkaro', 'कोठरी चेक', 'مربعات الزنزانة'],
  f_bluechk: ['蓝色格纹', '블루 체크', 'Cuadros azules', 'Damier bleu', 'Xadrez azul', 'Blaukaro', 'नीला चेक', 'مربعات زرقاء'],
  f_dotcream: ['奶油圆点', '크림 물방울', 'Lunares crema', 'Pois crème', 'Bolinhas creme', 'Cremepunkte', 'क्रीम बिंदी', 'نقاط كريمية'],
  f_dotpink: ['粉色圆点', '핑크 물방울', 'Lunares rosa', 'Pois roses', 'Bolinhas rosa', 'Rosapunkte', 'गुलाबी बिंदी', 'نقاط وردية'],
  f_oak: ['橡木地板', '오크 마루', 'Tarima roble', 'Parquet chêne', 'Piso carvalho', 'Eichendielen', 'ओक फ़र्श', 'أرضية البلوط'],
  f_pine: ['松木地板', '소나무 마루', 'Tarima pino', 'Parquet pin', 'Piso pinho', 'Kiefernboden', 'चीड़ फ़र्श', 'أرضية الصنوبر'],
  f_redbrick: ['红砖', '붉은 벽돌', 'Ladrillo rojo', 'Brique rouge', 'Tijolo vermelho', 'Rotziegel', 'लाल ईंट', 'طوب أحمر'],
  f_greybrick: ['灰砖', '회색 벽돌', 'Ladrillo gris', 'Brique grise', 'Tijolo cinza', 'Graziegel', 'धूसर ईंट', 'طوب رمادي'],
  f_stripe: ['囚服条纹', '죄수 줄무늬', 'Rayas de preso', 'Rayures bagnard', 'Listras presidiário', 'Sträflingsstreifen', 'कैदी धारियाँ', 'خطوط السجناء'],
  f_tatami: ['榻榻米牢房', '다다미 독방', 'Celda tatami', 'Cellule tatami', 'Cela tatame', 'Tatami-Zelle', 'तातामी कोठरी', 'زنزانة تاتامي'],
  f_lawn: ['操场草坪', '운동장 잔디', 'Césped patio', 'Pelouse cour', 'Gramado pátio', 'Hofrasen', 'मैदान की घास', 'عشب الساحة'],
  f_sandpit: ['沙坑', '모래밭', 'Arenero', 'Bac à sable', 'Caixa de areia', 'Sandkasten', 'रेत का गड्ढा', 'حفرة الرمل'],
  f_diamond: ['花纹钢板', '체크 철판', 'Chapa lagrimada', 'Tôle larmée', 'Chapa xadrez', 'Riffelblech', 'डायमंड प्लेट', 'صفيحة معدنية'],
  f_carpet: ['会客室地毯', '면회실 카펫', 'Alfombra visitas', 'Moquette parloir', 'Tapete visitas', 'Besucherteppich', 'मुलाकात कालीन', 'سجاد الزيارة'],
  f_marble: ['大理石', '대리석', 'Mármol', 'Marbre', 'Mármore', 'Marmor', 'संगमरमर', 'رخام'],
  f_terrazzo: ['水磨石', '테라조', 'Terrazo', 'Terrazzo', 'Terrazo', 'Terrazzo', 'टेराज़ो', 'تيرازو'],
  f_camo: ['迷彩', '위장무늬', 'Camuflaje', 'Camouflage', 'Camuflagem', 'Tarnmuster', 'छलावरण', 'تمويه'],
  f_halftone: ['美漫网点', '만화 망점', 'Puntos cómic', 'Points comics', 'Pontos HQ', 'Comicpunkte', 'कॉमिक बिंदु', 'نقاط كوميك'],
  f_hex: ['蜂巢', '벌집', 'Panal', 'Nid d\'abeille', 'Favo de mel', 'Waben', 'मधुमक्खी छत्ता', 'خلية نحل'],
  f_zigzag: ['之字形', '지그재그', 'Zigzag', 'Zigzag', 'Zigue-zague', 'Zickzack', 'ज़िगज़ैग', 'متعرج'],
  f_argyle: ['菱形格', '아가일', 'Argyle', 'Argyle', 'Argyle', 'Argyle', 'आर्गाइल', 'أرجيل'],
  f_mintdot: ['汽水圆点', '소다 물방울', 'Lunares soda', 'Pois soda', 'Bolinhas soda', 'Sodapunkte', 'सोडा बिंदी', 'نقاط الصودا'],
  f_circuit: ['电子锁电路板', '전자잠금 기판', 'Placa circuito', 'Circuit imprimé', 'Placa circuito', 'Platine', 'सर्किट बोर्ड', 'لوحة دوائر'],
  f_sewer: ['地下水道', '지하 수로', 'Alcantarilla', 'Égout', 'Esgoto', 'Kanalisation', 'सीवर', 'مجاري'],
  f_hazardfl: ['危险区域', '위험 구역', 'Zona peligro', 'Zone danger', 'Zona perigo', 'Gefahrenzone', 'खतरा क्षेत्र', 'منطقة خطرة'],
  f_lava: ['熔炉', '용광로', 'Horno', 'Fournaise', 'Fornalha', 'Schmelzofen', 'भट्ठी', 'فرن صهر'],
  f_starry: ['星空天台', '별빛 옥상', 'Azotea estrellas', 'Toit étoilé', 'Telhado estrelas', 'Sterndach', 'तारों वाली छत', 'سطح النجوم'],
  f_pool: ['泳池边', '수영장 가', 'Piscina', 'Bord piscine', 'Beira piscina', 'Poolrand', 'पूलसाइड', 'حافة المسبح'],
  f_popchk: ['波普格纹', '팝 체크', 'Cuadros pop', 'Damier pop', 'Xadrez pop', 'Pop-Karo', 'पॉप चेक', 'مربعات بوب'],
  f_comic: ['漫画网点', '만화 망점', 'Trama cómic', 'Trame comics', 'Retícula HQ', 'Comicraster', 'कॉमिक हाफ़टोन', 'هافتون كوميك'],
  f_gold: ['金库室', '금고실', 'Cámara acorazada', 'Chambre forte', 'Cofre-forte', 'Tresorraum', 'बैंक तिजोरी', 'غرفة الخزنة'],
  f_jungle: ['丛林', '정글', 'Jungla', 'Jungle', 'Selva', 'Dschungel', 'जंगल', 'غابة'],
  f_cyber: ['赛博牢房', '사이버 독방', 'Celda cíber', 'Cellule cyber', 'Cela cyber', 'Cyber-Zelle', 'साइबर कोठरी', 'زنزانة سيبرانية'],
  f_galaxy: ['银河', '은하', 'Galaxia', 'Galaxie', 'Galáxia', 'Galaxie', 'आकाशगंगा', 'مجرة'],
  f_goldchk: ['黄金格纹', '황금 체크', 'Cuadros dorados', 'Damier doré', 'Xadrez dourado', 'Goldkaro', 'सुनहरा चेक', 'مربعات ذهبية'],
  f_candy: ['糖果', '캔디', 'Caramelo', 'Bonbon', 'Doce', 'Zuckerstreifen', 'कैंडी', 'حلوى'],
  f_guardchk: ['看守室格纹', '간수실 체크', 'Cuadros guardia', 'Damier gardien', 'Xadrez guarda', 'Wachkaro', 'प्रहरी चेक', 'مربعات الحراس'],
  f_nightdot: ['夜色圆点', '밤의 물방울', 'Lunares noche', 'Pois nuit', 'Bolinhas noite', 'Nachtpunkte', 'रात की बिंदी', 'نقاط الليل'],
  f_magma: ['岩浆', '마그마', 'Magma', 'Magma', 'Magma', 'Magma', 'मैग्मा', 'ماغما'],
  f_rainbow: ['彩虹', '무지개', 'Arcoíris', 'Arc-en-ciel', 'Arco-íris', 'Regenbogen', 'इंद्रधनुष', 'قوس قزح'],
  steel: ['钢铁', '스틸', 'Acero', 'Acier', 'Aço', 'Stahl', 'स्टील', 'فولاذ'],
  x_navy: ['藏青', '네이비', 'Marino', 'Marine', 'Marinho', 'Marineblau', 'नेवी', 'كحلي'],
  x_olive: ['橄榄绿', '올리브', 'Oliva', 'Olive', 'Oliva', 'Oliv', 'जैतूनी', 'زيتوني'],
  x_rust: ['锈铁', '녹슨 철', 'Hierro oxidado', 'Fer rouillé', 'Ferro enferrujado', 'Rosteisen', 'जंग लोहा', 'حديد صدئ'],
  x_cream: ['奶油色', '크림', 'Crema', 'Crème', 'Creme', 'Creme', 'क्रीम', 'كريمي'],
  x_teal: ['青绿', '틸', 'Verde azulado', 'Sarcelle', 'Verde-azulado', 'Petrol', 'टील', 'أزرق مخضر'],
  x_brown: ['深棕', '다크 브라운', 'Marrón oscuro', 'Brun foncé', 'Marrom escuro', 'Dunkelbraun', 'गहरा भूरा', 'بني غامق'],
  x_grey: ['灰色', '그레이', 'Gris', 'Gris', 'Cinza', 'Grau', 'धूसर', 'رمادي'],
  x_rivet: ['铆钉钢', '리벳 강철', 'Acero remachado', 'Acier riveté', 'Aço rebitado', 'Nietstahl', 'रिवेट स्टील', 'فولاذ مسمّر'],
  x_rivrust: ['铆钉红锈', '리벳 붉은 녹', 'Óxido remachado', 'Rouille rivetée', 'Ferrugem rebit.', 'Nietrost', 'रिवेट जंग', 'صدأ مسمّر'],
  x_oak: ['木框', '나무 틀', 'Marco madera', 'Cadre bois', 'Moldura madeira', 'Holzrahmen', 'लकड़ी फ़्रेम', 'إطار خشبي'],
  x_pine: ['白木框', '흰 나무 틀', 'Marco pino', 'Cadre pin', 'Moldura pinho', 'Kieferrahmen', 'चीड़ फ़्रेम', 'إطار الصنوبر'],
  x_brick: ['砖框', '벽돌 틀', 'Marco ladrillo', 'Cadre brique', 'Moldura tijolo', 'Ziegelrahmen', 'ईंट फ़्रेम', 'إطار طوب'],
  x_wbrick: ['白砖', '흰 벽돌', 'Ladrillo blanco', 'Brique blanche', 'Tijolo branco', 'Weißziegel', 'सफ़ेद ईंट', 'طوب أبيض'],
  x_dots: ['圆点边框', '물방울 틀', 'Marco lunares', 'Cadre pois', 'Moldura bolinhas', 'Punktrahmen', 'बिंदी फ़्रेम', 'إطار منقط'],
  x_dotpk: ['粉色圆点', '핑크 물방울', 'Lunares rosa', 'Pois roses', 'Bolinhas rosa', 'Rosapunkte', 'गुलाबी बिंदी', 'نقاط وردية'],
  x_chk: ['棋盘格', '체커', 'Damero', 'Damier', 'Xadrez', 'Schachbrett', 'चेकर', 'رقعة شطرنج'],
  x_chkred: ['红色格纹', '레드 체크', 'Cuadros rojos', 'Damier rouge', 'Xadrez vermelho', 'Rotkaro', 'लाल चेक', 'مربعات حمراء'],
  x_hazard: ['危险胶带', '위험 테이프', 'Cinta peligro', 'Ruban danger', 'Fita perigo', 'Warnband', 'खतरा टेप', 'شريط تحذير'],
  x_police: ['禁止入内', '출입 금지', 'Línea policial', 'Ruban police', 'Faixa polícia', 'Absperrband', 'पुलिस लाइन', 'خط الشرطة'],
  x_jail: ['囚服条纹', '죄수복 줄무늬', 'Rayas de preso', 'Rayures bagnard', 'Listras presidiário', 'Sträflingsstreifen', 'कैदी धारियाँ', 'خطوط السجناء'],
  x_candy: ['拐杖糖', '캔디 케인', 'Bastón caramelo', 'Sucre d\'orge', 'Bengala doce', 'Zuckerstange', 'कैंडी केन', 'عصا الحلوى'],
  x_mintst: ['薄荷条纹', '민트 줄무늬', 'Rayas menta', 'Rayures menthe', 'Listras menta', 'Mintstreifen', 'पुदीना धारियाँ', 'خطوط النعناع'],
  x_camo: ['迷彩', '위장무늬', 'Camuflaje', 'Camouflage', 'Camuflagem', 'Tarnmuster', 'छलावरण', 'تمويه'],
  x_desert: ['沙漠迷彩', '사막 위장', 'Camuf. desierto', 'Camo désert', 'Camuf. deserto', 'Wüstentarn', 'रेगिस्तानी छलावरण', 'تمويه صحراوي'],
  x_comic: ['红色网点', '레드 망점', 'Cómic rojo', 'Comics rouge', 'HQ vermelho', 'Comic Rot', 'कॉमिक लाल', 'كوميك أحمر'],
  x_comicb: ['蓝色网点', '블루 망점', 'Cómic azul', 'Comics bleu', 'HQ azul', 'Comic Blau', 'कॉमिक नीला', 'كوميك أزرق'],
  x_chain: ['锁链', '쇠사슬', 'Cadenas', 'Chaînes', 'Correntes', 'Ketten', 'जंजीरें', 'سلاسل'],
  x_chrome: ['铬', '크롬', 'Cromo', 'Chrome', 'Cromo', 'Chrom', 'क्रोम', 'كروم'],
  x_copper: ['铜', '구리', 'Cobre', 'Cuivre', 'Cobre', 'Kupfer', 'तांबा', 'نحاس'],
  x_purple: ['紫色', '퍼플', 'Púrpura', 'Violet', 'Roxo', 'Lila', 'बैंगनी', 'بنفسجي'],
  x_sky: ['天蓝', '스카이', 'Cielo', 'Ciel', 'Céu', 'Himmelblau', 'आसमानी', 'سماوي'],
  x_lime: ['青柠', '라임', 'Lima', 'Citron vert', 'Lima', 'Limette', 'नींबू हरा', 'ليموني'],
  x_neonpk: ['霓虹粉', '네온 핑크', 'Neón rosa', 'Néon rose', 'Neon rosa', 'Neonpink', 'नियॉन गुलाबी', 'نيون وردي'],
  x_neoncy: ['霓虹青', '네온 시안', 'Neón cian', 'Néon cyan', 'Neon ciano', 'Neoncyan', 'नियॉन सियान', 'نيون سماوي'],
  x_neongr: ['霓虹绿', '네온 그린', 'Neón verde', 'Néon vert', 'Neon verde', 'Neongrün', 'नियॉन हरा', 'نيون أخضر'],
  x_brass: ['黄铜', '황동', 'Latón', 'Laiton', 'Latão', 'Messing', 'पीतल', 'نحاس أصفر'],
  x_silver: ['银', '은', 'Plata', 'Argent', 'Prata', 'Silber', 'चाँदी', 'فضة'],
  x_popdot: ['波普圆点', '팝 물방울', 'Lunares pop', 'Pois pop', 'Bolinhas pop', 'Pop-Punkte', 'पॉप बिंदी', 'نقاط بوب'],
  x_pinkchk: ['粉色格纹', '핑크 체크', 'Cuadros rosa', 'Damier rose', 'Xadrez rosa', 'Rosakaro', 'गुलाबी चेक', 'مربعات وردية'],
  x_tigerst: ['虎纹', '호랑이', 'Tigre', 'Tigre', 'Tigre', 'Tiger', 'बाघ', 'نمر'],
  x_ice: ['冰框', '얼음 틀', 'Marco hielo', 'Cadre glace', 'Moldura gelo', 'Eisrahmen', 'बर्फ़ फ़्रेम', 'إطار جليدي'],
  x_bluechain: ['蓝色锁链', '푸른 쇠사슬', 'Cadenas azules', 'Chaînes bleues', 'Correntes azuis', 'Blaue Ketten', 'नीली जंजीरें', 'سلاسل زرقاء'],
  x_lockdown: ['封锁胶带', '봉쇄 테이프', 'Cinta cierre', 'Ruban bouclage', 'Fita bloqueio', 'Sperrband', 'लॉकडाउन टेप', 'شريط الإغلاق'],
  x_gold: ['黄金', '황금', 'Oro', 'Or', 'Ouro', 'Gold', 'सोना', 'ذهب'],
  x_rose: ['玫瑰金', '로즈골드', 'Oro rosa', 'Or rose', 'Ouro rosé', 'Roségold', 'रोज़ गोल्ड', 'ذهب وردي'],
  x_rainbow: ['彩虹', '무지개', 'Arcoíris', 'Arc-en-ciel', 'Arco-íris', 'Regenbogen', 'इंद्रधनुष', 'قوس قزح'],
  x_neonvi: ['霓虹紫', '네온 바이올렛', 'Neón violeta', 'Néon violet', 'Neon violeta', 'Neonviolett', 'नियॉन बैंगनी', 'نيون بنفسجي'],
  x_platinum: ['铂金', '플래티넘', 'Platino', 'Platine', 'Platina', 'Platin', 'प्लैटिनम', 'بلاتين'],
  x_lava: ['熔岩', '용암', 'Lava', 'Lave', 'Lava', 'Lava', 'लावा', 'حمم'],
};
const NAMES = {};
for (const id in NT) NAMES[id] = Object.fromEntries(NL.map((l, i) => [l, NT[id][i]]));
/* ---------------- floors ----------------
   kind → background for the floor (cell = one board square). a, b, c: colours */
const FK = {
  grid: (a, b) => ({ bg: a, img: `linear-gradient(${b} 2px, transparent 2px), linear-gradient(90deg, ${b} 2px, transparent 2px)`, size: `${C} ${C}`, pos: '-1px -1px' }),
  check: (a, b) => ({ bg: a, img: `conic-gradient(${b} 25%, transparent 0 50%, ${b} 0 75%, transparent 0)`, size: `calc(${C} * 2) calc(${C} * 2)` }),
  dots: (a, b) => ({ bg: a, img: `radial-gradient(circle, ${b} 0 18%, transparent 19%), radial-gradient(circle, ${b} 0 18%, transparent 19%)`, size: `${C} ${C}`, pos: `0 0, calc(${C} / 2) calc(${C} / 2)` }),
  stripe: (a, b) => ({ bg: a, img: `repeating-linear-gradient(-45deg, ${b} 0 calc(${C} * .18), transparent calc(${C} * .18) calc(${C} * .5))` }),
  plank: (a, b, c) => ({ bg: a, img: `linear-gradient(${b} 2px, transparent 2px), linear-gradient(90deg, ${b} 2px, transparent 2px), repeating-linear-gradient(90deg, transparent 0 12px, ${c} 12px 13px)`, size: `${C} calc(${C} / 3), calc(${C} * 2) calc(${C} / 3), 100% 100%`, pos: `0 0, 0 0, 0 0` }),
  plate: (a, b) => ({ bg: a, img: `linear-gradient(45deg, transparent 42%, ${b} 42% 58%, transparent 58%), linear-gradient(-45deg, transparent 42%, ${b} 42% 58%, transparent 58%)`, size: `calc(${C} / 3) calc(${C} / 3), calc(${C} / 3) calc(${C} / 3)`, pos: `0 0, calc(${C} / 6) calc(${C} / 6)` }),
  carpet: (a, b, c) => ({ bg: a, img: `radial-gradient(circle, ${b} 0 2px, transparent 2.5px), linear-gradient(${c} 3px, transparent 3px), linear-gradient(90deg, ${c} 3px, transparent 3px)`, size: `calc(${C} / 4) calc(${C} / 4), ${C} ${C}, ${C} ${C}`, pos: `0 0, -2px -2px, -2px -2px` }),
  brick: (a, b) => ({ bg: a, img: `linear-gradient(${b} 2px, transparent 2px), linear-gradient(90deg, ${b} 2px, transparent 2px), linear-gradient(90deg, ${b} 2px, transparent 2px)`, size: `${C} calc(${C} / 4), ${C} calc(${C} / 2), ${C} calc(${C} / 2)`, pos: `0 0, 0 0, calc(${C} / 2) calc(${C} / 4)` }),
  grass: (a, b, c) => ({ bg: a, img: `radial-gradient(ellipse 3px 6px at 30% 40%, ${b} 90%, transparent), radial-gradient(ellipse 3px 6px at 75% 70%, ${c} 90%, transparent), radial-gradient(ellipse 2px 5px at 60% 20%, ${b} 90%, transparent)`, size: `calc(${C} / 2) calc(${C} / 2)` }),
  sand: (a, b, c) => ({ bg: a, img: `radial-gradient(circle at 20% 30%, ${b} 0 1px, transparent 1.5px), radial-gradient(circle at 70% 80%, ${c} 0 1px, transparent 1.5px), radial-gradient(ellipse at 50% 120%, ${b}, transparent 60%)`, size: `9px 9px, 13px 13px, ${C} calc(${C} / 2)` }),
  water: (a, b) => ({ bg: a, img: `radial-gradient(ellipse 60% 18% at 50% 100%, transparent 70%, ${b} 72% 86%, transparent 88%)`, size: `calc(${C} / 2) calc(${C} / 4)` }),
  lava: (a, b, c) => ({ bg: a, img: `radial-gradient(circle at 30% 30%, ${b}, transparent 35%), radial-gradient(circle at 75% 65%, ${c}, transparent 30%), linear-gradient(${a} 2px, transparent 2px), linear-gradient(90deg, rgba(0,0,0,.3) 2px, transparent 2px)`, size: `calc(${C} * 1.5) calc(${C} * 1.5), calc(${C} * 1.1) calc(${C} * 1.1), ${C} ${C}, ${C} ${C}` }),
  stars: (a, b, c) => ({ bg: a, img: `radial-gradient(circle at 20% 30%, ${b} 0 1.2px, transparent 2px), radial-gradient(circle at 70% 60%, ${c} 0 1px, transparent 1.8px), radial-gradient(circle at 45% 85%, ${b} 0 .8px, transparent 1.5px)`, size: `calc(${C} * .7) calc(${C} * .7), calc(${C} * 1.1) calc(${C} * 1.1), calc(${C} * .5) calc(${C} * .5)` }),
  circuit: (a, b, c) => ({ bg: a, img: `linear-gradient(${b} 1.5px, transparent 1.5px), linear-gradient(90deg, ${b} 1.5px, transparent 1.5px), radial-gradient(circle, ${c} 0 2.5px, transparent 3px)`, size: `calc(${C} / 2) calc(${C} / 2), calc(${C} / 2) calc(${C} / 2), calc(${C} / 2) calc(${C} / 2)`, pos: `-1px -1px, -1px -1px, calc(${C} / -4) calc(${C} / -4)` }),
  halftone: (a, b) => ({ bg: a, img: `radial-gradient(circle, ${b} 0 30%, transparent 32%), radial-gradient(circle at 0 0, rgba(255,255,255,.3), transparent 70%)`, size: `8px 8px, 100% 100%` }),
  marble: (a, b, c) => ({ bg: a, img: `linear-gradient(115deg, transparent 40%, ${b} 42%, transparent 46%), linear-gradient(35deg, transparent 60%, ${c} 61%, transparent 63%), linear-gradient(${b} 1.5px, transparent 1.5px), linear-gradient(90deg, ${b} 1.5px, transparent 1.5px)`, size: `calc(${C} * 2.3) calc(${C} * 1.7), calc(${C} * 1.6) calc(${C} * 2.1), ${C} ${C}, ${C} ${C}` }),
  terrazzo: (a, b, c) => ({ bg: a, img: `radial-gradient(circle at 20% 30%, ${b} 0 2px, transparent 2.5px), radial-gradient(circle at 70% 20%, ${c} 0 1.5px, transparent 2px), radial-gradient(circle at 50% 75%, ${b} 0 1.2px, transparent 1.7px), radial-gradient(circle at 85% 80%, ${c} 0 2.5px, transparent 3px)`, size: `calc(${C} * .6) calc(${C} * .6), calc(${C} * .45) calc(${C} * .45), calc(${C} * .7) calc(${C} * .7), calc(${C} * .9) calc(${C} * .9)` }),
  camo: (a, b, c) => ({ bg: a, img: `radial-gradient(ellipse 40% 25% at 30% 30%, ${b} 95%, transparent), radial-gradient(ellipse 30% 35% at 75% 70%, ${c} 95%, transparent), radial-gradient(ellipse 25% 20% at 80% 20%, ${b} 95%, transparent)`, size: `calc(${C} * 1.3) calc(${C} * 1.3)` }),
  hazard: (a, b) => ({ bg: a, img: `repeating-linear-gradient(-45deg, ${b} 0 6px, transparent 6px 22px), linear-gradient(${a}, ${a})`, size: `${C} 6px, 100% 100%`, pos: '0 0', rep: 'repeat-x, no-repeat' }),
  hex: (a, b) => ({ bg: a, img: `radial-gradient(circle farthest-side at 0 50%, transparent 92%, ${b} 94% 100%, transparent), radial-gradient(circle farthest-side at 100% 50%, transparent 92%, ${b} 94% 100%, transparent)`, size: `calc(${C} / 2) calc(${C} / 2)` }),
  zigzag: (a, b) => ({ bg: a, img: `linear-gradient(135deg, ${b} 25%, transparent 25%), linear-gradient(225deg, ${b} 25%, transparent 25%)`, size: `calc(${C} / 2) calc(${C} / 2)`, pos: `0 0, 0 0` }),
  argyle: (a, b, c) => ({ bg: a, img: `linear-gradient(45deg, transparent 48%, ${c} 48% 52%, transparent 52%), linear-gradient(-45deg, transparent 48%, ${c} 48% 52%, transparent 52%), conic-gradient(from 45deg, ${b} 25%, transparent 0 50%, ${b} 0 75%, transparent 0)`, size: `${C} ${C}, ${C} ${C}, ${C} ${C}` }),
  tatami: (a, b, c) => ({ bg: a, img: `linear-gradient(90deg, ${b} 3px, transparent 3px), linear-gradient(${c} 3px, transparent 3px), repeating-linear-gradient(90deg, transparent 0 3px, rgba(0,0,0,.06) 3px 4px)`, size: `calc(${C} * 2) ${C}, ${C} calc(${C} * 2), 100% 100%` }),
};
// [id, rar, ja, en, kind, a, b, c] — the original 8 have no kind
const FLOORS = [
  ['concrete', 0, 'コンクリート', 'Concrete'], ['brick', 0, 'レンガ', 'Brick'], ['tile', 1, '青タイル', 'Blue tiles'], ['yard', 1, '芝生の中庭', 'Grass yard'],
  ['night', 2, '消灯後', 'Lights out'], ['desert', 2, '砂漠の収容所', 'Desert camp'], ['arctic', 2, '氷の監獄', 'Ice prison'], ['neon', 3, 'ネオン', 'Neon'],
  ['f_mint', 0, 'ミントタイル', 'Mint tiles', 'grid', '#cfe8dc', '#b2d4c3'], ['f_peach', 0, 'ピーチタイル', 'Peach tiles', 'grid', '#f6d9c6', '#e7bfa3'],
  ['f_cellchk', 0, '独房チェック', 'Cell checker', 'check', '#e2ded4', '#d2ccbf'], ['f_bluechk', 0, 'ブルーチェック', 'Blue checker', 'check', '#dbe6f1', '#c7d6e6'],
  ['f_dotcream', 0, 'クリーム水玉', 'Cream dots', 'dots', '#efe6cf', '#e0d2ae'], ['f_dotpink', 0, 'ピンク水玉', 'Pink dots', 'dots', '#f6dce4', '#ecc0cf'],
  ['f_oak', 0, 'オーク床', 'Oak boards', 'plank', '#c9a57a', '#a8845b', 'rgba(0,0,0,.05)'], ['f_pine', 0, 'パイン床', 'Pine boards', 'plank', '#e3c899', '#c9a971', 'rgba(0,0,0,.04)'],
  ['f_redbrick', 0, '赤レンガ', 'Red brick', 'brick', '#c98f78', '#a8705a'], ['f_greybrick', 0, '灰レンガ', 'Grey brick', 'brick', '#c4c1bb', '#a9a59e'],
  ['f_stripe', 0, '囚人ストライプ', 'Jail stripes', 'stripe', '#e8e3d8', 'rgba(0,0,0,.07)'], ['f_tatami', 0, '畳の独房', 'Tatami cell', 'tatami', '#d9d3a5', '#b7ad78', '#c6bd8c'],
  ['f_lawn', 0, '運動場の芝', 'Yard lawn', 'grass', '#a6c58a', '#8fb173', '#b9d49d'], ['f_sandpit', 0, '砂場', 'Sand pit', 'sand', '#ead6a8', '#d3bb86', '#f4e4bf'],
  ['f_diamond', 1, '縞鋼板', 'Diamond plate', 'plate', '#a9adb5', '#c3c7ce'], ['f_carpet', 1, '面会室カーペット', 'Visitor carpet', 'carpet', '#9c4f4f', '#b56a6a', '#863f3f'],
  ['f_marble', 1, '大理石', 'Marble', 'marble', '#ecebe8', '#c9c6c0', '#d8d5d0'], ['f_terrazzo', 1, 'テラゾー', 'Terrazzo', 'terrazzo', '#e4dfd6', '#e07b5a', '#5a8fb0'],
  ['f_camo', 1, '迷彩', 'Camo', 'camo', '#9aa47c', '#7a8560', '#b6b88e'], ['f_halftone', 1, 'アメコミ網点', 'Comic dots', 'halftone', '#fbe9a6', 'rgba(230,80,60,.28)'],
  ['f_hex', 1, 'ハニカム', 'Honeycomb', 'hex', '#f3dd94', '#d9b85c'], ['f_zigzag', 1, 'ジグザグ', 'Zigzag', 'zigzag', '#d6e4ec', '#c1d4df'],
  ['f_argyle', 1, 'アーガイル', 'Argyle', 'argyle', '#d9cfe6', '#cabbe0', 'rgba(255,255,255,.7)'], ['f_mintdot', 1, 'ソーダ水玉', 'Soda dots', 'dots', '#c7ecf2', '#a8dde8'],
  ['f_circuit', 1, '電子ロック基板', 'Circuit board', 'circuit', '#2f5e48', '#3f7a5e', '#c9a24a'], ['f_sewer', 1, '地下水路', 'Sewer', 'water', '#6d8a93', '#86a3ab'],
  ['f_hazardfl', 2, '危険区域', 'Danger zone', 'hazard', '#d8d3c6', 'rgba(255,205,60,.85)'], ['f_lava', 2, '溶鉱炉', 'Furnace', 'lava', '#5b2a20', '#e0662b', '#f2a33a'],
  ['f_starry', 2, '星空の屋上', 'Starry roof', 'stars', '#1d2440', '#ffffff', '#ffd76a'], ['f_pool', 2, 'プールサイド', 'Poolside', 'water', '#7cc9e4', '#a6def0'],
  ['f_popchk', 2, 'ポップチェック', 'Pop checker', 'check', '#ffd2e3', '#b9ecff'], ['f_comic', 2, 'コミック網点', 'Comic halftone', 'halftone', '#cfe8ff', 'rgba(40,90,200,.25)'],
  ['f_gold', 2, '金庫室', 'Bank vault', 'plate', '#c9a24a', '#e6c56d'], ['f_jungle', 2, 'ジャングル', 'Jungle', 'camo', '#5f8a4a', '#3f6a35', '#86ad5c'],
  ['f_cyber', 3, 'サイバー独房', 'Cyber cell', 'circuit', '#120d2a', '#3a2a7a', '#4fe3ff'], ['f_galaxy', 3, '銀河', 'Galaxy', 'stars', '#2a1240', '#ff9de2', '#8fd8ff'],
  ['f_goldchk', 3, '黄金チェック', 'Gold checker', 'check', '#3a2f1a', '#c9a24a'], ['f_candy', 3, 'キャンディ', 'Candy stripes', 'stripe', '#ffe3ef', 'rgba(255,90,150,.35)'],
  ['f_guardchk', 1, '看守室チェック', 'Guardroom checker', 'check', '#cfd8e3', '#b8c4d2'], ['f_nightdot', 2, '夜の水玉', 'Night dots', 'dots', '#2b3448', '#3d4a66'],
  ['f_magma', 3, 'マグマ', 'Magma', 'lava', '#3a120c', '#ff5a1f', '#ffd23a'], ['f_rainbow', 3, 'レインボー', 'Rainbow', 'argyle', '#fff1c9', '#bfe8ff', 'rgba(255,120,180,.6)'],
].map(([id, rar, ja, en, kind, a, b, c]) => ({ id, rar, n: { ja, en }, kind, a, b, c }));
FLOORS.forEach(f => Object.assign(f.n, NAMES[f.id] || {}));

/* ---------------- frames ----------------
   kind → background of the ring round the board (#board::before). a, b: colours */
const RV = c => `radial-gradient(circle, ${c} 0 1.5px, rgba(0,0,0,.45) 1.6px 2.8px, transparent 3px)`;
const XK = {
  solid: (a, b) => `${a}`,
  rivet: (a, b) => `${RV(b)} 0 0 / 18px 18px, linear-gradient(160deg, rgba(255,255,255,.2), transparent 45%, rgba(0,0,0,.2)), ${a}`,
  stripe: (a, b) => `repeating-linear-gradient(-45deg, ${a} 0 10px, ${b} 10px 20px)`,
  wood: (a, b) => `repeating-linear-gradient(90deg, transparent 0 9px, rgba(0,0,0,.12) 9px 10px), repeating-linear-gradient(0deg, transparent 0 14px, ${b} 14px 16px), ${a}`,
  dots: (a, b) => `radial-gradient(circle, ${b} 0 3px, transparent 3.5px) 0 0 / 12px 12px, ${a}`,
  check: (a, b) => `conic-gradient(${b} 25%, ${a} 0 50%, ${b} 0 75%, ${a} 0) 0 0 / 16px 16px`,
  neon: (a, b) => `linear-gradient(${b}, ${b}) center / calc(100% - 6px) calc(100% - 6px) no-repeat, ${a}`,
  metal: (a, b) => `linear-gradient(180deg, ${b}, ${a} 30%, ${b} 50%, ${a} 70%, ${b})`,
  brick: (a, b) => `linear-gradient(${b} 2px, transparent 2px) 0 0 / 20px 10px, linear-gradient(90deg, ${b} 2px, transparent 2px) 0 0 / 20px 20px, linear-gradient(90deg, ${b} 2px, transparent 2px) 10px 10px / 20px 20px, ${a}`,
  tape: (a, b) => `repeating-linear-gradient(45deg, ${a} 0 14px, ${b} 14px 28px)`,
  camo: (a, b) => `radial-gradient(ellipse 40% 30% at 30% 30%, ${b} 95%, transparent) 0 0 / 34px 30px, radial-gradient(ellipse 30% 40% at 70% 70%, rgba(0,0,0,.25) 95%, transparent) 0 0 / 26px 34px, ${a}`,
  halftone: (a, b) => `radial-gradient(circle, ${b} 0 35%, transparent 38%) 0 0 / 7px 7px, ${a}`,
  rainbow: () => 'conic-gradient(from 0deg, #ff5d5d, #ffcd3c, #3ccf7a, #3d8fd1, #b05dff, #ff5d5d)',
  gold: (a, b) => `linear-gradient(135deg, ${a}, ${b} 25%, ${a} 50%, ${b} 75%, ${a})`,
  chain: (a, b) => `radial-gradient(ellipse 45% 30% at 50% 50%, transparent 55%, ${b} 60% 80%, transparent 84%) 0 0 / 18px 12px, ${a}`,
};
const FRAMES = [
  ['steel', 0, 'スチール', 'Steel', 'solid', '#3b4250'], ['x_navy', 0, 'ネイビー', 'Navy', 'solid', '#26365a'], ['x_olive', 0, 'オリーブ', 'Olive', 'solid', '#4f5a33'],
  ['x_rust', 0, 'さび鉄', 'Rusty iron', 'solid', '#7a3f26'], ['x_cream', 0, 'クリーム', 'Cream', 'solid', '#d8ccb0'], ['x_teal', 0, 'ティール', 'Teal', 'solid', '#2d6b6b'],
  ['x_brown', 0, 'こげ茶', 'Umber', 'solid', '#4d3424'], ['x_grey', 0, 'グレー', 'Grey', 'solid', '#6b6f78'], ['x_rivet', 0, 'リベット鋼', 'Riveted steel', 'rivet', '#4a5160', '#cfd4dc'],
  ['x_rivrust', 0, 'リベット赤錆', 'Riveted rust', 'rivet', '#7a3f26', '#e3b08a'], ['x_oak', 0, '木枠', 'Wooden frame', 'wood', '#8a5a36', 'rgba(0,0,0,.18)'],
  ['x_pine', 0, '白木の枠', 'Pine frame', 'wood', '#c9a46e', 'rgba(0,0,0,.12)'], ['x_brick', 0, 'レンガ枠', 'Brick frame', 'brick', '#9a4b33', '#6e3524'],
  ['x_wbrick', 0, '白レンガ', 'White brick', 'brick', '#e3ddd2', '#b9b1a3'], ['x_dots', 0, '水玉フレーム', 'Polka frame', 'dots', '#2b313c', '#f26b1d'],
  ['x_dotpk', 0, 'ピンク水玉', 'Pink polka', 'dots', '#e85a8f', '#ffd1e2'], ['x_chk', 0, 'チェッカー', 'Checker', 'check', '#2a2622', '#e8e3d8'],
  ['x_chkred', 1, 'レッドチェック', 'Red checker', 'check', '#b8322b', '#2a2622'], ['x_hazard', 1, '危険テープ', 'Hazard tape', 'tape', '#ffcd3c', '#1f1c19'],
  ['x_police', 1, '立入禁止', 'Police line', 'tape', '#ffd43b', '#2a2622'], ['x_jail', 1, '囚人服ストライプ', 'Jail stripes', 'stripe', '#f26b1d', '#fff1e3'],
  ['x_candy', 1, 'キャンディ', 'Candy cane', 'stripe', '#e8394d', '#ffffff'], ['x_mintst', 1, 'ミントストライプ', 'Mint stripes', 'stripe', '#3cbfa0', '#e9fff6'],
  ['x_camo', 1, '迷彩', 'Camo', 'camo', '#5d6b3c', '#8a8f5a'], ['x_desert', 1, '砂漠迷彩', 'Desert camo', 'camo', '#b9925e', '#d9b98a'],
  ['x_comic', 1, '網点レッド', 'Comic red', 'halftone', '#d64541', 'rgba(255,255,255,.35)'], ['x_comicb', 1, '網点ブルー', 'Comic blue', 'halftone', '#2f74b5', 'rgba(255,255,255,.35)'],
  ['x_chain', 1, '鎖', 'Chains', 'chain', '#3a3f4a', '#b9c0cc'], ['x_chrome', 1, 'クローム', 'Chrome', 'metal', '#8d96a6', '#e8edf3'],
  ['x_copper', 1, '銅', 'Copper', 'metal', '#9a5a32', '#f0b98a'], ['x_purple', 1, 'パープル', 'Purple', 'solid', '#4b2f72'],
  ['x_sky', 1, 'スカイ', 'Sky', 'solid', '#3d8fd1'], ['x_lime', 1, 'ライム', 'Lime', 'solid', '#6aa82f'],
  ['x_neonpk', 2, 'ネオンピンク', 'Neon pink', 'neon', '#ff4fd8', '#1d1530'], ['x_neoncy', 2, 'ネオンシアン', 'Neon cyan', 'neon', '#4fe3ff', '#0b1a26'],
  ['x_neongr', 2, 'ネオングリーン', 'Neon green', 'neon', '#59ff8a', '#0b1f12'], ['x_brass', 2, '真鍮', 'Brass', 'metal', '#a8822f', '#ffe08a'],
  ['x_silver', 2, '銀', 'Silver', 'metal', '#9aa3ae', '#ffffff'], ['x_popdot', 2, 'ポップ水玉', 'Pop dots', 'dots', '#ffcd3c', '#e8394d'],
  ['x_pinkchk', 2, 'ピンクチェック', 'Pink checker', 'check', '#ff7fb5', '#ffe1ee'], ['x_tigerst', 2, 'タイガー', 'Tiger', 'stripe', '#f28a1d', '#1f1c19'],
  ['x_ice', 2, '氷の枠', 'Ice frame', 'metal', '#8fc6e4', '#f2fbff'], ['x_bluechain', 2, '青い鎖', 'Blue chains', 'chain', '#1f3d6b', '#8fc0ff'],
  ['x_lockdown', 2, '封鎖テープ', 'Lockdown tape', 'tape', '#e8394d', '#ffffff'],
  ['x_gold', 3, '黄金', 'Gold', 'gold', '#b8862b', '#ffe58a'], ['x_rose', 3, 'ローズゴールド', 'Rose gold', 'gold', '#c8796a', '#ffd6c9'],
  ['x_rainbow', 3, 'レインボー', 'Rainbow', 'rainbow'], ['x_neonvi', 3, 'ネオンバイオレット', 'Neon violet', 'neon', '#b05dff', '#140b26'],
  ['x_platinum', 3, 'プラチナ', 'Platinum', 'gold', '#a9b4bf', '#ffffff'], ['x_lava', 3, '溶岩', 'Lava', 'gold', '#8a1f0f', '#ff8a1f'],
].map(([id, rar, ja, en, kind, a, b]) => ({ id, rar, n: { ja, en }, kind, a, b }));
FRAMES.forEach(f => Object.assign(f.n, NAMES[f.id] || {}));

function floorRule(f) {
  const k = FK[f.kind](f.a, f.b, f.c);
  return `body[data-floor=${f.id}] #board.board{--floor:${k.bg};--floor2:${f.b && f.b.startsWith('#') ? f.b : k.bg}}` +
    `body[data-floor=${f.id}] #board .floor{background-color:${k.bg};background-image:${k.img};background-size:${k.size || 'auto'};background-position:${k.pos || '0 0'};background-repeat:${k.rep || 'repeat'}}` +
    `.skp[data-skin=${f.id}]{background-color:${k.bg};background-image:${k.img.replace(/var\(--cs\)/g, '28px')};background-size:${(k.size || 'auto').replace(/var\(--cs\)/g, '28px')};background-position:${(k.pos || '0 0').replace(/var\(--cs\)/g, '28px')};background-repeat:${k.rep || 'repeat'};box-shadow:inset 0 0 0 5px #3b4250}`;
}
function frameRule(x) {
  const bg = XK[x.kind](x.a, x.b), glow = x.kind === 'neon' ? `box-shadow:0 0 14px ${x.a},inset 0 0 10px ${x.a};` : '';
  return `body[data-frame=${x.id}] #board::before{background:${bg};${glow}}.frp[data-frame=${x.id}]{background:${bg};${glow}}`;
}
let sheet = null;
function css() {
  if (sheet) return sheet;
  const base = `#board{isolation:isolate}#board::before{content:'';position:absolute;inset:calc(var(--cs) * -.32);z-index:-1;border-radius:6px;pointer-events:none}
.frp{display:block;width:100%;aspect-ratio:1.4;border:2px solid #2a2622;border-radius:6px;position:relative}
.frp::after{content:'';position:absolute;inset:18%;background:#e2ded4;border:1.5px solid rgba(0,0,0,.35);border-radius:2px}`;
  sheet = base + FLOORS.filter(f => f.kind).map(floorRule).join('') + FRAMES.map(frameRule).join('');
  return sheet;
}
function inject() { if (document.getElementById('jbSkinCss')) return; const s = document.createElement('style'); s.id = 'jbSkinCss'; s.textContent = css(); document.head.appendChild(s); }
const nameOf = (it, lang) => (it.n[lang] || it.n.en);
window.JBSkins = { FLOORS, FRAMES, css, inject, nameOf };
})();
