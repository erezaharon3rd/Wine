/* סדנת התווית · שכבת החיבור ל־Supabase
   נטען רק כשקיים config.js וכתובת האתר אינה ?demo.
   האב־טיפוס נשאר כמו שהוא; כאן מחליפים את מקור הנתונים ואת הפעולות. */
'use strict';
(function(){
const sb=supabase.createClient(window.SB_URL,window.SB_KEY,{auth:{detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
window.SB=sb;
const LV={state:'boot',email:'',err:'',cool:0};
const one=x=>Array.isArray(x)?x[0]:x;
const tm=t=>t?new Date(t).toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'}):'';
const dt=t=>t?String(t).slice(0,10):'';
async function q(p){const {data,error}=await p;if(error)throw error;return data}
const ROLE_N={winery:'יקב',artist:'אמן',gallery:'גלריה',curator:'אוצר',printer:'שותף דפוס',admin:'מנהל מערכת'};
const ORG_N={winery:'יקב',gallery:'גלריה',printer:'בית דפוס',curator:'אוצרות',admin:'הפלטפורמה'};

function heb(e){
  const m=String(e?.message||e||'');
  if(/rate limit|only request this after|security purposes/i.test(m))return 'נשלחו כבר כמה קישורים. כדאי לחכות דקה ולנסות שוב';
  if(/expired|invalid.*(link|token)|otp/i.test(m))return 'הקישור פג או כבר נוצל. אפשר לבקש קישור חדש';
  if(/Failed to fetch|NetworkError|network/i.test(m))return 'אין חיבור לשרת. כדאי לבדוק את האינטרנט ולנסות שוב';
  if(/row-level security|permission denied/i.test(m))return 'אין הרשאה לפעולה הזו';
  if(/[֐-׿]/.test(m))return m;
  return 'משהו לא הצליח. אפשר לנסות שוב';
}

/* ── UI state that stays in the browser ── */
window.liveSave=function(){try{localStorage.setItem('wl-live-ui',JSON.stringify({seen:S.seen,read:S.read,f:S.f,activeWine:S.activeWine}))}catch(e){}};
Object.assign(S,{works:[],wines:[],designs:[],deals:[],apps:[],renderQ:[],log:[],users:[],role:null,tab:null,view:null,pre:false,restrict:{},renders:0});
try{const o=JSON.parse(localStorage.getItem('wl-live-ui')||'null');if(o)Object.assign(S,o)}catch(e){}
document.head.insertAdjacentHTML('beforeend','<style>.demobadge{display:none}.lv-spin{width:28px;height:28px;border:2px solid var(--line);border-top-color:var(--ink);border-radius:50%;animation:lvs .8s linear infinite;margin:40px auto}@keyframes lvs{to{transform:rotate(360deg)}}.lv-sel{width:100%;min-height:48px;border:1px solid var(--line);border-radius:10px;background:var(--surface);padding:0 12px}</style>');

/* ── async runner ── */
let busy=false;
async function run(fn,ok){
  if(busy)return;busy=true;
  try{await fn();await hydrate();render();if(ok)toast(ok)}
  catch(e){console.error(e);toast(heb(e))}
  finally{busy=false}
}
const rpc=(fn,args)=>q(sb.rpc(fn,args));
const adv=(id,action,adj=0,note=null)=>rpc('advance_deal',{p_deal:+id,p_action:action,p_adj:adj,p_note:note});

/* ── screens before the app ── */
function vLive(){
  if(LV.state==='boot')return `<div class="login"><div class="lv-spin" role="status" aria-label="טוען"></div></div>`;
  if(LV.state==='login')return `<div class="login"><span class="eyebrow">אמנות אמיתית על בקבוק</span><h1>סדנת התווית</h1><p class="lead">שוק אצור שבו יקבים בוחרים ציורים של אמנים, רואים את הבקבוק המוגמר וסוגרים רישיון במקום אחד.</p>
    ${LV.err?`<div class="panel" style="margin-top:8px;font-size:14.5px">${esc(LV.err)}</div>`:''}
    <div class="fld" id="lemf"><label for="lem">דוא״ל</label><input id="lem" type="email" inputmode="email" autocomplete="email" dir="ltr" placeholder="name@example.com" value="${esc(LV.email)}"><span class="err" id="lemerr" hidden>צריך כתובת דוא״ל תקינה</span></div>
    <button class="btn wide" style="margin-top:14px" data-a="lsend">לקבל קישור כניסה</button><p class="note">בלי סיסמה. נשלח אליך מייל עם קישור, ולחיצה עליו מכניסה למערכת.</p></div>`;
  if(LV.state==='sent')return `<div class="login"><span class="eyebrow">כמעט שם</span><h1>בדוק את המייל</h1><p class="lead">שלחנו קישור כניסה ל־<span class="num">${esc(LV.email)}</span>. כדאי לפתוח אותו בטלפון הזה וללחוץ על הקישור. אם המייל לא מגיע תוך דקה, כדאי לבדוק גם בתיקיית הספאם.</p>
    <div class="row" style="justify-content:space-between;margin-top:18px"><button class="link" data-a="lchange">לשנות כתובת</button><button class="link" data-a="lsend">לשלוח שוב</button></div></div>`;
  if(LV.state==='pending')return `<div class="login"><span class="eyebrow">החשבון נוצר</span><h1>ממתין לאישור</h1><p class="lead">נכנסת בהצלחה עם <span class="num">${esc(ME?.email||'')}</span>. ${ME?.status==='blocked'?'החשבון הזה מושהה. לבירור אפשר לפנות למנהל המערכת.':'מנהל המערכת צריך לשייך את החשבון לתפקיד ולארגון. אחרי זה המערכת תיפתח כאן.'}</p>
    <div class="row" style="margin-top:18px"><button class="btn alt" data-a="lrecheck">לבדוק שוב</button><button class="btn alt" data-a="logout">להתנתק</button></div></div>`;
  return `<div class="login"><h1>משהו לא הצליח</h1><p class="lead">${esc(LV.err)}</p><button class="btn wide" data-a="lrecheck">לנסות שוב</button></div>`;
}
const _render=render;
render=function(){if(LV.state!=='ready'){document.getElementById('app').innerHTML=vLive();document.body.classList.remove('hasbar');return}_render()};

Object.assign(A,{
  async lsend(){
    const i=document.getElementById('lem');const em=(i?i.value:LV.email).trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){document.getElementById('lemf')?.classList.add('bad');const er=document.getElementById('lemerr');if(er)er.hidden=false;i?.focus();return}
    if(Date.now()<LV.cool){toast('אפשר לשלוח שוב בעוד דקה');return}
    LV.email=em;LV.err='';
    const {error}=await sb.auth.signInWithOtp({email:em,options:{emailRedirectTo:location.origin+location.pathname,shouldCreateUser:true}});
    if(error){toast(heb(error));return}
    LV.cool=Date.now()+60000;LV.state='sent';render();
  },
  lchange(){LV.state='login';render();setTimeout(()=>document.getElementById('lem')?.focus(),50)},
  async lrecheck(){LV.state='boot';render();const {data:{session}}=await sb.auth.getSession();if(!session){LV.state='login';render();return}await loadMe(session.user)},
  async logout(){await sb.auth.signOut();window.ME=null;S.role=null;S.view=null;closeSheet();LV.state='login';history.replaceState(null,'',location.pathname);render()},
  role(v){if(ME?.role!=='admin'&&v!==ME?.role)return;S.role=v;S.view=null;S.tab=TABS[v][0][0];if(S.sheetOpen){S.pending='tab-'+S.tab;closeSheet()}else go('tab-'+S.tab);afterRole()},
  reset(){A.logout()}
});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='lem')A.lsend()});

/* ── identity ── */
async function loadMe(user){
  try{
    const p=await q(sb.from('profiles').select('*, org:organizations(id,name,kind)').eq('id',user.id).maybeSingle());
    if(!p||p.status!=='active'||!p.role){window.ME={id:user.id,email:user.email,status:p?.status};LV.state='pending';render();return}
    const a=await q(sb.from('artists').select('*').eq('user_id',user.id).maybeSingle());
    window.ME={id:user.id,email:user.email,role:p.role,name:p.full_name||user.email.split('@')[0],orgId:p.org_id,orgName:p.org?.name||'',artist:a};
    const first=ME.name.split(' ')[0];
    const r=ROLES[ME.role];r.p=ME.name;r.who=ME.role==='artist'?(a?.name||ME.name):(ME.orgName||r.who);r.hi='שלום, '+first;r.u=ME.name.replace(/[^\p{L} ]/gu,'').split(' ').map(x=>x[0]).join('').slice(0,2)||'?';
    if(a){ROLES.artist.who=a.name;ROLES.artist.p=a.name}
    await hydrate();
    LV.state='ready';S.role=ME.role;S.view=null;S.tab=TABS[S.role][0][0];
    if(location.hash==='#tab-'+S.tab)render();else location.hash='tab-'+S.tab;
    afterRole();
  }catch(e){console.error(e);LV.state='error';LV.err=heb(e);render()}
}

/* ── load everything this user is allowed to see ── */
async function hydrate(){
  const R=ME.role,adm=R==='admin';
  const [st,artists,works,wines,designs,deals]=await Promise.all([
    q(sb.from('settings').select('*').eq('id',1).maybeSingle()),
    q(sb.from('artists').select('*')),
    q(sb.from('works').select('*').order('id')),
    q(sb.from('wines').select('*').order('id')),
    q(sb.from('designs').select('*')),
    q(sb.from('deals').select('*, winery:organizations!deals_winery_id_fkey(name), gallery:organizations!deals_gallery_id_fkey(name), wine:wines(name,vintage,type), invoices(number,total), print_orders(stage,qty,due), deal_messages(sender_role,body,created_at)').order('id',{ascending:false}))
  ]);
  if(st){S.comm=+st.comm_pct;S.commDraft=S.comm;S.quota=st.render_quota;S.artistShare=+st.artist_share}
  const AR={};(artists||[]).forEach(a=>AR[a.id]=a);S._artists=AR;
  const me=ME.artist?AR[ME.artist.id]||ME.artist:(artists||[])[0];
  S.floor=+(me?.floor_price||2500);S.bio=me?.bio||'';S.restrict={};(me?.restrict_tags||[]).forEach(k=>S.restrict[k]=true);
  const paths=(works||[]).map(w=>w.image_path).filter(Boolean);let urls={};
  if(paths.length){try{const r=await q(sb.storage.from('works').createSignedUrls(paths,3600));r.forEach(x=>{if(x.signedUrl)urls[x.path]=x.signedUrl})}catch(e){console.warn(e)}}
  S.works=(works||[]).map(w=>({id:w.id,t:w.title,tag:w.tag||'אחר',tone:w.tone||'—',st:w.status==='paused'?'live':w.status==='rejected'?'pending':w.status,rej:w.status==='rejected',note:w.review_note,av:w.available&&w.status!=='paused',pick:w.pick_rank||0,y:w.year,sz:w.size||'',cells:w.no_crop||{},src:urls[w.image_path]||BLANK,artist:w.artist_id,artistN:AR[w.artist_id]?.name}));
  S.wines=(wines||[]).map(w=>({id:w.id,n:w.name,y:w.vintage||'',type:WINE[w.type]?w.type:'red',q:w.bottles||0,org:w.winery_id}));
  if(!S.wines.some(w=>w.id===S.activeWine))S.activeWine=S.wines[0]?.id;
  S.designs=(designs||[]).map(d=>({code:d.code,wine:d.wine_id,work:d.work_id,pos:d.pos,zoom:d.zoom,shape:d.layout?.shape}));
  S.deals=(deals||[]).map(d=>{const inv=one(d.invoices),o=one(d.print_orders),wi=d.wine;return {
    id:d.id,winery:d.winery?.name||'',galleryN:d.gallery?.name||'',artistN:AR[d.artist_id]?.name||'',fl:+(AR[d.artist_id]?.floor_price||S.floor),
    wineN:d.wine_label||(wi?`${wi.name} ${wi.vintage||''}`.trim():''),type:WINE[wi?.type]?wi.type:'red',work:d.work_id,lt:d.license_type,q:d.qty_tier,ex:d.exclusive,
    st:d.status==='cancelled'?'rejected':d.status,adj:d.adj_pct,code:d.design_code||'—',note:d.status==='rejected'||d.status==='cancelled'?'':d.note,reason:d.status==='rejected'||d.status==='cancelled'?(d.note||(d.status==='cancelled'?'בוטלה':'')):'',
    paid:dt(d.paid_at),ends:dt(d.ends_at),inv:inv?.number||'',order:o?{st:o.stage,qty:o.qty,due:dt(o.due)}:null,
    chat:(d.deal_messages||[]).sort((a,b)=>a.created_at.localeCompare(b.created_at)).map(m=>({w:m.sender_role||'sys',t:m.body,at:tm(m.created_at)}))}});
  S.deals.forEach(d=>{if(!S.works.some(w=>w.id===d.work))S.works.push({id:d.work,t:'יצירה',tag:'',st:'hidden',av:false,cells:{},src:BLANK})});
  if(adm||R==='curator'){
    const ap=await q(sb.from('applications').select('*').order('id',{ascending:false}));
    S.apps=ap.map(a=>({id:a.id,n:a.name,d:a.details||'',site:a.site||'',why:a.why||'',st:a.status==='approved'?'ok':a.status==='rejected'?'no':'new'}));
  }
  if(adm){
    const [pr,og,lg]=await Promise.all([q(sb.from('profiles').select('*').order('created_at')),q(sb.from('organizations').select('*').order('created_at')),q(sb.from('audit_log').select('*').order('id',{ascending:false}).limit(200))]);
    S.profiles=pr;S.orgs=og;
    const PN={};pr.forEach(p=>PN[p.id]=p.full_name||p.email);
    const AN={price:'הגלריה תמחרה',approve:'האמן הסכים',sign:'היקב חתם',paid:'התשלום אושר',reject:'בקשה נדחתה',change:'האמן ביקש שינוי',order:'הוזמן דפוס',cancel:'בקשה בוטלה',request:'בקשת רישיון חדשה'};
    S.log=lg.map(l=>({t:(AN[l.action]?`${AN[l.action]} · עסקה ${l.entity_id}`:l.action),type:l.entity==='deal'?'deal':l.entity==='work'?'work':'admin',when:new Date(l.created_at).toLocaleString('he-IL',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'}),who:PN[l.actor]||'מערכת'}));
  }
}
const BLANK='data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 5"><rect width="4" height="5" fill="#E4E4E2"/></svg>');

/* ── log: shown locally, written to the audit log ── */
log=function(t,type='deal'){S.log.unshift({t,type,when:now(),who:ME?.name||'מערכת'});sb.from('audit_log').insert({action:t,entity:type}).then(()=>{})};
sys=function(d,t){};

/* ── confirm-sheet actions: keep the original sheet, replace what "ok" does ── */
function liveOk(name,fn){const orig=A[name];A[name]=function(v){orig.call(A,v);S._ok=()=>run(()=>fn(v),null)}}
liveOk('signS',async v=>{await adv(v,'sign');toast('החוזה נחתם. החשבונית בדרך')});
liveOk('porder',async v=>{await adv(v,'order');toast('ההזמנה נשלחה לבית הדפוס')});
liveOk('app',async v=>{const [i,s]=v.split(':');await q(sb.from('applications').update({status:s==='ok'?'approved':'rejected'}).eq('id',S.apps[+i].id));log(`בקשת הצטרפות: ${S.apps[+i].n} ${s==='ok'?'התקבלה':'נדחתה'}`,'admin')});
liveOk('deld',async code=>{await q(sb.from('designs').delete().eq('code',code));toast('העיצוב נמחק');go('tab-designs')});
liveOk('savecomm',async()=>{await q(sb.from('settings').update({comm_pct:S.commDraft,updated_at:new Date().toISOString()}).eq('id',1));log(`עמלת פלטפורמה: ${S.comm}% ← ${S.commDraft}%`,'admin');toast('העמלה עודכנה')});
const _avail=A.avail;
A.avail=function(v){const w=work(+v);if(w.av){_avail(v);S._ok=()=>run(async()=>{await q(sb.from('works').update({available:false}).eq('id',+v));log(`"${w.t}" הוסתרה מהמאגר`,'work')},'היצירה הוסתרה')}else run(async()=>{await q(sb.from('works').update({available:true}).eq('id',+v))},'היצירה זמינה שוב לרישוי')};

/* ── deal flow ── */
A.price=function(v){const note=document.getElementById('pnote').value.trim();if(S._adj&&!note){document.getElementById('pnote').closest('.fld').classList.add('bad');document.getElementById('pnote').focus();return}
  const adj=S._adj||0;closeSheet();run(async()=>{await adv(v,'price',adj,note||null);if(note)await q(sb.from('deal_messages').insert({deal_id:+v,body:note}))},'ההצעה עברה לאמן')};
A.consent=v=>{closeSheet();run(()=>adv(v,'approve'),'ההסכמה נשמרה. החוזה נשלח ליקב')};
A.reject=v=>{const r=(S._rsn||'')+((document.getElementById('rtx')?.value.trim())?': '+document.getElementById('rtx').value.trim():'');S._rsn=null;closeSheet();run(()=>adv(v,'reject',0,r||null),'הבקשה נדחתה')};
A.change=v=>{const t=document.getElementById('chx').value.trim();if(!t){document.getElementById('chx').focus();return}closeSheet();run(async()=>{await q(sb.from('deal_messages').insert({deal_id:+v,body:t}));await adv(v,'change')},'הבקשה חזרה לגלריה')};
A.paid=v=>{const d=deal(+v);const amt=+(document.getElementById('pam').value.replace(/\D/g,''));if(Math.abs(amt-price(d).gross)>1){document.getElementById('pam').closest('.fld').classList.add('bad');toast('הסכום שונה מהחשבונית. כדאי לבדוק');return}
  const inv=document.getElementById('pin').value.trim();closeSheet();run(()=>adv(v,'paid',0,inv||null),'התשלום אושר. הקבצים נפתחו ליקב')};
A.chat=v=>{const i=document.getElementById('chatin');const t=i.value.trim();if(!t)return;i.value='';run(()=>q(sb.from('deal_messages').insert({deal_id:+v,body:t})))};
A.pre=()=>toast('הסכמה מראש תגיע בגרסה הבאה');
A.sendreq=function(){const D=S.draft,wi=wine(D.wine);const note=document.getElementById('rnote')?.value.trim();
  run(async()=>{
    let ex=S.designs.find(d=>d.code===D.code)||S.designs.find(d=>d.work===D.work&&d.wine===D.wine);
    if(!ex)ex={code:await insertDesign(D)};
    const id=await rpc('request_license',{p_work:D.work,p_wine:D.wine,p_design:ex.code,p_label:`${wi.n} ${wi.y}`.trim(),p_type:D.lt,p_qty:D.q,p_exclusive:!!D.ex});
    if(note)await q(sb.from('deal_messages').insert({deal_id:id,body:note}));
    S.draft=null;S._go='deal-'+id;
  },'הבקשה נשלחה לגלריה').then(()=>{if(S._go){const g=S._go;S._go=null;go(g)}});
};

/* design codes are unique across the whole system; another winery may already hold one */
async function insertDesign(D){
  const pre={red:'R',white:'W',rose:'RS'}[wine(D.wine).type]||'X';
  for(let n=1;n<1000;n++){const code=pre+String(n).padStart(2,'0');if(S.designs.some(d=>d.code===code))continue;
    const {error}=await sb.from('designs').insert({code,wine_id:D.wine,work_id:D.work,pos:D.pos||50,zoom:D.zoom||100,layout:{shape:D.shape||null},created_by:ME.id});
    if(!error)return code;if(error.code!=='23505')throw error}
  throw new Error('לא נמצא קוד פנוי לעיצוב');
}
/* ── designs ── */
A.savedesign=function(){const D=S.draft;
  run(async()=>{
    if(D.code&&S.designs.find(x=>x.code===D.code)){await q(sb.from('designs').update({wine_id:D.wine,pos:D.pos,zoom:D.zoom,layout:{shape:D.shape||null}}).eq('code',D.code));S._msg=`העיצוב ${D.code} עודכן`}
    else{const code=await insertDesign(D);S._msg=`נשמר כעיצוב ${code}`}
    S.f.dz=wine(D.wine).type;S.draft=null;
  }).then(()=>{if(S._msg){toast(S._msg);S._msg=null;go('tab-designs')}});
};
A.dupd=function(code){const d=S.designs.find(x=>x.code===code);run(async()=>{S._msg=`נוצר עותק ${await insertDesign(d)}`}).then(()=>{if(S._msg){toast(S._msg);S._msg=null}})};
A.addwine2=function(){const n=document.getElementById('wn').value.trim(),y=+document.getElementById('wy').value,qq=+document.getElementById('wq').value.replace(/\D/g,'');if(!n||!y||!qq){toast('צריך שם, בציר וכמות');return}
  if(!ME.orgId||ME.role!=='winery'&&ME.role!=='admin'){toast('רק יקב יכול להוסיף יין');return}
  const t=document.getElementById('wt').value;closeSheet();run(async()=>{const r=await q(sb.from('wines').insert({winery_id:ME.orgId,name:n,vintage:y,type:t,bottles:qq}).select('id').single());S.activeWine=r.id},'היין נוסף')};

/* ── works ── */
A.doupload=function(){const u=S.upload;u.t=document.getElementById('ut').value.trim();u.y=document.getElementById('uy').value.trim();u.s=document.getElementById('us').value.trim();u.e={t:!u.t,y:!/^\d{4}$/.test(u.y)};if(u.e.t||u.e.y){uploadSheet();return}
  const aid=ME.artist?.id;if(!aid){toast('לחשבון הזה אין פרופיל אמן');return}
  const tag=document.getElementById('ug').value;closeSheet();toast('מעלה את היצירה…');
  run(async()=>{const blob=await (await fetch(u.src)).blob();const ext=(blob.type.split('/')[1]||'jpg').replace('jpeg','jpg');const path=`${ME.id}/${Date.now()}.${ext}`;
    await q(sb.storage.from('works').upload(path,blob,{contentType:blob.type,upsert:false}));
    await q(sb.from('works').insert({artist_id:aid,title:u.t,year:+u.y,size:u.s,tag,no_crop:u.cells||{},image_path:path}));
    log(`האמן העלה את "${u.t}"`,'work');S.upload=null},'היצירה נשלחה לאישור הגלריה')};
const wst=(id,st,msg,extra={})=>run(()=>q(sb.from('works').update({status:st,...extra}).eq('id',+id)),msg);
A.gapprove=v=>wst(v,'review','עברה לבדיקת קובץ אצל האוצר');
A.greturn2=v=>{const t=document.getElementById('gn').value.trim();if(!t){document.getElementById('gn').focus();return}closeSheet();wst(v,'rejected','הוחזרה לאמן עם ההערה',{review_note:t})};
A.creturn=v=>wst(v,'pending','הוחזרה לגלריה');
A.cok=v=>wst(v,'live','היצירה במאגר');
A.pick=v=>{const w=work(+v);run(async()=>{if(w.pick){const p=w.pick;await q(sb.from('works').update({pick_rank:null}).eq('id',w.id));for(const x of S.works.filter(x=>x.pick>p))await q(sb.from('works').update({pick_rank:x.pick-1}).eq('id',x.id))}else await q(sb.from('works').update({pick_rank:S.works.filter(x=>x.pick).length+1}).eq('id',w.id))})};
A.mv=v=>{const [id,dir]=v.split(':');const w=work(+id);const o=S.works.find(x=>x.pick===w.pick+(+dir));if(!o)return;run(async()=>{await q(sb.from('works').update({pick_rank:w.pick}).eq('id',o.id));await q(sb.from('works').update({pick_rank:o.pick}).eq('id',w.id))})};
A.savecells=v=>{const c={...S._cells};closeSheet();run(()=>q(sb.from('works').update({no_crop:c}).eq('id',+v)),'האזורים נשמרו')};

/* ── artist profile and price list ── */
const artistId=()=>ME.artist?.id||Object.keys(S._artists||{})[0];
A.savebio=()=>{const b=document.getElementById('bio').value.trim();run(()=>q(sb.from('artists').update({bio:b}).eq('id',artistId())),'הביוגרפיה נשמרה')};
A.restrict=v=>{const r={...S.restrict,[v]:!S.restrict[v]};const tags=Object.keys(r).filter(k=>r[k]);run(()=>q(sb.from('artists').update({restrict_tags:tags}).eq('id',artistId())),r[v]?'ההגבלה נשמרה. יקבים יראו אותה':'ההגבלה הוסרה')};
A.savefloor=()=>{const f=S.floorDraft;if(!f||f<500){toast('מחיר רצפה נמוך מדי');return}closeSheet();run(async()=>{await q(sb.from('artists').update({floor_price:f}).eq('id',artistId()));log(`מחירון: ${nis(S.floor)} ← ${nis(f)}`,'admin')},'המחירון נשמר')};
A.savequota=()=>{const n=+document.getElementById('quota').value.replace(/\D/g,'');if(!n){toast('צריך מספר');return}run(()=>q(sb.from('settings').update({render_quota:n}).eq('id',1)),'המכסה נשמרה')};

/* ── printer ── */
A.ost=v=>{const d=deal(+v);if(d.order.st>=4)return;run(()=>q(sb.from('print_orders').update({stage:d.order.st+1}).eq('deal_id',+v)),`עודכן ל: ${OST[d.order.st+1]}`)};
A.qty=v=>{const n=+document.getElementById('qq').value.replace(/\D/g,'');if(!n){document.getElementById('qq').focus();return}run(()=>q(sb.from('print_orders').update({qty:n}).eq('deal_id',+v)),'הכמות דווחה')};

/* ── empty states for a real, still-empty system ── */
const _wh=V.winery_home;
V.winery_home=()=>S.wines.length?_wh():`<span class="eyebrow">${ROLES.winery.hi}</span><h1>${esc(MYW())}</h1><div class="panel empty"><b>עוד לא הוספת יין</b>מתחילים מהיין שעליו עובדים: שם, בציר וכמות בקבוקים. אחרי זה בוחרים ציור מהמאגר.</div><button class="btn wide" style="margin-top:14px" data-a="addwine">להוסיף יין</button><h3>מהמאגר</h3><div class="grid">${S.works.filter(x=>x.st==='live'&&x.av).slice(0,4).map(tileWork).join('')||empty('המאגר מתמלא','יצירות שהאוצרות אישרו יופיעו כאן.')}</div>`;
const _try=window.tryOn;
tryOn=function(wid){if(!S.wines.length){toast('קודם מוסיפים יין');A.addwine();return}return _try(wid)};
const _req=window.reqSheet;
reqSheet=function(wid,step){if(!S.wines.length){toast('קודם מוסיפים יין');A.addwine();return}return _req(wid,step)};
V.gallery_artists=()=>{const L=Object.values(S._artists||{});return `<h1>אמנים</h1><div class="list">${L.map(a=>`<button class="li" data-a="pricelist"><span class="mt"><b>${esc(a.name)}</b><small>${S.works.filter(w=>w.artist===a.id).length} יצירות · מחיר רצפה <span class="num">${nis(+a.floor_price)}</span></small></span><span class="end">מחירון ←</span></button>`).join('')||empty('אין עדיין אמנים')}</div><p class="note">אמן חדש נכנס עם המייל שלו, ומנהל המערכת משייך אותו לגלריה.</p>`};
const _ap=V.artist_profile;
V.artist_profile=()=>_ap().replace('<dd>ארז אהרון</dd>',`<dd>${esc(ME.artist?.name||ME.name)}</dd>`).replace('<dd>גלריה לדוגמה</dd>',`<dd>${esc((S.orgs||[]).find(o=>o.id===ME.artist?.gallery_id)?.name||'הגלריה')}</dd>`);

/* ── admin: real users and organizations ── */
V.admin_users=()=>{const P=S.profiles||[],O=S.orgs||[];const on=id=>O.find(o=>o.id===id)?.name||'';const qq=(S.uq||'').trim();
  const pend=P.filter(p=>p.status==='pending'||!p.role);
  const L=P.filter(p=>!qq||[p.email,p.full_name,on(p.org_id)].join(' ').includes(qq));
  return `<h1>משתמשים</h1>${pend.length?`<div class="next"><b>${pend.length===1?'משתמש אחד ממתין':pend.length+' משתמשים ממתינים'} לשיוך</b><p>נכנסו עם מייל, ועוד אין להם תפקיד.</p></div>`:''}
  <label class="search">${ICON.search}<input placeholder="לחפש משתמש או ארגון" data-in="uq" value="${esc(S.uq||'')}" aria-label="חיפוש משתמש"></label>
  <div class="list">${L.map(p=>`<button class="li ${p.status==='pending'?'unread':''}" data-a="luser" data-v="${p.id}"><span class="mt"><b>${esc(p.full_name||p.email)}</b><small><span class="num">${esc(p.email||'')}</span></small><small>${p.role?ROLE_N[p.role]:'ללא תפקיד'}${on(p.org_id)?' · '+esc(on(p.org_id)):''}</small></span>${p.status==='active'?'':`<span class="pill solid">${p.status==='blocked'?'מושהה':'ממתין'}</span>`}</button>`).join('')||empty('אין משתמשים')}</div>
  <h3>ארגונים</h3><div class="list">${O.map(o=>`<div class="li"><span class="mt"><b>${esc(o.name)}</b><small>${ORG_N[o.kind]||o.kind}</small></span></div>`).join('')}</div>
  <button class="btn alt wide" style="margin-top:14px" data-a="lorg">להוסיף ארגון</button>`};
A.luser=id=>{const p=(S.profiles||[]).find(x=>x.id===id);const O=S.orgs||[];
  sheet(`<span class="eyebrow num">${esc(p.email||'')}</span><h2>${esc(p.full_name||'משתמש חדש')}</h2>
  <div class="fld"><label for="un">שם מלא</label><input id="un" value="${esc(p.full_name||'')}"></div>
  <div class="fld"><label for="ur">תפקיד</label><select id="ur" class="lv-sel"><option value="">ללא תפקיד</option>${Object.entries(ROLE_N).map(([k,n])=>`<option value="${k}" ${p.role===k?'selected':''}>${n}</option>`).join('')}</select></div>
  <div class="fld"><label for="uo">ארגון</label><select id="uo" class="lv-sel"><option value="">ללא ארגון</option>${O.map(o=>`<option value="${o.id}" ${p.org_id===o.id?'selected':''}>${esc(o.name)} · ${ORG_N[o.kind]||''}</option>`).join('')}</select></div>
  <p class="note">יקב, גלריה ובית דפוס צריכים ארגון. לאמן נוצר פרופיל אמן אוטומטית, תחת הגלריה הראשונה ברשימה.</p>
  <div class="row"><button class="btn alt" data-a="close">ביטול</button><button class="btn" data-a="luser2" data-v="${p.id}">לשמור ולהפעיל</button></div>
  ${p.id!==ME.id?`<button class="link" data-a="lblock" data-v="${p.id}">${p.status==='blocked'?'להחזיר את החשבון':'להשהות את החשבון'}</button>`:''}`)};
A.luser2=id=>{const role=document.getElementById('ur').value||null,org=document.getElementById('uo').value||null,name=document.getElementById('un').value.trim()||null;
  const o=(S.orgs||[]).find(x=>x.id===org);
  if(['winery','gallery','printer'].includes(role)&&(!o||o.kind!==role)){toast(`צריך לבחור ארגון מסוג ${ORG_N[role]}`);return}
  if(id===ME.id&&role!=='admin'){toast('אי אפשר להוריד לעצמך את תפקיד המנהל');return}
  closeSheet();run(async()=>{
    await q(sb.from('profiles').update({role,org_id:org,full_name:name,status:role?'active':'pending'}).eq('id',id));
    if(role==='artist'&&!Object.values(S._artists||{}).some(a=>a.user_id===id)){const g=(S.orgs||[]).find(x=>x.kind==='gallery');if(!g)throw new Error('צריך קודם להוסיף גלריה');await q(sb.from('artists').insert({user_id:id,gallery_id:g.id,name:name||'אמן'}))}
    log(`משתמש עודכן: ${name||''} · ${role?ROLE_N[role]:'ללא תפקיד'}`,'admin');
  },'המשתמש עודכן')};
A.lblock=id=>{const p=S.profiles.find(x=>x.id===id);const to=p.status==='blocked'?'active':'blocked';closeSheet();run(async()=>{await q(sb.from('profiles').update({status:to}).eq('id',id));log(`${p.full_name||p.email}: ${to==='blocked'?'הושהה':'הוחזר'}`,'admin')},to==='blocked'?'החשבון הושהה':'החשבון הוחזר')};
A.lorg=()=>sheet(`<h2>ארגון חדש</h2><div class="fld"><label for="onm">שם</label><input id="onm" placeholder="למשל: יקב הגליל"></div><div class="fld"><label for="okd">סוג</label><select id="okd" class="lv-sel">${['winery','gallery','printer'].map(k=>`<option value="${k}">${ORG_N[k]}</option>`).join('')}</select></div><div class="row"><button class="btn alt" data-a="close">ביטול</button><button class="btn" data-a="lorg2">להוסיף</button></div>`);
A.lorg2=()=>{const n=document.getElementById('onm').value.trim();if(!n){document.getElementById('onm').focus();return}const k=document.getElementById('okd').value;closeSheet();run(async()=>{await q(sb.from('organizations').insert({name:n,kind:k}));log(`ארגון חדש: ${n}`,'admin')},'הארגון נוסף')};

/* ── account sheet ── */
accountSheet=function(){const adm=ME.role==='admin';
  sheet(`<div style="display:flex;gap:12px;align-items:center"><span class="av" style="width:46px;height:46px">${ROLES[ME.role].u}</span><div><b style="font-weight:500">${esc(ME.name)}</b><div style="font-size:14px;color:var(--muted)">${ROLE_N[ME.role]}${ME.orgName?' · '+esc(ME.orgName):''}</div><div class="num" style="font-size:13px;color:var(--soft)">${esc(ME.email)}</div></div></div>
  ${adm?`<h3>לצפות כ…</h3><p class="note" style="margin-top:0">מנהל רואה את כל הנתונים. פעולות של יקב, כמו חתימה, נעשות רק מחשבון של יקב.</p><div class="roles">${Object.entries(ROLES).map(([k,r])=>`<button class="role ${k===S.role?'cur':''}" data-a="role" data-v="${k}" style="padding:10px 14px"><b style="font-size:17px">${r.n}${k===S.role?' · כאן עכשיו':''}</b></button>`).join('')}</div>`:''}
  <div class="row" style="margin-top:16px"><button class="btn alt" data-a="introshow">איך זה עובד</button><button class="btn alt" data-a="logout">להתנתק</button></div>`)};

/* ── boot ── */
sb.auth.onAuthStateChange(ev=>{if(ev==='SIGNED_OUT'&&LV.state==='ready'){window.ME=null;S.role=null;LV.state='login';render()}});
(async function boot(){
  render();
  const h=window.AUTH_HASH||'';
  history.replaceState(null,'',location.pathname+location.search);
  if(h){const p=new URLSearchParams(h.slice(1));
    if(p.get('error_description')){LV.err=heb(p.get('error_description'))}
    else if(p.get('access_token')){const {error}=await sb.auth.setSession({access_token:p.get('access_token'),refresh_token:p.get('refresh_token')});if(error)LV.err=heb(error)}}
  const {data:{session}}=await sb.auth.getSession();
  if(!session){LV.state='login';render();return}
  await loadMe(session.user);
})();
})();
