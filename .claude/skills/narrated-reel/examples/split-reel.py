# Story 024 v9 TEST (owner 11 Nov): v8 with the hook in the split layout (face on top, words on white below) and the first words on screen from frame 0, so the first frame is the thumbnail.
# Template for the newest style (narrated-reel skill): split layout from frame 0, whole hook on the first frame, words one by one on white below, key words bold. Voice Dylan; music sample 3.
import sys,os; sys.path.insert(0,os.path.expanduser('~/Developer/football-stories-101/.claude/skills/narrated-reel/scripts'))
from reel_engine import *
Y=1445
CH=[
 [(13,"The coach who lost his job after winning the league and cup double",{"lost","job","double"},Y)],   # v9: owner 11 Nov, the whole hook on the first frame (was two chunks ending "the cup in the same season")
 [(5,"It wasn't a bad season",{"bad"},Y),(5,"It wasn't a losing run",{"losing"},Y),(6,"And it's not what you think",{"think"},Y)],
 [(15,"Stay with this, because the man who ran that club came from software, not football",{"software"},Y)],
 [(4,"The club is Lyon",{"Lyon"},Y),(12,"Jean-Michel Aulas took over in 1987, with Lyon in the second division",{"Aulas","second"},Y)],
 [(5,"Lyon had never been champions",{"never"},Y),(7,"In 2002, they finally won the league",{"2002"},Y)],
 [(6,"Then they did something completely different",{"different"},Y),(4,"They kept changing everything",{"everything"},Y),(8,"Four coaches. Their stars sold, year after year",{"Four","sold"},Y),(5,"Seven titles in a row",{"Seven"},Y),(9,"But their biggest star stayed for all seven: Juninho",{"Juninho"},Y),(6,"44 goals straight from free kicks",{"44"},Y)],
 [(7,"The seventh came with a first double",{"double"},Y),(7,"Weeks later, Lyon let the coach go",{"go"},Y),(8,"As Aulas put it: managing is foreseeing.",{"foreseeing"},Y)],
 [(5,"In 2009, the run ended",{"ended"},Y),(6,"That May, Juninho asked to leave",{"leave"},Y),(7,"At the press conference, he said nothing",{"nothing"},Y),(4,"He fought back tears",{"tears"},Y)],
 [(14,"Which club in your memory sold its stars year after year, and kept winning?",{"memory","sold"},Y)]   # owner 11 Nov: the question from the current Reel,
]
TEMPO=[1.0]*9
GAP=[0.35,0.35,0.3,0.3,0.3,0.35,0.4,0.4,0.0]
R=Reel(os.path.dirname(os.path.abspath(__file__)),CH,TEMPO,GAP)
import wave
def repair_clip(i):
    f=f'{R.B}/l{i}.wav'; w_=wave.open(f,'rb'); pr=w_.getparams(); d=np.frombuffer(w_.readframes(pr.nframes),np.int16).astype(np.float64).reshape(-1,2)/32768; w_.close(); x=d.copy(); sr=pr.framerate
    for ch in range(2):
        v=x[:,ch]; dd=np.abs(v[1:-1]-(v[:-2]+v[2:])/2); lim=np.full(len(dd),0.04); lim[:int(0.06*sr)]=0.008; cand=np.where((dd>lim)&(np.abs(v[2:]-v[:-2])<0.5*dd))[0]+1   # stricter in the first 60 ms, where the engine's cut sits; one sample off the line through its two neighbours, and the neighbours agree
        for n in cand:
            lo=max(1,n-64); hi=min(len(v)-1,n+64); m=np.median(np.abs(v[lo:hi]-(v[lo-1:hi-1]+v[lo+1:hi+1])/2))
            if dd[n-1]>10*max(m,1e-4):
                print('click',i,ch,round(n/sr,4),round(float(v[n]),3)); v[n]=(v[n-1]+v[n+1])/2
                if n<int(0.06*sr): v[max(0,n-8):n+9]=np.convolve(v[max(0,n-12):n+13],np.ones(5)/5,'same')[4:-4][:len(v[max(0,n-8):n+9])]   # the seam the cut leaves: smooth it over a few samples
    for ch in range(2):
        v=x[:,ch]; a_=np.abs(v)
        for n in np.where((a_[1:-1]<0.15*np.minimum(a_[:-2],a_[2:]))&(a_[:-2]>0.03)&(a_[2:]>0.03)&(v[:-2]*v[2:]>0))[0]+1:
            print('dip',i,ch,round(n/sr,4),round(float(v[n]),3)); v[n]=(v[n-1]+v[n+1])/2
    a=int(0.003*sr); mono=x.mean(1); e=np.convolve(mono**2,np.ones(a)/a,'full'); pre=np.sqrt(e[a-1:len(mono)]); n=a
    while n<len(mono)-a:
        if pre[n-a]<0.003 and pre[n]>0.015:
            lo=max(1,n-a); j=lo+int(np.argmax(np.abs(mono[lo:n+a])>0.008)); r=int(0.004*sr); x[j:j+r]*=np.linspace(0,1,r)[:,None]; print('step',i,round(j/sr,4)); n+=int(0.05*sr)
        else: n+=1
    w_=wave.open(f,'wb'); w_.setparams(pr); w_.writeframes((np.clip(x,-1,1)*32767).astype(np.int16).tobytes()); w_.close()
