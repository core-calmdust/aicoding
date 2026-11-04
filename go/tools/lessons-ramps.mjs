// Warm-up ramps for the go lessons (step.ramp + rampUi in ../lessons.json). Run after lessons-build.mjs:
//   node lessons-ramps.mjs          verify every ramp with the capture reader (lessons-lib.mjs) and write them into lessons.json
//   node lessons-ramps.mjs --check  verify only
// A ramp runs before a lesson's scored problems and is not scored:
//   {k:'explain', s, seq:[points], marks:[[pt,cls]], t, body}   read-only; seq = the idea played out (numbered stones)
//   {k:'try', s, ok:[points], look:[points], g, h, y}            any point in ok is right
// Verification: positions legal; seq legal; for 'try' the answer set ok equals EXACTLY the set of first moves that
// achieve chk (solveFirst over the whole board); explain seq[0] is also a winning first move; 10 languages present.
import fs from 'fs';
import path from 'path';
import { specFromRows, solveFirst, legalSetup, after, pt, T } from './lessons-lib.mjs';
const DIR = path.dirname(new URL(import.meta.url).pathname), FILE = path.join(DIR, '..', 'lessons.json');
const LANGS = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
const L = (...a) => Object.fromEntries(LANGS.map((l, i) => [l, a[i]]));
const E9 = '.........', E7 = '.......';

const UI = {
  step: L('準備 {i}/{n}', 'Warm-up {i}/{n}', '热身 {i}/{n}', '준비 {i}/{n}', 'Calentamiento {i}/{n}', 'Échauffement {i}/{n}', 'Aquecimento {i}/{n}', 'Aufwärmen {i}/{n}', 'तैयारी {i}/{n}', 'تمهيد {i}/{n}'),
  next: L('次へ', 'Next', '下一步', '다음', 'Siguiente', 'Suivant', 'Próximo', 'Weiter', 'आगे', 'التالي'),
  main: L('本番の問題へ', 'To the problems', '进入正式题目', '본 문제로', 'A los problemas', 'Aux problèmes', 'Aos problemas', 'Zu den Aufgaben', 'असली सवालों पर', 'إلى المسائل'),
  skip: L('準備をとばす', 'Skip warm-up', '跳过热身', '준비 건너뛰기', 'Saltar calentamiento', 'Passer l’échauffement', 'Pular aquecimento', 'Aufwärmen überspringen', 'तैयारी छोड़ें', 'تخطَّ التمهيد'),
  note: L('準備は点数に入りません。まちがえても何度でもやり直せます。', 'Warm-ups are not scored. Try as often as you like.', '热身不计分，错了可以反复尝试。', '준비 단계는 점수에 들어가지 않습니다. 몇 번이든 다시 할 수 있어요.', 'El calentamiento no puntúa. Inténtalo cuantas veces quieras.', 'L’échauffement n’est pas noté. Réessayez autant que vous voulez.', 'O aquecimento não vale pontos. Tente quantas vezes quiser.', 'Das Aufwärmen zählt nicht. Probiere so oft du willst.', 'तैयारी के अंक नहीं गिने जाते। जितनी बार चाहें कोशिश करें।', 'التمهيد لا يُحتسب. حاول كما تشاء.'),
  ng: L('おしい！もう一度考えてみよう。困ったら「ヒント」を押してね。', 'Not quite! Think again — press Hint if you are stuck.', '差一点！再想想，卡住了就按“提示”。', '아깝다! 다시 생각해 보세요. 막히면 「힌트」를 누르세요.', '¡Casi! Piénsalo otra vez; pulsa Pista si te atascas.', 'Presque ! Réfléchissez encore — touchez Indice si besoin.', 'Quase! Pense de novo — toque em Dica se travar.', 'Fast! Denk noch einmal nach – tippe auf Tipp, wenn du feststeckst.', 'लगभग! फिर सोचिए — अटकें तो संकेत दबाएँ।', 'قريب! فكّر مرة أخرى، واضغط تلميح إن احتجت.'),
  look: L('点線の点に注目しよう。', 'Look at the dashed points.', '注意虚线圈出的点。', '점선으로 표시된 점을 살펴보세요.', 'Fíjate en los puntos con línea discontinua.', 'Regardez les points en pointillés.', 'Observe os pontos tracejados.', 'Schau dir die gestrichelten Punkte an.', 'बिंदुदार घेरे वाले बिंदुओं को देखिए।', 'انظر إلى النقاط المنقّطة.'),
  ans: L('答えは {m} です。', 'The answer is {m}.', '答案是 {m}。', '정답은 {m}입니다.', 'La respuesta es {m}.', 'La réponse est {m}.', 'A resposta é {m}.', 'Die Lösung ist {m}.', 'उत्तर {m} है।', 'الجواب {m}.'),
};

const LAD = [E9, E9, E9, E9, '...X.....', '..XO.....', '....X....', E9, E9];
const NET = [E9, E9, E9, E9, '......O..', '..X......', '..XO.....', '...XX....', E9];
const SNAP = [E9, E9, E9, E9, E9, '...O.....', 'XXXO.....', 'OOXO.....', '..OO.....'];
const DBL = [E7, E7, '..X.X..', '.XO.OX.', E7, E7, E7];

