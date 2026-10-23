import json,re,unicodedata,difflib,wave,subprocess,hashlib
import numpy as np
from pathlib import Path
def tokens(text):
    parts=re.findall(r'[a-z0-9]+',unicodedata.normalize('NFKD',text.lower()).encode('ascii','ignore').decode())
    return [{'1':'uno','2':'dos','3':'tres','5':'cinco','18':'dieciocho'}.get(p,p) for p in parts]
text=Path('../narraciones.md').read_text(encoding='utf-8')
phrases=[]
for number,block in enumerate(re.split(r'## Voz \d[^\n]*',text)[1:],1):
    lines=block.split('### Narraciones')[1].split('---')[0]
    phrases.extend((number,re.sub(r'<[^>]+>','',p).strip()) for p in lines.split('\n\n') if p.strip())
segments=json.loads(Path('.local/narration-transcript.json').read_text(encoding='utf-8'))
words=[w for s in segments for w in s['words']]
actual=[]; indices=[]
for i,w in enumerate(words):
    for token in tokens(w['word']):actual.append(token);indices.append(i)
expected=[];owners=[]
for i,(_,p) in enumerate(phrases):
    for token in tokens(p):expected.append(token);owners.append(i)
matcher=difflib.SequenceMatcher(None,expected,actual,autojunk=False)
mapped={}
for b in matcher.get_matching_blocks():
    for j in range(b.size):mapped.setdefault(owners[b.a+j],[]).append(indices[b.b+j])
if len(mapped)!=len(phrases):raise ValueError('Una frase no está alineada; revisar antes de publicar')
with wave.open('../Audio_Previo_Thinkglao.wav') as w:
    rate=w.getframerate();duration=w.getnframes()/rate
    samples=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float)
boundaries=[0.0]
for i in range(1,len(phrases)):
    left=words[max(mapped[i-1])]['end'];right=words[min(mapped[i])]['start']
    if right<left:raise ValueError('Alineación solapada')
    boundaries.append(round((left+right)/2,3))
boundaries.append(duration)
for i in range(1,len(boundaries)-1):
    center=boundaries[i];candidates=np.arange(max(0,center-.35),min(duration,center+.35),.01)
    energy=[np.sqrt(np.mean(samples[int((c-.025)*rate):int((c+.025)*rate)]**2)) for c in candidates]
    floor=min(energy);quiet=[c for c,e in zip(candidates,energy) if e<=max(100,floor*1.25)]
    boundaries[i]=round(float(min(quiet,key=lambda c:abs(c-center))),3)
cues=[dict(voice=v,text=p,start=boundaries[i],end=boundaries[i+1]) for i,(v,p) in enumerate(phrases)]
Path('public/media/locuciones').mkdir(exist_ok=True)
ffmpeg=str(next(Path('.local/audio-tools').rglob('ffmpeg*.exe')).resolve())
for i,c in enumerate(cues):
    name=f'voz-{i+1:02d}-pcm-v2.mp3';c['url']='./media/locuciones/'+name
    length=c['end']-c['start']
    with wave.open('../Audio_Previo_Thinkglao.wav') as source:
        source.setpos(round(c['start']*rate));pcm=source.readframes(round(length*rate))
    with wave.open('.local/exact-phrase.wav','wb') as target:
        target.setnchannels(1);target.setsampwidth(2);target.setframerate(rate);target.writeframes(pcm)
    subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-i','.local/exact-phrase.wav','-af',f'afade=t=in:d=0.015,afade=t=out:st={max(0,length-.025)}:d=0.025','-b:a','192k','-y','public/media/locuciones/'+name],check=True)
Path('public/media/locuciones.json').write_text(json.dumps(dict(method='Whisper local + alineación del guion; cortes entre frases',match=round(matcher.ratio(),3),cues=cues),ensure_ascii=False,indent=2),encoding='utf-8')
print('Frases:',len(cues),'Coincidencia:',round(matcher.ratio(),3))
for i,c in enumerate(cues):print(i+1,c['voice'],c['start'],c['end'],c['text'][:50])
