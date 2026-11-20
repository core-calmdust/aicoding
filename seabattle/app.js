// 海戦ゲーム (seabattle/) — page logic. The player is always side 0, the AI side 1.
'use strict';
const E = window.SeaEngine, SB = window.SeaBoard;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const STORE = 'aicoding-seabattle', SUPPORTED = ['ja', 'en'], DESIGNS = ['abyss', 'chart', 'radar', 'dawn'];
const sleep = ms => new Promise(r => setTimeout(r, ms));

function detectLang() { const n = (navigator.language || 'ja').toLowerCase(); return n.startsWith('ja') ? 'ja' : 'en'; }
let S = { rule: 'classic', adj: false, level: 5, first: 'you', design: 'abyss', sound: true, lang: null };
const tac = () => !!G && G.rule === 'tactics';
const skillOf = s => E.TYPES[s.t].skill;
let G = null;       // { phase: 'deploy' | 'battle' | 'over', my: ships, st, level, view: 'enemy' | 'own', hint, evals, busy, resigned, first }
let saved = null;
try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); if (saved && saved.settings) Object.assign(S, saved.settings); } catch (e) {}
try { if (localStorage.getItem('atlas-sfx') === '0') S.sound = false; } catch (e) {}
let LANG = SUPPORTED.includes(S.lang) ? S.lang : detectLang();
window.SeaApp = { lang: () => LANG };

function t(k, v) { let s = (SEA_I18N[LANG] && SEA_I18N[LANG][k]); if (s == null) s = SEA_I18N.en[k]; if (s == null) return k; if (v && typeof s === 'string') for (const x in v) s = s.replace('{' + x + '}', v[x]); return s; }
const tier = lv => t('tier')[Math.min(4, (lv - 1) / 4 | 0)];
const PCQ = matchMedia('(hover: hover) and (pointer: fine)');

// ---------- sound (Web Audio, no files) ----------
let AC = null;
function ac() { if (!S.sound) return null; try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { return null; } return document.hidden ? null : AC; }
function tone(f0, f1, dur, type, vol, when) { const a = ac(); if (!a) return; const o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + (when || 0); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol || .2, t0 + .012); g.gain.exponentialRampToValueAtTime(.0008, t0 + dur); o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + .03); }
function noise(dur, freq, q, vol, when, type) { const a = ac(); if (!a) return; const n = a.sampleRate * dur | 0, b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.2); const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); s.buffer = b; f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1; g.gain.value = vol || .3; s.connect(f).connect(g).connect(a.destination); s.start(a.currentTime + (when || 0)); }
const SFX = {
  lock: () => tone(1250, 1180, .16, 'sine', .09),
  miss: () => { noise(.55, 1700, .7, .22); tone(420, 190, .3, 'sine', .07); },
  hit: () => { noise(.5, 240, .6, .55, 0, 'lowpass'); tone(150, 42, .45, 'triangle', .32); },
  sunk: () => { noise(.9, 180, .5, .6, 0, 'lowpass'); tone(120, 30, .9, 'triangle', .36); tone(660, 330, .5, 'sine', .08, .12); },
  place: () => tone(520, 640, .07, 'triangle', .1),
  bad: () => tone(200, 150, .14, 'square', .05),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, f, .32, 'triangle', .14, i * .13)),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, f * .97, .42, 'sine', .14, i * .2)),
  ping: () => { tone(1480, 1460, .5, 'sine', .08); tone(1480, 1460, .5, 'sine', .035, .22); },
};
const sfx = k => { try { SFX[k] && SFX[k](); } catch (e) {} };
document.addEventListener('visibilitychange', () => { if (AC) { try { document.hidden ? AC.suspend() : AC.resume(); } catch (e) {} } });

// ---------- save ----------
function save() {
  const d = { settings: Object.assign({}, S, { lang: LANG }) };
  if (G) d.game = { phase: G.phase, my: G.my, foe: G.st ? G.st.sides[1].ships : null, acts: G.st ? G.st.acts : [], first: G.first, draft: G.draft || null, rule: G.rule, adj: G.adj, level: G.level, evals: G.evals, resigned: G.resigned };
  try { localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) {}
}
function restore() {
  const g = saved && saved.game;
  const rule = g && E.RULES.includes(g.rule) ? g.rule : 'classic', T = rule === 'tactics';
  if (g && Array.isArray(g.my)) g.my.forEach((s, i) => { if (s && s.t == null) s.t = i; });
  if (g && g.phase === 'draft') return false;      // a draft in progress starts over
  if (!g || !E.validFleet(g.my, false, T)) return false;
  G = { phase: 'deploy', my: g.my, st: null, level: g.level || S.level, rule, adj: !!g.adj, view: 'own', hint: null, evals: [], busy: false, resigned: false, first: g.first | 0, armed: null, draft: g.draft || null };
  if (g.phase === 'deploy' || !g.foe || !E.validFleet(g.foe, false, T) || !E.validFleet(g.my, false, T)) return true;
  G.st = E.newGame({ rule: G.rule, adj: G.adj, fleets: [g.my, g.foe], first: G.first });
  for (const a of g.acts || (g.log || []).map(c => ({ cell: c }))) if (!E.act(G.st, a)) break;
  G.evals = Array.isArray(g.evals) ? g.evals.slice(0, G.st.log.length + 1) : [];
  G.phase = 'battle'; G.view = 'enemy';
  if (g.resigned) { G.st.winner = 1; G.resigned = true; }
  if (G.st.winner >= 0) G.phase = 'over';
  return true;
}

