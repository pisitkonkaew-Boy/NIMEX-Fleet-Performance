/* ---------- share.js (admin): best/worst per metric · 16:9 infographic · its settings ----------
   Uses the same numbers as the pages (ovCalc) and the filters selected now. Calculations are not changed here. */
const SM=Object.entries(GM).flatMap(([a,L])=>L.map(m=>({...m,id:m.i!=null?'sla'+m.i:m.k,area:a})));
const SMA={plan:'แผนการใช้รถ',perf:'การใช้รถและการจัดส่ง',sla:'SLA',cost:'ต้นทุน'};
const smOf=id=>SM.find(m=>m.id===id);
const I169D={cards:['eff','effx','sla0','sla2','cd','cr','act','revpt'],charts:[{t:'vt',m:'eff'},{t:'zab',m:'sla0'},{t:'zpair',m:'eff',m2:'sla0'},{t:'grade',m:'cd'}]};
const i169=()=>{const c=MD.ST.info169||{};return{cards:(c.cards&&c.cards.length?c.cards:I169D.cards).filter(smOf),charts:[0,1,2,3].map(i=>({...I169D.charts[i],...((c.charts||[])[i]||{})}))}};
const C169=[['vt','ตามชนิดรถ (พร้อมจำนวนเที่ยว)'],['rel','ตามประเภทรถ (บริษัท/ร่วม/เสริม)'],['zab','ราย Zone: AB เทียบ CC'],['zpair','ราย Zone: 2 ตัวชี้วัด'],['zprev','ราย Zone: เทียบช่วงก่อนหน้า'],['grp','BKK เทียบ UPC'],['trend','แนวโน้มรายวัน'],['grade','สัดส่วนเกรด DC + แย่สุด 3']];
/* grades: A–F thresholds per metric (settings), cost keeps its own thresholds */
function grTh(m){if(m.id==='cd')return MD.ST.costDist;if(m.id==='cr')return MD.ST.costRecv;const g=(MD.ST.grades||{})[m.id];return Array.isArray(g)&&g.length===4&&g.every(x=>x!==''&&x!=null&&Number.isFinite(+x))?g.map(Number):null}
function grOf(m,v){const t=grTh(m);if(!t||v==null||!Number.isFinite(v))return null;if(m.hi===false)return v<t[0]?'A':v<t[1]?'B':v<t[2]?'C':v<t[3]?'D':'F';return v>=t[0]?'A':v>=t[1]?'B':v>=t[2]?'C':v>=t[3]?'D':'F'}
const GCOL={A:'#123f8c',B:'#6e93d6',C:'#d4a72c',D:'#d9822b',F:'#b8334a'},GOOD='#157a4f',BAD='#b8334a';
const stKey=m=>m.id==='eff'?'eff':m.id==='effx'?'effx':m.k==='sla'?'sla':null;
const stTxt={g:'ดี',w:'เฝ้าระวัง',c:'ควรแก้ไข'};
/* good / bad of a change: hi true = up is good, hi false = down is good, null = neutral */
const dGood=(m,v,p)=>v==null||p==null||m.hi==null||Math.abs(v-p)<1e-9?0:(v>p)===(m.hi===true)?1:-1;
const dTxt=(m,v,p)=>p==null||v==null?'ไม่มีช่วงก่อนหน้า':gdl(m,v,p);
const val=(r,m,bi=0)=>gv(r,m,bi);
/* ---- best / worst per metric: DC 5 + 5, Zone 3 + 3 (half of what exists when fewer) ---- */
function bwData(m){const D=gDates(m,false),Dp=gDates(m,true),hasP=gAny(Dp);if(!gAny(D))return null;
 const kd=keepFn({dc:''}),kz=keepFn({zone:'',dc:''}),dir=m.hi===false?1:-1;
 const rank=(rows,prev)=>rows.filter(r=>r.key!=='?'&&!MD.M.hidden(r.key)&&val(r,m)!=null).map(r=>({key:r.key,name:r.name,zone:r.zone,v:val(r,m),p:prev?val(prev.get(r.key),m):null,n:r.trips?r.trips[0]:null})).sort((a,b)=>dir*(a.v-b.v));
 const dc=rank(ovCalc('dc',kd,D),hasP?new Map(ovCalc('dc',kd,Dp).map(r=>[r.key,r])):null),zn=rank(ovCalc('zone',kz,D),hasP?new Map(ovCalc('zone',kz,Dp).map(r=>[r.key,r])):null);
 const pick=(L,k)=>{const n=Math.min(k,Math.floor(L.length/2));return{best:L.slice(0,n),worst:n?L.slice(-n).reverse():[]}};
 return{dc,zn,DC:pick(dc,5),ZN:pick(zn,3),hasP}}
