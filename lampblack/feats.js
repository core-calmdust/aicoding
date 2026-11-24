/* 狼影灯 — 物語ごとの実績。判定は終幕の状態（S）・採点（sc）・結果（R）だけで行う（DOMなし。node でも読める） */
(function (root) {
  'use strict';
  const C = {
    win: (S, sc, R, d) => R.win && S.diff >= d,
    noWrong: (S, sc, R) => R.win && S.diff >= 1 && sc.wrong === 0,
    fast: (S, sc, R) => R.win && S.diff >= 1 && S.day <= 3,
    ghost: (S, sc, R) => R.win && !!S.ghost,
    rankS: (S, sc) => sc.rank === 'S',
    clash2: (S, sc) => sc.clashHit >= 2,
    accuse2: (S, sc) => sc.accHit >= 2,
    roleWin: (S, sc, R, r) => R.win && S.pl.role === r,
    guardGJ: S => S.pl.role === 'guard' && S.nights.some(N => N.n > 0 && N.saved === 'guard'),
    seerBlack2: S => S.pl.role === 'seer' && S.pl.res.filter(r => r.seer && r.res === 'wolf').length >= 2,
    masonWin: (S, sc, R) => R.win && S.pl.role === 'mason' && !!S.pl.co,
    foxCurse: S => S.people.some(p => p.role === 'fox' && p.death && p.death.cause === 'curse'),
    noHunt: (S, sc, R) => R.win && !S.foxHunt && S.people.some(p => p.role === 'fox'),
    huntWin: (S, sc, R) => R.win && !!S.foxHunt,
    foxSign: S => S.pl.told.some(t => t.sign),
  };
  const F = {
    kirigane: [
      { id: 'clear1', name: '霧が晴れる', desc: '標準以上で解決する', c: ['win', 1] },
      { id: 'clear2', name: '鐘守の目', desc: '上級以上で解決する', c: ['win', 2] },
      { id: 'clear3', name: '悪夢の朝に鐘を', desc: '悪夢で解決する', c: ['win', 3] },
      { id: 'clean', name: '無実の鐘は鳴らない', desc: '標準以上で、罪のない者を一度も氷室へ送らずに解決する', c: ['noWrong'] },
      { id: 'fast', name: '三日で晴れた霧', desc: '標準以上で、三日目までに解決する', c: ['fast'] },
      { id: 'seer', name: '祖母の手鏡', desc: '占い師として、人狼を二匹見つける', c: ['seerBlack2'] },
      { id: 'guard', name: '夜通しの戸口', desc: '狩人として、狼の牙から誰かを守る', c: ['guardGJ'] },
      { id: 'clash', name: '食い違いを聞き逃さない', desc: 'ひと幕で、矛盾を二度突く', c: ['clash2'] },
      { id: 'ghost', name: '霧の向こうから', desc: '幽霊になっても、村を解決へ導く', c: ['ghost'] },
      { id: 'rankS', name: '影絵の名手', desc: '評価Sを取る', c: ['rankS'] },
    ],
    hokushin: [
      { id: 'clear1', name: '終着駅へ', desc: '標準以上で解決する', c: ['win', 1] },
      { id: 'clear2', name: '監督官の手帳', desc: '上級以上で解決する', c: ['win', 2] },
      { id: 'clear3', name: '吹雪を越えて', desc: '悪夢で解決する', c: ['win', 3] },
      { id: 'mason', name: '相部屋の誓い', desc: '共有者として相方と名乗り、解決する', c: ['masonWin'] },
      { id: 'passenger', name: 'ただの乗客', desc: '乗客（村人）として解決する', c: ['roleWin', 'villager'] },
      { id: 'clean', name: '郵便車は空のまま', desc: '標準以上で、罪のない者を一度も郵便車へ送らずに解決する', c: ['noWrong'] },
      { id: 'accuse', name: '名指しの切符', desc: 'ひと幕で、名指しを二度当てる', c: ['accuse2'] },
      { id: 'fast', name: '夜明け前の到着', desc: '標準以上で、三日目までに解決する', c: ['fast'] },
      { id: 'ghost', name: '幽霊列車', desc: '幽霊になっても、列車を解決へ導く', c: ['ghost'] },
      { id: 'rankS', name: '一等寝台の名探偵', desc: '評価Sを取る', c: ['rankS'] },
    ],
    tomoshibi: [
      { id: 'clear1', name: '灯がともる', desc: '標準以上で解決する', c: ['win', 1] },
      { id: 'clear2', name: '嵐の目', desc: '上級以上で解決する', c: ['win', 2] },
      { id: 'clear3', name: '百年に一度の嵐', desc: '悪夢で解決する', c: ['win', 3] },
      { id: 'curse', name: '狐火', desc: '占いで、妖狐を燃やす', c: ['foxCurse'] },
      { id: 'sign', name: '社の足跡', desc: '社で、夜通し座っていた者の跡を見つける', c: ['foxSign'] },
      { id: 'noHunt', name: '船を待たずに', desc: '狐を探す最後の一日を迎えずに解決する', c: ['noHunt'] },
      { id: 'hunt', name: '最後の一日', desc: '狐を探す最後の一日に、狐を見つけて解決する', c: ['huntWin'] },
      { id: 'clean', name: '油庫は空のまま', desc: '標準以上で、罪のない者を一度も油庫へ送らずに解決する', c: ['noWrong'] },
      { id: 'ghost', name: '灯台の幽霊', desc: '幽霊になっても、島を解決へ導く', c: ['ghost'] },
      { id: 'rankS', name: '島いちばんの目', desc: '評価Sを取る', c: ['rankS'] },
    ],
  };
  const list = id => F[id] || [];
  // the feats this ending earns
  function earned(storyId, S, sc, R) { return list(storyId).filter(f => { const fn = C[f.c[0]]; try { return !!(fn && fn(S, sc, R, f.c[1])); } catch (e) { return false; } }); }
  root.WLFeats = { list, earned, C };
})(typeof window !== 'undefined' ? window : globalThis);
