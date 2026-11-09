/* ---------- NIMEX Fleet Intelligence: shell, filters, charts, shared parts ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmtN=v=>Number.isFinite(+v)&&v!==null?Math.round(+v).toLocaleString('en-US'):'–';
const fmtA=v=>Number.isFinite(+v)&&v!==null?String(v):'–';
const fmt1=v=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:1,minimumFractionDigits:1}):'–';
const fmt2=v=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:2,minimumFractionDigits:2}):'–';
const fmtP=(v,d=2)=>Number.isFinite(v)?v.toFixed(d)+'%':'–';
const fmtM=v=>Number.isFinite(v)?(v/1e6).toLocaleString('en-US',{maximumFractionDigits:2,minimumFractionDigits:2}):'–';
const shortDC=n=>String(n).replace(/^\d+\s*/,'').replace(/^CDC /,'').replace(/^DC /,'');
const HIDE=(window.HIDE_DC||['680','690','801']).map(String);
let MD=null;                                     /* the model, rebuilt whenever months are loaded */
const S={sec:'ov',view:'ov',mode:'month',per:'',group:'all',zone:'',dc:'',bt:'',flow:'dist',scope:'all',vt:'',rel:'',tst:'',sort:{},q:{},adim:'zone',amet:'avg',cmpm:'total_cars',openZone:''};
const VIEW={},ACT={},SECS=[
 {k:'ov',t:'ภาพรวม',s:'ภาพรวม',ic:'home',pages:[['ov','ภาพรวม'],['an','ผลการวิเคราะห์']]},
 {k:'plan',t:'แผนการใช้รถ',s:'แผน',ic:'cal',pages:[['exec','ภาพรวมแผน'],['team','ทีมงาน'],['trend','เทรนด์'],['detail','ราย DC'],['pg','กราฟทุกมิติ']],data:'plan'},
 {k:'perf',t:'ผลการใช้รถและการจัดส่ง',s:'ผลใช้รถ',ic:'truck',pages:[['pov','ภาพรวม'],['pdc','ราย DC'],['pva','แผนเทียบจริง'],['fg','กราฟทุกมิติ']],data:'perf'},
 {k:'sla',t:'SLA',s:'SLA',ic:'clock',pages:[['sov','ภาพรวม'],['smx','Matrix ภาค'],['szn','ราย Zone / DC'],['srs','สาเหตุ'],['sg','กราฟทุกมิติ']],data:'sla'},
 {k:'cost',t:'ต้นทุนทุกมิติ',s:'ต้นทุน',ic:'coin',pages:[['cov','ภาพรวม'],['cdc','ราย Zone / DC'],['cdim','มิติรถ'],['cg','กราฟทุกมิติ']],data:'cost'},
 {k:'adm',t:'ผู้ดูแลระบบ',s:'ผู้ดูแล',ic:'gear',admin:1,pages:[['up','เติมรายงาน'],['master','ฐานข้อมูล DC'],['set','ตั้งค่าเกณฑ์'],['check','ตรวจสอบข้อมูล']]}];