const bwWords=m=>m.hi==null?['มากสุด','น้อยสุด']:['ดีสุด','แย่สุด'];
function bwRows(m,B){const[wb,ww]=bwWords(m),R=[];[['DC',B.DC],['Zone',B.ZN]].forEach(([lv,x])=>{x.best.forEach((r,i)=>R.push({tag:`${lv} ${wb} ${i+1}`,good:1,...r}));x.worst.forEach((r,i)=>R.push({tag:`${lv} ${ww} ${i+1}`,good:-1,...r}))});return R}
const isPerf=m=>m.src.includes('perf')&&m.src.length===1;
SM.forEach(m=>XS.push({g:'ดีสุด/แย่สุด',k:'bw_'+m.id,t:`${bwWords(m).join('/')}: ${m.l}`,ic:m.hi===false?'coin':'target',
 img:(w,o)=>{const B=bwData(m);const t=`${bwWords(m).join(' / ')} — ${m.l}${S.zone?' · DC ใน Zone '+S.zone:''}`;if(!B)return tableP(t,[pcol('ข้อมูล',1,r=>r)],['ไม่มีข้อมูลในช่วงที่เลือก'],w,o);
  return tableP(t,[{t:'กลุ่ม',w:1.6,f:r=>r.tag,col:r=>r.good>0?GOOD:BAD},pcol('ชื่อ',3,r=>r.name),...(isPerf(m)?[pcol('เที่ยว',1,r=>fmtN(r.n),1)]:[]),pcol('ค่า',1.4,r=>gf(m,r.v),1),{t:'เทียบก่อนหน้า',w:1.7,r:1,f:r=>dTxt(m,r.v,r.p),col:r=>{const g=dGood(m,r.v,r.p);return g>0?GOOD:g<0?BAD:MUT}}],bwRows(m,B),w,o)},
 xls:()=>{const B=bwData(m);if(!B)return[['ไม่มีข้อมูลในช่วงที่เลือก']];const[wb,ww]=bwWords(m),lab=(L,i,k)=>{const n=Math.min(k,Math.floor(L.length/2));return i<n?wb:i>=L.length-n?ww:''};
  const sect=(lv,L,k)=>[[`${lv} — ${m.l} (เรียงจาก${wb}ไป${ww})`],['อันดับ','ป้าย',lv,...(lv==='DC'?['Zone']:[]),...(isPerf(m)?['เที่ยว']:[]),m.l,'ก่อนหน้า','ผลต่าง'],...L.map((r,i)=>[i+1,lab(L,i,k),r.name,...(lv==='DC'?[r.zone]:[]),...(isPerf(m)?[r.n]:[]),+(+r.v).toFixed(2),r.p==null?'':+(+r.p).toFixed(2),r.p==null?'ไม่มีช่วงก่อนหน้า':+(r.v-r.p).toFixed(2)])];
  return[...sect('DC',B.dc,5),[],...sect('Zone',B.zn,3)]},
 txt:()=>{const B=bwData(m);if(!B)return[];const[wb,ww]=bwWords(m),f=L=>L.map(r=>`${r.name} ${gf(m,r.v)}`).join(', ');return[`🏆 ${m.l} — DC ${wb}: ${f(B.DC.best)}`,`⚠️ ${m.l} — DC ${ww}: ${f(B.DC.worst)}`,`📍 Zone ${wb}: ${f(B.ZN.best)} · ${ww}: ${f(B.ZN.worst)}`]}}));
