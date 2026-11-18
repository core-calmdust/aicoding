# python3 refine.py <game> <pairs.jsonl...>: new-scale pairs → a composed LVMAP (prints), equal steps from Lv.1 to Lv.20
import json,sys,re
g=sys.argv[1]; rows=[json.loads(l) for f in sys.argv[2:] for l in open(f) if l.strip()]; rows=[r for r in rows if r['G']==g]
K=list(range(1,21)); E={k:k*30.0 for k in K}
for it in range(6000):
    gr={k:0.0 for k in K}; cnt={k:1 for k in K}
    for r in rows:
        n=r['wa']+r['wb']+r['dr']; sa=r['wa']+.5*r['dr']; p=1/(1+10**((E[r['B']]-E[r['A']])/400))
        gr[r['A']]+=sa-n*p; gr[r['B']]-=sa-n*p; cnt[r['A']]+=n; cnt[r['B']]+=n
    for k in K: E[k]+=gr[k]/cnt[k]*60
    m=E[1]; E={k:E[k]-m for k in K}
v=[E[k] for k in K]
# smooth: 3-point moving average then isotonic
sm=[v[0]]+[(v[i-1]+v[i]+v[i+1])/3 for i in range(1,19)]+[v[19]]
iso=sm[:]
for i in range(1,20): iso[i]=max(iso[i],iso[i-1])
print('elo',' '.join(f'{x:.0f}' for x in v)); print('smooth',' '.join(f'{x:.0f}' for x in iso))
def Ex(x):
    i=min(18,int(x)-1); f=x-1-i; return iso[i]+(iso[i+1]-iso[i])*f
def inv(e):
    lo,hi=1.0,20.0
    for _ in range(60):
        m=(lo+hi)/2
        if Ex(m)<e: lo=m
        else: hi=m
    return (lo+hi)/2
top=iso[19]; X=[1.0]+[inv(top*i/19) for i in range(1,19)]+[20.0]
src=open(f'/home/claude/aicoding/{g}/engine.js').read(); L=json.loads(re.search(r'const LVMAP = (\[[^\]]*\])',src).group(1))
def lm(x):
    i=min(18,int(x)-1); f=x-1-i; return L[i]+(L[i+1]-L[i])*f
T=[lm(x) for x in X]; print('newx',' '.join(f'{x:.2f}' for x in X)); print('LVMAP',json.dumps([round(t,2) for t in T]))
t=json.load(open('tables.json')); t[g]=T; json.dump(t,open('tables.json','w'))
