// Amazons puzzles: mine candidates of one theme in the background → tools/cand-<theme>-<seed>.jsonl (one { s, n, e?, a } a line)
// node tools/mine.js <w3|t2|t3|e2> <seed> <minutes>   (tools/gen_puzzles.js reads the files and picks by the fun score)
'use strict';
const path = require('path'), fs = require('fs');
const [theme, seedArg, minArg] = process.argv.slice(2);
global.MINE = { theme, seed: +seedArg || 1, until: Date.now() + (+minArg || 30) * 60000, out: path.join(__dirname, `cand-${theme}-${+seedArg || 1}.jsonl`) };
require('./gen_puzzles.js');