for i in range(len(CH)): repair_clip(i)
# Word times from the audio itself: a word after a pause starts where the sound starts again.
def snap_all():
    for i,L in enumerate(R.lines):
        d=subprocess.run(['ffmpeg','-v','error','-i',f'{R.B}/l{i}.wav','-ac','1','-ar','16000','-f','f32le','-'],capture_output=True).stdout
        x=np.frombuffer(d,np.float32); hop=80; e=np.sqrt(np.convolve(x**2,np.ones(hop)/hop,'same'))[::hop]; thr=e.max()*10**(-30/20); W_=[]
        gaps=[]; j=0   # every real pause in the audio, 0.08 s or longer, with or without a comma in the words
        while j<len(e):
            if e[j]<thr:
                j0=j
                while j<len(e) and e[j]<thr: j+=1
                if (j-j0)/200>=0.08 and j<len(e): gaps.append((j0/200,j/200))
            else: j+=1
        for k,(w,s,en) in enumerate(L['w']):
            if k and L['w'][k-1][0][-1] in ',.?:':
                j0=max(1,int((s-0.35)*200)); j1=min(len(e)-1,int((s+0.35)*200)); on=[j for j in range(j0,j1) if e[j]>=thr and e[j-1]<thr and e[max(0,j-6):j].max()<thr*1.2]
                if on:
                    best=min(on,key=lambda j:abs(j/200-s)); print('snap',i,w,round(s,2),'->',round(best/200,2)); s=best/200
            if k:
                for g0,g1 in gaps:   # the word begins inside a pause: it starts when the sound starts again
                    if (g0-0.06<=s<g1 and en>g1) or (s<g0 and en>g1 and en-g1<=0.12 and g1-g0>=0.12):   # the second case: the transcriber stretched the word back over the pause
                        print('snap-pause',i,w,round(s,2),'->',round(g1,2),'gap',round(g1-g0,2)); s=g1; break
            W_.append((w,s,en))
        L['w']=W_
    caps=[]; n=len(CH); LL=R.lines
    for i,chs in enumerate(CH):
        k=0
        for c,txt,acc,y in chs:
            s=LL[i]['t']+(0 if k==0 else max(0,LL[i]['w'][k][1]-0.04)); k2=k+c
            e=(LL[i]['t']+LL[i]['w'][k2][1]-0.04) if k2<len(LL[i]['w']) else (LL[i+1]['t'] if i<n-1 else R.VOICE_END)
            caps.append((txt,acc,y,s,e)); k=k2
    R.caps=caps
snap_all()
VE=R.VOICE_END; print('voice end',round(VE,2),'reel',round(R.END,2))
def C(t): return math.ceil(t*FPS-1e-6)/FPS
wt_=R.wt; lt_=R.lt
def wt(l,w): return C(wt_(l,w)-0.04)
def lt(l): return C(lt_(l))
SPLIT=0.0            # v9 (owner 11 Nov): hook in the same picture-over-words layout as the rest; was lt(1), full-screen opener before this, picture-over-words layout after
PH=1100              # picture height in the split layout
INK=(17,17,17); PALE=(200,200,200); PAPER=(250,250,248)
HN='/System/Library/Fonts/HelveticaNeue.ttc'
def hn(s,i): return ImageFont.truetype(HN,s,index=i)
fR=hn(84,0); fB=hn(84,1); fRL=hn(72,0); fBL=hn(72,1); GOLDRGB=GOLD[:3]
def aim(name,z,px,py,fx=540,fy=960):
    sw,sh=R.plate(name).size; s=z*H/sh; return (fx-540-(px-sw/2)*s, fy-960-(py-sh/2)*s)
