// Online play for Connect Four (same as Nine Men's Morris / Dots & Boxes): lobby, Elo rating with history, rating-based matchmaking,
// rooms with codes, spectating, rematch, resign / timeout / abandon, draw offers, presence —
// plus Google sign-in and cloud sync of local progress (sync/<uid>).
// Moves: one character per move, the column '1'..'7' (the same record as the board page), appended to games/<gid>/moves.
// Turns strictly alternate: even count = first player (b) to move.
// Game record: b = first player's uid (gold / P1), w = second (platinum / P2); v = variant ('std'); bn/wn names, br/wr ratings,
// mb/mw clock (ms left), t = time of the last move, tc = time control id; status play | over | resign | timeout | abandon | draw;
// win 1 / 2 / 0 (draw); why = reason (four | full | agree); loser = uid (resign / timeout / abandon); offer = { by, n } draw offer.
// Every move is a transaction on the game record, so the game survives a reload / server hiccup and is resumed from the database.
// Both clients (and spectators) replay the moves with the rules below and reject any illegal move.
// Backend: Firebase (anonymous / Google auth + Realtime Database) when window.FIREBASE_CONFIG is set,
// or an in-browser mock (localStorage, shared between tabs) with ?mock=1 for testing.
(function () {
  'use strict';
  const CFG = window.FIREBASE_CONFIG || null;
  const Q = new URLSearchParams(location.search);
  const MOCK = Q.has('mock');
  const FB_VER = '10.12.2';
  const INITIAL = 1500;
  const VARIANTS = ['std'];
  // Fischer clock: base time per player + increment per move (keep in sync with shared/tools/secrules.py)
  const TC = { std: { main: 120000, inc: 3000 } };
  const DEF_V = 'std';
  const GRACE = 3000;                    // latency allowance before the opponent may claim a timeout
  const ABANDON_MS = MOCK && +Q.get('abandon') > 0 ? +Q.get('abandon') : 45000;   // opponent offline this long on their turn → win by abandonment
  const ROOM_TTL = 10 * 60000;           // a room nobody joins expires after 10 min
  const REMATCH_MS = 10000;
  const HIST_N = 50;                     // rated games kept in players/<uid>/hist
  const varOk = v => VARIANTS.includes(v);
  const tcOf = g => TC[g && varOk(g.v) ? g.v : DEF_V];
  const sideOf = (g, u) => (g.b === u ? 'b' : 'w');
  const mainOf = (g, side) => { const v = g && g['m' + side]; return typeof v === 'number' ? Math.max(0, v) : tcOf(g).main; };
  const tcFields = v => { v = varOk(v) ? v : DEF_V; return { v, tc: v, mb: TC[v].main, mw: TC[v].main }; };
  function clockOf(g, side, moving, now) {
    const m = mainOf(g, side);
    if (!moving) return { main: m, left: m, moving: false };
    const el = Math.max(0, (now == null ? (db ? db.now() : Date.now()) : now) - (g.t || now || Date.now()));
    return { main: Math.max(0, m - el), left: m - el, moving: true };
  }

  // ---------------------------------------------------------------- rules (shared by both clients and spectators)
  const COLS = 7, ROWS = 6, MAXN = 42;
  const enc = c => String(c + 1);          // column 0..6 → '1'..'7'
  function fourAt(g, c, r, p) {
    const at = (x, y) => (x >= 0 && x < COLS && y >= 0 && y < g[x].length ? g[x][y] : 0);
    for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      let n = 1;
      for (const s of [1, -1]) { let x = c + dc * s, y = r + dr * s; while (at(x, y) === p) { n++; x += dc * s; y += dr * s; } }
      if (n >= 4) return true;
    }
    return false;
  }
  // replay a move string: { ok, moves (the valid prefix, a string), turn (1 / 2 = player to move), over, win (1 / 2 / 0 draw), why, bad }
  function replay(v, s) {
    s = String(s || '');
    const g = Array.from({ length: COLS }, () => []);
    let res = null, i = 0;
    for (; i < s.length; i++) {
      const c = s.charCodeAt(i) - 49;
      if (res || c < 0 || c >= COLS || g[c].length >= ROWS) return Object.assign({ ok: false, bad: i, moves: s.slice(0, i), turn: i & 1 ? 2 : 1, over: false }, res || {});
      const p = i & 1 ? 2 : 1; g[c].push(p);
      if (fourAt(g, c, g[c].length - 1, p)) res = { over: true, win: p, why: 'four' };
      else if (i + 1 === MAXN) res = { over: true, win: 0, why: 'full' };
    }
    return Object.assign({ ok: true, moves: s, turn: s.length & 1 ? 2 : 1, over: false, win: undefined, why: '' }, res || {});
  }
  const sideNo = (g, u) => (g.b === u ? 1 : g.w === u ? 2 : 0);

  let db = null, uid = null, profile = null, ready = null;
  // anti-tamper protocol (shared/onlinesec.js): 'secure' once the new rules are published, else exactly the old behaviour
  const SEC = window.OnlineSec ? OnlineSec.make({ db: () => db, uid: () => uid, mock: MOCK, initial: INITIAL, opts: { draw: true, abandon: true },
    decorate: typeof secDecorate === 'function' ? (...a) => secDecorate(...a) : null,
    onProfile: p => { profile = p; if (presOn) db.update('presence/' + uid, { rating: p.rating }).catch(() => {}); } }) : null;
  const secure = () => !!(SEC && SEC.secure());

  // ---------------------------------------------------------------- backend adapters
  function loadScript(src) { const C = window.__fbScripts = window.__fbScripts || {}; return C[src] || (C[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load ' + src)); document.head.appendChild(s); })); }  // shared with shared/atlas-account.js

  function firebaseDB() {
    const f = firebase.database();
    let offset = 0;
    f.ref('.info/serverTimeOffset').on('value', s => { offset = s.val() || 0; });
    // onDisconnect handlers fire once and are gone: after every reconnect (sleep, network change) register them again and let the app rewrite its presence
    const disc = new Set(), recon = new Set(); let wasUp = false;
    f.ref('.info/connected').on('value', s => {
      const up = !!s.val();
      if (up && wasUp === 'down') { disc.forEach(p => f.ref(p).onDisconnect().remove()); recon.forEach(cb => { try { cb(); } catch (e) {} }); }
      wasUp = up ? true : (wasUp ? 'down' : false);
    });
    return {
      on(path, cb) { const r = f.ref(path), h = s => cb(s.val()); r.on('value', h); return () => r.off('value', h); },
      get: async p => (await f.ref(p).get()).val(),
      set: (p, v) => f.ref(p).set(v),
      update: (p, v) => f.ref(p).update(v),
      remove: p => f.ref(p).remove(),
      async txn(p, fn) { const r = await f.ref(p).transaction(fn); return { committed: r.committed, value: r.snapshot.val() }; },
      onDisconnectRemove: p => { disc.add(p); return f.ref(p).onDisconnect().remove(); },
      cancelDisconnect: p => { disc.delete(p); return f.ref(p).onDisconnect().cancel(); },
      onReconnect: cb => recon.add(cb),
      stamp: () => firebase.database.ServerValue.TIMESTAMP,
      now: () => Date.now() + offset,
      push: p => f.ref(p).push().key,
    };
  }

  // in-browser mock with the same surface (tree in localStorage, sharded by the first two path segments, change events across tabs)
  function mockDB() {
    const PFX = 'connect4-mockdb:';
    const parts = p => p.split('/').filter(Boolean);
    const shardOf = ks => PFX + ks.slice(0, 2).join('/');
    const readKey = k => { try { const v = localStorage.getItem(k); return v === null ? null : JSON.parse(v); } catch (e) { return null; } };
    function getPath(p) {
      const ks = parts(p);
      if (ks.length < 2) {
        const out = {}; const pre = PFX + (ks[0] ? ks[0] + '/' : '');
        for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(pre)) { const v = readKey(k); if (v !== null) { const sub = k.slice(PFX.length).split('/'); if (ks.length) out[sub[1]] = v; else { (out[sub[0]] = out[sub[0]] || {})[sub[1]] = v; } } } }
        return Object.keys(out).length ? out : null;
      }
      let x = readKey(shardOf(ks));
      for (const k of ks.slice(2)) { if (x == null || typeof x !== 'object') return null; x = x[k]; }
      return x === undefined ? null : x;
    }
    function setPath(p, v) {
      const ks = parts(p);
      if (ks.length < 2) { for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k.startsWith(PFX + ks[0] + '/')) localStorage.removeItem(k); } if (v) for (const [c, x] of Object.entries(v)) setPath(ks[0] + '/' + c, x); return; }
      const key = shardOf(ks);
      if (ks.length === 2) { if (v === null || v === undefined) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); return; }
      let root = readKey(key) || {}, x = root;
      for (let i = 2; i < ks.length - 1; i++) { if (x[ks[i]] == null || typeof x[ks[i]] !== 'object') x[ks[i]] = {}; x = x[ks[i]]; }
      if (v === null || v === undefined) delete x[ks[ks.length - 1]]; else x[ks[ks.length - 1]] = JSON.parse(JSON.stringify(v));
      localStorage.setItem(key, JSON.stringify(root));
    }
    const listeners = new Set();
    const fire = () => { for (const l of listeners) { const v = JSON.stringify(getPath(l.path)); if (v !== l.last) { l.last = v; l.cb(JSON.parse(v)); } } };
    window.addEventListener('storage', e => { if (!e.key || e.key.startsWith(PFX)) fire(); });
    // tabs share the tree: every write is a read-modify-write under one cross-tab lock (Web Locks), so concurrent writes of two
    // tabs to the same shard (e.g. both players' result reports) are never lost
    const write = fn => { const run = () => { fn(); setTimeout(fire, 0); }; return navigator.locks ? navigator.locks.request(PFX, run) : Promise.resolve(run()); };
    const disc = new Set();
    window.addEventListener('pagehide', () => { disc.forEach(p => setPath(p, null)); });
    let n = 0;
    return {
      on(path, cb) { const l = { path, cb, last: undefined }; listeners.add(l); setTimeout(fire, 0); return () => listeners.delete(l); },
      get: async p => getPath(p),
      set: async (p, v) => { await write(() => setPath(p, v)); },
      update: async (p, v) => { await write(() => { for (const [k, x] of Object.entries(v)) setPath(p + '/' + k, x); }); },
      remove: async p => { await write(() => setPath(p, null)); },
      async txn(p, fn) { let out; await write(() => { const cur = getPath(p); const nv = fn(cur === null ? null : JSON.parse(JSON.stringify(cur))); if (nv !== undefined) { setPath(p, nv); out = { committed: true, value: nv }; } else out = { committed: false, value: cur }; }); return out; },
      onDisconnectRemove: p => { disc.add(p); },
      cancelDisconnect: p => { disc.delete(p); },
      stamp: () => Date.now(),
      now: () => Date.now(),
      push: () => Date.now().toString(36) + (n++).toString(36) + Math.random().toString(36).slice(2, 6),
    };
  }

  // ---------------------------------------------------------------- auth
  // mock Google: one fake Google account per browser profile (localStorage); a tab is "signed in" through sessionStorage
  const MOCK_G = 'connect4-mock-gacct', MOCK_UID = 'connect4-mock-uid', MOCK_SIGNED = 'connect4-mock-gsigned';
  const mockAcc = () => { try { return JSON.parse(localStorage.getItem(MOCK_G) || 'null'); } catch (e) { return null; } };
  let authUser = null;     // real Firebase user

  async function init() {
    if (ready) return ready;
    ready = (async () => {
      if (MOCK) {
        db = db || mockDB();
        uid = sessionStorage.getItem(MOCK_UID) || ('u' + Math.random().toString(36).slice(2, 10));
        sessionStorage.setItem(MOCK_UID, uid);
      } else {
        if (!CFG) throw new Error('not-configured');
        const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
        if (!window.firebase || !firebase.auth || !firebase.database) {   // the shared account (shared/atlas-account.js) may have loaded app + auth only
          await loadScript(base + 'firebase-app-compat.js');
          await Promise.all([loadScript(base + 'firebase-auth-compat.js'), loadScript(base + 'firebase-database-compat.js')]);
        }
        if (!firebase.apps.some(a => a.name === '[DEFAULT]')) firebase.initializeApp(CFG);   // the shared-account app ('atlas') may already exist
        if (window.OnlineSec) await OnlineSec.appCheck(firebase.app(), window.FIREBASE_APPCHECK_SITE_KEY, FB_VER);
        const auth = firebase.auth();
        // keep an existing session (Google or anonymous); only create an anonymous one if there is none
        const cur = await new Promise(res => { const off = auth.onAuthStateChanged(u => { off(); res(u); }); });
        try { await auth.getRedirectResult(); } catch (e) { console.warn(e); }
        authUser = auth.currentUser || cur || (await auth.signInAnonymously()).user;
        uid = authUser.uid;
        db = db || firebaseDB();
      }
      await loadProfile();
      if (SEC) await SEC.init();
      return { uid, profile };
    })();
    ready.catch(() => { ready = null; });
    return ready;
  }
  async function loadProfile(serverName) {
    profile = await db.get('players/' + uid);
    if (!profile || typeof profile.rating !== 'number' || typeof profile.name !== 'string' || !profile.name) {
      profile = Object.assign({ games: 0, wins: 0, losses: 0, draws: 0 }, profile || {}, { name: cleanName(profile && profile.name), rating: profile && typeof profile.rating === 'number' ? profile.rating : INITIAL });
      await db.set('players/' + uid, profile);
    }
    // a fresh / this device's player takes the name chosen on this device; an existing account switched to keeps its own name
    const ln = localName();
    if (serverName) { try { localStorage.setItem(NAME_KEY, profile.name); } catch (e) {} }
    else if (ln && ln !== profile.name) { profile.name = ln; await db.update('players/' + uid, { name: ln }); }
    db.set('profiles/' + uid, { n: profile.name }).catch(() => {});
  }
  const NAME_KEY = 'connect4-online-name';
  function localName() { try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; } }
  function defaultName() { const n = localName(); if (n) return n; const d = 'Player' + Math.floor(1000 + Math.random() * 9000); try { localStorage.setItem(NAME_KEY, d); } catch (e) {} return d; }
  const cleanName = s => String(s || '').replace(/[\u0000-\u001f\u007f<>&"']/g, '').replace(/\s+/g, ' ').trim().slice(0, 16) || defaultName();

  async function setName(name) {
    name = cleanName(name);
    try { localStorage.setItem(NAME_KEY, name); } catch (e) {}
    if (!profile) return name;
    profile.name = name; if (presOn) db.update('presence/' + uid, { name });
    await db.update('players/' + uid, { name });
    db.set('profiles/' + uid, { n: name }).catch(() => {});
    return name;
  }

  // the linked Google account of this session (null: anonymous / not signed in)
  function account() {
    if (MOCK) { if (sessionStorage.getItem(MOCK_SIGNED) !== '1') return null; const a = mockAcc(); return a ? { email: a.email, name: a.name } : null; }
    try { const u = window.firebase && firebase.auth && firebase.auth().currentUser; return u && !u.isAnonymous ? { email: u.email || '', name: u.displayName || '' } : null; } catch (e) { return null; }
  }
  // drop this session's live records (before switching account / signing out)
  async function dropLive() {
    try { await leave(); } catch (e) {}
    clearInterval(matchTimer);
    if (presOn) { db.cancelDisconnect('presence/' + uid); await db.remove('presence/' + uid).catch(() => {}); presOn = false; }
  }
  // keep the record with more rated games when an anonymous player switches to an existing Google account
  // secure: through a private snapshot (xfer) taken by the old uid before the switch (x = OnlineSec.xferOut result)
  async function carryPlayer(old, x) {
    const cur = await db.get('players/' + uid);
    if (!old || (cur && (old.games || 0) <= (cur.games || 0))) return;
    if (x) { try { await OnlineSec.xferIn(db, uid, x); } catch (e) { console.warn(e); } return; }
    if (!secure()) await db.set('players/' + uid, Object.assign({}, old, { last: null }));
  }
  const xferOut = async () => { if (!secure()) return null; try { return await OnlineSec.xferOut(db, uid); } catch (e) { console.warn(e); return null; } };
  // sign in with Google: the anonymous account is upgraded (same uid) when possible, otherwise this session switches to
  // the existing Google account (its uid); returns { uid, linked, switched }
  async function google() {
    await init();
    if (MOCK) {
      const a = mockAcc();
      if (a && a.uid !== uid) {                       // credential already in use → switch
        const old = profile; await dropLive();
        const x = await xferOut();
        await db.remove('players/' + uid).catch(() => {});
        uid = a.uid; sessionStorage.setItem(MOCK_UID, uid); sessionStorage.setItem(MOCK_SIGNED, '1');
        await carryPlayer(old, x); await loadProfile(true); emitAuth();
        return { uid, linked: false, switched: true };
      }
      localStorage.setItem(MOCK_G, JSON.stringify({ uid, email: 'player@example.com', name: 'Mock Player' }));
      sessionStorage.setItem(MOCK_SIGNED, '1'); emitAuth();
      return { uid, linked: true, switched: false };
    }
    const auth = firebase.auth(), prov = new firebase.auth.GoogleAuthProvider();
    prov.setCustomParameters({ prompt: 'select_account' });
    const u = auth.currentUser;
    try {
      const r = u && u.isAnonymous ? await u.linkWithPopup(prov) : await auth.signInWithPopup(prov);
      const switched = r.user.uid !== uid;
      if (switched) { await dropLive(); uid = r.user.uid; await loadProfile(true); }
      authUser = r.user; emitAuth();
      return { uid, linked: !switched, switched };
    } catch (e) {
      if (e.code === 'auth/credential-already-in-use' || e.code === 'auth/email-already-in-use') {
        const cred = e.credential || firebase.auth.GoogleAuthProvider.credentialFromError(e);
        const old = profile; await dropLive();
        const x = await xferOut();
        await db.remove('players/' + uid).catch(() => {});
        await db.remove('profiles/' + uid).catch(() => {});
        const r = await auth.signInWithCredential(cred);
        authUser = r.user; uid = r.user.uid;
        await carryPlayer(old, x); await loadProfile(true); emitAuth();
        return { uid, linked: false, switched: true };
      }
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
        await (u && u.isAnonymous ? u.linkWithRedirect(prov) : auth.signInWithRedirect(prov));
      }
      throw e;
    }
  }
  // sign out of Google: back to a fresh anonymous player on this device
  async function logout() {
    await init();
    await dropLive();
    if (MOCK) { sessionStorage.removeItem(MOCK_SIGNED); sessionStorage.removeItem(MOCK_UID); }
    else { await firebase.auth().signOut(); authUser = null; }
    ready = null; uid = null; profile = null;
    await init(); emitAuth();
  }
  const authListeners = new Set();
  function emitAuth() { authListeners.forEach(f => { try { f(account()); } catch (e) { console.warn(e); } }); }
  const onAuth = f => { authListeners.add(f); return () => authListeners.delete(f); };

  // cloud sync of local progress: sync/<uid> = { d: JSON string, t: time }
  async function pull() { await init(); return db.get('sync/' + uid); }
  async function push(d) { await init(); return db.set('sync/' + uid, { d, t: db.now() }); }

  // ---------------------------------------------------------------- presence
  let presOn = false, presState = 'idle';
  async function setPresence(st, extra) {
    if (!db || !uid || !profile) return;
    presState = st || presState;
    const v = Object.assign({ name: profile.name, rating: profile.rating, st: presState, t: db.stamp() }, extra || {});
    await db.set('presence/' + uid, v);
    if (!presOn) {
      db.onDisconnectRemove('presence/' + uid); presOn = true;
      if (db.onReconnect) db.onReconnect(() => setPresence().catch(() => {}));
      setInterval(() => { if (presOn) setPresence().catch(() => {}); }, PRES_BEAT);   // heartbeat: rewrite the whole entry (a bare {t} update after an onDisconnect removal left nameless ghosts)
    }
  }
  // entries whose owner stopped beating (crashed tab, lost disconnect handler) are not shown
  const PRES_BEAT = 60000, PRES_STALE = 150000;
  const presLive = x => typeof x.t === 'number' && !!x.name && db.now() - x.t < PRES_STALE;
  const listOf = v => Object.entries(v || {}).map(([id, x]) => ({ id, ...x, me: id === uid }));
  function watchPresence(cb) { return db.on('presence', v => cb(listOf(v).filter(x => x.me || presLive(x)).sort((a, b) => (b.rating || 0) - (a.rating || 0)))); }
  const roomExp = r => (typeof r.expires === 'number' ? r.expires : (typeof r.created === 'number' ? r.created : 0) + ROOM_TTL);
  const roomLive = (r, now) => !!r && !r.game && roomExp(r) > (now == null ? db.now() : now);
  function watchRooms(cb) {
    let last = null;
    const emit = () => cb(listOf(last).filter(r => !r.priv && (r.game ? !!r.host : roomLive(r))).sort((a, b) => (a.game ? 1 : 0) - (b.game ? 1 : 0) || (a.created || 0) - (b.created || 0)));
    const off = db.on('rooms', v => { last = v; emit(); });
    const iv = setInterval(() => { if (last) emit(); }, 15000);
    return () => { off(); clearInterval(iv); };
  }
  function watchLobby(cb) { return db.on('lobby', v => cb(listOf(v).filter(x => !x.game))); }

  // ---------------------------------------------------------------- Elo
  const kFactor = games => games < 10 ? 40 : games < 30 ? 32 : 24;
  function elo(my, opp, score, games) { const exp = 1 / (1 + Math.pow(10, (opp - my) / 400)); return Math.round(my + kFactor(games) * (score - exp)); }

  // ---------------------------------------------------------------- lobby & matchmaking (same board size only)
  let lobbyUnsub = null, selfUnsub = null, matchTimer = 0, lobbyState = null;
  const windowFor = waitMs => Math.min(400, 100 + 50 * Math.floor(waitMs / 10000));
  async function enterLobby({ onList, onMatched, onStatus, v }) {
    await leave();
    setPresence('lobby');
    v = varOk(v) ? v : DEF_V;
    const since = db.now();
    lobbyState = { since, onMatched, onStatus, v };
    await secPrepare(lobbyState);
    await db.set('lobby/' + uid, { name: profile.name, rating: profile.rating, v, since: db.stamp(), game: null });
    db.onDisconnectRemove('lobby/' + uid);
    lobbyUnsub = db.on('lobby', v => {
      const list = listOf(v).sort((a, b) => b.rating - a.rating);
      if (lobbyState) lobbyState.list = list;
      onList && onList(list);
    });
    selfUnsub = db.on('lobby/' + uid + '/game', gid => { if (gid && lobbyState) { const cb = lobbyState.onMatched; leave(true); cb(gid); } });
    matchTimer = setInterval(tryMatch, 2000);
    setTimeout(tryMatch, 600);
  }
  // secure protocol: an unsettled rated game blocks matching until it is settled (retried while searching); fresh stored rating
  async function secPrepare(st) {
    if (!secure()) return;
    try { const p = await db.get('players/' + uid); if (p && typeof p.rating === 'number') profile.rating = p.rating; } catch (e) {}
    st.blocked = !(await SEC.resolve().catch(() => false));
    if (st.blocked) OnlineSec.notice('open', 6000);
  }
  const skip = new Map();     // candidates that still have an unsettled rated game (re-checked after a while)
  async function tryMatch() {
    const st = lobbyState; if (!st || !st.list || st.busy) return;
    if (st.blocked) {
      st.busy = true;
      try { if (db.now() - (st.lastTry || 0) > 10000) { st.lastTry = db.now(); if (await SEC.resolve().catch(() => false)) { st.blocked = false; const p = await db.get('players/' + uid); if (p) { profile.rating = p.rating; await db.update('lobby/' + uid, { rating: p.rating }); } } } } finally { st.busy = false; }
      if (st.blocked) return;
    }
    const now = db.now(), myWait = now - st.since;
    const others = st.list.filter(x => !x.me && !x.game && typeof x.rating === 'number' && x.v === st.v);
    let best = null;
    for (const o of others) {
      const w = windowFor(Math.max(myWait, now - (o.since || now)));
      const d = Math.abs(o.rating - profile.rating);
      if (d <= w && (!best || d < best.d) && !(skip.get(o.id) > now)) best = { ...o, d };
    }
    st.onStatus && st.onStatus({ waiting: st.list.filter(x => !x.me && !x.game).length, same: others.length, window: windowFor(myWait), wait: myWait, v: st.v });
    if (!best || uid > best.id) return;        // the smaller uid creates the game so both sides do not
    st.busy = true;
    try {
      if (secure()) {        // the rules want both players' stored ratings and no unsettled rated game on either side
        if (await SEC.blocked(best.id)) { skip.set(best.id, now + 30000); return; }
        const [pm, po] = await Promise.all([db.get('players/' + uid), db.get('players/' + best.id)]);
        if (!pm || !po) return;
        profile.rating = pm.rating; best.rating = po.rating;
      }
      const gid = db.push('games');
      const first = Math.random() < 0.5 ? uid : best.id, second = first === uid ? best.id : uid;
      const names = { [uid]: profile.name, [best.id]: best.name }, rates = { [uid]: profile.rating, [best.id]: best.rating };
      const rec = { b: first, w: second, bn: names[first], wn: names[second], br: rates[first], wr: rates[second], moves: '', status: 'play', rated: true, ...tcFields(st.v), created: db.stamp(), t: db.stamp() };
      await (SEC ? SEC.createRated(gid, rec) : db.set('games/' + gid, rec));
      const r = await db.txn('lobby/' + best.id, cur => { if (cur === null) return null; if (cur.game) return; cur.game = gid; return cur; });
      if (r.committed && r.value && r.value.game === gid) await db.update('lobby/' + uid, { game: gid });
      else { await db.remove('games/' + gid); if (secure()) SEC.resolve().catch(() => {}); }   // the link points at nothing now: cleared
    } catch (e) { console.warn(e); skip.set(best.id, db.now() + 15000); } finally { if (lobbyState === st) st.busy = false; }
  }

  // ---------------------------------------------------------------- rooms (unrated; open = listed, priv = joined only with the code)
  let roomCode = null, roomV = DEF_V, roomPriv = false, roomExpires = 0, roomUnsub = null, roomTimer = 0, roomCbs = null;
  let roomGame = null, roomG = null, roomGameUnsub = null, roomBusy = false;
  const roomListeners = new Set();
  const room = () => (roomCode ? { code: roomCode, priv: roomPriv, v: roomV, expires: roomExpires, left: Math.max(0, roomExpires - db.now()), game: roomGame } : null);
  const roomEmit = (ev, x) => roomListeners.forEach(f => { try { f(ev, room(), x); } catch (e) { console.warn(e); } });
  function onRoom(f) { roomListeners.add(f); return () => roomListeners.delete(f); }   // ev: open | closed | expired | gone | matched | reopen
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function roomAttach(code, d, cbs) {
    roomCode = code; roomV = d.v; roomPriv = !!d.priv; roomExpires = d.expires; roomCbs = cbs;
    if (!d.game) setPresence('room', { room: d.priv ? null : code });
    db.onDisconnectRemove('rooms/' + code);
    let seen = false;
    roomUnsub = db.on('rooms/' + code, v => {
      if (roomCode !== code) return;
      if (v && v.host === uid) {
        seen = true;
        if (typeof v.expires === 'number' && !v.game) roomExpires = v.expires;
        if (v.game && v.game !== roomGame) { roomWatchGame(v.game); const cb = roomCbs && roomCbs.onMatched; roomEmit('matched'); cb && cb(v.game); }
        else if (!v.game && roomGame) {
          const g = roomG; roomWatchGame(null);
          if (presState !== 'play' || !g || g.status !== 'play') setPresence('room', { room: roomPriv ? null : code });
          roomEmit('reopen', g);
        }
        return;
      }
      if (seen || v) { roomEnd(); if (!v) roomEmit('gone'); }
    });
    roomTimer = setInterval(roomCheck, 5000);
    roomEmit('open');
  }
  async function createRoom({ onMatched, onExpired, priv, v }) {
    v = varOk(v) ? v : DEF_V;
    await leave();
    for (let tries = 0; tries < 6; tries++) {
      const code = Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
      const expires = db.now() + ROOM_TTL;
      const r = await db.txn('rooms/' + code, cur => cur === null ? { host: uid, name: profile.name, rating: profile.rating, v, created: db.stamp(), expires, game: null, guest: null, priv: !!priv } : undefined);
      if (!r.committed || !r.value || r.value.host !== uid || r.value.expires !== expires) continue;
      roomAttach(code, { v, priv: !!priv, expires }, { onMatched, onExpired });
      return code;
    }
    throw new Error('room');
  }
  function roomCheck() {
    if (!roomCode) return;
    if (roomGame) {
      const g = roomG, gid = roomGame;
      if (g && g.status !== 'play' && !g.post) {
        const guest = g.b === uid ? g.w : g.b;
        db.get('presence/' + guest).then(p => { if (!p && roomGame === gid) setPost(gid, 'left'); }).catch(() => {});
        if (g.again && db.now() - g.again.t > REMATCH_MS + 2000) expireRematch(gid);
      }
      return;
    }
    if (db.now() < roomExpires) return;
    const cb = roomCbs && roomCbs.onExpired;
    closeRoom('expired').then(() => cb && cb());
  }
  function roomWatchGame(gid) {
    roomGameUnsub && roomGameUnsub(); roomGameUnsub = null;
    roomGame = gid || null; roomG = null;
    if (!gid) return;
    roomGameUnsub = db.on('games/' + gid, g => { if (roomGame !== gid) return; roomG = g; roomFollow(gid, g); });
  }
  async function roomFollow(gid, g) {
    if (roomBusy || roomGame !== gid || !roomCode) return;
    const code = roomCode;
    if (g && (g.status === 'play' || !g.post || g.next)) return;
    roomBusy = true;
    try {
      if (g && g.post === 'again') {      // both agreed: next game in the same room, the other player moves first
        const ngid = db.push('games');
        const iFirst = g.w === uid, me = { n: profile.name, r: profile.rating }, op = g.b === uid ? { n: g.wn, r: g.wr } : { n: g.bn, r: g.br };
        const B = iFirst ? me : op, W = iFirst ? op : me;
        await db.set('games/' + ngid, { b: g.w, w: g.b, bn: B.n, wn: W.n, br: B.r, wr: W.r, moves: '', status: 'play', rated: false, room: code, host: uid, ...tcFields(g.v), created: db.stamp(), t: db.stamp() });
        const r = await db.txn('rooms/' + code, cur => { if (cur === null) return null; if (cur.host !== uid || cur.game !== gid) return; cur.game = ngid; return cur; });
        if (r.committed && r.value && r.value.game === ngid) await db.update('games/' + gid, { next: ngid });
        else await db.remove('games/' + ngid);
      } else {
        await db.txn('rooms/' + code, cur => { if (cur === null) return null; if (cur.host !== uid || cur.game !== gid) return; cur.game = null; cur.guest = null; cur.gname = null; cur.expires = db.now() + ROOM_TTL; return cur; });
      }
    } catch (e) { console.warn(e); } finally {
      roomBusy = false;
      setTimeout(() => { if (roomGame === gid && roomG && roomG !== g) roomFollow(gid, roomG); }, 0);
    }
  }
  function roomEnd() {
    roomUnsub && roomUnsub(); roomUnsub = null; clearInterval(roomTimer); roomTimer = 0;
    roomWatchGame(null);
    if (roomCode) db.cancelDisconnect('rooms/' + roomCode);
    roomCode = null; roomCbs = null; roomExpires = 0;
  }
  async function closeRoom(why) {
    if (!roomCode) return;
    const c = roomCode, gid = roomGame; roomEnd();
    if (gid) setPost(gid, 'host').catch(() => {});
    if (presOn && presState === 'room') setPresence('idle', { room: null });
    await db.txn('rooms/' + c, cur => (cur === null ? null : cur.host === uid ? null : undefined));
    roomEmit(why === 'expired' ? 'expired' : 'closed');
  }
  async function extendRoom() { if (!roomCode) return; roomExpires = db.now() + ROOM_TTL; await db.update('rooms/' + roomCode, { expires: roomExpires }); }
  const normCode = code => String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  async function joinRoom(code) {
    code = normCode(code);
    if (!code) return null;
    const rm = await db.get('rooms/' + code);
    if (!roomLive(rm) || rm.host === uid) return null;
    await leave();
    const gid = db.push('games');
    const first = Math.random() < 0.5 ? uid : rm.host, second = first === uid ? rm.host : uid;
    const names = { [uid]: profile.name, [rm.host]: rm.name }, rates = { [uid]: profile.rating, [rm.host]: rm.rating };
    await db.set('games/' + gid, { b: first, w: second, bn: names[first], wn: names[second], br: rates[first], wr: rates[second], moves: '', status: 'play', rated: false, room: code, host: rm.host, ...tcFields(rm.v), created: db.stamp(), t: db.stamp() });
    const r = await db.txn('rooms/' + code, cur => { if (cur === null) return null; if (!roomLive(cur) || cur.host !== rm.host) return; cur.game = gid; cur.guest = uid; cur.gname = profile.name; return cur; });
    if (!(r.committed && r.value && r.value.game === gid)) { await db.remove('games/' + gid); return null; }
    return gid;
  }
  const postable = (g, v) => g && !g.post && !g.next && g.room && !g.rated && (g.status !== 'play' || v === 'host');
  const setPost = (gid, v) => db.txn('games/' + gid, g => { if (g === null) return null; if (!postable(g, v)) return; g.post = v; return g; });
  const requestRematch = gid => db.txn('games/' + gid, g => {
    if (g === null) return null; if (!postable(g)) return;
    if (g.again) { if (g.again.by === uid) return; g.post = 'again'; return g; }
    g.again = { by: uid, t: db.stamp() }; return g;
  });
  const answerRematch = (gid, yes) => db.txn('games/' + gid, g => { if (g === null) return null; if (!postable(g) || !g.again || g.again.by === uid) return; g.post = yes ? 'again' : 'no'; return g; });
  const expireRematch = gid => db.txn('games/' + gid, g => { if (g === null) return null; if (!postable(g) || !g.again || db.now() - g.again.t < REMATCH_MS) return; g.post = 'timeout'; return g; });

  // ---- spectating (open rooms only); the only write is watch/<gid>/<uid> = true
  let watchGid = null;
  async function roomGameOf(code) {
    code = normCode(code);
    const rm = code ? await db.get('rooms/' + code) : null;
    return rm && !rm.priv && rm.game && rm.host !== uid && rm.guest !== uid ? rm.game : null;
  }
  function watchUnmark() { if (!watchGid) return; const p = 'watch/' + watchGid + '/' + uid; watchGid = null; db.cancelDisconnect(p); db.remove(p).catch(() => {}); }
  function spectate(gid, cb) {
    setPresence('watch', { room: null });
    watchUnmark(); watchGid = gid;
    db.set('watch/' + gid + '/' + uid, true).then(() => { if (watchGid === gid) db.onDisconnectRemove('watch/' + gid + '/' + uid); }).catch(() => {});
    const off = db.on('games/' + gid, cb);
    return () => { off(); if (watchGid === gid) watchUnmark(); };
  }
  const watchCount = (gid, cb) => db.on('watch/' + gid, v => cb(Object.keys(v || {}).length));

  async function leaveLobby() {
    clearInterval(matchTimer); matchTimer = 0;
    lobbyUnsub && lobbyUnsub(); selfUnsub && selfUnsub(); lobbyUnsub = selfUnsub = null;
    if (lobbyState) { lobbyState = null; db.cancelDisconnect('lobby/' + uid); await db.remove('lobby/' + uid); if (presOn && presState === 'lobby') setPresence(roomCode ? 'room' : 'idle', { room: roomCode && !roomPriv ? roomCode : null }); }
  }
  async function leave(keepMatched) {
    if (!keepMatched && presOn) setPresence('idle', { room: null });
    clearInterval(matchTimer); matchTimer = 0;
    lobbyUnsub && lobbyUnsub(); selfUnsub && selfUnsub(); lobbyUnsub = selfUnsub = null;
    if (lobbyState) { lobbyState = null; db.cancelDisconnect('lobby/' + uid); await db.remove('lobby/' + uid); }
    if (roomCode) { const c = roomCode, gid = roomGame; roomEnd(); if (gid) setPost(gid, 'host').catch(() => {}); await db.txn('rooms/' + c, cur => (cur === null ? null : cur.host === uid ? null : undefined)); roomEmit('closed'); }
  }

  // ---------------------------------------------------------------- games
  function watchGame(gid, cb) { setPresence('play', { room: null }); if (SEC) SEC.join(gid); return db.on('games/' + gid, cb); }
  // the mover pays the time since the last move, then gets the increment. false = its flag has already fallen
  function chargeClock(g, side) {
    const m = mainOf(g, side), el = Math.max(0, db.now() - (g.t || db.now()));
    if (el > m + 1000) return false;
    g['m' + side] = Math.max(0, m - el) + tcOf(g).inc;
    return true;
  }
  // append move m (column 0..6); len = number of moves already played (guards against double sends / races). A move that ends the game sets the result.
  async function sendMove(gid, len, m) {
    const r = await db.txn('games/' + gid, g => {
      if (g === null) return null;
      if (g.status !== 'play' || String(g.moves || '').length !== len || !varOk(g.v)) return;
      const st = replay(g.v, g.moves);
      if (!st.ok || st.over) return;
      if (sideNo(g, uid) !== st.turn) return;                                 // not my turn
      const after = replay(g.v, String(g.moves || '') + enc(m));
      if (!after.ok) return;                                                   // illegal move
      const side = sideOf(g, uid);
      if (!chargeClock(g, side)) return;
      g.moves = String(g.moves || '') + enc(m);
      g.t = db.stamp(), g.lm = uid;
      g.offer = null;                                                          // a move answers (declines) a pending draw offer
      if (after.over) { g.status = 'over'; g.win = after.win; g.why = after.why; }
      return g;
    });
    return r.committed;
  }
  const resign = gid => db.txn('games/' + gid, g => { if (g === null) return null; if (g.status !== 'play' || !sideNo(g, uid)) return; g.status = 'resign'; g.loser = uid; g.offer = null; return g; });
  const claimTimeout = (gid, oppUid) => db.txn('games/' + gid, g => { if (g === null) return null; if (g.status !== 'play' || db.now() - g.t < mainOf(g, sideOf(g, oppUid)) + GRACE) return; g.status = 'timeout'; g.loser = oppUid; g.offer = null; return g; });
  // the opponent left (no presence) while it is their turn: after ABANDON_MS the player still here wins
  async function claimAbandon(gid, oppUid) {
    if (await db.get('presence/' + oppUid)) return { committed: false };
    return db.txn('games/' + gid, g => {
      if (g === null) return null;
      if (g.status !== 'play' || db.now() - g.t < ABANDON_MS) return;
      const st = replay(g.v, g.moves); if (!st.ok || st.turn !== sideNo(g, oppUid)) return;
      g.status = 'abandon'; g.loser = oppUid; g.offer = null; return g;
    });
  }
  // draw offer: valid until the next move; the opponent accepts (status draw) or declines (offer removed)
  const offerDraw = gid => db.txn('games/' + gid, g => { if (g === null) return null; if (g.status !== 'play' || !sideNo(g, uid) || (g.offer && g.offer.by)) return; g.offer = { by: uid, n: String(g.moves || '').length }; return g; });
  const answerDraw = (gid, yes) => db.txn('games/' + gid, g => {
    if (g === null) return null;
    if (g.status !== 'play' || !sideNo(g, uid) || !g.offer || g.offer.by === uid) return;
    if (yes) { g.status = 'draw'; g.win = 0; g.why = 'agree'; } g.offer = null; return g;
  });
  // board finished but the status was not set (old / interrupted write): either player may mark it
  const markOver = gid => db.txn('games/' + gid, g => { if (g === null) return null; if (g.status !== 'play') return; const st = replay(g.v, g.moves); if (!st.ok || !st.over) return; g.status = 'over'; g.win = st.win; g.why = st.why; return g; });
  // the winner of a finished game: 1 first player, 2 second, 0 draw
  function winnerOf(g) {
    if (!g || g.status === 'play') return null;
    if (g.status === 'resign' || g.status === 'timeout' || g.status === 'abandon') return g.loser === g.b ? 2 : 1;
    if (g.status === 'draw') return 0;
    if (typeof g.win === 'number') return g.win;
    const st = replay(g.v, g.moves); return st.over ? st.win : 0;
  }

  // secure protocol: my own result of a game record that ended on the board (null: not finished by my replay → disputed)
  function secOwn(g) { const st = replay(g.v, g.moves); if (!st.ok || !st.over) return null; return !st.win ? 0.5 : st.win === sideNo(g, uid) ? 1 : 0; }
  // the history entry of a settled rated game (same fields as below)
  function secDecorate(np, p, G, s, nr) {
    const hist = Array.isArray(p.hist) ? p.hist.slice() : (p.hist && typeof p.hist === 'object' ? Object.values(p.hist) : []);
    const opp = G.b === uid ? G.wr : G.br, oppName = G.b === uid ? G.wn : G.bn, gid = np.last;
    hist.push({ g: gid, t: db.now(), v: G.v || DEF_V, o: String(oppName || '?').slice(0, 16), or: typeof opp === 'number' ? opp : INITIAL, s, d: nr - p.rating, r: nr, why: G.status === 'over' ? (G.why || 'end') : G.status });
    np.hist = hist.slice(-HIST_N);
  }
  // apply a finished game to players/<uid> once (game id kept in `last` and in the history, so a reload / resume never counts twice).
  // Rated games: Elo + a history entry { g, t, v, o (opponent), or, s (1 / 0.5 / 0), d, r, why }.
  // own: my own view of a game that ended on the board (null = not finished here → disputed). Secure protocol: OnlineSec settles
  // the linked game (both reports must agree; resign / timeout / abandon / agreed draw are decided by the record itself).
  async function applyResult(gid, game, score, own) {
    if (secure()) {
      const r = await SEC.settle(gid, game, game && game.status === 'over' ? (own === undefined ? (typeof secOwn === 'function' ? secOwn(game, score) : score) : own) : score);
      if (r.rated) profile = (await db.get('players/' + uid)) || profile;
      return r;
    }
    const opp = game.b === uid ? game.wr : game.br, oppName = game.b === uid ? game.wn : game.bn;
    let out = { old: profile.rating, now: profile.rating, rated: !!game.rated };
    const r = await db.txn('players/' + uid, p => {
      if (p === null) return null;
      const hist = Array.isArray(p.hist) ? p.hist : (p.hist && typeof p.hist === 'object' ? Object.values(p.hist) : []);
      if (p.last === gid || hist.some(h => h && h.g === gid)) return;
      if (typeof p.rating !== 'number') p.rating = INITIAL;
      const old = p.rating, nr = game.rated ? elo(p.rating, typeof opp === 'number' ? opp : INITIAL, score, p.games || 0) : p.rating;
      p.rating = nr; p.games = (p.games || 0) + (game.rated ? 1 : 0);
      if (game.rated) {
        if (score === 1) p.wins = (p.wins || 0) + 1; else if (score === 0) p.losses = (p.losses || 0) + 1; else p.draws = (p.draws || 0) + 1;
        hist.push({ g: gid, t: db.now(), v: game.v || DEF_V, o: String(oppName || '?').slice(0, 16), or: typeof opp === 'number' ? opp : INITIAL, s: score, d: nr - old, r: nr, why: game.status === 'over' ? (game.why || 'end') : game.status });
      }
      p.hist = hist.slice(-HIST_N);
      p.last = gid; return p;
    });
    if (r.committed && r.value) { out = { old: profile.rating, now: r.value.rating, rated: !!game.rated }; profile = r.value; if (presOn) db.update('presence/' + uid, { rating: profile.rating }); }
    return out;
  }
  const history = () => { const h = profile && profile.hist; return (Array.isArray(h) ? h : h && typeof h === 'object' ? Object.values(h) : []).filter(x => x && typeof x.r === 'number').sort((a, b) => (a.t || 0) - (b.t || 0)); };
  async function topPlayers(n = 20) {
    const all = await db.get('players') || {};
    return Object.entries(all).filter(([, p]) => p && p.games > 0).map(([id, p]) => ({ id, ...p, me: id === uid })).sort((a, b) => b.rating - a.rating).slice(0, n);
  }

  // ---------------------------------------------------------------- public chat (everyone online in this game; no private messages)
  // A ring of CHAT_N slots: chat/seq counts messages (transaction), message n goes to chat/msgs/<n % CHAT_N>, overwriting the oldest,
  // so the database never holds more than the latest CHAT_N messages.
  const CHAT_N = 20, CHAT_LEN = 100, CHAT_GAP = 3000;
  let chatLast = 0;
  const chatClean = s => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, CHAT_LEN).trim();
  function watchChat(cb) {
    return db.on('chat/msgs', v => cb(Object.values(v || {}).filter(m => m && typeof m.n === 'number' && typeof m.text === 'string').sort((a, b) => a.n - b.n).slice(-CHAT_N).map(m => ({ ...m, me: m.uid === uid }))));
  }
  // → { ok } | { ok: false, why: 'empty' | 'rate' | 'error', wait }
  async function sendChat(text) {
    text = chatClean(text);
    if (!text) return { ok: false, why: 'empty' };
    const now = Date.now();
    if (now - chatLast < CHAT_GAP) return { ok: false, why: 'rate', wait: CHAT_GAP - (now - chatLast) };
    chatLast = now;
    try {
      const r = await db.txn('chat/seq', n => (typeof n === 'number' ? n : 0) + 1);
      if (!r.committed || typeof r.value !== 'number') return { ok: false, why: 'error' };
      const msg = { n: r.value, uid, name: profile.name, text, t: db.stamp() };
      if (secure()) await db.update('/', { ['chat/msgs/' + (r.value % CHAT_N)]: msg, ['chatLast/' + uid]: db.stamp() });
      else await db.set('chat/msgs/' + (r.value % CHAT_N), msg);
      return { ok: true };
    } catch (e) { console.warn(e); return { ok: false, why: 'error' }; }
  }

  window.C4Online = {
    CHAT_N, CHAT_LEN, CHAT_GAP, watchChat, sendChat,
    available: !!CFG || MOCK, configured: !!CFG, mock: MOCK, INITIAL, VARIANTS, DEF_V, TC, GRACE, ABANDON_MS, ROOM_TTL, REMATCH_MS, HIST_N, COLS, ROWS,
    tcOf, clockOf, replay, enc, sideNo, cleanName, defaultName, localName,
    get room() { return db ? room() : null; },
    getGame: gid => db.get('games/' + gid),
    init, setName, setPresence, watchPresence, watchRooms, watchLobby, enterLobby, createRoom, joinRoom, leave, leaveLobby, closeRoom, extendRoom, onRoom,
    setPost, requestRematch, answerRematch, expireRematch, roomGameOf, spectate, watchCount,
    winnerOf, history, watchGame, sendMove, resign, claimTimeout, claimAbandon, offerDraw, answerDraw, markOver, applyResult, presenceOf: u => db.get('presence/' + u), topPlayers, elo,
    account, google, logout, onAuth, pull, push,
    get uid() { return uid; }, get profile() { return profile; }, get ready() { return !!(db && uid && profile); }, now: () => (db ? db.now() : Date.now()),
    get secure() { return secure(); }, secMsg: k => (window.OnlineSec ? OnlineSec.msg(k) : ''),
  };
})();
