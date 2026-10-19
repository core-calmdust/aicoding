/* まいにち数独 — online rankings (Firebase Realtime Database, anonymous auth)
   ?mock=1 uses an in-browser mock (localStorage) with some fake rivals, for testing. */
(function () {
'use strict';
const CFG = window.FIREBASE_CONFIG || null;
const MOCK = new URLSearchParams(location.search).has('mock');
const FB_VER = '10.12.2';
let db = null, uid = null, ready = null;

const loadScript = src => { const C = window.__fbScripts = window.__fbScripts || {}; return C[src] || (C[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load ' + src)); document.head.appendChild(s); })); };

function firebaseDB() {
  const f = firebase.database();
  return {
    set: (p, v) => f.ref(p).set(v),
    update: (p, v) => f.ref(p).update(v),
    get: async p => (await f.ref(p).get()).val(),
    top: async (p, key, n, asc) => {
      const q = asc ? f.ref(p).orderByChild(key).limitToFirst(n) : f.ref(p).orderByChild(key).limitToLast(n);
      const snap = await q.get(); const out = [];
      snap.forEach(c => { out.push(Object.assign({ uid: c.key }, c.val())); });
      return out;
    },
    // number of entries strictly better than v
    better: async (p, key, v, asc) => {
      const q = asc ? f.ref(p).orderByChild(key).endBefore(v) : f.ref(p).orderByChild(key).startAfter(v);
      const snap = await q.get(); return snap.numChildren();
    },
    count: async p => (await f.ref(p).get()).numChildren(),
  };
}
function mockDB() {
  const K = 'sudoku-mockdb';
  const load = () => { try { return JSON.parse(localStorage.getItem(K) || '{}'); } catch (e) { return {}; } };
  const save = t => localStorage.setItem(K, JSON.stringify(t));
  const at = (t, p, mk) => { const ks = p.split('/'); let o = t; for (let i = 0; i < ks.length - 1; i++) { if (!o[ks[i]]) { if (!mk) return [null, null]; o[ks[i]] = {}; } o = o[ks[i]]; } return [o, ks[ks.length - 1]]; };
  const list = (p) => { const [o, k] = at(load(), p); const v = o && o[k]; return v ? Object.entries(v).map(([u, x]) => Object.assign({ uid: u }, x)) : []; };
  // seed fake rivals once
  const t0 = load();
  if (!t0.__seed) {
    const names = ['みかん', 'Sora', 'ねこまる', 'Lumi', 'たぬき', 'Kai', 'もち', 'Ari', 'ゆず', 'Noa', 'ぴよ', 'Rin'];
    const d = new Date(), ym = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    const ymd = ym + '-' + String(d.getDate()).padStart(2, '0');
    t0.month = { [ym]: {} }; t0.total = {}; t0.daily = { [ymd]: { e: {}, m: {}, h: {} } }; t0.col = {}; t0.var = {};
    names.forEach((n, k) => {
      const u = 'rival' + k, i = (k * 37) % 500;
      t0.month[ym][u] = { n, i, s: 2000 + k * 1700 }; t0.total[u] = { n, i, s: 9000 + k * 5300 };
      for (const df of ['e', 'm', 'h']) t0.daily[ymd][df][u] = { n, i, t: ({ e: 150000, m: 330000, h: 640000 }[df]) + k * 23000, m: k % 3, h: k % 2 };
      for (let th = 0; th < 3; th++) { t0.col[th] = t0.col[th] || {}; t0.col[th][u] = { n, i, s: 1000 + k * 600 - th * 300, c: 5 + k, st: 10 + k * 2 }; }
    });
    t0.__seed = 1; save(t0);
  }
  return {
    set: async (p, v) => { const t = load(); const [o, k] = at(t, p, true); o[k] = v; save(t); },
    update: async (p, v) => { const t = load(); const [o, k] = at(t, p, true); o[k] = Object.assign(o[k] || {}, v); save(t); },
    get: async p => { const [o, k] = at(load(), p); return o ? (o[k] ?? null) : null; },
    top: async (p, key, n, asc) => { const a = list(p).filter(x => typeof x[key] === 'number').sort((a, b) => (asc ? a[key] - b[key] : b[key] - a[key])).slice(0, n); return asc ? a : a.reverse(); },
    better: async (p, key, v, asc) => list(p).filter(x => (asc ? x[key] < v : x[key] > v)).length,
    count: async p => list(p).length,
  };
}

async function init() {
  if (ready) return ready;
  ready = (async () => {
    if (MOCK) {
      db = mockDB();
      uid = localStorage.getItem('sudoku-mock-uid') || ('u' + Math.random().toString(36).slice(2, 10));
      localStorage.setItem('sudoku-mock-uid', uid);
    } else {
      if (!CFG) throw new Error('not-configured');
      const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
      await loadScript(base + 'firebase-app-compat.js');
      await Promise.all([loadScript(base + 'firebase-auth-compat.js'), loadScript(base + 'firebase-database-compat.js')]);
      if (!firebase.apps.length) firebase.initializeApp(CFG);
      const auth = firebase.auth();
      // keep an existing session (Google or anonymous); only create an anonymous one if none
      const cur = await new Promise(res => { const off = auth.onAuthStateChanged(u => { off(); res(u); }); });
      try { const rr = await auth.getRedirectResult(); if (rr && rr.user) { uid = rr.user.uid; } } catch (e) {}
      const u = auth.currentUser || cur || (await auth.signInAnonymously()).user;
      uid = u.uid; db = firebaseDB();
    }
    return uid;
  })();
  ready.catch(() => { ready = null; });
  return ready;
}
const clean = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12) || '???';

async function removeMine(paths) { await Promise.all(paths.map(p => db.set(p + '/' + uid, null).catch(() => {}))); }
window.SudokuOnline = {
  get available() { return !!CFG || MOCK; },
  mock: MOCK,
  get uid() { return uid; },
  init,
  async profile(p) { await init(); await db.update('profiles/' + uid, { n: clean(p.n), i: p.i | 0 }); },
  // daily times are write-once (the first clear of the day counts)
  async submitDaily(date, d, v) {
    await init();
    const path = `daily/${date}/${d}/${uid}`;
    if (await db.get(path)) return false;
    await db.set(path, { n: clean(v.n), i: v.i | 0, t: Math.round(v.t), m: v.m | 0, h: v.h | 0 });
    return true;
  },
  async putScore(path, v) { await init(); await db.set(`${path}/${uid}`, Object.assign({}, v, { n: clean(v.n), i: v.i | 0, s: Math.round(v.s) })); },
  async topDaily(date, d, n = 50) { await init(); return db.top(`daily/${date}/${d}`, 't', n, true); },
  async topScore(path, n = 50) { await init(); return db.top(path, 's', n, false); },
  async myDaily(date, d) { await init(); const me = await db.get(`daily/${date}/${d}/${uid}`); if (!me) return null; return { me, rank: 1 + await db.better(`daily/${date}/${d}`, 't', me.t, true) }; },
  account() { if (MOCK) return null; try { const u = firebase.auth().currentUser; return u && !u.isAnonymous ? { email: u.email || '', name: u.displayName || '' } : null; } catch (e) { return null; } },
  // sign in with Google; the anonymous account is upgraded when possible.
  // paths: this player's ranking entries to remove from the anonymous account when switching to an existing Google account
  async google(paths) {
    if (MOCK) throw new Error('mock');
    await init();
    const auth = firebase.auth(), prov = new firebase.auth.GoogleAuthProvider();
    prov.setCustomParameters({ prompt: 'select_account' });
    const u = auth.currentUser;
    try {
      const r = u && u.isAnonymous ? await u.linkWithPopup(prov) : await auth.signInWithPopup(prov);
      uid = r.user.uid; return { uid, linked: true };
    } catch (e) {
      if (e.code === 'auth/credential-already-in-use' || e.code === 'auth/email-already-in-use') {
        const cred = e.credential || firebase.auth.GoogleAuthProvider.credentialFromError(e);
        await removeMine(paths || []);
        const r = await auth.signInWithCredential(cred);
        uid = r.user.uid; return { uid, linked: false };
      }
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') { await (u && u.isAnonymous ? u.linkWithRedirect(prov) : auth.signInWithRedirect(prov)); }
      throw e;
    }
  },
  async logout() { if (MOCK) return; await firebase.auth().signOut(); ready = null; uid = null; await init(); },
  async pull() { await init(); return db.get('sync/' + uid); },
  async push(d) { await init(); return db.set('sync/' + uid, { d, t: Date.now() }); },
  async myScore(path) { await init(); const me = await db.get(`${path}/${uid}`); if (!me) return null; return { me, rank: 1 + await db.better(path, 's', me.s, false) }; },
};
})();