def cam(name,z0,z1,p0,p1=None):
    p1=p1 or p0; a=aim(name,z0,*p0); b=aim(name,z1,*p1); return (z0,z1,a[0],b[0],a[1],b[1])
def pic(im,z,cx,cy):   # the split layout's picture: a 1080 x PH window on the painting, centre (cx,cy), zoom z over "cover"
    w,h=im.size; s=z*max(W/w,PH/h); bw,bh=W/s,PH/s
    x0=min(max(0,cx-bw/2),w-bw); y0=min(max(0,cy-bh/2),h-bh)
    return im.transform((W,PH),Image.AFFINE,(1/s,0,x0,0,1/s,y0),Image.BICUBIC)
FADE=Image.linear_gradient('L').resize((W,70))
SHOTS=[]
def shot(name,a,b,c,over=None,hit=None):
    """c: full mode = cam(...) tuple; split mode = (z0,z1,(cx0,cy0),(cx1,cy1)) on the painting."""
    SHOTS.append((name,round(a,2),round(b-a,2))); assert b-a<=6.0,(name,b-a)
    out=R.next_out(); n=int(round(b*FPS))-int(round(a*FPS)); im=R.plate(name); p=encoder(out,18); split=a>=SPLIT-1e-6
    for f in range(n):
        e=ease(f/max(1,n-1)); t=a+f/FPS; pz=0; fl=0
        if hit is not None:
            dt=f/FPS-hit
            if 0<=dt<0.3: pz=0.03*(1-dt/0.3)
            if 0<=dt<0.14: fl=0.45*(1-dt/0.14)
        if split:
            z=c[0]+(c[1]-c[0])*e+pz; cx=c[2][0]+(c[3][0]-c[2][0])*e; cy=c[2][1]+(c[3][1]-c[2][1])*e
            top=pic(im,z,cx,cy).convert('RGBA')
            if over: ov=Image.new('RGBA',(W,PH),(0,0,0,0)); over(ImageDraw.Draw(ov),t); top=Image.alpha_composite(top,ov)
            fr=Image.new('RGB',(W,H),PAPER); fr.paste(top.convert('RGB'),(0,0))
            fr.paste(Image.new('RGB',(W,70),PAPER),(0,PH-70),FADE)   # soft edge into the paper
        else:
            fr=R.warp(im,c[0]+(c[1]-c[0])*e+pz,c[2]+(c[3]-c[2])*e,c[4]+(c[5]-c[4])*e).convert('RGBA')
            if over: ov=Image.new('RGBA',(W,H),(0,0,0,0)); over(ImageDraw.Draw(ov),t); fr=Image.alpha_composite(fr,ov)
            fr=fr.convert('RGB')
        if fl: fr=Image.blend(fr,Image.new('RGB',(W,H),(255,255,255)),fl)
        p.stdin.write(fr.tobytes())
    p.stdin.close(); p.wait()
PANEL=(8,14,30,215); RIM=(255,255,255,120)
def star(d,cx,cy,r,fill):
    pts=[(cx+(r if k%2==0 else r*0.42)*math.sin(k*math.pi/5),cy-(r if k%2==0 else r*0.42)*math.cos(k*math.pi/5)) for k in range(10)]
    d.polygon(pts,fill=fill,outline=(0,0,0,255),width=3)
def stars(t0,t1,y=330):   # seven stars lit one by one
    def draw(d,t):
        k=0 if t<t0 else min(7,1+int((t-t0)/max(0.05,t1-t0)*7))
        d.rounded_rectangle((60,y-80,1020,y+80),30,fill=PANEL,outline=RIM,width=3)
        for i in range(7): star(d,140+i*133.3,y,54,GOLD if i<k else (70,75,90,255))
    return draw
