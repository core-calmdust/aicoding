# Backgammon warm-up ramps (3D lessons): source of backgammon/ramps.json. ja = ダイスン's voice, en = plain friendly English.
# Positions: me = {my point: n} (bar 25), op = {opponent's own point: n} (bar 25); the rest of the 15 are borne off.
S = dict(me={24: 2, 13: 5, 8: 3, 6: 5}, op={24: 2, 13: 5, 8: 3, 6: 5})
HOME = [1, 2, 3, 4, 5, 6]

def E(pos, marks, t, b, **kw):
    return dict(k='explain', pos=pos, marks=marks, t=t, b=b, **kw)

def T(pos, dice, ok, g, h, y, marks=None, ans=None, look=None):
    return dict(k='try', pos=pos, dice=dice, ok=ok, g=g, h=h, y=y, marks=marks or [], ans=ans, look=look or [])

def pts(lst, c='hl'):
    return [dict(pt=p, cls=c) for p in lst]

R = {}

R['move'] = [
    E(S, pts(HOME) + [dict(m='YN', cls='ok'), dict(m='NM', cls='ok'), dict(m='MB', cls='ok')],
      t=dict(ja='ぐるっと回って右下へ', en='All the way round to the bottom right'),
      b=dict(ja='光っている右下の6つが、きみの駒のゴール、<b>インナーボード</b>だよ。駒は右上のいちばん奥から出発して、矢印のように上の段を左へ進むんだ。<br>下の段に降りたら、今度は右へ。ぐるっと回って、光っている場所に全部集めたら、外へ出していけるよ。',
             en='The six glowing points at the bottom right are your <b>home board</b> — where your checkers are heading. They start at the far top right and travel left along the top, like the arrow.<br>Down on the bottom row they turn right. Gather them all on the glowing points, then you can start taking them off.')),
    T(S, [3, 1], 'any',
      g=dict(ja='サイコロは3と1。好きな駒を動かしてみよう！ 3と1を別々の駒に使っても、1つの駒で4つ進んでもいいよ。', en='You rolled 3 and 1. Move any checkers you like! Use the 3 and the 1 on two checkers, or move one checker four points.'),
      h=dict(ja='金の輪がついた駒から選べるよ。タップして、光った行き先をタップしてね。', en='You can pick any checker with a gold ring. Tap it, then tap a glowing destination.'),
      y=dict(ja='できたね！ サイコロの目の1つずつが、1回の移動なんだ。', en='You did it! Each number on the dice is one move.')),
    T(S, [3, 1], 'make:5',
      g=dict(ja='もう一度3と1だよ。今度は2つの駒を同じポイントにそろえて、新しいポイントを作ってみよう！', en='3 and 1 again. This time bring two checkers to the same point and make a new point!'),
      h=dict(ja='バーの左から2つ目の山と、インナーの一番左の山を見て。どちらからでも、インナーの右から5番目に届くんだ。', en='Look at the stack second left of the bar and the leftmost stack of your home board. Both can reach the 5th point from the right.'),
      y=dict(ja='ゴールデンポイントのできあがり！ 2個そろうと、相手はもうそこに止まれないよ。', en='The golden point is made! With two checkers there, your opponent can never land on it.'),
      marks=[dict(froms='IG', cls='ring')], ans='IFGF', look=pts([5], 'ok')),
]

