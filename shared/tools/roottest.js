#!/usr/bin/env node
// Checks the shared-database wiring of every online board game (project consolidation, claude/online-security-setup.md):
//   node shared/tools/roottest.js
// Each <game>/firebase-config.js + shared/onlinesec.js + <game>/online.js is loaded into a sandbox with a fake Firebase SDK that
// records every database path. For every game:
//   published  — the shared project's rules know the game's node: every path is in the shared project, under the node
//   pending    — they do not yet (<node>secv is refused): the page reopens on the game's previous project, with the previous node;
//                a new title without a previous project (no FIREBASE_CONFIG_PREV) stops with 'not-configured' (the page shows 準備中)
//   offline    — the probe fails for another reason: no fallback (the error is reported, the project is not switched)
// and, for all of them: the group of a project is at most MAX games, the nodes are those of shared/tools/secrules.py.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const GAMES = ['shogi', 'chess', 'xiangqi', 'janggi', 'reversi', 'go', 'gomoku', 'hex', 'checkers', 'ugolki', 'fanorona', 'alquerque',
  'tafl', 'agon', 'backgammon', 'ur', 'senet', 'morris', 'mancala', 'connect4', 'dots', 'konane', 'amazons', 'ludo'];
const SOON = ['foxgeese', 'latrunculi', 'patolli'];   // online play not written yet: the config stays null
// games whose online play is not a <game>/online.js page script (2026-11-16): the 3D-only flick games run atlas/online3d.js
// (Online3D.net(game) is their API). They live in a host-only database (secrules.py HOSTS: no game at its root) and have no
// previous project: before their rules are published they must end in 'not-configured' (the card shows 準備中).
const FLICK = { carrom: 1, crokinole: 1 };
GAMES.push(...Object.keys(FLICK));
const scriptOf = g => g === 'alquerque' ? 'fanorona/online.js' : FLICK[g] ? 'atlas/online3d.js' : g + '/online.js';
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

