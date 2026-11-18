// 雀華：セーブデータのクラウド連携（ユーザー 2026-11-18「Google 連携＋Firebase で」「トップの空いている所に分かりやすく」）。
//
//   Google でログインすると、端末のセーブ（localStorage 'janka-v1' の JSON 文字列そのまま）を Firebase の janka/sync/<uid> = { d, t } に保存し、
//   別の端末でログインすると同じデータで続きから遊べる。設定は fbcfg.js（だつごく！スライドのプロジェクトを借りる）。
//
//   同期の決め方（'janka-cloud' = { uid, t: 最後にそろえた時のクラウドの時刻, h: その時の端末データのハッシュ }）：
//     クラウドに無い → 端末のを上げる
//     この端末で初めての連携 → 同じなら何もしない／端末がまっさら（対局0・キャラ1人）ならクラウドを取る／どちらにも進行があれば選んでもらう
//     2回目以降 → 端末だけ変わった＝上げる、クラウドだけ変わった＝取る（ページを読み直す）、両方変わった＝選んでもらう
//   対局中の自動保存（quiet）は、上げるだけ。クラウド側が変わっていたら何もせず、次にホームで同期した時に決める。
//
//   API: JankaCloud.init(o) / state() / on(fn) / signIn() / signOut() / sync() / touched()
//   o: { key, local() → 端末のセーブの文字列, summary(str) → { chars, coins, games, pt }, fresh(str) → bool, ask(local, cloud) → Promise<'local'|'cloud'|null>, apply(str) }
//   ?mock=1 で Firebase の代わりに localStorage の偽クラウド（テスト用）。
(function () {
  'use strict';
  const CFG = window.JANKA_FIREBASE_CONFIG || null;
  const MOCK = /[?&]mock=1\b/.test(location.search);
  // Google ログインが通るのは承認済みドメインだけ（公開ページ・手元のテスト）。アーティファクト版などでは出さない。
  const HOST_OK = MOCK || /(^|\.)github\.io$/.test(location.hostname) || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const FB_VER = '10.12.2', META = 'janka-cloud';
  const subs = [];
  let gone = false, O = null, app = null, auth = null, db = null, user = null, busy = false, last = 0, err = '', ready = null, qT = 0;

  const LS = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }, del: k => { try { localStorage.removeItem(k); } catch (e) {} } };
  const meta = () => { try { return JSON.parse(LS.get(META)) || {}; } catch (e) { return {}; } };
  const setMeta = m => LS.set(META, JSON.stringify(m));
  const hash = s => { let h = 2166136261; s = s || ''; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + ':' + s.length; };
  const mask = e => { e = String(e || ''); const i = e.indexOf('@'); if (i < 1) return e; const l = e.slice(0, i); return (l.length <= 2 ? l[0] : l.slice(0, 2)) + '***' + e.slice(i); };
  const emit = () => subs.forEach(f => { try { f(state()); } catch (e) {} });
  const state = () => ({ available: !!((CFG || MOCK) && HOST_OK), ready: !!ready, user: user ? { name: user.displayName || '', photo: user.photoURL || '', email: mask(user.email) } : null, busy, last: last || meta().t || 0, err });
  const loadScript = src => { const C = window.__fbScripts = window.__fbScripts || {}; return C[src] || (C[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error(src)); document.head.appendChild(s); })); };
  const T = (p, ms, d) => Promise.race([p, new Promise(r => setTimeout(() => r(d), ms))]);

  // ---------------------------------------------------------------- backend
  function mockBackend() {
    const K = 'janka-mock-cloud', all = () => { try { return JSON.parse(LS.get(K)) || {}; } catch (e) { return {}; } };
    return {
      init: async () => {},
      restore: async () => { const u = LS.get(K + '-user'); user = u ? JSON.parse(u) : null; },
      signIn: async () => { user = { uid: 'mock-uid', displayName: 'Mock', email: 'mock.user@example.com', photoURL: '' }; LS.set(K + '-user', JSON.stringify(user)); },
      signOut: async () => { user = null; LS.del(K + '-user'); },
      get: async () => all()[user.uid] || null,
      put: async v => { const a = all(); a[user.uid] = v; LS.set(K, JSON.stringify(a)); },
    };
  }
  function fbBackend() {
    const init = async () => {
      if (auth) return;
      const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
      await loadScript(base + 'firebase-app-compat.js');
      await Promise.all([loadScript(base + 'firebase-auth-compat.js'), loadScript(base + 'firebase-database-compat.js')]);
      app = firebase.apps.find(a => a.name === 'janka') || firebase.initializeApp(CFG, 'janka');
      const key = window.JANKA_APPCHECK_SITE_KEY;
      if (key && !app.__appCheck) {
        try {
          await loadScript(base + 'firebase-app-check-compat.js');
          if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]appcheckdebug\b/.test(location.search)) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
          app.appCheck().activate(new firebase.appCheck.ReCaptchaEnterpriseProvider(key), true); app.__appCheck = true;
        } catch (e) { console.warn('App Check', e); }
      }
      auth = app.auth(); db = app.database();
    };
    return {
      init,
      restore: async () => { await init();
        try { const r = await T(auth.getRedirectResult(), 8000, null); if (r && r.user) user = r.user; } catch (e) {}
        user = user || await T(new Promise(res => { const off = auth.onAuthStateChanged(u => { off(); res(u); }); }), 12000, null);
        if (user && user.isAnonymous) user = null; },
      signIn: async () => { await init(); const prov = new firebase.auth.GoogleAuthProvider();
        try { user = (await auth.signInWithPopup(prov)).user; }
        catch (e) { if (/popup-blocked|operation-not-supported|popup-closed-by-browser/.test(e.code || '')) { await auth.signInWithRedirect(prov); return; } throw e; } },
      signOut: async () => { await init(); await auth.signOut(); user = null; },
      get: async () => (await db.ref('janka/sync/' + user.uid).get()).val(),
      put: async v => db.ref('janka/sync/' + user.uid).set(v),
    };
  }
  const B = !HOST_OK ? null : MOCK ? mockBackend() : CFG ? fbBackend() : null;
  const why = e => /permission|PERMISSION/.test(String(e && (e.code || e.message))) ? 'rules' : /popup-closed|cancelled-popup|user-cancelled/.test(String(e && e.code)) ? '' : /network|offline|unavailable/i.test(String(e && (e.code || e.message))) ? 'net' : 'fail';

  // ---------------------------------------------------------------- sync
  async function push(local) { if (O.blocked && O.blocked()) { err = 'tamper'; return; } const t = Date.now(); await B.put({ d: local, t }); setMeta({ uid: user.uid, t, h: hash(local) }); last = t; }
  function take(remote) { gone = true; setMeta({ uid: user.uid, t: remote.t, h: hash(remote.d) }); last = remote.t; O.apply(remote.d); }
  async function sync(opt = {}) {
    if (!B || !user || busy || gone) return;   // (gone: the cloud's data is in place and the page reloads)
    busy = true; if (!opt.quiet) { err = ''; emit(); }
    try {
      const local = O.local ? O.local() : (LS.get(O.key) || ''), m = meta(), remote = await B.get();
      if (!remote || typeof remote.d !== 'string') await push(local);
      else if (remote.d === local) { setMeta({ uid: user.uid, t: remote.t, h: hash(local) }); last = remote.t; }
      else if (m.uid !== user.uid) {                               // この端末で初めての連携
        if (opt.quiet) return;
        if (O.fresh(local)) take(remote);
        else { const c = await O.ask(O.summary(local), O.summary(remote.d), remote.t); if (c === 'local') await push(local); else if (c === 'cloud') take(remote); }
      } else {
        const lc = hash(local) !== m.h, rc = remote.t !== m.t;
        if (lc && !rc) await push(local);
        else if (opt.quiet) return;                                // (クラウド側が変わっていたら、ホームでの同期に任せる)
        else if (!lc && rc) take(remote);
        else if (lc && rc) { const c = await O.ask(O.summary(local), O.summary(remote.d), remote.t); if (c === 'local') await push(local); else if (c === 'cloud') take(remote); }
      }
    } catch (e) { err = why(e); console.warn('JankaCloud', e); }
    finally { busy = false; emit(); }
  }

  window.JankaCloud = {
    init(o) {
      O = o;
      if (!B) return;
      // 前に連携した端末だけ、開いた時にログインを戻して同期する（それ以外では Firebase を読み込まない）
      if (meta().uid) ready = (async () => { try { await B.init(); await B.restore(); } catch (e) { err = why(e); } emit(); if (user) await sync(); })();
      addEventListener('visibilitychange', () => { if (document.hidden && user) sync({ quiet: true }); });
    },
    state, on(fn) { subs.push(fn); fn(state()); },
    async signIn() {
      if (!B) return; err = ''; busy = true; emit();
      try { await B.init(); await B.signIn(); } catch (e) { err = why(e); console.warn('JankaCloud', e); }
      busy = false; ready = ready || Promise.resolve(); emit();
      if (user) await sync();
    },
    async signOut() {
      if (!B) return;
      try { if (user) await sync({ quiet: true }); await B.signOut(); } catch (e) {}
      user = null; LS.del(META); last = 0; err = ''; emit();
    },
    sync: () => sync(),
    // セーブのたびに呼ぶ：5秒まとめてから上げる
    touched() { if (!user) return; clearTimeout(qT); qT = setTimeout(() => sync({ quiet: true }), 5000); },
  };
})();