// ---------- rendering ----------
function boardOpts(which) {
  if (which === 'own') { const sd = G.st ? G.st.sides[0] : null; return { ships: G.my, show: i => (sd && sd.sunk[i]) ? 'sunk' : (drag && drag.i === i ? (drag.bad ? 'ghost bad' : 'ghost') : 'own'), shots: sd ? sd.shots : null, last: lastOn(0), scans: G.st ? G.st.scans[1] : null, mines: sd ? sd.mines : null }; }
  const sd = G.st.sides[1];
  return { ships: sd.ships, show: i => sd.sunk[i] ? 'sunk' : (G.phase === 'over' ? 'ghost' : ''), shots: G.phase === 'over' ? sd.shots : E.view(sd).shots, heat: G.hint ? G.hint.p : null, best: G.hint ? G.hint.best : -1, last: lastOn(1), scans: G.st.scans[0], glow: G.armed != null && hoverCell >= 0 && G.view === 'enemy' ? E.footprint(skillOf(G.my[G.armed]), hoverCell) : null, fogged: sd.fog > 0 };
}
function lastOn(sideIdx) { if (!G.st) return -1; for (let i = G.st.log.length - 1; i >= 0; i--) { const m = G.st.log[i]; if (m.by !== sideIdx && !m.skill) return m.cell; if (m.by === sideIdx) break; } return -1; }
function renderBoards() {
  const v = G.phase === 'deploy' || G.phase === 'draft' ? 'own' : G.view;
  SB.draw($('#bsvg'), boardOpts(v));
  document.body.classList.toggle('view-own', v === 'own');
  $('#bTitle').textContent = t(v === 'own' ? 'own' : 'enemy');
  if (G.st) { const o = boardOpts(v === 'own' ? 'enemy' : 'own'); o.mini = true; o.heat = null; o.best = -1; o.glow = null; SB.draw($('#msvg'), o); $('#miniCap').textContent = t(v === 'own' ? 'enemy' : 'own'); }
  let sub = '';
  if (G.st && G.phase === 'battle' && G.rule === 'salvo') { const q = G.st.left; for (let i = 0; i < q; i++) sub += '<b></b>'; }
  $('#bSub').innerHTML = sub;
}
function renderFleet() {
  if (!G.st) return;
  const row = (el, name, side, mine) => {
    el.querySelector('.fh b').textContent = name;
    el.querySelector('.fh span').textContent = t('left', { n: side.afloat });
    el.querySelector('.pips').innerHTML = side.ships.map((s, i) => `<span class="pip${side.sunk[i] ? ' dead' : ''}" title="${t('ship.' + s.t)}">${Array.from({ length: s.len }, (_, k) => `<i${mine && k < side.hitsOn[i] ? ' class="x"' : ''}></i>`).join('')}</span>`).join('');
  };
  row($('#flFoe'), 'AI Lv.' + G.level, G.st.sides[1], false);
  $('#flFoe .cds').innerHTML = G.st.cd ? G.st.sides[1].ships.map((s, i) => { const k = skillOf(s); if (!k) return ''; const c = G.st.cd[1][i], dead = !E.skillLive(G.st, 1, i); return `<span class="${dead ? 'x' : c === 0 ? 'r' : ''}">${t('sk.' + k)}${dead || c === 0 ? '' : ' ' + c}</span>`; }).join('') : '';
  row($('#flMe'), t('you'), G.st.sides[0], true);
  if ($('#fleetOverlay').classList.contains('show')) renderFleetSheet();
  $('#flFoe').classList.toggle('turn', G.phase === 'battle' && G.st.turn === 1);
  $('#flMe').classList.toggle('turn', G.phase === 'battle' && G.st.turn === 0);
}
function renderStatus(msg) {
  let s = msg;
  if (!s) {
    if (G.phase === 'draft') s = t(G.draft.turn === 0 ? 'st.draft' : 'st.draftAi');
    else if (G.phase === 'deploy') s = t('st.deploy');
    else if (G.phase === 'over') s = G.resigned ? t('st.resign') : t(G.st.winner === 0 ? 'st.win' : 'st.lose');
    else if (G.st.turn === 0 && G.armed != null) s = t('sk.aim.' + skillOf(G.my[G.armed]));
    else if (G.st.turn === 0) s = G.hint ? t('hint.best', { c: E.cellName(G.hint.best), p: Math.round(G.hint.p[G.hint.best] * 100) }) : (G.rule === 'salvo' ? t('st.youN', { n: G.st.left }) : t('st.you'));
    else s = t('st.ai');
  }
  $('#status').textContent = s;
}
function renderKifu() {
  const k = $('#kifu');
  if (!G.st || !G.st.log.length) { k.innerHTML = `<div class="empty">${t('kifu.empty')}</div>`; return; }
  k.innerHTML = G.st.log.map((m, i) => m.rest ? `<span class="k"><em>${i + 1}</em><i class="s${m.by}"></i><span class="s">${t('log.rest')}</span></span>` : m.skill ? `<span class="k"><em>${i + 1}</em><i class="s${m.by}"></i><span class="s">${t('sk.' + m.skill)}</span>${m.blk ? ` <span class="x">${t('log.blk')}</span>` : ''} ${m.blk || m.cell < 0 ? '' : m.skill === 'torpedo' || m.skill === 'radar' ? 'ABCDEFGHIJ'[m.cell % 10] : m.skill === 'scout' || m.skill === 'rtorpedo' || m.skill === 'listen' ? String((m.cell / 10 | 0) + 1) : E.cellName(m.cell)}${(m.skill === 'sonar' || m.skill === 'scout' || m.skill === 'radar' || m.skill === 'probe' || m.skill === 'sweep' || m.skill === 'flare' || m.skill === 'echo' || m.skill === 'diag' || m.skill === 'cross' || m.skill === 'listen' || m.skill === 'bracket') && !m.blk && m.k != null ? ' → ' + m.k : ''}</span>` : `<span class="k"><em>${i + 1}</em><i class="s${m.by}"></i>${m.via === 'counter' ? `<span class="s">${t('sk.counter')}</span> ` : ''}${E.cellName(m.cell)} ${m.sunk >= 0 ? `<span class="s">${t('log.sunk')}</span>` : m.by === 0 && m.fog && G.st.sides[1].fogged[m.cell] ? t('log.fog') : m.mine ? `<span class="x">${t('log.mine')}</span>` : m.dent ? `<span class="x">${t('log.dent')}</span>` : m.hit ? `<span class="x">${t('log.hit')}</span>` : t('log.miss')}</span>`).join('');
  k.scrollTop = k.scrollHeight;
}
function renderEval() {
  const ev = G.evals || [], n = G.st ? G.st.log.length : 0; let p = null;
  for (let i = Math.min(n, ev.length - 1); i >= 0 && p == null; i--) if (ev[i] != null) p = ev[i];
  if (G.phase === 'over') p = G.st.winner === 0 ? 1 : 0;
  $('#evalText').textContent = p == null ? t('eval.none') : t('eval.you', { p: Math.round(p * 100) });
  $('#evalFill').style.width = (p == null ? 50 : p * 100) + '%';
  const pts = []; let last = .5; const N = Math.max(n, 1);
  for (let i = 0; i <= n; i++) { if (ev[i] != null) last = ev[i]; pts.push((i / N * 300).toFixed(1) + ',' + (4 + (1 - last) * 44).toFixed(1)); }
  $('#graph').innerHTML = `<path d="M0 26H300" stroke="rgba(255,255,255,.22)" stroke-width="1" stroke-dasharray="3 4" vector-effect="non-scaling-stroke"/>` + (pts.length > 1 ? `<polyline points="${pts.join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>` : '');
}
function renderButtons() {
  const live = G.phase === 'battle';
  $('#btnResign').disabled = !live;
  $('#btnHint').disabled = !(live && G.st.turn === 0 && !G.busy);
  $('#btnHint').classList.toggle('on', !!G.hint);
  $('#btnSound').classList.toggle('off', !S.sound);
}
function render(msg) {
  document.body.classList.toggle('placing', G.phase === 'deploy' || G.phase === 'draft');
  document.body.classList.toggle('drafting', G.phase === 'draft');
  DESIGNS.forEach(d => document.body.classList.toggle('bd-' + d, S.design === d));
  document.body.classList.toggle('tac', tac());
  renderBoards(); renderFleet(); renderStatus(msg); renderKifu(); renderEval(); renderButtons(); renderSkills(); renderDraft();
}
const SK_ICON = {
  ring: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx=".8" stroke-dasharray="1.5 1.5"/></svg>',
  allout: '<svg viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
  guided: '<svg viewBox="0 0 24 24"><path d="M4 20l9-9"/><path d="M13 5l6 0 0 6-6-6z"/><circle cx="5" cy="19" r="1.5"/></svg>',
  dtorpedo: '<svg viewBox="0 0 24 24"><path d="M8 21V7M16 21V7"/><path d="M5 10l3-4 3 4M13 10l3-4 3 4"/></svg>',
  listen: '<svg viewBox="0 0 24 24"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/></svg>',
  cross: '<svg viewBox="0 0 24 24"><path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="3"/></svg>',
  bracket: '<svg viewBox="0 0 24 24"><rect x="1.5" y="9.5" width="5" height="5" rx=".8"/><rect x="17.5" y="9.5" width="5" height="5" rx=".8"/><path d="M10 12h4M12 10v4"/></svg>',
  depth: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/><path d="M12 8.8V7" /></svg>',
  plate: '<svg viewBox="0 0 24 24"><path d="M3 15h18l-2.5 4h-13z"/><path d="M6 15V9h12v6"/><path d="M9 9V6h6v3"/></svg>',
  diag: '<svg viewBox="0 0 24 24"><rect x="2.5" y="2.5" width="5" height="5" rx=".8"/><rect x="9.5" y="9.5" width="5" height="5" rx=".8"/><rect x="16.5" y="16.5" width="5" height="5" rx=".8"/><path d="M16 4h4v4"/></svg>',
  echo: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="9" stroke-dasharray="2 2"/></svg>',
  lance: '<svg viewBox="0 0 24 24"><rect x="9.5" y="2" width="5" height="4.2" rx=".8"/><rect x="9.5" y="7.3" width="5" height="4.2" rx=".8"/><rect x="9.5" y="12.6" width="5" height="4.2" rx=".8"/><rect x="9.5" y="17.9" width="5" height="4.2" rx=".8"/></svg>',
  rapid: '<svg viewBox="0 0 24 24"><path d="M4 8h9M4 12h12M4 16h9"/><path d="M15 6l5 6-5 6"/></svg>',
  intel: '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  flare: '<svg viewBox="0 0 24 24"><path d="M12 2v5"/><circle cx="12" cy="11" r="3"/><path d="M5 16l2.5-2M19 16l-2.5-2M12 15v2"/><rect x="6" y="17" width="12" height="4" rx="1"/></svg>',
  ward: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>',
  suppress: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M5 5l14 14"/></svg>',
  sweep: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M12 6.5v2M12 15.5v2M6.5 12h2M15.5 12h2"/></svg>',
  strafe: '<svg viewBox="0 0 24 24"><rect x="9.5" y="9.5" width="5" height="5" rx=".8"/><rect x="3" y="3" width="5" height="5" rx=".8"/><rect x="16" y="3" width="5" height="5" rx=".8"/><rect x="3" y="16" width="5" height="5" rx=".8"/><rect x="16" y="16" width="5" height="5" rx=".8"/></svg>',
  rtorpedo: '<svg viewBox="0 0 24 24"><path d="M3 12h15"/><path d="M14 7l5 5-5 5"/><path d="M3 8v8"/></svg>',
  probe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><rect x="9.5" y="2" width="5" height="4.5" rx=".8"/><rect x="9.5" y="17.5" width="5" height="4.5" rx=".8"/><rect x="2" y="9.5" width="4.5" height="5" rx=".8"/><rect x="17.5" y="9.5" width="4.5" height="5" rx=".8"/></svg>',
  barrage: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="5" height="5" rx=".8"/><rect x="9.5" y="3" width="5" height="5" rx=".8"/><rect x="16" y="3" width="5" height="5" rx=".8"/><rect x="3" y="9.5" width="5" height="5" rx=".8"/><rect x="9.5" y="9.5" width="5" height="5" rx=".8"/><rect x="16" y="9.5" width="5" height="5" rx=".8"/><rect x="3" y="16" width="5" height="5" rx=".8"/><rect x="9.5" y="16" width="5" height="5" rx=".8"/><rect x="16" y="16" width="5" height="5" rx=".8"/></svg>',
  radar: '<svg viewBox="0 0 24 24"><path d="M12 3v18"/><path d="M5 6a9 9 0 0 1 14 0M7.5 9a5.5 5.5 0 0 1 9 0"/><circle cx="12" cy="14" r="1.6"/><path d="M8 21h8"/></svg>',
  mine: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="5.5"/><path d="M12 4v3.5M12 18.5V22M3 13h3.5M17.5 13H21M5.6 6.6l2.5 2.5M15.9 16.9l2.5 2.5M18.4 6.6l-2.5 2.5M8.1 16.9l-2.5 2.5"/></svg>',
  rocket: '<svg viewBox="0 0 24 24"><rect x="2.5" y="9" width="5.5" height="6" rx="1"/><rect x="9.25" y="9" width="5.5" height="6" rx="1"/><rect x="16" y="9" width="5.5" height="6" rx="1"/><path d="M5 6l1-2M12 6V3.5M19 6l-1-2"/></svg>',
  repair: '<svg viewBox="0 0 24 24"><path d="M14.5 4a4.5 4.5 0 0 0-4.2 6.1L3.5 16.9a1.8 1.8 0 0 0 2.6 2.6l6.8-6.8A4.5 4.5 0 0 0 19 8.5l-2.7 2.7-2.6-.6-.6-2.6L15.8 5.3A4.5 4.5 0 0 0 14.5 4z"/></svg>',
  smoke: '<svg viewBox="0 0 24 24"><path d="M5 15a4 4 0 0 1 3-6.5A5 5 0 0 1 17.5 9 3.5 3.5 0 0 1 19 15.8"/><path d="M4 19h16M7 22h10"/></svg>',
  scout: '<svg viewBox="0 0 24 24"><path d="M3 12h18"/><path d="M12 8l-7 4 7 1 7-1z"/><path d="M10 16h4"/><path d="M3 5h18M3 19h4M17 19h4"/></svg>',
  twin: '<svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="3.2"/><circle cx="16.5" cy="12" r="3.2"/><path d="M8 4v3M16.5 4v3M8 17v3M16.5 17v3"/></svg>',
  command: '<svg viewBox="0 0 24 24"><path d="M6 21V3"/><path d="M6 4h11l-2.5 3.5L17 11H6"/><path d="M12 15l2 2 4-4"/></svg>',
  jam: '<svg viewBox="0 0 24 24"><path d="M12 13v8"/><circle cx="12" cy="11" r="2"/><path d="M8 7a5.5 5.5 0 0 0 0 8M16 7a5.5 5.5 0 0 1 0 8"/><path d="M4 4l16 16"/></svg>',
  bomb: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><rect x="9" y="16" width="6" height="6" rx="1"/><rect x="2" y="9" width="6" height="6" rx="1"/><rect x="16" y="9" width="6" height="6" rx="1"/></svg>',
  volley: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.2"/><rect x="13" y="4" width="7" height="7" rx="1.2"/><rect x="4" y="13" width="7" height="7" rx="1.2"/><rect x="13" y="13" width="7" height="7" rx="1.2"/></svg>',
  torpedo: '<svg viewBox="0 0 24 24"><path d="M12 21V6"/><path d="M7 10l5-5 5 5"/><path d="M8 21h8"/></svg>',
  sonar: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2"/><path d="M7.200 7.200a6.800 6.800 0 0 0 0 9.600M16.800 7.200a6.800 6.800 0 0 1 0 9.600M4 4a11.300 11.300 0 0 0 0 16M20 4a11.300 11.300 0 0 1 0 16"/></svg>',
};
function renderSkills() {
  const el = $('#skillCard'); if (!tac() || !G.st) { el.innerHTML = ''; return; }
  const live = G.phase === 'battle', mine = G.st.turn === 0 && !G.busy;
  el.innerHTML = G.st.sides[0].ships.map((s, i) => { const k = skillOf(s); if (!k) return ''; const c = G.st.cd[0][i], dead = !E.skillLive(G.st, 0, i), calm = (k === 'twin' || k === 'rapid') && E.calmOn(G.st, 0), ready = !dead && !calm && c === 0;
    return `<button class="sk ${dead ? 'lost' : ready ? 'ready' : 'wait'}${G.armed === i ? ' armed' : ''}" data-i="${i}" ${ready && live && mine ? '' : 'disabled'} title="${t('ship.' + s.t)} — ${t('sk.' + k + '.d')}">${SK_ICON[k]}<b>${t('sk.' + k)}</b><small>${dead ? t('sk.lost') : calm ? t('sk.calmed') : ready ? t('sk.ready') : t('sk.wait', { n: c })}</small></button>`; }).join('');
}
// the pick draft (タクティクス): 10 ships on the table, picked in turn A B B A …; then the fleet is arranged as usual
function shipDesc(T) { return T.skill ? t('sk.' + T.skill) + '：' + t('sk.' + T.skill + '.d') + ' · ' + t('sl.cd', { n: T.cd }) : T.armor ? t('sk.armor') + '：' + t(T.armor > 1 ? 'sk.armor2.d' : 'sk.armor.d') : T.aa ? t('sk.aa') + '：' + t('sk.aa.d') : T.decoy ? t('sk.decoy') + '：' + t('sk.decoy.d') : T.counter ? t('sk.counter') + '：' + t('sk.counter.d') : T.calm ? t('sk.calm') + '：' + t('sk.calm.d') : T.plunder ? t('sk.plunder') + '：' + t('sk.plunder.d') : T.net ? t('sk.net') + '：' + t('sk.net.d') : T.pursuit ? t('sk.pursuit') + '：' + t('sk.pursuit.d') : T.haste ? t('sk.haste') + '：' + t('sk.haste.d') : T.trace ? t('sk.trace') + '：' + t('sk.trace.d') : T.cost === 0 ? t('sk.free') + '：' + t('sk.free.d') : T.rally ? t('sk.rally') + '：' + t('sk.rally.d') : T.hospital ? t('sk.hospital') + '：' + t('sk.hospital.d') : t('dr.none'); }
function openShipList() {   // every type, cheapest first, with the full text — for planning a fleet
  $('#shipList').innerHTML = E.TYPES.map((T, k) => [T, k]).sort((a, b) => a[0].cost - b[0].cost || a[1] - b[1]).map(([T, k]) => `<div class="sl"><span class="pip">${'<i></i>'.repeat(T.len)}</span><div><b>${t('ship.' + k)}</b><small>${shipDesc(T)}</small></div><span class="dc">${T.cost}</span></div>`).join('');
  $('#shipsOverlay').classList.add('show');
}
$('#btnShipList').onclick = openShipList; $('#btnShipsClose').onclick = () => $('#shipsOverlay').classList.remove('show');
$('#shipsOverlay').addEventListener('click', e => { if (e.target.id === 'shipsOverlay') $('#shipsOverlay').classList.remove('show'); });
let pickShut = -1, pickTab = 0;   // (pickTab: the role tab open in the pick sheet)   // the draft pick number at which the player closed the pick sheet (it opens itself on each of their turns)
const ROLE_OF = k => E.ROLE.atk.includes(k) ? 0 : E.ROLE.info.includes(k) ? 1 : E.ROLE.def.includes(k) ? 2 : 3;
function renderDraft() {
  if (G.phase !== 'draft') { $('#pickOverlay').classList.remove('show'); return; }
  const d = G.draft, mine = d.turn === 0 && !G.busy, f = d.f || E.POOL;
  $('#drTurn').textContent = t(d.turn === 0 ? 'dr.you' : 'dr.ai'); $('#drTurn').classList.toggle('me', d.turn === 0);
  // the side card: the field at a glance (tap → the pick sheet)
  $('#drRows').innerHTML = `<button id="btnPick" class="${mine ? 'go' : ''}">${t('dr.open')}</button><div class="drf">${E.TYPES.map((T, k) => k).filter(k => f[k]).sort((a, b) => ROLE_OF(a) - ROLE_OF(b) || E.TYPES[a].cost - E.TYPES[b].cost).map(k => `<span class="g${ROLE_OF(k)}${d.pool[k] ? '' : ' out'}">${t('ship.' + k)}</span>`).join('')}</div>`;
  const who = (p, name) => `<div class="dw${d.turn === p ? ' turn' : ''}"><div class="fh"><b>${name}</b>${d.picks[p].length ? `<button class="flv" data-p="${p}">${t('fv.see')}</button>` : ''}<span>${t('dr.left', { c: E.draftLeft(d, p) })}</span></div><div class="pips">${d.picks[p].map(k => `<span class="pip" title="${t('ship.' + k)}">${'<i></i>'.repeat(E.TYPES[k].len)}</span>`).join('') || '<span class="none">—</span>'}</div></div>`;
  $('#drWho').innerHTML = who(1, 'AI Lv.' + G.level) + who(0, t('you'));
  $('#btnDrStop').disabled = !(E.draftCanStop(d, 0) && !G.busy);
  // the pick sheet: one card per type on the table, by role, cheapest first
  const card = k => { const T = E.TYPES[k], taken = d.picks[0].includes(k), can = mine && E.draftCan(d, 0, k);
    const why = taken ? t('pk.taken') : !d.pool[k] ? t('pk.gone') : T.cost > E.draftLeft(d, 0) ? t('pk.cost') : d.picks[0].length >= E.MAXSHIPS ? t('pk.full') : '';
    const kind = T.skill ? t('pk.active', { n: T.cd }) : PASSIVE_T(T) ? t('pk.passive') : t('pk.none');
    return `<div class="pc g${ROLE_OF(k)}${can ? '' : ' off'}${taken ? ' taken' : ''}"><div class="pt"><span class="pcost">${T.cost}</span><b>${t('ship.' + k)}</b><em>×${d.pool[k]}</em></div>
      <div class="pa${reachSvg(T.skill) ? ' wide' : ''}">${reachSvg(T.skill)}<div class="pship">${SB.shipSvg(k, T.len)}<span class="plen">${'<i></i>'.repeat(T.len)}<b>${t('pk.len', { n: T.len })}</b></span></div></div>
      <div class="ps">${T.skill ? `<i class="ic">${SK_ICON[T.skill] || ''}</i>` : ''}<b>${shipSkillName(T)}</b><small>${kind}</small></div>
      <p>${shipSkillText(T)}</p>
      <button data-k="${k}" ${can ? '' : 'disabled'}>${can ? t('dr.pick') : why || t('dr.pick')}</button></div>`; };
  $('#pickHead').innerHTML = `<b>${t(d.turn === 0 ? 'dr.you' : 'dr.ai')}</b><span>${t('pk.left', { c: E.draftLeft(d, 0), n: d.picks[0].length, m: E.MAXSHIPS })}</span>${d.picks[1].length ? `<button class="flv" data-p="1">${t('fv.foeBtn', { n: d.picks[1].length })}</button>` : ''}`;
  if ($('#fleetOverlay').classList.contains('show')) renderFleetSheet();
  const groups = [0, 1, 2, 3].map(g => E.TYPES.map((T, k) => k).filter(k => f[k] && ROLE_OF(k) === g).sort((a, b) => E.TYPES[a].cost - E.TYPES[b].cost || a - b));
  if (!groups[pickTab] || !groups[pickTab].length) pickTab = groups.findIndex(g => g.length);
  $('#pickTabs').innerHTML = groups.map((ks, g) => ks.length ? `<button class="g${g}${g === pickTab ? ' on' : ''}" data-g="${g}">${t('dr.g' + g)}<em>${ks.length}</em></button>` : '').join('');
  $('#pickGrid').innerHTML = `<div class="pg">${groups[pickTab].map(card).join('')}</div>`;
  $('#btnPickStop').disabled = !(E.draftCanStop(d, 0) && !G.busy);
  if (mine && pickShut !== d.n) $('#pickOverlay').classList.add('show');
}
// the reach of a skill, drawn on a 7×7 window of the sea around the aimed square (E5): attack squares warm, read squares cool
const SCAN_K = { sonar: 1, scout: 1, radar: 1, sweep: 1, echo: 1, diag: 1, cross: 1, flare: 1 };
function reachSvg(skill) {
  if (!skill || E.NOAIM[skill]) return '';
  const at = 44, fp = new Set(E.footprint(skill, at)), atk = new Set(), scan = new Set(), maybe = new Set();
  const path = new Set(), TORP = { torpedo: 1, rtorpedo: 1, dtorpedo: 1 };
  if (SCAN_K[skill]) fp.forEach(c => scan.add(c)); else if (TORP[skill]) fp.forEach(c => path.add(c)); else fp.forEach(c => atk.add(c));
  if (skill === 'probe') E.footprint('bomb', at).filter(c => c !== at).forEach(c => scan.add(c));
  if (skill === 'depth') E.footprint('bomb', at).filter(c => c !== at).forEach(c => maybe.add(c));
  if (skill === 'twin') maybe.add(45);
  if (skill === 'guided') maybe.add(45);
  if (skill === 'bracket') scan.add(at);
  const r0 = 1, c0 = 1, n = 7, z = 12; let h = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const k = (r0 + r) * 10 + c0 + c; const cls = atk.has(k) ? 'a' : scan.has(k) ? 's' : path.has(k) ? 'p' : maybe.has(k) ? 'm' : '';
    h += `<rect x="${c * z + 1}" y="${r * z + 1}" width="${z - 2}" height="${z - 2}" rx="2" class="${cls}"/>`; }
  const ar = (at / 10 | 0) - r0, ac = at % 10 - c0;
  h += `<rect x="${ac * z + .5}" y="${ar * z + .5}" width="${z - 1}" height="${z - 1}" rx="2.4" class="aim"/>`;
  if (skill === 'torpedo' || skill === 'dtorpedo') h += `<path d="M${ac * z + 6} ${n * z - 2}v-10m-3 3l3-3 3 3" class="arw"/>` + (skill === 'dtorpedo' ? `<path d="M${ac * z + 18} ${n * z - 2}v-10m-3 3l3-3 3 3" class="arw"/>` : '');
  if (skill === 'rtorpedo') h += `<path d="M2 ${ar * z + 6}h10m-3-3l3 3-3 3" class="arw"/>`;
  return `<svg class="reach" viewBox="0 0 ${n * z} ${n * z}">${h}</svg>`;
}
// the fleet sheet: either side's ships as cards (in the draft: what has been picked; in battle: state, cooldowns, sinkings)
function openFleet(p) { $('#fleetOverlay').classList.add('show'); renderFleetSheet(p); }   // (both sides, the opponent on top; opening from one side scrolls to it)
function renderFleetSheet(scrollTo) {
  if (!G) return;
  const inBattle = !!G.st;
  const listOf = p => inBattle ? G.st.sides[p].ships.map((s, i) => ({ k: s.t, i })) : (G.draft ? G.draft.picks[p] : []).map(k => ({ k, i: -1 }));
  const card = p => ({ k, i }) => { const T = E.TYPES[k], sd = inBattle ? G.st.sides[p] : null, sunk = sd && sd.sunk[i];
    let st = inBattle ? '' : `<div class="pst">${t('fv.picked')}</div>`, cls = '';
    if (inBattle) { if (sunk && !(T.skill && E.skillLive(G.st, p, i))) { st = `<div class="pst x">${t('fv.sunk')}</div>`; cls = ' sunk'; }
      else if (T.skill) { const c = G.st.cd[p][i]; st = `<div class="pst${c === 0 ? ' r' : ''}">${sunk ? t('fv.sunk') + ' · ' : ''}${c === 0 ? t('sk.ready') : t('sk.wait', { n: c })}</div>`; if (sunk) cls = ' sunk'; }
      else st = `<div class="pst">${p === 0 ? t('fv.hits', { n: sd.hitsOn[i], m: T.len }) : t('fv.afloat')}</div>`; }
    const kind = T.skill ? t('pk.active', { n: T.cd }) : PASSIVE_T(T) ? t('pk.passive') : t('pk.none');
    return `<div class="pc g${ROLE_OF(k)}${cls}"><div class="pt"><span class="pcost">${T.cost}</span><b>${t('ship.' + k)}</b></div>
      <div class="pa${reachSvg(T.skill) ? ' wide' : ''}">${reachSvg(T.skill)}<div class="pship">${SB.shipSvg(k, T.len)}<span class="plen">${'<i></i>'.repeat(T.len)}<b>${t('pk.len', { n: T.len })}</b></span></div></div>
      <div class="ps">${T.skill ? `<i class="ic">${SK_ICON[T.skill] || ''}</i>` : ''}<b>${shipSkillName(T)}</b><small>${kind}</small></div>
      <p>${shipSkillText(T)}</p>${st}</div>`; };
  const sec = (q, name) => { const L = listOf(q), left = inBattle ? t('left', { n: G.st.sides[q].afloat }) : t('dr.left', { c: E.draftLeft(G.draft, q) });
    return `<section class="fsec" id="fsec${q}"><h3>${name}<small>${L.length ? left : ''}</small></h3>${L.length ? `<div class="pg">${L.map(card(q)).join('')}</div>` : `<p class="none">${t('fv.none')}</p>`}</section>`; };
  $('#fleetGrid').innerHTML = sec(1, t('fv.foe', { n: 'AI Lv.' + G.level })) + sec(0, t('fv.me'));
  if (scrollTo != null) { const el = $('#fsec' + scrollTo); if (el) $('#fleetGrid').scrollTop = el.offsetTop - $('#fleetGrid').offsetTop - 8; }
}
document.addEventListener('click', e => { const b = e.target.closest('.flv'); if (b) { e.stopPropagation(); openFleet(+b.dataset.p); } });
$('#btnFleetClose').onclick = () => $('#fleetOverlay').classList.remove('show');
$('#fleetOverlay').addEventListener('click', e => { if (e.target.id === 'fleetOverlay') $('#fleetOverlay').classList.remove('show'); });
const PASSIVE_T = T => !!(T.armor || T.aa || T.decoy || T.counter || T.rally || T.hospital || T.trace || T.pursuit || T.haste || T.net || T.plunder || T.calm);
function shipSkillName(T) { return T.skill ? t('sk.' + T.skill) : T.armor ? t('sk.armor') : T.aa ? t('sk.aa') : T.decoy ? t('sk.decoy') : T.counter ? t('sk.counter') : T.calm ? t('sk.calm') : T.plunder ? t('sk.plunder') : T.net ? t('sk.net') : T.pursuit ? t('sk.pursuit') : T.haste ? t('sk.haste') : T.trace ? t('sk.trace') : T.cost === 0 ? t('sk.free') : T.rally ? t('sk.rally') : T.hospital ? t('sk.hospital') : t('dr.none'); }
function shipSkillText(T) { const d = shipDesc(T).replace(/^[^：]*：/, '').replace(/ · .*$/, ''); return T.skill || PASSIVE_T(T) || T.cost === 0 ? d.replace(/^常時：/, '').replace(/^Always: /, '') : t('pk.plain'); }
function addMyShip(k) {
  const g = E.gridOf(G.my); let put = null;
  for (let n = 0; n < 600 && !put; n++) { const s = { r: Math.random() * 10 | 0, c: Math.random() * 10 | 0, len: E.TYPES[k].len, h: Math.random() < .5 ? 1 : 0, t: k }; if (E.fits(g, s, G.adj, -2)) put = s; }
  if (put) G.my.push(put); else G.my = E.randomFleet(Math.random, G.adj, G.my.map(s => s.t).concat(k));
}
function startDraft() {
  evalJob++;
  const first = S.first === 'ai' ? 1 : S.first === 'random' ? (Math.random() < .5 ? 0 : 1) : 0;
  G = { phase: 'draft', my: [], st: null, level: S.level, rule: 'tactics', adj: S.adj, view: 'own', hint: null, evals: [], busy: false, resigned: false, first, armed: null, draft: E.draftNew(1 - first) };     // the second to shoot picks first
  render(); save(); draftStep();
}
function draftStep() {
  const d = G.draft, g = G;
  if (d.turn < 0) { G.phase = 'deploy'; G.busy = false; sfx('ping'); render(); save(); return; }
  if (d.turn === 0) { G.busy = false; render(); return; }
  G.busy = true; render();
  setTimeout(() => { if (G !== g || G.phase !== 'draft') return; const k = E.draftAI(d, Math.random); E.draftPick(d, k >= 0 ? k : -1); if (k >= 0) { toast('AI：' + t('ship.' + k)); sfx('place'); } save(); draftStep(); }, 850);
}
function draftPickMine(k) {
  if (G.phase !== 'draft' || G.busy || G.draft.turn !== 0) return;
  if (!E.draftPick(G.draft, k)) return;
  if (k >= 0) { addMyShip(k); sfx('place'); }
  save(); draftStep();
}

