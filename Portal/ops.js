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
    await q(sb.from('works').insert({artist_id:aid,title:u.t,year:u.y?+u.y:null,size:u.s||null,tag:u.g,tone:u.tn,technique:u.tc,orig_status:u.o,story:u.st||null,no_crop:u.cells||{},image_path:path,px_w:u.w||null,px_h:u.h||null,...pv}));
    log(`הועלתה יצירה: "${u.t}"`,'work');S.upload=null},'היצירה נשלחה לאישור הגלריה')};

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

/* ── התקנה לטלפון ── */
if(!document.querySelector('link[rel=manifest]'))document.head.insertAdjacentHTML('beforeend','<link rel="manifest" href="manifest.json"><meta name="theme-color" content="#E9E7E3">');
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
