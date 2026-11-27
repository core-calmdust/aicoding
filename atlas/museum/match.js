/* World Board Game Atlas — 博物館の「名局選」 (great games room, 2026-11-27 ユーザー: 名局・名勝負を、ミュゼフクの一手ごとの解説つきで).
   A wall of famous games; one opens on a board of its own (2D, the pieces slide), with the museum's Atlamo ミュゼフク (musowl) explaining the
   moves, the moves' list beside it (tap any move), and buttons to step, jump to the start or the end, play on by itself, or skip to the next note.
   Texts: museum/match-i18n.js (MUSEUM_MATCH_T[lang][id] = { t, w, b, ev, d, pl, lead, c: { ply: note } }); facts and rules: claude/museum-spec.md (名局選).
   Each kind of game is a KIND below: init() → the start; play(state, move) → { st, from, to, cap, … } (throws on a move that cannot be played,
   so tools/museum-match-check.js can test every game's record); label(…) → the move as written in the list; the board's look.
   AtlasMatch.render(box, ctx) — the museum (atlas/museum.js) calls it. */
(function () {
  'use strict';
  const EVAL_V = 1, V = 1, GUIDE = '../images/atlas/av/musowl-2.webp';
  /* the games. kind · moves: the record (chess: SAN; shogi: USI, 7g7f / P*5e / 8h2b+; go: SGF points, pd, '' = pass) · res: w | b | d | s | g
     (go: 'B+R', 'W+2.5' as written) · mk: { ply: { a: [[from, to], …] arrows, s: [squares] } } what the note points at · orient: 'b' to see the board from Black */
  const GAMES = [
    // (2026-11-27) Morphy v. Duke Karl of Brunswick & Count Isouard, Paris 1858, the Opera Game
    { id: 'opera', kind: 'chess', res: 'w',
          moves: 'e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6 Bg5 b5 Nxb5 cxb5 Bxb5+ Nbd7 O-O-O Rd8 Rxd7 Rxd7 Rd1 Qe6 Bxd7+ Nxd7 Qb8+ Nxb8 Rd8#',
          mk: { 1: { s: ['d5', 'e5', 'd4', 'e4'] }, 3: { a: [['f3', 'e5']] }, 4: { a: [['d6', 'e5']] }, 5: { a: [['d4', 'e5']] }, 6: { a: [['g4', 'f3']], s: ['d1'] }, 7: { a: [['d4', 'e5']] },
            8: { s: ['f3'] }, 9: { s: ['f3'] }, 11: { a: [['c4', 'f7'], ['f3', 'f7']], s: ['f7'] }, 12: { a: [['f3', 'f7']], s: ['f6'] }, 13: { a: [['b3', 'f7'], ['b3', 'b7']] }, 14: { a: [['e7', 'f7']] },
            15: { s: ['b7'] }, 16: { a: [['c6', 'b5']] }, 17: { a: [['g5', 'f6'], ['f6', 'e7']] }, 18: { a: [['b5', 'c4']] }, 19: { a: [['c3', 'b5']] }, 20: { s: ['b5'] }, 21: { a: [['b5', 'e8']], s: ['e8'] },
            22: { s: ['d7'] }, 23: { a: [['d1', 'd7'], ['b5', 'd7']] }, 24: { a: [['d8', 'd7']] }, 25: { s: ['d7'] }, 26: { s: ['d7'] }, 27: { a: [['d1', 'd7'], ['b5', 'd7']] }, 28: { a: [['e6', 'b3']] },
            29: { a: [['b5', 'd7']] }, 30: { a: [['g5', 'd8']] }, 31: { a: [['b3', 'b8']] }, 32: { s: ['b8', 'd8'] }, 33: { a: [['g5', 'd8'], ['d1', 'd8']], s: ['e8'] } } },
    // (2026-11-27) Richard Réti v. Savielly Tartakower, 1910: Réti's Mate
    { id: 'reti1910', kind: 'chess', res: 'w', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Qd3 e5 dxe5 Qa5+ Bd2 Qxe5 O-O-O Nxe4 Qd8+ Kxd8 Bg5+ Kc7 Bd8#',
      mk: { 1: { s: ['d5', 'e5'] }, 2: { a: [['c6', 'd5']] }, 3: { s: ['d4', 'e4'] }, 4: { a: [['d5', 'e4']] }, 5: { a: [['c3', 'e4']] }, 6: { s: ['e4'] }, 7: { s: ['e4'] }, 8: { a: [['f6', 'e4']] },
        9: { a: [['d3', 'e4'], ['d3', 'd8']] }, 10: { a: [['e5', 'd4']] }, 11: { s: ['e5'] }, 12: { a: [['a5', 'e1'], ['a5', 'e5']] }, 13: { s: ['d2'] }, 14: { a: [['e5', 'e1']], s: ['e4'] },
        15: { a: [['d1', 'd8']], s: ['c1'] }, 16: { a: [['d3', 'd8']], s: ['e8'] }, 17: { a: [['d3', 'd8']] }, 18: { s: ['d8'] },
        19: { a: [['g5', 'd8'], ['d1', 'd8']], s: ['d8'] }, 20: { a: [['d1', 'd8']], s: ['c7', 'e8'] }, 21: { a: [['d8', 'c7'], ['d1', 'd8']], s: ['c7'] } } },
    // (2026-11-27) Adolf Anderssen v. Lionel Kieseritzky, 1851: The Immortal Game
    { id: 'immortal', kind: 'chess', res: 'w', moves: 'e4 e5 f4 exf4 Bc4 Qh4+ Kf1 b5 Bxb5 Nf6 Nf3 Qh6 d3 Nh5 Nh4 Qg5 Nf5 c6 g4 Nf6 Rg1 cxb5 h4 Qg6 h5 Qg5 Qf3 Ng8 Bxf4 Qf6 Nc3 Bc5 Nd5 Qxb2 Bd6 Bxg1 e5 Qxa1+ Ke2 Na6 Nxg7+ Kd8 Qf6+ Nxf6 Be7#',
      mk: { 1: { s: ['d5', 'f5'] }, 2: { s: ['d4', 'f4'] }, 3: { a: [['f4', 'e5']] }, 4: { a: [['f4', 'g3'], ['f4', 'e3']] }, 5: { a: [['c4', 'f7']], s: ['f7'] }, 6: { a: [['h4', 'e1']] }, 7: { s: ['f1'] }, 8: { a: [['b5', 'c4']] },
        9: { s: ['f7'] }, 10: { a: [['f6', 'e4']] }, 11: { a: [['f3', 'h4']] }, 12: { s: ['h6'] }, 13: { a: [['d3', 'e4']], s: ['c1'] }, 14: { a: [['h5', 'g3'], ['h6', 'h2']], s: ['f1', 'h1'] }, 15: { a: [['h4', 'f5']], s: ['h4'] }, 16: { a: [['g5', 'h4']] },
        17: { a: [['f5', 'g7']], s: ['h6', 'd6'] }, 18: { a: [['c6', 'b5']] }, 19: { a: [['g4', 'h5']], s: ['b5'] }, 20: { a: [['c6', 'b5']] }, 21: { a: [['g1', 'g4']], s: ['b5'] }, 22: { s: ['b5'] }, 23: { a: [['h4', 'g5']] }, 24: { s: ['g6'] },
        25: { a: [['h5', 'g6']] }, 26: { a: [['f5', 'h6']], s: ['h6', 'g5'] }, 27: { a: [['c1', 'f4']], s: ['f4'] }, 28: { s: ['f6'] }, 29: { a: [['f4', 'g5']] }, 30: { s: ['f6'] }, 31: { a: [['c3', 'd5']] }, 32: { a: [['c5', 'g1']] },
        33: { a: [['d5', 'f6'], ['d5', 'c7']] }, 34: { a: [['b2', 'a1']] }, 35: { a: [['d6', 'f8']], s: ['d6', 'g1', 'a1'] }, 36: { s: ['g1'] }, 37: { a: [['b2', 'g7']], s: ['e5'] }, 38: { a: [['a1', 'f1']] }, 39: { s: ['e2'] }, 40: { a: [['a6', 'c7']] },
        41: { a: [['g7', 'e8']] }, 42: { s: ['d8'] }, 43: { a: [['f6', 'd8']] }, 44: { a: [['g8', 'f6']] }, 45: { a: [['e7', 'd8'], ['d5', 'c7'], ['g7', 'e8']], s: ['d8'] } } },
    // (2026-11-27) Honinbo Shusaku v. Inoue Gennan Inseki, 1846: The Ear-reddening Game
    { id: 'mimiaka', kind: 'go', size: 19, res: 'B+2',
          moves: 'qd dc pq oc cp cf ep qo pe np po pp op qp oq oo pn qq nq on pm om pl mp mq ol pk lq lr kr lp kq qr rr rs mr nr pr ps qs no mo qr rm rl qs lo mn qr qm or ql qj rj ri rk ln mm qi rq jn ls ns gq go ck kc ic pc nj ke og oh pb qb ng mi mj nd ph qg pg hq hr ir iq hp jr fc lc ld mc lb mb md qf pf qh rg rh sh rf sg pj pi oi oj ni qk ok qe kb jb ka jc ob ja la db cc fe cn gr is fq io ji eb fb eg dj dk ej cj dh ij hm gj eh fl fg er dm fn dn gn jj jk kk ii ik jl kl il jh co do ih hn hl bl dg gh ch ig ec cr fd gd ed gc bk cm gs gp li kg in lj lg gm jf jg im fm kf lf mf le gf hf ff gg lk kj km lm ll jm ge he ef ea cb fr fs dr qa ra pa rb da gi fj fi fa ga gl ek em ho el en jo kn ci lh mh mg di ei lg qn rn re sl mg bm am lg eq es mg ha gb lg ds hs mg sj si lg sr sq mg hd hb lg ro so mg ss qs lg sn rp mg cl bn lg ml mk mg pj sf lg nn nl mg ib ia lg nc nb mg jd kd lg ma na mg qc rc lg js ks mg hc id lg fk hj mg hh hg lg gk hk mg ak lg al bm nf od ki ms kp ip jp lr oj mr ea sr',
          mk: {1: {'s':['qd']},3: {'s':['pq']},4: {'a':[['oc','qd']]},5: {'s':['cp']},6: {'s':['cf']},7: {'s':['ep']},8: {'a':[['qo','pq']]},10: {'s':['np','pq'],'a':[['np','pq']]},24: {'s':['pm','pl']},25: {'s':['mq']},28: {'s':['mq','lq'],'a':[['lq','mq']]},30: {'s':['mq','nq','oq']},31: {'s':['lp']},33: {'s':['qr']},40: {'a':[['qs','qr']],'s':['qs']},44: {'a':[['rm','qm']]},50: {'s':['qm']},51: {'s':['or']},53: {'s':['qj']},60: {'s':['rq']},63: {'s':['ns','or']},67: {'a':[['kc','oc']]},70: {'a':[['nj','oh']]},72: {'a':[['og','od']],'s':['og']},77: {'s':['mi']},83: {'s':['hq']},89: {'a':[['fc','dc']]},96: {'s':['qf']},104: {'s':['pj']},107: {'s':['oj']},112: {'a':[['kb','jc']]},118: {'s':['la']},126: {'s':['io']},127: {'a':[['ji','je'],['ji','jo'],['ji','oi'],['ji','fi']],'s':['ji']},131: {'s':['dj']},136: {'s':['ij'],'a':[['ij','ji']]},147: {'s':['jj']},150: {'s':['ii']},155: {'s':['jh']},160: {'s':['hl']},162: {'s':['dg']},167: {'s':['cr']},175: {'s':['gp']},180: {'s':['lg']},199: {'s':['jm']},228: {'s':['mh','lg']},236: {'s':['sl']},274: {'s':['pj']},299: {'s':['id']},311: {'s':['lg']},325: {'s':['sr']}} },
    // (2026-11-27) Adolf Anderssen v. Jean Dufresne, 1852: The Evergreen Game
    { id: 'evergreen', kind: 'chess', res: 'w', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O d3 Qb3 Qf6 e5 Qg6 Re1 Nge7 Ba3 b5 Qxb5 Rb8 Qa4 Bb6 Nbd2 Bb7 Ne4 Qf5 Bxd3 Qh5 Nf6+ gxf6 exf6 Rg8 Rad1 Qxf3 Rxe7+ Nxe7 Qxd7+ Kxd7 Bf5+ Ke8 Bd7+ Kf8 Bxe7#',
      mk: { 1: { s: ['d5', 'f5'] }, 2: { s: ['d4', 'f4'] }, 3: { a: [['f3', 'e5']] }, 4: { a: [['c6', 'e5']] }, 5: { a: [['c4', 'f7']], s: ['f7'] }, 6: { a: [['c5', 'f2']], s: ['f2'] }, 7: { a: [['b4', 'c5']] }, 8: { s: ['b4'] },
        9: { a: [['c3', 'b4']] }, 10: { a: [['a5', 'c3']] }, 11: { a: [['d4', 'e5']] }, 12: { s: ['d4'] }, 13: { s: ['g1', 'f1'] }, 14: { s: ['d3'] }, 15: { a: [['b3', 'f7'], ['c4', 'f7']], s: ['f7'] }, 16: { a: [['f6', 'f7']] },
        17: { a: [['e5', 'f6']] }, 18: { a: [['g6', 'g2']] }, 19: { a: [['e1', 'e5']] }, 20: { s: ['e7'] }, 21: { a: [['a3', 'e7']], s: ['f8'] }, 22: { a: [['b5', 'c4']] }, 23: { s: ['b5'] }, 24: { a: [['b8', 'b5']] },
        25: { a: [['a4', 'e8'], ['a4', 'a5']], s: ['c6'] }, 26: { a: [['b6', 'f2']] }, 27: { a: [['d2', 'e4']] }, 28: { a: [['b7', 'c6']] }, 29: { a: [['e4', 'f6'], ['e4', 'd6']] }, 30: { a: [['f5', 'e4'], ['f5', 'f3']] }, 31: { a: [['d3', 'f5']], s: ['e4'] }, 32: { a: [['h5', 'f3']] },
        33: { a: [['f6', 'e8'], ['f6', 'h5']] }, 34: { s: ['g7'] }, 35: { a: [['f6', 'e7'], ['e1', 'e7']], s: ['e8'] }, 36: { a: [['g8', 'g2']] }, 37: { a: [['d1', 'd7']], s: ['d3'] }, 38: { a: [['f3', 'g2']], s: ['g2'] }, 39: { a: [['e7', 'e8']] }, 40: { a: [['a4', 'd7']], s: ['c6'] },
        41: { s: ['d7'] }, 42: { s: ['d7'] }, 43: { a: [['f5', 'd7'], ['d1', 'd7']], s: ['d7'] }, 44: { s: ['e8'] }, 45: { a: [['d7', 'e8']] }, 46: { s: ['f8'] }, 47: { a: [['e7', 'f8'], ['d7', 'e8'], ['f6', 'g7']], s: ['f8'] } } },
    // (2026-11-27) Edward Lasker v. George Alan Thomas, 1912: The King Hunt
    { id: 'lasker1912', kind: 'chess', res: 'w', moves: 'd4 e6 Nf3 f5 Nc3 Nf6 Bg5 Be7 Bxf6 Bxf6 e4 fxe4 Nxe4 b6 Ne5 O-O Bd3 Bb7 Qh5 Qe7 Qxh7+ Kxh7 Nxf6+ Kh6 Neg4+ Kg5 h4+ Kf4 g3+ Kf3 Be2+ Kg2 Rh2+ Kg1 Kd2#',
      mk: { 1: { s: ['e5', 'c5'] }, 4: { s: ['e4'] }, 7: { a: [['g5', 'f6']] }, 9: { s: ['f6'] }, 11: { a: [['e4', 'f5']] }, 13: { s: ['e4'] }, 14: { a: [['b7', 'e4']] }, 15: { s: ['e5'] }, 16: { s: ['g8', 'h7'] },
        17: { a: [['d3', 'h7']], s: ['e4'] }, 18: { a: [['b7', 'e4']] }, 19: { a: [['h5', 'h7']] }, 20: { a: [['h5', 'h7'], ['d3', 'h7']], s: ['h7'] }, 21: { a: [['h5', 'h7']] }, 22: { s: ['h7'] }, 23: { a: [['f6', 'h7'], ['d3', 'h7']] },
        24: { a: [['e5', 'g6']], s: ['h8'] }, 25: { a: [['g4', 'h6']] }, 26: { s: ['g5'] }, 27: { a: [['h4', 'g5']] }, 28: { s: ['f4'] }, 29: { a: [['g3', 'f4']] }, 30: { s: ['f3'] }, 31: { a: [['e2', 'f3']] }, 32: { s: ['g2'] },
        33: { a: [['h2', 'g2']] }, 34: { s: ['g8', 'g1'] }, 35: { a: [['a1', 'g1']], s: ['g1'] } } },
    // (2026-11-27) Akaboshi Intetsu v. Honinbo Jowa, 1835: The Blood-vomiting Game
    { id: 'toketsu', kind: 'go', size: 19, res: 'W+R',
          moves: 'cp pq qd ed oc eq qo qk qi op iq dn ep dp do dq co eo fp cq bq br cm gr hp en bp ck dl dk el gn cr dr bs fq go ar hn gm hm gl ek hl di io ho fo ch cd lq pn gc qn dc cc ec cf il gp nq ic fd lc bg bf af bi dj eh fj qg oi qe pd nf ok pk ol pj rn rm qq qr rr qp rq pr rp po pp mp qm pm np mq mo lp lo kp no nr or qp mr ro pi lr ns ip jr hq jn ko kq kn jm km ik mk mm ir jq kk mi nm ml ki lj lk kj jj kl ll lm oj mg jl jk nj ni im in jo kl js ks jl im is kl ei ej jl hr hs kl cn bn jl gs fs kl hi ij jl ls ji hj oe kg jg gi nc jf nb re if je hd fe gf ff fg gg gh hg fi gj ig hh hf ii rf pe pf le kd ad kh qf ef de qe ld lg kc jd qf db eb qe jb od ib mf qf jp kr qe lf kf qf hc qe hb pg og of cg bh pf ph bb da cb fh ac eg bd ob oa of mh rj kl',
          mk: {1: {'s':['cp']},5: {'s':['qd','oc']},6: {'s':['eq']},8: {'a':[['qk','qo']]},9: {'a':[['qi','qk']]},12: {'s':['dn','cp'],'a':[['dn','cp']]},28: {'a':[['ck','cf']],'s':['ck']},33: {'s':['cr','dn','en','eo']},43: {'s':['ek','dn','en','gm','gl']},45: {'a':[['di','ck']]},60: {'s':['gp','go','ho']},68: {'s':['bi','ck','dk']},70: {'s':['eh']},80: {'s':['pj','ok','ol'],'a':[['pj','oi'],['pj','ol']]},83: {'a':[['qq','pq']],'s':['qq']},104: {'s':['qp']},106: {'s':['ro']},113: {'s':['jn']},120: {'s':['jn','jm','kn']},138: {'s':['jl','kl']},170: {'s':['oe']},178: {'a':[['if','jg'],['if','hg']],'s':['if']},201: {'s':['qf','qe']},206: {'s':['lg']},222: {'s':['kf']},225: {'s':['qe','qf']},229: {'s':['of']},246: {'s':['kl']}} },
    // (2026-11-27) Deep Blue (IBM computer) v. Garry Kasparov, 1997: Deep Blue Wins
    { id: 'deepblue1997', kind: 'chess', res: 'w', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Ng5 Ngf6 Bd3 e6 N1f3 h6 Nxe6 Qe7 O-O fxe6 Bg6+ Kd8 Bf4 b5 a4 Bb7 Re1 Nd5 Bg3 Kc8 axb5 cxb5 Qd3 Bc6 Bf5 exf5 Rxe7 Bxe7 c4',
      mk: { 2: { a: [['c6', 'd5']] }, 4: { a: [['d5', 'e4']] }, 5: { a: [['c3', 'e4']] }, 8: { a: [['d7', 'f6']] }, 9: { a: [['g5', 'f7'], ['g5', 'e6']] }, 10: { s: ['f6'] }, 11: { a: [['d3', 'h7']] }, 12: { s: ['e6'] },
        13: { s: ['f3'] }, 14: { a: [['h6', 'g5']] }, 15: { a: [['g5', 'e6']], s: ['e6'] }, 16: { a: [['e7', 'e1']] }, 17: { s: ['g1'] }, 18: { s: ['e6'] }, 19: { a: [['g6', 'e8']] }, 20: { s: ['d8'] }, 21: { a: [['f4', 'c7']] },
        22: { s: ['b5'] }, 23: { a: [['a4', 'b5']] }, 24: { a: [['b7', 'g2']] }, 25: { a: [['e1', 'e6']] }, 26: { a: [['d5', 'f4']] }, 27: { s: ['g3'] }, 28: { s: ['c8'] }, 29: { a: [['a1', 'a7']] }, 30: { s: ['b5'] },
        31: { a: [['d3', 'b5'], ['d3', 'f5']] }, 32: { a: [['c6', 'b5']] }, 33: { s: ['f5'] }, 34: { a: [['e1', 'e7']] }, 35: { a: [['e1', 'e7']] }, 36: { s: ['e7'] }, 37: { a: [['c4', 'b5'], ['c4', 'd5']], s: ['c8'] } } },
    // (2026-11-27) Go Seigen v. Honinbo Shusai, 1933–1934: The 3-3, Star Point and Tengen Game
    { id: 'seigen1933', kind: 'go', size: 19, res: 'W+2',
          moves: 'qc cd dp pq jj pd qd pe ob qn jp lq dj ed lo nq kq lp ko ch gj fq fo iq gp cq cp dq nd ph pj ne me mf nf ng oe of ne nj om mg ke hc qm rm rn rl ro pm ql qk pl pn pk qj nl pi qp on nn no mo op qr qq rq pr rr mn nm lm ll kp mp mq ip jq kk cn ep cj ck dk cl dl ci bj bi di ej bh dm ei fj cm ak ai el bp rf co qg rh jc gq eq en fn er fr dr hq hr hp gr fc ic dc cc gd he ge je hd id hf kd le kc og oh pg em ek fm gm mb cb ec eb dd db gb bc bd bb nb oa fb ea gh jf ie ff hi hg eo fp hl il jh fh fi hj if ih ii ig jg ji fg kf ij ik hh gf mk df ml sm sk mm dg li ol ln nk km fl gl oj qh ri cf ef gi eh ee eg de bf bq br ps os qs oq bo aq an bn am ao rg mi qi lh kh lj rj rk sh sj bg ae cg ag fe gc fd ce kg mc ki fk ld lc gk bk bl na nc gg fa ga ac ad lg mh qo lk',
          mk: {1: {'s':['qc']},3: {'s':['dp']},5: {'s':['jj','qc','dp']},6: {'s':['pd','qc']},10: {'s':['qn','pe','pq']},11: {'s':['jp','jj']},21: {'s':['gj','dj','jj']},26: {'s':['cq','dp']},28: {'s':['cp','dp','fo','gp']},31: {'s':['pj','ph','qn']},35: {'s':['ne','mf']},37: {'s':['ne']},45: {'s':['qm','qn'],'a':[['qm','ph']]},59: {'a':[['qp','ro']],'s':['qp']},70: {'s':['nn','mo']},78: {'s':['kq']},79: {'s':['kk','gj','jj','mo','nl','pj']},82: {'s':['cj']},87: {'s':['ci']},88: {'s':['cj','ch']},98: {'s':['dk','dl'],'a':[['el','ek']]},101: {'a':[['rf','qg']]},106: {'s':['fq','iq']},116: {'s':['fr']},117: {'s':['fc']},127: {'s':['he']},130: {'s':['jc']},133: {'s':['pd','pe','of']},135: {'s':['ek']},139: {'s':['cb','cd','cc','ed']},152: {'s':['gh']},153: {'s':['jf','je']},159: {'s':['ep','fo']},160: {'a':[['hl','gk'],['hl','ik']],'s':['hl']},162: {'s':['jh','gh','hi']},165: {'s':['fh']},178: {'s':['mk','kk','nl']},180: {'s':['nn','nm','nl']},186: {'a':[['ol','nk'],['ol','ok']],'s':['ol']},189: {'s':['nn','nm','nl','om','mm']},192: {'s':['oj','qm','ql','pl','pk','pj'],'a':[['ok','ol']]},197: {'s':['gi','gh','hh','hi','ii','ij'],'a':[['gi','gg']]},198: {'a':[['gh','fh'],['gh','gg']],'s':['eh']},232: {'s':['ce','gg']},233: {'s':['kg','jh','jg']},246: {'s':['gg']},252: {'s':['lk']}} },
    // (2026-11-27) Donald Byrne v. Bobby Fischer, 1956: The Game of the Century
    { id: 'century1956', kind: 'chess', res: 'b', moves: 'Nf3 Nf6 c4 g6 Nc3 Bg7 d4 O-O Bf4 d5 Qb3 dxc4 Qxc4 c6 e4 Nbd7 Rd1 Nb6 Qc5 Bg4 Bg5 Na4 Qa3 Nxc3 bxc3 Nxe4 Bxe7 Qb6 Bc4 Nxc3 Bc5 Rfe8+ Kf1 Be6 Bxb6 Bxc4+ Kg1 Ne2+ Kf1 Nxd4+ Kg1 Ne2+ Kf1 Nc3+ Kg1 axb6 Qb4 Ra4 Qxb6 Nxd1 h3 Rxa2 Kh2 Nxf2 Re1 Rxe1 Qd8+ Bf8 Nxe1 Bd5 Nf3 Ne4 Qb8 b5 h4 h5 Ne5 Kg7 Kg1 Bc5+ Kf1 Ng3+ Ke1 Bb4+ Kd1 Bb3+ Kc1 Ne2+ Kb1 Nc3+ Kc1 Rc2#',
      mk: { 1: { s: ['e5', 'd4'] }, 2: { s: ['e4', 'd5'] }, 3: { a: [['c4', 'd5']] }, 4: { s: ['g7'] }, 5: { s: ['d5', 'e4'] }, 6: { s: ['g7'] }, 7: { s: ['c4', 'd4'] }, 8: { s: ['g8'] }, 9: { a: [['f4', 'c7']] }, 10: { a: [['d5', 'c4']] }, 11: { a: [['b3', 'b7']], s: ['d5'] }, 12: { a: [['c4', 'b3']] }, 13: { s: ['c4'] }, 14: { s: ['d5', 'b5'] }, 15: { s: ['d4', 'e4'] }, 16: { a: [['d7', 'b6']] }, 17: { a: [['d1', 'd4']], s: ['e1'] }, 18: { a: [['b6', 'c4']] }, 19: { a: [['c5', 'e7']] }, 20: { a: [['g4', 'd1']], s: ['f3'] }, 21: { a: [['g5', 'f6']], s: ['e1'] }, 22: { a: [['a4', 'c5'], ['a4', 'c3']], s: ['e4'] }, 23: { a: [['a3', 'e7']] }, 24: { s: ['c3', 'e4'] }, 25: { s: ['e4'] }, 26: { a: [['e4', 'c3'], ['e4', 'g5']] }, 27: { a: [['e7', 'd8'], ['e7', 'f8']] }, 28: { a: [['d8', 'b6']], s: ['f8'] }, 29: { s: ['f1'] }, 30: { a: [['c3', 'd1']] }, 31: { a: [['c5', 'b6']], s: ['e7'] }, 32: { a: [['e8', 'e1']] }, 33: { s: ['f1', 'h1'] }, 34: { a: [['c5', 'b6'], ['e6', 'c4']], s: ['b6'] }, 35: { a: [['e6', 'c4']] }, 36: { a: [['c4', 'f1']] }, 37: { s: ['g1', 'h1'] }, 38: { a: [['e2', 'g1']] }, 39: { a: [['c4', 'e2']], s: ['f1'] }, 40: { a: [['c4', 'f1']] }, 41: { s: ['g1'] }, 42: { a: [['e2', 'g1']] }, 43: { a: [['c4', 'e2']], s: ['f1'] }, 44: { a: [['c4', 'f1'], ['c3', 'd1']] }, 45: { a: [['a7', 'b6']], s: ['b6'] }, 46: { a: [['a8', 'a3']], s: ['b6'] }, 47: { a: [['b4', 'c4'], ['b4', 'c3'], ['b4', 'b6']] }, 48: { a: [['a4', 'b4']] }, 49: { a: [['c3', 'd1']] }, 50: { s: ['d1', 'h1'] }, 51: { s: ['h2'] }, 52: { a: [['a2', 'f2']] }, 53: { s: ['h1'] }, 54: { a: [['f2', 'h1'], ['f2', 'h3']] }, 55: { a: [['e1', 'e8']] }, 56: { a: [['f3', 'e1']] }, 57: { a: [['d8', 'g8']] }, 58: { s: ['f8'] }, 59: { s: ['e1'] }, 60: { a: [['d5', 'f3'], ['d5', 'a2']] }, 61: { s: ['f3'] }, 62: { a: [['f8', 'd6']], s: ['h2'] }, 63: { a: [['b8', 'f8']], s: ['g8', 'b7'] }, 64: { s: ['b5'] }, 65: { s: ['h4'] }, 66: { s: ['h5'] }, 67: { a: [['e5', 'f7'], ['e5', 'd7']], s: ['f8'] }, 68: { s: ['g7', 'f8'] }, 69: { s: ['g1'] }, 70: { a: [['c5', 'g1']] }, 71: { s: ['f1'] }, 72: { a: [['g3', 'f1']] }, 73: { s: ['e1'] }, 74: { a: [['b4', 'e1']] }, 75: { s: ['d1'] }, 76: { a: [['b3', 'd1']] }, 77: { s: ['c1'] }, 78: { a: [['e2', 'c1']] }, 79: { s: ['b1'] }, 80: { a: [['c3', 'b1'], ['c3', 'd1']] }, 81: { s: ['c1'] }, 82: { a: [['c2', 'c1'], ['b3', 'c2']], s: ['b1', 'b2', 'd1', 'd2'] } } },
    // (2026-11-27) Honinbo Shusaku v. Yasui Sanchi IX, 1849: Shusaku’s First Castle Game
    { id: 'oshiro1849', kind: 'go', size: 19, res: 'B+11',
      moves: 'qd qp dc ce ci fd de df ee cd ec cc ic oc co ep dq eq dr cm cn dm eo cg en em fe gm fi hp nq kq qq rq pq rr po qo pn qn pm qm pl kc pe oe of ne ql qb og dj di ei eh ej bf dh ch dg bg cf bj fh gq hq gp gr fr hr go fg jc kd hf oi pi pj ph mj qj if he hg mh bk be lh lg kh im ie hd mi ll kk hm ik rl rc rd mq mr lr mp lq bl ak aj cj bh cl so sp sm sr hk pf qc rb qe gn ho io jo hn in ip gl fm lo er dp fq kl dn do fo lk bp bq br cq bd ae bn bo ao bm am an bi ai bn aq al ap kj hi mg mf nh nf mc qr rs nr nl nm ml mm jb ib ka db ds cs es cr cb ia jp kp lf me sd se sc qf hj gj ij nc nb nd od md lc le kf ls ks ms jr pb ob pc pa ih gf ge fk gk jl jm il hl fj gi da ea ca oj nj ok ol lj ii hh jh ig nk pk gg ng mh jg kg an dd ed ao oh an ad ac fl el lp qs ps pp op om on li rm ro rn sn ja kb so rp id ni sn',
      mk: {1: {'s':['qd']},3: {'s':['dc','qd']},4: {'a':[['ce','dc']],'s':['ce']},5: {'a':[['ci','ce']],'s':['ci']},6: {'s':['fd','ce'],'a':[['fd','dc']]},7: {'s':['de','ce','fd']},9: {'s':['ee','de']},12: {'s':['cc','cd','ce','df','fd']},13: {'s':['ic','fd']},14: {'a':[['oc','qd']],'s':['oc']},15: {'s':['co']},16: {'a':[['ep','co']],'s':['ep']},19: {'s':['dr','co','dq']},20: {'a':[['cm','co']],'s':['cm']},23: {'s':['eo','ep','eq']},24: {'a':[['cg','ci']],'s':['cg']},26: {'s':['em','cm','dm']},27: {'s':['fe','fd']},28: {'s':['gm','cm','dm','em']},29: {'s':['fi','ci']},30: {'s':['hp','ep','eq']},32: {'s':['kq','nq'],'a':[['kq','nq']]},33: {'s':['qq','qp','nq']},36: {'s':['rr','qq','pq','rq']},37: {'s':['po']},42: {'s':['qm','qo','qn','po','pn','pm']},43: {'s':['pl','pq','po','pn','pm'],'a':[['pl','kl']]},44: {'s':['kc','ic','oc']},45: {'s':['pe','qd']},48: {'s':['ne','oe','oc','of']},49: {'s':['ql','qp','qo','qn','qm']},50: {'a':[['qb','qd']],'s':['qb']},51: {'s':['og','of','pl'],'a':[['og','ok']]},52: {'s':['dj','ci','fi']},56: {'s':['ej','dj','ei','fi','eh']},57: {'s':['bf','cg','ce','cd','cc']},60: {'s':['dg','ci','ch','di']},63: {'s':['bj','bg','bf']},64: {'s':['fh','eh']},65: {'s':['gq','eq','hp']},70: {'s':['hr','gq','gp','fr']},71: {'s':['go','ep','eq','hp','hq']},72: {'s':['fg','fh']},75: {'a':[['hf','hh']],'s':['hf']},76: {'s':['oi','og','pl']},77: {'s':['pi','oi']},80: {'s':['mj','pj','ph'],'a':[['mj','jj']]},81: {'s':['qj','pj']},84: {'s':['hg','hf','he','if']},85: {'s':['mh','mj','oi']},87: {'s':['be','bk','bj']},90: {'s':['kh','lh','mh'],'a':[['kh','if']]},91: {'s':['im','gm','hp','kq']},94: {'s':['mi','mj','mh']},99: {'s':['rl','ll','hm','ql']},101: {'s':['rd','rc']},106: {'s':['lq','kq','mq','lr','nq']},112: {'s':['cl','cj','bh','bl']},116: {'s':['sr','so','sp','sm']},121: {'s':['qe','pf','qc','pe']},122: {'s':['gn','gq','gp','go']},128: {'s':['ip','gq','gp','go','ho']},131: {'s':['lo','jo']},134: {'s':['fq','fr','ep','eq','er']},137: {'s':['do','dn']},138: {'s':['fo','gq','gp','go','ho'],'a':[['fo','fp']]},139: {'s':['lk','kk']},145: {'s':['ae','bp','bq','cq','bd']},151: {'s':['an','ao','am']},154: {'s':['bn','bi','bm','bl']},157: {'s':['ap','bp','ao']},162: {'s':['nh','mf','mg']},167: {'s':['nr','nf','qr']},171: {'s':['mm','nl','ml','nm']},179: {'s':['cr','cs','ds','es']},185: {'s':['me','lg','kp']},189: {'s':['qf','pf','se']},192: {'s':['ij','hk','hj','gj']},199: {'s':['le','nd','nc','md','od']},204: {'s':['jr','ls','ms']},208: {'s':['pa','pb','pc']},211: {'s':['ge','gf']},219: {'s':['gi','fj','fi']},226: {'s':['ol','oj','ok','pj']},233: {'s':['pk','ok','oj']},238: {'s':['kg','mh','ng']},242: {'s':['ao','an','ed']},245: {'s':['ad','oi','an']},248: {'s':['el','fl','fk','fj']},253: {'s':['op','pp','qr','qq']},259: {'s':['rn','ro'],'a':[['rn','rp']]},263: {'s':['so','ja','rp']},267: {'s':['sn','pl','po','og','hf','pk']}} },
    // (2026-11-27) Red (name not recorded) v. Black (name not recorded), 13th century: The Shilin Guangji game
    { id: 'shilin', kind: 'xiangqi', res: 'b', moves: 'h2e2 h7e7 h0g2 h9g7 i0h0 b9c7 h0h6 c6c5 h6g6 c7d5 g6g5 d5f4 g3g4 g9i7 g5c5 f4d3 c5d5 d3c1', mk: { 2: { a: [['e7', 'e3']] }, 9: { a: [['g6', 'g7']] }, 11: { a: [['g5', 'd5']] }, 14: { a: [['i7', 'g5']] }, 16: { a: [['d3', 'c5']], s: ['c1'] }, 18: { a: [['c1', 'a0']], s: ['e0'] } } },
    // (2026-11-27) Red (name not recorded) v. Black (name not recorded), 1632 (published): The Thirteen-Move Horse Sacrifice (Juzhongmi)
    { id: 'qima13', kind: 'xiangqi', res: 'r', moves: 'h2e2 h7e7 h0g2 h9g7 i0i1 i9h9 i1d1 h9h3 d1d8 b9a7 a0a1 b7b0 b2b7 g7h9 e2e6 f9e8 a1d1 e9f9 d8d9 e8d9 d1f1 e7f7 f1f7 f9e9 b7e7', mk: { 7: { a: [['d1', 'd8']] }, 9: { s: ['d8'] }, 11: { s: ['b0'], a: [['b7', 'b0']] }, 13: { a: [['b7', 'g7']] }, 15: { s: ['e9'], a: [['e6', 'e9']] }, 17: { a: [['d1', 'd8']] }, 19: { s: ['d9', 'f9'] }, 21: { a: [['f1', 'f9']] }, 23: { a: [['f7', 'f9']] }, 25: { a: [['e6', 'e9']], s: ['e9'] } } },
    // (2026-11-27) Ōhashi Sōkei (I) v. Hon'inbō Sansa, June 1607: The oldest shogi record that survives
    { id: 'sokei1607', kind: 'shogi', res: 's',
      moves: '7g7f 3c3d 3i4h 4c4d 4g4f 3a4b 4h4g 4b4c 3g3f 8b4b 2h4h 2b3c 1g1f 1c1d 2g2f 5a6b 5i6h 6b7b 6h7h 7a6b 4i5h 5c5d 5g5f 6b5c 7i6h 6c6d 6g6f 4a5b 6h6g 5b6c 9g9f 9c9d 8g8f 7c7d 7h8g 7b8b 6i7h 6a7b 8i7g 8c8d 4h3h 4b3b 2f2e 3c5a 3h2h 3b2b 6f6e 8a7c 6e6d 6c6d 4f4e 5a3c 2i3g P*6e 2h2i 7d7e 7f7e 6d7e P*7f 7e7d 2i6i 5c6d 7g6e 7c6e P*6f 8d8e 8f8e P*7g 7h7i N*7e 7f7e 6d7e P*7f P*8f 8g9h 9d9e 7f7e 7d7e S*7f 7e7f 6g7f 9e9f 6f6e S*7h P*9b 9a9b N*8d 3c5a N*7d 8b8c 8d9b+ 8c9b 8h7g 7h6i+ 7i6i P*7e P*9c 9b8a 7g8f 7e7f G*9b 8a7a 8f5c+ 7a6a L*6d P*6b 5c4c N*5b 9h8g R*8i 8g7h 7f7g+ 7h7g 8i6i+ S*5c S*6f 7g8f 6i8i 8f9e 6b6c S*6b 5a6b 5c6b+ 7b6b 7d6b+ 6a6b B*5c 6b7c G*8d 7c7b P*7c 7b6a 6d6c+',
      mk: { 10: { s: ['4b'] }, 11: { s: ['4h'] }, 46: { s: ['2h', '2b'] }, 47: { s: ['6e'] }, 54: { a: [['7g', '6e']], s: ['6e'] }, 56: { a: [['7e', '7f']] }, 68: { a: [['7g', '7h']] }, 70: { a: [['7e', '8g']] }, 74: { a: [['8f', '8g']] }, 77: { s: ['7e'] }, 84: { a: [['7h', '6i']] }, 85: { a: [['9a', '9b']] }, 87: { a: [['8d', '9b'], ['8d', '7b']] }, 88: { a: [['5a', '8d']] }, 89: { a: [['7d', '8b']] }, 94: { s: ['6i'] }, 99: { a: [['8f', '5c']] }, 103: { s: ['5c'] }, 105: { a: [['6d', '6b']] }, 114: { s: ['6i'] }, 119: { s: ['9e'] }, 121: { s: ['6b'] }, 127: { a: [['5c', '6b']] }, 133: { a: [['6c', '6b']], s: ['6a'] } } },
    // (2026-11-27) Yang Guanlin v. Hu Ronghua, 28 October 1960: Hu Ronghua, aged 15, beats Yang Guanlin
    { id: 'hu1960', kind: 'xiangqi', res: 'b', moves: 'h2e2 h9g7 h0g2 g6g5 i0h0 i9h9 c3c4 h7h3 b0c2 c9e7 b2b9 a9b9 a0b0 b7b3 c2d4 f9e8 c4c5 b9b4 d4b3 h3e3 d0e1 h9h0 g2h0 g7f5 b0b1 e3c3 c5c6 e6e5 e2g2 f5g3 h0i2 g3e4 c0e2 c3c5 g2h2 c5b5 h2h4 e4c3 h4h9 e8f9 b1b2 b5b3 i2g3 g5g4 e2g4 c3e4 g3e2 b4c4 b2b0 b3e3 c6d6 e4c3 h9h6 f9e8 h6e6 c3a2 b0d0 e5e4 e6e3 e4e3 e2g3 c4g4 d0d2 a2c1 d2d1 c1b3 g3f1 e3e2 d1d3 b3c1 d3d1 c1a2 g0i2 g4g2 i3i4 g2i2 f1g3 i2g2 g3e4 g2g4 d1a1 g4e4 a1a2 e7g5 d6c6 a6a5 a2b2 e8f9 e0d0 e2e1 f0e1 e4i4 b2e2 f9e8 e2e5 i4c4 e1d2 c4c6 e5g5 c6a6 d0d1 g9e7 g5g4 i6i5 g4e4 e8f7 e4e5 i5i4 e5e4 i4i3 e4e3 a6i6 e3e5 i6d6 e5a5 d6d3 a3a4 i3h3 a5e5 d9e8 e5e7 h3g3 a4a5 g3f3 e7e2 d3d5 a5a6 d5d6 a6a7 d6d7 a7a8 d7d8 a8a9 d8d9 e2i2 d9a9 i2i9 e8f9 i9i4 a9a1 d1d0 f3f2 i4f4 f2f1 f4f7 f9e8 f7b7 e9d9 b7b4 a1a7 b4f4 a7d7', mk: { 8: { a: [['h3', 'h0']] }, 11: { s: ['e9'] }, 14: { a: [['b3', 'b0']] }, 17: { a: [['d4', 'b3']] }, 18: { a: [['b4', 'd4']], s: ['b3'] }, 20: { s: ['e0'] }, 22: { a: [['h9', 'h0']] }, 26: { s: ['c3', 'b3'] }, 36: { a: [['b5', 'b3']] }, 38: { a: [['c3', 'b1']] }, 42: { s: ['b3'] }, 46: { a: [['g3', 'e4']] }, 50: { a: [['e3', 'e0']] }, 64: { a: [['c1', 'e0']], s: ['d1'] }, 104: { a: [['i5', 'i0']] }, 123: { s: ['a5'] }, 136: { s: ['a9'] }, 152: { s: ['d7', 'd0'] } } },
    // (2026-11-27) Ōhashi Sōei (VI) v. Ōhashi Sōkei (IX), 1790: Demon Sōei beats the Meijin in an even game
    { id: 'soei1790', kind: 'shogi', res: 's',
      moves: '7g7f 3c3d 2g2f 4c4d 3i4h 3a3b 5g5f 5c5d 3g3f 3b4c 2f2e 2b3c 7i7h 7a6b 4i5h 6b5c 2i3g 4a3b 6g6f 8b5b 7h6g 5d5e 5f5e 5c6d 5e5d 5b5d 8h7i 5a4a P*5f P*5e 5h5g 5e5f 5g5f 6d5e 5f5e 5d5e P*5f 5e5b 6i5h 8c8d 5i6i 8d8e 6i7h 5b8b S*7g 6a5b 1g1f 3c4b 1f1e 7c7d 2e2d 2c2d 7i2d 4b2d 2h2d P*2c 2d2f 6c6d 4g4f 8b8d 3f3e 8a7c 4f4e 4d4e 5f5e P*5c 3e3d 8e8f 7g8f B*4d 2f2i 6d6e 6f6e P*3f B*6f 8d8a 3g4e G*4f 3d3c+ 2a3c 4e3c+ 4d3c 4h5g 4f5g 5h5g 7d7e N*4e 3c2d P*3c 3b2b 5e5d 4c5d 2i2d 2c2d B*3b 4a5a 3b5d+ 5c5d P*5c R*4h 6g5h B*5f 7h8h 5f4e 5c5b+ 5a5b P*5c 5b6b S*6d S*7d 5c5b+ 6b7b 6d7c+ 7b7c G*6d 7c8c 6d7d 8c7d 8f7e 7d6c 7e6d',
      mk: { 3: { s: ['2f'] }, 12: { a: [['3c', '2d']] }, 20: { s: ['5b'] }, 22: { s: ['5e'] }, 25: { a: [['5d', '5c']] }, 27: { a: [['7i', '2d']] }, 36: { s: ['5e'] }, 43: { s: ['7h'] }, 45: { s: ['7g'] }, 51: { s: ['2d'] }, 53: { a: [['7i', '2d']] }, 55: { s: ['2d'] }, 63: { s: ['3e', '4e', '5e'] }, 70: { a: [['4d', '2f']] }, 71: { a: [['2f', '2i']] }, 74: { a: [['3f', '3g']] }, 75: { a: [['6f', '8d']] }, 77: { a: [['3g', '4e']] }, 79: { s: ['3c'] }, 87: { a: [['4e', '3c']] }, 92: { s: ['4c'] }, 93: { a: [['2i', '2d']] }, 95: { a: [['3b', '4a']] }, 97: { a: [['3b', '5d']], s: ['4c'] }, 100: { a: [['4h', '6h']] }, 102: { a: [['5f', '7h']] }, 105: { s: ['5b'] }, 115: { a: [['6d', '7c']] }, 117: { a: [['7d', '8c']] }, 119: { a: [['7e', '7d']] }, 121: { a: [['6d', '6c']], s: ['6c'] } } },
    // (2026-11-27) Amano Sōho v. Itō Sōin (VIII), 1856: Sōho the Saint and his far-seeing bishop
    { id: 'soho1856', kind: 'shogi', res: 's',
      moves: '7g7f 3c3d 2g2f 5c5d 5g5f 7a6b 3i4h 4a3b 6i7h 6b5c 2f2e 5c6d 2e2d 2c2d 2h2d 8b5b 5i6i 5a4a 2d2h P*2c 8h2b+ 3a2b 7i6h 5d5e 5f5e 6d5e P*5d 7c7d B*5c B*4d 5c4d+ 5e4d B*1h 3b4b 4h5g 4a3b 5g5f 6a6b 2h5h 2b3c 6g6f 1c1d 6i7i 8c8d 4i5i 8d8e 1h2g 5b5a 5f4e P*5e 6h6g 8e8f 8g8f 7d7e 7f7e 4d4e 2g4e 3c4d 4e1h S*5f 6g5f 5e5f 5h5f S*5e 5f5h 5e6f P*6g P*7g 8i7g 6f7e 5i6h P*7f 7g6e 7e6d S*5c 6b5c 5d5c+ 4d5c 6e5c+ 6d5c 1h6c+ S*7g P*2d 2c2d P*2e B*3c P*5e 7g7h+ 6h7h G*7g S*4e 5a6a 6c7d 2d2e 4e3d 3c2d S*4f 4b3c 3d3c+ 3b3c S*3e N*8g 7h8g 7g8g 3e2d 3c2d 4f3e 2d3e B*4f 3e4d G*3d',
      mk: { 16: { s: ['5b'] }, 21: { a: [['8h', '2b']] }, 27: { s: ['5d'] }, 29: { s: ['5c'] }, 33: { a: [['1h', '5d']], s: ['1h'] }, 47: { a: [['2g', '4e']] }, 49: { a: [['2g', '4e']] }, 57: { a: [['2g', '4e']] }, 59: { s: ['1h'] }, 66: { s: ['6f'] }, 73: { a: [['6e', '5c']] }, 75: { a: [['5d', '5c'], ['6e', '5c']] }, 80: { a: [['1h', '6c']] }, 81: { a: [['1h', '6c']], s: ['6c'] }, 92: { a: [['6a', '6c']] }, 97: { a: [['2d', '4f']] }, 101: { a: [['3e', '2d']] }, 102: { a: [['8g', '7i']] }, 105: { a: [['2d', '3c']] }, 107: { a: [['3e', '2d']] }, 109: { a: [['4f', '3e']] }, 111: { a: [['3d', '4d']], s: ['4d'] } } },
    // (2026-11-27) Sakata Sankichi v. Sekine Kinjirō, 14 July 1913: Sakata Sankichi beats Sekine with the Side Rook
    { id: 'sakata1913', kind: 'shogi', res: 's',
      moves: '7g7f 3c3d 5g5f 5c5d 6g6f 8c8d 7i7h 7a6b 7h6g 8d8e 8h7g 7c7d 3i4h 6a5b 4h5g 5a4b 6i7h 3a3b 3g3f 4c4d 2h3h 5b4c 5i6i 3b3c 1g1f 4b3b 3f3e 3d3e 3h3e 2b3a 3e3h 8e8f 8g8f 3a8f 7g8f 8b8f P*8g 8f8b 5g4f 6b5c 4i5h P*3d 6i7i 9c9d 1f1e 9d9e 7i8h 4a4b 5h6h 6c6d 5f5e 5d5e B*6c 7d7e 3h5h B*9b 6c3f+ 4d4e 4f5g 7e7f 6g7f 5c5d 3f3g 8b7b P*7e 4c4d 5h5i 3b4c 6h6g 3d3e 8i7g 4b5c 6f6e 6d6e P*5f 3e3f 3g3f 5e5f 5g5f P*5e 5f6e P*6d 6e5d 4d5d P*6e P*3e 3f3g 3c4d P*5f 5e5f 6e6d 4e4f 4g4f 4d5e 6d6c+ 5c6c P*6f 2a3c S*6e P*6d 6e5d 6c5d P*3d 4c3d P*3f S*4d 5i3i 3d4c 3f3e P*3h G*3d 4c5c 3i5i 7b4b 3g2f 5e4f 3d3c 4b8b 3c3d 4d5e N*7d 8b4b P*4d 5d4d 3d4d 4b4d 6g5f 5e5f 5i5f S*5e 5f5i P*5h 5i6i 5c5d 2f3f G*4e G*6e 6d6e 7f6e 5d4c 3f4e 4d4e S*5d',
      mk: { 21: { s: ['3h'] }, 26: { s: ['3b'] }, 27: { a: [['3h', '3c']] }, 29: { a: [['3e', '3b']] }, 34: { a: [['3a', '8f']] }, 53: { s: ['6c'] }, 57: { a: [['6c', '3f']], s: ['3f'] }, 68: { s: ['4c'] }, 81: { a: [['5f', '6e']] }, 99: { a: [['6e', '5d']] }, 104: { s: ['3d'] }, 107: { a: [['3i', '3e']] }, 111: { a: [['3d', '4c']] }, 115: { a: [['3g', '2f']], s: ['4f'] }, 121: { a: [['7d', '8b'], ['7d', '6b']] }, 134: { s: ['5d'] }, 135: { a: [['3f', '5d']] }, 137: { a: [['6e', '5d']] }, 139: { a: [['6e', '5d']] }, 141: { a: [['3f', '4e']] }, 143: { a: [['5d', '4c']], s: ['4c'] } } },
    // (2026-11-27) Kimura Yoshio v. Sakata Sankichi, February 1937: The Nanzen-ji Showdown: Sakata's Edge Pawn
    { id: 'nanzenji1937', kind: 'shogi', res: 's',
      moves: '7g7f 9c9d 5g5f 3c3d 5f5e 4c4d 3i4h 3a3b 4h5g 3b4c 2g2f 3d3e 2f2e 2b3c 5i6h 8b2b 4g4f 4a3b 4i5h 4c3d 6h7h 6a6b 7i6h 5a6a 5h4g 2c2d 2e2d 3c2d 5e5d 2a3c 3g3f P*2f 3f3e 2d3e 4g3f 6a7b 5d5c+ 6b5c P*2e 7a6b 6i5i 1c1d 3f3e 3d3e P*3d 3c2e 4f4e 2b2d 4e4d P*5e 8h5e 5c4d 5g4f 4d5e 4f3e 2d2a B*7g G*4e P*5c P*5a 3e4f 5e4f 3d3c+ 2a2d 3c3b 2d3d 3b4b 7c7d 2h2f 3d3i+ S*6a 7b6a G*8b 6b7a 2f4f 7a8b 4f4e 6a7b 4b5b S*7a G*6b 7b7c 4e2e G*5f G*6f 8c8d 6f5f B*4g 2e6e 7a6b 5b6b S*5d G*7b 7c8c 7g5e',
      mk: { 2: { s: ['9d'] }, 5: { s: ['5e'] }, 9: { s: ['5e', '5g'] }, 16: { a: [['2b', '2h']] }, 26: { a: [['2b', '2h']] }, 29: { a: [['5d', '5c']] }, 32: { a: [['2f', '2g']], s: ['2g'] }, 35: { a: [['3f', '3e']] }, 39: { s: ['2f'] }, 43: { s: ['3e'] }, 45: { a: [['3d', '3c']] }, 49: { a: [['4d', '4c']] }, 50: { a: [['8h', '5e']] }, 52: { a: [['4d', '5e']] }, 58: { s: ['5e', '4e'] }, 60: { s: ['5a', '5b'] }, 65: { s: ['3b'] }, 69: { a: [['2f', '4f']] }, 70: { s: ['3i'] }, 71: { s: ['6a'] }, 73: { a: [['8b', '7a']] }, 77: { s: ['4e'] }, 82: { s: ['7d'] }, 88: { a: [['4g', '5f']] }, 92: { a: [['5d', '6e']] }, 95: { a: [['5e', '7c']], s: ['8c'] } } },
    // (2026-11-27) Itō Sōkan III v. Ōhashi Sōmin (later Ōhashi Sōyo IV), 17th day of the 11th month, 1725 (Kyōhō 10): Sōkan's brilliant knight drop N*3e
    { id: 'sokan1725', kind: 'shogi', res: 's',
      moves: '7g7f 3c3d 2g2f 4c4d 2f2e 2b3c 3i4h 3a3b 5g5f 3b4c 4g4f 4a3b 4h5g 5c5d 3g3f 7a6b 4i5h 6b5c 5i6h 6a5b 6g6f 8c8d 7i7h 8d8e 7h7g 7c7d 6h7h 5a4a 5h6g 3c4b 8h7i 6c6d 7h8h 4a3a 6i7h 8a7c 5g4h 8b8d 7i6h 9c9d 4h3g 1c1d 3f3e 3d3e 3g2f 4c3d 2h3h 5b4c 9g9f 6d6e 6f6e 7c6e 2f3e 3d3e 3h3e P*3d 3e3h 7d7e 7g6f 5c6d P*3e 7e7f 3e3d 6d7e 4f4e 7e6f 6g6f S*7e 6f6e 8e8f 6e7e 4b7e 6h8f 7e8f 8g8f B*6f P*7g P*8g 7h8g S*6g N*3e 4c4b S*4c 7f7g+ 8i7g P*7f 4c3b+ 4b3b B*5c S*4b S*4c G*5b 3e2c 3a2b 4c3b+ 2b3b G*3c 2a3c 3d3c+ 4b3c 5c3a+',
      mk: { 10: { s: ['4c'] }, 18: { s: ['4c', '5c'] }, 35: { s: ['7g', '6g', '7h', '8h'] }, 36: { a: [['7c', '6e']] }, 37: { a: [['4h', '3g'], ['3g', '2f']] }, 43: { s: ['3e'] }, 47: { a: [['3h', '3d']] }, 50: { s: ['6e'] }, 52: { a: [['6e', '7g'], ['6e', '5g']] }, 59: { a: [['6f', '6e']] }, 63: { s: ['3d'] }, 66: { s: ['6e', '7e'] }, 76: { a: [['6f', '8h']] }, 77: { s: ['7g'] }, 79: { s: ['7h'] }, 80: { a: [['6g', '7h']] }, 81: { a: [['3e', '4c'], ['3e', '2c'], ['3h', '3e']], s: ['3d'] }, 83: { a: [['4c', '3b']] }, 89: { a: [['5c', '3a']] }, 93: { a: [['2c', '3a']], s: ['2c'] }, 97: { s: ['3c'] }, 99: { s: ['3c'] }, 101: { a: [['5c', '3a']], s: ['3b'] } } },
    // (2026-11-27) Alexander Alekhine v. Aron Nimzowitsch, January 1930: Alekhine's Gun
    { id: 'alekhine1930', kind: 'chess', res: 'w', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 Bd2 Ne7 Nb5 Bxd2+ Qxd2 O-O c3 b6 f4 Ba6 Nf3 Qd7 a4 Nbc6 b4 cxb4 cxb4 Bb7 Nd6 f5 a5 Nc8 Nxb7 Qxb7 a6 Qf7 Bb5 N8e7 O-O h6 Rfc1 Rfc8 Rc2 Qe8 Rac1 Rab8 Qe3 Rc7 Rc3 Qd7 R1c2 Kf8 Qc1 Rbc8 Ba4 b5 Bxb5 Ke8 Ba4 Kd8 h4',
      mk: { 0: { s: ['c1', 'c2', 'c3'] }, 2: { a: [['e6', 'd5']] }, 4: { a: [['d5', 'e4']] }, 6: { a: [['b4', 'c3']], s: ['e4'] }, 7: { s: ['f6'] }, 8: { a: [['c5', 'd4']] }, 9: { a: [['d2', 'b4']] }, 11: { a: [['b5', 'd6']], s: ['d6'] }, 15: { a: [['c3', 'd4']] }, 16: { a: [['c8', 'a6']] }, 17: { a: [['f4', 'e5']], s: ['f6'] }, 18: { a: [['a6', 'b5']] }, 20: { a: [['d7', 'b5'], ['a6', 'b5']] }, 21: { a: [['a4', 'b5']] }, 23: { a: [['b4', 'c5']] }, 25: { s: ['c3', 'c4', 'c5', 'c6'] }, 26: { a: [['b5', 'd6']] }, 27: { a: [['d6', 'b7']], s: ['d6'] }, 28: { s: ['e6', 'f5'] }, 29: { a: [['a5', 'b6']] }, 30: { a: [['c8', 'd6']] }, 31: { a: [['d6', 'b7']] }, 33: { a: [['a6', 'b7']], s: ['a7'] }, 35: { a: [['b5', 'c6']] }, 36: { a: [['e7', 'c6']] }, 39: { s: ['c1'] }, 41: { a: [['c2', 'c6']], s: ['c1'] }, 43: { s: ['c1', 'c2'] }, 44: { a: [['b8', 'b4']] }, 45: { a: [['e3', 'c1']] }, 47: { s: ['c2', 'c1'] }, 49: { s: ['c1'] }, 50: { a: [['f8', 'd8']] }, 51: { a: [['c1', 'c6']], s: ['c1', 'c2', 'c3'] }, 52: { s: ['c6', 'c7'] }, 53: { a: [['b4', 'b5'], ['a4', 'c6']] }, 54: { s: ['b5'] }, 55: { a: [['b5', 'c6']] }, 56: { a: [['e8', 'd8']] }, 57: { a: [['b4', 'b5']] }, 58: { s: ['c7'] }, 59: { a: [['c3', 'c6']], s: ['c6', 'c7', 'd8'] } } },
    // (2026-11-27) Chinook (computer) v. Marion Tinsley, 19 August 1992: Chinook beats Tinsley
    { id: 'ck1992g8', kind: 'checkers', res: 'b', moves: '11-15 23-18 10-14 18x11 8x15 22-17 14-18 24-19 15x24 28x19 7-11 17-14 11-16 19-15 4-8 21-17 16-19 17-13 12-16 25-21 18-22 26x17 9x18 29-25 16-20 17-14 2-7 21-17 19-24 30-26 7-10 14x7 3x10x19 27-23 18x27 32x23x16 24-27 31x24 20x27 26-22 8-12 16-11 27-31 11-7 31-26 25-21 26-30 22-18 30-26 18-14 26-22',
      mk: { 1: { a: [['11', '15']] }, 2: { a: [['23', '18']], s: ['15'] }, 3: { a: [['10', '14']] }, 4: { a: [['18', '11']], s: ['15'] }, 5: { a: [['8', '15']] }, 6: { a: [['22', '17'], ['26', '23']] }, 7: { a: [['14', '18']], s: ['22', '23'] }, 8: { a: [['24', '19']] }, 9: { a: [['15', '24']] }, 10: { a: [['28', '19']] },
        11: { a: [['7', '11']], s: ['15', '18'] }, 12: { a: [['17', '14']] }, 13: { a: [['11', '16']], s: ['19'] }, 14: { s: ['14', '15'] }, 15: { a: [['4', '8']], s: ['11'] }, 16: { a: [['21', '17']], s: ['14'] }, 17: { a: [['16', '19']] }, 18: { a: [['17', '13']] }, 19: { s: ['16', '19'] }, 20: { a: [['25', '21'], ['26', '22']] },
        21: { a: [['18', '22']] }, 22: { a: [['26', '17']] }, 23: { s: ['18', '22', '26'] }, 24: { a: [['29', '25']] }, 25: { a: [['16', '20']], s: ['24'] }, 26: { a: [['17', '14']], s: ['9', '10'] }, 27: { a: [['2', '7']] }, 28: { a: [['21', '17']] }, 29: { a: [['19', '24'], ['7', '10']], s: ['24'] }, 30: { a: [['30', '26']] },
        31: { a: [['7', '10']], s: ['10'] }, 32: { a: [['14', '7']] }, 33: { a: [['3', '10'], ['10', '19']], s: ['19'] }, 34: { a: [['27', '23']] }, 35: { a: [['18', '27']] }, 36: { a: [['32', '23'], ['23', '16']], s: ['29', '30', '31', '32'] }, 37: { a: [['24', '27']] }, 38: { a: [['31', '24']] }, 39: { a: [['20', '27']], s: ['27'] }, 40: { a: [['26', '22']] },
        41: { a: [['8', '12'], ['27', '31']] }, 42: { a: [['16', '11']] }, 43: { s: ['31'] }, 44: { a: [['11', '7']], s: ['3', '2'] }, 45: { a: [['31', '26']] }, 46: { s: ['13', '14', '21'] }, 47: { a: [['26', '30']] }, 48: { a: [['22', '18']] }, 49: { a: [['30', '26']], s: ['18', '21'] }, 50: { a: [['18', '14']] }, 51: { s: ['22'] } } },
    // (2026-11-27) Logistello (computer) v. Takeshi Murakami, 7 August 1997: Logistello sweeps the world champion
    { id: 'logistello1997', kind: 'reversi', res: 'b', moves: 'f5 d6 c4 d3 c3 f4 c5 b3 c2 e6 c6 b4 b5 d2 e3 a6 c1 b6 f3 f6 f7 e1 e2 f1 e7 g3 c7 g4 g5 d1 g1 f2 h3 h4 h5 c8 b1 d7 h2 e8 d8 g6 f8 g8 h6 g7 a2 a3 a4 b7 a8 b8 b2 a1 h8 h1 h7 g2 a5 a7',
      mk: { 2: { s: ['d6', 'd5'] }, 5: { s: ['f5', 'd6', 'c3', 'd3', 'c4'] }, 9: { s: ['c2', 'c3', 'c4', 'd3', 'e4'] }, 12: { s: ['b4'] }, 14: { s: ['d2', 'd3', 'd4', 'd5', 'd6'] }, 16: { s: ['a6'] }, 17: { s: ['c1'] }, 18: { s: ['b6'] }, 22: { s: ['e1', 'c1'] }, 27: { s: ['c7', 'a8'] }, 28: { s: ['g4'] }, 29: { s: ['g5'] },
      31: { s: ['h1', 'g1', 'f1', 'e1', 'd1', 'c1'] }, 33: { s: ['h1', 'h8'] }, 35: { s: ['h5', 'h4', 'h3'] }, 36: { s: ['c8', 'd8'] }, 39: { s: ['h1'] }, 40: { s: ['d8'] }, 41: { s: ['d8', 'd7', 'd6', 'd5', 'd4', 'd3'] }, 44: { s: ['g8', 'h8'] }, 45: { s: ['h7', 'h8'] }, 46: { s: ['g7', 'h8'] },
      50: { s: ['b7', 'a8'] }, 51: { s: ['a8', 'b7', 'c6', 'd5', 'e4'] }, 53: { s: ['b2', 'a1'] }, 54: { s: ['a5', 'a1', 'b2', 'c3', 'd4'] }, 55: { s: ['h8', 'g8', 'f8', 'e8', 'd8', 'c8', 'b8'] }, 56: { s: ['h1', 'g1', 'f1', 'e1', 'd1', 'c1', 'b1'] }, 58: { s: ['a5', 'a7'] } } },
    // (2026-11-27) Masuda Kōzō v. Ōyama Yasuharu, March 1948: The Mount Kōya Showdown: 'Illusion bad, look carefully good'
    { id: 'koyasan1948', kind: 'shogi', res: 'g',
      moves: '2g2f 8c8d 2f2e 8d8e 7g7f 4a3b 8h7g 3c3d 7i6h 7a6b 6i7h 5c5d 2e2d 2c2d 2h2d P*2c 2d3d 6b5c 3d3f 5d5e 5g5f 5c4d 5f5e 8b5b 5i6i 4d5e 3i4h P*5f P*5g 5f5g+ 4h5g 5a4a P*5f 5e4d 3f2f 3a4b 6g6f 4b5c 6h6g 5c5d 2f2h 6c6d 4i5h 7c7d 4g4f 5b8b 3g3f 6a5b 7g5i 4d5c 8i7g 8e8f 8g8f 8b8f P*8g 8f8d 5i2f 2b4d 2f3g 4d2b 2h4h 6d6e 4f4e 6e6f 5g6f P*6e 6f5g P*5e 5g4f 7d7e 7f7e 5c6d 4e4d 2b4d 4f3e 2a3c 5f5e 4d5e P*5c 6d5c 3g5e 5d5e 7g6e 5c5d P*5c 5b4b P*2d P*5g 5h6h P*6f 6g7f B*4e B*9f P*8e 7f8e 8d8b 8e7f 4a3a 2i3g 4e5f 6h5g P*7g 7h7g 5f8i+ 2d2c+ 8i2c 4h2h P*2e P*2d 2c8i 7g7h 5d6e 7f6e 8a7c 6e7d N*6e 5g5h 5e5f 7d7c+ 8i7h 6i7h G*6g 7h6i 6g5h 6i5h 6e5g+ 5h4i 5f4g+ 4i3i 5g4h 2h4h 4g4h 3i4h R*8h 4h4g 8b8g+ 9f8g 8h8g+ 4g4f B*6d N*5e G*4g',
      mk: { 17: { a: [['2d', '3d']] }, 24: { a: [['5b', '5e']] }, 28: { s: ['5g'] }, 81: { s: ['5e'] }, 93: { a: [['9f', '4a']] }, 104: { s: ['8i'] }, 106: { a: [['8i', '2c']] }, 120: { a: [['8i', '7h']] }, 133: { s: ['4h'] }, 134: { a: [['8h', '4h']] }, 137: { a: [['9f', '8g']] }, 139: { s: ['4f', '6d'] }, 140: { a: [['6d', '4f']] }, 142: { s: ['4g'] } } },
    // (2026-11-27) Bobby Fischer v. Boris Spassky, 23 July 1972: The Game Spassky Applauded
    { id: 'fischer1972', kind: 'chess', res: 'w', moves: 'c4 e6 Nf3 d5 d4 Nf6 Nc3 Be7 Bg5 O-O e3 h6 Bh4 b6 cxd5 Nxd5 Bxe7 Qxe7 Nxd5 exd5 Rc1 Be6 Qa4 c5 Qa3 Rc8 Bb5 a6 dxc5 bxc5 O-O Ra7 Be2 Nd7 Nd4 Qf8 Nxe6 fxe6 e4 d4 f4 Qe7 e5 Rb8 Bc4 Kh8 Qh3 Nf8 b3 a5 f5 exf5 Rxf5 Nh7 Rcf1 Qd8 Qg3 Re7 h4 Rbb7 e6 Rbc7 Qe5 Qe8 a4 Qd8 R1f2 Qe8 R2f3 Qd8 Bd3 Qe8 Qe4 Nf6 Rxf6 gxf6 Rxf6 Kg8 Bc4 Kh8 Qf4',
      mk: { 0: { s: ['e4', 'c4'] }, 1: { s: ['c4'] }, 4: { a: [['d5', 'c4']] }, 5: { s: ['c4', 'd4'] }, 7: { a: [['c3', 'd5']] }, 9: { a: [['g5', 'f6']], s: ['d5'] }, 12: { a: [['h6', 'g5']] }, 13: { a: [['h4', 'f6']] }, 14: { a: [['c8', 'b7']] }, 20: { s: ['d5'] }, 21: { a: [['c1', 'c5']] }, 22: { a: [['e6', 'd5']] }, 23: { a: [['a4', 'a7'], ['a4', 'c6']] }, 24: { s: ['c5', 'd5'] }, 25: { a: [['a3', 'e7']], s: ['c5'] }, 27: { a: [['b5', 'd7'], ['b5', 'c6']], s: ['b7'] }, 28: { a: [['a6', 'b5']] }, 30: { s: ['c5', 'd5'] }, 32: { a: [['a7', 'c7']] }, 35: { a: [['d4', 'e6']] }, 36: { a: [['f8', 'f2']] }, 38: { s: ['e6'] }, 39: { a: [['e4', 'd5']] }, 40: { s: ['d4'] }, 41: { a: [['f4', 'f5'], ['e4', 'e5']] }, 43: { s: ['f6'] }, 44: { a: [['b8', 'b2']] }, 45: { a: [['c4', 'e6']] }, 47: { a: [['h3', 'e6']] }, 49: { s: ['b3'] }, 51: { a: [['f5', 'e6']], s: ['f5'] }, 53: { s: ['f1', 'f8'] }, 55: { s: ['f5', 'f1'] }, 57: { a: [['g3', 'g7']] }, 59: { s: ['g5'] }, 61: { s: ['e6'], a: [['c4', 'e6']] }, 63: { a: [['e5', 'c5'], ['e5', 'g7']] }, 65: { s: ['a5'] }, 71: { a: [['d3', 'h7']] }, 73: { a: [['e4', 'h7'], ['f5', 'f8']], s: ['h7'] }, 74: { a: [['f6', 'e4']] }, 75: { s: ['f6'] }, 77: { s: ['h8'] }, 79: { a: [['c4', 'e6']] }, 81: { a: [['f4', 'h6'], ['f6', 'f8']], s: ['h8'] } } },
    // (2026-11-27) Itō Kanju v. Ōhashi Sōkei VIII, 17th day of the 11th month, 1754 (Hōreki 4): Kanju beats his brother and reaches 8-dan
    { id: 'kanju1754', kind: 'shogi', res: 's',
      moves: '7g7f 3c3d 2g2f 4c4d 2f2e 2b3c 3i4h 3a3b 5g5f 5c5d 3g3f 8b4b 4i5h 5a6b 5i6h 6b7b 6h7h 7a6b 9g9f 9c9d 1g1f 1c1d 2i3g 4d4e 4h5g 7b8b 2h2f 6a7b 3f3e 3d3e 2e2d 2c2d 8h3c+ 3b3c 5f5e 3e3f 2f3f P*3d 5e5d B*2h 9f9e 2h1i+ 9e9d P*9b B*5c 4e4f 5c6b+ 7b6b S*5c 6b7b 5c4b+ 3c4b 5d5c+ 4b5c 3f4f L*4b 4f5f 5c6b 3g4e 1i6d P*2b B*4d 5g6f 4d2b P*3c 4b4e R*4c P*4b 4c4e+ 2b3c P*5d N*4d 5f4f S*3e 4e3e 3d3e P*3d 3c2b L*2c P*5g 6f5g 2b1c 2c2a+ 3e3f 2a1a 2d2e L*8f 3f3g+ N*9e R*2h 5g6f P*5g 5h6h 3g4h 4f4d 4h5h 5d5c+ 6d5c 9e8c+ 7b8c N*7e 8b7a 8f8c+ 7a6a S*7b 6a5b 7e6c+ 6b6c 7b6c+ 5c6c S*7b 6c5c G*6c 5c6c 7b6c+ 5b6c B*7b 6c5b P*5c 5b5c 7b5d+ 5c5b P*5c 5b5a 3d3c+ 5h6h 7i6h 5g5h+ 3c4b 4a4b 4d4b+ 5a4b G*4c 4b4a 5c5b+ 4a3a 4c3b',
      mk: { 12: { s: ['4b'] }, 24: { s: ['4e'] }, 29: { s: ['3e'] }, 33: { a: [['8h', '3c']] }, 41: { s: ['9e'] }, 45: { a: [['5c', '6b'], ['5c', '4b']] }, 49: { a: [['5c', '4b'], ['5c', '6b']] }, 51: { s: ['4b'] }, 60: { a: [['1i', '6d']] }, 63: { s: ['6f'] }, 67: { a: [['4c', '4e']] }, 72: { a: [['4d', '5f']] }, 74: { a: [['3e', '4f']] }, 75: { a: [['4e', '3e']] }, 79: { a: [['2c', '2b']] }, 87: { a: [['8f', '8b']] }, 89: { a: [['9e', '8c']] }, 101: { a: [['7e', '8c'], ['7e', '6c']] }, 105: { a: [['7b', '6a']] }, 113: { s: ['5c'] }, 117: { a: [['7b', '6c']] }, 121: { s: ['5d'] }, 131: { a: [['4d', '4b']] }, 137: { a: [['5d', '3b']], s: ['3b'] } } },
    // (2026-11-27) Masuda Kōzō v. Ōyama Yasuharu, July 10-11, 1957: Masuda, the First Triple Crown: Winning the Meijin Title
    { id: 'masuda1957', kind: 'shogi', res: 's',
      moves: '7g7f 8c8d 7i6h 3c3d 6h7g 3a4b 2g2f 7a6b 3i4h 4a3b 6i7h 5a4a 5i6i 7c7d 3g3f 5c5d 4g4f 6c6d 2f2e 4b3c 4h3g 2b3a 3g2f 6d6e 3f3e 3d3e 2f3e 3a5c 2h3h 3c4d 7g6h P*3c 3e4d 5c4d 8h4d 4c4d 3h4h 6a5b 6i7i 8d8e 4f4e 4d4e 4h4e P*4c 4i5i 8e8f 8g8f 8a7c 2e2d 2c2d P*2b 3b2b P*2c 2b2c B*6a 6b5a S*6d B*3d 6d7c 8b8a 4e6e P*6d 6e6d P*6c 6d5d P*5c 5d3d 3c3d 7c7b+ 8a8f N*1e 2c3c P*8g 8f8e P*2b S*3b 2b2a+ 3b2a 7f7e 5b4b P*4d 2a3b 4d4c+ 3b4c N*4e P*8h 4e3c 4b3c B*7f 8h8i+ 7i8i 8e7e 6a4c+ 3c4c 7f4c+',
      mk: { 5: { s: ['7g'] }, 24: { s: ['6e'] }, 25: { a: [['2f', '3e']] }, 29: { a: [['3h', '3e']] }, 30: { a: [['4d', '3e']] }, 43: { s: ['4e'] }, 51: { s: ['2b'] }, 53: { s: ['2c'] }, 55: { a: [['6a', '5b']] }, 57: { a: [['6d', '7c']] }, 58: { a: [['3d', '4e']] }, 67: { s: ['3d'] }, 71: { a: [['1e', '2c']] }, 79: { s: ['7e'] }, 87: { a: [['3c', '4a']], s: ['4a'] }, 89: { a: [['7f', '4c'], ['6a', '4c']] }, 95: { s: ['4c'] } } },
    // (2026-11-27) Marion Tinsley v. Chinook (University of Alberta computer), 22 August 1992: Chinook freezes and resigns a drawn game
    { id: 'ck1992g18', kind: 'checkers', res: 'b', moves: '9-13 23-19 6-9 27-23 9-14 22-18 11-15 18x9 5x14 25-22 7-11 30-25 1-5 22-17 13x22 25x18x9 5x14 26-22 11-16 24-20 15x24 20x11 8x15 28x19 15x24 22-18 12-16 18x9 16-20 23-19 10-14 31-26 14-18 26-22',
      mk: { 1: { a: [['9', '13']] }, 2: { a: [['23', '19']] }, 3: { a: [['6', '9']], s: ['9', '13'] }, 4: { a: [['27', '23']] }, 5: { a: [['9', '14']] }, 6: { a: [['22', '18']] }, 7: { a: [['11', '15']], s: ['14', '15', '18'] }, 8: { a: [['18', '9']] }, 9: { a: [['5', '14']] }, 10: { a: [['25', '22']] }, 11: { a: [['7', '11']] }, 12: { a: [['30', '25']] }, 13: { a: [['1', '5']] }, 14: { a: [['22', '17']], s: ['13'] }, 15: { a: [['13', '22']] }, 16: { a: [['25', '18'], ['18', '9']], s: ['22', '14'] }, 17: { a: [['5', '14']] }, 18: { a: [['26', '22']] }, 19: { a: [['11', '16']] }, 20: { a: [['24', '20']], s: ['15'] }, 21: { a: [['15', '24']] }, 22: { a: [['20', '11']], s: ['16'] }, 23: { a: [['8', '15']] }, 24: { a: [['28', '19']] }, 25: { a: [['15', '24']], s: ['24'] }, 26: { a: [['22', '18']] }, 27: { a: [['12', '16']], s: ['14'] }, 28: { a: [['18', '9']] }, 29: { a: [['16', '20']], s: ['24'] }, 30: { a: [['23', '19']], s: ['19', '20', '24'] }, 31: { a: [['10', '14']] }, 32: { a: [['31', '26']] }, 33: { a: [['14', '18']] }, 34: { a: [['26', '22']], s: ['18', '22', '9'] } } },
    // (2026-11-27) Judit Polgar v. Garry Kasparov, 9 September 2002: Polgar's First Win over Kasparov
    { id: 'polgar2002', kind: 'chess', res: 'w', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8 Nc3 h6 Rd1+ Ke8 h3 Be7 Ne2 Nh4 Nxh4 Bxh4 Be3 Bf5 Nd4 Bh7 g4 Be7 Kg2 h5 Nf5 Bf8 Kf3 Bg6 Rd2 hxg4+ hxg4 Rh3+ Kg2 Rh7 Kg3 f6 Bf4 Bxf5 gxf5 fxe5 Re1 Bd6 Bxe5 Kd7 c4 c5 Bxd6 cxd6 Re6 Rah8 Rexd6+ Kc8 R2d5 Rh3+ Kg2 Rh2+ Kf3 R2h3+ Ke4 b6 Rc6+ Kb8 Rd7 Rh2 Ke3 Rf8 Rcc7 Rxf5 Rb7+ Kc8 Rdc7+ Kd8 Rxg7 Kc8',
      mk: { 0: { s: ['e4', 'e5'] }, 5: { a: [['b5', 'c6']], s: ['e5'] }, 6: { a: [['f6', 'e4']] }, 8: { s: ['e4'] }, 9: { a: [['d4', 'e5']] }, 10: { a: [['d6', 'b5']] }, 12: { s: ['c7', 'c6'] }, 13: { a: [['e5', 'd6']] }, 15: { a: [['d1', 'd8']] }, 16: { s: ['d8', 'e8'] }, 17: { s: ['e5', 'f2', 'g2', 'h2'] }, 18: { s: ['g5'] }, 19: { a: [['d1', 'd8']] }, 21: { s: ['g4'] }, 23: { a: [['e2', 'd4'], ['e2', 'f4']] }, 24: { a: [['h4', 'f3']] }, 28: { a: [['f5', 'c2']] }, 29: { a: [['d4', 'f5']] }, 30: { a: [['h7', 'c2']] }, 31: { a: [['h4', 'g3']], s: ['g4'] }, 33: { s: ['g2'] }, 34: { a: [['h5', 'g4']] }, 35: { a: [['f5', 'g7']], s: ['f5'] }, 37: { a: [['f3', 'g4']] }, 38: { a: [['g6', 'f5']] }, 42: { a: [['h3', 'f3']] }, 45: { s: ['g3', 'h7'] }, 46: { a: [['f6', 'e5']] }, 47: { a: [['f4', 'e5']] }, 51: { a: [['e1', 'e5']], s: ['e8'] }, 53: { a: [['e1', 'e8']] }, 55: { s: ['c4', 'c5', 'd5'] }, 57: { s: ['d6'] }, 59: { a: [['e6', 'd6'], ['d2', 'd6']] }, 61: { s: ['d6'] }, 63: { s: ['d6', 'd5'] }, 69: { s: ['e4'] }, 71: { a: [['c6', 'c8']] }, 73: { s: ['d7'] }, 77: { s: ['c7', 'd7'] }, 78: { a: [['f5', 'f2']] }, 79: { a: [['b7', 'b8']] }, 81: { a: [['c7', 'c8']] }, 83: { a: [['g7', 'g8']], s: ['g7'] }, 84: { a: [['g7', 'g8'], ['b7', 'a7']], s: ['c8'] } } },
    // (2026-11-27) Yan Zongjin v. Yang Guanlin, 9 November 1957: Yang Guanlin's Houji Game
    { id: 'yang1957', kind: 'xiangqi', res: 'b', moves: 'h2e2 h7e7 h0g2 h9g7 i0h0 i9i8 f0e1 i8d8 h0h6 b9c7 b0a2 c6c5 h6g6 e7e8 b2c2 d8d7 a0b0 a9a7 b0b6 e8g8 g6f6 g8b8 b6c6 b8c8 c6b6 c7d5 f6h6 c5c4 b6b5 c9e7 h6g6 c8b8 b5b7 a7b7 g6g7 c4c3 c2d2 b8c8 e2e6 d9e8 g0e2 d5f4 a2c3 d7d3 c3a2 f4e6 g7g6 e6c7 g3g4 b7b1', mk: { 13: { s: ['g6'] }, 14: { a: [['e8', 'g8']] }, 18: { s: ['a7', 'b7'] }, 20: { a: [['g8', 'g6']] }, 22: { a: [['b8', 'b6']] }, 24: { a: [['c8', 'c6']] }, 28: { s: ['c4'] }, 32: { a: [['b8', 'b5']] }, 34: { s: ['b7'] }, 36: { a: [['c3', 'c2']] }, 38: { a: [['c8', 'c0']] }, 39: { a: [['e6', 'e9']] }, 42: { a: [['f4', 'e6']] }, 44: { a: [['d3', 'd2'], ['d3', 'c3']] }, 46: { s: ['e6'] }, 50: { a: [['b1', 'd1']], s: ['b1'] } } },
    // (2026-11-27) AlphaGo (DeepMind's program) v. Lee Sedol 9-dan, 13 March 2016: The Divine Move — Lee Sedol Strikes Back at AlphaGo
    { id: 'alphago2016', kind: 'go', size: 19, res: 'W+R',
      moves: 'pd dp cd qp op oq nq pq cn fq mp po iq ec hd cg ed cj dc bp nc qi ep eo dk fp ck dj ej ei fi eh fh bj fk fg gg ff gf mc md lc nb id hc jg pj pi oj oi ni nh mh ng mg mi nj mf li ne nd mj lf mk me nf lh qj kk ik ji gh hj ge he fd fc ki jj lj kh jh ml nk ol ok pk pl qk nl kj ii rk om pg ql cp co oe rl sk rj hg ij km gi fj jl kl gl fl gm ch ee eb bg dg eg en fo df dh im hk bn if gd fe hf ih bh ci ho go or rg dn cq pr qr rf qg qf jc gr sf se sg rd bl bk ak cl hn in hp fr er es ds ah ai kd ie kc kb gk ib qh rh qs rs oh sl of sj ni nj oo jp',
      mk: {1: {'s':['pd']},2: {'s':['dp']},3: {'s':['cd']},4: {'s':['qp']},5: {'s':['op','qp']},6: {'s':['oq','op']},9: {'s':['cn','dp']},10: {'s':['fq']},14: {'s':['ec','cd']},15: {'s':['hd','ec'],'a':[['hd','ec']]},16: {'a':[['cg','cd']],'s':['cg']},18: {'s':['cj']},19: {'s':['ec']},20: {'s':['bp']},22: {'s':['qi','qp','po']},23: {'s':['dp','fp']},40: {'a':[['mc','nc']],'s':['mc']},47: {'s':['pj','qi'],'a':[['pj','qi']]},56: {'s':['mi']},58: {'s':['nh','ng']},69: {'s':['li','lh','lf','ji']},72: {'s':['gh']},73: {'s':['hj','kk','ji']},77: {'s':['fc']},78: {'s':['ki','ji','li','kh','kj'],'a':[['ki','jj'],['ki','kj']]},79: {'s':['jj','kj']},80: {'s':['lj','ki','ji']},82: {'s':['jh','ji','jj','kh']},87: {'s':['pk','oj','pj','ni']},91: {'s':['ki']},92: {'s':['ii','jh','hj']},97: {'s':['cp','co','bp']},101: {'s':['sk','rk','qk','pk']},115: {'s':['eb']},176: {'s':['sj','pj','oj','ni','nj','pk','qk','rk','sk']},180: {'s':['jp']}} },
    // (2026-11-27) Hidenori Maruoka v. Carol Jacobs, October 1978: Maruoka, 16, wins the final 64–0
    { id: 'maruoka1978', kind: 'reversi', res: 'b', moves: 'f5 f6 e6 f4 e3 c5 c4 d3 f3 e2 f2 d2 c3 d6 d1 b5 c1 c2 b3 e1 f1 a3 a6 b4 a4 b6 a2 g3 a5 b2 h3 h2 h1 g1 g2 b1 h4 g4 a1 - h5 g5 b7 a7 a8 b8 c8 - c6 - h6 g6 c7 d7 d8 - g7 f7 f8 g8 e7 e8 h8',
      mk: { 2: { s: ['f6', 'e5'] }, 5: { s: ['f5', 'f6', 'e6', 'f4', 'e3'] }, 8: { s: ['d3'] }, 14: { s: ['d6', 'e6', 'd5', 'd4', 'd3'] }, 21: { s: ['c1', 'd1', 'e1', 'f1'] }, 27: { s: ['a2', 'a1'] }, 29: { s: ['b1', 'g1', 'b2'] }, 30: { s: ['b2', 'a1'] }, 32: { s: ['h2', 'h1'] }, 33: { s: ['h1'] }, 36: { s: ['b1', 'a1', 'h1'] }, 39: { s: ['a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1'] }, 43: { s: ['b7', 'b6', 'b5', 'b4', 'b3', 'b2'] }, 45: { s: ['a8'] }, 49: { s: ['c6'] }, 57: { s: ['g7', 'g6', 'g5', 'g4', 'g3', 'g2', 'f6'] }, 63: { s: ['h8', 'h7'] } } },
    // (2026-11-27) Logistello (computer) v. Takeshi Murakami, 6 August 1997: Logistello takes all four corners, 55–9
    { id: 'logistello1997g4', kind: 'reversi', res: 'b', moves: 'f5 f6 e6 f4 e3 c5 c4 e7 c6 e2 f3 g4 g5 d6 e8 h6 c7 d7 f7 d8 f8 g8 g6 h5 g3 d3 d2 h2 c3 d1 f2 g1 c2 g2 h1 g7 c1 b3 f1 e1 c8 b8 b4 b6 b5 a5 a4 a3 a7 b7 h3 h4 a8 a6 h8 b1 h7 - b2 a2 a1',
      mk: { 5: { s: ['f5', 'f6', 'e6', 'f4', 'e3'] }, 8: { s: ['e7'] }, 15: { s: ['e8'] }, 22: { s: ['g8', 'h8'] }, 28: { s: ['h2', 'h1'] }, 32: { s: ['g1', 'h2', 'h1'] }, 34: { s: ['g2', 'h1'] }, 35: { s: ['h1', 'g2', 'f3', 'e4', 'd5'] }, 36: { s: ['g7', 'h8'] }, 42: { s: ['b8', 'c8', 'd8', 'e8', 'f8', 'g8'] }, 48: { s: ['b1', 'a3', 'a6', 'b7'] }, 50: { s: ['b7', 'a8'] }, 53: { s: ['a8', 'b7', 'c6', 'd5', 'e4'] }, 55: { s: ['h8', 'g8', 'f8', 'e8', 'd8', 'c8', 'b8'] }, 59: { s: ['b2'] }, 61: { s: ['a1', 'h1', 'a8', 'h8'] } } }
  ];

  /* ---------- the kinds ---------- */
  const FIG = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘' };   // figurines (the list reads the same in every language); U+FE0E keeps them text
  const CHESS = (() => {
    const sq = s => (s.charCodeAt(0) - 97) + (s.charCodeAt(1) - 49) * 8, nm = i => 'abcdefgh'[i & 7] + ((i >> 3) + 1), BACK = 'RNBQKBNR';
    function init() { const b = Array(64).fill(null); let id = 0;
      for (let f = 0; f < 8; f++) { b[f] = { id: id++, c: 'w', t: BACK[f] }; b[8 + f] = { id: id++, c: 'w', t: 'P' }; b[48 + f] = { id: id++, c: 'b', t: 'P' }; b[56 + f] = { id: id++, c: 'b', t: BACK[f] }; }
      return { b, turn: 'w', cr: 'KQkq', ep: -1 }; }
    function hits(b, from, to) {   // the piece on from attacks to (pins aside)
      const p = b[from], df = (to & 7) - (from & 7), dr = (to >> 3) - (from >> 3), ad = Math.abs(df), ar = Math.abs(dr);
      if (!df && !dr) return false;
      if (p.t === 'P') return dr === (p.c === 'w' ? 1 : -1) && ad === 1;
      if (p.t === 'N') return (ad === 1 && ar === 2) || (ad === 2 && ar === 1);
      if (p.t === 'K') return Math.max(ad, ar) === 1;
      const line = !df || !dr, diag = ad === ar;
      if ((p.t === 'R' && !line) || (p.t === 'B' && !diag) || (p.t === 'Q' && !line && !diag)) return false;
      const sf = Math.sign(df), sr = Math.sign(dr); let f = (from & 7) + sf, r = (from >> 3) + sr;
      while (f !== (to & 7) || r !== (to >> 3)) { if (b[f + r * 8]) return false; f += sf; r += sr; } return true; }
    const under = (b, s, by) => b.some((p, i) => p && p.c === by && hits(b, i, s));
    const king = (b, c) => b.findIndex(p => p && p.c === c && p.t === 'K');
    const opp = c => c === 'w' ? 'b' : 'w';
    function can(st, from, to) { const b = st.b, p = b[from], q = b[to]; if (!p || p.c !== st.turn || (q && q.c === p.c)) return false;
      if (p.t !== 'P') return hits(b, from, to);
      const d = p.c === 'w' ? 1 : -1, df = (to & 7) - (from & 7), dr = (to >> 3) - (from >> 3);
      if (!df) return !q && (dr === d || (dr === 2 * d && (from >> 3) === (p.c === 'w' ? 1 : 6) && !b[from + 8 * d]));
      return Math.abs(df) === 1 && dr === d && (!!q || to === st.ep); }
    function step(st, from, to, promo) {
      const b = st.b.slice(), p = b[from]; let cap = b[to], cs = to, rook = null;
      if (p.t === 'P' && to === st.ep && !cap) { cs = to + (p.c === 'w' ? -8 : 8); cap = b[cs]; b[cs] = null; }
      b[to] = promo ? { id: p.id, c: p.c, t: promo } : p; b[from] = null;
      if (p.t === 'K' && Math.abs((to & 7) - (from & 7)) === 2) { const r = to > from ? from + 3 : from - 4, rt = to > from ? from + 1 : from - 1; b[rt] = b[r]; b[r] = null; rook = [r, rt]; }
      let cr = st.cr; if (p.t === 'K') cr = cr.replace(p.c === 'w' ? /[KQ]/g : /[kq]/g, '');
      [[0, 'Q'], [7, 'K'], [56, 'q'], [63, 'k']].forEach(([s, ch]) => { if (from === s || to === s) cr = cr.replace(ch, ''); });
      return { st: { b, turn: opp(st.turn), cr, ep: p.t === 'P' && Math.abs(to - from) === 16 ? (from + to) / 2 : -1 }, cap: cap ? { id: cap.id, at: cs } : null, rook }; }
    const safe = (st, from, to, promo) => { const r = step(st, from, to, promo); return !under(r.st.b, king(r.st.b, st.turn), r.st.turn); };
    const anyMove = st => { for (let i = 0; i < 64; i++) if (st.b[i] && st.b[i].c === st.turn) for (let j = 0; j < 64; j++) if (can(st, i, j) && safe(st, i, j, st.b[i].t === 'P' && ((j >> 3) % 7 === 0) ? 'Q' : null)) return true; return false; };
    function play(st, san) {
      const s = san.replace(/[+#!?]/g, '');
      let from, to, promo = null;
      if (/^(O-O|O-O-O)$/.test(s)) { const long = s === 'O-O-O'; from = st.turn === 'w' ? 4 : 60; to = from + (long ? -2 : 2);
        const right = st.turn === 'w' ? (long ? 'Q' : 'K') : (long ? 'q' : 'k'), p = st.b[from];
        if (!p || p.t !== 'K' || !st.cr.includes(right)) throw new Error('cannot castle: ' + san);
        if ((long ? [from - 1, from - 2, from - 3] : [from + 1, from + 2]).some(i => st.b[i])) throw new Error('castling blocked: ' + san);
        if ([from, from + (long ? -1 : 1), to].some(i => under(st.b, i, opp(st.turn)))) throw new Error('castling through check: ' + san);
      } else {
        const m = s.match(/^([KQRBN])?([a-h])?([1-8])?(x)?([a-h][1-8])(?:=([QRBN]))?$/); if (!m) throw new Error('bad move: ' + san);
        const t = m[1] || 'P'; to = sq(m[5]); promo = m[6] || null;
        const c = []; st.b.forEach((p, i) => { if (p && p.c === st.turn && p.t === t && (!m[2] || (i & 7) === m[2].charCodeAt(0) - 97) && (!m[3] || (i >> 3) === +m[3] - 1) && can(st, i, to) && safe(st, i, to, promo)) c.push(i); });
        if (c.length !== 1) throw new Error((c.length ? 'ambiguous: ' : 'no such move: ') + san);
        from = c[0];
        const capt = !!st.b[to] || (t === 'P' && to === st.ep); if (capt !== !!m[4]) throw new Error('capture mark wrong: ' + san);
        if (t === 'P' && (to >> 3) % 7 === 0 && !promo) throw new Error('promotion missing: ' + san);
      }
      const r = step(st, from, to, promo), chk = under(r.st.b, king(r.st.b, r.st.turn), st.turn), mate = chk && !anyMove(r.st);
      if (/#/.test(san) !== mate || (/\+/.test(san) && !chk) || (chk && !mate && !/\+/.test(san))) throw new Error('check mark wrong: ' + san);
      return Object.assign(r, { from: nm(from), to: nm(to), side: st.turn, rook: r.rook && r.rook.map(nm), capAt: r.cap && nm(r.cap.at) });
    }
    const label = (mv, i) => mv.replace(/^[KQRBN]/, c => FIG[c] + '︎').replace(/=([QRBN])/, (_, c) => '=' + FIG[c] + '︎');
    const pieces = st => st.b.map((p, i) => p && { id: p.id, at: nm(i), k: p.c + p.t }).filter(Boolean);
    return { init, play, label, pieces, cols: 8, rows: 8, sides: ['w', 'b'], first: 'w', pair: true,
      xy: (s, flip) => { const f = s.charCodeAt(0) - 97, r = s.charCodeAt(1) - 49; return flip ? [7 - f, r] : [f, 7 - r]; } };
  })();

  // shogi: USI. Board files 9…1 from the left (as seen by sente), ranks a…i (一…九) from the top. Pieces: K R B G S N L P, '+' promoted.
  const SHOGI = (() => {
    const KAN = { K: '玉', R: '飛', B: '角', G: '金', S: '銀', N: '桂', L: '香', P: '歩', '+R': '龍', '+B': '馬', '+S': '全', '+N': '圭', '+L': '杏', '+P': 'と' };
    const KN = ['一', '二', '三', '四', '五', '六', '七', '八', '九'], ZEN = '０１２３４５６７８９';
    const key = (f, r) => f + ',' + r, at = s => [+s[0], s.charCodeAt(1) - 96];
    function init() { const b = {}; let id = 0; const put = (f, r, t, c) => { b[key(f, r)] = { id: id++, t, c }; };
      'LNSGKGSNL'.split('').forEach((t, i) => { put(9 - i, 9, t, 's'); put(9 - i, 1, t, 'g'); });
      put(8, 8, 'B', 's'); put(2, 8, 'R', 's'); put(8, 2, 'R', 'g'); put(2, 2, 'B', 'g');
      for (let f = 1; f <= 9; f++) { put(f, 7, 'P', 's'); put(f, 3, 'P', 'g'); }
      return { b, h: { s: [], g: [] }, turn: 's', last: null }; }
    const base = t => t.replace('+', '');
    function reach(st, p, f0, r0, f1, r1) {   // the piece's move fits its kind (pins and the rest aside)
      const fw = p.c === 's' ? -1 : 1, df = f1 - f0, dr = r1 - r0, adf = Math.abs(df), adr = Math.abs(dr);
      const gold = (adf <= 1 && adr <= 1) && !(dr === -fw && adf === 1) && (adf || adr);
      const clear = () => { const sf = Math.sign(df), sr = Math.sign(dr); let f = f0 + sf, r = r0 + sr; while (f !== f1 || r !== r1) { if (st.b[key(f, r)]) return false; f += sf; r += sr; } return true; };
      switch (p.t) {
        case 'K': return adf <= 1 && adr <= 1 && (adf || adr);
        case 'G': case '+S': case '+N': case '+L': case '+P': return !!gold;
        case 'S': return adf <= 1 && adr <= 1 && (dr === fw || (adr === 1 && adf === 1)) && (adf || adr);
        case 'N': return adf === 1 && dr === 2 * fw;
        case 'L': return !df && Math.sign(dr) === fw && clear();
        case 'P': return !df && dr === fw;
        case 'R': return (!df || !dr) && (adf || adr) && clear();
        case 'B': return adf === adr && adf && clear();
        case '+R': return ((!df || !dr) && (adf || adr) && clear()) || (adf === 1 && adr === 1);
        case '+B': return (adf === adr && adf && clear()) || (adf + adr === 1);
      } return false; }
    function play(st, mv) {
      const b = Object.assign({}, st.b), h = { s: st.h.s.slice(), g: st.h.g.slice() }, me = st.turn, you = me === 's' ? 'g' : 's';
      let out;
      if (mv[1] === '*') { const t = mv[0], [f, r] = at(mv.slice(2)), i = h[me].findIndex(x => x.t === t);
        if (i < 0 || b[key(f, r)]) throw new Error('cannot drop: ' + mv);
        const p = h[me].splice(i, 1)[0]; b[key(f, r)] = { id: p.id, t, c: me };
        out = { from: null, to: mv.slice(2), drop: t, t, side: me };
      } else {
        const [f0, r0] = at(mv), [f1, r1] = at(mv.slice(2, 4)), pr = mv[4] === '+', p = b[key(f0, r0)], q = b[key(f1, r1)];
        if (!p || p.c !== me) throw new Error('no piece to move: ' + mv); if (q && q.c === me) throw new Error('own piece in the way: ' + mv);
        if (!reach(st, p, f0, r0, f1, r1)) throw new Error('the piece cannot go there: ' + mv);
        const zone = r => me === 's' ? r <= 3 : r >= 7;
        if (pr && (p.t[0] === '+' || 'KG'.includes(p.t) || !(zone(r0) || zone(r1)))) throw new Error('cannot promote: ' + mv);
        if (q) h[me].push({ id: q.id, t: base(q.t) });
        b[key(f0, r0)] = undefined; delete b[key(f0, r0)]; b[key(f1, r1)] = { id: p.id, t: pr ? '+' + p.t : p.t, c: me };
        out = { from: mv.slice(0, 2), to: mv.slice(2, 4), t: p.t, pr, cap: q ? { id: q.id } : null, side: me, could: !pr && p.t[0] !== '+' && !'KG'.includes(p.t) && (zone(r0) || zone(r1)) };
      }
      h[me].sort((a, c) => 'RBGSNLP'.indexOf(a.t) - 'RBGSNLP'.indexOf(c.t));
      out.same = st.last === out.to; out.st = { b, h, turn: you, last: out.to }; return out;
    }
    // the list: Japanese style (▲7六歩, 同, 成, 不成, 打) in the CJK languages; elsewhere western (P-7f, Bx2b+, P*5e, =)
    function label(mv, i, r, lang) {
      const cjk = /^(ja|zh|zh-TW|ko)$/.test(lang), mark = r.side === 's' ? '▲' : '△', [f, rk] = at(r.to);
      if (cjk) return mark + (r.same ? '同' + '　' : ZEN[f] + KN[rk - 1]) + (r.t === 'K' && r.side === 'g' ? '王' : KAN[r.t]) + (r.pr ? '成' : r.could ? '不成' : '') + (r.drop ? '打' : '');
      const L = r.t.replace('+', '+'); return mark + (r.drop ? r.drop + '*' + r.to : L + (r.cap ? 'x' : '-') + r.to + (r.pr ? '+' : r.could ? '=' : ''));
    }
    const pieces = st => Object.entries(st.b).map(([k, p]) => { const [f, r] = k.split(',').map(Number); return { id: p.id, at: f + String.fromCharCode(96 + r), k: p.c + p.t, glyph: p.t === 'K' && p.c === 'g' ? '王' : KAN[p.t], up: p.c === 's', red: p.t[0] === '+' }; });
    return { init, play, label, pieces, cols: 9, rows: 9, sides: ['s', 'g'], first: 's', hands: st => st.h, KAN,
      xy: (s, flip) => { const f = +s[0], r = s.charCodeAt(1) - 97; return flip ? [f - 1, 8 - r] : [9 - f, r]; } };
  })();

  // go: SGF points (aa = the top left), '' or 'tt' = pass. Captures follow the rules (a group with no liberty is taken off).
  const GO = (() => {
    const LET = 'ABCDEFGHJKLMNOPQRST';
    function init(G) { return { n: G.size || 19, s: {}, turn: 'B', id: 0, cap: { B: 0, W: 0 }, back: '' }; }
    const pos = s => Object.keys(s).sort().map(k => k + s[k].c).join('');
    function play(st, mv) {
      const n = st.n, s = Object.assign({}, st.s), me = st.turn, you = me === 'B' ? 'W' : 'B';
      if (!mv || mv === 'tt') return { st: Object.assign({}, st, { turn: you, back: pos(st.s) }), pass: true, side: me, to: null };
      const x = mv.charCodeAt(0) - 97, y = mv.charCodeAt(1) - 97;
      if (x < 0 || y < 0 || x >= n || y >= n || s[mv]) throw new Error('point taken or off the board: ' + mv);
      const id = st.id; s[mv] = { c: me, id };
      const nb = p => { const a = p.charCodeAt(0) - 97, b = p.charCodeAt(1) - 97; return [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]].filter(([u, v]) => u >= 0 && v >= 0 && u < n && v < n).map(([u, v]) => String.fromCharCode(97 + u, 97 + v)); };
      const group = p => { const c = s[p].c, seen = new Set([p]), q = [p]; let lib = 0; const libs = new Set();
        while (q.length) { const a = q.pop(); nb(a).forEach(b => { if (!s[b]) libs.add(b); else if (s[b].c === c && !seen.has(b)) { seen.add(b); q.push(b); } }); } return { g: [...seen], lib: libs.size }; };
      const off = [];
      nb(mv).forEach(b => { if (s[b] && s[b].c === you) { const G = group(b); if (!G.lib) G.g.forEach(p => { if (s[p]) { off.push(s[p].id); delete s[p]; } }); } });
      if (!group(mv).lib) throw new Error('suicide: ' + mv);
      if (off.length === 1 && pos(s) === st.back) throw new Error('ko (retaken at once): ' + mv);   // (2026-11-27 担当C: コウの禁止)
      const cap = Object.assign({}, st.cap); cap[me] += off.length;
      return { st: { n, s, turn: you, id: id + 1, cap, back: pos(st.s) }, to: mv, side: me, off };
    }
    const name = (p, n) => LET[p.charCodeAt(0) - 97] + (n - (p.charCodeAt(1) - 97));
    const label = (mv, i, r, lang, st0) => r.pass ? '—' : name(r.to, st0.n);
    const pieces = st => Object.entries(st.s).map(([p, v]) => ({ id: v.id, at: p, k: v.c }));
    return { init, play, label, pieces, sides: ['B', 'W'], first: 'B', go: true, name,
      xy: (p, flip, n) => { const x = p.charCodeAt(0) - 97, y = p.charCodeAt(1) - 97; return flip ? [n - 1 - x, n - 1 - y] : [x, y]; } };
  })();
  // xiangqi: ICCS (h2e2). Files a…i from Red's left, ranks 0…9 from Red's side; Red (r) at the bottom moves first. Pieces K A E R H C P (WXF letters).
  // play checks each piece's own way (the horse's leg, the elephant's eye and the river, the palace, the cannon's screen, the soldier's
  // sideways step once over the river), that the two generals never face each other on an open file, and that a move does not leave one's own general in check.
  const XIANGQI_CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const XIANGQI = (() => {
    const GL = { r: { K: '帥', A: '仕', E: '相', R: '俥', H: '傌', C: '炮', P: '兵' }, b: { K: '将', A: '士', E: '象', R: '車', H: '馬', C: '砲', P: '卒' } };
    const NAME = {   // the moves' list (Chinese style): simplified (zh) / traditional (zh-TW, ko) / Japanese forms (ja)
      zh: { r: { K: '帅', A: '仕', E: '相', R: '车', H: '马', C: '炮', P: '兵' }, b: { K: '将', A: '士', E: '象', R: '车', H: '马', C: '炮', P: '卒' }, w: ['进', '退', '平', '前', '后', '中'] },
      tw: { r: { K: '帥', A: '仕', E: '相', R: '俥', H: '傌', C: '炮', P: '兵' }, b: { K: '將', A: '士', E: '象', R: '車', H: '馬', C: '砲', P: '卒' }, w: ['進', '退', '平', '前', '後', '中'] },
      ja: { r: { K: '帥', A: '仕', E: '相', R: '俥', H: '傌', C: '炮', P: '兵' }, b: { K: '将', A: '士', E: '象', R: '車', H: '馬', C: '砲', P: '卒' }, w: ['進', '退', '平', '前', '後', '中'] } };
    const CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    const ix = s => { const f = s.charCodeAt(0) - 97, r = s.charCodeAt(1) - 48; if (f < 0 || f > 8 || r < 0 || r > 9 || s.length !== 2) throw new Error('bad square: ' + s); return f + r * 9; };
    const nm = i => 'abcdefghi'[i % 9] + Math.floor(i / 9);
    const opp = c => c === 'r' ? 'b' : 'r';
    function init() { const b = Array(90).fill(null); let id = 0; const put = (f, r, c, t) => { b[f + r * 9] = { id: id++, c, t }; };
      'RHEAKAEHR'.split('').forEach((t, f) => { put(f, 0, 'r', t); put(f, 9, 'b', t); });
      [1, 7].forEach(f => { put(f, 2, 'r', 'C'); put(f, 7, 'b', 'C'); });
      [0, 2, 4, 6, 8].forEach(f => { put(f, 3, 'r', 'P'); put(f, 6, 'b', 'P'); });
      return { b, turn: 'r' }; }
    const palace = (c, f, r) => f >= 3 && f <= 5 && (c === 'r' ? r <= 2 : r >= 7);
    const between = (b, f0, r0, f1, r1) => { let n = 0; const sf = Math.sign(f1 - f0), sr = Math.sign(r1 - r0); let f = f0 + sf, r = r0 + sr; while (f !== f1 || r !== r1) { if (b[f + r * 9]) n++; f += sf; r += sr; } return n; };
    function reach(b, from, to) {   // the piece on from may go to to (or takes there), by its own way of moving
      const p = b[from], q = b[to]; if (!p || from === to || (q && q.c === p.c)) return false;
      const f0 = from % 9, r0 = Math.floor(from / 9), f1 = to % 9, r1 = Math.floor(to / 9), df = f1 - f0, dr = r1 - r0, ad = Math.abs(df), ar = Math.abs(dr), fw = p.c === 'r' ? 1 : -1;
      switch (p.t) {
        case 'K': return ad + ar === 1 && palace(p.c, f1, r1);
        case 'A': return ad === 1 && ar === 1 && palace(p.c, f1, r1);
        case 'E': return ad === 2 && ar === 2 && !b[(f0 + df / 2) + (r0 + dr / 2) * 9] && (p.c === 'r' ? r1 <= 4 : r1 >= 5);
        case 'H': if (!((ad === 1 && ar === 2) || (ad === 2 && ar === 1))) return false;
          return !(ad === 2 ? b[(f0 + df / 2) + r0 * 9] : b[f0 + (r0 + dr / 2) * 9]);   // the leg: the point next to it, on the long side
        case 'R': return (!df || !dr) && between(b, f0, r0, f1, r1) === 0;
        case 'C': return (!df || !dr) && between(b, f0, r0, f1, r1) === (q ? 1 : 0);
        case 'P': { const over = p.c === 'r' ? r0 >= 5 : r0 <= 4; return (dr === fw && !df) || (over && !dr && ad === 1); }
      } return false; }
    const king = (b, c) => b.findIndex(p => p && p.c === c && p.t === 'K');
    const attacked = (b, c) => { const k = king(b, c); return k >= 0 && b.some((p, i) => p && p.c !== c && reach(b, i, k)); };
    const facing = b => { const a = king(b, 'r'), z = king(b, 'b'); return a >= 0 && z >= 0 && a % 9 === z % 9 && between(b, a % 9, Math.floor(a / 9), z % 9, Math.floor(z / 9)) === 0; };
    function play(st, mv) {
      const m = String(mv).toLowerCase().replace('-', ''); if (!/^[a-i]\d[a-i]\d$/.test(m)) throw new Error('bad move: ' + mv);
      const from = ix(m.slice(0, 2)), to = ix(m.slice(2)), b = st.b.slice(), p = b[from], q = b[to];
      if (!p) throw new Error('no piece to move: ' + mv); if (p.c !== st.turn) throw new Error('not this side\'s piece: ' + mv);
      if (!reach(b, from, to)) throw new Error('the piece cannot go there: ' + mv);
      b[to] = p; b[from] = null;
      if (facing(b)) throw new Error('the generals would face each other: ' + mv);
      if (attacked(b, p.c)) throw new Error('leaves the general in check: ' + mv);
      // for the list: same pieces on the same file (前・後), counted from the front as the mover sees it
      const f0 = from % 9, fw = p.c === 'r' ? 1 : -1, same = [];
      st.b.forEach((x, i) => { if (x && x.c === p.c && x.t === p.t && i % 9 === f0) same.push(Math.floor(i / 9)); });
      same.sort((a, c) => (c - a) * fw);
      return { st: { b, turn: opp(st.turn) }, from: nm(from), to: nm(to), side: p.c, t: p.t, cap: q ? { id: q.id } : null, chk: attacked(b, opp(p.c)),
        tn: 'RHCP'.includes(p.t) ? same.length : 1, ti: same.indexOf(Math.floor(from / 9)) };
    }
    // the list: Chinese style in ja / zh / zh-TW / ko (炮二平五, 马8进7, 前炮进一); WXF elsewhere (C2=5, H8+7, +C+1)
    function label(mv, i, r, lang) {
      const red = r.side === 'r', f0 = r.from.charCodeAt(0) - 97, f1 = r.to.charCodeAt(0) - 97, r0 = +r.from[1], r1 = +r.to[1];
      const file = f => red ? 9 - f : f + 1, dr = (r1 - r0) * (red ? 1 : -1), straight = 'KRCP'.includes(r.t);
      const act = dr > 0 ? 0 : dr < 0 ? 1 : 2, dest = act === 2 || !straight ? file(f1) : Math.abs(dr);
      const N = lang === 'zh' ? NAME.zh : lang === 'ja' ? NAME.ja : /^(zh-TW|ko)$/.test(lang) ? NAME.tw : null;
      if (N) { const num = n => red ? CN[n] : String(n), pc = N[r.side][r.t];
        let head = pc + num(file(f0));
        if (r.tn === 2) head = N.w[r.ti ? 4 : 3] + pc; else if (r.tn === 3) head = N.w[[3, 5, 4][r.ti]] + pc; else if (r.tn > 3) head = num(r.ti + 1) + pc;
        return head + N.w[act] + num(dest); }
      const L = r.t; let head = L + file(f0);
      if (r.tn === 2) head = (r.ti ? '-' : '+') + L; else if (r.tn > 2) head = (r.ti + 1) + L;
      return head + ['+', '-', '='][act] + dest;
    }
    const pieces = st => st.b.map((p, i) => p && { id: p.id, at: nm(i), k: p.c + p.t, glyph: GL[p.c][p.t], red: p.c === 'r' }).filter(Boolean);
    return { init, play, label, pieces, cols: 9, rows: 10, sides: ['r', 'b'], first: 'r', pair: true, pt: true, GL,
      xy: (s, flip) => { const f = s.charCodeAt(0) - 97, r = +s[1]; return flip ? [8 - f, r] : [f, 9 - r]; } };
  })();
  // reversi (2026-11-27): 8 × 8, squares a1…h8 as the records write them (files a…h from the left, ranks 1…8 from the top); Black moves first,
  // d5 e4 black and d4 e5 white at the start. play flips every line the move flanks (throws on a move that flanks nothing or a taken square);
  // '-' is a pass, allowed only when the side has no move (and the other side has one). A disc keeps its id while it turns over.
  const REVERSI = (() => {
    const DIR = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    const ix = s => { const f = s.charCodeAt(0) - 97, r = s.charCodeAt(1) - 49; if (s.length !== 2 || f < 0 || f > 7 || r < 0 || r > 7) throw new Error('bad square: ' + s); return f + r * 8; };
    const nm = i => 'abcdefgh'[i & 7] + ((i >> 3) + 1), opp = c => c === 'b' ? 'w' : 'b';
    function init() { const b = Array(64).fill(null); let id = 0; [['d5', 'b'], ['e4', 'b'], ['d4', 'w'], ['e5', 'w']].forEach(([s, c]) => { b[ix(s)] = { id: id++, c }; }); return { b, turn: 'b', id, n: { b: 2, w: 2 } }; }
    function flips(b, i, c) { if (b[i]) return []; const out = [], f0 = i & 7, r0 = i >> 3;
      DIR.forEach(([df, dr]) => { const run = []; let f = f0 + df, r = r0 + dr; const on = () => f >= 0 && f < 8 && r >= 0 && r < 8;
        while (on() && b[f + r * 8] && b[f + r * 8].c !== c) { run.push(f + r * 8); f += df; r += dr; }
        if (run.length && on() && b[f + r * 8] && b[f + r * 8].c === c) out.push(...run); });
      return out; }
    const canMove = (b, c) => b.some((x, i) => !x && flips(b, i, c).length > 0);
    function play(st, mv) {
      const me = st.turn;
      if (mv === '-' || mv === '' || mv === 'pass') {
        if (canMove(st.b, me)) throw new Error('a pass, but there is a move to play');
        if (!canMove(st.b, opp(me))) throw new Error('a pass after the game is over');
        return { st: Object.assign({}, st, { turn: opp(me) }), pass: true, side: me, to: null, flips: [] }; }
      const i = ix(String(mv).toLowerCase()); if (st.b[i]) throw new Error('square taken: ' + mv);
      const fl = flips(st.b, i, me); if (!fl.length) throw new Error('flips nothing: ' + mv);
      const b = st.b.slice(); b[i] = { id: st.id, c: me }; fl.forEach(j => { b[j] = { id: b[j].id, c: me }; });
      const n = { b: 0, w: 0 }; b.forEach(x => { if (x) n[x.c]++; });
      return { st: { b, turn: opp(me), id: st.id + 1, n }, to: nm(i), side: me, flips: fl.map(nm) }; }
    const over = st => !canMove(st.b, 'b') && !canMove(st.b, 'w');
    const label = (mv, i, r) => r.pass ? u('pass') : r.to;
    const pieces = st => st.b.map((x, i) => x && { id: x.id, at: nm(i), k: 'd', c: x.c }).filter(Boolean);
    return { init, play, label, pieces, over, cols: 8, rows: 8, sides: ['b', 'w'], first: 'b', disc: true,
      xy: (s, flip) => { const f = s.charCodeAt(0) - 97, r = s.charCodeAt(1) - 49; return flip ? [7 - f, 7 - r] : [f, r]; } };
  })();
  // checkers (English draughts / American checkers, as the site's checkers/): PDN numbers 1…32 on the dark squares. Black (b) moves first
  // and starts on 1…12 at the top (the usual diagram: White at the bottom, 1 in the top row from White's left); a man steps forward,
  // a king either way; taking is a must, a jump goes on to the end, and a man that reaches the far row is crowned there (its move ends).
  // Moves as written: 11-15, 22x15, 18x11x2 (each landing square), or the start and end alone (22x8) when only one way of jumping fits.
  const CHECKERS = (() => {
    const rc = n => { n = +n; if (!(n >= 1 && n <= 32) || n !== Math.floor(n)) throw new Error('bad square: ' + n); const r = (n - 1) >> 2, k = (n - 1) & 3; return [r, r % 2 ? 2 * k : 2 * k + 1]; };
    const num = (r, c) => r < 0 || r > 7 || c < 0 || c > 7 || (r + c) % 2 === 0 ? 0 : r * 4 + (c >> 1) + 1;
    const opp = c => c === 'b' ? 'w' : 'b';
    function init() { const b = {}; let id = 0; for (let n = 1; n <= 12; n++) b[n] = { id: id++, c: 'b', k: false }; for (let n = 21; n <= 32; n++) b[n] = { id: id++, c: 'w', k: false }; return { b, turn: 'b', cap: { b: 0, w: 0 } }; }
    const dirs = p => p.k ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : p.c === 'b' ? [[1, 1], [1, -1]] : [[-1, 1], [-1, -1]];
    const lastRow = (p, n) => (p.c === 'b' && n >= 29) || (p.c === 'w' && n <= 4);
    // every full jump from n by the piece p on board b: [[landing…], [taken…]]; a crowned man stops
    function jumps(b, n, p, gone) { const [r, c] = rc(n), out = [];
      dirs(p).forEach(([dr, dc]) => { const over = num(r + dr, c + dc), to = num(r + 2 * dr, c + 2 * dc);
        if (!over || !to || !b[over] || b[over].c === p.c || gone.includes(over) || (b[to] && to !== p.home)) return;
        const g = gone.concat(over);
        if (!p.k && lastRow(p, to)) { out.push([[to], g]); return; }
        const more = jumps(b, to, p, g); if (more.length) more.forEach(([l, t]) => out.push([[to].concat(l), t])); else out.push([[to], g]); });
      return out; }
    const allJumps = st => { const o = []; Object.keys(st.b).forEach(n => { const p = st.b[n]; if (p.c === st.turn) jumps(st.b, +n, Object.assign({ home: +n }, p), []).forEach(j => o.push([+n].concat(j))); }); return o; };
    function play(st, mv) {
      const m = String(mv).trim(), cap = m.includes('x'), sq = m.split(/[-x]/).map(Number);
      if (!/^\d{1,2}([-x]\d{1,2})+$/.test(m) || (!cap && sq.length !== 2)) throw new Error('bad move: ' + mv);
      sq.forEach(rc); const from = sq[0], p = st.b[from];
      if (!p) throw new Error('no piece to move: ' + mv); if (p.c !== st.turn) throw new Error('not this side\'s piece: ' + mv);
      const must = allJumps(st), b = Object.assign({}, st.b); let land, taken = [];
      if (!cap) { if (must.length) throw new Error('a capture is a must here: ' + mv);
        const [r0, c0] = rc(from), [r1, c1] = rc(sq[1]);
        if (!dirs(p).some(([dr, dc]) => r0 + dr === r1 && c0 + dc === c1) || b[sq[1]]) throw new Error('the piece cannot go there: ' + mv);
        land = [sq[1]];
      } else {
        const fit = must.filter(([f, l]) => f === from && (sq.length > 2 ? l.join() === sq.slice(1).join() : l[l.length - 1] === sq[1]));
        if (!fit.length) throw new Error((must.some(j => j[0] === from) ? 'the jump is not complete or not possible: ' : 'no such jump: ') + mv);
        if (fit.length > 1 && new Set(fit.map(j => j[2].slice().sort().join())).size > 1) throw new Error('ambiguous jump (write each landing): ' + mv);
        land = fit[0][1]; taken = fit[0][2];
      }
      const to = land[land.length - 1], crown = !p.k && lastRow(p, to), capd = taken.map(t => ({ id: b[t].id, at: String(t) }));
      taken.forEach(t => delete b[t]); delete b[from]; b[to] = { id: p.id, c: p.c, k: p.k || crown };
      const c2 = Object.assign({}, st.cap); c2[p.c] += taken.length;
      return { st: { b, turn: opp(st.turn), cap: c2 }, from: String(from), to: String(to), path: [from].concat(land).map(String), side: p.c, cap: capd.length ? capd[0] : null, caps: capd, crown };
    }
    const label = mv => String(mv);
    const pieces = st => Object.keys(st.b).map(n => { const p = st.b[n]; return { id: p.id, at: n, k: p.c + (p.k ? 'k' : 'm'), king: p.k }; });
    return { init, play, label, pieces, cols: 8, rows: 8, sides: ['b', 'w'], first: 'b', pair: true, up: true, num, rc,
      xy: (s, flip) => { const [r, c] = rc(s); return flip ? [7 - c, 7 - r] : [c, r]; } };
  })();
  const CROWN = '<path d="M3 18 4.5 7l5 4.5L12 5l2.5 6.5 5-4.5L21 18z" class="mxcr"/><path d="M3.5 20.5h17" class="mxcb"/>';
  const KINDS = { chess: CHESS, shogi: SHOGI, go: GO, xiangqi: XIANGQI, reversi: REVERSI, checkers: CHECKERS };

  // every position of a game, worked out once (the record → states[0…n]; recs[i] = what move i did)
  const cache = {};
  function line(G) {
    if (cache[G.id]) return cache[G.id];
    const K = KINDS[G.kind], mv = Array.isArray(G.moves) ? G.moves : G.moves.trim().split(/\s+/);
    const st = [K.init(G)], recs = [];
    mv.forEach((m, i) => { let r; try { r = K.play(st[i], G.kind === 'go' && m === '-' ? '' : m); } catch (e) { e.message = `move ${i + 1} (${m}): ` + e.message; throw e; } recs.push(r); st.push(r.st); });
    return (cache[G.id] = { K, mv, st, recs });
  }

  /* ---------- the room ---------- */
  const T = () => window.MUSEUM_MATCH_T || {};
  let host = null, ctx = null, lang = 'ja', el = {}, kind = (() => { try { return localStorage.getItem('atlas-match-kind') || 'all'; } catch (e) { return 'all'; } })();
  let cur = null, ply = 0, timer = null;
  const tx = () => T()[lang] || T().en || {};
  const u = k => (tx().ui && tx().ui[k]) || ((T().en || {}).ui || {})[k] || k;
  const gt = id => Object.assign({}, (T().en || {})[id] || {}, tx()[id] || {});
  const note = (id, i) => { const a = (tx()[id] || {}).c, b = ((T().en || {})[id] || {}).c; return (a && a[i] != null ? a[i] : b && b[i] != null ? b[i] : null); };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MK = (ids, n) => { if (window.AtlasMuseum && AtlasMuseum.mark) AtlasMuseum.mark('match', ids, n); };
  const IC = {
    start: '<path d="M7 5v14M18 6l-8 6 8 6z"/>', prev: '<path d="M15 6l-6 6 6 6"/>', next: '<path d="M9 6l6 6-6 6"/>', end: '<path d="M17 5v14M6 6l8 6-8 6z"/>',
    play: '<path d="M8 5.5v13l11-6.5z"/>', pause: '<path d="M8 5.5v13M16 5.5v13"/>', back: '<path d="M15 6l-6 6 6 6"/>', note: '<path d="M5 12h12M13 7l5 5-5 5"/>' };
  const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${IC[k]}</svg>`;

  /* the board: one SVG (lines, squares, marks) under a layer of pieces that slide (each piece keeps its element from move to move) */
  const PIMG = '../chess/pieces/cburnett/';
  function geom(G, K) {   // in board units: the playing area starts at (ox, oy); one cell = 1
    if (K.go) { const n = G.size || 19; return { W: n + 1, H: n + 1, ox: 1, oy: 1, n, cell: 1, pt: true }; }
    if (K === SHOGI) return { W: 10.7, H: 9.9, ox: 0.85, oy: 0.45, cell: 1 };   // (2026-11-27 ユーザー: 盤が右寄り — the same margin left and right)
    if (K === XIANGQI) return { W: 9.7, H: 10.9, ox: 0.85, oy: 0.95, cell: 1, pt: true };
    if (K === REVERSI) return { W: 9.2, H: 8.7, ox: 0.6, oy: 0.6, cell: 1 };   // (the letters along the top, the numbers on the left, as the records count)
    if (K === CHECKERS) return { W: 8.5, H: 8.5, ox: 0.25, oy: 0.25, cell: 1 };   // (the numbers 1…32 sit in the dark squares, so no letters round the edge)
    return { W: 9.2, H: 8.7, ox: 0.6, oy: 0.1, cell: 1 };   // (left: the ranks; right: the same width empty, so the squares stand in the middle)
  }
  function boardSVG(G, K, g, flip) {
    const P = [];
    if (K.go) {
      const n = g.n; P.push(`<rect x="0" y="0" width="${g.W}" height="${g.H}" rx=".3" class="mxwood"/>`);
      for (let i = 0; i < n; i++) { P.push(`<line x1="1" y1="${1 + i}" x2="${n}" y2="${1 + i}"/><line x1="${1 + i}" y1="1" x2="${1 + i}" y2="${n}"/>`); }
      const hs = n === 19 ? [3, 9, 15] : n === 13 ? [3, 6, 9] : [2, 4, 6]; hs.forEach(a => hs.forEach(b => { if (n !== 9 || (a + b) % 4 === 0 || (a === 4 && b === 4)) P.push(`<circle cx="${1 + a}" cy="${1 + b}" r=".12" class="mxhoshi"/>`); }));
      for (let i = 0; i < n; i++) { const c = 'ABCDEFGHJKLMNOPQRST'[flip ? n - 1 - i : i], r = flip ? i + 1 : n - i;   // the coordinates the moves' list uses (D4, Q16)
        P.push(`<text x="${(1 + i) * 100}" y="${45}" class="mxgc" transform="scale(.01)">${c}</text><text x="${(1 + i) * 100}" y="${(n + .72) * 100}" class="mxgc" transform="scale(.01)">${c}</text><text x="${48}" y="${(1 + i + .15) * 100}" class="mxgc" transform="scale(.01)">${r}</text><text x="${(n + .52) * 100}" y="${(1 + i + .15) * 100}" class="mxgc" transform="scale(.01)">${r}</text>`); }
      return `<g class="mxgo">${P.join('')}</g>`;
    }
    if (K === SHOGI) {
      P.push(`<rect x="0" y="0" width="${g.W}" height="${g.H}" rx=".2" class="mxwood"/>`);
      for (let i = 0; i <= 9; i++) P.push(`<line x1="${g.ox}" y1="${g.oy + i}" x2="${g.ox + 9}" y2="${g.oy + i}"/><line x1="${g.ox + i}" y1="${g.oy}" x2="${g.ox + i}" y2="${g.oy + 9}"/>`);
      [[3, 3], [6, 3], [3, 6], [6, 6]].forEach(([a, b]) => P.push(`<circle cx="${g.ox + a}" cy="${g.oy + b}" r=".07" class="mxhoshi"/>`));
      for (let i = 0; i < 9; i++) { P.push(`<text x="${(g.ox + i + .5) * 100}" y="${(g.oy - .1) * 100}" class="mxcoord" transform="scale(.01)">${flip ? i + 1 : 9 - i}</text><text x="${(g.ox + 9.62) * 100}" y="${(g.oy + i + .62) * 100}" class="mxcoord" transform="scale(.01)">${'一二三四五六七八九'[flip ? 8 - i : i]}</text>`); }
      return `<g class="mxsh">${P.join('')}</g>`;
    }
    if (K === XIANGQI) {   // 9 × 10 points, the river (楚河 漢界) across the middle, the palaces with their diagonals, the marks where cannons and soldiers start
      const X = x => g.ox + x, Y = y => g.oy + y;
      P.push(`<rect x="0" y="0" width="${g.W}" height="${g.H}" rx=".3" class="mxwood"/><rect x="${X(-.22)}" y="${Y(-.22)}" width="8.44" height="9.44" class="mxxf"/>`);
      for (let y = 0; y < 10; y++) P.push(`<line x1="${X(0)}" y1="${Y(y)}" x2="${X(8)}" y2="${Y(y)}"/>`);
      for (let x = 0; x < 9; x++) P.push(x === 0 || x === 8 ? `<line x1="${X(x)}" y1="${Y(0)}" x2="${X(x)}" y2="${Y(9)}"/>` : `<line x1="${X(x)}" y1="${Y(0)}" x2="${X(x)}" y2="${Y(4)}"/><line x1="${X(x)}" y1="${Y(5)}" x2="${X(x)}" y2="${Y(9)}"/>`);
      [0, 7].forEach(y => P.push(`<line x1="${X(3)}" y1="${Y(y)}" x2="${X(5)}" y2="${Y(y + 2)}"/><line x1="${X(5)}" y1="${Y(y)}" x2="${X(3)}" y2="${Y(y + 2)}"/>`));
      const cross = (x, y) => { const d = .1, l = .22; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => { if ((x === 0 && sx < 0) || (x === 8 && sx > 0)) return;
        const a = X(x) + sx * d, b = Y(y) + sy * d; P.push(`<path class="mxxm" d="M${a + sx * l} ${b}H${a}V${b + sy * l}"/>`); }); };
      [[1, 2], [7, 2], [1, 7], [7, 7]].forEach(([x, y]) => cross(x, y)); [0, 2, 4, 6, 8].forEach(x => { cross(x, 3); cross(x, 6); });
      const rv = flip ? ['漢', '界', '楚', '河'] : ['楚', '河', '漢', '界'];
      [1.55, 2.55, 5.45, 6.45].forEach((x, i) => P.push(`<text x="${X(x) * 100}" y="${(Y(4.5) + .21) * 100}" class="mxxr" transform="scale(.01)">${rv[i]}</text>`));
      // the files: Black counts 1…9 from its right, Red 一…九 (9…1 outside the CJK languages) from its right
      const cjk = /^(ja|zh|zh-TW|ko)$/.test(lang);
      for (let i = 0; i < 9; i++) { const f = flip ? 8 - i : i, rn = 9 - f, bn = f + 1, rl = cjk ? XIANGQI_CN[rn] : rn, top = flip ? rl : bn, bot = flip ? bn : rl;
        P.push(`<text x="${X(i) * 100}" y="${(g.oy - .42) * 100}" class="mxcoord" transform="scale(.01)">${top}</text><text x="${X(i) * 100}" y="${(Y(9) + .68) * 100}" class="mxcoord" transform="scale(.01)">${bot}</text>`); }
      return `<g class="mxxq">${P.join('')}</g>`;
    }
    if (K === REVERSI) {   // the site's reversi board: green felt in a dark frame, black grid lines, the four dots at the c3 / f3 / c6 / f6 corners
      const X = g.ox, Y = g.oy;
      P.push(`<rect x="${X - .16}" y="${Y - .16}" width="8.32" height="8.32" rx=".14" class="mxrvfr"/><rect x="${X}" y="${Y}" width="8" height="8" class="mxrvf"/>`);
      for (let i = 1; i < 8; i++) P.push(`<line x1="${X}" y1="${Y + i}" x2="${X + 8}" y2="${Y + i}"/><line x1="${X + i}" y1="${Y}" x2="${X + i}" y2="${Y + 8}"/>`);
      [[2, 2], [6, 2], [2, 6], [6, 6]].forEach(([a, b]) => P.push(`<circle cx="${X + a}" cy="${Y + b}" r=".07" class="mxrvd"/>`));
      for (let i = 0; i < 8; i++) P.push(`<text x="${(X + i + .5) * 100}" y="${(Y - .24) * 100}" class="mxcoord" transform="scale(.01)">${'abcdefgh'[flip ? 7 - i : i]}</text><text x="${(X - .32) * 100}" y="${(Y + i + .62) * 100}" class="mxcoord" transform="scale(.01)">${flip ? 8 - i : i + 1}</text>`);
      return `<g class="mxrv">${P.join('')}</g>`;
    }
    if (K === CHECKERS) {   // (2026-11-27 名局選：チェッカー) the site's checkers: a wine-red frame with a brass line, ivory and green squares, the PDN numbers in the dark ones
      P.push(`<rect x="0" y="0" width="${g.W}" height="${g.H}" rx=".22" class="mxckf"/><rect x="${g.ox - .05}" y="${g.oy - .05}" width="8.1" height="8.1" class="mxckr"/>`);
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const dk = (r + c) % 2 === 1; P.push(`<rect x="${g.ox + c}" y="${g.oy + r}" width="1" height="1" class="${dk ? 'mxckd' : 'mxckl'}"/>`);
        if (dk) { const n = flip ? K.num(7 - r, 7 - c) : K.num(r, c); P.push(`<text x="${(g.ox + c + .07) * 100}" y="${(g.oy + r + .23) * 100}" class="mxckn" transform="scale(.01)">${n}</text>`); } }
      return `<g class="mxck">${P.join('')}</g>`;
    }
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) P.push(`<rect x="${g.ox + f}" y="${g.oy + r}" width="1" height="1" class="${(r + f) % 2 ? 'mxdk' : 'mxlt'}"/>`);
    for (let i = 0; i < 8; i++) { P.push(`<text x="${(g.ox + i + .5) * 100}" y="${(g.oy + 8.45) * 100}" class="mxcoord" transform="scale(.01)">${'abcdefgh'[flip ? 7 - i : i]}</text><text x="${(g.ox - .3) * 100}" y="${(g.oy + i + .62) * 100}" class="mxcoord" transform="scale(.01)">${flip ? i + 1 : 8 - i}</text>`); }
    return `<g class="mxch">${P.join('')}</g>`;
  }
  function pieceHTML(K, p, g) {
    if (K.go) return `<span class="mxst ${p.k === 'B' ? 'b' : 'w'}"></span>`;
    if (K === REVERSI) return `<span class="mxrd${p.c === 'w' ? ' w' : ''}"><span class="mxrf b"></span><span class="mxrf w"></span></span>`;   // two faces; turning over = rotating the one element
    if (K === XIANGQI) return `<span class="mxxp${p.red ? ' r' : ''}"><b>${p.glyph}</b></span>`;
    if (K === CHECKERS) return `<span class="mxcm ${p.k[0]}${p.king ? ' k' : ''}">${p.king ? `<svg viewBox="0 0 24 24" aria-hidden="true">${CROWN}</svg>` : ''}</span>`;
    if (K === SHOGI) return `<span class="mxsg${p.up ? '' : ' dn'}${p.red ? ' pr' : ''}"><svg viewBox="0 0 100 110" aria-hidden="true"><path d="M50 4 82 18 94 106H6L18 18z"/></svg><b>${p.glyph}</b></span>`;
    return `<img src="${PIMG}${p.k}.svg" alt="" draggable="false">`;
  }
  // where a point sits, as % of the board's box
  function spot(G, K, g, at, flip) { const [x, y] = K.xy(at, flip, g.n); return K.go || K.pt ? [(g.ox + x) / g.W * 100, (g.oy + y) / g.H * 100] : [(g.ox + x + .5) / g.W * 100, (g.oy + y + .5) / g.H * 100]; }
  function draw(anim) {
    const G = cur, L = line(G), K = L.K, g = geom(G, K), st = L.st[ply], r = ply ? L.recs[ply - 1] : null, flip = G.orient === 'b' || G.orient === 'g';
    const box = el.board;
    if (box._g !== G.id) { box._g = G.id; box.innerHTML = `<svg class="mxbg" viewBox="0 0 ${g.W} ${g.H}" aria-hidden="true">${boardSVG(G, K, g, flip)}<g class="mxmk"></g></svg><div class="mxpcs"></div>`;
      box.style.aspectRatio = `${g.W} / ${g.H}`; box._el = {}; box.classList.toggle('go', !!K.go); box.classList.toggle('sh', K === SHOGI); box.classList.toggle('ch', K === CHESS); box.classList.toggle('xq', K === XIANGQI); box.classList.toggle('mxrvb', K === REVERSI); box.classList.toggle('ck', K === CHECKERS); }
    box.classList.toggle('still', !anim);
    const sz = (K.go ? 1 : 1) / g.W * 100, szh = 1 / g.H * 100;
    const lay = box.querySelector('.mxpcs'), seen = new Set();
    K.pieces(st).forEach(p => { seen.add(p.id); let e = box._el[p.id];
      if (!e) { e = document.createElement('i'); e.className = 'mxp'; lay.appendChild(e); box._el[p.id] = e; e._k = ''; e.classList.add('new'); requestAnimationFrame(() => requestAnimationFrame(() => e.classList.remove('new'))); }
      if (e._k !== p.k + (p.glyph || '') + (p.up ? 1 : 0)) { e._k = p.k + (p.glyph || '') + (p.up ? 1 : 0); e.innerHTML = pieceHTML(K, p, g); }
      const [x, y] = spot(G, K, g, p.at, flip); e.style.left = x + '%'; e.style.top = y + '%'; e.style.width = sz + '%'; e.style.height = szh + '%';
      if (K.disc) { const d = e.firstChild, w = p.c === 'w';   // (reversi) a disc that changes colour turns over where it lies; the ones nearer the new disc first
        if (d.classList.contains('w') !== w) { const f = r && anim && r.to ? Math.max(...[0, 1].map(j => Math.abs(p.at.charCodeAt(j) - r.to.charCodeAt(j)))) : 0; d.style.transitionDelay = f ? (f - 1) * 55 + 'ms' : '0ms'; d.classList.toggle('w', w); } }
      e.classList.toggle('last', !!((K.go || K.disc) && r && r.to === p.at)); });
    Object.keys(box._el).forEach(id => { if (!seen.has(+id)) { const e = box._el[id]; delete box._el[id]; e.classList.add('gone'); setTimeout(() => e.remove(), anim ? 260 : 0); } });
    // the marks: the last move's squares, then what the note points at (arrows, squares)
    const mk = box.querySelector('.mxmk'), M = (G.mk || {})[ply] || {}, out = [];
    const c = at => { const [x, y] = K.xy(at, flip, g.n); return K.go || K.pt ? [g.ox + x, g.oy + y] : [g.ox + x + .5, g.oy + y + .5]; };
    const sqr = (at, cls) => { const [x, y] = c(at); out.push(K.pt ? `<circle cx="${x}" cy="${y}" r=".5" class="${cls}${cls === 'mxlm' ? ' ring' : ''}"/>` : `<rect x="${x - .5}" y="${y - .5}" width="1" height="1" class="${cls}"/>`); };
    if (r && !K.go && !K.disc) { if (r.from) sqr(r.from, 'mxlm'); if (r.to) sqr(r.to, 'mxlm'); }
    (M.s || []).forEach(a => K.go ? (() => { const [x, y] = c(a); out.push(`<circle cx="${x}" cy="${y}" r=".42" class="mxsq"/>`); })() : sqr(a, 'mxsq'));
    (M.a || []).forEach(([a, b]) => { const [x1, y1] = c(a), [x2, y2] = c(b), d = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / d, uy = (y2 - y1) / d, ex = x2 - ux * .38, ey = y2 - uy * .38;
      out.push(`<path class="mxar" d="M${(x1 + ux * .3).toFixed(2)} ${(y1 + uy * .3).toFixed(2)}L${ex.toFixed(2)} ${ey.toFixed(2)}"/><path class="mxah" d="M${(x2 - ux * .12).toFixed(2)} ${(y2 - uy * .12).toFixed(2)}L${(ex - uy * .26).toFixed(2)} ${(ey + ux * .26).toFixed(2)}L${(ex + uy * .26).toFixed(2)} ${(ey - ux * .26).toFixed(2)}z"/>`); });
    mk.innerHTML = out.join('');
  }

  /* ---------- the wall ---------- */
  function thumb(G) {   // the last position, small (a picture of the board, no sliding)
    const L = line(G), K = L.K, g = geom(G, K), st = L.st[L.st.length - 1], flip = G.orient === 'b' || G.orient === 'g', P = [];
    K.pieces(st).forEach(p => { const [x, y] = K.xy(p.at, flip, g.n), pt = K.go || K.pt, cx = pt ? g.ox + x : g.ox + x + .5, cy = pt ? g.oy + y : g.oy + y + .5;
      if (K.go) P.push(`<circle cx="${cx}" cy="${cy}" r=".47" class="${p.k === 'B' ? 'mxtb' : 'mxtw'}"/>`);
      else if (K.disc) P.push(`<circle cx="${cx}" cy="${cy}" r=".4" class="${p.c === 'b' ? 'mxtb' : 'mxtw'}"/>`);
      else if (K === XIANGQI) P.push(`<g transform="translate(${cx} ${cy})"><circle r=".45" class="mxxt${p.red ? ' r' : ''}"/><text y="19" transform="scale(.01)" class="mxxg${p.red ? ' r' : ''}">${p.glyph}</text></g>`);
      else if (K === CHECKERS) P.push(`<g transform="translate(${cx} ${cy})"><circle r=".4" class="mxct ${p.k[0]}"/>${p.king ? `<g transform="translate(-.25 -.26) scale(.021)">${CROWN}</g>` : ''}</g>`);
      else if (K === SHOGI) P.push(`<g transform="translate(${cx} ${cy})${p.up ? '' : ' rotate(180)'}"><path d="M0 -.44 .32 -.3 .4 .42H-.4L-.32 -.3z" class="mxtk"/><text y="20" transform="scale(.01)" class="mxtg${p.red ? ' pr' : ''}">${p.glyph}</text></g>`);
      else P.push(`<image href="${PIMG}${p.k}.svg" x="${cx - .5}" y="${cy - .5}" width="1" height="1"/>`); });
    // (2026-11-27 ユーザー: 一覧の画像はどのゲームでも同じ大きさ、盤を大きく、数字は省いてよい) the playing area only, no letters or numbers
    const n = g.n || 0, box = K.go ? [.45, .45, n + .1, n + .1] : K === SHOGI ? [g.ox - .2, g.oy - .2, 9.4, 9.4] : K === XIANGQI ? [g.ox - .62, g.oy - .62, 9.24, 10.24] : K === CHECKERS ? [g.ox - .12, g.oy - .12, 8.24, 8.24] : K.disc ? [g.ox - .16, g.oy - .16, 8.32, 8.32] : [g.ox, g.oy, 8, 8];
    return `<svg viewBox="${box.map(v => +v.toFixed(2)).join(' ')}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${boardSVG(G, K, g, flip).replace(/<text[^>]*>[^<]*<\/text>/g, '')}${P.join('')}</svg>`;
  }
  function wall() {
    stop(); cur = null; host.querySelector('.mxx').classList.remove('on');
    el.wall.hidden = false; el.view.hidden = true;
    const kinds = ['all', ...Object.keys(KINDS).filter(k => GAMES.some(G => G.kind === k))];
    if (!kinds.includes(kind)) kind = 'all';
    el.chips.innerHTML = kinds.length > 2 ? kinds.map(k => `<button type="button" class="chip cat" data-k="${k}" aria-pressed="${k === kind}">${esc(u(k === 'all' ? 'all' : 'k_' + k))}<em>${k === 'all' ? GAMES.length : GAMES.filter(G => G.kind === k).length}</em></button>`).join('') : '';
    el.chips.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { kind = b.dataset.k; try { localStorage.setItem('atlas-match-kind', kind); } catch (e) {} wall(); const c = el.chips.querySelector(`[data-k="${kind}"]`); if (c) c.focus(); });
    el.grid.innerHTML = GAMES.filter(G => kind === 'all' || G.kind === kind).map(G => { const x = gt(G.id);
      return `<button type="button" class="mxc" data-g="${G.id}"><span class="mxth k-${G.kind}">${thumb(G)}</span><span class="mxcl"><i>${esc(u('k_' + G.kind))}</i><b>${esc(x.t)}</b><small>${esc(x.w)} — ${esc(x.b)}</small><small>${esc(x.d)} · ${esc(x.pl)}</small></span></button>`; }).join('');
    el.grid.querySelectorAll('[data-g]').forEach(b => b.onclick = () => show(b.dataset.g, true));
    // (2026-11-27 ユーザー: 12を超えたら次のページ — 他の部屋と同じ) the museum's own pager: search box + the kinds' chips in one bar, 12 a page at every width
    if (window.AtlasMuseum && AtlasMuseum.pager) AtlasMuseum.pager(el.grid, 'match' + (kind === 'all' ? '' : '-' + kind), { per: 12, extra: el.chips });
    el.lead.textContent = u('lead'); el.credit.textContent = u('credit');
    if (window.AtlasMuseum && AtlasMuseum.catalog) AtlasMuseum.catalog('match', GAMES.map(G => ({ id: G.id, t: gt(G.id).t })));
    MK(null, GAMES.length);
  }

  /* ---------- a game (2026-11-27 ユーザー: レイアウトとデザインを徹底的に見直し — 評価: tools/museum-match-layout.js) ----------
     The view: a short head (kind · year · place, the title, the result) → the stage (the board between the two players' plates — whose
     move it is lights up; what each side has taken or holds — and under it the steps, a slider through the whole game and the move number)
     beside the side column (ミュゼフク's note card for the move on the board, with the previous / next note, then the moves' list, as tall
     as the stage) → the game's story and record. Phone: one column; the moves' list is a strip that scrolls sideways. */
  const plateOf = (G, L, st, side) => {   // what a side has to show on its plate
    const K = L.K;
    if (K.disc) return `<span class="mxcap mxrc">${esc(u('discs').replace('{n}', st.n[side]))}</span>`;   // (reversi) the discs each side has now
    if (K.go) return st.cap[side] ? `<span class="mxcap"><u class="mxdot ${side === 'B' ? 'W' : 'B'}"></u>${esc(u('caps'))} ${st.cap[side]}</span>` : '';
    if (K === SHOGI) { const c = {}; K.hands(st)[side].forEach(x => c[x.t] = (c[x.t] || 0) + 1); const e = Object.entries(c);
      return e.length ? `<span class="mxcap"><em>${esc(u('hand'))}</em>${e.map(([t, n]) => `<span class="mxhk">${K.KAN[t]}${n > 1 ? `<sub>${n}</sub>` : ''}</span>`).join('')}</span>` : ''; }
    if (K === CHECKERS) return st.cap[side] ? `<span class="mxcap"><u class="mxdot ${side === 'b' ? 'w' : 'b'}"></u>${esc(u('taken'))} ${st.cap[side]}</span>` : '';
    // chess, xiangqi: the other side's pieces this side has taken
    const now = new Set(K.pieces(st).map(p => p.id)), gone = K.pieces(L.st[0]).filter(p => !now.has(p.id) && p.k[0] !== side[0]);
    if (!gone.length) return '';
    return `<span class="mxcap">${gone.map(p => K === CHESS ? `<img src="${PIMG}${p.k}.svg" alt="">` : `<span class="mxxk${p.red ? ' r' : ''}">${p.glyph || ''}</span>`).join('')}</span>`;
  };
  // the evaluations (tools/museum-match-eval.js → museum/match-eval.js): loaded the first time a game opens
  let EV = window.MATCH_EVAL || null, evP = null;
  function evalOf() { if (EV) return Promise.resolve(EV); return evP || (evP = new Promise(res => { const sc = document.createElement('script'); sc.src = 'museum/match-eval.js?v=' + EVAL_V; sc.onload = () => res(EV = window.MATCH_EVAL || {}); sc.onerror = () => res(EV = {}); document.head.appendChild(sc); })); }
  // the graph behind the slider: the first side's chance over the game (light above, dark below); 50% the middle line
  function graph(G, E) { const e = E[G.id], svgE = el.graph; if (!svgE) return; el.graph.parentNode.classList.toggle('on', !!e); if (!e) { svgE.innerHTML = ''; return; }
    const n = e.w.length - 1 || 1, pts = e.w.map((w, i) => `${(i / n * 100).toFixed(2)},${(40 - w * .4).toFixed(2)}`);
    svgE.innerHTML = `<path class="mxg0" d="M0,40L${pts.join('L')}L100,40z"/><path class="mxg1" d="M${pts.join('L')}"/><line x1="0" y1="20" x2="100" y2="20" class="mxg2"/>`; }
  function show(id, user) {
    const G = GAMES.find(x => x.id === id); if (!G || !host) return;
    el.pushed = !!(user && ctx && ctx.hist); if (el.pushed) ctx.hist({ room: 'match', game: id });
    stop(); cur = G; ply = 0; const L = line(G), x = gt(G.id), n = L.mv.length, K = L.K;
    el.wall.hidden = true; el.view.hidden = false; host.querySelector('.mxx').classList.add('on');
    const fin = L.st[n], res = G.res && (G.kind === 'go' ? G.res : u('res_' + G.res) + (K.disc ? ` ${fin.n.b}–${fin.n.w}` : '')), flip = G.orient === 'b' || G.orient === 'g';
    const [s0, s1] = K.sides, fp = flip !== !!K.up, nm = s => s === s0 ? x.w : x.b, plate = (s, pos) => `<div class="mxpl ${pos}" data-s="${s}"><u class="mxdot ${s}"></u><b>${esc(nm(s))}</b><span class="mxside-n">${esc(u('side_' + s))}</span><span class="mxpx"></span></div>`;
    const btn = (c, k) => `<button type="button" data-c="${c}"${c === 'play' ? ' class="pl"' : ''} aria-label="${esc(u(k))}" title="${esc(u(k))}">${svg(c)}</button>`;
    el.view.innerHTML = `<div class="mxhd"><button type="button" class="mxback" aria-label="${esc(u('back'))}" title="${esc(u('back'))}">${svg('back')}</button>
        <div class="mxht"><p class="mxkick"><i>${esc(u('k_' + G.kind))}</i><span>${esc(x.d)} · ${esc(x.pl)}</span></p><h3>${esc(x.t)}</h3></div>${res ? `<span class="mxres">${esc(res)}</span>` : ''}</div>
      <div class="mxmain">
        <div class="mxleft k-${G.kind}">${plate(fp ? s0 : s1, 'top')}<div class="mxboard" dir="ltr" role="img"></div>${plate(fp ? s1 : s0, 'bot')}
          <div class="mxctl" dir="ltr">${btn('start', 'start')}${btn('prev', 'prev')}${btn('play', 'play')}${btn('next', 'next')}${btn('end', 'end')}</div>
          <div class="mxseek" dir="ltr"><span class="mxgw"><svg class="mxgraph" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"></svg><input type="range" class="mxrng" min="0" max="${n}" value="0" step="1" aria-label="${esc(u('moves'))}"></span><span class="mxpos" aria-live="polite"></span></div></div>
        <div class="mxside"><div class="mxnote"><div class="mxnh"><img src="${GUIDE}" alt="" class="mxowl"><b class="mxwho">${esc(u('guide'))}</b><span class="mxmv"></span></div><div class="mxev" hidden title="${esc(u('evby'))}"><i>${esc(u('ev'))}</i><span class="mxevb"><span></span></span><b></b></div>
            <p class="mxtxt"></p>
            <div class="mxnn"><button type="button" data-n="-1">${svg('prev')}<span>${esc(u('pnote'))}</span></button><button type="button" data-n="1"><span>${esc(u('nnote'))}</span>${svg('next')}</button></div></div>
          <div class="mxlog"><h4>${esc(u('moves'))}<span>${esc(u('plies').replace('{n}', n))}</span></h4><div class="mxlist k-${K.pair ? 'pair' : 'one'}" dir="ltr" role="list"></div></div></div></div>
      <section class="mxabout"><h4>${esc(u('about'))}</h4><p>${esc(x.lead || '')}</p>
        <dl><div><dt>${esc(u('r_event'))}</dt><dd>${esc(x.ev || '—')}</dd></div><div><dt>${esc(u('r_dp'))}</dt><dd>${esc(x.d)} · ${esc(x.pl)}</dd></div>${res ? `<div><dt>${esc(u('result'))}</dt><dd>${esc(res)}</dd></div>` : ''}</dl></section>
      <p class="mxcredit">${esc(u('credit'))}</p>`;
    const q = s => el.view.querySelector(s);
    Object.assign(el, { board: q('.mxboard'), say: q('.mxtxt'), list: q('.mxlist'), pos: q('.mxpos'), mv: q('.mxmv'), rng: q('.mxrng'), nn: q('.mxnn'), ev: q('.mxev'), graph: q('.mxgraph') });
    evalOf(G).then(E => { if (cur === G) { graph(G, E); go(ply, false); } });
    q('.mxback').onclick = () => { if (el.pushed) history.back(); else wall(); };
    // the moves: chess and xiangqi as numbered pairs; shogi and go one by one, numbered, in columns
    const lab = i => K.label(L.mv[i], i, L.recs[i], lang, L.st[0]);
    const mb = i => `<button type="button" data-p="${i + 1}"${note(G.id, i + 1) != null ? ' class="nt"' : ''}>${K.pair ? '' : `<span class="mxno">${i + 1}</span>`}${K.go || K.disc ? `<u class="mxdot ${L.recs[i].side}"></u>` : ''}<bdi>${esc(lab(i))}</bdi></button>`;
    const rows = [`<div class="mxrow st" role="listitem"><button type="button" data-p="0"${note(G.id, 0) != null ? ' class="nt"' : ''}>${esc(u('startpos'))}</button></div>`];
    if (K.pair) for (let i = 0; i < n; i += 2) rows.push(`<div class="mxrow pr" role="listitem"><span class="mxno">${i / 2 + 1}.</span>${mb(i)}${i + 1 < n ? mb(i + 1) : ''}</div>`);
    else for (let i = 0; i < n; i++) rows.push(`<div class="mxrow" role="listitem">${mb(i)}</div>`);
    el.list.innerHTML = rows.join(''); el.list.classList.toggle('alln', Array.from({ length: n + 1 }, (_, i) => note(G.id, i) != null).every(Boolean));
    el.list.onclick = e => { const b = e.target.closest('[data-p]'); if (b) { stop(); go(+b.dataset.p, true); } };
    q('.mxctl').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; const c = b.dataset.c;
      if (c === 'play') { timer ? stop() : run(); return; } stop(); go(c === 'start' ? 0 : c === 'end' ? n : c === 'prev' ? ply - 1 : ply + 1, c === 'next' || c === 'prev'); };
    el.rng.oninput = () => { stop(); go(+el.rng.value, false); };
    el.nn.onclick = e => { const b = e.target.closest('[data-n]'); if (!b || b.disabled) return; stop(); const t = +b.dataset.p; if (t >= 0) go(t, Math.abs(t - ply) === 1); };
    go(0, false); q('.mxback').focus({ preventScroll: true });
    if (user) requestAnimationFrame(() => { const t = el.view.getBoundingClientRect().top + scrollY - band() - 8; if (Math.abs(scrollY - t) > 4) scrollTo({ top: Math.max(0, t) }); });
  }
  // the page's own bar along the top (the site's header) — the view is scrolled to just under it
  function band() { let b = 0; for (const e of document.elementsFromPoint(innerWidth / 2, 2)) { const ps = getComputedStyle(e).position; if (ps === 'fixed' || ps === 'sticky') b = Math.max(b, e.getBoundingClientRect().bottom); } return b < innerHeight / 3 ? b : 0; }
  function go(p, anim) {
    const G = cur; if (!G) return; const L = line(G), n = L.mv.length; p = Math.max(0, Math.min(n, p));
    const near = Math.abs(p - ply) === 1; ply = p; draw(anim && near);
    const K = L.K, r = p ? L.recs[p - 1] : null, x = note(G.id, p), st = L.st[p];
    el.say.textContent = x != null ? x : u('quiet'); el.say.classList.toggle('quiet', x == null);
    const lb = p ? K.label(L.mv[p - 1], p - 1, r, lang, L.st[0]) : '';
    el.mv.innerHTML = p ? `<u class="mxdot ${r.side}"></u>${esc(u('move').replace('{n}', p))}<bdi dir="ltr">${esc(lb)}</bdi>` : esc(u('startpos'));
    { const E = EV && EV[G.id], w = E && E.w[p]; el.ev.hidden = w == null;   // (2026-11-27 ユーザー: 形勢評価) the first side's chance after this move
      if (w != null) { const [s0, s1] = K.sides, lead = w >= 50 ? s0 : s1, k = Math.max(w, 100 - w); el.ev.querySelector('.mxevb span').style.width = w + '%';
        el.ev.querySelector('b').innerHTML = Math.abs(w - 50) < 3 ? esc(u('even')) : `<u class="mxdot ${lead}"></u>${esc(u('side_' + lead))} ${k}%`; } }
    el.pos.textContent = `${p} / ${n}`; el.rng.value = p; el.rng.style.setProperty('--f', (n ? p / n * 100 : 0) + '%');
    el.board.setAttribute('aria-label', p ? u('move').replace('{n}', p) + ' ' + lb : u('startpos'));
    // the notes before and after this move
    let pv = -1, nx = -1; for (let i = p - 1; i >= 0; i--) if (note(G.id, i) != null) { pv = i; break; } for (let i = p + 1; i <= n; i++) if (note(G.id, i) != null) { nx = i; break; }
    el.nn.querySelectorAll('[data-n]').forEach(b => { const t = +b.dataset.n < 0 ? pv : nx; b.dataset.p = t; b.disabled = t < 0; });
    // the plates: whose move it is, and what each side has taken / holds
    el.view.querySelectorAll('.mxpl').forEach(pl => { const s = pl.dataset.s; pl.classList.toggle('on', p < n && st.turn === s); pl.querySelector('.mxpx').innerHTML = plateOf(G, L, st, s); });
    el.list.querySelectorAll('[aria-current]').forEach(b => b.removeAttribute('aria-current'));
    const on = el.list.querySelector(`[data-p="${p}"]`); if (on) { on.setAttribute('aria-current', 'step'); const lr = el.list.getBoundingClientRect(), br = on.getBoundingClientRect();
      if (getComputedStyle(el.list).overflowX === 'auto' && el.list.scrollWidth > el.list.clientWidth + 2) el.list.scrollLeft += (br.left + br.width / 2) - (lr.left + lr.width / 2);
      else if (br.top < lr.top || br.bottom > lr.bottom) el.list.scrollTop += br.top - lr.top - lr.height / 2 + br.height / 2; }
    const ctl = el.view.querySelector('.mxctl'); ctl.querySelector('[data-c=start]').disabled = ctl.querySelector('[data-c=prev]').disabled = !p;
    ctl.querySelector('[data-c=end]').disabled = ctl.querySelector('[data-c=next]').disabled = p >= n;
    if (p >= n) { MK(G.id, GAMES.length); if (timer) stop(); }
  }
  function run() { const n = line(cur).mv.length; if (ply >= n) go(0, false); timer = setInterval(() => { if (!cur || ply >= line(cur).mv.length) return stop(); go(ply + 1, true); }, cur.kind === 'go' ? 1100 : 1700); playBtn(); }
  function stop() { if (timer) { clearInterval(timer); timer = null; } playBtn(); }
  function playBtn() { const b = el.view && el.view.querySelector('[data-c=play]'); if (!b) return; b.innerHTML = svg(timer ? 'pause' : 'play'); b.setAttribute('aria-label', u(timer ? 'pause' : 'play')); b.title = u(timer ? 'pause' : 'play'); b.setAttribute('aria-pressed', !!timer); }
  addEventListener('keydown', e => {
    if (!cur || !host || !host.isConnected || !host.closest('.muroom.on') || el.view.hidden || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest && e.target.closest('input,textarea,[contenteditable],.mxlist')) { if (!(e.target.closest('.mxlist') && /^Arrow(Left|Right)$/.test(e.key))) return; }
    if (document.querySelector('.ov.on, #ov.on, .lvsheet')) return;
    const n = line(cur).mv.length, k = e.key;
    if (k === 'ArrowRight') { stop(); go(ply + 1, true); } else if (k === 'ArrowLeft') { stop(); go(ply - 1, true); } else if (k === 'Home') { stop(); go(0, false); } else if (k === 'End') { stop(); go(n, false); } else return;
    e.preventDefault();
  });

  function render(box, c) {
    ctx = c; lang = T()[c.lang] ? c.lang : 'en';
    if (host !== box || !box.querySelector('.mxx')) { host = box; box.innerHTML = `<div class="mxx"><div class="mxwall"><p class="chlead mxwl"></p><div class="chips cats mxchips" role="group"></div><div class="mxgrid"></div><p class="mxcredit mxwc"></p></div><div class="mxview" hidden></div></div>`;
      el = { wall: box.querySelector('.mxwall'), view: box.querySelector('.mxview'), lead: box.querySelector('.mxwl'), chips: box.querySelector('.mxchips'), grid: box.querySelector('.mxgrid'), credit: box.querySelector('.mxwc') }; }
    if (cur && !el.view.hidden) { const id = cur.id, p = ply, pu = el.pushed; show(id, false); el.pushed = pu; go(p, false); } else wall();
  }
  window.AtlasMatch = { render, GAMES, KINDS, V, line, show: id => show(id, false), open: id => show(id, true), wall: () => host && wall(), current: () => cur && !el.view.hidden ? cur.id : null, _go: p => go(p, false) };
})();
