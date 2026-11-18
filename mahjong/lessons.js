// 雀華：ルールコースとレッスン（ユーザー 2026-11-18「初心者向けにもわかりやすく、項目に分けて、実際の盤面で遊びながら学べる」）。
//
// MJLessons.LessonGame … game.js の MJGame を、決めた局面（手牌・河・リーチ・ドラ・この先のツモ）から1局だけ動かす版。
//   pos: { me: '手牌13枚', drawn: 'ツモ牌'（自分の番から）, turn: 開始の席, river: {席: '牌…'}, riichi: {席: 河の何枚目},
//          melds: {席: [{ type, t, from }]}, hands: {席: '13枚'}, dora: 'ドラ表示牌', draws: {席: ['次に引く牌', …]}, left: 山の残り,
//          scores: [4人], honba, kyotaku, first: 1巡目（ダブリー・九種などのため） }
//   halt = true にすると、いまの打牌の処理が終わったところで局を止める（レッスンの区切り）。
// MJLessons.check(beat, act, g) … 打牌・宣言が課題に合っているか（best = 向聴数→受け入れ枚数のいちばん良い打牌すべて）。
// MJLessons.RULES / LESSONS / CATS … 中身。文章は { ja, en }。
(function (root) {
'use strict';
const MJ = root.MJ || (typeof require !== 'undefined' ? require('./engine.js') : null);
const MJGame = root.MJGame || (typeof require !== 'undefined' ? require('./game.js') : null);
const T = id => id >> 2;
const L = (ja, en) => ({ ja, en });
const P = s => MJ.parse(s);

// ---------------------------------------------------------------- the game from a position
class LessonGame extends MJGame {
  constructor(o) { super(o); this.pos = o.pos; this.halt = false; }
  async run() { await this.emit('game-start', { scores: this.scores.slice() }); await this.playHand(); }
  checkEnd() { this.over = true; }
  // a seat's queued draws come first (the tile is moved to the front of the live wall)
  drawFor(s) {
    const q = this.drawQ && this.drawQ[s];
    if (q && q.length) { const id = q.shift(), i = this.wall.indexOf(id, this.livePos); if (i >= 0 && i < this.liveEnd) [this.wall[i], this.wall[this.livePos]] = [this.wall[this.livePos], this.wall[i]]; }
    return this.draw();
  }
  build() {
    const ps = this.pos, used = new Set(), RED = MJ.RED;
    const take = (t, red) => {
      const c = [0, 1, 2, 3].map(k => t * 4 + k).filter(id => !used.has(id));
      const id = c.find(x => RED.has(x) === !!red) ?? c[0];
      if (id == null) throw new Error('lesson: no ' + MJ.NAMES[t] + ' left');
      used.add(id); return id;
    };
    const ids = (s, red) => P(s).map(t => take(t));
    const me = ids(ps.me);
    if (me.length !== 13 - 3 * ((ps.melds && ps.melds[0]) || []).length) throw new Error('lesson ' + (ps.id || '') + ': hand of ' + me.length);
    const drawn = ps.drawn ? take(P(ps.drawn)[0], ps.drawnRed) : null;
    const rivers = [0, 1, 2, 3].map(s => ps.river && ps.river[s] ? ids(ps.river[s]) : []);
    const melds = [0, 1, 2, 3].map(s => (ps.melds && ps.melds[s] || []).map(m => {
      const t = P(m.t)[0];
      const tiles = m.type === 'chi' ? [t, t + 1, t + 2].map(x => take(x)) : [0, 1, 2].map(() => take(t));
      return { type: m.type, t, tiles, called: tiles[m.type === 'chi' ? 0 : 2], from: m.from ?? (s + 3) % 4 };
    }));
    const ind = take(P(ps.dora || '3z')[0]);   // (the default indicator 西 → dora 北, which the lessons' hands hardly use)
    const hands = [me, null, null, null];
    for (let s = 1; s < 4; s++) if (ps.hands && ps.hands[s]) hands[s] = ids(ps.hands[s]);
    const queued = [0, 1, 2, 3].map(s => (ps.draws && ps.draws[s] || []).map(x => take(P(x)[0])));
    // the rest at random (the seed is fixed per lesson: the same table each time)
    const rest = []; for (let id = 0; id < 136; id++) if (!used.has(id)) rest.push(id);
    for (let i = rest.length - 1; i > 0; i--) { const j = (this.rand() * (i + 1)) | 0; [rest[i], rest[j]] = [rest[j], rest[i]]; }
    for (let s = 1; s < 4; s++) if (!hands[s]) hands[s] = rest.splice(0, 13 - 3 * melds[s].length);
    const dead = rest.splice(0, 13); dead.splice(4, 0, ind);
    // queued tiles at the far end of the live wall: nobody draws them by chance; drawFor moves each to the front at its turn
    const q = queued.flat(), left = Math.min(ps.left ?? 60, rest.length + q.length);
    const live = rest.slice(0, Math.max(0, left - q.length)).concat(q);
    return { me, drawn, rivers, melds, hands, dead, live, queued };
  }
  async playHand() {
    const ps = this.pos, b = this.build();
    this.wall = b.live; this.dead = b.dead; this.livePos = 0; this.liveEnd = b.live.length;
    this.rinshanPos = 0; this.doraIdx = [4]; this.kans = 0; this.kanSeats = new Set();
    this.firstGo = !!ps.first; this.turnCount = 0; this.lastResult = null;
    this.drawQ = b.queued.map(q => q.slice());
    if (ps.scores) this.scores = ps.scores.slice();
    this.honba = ps.honba || 0; this.kyotaku = ps.kyotaku || 0;
    this.P = [0, 1, 2, 3].map(s => {
      const rv = b.rivers[s].map((id, i) => ({ id, tsumogiri: false, riichi: ps.riichi && ps.riichi[s] === i, taken: false, turn: i }));
      const ri = ps.riichi && ps.riichi[s] != null ? ps.riichi[s] : -1;
      return { seat: s, hand: b.hands[s].slice().sort((x, y) => x - y), melds: b.melds[s], river: rv, riichi: ri >= 0, dblRiichi: false, ippatsu: false, riichiTurn: ri,
        furitenTemp: false, furitenRiichi: false, discards: new Set(rv.map(r => T(r.id))), skUsed: [false, false], fx: {}, firstTurn: !!ps.first };
    });
    await this.emit('hand-start', { round: this.round, kyoku: this.kyoku, honba: this.honba, kyotaku: this.kyotaku, scores: this.scores.slice(), lesson: true });
    for (let s = 0; s < 4; s++) if (this.P[s].riichi) await this.emit('riichi-stick', { seat: s, scores: this.scores.slice(), kyotaku: this.kyotaku });
    await this.emit('lesson-intro', {});   // (the guide's opening pages, over the dealt table)
    let cur = ps.turn ?? 0, drawn = b.drawn, rinshan = false;
    if (drawn == null) { drawn = this.drawFor(cur); }
    this.P[cur].hand.push(drawn);
    await this.emit('draw', { seat: cur, id: drawn });
    // (the same as MJGame.playHand from here, with a stop after each step: halt)
    for (;;) {
      const res = await this.turn(cur, drawn, rinshan);
      rinshan = false;
      if (res.end || this.halt) return;
      if (res.kan) { drawn = this.drawRinshan(); this.P[cur].hand.push(drawn); rinshan = true; await this.emit('draw', { seat: cur, id: drawn, rinshan: true }); continue; }
      const call = await this.callPhase(cur, res.id);
      if (call.end || this.halt) return;
      if (call.caller != null) {
        cur = call.caller;
        if (call.minkan) { drawn = this.drawRinshan(); this.P[cur].hand.push(drawn); rinshan = true; await this.emit('draw', { seat: cur, id: drawn, rinshan: true }); }
        else drawn = null;
        continue;
      }
      { const ab = this.midAbort(); if (ab) { await this.abort(ab); return; } }
      if (this.liveLeft() === 0) { await this.exhaustive(); return; }
      cur = (cur + 1) % 4;
      if (cur === this.dealer) this.firstGo = false;
      drawn = this.drawFor(cur);
      this.P[cur].hand.push(drawn);
      await this.emit('draw', { seat: cur, id: drawn });
    }
  }
}

// ---------------------------------------------------------------- judging
// unseen copies of t for seat s (own hand and melds, all rivers and melds, dora indicators)
function unseen(g, s, t) { return 4 - g.visibleCount(t, s); }
// each discard of the 14 tiles in hand: [type, shanten after, acceptance (unseen tiles that lower it)]
function discardTable(g, s) {
  const p = g.P[s], m = p.melds.length, c = MJ.countsIds(p.hand), out = [];
  for (let d = 0; d < 34; d++) if (c[d]) {
    c[d]--;
    const sh = MJ.shanten(c, m); let uk = 0;
    for (let x = 0; x < 34; x++) if (c[x] < 4) { c[x]++; if (MJ.shanten(c, m) < sh) uk += Math.max(0, unseen(g, s, x) - (x === d ? 0 : 0)); c[x]--; }
    c[d]++;
    out.push([d, sh, uk]);
  }
  return out;
}
function bestDiscards(g, s, by = 'ukeire') {
  const tb = discardTable(g, s), sh = Math.min(...tb.map(x => x[1]));
  const at = tb.filter(x => x[1] === sh);
  if (by === 'shanten') return at.map(x => x[0]);
  const uk = Math.max(...at.map(x => x[2]));
  return at.filter(x => x[2] === uk).map(x => x[0]);
}
// a beat's answer: true / false. ok: { best: 'ukeire'|'shanten' } | { d: '9m1z' } | { act: 'tsumo' } | { suit: 'm'|'p'|'s'|'z' } | { any: true }
function check(beat, a, g, s = 0) {
  const ok = beat.ok || { any: true };
  if (ok.act) return a.act === ok.act && (!ok.d || P(ok.d).includes(T(a.id)));
  if (a.act !== 'discard' && a.act !== 'riichi') return false;
  if (ok.riichi && a.act !== 'riichi') return false;
  const t = T(a.id);
  if (ok.any) return true;
  if (ok.suit) return ok.suit === 'z' ? t >= 27 : t < 27 && 'mps'[Math.floor(t / 9)] === ok.suit;
  if (ok.d) return P(ok.d).includes(t);
  if (ok.best) return bestDiscards(g, s, ok.best).includes(t);
  return false;
}
// the tiles to light for a hint
function hintTypes(beat, g, s = 0) {
  const ok = beat.ok || {};
  if (ok.d) return P(ok.d);
  if (ok.best) return bestDiscards(g, s, ok.best);
  if (ok.suit) { const c = MJ.countsIds(g.P[s].hand); return [...Array(34).keys()].filter(t => c[t] && (ok.suit === 'z' ? t >= 27 : t < 27 && 'mps'[Math.floor(t / 9)] === ok.suit)); }
  return [];
}

// ---------------------------------------------------------------- content
// a beat: { on: 'turn' | 'react', say, ok, good, bad, hint }. Turns / calls with no beat play themselves (tsumogiri / pass).
// end: 'beats' (stop after the last beat) | 'hand' (play the hand out: the win / draw screens).
const ANY = { any: true }, BEST = { best: 'ukeire' };
const RULES = [
  { id: 'r1', title: L('麻雀ってどんなゲーム？', 'What is mahjong?'), point: L('4人で点数を取り合うゲーム', 'Four players, one score race'),
    intro: [
      L('はじめまして、小町です！ うち、雀荘の娘なんですよ。今日から麻雀、ほんものの卓でいっしょに覚えていきましょうね♪', 'Hi, I\'m Komachi! Let\'s learn mahjong together, right here at a real table.'),
      L('麻雀は4人で遊ぶゲームです。みんな25,000点からスタートして、最後にいちばん点数が多い人が1位！ シンプルでしょ？', 'Mahjong is for four players. Everyone starts with 25,000 points, and whoever has the most at the end is first.'),
      L('点数は「アガリ」で増えます。自分の前の牌（手牌）を、決まった形にそろえたらアガれるんです。', 'You gain points by winning a hand: putting the tiles in front of you into a set shape.'),
      L('自分の番になったら、山から1枚引いて（ツモ）、いらない1枚を捨てる。これをみんなで順番にくり返すだけです！', 'On your turn you draw one tile and discard one you don\'t need. Everyone takes turns doing this.') ],
    pos: { me: '258m147p369s1234z', drawn: '5z' },
    beats: [ { on: 'turn', say: L('さっそく、あなたの番ですよ！ 右はしの1枚が、いま引いた牌です。どれでもいいので、タップして捨ててみてください♪', 'It\'s your turn, and the tile on the far right is the one you drew. Tap (click) any tile to discard it!'), ok: ANY,
      good: L('上手、上手！ 捨てた牌は自分の前の「河（かわ）」に並んでいきます。次は牌の種類を見ていきましょっ。', 'Nicely done! Discards line up in front of you — your "river". Next, the kinds of tiles.') } ],
    end: 'beats' },
  { id: 'r2', title: L('牌の種類', 'The tiles'), point: L('萬子・筒子・索子・字牌、各4枚', 'Characters, dots, bamboo, honours — 4 of each'),
    intro: [
      L('牌は大きく4種類！ 漢数字の「萬子（マンズ）」、まるい模様の「筒子（ピンズ）」、竹の「索子（ソーズ）」。どれも1〜9まであります。', 'There are four kinds: characters (manzu), dots (pinzu) and bamboo (souzu), each numbered 1 to 9…'),
      L('それから、文字だけの「字牌（ジハイ）」。東・南・西・北の風と、白・發・中の三元牌です。かっこいいでしょ？', '…and the honours: the winds East, South, West, North and the dragons White, Green, Red.'),
      L('同じ牌が4枚ずつで、ぜんぶで136枚。赤い5は「赤ドラ」っていって、持ってるとアガったときの点数がアップするんです！', 'Four copies of each, 136 tiles in all. A red 5 is a "red dora": it raises the score of a win.') ],
    pos: { me: '19m5p38p27s34z5z6z1s9p', drawn: '4m', draws: { 0: ['7p', '9s'] } },
    beats: [
      { on: 'turn', say: L('まずは萬子（漢数字の牌）を1枚、えいっと捨ててみてください！', 'Discard one characters tile (the ones with Chinese numerals).'), ok: { suit: 'm' },
        good: L('正解です！ それが萬子ですよ♪', 'Right, that\'s a characters tile!'), bad: L('あれれ、それは萬子じゃないです。「一」とか「九」みたいな、漢数字の牌ですよ〜。', 'That isn\'t characters. Look for the Chinese numerals like 一 or 九.') },
      { on: 'turn', say: L('次は字牌（東南西北白發中）を1枚、捨ててみましょう！', 'Now discard an honour tile (a wind or a dragon).'), ok: { suit: 'z' },
        good: L('そのとおり！ 字牌は数字がないので、順番にはつながらないんです。', 'Exactly! Honours don\'t make runs.'), bad: L('字牌は数字のない、文字だけの牌ですよ。よーく見てみて！', 'Honours are the ones with no number, just a character.') },
      { on: 'turn', say: L('最後は、まるい模様の筒子を1枚どうぞ！', 'Last one: discard a dots tile (circles).'), ok: { suit: 'p' },
        good: L('完璧です！ もう牌の見分けはバッチリですね。さすが♪', 'Perfect! You can tell the tiles apart now.'), bad: L('筒子は、まるい模様の牌ですよ〜。', 'Dots tiles have circles on them.') } ],
    end: 'beats' },
  { id: 'r3', title: L('アガリの形', 'A winning hand'), point: L('4つの面子＋1つの雀頭', 'Four sets and a pair'),
    intro: [
      L('アガリの形は「面子（メンツ）4つ＋雀頭（ジャントウ）1つ」、ぜんぶで14枚です。ここ、いちばん大事なところですよ！', 'A winning hand is 14 tiles: four sets plus one pair.'),
      L('面子は、同じ種類で数字が3つ続いた「順子（シュンツ）」か、同じ牌3枚の「刻子（コーツ）」のどっちかです。', 'A set is a run of three in one suit (a chow) or three of the same tile (a pung).'),
      L('雀頭は、同じ牌2枚のペアのこと。たとえば 123萬・456筒・789索・東東東 ＋ 55索、これでアガリです！', 'The pair is two of the same tile. For example 123 characters, 456 dots, 789 bamboo, three Easts + a pair of 5 bamboo.') ],
    pos: { me: '123m456p789s111z5s', drawn: '9m', draws: { 0: ['5s'] } },
    beats: [
      { on: 'turn', say: L('いまの手、あと1枚でアガれる「テンパイ」なんです！ 引いた九萬はいらないので、ぽいっと捨てちゃいましょう。', 'Your hand is one tile from winning — that\'s "tenpai". The 9 characters you drew doesn\'t help: discard it.'), ok: { d: '9m' },
        good: L('ばっちり！ あとは5索が来るのを待つだけです。どきどきしますね…！', 'OK! You\'re waiting for a 5 bamboo.'), bad: L('ほかの牌はもう面子になってますよ。いま引いた九萬を捨てましょう！', 'The others already make sets. Discard the 9 characters you just drew.') },
      { on: 'turn', say: L('きたっ、5索です！ 「ツモ」ボタンを押してアガっちゃいましょう！', 'You drew the 5 bamboo! Press "Tsumo" to win!'), ok: { act: 'tsumo' },
        good: L('やったぁ、アガリです！ 自分で引いてアガるのを「ツモ」って言うんですよ♪', 'A win! Winning on your own draw is called "tsumo".') } ],
    end: 'hand' },
  { id: 'r4', title: L('ツモと打牌', 'Drawing and discarding'), point: L('使いにくい牌から捨てる', 'Throw the least useful tile'),
    intro: [
      L('アガリに近づくコツは、面子になりにくい牌から捨てていくこと！', 'To get closer to a win, throw the tiles least likely to become sets.'),
      L('となりの数字がない「ひとりぼっち」の牌…特に字牌は、同じ牌があと2枚来ないと面子になりません。だから先に手放しやすいんです。', 'A lone honour tile only becomes a set if two more of it come — so it\'s usually the first to go.') ],
    pos: { me: '234m456p789s2s3z1m9m', drawn: '2z', draws: { 0: ['8m'] } },
    beats: [
      { on: 'turn', say: L('どの牌がひとりぼっちか、わかりますか？ いちばん使いにくそうな牌を捨ててみてください！', 'Which tiles have no partners? Discard the least useful one.'), ok: BEST,
        good: L('いい判断です！ ひとりぼっちの牌を整理すると、手がどんどん進むんですよ。', 'Good call! Clearing lone tiles moves the hand forward.'), bad: L('その牌はほかとつながってますよ〜。ひとりぼっちの子を探してみて！', 'That tile is connected to others. Look for a lone tile.') },
      { on: 'turn', say: L('八萬を引きました！ 九萬とくっつきましたね。さて、次は何を捨てます？', 'You drew an 8 characters — it connects with the 9. Now what goes?'), ok: BEST,
        good: L('正解！ 89萬は、7萬が来ればちゃんと順子になります♪', 'Right! 8-9 characters becomes a run if a 7 comes.') } ],
    end: 'beats' },
  { id: 'r5', title: L('役がないとアガれない', 'You need a yaku'), point: L('リーチ・タンヤオ・役牌', 'Riichi, all simples, honour pungs'),
    intro: [
      L('ここで大事なお約束！ アガるには「役（ヤク）」が1つ以上必要なんです。形がそろってても、役がないとアガれません…！', 'One important rule: to win you need at least one "yaku". The right shape alone isn\'t enough.'),
      L('まずは覚えやすい3つから。①リーチ：鳴かずにテンパイしたら宣言！ ②タンヤオ：2〜8の数牌だけで作る！ ③役牌：白・發・中や、自分の風・場の風を3枚そろえる！', 'Three easy ones: ① Riichi — declare it when you\'re tenpai without calls. ② All simples (tanyao) — only 2 to 8. ③ Honour pung — three dragons, or your own / the round\'s wind.'),
      L('「自分の風」は、自分の席の風のこと！ 親が東で、親の右どなりが南、向かいが西、左どなりが北。自分の絵の横に出てる字がそれです！ 「場の風」は今の場の風で、東場なら東、南場なら南。真ん中の「東1局」の東がそれですね。どっちにも当てはまる風（東場の親の東など）なら、役が2つ分になってお得ですよ♪', '"Your wind" is your seat\'s wind: the dealer is East, the dealer\'s right is South, across is West, left is North — it\'s the letter by your portrait. "The round\'s wind" is East in the East round and South in the South round, as shown in the centre ("East 1"). A wind that is both (East for the dealer in the East round) counts twice!') ],
    pos: { me: '234m456p678s33p57s', drawn: '9s', draws: { 0: ['6s'] } },
    beats: [
      { on: 'turn', say: L('この手、2〜8の牌ばっかりですね。タンヤオを狙って、1・9の牌を捨てちゃいましょう！', 'This hand is nearly all 2–8. Go for all simples: discard the 1 or 9.'), ok: { d: '9s' },
        good: L('そうそう！ これで6索待ちのテンパイ。タンヤオの役がついてますよ♪', 'Yes! Now you wait on 6 bamboo, with all simples as your yaku.'), bad: L('タンヤオは1・9・字牌が使えないんです。九索を捨てましょう！', 'All simples can\'t use 1s, 9s or honours. Discard the 9 bamboo.') },
      { on: 'turn', say: L('6索、来ましたっ！ ツモでアガっちゃいましょう！', 'The 6 bamboo! Win by tsumo.'), ok: { act: 'tsumo' },
        good: L('タンヤオ・ツモでアガリです！ 鳴かずにツモると「門前清自摸和（メンゼンツモ）」の役もつくんですよ。', 'All simples and self-draw! Winning on your own draw without calls is a yaku too (menzen tsumo).') } ],
    end: 'hand' },
  { id: 'r6', title: L('リーチしてツモアガリ', 'Riichi and win'), point: L('門前でテンパイ→リーチ', 'Tenpai without calls → riichi'),
    intro: [
      L('鳴かずにテンパイしたら、「リーチ」を宣言できます！ 1000点を場に出すと、それだけで役がつくんです。', 'When you\'re tenpai without calls you can declare riichi: put 1,000 points on the table and you have a yaku.'),
      L('リーチしたら、もう手は変えられなくて、引いた牌をそのまま捨てていきます。宣言から1巡以内にアガれたら「一発」のおまけつき！', 'After riichi you can\'t change your hand: you discard what you draw. Win within one go-around and you get "ippatsu" too!') ],
    pos: { me: '234m678m345p66s78s', drawn: '1z', draws: { 0: ['9s'] } },
    beats: [
      { on: 'turn', say: L('東を捨てると、6索・9索待ちのテンパイです。「リーチ」ボタンを押してから、東を捨ててくださいね！', 'Discarding the East leaves you tenpai on 6 or 9 bamboo. Press "Riichi", then discard the East.'), ok: { act: 'riichi', d: '1z' },
        hint: '1z', good: L('リーチ成功っ！ あとはどーんと待つだけです。', 'Riichi! Now just wait.'), bad: L('先に「リーチ」ボタンを押してから、東の牌を捨ててくださいね〜。', 'Press "Riichi" first, then discard the East.') },
      { on: 'turn', say: L('9索！ アガリですよ！ ツモを押しちゃってください！', 'You drew the 9 bamboo — that\'s a win! Press Tsumo.'), ok: { act: 'tsumo' },
        good: L('リーチ・一発・ツモ！ すごいすごい！ 裏ドラ（リーチした人だけのボーナス）もチェックしてみて♪', 'Riichi, ippatsu, tsumo! Check the ura dora too — a bonus only for riichi.') } ],
    end: 'hand' },
  { id: 'r7', title: L('ロンとフリテン', 'Ron and furiten'), point: L('人の捨て牌でアガる', 'Win on someone\'s discard'),
    intro: [
      L('ほかの人が捨てた牌でアガることを「ロン」って言います。そのときは、捨てた人がひとりで点数を払うんです。', 'Winning on another player\'s discard is "ron". The player who discarded it pays.'),
      L('でも気をつけて！ 自分の待ち牌を自分で捨ててると、ロンできないんです。これが「フリテン」。（ツモならアガれますよ）', 'But if your own river has one of your winning tiles, you can\'t ron — that\'s "furiten" (you can still win by tsumo).') ],
    pos: { me: '234m567m345p66s78s', drawn: '9p', draws: { 1: ['6s'] } },
    beats: [
      { on: 'turn', say: L('いらない九筒を捨てて、6索・9索待ちのテンパイにしちゃいましょう！', 'Discard the unneeded 9 dots to be tenpai on 6 or 9 bamboo.'), ok: { d: '9p' },
        good: L('OKです！ 待ち牌は捨ててないので、フリテンじゃありませんよ。', 'OK! You haven\'t thrown a winning tile, so no furiten.') },
      { on: 'react', say: L('右の人が6索を捨てました！ 今です、「ロン」！', 'The player on your right threw the 6 bamboo! Call "Ron"!'), ok: { act: 'ron' },
        good: L('ロン！ 6索でアガったので、タンヤオもついちゃいました♪', 'Ron! With the 6 you also have all simples.') } ],
    end: 'hand' },
  { id: 'r8', title: L('鳴き（ポン・チー）', 'Calls: pon and chi'), point: L('人の捨て牌で面子を作る', 'Make sets from discards'),
    intro: [
      L('人の捨て牌をもらって面子を作ることを「鳴く」って言います。同じ牌を2枚持ってたら、誰の捨て牌でも「ポン」できるんです！', 'Taking a discard to complete a set is a "call". With two of a tile you can "pon" anyone\'s discard of it.'),
      L('左の人（上家）の捨て牌なら、順子を作る「チー」もできます。鳴いた面子は、表にして右側に置きますよ。', 'From the player on your left you can also "chi" to make a run. Called sets are shown face up on your right.'),
      L('鳴くと手が早く進むけど、リーチはできなくなるし、つかなくなる役もあるんです。役牌のポンなら鳴いても役になるので、とっても便利！', 'Calling is fast, but you lose riichi and some yaku. A dragon pon is a yaku even when called — very handy.') ],
    pos: { me: '77z45m678p23s9p1z1m5s', turn: 1, draws: { 2: ['7z'], 3: ['3m'] } },
    beats: [
      { on: 'react', say: L('向かいの人が「中」を捨てました！ 中は2枚あるので、「ポン」しちゃいましょう！', 'The player across threw a Red dragon. You have two — call "Pon"!'), ok: { act: 'pon' },
        good: L('ポン！ 中が3枚そろって、役牌の役がつきました♪', 'Pon! The Red dragon pung is your yaku.') },
      { on: 'turn', say: L('鳴いたら1枚捨てる番です。いちばん使いにくい牌をどうぞ！', 'After a call you discard one tile. Throw the least useful.'), ok: BEST,
        good: L('いいですね〜！', 'Nice!') },
      { on: 'react', say: L('左の人が三萬を捨てましたよ！ 45萬とつながるので「チー」です！', 'The player on your left threw a 3 characters. It fits 4-5 — call "Chi"!'), ok: { act: 'chi' },
        good: L('チー！ 順子は左の人からだけもらえるんです。覚えておいてくださいね。', 'Chi! Runs can only be taken from the player on your left.') },
      { on: 'turn', say: L('もう一回、いらない牌を捨てましょう！', 'Again, discard the tile you don\'t need.'), ok: BEST,
        good: L('テンパイまであと少し！ 鳴くとほんとに早いでしょ？', 'Almost tenpai. Calls really speed things up!') } ],
    end: 'beats' },
  { id: 'r9', title: L('点数と順位', 'Points and places'), point: L('親は1.5倍、流局はテンパイ料', 'Dealer ×1.5; tenpai payments at a draw'),
    intro: [
      L('アガリの点数は「翻（ハン）」と「符（フ）」で決まります。役がたくさんつくほど翻が増えて、点数も上がるんです！', 'A win\'s value comes from han (from yaku and dora) and fu. More yaku, more han, more points.'),
      L('親（東家）の人は、アガったとき子の1.5倍の点数がもらえます。親は順番にまわってきますよ。', 'The dealer (East) gets 1.5 times a non-dealer\'s points for a win. The deal moves around the table.'),
      L('誰もアガらないまま山がなくなると「流局」。テンパイしてた人が、ノーテンの人から合計3000点もらえるんです。', 'If the wall runs out with no winner, it\'s a draw: those in tenpai get 3,000 in total from those who aren\'t.') ],
    pos: { me: '123p456p789p11s23s', drawn: '9m', draws: { 1: ['4s'] } },
    beats: [
      { on: 'turn', say: L('いま、あなたが親ですよ！ 九萬を捨てて、1索・4索待ちのテンパイにしましょう。', 'You\'re the dealer now. Discard the 9 characters to wait on 1 or 4 bamboo.'), ok: { d: '9m' },
        good: L('123・456・789筒で「一気通貫（イッツー）」の役がついてます！ かっこいい形ですね♪', '1-2-3, 4-5-6, 7-8-9 dots: that\'s a "pure straight"!') },
      { on: 'react', say: L('4索が出ました、ロンです！ 親なので、点数は子の1.5倍ですよ〜。', 'There\'s the 4 bamboo — ron! As dealer you get 1.5×.'), ok: { act: 'ron' },
        good: L('点数の画面で、翻と符と点数を見てみてくださいね。', 'Look at the han, fu and points on the result screen.') } ],
    end: 'hand' },
  { id: 'r10', title: L('雀華のスキル', 'Skills in Janka'), point: L('キャラごとの特別な力', 'Each character\'s special power'),
    intro: [
      L('雀華では、キャラのみんなが「スキル」を持ってるんです！ 牌を入れ替えたり、先の牌をのぞいたり、点数を上げたり…！', 'In Janka every character has a skill: swapping tiles, peeking ahead, raising scores and more.'),
      L('1局で最初の1回は無料。2回目からは持ち点を払って使います。使いどころが腕の見せどころですよ！', 'The first use in a game is free; after that it costs points from your score. Timing is everything!'),
      L('スキルは自分の顔の横のボタン（PCならSキー）で使えます。配牌のときに「使いますか？」って聞かれるスキルもありますよ。', 'Use it with the button beside your portrait (S on a keyboard). Some skills are offered at the deal instead.') ],
    pos: { me: '13m57p24s68s159p3z7z', drawn: '6z', skills: true },
    beats: [
      { on: 'turn', say: L('わたしのスキル「すり替え」を使ってみてください！ いま引いた牌を、山の先の牌のいちばん良いものと入れ替えちゃいます♪', 'Try Komachi\'s skill "Swap": it trades the tile you just drew for the best of the next few in the wall.'), ok: { act: 'skill' },
        good: L('入れ替わりました！ ほら、手が進む牌になってますよ。', 'Swapped! Now it\'s a tile that helps.') },
      { on: 'turn', say: L('じゃあ、いらない牌を1枚捨てましょう！', 'Now discard a tile you don\'t need.'), ok: ANY,
        good: L('ルールコース、修了です！ おつかれさまでした♪ 次はレッスンで、もっと上手な打ち方を覚えちゃいましょう！', 'That\'s the rules course done — well played! Next, the lessons teach you to play well.') } ],
    end: 'beats' },
];

const CATS = [
  { id: 'eff', name: L('牌効率', 'Efficiency'), desc: L('早くテンパイするための牌の選び方', 'Choosing tiles to reach tenpai fast') },
  { id: 'wait', name: L('待ち', 'Waits'), desc: L('アガりやすい待ちの形を選ぶ', 'Picking waits that win') },
  { id: 'yaku', name: L('役作り', 'Building yaku'), desc: L('手に合った役を狙う', 'Aim for the yaku your hand suits') },
  { id: 'def', name: L('守備', 'Defence'), desc: L('リーチに振り込まない牌の選び方', 'Not dealing into a riichi') },
  { id: 'score', name: L('点数', 'Scoring'), desc: L('翻・符と点数の上げ方', 'Han, fu and how to score big') },
  { id: 'push', name: L('押し引き', 'Push or fold'), desc: L('攻めるか守るかの判断', 'When to attack and when to fold') },
];

// a one-step lesson: a position and one question (best by default)
const Q = (id, cat, title, point, intro, pos, say, good, ok = BEST, extra = {}) =>
  Object.assign({ id, cat, title, point, intro: [intro], pos, beats: [{ on: 'turn', say, ok, good }], end: 'beats' }, extra);
const LESSONS = [
  // 牌効率
  Q('e1', 'eff', L('孤立した字牌から', 'Lone honours first'), L('字牌は順子にならない', 'Honours never make runs'),
    L('字牌は順子になれないんです。ひとつだけポツンと浮いてる字牌は、真っ先に捨てる候補！（白發中や自分の風なら、ちょっと残してもいいですよ）', 'Honours never form runs. A single lone honour is usually the first to go (a dragon or your wind is worth keeping a while).'),
    { me: '234m67m345p55p79s3z', drawn: '2z' }, L('南と西がひとりぼっちですね。どっちかを捨てちゃいましょう！', 'South and West are both alone. Discard one.'), L('正解です！ お客さんの風（自分の風でも場の風でもない字牌）は役にならないので、いちばんいらない子なんです。', 'Right! A guest wind (neither yours nor the round\'s) has no use at all.')),
  Q('e2', 'eff', L('端より真ん中を残す', 'Keep middle tiles'), L('1・9は順子の形が少ない', '1s and 9s make fewer runs'),
    L('1や9の数牌は、順子になれる組み合わせが少ないんです（123か789だけ）。3〜7の牌はいろんな形につながるので、残しておくとお得ですよ。', 'A 1 or 9 joins only one run (1-2-3 or 7-8-9). Tiles 3–7 connect in many ways.'),
    { me: '1s345m78m4p678s111z', drawn: '6m' }, L('一索と四筒、どっちもひとりぼっち。どっちを捨てます？', 'The 1 bamboo and the 4 dots are both alone. Which goes?'), L('そうです！ 四筒なら2・3・5・6筒とか、たくさんの牌とつながれますもんね♪', 'Yes! The 4 dots connects with 2, 3, 5 and 6.'), { d: '1s' }),
  Q('e3', 'eff', L('両面を残す', 'Keep two-sided shapes'), L('両面は8枚、嵌張は4枚', 'A two-sided wait has 8 tiles, a gap has 4'),
    L('45みたいに両側を待てる形が「両面（リャンメン）」、13みたいに真ん中を待つ形が「嵌張（カンチャン）」。両面のほうが、待てる牌が2倍なんです！', '4-5 waits on both sides (ryanmen); 1-3 waits on the middle (kanchan). The two-sided shape takes twice as many tiles.'),
    { me: '234m67m13p45s789s5z', drawn: '5z' }, L('形がひとつ多すぎちゃってます。67萬・13筒・45索、どれを崩しますか？', 'One shape too many. Which do you break: 6-7 characters, 1-3 dots or 4-5 bamboo?'), L('正解です！ 待てる牌が多い形を残す、これが牌効率の基本ですよ♪', 'Correct! Keeping the shapes that accept the most tiles is the core of efficiency.')),
  Q('e4', 'eff', L('辺張より両面', 'Edge vs two-sided'), L('12は3しか待てない', '1-2 waits only on 3'),
    L('12や89の形は「辺張（ペンチャン）」。待てるのは1種類だけなので、両面と比べるとちょっと弱い形なんです。', '1-2 or 8-9 is an edge wait (penchan): only one tile type completes it.'),
    { me: '12m567m34p678s2z45s', drawn: '2z' }, L('形がひとつ多いです！ 12萬・34筒・45索、どれを崩しますか？', 'One shape too many. Which goes: 1-2 characters, 3-4 dots or 4-5 bamboo?'), L('正解！ 12萬は3萬の4枚しか待てないんです。両面を2つ残すのがいいですね。', 'Right! The 1-2 edge only takes the four 3s. Keep both two-sided shapes.')),
  Q('e5', 'eff', L('一向聴の広い形', 'The widest one-away'), L('受け入れ枚数を数える', 'Count the tiles that help'),
    L('テンパイの1歩手前を「一向聴（イーシャンテン）」って言います。何を捨てるかで、テンパイになれる牌の数が変わるんですよ。', 'One step before tenpai is "iishanten". Which tile you discard changes how many tiles bring you to tenpai.'),
    { me: '234m456m23p66p78s5z', drawn: '4s' }, L('テンパイになれる牌がいちばん多くなる1枚、選んでみてください！', 'Discard the tile that leaves the most ways to tenpai.'), L('お見事です！ 待てる牌の数を比べるクセがつくと、ぐんぐん強くなりますよ♪', 'Well done! Counting acceptance is what makes players strong.')),
  Q('e6', 'eff', L('テンパイを取る', 'Take tenpai'), L('テンパイになる打牌を見つける', 'Find the discard that makes tenpai'),
    L('14枚の中に、捨てたらテンパイになる牌がある…そんなときは、まずそれを探しましょう！', 'When one discard leaves you tenpai, find it first.'),
    { me: '123m456p789p34m9s5z', drawn: '9s' }, L('どれを捨てたらテンパイになるか、わかりますか？', 'Which discard makes you tenpai?'), L('テンパイです！ 9索が雀頭になって、34萬で2萬・5萬待ち。いい感じ♪', 'Tenpai! The 9 bamboo pair and 3-4 characters waiting on 2 or 5.'), { best: 'shanten' }),
  // 待ち
  Q('w1', 'wait', L('両面待ち', 'Two-sided wait'), L('いちばん基本の良い待ち', 'The basic good wait'),
    L('テンパイの形もいろいろ。両面待ちは2種類・最大8枚で待てる、アガりやすい待ちなんです！', 'Waits differ. A two-sided wait covers two tile types — up to 8 tiles.'),
    { me: '234m567p345s88s35m', drawn: '6m' }, L('3萬を捨てれば56萬の両面（4・7萬待ち）、6萬を捨てれば35萬の嵌張（4萬待ち）。どっちにします？', 'Discard the 3 for a two-sided 5-6 (4 or 7), or the 6 for a 3-5 gap (4 only). Which?'), L('正解！ 両面なら嵌張の2倍の牌でアガれちゃいます♪', 'Right! The two-sided wait wins on twice as many tiles.')),
  Q('w2', 'wait', L('嵌張と単騎', 'Gap or single wait'), L('残り枚数で比べる', 'Compare how many are left'),
    L('嵌張（間待ち）も単騎（雀頭待ち）も、待てるのは1種類。だったら、残ってる枚数が多いほうを選びましょう！', 'A gap wait and a pair wait each wait on one type. Pick the one with more tiles left.'),
    { me: '234m567p66z79m46s2p', drawn: '3p', river: { 1: '8m8m', 2: '8m' } }, L('79萬（8萬待ち）と46索（5索待ち）、嵌張が2つ。でも8萬はもう3枚も見えちゃってます…どっちを外します？', 'Two gap shapes: 7-9 characters (8) and 4-6 bamboo (5). Three 8 characters are out. Which do you break?'), L('お見事！ 見えてる牌を数えると、どの待ちが生きてるかわかるんです。', 'Nice! Counting visible tiles shows which waits are alive.')),
  Q('w3', 'wait', L('シャンポン待ち', 'Double-pair wait'), L('対子2つの待ち', 'Two pairs waiting'),
    L('対子が2つでテンパイすると、どっちかが3枚になればアガりの「シャンポン待ち」。2種類・最大4枚です。', 'Tenpai with two pairs is a double-pair wait: either pair can become a pung. Two types, up to 4 tiles.'),
    { me: '234m678m567p33s99p', drawn: '4s' }, L('両面とシャンポン、どっちの待ちにもできそう。いらない牌を捨ててみて！', 'You can wait two-sided or on two pairs. Discard the tile you don\'t need.'), L('正解！ 両面（8枚）のほうが、シャンポン（4枚）より2倍アガりやすいんです。', 'Right! Two-sided (8 tiles) beats a double-pair wait (4).')),
  Q('w4', 'wait', L('多面待ち', 'Multi-sided waits'), L('3種類以上の待ち', 'Three or more tile types'),
    L('34567みたいな形は、2・5・8のどれでも待てる「三面張（サンメンチャン）」になるんです！ 待ちが多いほどアガりやすい♪', 'A shape like 3-4-5-6-7 can wait on 2, 5 and 8 — a three-sided wait.'),
    { me: '34567m234p678s55z', drawn: '9p' }, L('いちばん待ちが広くなる1枚を捨ててみましょう！', 'Discard to leave the widest wait.'), L('三面張です！ 2萬・5萬・8萬、どれが来てもアガれちゃいますよ。', 'A three-sided wait: 2, 5 or 8 characters!')),
  Q('w5', 'wait', L('フリテンを避ける', 'Avoid furiten'), L('自分の河の牌では待たない', 'Don\'t wait on your own discards'),
    L('自分が捨てた牌で待つとフリテンになって、ロンできなくなっちゃいます。待ちを決めるときは、自分の河もチェックですよ！', 'Waiting on a tile you threw yourself is furiten — no ron. Check your river when picking a wait.'),
    { me: '234m567p345s11z78s', drawn: '8s', river: { 0: '6s9s' } }, L('自分の河に6索と9索がありますね。7索と8索、どっちを捨てます？', 'Your river has 6 and 9 bamboo. Discard the 7 or the 8?'), L('正解です！ 8索を残せば、東と8索のシャンポン待ち。78索のままだと6・9索待ちでフリテンになっちゃうんです。', 'Right! Keeping 8-8 gives an East/8 double-pair wait. Waiting 6/9 would be furiten.'), { d: '7s' }),
  Q('w6', 'wait', L('残り枚数を数える', 'Count what\'s left'), L('見えている牌を引く', 'Subtract what you can see'),
    L('同じ形の待ちでも、場に見えてる枚数で強さが変わるんです。河・鳴き・ドラ表示牌を見て、残りを数えてみましょう！', 'The same shape can be strong or weak depending on what\'s visible. Count tiles in rivers, calls and the dora indicator.'),
    { me: '234m678s99s45p56s6m', drawn: '8m', river: { 1: '3p6p', 2: '3p6p', 3: '3p6p' } }, L('45筒・56索・68萬の3つの形。でも3筒と6筒、もう6枚も見えちゃってます…どれを外します？', 'Three shapes: 4-5 dots, 5-6 bamboo, 6-8 characters. Six of the 3/6 dots are out. Which do you break?'), L('お見事！ 同じ両面でも、残りの多い待ちを選ぶのがコツです♪', 'Nicely done! Between equal shapes, pick the one with more tiles left.'), { d: '4p5p' }),
  // 役作り
  Q('y1', 'yaku', L('平和（ピンフ）', 'Pinfu'), L('順子だけ・両面待ち・役牌でない雀頭', 'All runs, two-sided wait, plain pair'),
    L('平和（ピンフ）は、面子が全部順子で、雀頭が役牌じゃなくて、両面待ちのときにつく役です。リーチとも相性ばつぐん！', 'Pinfu: all sets are runs, the pair isn\'t a value tile, and the wait is two-sided. It goes great with riichi.'),
    { me: '234m567p22p678s35s', drawn: '6s' }, L('3索を捨てれば56索の両面待ち、6索を捨てれば35索の嵌張待ち。平和になるのはどっち？', 'Discard the 3 for a two-sided 5-6, or the 6 for a 3-5 gap. Which gives pinfu?'), L('正解です！ 両面待ちなので、平和がつきますよ♪', 'Right! A two-sided wait — pinfu.'), { d: '3s' }),
  Q('y2', 'yaku', L('一盃口（イーペーコー）', 'Pure double run'), L('同じ順子を2つ', 'The same run twice'),
    L('同じ順子が2つ（223344萬みたいな形）あると「一盃口（イーペーコー）」。鳴かずに作る役なんです。', 'Two identical runs (like 2-2-3-3-4-4) make iipeikou. Closed hands only.'),
    { me: '223344m567p78s9p1z', drawn: '5s' }, L('一盃口の形は残して、いらない牌を捨てましょう！', 'Keep the double run and discard what you don\'t need.'), L('いいですね〜！ 223344萬は、そのまま一盃口です♪', 'Nice! 2-2-3-3-4-4 is already iipeikou.')),
  Q('y3', 'yaku', L('三色同順', 'Mixed triple run'), L('3種類で同じ数の順子', 'The same run in all three suits'),
    L('萬子・筒子・索子で同じ数字の順子（123萬・123筒・123索とか）がそろうと「三色同順」。2翻（鳴くと1翻）の、きれいな役ですよ。', 'The same run in characters, dots and bamboo is sanshoku: 2 han (1 if called).'),
    { me: '123m123p12s88p567s', drawn: '4s' }, L('123萬と123筒がそろってますね！ 三色を目指して、1枚捨ててみて！', '1-2-3 characters and dots are done. Discard to aim for sanshoku.'), L('正解！ 3索が来たら三色同順です。わくわく…！', 'Right! A 3 bamboo gives you sanshoku.'), { d: '4s1s' }),
  Q('y4', 'yaku', L('一気通貫', 'Pure straight'), L('1つの色で123・456・789', '1-2-3, 4-5-6, 7-8-9 in one suit'),
    L('同じ種類で123・456・789がそろうと「一気通貫（イッツー）」。2翻（鳴くと1翻）の、気持ちいい役です！', 'One suit\'s 1-2-3, 4-5-6 and 7-8-9 is ittsu: 2 han (1 if called).'),
    { me: '123s456s79s55m34p2z', drawn: '6p' }, L('一気通貫を目指すなら、何を残します？ 1枚捨ててみてください。', 'Aiming for the straight, what do you keep? Discard one.'), L('お見事です！ 8索が来たら一気通貫ですよ♪', 'Nicely done! An 8 bamboo completes the straight.'), BEST),
  Q('y5', 'yaku', L('混一色（ホンイツ）', 'Half flush'), L('1種類の数牌＋字牌', 'One suit plus honours'),
    L('数牌を1種類だけにして、字牌と組み合わせると「混一色（ホンイツ）」。3翻（鳴くと2翻）の、高い役なんです！', 'One suit plus honours is a half flush: 3 han (2 if called).'),
    { me: '1235678p11z55z4s7m', drawn: '9p' }, L('筒子と字牌ばっかりの手ですね。混一色を目指すなら、何を捨てます？', 'Nearly all dots and honours. What do you discard to go for the half flush?'), L('正解！ ほかの種類の数牌は、どんどん外しちゃいましょう。', 'Right! Throw out the other suits.'), { d: '4s7m' }),
  Q('y6', 'yaku', L('七対子（チートイツ）', 'Seven pairs'), L('対子を7つ', 'Seven pairs'),
    L('対子が7つあれば、4面子1雀頭じゃなくてもアガれる「七対子（チートイツ）」。2翻です。対子が多い手のときに狙ってみて！', 'Seven pairs is a winning hand on its own (2 han). Go for it when you have many pairs.'),
    { me: '1133m55p77p22s99s4z', drawn: '6m' }, L('対子が6つもあります！ 七対子のテンパイにするには、何を捨てます？', 'Six pairs! What do you discard to be tenpai for seven pairs?'), L('テンパイです！ 単騎待ちは好きな牌を選べるので、字牌みたいに出やすい牌がおすすめですよ。', 'Tenpai! A pair wait can be any tile — honours are good choices.'), { best: 'shanten' }),
  Q('y7', 'yaku', L('対々和（トイトイ）', 'All pungs'), L('刻子4つ＋雀頭', 'Four pungs and a pair'),
    L('面子が全部刻子だと「対々和（トイトイ）」。2翻で、ポンを使って早く作れるんです！', 'All pungs is toitoi: 2 han, and you can build it with pons.'),
    { me: '222m666p88s99s33z4m', drawn: '7p', melds: {} }, L('刻子と対子ばっかりですね。対々和を目指して、捨てる牌は？', 'Pungs and pairs everywhere. What goes for toitoi?'), L('正解！ 対子をポンして刻子にしていけば、対々和の完成です♪', 'Right! Turn the pairs into pungs and it\'s toitoi.'), { d: '4m7p' }),
  // 守備（相手は右の人＝席1のリーチ）
  Q('d1', 'def', L('現物（ゲンブツ）', 'Safe tiles'), L('リーチの河にある牌は当たらない', 'Tiles in the riichi river are safe'),
    L('リーチした人が自分で捨ててる牌（現物）は、その人にはロンされません（フリテンになっちゃうから）。いちばん安全な牌なんです！', 'Tiles the riichi player has discarded are 100% safe against them (they\'d be furiten).'),
    { me: '25m37p46s159p13z8s7m', drawn: '6m', river: { 1: '1z9m4p2s7z' }, riichi: { 1: 4 }, left: 40 }, L('右の人がリーチしてきました！ あなたの手はまだ遠いので…いちばん安全な牌を捨てましょう。', 'Riichi on your right! Your hand is far off. Discard the safest tile.'), L('正解です！ リーチの河にある牌は、ぜったいに当たりませんよ。', 'Right! A tile in the riichi river can\'t deal in.'), { d: '1z' }),
  Q('d2', 'def', L('スジ', 'Suji'), L('4が通れば1・7も通りやすい', 'If 4 is safe, 1 and 7 are safer'),
    L('リーチの人が4を捨ててたら、1-4待ちや4-7待ちの両面はフリテンなんです。だから1と7は比較的安全！ これを「スジ」って言います。', 'If the riichi player threw a 4, a two-sided 1-4 or 4-7 wait would be furiten — so 1 and 7 are fairly safe ("suji").'),
    { me: '17m28p46s3p9s56z68m7s', drawn: '9p', river: { 1: '4m3z8s2z' }, riichi: { 1: 3 }, left: 40 }, L('現物がありません…。でも四萬は通ってますね。どれが安全そうでしょう？', 'No fully safe tile. The 4 characters is out, so… which looks safest?'), L('正解です！ 四萬のスジの、一萬と七萬ですね♪', 'Right! 1 and 7 characters are suji of the 4.'), { d: '1m7m' }),
  Q('d3', 'def', L('字牌の安全度', 'Safe honours'), L('3枚見えている字牌は単騎だけ', 'An honour with 3 out is nearly safe'),
    L('字牌は順子になれないので、場に2〜3枚見えてる字牌は当たりにくいんです。', 'Honours can\'t be in a run, so one with 2–3 copies visible is hard to deal into.'),
    { me: '258m369p147s56z8m1z', drawn: '7z', river: { 1: '9m1p', 2: '6z6z', 3: '6z' }, riichi: { 1: 1 }, left: 45 }, L('現物がない…！ 場をよーく見て、安全そうな牌を探してみて。', 'No safe tile! Look at the table and pick the safest.'), L('お見事！ 發はもう3枚見えてるので、ほとんど安全ですよ。', 'Nice! Three Greens are out, so it\'s almost safe.'), { d: '6z' }),
  Q('d4', 'def', L('壁（カベ）', 'Walls'), L('4枚見えると、その外側は両面で待てない', 'All four out blocks the runs beyond'),
    L('同じ数牌が4枚見えてる（壁）と、その牌を使う両面待ちはできないんです。たとえば8が4枚見えてたら、9は両面では待てません。', 'With all four of a number visible (a wall), no two-sided wait can use it: if all 8s are out, 9 can\'t be a two-sided wait.'),
    { me: '9s147m258p36z9p7z8s2m', drawn: '3m', river: { 1: '1z2z', 2: '8s8s', 3: '8s' }, riichi: { 1: 1 }, left: 45 }, L('8索が場に3枚、手にも1枚。安全そうな牌、見つけられますか？', '8 bamboo: three on the table, one in your hand. Find the safest tile.'), L('正解です！ 8索の壁で、9索は両面待ちにならないんです（8索自体も4枚見えてるので当たりません）。', 'Right! With the 8-bamboo wall, 9 can\'t be a two-sided wait (and the 8 itself can\'t be waited on).'), { d: '9s8s' }),
  Q('d5', 'def', L('降りる（ベタオリ）', 'Folding'), L('安全な牌から順に捨てる', 'Throw your safest tiles in order'),
    L('手が遠いときにリーチを受けたら、アガりはあきらめて、安全な牌を順番に捨てる「ベタオリ」が基本です。くやしいけど、大事なんですよ。', 'Facing a riichi with a poor hand, give up the win and throw safe tiles one by one: folding.'),
    { me: '1m4m9m3p8p2s6s7s4z6z7z5p3m', drawn: '2p', river: { 1: '9m2s4z', 2: '7z' }, riichi: { 1: 2 }, left: 35 }, L('ノーテンで、まだまだ遠い手です。まずはいちばん安全な牌から！', 'Your hand is far off. Start with the safest tile!'), L('正解です！ 現物から捨てて、無理せず流局を待ちましょ。', 'Right! Start with the safe tiles and play it out.'), { d: '9m2s4z' }),
  // 点数
  Q('s1', 'score', L('翻を増やす', 'Add han'), L('同じ待ちでも役を足す', 'Same wait, more yaku'),
    L('同じテンパイでも、何を捨てるかで役が変わるんです。タンヤオがつく方を選べば、点数アップ！', 'The discard can change your yaku. Pick the one that keeps all simples.'),
    { me: '234m567p345s66s78s', drawn: '9m' }, L('九萬を捨てればタンヤオつき。ほかの牌だと…？ 点数の高いテンパイを選んでみて！', 'Discarding the 9 characters keeps all simples. Choose the more valuable tenpai.'), L('正解！ タンヤオの1翻で、点数がほぼ2倍になっちゃうんです♪', 'Right! One extra han nearly doubles the points.'), { d: '9m' }),
  Q('s2', 'score', L('ドラを活かす', 'Use the dora'), L('ドラは1枚1翻', 'Each dora is 1 han'),
    L('ドラ表示牌の「次の牌」がドラ。持ってるだけで、1枚につき1翻もらえちゃいます！ ドラは大事にしましょうね。', 'The tile after the dora indicator is dora: each one in your hand is 1 han. Keep them!'),
    { me: '234m55p678s345p3s9s', drawn: '4s', dora: '2s' }, L('ドラは3索です（表示牌が2索なので）。ドラを活かして、1枚捨ててみて！', 'The dora is 3 bamboo (the indicator is 2). Discard while keeping it.'), L('正解です！ 34索の両面で、ドラもちゃんと使えますね♪', 'Right! 3-4 bamboo keeps the dora in a two-sided shape.'), { d: '9s' }),
  { id: 's3', cat: 'score', title: L('親と子', 'Dealer and non-dealer'), point: L('親は1.5倍、ツモは3人から', 'Dealer ×1.5; tsumo is paid by three'),
    intro: [L('子の満貫は8000点、親の満貫は12000点！ ツモアガリなら3人で分けて払います（子のツモなら、親は2倍払うんです）。', 'A non-dealer mangan is 8,000; a dealer\'s is 12,000. A tsumo is split among the three others (the dealer pays double on a non-dealer tsumo).')],
    pos: { me: '234m678m345p66s78s', drawn: '1z', draws: { 0: ['9s'] } },
    beats: [ { on: 'turn', say: L('東を捨てて、リーチしちゃいましょう！', 'Discard the East and declare riichi.'), ok: { act: 'riichi', d: '1z' }, hint: '1z', good: L('リーチっ！', 'Riichi!') },
      { on: 'turn', say: L('ツモ！ 親なので、3人全員から同じ点数がもらえちゃいます♪', 'Tsumo! As dealer, all three pay you the same.'), ok: { act: 'tsumo' }, good: L('点数の画面で、誰がいくら払ったか見てみてくださいね。', 'Check who pays what on the result screen.') } ],
    end: 'hand' },
  { id: 's4', cat: 'score', title: L('本場と供託', 'Honba and riichi sticks'), point: L('積み棒300点・リーチ棒は総取り', '300 per honba; riichi sticks to the winner'),
    intro: [L('親が連荘したり流局したりすると「本場」が積まれて、アガリに1本300点が上乗せされます。場に出てるリーチ棒（供託）は、次にアガった人のものに！', 'Repeats and draws add honba: +300 per stick to the next win. Riichi sticks left on the table go to the next winner.')],
    pos: { me: '234m567m345p66s78s', drawn: '9p', honba: 2, kyotaku: 2000, draws: { 2: ['9s'] } },
    beats: [ { on: 'turn', say: L('2本場で、場にリーチ棒が2本！ 九筒を捨てて、テンパイにしましょう。', '2 honba and two riichi sticks on the table. Discard the 9 dots to be tenpai.'), ok: { d: '9p' }, good: L('6索・9索待ちです。来い、来い…！', 'Waiting on 6 or 9 bamboo.') },
      { on: 'react', say: L('ロン！ 本場と供託で、どれくらい増えるか見てみましょう！', 'Ron! See how much the honba and sticks add.'), ok: { act: 'ron' }, good: L('本場の600点と供託の2000点がプラスされました！ お得〜♪', '+600 for honba and +2,000 from the sticks!') } ],
    end: 'hand' },
  // 押し引き
  Q('p1', 'push', L('良い待ちなら押す', 'Push with a good wait'), L('テンパイ・両面ならリーチで戦う', 'Tenpai with a good wait: fight'),
    L('相手にリーチされても、自分が両面でテンパイしてるなら、リーチして勝負したほうが有利なことが多いんです！', 'Facing a riichi with your own two-sided tenpai, fighting back with riichi is often right.'),
    { me: '234m567p345s45m11z', drawn: '6s', river: { 1: '9p1s5z' }, riichi: { 1: 2 }, left: 45 }, L('右の人がリーチ！ でも、あなたも両面テンパイが取れますよ。リーチで勝負しちゃいましょう！', 'Riichi on your right — but you can be tenpai two-sided. Riichi back!'), L('勝負っ！ 良い待ちのテンパイは、押す価値ありです！', 'Game on! A good tenpai is worth pushing.'), { riichi: true, best: 'shanten' }),
  Q('p2', 'push', L('遠い手は降りる', 'Fold a slow hand'), L('リーチに一向聴以前は降りる', 'Fold when you\'re two or more steps away'),
    L('自分の手がまだ遠い（2向聴以上）ときは、アガれる見込みが低いんです。現物を捨てて降りるのが基本ですよ。', 'When you\'re two or more steps from tenpai, your chance is low: fold with safe tiles.'),
    { me: '13m58p26s9m7p4z6z3s5s1z', drawn: '1p', river: { 1: '2z8m3s' }, riichi: { 1: 2 }, left: 35 }, L('まだまだ遠い手…。リーチに対して、何を捨てます？', 'A slow hand facing a riichi. What do you discard?'), L('正解です！ 現物の3索で、まず1巡しのぎましょう。', 'Right! The safe 3 bamboo gets you through a turn.'), { d: '3s' }),
  Q('p3', 'push', L('オーラスの条件', 'The last hand'), L('順位が上がるかで判断する', 'Decide by what changes your place'),
    L('最後の局（オーラス）は、点数より順位が大事！ 1位との差を見て、安くても速いアガリで足りるなら、速さ優先です。', 'In the last hand, places matter more than points. If a cheap, fast win is enough to take first, go for speed.'),
    { me: '234m456p78s99s567s', drawn: '1z', scores: [29000, 30000, 21000, 20000], left: 50 }, L('1位とはたった1000点差。どんなアガリでも逆転ですよ！ 速くアガれる1枚を捨てましょう！', 'You\'re 1,000 behind first — any win flips it! Discard for speed.'), L('正解！ テンパイを取って、すぐアガりを狙いましょう♪', 'Right! Take tenpai and win fast.'), { best: 'shanten' }),
];

root.MJLessons = { LessonGame, check, hintTypes, bestDiscards, discardTable, RULES, LESSONS, CATS };
if (typeof module !== 'undefined' && module.exports) module.exports = root.MJLessons;
})(typeof window !== 'undefined' ? window : globalThis);
