/* 狼影灯 — 主人公の立場。物語ごとに何人もの「あなた」がいて、序幕の入り・本筋の自分の糸・役の由来・結末・後日談が変わる。
   物語の文の {job}（肩書き）{you}（人からの呼ばれ方）{book}（書きつけるもの）を、選んだ主人公で置き換える。 */
(function (root) {
  'use strict';
  const KEYS = /\{(job|you|book)\}/g;
  function apply(base, hid) {
    const H = base.heroes || [];
    const h = H.find(x => x.id === hid) || H[0];
    if (!h) return base;
    const vars = { job: h.job, you: h.you, book: h.book };
    const sub = v => typeof v === 'string' ? v.replace(KEYS, (m, k) => vars[k])
      : Array.isArray(v) ? v.map(sub)
      : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'heroes' ? x : sub(x)])) : v;
    const st = sub(base);
    const hh = sub(h);
    st.heroId = h.id;
    st.heroData = hh;
    st.hero = { name: 'あなた', title: hh.job, you: hh.you, job: hh.job, home: hh.home, traits: hh.traits };
    st.lex = Object.assign({}, st.lex, { book: hh.book });
    st.roles = Object.fromEntries(Object.entries(st.roles).map(([r, R]) => [r, Object.assign({}, R, hh.how && hh.how[r] ? { how: hh.how[r] } : {})]));
    st.text = Object.assign({}, st.text);
    const pro = st.text.prologue || [], core = pro.findIndex(p => p.core);
    // a hero with an opening of their own starts the story their way; the shared part (from the page marked core) follows
    const tagged = pro.map((p, i) => p.sid ? p : Object.assign({}, p, { sid: 'p' + i }));   // a name for each page, so the theater can find its shots
    st.text.prologue = hh.prologue && core > 0 ? hh.prologue.map((p, k) => Object.assign({}, p, { sid: 'h:' + h.id + ':' + k })).concat(tagged.slice(core)) : tagged.flatMap(p => p.hero ? [{ bg: hh.bg || p.bg || st.locs[0].id, t: hh.intro, sid: 'h:' + h.id }] : [p]);
    if (hh.win) st.text.win = hh.win;
    if (st.arc) {
      const days = {};
      for (const d in st.arc.days) days[d] = st.arc.days[d].flatMap(e => e.slot ? (hh[e.slot] ? [{ t: hh[e.slot] }] : []) : [e]);
      for (const d in hh.arc || {}) days[d] = (days[d] || []).concat(hh.arc[d]);
      st.arc = Object.assign({}, st.arc, { days });
    }
    return st;
  }
  root.WLHero = { apply, list: base => base.heroes || [] };
})(typeof window !== 'undefined' ? window : globalThis);
