# Outfit Regular(400)/Bold(700) -> interpolated outlines (600 / 500) as SVG path data.
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.recordingPen import RecordingPen
D = '/mnt/skills/examples/canvas-design/canvas-fonts/'
R = TTFont(D + 'Outfit-Regular.ttf'); B = TTFont(D + 'Outfit-Bold.ttf')
cmap = R.getBestCmap()


def kern_table(f):
    gpos = f['GPOS'].table; out = {}
    idx = [i for fr in gpos.FeatureList.FeatureRecord if fr.FeatureTag == 'kern' for i in fr.Feature.LookupListIndex]
    for li in idx:
        lk = gpos.LookupList.Lookup[li]
        for st in lk.SubTable:
            typ = lk.LookupType
            if typ == 9:
                typ = st.ExtensionLookupType; st = st.ExtSubTable
            if typ != 2:
                continue
            if st.Format == 1:
                for g1, ps in zip(st.Coverage.glyphs, st.PairSet):
                    for pv in ps.PairValueRecord:
                        v = getattr(pv.Value1, 'XAdvance', 0) if pv.Value1 else 0
                        out.setdefault((g1, pv.SecondGlyph), v or 0)
            elif st.Format == 2:
                cd1 = st.ClassDef1.classDefs; cd2 = st.ClassDef2.classDefs
                g2all = list(f.getGlyphOrder())
                for g1 in st.Coverage.glyphs:
                    c1 = cd1.get(g1, 0)
                    for g2 in g2all:
                        c2 = cd2.get(g2, 0)
                        rec = st.Class1Record[c1].Class2Record[c2]
                        v = getattr(rec.Value1, 'XAdvance', 0) if rec.Value1 else 0
                        if v:
                            out.setdefault((g1, g2), v)
    return out


KR, KB = kern_table(R), kern_table(B)


def glyph_rec(f, name):
    p = RecordingPen(); f.getGlyphSet()[name].draw(p); return p.value


def lerp_rec(a, b, t):
    out = []
    for (op, pa), (op2, pb) in zip(a, b):
        assert op == op2
        out.append((op, tuple((x1 + (x2 - x1) * t, y1 + (y2 - y1) * t) for (x1, y1), (x2, y2) in zip(pa, pb))))
    return out


def fmt(v):
    s = ('%.2f' % v).rstrip('0').rstrip('.')
    return '0' if s == '-0' else s


def layout(text, t, size, x0, y0, ls_em, names=None):
    """returns (svg path d, [(glyph, x px)], x end px). letter-spacing is added after every glyph but the last."""
    names = names or [cmap[ord(c)] for c in text]
    s = size / 1000.0; x = 0; d = []; pos = []
    for k, n in enumerate(names):
        if n != 'space':
            rec = lerp_rec(glyph_rec(R, n), glyph_rec(B, n), t)
            sp = SVGPathPen(None, ntos=fmt)
            tp = TransformPen(sp, (s, 0, 0, -s, x0 + x * s, y0))
            for op, args in rec:
                getattr(tp, op)(*args)
            d.append(sp.getCommands())
        pos.append((n, x0 + x * s))
        x += R['hmtx'][n][0] + (B['hmtx'][n][0] - R['hmtx'][n][0]) * t
        if k + 1 < len(names):
            m = names[k + 1]; kr = KR.get((n, m), 0); kb = KB.get((n, m), 0)
            x += kr + (kb - kr) * t + ls_em * 1000
    return ' '.join(d), pos, x0 + x * s


def i_dot(t, size):
    """(stem centre x, dot centre y, dot height) in px from the glyph origin / baseline (y up)."""
    s = size / 1000.0
    a = R['glyf']['i'].getCoordinates(R['glyf'])[0][4:]; b = B['glyf']['i'].getCoordinates(B['glyf'])[0][4:]
    pts = [(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t) for (x1, y1), (x2, y2) in zip(a, b)]
    ys = [p[1] for p in pts]
    sa = R['glyf']['dotlessi'].getCoordinates(R['glyf'])[0]; sb = B['glyf']['dotlessi'].getCoordinates(B['glyf'])[0]
    st = [(x1 + (x2 - x1) * t) for (x1, y1), (x2, y2) in zip(sa, sb)]
    return (min(st) + max(st)) / 2 * s, (min(ys) + max(ys)) / 2 * s, (max(ys) - min(ys)) * s
