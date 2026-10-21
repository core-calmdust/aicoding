// texts: each set { label, title, short, story, level, side, notes: [[ja,en],...], vars: [{title:[ja,en], notes:[[ja,en]...]}] }
const b = s => s.replace(/\b([A-HJ-T](?:1[0-9]|[1-9]))\b/g, '<bdi>$1</bdi>');
export const T = {};

T.hoshi_ikken = {
  level: 1, side: 1,
  label: ['星', '4-4'],
  title: ['小ゲイマガカリ・一間受け', 'Low approach, one-space jump'],
  short: ['星の最も基本的な受け方。三々スベリで白が隅に生き、黒は厚みを得る', 'The most basic answer: White slides to the 3-3 and lives, Black gets thickness'],
  story: [
    '<p>星（4-4）に白が小ゲイマにカカってきたとき、黒が上辺に一間トビで受けるのが「一間受け」です。高い位置で受けるので、上辺と中央に向かって働きやすいのが特徴です。</p><p>星は隅の地を確定させない打ち方なので、白には三々にすべり込む手段が残ります。白が三々に入ったら、黒はカカリの石の側から押さえて外側を厚くするのが現代の標準です（昔はもう一方の上から押さえる型がよく打たれましたが、AIはやや損と見ています）。</p><p>結果は、白が隅で小さく生き、黒は右辺に向かう厚い壁と先手を得る「地と厚み」の分かれです。黒が右辺や中央を大事にしたい布石で選びます。</p>',
    '<p>When White approaches Black\'s 4-4 stone with a low knight\'s move, Black answers with a one-space jump on the top side. The high jump works well toward the top side and the centre.</p><p>A 4-4 stone never secures the corner, so White can still slide into the 3-3 point. When White does, the modern standard is to block from the side of the approaching stone and build thickness outside (the old block from the other side is still seen, but AI rates it slightly worse).</p><p>The result is a classic territory-versus-thickness trade: White lives small in the corner, Black gets a strong wall facing the right side and keeps sente. Choose it when the right side and the centre matter to you.</p>'],
  notes: [
    ['白は<bdi>R14</bdi>に小ゲイマガカリ。星へのカカリで最もよく打たれる手で、隅の地を減らしつつ右辺に足場を作ります。', 'White approaches at <bdi>R14</bdi> with a low knight\'s move — the most common approach to a 4-4 stone. It reduces the corner and gains a foothold on the right side.'],
    ['黒は<bdi>O16</bdi>と上辺に一間トビで受けます。高く構えて上辺と中央を重視する受け方です。より低い<bdi>O17</bdi>のケイマ受けや、受けずに他の大場に向かう手もAI時代にはよく打たれます。', 'Black answers with a one-space jump at <bdi>O16</bdi>, a high shape that values the top side and the centre. The lower knight\'s move <bdi>O17</bdi>, or even ignoring the approach for a big point elsewhere, are also common in the AI era.'],
    ['白は<bdi>R17</bdi>の三々にすべり込みます。<bdi>R14</bdi>の石と連絡しながら隅の地を取り、根拠（生きるための足場）を作る手です。安定を急がなければ<bdi>R11</bdi>の二間ビラキも定石です。', 'White slides into the 3-3 point at <bdi>R17</bdi>, taking the corner while linking toward <bdi>R14</bdi> to build a base. If White is not in a hurry to settle, the two-space extension <bdi>R11</bdi> is also joseki.'],
    ['黒は<bdi>R16</bdi>と、カカリの石がある側から押さえます。白の隅と<bdi>R14</bdi>を分断し、右辺に向かって厚みを築く現代の本手です。昔の定石の<bdi>Q17</bdi>（上からのオサエ）はAIの評価ではやや劣ります。', 'Black blocks at <bdi>R16</bdi>, from the side of the approach stone. This separates the corner from <bdi>R14</bdi> and builds thickness toward the right side — the modern standard. The old block at <bdi>Q17</bdi> (from above) is rated slightly worse by AI.'],
    ['白は<bdi>S16</bdi>と二線にハネて、隅の地を広げながら黒の形に圧力をかけます。', 'White hanes at <bdi>S16</bdi> on the second line, widening the corner and putting pressure on Black\'s shape.'],
    ['黒は<bdi>S15</bdi>とハネ返します。白の<bdi>R14</bdi>を隅から切り離し、外側をしっかり固める手です。', 'Black hanes back at <bdi>S15</bdi>, cutting <bdi>R14</bdi> off from the corner and firming up the outside.'],
    ['白は<bdi>S17</bdi>とツイで切断を防ぎます。ここを切られると隅の白が危なくなるので省けません。', 'White connects at <bdi>S17</bdi>. If Black could cut here the corner group would be in trouble, so this cannot be omitted.'],
    ['黒は<bdi>R15</bdi>とツイで壁を完成させます。<bdi>S14</bdi>とノビて<bdi>R14</bdi>をさらに攻める手もほぼ同等です。白の<bdi>R14</bdi>は孤立し、後で動き出すか捨て石にするかの石になります。', 'Black connects at <bdi>R15</bdi>, completing the wall. Extending to <bdi>S14</bdi> to press <bdi>R14</bdi> even harder is about equal. White\'s <bdi>R14</bdi> is now isolated: a stone to revive later or to give up.'],
    ['白は<bdi>P18</bdi>と二線をケイマにすべって眼形を広げ、隅で生きる形を整えます。黒は先手を得て、厚みを生かして右辺や他の大場に向かいます。互角の分かれです。', 'White slides along the second line to <bdi>P18</bdi>, widening the eye space so the corner lives. Black keeps sente and turns to the right side or another big point with the thickness. An even result.'],
  ],
  vars: [
    { title: ['白の二間ビラキ（穏やかな型）', 'White\'s two-space extension (calm)'],
      notes: [['白は三々に入らず<bdi>R11</bdi>と二間にヒラいて根拠を作ります。黒は手を抜いて大場に先行できますが、白の三々入りの手段は後に残ります。', 'Instead of the 3-3, White makes a base with the two-space extension <bdi>R11</bdi>. Black can play elsewhere first, but the 3-3 invasion remains for later.']] },
    { title: ['ノゾキから二線にすべる（AI流）', 'Peep, then slide on the second line (AI style)'],
      notes: [['白は<bdi>P15</bdi>と一間トビの間をノゾキます。黒がツガないと<bdi>P16</bdi>の切りが残ります。', 'White peeps at <bdi>P15</bdi> into the one-space jump; if Black ignores it, the cut at <bdi>P16</bdi> remains.'],
        ['黒は<bdi>P16</bdi>とツイで形を守ります。これで黒の上辺は一本の強い石になりました。', 'Black connects at <bdi>P16</bdi>. The top-side stones are now one strong unit.'],
        ['白は<bdi>S16</bdi>と二線に入り、隅の地をえぐりつつ<bdi>R14</bdi>と連携して根拠を作ります。ノゾキと交換してから隅に入るのがAIの好む手順です。', 'White enters at <bdi>S16</bdi> on the second line, eating into the corner and making a base with <bdi>R14</bdi>. Exchanging the peep first and then entering the corner is the order AI likes.']] },
  ],
};

