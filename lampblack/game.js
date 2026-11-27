/* 狼影灯 LAMPBLACK WEREWOLF — 画面と進行
   幕の流れ：タイトル → 物語をえらぶ → むずかしさと役 → 序幕 →（朝 → 調べる → 集会 → 投票 → 夜）× n → 終幕（正体と告白）
   すべての出来事は engine.js が決め、speech.js がその人の声の文にする。ここは見せ方だけ。 */
(function () {
  'use strict';
  const E = window.WLEngine, SP = window.WLSpeech, ART = window.WLArt, SND = window.WLSound;
  const $ = id => document.getElementById(id);
  const PCQ = matchMedia('(hover:hover) and (pointer:fine) and (min-width:1040px) and (min-aspect-ratio:3/4)');
  const KEY = 'wolflantern-save-v1', REC = 'wolflantern-rec-v1', PREF = 'wolflantern-pref-v1';
  const ORDER = ['kirigane', 'hokushin', 'tomoshibi', 'nekonaki', 'shirane', 'kiteki'];
  const DIFFN = ['入門', '標準', '中級', '上級', '悪夢'];
  const DIFFT = ['はじめての夜に。嘘をつく者がいる。', '嘘つきが、ぼろを出しにくくなる。', '嘘つきが、ぼろを出さなくなる。', '嘘つきは悪夢なみ。', '嘘と罠ばかり。誰の言葉も信じきれない。'];
  // the card's line follows the story's real cast for that size (the wolves and the roles differ story by story)
  function diffDesc(s, i) {
    const R = E.setupOf(s, E.DIFF[i].size);
    if (E.DIFF[i].hide) return `狼${R.wolf}匹。${E.DIFF[i].hide.seer >= 1 ? '占い師のほかに' : 'ほかに'}誰がいるかは、わからない。${DIFFT[i]}`;
    const mad = R.madman ? `と${s.rules === 'fanatic' ? (s.roles.madman || {}).name || '狂信者' : '狂人'}${R.madman > 1 ? R.madman + '人' : ''}` : '';
    const ex = [R.guard && '狩人', R.mason && '共有者', R.cat && '猫又', R.fox && '妖狐', R.immoral && '背徳者'].filter(Boolean);
    return `狼${R.wolf}匹${mad}。${ex.length ? ex.join('・') + 'がいる。' : ''}${DIFFT[i]}`;
  }
  // the role card's line on who is in the village
  function castLine() {
    if (S.hid) return `この${st.lex.village}には人狼が${S.wolves.length}匹いる。${seerSure() ? `${st.roles.seer.name}のほかに` : 'ほかに'}誰がいるかは、わからない――${hidList()}が、いるかもしれないし、いないかもしれない。全部で${S.size}人。`;
    return `この${st.lex.village}には人狼が${S.wolves.length}匹${E.RS(S).madman ? (st.rules === 'fanatic' ? `、狼の正体を知る狂信者が${E.RS(S).madman > 1 ? NUM[E.RS(S).madman] + '人' : 'ひとり'}` : `、狼に味方する狂人が${E.RS(S).madman > 1 ? NUM[E.RS(S).madman] + '人' : 'ひとり'}`) : ''}${E.RS(S).cat ? '、道連れの猫又がひとり' : ''}${E.RS(S).fox ? `、${st.roles.fox.tag || '社に棲む妖狐'}がひとり` : ''}${E.RS(S).immoral ? `、${st.roles.immoral.tag || '妖狐に仕える背徳者'}がひとり` : ''}${E.RS(S).mason ? '、互いを知る共有者がふたり' : ''}いる。全部で${S.size}人。`;
  }
  const seerSure = () => ((E.DIFF[S.diff].hide || {}).seer || 0) >= 1;
  // 上級・悪夢：いるかもしれない役（数は伏せる）
  function hidList() { const P = E.PUB(S), mad = st.rules === 'fanatic' ? (st.roles.madman || {}).name || '狂信者' : '狂人'; return [P.seer && !seerSure() && st.roles.seer.name, P.medium && st.roles.medium.name, P.guard && (st.roles.guard || {}).name, P.madman && st.rules !== 'fanatic' && mad].filter(Boolean).join('・'); }
  const NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
  const ROLE_ICON = {
    auto: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="11"/><path d="M12.5 12.5a3.6 3.6 0 1 1 4.8 3.4c-.9.4-1.3 1.1-1.3 2.1v.6M16 22.5v.2"/></svg>',
    villager: '<svg viewBox="0 0 32 32"><path d="M6 27V14l10-8 10 8v13z"/><path d="M13 27v-7h6v7"/></svg>',
    seer: '<svg viewBox="0 0 32 32"><ellipse cx="16" cy="13" rx="8" ry="9"/><path d="M16 22v6M11 28h10"/><path d="M12.6 11.6c1.4-2 5.4-2 6.8 0"/></svg>',
    medium: '<svg viewBox="0 0 32 32"><path d="M16 4c-5 6-8 10-8 14a8 8 0 0 0 16 0c0-4-3-8-8-14z"/><path d="M13 19a3 3 0 0 0 6 0"/></svg>',
    guard: '<svg viewBox="0 0 32 32"><path d="M16 4l10 4v7c0 6.6-4.3 11-10 13-5.7-2-10-6.4-10-13V8z"/><path d="M12 16l3 3 5-6"/></svg>',
    mason: '<svg viewBox="0 0 32 32"><circle cx="11" cy="11" r="4"/><circle cx="21" cy="11" r="4"/><path d="M4 26c0-5 3-8 7-8s7 3 7 8M14 26c0-5 3-8 7-8s7 3 7 8"/></svg>',
    cat: '<svg viewBox="0 0 32 32"><path d="M8 27c0-7 3-12 8-12s8 5 8 12z"/><path d="M11 15l-2-7 5 4M21 15l2-7-5 4"/><path d="M24 26c4 0 5-4 3-6M24 26c3 2 6 0 6-3"/></svg>',
  };
  // what a result reads as, in words and in one letter
  const resWord = r => r === 'wolf' ? '人狼' : r === 'fox' ? '妖狐' : r === 'guard' ? '守った' : '人間';
  const resMark = r => r === 'wolf' ? '黒' : r === 'fox' ? '狐' : '白';
  const resCls = r => r === 'wolf' ? 'k' : r === 'fox' ? 'f' : 'h';
  const IC = {
    search: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/></svg>',
    talk: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    bag: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    go: '<svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>',
    show: '<svg viewBox="0 0 24 24"><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.6"/></svg>',
    call: '<svg viewBox="0 0 24 24"><path d="M4 10v4h3l5 4V6L7 10H4z"/><path d="M16 9c1.2 1.6 1.2 4.4 0 6M18.5 7c2.2 2.8 2.2 7.2 0 10"/></svg>',
    clash: '<svg viewBox="0 0 24 24"><path d="M5 5l6 6M19 5l-6 6M12 13v7M8 20h8"/><path d="M4 4l2 0 0 2M20 4h-2v2"/></svg>',
    point: '<svg viewBox="0 0 24 24"><path d="M4 12h11M11 7l5 5-5 5"/><circle cx="19" cy="12" r="1.6"/></svg>',
    ask: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/><path d="M10.2 8.6a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1v.4M12 13.6v.1"/></svg>',
    vote: '<svg viewBox="0 0 24 24"><path d="M5 11l4 4 10-10"/><path d="M4 20h16"/></svg>',
    hand: '<svg viewBox="0 0 24 24"><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4.5a1.5 1.5 0 0 1 3 0V11M14 10.5V6a1.5 1.5 0 0 1 3 0v7.5c0 4-2.5 6.5-6 6.5-2.6 0-4.4-1.4-5.6-3.6L4 13.3a1.4 1.4 0 0 1 2.4-1.4L8 14"/></svg>',
    moon: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>',
  };

  let pref = { speed: 2, anim: true, names: true, seen: false };
  try { Object.assign(pref, JSON.parse(localStorage.getItem(PREF) || '{}')); } catch (e) {}
  if (!pref.speedSet) pref.speed = 2;   // the default is now はやい (2026-11-25); only a speed the player chose stays
  pref.names = true; if (!(pref.speed >= 1)) pref.speed = 1;   // 2026-11-27：名札はいつも出す。文字の速さは ゆっくり(1)・ふつう(2)・はやい(3)。以前の「ゆっくり(0)」はゆっくりへ
  const savePref = () => { try { localStorage.setItem(PREF, JSON.stringify(pref)); } catch (e) {} };
  let st = null, S = null;
  const G = { scr: 'title', storyId: null, diff: 1, role: 'auto', q: [], typing: null, loc: null, nbTab: 'ppl' };

  /* ---------- helpers ---------- */
  const story = id => window.WL_STORIES[id];
  const withHero = (id, h) => window.WLHero.apply(story(id), h);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const nm = id => SP.name(S, st, id);
  const ch = id => st.chars.find(c => c.id === id);
  const locName = id => SP.loc(st, id);
  const dayName = d => (NUM[d] || d) + '日目';
  const person = id => E.person(S, id);
  const live = () => E.alive(S).filter(p => !p.isPlayer);
  const fill = (t, o) => SP.fill(t, o);
  const GUIDE_SVG = '<svg class="bust gd" viewBox="0 0 66 76"><g fill="#1b120c"><circle cx="33" cy="42" r="21"/><circle cx="17" cy="33" r="7"/><circle cx="49" cy="31" r="8"/><circle cx="25" cy="22" r="7"/><circle cx="41" cy="21" r="6"/><circle cx="14" cy="49" r="6"/><circle cx="52" cy="50" r="6"/><circle cx="33" cy="12" r="3"/><circle cx="44" cy="8" r="1.8"/><path d="M24 61l-3 9M42 61l3 9" stroke="#1b120c" stroke-width="3.2" stroke-linecap="round"/></g><ellipse cx="25.5" cy="40" rx="6.4" ry="7.4" fill="#fff6dc"/><ellipse cx="40.5" cy="40" rx="6.4" ry="7.4" fill="#fff6dc"/><circle cx="27" cy="41.5" r="3.3" fill="#1b120c"/><circle cx="42" cy="41.5" r="3.3" fill="#1b120c"/><circle cx="28.2" cy="40" r="1.1" fill="#fff"/><circle cx="43.2" cy="40" r="1.1" fill="#fff"/><path d="M29 51q4 3 8 0" stroke="#ffcf86" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="20" cy="49" r="2.3" fill="#c2412d" opacity=".55"/><circle cx="46" cy="49" r="2.3" fill="#c2412d" opacity=".55"/></svg>';
  function bust(id) { if (id === 'you') return '<svg class="bust" viewBox="30 0 66 76"><circle cx="60" cy="40" r="16" fill="currentColor" opacity=".18"/><path d="M42 74c2-10 10-14 18-14s16 4 18 14" fill="currentColor" opacity=".18"/></svg>'; const c = ch(id); return c ? ART.bust(c.look, c.color) : ''; }
  function save() { if (!S || G.tut) return; try { localStorage.setItem(KEY, JSON.stringify({ S, story: st.id, ui: { phase: S.phase } })); } catch (e) {} }
  function clearSave() { try { localStorage.removeItem(KEY); } catch (e) {} }
  function loadSave() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  const wait = ms => new Promise(r => setTimeout(r, pref.anim ? ms : Math.min(ms, 80)));

  /* ---------- screens ---------- */
  function scr(name) {
    G.scr = name;
    if (!G.tut) { $('nbTut')?.remove(); document.querySelectorAll('.tut-hl').forEach(e => e.classList.remove('tut-hl')); }   // the tutorial's notes leave with it
    if (name !== 'play') { $('roster')?.classList.add('hide'); document.body.classList.remove('has-roster'); }
    for (const id of ['scrTitle', 'scrSelect', 'scrSetup']) $(id).classList.toggle('hide', id !== 'scr' + name[0].toUpperCase() + name.slice(1));
    document.body.className = document.body.className.replace(/\bscr-\w+/g, '').trim() + ' scr-' + name;
    const play = name === 'play';
    $('dock').classList.toggle('hide', !play);
    $('btnNb').classList.toggle('hide', !play);
    $('hbWhere').textContent = play ? '' : '';
    $('hbAp').innerHTML = '';
    if (!play) { document.body.classList.remove('nb-open', 'night'); setNb(false); $('cast').innerHTML = ''; $('fx').innerHTML = ''; }
    document.body.classList.toggle('anim-off', !pref.anim);
    document.body.classList.toggle('show-names', !!pref.names);
  }
  function palette(s) {
    const r = document.documentElement.style;
    const p = s ? s.pal : { paper: '#efe3c8', lamp: '#ffcf86', ink: '#1b120c', night: '#16233a', moon: '#b9c8e6', acc: '#c2412d' };
    for (const k in p) r.setProperty('--' + k, p[k]);
    document.querySelector('meta[name=theme-color]').content = p.ink;
  }

  /* ---------- title ---------- */
  function buildTitle() {
    palette(null); SND.music(null);
    const all = ORDER.map(story).filter(Boolean).flatMap(s => s.chars.slice(0, 5));
    const n = 10, items = [];
    for (let i = 0; i < n; i++) items.push(i === 3 || i === 8 ? ART.wolf() : ART.puppet(all[(i * 3) % all.length].look, all[(i * 3) % all.length].color, { rod: false }));
    const R = 200;
    $('cyl').innerHTML = items.map((h, i) => `<div style="transform:rotateY(${i * 360 / n}deg) translateZ(${R}px)">${h}</div>`).join('');
    const belt = items.concat(items).map(h => h).join('');
    $('belt').innerHTML = belt;
    $('tCont').classList.toggle('hide', !loadSave());
    scr('title');
  }

  /* ---------- select ---------- */
  function rec() { try { return JSON.parse(localStorage.getItem(REC) || '{}'); } catch (e) { return {}; } }
  // the story's roles, in one line: the special ones stand out
  function roleLine(s) {
    if (s.rules === 'mason') return `特殊役職 <b>${esc(s.roles.mason.name)}</b>（狩人の代わりに2人）`;
    if (s.rules === 'cat') return `特殊役職 <b>${esc(s.roles.cat.name)}</b>（村側・道連れ）`;
    if (s.rules === 'fanatic') return `特殊役職 <b>${esc(s.roles.madman.name)}</b>（狼を知る裏切り者）`;
    if (s.rules === 'immoral') return `特殊役職 <b>${esc(s.roles.fox.name)}</b>と<b>${esc(s.roles.immoral.name)}</b>（第三の陣営）`;
    if (s.rules === 'fox') return `特殊役職 <b>${esc(s.roles.fox.name)}</b>（第三の陣営）`;
    return '標準の役職（占い師・霊媒師・狩人・狂人）';
  }
  function buildSelect() {
    palette(null); SND.music('story', .55);
    const R = rec();
    $('stories').innerHTML = ORDER.map(story).filter(Boolean).map(s => {
      const r = R[s.id];
      const fl = window.WLFeats.list(s.id), got = fl.filter(f => ((r || {}).feats || {})[f.id]).length;
      const best = `<div class="rec">${r ? `最高評価 ${r.best}・解決 ${r.win}/${r.plays}・` : ''}実績 ${got}/${fl.length}</div>`;
      return `<button class="sc" data-id="${s.id}" style="--p:${s.pal.paper};--l:${s.pal.lamp};--i:${s.pal.ink};--acc2:${s.pal.acc}">
        <div class="ph">${ART.scene(s.scene, s.locs[0].id, 3)}<span class="no">${esc(s.no)}</span></div>
        <div class="tx"><h3>${esc(s.title)}<small>${esc(s.kana)}</small></h3><div class="tg">${esc(s.tag)}</div><p>${esc(s.concept)}</p><div class="mood">${roleLine(s)}</div>${best}</div></button>`;
    }).join('');
    $('stories').querySelectorAll('.sc').forEach(b => b.onclick = () => { G.storyId = b.dataset.id; SND.page(); buildSetup(); });
    scr('select');
  }

  /* ---------- setup ---------- */
  function buildSetup() {
    const base = story(G.storyId);
    G.heroPick = 'auto';   // who you are is always the story's choice
    st = withHero(G.storyId, null); palette(st);
    $('setTitle').innerHTML = `<span style="font:400 1.3em var(--brush);letter-spacing:.06em">${esc(st.title)}</span>　<small style="font:700 15px var(--ui);color:var(--mute)">${esc(st.no)}</small>`;
    $('setConcept').textContent = st.concept;
    const fr = (rec()[base.id] || {}).feats || {}, fl = window.WLFeats.list(base.id);
    $('setFeatH').onclick = () => $('setFeatH').closest('.setup').classList.toggle('feats-open');   // (only folds on a phone)
    $('setFeatN').textContent = `${fl.filter(f => fr[f.id]).length}/${fl.length}`;
    $('setFeats').innerHTML = fl.map(f => `<div class="feat${fr[f.id] ? ' got' : ''}"><i>${fr[f.id] ? '★' : '☆'}</i><b>${esc(f.name)}</b><span>${esc(f.desc)}</span></div>`).join('');
    $('setDiff').innerHTML = DIFFN.map((d, i) => `<button class="tile${G.diff === i ? ' on' : ''}" data-d="${i}"><b>${d}</b><span class="cnt">${E.DIFF[i].size}人</span><span>${diffDesc(st, i)}</span></button>`).join('');
    const RR = E.setupOf(st, E.DIFF[G.diff].size);
    const roles = [['auto', 'おまかせ', '物語が決める'], ['villager', st.roles.villager.name, '調べる回数が多い'], ['seer', '占い師', '毎晩ひとりを占う'], ['medium', '霊媒師', '追放者の正体を知る']]
      .concat(st.rules === 'mason' ? [['mason', st.roles.mason.name, '相方と互いに人間だと知る']] : [['guard', '狩人', '毎晩ひとりを守る']])
      .concat(st.rules === 'cat' ? [['cat', st.roles.cat.name, '吊られても噛まれても道連れ']] : []);
    const can = r => r === 'auto' || r === 'villager' || RR[r] > 0;
    $('setRules').innerHTML = st.rulesNote ? `<b>この物語のしくみ</b>${esc(st.rulesNote)}${E.DIFF[G.diff].hide ? '（上級・悪夢でも、この物語の役は必ずいる。ほかの役は、いるとは限らない）' : ''}` : '';
    $('setRules').classList.toggle('hide', !st.rulesNote);
    if (!can(G.role)) G.role = 'auto';
    $('setRole').innerHTML = roles.map(([r, n, d]) => `<button class="tile${G.role === r ? ' on' : ''}" data-r="${r}" ${can(r) ? '' : 'disabled style="opacity:.35"'}>${ROLE_ICON[r]}<b>${n}</b><span>${can(r) ? d : 'この人数にはいない'}</span></button>`).join('');
    $('setDiff').querySelectorAll('.tile').forEach(b => b.onclick = () => { G.diff = +b.dataset.d; buildSetup(); });
    $('setRole').querySelectorAll('.tile').forEach(b => b.onclick = () => { if (b.disabled) return; G.role = b.dataset.r; buildSetup(); });
    scr('setup');
  }

  /* ---------- the stage ---------- */
  let sceneKey = null;
  function setScene(loc, night, crowd) {
    document.body.classList.toggle('crowd', !!crowd);
    const k = st.scene + ':' + loc;
    document.body.classList.toggle('night', !!night);
    if (k === sceneKey) return;
    sceneKey = k;
    const el = $('scene');
    el.classList.add('swap'); $('floor').classList.add('swap');
    setTimeout(() => { el.innerHTML = ART.scene(st.scene, loc, 1); el.classList.remove('swap'); G.floorLoc = loc; drawFloor(); $('floor').classList.remove('swap'); }, pref.anim ? 260 : 0);
  }
  /* the stage floor, cut from paper and drawn for the real size (nothing stretches): what the way is made of, what lies beside it, what stands along it — one for each place, so it changes with the backdrop */
  const FLOOR = {
    tower: ['dirt', 'snow', 'post'], inn: ['dirt', 'snow', 'post'], forge: ['dirt', 'snow', 'rock'], mill: ['plank', 'water', 'post'], grave: ['dirt', 'snow', 'cross'],
    engine: ['rail', 'grass', 'rock'], baggage: ['board', 0, 'crate'], third: ['aisle', 0, 0], dining: ['aisle', 0, 0], sleeper: ['aisle', 0, 0],
    light: ['dirt', 'rock', 'rock'], harbor: ['plank', 'water', 'post'], net: ['dirt', 'sand', 'post'], clinic: ['dirt', 'grass', 'tuft'], shrine: ['flag', 'grass', 'lantern'],
    bath: ['flag', 'grass', 'rock'], ryokan: ['flag', 'grass', 'lantern'], toji: ['dirt', 'grass', 'tuft'], mound: ['dirt', 'grass', 'rock'], spring: ['step', 'water', 'rock'],
    chapel: ['flag', 'snow', 'cross'], scriptorium: ['board', 0, 0], cloister: ['flag', 'rock', 'col'], cellar: ['flag', 0, 'barrel'], hospice: ['dirt', 'snow', 'post'],
    stage: ['board', 0, 0], trap: ['board', 0, 'crate'], green: ['aisle', 0, 0], quay: ['flag', 'water', 'post'], box: ['aisle', 0, 0],
  };
  function drawFloor() {
    const f = $('floor'); if (!f) return;
    if (!f.__l) { f.__l = 1; f.addEventListener('transitionend', e => { if (e.propertyName === 'top') drawFloor(); }); }
    const w = Math.round(f.clientWidth), h = Math.round(f.clientHeight), key = w + 'x' + h + ':' + G.floorLoc;
    if (!w || !h || f.__wh === key) return; f.__wh = key;
    const [way, side, prop] = FLOOR[G.floorLoc] || ['dirt', 'grass', 'tuft'];
    let sd = 7 + (G.floorLoc || '').length * 131; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const n0 = v => v.toFixed(0), cx = w / 2, hw = y => w * .11 + w * .62 * Math.pow(y / h, 1.15), X = (u, y) => cx + u * hw(y);
    const rowY = (j, n) => h * Math.pow(j / n, 1.6);
    const quad = (u0, u1, y0, y1, g) => `M${n0(X(u0, y0) + g)},${n0(y0 + g * .4)} L${n0(X(u1, y0) - g)},${n0(y0 + g * .4)} L${n0(X(u1, y1) - g)},${n0(y1 - g * .4)} L${n0(X(u0, y1) + g)},${n0(y1 - g * .4)} Z`;
    const L = [], R = [];
    for (let i = 0; i <= 14; i++) { const y = h * i / 14, j = (r() - .5) * w * .012 * (1 + i / 6); L.push([X(-1, y) + j, y]); R.push([X(1, y) - j, y]); }
    const road = L.concat(R.slice().reverse()).map(p => n0(p[0]) + ',' + n0(p[1])).join(' ');
    // the ground beside the way, its edge cut ragged (grass), lumpy (rock), round (snow) or smooth (sand)
    const bank = (sg, kind) => { const P = sg < 0 ? L : R; let d = `M${sg < 0 ? -2 : w + 2},-2`;
      for (let i = 0; i < P.length - 1; i++) { const [x0, y0] = P[i], [x1, y1] = P[i + 1]; const m = kind === 'grass' ? 6 : kind === 'sand' ? 1 : 3;
        for (let k = 0; k < m; k++) { const t = k / m, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, s = 3 + 16 * (y / h);
          if (kind === 'grass') d += ` L${n0(x - sg * s * .2)},${n0(y)} L${n0(x + sg * s * (.6 + r() * .9))},${n0(y + s * .35)}`;
          else if (kind === 'snow') d += ` Q${n0(x - sg * s * (.8 + r() * .6))},${n0(y + s * .5)} ${n0(x + sg * s * .3)},${n0(y + s * 1.1)}`;
          else if (kind === 'rock') d += ` L${n0(x - sg * s * (.3 + r() * .8))},${n0(y + s * .3)} L${n0(x + sg * s * .2)},${n0(y + s * .9)}`;
          else d += ` L${n0(x + sg * s * .2)},${n0(y)}`; } }
      return d + ` L${n0(P[P.length - 1][0])},${h + 2} L${sg < 0 ? -2 : w + 2},${h + 2} Z`; };
    let under = '', pave = '', dark = '', banks = '', bankCls = side === 'snow' ? 'snow' : side === 'sand' ? 'sand' : 'side', wave = '';
    if (side === 'water') { under = `<rect class="water" x="0" y="0" width="${w}" height="${h}"/>`; for (let j = 1; j < 12; j++) { const y = rowY(j, 12), s = 6 + 22 * y / h; for (let x = (j % 2) * s * 2 - s * 2; x < w; x += s * 5.5) wave += `M${n0(x)},${n0(y)} q${n0(s * .7)},${n0(-s * .35)} ${n0(s * 1.4)},0 q${n0(s * .7)},${n0(s * .35)} ${n0(s * 1.4)},0 `; } }
    else if (side) banks = bank(-1, side) + bank(1, side);
    // what the way is made of
    if (way === 'dirt' || way === 'flag' || way === 'rail') under += `<polygon class="road" points="${road}"/>`;
    if (way === 'flag') for (let j = 0; j < 10; j++) { const y0 = rowY(j, 10), y1 = rowY(j + 1, 10), g = 1 + 4 * y1 / h, k = 2 + (j % 2); let u = -1; for (let i = 0; i < k; i++) { const u1 = i === k - 1 ? 1 : -1 + 2 * (i + .7 + r() * .6) / k; pave += quad(u, u1, y0, y1, g); u = u1; } }
    if (way === 'plank') { for (let j = 0; j < 18; j++) { const y0 = rowY(j, 18), y1 = rowY(j + 1, 18); pave += quad(-1, 1, y0, y1, .6 + 2.4 * y1 / h); } for (const u of [-1.04, 1.04]) dark += quad(u - .04, u + .04, 0, h, 0); }
    if (way === 'rail') { for (let j = 0; j < 16; j++) { const y0 = rowY(j, 16), y1 = rowY(j + 1, 16); pave += quad(-.8, .8, y0, y0 + (y1 - y0) * .45, 0); } for (const u of [-.46, .46]) dark += quad(u - .035, u + .035, 0, h, 0); }
    if (way === 'step') for (let j = 1; j < 8; j++) { const y = rowY(j, 7.6), s = hw(y), ux = (j % 2 ? -.18 : .18) + (r() - .5) * .12; const rx = s * (.32 + r() * .08), ry = rx * (.22 + .1 * y / h); pave += `M${n0(X(ux, y) - rx)},${n0(y)} a${n0(rx)},${n0(ry)} 0 1,0 ${n0(rx * 2)},0 a${n0(rx)},${n0(ry)} 0 1,0 ${n0(-rx * 2)},0 Z`; }
    if (way === 'board' || way === 'aisle') {   // floorboards: thin seams toward the far end, and the ends of the boards staggered
      under += `<rect class="sand" x="0" y="0" width="${w}" height="${h}"/>`;
      for (let u = -4; u <= 4; u += .5) { pave += quad(u - .012, u + .012, 0, h, 0); for (let j = 1; j < 9; j++) if ((j + Math.round(u * 2)) % 3 === 0) { const y0 = rowY(j, 9); pave += quad(u, u + .5, y0, y0 + 1 + 2 * y0 / h, 0); } }
      if (way === 'aisle') { dark += quad(-.5, .5, 0, h, 0); under += `<path class="rug" d="${quad(-.5, .5, 0, h, 0)}"/>`; pave += quad(-.43, -.4, 0, h, 0) + quad(.4, .43, 0, h, 0); dark = ''; } }
    // what stands along the way: tufts, stones, posts, crosses, lanterns, columns, barrels, crates
    const tuft = (x, y, s) => { let d = `M${n0(x - s)},${n0(y)}`; const n = 5 + Math.floor(r() * 3); for (let k = 0; k <= n; k++) { const bx = x - s + 2 * s * k / n; d += ` L${n0(bx + (r() - .5) * s * .5)},${n0(y - s * (.9 + r() * 1.3))} L${n0(bx + s / n)},${n0(y - s * .15)}`; } return d + ` L${n0(x + s)},${n0(y)} Z`; };
    const stone = (x, y, s) => `M${n0(x - s)},${n0(y)} Q${n0(x - s * .9)},${n0(y - s * .8)} ${n0(x - s * .1)},${n0(y - s * .75)} Q${n0(x + s * .9)},${n0(y - s * .6)} ${n0(x + s)},${n0(y)} Z`;
    const rect = (x, y, ww, hh) => `M${n0(x)},${n0(y)} h${n0(ww)} v${n0(hh)} h${n0(-ww)} Z`;
    const thing = (k, x, y, s) => {
      if (k === 'post') return rect(x - s * .12, y - s * 2.4, s * .24, s * 2.4) + rect(x - s * .2, y - s * 2.5, s * .4, s * .16);
      if (k === 'cross') return rect(x - s * .1, y - s * 2.2, s * .2, s * 2.2) + rect(x - s * .6, y - s * 1.7, s * 1.2, s * .2) + stone(x, y, s * .7);
      if (k === 'lantern') return rect(x - s * .5, y - s * .3, s, s * .3) + rect(x - s * .16, y - s * 1.6, s * .32, s * 1.3) + rect(x - s * .45, y - s * 2.3, s * .9, s * .7) + `M${n0(x - s * .8)},${n0(y - s * 2.3)} L${n0(x)},${n0(y - s * 2.9)} L${n0(x + s * .8)},${n0(y - s * 2.3)} Z`;
      if (k === 'col') return rect(x - s * .7, y - s * .4, s * 1.4, s * .4) + rect(x - s * .45, y - s * 4.2, s * .9, s * 3.8);
      if (k === 'barrel') return `M${n0(x - s * .7)},${n0(y)} Q${n0(x - s)},${n0(y - s * .8)} ${n0(x - s * .7)},${n0(y - s * 1.6)} H${n0(x + s * .7)} Q${n0(x + s)},${n0(y - s * .8)} ${n0(x + s * .7)},${n0(y)} Z`;
      if (k === 'crate') return rect(x - s * .8, y - s * 1.4, s * 1.6, s * 1.4);
      if (k === 'rock') return stone(x, y, s * (.6 + r() * .5));
      return tuft(x, y, s);
    };
    let near = '', far = '';
    if (prop) { const tall = ['post', 'cross', 'lantern', 'col', 'barrel', 'crate'].includes(prop), N = tall ? 7 : 16;
      for (const sg of [-1, 1]) for (let i = 0; i < N; i++) {
        const t = (i + (tall ? .5 : .2 + r() * .6)) / N, y = h * Math.pow(t, 1.25), x = X(sg * (tall ? 1.12 : 1 + r() * .03), y), s = 5 + 30 * Math.pow(y / h, 1.1);
        if (x < -s * 2 || x > w + s * 2) continue;
        let d = thing(prop, x, y, s);
        if (tall && side && side !== 'water' && r() < .6) d += thing(side === 'snow' || side === 'rock' ? 'rock' : 'tuft', X(sg * 1.3, y), y, s * .8);   // something small beside each post
        if (y < h * .4) far += d; else near += d;
      } }
    f.innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" class="w-${way} s-${side || 'none'}" aria-hidden="true">${under}<path class="wave" d="${wave}"/><path class="pave" d="${pave}"/><path class="dark" d="${dark}"/><path class="${bankCls}" d="${banks}"/><path class="far" d="${far}"/><path class="tuft" d="${near}"/></svg>`;
  }
  function layoutDock() {
    const pc = PCQ.matches;
    const strip = $('strip');
    let h = 0;
    if (pc) {
      h = Math.max(250, strip.offsetHeight + 24, Math.round(innerHeight * .42));   // the road below the backdrop: the same height for text and choices
      // while the text runs, the dock never shrinks (and starts tall enough for most lines): the backdrop keeps its size line to line
      if (!$('tx').classList.contains('hide')) { h = Math.max(h, Math.round(innerHeight * .42), G.dockText || 0); G.dockText = h; }
      else G.dockText = 0;
    }
    document.documentElement.style.setProperty('--dockH', (pc ? h : 0) + 'px');
    // how far down the road the front row stands: fixed for the window, so nobody moves when the text strip changes
    // the backdrop rises a little on a tall screen; the back row stands on the road just below it (not up in the air)
    const dep = pc ? Math.max(0, Math.round(innerHeight * .42) - 250) : 0, raise = Math.round(dep * .45);
    document.documentElement.style.setProperty('--raise', raise + 'px');
    if (pc) document.documentElement.style.setProperty('--backB', Math.round(26 + raise - .2 * (h + 16 + raise)) + 'px');   // the back row stands on the far end of the road else document.documentElement.style.removeProperty('--backB');
    document.documentElement.style.setProperty('--fs', pc ? '1.1' : '1');
    document.documentElement.style.setProperty('--depth', (pc ? Math.max(0, Math.round(innerHeight * .42) - 250) : 0) + 'px');
    if (!pc) fitStage();
    sizeCast();
    requestAnimationFrame(drawFloor);
  }
  // a phone: the dock at the bottom is only as tall as what it holds; the stage takes all the rest
  // while lines run, the dock never shrinks (the box holds its size from line to line)
  function fitStage() {
    if (PCQ.matches) return;
    const d = $('dock');
    let h = d.classList.contains('hide') ? 0 : d.offsetHeight;
    if (h && !$('tx').classList.contains('hide')) { h = Math.max(h, G.dockTextM || 0); G.dockTextM = h; d.style.minHeight = h + 'px'; } else { G.dockTextM = 0; d.style.minHeight = ''; }   // the held height is the box's own, so no gap opens above it
    const sh = Math.max(Math.round(innerHeight * .46), innerHeight - h);
    if (G.stageHM !== sh) { G.stageHM = sh; document.documentElement.style.setProperty('--stageH', sh + 'px'); requestAnimationFrame(drawFloor); }
  }
  if (window.ResizeObserver) new ResizeObserver(() => { if (G.scr === 'play') fitStage(); }).observe($('dock'));
  function sizeCast() {
    // the puppets' size does not follow the text strip: on PC it is reckoned from a fixed strip height, so it only changes with the window
    const c = $('cast');
    const h = PCQ.matches ? Math.max(120, $('stage').clientHeight - Math.max(250, Math.round(innerHeight * .42)) - 56 - 120) : c.clientHeight;   // one size with or without the name boards above, so nobody grows or shrinks between scenes
    const pw = PCQ.matches ? Math.max(54, Math.min(150, h * .66 * 120 / 250)) : Math.max(64, Math.min(100, (innerHeight - 270 - 60) * .26, innerWidth * .26));   // a phone: as tall as the stage allows, narrow enough for a row of four or five
    c.style.setProperty('--pw', pw + 'px');
  }
  // the people on the stage: ids, and how to stand them
  function setCast(ids, o) {
    o = o || {};
    const c = $('cast');
    const have = {}; c.querySelectorAll('.pp').forEach(e => have[e.dataset.id] = e);
    const n = ids.length;
    const front = o.rows === false || n <= 3 ? n : Math.ceil(n / 2);   // about half and half: the front row has one more when the count is odd
    ids.forEach((id, i) => {
      let el = have[id];
      if (!el) {
        const cc = ch(id); if (!cc) return;
        el = document.createElement('div'); el.className = 'pp idle'; el.dataset.id = id;
        el.style.setProperty('--d', (-(i * 1.37 % 4.6)).toFixed(2) + 's');   // a negative delay: already mid-sway when it appears, no still pause then a jerk
        el.innerHTML = ART.puppet(cc.look, cc.color) + `<span class="nm">${esc(cc.name)}</span>`;
        el.style.left = (o.from === 'left' ? -10 : o.from === 'right' ? 110 : 50) + '%';
        if (!o.from) el.style.opacity = '0';
        c.appendChild(el);
        el.onclick = () => { if (G.onPup && !G.talking && $('sheet').classList.contains('hide') && $('tx').classList.contains('hide')) G.onPup(id); };
      }
      delete have[id];
      el.classList.remove('lift', 'drop', 'fallen', 'speak', 'dim', 'sel', 'turn');
      const row = i < front ? 0 : 1, k = row ? i - front : i, m = row ? n - front : front;
      const x = m === 1 ? (o.x || 50) : (o.span ? o.span[0] : 10) + ((o.span ? o.span[1] - o.span[0] : 80) * (k + (row ? .5 : 0)) / Math.max(1, m - (row ? 0 : 1)));
      el.classList.toggle('back', !!row); el.classList.toggle('front', !row); el.classList.toggle('mid', !!o.mid);   // the day's search: the people stand halfway up the road, above the menu, names showing
      requestAnimationFrame(() => { el.style.left = Math.min(94, Math.max(6, x)) + '%'; el.style.bottom = ''; el.style.opacity = ''; });
      if (o.fallen === id) el.classList.add('fallen');
    });
    for (const id in have) { const e = have[id]; e.style.opacity = '0'; setTimeout(() => e.remove(), 600); }
    if (S) renderRoster();
  }
  const pup = id => $('cast').querySelector(`.pp[data-id="${id}"]`);
  function speakPup(id) { $('cast').querySelectorAll('.pp.speak').forEach(e => e.classList.remove('speak')); const e = id && pup(id); if (e) e.classList.add('speak'); }

  /* ---------- the text strip: narration and speech, one page at a time ---------- */
  function showTx() { $('tx').classList.remove('hide'); $('menu').classList.add('hide'); layoutDock(); }
  function showMenu(html) { $('tx').classList.add('hide'); const m = $('menu'); m.innerHTML = html; m.classList.remove('hide'); layoutDock(); m.querySelector('button')?.focus({ preventScroll: true }); }
  function say(items) { return new Promise(res => { G.q = items.filter(Boolean); G.qres = res; showTx(); nextPage(); }); }
  function nextPage() {
    if (G.typing) { finishType(); return; }
    const it = G.q.shift();
    if (!it) { speakPup(null); $('tx').classList.remove('done'); const r = G.qres; G.qres = null; r && r(); return; }
    if (it.fx) it.fx();
    const tx = $('tx'), who = tx.querySelector('.who'), nmEl = tx.querySelector('.name');
    const id = it.who;
    tx.classList.toggle('guide', !!it.guide);
    if (it.guide) { who.classList.remove('none'); who.innerHTML = GUIDE_SVG + `<b>${esc(it.guide === true ? 'すすけ' : it.guide)}</b>`; nmEl.innerHTML = it.task ? `<span class="task">${esc(it.task)}</span>` : ''; speakPup(null); tx.classList.remove('narr'); G.talkVo = { f: 520, wave: 'sine', mouth: 1.3, range: 3, glide: 2, vol: .55, len: .045 }; type(it.text); renderRoster(); SND.page(); return; }
    if (id && id !== 'you') { who.classList.remove('none'); who.innerHTML = bust(id) + `<b>${esc(nm(id))}</b>`; nmEl.textContent = ''; speakPup(id); }
    else if (id === 'you') { who.classList.add('none'); nmEl.textContent = st.hero.name; speakPup(null); }
    else { who.classList.add('none'); nmEl.textContent = it.title || ''; speakPup(null); }
    tx.classList.toggle('narr', !id);
    G.talkVo = voiceOf(id);
    type(it.text);
    renderRoster();
    SND.page();
  }
  // the talk sound: each voice has its own pitch and mouth; each person shifts it a little
  const VO = { elder: { f: 128, mouth: .85, len: .09, range: 1.5 }, polite: { f: 245, mouth: 1.05 }, rough: { f: 118, wave: 'square', mouth: .8, vol: .75 }, cheer: { f: 310, wave: 'square', mouth: 1.2, range: 3, glide: 1, vol: .8 },
    cool: { f: 172, range: 1 }, timid: { f: 262, wave: 'sine', mouth: 1.1, vol: .75, len: .05 }, noble: { f: 150, mouth: .95, range: 1 }, sister: { f: 225, wave: 'square', mouth: 1.1, vol: .75 },
    child: { f: 390, wave: 'square', mouth: 1.3, range: 3, glide: 2, vol: .75, len: .055 }, pious: { f: 235, wave: 'sine', range: 1 }, merchant: { f: 192, wave: 'sawtooth', vol: .6 }, blunt: { f: 108, mouth: .8, range: .5, len: .1 } };
  function voiceOf(id) {
    if (!id) return null;
    if (id === 'you') return { f: 200, mouth: 1 };
    const c = ch(id); if (!c) return null;
    const v = Object.assign({}, VO[c.voice] || { f: 200 });
    let hsh = 0; for (const x of c.id) hsh = (hsh * 31 + x.charCodeAt(0)) | 0;
    v.f *= 1 + ((Math.abs(hsh) % 9) - 4) * .025;
    return v;
  }
  function type(text) {
    const t = $('tx').querySelector('.t');
    const html = esc(text).replace(/\*\*(.+?)\*\*/g, '<span class="k">$1</span>');
    const chars = []; let inTag = false, buf = '';
    for (const c of html) { if (c === '<') inTag = true; if (inTag) { buf += c; if (c === '>') { inTag = false; chars.push(buf); buf = ''; } continue; } if (c === '&') { buf = c; continue; } if (buf) { buf += c; if (c === ';') { chars.push(buf); buf = ''; } continue; } chars.push(c); }
    const sp = [40, 24, 11, 0][pref.speed];
    $('tx').classList.remove('done');
    if (!sp) { t.innerHTML = html; $('tx').classList.add('done'); return; }
    t.innerHTML = chars.map(c => c[0] === '<' ? c : `<i>${c}</i>`).join('');
    const is = t.querySelectorAll('i'); let k = 0;
    const vo = G.talkVo, quiet = /[\s、。！？…—「」『』（）・\-]/;
    G.typing = setInterval(() => { if (G.paused) return; let say = false; for (let s = 0; s < 2 && k < is.length; s++) { const ch0 = is[k].textContent; if (!quiet.test(ch0)) say = true; is[k++].style.opacity = 1; } if (say) SND.talk(vo); if (k >= is.length) finishType(); }, sp * 2);
  }
  function finishType() { clearInterval(G.typing); G.typing = null; const t = $('tx').querySelector('.t'); t.querySelectorAll('i').forEach(i => i.style.opacity = 1); $('tx').classList.add('done'); }
  $('tx').addEventListener('click', nextPage);
  // the whole stage and the strip around the text turn the page too (a phone's thumb should not have to find the box)
  document.addEventListener('click', e => {
    if ($('tx').classList.contains('hide') || !$('sheet').classList.contains('hide') || G.scr !== 'play') return;
    const t = e.target; if (!t.closest || t.closest('#tx') || !t.closest('#stage,#dock')) return;
    if (t.closest('#roster button,#roster .ro')) return;
    e.stopPropagation(); e.preventDefault(); nextPage();
  }, true);
  // when the browser loses focus, the play stops (sound, lamp flicker, puppets, letters) until it comes back
  function setPaused(p) { G.paused = !!p; document.body.classList.toggle('paused', G.paused); SND.pause(G.paused); }
  window.addEventListener('blur', () => setPaused(true));
  window.addEventListener('focus', () => setPaused(false));
  document.addEventListener('visibilitychange', () => setPaused(document.hidden));   // phones often give no focus event on coming back: being visible again is enough
  window.addEventListener('pageshow', () => setPaused(document.hidden));
  // any touch brings the play (and the sound) back, in case the browser kept it stopped
  document.addEventListener('pointerdown', () => { if (G.paused && !document.hidden) setPaused(false); SND.unlock(); }, true);
  document.addEventListener('keydown', e => {
    // F: full screen on / off (not while typing, not with a modifier)
    if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || '')) {
      e.preventDefault();
      const d = document, el = d.documentElement;
      try { if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d); else (el.requestFullscreen || el.webkitRequestFullscreen).call(el); } catch (err) {}
      return;
    }
    if (!$('sheet').classList.contains('hide')) { if (e.key === 'Escape') closeSheet(); return; }
    if (G.scr === 'play' && !$('tx').classList.contains('hide') && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight')) { e.preventDefault(); nextPage(); }
  });

  /* ---------- sheets ---------- */
  let sheetRes = null;
  function sheet(html, onopen) { $('sheetBox').innerHTML = html; $('sheet').classList.remove('hide'); onopen && onopen($('sheetBox')); $('sheetBox').querySelector('button')?.focus({ preventScroll: true }); $('sheetBox').scrollTop = 0; return new Promise(r => sheetRes = r); }   // always open at the top (the title)
  function closeSheet(v) { $('sheet').classList.add('hide'); const r = sheetRes; sheetRes = null; r && r(v); }
  $('sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(null); });
  // choose a person from a grid
  function pickPerson(title, sub, ids, o) {
    o = o || {};
    const off = o.off || {};
    const btns = ids.map(id => off[id] ? `<button class="pb off" disabled>${bust(id)}<span>${esc(nm(id))}</span><small>${esc(off[id])}</small></button>` : `<button class="pb" data-id="${id}">${bust(id)}<span>${esc(nm(id))}</span>${o.cap && o.cap[id] ? `<small class="cap">${esc(o.cap[id])}</small>` : ''}${o.mark ? `<i class="mk ${S.pl.notes[id] || ''}"></i>` : ''}</button>`).join('');
    return sheet(`<button class="ib x" data-x aria-label="閉じる"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button><h3>${title}</h3>${sub ? `<p>${sub}</p>` : ''}<div class="grid-pick">${btns}</div><div class="foot"><button class="btn" data-x>もどる</button></div>`, box => {
      box.querySelectorAll('[data-x]').forEach(b => b.onclick = () => closeSheet(null));
      box.querySelectorAll('.pb:not(.off)').forEach(b => b.onclick = () => closeSheet(b.dataset.id));
    });
  }
  function pickOpt(title, sub, opts) {
    return sheet(`<button class="ib x" data-x aria-label="閉じる"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button><h3>${title}</h3>${sub ? `<p>${sub}</p>` : ''}<div class="opts">${opts.map((o, i) => `<button class="opt" data-i="${i}" ${o.dis ? 'disabled style="opacity:.4"' : ''}>${o.ic || ''}<span>${esc(o.t)}${o.s ? `<small>${esc(o.s)}</small>` : ''}</span></button>`).join('')}</div><div class="foot"><button class="btn" data-x>もどる</button></div>`, box => {
      box.querySelectorAll('[data-x]').forEach(b => b.onclick = () => closeSheet(null));
      box.querySelectorAll('.opt').forEach(b => b.onclick = () => closeSheet(opts[+b.dataset.i].v));
    });
  }

  /* ---------- header ---------- */
  /* the roster: everyone, alive or not, with what has been said about them (like a village board) */
  const CIRC = ['', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫'];
  const SHORT = { seer: '占', medium: '霊', guard: '狩', mason: '共', cat: '猫' };
  function tagsOf(id) {
    const g = G.gate, c = S.claims.find(c => c.by === id && (!g || g.co.has(c.by)));
    let cl = '';
    if (c) { const same = S.claims.filter(x => x.role === c.role); cl = `<span class="cl ${c.role}">${SHORT[c.role] || ''}${same.length > 1 && c.role !== 'mason' ? same.indexOf(c) + 1 : ''}</span>`; }
    const heat = g ? (g.base[id] || 0) + (g.heat[id] || 0) : (S.phase === 'meeting' || S.phase === 'vote') && S.mtg && S.mtg.day === S.day ? (S.heat || {})[id] || 0 : 0;
    const ht = heat ? `<span class="ht" title="今日の集会で${heat}回名指しされた">${heat}</span>` : '';
    return { cl, ht };
  }
  function resultsOn(id) {
    const out = [];
    const g = G.gate;
    S.claims.forEach(c => { if (g && !g.co.has(c.by)) return; const same = S.claims.filter(x => x.role === c.role); const k = (SHORT[c.role] || '') + (same.length > 1 && c.role !== 'mason' ? same.indexOf(c) + 1 : '');
      for (const r of c.res) if (r.target === id && (!g || g.res.has(c.by + '|' + r.target))) out.push(r.res === 'guard' ? `<i class="g" title="${esc(nm(c.by))}が守った">${k} 守</i>` : `<i class="${resCls(r.res)}" title="${esc(nm(c.by))}：${resWord(r.res)}">${k} ${resMark(r.res)}</i>`); });
    for (const r of S.pl.res) if (r.target === id && !(S.claims.find(c => c.by === 'you') || { res: [] }).res.some(x => x.target === id)) out.push(`<i class="${resCls(r.res)}" title="あなたが知った">${r.mason ? '相方' : '自 ' + resMark(r.res)}</i>`);
    return out.join('');
  }
  // what has been said aloud so far: while a scene plays, the board shows a claim, a result or a name only once its line is read
  function openGate(base) { G.gate = { co: new Set(S.claims.map(c => c.by)), res: new Set(S.claims.flatMap(c => c.res.map(r => c.by + '|' + r.target))), heat: {}, base: base || Object.assign({}, S.heat || {}) }; }
  function reveal(e) {
    const g = G.gate; if (!g || !e) return;
    const up = id => { if (id) g.heat[id] = (g.heat[id] || 0) + 1; };
    if (e.t === 'co' || e.t === 'co2') g.co.add(e.by);
    if (e.t === 'result') g.res.add(e.by + '|' + e.target);
    if (e.t === 'accuse' || e.t === 'agree') up(e.target);
    if (e.t === 'guardsus') up('you');
    if (e.t === 'whoseen') up(e.who);
    if (e.t === 'caught') up(e.by);
    renderRoster();
  }
  function closeGate() { G.gate = null; renderRoster(); }
  const lineOf = (e, extra) => { const x = SP.event(S, st, e); return x && x.text ? Object.assign({ who: e.by, text: x.text, fx: () => reveal(e) }, extra || {}) : null; };
  function renderRoster() {
    const R = $('roster'); if (!R) return;
    // on a phone the faces at the top are only needed in the meeting and the vote (the day's search lists the people below)
    const on = S && G.scr === 'play' && S.phase !== 'prologue' && S.phase !== 'end';
    const faces = on && (PCQ.matches || S.phase === 'meeting' || S.phase === 'vote' || !!S.tut);   // the tutorial points at the faces all day   // the map shows all day long; the faces only in the meeting and the vote on a phone
    R.classList.toggle('hide', !on); document.body.classList.toggle('has-roster', !!on);
    if ($('rmap')) $('rmap').classList.toggle('hide', !on);
    if ($('rdock')) $('rdock').classList.toggle('hide', !faces || PCQ.matches);
    R.classList.toggle('hide', !faces);
    if (!on) return;
    const html = S.people.map(p => {
      const t = tagsOf(p.id), dead = !p.alive, mk = S.pl.notes[p.id] || '';
      const dc = dead && p.death ? ({ wolf: '噛', curse: '呪', catw: '爪', cat: '連' }[p.death.cause] || '吊') : '';
      const rs = resultsOn(p.id), rcls = /class="k"/.test(rs) ? ' res-k' : /class="h"/.test(rs) ? ' res-h' : '';
      return `<div class="ro${p.isPlayer ? ' you' : ''}${dead ? ' dead' : ''}${mk ? ' mk-' + mk : ''}${rcls}" data-id="${p.id}">${bust(p.id)}<b class="${(p.isPlayer ? 'あなた' : p.name).length > 5 ? 'long' : ''}">${esc(p.isPlayer ? 'あなた' : p.name)}</b>${t.cl}${t.ht}<div class="rs">${rs}</div>${dead ? `<svg class="x" viewBox="0 0 44 44"><path d="M8 8L36 36M36 8L8 36"/></svg><span class="dc">${dc}</span>` : ''}</div>`;
    }).join('');
    if (R.__html !== html) { R.innerHTML = html; R.__html = html; R.__bound = false; }   // re-drawn only when something changed
    if (PCQ.matches) { const W0 = $('stage').clientWidth - 40, n = S.people.length; const w = Math.max(54, Math.min(84, Math.floor(W0 / n) - 5)); R.style.setProperty('--roW', w + 'px'); R.classList.toggle('tight', w < 70); } else R.style.removeProperty('--roW');
    renderMap(R);
    if (!R.__bound) R.__bound = true, R.querySelectorAll('.ro').forEach(e => e.onclick = () => { const id = e.dataset.id; const p = person(id); if (!p || !p.alive || p.isPlayer) return; if (G.onPup && !G.talking && $('sheet').classList.contains('hide') && $('tx').classList.contains('hide')) G.onPup(id); });
    // the same marks above the puppets' heads
    $('cast').querySelectorAll('.pp').forEach(e => { let g = e.querySelector('.tg'); if (!g) { g = document.createElement('div'); g.className = 'tg'; e.appendChild(g); } const t = tagsOf(e.dataset.id), th = t.cl + t.ht; if (g.__html !== th) { g.innerHTML = th; g.__html = th; } });
  }
  /* the ring of places under the roster: neighbours see each other, and the two ends meet */
  function renderMap(R) {
    let M = $('rmap'); if (!M) { M = document.createElement('div'); M.id = 'rmap'; R.parentNode.insertBefore(M, R.nextSibling); }
    const N = S.nights[S.nights.length - 1], me = S.people.find(p => p.isPlayer);
    const mine = N && N.pos && me && N.pos[me.id], seen = mine ? E.near(st, mine) : [], crime = N && N.killer ? N.loc : null;
    const chip = l => `<span class="rc${l.id === mine ? ' me' : seen.includes(l.id) ? ' see' : ''}" title="${esc(l.name)}：となりの${E.near(st, l.id).map(x => esc(locName(x))).join('・')}が見える">${esc(l.name)}${l.id === crime ? '<i class="cr">現場</i>' : ''}${l.id === mine ? '<i class="yo">あなた</i>' : ''}</span>`;
    const mh = `<div class="rrow">${st.locs.map(chip).join('<s></s>')}</div><div class="rback" title="両端もとなり同士"></div>`;
    if (M.__html !== mh) { M.innerHTML = mh; M.__html = mh; }
    // a phone: the faces and the map sit at the bottom of the text strip (it has room under the words), not over the stage
    const home = PCQ.matches ? $('stage') : (() => { let D = $('rdock'); if (!D) { D = document.createElement('div'); D.id = 'rdock'; } if (D.parentNode !== $('strip') || $('strip').firstChild !== D) $('strip').insertBefore(D, $('strip').firstChild); return D; })();
    if (R.parentNode !== home) { if (PCQ.matches) home.insertBefore(R, $('fx')); else home.appendChild(R); }
    if (M.parentNode !== $('stage')) $('stage').insertBefore(M, $('fx'));   // the map stays on the stage, at the top (on a phone too)
    M.style.top = PCQ.matches ? (R.offsetTop + R.offsetHeight + 8) + 'px' : '';   // a phone: CSS puts it just under the header
  }
  function hud() {
    if (S.ghost) document.body.classList.add('ghost');
    const ph = { morning: '朝', invest: '昼', meeting: '集会', vote: '投票', night: '夜', end: '終幕', prologue: '序幕' }[S.phase] || '';
    $('hbWhere').innerHTML = `${PCQ.matches ? esc(st.title) + '　' : ''}${S.phase === 'prologue' ? '' : dayName(S.day)} ${ph}<small>${DIFFN[S.diff]}${S.phase === 'prologue' ? '' : '・' + esc(SP.roleName(st, S.pl.role))}${S.ghost ? '・幽霊' : ''}</small>`;
    if (S.phase === 'invest') $('hbAp').innerHTML = `<span>残り</span>` + Array.from({ length: S.pl.apMax }, (_, i) => `<i class="${i < S.pl.ap ? '' : 'off'}"></i>`).join('');
    else $('hbAp').innerHTML = '';
    renderRoster();
    autoNb();
  }

  /* ---------- the game ---------- */
  async function start() {
    clearSave(); SND.music('story', 1);
    const HS = story(G.storyId).heroes || [];
    const hid = HS.length ? HS[Math.floor(Math.random() * HS.length)].id : null;   // 主人公は毎回ランダム
    st = withHero(G.storyId, hid);
    S = E.newGame(st, { diff: G.diff, role: G.role });
    S.hero = st.heroId;
    S.phase = 'prologue'; S.pl.log = [];
    scr('play'); palette(st); hud();
    if (!pref.seen) { await showRules(true); pref.seen = true; savePref(); }
    await prologue();
  }
  function ctxVars(extra) { return Object.assign({ first: st.first.name, firstNote: st.first.note }, extra || {}); }

  async function prologue() {
    S.phase = 'prologue'; hud(); setCast([]);
    SND.windOn(.05);
    let rung = false;
    for (const pg of st.text.prologue) {
      setScene(pg.bg || st.locs[0].id, pg.night);
      if (pg.night && !rung) { rung = true; SND.bell(.5, 1.5); }   // a second and a half after the dark scene comes up: then the music steps back and the bell rings   // once only: the recording rings twice by itself (night pages in a row must not ring it again)
      if (pg.cast) {
        const ids = S.people.filter(p => !p.isPlayer).map(p => p.id);
        await say([{ text: fill(pg.t, ctxVars()) }]);
        setCast([], {});
        // the cast steps onto the screen one by one
        const shown = [];
        for (const id of ids) {
          shown.push(id); setCast(shown.slice(), { from: shown.length % 2 ? 'left' : 'right' });
          await say([{ who: id, text: ch(id).intro }]);
        }
        continue;
      }
      if (pg.by) { setCast(castIn(pg.by).slice(0, 1), { x: 58 }); await say([pg.t ? { text: fill(pg.t, ctxVars()) } : null].concat(storyLine(pg))); setCast([]); continue; }
      await say([{ text: fill(pg.t, ctxVars()) }]);
    }
    // the role
    await roleCard();
    S.phase = 'morning'; save();
    await morning(true);
  }
  /* ---------- the story around the game: speakers, interludes, night vignettes ---------- */
  const castIn = ids => (ids || []).filter(id => { const p = person(id); return p && p.alive && !p.isPlayer; });
  // a line spoken by the first of its candidates who is here and alive; else the narration
  function storyLine(e) {
    const id = castIn(e.by)[0];
    if (id && e.alt && e.alt[id]) return [{ who: id, text: e.alt[id] }];
    return e.n ? [{ text: e.n }] : [];
  }
  function arcItems(day) {
    const A = st.arc; if (!A || !A.days || !A.days[day]) return [];
    S.arcShown = S.arcShown || {}; if (S.arcShown[day]) return [];
    S.arcShown[day] = 1;
    const out = [];
    for (const e of A.days[day]) { if (e.t) out.push({ text: e.t }); if (e.by || e.n) out.push(...storyLine(e)); }
    return out;
  }
  // a scene between people of the village: everyone in it alive, and (for some) someone gone
  function pickInter() {
    S.interShown = S.interShown || [];
    const dead = new Set(S.people.filter(p => !p.alive).map(p => p.id));
    const ok = (st.inter || []).filter(x => !S.interShown.includes(x.id) && castIn(x.need).length === x.need.length && (!x.dead || x.dead.some(d => dead.has(d))));
    if (!ok.length) return null;
    const grief = ok.filter(x => x.dead);
    const x = grief.length ? grief[0] : ok[Math.floor(Math.random() * ok.length)];
    S.interShown.push(x.id);
    return x;
  }
  async function interlude(when) {
    const x = pickInter(); if (!x) return;
    if (x.bg) setScene(x.bg);
    setCast(x.need, { span: [32, 68] });
    await say([{ title: when || '幕間', text: '' }].slice(0, 0).concat(x.lines.map(([w, t]) => w ? { who: w, text: t } : { text: t })));
    log({ k: 'inter', id: x.id });
  }
  function vignette() {
    S.vignShown = S.vignShown || [];
    const c = castIn(live().map(p => p.id)).map(id => ch(id)).filter(c => c.vign && !S.vignShown.includes(c.id));
    if (!c.length) return null;
    const v = c[Math.floor(Math.random() * c.length)]; S.vignShown.push(v.id);
    return { text: v.vign };
  }

  async function roleCard() {
    const r = S.pl.role, R = st.roles[r];
    await say([{ text: fill(st.text.role, { roleHow: R.how }) }]);
    await sheet(`<div class="rolecard"><div class="em">${ROLE_ICON[r]}</div><p style="font:700 15px var(--ui);letter-spacing:.2em;color:var(--mute);margin:0">あなたの役</p><h3>${esc(R.name)}</h3><p>${esc(R.perk)}</p><p style="font-size:15px;color:var(--mute)">${castLine()}</p>${st.rulesNote ? `<p style="font-size:14px;color:var(--mute)">${esc(st.rulesNote)}</p>` : ''}</div><div class="foot" style="justify-content:center"><button class="btn pri" data-ok>はじまる</button></div>`, box => box.querySelector('[data-ok]').onclick = () => closeSheet(true));
  }

  /* morning: what the night left behind */
  async function morning(first) {
    S.phase = 'morning'; hud(); SND.music('story', 1); document.body.classList.remove('night');
    const N = S.nights[S.nights.length - 1];
    const items = [];
    if (!first) {
      setScene(N.loc || st.meetLoc || st.locs[0].id);   // a night with no attack has no scene of its own
      items.push({ text: st.text.day[Math.min(S.day - 1, st.text.day.length - 1)] });
      if (N.died && N.target === 'you') {
        setCast([]); SND.door(0, 1.1); SND.thud();
        items.push({ text: st.text.dead }, { text: st.text.ghost });
      } else if (N.died) {
        const v = N.target, c = ch(v);
        setCast(v === 'you' ? [] : [v], { fallen: v, x: 58 });
        SND.thud();
        items.push({ text: fill(SP.say ? pickOne(st.text.discover[N.loc] || st.text.discover[st.locs[0].id]) : '', { victim: nm(v), note: c ? c.note : '' }) });
        // the ones who loved them
        let g = 0;
        for (const cc of st.chars) for (const b of cc.bond || []) if (b.with === v && g < 2 && castIn([cc.id]).length) { g++; items.push({ who: cc.id, text: b.grief, fx: () => setCast([v, cc.id], { fallen: v, span: [40, 66] }) }); }
      } else {
        setCast([]);
        // no one was attacked at all (the wolves are gone, only the fox is left): no place to name
        items.push({ text: SP.peace(S, st, N) });
        if (N.saved === 'ward') items.push({ text: '枕もとの鈴が、夜中にひとりでに鳴った。あの音がなければ、あなたは今ここにいない。' });
        if (N.saved === 'guard' && N.target === 'you') items.push({ text: `戸口の前の床に、獣の爪の跡が残っていた。あなたの部屋の前まで来て、そこで引き返している。\n誰かが一晩じゅう、**あなたを守っていた**のだ。` });
        if (N.saved === 'guard' && S.pl.role === 'guard') items.push({ text: `あなたが夜通し見張った戸口の前に、獣の爪の跡があった。${nm(N.target)}は、何も知らずに眠っていた。` });
        if (st.text.foxBite && N.killer && (N.saved === 'fox' || N.saved === 'guard') && N.target !== 'you' && S.pl.role !== 'guard') items.push({ text: st.text.foxBite });
      }
      // the cat bitten: one of the wolves went with it
      if (N.dragged) { const v = N.dragged; items.push({ text: fill(pickOne(st.text.catDrag || ['{name}も、冷たくなっていた。']), { name: nm(v), cat: N.target === 'you' ? 'あなた' : nm(N.target) }), fx: () => setCast([v], { fallen: v, x: 58 }) }); }
      // the fox burned by a reading
      if (N.cursed && N.cursed !== 'you') { const v = N.cursed; items.push({ text: fill(pickOne(st.text.curse || ['朝、{name}が見つかった。傷ひとつなかった。']), { name: nm(v) }), fx: () => setCast([v], { fallen: v, x: 58 }) }); }
      // the immoral followed the fox
      if (N.followed && N.followed !== 'you') { const v = N.followed; items.push({ text: fill(pickOne(st.text.follow || ['朝、{name}が見つかった。眠るような顔だった。']), { name: nm(v) }), fx: () => setCast([v], { fallen: v, x: 58 }) }); }
      if (S.foxHunt && S.foxHunt.day === S.day) items.push({ text: st.text.foxHunt || '狼の気配が消えた。けれど狐の気配は消えない。\n今日のうちに狐を見つけなければ、ここは狐のものになる。' });
      // what the player saw
      for (const s of N.sights.filter(s => s.by === 'you')) {
        if (s.kind === 'fig') items.push({ text: (S.pl.stakeAt ? `${locName(S.pl.stakeAt)}の暗がりで息を殺していると、` : '夜中、窓の外を、') + `**${SP.fig(st, s.cat, s.val)}**が横切っていった。` });
        if (s.kind === 'who') items.push({ text: `夜更けに、**${nm(s.who)}**が${locName(s.loc)}のあたりを歩いているのを見た。` });
        if (s.kind === 'who') S.pl.told.push({ by: 'you', night: N.n, kind: 'who', who: s.who, loc: s.loc, eye: true });
      }
      S.pl.stakeAt = null;
    } else {
      setScene(st.first.loc); setCast([]);
      items.push({ text: st.text.day[0] });
    }
    // role results
    const fresh = S.pl.res.filter(r => !r.shown);
    for (const r of fresh) {
      r.shown = true;
      if (r.seer) items.push({ text: `${st.roles.seer.name}の力が、**${nm(r.target)}**の影を映した。……${r.res === 'wolf' ? '**それは、狼の形をしていた。**' : '人の形のままだった。人間だ。'}` });
      if (r.medium) items.push({ text: `追放された**${nm(r.target)}**の影が、ゆっくりと浮かぶ。……${r.res === 'wolf' ? '**狼だった。**' : r.res === 'fox' ? '**尾が九つに裂けた、狐の影だった。**' : '人間だった。'}` });
      if (r.mason) items.push({ text: `${st.roles.mason.name}の相方は、**${nm(r.target)}**だ。ゆうべ、ひと晩じゅう目の前にいた。あの人は人間だ——向こうも、あなたのことをそう知っている。` });
    }
    items.push(...arcItems(S.day));
    await say(items);
    if (E.check(S)) return end();
    if (S.ghost) return ghostDay();
    // the day begins
    S.pl.ap = S.pl.apMax; S.pl.asks = 3; S.pl.accuse = null; S.pl.shown = S.pl.shown || [];
    S.npcFound = E.npcSearch(S, st);
    S.phase = 'invest'; save();
    G.loc = (S.nights[S.nights.length - 1] || {}).loc || st.locs[0].id;
    await interlude();
    save();
    hub();
  }
  const pickOne = a => a[Math.floor(Math.random() * a.length)];

  /* the investigation hub */
  function peopleAt(loc) {   // who is where today (for the stage only)
    const h = s => { let x = 0; for (const c of s) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x; };
    return live().filter(p => st.locs[h(S.seed + ':' + S.day + p.id) % st.locs.length].id === loc).map(p => p.id);
  }
  function hub(msg) {
    S.phase = 'invest'; hud();
    setScene(G.loc); setCast(peopleAt(G.loc).slice(0, 4), { span: [22, 78], mid: true });
    G.onPup = id => talk(id);
    const N = S.nights[S.nights.length - 1];
    const locs = st.locs.map(l => `<button class="loc${l.id === G.loc ? ' cur' : ''}" data-l="${l.id}" title="${esc(l.name)}から見えるのは：${E.near(st, l.id).map(locName).join('・')}">${ART.scene(st.scene, l.id, 1)}<b>${esc(l.name)}</b><i class="see">見える：${E.near(st, l.id).map(x => esc(locName(x))).join('・')}</i>${N && N.loc === l.id && N.killer ? '<em>現場</em>' : ''}</button>`).join('');
    const ppl = live().map(p => `<button class="pb${S.pl.talked[p.id] === S.day ? ' talked' : ''}" data-p="${p.id}">${bust(p.id)}<span>${esc(p.name)}</span><i class="mk ${S.pl.notes[p.id] || ''}"></i></button>`).join('');
    const items = S.pl.items.filter(i => !S.pl.used[i]);
    const hint = S.pl.ap > 0 ? `調べるか、話を聞く。どちらも行動を1つ使う（同じ人なら今日は何度でも聞ける）。` : '今日の行動は使いきった。集会へ向かおう。';
    showMenu(`<div class="hub"><div><h4>調べる場所</h4><div class="locs">${locs}</div></div><div><h4>話を聞く</h4><div class="ppl">${ppl}</div></div><div class="hubfoot"><div class="hint">${msg ? esc(msg) : hint}</div>${items.length ? `<button class="btn" id="hItems">${IC.bag}持ち物 <small>${items.length}</small></button>` : ''}<button class="btn pri" id="hMeet">${IC.go}集会へ</button></div></div>`);
    $('menu').querySelectorAll('.loc').forEach(b => b.onclick = () => search(b.dataset.l));
    $('menu').querySelectorAll('.pb').forEach(b => b.onclick = () => talk(b.dataset.p));
    if ($('hItems')) $('hItems').onclick = useItems;
    $('hMeet').onclick = async () => { if (S.pl.ap > 0) { const ok = await pickOpt('集会へ向かう？', `まだ${S.pl.ap}回、調べたり話を聞いたりできる。`, [{ t: '集会へ向かう', v: 1, ic: IC.go }]); if (!ok) return; } meeting(); };
    renderNb();
  }
  async function search(loc) {
    if (S.pl.ap <= 0) return hub('今日の行動は使いきった。');
    G.loc = loc; setScene(loc); setCast(peopleAt(loc).slice(0, 4), { span: [22, 78], mid: true });
    const r = E.search(S, st, loc);
    const L = st.locs.find(l => l.id === loc);
    const items = [];
    if (r.k === 'trace') { items.push({ text: `${L.name}を調べる。` }, { text: SP.traceText(st, r.trace) + '\n**（痕跡を手帳に書きとめた）**' }); SND.ok(); }
    else if (r.k === 'item') { const c = ch(r.owner); items.push({ text: `${L.name}の隅に、何かが落ちている。\n**${c.name}の${c.belong}**だ。` }, { text: '物は嘘をつくことがある。落としたのか、置かれたのか。' }); }
    else if (r.k === 'gone') items.push({ text: `${L.name}を調べる。\n${st.lex.erase || '夜のうちに降った雪が、残りの跡を消していた。'}` });
    else if (r.k === 'got') { const it = st.items.find(x => x.id === r.item); items.push({ text: it.found }, { text: `**「${it.name}」を手に入れた。**\n${it.desc}` }); SND.ok(); }
    else if (r.k === 'secret') { const c = ch(r.who); items.push({ text: fill(c.secret.clue, { belong: c.belong, name: c.name }) }, { text: `ゆうべ、**${c.name}**はここにいた。本人は何と言うだろう。` }); }
    else if (r.k === 'foxsign') { const c = ch(r.who); items.push({ text: fill(st.text.foxSign || '誰かが夜通しここに座っていた跡がある。そばに、{belong}が落ちていた。', { belong: c.belong, name: c.name }) }, { text: `${r.night === S.nights.length - 1 ? 'ゆうべ' : 'おとといの晩'}、**${c.name}**はここにいた。本人は何と言うだろう。` }); }
    else items.push({ text: pickOne(L.none) });
    log({ k: 'search', loc, r });
    await say(items);
    save(); hub();
  }
  async function talk(id, inMeeting) {
    const p = person(id); if (!p || !p.alive) return;
    if (inMeeting && S.pl.asks <= 0) { await say([{ text: '今日の聞き取りは使いきった。' }]); return; }
    G.talking = true;
    try { return await talkIn(id, inMeeting); } finally { G.talking = false; }
  }
  async function talkIn(id, inMeeting) {
    const free = inMeeting || S.pl.talked[id] === S.day;
    if (!inMeeting && !free && S.pl.ap <= 0) return hub('今日の行動は使いきった。');
    const opts = [
      { t: '昨夜のことを聞く', s: 'どこにいたか、何を見たか', v: 'night', ic: IC.moon },
      { t: '怪しいと思う人を聞く', s: 'その人の見立て', v: 'suspect', ic: IC.ask },
      { t: 'ほかの人のことを聞く', s: '誰かひとりについて', v: 'about', ic: IC.talk },
    ];
    if (E.canConfront(S, id)) opts.push({ t: '隠していることを問いただす', s: '見られた夜のことを突きつける', v: 'secret', ic: IC.point });
    const q = await pickOpt(`${esc(nm(id))}に話を聞く`, inMeeting ? `聞き取りは残り${S.pl.asks}回。` : free ? '今日はもう話した相手。何度でも聞ける。' : '行動を1つ使う。', opts);
    if (!q) return inMeeting ? null : hub();
    let target = null;
    if (q === 'about') { target = await pickPerson(`${esc(nm(id))}に、誰のことを聞く？`, '', E.alive(S).map(x => x.id).filter(x => x !== id)); if (!target) return inMeeting ? null : hub(); }
    if (inMeeting) S.pl.asks--;   // the interview is used when a question is put, however it was opened
    const r = E.ask(S, st, id, q, target, inMeeting || free);
    if (!inMeeting && !free) { /* the ap was used inside ask */ }
    G.loc = G.loc; setCast(inMeeting ? E.alive(S).filter(x => !x.isPlayer).map(x => x.id) : [id], inMeeting ? {} : { x: 58 });
    const out = [];
    if (r.k === 'night') { SP.night(S, st, r.T).forEach(t => out.push({ who: id, text: t })); log({ k: 'night', who: id, T: r.T }); }
    else if (r.k === 'suspect') { out.push({ who: id, text: SP.opinion(S, st, id, r.o) }); log({ k: 'op', who: id, o: r.o && { target: r.o.target, why: r.o.why, low: r.o.score < .12 } }); }
    else if (r.k === 'about') { SP.about(S, st, id, r).forEach(t => out.push({ who: id, text: t })); if (r.seen && r.seen.length) S.pl.told.push({ by: id, night: r.seen[0].night, kind: 'who', who: target, loc: r.seen[0].loc }); log({ k: 'about', who: id, target }); }
    else if (r.k === 'secret') { const c = ch(id); out.push({ who: id, text: c.secret.confess }); log({ k: 'secret', who: id }); }
    else if (r.k === 'nosecret') out.push({ who: id, text: SP.say(S, st, id, 'deny') });
    await say(out);
    save();
    if (!inMeeting) hub();
  }
  function log(x) { (S.pl.log = S.pl.log || []).push(Object.assign({ day: S.day }, x)); }

  async function useItems() {
    const its = S.pl.items.filter(i => !S.pl.used[i]).map(i => st.items.find(x => x.id === i));
    const v = await pickOpt('持ち物', '', its.map(it => ({ t: it.name, s: it.desc + (it.kind === 'stake' ? '（夜に使う）' : it.kind === 'ward' ? '（持っているだけで効く）' : ''), v: it.id, ic: IC.bag, dis: it.kind === 'stake' || it.kind === 'ward' })));
    if (!v) return hub();
    const it = st.items.find(x => x.id === v);
    if (it.kind === 'secret') {
      const has = live().filter(p => p.secret), off = {};
      has.forEach(p => { if (p.secret.open) off[p.id] = 'もう打ち明けた'; });
      const id = await pickPerson(`${esc(it.name)}で、誰のことを調べる？`, '', has.map(p => p.id), { off });
      if (!id) return hub();
      S.pl.used[v] = 1; const p = person(id); p.secret.open = true;
      await say([{ text: fill(it.use, { name: nm(id) }) }, { who: id, text: ch(id).secret.confess }]);
      log({ k: 'secret', who: id, item: v });
    } else if (it.kind === 'test') {
      const id = await pickPerson(`${esc(it.name)}を、誰に触れさせる？`, '一度きり。結果はあなただけが知る。', live().map(p => p.id));
      if (!id) return hub();
      S.pl.used[v] = 1;
      const w = E.isWolf(S, id), fx = E.isFox(S, id);
      S.pl.res.push({ night: S.nights.length - 1, target: id, res: w ? 'wolf' : fx ? 'fox' : 'human', test: true, shown: true });
      setCast([id], { x: 55 });
      await say([{ text: fill(it.use, { name: nm(id) }) }, { text: w ? `**${nm(id)}は悲鳴を上げて手を引いた。** 手のひらが赤く焼けている。……人狼だ。` : fx ? `${nm(id)}の指先が触れたとたん、銀が青白く曇った。${nm(id)}は何事もなかったように笑った。……その影の端が、一瞬だけ狐の尾の形にゆらいだ。**妖狐だ。**` : `${nm(id)}は怪訝な顔をしただけだった。何も起こらない。人間だ。`, fx: () => { const e = pup(id); if (e) e.classList.add('shake'); } }]);
      log({ k: 'test', who: id, res: w });
    }
    save(); hub();
  }

  /* the meeting */
  async function meeting() {
    if (!(S.mtg && S.mtg.day === S.day) && (S.duskDay !== S.day)) { S.duskDay = S.day; await interlude(); }
    S.phase = 'meeting'; hud(); save(); SND.music('meeting', 1);
    setScene(st.meetLoc || 'inn', false, true);
    const ids = live().map(p => p.id);
    setCast(ids);
    G.onPup = null;
    await say([{ text: st.text.meet }]);
    const fresh = !(S.mtg && S.mtg.day === S.day);
    if (fresh) openGate({});
    let ev = fresh ? E.meeting(S, st) : [];
    const items = [];
    for (const e of ev) {
      const x = SP.event(S, st, e); if (!x || !x.text) continue;
      items.push({ who: e.by, text: x.text, fx: () => { reveal(e); if (e.target) { const t = pup(e.target); if (t && (e.t === 'accuse' || (e.t === 'result' && e.res === 'wolf'))) { t.classList.remove('shake'); void t.offsetWidth; t.classList.add('shake'); } } } });
    }
    if (!items.length) items.push({ text: '誰も、最初に口を開こうとしない。' });
    await say(items);
    closeGate();
    save();
    debate();
  }
  function debate() {
    if (S.ghost) return ghostDebate();
    S.phase = 'meeting'; hud();
    G.onPup = id => talk(id, true).then(() => debate());
    const canCo = ['seer', 'medium', 'guard', 'mason', 'cat'].includes(S.pl.role) && !S.pl.co;
    const newRes = S.pl.co && S.pl.res.some(r => !S.claims.find(c => c.by === 'you').res.some(x => x.target === r.target) && (r.seer || r.medium));
    const unshown = S.pl.found.filter(k => !S.reports.some(r => r.by === 'you' && r.night === +k.split('|')[0] && r.cat === S.nights[+k.split('|')[0]].traces[+k.split('|')[1]].cat));
    const ac = S.pl.accuse ? `（${nm(S.pl.accuse.target)}を名指しした）` : '';
    showMenu(`<div class="q">集会は続いている。あなたはどうする？<small>話し合いのあと、全員で投票し、ひとりを${esc(st.lex.jail)}へ送る。${esc(ac)}</small></div>
      <div class="btns">
        <button class="btn" id="dShow" ${unshown.length ? '' : 'disabled'}>${IC.show}痕跡を示す<small>${unshown.length}</small></button>
        ${canCo ? `<button class="btn acc" id="dCo">${ROLE_ICON[S.pl.role].replace('viewBox="0 0 32 32"', 'viewBox="0 0 32 32" style="width:22px;height:22px"')}${esc(st.roles[S.pl.role].name)}だと名乗る</button>` : ''}
        ${newRes ? `<button class="btn acc" id="dRes">${IC.show}結果を伝える</button>` : ''}
        <button class="btn" id="dAsk" ${S.pl.asks > 0 ? '' : 'disabled'}>${IC.ask}聞き取り<small>残り${S.pl.asks}</small></button>
        <button class="btn" id="dAcc" ${S.pl.accuse ? 'disabled' : ''}>${IC.point}名指しする</button>
        <button class="btn" id="dCall">${IC.call}呼びかける<small>${appealsLeft()}</small></button>
        <button class="btn" id="dClash" ${canClash() ? '' : 'disabled'}>${IC.clash}矛盾を突く</button>
        <button class="btn" id="dDef" ${S.pl.defend === S.day || missLeft() <= 0 ? 'disabled' : ''}>${IC.shield}かばう</button>
        <button class="btn pri" id="dVote">${IC.vote}投票へ</button>
      </div>`);
    const on = (id, f) => { const b = $(id); if (b) b.onclick = f; };
    on('dShow', showEvidence);
    on('dCo', coming);
    on('dRes', coming);
    on('dAsk', async () => { const id = await pickPerson('誰に聞く？', `聞き取りは残り${S.pl.asks}回。行動は使わない。`, live().map(p => p.id), { mark: true }); if (!id) return debate(); await talk(id, true); debate(); });
    on('dAcc', accuse);
    on('dCall', appeal);
    on('dClash', clash);
    on('dDef', defend);
    on('dVote', vote);
    renderNb();
  }
  async function showEvidence() {
    const keys = S.pl.found.filter(k => { const [ni, ti] = k.split('|').map(Number); const t = S.nights[ni].traces[ti]; return !S.reports.some(r => r.by === 'you' && r.night === ni && r.cat === t.cat); });
    const v = await pickOpt('どの痕跡を示す？', '示した痕跡は、あなたを信じる人の推理に加わる。', keys.map(k => { const [ni, ti] = k.split('|').map(Number); const t = S.nights[ni].traces[ti]; return { t: SP.traceShort(st, t) + '　' + locName(S.nights[ni].loc), s: SP.traceText(st, t), v: k, ic: IC.show }; }));
    if (!v) return debate();
    const r = E.present(S, st, v);
    const [ni] = v.split('|').map(Number);
    const fans = live().filter(p => p.persona.trust > .45);
    const w = fans.length ? fans[Math.floor(Math.random() * fans.length)] : null;
    await say([{ who: 'you', text: `${locName(S.nights[ni].loc)}で、この目で見た。${SP.traceText(st, S.nights[ni].traces[+v.split('|')[1]])}` }, w ? { who: w.id, text: SP.say(S, st, w.id, 'thanks') } : null]);
    log({ k: 'show', key: v });
    save(); debate();
  }
  async function coming() { await say(comingLines()); log({ k: 'co' }); save(); debate(); }
  function comingLines() {
    const first = !S.pl.co;
    const pc = first ? E.playerClaim(S) : (E.playerResults(S), null);
    const c = S.claims.find(c => c.by === 'you');
    const role = st.roles[S.pl.role].name;
    const lines = [];
    if (S.pl.role === 'cat') {
      lines.push({ who: 'you', text: `聞いてほしい。わたしは${role}だ。わたしを${st.lex.jail}へ送れば、誰かひとりを道連れにする。わたしを噛んだ狼も、ただでは済まない。` });
      for (const o of S.claims.filter(o => o.role === 'cat' && o.by !== 'you' && person(o.by).alive)) lines.push({ who: o.by, text: SP.say(S, st, o.by, 'counter', { rival: st.hero.title, role }) });
      return lines;
    }
    if (S.pl.role === 'mason') {   // the pair speaks together
      const mate = c.res[0] && c.res[0].target, mp = mate && person(mate);
      lines.push({ who: 'you', text: `聞いてほしい。わたしは${role}だ。相方は${mate ? nm(mate) : '……もういない'}。ゆうべ、ひと晩じゅう目の前にいた。互いに、人間だと知っている。` });
      c.res.forEach(r => r.told = true);
      for (const e of (pc && pc.ev) || []) if (e.t === 'co2') { const x = SP.event(S, st, e); if (x && x.text) lines.push({ who: e.by, text: x.text }); }
      if (mp && !mp.alive) lines.push({ text: `${nm(mate)}は、もう答えられない。けれど、その名を聞いて何人かがうなずいた。` });
      return lines;
    }
    if (first) lines.push({ who: 'you', text: `聞いてほしい。わたしは${role}だ。` });
    for (const r of c.res.filter(r => !r.told)) { r.told = true; lines.push({ who: 'you', text: S.pl.role === 'guard' ? `${r.night === 1 ? '最初の晩' : dayName(r.night) + 'の晩'}は、${nm(r.target)}の戸口に立っていた。` : S.pl.role === 'seer' ? `${nm(r.target)}を占った。結果は……${r.res === 'wolf' ? '**人狼**' : '人間'}だ。` : `${nm(r.target)}の影を見た。${r.res === 'wolf' ? '**狼だった**' : '人間だった'}。` }); }
    if (first && !c.res.length) lines.push({ who: 'you', text: 'まだ結果はない。けれど、黙っているよりはいいと思った。' });
    // rivals answer
    for (const o of S.claims.filter(o => o.role === c.role && o.by !== 'you' && person(o.by).alive)) lines.push({ who: o.by, text: SP.say(S, st, o.by, 'counter', { rival: st.hero.title, role }) });
    return lines;
  }
  /* 呼びかけ：村に頼む。皆が聞いている（狼も）。頼まれた側は、自分の損得で応じるか決める */
  function appealUsed() { const u = (S.req.used = S.req.used || {}); return (u[S.day] = u[S.day] || {}); }
  function appealsLeft() { const u = appealUsed(); return ['call', 'evid', 'div', 'guard'].filter(k => !u[k] && appealCan(k)).length || ''; }
  function appealCan(k) {
    const R = E.PUB(S);
    if (k === 'div') return S.claims.some(c => c.role === 'seer' && c.by !== 'you' && person(c.by).alive);
    if (k === 'guard') return R.guard > 0 && S.pl.role !== 'guard';
    return true;
  }
  async function appeal() {
    const u = appealUsed(), R = E.PUB(S);
    const seerN = st.roles.seer.name, medN = st.roles.medium.name, grdN = st.roles.guard ? st.roles.guard.name : '';
    const opts = [
      { t: `${seerN}・${medN}は名乗り出てほしい`, s: '名乗るかどうかは本人が決める。何も見ていない者は、命を惜しんで黙るかもしれない。偽物が出てくることもある。', v: 'call:seer,medium', ic: IC.call, dis: u.call },
      { t: `${seerN}だけ、名乗り出てほしい`, s: `${medN}はまだ隠れていてよい、という頼み方。`, v: 'call:seer', ic: IC.call, dis: u.call },
      ...(R.mason ? [{ t: `${st.roles.mason.name}は、ふたりで名乗り出てほしい`, s: `${st.roles.mason.name}は互いに人間だと知っている。名乗れば疑いは晴れるが、狼に狙われやすくなる。`, v: 'call:mason', ic: IC.call, dis: u.call }] : []),
      ...(R.guard ? [{ t: `${grdN}も、名乗り出てほしい`, s: `${grdN}は名乗れば狼に狙われる。守りが当たった夜のあとや、残りが少ないときほど出てきやすい。わけもなく頼むと、狩人を探す狼だと疑われる。`, v: 'call:guard', ic: IC.call, dis: u.call }] : []),
      { t: '見たもの・見つけたものを、全部出してほしい', s: '黙っていた痕跡や、夜に出歩いていた者の話が出てくるかもしれない。ただし、嘘の報告も混ざる。', v: 'evid', ic: IC.call, dis: u.evid },
      S.req.hide ? { t: `${seerN}は、もう隠れなくていい`, s: '先の頼みを取り下げる。', v: 'hide:0', ic: IC.call }
        : { t: `${seerN}は、狼を見つけるまで隠れていてほしい`, s: '本物は名乗らずに占い続ける。ただし、偽物が先に名乗れば黙ってはいないだろう。', v: 'hide:1', ic: IC.call },
    ];
    if (appealCan('div')) opts.push({ t: `${seerN}へ：今夜はこの人を占ってほしい`, s: '名乗った全員に頼む。引き受けるかは、あなたをどれだけ信じているか次第。偽物も、たいてい引き受ける。', v: 'div', ic: IC.call, dis: u.div });
    if (appealCan('guard')) opts.push({ t: `${grdN}へ：名乗らなくていい、この人を守ってほしい`, s: `${grdN}が誰かは、あなたにもわからない。守ってくれるかは本人次第。狼もこの頼みを聞いている。`, v: 'guard', ic: IC.call, dis: u.guard });
    if (appealCan('guard')) opts.push({ t: `${grdN}へ：今夜は、わたしを守ってほしい`, s: `自分の戸口を頼む。名乗り出ていれば聞き入れられやすいが、名乗りもなく頼めば、身勝手にも聞こえる。狼もこの頼みを聞いている。`, v: 'guardme', ic: IC.call, dis: u.guard });
    const v = await pickOpt('村に呼びかける', '集会の全員が聞いている。人狼も、だ。', opts);
    if (!v) return debate();
    openGate();
    let mine = '', ev = [];
    if (v.startsWith('call:')) {
      const roles = v.slice(5).split(',');
      u.call = 1;
      mine = roles[0] === 'mason' ? `${st.roles.mason.name}がいるなら、ふたりで名乗り出てほしい。互いを知る者がいれば、疑う相手がそれだけ減る。` : roles[0] === 'guard' ? `${grdN}がいるなら、名乗り出てほしい。誰を守ってきたのか、聞かせてくれ。` : roles.length > 1 ? `${seerN}と${medN}がいるなら、名乗り出てほしい。黙っていても、狼は待ってくれない。` : `${seerN}がいるなら、今、名乗り出てほしい。${medN}は、まだ出なくていい。`;
      await say([{ who: 'you', text: mine }]);
      ev = E.callOut(S, st, roles);
    } else if (v === 'evid') {
      u.evid = 1;
      await say([{ who: 'you', text: '昨夜のことで、見たもの、見つけたものがあるなら、今ここで全部出してほしい。小さなことでもいい。黙っていれば、狼が得をするだけだ。' }]);
      ev = E.callEvidence(S, st);
    } else if (v.startsWith('hide:')) {
      const on = v === 'hide:1';
      E.askHide(S, on);
      await say([{ who: 'you', text: on ? `${seerN}は、まだ名乗らないでほしい。狼を見つけるまでは、黙って占い続けてくれ。それがいちばん長く生き延びる道だ。` : `${seerN}は、もう隠れなくていい。見たものを、皆に聞かせてほしい。` }]);
      log({ k: 'hide', on }); save(); return debate();
    } else if (v === 'div') {
      const t = await pickPerson(`${seerN}に、誰を占ってもらう？`, '頼みは皆に聞こえる。', live().map(p => p.id), { mark: true });
      if (!t) return appeal();
      u.div = 1;
      await say([{ who: 'you', text: `${seerN}を名乗る者に頼みたい。今夜は、${nm(t)}を占ってくれないか。` }]);
      ev = E.askDivine(S, st, t);
    } else if (v === 'guard') {
      const t = await pickPerson(`${grdN}に、誰を守ってもらう？`, '名乗らなくていい。返事もいらない。', live().filter(p => p.id !== 'you').map(p => p.id), { mark: true });
      if (!t) return appeal();
      u.guard = 1;
      await say([{ who: 'you', text: `${grdN}がいるなら、名乗らなくていい。返事もいらない。今夜は、${nm(t)}の戸口に立ってほしい。` }]);
      ev = E.askGuard(S, st, t);
    } else if (v === 'guardme') {
      u.guard = 1;
      await say([{ who: 'you', text: S.pl.co ? `${grdN}がいるなら、名乗らなくていい。今夜は、わたしの戸口に立ってほしい。わたしが倒れれば、見たものも一緒に消える。` : `${grdN}がいるなら、名乗らなくていい。身勝手な頼みなのはわかっている。それでも今夜は、わたしの戸口に立ってほしい。` }]);
      ev = E.askGuard(S, st, 'you');
    }
    const items = [];
    for (const e of ev) { const l = lineOf(e); if (l) items.push(l); }
    if (v.startsWith('call:') && !ev.some(e => e.t === 'co')) items.unshift({ text: '誰も、すぐには口を開かなかった。何人かが、目を伏せた。' });
    if (items.length) await say(items);
    closeGate();
    log({ k: 'appeal', v }); save(); debate();
  }
  /* 矛盾を突く：誰の発言か → どの証拠をつきつけるか → 発言のどこがおかしいか。正しく突けば嘘が暴かれ、外せばあなたの言葉が軽くなる */
  const nightName = n => n === 0 ? '最初の夜' : dayName(n) + 'の夜';
  function partText(p, st0) {
    if (p.k === 'loc') return `夜は${locName(p.loc)}にいた`;
    if (p.k === 'fig') return `${SP.fig(st, p.cat, p.val)}を見た`;
    if (p.k === 'who') { const lp = st0 && st0.parts.find(q => q.k === 'loc'); return `${nm(p.who)}を${lp && E.near(st, lp.loc).includes(p.loc) ? 'となりの' : ''}${locName(p.loc)}で見た`; }
    return `現場の痕跡は「${SP.traceShort(st, p)}」だった`;
  }
  function evText(e) {
    if (e.k === 'self') return { t: 'この話そのもの', s: 'いた場所からは見えないはずのものを見た、など。話の中だけで食い違っている。' };
    if (e.k === 'said') return { t: `${nm(e.who)}は「${locName(e.loc)}にいた」と言った`, s: `${nightName(e.night)}。${nm(e.who)}本人の話。` };
    if (e.k === 'trace') return { t: `${locName(e.loc)}の痕跡「${SP.traceShort(st, e)}」`, s: `${nightName(e.night)}。あなたがこの目で見た。` };
    return { t: `${nm(e.who)}が${locName(e.loc)}にいた`, s: `${nightName(e.night)}。${e.by === 'you' ? 'あなたが見た' : nm(e.by) + 'の話'}。` };
  }
  const missLeft = () => 2 - ((S.pl.miss || {})[S.day] || 0);
  function canClash() { return missLeft() > 0 && E.statements(S, st).length && E.evidence(S).length; }
  async function clash() {
    const SL = E.statements(S, st), EV = E.evidence(S);
    // 1. whose words → 2. which night → 3. which part is wrong → 4. the evidence that breaks it (only what bears on that part)
    const who = await pickPerson('誰の発言を突く？', `的外れは今日あと${missLeft()}回まで。外せば、あなたの言葉が軽くなる。`, [...new Set(SL.map(x => x.who))], { mark: true });
    if (!who) return debate();
    const mine = SL.filter(x => x.who === who).sort((a, b) => b.night - a.night);
    let stmt = mine[0];
    if (mine.length > 1) { const v = await pickOpt(`${esc(nm(who))}の、どの夜の話？`, '', mine.map(x => ({ t: nightName(x.night), s: x.parts.map(q => partText(q, x)).join('。') + '。', v: x.id, ic: IC.talk }))); if (!v) return debate(); stmt = mine.find(x => x.id === v); }
    const told = `${nm(who)}の話（${nightName(stmt.night)}）：${stmt.parts.map(q => partText(q, stmt)).join('。')}。`;
    const part = stmt.parts.length === 1 ? '0' : await pickOpt('話の、どこがおかしい？', told, stmt.parts.map((p, i) => ({ t: `「${partText(p, stmt)}」`, v: String(i), ic: IC.clash })));
    if (part == null) return debate();
    const P1 = stmt.parts[+part], cand = E.clashEvidence(S, st, stmt.id, +part);
    if (!cand.length) { await say([{ text: `「${partText(P1, stmt)}」——この言葉を崩せる証拠を、あなたはまだ持っていない。${P1.k === 'loc' ? `その夜${nm(who)}を別の場所で見たという話があれば、つきつけられる。` : P1.k === 'who' ? `その夜${nm(P1.who)}がどこにいたか、本人や誰かの話があれば、つきつけられる。` : 'その夜の現場で、同じ種類の痕跡を自分の目で見ていれば、つきつけられる。'}` }]); return debate(); }
    const ev = await pickOpt('どの証拠をつきつける？', `おかしいのは：「${partText(P1, stmt)}」`, cand.map(e => { const x = evText(e); return { t: x.t, s: x.s, v: e.id, ic: IC.show }; }));
    if (!ev) return debate();
    const E1 = EV.find(e => e.id === ev);
    const lp = stmt.parts.find(p => p.k === 'loc');
    const items = [{ who: 'you', text: E1.k === 'self' ? `${nm(who)}。${nightName(stmt.night)}、「${partText(P1, stmt)}」と言ったな。${lp ? `だが、${locName(lp.loc)}から見えるのは${E.near(st, lp.loc).map(locName).join('と')}だけだ。` : ''}話が、話の中で食い違っている。` : `${nm(who)}。${nightName(stmt.night)}、「${partText(P1, stmt)}」と言ったな。だが、${E1.k === 'said' ? `${nm(E1.who)}は自分で、その夜は${locName(E1.loc)}にいたと言っている` : E1.k === 'trace' ? `わたしは${locName(E1.loc)}で、この目で「${SP.traceShort(st, E1)}」を見ている` : `${E1.by === 'you' ? 'わたしは' : nm(E1.by) + 'は'}その夜、${nm(E1.who)}を${locName(E1.loc)}で見ている`}。` }];
    const r = E.judgeClash(S, st, stmt.id, +part, ev);
    if (r.again) { await say([{ text: 'その食い違いは、もう皆の前で突いた。' }]); return debate(); }
    const t = pup(who); if (t) { t.classList.remove('shake'); void t.offsetWidth; t.classList.add('shake'); }
    openGate();
    if (!r.ok) G.gate.heat.you = 1;   // a miss turns the room on you as soon as it is said
    if (r.ok && r.other) items.push({ text: '食い違いは、たしかにあった。だが、ほころびたのは別の口だった。' });
    for (const e of r.ev || []) { const l = lineOf(e); if (l) items.push(l); }
    if (!r.ok) {
      const WHY = { agree: P1.k === 'fig' ? 'その人影の特徴は、痕跡と食い違っていなかった。' : P1.k === 'trace' ? '報告された痕跡は、あなたが見たものと同じだった。' : '居場所は、その証拠と同じだった。', sees: 'その場所は、いた所から見える。話の中に食い違いはなかった。', kind: '痕跡の種類が違い、比べようがなかった。' };
      items.push({ text: `${WHY[r.why] || '証拠は、その言葉を崩していなかった。'}${st.lex.meet}のざわめきが、あなたのほうへ向いた。${missLeft() > 0 ? '' : '\n今日はもう、うかつに人の言葉を突けない。'}` });
    }
    await say(items);
    closeGate();
    log({ k: 'clash', ok: r.ok }); save(); renderRoster(); debate();
  }
  /* かばう：誰を → どの証拠で。その人に合わない痕跡、襲われた夜に別の場所で見たという話、あなた自身の占い・霊媒の結果。
     本当にその人を外せる証拠なら、あなたを信じる人の疑いがその人から離れる。外せば、あなたの言葉が軽くなる（的外れは矛盾を突くと合わせて1日2回まで） */
  async function defend() {
    const id = await pickPerson('誰をかばう？', `1日に1度。外せば、あなたの言葉が軽くなる（的外れは今日あと${missLeft()}回まで）。`, live().map(p => p.id), { mark: true });
    if (!id) return debate();
    const EV = E.defendEvidence(S, st, id);
    if (!EV.length) { await say([{ text: `${nm(id)}をかばえる材料を、あなたはまだ持っていない。その人に合わない痕跡、襲われた夜に別の場所で見たという話、あなた自身の${st.roles.seer.name}の結果などがあれば、かばえる。` }]); return debate(); }
    const how = { seer: '占い', medium: '霊媒', test: '銀の道具', mason: '相方' };
    const text = e => e.k === 'trace' ? { t: `${locName(e.loc)}の痕跡「${SP.traceShort(st, e)}」`, s: `${nightName(e.night)}。あなたがこの目で見た。${nm(id)}の特徴は「${esc(st.traits[e.cat].v[person(id).traits[e.cat]])}」。` }
      : e.k === 'seen' ? { t: `${nm(id)}が${locName(e.loc)}にいた`, s: `${nightName(e.night)}（現場は${locName(S.nights[e.night].loc)}）。${e.by === 'you' ? 'あなたが見た' : nm(e.by) + 'の話'}。` }
      : { t: `あなたの${how[e.how]}の結果：${resWord(e.res)}`, s: '自分の力で確かめたこと。' };
    const ev = await pickOpt(`${esc(nm(id))}をかばう証拠は？`, '本当にその人を外せる証拠でなければ、通らない。', EV.map(e => { const x = text(e); return { t: x.t, s: x.s, v: e.id, ic: IC.shield }; }));
    if (!ev) return debate();
    const E1 = EV.find(e => e.id === ev);
    const line = E1.k === 'trace' ? `${nightName(E1.night)}、${locName(E1.loc)}には「${SP.traceShort(st, E1)}」が残っていた。${nm(id)}の特徴は「${st.traits[E1.cat].v[person(id).traits[E1.cat]]}」。その夜の狼ではない。`
      : E1.k === 'seen' ? `${nightName(E1.night)}、${nm(id)}は${locName(E1.loc)}にいた。${E1.by === 'you' ? 'わたしがこの目で見ている' : nm(E1.by) + 'が見ている'}。襲われたのは${locName(S.nights[E1.night].loc)}だ。`
      : `${nm(id)}のことは、わたしが自分で確かめた。${resWord(E1.res)}だ。`;
    const r = E.judgeDefend(S, st, id, ev);
    if (r.again) { await say([{ text: 'その証拠では、もう皆の前でかばった。' }]); return debate(); }
    S.pl.defend = S.day;
    openGate();
    const items = [{ who: 'you', text: `${nm(id)}は狼じゃない。${line}` }];
    if (r.ok) {
      items.push({ who: id, text: SP.say(S, st, id, 'thanks') });
      if (r.agree) items.push({ who: r.agree, text: SP.say(S, st, r.agree, 'okay', { target: SP.callName(S, st, r.agree, id) }) });
      items.push({ text: `${st.lex.meet}のざわめきが、${nm(id)}から少し離れた。` });
    } else {
      G.gate.heat.you = 1;
      const WHY = { fits: `けれど、${nm(id)}はその痕跡と食い違っていなかった。`, scene: `けれど、それは襲われた場所そのものだった。かばうどころか、疑いを深める話だ。`, lie: 'けれど、その話は、どこかがおかしかった。誰も頷かなかった。' };
      items.push({ text: `${WHY[r.why] || ''}${st.lex.meet}のざわめきが、あなたのほうへ向いた。${missLeft() > 0 ? '' : '\n今日はもう、うかつに人をかばえない。'}` });
    }
    await say(items);
    closeGate();
    log({ k: 'defend', who: id, ok: r.ok }); save(); renderRoster(); debate();
  }
  async function accuse() {
    const id = await pickPerson('誰を名指しする？', '名指しすると、あなたを信じる人がその人を疑いはじめる。外せば、あなたが疑われる。', live().map(p => p.id), { mark: true });
    if (!id) return debate();
    const fits = S.pl.found.some(k => { const [ni, ti] = k.split('|').map(Number); const t = S.nights[ni].traces[ti]; const v = person(id).traits[t.cat]; return t.neg ? v !== t.val : v === t.val; });
    S.pl.accuse = { day: S.day, target: id, ev: fits };
    const others = live().filter(p => p.id !== id);
    const ag = others.filter(p => { const o = E.opinion(S, st, p.id); return o && o.target === id; });
    await say([{ who: 'you', text: `わたしは、${nm(id)}が${S.foxHunt ? '狐' : '狼'}だと思う。` }, { who: id, text: SP.say(S, st, id, 'defend'), fx: () => { const e = pup(id); if (e) e.classList.add('shake'); } }, ag.length ? { who: ag[0].id, text: SP.say(S, st, ag[0].id, 'agree', { with: st.hero.title, target: SP.callName(S, st, ag[0].id, id) }) } : null]);
    log({ k: 'accuse', who: id });
    save(); debate();
  }

  /* the ghost: the player died, but watches to the end with one whisper and one vote */
  function willLines() {
    const g = S.ghost; if (!g || !g.will || g.willTold) return [];
    g.willTold = true;
    const role = st.roles[S.pl.role].name;
    return [{ text: `${st.lex.book || '手帳'}の最後の頁に、あなたは${role}として見たことを書き残していた。朝、それを見つけた者が、皆の前で読み上げた。\n` + g.will.map(w => `${nm(w.target)}：${w.res === 'wolf' ? '**人狼**' : '人間'}`).join('　') }];
  }
  async function ghostDay() {
    S.pl.ap = 0; S.pl.accuse = null;
    document.body.classList.add('ghost'); hud();
    await say(willLines());
    E.npcSearch(S, st);
    meeting();
  }
  function ghostDebate() {
    S.phase = 'meeting'; hud(); document.body.classList.add('ghost');
    G.onPup = null;
    const g = S.ghost;
    showMenu(`<div class="q">あなたの声は、もう誰にも聞こえない。けれど、まだできることがある。<small>囁きは一度だけ。幽霊の一票も一度だけ。${G.ghostVote ? `（今日の一票は${esc(nm(G.ghostVote))}へ）` : ''}${S.pl.accuse ? `（${esc(nm(S.pl.accuse.target))}の名を囁いた）` : ''}</small></div>
      <div class="btns">
        <button class="btn" id="gWh" ${g.whisper ? '' : 'disabled'}>${IC.ask}名を囁く<small>残り${g.whisper}</small></button>
        <button class="btn" id="gVo" ${g.vote && !G.ghostVote ? '' : 'disabled'}>${IC.vote}幽霊の一票<small>残り${g.vote}</small></button>
        <button class="btn pri" id="gGo">${IC.go}投票を見届ける</button>
      </div>`);
    $('gWh').onclick = async () => {
      const id = await pickPerson('誰の名を囁く？', '生きている者たちの耳もとで、ひとりの名を囁く。あなたを信じていた者ほど、その名を疑いはじめる。', live().map(p => p.id), { mark: true });
      if (!id) return ghostDebate();
      g.whisper = 0; S.pl.accuse = { day: S.day, target: id, ev: true, ghost: true };
      const ear = live().filter(p => p.id !== id).sort((a, b) => b.persona.trust - a.persona.trust)[0];
      await say([{ text: `灯りがひとつ、風もないのに揺れた。誰かが振り返る。\n……${nm(id)}。その名だけが、部屋の空気に残った。` }, ear ? { who: ear.id, text: SP.say(S, st, ear.id, 'bad', { target: SP.callName(S, st, ear.id, id), why: SP.why(S, st, ear.id, { k: 'gut' }) }) } : null]);
      save(); ghostDebate();
    };
    $('gVo').onclick = async () => {
      const id = await pickPerson('幽霊の一票を、誰に入れる？', '一度きり。今日の投票に、あなたの一票が加わる。', live().map(p => p.id), { mark: true });
      if (id) G.ghostVote = id;
      ghostDebate();
    };
    $('gGo').onclick = vote;
    renderNb();
  }

  /* the vote */
  async function vote() {
    S.phase = 'vote'; hud(); save();
    const gv = S.ghost ? G.ghostVote : null;
    const pick = S.ghost ? null : await pickPerson('誰に票を入れる？', `最も票を集めた人が${st.lex.jail}へ送られる。`, live().map(p => p.id), { mark: true });
    if (!pick && !S.ghost) return debate();
    if (gv) { S.ghost.vote = 0; G.ghostVote = null; }
    await say([{ text: st.text.vote }].concat(gv ? [{ text: `誰にも見えない手が、黒板に一本の線を引いた。**${nm(gv)}**の名の下に。` }] : []));
    let r = E.voteRound(S, st, pick, null, gv);
    const rounds = [r];
    await threads(r.ballots);
    if (r.top.length > 1) {
      await say([{ text: `票が割れた。${r.top.map(nm).join('と')}。もう一度、この中から選ぶ。` }]);
      let p2 = S.ghost ? null : r.top.includes(pick) ? pick : await pickPerson('決選投票', `${r.top.map(nm).join('・')}の中から選ぶ。`, r.top.filter(x => x !== 'you'));
      if (!p2 && !S.ghost) p2 = r.top.find(x => x !== 'you');
      r = E.voteRound(S, st, p2, r.top, gv); rounds.push(r);
      await threads(r.ballots);
    }
    let out = r.top[0], lot = false;
    if (r.top.length > 1) { lot = true; out = r.top[Math.floor(Math.random() * r.top.length)]; await say([{ text: `それでも決まらない。くじが引かれ、**${nm(out)}**の名が出た。` }]); }
    // 回避CO: the one chosen may name a role to escape; then the village votes again
    if (!(S.dodged && S.dodged[S.day])) {
      let ev = [];
      if (out === 'you' && !S.ghost && !S.pl.co && ['seer', 'medium', 'guard', 'mason', 'cat'].includes(S.pl.role)) {
        const go = await pickOpt('票はあなたに集まった', `${st.roles[S.pl.role].name}だと名乗れば、票が変わるかもしれない。名乗れば、狼にも知られる。`, [{ t: `${st.roles[S.pl.role].name}だと名乗る`, v: 1, ic: IC.point }, { t: '名乗らずに受け入れる', v: 2, ic: IC.vote }]);
        if (go === 1) { (S.dodged = S.dodged || {})[S.day] = 'you'; $('fx').querySelector('.threads')?.remove(); await say([{ text: '扉へ向かう腕を振りほどいて、あなたは皆に向き直った。' }].concat(comingLines())); ev = [null]; }
      } else if (out !== 'you') {
        openGate();
        ev = E.dodge(S, st, out);
        if (!ev.length) G.gate = null;
        if (ev.length) {
          $('fx').querySelector('.threads')?.remove();
          const items = [];
          for (const e of ev) { if (e.t === 'dodge') { items.push({ text: `${st.lex.jail}の扉が開けられたとき、**${nm(e.by)}**が声を上げた。`, fx: () => { const t = pup(e.by); if (t) { t.classList.remove('shake'); void t.offsetWidth; t.classList.add('shake'); } } }); continue; } const l = lineOf(e); if (l) items.push(l); }
          await say(items); closeGate();
          // the player may speak before the vote is cast again
          const dc = S.claims.find(c => c.by === out), rn = dc ? st.roles[dc.role].name : '';
          const talkV = dc && dc.role === 'mason' ? 'none' : await pickOpt('名乗りを聞いて、何か言う？', '言わなくてもいい。あなたを信じる人ほど、その言葉に動かされる。', [
            { t: `${nm(out)}の名乗りを信じる`, s: '票を入れ直すなら、別の人に。', v: 'trust', ic: IC.ask },
            { t: '今さら名乗るのは怪しい', s: '本物なら、もっと早く出ていたはずだ。', v: 'doubt', ic: IC.point },
            { t: `本物の${rn}がいるなら、今名乗ってほしい`, s: '隠れている本物が、対抗して出てくるかもしれない。', v: 'counter', ic: IC.call },
            { t: '何も言わない', v: 'none', ic: IC.vote }]);
          if (talkV && talkV !== 'none') {
            const line = { trust: `${nm(out)}を信じる。${rn}を${st.lex.jail}へ送るわけにはいかない。票は、ほかの誰かに入れよう。`, doubt: `今になって${rn}だと？ 本物なら、もっと早く名乗っていたはずだ。わたしは信じない。`, counter: `本物の${rn}がいるなら、今ここで名乗ってほしい。黙っていれば、偽物が生き残る。` }[talkV];
            openGate();
            const ev2 = E.dodgeTalk(S, st, out, talkV), it2 = [{ who: 'you', text: line }];
            for (const e of ev2) { const l = lineOf(e); if (l) it2.push(l); }
            if (talkV === 'counter' && !ev2.some(e => e.t === 'co')) it2.push({ text: '誰も、続いて名乗り出なかった。' });
            await say(it2); closeGate();
          }
        }
      }
      if (ev.length) {
        await say([{ text: '名乗りを聞いて、もう一度、票が入れ直される。' }]);
        const p3 = S.ghost ? null : await pickPerson('入れ直しの投票', '名乗りを聞いたうえで、もう一度選ぶ。', live().map(p => p.id), { mark: true }) || pick;
        r = E.voteRound(S, st, p3, null, null); rounds.push(r);
        await threads(r.ballots);
        out = r.top[0]; lot = false;
        if (r.top.length > 1) { lot = true; out = r.top[Math.floor(Math.random() * r.top.length)]; await say([{ text: `票が割れた。くじが引かれ、**${nm(out)}**の名が出た。` }]); }
      }
    }
    $('fx').querySelector('.threads')?.remove();
    E.exile(S, out, rounds, lot);
    const dragged = S.votes[S.votes.length - 1].dragged;   // the nekomata does not go alone
    const dragLine = () => dragged ? [{ text: fill(pickOne(st.text.catJail || ['{cat}の後を追うように、{name}が倒れた。']), { name: dragged === 'you' ? 'あなた' : nm(dragged), cat: out === 'you' ? 'あなた' : nm(out) }), fx: () => { if (dragged !== 'you') { const e = pup(dragged); if (e) e.classList.add('lift'); } SND.thud(); } }] : [];
    if (out === 'you') {
      await say([{ text: `票の糸は、すべてあなたに結ばれていた。` }, { text: st.text.exiledYou }].concat(dragLine()));
      if (E.check(S)) { S.phase = 'end'; save(); return end(); }
      await say([{ text: st.text.ghost }].concat(willLines()));
      S.phase = 'night'; save(); return night();
    }
    const c = ch(out);
    const t = pickOne(st.text.exile);
    await say([{ text: fill(t, { name: c.name }) }, { who: out, text: c.last }]);
    const e = pup(out); if (e) { e.classList.add('lift'); SND.thud(); }
    await wait(900);
    if (dragged) { await say(dragLine()); if (dragged === 'you') { await say([{ text: st.text.ghost }].concat(willLines())); if (E.check(S)) { S.phase = 'end'; save(); return end(); } S.phase = 'night'; save(); return night(); } }
    log({ k: 'exile', who: out });
    if (E.check(S)) { S.phase = 'end'; save(); return end(); }
    S.phase = 'night'; save();
    night();
  }
  // red threads from every voter to the one they chose
  async function threads(ballots) {
    const fx = $('fx'); fx.querySelector('.threads')?.remove();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'threads');
    fx.appendChild(svg);
    const box = $('stage').getBoundingClientRect();
    const at = id => { const e = pup(id); if (!e) return null; const b = e.querySelector('.pup').getBoundingClientRect(); return { x: b.left + b.width * .55 - box.left, y: b.top + b.height * .26 - box.top }; };
    const youAt = { x: box.width / 2, y: box.height - (PCQ.matches ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dockH')) : 0) - 10 };
    let i = 0;
    for (const v in ballots) {
      const a = v === 'you' ? youAt : at(v), b = at(ballots[v]); if (!a || !b) continue;
      const mx = (a.x + b.x) / 2, my = Math.min(a.y, b.y) - 60 - Math.abs(a.x - b.x) * .12;
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', `M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`); p.setAttribute('class', 'th');
      svg.appendChild(p); const len = p.getTotalLength(); p.style.setProperty('--len', len); p.style.animationDelay = (i * .16) + 's';
      SND.pluck(i); i++;
      await wait(160);
    }
    await wait(900);
    const c = {}; for (const v in ballots) c[ballots[v]] = (c[ballots[v]] || 0) + 1;
    const top = Object.entries(c).sort((a, b) => b[1] - a[1]);
    await say([{ text: top.map(([id, n]) => `${nm(id)} ${n}票`).join('　') }]);
  }

  /* the night */
  async function night() {
    S.phase = 'night'; hud(); SND.music('story', .4);
    document.body.classList.add('night'); setScene(st.nightLoc || st.locs[0].id, true); setCast([]);
    SND.windOn(.09);
    await say([{ text: pickOne(st.text.night) }, vignette()]);
    const act = {};
    const r = S.ghost ? null : S.pl.role;
    const wolves = E.alive(S).some(p => p.role === 'wolf');   // the fox hunt: the wolves are gone, the night is quiet
    if (!S.ghost && S.pl.co && wolves) await say([{ text: `あなたは${st.roles[S.pl.role].name}だと名乗った。狼は、名乗った者の戸口を知っている。\n${S.hid && E.PUB(S).guard ? "扉を守ってくれる者が、この村にいるのかどうか。" : E.RS(S).guard ? "今夜、誰かがあなたを守ってくれるだろうか。" : `この${st.lex.village}に、扉を守ってくれる者はいない。`}` }]);
    if (r === 'seer') {
      const done = new Set(S.pl.res.filter(x => x.seer).map(x => x.target));
      act.divine = await pickPerson('今夜、誰を占う？', '朝に結果がわかる。', live().filter(p => !done.has(p.id)).map(p => p.id), { mark: true }) || pickOne(live()).id;
    } else if (r === 'guard') {
      act.guard = await pickPerson('今夜、誰を守る？', '守った人は、人狼に襲われても死なない。自分は守れない。二晩続けて同じ人は守れない。', live().filter(p => p.id !== S.lastGuard).map(p => p.id), { mark: true }) || null;
    }
    const lantern = !S.ghost && S.pl.items.find(i => st.items.find(x => x.id === i).kind === 'stake');
    if (lantern) {
      const v = await pickOpt('夜の見張り', `${st.items.find(x => x.id === lantern).name}を持っている。どこかで夜を明かせば、通りかかる影が見えるかもしれない。`, [{ t: '部屋で眠る', v: 'home', ic: IC.moon }].concat(st.locs.map(l => ({ t: l.name + 'で見張る', v: l.id, ic: IC.search }))));
      if (v && v !== 'home') { act.stake = v; S.pl.stakeAt = v; await say([{ text: fill(st.items.find(x => x.id === lantern).use, { loc: locName(v) }) }]); }
    }
    E.night(S, st, act);
    S.day++;
    save();
    // the wolf crosses the screen; if it bit the nekomata, the cat's curse catches it on the way
    const N = S.nights[S.nights.length - 1];
    if (wolves) await wolfRun(N && N.dragged ? N : null);
    else { await wait(600); await say([{ text: '遠吠えは、もう聞こえなかった。かわりに、どこか近くで、狐が細く、ひと声だけ鳴いた。' }]); }
    SND.windOff();
    if (E.check(S)) {
      // the bite that ended it: show the morning before the end, so the curse is seen to land
      if (N && N.dragged) {
        const lines = [];
        if (N.target !== 'you') lines.push({ text: `夜が明けた。${nm(N.target)}が、雪の中で冷たくなっていた。`, fx: () => setCast([N.target], { fallen: N.target, x: 42 }) });
        lines.push({ text: fill(pickOne(st.text.catDrag || ['{name}も、冷たくなっていた。']), { name: nm(N.dragged), cat: N.target === 'you' ? 'あなた' : nm(N.target) }), fx: () => setCast(N.target !== 'you' ? [N.target, N.dragged] : [N.dragged], { fallen: N.dragged, x: 58 }) });
        await say(lines);
      }
      S.phase = 'end'; save(); return end();
    }
    await morning(false);
  }
  async function wolfRun(N) {
    const fx = $('fx');
    const d = document.createElement('div'); d.className = 'run'; d.innerHTML = ART.wolf(); fx.appendChild(d);
    SND.howl(.3);
    if (!N) { SND.door(1.3); await wait(2900); d.remove(); return; }   // far off a howl, then a door creaks open somewhere close
    // the nekomata's curse: the wolf comes back from its kill; the cat's eyes open behind it, it cries,
    // four claws of pale fire tear across the wolf, and the shadow falls apart in the dark
    d.classList.add('cursed');
    const c = document.createElement('div'); c.className = 'nekomata'; c.innerHTML = ART.cat(); fx.appendChild(c);
    const k = document.createElement('div'); k.className = 'claws';
    k.innerHTML = '<svg viewBox="0 0 200 160" aria-hidden="true">' + [0, 1, 2, 3].map(i => `<path d="M${40 + i * 30},${18 + i * 4} C${60 + i * 30},${60 + i * 2} ${70 + i * 30},${100 - i * 2} ${78 + i * 32},${146 - i * 4}" style="--d:${i * .07}s"/>`).join('') + '</svg>';
    const fl = document.createElement('div'); fl.className = 'curseflash'; fx.appendChild(fl);
    fx.appendChild(k);
    SND.cat(1.5);
    await wait(3300);
    SND.thud();
    await wait(1500);
    [d, c, k, fl].forEach(x => x.remove());
  }

  /* the end: who they were */
  // the score, section by section
  function scoreTable(sc) {
    const P = sc.part, sg = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);
    const rows = [
      ['結末', R0 => S.result.win ? '狼をすべて見つけ出した' : '狼を止められなかった', P.outcome],
      ['投票', () => `狼に${sc.wolfVotes}票・人間に${sc.badVotes}票`, P.votes],
      ['名指し', () => `当たり${sc.accHit}・外れ${sc.accMiss}`, P.accuse],
      ['矛盾を突く', () => `暴いた${sc.clashHit}・的外れ${sc.clashMiss}`, P.clash],
      ['証拠と名乗り', () => `示した痕跡${sc.shown}・名乗って出した黒${sc.black}`, P.evidence],
      ['生き延びた', () => sc.deathDay == null ? '最後まで生きていた' : `${dayName(sc.deathDay)}に倒れた`, P.survival],
      ['失われた人', () => `${sc.lost}人`, P.losses],
      ['むずかしさ', () => DIFFN[S.diff], P.level],
    ];
    return `<table class="sct">${rows.map(([k, d, n]) => `<tr><th>${k}</th><td>${esc(d())}</td><td class="${n > 0 ? 'p' : n < 0 ? 'm' : ''}">${sg(n)}</td></tr>`).join('')}<tr class="tot"><th>合計</th><td>S 88以上・A 72以上・B 55以上・C 35以上</td><td>${sc.pts}</td></tr></table>`;
  }
  async function end() {
    S.phase = 'end'; hud(); save(); renderRoster();
    const R = S.result || E.check(S);
    SND.music(R && R.win ? 'clear' : 'gameover', .85);   // the village won: the winning song; the wolves (or the fox) won: the losing song
    const wolves = S.people.filter(p => p.role === 'wolf');
    document.body.classList.remove('night');
    setScene(st.meetLoc || 'inn', false, true);
    if (R.win) {
      await say([{ text: pickOne(st.text.climax) }]);
    }
    document.body.classList.remove('ghost');
    // the truth: first the wolves' side alone, then the third side, then the village — a few figures at a time (a phone must not crowd)
    const badge = id => { const p = person(id), e = pup(id); if (!p || !e || e.querySelector('.badge')) return; const b = document.createElement('span'); b.className = 'badge' + (p.role === 'wolf' || p.role === 'madman' ? ' w' : p.role === 'fox' || p.role === 'immoral' ? ' f' : ''); b.textContent = SP.roleName(st, p.role); e.appendChild(b); if (!p.alive) e.classList.add('dim'); };
    const show = async (ids, o) => { setCast(ids, o); await wait(60); ids.forEach(badge); };
    const mad = S.people.find(p => p.role === 'madman');
    const madAll = S.people.filter(p => p.role === 'madman');
    await show(wolves.map(w => w.id), { span: [22, 78] });
    await say([{ text: `幕の向こうで、灯りがひとつ強くなった。\nまず、狼の影が本当の形を映しはじめる。` }]);
    for (const w of wolves) {
      const e = pup(w.id);
      if (e) { const s = document.createElement('div'); s.className = 'wolfshade'; s.innerHTML = ART.wolf(); e.appendChild(s); e.classList.remove('dim'); requestAnimationFrame(() => e.classList.add('turn')); SND.howl(.1); }
      await say([{ who: w.id, text: ch(w.id).wolf }]);
    }
    if (madAll.length) {
      await show(madAll.map(p => p.id), { span: [30, 70] });
      await say([{ text: st.rules === 'fanatic' ? `狼の正体を知りながら、狼に仕えていた人間——狂信者は、${madAll.map(p => `**${nm(p.id)}**`).join('と')}だった。` : `狼に心を寄せていた人間——狂人は、${madAll.map(p => `**${nm(p.id)}**`).join('と')}だった。` }]);
    }
    const fox = S.people.find(p => p.role === 'fox');
    const imm = S.people.find(p => p.role === 'immoral');
    if (fox) {
      await show([fox.id].concat(imm ? [imm.id] : []), { span: [32, 68] });
      await say([{ text: `${st.roles.fox.reveal || '社に棲む狐'}——${st.roles.fox.name}は、**${nm(fox.id)}**だった。${fox.alive ? '最後まで、誰にも見破られなかった。' : fox.death.cause === 'curse' ? '占いの鏡に映されて、燃え尽きた。' : `${st.lex.jail}へ送られて、正体を明かした。`}`, fx: () => { const e = pup(fox.id); if (e) { e.classList.remove('dim'); e.classList.add('shake'); } } }]);
      if (imm) await say([{ text: `${st.roles.fox.name}に仕えていた${st.roles.immoral.name}は、**${nm(imm.id)}**だった。${imm.alive ? '主を失うことなく、幕が下りた。' : imm.death.cause === 'follow' ? '主のあとを追って、ひとりで幕を引いた。' : `${st.lex.jail}へ送られて、何も語らなかった。`}`, fx: () => { const e = pup(imm.id); if (e) { e.classList.remove('dim'); e.classList.add('shake'); } } }]);
    }
    setCast([]);
    if (st.arc && st.arc.coda) await say([{ text: st.arc.coda }]);
    const gone = !S.people[0].alive;   // the player died: the ending must not have them write or walk
    if (R.why === 'fox' && st.text.loseFox) await say([{ text: fill(st.text.loseFox, { book: st.lex.book }) }]);
    if (R.win || R.why === 'overrun') await say([{ text: fill(R.win ? (gone && st.text.winGhost || st.text.win) : (gone && st.text.loseGhost || st.text.lose), { book: st.lex.book }) }]);
    if (R.win && st.heroData) { const ep = gone ? st.heroData.epiGhost : st.heroData.epi; if (ep) await say([{ text: ep }]); }
    // the village: those with a role, one by one; then the villagers — each with what became of them (when the village won)
    const epiOf = id => R.win && person(id).alive && ch(id).epi ? [{ text: ch(id).epi }] : [];
    const ROLEL = { seer: '夜ごとに真実を見ていた', medium: '死者の影を見ていた', guard: '夜の戸口に立ち続けた', cat: '尾の裂けた猫' };
    for (const r of ['seer', 'medium', 'guard', 'mason', 'cat']) {
      const ps = S.people.filter(p => p.role === r && !p.isPlayer);
      if (!ps.length) continue;
      await show(ps.map(p => p.id), { span: [34, 66] });
      const rn = SP.roleName(st, r);
      const lead = r === 'mason' ? `互いを人間だと知っていた${rn}は、` : r === 'cat' ? `${ROLEL.cat}——${rn}は、` : `${ROLEL[r]}${rn}は、`;
      await say([{ text: `${lead}${ps.map(p => `**${nm(p.id)}**`).join('と')}だった。` }].concat(...ps.map(p => epiOf(p.id))));
    }
    const vil = S.people.filter(p => p.role === 'villager' && !p.isPlayer);
    if (vil.length) {
      const alive = vil.filter(p => p.alive), rest = vil.filter(p => !p.alive);
      const ids = alive.concat(rest).map(p => p.id).slice(0, 4);
      await show(ids, { span: [16, 84] });
      const epi = R.win ? alive.slice().sort(() => Math.random() - .5).slice(0, 3).flatMap(p => epiOf(p.id)) : [];
      await say([{ text: `そして、何の力も持たずに夜を越えた村人たち——${vil.map(p => nm(p.id)).join('、')}。` }].concat(epi));
    }
    setCast([]);
    const cat = S.people.find(p => p.role === 'cat');
    const sc = E.score(S);
    // the record
    const rr = rec(); const k = st.id; rr[k] = rr[k] || { plays: 0, win: 0, best: '-' };
    rr[k].plays++; if (R.win) rr[k].win++;
    const fresh = window.WLFeats.earned(st.id, S, sc, R).filter(f => !(rr[k].feats || {})[f.id]);
    for (const f of fresh) (rr[k].feats = rr[k].feats || {})[f.id] = Date.now();
    const order = ['S', 'A', 'B', 'C', 'D', '-'];
    if (order.indexOf(sc.rank) < order.indexOf(rr[k].best)) rr[k].best = sc.rank;
    try { localStorage.setItem(REC, JSON.stringify(rr)); } catch (e) {}
    clearSave();
    const why = ({ cleared: '狼をすべて見つけ出した', overrun: '狼の数が、人の数に並んだ', fox: `${(st.roles.fox && st.roles.fox.reveal) || '社の狐'}が生き残った` }[R.why] || '') + (S.ghost ? '（あなたは幽霊として見届けた）' : '');
    await sheet(`<h3 style="text-align:center">${R.win ? '解決' : '未解決'}　<small style="font:500 15px var(--ui);color:var(--mute)">${esc(why)}</small></h3>
      <div class="rank">${sc.rank}</div>
      ${scoreTable(sc)}
      ${fresh.length ? `<div class="newfeat"><b>新しい実績</b>${fresh.map(f => `<div class="feat got"><i>★</i><b>${esc(f.name)}</b><span>${esc(f.desc)}</span></div>`).join('')}</div>` : ''}
      <p style="font-size:15px">人狼：${wolves.map(w => esc(nm(w.id))).join('、')}${mad ? `　${esc(SP.roleName(st, 'madman'))}：${S.people.filter(p => p.role === 'madman').map(p => esc(nm(p.id))).join('、')}` : ''}${cat ? `　猫又：${esc(nm(cat.id))}` : ''}${fox ? `　妖狐：${esc(nm(fox.id))}` : ''}${S.people.find(p => p.role === 'immoral') ? `　${esc(SP.roleName(st, 'immoral'))}：${esc(nm(S.people.find(p => p.role === 'immoral').id))}` : ''}${S.hid ? `<br><span style="color:var(--mute)">今回の顔ぶれ：${['seer', 'medium', 'guard', 'mason', 'cat', 'fox', 'immoral', 'madman'].filter(r => E.PUB(S)[r]).map(r => `${esc(SP.roleName(st, r))}${E.RS(S)[r] ? (E.RS(S)[r] > 1 ? '×' + E.RS(S)[r] : '') : '（いなかった）'}`).join('・')}</span>` : ''}</p>
      <div class="foot"><button class="btn" data-a="title">タイトルへ</button><button class="btn" data-a="select">ほかの物語へ</button><button class="btn pri" data-a="again">もう一度</button></div>`, box => box.querySelectorAll('[data-a]').forEach(b => b.onclick = () => closeSheet(b.dataset.a))).then(a => {
      if (a === 'again') { buildSetup(); } else if (a === 'select') buildSelect(); else buildTitle();
    });
  }

  /* ---------- the notebook ---------- */
  function setNb(open) { document.body.classList.toggle('nb-open', open); document.documentElement.style.setProperty('--nbW', open && PCQ.matches ? '400px' : '0px'); $('btnNb').classList.toggle('on', open); setTimeout(() => { layoutDock(); if (S) renderRoster(); }, 380); if (open) renderNb(); }
  $('btnNb').onclick = () => { const o = !document.body.classList.contains('nb-open'); setNb(o); G.nbShut = !o ? S && S.day + S.phase : null; };
  $('nbClose').addEventListener('click', () => { G.nbShut = S && S.day + S.phase; });
  // in the phases of reasoning (the day's investigation, the meeting) the notebook opens by itself on a wide screen
  function autoNb() {
    if (!PCQ.matches || !S || G.scr !== 'play') return;
    const think = S.phase === 'invest' || S.phase === 'meeting' || S.phase === 'vote';
    const open = document.body.classList.contains('nb-open');
    if (think && !open && G.nbShut !== S.day + S.phase) setNb(true);
    if (!think && open && (S.phase === 'night' || S.phase === 'prologue' || S.phase === 'end')) setNb(false);
  }
  $('nbClose').onclick = () => setNb(false);
  $('nbTabs').querySelectorAll('button').forEach(b => b.onclick = () => { G.nbTab = b.dataset.t; $('nbTabs').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); renderNb(); });
  function renderNb() {
    if (!S || !document.body.classList.contains('nb-open')) return;
    const B = $('nbBody'), t = G.nbTab;
    if (t === 'ppl') B.innerHTML = nbPeople();
    else if (t === 'ev') B.innerHTML = nbEvidence();
    else if (t === 'say') B.innerHTML = nbSay();
    else B.innerHTML = nbVotes();
    // a memo: tap a trace or a testimony you doubt to strike it through (only for you; the reasoning is not changed)
    if (t === 'ev' || t === 'say') {
      const SK = S.pl.strike = S.pl.strike || {};
      B.querySelectorAll('.li').forEach(li => {
        const k = li.textContent.replace(/\s+/g, '').slice(0, 80);
        if (!k || /^(まだ|残りの痕跡)/.test(k) || li.closest('.promise')) return;
        li.classList.add('memo'); li.classList.toggle('strike', !!SK[k]); li.title = '押すと打ち消し線（メモ）';
        li.onclick = () => { if (SK[k]) delete SK[k]; else SK[k] = 1; li.classList.toggle('strike', !!SK[k]); save(); };
      });
      B.insertAdjacentHTML('beforeend', '<div class="memo-note">メモ：怪しいと思う痕跡や証言を押すと、打ち消し線を引ける。もう一度押すと消える。あなたのための印で、推理や結果は変わらない。</div>');
    }
    B.querySelectorAll('.marks button').forEach(b => b.onclick = () => { const id = b.dataset.id, m = b.dataset.m; S.pl.notes[id] = S.pl.notes[id] === m ? '' : m; save(); renderNb(); renderRoster(); if (S.phase === 'invest' && !G.tut) hub(); });
  }
  function nbPeople() {
    const D = E.DIFF[S.diff];
    const cats = E.CATS;
    return `<div class="nh">登場人物 ${S.size - 1}人</div>` + S.people.filter(p => !p.isPlayer).map(p => {
      const c = ch(p.id);
      const st2 = !p.alive ? (p.death.cause === 'wolf' ? `犠牲（${dayName(p.death.day)}）` : p.death.cause === 'curse' ? `呪い死（${dayName(p.death.day)}）` : p.death.cause === 'follow' ? `後追い（${dayName(p.death.day)}）` : p.death.cause === 'catw' ? `猫又の道連れ（${dayName(p.death.day)}）・人狼` : p.death.cause === 'cat' ? `猫又の道連れ（${dayName(p.death.day)}）` : `追放（${dayName(p.death.day)}）`) : '';
      const claim = S.claims.find(x => x.by === p.id);
      const fit = D.assist ? E.fitsTraces(S, p.id) : null;
      const chips = cats.map(cat => { let cls = ''; if (fit) { const hits = S.pl.found.map(k => k.split('|').map(Number)).filter(([ni, ti]) => S.nights[ni].traces[ti].cat === cat); if (hits.length) { const ok = hits.every(([ni, ti]) => { const tr = S.nights[ni].traces[ti]; return tr.neg ? p.traits[cat] !== tr.val : p.traits[cat] === tr.val; }); cls = ok ? ' hit' : ' miss'; } } return `<span class="chip${cls}">${esc(SP.trait(st, cat, p.traits[cat]))}</span>`; }).join('');
      const mine = S.pl.res.filter(r => r.target === p.id).map(r => `<span class="chip ${r.res === 'wolf' ? 'w' : r.res === 'fox' ? 'f' : 'h'}">${r.test ? '銀' : r.seer ? '占' : r.mason ? '相方' : '霊'}：${resWord(r.res)}</span>`).join('');
      const cl = claim ? `<span class="chip role">${esc(SP.roleName(st, claim.role))}を名乗る</span>` + claim.res.map(r => `<span class="chip">→${esc(nm(r.target))}：${resWord(r.res)}</span>`).join('') : '';
      const sec = p.secret && p.secret.open ? `<div class="li" style="border:0;padding-bottom:0"><span class="src">秘密</span> ${esc(c.secret.confess.slice(0, 46))}…</div>` : '';
      const m = S.pl.notes[p.id] || '';
      return `<div class="card"><div class="who-row${p.alive ? '' : ' gone'}">${bust(p.id)}<div style="flex:1;min-width:0"><div class="nm">${esc(c.name)}<small>${esc(c.job)}${st2 ? '・' + st2 : ''}</small></div><div class="chips">${chips}</div>${cl || mine ? `<div class="chips">${cl}${mine}</div>` : ''}</div><div class="marks"><button data-id="${p.id}" data-m="h" class="h${m === 'h' ? ' on' : ''}" aria-label="白">白</button><button data-id="${p.id}" data-m="g" class="g${m === 'g' ? ' on' : ''}" aria-label="灰">灰</button><button data-id="${p.id}" data-m="w" class="w${m === 'w' ? ' on' : ''}" aria-label="黒">黒</button></div></div>${sec}</div>`;
    }).join('');
  }
  function nbEvidence() {
    let h = `<div class="promise"><b>この物語の約束</b>痕跡は嘘をつかない。物は嘘をつくことがある。人間は他人のことで嘘をつかない——ただし、秘密を隠すために自分の居場所は偽る。狼と狂人は何でも偽る。</div>${st.rulesNote ? `<div class="promise"><b>この物語のしくみ</b>${esc(st.rulesNote)}</div>` : ''}`;
    for (const N of S.nights.slice().reverse()) {
      const vic = N.target === 'first' ? st.first.name : N.target ? nm(N.target) : '—';
      h += `<div class="nh">${N.n === 0 ? '序幕の夜' : dayName(N.n) + 'の夜'} ― ${N.loc ? `${esc(locName(N.loc))}・${esc(vic)}${N.died ? '' : '（未遂）'}` : '襲われた者はいない'}</div>`;
      const rows = [];
      N.traces.forEach((t, i) => { if (S.pl.found.includes(N.n + '|' + i)) rows.push(`<div class="li mine"><b>${esc(SP.traceShort(st, t))}</b>　<span class="src">あなたが見た</span><br>${esc(SP.traceText(st, t))}</div>`); });
      for (const r of S.reports.filter(r => r.night === N.n && r.by !== 'you')) rows.push(`<div class="li"><b>${esc(SP.traceShort(st, r))}</b>　<span class="src">${esc(nm(r.by))}の報告</span></div>`);
      for (const f of S.figs.filter(f => f.night === N.n)) rows.push(`<div class="li">${esc(SP.fig(st, f.cat, f.val))}を見た　<span class="src">${esc(nm(f.by))}（集会で）</span></div>`);
      for (const f of S.pl.told.filter(f => f.night === N.n && f.kind === 'fig' && !S.figs.some(x => x.by === f.by && x.night === f.night && x.cat === f.cat))) rows.push(`<div class="li">${esc(SP.fig(st, f.cat, f.val))}を見た　<span class="src">${esc(nm(f.by))}（あなたに）</span></div>`);
      for (const s of N.sights.filter(s => s.by === 'you' && s.kind === 'fig')) rows.push(`<div class="li mine">${esc(SP.fig(st, s.cat, s.val))}を見た　<span class="src">あなた自身</span></div>`);
      if (N.ev && N.ev.seen && (N.ev.seen.includes('you') || N.ev.seen.includes('pub'))) rows.push(`<div class="li">${esc(ch(N.ev.owner).name)}の${esc(ch(N.ev.owner).belong)}が落ちていた　<span class="src">物は嘘をつくことがある</span></div>`);
      if (N.traces.some(t => t.gone) && N.goneTold) rows.push(`<div class="li"><span class="src">残りの痕跡は消えていた</span></div>`);
      h += rows.join('') || '<div class="li"><span class="src">まだ何もわからない</span></div>';
    }
    if (S.pl.clues.length) h += `<div class="nh">秘密の手がかり</div>` + S.pl.clues.map(c => `<div class="li">${esc(dayName(c.night) )}の夜、${esc(nm(c.who))}は${esc(locName(c.loc))}にいた${person(c.who).secret.open ? '（打ち明けた）' : ''}</div>`).join('');
    const its = S.pl.items.map(i => st.items.find(x => x.id === i));
    if (its.length) h += `<div class="nh">持ち物</div>` + its.map(it => `<div class="li"><b>${esc(it.name)}</b>${S.pl.used[it.id] ? '（使った）' : ''}<br><span class="src">${esc(it.desc)}</span></div>`).join('');
    return h;
  }
  function nbSay() {
    let h = '';
    const L = (S.pl.log || []).filter(x => x.k === 'night' || x.k === 'op' || x.k === 'about' || x.k === 'secret');
    const claims = S.claims.map(c => `<div class="li"><b>${esc(nm(c.by))}</b>　${esc(SP.roleName(st, c.role))}を名乗る（${dayName(c.day)}）${c.res.length ? '<br>' + c.res.map(r => `${esc(nm(r.target))}：${r.res === 'wolf' || r.res === 'fox' ? '<b>' + resWord(r.res) + '</b>' : resWord(r.res)}`).join('　') : ''}</div>`).join('');
    h += `<div class="nh">名乗り出た人</div>` + (claims || '<div class="li"><span class="src">まだいない</span></div>');
    h += `<div class="nh">聞いた話</div>`;
    const rows = L.slice().reverse().map(x => {
      if (x.k === 'night') { const T = x.T; const saw = T.saw.map(s => s.kind === 'fig' ? SP.fig(st, s.cat, s.val) + 'を見た' : `${nm(s.who)}を${E.near(st, T.loc).includes(s.loc) ? 'となりの' : ''}${locName(s.loc)}で見た`).join('、'); return `<div class="li"><b>${esc(nm(x.who))}</b>　<span class="src">${dayName(x.day)}</span><br>夜は${esc(locName(T.loc))}にいた。${esc(saw || '何も見ていない。')}</div>`; }
      if (x.k === 'op') return `<div class="li"><b>${esc(nm(x.who))}</b>　<span class="src">${dayName(x.day)}</span><br>${x.o && !x.o.low ? `${esc(nm(x.o.target))}が怪しい` : '決めかねている'}</div>`;
      if (x.k === 'secret') return `<div class="li"><b>${esc(nm(x.who))}</b>　<span class="src">秘密を打ち明けた</span><br>${esc(ch(x.who).secret.confess)}</div>`;
      return '';
    }).join('');
    const seen = S.pl.told.filter(t => t.kind === 'who').map(t => `<div class="li">${esc(nm(t.who))}が夜に${esc(locName(t.loc))}にいた　<span class="src">${t.by === 'you' ? 'あなたが見た' : esc(nm(t.by)) + 'の話'}</span></div>`).join('');
    h += rows || '<div class="li"><span class="src">まだ誰にも聞いていない</span></div>';
    if (seen) h += `<div class="nh">夜に出歩いていた人</div>` + seen;
    return h;
  }
  function nbVotes() {
    if (!S.votes.length) return '<div class="li"><span class="src">まだ投票は行われていない</span></div>';
    return S.votes.slice().reverse().map(v => `<div class="nh">${dayName(v.day)} ― ${esc(nm(v.out))}を${esc(st.lex.jail)}へ${v.lot ? '（くじ）' : ''}</div><table class="vt">${Object.entries(v.ballots).map(([a, b]) => `<tr><td>${esc(nm(a))}</td><td>→ ${esc(nm(b))}</td></tr>`).join('')}</table>`).join('');
  }

  /* ---------- help and options ---------- */
  function showRules(first) {
    return sheet(`<h3>遊び方</h3>
      <p>あなたは、人狼が紛れこんだ閉ざされた場所に居合わせた。毎晩、人狼はひとりを襲う。昼のあいだに手がかりを集め、集会で投票し、人狼をひとりずつ追放していく。人狼をすべて追放すれば解決。人狼の数が人間の数に並べば、もう止められない。</p>
      <div class="promise"><b>一、痕跡は嘘をつかない</b>現場に残った足跡・匂い・手の跡は、その夜に襲った人狼のもの。外れることはない。</div>
      <div class="promise"><b>二、物は嘘をつくことがある</b>現場に落ちていた持ち物は、本当に落としたのかもしれないし、狼が罪をなすりつけるために置いたのかもしれない。</div>
      <div class="promise"><b>三、人間は他人のことで嘘をつかない</b>人間が見たと言う人影や人の姿は本当のこと。ただし、秘密を隠すために自分がどこにいたかは偽ることがある。人狼と狂人は何でも偽る。夜の暗がりで見えるのは、自分のいる場所と、そのとなりの場所だけ（場所の札の「見える：」）。</div>
      ${st && st.rulesNote ? `<div class="promise"><b>この物語のしくみ</b>${esc(st.rulesNote)}</div>` : ''}
      <p><b>一日の流れ</b>　朝：夜の出来事 → 昼：場所を調べる・話を聞く（行動は1日3回、村人は4回）→ 集会：痕跡を示す・名乗る・聞き取り・名指し・呼びかけ・矛盾を突く → 投票 → 夜：役の力を使う。</p>
      <p><b>推理手帳</b>（右上の帳面）に、人物の特徴・痕跡・証言・投票が自動で書きとめられる。白・灰・黒の印は自分用のメモ。</p>
      <p><b>キー</b>　Enter・スペース：文章を送る　F：フルスクリーンの入／切</p>
      <div class="foot"><button class="btn pri" data-x>${first ? '幕を開ける' : '閉じる'}</button></div>`, box => box.querySelectorAll('[data-x]').forEach(b => b.onclick = () => closeSheet(true)));
  }
  // フルスクリーン（設定とFキー）。iPhone の Safari のように使えない環境では設定に出さない
  const FS = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  const isFS = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  function toggleFS(want) { const d = document, el = d.documentElement; try { if (want === undefined) want = !isFS(); if (!want && isFS()) (d.exitFullscreen || d.webkitExitFullscreen).call(d); else if (want && !isFS()) (el.requestFullscreen || el.webkitRequestFullscreen).call(el); } catch (err) {} }
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, () => document.querySelectorAll('.seg[data-k="fs"] button').forEach(b => b.classList.toggle('on', (b.dataset.v === '1') === isFS()))));
  function showOpts() {
    const seg = (k, vals) => `<div class="seg" data-k="${k}">${vals.map(([v, t]) => `<button data-v="${v}" class="${String(pref[k]) === String(v) ? 'on' : ''}">${t}</button>`).join('')}</div>`;
    sheet(`<h3>設定</h3>
      <div class="set-row"><span>文字の速さ</span>${seg('speed', [[1, 'ゆっくり'], [2, 'ふつう'], [3, 'はやい']])}</div>
      <div class="set-row"><span>アニメーション</span>${seg('anim', [[true, 'あり'], [false, 'なし']])}</div>
      <div class="set-row"><span>音楽</span><input type="range" class="vol" data-vol="bgm" min="0" max="100" step="5" value="${Math.round(SND.musicVol * 100)}" aria-label="音楽の音量"></div>
      <div class="set-row"><span>効果音<small>話し声も含む</small></span><input type="range" class="vol" data-vol="sfx" min="0" max="100" step="5" value="${Math.round(SND.sfxVol * 100)}" aria-label="効果音の音量"></div>
      ${FS() ? `<div class="set-row"><span>フルスクリーン</span><div class="seg" data-k="fs"><button data-v="1" class="${isFS() ? 'on' : ''}">オン</button><button data-v="0" class="${isFS() ? '' : 'on'}">オフ</button></div></div>` : ''}
      <div class="foot" style="justify-content:space-between;align-items:center">${S && G.scr === 'play' ? '<button class="btn" data-quit>この物語をやめてタイトルへ</button>' : '<span></span>'}<button class="btn pri" data-x>閉じる</button></div>`, box => {
      box.querySelectorAll('[data-x]').forEach(b => b.onclick = () => closeSheet());
      box.querySelectorAll('.seg').forEach(s => s.querySelectorAll('button').forEach(b => b.onclick = () => {
        const k = s.dataset.k, v = b.dataset.v;
        if (k === 'fs') { toggleFS(v === '1'); return; } else { pref[k] = v === 'true' ? true : v === 'false' ? false : +v; if (k === 'speed') pref.speedSet = true; }
        savePref(); s.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        document.body.classList.toggle('anim-off', !pref.anim);
      }));
      box.querySelectorAll('.vol').forEach(r => { r.style.setProperty('--p', r.value + '%'); r.oninput = () => { r.style.setProperty('--p', r.value + '%'); (r.dataset.vol === 'bgm' ? SND.setMusicVol : SND.setSfxVol)(r.value / 100); }; r.onchange = () => { if (r.dataset.vol === 'sfx') SND.page(); }; });
      const q = box.querySelector('[data-quit]'); if (q) q.onclick = () => { closeSheet(); save(); G.tut = false; buildTitle(); };
    });
  }
  $('btnHelp').onclick = () => showRules(false);
  $('btnOpt').onclick = showOpts;
  $('hbLogo').onclick = e => { e.preventDefault(); if (G.scr === 'play') save(); G.tut = false; buildTitle(); };

  /* ---------- resume ---------- */
  async function resume() {
    const sv = loadSave(); if (!sv) return;
    S = sv.S; if (!S.dv) { if (S.diff >= 2) S.diff++; S.dv = 2; } if (S.dv === 2) { S.diff = [0, 0, 1, 2, 4][S.diff]; S.dv = 3; }   // 2026-11-27：一段ずつ下がった（旧悪夢は役を伏せないまま悪夢で続ける）   // saves from before 中級 (2026-11-26): 上級・悪夢 moved up one
    st = withHero(sv.story, S.hero); S.req = S.req || { divine: {}, guard: null, hide: false, calls: {} }; G.storyId = st.id; G.diff = S.diff;
    scr('play'); palette(st); hud();
    const ph = S.phase;
    SND.music(ph === 'meeting' || ph === 'vote' ? 'meeting' : 'story', ph === 'night' ? .4 : 1);
    if (ph === 'prologue') return prologue();
    if (S.ghost && (ph === 'morning' || ph === 'invest')) return ghostDay();
    if (ph === 'morning') { S.phase = 'invest'; G.loc = (S.nights[S.nights.length - 1] || {}).loc || st.locs[0].id; return hub(); }
    if (ph === 'invest') { G.loc = (S.nights[S.nights.length - 1] || {}).loc || st.locs[0].id; return hub(); }
    if (ph === 'meeting' || ph === 'vote') { setScene(st.meetLoc || 'inn', false, true); setCast(live().map(p => p.id)); return debate(); }
    if (ph === 'night') return night();
    if (ph === 'end') return end();
  }

  /* ---------- wiring ---------- */
  $('tNew').onclick = () => { SND.unlock(); buildSelect(); };
  $('tCont').onclick = () => { SND.unlock(); resume(); };
  $('tHelp').onclick = () => showRules(false);
  $('selBack').onclick = buildTitle;
  $('setBack').onclick = buildSelect;
  $('setGo').onclick = () => { SND.unlock(); start(); };
  addEventListener('resize', () => { if (G.scr === 'play') { if (!PCQ.matches) document.documentElement.style.setProperty('--nbW', '0px'); else if (document.body.classList.contains('nb-open')) document.documentElement.style.setProperty('--nbW', '400px'); layoutDock(); if (S) renderRoster(); } });
  PCQ.addEventListener?.('change', () => layoutDock());
  const TUT = { G, $, esc, bust, wait, scr, palette, hud: null, setScene, setCast, say, sheet, closeSheet, pickPerson, pickOpt, wolfRun, renderRoster, setNb, renderNb, SND, ART, GUIDE_SVG,
    get S() { return S; }, set S(v) { S = v; }, get st() { return st; }, set st(v) { st = v; sceneKey = null; }, title: () => { G.tut = false; S = null; buildTitle(); }, select: () => { G.tut = false; S = null; buildSelect(); } };
  $('tTut').onclick = () => { SND.unlock(); G.tut = true; window.WLTutorial(TUT); };
  window.WLGame = { get S() { return S; }, get st() { return st; }, G, buildSelect, buildSetup, start, hub, meeting, debate, vote, night, end, setNb, resume, wolfRun };
  buildTitle();
})();
