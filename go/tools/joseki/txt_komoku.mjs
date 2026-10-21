export const T = {};

T.komoku_ikken = {
  level: 3, side: 1,
  label: ['小目', '3-4'],
  title: ['小ゲイマガカリ・一間バサミ', 'Small knight approach, one-space low pincer'],
  short: ['厳しい一間バサミ。白は小目の肩から形を作り、黒は隅と右辺を固める', 'A severe pincer: White makes shape from the shoulder, Black secures corner and right side'],
  story: [
    '<p>小目（3-4）への<bdi>P17</bdi>の小ゲイマガカリは、最もよく打たれるカカリです。黒は受けるか、ハサむかを選びます。<bdi>N17</bdi>の一間バサミは最も厳しいハサミの一つで、白に楽に上辺で根拠を作らせません。</p><p>現代の白の代表的な対応は、<bdi>Q15</bdi>と小目の肩から打って黒を隅に押し込みながら外に出る手です。黒は<bdi>R15</bdi>・<bdi>S13</bdi>と低く構えて隅と右辺の根拠を確保します。</p><p>その後は白が<bdi>L17</bdi>でハサミの石を逆に挟むなど、戦いになりやすい定石です。黒は隅の地、白は中央への勢いを得ます。</p>',
    '<p>The small knight approach at <bdi>P17</bdi> is the most common approach to a 3-4 stone. Black can answer or pincer. The one-space low pincer at <bdi>N17</bdi> is one of the most severe, denying White an easy base on the top.</p><p>White\'s typical modern answer is <bdi>Q15</bdi>, on the shoulder of the 3-4 stone: it presses Black into the corner while heading out. Black stays low with <bdi>R15</bdi> and <bdi>S13</bdi>, securing the corner and a base on the right side.</p><p>Fighting often follows, e.g. White counter-pincering the pincer stone at <bdi>L17</bdi>. Black gets the corner, White momentum toward the centre.</p>'],
  notes: [
    ['白は<bdi>P17</bdi>に小ゲイマガカリ。小目へのカカリで最もよく打たれる手です。', 'White approaches at <bdi>P17</bdi> with a small knight\'s move — the most common approach to a 3-4 stone.'],
    ['黒は<bdi>N17</bdi>と一間低バサミ。カカリの石の上辺への足場を奪う厳しいハサミです。受けるなら<bdi>Q14</bdi>のケイマ受けや<bdi>Q15</bdi>のコスミ（変化図）があります。', 'Black pincers one space away at <bdi>N17</bdi>, taking away the approach stone\'s room on the top side. To answer quietly instead, see the knight\'s move <bdi>Q14</bdi> or the diagonal <bdi>Q15</bdi> (variations).'],
    ['白は<bdi>Q15</bdi>と黒の小目の肩に打ちます。黒を隅に押し込みつつ、自分は中央に出る現代の代表的な手です。昔は<bdi>P15</bdi>の一間トビもよく打たれました。', 'White plays <bdi>Q15</bdi>, on the shoulder of the 3-4 stone — pressing Black into the corner while heading out. The modern standard; the one-space jump <bdi>P15</bdi> was the older choice.'],
    ['黒は<bdi>R15</bdi>とノビて隅を守り、右辺に向かいます。', 'Black extends to <bdi>R15</bdi>, defending the corner and heading for the right side.'],
    ['白は<bdi>Q14</bdi>とノビて黒を低く抑えます。', 'White extends to <bdi>Q14</bdi>, keeping Black low.'],
    ['黒は<bdi>S13</bdi>と二線にケイマして根拠を確保します。低いですが眼形が豊富で、攻められる心配がありません。白は外に厚みを得て、次に<bdi>L17</bdi>でハサミの石を攻める手（変化図）が楽しみです。', 'Black secures a base with the knight\'s move <bdi>S13</bdi> on the second line. Low, but rich in eye shape and safe. White has outside thickness and looks forward to attacking the pincer stone with <bdi>L17</bdi> (variation).'],
  ],
  vars: [
    { title: ['ケイマ受け（ハサまない場合）', 'Knight\'s-move response (no pincer)'],
      notes: [['黒は<bdi>Q14</bdi>とケイマに受けます。隅の地を固める堅実な受けで、白は上辺にヒラくか手を抜きます。', 'Black answers with the knight\'s move <bdi>Q14</bdi>, a solid move that secures the corner. White extends on the top side or plays elsewhere.']] },
    { title: ['コスミ（AIも好む受け）', 'The diagonal (an answer AI likes)'],
      notes: [['黒は<bdi>Q15</bdi>とコスミます。白の肩を先に占め、隅を守りながら中央にも向かう手で、AIの評価も高い受けです。', 'Black plays the diagonal <bdi>Q15</bdi>, taking the shoulder point first — defending the corner while facing the centre. AI rates it highly.']] },
    { title: ['ハサミ返しからの戦い', 'Counter-pincer and fight'],
      notes: [['白は<bdi>L17</bdi>とハサミの石を逆に挟みます。外の厚みを背景にした攻めです。', 'White counter-pincers the pincer stone at <bdi>L17</bdi>, attacking with the backing of its thickness.'],
        ['黒は<bdi>N15</bdi>と一間にトんで中央に逃げます。', 'Black jumps out to <bdi>N15</bdi> toward the centre.'],
        ['白も<bdi>L15</bdi>と並んでトビ、攻めを続けます。この後は中盤の戦いです。', 'White jumps alongside to <bdi>L15</bdi>, continuing the attack. From here it is a middle-game fight.']] },
  ],
};

