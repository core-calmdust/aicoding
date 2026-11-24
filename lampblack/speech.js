/* 狼影灯 — engine の出来事（意味）を、その人の声の日本語にする */
(function (root) {
  'use strict';
  const V = () => root.WL_VOICES, WHY = () => root.WL_WHY;
  const fill = (t, o) => String(t).replace(/\{(\w+)\}/g, (m, k) => o[k] != null ? o[k] : m);
  function h32(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  const charOf = (story, id) => story.chars.find(c => c.id === id);
  const name = (S, story, id) => id === 'you' ? story.hero.name : id === 'first' ? story.first.name : (charOf(story, id) || { name: id }).name;
  const nameSan = (S, story, id, reg) => id === 'you' ? story.hero.title : name(S, story, id);   // NPCs call the player by title
  const loc = (story, id) => { const l = story.locs.find(l => l.id === id); return l ? l.name : id; };
  const roleName = (story, r) => r === 'wolf' ? '人狼' : r === 'madman' ? '狂人' : (story.roles[r] || { name: r }).name;
  const roleShort = r => ({ seer: '占い', medium: '霊視', guard: '護衛' })[r] || r;
  const trait = (story, cat, val) => story.traits[cat].v[val];
  const fig = (story, cat, val) => (story.traits[cat].fig || {})[val] || ('「' + trait(story, cat, val) + '」人影');
  const traceText = (story, t) => t.neg ? (story.traits[t.cat].ntr[t.val] || (trait(story, t.cat, t.val) + 'ではない。')) : story.traits[t.cat].tr[t.val];
  const traceShort = (story, t) => (t.neg ? '〈' + trait(story, t.cat, t.val) + '〉ではない' : '〈' + trait(story, t.cat, t.val) + '〉');

  // one line in a person's voice; variants rotate so the same person does not repeat themself
  function say(S, story, id, act, vars) {
    const c = charOf(story, id);
    if (!c) return '';
    const vo = V()[c.voice] || V().plain;
    const list = (c.lines && c.lines[act]) || vo[act] || [''];
    S.vc = S.vc || {};
    const k = id + ':' + act;
    const i = ((h32(S.seed + k) % 97) + (S.vc[k] = (S.vc[k] || 0) + 1)) % list.length;
    const add = name => (vo.reg === 'plain' || vo.reg === 'kid' && false) ? name : name;
    const out = fill(list[i], Object.assign({ you: story.hero.title, god: story.lex.god || '神さま', godCall: story.lex.godCall || '神さま', blessing: story.lex.blessing || 'ようこそ' }, vars || {}));
    // the hero's title with an honorific becomes how people really call them (先生さん → 先生, 医者さん → お医者さま)
    const H = story.hero;
    return H && H.you && H.title ? out.split(H.title + 'さん').join(H.you) : out;
  }
  // the reason clause in the speaker's register
  function why(S, story, id, w) {
    const c = charOf(story, id); const reg = (V()[c.voice] || {}).reg || 'plain';
    const T = WHY()[reg] || WHY().plain;
    if (!w || w.k === 'gut') return (V()[c.voice] || {}).gut || T.gut;
    const o = { role: w.role ? roleShort(w.role) : '', by: w.by ? (w.by === 'you' ? story.hero.title : name(S, story, w.by)) : '' };
    if (w.k === 'counter') o.role = roleName(story, w.role);
    if (w.k === 'trace') o.trait = trait(story, w.cat, w.val);
    return fill(T[w.k] || T.gut, o);
  }
  // NPCs say "〜さん" in polite registers; plain voices drop it
  function callName(S, story, by, id) {
    const c = charOf(story, by); const reg = c ? (V()[c.voice] || {}).reg : 'plain';
    return id === 'you' ? story.hero.title : name(S, story, id);
  }

  // a meeting event → { by, text, kind }
  function event(S, story, e) {
    const N = n => callName(S, story, e.by, n);
    switch (e.t) {
      case 'co': return { by: e.by, kind: 'co', text: say(S, story, e.by, 'co_' + e.role + (e.dodge && e.role === 'guard' ? '_dodge' : '')) };
      case 'result': return { by: e.by, kind: 'result', res: e.res, text: e.role === 'guard' ? say(S, story, e.by, 'rg', { target: N(e.target) }) : say(S, story, e.by, (e.role === 'seer' ? 'rs_' : 'rm_') + (e.res === 'wolf' ? 'w' : 'h'), { target: N(e.target) }) };
      case 'report': return { by: e.by, kind: 'report', text: say(S, story, e.by, 'report', { loc: loc(story, S.nights[e.night].loc), trace: traceText(story, e) }) };
      case 'itemfound': return { by: e.by, kind: 'report', text: say(S, story, e.by, 'item', { loc: loc(story, S.nights[e.night].loc), owner: N(e.owner), belong: charOf(story, e.owner).belong }) };
      case 'fig': return { by: e.by, kind: 'fig', text: say(S, story, e.by, 'fig', { fig: fig(story, e.cat, e.val) }) };
      case 'accuse': return { by: e.by, kind: 'accuse', target: e.target, text: say(S, story, e.by, 'accuse', { target: N(e.target), why: why(S, story, e.by, e.why) }) };
      case 'agree': return { by: e.by, kind: 'accuse', target: e.target, text: say(S, story, e.by, 'agree', { target: N(e.target), with: N(e.with) }) };
      case 'defend': return { by: e.by, kind: 'defend', text: say(S, story, e.by, 'defend') };
      case 'counter': return { by: e.by, kind: 'co', text: say(S, story, e.by, 'counter', { rival: N(e.rival), role: roleName(story, e.role) }) };
      case 'grief': return { by: e.by, kind: 'grief', text: say(S, story, e.by, 'grief') };
      case 'whoseen': return { by: e.by, kind: 'fig', text: say(S, story, e.by, 'who', { who: N(e.who), loc: loc(story, e.loc) }) };
      case 'denyseen': return { by: e.by, kind: 'defend', text: say(S, story, e.by, 'deny') };
      case 'evnone': return { by: e.by, kind: 'grief', text: say(S, story, e.by, 'evnone') };
      case 'caught': return { by: e.by, kind: 'defend', text: say(S, story, e.by, 'caught') };
      case 'notice': return { by: e.by, kind: 'accuse', target: e.target, text: say(S, story, e.by, 'notice', { target: N(e.target) }) };
      case 'confess': { const c = charOf(story, e.by); return { by: e.by, kind: 'grief', text: c && c.secret ? c.secret.confess : '' }; }
      case 'guardsus': return { by: e.by, kind: 'accuse', target: 'you', text: say(S, story, e.by, 'guardsus') };
      case 'callnone': return { by: e.by, kind: 'grief', text: say(S, story, e.by, 'callnone') };
      case 'reqok': return { by: e.by, kind: 'co', text: say(S, story, e.by, 'reqok', { target: N(e.target) }) };
      case 'reqno': return { by: e.by, kind: 'co', text: say(S, story, e.by, 'reqno_' + (e.why || 'trust'), { target: N(e.target) }) };
      case 'guardheard': return { by: e.by, kind: 'grief', text: say(S, story, e.by, 'guardheard', { target: N(e.target) }) };
    }
    return null;
  }

  // what someone says about the night when the player asks
  function night(S, story, T) {
    const out = [];
    out.push(say(S, story, T.id, 'home', { loc: loc(story, T.loc) }));
    const saw = T.saw.filter(s => s.kind === 'fig');
    const who = T.saw.filter(s => s.kind === 'who');
    for (const s of saw.slice(0, 2)) out.push(say(S, story, T.id, 'fig', { fig: fig(story, s.cat, s.val) }));
    // a person seen at the place next door is said to be there: "the graveyard next door"
    const nextTo = (a, b) => { const ring = story.locs.map(l => l.id), i = ring.indexOf(a), j = ring.indexOf(b); if (i < 0 || j < 0 || a === b) return false; const d = Math.abs(i - j); return d === 1 || d === ring.length - 1; };
    for (const s of who.slice(0, 1)) out.push(say(S, story, T.id, 'who', { who: callName(S, story, T.id, s.who), loc: (nextTo(T.loc, s.loc) ? 'となりの' : '') + loc(story, s.loc) }));
    if (!saw.length && !who.length) out.push(say(S, story, T.id, 'none'));
    return out;
  }
  function opinion(S, story, id, o) {
    if (!o || !o.target || o.score < .12) return say(S, story, id, 'nosus');
    return say(S, story, id, 'sus', { target: callName(S, story, id, o.target), why: why(S, story, id, o.why) });
  }
  function about(S, story, id, r) {
    const tn = callName(S, story, id, r.target);
    const parts = [];
    if (r.seen && r.seen.length) parts.push(say(S, story, id, 'seen', { target: tn, loc: loc(story, r.seen[0].loc) }));
    const sc = r.o && r.o.sus ? r.o.sus[r.target] : 0;
    const ranks = r.o && r.o.sus ? Object.values(r.o.sus).sort((a, b) => b - a) : [];
    const high = sc >= (ranks[Math.min(2, ranks.length - 1)] || 1) && sc > .15;
    parts.push(high ? say(S, story, id, 'bad', { target: tn, why: why(S, story, id, r.o.why) }) : say(S, story, id, 'okay', { target: tn }));
    return parts;
  }

  root.WLSpeech = { fill, say, why, event, night, opinion, about, name, loc, roleName, trait, fig, traceText, traceShort, charOf, callName };
})(typeof window !== 'undefined' ? window : globalThis);
