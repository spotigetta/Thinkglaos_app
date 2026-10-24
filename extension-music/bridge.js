let armed=false;
window.addEventListener('message',event=>{
 if(event.source!==window||event.origin!==location.origin)return;
 const type=event.data?.type;
 if(type==='ITTT_MUSIC_ARM'){if(armed&&!event.data.enabled)chrome.runtime.sendMessage({duck:false}).catch(()=>{});armed=event.data.enabled===true;return;}
 if(type==='ITTT_MUSIC_PING')window.postMessage({type:'ITTT_MUSIC_READY'},location.origin);
 if(armed&&['ITTT_MUSIC_DUCK','ITTT_MUSIC_RESTORE'].includes(type))chrome.runtime.sendMessage({duck:type==='ITTT_MUSIC_DUCK',level:event.data.level}).catch(()=>{});
});
window.postMessage({type:'ITTT_MUSIC_READY'},location.origin);