T.komoku_nikentaka = {
  level: 2, side: 2,
  label: ['小目', '3-4'],
  title: ['小ゲイマガカリ・二間高バサミ', 'Small knight approach, two-space high pincer'],
  short: ['白は一間トビから押して厚みを作り、ハサミの石を逆に攻める', 'White jumps, pushes to build a wall, then attacks the pincer stone'],
  story: [
    '<p><bdi>M16</bdi>の二間高バサミは、ハサミの中でも穏やかで柔軟な手です。白はこの定石では「ハサまれた側」としての打ち方を学びます。</p><p>白は<bdi>P15</bdi>と一間にトんで中央に出ます。黒が<bdi>Q14</bdi>と右辺を守ると、白は<bdi>P14</bdi>・<bdi>P13</bdi>と押して外側に壁を築き、最後に<bdi>K16</bdi>とハサミの石を挟んで攻めに回ります。</p><p>黒は右辺に地を得ますが、上辺の<bdi>M16</bdi>が弱くなります。白は厚みを攻めに生かすのが狙いです。肩ツキによる現代的な対応は変化図とAIの章で紹介します。</p>',
    '<p>The two-space high pincer at <bdi>M16</bdi> is one of the calmer, more flexible pincers. Here you study how White handles being pincered.</p><p>White jumps out to <bdi>P15</bdi>. When Black protects the right side at <bdi>Q14</bdi>, White pushes at <bdi>P14</bdi> and <bdi>P13</bdi> to build an outer wall, and finally turns to attack the pincer stone with <bdi>K16</bdi>.</p><p>Black gets right-side territory, but <bdi>M16</bdi> becomes weak; White uses the wall to attack. The modern shoulder-hit answer is shown in a variation and in the AI chapter.</p>'],
  notes: [
    ['白は<bdi>P17</bdi>に小ゲイマガカリ。', 'White approaches at <bdi>P17</bdi>.'],
    ['黒は<bdi>M16</bdi>と二間高バサミ。四線の高いハサミで、上辺の模様も意識した柔軟な手です。', 'Black pincers two spaces away on the fourth line at <bdi>M16</bdi> — a flexible pincer that also builds the top side.'],
    ['白は<bdi>P15</bdi>と一間にトんで中央に出ます。ハサまれた石はまず頭を出して攻められない形にするのが基本です。AIは<bdi>Q15</bdi>の肩ツキ（変化図）を約1目好みます。', 'White jumps out to <bdi>P15</bdi>. A pincered stone should first get its head out so it cannot be attacked. AI prefers the shoulder hit <bdi>Q15</bdi> (variation) by about a point.'],
    ['黒は<bdi>Q14</bdi>とケイマに構え、右辺への白の進出を止めて隅と右辺を守ります。', 'Black plays the knight\'s move <bdi>Q14</bdi>, stopping White from coming down the right side and protecting corner and side.'],
    ['白は<bdi>P14</bdi>とオシて外側に壁を作り始めます。', 'White pushes at <bdi>P14</bdi>, starting to build an outer wall.'],
    ['黒は<bdi>Q13</bdi>とノビて右辺の地を広げます。', 'Black extends to <bdi>Q13</bdi>, enlarging the right side.'],
    ['白は<bdi>P13</bdi>ともう一度オシて壁を高くします。', 'White pushes once more at <bdi>P13</bdi>, making the wall taller.'],
    ['黒は<bdi>Q12</bdi>とノビて右辺を確保します。', 'Black extends to <bdi>Q12</bdi>, securing the right side.'],
    ['白は<bdi>K16</bdi>とハサミの石を挟み返し、壁を背景に攻めに回ります。黒は右辺の地、白は厚みと攻めの主導権を得た分かれです。', 'White counter-pincers at <bdi>K16</bdi>, attacking with the wall behind it. Black has the right side, White thickness and the initiative.'],
  ],
  vars: [
    { title: ['肩ツキで応じる（現代流）', 'Answer with the shoulder hit (modern)'],
      notes: [['白は<bdi>Q15</bdi>と黒の小目の肩にツキます。現代では最も多い対応です。', 'White hits the shoulder of the 3-4 stone at <bdi>Q15</bdi> — the most common modern answer.'],
        ['黒は<bdi>R15</bdi>とノビます。', 'Black extends to <bdi>R15</bdi>.'],
        ['白は<bdi>Q14</bdi>とノビて黒を低く抑えます。', 'White extends to <bdi>Q14</bdi>, keeping Black low.'],
        ['黒は<bdi>R13</bdi>と構えて根拠を確保します。', 'Black settles at <bdi>R13</bdi>, securing a base.'],
        ['白は<bdi>K17</bdi>とハサミの石を挟みます。', 'White pincers the pincer stone at <bdi>K17</bdi>.']] },
  ],
};