// chk: what the answer must achieve (same vocabulary as lessons-build.mjs)
const RAMPS = {
  ladder: [
    { k: 'explain', rows: LAD, turn: 1, seq: ['E4', 'D3', 'D2', 'C3', 'B3', 'C2', 'B2'], chk: { goal: 'capture', tgt: ['D4'], depth: 14, libsOnly: true },
      t: L('シチョウ＝アタリを続けて追いかける', 'A ladder: atari after atari', '征子＝连续叫吃追下去', '축 = 단수를 계속 이어 쫓기', 'Escalera: atari tras atari', 'Shicho : atari après atari', 'Escada: atari após atari', 'Leiter: Atari nach Atari', 'सीढ़ी: लगातार अटारी', 'السُّلَّم: أتاري بعد أتاري'),
      body: L('<p>白1子はダメが2つ。黒①でアタリすると、白②と逃げてもダメは2つのまま。黒③・⑤・⑦…と<b>逃げた石の正面からアタリ</b>を続けると、白はジグザグに左下へ進み、最後は盤端で取られます。</p><p class="note">見分け方：アタリしたあと、逃げた石のダメがまた2つになるか。3つになる方向からのアタリは失敗です。</p>',
        '<p>The white stone has two liberties. Black ① gives atari; White ② runs, but still has only two liberties. Keep giving atari <b>in front of the runner</b> (③, ⑤, ⑦…) and White zigzags toward the lower left until it is captured at the edge.</p><p class="note">How to tell: after each atari, does the runner end up with two liberties again? An atari that leaves it three is the wrong side.</p>',
        '<p>白一子有两口气。黑①叫吃，白②逃出后仍只有两口气。黑③⑤⑦…<b>挡在逃子前方</b>连续叫吃，白子呈之字形向左下逃，最后在边上被吃。</p><p class="note">判断方法：叫吃后，逃出的棋子是否又只剩两口气？让它变成三口气方向的叫吃就失败了。</p>',
        '<p>백 한 점은 활로가 2개. 흑①로 단수치면 백②로 도망가도 활로는 2개 그대로. 흑③・⑤・⑦…로 <b>도망간 돌 앞쪽에서</b> 단수를 계속하면 백은 지그재그로 왼쪽 아래로 가다 결국 변에서 잡힙니다.</p><p class="note">판별법: 단수 후 도망간 돌의 활로가 다시 2개가 되는가? 3개가 되는 쪽 단수는 실패입니다.</p>',
        '<p>La piedra blanca tiene dos libertades. Negro ① da atari; Blanco ② escapa pero sigue con dos. Si sigues dando atari <b>delante de la que huye</b> (③, ⑤, ⑦…), Blanco zigzaguea hacia abajo a la izquierda y cae en el borde.</p><p class="note">Cómo saberlo: tras cada atari, ¿vuelve a tener dos libertades? Si le deja tres, era el lado equivocado.</p>',
        '<p>La pierre blanche a deux libertés. Noir ① fait atari ; Blanc ② s’échappe mais n’a toujours que deux libertés. Continuez l’atari <b>devant la pierre qui fuit</b> (③, ⑤, ⑦…) : Blanc zigzague vers le bas à gauche et est pris au bord.</p><p class="note">Le test : après chaque atari, la pierre retombe-t-elle à deux libertés ? Un atari qui lui en laisse trois est du mauvais côté.</p>',
        '<p>A pedra branca tem duas liberdades. Preto ① dá atari; Branco ② foge, mas segue com duas. Continue o atari <b>na frente da pedra que foge</b> (③, ⑤, ⑦…) e Branco zigue-zagueia para baixo à esquerda até ser capturado na borda.</p><p class="note">Como saber: após cada atari, ela volta a ter duas liberdades? Se ficar com três, foi o lado errado.</p>',
        '<p>Der weiße Stein hat zwei Freiheiten. Schwarz ① gibt Atari; Weiß ② läuft weg, hat aber weiter nur zwei. Gib immer wieder Atari <b>vor dem fliehenden Stein</b> (③, ⑤, ⑦…), und Weiß zickzackt nach links unten, bis er am Rand gefangen wird.</p><p class="note">So erkennst du es: Hat der Stein nach jedem Atari wieder zwei Freiheiten? Bleiben ihm drei, war es die falsche Seite.</p>',
        '<p>सफ़ेद पत्थर की दो साँसें हैं। काला ① अटारी देता है; सफ़ेद ② भागता है, पर साँसें दो ही रहती हैं। <b>भागते पत्थर के सामने से</b> अटारी देते रहें (③, ⑤, ⑦…) तो सफ़ेद टेढ़ा-मेढ़ा नीचे बाएँ जाता है और किनारे पर पकड़ा जाता है।</p><p class="note">पहचान: हर अटारी के बाद क्या उसकी फिर दो साँसें बचती हैं? तीन बचें तो दिशा ग़लत थी।</p>',
        '<p>للحجر الأبيض حريتان. يعطي الأسود ① أتاري؛ يهرب الأبيض ② لكن تبقى له حريتان. واصل الأتاري <b>أمام الحجر الهارب</b> (③، ⑤، ⑦…) فيتعرّج الأبيض نحو أسفل اليسار حتى يُؤسر عند الحافة.</p><p class="note">كيف تعرف: بعد كل أتاري، هل تعود له حريتان؟ إن بقيت ثلاث فالجهة خاطئة.</p>') },
    { k: 'try', rows: T.flipH(LAD), turn: 1, chk: { goal: 'capture', tgt: ['F4'], depth: 14, libsOnly: true }, ok: ['E4', 'F3'], look: ['E4', 'F3'],
      g: L('左右を反対にした形。シチョウで取る最初のアタリを。', 'The mirror image: play the first atari of the ladder.', '左右翻转的形：下出征子的第一手叫吃。', '좌우를 뒤집은 모양. 축으로 잡는 첫 단수를.', 'La imagen espejo: juega el primer atari de la escalera.', 'L’image miroir : jouez le premier atari du shicho.', 'A imagem espelhada: jogue o primeiro atari da escada.', 'Das Spiegelbild: spiele das erste Atari der Leiter.', 'उलटी आकृति: सीढ़ी की पहली अटारी खेलिए।', 'الصورة المعكوسة: العب أول أتاري في السلّم.'),
      h: L('白のダメは2つ。どちらからアタリしても、逃げた先のダメが2つのままか確かめよう。', 'White has two liberties. From either side, check whether the runner still has only two liberties.', '白有两口气。不论从哪边叫吃，都看看逃子是否仍只有两口气。', '백의 활로는 2개. 어느 쪽에서 단수쳐도 도망간 돌의 활로가 2개 그대로인지 확인하세요.', 'Blanco tiene dos libertades. Desde cualquier lado, comprueba si la que huye sigue con dos.', 'Blanc a deux libertés. De chaque côté, vérifiez si la pierre en fuite n’en garde que deux.', 'Branco tem duas liberdades. De qualquer lado, veja se a que foge segue com duas.', 'Weiß hat zwei Freiheiten. Prüfe für beide Seiten, ob der Flüchtende bei zwei bleibt.', 'सफ़ेद की दो साँसें हैं। किसी भी तरफ़ से जाँचिए कि भागने पर भी दो ही बचती हैं या नहीं।', 'للأبيض حريتان. من أي جهة، تحقّق هل تبقى للهارب حريتان فقط.'),
      y: L('正解！ここは周りに白の味方がいないので、どちらからアタリしてもシチョウで取れます。', 'Right! No white stone stands in the way here, so the ladder works from either side.', '正确！这里周围没有白的援兵，从哪边叫吃都能征死。', '정답! 주변에 백의 지원군이 없어 어느 쪽에서 단수쳐도 축으로 잡힙니다.', '¡Bien! Aquí no hay piedras blancas en el camino: la escalera funciona desde ambos lados.', 'Bien ! Aucune pierre blanche sur le chemin : le shicho marche des deux côtés.', 'Certo! Nenhuma pedra branca no caminho: a escada funciona dos dois lados.', 'Richtig! Keine weißen Steine im Weg – die Leiter klappt von beiden Seiten.', 'सही! रास्ते में कोई सफ़ेद पत्थर नहीं, इसलिए दोनों तरफ़ से सीढ़ी चलती है।', 'صحيح! لا حجر أبيض في الطريق، فيعمل السلّم من الجهتين.') },
    { k: 'try', rows: [E9, '......O..', E9, E9, '...X.....', '..XO.....', '....X....', E9, E9], turn: 1, chk: { goal: 'capture', tgt: ['D4'], depth: 14, libsOnly: true }, ok: ['E4'], look: ['G8', 'E4', 'D3'],
      g: L('右上に白石が1つ。今度はどちらからアタリする？', 'A white stone sits at the upper right. Which side do you give atari from now?', '右上有一颗白子。这次从哪边叫吃？', '오른쪽 위에 백돌이 하나. 이번엔 어느 쪽에서 단수칠까요?', 'Hay una piedra blanca arriba a la derecha. ¿Desde qué lado das atari ahora?', 'Une pierre blanche est en haut à droite. De quel côté faire atari maintenant ?', 'Há uma pedra branca no alto à direita. De que lado dar atari agora?', 'Oben rechts steht ein weißer Stein. Von welcher Seite gibst du jetzt Atari?', 'ऊपर दाएँ एक सफ़ेद पत्थर है। अब किस तरफ़ से अटारी देंगे?', 'هناك حجر أبيض أعلى اليمين. من أي جهة تعطي الأتاري الآن؟'),
      h: L('白が右上へ逃げると、右上の白石につながってしまいます。左下へ逃がす向きからアタリしよう。', 'If White runs toward the upper right it connects to that white stone. Give atari so that it has to run toward the lower left.', '白若往右上逃，就会和右上的白子连上。从让它往左下逃的方向叫吃。', '백이 오른쪽 위로 도망가면 그 백돌과 이어집니다. 왼쪽 아래로 도망가게 하는 방향에서 단수치세요.', 'Si Blanco huye arriba a la derecha, se une a esa piedra. Da atari para que tenga que huir abajo a la izquierda.', 'Si Blanc fuit vers le haut à droite, il rejoint cette pierre. Faites atari pour qu’il doive fuir vers le bas à gauche.', 'Se Branco fugir para cima à direita, liga-se àquela pedra. Dê atari para que fuja para baixo à esquerda.', 'Läuft Weiß nach rechts oben, verbindet er sich mit dem Stein dort. Gib Atari so, dass er nach links unten muss.', 'सफ़ेद ऊपर दाएँ भागे तो उस पत्थर से जुड़ जाएगा। ऐसी दिशा से अटारी दीजिए कि उसे नीचे बाएँ भागना पड़े।', 'إن هرب الأبيض نحو أعلى اليمين اتصل بذلك الحجر. أعطِ الأتاري بحيث يُجبر على الهرب نحو أسفل اليسار.'),
      y: L('正解！E4 からなら白は左下へ逃げるしかなく、シチョウで取れます。D3 からだと右上の白石（シチョウアタリ）につながります。', 'Right! From E4 White can only run to the lower left and the ladder works. From D3 it would reach the white ladder breaker at the upper right.', '正确！从 E4 叫吃，白只能往左下逃，征子成立。从 D3 叫吃会逃向右上的白子（引征）。', '정답! E4에서라면 백은 왼쪽 아래로만 도망가 축으로 잡힙니다. D3에서면 오른쪽 위 백돌(축머리)과 이어집니다.', '¡Bien! Desde E4 Blanco solo huye abajo a la izquierda y la escalera funciona. Desde D3 llegaría a la piedra que rompe la escalera.', 'Bien ! Depuis E4, Blanc ne peut fuir que vers le bas à gauche : le shicho marche. Depuis D3, il atteindrait la pierre casse-shicho.', 'Certo! De E4 Branco só foge para baixo à esquerda e a escada funciona. De D3 chegaria à pedra que quebra a escada.', 'Richtig! Von E4 aus kann Weiß nur nach links unten – die Leiter klappt. Von D3 aus erreichte er den Leiterbrecher oben rechts.', 'सही! E4 से सफ़ेद सिर्फ़ नीचे बाएँ भाग सकता है और सीढ़ी चलती है। D3 से वह ऊपर दाएँ के सीढ़ी-तोड़ पत्थर तक पहुँच जाता।', 'صحيح! من E4 لا يهرب الأبيض إلا نحو أسفل اليسار فيعمل السلّم. ومن D3 كان سيصل إلى الحجر كاسر السلّم.') },
  ],
  net: [
    { k: 'explain', rows: NET, turn: 1, seq: ['E4'], marks: [['E3', 'x'], ['D4', 'x']], chk: { goal: 'capture', tgt: ['D3'], depth: 6 },
      t: L('ゲタ＝アタリにせず、ふたをする', 'A net: close the exits without atari', '枷＝不叫吃，先盖住出口', '장문 = 단수 대신 뚜껑 덮기', 'Red: cierra las salidas sin dar atari', 'Filet : fermer les sorties sans atari', 'Rede: feche as saídas sem atari', 'Netz: Ausgänge schließen ohne Atari', 'जाल: अटारी दिए बिना रास्ता बंद', 'الشبكة: أغلق المخارج بلا أتاري'),
      body: L('<p>白1子の逃げ道は ×印の2か所。黒①は、そのどちらにも隣接する点に打って<b>ふた</b>をします。アタリではありませんが、白がどちらへ出ても、黒がすぐアタリで押し戻して取れます。</p><p class="note">右上の白石が邪魔でシチョウが成り立たないとき、ゲタの出番です。</p>',
        '<p>The white stone can get out through the two × points. Black ① plays the point next to both and <b>puts a lid on it</b>. It is not atari, but whichever way White pushes, Black answers with atari and captures.</p><p class="note">Use a net when a ladder fails — here the white stone at the upper right would break the ladder.</p>',
        '<p>白一子的出路是两个×处。黑①下在同时挨着这两处的点上<b>盖住</b>。虽然不是叫吃，但白不论从哪边冲出，黑都能马上叫吃把它挡回并吃掉。</p><p class="note">右上的白子使征子不成立时，就轮到枷出场。</p>',
        '<p>백 한 점의 출구는 × 두 곳. 흑①은 그 둘 모두에 붙은 점에 두어 <b>뚜껑</b>을 덮습니다. 단수는 아니지만 백이 어느 쪽으로 나와도 흑이 바로 단수로 막아 잡습니다.</p><p class="note">오른쪽 위 백돌 때문에 축이 안 될 때 장문이 나섭니다.</p>',
        '<p>La piedra blanca puede salir por las dos ×. Negro ① juega en el punto junto a ambas y <b>pone la tapa</b>. No es atari, pero salga por donde salga, Negro responde con atari y captura.</p><p class="note">Usa la red cuando falla la escalera: aquí la piedra blanca de arriba a la derecha la rompería.</p>',
        '<p>La pierre blanche peut sortir par les deux ×. Noir ① joue au point voisin des deux et <b>met un couvercle</b>. Ce n’est pas un atari, mais quel que soit le côté où Blanc pousse, Noir répond par atari et capture.</p><p class="note">Le filet sert quand le shicho échoue : ici la pierre blanche en haut à droite le casserait.</p>',
        '<p>A pedra branca pode sair pelos dois ×. Preto ① joga no ponto vizinho aos dois e <b>põe a tampa</b>. Não é atari, mas para onde Branco empurrar, Preto responde com atari e captura.</p><p class="note">Use a rede quando a escada falha: aqui a pedra branca no alto à direita a quebraria.</p>',
        '<p>Der weiße Stein kann über die beiden × entkommen. Schwarz ① setzt auf den Punkt neben beiden und <b>legt einen Deckel drauf</b>. Kein Atari – aber wohin Weiß auch drängt, Schwarz antwortet mit Atari und fängt.</p><p class="note">Das Netz hilft, wenn die Leiter scheitert: hier bräche der weiße Stein oben rechts sie.</p>',
        '<p>सफ़ेद पत्थर दो × बिंदुओं से निकल सकता है। काला ① दोनों के पास वाले बिंदु पर <b>ढक्कन</b> लगाता है। यह अटारी नहीं, पर सफ़ेद किधर भी निकले, काला तुरंत अटारी देकर पकड़ लेता है।</p><p class="note">जब सीढ़ी न चले तब जाल काम आता है: यहाँ ऊपर दाएँ का सफ़ेद पत्थर सीढ़ी तोड़ देता।</p>',
        '<p>يستطيع الحجر الأبيض الخروج من نقطتي ×. يلعب الأسود ① في النقطة المجاورة لكلتيهما <b>فيضع غطاءً</b>. ليس أتاري، لكن أينما دفع الأبيض يرد الأسود بأتاري ويأسر.</p><p class="note">استخدم الشبكة حين يفشل السلّم: هنا يكسره الحجر الأبيض أعلى اليمين.</p>') },
    { k: 'try', rows: T.flipH(NET), turn: 1, chk: { goal: 'capture', tgt: ['F3'], depth: 6 }, ok: ['E4'], look: ['E3', 'F4'],
      g: L('左右反対の形。ゲタで白を取ろう。', 'The mirror image: capture White with a net.', '左右翻转的形：用枷吃白。', '좌우를 뒤집은 모양. 장문으로 백을 잡으세요.', 'La imagen espejo: captura con una red.', 'L’image miroir : prenez Blanc avec un filet.', 'A imagem espelhada: capture com uma rede.', 'Das Spiegelbild: fang Weiß mit einem Netz.', 'उलटी आकृति: जाल से सफ़ेद पकड़िए।', 'الصورة المعكوسة: أسر الأبيض بشبكة.'),
      h: L('白の逃げ道は2か所。その両方に隣り合う点はどこ？', 'White has two ways out. Which point touches both?', '白有两个出口。同时挨着两处的点在哪里？', '백의 출구는 두 곳. 둘 다에 붙은 점은?', 'Blanco tiene dos salidas. ¿Qué punto toca ambas?', 'Blanc a deux sorties. Quel point touche les deux ?', 'Branco tem duas saídas. Que ponto toca ambas?', 'Weiß hat zwei Ausgänge. Welcher Punkt berührt beide?', 'सफ़ेद के दो रास्ते हैं। कौन-सा बिंदु दोनों को छूता है?', 'للأبيض مخرجان. أي نقطة تلامس كليهما؟'),
      y: L('正解！E4 のふたで、白はどちらへ出てもアタリで取られます。', 'Right! With the lid on E4, White is captured whichever way it comes out.', '正确！E4 盖住后，白从哪边出来都会被叫吃吃掉。', '정답! E4 뚜껑으로 백은 어디로 나와도 단수로 잡힙니다.', '¡Bien! Con la tapa en E4, Blanco cae salga por donde salga.', 'Bien ! Avec le couvercle en E4, Blanc est pris où qu’il sorte.', 'Certo! Com a tampa em E4, Branco cai por onde sair.', 'Richtig! Mit dem Deckel auf E4 wird Weiß gefangen, wohin er auch will.', 'सही! E4 के ढक्कन से सफ़ेद किधर भी निकले, पकड़ा जाएगा।', 'صحيح! مع الغطاء في E4 يُؤسر الأبيض أينما خرج.') },
  ],
  snapback: [
    { k: 'explain', rows: SNAP, turn: 1, seq: ['B1', 'A1', 'B1'], chk: { goal: 'capture', tgt: ['A2'], depth: 3 },
      t: L('ウッテガエシ＝わざと取らせて取り返す', 'Snapback: let it be taken, then take back more', '倒扑＝故意送吃再吃回', '환격 = 일부러 잡히고 되잡기', 'Snapback: deja que te capturen y recupera más', 'Snapback : se faire prendre pour reprendre plus', 'Snapback: deixe capturar e recupere mais', 'Snapback: schlagen lassen, mehr zurückholen', 'स्नैपबैक: पकड़वाकर ज़्यादा वापस लो', 'الاسترداد: دعه يأسر ثم استرد أكثر'),
      body: L('<p>黒①は白のダメ（B1）に<b>わざと</b>飛び込む手。白②で取られますが、取った白石は A1 の1つだけでダメがなくなり、黒③（B1 にもう一度）で白3子をまとめて取れます。</p><p class="note">探し方：相手のダメに打つと取られる。でも「取ったあとの形」がアタリのままなら、ウッテガエシ。</p>',
        '<p>Black ① throws in <b>on purpose</b> at White’s liberty B1. White ② captures it, but the capturing stones are left with no liberty except the one Black just retook: Black ③ (B1 again) captures three white stones.</p><p class="note">How to spot it: playing on their liberty gets captured — but if the shape after the capture is still in atari, it is a snapback.</p>',
        '<p>黑①<b>故意</b>扑进白的气（B1）。白②提掉，但提子后白棋只剩一口气，黑③（再下 B1）一次吃掉白三子。</p><p class="note">找法：下在对方气上会被提。但若“提子后的形”仍是叫吃，就是倒扑。</p>',
        '<p>흑①은 백의 활로(B1)에 <b>일부러</b> 뛰어드는 수. 백②로 잡히지만 잡은 뒤 백은 활로가 하나뿐이라, 흑③(다시 B1)으로 백 3점을 한꺼번에 잡습니다.</p><p class="note">찾는 법: 상대 활로에 두면 잡힌다. 하지만 “잡은 뒤의 모양”이 그대로 단수면 환격입니다.</p>',
        '<p>Negro ① se mete <b>a propósito</b> en la libertad B1 de Blanco. Blanco ② la captura, pero tras capturar le queda una sola libertad: Negro ③ (B1 otra vez) captura tres piedras blancas.</p><p class="note">Cómo verlo: jugar en su libertad te hace perder la piedra, pero si tras la captura su forma sigue en atari, es un snapback.</p>',
        '<p>Noir ① se jette <b>exprès</b> sur la liberté B1 de Blanc. Blanc ② capture, mais il ne lui reste alors qu’une liberté : Noir ③ (B1 à nouveau) prend trois pierres blanches.</p><p class="note">Pour le voir : jouer sur sa liberté se fait prendre — mais si la forme après la prise reste en atari, c’est un snapback.</p>',
        '<p>Preto ① entra <b>de propósito</b> na liberdade B1 de Branco. Branco ② captura, mas depois fica com uma só liberdade: Preto ③ (B1 de novo) captura três pedras brancas.</p><p class="note">Como ver: jogar na liberdade dele é ser capturado — mas se a forma após a captura segue em atari, é snapback.</p>',
        '<p>Schwarz ① setzt <b>absichtlich</b> auf Weiß’ Freiheit B1. Weiß ② schlägt, hat danach aber nur noch eine Freiheit: Schwarz ③ (wieder B1) fängt drei weiße Steine.</p><p class="note">So erkennst du es: Auf ihre Freiheit gesetzt, wirst du geschlagen – steht die Form nach dem Schlagen aber weiter im Atari, ist es ein Snapback.</p>',
        '<p>काला ① <b>जान-बूझकर</b> सफ़ेद की साँस B1 पर रखता है। सफ़ेद ② उसे पकड़ लेता है, पर उसके बाद उसकी एक ही साँस बचती है: काला ③ (फिर B1) तीन सफ़ेद पत्थर पकड़ता है।</p><p class="note">पहचान: उनकी साँस पर रखने से पत्थर पकड़ा जाता है — पर पकड़ने के बाद भी आकार अटारी में रहे तो स्नैपबैक।</p>',
        '<p>يرمي الأسود ① حجرًا <b>عمدًا</b> في حرية الأبيض B1. يأسره الأبيض ②، لكن لا تبقى له بعدها إلا حرية واحدة: الأسود ③ (B1 مجددًا) يأسر ثلاثة أحجار بيضاء.</p><p class="note">كيف تراه: اللعب في حريته يُؤسر — لكن إن بقي شكله بعد الأسر في أتاري فهو استرداد.</p>') },
    { k: 'try', rows: T.flipH(SNAP), turn: 1, chk: { goal: 'capture', tgt: ['J2'], depth: 3 }, ok: ['H1'], look: ['H1', 'J1'],
      g: L('左右反対の形。ウッテガエシで取ろう。', 'The mirror image: capture with a snapback.', '左右翻转的形：用倒扑吃子。', '좌우를 뒤집은 모양. 환격으로 잡으세요.', 'La imagen espejo: captura con snapback.', 'L’image miroir : prenez par snapback.', 'A imagem espelhada: capture com snapback.', 'Das Spiegelbild: fang mit Snapback.', 'उलटी आकृति: स्नैपबैक से पकड़िए।', 'الصورة المعكوسة: أسر بالاسترداد.'),
      h: L('白のダメはどこ？取られてもいいから、そこへ打ち込んでみよう。', 'Where are White’s liberties? Play into one even though it will be captured.', '白的气在哪里？即使会被提，也扑进去试试。', '백의 활로는 어디? 잡혀도 좋으니 거기 뛰어들어 보세요.', '¿Dónde están las libertades de Blanco? Juega en una aunque te la capturen.', 'Où sont les libertés de Blanc ? Jouez dedans même si on vous prend.', 'Onde estão as liberdades de Branco? Jogue numa mesmo sendo capturado.', 'Wo sind Weiß’ Freiheiten? Setz hinein, auch wenn du geschlagen wirst.', 'सफ़ेद की साँसें कहाँ हैं? पकड़े जाने पर भी वहाँ रखिए।', 'أين حريات الأبيض؟ العب في إحداها حتى لو أُسرت.'),
      y: L('正解！H1 を取らせれば、取った白がアタリのまま。もう一度 H1 で取り返せます。', 'Right! White captures H1 but stays in atari, and you retake at H1.', '正确！让白提掉 H1 后它仍是叫吃，再下 H1 吃回。', '정답! H1을 잡게 하면 백은 단수 그대로, 다시 H1로 되잡습니다.', '¡Bien! Blanco captura H1 pero sigue en atari, y recuperas en H1.', 'Bien ! Blanc prend H1 mais reste en atari : vous reprenez en H1.', 'Certo! Branco captura H1 mas segue em atari, e você recaptura em H1.', 'Richtig! Weiß schlägt H1, bleibt aber im Atari – du holst in H1 zurück.', 'सही! सफ़ेद H1 पकड़ता है पर अटारी में रहता है, फिर H1 पर वापस पकड़िए।', 'صحيح! يأسر الأبيض H1 لكنه يبقى في أتاري، فتسترد في H1.') },
  ],
  double: [
    { k: 'explain', rows: DBL, turn: 1, seq: ['D4'], marks: [['C3', 'x'], ['E3', 'x']], chk: { goal: 'capture', tgt: ['C4', 'E4'], depth: 2 },
      t: L('両アタリ＝2つを同時にアタリ', 'Double atari: two ataris at once', '双叫吃＝同时叫吃两块', '양단수 = 둘을 동시에 단수', 'Doble atari: dos ataris a la vez', 'Double atari : deux ataris à la fois', 'Atari duplo: dois ataris de uma vez', 'Doppel-Atari: zwei Ataris zugleich', 'दोहरी अटारी: एक साथ दो अटारी', 'الأتاري المزدوج: أتاريان معًا'),
      body: L('<p>白2子はどちらもダメ2つで、<b>D4 が共通のダメ</b>。黒①を D4 に打つと、両方が同時にアタリ（残りのダメは ×印）。</p><p>白は片方しか逃げられないので、もう片方が取れます。</p><p class="note">探し方：ダメの少ない相手の石が2つあったら、共通のダメを探す。</p>',
        '<p>Each white stone has two liberties, and <b>D4 is shared</b>. Black ① on D4 puts both in atari at once (their last liberties are the ×).</p><p>White can save only one, so you capture the other.</p><p class="note">How to find it: when two enemy stones are short of liberties, look for a liberty they share.</p>',
        '<p>白两子各有两口气，<b>D4 是共同的气</b>。黑①下 D4，两边同时被叫吃（剩下的气是×处）。</p><p>白只能救一边，另一边就被吃。</p><p class="note">找法：对方有两块气少的棋，就找它们共同的气。</p>',
        '<p>백 두 점은 각각 활로가 2개이고 <b>D4가 공통 활로</b>. 흑①을 D4에 두면 둘 다 동시에 단수(남은 활로는 × 표시).</p><p>백은 한쪽만 살릴 수 있으니 다른 쪽을 잡습니다.</p><p class="note">찾는 법: 활로가 적은 상대 돌이 둘 있으면 공통 활로를 찾으세요.</p>',
        '<p>Cada piedra blanca tiene dos libertades y <b>D4 es común</b>. Negro ① en D4 pone ambas en atari (sus últimas libertades son las ×).</p><p>Blanco solo salva una, así que capturas la otra.</p><p class="note">Cómo verlo: si dos piedras rivales andan cortas de libertades, busca una que compartan.</p>',
        '<p>Chaque pierre blanche a deux libertés et <b>D4 est commune</b>. Noir ① en D4 met les deux en atari (leurs dernières libertés sont les ×).</p><p>Blanc n’en sauve qu’une : vous prenez l’autre.</p><p class="note">Pour le voir : deux pierres adverses à court de libertés ? Cherchez une liberté commune.</p>',
        '<p>Cada pedra branca tem duas liberdades e <b>D4 é comum</b>. Preto ① em D4 põe as duas em atari (as últimas liberdades são os ×).</p><p>Branco só salva uma, então você captura a outra.</p><p class="note">Como ver: duas pedras adversárias com poucas liberdades? Procure uma liberdade comum.</p>',
        '<p>Jeder weiße Stein hat zwei Freiheiten, und <b>D4 ist gemeinsam</b>. Schwarz ① auf D4 setzt beide ins Atari (ihre letzten Freiheiten sind die ×).</p><p>Weiß kann nur einen retten – du fängst den anderen.</p><p class="note">So findest du es: Zwei gegnerische Steine mit wenig Freiheiten? Suche eine gemeinsame.</p>',
        '<p>हर सफ़ेद पत्थर की दो साँसें हैं और <b>D4 साझा</b> है। काला ① D4 पर दोनों को एक साथ अटारी देता है (आख़िरी साँसें × वाली)।</p><p>सफ़ेद एक ही बचा सकता है, दूसरा आप पकड़ लेते हैं।</p><p class="note">पहचान: विरोधी के दो पत्थरों की साँसें कम हों तो उनकी साझा साँस खोजिए।</p>',
        '<p>لكل حجر أبيض حريتان، و<b>D4 مشتركة</b>. الأسود ① في D4 يضع الحجرين في أتاري معًا (آخر حرياتهما علامات ×).</p><p>لا ينقذ الأبيض إلا واحدًا، فتأسر الآخر.</p><p class="note">كيف تجده: حجران للخصم بحريات قليلة؟ ابحث عن حرية مشتركة.</p>') },
    { k: 'try', rows: [E7, E7, E7, '..X.X..', '.XO.OX.', E7, E7], turn: 1, chk: { goal: 'capture', tgt: ['C3', 'E3'], depth: 2 }, ok: ['D3'], look: ['C3', 'E3'],
      g: L('白2子に両アタリをかけよう。', 'Put both white stones in atari at once.', '对白两子双叫吃。', '백 두 점에 양단수를 거세요.', 'Pon las dos piedras blancas en atari a la vez.', 'Mettez les deux pierres blanches en atari d’un coup.', 'Ponha as duas pedras brancas em atari de uma vez.', 'Setz beide weißen Steine gleichzeitig ins Atari.', 'दोनों सफ़ेद पत्थरों को एक साथ अटारी दीजिए।', 'ضع الحجرين الأبيضين في أتاري معًا.'),
      h: L('2つの白石に共通するダメはどこ？', 'Which liberty do the two white stones share?', '两颗白子共同的气在哪里？', '두 백돌의 공통 활로는?', '¿Qué libertad comparten las dos piedras blancas?', 'Quelle liberté les deux pierres blanches partagent-elles ?', 'Que liberdade as duas pedras brancas compartilham?', 'Welche Freiheit teilen die beiden weißen Steine?', 'दोनों सफ़ेद पत्थरों की साझा साँस कौन-सी है?', 'ما الحرية المشتركة بين الحجرين الأبيضين؟'),
      y: L('正解！D3 で両方がアタリ。白は片方しか助けられません。', 'Right! D3 puts both in atari; White can save only one.', '正确！D3 让两边都被叫吃，白只能救一边。', '정답! D3로 둘 다 단수, 백은 한쪽만 살릴 수 있습니다.', '¡Bien! D3 pone ambas en atari; Blanco solo salva una.', 'Bien ! D3 met les deux en atari ; Blanc n’en sauve qu’une.', 'Certo! D3 põe as duas em atari; Branco só salva uma.', 'Richtig! D3 setzt beide ins Atari – Weiß rettet nur einen.', 'सही! D3 से दोनों अटारी में, सफ़ेद एक ही बचा सकता है।', 'صحيح! D3 تضعهما في أتاري، ولا ينقذ الأبيض إلا واحدًا.') },
  ],
};

