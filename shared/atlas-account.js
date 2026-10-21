/* =====================================================================
   World Board Game Atlas — one shared account for every game
   (shared/atlas-account.js; needs shared/atlas.js and, for real sync,
   shared/atlas-firebase-config.js)

   • Sign in once with Google → progress of ALL games, profile, coins and
     items are kept in one Firebase project ("board-game-atlas") under
     users/<uid>/kv/<key>  =  { v: <localStorage string>, t: <ms> }
   • Which keys belong to which game comes from Atlas.GAMES[].store
     (prefixes). A new game is synced as soon as it is listed there.
   • Merge, per key: progress records (puzzles / lessons / openings /
     daily / ratings / sudoku DB …) are JSON-merged so nothing earned on
     either device is lost; everything else: newest write wins.
   • Works without config (shows "being prepared"); ?mock=1 = fake cloud
     in localStorage for testing.
   It uses its own named Firebase app ('atlas'), so it can run on a game
   page next to that game's own online-play Firebase project.

   API: AtlasAccount.state()  → { ready, user:{name,photo,email}|null, syncing, last }
        AtlasAccount.signIn() / signOut() / sync() / on(fn)
   ===================================================================== */
(function () {
  'use strict';
  const CFG = window.ATLAS_FIREBASE_CONFIG || null;
  const MOCK = /[?&]mock=1/.test(location.search);
  const FB_VER = '10.12.2';
  const META = 'atlas-sync-meta';                 // { key: lastLocalChangeMs }  + _h: { key: hash }
  const subs = [];
  let app = null, user = null, ready = null, syncing = false, last = 0, err = '';
  // games with their own Firebase project (online play / rated games, Google sign-in): signed in together with the
  // shared account through a hidden frame each (shared/atlas-auth-frame.html), so one sign-in covers every game.
  const GAME_AUTH = ['shogi', 'chess', 'reversi', 'checkers', 'gomoku', 'dots', 'morris', 'backgammon', 'sudoku'];   // sudoku = also speed sudoku / SameGame POP!
  const HERE = (document.currentScript && document.currentScript.src) || location.href;
  let games = { done: 0, fail: [] };

  const loadScript = src => { const C = window.__fbScripts = window.__fbScripts || {}; return C[src] || (C[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error(src)); document.head.appendChild(s); })); };   // shared with the games' online.js
  const emit = () => subs.forEach(f => { try { f(state()); } catch (e) {} });
  const state = () => ({ available: !!(CFG || MOCK), ready: !!ready, user: user && !user.isAnonymous ? { name: user.displayName || '', photo: user.photoURL || '', email: user.email || '' } : null, syncing, last, err, games });

  /* ---------- the games' own projects: sign in / out together ---------- */
  function frameCall(g, msg) {
    return new Promise(res => {
      const f = document.createElement('iframe'); f.style.display = 'none'; f.setAttribute('aria-hidden', 'true');
      f.src = new URL('atlas-auth-frame.html?g=' + g, HERE).href;
      const id = Math.random().toString(36).slice(2);
      const done = r => { removeEventListener('message', on); clearTimeout(to); f.remove(); res(r); };
      const on = e => {
        if (e.origin !== location.origin || !e.data || !e.data.atlasAuth || e.data.g !== g) return;
        if (e.data.id === 0) { if (e.data.loaded) f.contentWindow.postMessage(Object.assign({ atlasAuthReq: 1, id }, msg), location.origin); else done({ ok: false, err: e.data.err }); }
        else if (e.data.id === id) done(e.data);
      };
      const to = setTimeout(() => done({ ok: false, err: 'timeout' }), 30000);
      addEventListener('message', on); document.body.appendChild(f);
    });
  }
  async function gamesIn(cred) {
    if (!cred || (!cred.idToken && !cred.accessToken)) return;
    const msg = { op: 'in', idToken: cred.idToken || null, accessToken: cred.accessToken || null };
    const rs = await Promise.all(GAME_AUTH.map(async g => [g, await frameCall(g, msg)]));
    games = { done: rs.filter(([, r]) => r.ok).length, fail: rs.filter(([, r]) => !r.ok).map(([g, r]) => g + ':' + r.err) };
    if (games.fail.length) console.warn('[atlas-account] game sign-in failed:', games.fail);
    emit();   // (an open game page picks the new session up by itself: Firebase watches its saved session across frames)
  }
  const gamesOut = () => Promise.all(GAME_AUTH.map(g => frameCall(g, { op: 'out' })));
  const LS = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const J = s => { try { return JSON.parse(s); } catch (e) { return undefined; } };
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36) + s.length; };
  // Firebase keys may not contain . # $ / [ ]
  const enc = k => k.replace(/[.#$/\[\]%]/g, c => '%' + c.charCodeAt(0).toString(16));
  const dec = k => k.replace(/%([0-9a-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

  /* ---------- which keys ---------- */
  function prefixes() {
    const G = (window.Atlas && window.Atlas.GAMES) || [];
    const p = ['atlas-v1', 'aicoding-lang'];
    G.forEach(g => { (g.store || []).forEach(x => p.push(x)); p.push('aicoding-' + g.id + '-rules-seen'); });
    return p;
  }
  const SKIP = /(-mock|mockdb|mock-uid|-cur-v1$|online-n$|profile-asked)/;   // test data / live-game locks
  function localKeys() {
    const P = prefixes(), out = [];
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (P.some(p => k === p || k.startsWith(p)) && !SKIP.test(k)) out.push(k); } } catch (e) {}
    return out;
  }
  // progress records: merge instead of overwrite
  const MERGE = /(puzzles|tsume|lessons|open|daily|exam|rules|drill|rated|mainichi-sudoku-v1|^atlas-v1$)/;
  // a running game / settings blob: the key IS one of the store prefixes (e.g. 'aicoding-chess') → newest wins
  const IN_PROGRESS = k => k === 'shogi-kaya-v1' || (prefixes().includes(k) && !/^(mainichi-sudoku-v1|atlas-v1)$/.test(k) && !MERGE.test(k));

  /* ---------- deep merge (union, keep the better value) ---------- */
  function merge(a, b, key) {
    if (a === undefined) return b; if (b === undefined) return a;
    if (typeof a === 'number' && typeof b === 'number') return Math.max(a, b);
    if (typeof a === 'boolean' || typeof b === 'boolean') return a === true || b === true ? true : (a || b);
    if (a === true || b === true) return true;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (key === 'hist') { const seen = new Set(), out = []; [...a, ...b].forEach(x => { const id = x && (x.id ?? JSON.stringify(x)); if (!seen.has(id)) { seen.add(id); out.push(x); } }); return out.sort((x, y) => (x.t || 0) - (y.t || 0)).slice(-100); }
      if (a.every(x => typeof x !== 'object') && b.every(x => typeof x !== 'object')) return [...new Set([...a, ...b])];
      return b.length >= a.length ? b : a;
    }
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      const o = {}; new Set([...Object.keys(a), ...Object.keys(b)]).forEach(k => { o[k] = merge(a[k], b[k], k); }); return o;
    }
    return b;   // strings etc.: caller passes the newer one as b
  }
  // rating objects: the newer one wins as a whole, history is joined
  function mergeValue(key, localS, remoteS, localT, remoteT) {
    if (localS == null) return remoteS; if (remoteS == null) return localS;
    const newerIsRemote = remoteT > localT;
    if (!MERGE.test(key) || IN_PROGRESS(key)) return newerIsRemote ? remoteS : localS;
    const a = J(localS), b = J(remoteS);
    if (a === undefined || b === undefined || typeof a !== 'object' || typeof b !== 'object') return newerIsRemote ? remoteS : localS;
    const [older, newer] = newerIsRemote ? [a, b] : [b, a];
    if (/rated/.test(key) && newer && typeof newer.r === 'number') { const m = Object.assign({}, newer); m.hist = merge(older.hist || [], newer.hist || [], 'hist'); return JSON.stringify(m); }
    if (key === 'atlas-v1') {   // wallet: spending is additive per device → keep the max counters
      const m = merge(older, newer);
      m.av = newer.av || older.av; m.name = newer.name || older.name; m.login = (newer.login && older.login && newer.login.total >= older.login.total) ? newer.login : (older.login || newer.login);
      return JSON.stringify(m);
    }
    return JSON.stringify(merge(older, newer));
  }

  /* ---------- local change tracking ---------- */
  function meta() { const m = J(LS.get(META)) || {}; m._h = m._h || {}; return m; }
  function touchLocal(m) {   // stamp keys whose value changed since the last look
    const now = Date.now();
    localKeys().forEach(k => { const h = hash(LS.get(k) || ''); if (m._h[k] !== h) { m._h[k] = h; m[k] = now; } });
  }

  /* ---------- backend ---------- */
  function mockBackend() {
    const K = 'atlas-mock-cloud';
    const all = () => J(LS.get(K)) || {};
    return {
      signIn: async () => { user = { uid: 'mock-user', displayName: 'テストユーザー', photoURL: '', email: 'test@example.com', isAnonymous: false }; LS.set(K + '-in', '1'); },
      signOut: async () => { user = null; LS.set(K + '-in', ''); },
      restore: async () => { if (LS.get(K + '-in')) user = { uid: 'mock-user', displayName: 'テストユーザー', photoURL: '', email: 'test@example.com', isAnonymous: false }; },
      pull: async () => (all()[user.uid] || {}),
      push: async (patch) => { const a = all(); a[user.uid] = Object.assign(a[user.uid] || {}, patch); LS.set(K, JSON.stringify(a)); },
    };
  }
  // App Check (reCAPTCHA v3) for the shared account project: window.ATLAS_APPCHECK_SITE_KEY (null = skipped). On localhost,
  // ?appcheckdebug=1 (or localStorage 'appcheck-debug' = a registered debug token) uses a debug token instead.
  async function appCheck(app, base) {
    const key = window.ATLAS_APPCHECK_SITE_KEY;
    if (!key || app.__appCheck) return;
    try {
      await loadScript(base + 'firebase-app-check-compat.js');
      if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) { let tok = null; try { tok = localStorage.getItem('appcheck-debug'); } catch (e) {} if (tok || /[?&]appcheckdebug\b/.test(location.search)) self.FIREBASE_APPCHECK_DEBUG_TOKEN = tok || true; }
      app.appCheck().activate(new firebase.appCheck.ReCaptchaV3Provider(key), true);
      app.__appCheck = true;
    } catch (e) { console.warn('App Check', e); }
  }
  function fbBackend() {
    let auth, db;
    const init = async () => {
      if (auth) return;
      const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
      // a game page may already have loaded the SDK for its own online play — reuse it
      await loadScript(base + 'firebase-app-compat.js');
      await Promise.all([loadScript(base + 'firebase-auth-compat.js'), loadScript(base + 'firebase-database-compat.js')]);
      app = firebase.apps.find(a => a.name === 'atlas') || firebase.initializeApp(CFG, 'atlas');
      await appCheck(app, base);
      auth = app.auth(); db = app.database();
    };
    return {
      restore: async () => { await init(); try { const r = await auth.getRedirectResult(); if (r && r.user) { user = r.user; gamesIn(r.credential); } } catch (e) {} user = user || await new Promise(res => { const off = auth.onAuthStateChanged(u => { off(); res(u); }); }); },
      signIn: async () => {
        await init(); const prov = new firebase.auth.GoogleAuthProvider();
        try { const r = await auth.signInWithPopup(prov); user = r.user; gamesIn(r.credential); }
        catch (e) { if (/popup-blocked|operation-not-supported|popup-closed-by-browser/.test(e.code || '')) { await auth.signInWithRedirect(prov); return; } throw e; }
      },
      signOut: async () => { await init(); await auth.signOut(); user = null; gamesOut(); },
      pull: async () => (await db.ref('users/' + user.uid + '/kv').get()).val() || {},
      push: async (patch) => db.ref('users/' + user.uid + '/kv').update(patch),
    };
  }
  const B = MOCK ? mockBackend() : CFG ? fbBackend() : null;

  /* ---------- sync ---------- */
  async function sync() {
    if (!B || !user || syncing) return;
    syncing = true; err = ''; emit();
    try {
      const m = meta(); touchLocal(m);
      const remote = await B.pull(), patch = {};
      const keys = new Set([...localKeys(), ...Object.keys(remote).map(dec)]);
      let changedLocal = false;
      keys.forEach(k => {
        const r = remote[enc(k)], lv = LS.get(k), lt = m[k] || 0, rt = r ? r.t : 0;
        const rv = r ? r.v : null;
        if (rv === lv) return;
        const mv = mergeValue(k, lv, rv, lt, rt);
        if (mv !== lv && mv != null) { LS.set(k, mv); m._h[k] = hash(mv); changedLocal = true; }
        if (mv !== rv && mv != null) patch[enc(k)] = { v: mv, t: Date.now() };
        m[k] = Math.max(lt, rt);
      });
      if (Object.keys(patch).length) await B.push(patch);
      LS.set(META, JSON.stringify(m)); last = Date.now();
      if (changedLocal) window.dispatchEvent(new CustomEvent('atlas-synced'));
    } catch (e) { err = String(e.message || e); }
    syncing = false; emit();
  }
  let timer = 0;
  const soon = () => { clearTimeout(timer); timer = setTimeout(sync, 1500); };

  function start() {
    if (!B) { emit(); return; }
    ready = (async () => { try { await B.restore(); } catch (e) { err = String(e.message || e); } emit(); if (user && !user.isAnonymous) await sync(); })();
    // push changes made while playing: on leaving the page and every 2 minutes
    document.addEventListener('visibilitychange', () => { if (user) (document.hidden ? sync() : soon()); });
    setInterval(() => { if (user && !document.hidden) sync(); }, 120000);
  }

  window.AtlasAccount = {
    state, sync, on(f) { subs.push(f); f(state()); },
    async signIn() { if (!B) return; try { await B.signIn(); emit(); await sync(); } catch (e) { err = String(e.message || e); emit(); } },
    async signOut() { if (!B) return; await B.signOut(); emit(); },
    _merge: mergeValue,
  };
  start();
})();