def ctext(d,y,t,f,fill,x=W/2): d.text((x-f.getlength(t)/2,y),t,font=f,fill=fill)
fTs=ImageFont.truetype(FONT,60); fNs=ImageFont.truetype(FONT,130); fDs=ImageFont.truetype(FONT,40); fT=ImageFont.truetype(FONT,84); fN=ImageFont.truetype(FONT,200); fD=ImageFont.truetype(FONT,54)
def score(t3):   # LYON 3-1 LENS, 4 May 2002 (story text)
    def draw(d,t):
        d.rounded_rectangle((210,730,870,1030),36,fill=PANEL,outline=RIM,width=4)
        ctext(d,745,'4 MAY 2002',fDs,WHITE); ctext(d,800,'LYON',fTs,GOLD,390); ctext(d,800,'LENS',fTs,WHITE,690)
        if t>=t3: ctext(d,860,'3',fNs,GOLD,390); ctext(d,860,'1',fNs,WHITE,690)
    return draw
def counter(total,label,t0,t1,y=120):
    fB2=ImageFont.truetype(FONT,190); fL=ImageFont.truetype(FONT,56)
    def draw(d,t):
        u=ease(min(1,max(0,(t-t0)/max(0.05,t1-t0)))); v=str(max(2,int(round(total*u))))
        d.rounded_rectangle((200,y,880,y+340),40,fill=PANEL,outline=RIM,width=4); ctext(d,y+12,v,fB2,GOLD); ctext(d,y+250,label,fL,WHITE)
    return draw
# ---- L0: the hook person's face (Alain Perrin) in the top panel for the whole hook
shot('perrin',0,lt(1),(1.0,1.08,(512,560),(512,520)))   # owner 11 Nov: the coach's picture for the whole hook
# ---- L1: not a bad season / not a losing run / not what you think
shot('j08',lt(1),wt(1,5),(1.0,1.06,(512,560),(480,540)))
shot('tifo_v',wt(1,5),wt(1,10),(1.0,1.08,(512,900),(512,860)))
shot('celebrate06x',wt(1,10),lt(2),(1.0,1.06,(512,900),(512,860)))
# ---- L2: the man who ran the club came from software (no portrait of him in the set: the fans)
shot('tifo',lt(2),lt(3),(1.0,1.1,(768,430),(768,400)))
# ---- L3: the club is Lyon; Aulas, 1987, second division (undated close-up of the LYON letters)
shot('fans',lt(3),wt(3,4),(1.0,1.08,(768,512),(820,500)))
shot('virage',wt(3,4),lt(4),(1.0,1.1,(768,512),(700,512)))   # undated crowd under the 1987 line
# ---- L4: never champions; 2002, the first title
shot('gerland',lt(4),wt(4,5),(1.05,1.15,(500,560),(400,560)))
shot('lineup02',wt(4,5),lt(5),(1.0,1.06,(512,760),(512,740)))
# ---- L5: completely different; kept changing everything; four coaches, stars sold; seven in a row
shot('team03',lt(5),wt(5,10),(1.0,1.08,(512,760),(512,740)))
shot('essien_lyon',wt(5,10),wt(5,13),(1.0,1.1,(640,700),(660,660)))
shot('essien',wt(5,13),wt(5,18),(1.0,1.1,(547,700),(530,640)))
shot('trophy',wt(5,18),wt(5,23),(1.0,1.08,(512,760),(512,700)),over=stars(wt(5,18),wt(5,22)+0.2,y=950))
shot('junportrait',wt(5,23),wt(5,32),(1.0,1.06,(512,620),(512,580)))   # the star who stayed
shot('junfk',wt(5,32),lt(6),(1.0,1.0,(512,640),(560,640)),over=counter(44,'DIRECT FREE KICKS',wt(5,32),wt(5,33)+0.3,y=700))
# ---- L6: the seventh with a first double; weeks later the coach let go; Aulas: managing is foreseeing
shot('cdf08',lt(6),wt(6,7),(1.0,1.08,(512,760),(512,730)))
shot('perrin',wt(6,7),wt(6,14),(1.0,1.04,(512,620),(512,600)))
shot('fans',wt(6,14),lt(7),(1.1,1.0,(820,500),(768,512)))
# ---- L7: Juninho, the one constant; 2009 asked to leave; said nothing; fought back tears
shot('gerland',lt(7),wt(7,5),(1.12,1.0,(800,560),(600,560)))   # 2009, the run ended: the ground, no celebration
shot('taker',wt(7,5),wt(7,11),(1.0,1.08,(620,640),(640,600)))   # Juninho from behind, Feb 2009
shot('junfk',wt(7,11),lt(8),(1.6,2.2,(470,380),(460,300)))   # slow push to his face, Novotel-era shirt (not the 2001 one)
# ---- L8: the question
shot('tifo_v',lt(8),VE,(1.0,1.08,(512,900),(512,860)))
R.closing()
print('SHOTS',len(SHOTS)); [print(s) for s in SHOTS]
# ---- words: each chunk written word by word on the paper; line 0 complete from frame 0
LIST={1}   # lines shown as a stacked list (the reference's "it's not a VPN / it's not a proxy" rows)
CHUNKS=[]   # (line, text, accents, start, end, [word reveal times])
for i,chs in enumerate(CH):
    k=0; L_=R.lines[i]
    for j,(c,txt,acc,y) in enumerate(chs):
        s=L_['t']+(0 if k==0 else max(0,L_['w'][k][1]-0.04)); k2=k+c
        e=(L_['t']+L_['w'][k2][1]-0.04) if k2<len(L_['w']) else (R.lines[i+1]['t'] if i<len(CH)-1 else VE)
        dw=txt.split(); times=[L_['t']+L_['w'][k+min(c-1,int(m*c/len(dw)))][1]-0.03 for m in range(len(dw))]; times[0]=min(times[0],s)
        if i==0 and j==0: times=[-1.0]*len(dw)   # v9: the first hook words are fully on screen from frame 0, so the first frame works as the thumbnail
        CHUNKS.append((i,txt,acc,s,e,times)); k=k2
