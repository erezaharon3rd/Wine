/* tiers.js · דרגות אמנים לפי עלות: מתפתח, מבוסס, בכיר, מוזיאלי
   הדרגה קובעת טווח מחיר לרישיון, חלק האמן, ותוספת לבקבוק ללקוחות.
   הגלריה ממליצה, מנהל המערכת מאשר. נטען אחרי live.js */
(function(){
'use strict';
if(!window.LX)return;
const {sb,q,run}=window.LX;
const DEF=[
  {code:'emerging',name:'מתפתח',rank:1,min_price:800,max_price:1999,artist_pct:45,bottle_addon:8},
  {code:'established',name:'מבוסס',rank:2,min_price:2000,max_price:3999,artist_pct:50,bottle_addon:14},
  {code:'senior',name:'בכיר',rank:3,min_price:4000,max_price:8999,artist_pct:55,bottle_addon:25},
  {code:'museum',name:'מוזיאלי',rank:4,min_price:9000,max_price:30000,artist_pct:60,bottle_addon:45}];
const TC={emerging:'#5F7F4F',established:'#2F5671',senior:'#8C6A24',museum:'#5A2E4A'};
const TL=()=>(S.tiers&&S.tiers.length?S.tiers:DEF).slice().sort((a,b)=>a.rank-b.rank);
const TI=c=>TL().find(t=>t.code===c)||TL()[1];
const AR=()=>S._artists||{};
window.tierOf=aid=>TI(AR()[aid]?.tier||'established');
window.tierAddon=aid=>+tierOf(aid).bottle_addon;
const badge=(t,extra='')=>`<span class="tag" style="background:${TC[t.code]};color:#fff;${extra}">${esc(t.name)}</span>`;
const pill=t=>`<span style="display:inline-block;background:${TC[t.code]};color:#fff;border-radius:99px;padding:1px 10px;font-size:13px;font-weight:600">${esc(t.name)}</span>`;
const range=t=>`${nis(+t.min_price)}–${nis(+t.max_price)}`;

/* ── load ── */
const _lh=window.liveHydrate;
window.liveHydrate=async()=>{await _lh();try{const t=await q(sb.from('artist_tiers').select('*').order('rank'));if(t&&t.length)S.tiers=t}catch(e){console.warn('tiers',e)}};

/* ── price: the artist's share comes from the deal (saved at request time) or from the tier ── */
const _price=window.price;
window.price=function(d){const r=_price(d);const pct=d.share!=null?d.share:(d.aid?+tierOf(d.aid).artist_pct:null);
  if(pct!=null){r.artist=r.net*pct/100;r.gallery=r.net-r.artist;r.pct=pct}return r};

/* ── the bank: filter and badge by tier, real starting price per artist ── */
window.tileWork=function(w){const ol=otherLic(w.id).length,a=AR()[w.artist],t=tierOf(w.artist),fl=+(a?.floor_price||S.floor);
  return `<button class="tile" data-a="go" data-v="work-${w.id}"><span class="ph" style="background-image:url(${img(w.id)})" role="img" aria-label="${esc(w.t)}"></span>${ol?'<span class="tag dk">על בקבוק של יקב אחר</span>':w.pick?'<span class="tag">בחירת האוצר</span>':''}${badge(t,'right:auto;left:8px')}<span class="cp">${esc(w.t)}<small>${esc(w.artistN||'')} · ${w.tag}</small><span class="pr">${nis(fl)}+</span></span></button>`};
A.ftier=v=>{S.f.tier=v;render()};
V.winery_bank=()=>{
  const tags=['הכל','נוף','טבע דומם','בוטני','סמלי'],ft=S.f.tier||'all';
  const base=S.works.filter(w=>w.st==='live'&&w.av);
  const inTier=w=>ft==='all'||tierOf(w.artist).code===ft;
  const list=base.filter(w=>inTier(w)&&(S.f.bank==='הכל'||w.tag===S.f.bank)&&(!S.f.q||w.t.includes(S.f.q)||w.tag.includes(S.f.q)||w.tone.includes(S.f.q)));
  return `<h1>המאגר</h1><p class="lead">יצירות מקוריות שהגלריה אישרה לרישוי. המחיר הוא מחיר הבסיס לבציר אחד, לפני מע״מ.</p>
  <label class="search">${ICON.search}<input id="q" placeholder="לחפש לפי שם, נושא או צבע" value="${esc(S.f.q)}" data-in="q" aria-label="חיפוש"></label>
  <div class="hscroll" aria-label="דרגת האמן"><button class="chip" data-a="ftier" data-v="all" aria-pressed="${ft==='all'}">כל הדרגות</button>${TL().map(t=>`<button class="chip" data-a="ftier" data-v="${t.code}" aria-pressed="${ft===t.code}">${esc(t.name)} <small>${nis(+t.min_price)}+</small></button>`).join('')}</div>
  <div class="hscroll">${tags.map(t=>`<button class="chip" data-a="ftag" data-v="${t}" aria-pressed="${S.f.bank===t}">${t} <small>${t==='הכל'?base.filter(inTier).length:base.filter(w=>inTier(w)&&w.tag===t).length}</small></button>`).join('')}</div>
  ${list.length?`<div class="grid">${list.map(tileWork).join('')}</div>`:empty('לא נמצאו יצירות',`<button class="link" data-a="clearf">לנקות את החיפוש</button>`)}`;
};
const _clr=A.clearf;A.clearf=function(){S.f.tier='all';_clr()};

/* ── tier sheet: the gallery recommends, the admin sets ── */
A.tierS=function(aid){const a=AR()[aid];if(!a)return;S._tsel=a.tier_proposed||a.tier||'established';S._tnote='';drawTier(aid)};
function drawTier(aid){const a=AR()[aid],cur=a.tier||'established',adm=S.role==='admin';
  const opt=t=>`<button class="li" data-a="tsel" data-v="${aid}:${t.code}" aria-pressed="${S._tsel===t.code}" style="${S._tsel===t.code?'outline:2px solid var(--ink);':''}"><span class="mt"><b>${pill(t)} ${t.code===cur?'<small style="display:inline">· הדרגה הנוכחית</small>':''}</b><small>רישיון: <span class="num">${range(t)}</span> · לאמן ${+t.artist_pct}% · לבקבוק ללקוח <span class="num">${nis(+t.bottle_addon)}</span></small></span></button>`;
  sheet(`<span class="eyebrow">${esc(a.name)}</span><h2>${adm?'לקבוע דרגה':'להמליץ על דרגה'}</h2>
  <p class="note" style="margin-top:4px">${adm?'הדרגה נקבעת מיד. מחיר הרצפה נכנס לטווח של הדרגה החדשה.':'ההמלצה עוברת למנהל המערכת לאישור. עד האישור הדרגה הנוכחית בתוקף.'}</p>
  <div class="list" style="margin-top:10px">${TL().map(opt).join('')}</div>
  <div class="fld"><label for="tnote">${adm?'הערה (לא חובה)':'למה? למשל תערוכות, מכירות, פרסים'}</label><textarea id="tnote">${esc(S._tnote||'')}</textarea></div>
  <div class="row"><button class="btn alt" data-a="close">ביטול</button><button class="btn" data-a="tier2" data-v="${aid}">${adm?'לקבוע':'לשלוח המלצה'}</button></div>`)}
A.tsel=v=>{const [aid,c]=v.split(':');S._tnote=document.getElementById('tnote')?.value||'';S._tsel=c;drawTier(aid)};
A.tier2=function(aid){const a=AR()[aid],c=S._tsel,note=document.getElementById('tnote').value.trim();
  if(S.role!=='admin'&&c===(a.tier||'established')){toast('זו כבר הדרגה של האמן');return}
  closeSheet();S._tnote='';run(()=>q(sb.rpc('tier_propose',{p_artist:aid,p_tier:c,p_note:note||null})),S.role==='admin'?'הדרגה נקבעה':'ההמלצה נשלחה למנהל')};
A.tierok=v=>{const [aid,ok]=v.split(':');if(ok==='1'){run(()=>q(sb.rpc('tier_decide',{p_artist:aid,p_ok:true})),'הדרגה אושרה');return}
  sheet(`<span class="eyebrow">${esc(AR()[aid]?.name||'')}</span><h2>לא לאשר את ההמלצה?</h2><div class="fld"><label for="tno">סיבה לגלריה (לא חובה)</label><textarea id="tno"></textarea></div><div class="row"><button class="btn alt" data-a="close">ביטול</button><button class="btn danger" data-a="tierno" data-v="${aid}">לא לאשר</button></div>`)};
A.tierno=aid=>{const t=document.getElementById('tno').value.trim();closeSheet();run(()=>q(sb.rpc('tier_decide',{p_artist:aid,p_ok:false,p_note:t||null})),'ההמלצה לא אושרה. הגלריה קיבלה הודעה')};

/* ── gallery: artists with their tier ── */
V.gallery_artists=()=>{const L=Object.values(AR()).filter(a=>S.role!=='gallery'||a.gallery_id===window.ME?.orgId);
  return `<h1>אמנים</h1><p class="lead">הדרגה קובעת את טווח המחיר לרישיון, את חלק האמן ואת התוספת לבקבוק ללקוחות.</p><div class="list">${L.map(a=>{const t=TI(a.tier),p=a.tier_proposed?TI(a.tier_proposed):null;
    return `<div class="li"><span class="mt"><b>${esc(a.name)} ${pill(t)}</b><small>${S.works.filter(w=>w.artist===a.id).length} יצירות · מחיר רצפה <span class="num">${nis(+a.floor_price)}</span> · טווח הדרגה <span class="num">${range(t)}</span></small>${p?`<small style="color:#7a6330;font-weight:600">ממתין לאישור המנהל: ${esc(p.name)}</small>`:''}</span><span class="end" style="display:flex;flex-direction:column;gap:6px;align-items:flex-end"><button class="btn sm alt" data-a="tierS" data-v="${a.id}">דרגה</button><button class="link" data-a="pricelist" data-v="${a.id}">מחירון</button></span></div>`}).join('')||empty('אין עדיין אמנים')}</div>
  <p class="note">אמן חדש נכנס עם המייל שלו, ומנהל המערכת משייך אותו לגלריה.</p>`};

/* ── admin: tier table and recommendations to approve ── */
const _as=V.admin_settings;
V.admin_settings=()=>{const h=_as();const pend=Object.values(AR()).filter(a=>a.tier_proposed);
  const row=t=>`<div class="panel" style="margin-top:8px"><b>${pill(t)}</b><div class="two" style="margin-top:6px"><div class="fld" style="margin-top:0"><label for="tmin-${t.code}">רישיון מ־</label><input id="tmin-${t.code}" inputmode="numeric" value="${+t.min_price}"></div><div class="fld" style="margin-top:0"><label for="tmax-${t.code}">עד</label><input id="tmax-${t.code}" inputmode="numeric" value="${+t.max_price}"></div></div>
    <div class="two"><div class="fld"><label for="tpct-${t.code}">חלק האמן %</label><input id="tpct-${t.code}" inputmode="numeric" value="${+t.artist_pct}"></div><div class="fld"><label for="tadd-${t.code}">לבקבוק ללקוח ₪</label><input id="tadd-${t.code}" inputmode="numeric" value="${+t.bottle_addon}"></div></div></div>`;
  return h+`<h3>דרגות אמנים</h3>
  ${pend.length?`<div class="list">${pend.map(a=>`<div class="li unread"><span class="mt"><b>${esc(a.name)}: ${esc(TI(a.tier).name)} ← ${esc(TI(a.tier_proposed).name)}</b><small>${esc(a.tier_note||'הגלריה לא הוסיפה הסבר')}</small></span><span class="end" style="display:flex;gap:6px"><button class="btn sm" data-a="tierok" data-v="${a.id}:1">לאשר</button><button class="btn sm alt" data-a="tierok" data-v="${a.id}:0">לא</button></span></div>`).join('')}</div>`:'<p class="note" style="margin-top:0">אין המלצות שמחכות לאישור.</p>'}
  ${TL().map(row).join('')}
  <button class="btn sm wide" style="margin-top:10px" data-a="tiersave">לשמור את הדרגות</button>
  <div class="list" style="margin-top:12px">${Object.values(AR()).map(a=>`<button class="li" data-a="tierS" data-v="${a.id}"><span class="mt"><b>${esc(a.name)} ${pill(TI(a.tier))}</b><small>מחיר רצפה <span class="num">${nis(+a.floor_price)}</span></small></span><span class="end">לשנות ←</span></button>`).join('')}</div>`};
A.tiersave=function(){const n=id=>+(document.getElementById(id)?.value||'').replace(/\D/g,'');
  const rows=TL().map(t=>({code:t.code,name:t.name,rank:t.rank,min_price:n('tmin-'+t.code),max_price:n('tmax-'+t.code),artist_pct:n('tpct-'+t.code),bottle_addon:n('tadd-'+t.code)}));
  const bad=rows.find(r=>!r.min_price||r.min_price>r.max_price||r.artist_pct>100);if(bad){toast(`בדרגה "${bad.name}" הטווח או האחוז לא תקינים`);return}
  run(()=>q(sb.from('artist_tiers').upsert(rows)),'הדרגות נשמרו')};
})();