const secOf=v=>SECS.find(s=>s.pages.some(p=>p[0]===v))||SECS[0];
const ICON={home:'<path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/>',cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',truck:'<path d="M2 6h12v10H2zM14 9h4l4 4v3h-8z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',coin:'<circle cx="12" cy="12" r="9"/><path d="M15 8.5H10.5a2 2 0 000 4h3a2 2 0 010 4H9M12 6v12"/>',alert:'<path d="M12 3L2 20h20zM12 10v4M12 17v.5"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',moon:'<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>',share:'<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',dc:'<path d="M3 21V9l9-5 9 5v12M7 21v-7h10v7M7 17h10"/>',snow:'<path d="M12 2v20M4 6l16 12M20 6L4 18M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5"/>',box:'<path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10"/>',bill:'<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6"/>',merge:'<path d="M6 3v6a6 6 0 006 6h0a6 6 0 016 6v0M18 3v6a6 6 0 01-3 5.2"/>',line:'<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',road:'<path d="M8 3L4 21M16 3l4 18M12 5v3M12 11v3M12 17v3"/>',target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',pin:'<path d="M12 22s7-6 7-12a7 7 0 10-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',table:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M9 9v11"/>',analysis:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5M8 12.5l2-2 2 1.5 2.5-3"/>',up:'<path d="M12 19V5M5 12l7-7 7 7"/>',swap:'<path d="M7 4v14M3 8l4-4 4 4M17 20V6M13 16l4 4 4-4"/>',gauge:'<path d="M4 17a8 8 0 1116 0"/><path d="M12 17l4-5"/>',pie:'<path d="M12 3a9 9 0 109 9h-9z"/><path d="M15 3.5A9 9 0 0120.5 9H15z"/>',star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'};
const ic=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]||''}</svg>`;

/* ---------- filters & periods ---------- */
const keepFn=(o={})=>{const g=o.group??S.group,z=o.zone??S.zone,d=o.dc??S.dc,M=MD.M;return k=>!M.hidden(k)&&(g==='all'||M.groupOf(k)===g)&&(!z||M.zoneOf(k)===z)&&(!d||k===d)};
const poolOf=sec=>MD.pools[sec]||MD.cal.dates;
const datesFor=sec=>MD.cal.periodDates(S.mode,S.per,poolOf(sec));
const prevFor=sec=>MD.cal.prevDates(S.mode,S.per,poolOf(sec));
const rangeLabel=()=>S.per?MD.cal.label(S.mode,S.per):'–';
const groupLabel=()=>S.group==='all'?'ทุกกลุ่ม (BKK + UPC)':'กลุ่ม '+S.group;
const scopeLine=()=>[rangeLabel(),groupLabel(),S.dc?MD.M.name(S.dc):S.zone?'Zone '+S.zone:''].filter(Boolean).join(' · ');
/* every data day (Sundays left out of the display) in the month(s) the selected period touches */
function trendDates(sec){const ds=datesFor(sec),ms=new Set(ds.map(d=>d.slice(0,7)));return poolOf(sec).filter(d=>ms.has(d.slice(0,7))&&!isSun(d))}
function hiIdx(ds,sec){const set=new Set(datesFor(sec));return new Set(ds.map((d,i)=>set.has(d)?i:-1).filter(i=>i>=0))}
function setMode(m){if(m===S.mode)return;const ds=MD.cal.periodDates(S.mode,S.per),shown=ds.filter(d=>!isSun(d)),anchor=shown[shown.length-1]||ds[ds.length-1]||MD.cal.shown[MD.cal.shown.length-1];S.mode=m;S.per=m==='day'?anchor:m==='week'?mondayOf(anchor):anchor.slice(0,7)}
const workDays=ds=>ds.filter(d=>!isSun(d)).length;

/* ---------- status colours (thresholds from the settings page) ---------- */
function stOf(kind,v){if(v==null||!Number.isFinite(v))return'';const T=MD.ST;
 if(kind==='sla')return v>=T.sla.good?'g':v>=T.sla.watch?'w':'c';
 if(kind==='eff')return v>=T.eff.good?'g':v>=T.eff.warn?'w':'c';
 if(kind==='effx')return v>=T.effx.good-1e-9?'g':v>=T.effx.warn?'w':'c';
 if(kind==='bad')return v>=T.alert.pct?'c':v>=T.alert.pct/2?'w':'g';
 return''}
const ST_LBL={g:'ดี',w:'เฝ้าระวัง',c:'ควรแก้ไข'};
const badge=(kind,v,txt)=>{const s=stOf(kind,v);return`<span class="bd bd-${s||'n'}" title="${s?ST_LBL[s]:''}">${txt??fmtP(v)}</span>`};
const gradeChip=g=>g?`<span class="gr gr-${g}">${g}</span>`:'';

/* ---------- SVG charts: one code path for the page and the exports ---------- */
function pal(){const s=getComputedStyle(document.documentElement),g=k=>s.getPropertyValue(k).trim();return{ink:g('--ink'),muted:g('--muted'),line:g('--line'),panel:g('--panel'),s:[g('--s1'),g('--s2'),g('--s3'),g('--s4'),g('--s5')],bad:g('--bad'),ab:g('--ab'),cc:g('--cc'),gold:g('--gold-l'),G:{A:g('--gA'),B:g('--gB'),C:g('--gC'),D:g('--gD'),F:g('--gF')}}}
const LIGHT={ink:'#0b1f3f',muted:'#55657f',line:'#dbe3f0',panel:'#ffffff',s:['#1d57b8','#b8860b','#6e93d6','#b8334a','#2f8f8f'],bad:'#b8334a',ab:'#c2410c',cc:'#1d57b8',gold:'#d4af37',G:{A:'#123f8c',B:'#6e93d6',C:'#d4a72c',D:'#d9822b',F:'#b8334a'}};
const FNT='font-family="Prompt,sans-serif"';
function niceMax(v){if(v<=0)return 1;const e=Math.pow(10,Math.floor(Math.log10(v))),n=v/e;return(n<=1?1:n<=2?2:n<=5?5:10)*e}
const ax=v=>Math.abs(v)>=1e6?fmt1(v/1e6)+'M':Math.abs(v)>=10000?fmtN(v/1000)+'K':Math.abs(v)<100&&v%1?v.toFixed(1):fmtN(v);
function yGrid(s,m,W,y,mn,mx,P,fmt){for(let k=0;k<=4;k++){const v=mn+(mx-mn)*k/4;s.push(`<line x1="${m.l}" x2="${W-m.r}" y1="${y(v)}" y2="${y(v)}" stroke="${P.line}"/><text x="${m.l-6}" y="${y(v)+4}" text-anchor="end" font-size="12" fill="${P.muted}">${esc(fmt(v))}</text>`)}}
function lineChart({labels,series,fmt=ax,W=720,H=260,P,acts,tipTitle,tipFmt,refLine,refLabel,hi,min,max}){
 const m={l:52,r:12,t:12,b:30},iw=W-m.l-m.r,ih=H-m.t-m.b,all=series.flatMap(s=>s.vals).filter(Number.isFinite);
 let mn=min!=null?min:0,mx=max!=null?max:niceMax(Math.max(...all,refLine||0,0));if(min==='auto'){const lo=Math.min(...all,refLine??Infinity),hi2=Math.max(...all,refLine??-Infinity);const pad=Math.max(1,(hi2-lo)*.15);mn=Math.max(0,Math.floor(lo-pad));mx=Math.min(max??1e9,Math.ceil(hi2+pad))}
 const y=v=>m.t+ih*(1-(v-mn)/(mx-mn||1)),x=i=>m.l+(labels.length>1?iw*i/(labels.length-1):iw/2),s=[`<svg viewBox="0 0 ${W} ${H}" role="img" ${FNT}>`];
 yGrid(s,m,W,y,mn,mx,P,fmt);
 if(hi&&hi.size&&hi.size<labels.length){const ix=[...hi],a=Math.min(...ix),b=Math.max(...ix),bw=labels.length>1?iw/(labels.length-1):iw;s.push(`<rect x="${x(a)-bw/2}" y="${m.t}" width="${x(b)-x(a)+bw}" height="${ih}" fill="${P.gold}" opacity=".14"/>`)}
 const step=Math.ceil(labels.length/Math.max(3,Math.floor(iw/62)));labels.forEach((l,i)=>{if(i%step===0)s.push(`<text x="${x(i)}" y="${H-10}" text-anchor="middle" font-size="12" fill="${P.muted}">${esc(l)}</text>`)});
 if(refLine!=null){s.push(`<line x1="${m.l}" x2="${W-m.r}" y1="${y(refLine)}" y2="${y(refLine)}" stroke="${P.s[1]}" stroke-dasharray="5 4"/>`);if(refLabel)s.push(`<text x="${W-m.r-4}" y="${y(refLine)-5}" text-anchor="end" font-size="12" fill="${P.s[1]}">${esc(refLabel)}</text>`)}
 series.forEach(se=>{let d='',p=false;se.vals.forEach((v,i)=>{if(!Number.isFinite(v)){p=false;return}d+=(p?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1);p=true});
  if(series.length===1&&mn===0)s.push(`<path d="${d}L${x(labels.length-1)} ${y(mn)}L${x(0)} ${y(mn)}Z" fill="${se.color}" opacity=".1"/>`);
  s.push(`<path d="${d}" fill="none" stroke="${se.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"${se.dash?' stroke-dasharray="5 4"':''}/>`);
  if(labels.length<=40)se.vals.forEach((v,i)=>{if(Number.isFinite(v))s.push(`<circle cx="${x(i)}" cy="${y(v)}" r="${hi&&hi.has(i)&&hi.size<labels.length?4:2.6}" fill="${se.color}" stroke="${P.panel}" stroke-width="1.5"/>`)})});
 const bw=iw/Math.max(1,labels.length-1);labels.forEach((l,i)=>{const tip=(tipTitle?tipTitle(i):l)+'\n'+series.map(se=>se.name+': '+(tipFmt||fmt)(se.vals[i])).join('\n');
  s.push(`<rect x="${x(i)-bw/2}" y="${m.t}" width="${bw}" height="${ih}" fill="transparent" data-tip="${esc(tip)}"${acts&&acts[i]?` data-act="${esc(acts[i])}" style="cursor:pointer"`:''}/>`)});
 return s.join('')+'</svg>'}
function stackBars({labels,series,fmt=ax,W=720,H=260,P,acts,tipTitle,tipFoot,hi,rot}){
 const m={l:52,r:10,t:12,b:rot?58:30},iw=W-m.l-m.r,ih=H-m.t-m.b,n=labels.length,tot=labels.map((_,i)=>series.reduce((a,se)=>a+(se.vals[i]||0),0)),mx=niceMax(Math.max(0,...tot)),y=v=>m.t+ih*(1-v/mx),cw=iw/Math.max(1,n),bw=Math.max(3,Math.min(46,cw*.68)),s=[`<svg viewBox="0 0 ${W} ${H}" role="img" ${FNT}>`];
 yGrid(s,m,W,y,0,mx,P,fmt);const step=rot?1:Math.ceil(n/Math.max(3,Math.floor(iw/58)));
 labels.forEach((l,i)=>{const cx=m.l+cw*i+cw/2,dim=hi&&hi.size&&hi.size<n&&!hi.has(i);let acc=0,g='';series.forEach(se=>{const v=se.vals[i]||0;if(v>0)g+=`<rect x="${cx-bw/2}" y="${y(acc+v)}" width="${bw}" height="${Math.max(0,y(acc)-y(acc+v))}" fill="${se.color}"${dim?' opacity=".42"':''}/>`;acc+=v});
  const tip=(tipTitle?tipTitle(i):l)+'\n'+series.map(se=>se.name+': '+fmtN(se.vals[i])).join('\n')+(tipFoot?'\n'+tipFoot(i):'');
  s.push(`<g data-tip="${esc(tip)}"${acts&&acts[i]?` data-act="${esc(acts[i])}" style="cursor:pointer"`:''}><rect x="${m.l+cw*i}" y="${m.t}" width="${cw}" height="${ih}" fill="transparent"/>${g}</g>`);
  if(rot)s.push(`<text transform="translate(${cx+4} ${H-m.b+12}) rotate(-35)" text-anchor="end" font-size="12" fill="${P.muted}">${esc(l)}</text>`);else if(i%step===0)s.push(`<text x="${cx}" y="${H-10}" text-anchor="middle" font-size="12" fill="${P.muted}">${esc(l)}</text>`)});
 return s.join('')+'</svg>'}
function hbars({items,W=560,P,fmt=fmtN,labelW=130,rh=28,max,valW=96,ref}){const H=items.length*rh+6,mx=max||niceMax(Math.max(1,...items.map(it=>(it.parts||[{v:it.v}]).reduce((a,p)=>a+Math.max(0,p.v||0),0)),ref||0)),ri=W-labelW-valW,sc=v=>Math.max(0,v)/mx*ri,s=[`<svg viewBox="0 0 ${W} ${H}" role="img" ${FNT}>`];
 if(ref!=null)s.push(`<line x1="${labelW+sc(ref)}" x2="${labelW+sc(ref)}" y1="0" y2="${H}" stroke="${P.s[1]}" stroke-dasharray="5 4"/>`);
 items.forEach((it,i)=>{const yy=i*rh+(rh-16)/2,parts=it.parts||[{v:it.v,c:it.c}];let x=labelW,g='';parts.forEach(p=>{const w=Math.max(0,sc(Math.min(p.v||0,mx)));g+=`<rect x="${x}" y="${yy}" width="${w}" height="16" rx="3" fill="${p.c}"/>`;x+=w});const tot=parts.reduce((a,p)=>a+(p.v||0),0);
  s.push(`<g${it.act?` data-act="${esc(it.act)}" style="cursor:pointer"`:''} data-tip="${esc(it.tip||(it.l+': '+fmt(tot)))}"><rect x="0" y="${i*rh}" width="${W}" height="${rh}" fill="transparent"/><text x="${labelW-8}" y="${yy+12.5}" text-anchor="end" font-size="12.5" fill="${P.ink}">${esc(it.l)}</text>${g}<text x="${Math.min(x,labelW+ri)+6}" y="${yy+12.5}" font-size="12.5" fill="${P.ink}">${esc(it.txt??fmt(tot))}</text></g>`)});
 return s.join('')+'</svg>'}
function vbars({labels,vals,colors,ref,refLabel,W=720,H=260,P,tips,acts,fmt=v=>String(v)}){const m={l:44,r:10,t:16,b:66},iw=W-m.l-m.r,ih=H-m.t-m.b,n=labels.length,mx=niceMax(Math.max(0,...vals,ref||0)),y=v=>m.t+ih*(1-v/mx),cw=iw/Math.max(1,n),bw=Math.max(2,cw*.7),s=[`<svg viewBox="0 0 ${W} ${H}" role="img" ${FNT}>`];
 yGrid(s,m,W,y,0,mx,P,fmt);const step=Math.max(1,Math.ceil(n/Math.floor(iw/15)));
 labels.forEach((l,i)=>{const cx=m.l+cw*i+cw/2;s.push(`<g data-tip="${esc(tips?tips[i]:l+': '+vals[i])}"${acts&&acts[i]?` data-act="${esc(acts[i])}" style="cursor:pointer"`:''}><rect x="${m.l+cw*i}" y="${m.t}" width="${cw}" height="${ih}" fill="transparent"/><rect x="${cx-bw/2}" y="${y(vals[i])}" width="${bw}" height="${Math.max(0,y(0)-y(vals[i]))}" rx="2" fill="${colors[i]}"/></g>`);if(i%step===0)s.push(`<text transform="translate(${cx+3} ${H-m.b+10}) rotate(-50)" text-anchor="end" font-size="11" fill="${P.muted}">${esc(l)}</text>`)});
 if(ref!=null)s.push(`<line x1="${m.l}" x2="${W-m.r}" y1="${y(ref)}" y2="${y(ref)}" stroke="${P.s[1]}" stroke-width="1.6" stroke-dasharray="6 4"/><text x="${W-m.r-4}" y="${y(ref)-6}" text-anchor="end" font-size="12" font-weight="600" fill="${P.s[1]}">${esc(refLabel||'')}</text>`);
 return s.join('')+'</svg>'}
function donut({parts,center,sub,W=240,P}){const R=W/2-6,r=R*.64,cx=W/2,cy=W/2,tot=parts.reduce((s,p)=>s+Math.max(0,p.v),0)||1;let a=-Math.PI/2,s=`<svg viewBox="0 0 ${W} ${W}" role="img" ${FNT}>`;
 parts.forEach(p=>{const f=Math.max(0,p.v)/tot;if(!f)return;if(f>.9999){s+=`<circle cx="${cx}" cy="${cy}" r="${(R+r)/2}" fill="none" stroke="${p.c}" stroke-width="${R-r}" data-tip="${esc(p.tip||p.l)}"/>`;return}const a2=a+f*Math.PI*2-.02,l=(a2-a)>Math.PI?1:0,pt=(rr,t)=>`${(cx+rr*Math.cos(t)).toFixed(2)} ${(cy+rr*Math.sin(t)).toFixed(2)}`;
  s+=`<path d="M${pt(R,a)}A${R} ${R} 0 ${l} 1 ${pt(R,a2)}L${pt(r,a2)}A${r} ${r} 0 ${l} 0 ${pt(r,a)}Z" fill="${p.c}" data-tip="${esc(p.tip||(p.l+': '+fmtN(p.v)))}"/>`;a=a2+.02});
 return s+`<text x="${cx}" y="${cy+4}" text-anchor="middle" font-size="${W/9.5}" font-weight="600" fill="${P.ink}">${esc(center)}</text><text x="${cx}" y="${cy+W/9.5}" text-anchor="middle" font-size="${Math.max(12,W/18)}" fill="${P.muted}">${esc(sub)}</text></svg>`}

/* ---------- page parts ---------- */
const CH={};let chId=0;
function chart(fn,ratio=.38,min=200,max=360){const id='c'+(++chId);CH[id]={fn,ratio,min,max};return`<div class="chart" data-ch="${id}"></div>`}
function drawCharts(){const P=pal();document.querySelectorAll('[data-ch]').forEach(el=>{const c=CH[el.dataset.ch];if(!c)return;const W=Math.max(280,Math.round(el.clientWidth||600)),H=Math.round(Math.min(c.max,Math.max(c.min,W*c.ratio)));el.innerHTML=c.fn(W,H,P)})}
/* every card holding charts gets a PPTX button (admin); the chart registry keeps the card title for the slide */
function chartIds(body,t,note){const ids=[...String(body).matchAll(/data-ch="(c\d+)"/g)].map(m=>m[1]).filter(id=>CH[id]&&!CH[id].title);ids.forEach(id=>{CH[id].title=t;CH[id].note=note||''});return ids}
const card=(t,note,body,extra='')=>{const ids=chartIds(body,t,note);return`<section class="card"${extra}>${ids.length&&isAdmin()?`<button class="gx" data-act="gx:${ids.join(',')}" title="ส่งออกกราฟนี้เป็น PowerPoint" aria-label="ส่งออก PPTX: ${esc(t)}">${ic('share')}<span>PPTX</span></button>`:''}<h2>${esc(t)}</h2>${note?`<p class="note">${esc(note)}</p>`:''}${body}</section>`};
const lg=items=>`<div class="legend">${items.map(([c,t])=>`<span><i style="background:${c}"></i>${esc(t)}</span>`).join('')}</div>`;
const dayActs=ds=>ds.map(d=>'day:'+d);
function delta(v,p){if(p==null||!Number.isFinite(v)||!Number.isFinite(p))return null;return{d:v-p,pc:p?((v-p)/p*100):null}}
const arrow=(dl,hi,pp)=>{if(!dl)return'';if(dl.d===0)return'<span class="nt">= เท่าเดิม</span>';const up=dl.d>0,cls=hi==null?'nt':(up===hi?'up':'dn');return`<span class="${cls}">${up?'▲':'▼'} ${pp?fmtP(Math.abs(dl.d))+' จุด':dl.pc==null?fmtN(Math.abs(dl.d)):fmtP(Math.abs(dl.pc),1)}</span>`};
/* KPI tile list: {ic,l,txt,unit,d,chip,v,pv,hi,pp(percentage points),bar(status),g(grade)} */
function kpiHtml(list,q){return`<section class="kpis${list.length===2?' k2':list.length===3?' k3':''}" aria-label="ผลสำคัญ">${list.map(k=>{const dl=delta(k.v,k.pv);return`<div class="kpi"${k.bar?` style="--bar:var(--st-${k.bar})"`:''}${k.act?` data-act="${esc(k.act)}" role="button" tabindex="0"`:''}><span class="kpi-ic">${ic(k.ic)}</span>${k.g?`<span class="g" style="--bar:var(--g${k.g})">${k.g}</span>`:''}<div class="l">${esc(k.l)}</div><div class="v">${esc(k.txt)} <small>${esc(k.unit||'')}</small></div>${k.d?`<div class="d">${esc(k.d)}</div>`:''}${k.html||''}${k.chip?`<div class="chip2">${esc(k.chip)}</div>`:''}<div class="d">${q===false?'':k.pv!=null&&dl?`ก่อนหน้า ${esc(k.pfmt?k.pfmt(k.pv):fmtN(k.pv))} ${arrow(dl,k.hi,k.pp)}`:'<span class="nt">ไม่มีช่วงก่อนหน้าให้เทียบ</span>'}</div></div>`}).join('')}</section>`}
const statsHtml=list=>`<section class="stats" aria-label="สถิติย่อ">${list.map(([l,v,u,extra])=>`<div class="stat"><span>${esc(l)}</span><b>${esc(v)}</b><em>${esc(u||'')}${extra||''}</em></div>`).join('')}</section>`;
function chipsHtml(){const c=[];if(S.group!=='all')c.push(['group','กลุ่ม '+S.group]);if(S.zone)c.push(['zone','Zone '+S.zone]);if(S.dc)c.push(['dc',MD.M.name(S.dc)]);
 [['bt',{AB:'AB (Normal)',CC:'CC (Cold Chain)'}],['vt',null],['rel',{co:'รถบริษัท',pt:'รถร่วม/รถเสริม'}],['tst',{A:'ผิดปกติ',R:'มีความเสี่ยง',N:'ปกติ',X:'รับรถข้ามวัน'}]].forEach(([k,map])=>{if(S[k]&&secUses(k))c.push([k,map?map[S[k]]:'ชนิดรถ '+S[k]])});
 return c.length?`<div class="chips">${c.map(([k,t])=>`<span class="chip on">${esc(t)}<button data-act="clr:${k}" aria-label="ล้างตัวกรอง ${esc(t)}">×</button></span>`).join('')}</div>`:''}
const pageTitle=()=>{const sc=secOf(S.view),p=sc.pages.find(p=>p[0]===S.view);return sc.k==='ov'?p[1]:sc.t+(p[0]===sc.pages[0][0]?'':' — '+p[1])};
const head=(extra='')=>`<div class="page-h"><p class="eyebrow">${esc(scopeLine())}</p><h1>${esc(pageTitle())}</h1></div>${subTabs()}${chipsHtml()}${extra}`;
function subTabs(){const sc=secOf(S.view);if(sc.pages.length<2)return'';return`<nav class="subtabs" aria-label="หน้าย่อย">${sc.pages.map(([k,t])=>`<button data-act="nav:${k}"${S.view===k?' aria-current="page"':''}>${esc(t)}</button>`).join('')}</nav>`}
const emptyCard=(msg)=>card('ไม่มีข้อมูล',msg||'ไม่มีข้อมูลตามตัวกรองที่เลือก ลองล้างตัวกรองหรือเลือกช่วงเวลาอื่น','');
const noData=sec=>`${head()}${card('ยังไม่มีข้อมูลด้านนี้',`ยังไม่มีข้อมูลในระบบสำหรับด้านนี้ ${window.ADMIN?'เติมรายงานได้ที่หน้า ผู้ดูแลระบบ → เติมรายงาน':'รอผู้ดูแลระบบเติมรายงาน'}`,'')}`;
function updLine(rep){const U=(window.DATA.uploads||[]).filter(u=>!rep||rep.includes(u[0]));if(!U.length)return'';const u=U.sort((a,b)=>String(b[5]).localeCompare(String(a[5])))[0];return`<p class="upd">อัปเดตล่าสุด ${esc(u[5])} · ${esc(u[0])} (${esc(u[3])})</p>`}

/* generic sortable table. cols: {k,t,v(row)->sort value,f(row)->html,l(left align)} */
function tableHtml(id,cols,rows,o={}){const st=S.sort[id]||o.sort||{k:cols[1]?cols[1].k:cols[0].k,d:-1},q=(S.q[id]||'').trim().toLowerCase();let R=rows;
 if(q&&o.search)R=R.filter(r=>o.search(r).toLowerCase().includes(q));const c=cols.find(c=>c.k===st.k)||cols[0];
 R=[...R].sort((a,b)=>{const A=c.v(a),B=c.v(b);if(A==null&&B==null)return 0;if(A==null)return 1;if(B==null)return-1;return(typeof A==='string'?A.localeCompare(B,'th',{numeric:true}):A-B)*st.d});
 const body=R.slice(0,o.limit||2000).map(r=>`<tr${o.act?` data-act="${esc(o.act(r))}" tabindex="0"`:''}${o.sel&&o.sel(r)?' class="sel"':''}>${cols.map(c=>`<td${c.l?' style="text-align:left"':''}${c.cls?` class="${c.cls(r)}"`:''}>${c.f?c.f(r):esc(c.v(r))}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${cols.length}" class="empty">ไม่พบรายการ</td></tr>`;
 const foot=o.foot?`<tr class="sum">${o.foot.map((x,i)=>`<td${i===0||cols[i]&&cols[i].l?' style="text-align:left"':''}>${x}</td>`).join('')}</tr>`:'';
 return`${o.search?`<div class="tools"><input type="search" data-q="${id}" placeholder="${esc(o.ph||'ค้นหา…')}" aria-label="${esc(o.ph||'ค้นหา')}" value="${esc(S.q[id]||'')}"></div>`:''}<div class="tw"${o.maxh?` style="max-height:${o.maxh}"`:''}><table class="t"><thead><tr>${cols.map(c=>`<th aria-sort="${st.k===c.k?(st.d>0?'ascending':'descending'):'none'}"><button data-act="sort:${id}:${c.k}">${esc(c.t)}${st.k===c.k?(st.d>0?' ▲':' ▼'):''}</button></th>`).join('')}</tr></thead><tbody>${body}${foot}</tbody></table></div>${R.length>(o.limit||2000)?`<p class="note">แสดง ${o.limit} จาก ${fmtN(R.length)} รายการ · ส่งออก Excel เพื่อดูทั้งหมด</p>`:o.count?`<p class="note" style="text-align:left">${fmtN(R.length)} รายการ</p>`:''}`}
function splitHtml(parts,center,sub,unit='คัน'){const tot=parts.reduce((a,p)=>a+p.v,0)||1;return`<div class="split">${chart((W,H,P)=>donut({parts:parts.map((p,i)=>({...p,c:p.c?P[p.c]:P.s[p.ci??i]})),center,sub,W:Math.min(W,240),P}),1,140,240)}<div class="lgd">${parts.map((p,i)=>`<div><i style="background:${p.c?'var(--'+p.c+')':'var(--s'+((p.ci??i)+1)+')'}"></i>${esc(p.l)} <b>${fmtN(p.v)}</b> <span class="loc">${esc(p.unit||unit)} · ${fmtP(p.v/tot*100,1)}</span></div>`).join('')}${parts.extra||''}</div></div>`}

/* ---------- sheet (pop-up panel) ---------- */
function openSheet(html,wide){closeSheet();const o=document.createElement('div');o.className='ov';o.id='ov';o.innerHTML=`<div class="sheet${wide?' wide':''}" role="dialog" aria-modal="true"><button class="close" data-act="close" aria-label="ปิด">✕</button>${html}</div>`;document.body.appendChild(o);o.addEventListener('click',e=>{if(e.target===o)closeSheet()});drawCharts();o.querySelector('.close').focus()}
function closeSheet(){const o=$('#ov');if(o)o.remove()}

/* ---------- shell ---------- */
const isAdmin=()=>!!window.ADMIN;
const SEC_FILTERS={plan:[],perf:['vt','rel'],sla:['bt'],cost:['scope','flow','vt','rel'],ov:[],adm:[]};
const secUses=k=>(SEC_FILTERS[secOf(S.view).k]||[]).includes(k);
function vtOptions(){const set=new Set();(secOf(S.view).k==='cost'?(window.DATA.cost||[]).map(r=>r[2]):(window.DATA.trips||[]).map(r=>r[6])).forEach(v=>set.add(v));return[...set].sort()}
const VTN={'040':'040 รถปิกอัพ','041':'041 รถ 4 ล้อกลาง','042':'042 รถควบคุมอุณหภูมิ 4W','060':'060 รถ 6 ล้อ','100':'100 รถ 10 ล้อ'};
function navHtml(short){return SECS.filter(s=>!s.admin||isAdmin()).map(s=>{const cur=secOf(S.view).k===s.k;return`<button data-act="nav:${s.pages[0][0]}"${cur?' aria-current="page"':''}>${ic(s.ic)}<span>${esc(short?s.s:s.t)}</span></button>${!short&&cur&&s.pages.length>1?`<div class="rail-sub">${s.pages.map(([k,t])=>`<button data-act="nav:${k}"${S.view===k?' aria-current="true"':''}>${esc(t)}</button>`).join('')}</div>`:''}`}).join('')}
function topHtml(){const sec=secOf(S.view).k,per=MD.cal.periods(S.mode).slice().reverse(),dcs=Object.keys(MD.M.info).filter(keepFn({dc:''})).sort((a,b)=>+a-+b);
 $('#seg-group').innerHTML=[['all','ทั้งหมด'],['BKK','BKK'],['UPC','UPC']].map(([k,t])=>`<button data-act="group:${k}" aria-pressed="${S.group===k}">${t}</button>`).join('');
 $('#seg-mode').innerHTML=[['day','วัน'],['week','สัปดาห์'],['month','เดือน']].map(([k,t])=>`<button data-act="mode:${k}" aria-pressed="${S.mode===k}">${t}</button>`).join('');
 const sel=(id,lbl,opts,val)=>`<select id="${id}" aria-label="${lbl}">${opts.map(([v,t])=>`<option value="${esc(v)}"${String(v)===String(val)?' selected':''}>${esc(t)}</option>`).join('')}</select>`;
 let f=sel('f-per','ช่วงเวลา',per.map(k=>[k,MD.cal.label(S.mode,k)]),S.per)+sel('f-zone','Zone',[['','ทุก Zone'],...MD.M.zones.map(z=>[z,z])],S.zone)+sel('f-dc','DC',[['','ทุก DC'],...dcs.map(d=>[d,MD.M.name(d)])],S.dc);
 const SF=['pg','fg','sg','cg'].includes(S.view)?[]:SEC_FILTERS[sec]||[];
 if(SF.includes('bt'))f+=sel('f-bt','ประเภทบิล',[['','AB + CC'],['AB','AB (Normal)'],['CC','CC (Cold Chain)']],S.bt);
 if(SF.includes('scope'))f+=sel('f-scope','ประเภทบิล',[['all','AB + CC'],['AB','AB'],['CC','CC']],S.scope);
 if(SF.includes('flow'))f+=sel('f-flow','กิจกรรม',[['dist','กระจายสินค้า'],['recv','เข้ารับสินค้า'],['both','กระจาย + เข้ารับ']],S.flow);
 if(SF.includes('vt'))f+=sel('f-vt','ชนิดรถ',[['','ทุกชนิดรถ'],...vtOptions().map(v=>[v,VTN[v]||v])],S.vt);
 if(SF.includes('rel'))f+=sel('f-rel','ประเภทรถ',[['','รถทุกประเภท'],['co','รถบริษัท'],['pt','รถร่วม / รถเสริม']],S.rel);
 if(SF.includes('tst'))f+=sel('f-tst','ประเภทเที่ยว',[['','ทุกประเภทเที่ยว'],['A','ผิดปกติ'],['R','มีความเสี่ยง'],['N','ปกติ'],['X','รับรถข้ามวัน']],S.tst);
 $('#filters').innerHTML=f;
 const dark=document.documentElement.dataset.theme==='dark'||(!document.documentElement.dataset.theme&&matchMedia('(prefers-color-scheme: dark)').matches);
 $('#acts').innerHTML=`<button class="ic" data-act="theme" aria-label="${dark?'โหมดสว่าง':'โหมดมืด'}">${ic(dark?'sun':'moon')}<span>${dark?'สว่าง':'มืด'}</span></button>${isAdmin()?`<button class="ic" data-act="share" aria-label="แชร์และส่งออก">${ic('share')}<span>แชร์</span></button>`:''}`;
 $('#rail-nav').innerHTML=navHtml();$('#tabbar').innerHTML=navHtml(true)}
/* tables fit the screen: short tables show every row (no inner scroll); wide tables step down padding and font until they fit */
function fitTables(){document.querySelectorAll('#content .tw').forEach(t=>{const n=t.querySelectorAll('tbody tr').length;t.classList.toggle('fit',n<=25);t.classList.remove('cmp','cmp2','cmp3');
 for(const c of ['cmp','cmp2','cmp3']){if(t.scrollWidth<=t.clientWidth+1)break;t.classList.add(c)}})}
function render(keepScroll){chId=0;for(const k in CH)delete CH[k];topHtml();const y=window.scrollY,sc=secOf(S.view);let h;
 try{h=sc.data&&!MD.has[sc.data]?noData(sc.data):(VIEW[S.view]||VIEW.ov)()}catch(e){console.error(e);h=head()+card('แสดงผลไม่สำเร็จ',String(e&&e.message||e),'')}
 $('#content').innerHTML=h;drawCharts();fitTables();if(window.afterRender)window.afterRender();if(keepScroll)window.scrollTo(0,y)}
window.render=render;

/* ---------- loading months from the Sheet ---------- */
const LOADED=new Set();
function mergeMonth(j){const D=window.DATA;['bills','od','reasons','trips','cost','plates','tcost'].forEach(k=>{D[k]=(D[k]||[]).concat(j[k]||[])});Object.assign(D.routes=D.routes||{},j.routes||{})}
async function ensureMonths(ms){const need=ms.filter(m=>m&&!LOADED.has(m)&&(window.DATA.months||[]).includes(m));if(!need.length)return false;
 const st=$('#loading');if(st){st.hidden=false;st.textContent='กำลังโหลดข้อมูล '+need.map(m=>monthLabel(m)).join(', ')+'…'}
 for(const m of need){const j=await (await fetch(window.FLEET_API+(window.FLEET_API.includes('?')?'&':'?')+'a=month&m='+m)).json();mergeMonth(j);LOADED.add(m)}
 if(st)st.hidden=true;rebuild();return true}
function rebuild(){MD=makeModel(window.DATA,{hide:HIDE});window.MD=MD}
const prevMonth=m=>{const[y,mm]=m.split('-').map(Number);return mm===1?`${y-1}-12`:`${y}-${String(mm-1).padStart(2,'0')}`};
async function selectPeriod(mode,per){const m=mode==='month'?per:per.slice(0,7);if(await ensureMonths([m,prevMonth(m)]))render(1)}

/* ---------- interaction ---------- */
Object.assign(ACT,{
 nav:v=>{if(secOf(v).admin&&!isAdmin())return;S.view=v;closeSheet();render();window.scrollTo(0,0)},
 group:v=>{S.group=v;if(S.dc&&!keepFn({dc:''})(S.dc))S.dc='';render(1)},
 mode:v=>{setMode(v);render(1)},
 day:v=>{S.mode='day';S.per=v;closeSheet();render(1)},
 zone:v=>{S.zone=S.zone===v?'':v;S.dc='';render(1);if(S.zone){const z=$('#zone-detail');if(z)z.scrollIntoView({behavior:'smooth',block:'start'})}},
 zf:v=>{S.zone=v;S.dc='';render(1)},
 fdc:v=>{S.dc=v;S.zone=MD.M.zoneOf(v);S.group='all';closeSheet();render(1)},
 clr:v=>{if(v==='group')S.group='all';else if(v==='zone'){S.zone='';S.dc=''}else S[v]='';render(1)},
 sort:v=>{const[id,k]=v.split(':'),st=S.sort[id];S.sort[id]=st&&st.k===k?{k,d:-st.d}:{k,d:-1};render(1)},
 set:v=>{const[k,x]=v.split('=');S[k]=x;render(1)},
 close:()=>closeSheet(),
 theme:()=>{const r=document.documentElement,dark=r.dataset.theme==='dark'||(!r.dataset.theme&&matchMedia('(prefers-color-scheme: dark)').matches),t=dark?'light':'dark';r.dataset.theme=t;try{localStorage.setItem('nimex-fleet-theme',t)}catch(x){}render(1)},
 share:()=>{if(window.openExport)window.openExport()}});
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,i=a.indexOf(':'),k=i<0?a:a.slice(0,i),v=i<0?'':a.slice(i+1);if(ACT[k]){ACT[k](v,b,e)}else if(window.doExport&&/^do/.test(k))window.doExport(k)});
document.addEventListener('change',e=>{const t=e.target,id=t.id;
 if(id==='f-per'){S.per=t.value;render(1);selectPeriod(S.mode,S.per);return}
 const map={'f-zone':'zone','f-dc':'dc','f-bt':'bt','f-scope':'scope','f-flow':'flow','f-vt':'vt','f-rel':'rel','f-tst':'tst'};
 if(map[id]){S[map[id]]=t.value;if(id==='f-zone')S.dc='';if(id==='f-dc'&&t.value)S.zone=MD.M.zoneOf(t.value);render(1);return}
 if(t.dataset&&t.dataset.set){S[t.dataset.set]=t.value;render(1)}});