T.hoshi_keima = {
  level: 1, side: 1,
  label: ['星', '4-4'],
  title: ['小ゲイマガカリ・ケイマ受け', 'Low approach, knight\'s-move response'],
  short: ['低く堅いケイマ受け。三々スベリに対してはやはりカカリ側から押さえる', 'The low, solid knight\'s response; against the 3-3 slide Black again blocks on the approach side'],
  story: [
    '<p>カカリに対して<bdi>O17</bdi>の小ゲイマで受けるのが「ケイマ受け」。一間受けより低く、隅と上辺の地を重視した堅い受け方です。</p><p>それでも星の下の三々は空いているので、白は三々にすべって生きを図れます。黒はカカリの石の側から押さえて白を隅に閉じ込め、右辺に厚みを作ります。最後に<bdi>O18</bdi>と押さえて白の隅を小さく限定するのがケイマ受けならではの利点です。</p><p>白は隅で生き、黒は先手で厚く打てる分かれ。上辺の黒地を大きくまとめたい布石に向きます。</p>',
    '<p>Answering the approach with the small knight\'s move <bdi>O17</bdi> is lower and more territorial than the one-space jump: it values the corner and the top side.</p><p>The 3-3 point is still open, so White can slide in and live. Black blocks from the approach side, shutting White into the corner and building thickness toward the right side. The final block at <bdi>O18</bdi>, which keeps White\'s corner small, is the special benefit of the knight\'s response.</p><p>White lives in the corner, Black is thick. Good when Black wants a large framework on the top side.</p>'],
  notes: [
    ['白は<bdi>R14</bdi>に小ゲイマガカリ。', 'White approaches at <bdi>R14</bdi> with a low knight\'s move.'],
    ['黒は<bdi>O17</bdi>のケイマで受けます。一間受け（<bdi>O16</bdi>）より低く、隅と上辺の地を固める受け方です。', 'Black answers with the knight\'s move <bdi>O17</bdi>. It is lower than the one-space jump <bdi>O16</bdi> and firms up the corner and top side.'],
    ['白は<bdi>R17</bdi>の三々にすべり込みます。AIは<bdi>R16</bdi>のツケ（「AI時代の定石」で紹介）をやや好みますが、この三々スベリも十分な定石です。<bdi>R11</bdi>の二間ビラキもあります。', 'White slides into the 3-3 at <bdi>R17</bdi>. AI slightly prefers the attachment at <bdi>R16</bdi> (see the AI-era joseki), but this slide is perfectly good. The two-space extension <bdi>R11</bdi> is also possible.'],
    ['黒は<bdi>R16</bdi>とカカリの側から押さえ、白の隅と<bdi>R14</bdi>を分断します。', 'Black blocks at <bdi>R16</bdi> on the approach side, separating the corner from <bdi>R14</bdi>.'],
    ['白は<bdi>S16</bdi>とハネて隅を広げます。', 'White hanes at <bdi>S16</bdi> to widen the corner.'],
    ['黒は<bdi>S15</bdi>とハネ返して<bdi>R14</bdi>を切り離します。', 'Black hanes back at <bdi>S15</bdi>, cutting off <bdi>R14</bdi>.'],
    ['白は<bdi>S17</bdi>とツギます。省くと<bdi>S17</bdi>から切られて隅が危険です。', 'White connects at <bdi>S17</bdi>; without it Black would cut there and the corner would be in danger.'],
    ['黒は<bdi>R15</bdi>とツイで壁を完成させます。これで黒の壁に弱点はありません。', 'Black connects at <bdi>R15</bdi>. The wall now has no weaknesses.'],
    ['白は<bdi>P18</bdi>と二線をすべって眼形を広げます。', 'White slides along the second line to <bdi>P18</bdi> to widen the eye space.'],
    ['黒は<bdi>O18</bdi>と押さえて白の侵入を止めます。<bdi>O17</bdi>がここで働くのがケイマ受けの良さです。白は後で<bdi>P17</bdi>と補強して生きますが、黒は上辺と右辺に厚く、全体では互角です。', 'Black blocks at <bdi>O18</bdi> and stops the slide — here the stone at <bdi>O17</bdi> pays off. White will later reinforce with <bdi>P17</bdi> and live, while Black is thick on both sides. Even overall.'],
  ],
  vars: [
    { title: ['白の二間ビラキ', 'White\'s two-space extension'],
      notes: [['白は<bdi>R11</bdi>と二間にヒラいて右辺に根拠を作る、最も穏やかな打ち方です。黒は先手で他に回れます。', 'White makes a base with the two-space extension <bdi>R11</bdi> — the calmest choice. Black gets sente.']] },
    { title: ['白の<bdi>R16</bdi>ツケ（AI流）', 'White attaches at <bdi>R16</bdi> (AI style)'],
      notes: [['白は三々ではなく<bdi>R16</bdi>に直接ツケます。AIが好む打ち方で、隅と右辺の両方を狙います。', 'Instead of the 3-3, White attaches directly at <bdi>R16</bdi> — an AI favourite aiming at both the corner and the right side.'],
        ['黒は<bdi>R17</bdi>と隅側から押さえて三々を守ります。', 'Black blocks at <bdi>R17</bdi> from the corner side, protecting the 3-3.'],
        ['白は<bdi>S17</bdi>とハネて隅に食い込みます。', 'White hanes at <bdi>S17</bdi>, cutting into the corner.'],
        ['黒は<bdi>R15</bdi>とアテます。白<bdi>R16</bdi>は残りのダメが一つです。', 'Black plays atari at <bdi>R15</bdi>: the white stone at <bdi>R16</bdi> has only one liberty left.'],
        ['白は<bdi>S16</bdi>とツイでアタリを逃げ、隅の石とつなげます。', 'White connects at <bdi>S16</bdi>, escaping the atari and joining the corner stones.'],
        ['黒は<bdi>Q15</bdi>とツイで<bdi>R15</bdi>を守ります。<bdi>R15</bdi>はダメが少なく、放置すると<bdi>S15</bdi>からアタリにされます。', 'Black connects at <bdi>Q15</bdi> to protect <bdi>R15</bdi>, which is short of liberties and could be put in atari from <bdi>S15</bdi>.'],
        ['白は<bdi>S15</bdi>と下にノビて右辺の<bdi>R14</bdi>に近づき、眼形を広げます。', 'White extends down to <bdi>S15</bdi>, approaching <bdi>R14</bdi> and widening the eye space.'],
        ['黒は<bdi>R18</bdi>とサガって白の<bdi>S18</bdi>からのハネを防ぎ、隅の地を確保します。手を抜く手も有力です。', 'Black descends to <bdi>R18</bdi>, preventing White\'s hane at <bdi>S18</bdi> and securing the corner. Playing elsewhere is also strong.'],
        ['白は<bdi>Q14</bdi>と押さえて黒の下への進出を止め、右辺を安定させます。白は右辺、黒は隅と上辺を得る分かれです。', 'White blocks at <bdi>Q14</bdi>, stopping Black from coming down, and settles the right side. White gets the right side, Black the corner and top side.']] },
  ],
};
export { b };

