chrome.runtime.onMessage.addListener(async(message,sender)=>{
 if(!sender.tab||typeof message.duck!=='boolean')return;
 const origin=new URL(sender.url||sender.tab.url||'about:blank');
 if(!(origin.origin==='https://spotigetta.github.io'&&origin.pathname.startsWith('/Thinkglaos_app/'))&&!['http://127.0.0.1:3000','http://localhost:3000'].includes(origin.origin))return;
 const tabs=await chrome.tabs.query({url:['https://music.youtube.com/*','https://open.spotify.com/*']});
 await Promise.allSettled(tabs.filter(t=>t.id!==sender.tab.id).map(tab=>chrome.scripting.executeScript({target:{tabId:tab.id},args:[message.duck],func:(duck)=>{
   const data=window.__itttMix||(window.__itttMix=new Map());
   document.querySelectorAll('audio,video').forEach(media=>{
     let saved=data.get(media);if(!saved){if(!duck)return;saved={original:media.volume,timer:0};data.set(media,saved);}
     clearInterval(saved.timer);const from=media.volume,target=duck?saved.original*.23:saved.original,start=Date.now();
     saved.timer=setInterval(()=>{const p=Math.min(1,(Date.now()-start)/900);media.volume=Math.max(0,Math.min(1,from+(target-from)*(p*p*(3-2*p))));if(p===1){clearInterval(saved.timer);if(!duck)data.delete(media);}},40);
   });
 }})));
});
