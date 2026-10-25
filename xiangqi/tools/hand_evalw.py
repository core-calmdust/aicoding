# Hand-written starting weights for the linear evaluation (engine.c), before tuning (tools/tune.py).
# Writes tools/evalw.h. Units: 1/8 point (a pawn before the river is about 70 points).
import sys
NF_PST = 7 * 50
EXTRA = ['MOB_R', 'MOB_N', 'MOB_C', 'HOLLOW', 'SCREEN', 'NOADV_R', 'NOADV_N', 'NOADV_C', 'NOELE_C', 'NOELE_R', 'PAWNPAIR', 'FULLDEF', 'NCROSS', 'KINGOUT', 'ROOKS0']
NF = NF_PST + len(EXTRA)
mg = [0.0] * NF; eg = [0.0] * NF
def pst(t, rr, fc, a, b): i = (t - 1) * 50 + rr * 5 + fc; mg[i] = a; eg[i] = b
# king
for rr, row in enumerate([(5, 10), (-10, -5), (-25, -20)]):
    pst(1, rr, 3, row[0], [0, 5, 0][rr]); pst(1, rr, 4, row[1], [5, 10, 5][rr])
# advisor
pst(2, 0, 3, 120, 140); pst(2, 1, 4, 130, 150); pst(2, 2, 3, 115, 135)
# elephant
pst(3, 0, 2, 120, 130); pst(3, 2, 4, 135, 140); pst(3, 2, 0, 110, 120); pst(3, 4, 2, 115, 125)
adv = [-15, -5, 0, 5, 12, 20, 25, 30, 25, 5]; cen = [-15, -3, 5, 5, 0]
for rr in range(10):
    for fc in range(5):
        v = adv[rr] + cen[fc] + (20 if (rr, fc) in [(7, 2), (8, 3), (6, 3)] else 0)
        pst(4, rr, fc, 380 + v, 420 + v)
radv = [-5, 0, 0, 5, 10, 10, 10, 15, 15, 10]; rcen = [0, 5, 5, 8, 5]
for rr in range(10):
    for fc in range(5): pst(5, rr, fc, 900 + radv[rr] + rcen[fc], 950 + radv[rr] // 2 + rcen[fc])
cadv = [5, 5, 3, 0, 0, 0, 0, 5, 10, 0]
for rr in range(10):
    for fc in range(5): pst(6, rr, fc, 420 + cadv[rr] + (20 if fc == 4 else 0), 380 + cadv[rr] // 2)
for rr in range(10):
    for fc in range(5):
        if rr <= 4:
            a = 70 + (5 if rr == 4 else 0) + (5 if fc == 4 else 0); b = 90 + (5 if rr == 4 else 0)
        else:
            bonus = [40, 60, 80, 90, 30][rr - 5] + [0, 5, 15, 25, 30][fc]
            a = 70 + bonus; b = 100 + bonus * 1.2
        pst(7, rr, fc, a, b)
X = dict(MOB_R=(3, 3), MOB_N=(8, 10), MOB_C=(2, 2), HOLLOW=(60, 20), SCREEN=(15, 5), NOADV_R=(20, 25), NOADV_N=(25, 20), NOADV_C=(10, 5),
         NOELE_C=(20, 15), NOELE_R=(5, 10), PAWNPAIR=(15, 20), FULLDEF=(20, 10), NCROSS=(5, 5), KINGOUT=(-10, 0), ROOKS0=(0, 0))
for j, k in enumerate(EXTRA): mg[NF_PST + j], eg[NF_PST + j] = X[k]
W = [round(v * 8) for v in mg] + [round(v * 8) for v in eg] + [10 * 8]
out = sys.argv[1] if len(sys.argv) > 1 else 'tools/evalw.h'
with open(out, 'w') as f:
    f.write('// Evaluation weights for engine.c (1/8 point): [middlegame features][endgame features][tempo]\n')
    f.write('// hand-written starting values (tools/hand_evalw.py)\n')
    f.write('static const i32 EVALW[%d] = {\n' % len(W))
    for i in range(0, len(W), 25): f.write('  ' + ', '.join(str(x) for x in W[i:i + 25]) + ',\n')
    f.write('};\n')
print(len(W))