T.komoku_ikkentaka = {
  level: 2, side: 1,
  label: ['小目', '3-4'],
  title: ['小ゲイマガカリ・一間高バサミ', 'Small knight approach, one-space high pincer'],
  short: ['近いハサミ。白がトんで押す間に、黒は右辺に大きな地を作る', 'A close pincer: while White jumps and pushes, Black builds a big right side'],
  story: [
    '<p><bdi>N16</bdi>の一間高バサミは、ハサミの石がカカリに近いぶん厳しく、同時に白に利用されやすい手でもあります。</p><p>白は<bdi>P15</bdi>とトんで中央に出て、<bdi>P14</bdi>・<bdi>P13</bdi>・<bdi>P12</bdi>と押して厚みを作ります。黒は<bdi>Q14</bdi>から四線をノビて、右辺に大きな地を確保します。最後に白は<bdi>K16</bdi>とハサミの石を挟みます。</p><p>二間高バサミとよく似た進行ですが、押しが一本多くなるぶん黒の右辺は大きく、白の厚みも強くなります。黒は上辺の<bdi>N16</bdi>をうまくさばくことが課題です。</p>',
    '<p>The one-space high pincer at <bdi>N16</bdi> is close to the approach stone: severe, but also easy for White to lean on.</p><p>White jumps to <bdi>P15</bdi> and pushes at <bdi>P14</bdi>, <bdi>P13</bdi> and <bdi>P12</bdi> to build thickness, while Black extends along the fourth line from <bdi>Q14</bdi> and secures a big right side. Finally White counter-pincers at <bdi>K16</bdi>.</p><p>It resembles the two-space high pincer, but with one more push: Black\'s right side is bigger, and so is White\'s wall. Black must then handle <bdi>N16</bdi> skilfully.</p>'],
  notes: [
    ['白は<bdi>P17</bdi>に小ゲイマガカリ。', 'White approaches at <bdi>P17</bdi>.'],
    ['黒は<bdi>N16</bdi>と一間高バサミ。近くて厳しいハサミです。', 'Black pincers one space away on the fourth line at <bdi>N16</bdi> — close and severe.'],
    ['白は<bdi>P15</bdi>と一間にトんで頭を出します。', 'White jumps out to <bdi>P15</bdi>.'],
    ['黒は<bdi>Q14</bdi>とケイマに構えて右辺を守ります。', 'Black plays the knight\'s move <bdi>Q14</bdi>, guarding the right side.'],
    ['白は<bdi>P14</bdi>とオシます。', 'White pushes at <bdi>P14</bdi>.'],
    ['黒は<bdi>Q13</bdi>とノビます。押されたらノビるのが基本で、ここでハネると切られる弱点ができます。', 'Black extends to <bdi>Q13</bdi>. When pushed, extend — a hane here would leave cutting points.'],
    ['白は<bdi>P13</bdi>とオシて壁を伸ばします。', 'White pushes at <bdi>P13</bdi>, extending the wall.'],
    ['黒は<bdi>Q12</bdi>とノビます。', 'Black extends to <bdi>Q12</bdi>.'],
    ['白は<bdi>P12</bdi>ともう一本オシます。', 'White pushes once more at <bdi>P12</bdi>.'],
    ['黒は<bdi>Q11</bdi>とノビて右辺の地を大きく確保します。', 'Black extends to <bdi>Q11</bdi>, securing a large right side.'],
    ['白は<bdi>K16</bdi>とハサミの石を挟んで攻めに回ります。黒は大きな右辺、白は厚みと攻めの分かれです。', 'White pincers the pincer stone at <bdi>K16</bdi>. Black has a big right side, White thickness and an attack.'],
  ],
  vars: [],
};

