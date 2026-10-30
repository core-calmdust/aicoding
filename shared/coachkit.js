// CoachKit — shared building blocks for the "coach" (コーチ) of the 世界のボドゲ大全 games (common spec, model: poker).
//
// The coach is an educational panel shown while the player is to move: a recommendation with its reason, the candidate
// directions of a branching position (each explained), prioritized "how to think" tips (3 shown, the rest on demand), the
// verdict on the previous move, and dotted glossary terms (hover on PC / tap on phones). It is switched on / off with a
// switch in the top bar (header bar on PC, title row on phones).
//
// The game supplies the content (what to say); CoachKit supplies the look and the behaviour:
//   CoachKit.sw({ mount, label, get, set })   → the top-bar switch (button.ck-sw); returns { el, sync() }
//   CoachKit.summary([{ k, v, cls }])          → chip row (形勢・駒割り・局面 …)
//   CoachKit.rec(badge, html, cls)             → recommendation badge + reason
//   CoachKit.branches({ head, intro, items, reveal, show, hide }) → candidate directions; items: { tag, cls, title, text, gap, gcls, move }
//   CoachKit.tips({ head, list, open, more, less })  → tips list (first 3 + "more")
//   CoachKit.verdict(g, title, html)           → previous-move verdict box (g: 0 best … 3 mistake)
//   CoachKit.gloss(html, dict)                 → wraps glossary terms (dict: { key: { m: [surface forms], t: title, d: text } })
//   CoachKit.bind(root, { onMore, onReveal, onHover(move|null) }) → wires the buttons inside a rendered card
// Icons for the phones' bottom tab bar: CoachKit.ICON.coach / eval / kifu / online.
(function () {
'use strict';
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ICON = {
  coach: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2h5c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z"/></svg>',
  eval: '<svg viewBox="0 0 24 24"><path d="M4 17.5h16"/><path d="M6 13.5l4-4 3 3 5-6"/></svg>',
  kifu: '<svg viewBox="0 0 24 24"><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
  online: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/></svg>',
};
const CSS = `
.ck-sw{display:inline-flex;align-items:center;gap:7px;height:34px;box-sizing:border-box;padding:0 10px 0 8px;border-radius:10px;border:1px solid var(--line,rgba(255,255,255,.15));background:rgba(0,0,0,.2);color:var(--muted,#aaa);font:600 12.5px inherit;cursor:pointer;white-space:nowrap;-webkit-tap-highlight-color:transparent;flex:none}
.ck-sw svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}
.ck-sw i{position:relative;width:28px;height:16px;border-radius:9px;background:rgba(255,255,255,.14);transition:background .2s;flex:none}
.ck-sw i::after{content:'';position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;background:#cfc8b8;transition:transform .2s,background .2s}
.ck-sw.on{color:var(--text,#eee);border-color:color-mix(in srgb, var(--accent,#d8b56a) 55%, transparent);background:color-mix(in srgb, var(--accent,#d8b56a) 12%, rgba(0,0,0,.2))}   /* lit like the sound button when on */
.ck-sw.on svg{stroke:var(--accent,#d8b56a)}
.ck-sw.on i{background:color-mix(in srgb, var(--accent,#d8b56a) 55%, transparent)}
.ck-sw.on i::after{transform:translateX(12px);background:#fff}
.ck-flash{position:fixed;left:50%;top:50%;z-index:400;transform:translate(-50%,-50%) scale(.92);padding:12px 22px;border-radius:14px;background:rgba(10,10,12,.86);color:#fff;font:700 15px/1.3 inherit;letter-spacing:.04em;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .18s,transform .18s;box-shadow:0 10px 30px rgba(0,0,0,.45)}
.ck-flash.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
.ck-h .ck-sw,.ck-h .ck-sw.on{margin-left:auto;height:28px;padding:0;border:0!important;background:none!important;box-shadow:none;gap:0}
.ck-h small + .ck-sw{margin-left:12px}
.ck-h .ck-sw svg{display:none}
.ck-h .ck-sw span{display:none!important}
.ck-h .ck-sw i,.ck-h .ck-sw.on i{width:46px!important;height:24px!important;border-radius:12px}
.ck-h .ck-sw i::after{top:3px;left:3px;width:18px!important;height:18px!important}
.ck-h .ck-sw.on i::after{transform:translateX(22px)!important}
@media not all and (hover:hover) and (pointer:fine) and (min-width:1040px) and (min-aspect-ratio:3/4){.ck-sw{padding:0 7px;gap:5px}.ck-sw span{display:none}.ck-sw i{width:24px;height:14px}.ck-sw i::after{width:10px;height:10px}.ck-sw.on i::after{transform:translateX(10px)}}
.ck-card h3.ck-h{display:flex;align-items:center;gap:8px;margin:0 0 8px;font-size:13px;letter-spacing:.08em;color:var(--muted,#aaa);font-weight:600}
.ck-card h3.ck-h svg{width:16px;height:16px;fill:none;stroke:var(--accent,#d8b56a);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.ck-card h3.ck-h small{margin-inline-start:auto;font-weight:400;letter-spacing:0;color:var(--dim,var(--muted,#888));font-size:11.5px}
.ck-sum{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:9px}
.ck-sum span{display:inline-flex;gap:5px;align-items:baseline;padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);font-size:12px;color:var(--muted,#aaa);white-space:nowrap}
.ck-sum b{color:var(--text,#eee);font-weight:700}
.ck-sum .pos b{color:#8fe3b8}.ck-sum .neg b{color:#ff9b90}
.ck-rec{display:flex;flex-direction:column;align-items:flex-start;gap:6px;margin-bottom:4px}
.ck-rec .ck-rb{display:inline-block;padding:4px 14px;border-radius:999px;font-weight:800;font-size:15px;letter-spacing:.04em;background:linear-gradient(180deg,#e2c475,#b08f4a);color:#1c160b}
.ck-rec .ck-rb.r-def{background:linear-gradient(180deg,#9fc7ff,#5d86c8);color:#0b1626}
.ck-rec .ck-rb.r-mate{background:linear-gradient(180deg,#ff9b8a,#d0574a);color:#260b08}
.ck-rec p{margin:0;font-size:14px;line-height:1.75;color:var(--text,#eee)}
.ck-sec{margin-top:11px}
.ck-sec-h{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;color:var(--accent,#d8b56a);letter-spacing:.06em;margin-bottom:6px}
.ck-sec-h::before{content:'';display:inline-block;width:3px;height:.95em;border-radius:2px;background:var(--accent,#d8b56a)}
.ck-sec-h button{margin-inline-start:auto;border:1px solid var(--line,rgba(255,255,255,.15));background:rgba(0,0,0,.2);color:var(--text,#eee);border-radius:8px;padding:3px 10px;font:600 11.5px inherit;cursor:pointer;letter-spacing:0}
.ck-sec-h button:hover{border-color:var(--accent,#d8b56a)}
.ck-intro{font-size:12.5px;line-height:1.65;color:var(--muted,#aaa);margin:0 0 7px}
.ck-br{display:flex;flex-direction:column;gap:6px}
.ck-bi{position:relative;padding:8px 10px 8px 12px;border-radius:10px;background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.08);border-inline-start:3px solid var(--ck-c,#d8b56a)}
.ck-bi.c-atk{--ck-c:#f2a65a}.ck-bi.c-def{--ck-c:#7fb2ff}.ck-bi.c-mat{--ck-c:#8fe3b8}.ck-bi.c-mate{--ck-c:#ff7b6b}.ck-bi.c-dev{--ck-c:#c9b6ff}.ck-bi.c-calm{--ck-c:#b9b2a2}
.ck-bi.ck-hov{background:rgba(255,255,255,.07)}
.ck-bt{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px}
/* row 1: the tags (plan · played % / gap); row 2: the title and the move, wrapping on their own line in any language */
.ck-bt .tt{order:3;flex:1 0 100%;min-width:0;line-height:1.45;overflow-wrap:anywhere}
.ck-bt .tg{font-size:11px;font-weight:800;padding:1px 8px;border-radius:6px;background:color-mix(in srgb, var(--ck-c) 22%, transparent);color:var(--ck-c);letter-spacing:.04em;white-space:nowrap}
.ck-bt b{font-size:13.5px;color:var(--text,#eee)}
.ck-bt .mv{font-family:'JetBrains Mono',monospace;font-size:12.5px;color:var(--accent,#d8b56a);white-space:nowrap}
.ck-bt .gp{font-size:11px;padding:1px 7px;border-radius:6px;border:1px solid rgba(255,255,255,.14);color:var(--muted,#aaa);white-space:nowrap}
.ck-bt .gp.g0{color:#8fe3b8;border-color:rgba(143,227,184,.45)}.ck-bt .gp.g1{color:#bcd0ff;border-color:rgba(160,190,255,.4)}.ck-bt .gp.g2{color:#f2c060;border-color:rgba(242,192,96,.45)}.ck-bt .gp.g3{color:#ff8b7d;border-color:rgba(255,139,125,.5)}
.ck-bi p{margin:4px 0 0;font-size:12.8px;line-height:1.7;color:var(--muted,#bbb)}
.ck-tips ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:7px}
.ck-tips li{font-size:13.2px;line-height:1.72;padding-inline-start:13px;position:relative;color:var(--text,#eee)}
.ck-tips li::before{content:'';position:absolute;inset-inline-start:0;top:.72em;width:5px;height:5px;border-radius:50%;background:var(--accent,#d8b56a)}
.ck-tips li.hi::before{background:#ff8b7d;box-shadow:0 0 6px rgba(255,139,125,.7)}
.ck-more{margin-top:7px;border:0;background:none;color:var(--accent,#d8b56a);font:600 12.5px inherit;cursor:pointer;padding:2px 0}
.ck-vd{margin-top:11px;padding:8px 11px;border-radius:10px;display:flex;flex-direction:column;gap:3px;font-size:13px;line-height:1.65;border:1px solid var(--line,rgba(255,255,255,.15))}
.ck-vd b{font-size:14px}
.ck-vd p{margin:0}
.ck-vd.g0{border-color:rgba(143,227,184,.6);background:rgba(143,227,184,.08)}.ck-vd.g0 b{color:#8fe3b8}
.ck-vd.g1{border-color:rgba(160,190,255,.5);background:rgba(160,190,255,.05)}.ck-vd.g1 b{color:#bcd0ff}
.ck-vd.g2{border-color:rgba(242,192,96,.6);background:rgba(242,192,96,.07)}.ck-vd.g2 b{color:#f2c060}
.ck-vd.g3{border-color:rgba(255,139,125,.7);background:rgba(255,139,125,.08)}.ck-vd.g3 b{color:#ff8b7d}
.ck-muted{font-size:13px;line-height:1.7;color:var(--muted,#aaa);margin:0}
.ck-calc{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--muted,#aaa)}
.ck-calc::before{content:'';width:12px;height:12px;border-radius:50%;border:2px solid rgba(255,255,255,.2);border-top-color:var(--accent,#d8b56a);animation:ckspin .8s linear infinite;flex:none}
@keyframes ckspin{to{transform:rotate(360deg)}}
.ck-gl{border-bottom:1px dotted currentColor;cursor:help;text-decoration:none}
.ck-pop{position:fixed;z-index:9999;max-width:min(300px,calc(100vw - 24px));padding:10px 12px;border-radius:10px;background:#1b1712;color:#f1ead9;border:1px solid rgba(216,181,106,.5);box-shadow:0 10px 30px rgba(0,0,0,.5);font-size:12.8px;line-height:1.65;pointer-events:none;opacity:0;transition:opacity .12s}
.ck-pop.show{opacity:1}
.ck-pop b{display:block;color:#e8c67a;font-size:13.5px;margin-bottom:3px}
html[dir=rtl] .ck-pop,html[lang=ar] .ck-pop{direction:rtl;text-align:right}
`;
let cssDone = false;
function css() { if (cssDone) return; cssDone = true; try { const s = document.createElement('style'); s.id = 'coachkit-css'; s.textContent = CSS; document.head.appendChild(s); } catch (e) {} }

function sw(o) {
  css();
  const host = typeof o.mount === 'string' ? document.querySelector(o.mount) : o.mount;
  const el = document.createElement('button'); el.type = 'button'; el.className = 'ck-sw'; el.id = o.id || 'btnCoachSw';
  const sync = () => { const on = !!o.get(), l = o.label(on), h = ICON.coach + `<span>${esc(l.text)}</span><i></i>`; el.classList.toggle('on', on); el.setAttribute('aria-pressed', on ? 'true' : 'false'); if (el.dataset.h !== h) { el.dataset.h = h; el.innerHTML = h; } el.title = l.title || l.text; el.setAttribute('aria-label', l.title || l.text); };
  el.addEventListener('click', () => {
    // keep the view where it is (the card's height changes)
    const sc = window.InfoTabs && InfoTabs.scroller ? InfoTabs.scroller() : (document.scrollingElement || document.documentElement), top = sc.scrollTop;
    o.set(!o.get()); sync();
    // keep the view (the page may get shorter when the coach is switched off: then it ends at the box)
    sc.scrollTop = top; requestAnimationFrame(() => { sc.scrollTop = top; });
  });
  // the switch lives at the top right of the coach card (its heading h3.ck-h); the card re-renders, so re-attach it each time
  const card = document.getElementById(o.card || 'coachCard');
  const place = () => { const h = card && card.querySelector('h3.ck-h'); if (h) { if (el.parentElement !== h) h.appendChild(el); } else if (!card && host && el.parentElement !== host) host.insertBefore(el, host.firstChild); };
  if (card && window.MutationObserver) new MutationObserver(place).observe(card, { childList: true });
  place();
  // same height / corners / frame as the icon buttons next to it (each game sizes its own icon set)
  const fit = () => {
    if (el.closest('.ck-h')) { el.style.height = el.style.borderRadius = el.style.borderColor = el.style.background = ''; return; }
    const sib = [...(el.parentElement ? el.parentElement.children : [])].filter(x => x !== el && x.offsetHeight && /^(BUTTON|A)$/.test(x.tagName)), ref = sib.find(x => !x.classList.contains('on')) || sib[0];
    if (!ref) return;
    const cs = getComputedStyle(ref), h = ref.offsetHeight + 'px';
    if (el.style.height !== h || el.style.borderColor !== cs.borderColor) { el.style.height = h; el.style.borderRadius = cs.borderRadius; el.style.borderColor = cs.borderColor; el.style.background = cs.backgroundColor; }
  };
  if (window.ResizeObserver && host) new ResizeObserver(fit).observe(host);
  addEventListener('resize', fit);
  setTimeout(fit, 0);
  sync();
  return { el, sync };
}
const summary = chips => `<div class="ck-sum">${chips.filter(Boolean).map(c => `<span class="${c.cls || ''}">${esc(c.k)}<b>${c.v}</b></span>`).join('')}</div>`;
const rec = (badge, html, cls) => `<div class="ck-rec"><span class="ck-rb ${cls || ''}">${esc(badge)}</span><p>${html}</p></div>`;
function branches(o) {
  if (!o.items || !o.items.length) return '';
  return `<div class="ck-sec ck-brs"><div class="ck-sec-h"><span>${esc(o.head)}</span>${o.show ? `<button type="button" data-ck="reveal">${esc(o.reveal ? o.hide : o.show)}</button>` : ''}</div>` +
    (o.intro ? `<p class="ck-intro">${o.intro}</p>` : '') +
    `<div class="ck-br">${o.items.map(b => `<div class="ck-bi ${b.cls || ''}"${b.move && o.reveal ? ` data-mv="${esc(b.move)}"` : ''}><div class="ck-bt"><span class="tg">${esc(b.tag)}</span><span class="tt"><b>${b.title}</b>${o.reveal && b.mvName ? ` <span class="mv">${esc(b.mvName)}</span>` : ''}</span>${b.gap ? `<span class="gp ${b.gcls || ''}">${esc(b.gap)}</span>` : ''}</div>${b.text ? `<p>${b.text}</p>` : ''}</div>`).join('')}</div></div>`;
}
function tips(o) {
  if (!o.list || !o.list.length) return '';
  const n = o.n || 3, show = o.open ? o.list : o.list.slice(0, n);
  return `<div class="ck-sec ck-tips"><div class="ck-sec-h"><span>💡 ${esc(o.head)}</span></div><ul>${show.map(x => `<li class="${x.hi ? 'hi' : ''}">${x.html}</li>`).join('')}</ul>` +
    (o.list.length > n ? `<button type="button" class="ck-more" data-ck="more">${esc(o.open ? o.less : o.more)}</button>` : '') + `</div>`;
}
const verdict = (g, title, html) => `<div class="ck-vd g${g}"><b>${title}</b>${html ? `<p>${html}</p>` : ''}</div>`;

// glossary: wrap the first occurrence of each term (longest forms first) in text outside of tags
function gloss(html, dict) {
  if (!dict) return html;
  const forms = [];
  for (const k in dict) for (const m of dict[k].m || []) forms.push([m, k]);
  forms.sort((a, b) => b[0].length - a[0].length);
  const used = new Set();
  const parts = html.split(/(<[^>]+>)/);
  let inGl = 0;
  for (let i = 0; i < parts.length; i++) {
    const s = parts[i]; if (!s) continue;
    if (s[0] === '<') { if (/^<span class="ck-gl/.test(s)) inGl++; else if (inGl && s === '</span>') inGl--; continue; }
    if (inGl) continue;
    let out = s;
    for (const [m, k] of forms) {
      if (used.has(k)) continue;
      const j = out.indexOf(m); if (j < 0) continue;
      // don't split an already wrapped term
      const before = out.slice(0, j);
      if ((before.match(/\u0001/g) || []).length % 2) continue;
      used.add(k);
      out = before + '\u0001' + k + '\u0002' + m + '\u0001' + out.slice(j + m.length);
    }
    parts[i] = out.replace(/\u0001([^\u0002]+)\u0002([^\u0001]*)\u0001/g, (_, k, m) => `<span class="ck-gl" data-g="${k}" tabindex="0">${m}</span>`);
  }
  return parts.join('');
}
// glossary popover (hover on PC, tap on phones); getDict() returns the current language's dict
let pop = null, popFor = null;
function popShow(el, dict) {
  const g = dict && dict[el.dataset.g]; if (!g) return;
  if (!pop) { pop = document.createElement('div'); pop.className = 'ck-pop'; document.body.appendChild(pop); }
  pop.innerHTML = `<b>${esc(g.t)}</b>${esc(g.d)}`; popFor = el;
  const r = el.getBoundingClientRect(); pop.style.left = '0px'; pop.style.top = '0px'; pop.classList.add('show');
  const w = pop.offsetWidth, h = pop.offsetHeight;
  let x = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), innerWidth - w - 12), y = r.top - h - 8;
  if (y < 8) y = r.bottom + 8;
  pop.style.left = x + 'px'; pop.style.top = y + 'px';
}
function popHide() { if (pop) pop.classList.remove('show'); popFor = null; }
function glossBind(getDict) {
  if (glossBind.done) return; glossBind.done = true;
  const fine = matchMedia('(hover:hover) and (pointer:fine)');
  document.addEventListener('mouseover', e => { if (!fine.matches) return; const el = e.target.closest && e.target.closest('.ck-gl'); if (el) popShow(el, getDict()); else if (popFor) popHide(); });
  document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('.ck-gl'); if (el) { e.stopPropagation(); if (popFor === el) popHide(); else popShow(el, getDict()); return; } popHide(); }, true);
  addEventListener('scroll', popHide, true);
}
// buttons inside a rendered card
function bind(root, o) {
  if (!root) return;
  root.querySelectorAll('[data-ck=more]').forEach(b => b.onclick = e => { e.stopPropagation(); o.onMore && o.onMore(); });
  root.querySelectorAll('[data-ck=reveal]').forEach(b => b.onclick = e => { e.stopPropagation(); o.onReveal && o.onReveal(); });
  if (o.onHover) root.querySelectorAll('.ck-bi[data-mv]').forEach(b => {
    // mouse: hover shows the move; touch: a tap toggles it (the emulated mouseenter of a tap must not cancel the tap)
    b.onpointerenter = e => { if (e.pointerType !== 'mouse') return; b.classList.add('ck-hov'); o.onHover(b.dataset.mv); };
    b.onpointerleave = e => { if (e.pointerType !== 'mouse') return; b.classList.remove('ck-hov'); o.onHover(null); };
    // iOS Safari reports pointerType 'mouse' (or nothing) on the click of a tap → take it from the pointerdown
    b.onpointerdown = e => { b._pt = e.pointerType; };
    b.onclick = e => {
      const pt = b._pt || e.pointerType; b._pt = null; if (pt === 'mouse') return;
      const mv = b.dataset.mv, on = !(root.dataset.ckSel === mv); delete root.dataset.ckSel;
      root.querySelectorAll('.ck-bi.ck-hov').forEach(x => x.classList.remove('ck-hov'));
      if (on) { root.dataset.ckSel = mv; b.classList.add('ck-hov'); }
      o.onHover(on ? mv : null);
      if (on) showBoard();
    };
  });
  // a re-render keeps the tapped move selected
  if (o.onHover && root.dataset.ckSel) {
    const r = [...root.querySelectorAll('.ck-bi[data-mv]')].find(x => x.dataset.mv === root.dataset.ckSel);
    if (r) { r.classList.add('ck-hov'); o.onHover(r.dataset.mv); } else { delete root.dataset.ckSel; o.onHover(null); }
  }
}
// phones: after a tap, if the board is mostly out of sight, scroll it into view so the arrow can be seen
function showBoard() {
  const bd = document.querySelector('.board-area'); if (!bd) return;
  const sc = window.InfoTabs && InfoTabs.scroller ? InfoTabs.scroller() : (document.scrollingElement || document.documentElement);
  const isDoc = sc === document.scrollingElement || sc === document.documentElement;
  const vt = isDoc ? 0 : sc.getBoundingClientRect().top, vb = isDoc ? innerHeight : sc.getBoundingClientRect().bottom;
  const r = bd.getBoundingClientRect(), seen = Math.max(0, Math.min(r.bottom, vb) - Math.max(r.top, vt));
  if (seen >= Math.min(r.height, vb - vt) * .8) return;
  const dy = r.top - vt - 4;
  (isDoc ? window : sc).scrollBy({ top: dy, behavior: 'smooth' });
}
// a short notice in the middle of what is on screen now (the page is not scrolled to show it)
let flashEl = null, flashT = 0;
function flash(msg, ms) {
  css();
  if (!flashEl) { flashEl = document.createElement('div'); flashEl.className = 'ck-flash'; flashEl.setAttribute('role', 'status'); document.body.appendChild(flashEl); }
  flashEl.textContent = msg; flashEl.classList.remove('show'); void flashEl.offsetWidth; flashEl.classList.add('show');
  clearTimeout(flashT); flashT = setTimeout(() => flashEl.classList.remove('show'), ms || 1300);
}
window.CoachKit = { flash, css, sw, summary, rec, branches, tips, verdict, gloss, glossBind, bind, esc, ICON };
})();
