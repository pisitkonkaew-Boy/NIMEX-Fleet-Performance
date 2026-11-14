/* loads the data from the Google Sheet (Apps Script web app), then starts the dashboard */
window.__STANDALONE=true;
const KEY='nimex-fleet-key';
const getKey=()=>{try{return sessionStorage.getItem(KEY)}catch(e){return null}};
function closeCover(){const c=document.getElementById('cover');if(c)c.remove()}
(function(){if(location.hash==='#admin'||getKey()){closeCover();return}const c=document.getElementById('cover');if(!c)return;c.querySelector('button').onclick=closeCover;c.querySelector('.fg').onclick=closeCover;c.querySelector('button').focus()})();
async function api(body){const r=await fetch(window.FLEET_API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({...body,key:getKey()})});const j=await r.json();if(!j.ok)throw new Error(j.error||'failed');return j}
window.api=api;
const bootMsg=h=>{const b=document.getElementById('boot');b.hidden=false;b.innerHTML=h};
function askKey(err){bootMsg(`<h1>ผู้ดูแลระบบ</h1>${err?`<p class="badt">${err}</p>`:''}<label for="adm-key">รหัสผู้ดูแล</label><input id="adm-key" type="password" autocomplete="current-password"><button class="btn" id="adm-go">เข้าสู่ระบบ</button><a href="./" class="msg">กลับหน้า Dashboard</a>`);const go=async()=>{const v=document.getElementById('adm-key').value;try{sessionStorage.setItem(KEY,v)}catch(e){}try{await api({a:'auth'});location.reload()}catch(e){try{sessionStorage.removeItem(KEY)}catch(x){}askKey('รหัสไม่ถูกต้อง')}};document.getElementById('adm-go').onclick=go;document.getElementById('adm-key').onkeydown=e=>{if(e.key==='Enter')go()};document.getElementById('adm-key').focus()}
const load=src=>new Promise((res,rej)=>{const s=document.createElement('script');s.async=false;s.src=src+'?v='+(window.FLEET_V||4);s.onload=res;s.onerror=rej;document.body.appendChild(s)});
/* months kept in this browser (IndexedDB) and reused while the data version from the server is unchanged */
const IDB=(()=>{let p=null;const open=()=>p||(p=new Promise((res,rej)=>{try{const r=indexedDB.open('nimex-fleet',1);r.onupgradeneeded=()=>r.result.createObjectStore('m');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}catch(e){rej(e)}}));
 return{get:async k=>{try{const db=await open();return await new Promise(res=>{const q=db.transaction('m').objectStore('m').get(k);q.onsuccess=()=>res(q.result||null);q.onerror=()=>res(null)})}catch(e){return null}},
  put:async(k,v)=>{try{const db=await open();db.transaction('m','readwrite').objectStore('m').put(v,k)}catch(e){}}}})();
window.getMonth=async m=>{const ver=window.DATA&&window.DATA.ver;if(ver){const c=await IDB.get(m);if(c&&c.ver===ver&&c.j)return c.j}
 const j=await (await fetch(url('a=month&m='+m))).json();if(!j||j.error)throw new Error('month');if(ver)IDB.put(m,{ver,j});return j};
window.loadLib=src=>new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('lib'));document.head.appendChild(s)});
const url=q=>window.FLEET_API+(window.FLEET_API.includes('?')?'&':'?')+q;
async function start(){const wantAdmin=location.hash==='#admin',key=getKey();
 if(!window.FLEET_API){bootMsg('<h1>ยังไม่ได้ตั้งค่า</h1><p>ยังไม่ได้ใส่ที่อยู่ระบบข้อมูลใน config.js</p>');return}
 if(wantAdmin&&!key){askKey();return}
 let D;try{bootMsg('<p>กำลังโหลดข้อมูล…</p>');D=await (await fetch(url('a=meta'))).json();if(!D||!Array.isArray(D.dcs))throw 0}catch(e){bootMsg('<h1>โหลดข้อมูลไม่สำเร็จ</h1><p>ลองเปิดหน้านี้ใหม่อีกครั้ง</p>');return}
 D.log=[];D.preloaded=[];window.DATA=D;
 if(key){try{const a=await api({a:'admin'});D.log=a.log||[];window.ADMIN=true}catch(e){try{sessionStorage.removeItem(KEY)}catch(x){}if(wantAdmin){askKey('รหัสไม่ถูกต้อง');return}}}
 const ms=(D.months||[]).slice().sort(),first=ms.slice(-2);
 /* app scripts download while the data loads; they still run in order */
 const files=['model.js','ui.js','v_ov.js','v_plan.js','v_perf.js','v_sla.js','v_cost.js','v_graph.js',...(window.ADMIN?['export.js','share.js','admin.js']:[])],scriptsP=Promise.all(files.map(load));scriptsP.catch(()=>{});
 try{bootMsg(`<p>กำลังโหลดข้อมูล ${first.join(', ')}…</p>`);const J=await Promise.all(first.map(m=>window.getMonth(m)));J.forEach((j,i)=>{['bills','od','reasons','trips','cost','plates','tcost'].forEach(k=>{D[k]=(D[k]||[]).concat(j[k]||[])});D.routes=Object.assign(D.routes||{},j.routes||{});D.preloaded.push(first[i])})}catch(e){bootMsg('<h1>โหลดข้อมูลไม่สำเร็จ</h1><p>ลองเปิดหน้านี้ใหม่อีกครั้ง</p>');return}
 if(!D.dcs.length&&!window.ADMIN){bootMsg('<h1>ยังไม่มีข้อมูล</h1><p>ผู้ดูแลระบบยังไม่ได้นำเข้าข้อมูล</p>');return}
 document.getElementById('boot').hidden=true;document.getElementById('app').hidden=false;
 try{await scriptsP;
  window.startApp();let sv=null;try{sv=sessionStorage.getItem('nimex-view');sessionStorage.removeItem('nimex-view')}catch(e){}if(window.ADMIN&&(sv||!D.dcs.length))ACT.nav(sv||'up')}catch(e){bootMsg('<h1>เปิด Dashboard ไม่สำเร็จ</h1><p>ลองเปิดหน้านี้ใหม่อีกครั้ง</p>');console.error(e)}}
window.addEventListener('hashchange',()=>{if(location.hash==='#admin'&&!window.ADMIN)location.reload()});
start();