T.komoku_tsukehiki = {
  level: 1, side: 1,
  label: ['小目', '3-4'],
  title: ['一間高ガカリ・ツケヒキ', 'One-space high approach, attach and draw back'],
  short: ['小目の定石で最も基本的な形。黒は隅の地、白は上辺の形', 'The most basic 3-4 joseki: Black the corner, White the top side'],
  story: [
    '<p>小目への<bdi>P16</bdi>の一間高ガカリに、下から<bdi>P17</bdi>とツケて、ハネられたら<bdi>Q17</bdi>と引く。これが「ツケヒキ定石」で、入門者が最初に覚える定石の一つです。</p><p>黒は手堅く隅の地を確保し、<bdi>R14</bdi>のヒラキで右辺にも根拠を作ります。白は上辺に形を作り、<bdi>K16</bdi>とヒラいて安定します。</p><p>お互いに無理のない、最も穏やかな分かれです。AIの時代になっても評価は変わらず、プロの碁でもよく見られます。</p>',
    '<p>Against the one-space high approach at <bdi>P16</bdi>, Black attaches underneath at <bdi>P17</bdi> and, when White hanes, draws back to <bdi>Q17</bdi>. This attach-and-draw-back is one of the first joseki every beginner learns.</p><p>Black secures the corner and makes a base on the right side with the extension <bdi>R14</bdi>. White builds shape on the top side and settles with <bdi>K16</bdi>.</p><p>A calm, reasonable result for both. Its evaluation did not change in the AI era, and professionals still play it often.</p>'],
  notes: [
    ['白は<bdi>P16</bdi>と一間高ガカリ。四線から上辺に向かう、バランスの良いカカリです。', 'White approaches one space high at <bdi>P16</bdi>, a balanced approach on the fourth line.'],
    ['黒は<bdi>P17</bdi>と下にツケます。高いカカリの下の弱点を突き、隅を守る手です。', 'Black attaches underneath at <bdi>P17</bdi>, hitting the weak spot under a high approach and protecting the corner.'],
    ['白は<bdi>O17</bdi>とハネて上辺側を押さえます。', 'White hanes at <bdi>O17</bdi>, blocking the top side.'],
    ['黒は<bdi>Q17</bdi>と引きます。これが「ヒキ」で、隅の地を確保しながら形に弱点を残しません。', 'Black draws back to <bdi>Q17</bdi>. This keeps the corner and leaves no weaknesses.'],
    ['白は<bdi>O16</bdi>とツイで切断を防ぎます。<bdi>O16</bdi>を省くと黒に<bdi>O16</bdi>から切られます。', 'White connects at <bdi>O16</bdi>; without it Black could cut there.'],
    ['黒は<bdi>R14</bdi>と右辺にヒラいて根拠を作ります。これで黒の隅は安心です。', 'Black extends to <bdi>R14</bdi> on the right side, making a base. The corner is now safe.'],
    ['白は<bdi>K16</bdi>と上辺にヒラいて形を完成させます。お互いに無理のない、穏やかな互角の分かれです。', 'White extends to <bdi>K16</bdi> on the top side, completing its shape. A calm, even result.'],
  ],
  vars: [],
};

