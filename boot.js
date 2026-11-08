/* NIMEX Pickup Vehicle Dashboard — loads data from the Google Sheet API, then starts the dashboard.
   Admin: open the page with #admin, the key is checked by Apps Script only (never stored in this repo). */
(function(){
var KEY_NAME = 'pickup-key';
var ALLOWED_DC = ['610','621','691'];
var COLS = ['b','c','e','g','h','t','k','l','n','o','p','q','r','s','u','v','x','y','aa','ab','ac','ad','ae','af','ag','ah','ai','aj'];
function getKey(){ try{ return sessionStorage.getItem(KEY_NAME); }catch(e){ return null; } }
function setKey(v){ try{ v ? sessionStorage.setItem(KEY_NAME, v) : sessionStorage.removeItem(KEY_NAME); }catch(e){} }
function esc(s){ return String(s === null || s === undefined ? '' : s).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); }

async function api(body){
  var r = await fetch(window.PICKUP_API, { method:'POST', headers:{ 'Content-Type':'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({}, body, { key: getKey() })) });
  var j = await r.json();
  if(!j.ok) throw new Error(j.error || 'failed');
  return j;
}
window.__pickupApi = api;

var boot = document.getElementById('boot');
function bootMsg(h){ boot.innerHTML = '<div class="boot-card">' + h + '</div>'; boot.hidden = false; }
function toast(m){ var t = document.getElementById('toast'); if(!t) return; t.textContent = m; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(function(){ t.classList.remove('show'); }, 2800); }

// ---------- report parser (same column rules as the dashboard's own upload) ----------
var MAP = {'เลขที่จัดรถ':'b','เวลาจัดรถ':'c','เลขที่ใบรายการกระจาย+เข้ารับ / ใบรายการเข้ารับอย่างเดียว':'e','DC ต้นทาง':'g','ลูกค้า/บริษัท':'h','รหัสลูกค้า':'t','ทะเบียนรถ':'k','เวลาถึงจุดที่เข้ารับ':'n','เวลาที่เริ่มสแกนรับชิ้นแรก':'o','เวลาออกจากจุดที่เข้ารับ':'p','เวลาถึงดีซี':'q','เวลาที่เริ่มลงสินค้า (สแกนรับชิ้นแรก)':'r','เวลาที่ลงสินค้าเสร็จ':'s','เส้นทาง':'u','ราคาขนส่งทั้งหมด':'v','ประภทลูกค้า':'y','รายได้ค่าขนส่งแห้ง':'aa','รายได้ค่าขนส่งเย็น':'af'};
function dayOf(c){ var m = String(c || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); if(!m) return ''; var y = +m[3]; if(y > 2400) y -= 543; return y + '-' + String(m[2]).padStart(2,'0') + '-' + String(m[1]).padStart(2,'0'); }
function rowsFromAoA(A){
  var hi = -1; for(var i = 0; i < Math.min(A.length, 15); i++){ if(A[i].indexOf('เลขที่จัดรถ') !== -1){ hi = i; break; } }
  if(hi === -1) throw new Error('ไม่พบหัวตาราง "เลขที่จัดรถ" ในไฟล์นี้');
  var H = A[hi], idx = {};
  H.forEach(function(n, i){ var k = MAP[n]; if(k && !(k in idx)) idx[k] = i; });
  var vt = []; H.forEach(function(n, i){ if(n === 'ประเภทรถ') vt.push(i); }); if(vt[0] !== undefined) idx.l = vt[0]; if(vt[1] !== undefined) idx.x = vt[1];
  var bs = [], is = [], bd = [], id = [];
  H.forEach(function(n, i){ n = String(n).replace(/\s+/g,' ').trim(); if(n.indexOf('จำนวนบิล พขร') === 0) bs.push(i); else if(n.indexOf('จำนวนชิ้น พขร') === 0) is.push(i); else if(n.indexOf('จำนวนบิล DC') === 0) bd.push(i); else if(n.indexOf('จำนวนชิ้น DC') === 0) id.push(i); });
  [['ab',bs,0],['ac',is,0],['ad',bd,0],['ae',id,0],['ag',bs,1],['ah',is,1],['ai',bd,1],['aj',id,1]].forEach(function(x){ if(x[1][x[2]] !== undefined) idx[x[0]] = x[1][x[2]]; });
  var need = ['b','c','g','h','k','n','q','u','v'].filter(function(k){ return idx[k] === undefined; });
  if(need.length) throw new Error('ไฟล์นี้ขาดคอลัมน์ที่จำเป็น: ' + need.join(', '));
  var out = [];
  for(var r = hi + 1; r < A.length; r++){
    var row = A[r]; if(!row[idx.b]) continue;
    var dc = (String(row[idx.g] || '').trim().match(/^(\d+)/) || [])[1];
    if(ALLOWED_DC.indexOf(dc) === -1) continue;               // dashboard scope: BKK 3 DC
    var rec = {}; COLS.forEach(function(k){ rec[k] = idx[k] !== undefined && row[idx[k]] !== undefined ? String(row[idx[k]]) : ''; });
    out.push(rec);
  }
  return out;
}
async function parseFile(file){
  if(/\.json$/i.test(file.name)){
    var J = JSON.parse(await file.text()), cols = J.cols || COLS, out = [];
    (J.rows || []).forEach(function(a){
      var o = {}; cols.forEach(function(k, i){ o[k] = a[i] === undefined || a[i] === null ? '' : String(a[i]); });
      var dc = (String(o.g || '').trim().match(/^(\d+)/) || [])[1];
      if(o.b && ALLOWED_DC.indexOf(dc) !== -1){ var rec = {}; COLS.forEach(function(k){ rec[k] = o[k] || ''; }); out.push(rec); }
    });
    if(!out.length) throw new Error('ไฟล์ JSON นี้ไม่มีข้อมูลที่ใช้ได้');
    return out;
  }
  var wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type:'array' });
  return rowsFromAoA(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header:1, raw:false, defval:'' }));
}
function thDay(k){ var T = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']; var p = k.split('-'); return (+p[2]) + ' ' + T[+p[1]] + ' ' + (+p[0] + 543); }

// ---------- upload preview + chunked save ----------
function existingDays(){ var s = {}; ((window.__PICKUP_DATA || {}).rows || []).forEach(function(r){ s[dayOf(r.c)] = 1; }); return s; }
function planHtml(rows, names){
  var days = {}; rows.forEach(function(r){ var d = dayOf(r.c); if(d) days[d] = (days[d] || 0) + 1; });
  var keys = Object.keys(days).sort(), have = existingDays(), rep = keys.filter(function(k){ return have[k]; });
  var dcs = {}; rows.forEach(function(r){ var c = (String(r.g).match(/^(\d+)/) || [])[1]; dcs[c] = (dcs[c] || 0) + 1; });
  return { keys: keys, html:
    '<p><b>' + esc(names.join(', ')) + '</b></p>' +
    '<div class="plan-grid"><div><span>แถวที่จะบันทึก</span><b>' + rows.length.toLocaleString('th-TH') + '</b></div>' +
    '<div><span>ช่วงวันที่</span><b>' + (keys.length ? thDay(keys[0]) + ' – ' + thDay(keys[keys.length - 1]) : '-') + '</b></div>' +
    '<div><span>จำนวนวัน</span><b>' + keys.length + ' วัน</b></div>' +
    '<div><span>DC</span><b>' + Object.keys(dcs).sort().map(function(c){ return c + ' (' + dcs[c].toLocaleString('th-TH') + ')'; }).join(' · ') + '</b></div></div>' +
    '<p class="note-l">' + (rep.length ? '⚠️ มีข้อมูลเดิม ' + rep.length + ' วัน (' + thDay(rep[0]) + (rep.length > 1 ? ' – ' + thDay(rep[rep.length - 1]) : '') + ') จะถูกลบแล้วแทนที่ด้วยค่าใหม่' : '✅ วันที่ใหม่ทั้งหมด จะเพิ่มเข้าระบบ') + ' · เก็บเฉพาะ DC 610, 621, 691</p>' };
}
async function saveRows(rows, names, say){
  var P = planHtml(rows, names), CH = 1500;
  say('กำลังลบข้อมูลวันที่ซ้ำ…');
  await api({ a:'begin', days: P.keys });
  for(var i = 0; i < rows.length; i += CH){
    say('กำลังบันทึก ' + Math.min(i + CH, rows.length).toLocaleString('th-TH') + ' / ' + rows.length.toLocaleString('th-TH') + ' แถว…');
    await api({ a:'append', rows: rows.slice(i, i + CH).map(function(r){ return [dayOf(r.c)].concat(COLS.map(function(k){ return r[k] || ''; })); }) });
  }
  say('กำลังสรุปและเตรียมข้อมูลใหม่…');
  await api({ a:'finish', file: names.join(', '), count: rows.length, days: P.keys });
}
function openPlan(rows, names, firstRun){
  var P = planHtml(rows, names), ov = document.getElementById('uploadModal');
  ov.querySelector('.plan').innerHTML = P.html;
  var msg = ov.querySelector('.msg'), go = ov.querySelector('[data-up="go"]');
  msg.textContent = ''; go.disabled = !rows.length;
  go.onclick = async function(){
    go.disabled = true; ov.querySelector('[data-up="cancel"]').disabled = true;
    try{ await saveRows(rows, names, function(m){ msg.textContent = m; }); msg.textContent = 'บันทึกแล้ว กำลังโหลดข้อมูลใหม่…'; setTimeout(function(){ location.reload(); }, 600); }
    catch(e){ msg.textContent = 'บันทึกไม่สำเร็จ: ' + (e.message === 'denied' ? 'รหัสผู้ดูแลไม่ถูกต้องหรือหมดอายุ' : e.message === 'busy' ? 'ระบบกำลังบันทึกงานอื่น ลองใหม่อีกครั้ง' : e.message); go.disabled = false; ov.querySelector('[data-up="cancel"]').disabled = false; }
  };
  ov.querySelector('[data-up="cancel"]').onclick = function(){ ov.classList.remove('open'); if(firstRun) location.reload(); };
  ov.classList.add('open');
}
async function pickAndPlan(files, firstRun){
  var all = [], names = [];
  for(var i = 0; i < files.length; i++){
    try{ all = all.concat(await parseFile(files[i])); names.push(files[i].name); }
    catch(e){ toast(files[i].name + ': ' + e.message); }
  }
  if(names.length) openPlan(all, names, firstRun);
}
// called by the dashboard's "อัปโหลดไฟล์ใหม่" (admin only)
window.__pickupUploadFiles = function(files){ pickAndPlan(Array.from(files)); };

// shared settings (admin saves, everyone reads)
window.__pickupSaveSettings = async function(patch){
  var D = window.__PICKUP_DATA; D.settings = Object.assign({}, D.settings || {}, patch);
  if(!window.__PICKUP_ADMIN) return;
  try{ await api({ a:'settings', settings: patch }); toast('บันทึกการตั้งค่าลงระบบแล้ว ผู้ชมทุกคนเห็นค่าเดียวกัน'); }
  catch(e){ toast('บันทึกการตั้งค่าไม่สำเร็จ: ' + e.message); }
};

function askKey(err){
  bootMsg('<img src="logo.png" alt="NIM Express" class="boot-logo"><h1>ผู้ดูแลระบบ</h1>' + (err ? '<p class="badt">' + esc(err) + '</p>' : '') +
    '<label for="adm-key">รหัสผู้ดูแล</label><input id="adm-key" type="password" autocomplete="current-password">' +
    '<button class="btn-primary" id="adm-go" type="button">เข้าสู่ระบบ</button><a href="./" class="boot-link" id="adm-view">เปิดแบบผู้ชมทั่วไป</a>');
  var inp = document.getElementById('adm-key'), go = document.getElementById('adm-go');
  inp.focus();
  var submit = async function(){
    setKey(inp.value); go.disabled = true; go.textContent = 'กำลังตรวจสอบ…';
    try{ await api({ a:'auth' }); start(); }
    catch(e){ setKey(null); askKey('รหัสไม่ถูกต้อง'); }
  };
  go.onclick = submit; inp.onkeydown = function(e){ if(e.key === 'Enter') submit(); };
  document.getElementById('adm-view').onclick = function(e){ e.preventDefault(); history.replaceState(null, '', location.pathname); start(); };
}

function loadScript(src){ return new Promise(function(res, rej){ var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.body.appendChild(s); }); }

// exported images need the logo inline (an SVG drawn as an image cannot load files)
fetch('logo.png').then(function(r){ return r.blob(); }).then(function(b){ var f = new FileReader(); f.onload = function(){ window.__LOGO_DATA = f.result; }; f.readAsDataURL(b); }).catch(function(){});

async function start(){
  var wantAdmin = location.hash === '#admin', key = getKey();
  if(!window.PICKUP_API){ bootMsg('<h1>ยังไม่ได้ตั้งค่า</h1><p>ยังไม่ได้ใส่ที่อยู่ระบบข้อมูลใน config.js</p>'); return; }
  if(wantAdmin && !key){ askKey(); return; }
  var D;
  try{ bootMsg('<img src="logo.png" alt="NIM Express" class="boot-logo"><p>กำลังโหลดข้อมูล…</p>'); D = await (await fetch(window.PICKUP_API)).json(); }
  catch(e){ bootMsg('<h1>โหลดข้อมูลไม่สำเร็จ</h1><p>ลองเปิดหน้านี้ใหม่อีกครั้ง</p>'); return; }
  var cols = D.cols || COLS;
  D.rows = (D.rows || []).map(function(a){ var o = {}; cols.forEach(function(k, i){ o[k] = a[i] === undefined ? '' : String(a[i]); }); return o; });
  D.settings = D.settings || {};
  window.__PICKUP_DATA = D;
  window.__PICKUP_ADMIN = false;
  if(key){
    try{ await api({ a:'auth' }); window.__PICKUP_ADMIN = true; }
    catch(e){ setKey(null); if(wantAdmin){ askKey('รหัสไม่ถูกต้องหรือหมดอายุ'); return; } }
  }
  if(!D.rows.length){
    if(window.__PICKUP_ADMIN){
      bootMsg('<img src="logo.png" alt="NIM Express" class="boot-logo"><h1>ตั้งค่าครั้งแรก</h1><p>เลือกไฟล์ seed.json หรือไฟล์รายงาน NIMEX016267 (.xlsx) เลือกได้หลายไฟล์พร้อมกัน ระบบจะแสดงสรุปให้ตรวจก่อนบันทึก</p>' +
        '<input type="file" id="seed-f" accept=".xlsx,.xls,.json" multiple aria-label="ไฟล์รายงานหรือ seed.json"><p class="msg" id="seed-m"></p>');
      document.getElementById('seed-f').onchange = function(e){ document.getElementById('seed-m').textContent = 'กำลังอ่านไฟล์…'; pickAndPlan(Array.from(e.target.files), true); };
    } else bootMsg('<img src="logo.png" alt="NIM Express" class="boot-logo"><h1>ยังไม่มีข้อมูล</h1><p>ผู้ดูแลยังไม่ได้นำเข้าข้อมูล</p>');
    return;
  }
  boot.hidden = true;
  document.getElementById('appRoot').hidden = false;
  try{ await loadScript('app.js?v=' + (window.PICKUP_V || 1)); }
  catch(e){ bootMsg('<h1>โหลดหน้าเว็บไม่สำเร็จ</h1><p>ลองเปิดหน้านี้ใหม่อีกครั้ง</p>'); }
}
window.addEventListener('hashchange', function(){ if(location.hash === '#admin' && !window.__PICKUP_ADMIN) location.reload(); });
start();
})();
