// The automatic mode of the measuring pages (<game>/bench.html?auto=1), driven by bench-all.html (the site's root).
// Without ?auto=1 this file does nothing (the page is used by hand as before).
// ?auto=1: wait until the page is isolated as it would be by hand (its own sw.js / reload; once more here if needed), wait
// for 「開始」, press it with the default settings, wait for the end, keep the copied text (the page's `lines`) in
// localStorage (aicoding-bench-all, the same origin) and go back to bench-all.html, which opens the next one.
// ?quick=1 (a check of the mechanism only): at most 2 threads and the lightest settings.
// Load it first in <head> (before the page's scripts: the quick mode lowers navigator.hardwareConcurrency).
(function () {
  'use strict';
  const Q = new URLSearchParams(location.search);
  if (!Q.has('auto')) return;
  const KEY = 'aicoding-bench-all', QUICK = Q.has('quick');
  const ID = location.pathname.split('/').slice(-2)[0];
  if (QUICK) { const hc = Math.min(navigator.hardwareConcurrency || 2, 2); try { Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', { get: () => hc, configurable: true }); } catch (e) {} }
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const $ = s => document.querySelector(s);
  const chromiumPC = (() => { const d = navigator.userAgentData; if (!d || d.mobile) return false; const c = (d.brands || []).find(b => /Chromium/.test(b.brand)); return !!c && +c.version >= 137; })();
  let S = load();
  const inRun = () => !!(S && S.running && S.cur === ID);
  const back = () => location.replace('../bench-all.html' + (QUICK ? '?quick=1' : ''));
  const text = () => { try { if (typeof lines !== 'undefined' && lines && lines.length) return lines.join('\n'); } catch (e) {} const l = $('#log'); return l ? l.textContent : ''; };   // (the page's own `lines`: what 「結果をコピー」 copies)
  let bar = null, wake = null;
  const show = msg => { if (bar) bar.querySelector('span').textContent = msg; };
  function banner() {
    bar = document.createElement('div');
    bar.setAttribute('style', 'position:sticky;top:0;z-index:99;display:flex;gap:10px;align-items:center;justify-content:space-between;padding:8px 16px;background:var(--acc,#a8562a);color:#fff;font:600 13px/1.4 system-ui,sans-serif');
    const n = S && S.queue ? S.queue.indexOf(ID) + 1 : 0;
    bar.innerHTML = '<span></span><button type="button" style="font:inherit;padding:4px 12px;border-radius:999px;border:1.5px solid #fff;background:transparent;color:#fff;cursor:pointer">中止</button>';
    bar.querySelector('button').onclick = () => { S = load(); if (S && S.running) { S.running = false; S.stopped = Date.now(); save(S); } back(); };
    document.body.prepend(bar);
    bar.dataset.head = (n ? `全部測る ${n}/${S.queue.length}：` : '自動実行：') + document.title.replace(/\s*MT ベンチ$/, '');
    show(bar.dataset.head + ' 準備中…');
  }
  async function lock() { try { if ('wakeLock' in navigator && document.visibilityState === 'visible') { wake = await navigator.wakeLock.request('screen'); } } catch (e) {} }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !wake) lock(); });
  function finish(res) {
    S = load();
    if (!inRun()) { show(bar.dataset.head + ' ' + (res.status === 'ok' ? '完了' : res.status)); return; }
    S.results[ID] = Object.assign({ hc: navigator.hardwareConcurrency, iso: !!self.crossOriginIsolated, at: Date.now() }, res);
    S.cur = null; save(S); back();
  }
  // the lightest setting of each select (quick mode): the smallest number, else 'light'
  function quick() {
    document.querySelectorAll('select').forEach(s => {
      const v = [...s.options].map(o => o.value), num = v.every(x => x !== '' && !isNaN(+x));
      const pick = num ? v.reduce((a, b) => (+b < +a ? b : a)) : (v.includes('light') ? 'light' : s.value);
      if (s.value !== pick) { s.value = pick; s.dispatchEvent(new Event('change')); }
    });
  }
  async function go() {
    banner(); lock();
    if (S && S.running && S.cur && S.cur !== ID) { show(bar.dataset.head + ' 別のゲームの実行中です。bench-all.html に戻ります…'); await sleep(1500); back(); return; }
    // 1) isolation as by hand: the pages with shared memory (shared/mtengine.js) reload once through their sw.js
    if (window.MTEngine && !self.crossOriginIsolated && chromiumPC && 'serviceWorker' in navigator) {
      show(bar.dataset.head + ' 分離（Service Worker）を待っています…');
      await sleep(12000);   // (the page's own reload comes within a few seconds)
      S = load();
      const tried = S && S.isoTried ? S.isoTried : {};
      if (!self.crossOriginIsolated && !(inRun() ? tried[ID] : sessionStorage.getItem('bench-auto-iso'))) {
        if (inRun()) { S.isoTried = Object.assign(tried, { [ID]: 1 }); save(S); } else { try { sessionStorage.setItem('bench-auto-iso', '1'); } catch (e) {} }
        show(bar.dataset.head + ' 分離のために再読み込みします…');
        try {
          await navigator.serviceWorker.register('sw.js?v=1', { scope: './' }); await navigator.serviceWorker.ready;
          if (!navigator.serviceWorker.controller) await new Promise(r => { navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }); setTimeout(r, 4000); });
          location.reload(); return;
        } catch (e) {}
      }
    }
    // 2) ready (「開始」 enabled)
    const btn = $('#btnRun'), cp = $('#btnCopy');
    if (!btn) { finish({ status: 'error', text: ID + ': no start button', ms: 0 }); return; }
    const t0 = Date.now();
    while (btn.disabled) {
      if (Date.now() - t0 > 180000) { finish({ status: 'error', text: `${ID}: not ready in 180 s (${($('#st') || {}).textContent || ''})`, ms: 0 }); return; }
      show(bar.dataset.head + ' ' + (($('#st') || {}).textContent || '準備中…')); await sleep(300);
    }
    await sleep(800);   // (let the page settle)
    if (QUICK) quick();
    // 3) run (a reload during the run counts as an attempt; after 2 the game is skipped)
    S = load();
    if (inRun()) {
      S.attempts = S.attempts || {}; const a = (S.attempts[ID] || 0) + 1; S.attempts[ID] = a; save(S);
      if (a > 2) { finish({ status: 'error', text: `${ID}: interrupted twice (reloaded during the run)`, ms: 0 }); return; }
    }
    const limit = (inRun() && S.limit && S.limit[ID]) || (QUICK ? 15 : 45) * 60000;
    const est = (/所要 約(\d+)分/.exec(($('#st') || {}).textContent || '') || [])[1];
    let began = false;
    new MutationObserver(() => { began = true; }).observe(btn, { attributes: true, attributeFilter: ['disabled'] });   // (a short run turns it off and on again between two looks)
    const start = Date.now(); btn.click();
    for (;;) {
      await sleep(500);
      if (btn.disabled) began = true;
      if (began && !btn.disabled && (!cp || !cp.disabled)) break;
      if (!began && Date.now() - start > 10000) { finish({ status: 'error', text: `${ID}: did not start`, ms: 0 }); return; }
      const ms = Date.now() - start;
      if (ms > limit) { finish({ status: 'timeout', text: `${ID}: timeout after ${Math.round(ms / 60000)} min\n` + text(), ms }); return; }
      const st = (($('#st') || {}).textContent || '').slice(0, 90), pc = (($('#bar i') || {}).style || {}).width || '';
      show(`${bar.dataset.head} ${pc ? parseFloat(pc).toFixed(0) + '% ' : ''}${Math.floor(ms / 60000)}分${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}秒${est ? '／約' + est + '分' : ''}　${st}`);
    }
    const out = text(), ms = Date.now() - start;
    finish({ status: /(^|\n)error /.test(out) ? 'error' : 'ok', text: out, ms });
  }
  if (document.readyState === 'complete') setTimeout(go, 0); else addEventListener('load', () => setTimeout(go, 0));
})();
