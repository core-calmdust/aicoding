/* World Board Game Atlas — talk with your character (2026-11-11).
   Tapping the home profile card's character flies it up to the middle of the screen, big, and it says a few lines:
   a greeting (by the time of day, or by name) → a topic (the creature's own lines, a game's trivia, your records, or a game to
   try) → a sign-off; then 「もっと話す」 / 「きせかえ」 / the suggested game / 「とじる」.
   Texts: atlas/talk/<lang>.js (window.AvTalkT[lang] = { ui, g: generic lines, s: { species: [lines] } }) — rarity tiers of a
   creature share its lines. The AI bosses talk with their voice from atlas/npc (t/<lang>.js: voice · trivia).
   AvTalk.open(ctx): ctx = { from (element), av, name, lang, lv, streak, coins, done, achTotal, touched, gamesTotal,
     today: { id, name }, fresh: { id, name } | null, gameName(id), onDress(), onPlay(id) } */
(function () {
  'use strict';
  const V = '1', BASE = new URL('./', document.currentScript.src).href;
  const LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
  const loaded = {};
  const load = src => loaded[src] || (loaded[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }));
  const L = l => { l = String(l || 'ja'); if (l.startsWith('zh')) return /tw|hk|hant/i.test(l) ? 'zh-TW' : 'zh'; return LANGS.find(x => l.startsWith(x)) || 'en'; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fill = (s, v) => String(s || '').replace(/\{(\w+)\}/g, (m, k) => v[k] != null ? v[k] : m);
  const pick = a => a && a.length ? a[Math.floor(Math.random() * a.length)] : '';
  // the creature's game, for its trivia (the others talk about today's game)
  const GAME = { shogi: 'shogi', knight: 'chess', rook: 'chess', bishop: 'chess', pawn: 'chess', ryuou: 'shogi', keima: 'shogi', disc: 'reversi', flippanda: 'reversi', stone: 'go', goke: 'go', dot: 'dots', plop: 'connect4', gem: 'mancala', dice: 'backgammon', owl: 'morris', crab: 'checkers', renju: 'gomoku', bee: 'hex', frog: 'ludo', sealion: 'carrom' };
  // lines said lately (kept across visits) are skipped while there are others
  const RK = 'atlas-avtalk-recent';
  const recent = () => { try { return JSON.parse(localStorage.getItem(RK) || '[]'); } catch (e) { return []; } };
  const remember = x => { try { const r = recent().filter(y => y !== x); r.push(x); localStorage.setItem(RK, JSON.stringify(r.slice(-24))); } catch (e) {} };
  const fresh = a => { a = (a || []).filter(Boolean); if (!a.length) return ''; const r = recent(), c = a.filter(x => !r.includes(x)); return pick(c.length ? c : a); };
  // talking blips (like the puzzles' guide): each creature has its own pitch; off with the portal's sound setting (atlas-sfx)
  const ac = () => { try { if (localStorage.getItem('atlas-sfx') === '0') return null; const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
  const voiceOf = sp => { let h = 0; for (const ch of String(sp || '')) h = (h * 31 + ch.charCodeAt(0)) | 0; h = Math.abs(h); return { f: 380 + (h % 9) * 55, w: ['triangle', 'sine', 'square'][h % 3] }; };
  function blip(v) {
    const C = ac(); if (!C) return; const t = C.currentTime, f = v.f * (.9 + Math.random() * .3);
    const o = C.createOscillator(), g = C.createGain(); o.type = v.w; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (Math.random() < .5 ? 1.25 : .82), t + .05);
    const pk = v.w === 'square' ? .022 : .06; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pk, t + .008); g.gain.exponentialRampToValueAtTime(.001, t + .06); o.connect(g).connect(C.destination); o.start(t); o.stop(t + .07);
  }
  function pop(v) {   // the character arriving
    const C = ac(); if (!C) return; const t = C.currentTime;
    [1, 1.5].forEach((m, i) => { const o = C.createOscillator(), g = C.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(v.f * m * .8, t + i * .07); o.frequency.exponentialRampToValueAtTime(v.f * m * 1.4, t + i * .07 + .1);
      g.gain.setValueAtTime(0, t + i * .07); g.gain.linearRampToValueAtTime(.07, t + i * .07 + .01); g.gain.exponentialRampToValueAtTime(.001, t + i * .07 + .16); o.connect(g).connect(C.destination); o.start(t + i * .07); o.stop(t + i * .07 + .18); });
  }
  async function texts(lang) {
    const T = window.AvTalkT = window.AvTalkT || {};
    if (!T[lang]) await load(BASE + 'talk/' + lang + '.js?v=' + V).catch(() => load(BASE + 'talk/en.js?v=' + V));
    if (!T.en && lang !== 'en') load(BASE + 'talk/en.js?v=' + V).catch(() => {});
    return T[lang] || T.en || T.ja;
  }
  const npc = lang => window.AtlasNPC && AtlasNPC.ensure ? AtlasNPC.ensure(lang).then(() => AtlasNPC.T && (AtlasNPC.T[lang] || AtlasNPC.T.en)).catch(() => null) : Promise.resolve(null);
  // ---- the conversation: three lines and the buttons at the end
  function compose(c, T, N) {
    const sp = ((c.av && c.av.icon) || '').replace(/^av-/, '').replace(/-\d+$/, ''), G = T.g, v = { name: c.name || '' };
    const h = new Date().getHours(), slot = h >= 5 && h < 10 ? 'morning' : h < 17 && h >= 10 ? 'day' : h >= 17 && h < 22 ? 'evening' : 'night';
    const boss = /^boss-([a-z0-9]+)-(\d+)$/.exec(sp), B = boss && window.AtlasNPC && AtlasNPC.BOSSES && AtlasNPC.BOSSES[boss[1]] && AtlasNPC.BOSSES[boss[1]][+boss[2] - 1];
    const voice = B && N && N.voice && N.voice[B.v];
    const me = B ? (B.n[c.lang] || B.n.en) : '';
    const own = voice ? [].concat(voice.lead || [], voice.gain || [], voice.win || [], voice.even || [], voice.draw || []).map(x => fill(x, { me })) : (T.s[sp] || []).map(x => fill(x, v));
    const game = boss ? boss[1] : GAME[sp] || (c.today && c.today.id), gname = id => (c.gameName && c.gameName(id)) || id;
    const triv = N && N.trivia && game && N.trivia[game];
    const lines = [], btn = [];
    // 1. hello
    lines.push(voice && voice.greet && Math.random() < .5 ? fill(pick(voice.greet), { me }) : fresh(Math.random() < .65 ? G[slot] : G.call).replace(/\{name\}/g, v.name));
    // 2. a topic
    const topics = [];
    if (own.length) topics.push([4, () => fresh(own)]);
    if (triv && triv.length) topics.push([2.5, () => fill(pick(G.trivia), { game: gname(game) }) + '\n' + fresh(triv)]);
    const st = [];
    if (c.streak >= 3) st.push(fill(pick(G.streak), { n: c.streak })); else st.push(pick(G.streakLow));
    st.push(fill(pick(c.coins >= 500 ? G.coins : G.coinsLow), { n: (c.coins || 0).toLocaleString() }));
    st.push(fill(pick(G.lv), { n: c.lv }));
    if (c.achTotal) st.push(fill(pick(G.ach), { n: c.done, m: c.achTotal }));
    if (c.gamesTotal) st.push(c.touched >= c.gamesTotal ? pick(G.gamesAll) : fill(pick(G.games), { n: c.touched, m: c.gamesTotal }));
    topics.push([2, () => fresh(st)]);
    const rec = c.fresh && Math.random() < .5 ? ['untouched', c.fresh] : c.today ? ['today', c.today] : null;
    if (rec) topics.push([1.5, () => { btn.push(rec[1]); return fill(pick(G[rec[0]]), { game: rec[1].name }); }]);
    let tot = topics.reduce((a, x) => a + x[0], 0), r = Math.random() * tot, f = topics[0][1];
    for (const [w, fn] of topics) { if ((r -= w) <= 0) { f = fn; break; } }
    lines.push(f());
    // 3. goodbye (or one more of its own lines)
    lines.push(own.length && Math.random() < .3 ? fresh(own.filter(x => !lines.includes(x))) || fresh(G.bye) : fresh(G.bye).replace(/\{name\}/g, v.name));
    return { lines: lines.filter(Boolean), play: btn[0] || null };
  }
  // ---- the stage
  const CSS = `
#avTalk{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;font-family:inherit}
#avTalk .at-bd{position:absolute;inset:0;background:rgba(43,32,20,.38);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);opacity:0;transition:opacity .35s}
#avTalk.on .at-bd{opacity:1}
#avTalk .at-st{position:relative;display:flex;flex-direction:column;align-items:center;gap:14px;width:min(560px,calc(100vw - 32px));padding:0 0 8px}
#avTalk .at-bub{position:relative;width:100%;box-sizing:border-box;min-height:96px;padding:18px 22px 16px;border-radius:26px;background:#fff;border:3px solid #f0e2c4;box-shadow:0 6px 0 #f0e2c4,0 18px 40px rgba(60,40,10,.18);color:#2b3044;font-size:17px;font-weight:700;line-height:1.75;cursor:pointer;opacity:0;transform:translateY(10px) scale(.96);transition:opacity .3s .15s,transform .35s .15s cubic-bezier(.3,1.5,.5,1)}
#avTalk.on .at-bub{opacity:1;transform:none}
#avTalk .at-bub::after{content:'';position:absolute;left:50%;bottom:-17px;margin-left:-14px;border:14px solid transparent;border-top-color:#fff;border-bottom:0;filter:drop-shadow(0 4px 0 #f0e2c4)}
#avTalk .at-nm{position:absolute;top:-15px;left:20px;padding:3px 14px;border-radius:99px;background:#ffb627;color:#fff;font-size:13px;font-weight:900;letter-spacing:.04em;box-shadow:0 3px 0 #e09400;white-space:nowrap;max-width:calc(100% - 40px);overflow:hidden;text-overflow:ellipsis}
#avTalk .at-tx{white-space:pre-line;min-height:1.75em}
#avTalk .at-tx .cu{display:inline-block;width:.5em;animation:atBl .9s steps(2) infinite}
@keyframes atBl{50%{opacity:0}}
#avTalk .at-nx{position:absolute;right:16px;bottom:8px;font-size:11px;font-weight:700;color:#b9a77f;animation:atNx 1.2s ease-in-out infinite}
@keyframes atNx{50%{transform:translateY(3px)}}
#avTalk .at-pg{position:absolute;right:18px;top:10px;display:flex;gap:4px}#avTalk .at-pg i{width:6px;height:6px;border-radius:50%;background:#efe3c8}#avTalk .at-pg i.on{background:#ffb627}
#avTalk .at-ch{position:relative;width:min(260px,58vw);aspect-ratio:1;border-radius:50%;cursor:pointer;will-change:transform}
#avTalk .at-ch .bg{position:absolute;inset:6%;border-radius:50%;box-shadow:0 0 0 6px #fff,0 0 0 9px #f0e2c4,0 14px 30px rgba(60,40,10,.25)}
#avTalk .at-ch img{position:absolute;left:-2%;top:2%;width:104%;height:104%;object-fit:contain;transform-origin:50% 90%;animation:atIdle 2.6s ease-in-out infinite;filter:drop-shadow(0 8px 8px rgba(0,0,0,.18))}
@keyframes atIdle{0%,100%{transform:translateY(0) scale(1,1)}50%{transform:translateY(-3.5%) scale(.985,1.015)}}
#avTalk .at-ch.hop img{animation:atHop .5s cubic-bezier(.3,1.6,.5,1),atIdle 2.6s .5s ease-in-out infinite}
@keyframes atHop{0%{transform:scale(1.06,.9)}40%{transform:translateY(-12%) scale(.94,1.08)}100%{transform:translateY(0) scale(1)}}
#avTalk .at-ch .sp{position:absolute;width:14px;height:14px;pointer-events:none;background:radial-gradient(circle,#fff 0 30%,transparent 32%),conic-gradient(from 45deg,transparent 0 10%,#ffd65a 10% 15%,transparent 15% 35%,#ffd65a 35% 40%,transparent 40% 60%,#ffd65a 60% 65%,transparent 65% 85%,#ffd65a 85% 90%,transparent 90%);border-radius:50%;animation:atSp 1.8s ease-in-out infinite}
@keyframes atSp{0%,100%{opacity:0;transform:scale(.4) rotate(0)}50%{opacity:1;transform:scale(1) rotate(90deg)}}
#avTalk .at-bt{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;min-height:46px;opacity:0;transform:translateY(8px);transition:opacity .25s,transform .3s;pointer-events:none}
#avTalk .at-bt.on{opacity:1;transform:none;pointer-events:auto}
#avTalk .at-bt button{height:44px;padding:0 18px;border-radius:99px;border:2px solid #ead9b6;background:#fff;color:#2b3044;font:inherit;font-size:14px;font-weight:900;box-shadow:0 3px 0 #ead9b6;cursor:pointer}
#avTalk .at-bt button.go{background:#ff5d5d;border-color:transparent;color:#fff;box-shadow:0 3px 0 #d93c3c}
#avTalk .at-bt button:hover{transform:translateY(-1px)}
#avTalk .at-x{position:absolute;top:max(14px,env(safe-area-inset-top));right:14px;width:40px;height:40px;border-radius:50%;border:0;background:rgba(255,255,255,.85);color:#4a5068;font-size:22px;line-height:1;cursor:pointer;box-shadow:0 2px 0 rgba(0,0,0,.08)}
@media (max-height:620px){#avTalk .at-ch{width:min(190px,40vh)}#avTalk .at-bub{font-size:15.5px;min-height:80px;padding:14px 18px 14px}}
@media (prefers-reduced-motion:reduce){#avTalk .at-ch img,#avTalk .at-ch .sp{animation:none!important}}
html[dir=rtl] #avTalk .at-nm{left:auto;right:20px}html[dir=rtl] #avTalk .at-nx{right:auto;left:16px}html[dir=rtl] #avTalk .at-pg{right:auto;left:18px}`;
  let S = null;
  function close() {
    const s = S; if (!s) return; S = null; clearTimeout(s.tm);
    const el = s.el, ch = el.querySelector('.at-ch');
    el.classList.remove('on');
    try { const a = flip(ch, s.c.from, true); if (a) { a.onfinish = () => el.remove(); setTimeout(() => el.remove(), 600); return; } } catch (e) {}
    setTimeout(() => el.remove(), 300);
  }
  // fly the big character from / back to the small one on the card
  function flip(ch, from, back) {
    if (!from || !from.getBoundingClientRect || !ch.animate) return null;
    const a = from.getBoundingClientRect(), b = ch.getBoundingClientRect(); if (!a.width || !b.width) return null;
    const k = a.width / b.width, dx = a.left + a.width / 2 - (b.left + b.width / 2), dy = a.top + a.height / 2 - (b.top + b.height / 2);
    const small = `translate(${dx}px,${dy}px) scale(${k})`;
    return ch.animate(back ? [{ transform: 'none', opacity: 1 }, { transform: small, opacity: .4 }] : [{ transform: small, opacity: .6 }, { transform: 'translateY(-14px) scale(1.06)', opacity: 1, offset: .7 }, { transform: 'none', opacity: 1 }],
      { duration: back ? 320 : 620, easing: back ? 'cubic-bezier(.5,0,.75,0)' : 'cubic-bezier(.2,.8,.3,1.15)', fill: 'both' });
  }
  function say(s) {
    const tx = s.el.querySelector('.at-tx'), full = s.conv.lines[s.i] || '', ch = s.el.querySelector('.at-ch');
    s.el.querySelectorAll('.at-pg i').forEach((x, k) => x.classList.toggle('on', k === s.i));
    ch.classList.remove('hop'); void ch.offsetWidth; ch.classList.add('hop');
    s.typing = true; let n = 0; const chars = [...full];
    let said = 0; const cjk = /^(ja|zh|ko)/.test(s.c.lang);
    const step = () => { if (S !== s) return; const n0 = n; n = Math.min(chars.length, n + (cjk ? 1 : 2)); if (chars.slice(n0, n).some(ch => !/[\s、。！？!?,.：:（）()「」『』—–・…~〜]/.test(ch)) && (said++ % (cjk ? 3 : 2) === 0)) blip(s.voice); tx.innerHTML = esc(chars.slice(0, n).join('')) + (n < chars.length ? '<span class="cu">▍</span>' : ''); if (n < chars.length) s.tm = setTimeout(step, 34); else done(s); };
    step(); remember(full.split('\n').pop());
  }
  function done(s) {
    s.typing = false;
    const last = s.i >= s.conv.lines.length - 1;
    s.el.querySelector('.at-nx').style.visibility = last ? 'hidden' : '';
    if (last) s.el.querySelector('.at-bt').classList.add('on');
  }
  function next() {
    const s = S; if (!s) return;
    if (s.typing) { clearTimeout(s.tm); s.el.querySelector('.at-tx').textContent = s.conv.lines[s.i]; done(s); return; }
    if (s.i < s.conv.lines.length - 1) { s.i++; say(s); }
  }
  async function open(c) {
    if (S) return;
    if (!document.getElementById('avtalk-css')) { const st = document.createElement('style'); st.id = 'avtalk-css'; st.textContent = CSS; document.head.appendChild(st); }
    c.lang = L(c.lang || document.documentElement.lang);
    const [T, N] = await Promise.all([texts(c.lang), npc(c.lang)]);
    if (!T || S) return;
    const ART = window.AtlasArt, ic = (c.av && c.av.icon) || (ART && ART.DEFAULT_ICON), it = ART && ART.byId(ic);
    const nm = it ? (it.name[c.lang] || it.name.en || it.name.ja).replace(/[（(][^）)]*[）)]\s*$/, '') : '';
    const el = document.createElement('div'); el.id = 'avTalk'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', nm);
    const s = S = { el, c, T, i: 0, conv: compose(c, T, N), voice: voiceOf(String(ic || '').replace(/^av-/, '').replace(/-\d+$/, '')) };
    const U = T.ui, sp = [[8, 14], [84, 10], [90, 62], [4, 70], [70, 88]].map(([x, y], k) => `<i class="sp" style="left:${x}%;top:${y}%;animation-delay:${k * .37}s"></i>`).join('');
    el.innerHTML = `<div class="at-bd"></div><button type="button" class="at-x" aria-label="${esc(U.close)}">×</button>
      <div class="at-st"><div class="at-bub" tabindex="0"><span class="at-nm">${esc(nm)}</span><span class="at-pg">${s.conv.lines.map(() => '<i></i>').join('')}</span><div class="at-tx"></div><span class="at-nx">${esc(U.tap)} ▼</span></div>
      <div class="at-ch"><div class="bg" style="background:${ART ? ART.bgDataUri(c.av && c.av.bg) : '#fff'}"></div>${ART ? `<img src="${ART.avUrl(ic)}" alt="">` : ''}${sp}</div>
      <div class="at-bt">${s.conv.play ? `<button type="button" class="go" data-a="play">${esc(fill(U.play, { game: s.conv.play.name }))}</button>` : ''}<button type="button" data-a="more">${esc(U.more)}</button><button type="button" data-a="dress">${esc(U.dress)}</button><button type="button" data-a="close">${esc(U.close)}</button></div></div>`;
    document.body.appendChild(el);
    const ch = el.querySelector('.at-ch');
    flip(ch, c.from, false);
    requestAnimationFrame(() => el.classList.add('on'));
    pop(s.voice); setTimeout(() => { if (S === s) say(s); }, 380);
    el.querySelector('.at-bd').onclick = () => close();
    el.querySelector('.at-x').onclick = () => close();
    el.querySelector('.at-bub').onclick = next; ch.onclick = next;
    el.querySelector('.at-bt').onclick = e => {
      const b = e.target.closest('button[data-a]'); if (!b) return; const a = b.dataset.a;
      if (a === 'more') { s.conv = compose(c, T, N); s.i = 0; el.querySelector('.at-pg').innerHTML = s.conv.lines.map(() => '<i></i>').join(''); el.querySelector('.at-bt').classList.remove('on'); const pb = el.querySelector('[data-a=play]'); if (pb) pb.remove(); if (s.conv.play) el.querySelector('.at-bt').insertAdjacentHTML('afterbegin', `<button type="button" class="go" data-a="play">${esc(fill(U.play, { game: s.conv.play.name }))}</button>`); say(s); return; }
      const play = s.conv.play; close();
      if (a === 'dress' && c.onDress) setTimeout(c.onDress, 200);
      if (a === 'play' && play && c.onPlay) setTimeout(() => c.onPlay(play.id), 200);
    };
    el.addEventListener('keydown', e => { if (e.key === 'Escape') close(); else if (e.key === 'Enter' || e.key === ' ') { if (e.target.tagName !== 'BUTTON') { e.preventDefault(); next(); } } });
    el.querySelector('.at-bub').focus({ preventScroll: true });
  }
  window.AvTalk = { open, close, compose };
})();
