# Compares the faces of the Kofuku-ji pieces in a render (atlas/tools/exeval.html, straight from above on white) with the faces in
# the studio photograph (文化遺産オンライン 413142), and gives 0–100 per aspect: 100 = statistically the same as the photograph.
#   python3 atlas/museum/tools/kofukuji-score.py render.png --photos=<dir> [--faces]
# render.png: atlas/tools/exeval.html?id=kofukuji&px=2880 (80 px/cm). photoR.png / photoL.png: the photograph's right and left parts,
# enlarged 3x and 4x from the page's 667 px picture (see claude/museum-spec.md).
# The photograph's faces: quads read off two enlargements (photoR.png 3x, photoL.png 4x), set square at 76 px/cm.
import cv2, numpy as np, sys
PXCM=76
PHOTO_PXCM=24
QUADS={'photoR.png':[[(75,112),(262,142),(213,300),(22,262)],[(325,142),(505,180),(440,355),(262,318)],[(72,385),(272,420),(215,622),(5,570)],[(350,418),(560,460),(500,672),(280,612)],[(632,497),(805,545),(760,725),(575,685)]],
       'photoL.png':[[(815,68),(993,103),(910,333),(716,292)],[(385,385),(635,440),(520,685),(252,620)],[(742,440),(990,490),(880,750),(628,690)]]}
def lab(im, white): 
    f=np.clip(im.astype(np.float32)/np.float32(white),0,1); return cv2.cvtColor(f[...,::-1].copy() if False else f, cv2.COLOR_BGR2Lab)
def photo_faces(d='.'):   # d: the folder with the two enlargements of the photograph (not kept in the repository)
    out=[]
    for f,qs in QUADS.items():
        im=cv2.imread(f'{d}/{f}'); g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY); white=np.percentile(im[g>np.percentile(g,60)].reshape(-1,3),50,axis=0)
        for q in qs:
            q=np.float32(q); w=(np.linalg.norm(q[1]-q[0])+np.linalg.norm(q[2]-q[3]))/2; h=(np.linalg.norm(q[3]-q[0])+np.linalg.norm(q[2]-q[1]))/2
            W=int(2.4*PXCM); H=int(W*h/w*1.25)   # (seen at an angle: the length is foreshortened by about 1.25)
            M=cv2.getPerspectiveTransform(q,np.float32([[0,0],[W,0],[W,H],[0,H]])); r=cv2.warpPerspective(im,M,(W,H),flags=cv2.INTER_AREA)
            mx,my=int(W*.1),int(H*.1); out.append(lab(r[my:H-my,mx:W-mx],white))
    return out
def render_faces(path, pxcm_in=80):
    im=cv2.imread(path); g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY); white=np.float32([np.percentile(im[...,c],90) for c in range(3)])
    m=(g<np.percentile(g,90)-25).astype(np.uint8); m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((9,9),np.uint8)); n,lb,st,_=cv2.connectedComponentsWithStats(m,8); out=[]
    for i in range(1,n):
        x,y,w,h,a=st[i]
        if not (1.2*pxcm_in<w<4.5*pxcm_in and 1.2*pxcm_in<h<4.5*pxcm_in and a>2.2*pxcm_in*pxcm_in): continue
        cs,_=cv2.findContours((lb==i).astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE); (cx,cy),(rw,rh),ang=cv2.minAreaRect(cs[0])
        if rw>rh: rw,rh=rh,rw; ang+=90
        M=cv2.getRotationMatrix2D((cx,cy),ang,PXCM/pxcm_in); W=int(rw*PXCM/pxcm_in); H=int(rh*PXCM/pxcm_in); M[0,2]+=W/2-cx; M[1,2]+=H/2-cy
        r=cv2.warpAffine(im,M,(W,H),flags=cv2.INTER_AREA,borderValue=(255,255,255))
        # the photograph is small (a piece is about 60 px across; the enlargements only magnify that): the render is brought to the same
        # fineness before it is compared — reduced to 24 px/cm, then enlarged again — or it would be marked down for detail the photograph cannot hold
        k=PHOTO_PXCM/PXCM; r=cv2.resize(cv2.resize(r,(max(8,int(W*k)),max(8,int(H*k))),interpolation=cv2.INTER_LANCZOS4),(W,H),interpolation=cv2.INTER_CUBIC)
        mx,my=int(W*.12),int(H*.14); out.append(lab(r[my:H-my,mx:W-mx],white))
    return out
