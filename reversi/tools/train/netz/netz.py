#!/usr/bin/env python3
# Experiment (2026-11-23): the pattern tables as the output of small networks — one per pattern: its cells (player /
# opponent one-hot) -> 60 values (one per phase) — trained directly on positions. The engine would expand the tables
# once at load, so the search is unchanged; only the download shrinks (64-64: 138k parameters, about 0.26 MB as float16,
# against 12.8 MB). Results and how to read them: claude/reversi-mac-verification.md「評価の圧縮」.
#   pip install torch numpy
#   node netz-conv.js train.x <positions.bin…>; node netz-conv.js valid.x <held-out positions.bin>   (17-byte records of rvtrain)
#   python3 netz.py H1 H2 steps out [--init out.pt] [--lam 20] [--lr 1e-3] [--batch 65536] [--weights ../../../weights.bin.gz]
# Writes out.pt (the networks), out.bin.gz (the expanded tables as a v5 weights file, to play it with the engine as it
# is: tools/edax-anchor.js --weights) and prints the validation error next to the tables' it started from.
#   --lam: also pull the tables towards the given weights' (the teacher), each entry weighted by how often it occurs in
#          train.x; the phases with no positions (plies 0-7) only have this. 0 = positions only.
# The phase of a position is the engine's: ply * 60 / 61 rounded down (ply 8 -> phase 7) — not the ply itself.
import sys, time, gzip, zlib, os, numpy as np, torch
A=sys.argv[1:]
def opt(k,d):
    return type(d)(A[A.index('--'+k)+1]) if '--'+k in A else d