T.hoshi_ikkentaka = {
  level: 2, side: 1,
  label: ['星', '4-4'],
  title: ['小ゲイマガカリ・一間高バサミ', 'Low approach, one-space high pincer'],
  short: ['ハサまれたら三々に入って隅で生きる、最も基本的なハサミの定石', 'Pincered? Slide into the 3-3 and live — the basic pincer joseki'],
  story: [
    '<p>カカリの石に受けずに、逆にハサんで攻めるのが「ハサミ」です。<bdi>Q12</bdi>の一間高バサミは右辺の白を厳しく狙い、同時に右辺の黒の構えにもなります。</p><p>ハサまれた白は、<bdi>R17</bdi>の三々に入って隅で生きるのが代表的な対応です。白は隅の地を得て、カカリの<bdi>R14</bdi>は軽く見捨てます。黒は外側に厚い壁を築き、右辺の<bdi>Q12</bdi>とも協力して<bdi>R14</bdi>を取り込みます。</p><p>黒は「右辺の白を攻めたい」「右辺・中央を大きくしたい」ときに選びます。現代でもよく打たれる、互角の分かれです。</p>',
    '<p>Instead of answering the approach, Black can pincer it. The one-space high pincer at <bdi>Q12</bdi> attacks the white stone hard and also builds Black\'s position on the right side.</p><p>The standard reply is for White to slide into the 3-3 point and live in the corner, treating <bdi>R14</bdi> lightly. White gets the corner, Black builds a strong outer wall that works with <bdi>Q12</bdi> to swallow <bdi>R14</bdi>.</p><p>Choose the pincer when you want to attack, or when the right side and the centre are important. A common, even result in modern play.</p>'],
  notes: [
    ['白は<bdi>R14</bdi>に小ゲイマガカリ。', 'White approaches at <bdi>R14</bdi>.'],
    ['黒は<bdi>Q12</bdi>と一間高バサミ。受けずに相手の石を挟んで攻め、右辺の構えも作る積極的な手です。AIは手を抜く手も好みますが、この高バサミも損はほとんどありません。', 'Black pincers at <bdi>Q12</bdi>, one space away on the fourth line — an active move that attacks and builds the right side. AI also likes playing elsewhere, but this pincer loses almost nothing.'],
    ['白は<bdi>R17</bdi>の三々に入ります。ハサまれた石を動かさず、隅で確実に生きる現代の標準的な対応です。', 'White enters the 3-3 at <bdi>R17</bdi>. Rather than running with the pincered stone, White lives in the corner — the standard modern answer.'],
    ['黒は<bdi>R16</bdi>とハサミの側から押さえます。白の隅と<bdi>R14</bdi>を分断し、外の壁と<bdi>Q12</bdi>が協力する向きです。', 'Black blocks at <bdi>R16</bdi> on the pincer side. This separates the corner from <bdi>R14</bdi> and points the wall toward <bdi>Q12</bdi>.'],
    ['白は<bdi>Q17</bdi>と上辺側にノビて、隅の眼形を広げます。', 'White extends to <bdi>Q17</bdi> along the top, widening the corner\'s eye space.'],
    ['黒は<bdi>P16</bdi>と一歩引いて四線に構えます。<bdi>P17</bdi>のハネより穏やかですが、形に弱点が残らず、AIが好む手です。', 'Black draws back to <bdi>P16</bdi> on the fourth line. It is calmer than the hane at <bdi>P17</bdi>, but leaves no weaknesses — the move AI prefers.'],
    ['白は<bdi>S16</bdi>と二線にハネて隅を広げます。', 'White hanes at <bdi>S16</bdi> on the second line.'],
    ['黒は<bdi>S15</bdi>とハネ返します。', 'Black hanes back at <bdi>S15</bdi>.'],
    ['白は<bdi>S17</bdi>とツギます。', 'White connects at <bdi>S17</bdi>.'],
    ['黒は<bdi>R15</bdi>とツイで壁を固めます。<bdi>R14</bdi>はハサミの<bdi>Q12</bdi>と壁に囲まれ、ほぼ動けません。', 'Black connects at <bdi>R15</bdi>. <bdi>R14</bdi> is now trapped between the wall and the pincer <bdi>Q12</bdi>.'],
    ['白は<bdi>O17</bdi>と三線を一間に開いて隅の生きを確かにします。黒は先手で厚く、白は隅の地を得た互角の分かれです。', 'White jumps along the third line to <bdi>O17</bdi>, making the corner safely alive. Black has sente and thickness, White has the corner: even.'],
  ],
  vars: [
    { title: ['一間低バサミの場合', 'The one-space low pincer'],
      notes: [['黒は三線の<bdi>R12</bdi>にハサみます。より低く、右辺の地を意識したハサミです。', 'Black pincers on the third line at <bdi>R12</bdi> — lower, with an eye on right-side territory.'],
        ['白はやはり<bdi>R17</bdi>の三々に入ります。', 'White again enters the 3-3 at <bdi>R17</bdi>.'],
        ['黒は<bdi>R16</bdi>とハサミの側から押さえます。', 'Black blocks at <bdi>R16</bdi> on the pincer side.'],
        ['白は<bdi>Q17</bdi>とノビます。', 'White extends to <bdi>Q17</bdi>.'],
        ['黒は<bdi>P16</bdi>と構えます。', 'Black draws back to <bdi>P16</bdi>.'],
        ['白は<bdi>S16</bdi>とハネます。', 'White hanes at <bdi>S16</bdi>.'],
        ['黒は<bdi>S15</bdi>とハネ返します。', 'Black hanes back at <bdi>S15</bdi>.'],
        ['白は<bdi>S17</bdi>とツギます。', 'White connects at <bdi>S17</bdi>.'],
        ['黒は<bdi>S14</bdi>と二線をノビて、<bdi>R14</bdi>のダメを詰めます。', 'Black extends down the second line to <bdi>S14</bdi>, taking a liberty from <bdi>R14</bdi>.'],
        ['白は<bdi>O17</bdi>と開いて隅を生きます。', 'White jumps to <bdi>O17</bdi> and lives in the corner.']] },
  ],
};

