#!/usr/bin/env python3
"""Portal skins s145–s150 (SR, 2026-11-20): flat pale motif patterns in the same manner as skins_sr2.py
(half-drop grid, jitter and tilt, neighbours differ). Motifs: instruments, vegetables, stationery, little birds,
gems, wagashi. Run from the repo root: python3 atlas/tools/skins_sr3.py [id …]"""
import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from skins import save
from skins_sr2 import P, render, finish, T

def instrument(k, a, b, c):
    if k == 0:   # guitar
        return (f'<path d="M-4 -46 L4 -46 L4 -6 L-4 -6 Z" fill="{c}"/><rect x="-7" y="-52" width="14" height="10" rx="3" fill="{c}"/>'
                f'<path d="M0 -8 C14 -8 20 0 16 8 C26 12 28 30 14 38 C6 42 -6 42 -14 38 C-28 30 -26 12 -16 8 C-20 0 -14 -8 0 -8 Z" fill="{a}"/><circle cx="0" cy="12" r="6" fill="{b}"/><rect x="-8" y="26" width="16" height="4" rx="2" fill="{b}"/>')
    if k == 1:   # trumpet
        return (f'<path d="M-40 -4 L14 -4 L14 4 L-40 4 Z" fill="{a}"/><path d="M14 -4 C26 -4 34 -16 40 -20 L40 20 C34 16 26 4 14 4 Z" fill="{a}"/><rect x="-46" y="-6" width="8" height="12" rx="3" fill="{b}"/>'
                f'<rect x="-14" y="-18" width="5" height="16" rx="2" fill="{b}"/><rect x="-4" y="-18" width="5" height="16" rx="2" fill="{b}"/><rect x="6" y="-18" width="5" height="16" rx="2" fill="{b}"/><path d="M-30 4 C-30 18 6 18 6 4" fill="none" stroke="{a}" stroke-width="5"/>')
    if k == 2:   # drum
        return (f'<rect x="-30" y="-14" width="60" height="36" fill="{a}"/><ellipse cx="0" cy="-14" rx="30" ry="10" fill="{b}"/><ellipse cx="0" cy="22" rx="30" ry="10" fill="{a}"/>'
                + ''.join(f'<path d="M{-30 + i * 15} -10 L{-22 + i * 15} 20" stroke="{c}" stroke-width="3"/>' for i in range(4)) + f'<path d="M-20 -40 L4 -18 M20 -42 L0 -18" stroke="{c}" stroke-width="4" stroke-linecap="round"/>')
    return f'<ellipse cx="-12" cy="22" rx="12" ry="9" fill="{a}" transform="rotate(-20 -12 22)"/><rect x="-2" y="-32" width="5" height="54" fill="{a}"/><path d="M3 -32 C20 -26 22 -12 12 -2 C18 -14 14 -20 3 -22 Z" fill="{a}"/><circle cx="20" cy="-34" r="4" fill="{b}"/>'

def veg(k, a, b):
    if k == 0:   # carrot
        return f'<path d="M-8 -20 L8 -20 L2 40 C1 44 -1 44 -2 40 Z" fill="{a}"/><path d="M-4 -4 L4 -2 M-3 12 L3 14" stroke="#ffffff" stroke-width="2" opacity=".5"/><path d="M0 -20 C-10 -34 -16 -40 -18 -46 M0 -20 C0 -34 2 -42 0 -48 M0 -20 C10 -32 16 -38 18 -44" stroke="{b}" stroke-width="5" fill="none" stroke-linecap="round"/>'
    if k == 1:   # tomato
        return f'<circle cx="0" cy="4" r="28" fill="{a}"/><path d="M0 -24 l-6 -4 l-10 2 l8 6 l-12 6 l14 0 l6 8 l6 -8 l14 0 l-12 -6 l8 -6 l-10 -2 Z" fill="{b}"/><ellipse cx="-12" cy="-4" rx="6" ry="9" fill="#ffffff" opacity=".35"/>'
    if k == 2:   # eggplant
        return f'<path d="M-8 -26 C10 -30 22 -6 22 14 C22 34 6 42 -6 38 C-22 32 -20 12 -16 -4 C-14 -14 -16 -22 -8 -26 Z" fill="{a}"/><path d="M-14 -26 C-6 -36 6 -34 10 -24 C2 -20 -6 -20 -14 -26 Z" fill="{b}"/><path d="M-4 -34 l0 -10" stroke="{b}" stroke-width="5" stroke-linecap="round"/>'
    return f'<rect x="-6" y="0" width="12" height="38" rx="5" fill="{b}"/>' + ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{a}"/>' for x, y, r in ((-16, -10, 14), (0, -20, 16), (16, -10, 14), (-6, 2, 12), (8, 2, 12)))

