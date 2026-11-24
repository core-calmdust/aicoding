/* World Board Game Atlas — 博物館の「読み物」 (stories room, 2026-11-24).
   Short illustrated stories about how games were found, lost, read and changed; each ends with a three-question quiz, and a quiz
   answered without a miss stamps the visitor's card (localStorage 'atlas-museum-stamps'). Pictures are the museum's own: the
   collection's photographs (images/atlas/ex) and the paintings room's (images/atlas/paint); tapping one opens the piece.
   Texts: museum/read-i18n.js (MUSEUM_READ_T[lang]: ui, and per story: title, lead, s[] (one per section), quiz[[q, right, wrong, wrong, wrong]]).
   Facts and sources: claude/museum-spec.md (読み物).
   AtlasRead.render(box, ctx); ctx.open(game), ctx.goEx(exhibit), ctx.goRoom(room). */
(function () {
  'use strict';
  const V = 1, KEY = 'atlas-museum-stamps';
  // cover: the picture at the head of the story (and on its card and stamp); sec: a picture beside each paragraph after it
  // (ex: a piece of the collection / paint: a work of the paintings room / null: none). Tapping a picture opens the piece.
  const STORIES = [
    { id: 'ur', color: '#2f5f9e', cover: { ex: 'ur' }, mins: 3, figs: { m0: { ex: 'ur' }, m1: [{ svg: 'urBoard' }, { svg: 'tetraOdds' }] }, refs: ['British Museum, “The Royal Game of Ur” (ME 120834) and tablet BM 33333B', 'I. L. Finkel, “On the Rules for the Royal Game of Ur”, in Ancient Board Games in Perspective (British Museum Press, 2007)', 'C. L. Woolley, Ur Excavations II: The Royal Cemetery (1934)'], sec: [null, null, null, null, null], links: [{ g: 'ur' }, { ex: 'ur' }] },
    { id: 'liubo', color: '#8a3a26', cover: { paint: 'liubo' }, mins: 3, sec: [null, null, { ex: 'liubo' }, null, null], links: [{ ex: 'liubo' }, { paint: 'liubo' }] },
    { id: 'zeno', color: '#5b4a2e', cover: { ex: 'pyrgus' }, mins: 3, sec: [null, null, null, null, null], links: [{ g: 'backgammon' }, { ex: 'pyrgus' }, { room: 'chance' }] },
    { id: 'sugoroku', color: '#7a2e3a', cover: { ex: 'sugoroku' }, mins: 3, sec: [null, null, null, null, { paint: 'sugoroku' }], links: [{ ex: 'sugoroku' }, { paint: 'sugoroku' }, { g: 'backgammon' }] },
    { id: 'queen', color: '#2a3a52', cover: { paint: 'shahnama' }, mins: 3, sec: [null, { ex: 'nishapur' }, { ex: 'lewis' }, null, null], links: [{ g: 'chess' }, { ex: 'lewis' }, { ex: 'nishapur' }] },
    // (2026-11-24: four more)
    { id: 'senet', color: '#7a5a1e', cover: { ex: 'senet' }, mins: 3, sec: [null, null, { paint: 'nefertari' }, null, null], links: [{ g: 'senet' }, { ex: 'senet' }, { paint: 'nefertari' }] },
    { id: 'lewis', color: '#3e4a5c', cover: { ex: 'lewis' }, mins: 3, sec: [null, null, null, null, null], links: [{ ex: 'lewis' }, { g: 'chess' }, { room: 'paint' }] },
    { id: 'tafl', color: '#2f4f3a', cover: { ex: 'ballinderry' }, mins: 3, sec: [null, null, null, null, null], links: [{ g: 'tafl' }, { ex: 'ballinderry' }] },
    { id: 'goose', color: '#5a6e2a', cover: { ex: 'goose' }, mins: 3, sec: [null, null, null, null, null], links: [{ ex: 'goose' }, { room: 'chance' }, { g: 'backgammon' }] },
    { id: 'shogi', color: '#6b4a24', cover: { ex: 'kofukuji' }, mins: 3, sec: [null, null, null, null, null], links: [{ g: 'shogi' }, { ex: 'kofukuji' }, { paint: 'shogi' }] },
    { id: 'pachisi', color: '#a0482a', cover: { paint: 'chaupar' }, mins: 3, sec: [null, null, null, null, null], links: [{ g: 'ludo' }, { paint: 'chaupar' }, { room: 'chance' }] },
    { id: 'go', color: '#33404a', cover: { ex: 'shosoin' }, mins: 3, sec: [null, null, null, null, null], links: [{ g: 'go' }, { ex: 'shosoin' }, { ex: 'sugoroku' }] },
    { id: 'draughts', color: '#7a2a2a', cover: { g: 'checkers', s: 'draughts' }, mins: 3, sec: [null, null, null, null, null], links: [{ g: 'checkers' }, { g: 'alquerque' }, { paint: 'shahnama' }] },
    { id: 'reversi', color: '#23603e', cover: { g: 'reversi', s: 'reversi' }, mins: 3, sec: [null, null, null, null, null], links: [{ g: 'reversi' }] },
    { id: 'mancala', color: '#8a6a2a', cover: { g: 'mancala', s: 'mancala' }, mins: 3, sec: [null, null, null, null, null], links: [{ g: 'mancala' }, { room: 'map' }] },
    { id: 'morris', color: '#5a4632', cover: { g: 'morris', s: 'morris' }, mins: 3, sec: [null, null, null, null, null], links: [{ g: 'morris' }, { room: 'map' }] },
    { id: 'patolli', color: '#8a3a2a', cover: { g: 'patolli', s: 'patolli' }, mins: 3, sec: [null, null, null, null, null], links: [{ g: 'patolli' }, { g: 'ludo' }, { paint: 'chaupar' }] },
    { id: 'xiangqi', color: '#8a1e1e', cover: { g: 'xiangqi', s: 'xiangqi' }, mins: 3, sec: [null, null, null, null, null], links: [{ g: 'xiangqi' }, { g: 'janggi' }, { g: 'chess' }] },
    { id: 'backgammon', color: '#5c2f1f', cover: { g: 'backgammon', s: 'backgammon' }, mins: 3, sec: [null, null, null, null, null], links: [{ g: 'backgammon' }, { paint: 'webb' }, { ex: 'pyrgus' }] },
    { id: 'hex', color: '#2e4a6e', cover: { g: 'hex', s: 'hex' }, mins: 3, sec: [null, null, null, null, null], links: [{ g: 'hex' }, { g: 'gomoku' }] },
    { id: 'foxgeese', color: '#7a4a1e', cover: { g: 'foxgeese', s: 'foxgeese' }, mins: 3, sec: [null, null, null, null, null], links: [{ g: 'foxgeese' }, { g: 'peg' }, { g: 'tafl' }] },
  ];
  const src = p => p.s ? `../images/atlas/museum-story/${p.s}.webp?v=1` : p.g ? `../images/atlas/${p.g}.webp` : p.ex ? `../images/atlas/ex/${p.ex}.webp` : `../images/atlas/paint/${p.paint}-t.webp?v=1`;
  const ga = p => p && p.g && !p.s ? ' ga' : '';   // (a cover from the game's own art: a transparent icon, shown whole on the story's colour)
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let host = null, ctx = null, lang = 'ja', cur = null, qs = null;
  const T = () => window.MUSEUM_READ_T || {};
  const tx = () => T()[lang] || T().en || {};
  const u = k => (tx().ui && tx().ui[k]) || ((T().en || {}).ui || {})[k] || k;
  const st = id => tx()[id] || (T().en || {})[id] || {};
  const fmt = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => o[k] != null ? o[k] : '');
  const stamps = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
  const MK = ids => { try { if (window.AtlasMuseum && AtlasMuseum.mark) AtlasMuseum.mark('read', ids, STORIES.length); } catch (e) {} };   // (館内スタンプ帳)
  const setStamp = id => { const s = stamps(); s[id] = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} MK(id); };
  const nm = (k, id) => (tx()[k] || {})[id] || ((T().en || {})[k] || {})[id] || id;
  const exName = id => nm('ex', id), paintName = id => nm('paint', id);
  const gName = id => { const g = ((ctx && ctx.games) || []).find(q => q.id === id); return g && ctx.gname ? ctx.gname(g) : id; };
  // a painting: open the paintings room, then the work in its viewer
  function openPaint(id) { if (!ctx.goRoom) return; ctx.goRoom('paint'); let n = 0; const t = () => { if (window.AtlasPaint && document.querySelector('.muroom[data-r="paint"] .ptc')) AtlasPaint.open(id); else if (++n < 100) setTimeout(t, 100); }; t(); }
  function linkHtml(L) {
    if (L.g) { const g = (ctx.games || []).find(q => q.id === L.g); return g ? `<button type="button" class="chlk" data-g="${L.g}"><i>${esc(u('game'))}</i>${esc(ctx.gname ? ctx.gname(g) : L.g)}</button>` : ''; }
    if (L.ex) return `<button type="button" class="chlk ex" data-ex="${L.ex}"><i>${esc(u('exhibit'))}</i>${esc(exName(L.ex))}</button>`;
    if (L.paint) return `<button type="button" class="chlk pt" data-paint="${L.paint}"><i>${esc(u('art'))}</i>${esc(paintName(L.paint))}</button>`;
    return `<button type="button" class="chlk rm" data-room="${L.room}"><i>${esc(u('room'))}</i>${esc(u('room_' + L.room))}</button>`;
  }
  /* ---------- (2026-11-24 ユーザー: 画像なども使って読みやすく) figures inside an article: a museum piece, a painting, a story picture,
     or a diagram drawn here (svg) — each with its caption from the language's more[k].cap ---------- */
  const DIAG = {
    // the twenty squares, the five rosettes, and one player's road (1 → 14) as the reconstructed rules run it
    urBoard: () => { const C = 46, X0 = 12, Y0 = 12, ex = (r, c) => r === 1 || c < 4 || c > 5, ros = [[0, 0], [2, 0], [1, 3], [0, 6], [2, 6]];
      const road = [[2, 3], [2, 2], [2, 1], [2, 0], [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [2, 7], [2, 6]], cx = c => X0 + c * C + C / 2, cy = r => Y0 + r * C + C / 2;
      let g = '';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) if (ex(r, c)) { const R = ros.some(([a, b]) => a === r && b === c);
        g += `<rect x="${X0 + c * C + 1.5}" y="${Y0 + r * C + 1.5}" width="${C - 3}" height="${C - 3}" rx="6" fill="${R ? '#f4e2b8' : '#fbf6ea'}" stroke="#2f4a6e" stroke-width="2"/>`;
        if (R) { let f = ''; for (let k = 0; k < 8; k++) { const t = k * Math.PI / 4; f += `<ellipse cx="${cx(c) + Math.cos(t) * 9}" cy="${cy(r) + Math.sin(t) * 9}" rx="7" ry="3.6" transform="rotate(${k * 45} ${cx(c) + Math.cos(t) * 9} ${cy(r) + Math.sin(t) * 9})" fill="#c0503a"/>`; } g += f + `<circle cx="${cx(c)}" cy="${cy(r)}" r="4.5" fill="#2f4a6e"/>`; } }
      g += `<defs><marker id="urA" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#2f7d4a"/></marker></defs><polyline points="${road.map(([r, c]) => cx(c) + ',' + cy(r)).join(' ')}" fill="none" stroke="#2f7d4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" opacity=".7" marker-end="url(#urA)"/>`;
      g += road.map(([r, c], i) => `<circle cx="${X0 + c * C + 12}" cy="${Y0 + r * C + 12}" r="9" fill="#2f7d4a" stroke="#fff" stroke-width="1.5"/><text x="${X0 + c * C + 12}" y="${Y0 + r * C + 16.2}" font-size="11.5" font-weight="800" fill="#fff" text-anchor="middle">${i + 1}</text>`).join('');
      return `<svg viewBox="0 0 ${X0 * 2 + C * 8} ${Y0 * 2 + C * 3}" role="img" style="font-family:inherit">${g}</svg>`; },
    // four tetrahedral dice: how often each score comes (out of 16)
    tetraOdds: () => { const n = [1, 4, 6, 4, 1], W = 300, H = 150, bw = 40, gap = (W - 40 - bw * 5) / 4; let g = '';
      n.forEach((v, i) => { const x = 20 + i * (bw + gap), h = v / 6 * 96, y = 112 - h;
        g += `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="5" fill="${i === 2 ? '#2f4a6e' : '#8aa3c4'}"/><text x="${x + bw / 2}" y="${y - 6}" font-size="12" font-weight="800" fill="#2b2a28" text-anchor="middle">${v}/16</text><text x="${x + bw / 2}" y="132" font-size="14" font-weight="800" fill="#2b2a28" text-anchor="middle">${i}</text>`; });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit"><line x1="10" y1="112.5" x2="${W - 10}" y2="112.5" stroke="#b8ad98" stroke-width="1.5"/>${g}</svg>`; },
  };
  function figHtml(f, cap) {
    const c = cap ? `<figcaption>${esc(cap)}</figcaption>` : '';
    if (f.svg && DIAG[f.svg]) return `<figure class="rdfig dg">${DIAG[f.svg]().replace('role="img"', `role="img" aria-label="${esc(cap || '')}"`)}${c}</figure>`;
    const tag = f.ex ? `data-ex="${f.ex}"` : f.paint ? `data-paint="${f.paint}"` : '', name = f.ex ? exName(f.ex) : f.paint ? paintName(f.paint) : '';
    const img = `<img src="${src(f)}" alt="${esc(cap || name)}" loading="lazy">`;
    return `<figure class="rdfig">${tag ? `<button type="button" class="rdfb" ${tag} aria-label="${esc(name)}">${img}<span>${esc(name)} ›</span></button>` : img}${c}</figure>`;
  }
  function wire(el) {
    el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => ctx.open && ctx.open(b.dataset.g));
    el.querySelectorAll('[data-ex]').forEach(b => b.onclick = () => ctx.goEx && ctx.goEx(b.dataset.ex));
    el.querySelectorAll('[data-paint]').forEach(b => b.onclick = () => openPaint(b.dataset.paint));
    el.querySelectorAll('[data-room]').forEach(b => b.onclick = () => ctx.goRoom && ctx.goRoom(b.dataset.room));
  }

  /* ---------- the shelf: the stamp card and the stories ---------- */
  function shelf() {
    cur = null; const S = stamps(), n = STORIES.filter(s => S[s.id]).length;
    host.innerHTML = `<div class="rdx"><p class="chlead">${esc(fmt(u('lead'), { n: STORIES.length }))}</p>
      <div class="rdlist">${STORIES.map((s, i) => { const x = st(s.id);
        return `<button type="button" class="rdc" data-s="${s.id}" style="--c:${s.color}"><span class="rdci${ga(s.cover)}"><img src="${src(s.cover)}" alt="" loading="lazy"></span>
          <span class="rdct2"><em>${esc(fmt(u('no'), { n: i + 1 }))} · ${esc(fmt(u('mins'), { n: mins(s) }))}${S[s.id] ? ` · <b class="rdok">✓ ${esc(u('stamped'))}</b>` : ''}</em><b>${esc(x.title)}</b><small>${esc(x.lead)}</small></span></button>`; }).join('')}</div></div>`;
    host.querySelectorAll('[data-s]').forEach(b => b.onclick = () => story(b.dataset.s, true));
    if (window.AtlasMuseum && AtlasMuseum.pager) AtlasMuseum.pager(host.querySelector('.rdlist'), 'read', { rows: { pc: 3, phone: 6 } });
  }

  /* ---------- a story ---------- */
  // (2026-11-24) the minutes a story takes, from its own text: ~500 characters a minute (CJK) or ~200 words (others)
  function mins(S) {
    const x = st(S.id), t = [x.lead, ...(x.s || []), ...(x.kf || []), ...((x.more || []).flatMap(m => [m.h, ...m.p])), ...((x.tl || []).map(r => r.join(' ')))].join(' ');
    const cjk = (t.match(/[\u3000-\u9fff\uac00-\ud7af]/g) || []).length, words = t.replace(/[\u3000-\u9fff\uac00-\ud7af]/g, ' ').split(/\s+/).filter(Boolean).length;
    return Math.max(S.mins || 1, Math.round(cjk / 500 + words / 200));
  }
  function story(id, user) {
    const S = STORIES.find(s => s.id === id); if (!S) return; cur = S; const x = st(id), i = STORIES.indexOf(S);
    host.innerHTML = `<article class="rda" style="--c:${S.color}">
      <button type="button" class="btn ghost sm rdback">← ${esc(u('back'))}</button>
      <div class="rdh"><button type="button" class="rdhimg${ga(S.cover)}" ${S.cover.g ? `data-g="${S.cover.g}"` : S.cover.ex ? `data-ex="${S.cover.ex}"` : `data-paint="${S.cover.paint}"`}><img src="${src(S.cover)}" alt=""><span>${esc(S.cover.g ? u('game') : S.cover.ex ? u('exhibit') : u('art'))} · ${esc(S.cover.g ? gName(S.cover.g) : S.cover.ex ? exName(S.cover.ex) : paintName(S.cover.paint))} ›</span></button>
        <div class="rdht"><em>${esc(fmt(u('no'), { n: i + 1 }))} · ${esc(fmt(u('mins'), { n: mins(S) }))}</em><h3>${esc(x.title)}</h3><p>${esc(x.lead)}</p></div></div>
      ${x.kf && x.kf.length ? `<aside class="rdkf"><h4>${esc(u('kfH'))}</h4><ul>${x.kf.map(k => `<li>${esc(k)}</li>`).join('')}</ul></aside>` : ''}
      ${(x.s || []).map((p, k) => { const im = S.sec[k], flip = im && S.sec.slice(0, k).filter(Boolean).length % 2;
        return `<section class="rds${im ? '' : ' np'}${flip ? ' fl' : ''}">${im ? `<button type="button" class="rdimg" ${im.ex ? `data-ex="${im.ex}"` : `data-paint="${im.paint}"`} aria-label="${esc(im.ex ? exName(im.ex) : paintName(im.paint))}"><img src="${src(im)}" alt="" loading="lazy"><span>${esc(im.ex ? exName(im.ex) : paintName(im.paint))} ›</span></button>` : ''}<p>${esc(p)}</p></section>`; }).join('')}
      ${(x.more || []).map((m, k) => { const F = [].concat((S.figs || {})['m' + k] || []), cap = m.cap || [];
        return `<section class="rdm${F.length ? ' hf' : ''}"><h4>${esc(m.h)}</h4>${F.length ? `<div class="rdfigs n${F.length}">${F.map((f, j) => figHtml(f, cap[j])).join('')}</div>` : ''}${m.p.map(p => `<p>${esc(p)}</p>`).join('')}</section>`; }).join('')}
      ${x.tl && x.tl.length ? `<section class="rdtl"><h4>${esc(u('tlH'))}</h4><ol>${x.tl.map(([y, t]) => `<li><b>${esc(y)}</b><span>${esc(t)}</span></li>`).join('')}</ol></section>` : ''}
      <section class="rdq"><h4>${esc(u('quiz'))}</h4><div class="rdqs"></div></section>
      <div class="rdlinks"><h4>${esc(u('links'))}</h4><div>${S.links.map(linkHtml).join('')}</div></div>
      ${S.refs ? `<section class="rdref"><h4>${esc(u('refH'))}</h4><ul>${S.refs.map(r => `<li>${esc(r)}</li>`).join('')}</ul></section>` : ''}
      <nav class="rdnav">${i > 0 ? `<button type="button" class="btn ghost sm" data-go="${STORIES[i - 1].id}">‹ ${esc(st(STORIES[i - 1].id).title)}</button>` : '<span></span>'}${i < STORIES.length - 1 ? `<button type="button" class="btn ghost sm" data-go="${STORIES[i + 1].id}">${esc(st(STORIES[i + 1].id).title)} ›</button>` : ''}</nav>
    </article>`;
    host.querySelector('.rdback').onclick = () => { shelf(); top(); };
    host.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { story(b.dataset.go, true); top(); });
    wire(host.querySelector('.rda'));
    quiz(S);
    if (user) top();
  }
  const top = () => { const r = host.getBoundingClientRect(), y = r.top + scrollY - (innerWidth < 820 ? 70 : 90); if (Math.abs(scrollY - y) > 40 && scrollY > y) scrollTo({ top: Math.max(0, y), behavior: 'smooth' }); };

  /* ---------- the quiz: three questions, the answers shuffled; all right → a stamp ---------- */
  function quiz(S) {
    const Q = st(S.id).quiz || [], box = host.querySelector('.rdqs');
    qs = { S, i: 0, miss: 0, order: Q.map(q => shuffle([1, 2, 3, 4].slice(0, q.length - 1))) };
    const show = () => {
      if (qs.i >= Q.length) {
        const ok = !qs.miss, had = !!stamps()[S.id]; if (ok) setStamp(S.id);
        box.innerHTML = `<div class="rdend ${ok ? 'ok' : ''}">${ok ? `<span class="rdstamp on big${ga(S.cover)}" style="--c:${S.color}"><img src="${src(S.cover)}" alt=""><i>✓</i></span>` : ''}<p><b>${esc(ok ? (had ? u('again') : u('got')) : fmt(u('missed'), { n: qs.miss }))}</b>${esc(ok ? u('gotSub') : u('retrySub'))}</p>
          <button type="button" class="btn ${ok ? 'ghost' : 'sun'} sm" data-k="retry">${esc(u('retry'))}</button></div>`;
        box.querySelector('[data-k="retry"]').onclick = () => quiz(S);
        if (ok && !had && ctx.confetti) try { ctx.confetti(40); } catch (e) {}
        return;
      }
      const q = Q[qs.i], ord = qs.order[qs.i];
      box.innerHTML = `<p class="rdqn">${esc(fmt(u('qn'), { n: qs.i + 1, of: Q.length }))}</p><p class="rdqq">${esc(q[0])}</p>
        <div class="rdqa">${ord.map(k => `<button type="button" data-a="${k}">${esc(q[k])}</button>`).join('')}</div><p class="rdqf" aria-live="polite"></p>`;
      box.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
        if (box.dataset.lock) return; const right = +b.dataset.a === 1; box.dataset.lock = 1;
        b.classList.add(right ? 'ok' : 'ng'); if (!right) { qs.miss++; box.querySelector('[data-a="1"]').classList.add('ok'); }
        box.querySelector('.rdqf').textContent = right ? u('right') : u('wrong');
        setTimeout(() => { delete box.dataset.lock; qs.i++; show(); }, right ? 900 : 1700);
      });
    };
    show();
  }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function render(box, c) {
    ctx = c; lang = T()[c.lang] ? c.lang : 'en'; MK(Object.keys(stamps()).filter(k => STORIES.some(s => s.id === k)));
    if (window.AtlasMuseum && AtlasMuseum.catalog) AtlasMuseum.catalog('read', STORIES.map(s => ({ id: s.id, img: src(s.cover), t: st(s.id).title })));
    if (host !== box) { host = box; cur = null; }
    if (cur) story(cur.id, false); else shelf();
  }
  window.AtlasRead = { render, STORIES, V, open: id => story(id, true), _stamps: stamps };
})();