T.hoshi_niken = {
  level: 2, side: 1,
  label: ['星', '4-4'],
  title: ['小ゲイマガカリ・二間バサミ', 'Low approach, two-space pincer'],
  short: ['少し離れた二間バサミ。三々入りの後の黒の締め方が一間バサミと変わる', 'A looser pincer — after the 3-3, Black finishes differently from the one-space pincer'],
  story: [
    '<p><bdi>R11</bdi>の二間バサミは、一間バサミより一路離れた穏やかなハサミです。右辺に少し広く構えられる代わりに、白の<bdi>R14</bdi>には動く余地が残ります。</p><p>白はやはり三々に入って隅で生きます。違いは最後で、ハサミが遠いぶん黒は<bdi>S14</bdi>と二線をノビて<bdi>R14</bdi>のダメを詰め、しっかり取り込みにいきます。</p><p>ハサミの距離によって「後の締め方」が変わることを覚えましょう。どちらも黒は厚み、白は隅の地を得る互角の分かれです。</p>',
    '<p>The two-space pincer at <bdi>R11</bdi> is one line looser than the one-space pincer. Black claims a wider right side, but <bdi>R14</bdi> has a little more room to move.</p><p>White again lives in the 3-3. The difference comes at the end: since the pincer is further away, Black extends down the second line to <bdi>S14</bdi> to take a liberty from <bdi>R14</bdi> and really capture it.</p><p>Remember that the distance of the pincer changes how you finish. In both cases Black gets thickness and White the corner — even.</p>'],
  notes: [
    ['白は<bdi>R14</bdi>に小ゲイマガカリ。', 'White approaches at <bdi>R14</bdi>.'],
    ['黒は<bdi>R11</bdi>と三線に二間バサミ。白を攻めつつ、右辺に広く構えます。', 'Black pincers two spaces away on the third line at <bdi>R11</bdi>, attacking while claiming a wide right side.'],
    ['白は<bdi>R17</bdi>の三々に入って隅で生きる方針です。', 'White enters the 3-3 at <bdi>R17</bdi>, planning to live in the corner.'],
    ['黒は<bdi>R16</bdi>とハサミの側から押さえます。', 'Black blocks at <bdi>R16</bdi> on the pincer side.'],
    ['白は<bdi>Q17</bdi>とノビます。', 'White extends to <bdi>Q17</bdi>.'],
    ['黒は<bdi>P16</bdi>と構えて形を整えます。', 'Black draws back to <bdi>P16</bdi>, keeping good shape.'],
    ['白は<bdi>S16</bdi>とハネます。', 'White hanes at <bdi>S16</bdi>.'],
    ['黒は<bdi>S15</bdi>とハネ返します。', 'Black hanes back at <bdi>S15</bdi>.'],
    ['白は<bdi>S17</bdi>とツギます。', 'White connects at <bdi>S17</bdi>.'],
    ['黒は<bdi>S14</bdi>と二線をノビます。二間バサミは遠いので、ここで<bdi>R14</bdi>のダメを詰めて逃げ道をなくすのが大切です。<bdi>R15</bdi>とツグ手も打たれます。', 'Black extends to <bdi>S14</bdi>. Because the pincer is further away, taking <bdi>R14</bdi>\'s liberty here to cut off its escape matters. Connecting at <bdi>R15</bdi> is also played.'],
    ['白は<bdi>O17</bdi>と開いて隅の生きを確保します。互角の分かれです。', 'White jumps to <bdi>O17</bdi> and secures life. Even.'],
  ],
  vars: [
    { title: ['<bdi>R15</bdi>とツグ型', 'Connecting at <bdi>R15</bdi>'],
      notes: [['黒は<bdi>R15</bdi>と堅くツギます。壁は完璧ですが、<bdi>R14</bdi>はまだ少し動けます。', 'Black connects solidly at <bdi>R15</bdi>. The wall is perfect, but <bdi>R14</bdi> still has a little life in it.'],
        ['白は<bdi>O17</bdi>と開いて隅を生きます。', 'White jumps to <bdi>O17</bdi> and lives.']] },
  ],
};

