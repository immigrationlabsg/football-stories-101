# Worked example: the approved Maradona Reel. Copy this file to a new reel's folder as reel.py and change the script,
# shots, maps and fader. Run: ~/Developer/football-stories-samples/.venv/bin/python -I reel.py
import sys,os,subprocess; sys.path.insert(0,os.path.expanduser('~/Developer/football-stories-101/.claude/skills/narrated-reel/scripts'))
from reel_engine import *
TEMPO=[1.15,1.15,1.15,1.15,1.15,1.15,1.0,1.0]
GAP=[0.10,0.20,0.05,0.30,0.15,0.10,0.35,0.0]
# (words in chunk, caption text, accented words, y centre)
Y=1385
CH=[
 [(4,"THE MOST NOTORIOUS GOAL",{"NOTORIOUS"},Y),(4,"IN WORLD CUP HISTORY",set(),Y),(3,"FOUR MINUTES LATER",{"FOUR","MINUTES"},Y),(4,"THE SAME MAN SCORED",{"SAME","MAN"},Y),(5,"THE GOAL OF THE CENTURY",{"CENTURY"},Y)],
 [(4,"MEXICO, 1986, AGAINST ENGLAND",{"1986"},Y),(4,"SHILTON IS MUCH TALLER",{"TALLER"},Y),(5,"SO MARADONA RAISES HIS FIST",{"FIST"},Y),(4,"AND PUNCHES IT IN",{"PUNCHES"},Y)],
 [(8,"FOUR MINUTES LATER, HE PICKS UP THE BALL",{"FOUR","MINUTES"},Y),(4,"IN HIS OWN HALF",{"OWN","HALF"},680)],
 [(5,None,set(),0),(6,"ENGLAND PLAYERS, THEN ROUND THE KEEPER",{"KEEPER"},205),(3,"ABOUT 11 SECONDS",{"11"},Y)],
 [(7,"BUT HERE'S THE PART THAT SURPRISED ME",{"SURPRISED"},Y),(5,"SIX YEARS EARLIER, AT WEMBLEY",{"WEMBLEY"},Y-70),(7,"HE RAN THROUGH ENGLAND AND SHOT WIDE",{"WIDE"},250)],
 [(5,"HIS LITTLE BROTHER TOLD HIM",{"BROTHER"},Y),(7,"HE SHOULD HAVE GONE ROUND THE KEEPER",{"ROUND"},250)],
 [(2,"IN 1986",{"1986"},Y),(2,"FACING SHILTON",{"SHILTON"},Y),(2,"HE REMEMBERED",{"REMEMBERED"},Y)],
 [(5,"THE CHEAT AND THE GENIUS",{"CHEAT","GENIUS"},Y),(2,"SAME MAN",set(),Y),(3,"FOUR MINUTES APART",{"FOUR","MINUTES"},Y)],
]
R=Reel(os.path.dirname(os.path.abspath(__file__)),CH,TEMPO,GAP,scenes='scenes2')
wt,lt=R.wt,R.lt; VOICE_END=R.VOICE_END; S=R.S
R.extend={'goal':(62,95),'round':(30,60)}
# drawn pitch maps (pictures for what no photograph shows)
def base():
    im=Image.open(f'{R.S}/scenes/pitch.png').convert('RGB'); s=W/im.width
    im=im.resize((W,int(im.height*s)),Image.LANCZOS); c=Image.new('RGB',(W,H)); c.paste(im,(0,0))
    ph=H-im.height; pad=im.crop((0,int(im.height*0.40),W,int(im.height*0.40)+ph+60)); fade=Image.new('L',(W,ph+60),255); ImageDraw.Draw(fade).rectangle((0,0,W,0),fill=255)
    fade=Image.linear_gradient('L').resize((W,60)); m=Image.new('L',(W,ph+60),255); m.paste(fade,(0,0)); c.paste(pad,(0,im.height-60),m)
    return c,s
