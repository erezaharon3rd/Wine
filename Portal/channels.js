/* channels.js · Grape Arts: מנוע אחד, שלושה ערוצים
   כרטיס נוסע על כל הזמנה ולקוח · הערוץ החיצוני (מארזים, מהדורות, תעודות)
   מסכים: מנהל (ערוץ חיצוני), גלריה ואמן (מהדורות), יקב (הזמנות על היין שלו).
   נטען אחרי live.js, ops.js ו-tiers.js */
(function(){
'use strict';
if(!window.LX)return;
const {sb,q,run}=window.LX;
const LVL={case:'מארז',collector:'אספנים',patron:'פטרון'};
const ZONE={band:'פס מתחת לציור',neck:'תווית צוואר',back:'תווית אחורית',card:'כרטיס במארז'};
const DST={quote:'הצעת מחיר',approved:'ממתינה לתשלום',print:'בהפקה',done:'מוכנה',cancel:'בוטלה'};
const CH={direct:'חיצוני',winery_customer:'לקוח של יקב',winery:'יקב'};
const ACQ={winery_link:'קישור של יקב',invite:'קישור צוות',direct:'כניסה ישירה',admin:'מנהל'};
const tagOf=o=>{const own=o.owner_winery_id?(S._orgN||{})[o.owner_winery_id]:'';
  const t=o.channel==='direct'?`חיצוני${o.buyer_kind==='business'?' · עסק':o.buyer_kind==='collector'?' · אספן':''}`:o.channel==='winery_customer'?`לקוח של ${own||'יקב'}`:'יקב מזמין';
  return `<span class="tag" style="background:${o.channel==='direct'?'#5A2232':o.channel==='winery_customer'?'#2F5671':'#5F7F4F'};color:#fff">${esc(t)}</span>`};
window.passengerTag=tagOf;
const d2=s=>s?String(s).slice(0,10).split('-').reverse().join('.'):'';
const val=id=>document.getElementById(id)?.value;

/* ── hydrate: the direct channel apart from the winery-customer flow ── */
const _lh=window.liveHydrate;
window.liveHydrate=async()=>{
  if(ME.role==='customer'&&!ME.orgId){location.replace('shop.html#orders');return}
  await _lh();
  const R=ME.role;
  try{
    const [dir,pk,lv,ser,card]=await Promise.all([
      q(sb.from('customer_orders').select('*').eq('channel','direct').order('id',{ascending:false})),
      q(sb.from('packages').select('*').order('sort')),
      q(sb.from('artist_levels').select('*')),
      q(sb.from('series').select('*').order('id',{ascending:false})),
      sb.rpc('my_card')]);
    const ids=new Set(dir.map(o=>o.id));
    S.corders=(S.corders||[]).filter(o=>!ids.has(o.id));
    S.dorders=dir;S.packages=pk;S.levels=lv;S.series=ser;S.card=card.data||null;
    if(['admin','artist','gallery'].includes(R)){
      const ei=await q(sb.from('edition_items').select('*').order('id'));S.items=ei;
      const sv=await q(sb.from('studio_visits').select('*').order('id',{ascending:false}));S.visits=sv;
    }
    if(R==='admin'){
      const [st,oc,cu,orgs,wn]=await Promise.all([
        q(sb.from('settings').select('direct_open,lead_days,order_cutoff,direct_pricing,vat_pct').eq('id',1).single()),
        q(sb.from('order_contacts').select('*')),
        q(sb.from('profiles').select('id,full_name,email,role,org_id,acq_channel,acq_ref,acq_at,buyer_id').eq('role','customer').order('acq_at',{ascending:false}).limit(300)),
        q(sb.from('organizations').select('id,name,kind,partner,kosher,active,slug').order('name')),
        q(sb.from('wines').select('*').order('id'))]);
      S.dset=st;S.contacts={};oc.forEach(c=>S.contacts[c.order_id]=c.cust);S.customers=cu;S.allOrgs=orgs;S.allWines=wn;
    }
    if(R==='gallery'){try{S.collectors=await q(sb.rpc('gallery_collectors'))}catch(e){S.collectors=[]}}
  }catch(e){console.warn('channels',e)}
};

/* ── tabs ── */
const addTab=(r,t)=>{if(TABS[r]&&!TABS[r].find(x=>x[0]===t[0]))TABS[r].splice(Math.max(1,TABS[r].length-1),0,t)};
addTab('admin',['channel','ערוץ חיצוני','box']);
addTab('gallery',['editions','מהדורות','star']);
addTab('artist',['editions','מהדורות','star']);

/* ════════ admin ════════ */
S.chs=S.chs||'orders';
A.chs=v=>{S.chs=v;render()};
V.admin_channel=()=>{
  const secs=[['orders','הזמנות'],['artists','אמנים ומהדורות'],['wines','יקבים ויינות'],['packages','מארזים'],['customers','לקוחות'],['settings','הגדרות']];
  return `<h1>ערוץ חיצוני</h1><p class="lead">הזמנות מהקטלוג הפתוח, מארזים, מהדורות ממוספרות, ושיוך הלקוחות לערוצים. <a href="shop.html" target="_blank" rel="noopener">לפתוח את החנות</a></p>
  <div class="hscroll">${secs.map(([k,t])=>`<button class="chip" data-a="chs" data-v="${k}" aria-pressed="${S.chs===k}">${t}</button>`).join('')}</div>
  ${({orders:aOrders,artists:aArtists,wines:aWines,packages:aPackages,customers:aCustomers,settings:aSettings}[S.chs]||aOrders)()}`;
};
function orderCard(o,role){
  const w=(S.works||[]).find(x=>x.id===+o.design?.work),pk=(S.packages||[]).find(p=>p.id===o.package_id),c=(S.contacts||{})[o.id];
  const items=(S.items||[]).filter(i=>i.order_id===o.id),vat=+(S.dset?.vat_pct||18);
  const act=(a,t,alt)=>`<button class="btn ${alt?'alt':''} sm" data-a="dact" data-v="${o.id}:${a}">${t}</button>`;
  return `<div class="card" style="margin:10px 0;padding:12px 14px;border:1px solid var(--line);background:var(--surface)">
   <div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>#${o.id} · ${esc(w?.t||'')}</b>${tagOf(o)}</div>
   <div class="note">${esc(pk?.name||'')} · ${o.bottles} בקבוקים · ${DST[o.status]||o.status}${o.delivery_date?' · אספקה '+d2(o.delivery_date):''}</div>
   ${o.split?`<div class="note">יין ${nis(o.split.wine_total)} (${esc(o.split.wine_seller_name||'')}) · אמנות ומארז ${nis(o.split.art_total)} · סה״כ כולל מע״מ ${nis(o.total*(1+vat/100))}</div>`:''}
   ${o.design?.zone?`<div class="note">${ZONE[o.design.zone]}: ${esc(o.design.name||'')}${o.design.logo?' + לוגו':''}${o.design.ded?' · '+esc(o.design.ded):''}</div>`:''}
   ${c&&role==='admin'?`<div class="note">${esc(c.n)} · <span class="num">${esc(c.ph)}</span>${c.em?' · '+esc(c.em):''}${c.addr?' · '+esc(c.addr):''}${c.note?'<br>'+esc(c.note):''}</div>`:''}
   ${items.length?`<div class="note">מספרים: ${items.map(i=>`${i.kind==='print'?'הדפס ':''}${i.no}${i.signed_at?'✓':''}`).join(', ')}</div>`:''}
   <div class="row" style="flex-wrap:wrap">
    ${role==='admin'&&o.status==='approved'&&!o.paid_at?act('paid','התשלום התקבל'):''}
    ${role==='admin'&&o.status==='print'?act('done','מוכנה למשלוח'):''}
    ${role==='admin'&&['quote','approved'].includes(o.status)&&!o.paid_at?act('cancel','לבטל',1):''}
    ${(role==='artist'||role==='admin')&&items.some(i=>!i.signed_at)?act('sign','חתמתי על התעודות',1):''}
    ${(role==='gallery'||role==='admin')&&items.some(i=>!i.gallery_stamped_at)?act('stamp','הטבענו חותמת',1):''}
    ${o.design?.logo&&role==='admin'?`<button class="btn alt sm" data-a="dlogo" data-v="${esc(o.design.logo)}">ללוגו</button>`:''}
   </div></div>`}
A.dact=v=>{const [id,a]=v.split(':');if(a==='cancel'&&!confirm('לבטל את ההזמנה?'))return;
  const note=a==='cancel'?prompt('סיבה (תישלח ללקוח)')||'':null;
  run(()=>q(sb.rpc('direct_action',{p_id:+id,p_action:a,p_note:note})),{paid:'סומן ששולם. המספרים הוקצו',done:'סומנה כמוכנה',cancel:'בוטלה',sign:'התעודות סומנו כחתומות',stamp:'החותמת נרשמה'}[a])};
A.dlogo=async p=>{try{const r=await q(sb.storage.from('logos').createSignedUrl(p,600));window.open(r.signedUrl,'_blank','noopener')}catch(e){toast('הלוגו לא נפתח')}};
function aOrders(){const L=S.dorders||[],f=S.dof||'open';
  const open=L.filter(o=>!['done','cancel'].includes(o.status)),sel=f==='open'?open:L;
  const sum=open.filter(o=>o.status!=='quote').reduce((s,o)=>s+(o.bottles||0),0);
  return `<p class="note">${open.length} הזמנות פתוחות · ${sum} בקבוקים שמורים</p>
  <div class="hscroll"><button class="chip" data-a="dof" data-v="open" aria-pressed="${f==='open'}">פתוחות</button><button class="chip" data-a="dof" data-v="all" aria-pressed="${f==='all'}">הכל</button></div>
  ${sel.length?sel.map(o=>orderCard(o,'admin')).join(''):empty('אין הזמנות',`<a href="shop.html" target="_blank" rel="noopener">לחנות</a>`)}`}
A.dof=v=>{S.dof=v;render()};

function lvRow(aid){const L=(S.levels||[]).filter(l=>l.artist_id===aid);
  return ['case','collector','patron'].map(l=>{const x=L.find(y=>y.level===l)||{};const on=x.artist_ok&&x.gallery_ok;
    return `<button class="chip" data-a="lvset" data-v="${aid}:${l}:${on?0:1}" aria-pressed="${on}" title="אמן ${x.artist_ok?'✓':'✗'} · גלריה ${x.gallery_ok?'✓':'✗'}">${LVL[l]}${!on&&(x.artist_ok||x.gallery_ok)?' · ממתין ל'+(x.artist_ok?'גלריה':'אמן'):''}</button>`}).join('')}
A.lvset=v=>{const [aid,l,on]=v.split(':');run(()=>q(sb.rpc('set_artist_level',{p_artist:aid,p_level:l,p_on:on==='1'})),on==='1'?'נשמר':'הוסר')};
function frameRow(w){
  return `<div class="li" style="display:block;padding:10px 0;border-bottom:1px solid var(--line)"><b>${esc(w.t)}</b> <small>${w._fok?'מסגרת מאושרת':'אין מסגרת מאושרת'}</small>
   <div class="hscroll">${Object.entries(ZONE).map(([k,t])=>`<label class="chip" style="display:inline-flex;gap:6px;align-items:center"><input type="checkbox" id="fz-${w.id}-${k}" ${(w._fz||[]).includes(k)?'checked':''}> ${t}</label>`).join('')}</div>
   <button class="btn alt sm" data-a="frame" data-v="${w.id}">לאשר את המסגרת</button>${w._fok?` <button class="link" data-a="frameoff" data-v="${w.id}">לבטל</button>`:''}</div>`}
A.frame=id=>{const z=Object.keys(ZONE).filter(k=>document.getElementById(`fz-${id}-${k}`)?.checked);if(!z.length){toast('צריך לבחור לפחות אזור אחד');return}
  run(()=>q(sb.rpc('set_frame',{p_work:+id,p_zones:z,p_ok:true})),'המסגרת אושרה. לוגו וטקסט רק באזורים האלה')};
A.frameoff=id=>run(()=>q(sb.rpc('set_frame',{p_work:+id,p_zones:['band','neck','back','card'],p_ok:false})),'המסגרת בוטלה');
function seriesList(filter){const L=(S.series||[]).filter(filter);
  return L.length?L.map(s=>{const w=(S.works||[]).find(x=>x.id===s.work_id);const used=s.next_no-1;
    return `<div class="li" style="display:block;padding:8px 0;border-bottom:1px solid var(--line)"><b>${esc(s.name||w?.t||'')}</b> <small>${s.kind==='closed'?`${used} מתוך ${s.size}${s.closed_at?' · נסגרה':''}`:'סדרה פתוחה'} · ${s.levels.map(l=>LVL[l]).join(', ')}${s.print_size?` · ${esc(s.print_technique||'')} ${s.print_next-1}/${s.print_size}`:''}</small></div>`}).join(''):'<p class="note">עוד אין מהדורות.</p>'}
function seriesForm(works){if(!works.length)return '';
  return `<details class="more"><summary>לפתוח מהדורה חדשה</summary>
  <div class="fld"><label for="sw">היצירה</label><select id="sw">${works.map(w=>`<option value="${w.id}">${esc(w.t)}</option>`).join('')}</select></div>
  <div class="fld"><label for="sk">סוג</label><select id="sk"><option value="closed">מהדורה סגורה וממוספרת</option><option value="open">סדרה פתוחה (לאירוח ולמתנות)</option></select></div>
  <div class="fld"><label for="sn">שם (לא חובה)</label><input id="sn" maxlength="60"></div>
  <div class="fld"><label for="ss">כמה בקבוקים במהדורה סגורה</label><input id="ss" type="number" min="1" max="5000" value="300"></div>
  <div class="hscroll">${Object.entries(LVL).map(([k,t])=>`<label class="chip" style="display:inline-flex;gap:6px;align-items:center"><input type="checkbox" id="sl-${k}" ${k==='case'?'checked':''}> ${t}</label>`).join('')}</div>
  <div class="fld"><label for="spt">טכניקת ההדפס לרמת פטרון (בדיוק כמו שיופיע בתעודה)</label><input id="spt" placeholder="הדפס ג'יקלה על נייר כותנה"></div>
  <div class="two"><div class="fld"><label for="sps">כמה הדפסים</label><input id="sps" type="number" min="1" max="500"></div><div class="fld"><label for="spp">מחיר ההדפס, לפני מע״מ</label><input id="spp" type="number" min="0"></div></div>
  <p class="note">מהדורה סגורה: אחרי שהוקצה המספר הראשון הגודל לא משתנה, ומהדורה שנסגרה לא נפתחת שוב.</p>
  <button class="btn sm" data-a="sernew">לפתוח מהדורה</button></details>`}
A.sernew=()=>{const kind=val('sk'),lv=Object.keys(LVL).filter(k=>document.getElementById('sl-'+k)?.checked);
  if(kind==='open'&&lv.some(l=>l!=='case')){toast('אספנים ופטרון רק במהדורה סגורה');return}
  const p={work:+val('sw'),kind,name:val('sn'),size:+val('ss'),levels:lv,print_technique:val('spt'),print_size:val('sps'),print_price:val('spp')};
  if(!confirm(kind==='closed'?`לפתוח מהדורה של ${p.size} בקבוקים? אחרי ההקצאה הראשונה אי אפשר לשנות את הגודל`:'לפתוח סדרה פתוחה?'))return;
  run(()=>q(sb.rpc('series_create',{p})),'המהדורה נפתחה')};
function aArtists(){const AR=Object.values(S._artists||{});
  const W=(S.works||[]).filter(w=>w.st==='live');
  return `<p class="note">אמן מופיע ברמה רק כשגם הוא וגם הגלריה שלו הסכימו. כמנהל, הלחיצה כאן מסמנת את שתי ההסכמות. השתמש בה רק כשקיבלת את ההסכמה בכתב.</p>
  ${AR.map(a=>`<h3>${esc(a.name)}</h3><div class="hscroll">${lvRow(a.id)}</div>
   <details class="more"><summary>מסגרת לוגו לכל ציור</summary>${W.filter(w=>w.artist===a.id).map(frameRow).join('')||'<p class="note">אין יצירות במאגר.</p>'}</details>`).join('')}
  <h3>מהדורות</h3>${seriesList(()=>true)}${seriesForm(W)}`}

function aWines(){const O=(S.allOrgs||[]).filter(o=>o.kind==='winery');
  return `<p class="note">יקב שותף מספק יין לערוץ החיצוני. יין מופיע בחנות רק אם יש לו מחיר ובקבוקים בלי תווית.</p>
  ${O.map(o=>`<h3>${esc(o.name)}</h3>
   <div class="hscroll"><button class="chip" data-a="orgflag" data-v="${o.id}:partner:${o.partner?0:1}" aria-pressed="${o.partner}">יקב שותף</button><button class="chip" data-a="orgflag" data-v="${o.id}:kosher:${o.kosher?0:1}" aria-pressed="${o.kosher}">כשר</button></div>
   ${(S.allWines||[]).filter(w=>w.winery_id===o.id).map(w=>`<div style="border-bottom:1px solid var(--line);padding:8px 0"><b>${esc(w.name)} ${w.vintage||''}</b>
     <div class="two"><div class="fld"><label for="wp-${w.id}">מחיר לבקבוק, לפני מע״מ</label><input id="wp-${w.id}" type="number" min="1" value="${w.direct_price??''}"></div><div class="fld"><label for="wc-${w.id}">מה משלמים ליקב</label><input id="wc-${w.id}" type="number" min="0" value="${w.cost_price??''}"></div></div>
     <div class="two"><div class="fld"><label for="ws-${w.id}">בקבוקים בלי תווית</label><input id="ws-${w.id}" type="number" min="0" value="${w.shiners??0}"></div><div class="fld"><label for="wd-${w.id}">מומלץ לשתות עד (שנה)</label><input id="wd-${w.id}" type="number" min="2020" max="2080" value="${w.drink_by??''}"></div></div>
     <label class="chip" style="display:inline-flex;gap:6px;align-items:center"><input type="checkbox" id="wx-${w.id}" ${w.direct?'checked':''}> בחנות</label> <button class="btn alt sm" data-a="winesave" data-v="${w.id}">לשמור</button></div>`).join('')||'<p class="note">ליקב עוד אין יינות.</p>'}`).join('')||empty('אין יקבים')}`}
A.orgflag=v=>{const [id,k,on]=v.split(':');run(()=>q(sb.from('organizations').update({[k]:on==='1'}).eq('id',id)),'נשמר')};
A.winesave=id=>{const n=k=>{const x=val(k+'-'+id);return x===''||x==null?null:+x};
  run(()=>q(sb.from('wines').update({direct_price:n('wp'),cost_price:n('wc'),shiners:n('ws')||0,drink_by:n('wd'),direct:!!document.getElementById('wx-'+id)?.checked}).eq('id',id)),'היין נשמר')};

function aPackages(){return `<p class="note">המחירים הם של המארז עצמו (קופסה, כרטיס, תעודה), בלי היין ובלי התוספת לאמן, ולפני מע״מ. המחירים ההתחלתיים הם הערכה בלבד ויש לעדכן אותם לפי הצעות הספקים.</p>
  ${(S.packages||[]).map(p=>`<div style="border-bottom:1px solid var(--line);padding:8px 0"><b>${esc(p.name)}</b> <small>${LVL[p.level]} · ${p.bottles} בקבוקים</small>
   <div class="two"><div class="fld"><label for="pp-${p.id}">מחיר המארז</label><input id="pp-${p.id}" type="number" min="0" value="${p.price}"></div><div class="fld"><label for="pb-${p.id}">הקופסה</label><input id="pb-${p.id}" value="${esc(p.box||'')}"></div></div>
   <label class="chip" style="display:inline-flex;gap:6px;align-items:center"><input type="checkbox" id="pa-${p.id}" ${p.active?'checked':''}> פעיל</label> <button class="btn alt sm" data-a="pksave" data-v="${p.id}">לשמור</button></div>`).join('')}`}
A.pksave=id=>run(()=>q(sb.from('packages').update({price:+val('pp-'+id)||0,box:val('pb-'+id),active:!!document.getElementById('pa-'+id)?.checked}).eq('id',id)),'המארז נשמר');

function aCustomers(){const L=S.customers||[],O=(S.allOrgs||[]).filter(o=>o.kind==='winery');
  return `<p class="note">השיוך נקבע בכניסה הראשונה ולא משתנה מעצמו. רק מנהל מעביר לקוח בין יקבים, עם סיבה שנרשמת ביומן.</p>
  ${L.length?L.map(c=>`<div class="li" style="display:block;padding:8px 0;border-bottom:1px solid var(--line)"><b>${esc(c.full_name||c.email)}</b>
   <div class="note">${c.org_id?`לקוח של ${esc((S._orgN||{})[c.org_id]||'יקב')}`:'לקוח חיצוני'} · ${ACQ[c.acq_channel]||'לא ידוע'}${c.acq_ref?' ('+esc(c.acq_ref)+')':''} · ${d2(c.acq_at)}</div>
   <button class="link" data-a="cxfer" data-v="${c.id}">להעביר</button></div>`).join(''):empty('אין לקוחות')}
  <datalist id="wlist">${O.map(o=>`<option value="${esc(o.name)}">`).join('')}</datalist>`}
A.cxfer=id=>{const O=(S.allOrgs||[]).filter(o=>o.kind==='winery');
  sheet(`<h2>להעביר לקוח</h2><div class="fld"><label for="xw">ליקב</label><select id="xw"><option value="">לקוח חיצוני (בלי יקב)</option>${O.map(o=>`<option value="${o.id}">${esc(o.name)}</option>`).join('')}</select></div>
  <div class="fld"><label for="xr">סיבה (נרשמת ביומן)</label><textarea id="xr"></textarea></div>
  <p class="note">ההזמנות הקודמות של הלקוח נשארות עם היקב והמחיר המקוריים.</p>
  <div class="row"><button class="btn alt" data-a="close">ביטול</button><button class="btn" data-a="cxfer2" data-v="${id}">להעביר</button></div>`)};
A.cxfer2=id=>{const w=val('xw')||null,r=val('xr')||'';if(r.trim().length<3){toast('צריך לכתוב סיבה');return}
  closeSheet();run(()=>q(sb.rpc('customer_transfer',{p_user:id,p_winery:w,p_reason:r})),'הלקוח הועבר. ההעברה נרשמה ביומן')};

function aSettings(){const s=S.dset||{},p=s.direct_pricing||{};
  return `<div class="hscroll"><button class="chip" data-a="dopen" data-v="${s.direct_open?0:1}" aria-pressed="${!!s.direct_open}">${s.direct_open?'החנות פתוחה להזמנות':'החנות סגורה להזמנות'}</button></div>
  <div class="two"><div class="fld"><label for="ld">ימים מינימום עד אספקה</label><input id="ld" type="number" min="1" max="120" value="${s.lead_days??21}"></div>
  <div class="fld"><label for="co">סגירת הזמנות לחג</label><input id="co" type="date" value="${s.order_cutoff||''}"></div></div>
  <h3>הנחת כמות על האמנות והמארז</h3>
  <div class="two"><div class="fld"><label for="t1">מכמה בקבוקים</label><input id="t1" type="number" value="${p.t1??24}"></div><div class="fld"><label for="d1">אחוז הנחה</label><input id="d1" type="number" value="${p.d1??5}"></div></div>
  <div class="two"><div class="fld"><label for="t2">מכמה בקבוקים</label><input id="t2" type="number" value="${p.t2??60}"></div><div class="fld"><label for="d2">אחוז הנחה</label><input id="d2" type="number" value="${p.d2??10}"></div></div>
  <p class="note">ההנחה לא חלה על היין: אותו יין עולה אותו מחיר בכל הערוצים.</p>
  <button class="btn" data-a="dsave">לשמור</button>`}
A.dopen=v=>run(()=>q(sb.from('settings').update({direct_open:v==='1'}).eq('id',1)),v==='1'?'החנות פתוחה':'החנות סגורה');
A.dsave=()=>run(()=>q(sb.from('settings').update({lead_days:+val('ld')||21,order_cutoff:val('co')||null,
  direct_pricing:{t1:+val('t1'),d1:+val('d1'),t2:+val('t2'),d2:+val('d2')}}).eq('id',1)),'ההגדרות נשמרו');

/* ════════ gallery and artist ════════ */
function visitsBlock(){const L=S.visits||[];if(!L.length)return '';
  return `<h3>ביקורי סטודיו</h3>${L.map(v=>`<div class="li" style="display:block;padding:8px 0;border-bottom:1px solid var(--line)">
   <b>בקשה #${v.id}</b> <small>${v.status==='requested'?'ממתינה':v.status==='accepted'?'נקבע ל־'+new Date(v.visit_at).toLocaleString('he-IL',{dateStyle:'short',timeStyle:'short'}):'לא אושר'}</small>
   ${v.note?`<div class="note">${esc(v.note)}</div>`:''}
   ${v.status==='requested'?`<div class="row"><input type="datetime-local" id="va-${v.id}" aria-label="מועד הביקור"><button class="btn sm" data-a="visit" data-v="${v.id}:1">לקבוע</button><button class="btn alt sm" data-a="visit" data-v="${v.id}:0">לא הפעם</button></div>`:''}</div>`).join('')}`}
A.visit=v=>{const [id,ok]=v.split(':');const at=val('va-'+id);if(ok==='1'&&!at){toast('צריך לבחור מועד');return}
  run(()=>q(sb.rpc('visit_decide',{p_id:+id,p_ok:ok==='1',p_at:ok==='1'?new Date(at).toISOString():null,p_note:null})),ok==='1'?'הביקור נקבע. הלקוח קיבל הודעה':'נשלחה תשובה')};
V.gallery_editions=()=>{const mine=Object.values(S._artists||{}).filter(a=>a.gallery_id===ME.orgId);const ids=new Set(mine.map(a=>a.id));
  const W=(S.works||[]).filter(w=>ids.has(w.artist)&&w.st==='live');const O=(S.dorders||[]);
  return `<h1>מהדורות ומארזים</h1><p class="lead">באילו רמות כל אמן משתתף, אילו מהדורות פתוחות, ומי האספנים שהסכימו לקבל עדכונים מהגלריה.</p>
  <h3>הסכמת הגלריה לרמות</h3><p class="note">אמן מופיע בחנות ברמה רק כשגם הוא וגם הגלריה הסכימו. אמן בכיר לא חייב להופיע במארזים עסקיים.</p>
  ${mine.map(a=>`<b>${esc(a.name)}</b><div class="hscroll">${lvRow(a.id)}</div>`).join('')||empty('אין אמנים')}
  <h3>מהדורות</h3>${seriesList(s=>W.some(w=>w.id===s.work_id))}${seriesForm(W)}
  <h3>הזמנות עם יצירות של האמנים שלך</h3>${O.length?O.map(o=>orderCard(o,'gallery')).join(''):'<p class="note">עוד אין.</p>'}
  ${visitsBlock()}
  <h3>אספנים שהסכימו</h3>${(S.collectors||[]).length?(S.collectors||[]).map(c=>`<div class="li" style="display:block;padding:6px 0;border-bottom:1px solid var(--line)"><b>${esc(c.name)}</b> <small>${esc(c.artist)} · ${d2(c.ordered)}</small><div class="note"><span class="num">${esc(c.phone)}</span>${c.email?' · '+esc(c.email):''}</div></div>`).join(''):'<p class="note">עוד אין.</p>'}`};
V.artist_editions=()=>{const a=ME.artist;if(!a)return empty('אין פרופיל אמן');
  const W=(S.works||[]).filter(w=>w.artist===a.id&&w.st==='live');const O=(S.dorders||[]);
  return `<h1>מהדורות ומארזים</h1><p class="lead">בוחרים באילו רמות להשתתף, ומאשרים לכל ציור איפה מותר לשים שם או לוגו. אף פעם לא על הציור עצמו.</p>
  <h3>הרמות שלי</h3><div class="hscroll">${lvRow(a.id)}</div><p class="note">הגלריה שלך צריכה להסכים גם היא.</p>
  <h3>מסגרת לוגו לכל ציור</h3>${W.map(frameRow).join('')||'<p class="note">אין יצירות במאגר.</p>'}
  <h3>מהדורות</h3>${seriesList(s=>W.some(w=>w.id===s.work_id))}
  <h3>הזמנות</h3>${O.length?O.map(o=>orderCard(o,'artist')).join(''):'<p class="note">עוד אין.</p>'}
  ${visitsBlock()}`};

/* works carry their frame (loaded with the works) */
const _lh2=window.liveHydrate;
window.liveHydrate=async()=>{await _lh2();try{const ws=await q(sb.from('works').select('id,frame_zones,frame_ok'));const m={};ws.forEach(w=>m[w.id]=w);(S.works||[]).forEach(w=>{const x=m[w.id];if(x){w._fz=x.frame_zones;w._fok=x.frame_ok}})}catch(e){}};

/* ════════ winery: outside orders on its wine, read only ════════ */
const _wc=V.winery_clients;
if(_wc)V.winery_clients=()=>{const L=(S.dorders||[]).filter(o=>o.winery_id===ME.orgId&&o.status!=='cancel');
  return _wc()+(L.length?`<h3>הזמנות מהחנות על היין שלך</h3><p class="note">הלקוחות האלה הגיעו דרך Grape Arts. היין שלך נמכר על ידך, ופרטי הקשר נשארים אצל המערכת.</p>${L.map(o=>`<div class="li" style="display:block;padding:8px 0;border-bottom:1px solid var(--line)"><b>#${o.id}</b> ${tagOf(o)}<div class="note">${o.bottles} בקבוקים · ${DST[o.status]||o.status}${o.delivery_date?' · אספקה '+d2(o.delivery_date):''}${o.split?' · היין: '+nis(o.split.wine_total):''}</div></div>`).join('')}`:'')};


/* the session may have loaded before this file: hydrate again once */
(function wait(n){try{if(window.ME&&ME.role&&S.role===ME.role){if(S.dorders===undefined)window.liveHydrate().then(()=>render());return}}catch(e){}
  if(n<100)setTimeout(()=>wait(n+1),100)})(0);
})();
