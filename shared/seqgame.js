// seqGameStart(P, cfg) — the 3-move opening practice (shared/seqprac.js) for the games made from the checkers template
// (checkers, xiangqi, janggi, tafl, ugolki, agon, fanorona, konane, hex, gomoku, morris …): it runs in the game's own global
// scope (E, request, sOfV, moves, cur, update, lessonMarks, renderFx, mFrom, mvIn, lesson, OPEN …). Moves are the engine's
// move numbers (as strings for SeqPrac). No frequency book in these games: the opponent follows the opening's model line
// (openings.json study.line) while the position is on it, else the engine; every move is rated by the engine (2026-11-10).
// cfg (optional): spec (start), studySpec, name(pos, m), over(r, ints), hintAt(m), level, time, side(line) → a side mark
(function () {
'use strict';
window.seqGameStart = function (P, cfg) {
  cfg = cfg || {};
  const spec = cfg.spec !== undefined ? cfg.spec : P.s;
  const dec = u => /^-?\d+$/.test(u) ? +u : u, ints = line => line.map(dec),   // (moves: numbers, or strings in fanorona)
   rep = line => E.replay(spec, ints(line));
  const hashOf = r => String(r.hashes && r.hashes.length ? r.hashes[r.hashes.length - 1] : '');
  const g = lesson && lesson.virt && OPEN && OPEN.sets.find(x => x.id === lesson.virt.id), model = new Map();
  if (!cfg.noModel) try {
    const L = g && g.study && (g.study.line || (g.study.steps && g.study.steps.map(x => x[0])));
    if (L) for (let k = 0; k < L.length; k++) { const r = E.replay(cfg.studySpec !== undefined ? cfg.studySpec : null, L.slice(0, k)); const h = hashOf(r); if (h && !model.has(h)) model.set(h, String(L[k])); }
  } catch (e) {}
  const L0 = lesson, P0 = P, lvl = cfg.level || (typeof COACH_DEEP !== 'undefined' ? COACH_DEEP : 16);
  // the game's own functions on a line of moves (they read the global `moves`): status and notation exactly as in the kifu
  const withLine = (l, f) => { const sm = moves, sc = cur; moves = l; try { return f(); } finally { moves = sm; cur = sc; } };
  const nameG = (l, m) => withLine([...l, m], () => typeof mvAt === 'function' ? mvAt(l.length) : typeof mvName === 'function' ? mvName(m) : typeof mvIn === 'function' ? mvIn(posAt(l.length).pos, m) : String(m));
  const name = (pos, m) => cfg.name ? cfg.name(pos, m) : typeof mvIn === 'function' ? mvIn(pos, m) : E.name(pos, m);
  const nameL = (line, u) => { try { if (cfg.nameM) return (cfg.side ? cfg.side(line) : '') + cfg.nameM(dec(u), ints(line)); return (cfg.side ? cfg.side(line) : '') + (cfg.name ? cfg.name(rep(line).pos, dec(u)) : nameG(ints(line), dec(u))); } catch (e) { return String(u); } };
  SeqPrac.start({
    lang: () => (typeof LANG !== 'undefined' ? LANG : document.documentElement.lang),
    book: () => null,
    analyze: cfg.analyze ? line => cfg.analyze(ints(line)) : async line => {
      const r = await request('ana', { type: 'analyze', moves: ints(line), time: cfg.time || 1300 });
      return ((r && r.list) || []).map(e => ({ u: String(e.m), wr: (sOfV(e.v) + 1) / 2 })).sort((a, b) => b.wr - a.wr);
    },
    think: cfg.think ? line => cfg.think(ints(line)) : async line => { const r = await request('ai', { type: 'think', moves: ints(line), level: lvl }); return r && r.move != null && r.move !== false ? String(r.move) : null; },
    name: nameL,
    over: line => { try { if (cfg.overL) return !!cfg.overL(ints(line)); const l = ints(line); return !!withLine(l, () => statusAt(l.length).over); } catch (e) { return true; } },
    show: (line, anim) => { if (lesson !== L0) return; moves = ints(line); cur = moves.length; try { sel = null; } catch (e) {} lessonMarks = []; try { labelList = null; } catch (e) {} try { hintList = null; } catch (e) {} update(!!anim); },
    mark: u => { const m = dec(u), at = cfg.hintAt ? cfg.hintAt(m) : mFrom(m); lessonMarks = [{ at, cls: 'ok' }]; renderFx(); },
    model: line => { if (cfg.noModel) return null; try { return model.get(hashOf(rep(line))) || null; } catch (e) { return null; } },
    changed: () => { if (lesson !== L0 || lessonProblem() !== P0) return; renderLessonCard(); const fb = document.getElementById('lsFb'); if (fb) fb.innerHTML = SeqPrac.status(); },
    done: total => { if (lesson !== L0) return; lesson.results[lesson.i] = total; lesson.answered = true; renderLessonCard(); try { playChime(total >= 16); } catch (e) {} },
  });
};
})();