ENTER = dict(me={25: 1, 13: 5, 8: 3, 6: 5, 24: 1}, op={6: 5, 4: 2, 8: 3, 13: 5})
ENTER2 = dict(me={25: 1, 13: 5, 8: 3, 6: 5, 24: 1}, op={6: 5, 4: 2, 8: 2, 13: 5, 3: 1})
R['enter'] = [
    E(ENTER, pts([20, 22, 23, 24], 'ok') + pts([19, 21], 'ng'),
      t=dict(ja='入れる場所、入れない場所', en='Where you can come in — and where you can’t'),
      b=dict(ja='バーにいる駒は、相手のインナー（右上の6つ）から入り直すよ。サイコロの1なら右上のいちばん奥、6ならバーのすぐ右、という具合に、出た目で入る場所が決まるんだ。<br>緑の場所は空いているから入れるけど、赤い場所は相手の駒が2個以上いてふさがっているよ。',
             en='A checker on the bar comes back in through the opponent’s home board (the six at the top right). A 1 enters at the far top right, a 6 just right of the bar — the number decides the spot.<br>The green points are open. The red ones hold two or more opposing checkers, so they are shut.')),
    T(ENTER, [5, 3], 'enter',
      g=dict(ja='サイコロは5と3。まずはバーの駒を入れて、残りの目も使ってみよう！', en='You rolled 5 and 3. Bring the checker on the bar in first, then use the other number too!'),
      h=dict(ja='バーの駒をタップすると、入れる場所が光るよ。', en='Tap the checker on the bar and the points it can enter will glow.'),
      y=dict(ja='おかえり！ バーの駒が入れたから、ほかの駒もまた動かせるね。', en='Welcome back! With the bar checker in, your other checkers can move again.'),
      marks=[dict(froms='Z', cls='ring')]),
    T(ENTER2, [3, 1], 'hit',
      g=dict(ja='サイコロは3と1。入るついでに、相手のブロットを打てるかな？', en='You rolled 3 and 1. Can you hit an opposing blot as you come in?'),
      h=dict(ja='相手の駒が1個だけの場所を探してみて。3の目で入る場所を見てごらん。', en='Look for a point with a single opposing checker. Where does the 3 bring you in?'),
      y=dict(ja='入ったついでにヒット！ 今度は相手がバーから出直す番だよ。', en='In and a hit at the same time! Now the opponent has to come in from the bar.'),
      ans='ZW', look=pts([22], 'ok')),
]

HIT = dict(me={24: 2, 13: 5, 8: 3, 6: 4, 4: 1}, op={24: 2, 13: 4, 8: 3, 6: 5, 9: 1})
R['hit'] = [
    E(HIT, [dict(m='YQ', cls='ok'), dict(pt=16, cls='hl')],
      t=dict(ja='1個だけの駒はねらわれる', en='A lone checker is a target'),
      b=dict(ja='上の段の印の場所に、相手の駒がぽつんと1個だけ。これが<b>ブロット</b>だよ。右上の奥にいる駒から、ちょうど8つ先なんだ。<br>8は5と3、6と2、4のゾロ目などで届くね。ぴったり止まれば<b>ヒット</b>で、相手の駒はバーへ行き、スタートからやり直しになるよ。',
             en='At the marked point on the top row sits a single opposing checker — a <b>blot</b>. It is exactly 8 away from your checkers at the far top right.<br>5 and 3, 6 and 2 or double 4 all make 8. Land on it and that is a <b>hit</b>: the checker goes to the bar and must start all over again.')),
    T(HIT, [6, 2], 'hit',
      g=dict(ja='サイコロは6と2。相手のブロットを打ってみよう！', en='You rolled 6 and 2. Hit the opposing blot!'),
      h=dict(ja='右上の奥の駒から、6と2を続けて使うと8つ進めるよ。', en='Play the 6 and the 2 with one checker from the far top right to move 8.'),
      y=dict(ja='ヒット！ 相手の駒はバーへ。遠くまで来ていた駒ほど、打たれると痛いんだ。', en='Hit! The checker goes to the bar. The further it had come, the more that hurts.'),
      ans='YSSQ', look=pts([16], 'ok')),
]

