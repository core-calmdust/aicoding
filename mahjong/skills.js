// HimeJan skills — one per character. First use in a game is free, then 1000, 2000, 4000 … (paid into the pot).
// timing 'deal': chosen right after the deal (point-multiplier skills). timing 'turn': used on the owner's own turn
// (after drawing / calling, before discarding). Once per hand. cost = base for the 2nd use, doubling after that.
(function (root) {
'use strict';
const MJ = root.MJ || (typeof require !== 'undefined' ? require('./engine.js') : null);
const T = id => id >> 2;

const L = (ja, en) => ({ ja, en });
const SKILLS = [
  { id: 'wareme', timing: 'deal', cost: 1000, icon: 'crack', color: '#b06cff',
    name: L('割れ目', 'Crack'), short: L('点数2倍', 'Points ×2'),
    desc: L('この局、あなたが払う点・もらう点がすべて2倍になる（和了・放銃・ツモ払い・テンパイ料）。', 'This hand, every point you pay or receive is doubled (wins, deal-ins, tsumo payments, tenpai payments).'),
    use(g, s) { g.P[s].fx.wareme = true; } },
  { id: 'hanup', timing: 'deal', cost: 1000, icon: 'flame', color: '#ff7a3d',
    name: L('紅蓮の一翻', 'Crimson Han'), short: L('和了+1翻', '+1 han'),
    desc: L('この局、あなたの和了に1翻を加える（役があるとき）。', 'This hand, your win gets +1 han (when it has a yaku).'),
    use(g, s) { g.P[s].fx.hanup = true; } },
  { id: 'doraplus', timing: 'turn', cost: 1000, icon: 'gem', color: '#ffc23d',
    name: L('ドラ増し', 'Extra Dora'), short: L('新ドラ2枚', '2 new dora'),
    desc: L('新しいドラ表示牌を2枚めくる（全員に有効）。', 'Reveal two more dora indicators (they count for everyone).'),
    can(g) { return g.doraIdx.length < 4; },
    async use(g) { await g.revealDora(); await g.revealDora(); } },
  { id: 'guard', timing: 'deal', cost: 1000, icon: 'shield', color: '#5ab0ff',
    name: L('鉄壁', 'Iron Wall'), short: L('支払い半分', 'Pay half'),
    desc: L('この局、あなたが払う点が半分になる（放銃・ツモ払い・ノーテン罰符）。', 'This hand, points you pay are halved (deal-ins, tsumo payments, no-ten payments).'),
    use(g, s) { g.P[s].fx.guard = true; } },
  { id: 'lure', timing: 'turn', cost: 1000, icon: 'magnet', color: '#3dd68c',
    name: L('引き寄せ', 'Lure'), short: L('次のツモが有効牌', 'Next draw helps'),
    desc: L('次のツモが、山に残っていれば向聴数が進む牌になる。', 'Your next draw becomes a tile that improves your hand, if one remains in the wall.'),
    use(g, s) { g.P[s].fx.lure = 1; } },
  { id: 'mind', timing: 'turn', cost: 1000, icon: 'eye', color: '#ff6fb5',
    name: L('読心', 'Mind Read'), short: L('他家の手を読む', 'Read hands'),
    desc: L('他家3人の向聴数と、テンパイなら待ち牌を見る。', 'See how close each opponent is to ready, and their waits if they are ready.'),
    use(g, s) {
      const out = [];
      for (let k = 1; k <= 3; k++) {
        const q = (s + k) % 4, p = g.P[q];
        const c = MJ.countsIds(p.hand);
        const sh = MJ.shanten(c, p.melds.length);
        out.push({ seat: q, shanten: sh, waits: sh === 0 ? MJ.waits(c, p.melds.length) : [] });
      }
      g.P[s].fx.read = out;
      return { read: out };
    } },
  { id: 'peek', timing: 'turn', cost: 1000, icon: 'scope', color: '#7fd3ff',
    name: L('先読み', 'Foresight'), short: L('次のツモ3回', 'Next 3 draws'),
    desc: L('鳴きが入らなければ引くことになる、あなたの次の3回のツモ牌を見る。', 'See the tiles of your next 3 draws (if nobody calls).'),
    use(g, s) {
      const ids = [];
      for (let k = 0; k < 3; k++) { const i = g.livePos + 3 + k * 4; if (i < g.liveEnd) ids.push(g.wall[i]); }
      g.P[s].fx.peek = ids;
      return { peek: ids };
    } },
  { id: 'swap', timing: 'turn', cost: 1000, icon: 'swap', color: '#9aa7ff',
    name: L('すり替え', 'Switch'), short: L('ツモ牌を引き直す', 'Redraw'),
    desc: L('今ツモった牌を山に戻し、次の牌と入れ替える。', 'Put the tile you just drew back and take the next one instead.'),
    can(g, s) { return g.curSeat === s && g.curDrawn != null && g.liveLeft() > 0 && !g.P[s].fx.swapped; },
    use(g, s) {
      const p = g.P[s], old = g.curDrawn, nw = g.wall[g.livePos];
      g.wall[g.livePos] = old;
      p.hand[p.hand.indexOf(old)] = nw;
      p.fx.swapped = nw;
      return { from: old, to: nw };
    } },
  { id: 'seal', timing: 'turn', cost: 1000, icon: 'lock', color: '#c6a0ff',
    name: L('封じ', 'Seal'), short: L('他家のリーチ封じ', 'No riichi for others'),
    desc: L('この局、他家はこれからリーチできない（すでにしたリーチはそのまま）。', 'This hand, the others can no longer declare riichi (riichi already declared stays).'),
    use(g, s) { g.P[s].fx.seal = true; } },
  { id: 'shugi', timing: 'deal', cost: 1000, icon: 'coin', color: '#ffd76a',
    name: L('祝儀', 'Bounty'), short: L('赤・裏・一発で+', 'Red/ura/ippatsu bonus'),
    desc: L('この局であなたが和了すると、赤ドラ・裏ドラ・一発1つにつき他家全員から800点ずつ。', 'If you win this hand, each red five, ura dora and ippatsu earns 800 from every opponent.'),
    use(g, s) { g.P[s].fx.shugi = true; } },
  { id: 'pot', timing: 'deal', cost: 1000, icon: 'chest', color: '#ffab4d',
    name: L('総取り', 'Jackpot'), short: L('供託・積み棒×2', 'Pot & honba ×2'),
    desc: L('この局であなたが和了すると、供託と積み棒の点が2倍になる（増えた分は他家3人が払う）。', 'If you win this hand, the pot and honba bonus are doubled (the other three pay the extra).'),
    use(g, s) { g.P[s].fx.pot = true; } },
];
const BY = {}; for (const s of SKILLS) BY[s.id] = s;

const MJSkills = { list: SKILLS, get: id => BY[id] };
if (typeof module !== 'undefined' && module.exports) module.exports = MJSkills;
else root.MJSkills = MJSkills;
})(typeof window !== 'undefined' ? window : globalThis);
