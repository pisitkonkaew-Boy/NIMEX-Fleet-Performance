/* ---------- กราฟทุกมิติ: one standard chart set per area, driven by a metric picker and รวม/AB/CC ---------- */
const GM={
 plan:[{k:'plan',l:'จำนวนรถตามแผน',kind:'n',hi:null,src:['plan'],u:'คัน'},{k:'act',l:'จำนวนรถใช้จริง',kind:'n',hi:null,src:['perf'],u:'เที่ยว'},{k:'gap',l:'ส่วนต่าง จริง − แผน',kind:'n',hi:null,src:['plan','perf'],u:'คัน',sign:1},
  {k:'bpcP',l:'บิลต่อคันตามแผน',kind:'x',hi:true,src:['plan'],u:'บิล'},{k:'bpcA',l:'บิลต่อคันจริง',kind:'x',hi:true,src:['perf'],u:'บิล'},{k:'bills',l:'บิลที่ต้องจัดส่ง',kind:'n',hi:null,src:['plan'],u:'บิล'}],
 perf:[{k:'eff',l:'ประสิทธิภาพ ทุกสาเหตุ',kind:'pct',hi:true,src:['perf']},{k:'effx',l:'ประสิทธิภาพ รวมสาเหตุลูกค้า',kind:'pct',hi:true,src:['perf']},{k:'bpt',l:'บิลรวม/คัน',kind:'x',hi:true,src:['perf'],u:'บิล'},{k:'dpt',l:'บิลส่งได้/คัน',kind:'x',hi:true,src:['perf'],u:'บิล'},
  {k:'ppt',l:'กล่องรวม/คัน',kind:'x',hi:true,src:['perf'],u:'กล่อง'},{k:'pdpt',l:'กล่องส่งได้/คัน',kind:'x',hi:true,src:['perf'],u:'กล่อง'},{k:'revpt',l:'รายได้ต่อเที่ยว',kind:'n',hi:true,src:['perf'],u:'บาท'},{k:'wagept',l:'ค่าจ้างต่อเที่ยว',kind:'n',hi:false,src:['perf'],u:'บาท'},{k:'trips',l:'เที่ยววิ่ง',kind:'n',hi:null,src:['perf'],u:'เที่ยว'},{k:'km',l:'ระยะทาง',kind:'n',hi:null,src:['perf'],u:'กม.'}],
 sla:[0,1,2,3].map(i=>({k:'sla',i,l:SLA_LABELS[i],kind:'pct',hi:true,src:['sla']})),
 cost:[{k:'cd',l:'%ต้นทุนกระจาย',kind:'pct',hi:false,src:['cost'],g:'dist'},{k:'cr',l:'%ต้นทุนเข้ารับ',kind:'pct',hi:false,src:['cost'],g:'recv'},{k:'cdc',l:'ต้นทุนกระจาย (ล้านบาท)',kind:'m',hi:false,src:['cost']},{k:'cdr',l:'รายได้กระจาย (ล้านบาท)',kind:'m',hi:true,src:['cost']},
  {k:'crc',l:'ต้นทุนเข้ารับ (ล้านบาท)',kind:'m',hi:false,src:['cost']},{k:'crr',l:'รายได้เข้ารับ (ล้านบาท)',kind:'m',hi:true,src:['cost']},
  {k:'dpb',l:'ต้นทุนกระจาย บาท/บิล',kind:'x2',hi:false,src:['cost']},{k:'dpp',l:'ต้นทุนกระจาย บาท/ชิ้น',kind:'x2',hi:false,src:['cost']},{k:'rpb',l:'ต้นทุนเข้ารับ บาท/บิล',kind:'x2',hi:false,src:['cost']},{k:'rpp',l:'ต้นทุนเข้ารับ บาท/ชิ้น',kind:'x2',hi:false,src:['cost']}]};