let toastT = 0;
function toast(text, cls) { const el = $('#toast'); el.textContent = text; el.className = 'toast on ' + (cls || ''); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 950); }
function swapView(v) {
  if (G.view === v) return Promise.resolve();
  document.body.classList.add('swapping');
  return sleep(230).then(() => { G.view = v; renderBoards(); document.body.classList.remove('swapping'); return sleep(230); });
}

// ---------- 形勢 (public-information rollouts, off the critical path) ----------
let evalJob = 0;
function queueEval() {
  if (!G.st) return; const job = ++evalJob, n = G.st.log.length, st = G.st;
  setTimeout(() => { if (job !== evalJob || G.st !== st || st.winner >= 0) return; let p = null; try { p = E.winProb(st, 0, Math.random, 8); } catch (e) {} if (p == null) return; G.evals[n] = Math.round(p * 1000) / 1000; renderEval(); save(); }, 60);
}

// ---------- deploy: drag to move, tap to turn ----------
let drag = null, hoverCell = -1;
function shipAt(cell) { const g = E.gridOf(G.my); return g[cell]; }
function gridWithout(i) { return E.gridOf(G.my.map((s, k) => k === i ? null : s)); }
function clampShip(s) { const maxR = s.h ? 9 : 10 - s.len, maxC = s.h ? 10 - s.len : 9; s.r = Math.max(0, Math.min(maxR, s.r)); s.c = Math.max(0, Math.min(maxC, s.c)); return s; }
function tryTurn(i, pivot) {
  const s = G.my[i], g = gridWithout(i), pr = pivot / 10 | 0, pc = pivot % 10, k0 = s.h ? pc - s.c : pr - s.r;
  const order = [k0]; for (let d = 1; d < s.len; d++) { if (k0 - d >= 0) order.push(k0 - d); if (k0 + d < s.len) order.push(k0 + d); }
  for (const k of order) { const n = clampShip({ len: s.len, h: s.h ? 0 : 1, r: s.h ? pr - k : pr, c: s.h ? pc : pc - k, t: s.t }); if (E.fits(g, n, G.adj, -2)) { G.my[i] = n; return true; } }
  // anywhere near
  for (let d = 1; d < 4; d++) for (let dr = -d; dr <= d; dr++) for (let dc = -d; dc <= d; dc++) { const n = { len: s.len, h: s.h ? 0 : 1, r: s.r + dr, c: s.c + dc, t: s.t }; if (E.inside(n) && E.fits(g, n, G.adj, -2)) { G.my[i] = n; return true; } }
  return false;
}
function deployDown(e) {
  if (G.phase !== 'deploy') return;
  const cell = SB.cellAt($('#bsvg'), e); if (cell < 0) return; const i = shipAt(cell); if (i < 0) return;
  const s = G.my[i]; e.preventDefault();
  try { $('#bsvg').setPointerCapture(e.pointerId); } catch (x) {}
  drag = { i, from: Object.assign({}, s), k: s.h ? cell % 10 - s.c : (cell / 10 | 0) - s.r, cell, moved: false, bad: false, grid: gridWithout(i) };
}
function deployMove(e) {
  if (!drag) return;
  const p = SB.point($('#bsvg'), e), s = G.my[drag.i];
  let r = Math.floor(p.y), c = Math.floor(p.x); if (s.h) c -= drag.k; else r -= drag.k;
  const n = clampShip({ len: s.len, h: s.h, r, c, t: s.t });
  if (n.r === s.r && n.c === s.c) return;
  drag.moved = true; G.my[drag.i] = n; drag.bad = !E.fits(drag.grid, n, G.adj, -2); renderBoards();
}
function deployUp() {
  if (!drag) return; const d = drag; drag = null;
  if (!d.moved) { if (tryTurn(d.i, d.cell)) sfx('place'); else { sfx('bad'); shake(); } }
  else if (d.bad) { G.my[d.i] = d.from; sfx('bad'); }
  else sfx('place');
  renderBoards(); save();
}
function shake() { const f = $('#frame'); f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); }