T.hoshi_sansan = {
  level: 1, side: 1,
  label: ['星', '4-4'],
  title: ['星への三々入り（基本形）', '3-3 invasion of the 4-4 (basics)'],
  short: ['AIが広めた早い三々入り。黒は押さえる向きを決め、外を厚くする', 'The early 3-3 invasion made popular by AI: choose the blocking direction and build outside'],
  story: [
    '<p>星の下の三々に直接入る「三々入り」は、昔は「黒に厚みを与えるので序盤では早すぎる」とされていました。ところがAIは序盤の早い段階から三々に入り、今ではプロの碁でも日常的に見られます。</p><p>黒の最初の判断は「どちらから押さえるか」です。原則は、自分の石がある側や広い側に壁を向けること。この図では上から<bdi>Q17</bdi>と押さえ、白に右辺側をハわせて、黒は中央と上辺に厚みを作ります。</p><p>白は隅の地（約10目）と後手でも安心な生き、黒は先手と厚みを得ます。三々入りの基本形は必ず覚えておきましょう。</p>',
    '<p>Invading the 3-3 point directly under a 4-4 stone used to be called "too early in the opening — it gives Black thickness". AI changed that: it invades very early, and now it is everyday play among professionals.</p><p>Black\'s first decision is which side to block from. The rule: face the wall toward your own stones or the wider side. Here Black blocks from above at <bdi>Q17</bdi>, makes White crawl along the right side, and builds thickness facing the top and the centre.</p><p>White gets the corner (about 10 points) and secure life; Black gets sente and thickness. This basic shape is a must-know.</p>'],
  notes: [
    ['白は<bdi>R17</bdi>と三々に直接入ります。AI時代になって序盤から当たり前に打たれるようになった手です。', 'White invades the 3-3 at <bdi>R17</bdi> directly — a move AI made a normal opening choice.'],
    ['黒は<bdi>Q17</bdi>と上から押さえます。押さえる向きは、壁を向けたい側（自分の石がある側・広い側）で決めます。<bdi>R16</bdi>から押さえるのも同じくらいの手です。', 'Black blocks from above at <bdi>Q17</bdi>. Choose the direction by where you want the wall to face — toward your stones or the wider side. Blocking at <bdi>R16</bdi> is about equal.'],
    ['白は<bdi>R16</bdi>とハイ、右辺側に眼形を広げます。', 'White crawls to <bdi>R16</bdi>, widening the eye space toward the right side.'],
    ['黒は<bdi>R14</bdi>と一間下を押さえ、白の進出を止めます。<bdi>R15</bdi>のハネ（下の変化）や<bdi>Q15</bdi>のノビも定石で、AIはどれもほぼ同じ評価です。', 'Black blocks one space ahead at <bdi>R14</bdi>, stopping White\'s advance. The hane at <bdi>R15</bdi> (see variation) and the solid <bdi>Q15</bdi> are also joseki; AI rates them all about the same.'],
    ['白は<bdi>R15</bdi>とオシて、黒の一間の間を突きます。', 'White pushes at <bdi>R15</bdi> into the gap of Black\'s one-space shape.'],
    ['黒は<bdi>Q15</bdi>とツイで切断を防ぎます。ここを省くと<bdi>Q15</bdi>に切られて<bdi>R14</bdi>が孤立します。', 'Black connects at <bdi>Q15</bdi>. If omitted, White cuts here and <bdi>R14</bdi> is isolated.'],
    ['白は<bdi>S14</bdi>と二線にハネて眼形を確保し、隅の生きを確かにします。黒は先手を得て厚みを生かした大場に向かいます。', 'White hanes on the second line at <bdi>S14</bdi>, securing the eye space and life. Black has sente and turns to a big point that uses the thickness.'],
  ],
  vars: [
    { title: ['ハネ・ハネ返しの型（古くからの定石）', 'Hane and hane back (classic)'],
      notes: [['黒は<bdi>R15</bdi>とハネて白の頭を押さえます。', 'Black hanes at <bdi>R15</bdi>, at the head of White\'s stones.'],
        ['白は<bdi>S15</bdi>とハネ返します。', 'White hanes back at <bdi>S15</bdi>.'],
        ['黒は<bdi>R14</bdi>とノビて切りに備えます。', 'Black extends to <bdi>R14</bdi>, guarding against the cut.'],
        ['白は<bdi>S14</bdi>とノビて眼形を確保し、生きます。黒は先手で厚みを得ます。', 'White extends to <bdi>S14</bdi> and secures life. Black keeps sente and thickness.']] },
    { title: ['<bdi>Q15</bdi>のノビ（AIの本手）', 'The solid extension <bdi>Q15</bdi> (AI\'s honest move)'],
      notes: [['黒は<bdi>Q15</bdi>と堅くノビます。弱点がなく、後の手段も残さない本手です。', 'Black extends solidly at <bdi>Q15</bdi> — no weaknesses and no aji left behind.'],
        ['白は<bdi>S14</bdi>とケイマにすべって眼形を作り、生きます。', 'White slides to <bdi>S14</bdi> with a knight\'s move and lives.']] },
    { title: ['<bdi>R16</bdi>から押さえる型', 'Blocking from <bdi>R16</bdi>'],
      notes: [['黒は<bdi>R16</bdi>と右辺側から押さえ、壁を上辺に向けます。', 'Black blocks from the right side at <bdi>R16</bdi>, facing the wall toward the top side.'],
        ['白は<bdi>Q17</bdi>と上辺側にハイます。', 'White crawls along the top to <bdi>Q17</bdi>.'],
        ['黒は<bdi>P16</bdi>と一歩引いて構えます。', 'Black draws back to <bdi>P16</bdi>.'],
        ['白は<bdi>O18</bdi>と二線をすべって生きます。黒は右辺に厚い壁を得ました。', 'White slides along the second line to <bdi>O18</bdi> and lives. Black has a thick wall facing the right side.']] },
  ],
};

