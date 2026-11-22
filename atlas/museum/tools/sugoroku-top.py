# The field of the Shōsōin's sugoroku board from the frontal photograph (D041538.jpg, 2576 x 2022): set square to 2116 x 1184
# (40 px/cm), the walls' cast shadow at the two ends taken out; written over the field part of sugoroku-top.webp (the strips
# under it — the walls' inner faces — are kept).   python3 sugoroku-top.py <photo> <old sugoroku-top.webp> <out.webp>
import cv2, numpy as np, sys
from PIL import Image
photo,old,out=sys.argv[1:4]
im=cv2.imread(photo); W,H=2116,1184
q=np.float32([[293.2,426.5],[2380.1,444.8],[2369.9,1602.7],[283.0,1584.4]])   # the field's corners (where the walls' inner faces meet it), read off enlargements
M=cv2.getPerspectiveTransform(q,np.float32([[0,0],[W,0],[W,H],[0,H]])); f=cv2.warpPerspective(im,M,(W,H),flags=cv2.INTER_CUBIC).astype(np.float32)
L=f.max(2); wood=L<120
def smooth(p,k): return np.convolve(np.pad(p,(k//2,k//2),mode='edge'),np.ones(k)/k,'valid')
px=smooth(np.array([np.median(L[:,i][wood[:,i]]) for i in range(W)],np.float32),61); gx=np.clip(np.median(px[300:-300])/px,1,3.2)
gx=smooth(np.where((np.arange(W)<260)|(np.arange(W)>W-260),gx,1),31)
soft=np.clip((L-120)/80,0,1)[...,None]; g=f*gx[None,:,None]*(1-soft)+np.minimum(f*np.minimum(gx,1.5)[None,:,None],255)*soft
Lg=g.max(2); py=smooth(np.array([np.median(Lg[i,:][wood[i,:]]) for i in range(H)],np.float32),61); gy=np.clip(np.median(py[200:-200])/py,1,1.8)
gy=smooth(np.where((np.arange(H)<60)|(np.arange(H)>H-60),gy,1),21); g=np.clip(g*gy[:,None,None],0,255).astype(np.uint8)
o=np.asarray(Image.open(old).convert('RGB')).copy(); o[:H]=g[...,::-1]; Image.fromarray(o).save(out,quality=92,method=6)
b=(g.max(2)>170).astype(np.uint8); b=cv2.morphologyEx(b,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(41,41))); n,lab,st,cen=cv2.connectedComponentsWithStats(b,8)
fl=[(cen[i][0]/40-W/80,cen[i][1]/40) for i in range(1,n) if 2500<st[i][4]<9000 and (cen[i][1]<120 or cen[i][1]>H-120)]
xs=sorted(abs(x) for x,y in fl); print(len(fl),'|x| by rank', [round(float(np.mean(xs[i*4:i*4+4])),2) for i in range(6)], 'row', round(float(np.mean([min(y,H/40-y) for x,y in fl])),2))