BO = dict(me={6: 3, 5: 3, 4: 3, 3: 2, 2: 2, 1: 2}, op={6: 5, 5: 5, 4: 5})
BO2 = dict(me={6: 2, 5: 3, 4: 4, 3: 3, 2: 3}, op={24: 2, 6: 5, 5: 4, 4: 4})
R['bearoff'] = [
    E(BO, [dict(m='GA', cls='ok')] + pts(HOME),
      t=dict(ja='全員そろったら外へ', en='All home? Then off they go'),
      b=dict(ja='15個がぜんぶインナーに入ったら、<b>ベアオフ</b>で駒を盤の外へ出せるよ。6の目ならインナーの一番左の駒、1の目なら一番右の駒、という具合なんだ。<br>先に15個を出しきったほうの勝ちだよ。',
             en='Once all 15 checkers are in your home board, you can <b>bear off</b> — take them off the board. A 6 takes off a checker from the leftmost home point, a 1 from the rightmost.<br>The first to bear off all 15 wins.')),
    T(BO, [6, 4], 'off:2',
      g=dict(ja='サイコロは6と4。駒を2個、外へ出してみよう！', en='You rolled 6 and 4. Bear off two checkers!'),
      h=dict(ja='6の目は一番左の山、4の目は右から4番目の山から出せるよ。', en='The 6 takes one off the leftmost stack, the 4 one off the 4th point from the right.'),
      y=dict(ja='2個とも外へ！ この調子でどんどん出していこう。', en='Two off! Keep them coming.'),
      ans='GAEA'),
    T(BO2, [6, 1], 'safe',
      g=dict(ja='今度は右下のすみに相手の駒が残っているよ。サイコロは6と1。ブロットを残さないように出してみよう！', en='This time an opposing pair is still sitting in your home board. You rolled 6 and 1. Bear off without leaving a blot!'),
      h=dict(ja='動かしたあと、1個だけになる場所ができないか確かめてね。', en='After you move, check that no point is left with a single checker.'),
      y=dict(ja='安全に出せたね！ 相手が残っているときは、出す数より安全が先なんだ。', en='Safely done! While the opponent is still around, safety comes before speed.'),
      look=pts([24], 'ng')),
]

R['open1'] = [
    T(S, [4, 2], 'make:4',
      g=dict(ja='最初の1手で4と2が出たよ。新しいポイントを作ってみよう！', en='Your opening roll is 4 and 2. Make a new point!'),
      h=dict(ja='バーの左から2つ目の山から4つ、インナー一番左の山から2つ進めると、同じ場所に着くよ。', en='4 from the stack second left of the bar and 2 from the leftmost home stack land on the same point.'),
      y=dict(ja='インナーの右から4番目のポイントが完成！ ゴールデンポイントの次に大事な場所なんだ。', en='The 4th point from the right is made — the next best thing after the golden point.'),
      marks=[dict(froms='IG', cls='ring')], ans='IEGE'),
    T(S, [6, 1], 'make:7',
      g=dict(ja='今度は6と1。どこにポイントを作れるかな？', en='Now 6 and 1. Where can you make a point?'),
      h=dict(ja='左上のミッドポイントから6つ、バーの左から2つ目の山から1つ。どちらもバーのすぐ左に着くよ。', en='6 from the midpoint (top left) and 1 from the stack second left of the bar both land just left of the bar.'),
      y=dict(ja='バーポイントのできあがり！ 相手の奥の駒は、6の目で飛び出しにくくなったよ。', en='The bar point is made! The opponent’s back checkers can no longer jump out so easily with a 6.'),
      marks=[dict(froms='NI', cls='ring')], ans='NHIH'),
]

R['open2'] = [
    T(S, [6, 5], 'plays:YSSN,YTTN',
      g=dict(ja='最初の1手で6と5。ポイントは作れないから、いちばん奥の駒を一気に走らせてみよう！', en='Opening roll 6 and 5. No point to make — run a back checker all the way!'),
      h=dict(ja='右上の奥の駒を、6と5で続けて動かすと、左上のミッドポイントまで届くよ。', en='Move one far top-right checker 6 and then 5: it reaches the midpoint at the top left.'),
      y=dict(ja='一気に安全地帯へ！ この「6-5で走る」は昔からの定番なんだ。', en='Straight to safety! Running with 6-5 is a classic.'),
      marks=[dict(froms='Y', cls='ring')], ans='YSSN'),
    T(S, [2, 1], 'plays:NLYX,NLGF',
      g=dict(ja='今度は2と1。ポイントは作れないね。次のポイント作りの材料をまいてみよう！', en='Now 2 and 1 — no point to make. Spread some builders for your next point!'),
      h=dict(ja='2の目でミッドポイントから1個降ろして、1の目は奥の駒を1つ分けるのが今の定番だよ。', en='The modern way: bring one down from the midpoint with the 2, and split a back checker with the 1.'),
      y=dict(ja='いい形！ 降ろした駒が、次にポイントを作るときの材料になるよ。', en='Nice shape! The checker you brought down will help make a point next turn.'),
      ans='NLYX'),
]

