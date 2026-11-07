"""Measures a finished Reel against the standards in ../references/standards.md. Prints PASS or FAIL per line.
Run from the reel's folder with the .venv python: check_reel.py final.mp4
A pass here is necessary, not sufficient: a person or independent agent must still look and listen."""
import subprocess,json,sys,re,numpy as np
from PIL import Image
f=sys.argv[1]; SR=44100; B='build'; fails=0
def say(ok,msg):
    global fails; print(('PASS  ' if ok else 'FAIL  ')+msg); fails+=0 if ok else 1
def load(p):
    d=subprocess.run(['ffmpeg','-v','error','-i',p,'-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True,check=True).stdout
    return np.frombuffer(d,np.float32).astype(np.float64)
rms=lambda x:20*np.log10(np.sqrt((x**2).mean())+1e-6)
p=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',f]))
vs=[s for s in p['streams'] if s['codec_type']=='video'][0]; a_=[s for s in p['streams'] if s['codec_type']=='audio'][0]; D=float(p['format']['duration'])
say(vs['codec_name']=='h264' and vs['width']==1080 and vs['height']==1920 and vs['r_frame_rate']=='30/1' and vs['pix_fmt']=='yuv420p','picture: H.264, 1080x1920, 30 fps, yuv420p')
say(a_['codec_name']=='aac' and a_['sample_rate']=='48000' and a_['channels']==2,'sound: AAC, 48 kHz, stereo')
say(float(p['format']['size'])<100e6 and D<=90,f'{D:.1f} s, {float(p["format"]["size"])/1e6:.1f} MB')
e=subprocess.run(['ffmpeg','-hide_banner','-i',f,'-vn','-af','ebur128=peak=true','-f','null','-'],capture_output=True,text=True).stderr
I=float(re.findall(r'I:\s+(-?[\d.]+) LUFS',e)[-1]); P=float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS',e)[-1])
say(-15<=I<=-13,f'loudness {I} LUFS (want -14, within 1)'); say(P<=-1,f'true peak {P} dBTP (want -1 or lower)')
ex=subprocess.check_output("find ~/Developer/football-stories-101/node_modules -type f -name exiftool -perm +111 | head -1",shell=True,text=True).strip()
tag=subprocess.run([ex,'-s','-s','-s','-XMP-iptcExt:DigitalSourceType',f],capture_output=True,text=True).stdout
say('trainedAlgorithmicMedia' in tag,'AI tag present')
J=json.load(open(f'{B}/timing.json')); bl=subprocess.run(['ffmpeg','-hide_banner','-i',f,'-vf','blackdetect=d=0.1:pix_th=0.05','-an','-f','null','-'],capture_output=True,text=True).stderr
say('black_start' not in bl,'no black frames')
for i,(t,s,e_) in enumerate(J['caps']):
    d=e_-s; cps=len(t)/max(d,1e-3)
    if d<0.9 or cps>27: say(False,f'caption too quick: {t!r} {d:.2f} s, {cps:.0f} characters a second')
v=load(f'{B}/voice.wav'); b=load(f'{B}/bed.wav'); n=min(len(v),len(b)); m=load(f); gaps=[]
for l in J['lines']:
    s=int(l['t']*SR); e_=min(n,int((l['t']+l['d'])*SR)); gaps.append(rms(v[s:e_])-rms(b[s:e_]))
say(all(8<=g<=18 for g in gaps),'voice above music per line (want 8 to 18 dB): '+' '.join(f'{g:.1f}' for g in gaps))
step=int(.25*SR); hop=int(.05*SR); end=int((J['voice_end'])*SR)
prof=np.array([rms(b[i:i+step]) for i in range(int(.5*SR),end-step,hop)]); dd=np.abs(np.diff(prof))
say(dd.max()<=6,f'music has no sudden steps: largest {dd.max():.1f} dB in 50 ms (want 6 or less)')
# does the bed move with the words? a pumping mix rises in every gap
act=np.array([rms(v[i:i+step]) for i in range(int(.5*SR),end-step,hop)])>-35
c=float(np.corrcoef(act.astype(float),prof[:len(act)])[0,1]); say(abs(c)<0.2,f'music does not pump with the voice: correlation {c:.2f} (want under 0.2)')
tail=[rms(b[i:i+step]) for i in range(n-step*12,n-step+1,step)]
say(max(tail[:-2])>-30 and tail[-1]<max(tail)-5,'music present on the end card and fades out: '+' '.join(f'{x:.0f}' for x in tail))
sub=subprocess.run(['ffmpeg','-y','-v','error','-i',f,'-vn','-ac','1','-ar','16000',f'{B}/final16.wav'],check=True)
from faster_whisper import WhisperModel
M=WhisperModel('base.en',compute_type='int8'); got=[w.word.strip() for s in M.transcribe(f'{B}/final16.wav',word_timestamps=True)[0] for w in s.words]
SAME={'nine':'9','fourth':'4th','one':'1','1':'1'}   # the transcriber writes the same spoken word either way
norm=lambda w:(lambda x:SAME.get(x,x))(re.sub(r"[^a-z0-9']",'',w.lower())); want=[w[0] for l in J['lines'] for w in l['w']]
import difflib
sm=difflib.SequenceMatcher(a=[norm(w) for w in want],b=[norm(w) for w in got]); bad=[(want[o[1]:o[2]],got[o[3]:o[4]]) for o in sm.get_opcodes() if o[0]!='equal']
say(not bad,f'every word survives the music: {len(want)} expected, {len(got)} heard'+(f'; differences {bad}' if bad else ''))
print('\nTRANSCRIPT\n'+' '.join(got))
# one contact sheet to LOOK at, full size frames are for anything doubtful
T=D; ims=[]; ts=np.arange(0.5,T,1.0)
for t in ts:
    subprocess.run(['ffmpeg','-y','-v','error','-ss',str(t),'-i',f,'-frames:v','1','-vf','scale=300:-1',f'{B}/_c.png'],check=True); ims.append(Image.open(f'{B}/_c.png').convert('RGB').copy())
cols=9; rows=(len(ims)+cols-1)//cols; sh=Image.new('RGB',(300*cols,533*rows))
for i,im in enumerate(ims): sh.paste(im,((i%cols)*300,(i//cols)*533))
sh.save(f'{B}/contact.jpg',quality=80); print(f'\nLOOK AT {B}/contact.jpg (one frame a second)')
print(f'\n{fails} measured failure(s).'); sys.exit(1 if fails else 0)
