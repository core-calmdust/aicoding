# theme definitions: objective criteria on the features computed by feat.js
def T(F, g):
    t = g['type']; e = F['e']; nm = F['nm']
    out = {}
    out['parityOk'] = F['regSol'] % 2 == 1 and F['evenRegMoves'] > 0 and F['failEven'] > 0 and F['nReg'] >= 2
    out['parity']   = F['regSol'] % 2 == 0 and F['oddRegMoves'] > 0 and F['failOdd'] > 0
    out['pass']     = F['passes'] > 0
    out['greedy']   = F['nMaxF'] == 1 and F['fsol'] < F['maxF'] and F['maxFFail'] and nm >= 3
    out['corner']   = F['cornerMoves'] > 0 and F['cornerFail'] == F['cornerMoves'] and not F['solCorner']
    out['xc']       = F['solX'] or F['solC']
    out['quiet']    = F['fsol'] == F['minF'] and F['nMinF'] == 1 and nm >= 3 and F['maxF'] - F['minF'] >= 3
    out['edge']     = F['solEdge'] and F['nonEdgeMoves'] > 0 and nm >= 3
    out['block']    = F['oppMob'] == F['minOppMob'] and F['nMinOpp'] == 1 and F['maxOppMob'] - F['oppMob'] >= 2
    out['draw']     = t == 'draw'
    out['margin']   = t == 'margin' and F['nWin'] >= 2
    out['surprise'] = nm >= 4 and F['shRank'] >= max(2, nm // 2)
    out['only']     = t == 'win' and nm >= 6 and F['nLose'] == nm - 1
    out['comeback'] = t in ('win', 'margin', 'wipe') and F['mine'] * 10 <= (F['mine'] + F['theirs']) * 3
    out['wipe']     = t == 'wipe' and e >= 3
    out['sym']      = F['emptySym'] != 0 and e >= 4
    out['close']    = t == 'win' and F['best'] == 2 and nm >= 3
    return [k for k, v in out.items() if v]
