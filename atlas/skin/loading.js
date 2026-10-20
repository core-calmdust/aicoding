/* builds the "loading" overlay (see loading.css); window.AtlasLoading.show() / .hide() */
(function () {
  const W = { ja: 'よみこみちゅう', en: 'Loading', zh: '加载中', ko: '불러오는 중', es: 'Cargando', fr: 'Chargement', pt: 'Carregando', de: 'Lädt', hi: 'लोड हो रहा है', ar: 'جارٍ التحميل' };
  let el = null, t0 = 0;
  const MIN = 1000;   // it's cute — keep it on screen for at least a second
  function show(lang) {
    if (el) return el;
    let l = lang; try { l = l || localStorage.getItem('aicoding-lang'); } catch (e) {}
    l = W[l] ? l : 'ja';
    const word = W[l], split = !/^(hi|ar)$/.test(l);
    t0 = performance.now();
    el = document.createElement('div'); el.className = 'atlas-load'; el.setAttribute('role', 'status');
    el.innerHTML = `<div class="stage"><span class="sh"></span><div class="dk"><i><b></b></i><i></i></div></div><div class="tx">${split ? [...word].map((c, i) => `<span style="animation-delay:${i * .08}s">${c}</span>`).join('') : `<span>${word}</span>`}</div><div class="dots"><i></i><i></i><i></i></div>`;
    (document.body || document.documentElement).appendChild(el);
    return el;
  }
  function hide() { document.documentElement.classList.add('atlas-ready'); if (!el) return; const e = el; el = null; setTimeout(() => { e.classList.add('out'); setTimeout(() => e.remove(), 500); }, Math.max(0, MIN - (performance.now() - t0))); }
  window.AtlasLoading = { show, hide };
})();