T.komoku_ogeima = {
  level: 1, side: 1,
  label: ['小目', '3-4'],
  title: ['大ゲイマガカリ・コスミ', 'Large knight approach, diagonal'],
  short: ['遠いカカリにはコスミで隅を固め、白の肩ツキには右辺をノビる', 'Answer the distant approach with the diagonal; extend along the side against the shoulder hit'],
  story: [
    '<p><bdi>O17</bdi>の大ゲイマガカリは、小ゲイマガカリより一路遠く、軽いカカリです。黒は<bdi>Q17</bdi>とコスんで隅を固めるのが代表的な受け方です。</p><p>白は<bdi>Q15</bdi>と黒の肩にツいて右辺側の黒を低く抑え、黒は<bdi>R15</bdi>とノビて地を確保、白は<bdi>Q13</bdi>とヒラいて形を整えます。</p><p>黒は隅から右辺にかけての地、白は上辺と右辺に軽い形。<bdi>O16</bdi>の二間高ガカリにも同じ考え方で打てます（変化図）。</p>',
    '<p>The large knight approach at <bdi>O17</bdi> is one line further than the small knight approach — a light approach. Black\'s typical answer is the diagonal <bdi>Q17</bdi>, firming up the corner.</p><p>White hits the shoulder at <bdi>Q15</bdi> to keep Black low on the right; Black extends to <bdi>R15</bdi> for territory, and White settles with <bdi>Q13</bdi>.</p><p>Black gets territory from the corner to the right side, White light shapes on both sides. The two-space high approach <bdi>O16</bdi> is handled the same way (variation).</p>'],
  notes: [
    ['白は<bdi>O17</bdi>に大ゲイマガカリ。遠く軽いカカリで、ハサまれても動きやすい手です。', 'White approaches with a large knight\'s move at <bdi>O17</bdi> — distant and light, easy to handle even if pincered.'],
    ['黒は<bdi>Q17</bdi>とコスんで隅を固めます。三々の地を確保し、白を隅に入らせない手堅い受けです。', 'Black plays the diagonal <bdi>Q17</bdi>, securing the corner and keeping White out.'],
    ['白は<bdi>Q15</bdi>と黒の肩にツキ、黒を右辺で低く抑えつつ中央に向かいます。', 'White hits the shoulder at <bdi>Q15</bdi>, keeping Black low on the right side while facing the centre.'],
    ['黒は<bdi>R15</bdi>とノビて隅と右辺の地を確保します。', 'Black extends to <bdi>R15</bdi>, securing the corner and right side.'],
    ['白は<bdi>Q13</bdi>とトんで形を整えます。黒は確実な地、白は上下に軽い形を得て互角です。', 'White jumps to <bdi>Q13</bdi>, completing its shape. Black has sure territory, White light shapes: even.'],
  ],
  vars: [
    { title: ['二間高ガカリの場合', 'The two-space high approach'],
      notes: [['白は<bdi>O16</bdi>と二間高ガカリ。', 'White approaches two spaces high at <bdi>O16</bdi>.'],
        ['黒はやはり<bdi>Q17</bdi>とコスみます。', 'Black again plays the diagonal <bdi>Q17</bdi>.'],
        ['白は<bdi>Q15</bdi>と肩にツキます。', 'White hits the shoulder at <bdi>Q15</bdi>.'],
        ['黒は<bdi>R15</bdi>とノビます。', 'Black extends to <bdi>R15</bdi>.'],
        ['白は<bdi>Q13</bdi>と形を整えます。', 'White settles at <bdi>Q13</bdi>.']] },
  ],
};