// ---------- battle ----------
function newDeploy() {
  if (S.rule === 'tactics') return startDraft();
  evalJob++;
  G = { phase: 'deploy', my: E.randomFleet(Math.random, S.adj), st: null, level: S.level, rule: S.rule, adj: S.adj, view: 'own', hint: null, evals: [], busy: false, resigned: false, first: 0, armed: null };
  render(); save();
}
function startBattle() {
  if (G.phase !== 'deploy' || !E.validFleet(G.my, G.adj, tac())) { sfx('bad'); shake(); return; }
  if (!tac()) G.first = S.first === 'ai' ? 1 : S.first === 'random' ? (Math.random() < .5 ? 0 : 1) : 0;
  G.st = E.newGame({ rule: G.rule, adj: G.adj, fleets: [G.my, E.randomFleet(Math.random, G.adj, tac() ? (G.draft ? G.draft.picks[1] : E.PRESETS[0]) : null)], first: G.first });
  G.my = G.st.sides[0].ships; G.armed = null;
  G.phase = 'battle'; G.view = 'enemy'; G.evals = [.5]; sfx('ping');
  render(); save();
  if (G.st.turn === 1) aiTurn();
}
async function doShot(cell) {
  const st = G.st, by = st.turn, T = st.sides[1 - by], hit = by === 0 && T.fog > 0 ? 'fog' : T.grid[cell] >= 0;   // (under the smoke the shooter sees no flash)
  await swapView(by === 0 ? 'enemy' : 'own');
  if (G.st !== st) return null;
  sfx('lock');
  await SB.fx($('#bsvg'), cell, hit);
  if (G.st !== st) return null;
  const res = E.fire(st, cell); if (!res) return null;
  if (res.sunk < 0 && by === 0 && res.fog) { sfx('miss'); toast(t('fx.fog')); }
  else if (res.dent) { sfx('hit'); toast(t('fx.dent'), 'hit'); }
  else if (res.mine) { sfx('sunk'); shake(); toast(t(by === 0 ? 'fx.mine' : 'fx.foe.mine'), 'hit'); }
  else if (res.counter) { sfx(res.counter.hit ? 'hit' : 'miss'); toast(t(by === 0 ? 'fx.counter' : 'fx.foe.counter', { c: E.cellName(res.counter.cell), r: t(res.counter.hit ? 'log.hit' : 'log.miss') }), 'hit'); }
  else if (res.sunk >= 0) { sfx('sunk'); shake(); toast(t(by === 0 ? 'fx.sunk' : 'fx.lost', { s: t('ship.' + T.ships[res.sunk].t) }) + (res.pursuit ? ' — ' + t(by === 0 ? 'fx.pursuit' : 'fx.foe.pursuit') : ''), 'hit'); }
  else if (res.hit) { sfx('hit'); toast(t('fx.hit'), 'hit'); }
  else { sfx('miss'); toast(t('fx.miss')); }
  render(); save(); queueEval();
  return res;
}
async function doSkill(a) {
  const st = G.st, by = st.turn, pv = E.preview(st, a.ship, a.cell); if (!pv) return null;
  const noAim = E.NOAIM[pv.skill], blocked = st.sides[1 - by].ward && !E.SELF[pv.skill];
  if (!noAim) { await swapView(by === 0 ? 'enemy' : 'own'); if (G.st !== st) return null; }
  toast((by === 1 ? t('fx.foe', { s: t('sk.' + pv.skill) }) : t('sk.' + pv.skill))); sfx('ping');
  await sleep(by === 1 ? 650 : 250); if (G.st !== st) return null;
  if (noAim || blocked) await sleep(250);
  else if (pv.skill === 'sonar' || pv.skill === 'scout' || pv.skill === 'radar' || pv.skill === 'sweep' || pv.skill === 'flare' || pv.skill === 'echo' || pv.skill === 'diag' || pv.skill === 'cross') await SB.sweep($('#bsvg'), pv.area);
  else { for (const x of pv.shots) { SB.fx($('#bsvg'), x.cell, by === 0 && st.sides[1].fog > 0 ? 'fog' : x.hit, true); setTimeout(() => sfx(x.hit ? 'hit' : 'miss'), 160); await sleep(pv.skill === 'torpedo' || pv.skill === 'rtorpedo' || pv.skill === 'dtorpedo' ? 120 : 170); } if (pv.ic >= 0) SB.fx($('#bsvg'), pv.ic, 'fog', true); await sleep(330); }
  if (G.st !== st) return null;
  const res = E.useSkill(st, a.ship, a.cell); if (!res) return null;
  G.armed = null; hoverCell = -1;
  const sunk = res.shots.filter(x => x.sunk >= 0), hits = res.shots.filter(x => x.hit).length;
  if (res.skill === 'listen') toast(t(by === 0 ? 'fx.listen' : 'fx.foe.listen', { r: res.row + 1, k: res.k }));
  else if (res.blocked) { sfx('bad'); toast(t(by === 0 ? 'fx.blk' : 'fx.foe.blk', { s: t('sk.' + res.skill) })); }
  else if (res.skill === 'flare') toast(t('fx.flare', { k: res.k }));
  else if (res.skill === 'sonar' || res.skill === 'scout' || res.skill === 'radar' || res.skill === 'sweep' || res.skill === 'echo' || res.skill === 'diag' || res.skill === 'cross') toast(t('fx.' + res.skill, { k: res.k, n: res.swept || 0 }));
  else if (noAim) toast(t((by === 0 ? 'fx.' : 'fx.foe.') + res.skill, { c: res.fix != null ? E.cellName(res.fix) : res.lit != null ? E.cellName(res.lit) : '', s: res.pi != null ? t('ship.' + st.sides[by].ships[res.pi].t) : '' }));
  else if (by === 0 && res.shots.some(x => x.fog)) toast(t('fx.fog'));
  else if (res.skill === 'bracket' && res.k != null) toast(t('fx.bracket', { r: t(res.k ? 'fx.bracket.s' : 'fx.bracket.w') }), res.shots.some(x => x.hit) ? 'hit' : '');
  else if (res.skill === 'probe') toast(t('fx.probe', { r: t(res.shots[0] && res.shots[0].hit && !res.shots[0].fog ? 'log.hit' : res.shots[0] && res.shots[0].fog ? 'log.fog' : 'log.miss'), k: res.k != null ? res.k : '?' }), res.shots[0] && res.shots[0].hit ? 'hit' : '');
  else if (res.shots.some(x => x.mine)) { sfx('sunk'); shake(); toast(t(by === 0 ? 'fx.mine' : 'fx.foe.mine'), 'hit'); }
  else if (res.ic >= 0) toast(t(by === 0 ? 'fx.aa' : 'fx.foe.aa', { c: E.cellName(res.ic) }));
  else if (res.shots.some(x => x.dent)) toast(t('fx.dent'), 'hit');
  else if (sunk.length) { sfx('sunk'); shake(); toast(t(by === 0 ? 'fx.sunk' : 'fx.lost', { s: t('ship.' + st.sides[1 - by].ships[sunk[0].sunk].t) }), 'hit'); }
  else if (hits) toast(hits > 1 ? t('fx.hits', { n: hits }) : t('fx.hit'), 'hit'); else toast(t('fx.miss'));
  const cn = res.shots.find(x => x.counter); if (cn) { await sleep(700); toast(t(by === 0 ? 'fx.counter' : 'fx.foe.counter', { c: E.cellName(cn.counter.cell), r: t(cn.counter.hit ? 'log.hit' : 'log.miss') }), 'hit'); }
  if (res.traced != null) { await sleep(600); toast(t(by === 0 ? 'fx.foe.trace' : 'fx.trace', { c: E.cellName(res.traced) })); }
  render(); save(); queueEval();
  return res;
}
const doAction = a => a.skill ? doSkill(a) : doShot(a.cell);
async function playerShot(cell) {
  if (!G.st || G.phase !== 'battle' || G.busy || G.st.turn !== 0 || G.view !== 'enemy') return;
  const a = G.armed != null ? { skill: skillOf(G.my[G.armed]), ship: G.armed, cell } : { cell };
  if (a.skill ? !E.preview(G.st, a.ship, cell) : G.st.sides[1].shots[cell]) { if (a.skill) sfx('bad'); return; }
  const st = G.st; G.busy = true; G.hint = null; SB.aim($('#bsvg'), -1); renderButtons(); renderSkills();
  const res = await doAction(a); if (!res || G.st !== st) return;
  if (st.winner >= 0) return finish();
  if (st.turn === 1) return aiTurn();
  G.busy = false; render();
}
async function playerNoAim(i) {
  if (!G.st || G.phase !== 'battle' || G.busy || G.st.turn !== 0) return;
  if (!E.preview(G.st, i, -1)) { sfx('bad'); toast(t('sk.none')); return; }
  const st = G.st; G.busy = true; G.hint = null; renderButtons(); renderSkills();
  const res = await doSkill({ skill: skillOf(G.my[i]), ship: i, cell: -1 }); if (!res || G.st !== st) return;
  if (st.winner >= 0) return finish();
  if (st.turn === 1) return aiTurn();
  G.busy = false; render();
}
async function aiTurn() {
  const st = G.st; G.busy = true; render();
  await sleep(520); if (G.st !== st) return;
  await swapView('own');
  while (G.st === st && st.winner < 0 && st.turn === 1) {
    await sleep(480); if (G.st !== st) return;
    const res = await doAction(E.chooseAction(st, G.level, Math.random)); if (!res) return;
    await sleep(res.again ? 260 : 620);
  }
  if (G.st !== st) return;
  if (st.winner >= 0) return finish();
  await swapView('enemy'); if (G.st !== st) return;
  G.busy = false; render();
}
function finish() {
  const st = G.st; G.phase = 'over'; G.busy = false; G.hint = null; G.armed = null; evalJob++;
  const won = st.winner === 0;
  render(); save();
  try { if (st.log.length) GameRecord.add({ mode: 'ai', res: won ? 'w' : 'l', side: G.first === 0 ? 0 : 1, opp: 'AI Lv.' + G.level, key: 'ai:' + G.level, n: st.log.length, why: G.resigned ? Resign.label(LANG) : '', variant: G.rule }); } catch (e) {}
  setTimeout(() => { if (G.st !== st) return; sfx(won ? 'win' : 'lose'); swapView('enemy'); showResult(); }, G.resigned ? 150 : 900);
}
function showResult() {
  const st = G.st, won = st.winner === 0, row = (name, side) => { const n = side.nshots, h = side.hits; return `<div><b>${name}</b><span>${t('res.acc', { p: n ? Math.round(h / n * 100) : 0, h, n })}</span></div>`; };
  $('#resultTitle').textContent = t(won ? 'res.win' : 'res.lose'); $('#resultTitle').className = 'result-big ' + (won ? 'win' : 'lose');
  $('#resultSub').textContent = G.resigned ? t('st.resign') : t('res.sub', { n: st.log.length });
  $('#resultRows').innerHTML = row(t('res.you'), st.sides[1]) + row(t('res.ai', { l: G.level }), st.sides[0]);
  $('#resultOverlay').classList.add('show');
}
function hint() {
  if (!G.st || G.phase !== 'battle' || G.st.turn !== 0 || G.busy) return;
  if (G.hint) G.hint = null; else { G.hint = E.advise(G.st.sides[1], G.adj, Math.random, 6000, G.st.scans[0]); sfx('ping'); if (G.view !== 'enemy') { swapView('enemy').then(() => render()); return; } }
  render();
}

