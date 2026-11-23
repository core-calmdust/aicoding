#!/usr/bin/env python3
"""Liubo board (The Met 1994.285; Open Access, public domain): the top face straightened from the museum's photograph DP372026 (taken from the
front, about 24° above the board), and the grooves' depth picture from their red paint.
  python3 liubo-top.py photo.png x0,y0,x1,y1,x2,y2,x3,y3 outdir     (the top face's corners in the photograph: far left, far right, near right, near left)
→ liubo-top.webp (1480 × 1256 = 37 × 31.4 cm at 40 px/cm) and liubo-top-b.webp (bump: white = the surface, dark = the cut grooves)."""
import sys, cv2, numpy as np
src, pts, out = sys.argv[1:4]; P = np.float32([float(v) for v in pts.split(',')]).reshape(4, 2); W, H = 1480, 1256
im = cv2.imread(src); M = cv2.getPerspectiveTransform(P, np.float32([[0, 0], [W, 0], [W, H], [0, H]])); top = cv2.warpPerspective(im, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
cv2.imwrite(out + '/liubo-top.webp', top, [cv2.IMWRITE_WEBP_QUALITY, 88])
b, g, r = [top[..., i].astype(int) for i in range(3)]; red = ((r - g > 38) & (r > 120)).astype(np.uint8) * 255
red = cv2.morphologyEx(red, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)); red = cv2.morphologyEx(red, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
n, lab, st, _ = cv2.connectedComponentsWithStats(red); keep = np.zeros_like(red)
for i in range(1, n):
    if st[i, cv2.CC_STAT_AREA] > 900: keep[lab == i] = 255          # (specks of pigment on the surface are not grooves)
grain = cv2.GaussianBlur(cv2.cvtColor(top, cv2.COLOR_BGR2GRAY), (0, 0), 1.2).astype(np.float32); grain = (grain - cv2.GaussianBlur(grain, (0, 0), 12)) * .5
bump = np.clip(235 - cv2.GaussianBlur(keep, (0, 0), 3).astype(np.float32) * .78 + grain, 0, 255).astype(np.uint8)
cv2.imwrite(out + '/liubo-top-b.webp', cv2.resize(bump, (1024, 870), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_WEBP_QUALITY, 86])
print('ok', top.shape)