XG.push('ดีสุด/แย่สุด');
/* ---- 16:9 infographic: 1920 × 1080 SVG → PNG at scale 2 ---- */
const IW=1920,IH=1080;
function card169(m,cur,prv,x,y,w,h){const v=val(cur,m),p=prv?val(prv,m):null,ab=val(cur,m,1),cc=val(cur,m,2),g=grOf(m,v),sk=stKey(m),st=!g&&sk&&v!=null?stOf(sk,v):null,dg=dGood(m,v,p),dc=p==null||v==null?'#cfdcf2':dg>0?'#7ee2a8':dg<0?'#ff9aa8':'#e6d79c';
 const big=h>150,vt=v==null?'–':gf(m,v),chipW=g?34:0,avail=w-32-chipW-10,fs=Math.max(22,Math.min(big?44:34,avail/(vt.length*.6+(m.u?m.u.length*.25:0)))),lfs=w<210?15:16.5,maxL=Math.floor((w-26)/(lfs*.47)),lab=m.l.length>maxL?m.l.slice(0,maxL-1)+'…':m.l;
 const extra=m.id==='act'&&cur&&cur.plan&&cur.plan[0]!=null?`แผน ${fmtN(cur.plan[0])} คัน · ต่าง ${(cur.gap[0]>0?'+':'')}${fmtN(cur.gap[0])}`:'',yv=big?84:68,cy=yv-fs*.36;
 return`<g transform="translate(${x} ${y})"><rect width="${w}" height="${h}" rx="16" fill="${NAVY}"/><rect y="${h-6}" width="${w}" height="6" rx="3" fill="${g?GCOL[g]:st?stCol(st):GOLD}"/>
 <text x="16" y="${big?34:28}" font-size="${lfs}" fill="#e6d79c">${esc(lab)}</text>
 <text x="16" y="${yv}" font-size="${fs}" font-weight="600" fill="#fff">${esc(vt)}<tspan font-size="15" font-weight="400" fill="#cfdcf2"> ${esc(m.u||'')}</tspan></text>
 ${g?`<rect x="${w-46}" y="${cy-15}" width="34" height="30" rx="8" fill="${GCOL[g]}" stroke="#fff"/><text x="${w-29}" y="${cy+6}" text-anchor="middle" font-size="18" font-weight="600" fill="#fff">${g}</text>`:''}${st?`<rect x="${w-88}" y="${h-37}" width="76" height="24" rx="12" fill="${stCol(st)}" stroke="#fff"/><text x="${w-50}" y="${h-20}" text-anchor="middle" font-size="12.5" font-weight="600" fill="#fff">${stTxt[st]}</text>`:''}
 <text x="16" y="${big?112:92}" font-size="14"><tspan fill="#ffb98a">AB ${esc(gf(m,ab))}</tspan><tspan fill="#cfdcf2">  ·  </tspan><tspan fill="#a9c6ff">CC ${esc(gf(m,cc))}</tspan></text>
 ${extra&&big?`<text x="16" y="135" font-size="13" fill="#cfdcf2">${esc(extra)}</text>`:''}
 <text x="16" y="${h-16}" font-size="14" font-weight="500" fill="${dc}">${p==null||v==null?'ไม่มีช่วงก่อนหน้า':(st?'':'ก่อนหน้า ')+esc(dTxt(m,v,p))}</text></g>`}
