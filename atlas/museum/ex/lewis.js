/* 所蔵品：ルイス島のチェス駒（大英博物館 1831,1101.78–.144 ほか／スコットランド国立博物館） — units: 1 = 1 cm.
   Walrus ivory (a few of whale tooth), probably carved in Norway (Trondheim) c. 1150–1200; found on Lewis in 1831 or earlier.
   Shown: one of each kind as they stand in a case — a king, a queen, a bishop, a knight, a warder and a pawn.

   2026-11-22: the figures are no longer modelled here. They are 3D scans of a replica set of the Lewis chess pieces:
     "Replica Lewis Chess Pieces on Chessboard" by Thomas Flynn (nebulousflynn), Sketchfab, licensed CC BY 4.0
     https://sketchfab.com/3d-models/replica-lewis-chess-pieces-on-chessboard-95a5545c8cd34042af8579d0cf972373
   (atlas/museum/glb/lewis-*.glb: the white pieces of that set, unchanged — 2,500 triangles each, with colour, normal and
   occlusion/roughness maps). A replica, not the museum's own pieces: the text says so. The British Museum's own scans are
   CC BY-NC-SA and were not used (the site may become commercial). */
(function () {
  'use strict';
  const HERE = (document.currentScript && document.currentScript.src) || location.href, NAMES = ['king', 'queen', 'bishop', 'knight', 'castle', 'pawn'], GLB = {};
  // a small reader for these files (binary glTF 2.0, one mesh, no extensions): the geometry and the three pictures
  const read = async name => {
    const buf = await (await fetch(new URL('../glb/lewis-' + name + '.glb', HERE).href)).arrayBuffer(), dv = new DataView(buf), jl = dv.getUint32(12, true);
    const j = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jl))), bin = 20 + jl + 8, p = j.meshes[0].primitives[0];
    const arr = (i, T, n) => { const a = j.accessors[i], v = j.bufferViews[a.bufferView]; return new T(buf.slice(bin + (v.byteOffset || 0) + (a.byteOffset || 0), bin + (v.byteOffset || 0) + (a.byteOffset || 0) + a.count * n * T.BYTES_PER_ELEMENT)); };
    const ia = j.accessors[p.indices], img = async i => { const v = j.bufferViews[j.images[i].bufferView]; return createImageBitmap(new Blob([new Uint8Array(buf, bin + (v.byteOffset || 0), v.byteLength)], { type: 'image/jpeg' }), { imageOrientation: 'none' }); };
    const m = j.materials[0], src = t => j.textures[t.index].source;
    GLB[name] = { pos: arr(p.attributes.POSITION, Float32Array, 3), nor: arr(p.attributes.NORMAL, Float32Array, 3), uv: arr(p.attributes.TEXCOORD_0, Float32Array, 2), idx: arr(p.indices, ia.componentType === 5125 ? Uint32Array : Uint16Array, 1),
      col: await img(src(m.pbrMetallicRoughness.baseColorTexture)), nrm: await img(src(m.normalTexture)), orm: await img(src(m.pbrMetallicRoughness.metallicRoughnessTexture)) };
  };
  (window.AtlasEx = window.AtlasEx || {}).lewis = {
    ready: () => Promise.all(NAMES.map(n => GLB[n] ? 0 : read(n).catch(e => console.warn('[lewis]', n, e)))),
    build(TT, X, K) {
      const G = new TT.Group();
      const tex = (bmp, srgb) => { const c = document.createElement('canvas'), k = 1; c.width = bmp.width * k; c.height = bmp.height * k; c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);   // (the files hold the normal and occlusion maps at half size already: tools/glb-shrink.py)
        const t = new TT.CanvasTexture(c); t.flipY = false; t.colorSpace = srgb ? TT.SRGBColorSpace : TT.NoColorSpace; return t; };
      const piece = name => { const d = GLB[name]; if (!d) return new TT.Group();
        const geo = new TT.BufferGeometry(); geo.setAttribute('position', new TT.BufferAttribute(d.pos, 3)); geo.setAttribute('normal', new TT.BufferAttribute(d.nor, 3)); geo.setAttribute('uv', new TT.BufferAttribute(d.uv, 2)); geo.setIndex(new TT.BufferAttribute(d.idx, 1));
        const orm = tex(d.orm, false), mat = new TT.MeshStandardMaterial({ map: tex(d.col, true), normalMap: tex(d.nrm, false), aoMap: orm, roughnessMap: orm, metalnessMap: orm, roughness: 1, metalness: 1 });
        const m = new TT.Mesh(geo, mat); m.scale.setScalar(100); m.castShadow = m.receiveShadow = true; return m; };   // (the scans are in metres)
      // the case: dark felt on a low block; back row king · queen · bishop · knight, front row warder · pawn
      const feltT = K.tex(256, 256, (g, w, h) => { const n = K.noise(5), img = g.createImageData(w, h), d = img.data; for (let i = 0; i < w * h; i++) { const v = 34 + n((i % w) / 6, (i / w | 0) / 6, 2) * 16; d[i * 4] = v * 1.05; d[i * 4 + 1] = v * .95; d[i * 4 + 2] = v * .9; d[i * 4 + 3] = 255; } g.putImageData(img, 0, 0); });
      const felt = K.mat({ map: feltT, color: '#ffffff', roughness: .96, sheen: .5, sheenRoughness: .9, sheenColor: K.lin('#5a4a40') });
      const base = new TT.Mesh(new TT.BoxGeometry(25, 1.2, 15), felt); base.position.y = -.6; base.receiveShadow = true; G.add(base);
      [['king', -2.8, -3.6, .06], ['queen', 2.8, -3.6, -.06], ['bishop', 8.6, -2.6, -.3], ['knight', -8.4, -1.4, .75],   // (each scan faces its own way: turned here to face the front)
        ['castle', -.2, 5.0, .12], ['pawn', 5.6, 4.4, -.2]].forEach(([n, x, z, ry]) => { const p = piece(n); p.position.set(x, 0, z); p.rotation.y = ry; G.add(p); });
      return G;
    },
  };
})();
