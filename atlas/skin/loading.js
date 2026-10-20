/* builds the "loading" overlay (see loading.css); window.AtlasLoading.show() / .hide() */
(function () {
  const W = { ja: 'よみこみちゅう', en: 'Loading', zh: '加载中', ko: '불러오는 중', es: 'Cargando', fr: 'Chargement', pt: 'Carregando', de: 'Lädt', hi: 'लोड हो रहा है', ar: 'جارٍ التحميل' };
  let el = null;
  function show(lang) {
    if (el) return el;
    let l = lang; try { l = l || localStorage.getItem('aicoding-lang'); } catch (e) {}
    l = W[l] ? l : 'ja';
    const word = W[l], split = !/^(hi|ar)$/.test(l);
    el = document.createElement('div'); el.className = 'atlas-load'; el.setAttribute('role', 'status');
    el.innerHTML = `<div class="stage"><span class="sh"></span><div class="dk"><i><b></b></i><i></i></div></div><div class="tx">${split ? [...word].map((c, i) => `<span style="animation-delay:${i * .08}s">${c}</span>`).join('') : `<span>${word}</span>`}</div><div class="dots"><i></i><i></i><i></i></div>`;
    (document.body || document.documentElement).appendChild(el);
    return el;
  }
  function hide() { if (!el) return; const e = el; el = null; e.classList.add('out'); setTimeout(() => e.remove(), 500); }
  window.AtlasLoading = { show, hide };
})();