/* chart slots: each returns {t,note,svg(w,h)} drawn with the light palette */
function slot169(c){const m=smOf(c.m)||SM[0],m2=smOf(c.m2)||m,D=gDates(m,false),Dp=gDates(m,true),hasP=gAny(Dp),lab=v=>gf(m,v),fx=gax(m),base=m.kind==='pct'||m.kind==='x'||m.kind==='x2'||m.k==='revpt'||m.k==='wagept'?'auto':0;
 const none=t=>({t,note:'',svg:(w,h)=>`<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"><text x="${w/2}" y="${h/2}" text-anchor="middle" font-size="18" fill="${MUT}">${esc(t)}</text></svg>`});
 if(!gAny(D))return none('ไม่มีข้อมูลในช่วงที่เลือก');
 const kz=keepFn({zone:'',dc:''}),Z=()=>{const R=ovCalc('zone',kz,D).filter(r=>r.key!=='?'),zs=MD.M.zones.filter(z=>R.some(r=>r.key===z));return{zs,zr:z=>R.find(r=>r.key===z)}};
 if(c.t==='vt'||c.t==='rel'){if(!m.src.includes('perf')&&!m.src.includes('cost'))return none(`${m.l} แยกตามชนิดรถไม่ได้`);const field=c.t;
  const L=gByTrip(m,0,field,x=>field==='vt'?(VTN[x]||x):(REL[x]||x)),ti=field==='vt'?6:7,ci=field==='vt'?2:3,cnt={};
  if(D.perf)MD.perfTrips(D.perf,keepFn()).forEach(t=>{const k=field==='vt'?(VTN[t[ti]]||t[ti]):(REL[t[ti]]||t[ti]);cnt[k]=(cnt[k]||0)+1});else if(D.cost)MD.costRows(D.cost,keepFn()).forEach(r=>{const k=field==='vt'?(VTN[r[ci]]||r[ci]):(REL[r[ci]]||r[ci]);cnt[k]=(cnt[k]||0)+(+r[4]||0)});
  L.sort((a,b)=>(cnt[b.l]||0)-(cnt[a.l]||0));
  return{t:`${m.l} ${field==='vt'?'ตามชนิดรถ':'ตามประเภทรถ'}`,note:`(จำนวนเที่ยวในวงเล็บ) · ท้ายแถบเทียบ${prevLabel()}${S.zone?' · Zone '+S.zone:''}`,svg:(w,h)=>{const n=Math.max(1,L.length),rh=Math.max(20,Math.min(44,(h-8)/n));return hbars({items:L.map(r=>{const g=dGood(m,r.v,r.p);return{l:`${r.l} (${fmtN(cnt[r.l]||0)})`,v:Math.abs(r.v),c:g<0?LIGHT.bad:LIGHT.s[0],txt:gf(m,r.v)+'  '+dTxt(m,r.v,r.p)}}),P:LIGHT,W:w,rh,labelW:Math.min(250,w*.36),valW:Math.min(230,w*.34),fmt:lab})}}}
 if(c.t==='zab'||c.t==='zpair'||c.t==='zprev'){const{zs,zr}=Z(),Zp=c.t==='zprev'&&hasP?new Map(ovCalc('zone',kz,Dp).map(r=>[r.key,r])):null;
  const ser=c.t==='zab'?[{name:'AB',color:LIGHT.ab,vals:zs.map(z=>val(zr(z),m,1))},{name:'CC',color:LIGHT.cc,vals:zs.map(z=>val(zr(z),m,2))}]
   :c.t==='zpair'?(()=>{const D2=gDates(m2,false),R2=gAny(D2)?ovCalc('zone',kz,D2):[];return[{name:m.l,color:LIGHT.s[0],vals:zs.map(z=>val(zr(z),m))},{name:m2.l,color:LIGHT.s[1],vals:zs.map(z=>val(R2.find(r=>r.key===z),m2))}]})()
   :[{name:'ช่วงนี้',color:LIGHT.s[0],vals:zs.map(z=>val(zr(z),m))},...(Zp?[{name:'ก่อนหน้า',color:LIGHT.s[2],vals:zs.map(z=>val(Zp.get(z),m))}]:[])];
  const small=zs.map(z=>{const r=zr(z),n=r&&r.trips?r.trips[0]:null;return isPerf(m)&&n!=null&&n<30?`${z} (${n})`:z});
  const t=c.t==='zab'?`${m.l} ราย Zone: AB เทียบ CC`:c.t==='zpair'?`ราย Zone: ${m.l} เทียบ ${m2.l}`:`${m.l} ราย Zone เทียบช่วงก่อนหน้า`;
  return{t,legend:ser.map(s=>[s.color,s.name]),note:c.t==='zprev'&&!Zp?'ทุก Zone · ไม่มีช่วงก่อนหน้า':'ทุก Zone',svg:(w,h)=>gbars({labels:small,series:ser,P:LIGHT,W:w,H:h,fmt:fx,lab,base:c.t==='zpair'&&m.kind!==m2.kind?0:base})}}
 if(c.t==='grp'){const kg=keepFn({group:'all',zone:'',dc:''}),G=ovCalc('grp',kg,D),Gp=hasP?new Map(ovCalc('grp',kg,Dp).map(r=>[r.key,r])):null,gr=k=>G.find(r=>r.key===k),cats=[];['BKK','UPC'].forEach(g=>[0,1,2].forEach(i=>cats.push([g,i])));
  const ser=[{name:'ช่วงนี้',color:LIGHT.s[0],vals:cats.map(([g,i])=>val(gr(g),m,i))},...(Gp?[{name:'ก่อนหน้า',color:LIGHT.s[2],vals:cats.map(([g,i])=>val(Gp.get(g),m,i))}]:[])];
  return{t:`${m.l}: BKK เทียบ UPC`,legend:ser.map(s=>[s.color,s.name]),note:'รวม / AB / CC',svg:(w,h)=>gbars({labels:cats.map(([g,i])=>g+' '+['รวม','AB','CC'][i]),series:ser,P:LIGHT,W:w,H:h,fmt:fx,lab,base})}}
 if(c.t==='trend'){const src=m.src[0],ds=trendDates(src).filter(d=>m.src.every(k=>MD.pools[k].includes(d))),T=ds.map(d=>{const o={};m.src.forEach(k=>o[k]=[d]);return ovCalc('all',keepFn(),o)[0]});
  return{t:`${m.l} รายวัน`,legend:[[INK,'รวม'],[LIGHT.ab,'AB'],[LIGHT.cc,'CC']],note:base==='auto'?'แกนไม่เริ่มที่ 0':'',svg:(w,h)=>lineChart({labels:ds.map(shortLabel),series:[{name:'รวม',color:INK,vals:T.map(r=>val(r,m))},{name:'AB',color:LIGHT.ab,vals:T.map(r=>val(r,m,1))},{name:'CC',color:LIGHT.cc,vals:T.map(r=>val(r,m,2))}],P:LIGHT,W:w,H:h,hi:hiIdx(ds,src),fmt:fx,tipFmt:lab,min:base==='auto'?'auto':0})}}
 /* grade donut: grades when thresholds exist, else the dashboard status (ดี/เฝ้าระวัง/ควรแก้ไข) */
 const kd=keepFn({dc:''}),R=ovCalc('dc',kd,D).filter(r=>!MD.M.hidden(r.key)&&r.key!=='?'&&val(r,m)!=null),sk=stKey(m),useG=!!grTh(m);
 if(!useG&&!sk)return none(`ยังไม่ได้ตั้งเกณฑ์เกรดของ ${m.l} (ตั้งได้ที่ "ตั้งค่า 16:9")`);
 const cls=r=>useG?grOf(m,val(r,m)):stOf(sk,val(r,m)),keys=useG?['A','B','C','D','F']:['g','w','c'],colr=k=>useG?GCOL[k]:stCol(k),name=k=>useG?'เกรด '+k:stTxt[k];
 const cnt=keys.map(k=>({k,v:R.filter(r=>cls(r)===k).length})).filter(x=>x.v),worst=R.slice().sort((a,b)=>(m.hi===false?-1:1)*(val(a,m)-val(b,m))).slice(0,3);
 return{t:`${m.l}: สัดส่วน${useG?'เกรด':'สถานะ'} DC`,note:`${fmtN(R.length)} DC${S.zone?' ใน Zone '+S.zone:''} · แย่สุด 3 อันดับด้านขวา`,svg:(w,h)=>{const d=Math.min(h-10,w*.42),dn=donut({parts:cnt.map(x=>({v:x.v,c:colr(x.k)})),center:fmtN(R.length),sub:'DC',W:240,P:LIGHT}),e=embed(dn,0,(h-d)/2,d);
  let s=`<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${e.s}`,x=d+30,y=24;
  cnt.forEach((c,i)=>{s+=`<rect x="${x}" y="${y+i*30-14}" width="16" height="16" rx="4" fill="${colr(c.k)}"/><text x="${x+24}" y="${y+i*30}" font-size="16" fill="${INK}">${esc(name(c.k))}: ${fmtN(c.v)} DC (${fmtP(c.v/R.length*100,0)})</text>`});
  y+=cnt.length*30+18;s+=`<text x="${x}" y="${y}" font-size="16" font-weight="600" fill="${BAD}">แย่สุด 3 อันดับ</text>`;
  worst.forEach((r,i)=>{s+=`<text x="${x}" y="${y+28+i*27}" font-size="15" fill="${INK}">${i+1}. ${esc(shortDC(r.name))} · ${esc(gf(m,val(r,m)))}</text>`});return s+'</svg>'}}}
