/* label.js · אישור התווית בסבבים
   היינן והאמן או הגלריה מאשרים את התווית, מבקשים שינוי או מוסיפים הערה.
   כל בקשת שינוי פותחת סבב חדש ומאפסת את שני האישורים. האישור הסופי אף פעם לא אוטומטי. */
(function(){
'use strict';
if(!window.LX)return;
const {sb,q,heb2}=window.LX;
S._ln=S._ln||{};
const KEY=(e,id)=>e+':'+id;
const SIDE={winery:'היינן',art:'האמן או הגלריה',customer:'הלקוח',system:''};
const KIND={approve:'אישר',change:'ביקש שינוי',comment:'הערה',round:''};

async function loadNotes(e,id){try{S._ln[KEY(e,id)]=await q(sb.from('label_notes').select('*').eq('entity',e).eq('entity_id',+id).order('id'))}catch(x){S._ln[KEY(e,id)]=[]}}

function mySide(e,obj){const r=S.role;
  if(r==='winery')return 'winery';
  if(r==='gallery'||r==='artist')return 'art';
  if(r==='customer'&&e==='corder')return 'customer';
  return null}

function panel(e,obj){const k=KEY(e,obj.id),notes=S._ln[k];
  if(notes===undefined){loadNotes(e,obj.id).then(()=>render());}
  const rnd=obj.lr||1,okw=obj.okw===rnd,oka=obj.oka===rnd,side=mySide(e,obj);
  const open=e==='deal'?['sent','priced','sign'].includes(obj.st):['sent','review','label'].includes(obj.st);
  const done=okw&&oka;
  const chip=(n,ok)=>`<span style="display:inline-flex;align-items:center;gap:6px;border:1px solid ${ok?'var(--ink)':'var(--line)'};border-radius:999px;padding:3px 12px;font-size:14px;${ok?'background:var(--ink);color:var(--surface)':''}">${ok?'✓':'○'} ${n}${ok?' אישר':' ממתין'}</span>`;
  const wa=side==='winery'||side==='art',mine=side==='winery'?okw:oka;
  const canApprove=open&&wa&&!mine&&(e==='deal'||obj.st==='label');
  const canChange=open&&wa&&(e==='deal'||obj.st==='label');
  let lastR=0;
  const thread=(notes||[]).map(n=>{let h='';
    if(n.kind==='round'){lastR=n.round;return `<div class="msg sys" style="text-align:center">${esc(n.body||'סבב '+n.round)}</div>`}
    if(n.round!==lastR&&lastR===0)lastR=n.round;
    const who=SIDE[n.side]||'',t=new Date(n.created_at).toLocaleString('he-IL',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'});
    return h+`<div class="msg ${n.side===side?'me':''}"><b style="font-weight:600">${who}${KIND[n.kind]&&n.kind!=='comment'?` · ${KIND[n.kind]}`:''}</b>${n.body?`<br>${esc(n.body)}`:''}<small style="display:block;color:var(--muted);font-size:12px;margin-top:2px">${t}</small></div>`}).join('');
  return `<h3>אישור התווית${rnd>1?` · סבב ${rnd}`:''}</h3><div class="panel" data-label="${k}">
    <div style="display:flex;gap:8px;flex-wrap:wrap">${chip('היינן',okw)}${chip('האמן או הגלריה',oka)}</div>
    <p class="note" style="margin:10px 0 0">${done?'התווית אושרה על ידי שני הצדדים.':e==='deal'?'לפני החתימה צריך ששני הצדדים יאשרו את התווית. כל בקשת שינוי פותחת סבב חדש.':'אחרי שהיינן מאשר, התווית עוברת לאמן או לגלריה. כל בקשת שינוי מחזירה אותה ליקב ופותחת סבב חדש.'}</p>
    ${thread?`<div class="chat" style="margin-top:12px">${thread}</div>`:notes===undefined?'<p class="note">טוענים…</p>':''}
    ${open&&side?`<div class="fld" style="margin-top:12px"><label for="lnb">${side==='customer'?'הערה ליקב':'הערה או בקשת שינוי'}</label><textarea id="lnb" maxlength="1000" placeholder="${side==='customer'?'למשל: אפשר להגדיל את השם?':'למשל: להזיז את הציור מעט ימינה'}"></textarea></div>
      <div class="row" style="margin-top:10px;flex-wrap:wrap">${canApprove?`<button class="btn" data-a="lact" data-v="${e}:${obj.id}:approve">לאשר את התווית</button>`:''}${canChange?`<button class="btn alt" data-a="lact" data-v="${e}:${obj.id}:change">לבקש שינוי</button>`:''}<button class="btn alt" data-a="lact" data-v="${e}:${obj.id}:comment">להוסיף הערה</button></div>`:''}
  </div>`}

A.lact=v=>{const [e,id,act]=v.split(':'),body=(document.getElementById('lnb')?.value||'').trim();
  if(act!=='approve'&&!body){document.getElementById('lnb')?.focus();toast(act==='change'?'צריך לכתוב מה לשנות':'ההערה ריקה');return}
  const go=async()=>{try{await q(sb.rpc('label_action',{p_entity:e,p_id:+id,p_action:act,p_body:body||null}));await loadNotes(e,id);await window.liveHydrate();render();
      toast(act==='approve'?'אישרת את התווית':act==='change'?'בקשת השינוי נשלחה. נפתח סבב חדש':'ההערה נשלחה')}
    catch(x){console.error(x);toast(heb2(x))}};
  if(act==='approve')confirmSheet({t:'לאשר את התווית?',l:'לאשר',body:'<p class="note">האישור הוא לגרסה הנוכחית. אם מישהו יבקש שינוי, ייפתח סבב חדש וצריך יהיה לאשר שוב.</p>',ok:go});else go()};

/* בחדר העסקה */
const _vd=window.vDeal;
window.vDeal=vDeal=function(d){const r=_vd(d);if(!r||!r.html)return r;
  if(['rejected','cancelled'].includes(d.st))return r;
  const p=panel('deal',d),i=r.html.indexOf('<h3>');r.html=i>0?r.html.slice(0,i)+p+r.html.slice(i):r.html+p;
  /* חתימה רק אחרי ששני הצדדים אישרו */
  if(d.st==='sign'&&S.role==='winery'&&!(d.okw===(d.lr||1)&&d.oka===(d.lr||1))&&r.bar)
    r.bar=`<div class="actbar"><div class="t"><b>לפני החתימה: אישור התווית</b><span>${d.okw===(d.lr||1)?'מחכים לאישור האמן או הגלריה':'צריך לאשר את התווית למטה'}</span></div></div>`;
  return r};

/* בהזמנת לקוח */
const _co=VX.corder;
VX.corder=id=>{const r=_co(id),o=S.corders.find(x=>x.id===+id);if(!o||!r||!r.html||o.st==='cancel')return r;
  const p=panel('corder',o),i=r.html.indexOf('<h3>פרטים');r.html=i>0?r.html.slice(0,i)+p+r.html.slice(i):r.html+p;
  if(o.st==='label'&&(S.role==='gallery'||S.role==='artist'))r.bar=`<div class="actbar"><div class="t"><b>תורך: לאשר את התווית</b><span>היינן כבר אישר · ${esc(o.winery)}</span></div></div>`;
  return r};

/* רשימה לאמן ולגלריה: תוויות של לקוחות שמחכות להם */
function artBlock(){const L=(S.corders||[]).filter(o=>o.st==='label'&&o.oka!==(o.lr||1));if(!L.length)return '';
  return `<h3>תוויות של לקוחות לאישור (${L.length})</h3><div class="list">${L.map(o=>{const d=o.wv||o.d;return `<button class="li unread" data-a="go" data-v="corder-${o.id}"><span style="width:40px;flex:none">${typeof cbottle==='function'?cbottle(d,{wm:true}):''}</span><span class="mt"><b>${esc(work(d.work)?.t||'')} · ${esc(o.winery)}</b><small>הזמנה ${o.id}${(o.lr||1)>1?` · סבב ${o.lr}`:''}</small></span><span class="end">←</span></button>`}).join('')}</div>`}
for(const v of ['gallery_home','artist_home','artist_requests','gallery_deals']){const f=V[v];if(f)V[v]=()=>{const h=f(),b=artBlock();if(!b)return h;const i=h.indexOf('</h1>');return i>0?h.slice(0,i+5)+b+h.slice(i+5):b+h}}
})();
