/* ---------- shared core: dates, periods, DC master, plan formula. No DOM ---------- */
(function(G){
const TH_MON=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const TH_DOW=['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'];
const ymd=k=>k.split('-').map(Number);
const toDate=k=>{const[y,m,d]=ymd(k);return new Date(Date.UTC(y,m-1,d||1))};
const keyOf=dt=>dt.toISOString().slice(0,10);
const addDays=(k,n)=>{const d=toDate(k);d.setUTCDate(d.getUTCDate()+n);return keyOf(d)};
const dow=k=>toDate(k).getUTCDay();
const isSun=k=>dow(k)===0;
const mondayOf=k=>addDays(k,-((dow(k)+6)%7));
const fmtLabel=k=>{const[y,m,d]=ymd(k);return`${d} ${TH_MON[m-1]} ${y+543}`};
const shortLabel=k=>{const[,m,d]=ymd(k);return`${d} ${TH_MON[m-1]}`};
const monthLabel=k=>{const[y,m]=ymd(k.slice(0,7)+'-01');return`${TH_MON[m-1]} ${y+543}`};
const r1=v=>Math.round(v*10)/10;

/* The plan formula of the original Fleet Intelligence Dashboard, unchanged.
   dcB: {key:{c,n}}  info: key -> {pa,zone,size,group,name} */
function buildSlice(dcB,info){
  const list=[];
  Object.entries(dcB).forEach(([dc,{c:cb,n:nb}])=>{
    const I=info[dc]||{};
    const p=I.pa||0,z=I.zone||'?',sz=I.size||'?',gt=I.group||'UPC';
    const cc=p>0&&cb>0?Math.ceil(cb/p):(cb>0?1:0),nc=p>0&&nb>0?Math.ceil(nb/p):(nb>0?1:0);
    const cm=p>0&&cb>0&&nb>0&&cb<p&&nb<p,mc=cm?Math.ceil((cb+nb)/p):null,sc=cm?cc+nc-mc:0;
    const tc2=cc+nc;
    list.push({key:dc,DC:I.full||dc,zone:z,size:sz,pa:p,group:gt,cold_bills:cb,normal_bills:nb,cold_cars:cc,normal_cars:nc,
               total_bills:cb+nb,total_cars:tc2,avg_bills_per_car:tc2>0?Math.round((cb+nb)/tc2*10)/10:0,
               avg_cold:cc>0?Math.round(cb/cc*10)/10:0,avg_norm:nc>0?Math.round(nb/nc*10)/10:0,
               can_merge:cm,merged_cars:mc,saved_cars:sc});
  });
  list.sort((a,b)=>b.total_bills-a.total_bills);
  const za={};list.forEach(r=>{if(!za[r.zone])za[r.zone]={zone:r.zone,total_bills:0,total_cars:0,cold_bills:0,normal_bills:0,cold_cars:0,normal_cars:0,dcs:0,cap:0};['total_bills','total_cars','cold_bills','normal_bills','cold_cars','normal_cars'].forEach(k=>za[r.zone][k]+=r[k]);za[r.zone].dcs++;za[r.zone].cap+=r.total_cars*r.pa;});
  const zl=Object.values(za).sort((a,b)=>b.total_cars-a.total_cars);
  const Sm=f=>list.reduce((s,r)=>s+r[f],0);
  const tb=Sm('total_bills'),tc=Sm('total_cars'),cb2=Sm('cold_bills'),nb2=Sm('normal_bills'),cc2=Sm('cold_cars'),nc2=Sm('normal_cars');
  const bkk=list.filter(r=>r.group==='BKK'),upc=list.filter(r=>r.group==='UPC');
  const S2=(l,f)=>l.reduce((s,r)=>s+r[f],0);
  return{summary:{total_dcs:list.length,total_bills:tb,cold_bills:cb2,normal_bills:nb2,total_cars:tc,cold_cars:cc2,normal_cars:nc2,
    avg:tc>0?Math.round(tb/tc*10)/10:0,avg_cold:cc2>0?Math.round(cb2/cc2*10)/10:0,avg_norm:nc2>0?Math.round(nb2/nc2*10)/10:0,
    bkk_cars:S2(bkk,'total_cars'),upc_cars:S2(upc,'total_cars'),bkk_bills:S2(bkk,'total_bills'),upc_bills:S2(upc,'total_bills'),total_saved:S2(list,'saved_cars'),mergeable_dcs:list.filter(r=>r.can_merge).length},
    zone:zl,dc:list};
}

/* DC master: code -> info. Hidden DCs never show anywhere */
function makeMaster(dcs,hide){const H=new Set((hide||[]).map(String)),info={};
 (dcs||[]).forEach(r=>{const k=String(r[0]);info[k]={code:k,name:String(r[1]||''),full:k+' '+String(r[1]||''),pa:+r[2]||0,zone:String(r[3]||'')||'?',size:String(r[4]||'')||'?',group:r[5]==='BKK'?'BKK':'UPC'}});
 const zones=[...new Set(Object.values(info).filter(i=>!H.has(i.code)).map(i=>i.zone))].filter(z=>z!=='?').sort((a,b)=>a==='BKK'?-1:b==='BKK'?1:a.localeCompare(b,'th'));
 const get=k=>info[k]||{code:k,name:'',full:k+' (ไม่อยู่ในฐานข้อมูล DC)',pa:0,zone:'?',size:'?',group:'UPC'};
 return{info,H,zones,get,hidden:k=>H.has(String(k)),name:k=>get(k).full,zoneOf:k=>get(k).zone,groupOf:k=>get(k).group}}

/* Calendar over all loaded dates. Sundays count in week/month totals but are never shown as a day */
function makeCalendar(allDates){
 const dates=[...new Set(allDates)].filter(Boolean).sort(),shown=dates.filter(d=>!isSun(d));
 const months=[...new Set(dates.map(d=>d.slice(0,7)))],weeks=[...new Set(dates.map(mondayOf))];
 function periodDates(mode,key,pool){const P=pool||dates;if(mode==='day')return P.includes(key)?[key]:[];if(mode==='week'){const e=addDays(key,6);return P.filter(d=>d>=key&&d<=e)}return P.filter(d=>d.slice(0,7)===key)}
 const periods=mode=>mode==='day'?shown:mode==='week'?weeks:months;
 function label(mode,key){if(mode==='day')return`${TH_DOW[dow(key)]} ${fmtLabel(key)}`;
  if(mode==='week'){const b=addDays(key,5),[,ma,da]=ymd(key),[yb,mb,db]=ymd(b);return`สัปดาห์ ${da}${ma===mb?'':' '+TH_MON[ma-1]}–${db} ${TH_MON[mb-1]} ${yb+543}`}
  return monthLabel(key)}
 /* the comparable earlier period: day -> same weekday last week, week -> same weekdays of the previous week,
    month -> the same number of working days of the previous month (the whole previous month when it has fewer) */
 function prevDates(mode,key,pool){const P=pool||dates,cur=periodDates(mode,key,P);if(!cur.length)return null;
  if(mode==='day'){const p=addDays(key,-7);return P.includes(p)?[p]:null}
  if(mode==='week'){const p=cur.map(d=>addDays(d,-7)).filter(d=>P.includes(d));return p.length===cur.length?p:null}
  const[y,m]=ymd(key+'-01'),pk=m===1?`${y-1}-12`:`${y}-${String(m-1).padStart(2,'0')}`,pd=P.filter(d=>d.slice(0,7)===pk),wk=cur.filter(d=>!isSun(d)).length,pw=pd.filter(d=>!isSun(d));
  if(!wk||!pw.length)return null;const cut=pw[Math.min(wk,pw.length)-1];return pd.filter(d=>d<=cut)}
 return{dates,shown,months,weeks,periodDates,periods,label,prevDates}}
const api={TH_MON,TH_DOW,ymd,addDays,dow,isSun,mondayOf,fmtLabel,shortLabel,monthLabel,r1,buildSlice,makeMaster,makeCalendar};
if(typeof module!=='undefined')module.exports=api;else Object.assign(G,api);
})(typeof window!=='undefined'?window:globalThis);
