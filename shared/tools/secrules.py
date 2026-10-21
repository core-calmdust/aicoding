#!/usr/bin/env python3
"""Generates <game>/database.rules.json for every online board game (anti-tamper rules, shared/onlinesec.js is the client side).

    python3 shared/tools/secrules.py            # writes all rule files
    python3 shared/tools/secrules.py --check    # only reports files that differ

The rules use the Realtime Database rules language only (Spark plan). What they enforce:
  * players/<uid>: created at the default rating only; rating / games / wins / losses / draws change only together with a
    settlement of the game in open/<uid> (a rated game this uid played, finished, result agreed or decided by resign / timeout /
    abandon / agreed draw), Elo delta bounded by K (halved when the opponent has played < 3 rated games), games + 1, the pair
    counter pc/<uid>/<opp> (max 3 rated settlements per opponent and UTC day) incremented in the same write, open/<uid> cleared.
  * games/<gid>: written by the two participants only; b / w / rated / created / time control / variant / names / ratings
    immutable; moves append-only and only while in play; t is the server time of every action; the mover's clock is charged
    (it can not give itself time); strict turn order where the game alternates; status leaves 'play' once (resign by the loser
    itself, timeout / abandon checked against server time, draw only by accepting the opponent's offer); res/<uid> (each side's
    own result report) and j/<uid> (joined) are write-once and only by their owner.
  * rated games can only be created between two players who are both in the lobby, without an unsettled rated game, with their
    current ratings, and the creator must link the game to both players (open/<uid>) in the same write.
  * chat: one message per 3 s per uid (chatLast/<uid>, server time); presence / lobby / rooms / profiles: own uid, size limits.
Keep the K table, INITIAL and time controls here in sync with <game>/online.js.
"""
import json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

SLACK = 5000            # latency allowance (ms) for clock checks
FB = 300000             # a lone result report becomes final after 5 min when the opponent is gone (or never answered)
STALE = 3 * 3600000     # a rated game nobody can settle any more is void after 3 h
PAIR_MAX = 3            # rated settlements per opponent and UTC day
DAY = 86400000
INITIAL = 1500

# per game: first = field of the side that moves first; alt = strict alternation of moves; tckey = record field naming the
# time control; tcs = {key: (main, byo, inc)}; legacy_byo = per-move limit of records without a time control (None: none);
# free = free seconds per action (backgammon delay); extra immutable primitive fields; draw / abandon = statuses offered;
# hist = players/<uid>/hist entries; moves_max = max length of the move record.
GAMES = {
    'reversi': dict(first='b', alt=False, tckey='tc', tcs={'fast': (300000, 30000, 0), 'long': (600000, 30000, 0), 'blitz': (0, 30000, 0)},
                    legacy_byo=90000, free=0, imm=['tc'], draw=False, abandon=False, hist=False, moves_max=400, bg=False),
    'shogi': dict(first='b', alt=True, tckey='tc', tcs={'fast': (300000, 30000, 0), 'long': (600000, 30000, 0), 'blitz': (0, 30000, 0)},
                  legacy_byo=90000, free=0, imm=['tc'], draw=False, abandon=False, hist=False, moves_max=4000, bg=False),
    'chess': dict(first='w', alt=True, tckey='tc', tcs={'blitz': (180000, 0, 2000), 'rapid': (600000, 0, 5000), 'classical': (900000, 0, 10000)},
                  legacy_byo=None, free=0, imm=['tc'], draw=False, abandon=False, hist=False, moves_max=6000, bg=False),
    'gomoku': dict(first='w', alt=True, tckey='tc', tcs={'blitz': (180000, 0, 2000), 'rapid': (600000, 0, 5000), 'classical': (900000, 0, 10000)},
                   legacy_byo=None, free=0, imm=['tc'], draw=False, abandon=False, hist=False, moves_max=6000, bg=False),
    'checkers': dict(first='b', alt=True, tckey='tc', tcs={'english': (300000, 0, 5000)}, legacy_byo=None, free=0, imm=['tc', 'v'],
                     draw=True, abandon=True, hist=True, moves_max=6000, bg=False, variant=('v', ['english'])),
    'morris': dict(first='b', alt=True, tckey='tc', tcs={'nine': (300000, 0, 5000), 'twelve': (360000, 0, 5000), 'six': (180000, 0, 3000)},
                   legacy_byo=None, free=0, imm=['tc', 'v'], draw=True, abandon=True, hist=True, moves_max=6000, bg=False,
                   variant=('v', ['six', 'nine', 'twelve'])),
    # Go: v = board size; moves are 2 characters each (pass '__'); no draw offers (komi 6.5 online); the game ends by two passes
    # and is settled as status 'over' with win / why 'score' / pts / dead (both clients count; the res reports must agree)
    'go': dict(first='b', alt=True, tckey='tc', tcs={'9': (300000, 0, 5000), '13': (600000, 0, 10000), '19': (1200000, 0, 15000)},
               legacy_byo=None, free=0, imm=['tc', 'v'], draw=False, abandon=True, hist=True, moves_max=3000, bg=False,
               variant=('v', ['9', '13', '19'])),
    'dots': dict(first='b', alt=False, tckey='tc', tcs={'s3': (60000, 0, 3000), 's4': (120000, 0, 3000), 's5': (180000, 0, 3000)},
                 legacy_byo=None, free=0, imm=['tc', 'n'], draw=False, abandon=False, hist=False, moves_max=400, bg=False),
    'backgammon': dict(first=None, alt=False, tckey='f', tcs={'g1': (180000, 0, 0), 'm3': (360000, 0, 0), 'm5': (600000, 0, 0), 'm7': (840000, 0, 0)},
                       legacy_byo=None, free=12000, imm=['f', 'ml', 'cube', 'cr', 'cu', 'gi', 'mid', 'pv'], draw=False, abandon=True,
                       hist=True, moves_max=20000, bg=True),
}