O3 = dict(me=S['me'], op={24: 2, 13: 5, 8: 2, 6: 4, 4: 2})
O3b = dict(me=S['me'], op={24: 1, 23: 1, 13: 4, 11: 1, 8: 3, 6: 5})
R['open3'] = [
    T(O3, [6, 6], 'plays:YSYSNHNH',
      g=dict(ja='相手は最初の1手でポイントを作ったよ。こっちは6のゾロ目！ ポイントを2つ一度に作ってみよう。', en='The opponent made a point with their opening roll. You rolled double 6! Make two points at once.'),
      h=dict(ja='奥の2個をそろって6つ進めると相手のバーポイント、ミッドポイントから2個を6つ進めると自分のバーポイントだよ。', en='Move both back checkers 6 to take the opponent’s bar point, and two from the midpoint 6 to make your own bar point.'),
      y=dict(ja='ポイントが2つも！ ゾロ目は4回動けるから、こんな大技ができるんだ。', en='Two points in one go! Doubles move four times — that is what makes this possible.'),
      ans='YSYSNHNH'),
    T(O3b, [6, 4], 'hit',
      g=dict(ja='相手は駒を分けて、ブロットを2つ残したよ。サイコロは6と4。打てるかな？', en='The opponent split and left two blots. You rolled 6 and 4. Can you hit?'),
      h=dict(ja='上の段の、相手の駒が1個だけの場所を探してみて。奥の駒から10進むと届くよ。', en='Find the lone opposing checker on the top row. A back checker moving 10 reaches it.'),
      y=dict(ja='ヒット！ 相手が残したブロットは、見のがさないのが大事なんだ。', en='A hit! Never miss a blot the opponent leaves.'),
      look=pts([14], 'ok')),
]

PR = dict(me={8: 2, 7: 2, 6: 2, 5: 2, 4: 2, 13: 3, 10: 1, 24: 1}, op={24: 1, 6: 4, 5: 4, 4: 3, 13: 3})
R['prime'] = [
    E(PR, pts([4, 5, 6, 7, 8]) + [dict(pt=1, cls='ng')],
      t=dict(ja='並んだポイントは壁になる', en='Points in a row make a wall'),
      b=dict(ja='光っている5つのポイントが横に並んでいるね。これが<b>プライム</b>、つまり壁だよ。<br>右下のすみにいる相手の駒は、この壁を飛びこえないと逃げられないんだ。5つの壁だと、すぐ手前まで来ても6の目でしかこえられないよ。',
             en='Five points in a row glow here — a <b>prime</b>, a wall.<br>The opposing checker in the bottom-right corner has to jump the whole wall to escape. Even from right in front of a five-point wall, only a 6 gets over it.')),
    T(PR, [4, 1], 'make:9',
      g=dict(ja='サイコロは4と1。壁をもう1つ伸ばして、6つの壁にしてみよう！', en='You rolled 4 and 1. Add one more point and make a six-point wall!'),
      h=dict(ja='壁の左どなりがあいているね。ミッドポイントから4つ、バーの左にいる1個から1つで届くよ。', en='The point just left of the wall is empty. 4 from the midpoint and 1 from the single checker left of the bar both reach it.'),
      y=dict(ja='6つの壁のできあがり！ 後ろの相手の駒は、もう一歩も出られないよ。', en='A full six-point prime! The checker behind it cannot move at all.'),
      ans='NJKJ', look=pts([9], 'ok')),
]