T.hoshi_takagakari = {
  level: 2, side: 1,
  label: ['星', '4-4'],
  title: ['一間高ガカリ・下ツケ', 'High approach, attach underneath'],
  short: ['高いカカリには下からツケて引き、隅の地と根拠を確保する', 'Against the high approach, attach underneath and draw back — corner and base secured'],
  story: [
    '<p><bdi>Q14</bdi>の一間高ガカリは、小ゲイマガカリより中央寄りで、右辺の模様を消す働きが強いカカリです。その代わり隅への影響は弱く、三々にも入りにくくなります。</p><p>黒の代表的な対応は<bdi>R14</bdi>の下ツケから<bdi>R15</bdi>と引く「ツケヒキ」。隅の地を確実にしながら、白を右辺へ押しやります。その後、黒は上辺に<bdi>O16</bdi>と一間に構え、隅から上辺に根拠を広げます。</p><p>黒は堅い地、白は右辺の厚み、という分かれ。黒が地を大事にしたい布石で選びます。</p>',
    '<p>The one-space high approach at <bdi>Q14</bdi> is closer to the centre than the low approach: it is better at erasing a right-side framework, but weaker in the corner, and the 3-3 invasion is harder afterward.</p><p>Black\'s typical answer is the attach-and-draw-back: attach underneath at <bdi>R14</bdi>, then draw back to <bdi>R15</bdi>. This secures the corner while pushing White toward the right side. Then Black jumps to <bdi>O16</bdi> on the top side to widen the base.</p><p>Black gets solid territory, White thickness on the right. Choose it when Black values territory.</p>'],
  notes: [
    ['白は<bdi>Q14</bdi>と一間高ガカリ。四線から中央寄りにカカり、右辺の黒の発展を抑えます。', 'White approaches high at <bdi>Q14</bdi>, on the fourth line, limiting Black\'s development on the right side.'],
    ['黒は<bdi>R14</bdi>と下にツケます。高いカカリの弱点である隅側の下を突き、白に形を決めさせる手です。AIは<bdi>O16</bdi>の一間受け（変化図）をわずかに好みますが、差は1目未満です。', 'Black attaches underneath at <bdi>R14</bdi>, hitting the weak spot of a high approach and forcing White to decide its shape. AI slightly prefers the one-space jump <bdi>O16</bdi> (variation), but the difference is under a point.'],
    ['白は<bdi>R13</bdi>とハネて右辺に地を作る構えを見せます。', 'White hanes at <bdi>R13</bdi>, aiming to build on the right side.'],
    ['黒は<bdi>R15</bdi>と引いて隅を固めます。これが「ツケヒキ」で、隅の地と根拠が確実になります。', 'Black draws back to <bdi>R15</bdi>, firming up the corner. This attach-and-draw-back gives Black a sure corner and base.'],
    ['白は<bdi>Q13</bdi>とツイで形を整えます。<bdi>Q13</bdi>を省くと黒に切られる弱点が残ります。', 'White connects at <bdi>Q13</bdi>. Without it there is a cutting point.'],
    ['黒は<bdi>O16</bdi>と上辺に一間トビで構え、隅から上辺にかけての根拠を広げます。', 'Black jumps to <bdi>O16</bdi> on the top side, extending the base from the corner along the top.'],
    ['白は<bdi>M17</bdi>と上辺に打ち込んで、黒の上辺の発展を制限しつつ左上の白と連携します。黒は隅の地、白は右辺の厚みと上辺の足場を得た分かれです。', 'White plays <bdi>M17</bdi> on the top side, limiting Black\'s expansion and linking with the upper-left white corner. Black has the corner, White the right-side thickness and a foothold on top.'],
  ],
  vars: [
    { title: ['一間トビで受ける', 'Answer with a one-space jump'],
      notes: [['黒はツケずに<bdi>O16</bdi>と一間に受けます。白に右辺で形を選ばせる、穏やかな受け方です。', 'Instead of attaching, Black jumps to <bdi>O16</bdi> — a calm answer that leaves White to choose its right-side shape.']] },
  ],
};