T.komoku_uke = {
  level: 1, side: 1,
  label: ['小目', '3-4'],
  title: ['小ゲイマガカリ・ケイマ受け', 'Small knight approach, knight\'s-move response'],
  short: ['ハサまずに受ける堅実な打ち方。白は上辺にヒラいて安定する', 'The solid way: answer without pincering; White extends on the top side'],
  story: [
    '<p>小ゲイマガカリにハサまず、<bdi>Q14</bdi>とケイマに受けるのは最も堅実な打ち方です。隅と右辺の地を確保し、白に厳しい攻めを与えない代わりに、自分も弱点を作りません。</p><p>白は<bdi>M17</bdi>と上辺に二間ビラキ（<bdi>N17</bdi>・<bdi>O17</bdi>を空けたヒラキ）して根拠を作ります。お互いに安定し、先手は黒に移ります。</p><p>AIは<bdi>Q15</bdi>のコスミも同じくらい好みます。どちらも「隅を守って先手を取る」考え方です。</p>',
    '<p>Answering the small knight approach with the knight\'s move <bdi>Q14</bdi>, without pincering, is the most solid choice. Black secures the corner and right side without creating weaknesses.</p><p>White makes a base with a two-space extension on the top side at <bdi>M17</bdi>. Both sides are stable, and Black gets to play first elsewhere.</p><p>AI likes the diagonal <bdi>Q15</bdi> just as much. Both follow the same idea: guard the corner and keep the initiative.</p>'],
  notes: [
    ['白は<bdi>P17</bdi>に小ゲイマガカリ。', 'White approaches at <bdi>P17</bdi>.'],
    ['黒は<bdi>Q14</bdi>とケイマに受けます。隅と右辺を固め、白を上辺に追いやる堅実な受けです。', 'Black answers with the knight\'s move <bdi>Q14</bdi>, firming up the corner and right side and sending White to the top side.'],
    ['白は<bdi>M17</bdi>と上辺に二間ビラキして根拠を作ります。黒は先手で他の大場に向かいます。', 'White makes a base with a two-space extension at <bdi>M17</bdi>. Black has sente for a big point elsewhere.'],
  ],
  vars: [
    { title: ['コスミで受ける', 'Answer with the diagonal'],
      notes: [['黒は<bdi>Q15</bdi>とコスみます。肩の要所を先に占め、中央にも働く受けです。', 'Black plays the diagonal <bdi>Q15</bdi>, taking the key shoulder point first; it also works toward the centre.'],
        ['白は<bdi>M17</bdi>と二間にヒラいて安定します。', 'White settles with the two-space extension <bdi>M17</bdi>.']] },
  ],
};