const GBT=['รวม AB + CC','AB','CC'];
const gIdx=a=>Math.min(GM[a].length-1,+(S['gm_'+a]||0));
const gv=(r,m,bi)=>{if(!r)return null;const x=m.i!=null?(r[m.k]||[])[m.i]:r[m.k];return x?x[bi]:null};
const gf=(m,v)=>v==null||!Number.isFinite(v)?'–':m.kind==='pct'?fmtP(v):m.kind==='x'?fmt1(v):m.kind==='x2'?fmt2(v):m.kind==='m'?fmtM(v):(m.sign&&v>0?'+':'')+fmtN(v);
const gax=m=>m.kind==='pct'?(v=>v.toFixed(v%1?1:0)+'%'):m.kind==='m'?(v=>fmt1(v/1e6)):ax;
/* change vs previous period as plain text (for SVG labels) */
function gdl(m,v,p){if(v==null||p==null||!Number.isFinite(v)||!Number.isFinite(p))return'';const d=v-p;if(Math.abs(d)<1e-9)return'= เท่าเดิม';const a=Math.abs(d);
 return(d>0?'▲ ':'▼ ')+(m.kind==='pct'?a.toFixed(2)+' จุด':m.kind==='x'?fmt1(a):m.kind==='x2'?fmt2(a):m.kind==='m'?fmtM(a):m.k==='gap'?fmtN(a):(p?(a/Math.abs(p)*100).toFixed(1)+'%':fmtN(a)))}
const gDates=(m,prev)=>{const o={plan:null,perf:null,sla:null,cost:null};m.src.forEach(k=>{if(!MD.has[k])return;const d=prev?prevFor(k):datesFor(k);o[k]=d&&d.length?d:null});return o};
const gAny=D=>Object.values(D).some(Boolean);
/* grouped vertical bars with value labels; base 'auto' starts the axis near the data for rates */
function gbars({labels,series,fmt=ax,lab=fmt,W=720,H=280,P,acts,base=0,tips}){const n=labels.length,k=series.length,rot=n>6&&W/n<92,m={l:56,r:10,t:22,b:rot?70:34},iw=W-m.l-m.r,ih=H-m.t-m.b;
 const all=series.flatMap(s=>s.vals).filter(Number.isFinite);let mx=niceMax(Math.max(0,...all)),mn=0;
 if(base==='auto'&&all.length){const lo=Math.min(...all),hi=Math.max(...all),pad=Math.max((hi-lo)*.35,hi*.01);mn=Math.max(0,Math.floor(lo-pad));mx=Math.ceil(hi+pad*.6);if(mx<=mn)mx=mn+1}
 const y=v=>m.t+ih*(1-(Math.max(mn,v)-mn)/(mx-mn)),cw=iw/Math.max(1,n),gw=cw*.78,bw=Math.max(3,Math.min(40,gw/k-3)),s=[`<svg viewBox="0 0 ${W} ${H}" role="img" ${FNT}>`];
 yGrid(s,m,W,y,mn,mx,P,fmt);if(mn>0)s.push(`<text x="${m.l}" y="12" font-size="11.5" fill="${P.muted}">แกนเริ่มที่ ${esc(fmt(mn))}</text>`);const showV=bw>=22;
 labels.forEach((l,i)=>{const cx=m.l+cw*i+cw/2,x0=cx-(bw+3)*k/2;let g='';series.forEach((se,j)=>{const v=se.vals[i];if(!Number.isFinite(v))return;const x=x0+j*(bw+3),yy=y(v);g+=`<rect x="${x}" y="${yy}" width="${bw}" height="${Math.max(0,y(mn)-yy)}" rx="3" fill="${se.color}"/>`;if(showV)g+=`<text x="${x+bw/2}" y="${yy-5}" text-anchor="middle" font-size="${bw>=34?12:10.5}" fill="${P.ink}">${esc(lab(v))}</text>`});
  const tip=tips?tips[i]:l+'\n'+series.map(se=>se.name+': '+lab(se.vals[i])).join('\n');
  s.push(`<g data-tip="${esc(tip)}"${acts&&acts[i]?` data-act="${esc(acts[i])}" style="cursor:pointer"`:''}><rect x="${m.l+cw*i}" y="${m.t}" width="${cw}" height="${ih}" fill="transparent"/>${g}</g>`);
  if(rot)s.push(`<text transform="translate(${cx+4} ${H-m.b+14}) rotate(-35)" text-anchor="end" font-size="12" fill="${P.muted}">${esc(l)}</text>`);else s.push(`<text x="${cx}" y="${H-12}" text-anchor="middle" font-size="12.5" fill="${P.muted}">${esc(l)}</text>`)});
 return s.join('')+'</svg>'}
