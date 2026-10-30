// RecordExport — 棋譜の書き出し・局面図（画像）の共有ダイアログ for the 世界のボドゲ大全 board games (same idea as the
// shogi page's 共有 dialog: KIF / KI2 / CSA / USI / URL / 局面図).
//
// The dialog is built with the page's own .overlay / .modal / .seg / .mbtn classes, so it takes each game's theme.
// Text formats: copy to the clipboard or download as a file. Image: PNG at 2x, share through the Web Share API when the
// device can share files (phones), else copy the image to the clipboard (falls back to a download).
//
// Usage (in a game page):
//   RecordExport.attach({
//     btn: '#btnShare', key: 'chess', title: 'Chess',
//     lang: () => LANG, toast: (m) => toast(m), show / hide: optional overlay show / hide functions,
//     empty: () => !moves.length,                       // nothing to export -> toast tx('empty')
//     formats: () => [{ id: 'pgn', label: 'PGN', ext: 'pgn', text: () => pgnText() }, ...],
//     url: () => shareUrl(),                            // optional: adds a URL tab (shared on phones with navigator.share)
//     image: { modes: ['board', 'moves'], draw: async mode => canvas }   // optional: adds the 局面図 tab
//   })
// Canvas helpers for the diagrams: RecordExport.sheet({...}) lays out a white sheet (caption, players, board, optional
// move list, site URL) and calls back to draw the board; RecordExport.loadImg(src) / RecordExport.fonts() / RecordExport.tx().
(function () {
'use strict';
const TX = {
  ja: { title: '棋譜・局面図', img: '局面図', board: '盤面', moves: '手順つき', num: '手順番号', download: 'ダウンロード', copy: 'コピー', share: '共有', copyUrl: 'URLをコピー', copied: 'コピーしました', saved: '保存しました', close: '閉じる', empty: '棋譜がありません', btnT: '棋譜を一般的な形式で書き出し・局面図を画像で共有', start: '開始局面', after: '{n}手目 {m} まで', toMove: '{s}の番', record: '棋譜', vs: '対', ttl: 'タイトル', date: '日付を入れる' },
  en: { title: 'Record & diagram', img: 'Diagram', board: 'Board', moves: 'With moves', num: 'Numbered', download: 'Download', copy: 'Copy', share: 'Share', copyUrl: 'Copy URL', copied: 'Copied', saved: 'Saved', close: 'Close', empty: 'No moves yet', btnT: 'Export the record in standard formats or share a diagram image', start: 'Starting position', after: 'After move {n}: {m}', toMove: '{s} to move', record: 'Moves', vs: 'vs', ttl: 'Title', date: 'Include date' },
  zh: { title: '棋谱・局面图', img: '局面图', board: '盘面', moves: '附棋谱', num: '手顺编号', download: '下载', copy: '复制', share: '分享', copyUrl: '复制链接', copied: '已复制', saved: '已保存', close: '关闭', empty: '还没有棋谱', btnT: '以通用格式导出棋谱，或以图片分享局面图', start: '初始局面', after: '第{n}手 {m} 之后', toMove: '{s}走', record: '棋谱', vs: '对', ttl: '标题', date: '加入日期' },
  ko: { title: '기보・국면도', img: '국면도', board: '판면', moves: '수순 포함', num: '수순 번호', download: '다운로드', copy: '복사', share: '공유', copyUrl: 'URL 복사', copied: '복사했습니다', saved: '저장했습니다', close: '닫기', empty: '기보가 없습니다', btnT: '기보를 표준 형식으로 내보내거나 국면도를 이미지로 공유', start: '시작 국면', after: '{n}수째 {m} 까지', toMove: '{s} 차례', record: '기보', vs: '대', ttl: '제목', date: '날짜 넣기' },
  es: { title: 'Partida y diagrama', img: 'Diagrama', board: 'Tablero', moves: 'Con jugadas', num: 'Numerado', download: 'Descargar', copy: 'Copiar', share: 'Compartir', copyUrl: 'Copiar URL', copied: 'Copiado', saved: 'Guardado', close: 'Cerrar', empty: 'Aún no hay jugadas', btnT: 'Exportar la partida en formatos estándar o compartir un diagrama', start: 'Posición inicial', after: 'Tras la jugada {n}: {m}', toMove: 'Juegan {s}', record: 'Jugadas', vs: 'vs', ttl: 'Título', date: 'Incluir fecha' },
  fr: { title: 'Partie et diagramme', img: 'Diagramme', board: 'Plateau', moves: 'Avec coups', num: 'Numéroté', download: 'Télécharger', copy: 'Copier', share: 'Partager', copyUrl: "Copier l'URL", copied: 'Copié', saved: 'Enregistré', close: 'Fermer', empty: 'Aucun coup pour le moment', btnT: 'Exporter la partie aux formats standard ou partager un diagramme', start: 'Position initiale', after: 'Après le coup {n} : {m}', toMove: 'Trait aux {s}', record: 'Coups', vs: 'contre', ttl: 'Titre', date: 'Inclure la date' },
  pt: { title: 'Partida e diagrama', img: 'Diagrama', board: 'Tabuleiro', moves: 'Com lances', num: 'Numerado', download: 'Baixar', copy: 'Copiar', share: 'Compartilhar', copyUrl: 'Copiar URL', copied: 'Copiado', saved: 'Salvo', close: 'Fechar', empty: 'Ainda não há lances', btnT: 'Exportar a partida em formatos padrão ou compartilhar um diagrama', start: 'Posição inicial', after: 'Após o lance {n}: {m}', toMove: 'Vez das {s}', record: 'Lances', vs: 'x', ttl: 'Título', date: 'Incluir data' },
  de: { title: 'Partie & Diagramm', img: 'Diagramm', board: 'Brett', moves: 'Mit Zügen', num: 'Nummeriert', download: 'Herunterladen', copy: 'Kopieren', share: 'Teilen', copyUrl: 'URL kopieren', copied: 'Kopiert', saved: 'Gespeichert', close: 'Schließen', empty: 'Noch keine Züge', btnT: 'Partie in Standardformaten exportieren oder ein Diagramm teilen', start: 'Ausgangsstellung', after: 'Nach Zug {n}: {m}', toMove: '{s} am Zug', record: 'Züge', vs: 'gegen', ttl: 'Titel', date: 'Datum einfügen' },
  hi: { title: 'रिकॉर्ड और आरेख', img: 'आरेख', board: 'बोर्ड', moves: 'चालों सहित', num: 'क्रमांकित', download: 'डाउनलोड', copy: 'कॉपी', share: 'शेयर', copyUrl: 'URL कॉपी करें', copied: 'कॉपी हो गया', saved: 'सहेजा गया', close: 'बंद करें', empty: 'अभी कोई चाल नहीं', btnT: 'रिकॉर्ड को मानक प्रारूपों में निर्यात करें या आरेख छवि साझा करें', start: 'आरंभिक स्थिति', after: 'चाल {n} के बाद: {m}', toMove: '{s} की बारी', record: 'चालें', vs: 'बनाम', ttl: 'शीर्षक', date: 'तारीख शामिल करें' },
  ar: { title: 'السجل والمخطط', img: 'مخطط', board: 'اللوحة', moves: 'مع النقلات', num: 'مرقّم', download: 'تنزيل', copy: 'نسخ', share: 'مشاركة', copyUrl: 'نسخ الرابط', copied: 'تم النسخ', saved: 'تم الحفظ', close: 'إغلاق', empty: 'لا توجد نقلات بعد', btnT: 'تصدير السجل بصيغ قياسية أو مشاركة صورة المخطط', start: 'الوضع الابتدائي', after: 'بعد النقلة {n}: {m}', toMove: 'دور {s}', record: 'النقلات', vs: 'ضد', ttl: 'العنوان', date: 'إدراج التاريخ' },
};
let O = null, ov = null, fmt = '', mode = '', blob = null, job = 0;
const L = () => { const l = (O && O.lang && O.lang()) || 'ja'; return TX[l] ? l : 'en'; };
function tx(k, v, lang) { const l = lang ? (TX[lang] ? lang : 'en') : L(); let x = TX[l][k]; if (x === undefined) x = TX.en[k]; if (x === undefined) x = k; if (v) x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] != null ? v[y] : ''); return x; }
const pad2 = n => String(n).padStart(2, '0');
const stamp = () => { const d = new Date(); return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}_${pad2(d.getHours())}${pad2(d.getMinutes())}`; };
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// ---- title / date settings (per game, remembered): RecordExport.meta(key) -> { title, date: bool, day: Date }
function meta(key) {
  key = key || (O && O.key) || ''; let title = '', date = true;
  try { title = localStorage.getItem('rx-title-' + key) || ''; date = localStorage.getItem('rx-date-' + key) !== '0'; } catch (e) {}
  return { title: title.trim(), date, day: new Date() };
}
function setMeta(key, m) { try { if (m.title != null) localStorage.setItem('rx-title-' + key, m.title); if (m.date != null) localStorage.setItem('rx-date-' + key, m.date ? '1' : '0'); } catch (e) {} }
const LOC = { zh: 'zh-CN', hi: 'hi-IN', pt: 'pt-BR' };
function dateText(d, lang) { lang = lang || L(); try { return new Intl.DateTimeFormat(LOC[lang] || lang, { year: 'numeric', month: 'long', day: 'numeric' }).format(d); } catch (e) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; } }
// puts the title / date into a record text: PGN-style tag headers ([Event] / [Date], also "; [..]" .mat headers:
// Event / EventDate) and SGF (GN[] / DT[]). Other formats are returned unchanged.
function applyMeta(s, m) {
  if (typeof s !== 'string' || !s) return s;
  const d = m.day, ymd = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  if (/^\s*\(;/.test(s)) {
    const e = v => v.replace(/[\]\\]/g, '\\$&'), prop = k => new RegExp(k + '\\[(?:\\\\.|[^\\]\\\\])*\\]');
    s = s.replace(prop('GN'), '').replace(prop('DT'), '');
    const ins = (m.title ? `GN[${e(m.title)}]` : '') + (m.date ? `DT[${ymd}]` : '');
    let k = s.indexOf('(;') + 2, br = false;   // end of the root node: the next ';' / '(' / ')' outside a [value]
    for (; k < s.length; k++) { const c = s[k]; if (br) { if (c === '\\') k++; else if (c === ']') br = false; } else if (c === '[') br = true; else if (c === ';' || c === '(' || c === ')') break; }
    while (k > 0 && /\s/.test(s[k - 1])) k--;
    return s.slice(0, k) + ins + s.slice(k);
  }
  const ls = s.split('\n'), re = /^(; )?\[(\w+(?: \w+)*) "((?:\\.|[^"\\])*)"\]\s*$/;
  let n = 0; while (n < ls.length && re.test(ls[n])) n++;
  if (!n) return s;
  const pre = re.exec(ls[0])[1] || '', q = v => v.replace(/[\\"]/g, '\\$&');
  const dot = ymd.replace(/-/g, '.'), hdr = ls.slice(0, n), idx = k => hdr.findIndex(x => re.exec(x)[2] === k);
  if (m.title) { const i = idx('Event'), ln = `${pre}[Event "${q(m.title)}"]`; if (i >= 0) hdr[i] = ln; else hdr.splice(pre ? 0 : idx('Game') + 1, 0, ln); }
  let i = idx('Date'); if (i >= 0) hdr[i] = `${pre}[Date "${m.date ? dot : '????.??.??'}"]`;
  i = idx('EventDate'); if (i >= 0) { if (m.date) hdr[i] = `${pre}[EventDate "${dot}"]`; else hdr.splice(i, 1); }
  return hdr.concat(ls.slice(n)).join('\n');
}
const cleanTitle = t => String(t || '').split(/\s[|｜—–-]\s|[|｜]/)[0].trim();
function toast(m) { if (O && O.toast) O.toast(m); }
function download(b, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); }
function show() { if (O.show) O.show(ov); else ov.classList.add('show'); }
function hide() { if (O.hide) O.hide(ov); else ov.classList.remove('show'); }
function build() {
  if (ov) return;
  ov = document.createElement('div'); ov.className = 'overlay rx-ov'; ov.id = 'rxOverlay';
  ov.innerHTML = `<div class="modal" style="width:min(580px,100%)"><h2 class="rx-h"></h2>
