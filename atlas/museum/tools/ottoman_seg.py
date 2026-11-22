# Reads where each material lies on a rectified photograph of the Ottoman board (used by ottoman-maps.py).
import cv2, numpy as np, sys
REF='.'
def ss(a,b,x): t=np.clip((x-a)/(b-a),0,1); return t*t*(3-2*t)
def run(n, face):
    M=60; im=cv2.imread(f'{REF}/rect{n}.png')[M:-M,M:-M].astype(np.float32); H,W=im.shape[:2]
    b,g,r=im[...,0],im[...,1],im[...,2]; L=.114*b+.587*g+.299*r; mx=im.max(2); mn=im.min(2); S=(mx-mn)/np.maximum(mx,1)
    hsv=cv2.cvtColor(im.astype(np.uint8),cv2.COLOR_BGR2HSV); Hh=hsv[...,0].astype(np.float32)
    white=ss(100,150,L)*(1-ss(48,92,r-b))*(1-ss(.5,.7,S))
    wb=(white>.5).astype(np.uint8)
    k5=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)); k7=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,7))
    op=cv2.morphologyEx(wb,cv2.MORPH_OPEN,k5)                      # drops thin lines
    # remove small specks
    nlab,lab,st,_=cv2.connectedComponentsWithStats(op,8); keep=np.zeros(nlab,bool); keep[1:]=st[1:,cv2.CC_STAT_AREA]>=60; op=keep[lab].astype(np.uint8)
    region=cv2.dilate(op,k5)                                       # the pieces, with their soft edge
    cl=cv2.morphologyEx(op,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
    pearl=np.maximum(white*region, cl.astype(np.float32)*.0)
    solid=cv2.GaussianBlur(cl.astype(np.float32),(0,0),1.1)        # smooth field of the closed shapes
    er=cv2.erode(cl,np.ones((3,3),np.uint8)); pearlF=np.maximum(pearl, cv2.GaussianBlur(er.astype(np.float32),(0,0),.9))  # cracks inside are filled
    pearlF=cv2.GaussianBlur(pearlF,(0,0),.7)
    # joints / cracks inside the pearl: thin dark lines
    Lc=cv2.morphologyEx(L,cv2.MORPH_CLOSE,k7); crack=ss(18,60,Lc-L)*(cv2.erode(cv2.dilate(cl,k5),np.ones((3,3),np.uint8))>0)
    # stringing: thin light lines outside the pearl, straight (horizontal / vertical)
    th=L-cv2.morphologyEx(L,cv2.MORPH_OPEN,k7); tb=((th>22)&(S<.5)&(region==0)).astype(np.uint8)
    lines=np.zeros_like(tb)
    for ksz in ((45,1),(1,45)):
        kk=cv2.getStructuringElement(cv2.MORPH_RECT,ksz)
        t=cv2.morphologyEx(tb,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_RECT,(9,1) if ksz[0]>1 else (1,9)))
        lines|=cv2.morphologyEx(t,cv2.MORPH_OPEN,kk)
    lineF=cv2.GaussianBlur(lines.astype(np.float32)*np.clip(th/60,.55,1),(0,0),.8)
    lineF=np.clip(lineF*1.5,0,1)
    # amber: the thin shell with gold leaf under it
    notp=1-cv2.GaussianBlur(cv2.dilate(region,k5).astype(np.float32),(0,0),1)
    orange=np.clip((r-b-8)/150,0,1)*ss(.18,.4,S)*notp*(1-np.clip(lineF*2,0,1))
    amber=cv2.GaussianBlur(np.sqrt(orange)*(.35+.65*ss(40,200,mx)),(0,0),.8)
    # green-stained bone
    green=(((L>52)&(L<135)&(S<.24)&(g>=r+2)&(g>=b-3)).astype(np.uint8))
    green=cv2.morphologyEx(green,cv2.MORPH_OPEN,np.ones((3,3),np.uint8)); nlab,lab,st,_=cv2.connectedComponentsWithStats(green,8); out=np.zeros(green.shape,np.float32); pd=cv2.dilate(cl,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))
    for i in range(1,nlab):
        x,y,w,h,a=st[i]
        if face!='3720' or a<22 or a>700 or w>40 or h>40: continue
        m=(lab[y:y+h,x:x+w]==i).astype(np.uint8); ring=cv2.dilate(np.pad(m,6),np.ones((9,9),np.uint8))-np.pad(m,6)
        pr=np.pad(pd[y:y+h,x:x+w],6) if False else pd[max(0,y-6):y+h+6,max(0,x-6):x+w+6]
        if pr.shape!=ring.shape: continue
        if (pr*ring).sum()/max(1,ring.sum())>.55: out[y:y+h,x:x+w]=np.maximum(out[y:y+h,x:x+w],m)
    green=out
    greenF=cv2.GaussianBlur(cv2.dilate(green,np.ones((3,3),np.uint8)),(0,0),1.0)
    tone=cv2.GaussianBlur(L,(0,0),2.0); tone=np.clip((tone-120)/120,0,1)
    return dict(pearl=pearlF,line=lineF,amber=amber,green=greenF,crack=crack,tone=tone,L=L,S=S,im=im)
