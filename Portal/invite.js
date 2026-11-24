/* Grape Arts · הזמנה לפי מספר נייד: מאנשי הקשר בטלפון, וההודעה נשלחת בווטסאפ.
   יקב מזמין את הצוות שלו, גלריה מזמינה אמנים וצוות, המנהל מזמין לכל ארגון.
   כל קישור אישי: למספר אחד, לשימוש אחד, בתוקף 14 יום. */
(function(){
'use strict';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LIVE=()=>!!window.LIVE&&typeof window.ME==='object'&&window.ME&&window.ME.role;
const RN={winery:'יקב',gallery:'צוות גלריה',artist:'אמן',printer:'בית דפוס',curator:'אוצר'};
const KIND={winery:['winery'],gallery:['artist','gallery'],printer:['printer'],curator:['curator']};
const T=m=>{try{toast(m)}catch(e){}};

// אותו כלל כמו במסד: נייד ישראלי או מספר בינלאומי תקין
function norm(p){let d=String(p||'').replace(/\D/g,'');if(!d)return null;if(d.startsWith('00'))d=d.slice(2);if(d.startsWith('0'))d='972'+d.slice(1);
  if(!/^[1-9]\d{7,14}$/.test(d))return null;if(d.startsWith('972')&&!/^9725\d{8}$/.test(d))return null;return '+'+d}
const pretty=p=>/^\+9725\d{8}$/.test(p)?'0'+p.slice(4,6)+'-'+p.slice(6,9)+'-'+p.slice(9):p;
const canPick=()=>'contacts' in navigator&&'ContactsManager' in window;
const link=t=>`${location.origin}${location.pathname.replace(/[^/]*$/,'')}?j=${t}`;
const me=()=>LIVE()?(ME.name||''):((window.ROLES&&ROLES[S.role]&&ROLES[S.role].p)||'');
function orgName(){const st=S._iv;if(st&&st.org)return st.org.name;if(LIVE())return ME.orgName||'';return S.role==='winery'&&typeof MYW==='function'?MYW():'הגלריה'}
function msg(p){const st=S._iv,first=(p.name||'').trim().split(/\s+/)[0],o=orgName(),who=me();
  const what=st.role==='artist'?`להצטרף כאמן/ית בגלריה ${o}`:st.role==='curator'?'להצטרף כאוצר/ת':`להצטרף לצוות של ${o}`;
  return `${first?'שלום '+first+', ':'שלום, '}${who?who+' מזמין/ה אותך':'הוזמנת'} ל־Grape Arts, ${what}.\nזה הקישור האישי שלך (בתוקף 14 יום):\n${link(p.token)}`}
const wa=p=>`https://wa.me/${p.phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg(p))}`;

async function make(p){
  const st=S._iv;
  try{
    if(LIVE()){p.token=await q(sb.rpc('create_invite',{p_role:st.role,p_phone:p.phone,p_name:p.name||null,p_org:st.org&&st.org.id||null}))}
    else{p.token=[...crypto.getRandomValues(new Uint8Array(16))].map(x=>x.toString(16).padStart(2,'0')).join('')}
    p.err=null;
  }catch(e){p.err=typeof heb==='function'?heb(e):(e.message||'ההזמנה לא נוצרה')}
}
async function loadSent(){if(!LIVE())return;try{S._iv.sent=await q(sb.rpc('my_invites'))||[]}catch(e){S._iv.sent=[]}}

function view(){
  const st=S._iv;if(!st)return;
  const roles=st.org?KIND[st.org.kind]||[]:st.roles;
  const orgSel=st.orgs?`<div class="fld"><label for="ivorg">ארגון</label><select id="ivorg" data-in="ivorg">${st.orgs.filter(o=>KIND[o.kind]).map(o=>`<option value="${E(o.id)}" ${st.org&&st.org.id===o.id?'selected':''}>${E(o.name)}</option>`).join('')}</select></div>`:'';
  const roleSel=roles.length>1?`<div class="fld"><label>מזמינים בתור</label><div class="chips">${roles.map(r=>`<button class="chip" data-a="ivrole" data-v="${r}" aria-pressed="${st.role===r}">${RN[r]}</button>`).join('')}</div></div>`:'';
  const ppl=st.people.map((p,i)=>`<div class="li"><span class="mt"><b>${E(p.name||'בלי שם')}</b><small class="num" dir="ltr" style="text-align:right">${E(pretty(p.phone||''))}</small>${p.err?`<small style="color:#9B2C2C;font-weight:600">${E(p.err)}</small>`:''}</span>
    <span class="end" style="display:flex;gap:6px;align-items:center">${p.token?`<a class="btn sm iv-wa" style="text-decoration:none" href="${E(wa(p))}" target="_blank" rel="noopener" data-i="${i}">${p.sent?'✓ נשלח':'לשלוח בווטסאפ'}</a>`:''}${p.token?`<button class="ib" data-a="ivcopy" data-v="${i}" aria-label="להעתיק את הקישור">⧉</button>`:''}</span></div>`).join('');
  const sent=(st.sent||[]).filter(x=>x.phone);
  const stat=x=>x.revoked?'בוטל':(x.max_uses&&x.uses>=x.max_uses)?'הצטרף':new Date(x.expires_at)<new Date()?'פג תוקף':'ממתין להצטרפות';
  sheet(`<span class="eyebrow">הזמנה בווטסאפ</span><h2>${E(st.title)}</h2>
  <p class="lead" style="margin-top:4px">בוחרים אנשים, ושולחים לכל אחד קישור אישי בווטסאפ. מי שנכנס דרכו מצטרף ישר${st.org?' ל־'+E(st.org.name):''}, בלי לחכות לאישור.</p>
  ${orgSel}${roleSel}
  ${canPick()?`<button class="btn wide" data-a="ivpick">לבחור מאנשי הקשר</button><p class="note" style="text-align:center;margin:8px 0">או להקליד</p>`:''}
  <div class="two"><div class="fld"><label for="ivname">שם</label><input id="ivname" autocomplete="off" placeholder="למשל: נוי כהן"></div><div class="fld"><label for="ivph">נייד</label><input id="ivph" type="tel" inputmode="tel" dir="ltr" autocomplete="off" placeholder="050-0000000"></div></div>
  <button class="btn ${canPick()?'alt ':''}wide" style="margin-top:10px" data-a="ivadd">להוסיף</button>
  <p class="note" id="iverr" role="alert" style="color:#9B2C2C"></p>
  ${ppl?`<h3>להזמנה עכשיו</h3><div class="list">${ppl}</div><p class="note">לחיצה על "לשלוח בווטסאפ" פותחת שיחה עם ההודעה מוכנה. נשאר רק ללחוץ שלח.</p>`:''}
  <p class="note">כל קישור אישי: לאדם אחד, לשימוש אחד, בתוקף 14 יום. מי שנכנס עם מספר נייד אחר לא יוכל להשתמש בו.</p>
  ${sent.length?`<h3>הזמנות שנשלחו</h3><div class="list">${sent.slice(0,30).map(x=>`<div class="li"><span class="mt"><b>${E(x.name||pretty(x.phone))}</b><small>${E(RN[x.role]||x.role)} · ${stat(x)}</small></span>${stat(x)==='ממתין להצטרפות'?`<span class="end" style="display:flex;gap:6px"><a class="btn sm alt" style="text-decoration:none" href="${E(wa({name:x.name,phone:x.phone,token:x.token}))}" target="_blank" rel="noopener">שוב</a><button class="btn sm alt" data-a="ivoff" data-v="${E(x.token)}">לבטל</button></span>`:''}</div>`).join('')}</div>`:''}`);
}

async function open(o){
  S._iv={title:o.title||'להזמין',roles:o.roles||['winery'],role:(o.roles||['winery'])[0],org:o.org||null,orgs:o.orgs||null,people:[],sent:[]};
  if(S._iv.orgs&&!S._iv.org){S._iv.org=S._iv.orgs.find(x=>KIND[x.kind])||null}
  if(S._iv.org)S._iv.role=(KIND[S._iv.org.kind]||[S._iv.role])[0];
  view();await loadSent();if(S._iv&&document.getElementById('ivph'))view();
}
async function add(list){const st=S._iv;for(const p of list){if(st.people.some(x=>x.phone&&x.phone===p.phone))continue;st.people.push(p);if(p.phone&&!p.err)await make(p)}view()}

A.invteam=()=>open({title:'להזמין חבר צוות',roles:['winery']});
A.invartist=()=>open({title:'להזמין אמן או צוות',roles:['artist','gallery']});
A.invadmin=()=>open({title:'להזמין לארגון',orgs:(S.orgs||[]).filter(o=>KIND[o.kind])});
A.ivrole=v=>{S._iv.role=v;view()};
A.ivpick=async()=>{
  let cs=[];try{cs=await navigator.contacts.select(['name','tel'],{multiple:true})}catch(e){return}
  await add((cs||[]).map(c=>{const ph=(c.tel||[]).map(norm).find(Boolean);return {name:(c.name||[])[0]||'',phone:ph||((c.tel||[])[0]||''),err:ph?null:'אין כאן מספר נייד תקין'}}));
};
A.ivadd=async()=>{const n=document.getElementById('ivname'),t=document.getElementById('ivph'),ph=norm(t&&t.value);
  if(!ph){const e=document.getElementById('iverr');if(e)e.textContent='מספר הנייד לא תקין';t&&t.focus();return}
  await add([{name:(n&&n.value||'').trim(),phone:ph}]);setTimeout(()=>document.getElementById('ivname')?.focus(),50)};
// קישור לווטסאפ: לא עובר דרך מנהל הלחיצות הכללי, כדי שהמעבר לווטסאפ לא ייחסם
document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a.iv-wa');if(!a||!S._iv)return;const p=S._iv.people[+a.dataset.i];if(p){p.sent=true;setTimeout(view,400)}},true);
A.ivcopy=v=>{const p=S._iv.people[+v];if(!p||!p.token)return;navigator.clipboard?.writeText(link(p.token)).then(()=>T('הקישור הועתק'),()=>T(link(p.token)))};
A.ivoff=v=>{(async()=>{try{if(LIVE())await q(sb.rpc('revoke_invite',{p_token:v}));await loadSent();view();T('ההזמנה בוטלה')}catch(e){T(typeof heb==='function'?heb(e):'לא בוטל')}})()};
document.addEventListener('change',e=>{if(e.target&&e.target.id==='ivorg'&&S._iv){const o=(S._iv.orgs||[]).find(x=>x.id===e.target.value);S._iv.org=o||null;S._iv.role=(KIND[o&&o.kind]||['winery'])[0];view()}});
// הזנה מהירה: Enter בשדה הנייד מוסיף
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target&&e.target.id==='ivph'){e.preventDefault();A.ivadd()}});

