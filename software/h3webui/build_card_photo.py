# Builds software/h3webui/card.webp — the top page Software panel picture: the WebUI screenshot (dark theme), blurred and dimmed,
# with a soft orange glow and the logo on top; the top/bottom ~22% and left/right ~8% fade to transparent (smoothstep) like praline/card.svg.
# usage: python3 software/h3webui/build_card_photo.py software/h3webui/screenshot-dark.webp <logo-dark.png 1600px from the brand kit>
import sys, os
from PIL import Image, ImageFilter, ImageDraw, ImageEnhance
D = os.path.dirname(os.path.abspath(__file__))
W, H = 1500, 1000
ss = Image.open(sys.argv[1]).convert('RGB')
sw, sh = ss.size
ch = int(sw * H / W)
ss = ss.crop((0, 0, sw, min(sh, ch))).resize((W, H), Image.LANCZOS)
bg = ss.filter(ImageFilter.GaussianBlur(7))
bg = ImageEnhance.Brightness(bg).enhance(1.15)
# darker oval behind the logo so it stays legible
sh_ = Image.new('L', (W, H), 0); ImageDraw.Draw(sh_).ellipse((W*.12, H*.30, W*.88, H*.70), fill=120)
sh_ = sh_.filter(ImageFilter.GaussianBlur(110))
bg = Image.composite(Image.new('RGB', (W, H), (12, 11, 10)), bg, sh_)
# orange glow above and below the logo band
gl = Image.new('RGBA', (W, H), (0, 0, 0, 0)); g = ImageDraw.Draw(gl)
g.ellipse((W*.15, H*.22, W*.85, H*.40), fill=(255, 170, 51, 70)); g.ellipse((W*.15, H*.60, W*.85, H*.78), fill=(255, 170, 51, 70))
gl = gl.filter(ImageFilter.GaussianBlur(80))
card = Image.alpha_composite(bg.convert('RGBA'), gl)
logo = Image.open(sys.argv[2]).convert('RGBA')
lw = int(W * .62); lh = int(logo.height * lw / logo.width)
logo = logo.resize((lw, lh), Image.LANCZOS)
card.alpha_composite(logo, ((W - lw) // 2, (H - lh) // 2))
# fade top / bottom (~22%) and left / right (~8%) to transparent
def ramp(n, f):
    v = [255] * n; F = int(n * f)
    for i in range(F):
        t = i / F; a = int(255 * t * t * (3 - 2 * t)); v[i] = v[n - 1 - i] = a
    return v
vy, vx = ramp(H, .22), ramp(W, .08)
my = Image.new('L', (1, H)); my.putdata(vy); mx = Image.new('L', (W, 1)); mx.putdata(vx)
from PIL import ImageChops
card.putalpha(ImageChops.multiply(my.resize((W, H)), mx.resize((W, H))))
card.save(os.path.join(D, 'card.webp'), 'WEBP', quality=82, method=6)
print(os.path.getsize(os.path.join(D, 'card.webp')))