def q(s):
    return "'" + s + "'"


def tern(key, mapping, default):
    """(key === 'a' ? A : key === 'b' ? B : default)"""
    out = str(default)
    for k, v in reversed(list(mapping.items())):
        out = f"{key} === {q(k)} ? {v} : {out}"
    return '(' + out + ')'


def AND(*xs):
    return '(' + ' && '.join(x for x in xs if x) + ')'


def OR(*xs):
    return '(' + ' || '.join(x for x in xs if x) + ')'


def num(node, c):
    """counter value of an old record (missing = 0)"""
    return f"({node}.child('{c}').isNumber() ? {node}.child('{c}').val() : 0)"


def build(name, P):
    NR = 'newData.parent().parent()'                     # new root, seen from players/$uid, open/$uid, lobby/$uid
    TCK = P['tckey']

    # ------------------------------------------------------------------ outcome of game G for uid U (mirrored in shared/onlinesec.js)
    def outcome(G, U):
        st = f"{G}.child('status').val()"
        opp = f"({G}.child('b').val() === {U} ? {G}.child('w').val() : {G}.child('b').val())"
        loser = f"{G}.child('loser').val()"
        j = lambda u: f"{G}.child('j').child({u}).exists()"
        res = lambda u: f"{G}.child('res').child({u})"
        rs = lambda u: f"{res(u)}.child('s').val()"
        rt = lambda u: f"{res(u)}.child('t').val()"
        done = f"{G}.child('mo').val() === true" if P['bg'] else None
        forced = OR(f"{st} === 'timeout'", f"{st} === 'abandon'") if P['abandon'] else f"{st} === 'timeout'"

        def over_is(x):
            both = AND(f"{res(U)}.exists()", f"{res(opp)}.exists()", f"{rs(U)} + {rs(opp)} === 1", f"{rs(U)} === {x}")
            mine = AND(f"{res(U)}.exists()", f"!{res(opp)}.exists()", f"{rs(U)} === {x}", f"now - {rt(U)} > {FB}", j(opp),
                       f"!root.child('presence').child({opp}).exists()")
            theirs = AND(f"!{res(U)}.exists()", f"{res(opp)}.exists()", f"1 - {rs(opp)} === {x}", f"now - {rt(opp)} > {FB}", j(U))
            return AND(f"{st} === 'over'", done, OR(both, mine, theirs))

        win = OR(AND(f"{st} === 'resign'", f"{loser} !== {U}"),
                 AND(forced, f"{loser} !== {U}", f"{G}.child('draw').val() !== true", j(loser)),
                 over_is(1))
        loss = OR(AND(f"{st} === 'resign'", f"{loser} === {U}"),
                  AND(forced, f"{loser} === {U}", f"{G}.child('draw').val() !== true", j(loser)),
                  over_is(0))
        draw = OR(AND(forced, f"{G}.child('draw').val() === true", j(loser)),
                  f"{st} === 'draw'" if P['draw'] else None,
                  over_is(0.5))
        pc = f"root.child('pc').child({U}).child({opp})"
        void = OR(f"!{G}.exists()", f"{G}.child('rated').val() !== true",
                  AND(f"{G}.child('b').val() !== {U}", f"{G}.child('w').val() !== {U}"),
                  AND(forced, f"!{j(loser)}"),
                  AND(f"{st} === 'over'", OR(AND(f"{res(U)}.exists()", f"{res(opp)}.exists()", f"{rs(U)} + {rs(opp)} !== 1"),
                                             AND(f"!{j(U)}", f"!{res(U)}.exists()"),
                                             AND(f"!{j(opp)}", f"!{res(opp)}.exists()"))),
                  AND(f"now - {G}.child('t').val() > {STALE}",
                      OR(f"{st} === 'play'", AND(f"{st} === 'over'", f"!{res(U)}.exists()", f"!{res(opp)}.exists()"),
                         AND(f"{st} === 'over'", f"{G}.child('mo').val() !== true") if P['bg'] else None)),
                  AND(f"{pc}.child('n').val() >= {PAIR_MAX}", f"{pc}.child('d').val() * {DAY} <= now", f"now < ({pc}.child('d').val() + 1) * {DAY}"))
        return dict(win=win, loss=loss, draw=draw, void=void, opp=opp)

    # ------------------------------------------------------------------ players
    G = "root.child('games').child(newData.child('last').val())"
    O = outcome(G, '$uid')
    pg = num('data', 'games')
    K = f"({pg} < 10 ? 40 : {pg} < 30 ? 32 : 24)"
    KH = f"({pg} < 10 ? 20 : {pg} < 30 ? 16 : 12)"
    oppg = f"root.child('players').child({O['opp']}).child('games')"
    KK = f"({oppg}.isNumber() && {oppg}.val() >= 3 ? {K} : {KH})"
    D = "(newData.child('rating').val() - data.child('rating').val())"
    cnt = lambda c, plus: f"newData.child('{c}').val() === {num('data', c)}{' + 1' if plus else ''}"
    npc = f"{NR}.child('pc').child($uid).child({O['opp']})"
    opc = f"root.child('pc').child($uid).child({O['opp']})"
    settle = AND(
        "newData.child('last').isString()",
        "root.child('open').child($uid).val() === newData.child('last').val()",
        f"!{NR}.child('open').child($uid).exists()",
        f"newData.child('games').val() === {pg} + 1",
        f"{npc}.child('n').val() <= {PAIR_MAX}",
        f"({npc}.child('d').val() === {opc}.child('d').val() ? {npc}.child('n').val() === {opc}.child('n').val() + 1 : {npc}.child('n').val() === 1)",
        OR(AND(O['win'], f"{D} >= 0", f"{D} <= {KK}", cnt('wins', True), cnt('losses', False), cnt('draws', False)),
           AND(O['loss'], f"{D} <= 0", f"{D} >= -{KK}", cnt('wins', False), cnt('losses', True), cnt('draws', False)),
           AND(O['draw'], f"{D} >= -{KK}", f"{D} <= {KK}", cnt('wins', False), cnt('losses', False), cnt('draws', True))))
    same = lambda c: OR(f"newData.child('{c}').val() === data.child('{c}').val()", AND(f"!data.child('{c}').exists()", f"newData.child('{c}').val() === 0"))
    # a plain update (name, unrated game noted in `last`) keeps every counter, and can not point `last` at the unsettled game
    unchanged = AND("newData.child('rating').val() === data.child('rating').val()", same('games'), same('wins'), same('losses'), same('draws'),
                    "(newData.child('last').val() === data.child('last').val() || newData.child('last').val() !== root.child('open').child($uid).val())")
    zero = lambda c: OR(f"!newData.child('{c}').exists()", f"newData.child('{c}').val() === 0")
    create = AND(f"newData.child('rating').val() === {INITIAL}", zero('games'), zero('wins'), zero('losses'), zero('draws'))
    xc = f"{NR}.child('xclaim').child($uid)"
    X = f"root.child('xfer').child({xc}.child('f').val())"
    carry = AND(f"{xc}.child('k').isString()", f"{X}.child('k').val() === {xc}.child('k').val()",
                f"newData.child('rating').val() === {X}.child('r').val()", f"newData.child('games').val() === {X}.child('g').val()",
                f"newData.child('wins').val() === {X}.child('w').val()", f"newData.child('losses').val() === {X}.child('l').val()",
                f"newData.child('draws').val() === {X}.child('d').val()", f"newData.child('games').val() > {num('data', 'games')}")
    counter = {'.validate': "newData.isNumber() && newData.val() >= 0 && newData.val() <= 1000000"}
    players = {
        '.read': 'auth != null',
        '$uid': {
            '.write': 'auth != null && auth.uid === $uid',
            '.validate': AND("newData.hasChildren(['name', 'rating'])", "newData.child('rating').isNumber()",
                             "newData.child('name').isString()", "newData.child('name').val().length >= 1", "newData.child('name').val().length <= 16",
                             OR(AND('!data.exists()', OR(create, carry)), AND('data.exists()', OR(unchanged, settle, carry)))),
            'games': counter, 'wins': counter, 'losses': counter, 'draws': counter,
            'last': {'.validate': 'newData.isString() && newData.val().length <= 64'},
        },
    }
    if P['hist']:
        players['$uid']['hist'] = {'$i': {'.validate': "$i.matches(/^[0-9]{1,2}$/) && newData.hasChildren(['g', 'r']) && newData.child('g').isString() && newData.child('g').val().length <= 64 && newData.child('r').isNumber() && (!newData.child('o').exists() || (newData.child('o').isString() && newData.child('o').val().length <= 16)) && (!newData.child('why').exists() || (newData.child('why').isString() && newData.child('why').val().length <= 16))"}}
    players['$uid']['$other'] = {'.validate': "newData.isString() ? newData.val().length <= 64 : (newData.isNumber() || newData.isBoolean())"} if not P['hist'] else {'.validate': "newData.isString() ? newData.val().length <= 64 : (newData.isNumber() || newData.isBoolean())"}

    # ------------------------------------------------------------------ open / pc / xfer / xclaim
    Gv = "root.child('games').child(data.val())"
    Ov = outcome(Gv, '$uid')
    GN = f"{NR}.child('games').child(newData.val())"
    link = AND("newData.isString()", f"!root.child('games').child(newData.val()).exists()", f"{GN}.child('rated').val() === true",
               OR(f"{GN}.child('b').val() === $uid", f"{GN}.child('w').val() === $uid"),
               OR('!data.exists()', f"data.val() === {GN}.child('pv').val()") if P['bg'] else '!data.exists()')
    open_ = {
        '.read': 'auth != null',
        '$uid': {
            '.write': OR(AND('auth != null', 'newData.exists()', link),
                         AND('auth != null', 'auth.uid === $uid', '!newData.exists()',
                             OR(AND(f"{NR}.child('players').child($uid).child('last').val() === data.val()",
                                    "root.child('players').child($uid).child('last').val() !== data.val()"),
                                Ov['void']))),
        },
    }
    pc = {
        '$uid': {
            '.read': 'auth != null && auth.uid === $uid',
            '$opp': {
                '.write': 'auth != null && auth.uid === $uid && newData.exists()',
                '.validate': AND("newData.hasChildren(['d', 'n'])", "newData.child('d').isNumber()", "newData.child('n').isNumber()",
                                 f"newData.child('d').val() * {DAY} <= now", f"now < (newData.child('d').val() + 1) * {DAY}",
                                 "(data.exists() && data.child('d').val() === newData.child('d').val() ? newData.child('n').val() === data.child('n').val() + 1 : newData.child('n').val() === 1)"),
            },
        },
    }
    PL = "root.child('players').child($uid)"
    xfer = {
        '$uid': {
            '.write': 'auth != null && auth.uid === $uid',
            '.validate': AND("newData.hasChildren(['k', 'r'])", "newData.child('k').isString()", "newData.child('k').val().length >= 16",
                             "newData.child('k').val().length <= 64",
                             f"newData.child('r').val() === {PL}.child('rating').val()", f"newData.child('g').val() === {PL}.child('games').val()",
                             f"newData.child('w').val() === {PL}.child('wins').val()", f"newData.child('l').val() === {PL}.child('losses').val()",
                             f"newData.child('d').val() === {PL}.child('draws').val()"),
        },
    }
    xclaim = {
        '$uid': {
            '.write': 'auth != null && auth.uid === $uid',
            '.validate': "newData.hasChildren(['f', 'k']) && newData.child('f').isString() && newData.child('f').val().length <= 128 && newData.child('k').isString() && newData.child('k').val().length <= 64",
        },
    }

    # ------------------------------------------------------------------ games
    EL = "(now - data.child('t').val())"
    own = "(data.child('b').val() === auth.uid ? 'mb' : 'mw')"
    oth = "(data.child('b').val() === auth.uid ? 'mw' : 'mb')"
    tcv = f"data.child('{TCK}').val()"
    BYO = tern(tcv, {k: v[1] for k, v in P['tcs'].items()}, 0)
    INC = tern(tcv, {k: v[2] for k, v in P['tcs'].items()}, 0)
    MAINN = tern(f"newData.child('{TCK}').val()", {k: v[0] for k, v in P['tcs'].items()}, 0)
    M = f"data.child({own}).val()"
    NM = f"newData.child({own}).val()"
    USED = f"({EL} > {P['free']} ? {EL} - {P['free']} : 0)" if P['free'] else EL
    REM = f"({M} > {USED} ? {M} - {USED} : 0)"
    clocked = f"data.child('{TCK}').exists() && data.child('mb').isNumber() && data.child('mw').isNumber()"
    charge = AND(f"{EL} <= {M} + {P['free']} + {BYO} + {SLACK}", f"{NM} <= {REM} + {INC} + {SLACK}")
    legacy = f"{EL} <= {P['legacy_byo'] + SLACK}" if P['legacy_byo'] else 'true'
    moved = "newData.child('moves').val() !== data.child('moves').val()"
    tmoved = "newData.child('t').val() !== data.child('t').val()"
    if P['bg']:   # accepting a resignation (token x1..y3) is the one move that does not charge the mover
        clock_on_move = f"(!({moved}) || newData.child('moves').val().matches(/[xy][123]$/) || !({clocked}) || {charge})"
    else:
        clock_on_move = f"(!({moved}) || ({clocked} ? {charge} : {legacy}))"
    # my own clock never grows outside a charged move; the opponent's never changes
    clock_keep = AND(f"newData.child({oth}).val() === data.child({oth}).val()",
                     f"({moved} || !data.child({own}).isNumber() || {NM} <= {M})")
    turn = None
    if P['alt']:
        turn = f"(!({moved}) || (data.child('lm').exists() ? data.child('lm').val() !== auth.uid : (data.child('moves').val() !== '' || data.child('{P['first']}').val() === auth.uid)))"
    loser = "newData.child('loser').val()"
    other = AND(OR(f"{loser} === data.child('b').val()", f"{loser} === data.child('w').val()"), f"{loser} !== auth.uid")
    if P['first']:
        myturn_over = f"(data.child('lm').exists() ? data.child('lm').val() === auth.uid : (data.child('moves').val() === '' && data.child('{P['first']}').val() === {loser}))"
    else:
        myturn_over = None
    LK = f"({loser} === data.child('b').val() ? 'mb' : 'mw')"
    LBYO = BYO
    tout_time = f"({clocked} ? {EL} >= data.child({LK}).val() + {P['free']} + {LBYO} : {EL} >= {P['legacy_byo'] or 0})"
    timeout_ok = AND(other, myturn_over, tout_time, "newData.child('moves').val() === data.child('moves').val()")
    abandon_ok = AND(other, myturn_over, f"{EL} >= 45000", f"!root.child('presence').child({loser}).exists()",
                     "newData.child('moves').val() === data.child('moves').val()") if P['abandon'] else 'false'
    draw_ok = AND("data.child('offer').child('by').isString()", "data.child('offer').child('by').val() !== auth.uid",
                  OR("data.child('offer').child('by').val() === data.child('b').val()", "data.child('offer').child('by').val() === data.child('w').val()")) if P['draw'] else 'false'
    nst = "newData.child('status').val()"
    leave_play = (f"({nst} === 'play' ? !newData.child('loser').exists() : {nst} === 'resign' ? newData.child('loser').val() === auth.uid"
                  f" : {nst} === 'timeout' ? {timeout_ok} : {nst} === 'abandon' ? {abandon_ok} : {nst} === 'draw' ? {draw_ok}"
                  f" : {nst} === 'over')")
    draw_flag = f"({nst} === 'timeout' || newData.child('draw').val() === data.child('draw').val())"
    frozen = AND(f"{nst} === data.child('status').val()", "newData.child('loser').val() === data.child('loser').val()",
                 "newData.child('draw').val() === data.child('draw').val()", "newData.child('moves').val() === data.child('moves').val()",
                 "newData.child('t').val() === data.child('t').val()", "newData.child('mb').val() === data.child('mb').val()",
                 "newData.child('mw').val() === data.child('mw').val()",
                 "newData.child('mo').val() === data.child('mo').val()" if P['bg'] else None)
    imm_fields = ['b', 'w', 'bn', 'wn', 'br', 'wr', 'rated', 'created', 'room', 'host'] + P['imm']
    immut = AND(*[f"newData.child('{f}').val() === data.child('{f}').val()" for f in imm_fields],
                *([f"newData.child('sc').child('{i}').val() === data.child('sc').child('{i}').val()" for i in (0, 1)] if P['bg'] else []))
    keep = lambda node, u: f"(!data.child('{node}').child(data.child('{u}').val()).exists() || newData.child('{node}').child(data.child('{u}').val()).exists())"
    keeps = AND(keep('res', 'b'), keep('res', 'w'), keep('j', 'b'), keep('j', 'w'))
    tstamp = f"(!({tmoved}) || (newData.child('t').val() === now && newData.child('lm').val() === auth.uid))"
    lm_keep = f"({tmoved} || newData.child('lm').val() === data.child('lm').val())"
    update = AND(immut, keeps, tstamp, lm_keep,
                 f"(data.child('status').val() !== 'play' ? {frozen} : {AND('newData.child(' + q('moves') + ').val().beginsWith(data.child(' + q('moves') + ').val())', leave_play, turn, clock_on_move, clock_keep, draw_flag)})")
    # creation
    bn = "newData.child('b').val()"
    wn = "newData.child('w').val()"
    RP = lambda u: f"root.child('players').child({u})"
    rated_new = AND(f"root.child('lobby').child({bn}).exists()", f"root.child('lobby').child({wn}).exists()",
                    f"!root.child('open').child({bn}).exists()", f"!root.child('open').child({wn}).exists()",
                    f"newData.child('br').val() === {RP(bn)}.child('rating').val()", f"newData.child('wr').val() === {RP(wn)}.child('rating').val()",
                    "!newData.child('pv').exists()" if P['bg'] else None)
    if P['bg']:
        PV = "root.child('games').child(newData.child('pv').val())"
        rated_next = AND("newData.child('pv').isString()", f"{PV}.child('nx').val() === $gid", f"{PV}.child('b').val() === {bn}",
                         f"{PV}.child('w').val() === {wn}", f"{PV}.child('rated').val() === true", f"{PV}.child('status').val() === 'over'",
                         f"{PV}.child('mo').val() !== true", f"{PV}.child('br').val() === newData.child('br').val()",
                         f"{PV}.child('wr').val() === newData.child('wr').val()", f"{PV}.child('f').val() === newData.child('f').val()",
                         f"{PV}.child('mid').val() === newData.child('mid').val()",
                         f"{PV}.child('after').child('0').val() === newData.child('sc').child('0').val()",
                         f"{PV}.child('after').child('1').val() === newData.child('sc').child('1').val()",
                         f"root.child('open').child({bn}).val() === newData.child('pv').val()", f"root.child('open').child({wn}).val() === newData.child('pv').val()")
        rated_ok = OR(rated_new, rated_next)
    else:
        rated_ok = rated_new
    NRg = 'newData.parent().parent()'   # new root, seen from games/$gid
    create_g = AND("newData.child('status').val() === 'play'", "newData.child('moves').val() === ''",
                   "newData.child('created').val() === now", "newData.child('t').val() === now", f"{bn} !== {wn}",
                   "newData.child('b').isString()", "newData.child('w').isString()",
                   "!newData.child('loser').exists()", "!newData.child('res').exists()", "!newData.child('lm').exists()",
                   f"(!newData.child('mb').exists() || newData.child('mb').val() <= {MAINN})", f"(!newData.child('mw').exists() || newData.child('mw').val() <= {MAINN})",
                   f"(newData.child('rated').val() !== true || ({rated_ok} && {NRg}.child('open').child({bn}).val() === $gid && {NRg}.child('open').child({wn}).val() === $gid))")
    vfield = P.get('variant')
    shape = AND("newData.hasChildren(['b', 'w', 'moves', 'status'])", "newData.child('moves').isString()",
                f"newData.child('moves').val().length <= {P['moves_max']}", "newData.child('status').isString()",
                f"newData.child('{vfield[0]}').isString() && newData.child('{vfield[0]}').val().matches(/^({'|'.join(vfield[1])})$/)" if vfield else None,
                "newData.child('n').isNumber() && newData.child('n').val() >= 2 && newData.child('n').val() <= 6" if name == 'dots' else None)
    part = "(data.child('b').val() === auth.uid || data.child('w').val() === auth.uid)"
    games = {
        '$gid': {
            '.read': 'auth != null',
            '.write': OR(AND('auth != null', '!data.exists()', OR(f"{bn} === auth.uid", f"{wn} === auth.uid")),
                         AND('auth != null', part, 'newData.exists()'),
                         AND('auth != null', part, '!newData.exists()', "data.child('status').val() === 'play'", "data.child('moves').val() === ''",
                             OR("data.child('rated').val() !== true", AND("!data.child('j').exists()", "!data.child('pv').exists()")))),
            '.validate': AND(shape, f"(!data.exists() ? {create_g} : {update})"),
            'res': {
                '$u': {
                    '.validate': OR(AND('data.exists()', "newData.child('s').val() === data.child('s').val()", "newData.child('t').val() === data.child('t').val()"),
                                    AND('!data.exists()', '$u === auth.uid', "newData.hasChildren(['s', 't'])",
                                        "(newData.child('s').val() === 0 || newData.child('s').val() === 0.5 || newData.child('s').val() === 1)",
                                        "newData.child('t').val() === now",
                                        "(!data.parent().child(newData.parent().parent().child('b').val() === $u ? newData.parent().parent().child('w').val() : newData.parent().parent().child('b').val()).exists() || now - data.parent().child(newData.parent().parent().child('b').val() === $u ? newData.parent().parent().child('w').val() : newData.parent().parent().child('b').val()).child('t').val() <= " + str(FB) + ")")),
                },
            },
            'j': {'$u': {'.validate': "newData.val() === true && (data.exists() || $u === auth.uid)"}},
            'lm': {'.validate': 'newData.isString()'},
            't': {'.validate': 'newData.isNumber()'},
            'mb': {'.validate': 'newData.isNumber() && newData.val() >= 0'},
            'mw': {'.validate': 'newData.isNumber() && newData.val() >= 0'},
            'bn': {'.validate': 'newData.isString() && newData.val().length <= 16'},
            'wn': {'.validate': 'newData.isString() && newData.val().length <= 16'},
            'br': {'.validate': 'newData.isNumber()'},
            'wr': {'.validate': 'newData.isNumber()'},
        },
    }
    if P['draw']:
        games['$gid']['offer'] = {'.validate': "newData.child('by').val() === auth.uid || (data.exists() && newData.child('by').val() === data.child('by').val())"}

    # ------------------------------------------------------------------ lobby / rooms / chat / watch / presence / profiles / sync
    small = {'.validate': "newData.isString() ? newData.val().length <= 64 : (newData.isNumber() || newData.isBoolean())"}
    lobby = {
        '.read': 'auth != null',
        '$uid': {
            '.write': "auth != null && (auth.uid === $uid || (data.exists() && newData.exists() && !data.child('game').exists() && newData.child('name').val() === data.child('name').val() && newData.child('rating').val() === data.child('rating').val() && newData.child('since').val() === data.child('since').val()))",
            '.validate': "newData.hasChildren(['name', 'rating']) && newData.child('name').isString() && newData.child('name').val().length <= 16 && newData.child('rating').isNumber() && (auth.uid !== $uid || newData.child('rating').val() === root.child('players').child($uid).child('rating').val())",
            'game': {'.validate': 'newData.isString() && newData.val().length <= 64'},
            '$other': small,
        },
    }
    rooms = {
        '.read': 'auth != null',
        '$code': {
            '.write': "auth != null && (!data.exists() || data.child('host').val() === auth.uid || (!data.child('game').exists() && newData.child('host').val() === data.child('host').val()))",
            '.validate': "$code.matches(/^[A-Z0-9]{4,8}$/) && newData.hasChildren(['host']) && newData.child('host').isString() && (!newData.child('name').exists() || (newData.child('name').isString() && newData.child('name').val().length <= 16)) && (!newData.child('title').exists() || (newData.child('title').isString() && newData.child('title').val().length <= 24))",
            '$other': small,
        },
    }
    chat = {
        '.read': 'auth != null',
        'seq': {'.write': 'auth != null', '.validate': 'newData.isNumber() && ((!data.exists() && newData.val() === 1) || newData.val() === data.val() + 1)'},
        'msgs': {
            '$slot': {
                '.write': 'auth != null && newData.exists()',
                '.validate': "$slot.matches(/^(1[0-9]|[0-9])$/) && newData.hasChildren(['n', 'uid', 'name', 'text', 't']) && newData.child('uid').val() === auth.uid && newData.parent().parent().parent().child('chatLast').child(auth.uid).val() === now",
                'n': {'.validate': "newData.isNumber() && newData.val() >= 1 && newData.val() <= root.child('chat').child('seq').val()"},
                'uid': {'.validate': 'newData.isString()'},
                'name': {'.validate': 'newData.isString() && newData.val().length >= 1 && newData.val().length <= 16'},
                'text': {'.validate': 'newData.isString() && newData.val().length >= 1 && newData.val().length <= 100'},
                't': {'.validate': 'newData.isNumber() && newData.val() === now'},
                '$other': {'.validate': False},
            },
        },
    }
    chat_last = {'$uid': {'.write': 'auth != null && auth.uid === $uid && newData.exists()',
                          '.validate': 'newData.isNumber() && newData.val() === now && (!data.exists() || now - data.val() >= 3000)'}}
    watch = {'.read': 'auth != null', '$gid': {'$uid': {'.write': 'auth != null && auth.uid === $uid', '.validate': 'newData.isBoolean() && newData.val() === true'}}}
    presence = {
        '.read': 'auth != null',
        '$uid': {
            '.write': 'auth != null && auth.uid === $uid',
            '.validate': "newData.hasChildren(['name']) && newData.child('name').isString() && newData.child('name').val().length <= 16",
            '$other': small,
        },
    }
    profiles = {
        '.read': 'auth != null',
        '$uid': {
            '.write': 'auth != null && auth.uid === $uid',
            '.validate': "newData.hasChildren(['n']) && newData.child('n').isString() && newData.child('n').val().length >= 1 && newData.child('n').val().length <= 16",
            '$other': small,
        },
    }
    sync = {
        '$uid': {
            '.read': 'auth != null && auth.uid === $uid',
            '.write': 'auth != null && auth.uid === $uid',
            '.validate': "newData.hasChildren(['d', 't']) && newData.child('d').isString() && newData.child('d').val().length <= 400000 && newData.child('t').isNumber()",
        },
    }
    if P['bg']:
        sync['$uid']['k'] = {'.validate': 'newData.isString() && newData.val().length <= 64'}
    return {'rules': {
        'secv': {'.read': 'auth != null'},          # probe: readable only under these rules (the client switches to the secure protocol)
        'players': players, 'open': open_, 'pc': pc, 'xfer': xfer, 'xclaim': xclaim,
        'lobby': lobby, 'rooms': rooms, 'games': games, 'chat': chat, 'chatLast': chat_last, 'watch': watch,
        'presence': presence, 'profiles': profiles, 'sync': sync,
    }}


def main():
    check = '--check' in sys.argv
    only = [a for a in sys.argv[1:] if not a.startswith('--')]
    for name, P in GAMES.items():
        if only and name not in only:
            continue
        path = os.path.join(ROOT, name, 'database.rules.json')
        txt = json.dumps(build(name, P), indent=2, ensure_ascii=False) + '\n'
        cur = open(path, encoding='utf-8').read() if os.path.exists(path) else ''
        if check:
            print(('same  ' if cur == txt else 'DIFF  ') + path)
        else:
            open(path, 'w', encoding='utf-8').write(txt)
            print('wrote', path, len(txt), 'bytes')


if __name__ == '__main__':
    main()
