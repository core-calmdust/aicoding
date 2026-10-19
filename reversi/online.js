// Online play for Reversi V4: lobby, Elo rating, rating-based matchmaking, private rooms.
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
  function loadScript(src) { const C = window.__fbScripts = window.__fbScripts || {}; return C[src] || (C[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); })); }  // shared with shared/atlas-account.js

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

  // in-browser mock with the same surface (tree in localStorage, change events across tabs)
  function mockDB() {
    // sharded by the first two path segments (e.g. "players/<uid>") so that tabs writing different records do not overwrite each other
    const PFX = 'reversi-mockdb:';
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
        uid = sessionStorage.getItem('reversi-mock-uid') || ('u' + Math.random().toString(36).slice(2, 10));
        sessionStorage.setItem('reversi-mock-uid', uid);
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
      if (!profile) {
        profile = { name: defaultName(), rating: INITIAL, games: 0, wins: 0, losses: 0, draws: 0 };
        await db.set('players/' + uid, profile);
      }
      return { uid, profile };
    })();
    ready.catch(() => { ready = null; });
    return ready;
  }
  function defaultName() { try { const n = localStorage.getItem('reversi-online-name'); if (n) return n; } catch (e) {} return 'Player' + Math.floor(1000 + Math.random() * 9000); }
  const cleanName = s => String(s || '').replace(/[<>&"']/g, '').trim().slice(0, 16) || defaultName();

  async function setName(name) {
    name = cleanName(name); profile.name = name; if (presOn) db.update('presence/' + uid, { name });
    try { localStorage.setItem('reversi-online-name', name); } catch (e) {}
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
    if (!presOn) {
      db.onDisconnectRemove('presence/' + uid); presOn = true;
      if (db.onReconnect) db.onReconnect(() => setPresence().catch(() => {}));
      setInterval(() => { if (presOn) db.update('presence/' + uid, { t: db.stamp() }).catch(() => {}); }, PRES_BEAT);   // heartbeat
    }
  }
  // entries whose owner stopped beating (crashed tab, lost disconnect handler) are not shown
  const PRES_BEAT = 60000, PRES_STALE = 150000;
  const presLive = x => typeof x.t === 'number' && db.now() - x.t < PRES_STALE;
  const listOf = (v, me) => Object.entries(v || {}).map(([id, x]) => ({ id, ...x, me: id === uid }));
  function watchPresence(cb) { return db.on('presence', v => cb(listOf(v).filter(x => x.me || presLive(x)).sort((a, b) => (b.rating || 0) - (a.rating || 0)))); }
  // a room is usable while nobody joined it and it has not expired (expires; old records: created + ROOM_TTL). Lists hide expired rooms even if the host vanished without cleanup.
  // Open rooms with a game in progress stay listed (marked as playing, with a watch button); closed rooms are never listed
  const roomExp = r => (typeof r.expires === 'number' ? r.expires : (typeof r.created === 'number' ? r.created : 0) + ROOM_TTL);
  const roomLive = (r, now) => !!r && !r.game && roomExp(r) > (now == null ? db.now() : now);
  function watchRooms(cb) {
    let last = null;
    const emit = () => cb(listOf(last).filter(r => !r.priv && (r.game ? !!r.host : roomLive(r))).sort((a, b) => (a.game ? 1 : 0) - (b.game ? 1 : 0) || (a.created || 0) - (b.created || 0)));
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
  // The room lives on until the host closes it (closeRoom), it expires (ROOM_TTL, deleted by the host's client) or the host disconnects
  // (onDisconnect). Closing the online dialog does not touch it. A guest joining sets rooms/<code>/game (+ guest); after that game the
  // two may agree on a rematch (games/<gid>/again → post 'again' → the host creates the next game, swapped colours, and sets next).
  // Otherwise post records why the guest left ('no' declined, 'timeout' no answer in REMATCH_MS, 'left' guest left, 'host' host declined)
  // and the host's client reopens the room (game/guest cleared, fresh expiry) for the next entrant.
  const REMATCH_MS = 10000;
  let roomCode = null, roomTc = null, roomPriv = false, roomTitle = '', roomExpires = 0, roomUnsub = null, roomTimer = 0, roomCbs = null;
  let roomGame = null, roomG = null, roomGameUnsub = null, roomBusy = false;
  const roomListeners = new Set();
  const roomEmit = (ev, x) => roomListeners.forEach(f => { try { f(ev, room(), x); } catch (e) { console.warn(e); } });
  function onRoom(f) { roomListeners.add(f); return () => roomListeners.delete(f); }   // ev: 'open' | 'extend' | 'closed' | 'expired' | 'gone' | 'matched' | 'reopen' (x = the finished game)
  const room = () => (roomCode ? { code: roomCode, priv: roomPriv, title: roomTitle, tc: roomTc, expires: roomExpires, left: Math.max(0, roomExpires - db.now()), game: roomGame } : null);
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function roomAttach(code, d, cbs) {
    roomCode = code; roomTc = d.tc; roomPriv = !!d.priv; roomTitle = d.title || ''; roomExpires = d.expires; roomCbs = cbs;
    if (!d.game) setPresence('room', { room: d.priv ? null : code });
    db.onDisconnectRemove('rooms/' + code);
    let seen = false;
    roomUnsub = db.on('rooms/' + code, v => {
      if (roomCode !== code) return;
      if (v && v.host === uid) {
        seen = true;
        if (typeof v.expires === 'number' && !v.game) roomExpires = v.expires;
        if (v.game && v.game !== roomGame) {            // someone joined (or a rematch started): the room stays with the host
          roomWatchGame(v.game);
          const cb = roomCbs && roomCbs.onMatched; roomEmit('matched'); cb && cb(v.game);
        } else if (!v.game && roomGame) {               // the guest left: the room takes entrants again
          const g = roomG; roomWatchGame(null);
          if (presState !== 'play' || !g || g.status !== 'play') setPresence('room', { room: roomPriv ? null : code });
          roomEmit('reopen', g);
        }
        return;
      }
      if (seen || v) { roomEnd(); if (!v) roomEmit('gone'); }       // deleted elsewhere (e.g. another tab) or taken over after expiry
    });
    roomTimer = setInterval(roomCheck, 5000);
    roomEmit('open');
  }
  // after a reload during a game in the own room: put the room back (the disconnect removed it) and follow that game again
  async function resumeRoom(s, cbs) {
    if (!s || !s.code || !s.gid || roomCode) return null;
    const g = await db.get('games/' + s.gid);
    if (!g || g.room !== s.code || g.host !== uid || g.status !== 'play') return null;
    const expires = db.now() + ROOM_TTL, guest = g.b === uid ? g.w : g.b, gname = g.b === uid ? g.wn : g.bn;
    const r = await db.txn('rooms/' + s.code, cur => cur === null ? { host: uid, name: profile.name, rating: profile.rating, tc: s.tc || g.tc || 'fast', created: db.stamp(), expires, game: s.gid, guest, gname, priv: !!s.priv, title: s.title || '' } : cur.host === uid ? cur : undefined);
    if (!r.committed || !r.value || r.value.host !== uid) return null;
    const v = r.value;
    roomAttach(s.code, { tc: v.tc, priv: v.priv, title: v.title, expires: v.expires, game: v.game }, cbs);
    return s.code;
  }
  async function createRoom({ onMatched, onExpired, priv, tc, title }) {
    title = String(title || '').replace(/\s+/g, ' ').trim().slice(0, 24);
    tc = TC[tc] ? tc : 'fast';
    await leave();
    for (let tries = 0; tries < 6; tries++) {
      const code = Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
      const expires = db.now() + ROOM_TTL;
      const r = await db.txn('rooms/' + code, cur => cur === null ? { host: uid, name: profile.name, rating: profile.rating, tc, created: db.stamp(), expires, game: null, guest: null, priv: !!priv, title } : undefined);
      if (!r.committed || !r.value || r.value.host !== uid || r.value.expires !== expires) continue;
      roomAttach(code, { tc, priv: !!priv, title, expires }, { onMatched, onExpired });
      return code;
    }
    throw new Error('room');
  }
  function roomCheck() {
    if (!roomCode) return;
    if (roomGame) {          // a game in the room (no expiry); after it, drop a guest who went offline without leaving
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
  // the host follows the game played in the own room: create the rematch / reopen the room when the guest leaves
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
      if (g && g.post === 'again') {      // both agreed: next game in the same room, colours swapped
        const ngid = db.push('games');
        const meB = g.w === uid, me = { n: profile.name, r: profile.rating }, op = g.b === uid ? { n: g.wn, r: g.wr } : { n: g.bn, r: g.br };
        const B = meB ? me : op, W = meB ? op : me;
        await db.set('games/' + ngid, { b: g.w, w: g.b, bn: B.n, wn: W.n, br: B.r, wr: W.r, moves: '', status: 'play', rated: false, room: code, host: uid, ...tcFields(g.tc), created: db.stamp(), t: db.stamp() });
        const r = await db.txn('rooms/' + code, cur => { if (cur === null) return null; if (cur.host !== uid || cur.game !== gid) return; cur.game = ngid; return cur; });
        if (r.committed && r.value && r.value.game === ngid) await db.update('games/' + gid, { next: ngid });
        else await db.remove('games/' + ngid);
      } else {                              // the guest leaves: reopen with a fresh expiry
        await db.txn('rooms/' + code, cur => { if (cur === null) return null; if (cur.host !== uid || cur.game !== gid) return; cur.game = null; cur.guest = null; cur.gname = null; cur.expires = db.now() + ROOM_TTL; return cur; });
      }
    } catch (e) { console.warn(e); } finally {
      roomBusy = false;
      setTimeout(() => { if (roomGame === gid && roomG && roomG !== g) roomFollow(gid, roomG); }, 0);    // changed meanwhile
    }
  }
  // stop watching the own room (does not delete it)
  function roomEnd() {
    roomUnsub && roomUnsub(); roomUnsub = null; clearInterval(roomTimer); roomTimer = 0;
    roomWatchGame(null);
    if (roomCode) db.cancelDisconnect('rooms/' + roomCode);
    roomCode = null; roomCbs = null; roomExpires = 0;
  }
  // delete the own room (部屋を閉じる / expiry); a guest still in it is told that there is no rematch
  async function closeRoom(why) {
    if (!roomCode) return;
    const c = roomCode, gid = roomGame; roomEnd();
    if (gid) setPost(gid, 'host').catch(() => {});
    if (presOn && presState === 'room') setPresence('idle', { room: null });
    await db.txn('rooms/' + c, cur => (cur === null ? null : cur.host === uid ? null : undefined));
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
    await db.set('games/' + gid, { b: black, w: white, bn: names[black], wn: names[white], br: rates[black], wr: rates[white], moves: '', status: 'play', rated: false, room: code, host: rm.host, ...tcFields(rm.tc), created: db.stamp(), t: db.stamp() });
    const r = await db.txn('rooms/' + code, cur => { if (cur === null) return null; if (!roomLive(cur) || cur.host !== rm.host) return; cur.game = gid; cur.guest = uid; cur.gname = profile.name; return cur; });
    if (!(r.committed && r.value && r.value.game === gid)) { await db.remove('games/' + gid); return null; }
    return gid;
  }
  // ---- after a room game (either player; the host's client acts on the result in roomFollow)
  const postable = (g, v) => g && !g.post && !g.next && g.room && !g.rated && (g.status !== 'play' || v === 'host');
  // the guest leaves / the host declines (v: 'left' | 'host'); no-op once decided
  const setPost = (gid, v) => db.txn('games/' + gid, g => { if (g === null) return null; if (!postable(g, v)) return; g.post = v; return g; });
  // ask for a rematch; if the opponent already asked, this accepts it
  const requestRematch = gid => db.txn('games/' + gid, g => {
    if (g === null) return null; if (!postable(g)) return;
    if (g.again) { if (g.again.by === uid) return; g.post = 'again'; return g; }
    g.again = { by: uid, t: db.stamp() }; return g;
  });
  const answerRematch = (gid, yes) => db.txn('games/' + gid, g => { if (g === null) return null; if (!postable(g) || !g.again || g.again.by === uid) return; g.post = yes ? 'again' : 'no'; return g; });
  const expireRematch = gid => db.txn('games/' + gid, g => { if (g === null) return null; if (!postable(g) || !g.again || db.now() - g.again.t < REMATCH_MS) return; g.post = 'timeout'; return g; });

  // ---- spectating: anyone may follow the game of an OPEN room read-only. The only write is the spectator count
  // watch/<gid>/<uid> = true (removed on leaving / disconnect)
  let watchGid = null;
  async function roomGameOf(code) {
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const rm = code ? await db.get('rooms/' + code) : null;
    return rm && !rm.priv && rm.game && rm.host !== uid && rm.guest !== uid ? rm.game : null;
  }
  function watchUnmark() {
    if (!watchGid) return;
    const p = 'watch/' + watchGid + '/' + uid; watchGid = null;
    db.cancelDisconnect(p); db.remove(p).catch(() => {});
  }
  function spectate(gid, cb) {
    setPresence('watch', { room: null });
    watchUnmark(); watchGid = gid;
    db.set('watch/' + gid + '/' + uid, true).then(() => { if (watchGid === gid) db.onDisconnectRemove('watch/' + gid + '/' + uid); }).catch(() => {});
    const off = db.on('games/' + gid, cb);
    return () => { off(); if (watchGid === gid) watchUnmark(); };
  }
  const watchCount = (gid, cb) => db.on('watch/' + gid, v => cb(Object.keys(v || {}).length));

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
    if (roomCode) { const c = roomCode, gid = roomGame; roomEnd(); if (gid) setPost(gid, 'host').catch(() => {}); await db.txn('rooms/' + c, cur => (cur === null ? null : cur.host === uid ? null : undefined)); roomEmit('closed'); }
  }

  // ---------------------------------------------------------------- games
  const enc = sq => 'abcdefgh'[sq & 7] + ((sq >> 3) + 1);
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
  async function sendMove(gid, n, sq) {
    const r = await db.txn('games/' + gid, g => {
      if (g === null) return null;
      if (g.status !== 'play' || (g.moves || '').length !== n * 2) return;
      g.moves = (g.moves || '') + enc(sq); if (!chargeClock(g)) return; g.t = db.stamp(); return g;
    });
    return r.committed;
  }
  const resign = gid => db.txn('games/' + gid, g => { if (g === null) return null; if (g.status !== 'play') return; g.status = 'resign'; g.loser = uid; return g; });
  const claimTimeout = (gid, oppUid) => db.txn('games/' + gid, g => { if (g === null) return null; if (g.status !== 'play' || db.now() - g.t < (TC[g.tc] ? mainOf(g, sideOf(g, oppUid)) + TC[g.tc].byo + GRACE : MOVE_LIMIT)) return; g.status = 'timeout'; g.loser = oppUid; return g; });
  const markOver = gid => db.txn('games/' + gid, g => { if (g === null) return null; if (g.status !== 'play') return; g.status = 'over'; return g; });

  // apply the rating change for my side once per game. score: 1 / .5 / 0
  async function applyResult(gid, game, score) {
    const opp = game.b === uid ? game.wr : game.br;
    let out = { old: profile.rating, now: profile.rating, rated: !!game.rated };
    const r = await db.txn('players/' + uid, p => {
      if (p === null) return null;
      if (p.last === gid) return;
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

  // ---------------------------------------------------------------- public chat (everyone online in this game; no private messages)
  // A ring of CHAT_N slots: chat/seq counts messages (transaction), message n goes to chat/msgs/<n % CHAT_N>, overwriting the oldest,
  // so the database never holds more than the latest CHAT_N messages.
  const CHAT_N = 20, CHAT_LEN = 100, CHAT_GAP = 2000;
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
      await db.set('chat/msgs/' + (r.value % CHAT_N), { n: r.value, uid, name: profile.name, text, t: db.stamp() });
      return { ok: true };
    } catch (e) { console.warn(e); return { ok: false, why: 'error' }; }
  }

  window.Online = {
    available: !!CFG || MOCK, mock: MOCK, MOVE_LIMIT, INITIAL, TC, TC_IDS, GRACE, CROSS_WAIT, tcOf, clockOf, ROOM_TTL, REMATCH_MS, CHAT_N, CHAT_LEN, CHAT_GAP, get roomTc() { return roomTc; }, get roomPriv() { return roomPriv; }, get room() { return db ? room() : null; },
    getGame: gid => db.get('games/' + gid), resumeRoom,
    init, setName, setPresence, watchPresence, watchRooms, watchLobby, enterLobby, createRoom, joinRoom, leave, leaveLobby, closeRoom, extendRoom, onRoom,
    setPost, requestRematch, answerRematch, expireRematch, watchChat, sendChat, roomGameOf, spectate, watchCount,
    watchGame, sendMove, resign, claimTimeout, markOver, applyResult, topPlayers, elo,
    get uid() { return uid; }, get profile() { return profile; }, now: () => (db ? db.now() : Date.now()),
  };
})();