R.caps=[(t,a,Y,s,e) for (i,t,a,s,e,_) in CHUNKS]
def rows_of(words,maxw=930,lst=False):
    rows=[];cur=[];wid=0
    for w,acc in words:
        f=(fBL if acc else fRL) if lst else (fB if acc else fR); ww=f.getlength(w); sp=fR.getlength(' ')
        if cur and wid+sp+ww>maxw: rows.append(cur);cur=[];wid=0
        wid+=(sp if cur else 0)+ww; cur.append((w,acc))
    if cur: rows.append(cur)
    return rows
def draw_chunk(d,txt,acc,times,t,y_top,x_left=None,icon=None):
    words=[(w,w.strip(',.?:') in acc) for w in txt.split()]; rows=rows_of(words,890 if icon else 930,bool(icon)); y=y_top
    FB,FR=(fBL,fRL) if icon else (fB,fR)
    k=0
    for r in rows:
        rh=max((FB if a else FR).size for _,a in r)*1.18
        wid=sum((FB if a else FR).getlength(w) for w,a in r)+FR.getlength(' ')*(len(r)-1)
        x=x_left if x_left is not None else (W-wid)/2
        for w,a in r:
            f=FB if a else FR; u=min(1,max(0,(t-times[k])/0.14)) if t>=times[k] else -1
            if u>=0:
                col=tuple(int(PALE[c]+(INK[c]-PALE[c])*u) for c in range(3))
                d.text((x,y+(rh-f.size*1.18)+(1-u)*10),w,font=f,fill=col)
            x+=f.getlength(w)+FR.getlength(' '); k+=1
        y+=rh
    return y
def block_h(txt,acc,icon=None):
    words=[(w,w.strip(',.?:') in acc) for w in txt.split()]
    FB,FR=(fBL,fRL) if icon else (fB,fR)
    return sum(max((FB if a else FR).size for _,a in r)*1.18 for r in rows_of(words,890 if icon else 930,bool(icon)))
def xmark(d,cx,cy,r,u):
    col=tuple(int(PALE[c]+(INK[c]-PALE[c])*u) for c in range(3)); d.ellipse((cx-r,cy-r,cx+r,cy+r),fill=col); q=r*0.45
    d.line((cx-q,cy-q,cx+q,cy+q),fill=PAPER,width=9); d.line((cx-q,cy+q,cx+q,cy-q),fill=PAPER,width=9)
