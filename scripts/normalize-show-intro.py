"""Prepare a non-destructive intro master; keep the original pictures and silence intact."""
from pathlib import Path
import subprocess,json,math,hashlib
root=Path(__file__).resolve().parent.parent
ff=str(next((root/'.local/audio-tools').rglob('ffmpeg*.exe')))
source=root/'public/media/intro-thunder.mp4';target=root/'public/media/intro-thunder-master-v1.mp4'
def measure(path,start=None,duration=None):
 args=[ff,'-hide_banner','-nostats','-i',str(path)]
 trim=f'atrim=start={start or 0}'
 if duration is not None:trim+=f':duration={duration}'
 args+=['-vn','-af',trim+',asetpts=PTS-STARTPTS,loudnorm=I=-14:TP=-2:LRA=8:print_format=json','-f','null','-']
 p=subprocess.run(args,capture_output=True,text=True,encoding='utf-8',errors='replace',check=True)
 d=json.JSONDecoder().raw_decode(p.stderr[p.stderr.rfind('{'):])[0]
 return {'LUFS':float(d['input_i']),'truePeakDB':float(d['input_tp'])}
# Reviewed source transitions: opening spoken cue 0–10 s, then quiet footage;
# music enters after 46 s. Preserve the quiet middle instead of amplifying noise.
spoken=measure(source,0,10);music=measure(source,46);silence=measure(source,20,20)
spoken_gain=-14-spoken['LUFS'];music_gain=-13-music['LUFS']
expr=f'if(lt(t,10),{10**(spoken_gain/20)},if(lt(t,46),1,{10**(music_gain/20)}))'
filt=f"aresample=192000,volume='{expr}':eval=frame,alimiter=limit=0.794328:level=false:attack=3:release=80:latency=true,aresample=48000"
subprocess.run([ff,'-v','error','-i',str(source),'-map','0:v:0','-map','0:a:0','-c:v','copy','-af',filt,'-c:a','aac','-b:a','256k','-ar','48000','-movflags','+faststart','-y',str(target)],check=True)
after={'spoken':measure(target,0,10),'music':measure(target,46),'quiet':measure(target,20,20),'whole':measure(target)}
assert -16<=after['spoken']['LUFS']<=-13,after
assert -14<=after['music']['LUFS']<=-12,after
assert after['quiet']['LUFS']<=-48,after
assert after['whole']['truePeakDB']<-.5,after
report={'source':'./media/intro-thunder.mp4','url':'./media/intro-thunder-master-v1.mp4','spokenGainDB':spoken_gain,'musicGainDB':music_gain,'before':{'spoken':spoken,'music':music,'quiet':silence},'after':after,'videoCodec':'copy','audioCodec':'AAC 256k stereo 48kHz'}
def video_hash(path):
 return subprocess.run([ff,'-v','error','-i',str(path),'-map','0:v:0','-c:v','copy','-f','hash','-hash','sha256','-'],capture_output=True,text=True,check=True).stdout.strip()
report['sourceSHA256']=hashlib.sha256(source.read_bytes()).hexdigest()
report['masterSHA256']=hashlib.sha256(target.read_bytes()).hexdigest()
report['videoSHA256']=video_hash(source)
assert report['videoSHA256']==video_hash(target),'Video packets changed'
(root/'public/media/intro-master-v1.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2),flush=True)