document.addEventListener('input',e=>{const id=e.target.dataset&&e.target.dataset.q;if(id){S.q[id]=e.target.value;const pos=e.target.selectionStart;render(1);const n=document.querySelector(`[data-q="${id}"]`);if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(x){}}}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet();if((e.key==='Enter'||e.key===' ')&&e.target.matches('tr[data-act],.kpi[data-act]')){e.preventDefault();e.target.click()}});
const tip=$('#tip');let tipT=null;
function showTip(el,x,y){tip.textContent=el.dataset.tip;tip.hidden=false;const w=tip.offsetWidth,h=tip.offsetHeight;tip.style.left=Math.max(6,Math.min(innerWidth-w-6,x+12))+'px';tip.style.top=Math.max(6,y-h-12<6?y+16:y-h-12)+'px'}
document.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const el=e.target.closest&&e.target.closest('[data-tip]');if(el)showTip(el,e.clientX,e.clientY);else tip.hidden=true});
document.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;const el=e.target.closest&&e.target.closest('[data-tip]');if(el){showTip(el,e.clientX,e.clientY);clearTimeout(tipT);tipT=setTimeout(()=>tip.hidden=true,2600)}else tip.hidden=true});
window.addEventListener('scroll',()=>{tip.hidden=true},{passive:true});
let rz=null,lastW=innerWidth;window.addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{if(Math.abs(innerWidth-lastW)>20){lastW=innerWidth;drawCharts();fitTables()}},150)});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(!document.documentElement.dataset.theme)render(1)});
function startApp(){(window.DATA.months||[]).forEach(m=>{if((window.DATA.preloaded||[]).includes(m))LOADED.add(m)});rebuild();const ms=MD.cal.months;S.per=ms[ms.length-1]||'';if(!S.per){S.mode='month'}render()}
window.startApp=startApp;