def stationery(k, a, b, c):
    if k == 0:   # pencil
        return f'<g transform="rotate(-40)"><rect x="-8" y="-40" width="16" height="64" fill="{a}"/><rect x="-8" y="-40" width="5" height="64" fill="#ffffff" opacity=".35"/><path d="M-8 24 L8 24 L0 44 Z" fill="#f6dcb8"/><path d="M-3 36 L3 36 L0 44 Z" fill="#6a6a7a"/><rect x="-8" y="-50" width="16" height="10" rx="3" fill="{b}"/></g>'
    if k == 1:   # eraser
        return f'<g transform="rotate(-12)"><rect x="-30" y="-16" width="60" height="32" rx="6" fill="#ffffff"/><rect x="-6" y="-16" width="36" height="32" fill="{a}"/><path d="M-6 -16 L-6 16" stroke="{b}" stroke-width="2"/></g>'
    if k == 2:   # scissors
        return f'<g transform="rotate(30)"><path d="M-2 -6 L-12 -46 L-4 -46 L4 -6 Z M2 -6 L12 -46 L4 -46 L-4 -6 Z" fill="#c8d0dc"/><circle cx="-12" cy="16" r="12" fill="none" stroke="{a}" stroke-width="7"/><circle cx="12" cy="16" r="12" fill="none" stroke="{a}" stroke-width="7"/><circle cx="0" cy="-6" r="3" fill="{c}"/></g>'
    return f'<path d="M-8 -30 L-8 22 C-8 32 8 32 8 22 L8 -22 C8 -28 0 -28 0 -22 L0 18" fill="none" stroke="{a}" stroke-width="5" stroke-linecap="round" transform="rotate(20)"/>'

def birdie(a, b, c):
    return (f'<path d="M-30 6 C-30 -18 -6 -28 12 -18 C22 -12 26 -2 26 6 C26 20 10 28 -6 28 C-20 28 -30 18 -30 6 Z" fill="{a}"/><path d="M-30 4 L-46 -6 L-42 10 Z" fill="{a}"/><path d="M-14 4 C-6 -4 8 -2 10 8 C2 16 -10 14 -14 4 Z" fill="{b}"/>'
            f'<circle cx="12" cy="-6" r="3.5" fill="#4a4a5a"/><path d="M24 -2 L34 2 L24 6 Z" fill="{c}"/><circle cx="6" cy="2" r="4" fill="#f6a8b4" opacity=".6"/><path d="M-4 28 l-2 10 M6 28 l2 10" stroke="{c}" stroke-width="3" stroke-linecap="round"/>')

def gem(k, a, b, c):
    if k == 0:   # brilliant cut
        return f'<path d="M-32 -10 L-18 -30 L18 -30 L32 -10 L0 34 Z" fill="{a}"/><path d="M-32 -10 L32 -10 L0 34 Z" fill="{b}"/><path d="M-18 -30 L-8 -10 L8 -10 L18 -30 Z" fill="{c}"/><path d="M-8 -10 L0 34 L8 -10 Z" fill="{c}" opacity=".6"/>'
    if k == 1:   # crystal cluster
        return f'<path d="M-6 30 L-14 -18 L-4 -36 L6 -18 L4 30 Z" fill="{a}"/><path d="M-4 -36 L6 -18 L4 30 L-4 30 Z" fill="{b}"/><path d="M-20 30 L-30 -2 L-22 -14 L-12 0 L-10 30 Z" fill="{b}"/><path d="M10 30 L18 -6 L26 2 L22 30 Z" fill="{a}"/>'
    if k == 2:   # oval cabochon
        return f'<ellipse cx="0" cy="0" rx="26" ry="34" fill="{a}"/><ellipse cx="-6" cy="-10" rx="10" ry="14" fill="#ffffff" opacity=".45"/><ellipse cx="0" cy="0" rx="26" ry="34" fill="none" stroke="{c}" stroke-width="4"/>'
    return f'<path d="M0 -36 L30 0 L0 36 L-30 0 Z" fill="{a}"/><path d="M0 -36 L30 0 L0 0 Z" fill="{b}"/><path d="M0 0 L0 36 L-30 0 Z" fill="{c}" opacity=".7"/>'

