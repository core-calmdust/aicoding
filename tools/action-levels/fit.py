import json,sys,math,collections
rows=[json.loads(l) for f in sys.argv[1:] for l in open(f) if l.strip()]
by=collections.defaultdict(list)
for r in rows: by[r['G']].append(r)
out={}
for g,rs in by.items():
    K=sorted(set([r['A'] for r in rs]+[r['B'] for r in rs]))
    E={k:0.0 for k in K}
    for it in range(3000):
        grad={k:0.0 for k in K}
        for r in rs:
            n=r['wa']+r['wb']+r['dr']; sa=r['wa']+.5*r['dr']
            p=1/(1+10**((E[r['B']]-E[r['A']])/400))
            grad[r['A']]+=sa-n*p; grad[r['B']]-= sa-n*p
        for k in K: E[k]+=grad[k]*2.0/ max(1,sum(r['wa']+r['wb']+r['dr'] for r in rs if k in(r['A'],r['B'])))*40
        m=E[K[0]]
        for k in K: E[k]-=m
    out[g]=E
    print(g,' '.join(f'{k}:{E[k]:.0f}' for k in K))
json.dump(out,open('elo.json','w'))