// ---------- new-game dialog ----------
const RULE_ART = {
  classic: '<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="48" cy="32" r="13"/><path d="M48 11v9M48 44v9M27 32h9M60 32h9"/><circle cx="48" cy="32" r="2.6" fill="currentColor" stroke="none"/></svg>',
  streak: '<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="32" r="10"/><circle cx="24" cy="32" r="2.6" fill="#ff8f6b" stroke="none"/><path d="M40 32h14M49 26l6 6-6 6"/><circle cx="72" cy="32" r="10"/><path d="M72 17v6M72 41v6M57 32h6M81 32h6" opacity=".6"/></svg>',
  salvo: '<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="22" cy="40" r="9"/><circle cx="48" cy="24" r="9"/><circle cx="74" cy="40" r="9"/><circle cx="22" cy="40" r="2.3" fill="currentColor" stroke="none"/><circle cx="48" cy="24" r="2.3" fill="currentColor" stroke="none"/><circle cx="74" cy="40" r="2.3" fill="currentColor" stroke="none"/></svg>',
};
RULE_ART.tactics = '<svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="30" cy="32" r="4"/><path d="M20 22a14 14 0 0 0 0 20M40 22a14 14 0 0 1 0 20M11 14a26 26 0 0 0 0 36"/><rect x="62" y="14" width="12" height="12" rx="2"/><rect x="76" y="14" width="12" height="12" rx="2" opacity=".55"/><rect x="62" y="28" width="12" height="12" rx="2" opacity=".55"/><path d="M82 52V34M77 39l5-5 5 5" stroke="#ff8f6b"/></svg>';
const THUMB = { abyss: ['#1f6484', '#0a2c44', '#a3b5bd', 'rgba(190,235,245,.25)'], chart: ['#efe7d2', '#cfe0db', '#405a76', 'rgba(40,80,105,.3)'], radar: ['#123327', '#051610', '#93ad9d', 'rgba(130,255,195,.28)'], dawn: ['#4a4674', '#b97b6c', '#b7a9ae', 'rgba(255,235,225,.28)'] };
function thumb(k) { const c = THUMB[k]; let l = ''; for (let i = 1; i < 6; i++) l += `M${i * 10} 0V40`; for (let i = 1; i < 4; i++) l += `M0 ${i * 10}H60`; return `<svg viewBox="0 0 60 40"><defs><linearGradient id="th-${k}" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient></defs><rect width="60" height="40" fill="url(#th-${k})"/><path d="${l}" stroke="${c[3]}" stroke-width=".5"/><path d="M12 22.5h24q5 1 6.6 2.5q-1.6 1.500-6.600 2.500h-24q-1.500 0-1.500-2.500t1.500-2.500z" fill="${c[2]}"/><circle cx="45" cy="15" r="2.4" fill="#ff7a4d" stroke="#fff3e6" stroke-width=".7"/></svg>`; }
let ND = null;      // the dialog's working copy of the settings
function ngRender() {
  $('#ruleCards').innerHTML = E.RULES.map(r => `<button type="button" class="ngt-gcard${ND.rule === r ? ' sel' : ''}" data-v="${r}"><span class="gart">${RULE_ART[r]}</span><b>${t('rule.' + r)}</b><p>${t('rule.' + r + '.d')}</p><span class="gpick"></span></button>`).join('');
  $$('#segFirst button').forEach(b => b.classList.toggle('on', b.dataset.v === ND.first));
  $$('#segAdj button').forEach(b => b.classList.toggle('on', (b.dataset.v === '1') === ND.adj));
  $('#levelRange').value = ND.level; $('#levelName').innerHTML = `Lv.${ND.level}<small>${tier(ND.level)}</small>`;
  $('#bdRow').innerHTML = DESIGNS.map(d => `<button type="button" data-v="${d}" class="${ND.design === d ? 'on' : ''}">${thumb(d)}<span>${t('bd.' + d)}</span></button>`).join('');
}
function openNew() { ND = { rule: S.rule, adj: S.adj, level: S.level, first: S.first, design: S.design }; ngRender(); $('#newOverlay').classList.add('show'); }
function closeNew() { $('#newOverlay').classList.remove('show'); }
$('#ruleCards').addEventListener('click', e => { const b = e.target.closest('.ngt-gcard'); if (!b) return; ND.rule = b.dataset.v; ngRender(); });
$('#segFirst').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { ND.first = b.dataset.v; ngRender(); } });
$('#segAdj').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { ND.adj = b.dataset.v === '1'; ngRender(); } });
$('#levelRange').addEventListener('input', e => { ND.level = +e.target.value; $('#levelName').innerHTML = `Lv.${ND.level}<small>${tier(ND.level)}</small>`; });
$('#bdRow').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; ND.design = b.dataset.v; S.design = ND.design; ngRender(); DESIGNS.forEach(d => document.body.classList.toggle('bd-' + d, S.design === d)); save(); });
$('#btnCancelNew').onclick = closeNew;
$('#btnStart').onclick = () => { Object.assign(S, ND); closeNew(); $('#resultOverlay').classList.remove('show'); newDeploy(); };
$('#newOverlay').addEventListener('click', e => { if (e.target === $('#newOverlay')) closeNew(); });

