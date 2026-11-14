#!/usr/bin/env python3
"""雀華：卓の重い手続き生成テクスチャを画像に焼く（2026-11-14、最適化）。
使い方: リポジトリの直下で `python3 -m http.server 8765` を動かしてから `python3 mahjong/tools/bake-tex.py`
table3d.js の生成コードそのもの（?nobake で強制的に描かせる）を Chrome で動かし、出来た canvas を images/mahjong/tex/ に WebP で保存する。
生成コードを変えたら焼き直して、table3d.js の BAKE_V を上げる。
"""
import asyncio, base64, io, os
from PIL import Image
from playwright.async_api import async_playwright
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'images', 'mahjong', 'tex')
Q = {'felt': 88, 'wood': 90, 'woodb': 92, 'stone': 90}
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width': 800, 'height': 600})).new_page()
        await pg.goto('http://localhost:8765/mahjong/?nobake&nofreeze'); await pg.wait_for_timeout(1500)
        urls = await pg.evaluate("""(()=>{const d=document.createElement('div');d.style.cssText='width:200px;height:100px';document.body.appendChild(d);new Table3D(d);
          const o={};for(const k in window.JANKA_TEXGEN)o[k]=window.JANKA_TEXGEN[k].toDataURL('image/png');return o})()""")
        await b.close()
    os.makedirs(OUT, exist_ok=True)
    for k, u in urls.items():
        im = Image.open(io.BytesIO(base64.b64decode(u.split(',', 1)[1]))).convert('RGB')
        dst = os.path.join(OUT, k + '.webp'); im.save(dst, quality=Q.get(k, 90), method=6)
        print(k, im.size, os.path.getsize(dst) // 1024, 'KB')
asyncio.run(main())
