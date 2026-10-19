// Minimal piskvork-protocol driver for Rapfi (used only as a training teacher / benchmark; not shipped)
'use strict';
const { spawn } = require('child_process');
const DIR = '/home/claude/work/ext/rapfi/Rapfi/build';
class Rapfi {
  constructor(opts = {}) {
    this.p = spawn(DIR + '/pbrain-rapfi', [], { cwd: DIR });
    this.buf = ''; this.waiters = []; this.msgs = [];
    this.p.stdout.on('data', d => { this.buf += d; let i; while ((i = this.buf.indexOf('\n')) >= 0) { const l = this.buf.slice(0, i).trim(); this.buf = this.buf.slice(i + 1); this.line(l); } });
    this.p.stderr.on('data', () => {});
    this.rule = null;
  }
  line(l) { if (process.env.DBG) console.error('<', l); if (l.startsWith('name=') && this.aboutW) { const w = this.aboutW; this.aboutW = null; w(l); return; }
    if (l.startsWith('ERROR')) { this.errors = (this.errors || 0) + 1; this.msgs.push(l); return; }
    const ans = /^\d+,\d+$/.test(l) || l === 'OK'; if (!ans) { this.msgs.push(l); return; } const w = this.waiters.shift(); if (w) w(l); }
  send(s) { this.p.stdin.write(s + '\n'); }
  next() { return new Promise(r => this.waiters.push(r)); }
  async start(rule, turnMs) {
    this.send('START 15'); await this.next();
    this.send('INFO rule ' + ({ free: 0, standard: 1, renju: 4 }[rule]));
    this.send('INFO thread_num 1'); this.send('INFO max_memory 134217728');
    this.send('INFO timeout_match 0'); this.send('INFO timeout_turn ' + (turnMs || 100));
    this.rule = rule;
    await this.sync();
  }
  // Rapfi silently drops commands that arrive while its 'thinking' flag is still set (just after it prints a move),
  // so wait until it answers ABOUT again (resending until it does) before sending anything that matters.
  async sync() {
    for (let k = 0; k < 40; k++) {
      this.send('ABOUT');
      const ab = await Promise.race([new Promise(r => { this.aboutW = r; }), new Promise(r => setTimeout(() => r(null), 250))]);
      if (ab) return true;
      this.aboutW = null;
    }
    return false;
  }
  setTurn(ms) { this.send('INFO timeout_turn ' + ms); }
  setNodes(n) { this.send('INFO MAX_NODE ' + n); }
  // moves: list of 0..224 (m = y*15 + x), side to move = moves.length parity. Returns { move, ev, msgs }
  async think(moves) {
    this.msgs = []; this.errors = 0;
    const s = ['BOARD'];
    moves.forEach((m, k) => s.push(`${m % 15},${Math.floor(m / 15)},${((moves.length - k) % 2) ? 2 : 1}`));
    s.push('DONE'); this.send(s.join('\n'));
    const l = await Promise.race([this.next(), new Promise(r => setTimeout(() => r(null), 15000))]);
    if (l === null) { this.waiters = []; return null; }
    if (!(await this.sync())) return null;
    if (this.errors) return { move: -1, ev: null, bad: true };
    const mm = l.match(/^(\d+),(\d+)$/); const move = mm ? +mm[2] * 15 + +mm[1] : -1;
    // last eval reported: "... ev X ..." (X may be +M5 / -M5 for mates)
    let ev = null;
    for (let k = this.msgs.length - 1; k >= 0 && ev === null; k--) { const e = this.msgs[k].match(/Eval\s+([+-]?M?\d+)/); if (e) ev = e[1]; }
    return { move, ev, line: l, msgs: this.msgs.slice(-3) };
  }
  quit() { try { this.send('END'); } catch (e) {} setTimeout(() => this.p.kill(), 200); }
}
module.exports = Rapfi;
if (require.main === module) (async () => {
  const r = new Rapfi(); await r.start('renju', 300);
  console.log(await r.think([112, 97, 113]));
  console.log(await r.think([112, 97, 113, 98]));
  r.quit();
})();