// ---------- wiring ----------
const bsvg = $('#bsvg');
bsvg.addEventListener('pointerdown', deployDown);
bsvg.addEventListener('pointermove', e => { if (drag) return deployMove(e); if (!PCQ.matches || !G.st || G.phase !== 'battle' || G.busy || G.st.turn !== 0 || G.view !== 'enemy') return SB.aim(bsvg, -1); const c = SB.cellAt(bsvg, e); if (G.armed != null) { if (c !== hoverCell) { hoverCell = c; renderBoards(); } return; } SB.aim(bsvg, c >= 0 && !G.st.sides[1].shots[c] ? c : -1); });
bsvg.addEventListener('pointerup', deployUp);
bsvg.addEventListener('pointercancel', () => { if (drag) { G.my[drag.i] = drag.from; drag = null; renderBoards(); } });
bsvg.addEventListener('pointerleave', () => { SB.aim(bsvg, -1); if (G.armed != null && hoverCell >= 0 && PCQ.matches) { hoverCell = -1; renderBoards(); } });
$('#skillCard').addEventListener('click', e => { const b = e.target.closest('.sk'); if (!b || b.disabled || !G.st || G.busy || G.phase !== 'battle' || G.st.turn !== 0) return; const i = +b.dataset.i; if (E.NOAIM[skillOf(G.my[i])]) { G.armed = null; return playerNoAim(i); } G.armed = G.armed === i ? null : i; hoverCell = -1; G.hint = null; sfx('place'); if (G.view !== 'enemy') swapView('enemy').then(() => render()); else render(); });
$('#drRows').addEventListener('click', e => { if (e.target.closest('#btnPick')) $('#pickOverlay').classList.add('show'); });
$('#pickTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; pickTab = +b.dataset.g; renderDraft(); $('#pickGrid').scrollTop = 0; });
$('#pickGrid').addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.disabled) return; $('#pickOverlay').classList.remove('show'); draftPickMine(+b.dataset.k); });
$('#btnPickClose').onclick = () => { pickShut = G.draft ? G.draft.n : -1; $('#pickOverlay').classList.remove('show'); };
$('#pickOverlay').addEventListener('click', e => { if (e.target.id === 'pickOverlay') $('#btnPickClose').onclick(); });
$('#btnPickStop').onclick = () => { $('#pickOverlay').classList.remove('show'); $('#btnDrStop').click(); };
$('#btnDrStop').onclick = () => draftPickMine(-1);
bsvg.addEventListener('click', e => { if (G.phase !== 'battle') return; const c = SB.cellAt(bsvg, e); if (c >= 0) playerShot(c); });
$('#miniBtn').onclick = () => { if (!G.st || G.busy || G.phase === 'deploy') return; swapView(G.view === 'enemy' ? 'own' : 'enemy').then(() => render()); };
$('#btnShuffle').onclick = () => { if (G.phase !== 'deploy') return; G.my = E.randomFleet(Math.random, G.adj, G.my.map((s, i) => s.t != null ? s.t : i)); sfx('place'); renderBoards(); save(); };
$('#btnGo').onclick = startBattle;
$('#btnNew').onclick = openNew;
$('#btnHint').onclick = hint;
$('#btnResign').onclick = () => { if (G.phase !== 'battle') return; const go = () => { if (G.phase !== 'battle') return; G.resigned = true; G.st.winner = 1; evalJob++; finish(); }; if (window.Resign) Resign.confirm({ lang: LANG }).then(ok => { if (ok) go(); }); else go(); };
$('#btnSound').onclick = () => { S.sound = !S.sound; try { localStorage.setItem('atlas-sfx', S.sound ? '1' : '0'); } catch (e) {} save(); renderButtons(); if (S.sound) sfx('place'); };
$('#btnResClose').onclick = () => $('#resultOverlay').classList.remove('show');
$('#btnAgain').onclick = () => { $('#resultOverlay').classList.remove('show'); newDeploy(); };
$('#btnRules').onclick = () => window.SeaTour && SeaTour.open();
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeNew(); $('#resultOverlay').classList.remove('show'); } });

