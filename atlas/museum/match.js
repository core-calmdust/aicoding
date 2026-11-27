/* World Board Game Atlas — 博物館の「名局選」 (great games room, 2026-11-27 ユーザー: 名局・名勝負を、ミュゼフクの一手ごとの解説つきで).
   A wall of famous games; one opens on a board of its own (2D, the pieces slide), with the museum's Atlamo ミュゼフク (musowl) explaining the
   moves, the moves' list beside it (tap any move), and buttons to step, jump to the start or the end, play on by itself, or skip to the next note.
   Texts: museum/match-i18n.js (MUSEUM_MATCH_T[lang][id] = { t, w, b, ev, d, pl, lead, c: { ply: note } }); facts and rules: claude/museum-spec.md (名局選).
   Each kind of game is a KIND below: init() → the start; play(state, move) → { st, from, to, cap, … } (throws on a move that cannot be played,
   so tools/museum-match-check.js can test every game's record); label(…) → the move as written in the list; the board's look.
   AtlasMatch.render(box, ctx) — the museum (atlas/museum.js) calls it. */
(function () {
  'use strict';
  const V = 1, GUIDE = '../images/atlas/av/musowl-2.webp';
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
      mk: { 3: { a: [['f4', 'e5']] }, 6: { a: [['h4', 'e1']] }, 14: { a: [['h5', 'g3']] }, 18: { a: [['c6', 'b5']] }, 21: { s: ['b5'] }, 23: { a: [['h4', 'g5']] }, 25: { a: [['h5', 'g6']] },
        29: { a: [['f4', 'g5']] }, 32: { a: [['c5', 'g1']] }, 33: { a: [['d5', 'f6'], ['d5', 'c7']] }, 34: { a: [['b2', 'a1']] }, 35: { s: ['d6', 'g1', 'a1'] }, 37: { a: [['b2', 'g7']], s: ['e5'] },
        40: { a: [['a6', 'c7']] }, 41: { a: [['g7', 'e8']] }, 43: { a: [['f6', 'd8']] }, 45: { a: [['e7', 'd8']], s: ['d8'] } } },
    // (2026-11-27) Honinbo Shusaku v. Inoue Gennan Inseki, 1846: The Ear-reddening Game
    { id: 'mimiaka', kind: 'go', size: 19, res: 'B+2',
      moves: 'qd dc pq oc cp cf ep qo pe np po pp op qp oq oo pn qq nq on pm om pl mp mq ol pk lq lr kr lp kq qr rr rs mr nr pr ps qs no mo qr rm rl qs lo mn qr qm or ql qj rj ri rk ln mm qi rq jn ls ns gq go ck kc ic pc nj ke og oh pb qb ng mi mj nd ph qg pg hq hr ir iq hp jr fc lc ld mc lb mb md qf pf qh rg rh sh rf sg pj pi oi oj ni qk ok qe kb jb ka jc ob ja la db cc fe cn gr is fq io ji eb fb eg dj dk ej cj dh ij hm gj eh fl fg er dm fn dn gn jj jk kk ii ik jl kl il jh co do ih hn hl bl dg gh ch ig ec cr fd gd ed gc bk cm gs gp li kg in lj lg gm jf jg im fm kf lf mf le gf hf ff gg lk kj km lm ll jm ge he ef ea cb fr fs dr qa ra pa rb da gi fj fi fa ga gl ek em ho el en jo kn ci lh mh mg di ei lg qn rn re sl mg bm am lg eq es mg ha gb lg ds hs mg sj si lg sr sq mg hd hb lg ro so mg ss qs lg sn rp mg cl bn lg ml mk mg pj sf lg nn nl mg ib ia lg nc nb mg jd kd lg ma na mg qc rc lg js ks mg hc id lg fk hj mg hh hg lg gk hk mg ak lg al bm nf od ki ms kp ip jp lr oj mr ea sr',
      mk: {1: {'s':['qd']},3: {'s':['pq']},4: {'a':[['oc','qd']]},5: {'s':['cp']},6: {'s':['cf']},7: {'s':['ep']},8: {'a':[['qo','pq']]},10: {'s':['np','pq'],'a':[['np','pq']]},24: {'s':['pm','pl']},25: {'s':['mq']},28: {'s':['mq','lq'],'a':[['lq','mq']]},30: {'s':['mq','nq','oq']},31: {'s':['lp']},33: {'s':['qr']},40: {'a':[['qs','qr']],'s':['qs']},44: {'a':[['rm','qm']]},50: {'s':['qm']},51: {'s':['or']},53: {'s':['qj']},60: {'s':['rq']},63: {'s':['ns','or']},67: {'a':[['kc','oc']]},70: {'a':[['nj','oh']]},72: {'a':[['og','od']],'s':['og']},77: {'s':['mi']},83: {'s':['hq']},89: {'a':[['fc','dc']]},96: {'s':['qf']},104: {'s':['pj']},107: {'s':['oj']},112: {'a':[['kb','jc']]},118: {'s':['la']},126: {'s':['io']},127: {'a':[['ji','je'],['ji','jo'],['ji','oi'],['ji','fi']],'s':['ji']},131: {'s':['dj']},136: {'s':['ij'],'a':[['ij','ji']]},147: {'s':['jj']},150: {'s':['ii']},155: {'s':['jh']},160: {'s':['hl']},162: {'s':['dg']},167: {'s':['cr']},175: {'s':['gp']},180: {'s':['lg']},199: {'s':['jm']},228: {'s':['mh','lg']},236: {'s':['sl']},274: {'s':['pj']},299: {'s':['id']},311: {'s':['lg']},325: {'s':['sr']}} },
    // (2026-11-27) Adolf Anderssen v. Jean Dufresne, 1852: The Evergreen Game
    { id: 'evergreen', kind: 'chess', res: 'w', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O d3 Qb3 Qf6 e5 Qg6 Re1 Nge7 Ba3 b5 Qxb5 Rb8 Qa4 Bb6 Nbd2 Bb7 Ne4 Qf5 Bxd3 Qh5 Nf6+ gxf6 exf6 Rg8 Rad1 Qxf3 Rxe7+ Nxe7 Qxd7+ Kxd7 Bf5+ Ke8 Bd7+ Kf8 Bxe7#',
      mk: { 7: { s: ['b4'] }, 15: { a: [['b3', 'f7'], ['c4', 'f7']] }, 21: { a: [['a3', 'e7']] }, 24: { a: [['b8', 'b5']] }, 32: { a: [['h5', 'f3']] }, 33: { a: [['e4', 'f6']] },
        35: { a: [['f6', 'e7'], ['e1', 'e7']] }, 36: { a: [['g8', 'g2'], ['h5', 'f3']] }, 37: { a: [['d1', 'd7']] }, 38: { a: [['f3', 'g2']] }, 39: { a: [['e1', 'e7']] }, 41: { a: [['a4', 'd7']] },
        43: { a: [['f5', 'd7'], ['d1', 'd7']], s: ['d7'] }, 45: { a: [['d7', 'e8']] }, 47: { a: [['a3', 'e7']], s: ['f8'] } } },
    // (2026-11-27) Edward Lasker v. George Alan Thomas, 1912: The King Hunt
    { id: 'lasker1912', kind: 'chess', res: 'w', moves: 'd4 e6 Nf3 f5 Nc3 Nf6 Bg5 Be7 Bxf6 Bxf6 e4 fxe4 Nxe4 b6 Ne5 O-O Bd3 Bb7 Qh5 Qe7 Qxh7+ Kxh7 Nxf6+ Kh6 Neg4+ Kg5 h4+ Kf4 g3+ Kf3 Be2+ Kg2 Rh2+ Kg1 Kd2#',
      mk: { 1: { s: ['e5', 'c5'] }, 4: { s: ['e4'] }, 7: { a: [['g5', 'f6']] }, 9: { s: ['f6'] }, 11: { a: [['e4', 'f5']] }, 13: { s: ['e4'] }, 14: { a: [['b7', 'e4']] }, 15: { s: ['e5'] }, 16: { s: ['g8', 'h7'] },
        17: { a: [['d3', 'h7']], s: ['e4'] }, 18: { a: [['b7', 'e4']] }, 19: { a: [['h5', 'h7']] }, 20: { a: [['h5', 'h7'], ['d3', 'h7']], s: ['h7'] }, 21: { a: [['h5', 'h7']] }, 22: { s: ['h7'] }, 23: { a: [['f6', 'h7'], ['d3', 'h7']] },
        24: { a: [['e5', 'g6']], s: ['h8'] }, 25: { a: [['g4', 'h6']] }, 26: { s: ['g5'] }, 27: { a: [['h4', 'g5']] }, 28: { s: ['f4'] }, 29: { a: [['g3', 'f4']] }, 30: { s: ['f3'] }, 31: { a: [['e2', 'f3']] }, 32: { s: ['g2'] },
        33: { a: [['h2', 'g2']] }, 34: { s: ['g8', 'g1'] }, 35: { a: [['a1', 'g1']], s: ['g1'] } } },
    // (2026-11-27) Akaboshi Intetsu v. Honinbo Jowa, 1835: The Blood-vomiting Game
    { id: 'toketsu', kind: 'go', size: 19, res: 'W+R',
      moves: 'cp pq qd ed oc eq qo qk qi op iq dn ep dp do dq co eo fp cq bq br cm gr hp en bp ck dl dk el gn cr dr bs fq go ar hn gm hm gl ek hl di io ho fo ch cd lq pn gc qn dc cc ec cf il gp nq ic fd lc bg bf af bi dj eh fj qg oi qe pd nf ok pk ol pj rn rm qq qr rr qp rq pr rp po pp mp qm pm np mq mo lp lo kp no nr or qp mr ro pi lr ns ip jr hq jn ko kq kn jm km ik mk mm ir jq kk mi nm ml ki lj lk kj jj kl ll lm oj mg jl jk nj ni im in jo kl js ks jl im is kl ei ej jl hr hs kl cn bn jl gs fs kl hi ij jl ls ji hj oe kg jg gi nc jf nb re if je hd fe gf ff fg gg gh hg fi gj ig hh hf ii rf pe pf le kd ad kh qf ef de qe ld lg kc jd qf db eb qe jb od ib mf qf jp kr qe lf kf qf hc qe hb pg og of cg bh pf ph bb da cb fh ac eg bd ob oa of mh rj kl',
      mk: {28: {'s':['ck']},33: {'s':['cr']},68: {'s':['bi']},70: {'s':['eh']},80: {'s':['pj']},246: {'s':['kl']}} },
    // (2026-11-27) Deep Blue (IBM computer) v. Garry Kasparov, 1997: Deep Blue Wins
    { id: 'deepblue1997', kind: 'chess', res: 'w', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Ng5 Ngf6 Bd3 e6 N1f3 h6 Nxe6 Qe7 O-O fxe6 Bg6+ Kd8 Bf4 b5 a4 Bb7 Re1 Nd5 Bg3 Kc8 axb5 cxb5 Qd3 Bc6 Bf5 exf5 Rxe7 Bxe7 c4',
      mk: { 2: { a: [['c6', 'd5']] }, 4: { a: [['d5', 'e4']] }, 5: { a: [['c3', 'e4']] }, 8: { a: [['d7', 'f6']] }, 9: { a: [['g5', 'f7'], ['g5', 'e6']] }, 10: { s: ['f6'] }, 11: { a: [['d3', 'h7']] }, 12: { s: ['e6'] },
        13: { s: ['f3'] }, 14: { a: [['h6', 'g5']] }, 15: { a: [['g5', 'e6']], s: ['e6'] }, 16: { a: [['e7', 'e1']] }, 17: { s: ['g1'] }, 18: { s: ['e6'] }, 19: { a: [['g6', 'e8']] }, 20: { s: ['d8'] }, 21: { a: [['f4', 'c7']] },
        22: { s: ['b5'] }, 23: { a: [['a4', 'b5']] }, 24: { a: [['b7', 'g2']] }, 25: { a: [['e1', 'e6']] }, 26: { a: [['d5', 'f4']] }, 27: { s: ['g3'] }, 28: { s: ['c8'] }, 29: { a: [['a1', 'a7']] }, 30: { s: ['b5'] },
        31: { a: [['d3', 'b5'], ['d3', 'f5']] }, 32: { a: [['c6', 'b5']] }, 33: { s: ['f5'] }, 34: { a: [['e1', 'e7']] }, 35: { a: [['e1', 'e7']] }, 36: { s: ['e7'] }, 37: { a: [['c4', 'b5'], ['c4', 'd5']], s: ['c8'] } } },
    // (2026-11-27) Go Seigen v. Honinbo Shusai, 1933–1934: The 3-3, Star Point and Tengen Game
    { id: 'seigen1933', kind: 'go', size: 19, res: 'W+2',
      moves: 'qc cd dp pq jj pd qd pe ob qn jp lq dj ed lo nq kq lp ko ch gj fq fo iq gp cq cp dq nd ph pj ne me mf nf ng oe of ne nj om mg ke hc qm rm rn rl ro pm ql qk pl pn pk qj nl pi qp on nn no mo op qr qq rq pr rr mn nm lm ll kp mp mq ip jq kk cn ep cj ck dk cl dl ci bj bi di ej bh dm ei fj cm ak ai el bp rf co qg rh jc gq eq en fn er fr dr hq hr hp gr fc ic dc cc gd he ge je hd id hf kd le kc og oh pg em ek fm gm mb cb ec eb dd db gb bc bd bb nb oa fb ea gh jf ie ff hi hg eo fp hl il jh fh fi hj if ih ii ig jg ji fg kf ij ik hh gf mk df ml sm sk mm dg li ol ln nk km fl gl oj qh ri cf ef gi eh ee eg de bf bq br ps os qs oq bo aq an bn am ao rg mi qi lh kh lj rj rk sh sj bg ae cg ag fe gc fd ce kg mc ki fk ld lc gk bk bl na nc gg fa ga ac ad lg mh qo lk',
      mk: {1: {'s':['qc']},3: {'s':['dp']},5: {'s':['jj']},6: {'s':['qc','dp','jj']},160: {'s':['hl']}} },
    // (2026-11-27) Donald Byrne v. Bobby Fischer, 1956: The Game of the Century
    { id: 'century1956', kind: 'chess', res: 'b', moves: 'Nf3 Nf6 c4 g6 Nc3 Bg7 d4 O-O Bf4 d5 Qb3 dxc4 Qxc4 c6 e4 Nbd7 Rd1 Nb6 Qc5 Bg4 Bg5 Na4 Qa3 Nxc3 bxc3 Nxe4 Bxe7 Qb6 Bc4 Nxc3 Bc5 Rfe8+ Kf1 Be6 Bxb6 Bxc4+ Kg1 Ne2+ Kf1 Nxd4+ Kg1 Ne2+ Kf1 Nc3+ Kg1 axb6 Qb4 Ra4 Qxb6 Nxd1 h3 Rxa2 Kh2 Nxf2 Re1 Rxe1 Qd8+ Bf8 Nxe1 Bd5 Nf3 Ne4 Qb8 b5 h4 h5 Ne5 Kg7 Kg1 Bc5+ Kf1 Ng3+ Ke1 Bb4+ Kd1 Bb3+ Kc1 Ne2+ Kb1 Nc3+ Kc1 Rc2#',
      mk: { 18: { a: [['b6', 'c4']] }, 20: { a: [['g4', 'f3']] }, 22: { a: [['b6', 'a4']], s: ['e4'] }, 26: { s: ['e4'] }, 27: { a: [['e7', 'd8'], ['e7', 'f8']] }, 28: { a: [['d8', 'b6']], s: ['f8'] },
        30: { a: [['c3', 'd1']] }, 31: { a: [['c5', 'b6']] }, 32: { a: [['e8', 'e1']] }, 34: { a: [['c5', 'b6'], ['e6', 'c4']], s: ['b6'] }, 36: { a: [['c4', 'f1']] }, 38: { a: [['e2', 'g1']] },
        40: { a: [['c4', 'f1']] }, 44: { a: [['c3', 'd1']] }, 46: { s: ['b6'] }, 50: { s: ['d1'] }, 57: { a: [['d8', 'g8']] }, 64: { s: ['b5'] }, 70: { a: [['c5', 'g1']] }, 72: { a: [['g3', 'f1']] },
        74: { a: [['b4', 'e1']] }, 76: { a: [['b3', 'd1']] }, 78: { a: [['e2', 'c1']] }, 80: { a: [['c3', 'b1']] }, 82: { a: [['c2', 'c1']], s: ['c1'] } } },
    // (2026-11-27) Honinbo Shusaku v. Yasui Sanchi IX, 1849: Shusaku’s First Castle Game
    { id: 'oshiro1849', kind: 'go', size: 19, res: 'B+11',
      moves: 'qd qp dc ce ci fd de df ee cd ec cc ic oc co ep dq eq dr cm cn dm eo cg en em fe gm fi hp nq kq qq rq pq rr po qo pn qn pm qm pl kc pe oe of ne ql qb og dj di ei eh ej bf dh ch dg bg cf bj fh gq hq gp gr fr hr go fg jc kd hf oi pi pj ph mj qj if he hg mh bk be lh lg kh im ie hd mi ll kk hm ik rl rc rd mq mr lr mp lq bl ak aj cj bh cl so sp sm sr hk pf qc rb qe gn ho io jo hn in ip gl fm lo er dp fq kl dn do fo lk bp bq br cq bd ae bn bo ao bm am an bi ai bn aq al ap kj hi mg mf nh nf mc qr rs nr nl nm ml mm jb ib ka db ds cs es cr cb ia jp kp lf me sd se sc qf hj gj ij nc nb nd od md lc le kf ls ks ms jr pb ob pc pa ih gf ge fk gk jl jm il hl fj gi da ea ca oj nj ok ol lj ii hh jh ig nk pk gg ng mh jg kg an dd ed ao oh an ad ac fl el lp qs ps pp op om on li rm ro rn sn ja kb so rp id ni sn',
      mk: {1: {'s':['qd']},5: {'s':['ci']},15: {'s':['co']},43: {'s':['pl']},76: {'s':['oi']}} },
    // (2026-11-27) Red (name not recorded) v. Black (name not recorded), 13th century: The Shilin Guangji game
    { id: 'shilin', kind: 'xiangqi', res: 'b', moves: 'h2e2 h7e7 h0g2 h9g7 i0h0 b9c7 h0h6 c6c5 h6g6 c7d5 g6g5 d5f4 g3g4 g9i7 g5c5 f4d3 c5d5 d3c1', mk: { 2: { a: [['e7', 'e3']] }, 9: { a: [['g6', 'g7']] }, 11: { a: [['g5', 'd5']] }, 14: { a: [['i7', 'g5']] }, 16: { a: [['d3', 'c5']], s: ['c1'] }, 18: { a: [['c1', 'a0']], s: ['e0'] } } },
    // (2026-11-27) Red (name not recorded) v. Black (name not recorded), 1632 (published): The Thirteen-Move Horse Sacrifice (Juzhongmi)
    { id: 'qima13', kind: 'xiangqi', res: 'r', moves: 'h2e2 h7e7 h0g2 h9g7 i0i1 i9h9 i1d1 h9h3 d1d8 b9a7 a0a1 b7b0 b2b7 g7h9 e2e6 f9e8 a1d1 e9f9 d8d9 e8d9 d1f1 e7f7 f1f7 f9e9 b7e7', mk: { 7: { a: [['d1', 'd8']] }, 9: { s: ['d8'] }, 11: { s: ['b0'], a: [['b7', 'b0']] }, 13: { a: [['b7', 'g7']] }, 15: { s: ['e9'], a: [['e6', 'e9']] }, 17: { a: [['d1', 'd8']] }, 19: { s: ['d9', 'f9'] }, 21: { a: [['f1', 'f9']] }, 23: { a: [['f7', 'f9']] }, 25: { a: [['e6', 'e9']], s: ['e9'] } } },
    // (2026-11-27) Ōhashi Sōkei (I) v. Hon'inbō Sansa, June 1607: The oldest shogi record that survives
    { id: 'sokei1607', kind: 'shogi', res: 's',
      moves: '7g7f 3c3d 3i4h 4c4d 4g4f 3a4b 4h4g 4b4c 3g3f 8b4b 2h4h 2b3c 1g1f 1c1d 2g2f 5a6b 5i6h 6b7b 6h7h 7a6b 4i5h 5c5d 5g5f 6b5c 7i6h 6c6d 6g6f 4a5b 6h6g 5b6c 9g9f 9c9d 8g8f 7c7d 7h8g 7b8b 6i7h 6a7b 8i7g 8c8d 4h3h 4b3b 2f2e 3c5a 3h2h 3b2b 6f6e 8a7c 6e6d 6c6d 4f4e 5a3c 2i3g P*6e 2h2i 7d7e 7f7e 6d7e P*7f 7e7d 2i6i 5c6d 7g6e 7c6e P*6f 8d8e 8f8e P*7g 7h7i N*7e 7f7e 6d7e P*7f P*8f 8g9h 9d9e 7f7e 7d7e S*7f 7e7f 6g7f 9e9f 6f6e S*7h P*9b 9a9b N*8d 3c5a N*7d 8b8c 8d9b+ 8c9b 8h7g 7h6i+ 7i6i P*7e P*9c 9b8a 7g8f 7e7f G*9b 8a7a 8f5c+ 7a6a L*6d P*6b 5c4c N*5b 9h8g R*8i 8g7h 7f7g+ 7h7g 8i6i+ S*5c S*6f 7g8f 6i8i 8f9e 6b6c S*6b 5a6b 5c6b+ 7b6b 7d6b+ 6a6b B*5c 6b7c G*8d 7c7b P*7c 7b6a 6d6c+',
      mk: { 10: { s: ['4b'] }, 11: { s: ['4h'] }, 46: { s: ['2h', '2b'] }, 47: { s: ['6e'] }, 54: { a: [['7g', '6e']], s: ['6e'] }, 56: { a: [['7e', '7f']] }, 68: { a: [['7g', '7h']] }, 70: { a: [['7e', '8g']] }, 74: { a: [['8f', '8g']] }, 77: { s: ['7e'] }, 84: { a: [['7h', '6i']] }, 85: { a: [['9a', '9b']] }, 87: { a: [['8d', '9b'], ['8d', '7b']] }, 88: { a: [['5a', '8d']] }, 89: { a: [['7d', '8b']] }, 94: { s: ['6i'] }, 99: { a: [['8f', '5c']] }, 103: { s: ['5c'] }, 105: { a: [['6d', '6b']] }, 114: { s: ['6i'] }, 119: { s: ['9e'] }, 121: { s: ['6b'] }, 127: { a: [['5c', '6b']] }, 133: { a: [['6c', '6b']], s: ['6a'] } } }
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
    function init(G) { return { n: G.size || 19, s: {}, turn: 'B', id: 0, cap: { B: 0, W: 0 } }; }
    function play(st, mv) {
      const n = st.n, s = Object.assign({}, st.s), me = st.turn, you = me === 'B' ? 'W' : 'B';
      if (!mv || mv === 'tt') return { st: Object.assign({}, st, { turn: you }), pass: true, side: me, to: null };
      const x = mv.charCodeAt(0) - 97, y = mv.charCodeAt(1) - 97;
      if (x < 0 || y < 0 || x >= n || y >= n || s[mv]) throw new Error('point taken or off the board: ' + mv);
      const id = st.id; s[mv] = { c: me, id };
      const nb = p => { const a = p.charCodeAt(0) - 97, b = p.charCodeAt(1) - 97; return [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]].filter(([u, v]) => u >= 0 && v >= 0 && u < n && v < n).map(([u, v]) => String.fromCharCode(97 + u, 97 + v)); };
      const group = p => { const c = s[p].c, seen = new Set([p]), q = [p]; let lib = 0; const libs = new Set();
        while (q.length) { const a = q.pop(); nb(a).forEach(b => { if (!s[b]) libs.add(b); else if (s[b].c === c && !seen.has(b)) { seen.add(b); q.push(b); } }); } return { g: [...seen], lib: libs.size }; };
      const off = [];
      nb(mv).forEach(b => { if (s[b] && s[b].c === you) { const G = group(b); if (!G.lib) G.g.forEach(p => { if (s[p]) { off.push(s[p].id); delete s[p]; } }); } });
      if (!group(mv).lib) throw new Error('suicide: ' + mv);
      const cap = Object.assign({}, st.cap); cap[me] += off.length;
      return { st: { n, s, turn: you, id: id + 1, cap }, to: mv, side: me, off };
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
  const KINDS = { chess: CHESS, shogi: SHOGI, go: GO, xiangqi: XIANGQI };

  // every position of a game, worked out once (the record → states[0…n]; recs[i] = what move i did)
  const cache = {};
  function line(G) {
    if (cache[G.id]) return cache[G.id];
    const K = KINDS[G.kind], mv = Array.isArray(G.moves) ? G.moves : G.moves.trim().split(/\s+/);
    const st = [K.init(G)], recs = [];
    mv.forEach((m, i) => { const r = K.play(st[i], G.kind === 'go' && m === '-' ? '' : m); recs.push(r); st.push(r.st); });
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
    if (K === SHOGI) return { W: 9.9, H: 9.9 + 2.4, ox: 0.45, oy: 1.2 + 0.45, cell: 1, hands: true };
    if (K === XIANGQI) return { W: 9.7, H: 10.9, ox: 0.85, oy: 0.95, cell: 1, pt: true };
    return { W: 8.7, H: 8.7, ox: 0.6, oy: 0.1, cell: 1 };
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
      P.push(`<rect x="0" y="1.2" width="9.9" height="9.9" rx=".2" class="mxwood"/>`);
      for (let i = 0; i <= 9; i++) P.push(`<line x1="${g.ox}" y1="${g.oy + i}" x2="${g.ox + 9}" y2="${g.oy + i}"/><line x1="${g.ox + i}" y1="${g.oy}" x2="${g.ox + i}" y2="${g.oy + 9}"/>`);
      [[3, 3], [6, 3], [3, 6], [6, 6]].forEach(([a, b]) => P.push(`<circle cx="${g.ox + a}" cy="${g.oy + b}" r=".07" class="mxhoshi"/>`));
      for (let i = 0; i < 9; i++) { P.push(`<text x="${(g.ox + i + .5) * 100}" y="${(g.oy - .12) * 100}" class="mxcoord" transform="scale(.01)">${flip ? i + 1 : 9 - i}</text>`); }
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
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) P.push(`<rect x="${g.ox + f}" y="${g.oy + r}" width="1" height="1" class="${(r + f) % 2 ? 'mxdk' : 'mxlt'}"/>`);
    for (let i = 0; i < 8; i++) { P.push(`<text x="${(g.ox + i + .5) * 100}" y="${(g.oy + 8.45) * 100}" class="mxcoord" transform="scale(.01)">${'abcdefgh'[flip ? 7 - i : i]}</text><text x="${(g.ox - .3) * 100}" y="${(g.oy + i + .62) * 100}" class="mxcoord" transform="scale(.01)">${flip ? i + 1 : 8 - i}</text>`); }
    return `<g class="mxch">${P.join('')}</g>`;
  }
  function pieceHTML(K, p, g) {
    if (K.go) return `<span class="mxst ${p.k === 'B' ? 'b' : 'w'}"></span>`;
    if (K === XIANGQI) return `<span class="mxxp${p.red ? ' r' : ''}"><b>${p.glyph}</b></span>`;
    if (K === SHOGI) return `<span class="mxsg${p.up ? '' : ' dn'}${p.red ? ' pr' : ''}"><svg viewBox="0 0 100 110" aria-hidden="true"><path d="M50 4 82 18 94 106H6L18 18z"/></svg><b>${p.glyph}</b></span>`;
    return `<img src="${PIMG}${p.k}.svg" alt="" draggable="false">`;
  }
  // where a point sits, as % of the board's box
  function spot(G, K, g, at, flip) { const [x, y] = K.xy(at, flip, g.n); return K.go || K.pt ? [(g.ox + x) / g.W * 100, (g.oy + y) / g.H * 100] : [(g.ox + x + .5) / g.W * 100, (g.oy + y + .5) / g.H * 100]; }
  function draw(anim) {
    const G = cur, L = line(G), K = L.K, g = geom(G, K), st = L.st[ply], r = ply ? L.recs[ply - 1] : null, flip = G.orient === 'b' || G.orient === 'g';
    const box = el.board;
    if (box._g !== G.id) { box._g = G.id; box.innerHTML = `<svg class="mxbg" viewBox="0 0 ${g.W} ${g.H}" aria-hidden="true">${boardSVG(G, K, g, flip)}<g class="mxmk"></g></svg><div class="mxpcs"></div>${g.hands ? '<div class="mxhand g"></div><div class="mxhand s"></div>' : ''}`;
      box.style.aspectRatio = `${g.W} / ${g.H}`; box._el = {}; box.classList.toggle('go', !!K.go); box.classList.toggle('sh', K === SHOGI); box.classList.toggle('ch', K === CHESS); box.classList.toggle('xq', K === XIANGQI); }
    box.classList.toggle('still', !anim);
    const sz = (K.go ? 1 : 1) / g.W * 100, szh = 1 / g.H * 100;
    const lay = box.querySelector('.mxpcs'), seen = new Set();
    K.pieces(st).forEach(p => { seen.add(p.id); let e = box._el[p.id];
      if (!e) { e = document.createElement('i'); e.className = 'mxp'; lay.appendChild(e); box._el[p.id] = e; e._k = ''; e.classList.add('new'); requestAnimationFrame(() => requestAnimationFrame(() => e.classList.remove('new'))); }
      if (e._k !== p.k + (p.glyph || '') + (p.up ? 1 : 0)) { e._k = p.k + (p.glyph || '') + (p.up ? 1 : 0); e.innerHTML = pieceHTML(K, p, g); }
      const [x, y] = spot(G, K, g, p.at, flip); e.style.left = x + '%'; e.style.top = y + '%'; e.style.width = sz + '%'; e.style.height = szh + '%';
      e.classList.toggle('last', !!(K.go && r && r.to === p.at)); });
    Object.keys(box._el).forEach(id => { if (!seen.has(+id)) { const e = box._el[id]; delete box._el[id]; e.classList.add('gone'); setTimeout(() => e.remove(), anim ? 260 : 0); } });
    // the hands (shogi): what each side holds
    if (g.hands) { const H = K.hands(st), cnt = side => { const c = {}; H[side].forEach(x => c[x.t] = (c[x.t] || 0) + 1); return Object.entries(c); };
      ['g', 's'].forEach(side => { const h = box.querySelector('.mxhand.' + side), top = (side === 'g') !== flip;
        h.style.top = top ? '0' : ''; h.style.bottom = top ? '' : '0'; h.classList.toggle('top', top);
        h.innerHTML = `<em>${side === 's' ? '▲' : '△'}${esc(u('side_' + side))}</em>` + cnt(side).map(([t, n]) => `<span class="mxsg${top ? ' dn' : ''}"><svg viewBox="0 0 100 110" aria-hidden="true"><path d="M50 4 82 18 94 106H6L18 18z"/></svg><b>${SHOGI.KAN[t]}</b>${n > 1 ? `<u>${n}</u>` : ''}</span>`).join(''); }); }
    // the marks: the last move's squares, then what the note points at (arrows, squares)
    const mk = box.querySelector('.mxmk'), M = (G.mk || {})[ply] || {}, out = [];
    const c = at => { const [x, y] = K.xy(at, flip, g.n); return K.go || K.pt ? [g.ox + x, g.oy + y] : [g.ox + x + .5, g.oy + y + .5]; };
    const sqr = (at, cls) => { const [x, y] = c(at); out.push(K.pt ? `<circle cx="${x}" cy="${y}" r=".5" class="${cls}"/>` : `<rect x="${x - .5}" y="${y - .5}" width="1" height="1" class="${cls}"/>`); };
    if (r && !K.go) { if (r.from) sqr(r.from, 'mxlm'); if (r.to) sqr(r.to, 'mxlm'); }
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
      else if (K === XIANGQI) P.push(`<g transform="translate(${cx} ${cy})"><circle r=".45" class="mxxt${p.red ? ' r' : ''}"/><text y="19" transform="scale(.01)" class="mxxg${p.red ? ' r' : ''}">${p.glyph}</text></g>`);
      else if (K === SHOGI) P.push(`<g transform="translate(${cx} ${cy})${p.up ? '' : ' rotate(180)'}"><path d="M0 -.44 .32 -.3 .4 .42H-.4L-.32 -.3z" class="mxtk"/><text y="20" transform="scale(.01)" class="mxtg${p.red ? ' pr' : ''}">${p.glyph}</text></g>`);
      else P.push(`<image href="${PIMG}${p.k}.svg" x="${cx - .5}" y="${cy - .5}" width="1" height="1"/>`); });
    return `<svg viewBox="0 0 ${g.W} ${g.H}" aria-hidden="true">${boardSVG(G, K, g, flip)}${P.join('')}</svg>`;
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
    el.lead.textContent = u('lead'); el.credit.textContent = u('credit');
    if (window.AtlasMuseum && AtlasMuseum.catalog) AtlasMuseum.catalog('match', GAMES.map(G => ({ id: G.id, t: gt(G.id).t })));
    MK(null, GAMES.length);
  }

  /* ---------- a game ---------- */
  function show(id, user) {
    const G = GAMES.find(x => x.id === id); if (!G || !host) return;
    el.pushed = !!(user && ctx && ctx.hist); if (el.pushed) ctx.hist({ room: 'match', game: id });
    stop(); cur = G; ply = 0; const L = line(G), x = gt(G.id), n = L.mv.length;
    el.wall.hidden = true; el.view.hidden = false; host.querySelector('.mxx').classList.add('on');
    const K = L.K, side = s => u('side_' + s), res = G.res && (G.kind === 'go' ? G.res : u('res_' + G.res));
    el.view.innerHTML = `<button type="button" class="mxback">${svg('back')}${esc(u('back'))}</button>
      <div class="mxhd"><i>${esc(u('k_' + G.kind))}</i><h3>${esc(x.t)}</h3>
        <p class="mxvs"><span><u class="mxdot ${K.sides[0]}"></u>${esc(x.w)}</span><em>vs</em><span><u class="mxdot ${K.sides[1]}"></u>${esc(x.b)}</span></p>
        <p class="mxmeta">${esc(x.d)} · ${esc(x.pl)}${x.ev ? ' · ' + esc(x.ev) : ''}${res ? ` · <b>${esc(u('result'))}: ${esc(res)}</b>` : ''}</p></div>
      <div class="mxmain"><div class="mxleft k-${G.kind}"><div class="mxboard" dir="ltr" role="img"></div>
        <div class="mxctl" dir="ltr"><button type="button" data-c="start" aria-label="${esc(u('start'))}" title="${esc(u('start'))}">${svg('start')}</button><button type="button" data-c="prev" aria-label="${esc(u('prev'))}" title="${esc(u('prev'))}">${svg('prev')}</button>
          <button type="button" data-c="play" class="pl" aria-label="${esc(u('play'))}" title="${esc(u('play'))}">${svg('play')}</button><button type="button" data-c="next" aria-label="${esc(u('next'))}" title="${esc(u('next'))}">${svg('next')}</button><button type="button" data-c="end" aria-label="${esc(u('end'))}" title="${esc(u('end'))}">${svg('end')}</button></div>
        <p class="mxpos" aria-live="polite"></p></div>
        <div class="mxside"><div class="mxsay"><img src="${GUIDE}" alt="" class="mxowl"><div class="mxbub"><b class="mxwho">${esc(u('guide'))}</b><p class="mxtxt"></p><button type="button" class="mxnext" hidden></button></div></div>
          <div class="mxlog"><h4>${esc(u('moves'))}</h4><div class="mxlist" dir="ltr" role="list"></div></div></div></div>
      <p class="mxlead">${esc(x.lead || '')}</p><p class="mxcredit">${esc(u('credit'))}</p>`;
    el.board = el.view.querySelector('.mxboard'); el.say = el.view.querySelector('.mxtxt'); el.list = el.view.querySelector('.mxlist'); el.pos = el.view.querySelector('.mxpos'); el.nx = el.view.querySelector('.mxnext');
    el.view.querySelector('.mxback').onclick = () => { if (el.pushed) history.back(); else wall(); };
    // the moves' list: chess as numbered pairs; the others one move a row, numbered
    const lab = i => K.label(L.mv[i], i, L.recs[i], lang, L.st[0]);
    const btn = i => `<button type="button" data-p="${i + 1}" class="${note(G.id, i + 1) != null ? 'nt' : ''}">${esc(lab(i))}</button>`;
    const rows = [`<div class="mxrow st" role="listitem"><button type="button" data-p="0" class="${note(G.id, 0) != null ? 'nt' : ''}">${esc(u('startpos'))}</button></div>`];
    if (K.pair) for (let i = 0; i < n; i += 2) rows.push(`<div class="mxrow pr" role="listitem"><span>${i / 2 + 1}.</span>${btn(i)}${i + 1 < n ? btn(i + 1) : '<b></b>'}</div>`);
    else for (let i = 0; i < n; i++) rows.push(`<div class="mxrow" role="listitem"><span>${i + 1}</span>${K.go ? `<u class="mxdot ${L.recs[i].side}"></u>` : ''}${btn(i)}</div>`);
    el.list.innerHTML = rows.join(''); el.list.classList.toggle('alln', Array.from({ length: n + 1 }, (_, i) => note(G.id, i) != null).every(Boolean));
    el.list.onclick = e => { const b = e.target.closest('[data-p]'); if (b) { stop(); go(+b.dataset.p, true); } };
    el.view.querySelector('.mxctl').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; const c = b.dataset.c;
      if (c === 'play') { timer ? stop() : run(); return; } stop(); go(c === 'start' ? 0 : c === 'end' ? n : c === 'prev' ? ply - 1 : ply + 1, c === 'next' || c === 'prev'); };
    el.nx.onclick = () => { stop(); go(+el.nx.dataset.p, true); };
    go(0, false); el.view.querySelector('.mxback').focus({ preventScroll: true });
    if (user) { const t = host.getBoundingClientRect().top + scrollY - 80; if (scrollY > t) scrollTo({ top: Math.max(0, t) }); }
  }
  function go(p, anim) {
    const G = cur; if (!G) return; const L = line(G), n = L.mv.length; p = Math.max(0, Math.min(n, p));
    const near = Math.abs(p - ply) === 1; ply = p; draw(anim && near);
    const K = L.K, r = p ? L.recs[p - 1] : null, x = note(G.id, p);
    el.say.textContent = x != null ? x : u('quiet'); el.say.classList.toggle('quiet', x == null);
    // the next note further on (long games: most moves have none)
    let nn = -1; if (x == null) for (let i = p + 1; i <= n; i++) if (note(G.id, i) != null) { nn = i; break; }
    el.nx.hidden = nn < 0; if (nn >= 0) { el.nx.dataset.p = nn; el.nx.innerHTML = esc(u('nextnote').replace('{n}', nn)) + svg('note'); }
    const lb = p ? K.label(L.mv[p - 1], p - 1, r, lang, L.st[0]) : ''; el.pos.innerHTML = p ? esc(u('move').replace('{n}', p)) + ' · <bdi dir="ltr">' + esc(lb) + '</bdi>' : esc(u('startpos'));
    el.board.setAttribute('aria-label', el.pos.textContent);
    el.list.querySelectorAll('[aria-current]').forEach(b => b.removeAttribute('aria-current'));
    const on = el.list.querySelector(`[data-p="${p}"]`); if (on) { on.setAttribute('aria-current', 'step'); const lr = el.list.getBoundingClientRect(), br = on.getBoundingClientRect();
      if (br.top < lr.top || br.bottom > lr.bottom) el.list.scrollTop += br.top - lr.top - lr.height / 2 + br.height / 2; }
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
  window.AtlasMatch = { render, GAMES, KINDS, V, line, show: id => show(id, false), wall: () => host && wall(), current: () => cur && !el.view.hidden ? cur.id : null, _go: p => go(p, false) };
})();