AN = dict(me={24: 1, 21: 1, 13: 5, 8: 3, 6: 5}, op={6: 5, 3: 2, 8: 3, 13: 5})
R['anchor'] = [
    T(AN, [4, 1], 'make:20',
      g=dict(ja='相手のインナーに、きみの駒が1個ずつ離れているよ。サイコロは4と1。2個そろえてアンカーを作ってみよう！', en='Two of your checkers sit alone in the opponent’s home board. You rolled 4 and 1. Join them into an anchor!'),
      h=dict(ja='奥の駒を4つ、もう1個を1つ進めると、同じ場所にそろうよ。', en='Move the deepest checker 4 and the other one 1: they meet on the same point.'),
      y=dict(ja='相手のゴールデンポイントにアンカー！ これで打たれても戻る場所があるね。', en='An anchor on the opponent’s golden point! Now you always have somewhere to come back to.'),
      ans='YUVU', look=pts([20], 'ok')),
]

BL = dict(me={6: 3, 5: 2, 4: 2, 8: 3, 13: 3, 10: 2}, op={25: 1, 22: 1, 13: 5, 8: 3, 6: 5})
R['blitz'] = [
    E(BL, pts([4, 5, 6], 'ok') + [dict(pt=3, cls='hl')],
      t=dict(ja='相手がバーにいるうちに', en='While they are on the bar'),
      b=dict(ja='相手の駒が1個バーにいて、こっちのインナーには緑のポイントが3つ。さらにインナーの右から3番目に、相手のブロットがぽつんといるよ。<br>こういうときは、もう1個打ってバーの駒を増やすのが<b>ブリッツ</b>。入れない相手は反撃できないんだ。',
             en='One opposing checker is on the bar, and your home board has three green points. There is also a lone opposing blot on the 3rd point from the right.<br>Hitting it too, so two checkers are stuck on the bar, is a <b>blitz</b>. A player who cannot come in cannot fight back.')),
    T(BL, [3, 2], 'hit',
      g=dict(ja='サイコロは3と2。攻めを続けて、もう1個打ってみよう！', en='You rolled 3 and 2. Keep attacking — hit another one!'),
      h=dict(ja='インナーの右から3番目の、相手の1個をねらってみて。', en='Aim at the single opposing checker on the 3rd point from the right.'),
      y=dict(ja='ダブルでバーへ！ 相手はもう、入るので手いっぱいだね。', en='Two on the bar! The opponent is busy just trying to come in.'),
      look=pts([3], 'ok')),
]

ES = dict(me={24: 1, 6: 4, 5: 4, 4: 3, 3: 3}, op={8: 5, 6: 5, 5: 5})
R['escape'] = [
    T(ES, [6, 5], 'race',
      g=dict(ja='ピップはきみのほうが少ない、つまりリードしているよ。サイコロは6と5。後ろの駒を逃がして、レースにしちゃおう！', en='You have fewer pips — you are ahead. You rolled 6 and 5. Run the back checker and turn it into a race!'),
      h=dict(ja='右上の奥の1個を、6と5で続けて動かしてみて。相手の駒の前を通りぬけられるよ。', en='Move the lone far top-right checker 6 and then 5: it gets past all the opposing checkers.'),
      y=dict(ja='逃げきった！ もうぶつかり合いはないから、リードしているきみが有利なレースだよ。', en='Away! No more contact — and you lead the race.'),
      marks=[dict(froms='Y', cls='ring')], ans='YSSN'),
]

SF = dict(me={13: 4, 8: 4, 6: 4, 4: 1, 2: 2}, op=S['op'])
R['safe'] = [
    T(SF, [4, 2], 'safe',
      g=dict(ja='サイコロは4と2。インナーの右から4番目に、1個だけの駒がいるね。ブロットを残さないように動かしてみよう！', en='You rolled 4 and 2. There is a single checker on the 4th point from the right. Move so that no blot is left!'),
      h=dict(ja='1個だけの駒に、もう1個を重ねてあげよう。4の目なら届く駒があるよ。', en='Put a second checker on top of the lone one — the 4 can bring one there.'),
      y=dict(ja='ブロットなし、安全な形！ これで相手のサイコロをこわがらなくていいね。', en='No blots — a safe position! Now the opponent’s dice can’t hurt you.'),
      look=pts([4], 'hl')),
]

