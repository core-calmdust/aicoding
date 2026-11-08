// Multi-threading for the games whose engine is plain JavaScript (common rule 2026-11-08, addendum「本編のマルチスレッド」:
// 全タイトル対応). No shared memory, so no cross-origin isolation and no service worker: a pool of ordinary Workers (the game's
// own worker file) shares out independent tasks — the root moves × throws of an expectiminimax, rollouts, the positions of a
// review. The option 「マルチスレッド」 (gear panel) is the same choice as shared/mtengine.js (localStorage 'aicoding-mt', one
// for every game): automatic = on on a computer, off on phones / tablets (heat, battery) until it is turned on.
//
//   MTWorkers.init()                                   the option item (once per page; harmless when mtengine.js made it)
//   const MW = MTWorkers.use({ url: 'worker.js?v=3', warm?: msg })   one pool per page (made a moment after load while on)
//   MW.on()          threads may be used now        MW.threads   the number of workers (min(cores − 1, 7) + 1; phones 3 + 1)
//   MW.pool(prio)    a ready pool or null (off, busy). prio 'ai': a running job of another kind (analysis…) is cancelled
//   pool.map(tasks, { tag, onEach(i, res) }) → Promise<results[] | null (cancelled) | undefined (a worker failed: do it the
//                    usual way)>. Each task is a message for the worker; the worker answers { id, … } (or { id, error }).
//                    Tasks go to whichever worker is free (dynamic: a slow task does not hold the others up).
//   MW.cancel(tag)   stops the running job (its busy workers are replaced)   MTWorkers.on(), .helpers(), .onChange(fn)
//   MTWorkers.init({ sw }) — shared mode (see below); MTWorkers.shared: the page is isolated and threads are on (the game's
//                    workers may then share memory, e.g. a transposition table in a SharedArrayBuffer)
(function () {
  'use strict';
  if (window.MTWorkers) return;
  const DIR = location.pathname.replace(/[^/]*$/, '');
  const K_PREF = 'aicoding-mt', K_PREF0 = 'aicoding-mt:' + DIR;
  const LS = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const TOUCH = !matchMedia('(hover: hover) and (pointer: fine)').matches;
  const HC = navigator.hardwareConcurrency || 2;
  const CAN = typeof Worker === 'function' && HC >= 2;
  const helpers = () => Math.max(0, Math.min(HC - 1, TOUCH ? 3 : 7));
  // Chromium (Document-Isolation-Policy) shares the choice with mtengine.js games. Elsewhere (Safari, Firefox) turning it on
  // in a mtengine.js game means the COOP mode (no Google sign-in / online play), so these plain-Worker games — which need no
  // isolation — keep their own key there, and switching one of them on never moves chess & co. into the COOP mode.
  const DIP = !!((navigator.userAgentData && navigator.userAgentData.brands || []).some(b => /Chromium/.test(b.brand)) || /Chrome\/\d/.test(navigator.userAgent));
  const K_OWN = 'aicoding-mt-w';
  const K_SET = DIP ? K_PREF : K_OWN;
  // shared mode (init({ sw }), 2026-11-09 — dots: the exact solver's table in shared memory): the game's sw.js isolates the page
  // as shared/mtengine.js does (its init({ light: true, opt: false })) and the choice is then mtengine.js's own ('aicoding-mt' in
  // every browser: turning it on in Safari / Firefox = the COOP mode, as in chess); without isolation the workers run as before
  let SHG = false;
  const ME = () => SHG && window.MTEngine ? window.MTEngine : null;
  const pref = () => { const M = ME(); if (M) return M.pref(); if (!DIP) { const w = LS.get(K_OWN); if (w !== null) return w; } const v = LS.get(K_PREF); return v !== null ? v : LS.get(K_PREF0); };
  const shared = () => !!ME() && typeof SharedArrayBuffer === 'function' && !!self.crossOriginIsolated;
  const want = () => { const p = pref(); return p === '1' || (p !== '0' && !TOUCH); };
  const on = () => CAN && want() && helpers() > 0;
  const T = {
    label: { ja: 'マルチスレッド', en: 'Multi-threading', zh: '多线程', 'zh-TW': '多執行緒', ko: '멀티스레드', es: 'Multihilo', fr: 'Multithread', pt: 'Multithread', de: 'Multithreading', ru: 'Многопоточность', tr: 'Çoklu iş parçacığı', id: 'Multi-thread', hi: 'मल्टी-थ्रेड', ar: 'تعدد المسارات' },
    title: { ja: '複数のCPUコアで同時に読みます（AIの手・ヒント・分析・振り返り）。',
      en: 'Searches on several CPU cores at once (the AI’s moves, hints, analysis, the review).',
      zh: '同时使用多个CPU核心计算（AI着法、提示、分析、复盘）。', 'zh-TW': '同時使用多個CPU核心計算（AI著法、提示、分析、覆盤）。',
      ko: '여러 CPU 코어로 동시에 계산합니다(AI의 수·힌트·분석·복기).',
      es: 'Calcula con varios núcleos de CPU a la vez (jugadas de la IA, pistas, análisis, repaso).',
      fr: 'Calcule sur plusieurs cœurs du processeur à la fois (coups de l’IA, indices, analyse, revue).',
      pt: 'Calcula com vários núcleos da CPU ao mesmo tempo (jogadas da IA, dicas, análise, revisão).',
      de: 'Rechnet auf mehreren CPU-Kernen gleichzeitig (Züge der KI, Tipps, Analyse, Rückblick).',
      ru: 'Расчёт сразу на нескольких ядрах процессора (ходы ИИ, подсказки, анализ, разбор).',
      tr: 'Aynı anda birden çok CPU çekirdeğiyle hesaplar (yapay zekânın hamleleri, ipuçları, analiz, inceleme).',
      id: 'Menghitung dengan beberapa inti CPU sekaligus (langkah AI, petunjuk, analisis, ulasan).',
      hi: 'एक साथ कई CPU कोर पर गणना करता है (AI की चालें, संकेत, विश्लेषण, समीक्षा)।',
      ar: 'يحسب باستخدام عدة أنوية للمعالج في آن واحد (نقلات الذكاء الاصطناعي والتلميحات والتحليل والمراجعة).' },
  };
  const lang = () => { const s = document.getElementById('langSel'); let l = (s && s.value) || document.documentElement.lang || 'ja'; if (/^zh-(tw|hk|mo|hant)/i.test(l)) l = 'zh-TW'; else if (!T.label[l]) l = String(l).slice(0, 2); return T.label[l] ? l : 'en'; };

  const subs = [];
  const emit = () => { subs.forEach(f => { try { f(on()); } catch (e) { console.error(e); } }); if (opt) opt.sync(); };
  let opt = null;
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M10 10h4v4h-4zM9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></svg>';
  function addOpt() {
    if (opt || !window.HeaderBar || !HeaderBar.addOption) return;
    const M = ME();
    // shared mode: off → on outside an isolated page asks mtengine.js (a reload: Document-Isolation-Policy, or the COOP mode)
    const set = M ? v => { if (v && !M.isolated) M.set(true); else if (!v && M.flagged) M.set(false); else { LS.set(K_PREF, v ? '1' : '0'); emit(); } }
      : v => { LS.set(K_SET, v ? '1' : '0'); emit(); };
    const title = M ? () => M.coi ? M.tx('coiOff') : M.isolated || on() ? T.title[lang()] || T.title.en : M.tx('reload') : () => T.title[lang()] || T.title.en;
    opt = HeaderBar.addOption({ id: 'mt', icon: ICON, label: T.label, type: 'toggle', get: on, set, hidden: () => !CAN || helpers() < 1, title });
  }
  // init(): the option; init({ sw: 'sw.js?v=N' }): shared mode (load shared/mtengine.js first)
  function init(o) {
    if (o && o.sw && window.MTEngine && !SHG) { SHG = true; MTEngine.init({ sw: o.sw, light: true, opt: false }); MTEngine.onChange(emit); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addOpt); else addOpt(); setTimeout(addOpt, 0);
  }

  // ------------------------------------------------------------------ the pool
  function pool(cfg) {
    const N = 1 + helpers();
    let ws = [], job = null, seq = 0, dead = false;
    const P = { threads: N, free: () => !dead && !job, map, cancel, close, preempt: t => { if (job && job.tag !== t) cancel(); } };
    const spawn = () => {
      const o = { w: new Worker(cfg.url), cur: null };
      o.w.onmessage = e => { const t = o.cur, d = e.data; if (!t || !d || d.id !== t.id) return; o.cur = null; t.done(d); };
      o.w.onerror = e => { const t = o.cur; o.cur = null; if (t) t.fail(e && e.message || 'worker'); };
      if (cfg.warm) o.w.postMessage(Object.assign({ id: -1 }, cfg.warm));
      return o;
    };
    for (let i = 0; i < N; i++) ws.push(spawn());
    function map(tasks, opts) {
      opts = opts || {};
      if (dead || job) return Promise.resolve(undefined);
      return new Promise(resolve => {
        const j = { tag: opts.tag, out: new Array(tasks.length), next: 0, left: tasks.length, over: false };
        const end = v => { if (j.over) return; j.over = true; if (job === j) job = null; resolve(v); };
        j.end = end; job = j;
        if (!tasks.length) { end(j.out); return; }
        const feed = o => {
          if (j.over || j.next >= tasks.length) return;
          const i = j.next++, id = ++seq;
          o.cur = { id, done: d => { if (j.over) return; if (d.error) { console.warn('[mtworkers]', d.error); end(undefined); return; } j.out[i] = d; if (opts.onEach) { try { opts.onEach(i, d); } catch (e) { console.error(e); } } if (--j.left === 0) end(j.out); else feed(o); },
            fail: m => { console.warn('[mtworkers]', m); end(undefined); } };
          o.w.postMessage(Object.assign({}, tasks[i], { id }));
        };
        ws.forEach(feed);
      });
    }
    function cancel(tag) {
      const j = job; if (!j || (tag !== undefined && j.tag !== tag)) return;
      ws = ws.map(o => { if (!o.cur) return o; o.cur = null; o.w.terminate(); return spawn(); });   // (busy workers are replaced: JS cannot be interrupted)
      j.end(null);
    }
    function close() { dead = true; if (job) job.end(null); ws.forEach(o => o.w.terminate()); ws = []; }
    return P;
  }
  function use(cfg) {
    let p = null, timer = 0;
    const make = () => { clearTimeout(timer); if (!p && on()) p = pool(cfg); return p; };
    const sync = v => { if (v) { if (!p) timer = setTimeout(make, 1500); } else { clearTimeout(timer); if (p) { p.close(); p = null; } } };
    subs.push(sync);
    if (document.readyState === 'complete') sync(on()); else addEventListener('load', () => sync(on()));
    return {
      on,
      pool(prio) { if (!on()) return null; const q = make(); if (prio && q && !q.free()) q.preempt(prio); return q && q.free() ? q : null; },
      cancel(tag) { if (p) p.cancel(tag); },
      get threads() { return on() ? 1 + helpers() : 1; },
    };
  }
  window.MTWorkers = { init, use, pool, on, helpers, onChange: f => subs.push(f), touch: TOUCH, T, get shared() { return shared() && on(); } };
})();
