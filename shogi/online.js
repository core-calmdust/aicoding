// Online play for Shogi: lobby, Elo rating, rating-based matchmaking, private rooms.
// Moves are USI strings, stored in games/<gid>/moves as one space-separated string.
// Backend: Firebase (anonymous auth + Realtime Database) when window.FIREBASE_CONFIG is set,
// or an in-browser mock (localStorage, shared between tabs) with ?mock=1 for testing.
(function () {
  'use strict';
  const CFG = window.FIREBASE_CONFIG || null;
  const MOCK = new URLSearchParams(location.search).has('mock');
  const FB_VER = '10.12.2';
  const INITIAL = 1500;
  const MOVE_LIMIT = 90 * 1000;          // legacy games (records without tc): fixed 90 s per move
  // time controls: main time (ms) is used up first, then every move must be made within byo (byoyomi)
  const TC = { fast: { main: 5 * 60000, byo: 30000 }, long: { main: 10 * 60000, byo: 30000 }, blitz: { main: 0, byo: 30000 } };
  const TC_IDS = ['fast', 'long', 'blitz'];
  const LEGACY = { main: 0, byo: MOVE_LIMIT };
  const GRACE = 3000;                    // latency allowance before the opponent may claim a timeout
  const CROSS_WAIT = 20000;
  const ROOM_TTL = 10 * 60000;           // a room nobody joins expires after 10 min (the host's 「部屋を表示」 restarts the timer)              // after this wait, players with a different time control may be matched (played as 'fast')
  const tcOf = g => (g && TC[g.tc]) || LEGACY;
  const sideOf = (g, u) => (g.b === u ? 'b' : 'w');
  const mainOf = (g, side) => { const v = g && g['m' + side]; return typeof v === 'number' ? Math.max(0, v) : tcOf(g).main; };
  const tcFields = tc => (TC[tc] ? { tc, mb: TC[tc].main, mw: TC[tc].main } : {});
  const tcDist = (a, b) => (a === b ? 0 : a === 'fast' || b === 'fast' ? 1 : 2);   // fast is "between" long and blitz
  const tcMerge = (a, b) => (a === b ? a : 'fast');
  // clock of one side ('b' / 'w'); moving = it is this side's turn (time since g.t is running)
  function clockOf(g, side, moving, now) {
    const c = tcOf(g), m = mainOf(g, side);
    if (!moving) return { main: m, byo: m > 0 ? null : c.byo, left: m + c.byo, moving: false };
    const el = Math.max(0, (now == null ? (db ? db.now() : Date.now()) : now) - (g.t || now || Date.now()));
    const main = Math.max(0, m - el);
    return { main, byo: main > 0 ? null : m + c.byo - el, left: m + c.byo - el, moving: true };
  }
  let db = null, uid = null, profile = null, ready = null;

  // ---------------------------------------------------------------- backend adapters
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }

  function firebaseDB() {
    const f = firebase.database();
    let offset = 0;
    f.ref('.info/serverTimeOffset').on('value', s => { offset = s.val() || 0; });
    return {
      on(path, cb) { const r = f.ref(path), h = s => cb(s.val()); r.on('value', h); return () => r.off('value', h); },
      get: async p => (await f.ref(p).get()).val(),
      set: (p, v) => f.ref(p).set(v),
      update: (p, v) => f.ref(p).update(v),
      remove: p => f.ref(p).remove(),
      async txn(p, fn) { const r = await f.ref(p).transaction(fn); return { committed: r.committed, value: r.snapshot.val() }; },
      onDisconnectRemove: p => f.ref(p).onDisconnect().remove(),
      cancelDisconnect: p => f.ref(p).onDisconnect().cancel(),
      stamp: () => firebase.database.ServerValue.TIMESTAMP,
      now: () => Date.now() + offset,
      push: p => f.ref(p).push().key,
    };
  }

  // in-browser mock with the same surface (tree in localStorage, change events across tabs)
  function mockDB() {
    // sharded by the first two path segments (e.g. "players/<uid>") so that tabs writing different records do not overwrite each other
    const PFX = 'shogi-mockdb:';
    const parts = p => p.split('/').filter(Boolean);
    const shardOf = ks => PFX + ks.slice(0, 2).join('/');
    const readKey = k => { try { const v = localStorage.getItem(k); return v === null ? null : JSON.parse(v); } catch (e) { return null; } };
    function getPath(p) {
      const ks = parts(p);
      if (ks.length < 2) {     // aggregate children
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

  async function init() {
    if (ready) return ready;
    ready = (async () => {
      if (MOCK) {
        db = mockDB();
        uid = sessionStorage.getItem('shogi-mock-uid') || ('u' + Math.random().toString(36).slice(2, 10));
        sessionStorage.setItem('shogi-mock-uid', uid);
      } else {
        const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
        await loadScript(base + 'firebase-app-compat.js');
        await Promise.all([loadScript(base + 'firebase-auth-compat.js'), loadScript(base + 'firebase-database-compat.js')]);
        if (!firebase.apps.length) firebase.initializeApp(CFG);
        const cred = await firebase.auth().signInAnonymously();
        uid = cred.user.uid;
        db = firebaseDB();
      }
      profile = await db.get('players/' + uid);
      if (profile && typeof profile.rating !== 'number') profile = Object.assign({ games: 0, wins: 0, losses: 0, draws: 0 }, profile, { name: cleanName(profile.name), rating: INITIAL });
      if (profile && profile.rating === INITIAL && !profile.games) await db.update('players/' + uid, profile);
      if (!profile) {
        profile = { name: defaultName(), rating: INITIAL, games: 0, wins: 0, losses: 0, draws: 0 };
        await db.set('players/' + uid, profile);
      }
      return { uid, profile };
    })();
    ready.catch(() => { ready = null; });
    return ready;
  }
  function defaultName() { try { const n = localStorage.getItem('shogi-online-name'); if (n) return n; } catch (e) {} return 'Player' + Math.floor(1000 + Math.random() * 9000); }
  const cleanName = s => String(s || '').replace(/[<>&"']/g, '').trim().slice(0, 16) || defaultName();

  async function setName(name) {
    name = cleanName(name); profile.name = name; if (presOn) db.update('presence/' + uid, { name });
    try { localStorage.setItem('shogi-online-name', name); } catch (e) {}
    await db.update('players/' + uid, { name });
    return name;
  }

  // ---------------------------------------------------------------- presence (who is online and what they are doing)
  let presOn = false, presState = 'idle';
  async function setPresence(st, extra) {
    if (!db || !uid) return;
    presState = st || presState;
    const v = Object.assign({ name: profile.name, rating: profile.rating, st: presState, t: db.stamp() }, extra || {});
    await db.set('presence/' + uid, v);
    if (!presOn) { db.onDisconnectRemove('presence/' + uid); presOn = true; }
  }
  const listOf = (v, me) => Object.entries(v || {}).map(([id, x]) => ({ id, ...x, me: id === uid }));
  function watchPresence(cb) { return db.on('presence', v => cb(listOf(v).sort((a, b) => (b.rating || 0) - (a.rating || 0)))); }
  // a room is usable while nobody joined it and it has not expired (expires; old records: created + ROOM_TTL). Lists hide expired rooms even if the host vanished without cleanup
  const roomExp = r => (typeof r.expires === 'number' ? r.expires : (typeof r.created === 'number' ? r.created : 0) + ROOM_TTL);
  const roomLive = (r, now) => !!r && !r.game && roomExp(r) > (now == null ? db.now() : now);
  function watchRooms(cb) {
    let last = null;
    const emit = () => cb(listOf(last).filter(r => !r.priv && roomLive(r)).sort((a, b) => (a.created || 0) - (b.created || 0)));
    const off = db.on('rooms', v => { last = v; emit(); });
    const iv = setInterval(() => { if (last) emit(); }, 15000);     // drop rooms that expire while nothing changes
    return () => { off(); clearInterval(iv); };
  }
  function watchLobby(cb) { return db.on('lobby', v => cb(listOf(v).filter(x => !x.game))); }

  // ---------------------------------------------------------------- Elo
  const kFactor = games => games < 10 ? 40 : games < 30 ? 32 : 24;
  function elo(my, opp, score, games) {    // score: 1 win, .5 draw, 0 loss
    const exp = 1 / (1 + Math.pow(10, (opp - my) / 400));
    return Math.round(my + kFactor(games) * (score - exp));
  }

  // ---------------------------------------------------------------- lobby & matchmaking
  let lobbyUnsub = null, selfUnsub = null, matchTimer = 0, lobbyState = null;
  // window of acceptable rating difference grows with waiting time
  const windowFor = waitMs => Math.min(400, 100 + 50 * Math.floor(waitMs / 10000));

  async function enterLobby({ onList, onMatched, onStatus, tc }) {
    await leave();       // searching for a rated game closes the own room (so two games can not start at once)
    setPresence('lobby');
    const since = db.now();
    tc = TC[tc] ? tc : 'fast';
    lobbyState = { since, onMatched, onStatus, tc };
    await db.set('lobby/' + uid, { name: profile.name, rating: profile.rating, tc, since: db.stamp(), game: null });
    db.onDisconnectRemove('lobby/' + uid);
    lobbyUnsub = db.on('lobby', v => {
      const list = Object.entries(v || {}).map(([id, x]) => ({ id, ...x, me: id === uid })).sort((a, b) => b.rating - a.rating);
      lobbyState && (lobbyState.list = list);
      onList && onList(list);
    });
    selfUnsub = db.on('lobby/' + uid + '/game', gid => { if (gid && lobbyState) { const cb = lobbyState.onMatched; leave(true); cb(gid); } });
    matchTimer = setInterval(tryMatch, 2000);
    setTimeout(tryMatch, 600);
  }
  async function tryMatch() {
    const st = lobbyState; if (!st || !st.list || st.busy) return;
    const now = db.now(), myWait = now - st.since;
    const others = st.list.filter(x => !x.me && !x.game && typeof x.rating === 'number');
    // same time control first; once both have waited CROSS_WAIT, nearer controls, then farther ones; closest rating within each
    let best = null;
    for (const o of others) {
      if (!TC[o.tc]) continue;                // old clients without time control support
      const oWait = now - (o.since || now), dist = tcDist(st.tc, o.tc);
      if (dist && (myWait < CROSS_WAIT || oWait < CROSS_WAIT)) continue;
      const w = windowFor(Math.max(myWait, oWait));
      const d = Math.abs(o.rating - profile.rating), key = dist * 1e6 + d;
      if (d <= w && (!best || key < best.key)) best = { ...o, d, key };
    }
    st.onStatus && st.onStatus({ waiting: others.length, same: others.filter(o => o.tc === st.tc).length, window: windowFor(myWait), wait: myWait, tc: st.tc, crossIn: Math.max(0, CROSS_WAIT - myWait) });
    if (!best || uid > best.id) return;        // the smaller uid starts the game so both sides do not create one
    st.busy = true;
    try {
      const gid = db.push('games');
      const black = Math.random() < 0.5 ? uid : best.id, white = black === uid ? best.id : uid;
      const names = { [uid]: profile.name, [best.id]: best.name }, rates = { [uid]: profile.rating, [best.id]: best.rating };
      await db.set('games/' + gid, { b: black, w: white, bn: names[black], wn: names[white], br: rates[black], wr: rates[white], moves: '', status: 'play', rated: true, ...tcFields(tcMerge(st.tc, best.tc)), created: db.stamp(), t: db.stamp() });
      const r = await db.txn('lobby/' + best.id, cur => { if (cur === null) return null; if (cur.game) return; cur.game = gid; return cur; });
      if (r.committed && r.value && r.value.game === gid) await db.update('lobby/' + uid, { game: gid });
      else await db.remove('games/' + gid);
    } finally { if (lobbyState === st) st.busy = false; }
  }

  // ---------------------------------------------------------------- rooms (unrated): open = listed under rooms, priv (closed) = joined only with the code (the key)
  // The room lives on until the host closes it (closeRoom), someone joins (onMatched), it expires (ROOM_TTL, deleted by the host's client)
  // or the host disconnects (onDisconnect). Closing the online dialog does not touch it.
  let roomCode = null, roomTc = null, roomPriv = false, roomTitle = '', roomExpires = 0, roomUnsub = null, roomTimer = 0, roomCbs = null;
  const roomListeners = new Set();
  const roomEmit = ev => roomListeners.forEach(f => { try { f(ev, room()); } catch (e) { console.warn(e); } });
  function onRoom(f) { roomListeners.add(f); return () => roomListeners.delete(f); }   // ev: 'open' | 'extend' | 'closed' | 'expired' | 'gone' | 'matched'
  const room = () => (roomCode ? { code: roomCode, priv: roomPriv, title: roomTitle, tc: roomTc, expires: roomExpires, left: Math.max(0, roomExpires - db.now()) } : null);
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  async function createRoom({ onMatched, onExpired, priv, tc, title }) {
    title = String(title || '').replace(/\s+/g, ' ').trim().slice(0, 24);
    tc = TC[tc] ? tc : 'fast';
    await leave();
    for (let tries = 0; tries < 6; tries++) {
      const code = Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
      const expires = db.now() + ROOM_TTL;
      const r = await db.txn('rooms/' + code, cur => cur === null ? { host: uid, name: profile.name, rating: profile.rating, tc, created: db.stamp(), expires, game: null, priv: !!priv, title } : undefined);
      if (!r.committed || !r.value || r.value.host !== uid || r.value.expires !== expires) continue;
      roomCode = code; roomTc = tc; roomPriv = !!priv; roomTitle = title; roomExpires = expires; roomCbs = { onMatched, onExpired };
      setPresence('room', { room: priv ? null : code });
      db.onDisconnectRemove('rooms/' + code);
      let seen = false;
      roomUnsub = db.on('rooms/' + code, v => {
        if (roomCode !== code) return;
        if (v && v.host === uid) { seen = true; if (v.game) { const cb = roomCbs.onMatched; roomEnd(); db.remove('rooms/' + code); roomEmit('matched'); cb && cb(v.game); } return; }
        if (seen || v) { roomEnd(); if (!v) roomEmit('gone'); }       // deleted elsewhere (e.g. another tab) or taken over after expiry
      });
      roomTimer = setInterval(roomCheck, 5000);
      roomEmit('open');
      return code;
    }
    throw new Error('room');
  }
  function roomCheck() {
    if (!roomCode || db.now() < roomExpires) return;
    const cb = roomCbs && roomCbs.onExpired;
    closeRoom('expired').then(() => cb && cb());
  }
  // stop watching the own room (does not delete it)
  function roomEnd() {
    roomUnsub && roomUnsub(); roomUnsub = null; clearInterval(roomTimer); roomTimer = 0;
    if (roomCode) db.cancelDisconnect('rooms/' + roomCode);
    roomCode = null; roomCbs = null; roomExpires = 0;
  }
  // delete the own room (部屋を閉じる / expiry)
  async function closeRoom(why) {
    if (!roomCode) return;
    const c = roomCode; roomEnd();
    if (presOn && presState === 'room') setPresence('idle', { room: null });
    await db.txn('rooms/' + c, cur => (cur === null ? null : cur.host === uid && !cur.game ? null : undefined));
    roomEmit(why === 'expired' ? 'expired' : 'closed');
  }
  // restart the expiry timer (the host looked at the room again)
  async function extendRoom() {
    if (!roomCode) return;
    roomExpires = db.now() + ROOM_TTL;
    await db.update('rooms/' + roomCode, { expires: roomExpires });
    roomEmit('extend');
  }
  async function joinRoom(code) {
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!code) return null;
    const rm = await db.get('rooms/' + code);
    if (!roomLive(rm) || rm.host === uid) return null;
    await leave();
    const gid = db.push('games');
    const black = Math.random() < 0.5 ? uid : rm.host, white = black === uid ? rm.host : uid;
    const names = { [uid]: profile.name, [rm.host]: rm.name }, rates = { [uid]: profile.rating, [rm.host]: rm.rating };
    await db.set('games/' + gid, { b: black, w: white, bn: names[black], wn: names[white], br: rates[black], wr: rates[white], moves: '', status: 'play', rated: false, ...tcFields(rm.tc), created: db.stamp(), t: db.stamp() });
    const r = await db.txn('rooms/' + code, cur => { if (cur === null) return null; if (!roomLive(cur) || cur.host !== rm.host) return; cur.game = gid; return cur; });
    if (!(r.committed && r.value && r.value.game === gid)) { await db.remove('games/' + gid); return null; }
    return gid;
  }

  // cancel the rated-game search only (closing the online dialog)
  async function leaveLobby() {
    clearInterval(matchTimer); matchTimer = 0;
    lobbyUnsub && lobbyUnsub(); selfUnsub && selfUnsub();
    lobbyUnsub = selfUnsub = null;
    if (lobbyState) { lobbyState = null; db.cancelDisconnect('lobby/' + uid); await db.remove('lobby/' + uid); if (presOn && presState === 'lobby') setPresence(roomCode ? 'room' : 'idle', { room: roomCode && !roomPriv ? roomCode : null }); }
  }
  // leave the lobby and close the own room (before searching / creating / joining; keepMatched = a game was found, keep presence)
  async function leave(keepMatched) {
    if (!keepMatched && presOn) setPresence('idle', { room: null });
    clearInterval(matchTimer); matchTimer = 0;
    lobbyUnsub && lobbyUnsub(); selfUnsub && selfUnsub();
    lobbyUnsub = selfUnsub = null;
    if (lobbyState) { lobbyState = null; db.cancelDisconnect('lobby/' + uid); await db.remove('lobby/' + uid); }
    if (roomCode) { const c = roomCode; roomEnd(); await db.txn('rooms/' + c, cur => (cur === null ? null : cur.host === uid && !cur.game ? null : undefined)); roomEmit('closed'); }
  }

  // ---------------------------------------------------------------- games
  const USI_RE = /^([1-9][a-i][1-9][a-i]\+?|[PLNSBRG]\*[1-9][a-i])$/;
  const moveCount = s => (s ? String(s).split(' ').filter(Boolean).length : 0);
  function watchGame(gid, cb) { setPresence('play', { room: null }); return db.on('games/' + gid, cb); }
  // the sender is the side to move: subtract the time since the last move from its main time.
  // false = it already used main + byoyomi (the move is refused and the opponent may claim the win)
  function chargeClock(g) {
    if (!TC[g.tc]) return true;            // legacy record: fixed per-move limit, nothing to store
    const side = sideOf(g, uid), m = mainOf(g, side), el = Math.max(0, db.now() - (g.t || db.now()));
    if (el > m + TC[g.tc].byo + 1000) return false;
    g['m' + side] = Math.max(0, m - el);
    return true;
  }
  // append a move; n = number of moves already played (guards against double sends / races)
  async function sendMove(gid, n, usi) {
    if (!USI_RE.test(usi)) return false;
    const r = await db.txn('games/' + gid, g => {
      if (g === null) return null;
      if (g.status !== 'play' || moveCount(g.moves) !== n) return;
      g.moves = g.moves ? g.moves + ' ' + usi : usi; if (!chargeClock(g)) return; g.t = db.stamp(); return g;
    });
    return r.committed;
  }
  const resign = gid => db.txn('games/' + gid, g => { if (g === null) return null; if (g.status !== 'play') return; g.status = 'resign'; g.loser = uid; return g; });
  const claimTimeout = (gid, oppUid) => db.txn('games/' + gid, g => { if (g === null) return null; if (g.status !== 'play' || db.now() - g.t < (TC[g.tc] ? mainOf(g, sideOf(g, oppUid)) + TC[g.tc].byo + GRACE : MOVE_LIMIT)) return; g.status = 'timeout'; g.loser = oppUid; return g; });
  // game ended on the board (mate, repetition, ...): win = winning colour (0 sente, 1 gote) or -1 for a draw; n = moves played
  const markOver = (gid, win, reason, n) => db.txn('games/' + gid, g => { if (g === null) return null; if (g.status !== 'play' || moveCount(g.moves) !== n) return; g.status = 'over'; g.win = win; g.reason = reason; return g; });

  // apply the rating change for my side once per game. score: 1 / .5 / 0
  async function applyResult(gid, game, score) {
    const opp = game.b === uid ? game.wr : game.br;
    let out = { old: profile.rating, now: profile.rating, rated: !!game.rated };
    const r = await db.txn('players/' + uid, p => {
      if (p === null) return null;
      if (p.last === gid) return;
      if (typeof p.rating !== 'number') p.rating = INITIAL;
      const nr = game.rated ? elo(p.rating, opp, score, p.games || 0) : p.rating;
      p.rating = nr; p.games = (p.games || 0) + (game.rated ? 1 : 0);
      if (game.rated) { if (score === 1) p.wins = (p.wins || 0) + 1; else if (score === 0) p.losses = (p.losses || 0) + 1; else p.draws = (p.draws || 0) + 1; }
      p.last = gid; return p;
    });
    if (r.committed && r.value) { out = { old: profile.rating, now: r.value.rating, rated: !!game.rated }; profile = r.value; if (presOn) db.update('presence/' + uid, { rating: profile.rating }); }
    return out;
  }

  async function topPlayers(n = 20) {
    const all = await db.get('players') || {};
    return Object.entries(all).filter(([, p]) => p && p.games > 0).map(([id, p]) => ({ id, ...p, me: id === uid })).sort((a, b) => b.rating - a.rating).slice(0, n);
  }

  window.Online = {
    available: !!CFG || MOCK, mock: MOCK, MOVE_LIMIT, INITIAL, TC, TC_IDS, GRACE, CROSS_WAIT, tcOf, clockOf, ROOM_TTL, get roomTc() { return roomTc; }, get roomPriv() { return roomPriv; }, get room() { return db ? room() : null; },
    init, setName, setPresence, watchPresence, watchRooms, watchLobby, enterLobby, createRoom, joinRoom, leave, leaveLobby, closeRoom, extendRoom, onRoom,
    watchGame, sendMove, moveCount, USI_RE, resign, claimTimeout, markOver, applyResult, topPlayers, elo,
    get uid() { return uid; }, get profile() { return profile; }, now: () => (db ? db.now() : Date.now()),
  };
})();
