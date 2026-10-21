import json,sys,math,collections
files=sys.argv[1:]
games=[]
for f in files:
  for l in open(f):
    if l.strip(): games.append(json.loads(l))
key=lambda x:(0,int(x)) if x.isdigit() else (1,x)
pl=sorted({g['a'] for g in games}|{g['b'] for g in games}, key=key)
idx={p:i for i,p in enumerate(pl)}
n=len(pl); R=[0.0]*n
cnt=[0]*n
for g in games: cnt[idx[g['a']]]+=1; cnt[idx[g['b']]]+=1
for it in range(4000):
  grad=[0.0]*n
  for g in games:
    a,b=idx[g['a']],idx[g['b']]; e=1/(1+10**((R[b]-R[a])/400)); d=g['res']-e
    grad[a]+=d; grad[b]-=d
  for i in range(n): R[i]+=60*grad[i]/max(1,cnt[i])
  # weak prior to keep 0%/100% pairs finite
  m=R[0]; R=[r-m for r in R]
pair=collections.defaultdict(lambda:[0,0,0,0])
for g in games:
  k=(g['a'],g['b']); pair[k][0]+=g['res']; pair[k][1]+=1; pair[k][2]+=g['msA']; pair[k][3]+=g['msB']
for k,v in sorted(pair.items(), key=lambda kv:(key(kv[0][0]), key(kv[0][1]))):
  s=v[0]/v[1]; s2=min(max(s,0.01),0.99)
  print(f"{k[0]:>4} vs {k[1]:>4}: {v[0]:5.1f}/{v[1]:3d} = {s:.3f}  ({-400*math.log10(1/s2-1):+5.0f})  ms/move {v[2]/v[1]:.0f} / {v[3]/v[1]:.0f}")
print()
for p in pl: print(f"{p:>5}: {R[idx[p]]:7.0f}")
