// Multi-threaded search on the main game pages (common rule 2026-11-08, addendum「本編のマルチスレッド」).
// The page part; shared/mt-sw.js is the service-worker part (imported by the game folder's sw.js).
//
// • Cross-origin isolation (SharedArrayBuffer): the game's sw.js adds Document-Isolation-Policy to the page → Chrome / Edge
//   (desktop) are isolated without COOP, sign-in popups and online play keep working. The first visit reloads once when the
//   worker has just been installed (only where the header can work; `coi-reload:<path>` in localStorage, 15 s window).
// • Other browsers: the option "マルチスレッド" (gear panel, HeaderBar.addOption) — on = reload in COOP / COEP mode (the
//   worker adds them; flag in the Cache API + localStorage). In that mode Google sign-in and online play are off
//   (Online.available = false; a click on online play / sign-in asks to switch back to one thread and reopens it). Off = reload back to normal.
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
//   MTEngine.on() (threads in use now), .coi (COOP mode), .isolated, .helpers(), .perfThreads() (the performance cores), .onChange(fn)
//   MTEngine.init({ sw, light: true, opt: false }): only the isolation (worker, reloads, COOP mode) — the page's own toggle
//   (shared/mtsplit.js shared mode) calls MTEngine.set(v); .want() / .pref() are the same choice ('aicoding-mt')
(function () {
  'use strict';
  if (window.MTEngine) return;
  const DIR = location.pathname.replace(/[^/]*$/, '');
  // (2026-11-15) ?health=1 (engine-health.html): the page's one-thread engine workers start through shared/corestat.js, which
  // reports the core they really run (WebAssembly or JavaScript); the threads' workers (&mt=1, mt-helper) are left as they are
  const CS = [];
  if (/[?&]health=1\b/.test(location.search) && window.Worker && typeof BroadcastChannel === 'function') {
    const OW = window.Worker, PROBE = new URL('corestat.js?v=1', (document.currentScript && document.currentScript.src) || location.href).href;
    new BroadcastChannel('corestat').onmessage = e => { const r = e.data; if (r && CS[r.id]) Object.assign(CS[r.id], r); };
    window.Worker = class extends OW {
      constructor(u, o) {
        let url = u;
        try {
          const a = new URL(String(u), location.href);
          if (a.origin === location.origin && !(o && o.type === 'module') && !/mt-helper|[?&]mt=1\b/.test(a.href)) {
            CS.push({ url: a.pathname + a.search, files: [], mods: [], errs: [] });
            url = PROBE + '&u=' + encodeURIComponent(a.href) + '&id=' + (CS.length - 1);
          }
        } catch (e) { /* the worker as asked */ }
        super(url, o);
      }
    };
  }
  const K_PREF = 'aicoding-mt', K_PREF0 = 'aicoding-mt:' + DIR, K_COI = 'aicoding-mt-coi:' + DIR, K_RELOAD = 'coi-reload:' + location.pathname, K_NODIP = 'aicoding-mt-nodip', K_HEAL = 'aicoding-mt-heal:' + location.pathname;
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
  const helpers = () => Math.max(0, Math.min(HC - 1, TOUCH ? 3 : 7));   // the default (automatic) number of helper threads
  const maxHelpers = () => Math.max(0, HC - 1);                            // PRO mode may use every core the browser reports (at the user's own risk)
  // perfThreads(): the cores worth a search thread by default — the performance cores (2026-11-09, the user's Mac: M4 Pro =
  // 10 performance + 4 efficiency cores; on 14 threads the Lazy SMP searches (reversi, chess, fanorona, gomoku) were no faster or
  // slower than on 8: a thread on an efficiency core runs at about 0.3–0.4 of the speed, and the lead (time control, the answer)
  // may be one of them). The browser tells only the logical cores, so on a Mac the chip's name (WebGL's renderer, e.g.
  // "ANGLE Metal Renderer: Apple M4 Pro") gives the efficiency cores; an Apple chip not in the list: 4 of 10 or more cores (2 of
  // 8 or fewer: half). Other computers (and Intel Macs): every core. Kept in localStorage (aicoding-cpu), one WebGL context once.
  // Used as the default of PRO's thread count and of the deep-analysis pages, and as one of the counts on the bench pages; the
  // automatic count (min(cores − 1, 7) + 1) and what PRO lets one choose (every core) do not change.
  let PERF = 0;
  const perfThreads = () => {
    if (PERF) return PERF;
    const mac = /Mac/.test(navigator.platform || '') || /Macintosh/.test(navigator.userAgent || '') || (navigator.userAgentData && navigator.userAgentData.platform === 'macOS');
    if (!mac || TOUCH || HC < 4) return (PERF = HC);
    let gpu = '';
    const KC = 'aicoding-cpu', c = LS.get(KC);
    if (c && c.startsWith(HC + '|')) gpu = c.slice(String(HC).length + 1);
    else {
      try {
        const cv = document.createElement('canvas'), g = cv.getContext('webgl');
        if (g) { const x = g.getExtension('WEBGL_debug_renderer_info'); gpu = String(g.getParameter(x ? x.UNMASKED_RENDERER_WEBGL : g.RENDERER) || ''); const l = g.getExtension('WEBGL_lose_context'); if (l) l.loseContext(); }
      } catch (e) {}
      LS.set(KC, HC + '|' + gpu);
    }
    if (/Intel|AMD|Radeon|NVIDIA|GeForce/i.test(gpu)) return (PERF = HC);   // (an Intel Mac: no efficiency cores)
    const m = /Apple M(\d+)(?: (Pro|Max|Ultra))?/.exec(gpu), gen = m ? +m[1] : 0, tier = m ? m[2] || '' : '';
    let e = HC >= 10 ? 4 : Math.floor(HC / 2);   // (unknown: the usual 4 efficiency cores)
    if (m) {
      if (!tier) e = gen >= 4 ? (HC >= 9 ? 6 : 4) : 4;          // M1–M3: 4 + 4; M4 / M5: 4 + 6 (3 + 6 binned), 4 + 4 (8 cores)
      else if (tier === 'Ultra') e = gen === 1 ? 4 : 8;
      else if (gen === 1) e = 2;                                // M1 Pro / Max: 6 or 8 + 2
      else if (gen === 3 && tier === 'Pro') e = 6;              // M3 Pro: 5 or 6 + 6
      else e = 4;                                               // M2 Pro / Max, M3 Max, M4 Pro / Max: … + 4
    }
    return (PERF = Math.max(Math.min(HC, 2), HC - e));
  };
  const pref = () => { const v = LS.get(K_PREF); return v !== null ? v : LS.get(K_PREF0); };   // '1' on, '0' off, none: automatic (PC on, phones / tablets off) — one choice for all games (older: per game)
  const want = () => { const p = pref(); return p === '1' || (p !== '0' && !TOUCH); };
  const on = () => ISO && want() && helpers() > 0;
  // Chromium 137+ on a computer: Document-Isolation-Policy can work (worth the one reload after installing the worker)
  // (phones / tablets: only once the option is on — the reload is not worth it while threads stay off there)
  const dipLikely = () => { const d = navigator.userAgentData; if (!d || (d.mobile && pref() !== '1')) return false; const c = (d.brands || []).find(b => /Chromium/.test(b.brand)); return !!c && +c.version >= 137 && LS.get(K_NODIP) !== navigator.userAgent; };

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
    olSwitch: { ja: 'オンライン対戦とGoogleログインは1スレッドで使います。マルチスレッドをオフにして再読み込みしますか？（続きはそのまま開きます）',
      en: 'Online play and Google sign-in run single-threaded. Turn multithreading off and reload? (What you clicked opens right after.)',
      zh: '在线对战和Google登录需在单线程下使用。要关闭多线程并重新载入吗？（之后会直接打开）',
      'zh-TW': '線上對戰與Google登入需在單執行緒下使用。要關閉多執行緒並重新載入嗎？（之後會直接開啟）',
      ko: '온라인 대전과 Google 로그인은 단일 스레드에서 사용합니다. 멀티스레드를 끄고 다시 불러올까요? (누른 항목이 바로 열립니다)',
      es: 'El juego en línea y el inicio de sesión con Google funcionan con un solo hilo. ¿Desactivar el multihilo y recargar? (Lo que pulsaste se abrirá enseguida.)',
      fr: 'Le jeu en ligne et la connexion Google fonctionnent sur un seul fil. Désactiver le multithread et recharger ? (Ce que vous avez choisi s’ouvrira ensuite.)',
      pt: 'O jogo online e o login com Google funcionam com uma só thread. Desativar o multithread e recarregar? (O que você tocou abre em seguida.)',
      de: 'Online-Spiel und Google-Anmeldung laufen mit einem Thread. Multithreading ausschalten und neu laden? (Das Gewählte öffnet sich danach.)',
      ru: 'Онлайн-игра и вход через Google работают в одном потоке. Выключить многопоточность и перезагрузить? (Выбранное откроется сразу после.)',
      tr: 'Çevrim içi oyun ve Google ile giriş tek iş parçacığıyla çalışır. Çoklu iş parçacığı kapatılıp sayfa yeniden yüklensin mi? (Seçtiğiniz hemen açılır.)',
      id: 'Bermain online dan masuk Google berjalan dengan satu thread. Matikan multithread dan muat ulang? (Yang Anda pilih langsung terbuka.)',
      hi: 'ऑनलाइन खेल और Google साइन-इन एक थ्रेड पर चलते हैं। मल्टीथ्रेड बंद करके पेज फिर से लोड करें? (आपका चुना हुआ तुरंत खुलेगा।)',
      ar: 'اللعب عبر الإنترنت وتسجيل الدخول عبر Google يعملان بخيط واحد. هل نوقف تعدد الخيوط ونعيد التحميل؟ (سيُفتح ما اخترته مباشرةً.)' },
    note: { ja: 'ログイン・オンライン対戦は停止中', en: 'Sign-in & online play paused', zh: '登录与在线对战已暂停', 'zh-TW': '登入與線上對戰已暫停', ko: '로그인·온라인 대전 일시 중지', es: 'Sesión y juego en línea en pausa', fr: 'Connexion et jeu en ligne en pause', pt: 'Login e jogo online pausados', de: 'Anmeldung & Online-Spiel pausiert', ru: 'Вход и онлайн-игра отключены', tr: 'Giriş ve çevrim içi oyun duraklatıldı', id: 'Masuk & main online dijeda', hi: 'साइन-इन और ऑनलाइन खेल रुके हैं', ar: 'تسجيل الدخول واللعب عبر الإنترنت متوقفان' },
  };
  const lang = () => { const s = document.getElementById('langSel'); let l = (s && s.value) || document.documentElement.lang || 'ja'; if (/^zh-(tw|hk|mo|hant)/i.test(l)) l = 'zh-TW'; else if (!T.label[l]) l = String(l).slice(0, 2); return T.label[l] ? l : 'en'; };
  const tx = k => T[k][lang()] || T[k].en;

  // ------------------------------------------------------------------ COOP mode: online play / sign-in switch back to one thread
  // (2026-11-09) The COOP / COEP headers keep the Google sign-in popup and App Check's reCAPTCHA frame out, so online play can't
  // run in this mode. The buttons stay: a click on one asks to turn multithreading off, reloads the page normally and then
  // clicks the same button again (sessionStorage K_GO) — online play and sign-in just work, one thread (a human opponent).
  const OL_SEL = '#dock .dock-bar,.dock-bar,.ol-only,#btnOnline,[data-mode=online],[data-v=online],.ng-online,[data-t=online],.gbtn,.atlas-acc,#olBtn,.dk-btn';
  const K_GO = 'aicoding-mt-go:' + location.pathname;
  const selOf = el => { if (el.id) return '#' + CSS.escape(el.id); for (const a of ['data-mode', 'data-v', 'data-t']) if (el.getAttribute(a) === 'online') return `[${a}=online]`; const c = [...el.classList].find(x => /^(ol-only|ng-online|gbtn|atlas-acc|dock-bar|dk-btn)$/.test(x)); return c ? '.' + c : ''; };
  if (COI) {
    document.documentElement.classList.add('mt-coi');
    const offline = () => { if (window.Online && Online.available) { try { Online.available = false; } catch (e) {} } };
    offline();
    const toOne = sel => { if (!confirm(tx('olSwitch'))) return; try { if (sel) sessionStorage.setItem(K_GO, sel); } catch (e) {} LS.set(K_PREF, '0'); setFlag(false).then(reload); };
    addEventListener('click', e => {
      const el = e.target && e.target.closest && e.target.closest(OL_SEL); if (!el) return;
      e.preventDefault(); e.stopImmediatePropagation(); toOne(selOf(el));
    }, true);
    const guardAcc = () => { const A = window.AtlasAccount; if (A && !A.__mt) { A.__mt = 1; A.signIn = async () => { toOne(''); }; } };
    document.addEventListener('DOMContentLoaded', () => { offline(); guardAcc(); });
    addEventListener('load', guardAcc);
  } else {
    // back in the normal mode after that switch: open what was clicked
    let go = null; try { go = sessionStorage.getItem(K_GO); sessionStorage.removeItem(K_GO); } catch (e) {}
    if (go) addEventListener('load', () => setTimeout(() => { try { const el = [...document.querySelectorAll(go)].find(x => x.offsetParent || x.getClientRects().length); if (el) el.click(); } catch (e) {} }, 1200));
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
  let booted = false, touched = false;   // touched: the player has clicked / typed — never reload under them
  ['pointerdown', 'keydown'].forEach(t => addEventListener(t, () => { touched = true; }, { capture: true, once: true }));
  let SWURL = 'sw.js';
  const ensureSW = async () => { try { await navigator.serviceWorker.register(SWURL, { scope: './' }); await navigator.serviceWorker.ready; } catch (e) {} };
  async function boot(swUrl, light) {
    if (booted || !CAN) return; booted = true; SWURL = swUrl;
    // light (a folder whose worker exists only for this — chess, shogi): no worker at all unless threads may be used through
    // Document-Isolation-Policy (Chromium on a computer) or COOP mode was asked for; an installed one is removed. (On iPhone a
    // worker in the folder coincided with the Google sign-in popup being blocked.)
    if (light && !FLAGGED && !ISO && !(want() && (dipLikely() || pref() === '1'))) {
      try { const r = await navigator.serviceWorker.getRegistration('./'); if (r && new URL(r.scope).pathname === new URL('./', location.href).pathname) { try { await (await caches.open(FLAG_CACHE)).delete(FLAG_URL); } catch (e) {} await r.unregister(); } } catch (e) {}
      return;
    }
    let hadReg = false; try { hadReg = !!((await navigator.serviceWorker.getRegistration('./')) || {}).active; } catch (e) {}
    try { await navigator.serviceWorker.register(swUrl, { scope: './' }); } catch (e) { return; }
    // a reload that bypassed the worker (Shift+reload, or an extension's reload such as mouse-gesture tools): this page is not
    // isolated although threads are on and the worker is there — load it once more the normal way, at once
    if (!ISO && !CTRL0 && hadReg && (FLAGGED || (want() && dipLikely())) && !touched && !document.body.classList.contains('in-online') && Date.now() - (+LS.get(K_HEAL) || 0) > 10000) { LS.set(K_HEAL, String(Date.now())); location.reload(); return; }
    let cached = false; try { cached = !!(await (await caches.open(FLAG_CACHE)).match(FLAG_URL)); } catch (e) {}
    if (ISO) {
      if (!FLAGGED && cached) { await setFlag(false); if (!recently()) reload(); return; }   // (the worker gave COOP mode the page did not ask for)
      LS.del(K_RELOAD); return;
    }
    if (FLAGGED) {   // COOP mode asked for but not isolated: make sure the worker knows, reload once; still not → back to normal
      if (!cached) await setFlag(true);
      if (recently() && CTRL0 && await ping()) { await setFlag(false); LS.del(K_PREF); emit(); return; }   // (gave up only when the page really came through our worker: a reload that bypassed it — Shift+reload — proves nothing)
      if (recently()) return;
      await navigator.serviceWorker.ready; reload(); return;
    }
    if (cached) await setFlag(false);
    // turned on (the choice is kept for every game) but no Document-Isolation-Policy here: COOP mode at once (as the option does)
    const toCoop = async () => { if (touched || document.body.classList.contains('in-online')) return; await setFlag(true); await navigator.serviceWorker.ready; reload(); };
    if (pref() === '1' && !dipLikely()) { await toCoop(); return; }
    if (!want() || !dipLikely()) return;
    if (CTRL0 && await ping()) { LS.set(K_NODIP, navigator.userAgent); if (pref() === '1') await toCoop(); return; }   // (only when the page came through our worker and still is not isolated)
    if (recently()) return;   // the page came through our worker and still no isolation: no DIP here
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(res => { navigator.serviceWorker.addEventListener('controllerchange', res, { once: true }); setTimeout(res, 4000); });
    if (!touched && performance.now() < 20000 && !document.body.classList.contains('in-online')) reload();   // (not once the player has started using the page: then from the next visit)
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
  let noToggle = false;   // (init({ opt: false }): the page's own toggle — shared/mtsplit.js in its shared mode — calls set())
  function addOpt() {
    if (opt || !window.HeaderBar || !HeaderBar.addOption) return;
    opt = noToggle ? { sync() {} } : HeaderBar.addOption({ id: 'mt', icon: ICON, label: T.label, type: 'toggle', get: on, set,
      hidden: () => !CAN || helpers() < 1, title: () => tx(COI ? 'coiOff' : ISO && !FLAGGED ? 'auto' : 'reload') });
    if (COI) HeaderBar.addOption({ id: 'mtnote', icon: INFO, label: T.note, type: 'button', title: () => tx('coiOff'), onClick: () => alert(tx('reload')) });
  }
  function init(o) {
    o = o || {};
    if (o.opt === false) noToggle = true;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addOpt); else addOpt();
    const go = () => boot(o.sw || 'sw.js', !!o.light);
    if (document.readyState === 'complete') setTimeout(go, 0); else addEventListener('load', () => setTimeout(go, 0));
  }

  // ------------------------------------------------------------------ the pool of threads
  function pool(cfg) {
    const H = helpers(), HM = Math.max(H, maxHelpers()), SLOT = cfg.slot || (2 << 20);   // H spawned at once, up to HM on demand (PRO)
    const isDone = cfg.isDone || (m => m.type === 'result'), isProg = cfg.isProg || (m => m.type === 'progress');   // the lead's message types
    let ok = false, dead = false, X = null, lead = null, hw = [], ctl = null, cnt = null, job = null, seq = 0, ini = null, memRef = null;
    let why = '';   // (2026-11-14) the reason the threads failed, for MTEngine.status() (claude/praline-spec.md §10 ②)
    const P = { threads: 1 + H, maxThreads: 1 + HM, ready: null, free: () => ok && !dead && (!job || job.cancelled), run, cancel, close, preempt: t => preempt(t),
      state: () => ({ ok, dead, error: why, threads: 1 + hw.length }) };
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
      memRef = mem;
      X = (await WebAssembly.instantiate(module, cfg.imports(mem))).exports;
      const base = Math.ceil(X.mt_heap_base() / 65536) * 65536, n = 1 + HM, need = base + (n + 1) * SLOT;
      if (need > mem.buffer.byteLength) mem.grow(Math.ceil((need - mem.buffer.byteLength) / 65536));
      X.mt_stack(base + n * SLOT + SLOT - 16); X.mt_thread(base + n * SLOT, 999);   // this page's own slot (mt_stop)
      ctl = new Int32Array(new SharedArrayBuffer(512));                // [0]: 1 = stop (the helpers' loop); [8…127]: the game engine's own (reversi: the root split of the solve)
      cnt = new Float64Array(new SharedArrayBuffer(8 * (HM + 2)));       // [id]: a helper's nodes in this job so far
      ini = id => ({ type: 'mtinit', module, mem, id, tls: base + id * SLOT, top: base + id * SLOT + SLOT - 16, ctl, cnt });
      lead = await spawn(cfg.lead, ini(0));                       // (the lead loads the network / tables into the shared memory)
      for (let i = 1; i <= H; i++) hw.push(await spawn(cfg.helper, ini(i)));
      if (cfg.after) await cfg.after(X, mem, [lead].concat(hw));
      lead.onerror = e => { dead = true; why = why || 'lead: ' + ((e && e.message) || 'error'); if (job && job.resolve) job.resolve(undefined); };   // (undefined: the threads failed — run it the usual way; null: cancelled)
      if (dead) { close(); return false; }
      ok = true; return true;
    })().catch(e => { why = why || String((e && e.message) || e); console.warn('[mtengine]', e); close(); return false; });
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
        const nh = msg.mtThreads > 0 ? Math.min(HM, msg.mtThreads - 1) : H;   // (mtThreads: PRO mode's thread count, shared/proset.js — more helpers are started when asked for)
        try {   // more helpers asked for (PRO): start them and give them the same setup as the first ones (weights, tables)
          const add = []; while (hw.length + add.length < nh) add.push(await spawn(cfg.helper, ini(hw.length + add.length + 1)));
          if (add.length && cfg.after) await cfg.after(X, memRef, add);
          hw.push(...add);
        } catch (e) { console.warn('[mtengine] helper', e); }
        const hSum = () => { let s = 0; for (let i = 1; i <= hw.length; i++) s += cnt[i]; return s; };
        const help = cfg.help ? cfg.help(msg) : null, hs = hw.slice(0, nh);   // (mtThreads: PRO mode's thread count, shared/proset.js)
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
        if (left > 0) { dead = true; why = why || 'a helper did not stop'; console.warn('[mtengine] a helper did not stop'); }
        if (job === j) job = null;   // (free before the caller hears of it: it may start the next job at once)
        if (j.resolve) j.resolve(Object.assign({}, res, { nodes: (res.nodes || 0) + hNodes, helperNodes: hNodes, threads: 1 + hs.length, ms: performance.now() - t0 }));
      })().catch(e => { why = why || String((e && e.message) || e); console.warn('[mtengine]', e); dead = true; if (j.resolve) j.resolve(j.cancelled ? null : undefined); }).finally(() => { if (job === j) job = null; if (dead) close(); });
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
  const USES = [];   // every MTEngine.use() of the page (MTEngine.status)
  function use(cfg) {
    let p = null, timer = 0;
    USES.push({ wasm: cfg.wasm, lead: cfg.lead, get: () => p, make: () => make() });
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
  // (2026-11-14, claude/praline-spec.md §10 ②) is the page isolated, are the threads on, did the pools start — and why not.
  // MTEngine.status(true) also starts the pools that have not been made yet and waits for them. Used by engine-health.html.
  async function status(start) {
    const pools = [];
    for (const u of USES) {
      let q = u.get();
      if (!q && start && on()) q = u.make();
      if (q && start) { try { await Promise.race([q.ready, new Promise(r => setTimeout(r, 15000))]); } catch (e) {} }
      pools.push(Object.assign({ wasm: u.wasm, lead: u.lead, made: !!q }, q ? q.state() : {}));
    }
    if (start && CS.length) await new Promise(r => setTimeout(r, 1500));   // (the one-thread workers' cores: shared/corestat.js)
    return { can: CAN, isolated: ISO, coi: COI, on: on(), helpers: helpers(), perf: perfThreads(), touch: TOUCH, pools, workers: CS };
  }
  // engine-health.html opens the page in a frame; an isolated page cannot be read from outside, so it asks by message
  addEventListener('message', e => {
    if (!e.data || e.data.type !== 'mtengine-status' || e.origin !== location.origin || !e.source) return;
    status(true).then(st => e.source.postMessage({ type: 'mtengine-status-r', st }, e.origin), err => e.source.postMessage({ type: 'mtengine-status-r', error: String(err) }, e.origin));
  });
  window.MTEngine = { init, use, pool, on, status, helpers, maxHelpers, perfThreads, onChange: f => subs.push(f), isolated: ISO, coi: COI, flagged: FLAGGED, touch: TOUCH, T,
    set, want, pref, can: CAN, tx };   // (set / want / pref / tx: for shared/mtsplit.js's shared mode, which keeps its own toggle)
})();