SH1 = dict(me={13: 6, 10: 1, 24: 2, 2: 3, 1: 3}, op={21: 2, 13: 5, 8: 3, 6: 5})
SH2 = dict(me={13: 6, 12: 1, 24: 2, 2: 3, 1: 3}, op={21: 2, 11: 5, 8: 3, 6: 5})
R['shots'] = [
    E(SH1, [dict(pt=10, cls='ng'), dict(pt=4, cls='hl')],
      t=dict(ja='6つ先のブロットは17通り', en='A blot 6 away: 17 rolls'),
      b=dict(ja='赤い印がきみのブロット、黄色の印の場所に相手の駒がいるよ。間はちょうど6つ。<br>6が出る11通りに、5-1・4-2・3-3・2-2の足し算を加えて、36通りのうち<b>17通り</b>で当たっちゃうんだ。',
             en='The red mark is your blot; an opposing checker waits on the yellow one, exactly 6 away.<br>The 11 rolls with a 6, plus 5-1, 4-2, 3-3 and 2-2 adding up to 6: <b>17 of 36</b> rolls hit.')),
    E(SH2, [dict(pt=12, cls='ng'), dict(pt=4, cls='hl')],
      t=dict(ja='8つ先なら6通りだけ', en='8 away: only 6 rolls'),
      b=dict(ja='今度はブロットまで8つ。1個のサイコロでは届かないから、6-2・5-3・4-4・2-2の足し算だけ。<br>36通りのうち<b>6通り</b>しかないね。遠いブロットほど、ぐっと安全になるんだ。',
             en='Now the blot is 8 away. One die can’t reach, so only 6-2, 5-3, 4-4 and 2-2 combinations hit.<br>Just <b>6 of 36</b>. The further away the blot, the safer it is.')),
]

R['bold'] = [
    T(S, [2, 1], 'slot:5',
      g=dict(ja='最初の1手で2と1。思いきって、ゴールデンポイントに1個だけ置いてみよう（スロット）！', en='Opening roll 2 and 1. Be bold: put a single checker on the golden point (a slot)!'),
      h=dict(ja='1の目で、インナーの一番左から1つ進めると、ゴールデンポイントに着くよ。2の目はミッドポイントから降ろしてみて。', en='The 1 takes a checker from the leftmost home point to the golden point. Bring the 2 down from the midpoint.'),
      y=dict(ja='スロット成功！ 打たれなければ、次の番でゴールデンポイントが完成するよ。', en='Slotted! If it isn’t hit, you can cover it and make the golden point next turn.'),
      ans='NLGF', look=pts([5], 'ok')),
]

RC = dict(me={9: 1, 8: 1, 6: 4, 5: 4, 4: 3, 3: 2}, op={6: 4, 5: 4, 4: 4, 3: 3})
R['race'] = [
    E(RC, [dict(pt=9, cls='hl'), dict(pt=8, cls='hl')],
      t=dict(ja='ピップはゴールまでの道のり', en='Pips: the distance to the finish'),
      b=dict(ja='駒ひとつひとつのゴールまでの距離を、全部足したものが<b>ピップ</b>だよ。ここでは、インナーの外に2個残っているね。<br>レースでは、外の駒をむだなくインナーへ入れるのが先。入れてしまえば、すぐに外へ出しはじめられるんだ。',
             en='Add up how far each checker still has to go and you get the <b>pip count</b>. Here two checkers are still outside the home board.<br>In a race, bring the stragglers home without waste first — then you can start bearing off at once.')),
    T(RC, [3, 2], 'allhome',
      g=dict(ja='サイコロは3と2。外の2個を、両方ともインナーに入れてみよう！', en='You rolled 3 and 2. Bring both outside checkers into your home board!'),
      h=dict(ja='バーの左にいる2個を見て。3の目と2の目で、ちょうどインナーの一番左に入れるよ。', en='Look at the two checkers left of the bar. The 3 and the 2 bring each into the leftmost home point.'),
      y=dict(ja='全員インナーに集合！ 次の番から外へ出していけるよ。', en='Everyone is home! From your next turn you can bear off.'),
      ans='JGIG'),
]

