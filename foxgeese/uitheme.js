/* Fox and Geese — the page's UI theme follows the board (2026-11-18, user: ひだまり牧場を既定にして、UIスキンを色から文字まで
   この盤に合うように。他の盤を選んだときは今のUIの延長線上で、テーマカラーだけオーク材に合わせる).
   html[data-ui=meadow]: a light, rounded, pastel UI (cream cards, grass-green lines, Zen Maru Gothic).
   html[data-ui=oak]: the dark UI as before, its olive hues turned to the warm brown of oak.
   The page and the shared components (header bar, dialogs, coach, …) set their colours in many places, so instead of copying every
   rule this reads the style sheets once and writes, for each theme, override rules under html[data-ui=…] with the colours mapped
   (light text → dark text, dark panels → cream, …). Style sheets added later (components that inject theirs) are converted when they
   appear. The board, the pieces and the marks on the board are left alone. Not used with the portal skin (?skin=atlas). */
(function () {
  const H = document.documentElement;
  if (H.classList.contains('atlas-skin')) return;
  const SKIP = /(board|\.lines|\.pieces|\.pc\b|\.rv\b|\.dest|\.mark|\.hov|hintlbl|sqfx|fxsvg|pdisc|fgic|\.frame|\.reserve|bdm|\.mini\b|ck-arrow|evalbar|confetti|kifu button i|rv-list \.mv i)/;
  const OWN = 'fg-uitheme';
  const parse = v => {
    let m = v.match(/^rgba?\(([^)]+)\)$/);
    if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(x => x.endsWith('%') ? parseFloat(x) / 100 : Number(x)); return [p[0], p[1], p[2], p[3] ?? 1]; }
    m = v.match(/^#([0-9a-f]{3,8})$/i);
    if (m) { let h = m[1]; if (h.length <= 4) h = h.split('').map(c => c + c).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length > 6 ? parseInt(h.slice(6, 8), 16) / 255 : 1]; }
    return null;
  };
  const lum = ([r, g, b]) => (.2126 * r + .7152 * g + .0722 * b) / 255;
  const rgba = (r, g, b, a) => `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${+(+a).toFixed(3)})`;
  function toHsl([r, g, b]) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; }
  function fromHsl(h, s, l) { const f = n => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))); }; return [f(0), f(8), f(4)]; }

  // ---------------------------------------------------------------- the two mappings: (colour, role) → colour or null (unchanged)
  const MAP = {
    // the warm oak: olive and yellow-green hues → amber brown, the rest as it is
    oak(c) {
      const [h, s, l] = toHsl(c);
      if (s < .12 || h < 48 || h > 125) return null;
      const [r, g, b] = fromHsl(30 + (h - 48) * .12, Math.min(1, s * 1.05), l);
      return rgba(r, g, b, c[3]);
    },
    meadow(c, role) {
      const L = lum(c), [h, s, l] = toHsl(c);
      if (role === 'fg') {
        if (L < .5) return null;                                                // dark text on a light button stays
        if (s > .3) { const [r, g, b] = fromHsl(h, Math.min(1, s * .9), Math.min(.42, l * .5)); return rgba(r, g, b, Math.max(.85, c[3])); }
        return rgba(62, 70, 40, Math.max(.6, Math.min(1, c[3] * 1.05)));        // light neutral text → dark olive brown
      }
      if (role === 'bg') {
        if (L < .35 && c[3] > .55) return rgba(255 - (.35 - L) * 8, 252 - (.35 - L) * 6, 240 - (.35 - L) * 18, Math.min(1, c[3] + .05));   // dark panel → cream
        if (L < .35) return rgba(110, 160, 70, c[3] * .3);                      // dark wash → soft grass tint
        if (L > .8 && c[3] < .4) return rgba(90, 140, 50, Math.min(.18, c[3] * 1.2 + .03));   // faint white tint → faint green
        return null;
      }
      if (role === 'bd') {
        if (L > .55 && c[3] < .7) return rgba(120, 170, 80, Math.min(.75, c[3] * 1.6 + .15));
        if (L < .35) return rgba(186, 214, 150, Math.max(.7, c[3]));
        return null;
      }
      if (role === 'sh') {   // shadows / glows
        if (L < .2) return rgba(70, 90, 40, Math.min(.22, c[3] * .5));          // soft, green-grey shadows on the light page
        return null;
      }
      return null;
    },
  };
  const COLOR_RE = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi;
  function mapAll(v, mode, role) {
    let changed = false;
    const out = v.replace(COLOR_RE, t => { const p = parse(t); const n = p && MAP[mode](p, role); if (n) { changed = true; return n; } return t; });
    return changed ? out : null;
  }
  const PROPS = [['color', 'fg'], ['fill', 'fg'], ['stroke', 'fg'], ['caret-color', 'fg'], ['-webkit-text-fill-color', 'fg'],
    ['background-color', 'bg'], ['background-image', 'bg'], ['background', 'bg'],
    ['border-color', 'bd'], ['border-top-color', 'bd'], ['border-bottom-color', 'bd'], ['border-left-color', 'bd'], ['border-right-color', 'bd'], ['outline-color', 'bd'],
    ['border', 'bd'], ['border-top', 'bd'], ['border-bottom', 'bd'], ['border-left', 'bd'], ['border-right', 'bd'],
    ['box-shadow', 'sh'], ['text-shadow', 'sh']];
  const FONT_SERIF = /Shippori|Cormorant|Zen Kaku/;
  function convertRule(r, mode) {
    const st = r.style, out = [];
    for (const [k, role] of PROPS) {
      const v = st.getPropertyValue(k); if (!v || !/#[0-9a-f]{3,8}\b|rgba?\(/i.test(v)) continue;
      if (role === 'sh' && mode === 'meadow') { const n = mapAll(v, mode, 'sh'); if (n) out.push(`${k}:${n}${st.getPropertyPriority(k) ? '!important' : ''}`); continue; }
      if (role === 'sh') continue;
      const n = mapAll(v, mode, role === 'bg' && /gradient/.test(v) ? 'bg' : role);
      if (n) out.push(`${k}:${n}${st.getPropertyPriority(k) ? '!important' : ''}`);
    }
    for (let i = 0; i < st.length; i++) {   // the page's and the components' own colour variables (e.g. --ngl-pbg)
      const k = st[i]; if (!k.startsWith('--')) continue;
      const v = st.getPropertyValue(k); if (!v || !/#[0-9a-f]{3,8}\b|rgba?\(/i.test(v)) continue;
      let role = /sh\b|shadow|glow|-psh/.test(k) ? 'sh' : /bd\b|border|line|rim|-pbd/.test(k) ? 'bd' : /bg\b|panel|card|fill|wash|back|felt|-pbg/.test(k) ? 'bg' : /fg\b|text|ink|txt/.test(k) ? 'fg' : null;
      if (!role) { const m0 = v.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/i), c0 = m0 && parse(m0[0]); role = c0 && (c0[3] < .35 || lum(c0) < .45) ? 'bg' : 'fg'; }   // (a faint tint is a background — e.g. the record dialog's --gc: 2026-11-18 fix)
      if (role === 'sh' && mode !== 'meadow') continue;
      const n = mapAll(v, mode, role); if (n) out.push(`${k}:${n}`);
    }
    if (mode === 'meadow') {
      const f = st.getPropertyValue('font-family');
      if (f && FONT_SERIF.test(f)) out.push(`font-family:'Zen Maru Gothic','M PLUS Rounded 1c',${f}${st.getPropertyPriority('font-family') ? '!important' : ''}`);
    }
    if (!out.length) return '';
    const sel = r.selectorText.split(',').map(x => x.trim()).map(x => /^(html|:root)\b/.test(x) ? x.replace(/^(html|:root)/, `html[data-ui=${mode}]`) : `html[data-ui=${mode}] ${x}`).join(',');
    return `${sel}{${out.join(';')}}`;
  }
  function convertList(list, mode) {
    let s = '';
    for (const r of list) {
      if (r.cssRules && !r.selectorText) {   // @media / @supports / @container: keep the wrapper
        const inner = convertList(r.cssRules, mode); if (!inner) continue;
        const head = r.cssText.slice(0, r.cssText.indexOf('{'));
        if (/^@(media|supports|container)/.test(head)) s += `${head}{${inner}}`;
        continue;
      }
      if (!r.style || !r.selectorText || SKIP.test(r.selectorText)) continue;
      s += convertRule(r, mode);
    }
    return s;
  }
  const done = new WeakSet();
  let outEl = null, baseEl = null;
  function convertSheets() {
    let add = '';
    for (const sh of document.styleSheets) {
      if (done.has(sh) || (sh.ownerNode && (sh.ownerNode.id || '').startsWith(OWN))) continue;
      let rules; try { rules = sh.cssRules; } catch (e) { done.add(sh); continue; }
      if (!rules) continue;
      done.add(sh);
      if (sh.href && /atlas\/skin\//.test(sh.href)) continue;
      add += convertList(rules, 'oak') + convertList(rules, 'meadow');
    }
    if (add) {
      if (!outEl) { outEl = document.createElement('style'); outEl.id = OWN; document.head.appendChild(outEl); }
      outEl.textContent += add;
    }
    if (!baseEl) { baseEl = document.createElement('style'); baseEl.id = OWN + '-base'; baseEl.textContent = BASE; }
    if (document.head.lastElementChild !== baseEl) document.head.appendChild(baseEl);   // the hand-written rules come last
  }
  // ---------------------------------------------------------------- hand-written rules for the two themes (the page's variables and the
  // few places the mapping cannot know about); appended after the converted rules
  const BASE = `
html[data-ui=oak]{--bg:#150f0a;--bg2:#21170e;--panel:#2b1e13;--panel2:#3b2a1a;--line:#7b5a37;--muted:#e2d4bc;--dim:#ab957a;--felt:#7a4a22;--felt2:#5e3818;--felt3:#33200e}
html[data-ui=oak] body{background:radial-gradient(1200px 700px at 28% -10%,#4d3218 0%,transparent 60%),radial-gradient(900px 600px at 110% 110%,#3a2414 0%,transparent 60%),var(--bg)}
html[data-ui=meadow]{--bg:#eef6df;--bg2:#e3efcc;--panel:#fffdf4;--panel2:#f3f8e6;--line:#b5d495;--text:#3d4329;--muted:#55603d;--dim:#86906a;--felt:#8fcf6a;--felt2:#76b955;--felt3:#5b9a3e;--brass:#e0883a;--brass2:#c8702a;--accent:#e57a2e;--red:#e0503f;--good:#3fa465;color-scheme:light}
html[data-ui=meadow] body{background:radial-gradient(1100px 600px at 18% -12%,#fffbe4 0%,transparent 62%),radial-gradient(900px 640px at 105% 108%,#d4ecb4 0%,transparent 60%),linear-gradient(180deg,#e9f5d6 0%,#f4f1dc 100%);color:var(--text);font-family:'Zen Maru Gothic','M PLUS Rounded 1c','Noto Sans Devanagari','Noto Sans Arabic',system-ui,sans-serif}
html[data-ui=meadow] :is(.card,.modal,.side .card){border-radius:22px}
html[data-ui=meadow] :is(.btn,.mbtn,button.pill){border-radius:999px}
html[data-ui=meadow] .card{background:#fffdf4;box-shadow:0 0 0 2px #dcebc4,0 10px 24px -14px rgba(80,110,40,.35)}
html[data-ui=meadow] .modal{background:#fffdf6;box-shadow:0 0 0 3px #d3e8b6,0 24px 60px -20px rgba(60,90,30,.45)}
html[data-ui=meadow] .overlay{background:rgba(90,120,60,.32)}
html[data-ui=meadow] :is(.mbtn.go,#btnStart,.mbtn.primary){background:linear-gradient(180deg,#ffa25a,#ee7a2c)!important;color:#fff!important;box-shadow:0 6px 14px -6px rgba(200,100,30,.6),inset 0 -2px 0 rgba(150,60,10,.25)!important;border:0!important}
html[data-ui=meadow] .lines .num{font-family:'Zen Maru Gothic',system-ui,sans-serif}
html[data-ui=meadow] .reserve :is(.rsv-l,.rsv-w,.rsv-plate),html[data-ui=meadow] .reserve .rsv-plate :is(.rsv-l,.rsv-w,.rsv-q) b,html[data-ui=meadow] .reserve .rsv-plate.rsv-q b{font-family:'Zen Maru Gothic',system-ui,sans-serif!important;font-weight:900}
`;
  if (!document.getElementById('fg-meadow-font')) {   // the rounded face of the meadow UI
    const f = document.createElement('link'); f.id = 'fg-meadow-font'; f.rel = 'stylesheet';
    f.href = 'https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&display=swap'; document.head.appendChild(f);
  }
  window.FgUiTheme = { refresh: convertSheets };
  const run = () => { try { convertSheets(); } catch (e) { console.warn('uitheme', e); } H.classList.add('ui-ready'); };
  run();
  new MutationObserver(() => run()).observe(document.head, { childList: true });
  addEventListener('load', run);
})();