T.komoku_tsukeosae = {
  level: 2, side: 1,
  label: ['小目', '3-4'],
  title: ['一間高ガカリ・ツケからオサエ', 'One-space high approach, attach then block'],
  short: ['ツケヒキの代わりに<bdi>Q16</bdi>と押さえ、右辺に高く構える型', 'Instead of drawing back, block at <bdi>Q16</bdi> and build high on the right side'],
  story: [
    '<p>ツケヒキ定石と同じく<bdi>P17</bdi>と下にツケ、白のハネに対して今度は<bdi>Q16</bdi>と押さえる型です。黒は白の右辺への進出を止め、右辺を大きく構えることを狙います。</p><p>代わりに白は<bdi>P18</bdi>とハネて黒の隅の石をアタリにし、黒は<bdi>Q17</bdi>とツイで受けます。白が<bdi>O16</bdi>と形を整えたら、黒は<bdi>Q13</bdi>と右辺に高くヒラき、白は<bdi>K16</bdi>と上辺にヒラいて分かれます。</p><p>ツケヒキより右辺を重視した打ち方です。右下に黒の味方がいるときに特に有力です。</p>',
    '<p>As in the attach-and-draw-back, Black attaches underneath at <bdi>P17</bdi>, but against White\'s hane Black now blocks at <bdi>Q16</bdi>. This stops White from coming toward the right side and aims at a large right-side position.</p><p>In return White hanes at <bdi>P18</bdi>, putting the corner stone in atari, and Black connects at <bdi>Q17</bdi>. After White tidies up with <bdi>O16</bdi>, Black extends high on the right side to <bdi>Q13</bdi> and White extends on the top with <bdi>K16</bdi>.</p><p>It values the right side more than the draw-back version — strongest when Black has friendly stones lower on the right.</p>'],
  notes: [
    ['白は<bdi>P16</bdi>と一間高ガカリ。', 'White approaches one space high at <bdi>P16</bdi>.'],
    ['黒は<bdi>P17</bdi>と下にツケます。', 'Black attaches underneath at <bdi>P17</bdi>.'],
    ['白は<bdi>O17</bdi>とハネます。', 'White hanes at <bdi>O17</bdi>.'],
    ['黒は<bdi>Q16</bdi>と押さえます。<bdi>Q17</bdi>と引くツケヒキと違い、白の右辺側への進出を止めて右辺を重視する手です。', 'Black blocks at <bdi>Q16</bdi>. Unlike the draw-back at <bdi>Q17</bdi>, it stops White from heading toward the right side and values that side.'],
    ['白は<bdi>P18</bdi>とハネて<bdi>P17</bdi>をアタリにします。', 'White hanes at <bdi>P18</bdi>, putting <bdi>P17</bdi> in atari.'],
    ['黒は<bdi>Q17</bdi>とツイでアタリを逃げます。', 'Black connects at <bdi>Q17</bdi>, escaping the atari.'],
    ['白は<bdi>O16</bdi>とツイで切断を防ぎ、形を整えます。', 'White connects at <bdi>O16</bdi>, preventing the cut and tidying its shape.'],
    ['黒は<bdi>Q13</bdi>と右辺に高くヒラきます。<bdi>Q16</bdi>の押さえを生かした、右辺重視の構えです。', 'Black extends high on the right side to <bdi>Q13</bdi>, making use of the block at <bdi>Q16</bdi>.'],
    ['白は<bdi>K16</bdi>と上辺にヒラいて安定します。黒は隅と右辺、白は上辺の互角の分かれです。', 'White settles with the extension <bdi>K16</bdi> on the top side. Black the corner and right side, White the top: even.'],
  ],
  vars: [],
};
