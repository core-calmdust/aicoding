/* Avatar species — the AI bosses (AtlasNPC.BOSSES, atlas/npc/roster.js): one boss per 3 AI levels of every game,
   modelled on the game's homeland or a person from its history. Same soft-plush idiom as the other creatures,
   built from a compact spec so ~170 of them stay consistent:
     m = { a: animal, c: [body, belly/face, accent], hat, hc: [hat colour, trim], held, ex: [extras], eyes, mouth }
   Tiers: 2 = SR (won by beating the boss), 3 = SSR / UR (gacha; the deluxe outfit: gold trim, gems, a cape for the
   strongest; UR also gets the star aura). The plush keeps its own colours in every tier (no gold repaint). */
(function () {
  'use strict';
  if (!window.Avatars3D || !window.AtlasNPC || !AtlasNPC.BOSSES) return;
  const K = Icons3D.KIT, T = K.T, V3 = K.V3, soft = K.soft, blob = K.blob, mesh = K.mesh, M = K.M, ell = K.ell, face = K.face, alive = K.alive, puck = K.puck, INK = K.INK, noShadow = K.noShadow;
  const D = Avatars3D.define;
  const shade = (hex, k) => { const c = new T.Color(hex), h = {}; c.getHSL(h); c.setHSL(h.h, h.s, Math.max(0, Math.min(1, h.l + k))); return c.getHex(); };
  const pl = (hex, o = {}) => soft(hex, Object.assign({ under: shade(hex, -.12), uk: .45 }, o));
  const fixed = (hex, o) => { const m = soft(hex, o); m.userData.soft = false; return m; };
  const goldM = () => fixed(0xffd65a, { under: 0xffa040, uk: .4, sheen: 0xfff3c0, sheenK: .6, glow: .1, rough: .55 });
  const gemM = hex => fixed(hex, { rough: .3, rim: .35, glow: .14 });
  const cone = (r, h, m, seg = 32) => mesh(new T.ConeGeometry(r, h, seg), m);
  const cyl = (r0, r1, h, m, seg = 32) => mesh(new T.CylinderGeometry(r0, r1, h, seg), m);
  const tor = (R, r, m, arc) => mesh(new T.TorusGeometry(R, r, 12, 44, arc || Math.PI * 2), m);
  const put = (g, o, p, rot, sc) => { o.position.set(...p); if (rot) o.rotation.set(...rot); if (sc) Array.isArray(sc) ? o.scale.set(...sc) : o.scale.setScalar(sc); g.add(o); return o; };

  /* ---------------- hats (local: brim centre at the origin, on top of the head) ---------------- */
  const HATS = {
    crown(g, c, L) { const cr = K.crown(L ? goldM() : pl(c[0]), gemM(L ? 0xff5a8a : 0x5ec8ff), .78); g.add(cr); },
    bigcrown(g, c, L) {
      const gm = L ? goldM() : pl(c[0]); put(g, cyl(.5, .46, .36, gm), [0, .18, 0]);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; put(g, cone(.12, .34, gm, 12), [Math.cos(a) * .48, .5, Math.sin(a) * .48]); blob(g, gemM(i % 2 ? 0xff5a8a : 0x5ec8ff), [Math.cos(a) * .5, .7, Math.sin(a) * .5], .07); }
      blob(g, gemM(0xff3d6e), [0, .2, .5], [.1, .12, .05]); put(g, tor(.5, .07, gm), [0, 0, 0], [Math.PI / 2, 0, 0]);
    },
    turban(g, c, L) {
      const m = pl(c[0]); [0, .14, .27].forEach((y, i) => put(g, tor(.44 - i * .07, .16, m), [0, y + .08, 0], [Math.PI / 2, 0, 0]));
      blob(g, m, [0, .32, 0], [.32, .2, .32]); blob(g, gemM(L ? 0xff3d6e : 0x46c8a0), [0, .2, .55], [.1, .12, .05]);
      const f = blob(g, pl(c[1] || 0xffffff), [.04, .62, .42], [.06, .26, .04], [-.3, 0, -.25]); if (L) blob(g, goldM(), [0, .2, .52], .13).scale.z = .3;
    },
    fez(g, c) { put(g, cyl(.3, .38, .5, pl(c[0])), [0, .25, 0]); blob(g, pl(c[0]), [0, .5, 0], [.3, .04, .3]); put(g, cyl(.012, .012, .36, fixed(INK)), [.22, .42, .1], [0, 0, .5]); blob(g, pl(c[1] || 0x222233), [.36, .26, .1], [.05, .1, .05]); },
    kabuto(g, c, L) {
      const m = pl(c[0], { rough: .6 }), gm = L ? goldM() : pl(c[1] || 0xffd65a);
      blob(g, m, [0, .16, 0], [.58, .4, .58]); put(g, tor(.6, .08, m), [0, .02, 0], [Math.PI / 2, 0, 0]);
      [-1, 1].forEach(s => { const h = put(g, tor(.36, .05, gm, Math.PI * .55), [s * .12, .5, .44], [0, 0, s > 0 ? -.2 : Math.PI * .45 + .2]); });
      blob(g, gm, [0, .32, .52], [.1, .1, .05]); [-1, 1].forEach(s => blob(g, m, [s * .62, -.02, -.1], [.12, .22, .32], [0, 0, s * .5]));
    },
    eboshi(g, c) { const m = pl(c.auto ? 0x2a2a38 : c[0], { rough: .7 }); blob(g, m, [0, .3, -.05], [.34, .5, .34], [-.25, 0, 0]); blob(g, m, [0, .74, -.24], [.2, .18, .2]); },
    helmet(g, c, L) {
      const m = L ? goldM() : pl(c[1] || 0xc8ccd8, { rough: .5 }), cr = pl(c[0]);
      blob(g, m, [0, .16, 0], [.56, .42, .56]); put(g, tor(.56, .06, m), [0, .02, 0], [Math.PI / 2, 0, 0]);
      for (let i = 0; i < 7; i++) { const z = .44 - i * .15; blob(g, cr, [0, .56 + Math.sin(i / 6 * Math.PI) * .2, z], [.07, .2, .1]); }
    },
    viking(g, c, L) {
      const m = pl(c[1] || 0xc0c4d0, { rough: .5 }), hm = L ? goldM() : pl(0xfff4dc);
      blob(g, m, [0, .16, 0], [.56, .42, .56]); put(g, tor(.56, .07, m), [0, .02, 0], [Math.PI / 2, 0, 0]);
      [-1, 1].forEach(s => { const h = put(g, cone(.11, .55, hm, 16), [s * .6, .45, 0], [0, 0, -s * .7]); });
    },
    mitre(g, c, L) {
      const m = pl(c[0] || 0xfaf6ee), tm = L ? goldM() : pl(c[1] || 0xffd65a);
      const b = blob(g, m, [0, .5, 0], [.34, .6, .2]); put(g, cyl(.36, .36, .14, tm), [0, .06, 0]); blob(g, tm, [0, .5, .19], [.05, .5, .03]); blob(g, tm, [0, .62, .2], [.2, .04, .03]);
    },
    wizard(g, c, L) { const m = pl(c[0]); put(g, tor(.56, .1, m), [0, .02, 0], [Math.PI / 2, 0, 0]); blob(g, m, [0, .04, 0], [.62, .06, .62]); const cn = put(g, cone(.4, 1.0, m), [0, .52, -.04], [-.18, 0, .1]); blob(g, L ? goldM() : pl(c[1] || 0xffd65a), [.06, 1.0, -.14], .08); },
    tophat(g, c, L) { const m = pl(c[0] || 0x2a2a38, { rough: .6 }); blob(g, m, [0, .02, 0], [.6, .05, .6]); put(g, cyl(.34, .36, .62, m), [0, .33, 0]); put(g, cyl(.365, .365, .12, L ? goldM() : pl(c[1] || 0xff6b7a)), [0, .1, 0]); },
    laurel(g, c, L) {
      const m = L ? goldM() : pl(c.auto ? 0x6ad37a : c[0]);
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 1.8 - Math.PI * .4 + Math.PI / 2; if (Math.abs(Math.cos(a - Math.PI / 2)) > .97) continue; blob(g, m, [Math.cos(a) * .5, .08, Math.sin(a) * .5], [.09, .05, .16], [0, -a, .5]); }
    },
    nemes(g, c, L) {
      const a = pl(c[0] || 0x3a6ad8), b = L ? goldM() : pl(c[1] || 0xffd65a);
      blob(g, a, [0, .08, -.06], [.66, .34, .66]); put(g, cyl(.64, .64, .12, b), [0, .02, 0]);
      [-1, 1].forEach(s => { for (let i = 0; i < 4; i++) blob(g, i % 2 ? b : a, [s * .62, -.28 - i * .17, .18], [.16, .1, .2]); });
      blob(g, b, [0, .3, .58], [.07, .14, .05]); blob(g, gemM(0xff3d6e), [0, .42, .6], .05);
    },
    tricorne(g, c, L) {
      const m = pl(c[0] || 0x2a2a38, { rough: .65 }); blob(g, m, [0, .2, 0], [.38, .26, .38]);
      for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + Math.PI / 2; blob(g, m, [Math.cos(a) * .4, .14, Math.sin(a) * .4], [.38, .14, .14], [0, -a + Math.PI / 2, 0]); }
      put(g, tor(.48, .03, L ? goldM() : pl(c[1] || 0xffd65a)), [0, .14, 0], [Math.PI / 2, 0, 0]);
    },
    kasa(g, c) { const m = pl(c[0] || 0xe8c878, { rough: .9 }); const cn = put(g, cone(.82, .42, m, 40), [0, .2, 0]); blob(g, m, [0, .44, 0], .06); },
    feathers(g, c, L) {
      put(g, tor(.56, .07, pl(c[1] || 0xff6b7a)), [0, .02, 0], [Math.PI / 2, 0, 0]);
      [-.5, -.25, 0, .25, .5].forEach((a, i) => blob(g, pl(i % 2 ? (c[0] || 0xffd65a) : (c[2] || 0x46a0ff)), [Math.sin(a) * .5, .45 + (i === 2) * .1, -Math.cos(a) * .3], [.08, .36, .04], [0, a, -a * .5]));
      if (L) blob(g, goldM(), [0, .06, .56], [.1, .1, .05]);
    },
    hood(g, c) { const m = pl(c[0]); blob(g, m, [0, -.34, -.16], [.95, .84, .82]); put(g, cone(.2, .4, m, 16), [0, .3, -.6], [-1.1, 0, 0]); },
    mortar(g, c, L) { const m = pl(c[0] || 0x2a2a38); put(g, cyl(.36, .38, .24, m), [0, .1, 0]); const b = put(g, mesh(new T.BoxGeometry(.9, .05, .9), m), [0, .25, 0], [0, Math.PI / 4, 0]); blob(g, L ? goldM() : pl(c[1] || 0xffd65a), [.3, .14, .3], [.05, .2, .05]); },
    beret(g, c) { const m = pl(c[0]); blob(g, m, [0, .1, 0], [.56, .17, .54]); blob(g, m, [0, .27, 0], .06); },
    bandana(g, c) { const m = pl(c[0]); put(g, tor(.56, .1, m), [0, .02, 0], [Math.PI / 2, 0, 0]); blob(g, m, [0, .2, 0], [.5, .2, .5]); blob(g, m, [-.2, -.05, -.56], [.08, .2, .05], [0, 0, .5]); blob(g, m, [.0, -.1, -.58], [.08, .22, .05], [0, 0, -.3]); },
    halo(g, c) { const r = tor(.42, .07, fixed(0xfff2a8, { glow: .6 })); r.rotation.x = Math.PI / 2 - .5; r.position.y = .45; noShadow(r); g.add(r); },
    tiara(g, c, L) { const m = L ? goldM() : pl(c[0] || 0xffd65a); put(g, tor(.46, .05, m, Math.PI), [0, .06, 0], [Math.PI / 2 - .2, 0, 0]); [-.7, 0, .7].forEach((a, i) => blob(g, gemM(i === 1 ? 0xff6fa8 : 0x6fc8ff), [Math.sin(a) * .46, .2 + (i === 1) * .1, Math.cos(a) * .42], .07)); },
    antlers(g, c) { const m = pl(c[0] || 0xc89a6a); [-1, 1].forEach(s => { put(g, cyl(.05, .07, .5, m, 10), [s * .3, .25, -.05], [0, 0, -s * .4]); put(g, cyl(.04, .05, .3, m, 10), [s * .52, .5, -.05], [0, 0, -s * 1.1]); put(g, cyl(.04, .05, .28, m, 10), [s * .38, .58, -.05], [0, 0, s * .2]); }); },
    cap(g, c) { const m = pl(c[0]); blob(g, m, [0, .12, 0], [.52, .3, .52]); blob(g, m, [0, .02, .52], [.34, .04, .26]); },
    straw(g, c) { const m = pl(c[0] || 0xf0d080, { rough: .95 }); blob(g, m, [0, .02, 0], [.8, .05, .8]); blob(g, m, [0, .2, 0], [.42, .22, .42]); put(g, cyl(.43, .43, .08, pl(c[1] || 0xff6b7a)), [0, .1, 0]); },
    gat(g, c) { const m = fixed(0x26262e, { rough: .5 }); const br = put(g, cyl(.8, .8, .02, M({ color: 0x26262e, transparent: true, opacity: .55, roughness: .6 }), 40), [0, .06, 0]); put(g, cyl(.26, .3, .44, m), [0, .3, 0]); put(g, cyl(.31, .31, .06, pl(c[0] || 0x8a5a3a)), [0, .1, 0]); },
    ushanka(g, c) { const m = pl(c[0] || 0x8a6a50), f = pl(c[1] || 0xfff4e6); blob(g, m, [0, .14, -.02], [.6, .34, .6]); blob(g, f, [0, .14, .44], [.5, .16, .14]); [-1, 1].forEach(s => blob(g, f, [s * .66, -.22, 0], [.16, .3, .26])); },
    bearskin(g, c) { const m = pl(0x1e1e26, { rough: .95 }); blob(g, m, [0, .5, -.04], [.48, .72, .48]); put(g, tor(.5, .03, pl(c[1] || 0xffd65a)), [0, -.04, .1], [Math.PI / 2 - .5, 0, 0]); },
    kokoshnik(g, c, L) { const m = L ? goldM() : pl(c[0] || 0xd83a4a); const k = mesh(new T.CircleGeometry(.5, 32, 0, Math.PI), m); k.material.side = T.DoubleSide; put(g, k, [0, .02, .3], [-.25, 0, 0]); [-.5, 0, .5].forEach(a => blob(g, gemM(0x6fc8ff), [Math.sin(a) * .3, .22 + Math.cos(a) * .12, .38], .06)); },
    bonnet(g, c) { const m = pl(c[0] || 0xfff4f8); blob(g, m, [0, .0, -.12], [.66, .6, .5]); put(g, tor(.6, .06, pl(c[1] || 0xff8fb0)), [0, -.05, .1], [Math.PI / 2 - .6, 0, 0]); blob(g, pl(c[1] || 0xff8fb0), [.5, -.5, .4], [.1, .1, .06]); },
    flowers(g, c) { for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; blob(g, pl([0xff8fb0, 0xffd65a, 0xffffff][i % 3]), [Math.cos(a) * .52, .06, Math.sin(a) * .52], .11); } },
    none() {},
  };
  /* ---------------- props held in the right paw ---------------- */
  const PROPS = {
    disc(c) { const g = new T.Group(); const p = puck(.26, .1, fixed(0x17181e, { rough: .5 }), .5); g.add(p); const q = puck(.26, .05, fixed(0xfbfaf4), .5); q.position.y = .07; g.add(q); g.rotation.x = 1.2; return g; },
    stone(c) { const g = new T.Group(); blob(g, fixed(c && c[2] === 1 ? 0xfbfaf4 : 0x17181e, { rough: .45 }), [0, 0, 0], [.22, .12, .22], [1.2, 0, 0]); return g; },
    die() { const g = new T.Group(); K.sq(g, fixed(0xfffcf6, { under: 0xc9d6ff, uk: .4 }), [0, 0, 0], [.36, .36, .36], .32); blob(g, fixed(0xff4f68), [0, 0, .182], [.05, .05, .01]); [[-.09, .09], [.09, -.09]].forEach(([x, y]) => blob(g, fixed(0x2a2233), [x, .182, y], [.04, .01, .04])); g.rotation.set(.3, .5, .1); return g; },
    sword(c, L) { const g = new T.Group(); put(g, mesh(new T.BoxGeometry(.08, .8, .03), fixed(0xdfe6f2, { rough: .3 })), [0, .5, 0]); put(g, mesh(new T.BoxGeometry(.32, .06, .08), L ? goldM() : pl(0x8a6a4a)), [0, .1, 0]); put(g, cyl(.04, .04, .2, pl(0x6a4a3a), 8), [0, -.02, 0]); return g; },
    katana(c, L) { const g = new T.Group(); put(g, mesh(new T.BoxGeometry(.06, .9, .025), fixed(0xe8eef8, { rough: .25 })), [0, .56, 0], [0, 0, .06]); put(g, cyl(.09, .09, .04, L ? goldM() : fixed(0x2a2233), 16), [0, .1, 0]); put(g, cyl(.035, .035, .26, pl(0x2a2a38), 8), [0, -.05, 0]); return g; },
    scroll(c) { const g = new T.Group(); put(g, cyl(.08, .08, .42, pl(0xfff4dc), 16), [0, 0, 0], [0, 0, Math.PI / 2]); [-1, 1].forEach(s => put(g, cyl(.05, .05, .08, pl(0x8a5a3a), 10), [s * .25, 0, 0], [0, 0, Math.PI / 2])); return g; },
    staff(c, L) { const g = new T.Group(); put(g, cyl(.04, .05, 1.3, pl(0x9a6a40), 10), [0, .35, 0]); blob(g, L ? gemM(0xff5ac8) : gemM(c ? c[2] || 0x6fc8ff : 0x6fc8ff), [0, 1.06, 0], .14); return g; },
    fan(c, L) { const g = new T.Group(); const f = mesh(new T.CircleGeometry(.4, 24, 0, Math.PI), pl(c ? c[2] || 0xff6b7a : 0xff6b7a)); f.material.side = T.DoubleSide; put(g, f, [0, .02, 0]); if (L) blob(g, goldM(), [0, 0, .01], .05); return g; },
    orb(c, L) { const g = new T.Group(); blob(g, gemM(L ? 0xffe066 : 0x9ad8ff), [0, .1, 0], .2); return g; },
    book(c) { const g = new T.Group(); K.sq(g, pl(c ? c[2] || 0xc85a5a : 0xc85a5a), [0, 0, 0], [.34, .44, .12], .3); K.sq(g, fixed(0xfff8e8), [.03, 0, 0], [.3, .4, .1], .3); return g; },
    flag(c) { const g = new T.Group(); put(g, cyl(.025, .025, 1.0, pl(0x9a6a40), 8), [0, .3, 0]); const f = blob(g, pl(c ? c[2] || 0xff6b7a : 0xff6b7a), [.2, .66, 0], [.2, .14, .03]); return g; },
    goblet(c, L) { const g = new T.Group(); const m = L ? goldM() : pl(0xd8c8a0); put(g, cyl(.15, .04, .2, m, 20), [0, .2, 0]); put(g, cyl(.03, .03, .16, m, 8), [0, .03, 0]); put(g, cyl(.1, .1, .03, m, 16), [0, -.05, 0]); return g; },
    quill() { const g = new T.Group(); blob(g, fixed(0xfffaf0), [0, .3, 0], [.07, .34, .02], [0, 0, -.2]); put(g, cyl(.012, .012, .3, fixed(0x2a2233), 6), [.04, 0, 0], [0, 0, -.2]); return g; },
    piece(c) { const g = new T.Group(), m = fixed(c && c[2] === 1 ? 0xfbfaf4 : 0x26262e, { rough: .45 }); g.add(puck(.18, .06, m, .5)); blob(g, m, [0, .16, 0], [.08, .12, .08]); blob(g, m, [0, .32, 0], .09); return g; },
    shogi() { const g = K.shogiPiece('王', .34); return g; },
    seeds(c) { const g = new T.Group(); for (let i = 0; i < 6; i++) blob(g, gemM([0x46c8a0, 0xff6b7a, 0x6fb8ff, 0xffd65a][i % 4]), [Math.cos(i) * .1, (i % 3) * .06, Math.sin(i * 2) * .1], .07); return g; },
    sticks(c) { const g = new T.Group(); [-1, 0, 1].forEach(i => { const s = put(g, mesh(new T.BoxGeometry(.06, .5, .03), pl(i ? 0xf0e0c0 : 0x3a2a20)), [i * .07, .2, 0], [0, 0, i * .15]); }); return g; },
    pyramid(c) { const g = new T.Group(); put(g, cone(.24, .3, pl(0xf0d8a0), 4), [0, .12, 0], [0, Math.PI / 4, 0]); return g; },
    paddle(c) { const g = new T.Group(); blob(g, pl(0xc89a6a), [0, .4, 0], [.14, .26, .04]); put(g, cyl(.035, .035, .5, pl(0x9a6a40), 8), [0, 0, 0]); return g; },
    striker() { const g = new T.Group(); g.add(puck(.2, .07, fixed(0xfffaf0, { rough: .4 }), .5)); g.rotation.x = 1.2; return g; },
    hex(c) { const g = new T.Group(); const h = put(g, cyl(.24, .24, .08, pl(c ? c[2] || 0xff6b7a : 0xff6b7a), 6), [0, 0, 0], [1.2, 0, 0]); return g; },
    shield(c, L) { const g = new T.Group(); const d = put(g, cyl(.32, .32, .07, pl(c ? c[2] || 0xc83a4a : 0xc83a4a), 32), [0, 0, 0], [Math.PI / 2, 0, 0]); blob(g, L ? goldM() : pl(0xd8c8a0), [0, 0, .05], [.09, .09, .04]); return g; },
    hammer(c, L) { const g = new T.Group(); put(g, cyl(.035, .04, .5, pl(0x8a5a3a), 8), [0, .1, 0]); K.sq(g, L ? goldM() : pl(0xb8bcc8, { rough: .45 }), [0, .4, 0], [.36, .2, .2], .4); return g; },
    broom(c) { const g = new T.Group(); put(g, cyl(.03, .035, 1.1, pl(0x8a5a3a), 8), [0, .3, 0]); put(g, cone(.16, .36, pl(0xe0b860, { rough: .95 }), 12), [0, -.32, 0], [Math.PI, 0, 0]); return g; },
    tea(c) { const g = new T.Group(); const m = pl(0xd8a040, { rough: .4 }); blob(g, m, [0, .1, 0], [.18, .2, .18]); put(g, cyl(.07, .1, .1, m, 12), [0, .32, 0]); blob(g, m, [.18, .14, 0], [.08, .04, .04]); return g; },
    // (Amazons, 2026-11-11: the archers' bow and the game's fire arrow)
    bow(c, L) {
      const g = new T.Group(), wood = L ? goldM() : pl(c && c[2] ? shade(c[2], -.15) : 0x9a6a40, { rough: .55 });
      put(g, tor(.5, .045, wood, Math.PI * .9), [0, .3, 0], [0, 0, Math.PI * .55]);   // (the limbs: an arc, open to the string)
      [-1, 1].forEach(s => blob(g, wood, [Math.cos(Math.PI * .55 + (s > 0 ? Math.PI * .9 : 0)) * .5, .3 + Math.sin(Math.PI * .55 + (s > 0 ? Math.PI * .9 : 0)) * .5, 0], .06));
      const tip = a => [Math.cos(a) * .5, .3 + Math.sin(a) * .5], t0 = tip(Math.PI * .55), t1 = tip(Math.PI * 1.45);
      const len = Math.hypot(t1[0] - t0[0], t1[1] - t0[1]), str = put(g, cyl(.008, .008, len, fixed(0xfffaf0), 6), [(t0[0] + t1[0]) / 2, (t0[1] + t1[1]) / 2, 0]);
      str.rotation.z = Math.atan2(t1[1] - t0[1], t1[0] - t0[0]) - Math.PI / 2;
      const ar = PROPS.arrow(c, L); ar.position.set(-.02, .3, .04); ar.rotation.z = -Math.PI / 2; ar.scale.setScalar(.9); g.add(ar);   // (an arrow on the string)
      return g;
    },
    arrow(c, L) {
      const g = new T.Group();
      put(g, cyl(.018, .018, .86, pl(0xc8a070), 8), [0, .2, 0]);                                       // shaft
      put(g, cone(.06, .16, L ? goldM() : fixed(0xd8dce6, { rough: .3 }), 12), [0, .7, 0]);            // head
      blob(g, gemM(0xff7a2a), [0, .7, 0], [.06, .1, .06]).material.emissive = new T.Color(0xff5a1a);   // (the fire on its tip)
      [0, 1, 2].forEach(i => { const f = blob(g, pl(c && c[2] ? c[2] : 0xd83a4a), [0, -.17, 0], [.012, .1, .06]); f.rotation.y = i * Math.PI * 2 / 3; f.position.x = Math.cos(i * 2.09) * .04; f.position.z = Math.sin(i * 2.09) * .04; });   // fletching
      return g;
    },
    none() { return null; },
  };
  /* ---------------- the creature ---------------- */
  // animal → ears / snout / extras (a = ears, s = snout, t = tail, w = wings instead of arms)
  const AN = {
    bear: { e: 'round', s: 'muzzle', t: 'nub' }, cat: { e: 'point', s: 'nose', t: 'long', m: 'w' }, fox: { e: 'tall', s: 'fox', t: 'fluffy', m: 'w' },
    dog: { e: 'floppy', s: 'muzzle', t: 'nub' }, rabbit: { e: 'long', s: 'nose', t: 'nub', m: 'w' }, mouse: { e: 'big', s: 'nose', t: 'long', m: 'w' },
    lion: { e: 'round', s: 'muzzle', t: 'long', x: ['mane'] }, tiger: { e: 'round', s: 'muzzle', t: 'long', x: ['stripes'] }, wolf: { e: 'tall', s: 'fox', t: 'fluffy' },
    owl: { e: 'tuft', s: 'beak', t: 'none', w: 1 }, bird: { e: 'none', s: 'beak', t: 'none', w: 1 }, hawk: { e: 'none', s: 'hook', t: 'none', w: 1 },
    ibis: { e: 'none', s: 'long', t: 'none', w: 1 }, penguin: { e: 'none', s: 'beak', t: 'none', w: 1 }, crane: { e: 'none', s: 'long', t: 'none', w: 1, x: ['crest'] },
    elephant: { e: 'elephant', s: 'trunk', t: 'nub' }, frog: { e: 'frog', s: 'none', t: 'none', m: 'smile' }, turtle: { e: 'none', s: 'nose', t: 'nub', x: ['shell'] },
    dragon: { e: 'horns', s: 'snout', t: 'dragon', x: ['spikes'] }, monkey: { e: 'monkey', s: 'nose', t: 'long', x: ['facepatch'] }, sheep: { e: 'floppy', s: 'nose', t: 'nub', x: ['wool'] },
    deer: { e: 'point', s: 'nose', t: 'nub' }, camel: { e: 'point', s: 'muzzle', t: 'nub', x: ['hump'] }, panda: { e: 'round', s: 'nose', t: 'nub', x: ['eyepatch'] },
    tanuki: { e: 'round', s: 'muzzle', t: 'fluffy', x: ['mask'] }, squirrel: { e: 'point', s: 'nose', t: 'squirrel', m: 'w' }, beaver: { e: 'round', s: 'muzzle', t: 'flat', x: ['teeth'] },
    bull: { e: 'floppy', s: 'muzzle', t: 'long', x: ['horns'] }, croc: { e: 'none', s: 'croc', t: 'dragon', x: ['spikes'] }, jackal: { e: 'tall', s: 'fox', t: 'fluffy' },
    hippo: { e: 'round', s: 'hippo', t: 'nub' }, goat: { e: 'floppy', s: 'nose', t: 'nub', x: ['goathorns', 'goatee'] }, seal: { e: 'none', s: 'muzzle', t: 'none', w: 1 },
    horse: { e: 'point', s: 'muzzle', t: 'long', x: ['horsemane'] }, boar: { e: 'point', s: 'pig', t: 'nub', x: ['tusks'] }, koala: { e: 'big', s: 'koala', t: 'none' },
    lizard: { e: 'none', s: 'snout', t: 'dragon' }, jaguar: { e: 'round', s: 'muzzle', t: 'long', x: ['spots'] }, bat: { e: 'tall', s: 'nose', t: 'none', x: ['batwings'] }, otter: { e: 'round', s: 'muzzle', t: 'long' },
  };
  // a cape: the back half of a soft bell hanging from the shoulders (never in front of the belly)
  function capeOn(g, cm) {
    const cp = mesh(new T.SphereGeometry(1, 32, 16, Math.PI * 1.06, Math.PI * .88, Math.PI * .22, Math.PI * .6), cm); cp.material.side = T.DoubleSide;
    cp.scale.set(.7, 1.0, .62); cp.position.set(0, 1.02, -.06); g.add(cp);
    [-1, 1].forEach(s => blob(g, cm, [s * .34, .98, .02], [.12, .09, .12]));
  }
  function build(sp, tier) {
    const m = sp.m, A = AN[m.a] || AN.bear, L = tier >= 3, rank = sp.rank || 0;
    const g = new T.Group(), c = m.c || [0xffc890, 0xfff4e6, 0xff6b7a];
    const B = pl(c[0], { under: shade(c[0], -.1) }), cream = pl(c[1] || 0xfff4e6, { under: 0xffd6e4, uk: .35 }), acc = pl(c[2] || 0xff6b7a);
    const dark = pl(shade(c[0], -.28));
    // body, belly, feet
    blob(g, B, [0, .52, 0], [.52, .5, .46]); blob(g, cream, [0, .48, .22], [.34, .33, .27]);
    [-1, 1].forEach(s => blob(g, B, [s * .24, .1, .26], [.15, .1, .18]));
    // arms / wings
    if (A.w) [-1, 1].forEach(s => blob(g, B, [s * .5, .58, .02], [.12, .3, .24], [0, 0, s * .45]));
    else [-1, 1].forEach(s => blob(g, B, [s * .44, .6, .24], [.12, .17, .12], [0, 0, s * .4]));
    // head
    const hc = V3(0, 1.45, .02), HR = [.84, .72, .72];
    blob(g, B, [hc.x, hc.y, hc.z], HR);
    const eyeV = .1, surf = ell(hc, HR);
    // ears
    const inner = pl(0xffb6cc, { under: 0xff8fb0 });
    const E = A.e;
    if (E === 'round' || E === 'monkey') [-1, 1].forEach(s => { blob(g, B, [s * .62, 1.98, -.06], [.24, .24, .14]); blob(g, E === 'monkey' ? cream : inner, [s * .62, 1.97, .02], [.14, .14, .06]); });
    else if (E === 'big') [-1, 1].forEach(s => { blob(g, B, [s * .72, 1.96, -.1], [.36, .36, .12]); blob(g, inner, [s * .72, 1.95, -.02], [.24, .24, .05]); });
    else if (E === 'point' || E === 'tall') { const hgt = E === 'tall' ? .72 : .5; [-1, 1].forEach(s => { const e = put(g, cone(.26, hgt, B), [s * .5, 1.98 + hgt * .12, -.1], [-.1, 0, -s * .36], [1, 1, .55]); put(g, cone(.15, hgt * .64, inner), [s * .48, 1.94 + hgt * .12, -.04], [-.1, 0, -s * .36], [1, 1, .4]); }); }
    else if (E === 'long') [-1, 1].forEach(s => { blob(g, B, [s * .3, 2.3, -.08], [.15, .48, .12], [0, 0, -s * .15]); blob(g, inner, [s * .3, 2.3, -.01], [.08, .36, .05], [0, 0, -s * .15]); });
    else if (E === 'floppy') [-1, 1].forEach(s => blob(g, dark, [s * .82, 1.4, 0], [.18, .42, .3], [0, 0, s * .25]));
    else if (E === 'tuft') [-1, 1].forEach(s => put(g, cone(.16, .4, B), [s * .5, 2.1, 0], [0, 0, -s * .5]));
    else if (E === 'elephant') [-1, 1].forEach(s => { blob(g, B, [s * .86, 1.48, -.08], [.12, .5, .44], [0, s * .3, 0]); blob(g, inner, [s * .9, 1.48, 0], [.06, .36, .3], [0, s * .3, 0]); });
    else if (E === 'horns') [-1, 1].forEach(s => put(g, cone(.1, .4, L ? goldM() : pl(0xfff4dc), 16), [s * .36, 2.12, -.1], [-.2, 0, -s * .3]));
    else if (E === 'frog') [-1, 1].forEach(s => blob(g, B, [s * .36, 2.0, .12], [.24, .22, .22]));
    // (the celestial Janus) two-sided: the left half of the body, head, ear, paw and foot in the other colour, with a white patch round its eye
    if (m.split != null) {
      const D2 = pl(m.split, { under: shade(m.split, -.08) });
      g.children.forEach(ch => { if (ch.material === B && ch.position.x < -.05) ch.material = D2; });
      const half = (p, sc) => { const h = mesh(new T.SphereGeometry(1, 40, 24, -Math.PI / 2, Math.PI), D2); h.position.set(...p); h.scale.set(sc[0] * 1.012, sc[1] * 1.012, sc[2] * 1.012); g.add(h); };
      half([0, .52, 0], [.52, .5, .46]); half([hc.x, hc.y, hc.z], HR);
      const q = surf(-.28, eyeV); blob(g, fixed(0xffffff), [q.p.x + q.n.x * .012, q.p.y + q.n.y * .012, q.p.z + q.n.z * .012], [.155, .15, .008]).lookAt(q.p.x + q.n.x, q.p.y + q.n.y, q.p.z + q.n.z);
    }
    // snout / beak
    let mouthSurf = null, mouth = m.mouth || A.m || 'smile', my = .34;
    const S = A.s;
    if (S === 'muzzle' || S === 'koala') { blob(g, cream, [0, 1.25, .58], [.32, .22, .2]); blob(g, fixed(INK, { rough: .45 }), [0, 1.34, .78], [S === 'koala' ? .14 : .08, S === 'koala' ? .1 : .055, .05]); }
    else if (S === 'fox') { blob(g, cream, [0, 1.2, .3], [.6, .36, .44]); blob(g, fixed(INK, { rough: .45 }), [0, 1.36, .78], [.075, .055, .05]); }
    else if (S === 'nose') blob(g, fixed(INK, { rough: .45 }), [0, 1.36, .74], [.065, .05, .045]);
    else if (S === 'beak' || S === 'hook') { const bm = pl(m.beak || 0xffb03a); put(g, cone(.13, .3, bm, 20), [0, 1.3, .82], [Math.PI / 2 + (S === 'hook' ? .4 : 0), 0, 0]); mouth = 'none'; }
    else if (S === 'long') { const bm = pl(m.beak || 0x2a2a38); put(g, cone(.08, .7, bm, 16), [0, 1.18, 1.0], [Math.PI / 2 + .55, 0, 0]); mouth = 'none'; }
    else if (S === 'trunk') { [0, 1, 2, 3].forEach(i => blob(g, B, [0, 1.28 - i * .1, .74 + i * .06 - (i > 2) * .1], [.13 - i * .015, .13, .13])); mouth = 'none'; }
    else if (S === 'snout' || S === 'croc') { const L2 = S === 'croc' ? .5 : .32; blob(g, B, [0, 1.22, .55 + L2 * .3], [.38, .2, L2]); [-1, 1].forEach(s => blob(g, fixed(INK), [s * .1, 1.33, .58 + L2 * .9], [.03, .02, .02])); mouth = 'none'; if (S === 'croc') [-1, 1].forEach(s => [0, 1, 2].forEach(i => put(g, cone(.03, .07, fixed(0xffffff), 6), [s * .3, 1.1, .7 + i * .14], [Math.PI, 0, 0]))); }
    else if (S === 'hippo') { blob(g, cream, [0, 1.2, .55], [.5, .3, .3]); [-1, 1].forEach(s => blob(g, fixed(INK), [s * .14, 1.32, .84], [.04, .03, .02])); mouth = 'none'; }
    else if (S === 'pig') { put(g, cyl(.16, .17, .14, pl(shade(c[0], .06)), 24), [0, 1.3, .74], [Math.PI / 2, 0, 0]); [-1, 1].forEach(s => blob(g, fixed(INK), [s * .06, 1.3, .815], [.03, .04, .01])); }
    // face
    const eyes = face(g, surf, { er: .1, gap: .28, v: eyeV, eyes: m.eyes || 'bead', mouth, mw: .12, my, by: .1, bx: .14 });
    // stern brows: the strong bosses look a little tougher (still cute)
    if (rank >= .55 || m.brow) [-1, 1].forEach(s => { const p = surf(s * .28, eyeV + .2), b = mesh(new T.SphereGeometry(1, 16, 10), fixed(INK)); b.scale.set(.1, .028, .02); b.position.copy(p.p).addScaledVector(p.n, .008); b.lookAt(b.position.clone().add(p.n)); b.rotateZ(-s * .32); g.add(b); });
    // extras
    // N (tier 0) = the bare plush with its prop, R (1) = + the hat, SR (2) and up = + the outfit
    const OUTFIT = ['glasses', 'monocle', 'cape', 'cape?', 'ruff', 'scarf', 'necklace', 'collar', 'belt', 'robe', 'armor'];
    const X = (A.x || []).concat((m.ex || []).filter(x => tier >= 2 || !OUTFIT.includes(x)));
    X.forEach(x => {
      if (x === 'mane') for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; blob(g, pl(c[2] || 0xd8823a), [Math.cos(a) * .82, 1.45 + Math.sin(a) * .7, -.12], [.26, .26, .2]); }
      else if (x === 'horsemane') for (let i = 0; i < 5; i++) blob(g, acc, [0, 2.1 - i * .18, -.3 - i * .1], [.14, .16, .14]);
      else if (x === 'spots') {   // (the jaguar's rosettes: on the head's surface round the face, and on the body's sides and back)
        const sp = pl(shade(c[0], -.45));
        [[-.52, .42], [.5, .45], [-.66, .12], [.68, .1], [-.22, .6], [.24, .58]].forEach(([u, v]) => { const q = surf(u, v); blob(g, sp, [q.p.x, q.p.y, q.p.z], [.075, .06, .04]).lookAt(q.p.x + q.n.x, q.p.y + q.n.y, q.p.z + q.n.z); });
        [[-.42, .66], [.42, .62], [-.47, .4], [.46, .44], [-.3, .82], [.3, .84]].forEach(([x0, y0]) => { const k = 1 - (x0 / .52) ** 2 - ((y0 - .52) / .5) ** 2, z0 = k > 0 ? .46 * Math.sqrt(k) : 0; blob(g, sp, [x0 * 1.02, y0, z0 * .55 - .12], [.07, .06, .06]); });
      }
      else if (x === 'stripes') [-1, 1].forEach(s => [0, 1].forEach(i => blob(g, dark, [s * (.6 - i * .08), 1.7 - i * .2, .3], [.05, .14, .03], [0, s * .6, s * .5])));
      else if (x === 'crest') for (let i = 0; i < 3; i++) blob(g, acc, [0, 2.12 + i * .02, -.1 - i * .14], [.05, .16, .07], [-.5 - i * .3, 0, 0]);
      else if (x === 'shell') { blob(g, pl(c[2] || 0x7ab060), [0, .66, -.36], [.56, .5, .34]); for (let i = 0; i < 5; i++) blob(g, pl(shade(c[2] || 0x7ab060, -.1)), [Math.cos(i * 1.26) * .3, .72 + Math.sin(i * 1.26) * .28, -.64], [.12, .12, .05]); }
      else if (x === 'spikes') for (let i = 0; i < 5; i++) put(g, cone(.08, .2, acc, 8), [0, 2.1 - i * .3, -.5 - Math.sin(i / 4 * Math.PI) * .2], [-.6 - i * .25, 0, 0]);
      else if (x === 'facepatch') blob(g, cream, [0, 1.38, .5], [.52, .42, .3]);
      else if (x === 'wool') for (let i = 0; i < 7; i++) { const a = i / 6 * Math.PI; blob(g, pl(0xfffaf2), [Math.cos(a) * .55, 1.9 + Math.sin(a) * .25, .1], [.2, .18, .2]); }
      else if (x === 'hump') blob(g, B, [0, 1.0, -.32], [.3, .28, .26]);
      else if (x === 'eyepatch' || x === 'mask') [-1, 1].forEach(s => { const p = surf(s * .28, eyeV); blob(g, pl(x === 'mask' ? shade(c[0], -.32) : 0x2a2a38), [p.p.x, p.p.y, p.p.z - .05], [.2, .17, .1], [0, 0, s * (x === 'mask' ? .3 : -.4)]); });
      else if (x === 'teeth') K.sq(g, fixed(0xffffff), [0, 1.1, .78], [.14, .12, .05], .3);
      else if (x === 'horns') [-1, 1].forEach(s => put(g, tor(.22, .06, pl(0xfff4dc), Math.PI * .6), [s * .55, 2.0, 0], [0, 0, s > 0 ? 0 : Math.PI * .4]));
      else if (x === 'goathorns') [-1, 1].forEach(s => put(g, cone(.08, .45, pl(0xd8c8a8), 12), [s * .3, 2.12, -.18], [-.6, 0, -s * .25]));
      else if (x === 'goatee' || x === 'beard') { const bm = pl(m.bc || 0xfaf6f0); blob(g, bm, [0, 1.0, .5], [.26, .26, .18]); blob(g, bm, [0, .78, .48], [.14, .2, .12]); }
      else if (x === 'longbeard') { const bm = pl(m.bc || 0xfaf6f0); blob(g, bm, [0, 1.02, .52], [.34, .28, .2]); blob(g, bm, [0, .72, .5], [.22, .3, .14]); blob(g, bm, [0, .48, .46], [.1, .18, .08]); }
      else if (x === 'mustache') [-1, 1].forEach(s => blob(g, pl(m.bc || 0x5a4030), [s * .14, 1.17, .74], [.16, .05, .05], [0, 0, s * -.25]));
      else if (x === 'tusks') [-1, 1].forEach(s => put(g, cone(.04, .16, fixed(0xffffff), 8), [s * .16, 1.2, .76], [0, 0, 0]));
      else if (x === 'angelwings') [-1, 1].forEach(s => {   // (feathered wings behind the shoulders: a fan of long feathers over a row of short ones)
        const wm = fixed(0xffffff, { under: 0xdfe6ff, uk: .55, sheen: 0xffffff, sheenK: .4 });
        const fan = (n, a0, a1, len, w, z) => { for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / (n - 1), l = len * (1 - .12 * Math.abs(i - (n - 1) * .35)); blob(g, wm, [s * (.34 + Math.cos(a) * l), 1.0 + Math.sin(a) * l, z], [w, l, .06], [0, 0, s * (a - Math.PI / 2)]); } };
        fan(5, .15, 1.15, .62, .15, -.5); fan(4, -.25, .6, .4, .13, -.44); blob(g, wm, [s * .4, 1.0, -.42], [.2, .2, .1]);
      });
      else if (x === 'batwings') [-1, 1].forEach(s => blob(g, dark, [s * .8, 1.0, -.2], [.4, .3, .05], [0, s * .5, s * .3]));
      else if (x === 'glasses') [-1, 1].forEach(s => { const p = surf(s * .28, eyeV); const r = put(g, tor(.15, .02, fixed(L ? 0xffd65a : 0x2a2233)), [p.p.x, p.p.y, p.p.z + .05]); });
      else if (x === 'monocle') { const p = surf(.28, eyeV); put(g, tor(.16, .022, fixed(0xffd65a)), [p.p.x, p.p.y, p.p.z + .05]); }
      else if (x === 'cape' || (x === 'cape?' && (L || rank >= .6))) { const cm = pl(m.cape || c[2] || 0xc83a4a); capeOn(g, cm); if (L) put(g, tor(.36, .05, goldM()), [0, .98, .02], [Math.PI / 2, 0, 0]); }
      else if (x === 'ruff') for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; blob(g, fixed(0xffffff), [Math.cos(a) * .36, .98, Math.sin(a) * .32], [.14, .07, .1], [0, -a, 0]); }
      else if (x === 'scarf') { const sm = pl(m.sc || c[2] || 0x6fb8ff); put(g, tor(.4, .1, sm), [0, .96, .02], [Math.PI / 2 - .1, 0, 0]); blob(g, sm, [.18, .7, .4], [.08, .2, .05], [0, 0, .2]); }
      else if (x === 'necklace') { put(g, tor(.38, .04, L ? goldM() : pl(c[2] || 0x46c8a0)), [0, .95, .03], [Math.PI / 2 - .2, 0, 0]); blob(g, gemM(0xff3d6e), [0, .82, .42], .07); }
      else if (x === 'collar') { const cm = pl(m.cc || c[2] || 0x3a6ad8); for (let i = 0; i < 9; i++) { const a = i / 8 * Math.PI; blob(g, i % 2 ? (L ? goldM() : cream) : cm, [Math.cos(a) * .4, .92 - Math.sin(a) * .02, .14 + Math.sin(a) * .26], [.1, .06, .12], [0, -a + Math.PI / 2, 0]); } }
      else if (x === 'belt') put(g, tor(.5, .06, L ? goldM() : acc), [0, .5, 0], [Math.PI / 2, 0, 0]);
      else if (x === 'robe') { const rm = pl(m.rc || c[2] || 0x5a7ad8); blob(g, rm, [0, .5, .02], [.56, .52, .5]); blob(g, cream, [0, .55, .4], [.1, .4, .1]); }
      else if (x === 'armor') { const am = L ? goldM() : pl(m.ac || 0xc8ccd8, { rough: .5 }); blob(g, am, [0, .62, .14], [.5, .38, .38]); }
    });
    // SSR / UR: a gold brooch on the chest
    if (L && !X.includes('necklace') && !X.includes('collar')) { blob(g, goldM(), [0, .86, .44], [.11, .11, .05]); blob(g, gemM(sp.rank >= .99 ? 0xff3d6e : 0x5ec8ff), [0, .86, .48], [.06, .06, .03]); }
    // tail
    const TL = A.t;
    if (TL === 'nub') blob(g, B, [0, .5, -.46], [.12, .12, .12]);
    else if (TL === 'long') blob(g, B, [.36, .5, -.48], [.07, .07, .32], [.6, .4, 0]);
    else if (TL === 'fluffy' || TL === 'squirrel') { const k = TL === 'squirrel' ? 1.3 : 1; blob(g, B, [.5, .7 * k, -.42], [.26 * k, .46 * k, .26 * k], [.35, 0, -.7]); blob(g, cream, [.8, 1.02 * k, -.5], [.18 * k, .2 * k, .18 * k]); }
    else if (TL === 'dragon') { [0, 1, 2].forEach(i => blob(g, B, [.15 + i * .18, .3 + i * .04, -.45 - i * .16], [.16 - i * .03, .14 - i * .03, .2])); put(g, cone(.08, .18, acc, 8), [.7, .4, -.88], [-1.2, 0, 0]); }
    else if (TL === 'flat') blob(g, dark, [0, .2, -.6], [.24, .06, .3]);
    // hat
    const hg = new T.Group(), hk = tier >= 1 && m.hat || 'none', hcol = m.hc || Object.assign([c[2]], { auto: true }); (HATS[hk] || HATS.none)(hg, hcol, L);
    const hy = E === 'long' ? 2.04 : E === 'frog' ? 2.12 : 2.06;
    if (hk !== 'none') { hg.position.set(0, hy, -.04); hg.rotation.set(-.08, 0, hk === 'crown' || hk === 'beret' ? -.12 : 0); g.add(hg); }
    if (L && m.hat2) { const h2 = new T.Group(); HATS[m.hat2](h2, hcol, L); h2.position.set(0, hy + .12, -.04); g.add(h2); }
    // prop in the right paw
    const pr = (PROPS[m.held || 'none'] || PROPS.none)(c, L);
    if (pr) { pr.position.set(-.58, .66, .38); g.add(pr); }
    if (L && rank >= .99 && !(X.includes('cape')) && !X.includes('angelwings')) { capeOn(g, pl(m.cape || 0x8a3ad8)); }
    // the strongest boss (UR): a ring of stars behind and above the head
    if (L && rank >= .99) { const n0 = g.children.length; for (let i = 0; i < 7; i++) { const a = Math.PI * (1.05 + i / 6 * .9); K.sparkle(g, [Math.cos(a) * 1.25, 1.75 - Math.sin(a) * .7, -.45 + Math.sin(a) * .2], .07 + (i % 3) * .025); } g.children.forEach((ch, j) => { if (j >= n0) ch.userData.fx = true; }); }
    g.userData.head = [1.55, .95, .05]; g.userData.top = [0, hy + .2, -.04, 0];
    return alive(g, eyes);
  }
  // register every boss as an avatar species (ids boss-<game>-<n>; tiers 0–2 = N / R / SR won at the AI levels, 3 = SSR / UR in the gacha)
  const B = AtlasNPC.BOSSES;
  Object.keys(B).forEach(gid => B[gid].forEach((sp, i) => {
    const n = B[gid].length - (B[gid][B[gid].length - 1].cel ? 1 : 0); sp.rank = sp.cel ? 1 : n > 1 ? i / (n - 1) : 1;   // (the celestial boss is outside the ranks: the others keep theirs)
    D(`boss-${gid}-${i + 1}`, { name: sp.n, boss: true, ur: false,   // (the UR aura is drawn by build(), behind the head: the shared one crossed the face)
      build: (o, t) => build(sp, t),
      v: [{ acc: [] }, { acc: [] }, { acc: [] }, { acc: [], finish: 'none' }] });
  }));
  window.AtlasBoss3D = { build, HATS, PROPS, AN };
})();
