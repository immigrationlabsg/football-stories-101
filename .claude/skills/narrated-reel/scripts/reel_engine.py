"""Shared engine for narrated Football Stories 101 Reels. A reel's own reel.py holds its script, shots and fader
points; everything else lives here. See ../SKILL.md. Run reel.py with the .venv python, from the reel's folder."""
import subprocess,os,json,math,wave
import numpy as np
from PIL import Image,ImageDraw,ImageFont,ImageFilter
FONT='/System/Library/Fonts/Supplemental/Arial Black.ttf'
W,H=1080,1920; FPS=30; SR=44100
GOLD=(255,204,64,255); WHITE=(255,255,255,255)
def run(*a):
    r=subprocess.run(a,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    if r.returncode: raise SystemExit(r.stderr.decode()[-1500:])
def dur(f): return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f]))
def ease(u): return u*u*(3-2*u)
def encoder(out,crf=17):
    return subprocess.Popen(['ffmpeg','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-c:v','libx264','-crf',str(crf),'-preset','medium','-pix_fmt','yuv420p',out],stdin=subprocess.PIPE,stderr=subprocess.DEVNULL)

class Reel:
    """CH: for each voice line, a list of (words in chunk, caption text or None, accented words, caption y centre).
    Voice clips are lines/0.mp3, 1.mp3... TEMPO and GAP give each line's speed and the pause after it."""
    def __init__(self,folder,CH,TEMPO,GAP,end_hold=2.4,scenes='scenes'):
        self.S=os.path.abspath(folder); self.B=self.S+'/build'; os.makedirs(self.B,exist_ok=True)
        self.CH,self.TEMPO,self.GAP,self.end_hold,self.scenes=CH,TEMPO,GAP,end_hold,scenes
        self.shots=[]; self.extend={}; self.cache={}
        self._timing()
    def _timing(self):
        from faster_whisper import WhisperModel
        M=WhisperModel('base.en',compute_type='int8'); self.lines=[]; t=0; S,B=self.S,self.B
        for i in range(len(self.CH)):
            a=f'{B}/l{i}.wav'
            run('ffmpeg','-y','-i',f'{S}/lines/{i}.mp3','-af',f'silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.03:stop_periods=-1:stop_threshold=-40dB:stop_duration=0.14:stop_silence=0.12,atempo={self.TEMPO[i]},aresample=44100','-ac','2',a)
            d=dur(a); ws=[(w.word.strip(),w.start,w.end) for s in M.transcribe(a,word_timestamps=True)[0] for w in s.words]
            need=sum(c[0] for c in self.CH[i])
            if len(ws)!=need: raise SystemExit(f'line {i}: {len(ws)} words, expected {need}: {[w[0] for w in ws]}')
            self.lines.append(dict(t=t,d=d,w=ws)); t+=d+self.GAP[i]
        self.VOICE_END=t; self.END=t+self.end_hold; L=self.lines; caps=[]; n_lines=len(self.CH)
        for i,chs in enumerate(self.CH):
            k=0
            for n,txt,acc,y in chs:
                s=L[i]['t']+(0 if k==0 else max(0,L[i]['w'][k][1]-0.04)); k2=k+n
                e=(L[i]['t']+L[i]['w'][k2][1]-0.04) if k2<len(L[i]['w']) else (L[i+1]['t'] if i<n_lines-1 else self.VOICE_END)
                if txt: caps.append((txt,acc,y,s,e))
                k=k2
        self.caps=caps
    def wt(self,line,word): return self.lines[line]['t']+self.lines[line]['w'][word][1]
    def lt(self,line): return self.lines[line]['t']
    def word_end(self,line,word): return self.lines[line]['w'][word][2]
    # ---- pictures. A painting stays whole; only the camera moves, so nothing is cut out or redrawn.
    def plate(self,name):
        if name in self.cache: return self.cache[name]
        im=Image.open(f'{self.S}/{self.scenes}/{name}.png').convert('RGB')
        if name in self.extend:   # wide scene: extend top and bottom so the whole width fits 9:16
            cut,ty=self.extend[name]; w,h=im.size; ex=(int(w*16/9)-h)//2; c=Image.new('RGB',(w,h+2*ex)); ramp=60
            top=im.crop((0,ty,w,ty+ex+cut+ramp)).filter(ImageFilter.GaussianBlur(2.5))
            bot=im.crop((0,h-ex-ramp,w,h)).transpose(Image.FLIP_TOP_BOTTOM).filter(ImageFilter.GaussianBlur(2.5))
            c.paste(top,(0,0)); c.paste(bot,(0,h+ex-ramp))
            fm=Image.new('L',(w,h),255); g=Image.linear_gradient('L').resize((w,ramp)); fm.paste(0,(0,0,w,cut)); fm.paste(g,(0,cut)); fm.paste(g.transpose(Image.FLIP_TOP_BOTTOM),(0,h-ramp))
            c.paste(im,(0,ex),fm); im=c
        self.cache[name]=im; return im
    def next_out(self):
        o=f'{self.B}/shot{len(self.shots):02d}.mp4'; self.shots.append(o); return o
    @staticmethod
    def warp(img,z,dx,dy):
        sw,sh=img.size; s=z*H/sh; a=1/s
        mx=max(0,(sw*s-W)/2); my=max(0,(sh*s-H)/2); dx=max(-mx,min(mx,dx)); dy=max(-my,min(my,dy))
        return img.transform((W,H),Image.AFFINE,(a,0,sw/2-(W/2+dx)*a,0,a,sh/2-(H/2+dy)*a),Image.BICUBIC)
    def anim(self,name,start,end,cam,hit=None):
        """cam=(zoom from,to, dx from,to, dy from,to). hit=seconds into the shot for one flash and shake."""
        out=self.next_out(); n=int(round(end*FPS))-int(round(start*FPS)); im=self.plate(name); p=encoder(out)
        for f in range(n):
            e=ease(f/max(1,n-1)); sx=sy=0; fl=0; pz=0
            if hit is not None:
                dt=(f/FPS)-hit
                if 0<=dt<0.3: sx=int(14*math.sin(dt*90)*(1-dt/0.3)); sy=int(10*math.cos(dt*70)*(1-dt/0.3)); pz=0.03*(1-dt/0.3)
                if 0<=dt<0.14: fl=0.6*(1-dt/0.14)
            z=cam[0]+(cam[1]-cam[0])*e+pz
            fr=self.warp(im,z,cam[2]+(cam[3]-cam[2])*e+sx,cam[4]+(cam[5]-cam[4])*e+sy)
            if fl: fr=Image.blend(fr,Image.new('RGB',(W,H),(255,255,255)),fl)
            p.stdin.write(fr.tobytes())
        p.stdin.close(); p.wait()
    def still(self,name,start,end,z0=1.0,z1=1.12,cx=0.5,cy=0.5,folder=None):
        """A painting cropped to 9:16 rather than extended, on a slow zoom."""
        out=self.next_out(); n=int(round(end*FPS))-int(round(start*FPS))
        im=Image.open(f'{self.S}/{folder or self.scenes}/{name}.png').convert('RGB'); w,h=im.size; cw=int(h*9/16); x=int((w-cw)*cx); im=im.crop((x,0,x+cw,h)).resize((W*2,H*2),Image.LANCZOS); p=f'{self.B}/_{name}.jpg'; im.save(p,quality=94)
        z=f"{z0}+({z1}-{z0})*on/{max(1,n)}"
        run('ffmpeg','-y','-loop','1','-i',p,'-vf',f"zoompan=z='{z}':x='(iw-iw/zoom)*{cx}':y='(ih-ih/zoom)*{cy}':d={n}:s={W}x{H}:fps={FPS},format=yuv420p",'-frames:v',str(n),'-c:v','libx264','-crf','18','-preset','medium',out)
    def endcard(self,top,bottom,words,dur_s=None):
        """words: rows of (text, colour). top and bottom: (painting, crop box), pictures above and below the question."""
        out=self.next_out(); dur_s=dur_s or (self.END-self.VOICE_END)
        a=Image.open(f'{self.S}/{self.scenes}/{top[0]}.png').convert('RGB').crop(top[1]).resize((W,760)); g=Image.open(f'{self.S}/{self.scenes}/{bottom[0]}.png').convert('RGB').crop(bottom[1]).resize((W,760))
        im=Image.new('RGB',(W,H)); im.paste(a,(0,0)); im.paste(g,(0,1160)); ov=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(ov)
        d.rectangle((0,760,W,1160),fill=(10,10,10,255)); f=ImageFont.truetype(FONT,120)
        for i,(t_,c) in enumerate(words):
            d.text(((W-f.getlength(t_))/2,790+i*160),t_,font=f,fill=c,stroke_width=6,stroke_fill=(0,0,0,255))
        im=Image.alpha_composite(im.convert('RGBA'),ov).convert('RGB'); p=f'{self.B}/_end.jpg'; im.save(p,quality=94)
        run('ffmpeg','-y','-loop','1','-i',p,'-vf','format=yuv420p','-t',f'{dur_s}','-r',str(FPS),'-c:v','libx264','-crf','18',out)
    # ---- captions
    @staticmethod
    def caption(txt,acc,y,out,size=76,wrap=800):
        f=ImageFont.truetype(FONT,size); words=txt.split(); rows=[];cur=[]
        for w in words:
            if f.getlength(' '.join(cur+[w]))>wrap and cur: rows.append(cur);cur=[w]
            else: cur.append(w)
        rows.append(cur)
        im=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(im); gap=int(size*1.2); yy=y-gap*len(rows)//2; sp=f.getlength(' ')
        for r in rows:
            x=(W-sum(f.getlength(w) for w in r)-sp*(len(r)-1))/2
            for w in r:
                d.text((x,yy),w,font=f,fill=GOLD if w.strip(',.') in acc else WHITE,stroke_width=8,stroke_fill=(0,0,0,255))
                x+=f.getlength(w)+sp
            yy+=gap
        im.save(out)
    def finish_video(self,sizes=None):
        """Join the shots and burn the captions in frame by frame (ffmpeg's timed overlays dropped captions).
        sizes: {caption text: size or (size, wrap width)} for the exceptions."""
        B=self.B; open(f'{B}/v.txt','w').write(''.join(f"file '{x}'\n" for x in self.shots))
        run('ffmpeg','-y','-f','concat','-safe','0','-i',f'{B}/v.txt','-c','copy',f'{B}/video.mp4')
        self.T=dur(f'{B}/video.mp4'); print('video',round(self.T,2),'expected',round(self.END,2))
        loaded=[]
        for i,(txt,acc,y,cs,ce) in enumerate(self.caps):
            f=f'{B}/cap{i:02d}.png'; sz=(sizes or {}).get(txt,76); sz,wr=sz if isinstance(sz,tuple) else (sz,800)
            self.caption(txt,acc,y,f,size=sz,wrap=wr); im=Image.open(f); box=im.getbbox(); loaded.append((cs,ce,im.crop(box),box[:2]))
        dec=subprocess.Popen(['ffmpeg','-v','error','-f','concat','-safe','0','-i',f'{B}/v.txt','-vf',f'fps={FPS},format=rgb24','-f','rawvideo','-'],stdout=subprocess.PIPE)
        enc=subprocess.Popen(['ffmpeg','-y','-v','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-c:v','libx264','-crf','22','-preset','medium','-pix_fmt','yuv420p',f'{B}/captioned.mp4'],stdin=subprocess.PIPE)
        fr=0; burnt=set()
        while True:
            raw=dec.stdout.read(W*H*3)
            if len(raw)<W*H*3: break
            now=fr/FPS; active=[c for c in loaded if c[0]<=now<c[1]]
            if active:
                im=Image.frombytes('RGB',(W,H),raw)
                for c in active: im.paste(c[2],c[3],c[2]); burnt.add(c[0])
                raw=im.tobytes()
            enc.stdin.write(raw); fr+=1
        enc.stdin.close(); enc.wait(); dec.wait(); print('frames',fr,'captions shown',len(burnt),'of',len(loaded))
        if len(burnt)!=len(loaded): raise SystemExit('some captions never appeared')
        v=['ffmpeg','-y']; fv=''; n=len(self.lines)
        for i in range(n): v+=['-i',f'{B}/l{i}.wav']; fv+=f"[{i}:a]adelay={int(self.lines[i]['t']*1000)}:all=1[a{i}];"
        fv+=''.join(f'[a{i}]' for i in range(n))+f"amix=inputs={n}:normalize=0,apad,atrim=0:{self.T:.3f},loudnorm=I=-14:TP=-1.5:LRA=11[o]"
        run(*v,'-filter_complex',fv,'-map','[o]','-ar',str(SR),'-ac','2',f'{B}/voice.wav')
        json.dump(dict(lines=self.lines,voice_end=self.VOICE_END,end=self.END,caps=[(c[0],c[3],c[4]) for c in self.caps]),open(f'{B}/timing.json','w'),indent=0)
    # ---- sound. No voice-triggered compressor and no stepped volume: those made the Maradona mix choppy.
    def mix(self,out,music='music.mp3',join=None,end_src=None,fader=None,crowd=(),base=(6,30),xfade=0.25,trim_db=-1,level_until=None):
        """join=(a,b): after source time b, carry on from source a; both on bar lines, exactly N bars apart, same chord.
        end_src: source time that should land at the end of the Reel, so the track's own ending carries it out.
        fader: [(reel seconds, dB), ...], slow ramps only. crowd: [(file, start, seconds, dB, fade in, fade out, loop)]."""
        B=self.B; T=dur(f'{B}/captioned.mp4'); N=int(T*SR); L=self.lines
        def load(f):
            d=subprocess.run(['ffmpeg','-v','error','-i',f,'-ac','2','-ar',str(SR),'-f','f32le','-'],capture_output=True,check=True).stdout
            return np.frombuffer(d,np.float32).reshape(-1,2).astype(np.float64)
        m=load(music); v=load(f'{B}/voice.wav')[:N]; v=np.pad(v,((0,N-len(v)),(0,0)))
        for l in L:   # 20 ms fade over each clip's hard end, so no tick
            e_=int((l['t']+l['d'])*SR); f_=int(0.02*SR)
            if 0<e_-f_ and e_<N: v[e_-f_:e_]*=np.linspace(1,0,f_)[:,None]
        lag=0
        if join:
            a=int(join[0]*SR); b=int(join[1]*SR); lag=(b-a)/SR
        s=int((end_src-T+lag)*SR); print('music starts at',round(s/SR,2))
        if s<0: raise SystemExit('the music is too short for this Reel: use a repeat, or generate a longer track')
        if join:
            XF=int(xfade*SR); t=np.linspace(0,np.pi/2,XF)[:,None]   # crossfade ends on the downbeat, so no drum hit doubles
            o=np.concatenate([m[s:b-XF],m[b-XF:b]*np.cos(t)+m[a-XF:a]*np.sin(t),m[a:]]); print('join in Reel at',round((b-XF/2-s)/SR,2))
        else: o=m[s:]
        o=o[:N]; o=np.pad(o,((0,N-len(o)),(0,0)))
        def smooth(x,sec):
            n=int(sec*SR); k=np.ones(n)/n
            return np.convolve(np.pad(x,(n,n),mode='edge')[::64],k[::64]/k[::64].sum(),'same')[n//64:][:len(x)//64+1]
        lev=np.sqrt(smooth((o**2).mean(1),4))+1e-5; lev=np.interp(np.arange(N),np.arange(len(lev))*64,lev)
        ref=np.median(lev[:int((level_until or self.T-5.7)*SR)]); level=np.clip(ref/lev,0.7,1.4); level[int((T-3.2)*SR):]=level[int((T-3.2)*SR)]   # never pump up the natural ending
        tt=np.arange(N)/SR; db=np.interp(tt,[p[0] for p in fader],[p[1] for p in fader])
        rms=np.sqrt(np.mean(m[int(base[0]*SR):int(base[1]*SR)]**2)); norm=(10**(-14/20))/rms   # track at about -14 dBFS before the fader
        g=10**((db+trim_db)/20)*norm*level
        k=int(0.3*SR); gs=np.convolve(np.pad(g,(k,k),mode='edge'),np.ones(k)/k,'same')[k:-k]   # round every corner
        bed=o*gs[:,None]
        fi=int(0.25*SR); bed[:fi]*=np.linspace(0,1,fi)[:,None]; fo=int(0.4*SR); bed[-fo:]*=np.linspace(1,0,fo)[:,None]
        c=np.zeros((N,2))
        for f,t0,d,gain,fin,fout,loop in crowd:
            x=load(f)
            if loop and len(x)<int(d*SR):
                xf=int(0.8*SR); r=np.linspace(0,1,xf)[:,None]; y=x
                while len(y)<int(d*SR): y=np.concatenate([y[:-xf],y[-xf:]*np.sqrt(1-r)+x[:xf]*np.sqrt(r),x[xf:]])
                x=y
            x=x[:int(d*SR)].copy(); a_=int(fin*SR); b_=int(fout*SR)
            x[:a_]*=np.sin(np.linspace(0,np.pi/2,a_))[:,None]; x[-b_:]*=np.cos(np.linspace(0,np.pi/2,b_))[:,None]
            i=int(t0*SR); n=min(len(x),N-i); c[i:i+n]+=x[:n]*10**(gain/20)
        mx=v+bed+c; print('peak before limit',round(20*np.log10(np.abs(mx).max()),2))
        def w(f,x):
            with wave.open(f,'wb') as q:
                q.setnchannels(2);q.setsampwidth(2);q.setframerate(SR);q.writeframes((np.clip(x,-1,1)*32767).astype(np.int16).tobytes())
        w(f'{B}/bed.wav',bed+c); w(f'{B}/mixraw.wav',mx)
        subprocess.run(['ffmpeg','-y','-v','error','-i',f'{B}/mixraw.wav','-af','alimiter=limit=0.84:attack=5:release=80:level=disabled',f'{B}/mix.wav'],check=True)
        subprocess.run(['ffmpeg','-y','-v','error','-i',f'{B}/captioned.mp4','-i',f'{B}/mix.wav','-map','0:v','-map','1:a','-c:v','copy','-af','aresample=48000','-c:a','aac','-b:a','192k','-t',f'{T:.3f}','-movflags','+faststart',out],check=True)
        ex=subprocess.check_output("find ~/Developer/football-stories-101/node_modules -type f -name exiftool -perm +111 | head -1",shell=True,text=True).strip()
        subprocess.run([ex,'-overwrite_original','-q','-XMP-iptcExt:DigitalSourceType=http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia',out],check=True)
        print('written',out)

# ---- helpers for drawn pitch maps
def lerp(a,b,u): return (a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u)
def catmull(pts,n=40):
    out=[]; P=[pts[0]]+pts+[pts[-1]]
    for i in range(1,len(P)-2):
        for k in range(n):
            u=k/n; p0,p1,p2,p3=P[i-1],P[i],P[i+1],P[i+2]
            out.append(tuple(0.5*((2*p1[c])+(-p0[c]+p2[c])*u+(2*p0[c]-5*p1[c]+4*p2[c]-p3[c])*u*u+(-p0[c]+3*p1[c]-3*p2[c]+p3[c])*u**3) for c in (0,1)))
    out.append(pts[-1]); return out
def dot(d,p,r,fill,outline=(0,0,0,255),w=5): d.ellipse((p[0]-r,p[1]-r,p[0]+r,p[1]+r),fill=fill,outline=outline,width=w)
