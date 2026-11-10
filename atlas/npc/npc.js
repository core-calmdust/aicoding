/* =====================================================================
   World Board Game Atlas — table talk with the AI bosses (3D play)
   While you play the AI, its boss (one per 3 levels, atlas/npc/roster.js) and a gacha creature that came to
   watch talk now and then, in the place the rules guide speaks: a card at the top of the info column
   (PC) / under the board (phones) on the portal skins (<game>/?skin=atlas), a bubble over the action bar on the
   portal's own table.
     • not every move: every few moves, or when the position swings (from the game's own evaluation)
     • the boss taunts when ahead, grumbles when behind, cheers its good moves, sulks at yours
     • quiet openings: the watcher tells a bit of trivia about the game
     • beat the boss → its SR avatar is yours (the SSR / UR ones come from the gacha)
   Hosts: AtlasNPC.skin(game)  — called by atlas/skin/common.js (polls the page's own game state, see PROBE)
          AtlasNPC.portal({ game, level }) → { turn(ply), end(res), stop() } — atlas/app.js table play
   ===================================================================== */
(function () {
  'use strict';
  const A = window.AtlasNPC = window.AtlasNPC || {};
  if (A.skin) return;
  const SRC = (document.currentScript && document.currentScript.src) || location.href;
  const BASE = new URL('./', SRC).href, ATLAS = new URL('../', BASE).href, IMG = new URL('../images/atlas/', ATLAS).href, V = '6';
  const LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
  const loaded = {};
  const load = src => loaded[src] || (loaded[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }));
  const langNow = () => { const l = (document.documentElement.lang || 'ja').toLowerCase(); if (l.startsWith('zh')) return /tw|hk|hant/.test(l) ? 'zh-TW' : 'zh'; return LANGS.find(x => l.startsWith(x)) || 'en'; };
  const pick = a => a && a.length ? a[Math.floor(Math.random() * a.length)] : '';
  // a line not said recently (the same line twice in a row sounded robotic)
  const said = [];
  const fresh = a => { if (!a || !a.length) return ''; const c = a.filter(x => !said.includes(x)), x = pick(c.length ? c : a); said.push(x); if (said.length > 6) said.shift(); return x; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function ensure(lang) {
    const need = [];
    if (!A.BOSSES) need.push(load(BASE + 'roster.js?v=' + V));
    if (!window.AtlasArt) need.push(load(ATLAS + 'art.js?v=11').catch(() => {}));
    return Promise.all(need).then(() => load(BASE + 't/' + lang + '.js?v=' + V).catch(() => load(BASE + 't/en.js?v=' + V)))
      .then(() => load(BASE + 't2/' + lang + '.js?v=' + V).catch(() => {}));   // more lines + the watchers' own ways of talking (t2/, where there is one)
  }
  // t2/<lang>.js: more lines for the bosses' voices (added to t/<lang>.js) and the watchers' lines by their voice (fanv)
  A.more = function (lang, o) {
    const T = A.T && A.T[lang]; if (!T || T.__more) return; T.__more = true;
    Object.keys(o.voice || {}).forEach(v => { const d = T.voice[v] = T.voice[v] || {}; Object.keys(o.voice[v]).forEach(k => { d[k] = (d[k] || []).concat(o.voice[v][k]); }); });
    Object.keys(o.fan || {}).forEach(k => { T.fan[k] = (T.fan[k] || []).concat(o.fan[k]); });
    if (o.fanv) T.fanv = o.fanv;
  };
  A.ensure = ensure; A.lang = () => langNow();
  const TX = () => (A.T && (A.T[langNow()] || A.T.en || A.T.ja)) || null;
  const avUrl = id => IMG + 'av/' + id + '.webp?v=1';
  const bossName = (b, l) => (b.n[l] || b.n.en);
  const strip = n => String(n || '').replace(/\s*[（(][^（）()]*[）)]\s*$/, '');

  /* ---------------- look ---------------- */
  const CSS = `
.npc-pic{flex:none;width:60px;height:60px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#fff,#ffe9b0);box-shadow:0 3px 0 rgba(0,0,0,.08);display:grid;place-items:center;overflow:hidden}
[data-who=boss] .npc-pic{background:radial-gradient(circle at 40% 35%,#fff,#ffd2c2)}
[data-who=boss].npc-ur .npc-pic{background:radial-gradient(circle at 40% 35%,#fff7d6,#ffb84a)}
.npc-pic img{width:122%;height:122%;object-fit:contain;transform:translateY(7%)}
.npc-pic.talk{animation:npcTalk .42s ease-in-out 2}
@keyframes npcTalk{50%{transform:translateY(-5px) scale(1.05,.95)}}
.npc-bub{position:relative;flex:1;min-width:0;background:#fff;border:2px solid #f0e2c4;border-radius:16px;padding:7px 12px 8px;box-shadow:0 3px 0 #f0e2c4;color:#2b3044}
.npc-bub::before{content:'';position:absolute;left:-11px;bottom:14px;border:9px solid transparent;border-right-color:#f0e2c4;border-left:0}
.npc-bub::after{content:'';position:absolute;left:-7px;bottom:15px;border:8px solid transparent;border-right-color:#fff;border-left:0}
[dir=rtl] .npc-bub::before,[dir=rtl] .npc-bub::after{left:auto;right:-11px;border-right:0;border-left:9px solid #f0e2c4;border-top-color:transparent;border-bottom-color:transparent}
[dir=rtl] .npc-bub::after{right:-7px;border-left:8px solid #fff}
.npc-nm{display:flex;align-items:baseline;gap:8px;margin-bottom:2px;min-width:0}
.npc-nm b{flex:none;max-width:60%;font-weight:900;font-size:13px;color:#b5651d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
[data-who=fan] .npc-nm b{color:#3a7ac8}
.npc-tag{flex:none;margin-inline-start:auto;font:800 10.5px/1.6 'Fredoka','Zen Maru Gothic',system-ui,sans-serif;letter-spacing:.04em;padding:0 8px;border-radius:99px;background:#f6ead2;color:#8a6a3a;white-space:nowrap}
[data-who=boss] .npc-tag{background:#ffe1d6;color:#b04a2a}
[data-who=fan] .npc-tag.tv{background:#dff0ff;color:#2a6aa8}
.npc-ttl{font-size:11px;line-height:1.5;font-weight:700;color:#9a8a70;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:-1px 0 2px}
.npc-ttl:empty{display:none}
.npc-tx{font-size:14.5px;line-height:1.6;font-weight:700;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;min-height:3.1em}
.npc-float .npc-ttl:empty + .npc-tx{min-height:calc(3.1em + 17px)}   /* the watcher has no title line: the bubble keeps its height */
html[lang=ar] .npc-tx,html[lang=ar] .npc-nm{direction:rtl;text-align:right}
/* the portal's own table: a bubble just above the action bar (left), gone again after a while */
.npc-float{position:fixed;z-index:30;left:50%;bottom:calc(var(--npc-bot,96px) + 10px);width:min(600px,calc(100vw - 24px));display:flex;align-items:flex-end;gap:12px;pointer-events:none;opacity:0;transform:translate(-50%,14px);transition:opacity .3s,transform .4s cubic-bezier(.3,1.3,.5,1)}
.npc-float .npc-pic{width:88px;height:88px}
.npc-float .npc-bub{padding:10px 16px 12px;border-radius:20px}
.npc-float .npc-nm b{font-size:16px}
.npc-float .npc-tag{font-size:12px}
.npc-float .npc-ttl{font-size:12.5px}
.npc-float .npc-tx{font-size:18px;line-height:1.55}
/* phones: smaller, so it does not get in the way of play (and a tap on it puts it away) */
@media (max-width:520px){.npc-float{width:min(420px,calc(100vw - 24px));gap:7px}.npc-float .npc-pic{width:46px;height:46px}.npc-float .npc-bub{padding:6px 11px 8px;border-radius:15px}.npc-float .npc-nm b{font-size:12.5px}.npc-float .npc-tag{font-size:10px}.npc-float .npc-ttl{font-size:10.5px}.npc-float .npc-tx{font-size:13px;line-height:1.5}.npc-float .npc-ttl:empty + .npc-tx{min-height:0}}
.npc-float.on .npc-pic,.npc-float.on .npc-bub{pointer-events:auto;cursor:pointer}
.npc-float.on{opacity:1;transform:translate(-50%,0)}
.bv > .npc-float{position:absolute;z-index:3}
.npc-float.npc-skin{z-index:45}
.npc-float .npc-bub{box-shadow:0 4px 0 #f0e2c4,0 14px 24px -14px rgba(80,40,0,.5)}
/* SR won */
.npc-toast{position:fixed;z-index:9000;left:50%;top:calc(14px + env(safe-area-inset-top));transform:translate(-50%,-140%);display:flex;align-items:center;gap:12px;padding:10px 18px 10px 10px;border-radius:20px;background:#fffdf6;border:2px solid #ffd27a;box-shadow:0 6px 0 #f0c868,0 18px 30px -12px rgba(80,40,0,.5);transition:transform .5s cubic-bezier(.3,1.3,.5,1);max-width:calc(100vw - 24px);box-sizing:border-box}
.npc-toast.on{transform:translate(-50%,0)}
.npc-toast img{width:64px;height:64px;flex:none;object-fit:contain}
.npc-toast b{display:block;font-size:15px;color:#b5651d;font-weight:900}
.npc-toast small{display:block;font-size:12px;color:#6a6a7a;font-weight:700;margin-top:2px}
.npc-toast .sr{display:inline-block;margin-inline-end:6px;padding:0 7px;border-radius:99px;background:linear-gradient(180deg,#c07aff,#8a4ad8);color:#fff;font:800 11px/1.6 'Fredoka',system-ui,sans-serif}.npc-toast .sr.r0{background:linear-gradient(180deg,#b8bcc8,#8a90a0)}.npc-toast .sr.r1{background:linear-gradient(180deg,#5ab8ff,#2a7ad8)}
@media (hover:hover) and (pointer:fine) and (min-width:820px){.npc-toast{gap:20px;padding:16px 30px 16px 16px;border-radius:28px;border-width:3px}.npc-toast img{width:108px;height:108px}.npc-toast b{font-size:26px}.npc-toast small{font-size:16px;margin-top:5px}.npc-toast .sr{font-size:14px;padding:0 10px}}   /* PC: the boss-beaten banner larger (2026-11-10) */
`;
  let cssDone = false;
  const addCss = () => { if (cssDone) return; cssDone = true; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); };

  /* ---------------- the conversation (shared by both hosts) ---------------- */
  // ui: { say(who, html, meta), clear() }   who: 'boss' | 'fan'
  function Talk(game, ui, o) {
    const S = { game, level: 0, bi: -1, boss: null, fan: null, fans: [], here: 0, lastFan: null, ply: -1, last: -99, next: 3, hAt: 0, hNow: null, triv: 0, told: [], over: false, greeted: false, joined: false, fanTurn: 0, pace: o.pace || 1, early: o.early || 12, timers: [] };
    const later = (f, ms) => { S.timers.push(setTimeout(f, ms)); };
    function chooseFan(not = []) {
      let owned = [];
      try { const W = window.Atlas && Atlas.load ? Atlas.load() : null; owned = (W && W.owned || []).filter(id => /^av-(?!boss-)[a-z]+-\d$/.test(id)); } catch (e) {}
      const all = window.AtlasArt ? AtlasArt.items.filter(it => it.kind === 'icon' && !it.boss).map(it => it.id) : [];
      const pool = owned.length >= 3 && Math.random() < .7 ? owned : all.length ? all : ['av-dice-0', 'av-plop-0', 'av-stone-0'];
      const spOf = x => (x.match(/^av-([a-z]+)-/) || [])[1], left = pool.filter(x => !not.includes(spOf(x)));   // (several watchers: not two of one kind)
      const id = pick(left.length ? left : pool), it = window.AtlasArt && AtlasArt.byId(id), sp = spOf(id);
      return { id, sp, v: (A.VOICE && A.VOICE[sp]) || 'cute', img: avUrl(id.slice(3)), name: () => strip(it ? (it.name[langNow()] || it.name.en) : '') };
    }
    function setLevel(lv) {
      lv = lv | 0; const bi = A.band(game, lv); if (bi < 0) return false;
      if (bi !== S.bi) { S.bi = bi; S.boss = A.BOSSES[game][bi]; S.greeted = false; }
      S.level = lv; return true;
    }
    const bossMeta = () => { const n = A.BOSSES[game].length; return { name: bossName(S.boss, langNow()), img: avUrl(A.bossId(game, S.bi) + '-' + (S.bi === n - 1 ? 3 : 2)), tag: (TX().ui.boss) + ' ' + A.range(game, S.bi), ur: S.bi === n - 1, title: ((TX().bosses || {})[game] || [])[S.bi] || '' }; };
    const fanMeta = tv => ({ name: S.fan.name(), img: S.fan.img, tag: tv ? TX().ui.trivia : TX().ui.watch, tv });
    // what is being said, as (where, key, index) — the lists are the same in every language, so a language change mid-game
    // can put the same line in the new language on the bubble at once (2026-11-09: it stayed in the old one)
    const lists = {
      boss: key => { const X = TX(); return X && S.boss ? (X.voice[S.boss.v] || X.voice.cool)[key] : null; },
      fanv: key => { const X = TX(), fv = X && S.fan && X.fanv && X.fanv[S.fan.v]; return fv ? fv[key] : null; },
      fan: key => { const X = TX(); return X ? X.fan[key] : null; },
      triv: () => { const X = TX(); return (X && X.trivia[game]) || null; },
    };
    const lineOf = c => { const L = lists[c.src](c.key); return L && L.length ? L[Math.min(c.i, L.length - 1)] : ''; };
    const metaOf = c => { if (c.src !== 'boss' && S.fans[c.f]) S.fan = S.fans[c.f]; return c.src === 'boss' ? bossMeta() : fanMeta(c.src === 'triv'); };
    function speak(c) {
      if (c.src !== 'boss') c.f = S.fans.indexOf(S.fan);
      const m = metaOf(c), line = lineOf(c); if (!line) return;
      S.cur = c; ui.say(c.src === 'boss' ? 'boss' : 'fan', esc(line.replace('{me}', m.name)), m);
    }
    // several watchers (2026-11-09): two or three come to watch, one after another; whoever speaks is one of those who are
    // here, not the one who spoke last if another is here
    function nextFan() { const here = S.fans.slice(0, S.here); if (!here.length) return false; const c = here.filter(f => f !== S.lastFan); S.fan = pick(c.length ? c : here); S.lastFan = S.fan; return true; }
    function boss(key) {
      const L = lists.boss(key); if (!L) return; const line = fresh(L); if (!line) return;
      speak({ src: 'boss', key, i: L.indexOf(line) });
    }
    function fan(key) {
      const X = TX(); if (!X || !(key === 'join' || nextFan())) return; const own = lists.fanv(key), useOwn = own && own.length && (Math.random() < .8 || !X.fan[key]);
      const L = useOwn ? own : X.fan[key], line = fresh(L); if (!line) return;
      speak({ src: useOwn ? 'fanv' : 'fan', key, i: L.indexOf(line) });
    }
    function trivia() {
      const X = TX(), L = (X && X.trivia[game]) || []; if (!L.length || !nextFan()) return false;
      const left = L.map((_, i) => i).filter(i => !S.told.includes(i)); if (!left.length) return false;
      const i = pick(left); S.told.push(i); S.triv++;
      speak({ src: 'triv', key: '', i }); return true;
    }
    // the language changed: the bubble on screen now says its line in the new language (same place, same time left)
    function relang() {
      const c = S.cur; if (!c || !ui.showing || !ui.showing()) return;
      const m = metaOf(c), line = lineOf(c); if (line && ui.retext) ui.retext(esc(line.replace('{me}', m.name)), m);
    }
    function greet() {
      S.greeted = true; S.over = false; S.last = S.ply; S.hAt = 0; S.next = S.ply + Math.round((2 + Math.random() * 2) * S.pace);
      boss('greet');
    }
    function newGame(ply) {
      S.timers.forEach(clearTimeout); S.timers = [];
      S.ply = ply; S.over = false; S.triv = 0; S.told = []; S.joined = false; S.fanTurn = 0; S.here = 0; S.lastFan = null;
      S.fans = []; const n = Math.random() < .45 ? 3 : 2; for (let i = 0; i < n; i++) S.fans.push(chooseFan(S.fans.map(f => f.sp)));
      S.fan = S.fans[0];
      greet();
      // they arrive one by one (each says hello as it comes)
      [8500, 32000, 62000].slice(0, S.fans.length).forEach((ms, i) => later(() => {
        if (S.over || S.here > i) return; S.here = i + 1; S.joined = true; S.fan = S.fans[i]; S.lastFan = S.fan; fan('join'); S.last = S.ply;
      }, ms));
    }
    // the position moved on: decide whether somebody says something (h = the human's outlook −1 … 1, or null)
    function step(ply, h) {
      if (S.over) return;
      if (!S.greeted) { newGame(ply); return; }
      if (ply === S.ply) { if (h != null) S.hNow = h; return; }
      S.ply = ply; if (h != null) S.hNow = h;
      const since = ply - S.last;
      if (since < Math.max(2, Math.round(1.5 * S.pace))) return;
      const hh = S.hNow, swing = hh == null ? 0 : hh - S.hAt;
      let said = false;
      if (hh != null && Math.abs(swing) >= .26) {
        boss(swing > 0 ? 'slip' : 'gain'); said = true;
        if (Math.random() < .4) { const k = swing > 0 ? 'nice' : 'oops'; later(() => { if (!S.over) fan(k); }, 4200); }   // the watcher reacts too
      }
      else if (ply >= S.next) {
        const calm = hh == null || Math.abs(hh) < .3;
        if (ply <= S.early * S.pace && calm && S.triv < 4 && Math.random() < .6 && trivia()) said = true;
        else if (hh != null && S.fanTurn < 1 && Math.random() < .3) { fan(hh > .3 ? 'cheer' : hh < -.3 ? 'worry' : 'close'); S.fanTurn++; said = true; }
        else {
          S.fanTurn = 0;
          if (hh == null) { if (!(S.triv < 4 && Math.random() < .5 && trivia())) boss('even'); }
          else boss(hh < -.5 ? 'lead' : hh < -.15 ? (Math.random() < .6 ? 'lead' : 'even') : hh <= .15 ? 'even' : hh <= .55 ? 'behind' : 'losing');
          said = true;
        }
      }
      if (said) { S.last = ply; if (S.hNow != null) S.hAt = S.hNow; S.next = ply + Math.round((2 + Math.random() * 2) * S.pace); }
    }
    // the game ended: res = 'w' (the human won) | 'l' | 'd'
    function end(res) {
      if (S.over || !S.boss) return; S.over = true;
      S.timers.forEach(clearTimeout); S.timers = [];
      boss(res === 'w' ? 'lose' : res === 'l' ? 'win' : 'draw');
      later(() => fan(res === 'w' ? 'win' : res === 'l' ? 'lose' : 'draw'), 3600);
      if (S.here > 1) later(() => fan(res === 'w' ? 'win' : res === 'l' ? 'lose' : 'draw'), 7600);   // (a second watcher has its say too)
      if (res === 'w') grant();
    }
    // beating a boss: the 1st / 2nd / 3rd level of its three gives its N / R / SR avatar (once each)
    function grant() {
      const t = A.tier(game, S.level), id = 'av-' + A.bossId(game, S.bi) + '-' + t;
      try {
        if (!window.Atlas || !Atlas.load) return;
        const W = Atlas.load(); if (!W || W.owned.includes(id)) return;
        W.owned.push(id); Atlas.save(W);
        later(() => toast(id, bossName(S.boss, langNow()), t), 1200);
      } catch (e) {}
    }
    return { S, setLevel, step, end, newGame, relang, relabel: () => ui.relabel && ui.relabel() };
  }
  function toast(id, name, t) {
    const R = ['N', 'R', 'SR'][t] || 'SR';
    addCss(); const X = TX(); if (!X) return;
    const el = document.createElement('div'); el.className = 'npc-toast'; el.setAttribute('role', 'status');
    el.innerHTML = `<img src="${avUrl(id.slice(3))}" alt=""><div><b>${esc(X.ui.beat.replace('{name}', name))}</b><small><span class="sr r${t}">${R}</span>${esc(X.ui.got.replace('{name}', name).replace('SR', R))}</small><small>${esc(X.ui.gacha.replace('{name}', name))}</small></div>`;
    document.body.appendChild(el); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
    setTimeout(() => { el.classList.remove('on'); setTimeout(() => el.remove(), 600); }, 5200);
    try { if (window.SFX && SFX.win) SFX.win(); } catch (e) {}
  }

  /* ---------------- UI: the card in the info column (skins) ---------------- */
  /* ---------------- UI: the floating bubble (portal table) ---------------- */
  // o.bottom() → px from the bottom of the window (default: over the portal's action bar)
  // the options' 「キャラ会話」 on / off (one switch for the portal and the full versions; the boss's avatar is still given)
  const KEY = 'atlas-npc';
  A.on = () => { try { return localStorage.getItem(KEY) !== '0'; } catch (e) { return true; } };
  A.setOn = v => { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {} if (!v) document.querySelectorAll('.npc-float.on').forEach(e => e.classList.remove('on')); };
  A.LABEL = { ja: 'キャラ会話', en: 'Character talk', zh: '角色对话', 'zh-TW': '角色對話', ko: '캐릭터 대화', es: 'Charla de personajes', fr: 'Bavardage des personnages', pt: 'Conversa dos personagens', de: 'Figuren-Gespräche', ru: 'Реплики персонажей', tr: 'Karakter sohbeti', id: 'Obrolan karakter', hi: 'पात्रों की बातचीत', ar: 'حديث الشخصيات' };
  A.ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5h16v10H10l-4.5 4v-4H4z"/><path d="M8 10.5h.01M12 10.5h.01M16 10.5h.01" stroke-width="2.6"/></svg>';
  // phones: in landscape the board comes first — no bubble at all (portrait: it stays)
  const PCQ = matchMedia((window.HeaderBar && HeaderBar.MEDIA) || '(hover: hover) and (pointer: fine) and (min-width: 1040px) and (min-aspect-ratio: 3/4)');
  const phoneLand = () => !PCQ.matches && innerWidth > innerHeight && innerHeight < 600;
  function floatUI(o = {}) {
    addCss();
    const el = document.createElement('div'); el.className = 'npc-float'; el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<div class="npc-pic"><img alt=""></div><div class="npc-bub"><div class="npc-nm"><b></b><span class="npc-tag"></span></div><div class="npc-ttl"></div><div class="npc-tx"></div></div>';
    const img = el.querySelector('img'), nm = el.querySelector('.npc-nm b'), tag = el.querySelector('.npc-tag'), tx = el.querySelector('.npc-tx'), pic = el.querySelector('.npc-pic'), ttl = el.querySelector('.npc-ttl');
    (o.body ? document.body : document.getElementById('bv') || document.body).appendChild(el);   // (inside the portal's 3D view: over the table, under its end-of-game card)
    let hideT = 0;
    addEventListener('resize', () => { if (phoneLand()) { clearTimeout(hideT); el.classList.remove('on'); } });   // (turned sideways while talking)
    el.addEventListener('click', e => { e.stopPropagation(); clearTimeout(hideT); el.classList.remove('on'); });   // tap the guide or the bubble: it steps away
    return {
      el,
      say(who, html, m) {
        if (phoneLand() || !A.on()) { clearTimeout(hideT); el.classList.remove('on'); return; }
        try { const l = o.left && o.left(); el.style.left = l ? Math.round(l[0]) + 'px' : ''; el.style.width = l ? `min(600px, ${Math.round(l[1] - 24)}px)` : ''; } catch (e) {}
        el.dataset.who = who; el.classList.toggle('npc-ur', !!m.ur);
        if (img.getAttribute('src') !== m.img) img.src = m.img;
        nm.textContent = m.name; tag.textContent = m.tag; tag.classList.toggle('tv', !!m.tv); ttl.textContent = m.title || ''; tx.innerHTML = html;
        // (after the text: the place may depend on the bubble's height — the skins centre it between the board and the bar)
        try { const b = o.bottom ? o.bottom(el) : window.__tbar && __tbar.band; if (b) el.style.setProperty('--npc-bot', Math.round(b) + 'px'); } catch (e) {}
        el.classList.add('on'); pic.classList.remove('talk'); void pic.offsetWidth; pic.classList.add('talk');
        clearTimeout(hideT); hideT = setTimeout(() => el.classList.remove('on'), Math.max(7500, tx.textContent.length * 170));
      },
      hide() { clearTimeout(hideT); el.classList.remove('on'); },
      showing: () => el.classList.contains('on'),
      retext(html, m) { nm.textContent = m.name; tag.textContent = m.tag; ttl.textContent = m.title || ''; tx.innerHTML = html; },
      remove() { clearTimeout(hideT); el.remove(); },
    };
  }

  /* ---------------- UI on the skins: the same bubble as the portal's, stepping away again after a few seconds ----------------
     PC: centred on the window, half-way between the board's lower edge and the online dock's bar (2026-11-09; never on the bar,
     on the board's edge when the gap is too small); phones: just above the bottom tab bar (cards in the info column pushed the
     boxes around) */
  // the board on screen: the 3D board as drawn (the DOM board + its measured overhang, common.js __atlasPcFit), else the DOM board
  function boardBox() {
    const vis = e => e && e.getClientRects().length && getComputedStyle(e).display !== 'none';
    let top = Infinity, bottom = -Infinity;
    const add = (t, b) => { top = Math.min(top, t); bottom = Math.max(bottom, b); };
    try { const pf = window.__atlasPcFit, bd = pf && pf.board && pf.board(); if (bd && vis(bd)) { const r = bd.getBoundingClientRect(), k = !document.documentElement.classList.contains('atlas-2d') && pf.K && pf.K();
      const kb = k && isFinite(k.b) ? Math.max(0, k.b) : 0, kt = k && isFinite(k.t) ? Math.max(0, k.t) : 0; add(r.top - kt * r.height, r.bottom + kb * r.height); } } catch (e) {}
    const bd = ['#frame', '#boardWrap', '.board-wrap', '#board', '.board'].map(q => document.querySelector(q)).find(vis);   // (and the DOM board / the 3D frame, a little past it)
    if (bd) { const r = bd.getBoundingClientRect(); add(r.top - 8, r.bottom + 8); }
    return isFinite(top) ? { top, bottom } : null;
  }
  function skinUI() {
    const PC = matchMedia((window.HeaderBar && HeaderBar.MEDIA) || '(hover: hover) and (pointer: fine) and (min-width: 1040px) and (min-aspect-ratio: 3/4)');
    const vis = e => e && e.getClientRects().length && getComputedStyle(e).display !== 'none';
    const fl = floatUI({ body: true,
      // PC: just above the online dock's bar (centred on the window); phones: over the bottom tab bar (landscape: none)
      bottom: el => {
        if (PC.matches) {
          const d = document.getElementById('dock') || document.querySelector('.dock'), yd = vis(d) ? d.getBoundingClientRect().top : innerHeight - 10;
          let b = innerHeight - yd + 6;   // (just above the bar: the lowest it may go)
          // the board's lower edge: the 3D board as drawn (the DOM board + its measured overhang, common.js __atlasPcFit), else the DOM board
          const bx = boardBox(), yb = bx && bx.bottom;
          const h = el ? el.offsetHeight : 0;
          if (yb != null && yd > yb) b = Math.max(b, innerHeight - (yb + yd) / 2 - h / 2 - 10);   // (the float sits at --npc-bot + 10px)
          return b;
        }
        // phones (portrait): on the bottom tab bar itself, for a few seconds (a tap puts it away) — the one place that stays put
        const t = [...document.querySelectorAll('.mtabs, #mtabs')].find(e => vis(e) && getComputedStyle(e).position === 'fixed');
        return t ? Math.max(0, innerHeight - t.getBoundingClientRect().bottom) - 4 : 2;
      },
      left: () => null });   // centred on the whole window, as on the portal's 3D table
    fl.el.classList.add('npc-skin');
    return { say: fl.say, hide: fl.hide, showing: fl.showing, retext: fl.retext };
  }

  /* ---------------- reading the game's own state (skins) ----------------
     Every probe returns null (not ready / not an AI game) or { gid, level, ply, h, live }:
       gid = the game object (a new one = a new game), h = the human's outlook −1 … 1 (null = unknown), live = the latest position on view */
  const G = n => { try { return (0, eval)(n); } catch (e) { return undefined; } };
  const th = Math.tanh;
  function tpl(game) {   // the shared template (chess, gomoku, go, morris, connect4, checkers, xiangqi, janggi, hex, tafl, fanorona, ugolki, agon, konane, alquerque)
    const st = G('settings'); if (!st || st.mode !== 'ai' || G('lesson') || G('puzzle') || G('net') || G('rgame')) return null;
    const mv = G('moves'); if (!Array.isArray(mv) && typeof mv !== 'string') return null;   // (connect4: the record is a string of column digits)
    const ply = mv.length, evalAt = G('evalAt'), hc = G('humanColor');
    let ev = null;
    if (typeof evalAt === 'function') for (let i = ply; i >= Math.max(0, ply - 2) && ev == null; i--) { try { ev = evalAt(i); } catch (e) {} }
    if (ev != null && game === 'go') ev = ev * 2 - 1;   // go: black's win rate
    const h = ev == null || !isFinite(ev) ? null : (hc === 2 ? -ev : ev);
    return { gid: null, level: st.level, ply, h, live: G('cur') === ply && !G('reviewing') };   // (moves is a new array after every move: a new game = the record starting over)
  }
  const PROBE = {
    reversi() {
      const st = G('settings'); if (!st || st.mode !== 'ai' || G('lesson') || G('puzzle') || G('net') || G('rated')) return null;
      const P = G('positions'); if (!Array.isArray(P) || !P.length) return null;
      const ply = P.length - 1; let ev = null; for (let i = ply; i >= Math.max(0, ply - 2) && ev == null; i--) if (P[i] && P[i].evalB != null) ev = P[i].evalB;
      return { gid: P[0], level: st.level, ply, h: ev == null ? null : th((G('humanColor') === 1 ? ev : -ev) / 14), live: G('cur') === ply && !G('reviewing') };
    },
    shogi() {
      const st = G('settings'), g = G('game'); if (!st || !g || st.mode !== 'ai' || g.rated || G('lesson') || G('net')) return null;
      const ply = g.moves.length; let ev = null; for (let i = ply; i >= Math.max(0, ply - 2) && ev == null; i--) if (g.info[i] && g.info[i].ev != null) ev = g.info[i].ev;
      return { gid: g, level: st.level + 1, ply, h: ev == null ? null : th((g.human === 0 ? ev : -ev) / 900), live: G('cur') === ply && !G('reviewing') };   // (the page counts its levels from 0)
    },
    backgammon() {
      const st = G('settings'), M = G('match'); if (!st || !M || st.mode !== 'ai' || G('lesson') || G('puzzle') || G('net')) return null;
      const gi = M.games.length - 1, a = M.games[gi].actions.length; let e = null; try { e = G('evalOf')(gi, a); } catch (er) {}
      const hs = G('humanSide'), ply = G('latestIdx')();
      return { gid: M, level: st.level, ply, h: e && e.p != null ? (hs === 0 ? 2 * e.p - 1 : 1 - 2 * e.p) : null, live: G('cur') === ply && !G('reviewing') };
    },
    mancala() {
      const st = G('settings'), g = G('game'), E = G('evals'); if (!st || !g || st.mode !== 'ai' || G('lesson') || G('puzzle') || G('net') || G('rgame')) return null;
      const ply = g.moves.length; let v = null; if (Array.isArray(E)) for (let i = ply; i >= Math.max(0, ply - 2) && v == null; i--) if (E[i] && E[i].v != null) v = E[i].v;
      return { gid: g, level: st.level, ply, h: v == null ? null : th((g.human === 0 ? v : -v) / 6), live: G('cur') === ply && !G('reviewing') };
    },
    dots() {
      const st = G('settings'), g = G('game'), SF = G('SF'); if (!st || !g || st.mode !== 'ai' || G('lesson') || G('puzzle') || G('net') || G('rated')) return null;
      const s = SF && SF.scores, hm = g.human;
      return { gid: g, level: st.level, ply: g.moves.length, h: s ? th((s[hm] - s[1 - hm]) / 3) : null, live: G('viewPly') == null };
    },
    ur() { return urLike(); },
    senet() { return urLike(); },
    ludo() {
      const st = G('settings'), g = G('G'); if (!st || !g || g.mode !== 'ai' || g.rated || G('SP')) return null;
      return { gid: g, level: g.level, ply: g.plies.length, h: null, live: !G('VIEW') };
    },
  };
  let urCache = { k: '', h: null };
  function urLike() {
    const st = G('settings'), g = G('game'), E = G('E'); if (!st || !g || st.mode !== 'ai' || G('lesson') || G('puzzle') || G('net') || G('rgame')) return null;
    const ply = g.plies.length, k = g.id + ':' + ply;
    if (urCache.k !== k) { urCache.k = k; urCache.h = null; try { const s = G('curState')(); if (s && E && E.winProb) { const p = E.winProb(s); urCache.h = s.turn === g.human ? 2 * p - 1 : 1 - 2 * p; } } catch (e) {} }
    return { gid: g, level: st.level, ply, h: urCache.h, live: true };
  }
  const PACE = { backgammon: 2.2, ludo: 2, ur: 1.6, senet: 1.6, dots: 1.4, go: 1.6, connect4: .8 };
  const EARLY = { chess: 14, shogi: 20, go: 30, reversi: 16, gomoku: 10, connect4: 8, dots: 12, morris: 10, mancala: 10, hex: 14 };

  /* ---------------- host: a portal skin page ---------------- */
  A.skin = function (game) {
    if (!game || A.active) return;
    const lang0 = langNow();
    ensure(lang0).then(() => {
      if (!A.BOSSES || !A.BOSSES[game]) return;
      const ui = skinUI(), T = Talk(game, ui, { pace: PACE[game], early: EARLY[game] });
      A.active = T;
      // the options (gear) panel: 「キャラ会話」 on / off
      try { if (window.HeaderBar && HeaderBar.addOption) HeaderBar.addOption({ id: 'npc', icon: A.ICON, label: A.LABEL, type: 'toggle', get: A.on, set: v => A.setOn(v) }); } catch (e) {}
      let gid = null, lastPly = -1, shown = false, ended = false, started = false;
      // the end of a game: every game reports it to the shared record (shared/record.js)
      if (window.GameRecord && GameRecord.add && !GameRecord.add.__npc) {
        const add0 = GameRecord.add;
        GameRecord.add = function (o) { const r = add0.apply(this, arguments); try { if (o && o.mode === 'ai' && started && !ended) { ended = true; T.end(o.res); } } catch (e) {} return r; };
        GameRecord.add.__npc = true;
      }
      const tick = () => {
        let p = null; try { p = (PROBE[game] || (() => tpl(game)))(); } catch (e) { p = null; }
        A.peek = p;   // (tests)
        if (!p) { if (shown) { ui.hide(); shown = false; } gid = null; started = false; return; }
        if (!T.setLevel(p.level)) return;
        // a new game: another game object, or the record starting over (a takeback only goes back a move or two)
        const fresh = !started || (p.gid && p.gid !== gid) || (p.ply < lastPly && (p.ply <= 1 || lastPly - p.ply > 4));
        if (fresh) { started = true; gid = p.gid; lastPly = p.ply; ended = false; T.newGame(p.ply); shown = true; return; }
        if (p.ply < lastPly) { lastPly = p.ply; T.step(p.ply, p.h); return; }
        if (!p.live) return;   // looking at an earlier position: keep quiet
        lastPly = p.ply; T.step(p.ply, p.h); shown = true;
      };
      setInterval(tick, 700); tick();
      // the language changed (the page's language menu): load its lines
      new MutationObserver(() => { const l = langNow(); ensure(l).then(() => T.relang()).catch(() => {}); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }).catch(() => {});
  };

  /* ---------------- host: the portal's own table (atlas/app.js) ---------------- */
  A.portal = function (o) {
    let ui = null, T = null, dead = false;
    ensure(langNow()).then(() => {
      if (dead || !A.BOSSES || !A.BOSSES[o.game]) return;
      ui = floatUI(); T = Talk(o.game, ui, { pace: PACE[o.game], early: EARLY[o.game] });
      T.setLevel(o.level); T.newGame(0);
      // the portal's language menu mid-game: the lines in the new language (the bubble on screen too)
      const mo = new MutationObserver(() => { if (dead) { mo.disconnect(); return; } ensure(langNow()).then(() => T && T.relang()).catch(() => {}); });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }).catch(() => {});
    return {
      turn(ply) { if (T && ply != null) T.step(ply, null); },
      end(res) { if (T) T.end(res.draw ? 'd' : res.win ? 'w' : 'l'); },
      bottom(px) { document.documentElement.style.setProperty('--npc-bot', Math.round(px) + 'px'); },
      stop() { dead = true; if (ui) setTimeout(() => ui.remove(), 6000); },
      kill() { dead = true; if (ui) ui.remove(); },
    };
  };
})();
