#!/usr/bin/env python3
# Experiment: the evaluation as a small network over the patterns, instead of a sum of table values.
#   every pattern instance (62) and extra (4) looks up a D-vector for its state; the vectors are added (the accumulator),
#   squared-clipped, and a small fully connected part (one per group of 4 phases) gives the value; a bias per phase.
#   --residual: the network only learns a correction on top of the given tables (kept as they are).
#   python3 pnet.py D H steps out [--residual] [--init out.pt] [--lr 1e-3] [--batch 16384] [--weights w.bin.gz] [--ref ref]
#                  [--seq] [--train train.x] [--valid valid.x] [--device mps|cuda|cpu]
#   --seq: read train.x from the start in blocks of 64 batches, shuffled inside a block (a large file from rvx, which
#          has the plies mixed; without it every batch is drawn at random from the whole file — fine when it fits in memory)
# Needs train.x / valid.x (netz-conv.js) in the current folder; --ref ref: ref.x + ref.ref from netz-ref.js (Edax's values).
# Prints the error against the game results (valid.x) and against Edax (static value, by empties) next to the tables'.
import sys, time, gzip, os, numpy as np, torch
A=sys.argv[1:]
def opt(k,d): return type(d)(A[A.index('--'+k)+1]) if '--'+k in A else d
D,H,STEPS,OUT=int(A[0]),int(A[1]),int(A[2]),A[3]
RES='--residual' in A; SEQ='--seq' in A; TRF,VAF=opt('train','train.x'),opt('valid','valid.x')
DEV=opt('device','mps' if torch.backends.mps.is_available() else 'cuda' if torch.cuda.is_available() else 'cpu')
INIT,LR,BATCH,REF=opt('init',''),opt('lr',1e-3),opt('batch',16384),opt('ref','')
WFILE=opt('weights',os.path.join(os.path.dirname(os.path.abspath(__file__)),'../../../weights.bin.gz'))
torch.manual_seed(1); np.random.seed(1)
PS=403718; NPH=60; EXT_OFF=403461; NB=15
PATS=[('corner3x3',9,0,4),('corner2x5',10,19683,8),('edge2x',10,78732,4),('hv2',8,137781,4),('hv3',8,144342,4),('hv4',8,150903,4),('diag8',8,157464,2),('diag7',7,164025,4),('diag6',6,166212,4),('diag5',5,166941,4),('diag4',4,167184,4),('triangle',10,167265,4),('cornerBlock',10,226314,4),('diag8c',10,285363,4),('narrowTri',10,344412,4)]
PHASE=np.minimum(NPH-1,np.arange(61)*NPH//61)
OFF=np.array([off for n,l,off,ni in PATS for j in range(ni)]+[EXT_OFF+64*j for j in range(4)],dtype=np.int64)   # 66 columns
def load(path):
    a=np.frombuffer(gzip.open(path).read(),dtype='<i2'); Hd=int(a[2]); n=len(a)-Hd
    b=a[Hd:].view(np.uint8); w=(b[:n].astype(np.int32)|(b[n:].astype(np.int32)<<8)).astype(np.int16).reshape(NPH,-1)
    return np.cumsum(w.astype(np.int64),axis=0).astype(np.int16).astype(np.int32)*int(a[7])
w=load(WFILE)
REC=np.dtype([('i','<u2',62),('e','u1',4),('ply','u1'),('t','i1')])
TR=np.memmap(TRF,dtype=REC,mode='r'); VA=np.fromfile(VAF,dtype=REC); VA=VA[::max(1,len(VA)//500000)]
print('train',len(TR),'valid',len(VA),'device',DEV,flush=True)
def feats(r):
    idx=np.concatenate([r['i'].astype(np.int64),r['e'].astype(np.int64)],axis=1)+OFF[None,:]
    return idx, PHASE[r['ply']].astype(np.int64)
def tab(r):                                   # the tables' value, in discs
    idx,ph=feats(r); return (w[ph[:,None],idx].sum(1)+w[ph,PS-1])/32.0
class Net(torch.nn.Module):
    def __init__(s):
        super().__init__()
        s.emb=torch.nn.Embedding(PS,D); torch.nn.init.normal_(s.emb.weight,0,0.05)
        s.l1=torch.nn.Linear(D,H*NB); s.l2=torch.nn.Linear(H,NB); s.sk=torch.nn.Linear(D,NB); s.bias=torch.nn.Parameter(torch.zeros(NPH))
    def forward(s,idx,ph):
        a=s.emb(idx).sum(1); x=torch.clamp(a,0,1)**2; b=ph//4; n=len(ph); ar=torch.arange(n,device=ph.device)
        h=torch.clamp(s.l1(x).view(n,NB,H)[ar,b],0,1)
        return ((h*s.l2.weight[b]).sum(1)+s.l2.bias[b]+s.sk(a)[ar,b])*16+s.bias[ph]
net=Net()
if INIT: net.load_state_dict(torch.load(INIT,map_location='cpu'))
net.to(DEV)
T=lambda a: torch.tensor(a,device=DEV)
opt_=torch.optim.AdamW(net.parameters(),lr=LR,weight_decay=0)
sched=torch.optim.lr_scheduler.OneCycleLR(opt_,max_lr=LR,total_steps=max(STEPS,100),pct_start=0.03)
def pred(r):
    with torch.no_grad():
        out=[]
        for k in range(0,len(r),65536):
            q=r[k:k+65536]; idx,ph=feats(q); p=net(T(idx),T(ph)).cpu().numpy()
            out.append(p+tab(q) if RES else p)
        return np.concatenate(out)
def rep(label,p,r):
    d=p-r['t']; pl=r['ply']
    print('%-20s rmse %.4f mae %.4f | plies 8-19 %.3f 20-29 %.3f 30-39 %.3f 40-49 %.3f 50-59 %.3f'%((label,np.sqrt((d**2).mean()),np.abs(d).mean())+tuple(np.sqrt((d[(pl>=a)&(pl<b)]**2).mean()) for a,b in ((8,20),(20,30),(30,40),(40,50),(50,60)))),flush=True)
if REF: RX=np.fromfile(REF+'.x',dtype=REC); RV=np.fromfile(REF+'.ref',dtype=np.int8).astype(np.float64)
def repref(label,p):
    if not REF: return
    d=p-RV; e=60-RX['ply'].astype(int)
    print('%-20s vs Edax, mae (bias): '%label+'  '.join('e%d %.2f (%+.2f)'%(k,np.abs(d[e==k]).mean(),d[e==k].mean()) for k in sorted(set(e),reverse=True))+'  | all %.3f'%np.abs(d).mean(),flush=True)
rep('tables',tab(VA),VA); 
if REF: repref('tables',tab(RX))
t0=time.time()
for s in range(STEPS+1):
    if s%1000==0 or s==STEPS:
        rep('step %d (%.0f min)'%(s,(time.time()-t0)/60),pred(VA),VA)
        if REF and (s%4000==0 or s==STEPS): repref('step %d'%s,pred(RX))
    if s==STEPS: break
    if SEQ:
        if s%64==0:
            a0=(s//64*64*BATCH)%max(1,len(TR)-64*BATCH); blk=np.array(TR[a0:a0+64*BATCH]); np.random.shuffle(blk)
        r=blk[(s%64)*BATCH:(s%64+1)*BATCH]
    else: r=TR[np.sort(np.random.randint(0,len(TR),BATCH))]
    idx,ph=feats(r)
    y=T(r['t'].astype(np.float32)-(tab(r).astype(np.float32) if RES else 0))
    opt_.zero_grad(); loss=((net(T(idx),T(ph))-y)**2).mean(); loss.backward(); opt_.step(); sched.step()
    if s%4000==3999: torch.save(net.state_dict(),OUT+'.pt')
torch.save(net.state_dict(),OUT+'.pt')
print('parameters: embeddings %d x %d = %.1fM, the rest %d'%(PS,D,PS*D/1e6,sum(p.numel() for n_,p in net.named_parameters() if not n_.startswith('emb'))))