function info169(){const cfg=i169(),k=keepFn(),cur=ovAll(k,false),prv=ovAll(k,true),m=24,head=120,foot=46,cards=cfg.cards.slice(0,12),rows=cards.length>8?2:1,gap=14,ch=rows===2?132:170,per=Math.ceil(cards.length/rows),cw=(IW-2*m-(per-1)*gap)/per;
 let b=sheetHead(IW,head,'i169');const y0=head+18;
 cards.forEach((id,i)=>{b+=card169(smOf(id),cur,prv,m+(i%per)*(cw+gap),y0+Math.floor(i/per)*(ch+gap),cw,ch)});
 const gy=y0+rows*ch+(rows-1)*gap+20,gh=(IH-foot-16-gy-gap)/2,gw=(IW-2*m-gap)/2;
 cfg.charts.forEach((c,i)=>{const x=m+(i%2)*(gw+gap),y=gy+Math.floor(i/2)*(gh+gap),S2=slot169(c),top=58,legH=S2.legend&&S2.legend.length?26:0,iw=gw-36,ih=gh-top-legH-14;
  let leg='';if(legH){let lx=0;const per2=S2.legend.map(([,t])=>34+String(t).length*9);const tw=per2.reduce((a,b)=>a+b,0);lx=(iw-tw)/2;S2.legend.forEach(([col,t],j)=>{leg+=`<rect x="${lx}" y="2" width="14" height="14" rx="3" fill="${col}"/><text x="${lx+20}" y="14" font-size="14" fill="${INK}">${esc(t)}</text>`;lx+=per2[j]})}
  let inner='';try{const sv=S2.svg(Math.round(iw),Math.round(ih)),vb=sv.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/),sc=Math.min(iw/+vb[1],ih/+vb[2]);inner=`<g transform="translate(${(iw-vb[1]*sc)/2} ${legH}) scale(${sc})">${sv.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'').replace(/ data-(tip|act)="[^"]*"/g,'').replace(/ style="cursor:pointer"/g,'')}</g>`}catch(e){console.error(e);inner=`<text x="${iw/2}" y="${ih/2}" text-anchor="middle" fill="${BAD}">สร้างกราฟไม่สำเร็จ</text>`}
  b+=`<g transform="translate(${x} ${y})"><rect width="${gw}" height="${gh}" rx="16" fill="#fff" stroke="#dbe3f0"/><rect x="${gw*.15}" y="-1.2" width="${gw*.7}" height="2.4" fill="${GOLD}"/><text x="${gw/2}" y="30" text-anchor="middle" font-size="19" font-weight="600" fill="${NAVY}">${esc(S2.t)}</text><text x="${gw/2}" y="50" text-anchor="middle" font-size="13" fill="${MUT}">${esc(S2.note||'')}</text><g transform="translate(18 ${top})">${leg}${inner}</g></g>`});
 const fx=`ประสิทธิภาพ = บิลส่งได้ ÷ บิลบนรถ · SLA ทุกสาเหตุ = On time ÷ บิลทั้งหมด · %ต้นทุน = ต้นทุน ÷ รายได้ · AB/CC ต่อคันแยกตามชนิดรถ (042 = CC) · เขียว = ดีขึ้น แดง = แย่ลง เทียบ${prevLabel()} · บิลต้นทาง 680/690 นับเป็น 691`;
 b+=`<rect y="${IH-foot}" width="${IW}" height="${foot}" fill="${NAVY}"/><rect y="${IH-foot}" width="${IW}" height="3" fill="${GOLD}"/><text x="${IW/2}" y="${IH-foot/2+6}" text-anchor="middle" font-size="15" fill="#dfe8f7">${esc(fx)}</text>`;
 return wrap(IW,IH,b)}
