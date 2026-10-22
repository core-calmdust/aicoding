// HimeJan skills — one per character. First use in a game is free, then the skill's cost, doubling each time (paid into the pot).
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
  { id: 'hanup', timing: 'deal', cost: 500, icon: 'flame', color: '#ff7a3d',
    name: L('紅蓮の一翻', 'Crimson Han'), short: L('和了+1翻', '+1 han'),
    desc: L('この局、あなたの和了に1翻を加える（役があるとき）。', 'This hand, your win gets +1 han (when it has a yaku).'),
    use(g, s) { g.P[s].fx.hanup = true; } },
  { id: 'doraplus', timing: 'turn', cost: 800, icon: 'gem', color: '#ffc23d',
    name: L('ドラ増し', 'Extra Dora'), short: L('新ドラ2枚', '2 new dora'),
    desc: L('新しいドラ表示牌を2枚めくる（全員に有効）。', 'Reveal two more dora indicators (they count for everyone).'),
    can(g) { return g.doraIdx.length < 4; },
    async use(g) { await g.revealDora(); await g.revealDora(); } },
  { id: 'guard', timing: 'deal', cost: 700, icon: 'shield', color: '#5ab0ff',
    name: L('鉄壁', 'Iron Wall'), short: L('支払い半分', 'Pay half'),
    desc: L('この局、あなたが払う点が半分になる（放銃・ツモ払い・ノーテン罰符）。', 'This hand, points you pay are halved (deal-ins, tsumo payments, no-ten payments).'),
    use(g, s) { g.P[s].fx.guard = true; } },
  { id: 'lure', timing: 'turn', cost: 1400, icon: 'magnet', color: '#3dd68c',
    name: L('引き寄せ', 'Lure'), short: L('有効牌ツモ×2', 'Good draws ×2'),
    desc: L('次の2回のツモが、山に残っていれば向聴数が進む牌になる。', 'Your next 2 draws become tiles that improve your hand, if any remain in the wall.'),
    use(g, s) { g.P[s].fx.lure = 2; } },
  { id: 'mind', timing: 'turn', cost: 500, icon: 'eye', color: '#ff6fb5',
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
  { id: 'peek', timing: 'turn', cost: 500, icon: 'scope', color: '#7fd3ff',
    name: L('先読み', 'Foresight'), short: L('次のツモ3回', 'Next 3 draws'),
    desc: L('鳴きが入らなければ引くことになる、あなたの次の3回のツモ牌を見る。', 'See the tiles of your next 3 draws (if nobody calls).'),
    use(g, s) {
      const ids = [];
      for (let k = 0; k < 3; k++) { const i = g.livePos + 3 + k * 4; if (i < g.liveEnd) ids.push(g.wall[i]); }
      g.P[s].fx.peek = ids;
      return { peek: ids };
    } },
  { id: 'swap', timing: 'turn', cost: 400, icon: 'swap', color: '#9aa7ff',
    name: L('すり替え', 'Switch'), short: L('次の3枚から良い牌に', 'Best of next 3'),
    desc: L('今ツモった牌を、山の次の3枚のうち手がいちばん進む牌と入れ替える。', 'Swap the tile you just drew for the best of the next 3 tiles in the wall.'),
    can(g, s) { return g.curSeat === s && g.curDrawn != null && g.liveLeft() > 1 && !g.P[s].fx.swapped; },
    use(g, s) {
      const p = g.P[s], old = g.curDrawn;
      const base = p.hand.filter(x => x !== old);
      const score = id => {          // best shanten after keeping `id`, then ukeire-ish tie break (fewer copies seen)
        const c = MJ.countsIds(base.concat([id]));
        let best = 9;
        for (let d = 0; d < 34; d++) if (c[d]) { c[d]--; best = Math.min(best, MJ.shanten(c, p.melds.length)); c[d]++; }
        return -best * 10 - (MJ.isHonor(id >> 2) ? 1 : 0);
      };
      let bi = -1, bv = score(old);
      const n = Math.min(3, g.liveLeft());
      for (let k = 0; k < n; k++) { const v = score(g.wall[g.livePos + k]); if (v > bv) { bv = v; bi = g.livePos + k; } }
      if (bi < 0) bi = g.livePos;              // nothing better: still take the next tile
      const nw = g.wall[bi];
      g.wall[bi] = old;
      p.hand[p.hand.indexOf(old)] = nw;
      p.fx.swapped = nw;
      return { from: old, to: nw };
    } },
  { id: 'seal', timing: 'turn', cost: 500, icon: 'lock', color: '#c6a0ff',
    name: L('封じ', 'Seal'), short: L('他家のリーチ封じ', 'No riichi for others'),
    desc: L('この局、他家はこれからリーチできない（すでにしたリーチはそのまま）。', 'This hand, the others can no longer declare riichi (riichi already declared stays).'),
    use(g, s) { g.P[s].fx.seal = true; } },
  { id: 'shugi', timing: 'deal', cost: 700, icon: 'coin', color: '#ffd76a',
    name: L('祝儀', 'Bounty'), short: L('赤・裏・一発で+', 'Red/ura/ippatsu bonus'),
    desc: L('この局であなたが和了すると、赤ドラ・裏ドラ・一発1つにつき他家全員から800点ずつ。', 'If you win this hand, each red five, ura dora and ippatsu earns 800 from every opponent.'),
    use(g, s) { g.P[s].fx.shugi = true; } },
  { id: 'pot', timing: 'deal', cost: 700, icon: 'chest', color: '#ffab4d',
    name: L('総取り', 'Jackpot'), short: L('供託・積み棒×2', 'Pot & honba ×2'),
    desc: L('この局であなたが和了すると、供託と積み棒の点が2倍になる（増えた分は他家3人が払う）。', 'If you win this hand, the pot and honba bonus are doubled (the other three pay the extra).'),
    use(g, s) { g.P[s].fx.pot = true; } },
];
const BY = {}; for (const s of SKILLS) BY[s.id] = s;

// Points one use is worth (paired BOT simulation, tools/skill-value.js, 2026-10-23). The 2nd-use cost is set to about
// this value, so a paid use breaks even on average and pays off only when timed well. Foresight is information the BOT
// cannot use, so its cost is set by hand.
const VALUE = {wareme: 1033, hanup: 547, guard: 658, shugi: 718, pot: 671, doraplus: 807, lure: 1399, mind: 530, peek: 0, swap: 440, seal: 547};
const MJSkills = { list: SKILLS, get: id => BY[id], value: VALUE };
if (typeof module !== 'undefined' && module.exports) module.exports = MJSkills;
else root.MJSkills = MJSkills;
})(typeof window !== 'undefined' ? window : globalThis);