function applyLang() {
  document.documentElement.lang = LANG;
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $('#ttlName').textContent = t('title');
  document.title = t('title') + ' | ' + t('series');
  $('#depText').textContent = t(PCQ.matches ? 'dep.b.pc' : 'dep.b');
  if (window.Resign) $('#btnResign span').textContent = Resign.label(LANG);
  if (HB && HB.relabel) HB.relabel();
  if (window.GameRecord && GameRecord.relabel) GameRecord.relabel();
  if (ND) ngRender();
  if (G) render();
  if (window.SeaTour) SeaTour.relabel();
}
$('#langSel').value = LANG;
$('#langSel').addEventListener('change', e => { LANG = SUPPORTED.includes(e.target.value) ? e.target.value : 'en'; applyLang(); save(); });

if (window.RulesOffer) RulesOffer.init({ game: 'seabattle', lang: () => LANG, open: () => { closeNew(); window.SeaTour && SeaTour.open(); }, watch: '#rulesOverlay' });
if (window.GameRecord) GameRecord.init({ game: 'seabattle', lang: () => LANG, menu: '.controls', sides: () => [t('rec.first'), t('rec.later')], variant: () => ({ k: G ? G.rule : 'classic', n: t('rule.' + (G ? G.rule : 'classic')) }), variants: () => E.RULES, variantName: k => t('rule.' + k), defVariant: 'classic' });
const HB = window.HeaderBar ? HeaderBar.init({ order: ['#btnNew', '#btnResign', '#btnHint', '#btnRules'], lang: () => LANG }) : null;

if (!restore()) { if (S.rule === 'tactics') startDraft(); else G = { phase: 'deploy', my: E.randomFleet(Math.random, S.adj), st: null, level: S.level, rule: S.rule, adj: S.adj, view: 'own', hint: null, evals: [], busy: false, resigned: false, first: 0, armed: null }; }
applyLang();
if (G.phase === 'battle' && G.st.turn === 1) aiTurn();
window.SeaApp.newGame = () => { $('#resultOverlay').classList.remove('show'); openNew(); };
