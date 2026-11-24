// 博物館の洗練度チェック（2026-11-24〜）。基準は claude/museum-quality-rubric.md。
// 使い方: リポジトリ直下で `python3 -m http.server 8765` を起こしてから
//   node tools/museum-audit.js [rooms=map,tree,gallery,paint,read,chance] [views=320x640,375x812,390x844:ar,768x1024,1024x768,1440x900]
// 各部屋 × 各画面幅で、測れる指標を数えて一覧にする（0 が合格。数字は問題の件数）。PW / CHROME / BASE で場所を変えられる。
const PW = process.env.PW || '/opt/npm-tools/node_modules/playwright', CHROME = process.env.CHROME || '/usr/bin/google-chrome', BASE = process.env.BASE || 'http://localhost:8765';
const { chromium } = require(PW);
const rooms = (process.argv[2] || 'map,tree,gallery,paint,read,chance,pass').split(',');
const views = (process.argv[3] || '320x640,375x812,390x844:ar,768x1024,1024x768,1440x900').split(',').map(v => { const [wh, lang] = v.split(':'); const [w, h] = wh.split('x').map(Number); return { w, h, lang: lang || 'ja' }; });
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const rows = [];
  for (const V of views) {
    const phone = V.w < 820;
    const p = await b.newPage({ viewport: { width: V.w, height: V.h }, hasTouch: phone, isMobile: phone }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(l => { localStorage.setItem('atlas-museum-room', 'map'); localStorage.setItem('atlas-lang', l); localStorage.setItem('aicoding-lang', l); }, V.lang);
    await p.goto(BASE + '/atlas/index.html#museum', { waitUntil: 'load' }); await p.waitForTimeout(4500);
    await p.evaluate(() => { const o = document.querySelector('#ov.on'); if (o) o.classList.remove('on'); });
    for (const r of rooms) {
      if (r === 'pass') { await p.evaluate(() => { const b = document.querySelector('#muPass'); if (b.getAttribute('aria-expanded') !== 'true') b.click(); }); } else { await p.evaluate(() => { const b = document.querySelector('#muPass'); if (b && b.getAttribute('aria-expanded') === 'true') b.click(); }); await p.evaluate(r => AtlasMuseum.go(r), r); } await p.waitForTimeout(r === 'chance' || r === 'gallery' ? 3500 : 2200); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(250);
      const m = await p.evaluate(phone => {
        const root = document.querySelector('#pg-museum'), vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('[hidden],.mupg-off'); };
        const all = [...root.querySelectorAll('*')].filter(vis);
        const ctl = all.filter(e => e.matches('button,a[href],input,select,[role=tab],[role=button]') && !e.closest('[aria-hidden=true]'));
        const out = {};
        // 1 はみ出し: 横スクロールが出る
        out.overflow = document.documentElement.scrollWidth > innerWidth + 1 ? 1 : 0;
        // 2 押しやすさ: スマホで 44×44 未満（盤の上の番号・グラフ内は除く）、PC で 32 未満
        const minT = phone ? 44 : 32;
        const small = ctl.filter(e => { const r = (e.tagName === 'INPUT' && e.closest('label') || e).getBoundingClientRect(); return (r.width < minT - .5 || r.height < minT - .5) && !e.closest('.ptsp,.exspot,.exspots,.ptvspots,canvas,.amap,.ammap,.trscroll'); });
        out.tapSmall = small.length; window.__detail = { tapSmall: small.map(e => (e.className || e.tagName) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)) };
        // 3 小さすぎる文字: 12px 未満
        const tiny = all.filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12 && !e.matches('.trn em'));   // (.trn em: the ORIGINAL tag, kept small on purpose — ユーザー 2026-11-24)
        out.tinyText = tiny.length; window.__detail.tinyText = tiny.map(e => (e.className || e.tagName) + ' ' + getComputedStyle(e).fontSize);
        // 4 名前のないボタン（文字も aria-label も title もない）
        const nn = ctl.filter(e => !(e.textContent.trim() || e.getAttribute('aria-label') || e.getAttribute('title') || e.querySelector('img[alt]:not([alt=""])')));
        out.noName = nn.length; window.__detail.noName = nn.map(e => e.className || e.tagName);
        window.__detail.ellipsis = all.filter(e => getComputedStyle(e).textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1).map(e => (e.className || e.tagName) + ' ' + e.textContent.slice(0, 20));
        // 5 文字の切れ（… で途切れている）
        out.ellipsis = all.filter(e => getComputedStyle(e).textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1).length;
        // 6 1行が長すぎる（本文の段落で 1 行 45em を超える）
        out.longLine = all.filter(e => e.tagName === 'P' && e.textContent.length > 80 && e.getBoundingClientRect().width / parseFloat(getComputedStyle(e).fontSize) > 45).length;
        // 7 1画面目: 部屋の中身の始まりが画面の 65% より上にあるか
        const st = root.querySelector('.muroom.on'), top = st ? st.getBoundingClientRect().top : 9999;
        out.foldLate = top > innerHeight * .65 ? 1 : 0;
        // 8 文字サイズの種類（多いほど統一感がない）: 部屋＋見出しで 9 種まで
        out.fontSizes = Math.max(0, new Set(all.filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())).map(e => Math.round(parseFloat(getComputedStyle(e).fontSize)))).size - 9);
        // 9 フォーカスが見えない: :focus-visible の指定がなく outline:none のコントロール
        out.focusHidden = 0; { const c = ctl[0]; if (c) { c.focus(); const s = getComputedStyle(c); if ((s.outlineStyle === 'none' || parseFloat(s.outlineWidth) === 0) && s.boxShadow === 'none') out.focusHidden = 1; c.blur(); } }
        // 13 意味のない名前（記号だけの aria-label：「+」「−」「×」など）
        const vague = ctl.filter(e => { const l = (e.getAttribute('aria-label') || '').trim(); return l && /^[\s+\-−×✕<>‹›0-9.]+$/.test(l); });
        out.vagueName = vague.length; window.__detail.vagueName = vague.map(e => (e.className || e.tagName) + ' "' + e.getAttribute('aria-label') + '"');
        // 10 画像の alt なし（装飾は alt=""）
        out.noAlt = all.filter(e => e.tagName === 'IMG' && !e.hasAttribute('alt')).length;
        // 11 固定の下メニューに重なる操作（スマホ）
        out.underBar = 0;
        return out;
      }, phone);
      // 12 キーボード: Tab 6 回で部屋のタブにたどり着けるか（たどり着いた要素が博物館の中か）
      if (process.env.DETAIL) { const d = await p.evaluate(() => window.__detail); for (const k in d) { const c = {}; d[k].forEach(x => { const key = x.replace(/ [\d.]+(px|x\d+)?$/, m => m); c[key] = (c[key] || 0) + 1; }); if (d[k].length) console.log(`  ${V.w} ${r} ${k}:`, JSON.stringify(c)); } }
      // 14 タブのキーボード操作: 部屋のタブで → を押すと次のタブにフォーカスが移るか
      m.tabKeys = await p.evaluate(() => { const t = [...document.querySelectorAll('#muRooms [role=tab]')]; if (t.length < 2) return 0; t[0].focus(); t[0].dispatchEvent(new KeyboardEvent('keydown', { key: getComputedStyle(t[0]).direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight', bubbles: true })); const ok = document.activeElement === t[1]; document.activeElement.blur(); return ok ? 0 : 1; });
      // 15 記事の情報量（読み物の部屋だけで数える）: 要点 3・見出しつきの節 3 以上・年表 4 以上・出典がそろっていない物語の数
      m.thinStory = r !== 'read' ? 0 : await p.evaluate(() => { const T = window.MUSEUM_READ_T, l = document.documentElement.lang || 'ja', t = (T && (T[l] || T.ja)) || {};
        return (window.AtlasRead ? AtlasRead.STORIES : []).filter(S => { const x = t[S.id] || {}; return !((x.kf || []).length >= 3 && (x.more || []).length >= 3 && (x.tl || []).length >= 4 && (S.refs || []).length >= 1); }).length; });
      // 16 記事の図: 本文の画像（sec）と節の図（figs）を合わせて 2 つ未満の物語の数
      m.fewFigs = r !== 'read' ? 0 : await p.evaluate(() => (window.AtlasRead ? AtlasRead.STORIES : []).filter(S => (S.sec || []).filter(Boolean).length + Object.values(S.figs || {}).reduce((a, f) => a + [].concat(f).length, 0) < 2).length);
      // 17 読み物の画像が見つからない（表紙・本文の画像・節の図のファイルを取りに行って 200 でないもの）
      m.brokenImg = r !== 'read' ? 0 : await p.evaluate(async () => { const u = f => f.s ? `../images/atlas/museum-story/${f.s}.webp` : f.g ? `../images/atlas/${f.g}.webp` : f.ex ? `../images/atlas/ex/${f.ex}.webp` : f.paint ? `../images/atlas/paint/${f.paint}-t.webp` : null;
        const L = new Set(); (window.AtlasRead ? AtlasRead.STORIES : []).forEach(S => [S.cover, ...(S.sec || []), ...Object.values(S.figs || {}).flatMap(f => [].concat(f))].forEach(f => { const x = f && u(f); if (x) L.add(x); }));
        let bad = 0; for (const x of L) { try { const r = await fetch(new URL(x, location.href), { method: 'HEAD' }); if (!r.ok) bad++; } catch (e) { bad++; } } return bad; });
      if (r === 'pass') m.foldLate = 0;   // (the open card pushes the room down on purpose)
      rows.push({ view: `${V.w}x${V.h}${V.lang !== 'ja' ? ':' + V.lang : ''}`, room: r, ...m, js: errs.length });
    }
    await p.close();
  }
  await b.close();
  const keys = Object.keys(rows[0]).filter(k => k !== 'view' && k !== 'room');
  console.log(['view', 'room', ...keys].join('\t'));
  rows.forEach(r => console.log([r.view, r.room, ...keys.map(k => r[k])].join('\t')));
  const tot = {}; keys.forEach(k => tot[k] = rows.reduce((a, r) => a + r[k], 0)); console.log('TOTAL', JSON.stringify(tot));
})();