// ---- verify + build
const errors = [], out = {};
const txt = (id, o, k) => { for (const l of LANGS) if (!o || typeof o[l] !== 'string' || !o[l]) errors.push(`${id}: missing ${k}.${l}`); };
for (const k in UI) txt('ui', UI[k], k);
for (const [id, items] of Object.entries(RAMPS)) {
  out[id] = items.map((it, j) => {
    const tag = id + '#' + j, spec = specFromRows(it.rows, it.turn), n = spec.n;
    const bad = legalSetup(spec); if (bad.length) errors.push(tag + ': stones without liberties ' + bad);
    const c = it.chk, r = solveFirst(spec, c.goal, c.tgt, c), wins = r.wins.slice().sort();
    const item = { k: it.k, s: spec };
    if (it.k === 'explain') {
      try { after(spec, it.seq); } catch (e) { errors.push(tag + ': ' + e.message); }
      if (!wins.includes(it.seq[0])) errors.push(`${tag}: seq starts with ${it.seq[0]} but winning moves are ${wins}`);
      txt(tag, it.t, 't'); txt(tag, it.body, 'body');
      Object.assign(item, { seq: it.seq, marks: it.marks || [], t: it.t, body: it.body });
      console.log('ok', tag, 'seq', it.seq.join(' '), '(winning first moves:', wins.join(',') + ')');
    } else {
      if (wins.join() !== it.ok.slice().sort().join()) errors.push(`${tag}: ok ${it.ok} but the reader's winning moves are ${wins}`);
      for (const q of it.look || []) pt(q, n);
      txt(tag, it.g, 'g'); txt(tag, it.h, 'h'); txt(tag, it.y, 'y');
      Object.assign(item, { ok: it.ok, look: it.look || [], g: it.g, h: it.h, y: it.y });
      console.log('ok', tag, 'answers', it.ok.join(','), '= reader', wins.join(','));
    }
    return item;
  });
}
if (errors.length) { console.log(errors.join('\n')); console.log(errors.length + ' problem(s)'); process.exit(1); }
if (!process.argv.includes('--check')) {
  const D = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  D.rampUi = UI;
  for (const s of D.steps) delete s.ramp;
  for (const id in out) { const s = D.steps.find(x => x.id === id); if (!s) throw new Error('no lesson ' + id); s.ramp = out[id]; }
  fs.writeFileSync(FILE, JSON.stringify(D, null, 1));
  console.log('ramps written:', Object.entries(out).map(([k, v]) => k + ' ' + v.length).join(', '));
}
console.log(`all ${Object.values(out).flat().length} ramp items OK`);