BASE,SC=base()
def map_run(out):
    t0=wt(2,8); T=wt(3,11)-t0  # from "in his own half" to "about"
    hits=[wt(3,i)-t0 for i in range(5)]; kt=lt(3)+R.lines[3]['w'][10][2]-t0
    goal_y=int(1385*SC)
    mark=[(690,330),(600,560),(760,800),(620,1030),(730,1210)]
    keep=(560,int(1330*SC)); end=(540,goal_y-6)
    # waypoints of the run: each England player is passed on his count
    way=[(700,62)]+[(mark[0][0]+60,mark[0][1])]+[(mark[1][0]-70,mark[1][1])]+[(mark[2][0]-70,mark[2][1])]+[(mark[3][0]+70,mark[3][1])]+[(mark[4][0]-70,mark[4][1])]+[(keep[0]+95,keep[1]-20),(keep[0]+70,keep[1]+70),end]
    t_h=lt(2)+R.lines[2]['w'][11][2]-t0; times=[t_h]+[max(t_h+0.05,h) for h in hits]+[kt-0.45,kt-0.15,kt]
    path=catmull(way,30)
    nseg=len(way)-1; frames=int(round(T*FPS))
    big=ImageFont.truetype(FONT,420)
    p=encoder(out,18)
    for f in range(frames):
        now=f/FPS
        seg=nseg-1
        for i in range(nseg):
            if now<times[i+1]: seg=i;break
        u=min(1,max(0,(now-times[seg])/max(1e-3,times[seg+1]-times[seg])))
        idx=min(len(path)-1,int((seg+u)*30))
        im=BASE.copy().convert('RGBA'); ov=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(ov)
        pts=path[:idx+1]
        if len(pts)>1:
            d.line(pts,fill=(0,0,0,170),width=34,joint='curve'); d.line(pts,fill=GOLD,width=20,joint='curve')
        passed=sum(1 for h in hits if now>=h)
        for i,m in enumerate(mark):
            if i<passed:
                age=now-hits[i]; r=int(44+44*max(0,1-age/0.25))
                dot(d,m,r,(255,255,255,255) if age<0.25 else (205,205,205,235),(200,30,30,255) if age<0.25 else (0,0,0,255),8 if age<0.25 else 5)
            else: dot(d,m,44,(255,255,255,255))
        dot(d,keep,46,(60,60,60,255),(255,255,255,255),7)
        dot(d,path[idx],52,(70,150,235,255),(255,255,255,255),8)
        if 0<passed:
            n=str(passed); a=now-hits[passed-1];
            if passed==5: a=min(a,0.3)
            fs=420 if a>0.12 else int(420*(1.25-2*a))
            fb=big if fs==420 else ImageFont.truetype(FONT,fs)
            x=240-fb.getlength(n)/2; y=620-fs*0.62
            if now<wt(3,5)-t0+0.5 or True:
                d.text((x,y),n,font=fb,fill=GOLD,stroke_width=14,stroke_fill=(0,0,0,255))
        fr=Image.alpha_composite(im,ov).convert('RGB'); p.stdin.write(fr.tobytes())
    p.stdin.close(); p.wait(); return frames
def map_wembley(out,t_a,t_b,t_shot,t_round,t_end):
    goal_y=int(1385*SC); t0=lt(4)+R.lines[4]['w'][12][1]-0.04
    keep=(650,goal_y-160); marks=[(600,640),(770,800),(610,960),(740,1090)]
    way=[(690,470),(660,640),(710,800),(670,960),(690,1090),(660,1190)]; path=catmull(way,30)
    shot0=(660,1190); wide=(335,goal_y+6)   # inches past the far post
    rpts=catmull([shot0,(790,1240),(785,keep[1]+50),(680,keep[1]+135),(540,goal_y-8)],30)
    big=ImageFont.truetype(FONT,132); lab="1980"
    p=encoder(out,18)
    A=t_shot-t0; frames=int(round(t_b*FPS))-int(round(t_a*FPS))
    for f in range(frames):
        ab=t_a+f/FPS; now=ab-t0; im=BASE.copy().convert('RGBA'); ov=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(ov)
        u=min(1,now/A); idx=int(u*(len(path)-1)); pts=path[:idx+1]
        if len(pts)>1: d.line(pts,fill=(0,0,0,170),width=30,joint='curve'); d.line(pts,fill=(90,170,255,255),width=16,joint='curve')
        for i,m in enumerate(marks):
            gone=idx>=30*(i+1)
            dot(d,m,44,(205,205,205,235) if gone else (255,255,255,255))
        v=min(1,max(0,(ab-t_shot)/0.45))
        if v>0:
            e=lerp(shot0,wide,v); d.line([shot0,e],fill=(0,0,0,170),width=26); d.line([shot0,e],fill=(235,60,50,255),width=14)
            dot(d,e,20,(255,255,255,255))
        w=(ab-t_round)/max(0.1,t_end-t_round-0.2)
        if w>0:
            n=int(min(1,w)*(len(rpts)-1))
            for i in range(0,n,7):
                q=rpts[i]; d.ellipse((q[0]-17,q[1]-17,q[0]+17,q[1]+17),fill=GOLD,outline=(0,0,0,255),width=4)
        dot(d,keep,46,(60,60,60,255),(255,255,255,255),7); dot(d,path[idx],52,(70,150,235,255),(255,255,255,255),8)
        d.text((270-big.getlength(lab)/2,520),lab,font=big,fill=GOLD,stroke_width=10,stroke_fill=(0,0,0,255))
        p.stdin.write(Image.alpha_composite(im,ov).convert('RGB').tobytes())
    p.stdin.close(); p.wait()

