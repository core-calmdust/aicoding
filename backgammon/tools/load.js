// Node loader for the backgammon engine with the same evaluators as the AI worker (engine.js):
// GNUbg-style nets (weights.json), wildbg contact/race nets and the bear-off database.
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const dir = path.join(__dirname, '..');
const BG = require(path.join(dir, 'bg.js'));
global.BG = BG;
const BGX = require(path.join(dir, 'explain.js'));
const j = JSON.parse(fs.readFileSync(path.join(dir, 'weights.json'), 'utf8'));
if (j.contact && BG.setNets) BG.setNets(j); else BG.setNet(new BG.Net(j.nh, new Float32Array(j.w)));
const man = JSON.parse(fs.readFileSync(path.join(dir, 'wildbg.json'), 'utf8'));
const bin = fs.readFileSync(path.join(dir, 'wildbg.bin'));
BG.loadWildbg(man, bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.length));
const bo = zlib.gunzipSync(fs.readFileSync(path.join(dir, 'bearoff.bin.gz')));
BG.loadBearoff(bo.buffer.slice(bo.byteOffset, bo.byteOffset + bo.length));
const decPos = s => { const p = new Int8Array(52); for (let i = 0; i < 52; i++) p[i] = parseInt(s[i], 16); return p; };
const encPos = p => Array.from(p, x => x.toString(16)).join('');
const encMoves = moves => moves.map(c => String.fromCharCode(65 + BG.mvFrom(c), 65 + BG.mvTo(c))).join('');
function decMoves(p, side, s) { const q = p.slice(), out = []; for (let i = 0; i < s.length; i += 2) out.push(BG.apply(q, side, s.charCodeAt(i) - 65, s.charCodeAt(i + 1) - 65)); return { moves: out, pos: q }; }
module.exports = { BG, BGX, decPos, encPos, encMoves, decMoves };