def wagashi(k, a, b, c):
    if k == 0:   # hanami dango
        return f'<rect x="-2" y="-46" width="4" height="92" rx="2" fill="#d6b88a"/><circle cx="0" cy="-24" r="14" fill="#f6b8c8"/><circle cx="0" cy="2" r="14" fill="#ffffff" stroke="#eadfcc" stroke-width="2.5"/><circle cx="0" cy="28" r="14" fill="#b8dca8"/>'
    if k == 1:   # daifuku
        return f'<path d="M-30 12 C-30 -18 30 -18 30 12 C30 22 -30 22 -30 12 Z" fill="{a}"/><ellipse cx="-8" cy="-6" rx="10" ry="5" fill="#ffffff" opacity=".6"/><circle cx="12" cy="-2" r="3" fill="{b}" opacity=".6"/>'
    if k == 2:   # sakura mochi
        return f'<path d="M-32 10 C-30 -20 30 -24 32 6 C24 26 -24 28 -32 10 Z" fill="#7aa86a"/><path d="M-26 10 C-24 -12 24 -14 26 6 C18 20 -20 22 -26 10 Z" fill="{a}"/><path d="M-30 8 C-10 0 10 0 30 6" stroke="#5f8a52" stroke-width="2" fill="none"/>'
    return f'<rect x="-30" y="-16" width="60" height="32" rx="4" fill="{c}"/><rect x="-30" y="-16" width="60" height="10" rx="4" fill="{b}"/><path d="M-12 -2 l4 -6 l4 6 l-4 6 Z" fill="#fbf6ee" opacity=".8"/>'

SR3 = {
    's145': lambda: P('#f8f5fb', [lambda k: instrument(k % 4, *[('#f2c7a8', '#c99a7a', '#a98b74'), ('#f6d79a', '#e8c070', '#a98b74'), ('#f3b8c0', '#fbf6ee', '#c99a8a'), ('#b9d0ec', '#f3b8c0', '#a98b74')][k % 4])], 6, 6, 1451, scale=1.0, tilt=18),
    's146': lambda: P('#f8faf2', [lambda k: veg(k % 4, *[('#f6b07a', '#9cc88a'), ('#f29a92', '#9cc88a'), ('#c4a8e2', '#9cc88a'), ('#9cc88a', '#b4d6a0')][k % 4])], 6, 6, 1461, scale=1.0, tilt=20),
    's147': lambda: P('#f6f7fb', [lambda k: stationery(k % 4, *[('#f6d79a', '#f3b8c0', '#8a8a9a'), ('#b9d0ec', '#9fbde0', '#8a8a9a'), ('#f3b8c0', '#e6a0aa', '#8a8a9a'), ('#a9d3bb', '#8fc2a5', '#8a8a9a')][k % 4])], 6, 6, 1471, scale=1.0, tilt=25),
    's148': lambda: P('#f6f9f6', [lambda k: birdie(*[('#b9d0ec', '#fbf6ee', '#f6c27e'), ('#f6d79a', '#fbf6ee', '#f6a07e'), ('#f3b8c0', '#fbf6ee', '#f6c27e'), ('#a9d3bb', '#fbf6ee', '#f6c27e')][k % 4])], 6, 6, 1481, scale=1.0, tilt=12, flip=True),
    's149': lambda: P('#f6f4fa', [lambda k: gem(k % 4, *[('#c8b4ec', '#b49ae2', '#e2d6f6'), ('#a9d8e6', '#8ec8da', '#d6eef4'), ('#f3b8c8', '#eaa0b4', '#fadce4'), ('#b8e2c4', '#9cd2ac', '#dcf2e2')][k % 4])], 6, 6, 1491, scale=1.0, tilt=16),
    's150': lambda: P('#fbf7f0', [lambda k: wagashi(k % 4, *[('#fbf6ee', '#e6a0aa', '#c49a8a'), ('#f6d6e0', '#a98b74', '#a98b74'), ('#f6c8d6', '#c49a8a', '#a98b74'), ('#f6d6e0', '#b8d49a', '#b88a72')][k % 4])], 6, 6, 1501, scale=1.0, tilt=14),
}

if __name__ == '__main__':
    ids = [a for a in sys.argv[1:] if a in SR3] or list(SR3)
    for i, im in zip(ids, render([(SR3[i](), T, T) for i in ids])):
        save(i, finish(im, int(i[1:])), 'tile', q=80)
