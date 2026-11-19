/* ops.js · כלים לפיילוט, נטען אחרי live.js
   תצוגות מקדימות עם סימן מים · העברת יצירות לאחסון פרטי · קישורי הצטרפות
   תבניות חוזה · הסכמה מראש · מחיקת חשבון · ביוגרפיה בעזרת AI · התקנה לטלפון */
(function(){
'use strict';
if(!window.LX)return;
const {sb,q,run,heb2,textModel,gfetch}=window.LX,{openDoc,row,today}=window.DX||{};

/* ── תמונות: תצוגה מקדימה עם סימן מים, וגרסה קטנה ונקייה למנוע ── */
async function loadImg(src){const im=new Image();im.crossOrigin='anonymous';await new Promise((ok,bad)=>{im.onload=ok;im.onerror=bad;im.src=src});return im}
async function makeVariants(src,who){
  const im=await loadImg(src),W0=im.naturalWidth,H0=im.naturalHeight;
  const mk=(max,mark)=>{const k=Math.min(1,max/Math.max(W0,H0)),c=document.createElement('canvas');c.width=Math.round(W0*k);c.height=Math.round(H0*k);
    const g=c.getContext('2d');g.drawImage(im,0,0,c.width,c.height);
    if(mark){const f=Math.max(14,Math.round(c.width/26)),t=`© ${who||'האמן'} · סדנת התווית`,d=Math.hypot(c.width,c.height);
      g.save();g.translate(c.width/2,c.height/2);g.rotate(-Math.PI/7);g.font=`${f}px Heebo, Arial, sans-serif`;g.textAlign='center';g.direction='rtl';
      g.fillStyle='rgba(255,255,255,.20)';g.strokeStyle='rgba(0,0,0,.10)';g.lineWidth=1;
      for(let y=-d/2;y<d/2;y+=f*5)for(let x=-d/2+((y/(f*5))%2?f*6:0);x<d/2;x+=f*13){g.fillText(t,x,y);g.strokeText(t,x,y)}
      g.restore()}
    return new Promise((ok,bad)=>c.toBlob(b=>b?ok(b):bad(new Error('canvas')),'image/jpeg',.82))};
  return {preview:await mk(1600,true),thumb:await mk(1024,false)};
}
window.makeVariants=makeVariants;
async function putVariants(src,who,tag){
  const v=await makeVariants(src,who),base=`${ME.id}/${tag}-${Date.now()}`;
  await q(sb.storage.from('previews').upload(base+'-p.jpg',v.preview,{contentType:'image/jpeg'}));
  await q(sb.storage.from('previews').upload(base+'-t.jpg',v.thumb,{contentType:'image/jpeg'}));
  return {preview_path:base+'-p.jpg',thumb_path:base+'-t.jpg'};
}
window.putVariants=putVariants;

/* העלאת יצירה: מקור פרטי + תצוגה מקדימה */
A.doupload=function(){const u=readUpload();if(!u)return;
  const aid=u.a||ME.artist?.id;if(!aid){toast('צריך לבחור אמן');return}
  closeSheet();toast('מעלה את היצירה…');
  run(async()=>{const blob=await (await fetch(u.src)).blob();const ext=(blob.type.split('/')[1]||'jpg').replace('jpeg','jpg');const path=`${ME.id}/${Date.now()}.${ext}`;
    await q(sb.storage.from('works').upload(path,blob,{contentType:blob.type,upsert:false}));
    let pv={};try{pv=await putVariants(u.src,(S._artists||{})[aid]?.name,'w')}catch(e){console.warn('preview',e)}
    await q(sb.from('works').insert({artist_id:aid,title:u.t,year:u.y?+u.y:null,size:u.s||null,tag:u.g,tone:u.tn,technique:u.tc,orig_status:u.o,story:u.st||null,no_crop:u.cells||{},image_path:path,px_w:u.w||null,px_h:u.h||null,phash:u.phash||null,file_check:u.check?{ok:u.check.ok,dpi:u.check.info.dpi,mb:u.check.info.mb,sharp:u.check.info.sharp,warns:u.check.warns.map(x=>x.k)}:null,...pv}));
    log(`הועלתה יצירה: "${u.t}"`,'work');S.upload=null},ME.role==='gallery'?'הקובץ עבר את הבדיקה. היצירה פורסמה במאגר':'הקובץ עבר את הבדיקה. היצירה נשלחה לאישור הגלריה')};

/* אישור הגלריה מפרסם ישר למאגר: בדיקת הקובץ כבר נעשתה אוטומטית בהעלאה */
A.gapprove=v=>run(()=>q(sb.from('works').update({status:'live'}).eq('id',+v)),'היצירה פורסמה במאגר');

/* מנהל: העברת יצירות מכתובת ציבורית לאחסון פרטי, והשלמת תצוגות מקדימות */
const needMove=()=>(S.works||[]).filter(w=>w.st!=='hidden'&&w.path&&(/^https?:/.test(w.path)||!w.prev));
A.migrate=function(){const list=needMove();if(!list.length){toast('כל היצירות כבר מוגנות');return}
  let n=0;run(async()=>{for(const w of list){
      toast(`מעביר יצירה ${++n} מתוך ${list.length}…`);
      const src=/^https?:/.test(w.path)?w.path:w.full;if(!src)continue;
      const up={};
      if(/^https?:/.test(w.path)){const b=await (await fetch(src)).blob();const ext=(b.type.split('/')[1]||'jpg').replace('jpeg','jpg');
        up.image_path=`${ME.id}/m${w.id}-${Date.now()}.${ext}`;await q(sb.storage.from('works').upload(up.image_path,b,{contentType:b.type}))}
      Object.assign(up,await putVariants(src,w.artistN,'m'+w.id));
      await q(sb.from('works').update(up).eq('id',w.id));
    }},'היצירות הועברו. עכשיו אפשר למחוק את תיקיית Paintings מהאתר')};

/* ── מנהל: קישורי הצטרפות ותבניות חוזה ── */
const RN={winery:'יקב',gallery:'גלריה',printer:'בית דפוס',curator:'אוצר',artist:'אמן'};
const KIND_ROLE={winery:['winery'],gallery:['gallery','artist'],printer:['printer'],platform:['curator']};
const link=t=>`${location.origin}${location.pathname}?j=${t}`;
async function loadAdmin(){if(ME?.role!=='admin')return;
  const [inv,ct]=await Promise.all([q(sb.from('org_invites').select('*').order('created_at',{ascending:false})),q(sb.from('contract_templates').select('version,active,created_at,body').order('version',{ascending:false}))]);
  S._inv=inv;S._ct=ct}
const _lh=window.liveHydrate;window.liveHydrate=async()=>{await _lh();try{await loadAdmin()}catch(e){console.warn(e)}};
setTimeout(()=>{if(window.ME?.role==='admin'&&!S._inv)loadAdmin().then(render).catch(()=>{})},1500);

const _as=V.admin_settings;
V.admin_settings=()=>{let h=_as();h=h.replace(/<h3>תבניות חוזה<\/h3>[\s\S]*$/,'');
  const mv=needMove().length,act=(S._ct||[]).find(t=>t.active),orgs=(S.orgs||[]).filter(o=>o.kind!=='platform'||true);
  const on=id=>(S.orgs||[]).find(o=>o.id===id)?.name||'';
  const live=(S._inv||[]).filter(i=>!i.revoked&&new Date(i.expires_at)>new Date());
  return h+`
  <h3>קובצי יצירות</h3><div class="panel"><p class="note" style="margin-top:0">${!(S.works||[]).filter(w=>w.st!=='hidden').length?'אין עדיין יצירות במערכת. אחרי שיצירות יועלו, אפשר יהיה להעביר אותן מכאן.':mv?`${mv} יצירות עדיין בלי הגנה. ההעברה שומרת את קובץ המקור באחסון פרטי ויוצרת תצוגה מקדימה עם סימן מים. יקבים ולקוחות רואים רק את התצוגה, ובית הדפוס מקבל את המקור אחרי אישור.`:`כל ${(S.works||[]).filter(w=>w.st!=='hidden').length} היצירות שמורות באחסון פרטי, עם תצוגה מקדימה מוגנת.`}</p>
    ${mv?`<button class="btn sm wide" data-a="migrate">להעביר ${mv} יצירות</button>`:''}</div>
  <h3>קישורי הצטרפות</h3><div class="panel"><p class="note" style="margin-top:0">שולחים קישור לאדם חדש. אחרי ההרשמה הוא משויך לארגון ולתפקיד, בלי לחכות לאישור. הקישור בתוקף 14 יום.</p>
    <div class="two"><div class="fld"><label for="ivo">ארגון</label><select id="ivo">${orgs.filter(o=>KIND_ROLE[o.kind]).map(o=>`<option value="${o.id}" data-k="${o.kind}">${esc(o.name)}</option>`).join('')}</select></div>
    <div class="fld"><label for="ivr">תפקיד</label><select id="ivr">${Object.entries(RN).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div></div>
    <button class="btn sm wide" style="margin-top:10px" data-a="invmake">ליצור קישור</button></div>
  ${live.length?`<div class="list">${live.map(i=>`<div class="li"><span class="mt"><b>${esc(on(i.org_id))} · ${RN[i.role]||i.role}</b><small>${i.uses?`שימש ${i.uses} פעמים · `:''}בתוקף עד ${new Date(i.expires_at).toLocaleDateString('he-IL')}</small></span><span class="end"><button class="btn sm alt" data-a="invcopy" data-v="${i.token}">להעתיק</button> <button class="btn sm alt" data-a="invoff" data-v="${i.token}">לבטל</button></span></div>`).join('')}</div>`:''}
  <h3>תבנית חוזה הרישוי</h3><div class="list"><button class="li" data-a="ctedit"><span class="mt"><b>חוזה רישוי · גרסה ${act?.version||1}</b><small>פעילה. חוזים חתומים שומרים את הנוסח שהיה בתוקף כשנחתמו</small></span><span class="end">←</span></button>
    ${(S._ct||[]).filter(t=>!t.active).slice(0,3).map(t=>`<div class="li"><span class="mt"><b>גרסה ${t.version}</b><small>מ־${new Date(t.created_at).toLocaleDateString('he-IL')}, לא פעילה</small></span></div>`).join('')}</div>`};

A.invmake=function(){const o=document.getElementById('ivo'),r=document.getElementById('ivr').value,k=o?.selectedOptions[0]?.dataset.k;if(!o?.value){toast('צריך לבחור ארגון');return}
  if(!(KIND_ROLE[k]||[]).includes(r)){toast(`לארגון מסוג זה אפשר להזמין רק ${(KIND_ROLE[k]||[]).map(x=>RN[x]).join(' או ')}`);return}
  run(async()=>{const i=await q(sb.from('org_invites').insert({org_id:o.value,role:r}).select('token').single());try{await navigator.clipboard.writeText(link(i.token))}catch(e){}},'הקישור נוצר והועתק')};
A.invcopy=t=>{navigator.clipboard?.writeText(link(t)).then(()=>toast('הקישור הועתק'),()=>toast(link(t)))};
A.invoff=t=>run(()=>q(sb.from('org_invites').update({revoked:true}).eq('token',t)),'הקישור בוטל');

A.ctedit=function(){const act=(S._ct||[]).find(t=>t.active)||{body:''};
  sheet(`<h2>נוסח חוזה הרישוי</h2><p class="note">השינוי יוצר גרסה חדשה וחל רק על חוזים חדשים. אפשר לכתוב בתוך הנוסח את השדות: {gallery} {artist} {winery} {work} {wine} {type} {qty} {exclusive} {restrict} {price}. שורה שמתחילה במספר ונקודה הופכת לכותרת.</p>
  <div class="fld"><label for="ctb">הנוסח</label><textarea id="ctb" style="min-height:320px">${esc(act.body)}</textarea></div>
  <div class="row" style="margin-top:14px"><button class="btn alt" data-a="close">ביטול</button><button class="btn" data-a="ctsave">לשמור גרסה חדשה</button></div>`)};
A.ctsave=function(){const b=document.getElementById('ctb').value.trim();if(b.length<40){toast('הנוסח קצר מדי');return}
  const v=Math.max(0,...(S._ct||[]).map(t=>t.version))+1;closeSheet();
  run(async()=>{await q(sb.from('contract_templates').update({active:false}).eq('active',true));await q(sb.from('contract_templates').insert({version:v,body:b,active:true}))},`גרסה ${v} פעילה`)};

/* ── חוזה: לפי הנוסח שנשמר בחוזה עצמו, או לפי התבנית הפעילה ── */
const _cd=window.contractDoc;
const fill=(body,d)=>{const p=price(d),r=(S._artists||{})[d.artist]?.restrict_text;
  const M={gallery:d.galleryN||'הגלריה',artist:d.artistN||'',winery:d.winery||'',work:work(d.work)?.t||'',wine:d.wineN||'',type:TYPES[d.lt]?.n||'',qty:QTY[d.q]?.n||'',
    exclusive:d.ex?', בבלעדיות':'',restrict:r?`\nמגבלות שהאמן קבע: ${r}`:'',price:nis(p.total)};
  return esc(body).replace(/\{(\w+)\}/g,(m,k)=>k in M?esc(M[k]):m)};
const html=t=>t.split(/\n{2,}/).map(par=>{const ls=par.split('\n');const h=/^\d+\.\s/.test(ls[0])?`<h2>${ls.shift()}</h2>`:'';return h+(ls.length?`<p>${ls.join('<br>')}</p>`:'')}).join('');
window.contractDoc=async function(d){
  let c=null;try{c=(await sb.from('contracts').select('terms,template_version,terms_hash,signed_at').eq('deal_id',d.id).maybeSingle()).data}catch(e){}
  let body=c?.terms?.template;if(!body){try{body=(await sb.from('contract_templates').select('body').eq('active',true).order('version',{ascending:false}).limit(1).maybeSingle()).data?.body}catch(e){}}
  if(!body)return _cd(d);
  const p=price(d);
  openDoc(`חוזה רישוי ${d.id}`,`<h1>הסכם רישוי לשימוש ביצירה</h1><div class="meta">עסקה ${d.id} · דגם ${esc(d.code)} · נוסח ${c?.template_version||'פעיל'} · הופק ${today()}</div>
  ${html(fill(body,d))}
  <table>${row('מחיר הרישיון',nis(p.total))}${row(`מע״מ ${VAT}%`,nis(p.vat))}${row('סה״כ לתשלום',nis(p.gross),'tot')}</table>
  <div class="sig"><div>בשם הגלריה</div><div>בשם היקב${c?.signed_at?` · נחתם במערכת ${new Date(c.signed_at).toLocaleDateString('he-IL')}`:''}</div></div>
  ${c?.terms_hash?`<p class="note" dir="ltr" style="text-align:left">Fingerprint ${c.terms_hash}</p>`:''}
  <p class="note">נוסח לדוגמה. הנוסח הסופי ייקבע עם עורך דין.</p>`)};

/* ── לקוח: מחיקת החשבון ── */
const _co=V.customer_orders;
if(_co)V.customer_orders=()=>_co()+`<p class="note" style="text-align:center;margin-top:40px"><button class="lnk" data-a="delme">למחוק את החשבון שלי</button> · <a class="lnk" href="privacy.html">פרטיות ותנאים</a></p>`;
A.delme=()=>confirmSheet({t:'למחוק את החשבון?',danger:true,l:'למחוק',body:'<p class="note">פרטי ההתחברות שלך יימחקו. הזמנות שכבר נשלחו נשארות אצל היקב בלי השם שלך, כי הן חלק מהרישום של היקב. אי אפשר לבטל את המחיקה.</p>',
  ok(){run(async()=>{await q(sb.rpc('delete_my_account'));await sb.auth.signOut();try{localStorage.clear()}catch(e){}location.href=location.pathname})}});

/* ── אמן: ביוגרפיה בעזרת AI ── */
A.aibio=function(){const t=document.getElementById('bio');if(!t)return;const me=Object.values(S._artists||{}).find(a=>a.user_id===ME.id);
  const ws=(S.works||[]).filter(w=>w.artist===me?.id&&w.st!=='hidden').slice(0,12).map(w=>[w.t,w.tech,w.tag,w.y].filter(Boolean).join(', '));
  if(!ws.length){toast('כדאי להעלות קודם כמה יצירות');return}
  toast('מנסח…');(async()=>{const m=await textModel();
    const prompt=`Write a short artist bio in Hebrew for wine buyers, 2-3 calm sentences, third person, no superlatives, no invented facts (no awards, schools, exhibitions, cities or years unless given). Artist: ${me?.name||''}. Country: ${me?.country||'ישראל'}. Works: ${ws.join(' | ')}. ${t.value.trim()?`Notes from the artist: ${t.value.trim()}`:''} Reply with the bio text only.`;
    const r=await gfetch(`models/${m}:generateContent`,{contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:.5}});
    if(!r.ok)throw new Error(r.data?.error?.message||'engine');
    const txt=((((r.data.candidates||[])[0]||{}).content||{}).parts||[]).map(x=>x.text||'').join('').trim().slice(0,600);
    if(txt){t.value=txt;S.bio=txt;toast('זו הצעה. אפשר לערוך ולשמור')}})().catch(e=>{console.error(e);toast(heb2(e))})};
const _ap=V.artist_profile;
if(_ap)V.artist_profile=()=>_ap().replace(/(<textarea id="bio">[\s\S]*?<\/textarea><\/div>)/,'$1<button class="btn sm alt wide" style="margin:8px 0" data-a="aibio">לנסח הצעה בעזרת AI</button>');

document.head.insertAdjacentHTML('beforeend','<style>.lnk{background:none;border:0;padding:0;color:var(--muted);text-decoration:underline;font:inherit;cursor:pointer}</style>');


/* ── הצטרפות עצמית: מי שנרשם בלי קישור משאיר בקשה ── */
const KINDS={gallery:['גלריה','שם הגלריה','אמנים שהגלריה מייצגת, סגנון'],artist:['אמן או אמנית','השם שלך כפי שיופיע על התווית','טכניקה, נושאים, גלריה אם יש'],winery:['יקב','שם היקב','אזור, סוגי יין, כמויות בשנה'],printer:['בית דפוס','שם בית הדפוס','סוגי הדפסה, זהב והבלטה']};
let myApp;const pending=()=>window.ME&&!ME.role&&ME.status==='pending';
async function loadMyApp(){try{myApp=(await sb.from('applications').select('id,kind,name,status,note').eq('created_by',ME.id).order('id',{ascending:false}).limit(1).maybeSingle()).data||null}catch(e){myApp=null}}
function joinBox(){const k=S._jk||'gallery',K=KINDS[k];
  if(myApp&&myApp.status==='new')return `<div class="panel" style="margin-top:22px;text-align:right"><b style="font-weight:600">הבקשה שלך נשלחה</b><p class="note" style="margin:6px 0 0">${esc(KINDS[myApp.kind]?.[0]||'')} · ${esc(myApp.name)}. נעדכן כאן כשהיא תאושר. אפשר לבדוק שוב מדי פעם.</p></div>`;
  return `<div class="panel" style="margin-top:22px;text-align:right">${myApp?.status==='rejected'?`<p class="note" style="margin-top:0">הבקשה הקודמת לא אושרה${myApp.note?`: ${esc(myApp.note)}`:''}. אפשר לשלוח בקשה חדשה.</p>`:''}
    <b style="font-weight:600">הגעת בלי קישור הזמנה? אפשר לבקש להצטרף</b>
    <div class="chips" role="group" aria-label="סוג ההצטרפות" style="margin:12px 0 4px">${Object.entries(KINDS).map(([v,x])=>`<button class="chip" aria-pressed="${v===k}" data-a="jkind" data-v="${v}">${x[0]}</button>`).join('')}</div>
    <div class="fld"><label for="jn">${K[1]}</label><input id="jn" maxlength="80" autocomplete="organization"></div>
    <div class="fld"><label for="jd">כמה מילים</label><textarea id="jd" maxlength="600" placeholder="${K[2]}"></textarea></div>
    <div class="two"><div class="fld"><label for="js">אתר או אינסטגרם</label><input id="js" maxlength="200" dir="ltr"></div><div class="fld"><label for="jc">טלפון</label><input id="jc" maxlength="40" inputmode="tel" dir="ltr" autocomplete="tel"></div></div>
    <button class="btn wide" style="margin-top:12px" data-a="jsend">לשלוח בקשה</button></div>`}
const _rnd=window.render;
window.render=render=function(){_rnd();capMount();if(!pending())return;const box=document.querySelector('#app .login');if(!box||box.querySelector('[data-join]'))return;
  const d=document.createElement('div');d.dataset.join='1';d.innerHTML=myApp===undefined?'':joinBox();box.appendChild(d);
  if(myApp===undefined)loadMyApp().then(()=>{d.innerHTML=joinBox()})};
setTimeout(()=>{if(pending())render()},0);setTimeout(()=>{if(pending()&&!document.querySelector('[data-join]'))render()},800);
A.jkind=v=>{S._jk=v;const d=document.querySelector('[data-join]');if(d)d.innerHTML=joinBox()};
A.jsend=function(){const g=id=>(document.getElementById(id)?.value||'').trim(),n=g('jn');if(n.length<2){document.getElementById('jn').focus();toast('צריך שם');return}
  (async()=>{try{const row=await q(sb.from('applications').insert({kind:S._jk||'gallery',name:n,details:g('jd')||null,site:g('js')||null,contact:g('jc')||null}).select('id,kind,name,status,note').single());myApp={...row,status:'new'};
    const d=document.querySelector('[data-join]');if(d)d.innerHTML=joinBox();toast('הבקשה נשלחה');track('apply')}catch(e){console.error(e);toast(heb2(e))}})()};

/* ── אישור בקשות הצטרפות: מנהל ואוצר ── */
async function loadApps(){if(!['admin','curator'].includes(ME?.role))return;
  const ap=await q(sb.from('applications').select('*').order('id',{ascending:false}));
  S.apps=ap.map(a=>({id:a.id,kind:a.kind,n:a.name,d:[KINDS[a.kind]?.[0],a.details].filter(Boolean).join(' · '),site:a.site||'',why:a.contact||'',st:a.status==='approved'?'ok':a.status==='rejected'?'no':'new'}))}
A.app=function(v){const [i,s]=v.split(':'),a=S.apps[+i];if(!a)return;const ok=s==='ok';
  const gs=(S.orgs||S._orgL||[]).filter(o=>o.kind==='gallery');
  sheet(`<h2>${ok?'לאשר':'לדחות'} את ${esc(a.n)}?</h2><p class="note">${ok?(a.kind==='artist'?'האמן יקבל חשבון וישויך לגלריה שנבחרת כאן.':`ייפתח ארגון חדש מסוג ${KINDS[a.kind]?.[0]||''}, והמבקש יהיה מנהל שלו.`):'המבקש יקבל הודעה, ויוכל לשלוח בקשה חדשה.'}</p>
    ${ok&&a.kind==='artist'?`<div class="fld"><label for="apg">גלריה</label><select id="apg">${gs.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></div>`:''}
    ${ok?'':`<div class="fld"><label for="apn">סיבה, אם רוצים לכתוב</label><textarea id="apn" maxlength="500"></textarea></div>`}
    <div class="row" style="margin-top:14px"><button class="btn alt" data-a="close">ביטול</button><button class="btn" data-a="appgo" data-v="${a.id}:${s}">${ok?'לאשר':'לדחות'}</button></div>`)};
A.appgo=function(v){const [id,s]=v.split(':');const g=document.getElementById('apg')?.value||null,n=document.getElementById('apn')?.value.trim()||null;closeSheet();
  run(async()=>{await q(sb.rpc('application_decide',{p_id:+id,p_ok:s==='ok',p_gallery:g,p_note:n}));await loadApps()},s==='ok'?'הבקשה אושרה':'הבקשה נדחתה')};
const appsBlock=()=>{const open=(S.apps||[]).filter(a=>a.st==='new');if(!open.length)return '';
  return `<h3>בקשות הצטרפות</h3><div class="list">${open.map(a=>{const i=S.apps.indexOf(a);return `<div class="panel"><b style="font-weight:600">${esc(a.n)}</b><div class="note" style="margin:4px 0 10px">${esc(a.d)}${a.site?` · <span dir="ltr">${esc(a.site)}</span>`:''}${a.why?` · <span dir="ltr">${esc(a.why)}</span>`:''}</div><div class="row"><button class="btn sm alt" data-a="app" data-v="${i}:no">לדחות</button><button class="btn sm" data-a="app" data-v="${i}:ok">לאשר</button></div></div>`}).join('')}</div>`};
const _au=V.admin_users;V.admin_users=()=>{const h=_au();const b=appsBlock();return b?h.replace(/(<\/h1>)/,'$1'+b):h};

/* ── מנוע: תקציב, עלות, מכסות לפי יקב, מצב המפסק ── */
async function loadEngine(){if(ME?.role!=='admin')return;try{
  const [st,set,use]=await Promise.all([q(sb.rpc('engine_status')),q(sb.from('settings').select('*').eq('id',1).single()),q(sb.from('usage_daily').select('*').gte('day',new Date(Date.now()-30*864e5).toISOString().slice(0,10)))]);
  S._eng=st;S._set=set;S._use=use}catch(e){console.warn(e)}}
const nisx=n=>'₪'+Number(n||0).toLocaleString('he-IL',{maximumFractionDigits:2});
const EV={open_app:'כניסות לאפליקציה',apply:'בקשות הצטרפות',order_sent:'הזמנות לקוח',license_request:'בקשות רישיון',render_done:'צילומים'};
V.admin_engine=()=>{const e=S._eng||{},s=S._set||{},pct=e.budget?Math.round(100*e.spend/e.budget):0;
  const wins=(S.orgs||[]).filter(o=>o.kind==='winery');
  const use={};(S._use||[]).forEach(u=>{use[u.event]=(use[u.event]||0)+u.n});
  return `<h1>מנוע הצילום</h1><p class="lead">כמה המנוע עולה החודש, וכמה כל יקב יכול לצלם.</p>
  <div class="kpis"><div class="kpi"><b class="num">${nisx(e.spend)}</b><span>מתוך ${nisx(e.budget)} החודש</span></div><div class="kpi"><b class="num">${e.images??'—'}</b><span>צילומים</span></div><div class="kpi"><b class="num">${e.texts??'—'}</b><span>ניתוחים</span></div></div>
  <div class="panel" style="margin-top:12px"><div style="height:6px;background:var(--line);border-radius:3px;overflow:hidden" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="ניצול התקציב"><div style="height:100%;width:${Math.min(100,pct)}%;background:${pct>=90?'#9B3B2F':'var(--ink)'}"></div></div>
    <p class="note" style="margin:8px 0 0">${e.breaker?'<b>המנוע מושבת כרגע</b> בגלל כשלים רצופים אצל הספק. הוא יחזור לבד תוך כמה דקות.':`המנוע פעיל. ${e.failed?`${e.failed} כשלים ב-24 השעות האחרונות, והם לא נספרו במכסה.`:'אין כשלים ב-24 השעות האחרונות.'}`}</p></div>
  <h3>הגדרות</h3><div class="panel">
    <div class="two"><div class="fld"><label for="eb">תקציב חודשי ₪</label><input id="eb" inputmode="decimal" value="${s.engine_budget??''}"></div><div class="fld"><label for="ec">עלות צילום ₪</label><input id="ec" inputmode="decimal" value="${s.cost_image??''}"></div></div>
    <div class="two"><div class="fld"><label for="eq">צילומים ליקב בחודש</label><input id="eq" inputmode="numeric" value="${s.render_quota??''}"></div><div class="fld"><label for="ecq">צילומים ללקוח בחודש</label><input id="ecq" inputmode="numeric" value="${s.customer_render_quota??''}"></div></div>
    <button class="btn sm wide" style="margin-top:10px" data-a="engsave">לשמור</button></div>
  ${wins.length?`<h3>מכסה מיוחדת ליקב</h3><div class="list">${wins.map(o=>`<div class="li"><span class="mt"><b>${esc(o.name)}</b><small>${(e.by_org||{})[o.name]||0} צילומים החודש</small></span><span class="end"><input aria-label="מכסה ל${esc(o.name)}" inputmode="numeric" style="width:70px" placeholder="${s.render_quota??''}" value="${o.render_quota??''}" data-oq="${o.id}"></span></div>`).join('')}</div><button class="btn sm alt wide" style="margin-top:10px" data-a="engorg">לשמור מכסות</button>`:''}
  <h3>שימוש ב-30 הימים האחרונים</h3><div class="panel"><dl>${Object.entries(EV).map(([k,v])=>`<dt>${v}</dt><dd class="num">${use[k]||0}</dd>`).join('')}</dl><p class="note" style="margin:8px 0 0">ספירות בלבד, בלי לשמור מי עשה מה.</p></div>`};
A.engsave=function(){const n=id=>{const v=document.getElementById(id).value.replace(/[^\d.]/g,'');return v===''?null:+v};
  const u={engine_budget:n('eb'),cost_image:n('ec'),render_quota:n('eq'),customer_render_quota:n('ecq')};Object.keys(u).forEach(k=>u[k]===null&&delete u[k]);
  run(async()=>{await q(sb.from('settings').update(u).eq('id',1));await loadEngine()},'ההגדרות נשמרו')};
A.engorg=function(){const ins=[...document.querySelectorAll('[data-oq]')];
  run(async()=>{for(const i of ins){const v=i.value.replace(/\D/g,'');await q(sb.from('organizations').update({render_quota:v===''?null:+v}).eq('id',i.dataset.oq))}await loadEngine()},'המכסות נשמרו')};

/* ── מדידת שימוש: ספירות בלבד ── */
function track(e){try{sb.rpc('track',{p_event:e}).then(()=>{},()=>{})}catch(x){}}
window.track=track;
let opened=false;
const _so=window.submitOrder;if(_so)window.submitOrder=o=>{track('order_sent');return _so(o)};
const _sr=A.sendreq;if(_sr)A.sendreq=function(){track('license_request');return _sr.apply(this,arguments)};

const _lh2=window.liveHydrate;window.liveHydrate=async()=>{await _lh2();try{await Promise.all([loadApps(),loadEngine(),loadErrs(),loadDaily()])}catch(e){console.warn(e)}
  setTimeout(()=>autoShoot(),4000);
  if(!opened&&window.ME?.role){opened=true;track('open_app')}};
setTimeout(()=>{if(window.ME?.role){setTimeout(()=>autoShoot(),4000);Promise.all([loadApps(),loadEngine(),loadErrs(),loadDaily()]).then(()=>render()).catch(()=>{});if(!opened){opened=true;track('open_app')}}},1600);


/* ── הגנה מרובוטים בכניסה ובהרשמה (Cloudflare Turnstile). פועל רק כשיש מפתח ב-config.js ── */
let capId=null,capLoading=null;
window.capReset=()=>{window.__cap=null;try{if(capId!==null&&window.turnstile)turnstile.reset(capId)}catch(e){}};
function capMount(){const k=window.TURNSTILE_SITEKEY;if(!k)return;const pw=document.getElementById('lpw');if(!pw||document.getElementById('cap'))return;
  const box=document.createElement('div');box.id='cap';box.style.cssText='margin:14px 0 0;min-height:65px;display:flex;justify-content:center';
  (pw.closest('.fld')||pw).after(box);
  const go=()=>{try{capId=turnstile.render(box,{sitekey:k,language:'he',theme:'light',callback:t=>{window.__cap=t},'expired-callback':()=>{window.__cap=null},'error-callback':()=>{window.__cap=null}})}catch(e){console.warn(e)}};
  if(window.turnstile)return go();
  capLoading=capLoading||new Promise((ok,bad)=>{const s=document.createElement('script');s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.async=true;s.onload=ok;s.onerror=bad;document.head.appendChild(s)});
  capLoading.then(go,()=>{capLoading=null;box.textContent='לא הצלחנו לטעון את בדיקת האבטחה. כדאי לרענן את הדף'})}

try{new MutationObserver(()=>{if(document.getElementById('lpw')&&!document.getElementById('cap'))capMount()}).observe(document.getElementById('app')||document.body,{childList:true,subtree:true})}catch(e){}
capMount();

/* ── שגיאות באתר: נשלחות לשרת כספירה, בלי פרטי משתמש ── */
let errSent=0;
function reportErr(m,where){if(errSent>=20)return;errSent++;try{sb.rpc('log_error',{p_message:String(m||'').slice(0,300),p_place:String(where||location.pathname+location.hash).slice(0,120)}).then(()=>{},()=>{})}catch(e){}}
window.addEventListener('error',e=>reportErr(`${e.message} @ ${(e.filename||'').split('/').pop()}:${e.lineno}`));
window.addEventListener('unhandledrejection',e=>{const r=e.reason;if(r&&r.code&&/^(PGRST|23|P0)/.test(r.code))return;reportErr('promise: '+(r?.message||r))});
async function loadErrs(){if(ME?.role!=='admin')return;try{S._errs=await q(sb.from('client_errors').select('*').eq('resolved',false).order('last_at',{ascending:false}).limit(30))}catch(e){}}
const _alog=V.admin_log;V.admin_log=()=>{const h=_alog(),e=S._errs||[];
  return h+`<h3>שגיאות באתר</h3>${e.length?`<p class="note" style="margin-top:0">שגיאות שקרו אצל משתמשים, מקובצות לפי סוג. בלי שמות ובלי פרטים אישיים.</p><div class="list">${e.map(x=>`<div class="li"><span class="mt"><b dir="ltr" style="text-align:left;font-family:var(--mono);font-size:13px">${esc(x.message)}</b><small>${x.n} פעמים · ${esc(x.role||'')} · אחרונה ${new Date(x.last_at).toLocaleString('he-IL',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'})}</small></span><span class="end"><button class="btn sm alt" data-a="errok" data-v="${x.id}">טופל</button></span></div>`).join('')}</div>`:'<div class="panel"><p class="note" style="margin:0">אין שגיאות פתוחות.</p></div>'}`};
A.errok=v=>run(async()=>{await q(sb.from('client_errors').update({resolved:true}).eq('id',+v));await loadErrs()},'סומן כטופל');


/* ── אוטומציות: הגדרות לכל ארגון ── */
const myOrg=()=>(S._orgL||[]).find(o=>o.id===ME?.orgId)||{};
const sw=(id,on,label,sub)=>`<label class="li" style="cursor:pointer;align-items:flex-start"><span class="mt"><b>${label}</b><small>${sub}</small></span><span class="end"><input type="checkbox" data-in="auto" data-k="${id}" ${on?'checked':''} aria-label="${label}" style="width:22px;height:22px;accent-color:var(--ink)"></span></label>`;
document.addEventListener('change',e=>{const t=e.target;if(t.dataset?.in!=='auto')return;const k=t.dataset.k,v=t.checked;
  if(['auto_price','auto_approve','auto_print'].includes(k))run(()=>q(sb.from('organizations').update({[k]:v}).eq('id',ME.orgId)),v?'הופעל':'כובה');
  else run(()=>q(sb.from('settings').update({[k]:v}).eq('id',1)),v?'הופעל':'כובה')});

const _gm=V.gallery_more;V.gallery_more=()=>_gm()+`<h3>אוטומציה</h3><div class="list">${sw('auto_price',myOrg().auto_price,'תמחור אוטומטי','כל בקשה מתומחרת מיד לפי הנוסחה, בלי התאמה. אם לאמן יש הסכמה מראש, בקשה קטנה עוברת ישר לחתימה.')}</div>
  <h3>דוח חודשי</h3><div class="panel"><p class="note" style="margin-top:0">כל העסקאות ששולמו בחודש, עם החלוקה בין האמן, הגלריה והפלטפורמה.</p><button class="btn sm wide" data-a="stmt">להפיק דוח לחודש הקודם</button> <button class="btn sm alt wide" style="margin-top:8px" data-a="stmt" data-v="now">לחודש הנוכחי</button></div>`;
const _wm=V.winery_more;V.winery_more=()=>_wm()+`<h3>אוטומציה</h3><div class="list">${sw('auto_print',myOrg().auto_print!==false,'דפוס מיד אחרי תשלום','רישיון ששולם והזמנת לקוח שסימנת כמשולמת עוברים לבית הדפוס בלי לחיצה נוספת.')}</div>`;
const _ai=V.artist_income;if(_ai)V.artist_income=()=>_ai()+`<h3>דוח חודשי</h3><div class="panel"><p class="note" style="margin-top:0">מה הגיע אליך מכל רישיון שנסגר בחודש.</p><button class="btn sm wide" data-a="stmt">לחודש הקודם</button> <button class="btn sm alt wide" style="margin-top:8px" data-a="stmt" data-v="now">לחודש הנוכחי</button></div>`;

/* מנהל: הגדרות העבודה היומית */
async function loadDaily(){if(ME?.role!=='admin')return;try{S._daily=(await q(sb.from('audit_log').select('created_at,data').eq('action','daily').order('created_at',{ascending:false}).limit(1)))[0]||null}catch(e){}}
const _as2=V.admin_settings;V.admin_settings=()=>{const s=S._set||{},d=S._daily;
  return _as2()+`<h3>עבודה אוטומטית יומית</h3><div class="panel"><p class="note" style="margin-top:0">${d?`רצה לאחרונה ${new Date(d.created_at).toLocaleString('he-IL',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'})}: ${d.data?.reminders||0} תזכורות, ${d.data?.cancelled||0} בקשות נסגרו, ${d.data?.ended||0} רישיונות הסתיימו.`:'עוד לא רצה. כדי שתרוץ כל לילה צריך להפעיל ב-Supabase את התוסף pg_cron, ואז להריץ שוב את setup.sql.'}</p>
    <div class="two"><div class="fld"><label for="dsd">תזכורת אחרי (ימים)</label><input id="dsd" inputmode="numeric" value="${s.stale_days??3}"></div><div class="fld"><label for="dcd">סגירה אחרי (ימים)</label><input id="dcd" inputmode="numeric" value="${s.cancel_days??30}"></div></div>
    <div class="fld"><label for="drd">מחיקת פרטי לקוח מהזמנות שהסתיימו, אחרי (ימים)</label><input id="drd" inputmode="numeric" placeholder="ריק = לא מוחקים. עורך הדין יקבע" value="${s.customer_retention_days??''}"></div>
    <button class="btn sm wide" style="margin-top:10px" data-a="dailysave">לשמור</button></div>
  <div class="list" style="margin-top:10px">${sw('auto_picks',s.auto_picks!==false,'המלצות לפי פופולריות','שמונה היצירות שהכי מנסים ומזמינים ב-90 הימים האחרונים מופיעות ראשונות. כשכבוי, האוצרת בוחרת ידנית.')}</div>`};
A.dailysave=()=>{const n=id=>{const v=document.getElementById(id).value.replace(/\D/g,'');return v===''?null:+v};
  const u={stale_days:Math.max(1,n('dsd')||3),cancel_days:Math.max(7,n('dcd')||30),customer_retention_days:n('drd')};
  run(async()=>{await q(sb.from('settings').update(u).eq('id',1));await loadEngine()},'נשמר')};

/* ── דוח חודשי ── */
A.stmt=v=>{const d=new Date();if(v!=='now')d.setMonth(d.getMonth()-1);const m=new Date(d.getFullYear(),d.getMonth(),1);
  const iso=`${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,'0')}-01`,title=m.toLocaleDateString('he-IL',{month:'long',year:'numeric'});
  (async()=>{try{const rows=await q(sb.rpc('monthly_statement',{p_month:iso}));const sum=k=>rows.reduce((a,r)=>a+(+r[k]||0),0);
    const art=ME.role==='artist';
    openDoc(`דוח ${title}`,`<h1>דוח חודשי · ${title}</h1><div class="meta">${esc(ME.org||ME.name||'')} · הופק ${today()}</div>
    ${rows.length?`<table><tr><th>עסקה</th><th>תאריך</th><th>יקב</th><th>יצירה</th>${art?'':'<th>אמן</th>'}<th>לפני מע״מ</th>${art?'<th>החלק שלך</th>':'<th>לאמן</th><th>לגלריה</th><th>עמלה</th>'}</tr>
      ${rows.map(r=>`<tr><td>${r.deal_id}</td><td>${new Date(r.paid_at).toLocaleDateString('he-IL')}</td><td>${esc(r.winery)}</td><td>${esc(r.work)}</td>${art?'':`<td>${esc(r.artist)}</td>`}<td>${nis(r.net)}</td>${art?`<td>${nis(r.artist_share)}</td>`:`<td>${nis(r.artist_share)}</td><td>${nis(r.gallery_share)}</td><td>${nis(r.platform)}</td>`}</tr>`).join('')}
      <tr class="tot"><td colspan="${art?4:5}">סה״כ</td><td>${nis(sum('net'))}</td>${art?`<td>${nis(sum('artist_share'))}</td>`:`<td>${nis(sum('artist_share'))}</td><td>${nis(sum('gallery_share'))}</td><td>${nis(sum('platform'))}</td>`}</tr></table>`:'<p>לא נסגרו עסקאות בחודש הזה.</p>'}
    <p class="note">הסכומים לפני מע״מ. החלוקה לפי העמלה ואחוז האמן שהיו בתוקף בכל עסקה.</p>`)}catch(e){console.error(e);toast(heb2(e))}})()};

/* ── צילום אוטומטי לכל רישיון שנחתם, פעם אחת ── */
async function autoShoot(){if(ME?.role!=='winery'||!LX.shootReal)return;
  const ds=(S.deals||[]).filter(d=>['pay','active'].includes(d.st));if(!ds.length)return;
  let have=[];try{have=(await q(sb.from('renders').select('deal_id').in('deal_id',ds.map(d=>d.id)))).map(r=>r.deal_id)}catch(e){return}
  const d=ds.find(x=>!have.includes(x.id)&&!localStorage.getItem('wl-as-'+x.id));if(!d)return;
  try{localStorage.setItem('wl-as-'+d.id,'1')}catch(e){}
  const g=(S.designs||[]).find(x=>x.code===d.code)||{};
  try{await LX.shootReal({type:d.type,work:d.work,code:g.code||null,deal:d.id,o:{pos:g.pos??50,zoom:g.zoom??100,shape:g.shape||'rect',name:d.wineN,artist:d.artistN}});toast(`הצילום של הבקבוק לעסקה ${d.id} מוכן לשיווק`)}catch(e){console.warn('auto shoot',e)}}


/* ── סגירת מעגלים: לכל החלטה של אדם יש המשך ── */
const DV=v=>(S.deals||[]).find(d=>d.id===+v);
A.dcancel2=v=>{const t=document.getElementById('dcx').value.trim();closeSheet();run(()=>q(sb.rpc('advance_deal',{p_deal:+v,p_action:'cancel',p_adj:0,p_note:'היקב ביטל את הבקשה'+(t?': '+t:''),p_version:DV(v)?.ver??null})),'הבקשה בוטלה')};
A.wresend=v=>run(()=>q(sb.from('works').update({status:'pending',review_note:null}).eq('id',+v)),'היצירה נשלחה שוב לגלריה');
A.pfix2=v=>{const t=document.getElementById('pfx').value.trim();if(!t){document.getElementById('pfx').focus();return}closeSheet();run(()=>q(sb.rpc('print_issue',{p_deal:+v,p_note:t})),'הבקשה נשלחה לגלריה וליקב')};

/* ── התקנה לטלפון ── */
if(!document.querySelector('link[rel=manifest]'))document.head.insertAdjacentHTML('beforeend','<link rel="manifest" href="manifest.json"><meta name="theme-color" content="#E9E7E3">');
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
