# Builds the Ottoman board's inlay maps (images/atlas/ex/ottoman-{bg,ch}-{1,2}.webp) from the V&A's photographs.
#   python3 atlas/museum/tools/ottoman-maps.py <dir with rect3720.png, rect3719.png> <outdir>
# The inputs are the V&A's photographs 2012FP3720 (inside, backgammon) and 2012FP3719 (outside, chess) at full size
# (framemark.vam.ac.uk/collections/<id>/full/full/0/default.jpg, 2500 x 1871), set square to 2048 x 2040 with a 60 px margin:
#   corners (clockwise from top left) 3720: (453,94) (2105,92) (2109,1745) (456,1752)
#                                     3719: (438,105) (2072,94) (2083,1748) (453,1758)
# The photographs themselves are not kept in the repository — only where each material lies:
#   ottoman-<bg|ch>-1.webp  4096 x 2040 grey : [ mother-of-pearl | fine light stringing ]
#   ottoman-<bg|ch>-2.webp  4096 x 2040 grey : [ amber (thin shell over gold leaf) | half-size tiles: tone of the pearl, joints and
#                                                cracks / green-stained bone (bg) or bone lipping (chess), unused ]
# (grey pictures: lossy colour channels would bleed into each other). The materials are drawn by the shader in ex/ottoman.js.
import cv2, numpy as np, sys
import os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__))); import ottoman_seg; from ottoman_seg import run, ss
PXCM=2048/56.5
def lines_chess(d):
    L=d['L']; H,W=L.shape; f=np.zeros((H*2,W*2),np.float32)   # drawn at double size, then reduced
    th=L-cv2.morphologyEx(L,cv2.MORPH_OPEN,np.ones((9,9),np.uint8))
    def bars(axis):
        s=(th[230:1810,:] if axis==0 else th[:,230:1810]).mean(axis); k=np.zeros(13); k[[2,3,4]]=1; k[[8,9,10]]=1; k-=k.mean()
        c=np.convolve(s,k[::-1],'same'); pk=[i for i in range(150,len(c)-150) if c[i]==c[i-12:i+13].max() and c[i]>c.max()*.4]
        a,b=pk[0],pk[-1]; n=round((b-a)/199.5); return [a+(b-a)*i/n for i in range(n+1)]
    bx,by=bars(0),bars(1); print('bars',len(bx),len(by),bx[0],bx[-1],by[0],by[-1])
    def hl(y,x0,x1,amp,w=2.2): cv2.line(f,(int(round(x0*2)),int(round(y*2))),(int(round(x1*2)),int(round(y*2))),float(amp),max(1,int(round(w*2))),cv2.LINE_AA)
    def vl(x,y0,y1,amp,w=2.2): cv2.line(f,(int(round(x*2)),int(round(y0*2))),(int(round(x*2)),int(round(y1*2))),float(amp),max(1,int(round(w*2))),cv2.LINE_AA)
    for dd,amp,w in ((36,.75,1.6),(42,.75,1.6),(70,1,2.2),(77,.42,2),(84.5,1,2.2),(90.5,1,2.2),(97,.42,2)):     # the nested frames (mitred)
        hl(dd,dd,W-dd,amp,w); hl(H-dd,dd,W-dd,amp,w); vl(dd,dd,H-dd,amp,w); vl(W-dd,dd,H-dd,amp,w)
    x0,x1,y0,y1=bx[0],bx[-1],by[0],by[-1]
    for c in bx:
        for o,amp in ((-9.2,.42),(-3.3,1),(3.3,1),(9.2,.42)):
            # the bars' lines are broken where another bar crosses: each square has its own frame
            for j in range(len(by)-1): vl(c+o,by[j]+ (9.2 if abs(o)>5 else 3.3),by[j+1]-(9.2 if abs(o)>5 else 3.3),amp)
    for c in by:
        for o,amp in ((-9.2,.42),(-3.3,1),(3.3,1),(9.2,.42)):
            for j in range(len(bx)-1): hl(c+o,bx[j]+(9.2 if abs(o)>5 else 3.3),bx[j+1]-(9.2 if abs(o)>5 else 3.3),amp)
    f=cv2.resize(cv2.GaussianBlur(f,(0,0),1.0),(W,H),interpolation=cv2.INTER_AREA)
    return np.clip(f,0,1),bx,by
def pack(d,face,out,extra):
    H,W=d['pearl'].shape; u8=lambda a:np.clip(a*255,0,255).astype(np.uint8)
    half=lambda a:cv2.resize(a,(W//2,H//2),interpolation=cv2.INTER_AREA)
    a1=np.hstack([u8(d['pearl']),u8(d['line'])])
    misc=np.zeros((H,W),np.uint8); misc[:H//2,:W//2]=u8(half(d['tone'])); misc[:H//2,W//2:]=u8(half(np.clip(cv2.dilate(d['crack'],np.ones((2,2),np.uint8))*1.3,0,1))); misc[H//2:,:W//2]=u8(half(extra))
    a2=np.hstack([u8(d['amber']),misc])
    cv2.imwrite(f'{out}/ottoman-{face}-1.webp',a1,[cv2.IMWRITE_WEBP_QUALITY,90]); cv2.imwrite(f'{out}/ottoman-{face}-2.webp',a2,[cv2.IMWRITE_WEBP_QUALITY,88])
if __name__=='__main__':
    ottoman_seg.REF=sys.argv[1]; out=sys.argv[2] if len(sys.argv)>2 else '.'
    d=run('3720','3720'); H,W=d['pearl'].shape
    # the hinge gap is not inlay
    pack(d,'bg',out,d['green'])
    d=run('3719','3719'); d['line'],bx,by=lines_chess(d)
    bone=np.zeros((H,W),np.float32); lip=int(.80*PXCM); bone[:lip]=1; bone[-lip:]=1; bone[:,:lip]=1; bone[:,-lip:]=1
    # the lip is solid bone (its joints and dots go to the crack map); nothing but the lip there
    Lc=cv2.morphologyEx(d['L'],cv2.MORPH_CLOSE,np.ones((9,9),np.uint8)); marks=ss(25,70,Lc-d['L'])
    inner=int(.74*PXCM); m=np.zeros((H,W),bool); m[:inner]=m[-inner:]=True; m[:,:inner]=True; m[:,-inner:]=True
    d['pearl']=np.where(bone>0,np.where(m,1,d['pearl']),d['pearl']); d['crack']=np.where(m,marks,d['crack']); d['amber']=d['amber']*(1-bone)
    pack(d,'ch',out,cv2.GaussianBlur(bone,(0,0),1))