R['bearcontact'] = [
    T(BO2, [6, 1], 'safe',
      g=dict(ja='相手のアンカーが残っているベアオフだよ。サイコロは6と1。ブロットを作らない動かし方は？', en='Bearing off against an anchor. You rolled 6 and 1. How do you move without leaving a blot?'),
      h=dict(ja='一番左の2個を、そろって動かしてみたらどうかな。', en='Try moving the two leftmost checkers together.'),
      y=dict(ja='ブロットなし！ 出す数が少し減っても、安全を選ぶのが正解なんだ。', en='No blots! Taking off one fewer checker is fine when it keeps you safe.'),
      look=pts([24], 'ng')),
]

BP = dict(me={6: 3, 4: 3, 3: 3, 2: 3, 1: 3}, op={6: 5, 5: 5, 4: 5})
R['bearopt'] = [
    T(BP, [6, 1], 'off:1&has:5',
      g=dict(ja='インナーの右から5番目があいているね。サイコロは6と1。1個出して、あいた場所も埋めてみよう！', en='The 5th point from the right is empty. You rolled 6 and 1. Bear one off and fill the gap!'),
      h=dict(ja='6の目で1個出して、1の目でインナーの一番左から1つ進めてみて。', en='Bear one off with the 6, and move a checker one step from the leftmost point with the 1.'),
      y=dict(ja='すき間なし！ これで次にどの目が出ても、むだになりにくいよ。', en='No gaps! Now whatever you roll next is less likely to be wasted.'),
      ans='GAGF', look=pts([5], 'ok')),
]

CB = dict(me={6: 4, 5: 4, 4: 3, 3: 2, 2: 2}, op={6: 3, 5: 3, 4: 3, 8: 3, 9: 3})
R['cube'] = [
    E(S, [],
      t=dict(ja='ダブリングキューブってなに？', en='What is the doubling cube?'),
      b=dict(ja='盤のまん中にある、数字の書かれた大きなサイコロが<b>ダブリングキューブ</b>だよ。<br>自分の番でサイコロを振る前に「ダブル」と言うと、勝負の点数を2倍にしようと持ちかけられるんだ。相手は受けて続けるか、ここで負けを認めるかを選ぶよ。',
             en='The big die with numbers in the middle of the board is the <b>doubling cube</b>.<br>Before rolling on your turn, you may say “double” and offer to play for twice the points. Your opponent then either accepts and plays on, or gives up the game right there.')),
]

R['racecube'] = [
    E(CB, [],
      t=dict(ja='リードを数えてみよう', en='Measure the lead'),
      b=dict(ja='きみのピップは66、相手は96。差は30で、きみのピップで割ると45%ものリードだね。<br>8%をこえていればダブルの目安、12%をこえたら相手はパス。これだけ差があれば、相手は受けてもまず勝てないんだ。',
             en='You have 66 pips, the opponent 96. The lead is 30 — 45% of your own count.<br>8% is enough to double and over 12% the opponent should pass. With a lead like this, they can hardly win if they take.')),
]

R['takepoint'] = [
    E(S, [],
      t=dict(ja='4回に1回勝てるなら受ける', en='Take if you win one game in four'),
      b=dict(ja='ダブルを受けて負けると2点、断れば1点を失うよ。<br>4回やって1回勝てるなら、受けたほうが損が少ないんだ。だから、勝てる見こみが25%くらいあれば<b>テイク</b>、それより低ければ<b>パス</b>が目安だよ。',
             en='Take a double and lose: you lose 2 points. Refuse: you lose 1.<br>If you win one game in four, taking costs less in the long run. So with about 25% winning chances, <b>take</b>; below that, <b>pass</b>.')),
]

