// Multi-threaded search on the main game pages (common rule 2026-11-08, addendum「本編のマルチスレッド」).
// The page part; shared/mt-sw.js is the service-worker part (imported by the game folder's sw.js).
//
// • Cross-origin isolation (SharedArrayBuffer): the game's sw.js adds Document-Isolation-Policy to the page → Chrome / Edge
//   (desktop) are isolated without COOP, sign-in popups and online play keep working. The first visit reloads once when the
//   worker has just been installed (only where the header can work; `coi-reload:<path>` in localStorage, 15 s window).
// • Other browsers: the option "マルチスレッド" (gear panel, HeaderBar.addOption) — on = reload in COOP / COEP mode (the
//   worker adds them; flag in the Cache API + localStorage). In that mode Google sign-in and online play are off
//   (Online.available = false, html.mt-coi hides the buttons). Off = reload back to normal.
// • Phones / tablets: threads stay off unless the option is turned on (heat, battery), even when the page is isolated.
// • MTEngine.use(cfg) keeps a pool of threads while threads are on: one "lead" worker (the game's engine worker, on the
//   multi-thread build engine_mt.wasm and a shared memory) and helpers that search the same root position meanwhile (Lazy SMP:
//   one transposition table). The page sends a job to the lead; the helpers get cfg.help(job); when the lead's 'result'
//   arrives every thread stops (mt_stop). Only one job at a time: pool.free() false → use the normal one-thread worker.
//
//   MTEngine.init({ sw: 'sw.js' })        register the worker, the option item; call once (early)
//   const MT = MTEngine.use({ wasm, lead, helper, slot, initial, maximum, imports(mem) → importObject, help(job) → msg|null,
//                             after(X, mem, workers)?, isDone(msg)?, isProg(msg)? (the lead's final / progress messages;
//                             default type 'result' / 'progress') }) ; MT.pool() → a ready pool or null, MT.cancel(tag)
//   (job.mtThreads: use only that many threads, lead included — PRO mode)
//   pool.free(), pool.run(job, onProgress, tag) → Promise<result (nodes = all threads) | null (cancelled) | undefined (the
//   threads failed: do it the usual way)>, pool.cancel(tag)
//   MTEngine.on() (threads in use now), .coi (COOP mode), .isolated, .helpers(), .onChange(fn)
(function () {
  'use strict';
  if (window.MTEngine) return;
  const DIR = location.pathname.replace(/[^/]*$/, '');
  const K_PREF = 'aicoding-mt:' + DIR, K_COI = 'aicoding-mt-coi:' + DIR, K_RELOAD = 'coi-reload:' + location.pathname, K_NODIP = 'aicoding-mt-nodip';
  const LS = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
    del: k => { try { localStorage.removeItem(k); } catch (e) {} },
  };
  const FLAG_CACHE = 'aicoding-mt-flag', FLAG_URL = new URL('./', location.href).href + '?mt-coi';
  const ISO = !!self.crossOriginIsolated && typeof SharedArrayBuffer === 'function';
  const FLAGGED = LS.get(K_COI) === '1';
  const COI = ISO && FLAGGED;                    // COOP / COEP mode: no popups → no sign-in / online
  const TOUCH = !matchMedia('(hover: hover) and (pointer: fine)').matches;
  const HC = navigator.hardwareConcurrency || 2;
  const CTRL0 = 'serviceWorker' in navigator && !!navigator.serviceWorker.controller;   // (this page itself came through a worker)
  const CAN = 'serviceWorker' in navigator && !!window.isSecureContext && typeof WebAssembly === 'object' && HC >= 2;   // (no Atomics test: Safari exposes Atomics / SharedArrayBuffer only once the page is isolated)
  const helpers = () => Math.max(0, Math.min(HC - 1, TOUCH ? 3 : 7));
  const pref = () => LS.get(K_PREF);            // '1' on, '0' off, none: automatic (PC on, phones / tablets off)
  const want = () => { const p = pref(); return p === '1' || (p !== '0' && !TOUCH); };
  const on = () => ISO && want() && helpers() > 0;
  // Chromium 137+ on a computer: Document-Isolation-Policy can work (worth the one reload after installing the worker)
  // (phones / tablets: only once the option is on — the reload is not worth it while threads stay off there)
  const dipLikely = () => { const d = navigator.userAgentData; if (!d || (d.mobile && pref() !== '1')) return false; const c = (d.brands || []).find(b => /Chromium/.test(b.brand)); return !!c && +c.version >= 137 && LS.get(K_NODIP) !== navigator.userAgent; };

  const T = {
    label: { ja: 'マルチスレッド', en: 'Multi-threading', zh: '多线程', 'zh-TW': '多執行緒', ko: '멀티스레드', es: 'Multihilo', fr: 'Multithread', pt: 'Multithread', de: 'Multithreading', ru: 'Многопоточность', tr: 'Çoklu iş parçacığı', id: 'Multi-thread', hi: 'मल्टी-थ्रेड', ar: 'تعدد المسارات' },
    auto: { ja: '複数のCPUコアで同時に読みます（分析・ヒント・コーチ・時間で考える強いAI）。レート戦は1スレッドのまま。',
      en: 'Searches on several CPU cores at once (analysis, hints, coach, the strongest timed AI levels). Rated games stay single-threaded.',
      zh: '同时使用多个CPU核心搜索（分析、提示、教练、按时间思考的最强AI）。等级分对局仍为单线程。',
      'zh-TW': '同時使用多個CPU核心搜尋（分析、提示、教練、按時間思考的最強AI）。積分對局仍為單執行緒。',
      ko: '여러 CPU 코어로 동시에 탐색합니다(분석·힌트·코치·시간제 최강 AI). 레이팅전은 단일 스레드 그대로입니다.',
      es: 'Busca con varios núcleos de CPU a la vez (análisis, pistas, entrenador y los niveles de IA más fuertes por tiempo). Las partidas puntuadas siguen con un solo hilo.',
      fr: "Calcule sur plusieurs cœurs du processeur à la fois (analyse, indices, coach, niveaux d'IA les plus forts au temps). Les parties classées restent sur un seul fil.",
      pt: 'Pesquisa com vários núcleos da CPU ao mesmo tempo (análise, dicas, treinador e os níveis de IA mais fortes por tempo). Partidas ranqueadas continuam com uma só thread.',
      de: 'Rechnet auf mehreren CPU-Kernen gleichzeitig (Analyse, Tipps, Coach, die stärksten KI-Stufen mit Bedenkzeit). Wertungspartien bleiben einthreadig.',
      ru: 'Расчёт сразу на нескольких ядрах процессора (анализ, подсказки, тренер, сильнейшие уровни ИИ по времени). Рейтинговые партии — в один поток.',
      tr: 'Aynı anda birden çok CPU çekirdeğiyle arar (analiz, ipuçları, koç, süreye göre oynayan en güçlü yapay zekâ seviyeleri). Puanlı oyunlar tek iş parçacığında kalır.',
      id: 'Mencari dengan beberapa inti CPU sekaligus (analisis, petunjuk, pelatih, level AI terkuat berbasis waktu). Permainan berperingkat tetap satu thread.',
      hi: 'एक साथ कई CPU कोर पर खोज करता है (विश्लेषण, संकेत, कोच, समय वाले सबसे मज़बूत AI स्तर)। रेटेड खेल एक ही थ्रेड पर रहते हैं।',
      ar: 'يبحث باستخدام عدة أنوية للمعالج في آن واحد (التحليل والتلميحات والمدرّب وأقوى مستويات الذكاء الاصطناعي بالوقت). تبقى المباريات المصنّفة على مسار واحد.' },
    reload: { ja: 'オンにするとページを再読み込みし、複数のCPUコアで同時に読みます。その間、Googleログインとオンライン対戦は使えません（オフで元に戻ります）。',
      en: 'Turning it on reloads the page to search on several CPU cores at once. Meanwhile Google sign-in and online play are unavailable (turn it off to restore them).',
      zh: '开启后将重新载入页面，同时使用多个CPU核心搜索。期间无法使用Google登录和在线对战（关闭即可恢复）。',
      'zh-TW': '開啟後會重新載入頁面，同時使用多個CPU核心搜尋。期間無法使用Google登入與線上對戰（關閉即可恢復）。',
      ko: '켜면 페이지를 다시 불러와 여러 CPU 코어로 동시에 탐색합니다. 그동안 Google 로그인과 온라인 대전은 사용할 수 없습니다(끄면 돌아옵니다).',
      es: 'Al activarlo, la página se recarga para buscar con varios núcleos de CPU a la vez. Mientras tanto no hay inicio de sesión con Google ni juego en línea (desactívalo para recuperarlos).',
      fr: "L'activer recharge la page pour calculer sur plusieurs cœurs à la fois. Pendant ce temps, la connexion Google et le jeu en ligne sont indisponibles (désactivez pour les retrouver).",
      pt: 'Ao ativar, a página é recarregada para pesquisar com vários núcleos da CPU. Enquanto isso, o login com Google e o jogo online ficam indisponíveis (desative para voltar).',
      de: 'Beim Einschalten wird die Seite neu geladen, um auf mehreren CPU-Kernen gleichzeitig zu rechnen. Solange sind Google-Anmeldung und Online-Spiel nicht verfügbar (ausschalten stellt sie wieder her).',
      ru: 'При включении страница перезагрузится и будет считать сразу на нескольких ядрах. Пока режим включён, вход через Google и игра онлайн недоступны (выключите, чтобы вернуть).',
      tr: 'Açınca sayfa yeniden yüklenir ve aynı anda birden çok CPU çekirdeğiyle arar. Bu sırada Google ile giriş ve çevrim içi oyun kullanılamaz (kapatınca geri gelir).',
      id: 'Jika diaktifkan, halaman dimuat ulang untuk mencari dengan beberapa inti CPU sekaligus. Selama itu, masuk Google dan bermain online tidak tersedia (matikan untuk memulihkannya).',
      hi: 'चालू करने पर पेज फिर से लोड होगा और एक साथ कई CPU कोर पर खोज करेगा। इस दौरान Google साइन-इन और ऑनलाइन खेल उपलब्ध नहीं रहेंगे (बंद करने पर वापस मिलेंगे)।',
      ar: 'عند التشغيل يُعاد تحميل الصفحة للبحث بعدة أنوية للمعالج معًا. وخلال ذلك لا يتوفر تسجيل الدخول عبر Google ولا اللعب عبر الإنترنت (أوقفه لاستعادتهما).' },
    coiOff: { ja: 'オフにするとページを再読み込みし、Googleログインとオンライン対戦が使えるように戻ります。',
      en: 'Turning it off reloads the page and brings back Google sign-in and online play.',
      zh: '关闭后将重新载入页面，恢复Google登录和在线对战。', 'zh-TW': '關閉後會重新載入頁面，恢復Google登入與線上對戰。',
      ko: '끄면 페이지를 다시 불러와 Google 로그인과 온라인 대전을 다시 사용할 수 있습니다.',
      es: 'Al desactivarlo, la página se recarga y vuelven el inicio de sesión con Google y el juego en línea.',
      fr: 'La désactiver recharge la page et rétablit la connexion Google et le jeu en ligne.',
      pt: 'Ao desativar, a página é recarregada e o login com Google e o jogo online voltam.',
      de: 'Beim Ausschalten wird die Seite neu geladen; Google-Anmeldung und Online-Spiel sind wieder da.',
      ru: 'При выключении страница перезагрузится, и вход через Google и онлайн-игра вернутся.',
      tr: 'Kapatınca sayfa yeniden yüklenir; Google ile giriş ve çevrim içi oyun geri gelir.',
      id: 'Jika dimatikan, halaman dimuat ulang dan masuk Google serta bermain online kembali tersedia.',
      hi: 'बंद करने पर पेज फिर से लोड होगा और Google साइन-इन व ऑनलाइन खेल वापस मिलेंगे।',
      ar: 'عند الإيقاف يُعاد تحميل الصفحة ويعود تسجيل الدخول عبر Google واللعب عبر الإنترنت.' },
    note: { ja: 'ログイン・オンライン対戦は停止中', en: 'Sign-in & online play paused', zh: '登录与在线对战已暂停', 'zh-TW': '登入與線上對戰已暫停', ko: '로그인·온라인 대전 일시 중지', es: 'Sesión y juego en línea en pausa', fr: 'Connexion et jeu en ligne en pause', pt: 'Login e jogo online pausados', de: 'Anmeldung & Online-Spiel pausiert', ru: 'Вход и онлайн-игра отключены', tr: 'Giriş ve çevrim içi oyun duraklatıldı', id: 'Masuk & main online dijeda', hi: 'साइन-इन और ऑनलाइन खेल रुके हैं', ar: 'تسجيل الدخول واللعب عبر الإنترنت متوقفان' },
  };
  const lang = () => { const s = document.getElementById('langSel'); let l = (s && s.value) || document.documentElement.lang || 'ja'; if (/^zh-(tw|hk|mo|hant)/i.test(l)) l = 'zh-TW'; else if (!T.label[l]) l = String(l).slice(0, 2); return T.label[l] ? l : 'en'; };
  const tx = k => T[k][lang()] || T[k].en;

  // ------------------------------------------------------------------ COOP mode: no sign-in, no online play
  if (COI) {
    document.documentElement.classList.add('mt-coi');
    const st = document.createElement('style');
    st.textContent = 'html.mt-coi .gbtn,html.mt-coi .ol-only,html.mt-coi #btnOnline,html.mt-coi .atlas-acc,html.mt-coi [data-mode=online],html.mt-coi [data-v=online],html.mt-coi .ng-online{display:none!important}';
    document.head.appendChild(st);
    const offline = () => { if (window.Online && Online.available) { try { Online.available = false; } catch (e) {} } };
    offline();
    const guardAcc = () => { const A = window.AtlasAccount; if (A && !A.__mt) { A.__mt = 1; A.signIn = async () => { alert(tx('reload')); }; } };
    document.addEventListener('DOMContentLoaded', () => { offline(); guardAcc(); });
    addEventListener('load', guardAcc);
  }

  // ------------------------------------------------------------------ the flag (COOP mode) and the reloads
  async function setFlag(v) {
    if (v) LS.set(K_COI, '1'); else LS.del(K_COI);
    try { const c = await caches.open(FLAG_CACHE); if (v) await c.put(FLAG_URL, new Response('1')); else await c.delete(FLAG_URL); } catch (e) {}
    try { const r = await navigator.serviceWorker.getRegistration('./'); if (r && r.active) r.active.postMessage({ type: 'mt-flag' }); } catch (e) {}
  }
  const reload = () => { LS.set(K_RELOAD, String(Date.now())); location.reload(); };
  const recently = () => Date.now() - (+LS.get(K_RELOAD) || 0) < 15000;
  const ping = () => new Promise(res => {
    const c = navigator.serviceWorker.controller; if (!c) { res(false); return; }
    const to = setTimeout(() => { navigator.serviceWorker.removeEventListener('message', f); res(false); }, 1500);
    const f = e => { if (e.data && e.data.type === 'mt-pong') { clearTimeout(to); navigator.serviceWorker.removeEventListener('message', f); res(!!e.data.nav); } };
    navigator.serviceWorker.addEventListener('message', f); c.postMessage({ type: 'mt-ping' });
  });
  let booted = false;
  let SWURL = 'sw.js';
  const ensureSW = async () => { try { await navigator.serviceWorker.register(SWURL, { scope: './' }); await navigator.serviceWorker.ready; } catch (e) {} };
  async function boot(swUrl, light) {
    if (booted || !CAN) return; booted = true; SWURL = swUrl;
    // light (a folder whose worker exists only for this — chess, shogi): no worker at all unless threads may be used through
    // Document-Isolation-Policy (Chromium on a computer) or COOP mode was asked for; an installed one is removed. (On iPhone a
    // worker in the folder coincided with the Google sign-in popup being blocked.)
    if (light && !FLAGGED && !ISO && !(want() && dipLikely())) {
      try { const r = await navigator.serviceWorker.getRegistration('./'); if (r && new URL(r.scope).pathname === new URL('./', location.href).pathname) { try { await (await caches.open(FLAG_CACHE)).delete(FLAG_URL); } catch (e) {} await r.unregister(); } } catch (e) {}
      return;
    }
    try { await navigator.serviceWorker.register(swUrl, { scope: './' }); } catch (e) { return; }
    let cached = false; try { cached = !!(await (await caches.open(FLAG_CACHE)).match(FLAG_URL)); } catch (e) {}
    if (ISO) {
      if (!FLAGGED && cached) { await setFlag(false); if (!recently()) reload(); return; }   // (the worker gave COOP mode the page did not ask for)
      LS.del(K_RELOAD); return;
    }
    if (FLAGGED) {   // COOP mode asked for but not isolated: make sure the worker knows, reload once; still not → back to normal
      if (!cached) await setFlag(true);
      if (recently()) { await setFlag(false); LS.del(K_PREF); emit(); return; }
      await navigator.serviceWorker.ready; reload(); return;
    }
    if (cached) await setFlag(false);
    if (!want() || !dipLikely()) return;
    if (recently() || (CTRL0 && await ping())) { LS.set(K_NODIP, navigator.userAgent); return; }   // the page came through our worker and still no isolation: no DIP here
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(res => { navigator.serviceWorker.addEventListener('controllerchange', res, { once: true }); setTimeout(res, 4000); });
    if (performance.now() < 20000 && !document.body.classList.contains('in-online')) reload();   // (later: next visit)
  }

  // ------------------------------------------------------------------ the option
  const subs = [];
  const emit = () => { subs.forEach(f => { try { f(on()); } catch (e) { console.error(e); } }); if (opt) opt.sync(); };
  let opt = null;
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M10 10h4v4h-4zM9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></svg>';
  const INFO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>';
  function set(v) {
    if (v) {
      if (ISO) { LS.set(K_PREF, '1'); emit(); return; }
      const prev = pref(); LS.set(K_PREF, '1');
      if (dipLikely()) { reload(); return; }   // Chromium: Document-Isolation-Policy first (sign-in stays); if it does not work, the next time asks for COOP mode
      if (!confirm(tx('reload'))) { if (prev === null) LS.del(K_PREF); else LS.set(K_PREF, prev); return; }
      ensureSW().then(() => setFlag(true)).then(reload);
    } else {
      LS.set(K_PREF, '0');
      if (FLAGGED) { setFlag(false).then(reload); return; }
      emit();
    }
  }
  function addOpt() {
    if (opt || !window.HeaderBar || !HeaderBar.addOption) return;
    opt = HeaderBar.addOption({ id: 'mt', icon: ICON, label: T.label, type: 'toggle', get: on, set,
      hidden: () => !CAN || helpers() < 1, title: () => tx(COI ? 'coiOff' : ISO && !FLAGGED ? 'auto' : 'reload') });
    if (COI) HeaderBar.addOption({ id: 'mtnote', icon: INFO, label: T.note, type: 'button', title: () => tx('coiOff'), onClick: () => alert(tx('reload')) });
  }
  function init(o) {
    o = o || {};
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addOpt); else addOpt();
    const go = () => boot(o.sw || 'sw.js', !!o.light);
    if (document.readyState === 'complete') setTimeout(go, 0); else addEventListener('load', () => setTimeout(go, 0));
  }

  // ------------------------------------------------------------------ the pool of threads
  function pool(cfg) {
    const H = helpers(), SLOT = cfg.slot || (2 << 20);
    const isDone = cfg.isDone || (m => m.type === 'result'), isProg = cfg.isProg || (m => m.type === 'progress');   // the lead's message types
    let ok = false, dead = false, X = null, lead = null, hw = [], ctl = null, cnt = null, job = null, seq = 0;
    const P = { threads: 1 + H, ready: null, free: () => ok && !dead && (!job || job.cancelled), run, cancel, close, preempt: t => preempt(t) };
    const spawn = (url, msg) => new Promise((res, rej) => {
      const w = new Worker(url);
      w.onerror = e => rej(e.message || 'worker');
      w.onmessage = e => { if (e.data && e.data.type === 'mtready') { if (e.data.error) rej(e.data.error); else res(w); } };
      w.postMessage(msg);
    });
    P.ready = (async () => {
      const resp = await fetch(cfg.wasm);
      const module = WebAssembly.compileStreaming && /wasm/.test(resp.headers.get('content-type') || '') ? await WebAssembly.compileStreaming(resp) : await WebAssembly.compile(await resp.arrayBuffer());
      const mem = new WebAssembly.Memory({ initial: cfg.initial || 512, maximum: cfg.maximum || 16384, shared: true });
      X = (await WebAssembly.instantiate(module, cfg.imports(mem))).exports;
      const base = Math.ceil(X.mt_heap_base() / 65536) * 65536, n = 1 + H, need = base + (n + 1) * SLOT;
      if (need > mem.buffer.byteLength) mem.grow(Math.ceil((need - mem.buffer.byteLength) / 65536));
      X.mt_stack(base + n * SLOT + SLOT - 16); X.mt_thread(base + n * SLOT, 999);   // this page's own slot (mt_stop)
      ctl = new Int32Array(new SharedArrayBuffer(16));                 // [0]: 1 = stop (the helpers' loop)
      cnt = new Float64Array(new SharedArrayBuffer(8 * (H + 2)));       // [id]: a helper's nodes in this job so far
      const ini = id => ({ type: 'mtinit', module, mem, id, tls: base + id * SLOT, top: base + id * SLOT + SLOT - 16, ctl, cnt });
      lead = await spawn(cfg.lead, ini(0));                       // (the lead loads the network / tables into the shared memory)
      for (let i = 1; i <= H; i++) hw.push(await spawn(cfg.helper, ini(i)));
      if (cfg.after) await cfg.after(X, mem, [lead].concat(hw));
      lead.onerror = () => { dead = true; if (job && job.resolve) job.resolve(undefined); };   // (undefined: the threads failed — run it the usual way; null: cancelled)
      if (dead) { close(); return false; }
      ok = true; return true;
    })().catch(e => { console.warn('[mtengine]', e); close(); return false; });
    const stopAll = () => { if (ctl) Atomics.store(ctl, 0, 1); if (X) X.mt_stop(1); };
    function run(msg, onProgress, tag) {
      const prev = job, j = { tag, onProgress, cancelled: false, running: false, id: ++seq };
      const out = new Promise(r => { j.resolve = v => { if (j.resolve) { const f = r; j.resolve = null; f(v); } }; });
      job = j;
      j.done = (async () => {
        if (prev) await prev.done;
        if (j.cancelled || !ok || dead) { if (j.resolve) j.resolve(j.cancelled ? null : undefined); return; }
        j.running = true;
        Atomics.store(ctl, 0, 0); X.mt_stop(0); cnt.fill(0);
        const hSum = () => { let s = 0; for (let i = 1; i <= H; i++) s += cnt[i]; return s; };
        const help = cfg.help ? cfg.help(msg) : null, hs = msg.mtThreads > 0 ? hw.slice(0, msg.mtThreads - 1) : hw;   // (mtThreads: PRO mode's thread count, shared/proset.js)
        let hNodes = 0, left = help ? hs.length : 0;
        const hDone = new Promise(res => {
          if (!left) { res(); return; }
          hs.forEach(w => { w.onmessage = e => { const m = e.data; if (m && m.type === 'done' && m.job === j.id) { hNodes += m.nodes || 0; if (--left === 0) res(); } }; w.postMessage(Object.assign({}, help, { type: 'help', job: j.id })); });
        });
        const t0 = performance.now();
        const res = await new Promise(res => {
          lead.onmessage = e => { const m = e.data; if (!m || m.id !== j.id) return; if (isProg(m)) { if (!j.cancelled && j.onProgress) j.onProgress(typeof m.nodes === 'number' && H ? Object.assign({}, m, { nodes: m.nodes + hSum() }) : m); return; } if (isDone(m)) res(m); };
          lead.postMessage(Object.assign({}, msg, { id: j.id }));
        });
        stopAll();
        await Promise.race([hDone, new Promise(r => setTimeout(r, 8000))]);
        if (left > 0) { dead = true; console.warn('[mtengine] a helper did not stop'); }
        if (job === j) job = null;   // (free before the caller hears of it: it may start the next job at once)
        if (j.resolve) j.resolve(Object.assign({}, res, { nodes: (res.nodes || 0) + hNodes, helperNodes: hNodes, threads: 1 + hs.length, ms: performance.now() - t0 }));
      })().catch(e => { console.warn('[mtengine]', e); dead = true; if (j.resolve) j.resolve(j.cancelled ? null : undefined); }).finally(() => { if (job === j) job = null; if (dead) close(); });
      return out;
    }
    function preempt(tag) {   // the AI's move goes first: a running job of another kind (analysis, coach, …) is cancelled
      const j = job; if (j && !j.cancelled && j.tag !== tag) cancel();
    }
    function cancel(tag) {
      const j = job; if (!j || j.cancelled || (tag !== undefined && j.tag !== tag)) return;
      j.cancelled = true; if (j.resolve) j.resolve(null);
      if (j.running) stopAll();
    }
    function close() { dead = true; ok = false; try { stopAll(); } catch (e) {} if (lead) lead.terminate(); hw.forEach(w => w.terminate()); lead = null; hw = []; if (job && job.resolve) job.resolve(job.cancelled ? null : undefined); }
    return P;
  }
  // one pool while threads are on (made a moment after the page has loaded, or on first use)
  function use(cfg) {
    let p = null, timer = 0;
    const make = () => { clearTimeout(timer); if (!p && on()) p = pool(cfg); return p; };
    const sync = v => { if (v) { if (!p) timer = setTimeout(make, 1500); } else { clearTimeout(timer); if (p) { p.close(); p = null; } } };
    subs.push(sync); sync(on());
    return {
      pool(prio) { if (!on()) return null; const q = make(); if (prio && q && !q.free()) q.preempt(prio); return q && q.free() ? q : null; },   // prio ('ai'): take the threads from a background job
      ready() { if (!on()) return Promise.resolve(null); const q = make(); return q.ready.then(okk => okk ? q : null); },
      cancel(tag) { if (p) p.cancel(tag); },
      get threads() { return p ? p.threads : 1; },
    };
  }
  window.MTEngine = { init, use, pool, on, helpers, onChange: f => subs.push(f), isolated: ISO, coi: COI, touch: TOUCH, T };
})();
