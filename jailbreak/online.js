/* だつごく！スライド — online rankings (own Firebase project: jailbreak/firebase-config.js, data under jb/).
   jb/d/<date>/<e|m|h|sl>/<uid> = { n, i, s }  daily best scores · jb/chain/<uid> all-time CHAIN ESCAPE · jb/stars/<uid> total stars
   jb/sync/<uid> = { d: JSON string of the save data, t: ms }  Google sign-in cloud sync (own uid only)
   ?mock=1 uses an in-browser mock with fake rivals (and a fake Google account) for testing. */
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
    set: async (p, v) => { const t = load(); const [o, k] = at(t, p, true); if (v == null) delete o[k]; else o[k] = v; save(t); },
    get: async p => { const [o, k] = at(load(), p); return o ? (o[k] ?? null) : null; },
    top: async (p, n) => list(p).filter(x => x && typeof x.s === 'number').sort((a, b) => b.s - a.s).slice(0, n),
    better: async (p, v) => list(p).filter(x => x.s > v).length,
  };
}
async function init() {
  if (ready) return ready;
  ready = (async () => {
    if (MOCK) { db = mockDB(); const a = mockAcct(); if (a) { uid = a.uid; return uid; } try { uid = localStorage.getItem('jailbreak-mock-uid'); } catch (e) {} uid = uid || ('u' + Math.random().toString(36).slice(2, 10)); try { localStorage.setItem('jailbreak-mock-uid', uid); } catch (e) {} return uid; }
    if (!CFG) throw new Error('not-configured');
    const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
    await loadScript(base + 'firebase-app-compat.js');
    await Promise.all([loadScript(base + 'firebase-auth-compat.js'), loadScript(base + 'firebase-database-compat.js')]);
    const app = firebase.apps.find(a => a.name === 'jailbreak') || firebase.initializeApp(CFG, 'jailbreak');
    if (window.OnlineSec) await OnlineSec.appCheck(app, window.FIREBASE_APPCHECK_SITE_KEY, FB_VER);
    const auth = app.auth();
    try { await auth.getRedirectResult(); }   // back from the Google redirect fallback (popup blocked)
    catch (e) { if ((e.code === 'auth/credential-already-in-use' || e.code === 'auth/email-already-in-use') && e.credential) { try { await auth.signInWithCredential(e.credential); } catch (x) {} } }
    const cur = await new Promise(res => { const off = auth.onAuthStateChanged(u => { off(); res(u); }); });
    const u = auth.currentUser || cur || (await auth.signInAnonymously()).user;
    uid = u.uid; const f = app.database();
    // the portal's one-tap sign-in (shared/atlas-account.js) can switch this app's account from another frame / tab
    let anon = u.isAnonymous;
    auth.onAuthStateChanged(nu => { if (nu && (nu.uid !== uid || nu.isAnonymous !== anon)) { const old = uid; uid = nu.uid; anon = nu.isAnonymous; dispatchEvent(new CustomEvent('jb-auth', { detail: { old, uid } })); } });
    db = { set: (p, v) => f.ref(p).set(v), get: async p => (await f.ref(p).get()).val(),
      top: async (p, n) => { const snap = await f.ref(p).orderByChild('s').limitToLast(n).get(); const out = []; snap.forEach(c => { out.push(Object.assign({ uid: c.key }, c.val())); }); return out.reverse(); },
      better: async (p, v) => (await f.ref(p).orderByChild('s').startAfter(v).get()).numChildren() };
    return uid;
  })();
  ready.catch(() => { ready = null; });
  return ready;
}
// mock Google account (?mock=1): { uid, email, name } in localStorage
const MA = 'jailbreak-mock-acct';
function mockAcct() { if (!MOCK) return null; try { return JSON.parse(localStorage.getItem(MA) || 'null'); } catch (e) { return null; } }
const fbAuth = () => { try { const a = firebase.apps.find(x => x.name === 'jailbreak'); return a ? a.auth() : null; } catch (e) { return null; } };
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
  // signed-in Google account ({ email, name }) or null (anonymous player)
  account() {
    if (MOCK) { const a = mockAcct(); return a ? { email: a.email, name: a.name } : null; }
    const au = fbAuth(), u = au && au.currentUser; return u && !u.isAnonymous ? { email: u.email || '', name: u.displayName || '' } : null;
  },
  // Google sign-in: upgrades (links) the anonymous player when possible, so the uid and rankings stay. When that Google
  // account is already used by another player, this device's anonymous ranking entries (paths) are removed and the
  // existing account is used instead (uid changes: the caller re-posts its scores). Popup blocked → redirect.
  async google(paths) {
    await init();
    if (MOCK) {
      const old = uid, nu = 'g' + (old || 'x').slice(-6) + 'mock';
      let a = null; try { a = JSON.parse(localStorage.getItem('jailbreak-mock-google') || 'null'); } catch (e) {}
      a = a || { uid: nu, email: 'player@example.com', name: 'Mock Player' };   // the same fake Google account every time
      await Promise.all((paths || []).map(p => db.set(p + '/' + old, null)));
      try { localStorage.setItem(MA, JSON.stringify(a)); localStorage.setItem('jailbreak-mock-google', JSON.stringify(a)); } catch (e) {}
      uid = a.uid; return { uid, linked: false };
    }
    const auth = fbAuth(), prov = new firebase.auth.GoogleAuthProvider();
    prov.setCustomParameters({ prompt: 'select_account' });
    const u = auth.currentUser;
    try { const r = u && u.isAnonymous ? await u.linkWithPopup(prov) : await auth.signInWithPopup(prov); uid = r.user.uid; return { uid, linked: true }; }
    catch (e) {
      if (e.code === 'auth/credential-already-in-use' || e.code === 'auth/email-already-in-use') {
        const cred = e.credential || firebase.auth.GoogleAuthProvider.credentialFromError(e);
        await Promise.all((paths || []).map(p => db.set(p + '/' + uid, null).catch(() => {})));
        const r = await auth.signInWithCredential(cred); uid = r.user.uid; return { uid, linked: false };
      }
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') { await (u && u.isAnonymous ? u.linkWithRedirect(prov) : auth.signInWithRedirect(prov)); }
      throw e;
    }
  },
  // sign out of Google → back to a fresh anonymous player (the save data on this device is kept)
  async logout() {
    if (MOCK) { try { localStorage.removeItem(MA); localStorage.removeItem('jailbreak-mock-uid'); } catch (e) {} ready = null; uid = null; await init(); return; }
    const au = fbAuth(); if (au) await au.signOut(); ready = null; uid = null; await init();
  },
  async pull() { await init(); return db.get('jb/sync/' + uid); },
  async push(d) { await init(); if (typeof d !== 'string' || d.length > 400000) throw new Error('too-big'); return db.set('jb/sync/' + uid, { d, t: Date.now() }); },
  async mine(path) { await init(); const me = await db.get(`${path}/${uid}`); if (!me) return null; return { me, rank: 1 + await db.better(path, me.s) }; },
};
void fbDB;
})();
