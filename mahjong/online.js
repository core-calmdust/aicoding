// 雀華：オンライン対戦（2026-11-19、ユーザー決定：ホストの端末が山を持つ方式・Spark プランのまま・空き席は BOT・スキルあり・
// レート戦とフリー戦（ルーム型）・エモート）。データは Firebase「Janka-Database」（fbcfg.js）の janka/ 以下、ルールは database.rules.json。
//
// しくみ
//   ホスト（ルームを作った人、レート戦は先に待っていた人）の端末が本物の MJGame を動かす。ほかの人の席は RemoteAgent：
//   打牌・鳴きの判断を janka/rooms/<code>/q/<uid> に「問い」として書き、本人が ans/<uid> に答える（時間切れ・切断は BOT が代わりに打つ）。
//   ゲストの端末は牌山を持たない。ホストが ev/<uid> に、その人から見た向き（自分＝席0）に回し、他人の手牌・ツモ・スキルの中身を
//   伏せた「出来事＋卓の写し（snap）」を順に書く。ゲストは MirrorGame（G の代わり）に写しを当ててから、いつもの onEvent で描く。
//   ほかの人の手牌は枚数だけ届くので、見えていない牌の番号を仮に当てておく（捨てられた牌が仮の番号と重なれば入れ替える）。
//   ev/<uid> と q/<uid> は本人とホストだけが読める（ホストは理論上ほかの人の手牌を見られる：ユーザー了承済み）。
//
// データ（janka/）
//   rooms/<code> : meta { host, mode 'free'|'rated', len 'east'|'south', st 'wait'|'play'|'over', t, hb（ホストの生存）, order[4]（uid か ''=BOT） }
//                  seats/<uid> { name, ch { id, key, pid, pkey }, r（レート）, t（参加）, hb }
//                  start { chars[4]（ch）, names[4] }、ev/<uid>/<push> { j }、q/<uid>/<push> { j }、ans/<uid>/<push> { j }、emo/<push> { u, k, t }、res { scores, rank }
//   mm/<uid>     : レート戦の待ち { t, r, name, c（招待されたルームの code） }
//   pl/<uid>     : { r（レート、1500 から）, n（対局数）, name, t }
//   ?mock=1 で Firebase の代わりに localStorage の偽データベース（同じブラウザの別タブどうしで対戦できる。テスト用）。
(function () {
  'use strict';
  const CFG = window.JANKA_FIREBASE_CONFIG || null;
  const Q = new URLSearchParams(location.search), MOCK = Q.has('mock');
  const FB_VER = '10.12.2';
  const ja = () => !window.I18N || I18N.lang === 'ja';
  const TX = (j, e) => ja() ? j : e;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const J = () => window.JANKA;
  const TURN_MS = 25000, CALL_MS = 9000, DEAL_MS = 9000, ACK_MS = 30000, HB_MS = 8000, STALE_MS = 40000;
  const EMO = [['よろしく！', 'Hi!'], ['ナイス！', 'Nice!'], ['すごい！', 'Wow!'], ['ありがとう', 'Thanks'], ['ごめんね', 'Sorry'], ['どんまい', 'Never mind'], ['くやしい…', 'Argh…'], ['おつかれさま', 'GG']];

  // ================================================================ backend
  function mockDB() {
    // (each leaf value is its own localStorage key 'jm:<path>', so two tabs writing different paths never overwrite each other)
    const PFX = 'jm:';
    const segs = p => p.split('/').filter(Boolean), norm = p => segs(p).join('/');
    const keys = () => { const out = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(PFX)) out.push(k); } return out; };
    const getAt = p => { p = norm(p); const pre = PFX + p, ks = keys().filter(k => k === pre || k.startsWith(pre + '/'));
      if (!ks.length) return null; if (ks.length === 1 && ks[0] === pre) return JSON.parse(localStorage.getItem(pre));
      const o = {}; for (const k of ks) { const rest = segs(k.slice(pre.length)); let n = o; for (let i = 0; i < rest.length - 1; i++) n = n[rest[i]] = n[rest[i]] || {}; n[rest[rest.length - 1]] = JSON.parse(localStorage.getItem(k)); } return o; };
    const del = p => { p = norm(p); const pre = PFX + p; for (const k of keys()) if (k === pre || k.startsWith(pre + '/')) localStorage.removeItem(k); };
    const put = (p, v) => { p = norm(p); if (v == null) return; if (typeof v === 'object' && !Array.isArray(v)) { for (const k in v) put(p + '/' + k, v[k]); } else localStorage.setItem(PFX + p, JSON.stringify(v)); };
    let uid = sessionStorage.getItem('janka-mock-uid'); if (!uid) { uid = 'm' + Math.random().toString(36).slice(2, 10); sessionStorage.setItem('janka-mock-uid', uid); }
    const W = []; let cnt = 0;
    setInterval(() => { for (const w of W) { const v = getAt(w.p);
      if (w.kind === 'value') { const s = JSON.stringify(v); if (s !== w.last) { w.last = s; try { w.cb(v); } catch (e) { console.error(e); } } }
      else if (v && typeof v === 'object') for (const k of Object.keys(v).sort()) if (!w.seen.has(k)) { w.seen.add(k); try { w.cb(k, v[k]); } catch (e) { console.error(e); } } } }, 90);
    return {
      uid: () => uid, now: () => Date.now(), ready: async () => true,
      get: async p => getAt(p),
      set: async (p, v) => { del(p); put(p, v); },
      update: async (p, v) => { for (const k in v) { del(p + '/' + k); put(p + '/' + k, v[k]); } },
      remove: async p => del(p),
      push: async (p, v) => { const k = Date.now().toString(36).padStart(9, '0') + (cnt++).toString(36).padStart(4, '0') + Math.random().toString(36).slice(2, 5); put(p + '/' + k, v); return k; },
      watch: (p, cb) => { const w = { p, cb, kind: 'value', last: undefined }; W.push(w); return () => { const i = W.indexOf(w); if (i >= 0) W.splice(i, 1); }; },
      added: (p, cb) => { const w = { p, cb, kind: 'added', seen: new Set() }; W.push(w); return () => { const i = W.indexOf(w); if (i >= 0) W.splice(i, 1); }; },
      tx: async (p, fn) => { const v = fn(getAt(p)); if (v === undefined) return false; del(p); put(p, v); return true; },
      dropOnLeave: () => {},
      _clear: () => { for (const k of keys()) localStorage.removeItem(k); },
    };
  }
  function fbDB() {
    let app = null, auth = null, db = null, off = 0, user = null, init = null;
    const loadScript = src => { const C = window.__fbScripts = window.__fbScripts || {}; return C[src] || (C[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error(src)); document.head.appendChild(s); })); };
    const ready = () => init || (init = (async () => {
      const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
      await loadScript(base + 'firebase-app-compat.js');
      await Promise.all([loadScript(base + 'firebase-auth-compat.js'), loadScript(base + 'firebase-database-compat.js')]);
      app = firebase.apps.find(a => a.name === 'janka') || firebase.initializeApp(CFG, 'janka');
      const key = window.JANKA_APPCHECK_SITE_KEY;
      if (key && !app.__appCheck) { try { await loadScript(base + 'firebase-app-check-compat.js'); app.appCheck().activate(new firebase.appCheck.ReCaptchaEnterpriseProvider(key), true); app.__appCheck = true; } catch (e) { console.warn('App Check', e); } }
      auth = app.auth(); db = app.database();
      user = await new Promise(res => { const o = auth.onAuthStateChanged(u => { o(); res(u); }); });
      if (!user) user = (await auth.signInAnonymously()).user;
      db.ref('.info/serverTimeOffset').on('value', s => { off = s.val() || 0; });
      return true;
    })().catch(e => { init = null; throw e; }));
    const R = p => db.ref(p);
    return {
      uid: () => user && user.uid, now: () => Date.now() + off, ready,
      get: async p => (await R(p).get()).val(),
      set: (p, v) => R(p).set(v), update: (p, v) => R(p).update(v), remove: p => R(p).remove(),
      push: async (p, v) => { const r = R(p).push(); await r.set(v); return r.key; },
      watch: (p, cb) => { const f = s => cb(s.val()); R(p).on('value', f, e => console.warn(p, e)); return () => R(p).off('value', f); },
      added: (p, cb) => { const f = s => cb(s.key, s.val()); R(p).on('child_added', f, e => console.warn(p, e)); return () => R(p).off('child_added', f); },
      tx: async (p, fn) => { const r = await R(p).transaction(v => { const n = fn(v); return n === undefined ? undefined : n; }); return r.committed; },
      dropOnLeave: p => { try { R(p).onDisconnect().remove(); } catch (e) {} },
    };
  }
  const NET = MOCK ? mockDB() : CFG ? fbDB() : null;
  const avail = () => !!NET && (MOCK || /(^|\.)github\.io$/.test(location.hostname) || /^(localhost|127\.0\.0\.1)$/.test(location.hostname));

  // ================================================================ seats, turned for one player
  const rot = (s, k) => s == null || s < 0 ? s : (s - k + 4) % 4;           // host seat → that player's own view (k = the player's host seat)
  const rotA = (a, k) => a ? [0, 1, 2, 3].map(L => a[(L + k) % 4]) : a;       // a per-seat array, turned
  const clone = o => o == null ? o : JSON.parse(JSON.stringify(o));
  function fxOf(fx, own) { const o = {}; for (const k in fx || {}) { const v = fx[k]; if (v == null || typeof v === 'boolean' || typeof v === 'number' || typeof v === 'string') o[k] = v; else if (own) o[k] = clone(v); else o[k] = true; } return o; }
  function snapFor(g, k) {
    const P = [0, 1, 2, 3].map(L => { const S = (L + k) % 4, p = g.P[S];
      return { h: S === k ? p.hand.slice() : p.hand.length, rv: p.river.map(r => [r.id, (r.tsumogiri ? 1 : 0) | (r.riichi ? 2 : 0) | (r.taken ? 4 : 0)]),
        m: p.melds.map(m => ({ type: m.type, t: m.t, tiles: m.tiles.slice(), called: m.called, from: rot(m.from, k) })),
        ri: p.riichi, rt: p.riichiTurn, su: (p.skUsed || []).slice(), fx: fxOf(p.fx, S === k), ip: !!p.ippatsu }; });
    return { r: g.round, k: g.kyoku, hb: g.honba, ky: g.kyotaku, sc: rotA(g.scores, k), o0: (g.oya0 - k + 4) % 4, left: g.liveLeft ? g.liveLeft() : 0,
      di: g.doraInds ? g.doraInds() : [], su: rotA(g.skillUses, k), sf: rotA(g.skillFree, k), pu: g.paidUses ? rotA(g.paidUses, k) : null, P };
  }
  // the event's data, turned and with what this player must not see taken out
  function evFor(ev, d, k) {
    const o = clone(d), R = s => rot(s, k);
    if (o.seat != null) o.seat = R(o.seat);
    if (o.from != null) o.from = R(o.from);
    if (o.scores) o.scores = rotA(o.scores, k);
    if (o.delta) o.delta = rotA(o.delta, k);
    if (ev === 'draw' && d.seat !== k) o.id = null;
    if (ev === 'skill') { if (d.seat !== k) o.info = {}; else if (o.info && o.info.read) o.info.read.forEach(x => { x.seat = R(x.seat); }); }
    if (ev === 'agari') o.results.forEach(r => { r.seat = R(r.seat); if (r.from != null) r.from = R(r.from); (r.moves || []).forEach(m => { m[0] = R(m[0]); }); (r.melds || []).forEach(m => { if (m.from != null) m.from = R(m.from); }); });
    if (ev === 'ryuukyoku') { o.tenpai = rotA(o.tenpai, k); o.hands = rotA(o.hands, k).map((h, L) => L === 0 || o.tenpai[L] ? h : []); if (o.nagashi) o.nagashi = o.nagashi.map(R); }
    if (ev === 'game-end' && o.rank) o.rank = o.rank.map(R);
    return o;
  }
  function optsFor(kind, o, k) { const x = clone(o); delete x.tsumoRes; delete x.ronRes; if (x.seat != null) x.seat = rot(x.seat, k); if (x.from != null) x.from = rot(x.from, k); return x; }

  // ================================================================ the guest's table: a mirror of the host's game
  class MirrorGame extends MJGame {
    constructor(chars, len) { super({ agents: [], chars, rules: { length: len, skills: true } }); this._left = 70; this._di = []; this._ura = []; this.ph = [[], [], [], []]; this.P = [0, 1, 2, 3].map(s => this.blankP(s)); }
    blankP(s) { return { seat: s, hand: [], melds: [], river: [], riichi: false, riichiTurn: -1, skUsed: [false, false], fx: {}, discards: new Set(), dblRiichi: false, ippatsu: false }; }
    liveLeft() { return this._left; }
    doraInds() { return this._di.slice(); }
    uraInds() { return this._ura.slice(); }
    // the snapshot of a new event: everything as the host has it (the others' hands as many stand-in tiles)
    apply(sn, ev, d) {
      Object.assign(this, { round: sn.r, kyoku: sn.k, honba: sn.hb, kyotaku: sn.ky, scores: sn.sc, oya0: sn.o0, _left: sn.left, _di: sn.di, skillUses: sn.su, skillFree: sn.sf });
      if (sn.pu) this.paidUses = sn.pu;
      if (d && d.ura) this._ura = d.ura;
      const known = new Set();
      sn.P.forEach(p => { if (Array.isArray(p.h)) p.h.forEach(x => known.add(x)); p.rv.forEach(r => known.add(r[0])); p.m.forEach(m => m.tiles.forEach(x => known.add(x))); });
      // the dora indicators are tile types; the tiles themselves (in the dead wall) are not placed on the table here
      if (ev === 'hand-start') this.ph = [[], [], [], []];
      // real tiles that came out of a hidden hand in this event: make them that hand's own stand-ins first (no tile jumps across the table)
      const seen = new Set(); this.P.forEach(p => { p.river.forEach(r => seen.add(r.id)); p.melds.forEach(m => m.tiles.forEach(x => seen.add(x))); });
      const outs = (ev === 'discard' ? [d.id] : ev === 'call' ? (d.tiles || []).filter(x => x !== d.called) : []).filter(x => x != null && !seen.has(x));
      const sw = new Set();
      if (d && d.seat != null && d.seat !== 0 && outs.length) {
        const ph = this.ph[d.seat];
        for (const X of outs) { if (ph.includes(X)) continue;
          let j = ev === 'discard' && d.tsumogiri ? ph.length - 1 : Math.max(0, Math.floor(Math.random() * Math.max(1, ph.length - 1)));
          if (j < 0) { ph.push(X); continue; }
          const Y = ph[j]; ph[j] = X;
          for (let t = 1; t < 4; t++) if (t !== d.seat) { const i = this.ph[t].indexOf(X); if (i >= 0) { this.ph[t][i] = Y; sw.add(t); } }
          sw.add(d.seat); }
        if (window.JANKA && JANKA.TB) for (const t of sw) { try { JANKA.TB.layoutHand(t, this.ph[t].slice(), null); } catch (e) {} }
      }
      const used = new Set(); for (let t = 1; t < 4; t++) this.ph[t].forEach(x => used.add(x));
      const pool = []; for (let id = 135; id >= 0; id--) if (!known.has(id) && !used.has(id)) pool.push(id);
      this.P = sn.P.map((p, L) => {
        let hand;
        if (L === 0) hand = p.h.slice();
        else { let ph = this.ph[L].filter(x => !known.has(x)); while (ph.length > p.h) ph.pop(); while (ph.length < p.h && pool.length) ph.push(pool.pop()); this.ph[L] = ph; hand = ph.slice(); }
        const river = p.rv.map((r, i) => ({ id: r[0], tsumogiri: !!(r[1] & 1), riichi: !!(r[1] & 2), taken: !!(r[1] & 4), turn: i }));
        return { seat: L, hand, melds: p.m, river, riichi: p.ri, riichiTurn: p.rt, skUsed: p.su, fx: p.fx, discards: new Set(river.map(r => r.id >> 2)), dblRiichi: false, ippatsu: p.ip, firstTurn: false };
      });
    }
  }

  // ================================================================ the host's agent for a remote player
  class RemoteAgent {
    constructor(room, uid, seat, bot) { this.room = room; this.uid = uid; this.seat = seat; this.bot = bot; this.n = 0; }
    get interactive() { return true; }
    alive() { const s = this.room.seats && this.room.seats[this.uid]; return !!s && NET.now() - (s.hb || 0) < STALE_MS; }
    async ask(kind, g, o, ms, fallback) {
      if (!this.alive() || this.room.closed) return fallback();
      const n = ++this.n, base = `janka/rooms/${this.room.code}`;
      const wait = this.room.waitAns(this.uid, n);
      await NET.push(`${base}/q/${this.uid}`, { j: JSON.stringify({ k: kind, n, after: this.room.evN[this.uid] || 0, ms, o: optsFor(kind, o, this.seat) }) });
      if (MOCK) console.log('[ol] ask', kind, n, 'seat', this.seat, Date.now() % 100000);
      const a = await Promise.race([wait, sleep(ms + 2500).then(() => null)]);
      if (MOCK) console.log('[ol] ans', kind, n, a ? JSON.stringify(a).slice(0, 60) : 'TIMEOUT', Date.now() % 100000);
      this.room.dropAns(this.uid, n);
      if (!a) return fallback();
      return a;
    }
    async turn(g, s, o) {
      const fb = () => this.bot.turn(g, s, o);
      const a = await this.ask('turn', g, o, TURN_MS, fb);
      const p = g.P[s], has = id => p.hand.includes(id);
      const ok = a && ((a.act === 'discard' && has(a.id) && (!o.mustTsumogiri || a.id === o.drawn) && !(o.forbid || []).includes(a.id >> 2))
        || (a.act === 'riichi' && (o.riichi || []).includes(a.id)) || (a.act === 'tsumo' && o.canTsumo) || (a.act === 'kyuushu' && o.canKyuushu)
        || (a.act === 'ankan' && (o.ankans || []).includes(a.t)) || (a.act === 'kakan' && (o.kakans || []).includes(a.t)) || (a.act === 'skill' && o.canSkill));
      return ok ? a : fb();
    }
    async react(g, s, o) {
      const fb = () => o.canRon ? this.bot.react(g, s, o) : { act: 'pass' };
      const a = await this.ask('react', g, o, CALL_MS, fb);
      const same = (u, list) => (list || []).some(v => v.length === u.length && v.every((x, i) => x === u[i]));
      const ok = a && (a.act === 'pass' || (a.act === 'ron' && o.canRon) || (a.act === 'minkan' && o.minkan) || (a.act === 'pon' && same(a.use || [], o.pons)) || (a.act === 'chi' && same(a.use || [], o.chis)));
      return ok ? a : fb();
    }
    async dealSkill(g, s, o) { const a = await this.ask('deal', g, o, DEAL_MS, () => false); return a === true || (a && a.yes === true); }
  }

  // ================================================================ a room (both sides)
  function code5() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += A[(Math.random() * A.length) | 0]; return s; }
  const myName = () => { const DB = J() && J().DB; return (DB && DB.oname) || TX('プレイヤー', 'Player'); };
  const myCh = () => { const o = J().mySeat(); return { id: o.id, key: MJSkills.key(o.skill, o.tier), pid: o.partner ? o.partner.id : null, pkey: o.partner && o.skill2 ? MJSkills.key(o.skill2, o.tier2) : null }; };
  function charOf(ch) { const C = MJChars.get(ch && ch.id) || MJChars.list[0]; const P = ch && ch.pid ? MJChars.get(ch.pid) : null; return J().seatChar(C, ch && ch.key || 'swap:0', P, ch && ch.pkey); }
  function botCh(taken) { const pool = MJChars.list.filter(c => c.reward == null && !taken.has(c.id)); const c = pool[(Math.random() * pool.length) | 0]; taken.add(c.id); return { id: c.id, key: J().rollSkillKey() }; }

  const R = {};   // the room this player is in: { code, host, meta, seats, ... }
  let rating = null;
  async function myRating() { const uid = NET.uid(); const v = await NET.get(`janka/pl/${uid}`); rating = v && typeof v.r === 'number' ? v : { r: 1500, n: 0 }; return rating; }

  function resetRoom() { for (const k in R) { if (k.startsWith('_off')) try { R[k](); } catch (e) {} } for (const k of Object.keys(R)) delete R[k]; }
  async function enter(code, asHost, mode, len) {
    resetRoom();
    const uid = NET.uid(), base = `janka/rooms/${code}`;
    Object.assign(R, { code, base, uid, host: asHost, meta: null, seats: {}, evN: {}, ans: {}, closed: false });
    R.waitAns = (u, n) => new Promise(res => { (R.ans[u] = R.ans[u] || {})[n] = res; });
    R.dropAns = (u, n) => { if (R.ans[u]) delete R.ans[u][n]; };
    if (asHost) await NET.set(`${base}/meta`, { host: uid, mode, len, st: 'wait', t: NET.now(), hb: NET.now() });
    const me = { name: myName(), ch: myCh(), r: (rating && rating.r) || 1500, t: NET.now(), hb: NET.now() };
    await NET.set(`${base}/seats/${uid}`, me);
    NET.dropOnLeave(`${base}/seats/${uid}`);
    R._offMeta = NET.watch(`${base}/meta`, m => { R.meta = m; if (!m && !asHost) { roomGone(); return; } if (m && m.st === 'play' && !R.started && !asHost) guestStart(); if (lobbyOpen) drawLobby(); });
    R._offSeats = NET.watch(`${base}/seats`, s => { R.seats = s || {}; if (lobbyOpen) drawLobby(); });
    R._hb = setInterval(() => { if (R.closed) return; NET.update(`${base}/seats/${uid}`, { hb: NET.now() }); if (asHost) NET.update(`${base}/meta`, { hb: NET.now() }); }, HB_MS);
    R._offHb = () => clearInterval(R._hb);
    R._offEmo = NET.added(`${base}/emo`, (k, v) => showEmote(v));
    return R;
  }
  async function leave(silent) {
    if (!R.code) return;
    const { base, uid, host } = R; R.closed = true;
    try { if (host) await NET.update(`${base}/meta`, { st: 'over' }); await NET.remove(`${base}/seats/${uid}`); if (host) setTimeout(() => NET.remove(base), 1500); } catch (e) {}
    resetRoom();
    if (!silent) drawLobby();
  }
  function roomGone() { const st = R.started; leave(true); if (st) { J().toast(TX('ホストとの接続が切れました', 'The host left'), 3500); try { J().quitGame(); } catch (e) {} } if (lobbyOpen) drawLobby(); }

  // ---------------------------------------------------------------- the host starts the game
  async function hostStart() {
    const uids = Object.keys(R.seats).filter(u => u !== R.uid).sort((a, b) => (R.seats[a].t || 0) - (R.seats[b].t || 0)).slice(0, 3);
    const order = [R.uid, ...uids]; while (order.length < 4) order.push('');
    const taken = new Set(Object.values(R.seats).map(s => s.ch && s.ch.id));
    const chs = order.map(u => u ? R.seats[u].ch : botCh(taken));
    const names = order.map(u => u ? (R.seats[u].name || '?') : 'BOT');
    const rs = order.map(u => u ? (R.seats[u].r || 1500) : 1500);
    await NET.set(`${R.base}/start`, { j: JSON.stringify({ order, chs, names, rs, len: R.meta.len, mode: R.meta.mode }) });
    await NET.update(`${R.base}/meta`, { st: 'play', order });
    R.started = true; R.order = order; R.names = names; R.rs = rs;
    closeLobby();
    const chars = chs.map(charOf);
    chars[0] = J().mySeat();
    // answers: one listener per remote player
    for (const u of uids) { R['_offAns' + u] = NET.added(`${R.base}/ans/${u}`, (k, v) => { try { const a = JSON.parse(v.j); const f = R.ans[u] && R.ans[u][a.n]; if (f) f(a.a); if (a.k === 'ack') { (R.acks = R.acks || {})[u] = Math.max((R.acks[u] || 0), a.h); } } catch (e) {} }); }
    let hn = 0;
    const ON = {
      len: R.meta.len, chars, names, order, mode: R.meta.mode, rs, host: true, room: R,
      agents: (me, mkBot) => order.map((u, s) => s === 0 ? me : u ? new RemoteAgent(R, u, s, new MJBot.Bot(3)) : mkBot(3)),
      ui: onEvent => async (ev, d) => {
        const g = J().G;
        const remotes = order.map((u, s) => [u, s]).filter(([u, s]) => s && u);
        if (ev === 'hand-start') hn++;
        await Promise.all(remotes.map(([u, s]) => { R.evN[u] = (R.evN[u] || 0) + 1; return NET.push(`${R.base}/ev/${u}`, { j: JSON.stringify({ e: ev, d: evFor(ev, d, s), s: g && g.P ? snapFor(g, s) : null, n: R.evN[u], h: hn }) }); }));
        await onEvent(ev, d);
        if (ev === 'agari' || ev === 'ryuukyoku') {   // (everyone has seen the results: the next hand)
          const t0 = Date.now();
          while (Date.now() - t0 < ACK_MS && remotes.some(([u, s]) => (R.acks && R.acks[u] || 0) < hn && new RemoteAgent(R, u, s).alive())) await sleep(300);
        }
        if (ev === 'game-end') await NET.set(`${R.base}/res`, { scores: d.scores, rank: d.rank, order, t: NET.now() });
      },
    };
    J().startGame({ online: ON });
  }
  // ---------------------------------------------------------------- a guest joins the host's game
  async function guestStart() {
    R.started = true;
    const st = await NET.get(`${R.base}/start`); if (!st) return;
    const S = JSON.parse(st.j), k = S.order.indexOf(R.uid); if (k < 0) return;
    R.order = S.order; R.k = k;
    closeLobby();
    const chars = rotA(S.chs, k).map(charOf); chars[0] = J().mySeat();
    const names = rotA(S.names, k), rs = rotA(S.rs, k);
    const mirror = new MirrorGame(chars, S.len);
    const ON = { len: S.len, chars, names, order: S.order, mode: S.mode, rs, host: false, room: R, mirror, k,
      run: (onEvent, human) => guestLoop(onEvent, human, mirror) };
    J().startRemote(ON);
  }
  async function guestLoop(onEvent, human, mirror) {
    const base = R.base, uid = R.uid, evq = [], asks = [];
    let done = 0, wake = null, over = false, lastEv = Date.now();
    const kick = () => { if (wake) { const w = wake; wake = null; w(); } };
    R._offEv = NET.added(`${base}/ev/${uid}`, (k, v) => { try { evq.push(JSON.parse(v.j)); lastEv = Date.now(); kick(); } catch (e) {} });
    R._offQ = NET.added(`${base}/q/${uid}`, (k, v) => { try { asks.push(JSON.parse(v.j)); kick(); } catch (e) {} });
    let pending = null;   // (an ask on screen)
    R._dbg = { evq, asks, get done() { return done; }, get pending() { return pending; }, get state() { return dstate; } };
    let dstate = 'start';
    const answer = (q, a) => NET.push(`${base}/ans/${uid}`, { j: JSON.stringify({ k: q.k, n: q.n, a }) });
    const runAsk = q => {
      const p = q.k === 'turn' ? human.turn(mirror, 0, q.o) : q.k === 'react' ? human.react(mirror, 0, q.o) : human.dealSkill(mirror, 0, q.o);
      pending = q;
      Promise.resolve(p).then(a => { if (pending === q) pending = null; if (!R.closed) answer(q, a); });
    };
    for (;;) {
      if (R.closed || J().G !== mirror) throw 'abort';
      // the host gone quiet for long: give up
      if (Date.now() - lastEv > 120000 && R.meta && NET.now() - (R.meta.hb || 0) > STALE_MS) { roomGone(); throw 'abort'; }
      if (evq.length) {
        const pk = evq.shift();
        // an answer the host no longer waits for (it timed out): its buttons go
        if (pending && pending.after < pk.n) { pending = null; try { J().UIS.resolve = null; } catch (e) {} document.querySelectorAll('#acts .ab').forEach(e => e.remove()); }
        if (pk.s) mirror.apply(pk.s, pk.e, pk.d);
        dstate = 'ev ' + pk.e + ' ' + pk.n;
        await onEvent(pk.e, pk.d);
        dstate = 'done ' + pk.n;
        done = pk.n;
        if (pk.e === 'agari' || pk.e === 'ryuukyoku') NET.push(`${base}/ans/${uid}`, { j: JSON.stringify({ k: 'ack', h: pk.h }) });
        if (pk.e === 'game-end') { over = true; return; }
        continue;
      }
      if (asks.length && asks[0].after <= done) { dstate = 'ask ' + asks[0].k + ' ' + asks[0].n; runAsk(asks.shift()); continue; }
      await new Promise(r => { wake = r; setTimeout(r, 400); });
    }
  }

  // ================================================================ rated: finding opponents
  let mm = null;
  async function seek() {
    await myRating();
    const uid = NET.uid(), t0 = NET.now();
    mm = { t0, off: null, timer: null };
    await NET.set(`janka/mm/${uid}`, { t: t0, r: rating.r, name: myName() });
    NET.dropOnLeave(`janka/mm/${uid}`);
    let list = {};
    mm.off = NET.watch('janka/mm', v => { list = v || {}; const mine = list[uid]; if (mine && mine.c && !R.code) { const c = mine.c; stopSeek(); join(c); } });
    mm.timer = setInterval(async () => {
      if (R.code) return;
      const now = NET.now();
      const wait = Object.entries(list).filter(([u, v]) => v && !v.c && now - (v.t || 0) < 120000).sort((a, b) => a[1].t - b[1].t);
      if (!wait.length || wait[0][0] !== uid) return;   // (the one who has waited longest makes the room)
      const n = wait.length, waited = now - t0;
      if (n >= 4 || (n >= 2 && waited > 15000)) {
        const code = code5(), others = wait.slice(1, 4).map(([u]) => u);
        await enter(code, true, 'rated', 'east');
        for (const u of others) await NET.tx(`janka/mm/${u}`, v => v && !v.c ? Object.assign(v, { c: code }) : undefined);
        stopSeek(true);
        // wait for them to sit down (10 s at most), then start
        const t1 = Date.now(); while (Date.now() - t1 < 10000 && Object.keys(R.seats).length < 1 + others.length) await sleep(300);
        if (Object.keys(R.seats).length >= 2) hostStart(); else { await leave(true); seek(); }
      }
      if (lobbyOpen) drawLobby();
    }, 1500);
    drawLobby();
  }
  function stopSeek() { if (!mm) return; clearInterval(mm.timer); if (mm.off) mm.off(); mm = null; NET.remove(`janka/mm/${NET.uid()}`); }
  async function join(code) {
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const m = await NET.get(`janka/rooms/${code}/meta`);
    if (!m || m.st !== 'wait') { J().toast(TX('ルームが見つかりません', 'Room not found'), 2400); return; }
    const seats = await NET.get(`janka/rooms/${code}/seats`) || {};
    if (Object.keys(seats).length >= 4) { J().toast(TX('満席です', 'The room is full'), 2400); return; }
    await enter(code, false, m.mode, m.len);
    drawLobby();
  }

  // ---------------------------------------------------------------- rating after a rated game
  async function finalNote(ON, d, myRank) {
    const names = ON.names || [];
    if (ON.mode !== 'rated' || !NET) return `<span class="ol-note">${names.filter((n, i) => i && n !== 'BOT').length ? esc(TX('オンライン対戦', 'Online game')) : ''}</span>`;
    const me = await myRating(), opp = (ON.rs || []).filter((r, i) => i !== 0), avg = opp.length ? opp.reduce((a, b) => a + b, 0) / opp.length : 1500;
    const dR = Math.max(-60, Math.min(60, Math.round([30, 10, -10, -30][myRank] + (avg - me.r) / 40)));   // (the rules allow ±60 a game)
    const nr = Math.max(100, me.r + dR);
    try { await NET.set(`janka/pl/${NET.uid()}`, { r: nr, n: (me.n || 0) + 1, name: myName(), t: NET.now() }); rating = { r: nr, n: (me.n || 0) + 1 }; } catch (e) {}
    return `<span class="ol-note">${esc(TX('レート', 'Rating'))} <b>${nr}</b> <em class="${dR >= 0 ? 'up' : 'dn'}">${dR >= 0 ? '+' : ''}${dR}</em></span>`;
  }
  function after(ON, again) { leave(true); if (again) open(); }

  // ================================================================ emotes
  function sendEmote(k) {
    if (!R.code || R._emoT && Date.now() - R._emoT < 2000) return; R._emoT = Date.now();
    NET.push(`${R.base}/emo`, { u: NET.uid(), k, t: NET.now() });
  }
  function showEmote(v) {
    if (!v || !R.order || NET.now() - (v.t || 0) > 15000) return;
    const hs = R.order.indexOf(v.u); if (hs < 0) return;
    const ls = rot(hs, R.host ? 0 : R.k), e = EMO[v.k | 0]; if (!e) return;
    const anchor = ls === 0 ? document.querySelector('#game .me .mb') || document.querySelector('#game .me') : document.querySelector('#opp' + ls);
    const hud = document.querySelector('#game .hud'); if (!hud) return;
    const b = document.createElement('div'); b.className = 'ol-emo'; b.textContent = ja() ? e[0] : e[1];
    hud.appendChild(b);
    if (anchor) { const ar = anchor.getBoundingClientRect(), hr = hud.getBoundingClientRect(), kx = hud.offsetWidth / hr.width, ky = hud.offsetHeight / hr.height;
      b.style.left = Math.round((ar.left - hr.left + ar.width / 2) * kx) + 'px'; b.style.top = Math.round((ar.top - hr.top) * ky - 10) + 'px'; }
    setTimeout(() => b.remove(), 2600);
  }
  function emoteBar() {
    let bt = document.querySelector('#olEmoBtn');
    const on = !!(J().UIS && J().UIS.online);
    if (!bt) { bt = document.createElement('button'); bt.id = 'olEmoBtn'; bt.className = 'ol-emobtn'; bt.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 5h16v10H9l-5 4z"/></svg>';
      const hud = document.querySelector('#game .hud'); if (hud) hud.appendChild(bt);
      bt.addEventListener('click', e => { e.stopPropagation(); let p = document.querySelector('#olEmoPop'); if (p) { p.remove(); return; }
        p = document.createElement('div'); p.id = 'olEmoPop'; p.className = 'ol-emopop';
        p.innerHTML = EMO.map((x, i) => `<button data-k="${i}">${esc(ja() ? x[0] : x[1])}</button>`).join('');
        p.addEventListener('click', ev => { const b = ev.target.closest('[data-k]'); if (b) { sendEmote(+b.dataset.k); p.remove(); } ev.stopPropagation(); });
        bt.parentNode.appendChild(p); }); }
    bt.hidden = !on;
  }
  setInterval(emoteBar, 1000);

  // ================================================================ the lobby
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let lobbyOpen = false, tab = 'rated', status = '', freeLen = 'east';
  function closeLobby() { if (lobbyOpen) { lobbyOpen = false; J().closeModal(); } }
  async function open() {
    if (!avail()) { J().toast(TX('オンライン対戦は公開ページで遊べます', 'Online play works on the published page'), 3000); return; }
    lobbyOpen = true; status = TX('接続しています…', 'Connecting…'); drawLobby();
    try { await NET.ready(); await myRating(); status = ''; }
    catch (e) { console.warn(e); status = TX('接続できませんでした。時間をおいて試してください', 'Could not connect. Please try again later'); }
    drawLobby();
  }
  function seatsHTML() {
    const ss = Object.entries(R.seats || {}).sort((a, b) => (a[1].t || 0) - (b[1].t || 0));
    const rows = [];
    for (let i = 0; i < 4; i++) { const e = ss[i];
      if (e) { const [u, v] = e, c = MJChars.get(v.ch && v.ch.id);
        rows.push(`<div class="ol-seat on"><img src="${c ? J().charImg(c, 'face') : ''}" alt=""><b>${esc(v.name)}${u === R.uid ? ` <small>${esc(TX('（あなた）', '(you)'))}</small>` : ''}${R.meta && R.meta.host === u ? ` <i>${esc(TX('ホスト', 'Host'))}</i>` : ''}</b><span>${R.meta && R.meta.mode === 'rated' ? 'R ' + (v.r || 1500) : ''}</span></div>`); }
      else rows.push(`<div class="ol-seat"><span class="ol-bot">BOT</span><b>${esc(TX('空き（BOTが入ります）', 'Open (a BOT plays)'))}</b></div>`); }
    return rows.join('');
  }
  function drawLobby() {
    if (!lobbyOpen) return;
    const DB = J().DB, rr = rating ? rating.r : 1500;
    let body = '';
    if (status) body = `<p class="ol-st">${esc(status)}</p>`;
    else if (R.code) {
      const host = R.meta && R.meta.host === R.uid, mode = R.meta && R.meta.mode;
      body = `<div class="ol-room"><div class="ol-code"><small>${esc(mode === 'rated' ? TX('レート戦', 'Rated game') : TX('ルームコード', 'Room code'))}</small><b>${mode === 'rated' ? esc(TX('対戦相手がそろいました', 'Opponents found')) : esc(R.code)}</b>
        <span>${esc((R.meta && R.meta.len) === 'south' ? TX('半荘戦', 'South round') : TX('東風戦', 'East round'))} ・ ${esc(TX('スキルあり', 'Skills on'))}</span></div>
        <div class="ol-seats">${seatsHTML()}</div>
        <div class="cbtns">${host && mode !== 'rated' ? `<button class="btn gold" data-a="start">${esc(TX('対局開始', 'Start'))}</button>` : mode !== 'rated' ? `<p class="ol-wait">${esc(TX('ホストの開始を待っています…', 'Waiting for the host to start…'))}</p>` : ''}<button class="btn" data-a="leave">${esc(host ? TX('ルームを閉じる', 'Close room') : TX('退出', 'Leave'))}</button></div></div>`;
    } else {
      body = `<nav class="ol-tabs"><button class="${tab === 'rated' ? 'on' : ''}" data-tab="rated">${esc(TX('レート戦', 'Rated'))}</button><button class="${tab === 'free' ? 'on' : ''}" data-tab="free">${esc(TX('フリー対戦（ルーム）', 'Free (rooms)'))}</button></nav>`;
      if (tab === 'rated') body += `<div class="ol-pane"><div class="ol-rate"><small>${esc(TX('あなたのレート', 'Your rating'))}</small><b>${rr}</b><span>${esc(TX('対局数', 'Games'))} ${rating ? rating.n || 0 : 0}</span></div>
        <p class="ol-d">${esc(TX('東風戦・スキルあり。2人以上そろうと始まり、空いた席は BOT が入ります。', 'East round, skills on. Starts with 2+ players; BOTs fill the empty seats.'))}</p>
        ${mm ? `<p class="ol-wait">${esc(TX('対戦相手を探しています…', 'Looking for opponents…'))}</p><div class="cbtns"><button class="btn" data-a="cancel">${esc(TX('やめる', 'Cancel'))}</button></div>` : `<div class="cbtns"><button class="btn gold" data-a="seek">${esc(TX('対戦相手を探す', 'Find opponents'))}</button></div>`}</div>`;
      else body += `<div class="ol-pane"><p class="ol-d">${esc(TX('ルームを作ってコードを友だちに伝えるか、コードを入れて参加します。空いた席は BOT が入ります。', 'Make a room and share its code, or join with a code. BOTs fill the empty seats.'))}</p>
        <div class="ol-row"><div class="seg ol-len"><button class="${freeLen === 'east' ? 'on' : ''}" data-len="east">${esc(TX('東風戦', 'East'))}</button><button class="${freeLen === 'south' ? 'on' : ''}" data-len="south">${esc(TX('半荘戦', 'South'))}</button></div><button class="btn gold" data-a="make">${esc(TX('ルームを作る', 'Make a room'))}</button></div>
        <div class="ol-row"><input id="olCode" maxlength="5" placeholder="${esc(TX('コード', 'Code'))}" autocomplete="off"><button class="btn" data-a="join">${esc(TX('参加', 'Join'))}</button></div></div>`;
      body += `<div class="ol-name"><small>${esc(TX('表示名', 'Name'))}</small><input id="olName" maxlength="12" value="${esc((DB && DB.oname) || '')}" placeholder="${esc(TX('プレイヤー', 'Player'))}"></div>`;
    }
    const box = J().modal(`<header class="ol-h"><h3>${esc(TX('オンライン対戦', 'Online'))}</h3><button class="x" data-a="close" aria-label="close">×</button></header>${body}`, 'online');
    const nm = box.querySelector('#olName'); if (nm) nm.addEventListener('change', () => { const DB = J().DB; DB.oname = nm.value.trim().slice(0, 12); J()._save(); });
    box.addEventListener('click', async e => {
      const tb = e.target.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; drawLobby(); return; }
      const ln = e.target.closest('[data-len]'); if (ln) { freeLen = ln.dataset.len; drawLobby(); return; }
      const a = e.target.closest('[data-a]'); if (!a) return;
      const k = a.dataset.a;
      try {
        if (k === 'close') { if (mm) stopSeek(); if (R.code && !R.started) await leave(true); lobbyOpen = false; J().closeModal(); return; }
        if (k === 'seek') return seek();
        if (k === 'cancel') { stopSeek(); drawLobby(); return; }
        if (k === 'make') { await enter(code5(), true, 'free', freeLen); drawLobby(); return; }
        if (k === 'join') return join((box.querySelector('#olCode') || {}).value);
        if (k === 'start') return hostStart();
        if (k === 'leave') return leave();
      } catch (err) { console.warn(err); status = /permission/i.test(String(err && (err.code || err.message))) ? TX('オンライン対戦の準備中です（データベースの設定が未公開）', 'Online play is not ready yet (database rules not published)') : TX('うまくいきませんでした', 'Something went wrong'); drawLobby(); setTimeout(() => { status = ''; drawLobby(); }, 3500); }
    });
  }

  window.JankaOnline = { open, leave: () => leave(true), after, finalNote, sendEmote, _showEmote: showEmote, _R: R, _net: NET, MirrorGame, _evFor: evFor, _snapFor: snapFor };
})();
