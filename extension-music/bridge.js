window.addEventListener('message',event=>{
 if(event.source!==window||event.origin!==location.origin)return;
 const type=event.data?.type;
 if(type==='ITTT_MUSIC_PING')window.postMessage({type:'ITTT_MUSIC_READY'},location.origin);
 if(['ITTT_MUSIC_DUCK','ITTT_MUSIC_RESTORE'].includes(type))chrome.runtime.sendMessage({duck:type==='ITTT_MUSIC_DUCK'}).catch(()=>{});
});
window.postMessage({type:'ITTT_MUSIC_READY'},location.origin);