window.__exp=Object.assign(window.__exp||{},{info169,bwData,SM});
ACT.i169=async(v,btn)=>{if(btn)btn.disabled=true;say('กำลังสร้างอินโฟกราฟิก 16:9…');try{await document.fonts.ready;await save(stamp()+'-Infographic-16x9.png',await toPng(info169(),2))}catch(e){console.error(e);say('สร้างอินโฟกราฟิกไม่สำเร็จ')}if(btn)btn.disabled=false};
/* ---- settings for the 16:9 sheet and A–F grades; "ใช้ครั้งนี้" stays in this browser tab, "บันทึก" goes to the Google Sheet for everyone ---- */
const optM=(sel)=>Object.keys(SMA).map(a=>`<optgroup label="${esc(SMA[a])}">${SM.filter(m=>m.area===a).map(m=>`<option value="${m.id}"${m.id===sel?' selected':''}>${esc(m.l)}</option>`).join('')}</optgroup>`).join('');
ACT.i169set=()=>{const c=i169(),on=new Set(c.cards);
 openSheet(`<h2>ตั้งค่าอินโฟกราฟิก 16:9</h2><p class="say" style="margin:0">เลือกการ์ด (สูงสุด 12 ใบ เรียงตามลำดับในรายการ) · เลือกกราฟ 4 ช่อง · ตั้งเกณฑ์เกรด A–F ของแต่ละตัวชี้วัด</p>
 <fieldset class="xg"><legend>การ์ด KPI</legend>${Object.keys(SMA).map(a=>`<div class="checks"><b style="grid-column:1/-1">${esc(SMA[a])}</b>${SM.filter(m=>m.area===a).map(m=>`<label><input type="checkbox" data-i169c="${m.id}"${on.has(m.id)?' checked':''}> ${esc(m.l)}</label>`).join('')}</div>`).join('')}</fieldset>
 <fieldset class="xg"><legend>กราฟ 4 ช่อง (ซ้ายบน → ขวาล่าง)</legend><div class="i169slots">${c.charts.map((s,i)=>`<div class="i169slot"><b>ช่อง ${i+1}</b><select data-i169t="${i}" aria-label="ชนิดกราฟช่อง ${i+1}">${C169.map(([k,l])=>`<option value="${k}"${s.t===k?' selected':''}>${esc(l)}</option>`).join('')}</select><select data-i169m="${i}" aria-label="ตัวชี้วัดช่อง ${i+1}">${optM(s.m)}</select><label class="sm">ตัวชี้วัดที่ 2 (ใช้กับ "2 ตัวชี้วัด")<select data-i169m2="${i}">${optM(s.m2||s.m)}</select></label></div>`).join('')}</div></fieldset>
 <fieldset class="xg"><legend>เกณฑ์เกรด A–F</legend><p class="note" style="text-align:left;margin:0 0 6px">สูง = ดี: A ≥ ช่อง A, B ≥ ช่อง B … ต่ำกว่าช่อง D = F · ต่ำ = ดี: A &lt; ช่อง A … · เว้นว่าง = ไม่ใช้เกรด (ประสิทธิภาพ/SLA จะใช้สถานะ ดี/เฝ้าระวัง/ควรแก้ไข แทน) · %ต้นทุนใช้เกณฑ์เดียวกับหน้าเว็บ</p>
 <div class="tw fit"><table class="t i169g"><thead><tr><th>ตัวชี้วัด</th><th>ทิศ</th><th>A</th><th>B</th><th>C</th><th>D</th></tr></thead><tbody>${SM.map(m=>{const t=grTh(m)||['','','',''];return`<tr><td style="text-align:left">${esc(m.l)}</td><td>${m.hi===false?'ต่ำ = ดี':'สูง = ดี'}</td>${[0,1,2,3].map(j=>`<td><input type="number" step="any" inputmode="decimal" data-i169g="${m.id}:${j}" value="${t[j]}" aria-label="${esc(m.l)} เกรด ${'ABCD'[j]}"></td>`).join('')}</tr>`}).join('')}</tbody></table></div></fieldset>
 <div class="btns"><button class="btn" data-act="i169apply">ใช้ครั้งนี้</button><button class="btn" data-act="i169save">บันทึกเป็นค่าเริ่มต้น (ทุกคน)</button><button class="btn alt" data-act="i169def">คืนค่าเริ่มต้น</button><button class="btn alt" data-act="i169back">กลับไปหน้าแชร์</button></div><p class="msg" id="xmsg" role="status"></p>`,1)};
