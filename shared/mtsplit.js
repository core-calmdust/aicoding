// Multi-threaded search for the plain-JavaScript engines (common rule 2026-11-08, addendum「本編のマルチスレッド」全タイトル対応):
// several ordinary Web Workers of the game's own engine.js share the ROOT MOVES of one search. No shared memory, so no
// cross-origin isolation, no service worker and no reload — it works the same in every browser, and Google sign-in / online
// play are never affected. (The wasm engines use shared/mtengine.js instead: Lazy SMP on one shared table.)
//
// • The option "マルチスレッド" in the gear panel (HeaderBar.addOption id 'mt', 14 languages) and the choice itself are the same
//   as shared/mtengine.js / mtworkers.js (localStorage 'aicoding-mt'; Safari / Firefox: 'aicoding-mt-w' — '1' on, '0' off, none =
//   automatic: PC on, phones / tablets off).
//   Turning it on / off takes effect at once.
// • Threads: min(logical cores − 1, 7) helpers + 1 (phones / tablets: 3 helpers at most); PRO mode may ask for every core.
// • MTSplit.use(cfg) → { pool(prio), ready(), cancel(tag), threads } (the same shape as MTEngine.use)
//     cfg: { url (the engine worker), setup(worker)? (e.g. send it the opening book), drive(msg, X, onProgress) → Promise<result
//            | undefined (not for threads: do it the usual way)> }
//   pool.free(), pool.run(msg, onProgress, tag) → Promise<result (nodes = all threads, threads, ms, busy = the workers' busy share
//   of threads × ms, cores = the search cores the replies named, e.g. ['wasm']) | null (cancelled) |
//   undefined (failed / not for threads)>, pool.cancel(tag), pool.preempt(tag) — one job at a time.
//   (msg.mtThreads: use only that many threads — PRO mode)
// • X (inside drive): X.n (threads of this job), X.exec(msg, aff, prio) → Promise<reply | null (cancelled / failed)> runs one
//   task on a free worker (higher prio first; preferring the worker that last searched `aff`, for its transposition table),
//   X.drop(promise, hard) abandons a task (hard: its worker is restarted), X.nodes, X.cancelled, X.failed.
// • Drivers for alpha-beta engines that answer { type: 'mtv', m, d, a, b, until, nl } with { v, ok, nodes, exact? } (the value
//   of root move m searched to depth d in the window (a, b), mover's view, fail-soft; until = Date.now() deadline):
//   MTSplit.allValues(X, o) — iterative deepening, every root move with the full window (analysis; near-linear speed-up)
//   MTSplit.bestValue(X, o) — iterative deepening for the best move: the first move alone with the full window (Young Brothers
//     Wait at the root); meanwhile the other workers test the other moves against the score of the previous depths (null
//     window), then against the real alpha; a move that fails high is searched again with (alpha, ∞).
//   MTSplit.ladder — drive() for the engines that speak 'mtplan' / 'mtv' / 'mtpv' / 'mtfin' (ugolki, agon, konane, mancala);
//   in shared mode a plan with `lazy` (mancala; agon / konane only on their bench, 2026-11-09) is searched Lazy SMP style instead ('mtlead' + 'mthelp'), and
//   so is an analysis plan with `lazyAll` (mancala, 2026-11-09: 6 root moves at most, so splitting them left threads idle);
//   'mtlead' carries `job` (the page's message type). A plan with `sticky` sends each task to the worker that last took a task of
//   the same root move when it is free (the engines whose workers keep their own tables: Kōnane without a shared table), and
//   `specRes: 0` lets every other worker test the other moves while the first one is searched (a root-only split, splitMin 99:
//   no worker is needed for the main line).
//   Helpers (shared mode, 2026-11-10): a worker with nothing to do helps a running 'mtv' task through the shared table (the
//   task's late kids, from the last one back, and along the line its worker is on) until the task is done or a real task
//   wants the worker; not with a node budget, one thread or no shared table. plan.help: false / plan.helpMin; msg.mtHelp: 0
//   (the bench's ?help=0) turns it off. shared/tools/mtstep.js simulates it on real threads in lock step.
(function () {
  'use strict';
  if (window.MTSplit) return;
  const K_PREF = 'aicoding-mt';
  const LS = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const TOUCH = !matchMedia('(hover: hover) and (pointer: fine)').matches;
  const HC = navigator.hardwareConcurrency || 2;
  const CAN = typeof Worker === 'function' && HC >= 2;
  // the shared table's size: 16 MB (phones / tablets, ≤ 2 GB), 32 MB (≤ 4 GB or unknown), 64 MB (more memory)
  const ttBytes = () => { const dm = navigator.deviceMemory || 0; return (TOUCH || (dm && dm <= 2) ? 16 : dm >= 8 ? 64 : 32) << 20; };
  const helpers = () => CAN ? Math.max(0, Math.min(HC - 1, TOUCH ? 3 : 7)) : 0;
  const maxHelpers = () => CAN ? Math.max(0, HC - 1) : 0;
  // (the same choice and keys as shared/mtworkers.js: Chromium shares it with the mtengine.js games; elsewhere — Safari, Firefox,
  // where turning it on in a mtengine.js game means the COOP mode — these games keep their own key 'aicoding-mt-w')
  const DIP = !!((navigator.userAgentData && navigator.userAgentData.brands || []).some(b => /Chromium/.test(b.brand)) || /Chrome\/\d/.test(navigator.userAgent));
  const K_OWN = 'aicoding-mt-w', K_SET = DIP ? K_PREF : K_OWN;
  // shared mode (init({ sw })): the game's sw.js isolates the page the way shared/mtengine.js does (its init({ light: true,
  // opt: false }) — Document-Isolation-Policy on Chromium, COOP mode elsewhere only when the option is turned on) and the
  // workers share one transposition table (shared/mttt.js). The choice is then mtengine.js's own ('aicoding-mt' in every
  // browser), so turning it on in Safari / Firefox means the COOP mode, as in chess; without isolation (or with the option on
  // automatic there) the workers run without a shared table, as before.
  let SHG = false;
  const ME = () => SHG && window.MTEngine ? window.MTEngine : null;
  const pref = () => { const M = ME(); if (M) return M.pref(); if (!DIP) { const w = LS.get(K_OWN); if (w !== null) return w; } return LS.get(K_PREF); };
  const want = () => { const p = pref(); return p === '1' || (p !== '0' && !TOUCH); };
  const on = () => CAN && want() && helpers() > 0;
  const SAB = typeof SharedArrayBuffer === 'function' && typeof Atomics === 'object' && !!self.crossOriginIsolated;
  const shared = () => !!ME() && SAB;   // the workers share one table now
  const TTLIB = (() => { try { return new URL('mttt.js?v=1', document.currentScript.src).href; } catch (e) { return '../shared/mttt.js?v=1'; } })();

  const T = {
    label: { ja: 'マルチスレッド', en: 'Multi-threading', zh: '多线程', 'zh-TW': '多執行緒', ko: '멀티스레드', es: 'Multihilo', fr: 'Multithread', pt: 'Multithread', de: 'Multithreading', ru: 'Многопоточность', tr: 'Çoklu iş parçacığı', id: 'Multi-thread', hi: 'मल्टी-थ्रेड', ar: 'تعدد المسارات' },
    auto: { ja: '複数のCPUコアで同時に読みます（分析・ヒント・コーチ・時間で考える強いAI）。',
      en: 'Searches on several CPU cores at once (analysis, hints, coach, the strongest timed AI levels).',
      zh: '同时使用多个CPU核心搜索（分析、提示、教练、按时间思考的最强AI）。',
      'zh-TW': '同時使用多個CPU核心搜尋（分析、提示、教練、按時間思考的最強AI）。',
      ko: '여러 CPU 코어로 동시에 탐색합니다(분석·힌트·코치·시간제 최강 AI).',
      es: 'Busca con varios núcleos de CPU a la vez (análisis, pistas, entrenador y los niveles de IA más fuertes por tiempo).',
      fr: "Calcule sur plusieurs cœurs du processeur à la fois (analyse, indices, coach, niveaux d'IA les plus forts au temps).",
      pt: 'Pesquisa com vários núcleos da CPU ao mesmo tempo (análise, dicas, treinador e os níveis de IA mais fortes por tempo).',
      de: 'Rechnet auf mehreren CPU-Kernen gleichzeitig (Analyse, Tipps, Coach, die stärksten KI-Stufen mit Bedenkzeit).',
      ru: 'Расчёт сразу на нескольких ядрах процессора (анализ, подсказки, тренер, сильнейшие уровни ИИ по времени).',
      tr: 'Aynı anda birden çok CPU çekirdeğiyle arar (analiz, ipuçları, koç, süreye göre oynayan en güçlü yapay zekâ seviyeleri).',
      id: 'Mencari dengan beberapa inti CPU sekaligus (analisis, petunjuk, pelatih, level AI terkuat berbasis waktu).',
      hi: 'एक साथ कई CPU कोर पर खोज करता है (विश्लेषण, संकेत, कोच, समय वाले सबसे मज़बूत AI स्तर)।',
      ar: 'يبحث باستخدام عدة أنوية للمعالج في آن واحد (التحليل والتلميحات والمدرّب وأقوى مستويات الذكاء الاصطناعي بالوقت).' },
  };
  const lang = () => { const s = document.getElementById('langSel'); let l = (s && s.value) || document.documentElement.lang || 'ja'; if (/^zh-(tw|hk|mo|hant)/i.test(l)) l = 'zh-TW'; else if (!T.label[l]) l = String(l).slice(0, 2); return T.label[l] ? l : 'en'; };

  // ------------------------------------------------------------------ the option
  const subs = [];
  let opt = null;
  const emit = () => { subs.forEach(f => { try { f(on()); } catch (e) { console.error(e); } }); if (opt) opt.sync(); };
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M10 10h4v4h-4zM9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></svg>';
  function addOpt() {
    if (opt || !window.HeaderBar || !HeaderBar.addOption) return;
    const M = ME();
    // shared mode: off → on outside an isolated page asks mtengine.js (a reload: Document-Isolation-Policy, or the COOP mode)
    const set = M ? v => { if (v && !M.isolated) M.set(true); else if (!v && M.flagged) M.set(false); else { LS.set(K_PREF, v ? '1' : '0'); emit(); } }
      : v => { LS.set(K_SET, v ? '1' : '0'); emit(); };
    const title = M ? () => M.tx(M.coi ? 'coiOff' : M.isolated || on() ? 'auto' : 'reload') : () => T.auto[lang()] || T.auto.en;
    opt = HeaderBar.addOption({ id: 'mt', icon: ICON, label: T.label, type: 'toggle', get: on, set, hidden: () => helpers() < 1, title });
  }
  // init(): the option; init({ sw: 'sw.js?v=N' }): shared mode (load shared/mtengine.js first)
  function init(o) {
    if (o && o.sw && window.MTEngine && !SHG) { SHG = true; MTEngine.init({ sw: o.sw, light: true, opt: false }); MTEngine.onChange(emit); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addOpt); else addOpt();
  }
  addEventListener('storage', e => { if (e.key === K_PREF || e.key === K_OWN) emit(); });   // (another tab changed the choice)

  // ------------------------------------------------------------------ the pool of workers
  function pool(cfg) {
    const H = helpers(), HM = Math.max(H, maxHelpers());
    let dead = false, job = null, seq = 0, tid = 0, idling = false;
    const W = [], queue = [];
    // sticky jobs (X.sticky — the plan's `sticky`, Kōnane without a shared table, 2026-11-10): aff → the worker that last took a
    // task of it (its own table holds that subtree), and the next task of the same aff goes there when it is free. The test
    // "has ever searched aff" alone is true for every worker after a few depths, so a root move's next depth — and a fail-high's
    // re-search — landed on whichever worker came first, often one without that subtree in its table (Kōnane's root split
    // without a shared table: 2 threads slower than 1 on the user's Mac)
    const last = new Map();
    // shared mode: one table for every worker (cfg.tt !== false; the bench passes false to compare) and the stop flags —
    // ctl[0] the job's epoch (a new job / a cancel stops the tasks of the one before at once), ctl[16 + i] the task of worker
    // i to abandon (a dropped task stops at once instead of running on unheard / restarting the worker)
    const SHM = shared() && cfg.tt !== false;
    let TT = null, CTL = null, age = 0;
    if (SHM) { try { TT = new SharedArrayBuffer(cfg.ttBytes || ttBytes()); CTL = new Int32Array(new SharedArrayBuffer(4 * (16 + HM + 8))); } catch (e) { TT = null; } }
    const P = { threads: 1 + H, maxThreads: 1 + HM, shared: !!TT, ttBytes: TT ? TT.byteLength : 0, ready: Promise.resolve(true), free: () => !dead && (!job || job.cancelled), run, cancel, close, preempt: t => { const j = job; if (j && !j.cancelled && j.tag !== t) cancel(); } };
    function spawn(i) {
      const s = { w: new Worker(cfg.url), task: null, aff: new Set(), i, wd: 0 };
      s.w.onmessage = e => {
        const d = e.data, t = s.task; if (!t || !d || d.id !== t.id || d.type === 'progress') return;
        s.task = null; clearTimeout(s.wd); if (t.aff !== undefined) { if (s.aff.size > 256) s.aff.clear(); s.aff.add(t.aff); }
        if (typeof d.nodes === 'number' && t.job) t.job.X.nodes += d.nodes;
        if (t.job) { t.job.X.busy += performance.now() - t.t0; if (d.core) t.job.X.cores.add(d.core); }   // (the bench: how busy the workers were, and each one's search core)
        t.resolve(d.error ? null : d); pump();
      };
      s.w.onerror = e => { console.warn('[mtsplit]', e.message || e); const t = s.task; s.task = null; if (t && t.job) t.job.X.failed = true; restart(s); if (t) t.resolve(null); pump(); };
      if (TT) s.w.postMessage({ type: 'mtshare', lib: TTLIB, tt: TT, ctl: CTL.buffer, idx: i });
      if (cfg.setup) cfg.setup(s.w);
      return s;
    }
    function restart(s) { clearTimeout(s.wd); try { s.w.terminate(); } catch (e) {} for (const [k, i] of last) if (i === s.i) last.delete(k); if (!dead) W[s.i] = spawn(s.i); }
    // shared mode: ask the worker to stop its task (it answers within a moment and is free again; if not, it is restarted)
    function halt(s) {
      const t = s.task; if (!t) return;
      t.resolve(null);
      if (!TT) { s.task = null; restart(s); return; }
      Atomics.store(CTL, 16 + s.i, t.id);
      clearTimeout(s.wd); s.wd = setTimeout(() => { if (s.task === t) { s.task = null; restart(s); pump(); } }, 3000);
    }
    for (let i = 0; i <= H; i++) W.push(spawn(i));
    function pump() {
      for (let k = 0; k < queue.length;) {
        const q = queue[k], j = q.job;
        if (j.cancelled || dead) { queue.splice(k, 1); q.resolve(null); continue; }
        while (W.length < j.X.n) W.push(spawn(W.length));
        const free = W.slice(0, j.X.n).filter(s => !s.task);
        if (!free.length) break;
        const sticky = j.X.sticky && q.aff !== undefined, li = sticky ? last.get(q.aff) : undefined, lw = li !== undefined && li < j.X.n ? W[li] : null;
        const s = (lw && !lw.task ? lw : null) || (q.aff !== undefined && free.find(x => x.aff.has(q.aff))) || free.find(x => !x.aff.size) || free[0];
        if (sticky) { if (last.size > 4096) last.clear(); last.set(q.aff, s.i); }
        queue.splice(k, 1); s.task = q; q.t0 = performance.now(); s.w.postMessage(Object.assign({}, q.msg, TT ? { id: q.id, _ep: j.ep, _age: j.age } : { id: q.id }));
      }
      // helpers (shared mode, X.onIdle — the drivers' "help the running tasks", 2026-11-10): a task of the job that waits for a
      // worker stops a helper (the stop flag: within one poll of its search); a worker with nothing to do asks the driver for
      // a helper task
      const j = job;
      if (!TT || !j || !j.running || j.cancelled || dead || !j.X) return;
      let want = 0; for (const q of queue) if (q.job === j && !q.help) want++;
      if (want) {
        for (const s of W) { if (want <= 0) break; const t = s.task; if (t && t.help && t.job === j && !t.halted) { t.halted = true; halt(s); want--; } }
        return;
      }
      if (!j.X.onIdle || idling) return;
      let free = 0; for (let i = 0; i < Math.min(W.length, j.X.n); i++) if (!W[i].task) free++;
      if (!free) return;
      idling = true; try { j.X.onIdle(free); } catch (e) { console.warn('[mtsplit]', e); } finally { idling = false; }
    }
    function makeX(j, n) {
      const X = { n, nodes: 0, busy: 0, cores: new Set(), cancelled: false, failed: false, shared: !!TT,
        exec(msg, aff, prio, o) {   // (o.help: a helper task — it gives its worker up to any other task of the job)
          if (j.cancelled || dead) return Promise.resolve(null);
          let res; const p = new Promise(r => { res = r; });
          const q = { id: ++tid, msg, aff, prio: prio || 0, job: j, help: !!(o && o.help), resolve: v => { if (res) { const f = res; res = null; p.done = true; f(v); } } };
          p.tid = q.id;
          let k = queue.length; while (k > 0 && queue[k - 1].prio < q.prio) k--;   // (higher priority first, else in order)
          queue.splice(k, 0, q); pump();
          return p;
        },
        drop(p, hard) {   // abandon a task: a waiting one is taken off the queue; a running one finishes unheard (hard: its worker is restarted)
          const k = queue.findIndex(q => q.id === p.tid); if (k >= 0) { const q = queue.splice(k, 1)[0]; q.resolve(null); return; }
          const s = W.find(x => x.task && x.task.id === p.tid); if (!s) return;
          if (TT) { halt(s); return; }
          if (hard) { const t = s.task; s.task = null; restart(s); t.resolve(null); pump(); } else s.task.resolve(null);
        },
        kick() { pump(); },   // (the driver has new work for the helpers)
        // shared mode: wait (at most ms) until the dropped tasks of this job have stopped and reported their nodes
        settle(ms) { const t0 = Date.now(); return new Promise(r => { const chk = () => { if (!W.some(s => s.task && s.task.job === j) || Date.now() - t0 >= ms) r(); else setTimeout(chk, 1); }; chk(); }); },
      };
      return X;
    }
    function run(msg, onProgress, tag) {
      const prev = job, j = { tag, cancelled: false, running: false, id: ++seq };
      const out = new Promise(r => { j.resolve = v => { if (j.resolve0) { const f = j.resolve0; j.resolve0 = null; f(v); } }; j.resolve0 = r; });   // (once; later calls do nothing — a cancelled job's end used to throw here, and the next job then fell back to one thread)
      job = j;
      j.done = (async () => {
        if (prev) await prev.done;
        if (j.cancelled || dead) { j.resolve(j.cancelled ? null : undefined); return; }
        const n = msg.mtThreads > 0 ? Math.max(1, Math.min(1 + HM, msg.mtThreads)) : 1 + H;
        if (TT) { j.ep = Atomics.add(CTL, 0, 1) + 1; age = age % 63 + 1; j.age = age; }   // (a new epoch: the tasks of the job before stop)
        j.X = makeX(j, n); j.running = true;
        const t0 = performance.now();
        const prog = d => { if (!j.cancelled && onProgress) onProgress(Object.assign({}, d, { nodes: j.X.nodes })); };
        let r;
        try { r = await cfg.drive(msg, j.X, prog); } catch (e) { console.warn('[mtsplit]', e); r = undefined; }
        j.X.onIdle = null;
        for (const s of W.slice()) { const t = s.task; if (t && t.job === j && t.help && !t.halted) { t.halted = true; halt(s); } }   // (the helpers of the job stop)
        if (j.cancelled) r = null; else if (j.X.failed && !r) r = undefined;
        if (job === j) job = null;
        const ms = performance.now() - t0;
        j.resolve(r ? Object.assign({}, r, { nodes: j.X.nodes, threads: n, shared: !!TT, ms, busy: j.X.busy / (ms * n), cores: [...j.X.cores] }) : r);
      })().catch(e => { console.warn('[mtsplit]', e); j.resolve(undefined); }).finally(() => { if (job === j) job = null; });
      return out;
    }
    function cancel(tag) {
      const j = job; if (!j || j.cancelled || (tag !== undefined && j.tag !== tag)) return;
      j.cancelled = true; if (j.X) j.X.cancelled = true; j.resolve(null);
      if (TT) Atomics.add(CTL, 0, 1);   // (every task of the job stops at once)
      for (const s of W.slice()) if (s.task && s.task.job === j) { if (TT) halt(s); else { const t = s.task; s.task = null; restart(s); t.resolve(null); } }
      pump();
    }
    function close() { dead = true; W.forEach(s => clearTimeout(s.wd)); const j = job; if (j) { j.cancelled = true; if (j.X) j.X.cancelled = true; j.resolve(null); } W.forEach(s => { try { s.w.terminate(); } catch (e) {} if (s.task) s.task.resolve(null); }); W.length = 0; queue.splice(0).forEach(q => q.resolve(null)); }
    return P;
  }
  function use(cfg) {
    let p = null, timer = 0;
    const make = () => { clearTimeout(timer); if (!p && on()) p = pool(cfg); return p; };
    const sync = v => { if (v) { if (!p) timer = setTimeout(make, 1500); } else { clearTimeout(timer); if (p) { p.close(); p = null; } } };
    subs.push(sync); sync(on());
    return {
      pool(prio) { if (!on()) return null; const q = make(); if (prio && q && !q.free()) q.preempt(prio); return q && q.free() ? q : null; },
      ready() { return Promise.resolve(on() ? make() : null); },
      cancel(tag) { if (p) p.cancel(tag); },
      get threads() { return p ? p.threads : 1; },
      get shared() { return p ? p.shared : shared() && cfg.tt !== false; },
    };
  }

  // ------------------------------------------------------------------ drivers (alpha-beta: the root moves and the main line are split)
  // The engine answers (all values from the side to move at the node, fail-soft; line = moves after the root):
  //   { type: 'mtv', line, d, wa, wb, until, nl? } → { v, ok, nodes, exact? }   search(node, d, wa, wb) — ok false: out of time / nodes
  //   { type: 'mtkids', line } → { kids: [{ m, s (−1: the opponent moves next, +1: the same side again), t? (a final value, parent's
  //     view) }] } in the engine's own order (its table's move first); [] = a leaf (terminal / repetition: mtv gives its value)
  // S: { X, base, inf, until, nodes (budget, 0 = none), splitMin (split a node only with this depth left or more), splitPly,
  //      lmr: { d, i } (late-move reduction as the engine's own: a reduced null-window test from the i-th move at depth ≥ d) }
  // Young Brothers Wait along the main line ("PV splitting"): a node's first kid is searched first (and split the same way),
  // then its other kids in parallel; the root's other moves are meanwhile tested against the previous depths' score.
  const DEAD = { dead: true };
  const mkTok = parent => { const t = { dead: false, ps: new Set(), kids: new Set(), parent }; if (parent) parent.kids.add(t); return t; };
  function kill(X, t) { if (t.dead) return; t.dead = true; for (const p of t.ps) X.drop(p); t.ps.clear(); for (const k of t.kids) kill(X, k); }
  async function ask(S, msg, aff, prio, tok) {
    const p = S.X.exec(msg, aff, prio); tok.ps.add(p);
    const g = S.help && msg.type === 'mtv' ? helpOn(S, msg, null, p) : null;
    const r = await p; tok.ps.delete(p);
    if (g) helpOff(S, g);
    if (tok.dead) return DEAD;
    if (!r || r.ok === false) { S.timeout = true; return null; }
    if (r.exact === false) S.allEx = false;
    return r;
  }
  // Helpers (shared mode, 2026-11-10 — Kōnane on the user's Mac: Young Brothers Wait left 8 threads 26% busy, ×2.1): a worker
  // with nothing to do helps a running search task through the shared table instead of waiting. A target is a running 'mtv'
  // task (or a helper's own task); a helper takes one of its kids that its worker will reach late — from the last one back
  // (the first kid is the task's own) — and searches it with the window and depth the task's worker will use there (the
  // engine's own late-move reduction: plan.lmr), so the task finds the result in the table when it gets there. The first kid
  // is helped one ply down the same way (its late kids), and so on along the line the task's worker is on. A helper stops
  // when its target is done, or at once when a real task of the job wants its worker (shared/mtsplit.js's pool). Only with
  // the shared table, several threads and no node budget (the budget is all the threads' together: PR #1239), so one thread
  // and the levels decided by positions play as before. plan.help: false turns it off (the bench compares).
  // target: { line, d, wa, wb, kids (null: not asked yet), next (the next kid to give, from the end), hs (its helpers' tasks),
  //           sub (child targets), up, dead, k0 (the first kid's target, help only) }
  function helpOn(S, msg, up, p) {
    const g = { line: msg.line, d: msg.d, wa: msg.wa, wb: msg.wb, kids: null, ask: false, next: -1, hs: new Set(), sub: new Set(), up, p, dead: false, own: !up, seq: ++S.hseq };
    S.tg.add(g); if (up) up.sub.add(g);
    return g;
  }
  function helpOff(S, g) {
    if (g.dead) return; g.dead = true; S.tg.delete(g); if (g.up) g.up.sub.delete(g);
    for (const p of g.hs) S.X.drop(p); g.hs.clear();
    for (const c of [...g.sub]) helpOff(S, c);
  }
  // the next piece of help: [target, kid index] (−1: ask for the kids first) or null
  function helpPick(S) {
    let best = null, bs = -Infinity;
    for (const g of S.tg) {
      if (g.d - 1 < S.helpMin) continue;
      let x = g; while (x && !x.dead && !(x.p && x.p.done)) x = x.up;
      if (x) continue;   // (it or a target above it is done: its helper is about to stop)
      let i;
      if (g.kids === null) { if (g.ask) continue; i = -1; }
      else if (g.next >= 1) i = g.next;
      else continue;
      // the most work first: the deepest target; the tasks' own before the helpers'; the oldest
      const sc = g.d * 1000 + (g.own ? 500 : g.k0h ? 300 : 0) - g.seq * 1e-6;
      if (sc > bs) { bs = sc; best = [g, i]; }
    }
    return best;
  }
  function helpIdle(S, free) {
    const X = S.X;
    for (let n = 0; n < free; n++) {
      const pk = helpPick(S); if (!pk) return;
      const [g, i] = pk, base = S.base;
      if (i < 0) {
        g.ask = true;
        const p = X.exec(Object.assign({}, base, { type: 'mtkids', line: g.line }), g.line[0], -1000, { help: true }); g.hs.add(p);
        p.then(r => {
          g.hs.delete(p); if (g.dead) return;
          if (!r || !r.kids) { g.ask = false; return; }
          g.kids = r.kids; g.next = g.kids.length - 1;
          const k = g.kids[0];   // (the first kid: the target's own worker searches it first — help it one ply down)
          if (k && k.t === undefined && g.d - 1 - 1 >= S.helpMin) { const w = helpWin(g, k); const c = helpOn(S, { line: g.line.concat([k.m]), d: g.d - 1, wa: w[0], wb: w[1] }, g, null); c.k0h = true; }
          X.kick();
        });
        continue;
      }
      const k = g.kids[i]; g.next = i - 1;
      if (k.t !== undefined) { n--; continue; }
      const red = S.lmr && g.d >= S.lmr.d && i >= S.lmr.i ? 1 : 0, dd = g.d - 1 - red;
      if (dd < 1) { n--; continue; }
      const w = helpWin(g, k), msg = Object.assign({}, base, { type: 'mtv', line: g.line.concat([k.m]), d: dd, wa: w[0], wb: w[1], until: S.until });
      const p = X.exec(msg, g.line[0], -1000, { help: true }); g.hs.add(p);
      const c = helpOn(S, msg, g, p);
      p.then(() => { g.hs.delete(p); helpOff(S, c); });
    }
  }
  // the window of kid k of target g (the kid's side to move)
  const helpWin = (g, k) => k.s < 0 ? [-g.wb, -g.wa] : [g.wa, g.wb];
  async function leafV(S, line, d, a, b, tok, prio) {
    const msg = Object.assign({}, S.base, { type: 'mtv', line, d, wa: a, wb: b, until: S.until });
    if (S.nodes) { if (S.X.nodes >= S.nodes) { S.timeout = true; return null; } msg.nl = Math.max(1000, S.nodes - S.X.nodes); }
    const r = await ask(S, msg, line[0], prio, tok);
    return r === null || r === DEAD ? r : r.v;
  }
  // the value of kid k of the node `line` for the node's side to move; d = the node's depth, (a, b) the node's window
  async function kidV(S, line, k, d, a, b, tok, split, red, prio) {
    if (k.t !== undefined) return k.t;
    const l2 = line.concat([k.m]), dd = d - 1 - (red || 0), neg = k.s < 0;
    const ca = neg ? -b : a, cb = neg ? -a : b;
    const v = split ? await nodeV(S, l2, dd, ca, cb, tok) : await leafV(S, l2, dd, ca, cb, tok, prio);
    return v === null || v === DEAD ? v : neg ? -v : v;
  }
  async function nodeV(S, line, d, a, b, tok) {
    const prio = 10 + line.length;
    if (d < S.splitMin || line.length >= S.splitPly) return leafV(S, line, d, a, b, tok, prio);
    const K = await ask(S, Object.assign({}, S.base, { type: 'mtkids', line }), line[0], 100, tok);
    if (K === null || K === DEAD) return K;
    if (!K.kids || K.kids.length < 2) return leafV(S, line, d, a, b, tok, prio);
    const r = await splitNode(S, line, K.kids, d, a, b, tok, null, false);
    return r === null || r === DEAD ? r : r.v;
  }
  // one node searched by several workers → { v (fail-soft), i (the best kid, −1: none above a), st (the kids' bounds) } |
  // null (time / nodes / cancelled: the search of this depth stops) | (root) { timeout: true, v, i, first, st }
  function splitNode(S, line, kids, d, a, b, tok, spec, root) {
    const X = S.X, n = kids.length, me = mkTok(tok);
    const st = kids.map(() => ({ ub: Infinity, lb: -Infinity, ex: null, run: false, spec: false, red: false, fin: false }));
    let alpha = a, best = -Infinity, bi = -1, firstDone = false, running = 0, over = false;
    return new Promise(resolve => {
      const end = v => { if (over) return; over = true; kill(X, me); if (tok) tok.kids.delete(me); resolve(v); };
      const cut = () => end({ v: best, i: bi, st });
      const take = (i, v) => { st[i].fin = true; if (v > best) best = v; if (v > alpha) { alpha = v; bi = i; } };
      const lmrOf = i => S.lmr && line.length > 0 && d >= S.lmr.d && i >= S.lmr.i ? 1 : 0;
      const launch = (i, wa, wb, split, red, prio) => {
        const s = st[i]; s.run = true; running++;
        kidV(S, line, kids[i], d, wa, wb, me, split, red, prio).then(v => {
          running--; s.run = false;
          if (over || v === DEAD) return;
          if (v === null) { end(root ? { timeout: true, v: alpha, i: bi, first: firstDone, st } : null); return; }
          if (i === 0) firstDone = true;
          if (red) { if (v <= wa) { s.ub = Math.min(s.ub, v); take(i, v); } else s.red = true; }   // (a reduced test that fails high: the full depth)
          else if (v <= wa) { s.ub = Math.min(s.ub, v); if (wa <= alpha || i === 0) take(i, v); }
          else if (v >= wb) { s.lb = Math.max(s.lb, v); if (v >= b) { take(i, v); cut(); return; } }
          else { s.ex = v; s.ub = s.lb = v; take(i, v); }
          if (alpha >= b) { cut(); return; }
          step();
        });
      };
      const step = () => {
        if (over) return;
        if (X.cancelled || X.failed) { end(null); return; }
        while (running < X.n) {
          let pick = null;
          if (!firstDone) {
            if (!st[0].run) pick = [0, alpha, b, true, 0, 1];
            else if (spec !== null && spec !== undefined && running < X.n - (S.specRes === undefined ? 1 : S.specRes)) {   // (speculative: keep a worker for the main line)
              for (let i = 1; i < n; i++) { const s = st[i]; if (!s.run && !s.spec && kids[i].t === undefined) { s.spec = true; pick = [i, spec, spec + 1, false, 0, -5]; break; } }
            }
          } else for (let i = 1; i < n; i++) {
            const s = st[i]; if (s.run || s.fin) continue;
            if (kids[i].t !== undefined) { take(i, kids[i].t); if (alpha >= b) { cut(); return; } continue; }
            if (s.ub <= alpha) { take(i, s.ub); continue; }
            if (s.red || s.lb > alpha) pick = [i, alpha, b, true, 0, 0];
            else pick = [i, alpha, alpha + 1, false, s.lb > -Infinity || s.ub < Infinity ? 0 : lmrOf(i), 0];
            break;
          }
          if (!pick) break;
          launch(pick[0], pick[1], pick[2], pick[3], pick[4], 10 + line.length + pick[5]);
        }
        if (!running && firstDone && st.every((s, i) => s.fin || i === 0)) end({ v: best, i: bi, st });
      };
      step();
    });
  }
  // allValues: every root kid with the full window, depth by depth (analysis) — o = { kids, maxD, d0?, step?, onDepth?, stop? }
  // → { list (best first: { m, v }), depth } (the last complete depth) | null (cancelled)
  async function allValues(S, o) {
    let list = null, depth = 0; const cost = new Map(), X = S.X;
    for (let d = o.d0 || 1; d <= o.maxD; d += o.step || 1) {
      if (S.until && Date.now() >= S.until) break;
      const ks = o.kids.slice().sort((x, y) => (cost.get(y.m) || 0) - (cost.get(x.m) || 0));   // (the longest first: less waiting at the end of a depth)
      const tok = mkTok(null);
      S.timeout = false; S.allEx = true;
      const one = async k => {   // (the full window: the same for either side)
        if (k.t !== undefined) return { v: k.t, ex: true };
        const t0 = Date.now(), r = await ask(S, Object.assign({}, S.base, { type: 'mtv', line: [k.m], d: d - 1, wa: -S.inf, wb: S.inf, until: S.until }), k.m, 10, tok);
        cost.set(k.m, Date.now() - t0);
        return r === null || r === DEAD ? null : { v: k.s < 0 ? -r.v : r.v, ex: r.exact !== false };
      };
      const vs = await Promise.all(ks.map(one));
      if (X.cancelled || X.failed) return null;
      if (S.timeout || vs.some(v => !v)) break;   // (out of time: the last complete depth stands)
      list = ks.map((k, i) => ({ m: k.m, v: vs[i].v, exact: vs[i].ex })).sort((x, y) => y.v - x.v); depth = d;
      if (o.onDepth) o.onDepth(list, d);
      if (o.stop && o.stop(list, d, S.allEx)) { if (o.solved) o.solved(S.allEx); break; }
    }
    return { list, depth };
  }
  // bestValue: iterative deepening for the best root kid — o = { kids (likely best first), maxD, d0?, stop(v, d, allExact)?,
  // partialIfBetter? } → { m, v, depth, exact } | null (cancelled)
  async function bestValue(S, o) {
    let kids = o.kids.slice(), best = { m: kids[0].m, v: 0, depth: 0 };
    const hist = [], X = S.X;
    for (let d = o.d0 || 1; d <= o.maxD; d++) {
      if (S.until && Date.now() >= S.until) break;
      if (S.nodes && X.nodes >= S.nodes) break;
      S.timeout = false; S.allEx = true;
      const spec = X.n > 1 && hist.length ? Math.min.apply(null, hist.slice(-2)) : null;
      const r = await splitNode(S, [], kids, d, -S.inf, S.inf, null, spec, true);
      if (X.cancelled) return null;
      if (X.failed || !r) return best;
      const ok = !r.timeout;
      if (r.i >= 0 && (ok || (r.first && (!o.partialIfBetter || r.v >= best.v || d === 1)))) best = { m: kids[r.i].m, v: r.v, depth: d, exact: ok && S.allEx };
      if (!ok) break;
      hist.push(r.v);
      if (o.stop && o.stop(r.v, d, S.allEx)) break;
      const val = i => { const s = r.st[i]; return s.ex !== null ? s.ex : Math.min(s.ub, r.v); };
      const idx = kids.map((k, i) => i).filter(i => i !== r.i).sort((x, y) => val(y) - val(x));
      kids = [kids[r.i]].concat(idx.map(i => kids[i]));
    }
    return best;
  }
  // drive() for the engines that speak 'mtplan' (what to search: a ready result, or the root kids and limits), 'mtv', 'mtkids',
  // 'mtpv' (the line after a root move) and 'mtfin' (the engine's own finishing touches and reply format).
  const ladder = {
    async drive(msg, X, onProgress) {
      const base = Object.assign({}, msg); delete base.id; delete base.mtThreads; delete base.mtHelp;
      const plan = await X.exec(Object.assign({}, base, { type: 'mtplan', job: msg.type }), undefined, 100);
      if (!plan) return X.cancelled ? null : undefined;
      if (plan.result) return plan.result;   // (book, a single move, a weak level…: nothing to search on threads)
      if (!plan.plan) return undefined;
      const p = plan.plan;
      X.sticky = !!p.sticky;
      const S = { X, base, inf: p.inf, until: p.ms ? Date.now() + p.ms : 0, nodes: p.nodes || 0, splitMin: p.splitMin || 4, splitPly: p.splitPly || 8, lmr: p.lmr || null, specRes: p.specRes, timeout: false, allEx: true,
        help: X.shared && X.n > 1 && !p.nodes && p.help !== false && p.help !== 0 && msg.mtHelp !== 0, helpMin: p.helpMin || 2, tg: new Set(), hseq: 0 };
      if (S.help) X.onIdle = free => helpIdle(S, free);
      const kids = p.kids || p.moves.map(m => ({ m, s: -1 }));
      const win = v => !!p.win && Math.abs(v) > p.win;
      const kindOf = v => win(v) ? 'exact' : 'heur';
      let raw;
      if ((p.kind === 'best' ? p.lazy : p.lazyAll) && X.shared && X.n > 1) {
        // Lazy SMP (shared mode, plan.lazy — mancala; on the user's Mac agon / konane were faster with Young Brothers Wait): the first
        // worker plays the job as one thread does ('mtlead': the same search, the same reply) on the shared table, the others
        // search the same root meanwhile ('mthelp': one ply deeper every other helper, from a rotated root order) and stop
        // when it is done
        const until = Date.now() + (p.ms || 600000) + 2000;
        const lead = X.exec(Object.assign({}, base, { type: 'mtlead', job: msg.type }), undefined, 60), hs = [];
        for (let k = 1; k < X.n; k++) hs.push(X.exec(Object.assign({}, base, { type: 'mthelp', k, until, maxD: p.maxD || 60 }), undefined, 50));
        const r = await lead;
        for (const h of hs) X.drop(h);
        if (r) await X.settle(30);   // (the helpers stop within a moment: their nodes count in the job's total)
        if (!r) return X.cancelled ? null : undefined;
        const out = Object.assign({}, r); delete out.id; delete out.type; delete out.nodes;
        return out;
      }
      if (p.kind === 'best') {
        raw = await bestValue(S, { kids, maxD: p.maxD || 60, partialIfBetter: !!p.partialIfBetter, stop: (v, d, ex) => win(v) || (p.solved && ex) });
      } else {
        let solved = false;
        raw = await allValues(S, { kids, maxD: p.maxD || 30, d0: p.d0, step: p.step, solved: ex => { solved = ex; },
          onDepth: p.progress ? (list, d) => onProgress && onProgress({ type: 'progress', list: list.map(e => ({ m: e.m, v: e.v, kind: kindOf(e.v) })), depth: d }) : null,
          stop: (list, d, ex) => (p.stopTop && list.length && win(list[0].v) && d > p.stopTop) || (p.stopAll && list.every(e => win(e.v))) || (p.solved && ex) });
        if (raw) raw.exact = solved;
        if (raw && raw.list && p.pv) {   // the lines after the best few moves, in parallel
          const top = raw.list.slice(0, p.pvK || raw.list.length);
          const pvs = await Promise.all(top.map(e => X.exec(Object.assign({}, base, { type: 'mtpv', m: e.m, plies: p.pv }), e.m, 50)));
          if (X.cancelled) return null;
          top.forEach((e, i) => { e.pv = pvs[i] ? pvs[i].pv : []; });
          raw.list = top.concat(raw.list.slice(top.length));
        }
      }
      if (!raw) return X.cancelled ? null : undefined;
      const fin = await X.exec(Object.assign({}, base, { type: 'mtfin', job: msg.type, raw }), undefined, 100);
      if (!fin) return X.cancelled ? null : undefined;
      return fin.result;
    },
  };

  // autoThreads(): the threads a job uses unless it asks (msg.mtThreads) — min(cores − 1, 7) + 1 (phones 3 + 1), 1 when off
  const autoThreads = () => on() ? 1 + helpers() : 1;
  window.MTSplit = { init, use, pool, on, helpers, maxHelpers, autoThreads, onChange: f => subs.push(f), touch: TOUCH, allValues, bestValue, ladder, T, get shared() { return shared(); }, get sharedGame() { return SHG; } };
})();
