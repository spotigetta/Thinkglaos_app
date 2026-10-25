"""Create consistent, non-destructive playback masters for the live voice bank."""
import json,subprocess,math
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
root=Path(__file__).resolve().parent.parent
ff=str(next((root/'.local/audio-tools').rglob('ffmpeg*.exe')).resolve())
folder=root/'public/media/voces-master-v1';folder.mkdir(exist_ok=True)
paths=[c['url'] for name in ['locuciones.json','locuciones-oct25.json'] for c in json.loads((root/'public/media'/name).read_text(encoding='utf8'))['cues']]
paths.append('./media/audio-manolo-whatsapp.mp3')

def measure(path):
 r=subprocess.run([ff,'-hide_banner','-nostats','-i',str(path),'-af','loudnorm=I=-16:TP=-2:LRA=7:print_format=json','-f','null','-'],capture_output=True,text=True,encoding='utf-8',errors='replace',check=True)
 return json.JSONDecoder().raw_decode(r.stderr[r.stderr.rfind('{'):])[0]

def prepare(url):
 source=root/'public'/url[2:];target=folder/source.name
 before=measure(source)
 if not math.isfinite(float(before['input_i'])):raise ValueError('Silent source: '+url)
 # Static loudness gain plus an oversampled look-ahead limiter also works for
 # very short cues, where loudnorm's time-varying envelope can under-amplify.
 gain=-16-float(before['input_i'])
 for attempt in range(5):
  filt=f'aresample=192000,volume={gain}dB,alimiter=limit=0.794328:level=false:attack=3:release=100:latency=true,aresample=48000'
  subprocess.run([ff,'-v','error','-i',str(source),'-af',filt,'-ar','48000','-b:a','192k','-y',str(target)],check=True)
  after=measure(target)
  difference=-16-float(after['input_i'])
  if abs(difference)<.6:break
  gain+=difference
 row=dict(source=url,url='./media/voces-master-v1/'+source.name,beforeLUFS=float(before['input_i']),afterLUFS=float(after['input_i']),truePeakDB=float(after['input_tp']))
 if not -17<=row['afterLUFS']<=-15 or row['truePeakDB']>-.7:raise ValueError('Master outside safe range: '+str(row))
 print(source.name,row['beforeLUFS'],'->',row['afterLUFS'],'LUFS, peak',row['truePeakDB'],flush=True)
 return row
if __name__=='__main__':
 with ThreadPoolExecutor(max_workers=3) as pool: rows=list(pool.map(prepare,paths))
 (root/'public/media/voice-master-v1.json').write_text(json.dumps(dict(targetLUFS=-16,truePeakTargetDB=-2,files=rows),ensure_ascii=False,indent=2),encoding='utf8')
 print('Verified masters:',len(rows),flush=True)
