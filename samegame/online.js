/* さめが〜め POP! — online rankings. Shares the まいにち数独 Firebase project (everyday-sudoku), stored under same/.
   ?mock=1 uses an in-browser mock with fake rivals for testing. */
(function () {
'use strict';
const CFG = window.FIREBASE_CONFIG || null;
const MOCK = new URLSearchParams(location.search).has('mock');
const FB_VER = '10.12.2';
let db = null, uid = null, ready = null;
const loadScript = src => { const C = window.__fbScripts = window.__fbScripts || {}; return C[src] || (C[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load ' + src)); document.head.appendChild(s); })); };
function fbDB() {
  const f = firebase.database();
  return {
    set: (p, v) => f.ref(p).set(v),
    get: async p => (await f.ref(p).get()).val(),
    top: async (p, n) => { const snap = await f.ref(p).orderByChild('s').limitToLast(n).get(); const out = []; snap.forEach(c => { out.push(Object.assign({ uid: c.key }, c.val())); }); return out.reverse(); },
    better: async (p, v) => (await f.ref(p).orderByChild('s').startAfter(v).get()).numChildren(),
  };
}
function mockDB() {
  const K = 'samegame-mockdb';
  const load = () => { try { return JSON.parse(localStorage.getItem(K) || '{}'); } catch (e) { return {}; } };
  const save = t => localStorage.setItem(K, JSON.stringify(t));
  const at = (t, p, mk) => { const ks = p.split('/'); let o = t; for (let i = 0; i < ks.length - 1; i++) { if (!o[ks[i]]) { if (!mk) return [null, null]; o[ks[i]] = {}; } o = o[ks[i]]; } return [o, ks[ks.length - 1]]; };
  const list = p => { const [o, k] = at(load(), p); const v = o && o[k]; return v ? Object.entries(v).map(([u, x]) => Object.assign({ uid: u }, x)) : []; };
  const d = new Date(), pad = n => String(n).padStart(2, '0'), ymd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const t0 = load();
  if (t0.__seed !== ymd) {
    const names = ['ROY', 'みかん', 'Sora', 'ポップ太郎', 'Lumi', 'BAM!', 'Kai', 'さめ子', 'Ari', 'ZAP', 'Noa', 'WHAAM'];
    t0.same = t0.same || {}; const S = t0.same; S.d = S.d || {}; S.d[ymd] = { p: {}, b: {} }; S.m = S.m || {}; S.m[ymd.slice(0, 7)] = {}; S.t = S.t || {};
    names.forEach((n, k) => { const u = 'rival' + k, i = (k * 13) % 100;
      S.d[ymd].p[u] = { n, i, s: 1200 + k * 230 }; S.d[ymd].b[u] = { n, i, s: 4000 + k * 900, a: 1 };
      S.m[ymd.slice(0, 7)][u] = { n, i, s: 300 + k * 140 }; S.t[u] = { n, i, s: 2000 + k * 800 }; });
    t0.__seed = ymd; save(t0);
  }
  return {
    set: async (p, v) => { const t = load(); const [o, k] = at(t, p, true); o[k] = v; save(t); },
    get: async p => { const [o, k] = at(load(), p); return o ? (o[k] ?? null) : null; },
    top: async (p, n) => list(p).filter(x => typeof x.s === 'number').sort((a, b) => b.s - a.s).slice(0, n),
    better: async (p, v) => list(p).filter(x => x.s > v).length,
  };
}
async function init() {
  if (ready) return ready;
  ready = (async () => {
    if (MOCK) { db = mockDB(); uid = localStorage.getItem('samegame-mock-uid') || ('u' + Math.random().toString(36).slice(2, 10)); localStorage.setItem('samegame-mock-uid', uid); return uid; }
    if (!CFG) throw new Error('not-configured');
    const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
    await loadScript(base + 'firebase-app-compat.js');
    await Promise.all([loadScript(base + 'firebase-auth-compat.js'), loadScript(base + 'firebase-database-compat.js')]);
    if (!firebase.apps.some(a => a.name === '[DEFAULT]')) firebase.initializeApp(CFG);
    const auth = firebase.auth();
    const cur = await new Promise(res => { const off = auth.onAuthStateChanged(u => { off(); res(u); }); });
    const u = auth.currentUser || cur || (await auth.signInAnonymously()).user;
    uid = u.uid; db = fbDB(); return uid;
  })();
  ready.catch(() => { ready = null; });
  return ready;
}
const clean = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12) || '???';
window.SameOnline = {
  get available() { return !!CFG || MOCK; },
  get uid() { return uid; },
  init,
  // daily: p = puzzle (best score, any number of tries), b = blitz (3 tries a day, best stays)
  async putDaily(date, k, v) {
    await init();
    const path = `same/d/${date}/${k}/${uid}`, old = await db.get(path);
    if (k === 'p') { if (old && old.s >= v.s) return false; await db.set(path, { n: clean(v.n), i: v.i | 0, s: Math.round(v.s) }); return true; }
    const a = (old && old.a || 0) + 1; if (a > 3) return false;
    await db.set(path, { n: clean(v.n), i: v.i | 0, s: Math.round(old && old.s > v.s ? old.s : v.s), a });
    return true;
  },
  async putScore(path, v) { await init(); await db.set(`${path}/${uid}`, { n: clean(v.n), i: v.i | 0, s: Math.round(v.s) }); },
  async top(path, n = 50) { await init(); return db.top(path, n); },
  async mine(path) { await init(); const me = await db.get(`${path}/${uid}`); if (!me) return null; return { me, rank: 1 + await db.better(path, me.s) }; },
};
})();