H1,H2,STEPS,OUT=int(A[0]),int(A[1]),int(A[2]),A[3]
INIT,LAM,LR,BATCH=opt('init',''),opt('lam',20.0),opt('lr',1e-3),opt('batch',65536)
WFILE=opt('weights',os.path.join(os.path.dirname(os.path.abspath(__file__)),'../../../weights.bin.gz'))
torch.manual_seed(1); np.random.seed(1)
PS=403718; NPH=60; EXT_OFF=403461          # pattern set B + 4 extras (engine.js PATTERN_DEFS_B): name, cells, offset, instances
PATS=[('corner3x3',9,0,4),('corner2x5',10,19683,8),('edge2x',10,78732,4),('hv2',8,137781,4),('hv3',8,144342,4),('hv4',8,150903,4),('diag8',8,157464,2),('diag7',7,164025,4),('diag6',6,166212,4),('diag5',5,166941,4),('diag4',4,167184,4),('triangle',10,167265,4),('cornerBlock',10,226314,4),('diag8c',10,285363,4),('narrowTri',10,344412,4)]
PHASE=np.minimum(NPH-1,np.arange(61)*NPH//61)
def load(path):                              # v5 file -> header, tables int32 [60, PS] in 1/32 disc
    a=np.frombuffer(gzip.open(path).read(),dtype='<i2'); H=int(a[2]); n=len(a)-H
    b=a[H:].view(np.uint8); w=(b[:n].astype(np.int32)|(b[n:].astype(np.int32)<<8)).astype(np.int16).reshape(NPH,-1)
    return a[:H].copy(), np.cumsum(w.astype(np.int64),axis=0).astype(np.int16).astype(np.int32)*int(a[7])
def save(path,h,w):                          # the same layout back (phase differences, byte planes)
    s=np.round(w/int(h[7])).astype(np.int16); d=np.diff(s,axis=0,prepend=np.zeros((1,PS),dtype=np.int16)).astype(np.int16)
    b=d.reshape(-1).view(np.uint8); open(path,'wb').write(gzip.compress(h.tobytes()+b[0::2].tobytes()+b[1::2].tobytes(),9))
def cells(l):
    idx=np.arange(3**l); x=np.zeros((3**l,2*l),dtype=np.float32)
    for k in range(l):
        c=(idx//3**(l-1-k))%3; x[:,k]=(c==1); x[:,l+k]=(c==2)
    return torch.tensor(x)
h,w=load(WFILE)
REC=np.dtype([('i','<u2',62),('e','u1',4),('ply','u1'),('t','i1')])
TR=np.memmap('train.x',dtype=REC,mode='r'); VA=np.fromfile('valid.x',dtype=REC)
print('train',len(TR),'valid',len(VA),flush=True)
st=torch.load(INIT) if INIT else None
nets=[]; Xs=[]; Y0=[]; W0=[]; cols=[]; c=0
smp=TR[::max(1,len(TR)//4000000)]; sph=PHASE[smp['ply']]
for name,l,off,ni in PATS:
    net=torch.nn.Sequential(torch.nn.Linear(2*l,H1),torch.nn.ReLU(),torch.nn.Linear(H1,H2),torch.nn.ReLU(),torch.nn.Linear(H2,NPH))
    if st: net.load_state_dict(st['nets'][len(nets)])
    C=np.zeros((3**l,NPH),dtype=np.float32)                                  # how often each entry occurs (a sample of train.x)
    for j in range(c,c+ni): np.add.at(C,(smp['i'][:,j].astype(np.int64),sph),1)
    nets.append(net); Xs.append(cells(l)); cols.append((c,c+ni)); c+=ni
    Y0.append(torch.tensor(w[:,off:off+3**l].T.astype(np.float32)/32)); W0.append(torch.tensor((C+0.02)/(C.mean()+0.02)))
ext=torch.nn.Parameter(st['ext'] if st else torch.tensor(w[:,EXT_OFF:EXT_OFF+256].reshape(NPH,4,64).astype(np.float32)/32))
bias=torch.nn.Parameter(st['bias'] if st else torch.tensor(w[:,PS-1].astype(np.float32)/32))
params=[p for n in nets for p in n.parameters()]
opt_=torch.optim.Adam([{'params':params},{'params':[ext,bias]}],lr=LR)
sched=torch.optim.lr_scheduler.OneCycleLR(opt_,max_lr=[LR,5e-4],total_steps=max(STEPS,100),pct_start=0.05)
def tables(): return [n(x) for n,x in zip(nets,Xs)]
def predict(T,r):
    ph=torch.tensor(PHASE[r['ply']].astype(np.int64)); idx=torch.tensor(r['i'].astype(np.int64)); e=torch.tensor(r['e'].astype(np.int64))
    s=bias[ph]+ext[ph[:,None],torch.arange(4)[None,:],e].sum(1)
    for t,(a,b) in zip(T,cols): s=s+t[idx[:,a:b],ph[:,None]].sum(1)
    return s
def tab_predict(wt,r):                       # the same with plain tables, as the engine evaluates
    ph=PHASE[r['ply']].astype(np.int64); s=wt[ph,PS-1].astype(np.int64)
    for j in range(4): s+=wt[ph,EXT_OFF+64*j+r['e'][:,j].astype(np.int64)]
    c=0
    for name,l,off,ni in PATS:
        for j in range(ni): s+=wt[ph,off+r['i'][:,c+j].astype(np.int64)]
        c+=ni
    return s/32.0
def report(label,p,r):
    d=p-r['t']; pl=r['ply']
    print('%-22s rmse %.4f  mae %.4f | plies 8-19 %.3f 20-29 %.3f 30-39 %.3f 40-49 %.3f 50-59 %.3f'%((label,np.sqrt((d**2).mean()),np.abs(d).mean())+tuple(np.sqrt((d[(pl>=a)&(pl<b)]**2).mean()) for a,b in ((8,20),(20,30),(30,40),(40,50),(50,60)))),flush=True)
VS=VA[::13]; report('given tables',tab_predict(w,VA),VA); t0=time.time()
for s in range(STEPS+1):
    if s%250==0 or s==STEPS:
        with torch.no_grad(): report('step %d (%.0f min)'%(s,(time.time()-t0)/60),predict(tables(),VS).numpy(),VS)
    if s==STEPS: break
    r=TR[np.sort(np.random.randint(0,len(TR),BATCH))]
    opt_.zero_grad(); T=tables()
    loss=((predict(T,r)-torch.tensor(r['t'].astype(np.float32)))**2).mean()
    keep=sum((wt*(t-y)**2)[:,(slice(None) if LAM else slice(0,7))].mean() for t,y,wt in zip(T,Y0,W0))*(LAM or 1.0)
    (loss+keep).backward(); opt_.step(); sched.step()
with torch.no_grad(): T=tables()
w1=w.copy()
for t,(name,l,off,ni) in zip(T,PATS): w1[:,off:off+3**l]=np.round(t.numpy().T*32)
w1[:,EXT_OFF:EXT_OFF+256]=np.round(ext.detach().numpy().reshape(NPH,256)*32); w1[:,PS-1]=np.round(bias.detach().numpy()*32)
report('written tables',tab_predict(w1,VA),VA)
save(OUT+'.bin.gz',h,w1); torch.save({'nets':[n.state_dict() for n in nets],'ext':ext.detach(),'bias':bias.detach()},OUT+'.pt')
blob=b''.join(p.detach().numpy().astype(np.float16).tobytes() for p in params)+np.round(ext.detach().numpy()*16).astype(np.int16).tobytes()
print('parameters %d, as float16 + gzip about %.0f KB (the tables: %.1f MB)'%(sum(p.numel() for p in params),len(zlib.compress(blob,9))/1e3,os.path.getsize(WFILE)/1e6))