def still(name,s,e,**k): R.still(name,s,e,folder='scenes',**k)
b0=wt(0,8); b1=lt(1)
R.anim('hand',0,b0,(1.0,1.08,0,0,20,0))
R.anim('goal',b0,b1,(1.0,1.02,0,0,0,0))
b2=wt(1,4); b3=wt(1,8); b3b=wt(1,13); b4=lt(2)
R.anim('hand',b1,b2,(1.2,1.0,0,0,120,0))
R.anim('fist',b2,b3,(1.0,1.05,25,25,0,48))
R.anim('fist',b3,b3b,(1.05,1.09,25,25,48,86))
R.anim('hand',b3b,b4,(1.0,1.08,0,0,30,20),hit=0.42)   # the one flash in the Reel: "punches"
bm0=wt(2,8)
R.anim('run',b4,bm0,(1.0,1.03,-45,-60,0,-10))
map_run(R.next_out())
b6=wt(3,11); b7=lt(4)
R.anim('round',b6,b7,(1.0,1.05,0,0,0,0))
b8=wt(4,7); b8b=wt(4,12); b9=lt(5); bb=wt(5,5); b10=lt(6)
R.anim('celebrate',b7,b8,(1.0,1.04,-21,-21,0,10))
still('wembley',b8,b8b,z0=1.0,z1=1.14,cx=0.5,cy=0.6)
map_wembley(R.next_out(),b8b,b9,wt(4,17),bb+0.05,b10)
still('wembley',b9,bb,z0=1.75,z1=1.55,cx=0.3,cy=0.28)
map_wembley(R.next_out(),bb,b10,wt(4,17),bb+0.05,b10)
b11=lt(7); bk=wt(6,4)
R.anim('round',b10,bk,(1.0,1.4,0,216,0,0))   # a slow push on the payoff
R.anim('goal',bk,b11,(1.0,1.02,0,0,0,0))
c1=wt(7,3)-0.08; c2=wt(7,5); e7=VOICE_END
R.anim('fist',b11,c1,(1.0,1.04,25,25,0,0))
R.anim('goal',c1,c2,(1.0,1.02,0,0,0,0))
R.anim('celebrate',c2,e7,(1.0,1.04,-21,-21,0,10))
R.endcard(('fist',(0,0,1024,720)),('goal',(0,470,1024,1190)),[("CHEAT",WHITE),("OR GENIUS?",GOLD)])
R.finish_video(sizes={'ABOUT 11 SECONDS':96,'ENGLAND PLAYERS, THEN ROUND THE KEEPER':(60,960)})
VE=VOICE_END; T=dur(f'{R.B}/captioned.mp4')
fader=[(0,-11.5),(lt(1)-0.2,-11.5),(lt(2),-13),      # hook, then settle under the story
 (wt(3,0)-0.8,-13),(wt(3,0)+0.8,-10.5),(lt(4)-0.8,-10.5),(lt(4)+0.8,-13),   # lift through the run
 (wt(6,4)-1.0,-13),(wt(6,4)+0.2,-15),(lt(7)-0.5,-15),(lt(7)+0.8,-12),       # hush on "he remembered"
 (VE-0.2,-12),(VE+0.9,-4.5),(T,-4.5)]                                       # up on the end card
crowd=[('clips/goal.mp4',wt(0,8),5.0,-20,1.5,2.0,False),('clips/run.mp4',wt(3,0)-0.5,lt(4)-wt(3,0)+1.5,-19,1.5,2.0,True),('clips/goal.mp4',VE-0.3,T-VE+0.3,-20,1.0,1.2,False)]
R.mix('final.mp4',music='music.mp3',join=(15.839,33.294),end_src=38.9,fader=fader,crowd=crowd,level_until=38)