function i169Read(){const cards=[...document.querySelectorAll('[data-i169c]:checked')].map(x=>x.dataset.i169c).slice(0,12),charts=[0,1,2,3].map(i=>({t:$(`[data-i169t="${i}"]`).value,m:$(`[data-i169m="${i}"]`).value,m2:$(`[data-i169m2="${i}"]`).value})),grades={},warn=[];
 SM.forEach(m=>{const v=[0,1,2,3].map(j=>{const s=$(`[data-i169g="${m.id}:${j}"]`).value.trim();return s===''?null:+s});if(v.every(x=>x==null))return;if(v.some(x=>x==null||!Number.isFinite(x))){warn.push(m.l+' (กรอกไม่ครบ 4 ช่อง)');return}
  const ok=m.hi===false?v.every((x,i)=>!i||x>=v[i-1]):v.every((x,i)=>!i||x<=v[i-1]);if(!ok)warn.push(m.l+(m.hi===false?' (ต้องเรียงจากน้อยไปมาก)':' (ต้องเรียงจากมากไปน้อย)'));grades[m.id]=v});
 return{cards,charts,grades,warn}}
function i169Apply(R,T){T.info169={cards:R.cards,charts:R.charts};const g={...R.grades};if(g.cd){T.costDist=g.cd;delete g.cd}if(g.cr){T.costRecv=g.cr;delete g.cr}T.grades=g;return T}
ACT.i169apply=()=>{const R=i169Read();if(!R.cards.length){say('เลือกการ์ดอย่างน้อย 1 ใบ');return}i169Apply(R,MD.ST);say((R.warn.length?'ตรวจเกณฑ์: '+R.warn.join(', ')+' · ':'')+'ใช้แล้วสำหรับครั้งนี้ (ยังไม่บันทึกลงชีต)')};
ACT.i169save=async(v,btn)=>{const R=i169Read();if(!R.cards.length){say('เลือกการ์ดอย่างน้อย 1 ใบ');return}if(R.warn.length){say('ยังบันทึกไม่ได้ ตรวจเกณฑ์: '+R.warn.join(', '));return}
 btn.disabled=true;say('กำลังบันทึก…');const T=i169Apply(R,JSON.parse(JSON.stringify(MD.ST)));try{await api({a:'settings',settings:T});i169Apply(R,MD.ST);say('บันทึกแล้ว ทุกคนที่เปิดหน้านี้ครั้งถัดไปจะได้ค่าใหม่')}catch(e){say('บันทึกไม่สำเร็จ: '+e.message)}btn.disabled=false};