const gCols=P=>({cur:P.s[0],prv:P.s[2],ab:P.ab,cc:P.cc,bkk:P.s[0],upc:P.s[1]});
function gHead(a,m,bi){const L=GM[a];return`<section class="card gpick"><div class="gpick-row"><span class="gpick-l">ตัวชี้วัด</span><div class="seg2 gseg" role="group" aria-label="ตัวชี้วัด">${L.map((x,i)=>`<button data-act="set:gm_${a}=${i}" aria-pressed="${x===m}">${esc(x.l)}</button>`).join('')}</div></div>
 <div class="gpick-row"><span class="gpick-l">ประเภทบิล</span><div class="seg2" role="group" aria-label="ประเภทบิล">${GBT.map((t,i)=>`<button data-act="set:gbt=${i}"${i?` class="bt-${i===1?'ab':'cc'}"`:''} aria-pressed="${bi===i}">${t}</button>`).join('')}</div><span class="note" style="margin:0">ทุกกราฟเทียบ${esc(prevLabel())} · กราฟแนวโน้มแสดง รวม / AB / CC พร้อมกัน</span></div></section>`}
/* per-vehicle-type / per-vehicle-relation rows for perf & cost metrics */
function gByTrip(m,bi,field,label){const keep=keepFn(),D=gDates(m,false),Dp=gDates(m,true),ti=field==='vt'?6:7,ci=field==='vt'?2:3,set=new Set();
 if(D.perf)MD.perfTrips(D.perf,keep).forEach(t=>set.add(t[ti]));if(D.cost)MD.costRows(D.cost,keep).forEach(r=>set.add(r[ci]));
 return[...set].filter(Boolean).sort().map(x=>{const F={t:t=>t[ti]===x,c:r=>r[ci]===x},c=ovCalc('all',keep,D,F)[0],p=gAny(Dp)?ovCalc('all',keep,Dp,F)[0]:null;return{l:label(x),v:gv(c,m,bi),p:gv(p,m,bi)}}).filter(r=>r.v!=null)}
