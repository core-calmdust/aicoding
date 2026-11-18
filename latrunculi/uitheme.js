/* Ludus Latrunculorum — the page's UI theme (2026-11-19, user: テーマカラーも遺跡っぽさを強調した感じに): the purple of the old theme
   becomes dusty sandstone and earth. Same method as foxgeese/uitheme.js: the page's and the shared components' style sheets are
   read once and override rules are written under html[data-ui=ruin] with the colours mapped (purple / magenta hues → warm stone
   brown, a little desaturated; reds, greens and neutrals stay). The board, the pieces and the marks are left alone. Not used with
   the portal skin (?skin=atlas). */
(function () {
  const H = document.documentElement;
  if (H.classList.contains('atlas-skin')) return;
  const SKIP = /(board|\.lines|\.pieces|\.pc\b|\.rv\b|\.dest|\.mark|\.hov|hintlbl|sqfx|fxsvg|pdisc|fgic|\.frame|\.reserve|bdm|\.mini\b|ck-arrow|evalbar|confetti|kifu button i|rv-list \.mv i)/;
  const OWN = 'lt-uitheme';
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
    ruin(c, role) {
      const [h, s, l] = toHsl(c);
      if (role === 'bg' && s >= .1 && h >= 195 && h <= 255 && l < .32) { const [r, g, b] = fromHsl(30, Math.min(.35, s * .5), l * .95); return rgba(r, g, b, c[3]); }   // dark navy bars (the online dock) → dark earth
      if (s < .1 || h < 262 || h > 352) return null;
      const [r, g, b] = fromHsl(28 + (h - 262) * .1, Math.min(1, s * .72), l * (role === 'bg' ? .96 : 1));
      return rgba(r, g, b, c[3]);
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
      const n = mapAll(v, mode, role === 'bg' && /gradient/.test(v) ? 'bg' : role);
      if (n) out.push(`${k}:${n}${st.getPropertyPriority(k) ? '!important' : ''}`);
    }
    for (let i = 0; i < st.length; i++) {   // the page's and the components' own colour variables (e.g. --ngl-pbg)
      const k = st[i]; if (!k.startsWith('--')) continue;
      const v = st.getPropertyValue(k); if (!v || !/#[0-9a-f]{3,8}\b|rgba?\(/i.test(v)) continue;
      let role = /sh\b|shadow|glow|-psh/.test(k) ? 'sh' : /bd\b|border|line|rim|-pbd/.test(k) ? 'bd' : /bg\b|panel|card|fill|wash|back|felt|-pbg/.test(k) ? 'bg' : /fg\b|text|ink|txt/.test(k) ? 'fg' : null;
      if (!role) { const m0 = v.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/i), c0 = m0 && parse(m0[0]); role = c0 && (c0[3] < .35 || lum(c0) < .45) ? 'bg' : 'fg'; }   // (a faint tint is a background — e.g. the record dialog's --gc: 2026-11-18 fix)
      const n = mapAll(v, mode, role); if (n) out.push(`${k}:${n}`);
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
      add += convertList(rules, 'ruin');
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
html[data-ui=ruin]{--bg:#140f0b;--bg2:#1f1812;--panel:#2a2119;--panel2:#3a2e22;--line:#6f5c44;--muted:#e3d6bf;--dim:#a99880;--felt:#857055;--felt2:#6a583f;--felt3:#3a2e20;--accent:#f0d39e}
html[data-ui=ruin] body{background:radial-gradient(1200px 700px at 26% -12%,#4a3826 0%,transparent 60%),radial-gradient(900px 620px at 110% 110%,#3b2c1d 0%,transparent 60%),var(--bg)}
`;
  window.LtUiTheme = { refresh: convertSheets };
  const run = () => { try { convertSheets(); } catch (e) { console.warn('uitheme', e); } H.classList.add('ui-ready'); };
  run();
  new MutationObserver(() => run()).observe(document.head, { childList: true });
  addEventListener('load', run);
})();