PTOP,PBOT=PH+40,1600   # the words' area (Instagram's caption and buttons sit below about 1600)
hook_imgs={}
def paper_words(im,t):
    act=[c for c in CHUNKS if c[3]<=t<c[4]]
    if not act: return im
    i,txt,acc,s,e,times=act[0]
    d=ImageDraw.Draw(im)
    if i in LIST:
        items=[c for c in CHUNKS if c[0]==i]; hs=[block_h(c[1],c[2],1) for c in items]; gap=40
        y=max(PTOP+20,PTOP+(PBOT-PTOP-sum(hs)-gap*(len(items)-1))/2)
        for c,hh in zip(items,hs):
            if t>=c[5][0]:
                u=min(1,(t-c[5][0])/0.14); xmark(d,95,y+hh/2,36,u); draw_chunk(d,c[1],c[2],c[5],t,y,x_left=155,icon=1)
            y+=hh+gap
        return im
    hh=block_h(txt,acc); draw_chunk(d,txt,acc,times,t,PTOP+(PBOT-PTOP-hh)/2); return im
def finish():
    B=R.B; open(f'{B}/v.txt','w').write(''.join(f"file '{x}'\n" for x in R.shots))
    run('ffmpeg','-y','-f','concat','-safe','0','-i',f'{B}/v.txt','-c','copy',f'{B}/video.mp4'); R.T=dur(f'{B}/video.mp4'); print('video',round(R.T,2),'expected',round(R.END,2))
    dec=subprocess.Popen(['ffmpeg','-v','error','-f','concat','-safe','0','-i',f'{B}/v.txt','-vf',f'fps={FPS},format=rgb24','-f','rawvideo','-'],stdout=subprocess.PIPE)
    enc=subprocess.Popen(['ffmpeg','-y','-v','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-c:v','libx264','-crf','20','-preset','medium','-pix_fmt','yuv420p',f'{B}/captioned.mp4'],stdin=subprocess.PIPE)
    fr=0; seen=set()
    while True:
        raw=dec.stdout.read(W*H*3)
        if len(raw)<W*H*3: break
        t=fr/FPS; im=Image.frombytes('RGB',(W,H),raw)
        for c in CHUNKS:
            if c[3]<=t<c[4]: seen.add(c[3])
        enc.stdin.write(paper_words(im,t).tobytes()); fr+=1
    enc.stdin.close(); enc.wait(); dec.wait(); print('frames',fr,'chunks shown',len(seen),'of',len(CHUNKS))
    if len(seen)!=len(CHUNKS): raise SystemExit('some words never appeared')
    v=['ffmpeg','-y']; fv=''; n=len(R.lines)
    for i in range(n): v+=['-i',f'{B}/l{i}.wav']; fv+=f"[{i}:a]adelay={int(R.lines[i]['t']*1000)}:all=1[a{i}];"
    fv+=''.join(f'[a{i}]' for i in range(n))+f"amix=inputs={n}:normalize=0,apad,atrim=0:{R.T:.3f},loudnorm=I=-14:TP=-1.5:LRA=11[o]"
    run(*v,'-filter_complex',fv,'-map','[o]','-ar',str(SR),'-ac','2',f'{B}/voice.wav')
    json.dump(dict(lines=R.lines,voice_end=VE,end=R.END,caps=[(c[0],c[3],c[4]) for c in R.caps]),open(f'{B}/timing.json','w'),indent=0)
for c in CHUNKS: print('chunk',round(c[3],2),round(c[4],2),round(c[4]-c[3],2),round(len(c[1])/max(.01,c[4]-c[3]),1),c[1])
if os.environ.get('DRY'): raise SystemExit
finish()
T=dur(f'{R.B}/captioned.mp4')
fader=[(0,-13.5),(lt(1)-0.6,-13.5),(lt(1)+0.6,-15.5),(lt(7)-0.6,-15.5),(lt(7)+0.3,-14),(VE-0.2,-14),(VE+0.9,-4.5),(T,-4.5)]
R.mix('final.mp4',music='music.mp3',join=(9.255,26.716) if T>62.3 else None,trim_db=1,end_src=62.5,fader=fader)   # 8-bar repeat (109.96 bpm) so the track covers 67 s