function gItems(R,m,P,col){return R.map(r=>({l:r.l,v:Math.abs(r.v),c:col||P.s[0],txt:gf(m,r.v)+(r.p!=null?'   '+gdl(m,r.v,r.p):''),tip:`${r.l}\nช่วงนี้: ${gf(m,r.v)}\nก่อนหน้า: ${gf(m,r.p)}`,act:r.act}))}
function gPage(a){if(!MD.has[a])return noData(a);const m=GM[a][gIdx(a)],bi=+(S.gbt||0),bl=bi?' · '+GBT[bi]:'',out=[gHead(a,m,bi)],src=m.src[0];
 if(!m.src.every(k=>MD.has[k]))return head()+out.join('')+emptyCard('ยังไม่มีข้อมูลสำหรับตัวชี้วัดนี้');
 const D=gDates(m,false),Dp=gDates(m,true),hasP=gAny(Dp);if(!gAny(D))return head()+out.join('')+emptyCard();
 const fmtAx=gax(m),lab=v=>gf(m,v),base=m.kind==='pct'||m.kind==='x'||m.kind==='x2'||m.k==='revpt'||m.k==='wagept'?'auto':0;
 /* 1 trend */
 const ds=trendDates(src).filter(d=>m.src.every(k=>MD.pools[k].includes(d))),hi=hiIdx(ds,src),T=ds.map(d=>{const o={};m.src.forEach(k=>o[k]=[d]);return ovCalc('all',keepFn(),o)[0]});
 out.push(card(`แนวโน้มรายวัน — ${m.l}`,'รวม / AB / CC · แถบสีทองคือช่วงที่เลือก · กดจุดเพื่อดูวันนั้น',chart((W,H,P)=>{const C=gCols(P);return lineChart({labels:ds.map(shortLabel),series:[{name:'รวม',color:P.ink,vals:T.map(r=>gv(r,m,0))},{name:'AB',color:C.ab,vals:T.map(r=>gv(r,m,1))},{name:'CC',color:C.cc,vals:T.map(r=>gv(r,m,2))}],P,W,H,hi,acts:dayActs(ds),fmt:fmtAx,tipFmt:lab,min:base==='auto'?'auto':0})},.36,230,380)+lg([['var(--ink)','รวม'],['var(--ab)','AB'],['var(--cc)','CC']])));
 /* 2 zone vs previous */
 const kz=keepFn({zone:'',dc:''}),Z=ovCalc('zone',kz,D).filter(r=>r.key!=='?'),Zp=new Map(hasP?ovCalc('zone',kz,Dp).map(r=>[r.key,r]):[]),zs=MD.M.zones.filter(z=>Z.some(r=>r.key===z)),zr=z=>Z.find(r=>r.key===z);
 out.push(card(`ราย Zone เทียบช่วงก่อนหน้า — ${m.l}${bl}`,'กด Zone เพื่อกรองทั้งหน้า',chart((W,H,P)=>{const C=gCols(P);return gbars({labels:zs,series:[{name:'ช่วงนี้',color:C.cur,vals:zs.map(z=>gv(zr(z),m,bi))},...(hasP?[{name:'ก่อนหน้า',color:C.prv,vals:zs.map(z=>gv(Zp.get(z),m,bi))}]:[])],P,W,H,fmt:fmtAx,lab,base,acts:zs.map(z=>'zone:'+z),
  tips:zs.map(z=>`${z}\nช่วงนี้: ${lab(gv(zr(z),m,bi))}\nก่อนหน้า: ${lab(gv(Zp.get(z),m,bi))}\n${gdl(m,gv(zr(z),m,bi),gv(Zp.get(z),m,bi))}`)})},.4,260,400)+lg([['var(--s1)','ช่วงนี้'],...(hasP?[['var(--s3)','ช่วงก่อนหน้า']]:[])])));
 /* 3-4 DC best / worst */
 const kd=keepFn({dc:''}),Dc=ovCalc('dc',kd,D).filter(r=>!MD.M.hidden(r.key)&&gv(r,m,bi)!=null),Dcp=new Map(hasP?ovCalc('dc',kd,Dp).map(r=>[r.key,r]):[]);
 const dir=m.hi===false?1:-1,sorted=Dc.slice().sort((x,y)=>dir*(gv(x,m,bi)-gv(y,m,bi))),rowOf=r=>({l:shortDC(r.name),v:gv(r,m,bi),p:gv(Dcp.get(r.key),m,bi),act:'fdc:'+r.key});
 const tN=m.hi==null?['มากที่สุด','น้อยที่สุด']:['ผลดีที่สุด','ต้องเร่งปรับปรุง'],top=sorted.slice(0,10),bot=sorted.length>10?sorted.slice(-10).reverse():[];
 const hb=(L,col)=>chart((W,H,P)=>hbars({items:gItems(L.map(rowOf),m,P,col==='bad'?P.bad:P.s[0]),P,W,labelW:Math.min(170,W*.32),valW:Math.min(190,W*.34),fmt:v=>gf(m,v)}),.3,200,420);
 out.push(`<div class="grid2">${card(`DC ${tN[0]} ${top.length} อันดับ — ${m.l}${bl}`,`เทียบช่วงก่อนหน้าท้ายแถบ · กด DC เพื่อกรอง${S.zone?' · เฉพาะ Zone '+S.zone:''}`,hb(top))}${bot.length?card(`DC ${tN[1]} ${bot.length} อันดับ — ${m.l}${bl}`,`เทียบช่วงก่อนหน้าท้ายแถบ${S.zone?' · เฉพาะ Zone '+S.zone:''}`,hb(bot,m.hi==null?'':'bad')):''}</div>`);
 /* 5 AB vs CC by zone */
 out.push(card(`AB เทียบ CC ราย Zone — ${m.l}`,'ช่วงที่เลือก',chart((W,H,P)=>{const C=gCols(P);return gbars({labels:zs,series:[{name:'AB',color:C.ab,vals:zs.map(z=>gv(zr(z),m,1))},{name:'CC',color:C.cc,vals:zs.map(z=>gv(zr(z),m,2))}],P,W,H,fmt:fmtAx,lab,base,acts:zs.map(z=>'zone:'+z)})},.4,260,400)+lg([['var(--ab)','AB'],['var(--cc)','CC']])));
 /* 6 BKK vs UPC */
 const kg=keepFn({group:'all',zone:'',dc:''}),G=ovCalc('grp',kg,D),Gp=new Map(hasP?ovCalc('grp',kg,Dp).map(r=>[r.key,r]):[]),gr=k=>G.find(r=>r.key===k),cats=[];['BKK','UPC'].forEach(g=>[0,1,2].forEach(i=>cats.push([g,i])));
 out.push(card(`BKK เทียบ UPC — ${m.l}`,'รวม / AB / CC ของแต่ละกลุ่ม เทียบช่วงก่อนหน้า',chart((W,H,P)=>{const C=gCols(P);return gbars({labels:cats.map(([g,i])=>g+' '+['รวม','AB','CC'][i]),series:[{name:'ช่วงนี้',color:C.cur,vals:cats.map(([g,i])=>gv(gr(g),m,i))},...(hasP?[{name:'ก่อนหน้า',color:C.prv,vals:cats.map(([g,i])=>gv(Gp.get(g),m,i))}]:[])],P,W,H,fmt:fmtAx,lab,base,acts:cats.map(([g])=>'group:'+g)})},.36,240,380)+lg([['var(--s1)','ช่วงนี้'],...(hasP?[['var(--s3)','ช่วงก่อนหน้า']]:[])])));
 /* 7-8 vehicle type / relation (metrics from trips or cost) */
 if(m.src.includes('perf')||m.src.includes('cost')){const V=gByTrip(m,bi,'vt',v=>VTN[v]||v),Rl=gByTrip(m,bi,'rel',v=>REL[v]||v);
  out.push(`<div class="grid2">${V.length?card(`ตามชนิดรถ — ${m.l}${bl}`,'เทียบช่วงก่อนหน้าท้ายแถบ',chart((W,H,P)=>hbars({items:gItems(V,m,P),P,W,labelW:Math.min(190,W*.36),valW:Math.min(190,W*.34),fmt:v=>gf(m,v)}),.3,160,360)):''}${Rl.length?card(`ตามประเภทรถ — ${m.l}${bl}`,'รถบริษัท / รถร่วม / รถเสริม · เทียบช่วงก่อนหน้าท้ายแถบ',chart((W,H,P)=>hbars({items:gItems(Rl,m,P,P.s[1]),P,W,labelW:Math.min(190,W*.36),valW:Math.min(190,W*.34),fmt:v=>gf(m,v)}),.3,160,360)):''}</div>`)}
 /* 9 plan vs actual by day */
 if((a==='plan'||a==='perf')&&MD.has.plan&&MD.has.perf){const pd=trendDates('plan').filter(d=>MD.pools.perf.includes(d)),phi=hiIdx(pd,'plan'),PV=pd.map(d=>ovCalc('all',keepFn(),{plan:[d],perf:[d]})[0]);
  out.push(card(`แผนเทียบจริง รายวัน${bl}`,'รถตามแผน (วันกำหนดส่ง ÷ PA) เทียบเที่ยวที่ปล่อยจริง · นับเฉพาะวันที่มีข้อมูลทั้งสองด้าน',chart((W,H,P)=>lineChart({labels:pd.map(shortLabel),series:[{name:'ตามแผน',color:P.s[1],dash:1,vals:PV.map(r=>gv(r,{k:'plan'},bi))},{name:'ใช้จริง',color:P.s[0],vals:PV.map(r=>gv(r,{k:'act'},bi))}],P,W,H,hi:phi,acts:dayActs(pd),tipFmt:fmtN}),.36,230,380)+lg([['var(--s2)','ตามแผน'],['var(--s1)','ใช้จริง']])))}
 /* 10 perf: bills not delivered by zone */
 if(a==='perf'){const kz2=keepFn({zone:'',dc:''}),F=groupBy(MD.perfTrips(D.perf,kz2),t=>MD.M.zoneOf(t[5])),Fp=hasP?groupBy(MD.perfTrips(Dp.perf||[],kz2),t=>MD.M.zoneOf(t[5])):new Map();
  const fr=L=>{let b=0,d=0,c=0;(L||[]).forEach(t=>{b+=+t[10]||0;d+=+t[11]||0;c+=+t[12]||0});return{b,c,o:Math.max(0,b-d-c)}},FR=zs.map(z=>({z,...fr(F.get(z)),p:fr(Fp.get(z))}));
  out.push(card('บิลส่งไม่ได้ ราย Zone','แยกสาเหตุลูกค้าไม่รับ กับสาเหตุอื่น · ท้ายแถบคือ % ของบิลบนรถ และเทียบช่วงก่อนหน้า',chart((W,H,P)=>hbars({items:FR.map(r=>{const pc=r.b?(r.c+r.o)/r.b*100:null,pp=r.p.b?(r.p.c+r.p.o)/r.p.b*100:null;return{l:r.z,parts:[{v:r.c,c:P.s[1]},{v:r.o,c:P.bad}],txt:`${fmtN(r.c+r.o)} (${fmtP(pc)})  ${gdl({kind:'pct'},pc,pp)}`,tip:`${r.z}\nลูกค้าไม่รับ: ${fmtN(r.c)}\nสาเหตุอื่น: ${fmtN(r.o)}\nบิลบนรถ: ${fmtN(r.b)}`,act:'zone:'+r.z}}),P,W,labelW:Math.min(110,W*.2),valW:Math.min(210,W*.36)}),.3,200,420)+lg([['var(--s2)','ลูกค้าไม่รับ'],['var(--bad)','สาเหตุอื่น']])))}
 /* 11 sla: main reasons */
 if(a==='sla'){const bt=bi?['','AB','CC'][bi]:'',rs=reasonAgg(MD.reasonRows(D.sla,keepFn(),bt),'m').filter(r=>r.late>0).sort((x,y)=>y.late-x.late).slice(0,10),rp=hasP?new Map(reasonAgg(MD.reasonRows(Dp.sla||[],keepFn(),bt),'m').map(r=>[r.m,r.late])):new Map();
  if(rs.length)out.push(card(`สาเหตุหลักของบิลไม่ทันเวลา 10 อันดับ${bl}`,'จำนวนบิล Not Ontime ตามสาเหตุหลัก · เทียบช่วงก่อนหน้าท้ายแถบ',chart((W,H,P)=>hbars({items:rs.map(r=>({l:r.m.length>28?r.m.slice(0,27)+'…':r.m,v:r.late,c:P.bad,txt:fmtN(r.late)+(rp.has(r.m)?'   '+gdl({kind:'n'},r.late,rp.get(r.m)):''),tip:`${r.m}\nช่วงนี้: ${fmtN(r.late)}\nก่อนหน้า: ${fmtN(rp.get(r.m))}`})),P,W,labelW:Math.min(230,W*.4),valW:Math.min(170,W*.3)}),.3,200,420)))}
 return head()+out.join('')}
VIEW.pg=()=>gPage('plan');VIEW.fg=()=>gPage('perf');VIEW.sg=()=>gPage('sla');VIEW.cg=()=>gPage('cost');
