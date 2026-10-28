/* COMET OUTBURST+ — online rankings (own Firebase project "comet-multiplay"; settings in comet-plus/firebase-config.js).
   Arcade style: every game that makes the top 100 is its own entry (one player can hold many places),
   per ranking key (mode × difficulty × device) per period:
     cometplus/d/{YYYY-MM-DD}/{key}/{id}   daily   (the player's local calendar day, same as the other games' dailies)
     cometplus/w/{YYYY-Www}/{key}/{id}     weekly  (ISO week of that same local date, Monday start)
     cometplus/a/{key}/{id}                all-time
   entry { u: uid, n: name A-Z 1-8, s: score, st: stage, t: time }; id = push key. Entries written by the first version
   are keyed by the uid itself and have no u (owner = key). Rules: comet-plus/database.rules.json.
   While FIREBASE_CONFIG is null this is unavailable and the game keeps its local ranking only.
   Testing: ?mock=1 uses an in-memory mock with fake rivals (?mock=offline simulates a connection error). */
(function () {
'use strict';
const CFG = window.FIREBASE_CONFIG || null;
const MQ = new URLSearchParams(location.search).get('mock');
const MOCK = MQ !== null, MOCK_FAIL = MQ === 'offline';
const FB_VER = '10.12.2', TOP = 100;
let db = null, uid = null, ready = null;
const pad = n => String(n).padStart(2, '0');
const dayId = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function weekId(d = new Date()) { // ISO 8601 week of the local date (weeks start on Monday)
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), wd = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - wd);
  const y = t.getUTCFullYear(), w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${pad(w)}`;
}
const pathOf = (p, key, d) => p === 'd' ? `cometplus/d/${dayId(d)}/${key}` : p === 'w' ? `cometplus/w/${weekId(d)}/${key}` : `cometplus/a/${key}`;
const loadScript = src => { const C = window.__fbScripts = window.__fbScripts || {}; return C[src] || (C[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load ' + src)); document.head.appendChild(s); })); };
const byScore = (a, b) => b.s - a.s || a.t - b.t;
const own = (id, v) => Object.assign({ id, uid: (v && v.u) || id }, v);   // uid = owner (u, or the key for first-version entries)
// a dead connection must end as an error (the realtime database otherwise keeps waiting to reconnect)
const timed = (pr, ms = 12000) => Promise.race([pr, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
function fbDB() {
  const f = firebase.database();
  return {
    push: async (p, v) => (await f.ref(p).push(v)).key,
    get: async p => (await f.ref(p).get()).val(),
    top: async (p, n) => { const snap = await f.ref(p).orderByChild('s').limitToLast(n).get(); const out = []; snap.forEach(c => { out.push(own(c.key, c.val())); }); return out.sort(byScore); },
    mine: async (p, u) => { const snap = await f.ref(p).orderByChild('u').equalTo(u).get(); const out = []; snap.forEach(c => { out.push(own(c.key, c.val())); }); const legacy = (await f.ref(`${p}/${u}`).get()).val(); if (legacy && typeof legacy.s === 'number' && !legacy.u) out.push(own(u, legacy)); return out.sort(byScore); },
    better: async (p, v) => (await f.ref(p).orderByChild('s').startAfter(v).get()).numChildren(),
  };
}
function mockDB() { // in memory only (a reload starts over)
  const T = {}, wait = () => new Promise((res, rej) => setTimeout(() => MOCK_FAIL ? rej(new Error('mock-offline')) : res(), 250 + Math.random() * 250));
  const at = (p, mk) => { const ks = p.split('/'); let o = T; for (let i = 0; i < ks.length - 1; i++) { if (!o[ks[i]]) { if (!mk) return [null, null]; o[ks[i]] = {}; } o = o[ks[i]]; } return [o, ks[ks.length - 1]]; };
  const list = p => { const [o, k] = at(p); const v = o && o[k]; return v ? Object.entries(v).map(([id, x]) => own(id, x)) : []; };
  let seq = 0;
  const put = (p, v) => { const [o, k] = at(p, true); o[k] = v; };
  const names = ['NOVA', 'COMET', 'ZEPHYR', 'ORBIT', 'LUNA', 'PULSAR', 'VEGA', 'NEBULA', 'ASTRO', 'QUASAR', 'RIGEL', 'SIRIUS'];
  ['std', 'jny', 'str'].forEach((m, mi) => ['easy', 'standard', 'arcade'].forEach((df, di) => ['pc', 'mobile'].forEach(dev => {
    const key = `${m}_${df}_${dev}`, base = [60000, 45000, 30000][di] * (1 + mi * 0.3);
    names.forEach((n, k) => {
      const s = Math.round(base * (1.6 - k * 0.12) / 10) * 10, t = Date.now() - k * 3600000;
      if (k < 7) put(`${pathOf('d', key)}/rival${k}`, { n, s: Math.round(s * 0.6), st: 3 + (k % 4), t });
      if (k < 10) put(`${pathOf('w', key)}/rival${k}`, { n, s: Math.round(s * 0.8), st: 4 + (k % 5), t });
      put(`${pathOf('a', key)}/rival${k}`, { n, s, st: 6 + (k % 6), t });
    });
    for (let k = 0; k < 140; k++) put(`${pathOf('a', key)}/filler${k}`, { n: names[k % names.length].slice(0, 4) + String.fromCharCode(65 + k % 26), s: Math.round(base * 0.2 * (1 - k / 160)), st: 1 + k % 4, t: Date.now() - 86400000 }); // > 100 entries
  })));
  return {
    push: async (p, v) => { await wait(); const id = 'm' + Date.now().toString(36) + (seq++); put(`${p}/${id}`, v); return id; },
    get: async p => { await wait(); const [o, k] = at(p); return o ? (o[k] ?? null) : null; },
    top: async (p, n) => { await wait(); return list(p).filter(x => typeof x.s === 'number').sort(byScore).slice(0, n); },
    mine: async (p, u) => { await wait(); return list(p).filter(x => x.uid === u && typeof x.s === 'number').sort(byScore); },
    better: async (p, v) => { await wait(); return list(p).filter(x => x.s > v).length; },
  };
}
async function init() {
  if (ready) return ready;
  ready = (async () => {
    if (MOCK) { if (MOCK_FAIL) { await new Promise(r => setTimeout(r, 300)); throw new Error('mock-offline'); } db = mockDB(); uid = 'mockuser'; return uid; }
    if (!CFG) throw new Error('not-configured');
    const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
    await loadScript(base + 'firebase-app-compat.js');
    await Promise.all([loadScript(base + 'firebase-auth-compat.js'), loadScript(base + 'firebase-database-compat.js')]);
    if (!firebase.apps.some(a => a.name === '[DEFAULT]')) firebase.initializeApp(CFG);
    if (window.OnlineSec) await OnlineSec.appCheck(firebase.app(), window.FIREBASE_APPCHECK_SITE_KEY, FB_VER);   // App Check (null key: skipped)
    const auth = firebase.auth();
    const cur = await new Promise(res => { const off = auth.onAuthStateChanged(u => { off(); res(u); }); });
    const u = auth.currentUser || cur || (await auth.signInAnonymously()).user;
    uid = u.uid; db = fbDB(); return uid;
  })();
  ready.catch(() => { ready = null; });
  return ready;
}
const cleanName = s => String(s || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8) || 'PLAYER';
window.CometOnline = {
  get available() { return !!CFG || MOCK; },
  get mock() { return MOCK; },
  get uid() { return uid; },
  PERIODS: ['d', 'w', 'a'],
  dayId, weekId, init,
  // top 100 of a period (+ this player's best entry and its rank, also when outside the top 100)
  board(p, key) { return timed(this._board(p, key)); },
  submit(key, en, when) { return timed(this._submit(key, en, when), 20000); },
  async _board(p, key) {
    await init();
    const path = pathOf(p, key), list = await db.top(path, TOP);
    let me = null; const i = list.findIndex(e => e.uid === uid);
    if (i >= 0) me = { rank: i + 1, e: list[i] };
    else { const e = (await db.mine(path, uid))[0]; if (e) me = { rank: 1 + await db.better(path, e.s), e }; }
    return { list, me };
  },
  // submits a finished game to all three periods as a new entry wherever it makes the top 100
  // → { d: { rank, best, id }, w, a }  (rank of this game's score; best = it was entered)
  async _submit(key, en, when) {
    await init();
    const d = new Date(when || Date.now()), v = { u: uid, n: cleanName(en.n), s: Math.max(0, Math.floor(en.s)), st: Math.max(0, en.st | 0), t: Date.now() };
    const out = {};
    await Promise.all(this.PERIODS.map(async p => {
      const path = pathOf(p, key, d), above = await db.better(path, v.s);
      const best = above < TOP;
      const id = best ? await db.push(path, v) : null;
      out[p] = { rank: above + 1, best, id };
    }));
    return out;
  },
};
})();