BG2 = dict(me={20: 2, 22: 2, 6: 4, 5: 3, 4: 2, 8: 2}, op={6: 4, 4: 3, 2: 3, 1: 2, 9: 1, 8: 2})
R['backgame'] = [
    E(BG2, pts([20, 22], 'ok'),
      t=dict(ja='2つのアンカーで待つ', en='Waiting on two anchors'),
      b=dict(ja='大きく遅れているけど、相手のインナーに緑のアンカーが2つあるね。相手は駒を家に帰すたびに、ブロットを作りやすくなるんだ。<br>そのブロットを打てれば、一気に逆転できるよ。待っている間は、こっちの形をくずさないように気をつけてね。',
             en='You are far behind, but you hold two anchors (green) in the opponent’s home board. Bringing their checkers home, the opponent will often have to leave a blot.<br>Hit it and the game can turn around. While you wait, keep your own position in good shape.')),
]

HD = dict(me={20: 2, 23: 1, 13: 3, 8: 3, 6: 4, 5: 2}, op={24: 2, 13: 3, 11: 1, 8: 3, 6: 4, 4: 2})
R['holding'] = [
    E(HD, pts([20], 'ok') + [dict(pt=14, cls='hl')],
      t=dict(ja='アンカーからにらむ', en='Watching from the anchor'),
      b=dict(ja='相手のゴールデンポイントに、きみのアンカーがあるよ。相手は上の段の駒を家へ運ぶとき、このアンカーの前を通らなきゃいけないんだ。<br>黄色の印のように相手がブロットを残したら、そこがチャンスだよ。',
             en='Your anchor sits on the opponent’s golden point. Every checker they bring home along the top row has to pass in front of it.<br>When they leave a blot, like the one marked in yellow, that is your chance.')),
    T(HD, [6, 3], 'keep:20&hit',
      g=dict(ja='サイコロは6と3。アンカーはそのままにして、相手のブロットを打ってみよう！', en='You rolled 6 and 3. Keep the anchor and hit the blot!'),
      h=dict(ja='アンカーの2個は動かさないで、右上の奥にいる1個で9つ進んでみて。6と3を続けて使うんだ。', en='Leave the two anchor checkers alone and move the single far top-right checker 9: the 6 and then the 3.'),
      y=dict(ja='アンカーを守ったままヒット！ 待っていたかいがあったね。', en='A hit, and the anchor still stands. The wait paid off!'),
      look=pts([14], 'ok')),
]

GM = dict(me={6: 3, 5: 3, 4: 3, 3: 2, 2: 2, 8: 2}, op={25: 2, 24: 2, 6: 4, 5: 3, 13: 4})
R['gammon'] = [
    E(GM, [dict(pt=1, cls='hl')],
      t=dict(ja='ギャモンが見えてきた', en='A gammon in sight'),
      b=dict(ja='相手の駒が2個バーに、2個が右下のすみに残っているね。きみのほうはもうすぐ全員が家に帰れそうだよ。<br>相手が1個も出せないうちに全部出しきれば、<b>ギャモン</b>で2点の勝ち。こういうときは、安全に勝つよりギャモンを狙うほうが得なんだ。',
             en='Two opposing checkers are on the bar and two more in your bottom-right corner, while yours are almost all home.<br>Bear everything off before they take off a single checker and it is a <b>gammon</b>: 2 points. Here, playing for the gammon is worth more than a safe single win.')),
]

STEPS = ['move', 'enter', 'hit', 'bearoff', 'open1', 'open2', 'open3', 'prime', 'anchor', 'blitz', 'escape', 'safe', 'shots', 'bold',
         'race', 'bearcontact', 'bearopt', 'cube', 'racecube', 'takepoint', 'backgame', 'holding', 'gammon']

UI = dict(
    step=dict(ja='準備 {i}/{n}', en='Warm-up {i}/{n}'),
    next=dict(ja='次へ', en='Next'),
    main=dict(ja='本番の問題へ', en='To the problems'),
    note=dict(ja='準備は点数に入らないよ。何回でもやり直してね。', en='Warm-ups are not scored. Try as often as you like.'),
    ng=dict(ja='おしい！ もう一回考えてみよう。こまったら「ヒント」を押してね。', en='Not quite! Think again — press Hint if you’re stuck.'),
    look=dict(ja='光っている場所に注目してみて。', en='Look at the glowing points.'),
    ans=dict(ja='答えは緑の矢印の手だよ。矢印のとおりに動かしてみよう。', en='The answer is the green arrows. Move along them.'),
)