T.hoshi_ryogakari = {
  level: 2, side: 1,
  label: ['星', '4-4'],
  title: ['両ガカリ・ツケ', 'Double approach, attach'],
  short: ['手を抜いて両ガカリされたら、片方にツケて形を決める', 'Double approach after a tenuki: attach to one side and settle the shape'],
  story: [
    '<p>小ゲイマガカリに手を抜くと、白は反対側からもカカって「両ガカリ」にできます。隅の黒一子が挟み撃ちにされるので、黒は形を整える必要があります。</p><p>基本は「強い方（または自分が地にしたくない方）にツケる」。この図では右辺の<bdi>R14</bdi>に<bdi>Q14</bdi>とツケ、ハネ・ノビの後、白が隅の<bdi>R16</bdi>に入ってくるのを<bdi>R17</bdi>・<bdi>Q17</bdi>と受けて、黒は隅の地を確保します。</p><p>白は右辺と上辺にそれぞれ形を作り、黒は隅と中央の厚みを得ます。手抜きした代償は小さく、両ガカリは怖くないことがわかります。</p>',
    '<p>If Black ignores the low approach, White can approach from the other side as well — a double approach. The lone corner stone is squeezed from both sides, so Black must settle its shape.</p><p>The rule: attach to the stronger side (or the side you do not mind giving away). Here Black attaches to <bdi>R14</bdi> at <bdi>Q14</bdi>; after the hane and extension White slides into the corner at <bdi>R16</bdi>, and Black answers at <bdi>R17</bdi> and <bdi>Q17</bdi> to keep the corner.</p><p>White makes shapes on both sides, Black gets the corner and central thickness. The price of the tenuki is small — the double approach is nothing to fear.</p>'],
  notes: [
    ['黒が<bdi>R14</bdi>のカカリに手を抜いたので、白は<bdi>O17</bdi>と上辺からもカカって両ガカリにします。', 'Black ignored the approach at <bdi>R14</bdi>, so White approaches from the top side as well at <bdi>O17</bdi> — a double approach.'],
    ['黒は<bdi>Q14</bdi>と右辺の白にツケます。ツケて相手を固めると同時に、自分の形も整えるのが両ガカリへの基本です。', 'Black attaches to the right-side stone at <bdi>Q14</bdi>. Attaching settles your own shape while firming up one opponent stone — the basic answer to a double approach.'],
    ['白は<bdi>Q13</bdi>とハネて右辺に形を作ります。', 'White hanes at <bdi>Q13</bdi>, making shape on the right side.'],
    ['黒は<bdi>P14</bdi>とノビて中央に頭を出します。', 'Black extends to <bdi>P14</bdi>, heading for the centre.'],
    ['白は<bdi>R16</bdi>と隅にツケて、右辺の石の根拠と隅の地を狙います。', 'White attaches at <bdi>R16</bdi> in the corner, aiming for a base and corner territory.'],
    ['黒は<bdi>R17</bdi>と隅側から押さえ、三々を守ります。', 'Black blocks from the corner side at <bdi>R17</bdi>, protecting the 3-3.'],
    ['白は<bdi>R15</bdi>とツイで右辺の石をつなげ、根拠を確保します。', 'White connects at <bdi>R15</bdi>, joining the right-side stones and securing a base.'],
    ['黒は<bdi>Q17</bdi>とツイで隅の地を確定させます。', 'Black connects at <bdi>Q17</bdi>, confirming the corner territory.'],
    ['白は<bdi>L17</bdi>と上辺の<bdi>O17</bdi>から二間にヒラいて、こちらも根拠を作ります。黒は隅と中央の厚み、白は二つの辺に安定した石を得た分かれです。', 'White extends two spaces from <bdi>O17</bdi> to <bdi>L17</bdi>, giving that stone a base as well. Black has the corner and central thickness, White two settled groups.'],
  ],
  vars: [
    { title: ['一間トビで受ける', 'Answer with a one-space jump'],
      notes: [['黒は<bdi>O16</bdi>と一間にトんで、上辺の白<bdi>O17</bdi>の頭を押さえます。中央への進出と上辺の白への圧力を兼ねた手で、AIは<bdi>Q14</bdi>のツケとほぼ同じ評価です。', 'Black jumps to <bdi>O16</bdi>, capping the head of the top-side stone <bdi>O17</bdi>. It heads for the centre while pressing that stone; AI rates it about the same as the attachment at <bdi>Q14</bdi>.']] },
  ],
};
