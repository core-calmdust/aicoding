// Online play for Backgammon (same design as Nine Men's Morris / Checkers): lobby, Elo rating with history, rating-based matchmaking per
// format, rooms with codes, spectating, rematch, resign / timeout / abandon, presence — plus Google sign-in and cloud sync of local
// progress (sync/<uid>).
//
// Fair dice without a server: commit–reveal hash chains. For every game each player derives a secret chain r[N] → r[N-1] = H(r[N]) → …
// → r[0] (H = SHA-256, 32 hex) from a private key that never leaves the player (localStorage, backed up in the private sync/<uid>/k)
// and publishes only r[0] (ch.b / ch.w). Roll i is H(rb[i] + rw[i] + ':' + i) where rb[i] / rw[i] are the i-th reveals (kb / kw, 32 hex
// each); everybody checks H(r[i]) = r[i-1]. Both chains are fixed before any reveal, so neither player can choose or foresee the dice.
// Order: the player on roll decides on the cube first, then reveals (= "roll"), and only then the opponent's client reveals its part,
// so nobody knows a roll before the last decision made in front of it. The opening roll: both reveal at once (doubles are re-rolled).
//
// Game record games/<gid> (one game of a match): b / w = uids of side 0 / side 1 (side 0 = the engine's side 0); bn / wn, br / wr;
// moves = the game in the engine's record format (BG.encodeGame: "<dice><moves>" per roll, d / k / p cube actions, x1..y3 resignation),
// written action by action (every write is a transaction validated with the rules engine and the dice); f = format (g1 m3 m5 m7),
// ml = match length (0 = single game), cube, sc = [s0, s1] score before this game, cr = Crawford game, cu = Crawford used, gi = game no.,
// mid = gid of the match's first game, pv / nx = previous / next game of the match; mb / mw = reserve time (ms) of side 0 / 1, t = start
// of the current actor's time (a DELAY per action is free); ch / kb / kw dice chains; ro = { by, n } resignation offer;
// status play | over (this game decided; mo = the match too) | resign (match forfeited) | timeout | abandon; win = winner side of the game,
// pts = points, why = single | gammon | bg | drop | resign; loser = uid (resign / timeout / abandon).
// Backend: Firebase (anonymous / Google auth + Realtime Database) when window.FIREBASE_CONFIG is set,
// or an in-browser mock (localStorage, shared between tabs) with ?mock=1 for testing.
(function () {
  'use strict';
  const CFG = window.FIREBASE_CONFIG || null;
  const Q = new URLSearchParams(location.search);
  const MOCK = Q.has('mock');
  const FB_VER = '10.12.2';
  const INITIAL = 1500;
  // formats: single game (rated: no cube) and 3 / 5 / 7-point matches (cube + Crawford rule). Clock: DELAY free seconds per action
  // (cube decision / roll, move, take), then the reserve runs; a match's reserve carries over from game to game.
  const FORMATS = { g1: { ml: 0, main: 180000 }, m3: { ml: 3, main: 360000 }, m5: { ml: 5, main: 600000 }, m7: { ml: 7, main: 840000 } };
  const VARIANTS = Object.keys(FORMATS);
  const RATED = ['g1', 'm5'];             // matchmaking formats (g1 rated without the cube)
  const DEF_V = 'g1';
  const DELAY = MOCK && +Q.get('delay') > 0 ? +Q.get('delay') : 12000;
  const GRACE = 3000;                    // latency allowance before the opponent may claim a timeout
  const ABANDON_MS = MOCK && +Q.get('abandon') > 0 ? +Q.get('abandon') : 45000;   // opponent offline this long while we wait for them → win by abandonment
  const ROOM_TTL = 10 * 60000;           // a room nobody joins expires after 10 min
  const REMATCH_MS = 10000;
  const HIST_N = 50;                     // rated matches kept in players/<uid>/hist
  const CHAIN_N = 400;                   // reveals per player and game (a game needs one per roll)
  const varOk = v => Object.prototype.hasOwnProperty.call(FORMATS, v);
  const fmtOf = g => FORMATS[g && varOk(g.f) ? g.f : DEF_V];
  const sideOf = (g, u) => (g.b === u ? 'b' : 'w');
  const sideNo = (g, u) => (g.b === u ? 0 : g.w === u ? 1 : -1);
  const SK = s => (s ? 'w' : 'b');
  const mainOf = (g, s) => { const v = g && g['m' + SK(s)]; return typeof v === 'number' ? Math.max(0, v) : fmtOf(g).main; };
  // clock of side s: { main: reserve left now, delay: free time left now, left: reserve after the delay (negative: flag fallen) }
  function clockOf(g, s, running, now) {
    const m = mainOf(g, s);
    if (!running) return { main: m, delay: DELAY, left: m, running: false };
    const el = Math.max(0, (now == null ? (db ? db.now() : Date.now()) : now) - (g.t || now || Date.now()));
    return { main: Math.max(0, m - Math.max(0, el - DELAY)), delay: Math.max(0, DELAY - el), left: m - Math.max(0, el - DELAY), running: true };
  }
  const H = s => window.BG.sha256(s).slice(0, 32);

  // ---------------------------------------------------------------- dice chains
  const HEX = /^[0-9a-f]{32}$/;
  function diceOf(rb, rw, i) {
    const x = window.BG.sha256(rb + rw + ':' + i), d = [];
    for (let k = 0; k + 2 <= x.length && d.length < 2; k += 2) { const v = parseInt(x.substr(k, 2), 16); if (v < 252) d.push(1 + (v % 6)); }
    while (d.length < 2) d.push(1 + (parseInt(x.substr(d.length * 2, 2), 16) % 6));
    return d;
  }
  // number of valid reveals of one side (a prefix check; validated prefixes are cached)
  const vcache = new Map();
  function validCount(commit, s) {
    s = String(s || '');
    if (!commit || !HEX.test(commit)) return 0;
    const ck = commit, c = vcache.get(ck);
    let n = 0, prev = commit;
    if (c && s.startsWith(c.s)) { n = c.n; prev = c.last; }
    for (; (n + 1) * 32 <= s.length; n++) {
      const r = s.substr(n * 32, 32);
      if (!HEX.test(r) || H(r) !== prev) break;
      prev = r;
    }
    vcache.set(ck, { s: s.slice(0, n * 32), n, last: prev });
    return n;
  }
  const sameDice = (a, b) => (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
  // the whole game: { ok, bad, actions, st (BG.replay), phase, idx (roll number in play), dice, mover, actor (side whose clock runs),
  //   need [sides that must act / reveal], nr [valid reveals b, w] }
  // phase: commit (chains missing) · open (opening roll: both reveal) · roll (mover: cube or roll) · reveal (opponent's part of the roll)
  //        · move (dice known) · take (cube offered) · over
  function replay(g) {
    g = g || {};
    const out = { ok: true, bad: '', actions: [], st: null, phase: '', idx: 1, dice: null, mover: -1, actor: -1, need: [] };
    const dec = window.BG.decodeGame(String(g.moves || ''));
    const ch = g.ch || {}, kb = String(g.kb || ''), kw = String(g.kw || '');
    const nr = [validCount(ch.b, kb), validCount(ch.w, kw)];
    out.nr = nr;
    if (nr[0] * 32 !== kb.length || nr[1] * 32 !== kw.length) { out.ok = false; out.bad = 'chain'; }
    const rev = (s, i) => (s ? kw : kb).substr((i - 1) * 32, 32);
    const dice = i => (i <= nr[0] && i <= nr[1] ? diceOf(rev(0, i), rev(1, i), i) : null);
    out.diceAt = dice;
    let st = window.BG.replay([]), idx = 1;
    const acts = [];
    for (const a of dec.actions) {
      if (a.t === 'r') {
        let d;
        if (st.nRolls === 0) { while ((d = dice(idx)) && d[0] === d[1]) idx++; if (!d || d[0] !== a.d[0] || d[1] !== a.d[1]) { out.ok = false; out.bad = 'dice'; break; } }
        else { d = dice(idx); if (!d || !sameDice(d, a.d)) { out.ok = false; out.bad = 'dice'; break; } }
        idx++;
      }
      acts.push(a); st = window.BG.replay(acts);
    }
    if (dec.error) { out.ok = false; out.bad = out.bad || 'moves'; }
    out.actions = acts; out.st = st; out.idx = idx;
    if (st.over) { out.phase = 'over'; return out; }
    if (!ch.b || !ch.w) { out.phase = 'commit'; out.need = [0, 1].filter(s => !ch[SK(s)]); return out; }
    if (st.nRolls === 0) {
      let d; while ((d = dice(idx)) && d[0] === d[1]) idx++;
      out.idx = idx;
      if (!d) { out.phase = 'open'; out.need = [0, 1].filter(s => nr[s] < idx); return out; }
      out.phase = 'move'; out.dice = d; out.mover = out.actor = d[0] > d[1] ? 0 : 1; out.need = [out.mover]; return out;
    }
    if (st.offered) { out.phase = 'take'; out.actor = st.turn; out.mover = st.doubler; out.need = [st.turn]; return out; }
    const m = st.turn; out.mover = m;
    if (nr[m] < idx) { out.phase = 'roll'; out.actor = m; out.need = [m]; }
    else if (nr[1 - m] < idx) { out.phase = 'reveal'; out.actor = 1 - m; out.need = [1 - m]; }
    else { out.phase = 'move'; out.dice = dice(idx); out.actor = m; out.need = [m]; }
    return out;
  }
  // cube context of a game record for side s (BG.cubeAvailable)
  function cubeCtx(g, st, s) {
    const ml = g.ml || 0, sc = Array.isArray(g.sc) ? g.sc : [0, 0];
    return { cube: st.cube, owner: st.owner, me: s, matchLen: ml, score: sc.slice(), crawford: !!g.cr, postCrawford: ml > 0 && !g.cr && (sc[0] === ml - 1 || sc[1] === ml - 1), cubeOn: !!g.cube && ml !== 1 };
  }
  const matchOverG = g => !!g && g.status !== 'play' && (g.status !== 'over' || !!g.mo);
  // match winner side (0 / 1) of a finished match, else null
  function winnerOf(g) {
    if (!matchOverG(g)) return null;
    if (g.status === 'resign' || g.status === 'timeout' || g.status === 'abandon') return g.loser === g.b ? 1 : 0;
    return typeof g.mwin === 'number' ? g.mwin : g.win;
  }

  let db = null, uid = null, profile = null, ready = null;
  // anti-tamper protocol (shared/onlinesec.js): 'secure' once the new rules are published, else exactly the old behaviour
  const SEC = window.OnlineSec ? OnlineSec.make({ db: () => db, uid: () => uid, mock: MOCK, initial: INITIAL, opts: { match: true, abandon: true },
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
    const PFX = 'backgammon-mockdb:';
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
    const write = fn => { fn(); setTimeout(fire, 0); };
    const disc = new Set();
    window.addEventListener('pagehide', () => { disc.forEach(p => setPath(p, null)); });
    let n = 0;
    return {
      on(path, cb) { const l = { path, cb, last: undefined }; listeners.add(l); setTimeout(fire, 0); return () => listeners.delete(l); },
      get: async p => getPath(p),
      set: async (p, v) => write(() => setPath(p, v)),
      update: async (p, v) => write(() => { for (const [k, x] of Object.entries(v)) setPath(p + '/' + k, x); }),
      remove: async p => write(() => setPath(p, null)),
      async txn(p, fn) { let out; write(() => { const cur = getPath(p); const nv = fn(cur === null ? null : JSON.parse(JSON.stringify(cur))); if (nv !== undefined) { setPath(p, nv); out = { committed: true, value: nv }; } else out = { committed: false, value: cur }; }); return out; },
      onDisconnectRemove: p => { disc.add(p); },
      cancelDisconnect: p => { disc.delete(p); },
      stamp: () => Date.now(),
      now: () => Date.now(),
      push: () => Date.now().toString(36) + (n++).toString(36) + Math.random().toString(36).slice(2, 6),
    };
  }

  // ---------------------------------------------------------------- auth
  // mock Google: one fake Google account per browser profile (localStorage); a tab is "signed in" through sessionStorage
  const MOCK_G = 'backgammon-mock-gacct', MOCK_UID = 'backgammon-mock-uid', MOCK_SIGNED = 'backgammon-mock-gsigned';
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
    await ensureKey();
  }
  const NAME_KEY = 'backgammon-online-name';
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
  async function push(d) { await init(); return db.update('sync/' + uid, { d, t: db.now() }); }   // update: keeps the dice key (k)

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
  // ---- stale records: a tab that vanished without its disconnect handler (crash, sleep, lost connection, failed delete) must not
  // leave a room / lobby entry / presence behind for good. Rooms and lobby entries carry hb (server time) rewritten by the owner
  // every LIVE_BEAT; older than LIVE_STALE = not listed / joined / matched. Records of older clients (no hb) are judged by
  // created / since with LEGACY_STALE. Dead records (a margin past the limits) are deleted by whoever sees them (the rules allow
  // that only for stale records), so leftovers in the database disappear the next time anyone opens the online lists.
  const LIVE_BEAT = 60000, LIVE_STALE = 180000, LEGACY_STALE = 3600000, PRES_GONE = 300000, POST_IDLE = 180000, SWEEP_MARGIN = 20000;
  const recOld = (x, base, now, margin) => {
    if (!x || typeof x !== 'object') return true;
    if (typeof x.hb === 'number') return now - x.hb > LIVE_STALE + margin;
    return typeof base === 'number' ? now - base > LEGACY_STALE + margin : true;
  };
  const roomStale = (r, now) => recOld(r, r && r.created, now == null ? db.now() : now, 0);
  const lobbyStale = (x, now) => recOld(x, x && x.since, now == null ? db.now() : now, 0);
  const roomDead = (r, now) => recOld(r, r && r.created, now, SWEEP_MARGIN) || (!r.game && typeof r.expires === 'number' && now - r.expires > 60000 + SWEEP_MARGIN);
  const lobbyDead = (x, now) => recOld(x, x && x.since, now, SWEEP_MARGIN);
  const presDead = (x, now) => !x || typeof x !== 'object' || typeof x.t !== 'number' || now - x.t > PRES_GONE + SWEEP_MARGIN;
  const swept = new Map();
  // delete the dead children of node (not my own live records); each path is tried at most every 5 min; returns v
  function sweep(node, v, dead) {
    if (!v || typeof v !== 'object' || !db || !(MOCK || secure())) return v;    // the old (legacy) rules do not allow these deletes
    const now = db.now();
    for (const [id, x] of Object.entries(v)) {
      if (node === 'rooms' ? id === roomCode : id === uid) continue;
      if (!dead(x, now)) continue;
      const p = node + '/' + id;
      if (swept.get(p) > now) continue;
      swept.set(p, now + 300000);
      db.remove(p).catch(() => {});
    }
    return v;
  }
  // leaving the page: drop the own live records right away (the disconnect handlers are the fallback, the staleness above the last resort)
  window.addEventListener('pagehide', () => {
    if (!db || !uid) return;
    try {
      if (roomCode) db.remove('rooms/' + roomCode).catch(() => {});
      if (lobbyState) db.remove('lobby/' + uid).catch(() => {});
      if (presOn) db.remove('presence/' + uid).catch(() => {});
    } catch (e) {}
  });
  // own heartbeats (transactions: never recreate a record that is gone)
  function lobbyBeat(st) {
    if (db.now() - (st.hbAt || st.since) < LIVE_BEAT) return;
    st.hbAt = db.now();
    db.txn('lobby/' + uid, cur => (cur === null ? null : Object.assign(cur, { hb: db.stamp() }))).catch(() => {});
  }
  let roomBeatAt = 0, roomIdle = null;
  function roomBeat() {
    if (db.now() - roomBeatAt < LIVE_BEAT) return;
    roomBeatAt = db.now();
    db.txn('rooms/' + roomCode, cur => (cur === null ? null : cur.host === uid ? Object.assign(cur, { hb: db.stamp() }) : undefined)).catch(() => {});
  }
  // delete the own room / lobby entry; the disconnect handler stays registered until the delete went through
  async function roomDrop(c) {
    try { await db.txn('rooms/' + c, cur => (cur === null ? null : cur.host === uid ? null : undefined)); db.cancelDisconnect('rooms/' + c); }
    catch (e) { console.warn(e); }
  }
  async function lobbyDrop() {
    const p = 'lobby/' + uid;
    try { await db.remove(p); db.cancelDisconnect(p); } catch (e) { console.warn(e); }
  }
  const listOf = v => Object.entries(v || {}).map(([id, x]) => ({ id, ...x, me: id === uid }));
  function watchPresence(cb) { return db.on('presence', v => cb(listOf(sweep('presence', v, presDead)).filter(x => x.me || presLive(x)).sort((a, b) => (b.rating || 0) - (a.rating || 0)))); }
  const roomExp = r => (typeof r.expires === 'number' ? r.expires : (typeof r.created === 'number' ? r.created : 0) + ROOM_TTL);
  const roomLive = (r, now) => { now = now == null ? db.now() : now; return !!r && !r.game && roomExp(r) > now && !roomStale(r, now); };
  function watchRooms(cb) {
    let last = null;
    const emit = () => cb(listOf(last).filter(r => !r.priv && !roomStale(r) && (r.game ? !!r.host : roomLive(r))).sort((a, b) => (a.game ? 1 : 0) - (b.game ? 1 : 0) || (a.created || 0) - (b.created || 0)));
    const off = db.on('rooms', v => { last = sweep('rooms', v, roomDead); emit(); });
    const iv = setInterval(() => { if (last) emit(); }, 15000);
    return () => { off(); clearInterval(iv); };
  }
  function watchLobby(cb) { return db.on('lobby', v => cb(listOf(sweep('lobby', v, lobbyDead)).filter(x => !x.game && (x.me || !lobbyStale(x))))); }

  // ---------------------------------------------------------------- Elo
  const kFactor = games => games < 10 ? 40 : games < 30 ? 32 : 24;
  function elo(my, opp, score, games) { const exp = 1 / (1 + Math.pow(10, (opp - my) / 400)); return Math.round(my + kFactor(games) * (score - exp)); }

  // ---------------------------------------------------------------- private dice key (one per player; never shown to anybody else)
  const KEY_P = 'backgammon-online-key:';
  let dkey = null;
  const chains = new Map();
  function rndHex() { const a = new Uint8Array(16); crypto.getRandomValues(a); return Array.from(a, b => b.toString(16).padStart(2, '0')).join(''); }
  // the key lives in this browser and in sync/<uid>/k (readable only by its owner), so a Google-linked player can finish a game on another device
  async function ensureKey() {
    let loc = null; try { loc = localStorage.getItem(KEY_P + uid); } catch (e) {}
    if (loc && !HEX.test(loc)) loc = null;
    let rem = null; try { rem = await db.get('sync/' + uid + '/k'); } catch (e) {}
    if (rem && HEX.test(rem)) dkey = rem;
    else {
      const k = loc || rndHex();
      try {
        const r = await db.txn('sync/' + uid, cur => { if (cur === null) return { d: '', t: db.now(), k }; if (cur.k && HEX.test(cur.k)) return; cur.k = k; return cur; });
        dkey = r.value && HEX.test(r.value.k || '') ? r.value.k : k;
      } catch (e) { console.warn(e); dkey = k; }
    }
    try { localStorage.setItem(KEY_P + uid, dkey); } catch (e) {}
    chains.clear();
  }
  function chainFor(gid) {
    const ck = uid + '|' + gid;
    if (chains.has(ck)) return chains.get(ck);
    const r = new Array(CHAIN_N + 1);
    r[CHAIN_N] = H(dkey + '|' + gid);
    for (let i = CHAIN_N; i > 0; i--) r[i - 1] = H(r[i]);
    chains.set(ck, r);
    return r;
  }

  // a new match's first game record
  function gameInit(gid, o) {
    const f = varOk(o.f) ? o.f : DEF_V, F = FORMATS[f];
    return { b: o.b, w: o.w, bn: o.bn, wn: o.wn, br: o.br, wr: o.wr, moves: '', status: 'play', rated: !!o.rated, f, ml: F.ml,
      cube: o.rated && f === 'g1' ? false : o.cube !== false, sc: [0, 0], cr: false, cu: false, gi: 0, mid: gid, mb: F.main, mw: F.main,
      room: o.room || null, host: o.host || null, created: db.stamp(), t: db.stamp() };
  }

  // ---------------------------------------------------------------- lobby & matchmaking (same format only)
  let lobbyUnsub = null, selfUnsub = null, matchTimer = 0, lobbyState = null;
  const windowFor = waitMs => Math.min(400, 100 + 50 * Math.floor(waitMs / 10000));
  async function enterLobby({ onList, onMatched, onStatus, v }) {
    await leave();
    setPresence('lobby');
    v = RATED.includes(v) ? v : DEF_V;
    const since = db.now();
    lobbyState = { since, onMatched, onStatus, v };
    await secPrepare(lobbyState);
    await db.set('lobby/' + uid, { name: profile.name, rating: profile.rating, v, since: db.stamp(), hb: db.stamp(), game: null });
    db.onDisconnectRemove('lobby/' + uid);
    lobbyUnsub = db.on('lobby', v => {
      const list = listOf(v).filter(x => x.me || !lobbyStale(x)).sort((a, b) => b.rating - a.rating);
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
    const st = lobbyState; if (st) lobbyBeat(st); if (!st || !st.list || st.busy) return;
    if (st.blocked) {
      st.busy = true;
      try { if (db.now() - (st.lastTry || 0) > 10000) { st.lastTry = db.now(); if (await SEC.resolve().catch(() => false)) { st.blocked = false; const p = await db.get('players/' + uid); if (p) { profile.rating = p.rating; await db.update('lobby/' + uid, { rating: p.rating }); } } } } finally { st.busy = false; }
      if (st.blocked) return;
    }
    const now = db.now(), myWait = now - st.since;
    const others = st.list.filter(x => !x.me && !x.game && !lobbyStale(x) && typeof x.rating === 'number' && x.v === st.v);
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
      const rec = gameInit(gid, { b: first, w: second, bn: names[first], wn: names[second], br: rates[first], wr: rates[second], f: st.v, rated: true });
      await (SEC ? SEC.createRated(gid, rec) : db.set('games/' + gid, rec));
      const r = await db.txn('lobby/' + best.id, cur => { if (cur === null) return null; if (cur.game) return; cur.game = gid; return cur; });
      if (r.committed && r.value && r.value.game === gid) await db.update('lobby/' + uid, { game: gid });
      else { await db.remove('games/' + gid); if (secure()) SEC.resolve().catch(() => {}); }   // the link points at nothing now: cleared
    } catch (e) { console.warn(e); skip.set(best.id, db.now() + 15000); } finally { if (lobbyState === st) st.busy = false; }
  }

  // ---------------------------------------------------------------- rooms (unrated; open = listed, priv = joined only with the code)
  // rooms/<code>.game = the first game (mid) of the match being played; the host follows the match game by game (nx)
  let roomCode = null, roomV = DEF_V, roomCube = true, roomPriv = false, roomExpires = 0, roomUnsub = null, roomTimer = 0, roomCbs = null;
  let roomMid = null, roomGame = null, roomG = null, roomGameUnsub = null, roomBusy = false;
  const roomListeners = new Set();
  const room = () => (roomCode ? { code: roomCode, priv: roomPriv, v: roomV, cube: roomCube, expires: roomExpires, left: Math.max(0, roomExpires - db.now()), game: roomMid } : null);
  const roomEmit = (ev, x) => roomListeners.forEach(f => { try { f(ev, room(), x); } catch (e) { console.warn(e); } });
  function onRoom(f) { roomListeners.add(f); return () => roomListeners.delete(f); }   // ev: open | closed | expired | gone | matched | reopen
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function roomAttach(code, d, cbs) {
    roomBeatAt = 0; roomIdle = null;
    roomCode = code; roomV = d.v; roomCube = d.cube !== false; roomPriv = !!d.priv; roomExpires = d.expires; roomCbs = cbs;
    if (!d.game) setPresence('room', { room: d.priv ? null : code });
    db.onDisconnectRemove('rooms/' + code);
    let seen = false;
    roomUnsub = db.on('rooms/' + code, v => {
      if (roomCode !== code) return;
      if (v && v.host === uid) {
        seen = true;
        if (typeof v.expires === 'number' && !v.game) roomExpires = v.expires;
        if (v.game && v.game !== roomMid) { roomWatchGame(v.game); const cb = roomCbs && roomCbs.onMatched; roomEmit('matched'); cb && cb(v.game); }
        else if (!v.game && roomMid) {
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
  async function createRoom({ onMatched, onExpired, priv, v, cube }) {
    v = varOk(v) ? v : DEF_V;
    await leave();
    for (let tries = 0; tries < 6; tries++) {
      const code = Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
      const expires = db.now() + ROOM_TTL;
      const r = await db.txn('rooms/' + code, cur => cur === null ? { host: uid, name: profile.name, rating: profile.rating, v, cube: cube !== false, created: db.stamp(), hb: db.stamp(), expires, game: null, guest: null, priv: !!priv } : undefined);
      if (!r.committed || !r.value || r.value.host !== uid || r.value.expires !== expires) continue;
      roomAttach(code, { v, cube: cube !== false, priv: !!priv, expires }, { onMatched, onExpired });
      return code;
    }
    throw new Error('room');
  }
  function roomCheck() {
    if (!roomCode) return;
    roomBeat();
    if (roomGame) {
      const g = roomG, gid = roomGame;
      if (g && matchOverG(g) && !g.post) {
        // nobody decides after the game (both idle / gone elsewhere): stop listing it as playing, reopen the room
        if (!roomIdle || roomIdle.gid !== gid) roomIdle = { gid, t: db.now() };
        else if (!g.again && db.now() - roomIdle.t > POST_IDLE) setPost(gid, 'timeout').catch(() => {});
        const guest = g.b === uid ? g.w : g.b;
        db.get('presence/' + guest).then(p => { if ((!p || !presLive(p)) && roomGame === gid) setPost(gid, 'left'); }).catch(() => {});
        if (g.again && db.now() - g.again.t > REMATCH_MS + 2000) expireRematch(gid);
      }
      return;
    }
    if (db.now() < roomExpires) return;
    const cb = roomCbs && roomCbs.onExpired;
    closeRoom('expired').then(() => cb && cb());
  }
  // follow the room's match: its games one after another (nx), the end of the match decides rematch / reopening
  function roomWatchGame(gid, keepMid) {
    roomGameUnsub && roomGameUnsub(); roomGameUnsub = null;
    if (!keepMid) roomMid = gid || null;
    roomGame = gid || null; roomG = null;
    if (!gid) return;
    roomGameUnsub = db.on('games/' + gid, g => {
      if (roomGame !== gid) return;
      roomG = g;
      if (g && g.nx && g.status === 'over' && !g.mo) { setTimeout(() => { if (roomGame === gid) roomWatchGame(g.nx, true); }, 0); return; }
      roomFollow(gid, g);
    });
  }
  async function roomFollow(gid, g) {
    if (roomBusy || roomGame !== gid || !roomCode || !g) return;
    const code = roomCode, mid = g.mid || gid;
    if (!matchOverG(g) || !g.post || g.next) return;
    roomBusy = true;
    try {
      if (g.post === 'again') {      // both agreed: a new match in the same room, the sides swapped
        const ngid = db.push('games');
        const me = { n: profile.name, r: profile.rating }, op = g.b === uid ? { n: g.wn, r: g.wr } : { n: g.bn, r: g.br };
        const B = g.w === uid ? me : op, W = g.w === uid ? op : me;
        await db.set('games/' + ngid, gameInit(ngid, { b: g.w, w: g.b, bn: B.n, wn: W.n, br: B.r, wr: W.r, f: g.f, cube: g.cube, rated: false, room: code, host: uid }));
        const r = await db.txn('rooms/' + code, cur => { if (cur === null) return null; if (cur.host !== uid || cur.game !== mid) return; cur.game = ngid; return cur; });
        if (r.committed && r.value && r.value.game === ngid) await db.update('games/' + gid, { next: ngid });
        else await db.remove('games/' + ngid);
      } else {
        await db.txn('rooms/' + code, cur => { if (cur === null) return null; if (cur.host !== uid || cur.game !== mid) return; cur.game = null; cur.guest = null; cur.gname = null; cur.expires = db.now() + ROOM_TTL; return cur; });
      }
    } catch (e) { console.warn(e); } finally {
      roomBusy = false;
      setTimeout(() => { if (roomGame === gid && roomG && roomG !== g) roomFollow(gid, roomG); }, 0);
    }
  }
  function roomEnd(keepDisc) {
    roomUnsub && roomUnsub(); roomUnsub = null; clearInterval(roomTimer); roomTimer = 0;
    roomWatchGame(null);
    if (roomCode && !keepDisc) db.cancelDisconnect('rooms/' + roomCode);
    roomCode = null; roomCbs = null; roomExpires = 0;
  }
  async function closeRoom(why) {
    if (!roomCode) return;
    const c = roomCode, gid = roomGame; roomEnd(true);
    if (gid) setPost(gid, 'host').catch(() => {});
    if (presOn && presState === 'room') setPresence('idle', { room: null });
    await roomDrop(c);
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
    await db.set('games/' + gid, gameInit(gid, { b: first, w: second, bn: names[first], wn: names[second], br: rates[first], wr: rates[second], f: rm.v, cube: rm.cube, rated: false, room: code, host: rm.host }));
    const r = await db.txn('rooms/' + code, cur => { if (cur === null) return null; if (!roomLive(cur) || cur.host !== rm.host) return; cur.game = gid; cur.guest = uid; cur.gname = profile.name; return cur; });
    if (!(r.committed && r.value && r.value.game === gid)) { await db.remove('games/' + gid); return null; }
    return gid;
  }
  const postable = (g, v) => g && !g.post && !g.next && g.room && !g.rated && (matchOverG(g) || v === 'host');
  const setPost = (gid, v) => db.txn('games/' + gid, g => { if (g === null) return null; if (!postable(g, v)) return; g.post = v; return g; });
  const requestRematch = gid => db.txn('games/' + gid, g => {
    if (g === null) return null; if (!postable(g)) return;
    if (g.again) { if (g.again.by === uid) return; g.post = 'again'; return g; }
    g.again = { by: uid, t: db.stamp() }; return g;
  });
  const answerRematch = (gid, yes) => db.txn('games/' + gid, g => { if (g === null) return null; if (!postable(g) || !g.again || g.again.by === uid) return; g.post = yes ? 'again' : 'no'; return g; });
  const expireRematch = gid => db.txn('games/' + gid, g => { if (g === null) return null; if (!postable(g) || !g.again || db.now() - g.again.t < REMATCH_MS) return; g.post = 'timeout'; return g; });

  // ---- spectating (open rooms only); the only write is watch/<mid>/<uid> = true
  let watchGid = null;
  async function roomGameOf(code) {
    code = normCode(code);
    const rm = code ? await db.get('rooms/' + code) : null;
    return rm && !rm.priv && rm.game && rm.host !== uid && rm.guest !== uid ? rm.game : null;
  }
  function watchUnmark() { if (!watchGid) return; const p = 'watch/' + watchGid + '/' + uid; watchGid = null; db.cancelDisconnect(p); db.remove(p).catch(() => {}); }
  function spectate(gid, cb, mid) {
    setPresence('watch', { room: null });
    mid = mid || gid;
    if (watchGid !== mid) {
      watchUnmark(); watchGid = mid;
      db.set('watch/' + mid + '/' + uid, true).then(() => { if (watchGid === mid) db.onDisconnectRemove('watch/' + mid + '/' + uid); }).catch(() => {});
    }
    const off = db.on('games/' + gid, cb);
    return keep => { off(); if (!keep && watchGid === mid) watchUnmark(); };
  }
  const watchCount = (gid, cb) => db.on('watch/' + gid, v => cb(Object.keys(v || {}).length));

  async function leaveLobby() {
    clearInterval(matchTimer); matchTimer = 0;
    lobbyUnsub && lobbyUnsub(); selfUnsub && selfUnsub(); lobbyUnsub = selfUnsub = null;
    if (lobbyState) { lobbyState = null; await lobbyDrop(); if (presOn && presState === 'lobby') setPresence(roomCode ? 'room' : 'idle', { room: roomCode && !roomPriv ? roomCode : null }); }
  }
  async function leave(keepMatched) {
    if (!keepMatched && presOn) setPresence('idle', { room: null });
    clearInterval(matchTimer); matchTimer = 0;
    lobbyUnsub && lobbyUnsub(); selfUnsub && selfUnsub(); lobbyUnsub = selfUnsub = null;
    if (lobbyState) { lobbyState = null; await lobbyDrop(); }
    if (roomCode) { const c = roomCode, gid = roomGame; roomEnd(true); if (gid) setPost(gid, 'host').catch(() => {}); await roomDrop(c); roomEmit('closed'); }
  }

  // ---------------------------------------------------------------- games
  function watchGame(gid, cb) { setPresence('play', { room: null }); if (SEC) SEC.join(gid); return db.on('games/' + gid, cb); }
  // the actor pays the time since g.t beyond the free DELAY. false = its flag has already fallen
  function charge(g, s) {
    const m = mainOf(g, s), el = Math.max(0, db.now() - (g.t || db.now())), used = Math.max(0, el - DELAY);
    if (used > m + 1000) return false;
    g['m' + SK(s)] = Math.max(0, m - used);
    return true;
  }
  // a game decided on the board (or by a drop / accepted resignation): score, and whether the match is over too
  function finish(g, st) {
    const sc = (Array.isArray(g.sc) ? g.sc : [0, 0]).slice(); sc[st.winner] += st.points;
    g.status = 'over'; g.win = st.winner; g.pts = st.points; g.after = sc;
    g.why = st.dropped ? 'drop' : st.resigned ? 'resign' : st.kind >= 3 ? 'bg' : st.kind === 2 ? 'gammon' : 'single';
    g.mo = !g.ml || sc[0] >= g.ml || sc[1] >= g.ml;
    if (g.mo) g.mwin = st.winner;
    g.ro = null;
  }
  // publish my chain commitment for this game
  const commit = gid => db.txn('games/' + gid, g => {
    if (g === null) return null;
    const s = sideNo(g, uid); if (s < 0 || g.status !== 'play') return;
    const ch = g.ch || {}; if (ch[SK(s)]) return;
    ch[SK(s)] = chainFor(gid)[0]; g.ch = ch; return g;
  });
  // reveal my part of the roll in play: opening (both at once), the mover's roll, the opponent's part after the mover's
  const reveal = gid => db.txn('games/' + gid, g => {
    if (g === null) return null;
    const s = sideNo(g, uid); if (s < 0 || g.status !== 'play') return;
    const R = replay(g); if (!R.ok) return;
    const ok = (R.phase === 'open' && R.need.includes(s)) || (R.phase === 'roll' && R.mover === s) || (R.phase === 'reveal' && R.actor === s);
    if (!ok || R.idx > CHAIN_N) return;
    const k = s ? 'kw' : 'kb', cur = String(g[k] || '');
    if (cur.length !== (R.idx - 1) * 32) return;
    if (R.phase !== 'open') { if (!charge(g, s)) return; g.t = db.stamp(), g.lm = uid; }
    g[k] = cur + chainFor(gid)[R.idx];
    if (R.phase === 'open' && replay(g).phase !== 'open') g.t = db.stamp(), g.lm = uid;   // the opening roll is decided: the first turn starts
    return g;
  });
  // append one action of mine (record-format token: "<dice><moves>", d, k, p); len = actions I have seen (no double sends)
  async function act(gid, len, tok) {
    const r = await db.txn('games/' + gid, g => {
      if (g === null) return null;
      const s = sideNo(g, uid); if (s < 0 || g.status !== 'play') return;
      const R = replay(g); if (!R.ok || R.actions.length !== len) return;
      if (tok === 'd') { if (R.phase !== 'roll' || R.mover !== s || !window.BG.cubeAvailable(R.st, cubeCtx(g, R.st, s), s)) return; }
      else if (tok === 'k' || tok === 'p') { if (R.phase !== 'take' || R.actor !== s) return; }
      else if (/^[1-6]{2}([A-Z]{2})*$/.test(tok)) { if (R.phase !== 'move' || R.mover !== s || !sameDice(R.dice, [+tok[0], +tok[1]])) return; }
      else return;
      const moves = String(g.moves || ''), nm = moves ? moves + '-' + tok : tok;
      const R2 = replay(Object.assign({}, g, { moves: nm })); if (!R2.ok || R2.actions.length !== len + 1) return;
      if (!charge(g, s)) return;
      g.moves = nm; g.t = db.stamp(), g.lm = uid; g.ro = null;
      if (R2.st.over) finish(g, R2.st);
      return g;
    });
    return r.committed;
  }
  // resignation of this game for n points × cube (1 single, 2 gammon, 3 backgammon): offered, the opponent accepts or declines
  const offerResign = (gid, n) => db.txn('games/' + gid, g => {
    if (g === null) return null;
    const s = sideNo(g, uid); if (s < 0 || g.status !== 'play' || (g.ro && g.ro.by) || ![1, 2, 3].includes(n)) return;
    g.ro = { by: uid, n }; return g;
  });
  const answerResign = (gid, yes) => db.txn('games/' + gid, g => {
    if (g === null) return null;
    const s = sideNo(g, uid); if (s < 0 || g.status !== 'play' || !g.ro || g.ro.by === uid || !g.ro.by) return;
    if (yes) {
      const tok = (s === 0 ? 'x' : 'y') + g.ro.n, moves = String(g.moves || ''), nm = moves ? moves + '-' + tok : tok;
      const R2 = replay(Object.assign({}, g, { moves: nm })); if (!R2.ok || !R2.st.over) return;
      g.moves = nm; g.t = db.stamp(), g.lm = uid; finish(g, R2.st);
    }
    g.ro = null; return g;
  });
  // forfeit the whole match
  const resign = gid => db.txn('games/' + gid, g => { if (g === null) return null; if (g.status !== 'play' || sideNo(g, uid) < 0) return; g.status = 'resign'; g.loser = uid; g.ro = null; return g; });
  const claimTimeout = (gid, oppUid) => db.txn('games/' + gid, g => {
    if (g === null) return null;
    if (g.status !== 'play') return;
    const so = sideNo(g, oppUid); if (so < 0) return;
    const R = replay(g); if (R.actor !== so || clockOf(g, so, true, db.now()).left > -GRACE) return;
    g.status = 'timeout'; g.loser = oppUid; g.ro = null; return g;
  });
  // the opponent left (no presence) while we wait for them: after ABANDON_MS the player still here wins
  async function claimAbandon(gid, oppUid) {
    if (await db.get('presence/' + oppUid)) return { committed: false };
    return db.txn('games/' + gid, g => {
      if (g === null) return null;
      if (g.status !== 'play' || db.now() - (g.t || 0) < ABANDON_MS) return;
      const so = sideNo(g, oppUid), R = replay(g); if (so < 0 || !R.need.includes(so) || R.need.includes(1 - so)) return;
      g.status = 'abandon'; g.loser = oppUid; g.ro = null; return g;
    });
  }
  // the next game of an unfinished match (either player may write it: the record is the same whoever does)
  async function nextGame(gid) {
    const r = await db.txn('games/' + gid, g => { if (g === null) return null; if (g.status !== 'over' || g.mo || g.nx || sideNo(g, uid) < 0) return; g.nx = (g.mid || gid) + '_' + ((g.gi || 0) + 1); return g; });   // a fixed id: whoever writes it, it is the same game
    const g = r.value;
    if (!g || !g.nx || g.status !== 'over' || g.mo) return null;
    const ngid = g.nx, sc = Array.isArray(g.after) ? g.after.slice() : [0, 0], ml = g.ml || 0;
    const cr = ml > 0 && !g.cu && !g.cr && (sc[0] === ml - 1 || sc[1] === ml - 1);
    const rec = { b: g.b, w: g.w, bn: g.bn, wn: g.wn, br: g.br, wr: g.wr, moves: '', status: 'play', rated: !!g.rated, f: g.f, ml, cube: !!g.cube,
      sc, cr, cu: !!(g.cu || g.cr), gi: (g.gi || 0) + 1, mid: g.mid || gid, pv: gid, mb: mainOf(g, 0), mw: mainOf(g, 1), room: g.room || null, host: g.host || null, created: db.stamp(), t: db.stamp() };
    if (secure() && g.rated) {    // a rated match: the next game takes over both players' link (open/<uid>) in the same write
      if (!(await db.get('games/' + ngid))) await db.update('/', { ['games/' + ngid]: rec, ['open/' + g.b]: ngid, ['open/' + g.w]: ngid }).catch(e => console.warn(e));   // the other player may have written it first
    } else await db.txn('games/' + ngid, cur => cur === null ? rec : undefined);
    return ngid;
  }

  // secure protocol: my own result of a match whose last game ended on the board (null: not finished by my replay → disputed)
  function secOwn(g) {
    const R = replay(g); if (!R.ok || !R.st || !R.st.over) return null;
    const sc = (Array.isArray(g.sc) ? g.sc : [0, 0]).slice(); sc[R.st.winner] += R.st.points;
    if (g.ml && sc[0] < g.ml && sc[1] < g.ml) return null;        // the match is not over by my count
    return R.st.winner === sideNo(g, uid) ? 1 : 0;
  }
  // the history entry of a settled rated match (same fields as below; keyed by the match id)
  function secDecorate(np, p, G, s, nr) {
    const hist = Array.isArray(p.hist) ? p.hist.slice() : (p.hist && typeof p.hist === 'object' ? Object.values(p.hist) : []);
    const opp = G.b === uid ? G.wr : G.br, oppName = G.b === uid ? G.wn : G.bn;
    hist.push({ g: G.mid || np.last, t: db.now(), v: G.f || DEF_V, o: String(oppName || '?').slice(0, 16), or: typeof opp === 'number' ? opp : INITIAL, s, d: nr - p.rating, r: nr, why: G.status === 'over' ? (G.why || 'single') : G.status });
    np.hist = hist.slice(-HIST_N);
  }
  // apply a finished match to players/<uid> once (match id kept in `last` and in the history, so a reload / resume never counts twice).
  // Rated matches: Elo + a history entry { g, t, v (format), o (opponent), or, s (1 / 0), d, r, why }.
  // own: my own view of a game that ended on the board (null = not finished here → disputed). Secure protocol: OnlineSec settles
  // the linked game (both reports must agree; resign / timeout / abandon / agreed draw are decided by the record itself).
  async function applyResult(mid, game, score, own) {
    if (secure()) {      // the link (open/<uid>) points at the match's current game record, which carries the result
      const op = await db.get('open/' + uid);
      const gid = op && (op === mid || (await db.get('games/' + op + '/mid')) === mid) ? op : (game && game.mid === mid && game.gi ? mid + '_' + game.gi : mid);
      const G = (await db.get('games/' + gid)) || game;
      const r = await SEC.settle(gid, G, G && G.status === 'over' ? (own === undefined ? secOwn(G) : own) : score);
      if (r.rated) profile = (await db.get('players/' + uid)) || profile;
      return r;
    }
    const opp = game.b === uid ? game.wr : game.br, oppName = game.b === uid ? game.wn : game.bn;
    let out = { old: profile.rating, now: profile.rating, rated: !!game.rated };
    const r = await db.txn('players/' + uid, p => {
      if (p === null) return null;
      const hist = Array.isArray(p.hist) ? p.hist : (p.hist && typeof p.hist === 'object' ? Object.values(p.hist) : []);
      if (p.last === mid || hist.some(h => h && h.g === mid)) return;
      if (typeof p.rating !== 'number') p.rating = INITIAL;
      const old = p.rating, nr = game.rated ? elo(p.rating, typeof opp === 'number' ? opp : INITIAL, score, p.games || 0) : p.rating;
      p.rating = nr; p.games = (p.games || 0) + (game.rated ? 1 : 0);
      if (game.rated) {
        if (score === 1) p.wins = (p.wins || 0) + 1; else p.losses = (p.losses || 0) + 1;
        hist.push({ g: mid, t: db.now(), v: game.f || DEF_V, o: String(oppName || '?').slice(0, 16), or: typeof opp === 'number' ? opp : INITIAL, s: score, d: nr - old, r: nr, why: game.status === 'over' ? (game.why || 'single') : game.status });
      }
      p.hist = hist.slice(-HIST_N);
      p.last = mid; return p;
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

  window.BgOnline = {
    CHAT_N, CHAT_LEN, CHAT_GAP, watchChat, sendChat,
    available: !!CFG || MOCK, configured: !!CFG, mock: MOCK, INITIAL, FORMATS, VARIANTS, RATED, DEF_V, DELAY, GRACE, ABANDON_MS, ROOM_TTL, REMATCH_MS, HIST_N,
    clockOf, replay, sideNo, cubeCtx, matchOverG, cleanName, defaultName, localName,
    get room() { return db ? room() : null; },
    getGame: gid => db.get('games/' + gid),
    init, setName, setPresence, watchPresence, watchRooms, watchLobby, enterLobby, createRoom, joinRoom, leave, leaveLobby, closeRoom, extendRoom, onRoom,
    setPost, requestRematch, answerRematch, expireRematch, roomGameOf, spectate, watchCount,
    winnerOf, history, watchGame, commit, reveal, act, offerResign, answerResign, resign, claimTimeout, claimAbandon, nextGame, applyResult, presenceOf: u => db.get('presence/' + u), topPlayers, elo,
    account, google, logout, onAuth, pull, push,
    get uid() { return uid; }, get profile() { return profile; }, get ready() { return !!(db && uid && profile && dkey); }, now: () => (db ? db.now() : Date.now()),
    get secure() { return secure(); }, secMsg: k => (window.OnlineSec ? OnlineSec.msg(k) : ''),
  };
})();