ACT.i169def=()=>{delete MD.ST.info169;ACT.i169set();say('คืนค่าการ์ดและกราฟเริ่มต้นแล้ว (เกณฑ์เกรดยังเหมือนเดิม) กด "บันทึก" ถ้าต้องการให้ทุกคนใช้')};
ACT.i169back=()=>window.openExport();
/* add the two buttons to the share sheet; the old one-page infographic becomes "A4" */
(()=>{const base=window.openExport;window.openExport=function(){base();const bs=document.querySelector('.sheet .btns');if(!bs)return;const old=bs.querySelector('[data-act="doinfo"]');if(old)old.textContent='อินโฟกราฟิก A4';
 bs.insertAdjacentHTML('beforeend',`<button class="btn" data-act="i169" style="background:linear-gradient(180deg,#f0d57a,#d4af37);color:#0a2a5e">อินโฟกราฟิก 16:9</button><button class="btn alt" data-act="i169set">ตั้งค่า 16:9 และเกรด</button>`);
 const fs=[...document.querySelectorAll('.sheet fieldset.xg')].find(f=>f.querySelector('legend').textContent==='ดีสุด/แย่สุด');if(fs)fs.insertAdjacentHTML('beforeend','<p class="note" style="text-align:left;margin:4px 0 0">DC ดีสุด 5 + แย่สุด 5 และ Zone ดีสุด 3 + แย่สุด 3 (ถ้ามีน้อยกว่าใช้ครึ่งหนึ่ง) · ตัวชี้วัดที่ต่ำ = ดี เรียงกลับด้าน · Excel เรียงครบทุกรายการ</p>')}})();