<div class="rx-meta" style="display:flex;gap:6px 12px;align-items:center;flex-wrap:wrap;margin-bottom:10px;font-size:13px"><label style="flex:1 1 220px;display:flex;align-items:center;gap:8px;min-width:0"><span class="rx-tl" style="white-space:nowrap;opacity:.85"></span><input class="rx-ttl" type="text" maxlength="60" autocomplete="off" spellcheck="false" style="flex:1;min-width:0;font:inherit;font-size:16px;padding:6px 10px;border-radius:9px;border:1px solid var(--line,rgba(255,255,255,.18));background:rgba(0,0,0,.22);color:var(--text,#eee)"></label><label style="display:flex;align-items:center;gap:6px;white-space:nowrap;cursor:pointer"><input class="rx-date" type="checkbox" style="width:18px;height:18px;margin:0;accent-color:var(--accent,#d4a24c)"><span class="rx-dt"></span></label></div>
<div class="seg rx-fmt" style="margin-bottom:10px;flex-wrap:wrap"></div>
<div class="rx-stage" style="height:var(--rx-sh,min(56vh,600px));display:flex;flex-direction:column;min-height:0"><textarea class="rx-text" readonly spellcheck="false" style="width:100%;flex:1 1 auto;min-height:0;height:auto;overflow:auto;background:rgba(0,0,0,.28);color:var(--text,#eee);border:1px solid var(--line,rgba(255,255,255,.14));border-radius:10px;padding:10px;font:12px/1.55 'JetBrains Mono',ui-monospace,monospace;resize:none;white-space:pre-wrap;word-break:break-all;direction:ltr;text-align:left"></textarea>
<div class="rx-img" style="display:none;flex:1 1 auto;min-height:0;flex-direction:column;align-items:center;text-align:center"><div class="seg rx-mode" style="margin-bottom:8px;flex:none"></div><div style="flex:1 1 auto;min-height:0;width:100%;display:flex;align-items:center;justify-content:center"><img class="rx-prev" alt="" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;border:1px solid var(--line,rgba(255,255,255,.14));background:#fff"></div></div></div>
<div class="modal-actions"><button class="mbtn rx-close"></button><button class="mbtn rx-dl"></button><button class="mbtn go rx-copy"></button></div></div>`;
  document.body.appendChild(ov);
  const q = s => ov.querySelector(s);
  ov.addEventListener('click', e => { if (e.target === ov) hide(); });
  q('.rx-close').onclick = hide;
  let tm = 0;
  const ti = q('.rx-ttl');
  ['keydown', 'keyup', 'keypress'].forEach(t => ti.addEventListener(t, e => { if (e.key !== 'Escape') e.stopPropagation(); if (t === 'keydown' && e.key === 'Enter') ti.blur(); }));
  ti.addEventListener('input', () => { setMeta(O.key, { title: ti.value }); clearTimeout(tm); tm = setTimeout(render, fmt === 'img' ? 220 : 0); });
  q('.rx-date').onchange = e => { setMeta(O.key, { date: e.target.checked }); render(); };
  q('.rx-fmt').onclick = e => { const b = e.target.closest('button'); if (!b) return; fmt = b.dataset.v; try { localStorage.setItem('rx-fmt-' + O.key, fmt); } catch (er) {} render(); };
  q('.rx-mode').onclick = e => { const b = e.target.closest('button'); if (!b) return; mode = b.dataset.v; try { localStorage.setItem('rx-mode-' + O.key, mode); } catch (er) {} render(); };
  q('.rx-dl').onclick = () => {
    if (fmt === 'img') { if (blob) download(blob, `${O.key}_${stamp()}.png`); return; }
    const f = fmtList().find(x => x.id === fmt), ext = f ? f.ext || 'txt' : 'txt';
    download(new Blob([q('.rx-text').value], { type: (f && f.mime) || 'text/plain;charset=utf-8' }), `${O.key}_${stamp()}.${ext}`);
  };
  q('.rx-copy').onclick = async () => {
    if (fmt === 'img') {
      if (!blob) return;
      const file = new File([blob], `${O.key}_${stamp()}.png`, { type: 'image/png' });
      try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: O.title || '' }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
      try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); toast(tx('copied')); } catch (e) { download(blob, file.name); }
      return;
    }
    const v = q('.rx-text').value;
    if (fmt === 'url' && navigator.share && matchMedia('(pointer: coarse)').matches) { try { await navigator.share({ title: O.title || '', url: v }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(v); toast(tx('copied')); } catch (e) { const ta = q('.rx-text'); ta.focus(); ta.select(); }
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && ov.classList.contains('show')) { e.stopPropagation(); hide(); } }, true);
}
function fmtList() {
  const a = (O.formats ? O.formats() : []).slice();
  const u = O.url && O.url();
  if (u) a.push({ id: 'url', label: 'URL', ext: 'txt', text: () => u });
  return a;
}
const modeList = () => (O.image && O.image.modes) || ['board'];
async function render() {
  const q = s => ov.querySelector(s), list = fmtList();
  if (!list.some(f => f.id === fmt) && !(fmt === 'img' && O.image)) fmt = list.length ? list[0].id : 'img';
  if (O.image && !modeList().includes(mode)) mode = modeList()[0];
  q('.rx-h').textContent = tx('title');
  q('.rx-fmt').innerHTML = list.map(f => `<button data-v="${esc(f.id)}" class="${f.id === fmt ? 'sel' : ''}">${esc(f.label)}</button>`).join('') + (O.image ? `<button data-v="img" class="${fmt === 'img' ? 'sel' : ''}">${esc(tx('img'))}</button>` : '');
  q('.rx-close').textContent = tx('close'); q('.rx-dl').textContent = tx('download');
  const m = meta(O.key);
  q('.rx-tl').textContent = tx('ttl'); q('.rx-dt').textContent = tx('date'); q('.rx-date').checked = m.date;
  const ti = q('.rx-ttl'); ti.placeholder = cleanTitle(O.title); if (document.activeElement !== ti) ti.value = m.title;
  q('.rx-meta').style.visibility = fmt === 'url' ? 'hidden' : 'visible';
  const img = fmt === 'img';
  q('.rx-text').style.display = img ? 'none' : ''; q('.rx-img').style.display = img ? 'flex' : 'none'; if (!img) { q('.rx-stage').style.height = 'min(56vh,600px)'; }
  q('.rx-copy').textContent = tx(img ? 'share' : fmt === 'url' ? 'copyUrl' : 'copy');
  if (!img) { const f = list.find(x => x.id === fmt); let v = ''; try { v = f ? f.text() : ''; if (f && f.id !== 'url' && f.meta !== false) v = applyMeta(v, m); } catch (e) { console.error(e); v = String(e); } q('.rx-text').value = v; return; }
  const ms = modeList();
  q('.rx-mode').style.visibility = ms.length > 1 ? 'visible' : 'hidden';
  // the box keeps one size (the board image's); only 局面図＋棋譜 ('moves') may make it taller
  const tall = mode === 'moves'; q('.rx-stage').style.height = tall ? 'auto' : 'min(56vh,600px)'; q('.rx-prev').style.maxHeight = tall ? 'min(76vh,900px)' : '100%';
  q('.rx-mode').innerHTML = ms.map(m => `<button data-v="${m}" class="${m === mode ? 'sel' : ''}">${esc(tx(m))}</button>`).join('');
  const my = ++job; blob = null;
  let cv; try { cv = await O.image.draw(mode); } catch (e) { console.error(e); return; }
  if (my !== job || !cv) return;
  q('.rx-prev').src = cv.toDataURL('image/png');
  cv.toBlob(b => { if (my === job) blob = b; }, 'image/png');
}
function open() {
  if (!O) return;
  if (O.empty && O.empty()) { toast(O.emptyMsg ? O.emptyMsg() : tx('empty')); return; }
  build();
  try { fmt = localStorage.getItem('rx-fmt-' + O.key) || ''; mode = localStorage.getItem('rx-mode-' + O.key) || ''; } catch (e) {}
  render(); show();
}
function attach(o) {
  O = o;
  const b = typeof o.btn === 'string' ? document.querySelector(o.btn) : o.btn;
  if (b) {
    b.onclick = e => { if (e) e.preventDefault(); open(); };
    b.removeAttribute('data-i18n-title');
    b.addEventListener('pointerenter', () => { b.title = tx('btnT'); });
    b.title = tx('btnT');
  }
}

// ---------------------------------------------------------------- diagram helpers
const imgCache = new Map();
function loadImg(src) {
  if (imgCache.has(src)) return imgCache.get(src);
  const p = new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
  imgCache.set(src, p); return p;
}
async function fonts() { try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) {} }
const SANS = "'Zen Kaku Gothic New','Hiragino Sans','Noto Sans JP','Noto Sans',system-ui,sans-serif";
const SERIF = "'Shippori Mincho B1','Hiragino Mincho ProN','Yu Mincho','Noto Serif JP',serif";
// wrap a list of tokens into lines no wider than w
const glue = tokens => { const out = []; for (let i = 0; i < tokens.length; i++) { const x = String(tokens[i]); if (/^\d+\.+$/.test(x) && i + 1 < tokens.length) { out.push(x + ' ' + tokens[++i]); } else out.push(x); } return out; };
// plain-text lines of at most `w` characters (PGN / SGF style), keeping "12." with its move
function lines(tokens, w) { w = w || 79; const out = []; let ln = ''; for (const x of glue(tokens)) { if (ln && ln.length + 1 + x.length > w) { out.push(ln); ln = x; } else ln = ln ? ln + ' ' + x : x; } if (ln) out.push(ln); return out.join('\n'); }
function wrap(g, tokens, w) {
  tokens = glue(tokens);
  const lines = []; let line = '';
  for (const tk of tokens) { const t2 = line ? line + ' ' + tk : tk; if (g.measureText(t2).width > w && line) { lines.push(line); line = tk; } else line = t2; }
  if (line) lines.push(line); return lines;
}
// A white sheet: title / caption on top, the board (drawn by o.draw(g, x, y)), players, an optional move list, the site URL.
// o: { bw, bh, title, caption, players: [{ name, swatch: (g, x, y, r) => {} }], moves: [tokens] | null, path, font, minW }
function sheet(o) {
  const M = o.margin || 34, font = o.font || SANS, dpr = 2;
  const W = Math.max(o.bw + M * 2, o.minW || 560), cw = W - M * 2;
  const meas = document.createElement('canvas').getContext('2d');
  meas.font = `14px ${font}`;
  const mvLines = o.moves && o.moves.length ? wrap(meas, o.moves, cw) : [];
  const players = (o.players || []).filter(p => p && p.name);
  const topH = 30 + (o.caption ? 26 : 0) + 14;
  const plH = players.length ? 34 : 0;
  const mvH = mvLines.length ? 34 + mvLines.length * 21 : 0;
  const H = topH + o.bh + 14 + plH + mvH + 40;
  const cv = document.createElement('canvas'); cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  const ink = '#16130f';
  g.textBaseline = 'alphabetic'; g.textAlign = 'left'; g.fillStyle = ink;
  const mt = O ? meta(O.key) : { title: '', date: false, day: new Date() }, ds = mt.date ? dateText(mt.day) : '';
  let dw = 0; if (ds) { g.font = `14px ${font}`; dw = g.measureText(ds).width + 16; }
  const ht = mt.title || o.title || '';
  let fs = 19; g.font = `700 ${fs}px ${o.titleFont || font}`; while (fs > 13 && g.measureText(ht).width > cw - dw) { fs--; g.font = `700 ${fs}px ${o.titleFont || font}`; }
  let ht2 = ht; while (ht2.length > 1 && g.measureText(ht2).width > cw - dw) ht2 = ht2.slice(0, -2) + '…';
  g.fillText(ht2, M, 34);
  if (ds) { g.font = `14px ${font}`; g.fillStyle = '#5c554a'; g.textAlign = 'right'; g.fillText(ds, W - M, 34); g.textAlign = 'left'; g.fillStyle = ink; }
  if (o.caption) { g.font = `15px ${font}`; g.fillStyle = '#3b352c'; g.fillText(o.caption, M, 60); }
  let y = topH;
  const bx = Math.round((W - o.bw) / 2);
  g.save(); o.draw(g, bx, y); g.restore();
  y += o.bh + 14;
  if (players.length) {
    g.font = `600 14.5px ${font}`; g.textBaseline = 'middle';
    let x = M; const cy = y + 12;
    players.forEach((p, i) => {
      if (i) { g.fillStyle = '#8a8276'; g.fillText(' — ', x, cy); x += g.measureText(' — ').width + 4; }
      if (p.swatch) { g.save(); p.swatch(g, x + 8, cy, 7.5); g.restore(); x += 22; }
      g.fillStyle = ink; const nm = String(p.name).slice(0, 28); g.fillText(nm, x, cy); x += g.measureText(nm).width + 6;
    });
    g.textBaseline = 'alphabetic'; y += plH;
  }
  if (mvLines.length) {
    g.strokeStyle = '#d8d2c6'; g.lineWidth = 1; g.beginPath(); g.moveTo(M, y + 4); g.lineTo(W - M, y + 4); g.stroke();
    g.fillStyle = ink; g.font = `14px ${font}`; y += 26;
    for (const ln of mvLines) { g.fillText(ln, M, y); y += 21; }
  }
  g.font = `11.5px ${SANS}`; g.fillStyle = '#9a9184'; g.textAlign = 'right'; g.textBaseline = 'alphabetic';
  g.fillText('core-calmdust.github.io/aicoding/' + (o.path || ''), W - 14, H - 13);
  return cv;
}
// a stone / disc with a soft printed look: fill + outline
function disc(g, x, y, r, fill, stroke, lw) {
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = fill; g.fill();
  if (stroke) { g.lineWidth = lw || 1.4; g.strokeStyle = stroke; g.stroke(); }
}
// printed go / renju diagram: white sheet, black grid, star points, stones with outlines, coordinates, last-move marker,
// optional move numbers. o: { n, cell, at: i => 0 | 1 (black) | 2 (white), stars: [i], last: i, nums: Map(i -> number),
// cols: 'ABCDEFGHJ…', font }   (point i = y * n + x, y = 0 on top; row labels count from the bottom)
function goBoard(g, x0, y0, o) {
  const n = o.n, c = o.cell, m = c * 0.95, ox = x0 + m, oy = y0 + m, L = (n - 1) * c, ink = '#111';
  const font = o.font || SANS;
  g.strokeStyle = ink; g.lineCap = 'square';
  for (let i = 0; i < n; i++) { g.lineWidth = i === 0 || i === n - 1 ? 1.8 : 0.9; g.beginPath(); g.moveTo(ox, oy + i * c); g.lineTo(ox + L, oy + i * c); g.stroke(); g.beginPath(); g.moveTo(ox + i * c, oy); g.lineTo(ox + i * c, oy + L); g.stroke(); }
  g.fillStyle = ink; for (const i of o.stars || []) { g.beginPath(); g.arc(ox + (i % n) * c, oy + Math.floor(i / n) * c, Math.max(2.2, c * 0.1), 0, 7); g.fill(); }
  g.font = `600 ${Math.round(c * 0.4)}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#444';
  for (let i = 0; i < n; i++) { const lab = (o.cols || 'ABCDEFGHJKLMNOPQRST')[i]; g.fillText(lab, ox + i * c, oy - m * 0.62); g.fillText(lab, ox + i * c, oy + L + m * 0.62); g.fillText(String(n - i), ox - m * 0.62, oy + i * c); g.fillText(String(n - i), ox + L + m * 0.62, oy + i * c); }
  const r = c * 0.48;
  for (let i = 0; i < n * n; i++) {
    const v = o.at(i); if (!v) continue;
    const x = ox + (i % n) * c, y = oy + Math.floor(i / n) * c;
    disc(g, x, y, r, v === 1 ? '#111' : '#fff', '#111', v === 1 ? 1 : 1.3);
    const num = o.nums && o.nums.get(i);
    if (num) { g.fillStyle = v === 1 ? '#fff' : '#111'; g.font = `700 ${Math.round(c * (num >= 100 ? 0.36 : 0.46))}px ${font}`; g.fillText(String(num), x, y + 0.5); }
    else if (i === o.last) { g.beginPath(); g.arc(x, y, r * 0.48, 0, 7); g.lineWidth = Math.max(1.6, c * 0.07); g.strokeStyle = v === 1 ? '#fff' : '#111'; g.stroke(); }
  }
  return { w: L + 2 * m, h: L + 2 * m };
}
window.RecordExport = { meta, setMeta, applyMeta, dateText, goBoard, attach, open, tx, sheet, loadImg, fonts, disc, wrap, lines, SANS, SERIF, stamp };
})();
