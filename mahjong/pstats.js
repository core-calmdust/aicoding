// 雀華 — player stats (スタッツ). The counters are the same for every kind of player, so the screen can show
//   · the player's own record (saved in this browser, split by スキル戦 / 標準戦),
//   · what any seat did in the game being played (BOTs: this game only),
//   · later, an online opponent's record (MJStats.remote: a provider that returns the same raw shape for a uid).
// Raw counters (v1) — plain numbers, so a server can keep and add them the same way:
//   games, rank[4], scoreSum, bust, hands, wins, tsumo, dealin, riichi, riichiWin, call, winPts, dealinPts,
//   maxWin { pts, limit, han, yaku }, yakuman, draws, drawTenpai, skillUses, yaku { key: n }
(function (root) {
'use strict';
const V = 1;
function blank() {
  return { v: V, games: 0, rank: [0, 0, 0, 0], scoreSum: 0, bust: 0, hands: 0, wins: 0, tsumo: 0, dealin: 0, riichi: 0, riichiWin: 0,
    call: 0, winPts: 0, dealinPts: 0, maxWin: null, yakuman: 0, draws: 0, drawTenpai: 0, skillUses: 0, yaku: {} };
}
const NUMS = ['games', 'scoreSum', 'bust', 'hands', 'wins', 'tsumo', 'dealin', 'riichi', 'riichiWin', 'call', 'winPts', 'dealinPts', 'yakuman', 'draws', 'drawTenpai', 'skillUses'];
function fix(s) { const b = blank(); if (!s) return b; for (const k in b) if (s[k] == null) s[k] = b[k]; return s; }
// add b into a (both raw)
function add(a, b) {
  a = fix(a); if (!b) return a;
  for (const k of NUMS) a[k] += b[k] || 0;
  for (let i = 0; i < 4; i++) a.rank[i] += (b.rank && b.rank[i]) || 0;
  for (const k in (b.yaku || {})) a.yaku[k] = (a.yaku[k] || 0) + b.yaku[k];
  if (b.maxWin && (!a.maxWin || b.maxWin.pts > a.maxWin.pts)) a.maxWin = Object.assign({}, b.maxWin);
  return a;
}
function sum(...list) { const r = blank(); for (const s of list) if (s) add(r, s); return r; }
// rates for the screen (null = no data yet)
function derive(s) {
  s = fix(s);
  const q = (a, b) => b ? a / b : null;
  const g = s.games;
  return {
    games: g, hands: s.hands,
    avgRank: g ? (s.rank[0] + s.rank[1] * 2 + s.rank[2] * 3 + s.rank[3] * 4) / g : null,
    top: q(s.rank[0], g), rentai: q(s.rank[0] + s.rank[1], g), lastAvoid: g ? 1 - s.rank[3] / g : null,
    rankP: s.rank.map(n => q(n, g)), avgScore: q(s.scoreSum, g), bust: q(s.bust, g),
    win: q(s.wins, s.hands), dealin: q(s.dealin, s.hands), riichi: q(s.riichi, s.hands), call: q(s.call, s.hands),
    tsumo: q(s.tsumo, s.wins), riichiWin: q(s.riichiWin, s.riichi), avgWin: q(s.winPts, s.wins), avgDealin: q(s.dealinPts, s.dealin),
    drawTenpai: q(s.drawTenpai, s.draws), skillPerGame: q(s.skillUses, g),
    maxWin: s.maxWin, yakuman: s.yakuman,
    yakuTop: Object.entries(s.yaku).sort((a, b) => b[1] - a[1]).slice(0, 5),
  };
}
const NOT_YAKU = { dora: 1, aka: 1, ura: 1, skill_han: 1 };

// one game: watches the game's events and keeps the counters for all four seats
class Tracker {
  constructor() { this.seat = [0, 1, 2, 3].map(() => blank()); this.called = [false, false, false, false]; this.rii = [false, false, false, false]; }
  on(ev, d, g) {
    const S = this.seat;
    switch (ev) {
      case 'hand-start':
        for (let s = 0; s < 4; s++) { S[s].hands++; this.called[s] = false; this.rii[s] = false; }
        break;
      case 'discard': if (d.riichi) { S[d.seat].riichi++; this.rii[d.seat] = true; } break;
      case 'call':
        if ((d.type === 'chi' || d.type === 'pon' || d.type === 'minkan') && !this.called[d.seat]) { this.called[d.seat] = true; S[d.seat].call++; }
        break;
      case 'skill': S[d.seat].skillUses++; break;
      case 'agari': {
        const dealt = new Set();
        for (const r of d.results) {
          const w = S[r.seat], res = r.res || {};
          const got = (r.moves || []).reduce((a, m) => a + (m[1] || 0), 0);
          w.wins++; w.winPts += got;
          if (r.tsumo) w.tsumo++;
          else if (!dealt.has(r.from)) { dealt.add(r.from); S[r.from].dealin++; }
          if (!r.tsumo) S[r.from].dealinPts += (r.moves || []).filter(m => m[0] === r.from).reduce((a, m) => a + (m[1] || 0), 0);
          if (this.rii[r.seat]) w.riichiWin++;
          if (res.yakumanN) w.yakuman++;
          for (const [k] of (res.list || [])) if (!NOT_YAKU[k]) w.yaku[k] = (w.yaku[k] || 0) + 1;
          if (!w.maxWin || got > w.maxWin.pts) {
            const top = (res.list || []).filter(([k]) => !NOT_YAKU[k]).sort((a, b) => b[1] - a[1])[0];
            w.maxWin = { pts: got, limit: res.limit || null, han: res.han || 0, fu: res.fu || 0, yaku: top ? top[0] : null };
          }
        }
        break;
      }
      case 'ryuukyoku':
        if (!d.abort) for (let s = 0; s < 4; s++) { S[s].draws++; if (d.tenpai && d.tenpai[s]) S[s].drawTenpai++; }
        break;
      case 'game-end':
        (d.rank || []).forEach((s, i) => { S[s].games++; S[s].rank[i]++; S[s].scoreSum += d.scores[s]; if (d.scores[s] < 0) S[s].bust++; });
        break;
    }
  }
}

root.MJStats = {
  V, blank, add, sum, derive, fix, Tracker,
  // online (later): set to  uid => Promise<{ name, raw: { skill, std } } | null>  and seats with kind 'online' read from it
  remote: null,
};
})(window);