/* ── כפתורי ההזמנה במסכים של היקב, הגלריה והמנהל ── */
function wrap(){
  const W=V.winery_more;if(W&&!W._iv){V.winery_more=function(){let h=W.apply(this,arguments);
    const btn='<button class="btn alt wide" style="margin-top:10px" data-a="invteam">להזמין חבר צוות בווטסאפ</button>';
    h=h.replace(/<button class="btn alt wide" style="margin-top:10px" data-a="toast" data-v="ההזמנה נשלחה בקישור לנייד">להזמין משתמש<\/button>/,btn)
       .replace(/<p class="note">משתמש נוסף נכנס עם המייל שלו, ומנהל המערכת משייך אותו ליקב\.<\/p>/,btn);return h};V.winery_more._iv=1}
  const G=V.gallery_artists;if(G&&!G._iv){V.gallery_artists=function(){let h=G.apply(this,arguments);
    const btn='<button class="btn alt wide" style="margin-top:14px" data-a="invartist">להזמין אמן בווטסאפ</button>';
    h=h.replace(/<button class="btn alt wide" style="margin-top:14px" data-a="invite">להזמין אמן<\/button>/,btn)
       .replace(/<p class="note">אמן חדש נכנס עם המייל שלו, ומנהל המערכת משייך אותו לגלריה\.<\/p>/,btn);return h};V.gallery_artists._iv=1}
  const S_=V.admin_settings;if(S_&&!S_._iv){V.admin_settings=function(){let h=S_.apply(this,arguments);
    return h.replace('<h3>קישורי הצטרפות</h3><div class="panel">','<h3>קישורי הצטרפות</h3><div class="panel"><button class="btn sm wide" style="margin-bottom:10px" data-a="invadmin">להזמין לפי נייד, בווטסאפ</button>')};V.admin_settings._iv=1}
}
wrap();document.addEventListener('DOMContentLoaded',()=>{wrap();try{if(S.role)render()}catch(e){}});
window.GAInvite={open,norm,pretty,wrap};
})();
