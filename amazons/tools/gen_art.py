# Amazons: the 2D board textures (10x10 squares baked into one image per design) -> img/bd-<key>.webp
# python3 tools/gen_art.py   (Pillow; deterministic noise)
import math, random
from PIL import Image, ImageDraw, ImageFilter, ImageChops
S = 1000; N = 10; U = S // N
OUT = __file__.replace('tools/gen_art.py', 'img/')
def noise(seed, scale, size=S):
    r = random.Random(seed); w = max(2, size // scale)
    im = Image.new('L', (w, w)); im.putdata([r.randint(0, 255) for _ in range(w * w)])
    return im.resize((size, size), Image.BICUBIC)
def fbm(seed, size=S):
    acc = None
    for k, (sc, wt) in enumerate([(160, .5), (60, .3), (20, .15), (6, .05)]):
        n = noise(seed + k, sc, size).point(lambda v, wt=wt: int(v * wt))
        acc = n if acc is None else ImageChops.add(acc, n)
    return acc
def tint(gray, c0, c1):
    g = gray.convert('L'); r = Image.new('RGB', g.size)
    lut = [tuple(int(c0[j] + (c1[j] - c0[j]) * v / 255) for j in range(3)) for v in range(256)]
    r.putdata([lut[v] for v in g.getdata()]); return r
def checker(light, dark):
    m = Image.new('L', (S, S), 0); d = ImageDraw.Draw(m)
    for r in range(N):
        for c in range(N):
            if (r + c) % 2: d.rectangle([c * U, r * U, c * U + U - 1, r * U + U - 1], fill=255)
    return Image.composite(dark, light, m)
def grid(im, col, w=2):
    d = ImageDraw.Draw(im, 'RGBA')
    for k in range(1, N): d.line([(k * U, 0), (k * U, S)], fill=col, width=w); d.line([(0, k * U), (S, k * U)], fill=col, width=w)
    return im
def wood(seed, c0, c1, ang=0):
    # long grain: noise stretched along the board, rings bent by it
    r = random.Random(seed)
    w = Image.new('L', (S // 5, S // 80)); w.putdata([r.randint(0, 255) for _ in range((S // 5) * (S // 80))])
    st = w.resize((S, S), Image.BICUBIC); sd = st.load(); n = fbm(seed).load()
    im = Image.new('L', (S, S)); px = []
    for y in range(S):
        for x in range(S):
            v = math.sin(y * 0.11 + sd[x, y] * 0.07 + n[x, y] * 0.02) * 0.5 + 0.5
            px.append(int(60 + v ** 1.6 * 150 + (n[x, y] - 128) * 0.25))
    im.putdata(px)
    return tint(im.filter(ImageFilter.GaussianBlur(0.8)), c0, c1)
def marble(seed, c0, c1):
    n = fbm(seed).filter(ImageFilter.GaussianBlur(6)); nd = n.load(); im = Image.new('L', (S, S)); px = []
    for y in range(S):
        for x in range(S):
            v = abs(math.sin((x * 0.6 + y) * 0.006 + nd[x, y] * 0.035))
            px.append(int(255 - (1 - v) ** 14 * 200 - (nd[x, y] - 128) * 0.12))
    im.putdata(px)
    return tint(im.filter(ImageFilter.GaussianBlur(0.9)), c0, c1)
def soft(seed, c0, c1, amt=1.0):
    n = fbm(seed).filter(ImageFilter.GaussianBlur(2))
    return tint(n, c0, c1)
def vignette(im, a=60):
    m = Image.new('L', (S, S), 0); d = ImageDraw.Draw(m)
    for k in range(40): d.rectangle([k * 4, k * 4, S - k * 4, S - k * 4], outline=int(a * (1 - k / 40)))
    return Image.composite(Image.new('RGB', (S, S), (0, 0, 0)), im, m.filter(ImageFilter.GaussianBlur(30)))
D = {}
# jungle (default): jade and pale sage, a soft woven-canvas look
D['jungle'] = grid(checker(soft(1, (214, 228, 196), (232, 240, 214)), soft(2, (46, 112, 84), (70, 140, 104))), (20, 60, 40, 60))
# wood: maple and walnut
D['wood'] = grid(checker(wood(3, (205, 160, 104), (236, 200, 146)), wood(4, (96, 56, 30), (138, 86, 48))), (40, 20, 8, 70))
# marble: white Carrara and green marble
D['marble'] = grid(checker(marble(5, (176, 178, 180), (244, 243, 240)), marble(6, (20, 64, 52), (60, 120, 98))), (30, 40, 40, 50))
# celeste: Argentine sky blue and white
D['celeste'] = grid(checker(soft(7, (238, 244, 248), (252, 252, 250)), soft(8, (112, 176, 222), (142, 198, 236))), (40, 80, 120, 50))
# mono: modern greys
D['mono'] = grid(checker(soft(9, (222, 220, 216), (230, 228, 224)), soft(10, (170, 168, 164), (180, 178, 174))), (60, 60, 60, 40), 1)
# night: midnight navy and deep teal, gold lines
D['night'] = grid(checker(soft(11, (22, 38, 70), (30, 50, 88)), soft(12, (12, 22, 44), (18, 30, 58))), (214, 178, 106, 150), 2)
for k, im in D.items():
    vignette(im, 40).save(OUT + 'bd-' + k + '.webp', quality=86)
    print(k)