def stats(F):
    Ls=np.concatenate([f[...,0].ravel() for f in F]); hist=np.histogram(Ls,bins=25,range=(0,100))[0].astype(float); hist/=hist.sum()
    wood=[]; spec=[]; amp=[]; ink1=[]; ink2=[]; solid=[]; cross=[]; pieceL=[]
    for f in F:
        L=f[...,0]; med=np.median(L); wm=L>np.percentile(L,45); wood.append(f[wm].mean(0)); pieceL.append(med)
        hp=L-cv2.GaussianBlur(L,(0,0),6); W=L.shape[1]; n=128 if W>=128 else 64; x0=(W-n)//2
        ps=np.abs(np.fft.rfft(hp[:,x0:x0+n]*np.hanning(n),axis=1))**2; ps=ps.mean(0)[1:n//2]; 
        if n==64: ps=np.interp(np.arange(63),np.arange(31)*2,ps[:31])
        spec.append(ps/ps.sum()); amp.append(hp.std()/max(1,med))
        hy=L-cv2.GaussianBlur(L,(0,0),6); gx=np.abs(np.diff(hy,axis=1)).mean(); gy=np.abs(np.diff(hy,axis=0)).mean(); cross.append(gy/max(1e-6,gx))
        base=cv2.medianBlur(np.clip(L*2.55,0,255).astype(np.uint8),31).astype(np.float32)/2.55; base=np.maximum(base,med*.9)
        d1=(L<base*.78); d2=(L<base*.58); ink1.append(d1.mean()); ink2.append(d2.mean())
        op=cv2.morphologyEx(d1.astype(np.uint8),cv2.MORPH_OPEN,np.ones((5,5),np.uint8)); solid.append(op.sum()/max(1,d1.sum()))
    return dict(hist=hist,wood=np.mean(wood,0),woodsd=np.std([w[0] for w in wood]),spec=np.mean(spec,0),amp=np.mean(amp),cross=np.mean(cross),ink1=np.sort(ink1),ink2=np.sort(ink2),solid=np.mean(solid),n=len(F))
def ratio(a,b): a,b=max(a,1e-4),max(b,1e-4); return min(a,b)/max(a,b)
def dist_sorted(a,b):   # compare the spread of a per-piece quantity (quantiles), 0..1
    q=np.linspace(.05,.95,10); qa=np.quantile(a,q); qb=np.quantile(b,q); return float(np.mean([ratio(x+.02,y+.02) for x,y in zip(qa,qb)]))
def score(R,P):
    s={}
    s['wood colour']=100*np.exp(-np.linalg.norm(R['wood']-P['wood'])/14)
    s['tones']=100*np.minimum(R['hist'],P['hist']).sum()
    s['grain pattern']=100*(1-.5*np.abs(R['spec']-P['spec']).sum())
    s['grain strength']=100*ratio(R['amp'],P['amp'])
    s['cross marks']=100*ratio(R['cross'],P['cross'])
    s['ink amount']=100*(dist_sorted(R['ink1'],P['ink1'])*.5+dist_sorted(R['ink2'],P['ink2'])*.5)
    s['ink break-up']=100*ratio(R['solid'],P['solid'])
    s['piece-to-piece']=100*ratio(R['woodsd']+.5,P['woodsd']+.5)
    s['TOTAL']=float(np.mean(list(s.values()))); return s
if __name__=='__main__':
    D=[a.split('=')[1] for a in sys.argv if a.startswith('--photos=')]; D=D[0] if D else '.'
    P=stats(photo_faces(D))
    for path in sys.argv[1:]:
        if path.startswith('--'): continue
        Fr=render_faces(path); R=stats(Fr); s=score(R,P)
        print(path.split('/')[-1], 'faces',R['n'],' '.join(f'{k}={v:.0f}' for k,v in s.items()))
        print('   wood Lab render',R['wood'].round(1),'photo',P['wood'].round(1),'amp',round(R['amp'],4),round(P['amp'],4),'cross',round(R['cross'],2),round(P['cross'],2),'solid',round(R['solid'],2),round(P['solid'],2))
        print('   ink1 q',np.quantile(R['ink1'],[.1,.5,.9]).round(3),'photo',np.quantile(P['ink1'],[.1,.5,.9]).round(3),' ink2',np.quantile(R['ink2'],[.1,.5,.9]).round(3),'photo',np.quantile(P['ink2'],[.1,.5,.9]).round(3))
    if '--faces' in sys.argv:
        for nm,F in (('photo',photo_faces(D)),('render',render_faces([a for a in sys.argv[1:] if not a.startswith('--')][-1])[:8])):
            row=[cv2.resize(cv2.cvtColor(np.clip(f,0,None),cv2.COLOR_Lab2BGR)*255,(150,170)) for f in F]; cv2.imwrite(f'faces-{nm}.jpg',np.hstack(row))
