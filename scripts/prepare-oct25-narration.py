import re,json,difflib,unicodedata,wave,subprocess,sys
from pathlib import Path
sys.path.insert(0,str(Path('.local/speech-tools').resolve()))
import numpy as np

def tokens(s):
 s=unicodedata.normalize('NFKD',s.lower()).encode('ascii','ignore').decode()
 return [{'1':'uno','2':'dos','3':'tres','4':'cuatro','5':'cinco','8':'ocho','18':'dieciocho','20':'veinte','40':'cuarenta','100':'cien'}.get(t,t) for t in re.findall(r'[a-z0-9]+',s)]

def build():
 text=Path('../ITTT_AI_Studio_3_GENERACIONES_CON_EXPRESIONES.md').read_text(encoding='utf-8-sig')
 gens=re.split(r'## Generación \d[^\n]*',text)[1:]
 ff=str(next(Path('.local/audio-tools').rglob('ffmpeg*.exe')).resolve())
 allcues=[];reports=[]
 for gen,(block,stamp) in enumerate(zip(gens,['10_03AM','10_10AM','10_15AM']),1):
  source=next(Path('..').glob('*'+stamp+'.wav'))
  raw=json.loads((Path('.local')/(source.stem+'.json')).read_text(encoding='utf8'))
  phrases=[]
  for speaker,b in enumerate(re.split(r'### Speaker \d',block)[1:],1):
   speech=re.search(r'\*\*Texto[^\n]*\n\s*```text\n(.*?)```',b,re.S).group(1)
   for index,p in enumerate(speech.strip().split('\n\n')):
    p=re.sub(r'<[^>]+>','',p).strip()
    if p: phrases.append((speaker,index,p))
  words=[w for s in raw for w in s['words']]
  actual=[];indices=[]
  for i,w in enumerate(words):
   for t in tokens(w['word']):actual.append(t);indices.append(i)
  expected=[];owners=[]
  for i,(_,_,p) in enumerate(phrases):
   for t in tokens(p):expected.append(t);owners.append(i)
  matcher=difflib.SequenceMatcher(None,expected,actual,autojunk=False);mapped={}
  for b in matcher.get_matching_blocks():
   for j in range(b.size):mapped.setdefault(owners[b.a+j],[]).append(indices[b.b+j])
  if len(mapped)!=len(phrases):raise ValueError(f'Frase no alineada {gen}: {set(range(len(phrases)))-set(mapped)}')
  with wave.open(str(source)) as wav:
   params=wav.getparams();rate=wav.getframerate();channels=wav.getnchannels();width=wav.getsampwidth();duration=wav.getnframes()/rate;pcm=wav.readframes(wav.getnframes())
  if width!=2:raise ValueError('Se requiere PCM16')
  samples=np.frombuffer(pcm,dtype='<i2').astype(float).reshape(-1,channels).mean(axis=1)
  boundaries=[max(0,words[min(mapped[0])]['start']-.3)]
  for i in range(1,len(phrases)):
   left=words[max(mapped[i-1])]['end'];right=words[min(mapped[i])]['start']
   if right<left:raise ValueError(f'Solapamiento {gen} {i}')
   center=(left+right)/2
   lo=max(left-.02,center-.4);hi=min(right+.02,center+.4)
   candidates=np.arange(lo,hi,.005)
   if not len(candidates):candidates=np.array([center])
   energies=[np.sqrt(np.mean(samples[max(0,int((c-.01)*rate)):int((c+.01)*rate)]**2)) for c in candidates]
   floor=min(energies);quiet=[c for c,e in zip(candidates,energies) if e<=max(85,floor*1.25)]
   boundaries.append(round(float(min(quiet,key=lambda c:abs(c-center))),4))
  boundaries.append(min(duration,words[max(mapped[len(phrases)-1])]['end']+.7))
  if gen==3:
   # The recording adds improvised introductions before each story; retain them whole.
   boundaries=[0,45.3,96.4,138.9,duration]
  if gen==2:
   # Local re-transcription restores "Qué tranquilidad", omitted by the long pass.
   # "fácil" ends at 188.16; "Qué" starts at 189.50: cut within that silence.
   boundaries[33]=188.83
  print('GENERACION',gen,'frases',len(phrases),'match',round(matcher.ratio(),3),flush=True)
  for i,(speaker,n,p) in enumerate(phrases):
   coverage=len(mapped[i])/len(tokens(p))
   start=boundaries[i];end=boundaries[i+1]
   if gen==1:
    scenes=['agradecimiento'] if speaker==2 and n==15 else ['montaje']
   elif gen==2:
    scenes=['pizzas'] if speaker==2 and n in [10,12,13,14] else ['ambiente','pizzas']
   else:scenes=['montaje','pizzas']
   voice={1:{1:4,2:5},2:{1:6,2:7},3:{1:8}}[gen][speaker]
   name=f'oct25-g{gen}-s{speaker}-{n+1:02d}.mp3';target=Path('public/media/locuciones')/name
   chunk=pcm[round(start*rate)*channels*width:round(end*rate)*channels*width]
   with wave.open('.local/oct25-cut.wav','wb') as w:w.setparams(params);w.writeframes(chunk)
   subprocess.run([ff,'-v','error','-i','.local/oct25-cut.wav','-af',f'afade=t=in:d=0.01,afade=t=out:st={max(0,end-start-.02)}:d=0.02','-b:a','192k','-y',str(target)],check=True)
   cue=dict(start=start,end=end,text=p,voice=voice,url='./media/locuciones/'+name,scenes=scenes,block=f'Generación {gen} · voz {speaker}',source=source.name,alignment=round(coverage,3))
   if gen==1 and speaker==1 and n==28:
    cue['automatic']=False
    cue['note']='Solo manual: la grabación original omite parte de esta frase.'
   if gen==3:
    cue['note']='Relato completo con las improvisaciones de la grabación.'
   allcues.append(cue)
   reports.append(dict(**cue,recognized=' '.join(w['word'] for w in words[min(mapped[i]):max(mapped[i])+1])))
   print(gen,speaker,n+1,round(coverage,2),start,end,p[:65],flush=True)
 Path('public/media/locuciones-oct25.json').write_text(json.dumps(dict(method='Whisper local con marcas de palabra, alineación al guion y mínimos de energía entre frases',cues=allcues),ensure_ascii=False,indent=2),encoding='utf8')
 Path('.local/oct25-alignment-report.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2),encoding='utf8')
if __name__=='__main__':build()