function sandbox(game, mode) {
  const store = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), key: i => [...m.keys()][i], get length() { return m.size; } }; };
  const log = [];   // { pid, path }
  const apps = [];
  const mkApp = cfg => {
    const app = { name: '[DEFAULT]', options: cfg, deleted: false, delete: async () => { app.deleted = true; apps.splice(apps.indexOf(app), 1); } };
    return app;
  };
  const user = { uid: 'U1', isAnonymous: true, providerData: [] };
  const firebase = {
    apps,
    initializeApp(cfg) { const a = mkApp(cfg); apps.push(a); return a; },
    app() { if (!apps[0]) throw new Error('no app'); return apps[0]; },
    auth() { return { currentUser: user, onAuthStateChanged(cb) { Promise.resolve().then(() => cb(user)); return () => {}; }, getRedirectResult: async () => null, signInAnonymously: async () => ({ user }) }; },
    database() {
      const app = firebase.app(), pid = app.options.projectId;
      return {
        ref(p) {
          p = String(p || '');
          log.push({ pid, path: p });
          const denied = () => { const e = new Error(mode === 'offline' ? 'Error: Client is offline.' : 'Permission denied'); if (mode !== 'offline') e.code = 'PERMISSION_DENIED'; return e; };
          // 'pending' / 'offline': the shared project refuses the node's probe; the previous project (and the host's own root) answers
          const refuse = mode !== 'published' && /(^|\/)secv$/.test(p) && pid === S.window.__sharedPid && p !== 'secv';
          return {
            get: async () => { if (refuse) throw denied(); return { val: () => null }; },
            set: async () => {}, update: async () => {}, remove: async () => {},
            on(ev, h) { if (/^\.info\//.test(p)) Promise.resolve().then(() => h({ val: () => (p.endsWith('connected') ? true : 0) })); }, off() {},
            onDisconnect: () => ({ remove: async () => {}, cancel: async () => {} }),
            transaction: async fn => ({ committed: true, snapshot: { val: () => fn(null) } }),
            push: () => ({ key: 'k1' }),
          };
        },
      };
    },
  };
  firebase.database.ServerValue = { TIMESTAMP: { '.sv': 'timestamp' } };
  firebase.auth.GoogleAuthProvider = function () {};
  const S = {
    console: { log() {}, warn() {}, error() {} }, URLSearchParams, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {}, Promise, Date, Math, JSON,
    performance: { now: () => 0 }, crypto: globalThis.crypto, TextEncoder, navigator: { userAgent: 'node', language: 'ja' },
    location: { search: '', hostname: 'core-calmdust.github.io', href: 'https://core-calmdust.github.io/aicoding/' + game + '/', origin: 'https://core-calmdust.github.io', reload() {} },
    localStorage: store(), sessionStorage: store(), firebase, addEventListener() {}, removeEventListener() {},
    document: { createElement: () => ({}), head: { appendChild(el) { Promise.resolve().then(() => el.onload && el.onload()); } }, addEventListener() {}, removeEventListener() {}, visibilityState: 'visible', documentElement: { classList: { add() {} } }, body: { classList: { add() {} } } },
  };
  S.window = S; S.self = S; S.globalThis = S;
  vm.createContext(S);
  return { S, log };
}

async function run(game, mode) {
  const { S, log } = sandbox(game, mode);
  vm.runInContext(read(game + '/firebase-config.js'), S);
  if (game === 'alquerque') S.OL_DB_PREFIX = 'alq/';   // (alquerque/index.html; the page runs fanorona/online.js)
  const cfg = S.FIREBASE_CONFIG, prev = S.FIREBASE_CONFIG_PREV || null;
  const want = { pid: cfg.projectId, root: S.FIREBASE_ROOT || S.OL_DB_PREFIX || '' };
  const back = prev ? { pid: prev.projectId, root: game === 'alquerque' ? 'alq/' : (S.FIREBASE_ROOT_PREV || '') } : null;
  S.__sharedPid = cfg.projectId;
  // the SDK is "already loaded": online.js must not fetch it; App Check is skipped (no site key in the sandbox)
  S.FIREBASE_APPCHECK_SITE_KEY = null; S.FIREBASE_APPCHECK_SITE_KEY_PREV = null;
  vm.runInContext(read('shared/onlinesec.js'), S);
  vm.runInContext(read(scriptOf(game)), S);
  const api = FLICK[game] ? S.Online3D && S.Online3D.net(game) : Object.keys(S).map(k => S[k]).find(v => v && typeof v === 'object' && typeof v.init === 'function' && 'configured' in v);
  if (!api) throw new Error('no online API');
  let err = null;
  try { await Promise.race([api.init(), new Promise((_, rej) => setTimeout(() => rej(new Error('init hung')), 4000))]); } catch (e) { err = e; }
  const exp = !want.root ? want : mode === 'published' ? want : back;
  const out = { game, mode, err: err && String(err.message || err), final: S.firebase.apps[0] && S.firebase.apps[0].options.projectId, bad: [] };
  if (mode === 'offline' && want.root) {
    if (!err) out.bad.push('offline probe did not fail');
    if (out.final !== want.pid) out.bad.push('offline: project switched to ' + out.final);
    return out;
  }
  if (mode === 'pending' && want.root && !prev) {   // a new title in a shared project: 準備中 until the rules are published
    if (!err || !/not-configured/.test(out.err)) out.bad.push('pending without a previous project: want not-configured, got ' + (out.err || 'no error'));
    if (out.final !== want.pid) out.bad.push('pending: project switched to ' + out.final);
    log.filter(l => l.pid === want.pid && !/^\.info\//.test(l.path) && l.path.indexOf(want.root) !== 0).forEach(l => out.bad.push('path ' + l.path + ' (want ' + want.root + ')'));
    return out;
  }
  if (err) { out.bad.push('init failed: ' + out.err); return out; }
  if (!exp) { out.bad.push('no previous project'); return out; }
  if (out.final !== exp.pid) out.bad.push('project ' + out.final + ' ≠ ' + exp.pid);
  // every path written / read after the project is settled is under the node (the probe on the shared project is the only stray one)
  const seen = log.filter(l => l.pid === exp.pid && !/^\.info\//.test(l.path));
  if (seen.length < 3) out.bad.push('too few paths recorded: ' + seen.length);
  seen.forEach(l => { if (exp.root ? l.path.indexOf(exp.root) !== 0 : /^(chess|xiangqi|janggi|go|gomoku|hex|ugolki|fanorona|alq|agon|ur|senet|mancala|connect4|dots|amazons|ludo|carrom|crokinole)\//.test(l.path)) out.bad.push('path ' + l.path + ' (want ' + (exp.root || 'root') + ')'); });
  const stray = log.filter(l => l.pid !== exp.pid && !/^\.info\//.test(l.path) && !/secv$/.test(l.path));
  stray.forEach(l => out.bad.push('stray ' + l.pid + ':' + l.path));
  out.n = seen.length;
  return out;
}

(async () => {
  let fail = 0;
  const groups = {};
  for (const g of GAMES) {
    const S = {}; S.window = S; vm.runInNewContext(read(g + '/firebase-config.js'), S);
    (groups[S.FIREBASE_CONFIG.projectId] = groups[S.FIREBASE_CONFIG.projectId] || []).push(g + (S.FIREBASE_ROOT ? ':' + S.FIREBASE_ROOT : g === 'alquerque' ? ':alq/' : ''));
    for (const mode of ['published', 'pending', 'offline']) {
      const r = await run(g, mode);
      if (r.bad.length) { fail++; console.log('FAIL', g, mode, r.bad.slice(0, 4)); }
    }
  }
  for (const g of SOON) { const S = {}; S.window = S; vm.runInNewContext(read(g + '/firebase-config.js'), S); if (S.FIREBASE_CONFIG !== null) { fail++; console.log('FAIL', g, 'config should stay null until its online play is written'); } }
  // the groups match shared/tools/secrules.py (which game is under which node of which host), at most 4 games per database
  const py = "import json,sys;sys.path.insert(0,'shared/tools');import secrules as s;print(json.dumps({'g':{g:list(p['host']) for g,p in s.GAMES.items() if 'host' in p},'h':getattr(s,'HOSTS',{})}))";
  const PY = JSON.parse(cp.execFileSync('python3', ['-c', py], { cwd: ROOT }).toString()), hosts = PY.g, HOSTONLY = PY.h;
  Object.entries(groups).forEach(([pid, list]) => {
    if (list.length > 4) { fail++; console.log('FAIL', pid, 'has', list.length, 'games'); }
    let host = list.find(x => !x.includes(':'));
    if (!host) {   // a host-only database (secrules.py HOSTS): every game is under a node, all naming the same pseudo host
      const hs = [...new Set(list.map(x => (hosts[x.split(':')[0]] || [])[0]))];
      if (hs.length !== 1 || !HOSTONLY[hs[0]]) { fail++; console.log('FAIL', pid, 'has no host game at the root and no host-only rules', hs); return; }
      host = hs[0];
    }
    list.filter(x => x.includes(':')).forEach(x => {
      const [g, node] = x.split(':'), h = hosts[g];
      if (!h || h[0] !== host || h[1] + '/' !== node) { fail++; console.log('FAIL', g, 'config', host + '/' + node, 'secrules', h); }
    });
    const rules = JSON.parse(read(HOSTONLY[host] || host + '/database.rules.json')).rules;
    if (HOSTONLY[host] && Object.keys(rules).some(k => !list.some(x => x.endsWith(':' + k + '/')))) { fail++; console.log('FAIL', host, 'host-only rules have a node no game uses (or a game at the root)', Object.keys(rules)); }
    list.filter(x => x.includes(':')).forEach(x => { const node = x.split(':')[1].slice(0, -1); if (!rules[node] || !rules[node].secv) { fail++; console.log('FAIL', host, 'rules lack node', node); } });
    console.log(pid.padEnd(22), list.join('  '));
  });
  console.log(fail ? fail + ' FAILED' : 'all ok (' + GAMES.length + ' games × 3 states)');
  process.exit(fail ? 1 : 0);
})();
