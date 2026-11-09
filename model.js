/* ---------- data model: loaded tables -> figures for every section. No DOM, testable in Node ----------
   Tables (one row = array):
   bills   [due,dc,bt,0,n,cust,ot,otc,an,aok,aokc,0]   per due date x destination DC x AB/CC
   od      [due,oz,dz,bt,n,cust,ot,otc,an,aok,aokc,0]  per due date x origin zone x destination zone
   reasons [due,dc,bt,main,sub,n,notOnTime]
   trips   [id,date,time,ret,plate,dc,vt,rel,pt,route,bt,bd,bfc,dist,mo,mi,rev,revd,bdry,bcold,pcs,pcsd]
   cost    [date,dc,vt,rel,trips,bAB,xAB,rAB,cAB,bCC,xCC,rCC,cCC,pbAB,pxAB,prAB,pcAB,pbCC,pxCC,prCC,pcCC]
   plates  [month,plate,dc,vt,rel,trips,rev,cost] */
(function(G){
const C=typeof module!=='undefined'?require('./core.js'):G;
const DEF_SETTINGS={sla:{good:95,watch:85},eff:{good:96,warn:90},effx:{good:100,warn:98},costDist:[23,24,25,26],costRecv:[4,5,6,7],
 planGap:{warn:10}};
const SLA_LABELS=['SLA ทุกสาเหตุ','SLA ทุกสาเหตุรวมลูกค้า','SLA DC ปลายทาง','SLA DC ปลายทางรวมลูกค้า'];
const SLA_NOTE=['On time ÷ บิลทั้งหมด','(On time + ไม่ทันเพราะลูกค้า) ÷ บิลทั้งหมด','ถึง DC ปลายทาง ≤ วันกำหนดส่ง ÷ บิลที่มีวันถึง DC ปลายทาง','(ถึงทัน + ถึงช้าเพราะลูกค้า) ÷ บิลที่มีวันถึง DC ปลายทาง'];
const DTRIP='จัดรถกระจาย+เข้ารับ',COMPANY='01',COLD_VT='042';
const sum=(rows,i)=>rows.reduce((a,r)=>a+(+r[i]||0),0);

function makeModel(D,opt){
 const M=C.makeMaster(D.dcs,opt.hide),ST={...DEF_SETTINGS,...(D.settings||{})};
 const vis=k=>!M.hidden(k);
 const bills=(D.bills||[]).filter(r=>vis(r[1])),od=D.od||[],reasons=(D.reasons||[]).filter(r=>vis(r[1]));
 const trips=(D.trips||[]).filter(r=>vis(r[5])),cost=(D.cost||[]).filter(r=>vis(r[1])),plates=(D.plates||[]).filter(r=>vis(r[2]));
 const byDate=(rows,i)=>{const m=new Map();rows.forEach(r=>{const k=r[i];if(!m.has(k))m.set(k,[]);m.get(k).push(r)});return m};
 const BI=byDate(bills,0),OI=byDate(od,0),RI=byDate(reasons,0),CI=byDate(cost,0);
 /* ---- distance correction as in NIMEX Distribution Performance: <=0 or blank -> plate average of normal trips (0<d<=700) in the same month, else DC average; >700 -> 700 ---- */
 const dTrips=trips.filter(t=>t[8]===DTRIP);
 (function(){const pv={},dv={},key=(t,k)=>t[1].slice(0,7)+'|'+k;dTrips.forEach(t=>{const d=t[13];if(typeof d==='number'&&d>0&&d<=700){(pv[key(t,t[4])]=pv[key(t,t[4])]||[]).push(d);(dv[key(t,t[5])]=dv[key(t,t[5])]||[]).push(d)}});
  const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;dTrips.forEach(t=>{const d=t[13];if(d==null||d<=0){const p=pv[key(t,t[4])],q=dv[key(t,t[5])];t.km=p?avg(p):q?avg(q):0;t.kmFix='avg'}else if(d>700){t.km=700;t.kmFix='cap'}else t.km=d})})();
 const TI=byDate(dTrips,1);
 /* NIMEX06006 revenue / wage per list id (เลขที่ใบรายการ = trip id of NIMEX026001) */
 const TC=new Map();(D.tcost||[]).forEach(r=>{const k=String(r[1]),o=TC.get(k);if(o){o[0]+=+r[2]||0;o[1]+=+r[3]||0}else TC.set(k,[+r[2]||0,+r[3]||0])});
 const pick=(I,dates,keep,dcCol)=>{const out=[];dates.forEach(d=>{const L=I.get(d);if(L)L.forEach(r=>{if(!keep||keep(r[dcCol]))out.push(r)})});return out};
 const allDates=[...BI.keys(),...TI.keys(),...CI.keys()];
 const cal=C.makeCalendar(allDates);
 const pools={plan:[...BI.keys()].sort(),sla:[...BI.keys()].sort(),perf:[...TI.keys()].sort(),cost:[...CI.keys()].sort()};
 const work=ds=>ds.filter(d=>!C.isSun(d)).length;

 /* ---------- 1. plan (bills of every origin, by destination) ---------- */
 const planInfo={};Object.values(M.info).forEach(i=>{planInfo[i.code]=i});
 function planCounts(dates,keep){const o={};pick(BI,dates,keep,1).forEach(r=>{const x=o[r[1]]||(o[r[1]]={c:0,n:0});if(r[2]==='CC')x.c+=r[4];else x.n+=r[4]});return o}
 const plan=(dates,keep)=>C.buildSlice(planCounts(dates,keep),planInfo);

 /* ---------- 2. performance ---------- */
 /* customer failures are only given as a trip total: share them between AB and CC by what is missing on that trip (undelivered dry vs cold) */
 function custSplit(t){const f=+t[12]||0;if(!f)return[0,0];const uD=Math.max(0,(+t[18]||0)-(+t[22]||0)),uC=Math.max(0,(+t[19]||0)-(+t[23]||0)),u=uD+uC;if(u>0)return[f*uD/u,f*uC/u];const b=(+t[18]||0)+(+t[19]||0);return b?[f*(+t[18]||0)/b,f*(+t[19]||0)/b]:[f/2,f/2]}
 function perfAgg(L){const o={trips:L.length,km:0,bt:0,bd:0,bfc:0,rev:0,revd:0,kmFix:0,pcs:0,pcsd:0,bD:0,bC:0,bdD:0,bdC:0,cfD:0,cfC:0,tm:0,rv:0,wg:0};L.forEach(t=>{o.km+=t.km;o.bt+=t[10];o.bd+=t[11];o.bfc+=t[12];o.rev+=t[16];o.revd+=t[17];o.pcs+=+t[20]||0;o.pcsd+=+t[21]||0;if(t.kmFix)o.kmFix++;const m=TC.get(String(t[0]));if(m){o.tm++;o.rv+=m[0];o.wg+=m[1]}
  o.bD+=+t[18]||0;o.bC+=+t[19]||0;o.bdD+=+t[22]||0;o.bdC+=+t[23]||0;const[x,y]=custSplit(t);o.cfD+=x;o.cfC+=y});
  o.effA=o.bD?o.bdD/o.bD*100:null;o.effC=o.bC?o.bdC/o.bC*100:null;o.effxA=o.bD?(o.bdD+o.cfD)/o.bD*100:null;o.effxC=o.bC?(o.bdC+o.cfC)/o.bC*100:null;
  o.bpt=o.trips?o.bt/o.trips:null;o.dpt=o.trips?o.bd/o.trips:null;o.ppt=o.trips?o.pcs/o.trips:null;o.pdpt=o.trips?o.pcsd/o.trips:null;o.eff=o.bt?o.bd/o.bt*100:null;o.effx=o.bt?(o.bd+o.bfc)/o.bt*100:null;o.kmt=o.trips?o.km/o.trips:null;o.revpt=o.tm?o.rv/o.tm:null;o.wagept=o.tm?o.wg/o.tm:null;return o}
 const perfTrips=(dates,keep,f={})=>pick(TI,dates,keep,5).filter(t=>(!f.vt||t[6]===f.vt)&&(!f.rel||(f.rel==='co'?t[7]===COMPANY:t[7]!==COMPANY)));

 /* ---------- 3. SLA: 0 On time ÷ all · 1 (On time + customer) ÷ all · 2 arrived on time ÷ arrived · 3 (arrived on time + customer) ÷ arrived ---------- */
 function slaOf(rows){const o={n:0,cust:0,ot:0,otc:0,an:0,aok:0,aokc:0},K=['n','cust','ot','otc','an','aok','aokc'];rows.forEach(r=>K.forEach((k,i)=>o[k]+=r[4+i]));
  const p=(a,b)=>b?a/b*100:null;o.d=[p(o.ot,o.n),p(o.otc,o.n),p(o.aok,o.an),p(o.aokc,o.an)];o.den=[o.n,o.n,o.an,o.an];o.pass=[o.ot,o.otc,o.aok,o.aokc];return o}
 const slaRows=(dates,keep,bt)=>pick(BI,dates,keep,1).filter(r=>!r[3]&&(!bt||r[2]===bt));
 const odRows=(dates,bt,gk)=>{const out=[];dates.forEach(d=>{const L=OI.get(d);if(L)L.forEach(r=>{if((!bt||r[3]===bt)&&(!gk||gk(r)))out.push(r)})});return out};
 const reasonRows=(dates,keep,bt)=>pick(RI,dates,keep,1).filter(r=>!bt||r[2]===bt);

 /* ---------- 4. cost (NIMEX06006, AE..AT as the AB & CC Cost Dashboard) ---------- */
 const CK={dAB:[5,6,7,8],dCC:[9,10,11,12],rAB:[13,14,15,16],rCC:[17,18,19,20]};
 function costAgg(L){const o={trips:0};Object.keys(CK).forEach(k=>o[k]={b:0,x:0,r:0,c:0});L.forEach(r=>{o.trips+=r[4];Object.entries(CK).forEach(([k,ix])=>{const t=o[k];t.b+=r[ix[0]];t.x+=r[ix[1]];t.r+=r[ix[2]];t.c+=r[ix[3]]})});return o}
 function costPick(o,flow,scope){const keys=[];if(flow!=='recv'){if(scope!=='CC')keys.push('dAB');if(scope!=='AB')keys.push('dCC')}if(flow!=='dist'){if(scope!=='CC')keys.push('rAB');if(scope!=='AB')keys.push('rCC')}
  const t={b:0,x:0,r:0,c:0};keys.forEach(k=>{const s=o[k];t.b+=s.b;t.x+=s.x;t.r+=s.r;t.c+=s.c});t.pct=t.r>0?t.c/t.r*100:null;return t}
 function grade(pct,flow){if(pct==null)return null;const t=flow==='recv'?ST.costRecv:ST.costDist;return pct<t[0]?'A':pct<t[1]?'B':pct<t[2]?'C':pct<t[3]?'D':'F'}
 const costRows=(dates,keep,f={})=>pick(CI,dates,keep,1).filter(r=>(!f.vt||r[2]===f.vt)&&(!f.rel||(f.rel==='co'?r[3]===COMPANY:r[3]!==COMPANY)));

 /* ---------- plan vs actual: cars needed per DC per day (plan formula, day by day) vs distribution trips run ---------- */
 function planVsActual(dates,keep){const out={};dates.forEach(d=>{const hasP=BI.has(d),hasA=TI.has(d);if(!hasP||!hasA)return;
   plan([d],keep).dc.forEach(r=>{const o=out[r.key]||(out[r.key]={key:r.key,pc:0,pn:0,ac:0,an:0,days:0});o.pc+=r.cold_cars;o.pn+=r.normal_cars});
   pick(TI,[d],keep,5).forEach(t=>{const o=out[t[5]]||(out[t[5]]={key:t[5],pc:0,pn:0,ac:0,an:0,days:0});if(t[6]===COLD_VT)o.ac++;else o.an++})});
  const L=Object.values(out).map(o=>({...o,p:o.pc+o.pn,a:o.ac+o.an,gap:o.ac+o.an-o.pc-o.pn,gapPct:(o.pc+o.pn)?(o.ac+o.an-o.pc-o.pn)/(o.pc+o.pn)*100:null}));
  const days=dates.filter(d=>BI.has(d)&&TI.has(d));return{list:L,days}}

 return{M,ST,cal,pools,work,vis,plan,planCounts,perfAgg,perfTrips,slaOf,slaRows,odRows,reasonRows,costAgg,costPick,costRows,grade,planVsActual,routes:D.routes||{},plates,dTrips,trips,
  has:{plan:BI.size>0,perf:TI.size>0,sla:BI.size>0,cost:CI.size>0}}}
const isColdVt=vt=>vt===COLD_VT;
const api={isColdVt,makeModel,DEF_SETTINGS,SLA_LABELS,SLA_NOTE,DTRIP,COMPANY,COLD_VT};
if(typeof module!=='undefined')module.exports=api;else Object.assign(G,api);
})(typeof window!=='undefined'?window:globalThis);
