/* ---------- report readers: turn a NIMEX export (rows from SheetJS, header:1) into the compact tables kept in the Google Sheet.
   Runs in the browser (admin upload) and in Node (tests). No DOM. ---------- */
(function(G){
const REPORTS={
  NIMEX016212:{name:'Control Board รายบิล (รายวัน)',use:'แผนการใช้รถ · SLA',kind:'bills'},
  NIMEX012175:{name:'Control Board รายบิล (ช่วงวัน)',use:'แผนการใช้รถ · SLA',kind:'bills'},
  SME206:{name:'ข้อมูลบิลทั้งหมด (รูปแบบเดียวกับ Control Board)',use:'แผนการใช้รถ · SLA',kind:'bills'},
  NIMEX026001:{name:'ประสิทธิภาพเที่ยวรถ',use:'ผลการใช้รถและการจัดส่ง',kind:'trips'},
  NIMEX06006:{name:'รายได้รถ สรุปรวม',use:'ต้นทุนทุกมิติ',kind:'cost'},
  PA:{name:'ชีต PA (ฐานข้อมูล DC)',use:'ทุกด้าน',kind:'dcs'}
};
const S=v=>v==null?'':String(v).replace(/ /g,' ').replace(/\s+/g,' ').trim();
const N=v=>{const n=typeof v==='number'?v:parseFloat(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0};
const R2=v=>Math.round(v*100)/100;
const code=s=>{const m=S(s).match(/^(\d+)/);return m?m[1]:''};
const dcName=s=>S(s).replace(/^\d+\s*/,'');
/* dd/mm/yyyy (Buddhist or Gregorian year), Date, or Excel serial -> yyyy-mm-dd */
function day(v){if(v==null||v==='')return'';
 if(typeof v==='number'&&v>20000&&v<80000){const d=new Date(Math.round((v-25569)*864e5));return d.toISOString().slice(0,10)}
 if(v instanceof Date&&!isNaN(v)){let y=v.getFullYear();if(y>2400)y-=543;return`${y}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`}
 const m=S(v).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);if(!m)return'';let y=+m[3];if(y>2400)y-=543;return`${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`}
const clock=v=>{const m=S(v).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);return m?`${m[1].padStart(2,'0')}:${m[2]}:${m[3]||'00'}`:''};
function detect(rows){const top=rows.slice(0,8).map(r=>(r||[]).map(S).join(' ')).join(' ');const m=top.match(/NIMEX0?\d{5,6}|SME\d{3}/);if(m&&REPORTS[m[0]])return m[0];
 for(let i=0;i<6&&i<rows.length;i++){const h=(rows[i]||[]).map(S);if(h.includes('DC')&&h.includes('PA บิล'))return'PA'}return m?m[0]:null}
const range=rows=>{for(let i=0;i<6;i++){const t=S((rows[i]||[])[0]);if(/ตั้งแต่/.test(t))return t}return''};
const isData=r=>{const a=r&&r[0];return typeof a==='number'||/^\d+$/.test(S(a))};
const findHdr=(rows,label)=>{for(let i=0;i<12&&i<rows.length;i++){const h=(rows[i]||[]).map(S);if(h.includes(label))return i}return-1};
const idx=(h,label,nth=0)=>{let k=-1;for(let i=0;i<h.length;i++)if(h[i]===label&&k++===nth-1)return i;return-1};

/* PA: DC master. Uses the first "กลุ่ม" column (BKK/UPC); a second "กลุ่ม" column (ตัด/ไม่ตัด) is ignored */
function readPA(rows){const hi=findHdr(rows,'PA บิล'),h=(rows[hi]||[]).map(S),c={dc:idx(h,'DC'),pa:idx(h,'PA บิล'),z:idx(h,'Zone'),s:idx(h,'Size'),g:idx(h,'กลุ่ม')};
 if(c.dc<0||c.pa<0)throw new Error('ไม่พบคอลัมน์ DC หรือ PA บิล');const out=[];
 rows.slice(hi+1).forEach(r=>{const k=code(r[c.dc]);if(!k)return;out.push([k,dcName(r[c.dc]),N(r[c.pa]),S(r[c.z]),S(r[c.s]),S(r[c.g])==='BKK'?'BKK':'UPC'])});return{dcs:out}}

/* Control Board (NIMEX016212 / NIMEX012175): bill rows -> one row per due date x destination DC x bill type, with SLA counters.
   SLA (agreed 8 Nov 2026):
   0 ทุกสาเหตุ            = "ผลการจัดส่ง" On time ÷ all bills
   1 ทุกสาเหตุรวมลูกค้า    = (On time + Not Ontime caused by the customer) ÷ all bills
   2 DC ปลายทาง           = arrived at destination DC on/before due ÷ bills with an arrival date
   3 DC ปลายทางรวมลูกค้า   = (2 + late arrivals caused by the customer) ÷ bills with an arrival date
   Origin DC 680/690 count as 691; destination 680/690 are left out; 801 is left out entirely. */
const BCOLS=['due','dc','bt','oh','n','cust','ot','otc','an','aok','aokc','x'];
const ORIGIN_AS={'680':'691','690':'691'},DROP_ALL=['801'];
function readBills(rows,hide){const hi=findHdr(rows,'วันที่กำหนดส่ง');if(hi<0)throw new Error('ไม่พบคอลัมน์ วันที่กำหนดส่ง');const h=(rows[hi]||[]).map(S);
 const c={id:idx(h,'เลขที่บิล'),due:idx(h,'วันที่กำหนดส่ง'),recv:idx(h,'วันที่รับของ'),res:idx(h,'ผลการจัดส่ง'),o:idx(h,'DC ต้นทาง'),d:idx(h,'DC ปลายทาง'),bt:idx(h,'ประเภทบิล',1),arr:idx(h,'วันที่สินค้าถึง DC ปลายทาง'),r1:h.findIndex(x=>x.startsWith('สาเหตุหลัก')),r2:h.findIndex(x=>x.startsWith('สาเหตุรอง'))};
 if(c.bt<0)c.bt=idx(h,'ประเภทบิล');for(const k of['id','due','d','bt'])if(c[k]<0)throw new Error('ไม่พบคอลัมน์ที่ต้องใช้ ('+k+')');
 const H=new Set(hide||[]),bills=new Map();let skipped=0,noDue=0;
 rows.slice(hi+1).forEach(r=>{if(!isData(r))return;const id=S(r[c.id]);if(!id)return;const due=day(r[c.due]),bt=S(r[c.bt]),d=code(r[c.d]);
  if(!due){noDue++;return}if(!d||(bt!=='Normal'&&bt!=='Cold Chain')){skipped++;return}
  bills.set(id,{id,due,d,o:code(r[c.o]),oName:S(r[c.o]),dName:S(r[c.d]),bt:bt==='Cold Chain'?'CC':'AB',recv:day(r[c.recv]),arr:day(r[c.arr]),ontime:S(r[c.res])==='On time',r1:S(r[c.r1]).replace(/^\d+\s*/,''),r2:S(r[c.r2]).replace(/^\d+\s*/,'')})});
 return{bills:[...bills.values()],skipped,noDue,hide:H}}
/* bills -> stored tables. od = due date x origin zone x destination zone (for the zone matrix) */
function aggBills(list,hide,zoneOf){const Z=zoneOf||(()=>'?');const H=new Set(hide||[]),A=new Map(),OD=new Map(),RS=new Map(),names={};let remap=0,dropped=0;
 list.forEach(b=>{if(DROP_ALL.includes(b.o)||DROP_ALL.includes(b.d)||H.has(b.d)){dropped++;return}const o=ORIGIN_AS[b.o]||b.o;if(o!==b.o)remap++;
  names[b.d]=names[b.d]||b.dName;const cust=/ลูกค้า/.test(b.r1)?1:0,ot=b.ontime?1:0,otc=ot||cust?1:0,an=b.arr?1:0,aok=an&&b.arr<=b.due?1:0,aokc=an&&(aok||cust)?1:0;
  const add=(M,k,init)=>{let x=M.get(k);if(!x){x=init();M.set(k,x)}return x},inc=x=>{x[4]++;x[5]+=cust;x[6]+=ot;x[7]+=otc;x[8]+=an;x[9]+=aok;x[10]+=aokc};
  inc(add(A,[b.due,b.d,b.bt].join('|'),()=>[b.due,b.d,b.bt,0,0,0,0,0,0,0,0,0]));
  if(o)inc(add(OD,[b.due,Z(o),Z(b.d),b.bt].join('|'),()=>[b.due,Z(o),Z(b.d),b.bt,0,0,0,0,0,0,0,0]));
  if(b.r1){const r=add(RS,[b.due,b.d,b.bt,b.r1,b.r2].join('|'),()=>[b.due,b.d,b.bt,b.r1,b.r2,0,0]);r[5]++;r[6]+=ot?0:1}});
 return{bills:[...A.values()],od:[...OD.values()],reasons:[...RS.values()],names,remap,dropped}}

/* NIMEX026001: one row per trip (all trip types, needed for mileage continuity) */
const TCOLS=['id','date','time','ret','plate','dc','vt','rel','pt','route','bt','bd','bfc','dist','mo','mi','rev','revd','bdry','bcold','pcs','pcsd','bdd','bdc','pD','pC','pdD','pdC'];
const PTYPE={'จัดรถกระจาย+เข้ารับ':'D'};
function readTrips(rows){const hi=findHdr(rows,'เลขที่ใบรายการ');if(hi<0)throw new Error('ไม่พบคอลัมน์ เลขที่ใบรายการ');const h=(rows[hi]||[]).map(S);
 const c={id:idx(h,'เลขที่ใบรายการ'),date:idx(h,'วันที่ปล่อยรถ'),time:idx(h,'เวลาปล่อยรถ'),ret:idx(h,'วันที่รับรถ'),plate:idx(h,'ทะเบียนรถ'),rc:idx(h,'รหัสเส้นทาง'),rn:idx(h,'ชื่อเส้นทาง'),pt:idx(h,'ประเภท'),rel:idx(h,'ประเภทการปล่อยรถ'),vt:idx(h,'ชนิดรถ'),dc:idx(h,'DC'),bdry:idx(h,'จำนวนบิลแห้ง'),bcold:idx(h,'จำนวนบิลเย็น'),bt:idx(h,'จำนวนบิลรวม'),bd:idx(h,'บิลส่งได้รวม'),bfc:idx(h,'จำนวนส่งไม่ได้ (ลูกค้า)'),mo:idx(h,'ไมล์ออก'),mi:idx(h,'ไมล์เข้า'),dist:h.findIndex(x=>x.startsWith('ระยะทาง')),rev:idx(h,'รายได้ค่าขนส่งทั้งหมด'),revd:idx(h,'รายได้ค่าขนส่งที่ส่งได้รวม'),pcs:idx(h,'จำนวนชิ้นรวม'),pdry:idx(h,'ชิ้นส่งได้แห้ง'),pcold:idx(h,'ชิ้นส่งได้เย็น'),bdd:idx(h,'บิลส่งได้แห้ง'),bdc:h.findIndex(x=>/^บิลส่งได้\s*เย็น$/.test(x)),pD:idx(h,'จำนวนชิ้นแห้ง'),pC:idx(h,'จำนวนชิ้นเย็น')};
 for(const k of['id','date','plate','dc','mo','mi'])if(c[k]<0)throw new Error('ไม่พบคอลัมน์ที่ต้องใช้ ('+k+')');
 const trips=new Map(),routes={},names={},vts={},rels={},pts={};let cur='';
 rows.slice(hi+1).forEach(r=>{const a=S(r&&r[0]);if(!isData(r)){if(/^\d+\s/.test(a))cur=code(a);return}const id=S(r[c.id]);if(!id)return;const dcRaw=r[c.dc]!=null&&S(r[c.dc])?r[c.dc]:cur,dc=code(dcRaw);const date=day(r[c.date]);if(!date||!dc)return;
  const vt=code(r[c.vt])||S(r[c.vt]),rel=code(r[c.rel])||S(r[c.rel]),pt=S(r[c.pt]),rc=S(r[c.rc])||'ไม่ระบุ';
  vts[vt]=S(r[c.vt]).replace(/^\d+\s*/,'');rels[rel]=S(r[c.rel]).replace(/^\d+\s*/,'');pts[pt]=1;if(S(r[c.rn]))routes[rc]=S(r[c.rn]);names[dc]=dcName(dcRaw);
  const retS=S(r[c.ret]),ret=day(retS);
  trips.set(id,[id,date,clock(r[c.time]),ret?ret+' '+clock(retS):'',S(r[c.plate]),dc,vt,rel,pt,rc,N(r[c.bt]),N(r[c.bd]),N(r[c.bfc]),r[c.dist]==null||S(r[c.dist])===''?null:N(r[c.dist]),N(r[c.mo]),N(r[c.mi]),R2(N(r[c.rev])),R2(N(r[c.revd])),N(r[c.bdry]),N(r[c.bcold]),N(r[c.pcs]),N(r[c.pdry])+N(r[c.pcold]),N(r[c.bdd]),N(r[c.bdc]),N(r[c.pD]),N(r[c.pC]),N(r[c.pdry]),N(r[c.pcold])])});
 return{trips:[...trips.values()],routes,names,vts,rels,pts:Object.keys(pts)}}

/* NIMEX06006: revenue (NIMEX side) and transport cost by AB/CC and distribution/pick-up.
   Kept per date x DC x vehicle type x release type (columns AE..AT as the AB & CC Cost Dashboard), plus month x plate */
const CF=['bAB','xAB','rAB','cAB','bCC','xCC','rCC','cCC','pbAB','pxAB','prAB','pcAB','pbCC','pxCC','prCC','pcCC'];
const KCOLS=['date','dc','vt','rel','trips',...CF];
function readCost(rows){const hi=findHdr(rows,'เลขที่ใบรายการ');if(hi<0)throw new Error('ไม่พบคอลัมน์ เลขที่ใบรายการ');const h=(rows[hi]||[]).map(S);
 const c={dc:idx(h,'DC'),id:idx(h,'เลขที่ใบรายการ'),date:idx(h,'วันที่ใบรายการ'),plate:idx(h,'ทะเบียนรถ'),rel:h.findIndex(x=>x.startsWith('รหัสประเภทรถ')),vt:idx(h,'ชนิดรถ')};
 const v0=idx(h,'จำนวนบิลของแห้ง');if(v0<0||c.date<0)throw new Error('ไม่พบคอลัมน์ต้นทุน (จำนวนบิลของแห้ง … ต้นทุนเข้ารับของเย็น)');
 const A=new Map(),P=new Map(),TC=new Map(),names={},vts={},rels={};let dup=0;
 rows.slice(hi+1).forEach(r=>{if(!isData(r))return;const id=S(r[c.id]),date=day(r[c.date]),dc=code(r[c.dc]);if(!date||!dc)return;
  const vals=CF.map((_,i)=>N(r[v0+i]));if(vals.every(x=>!x))return;const vt=code(r[c.vt])||S(r[c.vt]),rel=code(r[c.rel])||S(r[c.rel]);
  names[dc]=dcName(r[c.dc]);vts[vt]=S(r[c.vt]).replace(/^\d+\s*/,'');rels[rel]=S(r[c.rel]).replace(/^\d+\s*/,'');
  const k=[date,dc,vt,rel].join('|');let a=A.get(k);if(!a){a=[date,dc,vt,rel,0,...CF.map(()=>0)];A.set(k,a)}a[4]++;vals.forEach((x,i)=>a[5+i]+=x);
  const m=date.slice(0,7),pl=S(r[c.plate]),pk=[m,pl,dc].join('|');let p=P.get(pk);if(!p){p=[m,pl,dc,vt,rel,0,0,0];P.set(pk,p)}p[5]++;p[6]+=vals[2]+vals[6]+vals[10]+vals[14];p[7]+=vals[3]+vals[7]+vals[11]+vals[15];
  if(id){let t=TC.get(id);if(!t){t=[date,id,0,0];TC.set(id,t)}t[2]+=vals[2]+vals[6]+vals[10]+vals[14];t[3]+=vals[3]+vals[7]+vals[11]+vals[15]}});
 const cost=[...A.values()].map(a=>a.map((x,i)=>i>=5?R2(x):x)),plates=[...P.values()].map(p=>[p[0],p[1],p[2],p[3],p[4],p[5],R2(p[6]),R2(p[7])]);
 const tcost=[...TC.values()].map(t=>[t[0],t[1],R2(t[2]),R2(t[3])]);
 return{cost,plates,tcost,names,vts,rels,dup}}

function readReport(rows,hide){const rep=detect(rows);if(!rep)throw new Error('ไม่รู้จักรายงานนี้ (ไม่พบรหัส NIMEX หรือหัวตาราง PA)');const kind=REPORTS[rep]?REPORTS[rep].kind:null;
 if(kind==='dcs')return{rep,kind,...readPA(rows)};
 if(kind==='bills'){const r=readBills(rows,hide);return{rep,kind,range:range(rows),...r}}
 if(kind==='trips')return{rep,kind,range:range(rows),...readTrips(rows)};
 if(kind==='cost')return{rep,kind,range:range(rows),...readCost(rows)};
 throw new Error('รายงาน '+rep+' ยังไม่รองรับ')}
const api={REPORTS,ORIGIN_AS,DROP_ALL,BCOLS,TCOLS,KCOLS,CF,PTYPE,day,code,detect,readReport,readPA,readBills,aggBills,readTrips,readCost};
if(typeof module!=='undefined')module.exports=api;else G.NXP=api;
})(typeof window!=='undefined'?window:globalThis);
