/* סדנת התווית · מסלול לקוח → יקב
   הלקוח בוחר אמן, יצירה ועיצוב, והמחיר מתעדכן בכל בחירה.
   היקב מקבל הזמנה מוכנה, יכול לערוך, ושולח ללקוח השוואה עם רשימת שינויים. */
'use strict';
window.VX=window.VX||{};
(function(){
const VX=window.VX;
document.head.insertAdjacentHTML('beforeend',`<style>
.face{width:132px;height:132px;border-radius:50%;background:#8E8C85 center/cover;display:grid;place-items:center;margin:8px auto 10px;font-family:var(--display);font-size:40px;color:#fff;border:1px solid var(--line)}
.face.sm{width:64px;height:64px;font-size:22px;margin:0}
.acard{display:flex;gap:14px;align-items:center;width:100%;text-align:start;background:var(--surface);border:1px solid var(--line);padding:12px;cursor:pointer;margin-top:10px}
.acard[disabled]{opacity:.55;cursor:default}
.acard .mt b{display:block;font-weight:500;font-size:17px}
.acard .mt small{display:block;color:var(--muted);font-size:13.5px}
.chip .dl{display:block;font-family:var(--mono);font-size:11.5px;color:var(--muted);direction:ltr}
.chip[aria-pressed="true"] .dl{color:inherit;opacity:.8}
.steps{display:flex;gap:4px;margin:6px 0 2px}.steps button{flex:1;border:0;background:none;border-top:3px solid var(--line);padding:6px 0 0;font-size:12px;color:var(--muted);cursor:pointer}
.steps button[aria-current="step"]{border-color:var(--ink);color:var(--ink);font-weight:600}.steps button.done{border-color:#8a8a88}
.cmp{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.cmp>div{background:linear-gradient(#EFEFED,#E4E4E2);border:1px solid var(--line);padding:10px 0 6px;text-align:center;font-size:13px}
.cmp svg{height:190px;width:auto;display:block;margin:0 auto 4px}.cmp b{font-weight:600}
.chg{margin:8px 0 0;padding:0;list-style:none}.chg li{padding:8px 0;border-bottom:1px solid var(--line);font-size:14.5px}.chg li small{display:block;color:var(--muted)}
.pbar .t b .num{font-size:15px}.pbar .t .dlt{display:inline-block;margin-inline-start:6px;font-family:var(--mono);font-size:12.5px;color:var(--ink);background:#EDEDEB;padding:0 6px;border-radius:999px;direction:ltr}
.fld .cnt{float:left;font-size:12px;color:var(--muted)}
</style>`);

/* ── demo data ── */
const D0={
  corders:[{id:5001,at:'2026-11-17',cust:{n:'דנה לוי',ph:'050-7654321',em:'dana@example.com',note:'מתנה ליום הולדת 40 של אחי'},d:{artist:'erez',work:3,wine:1,shape:'arch',pos:50,zoom:100,name:'אדום הגבעה',ded:'לאבי, באהבה · 40',foil:true,emboss:false,qty:6},wv:null,st:'sent',log:[]}],
  wset:{prices:{1:118,2:96,3:92},caseDisc:5,t1:24,d1:10,t2:60,d2:15,foil:6,emboss:4,shape:{rect:0,oval:2,arch:3},artist:{erez:14},min:1,link:'yekev-hagiva'},
  face:null,stories:{}
};
Object.entries(D0).forEach(([k,v])=>{if(S[k]===undefined)S[k]=JSON.parse(JSON.stringify(v))});
PERSIST.push('corders','wset','face','stories','cd','_wo','country');
if(!window.LIVE)try{const o=JSON.parse(localStorage.getItem(KEY)||'null');if(o)['corders','wset','face','stories','cd','_wo','country'].forEach(k=>{if(o[k]!==undefined)S[k]=o[k]})}catch(e){}
if(window.LIVE){S.corders=[];}

const ARTISTS=()=>window.LIVE?Object.values(S._artists||{}).map(a=>({id:a.id,n:a.name,country:a.country||'',style:a.style||autoStyle(S.works.filter(w=>w.artist===a.id)),gal:(S._orgN||{})[a.gallery_id]||'',bio:a.bio||'',works:S.works.filter(w=>w.artist===a.id&&w.st==='live'&&w.av),face:(S._faces||{})[a.id]||null})):[
  {id:'erez',n:'ארז אהרון',country:S.country||'ישראל',style:'ציור שמן ריאליסטי',gal:'גלריה לדוגמה',bio:S.bio||'ציור שמן ריאליסטי, טבע דומם ונוף מקומי.',works:S.works.filter(w=>w.st==='live'&&w.av),face:S.face},
  {id:'soon1',n:'אמנית בצבעי מים',country:'',style:'בוטני, צבעי מים',soon:true},
  {id:'soon2',n:'צלם אמנותי',country:'',style:'צילום נוף',soon:true}
];
/* an artist's style line, derived from their works instead of asking for it */
function autoStyle(ws){const top=k=>{const c={};ws.forEach(w=>{if(w[k])c[w[k]]=(c[w[k]]||0)+1});return Object.entries(c).sort((a,b)=>b[1]-a[1]).map(x=>x[0])};const t=top('tech')[0],g=top('tag').slice(0,2);return [t,g.join(' ו')].filter(Boolean).join(' · ')||'אמן'}
const artistOf=id=>ARTISTS().find(a=>a.id===id);
const myArtistId=()=>window.LIVE?(window.ME?.artist?.id||Object.keys(S._artists||{})[0]):'erez';
window.artistName=id=>artistOf(id)?.n||'';
/* which artists the current user may upload works for */
window.uploadArtists=()=>{if(!window.LIVE)return [{id:'erez',n:'ארז אהרון'}];const L=Object.values(S._artists||{}).map(a=>({id:a.id,n:a.name,g:a.gallery_id,u:a.user_id}));
  if(S.role==='artist')return L.filter(a=>a.u===ME.id);if(ME.role==='gallery')return L.filter(a=>a.g===ME.orgId);return L};
const initials=n=>n.split(' ').map(x=>x[0]).join('').slice(0,2);
const faceEl=(a,sm)=>`<span class="face ${sm?'sm':''}" ${a.face?`style="background-image:url(${a.face})"`:''} role="img" aria-label="${a.face?'צילום של '+esc(a.n):'מקום לצילום פנים של '+esc(a.n)}">${a.face?'':initials(a.n)}</span>`;

/* ── price ── */
const W=()=>S.wset;
const addonFor=aid=>{const v=(W().artist||{})[aid];return (v===undefined||v===null||v==='')?(window.tierAddon?tierAddon(aid):0):+v};
window.addonFor=addonFor;
function cprice(d){
  const w=W(),base=w.prices[d.wine]||100,art=addonFor(d.artist),shp=w.shape[d.shape]||0,foil=d.foil?w.foil:0,emb=d.emboss?w.emboss:0;
  const unit=base+art+shp+foil+emb, q=Math.max(1,d.qty|0);
  const disc=q>=w.t2?w.d2:q>=w.t1?w.d1:q>=6?w.caseDisc:0;
  const unitNet=Math.round(unit*(1-disc/100));
  return {base,art,shp,foil,emb,unit,disc,unitNet,q,total:unitNet*q};
}
window.cprice=cprice;
const dl=n=>n===0?'ללא תוספת':`${n>0?'+':'−'}${nis(Math.abs(n))}`;
function delta(field,val){const d=S.cd;const a=cprice(d).total,b=cprice({...d,[field]:val}).total;return b-a}
function priceBar(btn){const p=cprice(S.cd);const ch=S._lastDelta;
  return `<div class="actbar pbar"><div class="t"><b><span class="num">${nis(p.total)}</span>${ch?`<span class="dlt">${ch>0?'+':'−'}${nis(Math.abs(ch))}</span>`:''}</b><span>${p.q} בקבוקים · <span class="num">${nis(p.unitNet)}</span> לבקבוק${p.disc?` · הנחת כמות ${p.disc}%`:''} · כולל מע״מ</span></div>${btn}</div>`}
function syncW(){if(S.role==='winery'&&S._wo){const o=S.corders.find(x=>x.id===S._wo);if(o&&o.st==='sent'){o.wv=S.cd;if(window.onWv)onWv(o)}}}
function setD(k,v){const before=cprice(S.cd).total;S.cd[k]=v;if(k!=='qty')S.cd.render=null;S._lastDelta=cprice(S.cd).total-before;syncW()}

/* ── recommendation for a work ── */
function recommend(wid){
  const w=work(wid);const tone=w?.tone||'';
  const type=/כחול|אפור/.test(tone)?'white':/בז׳|ורוד/.test(tone)?'rose':'red';
  const wi=S.wines.find(x=>x.type===type)||S.wines[0];if(!wi){toast('ליקב עוד אין יינות פתוחים לעיצוב');return null}
  return {artist:w?.artist||'erez',work:wid,wine:wi.id,shape:w&&/נוף/.test(w.tag)?'rect':'arch',pos:50,zoom:100,name:wi.n,ded:'',foil:false,emboss:false,qty:6};
}
const cbottle=(d,o={})=>{const wi=wine(d.wine)||{type:'red',n:'',y:''};const ru=d.render&&(S._rurl||{})[d.render];if(ru&&!o.label)return `<img src="${ru}" alt="צילום הבקבוק" style="max-width:100%;max-height:250px;width:auto;display:block;margin:0 auto">`;return bottle(wi.type,d.work,{wm:true,pos:d.pos,zoom:d.zoom,shape:d.shape,name:d.name||wi.n,year:wi.y,ded:d.ded,foil:d.foil,emboss:d.emboss,artist:artistOf(d.artist)?.n,...o})};

/* ── diff between the customer's design and the winery's ── */
const SH={rect:'מלבן',oval:'אובל',arch:'קשת'};
function diffs(a,b){const out=[];const f=(k,l,fmt=x=>x)=>{if(String(a[k]??'')!==String(b[k]??''))out.push({l,from:fmt(a[k]),to:fmt(b[k])})};
  f('wine','יין',x=>{const w=wine(x);return w?`${w.n} ${w.y}`:'—'});f('work','יצירה',x=>work(x)?.t||'—');f('shape','צורת התווית',x=>SH[x]);
  f('pos','מיקום הציור',x=>x+'%');f('zoom','הגדלה',x=>x+'%');f('name','השם על התווית',x=>x||'—');f('ded','הקדשה',x=>x||'ללא');
  f('foil','הדפסת זהב',x=>x?'כן':'לא');f('emboss','הבלטה',x=>x?'כן':'לא');f('qty','כמות',x=>x+' בקבוקים');return out}

/* ── customer: artists ── */
V.customer_artists=()=>{const q=(S.f.cq||'').trim();const cc=S.f.cc||'הכל';const all=ARTISTS();const cs=['הכל',...new Set(all.map(a=>a.country).filter(Boolean))];const L=all.filter(a=>(cc==='הכל'||a.country===cc)&&(!q||a.n.includes(q)||a.style.includes(q)||(a.country||'').includes(q)));
  return `<span class="eyebrow">${esc(ROLES.customer.who)}</span><h1>לבחור אמן</h1><p class="lead">כל אמן מביא סגנון אחר לבקבוק. בוחרים אמן, ובדף שלו רואים את כל היצירות שאפשר לשים על התווית.</p>
  <label class="search">${ICON.search}<input id="cq" placeholder="לחפש לפי שם, סגנון או מדינה" data-in="cq" value="${esc(S.f.cq||'')}" aria-label="חיפוש אמן"></label>
  ${cs.length>1?`<div class="hscroll">${cs.map(c=>`<button class="chip" data-a="ccf" data-v="${esc(c)}" aria-pressed="${cc===c}">${esc(c)}</button>`).join('')}</div>`:''}
  ${L.map(a=>`<button class="acard" ${a.soon?'disabled':`data-a="go" data-v="cart-${a.id}"`}>${faceEl(a,true)}<span class="mt"><b>${esc(a.n)}</b><small>${esc(a.style)}${a.country?' · '+esc(a.country):''}</small><small>${a.soon?'מצטרף בקרוב':`${a.works.length} יצירות · תוספת אמן <span class="num">${nis(addonFor(a.id))}</span> לבקבוק`}</small></span>${a.soon?'':'<span class="end">←</span>'}</button>`).join('')||empty('לא נמצא אמן','אפשר לחפש בשם אחר.')}`};

VX.cart=id=>{const a=artistOf(id);if(!a||a.soon)return empty('האמן לא נמצא');
  return `${backBtn}${faceEl(a)}<h1 style="text-align:center;margin-bottom:2px">${esc(a.n)}</h1><p class="lead" style="text-align:center;margin-top:0">${esc(a.style)} · ${esc(a.country||'')}${a.country?' · ':''}${esc(a.gal)}</p>
  <div class="kpis"><div class="kpi"><b>${a.works.length}</b><span>יצירות זמינות</span></div><div class="kpi"><b class="num">${nis(addonFor(a.id))}</b><span>תוספת אמן לבקבוק</span></div><div class="kpi"><b>${S.deals.filter(d=>d.st==='active').length}</b><span>יינות עם הציורים</span></div></div>
  <h3>על האמן</h3><div class="panel"><p style="margin:0">${esc(a.bio)}</p></div>
  <h3>היצירות</h3><p class="note" style="margin-top:0">נגיעה ביצירה מציגה אותה על בקבוק, מוכנה להזמנה.</p>
  <div class="grid">${a.works.map(w=>`<button class="tile" data-a="cpick" data-v="${w.id}"><span class="ph" style="background-image:url(${img(w.id)})" role="img" aria-label="${esc(w.t)}"></span>${w.pick?'<span class="tag">בחירת האוצר</span>':''}<span class="cp">${esc(w.t)}<small>${esc(w.tech||w.tag)}${w.y?' · '+w.y:''}</small>${w.sz?`<small>${esc(w.sz)} ס״מ</small>`:''}</span></button>`).join('')}</div>`};

VX.cwork=id=>{const d=S.cd;if(!d||d.work!==id){S.cd=recommend(id)}if(!S.cd)return empty('אין עדיין יינות לעיצוב');const w=work(id),a=artistOf(S.cd.artist),p=cprice(S.cd);
  return {html:`${backBtn}<span class="eyebrow" style="display:block">הבקבוק שהכנו בשבילך</span><h2>${esc(w.t)} · ${esc(a.n)}</h2>
  <button class="hero" data-a="czoom">${cbottle(S.cd,{})}<span class="wm">הדמיה · סימן מים</span><span class="zm">להגדיל</span></button>
  <p class="note">בחרנו יין, צורת תווית ומיקום שמתאימים לציור. אפשר לשנות כל פרט במסך הבא.</p>
  <button class="btn alt wide" data-a="cshoot">${S.cd.render?'לצלם שוב':'צילום ריאליסטי של הבקבוק'}</button>
  ${S.stories[id]?`<h3>סיפור היצירה</h3><div class="panel"><p style="margin:0">${esc(S.stories[id])}</p></div>`:''}
  <div class="panel" style="margin-top:12px"><dl><dt>היצירה</dt><dd>${esc([w.tech||'שמן על בד',w.y,w.sz&&w.sz+' ס״מ'].filter(Boolean).join(', '))}</dd><dt>יין</dt><dd>${esc(wine(S.cd.wine).n)} ${wine(S.cd.wine).y}</dd><dt>תווית</dt><dd>${SH[S.cd.shape]}</dd><dt>כמות</dt><dd>${S.cd.qty} בקבוקים (ארגז)</dd></dl></div>
  <div class="row" style="margin-top:14px"><button class="btn alt" data-a="go" data-v="cedit-1">לערוך את העיצוב</button><button class="btn" data-a="go" data-v="csum-0">לסיכום</button></div>`,bar:priceBar(`<button class="btn sm" data-a="go" data-v="cedit-1">לעריכה</button>`)}};

/* ── editor (shared by the customer and the winery) ── */
const STEPS=['יין','תווית','טקסט','גימור','כמות'];
VX.cedit=step=>{const d=S.cd;if(!d)return empty('אין עיצוב פתוח');const st=+step||1;const wmode=S.role==='winery';const w=W();
  const ch=(k,v,l)=>`<button class="chip" data-a="cset" data-v="${k}:${v}" aria-pressed="${String(d[k])===String(v)}">${l}<span class="dl">${String(d[k])===String(v)?'הבחירה הנוכחית':dl(delta(k,typeof v==='boolean'?v:isNaN(+v)?v:+v))}</span></button>`;
  let body='';
  if(st===1)body=`<h3>איזה יין?</h3><div class="chips">${S.wines.map(x=>ch('wine',x.id,`${esc(x.n)} ${x.y}`)).join('')}</div><p class="note">המחיר כולל את היין עצמו. יינות אחרים של היקב יתווספו כאן כשהיקב יפתח אותם.</p>`;
  if(st===2)body=`<h3>צורת התווית</h3><div class="chips">${Object.entries(SH).map(([k,l])=>ch('shape',k,l)).join('')}</div>
    <div class="fld"><label for="cpos">מיקום הציור בתוך התווית</label><input id="cpos" type="range" min="0" max="100" step="5" value="${d.pos}" data-in="cpos"></div>
    <div class="fld"><label for="czm">הגדלה</label><input id="czm" type="range" min="100" max="160" step="5" value="${d.zoom}" data-in="czm"></div>
    <p class="note">אי אפשר לחתוך אזורים שהאמן סימן, ולא לשנות את צבעי הציור.</p>`;
  if(st===3)body=`<h3>הטקסט על התווית</h3><div class="fld"><label for="cnm">שם על התווית <span class="cnt">${(d.name||'').length}/24</span></label><input id="cnm" maxlength="24" value="${esc(d.name||'')}" data-in="cnm" placeholder="למשל: היין של משפחת לוי"></div>
    <div class="fld"><label for="cdd">הקדשה, שורה קטנה מתחת (לא חובה) <span class="cnt">${(d.ded||'').length}/40</span></label><input id="cdd" maxlength="40" value="${esc(d.ded||'')}" data-in="cdd" placeholder="למשל: לאבא, באהבה · 70"></div>
    <p class="note">הבציר ושם האמן מופיעים תמיד. היקב בודק כל טקסט לפני הדפסה.</p>`;
  if(st===4)body=`<h3>גימור</h3><div class="chips">${ch('foil',false,'הדפסה רגילה')}${ch('foil',true,'שם היין בזהב')}</div><div class="chips" style="margin-top:8px">${ch('emboss',false,'בלי הבלטה')}${ch('emboss',true,'הבלטה של השם')}</div>`;
  if(st===5){const opts=[[1,'בקבוק אחד'],[3,'3 בקבוקים'],[6,'ארגז, 6 בקבוקים'],[12,'2 ארגזים'],[w.t1,`${w.t1} בקבוקים`],[w.t2,`${w.t2} בקבוקים`]];
    body=`<h3>כמה בקבוקים?</h3><div class="chips">${opts.map(([n,l])=>ch('qty',n,l)).join('')}</div>
    <div class="fld"><label for="cqt">או מספר אחר</label><input id="cqt" inputmode="numeric" value="${d.qty}" data-in="cqt"></div>
    <div class="panel" style="margin-top:12px"><dl><dt>מ־6 בקבוקים</dt><dd>${w.caseDisc}% הנחה</dd><dt>מ־${w.t1} בקבוקים</dt><dd>${w.d1}% הנחה</dd><dt>מ־${w.t2} בקבוקים</dt><dd>${w.d2}% הנחה</dd></dl></div>`}
  const next=st<5?`<button class="btn sm" data-a="go" data-v="cedit-${st+1}">הבא: ${STEPS[st]}</button>`:`<button class="btn sm" data-a="go" data-v="${wmode?'corder-'+S._wo:'csum-0'}">${wmode?'לסיום העריכה':'לסיכום'}</button>`;
  return {html:`${backBtn}<span class="eyebrow" style="display:block">${wmode?`עריכת היקב · הזמנה ${S._wo}`:'עריכת העיצוב'}</span>
  <div class="steps">${STEPS.map((s,i)=>`<button data-a="go" data-v="cedit-${i+1}" ${i+1===st?'aria-current="step"':''} class="${i+1<st?'done':''}">${s}</button>`).join('')}</div>
  <div class="hero" style="cursor:default;padding:8px 0" id="cprev">${cbottle(d)}</div>${body}
  <div class="row" style="margin-top:16px;justify-content:space-between">${st>1?`<button class="link" data-a="go" data-v="cedit-${st-1}">→ הקודם</button>`:'<span></span>'}<button class="link" data-a="go" data-v="${wmode?'corder-'+S._wo:'csum-0'}">${wmode?'לסיום העריכה':'ישר לסיכום'}</button></div>`,bar:priceBar(next)}};

/* ── summary and terms ── */
VX.csum=()=>{const d=S.cd;if(!d)return empty('אין עיצוב פתוח');const p=cprice(d),wi=wine(d.wine),a=artistOf(d.artist);let c=S._cust;if(!c){try{c=JSON.parse(localStorage.getItem('wl-cust')||'null')}catch(e){}c=c||{n:window.ME?.name&&!/@/.test(ME.name)?ME.name:'',em:window.ME?.email||''}}
  const row=(l,v,st)=>`<dt>${l}</dt><dd>${v} <button class="link" style="margin:0;font-size:13px" data-a="go" data-v="cedit-${st}">לשנות</button></dd>`;
  return {html:`${backBtn}<span class="eyebrow" style="display:block">סיכום לפני שליחה</span><h2>הבקבוק שלך</h2>
  <button class="hero" data-a="czoom">${cbottle(d)}<span class="wm">הדמיה · סימן מים</span><span class="zm">להגדיל</span></button>
  ${d.render?'':'<button class="btn alt wide" data-a="cshoot">צילום ריאליסטי לפני שליחה</button>'}
  <h3>הבחירות</h3><div class="panel"><dl><dt>אמן ויצירה</dt><dd>${esc(a.n)} · ${esc(work(d.work).t)} <button class="link" style="margin:0;font-size:13px" data-a="go" data-v="cart-${a.id}">לשנות</button></dd>${row('יין',`${esc(wi.n)} ${wi.y}`,1)}${row('תווית',`${SH[d.shape]}, מיקום ${d.pos}%`,2)}${row('שם',esc(d.name||wi.n),3)}${row('הקדשה',esc(d.ded||'ללא'),3)}${row('גימור',[d.foil?'זהב':'',d.emboss?'הבלטה':''].filter(Boolean).join(' ו')||'רגיל',4)}${row('כמות',d.qty+' בקבוקים',5)}</dl></div>
  <h3>המחיר</h3><div class="panel"><dl><dt>היין</dt><dd class="m">${nis(p.base)}</dd><dt>תוספת אמן</dt><dd class="m">${nis(p.art)}</dd>${p.shp?`<dt>צורת תווית</dt><dd class="m">${nis(p.shp)}</dd>`:''}${p.foil?`<dt>זהב</dt><dd class="m">${nis(p.foil)}</dd>`:''}${p.emb?`<dt>הבלטה</dt><dd class="m">${nis(p.emb)}</dd>`:''}<dt>לבקבוק</dt><dd class="m">${nis(p.unit)}</dd>${p.disc?`<dt>הנחת כמות ${p.disc}%</dt><dd class="m">${nis(p.unitNet)} לבקבוק</dd>`:''}<span class="sep"></span><dt class="tot">סה״כ ל־${p.q} בקבוקים</dt><dd class="m tot">${nis(p.total)}</dd></dl><p class="note">כולל מע״מ. התשלום נעשה ישירות מול היקב, אחרי שהוא מאשר את ההזמנה.</p></div>
  <h3>פרטים ליצירת קשר</h3><div class="fld"><label for="cn">שם מלא</label><input id="cn" value="${esc(c.n||'')}" autocomplete="name"></div><div class="two"><div class="fld"><label for="cph">טלפון</label><input id="cph" inputmode="tel" value="${esc(c.ph||'')}" autocomplete="tel"></div><div class="fld"><label for="cem">דוא״ל</label><input id="cem" inputmode="email" dir="ltr" value="${esc(c.em||'')}" autocomplete="email"></div></div>
  <div class="fld"><label for="cnt">הערה ליקב (לא חובה)</label><textarea id="cnt" placeholder="למשל: מתנה ליום הולדת, צריך עד סוף החודש">${esc(c.note||'')}</textarea></div>
  <h3>אישור</h3>
  <div class="panel" style="font-size:14.5px"><ul style="margin:0;padding-inline-start:18px"><li>הטקסט על התווית יודפס כמו שהוא מופיע כאן.</li><li>היקב יכול להתאים את העיצוב לדפוס, וכל שינוי יוצג לך לאישור.</li><li>הציור מודפס רק על הבקבוקים של ההזמנה הזו.</li></ul></div>
  <label class="check"><input type="checkbox" data-in="cck"> <span>בדקתי את הפרטים, ואני מסכים ל<button class="link" style="margin:0;display:inline" data-a="cterms">תנאי ההזמנה</button>. אני מעל גיל 18</span></label>
  <div class="row" style="margin-top:16px"><button class="btn alt" data-a="go" data-v="cedit-1">לחזור לעריכה</button><button class="btn alt" data-a="crestart">להתחיל מההתחלה</button></div>`,
  bar:priceBar(`<button class="btn sm" id="csend" data-a="csend" disabled>לשלוח ליקב</button>`)}};

/* ── orders ── */
const CST={sent:['נשלחה ליקב','היקב בודק את העיצוב'],label:['ממתינה לאישור האמן','היינן אישר. האמן או הגלריה בודקים את התווית'],review:['ממתינה לאישורך','היקב הציע התאמות'],approved:['אושרה','היקב ייצור קשר לתשלום'],print:['בהדפסה','התוויות בהדפסה'],done:['מוכנה','הבקבוקים מוכנים לאיסוף או משלוח'],cancel:['בוטלה','']};
const CSTAGE=['sent','review','label','approved','print','done'];window.CST=CST;
V.customer_orders=()=>{const L=S.corders;return `<h1>ההזמנות שלי</h1><p class="lead">כל הזמנה עוברת לאישור היקב לפני הדפסה. כאן רואים איפה היא עומדת.</p>
  ${L.length?`<div class="list">${L.map(o=>{const d=o.wv&&o.st!=='review'?o.wv:o.d;return `<button class="li ${o.st==='review'?'unread':''}" data-a="go" data-v="corder-${o.id}"><span style="width:40px;flex:none">${cbottle(d,{wm:true})}</span><span class="mt"><b>הזמנה ${o.id} · ${esc(work(d.work).t)}</b><small>${d.qty} בקבוקים · ${fmtD(o.at)}</small><small><span class="pill ${o.st==='review'?'solid':o.st==='approved'||o.st==='done'?'on':''}">${CST[o.st][0]}</span></small></span><span class="end num">${nis(cprice(d).total)}</span></button>`}).join('')}</div>`:empty('עדיין אין הזמנות','מתחילים מבחירת אמן.')}
  <button class="btn wide" style="margin-top:14px" data-a="go" data-v="tab-artists">לעצב בקבוק חדש</button>`};

V.winery_clients=()=>{const L=S.corders;const f=S.f.co||'open';const fl={open:['פתוחות',o=>['sent','review','label'].includes(o.st)],go:['אושרו',o=>['approved','print','done'].includes(o.st)],all:['הכל',()=>true]};
  return `<h1>הזמנות לקוחות</h1><p class="lead">לקוחות מעצבים בקבוק אישי מהקישור של היקב. כל הזמנה מגיעה לכאן מוכנה, ואפשר לערוך אותה לפני הדפסה.</p>
  <div class="tabs">${Object.entries(fl).map(([k,[l,fn]])=>`<button data-a="cof" data-v="${k}" aria-selected="${f===k}">${l} (${L.filter(fn).length})</button>`).join('')}</div>
  <div class="list">${L.filter(fl[f][1]).map(o=>{const d=o.wv||o.d;return `<button class="li ${o.st==='sent'?'unread':''}" data-a="go" data-v="corder-${o.id}"><span style="width:40px;flex:none">${cbottle(d,{wm:true})}</span><span class="mt"><b>${esc(o.cust.n)} · ${esc(work(d.work).t)}</b><small>הזמנה ${o.id} · ${d.qty} בקבוקים · ${fmtD(o.at)}</small><small><span class="pill ${o.st==='sent'?'solid':''}">${o.st==='sent'?'חדשה, תורך':o.st==='review'?'אצל הלקוח לאישור':CST[o.st][0]}</span></small></span><span class="end num">${nis(cprice(d).total)}</span></button>`}).join('')||empty('אין הזמנות כאן','')}</div>
  <h3>הגדרות ללקוחות</h3><div class="list"><button class="li" data-a="cprices"><span class="mt"><b>מחירון ללקוחות</b><small>מחיר לבקבוק, הנחות כמות, תוספות אמן וגימור</small></span><span class="end">←</span></button>
  <div class="li"><span class="mt"><b>הקישור ללקוחות</b><small class="num">wine-art.netlify.app/Portal/?y=${esc(W().link)}</small></span><button class="btn sm alt" data-a="toast" data-v="הקישור הועתק">להעתיק</button></div></div>`};

VX.corder=id=>{const o=S.corders.find(x=>x.id===+id);if(!o)return empty('ההזמנה לא נמצאה');const r=S.role,wn=r==='winery'||r==='admin';
  const si=Math.max(0,CSTAGE.indexOf(o.st));const changes=o.wv?diffs(o.d,o.wv):[];
  const cmp=o.wv?`<div class="cmp"><div>${cbottle(o.d)}<b>העיצוב של הלקוח</b><br><span class="num">${nis(cprice(o.d).total)}</span></div><div>${cbottle(o.wv)}<b>אחרי התאמות היקב</b><br><span class="num">${nis(cprice(o.wv).total)}</span></div></div>
    <h3>מה היקב שינה (${changes.length})</h3>${changes.length?`<ul class="chg">${changes.map(c=>`<li>${c.l}<small>${esc(String(c.from))} ← ${esc(String(c.to))}</small></li>`).join('')}</ul>`:'<p class="note">לא בוצעו שינויים.</p>'}${o.wnote?`<p class="note">הערת היקב: ${esc(o.wnote)}</p>`:''}`:'';
  let bar='';
  if(wn&&o.st==='sent')bar=`<div class="actbar"><div class="t"><b>תורך: לבדוק את העיצוב</b><span>${o.wv?`${changes.length} שינויים מוכנים לשליחה`:'אפשר לאשר כמו שהוא או לערוך'}</span></div><button class="btn sm" data-a="${o.wv?'cwsend':'cwok'}" data-v="${o.id}">${o.wv?'לשלוח ללקוח':'לאשר כמו שהוא'}</button></div>`;
  if(S.role==='customer'&&o.st==='review')bar=`<div class="actbar"><div class="t"><b>תורך: לאשר את ההתאמות</b><span>${changes.length} שינויים · ${nis(cprice(o.wv).total)}</span></div><button class="btn sm" data-a="ccok" data-v="${o.id}">לאשר</button></div>`;
  if(wn&&o.st==='approved')bar=o.paid?`<div class="actbar"><div class="t"><b>שולם · מוכנה לדפוס</b><span>${fmtD(o.paid)}</span></div><button class="btn sm" data-a="cwprint" data-v="${o.id}">להעביר לדפוס</button></div>`:`<div class="actbar"><div class="t"><b>ממתינה לתשלום</b><span>${nis(cprice(o.wv||o.d).total)} כולל מע״מ</span></div><button class="btn sm" data-a="cwpaid" data-v="${o.id}">לסמן ששולם</button></div>`;
  const d=o.wv||o.d,p=cprice(d);
  return {html:`${backBtn}<span class="eyebrow" style="display:block">הזמנה <span class="num">${o.id}</span> · ${fmtD(o.at)}</span><h2>${wn?esc(o.cust.n):CST[o.st][0]}</h2>
  <div class="stages" aria-hidden="true">${CSTAGE.map((s,i)=>`<i class="${i<=si?'done':''}"></i>`).join('')}</div><p class="stnow"><b>${CST[o.st][0]}</b>${CST[o.st][1]?' · '+CST[o.st][1]:''}</p>
  ${o.wv?cmp:`<button class="hero" data-a="czoomo" data-v="${o.id}">${cbottle(o.d)}<span class="wm">העיצוב של הלקוח</span><span class="zm">להגדיל</span></button>`}
  ${wn&&['sent'].includes(o.st)?`<div class="row" style="margin-top:12px"><button class="btn alt" data-a="cwedit" data-v="${o.id}">${o.wv?'להמשיך לערוך':'לערוך את העיצוב'}</button>${o.wv?`<button class="btn alt" data-a="cwundo" data-v="${o.id}">לבטל את השינויים</button>`:''}</div>`:''}
  ${S.role==='customer'&&o.st==='review'?`<div class="row" style="margin-top:12px"><button class="btn alt" data-a="ccchg" data-v="${o.id}">לבקש שינוי</button></div>`:''}
  ${['sent','review','label'].includes(o.st)&&(wn||S.role==='customer')?`<button class="link" data-a="ccancel" data-v="${o.id}">לבטל את ההזמנה</button>`:''}
  ${o.st==='approved'&&S.role==='customer'?`<div class="panel" style="margin-top:10px;font-size:14.5px">${o.paid?'התשלום התקבל. ההזמנה תעבור לדפוס.':'היקב ייצור איתך קשר לתשלום. אחרי התשלום ההזמנה עוברת לדפוס.'}</div>`:''}
  <h3>פרטים</h3><div class="panel"><dl><dt>אמן ויצירה</dt><dd>${esc(artistOf(d.artist)?.n||'')} · ${esc(work(d.work).t)}</dd><dt>יין</dt><dd>${esc(wine(d.wine).n)} ${wine(d.wine).y}</dd><dt>שם</dt><dd>${esc(d.name)}</dd><dt>הקדשה</dt><dd>${esc(d.ded||'ללא')}</dd><dt>כמות</dt><dd>${d.qty} בקבוקים</dd><span class="sep"></span><dt class="tot">סה״כ כולל מע״מ</dt><dd class="m tot">${nis(p.total)}</dd></dl></div>
  ${wn?`<h3>הלקוח</h3><div class="panel"><dl><dt>שם</dt><dd>${esc(o.cust.n)}</dd><dt>טלפון</dt><dd class="num">${esc(o.cust.ph)}</dd><dt>דוא״ל</dt><dd class="num">${esc(o.cust.em)}</dd></dl>${o.cust.note?`<p class="note">"${esc(o.cust.note)}"</p>`:''}</div>`:''}
  ${o.log.length?`<h3>מה קרה</h3><div class="chat">${o.log.map(m=>`<div class="msg sys">${esc(m.t)} · ${m.at}</div>`).join('')}</div>`:''}`,bar}};

/* ── terms ── */
function termsSheet(){sheet(`<h2>תנאי ההזמנה</h2><div class="panel" style="margin-top:8px;font-size:14.5px"><p style="margin:0 0 8px">ההזמנה נשלחת ליקב, ואינה מחייבת עד שהיקב מאשר אותה ומתקבל תשלום.</p><p style="margin:0 0 8px">היקב רשאי להתאים את העיצוב לדפוס. כל שינוי מוצג ללקוח לאישור.</p><p style="margin:0 0 8px">הציור שייך לאמן. ההזמנה מתירה להדפיס אותו רק על הבקבוקים שבה.</p><p style="margin:0">מכירת יין מותרת מגיל 18 בלבד. התשלום, המשלוח והחשבונית באחריות היקב.</p></div><p class="note">נוסח לדוגמה. הנוסח הסופי ייקבע עם עורך דין.</p><button class="btn wide" data-a="close">הבנתי</button>`)}

/* ── winery price list ── */
function pricesSheet(){const w=W();sheet(`<h2>מחירון ללקוחות</h2><p class="note">מחירים לצרכן, כולל מע״מ. הלקוח רואה אותם בכל בחירה.</p>
  <h3>מחיר בקבוק לפי יין</h3>${S.wines.map(x=>`<div class="fld"><label for="wp${x.id}">${esc(x.n)} ${x.y}</label><input id="wp${x.id}" inputmode="numeric" value="${w.prices[x.id]||''}"></div>`).join('')}
  <h3>תוספת אמן לבקבוק</h3>${ARTISTS().filter(a=>!a.soon).map((a,i)=>`<div class="fld"><label for="wpa${i}">${esc(a.n)}</label><input id="wpa${i}" inputmode="numeric" value="${w.artist[a.id]??''}" placeholder="לפי הדרגה: ${nis(window.tierAddon?tierAddon(a.id):0)}"><small>ריק = לפי הדרגה של האמן</small></div>`).join('')}
  <h3>תוספות</h3><div class="two"><div class="fld"><label for="wpf">זהב</label><input id="wpf" inputmode="numeric" value="${w.foil}"></div><div class="fld"><label for="wpe">הבלטה</label><input id="wpe" inputmode="numeric" value="${w.emboss}"></div></div>
  <div class="two"><div class="fld"><label for="wpo">תווית אובל</label><input id="wpo" inputmode="numeric" value="${w.shape.oval}"></div><div class="fld"><label for="wpr">תווית קשת</label><input id="wpr" inputmode="numeric" value="${w.shape.arch}"></div></div>
  <h3>מידת התווית במ״מ</h3><div class="two"><div class="fld"><label for="wlw">רוחב</label><input id="wlw" inputmode="numeric" value="${w.label?.w||80}"></div><div class="fld"><label for="wlh">גובה</label><input id="wlh" inputmode="numeric" value="${w.label?.h||152}"></div></div>
  <h3>הנחות כמות</h3><div class="two"><div class="fld"><label for="wcd">ארגז (6), %</label><input id="wcd" inputmode="numeric" value="${w.caseDisc}"></div><span></span></div>
  <div class="two"><div class="fld"><label for="wt1">מעל כמות</label><input id="wt1" inputmode="numeric" value="${w.t1}"></div><div class="fld"><label for="wd1">הנחה %</label><input id="wd1" inputmode="numeric" value="${w.d1}"></div></div>
  <div class="two"><div class="fld"><label for="wt2">מעל כמות</label><input id="wt2" inputmode="numeric" value="${w.t2}"></div><div class="fld"><label for="wd2">הנחה %</label><input id="wd2" inputmode="numeric" value="${w.d2}"></div></div>
  <div class="row" style="margin-top:14px"><button class="btn alt" data-a="close">ביטול</button><button class="btn" data-a="cpsave">לשמור</button></div>`)}

/* ── actions ── */
const nowD=()=>new Date().toISOString().slice(0,10);
const olog=(o,t)=>o.log.push({t,at:now()});
Object.assign(A,{
  cpick(v){S._wo=null;const r=recommend(+v);if(!r)return;S.cd=r;S._lastDelta=0;go('cwork-'+v)},
  cset(v){const i=v.indexOf(':');const k=v.slice(0,i);let x=v.slice(i+1);x=x==='true'?true:x==='false'?false:isNaN(+x)?x:+x;
    if(k==='wine'&&(!S.cd.name||S.wines.some(w=>w.n===S.cd.name)))S.cd.name=wine(x).n;setD(k,x);render()},
  czoom(){zoomLabelSheet(cbottle(S.cd,{label:true,big:true}),'התווית בהגדלה')},
  czoomo(v){const o=S.corders.find(x=>x.id===+v);zoomLabelSheet(cbottle(o.d,{label:true,big:true}),'העיצוב של הלקוח')},
  cterms:termsSheet,
  crestart(){confirmSheet({t:'להתחיל מההתחלה?',body:'<p class="note">העיצוב הנוכחי יימחק, ונחזור לבחירת אמן.</p>',l:'להתחיל מחדש',danger:true,ok(){S.cd=null;S._lastDelta=0;go('tab-artists')}})},
  csend(){const n=$('#cn').value.trim(),ph=$('#cph').value.trim(),em=$('#cem').value.trim(),note=$('#cnt').value.trim();
    S._cust={n,ph,em,note};try{localStorage.setItem('wl-cust',JSON.stringify({n,ph,em}))}catch(e){}
    const bad=[[!n,'#cn'],[ph.replace(/\D/g,'').length<9,'#cph'],[!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em),'#cem']].filter(x=>x[0]);
    if(bad.length){bad.forEach(([,s])=>$(s).closest('.fld').classList.add('bad'));$(bad[0][1]).focus();toast('צריך שם, טלפון ודוא״ל');return}
    const id=Math.max(5000,...S.corders.map(o=>o.id))+1;const o={id,at:nowD(),cust:{n,ph,em,note},d:{...S.cd},wv:null,st:'sent',log:[]};olog(o,'הלקוח שלח את ההזמנה');
    if(window.submitOrder){submitOrder(o);return}
    S.corders.unshift(o);S.cd=null;S._lastDelta=0;log(`הזמנת לקוח ${id}: ${n}`,'deal');toast('ההזמנה נשלחה ליקב');go('corder-'+id)},
  cof(v){S.f.co=v;render()},
  cwedit(v){const o=S.corders.find(x=>x.id===+v);if(!o.wv)o.wv={...o.d};S.cd=o.wv;S._wo=o.id;S._lastDelta=0;go('cedit-1')},
  cwundo(v){const o=S.corders.find(x=>x.id===+v);confirmSheet({t:'לבטל את כל השינויים של היקב?',l:'לבטל שינויים',danger:true,ok(){o.wv=null;S.cd=null;toast('חזרנו לעיצוב של הלקוח')}})},
  cwok(v){const o=S.corders.find(x=>x.id===+v);confirmSheet({t:'לאשר את העיצוב כמו שהוא?',body:'<p class="note">הלקוח יקבל הודעה שההזמנה אושרה, וניצור איתו קשר לתשלום.</p>',l:'לאשר',ok(){o.st='approved';olog(o,'היקב אישר את העיצוב כמו שהוא');toast('ההזמנה אושרה')}})},
  cwsend(v){const o=S.corders.find(x=>x.id===+v);const n=diffs(o.d,o.wv).length;
    if(!n){A.cwok(v);return}
    sheet(`<span class="eyebrow">הזמנה ${o.id}</span><h2>לשלוח ללקוח לאישור</h2><p class="note">הלקוח יראה את שני העיצובים זה ליד זה, עם ${n===1?'השינוי':n+' השינויים'}.</p><div class="fld"><label for="wn2">הסבר קצר ללקוח (לא חובה)</label><textarea id="wn2" placeholder="למשל: הקטנו מעט את ההקדשה כדי שתיקרא בדפוס"></textarea></div><div class="row"><button class="btn alt" data-a="close">ביטול</button><button class="btn" data-a="cwsend2" data-v="${o.id}">לשלוח</button></div>`)},
  cwsend2(v){const o=S.corders.find(x=>x.id===+v);o.wnote=$('#wn2').value.trim();o.st='review';olog(o,`היקב שלח ${diffs(o.d,o.wv).length} שינויים לאישור הלקוח`);S.cd=null;closeSheet();toast('נשלח ללקוח לאישור');render()},
  ccok(v){const o=S.corders.find(x=>x.id===+v);confirmSheet({t:'לאשר את העיצוב של היקב?',body:`<p class="note">זה העיצוב שיודפס. המחיר: ${nis(cprice(o.wv).total)}.</p>`,l:'לאשר',ok(){o.st='approved';olog(o,'הלקוח אישר את ההתאמות');toast('אישרת. היקב ייצור קשר לתשלום')}})},
  ccchg(v){sheet(`<span class="eyebrow">הזמנה ${v}</span><h2>מה לשנות?</h2><div class="fld"><label for="ccx">ההודעה תגיע ליקב</label><textarea id="ccx" placeholder="למשל: מעדיף את ההקדשה בגודל המקורי"></textarea></div><div class="row"><button class="btn alt" data-a="close">ביטול</button><button class="btn" data-a="ccchg2" data-v="${v}">לשלוח</button></div>`)},
  ccchg2(v){const t=$('#ccx').value.trim();if(!t){$('#ccx').focus();return}const o=S.corders.find(x=>x.id===+v);o.st='sent';olog(o,'הלקוח ביקש שינוי: '+t);closeSheet();toast('הבקשה נשלחה ליקב');render()},
  cwpaid(v){const o=S.corders.find(x=>x.id===+v);confirmSheet({t:'לסמן שהלקוח שילם?',body:`<p class="note">${nis(cprice(o.wv||o.d).total)} כולל מע״מ. אחרי זה אפשר להעביר לדפוס.</p>`,l:'לסמן ששולם',ok(){o.paid=nowD();olog(o,'היקב סימן שהתשלום התקבל');toast('סומן ששולם')}})},
  ccancel(v){const o=S.corders.find(x=>x.id===+v);confirmSheet({t:'לבטל את ההזמנה?',body:'<p class="note">אי אפשר לבטל את הביטול. אפשר תמיד לעצב הזמנה חדשה.</p>',l:'לבטל הזמנה',danger:true,ok(){o.st='cancel';olog(o,'ההזמנה בוטלה');toast('ההזמנה בוטלה')}})},
  cwprint(v){const o=S.corders.find(x=>x.id===+v);confirmSheet({t:'להעביר לדפוס?',body:'<p class="note">רק אחרי שהלקוח שילם. בית הדפוס יקבל את הקובץ והכמות.</p>',l:'להעביר',ok(){o.st='print';olog(o,'ההזמנה עברה לדפוס');toast('נשלח לבית הדפוס')}})},
  cprices:pricesSheet,
  wedit(v){const w=work(+v);const tags=['נוף','טבע דומם','בוטני','סמלי','דיוקן','עירוני','מופשט','אחר'];const tones=['ירוק','חום','בז׳','כחול','אפור','אדום','סגול','צהוב','שחור','לבן','צבעוני'];const origs=['באוסף האמן','בגלריה','באוסף פרטי','נמכר','לא ידוע'];sheet(`<h2>פרטי היצירה</h2><div class="fld"><label for="we-t">שם</label><input id="we-t" value="${esc(w.t)}"></div><div class="two"><div class="fld"><label for="we-y">שנה</label><input id="we-y" inputmode="numeric" value="${w.y||''}"></div><div class="fld"><label for="we-s">מידות בס״מ</label><input id="we-s" value="${esc(w.sz||'')}" placeholder="60×80"></div></div><div class="fld"><label for="we-tc">טכניקה</label><input id="we-tc" list="utcl2" value="${esc(w.tech||'שמן על בד')}"><datalist id="utcl2">${TECHS.map(t=>`<option value="${t}">`).join('')}</datalist></div><div class="two"><div class="fld"><label for="we-g">נושא</label><select id="we-g" class="lv-sel">${tags.map(t=>`<option ${w.tag===t?'selected':''}>${t}</option>`).join('')}</select></div><div class="fld"><label for="we-tn">גוון עיקרי</label><select id="we-tn" class="lv-sel">${tones.map(t=>`<option ${w.tone===t?'selected':''}>${t}</option>`).join('')}</select></div></div><div class="fld"><label for="we-o">היכן המקור</label><select id="we-o" class="lv-sel">${origs.map(t=>`<option ${w.orig===t?'selected':''}>${t}</option>`).join('')}</select></div><div class="row"><button class="btn alt" data-a="close">ביטול</button><button class="btn" data-a="wedit2" data-v="${w.id}">לשמור</button></div>`)},
  wedit2(v){const t=$('#we-t').value.trim(),y=$('#we-y').value.trim(),sz=$('#we-s').value.trim(),tag=$('#we-g').value,tech=$('#we-tc').value.trim(),tone=$('#we-tn').value,orig=$('#we-o').value;if(!t){$('#we-t').focus();return}if(y&&!/^\d{4}$/.test(y)){$('#we-y').closest('.fld').classList.add('bad');return}
    closeSheet();if(window.saveWork){saveWork(+v,{title:t,year:y?+y:null,size:sz||null,tag,technique:tech||null,tone,orig_status:orig});return}Object.assign(work(+v),{t,y:y?+y:'',sz,tag,tech,tone,orig});toast('הפרטים נשמרו');render()},
  cshoot(){toast('צילום ריאליסטי פועל במערכת המחוברת. בהדגמה מוצג ציור של הבקבוק')},
  ccf(v){S.f.cc=v;render()},
  ccountry(){const c=$('#cctry').value.trim();if(!c){$('#cctry').focus();return}S.country=c;toast('המדינה נשמרה');render()},
  cpsave(){const w=W(),n=s=>+($(s).value.replace(/\D/g,''))||0;S.wines.forEach(x=>w.prices[x.id]=n('#wp'+x.id)||w.prices[x.id]);ARTISTS().filter(a=>!a.soon).forEach((a,i)=>{const raw=$('#wpa'+i).value.replace(/\D/g,'');if(raw==='')delete w.artist[a.id];else w.artist[a.id]=+raw});w.foil=n('#wpf');w.emboss=n('#wpe');w.shape.oval=n('#wpo');w.shape.arch=n('#wpr');w.caseDisc=n('#wcd');w.t1=n('#wt1')||24;w.d1=n('#wd1');w.t2=Math.max(n('#wt2'),w.t1+1);w.d2=n('#wd2');w.label={w:Math.min(200,Math.max(30,n('#wlw')||80)),h:Math.min(300,Math.max(30,n('#wlh')||152))};log('מחירון ללקוחות עודכן','admin');closeSheet();toast('המחירון נשמר');render()},
  cface(){const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=()=>{const f=i.files[0];if(!f)return;if(window.saveFace){saveFace(f);return}const r=new FileReader();r.onload=()=>{S.face=r.result;save();toast('הצילום נשמר');render()};r.readAsDataURL(f)};i.click()},
  cstory(v){if(window.saveStory){saveStory(+v,$('#cst').value.trim());return}S.stories[+v]=$('#cst').value.trim();toast('הסיפור נשמר. לקוחות יראו אותו');render()}
});

/* ── upload: fill the details automatically from the image ── */
const TONES=['ירוק','חום','בז׳','כחול','אפור','אדום','סגול','צהוב','שחור','לבן','צבעוני'];
function toneOf(src){return new Promise(res=>{const im=new Image();im.onload=()=>{const N=48,c=document.createElement('canvas');c.width=N;c.height=N;const g=c.getContext('2d');g.drawImage(im,0,0,N,N);let d;try{d=g.getImageData(0,0,N,N).data}catch(e){res('');return}
  const bins={};for(let i=0;i<d.length;i+=4){const r=d[i]/255,gg=d[i+1]/255,b=d[i+2]/255,mx=Math.max(r,gg,b),mn=Math.min(r,gg,b),v=mx,s=mx?(mx-mn)/mx:0;let h=0;
    if(mx!==mn){h=mx===r?(gg-b)/(mx-mn):mx===gg?2+(b-r)/(mx-mn):4+(r-gg)/(mx-mn);h=(h*60+360)%360}
    let t;if(v<.18)t='שחור';else if(s<.08&&v>.88)t='לבן';else if(s<.09)t='אפור';else if(h<15||h>=345)t='אדום';else if(h<45)t=s<.42&&v>.6?'בז׳':v<.62?'חום':'צהוב';else if(h<70)t=s<.4&&v>.6?'בז׳':'צהוב';else if(h<170)t='ירוק';else if(h<255)t='כחול';else t='סגול';bins[t]=(bins[t]||0)+1}
  const L=Object.entries(bins).sort((a,b)=>b[1]-a[1]);const tot=N*N;
  /* a light background (white or grey) is usually the canvas, not the painting's colour */
  const main=L.find(([t,n])=>!['לבן','אפור'].includes(t)&&n/tot>.12)||L[0];
  res(L.filter(([t,n])=>n/tot>.18).length>=3&&main[1]/tot<.3?'צבעוני':main[0])};im.onerror=()=>res('');im.src=src})}
window.toneOf=toneOf;
function commonTech(){const c={};S.works.forEach(w=>{if(w.tech)c[w.tech]=(c[w.tech]||0)+1});return Object.entries(c).sort((a,b)=>b[1]-a[1])[0]?.[0]||'שמן על בד'}
function keepTyped(){const u=S.upload;if(!u||!document.getElementById('ut'))return;const v=s=>document.querySelector(s)?.value;
  const m={t:'#ut',y:'#uy',hh:'#uh',ww:'#uw',tc:'#utc',g:'#ug',tn:'#utn',o:'#uo',st:'#ust'};Object.entries(m).forEach(([k,s])=>{const x=v(s);if(x!=null&&x!=='')u[k]=x})}
window.autoFill=async function(){const u=S.upload;if(!u||!u.src)return;const mine=u;
  u.tc=u.tc||commonTech();u.o=u.o||'באוסף האמן';
  const t=await toneOf(u.src);if(S.upload!==mine)return;keepTyped();u.tn=u.tn||t;u._tn=true;
  if(!window.aiAnalyze){uploadSheet();return}
  u.ai='working';uploadSheet();
  try{const r=await aiAnalyze(u.src);if(S.upload!==mine)return;keepTyped();
    if(r.title&&!u.t)u.t=r.title;if(r.subject&&!u._g)u.g=r.subject;if(r.technique)u.tc=r.technique;if(r.description&&!u.st)u.st=r.description;if(r.tone&&TONES.includes(r.tone))u.tn=r.tone;u.ai='done'}
  catch(e){console.warn(e);if(S.upload!==mine)return;keepTyped();u.ai='fail'}
  if(document.getElementById('ut'))uploadSheet()};

/* inputs that update live */
document.addEventListener('input',e=>{const k=e.target.dataset.in;if(!k||!S.cd&&k!=='cq'&&k!=='cck')return;
  if(k==='cq'){S.f.cq=e.target.value;const p=e.target.selectionStart;render();const i=$('#cq');i.focus();i.setSelectionRange(p,p);return}
  if(k==='cck'){const all=[...document.querySelectorAll('[data-in="cck"]')];const b=$('#csend');if(b)b.disabled=!all.every(x=>x.checked);return}
  const map={cpos:'pos',czm:'zoom',cnm:'name',cdd:'ded'};
  if(map[k]){S.cd.render=null;S.cd[map[k]]=['cpos','czm'].includes(k)?+e.target.value:e.target.value;const pv=$('#cprev');if(pv)pv.innerHTML=cbottle(S.cd);syncW();const c=e.target.closest('.fld')?.querySelector('.cnt');if(c)c.textContent=`${e.target.value.length}/${e.target.maxLength}`;save()}
  if(k==='cqt'){const q=Math.max(1,+e.target.value.replace(/\D/g,'')||1);setD('qty',q);const bar=document.querySelector('.pbar');if(bar){const tmp=document.createElement('div');tmp.innerHTML=priceBar(bar.querySelector('button').outerHTML);bar.replaceWith(tmp.firstElementChild)}save()}
});

/* todos and bell */
const _todos=todos;
todos=function(r){const out=_todos(r);
  if(r==='winery')S.corders.filter(o=>o.st==='sent').forEach(o=>out.push({k:'c'+o.id+o.log.length,t:`הזמנת לקוח · ${o.cust.n}`,s:`${o.d.qty} בקבוקים · ${work(o.d.work)?.t||''}`,go:'corder-'+o.id,cta:'לבדוק'}));
  if(r==='customer')S.corders.filter(o=>o.st==='review').forEach(o=>out.push({k:'cr'+o.id+o.log.length,t:`היקב הציע התאמות · הזמנה ${o.id}`,s:`${diffs(o.d,o.wv).length} שינויים`,go:'corder-'+o.id,cta:'לראות'}));
  return out};

/* artist: face photo and the story of each work, which customers see */
const _ap=V.artist_profile;
V.artist_profile=()=>{const a=artistOf(myArtistId())||{n:'',country:''};return `<div style="text-align:center">${faceEl(a)}<button class="link" data-a="cface">${S.face?'להחליף צילום פנים':'להעלות צילום פנים'}</button><p class="note" style="margin-top:2px">צילום ברור של הפנים. לקוחות רואים אותו בדף האמן.</p></div><div class="fld"><label for="cctry">מדינה</label><input id="cctry" list="ctrylist" value="${esc(a.country)}" placeholder="למשל: ישראל"><datalist id="ctrylist">${['ישראל','צרפת','איטליה','ספרד','גרמניה','ארצות הברית','בריטניה','יוון','פורטוגל','ארגנטינה'].map(c=>`<option value="${c}">`).join('')}</datalist></div><button class="btn sm wide alt" style="margin-top:8px" data-a="ccountry">לשמור מדינה</button><p class="note">לקוחות יכולים לסנן אמנים לפי מדינה.</p>`+_ap()};
const _aw=window.vArtistWork;
vArtistWork=function(w){return _aw(w)+`<button class="btn alt wide" style="margin-top:14px" data-a="wedit" data-v="${w.id}">לערוך פרטים: שם, שנה, מידות ונושא</button><h3>סיפור היצירה</h3><p class="note" style="margin-top:0">כמה משפטים על היצירה. לקוחות רואים אותם כשהם בוחרים אותה.</p><div class="fld" style="margin-top:0"><textarea id="cst" placeholder="למשל: ציירתי את החורשה בבוקר של סוף הקיץ...">${esc(S.stories[w.id]||'')}</textarea></div><button class="btn sm wide" style="margin-top:8px" data-a="cstory" data-v="${w.id}">לשמור</button>`};
})();
