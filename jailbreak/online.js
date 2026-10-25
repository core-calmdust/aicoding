/* だつごく！スライド — online rankings (own Firebase project: jailbreak/firebase-config.js, data under jb/).
   jb/d/<date>/<e|m|h|sl>/<uid> = { n, i, s }  daily best scores · jb/chain/<uid> all-time CHAIN ESCAPE · jb/stars/<uid> total stars
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
  const K = 'jailbreak-mockdb';
  const load = () => { try { return JSON.parse(localStorage.getItem(K) || '{}'); } catch (e) { return {}; } };
  const save = t => { try { localStorage.setItem(K, JSON.stringify(t)); } catch (e) {} };
  const at = (t, p, mk) => { const ks = p.split('/'); let o = t; for (let i = 0; i < ks.length - 1; i++) { if (!o[ks[i]]) { if (!mk) return [null, null]; o[ks[i]] = {}; } o = o[ks[i]]; } return [o, ks[ks.length - 1]]; };
  const list = p => { const [o, k] = at(load(), p); const v = o && o[k]; return v ? Object.entries(v).map(([u, x]) => Object.assign({ uid: u }, x)) : []; };
  const d = new Date(), pad = n => String(n).padStart(2, '0'), ymd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const t0 = load();
  if (t0.__seed !== ymd) {
    const names = ['Houdi', 'ぬけみち', 'Kai', 'スコップ', 'Lupin3', 'Mole', 'ナナ', 'Jinx', 'カギっ子', 'Rook', 'Nova', 'Sly'];
    t0.jb = t0.jb || {}; const J = t0.jb; J.d = J.d || {}; J.d[ymd] = { e: {}, m: {}, h: {}, sl: {} }; J.chain = {}; J.stars = {};
    names.forEach((n, k) => { const u = 'rival' + k, i = (k * 5) % 24;
      J.d[ymd].e[u] = { n, i, s: 3400 + k * 90 }; J.d[ymd].m[u] = { n, i, s: 5600 + k * 160 }; J.d[ymd].h[u] = { n, i, s: 9000 + k * 260 }; J.d[ymd].sl[u] = { n, i, s: 1200 + k * 340 };
      J.chain[u] = { n, i, s: 2000 + k * 700 }; J.stars[u] = { n, i, s: 40 + k * 37 }; });
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
    if (MOCK) { db = mockDB(); try { uid = localStorage.getItem('jailbreak-mock-uid'); } catch (e) {} uid = uid || ('u' + Math.random().toString(36).slice(2, 10)); try { localStorage.setItem('jailbreak-mock-uid', uid); } catch (e) {} return uid; }
    if (!CFG) throw new Error('not-configured');
    const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
    await loadScript(base + 'firebase-app-compat.js');
    await Promise.all([loadScript(base + 'firebase-auth-compat.js'), loadScript(base + 'firebase-database-compat.js')]);
    const app = firebase.apps.find(a => a.name === 'jailbreak') || firebase.initializeApp(CFG, 'jailbreak');
    if (window.OnlineSec) await OnlineSec.appCheck(app, window.FIREBASE_APPCHECK_SITE_KEY, FB_VER);
    const auth = app.auth();
    const cur = await new Promise(res => { const off = auth.onAuthStateChanged(u => { off(); res(u); }); });
    const u = auth.currentUser || cur || (await auth.signInAnonymously()).user;
    uid = u.uid; const f = app.database();
    db = { set: (p, v) => f.ref(p).set(v), get: async p => (await f.ref(p).get()).val(),
      top: async (p, n) => { const snap = await f.ref(p).orderByChild('s').limitToLast(n).get(); const out = []; snap.forEach(c => { out.push(Object.assign({ uid: c.key }, c.val())); }); return out.reverse(); },
      better: async (p, v) => (await f.ref(p).orderByChild('s').startAfter(v).get()).numChildren() };
    return uid;
  })();
  ready.catch(() => { ready = null; });
  return ready;
}
const clean = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12) || '???';
window.JBOnline = {
  get available() { return !!CFG || MOCK; },
  get uid() { return uid; },
  get mock() { return MOCK; },
  init,
  // daily best (keeps the higher score)
  async putDaily(date, k, v) {
    await init();
    const path = `jb/d/${date}/${k}/${uid}`, old = await db.get(path);
    if (old && old.s >= v.s) return false;
    await db.set(path, { n: clean(v.n), i: v.i | 0, s: Math.round(v.s) }); return true;
  },
  async putBest(path, v) { await init(); const old = await db.get(`${path}/${uid}`); if (old && old.s > v.s && old.n === clean(v.n)) return false; await db.set(`${path}/${uid}`, { n: clean(v.n), i: v.i | 0, s: Math.round(v.s) }); return true; },
  async top(path, n = 50) { await init(); return db.top(path, n); },
  async mine(path) { await init(); const me = await db.get(`${path}/${uid}`); if (!me) return null; return { me, rank: 1 + await db.better(path, me.s) }; },
};
void fbDB;
})();
